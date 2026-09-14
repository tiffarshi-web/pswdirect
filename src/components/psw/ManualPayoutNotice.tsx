import { Info } from "lucide-react";
import { MANUAL_PAYOUT_NOTICE } from "@/lib/manualPayoutPolicy";

/**
 * Permanent, non-interactive notice shown wherever provider earnings appear.
 * There is deliberately no cash-out or withdraw action anywhere in the app.
 */
export const ManualPayoutNotice = ({ className = "" }: { className?: string }) => (
  <div
    role="note"
    className={`flex items-start gap-2 rounded-lg border border-border bg-muted p-3 ${className}`}
  >
    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    <p className="text-xs text-muted-foreground">{MANUAL_PAYOUT_NOTICE}</p>
  </div>
);
