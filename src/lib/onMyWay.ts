import { supabase } from "@/integrations/supabase/client";

export type OnMyWayResult =
  | { ok: true; at: string | null }
  | { ok: false; code: string; message: string };

const MESSAGES: Record<string, string> = {
  not_assigned: "This visit is no longer assigned to you.",
  invalid_status: "This visit has already started or is not active.",
  wrong_service_date: "You can only mark \"On my way\" on the visit's scheduled date.",
  not_authenticated: "Please sign in again.",
  not_found: "This visit could not be found.",
};

/**
 * Tell the client the assigned worker has started travelling. The server
 * checks assignment, status and same-day date; no location is shared and no
 * arrival time is estimated.
 */
export const markOnMyWay = async (bookingId: string): Promise<OnMyWayResult> => {
  const { data, error } = await (supabase as any).rpc("psw_mark_on_my_way", { p_booking_id: bookingId });
  if (error) return { ok: false, code: "error", message: "Couldn't update. Please try again, or call 24/7 support at (249) 288-4787." };
  const r = data as { success?: boolean; error?: string; psw_en_route_at?: string } | null;
  if (r?.success) return { ok: true, at: r.psw_en_route_at ?? null };
  const code = r?.error ?? "error";
  return { ok: false, code, message: MESSAGES[code] ?? "Couldn't update. Please try again." };
};
