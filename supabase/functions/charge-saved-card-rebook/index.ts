// One-click rebook: copies a previous booking, creates a new draft via
// create-booking, and immediately confirms an off-session PaymentIntent
// using the client's saved Stripe customer + payment method.
//
// Auth: requires the caller's JWT (the booking is matched by client_email
// from auth.users). No card data is accepted from the client.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RebookPayload {
  source_booking_id?: string; // UUID
  source_booking_code?: string; // CDT-XXXXXX
  scheduled_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  hours: number;
}

function computeEndTime(start: string, hours: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecret) {
      return new Response(
        JSON.stringify({ error: "Payment processing is not configured." }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Identify caller via JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResult, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userResult?.user?.email) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerEmail = userResult.user.email.toLowerCase();

    const body = (await req.json()) as RebookPayload;
    if (!body?.scheduled_date || !body?.start_time || !body?.hours) {
      return new Response(
        JSON.stringify({ error: "Missing date, time, or duration." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Look up the source booking — must belong to caller
    let query = admin
      .from("bookings")
      .select("*")
      .eq("client_email", callerEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    if (body.source_booking_id) {
      query = admin
        .from("bookings")
        .select("*")
        .eq("id", body.source_booking_id)
        .eq("client_email", callerEmail)
        .limit(1);
    } else if (body.source_booking_code) {
      query = admin
        .from("bookings")
        .select("*")
        .eq("booking_code", body.source_booking_code)
        .eq("client_email", callerEmail)
        .limit(1);
    }

    const { data: rows, error: srcErr } = await query;
    if (srcErr || !rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Source booking not found." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const src = rows[0] as any;

    if (!src.stripe_customer_id || !src.stripe_payment_method_id) {
      return new Response(
        JSON.stringify({
          error: "No saved payment method available for one-click rebook.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build payload for create-booking — reuse pricing from source.
    const hourly = Number(src.hourly_rate) || 35;
    const subtotal = +(hourly * body.hours).toFixed(2);
    const total = subtotal; // surge/HST recomputed by webhook/server-authoritative pricing if needed

    const endTime = computeEndTime(body.start_time, body.hours);

    const { data: created, error: createErr } = await admin.functions.invoke(
      "create-booking",
      {
        body: {
          user_id: src.user_id,
          client_name: src.client_name,
          client_first_name: src.client_first_name,
          client_last_name: src.client_last_name,
          client_email: src.client_email,
          client_phone: src.client_phone,
          client_address: src.client_address,
          client_postal_code: src.client_postal_code,
          patient_name: src.patient_name,
          patient_first_name: src.patient_first_name,
          patient_last_name: src.patient_last_name,
          patient_address: src.patient_address,
          patient_postal_code: src.patient_postal_code,
          patient_relationship: src.patient_relationship,
          preferred_gender: src.preferred_gender,
          preferred_languages: src.preferred_languages,
          scheduled_date: body.scheduled_date,
          start_time: body.start_time,
          end_time: endTime,
          hours: body.hours,
          hourly_rate: hourly,
          subtotal,
          surge_amount: 0,
          total,
          service_type: src.service_type,
          payment_status: "awaiting_payment",
          stripe_payment_intent_id: null,
          is_asap: false,
          is_transport_booking: src.is_transport_booking || false,
          pickup_address: src.pickup_address,
          pickup_postal_code: src.pickup_postal_code,
          special_notes: src.special_notes,
          care_conditions: src.care_conditions || [],
          care_conditions_other: src.care_conditions_other,
          street_number: src.street_number,
          street_name: src.street_name,
        },
      },
    );

    if (createErr || (created as any)?.error) {
      const msg =
        (createErr as any)?.message ||
        (created as any)?.error ||
        "Could not create rebooking.";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bookingUuid = (created as any).booking_id as string;
    const bookingCode = (created as any).booking_code as string;
    const finalTotal = Number((created as any).total) || total;
    const amountCents = Math.round(finalTotal * 100);

    // Off-session confirm against the saved card.
    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: "cad",
          customer: src.stripe_customer_id,
          payment_method: src.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          setup_future_usage: "off_session",
          description: `PSW Direct - One-click rebook for ${body.scheduled_date}`,
          metadata: {
            booking_id: bookingUuid,
            booking_code: bookingCode,
            rebook_source_booking_id: src.id,
            one_click: "true",
          },
        },
        { idempotencyKey: `rebook_${bookingUuid}` },
      );
    } catch (stripeErr: any) {
      // Card requires authentication or was declined — surface to client so it
      // can fall back to the multi-step flow with the Stripe Elements form.
      console.error("❌ Off-session charge failed:", stripeErr?.message);
      // Mark draft as awaiting_payment so it can be reused via the normal flow.
      await admin
        .from("bookings")
        .update({
          stripe_payment_intent_id: stripeErr?.payment_intent?.id ?? null,
        })
        .eq("id", bookingUuid);

      return new Response(
        JSON.stringify({
          error: "saved_card_charge_failed",
          message:
            stripeErr?.message ||
            "Your saved card requires re-confirmation. Please complete payment.",
          booking_id: bookingUuid,
          booking_code: bookingCode,
          requires_action: stripeErr?.code === "authentication_required",
          payment_intent_id: stripeErr?.payment_intent?.id ?? null,
          client_secret: stripeErr?.payment_intent?.client_secret ?? null,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Stamp the PI id on the new booking so admins can see linkage immediately.
    // Webhook is authoritative for status promotion → paid + pending.
    await admin
      .from("bookings")
      .update({ stripe_payment_intent_id: intent.id })
      .eq("id", bookingUuid);

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: bookingUuid,
        booking_code: bookingCode,
        payment_intent_id: intent.id,
        payment_status: intent.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("rebook error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
