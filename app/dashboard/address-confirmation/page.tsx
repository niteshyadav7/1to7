'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, CheckCircle2, AlertCircle, ArrowLeft, Loader2,
  Phone, User, Home, Building2, Sparkles, ShieldCheck,
  Check, Edit3, Plus, ArrowRight, Package, Clock
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'

function AddressConfirmationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const appId = searchParams.get('id') || searchParams.get('appId') || searchParams.get('application_id') || ''

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [applicationData, setApplicationData] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Form State
  const [recipientName, setRecipientName] = useState('')
  const [mobile, setMobile] = useState('')
  const [altMobile, setAltMobile] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [landmark, setLandmark] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [deliveryRemarks, setDeliveryRemarks] = useState('')
  const [addressType, setAddressType] = useState<'Home' | 'Office' | 'Other'>('Home')
  const [saveToProfile, setSaveToProfile] = useState(true)

  // Cities for selected state
  const availableCities = selectedState && INDIA_DATA[selectedState] ? INDIA_DATA[selectedState] : []

  // Check login state and redirect if needed
  useEffect(() => {
    if (!authLoading && !user && typeof window !== 'undefined') {
      const redirectUrl = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      router.push(redirectUrl)
    }
  }, [authLoading, user, router])

  // Fetch application & address data
  useEffect(() => {
    if (!appId || !user) return

    const fetchAppAddress = async () => {
      setLoading(true)
      setErrorMsg(null)
      try {
        const res = await fetch(`/api/dashboard/applications/${appId}/address`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load application details')
        }

        setApplicationData(data.application)

        const addr = data.application?.current_address
        if (addr) {
          setRecipientName(addr.recipient_name || addr.name || data.application.creator?.full_name || '')
          setMobile(addr.mobile || data.application.creator?.mobile || '')
          setAltMobile(addr.alt_mobile || '')
          setAddressLine1(addr.address_line1 || '')
          setAddressLine2(addr.address_line2 || '')
          setLandmark(addr.landmark || '')
          setSelectedState(addr.state || '')
          setSelectedCity(addr.city || '')
          setPincode(addr.pincode || '')
          setDeliveryRemarks(addr.delivery_remarks || addr.delivery_notes || '')
          if (addr.title || addr.address_type) {
            const t = (addr.title || addr.address_type || '').toLowerCase()
            setAddressType(t === 'office' ? 'Office' : t === 'other' ? 'Other' : 'Home')
          }
          setIsEditing(false)
        } else {
          // New address needed
          setRecipientName(data.application?.creator?.full_name || user.full_name || '')
          setMobile(data.application?.creator?.mobile || user.mobile || '')
          setIsEditing(true)
        }
      } catch (err: any) {
        console.error(err)
        setErrorMsg(err.message || 'Unable to access address confirmation.')
      } finally {
        setLoading(false)
      }
    }

    fetchAppAddress()
  }, [appId, user])

  // Handle Submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const cleanName = recipientName.trim()
    const cleanMobile = mobile.replace(/\D/g, '')
    const cleanAlt = altMobile.replace(/\D/g, '')
    const cleanLine1 = addressLine1.trim()
    const cleanPin = pincode.replace(/\D/g, '')

    if (!cleanName) {
      toast.error('Please enter recipient name')
      return
    }
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }
    if (cleanAlt && cleanAlt.length !== 10) {
      toast.error('Alternate phone must be 10 digits')
      return
    }
    if (!cleanLine1) {
      toast.error('Please enter Flat / House / Building details')
      return
    }
    if (!selectedState) {
      toast.error('Please select state')
      return
    }
    if (!selectedCity) {
      toast.error('Please select city')
      return
    }
    if (!cleanPin || cleanPin.length !== 6) {
      toast.error('Please enter a valid 6-digit Pincode')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        shipping_address: {
          title: addressType,
          recipient_name: cleanName,
          name: cleanName,
          mobile: cleanMobile,
          alt_mobile: cleanAlt || undefined,
          address_line1: cleanLine1,
          address_line2: addressLine2.trim() || undefined,
          landmark: landmark.trim() || undefined,
          city: selectedCity,
          state: selectedState,
          pincode: cleanPin,
          delivery_remarks: deliveryRemarks.trim() || undefined,
        },
        save_to_profile: saveToProfile,
      }

      const res = await fetch(`/api/dashboard/applications/${appId}/address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm address')
      }

      toast.success('Delivery address confirmed!')
      setIsSuccess(true)
      setIsEditing(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm address')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle switching to a saved profile address
  const handleSelectSavedAddress = (addr: any) => {
    setRecipientName(addr.recipient_name || addr.name || '')
    setMobile(addr.mobile || '')
    setAltMobile(addr.alt_mobile || '')
    setAddressLine1(addr.address_line1 || '')
    setAddressLine2(addr.address_line2 || '')
    setLandmark(addr.landmark || '')
    setSelectedState(addr.state || '')
    setSelectedCity(addr.city || '')
    setPincode(addr.pincode || '')
    setDeliveryRemarks(addr.delivery_remarks || addr.delivery_notes || '')
    setIsEditing(false)
    toast.info('Loaded saved address')
  }

  // Loading Screen
  if (authLoading || (loading && !errorMsg)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-300">Loading campaign delivery details...</p>
      </div>
    )
  }

  // Error Screen
  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-3xl bg-slate-900/90 border border-red-500/30 text-center space-y-4 shadow-2xl backdrop-blur-xl">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Application Access Issue</h2>
        <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
        <div className="pt-2 flex flex-col gap-2">
          <Link href="/dashboard/campaigns">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl">
              Go to My Campaigns
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full text-slate-400 hover:text-white text-xs">
              Creator Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const campaign = applicationData?.campaign || {}
  const isAlreadyConfirmed = applicationData?.address_confirmed || isSuccess

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/campaigns">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            <span>My Collaborations</span>
          </button>
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Secure Dispatch Verification
        </span>
      </div>

      {/* Campaign Info Hero */}
      <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
              Barter Product Delivery
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              {campaign.brand_name || 'Brand Collaboration'}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Campaign Code: {campaign.campaign_code || 'CAM-001'}
            </p>
          </div>

          <div className="h-12 w-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner">
            📦
          </div>
        </div>

        {campaign.deliverables && (
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-slate-300">
            <span className="text-slate-500 font-semibold">Deliverable:</span>
            <span className="font-medium text-slate-200">{campaign.deliverables}</span>
          </div>
        )}
      </div>

      {/* Confirmation Success Celebration State */}
      {isSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-3 shadow-xl shadow-emerald-950/20"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-extrabold text-white">Delivery Address Confirmed!</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            The brand team has received your confirmed delivery address. Your barter package will be packed and dispatched for delivery.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link href="/dashboard/campaigns">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl px-5">
                View My Campaigns
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setIsSuccess(false)}
              className="border-white/10 text-slate-300 text-xs rounded-xl"
            >
              Review Address
            </Button>
          </div>
        </motion.div>
      )}

      {/* Already Confirmed Banner */}
      {isAlreadyConfirmed && !isSuccess && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-300">Address Already Confirmed</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Your delivery details are locked for this collaboration. You can update them below if your location changed.
              </p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 transition-all"
            >
              <Edit3 className="h-3 w-3" />
              <span>Change</span>
            </button>
          )}
        </div>
      )}

      {/* Mode 1: Quick Confirm Pre-filled Card (When not editing and has address) */}
      {!isEditing && addressLine1 && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 space-y-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Confirmed Delivery Location
              </h3>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit Address</span>
            </button>
          </div>

          {/* Formatted Address Box */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-white">{recipientName}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {addressType}
              </span>
            </div>

            <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
              <p className="font-medium text-slate-200">
                {addressLine1}{addressLine2 ? `, ${addressLine2}` : ''}
              </p>
              {landmark && (
                <p className="text-slate-400 text-[11px]">Landmark: Near {landmark}</p>
              )}
              <p className="text-indigo-300 font-semibold">
                {selectedCity}, {selectedState} — <span className="font-mono text-emerald-400">{pincode}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-300">
                <Phone className="h-3 w-3 text-slate-500" /> +91 {mobile}
              </span>
              {altMobile && (
                <span className="text-slate-500 text-[11px]">Alt: +91 {altMobile}</span>
              )}
            </div>

            {deliveryRemarks && (
              <div className="text-[11px] bg-amber-500/10 text-amber-300 p-2 rounded-lg border border-amber-500/20">
                <strong>Delivery Note:</strong> {deliveryRemarks}
              </div>
            )}
          </div>

          {/* 1-Click Quick Confirm Action */}
          {!isAlreadyConfirmed && (
            <Button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 cursor-pointer transition-all active:scale-98"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Confirming Address...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Yes, Deliver Barter Product to This Address
                </>
              )}
            </Button>
          )}

          {/* Pick from other saved addresses */}
          {applicationData?.saved_addresses && applicationData.saved_addresses.length > 1 && (
            <div className="pt-2 border-t border-white/5">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                Or pick another saved address:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {applicationData.saved_addresses.map((a: any) => (
                  <button
                    key={a.id || a.address_line1}
                    type="button"
                    onClick={() => handleSelectSavedAddress(a)}
                    className="text-left p-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-white/5 hover:border-indigo-500/30 transition-all text-xs cursor-pointer group"
                  >
                    <span className="font-bold text-white block group-hover:text-indigo-300">
                      {a.title || 'Address'} ({a.city})
                    </span>
                    <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                      {a.address_line1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Full Address Form (When editing or no address) */}
      {(isEditing || !addressLine1) && (
        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 space-y-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-400" />
                {addressLine1 ? 'Update Delivery Address' : 'Enter Delivery Address'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter where you want the brand to deliver your collaboration parcel.
              </p>
            </div>
            {addressLine1 && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Address Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Address Type</Label>
            <div className="flex items-center gap-2">
              {(['Home', 'Office', 'Other'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAddressType(type)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    addressType === type
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/40 text-slate-400 border-white/5 hover:bg-white/5'
                  }`}
                >
                  {type === 'Home' ? '🏠 Home' : type === 'Office' ? '🏢 Office' : '📍 Other'}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Recipient Name *</Label>
              <Input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="Full name of person receiving parcel"
                className="bg-slate-950/60 border-white/10 text-white rounded-xl text-xs h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Delivery Mobile Number *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">+91</span>
                <Input
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="bg-slate-950/60 border-white/10 text-white pl-10 rounded-xl text-xs h-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Alternate Contact Number (Optional)</Label>
            <Input
              type="tel"
              maxLength={10}
              value={altMobile}
              onChange={e => setAltMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="Backup phone number for courier delivery person"
              className="bg-slate-950/60 border-white/10 text-white rounded-xl text-xs h-10"
            />
          </div>

          {/* Street Address */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Flat / House No. / Building / Floor *</Label>
            <Input
              type="text"
              value={addressLine1}
              onChange={e => setAddressLine1(e.target.value)}
              placeholder="e.g. Flat 402, Sunshine Heights, 4th Floor"
              className="bg-slate-950/60 border-white/10 text-white rounded-xl text-xs h-10"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Street / Area / Colony</Label>
              <Input
                type="text"
                value={addressLine2}
                onChange={e => setAddressLine2(e.target.value)}
                placeholder="e.g. MG Road, Indiranagar"
                className="bg-slate-950/60 border-white/10 text-white rounded-xl text-xs h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Landmark (Optional)</Label>
              <Input
                type="text"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                placeholder="e.g. Near City Mall / Opposite Metro Station"
                className="bg-slate-950/60 border-white/10 text-white rounded-xl text-xs h-10"
              />
            </div>
          </div>

          {/* State, City & PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">State *</Label>
              <select
                value={selectedState}
                onChange={e => {
                  setSelectedState(e.target.value)
                  setSelectedCity('')
                }}
                className="w-full bg-slate-950/60 border border-white/10 text-white rounded-xl text-xs h-10 px-3 cursor-pointer focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="" className="bg-slate-900 text-slate-400">Select State</option>
                {STATES.map(s => (
                  <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">City *</Label>
              {availableCities.length > 0 ? (
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 text-white rounded-xl text-xs h-10 px-3 cursor-pointer focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="" className="bg-slate-900 text-slate-400">Select City</option>
                  {availableCities.map(c => (
                    <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                  ))}
                  <option value="Other" className="bg-slate-900 text-white">Other / Not Listed</option>
                </select>
              ) : (
                <Input
                  type="text"
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  placeholder="Enter city"
                  className="bg-slate-950/60 border-white/10 text-white rounded-xl text-xs h-10"
                  required
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Pincode *</Label>
              <Input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit PIN"
                className="bg-slate-950/60 border-white/10 text-white rounded-xl text-xs h-10 font-mono"
                required
              />
            </div>
          </div>

          {/* Delivery Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Special Delivery Instructions (Optional)</Label>
            <Input
              type="text"
              value={deliveryRemarks}
              onChange={e => setDeliveryRemarks(e.target.value)}
              placeholder="e.g. Call before delivery / Leave with security"
              className="bg-slate-950/60 border-white/10 text-white rounded-xl text-xs h-10"
            />
          </div>

          {/* Save to Profile Toggle */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-white/5 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToProfile}
              onChange={e => setSaveToProfile(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-500 bg-slate-900 border-white/20"
            />
            <div>
              <p className="text-xs font-bold text-white">Save as my default delivery address</p>
              <p className="text-[10px] text-slate-400">
                Automatically pre-fills this verified address in future barter campaigns.
              </p>
            </div>
          </label>

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-600/25 cursor-pointer transition-all active:scale-98"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving & Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm & Lock Delivery Address
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function AddressConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Loading...</p>
        </div>
      }
    >
      <AddressConfirmationContent />
    </Suspense>
  )
}
