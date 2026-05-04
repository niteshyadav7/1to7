import * as SecureStore from 'expo-secure-store'

/**
 * Base API service for 1to7 Media mobile app.
 *
 * Authentication strategy:
 * - On login/signup, the Next.js API sets an httpOnly cookie (`auth_token`).
 * - We extract that cookie value from the `Set-Cookie` response header.
 * - We store it in expo-secure-store and re-send it as a Cookie header on every request.
 * - This means ZERO changes to the existing backend APIs.
 */

// Use the live production backend for the mobile app
export const BASE_URL = 'https://1to7.vercel.app'

const TOKEN_KEY = 'auth_token'

/**
 * Get the stored auth token
 */
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Store the auth token securely
 */
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

/**
 * Remove the auth token (logout)
 */
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

/**
 * Extract auth_token from Set-Cookie header
 */
function extractTokenFromCookies(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null
  // Set-Cookie can have multiple cookies separated by comma or be an array
  const match = setCookieHeader.match(/auth_token=([^;]+)/)
  return match ? match[1] : null
}

/**
 * Core API call function with automatic auth cookie handling
 */
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T; token?: string }> {
  const token = await getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  // Send the stored token as a Cookie header (mimics browser behavior)
  if (token) {
    headers['Cookie'] = `auth_token=${token}`
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    // Important: don't let RN follow redirects automatically
    redirect: 'manual',
  })

  // Try to extract new token from Set-Cookie header (on login/signup)
  const setCookie = response.headers.get('set-cookie')
  const newToken = extractTokenFromCookies(setCookie)
  if (newToken) {
    await setToken(newToken)
  }

  let data: T
  try {
    data = await response.json()
  } catch {
    data = {} as T
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    token: newToken || undefined,
  }
}

/**
 * Convenience methods
 */
export const api = {
  get: <T = any>(endpoint: string) =>
    apiCall<T>(endpoint, { method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any) =>
    apiCall<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any) =>
    apiCall<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
}
