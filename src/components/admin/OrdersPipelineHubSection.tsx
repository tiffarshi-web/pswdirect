// Orders Pipeline Hub — folder-style navigation
// Top-level grid of category folders; clicking one drills into the
// filtered view powered by <ActiveShiftsSection categoryFilter=... />.
// All existing admin actions (assign/reassign/remove PSW, manual sign-in/out,
// adjust hours, cancel, edit order, care sheet, etc.) remain wired through
// ActiveShiftsSection — no business logic changes.

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock,
  Play,
  CheckCircle,
  AlertTriangle,
  FileText,
  Sparkles,
  ArrowLeft,
  Search,
  Folder,
} from "lucide-react";
import { ActiveShiftsSection, type PipelineCategory } from "./ActiveShiftsSection";
import { getAllActiveShiftsAsync } from "@/lib/shiftStore";
import { OrphanedBookingsAlert } from "./OrphanedBookingsAlert";
import { cn } from "@/lib/utils";

type CountsMap = Record<PipelineCategory, number>;

interface CategoryMeta {
  key: PipelineCategory;
  label: string;
  description: string;
  icon: JSX.Element;
  accent: string; // tailwind classes for the icon tile
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: "new",
    label: "New Orders",
    description: "Created in the last 24 hours",
    icon: <Sparkles className="w-5 h-5" />,
    accent: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    key: "pending",
    label: "Pending Orders",
    description: "Awaiting PSW assignment",
    icon: <Clock className="w-5 h-5" />,
    accent: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  {
    key: "assigned",
    label: "Assigned Orders",
    description: "PSW assigned, upcoming shift",
    icon: <Clock className="w-5 h-5" />,
    accent: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300",
  },
  {
    key: "in-progress",
    label: "In Progress",
    description: "Shift currently active",
    icon: <Play className="w-5 h-5" />,
    accent: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  },
  {
    key: "completed",
    label: "Completed Orders",
    description: "Signed out, most recent first",
    icon: <CheckCircle className="w-5 h-5" />,
    accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    key: "cancelled",
    label: "Cancelled Orders",
    description: "Cancelled by client, PSW, or admin",
    icon: <AlertTriangle className="w-5 h-5" />,
    accent: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
  {
    key: "unserved",
    label: "Unserved Orders",
    description: "Past scheduled date, still unassigned",
    icon: <AlertTriangle className="w-5 h-5" />,
    accent: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  },
  {
    key: "all",
    label: "All Orders",
    description: "Every order across all statuses",
    icon: <FileText className="w-5 h-5" />,
    accent: "bg-muted text-foreground",
  },
];

const EMPTY_COUNTS: CountsMap = {
  new: 0,
  pending: 0,
  assigned: 0,
  "in-progress": 0,
  completed: 0,
  cancelled: 0,
  unserved: 0,
  all: 0,
};

export const OrdersPipelineHubSection = () => {
  const [selected, setSelected] = useState<PipelineCategory | null>(null);
  const [counts, setCounts] = useState<CountsMap>(EMPTY_COUNTS);
  const [searchQuery, setSearchQuery] = useState("");

  // Lightweight count fetch for the hub view. Reuses the same query as
  // ActiveShiftsSection so numbers stay consistent.
  const fetchCounts = async () => {
    try {
      const r = await getAllActiveShiftsAsync();
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const newCount = [...r.pending, ...r.claimed, ...r.active].filter(
        (s) => s.postedAt && new Date(s.postedAt).getTime() >= twentyFourHoursAgo,
      ).length;
      const unservedCount = r.pending.filter((s) => {
        const d = new Date(`${s.scheduledDate}T${s.scheduledEnd || "23:59"}`);
        return d < new Date();
      }).length;
      const allIds = new Set<string>();
      [...r.pending, ...r.claimed, ...r.active, ...r.completed, ...r.cancelled].forEach((s) =>
        allIds.add(s.id),
      );
      setCounts({
        new: newCount,
        pending: r.pending.length,
        assigned: r.claimed.length,
        "in-progress": r.active.length,
        completed: r.completed.length,
        cancelled: r.cancelled.length,
        unserved: unservedCount,
        all: allIds.size,
      });
    } catch (err) {
      console.error("[OrdersPipelineHub] count fetch failed", err);
    }
  };

  useEffect(() => {
    if (selected === null) {
      fetchCounts();
      const t = setInterval(fetchCounts, 30000);
      return () => clearInterval(t);
    }
  }, [selected]);

  // ---- Folder grid view ----
  if (selected === null) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Folder className="w-6 h-6 text-primary" />
            Orders Pipeline
          </h2>
          <p className="text-muted-foreground">
            Pick a category to view only those orders. Live counts update every 30 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const count = counts[cat.key];
            const hasItems = count > 0;
            return (
              <button
                key={cat.key}
                onClick={() => setSelected(cat.key)}
                className={cn(
                  "text-left transition-all rounded-lg",
                  "hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
              >
                <Card
                  className={cn(
                    "h-full border-2",
                    hasItems ? "border-primary/30" : "border-border",
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          cat.accent,
                        )}
                      >
                        {cat.icon}
                      </div>
                      <span
                        className={cn(
                          "text-2xl font-bold tabular-nums",
                          hasItems ? "text-foreground" : "text-muted-foreground/50",
                        )}
                      >
                        {count}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground">{cat.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- Drilled-in category view ----
  const meta = CATEGORIES.find((c) => c.key === selected)!;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setSelected(null)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          All Categories
        </Button>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", meta.accent)}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-[12rem]">
          <h2 className="text-xl font-bold leading-tight">{meta.label}</h2>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        </div>
      </div>

      {/* Search inside the category */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by client name, booking code, phone, email, PSW, address or postal code…"
          className="pl-10"
        />
      </div>

      {/* Reuse the existing rich section — all admin actions intact */}
      <ActiveShiftsSection
        categoryFilter={selected}
        searchQuery={searchQuery}
        hideHeader
        onCountsChange={setCounts}
      />
    </div>
  );
};

export default OrdersPipelineHubSection;
