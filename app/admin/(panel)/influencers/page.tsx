'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  MapPin, Instagram, Loader2, Mail, Phone, Download, CheckCircle2,
  XCircle, User, Banknote, ShieldCheck, Briefcase, Calendar, ChevronDown, Award, AlertTriangle, ExternalLink,
  Tag, Package, Home, Star, FileText, Languages
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/AuthProvider'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { getInstagramDisplayHandle, extractInstagramUsername, getInstagramUrl } from '@/lib/instagram-utils'

// ─── Types ─────────────────────────────────────────────────
export interface ShippingAddress {
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
}

interface Influencer {
  id: string
  full_name: string
  influencer_id: string
  email: string
  mobile: string
  instagram_username: string
  followers: number
  instagram_profiles?: Array<{
    id: string
    username: string
    normalized_username: string
    followers: number
    category?: string
    profile_pic?: string
    is_primary: boolean
  }>
  state: string
  city: string
  gender: string
  category?: string
  languages?: string
  profile_strength: number
  account_name?: string
  account_number?: string
  ifsc_code?: string
  shipping_addresses?: ShippingAddress[]
  address_remarks?: string
  dob?: string
  alt_mobile?: string
  tshirt_size?: string
  shoe_size?: string
  bio?: string
  youtube?: string
  custom_attributes?: Record<string, any>
  is_email_verified: boolean
  is_mobile_verified: boolean
  created_at: string
  profile_photo?: string
  instagram_profile_pic?: string
}

interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface SortConfig {
  column: string
  direction: 'asc' | 'desc'
}

// ─── Hooks ─────────────────────────────────────────────────
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// ─── Profile Modal ─────────────────────────────────────────
function ProfileModal({ user, onClose }: { user: Influencer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 min-w-0 w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header (Cover & Avatar) */}
        <div className="relative h-32 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-b border-white/5 shrink-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mixed-blend-overlay"></div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white backdrop-blur-md transition-colors cursor-pointer z-10">
            <XCircle className="h-5 w-5" />
          </button>
          
          <div className="absolute -bottom-12 left-6 flex items-end gap-4 overflow-visible">
            <div className="h-24 w-24 rounded-2xl bg-slate-900 border-4 border-slate-900 flex items-center justify-center shadow-xl overflow-hidden relative">
              {user.profile_photo || user.instagram_profile_pic ? (
                <img
                  src={user.profile_photo || user.instagram_profile_pic}
                  alt={user.full_name}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-20"></div>
                  <User className="h-10 w-10 text-indigo-400" />
                </>
              )}
            </div>
            <div className="pb-1 text-shadow-sm">
               <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight flex items-center gap-2">
                 {user.full_name}
                 {user.is_email_verified && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
               </h2>
               <p className="text-sm font-mono text-indigo-300 font-medium">#{user.influencer_id}</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="pt-16 p-6 sm:p-8 overflow-y-auto overflow-x-hidden space-y-8">
           
           {/* Section 1: Overview stats */}
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3 text-center">
                 <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Followers</p>
                 <p className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
                   <Users className="h-4 w-4 text-slate-400" />
                   {user.followers > 0 ? user.followers.toLocaleString() : 'N/A'}
                 </p>
              </div>
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3 text-center">
                 <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Profile Strength</p>
                 <p className="text-lg font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                   <Award className="h-4 w-4" />
                   {user.profile_strength}%
                 </p>
              </div>
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3 text-center">
                 <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Location</p>
                 <p className="text-sm font-bold text-white truncate px-1" title={user.city}>
                   {user.city || user.state || 'N/A'}
                 </p>
              </div>
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3 text-center">
                 <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Joined</p>
                 <p className="text-sm font-bold text-white">
                   {new Date(user.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                 </p>
              </div>
           </div>

           {/* Layout Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Contact Information */}
              <div className="space-y-4 min-w-0 w-full">
                 <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                    <User className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-200">Contact & Demographics</h3>
                 </div>
                 
                 <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 w-full">
                       <Mail className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                       <div className="min-w-0 flex-1 w-full">
                         <p className="text-slate-300 font-medium text-[11px] break-all whitespace-normal leading-tight">{user.email}</p>
                         <p className="text-[10px] text-slate-500 mt-0.5">
                           {user.is_email_verified ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</span> : 'Unverified'}
                         </p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3 w-full">
                       <Phone className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                       <div className="min-w-0 flex-1 w-full">
                         <p className="text-slate-300 font-medium text-[11px] break-all whitespace-normal leading-tight">{user.mobile}</p>
                         <p className="text-[10px] text-slate-500 mt-0.5">
                           {user.is_mobile_verified ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</span> : 'Unverified'}
                         </p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3 w-full">
                       <MapPin className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                       <div className="min-w-0 flex-1 w-full">
                         <p className="text-slate-300 font-medium text-[11px] break-words whitespace-normal leading-tight">{user.city ? `${user.city}, ` : ''}{user.state}</p>
                         <p className="text-[10px] text-slate-500 mt-0.5">Location</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3 w-full">
                       <Instagram className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                       <div className="min-w-0 flex-1 w-full">
                         <p className="text-slate-300 font-medium text-[11px] capitalize break-words whitespace-normal leading-tight">{user.gender || 'Not specified'}</p>
                         <p className="text-[10px] text-slate-500 mt-0.5">Gender</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3 w-full">
                       <Tag className="h-4 w-4 text-pink-400 mt-0.5 shrink-0" />
                       <div className="min-w-0 flex-1 w-full">
                         <div className="flex flex-wrap gap-1 mt-0.5">
                           {user.category ? (
                             user.category.split(',').map(c => c.trim()).filter(Boolean).map(cat => (
                               <span key={cat} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                                 {cat}
                               </span>
                             ))
                           ) : (
                             <span className="text-[11px] text-slate-500 italic">No niches specified</span>
                           )}
                         </div>
                         <p className="text-[10px] text-slate-500 mt-1">Content Niches</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3 w-full">
                       <Languages className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                       <div className="min-w-0 flex-1 w-full">
                         <div className="flex flex-wrap gap-1 mt-0.5">
                           {user.languages ? (
                             user.languages.split(',').map(l => l.trim()).filter(Boolean).map(lang => (
                               <span key={lang} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                 {lang}
                               </span>
                             ))
                           ) : (
                             <span className="text-[11px] text-slate-500 italic">No languages specified</span>
                           )}
                         </div>
                         <p className="text-[10px] text-slate-500 mt-1">Languages Spoken</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Socials & Bank */}
              <div className="space-y-6 min-w-0 w-full">
                 
                 {/* Social Media */}
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-400" />
                        <h3 className="text-sm font-bold text-slate-200">Linked Instagram Profiles</h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                        {user.instagram_profiles && user.instagram_profiles.length > 0 ? user.instagram_profiles.length : (user.instagram_username ? 1 : 0)} Linked
                      </span>
                    </div>

                    {user.instagram_profiles && user.instagram_profiles.length > 0 ? (
                      <div className="space-y-2">
                        {user.instagram_profiles.map((prof) => (
                          <a
                            key={prof.id || prof.username}
                            href={getInstagramUrl(prof.username)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 border border-pink-500/30 hover:border-pink-500/60 hover:bg-pink-500/20 rounded-xl p-3 flex items-center gap-3 w-full transition-all cursor-pointer group"
                          >
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                              prof.is_primary ? 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              <Instagram className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1 w-full">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-extrabold text-white break-all whitespace-normal leading-tight group-hover:text-pink-300 transition-colors">
                                  {getInstagramDisplayHandle(prof.username)}
                                </p>
                                {prof.is_primary && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    Primary
                                  </span>
                                )}
                                <ExternalLink className="h-3 w-3 text-pink-400 shrink-0 opacity-80 group-hover:opacity-100 transition-all" />
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-pink-400">
                                <span className="font-bold">{prof.followers > 0 ? `${prof.followers.toLocaleString()} Followers` : '0 Followers'}</span>
                                {prof.category && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-400 truncate">{prof.category}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : user.instagram_username ? (
                      <a
                        href={getInstagramUrl(user.instagram_username)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 border border-pink-500/30 hover:border-pink-500/60 hover:bg-pink-500/20 rounded-xl p-4 flex items-center gap-3 w-full transition-all cursor-pointer group"
                      >
                        <div className="h-10 w-10 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Instagram className="h-5 w-5 text-pink-400" />
                        </div>
                        <div className="min-w-0 flex-1 w-full">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-extrabold text-white break-all whitespace-normal leading-tight group-hover:text-pink-300 transition-colors">
                              {getInstagramDisplayHandle(user.instagram_username)}
                            </p>
                            <ExternalLink className="h-3.5 w-3.5 text-pink-400 shrink-0 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <p className="text-[10px] text-pink-400 mt-1 font-semibold">
                            {user.followers > 0 ? `${user.followers.toLocaleString()} Followers` : 'Follower count unknown'} • Click to view profile
                          </p>
                        </div>
                      </a>
                    ) : (
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3 w-full text-slate-400 text-xs">
                        <Instagram className="h-5 w-5 text-slate-500" />
                        <span>No Instagram handle linked</span>
                      </div>
                    )}
                  </div>

                 {/* Banking Details */}
                 <div className="space-y-4">
                   <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                      <Banknote className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-slate-200">Banking Information</h3>
                   </div>
                   
                   {user.account_name || user.account_number ? (
                     <div className="space-y-2 text-sm bg-slate-800/40 p-4 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-xs">A/C Name</span>
                          <span className="text-slate-300 font-medium truncate ml-4">{user.account_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-xs">A/C Number</span>
                          <span className="text-slate-300 font-mono tracking-wide">{user.account_number}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-xs">IFSC Code</span>
                          <span className="text-slate-300 font-mono">{user.ifsc_code}</span>
                        </div>
                     </div>
                   ) : (
                     <div className="bg-slate-800/40 border border-white/5 border-dashed rounded-xl p-4 text-center">
                       <ShieldCheck className="h-6 w-6 text-slate-600 mx-auto mb-2 opacity-50" />
                       <p className="text-xs text-slate-400">No bank details provided</p>
                     </div>
                   )}
                 </div>

                 {/* Shipping & Delivery Locations */}
                 <div className="space-y-4">
                   <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                      <Package className="h-4 w-4 text-amber-400" />
                      <h3 className="text-sm font-bold text-slate-200">
                        Shipping & Delivery Addresses {user.shipping_addresses?.length ? `(${user.shipping_addresses.length})` : ''}
                      </h3>
                   </div>

                   {user.shipping_addresses && user.shipping_addresses.length > 0 ? (
                     <div className="space-y-2.5">
                       {user.shipping_addresses.map((addr, idx) => (
                         <div key={addr.id || idx} className={`p-3 rounded-xl border text-xs space-y-1.5 ${addr.is_default ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/40 border-white/5'}`}>
                           <div className="flex items-center justify-between">
                             <span className="font-bold text-white flex items-center gap-1.5">
                               {addr.title || 'Address'}
                               {addr.is_default && (
                                 <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                                   Primary
                                 </span>
                               )}
                             </span>
                             {addr.pincode && (
                               <span className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded text-amber-400 border border-amber-500/20 font-bold">
                                 PIN: {addr.pincode}
                               </span>
                             )}
                           </div>

                           <p className="text-slate-300 font-medium">
                             {addr.recipient_name} {addr.mobile ? `• ${addr.mobile}` : ''}
                           </p>

                           <p className="text-slate-400 leading-relaxed">
                             {addr.address_line1} {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                             {addr.landmark ? ` (Landmark: ${addr.landmark})` : ''}
                             {` — ${addr.city}, ${addr.state}`}
                           </p>

                           {addr.delivery_remarks && (
                             <p className="text-[11px] text-amber-300/90 italic bg-slate-900/50 p-1.5 rounded border border-amber-500/10">
                               <strong>Remark:</strong> {addr.delivery_remarks}
                             </p>
                           )}
                         </div>
                       ))}
                     </div>
                   ) : user.address_remarks ? (
                     <div className="p-3 bg-slate-800/40 border border-white/5 rounded-xl text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                       {user.address_remarks}
                     </div>
                   ) : (
                     <div className="bg-slate-800/40 border border-white/5 border-dashed rounded-xl p-3.5 text-center text-xs text-slate-400">
                       No delivery addresses registered
                     </div>
                   )}
                 </div>

              </div>
           </div>
        </div>
      </motion.div>
    </div>
  )
}


// ─── Main Component ────────────────────────────────────────
export default function InfluencersDirectoryPage() {
  const [loading, setLoading] = useState(true)
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [stats, setStats] = useState({ total: 0, verified: 0 })
  
  // Controls
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounceValue(searchQuery, 400)
  const [genderFilter, setGenderFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'created_at', direction: 'desc' })

  // Modal
  const [selectedProfile, setSelectedProfile] = useState<Influencer | null>(null)

  const fetchInfluencers = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: debouncedSearch,
        gender: genderFilter !== 'All' ? genderFilter : '',
        category: categoryFilter !== 'All' ? categoryFilter : '',
        sort: sortConfig.column,
        order: sortConfig.direction
      })
      const res = await fetch(`/api/admin/influencers?${qs}`)
      if (!res.ok) throw new Error('Failed to fetch')
      
      const data = await res.json()
      setInfluencers(data.influencers || [])
      setPagination(data.pagination)
      if (data.stats) setStats(data.stats)
    } catch {
      toast.error('Failed to load influencers')
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch, genderFilter, categoryFilter, sortConfig])

  useEffect(() => {
    fetchInfluencers()
  }, [fetchInfluencers])

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, genderFilter, categoryFilter, pageSize])

  const handleSort = (column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const exportCSV = () => {
    if (influencers.length === 0) return toast.error('No data to export')
    
    const csvRows: string[] = []
    const headers = ['ID', 'Name', 'Email', 'Mobile', 'Instagram', 'Followers', 'Niches / Categories', 'Languages', 'Location', 'Primary PIN', 'Delivery Addresses Remarks', 'Gender', 'Profile Strength', 'Verified', 'Joined']
    csvRows.push(headers.join(','))

    for (const u of influencers) {
      const defaultAddr = u.shipping_addresses?.find(a => a.is_default) || u.shipping_addresses?.[0]
      const row = [
        `"${u.influencer_id}"`,
        `"${u.full_name}"`,
        `"${u.email}"`,
        `"${u.mobile}"`,
        `"${getInstagramDisplayHandle(u.instagram_username)}"`,
        u.followers,
        `"${u.category || ''}"`,
        `"${u.languages || ''}"`,
        `"${u.city ? u.city + ', ' : ''}${u.state || ''}"`,
        `"${defaultAddr?.pincode || ''}"`,
        `"${(u.address_remarks || '').replace(/"/g, '""').replace(/\n/g, ' | ')}"`,
        `"${u.gender || ''}"`,
        `"${u.profile_strength}%"`,
        `"${u.is_email_verified ? 'Yes' : 'No'}"`,
        `"${new Date(u.created_at).toISOString().split('T')[0]}"`
      ]
      csvRows.push(row.join(','))
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `influencers_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Current list exported to CSV')
  }

  // Helpers
  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.column !== column) return <ChevronDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
    return sortConfig.direction === 'asc' ? <ChevronDown className="h-3 w-3 rotate-180 text-indigo-400" /> : <ChevronDown className="h-3 w-3 text-indigo-400" />
  }

  const thClass = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"

  return (
    <div className="space-y-5 pb-24 relative">
      <AnimatePresence>
        {selectedProfile && <ProfileModal user={selectedProfile} onClose={() => setSelectedProfile(null)} />}
      </AnimatePresence>

      {/* Header Injection */}
      <SetAdminHeader>
        <div className="flex items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Influencers Directory</h1>
            <p className="text-xs text-slate-400">Manage and view comprehensive profiles of onboarded creators</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="h-9 rounded-xl bg-slate-800/80 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs cursor-pointer">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </SetAdminHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-4 shadow-lg shadow-indigo-500/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Creators</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
        </div>
        
        <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-4 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Verified Emails</span>
          </div>
          <div className="flex items-end gap-2">
             <p className="text-2xl font-bold text-white">{stats.verified.toLocaleString()}</p>
             <p className="text-xs text-slate-500 mb-1">{stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}% completion</p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-4 shadow-lg shadow-pink-500/5">
           <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/20 to-orange-500/20 border border-pink-500/20">
              <Instagram className="h-3.5 w-3.5 text-pink-400" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Visible Results</span>
          </div>
          <p className="text-2xl font-bold text-white">{pagination?.total.toLocaleString() || 0}</p>
        </div>
        
        <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-4 shadow-lg shadow-slate-500/5">
           <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500/20 to-slate-400/20 border border-slate-500/20">
              <Award className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Global Reach</span>
          </div>
          <p className="text-2xl font-bold text-white uppercase opacity-80">Beta</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search names, IDs, emails, mobiles..." 
            className="pl-9 h-11 bg-slate-900/50 border-white/5 focus-visible:ring-indigo-500 rounded-xl w-full text-sm" 
          />
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
           {['All', 'Male', 'Female'].map(g => (
             <button key={g} onClick={() => setGenderFilter(g)}
              className={`px-3.5 h-11 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                genderFilter === g ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
              }`}>
               {g}
             </button>
           ))}

           {/* Category / Niche Filter */}
           <div className="relative">
             <select
               value={categoryFilter}
               onChange={(e) => setCategoryFilter(e.target.value)}
               className="px-3.5 h-11 rounded-xl text-xs font-medium border border-white/5 bg-slate-900/50 text-slate-300 hover:bg-slate-900/80 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer pr-8 appearance-none"
             >
               <option value="All" className="bg-slate-900 text-white">All Niches</option>
               <option value="Fashion" className="bg-slate-900 text-white">Fashion & Style</option>
               <option value="Beauty" className="bg-slate-900 text-white">Beauty & Skincare</option>
               <option value="Fitness" className="bg-slate-900 text-white">Fitness & Health</option>
               <option value="Food" className="bg-slate-900 text-white">Food & Cooking</option>
               <option value="Travel" className="bg-slate-900 text-white">Travel & Adventure</option>
               <option value="Tech" className="bg-slate-900 text-white">Tech & Gadgets</option>
               <option value="Gaming" className="bg-slate-900 text-white">Gaming</option>
               <option value="Lifestyle" className="bg-slate-900 text-white">Lifestyle</option>
               <option value="Entertainment" className="bg-slate-900 text-white">Entertainment</option>
               <option value="Photography" className="bg-slate-900 text-white">Photography</option>
               <option value="Education" className="bg-slate-900 text-white">Education</option>
             </select>
             <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
           </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-lg overflow-hidden shadow-xl shadow-black/10 relative">
         {loading && (
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
         )}
         
         <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                 <tr className="border-b border-white/[0.06] bg-slate-950/40">
                   <th className={thClass}>
                     <button onClick={() => handleSort('full_name')} className="flex items-center gap-1.5 group cursor-pointer">
                       Creator <SortIcon column="full_name" />
                     </button>
                   </th>
                   <th className={thClass}>Contact</th>
                   <th className={thClass}>
                     <button onClick={() => handleSort('followers')} className="flex items-center gap-1.5 group cursor-pointer">
                       Social <SortIcon column="followers" />
                     </button>
                   </th>
                   <th className={thClass}>Status</th>
                   <th className={thClass}>
                     <button onClick={() => handleSort('created_at')} className="flex items-center gap-1.5 group cursor-pointer">
                       Joined <SortIcon column="created_at" />
                     </button>
                   </th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.03]">
                 {influencers.length === 0 && !loading ? (
                   <tr>
                     <td colSpan={5} className="py-16 text-center">
                        <User className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-slate-400">No influencers found</h3>
                        <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search term</p>
                     </td>
                   </tr>
                 ) : (
                   influencers.map((user, i) => (
                     <motion.tr 
                       key={user.id} 
                       onClick={() => setSelectedProfile(user)}
                       initial={{ opacity: 0 }} 
                       animate={{ opacity: 1 }} 
                       transition={{ delay: Math.min(i * 0.02, 0.1) }}
                       className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                     >
                       {/* Creator Profile */}
                       <td className="px-4 py-3 border-l-2 border-transparent group-hover:border-indigo-500 transition-colors">
                         <div className="flex items-center gap-3">
                            {user.profile_photo || user.instagram_profile_pic ? (
                              <img
                                src={user.profile_photo || user.instagram_profile_pic}
                                alt={user.full_name}
                                className="h-9 w-9 rounded-xl object-cover shrink-0 border border-white/10 shadow-md"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/10 text-sm font-bold text-indigo-400 shrink-0">
                                {user.full_name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                           <div className="min-w-0">
                             <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                               {user.full_name}
                               <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${user.profile_strength >= 80 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                 {user.profile_strength}%
                               </span>
                             </p>
                             <p className="text-[11px] text-slate-500 font-mono mt-0.5">{user.influencer_id}</p>
                             {user.category && (
                               <div className="flex flex-wrap gap-1 mt-1">
                                 {user.category.split(',').map(c => c.trim()).filter(Boolean).slice(0, 2).map(cat => (
                                   <span key={cat} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-pink-500/10 text-pink-300 border border-pink-500/20 truncate max-w-[100px]">
                                     {cat}
                                   </span>
                                 ))}
                                 {user.category.split(',').map(c => c.trim()).filter(Boolean).length > 2 && (
                                   <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-400">
                                     +{user.category.split(',').map(c => c.trim()).filter(Boolean).length - 2}
                                   </span>
                                 )}
                               </div>
                             )}
                           </div>
                         </div>
                       </td>
                       
                       {/* Contact Info */}
                       <td className="px-4 py-3 max-w-[200px]">
                         <div className="flex items-center gap-2 text-[12px] text-slate-300 mb-1">
                           <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                           <span className="truncate" title={user.email}>{user.email}</span>
                         </div>
                         <div className="flex items-center gap-2 text-[12px] text-slate-300">
                           <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                           <span className="truncate">{user.mobile}</span>
                         </div>
                       </td>
                       
                       {/* Social */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="flex items-center gap-2 text-[12px] text-slate-300 mb-1">
                            <Instagram className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                            {user.instagram_username ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <a
                                  href={getInstagramUrl(user.instagram_username)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="truncate font-semibold text-slate-200 hover:text-pink-400 hover:underline transition-colors flex items-center gap-1"
                                  title={getInstagramDisplayHandle(user.instagram_username)}
                                >
                                  <span>{getInstagramDisplayHandle(user.instagram_username)}</span>
                                  <ExternalLink className="h-3 w-3 text-pink-400 shrink-0 inline" />
                                </a>
                                {user.instagram_profiles && user.instagram_profiles.length > 1 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40 shrink-0">
                                    +{user.instagram_profiles.length - 1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="truncate text-slate-500">N/A</span>
                            )}
                          </div>
                         <div className="flex items-center gap-2 text-[11px] text-slate-400">
                           <Users className="h-3 w-3 text-slate-500 shrink-0" />
                           <span className="truncate">{user.followers > 0 ? user.followers.toLocaleString() : '—'}</span>
                         </div>
                       </td>

                       {/* Status Blocks */}
                       <td className="px-4 py-3">
                         <div className="flex flex-col gap-1.5 items-start">
                           {user.is_email_verified ? (
                             <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"><CheckCircle2 className="h-3 w-3" /> Email Verified</span>
                           ) : (
                             <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700"><XCircle className="h-3 w-3" /> Unverified Email</span>
                           )}
                           {user.account_number ? (
                             <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"><Banknote className="h-3 w-3" /> Bank Added</span>
                           ) : (
                             <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"><AlertTriangle className="h-3 w-3" /> No Bank</span>
                           )}
                         </div>
                       </td>

                       {/* Location & Dates */}
                       <td className="px-4 py-3">
                         <p className="text-[12px] font-medium text-slate-300 truncate">
                           {user.city ? `${user.city}, ` : ''}{user.state || 'N/A'}
                         </p>
                         <p className="text-[11px] text-slate-500 mt-1">
                           {new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                         </p>
                       </td>
                     </motion.tr>
                   ))
                 )}
               </tbody>
            </table>
         </div>

         {/* Pagination Footer */}
         {pagination && (
           <div className="border-t border-white/[0.05] bg-slate-950/50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Total: {pagination.total.toLocaleString()}</span>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select 
                    value={pageSize} 
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="bg-slate-800 border border-white/10 text-white rounded-lg px-2 py-1 leading-none h-7 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
             </div>

             {/* Page controls */}
             <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 cursor-pointer"><ChevronsLeft className="h-4 w-4" /></button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
                
                <div className="flex gap-1 mx-2">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pn = i + 1;
                    if (pagination.totalPages > 5) {
                      if (pagination.page > 3) pn = pagination.page - 2 + i;
                      if (pagination.page > pagination.totalPages - 2) pn = pagination.totalPages - 4 + i;
                    }
                    return (
                      <button key={pn} onClick={() => setCurrentPage(pn)}
                        className={`min-w-[28px] h-7 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          pagination.page === pn ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}>{pn}</button>
                    )
                  })}
                </div>

                <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setCurrentPage(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 cursor-pointer"><ChevronsRight className="h-4 w-4" /></button>
             </div>
           </div>
         )}
      </div>
    </div>
  )
}
