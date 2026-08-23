'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, X, Plus, Loader2, Check, Home, Building, Package, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'

export interface QuickAddAddressModalProps {
  isOpen: boolean
  onClose: () => void
  targetStates?: string[]
  targetCities?: string[]
  campaignTitle?: string
  onSuccess?: (addedAddress: any) => void
}

export default function QuickAddAddressModal({
  isOpen,
  onClose,
  targetStates = [],
  targetCities = [],
  campaignTitle = 'Campaign',
  onSuccess,
}: QuickAddAddressModalProps) {
  const { user, refreshUserProfile } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  // Default state to target state if provided
  const initialTargetState = targetStates.length > 0 ? targetStates[0] : (user?.state || STATES[0])
  const initialTargetCity = targetCities.length > 0 ? targetCities[0] : (user?.city || '')

  const [form, setForm] = useState({
    title: 'Studio / Branch',
    recipient_name: '',
    mobile: '',
    state: initialTargetState,
    city: initialTargetCity,
    address_line1: '',
    address_line2: '',
    pincode: '',
    landmark: '',
    delivery_remarks: '',
  })

  useEffect(() => {
    if (isOpen && user) {
      const defaultState = targetStates.length > 0 ? targetStates[0] : (user.state || 'UTTAR PRADESH')
      const defaultCity = targetCities.length > 0 ? targetCities[0] : (user.city || '')
      setForm({
        title: targetStates.length > 0 ? `${targetStates[0]} Location` : 'Alternate Address',
        recipient_name: user.full_name || '',
        mobile: user.mobile || '',
        state: defaultState,
        city: defaultCity,
        address_line1: '',
        address_line2: '',
        pincode: user.pincode || '',
        landmark: '',
        delivery_remarks: '',
      })
    }
  }, [isOpen, user, targetStates, targetCities])

  if (!isOpen) return null

  const availableCities = INDIA_DATA[form.state] || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.recipient_name.trim()) {
      toast.error('Recipient name is required')
      return
    }
    if (!form.mobile.trim() || form.mobile.replace(/\D/g, '').length !== 10) {
      toast.error('Please enter a valid 10-digit contact number')
      return
    }
    if (!form.state) {
      toast.error('Please select a state')
      return
    }
    if (!form.city.trim()) {
      toast.error('Please select or enter a city')
      return
    }
    if (!form.address_line1.trim()) {
      toast.error('Please enter full delivery address line')
      return
    }

    setSubmitting(true)
    try {
      const newAddress = {
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: form.title.trim() || 'Alternate Address',
        recipient_name: form.recipient_name.trim(),
        mobile: form.mobile.trim(),
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || undefined,
        landmark: form.landmark.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        delivery_remarks: form.delivery_remarks.trim() || undefined,
        is_default: false,
        created_at: new Date().toISOString(),
      }

      // Append to existing shipping addresses
      const existingAddresses = (user?.shipping_addresses && Array.isArray(user.shipping_addresses))
        ? user.shipping_addresses
        : []

      const updatedAddresses = [...existingAddresses, newAddress]

      // Save to profile
      const res = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_addresses: updatedAddresses,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save address')

      await refreshUserProfile()
      toast.success(`Address in ${form.city}, ${form.state} added and saved to your profile!`)
      
      if (onSuccess) {
        onSuccess(newAddress)
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add address')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 via-white to-pink-50/50 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Add Location Address
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add an address in {targetStates.length > 0 ? targetStates.join(', ') : 'target region'} to become eligible for this campaign.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Target Helper Pill */}
            {targetStates.length > 0 && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-2 text-indigo-900">
                <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="font-medium text-[11px]">
                  Required for campaign: <strong className="font-bold">{targetStates.join(', ')}</strong> {targetCities.length > 0 ? `(${targetCities.join(', ')})` : ''}
                </span>
              </div>
            )}

            {/* Address Label & Recipient */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 font-bold uppercase text-[10px]">Location Label / Tag</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Lucknow Studio, Noida Office"
                  className="h-9 text-xs bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 font-bold uppercase text-[10px]">Recipient Full Name *</Label>
                <Input
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  placeholder="Receiver's name"
                  className="h-9 text-xs bg-slate-50 border-slate-200"
                  required
                />
              </div>
            </div>

            {/* Mobile & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 font-bold uppercase text-[10px]">Contact Mobile *</Label>
                <Input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="10-digit phone"
                  className="h-9 text-xs bg-slate-50 border-slate-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 font-bold uppercase text-[10px]">State *</Label>
                <Select
                  value={form.state}
                  onValueChange={(val) => setForm({ ...form, state: val || '', city: '' })}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200 text-slate-900">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px] bg-white border-slate-200 text-slate-900 shadow-xl">
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* City & Pincode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 font-bold uppercase text-[10px]">City / District *</Label>
                {availableCities.length > 0 ? (
                  <Select
                    value={form.city}
                    onValueChange={(val) => setForm({ ...form, city: val || '' })}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200 text-slate-900">
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[220px] bg-white border-slate-200 text-slate-900 shadow-xl">
                      {availableCities.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Enter city"
                    className="h-9 text-xs bg-slate-50 border-slate-200"
                    required
                  />
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 font-bold uppercase text-[10px]">Pincode (PIN)</Label>
                <Input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="6-digit pincode"
                  className="h-9 text-xs bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            {/* Address Line */}
            <div className="space-y-1">
              <Label className="text-slate-700 font-bold uppercase text-[10px]">Flat / House / Street Address *</Label>
              <Input
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                placeholder="Building, street, colony, area..."
                className="h-9 text-xs bg-slate-50 border-slate-200"
                required
              />
            </div>

            {/* Landmark */}
            <div className="space-y-1">
              <Label className="text-slate-700 font-bold uppercase text-[10px]">Landmark (Optional)</Label>
              <Input
                value={form.landmark}
                onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                placeholder="Nearby landmark..."
                className="h-9 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={submitting}
                className="h-9 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Saving Address...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Save & Select Address
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
