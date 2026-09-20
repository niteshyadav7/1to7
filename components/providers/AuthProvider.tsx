'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface User {
  id: string
  influencer_id: string
  mobile: string
  full_name?: string
  instagram_username?: string
  instagram_profile_pic?: string
  instagram_profiles?: Array<{
    id: string
    username: string
    normalized_username: string
    followers: number
    category?: string
    profile_pic?: string
    is_primary: boolean
    is_verified?: boolean
    created_at?: string
  }>
  email?: string
  gender?: string
  state?: string
  city?: string
  pincode?: string
  followers?: number
  dob?: string
  alt_mobile?: string
  tshirt_size?: string
  shoe_size?: string
  bio?: string
  youtube?: string
  languages?: string
  shipping_addresses?: Array<{
    id: string
    title: string
    recipient_name: string
    mobile: string
    address_line1: string
    address_line2?: string
    landmark?: string
    city: string
    state: string
    pincode: string
    delivery_remarks?: string
    is_default: boolean
    created_at?: string
  }>
  custom_attributes?: Record<string, any>
  account_name?: string
  account_number?: string
  ifsc_code?: string
  pan_card?: string
  pan_card_image?: string
  role?: string
  is_mobile_verified?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (userData: User) => void
  logout: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  getMissingFields: () => string[]
  isProfileComplete: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user_cache')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
    } catch (e) {
      console.error('Error recovering user from local storage:', e)
    }

    // Fetch fresh profile from server using session cookie
    refreshUserProfile().finally(() => {
      setIsLoading(false)

      // Check for Instagram debug data cookie (set during Instagram login callback)
      try {
        const igDebugCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('instagram_debug='))
        if (igDebugCookie) {
          const igData = JSON.parse(decodeURIComponent(igDebugCookie.split('=').slice(1).join('=')))
          console.log('\n%c🔷 ========== INSTAGRAM LOGIN DATA ==========', 'color: #E1306C; font-size: 16px; font-weight: bold;')
          console.log('📦 INSTAGRAM RAW API RESPONSE OBJECT:', igData.raw_profile_from_instagram)
          console.log('🔑 ALL AVAILABLE KEYS FROM INSTAGRAM:', igData.fields_available)
          console.log('✅ PARSED INSTAGRAM OBJECT:', igData.parsed)
          console.log('⏰ LOGIN TIMESTAMP:', igData.timestamp)
          console.log('%c🔷 ==========================================\n', 'color: #E1306C; font-size: 16px; font-weight: bold;')
          
          // Clear the debug cookie after reading
          document.cookie = 'instagram_debug=; path=/; max-age=0'
        }
      } catch (e) {
        console.warn('Could not parse instagram_debug cookie', e)
      }
    })
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user_cache', JSON.stringify(userData))
  }

  const refreshUserProfile = async () => {
    try {
      console.log('[AuthProvider] refreshUserProfile() called')
      const res = await fetch('/api/dashboard/profile')
      console.log('[AuthProvider] /api/dashboard/profile status:', res.status)
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          console.log('📸 FULL USER DATABASE OBJECT:', data.user)
          setUser(data.user)
          localStorage.setItem('user_cache', JSON.stringify(data.user))
          return
        }
      }

      // If unauthorized (401/403) or server indicates invalid session:
      if (res.status === 401 || res.status === 403 || !res.ok) {
        console.warn('[AuthProvider] Session expired or invalid on server - clearing stale user_cache')
        setUser(null)
        localStorage.removeItem('user_cache')
      }
    } catch (e) {
      console.error('[AuthProvider] Failed to refresh profile', e)
    }
  }

  const getMissingFields = () => {
    if (!user) return []
    const requiredFields = [
      'full_name', 'instagram_username', 'gender', 
      'state', 'city', 'followers', 
      'account_name', 'account_number', 'ifsc_code'
    ]
    return requiredFields.filter(field => {
      const val = (user as any)[field]
      if (field === 'followers') return val === undefined || val === null || val === 0 || val === '0'
      return !val || (typeof val === 'string' && val.trim() === '')
    })
  }

  const isProfileComplete = () => {
    return getMissingFields().length === 0
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('Logout error', e)
    } finally {
      setUser(null)
      localStorage.removeItem('user_cache')
      router.push('/')
      router.refresh()
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUserProfile, getMissingFields, isProfileComplete }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
