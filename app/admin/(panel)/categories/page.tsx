'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tags,
  Languages,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  RefreshCw,
  Loader2,
  Sparkles,
  Inbox,
  Check,
  X,
  User,
  Clock,
  Layers,
  AlertCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { getFastCache, setFastCache } from '@/lib/utils/cache-utils'

interface CategoryItem {
  id: string
  name: string
  type: 'niche' | 'language'
  is_active: boolean
  created_by?: string
  created_at: string
}

interface SuggestionItem {
  id: string
  user_id?: string
  user_name?: string
  user_email?: string
  name: string
  type: 'niche' | 'language'
  status: 'Pending' | 'Approved' | 'Rejected'
  created_at: string
}

export default function AdminCategoriesPage() {
  const [activeTab, setActiveTab] = useState<'niches' | 'languages' | 'suggestions'>('niches')
  const [niches, setNiches] = useState<CategoryItem[]>([])
  const [languages, setLanguages] = useState<CategoryItem[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'niche' | 'language'>('niche')
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null)
  const [formName, setFormName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground && niches.length === 0) setLoading(true)
      const res = await fetch('/api/admin/categories')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load categories')

      setNiches(data.niches || [])
      setLanguages(data.languages || [])
      setSuggestions(data.suggestions || [])
      setFastCache('admin_categories_cache', data)
    } catch (err: any) {
      if (!isBackground) toast.error(err.message || 'Error loading categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const cached = getFastCache<any>('admin_categories_cache')
    if (cached) {
      setNiches(cached.niches || [])
      setLanguages(cached.languages || [])
      setSuggestions(cached.suggestions || [])
      setLoading(false)
      fetchData(true)
    } else {
      fetchData(false)
    }
  }, [])

  const pendingSuggestions = useMemo(() => {
    return suggestions.filter((s) => s.status === 'Pending')
  }, [suggestions])

  const filteredNiches = useMemo(() => {
    return niches.filter((n) => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [niches, searchQuery])

  const filteredLanguages = useMemo(() => {
    return languages.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [languages, searchQuery])

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [suggestions, searchQuery])

  const openAddModal = (type: 'niche' | 'language') => {
    setEditingItem(null)
    setModalType(type)
    setFormName('')
    setModalOpen(true)
  }

  const openEditModal = (item: CategoryItem) => {
    setEditingItem(item)
    setModalType(item.type)
    setFormName(item.name)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error('Name is required')
      return
    }

    setSubmitting(true)
    try {
      if (editingItem) {
        // Update existing
        const res = await fetch('/api/admin/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            name: formName.trim(),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update')
        toast.success(`Updated successfully!`)
      } else {
        // Add new
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            type: modalType,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to add')
        toast.success(`Added "${formName.trim()}" to ${modalType === 'niche' ? 'Niches' : 'Languages'}!`)
      }

      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (item: CategoryItem) => {
    try {
      const nextActive = !item.is_active
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          is_active: nextActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status')
      toast.success(`${item.name} is now ${nextActive ? 'Active' : 'Disabled'}`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      toast.success(`Deleted "${name}"`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  const handleApproveSuggestion = async (s: SuggestionItem) => {
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: s.name,
          type: s.type,
          suggestionId: s.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve suggestion')
      toast.success(`Approved & added "${s.name}" to platform ${s.type === 'niche' ? 'Niches' : 'Languages'}!`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve')
    }
  }

  const handleRejectSuggestion = async (s: SuggestionItem) => {
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: s.id,
          status: 'Rejected',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject suggestion')
      toast.info(`Suggestion "${s.name}" marked as Rejected`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject')
    }
  }

  const handleDeleteSuggestion = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/categories?suggestionId=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete suggestion')
      toast.success('Suggestion removed')
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <SetAdminHeader>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Tags className="h-5 w-5 text-pink-400" /> Categories & Languages
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage official creator niches, languages, and approve creator requests.
          </p>
        </div>
      </SetAdminHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-500/10 via-slate-900 to-slate-900 border border-pink-500/20 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-pink-400">Content Niches</p>
            <p className="text-3xl font-black text-white">{niches.length}</p>
            <p className="text-[11px] text-slate-400">Official creator categories</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Tags className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">Languages</p>
            <p className="text-3xl font-black text-white">{languages.length}</p>
            <p className="text-[11px] text-slate-400">Supported regional dialects</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Languages className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Creator Requests</p>
            <p className="text-3xl font-black text-white">{pendingSuggestions.length}</p>
            <p className="text-[11px] text-slate-400">Pending admin review</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Tabs and Actions Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('niches')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'niches'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tags className="h-3.5 w-3.5" />
              <span>Niches ({niches.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('languages')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'languages'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Languages className="h-3.5 w-3.5" />
              <span>Languages ({languages.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
                activeTab === 'suggestions'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Requests</span>
              {pendingSuggestions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white">
                  {pendingSuggestions.length}
                </span>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-8 h-9 text-xs bg-slate-950 border-white/10 text-white rounded-xl focus-visible:ring-pink-500"
              />
            </div>
            {activeTab === 'niches' && (
              <Button
                onClick={() => openAddModal('niche')}
                className="h-9 px-3.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Niche</span>
              </Button>
            )}
            {activeTab === 'languages' && (
              <Button
                onClick={() => openAddModal('language')}
                className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Language</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => fetchData()}
              className="h-9 px-3 bg-slate-950 border-white/10 text-slate-300 hover:text-white rounded-xl cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Tab 1: Content Niches */}
        {activeTab === 'niches' && (
          <div className="space-y-3 pt-2">
            {loading && niches.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-white/5 bg-slate-950/40 animate-pulse space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5 flex-1">
                        <div className="w-24 h-4 rounded bg-slate-800" />
                        <div className="w-16 h-2.5 rounded bg-slate-800/60" />
                      </div>
                      <div className="w-12 h-4 rounded-full bg-slate-800" />
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/5">
                      <div className="w-12 h-3 rounded bg-slate-800" />
                      <div className="w-10 h-3 rounded bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNiches.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No content niches found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredNiches.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      item.is_active
                        ? 'bg-slate-950/80 border-white/10 hover:border-pink-500/40'
                        : 'bg-slate-950/30 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {item.is_active ? (
                            <span className="text-emerald-400 font-semibold">● Active on Portal</span>
                          ) : (
                            <span className="text-slate-500">○ Hidden</span>
                          )}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 uppercase tracking-wider shrink-0">
                        Niche
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`text-[11px] font-bold transition-colors cursor-pointer ${
                          item.is_active ? 'text-slate-400 hover:text-amber-400' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        {item.is_active ? 'Disable' : 'Enable'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                          title="Rename Niche"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Languages */}
        {activeTab === 'languages' && (
          <div className="space-y-3 pt-2">
            {filteredLanguages.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No languages found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredLanguages.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      item.is_active
                        ? 'bg-slate-950/80 border-white/10 hover:border-indigo-500/40'
                        : 'bg-slate-950/30 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {item.is_active ? (
                            <span className="text-emerald-400 font-semibold">● Active on Portal</span>
                          ) : (
                            <span className="text-slate-500">○ Hidden</span>
                          )}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider shrink-0">
                        Language
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`text-[11px] font-bold transition-colors cursor-pointer ${
                          item.is_active ? 'text-slate-400 hover:text-amber-400' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        {item.is_active ? 'Disable' : 'Enable'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                          title="Rename Language"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Creator Requests & Suggestions */}
        {activeTab === 'suggestions' && (
          <div className="space-y-3 pt-2">
            {filteredSuggestions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Inbox className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p>No creator suggestions found.</p>
                <p className="text-[11px] text-slate-600 mt-0.5">When creators request an unlisted niche or language, it will appear here for 1-click approval.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredSuggestions.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-slate-950/90 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white">{s.name}</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            s.type === 'niche'
                              ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {s.type}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            s.status === 'Approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : s.status === 'Rejected'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-300">
                          <User className="h-3 w-3 text-slate-500" />
                          {s.user_name || 'Creator'} ({s.user_email || 'No email'})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="h-3 w-3" />
                          {new Date(s.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {s.status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveSuggestion(s)}
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg gap-1 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve & Add</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRejectSuggestion(s)}
                            className="h-8 px-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSuggestion(s.id)}
                        className="h-8 px-2 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      modalType === 'niche' ? 'bg-pink-600/20 text-pink-400' : 'bg-indigo-600/20 text-indigo-400'
                    }`}
                  >
                    {modalType === 'niche' ? <Tags className="h-4 w-4" /> : <Languages className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {editingItem ? `Edit ${modalType === 'niche' ? 'Niche' : 'Language'}` : `Add New ${modalType === 'niche' ? 'Niche' : 'Language'}`}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Will be immediately available on all creator profiles
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">
                    {modalType === 'niche' ? 'Niche / Category Name' : 'Language / Regional Dialect Name'} *
                  </Label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={modalType === 'niche' ? 'e.g. Sneakerhead, AI Tools, Pet Care' : 'e.g. Garhwali, Tulu, Sanskrit'}
                    className="h-10 text-xs bg-slate-950 border-white/10 text-white rounded-xl focus-visible:ring-pink-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModalOpen(false)}
                    className="h-9 px-4 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className={`h-9 px-5 text-xs font-bold rounded-xl text-white shadow-sm cursor-pointer ${
                      modalType === 'niche' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : editingItem ? (
                      'Save Changes'
                    ) : (
                      'Add to Platform'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
