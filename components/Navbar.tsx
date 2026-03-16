'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import Link from 'next/link'


export function Navbar() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()

  return (
    <nav className="border-b px-6 py-4 flex justify-between items-center bg-white shadow-sm z-50 relative">
      <Link href="/" className="font-bold text-2xl text-blue-900 tracking-tight">
        1to7 Media
      </Link>

      <div className="flex items-center space-x-4">
        {isLoading ? (
          <div className="h-9 w-24 bg-gray-200 animate-pulse rounded-md"></div>
        ) : user ? (
          <>
            <div className="flex items-center space-x-3 text-sm font-medium mr-4">
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                {user.full_name?.charAt(0) || user.mobile.charAt(0)}
              </div>
              <span className="hidden md:inline-block text-gray-700">
                {user.full_name || user.mobile}
              </span>
            </div>
            <Button variant="ghost" onClick={async () => await logout()}>
              Log Out
            </Button>
            <Button onClick={() => router.push('/dashboard')}>
              Dashboard
            </Button>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={() => router.push('/login')}>
              Login
            </Button>
            <Button onClick={() => router.push('/signup')}>
              Sign Up
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
