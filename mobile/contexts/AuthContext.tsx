import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, useSegments } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, getToken, clearToken } from '@/services/api'
import type { User } from '@/types'

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

/**
 * AuthProvider — mirrors the website's AuthProvider.tsx exactly.
 * Handles auto-login on app launch via stored token.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  // Auto-login: check for stored token on launch
  useEffect(() => {
    checkAuth()
  }, [])

  // Route protection: redirect based on auth state
  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'

    // Don't redirect if on onboarding
    if (inOnboarding) return

    if (!user && !inAuthGroup) {
      // Not logged in and not on auth screen → check onboarding first
      AsyncStorage.getItem('onboarding_complete').then(value => {
        if (value !== 'true') {
          router.replace('/onboarding')
        } else {
          router.replace('/(auth)/login')
        }
      })
    } else if (user && inAuthGroup) {
      // Logged in but on auth screen → redirect to dashboard
      router.replace('/(tabs)/home')
    }
  }, [user, segments, isLoading])

  const checkAuth = async () => {
    try {
      const token = await getToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      // Verify token by fetching profile
      const { ok, data } = await api.get('/api/dashboard/profile')
      if (ok && data.user) {
        setUser(data.user)
      } else {
        // Token expired or invalid
        await clearToken()
      }
    } catch (e) {
      console.error('Auth check failed:', e)
      await clearToken()
    } finally {
      setIsLoading(false)
    }
  }

  const login = useCallback((userData: User) => {
    setUser(userData)
  }, [])

  const refreshUserProfile = useCallback(async () => {
    try {
      const { ok, data } = await api.get('/api/dashboard/profile')
      if (ok && data.user) {
        setUser(data.user)
      }
    } catch (e) {
      console.error('Failed to refresh profile', e)
    }
  }, [])

  const getMissingFields = useCallback(() => {
    if (!user) return []
    const requiredFields = [
      'full_name', 'instagram_username', 'gender',
      'state', 'city', 'followers',
      'account_name', 'account_number', 'ifsc_code'
    ]
    return requiredFields.filter(field => {
      const val = (user as any)[field]
      if (field === 'followers') return val === undefined || val === null || val === 0
      return !val || (typeof val === 'string' && val.trim() === '')
    })
  }, [user])

  const isProfileComplete = useCallback(() => {
    return getMissingFields().length === 0
  }, [getMissingFields])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } catch (e) {
      console.error('Logout error', e)
    } finally {
      setUser(null)
      await clearToken()
      router.replace('/(auth)/login')
    }
  }, [])

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
