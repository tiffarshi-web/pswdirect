// Edge function: Flag unclaimed pending bookings for admin review after 2 hours
// Called by pg_cron every 10 minutes
// IMPORTANT: Does NOT auto-cancel or move to unserved — leaves active for admin

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

    // Find bookings that are pending, unassigned, and older than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: staleBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, booking_code, client_name, client_email, scheduled_date, start_time, end_time, created_at, payment_status, stripe_payment_intent_id")
      .eq("status", "pending")
      .is("psw_assigned", null)
      .lt("created_at", twoHoursAgo)
      .limit(50);

    // Filter: only alert for paid or admin-created orders, not pending-payment ones
    const validStale = (staleBookings || []).filter((b: any) => {
      if (b.payment_status === "paid") return true;
      if (!b.stripe_payment_intent_id) return true; // admin-created
      return false; // has PI but not paid — payment still in progress
    });

    if (fetchError) {
      console.error("Error fetching stale bookings:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (validStale.length === 0) {
      return new Response(JSON.stringify({ flagged: 0, message: "No stale bookings found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify admins about unclaimed bookings (do NOT cancel or move to unserved)
    let flaggedCount = 0;

    // Get admin emails for notifications
    const { data: adminEmails } = await supabase
      .from("admin_invitations")
      .select("email")
      .eq("status", "accepted");

    const emails = adminEmails?.map((a: any) => a.email) || [];

    for (const booking of validStale) {
      // Insert admin notification about unclaimed booking (idempotent check)
      if (emails.length > 0) {
        // Check if we already notified for this booking
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", "unclaimed_alert")
          .ilike("body", `%${booking.booking_code}%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          const rows = emails.map((email: string) => ({
            user_email: email,
            title: `⚠️ Unclaimed: ${booking.booking_code}`,
            body: `Booking ${booking.booking_code} for ${booking.client_name} (${booking.scheduled_date} ${booking.start_time}–${booking.end_time}) has been unclaimed for 2+ hours. Consider manual assignment.`,
            type: "unclaimed_alert",
          }));
          await supabase.from("notifications").insert(rows);
          flaggedCount++;
          console.log(`⚠️ Admin alerted about unclaimed booking: ${booking.booking_code}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ flagged: flaggedCount, checked: staleBookings.length, message: "Bookings remain active for admin review" }),
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
