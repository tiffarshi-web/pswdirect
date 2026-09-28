// Native push for the PSW Direct Client app (ca.pswdirect.client).
//
// Called only by the database (single-use internal token) or with the service
// role key, after a server-confirmed booking stage is recorded in
// client_stage_events. Lock-screen copy never contains names, addresses or
// health details — only the stage and the order code.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeBookingCaller } from "../_shared/authorizeBookingCaller.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

const COPY: Record<string, (role: string) => { title: string; body: string }> = {
  assigned: (r) => ({ title: `Your ${r} is confirmed`, body: `A ${r} has accepted your visit.` }),
  on_my_way: (r) => ({ title: `Your ${r} is on the way`, body: `Your ${r} has started travelling to your visit.` }),
  checked_in: (r) => ({ title: "Visit started", body: `Your ${r} has signed in for the visit.` }),
  completed: () => ({ title: "Visit complete", body: "Your visit has been completed." }),
  report_ready: () => ({ title: "Care report ready", body: "Your care report is ready to view in the app." }),
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let bookingId = "";
  try {
    bookingId = String((await req.json())?.booking_id ?? "");
  } catch { /* fallthrough */ }
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return new Response("bad request", { status: 400 });

  const auth = await authorizeBookingCaller(req, bookingId);
  if (!auth.ok || auth.role !== "service") return new Response("forbidden", { status: 403 });

  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("FIREBASE_MESSAGING_API_KEY");

  const { data: booking } = await svc.from("bookings")
    .select("id, booking_code, service_province").eq("id", bookingId).maybeSingle();
  if (!booking) return Response.json({ ok: false, error: "not_found" });
  const role = booking.service_province === "AB" ? "HCA" : "PSW";

  const { data: events } = await svc.from("client_stage_events")
    .select("id, stage, attempts").eq("booking_id", bookingId).eq("status", "pending").lt("attempts", 5);
  const { data: tokens } = await svc.rpc("client_push_tokens_for_booking", { _booking_id: bookingId });

  const results: any[] = [];
  for (const ev of events ?? []) {
    if (!lovableKey || !connectionKey || !tokens?.length) {
      await svc.from("client_stage_events").update({ status: "skipped_no_device_or_config", attempts: ev.attempts + 1 }).eq("id", ev.id);
      continue;
    }
    const copy = COPY[ev.stage]?.(role);
    if (!copy) continue;
    let ok = 0;
    for (const t of tokens as any[]) {
      try {
        const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey, "Content-Type": "application/json" },
          body: JSON.stringify({ message: {
            token: t.token,
            notification: copy,
            data: { path: `/client?order=${booking.booking_code ?? ""}`, stage: ev.stage },
            android: { priority: "HIGH" },
            apns: { payload: { aps: { sound: "default" } } },
          } }),
        });
        if (res.ok) ok++;
        else if ([400, 404, 410].includes(res.status)) {
          await svc.from("client_push_tokens").update({ is_active: false, revoked_at: new Date().toISOString(), revoked_reason: "token_invalid" }).eq("token", t.token);
        }
      } catch { /* retried next stage */ }
    }
    await svc.from("client_stage_events").update({
      status: ok > 0 ? "service_accepted" : "pending",
      attempts: ev.attempts + 1,
      sent_at: ok > 0 ? new Date().toISOString() : null,
    }).eq("id", ev.id);
    results.push({ stage: ev.stage, accepted: ok });
  }
  return Response.json({ ok: true, results });
});
