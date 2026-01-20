import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { amount, customerEmail, bookingDetails, isDryRun } = await req.json();

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

    // If dry run mode, return mock success
    if (isDryRun) {
      console.log("🧪 DRY RUN: Simulating payment intent creation", { amount, customerEmail, bookingDetails });
      return new Response(
        JSON.stringify({
          clientSecret: "pi_dry_run_" + Date.now() + "_secret_test",
          paymentIntentId: "pi_dry_run_" + Date.now(),
          isDryRun: true,
          message: "Dry run mode - no real charge created"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      },
      description: `PSW Direct - Care Service Booking${bookingDetails?.serviceDate ? ` for ${bookingDetails.serviceDate}` : ""}`,
    });

    console.log("✅ Payment intent created:", paymentIntent.id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
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
