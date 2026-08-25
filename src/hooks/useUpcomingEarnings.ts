import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPswPayEstimates,
  resolvePayCents,
  bookedMinutesFromHours,
  rateDollarsToCents,
  DEFAULT_PSW_RATE_CENTS,
} from "@/lib/pswPay";

export interface UpcomingShift {
  id: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
  hours: number;
  hourlyRate: number;
  estimatedTotal: number;
  status: string;
  services: string[];
}

/** Get Toronto "now" as a JS Date */
const torontoNow = (): Date => {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Toronto" });
  return new Date(s);
};

export const useUpcomingEarnings = (pswId: string | undefined) => {
  const [shifts, setShifts] = useState<UpcomingShift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pswId) return;
    const fetch = async () => {
      setLoading(true);
      // Read via PSW-safe view (client billing/pay-rate PII excluded — no hourly_rate)
      const { data } = await (supabase as any)
        .from("psw_safe_booking_view")
        .select("id, scheduled_date, start_time, end_time, client_name, hours, status, service_type, psw_pay_rate")
        .eq("psw_assigned", pswId)
        .in("status", ["pending", "claimed", "active"])
        .order("scheduled_date", { ascending: true });

      // Server-authoritative estimated pay (confirmed booked duration × the
      // booking's locked service rate). Never derived from client price, taxes,
      // Stripe amounts or extra fees.
      const estimates = await fetchPswPayEstimates(pswId);

      if (data) {
        setShifts(data.map((b: any) => {
          const est = estimates[b.id];
          const minutes = est?.bookedMinutes ?? bookedMinutesFromHours(Number(b.hours));
          const cents = resolvePayCents(est, minutes, rateDollarsToCents(b.psw_pay_rate));
          return {
            id: b.id,
            scheduledDate: b.scheduled_date,
            startTime: b.start_time,
            endTime: b.end_time,
            clientName: b.client_name?.split(" ")[0] || "Client",
            hours: minutes / 60,
            hourlyRate: est?.rateDollars ?? (rateDollarsToCents(b.psw_pay_rate) ?? DEFAULT_PSW_RATE_CENTS) / 100,
            estimatedTotal: cents / 100,
            status: b.status,
            services: b.service_type || [],
          };
        }));
      }

      setLoading(false);
    };
    fetch();
  }, [pswId]);

  const now = torontoNow();
  const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
  const in30 = new Date(now); in30.setDate(in30.getDate() + 30);

  const next7 = useMemo(() => shifts.filter(s => {
    const d = new Date(s.scheduledDate);
    return d >= now && d <= in7;
  }), [shifts]);

  const next30 = useMemo(() => shifts.filter(s => {
    const d = new Date(s.scheduledDate);
    return d >= now && d <= in30;
  }), [shifts]);

  const total7 = useMemo(() => next7.reduce((s, e) => s + e.estimatedTotal, 0), [next7]);
  const total30 = useMemo(() => next30.reduce((s, e) => s + e.estimatedTotal, 0), [next30]);

  return { shifts, next7, next30, total7, total30, loading };
};
