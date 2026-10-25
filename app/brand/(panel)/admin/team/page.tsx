'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Phone, 
  CheckCircle2, 
  Clock, 
  Trash2,
  Send,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandUserRole } from '@/types/brand'

interface TeamMember {
  id: string
  name: string
  email: string
  role: BrandUserRole
  status: 'active' | 'invited'
  joined_at: string
}

export default function BrandTeamManagementPage() {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<BrandUserRole>('reviewer')
  const [isInviting, setIsInviting] = useState(false)

  const [team, setTeam] = useState<TeamMember[]>([
    {
      id: 'mem-1',
      name: 'Ananya Sharma',
      email: 'ananya@mamaearth.in',
      role: 'owner',
      status: 'active',
      joined_at: '2026-01-15',
    },
    {
      id: 'mem-2',
      name: 'Vikram Mehta',
      email: 'vikram@mamaearth.in',
      role: 'admin',
      status: 'active',
      joined_at: '2026-02-01',
    },
    {
      id: 'mem-3',
      name: 'Sneha Patel',
      email: 'sneha.reviewer@mamaearth.in',
      role: 'reviewer',
      status: 'active',
      joined_at: '2026-03-10',
    },
  ])

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteName) {
      toast.error('Please enter name and work email')
      return
    }

    setIsInviting(true)
    setTimeout(() => {
      const newMember: TeamMember = {
        id: `mem-${Date.now()}`,
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        status: 'invited',
        joined_at: new Date().toISOString().slice(0, 10),
      }

      setTeam((prev) => [...prev, newMember])
      setInviteEmail('')
      setInviteName('')
      setIsInviting(false)
      toast.success(`Invitation sent to ${inviteEmail}!`)
    }, 600)
  }

  const roleBadges: Record<BrandUserRole, { label: string; color: string }> = {
    owner: { label: 'Brand Owner / Director', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    admin: { label: 'Campaign Lead', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    reviewer: { label: 'Reviewer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    viewer: { label: 'Observer', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1c] tracking-tight">
          Brand Workspace Team
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Invite colleagues and marketing managers to review creator shortlists and approve content.
        </p>
      </div>

      {/* Invite Box (Mobile First) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-base text-[#1a1c1c]">Invite New Team Member</h3>
        </div>

        <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Full Name"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#febd1c]"
            required
          />
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Work Email"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#febd1c]"
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as BrandUserRole)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#febd1c] bg-white text-slate-700"
          >
            <option value="reviewer">Reviewer (Can Approve Creators)</option>
            <option value="admin">Campaign Lead (Full Campaign Access)</option>
            <option value="viewer">Observer (View Only)</option>
          </select>
          <button
            type="submit"
            disabled={isInviting}
            className="py-2.5 px-4 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black font-semibold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            <span>{isInviting ? 'Sending...' : 'Send Invite'}</span>
          </button>
        </form>
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-base text-[#1a1c1c]">Active Members ({team.length})</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {team.map((mem) => (
            <div
              key={mem.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2d3132] text-white font-bold flex items-center justify-center text-sm shrink-0">
                  {mem.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1a1c1c]">{mem.name}</h4>
                  <p className="text-xs text-slate-500">{mem.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
                    roleBadges[mem.role].color
                  }`}
                >
                  {roleBadges[mem.role].label}
                </span>

                <span className="text-[11px] text-slate-400">
                  {mem.status === 'invited' ? 'Invite Sent' : `Joined ${mem.joined_at}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
