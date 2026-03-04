// Server-side care sheet contact info detection
// Scans text fields for phone, email, and contact phrases
// Does NOT block submission — flags for admin review

import { supabase } from "@/integrations/supabase/client";

const PHONE_PATTERNS = [
  /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
  /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/,
  /\d{10,}/,
  /\+\d{1,3}[-.\s]?\d{3,}/,
  /1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

const CONTACT_PHRASES = [
  /call\s+me/i,
  /text\s+me/i,
  /reach\s+me/i,
  /contact\s+me/i,
  /my\s+(number|phone|cell|email)/i,
  /here(?:'s| is)\s+my/i,
  /you\s+can\s+reach/i,
  /message\s+me/i,
  /whatsapp/i,
];

export type DetectedPattern = "phone" | "email" | "phrase";

export interface DetectionResult {
  flagged: boolean;
  patterns: DetectedPattern[];
  snippet: string | null;
}

/**
 * Scan text for contact information patterns.
 * Returns detection result without blocking.
 */
export const detectContactInfo = (text: string): DetectionResult => {
  if (!text || !text.trim()) {
    return { flagged: false, patterns: [], snippet: null };
  }

  const patterns: DetectedPattern[] = [];
  let snippet: string | null = null;

  // Check phone patterns
  for (const p of PHONE_PATTERNS) {
    const match = text.match(p);
    if (match) {
      if (!patterns.includes("phone")) patterns.push("phone");
      if (!snippet) snippet = text.substring(Math.max(0, match.index! - 20), match.index! + match[0].length + 20);
      break;
    }
  }

  // Check email
  const emailMatch = text.match(EMAIL_PATTERN);
  if (emailMatch) {
    if (!patterns.includes("email")) patterns.push("email");
    if (!snippet) snippet = text.substring(Math.max(0, emailMatch.index! - 20), emailMatch.index! + emailMatch[0].length + 20);
  }

  // Check contact phrases
  for (const p of CONTACT_PHRASES) {
    const match = text.match(p);
    if (match) {
      if (!patterns.includes("phrase")) patterns.push("phrase");
      if (!snippet) snippet = text.substring(Math.max(0, match.index! - 20), match.index! + match[0].length + 20);
      break;
    }
  }

  return {
    flagged: patterns.length > 0,
    patterns,
    snippet: snippet ? snippet.substring(0, 200) : null,
  };
};

/**
 * Scan all text fields in a care sheet for contact info.
 */
export const scanCareSheet = (careSheet: Record<string, any>): DetectionResult => {
  const textFields = [
    careSheet.observations || "",
    careSheet.dischargeNotes || "",
  ].filter(Boolean);

  const allPatterns: DetectedPattern[] = [];
  let firstSnippet: string | null = null;

  for (const text of textFields) {
    const result = detectContactInfo(text);
    if (result.flagged) {
      for (const p of result.patterns) {
        if (!allPatterns.includes(p)) allPatterns.push(p);
      }
      if (!firstSnippet && result.snippet) firstSnippet = result.snippet;
    }
  }

  return {
    flagged: allPatterns.length > 0,
    patterns: allPatterns,
    snippet: firstSnippet,
  };
};

/**
 * Flag a booking and log to audit table.
 * Called after care sheet submission — does NOT block submission.
 */
export const flagCareSheet = async (
  bookingId: string,
  pswId: string,
  detection: DetectionResult
): Promise<void> => {
  if (!detection.flagged) return;

  try {
    // Update booking with flag
    await supabase
      .from("bookings")
      .update({
        care_sheet_flagged: true,
        care_sheet_flag_reason: detection.patterns,
      } as any)
      .eq("id", bookingId);

    // Insert audit log
    await supabase
      .from("care_sheet_audit_log" as any)
      .insert({
        booking_id: bookingId,
        psw_id: pswId,
        detected_patterns: detection.patterns,
        raw_text_snippet: detection.snippet,
      });
  } catch (err) {
    // Non-blocking — log but don't throw
    console.error("Error flagging care sheet:", err);
  }
};
