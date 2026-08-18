// send-group-invoice-email — ONE grouped invoice email per multi-day Home Care group.
//
// Idempotent by design: the grouped invoice row is the lock. If the invoice is
// already `sent`, a retry re-uses the same invoice and does NOT send again
// (unless an admin explicitly passes { force: true } to resend).
// Email failure never touches booking/payment state.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateGroupInvoiceHtml, type GroupVisitLine } from "../_shared/groupInvoiceHtml.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── AuthZ: service-role (internal) or an authenticated admin ──
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    let allowed = token === serviceKey;
    if (!allowed && token) {
      const { data: userRes } = await supabase.auth.getUser(token);
      if (userRes?.user) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
        allowed = isAdmin === true;
      }
    }
    if (!allowed) return json({ error: "not_authorized" }, 403);

    const { groupId, force } = await req.json().catch(() => ({}));
    if (!groupId || typeof groupId !== "string") return json({ error: "missing_group_id" }, 400);

    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total, client_email, client_name, pricing_snapshot, html_snapshot, booking_code")
      .eq("booking_group_id", groupId)
      .eq("invoice_type", "group_invoice")
      .maybeSingle();

    if (!invoice) return json({ error: "group_invoice_not_found" }, 404);

    // Deduplication: the same invoice is never emailed twice automatically.
    if (invoice.status === "sent" && force !== true) {
      return json({ success: true, skipped: "already_sent", invoice_number: invoice.invoice_number });
    }

    const snap: any = invoice.pricing_snapshot || {};
    const visits: GroupVisitLine[] = (snap.visits || []).map((v: any) => ({
      bookingCode: v.bookingCode,
      serviceDate: v.serviceDate,
      startTime: v.startTime,
      endTime: v.endTime,
      hours: Number(v.hours || 0),
      hourlyRate: Number(v.hourlyRate || 0),
      subtotal: Number(v.subtotal || 0),
    }));

    const html = generateGroupInvoiceHtml({
      invoiceNumber: invoice.invoice_number,
      groupCode: snap.groupCode || invoice.booking_code,
      clientName: invoice.client_name || "",
      clientEmail: invoice.client_email,
      serviceRecipient: snap.serviceRecipient,
      serviceAddress: snap.serviceAddress,
      visits,
      totalHours: Number(snap.totalHours || 0),
      subtotal: Number(snap.subtotal || 0),
      total: Number(invoice.total || 0),
      amountPaid: Number(snap.amountPaid ?? invoice.total ?? 0),
      paymentDate: snap.paymentDate,
      paymentIntentId: snap.stripePaymentIntentId,
      currency: "CAD",
    });

    // Persist the rendered document so the invoice link/PDF is stable forever.
    await supabase.from("invoices").update({ html_snapshot: html }).eq("id", invoice.id);

    const firstName = (invoice.client_name || "there").split(" ")[0];
    const lines = visits
      .map((v) => `• ${v.serviceDate} ${v.startTime}–${v.endTime} (${v.hours} hr) — ${v.bookingCode}`)
      .join("\n");

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        to: invoice.client_email,
        subject: `Invoice ${invoice.invoice_number} — Your PSW Direct Multi-Day Home Care Booking`,
        body: `Hello ${firstName},\n\nYour ${visits.length}-visit Home Care booking is confirmed and paid.\n\n${lines}\n\nTotal paid: $${Number(invoice.total || 0).toFixed(2)} CAD\nInvoice: ${invoice.invoice_number}\n\nPSW Direct — (249) 288-4787`,
        htmlBody: html,
        template_key: "psa-group-invoice",
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      await supabase.from("invoices").update({ status: "email_failed" }).eq("id", invoice.id);
      console.warn(`[send-group-invoice-email] send failed for ${invoice.invoice_number}: ${detail}`);
      // Soft-fail: payment stays valid, invoice stays valid, retry is safe.
      return json({ success: false, error: "email_send_failed", invoice_number: invoice.invoice_number }, 200);
    }

    await supabase.from("invoices").update({ status: "sent" }).eq("id", invoice.id);
    console.log(`[send-group-invoice-email] sent ${invoice.invoice_number} (${visits.length} visits)`);
    return json({ success: true, invoice_number: invoice.invoice_number, visits: visits.length });
  } catch (e: any) {
    console.error("[send-group-invoice-email] unexpected:", e?.message || e);
    return json({ error: "unexpected", message: e?.message || "Unknown error" }, 500);
  }
});
