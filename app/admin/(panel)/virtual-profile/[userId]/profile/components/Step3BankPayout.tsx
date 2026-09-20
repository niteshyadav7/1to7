import React from 'react'
import {
  CreditCard,
  User,
  Hash,
  Building,
  FileText,
  CheckCircle2,
  Eye,
  ExternalLink,
  RefreshCw,
  Trash2,
  UploadCloud,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { ProfileFormData } from '@/types/user'

interface Step3BankPayoutProps {
  formData: ProfileFormData
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>
  isSuperAdmin: boolean
  isUploadingPan: boolean
  handlePanImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  performSave: (dataToSave?: ProfileFormData, isAuto?: boolean) => Promise<any>
}

export const Step3BankPayout: React.FC<Step3BankPayoutProps> = ({
  formData,
  setFormData,
  isSuperAdmin,
  isUploadingPan,
  handlePanImageUpload,
  performSave,
}) => {
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-start gap-3">
        <CreditCard className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Bank Payout & PAN Card Details
          </h4>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Direct bank account details and PAN Card used for campaign payout settlements and TDS
            verification.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Account Holder Name */}
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">
            Account Holder Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              disabled={!isSuperAdmin}
              value={formData.account_name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, account_name: e.target.value })
              }
              placeholder="As per bank records"
              className={`pl-9 h-10 text-xs rounded-lg placeholder:text-slate-400 transition-all ${
                isSuperAdmin
                  ? 'bg-slate-50/50 border border-slate-200 text-slate-900 focus-visible:ring-[#f50057] focus:bg-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
          </div>
        </div>

        {/* Account Number */}
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">
            Account Number
          </Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              disabled={!isSuperAdmin}
              value={formData.account_number || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, account_number: e.target.value })
              }
              placeholder="Enter Account Number"
              className={`pl-9 h-10 text-xs rounded-lg placeholder:text-slate-400 transition-all font-mono ${
                isSuperAdmin
                  ? 'bg-slate-50/50 border border-slate-200 text-slate-900 focus-visible:ring-[#f50057] focus:bg-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
          </div>
        </div>

        {/* IFSC Code */}
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">
            IFSC Code
          </Label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              disabled={!isSuperAdmin}
              value={formData.ifsc_code || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })
              }
              placeholder="e.g. HDFC0001234"
              className={`pl-9 h-10 text-xs rounded-lg placeholder:text-slate-400 transition-all uppercase font-mono ${
                isSuperAdmin
                  ? 'bg-slate-50/50 border border-slate-200 text-slate-900 focus-visible:ring-[#f50057] focus:bg-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
          </div>
        </div>

        {/* PAN Card Number */}
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">
            PAN Card Number
          </Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              disabled={!isSuperAdmin}
              value={formData.pan_card || ''}
              maxLength={10}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                setFormData({ ...formData, pan_card: val })
              }}
              placeholder="e.g. ABCDE1234F"
              className={`pl-9 h-10 text-xs rounded-lg placeholder:text-slate-400 transition-all uppercase font-mono tracking-wider ${
                isSuperAdmin
                  ? 'bg-slate-50/50 border border-slate-200 text-slate-900 focus-visible:ring-[#f50057] focus:bg-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
          </div>
        </div>
      </div>

      {/* PAN Card Document / Image Upload */}
      <div className="space-y-2 pt-3 border-t border-slate-200/80">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              PAN Card Document / Photo
            </Label>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isSuperAdmin
                ? "Upload or replace the creator's PAN card document image."
                : "Creator's verified PAN card document file."}
            </p>
          </div>
          {formData.pan_card_image && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Uploaded
            </span>
          )}
        </div>

        {formData.pan_card_image ? (
          <div className="relative rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative h-14 w-20 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 shadow-xs flex items-center justify-center group">
                <img
                  src={formData.pan_card_image}
                  alt="PAN Card Preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-800 truncate">PAN Card Document</p>
                  {formData.pan_card && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase font-semibold">
                      {formData.pan_card}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Saved to creator profile</p>
                <a
                  href={formData.pan_card_image}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-[#f50057] hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <Eye className="h-3 w-3" /> View full image <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
            {isSuperAdmin && (
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-xs">
                  <RefreshCw className={`h-3.5 w-3.5 ${isUploadingPan ? 'animate-spin' : ''}`} />
                  <span>{isUploadingPan ? 'Uploading...' : 'Replace'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={isUploadingPan}
                    onChange={handlePanImageUpload}
                  />
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    const updated = { ...formData, pan_card_image: '' }
                    setFormData(updated)
                    await performSave(updated, false)
                    toast.info('PAN Card image removed')
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>
        ) : isSuperAdmin ? (
          <label className="relative flex flex-col items-center justify-center w-full py-6 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#f50057]/50 bg-slate-50/50 hover:bg-rose-500/5 transition-all cursor-pointer group">
            {isUploadingPan ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 text-[#f50057] animate-spin" />
                <span className="text-xs font-semibold text-slate-600">Uploading PAN Card...</span>
              </div>
            ) : (
              <>
                <div className="h-10 w-10 rounded-full bg-slate-100 group-hover:bg-[#f50057]/10 flex items-center justify-center mb-2 transition-colors">
                  <UploadCloud className="h-5 w-5 text-slate-500 group-hover:text-[#f50057] transition-colors" />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                  Click to upload PAN Card image
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or WEBP (Max 5MB)</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={isUploadingPan}
              onChange={handlePanImageUpload}
            />
          </label>
        ) : (
          <div className="py-6 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-xs">
            <FileText className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
            <span>No PAN card document uploaded by creator.</span>
          </div>
        )}
      </div>
    </div>
  )
}
