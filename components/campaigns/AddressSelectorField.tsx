'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Home, Building, Plus, CheckCircle2,
  ChevronRight, Sparkles, X, Loader2, Phone,
  User, Check, AlertCircle, Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'
import { ShippingAddress } from '@/types/user'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'

export interface AddressSelectorFieldProps {
  fieldName: string
  label?: string
  required?: boolean
  hasError?: boolean
  value?: string | ShippingAddress | null
  onChange: (formattedAddress: string, addressDetails: ShippingAddress) => void
  targetState?: string
  targetCity?: string
  className?: string
}

export function formatAddressToString(addr: ShippingAddress | any): string {
  if (!addr) return ''
  if (typeof addr === 'string') return addr
  const parts = [
    addr.address_line1,
    addr.address_line2,
    addr.landmark ? `Near ${addr.landmark}` : null,
    addr.city,
    addr.state,
    addr.pincode ? `PIN: ${addr.pincode}` : null,
  ].filter(Boolean)
  return parts.join(', ')
}

export default function AddressSelectorField({
  fieldName,
  label = 'Delivery Address',
  required = true,
  hasError = false,
  value,
  onChange,
  targetState,
  targetCity,
  className = '',
}: AddressSelectorFieldProps) {
  const { user, refreshUserProfile } = useAuth()
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null)
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [savingNewAddress, setSavingNewAddress] = useState(false)

  const savedAddresses: ShippingAddress[] = (user?.shipping_addresses && Array.isArray(user.shipping_addresses))
    ? user.shipping_addresses
    : []

  // Add Address Form State
  const [newForm, setNewForm] = useState({
    title: 'Studio',
    recipient_name: user?.full_name || '',
    mobile: user?.mobile || '',
    alt_mobile: user?.alt_mobile || '',
    address_line1: '',
    address_line2: '',
    landmark: '',
    state: targetState || user?.state || 'MAHARASHTRA',
    city: targetCity || user?.city || '',
    pincode: user?.pincode || '',
    delivery_remarks: '',
    save_to_profile: true,
  })

  // Auto-initialize selected address on mount if not yet selected
  useEffect(() => {
    if (selectedAddress) return

    if (savedAddresses.length > 0) {
      // Find default address or first address
      const defaultAddr = savedAddresses.find((a) => a.is_default) || savedAddresses[0]
      setSelectedAddress(defaultAddr)
      onChange(formatAddressToString(defaultAddr), defaultAddr)
    } else if (value && typeof value === 'object' && (value as any).address_line1) {
      setSelectedAddress(value as ShippingAddress)
    }
  }, [savedAddresses, value])

  const handleSelectAddress = (addr: ShippingAddress) => {
    setSelectedAddress(addr)
    onChange(formatAddressToString(addr), addr)
    setIsSelectModalOpen(false)
  }

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newForm.recipient_name.trim()) {
      toast.error('Recipient name is required')
      return
    }
    const cleanMobile = newForm.mobile.replace(/\D/g, '')
    if (cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit delivery mobile number')
      return
    }
    if (!newForm.address_line1.trim()) {
      toast.error('Flat / Building / House address is required')
      return
    }
    if (!newForm.state) {
      toast.error('Please select State')
      return
    }
    if (!newForm.city.trim()) {
      toast.error('Please select or enter City')
      return
    }
    const cleanPin = newForm.pincode.replace(/\D/g, '')
    if (cleanPin.length !== 6) {
      toast.error('Please enter a valid 6-digit Indian PIN code')
      return
    }

    setSavingNewAddress(true)
    try {
      const createdAddr: ShippingAddress = {
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: newForm.title || 'Studio',
        recipient_name: newForm.recipient_name.trim(),
        mobile: cleanMobile,
        alt_mobile: newForm.alt_mobile ? newForm.alt_mobile.trim() : undefined,
        address_line1: newForm.address_line1.trim(),
        address_line2: newForm.address_line2 ? newForm.address_line2.trim() : undefined,
        landmark: newForm.landmark ? newForm.landmark.trim() : undefined,
        city: newForm.city.trim(),
        state: newForm.state.trim(),
        pincode: cleanPin,
        delivery_remarks: newForm.delivery_remarks ? newForm.delivery_remarks.trim() : undefined,
        is_default: savedAddresses.length === 0,
        created_at: new Date().toISOString(),
      }

      // If user opted to save to profile
      if (newForm.save_to_profile) {
        const updatedAddrs = [...savedAddresses, createdAddr]
        const res = await fetch('/api/dashboard/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipping_addresses: updatedAddrs }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Failed to sync address to profile')
        }
        if (refreshUserProfile) {
          refreshUserProfile().catch(() => {})
        }
        toast.success('Address saved to profile & selected for this campaign!')
      } else {
        toast.success('Address selected for this campaign application!')
      }

      handleSelectAddress(createdAddr)
      setIsAddModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save address')
    } finally {
      setSavingNewAddress(false)
    }
  }

  const availableCities = newForm.state && INDIA_DATA[newForm.state as keyof typeof INDIA_DATA]
    ? INDIA_DATA[newForm.state as keyof typeof INDIA_DATA]
    : []

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label & Status Row */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-primary" />
          <span>{label}</span>
          {required && <span className="text-red-500 font-bold">*</span>}
        </label>

        {selectedAddress && (
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Profile Synced</span>
          </span>
        )}
      </div>

      {/* Main Address Card / Trigger */}
      {selectedAddress ? (
        <div
          className={`relative rounded-xl border p-3.5 sm:p-4 bg-gradient-to-br from-white via-slate-50/60 to-slate-100/40 transition-all shadow-xs ${
            hasError
              ? 'border-red-400 ring-1 ring-red-400'
              : 'border-slate-200 hover:border-primary/40 hover:shadow-sm'
          }`}
        >
          {/* Top Badge & Title */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                {selectedAddress.title === 'Home' ? <Home className="h-3 w-3" /> : <Building className="h-3 w-3" />}
                <span>{selectedAddress.title || 'Delivery Address'}</span>
              </span>
              {selectedAddress.is_default && (
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-1.5 py-0.5 rounded">
                  Default
                </span>
              )}
            </div>

            <span className="text-[10px] text-slate-500 font-medium">
              📦 Ready for Barter & Courier Dispatch
            </span>
          </div>

          {/* Recipient & Contact Details */}
          <div className="space-y-1 text-slate-800 text-xs sm:text-sm">
            <div className="flex items-center gap-2 flex-wrap font-bold text-slate-900">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-500" />
                {selectedAddress.recipient_name}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-700">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                +91 {selectedAddress.mobile}
              </span>
              {selectedAddress.alt_mobile && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 text-[11px] font-medium">
                    WhatsApp: {selectedAddress.alt_mobile}
                  </span>
                </>
              )}
            </div>

            {/* Address Lines */}
            <p className="text-slate-700 font-medium leading-relaxed pt-0.5 break-words">
              {selectedAddress.address_line1}
              {selectedAddress.address_line2 ? `, ${selectedAddress.address_line2}` : ''}
            </p>

            {/* Landmark, City, State, PIN */}
            <div className="flex items-center gap-1.5 flex-wrap text-slate-600 text-xs pt-0.5">
              {selectedAddress.landmark && (
                <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-medium mr-1">
                  📍 Near {selectedAddress.landmark}
                </span>
              )}
              <strong className="text-slate-800 font-semibold">{selectedAddress.city}</strong>,
              <span>{selectedAddress.state}</span>
              <span className="font-bold text-slate-900 bg-slate-200/70 px-1.5 py-0.2 rounded text-[11px]">
                {selectedAddress.pincode}
              </span>
            </div>

            {selectedAddress.delivery_remarks && (
              <p className="text-[11px] text-slate-500 italic pt-1">
                Note: {selectedAddress.delivery_remarks}
              </p>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 flex-wrap">
            <button
              type="button"
              onClick={() => setIsSelectModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer py-1 px-2 rounded-md hover:bg-primary/5"
            >
              <span>🔁 Change Address</span>
              {savedAddresses.length > 1 && (
                <span className="text-[10px] text-slate-500 font-normal">
                  ({savedAddresses.length} saved)
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setNewForm({
                  title: 'Studio',
                  recipient_name: user?.full_name || '',
                  mobile: user?.mobile || '',
                  alt_mobile: user?.alt_mobile || '',
                  address_line1: '',
                  address_line2: '',
                  landmark: '',
                  state: targetState || user?.state || 'MAHARASHTRA',
                  city: targetCity || user?.city || '',
                  pincode: user?.pincode || '',
                  delivery_remarks: '',
                  save_to_profile: true,
                })
                setIsAddModalOpen(true)
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer py-1 px-2 rounded-md hover:bg-slate-100"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Address</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State: No Address Selected Yet */
        <div
          className={`p-4 rounded-xl border-2 border-dashed text-center space-y-3 bg-slate-50/60 transition-all ${
            hasError ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-900">Delivery Address Required</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Please choose or enter a delivery address so barter products can be shipped directly to you.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            {savedAddresses.length > 0 ? (
              <Button
                type="button"
                onClick={() => setIsSelectModalOpen(true)}
                className="h-9 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs"
              >
                Choose from Saved Addresses ({savedAddresses.length})
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="h-9 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Delivery Address
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: SELECT SAVED ADDRESS ─── */}
      <AnimatePresence>
        {isSelectModalOpen && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSelectModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Select Delivery Location</h3>
                    <p className="text-[11px] text-slate-500">Pick where you want barter products delivered</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSelectModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Address List */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 divide-y-0">
                {savedAddresses.map((addr) => {
                  const isCurrent = selectedAddress?.id === addr.id
                  return (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectAddress(addr)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all relative ${
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                              {addr.title === 'Home' ? <Home className="h-3 w-3 text-slate-500" /> : <Building className="h-3 w-3 text-slate-500" />}
                              {addr.title}
                            </span>
                            {addr.is_default && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                Default
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-800 font-semibold">
                            {addr.recipient_name} • +91 {addr.mobile}
                          </p>

                          <p className="text-xs text-slate-600 leading-snug break-words">
                            {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}
                            {addr.landmark ? `, Near ${addr.landmark}` : ''}
                          </p>

                          <p className="text-xs font-semibold text-slate-700">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                        </div>

                        <div className="shrink-0 pt-0.5">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              isCurrent
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isCurrent && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsSelectModalOpen(false)
                    setIsAddModalOpen(true)
                  }}
                  className="h-10 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add New Address
                </Button>

                <Button
                  type="button"
                  onClick={() => setIsSelectModalOpen(false)}
                  className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Confirm & Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: ADD NEW DELIVERY ADDRESS ─── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black/65 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Add New Delivery Address</h3>
                    <p className="text-[11px] text-slate-500">Standardized details for courier & barter dispatch</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Add Form */}
              <form onSubmit={handleSaveNewAddress} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                {/* Title Pills */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Address Type
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Home', 'Studio', 'Office', 'Other'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewForm((p) => ({ ...p, title: t }))}
                        className={`h-9 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          newForm.title === t
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Name & Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Recipient Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={newForm.recipient_name}
                      onChange={(e) => setNewForm((p) => ({ ...p, recipient_name: e.target.value }))}
                      placeholder="Full Name on Parcel"
                      className="h-10 text-xs sm:text-sm bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Mobile Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={newForm.mobile}
                      onChange={(e) => setNewForm((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="10-digit mobile"
                      maxLength={10}
                      className="h-10 text-xs sm:text-sm bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Address Line 1 */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Flat / House No. / Building / Floor <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={newForm.address_line1}
                    onChange={(e) => setNewForm((p) => ({ ...p, address_line1: e.target.value }))}
                    placeholder="e.g. Flat 402, Sunshine Heights, Wing B"
                    className="h-10 text-xs sm:text-sm bg-white"
                    required
                  />
                </div>

                {/* Address Line 2 & Landmark */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Street / Area / Road (Optional)
                    </Label>
                    <Input
                      value={newForm.address_line2}
                      onChange={(e) => setNewForm((p) => ({ ...p, address_line2: e.target.value }))}
                      placeholder="e.g. New Link Road, Andheri West"
                      className="h-10 text-xs sm:text-sm bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Landmark (Optional)
                    </Label>
                    <Input
                      value={newForm.landmark}
                      onChange={(e) => setNewForm((p) => ({ ...p, landmark: e.target.value }))}
                      placeholder="e.g. Opp. Infinity Mall"
                      className="h-10 text-xs sm:text-sm bg-white"
                    />
                  </div>
                </div>

                {/* State & City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      State / UT <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={newForm.state}
                      onValueChange={(val) => setNewForm((p) => ({ ...p, state: val || '', city: '' }))}
                    >
                      <SelectTrigger className="h-10 text-xs sm:text-sm bg-white">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[220px]">
                        {STATES.map((st) => (
                          <SelectItem key={st} value={st} className="cursor-pointer text-xs">
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={newForm.city}
                      onValueChange={(val) => setNewForm((p) => ({ ...p, city: val || '' }))}
                      disabled={!newForm.state}
                    >
                      <SelectTrigger className="h-10 text-xs sm:text-sm bg-white">
                        <SelectValue placeholder={newForm.state ? 'Select City' : 'State first'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[220px]">
                        {availableCities.map((ct) => (
                          <SelectItem key={ct} value={ct} className="cursor-pointer text-xs">
                            {ct}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pincode & Alternate Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Pincode <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={newForm.pincode}
                      onChange={(e) => setNewForm((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      className="h-10 text-xs sm:text-sm bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      WhatsApp / Alt Phone (Optional)
                    </Label>
                    <Input
                      value={newForm.alt_mobile}
                      onChange={(e) => setNewForm((p) => ({ ...p, alt_mobile: e.target.value }))}
                      placeholder="Alternate contact"
                      className="h-10 text-xs sm:text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Save to Profile Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={newForm.save_to_profile}
                      onChange={(e) => setNewForm((p) => ({ ...p, save_to_profile: e.target.checked }))}
                      className="h-4 w-4 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">Save to my profile addresses</span>
                      <p className="text-[11px] text-slate-500">Auto-prefills for all future brand barter deliveries</p>
                    </div>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddModalOpen(false)}
                    className="h-10 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingNewAddress}
                    className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
                  >
                    {savingNewAddress ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                      </span>
                    ) : (
                      'Save & Select Address'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
