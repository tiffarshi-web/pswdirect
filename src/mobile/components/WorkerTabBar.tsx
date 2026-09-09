import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, CalendarDays, Clock, History, Wallet, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom navigation for the packaged Worker app.
 *
 * Each entry maps to a dashboard tab the caregiver already knows from the web
 * app, so the two stay in step. Rendered only inside the native shell.
 */
export const WORKER_TABS: ReadonlyArray<{ key: string; label: string; icon: typeof Briefcase; path?: string }> = [
  { key: "available", label: "Available", icon: Briefcase },
  { key: "schedule", label: "Upcoming", icon: CalendarDays },
  { key: "active", label: "Shift", icon: Clock },
  { key: "history", label: "History", icon: History },
  { key: "earnings", label: "Earnings", icon: Wallet },
  { key: "messages", label: "Alerts", icon: Bell },
  { key: "account", label: "Account", icon: User, path: "/psw/account" },
];

export type WorkerTabKey = (typeof WORKER_TABS)[number]["key"];

interface WorkerTabBarProps {
  unreadCount?: number;
  activeShift?: boolean;
}

export default function WorkerTabBar({ unreadCount = 0, activeShift = false }: WorkerTabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const onDashboard = location.pathname === "/psw";
  const current = onDashboard ? searchParams.get("tab") ?? "available" : null;

  return (
    <nav
      aria-label="Worker sections"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-7">
        {WORKER_TABS.map(({ key, label, icon: Icon, path }) => {
          const isActive = path ? location.pathname === path : current === key;
          return (
            <li key={key}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                onClick={() => navigate(path ?? `/psw?tab=${key}`)}
                className={cn(
                  "relative flex w-full flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors min-h-[56px] justify-center",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{label}</span>
                {key === "messages" && unreadCount > 0 && (
                  <span
                    className="absolute right-2 top-1 min-w-[16px] rounded-full bg-destructive px-1 text-[9px] leading-4 text-destructive-foreground"
                    aria-label={`${unreadCount} unread`}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {key === "active" && activeShift && (
                  <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
