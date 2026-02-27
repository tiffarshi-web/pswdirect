import { supabase } from "@/integrations/supabase/client";
import { getCoordinatesFromPostalCode, normalizeCanadianPostalCode } from "@/lib/postalCodeUtils";

interface UnservedOrderData {
  postalCode: string;
  city?: string;
  serviceType?: string;
  requestedStartTime?: string;
  radiusCheckedKm: number;
  pswCountFound: number;
  reason?: string;
  notes?: string;
}

/**
 * Passively logs an unserved order when no PSWs are available.
 * Non-blocking: failures are silently logged to console.
 */
export const logUnservedOrder = async (data: UnservedOrderData): Promise<void> => {
  try {
    const normalized = normalizeCanadianPostalCode(data.postalCode);
    const postalFsa = normalized.formatted
      ? normalized.formatted.substring(0, 3).toUpperCase()
      : data.postalCode?.substring(0, 3).toUpperCase() || null;

    const coords = getCoordinatesFromPostalCode(data.postalCode);

    const { error } = await supabase.from("unserved_orders" as any).insert({
      postal_code_raw: data.postalCode,
      postal_fsa: postalFsa,
      city: data.city || null,
      service_type: data.serviceType || null,
      requested_start_time: data.requestedStartTime || null,
      radius_checked_km: data.radiusCheckedKm,
      psw_count_found: data.pswCountFound,
      lat: coords?.lat || null,
      lng: coords?.lng || null,
      reason: data.reason || "NO_PSW_IN_RADIUS",
      notes: data.notes || null,
    });

    if (error) {
      console.warn("[UnservedOrder] Failed to log:", error.message);
    }
  } catch (err) {
    console.warn("[UnservedOrder] Non-blocking error:", err);
  }
};
