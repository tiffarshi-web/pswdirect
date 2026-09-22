// Shared password strength rules for account creation.
// Mirrors the server-side check in supabase/functions/register-psw so applicants
// never reach the final submit step with a password the auth service will reject.

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd", "123456", "1234567",
  "12345678", "123456789", "1234567890", "qwerty", "qwerty123", "abc123",
  "letmein", "welcome", "welcome1", "iloveyou", "admin123", "monkey",
  "sunshine", "princess", "football", "baseball", "dragon", "master",
  "canada123", "toronto1", "changeme", "test1234", "psw12345",
]);

export const PASSWORD_REQUIREMENTS =
  "At least 8 characters, including a letter and a number.";

/** Returns an error message, or null when the password is acceptable. */
export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  const normalized = password.toLowerCase().trim();
  if (COMMON_PASSWORDS.has(normalized)) {
    return "This password is too common. Please choose something harder to guess.";
  }
  if (/^(.)\1+$/.test(password)) {
    return "Password cannot be the same character repeated.";
  }
  return null;
}
