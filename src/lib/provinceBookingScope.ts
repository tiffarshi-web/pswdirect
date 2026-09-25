/**
 * Province membership for records that have no province column of their own
 * (invoices, refund logs, recovery payments). Their province is the province
 * of the booking they belong to. Records whose booking cannot be found are
 * NOT assumed to be Ontario — callers must treat them as "province unknown".
 */
import { supabase } from "@/integrations/supabase/client";

export interface ProvinceBookingKeys {
  ids: Set<string>;
  codes: Set<string>;
}

export async function fetchProvinceBookingKeys(province: string | null): Promise<ProvinceBookingKeys | null> {
  if (!province) return null; // no filter
  const ids = new Set<string>();
  const codes = new Set<string>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, booking_code")
      .eq("service_province", province.toUpperCase())
      .range(from, from + page - 1);
    if (error) throw error;
    (data || []).forEach((b: { id: string; booking_code: string | null }) => {
      ids.add(b.id);
      if (b.booking_code) codes.add(b.booking_code);
    });
    if (!data || data.length < page) break;
  }
  return { ids, codes };
}

/** True when the record's booking belongs to the selected province. */
export const bookingInProvince = (
  keys: ProvinceBookingKeys | null,
  bookingId?: string | null,
  bookingCode?: string | null,
): boolean => {
  if (!keys) return true;
  return (!!bookingId && keys.ids.has(bookingId)) || (!!bookingCode && keys.codes.has(bookingCode));
};
