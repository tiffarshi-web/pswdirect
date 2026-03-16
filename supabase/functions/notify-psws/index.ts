import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Geocode helpers with layered Canadian fallbacks.
 */
type Coordinates = { lat: number; lng: number };

async function runGeocodeRequest(url: string): Promise<Coordinates | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PSWDirect/1.0" },
    });

    if (!res.ok) {
      console.warn("Geocoding request failed:", res.status, url);
      return null;
    }

    const results = await res.json();
    if (Array.isArray(results) && results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
  } catch (e) {
    console.warn("Geocoding failed:", e);
  }

  return null;
}

function normalizePostalCode(postalCode: string): { compact: string; formatted: string } {
  const compact = postalCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const formatted = compact.length === 6 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : compact;
  return { compact, formatted };
}

async function geocodePostalCode(postalCode: string): Promise<Coordinates | null> {
  const { compact, formatted } = normalizePostalCode(postalCode);
  if (compact.length < 3) return null;

  const searchUrls = [
    `https://nominatim.openstreetmap.org/search?postalcode=${compact}&country=CA&format=json&limit=1`,
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(`${formatted}, Ontario, Canada`)}`,
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(`${compact.slice(0, 3)}, Ontario, Canada`)}`,
  ];

  for (const url of searchUrls) {
    const result = await runGeocodeRequest(url);
    if (result) return result;
  }

  return null;
}

async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const query = address.trim();
  if (query.length < 5) return null;

  return runGeocodeRequest(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(query)}`
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const progressierApiKey = Deno.env.get("PROGRESSIER_API_KEY");
    if (!progressierApiKey) {
      console.warn("⚠️ PROGRESSIER_API_KEY not set — skipping push notification");
      return new Response(
        JSON.stringify({ sent: false, reason: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      booking_code,
      city,
      service_type,
      scheduled_date,
      start_time,
      is_asap,
      // Filter params
      patient_postal_code,
      patient_address,
      patient_lat,
      patient_lng,
      preferred_gender,
      preferred_languages,
      is_transport_booking,
    } = body;

    // ── Step 1: Get location coordinates ──
    let lat = patient_lat !== undefined && patient_lat !== null ? Number(patient_lat) : null;
    let lng = patient_lng !== undefined && patient_lng !== null ? Number(patient_lng) : null;

    if ((lat !== null && Number.isNaN(lat)) || (lng !== null && Number.isNaN(lng))) {
      lat = null;
      lng = null;
    }

    if ((lat === null || lng === null) && patient_postal_code) {
      const geo = await geocodePostalCode(patient_postal_code);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }

    if ((lat === null || lng === null) && patient_address) {
      const fallbackQuery = patient_address.includes("Canada")
        ? patient_address
        : [patient_address, city, "Canada"].filter(Boolean).join(", ");
      const geo = await geocodeAddress(fallbackQuery);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }

    if (lat === null || lng === null) {
      console.warn("⚠️ Could not geocode booking location — broadcasting to all PSWs", {
        booking_code,
        patient_postal_code,
        patient_address,
      });
    }

    // ── Step 2: Get service radius from app_settings ──
    let radiusKm = 50;
    try {
      const { data: radiusData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "active_service_radius")
        .maybeSingle();
      if (radiusData?.setting_value) {
        const parsed = Number(radiusData.setting_value);
        if (!isNaN(parsed) && parsed > 0) radiusKm = parsed;
      }
    } catch { /* use default */ }

    // ── Step 3: Find nearby PSWs using proximity RPC ──
    let matchingEmails: string[] = [];

    if (lat && lng) {
      const { data: nearbyPsws, error: rpcError } = await supabase.rpc("get_nearby_psws", {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm,
      });

      if (rpcError) {
        console.error("❌ get_nearby_psws RPC error:", rpcError);
      }

      if (nearbyPsws && nearbyPsws.length > 0) {
        let filtered = nearbyPsws;

        // Filter by gender preference (2-hour window handled by claiming logic, but we still target)
        if (preferred_gender && preferred_gender !== "any" && preferred_gender !== "no-preference") {
          const genderMatched = filtered.filter(
            (p: any) => p.gender?.toLowerCase() === preferred_gender.toLowerCase()
          );
          // If gender-matched PSWs exist, target them; otherwise fall back to all nearby
          if (genderMatched.length > 0) {
            filtered = genderMatched;
          }
        }

        // Filter by language preference
        if (preferred_languages && Array.isArray(preferred_languages) && preferred_languages.length > 0) {
          const langMatched = filtered.filter((p: any) => {
            if (!p.languages || !Array.isArray(p.languages)) return false;
            return preferred_languages.some((lang: string) =>
              p.languages.some((pl: string) => pl.toLowerCase() === lang.toLowerCase())
            );
          });
          // If language-matched PSWs exist, target them; otherwise fall back
          if (langMatched.length > 0) {
            filtered = langMatched;
          }
        }

        // Filter by transport capability if transport booking
        if (is_transport_booking) {
          // Need to check has_own_transport — not in RPC result, query separately
          const pswIds = filtered.map((p: any) => p.id);
          const { data: transportData } = await supabase
            .from("psw_profiles")
            .select("id, email, has_own_transport")
            .in("id", pswIds);

          if (transportData) {
            const transportPswIds = new Set(
              transportData
                .filter((p: any) => p.has_own_transport === "yes")
                .map((p: any) => p.id)
            );
            // Build email list from transport-capable PSWs
            const transportFiltered = transportData.filter((p: any) => transportPswIds.has(p.id));
            matchingEmails = transportFiltered.map((p: any) => p.email).filter(Boolean);
          }
        } else {
          // Get emails for filtered PSWs
          const pswIds = filtered.map((p: any) => p.id);
          if (pswIds.length > 0) {
            const { data: emailData } = await supabase
              .from("psw_profiles")
              .select("id, email")
              .in("id", pswIds);
            matchingEmails = (emailData || []).map((p: any) => p.email).filter(Boolean);
          }
        }
      }
    }

    // Fallback: if no location or no matches, broadcast to all PSWs
    if (matchingEmails.length === 0) {
      console.log("📱 No filtered matches — broadcasting to all PSWs");
    }

    // ── Step 4: Create in-app notifications for matching PSWs ──
    if (matchingEmails.length > 0) {
      try {
        const notificationRows = matchingEmails.map((email: string) => ({
          user_email: email,
          title: is_asap ? "🚨 ASAP Job Available!" : "📋 New Job Available!",
          body: is_asap
            ? `Urgent: ${serviceLabel} needed now in ${locationLabel}. Open the Jobs tab to claim it!`
            : `${serviceLabel} in ${locationLabel} on ${dateLabel} at ${start_time || "TBD"}. Open the Jobs tab to accept.`,
          type: "new_job",
        }));

        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notificationRows);

        if (notifError) {
          console.warn("⚠️ Failed to insert in-app notifications:", notifError);
        } else {
          console.log(`📬 Created ${notificationRows.length} in-app notifications`);
        }
      } catch (e) {
        console.warn("In-app notification creation failed:", e);
      }
    }

    // ── Step 5: Build notification content ──
    const serviceLabel = Array.isArray(service_type)
      ? service_type.slice(0, 2).join(", ")
      : service_type || "Care Service";

    const locationLabel = city || "your area";
    const dateLabel = is_asap ? "ASAP" : scheduled_date || "upcoming";

    const title = is_asap ? "🚨 ASAP Job Available!" : "📋 New Job Available!";
    const notifBody = is_asap
      ? `Urgent: ${serviceLabel} needed now in ${locationLabel}. Claim it before someone else does!`
      : `${serviceLabel} in ${locationLabel} on ${dateLabel} at ${start_time || "TBD"}. Open app to claim.`;

    // ── Step 5: Send push via Progressier ──
    const pushPayload: any = {
      title,
      body: notifBody,
      url: "/psw-dashboard",
    };

    // If we have specific emails, target them; otherwise broadcast to all PSWs
    if (matchingEmails.length > 0) {
      pushPayload.recipients = { emails: matchingEmails };
      console.log(`📱 Sending targeted push to ${matchingEmails.length} PSWs`);
    } else {
      pushPayload.recipients = { tags: "psw" };
      console.log("📱 Broadcasting push to all PSWs (tag: psw)");
    }

    console.log("📱 Push payload:", JSON.stringify(pushPayload));

    const pushResponse = await fetch("https://progressier.com/api/v1/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${progressierApiKey}`,
      },
      body: JSON.stringify(pushPayload),
    });

    const pushResult = await pushResponse.text();
    console.log("📱 Progressier response:", pushResponse.status, pushResult);

    if (!pushResponse.ok) {
      console.error("❌ Progressier push failed:", pushResponse.status, pushResult);
      return new Response(
        JSON.stringify({ sent: false, status: pushResponse.status, error: pushResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        sent: true,
        booking_code,
        targeted_count: matchingEmails.length,
        broadcast: matchingEmails.length === 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("notify-psws error:", error);
    return new Response(
      JSON.stringify({ sent: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
