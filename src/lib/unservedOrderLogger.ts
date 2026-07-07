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
    const enrichedGuard = enrichClientInfo(data);
    const hasPhone = !!enrichedGuard.client_phone?.trim();
    const hasEmail = !!enrichedGuard.client_email?.trim();
    const hasPaymentIntent = !!data.paymentIntentId?.trim();
    if (!hasPhone && !hasEmail && !hasPaymentIntent) {
      console.info("[UnservedOrder] Skipped — anonymous abandoned session (no phone/email/payment_intent_id)");
      return;
    }

    const normalized = normalizeCanadianPostalCode(data.postalCode);
    const postalFsa = normalized.formatted
      ? normalized.formatted.substring(0, 3).toUpperCase()
      : data.postalCode?.substring(0, 3).toUpperCase() || null;

    const coords = getCoordinatesFromPostalCode(data.postalCode);
    const enriched = enrichClientInfo(data);

    // Route through the log-unserved-order edge function. The public RLS
    // INSERT policy has been removed; only service_role (the edge function)
    // can write to unserved_orders.
    const { error } = await supabase.functions.invoke("log-unserved-order", {
      body: {
        postal_code_raw: data.postalCode,
        postal_fsa: postalFsa,
        city: data.city ?? null,
        address: enriched.address,
        service_type: data.serviceType ?? null,
        tasks: data.tasks ?? null,
        requested_start_time: data.requestedStartTime ?? null,
        radius_checked_km: data.radiusCheckedKm,
        psw_count_found: data.pswCountFound,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        reason: data.reason || "NO_PSW_IN_RADIUS",
        severity: data.severity ?? null,
        source_table: data.sourceTable ?? null,
        source_event_id: data.sourceEventId ?? null,
        booking_id: data.bookingId ?? null,
        booking_code: data.bookingCode ?? null,
        payment_status: data.paymentStatus ?? null,
        notes: data.notes ?? null,
        client_name: enriched.client_name,
        client_phone: enriched.client_phone,
        client_email: enriched.client_email,
        distance_km: data.distanceKm ?? null,
      },
    });

    if (error) {
      console.warn("[UnservedOrder] Failed to log via edge function:", error.message);
    }
  } catch (err) {
    console.warn("[UnservedOrder] Non-blocking error:", err);
  }
};
