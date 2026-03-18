'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface User {
  id: string
  influencer_id: string
  mobile: string
  full_name?: string
  instagram_username?: string
  email?: string
  gender?: string
  state?: string
  city?: string
  followers?: number
  account_name?: string
  account_number?: string
  ifsc_code?: string
  role?: string
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
    // Basic initialization: checking if we have a token (since it's httpOnly, 
    // we can't read it directly from JS, so we'd normally call a /me endpoint. 
    // In this sprint we'll rely on explicit login/logout for state, or add a /me endpoint if needed).
    
    // Attempt local storage sync (optional based on your preference vs true secure session check)
    try {
      const storedUser = localStorage.getItem('user_cache')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
    } catch (e) {
      console.error('Error recovering user from local storage:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user_cache', JSON.stringify(userData))
  }

  const refreshUserProfile = async () => {
    try {
      const res = await fetch('/api/dashboard/profile')
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        localStorage.setItem('user_cache', JSON.stringify(data.user))
      }
    } catch (e) {
      console.error('Failed to refresh profile', e)
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
