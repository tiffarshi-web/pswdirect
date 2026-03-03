import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey) {
      console.error("❌ STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "System Configuration Error: Payment processing is not available. Please contact support." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isLiveKey = stripeSecretKey.startsWith("sk_live_");
    const isTestKey = stripeSecretKey.startsWith("sk_test_");
    
    if (!isLiveKey && !isTestKey) {
      console.error("❌ Invalid STRIPE_SECRET_KEY format");
      return new Response(
        JSON.stringify({ error: "System Configuration Error: Invalid payment configuration." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // IMPORTANT: We no longer accept cardNumber, expiry, or cvc from the client.
    // Card data is collected securely via Stripe Elements on the client side.
    const { amount, customerEmail, bookingDetails, isLiveMode, unservedOrderId, paymentLinkToken } = await req.json();

    // Validate minimum amount ($20 = 2000 cents)
    const minimumAmount = 2000;
    if (amount < minimumAmount) {
      return new Response(
        JSON.stringify({ error: `Minimum payment amount is $20.00. Current amount: $${(amount / 100).toFixed(2)}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If NOT in live mode, still create a real test-mode intent (using test key)
    // This way Stripe Elements can still confirm the payment properly
    if (isLiveMode && !isLiveKey) {
      console.error("❌ LIVE MODE requested but only TEST key configured");
      return new Response(
        JSON.stringify({ error: "System Configuration Error: Live payment mode requires live API keys." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or retrieve customer
    let customerId: string | undefined;
    if (customerEmail) {
      const existingCustomers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: customerEmail,
          metadata: { source: "PSW Direct Booking" },
        });
        customerId = customer.id;
      }
    }

    // Create payment intent - card data will be collected by Stripe Elements
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "cad",
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        booking_id: bookingDetails?.bookingUuid || bookingDetails?.bookingId || "",
        booking_code: bookingDetails?.bookingCode || bookingDetails?.bookingId || "",
        serviceDate: bookingDetails?.serviceDate || "",
        services: bookingDetails?.services || "",
        clientName: bookingDetails?.clientName || "",
        mode: isLiveMode ? "live" : "test",
        unserved_order_id: unservedOrderId || "",
        payment_link_token: paymentLinkToken || "",
      },
      description: `PSW Direct - Care Service Booking${bookingDetails?.serviceDate ? ` for ${bookingDetails.serviceDate}` : ""}`,
    });

    console.log("✅ Payment intent created:", paymentIntent.id, "Mode:", isLiveMode ? "LIVE" : "TEST");

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        isLive: isLiveKey,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Payment intent creation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
