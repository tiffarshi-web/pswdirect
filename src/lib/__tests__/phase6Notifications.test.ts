import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

/**
 * Phase 6 contract tests: job alerts, device registration, privacy, delivery
 * status honesty, idempotency, rate limiting and the office address alert.
 *
 * These are source-contract tests: they assert the guarantees are actually
 * encoded in the shipped code, not merely described in a report.
 */

const read = (p: string) => readFileSync(p, "utf8");
const grep = (pattern: string, paths: string): string => {
  try {
    return execSync(`grep -rIn -E "${pattern}" ${paths} --exclude-dir=__tests__ || true`, {
      encoding: "utf8",
    });
  } catch {
    return "";
  }
};

const notifyPsws = read("supabase/functions/notify-psws/index.ts");
const testPing = read("supabase/functions/psw-test-ping/index.ts");
const queue = read("supabase/functions/process-notification-queue/index.ts");
const fcm = read("supabase/functions/_shared/fcmPush.ts");
const createBooking = read("supabase/functions/create-booking/index.ts");
const pushClient = read("src/mobile/native/pushNotifications.ts");
const dashboard = read("src/components/admin/NotificationDeliveryDashboard.tsx");

describe("eligibility filtering", () => {
  it("dispatch always intersects with the authoritative eligibility function", () => {
    expect(notifyPsws).toContain("eligible_psws_for_booking");
  });

  it("the eligibility gate is not bypassable from the request body", () => {
    // force_rebroadcast may re-send, but must never widen the audience.
    const forceLines = notifyPsws.split("\n").filter((l) => l.includes("force_rebroadcast"));
    expect(forceLines.length).toBeGreaterThan(0);
    for (const line of forceLines) {
      expect(line).not.toContain("eligible");
    }
  });

  it("dispatch refuses unauthenticated callers", () => {
    expect(notifyPsws).toMatch(/Unauthorized|401/);
  });
});

describe("pre-acceptance privacy", () => {
  it("never logs the client's street address during dispatch", () => {
    const hits = grep("console\\.(log|warn|error)\\(.*patient_address", "supabase/functions");
    expect(hits.trim()).toBe("");
  });

  it("alert copy carries no protected client information", () => {
    // Body/title builders may reference city, service type, date and duration only.
    const forbidden = [
      "client_name",
      "patient_name",
      "door_code",
      "unit_number",
      "client_phone",
      "patient_phone",
      "diagnosis",
      "care_instructions",
    ];
    const pushBlock = notifyPsws.slice(
      notifyPsws.indexOf("sendProgressierPush"),
      notifyPsws.indexOf("sendProgressierPush") + 1200,
    );
    for (const field of forbidden) {
      expect(pushBlock).not.toContain(field);
    }
  });
});

describe("device registration", () => {
  it("registers through the protected server action, never a direct table write", () => {
    expect(pushClient).toContain("register_worker_push_token");
    expect(pushClient).not.toMatch(/from\("worker_push_tokens"\)\s*\.\s*upsert/);
  });

  it("sign-out deactivates only the caller's own registration", () => {
    expect(pushClient).toContain("deactivate_worker_push_token");
    expect(pushClient).not.toMatch(/from\("worker_push_tokens"\)\s*\.\s*delete/);
  });

  it("dead device tokens are deactivated server-side, not deleted", () => {
    expect(fcm).toContain("deactivate_invalid_push_tokens");
    expect(fcm).not.toMatch(/from\("worker_push_tokens"\)\s*\.\s*delete/);
  });

  it("never records or logs a full device token", () => {
    expect(fcm).toContain("token_suffix");
    expect(fcm).toContain("row.token.slice(-6)");
    const logsToken = grep("console\\.[a-z]+\\(.*row\\.token[^.]", "supabase/functions");
    expect(logsToken.trim()).toBe("");
    expect(dashboard).not.toMatch(/\btoken\b\s*:/);
  });
});

describe("delivery status honesty", () => {
  it("a 2xx from the push service is recorded as service_accepted, not delivered", () => {
    expect(fcm).toContain('status: "service_accepted"');
    expect(fcm).not.toContain('status: "delivered"');
    expect(testPing).toContain('"service_accepted"');
  });

  it("the office dashboard distinguishes the full status taxonomy", () => {
    for (const status of [
      "queued",
      "sent",
      "service_accepted",
      "delivered",
      "opened",
      "failed_temporary",
      "failed_permanent",
      "token_invalid",
      "permission_denied",
      "skipped_ineligible",
      "cancelled",
      "expired",
    ]) {
      expect(dashboard).toContain(status);
    }
  });
});

describe("idempotency and retries", () => {
  it("each native send carries a stable idempotency key", () => {
    expect(fcm).toContain("idempotency_key");
    expect(fcm).toContain("onConflict: \"idempotency_key\"");
  });

  it("one address problem can only ever produce one office email", () => {
    expect(createBooking).toContain("dedupe_key: `admin-geocode-flag:v1:${data.id}`");
    expect(createBooking).toContain("ignoreDuplicates: true");
  });

  it("permanent email failures are never retried and temporary ones are capped", () => {
    expect(queue).toContain("failed_permanent");
    expect(queue).toContain("MAX_ATTEMPTS");
    expect(queue).toMatch(/lt\("attempts", MAX_ATTEMPTS\)/);
  });

  it("the office alert sender is PSW Direct, never another company", () => {
    expect(queue).toContain("pswdirect.ca");
    expect(queue).not.toContain("psadirect.ca");
    const cross = grep("psadirect\\.ca", "supabase/functions/process-notification-queue");
    expect(cross.trim()).toBe("");
  });

  it("queue rows are claimed before sending so overlapping runs cannot double-send", () => {
    expect(queue).toContain('.eq("status", "pending")');
    expect(queue).toContain('status: "sending"');
  });
});

describe("test alert", () => {
  it("targets only the signed-in caregiver's own profile", () => {
    expect(testPing).toContain("psw_profiles");
    expect(testPing).toContain("[profile.email]");
    // No caller-supplied recipient is accepted at all.
    expect(testPing).not.toMatch(/req\.json\(\)/);
  });

  it("is rate limited server-side", () => {
    expect(testPing).toContain("consume_rate_limit");
    expect(testPing).toContain("psw_test_ping");
    expect(testPing).toContain("429");
  });

  it("reports the channels it used", () => {
    expect(testPing).toContain("channels");
    expect(testPing).toContain("registered_devices");
  });

  it("cannot modify or accept a job", () => {
    expect(testPing).not.toContain("bookings");
    expect(testPing).not.toContain("claim_booking");
  });
});

describe("rate limiting does not block safety alerts", () => {
  it("dispatch and booking alerts are not rate limited", () => {
    expect(notifyPsws).not.toContain("consume_rate_limit");
  });
});

describe("provider payments", () => {
  it("no notification claims an automatic transfer to a caregiver", () => {
    const hits = grep(
      "(automatic|instant)(ly)? (transferred|deposited|paid)",
      "supabase/functions src",
    );
    expect(hits.trim()).toBe("");
  });
});

describe("obsolete alerts are cancelled, not sent", () => {
  const migrations = execSync(
    "grep -rl cancel_obsolete_booking_notifications supabase/migrations || true",
    { encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean)
    .map((p) => read(p))
    .join("\n");

  it("a cancelled order closes its still-queued alerts", () => {
    expect(migrations).toContain("order_cancelled");
    expect(migrations).toContain("status = 'cancelled'");
  });

  it("fixing a flagged address closes the office alert", () => {
    expect(migrations).toContain("address_resolved");
    expect(migrations).toContain("admin-geocode-flag");
  });

  it("reassignment or a moved visit closes stale visit alerts", () => {
    expect(migrations).toContain("visit_details_changed");
    expect(migrations).toContain("psw-arrived");
  });

  it("cancelled alerts are closed out, never deleted", () => {
    expect(migrations).not.toMatch(/DELETE\s+FROM\s+public\.notification_queue/i);
  });

  it("only server processes may cancel queued alerts", () => {
    expect(migrations).toMatch(
      /REVOKE ALL ON FUNCTION public\.cancel_pending_notifications_for_booking[\s\S]*authenticated/,
    );
  });
});

describe("office and client alert de-duplication", () => {
  const stripeWebhook = read("supabase/functions/stripe-webhook/index.ts");
  const pswArrived = read("supabase/functions/send-psw-arrived/index.ts");

  it("a disputed charge raises one PSW Direct office alert, not one per webhook retry", () => {
    expect(stripeWebhook).toContain("stripe-dispute-created:v1:${dispute.id}");
    expect(stripeWebhook).not.toContain("admin@pswdirect.com");
  });

  it("a retried arrival call cannot message the client twice", () => {
    expect(pswArrived).toContain("psw-arrived:v1:${booking_id}");
  });
});
