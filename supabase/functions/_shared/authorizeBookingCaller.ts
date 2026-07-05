// Shared authorization helper for notification/email edge functions that
// operate on a specific booking. Ensures the caller is either:
//   (1) an internal caller presenting the service-role key as Bearer token,
//   (2) a Supabase-authenticated admin,
//   (3) the PSW assigned to the booking, or
//   (4) the client on the booking.
// Anything else is rejected so an anonymous outsider cannot spam real
// customers by guessing a booking UUID.

import { createClient } from "npm:@supabase/supabase-js@2";

export type BookingAuthResult =
  | { ok: true; role: "service" | "admin" | "psw" | "client"; userId?: string; email?: string }
  | { ok: false; status: number; error: string };

export async function authorizeBookingCaller(
  req: Request,
  bookingId: string,
): Promise<BookingAuthResult> {
  const authHeader = req.headers.get("Authorization") || "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing Authorization header" };
  }
  const token = authHeader.slice("Bearer ".length).trim();

  // (1) Internal service-role caller.
  if (token && token === SERVICE_ROLE_KEY) {
    return { ok: true, role: "service" };
  }

  // Validate JWT via anon client + service-role lookup for role/booking match.
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: "Invalid or expired session" };
  }
  const user = userData.user;
  const email = (user.email || "").toLowerCase();

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // (2) Admin?
  const { data: adminRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (adminRow) return { ok: true, role: "admin", userId: user.id, email };

  // Load minimal booking context.
  const { data: b } = await admin
    .from("bookings")
    .select("id, client_email, psw_assigned")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) {
    return { ok: false, status: 404, error: "Booking not found" };
  }

  // (3) Assigned PSW on this booking?
  if (b.psw_assigned) {
    const { data: pswRow } = await admin
      .from("psw_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (pswRow && String(pswRow.id) === String(b.psw_assigned)) {
      return { ok: true, role: "psw", userId: user.id, email };
    }
  }

  // (4) Client on this booking?
  if (b.client_email && b.client_email.trim().toLowerCase() === email) {
    return { ok: true, role: "client", userId: user.id, email };
  }

  return { ok: false, status: 403, error: "Not authorized for this booking" };
}

/**
 * Simple shared-secret guard for internal cron endpoints. Callers must
 * present the CRON_SECRET (either via x-cron-secret header or Bearer token).
 * pg_cron and admin-only invocations set the header; anonymous outsiders
 * cannot trigger the function.
 */
export function authorizeCronCaller(req: Request):
  | { ok: true }
  | { ok: false; status: number; error: string } {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    return { ok: false, status: 500, error: "CRON_SECRET not configured" };
  }
  const header = req.headers.get("x-cron-secret") || "";
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (header === expected) return { ok: true };
  if (bearer && bearer === expected) return { ok: true };
  // Also allow service-role bearer (used when triggered from admin backend).
  if (bearer && serviceKey && bearer === serviceKey) return { ok: true };
  return { ok: false, status: 401, error: "Unauthorized" };
}
