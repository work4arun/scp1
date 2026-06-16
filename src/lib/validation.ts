// Shared validation helpers

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns `null` if valid, or an error message string. */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!EMAIL_RE.test(trimmed)) return "Please enter a valid email address.";
  return null;
}

/** Validates email and returns trimmed value. Throws with a user-friendly message if invalid. */
export function requireValidEmail(email: string): string {
  const err = validateEmail(email);
  if (err) throw new Error(err);
  return email.trim();
}