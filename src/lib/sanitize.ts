/**
 * Sanitizes user input for use in Supabase PostgREST filter strings.
 * This prevents injection attacks when user input is used in .or() filters.
 * 
 * PostgREST filter syntax uses special characters that must be escaped:
 * - Commas (,) separate filter conditions
 * - Parentheses () group conditions
 * - Periods (.) separate column.operator.value
 * - Backslash (\) is the escape character
 */
export function sanitizeForPostgREST(input: string): string {
  // First escape backslashes, then other special characters
  return input
    .replace(/\\/g, '\\\\')    // Escape backslashes first
    .replace(/,/g, '\\,')      // Escape commas
    .replace(/\(/g, '\\(')     // Escape open parens
    .replace(/\)/g, '\\)')     // Escape close parens
    .replace(/\./g, '\\.');    // Escape periods
}

/**
 * Validates that a string is a valid UUID v4 format.
 * Used to validate user IDs before using them in queries.
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Sanitizes input for use in ILIKE patterns.
 * Escapes SQL LIKE pattern special characters.
 */
export function sanitizeForLike(input: string): string {
  return input
    .replace(/%/g, '\\%')     // Escape percent (wildcard)
    .replace(/_/g, '\\_');    // Escape underscore (single char wildcard)
}

/**
 * Combined sanitization for search queries used in PostgREST ILIKE filters.
 */
export function sanitizeSearchQuery(input: string): string {
  // First sanitize LIKE special chars, then PostgREST special chars
  return sanitizeForPostgREST(sanitizeForLike(input));
}
