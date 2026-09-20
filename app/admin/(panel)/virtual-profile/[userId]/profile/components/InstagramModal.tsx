import React from 'react'
import { Instagram, X, Loader2, CheckCircle2, Check, Users, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface InstagramModalProps {
  isOpen: boolean
  onClose: () => void
  isSuperAdmin: boolean
  editingIgId: string | null
  igFormHandle: string
  setIgFormHandle: (val: string) => void
  igFormFollowers: string
  setIgFormFollowers: (val: string) => void
  igFormCategory: string
  setIgFormCategory: (val: string) => void
  igFormIsPrimary: boolean
  setIgFormIsPrimary: (val: boolean) => void
  igAvailability: {
    checking: boolean
    available: boolean | null
    message?: string
  }
  igSubmitting: boolean
  availableNiches: string[]
  handleSaveInstagramProfile: (e: React.FormEvent) => void
}

export const InstagramModal: React.FC<InstagramModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin,
  editingIgId,
  igFormHandle,
  setIgFormHandle,
  igFormFollowers,
  setIgFormFollowers,
  igFormCategory,
  setIgFormCategory,
  igFormIsPrimary,
  setIgFormIsPrimary,
  igAvailability,
  igSubmitting,
  availableNiches,
  handleSaveInstagramProfile,
}) => {
  if (!isOpen || !isSuperAdmin) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 overflow-hidden relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
              <Instagram className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {editingIgId ? 'Edit Instagram Profile' : 'Link Instagram Profile'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {editingIgId ? 'Update followers count or niche' : 'Link an additional profile'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSaveInstagramProfile} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Instagram Handle / Link *</Label>
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500" />
              <Input
                required
                disabled={Boolean(editingIgId)}
                value={igFormHandle}
                onChange={(e) => setIgFormHandle(e.target.value)}
                placeholder="@username or https://instagram.com/username"
                className="pl-9 pr-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-pink-500 disabled:bg-slate-100"
              />
              {igAvailability.checking ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                </div>
              ) : igAvailability.available === true ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" title="Username available">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              ) : igAvailability.available === false ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" title={igAvailability.message}>
                  <X className="h-4 w-4" />
                </div>
              ) : null}
            </div>
            {igAvailability.available === false && (
              <p className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                <Info className="h-3.5 w-3.5 shrink-0" />
                {igAvailability.message || 'This Instagram profile is already linked to another account.'}
              </p>
            )}
            {igAvailability.available === true && !editingIgId && (
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                <Check className="h-3.5 w-3.5 shrink-0" />
                Handle is available and ready to link!
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Followers Count *</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                required
                type="number"
                min="0"
                value={igFormFollowers}
                onChange={(e) => setIgFormFollowers(e.target.value)}
                placeholder="e.g. 25000"
                className="pl-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-pink-500 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Content Niche / Category</Label>
            <Select
              value={igFormCategory || ''}
              onValueChange={(val) => setIgFormCategory(val === '__none__' ? '' : (val || ''))}
            >
              <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl focus:ring-pink-500 bg-white">
                <SelectValue placeholder="Select primary niche for this profile..." />
              </SelectTrigger>
              <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[220px]">
                <SelectItem value="__none__" className="text-xs py-2 text-slate-400 italic">
                  -- No Specific Niche / General --
                </SelectItem>
                {availableNiches.map((niche) => (
                  <SelectItem key={niche} value={niche} className="text-xs py-2 font-medium">
                    {niche}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!editingIgId && (
            <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={igFormIsPrimary}
                onChange={(e) => setIgFormIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                Set as Primary Instagram profile
              </span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-9 px-4 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={igSubmitting || (!editingIgId && igAvailability.available === false)}
              className="h-9 px-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
            >
              {igSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                editingIgId ? 'Save Changes' : 'Link Profile'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
