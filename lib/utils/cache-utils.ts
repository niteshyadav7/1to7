// Client-Side Fast Cache (In-Memory + Session Storage)
// Provides 0ms instant Stale-While-Revalidate (SWR) performance for creator views

const memoryCache = new Map<string, { data: any; timestamp: number }>()

export function getFastCache<T>(key: string, maxAgeMs = 5 * 60 * 1000): T | null {
  if (typeof window === 'undefined') return null

  // 1. Check memory cache (fastest, 0ms)
  const mem = memoryCache.get(key)
  if (mem) {
    if (Date.now() - mem.timestamp < maxAgeMs) {
      return mem.data as T
    }
  }

  // 2. Check sessionStorage fallback
  try {
    const raw = sessionStorage.getItem(`fast_cache_${key}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && (!parsed.timestamp || Date.now() - parsed.timestamp < maxAgeMs)) {
        // Re-populate memory cache
        memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp || Date.now() })
        return parsed.data as T
      }
    }
  } catch {
    // Ignore storage errors
  }

  return null
}

export function setFastCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return

  const entry = { data, timestamp: Date.now() }
  memoryCache.set(key, entry)

  try {
    sessionStorage.setItem(`fast_cache_${key}`, JSON.stringify(entry))
  } catch {
    // Ignore quota errors
  }
}

export function clearFastCache(key?: string): void {
  if (typeof window === 'undefined') return

  if (key) {
    memoryCache.delete(key)
    try {
      sessionStorage.removeItem(`fast_cache_${key}`)
    } catch {}
  } else {
    memoryCache.clear()
    try {
      // Clear only fast_cache keys
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('fast_cache_')) {
          sessionStorage.removeItem(k)
        }
      })
    } catch {}
  }
}
