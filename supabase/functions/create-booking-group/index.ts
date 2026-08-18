// create-booking-group — Multi-day booking orchestrator.
//
// A multi-day request is stored as ONE booking_groups row plus N ordinary
// single-visit bookings (one per date). Every downstream system — dispatch,
// check-in, care sheets, payroll, per-visit cancellation — keeps working
// unchanged because each visit is still a normal booking row.
//
// Payment is collected ONCE for the group total: the caller creates a single
// PaymentIntent with { bookingGroupId } and the webhook finalizes every visit.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_VISITS = 31;

const isIsoDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

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

    const body = await req.json();
    const { serviceDates, ...bookingPayload } = body ?? {};

    // ── Validate the date set ──
    if (!Array.isArray(serviceDates) || serviceDates.length === 0) {
      return json({ error: "invalid_dates", message: "serviceDates must be a non-empty array of YYYY-MM-DD strings" }, 400);
    }
    const dates = Array.from(new Set(serviceDates.filter(isIsoDate))).sort();
    if (dates.length !== serviceDates.length) {
      return json({ error: "invalid_dates", message: "serviceDates contained duplicates or malformed dates" }, 400);
    }
    if (dates.length > MAX_VISITS) {
      return json({ error: "too_many_visits", message: `A single request can cover at most ${MAX_VISITS} visits` }, 400);
    }
    if (!bookingPayload.client_email || !bookingPayload.client_name || !bookingPayload.start_time || !bookingPayload.end_time) {
      return json({ error: "missing_fields", message: "client_name, client_email, start_time and end_time are required" }, 400);
    }

    // ── SERVER ENFORCEMENT: multi-day is Home Care ONLY ──
    // Service identifiers are normalized through the authoritative engine, so a
    // forged/aliased label (e.g. "Hospital Pick-up/Drop-off (Discharge)") cannot
    // sneak a taxable transport order into the multi-day path.
    const rawServices = Array.isArray(bookingPayload.service_type)
      ? bookingPayload.service_type
      : [bookingPayload.service_type];
    const codes = rawServices.map((s: unknown) => normalizeServiceCode(s));

    if (codes.some((c) => c !== "home_care")) {
      return json({
        error: "multi_day_not_allowed_for_service",
        message: "Multi-day bookings are available for Home Care only. Doctor Escort and Hospital Visit/Discharge must be booked one date at a time.",
      }, 400);
    }
    if (new Set(codes).size > 1) {
      return json({
        error: "mixed_service_types_not_allowed",
        message: "A multi-day request cannot mix service types.",
      }, 400);
    }
    if (bookingPayload.is_transport_booking === true || bookingPayload.pickup_address || bookingPayload.dropoff_address) {
      return json({
        error: "multi_day_not_allowed_for_service",
        message: "Transport services cannot be booked as a multi-day group.",
      }, 400);
    }
    if (Number(bookingPayload.parking_fee ?? 0) > 0) {
      return json({
        error: "parking_not_allowed_for_home_care",
        message: "Parking cannot be added to a Home Care booking.",
      }, 400);
    }
    // Home Care groups are never taxable and never carry parking.
    bookingPayload.parking_fee = 0;
    bookingPayload.is_transport_booking = false;


    // ── 1. Create the group shell ──
    const { data: group, error: groupErr } = await supabase
      .from("booking_groups")
      .insert({
        user_id: bookingPayload.user_id || null,
        client_name: bookingPayload.client_name,
        client_email: bookingPayload.client_email,
        client_phone: bookingPayload.client_phone || null,
        visit_count: dates.length,
        status: "pending",
        payment_status: "awaiting_payment",
        notes: bookingPayload.special_notes || null,
      })
      .select("id")
      .single();

    if (groupErr || !group) {
      console.error("[create-booking-group] group insert failed:", groupErr?.message);
      return json({ error: "group_create_failed", message: groupErr?.message }, 500);
    }

    // ── 2. Create each visit as a normal draft booking ──
    // Drafts (awaiting_payment) skip dispatch + emails until the group is paid.
    const created: Array<{ id: string; booking_code: string; scheduled_date: string; total: number }> = [];
    const failures: Array<{ date: string; reason: string }> = [];

    for (let i = 0; i < dates.length; i++) {
      const visitPayload = {
        ...bookingPayload,
        scheduled_date: dates[i],
        payment_status: "awaiting_payment",
        booking_group_id: group.id,
        visit_index: i + 1,
        // Parking is a per-request fee, charged once on the first visit only.
        parking_fee: i === 0 ? bookingPayload.parking_fee ?? 0 : 0,
      };

      const res = await fetch(`${supabaseUrl}/functions/v1/create-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify(visitPayload),
      });
      const out = await res.json().catch(() => ({}));

      if (!res.ok || out?.error || !out?.booking_id) {
        failures.push({ date: dates[i], reason: out?.message || out?.error || `HTTP ${res.status}` });
        continue;
      }
      created.push({
        id: out.booking_id,
        booking_code: out.booking_code,
        scheduled_date: dates[i],
        total: Number(out.total ?? 0),
      });
    }

    // ── 3. All-or-nothing: never leave a half-built multi-day request ──
    if (failures.length > 0) {
      if (created.length > 0) {
        await supabase.from("bookings")
          .update({ status: "cancelled", payment_status: "cancelled" })
          .in("id", created.map((b) => b.id));
      }
      await supabase.from("booking_groups")
        .update({ status: "failed", visit_count: 0 })
        .eq("id", group.id);
      console.error("[create-booking-group] rolled back:", JSON.stringify(failures));
      return json({ error: "visit_create_failed", message: failures[0].reason, failures }, 500);
    }

    // ── 4. Roll the authoritative group totals up from the visit rows ──
    const { data: rows } = await supabase
      .from("bookings")
      .select("subtotal, hst_amount, parking_fee, total, booking_code")
      .eq("booking_group_id", group.id);

    const sum = (k: string) => (rows ?? []).reduce((s: number, r: any) => s + Number(r[k] ?? 0), 0);
    const round2 = (n: number) => Math.round(n * 100) / 100;

    const groupCode = `GRP-${(created[0]?.booking_code || "").replace(/^CDT-/, "") || group.id.slice(0, 6)}`;

    const { data: finalGroup } = await supabase
      .from("booking_groups")
      .update({
        group_code: groupCode,
        visit_count: created.length,
        subtotal: round2(sum("subtotal")),
        hst_amount: round2(sum("hst_amount")),
        parking_fee: round2(sum("parking_fee")),
        total: round2(sum("total")),
        status: "awaiting_payment",
      })
      .eq("id", group.id)
      .select("id, group_code, visit_count, subtotal, hst_amount, parking_fee, total")
      .single();

    console.log(`[create-booking-group] ${groupCode}: ${created.length} visits, total $${finalGroup?.total}`);

    return json({
      success: true,
      group: finalGroup,
      bookings: created,
    });
  } catch (e: any) {
    console.error("[create-booking-group] unexpected:", e?.message || e);
    return json({ error: "unexpected", message: e?.message || "Unknown error" }, 500);
  }
});
