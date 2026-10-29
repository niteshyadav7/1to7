'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface BrandSearchContextType {
  searchQuery: string
  setSearchQuery: (query: string) => void
  placeholder: string
  setPlaceholder: (placeholder: string) => void
  headerSearchRef: React.RefObject<HTMLInputElement | null>
}

const BrandSearchContext = createContext<BrandSearchContextType>({
  searchQuery: '',
  setSearchQuery: () => {},
  placeholder: 'Search creators, campaigns, or SKU...',
  setPlaceholder: () => {},
  headerSearchRef: { current: null },
})

export function BrandSearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [placeholder, setPlaceholder] = useState('Search creators, campaigns, or SKU...')
  const headerSearchRef = useRef<HTMLInputElement | null>(null)
  const pathname = usePathname()

  // Reset search query on route change to keep search clean per page
  useEffect(() => {
    setSearchQuery('')
  }, [pathname])

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        headerSearchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <BrandSearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        placeholder,
        setPlaceholder,
        headerSearchRef,
      }}
    >
      {children}
    </BrandSearchContext.Provider>
  )
}

export function useBrandSearch() {
  return useContext(BrandSearchContext)
}

