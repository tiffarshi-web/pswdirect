// Care Conditions - Centralized config for care needs checklist

export const CARE_CONDITIONS = [
  // Cognitive
  "Mild Dementia",
  "Moderate Dementia",
  "Severe Dementia / Alzheimer's",
  "Memory Loss / Confusion",
  "Aggression / Wandering Risk",
  "Sundowning",
  "Non-Verbal / Limited Communication",
  "Mental Health / Anxiety / Depression",
  // Mobility
  "Limited Mobility",
  "Uses Walker",
  "Uses Cane",
  "Uses Wheelchair",
  "Bed Bound",
  "Requires Two-Person Transfer",
  "Uses Mechanical Lift",
  "Bariatric Care",
  "Fall Risk",
  // Medical
  "Diabetic (Type 1)",
  "Diabetic (Type 2)",
  "Heart Condition / Heart Attack History",
  "High Blood Pressure",
  "Stroke Recovery",
  "Parkinson's",
  "Multiple Sclerosis (MS)",
  "ALS",
  "Cancer / Chemotherapy",
  "COPD / Respiratory Issues",
  "Uses Oxygen",
  "Kidney Disease / Dialysis",
  "Seizure Disorder / Epilepsy",
  "Arthritis / Chronic Pain",
  "Osteoporosis",
  "Post-Surgery Recovery",
  "Palliative / End-of-Life Care",
  // Daily living
  "Incontinence (Bladder)",
  "Incontinence (Bowel)",
  "Catheter Care",
  "Ostomy / Colostomy Care",
  "Wound Care / Pressure Sores",
  "Feeding Tube (G-Tube / PEG)",
  "Swallowing Difficulty / Thickened Fluids",
  "Special Diet Requirements",
  "Medication Reminders Required",
  // Sensory & other
  "Hearing Impaired",
  "Vision Impaired / Blind",
  "Allergies",
  "Infection / Isolation Precautions",
  "Pets in Home",
  "Smoker in Home",
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
