import React from 'react'
import {
  User,
  Phone,
  Instagram,
  Plus,
  ExternalLink,
  Star,
  Pencil,
  Trash2,
  Users,
  Calendar,
  Tag,
  X,
  Check,
  Languages,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getInstagramUrl } from '@/lib/instagram-utils'
import type { LinkedInstagramProfile, ProfileFormData } from '@/types/user'

interface Step1PersonalDetailsProps {
  formData: ProfileFormData
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>
  isSuperAdmin: boolean
  instagramProfiles: LinkedInstagramProfile[]
  openAddIgModal: () => void
  openEditIgModal: (p: LinkedInstagramProfile) => void
  handleSetPrimaryProfile: (profileId: string) => void
  handleDeleteInstagramProfile: (profileId: string) => void
  availableNiches: string[]
  availableLanguages: string[]
  selectedCategories: string[]
  toggleCategory: (cat: string) => void
  selectedLanguages: string[]
  toggleLanguage: (lang: string) => void
}

export const Step1PersonalDetails: React.FC<Step1PersonalDetailsProps> = ({
  formData,
  setFormData,
  isSuperAdmin,
  instagramProfiles,
  openAddIgModal,
  openEditIgModal,
  handleSetPrimaryProfile,
  handleDeleteInstagramProfile,
  availableNiches,
  availableLanguages,
  selectedCategories,
  toggleCategory,
  selectedLanguages,
  toggleLanguage,
}) => {
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={formData.full_name}
              disabled={!isSuperAdmin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className={`pl-9 h-10 text-xs rounded-lg transition-all ${
                isSuperAdmin
                  ? 'bg-slate-50/50 border border-slate-200 text-slate-900 focus-visible:ring-[#f50057] focus:bg-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
              placeholder="Enter creator full name"
            />
          </div>
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Gender</Label>
          <Select
            disabled={!isSuperAdmin}
            value={formData.gender || ''}
            onValueChange={(v) => setFormData({ ...formData, gender: v || '' })}
          >
            <SelectTrigger
              className={`h-10 text-xs rounded-lg transition-all ${
                isSuperAdmin
                  ? 'bg-slate-50/50 border border-slate-200 text-slate-900 focus:ring-[#f50057] focus:bg-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              <SelectValue placeholder="Select Gender" />
            </SelectTrigger>
            <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[200px]">
              <SelectItem value="Male" className="text-xs py-2">Male</SelectItem>
              <SelectItem value="Female" className="text-xs py-2">Female</SelectItem>
              <SelectItem value="Other" className="text-xs py-2">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Email Address</Label>
            {isSuperAdmin && (
              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Super Admin Editable
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              value={formData.email}
              disabled={!isSuperAdmin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={`h-10 text-xs rounded-lg transition-all ${
                isSuperAdmin
                  ? 'bg-purple-50/20 border border-purple-200 text-slate-900 focus-visible:ring-purple-500 focus:bg-white font-medium'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
              placeholder="creator@example.com"
            />
          </div>
          {isSuperAdmin && (
            <p className="text-[10px] text-slate-400">Direct account email. Updates creator login credentials.</p>
          )}
        </div>

        {/* Mobile */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Mobile Number</Label>
            {isSuperAdmin && (
              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Super Admin Editable
              </span>
            )}
          </div>
          <div className="relative">
            <Phone
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
                isSuperAdmin ? 'text-purple-500' : 'text-slate-400'
              }`}
            />
            <Input
              value={formData.mobile}
              disabled={!isSuperAdmin}
              maxLength={10}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })
              }
              className={`pl-9 h-10 text-xs rounded-lg transition-all ${
                isSuperAdmin
                  ? 'bg-purple-50/20 border border-purple-200 text-slate-900 focus-visible:ring-purple-500 focus:bg-white font-medium'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
              placeholder="10-digit mobile"
            />
          </div>
          {isSuperAdmin && (
            <p className="text-[10px] text-slate-400">Direct account mobile. Must be exactly 10 digits.</p>
          )}
        </div>
      </div>

      {/* Connected Instagram Profiles Manager */}
      <div className="p-3 sm:p-5 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/30 via-white to-rose-50/20 space-y-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-2">
          <div className="min-w-0">
            <Label className="text-slate-900 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
              <Instagram className="h-4 w-4 text-pink-600 shrink-0" />
              <span>Connected Instagram Profiles</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100/70 text-pink-800 border border-pink-200">
                {instagramProfiles.length} Linked
              </span>
            </Label>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Admin can manage creator's Instagram handles, follower counts, and primary active profile.
            </p>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
              <Button
                type="button"
                size="sm"
                onClick={openAddIgModal}
                className="flex-1 sm:flex-initial h-8 px-2.5 sm:px-3 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs cursor-pointer shadow-sm shadow-pink-500/20 justify-center"
              >
                <Plus className="h-3.5 w-3.5 mr-1 shrink-0" />
                <span className="truncate">Add / Link Profile</span>
              </Button>
            </div>
          )}
        </div>

        {/* Profiles Grid */}
        {instagramProfiles.length === 0 ? (
          <div className="p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 flex flex-col items-center justify-center text-center">
            <Instagram className="h-8 w-8 text-slate-300 mb-1.5" />
            <p className="text-xs font-bold text-slate-800">No Instagram Profiles Linked</p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
              Link an Instagram profile for this creator to participate in campaigns.
            </p>
            {isSuperAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={openAddIgModal}
                className="mt-3 h-8 px-3.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Link Instagram
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {instagramProfiles.map((p) => (
              <div
                key={p.id || p.username}
                className={`p-3.5 rounded-xl border transition-all ${
                  p.is_primary
                    ? 'bg-gradient-to-br from-pink-50/80 via-white to-rose-50/50 border-pink-300 shadow-sm shadow-pink-500/5 ring-1 ring-pink-400/30'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border ${
                        p.is_primary ? 'border-pink-300 shadow-xs' : 'border-slate-200 bg-slate-100'
                      }`}
                    >
                      {p.profile_pic ? (
                        <img
                          src={p.profile_pic}
                          alt={p.username}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className={`h-full w-full flex items-center justify-center ${
                            p.is_primary
                              ? 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white'
                              : 'text-slate-600'
                          }`}
                        >
                          <Instagram className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a
                          href={getInstagramUrl(p.username)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-black text-slate-900 hover:text-pink-600 hover:underline flex items-center gap-1 truncate"
                        >
                          @{p.username}
                          <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />
                        </a>
                        {p.is_primary && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Star className="h-2.5 w-2.5 fill-emerald-600 text-emerald-600" />
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-700">
                          {(p.followers || 0).toLocaleString('en-IN')} Followers
                        </span>
                        {p.category && (
                          <>
                            <span>•</span>
                            <span className="truncate">{p.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                    {!p.is_primary && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSetPrimaryProfile(p.id)}
                        className="h-7 px-2 text-[11px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Make Primary
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditIgModal(p)}
                      className="h-7 px-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {instagramProfiles.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteInstagramProfile(p.id)}
                        className="h-7 px-2 text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct Followers Input (synced with primary profile) & Date of Birth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Total Followers</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="number"
              min="0"
              disabled={!isSuperAdmin}
              value={formData.followers}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({
                  ...formData,
                  followers: parseInt(e.target.value || '0', 10) || 0,
                })
              }
              className={`pl-9 h-10 text-xs rounded-lg transition-all ${
                isSuperAdmin
                  ? 'bg-slate-50/50 border border-slate-200 text-slate-900 focus-visible:ring-[#f50057] focus:bg-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
              placeholder="e.g. 15000"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Date of Birth</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="date"
              disabled={!isSuperAdmin}
              value={formData.dob || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, dob: e.target.value })
              }
              className={`pl-9 h-10 text-xs rounded-lg transition-all ${
                isSuperAdmin
                  ? 'bg-slate-50/50 border border-slate-200 text-slate-900 focus-visible:ring-[#f50057] focus:bg-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Content Niches Multi-Select */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-slate-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-[#f50057]" />
            <span>Content Categories & Niches</span>
          </Label>
          <span className="text-[11px] text-slate-500 font-medium">
            {selectedCategories.length} selected
          </span>
        </div>

        {/* Selected Niches Pills */}
        {selectedCategories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-lg">
            {selectedCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200"
              >
                {cat}
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="text-pink-400 hover:text-pink-700 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No categories selected.</p>
        )}

        {/* Available Niches Pills (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-2 bg-white border border-slate-200 rounded-lg">
            {availableNiches.map((niche) => {
              const isSelected = selectedCategories.includes(niche)
              return (
                <button
                  type="button"
                  key={niche}
                  onClick={() => toggleCategory(niche)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-pink-600 text-white border-pink-600 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-40" />}
                  {niche}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Languages Multi-Select */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-slate-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Languages className="h-4 w-4 text-indigo-600" />
            <span>Languages Spoken</span>
          </Label>
          <span className="text-[11px] text-slate-500 font-medium">
            {selectedLanguages.length} selected
          </span>
        </div>

        {/* Selected Languages Pills */}
        {selectedLanguages.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-lg">
            {selectedLanguages.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
              >
                {lang}
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className="text-indigo-400 hover:text-indigo-700 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No languages selected.</p>
        )}

        {/* Available Languages Pills (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-2 bg-white border border-slate-200 rounded-lg">
            {availableLanguages.map((lang) => {
              const isSelected = selectedLanguages.includes(lang)
              return (
                <button
                  type="button"
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-40" />}
                  {lang}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Bio & Extended Details */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Creator Bio</Label>
          <textarea
            rows={3}
            disabled={!isSuperAdmin}
            value={formData.bio || ''}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Brief creator bio or intro..."
            className={`w-full p-3 text-xs rounded-lg transition-all ${
              isSuperAdmin
                ? 'bg-slate-50/50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#f50057]'
                : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 uppercase">YouTube Channel URL</Label>
            <Input
              disabled={!isSuperAdmin}
              value={formData.youtube || ''}
              onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
              placeholder="https://youtube.com/@..."
              className={`h-9 text-xs ${
                isSuperAdmin
                  ? 'border-slate-200 text-slate-900'
                  : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 uppercase">T-Shirt Size</Label>
            <Input
              disabled={!isSuperAdmin}
              value={formData.tshirt_size || ''}
              onChange={(e) => setFormData({ ...formData, tshirt_size: e.target.value.toUpperCase() })}
              placeholder="S, M, L, XL, XXL"
              className={`h-9 text-xs ${
                isSuperAdmin
                  ? 'border-slate-200 text-slate-900'
                  : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 uppercase">Shoe Size (UK)</Label>
            <Input
              disabled={!isSuperAdmin}
              value={formData.shoe_size || ''}
              onChange={(e) => setFormData({ ...formData, shoe_size: e.target.value })}
              placeholder="e.g. 7, 8, 9"
              className={`h-9 text-xs ${
                isSuperAdmin
                  ? 'border-slate-200 text-slate-900'
                  : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
