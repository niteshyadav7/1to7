import React from 'react'
import { Instagram, ExternalLink, Info } from 'lucide-react'
import { getInstagramUrl } from '@/lib/instagram-utils'
import type { ProfileFormData, LinkedInstagramProfile } from '@/types/user'

interface Step4InstagramFeedProps {
  formData: ProfileFormData
  instagramProfiles: LinkedInstagramProfile[]
}

export const Step4InstagramFeed: React.FC<Step4InstagramFeedProps> = ({
  formData,
  instagramProfiles,
}) => {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-start gap-3">
        <Instagram className="h-5 w-5 text-pink-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Instagram Feed & Profile Overview
          </h4>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Instagram account statistics and quick access links for brand managers and audit.
          </p>
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/20 via-white to-purple-50/20 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Instagram className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>
                {formData.instagram_username ? `@${formData.instagram_username}` : 'No Instagram Profile'}
              </span>
              {formData.instagram_username && (
                <a
                  href={getInstagramUrl(formData.instagram_username)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-pink-600 hover:text-pink-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </h4>
            <p className="text-xs text-slate-500">
              {formData.followers > 0
                ? `${formData.followers.toLocaleString('en-IN')} Total Followers`
                : 'Follower count not set'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-slate-400">Primary Handle</p>
            <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
              {formData.instagram_username ? `@${formData.instagram_username}` : 'N/A'}
            </p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Followers</p>
            <p className="text-xs font-bold text-pink-600 truncate mt-0.5">
              {formData.followers.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase font-bold text-slate-400">Linked Accounts</p>
            <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
              {instagramProfiles.length} Account(s)
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500 flex items-start gap-2">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Live media grid from Instagram Meta Graph API automatically populates when creator logs in
            with Instagram OAuth. As an admin, you can edit followers and linked profiles in Step 1.
          </span>
        </div>
      </div>
    </div>
  )
}
