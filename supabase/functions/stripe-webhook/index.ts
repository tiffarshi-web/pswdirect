import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.text();
    let event: any;

    // Parse the webhook event
    // In production, you should verify the Stripe signature
    // For now, we parse directly since webhook signing secret may not be configured yet
    try {
      event = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📨 Stripe webhook event:", event.type, event.id);

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata?.booking_id;
      const bookingCode = paymentIntent.metadata?.booking_code;
      const piId = paymentIntent.id;

      if (!bookingId && !bookingCode) {
        console.warn("⚠️ payment_intent.succeeded with no booking metadata:", piId);
        return new Response(JSON.stringify({ received: true, skipped: "no_booking_metadata" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update booking payment status
      const filter = bookingId ? { id: bookingId } : { booking_code: bookingCode };
      const { data: booking, error: updateError } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          stripe_payment_intent_id: piId,
          updated_at: new Date().toISOString(),
        })
        .match(filter)
        .select("id, booking_code, client_email, client_name, total, subtotal, surge_amount, service_type, scheduled_date, start_time, end_time, hours, stripe_payment_intent_id")
        .single();

      if (updateError) {
        console.error("❌ Error updating booking payment status:", updateError);
      } else {
        console.log("✅ Booking payment confirmed:", booking.booking_code);
      }

      // Check if invoice email was already sent for this booking (prevent duplicates)
      if (booking) {
        const { data: existingEmail } = await supabase
          .from("email_history")
          .select("id")
          .eq("template_key", "psa-client-invoice")
          .eq("to_email", booking.client_email)
          .ilike("subject", `%${booking.booking_code}%`)
          .maybeSingle();

        if (existingEmail) {
          console.log("⏭️ Invoice email already sent for", booking.booking_code);
        } else {
          // Determine HST from service_tasks
          let hstAmount = 0;
          try {
            const { data: tasks } = await supabase
              .from("service_tasks")
              .select("task_name, apply_hst, included_minutes")
              .in("task_name", booking.service_type || []);

            if (tasks && tasks.length > 0) {
              const totalMinutes = tasks.reduce((s: number, t: any) => s + (t.included_minutes || 30), 0);
              const taxableMinutes = tasks.filter((t: any) => t.apply_hst).reduce((s: number, t: any) => s + (t.included_minutes || 30), 0);
              const taxableFraction = totalMinutes > 0 ? taxableMinutes / totalMinutes : 0;
              hstAmount = Math.round(booking.subtotal * taxableFraction * 0.13 * 100) / 100;
            }
          } catch {
            // Default: derive from total - subtotal
            hstAmount = Math.round((booking.total - booking.subtotal - (booking.surge_amount || 0)) * 100) / 100;
          }

          const surgeAmount = booking.surge_amount || 0;

          // Build invoice HTML
          const invoiceHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #1a1a2e; margin: 0;">PSW Direct</h1>
                <p style="color: #666; margin: 5px 0;">Invoice / Charge Receipt</p>
              </div>
              <hr style="border: 1px solid #eee;" />
              <table style="width: 100%; margin: 20px 0; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #666;">Invoice #</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${booking.booking_code}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Order UID</td><td style="padding: 8px 0; text-align: right; font-size: 12px; color: #888;">${booking.id}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Receipt #</td><td style="padding: 8px 0; text-align: right; font-size: 12px;">${piId}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Client</td><td style="padding: 8px 0; text-align: right;">${booking.client_name}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0; text-align: right;">${booking.scheduled_date}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Time</td><td style="padding: 8px 0; text-align: right;">${booking.start_time} - ${booking.end_time}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Services</td><td style="padding: 8px 0; text-align: right;">${(booking.service_type || []).join(", ")}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Duration</td><td style="padding: 8px 0; text-align: right;">${booking.hours}h</td></tr>
              </table>
              <hr style="border: 1px solid #eee;" />
              <table style="width: 100%; margin: 15px 0; font-size: 14px;">
                <tr><td style="padding: 6px 0;">Subtotal</td><td style="padding: 6px 0; text-align: right;">$${Number(booking.subtotal).toFixed(2)}</td></tr>
                ${surgeAmount > 0 ? `<tr><td style="padding: 6px 0;">Rush/Surge Fee</td><td style="padding: 6px 0; text-align: right;">$${surgeAmount.toFixed(2)}</td></tr>` : ""}
                ${hstAmount > 0 ? `<tr><td style="padding: 6px 0;">HST (13%)</td><td style="padding: 6px 0; text-align: right;">$${hstAmount.toFixed(2)}</td></tr>` : ""}
                <tr style="font-weight: bold; font-size: 16px;"><td style="padding: 10px 0; border-top: 2px solid #333;">Total Charged</td><td style="padding: 10px 0; border-top: 2px solid #333; text-align: right;">$${Number(booking.total).toFixed(2)}</td></tr>
              </table>
              <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px; text-align: center; margin: 20px 0;">
                <p style="color: #166534; margin: 0; font-weight: bold;">✅ Payment Successful</p>
              </div>
              <p style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">PSW Direct — Private Home Care, Ontario</p>
            </div>
          `;

          // Send invoice email via send-email edge function
          try {
            const emailUrl = `${supabaseUrl}/functions/v1/send-email`;
            const emailResponse = await fetch(emailUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                to: booking.client_email,
                subject: `Invoice ${booking.booking_code} — PSW Direct`,
                body: invoiceHtml,
                htmlBody: invoiceHtml,
                template_key: "psa-client-invoice",
              }),
            });

            if (emailResponse.ok) {
              console.log("📧 Invoice email sent to", booking.client_email, "for", booking.booking_code);
            } else {
              console.warn("⚠️ Invoice email failed:", await emailResponse.text());
            }
          } catch (emailErr) {
            console.error("❌ Invoice email error:", emailErr);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});