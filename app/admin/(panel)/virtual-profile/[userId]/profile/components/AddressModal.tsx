import React from 'react'
import { MapPin, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'
import type { ShippingAddress } from '@/types/user'

interface AddressModalProps {
  isOpen: boolean
  onClose: () => void
  isSuperAdmin: boolean
  editingAddressId: string | null
  addressForm: ShippingAddress
  setAddressForm: React.Dispatch<React.SetStateAction<ShippingAddress>>
  handleSaveAddress: (e: React.FormEvent) => void
}

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin,
  editingAddressId,
  addressForm,
  setAddressForm,
  handleSaveAddress,
}) => {
  if (!isOpen || !isSuperAdmin) return null

  const presetTitles = ['Home', 'Studio / Office', 'Agency', 'Other']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3 max-h-[95vh] overflow-y-auto no-scrollbar scrollbar-none">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-[#f50057] border border-pink-100 shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingAddressId ? 'Edit Delivery Location' : 'Add Delivery Location'}
              </h3>
              <p className="text-[11px] text-slate-500">Provide full shipping details for product deliveries</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSaveAddress} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Location Label / Tag</Label>
            <div className="flex flex-wrap gap-1.5">
              {presetTitles.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAddressForm({ ...addressForm, title: preset })}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    addressForm.title === preset
                      ? 'bg-[#f50057] text-white border-[#f50057] shadow-sm font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">Recipient / Receiver Name *</Label>
              <Input
                required
                value={addressForm.recipient_name}
                onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                placeholder="Full name of receiver"
                className="h-8.5 text-xs border-slate-200 rounded-lg focus-visible:ring-[#f50057]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">Delivery Contact Number *</Label>
              <Input
                required
                type="tel"
                maxLength={10}
                value={addressForm.mobile}
                onChange={(e) => setAddressForm({ ...addressForm, mobile: e.target.value.replace(/\D/g, '') })}
                placeholder="10-digit mobile number"
                className="h-8.5 text-xs border-slate-200 rounded-lg focus-visible:ring-[#f50057]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">Flat / House No., Floor, Building Name *</Label>
            <Input
              required
              value={addressForm.address_line1}
              onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
              placeholder="e.g. Flat 402, Sunshine Heights, 4th Floor"
              className="h-8.5 text-xs border-slate-200 rounded-lg focus-visible:ring-[#f50057]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">Street / Road / Area</Label>
              <Input
                value={addressForm.address_line2 || ''}
                onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                placeholder="e.g. MG Road, Near Link Road"
                className="h-8.5 text-xs border-slate-200 rounded-lg focus-visible:ring-[#f50057]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">Landmark (Optional)</Label>
              <Input
                value={addressForm.landmark || ''}
                onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                placeholder="e.g. Near Metro Station"
                className="h-8.5 text-xs border-slate-200 rounded-lg focus-visible:ring-[#f50057]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">State *</Label>
              <Select
                value={addressForm.state}
                onValueChange={(v) => setAddressForm({ ...addressForm, state: v || '', city: '' })}
              >
                <SelectTrigger className="h-8.5 text-xs border-slate-200 rounded-lg focus:ring-[#f50057]">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent side="bottom" className="bg-white border border-slate-200 max-h-[200px]">
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs py-1.5">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">City *</Label>
              <Select
                value={addressForm.city}
                onValueChange={(v) => setAddressForm({ ...addressForm, city: v || '' })}
                disabled={!addressForm.state}
              >
                <SelectTrigger className="h-8.5 text-xs border-slate-200 rounded-lg focus:ring-[#f50057] disabled:opacity-50">
                  <SelectValue placeholder={addressForm.state ? 'City' : 'Pick state'} />
                </SelectTrigger>
                <SelectContent side="bottom" className="bg-white border border-slate-200 max-h-[200px]">
                  {addressForm.state && INDIA_DATA[addressForm.state]?.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs py-1.5">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">Postal PIN Code *</Label>
              <Input
                required
                maxLength={6}
                value={addressForm.pincode}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                  })
                }
                placeholder="e.g. 400001"
                className="h-8.5 text-xs border-slate-200 rounded-lg font-mono font-bold focus-visible:ring-[#f50057]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">Delivery Instructions / Remarks</Label>
            <Input
              value={addressForm.delivery_remarks || ''}
              onChange={(e) => setAddressForm({ ...addressForm, delivery_remarks: e.target.value })}
              placeholder="e.g. Call before delivery, Leave with security"
              className="h-8.5 text-xs border-slate-200 rounded-lg focus-visible:ring-[#f50057]"
            />
          </div>

          <label className="flex items-center gap-2 pt-0.5 cursor-pointer">
            <input
              type="checkbox"
              checked={addressForm.is_default}
              onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-slate-300 text-[#f50057] focus:ring-[#f50057]"
            />
            <span className="text-xs font-semibold text-slate-800">
              Set as primary shipping address
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-8 px-3.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-8 px-4 bg-[#f50057] hover:bg-[#d8004c] text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
            >
              Save Address
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
