// Edge function: Handle unclaimed booking expiry with scheduling-aware logic
// Called by pg_cron every 10 minutes
//
// RULES:
// 1. Future scheduled orders: do NOT expire before their start time
// 2. Immediate/ASAP orders: expire after 2h unclaimed → move to unserved
// 3. Assigned orders (psw_assigned IS NOT NULL): never touched
// 4. Invoice-later orders follow same timing rules as Stripe orders

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    // Fetch pending, unassigned bookings created more than 2 hours ago
    const { data: staleBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, booking_code, client_name, client_email, client_phone, scheduled_date, start_time, end_time, created_at, payment_status, stripe_payment_intent_id, is_asap, service_type, is_transport_booking, total, hours, hourly_rate, patient_address, patient_postal_code, special_notes, preferred_languages, preferred_gender")
      .eq("status", "pending")
      .is("psw_assigned", null)
      .lt("created_at", twoHoursAgo)
      .limit(50);

    if (fetchError) {
      console.error("Error fetching stale bookings:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter: only process paid or admin-created orders
    const validStale = (staleBookings || []).filter((b: any) => {
      if (b.payment_status === "paid") return true;
      if (!b.stripe_payment_intent_id) return true; // admin-created / invoice-later
      return false;
    });

    if (validStale.length === 0) {
      return new Response(JSON.stringify({ flagged: 0, expired: 0, message: "No stale bookings found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Categorize bookings
    const futureScheduled: any[] = [];
    const expirableNow: any[] = [];

    for (const booking of validStale) {
      // Build the actual booking start datetime from scheduled_date + start_time
      const bookingStartStr = `${booking.scheduled_date}T${booking.start_time}`;
      const bookingStart = new Date(bookingStartStr);

      if (bookingStart > now) {
        // Future scheduled: booking hasn't started yet — do NOT expire
        futureScheduled.push(booking);
      } else {
        // Booking start time has passed and still unclaimed for 2+ hours — expirable
        expirableNow.push(booking);
      }
    }

    // Get admin emails for notifications
    const { data: adminEmails } = await supabase
      .from("admin_invitations")
      .select("email")
      .eq("status", "accepted");

    const emails = adminEmails?.map((a: any) => a.email) || [];

    let flaggedCount = 0;
    let expiredCount = 0;

    // ── FUTURE SCHEDULED: alert admins only (no expiry) ──
    for (const booking of futureScheduled) {
      if (emails.length > 0) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", "unclaimed_alert")
          .ilike("body", `%${booking.booking_code}%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          const rows = emails.map((email: string) => ({
            user_email: email,
            title: `⏳ Unclaimed Future: ${booking.booking_code}`,
            body: `Booking ${booking.booking_code} for ${booking.client_name} (${booking.scheduled_date} ${booking.start_time}–${booking.end_time}) is scheduled but unclaimed. Consider manual assignment before start time.`,
            type: "unclaimed_alert",
          }));
          await supabase.from("notifications").insert(rows);
          flaggedCount++;
          console.log(`⏳ Future booking alerted (not expired): ${booking.booking_code} starts ${booking.scheduled_date} ${booking.start_time}`);
        }
      }
    }

    // ── EXPIRABLE NOW: booking start has passed + 2h unclaimed → move to unserved ──
    for (const booking of expirableNow) {
      // Check if already has an unserved_orders row (idempotency)
      const { data: existingUnserved } = await supabase
        .from("unserved_orders")
        .select("id")
        .eq("booking_id", booking.id)
        .limit(1);

      if (existingUnserved && existingUnserved.length > 0) {
        console.log(`⚠️ Already in unserved: ${booking.booking_code}`);
        continue;
      }

      // Create unserved_orders row with full order data preserved
      const { error: unservedError } = await supabase.from("unserved_orders").insert({
        booking_id: booking.id,
        postal_code_raw: booking.patient_postal_code || null,
        postal_fsa: booking.patient_postal_code ? booking.patient_postal_code.substring(0, 3).toUpperCase() : null,
        service_type: Array.isArray(booking.service_type) ? booking.service_type.join(", ") : booking.service_type,
        requested_start_time: `${booking.scheduled_date}T${booking.start_time}`,
        radius_checked_km: 0,
        psw_count_found: 0,
        reason: booking.is_asap ? "ASAP_UNCLAIMED_EXPIRED" : "SCHEDULED_UNCLAIMED_EXPIRED",
        notes: `Auto-expired: booking ${booking.booking_code} was unclaimed past start time + 2h grace period.`,
        client_name: booking.client_name,
        client_phone: booking.client_phone,
        client_email: booking.client_email,
        status: "PENDING",
        pending_expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });

      if (unservedError) {
        console.error(`Failed to create unserved row for ${booking.booking_code}:`, unservedError);
        continue;
      }

      // Update booking status to reflect it moved to unserved
      await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", booking.id)
        .is("psw_assigned", null); // safety: only if still unassigned

      // Notify admins
      if (emails.length > 0) {
        const rows = emails.map((email: string) => ({
          user_email: email,
          title: `🚫 Expired → Unserved: ${booking.booking_code}`,
          body: `Booking ${booking.booking_code} for ${booking.client_name} (${booking.scheduled_date} ${booking.start_time}–${booking.end_time}) expired unclaimed and moved to Unserved. Manual assignment required.`,
          type: "unclaimed_alert",
        }));
        await supabase.from("notifications").insert(rows);
      }

      expiredCount++;
      console.log(`🚫 Expired → Unserved: ${booking.booking_code} (start was ${booking.scheduled_date} ${booking.start_time})`);
    }

    return new Response(
      JSON.stringify({
        flagged: flaggedCount,
        expired: expiredCount,
        futureKept: futureScheduled.length,
        checked: validStale.length,
        message: `${futureScheduled.length} future orders kept active, ${expiredCount} expired to unserved, ${flaggedCount} alerts sent`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("expire-unclaimed-bookings error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
