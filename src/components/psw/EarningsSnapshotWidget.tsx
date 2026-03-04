import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Clock, CheckCircle, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getPSWProfileByEmailFromDB } from "@/lib/pswDatabaseStore";
import { usePayoutRequests } from "@/hooks/usePayoutRequests";

/**
 * Compact earnings snapshot widget for the PSW main dashboard.
 * Reuses the existing usePayoutRequests hook — no new logic.
 * Clicking navigates to the Earnings tab (via onNavigate callback).
 */
interface EarningsSnapshotWidgetProps {
  onNavigate: () => void;
}

/** Toronto now helper */
const torontoNow = (): Date => {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Toronto" });
  return new Date(s);
};

export const EarningsSnapshotWidget = ({ onNavigate }: EarningsSnapshotWidgetProps) => {
  const { user } = useAuth();
  const [pswId, setPswId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const resolve = async () => {
      if (!user?.email) return;
      const profile = await getPSWProfileByEmailFromDB(user.email);
      if (profile?.id) setPswId(profile.id);
    };
    resolve();
  }, [user?.email]);

  const {
    eligibleEntries, pendingPayoutEntries, paidThisMonth, loading,
  } = usePayoutRequests(pswId);

  // Thursday countdown
  const now = torontoNow();
  const dow = now.getDay();
  const daysUntilThursday = dow <= 4 ? 4 - dow : 7 - dow + 4;
  const isThursday = dow === 4;

  const eligibleTotal = eligibleEntries.reduce((s, e) => s + e.total_owed, 0);
  const pendingTotal = pendingPayoutEntries.reduce((s, e) => s + e.total_owed, 0);

  if (loading || !pswId) return null;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-primary/20"
      onClick={onNavigate}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Earnings Snapshot</h3>
          <span className="text-xs text-primary font-medium">View details →</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-sm font-bold text-foreground">${eligibleTotal.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Processing</p>
              <p className="text-sm font-bold text-foreground">${pendingTotal.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Paid this month</p>
              <p className="text-sm font-bold text-foreground">${paidThisMonth.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Next request day</p>
              <p className="text-sm font-bold text-foreground">
                {isThursday ? "Today!" : `${daysUntilThursday}d`}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
