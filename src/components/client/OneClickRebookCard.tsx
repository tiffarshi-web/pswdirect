import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Clock, MapPin, Calendar, Loader2, X, Check, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatServiceType } from "@/lib/businessConfig";
import type { Booking } from "@/hooks/useClientBookings";

const COUNTDOWN_SECONDS = 10;

interface OneClickRebookCardProps {
  lastBooking: Booking;
  onEditDetails: (booking: Booking) => void;
  onBookingPlaced?: (bookingCode: string) => void;
}

/**
 * One-click rebook for returning clients with a saved card on file.
 * Pre-fills date (next available day at the same time), duration,
 * services and address from the most recent completed booking, and
 * triggers an off-session charge via the `charge-saved-card-rebook`
 * edge function. A 10-second countdown gives the client a chance to
 * cancel before charging.
 */
export const OneClickRebookCard = ({
  lastBooking,
  onEditDetails,
  onBookingPlaced,
}: OneClickRebookCardProps) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);

  // Compute the next slot: tomorrow at the same start_time, same duration.
  const nextSlot = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    const startTime = String(lastBooking.start_time || "09:00").slice(0, 5);
    const hours = Number(lastBooking.hours) || 1;
    return { dateStr, startTime, hours };
  }, [lastBooking]);

  const friendlyDate = useMemo(() => {
    const d = new Date(nextSlot.dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, [nextSlot.dateStr]);

  const friendlyTime = useMemo(() => {
    const [h, m] = nextSlot.startTime.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }, [nextSlot.startTime]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      void doCharge();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const startCountdown = () => setCountdown(COUNTDOWN_SECONDS);
  const cancelCountdown = () => setCountdown(null);

  const doCharge = async () => {
    setCountdown(null);
    setIsCharging(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "charge-saved-card-rebook",
        {
          body: {
            source_booking_id: lastBooking.id,
            scheduled_date: nextSlot.dateStr,
            start_time: nextSlot.startTime,
            hours: nextSlot.hours,
          },
        },
      );

      if (error || (data as any)?.error) {
        const msg = (data as any)?.message || (data as any)?.error || error?.message;
        // Card needs re-confirmation → fall back to editing flow
        if ((data as any)?.error === "saved_card_charge_failed") {
          toast.error("Your saved card needs re-confirmation.", {
            description: "Please complete payment in the booking flow.",
          });
          onEditDetails(lastBooking);
          return;
        }
        toast.error("Could not place one-click booking.", { description: msg });
        return;
      }

      const code = (data as any)?.booking_code as string | undefined;
      toast.success("Booking confirmed!", {
        description: code ? `Booking code ${code}` : undefined,
      });
      onBookingPlaced?.(code ?? "");
    } catch (err: any) {
      console.error("one-click rebook error:", err);
      toast.error("Could not place one-click booking.", { description: err?.message });
    } finally {
      setIsCharging(false);
    }
  };

  const services = lastBooking.service_type || [];
  const isCountingDown = countdown !== null && countdown > 0;

  return (
    <Card className="shadow-card border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Book Again
            </h3>
          </div>
          <Badge variant="default" className="text-[10px] uppercase">
            ⚡ Under 15 sec
          </Badge>
        </div>

        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-foreground">
            {services.map((s) => formatServiceType(s)).join(", ")}
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{friendlyDate}</span>
            <span aria-hidden>•</span>
            <Clock className="w-3.5 h-3.5" />
            <span>
              {friendlyTime} · {nextSlot.hours}h
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{lastBooking.client_address}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Charged to your card on file</span>
          </div>
        </div>

        {isCountingDown ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Charging in {countdown}s…
              </span>
              <button
                type="button"
                onClick={cancelCountdown}
                className="text-primary font-medium hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000 ease-linear"
                style={{
                  width: `${((COUNTDOWN_SECONDS - (countdown ?? 0)) / COUNTDOWN_SECONDS) * 100}%`,
                }}
              />
            </div>
            <Button
              variant="brand"
              size="sm"
              className="w-full"
              onClick={() => doCharge()}
            >
              <Check className="w-4 h-4 mr-1.5" />
              Confirm now
            </Button>
          </div>
        ) : isCharging ? (
          <Button variant="brand" size="sm" className="w-full" disabled>
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            Placing your booking…
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="brand" size="sm" onClick={startCountdown}>
              <Zap className="w-4 h-4 mr-1.5" />
              Book in 10s
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditDetails(lastBooking)}
            >
              Edit details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
