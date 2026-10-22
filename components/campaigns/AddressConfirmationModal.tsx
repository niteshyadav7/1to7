'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, MapPin, CheckCircle2, AlertCircle, Loader2,
  Phone, User, Home, Building2, Sparkles, Check,
  Plus, Package, ShieldCheck
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'

interface AddressConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  application: any | null
  onSuccess?: () => void
}

interface ShippingAddress {
  id?: string
  title?: string
  recipient_name?: string
  name?: string
  mobile?: string
  alt_mobile?: string
  address_line1?: string
  address_line2?: string
  landmark?: string
  city?: string
  state?: string
  pincode?: string
  delivery_remarks?: string
  is_default?: boolean
}

export default function AddressConfirmationModal({
  isOpen,
  onClose,
  application,
  onSuccess,
}: AddressConfirmationModalProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new')
  const [isAddingNew, setIsAddingNew] = useState(false)

  // Form inputs for new / edited address
  const [recipientName, setRecipientName] = useState('')
  const [mobile, setMobile] = useState('')
  const [altMobile, setAltMobile] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [landmark, setLandmark] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [deliveryRemarks, setDeliveryRemarks] = useState('')
  const [addressType, setAddressType] = useState<'Home' | 'Office' | 'Other'>('Home')
  const [saveToProfile, setSaveToProfile] = useState(true)

  // Cities for the chosen state
  const availableCities = selectedState && INDIA_DATA[selectedState] ? INDIA_DATA[selectedState] : []

  useEffect(() => {
    if (!isOpen || !application?.id) return

    let isMounted = true
    const fetchAddressDetails = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/dashboard/applications/${application.id}/address`)
        const data = await res.json()

        if (!isMounted) return

        if (res.ok && data.application) {
          const addrs: ShippingAddress[] = data.application.saved_addresses || []
          setSavedAddresses(addrs)

          const currentAddr = data.application.current_address
          if (addrs.length > 0) {
            // Find matched or default address
            const defaultAddr = addrs.find(a => a.is_default) || addrs[0]
            setSelectedAddressId(defaultAddr.id || addrs[0].id || 'saved_0')
            setIsAddingNew(false)
          } else if (currentAddr) {
            // Pre-fill fields with current address
            setRecipientName(currentAddr.recipient_name || currentAddr.name || data.application.creator?.full_name || '')
            setMobile(currentAddr.mobile || data.application.creator?.mobile || '')
            setAltMobile(currentAddr.alt_mobile || '')
            setAddressLine1(currentAddr.address_line1 || '')
            setLandmark(currentAddr.landmark || '')
            setSelectedState(currentAddr.state || '')
            setSelectedCity(currentAddr.city || '')
            setPincode(currentAddr.pincode || '')
            setDeliveryRemarks(currentAddr.delivery_remarks || '')
            setSelectedAddressId('new')
            setIsAddingNew(true)
          } else {
            // No saved addresses, default to user's basic profile
            setRecipientName(data.application.creator?.full_name || '')
            setMobile(data.application.creator?.mobile || '')
            setSelectedAddressId('new')
            setIsAddingNew(true)
          }
        }
      } catch (err) {
        console.error('Failed to load address details:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchAddressDetails()

    return () => {
      isMounted = false
    }
  }, [isOpen, application?.id])

  if (!isOpen || !application) return null

  const brandName = application.campaigns?.brand_name || 'Campaign'
  const campaignCode = application.campaigns?.campaign_code || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let payloadAddress: Partial<ShippingAddress> = {}

    if (selectedAddressId !== 'new' && !isAddingNew) {
      // Pick selected saved address
      const found = savedAddresses.find(a => a.id === selectedAddressId)
      if (!found) {
        toast.error('Please select an address or add a new one')
        return
      }
      payloadAddress = { ...found }
    } else {
      // Validate form inputs
      const cleanName = recipientName.trim()
      const cleanMobile = mobile.replace(/\D/g, '')
      const cleanAltMobile = altMobile.replace(/\D/g, '')
      const cleanLine1 = addressLine1.trim()
      const cleanCity = selectedCity.trim()
      const cleanState = selectedState.trim()
      const cleanPin = pincode.replace(/\D/g, '')

      if (!cleanName) {
        toast.error('Recipient name is required')
        return
      }
      if (!cleanMobile || cleanMobile.length !== 10) {
        toast.error('Valid 10-digit mobile number is required')
        return
      }
      if (cleanAltMobile && cleanAltMobile.length !== 10) {
        toast.error('Alternate mobile must be 10 digits')
        return
      }
      if (!cleanLine1) {
        toast.error('House / Flat / Street address is required')
        return
      }
      if (!cleanState) {
        toast.error('Please select your State')
        return
      }
      if (!cleanCity) {
        toast.error('Please select or enter your City')
        return
      }
      if (!cleanPin || cleanPin.length !== 6) {
        toast.error('Valid 6-digit Pincode is required')
        return
      }

      payloadAddress = {
        title: addressType,
        recipient_name: cleanName,
        mobile: cleanMobile,
        alt_mobile: cleanAltMobile || undefined,
        address_line1: cleanLine1,
        landmark: landmark.trim() || undefined,
        city: cleanCity,
        state: cleanState,
        pincode: cleanPin,
        delivery_remarks: deliveryRemarks.trim() || undefined,
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/dashboard/applications/${application.id}/address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_address: payloadAddress,
          save_to_profile: saveToProfile,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit address')
      }

      toast.success('Delivery address submitted successfully! Our team will verify and dispatch.')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm address')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header Strip */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/20">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                    Confirm Delivery Address
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Product Dispatch
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  For <span className="font-bold text-slate-800">{brandName}</span> {campaignCode ? `(${campaignCode})` : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                <p className="text-xs font-semibold">Loading address details...</p>
              </div>
            ) : (
              <form id="address-confirm-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Reassurance Alert */}
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                    This address will be shared with the brand logistics team for sending your barter product. Please ensure phone number and pincode are active.
                  </p>
                </div>

                {/* Section: Select Saved Address (If Available) */}
                {savedAddresses.length > 0 && !isAddingNew && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Choose From Saved Addresses ({savedAddresses.length})
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNew(true)
                          setSelectedAddressId('new')
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add New Address
                      </button>
                    </div>

                    <div className="space-y-2">
                      {savedAddresses.map((addr, idx) => {
                        const addrId = addr.id || `saved_${idx}`
                        const isSelected = selectedAddressId === addrId
                        return (
                          <div
                            key={addrId}
                            onClick={() => setSelectedAddressId(addrId)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                              isSelected
                                ? 'bg-emerald-50/60 border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/30'
                                : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <div className="mt-0.5">
                              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  {addr.title === 'Office' ? <Building2 className="h-3.5 w-3.5 text-slate-500" /> : <Home className="h-3.5 w-3.5 text-slate-500" />}
                                  {addr.recipient_name || addr.name || 'Delivery Address'}
                                </span>
                                {addr.is_default && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                                {addr.address_line1} {addr.landmark ? `(Near ${addr.landmark})` : ''}, {addr.city}, {addr.state} - <span className="font-semibold text-slate-900">{addr.pincode}</span>
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {addr.mobile} {addr.alt_mobile ? `· Alt: ${addr.alt_mobile}` : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Section: Inline Address Form (When adding new or no saved address) */}
                {(savedAddresses.length === 0 || isAddingNew) && (
                  <div className="space-y-3.5 pt-1">
                    {savedAddresses.length > 0 && (
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Enter New Delivery Address</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNew(false)
                            if (savedAddresses.length > 0) {
                              setSelectedAddressId(savedAddresses[0].id || 'saved_0')
                            }
                          }}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Cancel & Use Saved
                        </button>
                      </div>
                    )}

                    {/* Address Type Selector */}
                    <div className="flex items-center gap-2">
                      {(['Home', 'Office', 'Other'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAddressType(type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            addressType === type
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {type === 'Home' ? <Home className="h-3 w-3" /> : type === 'Office' ? <Building2 className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          {type}
                        </button>
                      ))}
                    </div>

                    {/* Recipient Name & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Recipient Full Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="e.g. Yash Agrawal"
                          className="h-10 text-xs bg-slate-50/70 border-slate-200 focus-visible:ring-emerald-500"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Mobile Number (10 Digits) <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          type="tel"
                          maxLength={10}
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="e.g. 9876543210"
                          className="h-10 text-xs bg-slate-50/70 border-slate-200 focus-visible:ring-emerald-500 font-mono"
                          required
                        />
                      </div>
                    </div>

                    {/* Alternate Phone */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Alternate Mobile Number (Optional)
                      </Label>
                      <Input
                        type="tel"
                        maxLength={10}
                        value={altMobile}
                        onChange={(e) => setAltMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="In case primary is unreachable"
                        className="h-10 text-xs bg-slate-50/70 border-slate-200 focus-visible:ring-emerald-500 font-mono"
                      />
                    </div>

                    {/* Street Address Line 1 */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Flat / House No. / Building / Street Address <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        placeholder="e.g. Flat 402, Sunshine Heights, MG Road"
                        className="h-10 text-xs bg-slate-50/70 border-slate-200 focus-visible:ring-emerald-500"
                        required
                      />
                    </div>

                    {/* Landmark & Pincode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Landmark (Optional)
                        </Label>
                        <Input
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder="e.g. Near Metro Station / Behind Axis Bank"
                          className="h-10 text-xs bg-slate-50/70 border-slate-200 focus-visible:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Pincode (6 Digits) <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          type="tel"
                          maxLength={6}
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="e.g. 110001"
                          className="h-10 text-xs bg-slate-50/70 border-slate-200 focus-visible:ring-emerald-500 font-mono"
                          required
                        />
                      </div>
                    </div>

                    {/* State & City Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          State / UT <span className="text-rose-500">*</span>
                        </Label>
                        <select
                          value={selectedState}
                          onChange={(e) => {
                            setSelectedState(e.target.value)
                            setSelectedCity('')
                          }}
                          className="w-full h-10 px-3 text-xs rounded-md bg-slate-50/70 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                          required
                        >
                          <option value="">Select State</option>
                          {STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          City / District <span className="text-rose-500">*</span>
                        </Label>
                        {availableCities.length > 0 ? (
                          <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="w-full h-10 px-3 text-xs rounded-md bg-slate-50/70 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            required
                          >
                            <option value="">Select City</option>
                            {availableCities.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            placeholder="Enter city name"
                            className="h-10 text-xs bg-slate-50/70 border-slate-200 focus-visible:ring-emerald-500"
                            required
                          />
                        )}
                      </div>
                    </div>

                    {/* Delivery Instructions */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Delivery Remarks / Notes (Optional)
                      </Label>
                      <Input
                        value={deliveryRemarks}
                        onChange={(e) => setDeliveryRemarks(e.target.value)}
                        placeholder="e.g. Leave with guard / Call before arriving"
                        className="h-10 text-xs bg-slate-50/70 border-slate-200 focus-visible:ring-emerald-500"
                      />
                    </div>

                    {/* Auto-Sync to Profile Checkbox */}
                    <div className="pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={saveToProfile}
                          onChange={(e) => setSaveToProfile(e.target.checked)}
                          className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          Save to my Profile for future campaigns (Auto-fills next time)
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Modal Footer Strip */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-100"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="address-confirm-form"
              disabled={loading || submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 shadow-sm shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Address...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submit Delivery Address
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
