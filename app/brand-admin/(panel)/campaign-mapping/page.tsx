'use client'

import { useState } from 'react'
import {
  Target,
  Building2,
  ShieldCheck,
  Sliders,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'

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
  const [modeFilter, setModeFilter] = useState<'all' | 'strict_brand_approval' | 'auto_approve_72h'>('all')

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

  const handleBulkToggle = (selected: CampaignMapping[]) => {
    const ids = new Set(selected.map((s) => s.id))
    setMappings((prev) =>
      prev.map((item) =>
        ids.has(item.id)
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
    toast.success(`Switched approval mode for ${selected.length} campaigns!`)
  }

  const filtered = mappings.filter((m) => {
    if (modeFilter === 'strict_brand_approval') return m.approvalMode === 'strict_brand_approval'
    if (modeFilter === 'auto_approve_72h') return m.approvalMode === 'auto_approve_72h'
    return true
  })

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

      {/* Dynamic Data Table for Campaign Mappings */}
      <DynamicDataTable<CampaignMapping>
        title="Active Workspace Mappings"
        subtitle="Manage client routing and enforce strict SLA sign-offs or auto-dispatch gates"
        data={filtered}
        exportFilename="campaign_brand_mappings.csv"
        searchPlaceholder="Search campaign name, category, or assigned brand..."
        filterTabs={{
          key: 'approvalMode',
          options: [
            { label: 'All Mappings', value: 'all', count: mappings.length },
            {
              label: 'Strict Sign-Off',
              value: 'strict_brand_approval',
              count: mappings.filter((m) => m.approvalMode === 'strict_brand_approval').length,
            },
            {
              label: 'Auto-Approve 72h',
              value: 'auto_approve_72h',
              count: mappings.filter((m) => m.approvalMode === 'auto_approve_72h').length,
            },
          ],
          activeValue: modeFilter,
          onChange: (val) => setModeFilter(val as any),
        }}
        bulkActions={[
          {
            label: 'Toggle Approval Mode',
            icon: Sliders,
            variant: 'purple',
            onClick: handleBulkToggle,
          },
        ]}
        columns={[
          {
            key: 'campaignName',
            header: 'Campaign & Category',
            sortable: true,
            render: (item) => (
              <div>
                <div className="font-bold text-white text-xs sm:text-sm">{item.campaignName}</div>
                <div className="text-neutral-400 text-[11px] mt-0.5">{item.category}</div>
              </div>
            ),
          },
          {
            key: 'brandName',
            header: 'Assigned Brand Workspace',
            sortable: true,
            render: (item) => (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-semibold text-xs">
                <Building2 className="w-3.5 h-3.5" />
                {item.brandName}
              </div>
            ),
          },
          {
            key: 'deliverablesRequired',
            header: 'Deliverables Scope',
            render: (item) => <span className="text-neutral-300 text-xs">{item.deliverablesRequired}</span>,
          },
          {
            key: 'approvalMode',
            header: 'Approval Rule',
            sortable: true,
            render: (item) => (
              item.approvalMode === 'strict_brand_approval' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <ShieldCheck className="w-3 h-3" /> Strict Brand Sign-Off
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Auto-Approve (72h SLA)
                </span>
              )
            ),
          },
          {
            key: 'actions',
            header: 'Settings',
            align: 'right',
            sortable: false,
            render: (item) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleMode(item.id)}
                className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-8"
              >
                <Sliders className="w-3 h-3 mr-1 text-amber-400" />
                Toggle Mode
              </Button>
            ),
          },
        ]}
      />
    </div>
  )
}
