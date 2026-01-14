// Privacy Communication Filter
// Scans text for personal contact information and blocks/warns based on user role

import { getCurrentDevRole, getDevConfig } from "./devConfig";

// Phone number patterns
const PHONE_PATTERNS = [
  /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,           // 000-000-0000, 000.000.0000, 000 000 0000
  /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/,            // (000) 000-0000
  /\d{10,}/,                                    // 10+ digit numbers
  /\+\d{1,3}[-.\s]?\d{3,}/,                    // +1 000-000-0000
  /1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,   // 1-000-000-0000
];

// Email pattern
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

// Context types for different field exceptions
export type FieldContext = 
  | "care-notes"          // PSW care notes
  | "care-sheet"          // PSW care sheet observations
  | "special-instructions" // Client special instructions
  | "patient-info"        // Client patient information
  | "doctor-office"       // Doctor appointment fields (allows phone numbers)
  | "general";            // Generic text field

// User role types
export type UserRole = "admin" | "psw" | "client";

// Result of privacy check
export interface PrivacyCheckResult {
  hasViolation: boolean;
  containsPhone: boolean;
  containsEmail: boolean;
  shouldBlock: boolean;
  message: string | null;
}

/**
 * Check if text contains phone number patterns
 */
export const containsPhoneNumber = (text: string): boolean => {
  if (!text) return false;
  
  for (const pattern of PHONE_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  
  return false;
};

/**
 * Check if text contains email pattern
 */
export const containsEmail = (text: string): boolean => {
  if (!text) return false;
  return EMAIL_PATTERN.test(text);
};

/**
 * Check if text contains any contact information
 */
export const containsContactInfo = (text: string): boolean => {
  return containsPhoneNumber(text) || containsEmail(text);
};

/**
 * Get current user role from dev config or auth context
 * In production, this would check the actual auth state
 */
export const getCurrentUserRole = (): UserRole | null => {
  const devConfig = getDevConfig();
  
  // In dev bypass mode, use the dev role
  if (!devConfig.liveAuthEnabled && devConfig.devRole) {
    return devConfig.devRole;
  }
  
  // In production mode, would return from auth context
  // For now, return null to indicate unknown/guest
  return null;
};

/**
 * Check if current user is admin
 */
export const isAdminUser = (): boolean => {
  const role = getCurrentUserRole();
  return role === "admin";
};

/**
 * Main privacy check function
 * Returns whether the text should be blocked and the appropriate message
 */
export const checkPrivacy = (
  text: string,
  fieldContext: FieldContext,
  userRole?: UserRole
): PrivacyCheckResult => {
  const role = userRole || getCurrentUserRole();
  
  // Default result - no violation
  const defaultResult: PrivacyCheckResult = {
    hasViolation: false,
    containsPhone: false,
    containsEmail: false,
    shouldBlock: false,
    message: null,
  };
  
  if (!text || !text.trim()) return defaultResult;
  
  const hasPhone = containsPhoneNumber(text);
  const hasEmail = containsEmail(text);
  const hasContactInfo = hasPhone || hasEmail;
  
  if (!hasContactInfo) return defaultResult;
  
  // Admin exception - admins can see/enter all contact info
  if (role === "admin") {
    return {
      ...defaultResult,
      containsPhone: hasPhone,
      containsEmail: hasEmail,
      // Admins are NOT blocked, just informed
      hasViolation: false,
      shouldBlock: false,
      message: null,
    };
  }
  
  // Doctor office fields - allow phone numbers for doctor/hospital contacts
  if (fieldContext === "doctor-office") {
    return {
      ...defaultResult,
      containsPhone: hasPhone,
      containsEmail: hasEmail,
      // Doctor office numbers are allowed
      hasViolation: false,
      shouldBlock: false,
      message: null,
    };
  }
  
  // PSW fields - strict blocking
  if (role === "psw") {
    if (fieldContext === "care-notes" || fieldContext === "care-sheet") {
      return {
        hasViolation: true,
        containsPhone: hasPhone,
        containsEmail: hasEmail,
        shouldBlock: true,
        message: "For your privacy, please do not include personal contact information in the notes. Use the office number for all follow-ups.",
      };
    }
  }
  
  // Client fields - warning for special instructions and patient info
  if (role === "client" || !role) {
    if (fieldContext === "special-instructions" || fieldContext === "patient-info") {
      return {
        hasViolation: true,
        containsPhone: hasPhone,
        containsEmail: hasEmail,
        shouldBlock: true,
        message: "To ensure consistent care, please use the office line for all direct communication with staff.",
      };
    }
  }
  
  // General fields - show warning for any role (except admin)
  if (fieldContext === "general" && hasContactInfo) {
    return {
      hasViolation: true,
      containsPhone: hasPhone,
      containsEmail: hasEmail,
      shouldBlock: true,
      message: "For privacy protection, please avoid including personal contact information.",
    };
  }
  
  return defaultResult;
};

/**
 * PSW-specific check - blocks submission if contact info found
 */
export const checkPSWPrivacy = (text: string): PrivacyCheckResult => {
  return checkPrivacy(text, "care-notes", "psw");
};

/**
 * Client-specific check for special instructions
 */
export const checkClientInstructionsPrivacy = (text: string): PrivacyCheckResult => {
  return checkPrivacy(text, "special-instructions", "client");
};

/**
 * Client-specific check for patient info
 */
export const checkClientPatientInfoPrivacy = (text: string): PrivacyCheckResult => {
  return checkPrivacy(text, "patient-info", "client");
};

/**
 * Check if field is a doctor-related field (exceptions allowed)
 */
export const isDoctorField = (fieldName: string): boolean => {
  const doctorFieldPatterns = [
    /doctor/i,
    /hospital/i,
    /clinic/i,
    /physician/i,
    /medical.*office/i,
    /appointment.*office/i,
  ];
  
  return doctorFieldPatterns.some(pattern => pattern.test(fieldName));
};

/**
 * Utility to strip contact info from text (for sanitization if needed)
 */
export const sanitizeContactInfo = (text: string): string => {
  if (!text) return text;
  
  let sanitized = text;
  
  // Replace phone numbers with placeholder
  PHONE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(new RegExp(pattern.source, "g"), "[PHONE REMOVED]");
  });
  
  // Replace emails with placeholder
  sanitized = sanitized.replace(new RegExp(EMAIL_PATTERN.source, "gi"), "[EMAIL REMOVED]");
  
  return sanitized;
};
