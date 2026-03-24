// Edge function: Staged Dispatch Escalation
// Runs via pg_cron every 5 minutes
// Checks upcoming bookings and re-broadcasts at T-4h (URGENT) and T-1h (CRITICAL)
// Does NOT modify pricing, Stripe, invoices, or booking creation
// Only READS bookings + INSERTS notifications/dispatch_logs

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://pswdirect.ca";

// Default thresholds (hours before start time)
const DEFAULT_URGENT_HOURS = 4;
const DEFAULT_CRITICAL_HOURS = 1;

type EscalationStage = "normal" | "urgent" | "critical";

function getStageForBooking(
  scheduledDate: string,
  startTime: string,
  now: Date,
  urgentHours: number,
  criticalHours: number
): EscalationStage | null {
  const bookingStart = new Date(`${scheduledDate}T${startTime}`);
  const hoursUntilStart = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilStart <= 0) return null; // past start time — handled by expire-unclaimed-bookings
  if (hoursUntilStart <= criticalHours) return "critical";
  if (hoursUntilStart <= urgentHours) return "urgent";
  return null; // not yet in escalation window
}

function stageDispatchKey(bookingCode: string, stage: EscalationStage): string {
  return `ESCALATION_${stage.toUpperCase()}_${bookingCode}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const progressierApiKey = Deno.env.get("PROGRESSIER_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();

    // Load configurable thresholds from app_settings (optional)
    let urgentHours = DEFAULT_URGENT_HOURS;
    let criticalHours = DEFAULT_CRITICAL_HOURS;
    try {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "dispatch_escalation_config")
        .maybeSingle();
      if (setting?.setting_value) {
        const cfg = JSON.parse(setting.setting_value);
        if (cfg.urgent_hours && !isNaN(cfg.urgent_hours)) urgentHours = cfg.urgent_hours;
        if (cfg.critical_hours && !isNaN(cfg.critical_hours)) criticalHours = cfg.critical_hours;
      }
    } catch { /* use defaults */ }

    // Find pending, unassigned bookings with a future start time within the escalation window
    // We look for bookings starting within the next urgentHours
    const windowEnd = new Date(now.getTime() + urgentHours * 60 * 60 * 1000);
    const windowEndDate = windowEnd.toISOString().split("T")[0];
    const todayDate = now.toISOString().split("T")[0];

    const { data: candidates, error: fetchError } = await supabase
      .from("bookings")
      .select("id, booking_code, client_name, client_email, client_phone, scheduled_date, start_time, end_time, hours, service_type, is_asap, is_transport_booking, patient_postal_code, patient_address, preferred_gender, preferred_languages, payment_status, stripe_payment_intent_id")
      .eq("status", "pending")
      .is("psw_assigned", null)
      .gte("scheduled_date", todayDate)
      .lte("scheduled_date", windowEndDate)
      .limit(50);

    if (fetchError) {
      console.error("Escalation fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter: only process paid or admin-created (no stripe PI) orders
    const eligible = (candidates || []).filter((b: any) => {
      if (b.payment_status === "paid") return true;
      if (!b.stripe_payment_intent_id) return true; // admin/invoice-later
      return false;
    });

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ escalated: 0, message: "No bookings need escalation" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin emails for critical alerts
    const { data: adminEmails } = await supabase
      .from("admin_invitations")
      .select("email")
      .eq("status", "accepted");
    const adminEmailList = adminEmails?.map((a: any) => a.email) || [];

    let urgentCount = 0;
    let criticalCount = 0;

    for (const booking of eligible) {
      const stage = getStageForBooking(
        booking.scheduled_date,
        booking.start_time,
        now,
        urgentHours,
        criticalHours
      );

      if (!stage) continue; // not in escalation window yet

      const dispatchKey = stageDispatchKey(booking.booking_code, stage);

      // Idempotency: check if we already escalated this booking at this stage
      const { data: existingLog } = await supabase
        .from("dispatch_logs")
        .select("id")
        .eq("booking_code", booking.booking_code)
        .ilike("notes", `%${dispatchKey}%`)
        .limit(1);

      if (existingLog && existingLog.length > 0) {
        continue; // already escalated at this stage
      }

      const bookingStart = new Date(`${booking.scheduled_date}T${booking.start_time}`);
      const hoursUntilStart = Math.max(0, (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60));
      const timeLabel = hoursUntilStart < 1
        ? `${Math.round(hoursUntilStart * 60)} minutes`
        : `${hoursUntilStart.toFixed(1)} hours`;

      const serviceLabel = Array.isArray(booking.service_type)
        ? booking.service_type.slice(0, 2).join(", ")
        : booking.service_type || "Care Service";
      const deepLinkPath = `/psw/jobs/${booking.booking_code}`;
      const deepLinkUrl = `${SITE_URL}${deepLinkPath}`;

      // ── Get service radius ──
      let radiusKm = 50;
      try {
        const { data: rd } = await supabase
          .from("app_settings").select("setting_value").eq("setting_key", "active_service_radius").maybeSingle();
        if (rd?.setting_value) { const p = Number(rd.setting_value); if (!isNaN(p) && p > 0) radiusKm = p; }
      } catch { /* default */ }

      // ── Geocode patient location ──
      let lat: number | null = null;
      let lng: number | null = null;
      if (booking.patient_postal_code) {
        try {
          const pc = booking.patient_postal_code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
          const formatted = pc.length === 6 ? `${pc.slice(0, 3)} ${pc.slice(3)}` : pc;
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${pc}&country=CA&format=json&limit=1`,
            { headers: { "User-Agent": "PSWDirect/1.0" } }
          );
          if (geoRes.ok) {
            const results = await geoRes.json();
            if (Array.isArray(results) && results.length > 0) {
              lat = parseFloat(results[0].lat);
              lng = parseFloat(results[0].lon);
            }
          }
          // Fallback with formatted query
          if (lat === null && formatted) {
            const geoRes2 = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(`${formatted}, Ontario, Canada`)}`,
              { headers: { "User-Agent": "PSWDirect/1.0" } }
            );
            if (geoRes2.ok) {
              const results2 = await geoRes2.json();
              if (Array.isArray(results2) && results2.length > 0) {
                lat = parseFloat(results2[0].lat);
                lng = parseFloat(results2[0].lon);
              }
            }
          }
        } catch { /* skip geocode */ }
      }

      // ── Find matching PSWs ──
      let matchingEmails: string[] = [];
      let matchedPswNames: { email: string; first_name: string }[] = [];

      if (lat !== null && lng !== null) {
        const { data: nearbyPsws } = await supabase.rpc("get_nearby_psws", {
          p_lat: lat, p_lng: lng, p_radius_km: radiusKm,
        });

        if (nearbyPsws && nearbyPsws.length > 0) {
          const pswIds = nearbyPsws.map((p: any) => p.id);
          const { data: profiles } = await supabase
            .from("psw_profiles")
            .select("id, email, first_name, has_own_transport")
            .in("id", pswIds);

          if (profiles) {
            let filtered = profiles;
            // Transport hard filter
            if (booking.is_transport_booking) {
              filtered = filtered.filter((p: any) => p.has_own_transport === "yes");
            }
            matchedPswNames = filtered.map((p: any) => ({ email: p.email, first_name: p.first_name }));
            matchingEmails = filtered.map((p: any) => p.email).filter(Boolean);
          }
        }
      }

      const channelsSent: string[] = [];

      // ── Stage-specific messaging ──
      const urgencyPrefix = stage === "critical" ? "🚨 CRITICAL" : "⚠️ URGENT";
      const titleText = stage === "critical"
        ? `🚨 CRITICAL: Job starts in ${timeLabel}!`
        : `⚠️ URGENT: Job starts in ${timeLabel}`;

      // ── In-app notifications to matched PSWs ──
      if (matchingEmails.length > 0) {
        try {
          const rows = matchingEmails.map((email) => ({
            user_email: email,
            title: titleText,
            body: `${urgencyPrefix}: ${serviceLabel} starting in ${timeLabel}. Claim now before it's gone!`,
            type: stage === "critical" ? "critical_job" : "urgent_job",
          }));
          const { error: nErr } = await supabase.from("notifications").insert(rows);
          if (!nErr) channelsSent.push("in_app");
        } catch { /* non-blocking */ }

        // ── Push notifications ──
        if (progressierApiKey) {
          try {
            const pushRes = await fetch("https://progressier.app/xXf0UWVAPdw78va7cNFf/send", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${progressierApiKey}` },
              body: JSON.stringify({
                title: titleText,
                body: `${serviceLabel} • Starts in ${timeLabel} • Claim now!`,
                url: deepLinkPath,
                recipients: { emails: matchingEmails },
              }),
            });
            if (pushRes.ok) channelsSent.push("push");
            await pushRes.text();
          } catch { /* non-blocking */ }
        }

        // ── Email re-broadcast ──
        if (resendApiKey) {
          try {
            let sent = 0;
            for (const psw of matchedPswNames.slice(0, 20)) {
              if (!psw.email) continue;
              const htmlBody = `
                <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                  <h2 style="color:${stage === "critical" ? "#dc2626" : "#f59e0b"};">${urgencyPrefix}: Job Starting Soon!</h2>
                  <p>Hi ${psw.first_name || "there"},</p>
                  <p>A care job is starting in <strong>${timeLabel}</strong> and still needs a caregiver:</p>
                  <ul>
                    <li><strong>Service:</strong> ${serviceLabel}</li>
                    <li><strong>Date:</strong> ${booking.scheduled_date}</li>
                    <li><strong>Time:</strong> ${booking.start_time} – ${booking.end_time || "TBD"}</li>
                    ${booking.hours ? `<li><strong>Duration:</strong> ${booking.hours} hours</li>` : ""}
                  </ul>
                  <p style="margin-top:20px;">
                    <a href="${deepLinkUrl}" style="background:${stage === "critical" ? "#dc2626" : "#f59e0b"};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">
                      Claim This Job Now
                    </a>
                  </p>
                  <p style="color:#666;font-size:12px;margin-top:20px;">This job starts very soon. First to accept gets it.</p>
                </div>
              `;
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
                body: JSON.stringify({
                  from: "PSA Direct <no-reply@psadirect.ca>",
                  to: psw.email,
                  subject: titleText,
                  html: htmlBody,
                }),
              });
              sent++;
            }
            if (sent > 0) channelsSent.push("email");
          } catch { /* non-blocking */ }
        }
      }

      // ── Admin alert for CRITICAL stage ──
      if (stage === "critical" && adminEmailList.length > 0) {
        try {
          const adminRows = adminEmailList.map((email: string) => ({
            user_email: email,
            title: `🚨 CRITICAL: ${booking.booking_code} unassigned — starts in ${timeLabel}`,
            body: `Booking ${booking.booking_code} for ${booking.client_name} (${serviceLabel}, ${booking.scheduled_date} ${booking.start_time}–${booking.end_time}) is CRITICAL — starts in ${timeLabel} with no PSW assigned. Immediate manual assignment recommended.`,
            type: "critical_unassigned",
          }));
          await supabase.from("notifications").insert(adminRows);
          channelsSent.push("admin_alert");
        } catch { /* non-blocking */ }
      }

      // ── Log dispatch escalation ──
      try {
        await supabase.from("dispatch_logs").insert({
          booking_id: booking.id,
          booking_code: booking.booking_code,
          matched_psw_ids: matchedPswNames.map(() => "re-broadcast"),
          matched_psw_emails: matchingEmails,
          channels_sent: channelsSent,
          notes: `${dispatchKey} — Stage: ${stage.toUpperCase()}, ${timeLabel} until start, ${matchingEmails.length} PSWs re-notified`,
        });
      } catch { /* non-blocking */ }

      if (stage === "urgent") urgentCount++;
      if (stage === "critical") criticalCount++;

      console.log(`${stage === "critical" ? "🚨" : "⚠️"} [${booking.booking_code}] Escalated to ${stage.toUpperCase()} — ${timeLabel} until start, ${matchingEmails.length} PSWs notified`);
    }

    return new Response(
      JSON.stringify({
        urgent: urgentCount,
        critical: criticalCount,
        checked: eligible.length,
        message: `${urgentCount} urgent + ${criticalCount} critical escalations processed`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("dispatch-escalation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
