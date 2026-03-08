// Care Conditions - Centralized config for care needs checklist

export const CARE_CONDITIONS = [
  "Dementia / Alzheimer's",
  "Memory Loss / Confusion",
  "Diabetes",
  "Heart Condition / Heart Attack History",
  "Respiratory Issues / Oxygen",
  "Limited Mobility",
  "Walker",
  "Wheelchair",
  "Bed Bound",
  "Stroke Recovery",
  "Parkinson's",
  "Post-Surgery Recovery",
  "Palliative Care",
  "Fall Risk",
  "Aggression / Wandering Risk",
  "Other",
] as const;

export type CareCondition = (typeof CARE_CONDITIONS)[number];

// PSW Care Experience options - separate from client care needs
// NOT used for matching/filtering, only for PSW profile display
export const PSW_CARE_EXPERIENCE_OPTIONS = [
  "Dementia",
  "Alzheimer's",
  "Parkinson's",
  "Stroke Recovery",
  "Palliative Care",
  "Diabetes Management",
  "Mobility Assistance",
  "Bariatric Care",
  "Mental Health / Anxiety / Depression",
  "Companionship",
  "Bedridden Care",
  "Post-Surgery Recovery",
] as const;

export type PSWCareExperience = (typeof PSW_CARE_EXPERIENCE_OPTIONS)[number];

// PSW Certification checklist options
export const PSW_CERTIFICATION_OPTIONS = [
  "PSW Certificate",
  "First Aid",
  "CPR / AED",
  "Dementia Care Training",
  "Palliative Care Training",
  "Mental Health First Aid",
  "Medication Administration",
  "Lift & Transfer Training",
  "Wound Care / Ostomy Care",
] as const;

export type PSWCertification = (typeof PSW_CERTIFICATION_OPTIONS)[number];

// URL pattern for contact info detection
const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/i;

// Reuse phone/email patterns from privacyFilter but add URL detection
const PHONE_PATTERNS = [
  /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
  /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/,
  /\d{10,}/,
  /\+\d{1,3}[-.\s]?\d{3,}/,
  /1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
];
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

/**
 * Detect contact info (phone, email, URL) in text.
 * Returns error message if found, null if clean.
 */
export const detectContactInfo = (text: string): string | null => {
  if (!text || !text.trim()) return null;

  for (const pattern of PHONE_PATTERNS) {
    if (pattern.test(text)) {
      return "For safety and platform policy, please do not include phone numbers or contact details here. Communication happens through the platform.";
    }
  }

  if (EMAIL_PATTERN.test(text)) {
    return "For safety and platform policy, please do not include email addresses or contact details here. Communication happens through the platform.";
  }

  if (URL_PATTERN.test(text)) {
    return "For safety and platform policy, please do not include URLs or links here. Communication happens through the platform.";
  }

  return null;
};

/**
 * Format care conditions as badge-friendly display.
 * Joins with " • " separator.
 */
export const formatCareConditionsBadges = (
  conditions: string[],
  otherText?: string | null
): string[] => {
  const badges = conditions.filter((c) => c !== "Other");
  if (conditions.includes("Other") && otherText?.trim()) {
    badges.push(`Other: ${otherText.trim()}`);
  }
  return badges;
};
