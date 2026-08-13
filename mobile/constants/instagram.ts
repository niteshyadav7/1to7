export function extractInstagramUsername(input: string | null | undefined): string {
  if (!input) return ''
  let cleaned = input.trim()

  // 1. Remove query string & hash fragment
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

  return username.replace(/^@/, '').trim()
}
