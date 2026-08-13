/**
 * Normalizes and extracts a clean Instagram username from any input string.
 * Handles plain handles, @handles, full URLs, query parameters, trailing slashes,
 * and malformed/duplicated link prefixes.
 *
 * Examples:
 * - "creatorrashiii" -> "creatorrashiii"
 * - "@creatorrashiii" -> "creatorrashiii"
 * - "https://www.instagram.com/creatorrashiii" -> "creatorrashiii"
 * - "https://www.instagram.com/creatorrashiii?igsh=MW9nd3Fvcnc1MTJ3dQ%3D%3D" -> "creatorrashiii"
 * - "https://www.instagram.com/https://www.instagram.com/creatorrashiii?igsh=..." -> "creatorrashiii"
 */
export function extractInstagramUsername(input: string | null | undefined): string {
  if (!input) return ''
  let cleaned = input.trim()

  // 1. Remove query string & hash fragment (e.g. ?igsh=..., #...)
  cleaned = cleaned.split('?')[0].split('#')[0].trim()

  // 2. Iteratively strip leading protocol / domain / duplicated prefixes
  let prev = ''
  while (cleaned !== prev) {
    prev = cleaned
    cleaned = cleaned
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/^(m\.)?instagram\.com\//i, '')
      .replace(/^@/, '')
      .trim()
  }

  // 3. Extract the first path segment (the username)
  const segments = cleaned.split('/').filter(Boolean)
  let username = segments[0] || ''

  // Clean any residual '@' or spaces
  username = username.replace(/^@/, '').trim()

  return username
}

/**
 * Returns a standardized full Instagram profile URL.
 * e.g., "https://www.instagram.com/creatorrashiii"
 */
export function getInstagramUrl(input: string | null | undefined): string {
  const username = extractInstagramUsername(input)
  return username ? `https://www.instagram.com/${username}` : ''
}

/**
 * Returns a formatted handle for UI display.
 * e.g., "@creatorrashiii"
 */
export function getInstagramDisplayHandle(input: string | null | undefined): string {
  const username = extractInstagramUsername(input)
  return username ? `@${username}` : ''
}
