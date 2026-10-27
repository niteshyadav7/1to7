'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Plus,
  Search,
  Users,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Filter,
  Download,
  Share2,
  Copy,
  MessageCircle,
  Trash2,
  KeyRound,
  Lock,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'

interface BrandWorkspace {
  id: string
  name: string
  slug: string
  industry: string
  initials: string
  color: string
  assignedKam: string
  primaryContact: string
  email: string
  phone?: string
  password?: string
  activeCampaigns: number
  pendingReviews: number
  status: 'active' | 'paused'
}

interface KamOption {
  id: string
  name: string
  email: string
  role: string
}

export default function ClientBrandsDirectoryPage() {
  const [brands, setBrands] = useState<BrandWorkspace[]>([])
  const [kams, setKams] = useState<KamOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // KAM Role formatting and dedicated highlight filter
  const formatKamRole = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'brand_superadmin':
      case 'super_admin':
        return 'Super Admin'
      case 'kam_lead':
        return 'KAM Lead'
      case 'brand_ops':
        return 'Brand Ops'
      case 'kam':
        return 'KAM'
      case 'viewer':
        return 'Operations'
      default:
        return (role || 'KAM').toUpperCase()
    }
  }

  const isDedicatedKam = (role: string) =>
    ['brand_superadmin', 'super_admin', 'kam_lead', 'brand_ops', 'kam'].includes((role || '').toLowerCase())

  const dedicatedKams = kams.filter((k) => isDedicatedKam(k.role))
  const otherStaff = kams.filter((k) => !isDedicatedKam(k.role))

  // Password Setup & Credentials Modal State
  const [selectedBrandForCreds, setSelectedBrandForCreds] = useState<BrandWorkspace | null>(null)
  const [customPasswordInput, setCustomPasswordInput] = useState('')
  const [showPasswordInModal, setShowPasswordInModal] = useState(false)

  // Delete Confirmation Modal State
  const [brandToDelete, setBrandToDelete] = useState<BrandWorkspace | null>(null)
  const [bulkDeleteRows, setBulkDeleteRows] = useState<BrandWorkspace[] | null>(null)

  // New Brand Form State
  const [newName, setNewName] = useState('')
  const [newIndustry, setNewIndustry] = useState('')
  const [newContact, setNewContact] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPassword, setNewPassword] = useState('brand123')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [newKamId, setNewKamId] = useState('')

  // Fetch real brands & KAM staff directly from PostgreSQL DB
  const fetchBrands = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/brand-admin/brands')
      const data = await res.json()
      if (res.ok && Array.isArray(data.brands)) {
        setBrands(data.brands)
      } else {
        setBrands([])
      }
      if (res.ok && Array.isArray(data.kams)) {
        setKams(data.kams)
        if (data.kams.length > 0) {
          setNewKamId((prev) => prev || data.kams[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load brands from DB:', err)
      setBrands([])
    } finally {
      setLoading(false)
      setIsLoaded(true)
    }
  }

  useEffect(() => {
    fetchBrands()
  }, [])

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newEmail) {
      toast.error('Brand name and email are required')
      return
    }

    const passwordToUse = newPassword.trim() || 'brand123'
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/brand-admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          industry: newIndustry,
          primaryContact: newContact,
          email: newEmail,
          phone: newPhone,
          password: passwordToUse,
          assignedKamId: newKamId || null,
        }),
      })

      const data = await res.json()
      if (res.ok && data.brand) {
        setBrands([data.brand, ...brands])
        setIsAddModalOpen(false)
        setNewName('')
        setNewIndustry('')
        setNewContact('')
        setNewEmail('')
        setNewPhone('')
        setNewPassword('brand123')
        if (kams.length > 0) {
          setNewKamId(kams[0].id)
        } else {
          setNewKamId('')
        }

        toast.success(`Successfully saved ${data.brand.name} to Database!`, {
          description: `Login: ${data.brand.email} | Password: ${passwordToUse}`,
          action: {
            label: 'Copy Login',
            onClick: () => {
              const creds = `1to7 Brand Portal Access\nURL: ${typeof window !== 'undefined' ? window.location.origin : ''}/brand/login\nEmail: ${data.brand.email}\nPassword: ${passwordToUse}`
              navigator.clipboard.writeText(creds)
              toast.success('Credentials copied to clipboard!')
            },
          },
        })
      } else {
        toast.error(data.error || 'Failed to create brand in database')
      }
    } catch {
      toast.error('Network error creating brand workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!brandToDelete) return
    try {
      const res = await fetch(`/api/brand-admin/brands?id=${brandToDelete.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setBrands(brands.filter((b) => b.id !== brandToDelete.id))
        toast.success(`Deleted workspace "${brandToDelete.name}" from database`)
      } else {
        toast.error('Failed to delete brand workspace from database')
      }
    } catch {
      toast.error('Network error deleting brand workspace')
    } finally {
      setBrandToDelete(null)
    }
  }

  const handleConfirmBulkDelete = async () => {
    if (!bulkDeleteRows || bulkDeleteRows.length === 0) return
    const idsToDelete = bulkDeleteRows.map((r) => r.id)
    try {
      const res = await fetch('/api/brand-admin/brands', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      })
      if (res.ok) {
        const idSet = new Set(idsToDelete)
        setBrands(brands.filter((b) => !idSet.has(b.id)))
        toast.success(`Deleted ${bulkDeleteRows.length} brand workspaces from database`)
      } else {
        toast.error('Failed to bulk delete brand workspaces')
      }
    } catch {
      toast.error('Network error deleting brand workspaces')
    } finally {
      setBulkDeleteRows(null)
    }
  }

  const handleToggleStatus = async (brand: BrandWorkspace) => {
    const nextStatus = brand.status === 'active' ? 'paused' : 'active'
    try {
      const res = await fetch('/api/brand-admin/brands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: brand.id, status: nextStatus }),
      })
      if (res.ok) {
        setBrands(
          brands.map((b) =>
            b.id === brand.id ? { ...b, status: nextStatus as 'active' | 'paused' } : b
          )
        )
        toast.success(`${brand.name} status updated to ${nextStatus.toUpperCase()}`)
      } else {
        toast.error('Failed to update brand status in database')
      }
    } catch {
      toast.error('Network error updating brand status')
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrandForCreds) return
    const updatedPass = customPasswordInput.trim() || 'brand123'
    try {
      const res = await fetch('/api/brand-admin/brands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedBrandForCreds.id, password: updatedPass }),
      })
      if (res.ok) {
        setBrands(
          brands.map((b) =>
            b.id === selectedBrandForCreds.id ? { ...b, password: updatedPass } : b
          )
        )
        setSelectedBrandForCreds({ ...selectedBrandForCreds, password: updatedPass })
        toast.success(`Password for ${selectedBrandForCreds.name} updated in Database!`)
      } else {
        toast.error('Failed to update brand password in database')
      }
    } catch {
      toast.error('Network error updating password')
    }
  }

  const handleCopyCredentialsMessage = (brand: BrandWorkspace) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const msg = `👋 Hi ${brand.primaryContact || 'Brand Partner'},\n\nHere are your official 1to7 Brand Portal credentials:\n🔗 Portal Login: ${origin}/brand/login\n📧 Login Email: ${brand.email}\n🔑 Password: ${brand.password || 'brand123'}\n\n💡 Tip: You can also use our 1-Click WhatsApp Review links or Work Email OTP for zero-friction access!`
    navigator.clipboard.writeText(msg)
    toast.success(`Copied login credentials message for ${brand.name}!`)
  }

  const handleCopyBrandMagicLink = async (brand: BrandWorkspace) => {
    try {
      const res = await fetch('/api/brand-admin/campaign-pitches/generate-review-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brand.id,
          brand_name: brand.name,
          brand_slug: brand.slug,
          contact_name: brand.primaryContact,
          contact_email: brand.email,
        }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        navigator.clipboard.writeText(data.url)
        toast.success(`Copied 1-Click WhatsApp Review Link for ${brand.name} (${brand.primaryContact})!`)
      } else {
        toast.error(data.error || 'Failed to generate link')
      }
    } catch {
      toast.error('Network error generating client link')
    }
  }

  const handleWhatsAppBrand = async (brand: BrandWorkspace) => {
    try {
      const res = await fetch('/api/brand-admin/campaign-pitches/generate-review-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brand.id,
          brand_name: brand.name,
          brand_slug: brand.slug,
          contact_name: brand.primaryContact,
          contact_email: brand.email,
        }),
      })
      const data = await res.json()
      if (res.ok && data.whatsappMessage) {
        const encoded = encodeURIComponent(data.whatsappMessage)
        window.open(`https://wa.me/?text=${encoded}`, '_blank')
      } else {
        toast.error(data.error || 'Failed to generate WhatsApp link')
      }
    } catch {
      toast.error('Network error generating WhatsApp link')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold mb-2">
            <Building2 className="w-3 h-3" />
            Brand Accounts Directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Client Brands Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Manage enterprise brand workspaces, track review bottlenecks, setup login passwords, and enter Virtual Brand mode.
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold text-xs h-10 shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Brand Workspace
        </Button>
      </div>

      {/* Dynamic Data Table for Client Brands */}
      <DynamicDataTable
        loading={loading}
        emptyMessage="No brand workspaces onboarded in database yet. Click '+ Add Brand Workspace' to create your first brand client."
        data={brands}
        columns={[
          {
            key: 'name',
            header: 'Brand Workspace',
            sortable: true,
            render: (brand) => (
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${brand.color} flex items-center justify-center text-white font-black text-[10px] shadow-sm shrink-0`}
                >
                  {brand.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-[11px] truncate max-w-[150px]" title={brand.name}>{brand.name}</div>
                  <div className="text-[10px] text-neutral-400 truncate">{brand.industry}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'assignedKam',
            header: 'Assigned 1to7 KAM',
            sortable: true,
            render: (brand) => {
              const isAssigned = brand.assignedKam && brand.assignedKam !== 'Unassigned'
              return (
                <div className="min-w-0 space-y-1">
                  {isAssigned ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/40 shadow-sm">
                      <span className="w-5 h-5 rounded-full bg-amber-500/30 border border-amber-400/50 text-[#febd1c] font-black text-[10px] flex items-center justify-center shrink-0">
                        {brand.assignedKam.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-bold text-amber-300 text-xs tracking-tight truncate max-w-[130px]" title={brand.assignedKam}>
                        {brand.assignedKam}
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800/80 border border-dashed border-neutral-600/50 text-[10px] text-neutral-400 font-medium">
                      Unassigned
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-400 truncate block pl-0.5">
                    POC: {brand.primaryContact}
                  </span>
                </div>
              )
            },
          },
          {
            key: 'email',
            header: 'Contact Email',
            render: (brand) => (
              <div className="min-w-0">
                <span className="font-mono text-[10px] text-neutral-300 truncate block max-w-[140px]" title={brand.email}>{brand.email}</span>
                {brand.phone && <span className="text-[9px] text-neutral-500 font-mono block">{brand.phone}</span>}
              </div>
            ),
          },
          {
            key: 'activeCampaigns',
            header: 'Campaigns',
            align: 'center',
            sortable: true,
            render: (brand) => (
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold text-white text-[11px]">
                {brand.activeCampaigns}
              </span>
            ),
          },
          {
            key: 'pendingReviews',
            header: 'Review Queue',
            align: 'center',
            sortable: true,
            render: (brand) => (
              <div>
                {brand.pendingReviews > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-[#febd1c] font-bold text-[10px]">
                    <Clock className="w-2.5 h-2.5" />
                    {brand.pendingReviews} Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> All Caught Up
                  </span>
                )}
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            align: 'center',
            sortable: true,
            render: (brand) => (
              <button
                type="button"
                onClick={() => handleToggleStatus(brand)}
                title={`Click to switch to ${brand.status === 'active' ? 'PAUSED' : 'ACTIVE'}`}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors cursor-pointer ${
                  brand.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                }`}
              >
                {brand.status.toUpperCase()}
              </button>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            sortable: false,
            render: (brand) => (
              <div className="flex items-center justify-end gap-1">
                {/* 1-Click WhatsApp Review Magic Link */}
                <button
                  type="button"
                  onClick={() => handleCopyBrandMagicLink(brand)}
                  title="Copy 1-Click WhatsApp Review Link for Brand POC"
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 transition-colors shadow-sm cursor-pointer"
                >
                  <Share2 className="w-2.5 h-2.5" />
                  <span>Magic Link</span>
                </button>

                {/* Direct WhatsApp Message */}
                <button
                  type="button"
                  onClick={() => handleWhatsAppBrand(brand)}
                  title="Share directly via WhatsApp"
                  className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-2.5 h-2.5" />
                </button>

                {/* Enter Virtual Brand Studio */}
                <Link
                  href={`/brand-admin/virtual-brand/${brand.id}`}
                  title="Enter Virtual Brand Studio"
                  className="inline-flex items-center gap-0.5 h-6 px-2 rounded-md bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-bold text-[10px] border border-purple-500/30 transition-colors shadow-sm"
                >
                  <Eye className="w-2.5 h-2.5" />
                  <span>Virtual</span>
                </Link>

                {/* Setup / View Credentials & Password */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrandForCreds(brand)
                    setCustomPasswordInput(brand.password || 'brand123')
                  }}
                  title="Brand Login & Password Setup"
                  className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-2.5 h-2.5" />
                </button>

                {/* Delete Brand Workspace */}
                <button
                  type="button"
                  onClick={() => setBrandToDelete(brand)}
                  title="Delete brand workspace"
                  className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ),
          },
        ]}
        searchPlaceholder="Search by brand name, industry, KAM, or contact..."
        exportFilename="client_brands_directory.csv"
        defaultPageSize={10}
        bulkActions={[
          {
            label: 'Export Selected',
            icon: Download,
            variant: 'outline',
            onClick: (rows) => {
              toast.success(`Exporting ${rows.length} selected brands`)
            },
          },
          {
            label: 'Delete Selected',
            icon: Trash2,
            variant: 'danger',
            onClick: (rows) => {
              setBulkDeleteRows(rows)
            },
          },
        ]}
      />

      {/* Add Brand Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#121620] border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Onboard New Client Brand</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddBrand} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Brand Name *
                  </label>
                  <Input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Minimalist, Sugar Cosmetics, Nykaa"
                    required
                    className="bg-[#0c1017] border-white/10 text-white rounded-xl h-10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Industry / Category
                  </label>
                  <Input
                    type="text"
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value)}
                    placeholder="e.g. Skincare, Fashion, F&B, Electronics"
                    className="bg-[#0c1017] border-white/10 text-white rounded-xl h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Primary Contact Name
                    </label>
                    <Input
                      type="text"
                      value={newContact}
                      onChange={(e) => setNewContact(e.target.value)}
                      placeholder="e.g. Ananya Sharma"
                      className="bg-[#0c1017] border-white/10 text-white rounded-xl h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Brand Login Email *
                    </label>
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="poc@brand.com"
                      required
                      className="bg-[#0c1017] border-white/10 text-white rounded-xl h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Phone / WhatsApp (Optional)
                    </label>
                    <Input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="bg-[#0c1017] border-white/10 text-white rounded-xl h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Initial Password Setup
                    </label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Default: brand123"
                        className="bg-[#0c1017] border-white/10 text-white rounded-xl h-10 pr-9 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400 bg-neutral-900/60 p-2.5 rounded-lg border border-white/5">
                  <span className="text-amber-400 font-semibold">🔐 Login Notice:</span> The brand team can log in using their password (<span className="font-mono text-amber-300">{newPassword || 'brand123'}</span>), instant work-email OTP, or direct 1-click WhatsApp review links.
                </p>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Assigned 1to7 KAM / Account Manager
                    </label>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Brand Custodian
                    </span>
                  </div>
                  <select
                    value={newKamId}
                    onChange={(e) => setNewKamId(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#0c1017] border border-amber-500/40 px-3 text-xs text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
                  >
                    <option value="">-- Unassigned (Assign Later) --</option>
                    {dedicatedKams.length > 0 && (
                      <optgroup label="⭐ Dedicated 1to7 KAMs & Leads (Active Brand Custodians)">
                        {dedicatedKams.map((k) => (
                          <option key={k.id} value={k.id}>
                            ⭐ {k.name} ({formatKamRole(k.role)}) — {k.email}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherStaff.length > 0 && (
                      <optgroup label="👥 Other Team Members / Operations">
                        {otherStaff.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.name} ({formatKamRole(k.role)}) — {k.email}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <p className="text-[11px] text-neutral-400">
                    This account manager will be highlighted across all client rosters, reviews, and communications.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 border-white/10 hover:bg-white/5 text-neutral-300 h-10 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold h-10 cursor-pointer"
                  >
                    Create Brand Workspace
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Brand Credentials & Password Setup Modal */}
      <AnimatePresence>
        {selectedBrandForCreds && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#121620] border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Brand Login Credentials</h3>
                    <p className="text-xs text-neutral-400">{selectedBrandForCreds.name} Workspace</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBrandForCreds(null)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Email Box */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Login Email</label>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c1017] border border-white/10 font-mono text-xs text-amber-300">
                    <span>{selectedBrandForCreds.email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedBrandForCreds.email)
                        toast.success('Email copied!')
                      }}
                      className="text-neutral-400 hover:text-white p-1"
                      title="Copy email"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Password Box & Update Form */}
                <form onSubmit={handleUpdatePassword} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-400">Current / Custom Password</label>
                      <button
                        type="button"
                        onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                        className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-1"
                      >
                        {showPasswordInModal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showPasswordInModal ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPasswordInModal ? 'text' : 'password'}
                        value={customPasswordInput}
                        onChange={(e) => setCustomPasswordInput(e.target.value)}
                        placeholder="Enter new password"
                        className="bg-[#0c1017] border-white/10 text-white rounded-xl h-10 font-mono text-xs pr-10"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold h-9 cursor-pointer"
                    >
                      Save Password
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleCopyCredentialsMessage(selectedBrandForCreds)}
                      className="flex-1 bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold text-xs h-9 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy Invite Text
                    </Button>
                  </div>
                </form>

                {/* Authentication Methods explanation */}
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/5 space-y-2 text-xs">
                  <div className="font-semibold text-neutral-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Available Brand Sign-In Methods:
                  </div>
                  <ul className="space-y-1 text-[11px] text-neutral-400 list-disc list-inside">
                    <li><strong className="text-neutral-300">Password:</strong> Use the email & password configured above at <code className="text-amber-300">/brand/login</code>.</li>
                    <li><strong className="text-neutral-300">Email OTP:</strong> Client enters email and receives a 6-digit code.</li>
                    <li><strong className="text-neutral-300">1-Click WhatsApp Link:</strong> Zero password required; click &quot;Magic Link&quot; in the table.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Single Brand Modal */}
      <AnimatePresence>
        {brandToDelete && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#141013] border border-rose-500/20 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Brand Workspace</h3>
                  <p className="text-xs text-neutral-400">Are you sure you want to delete this workspace?</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 mb-5 text-xs text-rose-200">
                You are about to delete <strong className="text-white">{brandToDelete.name}</strong> (<span className="font-mono text-rose-300">{brandToDelete.email}</span>).
                All review links, active campaign references, and portal access for this brand POC will be removed.
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBrandToDelete(null)}
                  className="flex-1 border-white/10 hover:bg-white/5 text-neutral-300 h-10 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold h-10 cursor-pointer shadow-lg shadow-rose-900/30"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete Workspace
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {bulkDeleteRows && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#141013] border border-rose-500/20 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete {bulkDeleteRows.length} Brand Workspaces</h3>
                  <p className="text-xs text-neutral-400">Bulk delete brand accounts</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 mb-5 text-xs text-rose-200">
                You have selected <strong className="text-white">{bulkDeleteRows.length} workspaces</strong> ({bulkDeleteRows.map((r) => r.name).join(', ')}).
                This action is irreversible.
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBulkDeleteRows(null)}
                  className="flex-1 border-white/10 hover:bg-white/5 text-neutral-300 h-10 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold h-10 cursor-pointer shadow-lg shadow-rose-900/30"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete Selected
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
