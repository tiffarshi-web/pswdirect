import { CalendarPlus, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatServiceType } from "@/lib/businessConfig";
import type { Booking } from "@/hooks/useClientBookings";

interface PostCompletionRebookPromptProps {
  recentlyCompleted: Booking;
  onBookAgain: (booking: Booking) => void;
  onScheduleNext: (booking: Booking) => void;
}

/**
 * Shown when a client has a recently completed order (within last 7 days)
 * and no active/upcoming order. Encourages immediate rebook or scheduling.
 */
export const PostCompletionRebookPrompt = ({
  recentlyCompleted,
  onBookAgain,
  onScheduleNext,
}: PostCompletionRebookPromptProps) => {
  const services = recentlyCompleted.service_type || [];
  const joined = services.join(" ").toLowerCase();

  let smartCopy = "Hope your visit went well. Need ongoing support?";
  if (joined.includes("doctor") || joined.includes("escort")) {
    smartCopy = "Have another appointment coming up? We've got you covered.";
  } else if (joined.includes("hospital") || joined.includes("discharge")) {
    smartCopy = "Recovery often needs follow-up care — book home support easily.";
  }

  return (
    <Card className="shadow-card border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Need care again?</h3>
        </div>
        <p className="text-sm text-muted-foreground">{smartCopy}</p>
        <p className="text-xs text-muted-foreground">
          Last service: <span className="text-foreground font-medium">
            {services.map((s) => formatServiceType(s)).join(", ")}
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="brand" size="sm" onClick={() => onBookAgain(recentlyCompleted)}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Book Again
          </Button>
          <Button variant="outline" size="sm" onClick={() => onScheduleNext(recentlyCompleted)}>
            <CalendarPlus className="w-4 h-4 mr-1.5" />
            Schedule Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
