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
  ChevronRight,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

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

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by brand name, industry, or KAM..."
          className="pl-10 h-10 bg-[#121620] border-white/10 text-white placeholder:text-neutral-500 rounded-xl"
        />
      </div>

      {/* Brand Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBrands.map((brand) => (
          <motion.div
            key={brand.id}
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl bg-[#121620] border border-white/10 hover:border-amber-500/40 transition-all shadow-xl flex flex-col justify-between"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${brand.color} flex items-center justify-center text-white font-black text-sm shadow-md`}
                  >
                    {brand.initials}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{brand.name}</h3>
                    <p className="text-xs text-neutral-400">{brand.industry}</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {brand.status.toUpperCase()}
                </span>
              </div>

              {/* Account Details */}
              <div className="space-y-2 text-xs text-neutral-300 bg-[#0c1017] p-3.5 rounded-xl border border-white/5 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Assigned KAM:</span>
                  <span className="font-semibold text-[#febd1c]">{brand.assignedKam}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Primary Contact:</span>
                  <span className="font-medium text-white">{brand.primaryContact}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Email:</span>
                  <span className="font-mono text-neutral-400">{brand.email}</span>
                </div>
              </div>

              {/* Review Status Metrics */}
              <div className="flex items-center justify-between text-xs px-1 mb-4">
                <div>
                  <span className="text-neutral-500 text-[11px] block">Active Campaigns</span>
                  <span className="font-bold text-white text-sm">{brand.activeCampaigns}</span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 text-[11px] block">Review Queue</span>
                  <span
                    className={`font-bold text-sm ${
                      brand.pendingReviews > 0 ? 'text-[#febd1c]' : 'text-emerald-400'
                    }`}
                  >
                    {brand.pendingReviews > 0
                      ? `${brand.pendingReviews} Pending Review`
                      : 'All Caught Up'}
                  </span>
                </div>
              </div>
            </div>

            {/* Virtual Brand Masquerade Button */}
            <div className="space-y-2">
              <Link
                href={`/brand-admin/virtual-brand/${brand.id}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-bold text-xs border border-purple-500/30 transition-colors shadow"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Enter Virtual Brand Mode</span>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

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
