'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface AdminHeaderContextType {
  headerContent: React.ReactNode
  setHeaderContent: (content: React.ReactNode) => void
}

const AdminHeaderContext = createContext<AdminHeaderContextType>({
  headerContent: null,
  setHeaderContent: () => {},
})

export function AdminHeaderProvider({ children }: { children: React.ReactNode }) {
  const [headerContent, setHeaderContent] = useState<React.ReactNode>(null)

  return (
    <AdminHeaderContext.Provider value={{ headerContent, setHeaderContent }}>
      {children}
    </AdminHeaderContext.Provider>
  )
}

export function useAdminHeader() {
  return useContext(AdminHeaderContext)
}

export function SetAdminHeader({ children }: { children: React.ReactNode }) {
  const { setHeaderContent } = useAdminHeader()

  useEffect(() => {
    setHeaderContent(children)
    return () => setHeaderContent(null)
  }, [children, setHeaderContent])

  return null
}
