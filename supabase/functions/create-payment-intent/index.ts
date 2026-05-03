import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter (per-isolate; resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
    const { amount, customerEmail, bookingDetails, isLiveMode, unservedOrderId, paymentLinkToken, bookingSessionId } = await req.json();

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

    // Idempotency: if a bookingSessionId is provided, look up any existing
    // PaymentIntent created with that session id and return it instead of
    // creating a duplicate. Protects against double-click submits and
    // refresh-then-retry from generating multiple charges.
    if (bookingSessionId && typeof bookingSessionId === "string") {
      try {
        const existing = await stripe.paymentIntents.search({
          query: `metadata['booking_session_id']:'${bookingSessionId.replace(/'/g, "")}'`,
          limit: 1,
        });
        const found = existing.data?.[0];
        if (found && !["canceled", "succeeded"].includes(found.status)) {
          console.log("♻️  Reusing existing PaymentIntent for session:", bookingSessionId, found.id);
          return new Response(
            JSON.stringify({
              clientSecret: found.client_secret,
              paymentIntentId: found.id,
              isLive: isLiveKey,
              reused: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (searchErr) {
        // Search may not be enabled on all accounts; fall through to create.
        console.warn("PaymentIntent search failed (continuing to create):", searchErr);
      }
    }

    // Create payment intent - card data will be collected by Stripe Elements
    // setup_future_usage enables saving the payment method for off-session charges (e.g. overtime)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "cad",
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      setup_future_usage: "off_session",
      metadata: {
        booking_id: bookingDetails?.bookingUuid || bookingDetails?.bookingId || "",
        booking_code: bookingDetails?.bookingCode || bookingDetails?.bookingId || "",
        booking_session_id: bookingSessionId || "",
        serviceDate: bookingDetails?.serviceDate || "",
        serviceTime: bookingDetails?.serviceTime || bookingDetails?.startTime || "",
        serviceType: Array.isArray(bookingDetails?.serviceType)
          ? bookingDetails.serviceType.join(",")
          : (bookingDetails?.serviceType || ""),
        services: bookingDetails?.services || "",
        clientName: bookingDetails?.clientName || "",
        clientEmail: customerEmail || "",
        clientPhone: bookingDetails?.clientPhone || "",
        amount_cents: String(amount ?? ""),
        mode: isLiveMode ? "live" : "test",
        unserved_order_id: unservedOrderId || "",
        payment_link_token: paymentLinkToken || "",
      },
      description: `PSW Direct - Care Service Booking${bookingDetails?.serviceDate ? ` for ${bookingDetails.serviceDate}` : ""}`,
    }, bookingSessionId ? { idempotencyKey: `pi_create_${bookingSessionId}` } : undefined);

    console.log("✅ Payment intent created:", paymentIntent.id, "Mode:", isLiveMode ? "LIVE" : "TEST");

    // ── Bidirectional link: stamp the PaymentIntent id onto the booking row.
    // If no booking row exists yet (frontend skipped the draft step), create a
    // recovery placeholder so admins still see the attempt in Incomplete Payments.
    try {
      const supaUrl = Deno.env.get("SUPABASE_URL");
      const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supaUrl && supaKey) {
        const { createClient } = await import("npm:@supabase/supabase-js@2");
        const supa = createClient(supaUrl, supaKey);
        const bookingUuid = bookingDetails?.bookingUuid || "";
        const bookingCode = bookingDetails?.bookingCode || bookingDetails?.bookingId || "";

        let linked = false;
        if (bookingUuid || bookingCode) {
          const q = supa.from("bookings").update({
            stripe_payment_intent_id: paymentIntent.id,
            updated_at: new Date().toISOString(),
          });
          const { data, error: linkErr } = bookingUuid
            ? await q.eq("id", bookingUuid).select("id")
            : await q.eq("booking_code", bookingCode).select("id");
          if (linkErr) {
            console.warn("⚠️ Could not link PI to booking:", linkErr.message);
          } else if (data && data.length > 0) {
            linked = true;
            console.log("🔗 Linked PI", paymentIntent.id, "→ booking", bookingUuid || bookingCode);
          }
        }

        if (!linked) {
          // No matching booking — auto-create a recovery placeholder so the
          // payment attempt is never invisible.
          const { data: recId, error: recErr } = await supa.rpc("create_recovery_booking_from_pi", {
            p_payment_intent_id: paymentIntent.id,
            p_amount: amount / 100,
            p_client_email: customerEmail || "",
            p_client_name: bookingDetails?.clientName || null,
            p_client_phone: bookingDetails?.clientPhone || null,
            p_service_type: Array.isArray(bookingDetails?.serviceType)
              ? bookingDetails.serviceType.join(",")
              : (bookingDetails?.serviceType || null),
            p_service_date: bookingDetails?.serviceDate || null,
            p_service_time: bookingDetails?.serviceTime || null,
            p_payment_status: "awaiting_payment",
            p_status: "awaiting_payment",
            p_source: "create_payment_intent_no_draft",
          });
          if (recErr) console.warn("⚠️ Recovery booking RPC failed:", recErr.message);
          else console.log("🩺 Recovery booking created:", recId, "for PI", paymentIntent.id);
        }
      }
    } catch (linkEx) {
      console.warn("⚠️ Bidirectional link/recovery exception (non-fatal):", linkEx);
    }

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
