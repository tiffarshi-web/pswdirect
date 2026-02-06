import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Known test card numbers that must be REJECTED in live mode
const TEST_CARD_NUMBERS = [
  "4242424242424242", // Visa test
  "4000056655665556", // Visa debit test
  "5555555555554444", // Mastercard test
  "5200828282828210", // Mastercard debit test
  "378282246310005",  // Amex test
  "371449635398431",  // Amex test
  "6011111111111117", // Discover test
  "3056930009020004", // Diners test
  "3566002020360505", // JCB test
  "6200000000000005", // UnionPay test
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    // CRITICAL: Check if Stripe is properly configured
    if (!stripeSecretKey) {
      console.error("❌ STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "System Configuration Error: Payment processing is not available. Please contact support." 
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate key format - detect test vs live keys
    const isLiveKey = stripeSecretKey.startsWith("sk_live_");
    const isTestKey = stripeSecretKey.startsWith("sk_test_");
    
    if (!isLiveKey && !isTestKey) {
      console.error("❌ Invalid STRIPE_SECRET_KEY format");
      return new Response(
        JSON.stringify({ 
          error: "System Configuration Error: Invalid payment configuration. Please contact support." 
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { amount, customerEmail, bookingDetails, isLiveMode, cardNumber } = await req.json();

    // Validate minimum amount ($20 = 2000 cents)
    const minimumAmount = 2000; // $20.00 in cents
    if (amount < minimumAmount) {
      return new Response(
        JSON.stringify({ 
          error: `Minimum payment amount is $20.00. Current amount: $${(amount / 100).toFixed(2)}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // LIVE MODE ENFORCEMENT: Reject test cards when in live mode
    if (isLiveMode && cardNumber && TEST_CARD_NUMBERS.includes(cardNumber)) {
      console.log("🚫 LIVE MODE: Rejecting test card number");
      return new Response(
        JSON.stringify({ 
          error: "Test cards are not accepted in live mode. Please use a real card." 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // If NOT in live mode (test mode), simulate success
    if (!isLiveMode) {
      console.log("🧪 TEST MODE: Simulating payment intent creation", { amount, customerEmail, bookingDetails });
      return new Response(
        JSON.stringify({
          clientSecret: "pi_test_" + Date.now() + "_secret_test",
          paymentIntentId: "pi_test_" + Date.now(),
          isTestMode: true,
          message: "Test mode - no real charge created"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // LIVE MODE: Ensure we have a live key
    if (isLiveMode && !isLiveKey) {
      console.error("❌ LIVE MODE requested but only TEST key configured");
      return new Response(
        JSON.stringify({ 
          error: "System Configuration Error: Live payment mode requires live API keys. Please contact support." 
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create or retrieve customer
    let customerId: string | undefined;
    if (customerEmail) {
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: customerEmail,
          metadata: {
            source: "PSW Direct Booking",
          },
        });
        customerId = customer.id;
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "cad",
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bookingId: bookingDetails?.bookingId || "",
        serviceDate: bookingDetails?.serviceDate || "",
        services: bookingDetails?.services || "",
        clientName: bookingDetails?.clientName || "",
        mode: isLiveMode ? "live" : "test",
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
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
