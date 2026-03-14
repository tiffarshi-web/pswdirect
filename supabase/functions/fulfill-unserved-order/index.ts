import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { paymentLinkToken, paymentIntentId } = await req.json();

    if (!paymentLinkToken || !paymentIntentId) {
      return new Response(
        JSON.stringify({ error: "Missing paymentLinkToken or paymentIntentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the unserved order
    const { data: order, error: fetchError } = await supabase
      .from("unserved_orders")
      .select("*")
      .eq("payment_link_token", paymentLinkToken)
      .single();

    if (fetchError || !order) {
      return new Response(
        JSON.stringify({ error: "Payment link not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.status !== "PAYMENT_SENT") {
      return new Response(
        JSON.stringify({ error: `Cannot fulfill order with status: ${order.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (order.pending_expires_at && new Date(order.pending_expires_at) < new Date()) {
      await supabase.from("unserved_orders").update({ status: "EXPIRED" }).eq("id", order.id);
      return new Response(
        JSON.stringify({ error: "Payment link has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = order.full_client_payload || {};

    // Create booking via the bookings table directly (service role bypasses RLS)
    const bookingInsert: Record<string, any> = {
      client_name: order.client_name || payload.clientName || "Unknown",
      client_email: order.client_email || payload.clientEmail || "",
      client_phone: order.client_phone || payload.clientPhone || null,
      client_address: payload.address || payload.streetAddress || "",
      client_postal_code: order.postal_code_raw || payload.postalCode || null,
      patient_name: payload.patientName || order.client_name || "Unknown",
      patient_address: payload.address || payload.streetAddress || "",
      patient_postal_code: order.postal_code_raw || payload.postalCode || null,
      patient_relationship: payload.patientRelationship || null,
      preferred_gender: payload.preferredGender || null,
      preferred_languages: payload.preferredLanguages || null,
      scheduled_date: payload.serviceDate || new Date().toISOString().split("T")[0],
      start_time: payload.startTime || "09:00",
      end_time: payload.endTime || "10:00",
      hours: payload.hours || 1,
      hourly_rate: payload.hourlyRate || 35,
      subtotal: payload.subtotal || payload.total || 0,
      surge_amount: payload.surgeAmount || 0,
      total: payload.total || 0,
      service_type: payload.serviceType || [order.service_type || "Personal Care"],
      payment_status: "paid",
      status: "pending",
      stripe_payment_intent_id: paymentIntentId,
      psw_assigned: order.assigned_psw_id || null,
      special_notes: payload.specialNotes || order.notes || null,
      is_asap: payload.isAsap || false,
      is_transport_booking: payload.isTransportBooking || false,
      pickup_address: payload.pickupAddress || null,
      pickup_postal_code: payload.pickupPostalCode || null,
      booking_code: "", // Will be assigned by trigger
    };

    // If PSW is assigned, set status to active
    if (order.assigned_psw_id) {
      bookingInsert.status = "active";
      // Get PSW name
      const { data: psw } = await supabase
        .from("psw_profiles")
        .select("first_name, id")
        .eq("id", order.assigned_psw_id)
        .single();
      if (psw) {
        bookingInsert.psw_first_name = psw.first_name;
      }
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert(bookingInsert)
      .select("id, booking_code")
      .single();

    if (bookingError) {
      console.error("❌ Booking creation failed:", bookingError);
      // Still mark payment as received
      await supabase.from("unserved_orders").update({
        status: "PAID",
        payment_intent_id: paymentIntentId,
      }).eq("id", order.id);

      return new Response(
        JSON.stringify({ error: "Payment received but booking creation failed. Contact support.", paymentIntentId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update unserved order to RESOLVED
    await supabase.from("unserved_orders").update({
      status: "RESOLVED",
      payment_intent_id: paymentIntentId,
      booking_id: booking.id,
    }).eq("id", order.id);

    console.log("✅ Unserved order fulfilled:", {
      unservedId: order.id,
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      paymentIntentId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        paymentIntentId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Fulfill error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
