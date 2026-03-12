import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter (per-isolate; resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 60 seconds

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";
}

/**
 * Compute hours between two time strings (HH:MM or HH:MM:SS).
 * Returns a positive number of hours.
 */
function computeHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  // Handle overnight shifts
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return (endMinutes - startMinutes) / 60;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      user_id,
      client_name,
      client_email,
      client_phone,
      client_address,
      client_postal_code,
      patient_name,
      patient_address,
      patient_postal_code,
      patient_relationship,
      preferred_gender,
      preferred_languages,
      scheduled_date,
      start_time,
      end_time,
      service_type,
      payment_status,
      stripe_payment_intent_id,
      is_asap,
      is_transport_booking,
      pickup_address,
      pickup_postal_code,
      special_notes,
      dropoff_address,
      care_conditions,
      care_conditions_other,
    } = body;

    // Validate required fields
    if (!client_email || !client_name || !scheduled_date || !start_time || !end_time || !service_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: client_email, client_name, scheduled_date, start_time, end_time, service_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // SERVER-SIDE PRICING: Compute hours, hourly_rate, and totals
    // ═══════════════════════════════════════════════════════════════
    const computedHours = computeHours(start_time, end_time);
    if (computedHours <= 0 || computedHours > 24) {
      return new Response(
        JSON.stringify({ error: "Invalid time range. Shift must be between 0 and 24 hours." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the current base hourly rate from pricing_configs
    const { data: pricingConfig, error: pricingError } = await supabase
      .from("pricing_configs")
      .select("base_hourly_rate, toronto_surge_rate")
      .limit(1)
      .single();

    if (pricingError || !pricingConfig) {
      console.error("❌ Failed to fetch pricing config:", pricingError);
      return new Response(
        JSON.stringify({ error: "Unable to determine pricing. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serverHourlyRate = Number(pricingConfig.base_hourly_rate);
    const serverSubtotal = Math.round(computedHours * serverHourlyRate * 100) / 100;

    // Surge: check app_settings for any active surge, default to 0
    let serverSurge = 0;
    try {
      const { data: surgeData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "surge_flat_amount")
        .maybeSingle();
      if (surgeData?.setting_value) {
        const parsed = Number(surgeData.setting_value);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 200) {
          serverSurge = parsed;
        }
      }
    } catch {
      // No surge configured, default to 0
    }

    const serverTotal = Math.round((serverSubtotal + serverSurge) * 100) / 100;

    // Insert booking WITHOUT booking_code — the DB trigger assigns it
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        // booking_code is intentionally omitted — trigger assigns CDT-XXXXXX
        user_id: user_id || null,
        client_name,
        client_email,
        client_phone: client_phone || null,
        client_address,
        client_postal_code: client_postal_code || null,
        patient_name,
        patient_address,
        patient_postal_code: patient_postal_code || null,
        patient_relationship: patient_relationship || null,
        preferred_gender: preferred_gender || null,
        preferred_languages: preferred_languages || null,
        scheduled_date,
        start_time,
        end_time,
        hours: computedHours,
        hourly_rate: serverHourlyRate,
        subtotal: serverSubtotal,
        surge_amount: serverSurge,
        total: serverTotal,
        service_type,
        status: "pending",
        payment_status: payment_status || "invoice-pending",
        stripe_payment_intent_id: stripe_payment_intent_id || null,
        is_asap: is_asap || false,
        is_transport_booking: is_transport_booking || false,
        pickup_address: pickup_address || null,
        pickup_postal_code: pickup_postal_code || null,
        dropoff_address: dropoff_address || null,
        special_notes: special_notes || null,
        care_conditions: care_conditions || [],
        care_conditions_other: care_conditions_other || null,
        psw_assigned: null,
        psw_first_name: null,
      })
      .select("id, booking_code, created_at, scheduled_date, start_time, end_time, total, status, payment_status, service_type, client_name, client_email")
      .single();

    if (error) {
      console.error("❌ Booking insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create booking. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Booking created:", data.id, "Code:", data.booking_code);

    return new Response(
      JSON.stringify({
        booking_id: data.id,
        booking_code: data.booking_code,
        created_at: data.created_at,
        scheduled_date: data.scheduled_date,
        start_time: data.start_time,
        end_time: data.end_time,
        total: data.total,
        status: data.status,
        payment_status: data.payment_status,
        service_type: data.service_type,
        client_name: data.client_name,
        client_email: data.client_email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Create booking error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
