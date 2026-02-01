/**
 * Shared validation utilities for edge functions.
 * Provides server-side input validation to prevent injection and ensure data integrity.
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Email regex pattern (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validates that a value is a valid UUID v4
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

/**
 * Validates that a value is a valid email address
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length > 255) return false;
  return EMAIL_REGEX.test(value);
}

/**
 * Validates that a value is a non-empty string within length limits
 */
export function isValidString(
  value: unknown,
  minLength = 1,
  maxLength = 10000
): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

/**
 * Validates password requirements
 * - At least 8 characters
 * - At most 128 characters (prevent DoS)
 */
export function isValidPassword(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return value.length >= 8 && value.length <= 128;
}

/**
 * Sanitizes a string by removing control characters and trimming
 */
export function sanitizeString(value: string): string {
  // Remove control characters (except newlines and tabs)
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

/**
 * Validates content type for moderation
 */
export function isValidContentType(value: unknown): value is "video" | "comment" {
  return value === "video" || value === "comment";
}

/**
 * Validates auth action type
 */
export function isValidAuthAction(value: unknown): value is "signin" | "signup" {
  return value === "signin" || value === "signup";
}

/**
 * Schema-based validation helper
 */
export function validate<T>(
  data: unknown,
  schema: Record<string, (value: unknown) => boolean>,
  fieldNames?: Record<string, string>
): ValidationResult<T> {
  if (typeof data !== "object" || data === null) {
    return { success: false, errors: ["Invalid request body"] };
  }

  const errors: string[] = [];
  const record = data as Record<string, unknown>;

  for (const [field, validator] of Object.entries(schema)) {
    if (!validator(record[field])) {
      const displayName = fieldNames?.[field] || field;
      errors.push(`Invalid ${displayName}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: data as T };
}

/**
 * Creates a validation error response
 */
export function validationErrorResponse(
  errors: string[],
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: "Validation failed", details: errors }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
