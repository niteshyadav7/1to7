import React from 'react'
import {
  ShieldCheck,
  Eye,
  Loader2,
  X,
  CheckCircle2,
  Sparkles,
  Save,
  Lock,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UserProfile } from '@/types/user'

interface ProfileHeaderCardProps {
  profile: UserProfile | null
  isSuperAdmin: boolean
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsaved'
  saving: boolean
  strength: number
  strengthColor: string
  handleManualSave: () => void
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  profile,
  isSuperAdmin,
  saveStatus,
  saving,
  strength,
  strengthColor,
  handleManualSave,
}) => {
  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Avatar & Identity */}
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0 overflow-hidden">
            {profile?.instagram_profile_pic ? (
              <img
                src={profile.instagram_profile_pic}
                alt={profile.full_name || 'Creator'}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{profile?.full_name?.charAt(0)?.toUpperCase() || 'C'}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 truncate">
                {profile?.full_name || 'Creator Profile'}
              </h2>
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-purple-700 border border-purple-200 shrink-0">
                  <ShieldCheck className="h-2.5 w-2.5 text-purple-600" />
                  Super Admin (Full Edit)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 border border-slate-200 shrink-0">
                  <Eye className="h-2.5 w-2.5 text-slate-500" />
                  Admin (Read-Only)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span className="font-semibold text-slate-700">{profile?.influencer_id || 'HY ID'}</span>
              {profile?.created_at && (
                <>
                  <span>•</span>
                  <span>
                    Joined{' '}
                    {new Date(profile.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Group: Auto-Save Status, Profile Strength & Save Button */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {/* Live Auto-Save Status Indicator */}
          {isSuperAdmin ? (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs font-bold transition-all shrink-0">
              {saveStatus === 'saving' ? (
                <span className="flex items-center gap-1.5 text-pink-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f50057]" />
                  <span>Saving to database...</span>
                </span>
              ) : saveStatus === 'unsaved' ? (
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Unsaved changes...</span>
                </span>
              ) : saveStatus === 'error' ? (
                <span className="flex items-center gap-1.5 text-rose-700">
                  <X className="h-3.5 w-3.5 text-rose-600" />
                  <span>Save failed</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>All saved to DB</span>
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs font-bold transition-all shrink-0 bg-slate-50 text-slate-600 border-slate-200">
              <Eye className="h-3.5 w-3.5 text-slate-400" />
              <span>View-Only Mode</span>
            </div>
          )}

          {/* Profile Strength Bar */}
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 border border-slate-200/60 px-2.5 sm:px-3.5 py-1.5 rounded-lg shrink-0">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-800">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Profile Strength:</span>
              <span className="sm:hidden">Strength:</span>
              <span className="text-emerald-600 font-extrabold">{strength}%</span>
            </div>
            <div className="w-16 sm:w-28 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${strengthColor} transition-all duration-500`}
                style={{ width: `${strength}%` }}
              />
            </div>
          </div>

          {/* Quick Save / Read-Only Button */}
          {isSuperAdmin ? (
            <Button
              type="button"
              onClick={handleManualSave}
              disabled={saving}
              className="h-8 sm:h-9 px-3 sm:px-5 bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer shrink-0 ml-auto sm:ml-0"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              disabled
              className="h-8 sm:h-9 px-3 sm:px-5 bg-slate-100 text-slate-400 font-extrabold text-xs rounded-lg border border-slate-200 cursor-not-allowed shrink-0 ml-auto sm:ml-0 shadow-none"
              title="Only Super Administrators can modify influencer profiles"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
              Read-Only
            </Button>
          )}
        </div>
      </div>

      {/* Read-Only Administrator Notice Banner */}
      {!isSuperAdmin && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5 sm:p-4 flex items-start gap-3 shadow-2xs">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <Shield className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1.5">
              <span>Read-Only Administrator View</span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-200/60 text-amber-900 border border-amber-300">
                Restricted
              </span>
            </h4>
            <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5 leading-relaxed">
              You are currently viewing this creator&apos;s profile in view-only mode. Only{' '}
              <strong>Super Administrators</strong> have full authority to modify creator details—including
              login credentials (<strong>Email</strong>, <strong>Mobile</strong>), personal information,
              addresses, payout details, and connected Instagram accounts.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
