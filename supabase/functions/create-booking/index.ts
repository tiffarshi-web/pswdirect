import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter (per-isolate; resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

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
 */
function computeHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return (endMinutes - startMinutes) / 60;
}

/**
 * Determine the highest-priority service category from task names by looking up service_tasks.
 */
async function determineServiceCategory(
  supabase: any,
  serviceTypeArr: string[]
): Promise<{ category: string; taxableFraction: number }> {
  if (!serviceTypeArr || serviceTypeArr.length === 0) {
    return { category: "standard", taxableFraction: 0 };
  }

  // Look up tasks by name
  const { data: tasks, error } = await supabase
    .from("service_tasks")
    .select("task_name, service_category, included_minutes, apply_hst, is_active")
    .in("task_name", serviceTypeArr);

  if (error || !tasks || tasks.length === 0) {
    console.warn("Could not look up service_tasks, defaulting to standard:", error);
    return { category: "standard", taxableFraction: 0 };
  }

  // Determine highest-priority category
  let category = "standard";
  for (const t of tasks) {
    if (t.service_category === "hospital-discharge") {
      category = "hospital-discharge";
      break;
    }
    if (t.service_category === "doctor-appointment") {
      category = "doctor-appointment";
    }
  }

  // Calculate taxable fraction based on included_minutes and apply_hst
  const totalMinutes = tasks.reduce((s: number, t: any) => s + (t.included_minutes || 30), 0);
  const taxableMinutes = tasks
    .filter((t: any) => t.apply_hst)
    .reduce((s: number, t: any) => s + (t.included_minutes || 30), 0);
  const taxableFraction = totalMinutes > 0 ? taxableMinutes / totalMinutes : 0;

  return { category, taxableFraction };
}

/**
 * Fetch category-based rates from app_settings → "category_rates".
 * Falls back to defaults if not configured.
 */
async function getCategoryRates(supabase: any): Promise<{
  standard: { firstHour: number; per30Min: number };
  "doctor-appointment": { firstHour: number; per30Min: number };
  "hospital-discharge": { firstHour: number; per30Min: number };
  minimumBookingFee: number;
}> {
  const defaults = {
    standard: { firstHour: 30, per30Min: 15 },
    "doctor-appointment": { firstHour: 35, per30Min: 17.5 },
    "hospital-discharge": { firstHour: 40, per30Min: 20 },
    minimumBookingFee: 30,
  };

  try {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "category_rates")
      .maybeSingle();

    if (data?.setting_value) {
      const parsed = JSON.parse(data.setting_value);
      return {
        standard: parsed.standard || defaults.standard,
        "doctor-appointment": parsed["doctor-appointment"] || defaults["doctor-appointment"],
        "hospital-discharge": parsed["hospital-discharge"] || defaults["hospital-discharge"],
        minimumBookingFee: parsed.minimumBookingFee ?? defaults.minimumBookingFee,
      };
    }
  } catch (e) {
    console.warn("Failed to fetch category_rates, using defaults:", e);
  }

  return defaults;
}

/**
 * Calculate price using category-based rates (matches client-side logic).
 * firstHour + additional 30-min blocks.
 */
function calculateCategoryPrice(
  durationHours: number,
  rates: { firstHour: number; per30Min: number }
): number {
  const additionalHalfHours = Math.max(0, Math.round((durationHours - 1) * 2));
  return rates.firstHour + additionalHalfHours * rates.per30Min;
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
      client_first_name,
      client_last_name,
      client_email,
      client_phone,
      client_address,
      client_postal_code,
      patient_name,
      patient_first_name,
      patient_last_name,
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
      street_number,
      street_name,
    } = body;

    // Validate required fields
    if (!client_email || !client_name || !scheduled_date || !start_time || !end_time || !service_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: client_email, client_name, scheduled_date, start_time, end_time, service_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize postal codes to "A1A 1A1" format
    const normalizePostal = (pc: string | null | undefined): string | null => {
      if (!pc) return null;
      const cleaned = pc.trim().toUpperCase().replace(/[\s-]/g, "");
      if (cleaned.length === 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      return pc.trim().toUpperCase();
    };

    // Normalize phone to (XXX) XXX-XXXX format
    const normalizePhone = (ph: string | null | undefined): string | null => {
      if (!ph) return null;
      let digits = ph.replace(/\D/g, "");
      if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
      if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      return ph.trim();
    };

    // ── Address normalization ──
    const SUFFIX_MAP: Record<string, string> = {
      road: "Rd", rd: "Rd", street: "St", st: "St", avenue: "Ave", ave: "Ave",
      boulevard: "Blvd", blvd: "Blvd", drive: "Dr", dr: "Dr", court: "Ct", ct: "Ct",
      crescent: "Cres", cres: "Cres", lane: "Ln", ln: "Ln", place: "Pl", pl: "Pl",
      terrace: "Terr", terr: "Terr", circle: "Cir", cir: "Cir", trail: "Trl", trl: "Trl",
      way: "Way", highway: "Hwy", hwy: "Hwy", parkway: "Pkwy", pkwy: "Pkwy",
      gardens: "Gdns", gdns: "Gdns", gate: "Gate", square: "Sq", sq: "Sq",
      path: "Path", grove: "Grv", grv: "Grv", heights: "Hts", hts: "Hts",
    };

    const normStreetNum = (v: string | null | undefined): string | null => {
      if (!v) return null;
      const t = v.trim().replace(/\s+/g, "");
      return t || null;
    };

    const normStreetName = (v: string | null | undefined): string | null => {
      if (!v) return null;
      const t = v.trim().replace(/\s+/g, " ");
      if (!t) return null;
      const words = t.split(" ");
      return words.map((w, i) => {
        const clean = w.replace(/\.+$/, "");
        const lower = clean.toLowerCase();
        if (i >= words.length - 2 && SUFFIX_MAP[lower]) return SUFFIX_MAP[lower];
        return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
      }).join(" ");
    };

    // Parse street from full address if split fields are missing
    let finalStreetNumber = normStreetNum(street_number);
    let finalStreetName = normStreetName(street_name);
    if (!finalStreetNumber && !finalStreetName) {
      const addr = (patient_address || client_address || "").split(",")[0].trim();
      const match = addr.match(/^(\d+[A-Za-z]?(?:-\d+)?)\s+(.+)$/);
      if (match) {
        finalStreetNumber = normStreetNum(match[1]);
        finalStreetName = normStreetName(match[2]);
      }
    }

    const normalizedClientPostal = normalizePostal(client_postal_code);
    const normalizedPatientPostal = normalizePostal(patient_postal_code);
    const normalizedPickupPostal = normalizePostal(pickup_postal_code);
    const normalizedPhone = normalizePhone(client_phone);

    // ═══════════════════════════════════════════════════════════════
    // SERVER-SIDE PRICING: Category-based rates matching client logic
    // ═══════════════════════════════════════════════════════════════
    const computedHours = computeHours(start_time, end_time);
    if (computedHours <= 0 || computedHours > 24) {
      return new Response(
        JSON.stringify({ error: "Invalid time range. Shift must be between 0 and 24 hours." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize service_type to array
    const serviceTypeArr: string[] = Array.isArray(service_type) ? service_type : [service_type];

    // Determine service category and taxable fraction from service_tasks
    const { category, taxableFraction } = await determineServiceCategory(supabase, serviceTypeArr);

    // Fetch category-based rates from app_settings
    const categoryRates = await getCategoryRates(supabase);
    const rates = categoryRates[category as keyof typeof categoryRates] || categoryRates.standard;

    // Calculate subtotal using category-based pricing
    const serverSubtotal = calculateCategoryPrice(computedHours, rates as { firstHour: number; per30Min: number });
    const serverHourlyRate = serverSubtotal / computedHours; // effective hourly rate for storage

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

    let preTax = serverSubtotal + serverSurge;

    // Apply minimum booking fee
    if (preTax < categoryRates.minimumBookingFee) {
      preTax = categoryRates.minimumBookingFee;
    }

    // Apply HST (13%) only to the taxable fraction of the subtotal
    const hstAmount = Math.round(preTax * taxableFraction * 0.13 * 100) / 100;
    const serverTotal = Math.round((preTax + hstAmount) * 100) / 100;

    console.log("💰 Pricing breakdown — Subtotal:", preTax, "HST:", hstAmount, "TaxableFraction:", taxableFraction, "Total:", serverTotal);

    // Insert booking WITHOUT booking_code — the DB trigger assigns it
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user_id || null,
        client_name,
        client_first_name: client_first_name || null,
        client_last_name: client_last_name || null,
        client_email,
        client_phone: normalizedPhone,
        client_address,
        client_postal_code: normalizedClientPostal,
        patient_name,
        patient_first_name: patient_first_name || null,
        patient_last_name: patient_last_name || null,
        patient_address,
        patient_postal_code: normalizedPatientPostal,
        patient_relationship: patient_relationship || null,
        preferred_gender: preferred_gender || null,
        preferred_languages: preferred_languages || null,
        scheduled_date,
        start_time,
        end_time,
        hours: computedHours,
        hourly_rate: Math.round(serverHourlyRate * 100) / 100,
        subtotal: Math.round(serverSubtotal * 100) / 100,
        surge_amount: serverSurge,
        total: serverTotal,
        service_type: serviceTypeArr,
        status: "pending",
        payment_status: payment_status || "invoice-pending",
        stripe_payment_intent_id: stripe_payment_intent_id || null,
        is_asap: is_asap || false,
        is_transport_booking: is_transport_booking || false,
        pickup_address: pickup_address || null,
        pickup_postal_code: normalizedPickupPostal,
        dropoff_address: dropoff_address || null,
        special_notes: special_notes || null,
        care_conditions: care_conditions || [],
        care_conditions_other: care_conditions_other || null,
        street_number: street_number || null,
        street_name: street_name || null,
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

    console.log("✅ Booking created:", data.id, "Code:", data.booking_code, "Category:", category, "HST:", hstAmount, "Total:", serverTotal);

    // Dispatch notification reliably before the function exits
    const effectivePaymentStatus = payment_status || "invoice-pending";
    if (effectivePaymentStatus === "paid" || stripe_payment_intent_id) {
      try {
        const notifyUrl = `${supabaseUrl}/functions/v1/notify-psws`;
        const notifyResponse = await fetch(notifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            booking_code: data.booking_code,
            city: client_address?.split(",").slice(-2, -1)[0]?.trim() || "",
            service_type: serviceTypeArr,
            scheduled_date: data.scheduled_date,
            start_time: data.start_time,
            is_asap: is_asap || false,
            patient_postal_code: patient_postal_code || client_postal_code || null,
            patient_address: patient_address || client_address || null,
            preferred_gender: preferred_gender || null,
            preferred_languages: preferred_languages || null,
            is_transport_booking: is_transport_booking || false,
          }),
        });

        const notifyResult = await notifyResponse.text();
        if (!notifyResponse.ok) {
          console.warn("PSW notification request failed:", notifyResponse.status, notifyResult);
        } else {
          console.log("📣 PSW notification request completed:", notifyResult);
        }
      } catch (e) {
        console.warn("Push notification setup failed:", e);
      }
    } else {
      console.log("⏳ Skipping PSW notification — payment not yet confirmed (status:", effectivePaymentStatus, ")");
    }

    return new Response(
      JSON.stringify({
        booking_id: data.id,
        booking_code: data.booking_code,
        created_at: data.created_at,
        scheduled_date: data.scheduled_date,
        start_time: data.start_time,
        end_time: data.end_time,
        subtotal: preTax,
        hst: hstAmount,
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
