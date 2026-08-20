import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { assertNotQaBooking } from "../_shared/qaIsolation.ts";
import { getStripeSecretKey, modeForRecord, StripeModeError } from "../_shared/stripeMode.ts";
import { computeOrderTotals, resolveServiceCode, resolveServiceCodeStrict } from "../_shared/pricingTax.ts";

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
    // Stripe client is created AFTER we know whether this order is test data —
    // see the runtime key-mode guard below. Nothing may reach Stripe before it.
    let stripe: Stripe;
    let stripeMode: "live" | "test" = "live";

    // IMPORTANT: We no longer accept cardNumber, expiry, or cvc from the client.
    // Card data is collected securely via Stripe Elements on the client side.
    const { amount, customerEmail, bookingDetails, isLiveMode, unservedOrderId, paymentLinkToken, bookingSessionId, bookingGroupId: bookingGroupIdIn } = await req.json();

    // Validate minimum amount ($20 = 2000 cents)
    const minimumAmount = 2000;
    if (amount < minimumAmount) {
      return new Response(
        JSON.stringify({ error: `Minimum payment amount is $20.00. Current amount: $${(amount / 100).toFixed(2)}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── HARD CONTACT GUARD ──
    // Refuse to create a PaymentIntent without an email + a 10-digit phone.
    // This is the last line of defense for guest, logged-in, recovery, and
    // payment-link flows so an awaiting_payment booking can never exist
    // without contact info.
    const phoneDigits = String(bookingDetails?.clientPhone || "").replace(/\D/g, "").replace(/^1/, "");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || !emailRegex.test(String(customerEmail).trim())) {
      return new Response(
        JSON.stringify({
          error: "invalid_email",
          message: `The email address "${customerEmail || ""}" is not valid. Please enter a complete email (e.g. name@example.com).`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (phoneDigits.length !== 10) {
      return new Response(
        JSON.stringify({ error: "missing_phone", message: "A valid 10-digit Canadian phone number is required before payment." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RUNTIME KEY-MODE GUARD (test / live isolation) ──
    // A booking flagged is_test_data may ONLY be charged with the sk_test_ key,
    // and a real booking ONLY with the live key. If the required credential is
    // missing the request is refused — there is no fallback in either
    // direction, so QA traffic can never touch a live customer's card.
    try {
      const supaUrlG = Deno.env.get("SUPABASE_URL");
      const supaKeyG = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const bookingIdG = bookingDetails?.bookingUuid || null;
      let isTestData = false;

      if (supaUrlG && supaKeyG) {
        const { createClient: ccG } = await import("npm:@supabase/supabase-js@2");
        const admin = ccG(supaUrlG, supaKeyG);
        if (bookingGroupIdIn) {
          const { data: gv } = await admin
            .from("bookings")
            .select("is_test_data")
            .eq("booking_group_id", bookingGroupIdIn)
            .limit(1)
            .maybeSingle();
          isTestData = gv?.is_test_data === true;
        } else if (bookingIdG) {
          const { data: bv } = await admin
            .from("bookings")
            .select("is_test_data")
            .eq("id", bookingIdG)
            .maybeSingle();
          isTestData = bv?.is_test_data === true;
          // Legacy QA accounts stay hard-blocked from Stripe entirely.
          if (!isTestData) await assertNotQaBooking(admin, bookingIdG, "create-payment-intent");
        }
      }

      stripeMode = modeForRecord(isTestData);
      const stripeSecretKey = getStripeSecretKey(stripeMode);
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
        httpClient: Stripe.createFetchHttpClient(),
      });
      console.log(`[create-payment-intent] stripe mode=${stripeMode}`);
    } catch (modeErr) {
      if (modeErr instanceof StripeModeError) {
        console.error("❌ stripe key-mode guard:", modeErr.code, modeErr.message);
        return new Response(
          JSON.stringify({ error: modeErr.code, message: modeErr.message }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "qa_test_booking", message: "QA test bookings cannot create payments." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SERVER-AUTHORITATIVE AMOUNT ──
    // The browser-supplied `amount` is a hint only. When the booking row
    // exists, the DB total (which already includes HST, surge and any
    // admin-entered parking fee) is the single source of truth for what we
    // charge. This closes the tampering hole and guarantees parking fees are
    // actually collected.
    let chargeAmount = amount;
    try {
      const supaUrlA = Deno.env.get("SUPABASE_URL");
      const supaKeyA = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const bookingIdA = bookingDetails?.bookingUuid || null;
      if (supaUrlA && supaKeyA && bookingIdA) {
        const { createClient: ccA } = await import("npm:@supabase/supabase-js@2");
        const { data: bRow } = await ccA(supaUrlA, supaKeyA)
          .from("bookings")
          .select("total, subtotal, surge_amount, hst_amount, parking_fee, service_type, payment_status")
          .eq("id", bookingIdA)
          .maybeSingle();

        // ── FROZEN-TOTAL INTEGRITY CHECK ──
        // Recompute the order with the authoritative tax engine. If the stored
        // total does not equal subtotal + surge + HST + parking we refuse the
        // checkout BEFORE contacting Stripe rather than charging a wrong amount.
        if (bRow) {
          // STRICT: refuse to charge an order whose service type is unknown.
          try {
            resolveServiceCodeStrict(bRow.service_type);
          } catch (_e) {
            console.error("❌ unsupported_service_type on booking", bookingIdA, bRow.service_type);
            return new Response(
              JSON.stringify({ error: "unsupported_service_type", message: "This order has an unrecognised service type and cannot be charged." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const preTax =
            Math.round((Number(bRow.subtotal ?? 0) + Number(bRow.surge_amount ?? 0)) * 100) / 100;
          const expected = computeOrderTotals({
            subtotal: preTax,
            parking: bRow.parking_fee,
            service: resolveServiceCode(bRow.service_type),
          });
          const storedCents = Math.round(Number(bRow.total ?? 0) * 100);
          const storedHstCents = Math.round(Number(bRow.hst_amount ?? 0) * 100);
          const storedPartsCents =
            Math.round(Number(bRow.subtotal ?? 0) * 100) +
            Math.round(Number(bRow.surge_amount ?? 0) * 100) +
            storedHstCents +
            Math.round(Number(bRow.parking_fee ?? 0) * 100);

          // Two independent failure modes, both blocked before Stripe:
          //  1. taxable service stored with zero HST (the defect being repaired)
          //  2. stored total under-runs its own component lines by > 1¢
          const missingTax = expected.hstCents > 0 && storedHstCents === 0;
          const underRuns = storedCents < storedPartsCents - 1;
          if (missingTax || underRuns) {
            console.error(
              "❌ Tax integrity failure —",
              JSON.stringify({ bookingIdA, storedCents, expected })
            );
            return new Response(
              JSON.stringify({
                error: "tax_mismatch",
                message:
                  "This order's total does not match the authoritative tax calculation. Checkout blocked — please re-open the order so the total can be recalculated.",
                storedCents,
                expectedCents: expected.totalCents,
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        const dbTotalCents = Math.round(Number(bRow?.total ?? 0) * 100);
        if (dbTotalCents >= 2000) {
          if (dbTotalCents !== amount) {
            console.warn(
              `⚠️ Amount override — client sent ${amount}¢, DB total is ${dbTotalCents}¢ (parking ${bRow?.parking_fee ?? 0}). Charging DB total.`
            );
          }
          chargeAmount = dbTotalCents;
        }
      }
    } catch (amtErr) {
      console.warn("Server amount lookup failed, using client amount:", amtErr);
    }

    // ── MULTI-DAY GROUP AMOUNT ──
    // When a bookingGroupId is supplied the group total (sum of every visit,
    // parking included) is the authoritative amount for the single charge.
    const bookingGroupId = bookingDetails?.bookingGroupId || bookingGroupIdIn || null;
    let groupCode = "";
    if (bookingGroupId) {
      try {
        const supaUrlG2 = Deno.env.get("SUPABASE_URL");
        const supaKeyG2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supaUrlG2 && supaKeyG2) {
          const { createClient: ccG2 } = await import("npm:@supabase/supabase-js@2");
          const { data: gRow } = await ccG2(supaUrlG2, supaKeyG2)
            .from("booking_groups")
            .select("total, group_code, visit_count")
            .eq("id", bookingGroupId)
            .maybeSingle();
          const groupCents = Math.round(Number(gRow?.total ?? 0) * 100);
          if (groupCents >= 2000) {
            if (groupCents !== chargeAmount) {
              console.warn(`⚠️ Group amount override — client sent ${chargeAmount}\u00a2, group total is ${groupCents}\u00a2 (${gRow?.visit_count} visits).`);
            }
            chargeAmount = groupCents;
            groupCode = gRow?.group_code || "";
          }
        }
      } catch (gErr) {
        console.warn("Group amount lookup failed:", gErr);
      }
    }



    // If NOT in live mode, still create a real test-mode intent (using test key)
    // This way Stripe Elements can still confirm the payment properly
    if (isLiveMode && stripeMode !== "live") {
      console.error("❌ LIVE MODE requested for a test-data order");
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

    // ── DUPLICATE-CHARGE GUARD ──
    // If THIS booking (same booking id / group / checkout session) already has
    // a SUCCEEDED PaymentIntent in the last 2 hours, refuse to create another
    // one. Scoped by booking identity so a legitimate second booking for the
    // same amount is never blocked.
    const dupKeys = [
      bookingDetails?.bookingUuid,
      bookingDetails?.bookingCode || bookingDetails?.bookingId,
      bookingGroupIdIn || bookingDetails?.bookingGroupId,
      bookingSessionId,
    ].filter((v) => typeof v === "string" && v.length > 0) as string[];

    if (customerId && dupKeys.length > 0) {
      try {
        const dupWindow = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
        const recent = await stripe.paymentIntents.list({ customer: customerId, limit: 10 });
        const dup = recent.data.find((pi: any) => {
          if (pi.status !== "succeeded" || pi.created < dupWindow) return false;
          const md = pi.metadata || {};
          const identity = [md.booking_id, md.booking_code, md.booking_group_id, md.booking_session_id]
            .filter((v: string) => typeof v === "string" && v.length > 0);
          return identity.some((v: string) => dupKeys.includes(v));
        });
        if (dup) {
          console.warn("🛑 Duplicate charge blocked — this booking is already paid:", dup.id);
          return new Response(
            JSON.stringify({
              error: "already_paid",
              message:
                "This booking has already been paid in the last 2 hours. We did not charge you again — please contact us if your booking is not confirmed.",
              paymentIntentId: dup.id,
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } catch (dupErr) {
        console.warn("Duplicate-charge check failed (continuing):", dupErr);
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
        // Only reuse when amount AND customer match — otherwise the admin
        // edited the order (different price/client) and we must create a new
        // PaymentIntent so the new amount is actually charged.
        const sameAmount = found && found.amount === chargeAmount;
        const sameCustomer = found && (!customerId || found.customer === customerId);
        if (found && !["canceled", "succeeded"].includes(found.status) && sameAmount && sameCustomer) {
          console.log("♻️  Reusing existing PaymentIntent for session:", bookingSessionId, found.id);
          return new Response(
            JSON.stringify({
              clientSecret: found.client_secret,
              paymentIntentId: found.id,
              isLive: stripeMode === "live",
              reused: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Stale PI for this session with different params — cancel it so we
        // don't leave an orphan and so the admin's new amount is the source of truth.
        if (found && !["canceled", "succeeded"].includes(found.status) && (!sameAmount || !sameCustomer)) {
          try {
            await stripe.paymentIntents.cancel(found.id);
            console.log("🗑️  Cancelled stale PI", found.id, "(amount/customer changed)");
          } catch (cancelErr) {
            console.warn("Could not cancel stale PI:", cancelErr);
          }
        }
      } catch (searchErr) {
        // Search may not be enabled on all accounts; fall through to create.
        console.warn("PaymentIntent search failed (continuing to create):", searchErr);
      }
    }

    // Create payment intent - card data will be collected by Stripe Elements
    // setup_future_usage enables saving the payment method for off-session charges (e.g. overtime)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: chargeAmount,
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
        amount_cents: String(chargeAmount ?? ""),
        mode: isLiveMode ? "live" : "test",
        unserved_order_id: unservedOrderId || "",
        payment_link_token: paymentLinkToken || "",
        booking_group_id: bookingGroupId || "",
        booking_group_code: groupCode,
      },
      description: `PSW Direct - Care Service Booking${bookingDetails?.serviceDate ? ` for ${bookingDetails.serviceDate}` : ""}`,
    }, await (async () => {
      if (!bookingSessionId) return undefined;
      // Hash the request params so any change in amount/customer/booking
      // produces a fresh idempotency key (Stripe rejects key reuse with
      // different params). Same session + same params → still dedupes.
      const paramsFingerprint = JSON.stringify({
        amount: chargeAmount,
        customerId,
        customerEmail,
        bookingUuid: bookingDetails?.bookingUuid || "",
        bookingCode: bookingDetails?.bookingCode || bookingDetails?.bookingId || "",
        serviceDate: bookingDetails?.serviceDate || "",
        serviceType: bookingDetails?.serviceType || "",
        unservedOrderId: unservedOrderId || "",
        paymentLinkToken: paymentLinkToken || "",
        bookingGroupId: bookingGroupId || "",
      });
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(paramsFingerprint));
      const hash = Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
      return { idempotencyKey: `pi_create_${bookingSessionId}_${hash}` };
    })());

    console.log("✅ Payment intent created:", paymentIntent.id, "Mode:", isLiveMode ? "LIVE" : "TEST");

    // ── Stamp the PaymentIntent onto the multi-day group and all its visits ──
    if (bookingGroupId) {
      try {
        const supaUrlL = Deno.env.get("SUPABASE_URL");
        const supaKeyL = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supaUrlL && supaKeyL) {
          const { createClient: ccL } = await import("npm:@supabase/supabase-js@2");
          const supaL = ccL(supaUrlL, supaKeyL);
          await supaL.from("booking_groups")
            .update({ stripe_payment_intent_id: paymentIntent.id, stripe_customer_id: customerId || null })
            .eq("id", bookingGroupId);
          await supaL.from("bookings")
            .update({ stripe_payment_intent_id: paymentIntent.id })
            .eq("booking_group_id", bookingGroupId);
        }
      } catch (glErr) {
        console.warn("Group PI link failed:", glErr);
      }
    }

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
        isLive: stripeMode === "live",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Payment intent creation error:", error);
    // Surface Stripe email validation errors as 400 with a clear message
    if (error?.code === "email_invalid" || error?.raw?.code === "email_invalid") {
      return new Response(
        JSON.stringify({
          error: "invalid_email",
          message: "The email address provided is not valid. Please enter a complete email like name@example.com.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
