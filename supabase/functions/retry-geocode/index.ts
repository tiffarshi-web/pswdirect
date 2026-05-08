// retry-geocode — admin-callable: re-runs the geocode pipeline for a single booking.
// Reuses full-address → retry → postal-centroid logic. Never deletes/duplicates orders.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NominatimItem {
  lat: string;
  lon: string;
  importance?: number;
}

const tryNominatim = async (url: string): Promise<NominatimItem[] | { error: string; message: string } | null> => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      headers: { "User-Agent": "PSWDirect/1.0", "Accept-Language": "en-CA" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.status === 429) return { error: "RATE_LIMITED", message: "Nominatim 429" };
    if (!res.ok) return { error: "API_TIMEOUT", message: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: "API_TIMEOUT", message: String((e as Error)?.message || e) };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdminRow } = await supabase.rpc("is_admin");
    if (!isAdminRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { booking_id, manual_lat, manual_lng } = await req.json();
    if (!booking_id || typeof booking_id !== "string") {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, booking_code, patient_address, client_address, patient_postal_code, client_postal_code, geocode_attempts")
      .eq("id", booking_id)
      .maybeSingle();
    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Manual override path
    const mLat = parseFloat(manual_lat);
    const mLng = parseFloat(manual_lng);
    if (!isNaN(mLat) && !isNaN(mLng) && mLat !== 0 && mLng !== 0) {
      await supabase.from("bookings").update({
        service_latitude: mLat,
        service_longitude: mLng,
        geocode_status: "manual_override",
        geocode_source: "manual_override",
        geocode_error_code: null,
        geocode_error_message: null,
        geocode_confidence: 1.0,
        geocode_last_attempt_at: new Date().toISOString(),
        geocode_updated_at: new Date().toISOString(),
        geocode_attempts: (booking.geocode_attempts || 0) + 1,
      }).eq("id", booking_id);
      return new Response(JSON.stringify({ ok: true, status: "manual_override", lat: mLat, lng: mLng }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAddress = booking.patient_address || booking.client_address || "";
    const postal = booking.patient_postal_code || booking.client_postal_code || "";
    let geoLat: number | null = null;
    let geoLng: number | null = null;
    let source: string | null = null;
    let status: "success" | "approximate" | "postal_fallback" | "failed" = "failed";
    let confidence: number | null = null;
    let errorCode: string | null = null;
    let errorMsg: string | null = null;
    let attempts = 0;

    if (serviceAddress.trim().length >= 5) {
      const q = serviceAddress.includes("Canada")
        ? serviceAddress
        : [serviceAddress, "Ontario", "Canada"].filter(Boolean).join(", ");
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q)}&limit=1&countrycodes=ca`;
      for (let i = 0; i < 2 && geoLat === null; i++) {
        attempts++;
        const r = await tryNominatim(url);
        if (Array.isArray(r) && r.length > 0) {
          const lat = parseFloat(r[0].lat);
          const lng = parseFloat(r[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            geoLat = lat; geoLng = lng;
            source = "full_address";
            confidence = typeof r[0].importance === "number" ? r[0].importance : 0.5;
            status = confidence >= 0.4 ? "success" : "approximate";
            errorCode = null; errorMsg = null;
            break;
          }
        } else if (r && !Array.isArray(r)) {
          errorCode = (r as any).error;
          errorMsg = (r as any).message;
        } else if (errorCode === null) {
          errorCode = "ZERO_RESULTS";
          errorMsg = "No matches for full address";
        }
        if (i === 0 && geoLat === null) await new Promise((res) => setTimeout(res, 800));
      }
    }

    if (geoLat === null && postal) {
      const pc = postal.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (pc.length >= 3) {
        attempts++;
        const r = await tryNominatim(
          `https://nominatim.openstreetmap.org/search?postalcode=${pc}&country=CA&format=json&limit=1`
        );
        if (Array.isArray(r) && r.length > 0) {
          geoLat = parseFloat(r[0].lat);
          geoLng = parseFloat(r[0].lon);
          source = "postal_fallback";
          status = "postal_fallback";
          confidence = 0.3;
          errorCode = "POSTAL_CODE_ONLY_MATCH";
          errorMsg = "Resolved via postal-code centroid";
        }
      }
    }

    const updates: Record<string, any> = {
      geocode_status: status,
      geocode_error_code: errorCode,
      geocode_error_message: errorMsg,
      geocode_attempts: (booking.geocode_attempts || 0) + attempts,
      geocode_last_attempt_at: new Date().toISOString(),
      geocode_confidence: confidence,
      geocode_source: source,
      geocode_updated_at: new Date().toISOString(),
    };
    if (geoLat !== null && geoLng !== null) {
      updates.service_latitude = geoLat;
      updates.service_longitude = geoLng;
    }
    await supabase.from("bookings").update(updates).eq("id", booking_id);

    return new Response(JSON.stringify({
      ok: true, status, lat: geoLat, lng: geoLng, source, confidence,
      error_code: errorCode, error_message: errorMsg, attempts,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
