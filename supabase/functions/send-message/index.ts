// Send an in-app message between client and PSW.
// Server enforces:
//   - sender is authenticated and party to the booking
//   - booking has an assigned PSW (messaging is open)
//   - booking is not completed/cancelled (unless admin re-opened it)
//   - message body is scanned for contact-sharing patterns -> blocked + flagged
//   - blocked messages are NOT delivered to the recipient; flag is logged for admin
// On success, queues an in-app notification + web push (Progressier) without leaking PII.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ----- Privacy filter -----
const PHONE_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/,
  /\+\d{1,3}[-.\s]?\d{3,}/,
  /\b1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
];
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const PHRASE_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "text me", re: /\btext\s*me\b/i },
  { label: "call me", re: /\bcall\s*me\b/i },
  { label: "whatsapp", re: /\bwhats?\s*app\b/i },
  { label: "outside the app", re: /\boutside\s*(the)?\s*app\b/i },
  { label: "off platform", re: /\boff[-\s]?platform\b/i },
  { label: "my number", re: /\bmy\s*(number|cell|phone)\b/i },
];

const PRIVACY_NOTICE =
  "For privacy and safety, please communicate through PSW Direct.";

function detectViolations(text: string): string[] {
  const found: string[] = [];
  for (const re of PHONE_PATTERNS) if (re.test(text)) { found.push("phone"); break; }
  if (EMAIL_PATTERN.test(text)) found.push("email");
  for (const p of PHRASE_PATTERNS) if (p.re.test(text)) found.push(p.label);
  return Array.from(new Set(found));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify caller via anon client + JWT
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerEmail = (userRes.user.email ?? "").toLowerCase();
    const callerId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.booking_id ?? "").trim();
    const rawMessage = String(body.message ?? "").trim();

    if (!bookingId || !rawMessage) {
      return new Response(JSON.stringify({ error: "Missing booking_id or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rawMessage.length > 2000) {
      return new Response(JSON.stringify({ error: "Message too long (max 2000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role for trusted lookups + insert
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load booking minimally
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select(
        "id, status, psw_assigned, psw_first_name, client_email, client_first_name, client_name, user_id"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine caller role for this booking
    let senderRole: "client" | "psw" | "admin" | null = null;
    let recipientEmail: string | null = null;
    let senderDisplayName = "";

    // Admin shortcut
    const { data: adminCheck } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminCheck;

    const isClient =
      booking.user_id === callerId ||
      (booking.client_email ?? "").toLowerCase() === callerEmail;

    let pswProfile: any = null;
    if (booking.psw_assigned) {
      const { data: psw } = await admin
        .from("psw_profiles")
        .select("id, email, first_name")
        .eq("id", booking.psw_assigned)
        .maybeSingle();
      pswProfile = psw;
    }
    const isAssignedPsw =
      !!pswProfile && (pswProfile.email ?? "").toLowerCase() === callerEmail;

    if (isAdmin) {
      senderRole = "admin";
      senderDisplayName = "PSW Direct Support";
    } else if (isClient) {
      senderRole = "client";
      senderDisplayName = booking.client_first_name ?? booking.client_name ?? "Client";
      recipientEmail = pswProfile?.email ?? null;
    } else if (isAssignedPsw) {
      senderRole = "psw";
      senderDisplayName = pswProfile?.first_name ?? booking.psw_first_name ?? "Caregiver";
      recipientEmail = booking.client_email ?? null;
    }

    if (!senderRole) {
      return new Response(JSON.stringify({ error: "Not authorized for this booking" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Window enforcement (admins always allowed)
    if (senderRole !== "admin") {
      if (!booking.psw_assigned) {
        return new Response(
          JSON.stringify({
            error: "Messaging opens once a caregiver is assigned to this job.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (booking.status === "completed" || booking.status === "cancelled") {
        return new Response(
          JSON.stringify({
            error:
              "This conversation is closed. Please contact PSW Direct support if you need to reach the other party.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Privacy filter
    const violations = detectViolations(rawMessage);
    if (violations.length > 0 && senderRole !== "admin") {
      // Log flag but do NOT deliver the message
      await admin.from("message_flags").insert({
        booking_id: bookingId,
        sender_user_id: callerId,
        sender_role: senderRole,
        sender_email: callerEmail,
        detected_patterns: violations,
        original_snippet: rawMessage.slice(0, 500),
      });

      // Optional: store a system message visible to admin for audit thread
      await admin.from("in_app_messages").insert({
        booking_id: bookingId,
        sender_user_id: callerId,
        sender_role: senderRole,
        sender_display_name: senderDisplayName,
        message_body: PRIVACY_NOTICE,
        blocked_reason: violations.join(","),
      });

      return new Response(
        JSON.stringify({
          blocked: true,
          reasons: violations,
          message: PRIVACY_NOTICE,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert delivered message
    const { data: inserted, error: insErr } = await admin
      .from("in_app_messages")
      .insert({
        booking_id: bookingId,
        sender_user_id: callerId,
        sender_role: senderRole,
        sender_display_name: senderDisplayName,
        message_body: rawMessage,
      })
      .select()
      .single();

    if (insErr) {
      console.error("Insert message failed:", insErr);
      return new Response(JSON.stringify({ error: "Failed to send message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify recipient (in-app + push) without PII
    if (recipientEmail) {
      const senderLabel =
        senderRole === "client" ? "Client" : senderRole === "psw" ? "Caregiver" : "Support";
      await admin.from("notifications").insert({
        user_email: recipientEmail,
        title: `New message from your ${senderLabel}`,
        body: "Open PSW Direct to view your message.",
        type: "in_app_message",
      });

      // Web push via Progressier (best-effort, non-blocking)
      const progressierKey = Deno.env.get("PROGRESSIER_API_KEY");
      if (progressierKey) {
        try {
          await fetch("https://progressier.app/api/v1/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${progressierKey}`,
            },
            body: JSON.stringify({
              recipients: { id: recipientEmail },
              title: `New message from your ${senderLabel}`,
              body: "Open PSW Direct to reply.",
              url: "/",
            }),
          });
        } catch (e) {
          console.warn("Progressier push failed:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({ blocked: false, message: inserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-message error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
