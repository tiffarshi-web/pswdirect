// Admin-triggered "Send Payment Link" recovery flow.
// Creates a Stripe Checkout Session tied to the EXISTING booking and emails
// the secure link to the client. Does NOT create a new booking.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes between sends

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ error: "Stripe not configured" }, 503);
    }

    // ── AuthN/AuthZ: must be admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || serviceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const adminEmail = userData.user.email || "";

    const supa = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await supa.rpc("is_admin");
    // Fallback: is_admin() relies on JWT; re-check using user client for accuracy
    const { data: isAdminUser } = await userClient.rpc("is_admin");
    if (!isAdmin && !isAdminUser) {
      return json({ error: "Forbidden: admin only" }, 403);
    }

    const { booking_id } = await req.json();
    if (!booking_id || typeof booking_id !== "string") {
      return json({ error: "booking_id required" }, 400);
    }

    // ── Load booking
    const { data: b, error: bErr } = await supa
      .from("bookings")
      .select(
        "id, booking_code, client_name, client_email, client_phone, total, scheduled_date, start_time, service_type, status, payment_status, payment_link_sent_at, stripe_payment_intent_id"
      )
      .eq("id", booking_id)
      .maybeSingle();
    if (bErr || !b) return json({ error: "Booking not found" }, 404);

    if (b.payment_status === "paid") {
      return json({ error: "Booking already paid" }, 409);
    }
    if (!b.client_email) {
      return json({ error: "Booking has no client email" }, 400);
    }
    if (!b.total || Number(b.total) < 20) {
      return json({ error: "Booking total too small for Stripe" }, 400);
    }

    // ── Cooldown
    if (b.payment_link_sent_at) {
      const last = new Date(b.payment_link_sent_at).getTime();
      if (Date.now() - last < COOLDOWN_MS) {
        const remain = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
        return json({ error: `Please wait ${remain}s before resending` }, 429);
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const origin = req.headers.get("origin") || "https://pswdirect.ca";
    const successUrl = `${origin}/order-confirmation?booking=${b.booking_code}&recovered=1`;
    const cancelUrl = `${origin}/?recovery_cancelled=${b.booking_code}`;

    const serviceLabel = Array.isArray(b.service_type)
      ? b.service_type.join(", ")
      : (b.service_type || "PSW Care Service");
    const amountCents = Math.round(Number(b.total) * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: b.client_email,
      line_items: [
        {
          price_data: {
            currency: "cad",
            unit_amount: amountCents,
            product_data: {
              name: `PSW Direct — ${serviceLabel}`,
              description: `Booking ${b.booking_code}${b.scheduled_date ? ` · ${b.scheduled_date}${b.start_time ? ` @ ${b.start_time}` : ""}` : ""}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: {
          booking_id: b.id,
          booking_code: b.booking_code || "",
          clientEmail: b.client_email,
          clientName: b.client_name || "",
          clientPhone: b.client_phone || "",
          serviceDate: b.scheduled_date || "",
          serviceTime: b.start_time || "",
          serviceType: serviceLabel,
          amount_cents: String(amountCents),
          recovery_link: "true",
          sent_by: adminEmail,
        },
      },
      metadata: {
        booking_id: b.id,
        booking_code: b.booking_code || "",
        recovery_link: "true",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 23, // ~23h
    });

    // ── Update booking with link tracking
    const nowIso = new Date().toISOString();
    await supa
      .from("bookings")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_checkout_url: session.url,
        payment_link_sent_at: nowIso,
        payment_link_sent_by: adminEmail,
        payment_link_send_count: ((b as any).payment_link_send_count ?? 0) + 1,
        updated_at: nowIso,
      } as any)
      .eq("id", b.id);

    // ── Email the client via existing send-email function
    const subject = "Complete Your PSW Direct Booking";
    const dateLine = b.scheduled_date
      ? `<p><strong>When:</strong> ${b.scheduled_date}${b.start_time ? ` at ${b.start_time}` : ""}</p>`
      : "";
    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 12px">Complete your booking</h2>
        <p>Hi ${escapeHtml(b.client_name || "there")},</p>
        <p>Your PSW Direct booking <strong>${b.booking_code}</strong> is reserved but the payment didn't finish. Please complete it using the secure link below to confirm your care.</p>
        <p><strong>Service:</strong> ${escapeHtml(serviceLabel)}</p>
        ${dateLine}
        <p><strong>Total:</strong> $${Number(b.total).toFixed(2)} CAD</p>
        <p style="margin:24px 0">
          <a href="${session.url}" style="background:#0ea5e9;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Complete Payment</a>
        </p>
        <p style="font-size:12px;color:#64748b">This payment link is valid for 24 hours. If you didn't request this, you can ignore the email.</p>
        <p style="font-size:12px;color:#64748b">Need help? Reply to this email or call (249) 288-4787.</p>
      </div>`;
    const textBody = `Complete your PSW Direct booking ${b.booking_code}.\nTotal: $${Number(b.total).toFixed(2)} CAD\nPay securely: ${session.url}\n`;

    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          to: b.client_email,
          subject,
          body: textBody,
          htmlBody: html,
        }),
      });
    } catch (e) {
      console.warn("send-email failed (link still saved):", e);
    }

    return json({
      success: true,
      checkout_url: session.url,
      checkout_session_id: session.id,
      booking_id: b.id,
    });
  } catch (e: any) {
    console.error("send-payment-link error:", e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}
