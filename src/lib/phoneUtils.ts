// Canadian Phone Number Utilities
// Standardizes phone numbers to (XXX) XXX-XXXX format

/**
 * Format a Canadian phone number to (XXX) XXX-XXXX format.
 * Strips country code if present (+1 or 1).
 * Returns original input if not a valid 10-digit number.
 */
export const formatCanadianPhone = (input: string): string => {
  if (!input) return input;
  
  // Strip all non-digits
  let digits = input.replace(/\D/g, "");
  
  // Remove leading country code (1 for Canada/US)
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  
  // Must be exactly 10 digits for Canadian format
  if (digits.length !== 10) {
    return input.trim(); // Return cleaned but not reformatted
  }
  
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

/**
 * Validate a Canadian phone number (10 digits after stripping formatting).
 */
export const isValidCanadianPhone = (input: string): boolean => {
  if (!input) return false;
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits.length === 10;
};

/**
 * Extract raw 10-digit number from formatted phone.
 */
export const extractPhoneDigits = (input: string): string => {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits;
};
