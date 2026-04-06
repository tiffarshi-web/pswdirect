import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const ALLOWED_ORIGINS = [
  "https://psadirect.ca",
  "https://pswdirect.ca",
  "https://pswdirect.lovable.app",
  "https://id-preview--9525e8de-8fed-4e96-9eb8-bd37c04d17ef.lovable.app",
];

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const isAllowed = origin && ALLOWED_ORIGINS.some(a =>
    origin === a || origin.endsWith(".lovable.app") || origin.endsWith(".lovableproject.com")
  );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Auth: require admin or service role
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (token !== serviceRoleKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: adminRole } = await adminClient
        .from("user_roles").select("role")
        .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Forbidden: admin required" }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const { booking_code } = await req.json();
    if (!booking_code) {
      return new Response(JSON.stringify({ error: "booking_code required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Fetch booking
    const { data: booking, error: bErr } = await db
      .from("bookings")
      .select("*")
      .eq("booking_code", booking_code)
      .single();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check care sheet
    const hasCareSheet = booking.care_sheet_status === "submitted" && booking.care_sheet;
    if (!hasCareSheet) {
      return new Response(JSON.stringify({ error: "care_sheet_missing", message: "Care sheet has not been submitted for this order." }), {
        status: 422, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check invoice
    const { data: invoice } = await db
      .from("invoices")
      .select("*")
      .eq("booking_id", booking.id)
      .eq("invoice_type", "client_invoice")
      .maybeSingle();

    if (!invoice) {
      return new Response(JSON.stringify({ error: "invoice_missing", message: "No invoice exists for this order." }), {
        status: 422, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build care sheet summary
    const cs = booking.care_sheet as Record<string, any>;
    const careLines: string[] = [];
    if (cs.observations || cs.notes) careLines.push(`<p><strong>Visit Notes:</strong> ${cs.observations || cs.notes}</p>`);
    if (cs.mood) careLines.push(`<p><strong>Mood:</strong> ${cs.mood}</p>`);
    if (cs.mobility) careLines.push(`<p><strong>Mobility:</strong> ${cs.mobility}</p>`);
    if (cs.appetite) careLines.push(`<p><strong>Appetite:</strong> ${cs.appetite}</p>`);
    if (cs.tasksCompleted && Array.isArray(cs.tasksCompleted) && cs.tasksCompleted.length > 0) {
      careLines.push(`<p><strong>Tasks Completed:</strong> ${cs.tasksCompleted.join(", ")}</p>`);
    }
    const careSummaryHtml = careLines.length > 0
      ? careLines.join("\n")
      : "<p>Visit notes recorded.</p>";

    // Format date
    const serviceDate = booking.scheduled_date;
    const formattedDate = new Date(serviceDate + "T12:00:00").toLocaleDateString("en-CA", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // Format service types
    const services = (booking.service_type || []).join(", ");

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #1a1a2e; color: #ffffff; padding: 28px 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 600;">PSW Direct</h1>
      <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.85;">Invoice & Care Summary</p>
    </div>

    <div style="padding: 32px;">
      <p style="font-size: 15px; color: #333; margin: 0 0 20px;">
        Thank you for choosing PSW Direct. Below is your invoice and care summary for your recent visit.
      </p>

      <div style="background: #f0f4ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">
          <tr><td style="padding: 4px 0; font-weight: 600;">Order:</td><td style="padding: 4px 0;">${booking.booking_code}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Date:</td><td style="padding: 4px 0;">${formattedDate}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Time:</td><td style="padding: 4px 0;">${booking.start_time?.substring(0,5)} – ${booking.end_time?.substring(0,5)}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Services:</td><td style="padding: 4px 0;">${services}</td></tr>
          ${booking.psw_first_name ? `<tr><td style="padding: 4px 0; font-weight: 600;">Caregiver:</td><td style="padding: 4px 0;">${booking.psw_first_name}</td></tr>` : ""}
        </table>
      </div>

      <h2 style="font-size: 17px; color: #1a1a2e; margin: 0 0 12px; border-bottom: 2px solid #e8ecf1; padding-bottom: 8px;">
        📋 Care Summary
      </h2>
      <div style="font-size: 14px; color: #444; line-height: 1.6; margin-bottom: 24px;">
        ${careSummaryHtml}
      </div>

      <h2 style="font-size: 17px; color: #1a1a2e; margin: 0 0 12px; border-bottom: 2px solid #e8ecf1; padding-bottom: 8px;">
        💳 Invoice Summary
      </h2>
      <div style="background: #fafafa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">
          <tr><td style="padding: 4px 0;">Invoice #:</td><td style="padding: 4px 0; text-align: right; font-family: monospace;">${invoice.invoice_number}</td></tr>
          <tr><td style="padding: 4px 0;">Subtotal:</td><td style="padding: 4px 0; text-align: right;">$${Number(invoice.subtotal).toFixed(2)}</td></tr>
          ${Number(invoice.tax) > 0 ? `<tr><td style="padding: 4px 0;">HST:</td><td style="padding: 4px 0; text-align: right;">$${Number(invoice.tax).toFixed(2)}</td></tr>` : ""}
          ${Number(invoice.surge_amount) > 0 ? `<tr><td style="padding: 4px 0;">Rush/Surge:</td><td style="padding: 4px 0; text-align: right;">$${Number(invoice.surge_amount).toFixed(2)}</td></tr>` : ""}
          <tr style="border-top: 2px solid #ddd;"><td style="padding: 8px 0; font-weight: 700; font-size: 16px;">Total:</td><td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 16px; color: #1a1a2e;">$${Number(invoice.total).toFixed(2)} CAD</td></tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #888; margin: 24px 0 0; text-align: center;">
        If you have any questions, please reply to this email.<br>
        PSW Direct — Professional Home Care Services
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send email via Resend
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "PSW Direct <no-reply@psadirect.ca>",
        to: [booking.client_email],
        subject: `Your PSW Direct Invoice and Care Summary — ${booking.booking_code}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend error:", emailResult);

      // Log failed attempt
      await db.from("email_logs").insert({
        recipient_email: booking.client_email,
        subject: `Invoice & Care Summary — ${booking.booking_code}`,
        template_name: "completion-docs",
        status: "failed",
        error_message: emailResult.message || "Unknown error",
        metadata: { booking_code, invoice_number: invoice.invoice_number },
      });

      return new Response(JSON.stringify({ error: "Email send failed", detail: emailResult.message }), {
        status: 502, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Log success
    await db.from("email_logs").insert({
      recipient_email: booking.client_email,
      subject: `Invoice & Care Summary — ${booking.booking_code}`,
      template_name: "completion-docs",
      status: "sent",
      metadata: { booking_code, invoice_number: invoice.invoice_number, resend_id: emailResult.id },
    });

    console.log(`✅ Completion docs sent for ${booking_code} to ${booking.client_email}`);

    return new Response(JSON.stringify({
      success: true,
      email_sent_to: booking.client_email,
      invoice_number: invoice.invoice_number,
      care_sheet_by: cs.pswFirstName || "Unknown",
    }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("send-completion-docs error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
