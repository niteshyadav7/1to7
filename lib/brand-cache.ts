/**
 * Ultra-fast client-side SWR memory cache for TheHype Brand Portal.
 * Eliminates duplicate network waterfalls and enables 0ms instant tab & deck transitions.
 */

type CacheEntry<T> = {
  data: T
  timestamp: number
}

const memoryCache = new Map<string, CacheEntry<any>>()
const CACHE_TTL_MS = 60 * 1000 // 60 seconds TTL for background freshness

export const brandCache = {
  get<T>(key: string): T | null {
    const entry = memoryCache.get(key)
    if (!entry) return null
    return entry.data as T
  },

  set<T>(key: string, data: T): void {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    })
  },

  has(key: string): boolean {
    return memoryCache.has(key)
  },

  isStale(key: string, customTtlMs = CACHE_TTL_MS): boolean {
    const entry = memoryCache.get(key)
    if (!entry) return true
    return Date.now() - entry.timestamp > customTtlMs
  },

  invalidate(pattern?: string): void {
    if (!pattern) {
      memoryCache.clear()
      return
    }
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key)
      }
    }
  },
}

