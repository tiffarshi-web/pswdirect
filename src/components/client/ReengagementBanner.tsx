import { useMemo } from "react";
import { Heart, Sparkles, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/hooks/useClientBookings";

interface ReengagementBannerProps {
  pastBookings: Booking[];
  hasActiveOrUpcoming: boolean;
  onBookCare: () => void;
}

/**
 * Shows soft reminder banners based on time since last completed booking.
 * Only visible when client has no active/upcoming order.
 *  - 24h+   → light reminder
 *  - 3 days+ → stronger reminder
 *  - 7 days+ → re-engagement message
 */
export const ReengagementBanner = ({ pastBookings, hasActiveOrUpcoming, onBookCare }: ReengagementBannerProps) => {
  const tier = useMemo(() => {
    if (hasActiveOrUpcoming || pastBookings.length === 0) return null;

    // Find most recent completed booking date
    const lastDate = pastBookings.reduce<Date | null>((latest, b) => {
      const d = new Date(b.scheduled_date);
      if (!latest || d > latest) return d;
      return latest;
    }, null);

    if (!lastDate) return null;

    const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
    if (hoursSince >= 24 * 7) return "week";
    if (hoursSince >= 24 * 3) return "strong";
    if (hoursSince >= 24) return "light";
    return null;
  }, [pastBookings, hasActiveOrUpcoming]);

  if (!tier) return null;

  const config = {
    light: {
      icon: Clock,
      title: "Need care again?",
      message: "Book in seconds with your saved details.",
      cta: "Book Care",
    },
    strong: {
      icon: Sparkles,
      title: "It's been a few days",
      message: "We're here whenever you need support — book your next visit easily.",
      cta: "Book Now",
    },
    week: {
      icon: Heart,
      title: "We miss caring for you",
      message: "Whenever you need us, we're one tap away. Your saved profile is ready.",
      cta: "Book Care",
    },
  }[tier];

  const Icon = config.icon;

  return (
    <Card className="shadow-card border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{config.title}</p>
          <p className="text-xs text-muted-foreground">{config.message}</p>
        </div>
        <Button variant="brand" size="sm" onClick={onBookCare} className="shrink-0">
          {config.cta}
        </Button>
      </CardContent>
    </Card>
  );
};
