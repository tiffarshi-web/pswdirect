import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, CheckCircle2, Clock, Info } from "lucide-react";
import { type PayrollEntryRow, type PayoutRequest } from "@/hooks/usePayoutRequests";

interface PayoutStatusCardProps {
  entries: PayrollEntryRow[];
  payoutRequests: PayoutRequest[];
  eligibleTotal: number;
  hasOpenRequest: boolean;
}

const formatDate = (d: Date): string =>
  d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export const PayoutStatusCard = ({
  entries,
  payoutRequests,
  eligibleTotal,
  hasOpenRequest,
}: PayoutStatusCardProps) => {
  // Total earned (every payroll entry, regardless of status)
  const totalEarned = entries.reduce((s, e) => s + Number(e.total_owed || 0), 0);

  // Find earliest completed shift that is NOT yet eligible (within last 14 days)
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 14);

  const pendingShifts = entries
    .filter(
      (e) =>
        !e.payout_request_id &&
        e.status !== "cleared" &&
        e.completed_at &&
        new Date(e.completed_at) > cutoff,
    )
    .sort(
      (a, b) =>
        new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime(),
    );

  // Next eligible date = earliest pending completed_at + 14 days
  let nextEligibleDate: Date | null = null;
  if (eligibleTotal === 0 && pendingShifts.length > 0) {
    const earliest = new Date(pendingShifts[0].completed_at!);
    nextEligibleDate = new Date(earliest);
    nextEligibleDate.setDate(nextEligibleDate.getDate() + 14);
  }

  const isEligible = eligibleTotal > 0;
  const openRequest = payoutRequests.find((r) =>
    ["requested", "approved", "payout_ready"].includes(r.status),
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" />
          Payout Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totals */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Total Earned</p>
            <p className="text-lg font-bold text-foreground">${totalEarned.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">Available for Payout</p>
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
              ${eligibleTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Eligibility status */}
        {hasOpenRequest && openRequest ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
            <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Your payout request is under review
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Submitted {new Date(openRequest.requested_at).toLocaleDateString()} • $
                {Number(openRequest.total_amount).toFixed(2)}
              </p>
            </div>
          </div>
        ) : isEligible ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              You are eligible to request payout
            </p>
          </div>
        ) : nextEligibleDate ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
            <CalendarClock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              You will be eligible to request payout on {formatDate(nextEligibleDate)}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Complete shifts to start earning. Payout becomes available 14 days after each
              completed shift.
            </p>
          </div>
        )}

        {/* Payout schedule */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Payouts are processed weekly on Thursdays.</span>
        </div>
      </CardContent>
    </Card>
  );
};
