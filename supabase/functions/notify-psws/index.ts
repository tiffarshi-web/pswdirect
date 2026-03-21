import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://pswdirect.ca";

type Coordinates = { lat: number; lng: number };

async function runGeocodeRequest(url: string): Promise<Coordinates | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PSWDirect/1.0" } });
    if (!res.ok) return null;
    const results = await res.json();
    if (Array.isArray(results) && results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
  } catch (e) { console.warn("Geocoding failed:", e); }
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
  const urls = [
    `https://nominatim.openstreetmap.org/search?postalcode=${compact}&country=CA&format=json&limit=1`,
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(`${formatted}, Ontario, Canada`)}`,
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(`${compact.slice(0, 3)}, Ontario, Canada`)}`,
  ];
  for (const url of urls) {
    const result = await runGeocodeRequest(url);
    if (result) return result;
  }
  return null;
}

async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (address.trim().length < 5) return null;
  return runGeocodeRequest(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(address.trim())}`
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const progressierApiKey = Deno.env.get("PROGRESSIER_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      booking_id,
      booking_code,
      city,
      service_type,
      scheduled_date,
      start_time,
      end_time,
      hours,
      is_asap,
      patient_postal_code,
      patient_address,
      patient_lat,
      patient_lng,
      preferred_gender,
      preferred_languages,
      is_transport_booking,
    } = body;

    // ── Build content labels early ──
    const serviceLabel = Array.isArray(service_type)
      ? service_type.slice(0, 2).join(", ")
      : service_type || "Care Service";
    const locationLabel = city || "your area";
    const dateLabel = is_asap ? "ASAP" : scheduled_date || "upcoming";
    const hoursLabel = hours ? `${hours} hours` : "";
    const deepLinkPath = `/psw/jobs/${booking_code}`;
    const deepLinkUrl = `${SITE_URL}${deepLinkPath}`;

    // ── Step 1: Get location coordinates ──
    let lat = patient_lat != null ? Number(patient_lat) : null;
    let lng = patient_lng != null ? Number(patient_lng) : null;
    if ((lat !== null && isNaN(lat)) || (lng !== null && isNaN(lng))) { lat = null; lng = null; }

    if ((lat === null || lng === null) && patient_postal_code) {
      const geo = await geocodePostalCode(patient_postal_code);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }
    if ((lat === null || lng === null) && patient_address) {
      const fallbackQuery = patient_address.includes("Canada")
        ? patient_address
        : [patient_address, city, "Canada"].filter(Boolean).join(", ");
      const geo = await geocodeAddress(fallbackQuery);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }
    if (lat === null || lng === null) {
      console.warn("⚠️ Could not geocode — broadcasting to all PSWs", { booking_code, patient_postal_code });
    }

    // ── Step 2: Get service radius ──
    let radiusKm = 50;
    try {
      const { data: rd } = await supabase
        .from("app_settings").select("setting_value").eq("setting_key", "active_service_radius").maybeSingle();
      if (rd?.setting_value) { const p = Number(rd.setting_value); if (!isNaN(p) && p > 0) radiusKm = p; }
    } catch { /* default */ }

    // ── Step 3: Find nearby PSWs ──
    let matchedPsws: { id: string; email: string; phone?: string; first_name: string }[] = [];
    const matchLog: Record<string, any> = {
      booking_code,
      geocoded: lat !== null && lng !== null,
      radius_km: radiusKm,
    };

    if (lat && lng) {
      const { data: nearbyPsws, error: rpcError } = await supabase.rpc("get_nearby_psws", {
        p_lat: lat, p_lng: lng, p_radius_km: radiusKm,
      });

      if (rpcError) console.error("❌ get_nearby_psws RPC error:", rpcError);

      matchLog.psws_in_radius = nearbyPsws?.length || 0;

      if (nearbyPsws && nearbyPsws.length > 0) {
        let filtered = nearbyPsws;

        // Gender filter (soft: falls back if no matches)
        if (preferred_gender && preferred_gender !== "any" && preferred_gender !== "no-preference") {
          const gm = filtered.filter((p: any) => p.gender?.toLowerCase() === preferred_gender.toLowerCase());
          matchLog.gender_filter = { requested: preferred_gender, matched: gm.length, total: filtered.length };
          if (gm.length > 0) filtered = gm;
          else matchLog.gender_filter.fallback = true;
        }

        // Language filter (soft: falls back if no matches)
        if (preferred_languages && Array.isArray(preferred_languages) && preferred_languages.length > 0) {
          const lm = filtered.filter((p: any) =>
            p.languages?.some((pl: string) => preferred_languages.some((l: string) => pl.toLowerCase() === l.toLowerCase()))
          );
          matchLog.language_filter = { requested: preferred_languages, matched: lm.length, total: filtered.length };
          if (lm.length > 0) filtered = lm;
          else matchLog.language_filter.fallback = true;
        }

        // Get full profile data (email, phone, transport)
        const pswIds = filtered.map((p: any) => p.id);
        if (pswIds.length > 0) {
          const { data: profileData } = await supabase
            .from("psw_profiles")
            .select("id, email, phone, first_name, has_own_transport")
            .in("id", pswIds);

          if (profileData) {
            let profiles = profileData;
            // Transport filter (hard: must have vehicle for transport jobs)
            if (is_transport_booking) {
              const before = profiles.length;
              profiles = profiles.filter((p: any) => p.has_own_transport === "yes");
              matchLog.transport_filter = { required: true, before, after: profiles.length };
            }
            matchedPsws = profiles.map((p: any) => ({
              id: p.id, email: p.email, phone: p.phone, first_name: p.first_name,
            }));
          }
        }
      }
    } else {
      matchLog.geocode_failed = true;
    }

    const matchingEmails = matchedPsws.map(p => p.email).filter(Boolean);
    matchLog.final_matched_count = matchingEmails.length;
    matchLog.broadcast = matchingEmails.length === 0;
    console.log("🔍 Dispatch match results:", JSON.stringify(matchLog));

    const channelsSent: string[] = [];

    // ── Step 4: In-app notifications ──
    if (matchingEmails.length > 0) {
      try {
        const rows = matchingEmails.map((email) => ({
          user_email: email,
          title: is_asap ? "🚨 ASAP Job Available!" : "📋 New Job Available!",
          body: is_asap
            ? `Urgent: ${serviceLabel} needed now in ${locationLabel}. Tap to claim!`
            : `${serviceLabel} in ${locationLabel} on ${dateLabel} at ${start_time || "TBD"}. Tap to accept.`,
          type: "new_job",
        }));
        const { error: nErr } = await supabase.from("notifications").insert(rows);
        if (!nErr) {
          channelsSent.push("in_app");
          console.log(`📬 Created ${rows.length} in-app notifications`);
        }
      } catch (e) { console.warn("In-app notification error:", e); }
    }

    // ── Step 5: Push notification via Progressier (with deep link) ──
    if (progressierApiKey) {
      const title = is_asap ? "🚨 ASAP Job Available!" : "📋 New Job Available!";
      const notifBody = is_asap
        ? `Urgent: ${serviceLabel} needed now in ${locationLabel}. Claim it now!`
        : `${locationLabel} • ${hoursLabel || dateLabel} • ${serviceLabel}`;

      const pushPayload: any = {
        title,
        body: notifBody,
        url: deepLinkPath,
      };

      if (matchingEmails.length > 0) {
        pushPayload.recipients = { emails: matchingEmails };
        console.log(`📱 Targeted push to ${matchingEmails.length} PSWs → ${deepLinkPath}`);
      } else {
        pushPayload.recipients = { tags: "psw" };
        console.log("📱 Broadcasting push to all PSWs");
      }

      try {
        const pushRes = await fetch("https://progressier.app/xXf0UWVAPdw78va7cNFf/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${progressierApiKey}` },
          body: JSON.stringify(pushPayload),
        });
        const pushText = await pushRes.text();
        console.log("📱 Progressier response:", pushRes.status, pushText);
        if (pushRes.ok) channelsSent.push("push");
      } catch (e) { console.warn("Push notification error:", e); }
    }

    // ── Step 6: Email backup to matched PSWs ──
    if (resendApiKey && matchedPsws.length > 0) {
      try {
        for (const psw of matchedPsws.slice(0, 20)) {
          if (!psw.email) continue;
          const htmlBody = `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
              <h2 style="color:#2563eb;">New Job Available</h2>
              <p>Hi ${psw.first_name || "there"},</p>
              <p>A new care job is available in <strong>${locationLabel}</strong>:</p>
              <ul>
                <li><strong>Tasks:</strong> ${serviceLabel}</li>
                <li><strong>Date:</strong> ${dateLabel}</li>
                <li><strong>Time:</strong> ${start_time || "TBD"} – ${end_time || "TBD"}</li>
                ${hoursLabel ? `<li><strong>Duration:</strong> ${hoursLabel}</li>` : ""}
              </ul>
              <p style="margin-top:20px;">
                <a href="${deepLinkUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">
                  View &amp; Accept Job
                </a>
              </p>
              <p style="color:#666;font-size:12px;margin-top:20px;">First to accept gets the job. This link expires once the shift is claimed.</p>
            </div>
          `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
            body: JSON.stringify({
              from: "PSA Direct <no-reply@psadirect.ca>",
              to: psw.email,
              subject: is_asap ? "🚨 ASAP Job Available — Claim Now" : `📋 New Job in ${locationLabel}`,
              html: htmlBody,
            }),
          });
        }
        channelsSent.push("email");
        console.log(`📧 Sent email backup to ${Math.min(matchedPsws.length, 20)} PSWs`);
      } catch (e) { console.warn("Email backup error:", e); }
    }

    // ── Step 7: SMS backup (Twilio — skip if not configured) ──
    // SMS requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER secrets
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

    if (twilioSid && twilioAuth && twilioFrom) {
      try {
        const smsBody = is_asap
          ? `🚨 ASAP PSW job in ${locationLabel}. ${serviceLabel}. Claim now: ${deepLinkUrl}`
          : `New PSW job in ${locationLabel} for ${hoursLabel || dateLabel}. ${serviceLabel}. View: ${deepLinkUrl}`;

        let smsSent = 0;
        for (const psw of matchedPsws.slice(0, 20)) {
          if (!psw.phone) continue;
          const phone = psw.phone.replace(/\D/g, "");
          if (phone.length < 10) continue;
          const toNumber = phone.length === 10 ? `+1${phone}` : `+${phone}`;

          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
            },
            body: new URLSearchParams({ To: toNumber, From: twilioFrom, Body: smsBody }),
          });
          smsSent++;
        }
        if (smsSent > 0) {
          channelsSent.push("sms");
          console.log(`📱 Sent SMS to ${smsSent} PSWs`);
        }
      } catch (e) { console.warn("SMS backup error:", e); }
    }

    // ── Step 8: Log dispatch to dispatch_logs ──
    try {
      await supabase.from("dispatch_logs").insert({
        booking_id: booking_id || null,
        booking_code: booking_code || "unknown",
        matched_psw_ids: matchedPsws.map(p => p.id),
        matched_psw_emails: matchingEmails,
        channels_sent: channelsSent,
        notes: matchingEmails.length === 0 ? "Broadcast to all — no filtered matches" : null,
      });
    } catch (e) { console.warn("Dispatch log error:", e); }

    return new Response(
      JSON.stringify({
        sent: true,
        booking_code,
        targeted_count: matchingEmails.length,
        broadcast: matchingEmails.length === 0,
        channels: channelsSent,
        deep_link: deepLinkPath,
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
