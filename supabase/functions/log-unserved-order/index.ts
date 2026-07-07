// Public-callable chokepoint for logging unserved-order dispatch failures
// from the browser. This replaces the previous anon INSERT RLS policy on
// public.unserved_orders — the RLS policy is now service-role only, so all
// public writes must come through this validated endpoint.
//
// Security posture: this endpoint is intentionally callable without a JWT so
// the anonymous booking flow can still record a dispatch failure for admin
// recovery, BUT the function:
//   - accepts only a strict allowlist of columns
//   - constrains `reason` and `status` to known safe values
//   - forces server-side timestamps and lifecycle fields
//   - never accepts payment_link_token, full_client_payload, assigned_psw_id,
//     admin_notes, decline_reason, resolved_*, payment_intent_id from callers
//   - de-duplicates on (client_phone, postal_code_raw) within 15 minutes

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_REASONS = new Set([
  "NO_PSW_IN_RADIUS",
  "NO_PSW_AVAILABLE",
  "RADIUS_ALERT",
  "TIMEOUT",
  "DISPATCH_FAILED",
  "CLIENT_CANCELLED",
  "OTHER",
]);
const ALLOWED_SEVERITY = new Set(["low", "medium", "high", "critical"]);

type Body = {
  postal_code_raw?: string | null;
  postal_fsa?: string | null;
  city?: string | null;
  address?: string | null;
  service_type?: string | null;
  tasks?: string[] | null;
  requested_start_time?: string | null;
  radius_checked_km?: number | null;
  psw_count_found?: number | null;
  lat?: number | null;
  lng?: number | null;
  reason?: string | null;
  severity?: string | null;
  source_table?: string | null;
  source_event_id?: string | null;
  booking_id?: string | null;
  booking_code?: string | null;
  payment_status?: string | null;
  notes?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  distance_km?: number | null;
};

const clip = (v: unknown, max = 500) =>
  typeof v === "string" ? v.slice(0, max) : v === undefined ? null : v;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;

    // Recovery-contact guard — mirrors the previous client-side guard so we
    // never persist a fully anonymous session.
    const hasPhone = !!body.client_phone?.trim();
    const hasEmail = !!body.client_email?.trim();
    if (!hasPhone && !hasEmail) {
      return new Response(
        JSON.stringify({ skipped: "no_contact_info" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reason = body.reason && ALLOWED_REASONS.has(body.reason)
      ? body.reason
      : "NO_PSW_IN_RADIUS";
    const severity = body.severity && ALLOWED_SEVERITY.has(body.severity)
      ? body.severity
      : null;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Dedup: same phone+postal in last 15 minutes → UPDATE the existing row
    if (body.client_phone && body.postal_code_raw) {
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("unserved_orders")
        .select("id")
        .eq("client_phone", body.client_phone)
        .eq("postal_code_raw", body.postal_code_raw)
        .gte("created_at", fifteenMinAgo)
        .limit(1);
      if (existing && existing.length > 0) {
        await supabase.from("unserved_orders").update({
          service_type: clip(body.service_type),
          tasks: body.tasks ?? null,
          address: clip(body.address),
          requested_start_time: body.requested_start_time ?? null,
          radius_checked_km: body.radius_checked_km ?? null,
          psw_count_found: body.psw_count_found ?? null,
          reason,
          severity,
          source_table: clip(body.source_table, 128),
          source_event_id: clip(body.source_event_id, 128),
          booking_id: body.booking_id ?? null,
          booking_code: clip(body.booking_code, 32),
          payment_status: clip(body.payment_status, 32),
          notes: clip(body.notes, 2000),
          client_name: clip(body.client_name, 200),
          client_email: clip(body.client_email, 200),
        }).eq("id", existing[0].id);
        return new Response(
          JSON.stringify({ ok: true, updated: existing[0].id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { data, error } = await supabase.from("unserved_orders").insert({
      postal_code_raw: clip(body.postal_code_raw, 16),
      postal_fsa: clip(body.postal_fsa, 8),
      city: clip(body.city, 128),
      address: clip(body.address),
      service_type: clip(body.service_type, 128),
      tasks: body.tasks ?? null,
      requested_start_time: body.requested_start_time ?? null,
      radius_checked_km: body.radius_checked_km ?? null,
      psw_count_found: body.psw_count_found ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      reason,
      severity,
      source_table: clip(body.source_table, 128),
      source_event_id: clip(body.source_event_id, 128),
      booking_id: body.booking_id ?? null,
      booking_code: clip(body.booking_code, 32),
      payment_status: clip(body.payment_status, 32),
      notes: clip(body.notes, 2000),
      client_name: clip(body.client_name, 200),
      client_phone: clip(body.client_phone, 32),
      client_email: clip(body.client_email, 200),
      distance_km: body.distance_km ?? null,
      status: "PENDING",
      pending_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }).select("id").single();

    if (error) {
      console.error("[log-unserved-order] insert failed:", error.message);
      return new Response(
        JSON.stringify({ error: "log_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, id: data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[log-unserved-order] unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "bad_request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
