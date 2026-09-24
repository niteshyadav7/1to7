// Client-Side Fast Cache (In-Memory + Session Storage + Local Storage Cross-Tab Sync)
// Provides 0ms instant Stale-While-Revalidate (SWR) performance across admin & creator views

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

  // 2. Check sessionStorage
  try {
    const raw = sessionStorage.getItem(`fast_cache_${key}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && (!parsed.timestamp || Date.now() - parsed.timestamp < maxAgeMs)) {
        memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp || Date.now() })
        return parsed.data as T
      }
    }
  } catch {
    // Ignore storage errors
  }

  // 3. Check localStorage (allows instant cache across multiple open tabs)
  try {
    const rawLocal = localStorage.getItem(`fast_cache_${key}`)
    if (rawLocal) {
      const parsedLocal = JSON.parse(rawLocal)
      if (parsedLocal && (!parsedLocal.timestamp || Date.now() - parsedLocal.timestamp < maxAgeMs)) {
        memoryCache.set(key, { data: parsedLocal.data, timestamp: parsedLocal.timestamp || Date.now() })
        return parsedLocal.data as T
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

  const serialized = JSON.stringify(entry)
  try {
    sessionStorage.setItem(`fast_cache_${key}`, serialized)
  } catch {
    // Ignore quota errors
  }

  try {
    localStorage.setItem(`fast_cache_${key}`, serialized)
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
    try {
      localStorage.removeItem(`fast_cache_${key}`)
    } catch {}
  } else {
    memoryCache.clear()
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('fast_cache_')) {
          sessionStorage.removeItem(k)
        }
      })
    } catch {}
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('fast_cache_')) {
          localStorage.removeItem(k)
        }
      })
    } catch {}
  }
}

