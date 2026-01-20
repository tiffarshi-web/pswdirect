// Privacy Utilities
// Helpers for masking personal information in communications

/**
 * Extract first name only from a full name for privacy masking
 * Used in client-facing communications to protect PSW identity
 */
export const getFirstNameOnly = (fullName: string): string => {
  if (!fullName || !fullName.trim()) return "Your Caregiver";
  const firstName = fullName.trim().split(/\s+/)[0];
  return firstName || "Your Caregiver";
};

/**
 * Mask an email address for display
 * e.g., "john.doe@example.com" -> "j***@example.com"
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
};

/**
 * Mask a phone number for display
 * e.g., "(416) 555-1234" -> "(***) ***-1234"
 */
export const maskPhone = (phone: string): string => {
  if (!phone) return "***";
  // Keep only last 4 digits visible
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length < 4) return "***";
  const last4 = digitsOnly.slice(-4);
  return `(***) ***-${last4}`;
};

/**
 * Mask an address for pre-claim job display
 * Shows only city/area, not full street address
 */
export const maskAddress = (fullAddress: string) => {
  if (!fullAddress) return "Service Area";
  // Try to extract city from address (usually after last comma or before postal code)
  const parts = fullAddress.split(",");
  if (parts.length >= 2) {
    // Return city/area (second to last part typically)
    const cityPart = parts[parts.length - 2]?.trim() || parts[0]?.trim();
    return `${cityPart} Area`;
  }
  return "Service Area";
};

/**
 * Mask client name for pre-claim job display
 */
export const maskClientName = (): string => {
  return "New Care Request";
};
