// ─────────────────────────────────────────────────────────────
// QA ISOLATION HELPERS (server-side, fail-closed)
//
// A booking flagged bookings.is_test_data = true is synthetic QA data.
// It must NEVER:
//   • enter the ordinary radius fan-out
//   • notify anyone other than bookings.test_target_psw_id
//   • create unserved_orders / escalation / admin alerts
//   • create Stripe charges, invoices, payroll or payouts
//
// Recipients are gated by an admin-only allow-list stored in
// app_settings.setting_key = 'qa_test_recipients' (a JSON array of emails).
// A missing, malformed or empty list FAILS CLOSED — nothing is sent.
// ─────────────────────────────────────────────────────────────

export const QA_PREFIX = "QA TEST — DO NOT SERVICE";

export type QaBookingInfo = {
  isTest: boolean;
  targetPswId: string | null;
};

/** Reads the QA flags for a booking. Any lookup failure is treated as "not test". */
export async function getQaBookingInfo(
  supabase: any,
  bookingId: string | null | undefined,
): Promise<QaBookingInfo> {
  if (!bookingId) return { isTest: false, targetPswId: null };
  const { data, error } = await supabase
    .from("bookings")
    .select("is_test_data, test_target_psw_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !data) return { isTest: false, targetPswId: null };
  return {
    isTest: data.is_test_data === true,
    targetPswId: data.test_target_psw_id ?? null,
  };
}

/**
 * Resolves the single permitted QA recipient for a test booking.
 * Returns null (and logs the blocked attempt) when:
 *   • there is no target PSW
 *   • the target PSW profile / email is missing
 *   • the allow-list is missing, empty, or does not contain that email
 */
export async function resolveQaRecipient(
  supabase: any,
  targetPswId: string | null,
  context: string,
): Promise<{ pswId: string; email: string; firstName: string | null } | null> {
  if (!targetPswId) {
    console.warn(`🚫 [qa-isolation:${context}] blocked — test booking has no test_target_psw_id`);
    return null;
  }

  const { data: psw } = await supabase
    .from("psw_profiles")
    .select("id, email, first_name, is_test")
    .eq("id", targetPswId)
    .maybeSingle();

  if (!psw || psw.is_test !== true || !psw.email) {
    console.warn(`🚫 [qa-isolation:${context}] blocked — target PSW missing, not flagged is_test, or has no email`);
    return null;
  }

  const { data: allowed, error } = await supabase.rpc("is_qa_allowed_recipient", {
    p_email: psw.email,
  });

  if (error || allowed !== true) {
    // Never log the address itself — only a non-reversible hint.
    console.warn(
      `🚫 [qa-isolation:${context}] blocked — recipient not on the QA allow-list (fail-closed). ` +
        `domain=${String(psw.email).split("@")[1] ?? "unknown"}`,
    );
    return null;
  }

  return { pswId: psw.id, email: psw.email, firstName: psw.first_name ?? null };
}

/** Sanitised push/notification content for QA sends — no client PII, no exact location. */
export function qaSafeContent(bookingCode: string | null | undefined) {
  return {
    title: `${QA_PREFIX}`,
    body: `Synthetic QA job ${bookingCode || ""} for app testing only. No real client, no real address. Do not travel.`.trim(),
  };
}

/** Hard guard for any money path. Throws when the booking is QA data. */
export async function assertNotQaBooking(
  supabase: any,
  bookingId: string | null | undefined,
  context: string,
): Promise<void> {
  const info = await getQaBookingInfo(supabase, bookingId);
  if (info.isTest) {
    console.warn(`🚫 [qa-isolation:${context}] blocked financial operation on QA test booking`);
    throw new Error("QA_TEST_BOOKING_FINANCIAL_BLOCKED");
  }
}
