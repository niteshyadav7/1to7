'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Target,
  Building2,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Search,
  ShieldCheck,
  Sparkles,
  Sliders,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface CampaignMapping {
  id: string
  campaignName: string
  category: string
  assignedBrandId: string
  brandName: string
  approvalMode: 'strict_brand_approval' | 'auto_approve_72h'
  deliverablesRequired: string
  status: 'active' | 'draft'
}

const INITIAL_MAPPINGS: CampaignMapping[] = [
  {
    id: 'camp-1',
    campaignName: 'Rosemary Anti-Hair Fall UGC Drive',
    category: 'Beauty & Haircare',
    assignedBrandId: 'b-mamaearth',
    brandName: 'Mamaearth',
    approvalMode: 'strict_brand_approval',
    deliverablesRequired: '1 Instagram Reel + Story',
    status: 'active',
  },
  {
    id: 'camp-2',
    campaignName: 'Vitamin C Serum Launch (Diwali Edition)',
    category: 'Vegan Skincare',
    assignedBrandId: 'b-plum',
    brandName: 'Plum Goodness',
    approvalMode: 'strict_brand_approval',
    deliverablesRequired: '1 Reel with Before/After Glow',
    status: 'active',
  },
  {
    id: 'camp-3',
    campaignName: 'Matte Attack Lipstick Reels',
    category: 'Color Cosmetics',
    assignedBrandId: 'b-sugar',
    brandName: 'Sugar Cosmetics',
    approvalMode: 'auto_approve_72h',
    deliverablesRequired: '1 Reel Swatch & Lip Application',
    status: 'active',
  },
]

export default function CampaignMappingPage() {
  const [mappings, setMappings] = useState<CampaignMapping[]>(INITIAL_MAPPINGS)
  const [search, setSearch] = useState('')

  const handleToggleMode = (id: string) => {
    setMappings((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              approvalMode:
                item.approvalMode === 'strict_brand_approval'
                  ? 'auto_approve_72h'
                  : 'strict_brand_approval',
            }
          : item
      )
    )
    toast.success('Campaign approval policy updated')
  }

  const filtered = mappings.filter(
    (m) =>
      m.campaignName.toLowerCase().includes(search.toLowerCase()) ||
      m.brandName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold mb-2">
          <Target className="w-3 h-3" />
          Brand Workspace Allocation
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Campaign-to-Brand Mapping
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Link 1to7 influencer campaigns to client brands and configure approval policies.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaign or client brand..."
          className="pl-10 h-10 bg-[#121620] border-white/10 text-white placeholder:text-neutral-500 rounded-xl"
        />
      </div>

      {/* Mappings Table */}
      <div className="bg-[#121620] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1017] text-neutral-400 font-semibold border-b border-white/10">
              <tr>
                <th className="p-3.5">Campaign Name</th>
                <th className="p-3.5">Assigned Brand Workspace</th>
                <th className="p-3.5">Deliverables Scope</th>
                <th className="p-3.5">Approval Rule</th>
                <th className="p-3.5 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-white text-sm">{item.campaignName}</div>
                    <div className="text-neutral-400 text-[11px]">{item.category}</div>
                  </td>

                  <td className="p-3.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-semibold text-xs">
                      <Building2 className="w-3.5 h-3.5" />
                      {item.brandName}
                    </div>
                  </td>

                  <td className="p-3.5 text-neutral-300">{item.deliverablesRequired}</td>

                  <td className="p-3.5">
                    {item.approvalMode === 'strict_brand_approval' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        <ShieldCheck className="w-3 h-3" /> Strict Brand Sign-Off
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Auto-Approve (72h SLA)
                      </span>
                    )}
                  </td>

                  <td className="p-3.5 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleMode(item.id)}
                      className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-8"
                    >
                      <Sliders className="w-3 h-3 mr-1 text-amber-400" />
                      Toggle Mode
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
