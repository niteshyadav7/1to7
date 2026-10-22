'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, CheckCircle2, AlertCircle, ArrowLeft, Loader2,
  Phone, User, Home, Building2, Sparkles, ShieldCheck,
  Check, Edit3, Plus, ArrowRight, Package, Clock, Truck
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'
import BrandLoader from '@/components/ui/BrandLoader'

function AddressConfirmationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const appId = searchParams.get('id') || searchParams.get('appId') || searchParams.get('application_id') || ''

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [applicationData, setApplicationData] = useState<any>(null)
  const [hubApplications, setHubApplications] = useState<any[]>([])
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
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

  // Dynamic campaign/courier fields (e.g. Size, Color, Preferences)
  const [campaignOrderFields, setCampaignOrderFields] = useState<Array<{ name: string; type: string; required?: boolean; options?: string[] }>>([])
  const [orderDetails, setOrderDetails] = useState<Record<string, any>>({})

  // Cities for selected state
  const availableCities = selectedState && INDIA_DATA[selectedState] ? INDIA_DATA[selectedState] : []

  // Check login state and redirect if needed
  useEffect(() => {
    if (!authLoading && !user && typeof window !== 'undefined') {
      const redirectUrl = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      router.push(redirectUrl)
    }
  }, [authLoading, user, router])

  // Fetch application & address data (Single mode or Hub mode)
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)
      try {
        if (appId) {
          // Single Campaign Address Mode
          const res = await fetch(`/api/dashboard/applications/${appId}/address`)
          const data = await res.json()

          if (!res.ok) {
            throw new Error(data.error || 'Failed to load application details')
          }

          setApplicationData(data.application)

          // Load dynamic campaign order fields & pre-existing answers
          const rawCampFields = data.application?.campaign?.order_form_fields || []
          setCampaignOrderFields(Array.isArray(rawCampFields) ? rawCampFields : [])
          setOrderDetails(data.application?.order_details || {})

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
        } else {
          // Hub Mode: Fetch user's applications & saved profile shipping addresses
          const [appsRes, profileRes] = await Promise.all([
            fetch('/api/dashboard/applications'),
            fetch('/api/dashboard/profile').catch(() => null)
          ])

          const appsData = await appsRes.json()
          if (!appsRes.ok) {
            throw new Error(appsData.error || 'Failed to load applications')
          }

          setHubApplications(appsData.applications || [])

          if (profileRes && profileRes.ok) {
            const pData = await profileRes.json()
            const u = pData.user
            let addrs: any[] = []
            if (Array.isArray(u?.shipping_addresses) && u.shipping_addresses.length > 0) {
              addrs = u.shipping_addresses
            } else if (u?.shipping_address && (u.shipping_address.address_line1 || u.shipping_address.street_address)) {
              addrs = [u.shipping_address]
            }
            setSavedAddresses(addrs)
          }
        }
      } catch (err: any) {
        console.error(err)
        setErrorMsg(err.message || 'Unable to access address confirmation.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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

    // Validate any required campaign order/dispatch fields
    for (const f of campaignOrderFields) {
      if (f.required && (!orderDetails[f.name] || String(orderDetails[f.name]).trim() === '')) {
        toast.error(`Please provide ${f.name} for dispatch`)
        return
      }
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
        order_details: orderDetails,
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
      <div className="flex items-center justify-center min-h-[400px]">
        <BrandLoader />
      </div>
    )
  }

  // Error Screen
  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-white border border-rose-200 text-center space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Delivery Details Unavailable</h2>
        <p className="text-xs text-slate-500 leading-relaxed">{errorMsg}</p>
        <div className="pt-2 flex flex-col gap-2">
          <Link href="/dashboard/address-confirmation">
            <Button className="w-full bg-primary-container hover:bg-primary-container/90 text-black font-bold text-xs rounded-lg shadow-2xs">
              Go to Address Hub
            </Button>
          </Link>
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" className="w-full text-slate-600 hover:text-slate-900 text-xs">
              View My Collaborations
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Hub Mode View (When user visits /dashboard/address-confirmation directly from sidebar)
  if (!appId) {
    const pendingApps = hubApplications.filter((a: any) => {
      const needsAddress = Boolean(a.campaigns?.address_required || a.campaigns?.order_form)
      return needsAddress && !a.form_data?.address_confirmed
    })

    const confirmedApps = hubApplications.filter((a: any) => {
      const needsAddress = Boolean(a.campaigns?.address_required || a.campaigns?.order_form)
      return needsAddress && Boolean(a.form_data?.address_confirmed)
    })

    const primarySaved = savedAddresses.find((a: any) => a.is_default) || savedAddresses[0]

    return (
      <div className="space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div>
            <h1 className="text-lg font-bold text-charcoal-surface flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
              Address Confirmation
            </h1>
            <p className="text-[11px] text-secondary mt-0.5">
              Confirm shipping locations and review dispatch addresses for your barter product collaborations
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingApps.length > 0 && (
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 flex items-center gap-1.5 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                {pendingApps.length} Action Required
              </span>
            )}
            <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shrink-0 hidden sm:block">
              Total: {pendingApps.length + confirmedApps.length}
            </div>
          </div>
        </div>

        {/* Priority Action Required Alert Banner */}
        {pendingApps.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 via-orange-50/40 to-white p-4 sm:p-5 rounded-2xl border border-amber-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Action Required: Confirm Delivery Address
                  <span className="h-5 px-2 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">
                    {pendingApps.length}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Brands are waiting to pack and dispatch your collaboration parcel. Confirm your shipping location below:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {pendingApps.map((app: any) => {
                const c = app.campaigns || {}
                return (
                  <div
                    key={app.id}
                    className="bg-white p-4 rounded-xl border border-amber-300 shadow-2xs flex flex-col justify-between gap-3 hover:border-amber-400 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {c.brand_name || 'Campaign'}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                          Address Needed
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Code: <span className="font-mono font-bold text-slate-700">{c.campaign_code || 'CAM'}</span>
                      </p>
                      {c.deliverables && (
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                          <span className="font-semibold text-slate-700">Deliverable:</span> {c.deliverables}
                        </p>
                      )}
                      <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200 rounded-lg p-2 font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        Delivery address required for dispatch
                      </div>
                    </div>

                    <div className="pt-1">
                      <Link href={`/dashboard/address-confirmation?id=${app.id}`}>
                        <button
                          type="button"
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary-container hover:bg-primary-container/90 text-black text-xs font-bold shadow-2xs transition-all cursor-pointer"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Confirm Address Now →
                        </button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">Pending Action</span>
              <span className={`text-xl font-extrabold mt-0.5 block ${pendingApps.length > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {pendingApps.length} Required
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">Confirmed Deliveries</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-0.5 block">
                {confirmedApps.length} Locked
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">Profile Addresses</span>
              <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
                {savedAddresses.length} Saved
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Home className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Confirmed Shipments */}
        {confirmedApps.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Confirmed Deliveries ({confirmedApps.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {confirmedApps.map((app: any) => {
                const c = app.campaigns || {}
                const addr = app.form_data?.shipping_address || app.form_data?.address || {}
                return (
                  <div
                    key={app.id}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{c.brand_name || 'Campaign'}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          ✓ Confirmed
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Code: <span className="font-mono font-bold text-slate-700">{c.campaign_code}</span>
                      </p>

                      {addr.address_line1 && (
                        <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                          <p className="font-semibold text-slate-900">{addr.recipient_name || addr.name || 'Recipient'}</p>
                          <p className="text-slate-600 truncate">{addr.address_line1}</p>
                          <p className="text-slate-500 text-[11px] font-medium">{addr.city}, {addr.state} - {addr.pincode}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      <Link href={`/dashboard/address-confirmation?id=${app.id}`}>
                        <button
                          type="button"
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                          Review / Edit Details
                        </button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Primary Saved Profile Address */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-slate-700" />
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                Saved Profile Delivery Address
              </h3>
            </div>
            <Link href="/dashboard/profile?step=2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
              >
                <Edit3 className="h-3 w-3 text-slate-400" />
                Manage in Profile (Step 2)
              </button>
            </Link>
          </div>

          {primarySaved ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {primarySaved.recipient_name || primarySaved.name || user?.full_name}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
                    {primarySaved.title || 'Default'}
                  </span>
                </div>
                {primarySaved.mobile && (
                  <span className="text-xs text-slate-500 font-mono">+91 {primarySaved.mobile}</span>
                )}
              </div>
              <p className="text-xs text-slate-700">
                {primarySaved.address_line1 || primarySaved.street_address}
                {primarySaved.address_line2 ? `, ${primarySaved.address_line2}` : ''}
                {primarySaved.landmark ? `, Near ${primarySaved.landmark}` : ''}
              </p>
              <p className="text-xs font-medium text-slate-500">
                {primarySaved.city}, {primarySaved.state} — <span className="font-mono font-bold text-slate-800">{primarySaved.pincode || primarySaved.postal_code}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center space-y-2 bg-slate-50/50">
              <MapPin className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600">
                No delivery address saved in your profile yet.
              </p>
              <Link href="/dashboard/profile?step=2">
                <button
                  type="button"
                  className="mt-1 px-3 py-1.5 rounded-lg bg-primary-container hover:bg-primary-container/90 text-black text-xs font-bold shadow-2xs cursor-pointer"
                >
                  Add Delivery Address Now
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Empty State when no campaigns need delivery */}
        {pendingApps.length === 0 && confirmedApps.length === 0 && (
          <div className="rounded-md border border-border-subtle bg-white p-10 text-center shadow-2xs space-y-2">
            <Package className="h-10 w-10 text-secondary mx-auto mb-2" />
            <h3 className="text-sm font-bold text-charcoal-surface">No Physical Deliveries Pending</h3>
            <p className="text-xs text-secondary max-w-md mx-auto">
              You do not have any barter collaborations awaiting product dispatch confirmation right now. Your profile delivery location is saved and ready for upcoming collaborations.
            </p>
            <div className="pt-3 flex items-center justify-center gap-2.5">
              <Link
                href="/dashboard/campaigns"
                className="text-xs font-bold px-4 py-2 rounded-md bg-primary-container text-black hover:bg-primary-container/90 transition-all shadow-sm cursor-pointer"
              >
                Browse Collaborations
              </Link>
              <Link
                href="/dashboard/profile?step=2"
                className="text-xs font-semibold px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Edit Profile Address
              </Link>
            </div>
          </div>
        )}
      </div>
    )
  }

  const campaign = applicationData?.campaign || {}
  const isAlreadyConfirmed = applicationData?.address_confirmed || isSuccess

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/address-confirmation">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            <span>All Delivery Requests</span>
          </button>
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
          Secure Dispatch Verification
        </span>
      </div>

      {/* Campaign Info Hero */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              Barter Product Delivery
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-2">
              {campaign.brand_name || 'Brand Collaboration'}
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Campaign Code: {campaign.campaign_code || 'CAM-001'}
            </p>
          </div>

          <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            📦
          </div>
        </div>

        {campaign.deliverables && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
            <span className="text-slate-400 font-semibold">Deliverable:</span>
            <span className="font-semibold text-slate-800">{campaign.deliverables}</span>
          </div>
        )}
      </div>

      {/* Confirmation Success Celebration State */}
      {isSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center space-y-3 shadow-2xs"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Delivery Address Confirmed!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            The brand team has received your confirmed delivery address. Your barter package will be packed and dispatched for delivery.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/dashboard/address-confirmation">
              <Button className="bg-primary-container hover:bg-primary-container/90 text-black text-xs font-extrabold rounded-xl px-5 h-9">
                Delivery Hub
              </Button>
            </Link>
            <Link href="/dashboard/campaigns">
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs rounded-xl h-9">
                View My Campaigns
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => setIsSuccess(false)}
              className="text-slate-500 hover:text-slate-800 text-xs rounded-xl h-9"
            >
              Review Address
            </Button>
          </div>
        </motion.div>
      )}

      {/* Already Confirmed Banner */}
      {isAlreadyConfirmed && !isSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-900">Address Already Confirmed</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Your delivery details are locked for this collaboration. You can update them below if your location changed.
              </p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              <Edit3 className="h-3 w-3" />
              <span>Change</span>
            </button>
          )}
        </div>
      )}

      {/* Mode 1: Quick Confirm Pre-filled Card (When not editing and has address) */}
      {!isEditing && addressLine1 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Confirmed Delivery Location
              </h3>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit Address</span>
            </button>
          </div>

          {/* Formatted Address Box */}
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-900">{recipientName}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                {addressType}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
              <p className="font-medium text-slate-800">
                {addressLine1}{addressLine2 ? `, ${addressLine2}` : ''}
              </p>
              {landmark && (
                <p className="text-slate-500 text-[11px]">Landmark: Near {landmark}</p>
              )}
              <p className="text-slate-700 font-semibold">
                {selectedCity}, {selectedState} — <span className="font-mono text-emerald-700 font-bold">{pincode}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-slate-700 font-medium">
                <Phone className="h-3 w-3 text-slate-400" /> +91 {mobile}
              </span>
              {altMobile && (
                <span className="text-slate-500 text-[11px]">Alt: +91 {altMobile}</span>
              )}
            </div>

            {deliveryRemarks && (
              <div className="text-[11px] bg-amber-50 text-amber-900 p-2 rounded-lg border border-amber-200">
                <strong>Delivery Note:</strong> {deliveryRemarks}
              </div>
            )}
          </div>

          {/* 1-Click Quick Confirm Action */}
          {!isAlreadyConfirmed && (
            <Button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="w-full h-11 bg-primary-container hover:bg-primary-container/90 text-black font-extrabold text-sm rounded-xl shadow-xs cursor-pointer transition-all active:scale-98"
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
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                Or pick another saved address:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {applicationData.saved_addresses.map((a: any) => (
                  <button
                    key={a.id || a.address_line1}
                    type="button"
                    onClick={() => handleSelectSavedAddress(a)}
                    className="text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-xs cursor-pointer group"
                  >
                    <span className="font-bold text-slate-800 block group-hover:text-black">
                      {a.title || 'Address'} ({a.city})
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block mt-0.5">
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
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200/80 bg-white p-6 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-700" />
                {addressLine1 ? 'Update Delivery Address' : 'Enter Delivery Address'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter where you want the brand to deliver your collaboration parcel.
              </p>
            </div>
            {addressLine1 && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Address Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600 font-semibold">Address Type</Label>
            <div className="flex items-center gap-2">
              {(['Home', 'Office', 'Other'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAddressType(type)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    addressType === type
                      ? 'bg-primary-container text-black border-amber-300 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
              <Label className="text-xs text-slate-700 font-semibold">Recipient Name *</Label>
              <Input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="Full name of person receiving parcel"
                className="bg-white border-slate-200 text-slate-900 rounded-lg text-xs h-9 focus:border-slate-400"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Delivery Mobile Number *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">+91</span>
                <Input
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="bg-white border-slate-200 text-slate-900 pl-10 rounded-lg text-xs h-9 focus:border-slate-400"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 font-semibold">Alternate Contact Number (Optional)</Label>
            <Input
              type="tel"
              maxLength={10}
              value={altMobile}
              onChange={e => setAltMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="Backup phone number for courier delivery person"
              className="bg-white border-slate-200 text-slate-900 rounded-lg text-xs h-9 focus:border-slate-400"
            />
          </div>

          {/* Street Address */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 font-semibold">Flat / House No. / Building / Floor *</Label>
            <Input
              type="text"
              value={addressLine1}
              onChange={e => setAddressLine1(e.target.value)}
              placeholder="e.g. Flat 402, Sunshine Heights, 4th Floor"
              className="bg-white border-slate-200 text-slate-900 rounded-lg text-xs h-9 focus:border-slate-400"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Street / Area / Colony</Label>
              <Input
                type="text"
                value={addressLine2}
                onChange={e => setAddressLine2(e.target.value)}
                placeholder="e.g. MG Road, Indiranagar"
                className="bg-white border-slate-200 text-slate-900 rounded-lg text-xs h-9 focus:border-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Landmark (Optional)</Label>
              <Input
                type="text"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                placeholder="e.g. Near City Mall / Opposite Metro Station"
                className="bg-white border-slate-200 text-slate-900 rounded-lg text-xs h-9 focus:border-slate-400"
              />
            </div>
          </div>

          {/* State, City & PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">State *</Label>
              <select
                value={selectedState}
                onChange={e => {
                  setSelectedState(e.target.value)
                  setSelectedCity('')
                }}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg text-xs h-9 px-3 cursor-pointer focus:outline-none focus:border-slate-400"
                required
              >
                <option value="" className="text-slate-400">Select State</option>
                {STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">City *</Label>
              {availableCities.length > 0 ? (
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg text-xs h-9 px-3 cursor-pointer focus:outline-none focus:border-slate-400"
                  required
                >
                  <option value="" className="text-slate-400">Select City</option>
                  {availableCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Other">Other / Not Listed</option>
                </select>
              ) : (
                <Input
                  type="text"
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  placeholder="Enter city"
                  className="bg-white border-slate-200 text-slate-900 rounded-lg text-xs h-9 focus:border-slate-400"
                  required
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-semibold">Pincode *</Label>
              <Input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit PIN"
                className="bg-white border-slate-200 text-slate-900 rounded-lg text-xs h-9 font-mono focus:border-slate-400"
                required
              />
            </div>
          </div>

          {/* Delivery Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 font-semibold">Special Delivery Instructions (Optional)</Label>
            <Input
              type="text"
              value={deliveryRemarks}
              onChange={e => setDeliveryRemarks(e.target.value)}
              placeholder="e.g. Call before delivery / Leave with security"
              className="bg-white border-slate-200 text-slate-900 rounded-lg text-xs h-9 focus:border-slate-400"
            />
          </div>

          {/* Dynamic Campaign / Dispatch Specifications */}
          {campaignOrderFields.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900">
                    Campaign / Product Details for Dispatch
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Required by Brand
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {campaignOrderFields.map(field => (
                  <div key={field.name} className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>{field.name}</span>
                      {field.required && <span className="text-rose-500 font-bold">*</span>}
                    </Label>
                    {field.type === 'select' && Array.isArray(field.options) && field.options.length > 0 ? (
                      <select
                        value={orderDetails[field.name] || ''}
                        onChange={(e) => setOrderDetails(prev => ({ ...prev, [field.name]: e.target.value }))}
                        className="w-full h-9 px-3 text-xs rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-400 font-medium"
                        required={field.required}
                      >
                        <option value="">Select {field.name}...</option>
                        {field.options.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={orderDetails[field.name] || ''}
                        onChange={(e) => setOrderDetails(prev => ({ ...prev, [field.name]: e.target.value }))}
                        placeholder={`Enter ${field.name}`}
                        className="bg-white border-slate-200 text-slate-900 rounded-lg text-xs h-9 focus:border-slate-400"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save to Profile Toggle */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToProfile}
              onChange={e => setSaveToProfile(e.target.checked)}
              className="h-4 w-4 rounded accent-primary-container bg-white border-slate-300"
            />
            <div>
              <p className="text-xs font-bold text-slate-900">Save as my default delivery address</p>
              <p className="text-[10px] text-slate-500">
                Automatically pre-fills this verified address in future barter campaigns.
              </p>
            </div>
          </label>

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-primary-container hover:bg-primary-container/90 text-black font-extrabold text-sm rounded-xl shadow-xs cursor-pointer transition-all active:scale-98"
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
          <BrandLoader />
        </div>
      }
    >
      <AddressConfirmationContent />
    </Suspense>
  )
}
