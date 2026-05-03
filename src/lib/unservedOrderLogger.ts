import { supabase } from "@/integrations/supabase/client";
import { getCoordinatesFromPostalCode, normalizeCanadianPostalCode } from "@/lib/postalCodeUtils";

interface UnservedOrderData {
  postalCode: string;
  city?: string;
  address?: string;
  serviceType?: string;
  tasks?: string[];
  requestedStartTime?: string;
  radiusCheckedKm: number;
  pswCountFound: number;
  reason?: string;
  severity?: "low" | "medium" | "high" | "critical";
  sourceTable?: string;
  sourceEventId?: string;
  notes?: string;
  distanceKm?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  bookingId?: string;
  bookingCode?: string;
  paymentIntentId?: string;
  paymentStatus?: string;
  fullClientPayload?: Record<string, any>;
}

// Best-effort recovery of contact info from upstream payload so we never
// drop a row with blank client name/phone/email when the data exists somewhere.
const enrichClientInfo = (d: UnservedOrderData) => {
  const p = d.fullClientPayload || {};
  const pick = (...keys: string[]) =>
    keys.map(k => p[k]).find(v => typeof v === "string" && v.trim()) || null;
  return {
    client_name: d.clientName || pick("clientName", "client_name", "name", "fullName") || null,
    client_phone: d.clientPhone || pick("clientPhone", "client_phone", "phone", "phoneNumber") || null,
    client_email: d.clientEmail || pick("clientEmail", "client_email", "email") || null,
    address: d.address || pick("address", "fullAddress", "serviceAddress", "street") || null,
  };
};

/**
 * Passively logs an unserved order when no PSWs are available.
 * Non-blocking: failures are silently logged to console.
 * Includes deduplication: same phone+postal+time within 15 minutes updates existing row.
 */
export const logUnservedOrder = async (data: UnservedOrderData): Promise<void> => {
  try {
    const normalized = normalizeCanadianPostalCode(data.postalCode);
    const postalFsa = normalized.formatted
      ? normalized.formatted.substring(0, 3).toUpperCase()
      : data.postalCode?.substring(0, 3).toUpperCase() || null;

    const coords = getCoordinatesFromPostalCode(data.postalCode);

    // Deduplication: check for existing row with same phone+postal in last 15 minutes
    if (data.clientPhone && data.postalCode) {
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: existing } = await (supabase as any)
        .from("unserved_orders")
        .select("id")
        .eq("client_phone", data.clientPhone)
        .eq("postal_code_raw", data.postalCode)
        .gte("created_at", fifteenMinAgo)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing row instead of inserting duplicate
        await (supabase as any).from("unserved_orders").update({
          service_type: data.serviceType || null,
          requested_start_time: data.requestedStartTime || null,
          radius_checked_km: data.radiusCheckedKm,
          psw_count_found: data.pswCountFound,
          reason: data.reason || "NO_PSW_IN_RADIUS",
          notes: data.notes || null,
          client_name: data.clientName || null,
          client_email: data.clientEmail || null,
          full_client_payload: data.fullClientPayload || null,
        }).eq("id", existing[0].id);
        console.log("[UnservedOrder] Updated existing row:", existing[0].id);
        return;
      }
    }

    const { error } = await (supabase as any).from("unserved_orders").insert({
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
      client_name: data.clientName || null,
      client_phone: data.clientPhone || null,
      client_email: data.clientEmail || null,
      full_client_payload: data.fullClientPayload || null,
      distance_km: data.distanceKm || null,
      status: "PENDING",
      pending_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      console.warn("[UnservedOrder] Failed to log:", error.message);
    }
  } catch (err) {
    console.warn("[UnservedOrder] Non-blocking error:", err);
  }
};
