import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      // Read via PSW-safe view (excludes client_email/client_phone, billing, and pay-rate PII)
      const { data } = await (supabase as any)
        .from("psw_safe_booking_view")
        .select("id, scheduled_date, start_time, end_time, client_name, hours, hourly_rate, status, service_type")
        .eq("psw_assigned", pswId)
        .in("status", ["pending", "claimed", "active"])
        .order("scheduled_date", { ascending: true });

      // Fetch this PSW's locked pay-rate snapshots via secure RPC (psw_pay_rate is
      // not readable from bookings directly by clients).
      const { data: rateRows } = await (supabase as any).rpc("get_my_assigned_pay_rates");
      const rateMap = new Map<string, number>(
        (rateRows || []).map((r: any) => [r.booking_id, Number(r.psw_pay_rate)])
      );

      if (data) {
        setShifts(data.map((b: any) => {
          const rate = rateMap.get(b.id) ?? Number(b.hourly_rate);
          return {
            id: b.id,
            scheduledDate: b.scheduled_date,
            startTime: b.start_time,
            endTime: b.end_time,
            clientName: b.client_name?.split(" ")[0] || "Client",
            hours: Number(b.hours),
            hourlyRate: rate,
            estimatedTotal: Number(b.hours) * rate,
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
