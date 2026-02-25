import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
      hours,
      hourly_rate,
      subtotal,
      surge_amount,
      total,
      service_type,
      payment_status,
      stripe_payment_intent_id,
      is_asap,
      is_transport_booking,
      pickup_address,
      pickup_postal_code,
      special_notes,
      dropoff_address,
    } = body;

    // Validate required fields
    if (!client_email || !client_name || !scheduled_date || !start_time || !end_time || !service_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: client_email, client_name, scheduled_date, start_time, end_time, service_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        hours,
        hourly_rate,
        subtotal,
        surge_amount: surge_amount || 0,
        total,
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
        psw_assigned: null,
        psw_first_name: null,
      })
      .select("id, booking_code, created_at, scheduled_date, start_time, end_time, total, status, payment_status, service_type, client_name, client_email")
      .single();

    if (error) {
      console.error("❌ Booking insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
