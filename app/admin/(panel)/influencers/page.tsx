'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, Filter, ChevronLeft, ChevronRight,
  MapPin, Instagram, Loader2, Mail, Phone
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'

interface Influencer {
  id: string
  full_name: string
  influencer_id: string
  email: string
  mobile: string
  instagram_username: string
  followers: number
  state: string
  city: string
  gender: string
  created_at: string
}

interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
}

// A simple debounce hook inline (if you don't already have one in @/hooks)
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  return debouncedValue
}

export default function InfluencersDirectoryPage() {
  const [loading, setLoading] = useState(true)
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  
  // Controls
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounceValue(searchQuery, 400) // 400ms debounce
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 50 // Constants for this page

  const fetchInfluencers = useCallback(async (page: number, search: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/influencers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
      if (!res.ok) throw new Error('Network response was not ok')
      
      const data = await res.json()
      setInfluencers(data.influencers || [])
      setPagination(data.pagination)
    } catch {
      toast.error('Failed to load influencers')
    } finally {
      setLoading(false)
    }
  }, [])

  // Refetch when page or debounced search changes
  useEffect(() => {
    fetchInfluencers(currentPage, debouncedSearch)
  }, [currentPage, debouncedSearch, fetchInfluencers])



  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-400" />
            Influencer Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Global directory of registered influencers. {pagination?.total ? `Total: ${pagination.total.toLocaleString()}` : 'Loading...'}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, username, email..."
            className="pl-10 bg-slate-900/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl w-full transition-all hover:bg-slate-900/80"
          />
          {loading && searchQuery && (
             <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
             </div>
          )}
        </div>
      </div>

      {/* Directory List */}
      {loading && influencers.length === 0 ? (
         <GlobalLoader text="Loading Influencers..." />
      ) : influencers.length === 0 ? (
        <div className="text-center py-24 rounded-3xl border border-white/5 bg-slate-900/20 border-dashed">
          <Filter className="h-12 w-12 text-slate-600 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-slate-400">No influencers found</h3>
          <p className="text-sm text-slate-500 mt-2">
            {searchQuery ? 'Check your spelling or try broader terms.' : 'No users have registered yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
           {/* Header Row */}
           <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
             <div className="col-span-4">Influencer</div>
             <div className="col-span-3">Contact</div>
             <div className="col-span-3">Social</div>
             <div className="col-span-2 text-right">Location</div>
           </div>

           {/* List */}
           <div className="divide-y divide-white/5 relative">
              {loading && (
                 <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] z-10 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                 </div>
              )}
              {influencers.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Basic Info */}
                  <div className="col-span-1 lg:col-span-4 flex items-center gap-4 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 text-sm font-bold text-indigo-300">
                      {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.full_name || 'Unknown'}</p>
                      <p className="text-[11px] text-slate-500 font-medium font-mono">{user.influencer_id || 'NO-ID'}</p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="col-span-1 lg:col-span-3 flex flex-col justify-center gap-1.5 min-w-0">
                     {user.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-300 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                     )}
                     {user.mobile && (
                         <div className="flex items-center gap-2 text-xs text-slate-300 truncate">
                          <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{user.mobile}</span>
                        </div>
                     )}
                  </div>

                  {/* Socials */}
                  <div className="col-span-1 lg:col-span-3 flex flex-col justify-center gap-1.5 min-w-0">
                     {user.instagram_username && (
                       <div className="flex items-center gap-2 text-xs text-slate-300 truncate">
                         <Instagram className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                         <span className="truncate">@{user.instagram_username}</span>
                       </div>
                     )}
                     <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Users className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>{user.followers > 0 ? user.followers.toLocaleString() : 'No data'}</span>
                     </div>
                  </div>

                  {/* Location */}
                  <div className="col-span-1 lg:col-span-2 flex items-center lg:justify-end gap-2 text-xs text-slate-300 min-w-0">
                     <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                     <span className="truncate">
                       {[user.city, user.state].filter(Boolean).join(', ') || 'N/A'}
                     </span>
                  </div>
                </motion.div>
              ))}
           </div>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
           <p className="text-xs text-slate-400">
             Showing <span className="text-white font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
             <span className="text-white font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
             <span className="text-white font-medium">{pagination.total.toLocaleString()}</span> entries
           </p>
           
           <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loading}
                className="h-9 px-3 border-white/10 bg-slate-900/50 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              
              <div className="flex items-center justify-center min-w-[3rem] px-2 text-sm font-medium text-slate-300">
                 {pagination.page} / {pagination.totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="h-9 px-3 border-white/10 bg-slate-900/50 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
           </div>
        </div>
      )}
    </div>
  )
}
