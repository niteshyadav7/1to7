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

const INITIAL_BRANDS: BrandWorkspace[] = [
  {
    id: 'b-mamaearth',
    name: 'Mamaearth',
    slug: 'mamaearth',
    industry: 'Beauty & Skincare',
    initials: 'MA',
    color: 'from-amber-500 to-amber-700',
    assignedKam: 'Pooja Verma (KAM)',
    primaryContact: 'Ananya Sharma (Brand Head)',
    email: 'ananya@mamaearth.in',
    phone: '+91 98765 43210',
    password: 'brand123',
    activeCampaigns: 2,
    pendingReviews: 18,
    status: 'active',
  },
  {
    id: 'b-plum',
    name: 'Plum Goodness',
    slug: 'plum',
    industry: 'Vegan Beauty',
    initials: 'PL',
    color: 'from-amber-600 to-orange-700',
    assignedKam: 'Nitesh Yadav (Senior Ops)',
    primaryContact: 'Rahul Sen (Marketing Lead)',
    email: 'rahul@plumgoodness.com',
    phone: '+91 98111 22334',
    password: 'brand123',
    activeCampaigns: 1,
    pendingReviews: 6,
    status: 'active',
  },
  {
    id: 'b-sugar',
    name: 'Sugar Cosmetics',
    slug: 'sugar',
    industry: 'Color Cosmetics',
    initials: 'SU',
    color: 'from-neutral-700 to-neutral-900',
    assignedKam: 'Pooja Verma (KAM)',
    primaryContact: 'Kavita Roy (Digital Lead)',
    email: 'kavita@sugarcosmetics.com',
    phone: '+91 99887 76655',
    password: 'brand123',
    activeCampaigns: 3,
    pendingReviews: 0,
    status: 'active',
  },
]

export default function ClientBrandsDirectoryPage() {
  const [brands, setBrands] = useState<BrandWorkspace[]>(INITIAL_BRANDS)
  const [isLoaded, setIsLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

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
  const [newKam, setNewKam] = useState('Pooja Verma (KAM)')

  // Load persisted workspaces from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('1to7_brand_workspaces')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBrands(parsed)
        }
      }
    } catch {
      // ignore
    }
    setIsLoaded(true)
  }, [])

  const persistBrands = (updated: BrandWorkspace[]) => {
    setBrands(updated)
    try {
      localStorage.setItem('1to7_brand_workspaces', JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newEmail) {
      toast.error('Brand name and email are required')
      return
    }

    const initials = newName.substring(0, 2).toUpperCase()
    const slug = newName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const passwordToUse = newPassword.trim() || 'brand123'

    const newBrand: BrandWorkspace = {
      id: `b-${slug}`,
      name: newName,
      slug,
      industry: newIndustry || 'Consumer Goods',
      initials,
      color: 'from-amber-500 to-yellow-600',
      assignedKam: newKam,
      primaryContact: newContact || 'Brand Manager',
      email: newEmail.trim().toLowerCase(),
      phone: newPhone.trim() || undefined,
      password: passwordToUse,
      activeCampaigns: 0,
      pendingReviews: 0,
      status: 'active',
    }

    const updated = [newBrand, ...brands]
    persistBrands(updated)
    setIsAddModalOpen(false)
    setNewName('')
    setNewIndustry('')
    setNewContact('')
    setNewEmail('')
    setNewPhone('')
    setNewPassword('brand123')

    toast.success(`Successfully onboarded ${newName} to Brand Admin!`, {
      description: `Email: ${newBrand.email} | Password: ${passwordToUse}`,
      action: {
        label: 'Copy Login',
        onClick: () => {
          const creds = `1to7 Brand Portal Access\nURL: ${typeof window !== 'undefined' ? window.location.origin : ''}/brand/login\nEmail: ${newBrand.email}\nPassword: ${passwordToUse}`
          navigator.clipboard.writeText(creds)
          toast.success('Credentials copied to clipboard!')
        },
      },
    })
  }

  const handleConfirmDelete = () => {
    if (!brandToDelete) return
    const updated = brands.filter((b) => b.id !== brandToDelete.id)
    persistBrands(updated)
    toast.success(`Deleted workspace for "${brandToDelete.name}"`)
    setBrandToDelete(null)
  }

  const handleConfirmBulkDelete = () => {
    if (!bulkDeleteRows || bulkDeleteRows.length === 0) return
    const idsToDelete = new Set(bulkDeleteRows.map((r) => r.id))
    const updated = brands.filter((b) => !idsToDelete.has(b.id))
    persistBrands(updated)
    toast.success(`Deleted ${bulkDeleteRows.length} brand workspaces`)
    setBulkDeleteRows(null)
  }

  const handleToggleStatus = (brand: BrandWorkspace) => {
    const nextStatus = brand.status === 'active' ? 'paused' : 'active'
    const updated = brands.map((b) =>
      b.id === brand.id ? { ...b, status: nextStatus as 'active' | 'paused' } : b
    )
    persistBrands(updated)
    toast.success(`${brand.name} workspace status set to ${nextStatus.toUpperCase()}`)
  }

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrandForCreds) return
    const updatedPass = customPasswordInput.trim() || 'brand123'
    const updated = brands.map((b) =>
      b.id === selectedBrandForCreds.id ? { ...b, password: updatedPass } : b
    )
    persistBrands(updated)
    setSelectedBrandForCreds({ ...selectedBrandForCreds, password: updatedPass })
    toast.success(`Password for ${selectedBrandForCreds.name} updated to "${updatedPass}"!`)
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
            header: 'Assigned KAM',
            sortable: true,
            render: (brand) => (
              <div className="min-w-0">
                <span className="font-semibold text-amber-300 text-[11px] block truncate">{brand.assignedKam}</span>
                <span className="text-[10px] text-neutral-400 truncate block">{brand.primaryContact}</span>
              </div>
            ),
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

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Assigned 1to7 KAM
                  </label>
                  <select
                    value={newKam}
                    onChange={(e) => setNewKam(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#0c1017] border border-white/10 px-3 text-xs text-white focus:border-amber-500/50"
                  >
                    <option value="Pooja Verma (KAM)">Pooja Verma (KAM)</option>
                    <option value="Nitesh Yadav (Senior Ops)">Nitesh Yadav (Senior Ops)</option>
                    <option value="Aakash Sharma (POC)">Aakash Sharma (POC)</option>
                  </select>
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
