'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Plus,
  Search,
  Users,
  Eye,
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
    activeCampaigns: 3,
    pendingReviews: 0,
    status: 'active',
  },
]

export default function ClientBrandsDirectoryPage() {
  const [brands, setBrands] = useState<BrandWorkspace[]>(INITIAL_BRANDS)
  const [search, setSearch] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // New Brand Form State
  const [newName, setNewName] = useState('')
  const [newIndustry, setNewIndustry] = useState('')
  const [newContact, setNewContact] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newKam, setNewKam] = useState('Pooja Verma (KAM)')

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newEmail) {
      toast.error('Brand name and email are required')
      return
    }

    const initials = newName.substring(0, 2).toUpperCase()
    const slug = newName.toLowerCase().replace(/[^a-z0-9]/g, '-')

    const newBrand: BrandWorkspace = {
      id: `b-${slug}`,
      name: newName,
      slug,
      industry: newIndustry || 'Consumer Goods',
      initials,
      color: 'from-amber-500 to-yellow-600',
      assignedKam: newKam,
      primaryContact: newContact || 'Brand Manager',
      email: newEmail,
      activeCampaigns: 0,
      pendingReviews: 0,
      status: 'active',
    }

    setBrands([newBrand, ...brands])
    setIsAddModalOpen(false)
    setNewName('')
    setNewIndustry('')
    setNewContact('')
    setNewEmail('')
    toast.success(`Successfully onboarded ${newName} to Brand Admin!`)
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

  const filteredBrands = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.industry.toLowerCase().includes(search.toLowerCase()) ||
      b.assignedKam.toLowerCase().includes(search.toLowerCase())
  )

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
            Manage enterprise brand workspaces, track review bottlenecks, and enter Virtual Brand mode.
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold text-xs h-10 shadow-lg"
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
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${brand.color} flex items-center justify-center text-white font-black text-xs shadow-md shrink-0`}
                >
                  {brand.initials}
                </div>
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm">{brand.name}</div>
                  <div className="text-[11px] text-neutral-400">{brand.industry}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'assignedKam',
            header: 'Assigned KAM',
            sortable: true,
            render: (brand) => (
              <div>
                <span className="font-semibold text-amber-300 text-xs block">{brand.assignedKam}</span>
                <span className="text-[11px] text-neutral-400">{brand.primaryContact}</span>
              </div>
            ),
          },
          {
            key: 'email',
            header: 'Contact Email',
            render: (brand) => (
              <span className="font-mono text-xs text-neutral-300">{brand.email}</span>
            ),
          },
          {
            key: 'activeCampaigns',
            header: 'Campaigns',
            align: 'center',
            sortable: true,
            render: (brand) => (
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-bold text-white text-xs">
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-[#febd1c] font-bold text-xs">
                    <Clock className="w-3 h-3" />
                    {brand.pendingReviews} Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All Caught Up
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {brand.status.toUpperCase()}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            sortable: false,
            render: (brand) => (
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyBrandMagicLink(brand)}
                  title="Copy 1-Click WhatsApp Review Link for Brand POC"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-colors shadow-sm cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copy Magic Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleWhatsAppBrand(brand)}
                  title="Share directly via WhatsApp"
                  className="inline-flex items-center justify-center p-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>

                <Link
                  href={`/brand-admin/virtual-brand/${brand.id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-bold text-xs border border-purple-500/30 transition-colors shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Virtual</span>
                </Link>
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
                  className="text-neutral-400 hover:text-white"
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
                    placeholder="e.g. Minimalist, Sugar Cosmetics"
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
                    placeholder="e.g. Skincare, Fashion, F&B"
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
                    className="flex-1 border-white/10 hover:bg-white/5 text-neutral-300 h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold h-10"
                  >
                    Create Brand Workspace
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
