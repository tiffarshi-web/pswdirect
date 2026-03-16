// Edge function: Move unclaimed pending bookings to unserved_orders after 2 hours
// Called by pg_cron every 10 minutes

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
      .select("id, booking_code, client_name, client_email, client_phone, client_postal_code, patient_postal_code, patient_address, service_type, scheduled_date, start_time, end_time, created_at, total, preferred_languages, preferred_gender")
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

    if (!staleBookings || staleBookings.length === 0) {
      return new Response(JSON.stringify({ expired: 0, message: "No stale bookings found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let expiredCount = 0;

    for (const booking of staleBookings) {
      // Insert into unserved_orders
      const { error: insertError } = await supabase.from("unserved_orders").insert({
        booking_id: booking.id,
        client_name: booking.client_name,
        client_email: booking.client_email,
        client_phone: booking.client_phone,
        postal_code_raw: booking.patient_postal_code || booking.client_postal_code,
        service_type: (booking.service_type || []).join(", "),
        requested_start_time: booking.scheduled_date && booking.start_time
          ? `${booking.scheduled_date}T${booking.start_time}`
          : null,
        reason: "UNCLAIMED_EXPIRED",
        notes: `Booking ${booking.booking_code} unclaimed after 2 hours. Created at ${booking.created_at}.`,
        psw_count_found: 0,
        radius_checked_km: 0,
        status: "PENDING",
        pending_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      if (insertError) {
        console.error(`Error inserting unserved order for ${booking.booking_code}:`, insertError);
        continue;
      }

      // Update booking status to unserved (NOT cancelled — admin can still assign manually)
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "unserved" })
        .eq("id", booking.id)
        .eq("status", "pending") // Safety: only move if still pending
        .is("psw_assigned", null); // Safety: don't move if just claimed

      if (updateError) {
        console.error(`Error cancelling booking ${booking.booking_code}:`, updateError);
        continue;
      }

      console.log(`Expired unclaimed booking: ${booking.booking_code}`);
      expiredCount++;
    }

    return new Response(
      JSON.stringify({ expired: expiredCount, checked: staleBookings.length }),
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
