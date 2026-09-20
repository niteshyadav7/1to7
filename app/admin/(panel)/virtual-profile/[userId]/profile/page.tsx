'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AtSign,
  MapPin,
  CreditCard,
  Instagram,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Lock,
  Loader2,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import BrandLoader from '@/components/ui/BrandLoader'
import { extractInstagramUsername } from '@/lib/instagram-utils'
import type {
  ShippingAddress,
  UserProfile,
  LinkedInstagramProfile,
  ProfileFormData,
} from '@/types/user'
export type { ShippingAddress, UserProfile, LinkedInstagramProfile, ProfileFormData }

// Modular Subcomponents
import { ProfileHeaderCard } from './components/ProfileHeaderCard'
import { Step1PersonalDetails } from './components/Step1PersonalDetails'
import { Step2ShippingAddresses } from './components/Step2ShippingAddresses'
import { Step3BankPayout } from './components/Step3BankPayout'
import { Step4InstagramFeed } from './components/Step4InstagramFeed'
import { AddressModal } from './components/AddressModal'
import { InstagramModal } from './components/InstagramModal'

const INFLUENCER_CATEGORIES = [
  'Fashion & Style',
  'Beauty & Skincare',
  'Fitness & Health',
  'Food & Cooking',
  'Travel & Adventure',
  'Tech & Gadgets',
  'Gaming',
  'Photography',
  'Art & Design',
  'Music & Dance',
  'Comedy & Entertainment',
  'Education & Learning',
  'Finance & Business',
  'Lifestyle & Vlogging',
  'Parenting & Family',
  'Pets & Animals',
  'Sports & Fitness',
  'Automotive & Cars',
  'Home & Interior',
  'Motivational & Self-Help',
]

const CREATOR_LANGUAGES = [
  'Hindi',
  'English',
  'Bengali',
  'Marathi',
  'Telugu',
  'Tamil',
  'Gujarati',
  'Urdu',
  'Kannada',
  'Odia',
  'Malayalam',
  'Punjabi',
  'Assamese',
  'Maithili',
  'Bhojpuri',
  'Sanskrit',
  'Rajasthani',
  'Haryanvi',
  'Kashmiri',
  'Konkani',
  'Nepali',
  'Sindhi',
]

const STEPS = [
  {
    id: 1,
    title: 'Social & Creator Profile',
    shortTitle: '1. Social',
    subtitle: 'Identity & Niche',
    icon: AtSign,
  },
  {
    id: 2,
    title: 'Shipping & Delivery Addresses',
    shortTitle: '2. Addresses',
    subtitle: 'Locations & Remarks',
    icon: MapPin,
  },
  {
    id: 3,
    title: 'Bank & Payout Details',
    shortTitle: '3. Payout',
    subtitle: 'Bank Details',
    icon: CreditCard,
  },
  {
    id: 4,
    title: 'Instagram Feed & Stats',
    shortTitle: '4. Instagram Feed',
    subtitle: 'Media & Analytics',
    icon: Instagram,
  },
]

export function computeProfileStrength(data: Partial<ProfileFormData>): number {
  const fields: (keyof ProfileFormData)[] = [
    'full_name',
    'instagram_username',
    'gender',
    'category',
    'languages',
    'state',
    'city',
    'followers',
    'dob',
    'account_name',
    'account_number',
    'ifsc_code',
  ]
  let filled = 0
  for (const f of fields) {
    if (data[f] && String(data[f]).trim() !== '' && String(data[f]) !== '0') filled++
  }
  if (data.shipping_addresses && Array.isArray(data.shipping_addresses) && data.shipping_addresses.length > 0) {
    filled++
  }
  return Math.min(100, Math.round((filled / (fields.length + 1)) * 100))
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 30 : -30,
    opacity: 0,
  }),
}

const MAX_ADDRESSES = 6

export default function AdminVirtualProfileEditPage() {
  const params = useParams()
  const userId = (params?.userId as string) || ''

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved' | 'error'>('idle')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [availableNiches, setAvailableNiches] = useState<string[]>(INFLUENCER_CATEGORIES)
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(CREATOR_LANGUAGES)
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(0)

  const isInitialLoaded = useRef(false)
  const lastSavedPayload = useRef<string>('')
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    mobile: '',
    email: '',
    instagram_username: '',
    instagram_profile_pic: '',
    gender: '',
    category: '',
    languages: '',
    state: '',
    city: '',
    pincode: '',
    followers: 0,
    dob: '',
    alt_mobile: '',
    tshirt_size: '',
    shoe_size: '',
    bio: '',
    youtube: '',
    custom_attributes: {},
    account_name: '',
    account_number: '',
    ifsc_code: '',
    pan_card: '',
    pan_card_image: '',
    shipping_addresses: [],
    address_remarks: '',
  })

  // Address Modal States
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressForm, setAddressForm] = useState<ShippingAddress>({
    id: '',
    title: 'Home',
    recipient_name: '',
    mobile: '',
    address_line1: '',
    address_line2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    delivery_remarks: '',
    is_default: true,
  })

  // Instagram Profiles State
  const [instagramProfiles, setInstagramProfiles] = useState<LinkedInstagramProfile[]>([])
  const [igModalOpen, setIgModalOpen] = useState(false)
  const [editingIgId, setEditingIgId] = useState<string | null>(null)
  const [igFormHandle, setIgFormHandle] = useState('')
  const [igFormFollowers, setIgFormFollowers] = useState('')
  const [igFormCategory, setIgFormCategory] = useState('')
  const [igFormIsPrimary, setIgFormIsPrimary] = useState(false)
  const [igAvailability, setIgAvailability] = useState<{
    checking: boolean
    available: boolean | null
    message?: string
  }>({
    checking: false,
    available: null,
  })
  const [igSubmitting, setIgSubmitting] = useState(false)

  // PAN Card Upload State
  const [isUploadingPan, setIsUploadingPan] = useState(false)

  // Fetch creator categories and languages
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.niches && Array.isArray(data.niches) && data.niches.length > 0) {
          setAvailableNiches(data.niches)
        }
        if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) {
          setAvailableLanguages(data.languages)
        }
      })
      .catch(() => {})
  }, [])

  // Load User Profile via Admin Gateway API
  const fetchProfile = async () => {
    if (!userId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/virtual-profile/${userId}?action=profile`)
      const data = await res.json()
      if (data.is_super_admin !== undefined) {
        setIsSuperAdmin(Boolean(data.is_super_admin))
      }
      if (data.user) {
        setProfile(data.user)
        const savedCategory = data.user.category || ''

        let loadedAddresses: ShippingAddress[] = []
        if (Array.isArray(data.user.shipping_addresses) && data.user.shipping_addresses.length > 0) {
          loadedAddresses = data.user.shipping_addresses
        } else if (data.user.state || data.user.city) {
          loadedAddresses = [
            {
              id: `addr_init_${Date.now()}`,
              title: 'Primary Address',
              recipient_name: data.user.full_name || 'Creator',
              mobile: data.user.mobile || '',
              address_line1: '',
              address_line2: '',
              landmark: '',
              city: data.user.city || '',
              state: data.user.state || '',
              pincode: '',
              delivery_remarks: '',
              is_default: true,
            },
          ]
        }

        let effectiveFollowers =
          typeof data.user.followers === 'number' && data.user.followers > 0 ? data.user.followers : 0
        if (
          !effectiveFollowers &&
          Array.isArray(data.user.instagram_profiles) &&
          data.user.instagram_profiles.length > 0
        ) {
          const primary =
            data.user.instagram_profiles.find((p: any) => p.is_primary) || data.user.instagram_profiles[0]
          if (primary && typeof primary.followers === 'number' && primary.followers > 0) {
            effectiveFollowers = primary.followers
          }
        }

        const initialForm: ProfileFormData = {
          full_name: data.user.full_name || '',
          mobile: data.user.mobile || '',
          email: data.user.email || '',
          instagram_username: data.user.instagram_username || '',
          instagram_profile_pic: data.user.instagram_profile_pic || '',
          gender: data.user.gender || '',
          category: savedCategory,
          languages: data.user.languages || '',
          state: data.user.state || '',
          city: data.user.city || '',
          pincode: data.user.pincode || loadedAddresses[0]?.pincode || '',
          followers: effectiveFollowers,
          dob: data.user.dob || '',
          alt_mobile: data.user.alt_mobile || '',
          tshirt_size: data.user.tshirt_size || '',
          shoe_size: data.user.shoe_size || '',
          bio: data.user.bio || '',
          youtube: data.user.youtube || '',
          custom_attributes: data.user.custom_attributes || {},
          account_name: data.user.account_name || '',
          account_number: data.user.account_number || '',
          ifsc_code: data.user.ifsc_code || '',
          pan_card: data.user.pan_card || '',
          pan_card_image: data.user.pan_card_image || '',
          shipping_addresses: loadedAddresses,
          address_remarks: data.user.address_remarks || '',
        }
        setFormData(initialForm)

        // Load linked Instagram profiles
        if (
          data.user.instagram_profiles &&
          Array.isArray(data.user.instagram_profiles) &&
          data.user.instagram_profiles.length > 0
        ) {
          setInstagramProfiles(data.user.instagram_profiles)
        } else if (data.user.instagram_username) {
          setInstagramProfiles([
            {
              id: 'primary',
              username: data.user.instagram_username,
              normalized_username: data.user.instagram_username.toLowerCase(),
              followers: data.user.followers || 0,
              category: data.user.category,
              is_primary: true,
              created_at: new Date().toISOString(),
            },
          ])
        }

        const payload = {
          ...initialForm,
          instagram_username: extractInstagramUsername(initialForm.instagram_username),
        }
        lastSavedPayload.current = JSON.stringify(payload)
        isInitialLoaded.current = true
        setSaveStatus('saved')
      } else {
        toast.error(data.error || 'Failed to load user profile')
      }
    } catch (err) {
      console.error('[AdminVirtualProfile] fetchProfile error:', err)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [userId])

  // Core save handler via Admin Gateway PUT (Super Admin only)
  const performSave = async (dataToSave = formData, isAutoSave = false) => {
    if (!userId) return

    if (!isSuperAdmin) {
      if (!isAutoSave) {
        toast.error('Read-Only mode: Only Super Administrators can modify creator profiles.')
      }
      return
    }

    const payload = {
      ...dataToSave,
      instagram_username: extractInstagramUsername(dataToSave.instagram_username),
    }
    const payloadStr = JSON.stringify(payload)

    if (isAutoSave && payloadStr === lastSavedPayload.current) {
      setSaveStatus('saved')
      return
    }

    setSaving(true)
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/admin/virtual-profile/${userId}?action=profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: payloadStr,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile')

      lastSavedPayload.current = payloadStr
      setSaveStatus('saved')

      if (data.user) {
        setProfile(data.user)
      }

      if (!isAutoSave) {
        toast.success('Creator profile updated successfully by admin')
      }
    } catch (err: unknown) {
      setSaveStatus('error')
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      if (!isAutoSave) {
        toast.error(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleManualSave = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    await performSave(formData, false)
  }

  // Auto-Save Effect: 1500ms debounce (Super Admin only)
  useEffect(() => {
    if (!isInitialLoaded.current || !isSuperAdmin) return

    const currentPayload = {
      ...formData,
      instagram_username: extractInstagramUsername(formData.instagram_username),
    }
    const currentStr = JSON.stringify(currentPayload)

    if (currentStr !== lastSavedPayload.current) {
      setSaveStatus('unsaved')
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      autoSaveTimerRef.current = setTimeout(() => {
        performSave(formData, true)
      }, 1500)
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [formData])

  // PAN Image Upload via standard /api/upload
  const handlePanImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdmin) {
      toast.error('Read-Only mode: Only Super Administrators can upload documents')
      return
    }
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setIsUploadingPan(true)
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to upload PAN card')

      const updatedForm = { ...formData, pan_card_image: data.url }
      setFormData(updatedForm)
      await performSave(updatedForm, false)
      toast.success('PAN Card uploaded and saved!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload PAN Card image')
    } finally {
      setIsUploadingPan(false)
      e.target.value = ''
    }
  }

  // Live availability check for Instagram Handle modal
  useEffect(() => {
    if (!igModalOpen || editingIgId || !igFormHandle.trim()) {
      setIgAvailability({ checking: false, available: null })
      return
    }

    const clean = extractInstagramUsername(igFormHandle)
    if (!clean) {
      setIgAvailability({ checking: false, available: null })
      return
    }

    setIgAvailability({ checking: true, available: null })
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/instagram/check-availability?username=${encodeURIComponent(clean)}&excludeUserId=${userId}`
        )
        const data = await res.json()
        setIgAvailability({
          checking: false,
          available: data.available,
          message: data.message,
        })
      } catch {
        setIgAvailability({ checking: false, available: null })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [igFormHandle, igModalOpen, editingIgId, userId])

  const openAddIgModal = () => {
    if (!isSuperAdmin) return
    setEditingIgId(null)
    setIgFormHandle('')
    setIgFormFollowers('')
    setIgFormCategory('')
    setIgFormIsPrimary(instagramProfiles.length === 0)
    setIgAvailability({ checking: false, available: null })
    setIgModalOpen(true)
  }

  const openEditIgModal = (p: LinkedInstagramProfile) => {
    if (!isSuperAdmin) return
    setEditingIgId(p.id)
    setIgFormHandle(p.username)
    setIgFormFollowers(String(p.followers || '0'))
    setIgFormCategory(p.category || '')
    setIgFormIsPrimary(p.is_primary)
    setIgAvailability({ checking: false, available: null })
    setIgModalOpen(true)
  }

  const handleSaveInstagramProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSuperAdmin) return
    if (!igFormHandle.trim()) {
      toast.error('Instagram username is required')
      return
    }

    setIgSubmitting(true)
    try {
      if (editingIgId) {
        const res = await fetch(`/api/admin/virtual-profile/${userId}/instagram`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: editingIgId,
            followers: parseInt(igFormFollowers || '0', 10) || 0,
            category: igFormCategory ? igFormCategory.trim() : null,
            is_primary: igFormIsPrimary,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update profile')
        const updatedProfiles = data.profiles || []
        setInstagramProfiles(updatedProfiles)
        const primary = updatedProfiles.find((p: any) => p.is_primary) || updatedProfiles[0]
        if (primary && primary.followers !== undefined) {
          setFormData((prev) => ({ ...prev, followers: primary.followers }))
        }
        toast.success('Instagram profile updated successfully')
      } else {
        const res = await fetch(`/api/admin/virtual-profile/${userId}/instagram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: igFormHandle,
            followers: parseInt(igFormFollowers || '0', 10) || 0,
            category: igFormCategory ? igFormCategory.trim() : null,
            is_primary: igFormIsPrimary,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to link profile')
        const updatedProfiles = data.profiles || []
        setInstagramProfiles(updatedProfiles)
        const primary = updatedProfiles.find((p: any) => p.is_primary) || updatedProfiles[0]
        if (primary && primary.followers !== undefined) {
          setFormData((prev) => ({ ...prev, followers: primary.followers }))
        }
        toast.success('Instagram profile linked successfully')
      }

      setIgModalOpen(false)
      await fetchProfile()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save Instagram profile')
    } finally {
      setIgSubmitting(false)
    }
  }

  const handleSetPrimaryProfile = async (profileId: string) => {
    if (!isSuperAdmin) return
    try {
      const res = await fetch(`/api/admin/virtual-profile/${userId}/instagram`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, is_primary: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to set primary profile')
      setInstagramProfiles(data.profiles || [])
      toast.success('Primary Instagram profile updated')
      await fetchProfile()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update primary profile')
    }
  }

  const handleDeleteInstagramProfile = async (profileId: string) => {
    if (!isSuperAdmin) return
    if (!confirm('Are you sure you want to unlink this Instagram profile for this creator?')) return
    try {
      const res = await fetch(`/api/admin/virtual-profile/${userId}/instagram?id=${profileId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to unlink profile')
      setInstagramProfiles(data.profiles || [])
      toast.success('Instagram profile unlinked')
      await fetchProfile()
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlink Instagram profile')
    }
  }

  // Niches & Languages Handlers
  const selectedCategories = (formData.category || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)

  const toggleCategory = (cat: string) => {
    if (!isSuperAdmin) return
    const trimmed = cat.trim()
    if (!trimmed) return
    let next: string[]
    if (selectedCategories.includes(trimmed)) {
      next = selectedCategories.filter((c: string) => c !== trimmed)
    } else {
      next = [...selectedCategories, trimmed]
    }
    setFormData((prev) => ({ ...prev, category: next.join(', ') }))
  }

  const selectedLanguages = (formData.languages || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)

  const toggleLanguage = (lang: string) => {
    if (!isSuperAdmin) return
    const trimmed = lang.trim()
    if (!trimmed) return
    let next: string[]
    if (selectedLanguages.includes(trimmed)) {
      next = selectedLanguages.filter((l: string) => l !== trimmed)
    } else {
      next = [...selectedLanguages, trimmed]
    }
    setFormData((prev) => ({ ...prev, languages: next.join(', ') }))
  }

  // Address Management Handlers
  const openAddAddressModal = () => {
    if (!isSuperAdmin) return
    if ((formData.shipping_addresses || []).length >= MAX_ADDRESSES) {
      toast.error(`Maximum limit of ${MAX_ADDRESSES} delivery addresses reached.`)
      return
    }
    setEditingAddressId(null)
    setAddressForm({
      id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: 'Home',
      recipient_name: formData.full_name || '',
      mobile: formData.mobile || '',
      address_line1: '',
      address_line2: '',
      landmark: '',
      city: formData.city || '',
      state: formData.state || '',
      pincode: '',
      delivery_remarks: '',
      is_default: (formData.shipping_addresses || []).length === 0,
    })
    setAddressModalOpen(true)
  }

  const openEditAddressModal = (addr: ShippingAddress) => {
    if (!isSuperAdmin) return
    setEditingAddressId(addr.id)
    setAddressForm({ ...addr })
    setAddressModalOpen(true)
  }

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSuperAdmin) return
    if (!addressForm.recipient_name.trim()) {
      toast.error('Recipient name is required')
      return
    }
    if (!addressForm.mobile.trim() || addressForm.mobile.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid 10-digit delivery contact number')
      return
    }
    if (!addressForm.address_line1.trim()) {
      toast.error('Flat / House No. & Building name is required')
      return
    }
    if (!addressForm.state) {
      toast.error('Please select State')
      return
    }
    if (!addressForm.city) {
      toast.error('Please select City')
      return
    }

    const cleanPin = (addressForm.pincode || '').replace(/\D/g, '')
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      toast.error('Please enter a valid 6-digit postal PIN code (e.g. 400001)')
      return
    }

    const currentAddrs = [...(formData.shipping_addresses || [])]

    if (!editingAddressId && currentAddrs.length >= MAX_ADDRESSES) {
      toast.error(`Maximum limit of ${MAX_ADDRESSES} delivery addresses reached.`)
      return
    }

    const sanitizedAddressForm: ShippingAddress = {
      ...addressForm,
      pincode: cleanPin,
      recipient_name: addressForm.recipient_name.trim(),
      address_line1: addressForm.address_line1.trim(),
      address_line2: addressForm.address_line2 ? addressForm.address_line2.trim() : '',
      landmark: addressForm.landmark ? addressForm.landmark.trim() : '',
      delivery_remarks: addressForm.delivery_remarks ? addressForm.delivery_remarks.trim() : '',
    }

    let updatedAddrs: ShippingAddress[]

    if (editingAddressId) {
      updatedAddrs = currentAddrs.map((a) => {
        if (a.id === editingAddressId) {
          return { ...sanitizedAddressForm, id: editingAddressId }
        }
        return sanitizedAddressForm.is_default ? { ...a, is_default: false } : a
      })
    } else {
      const newAddr: ShippingAddress = {
        ...sanitizedAddressForm,
        id: sanitizedAddressForm.id || `addr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        created_at: new Date().toISOString(),
      }
      if (newAddr.is_default) {
        updatedAddrs = currentAddrs.map((a) => ({ ...a, is_default: false }))
        updatedAddrs.push(newAddr)
      } else {
        updatedAddrs = [...currentAddrs, newAddr]
      }
    }

    const hasDefault = updatedAddrs.some((a) => a.is_default)
    if (!hasDefault && updatedAddrs.length > 0) {
      updatedAddrs[0].is_default = true
    }

    const defaultAddr = updatedAddrs.find((a) => a.is_default) || updatedAddrs[0]

    const updatedFormData: ProfileFormData = {
      ...formData,
      shipping_addresses: updatedAddrs,
      state: defaultAddr?.state || formData.state,
      city: defaultAddr?.city || formData.city,
      pincode: defaultAddr?.pincode || formData.pincode,
    }

    setFormData(updatedFormData)
    setAddressModalOpen(false)
    performSave(updatedFormData)
    toast.success(editingAddressId ? 'Shipping address updated' : 'New delivery address added')
  }

  const handleSetDefaultAddress = (addrId: string) => {
    if (!isSuperAdmin) return
    const updatedAddrs = (formData.shipping_addresses || []).map((a) => ({
      ...a,
      is_default: a.id === addrId,
    }))
    const defaultAddr = updatedAddrs.find((a) => a.id === addrId)
    const updatedFormData: ProfileFormData = {
      ...formData,
      shipping_addresses: updatedAddrs,
      state: defaultAddr?.state || formData.state,
      city: defaultAddr?.city || formData.city,
    }
    setFormData(updatedFormData)
    performSave(updatedFormData)
    toast.success(`"${defaultAddr?.title || 'Address'}" set as primary shipping address`)
  }

  const handleDeleteAddress = (addrId: string) => {
    if (!isSuperAdmin) return
    const filtered = (formData.shipping_addresses || []).filter((a) => a.id !== addrId)
    if (filtered.length > 0 && !filtered.some((a) => a.is_default)) {
      filtered[0].is_default = true
    }
    const defaultAddr = filtered.find((a) => a.is_default)
    const updatedFormData: ProfileFormData = {
      ...formData,
      shipping_addresses: filtered,
      state: defaultAddr?.state || formData.state,
      city: defaultAddr?.city || formData.city,
    }
    setFormData(updatedFormData)
    performSave(updatedFormData)
    toast.success('Address deleted')
  }

  // Stepper Handlers
  const goToStep = (stepNumber: number) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    if (isInitialLoaded.current) {
      performSave(formData, true)
    }
    setDirection(stepNumber > currentStep ? 1 : -1)
    setCurrentStep(stepNumber)
  }

  const handleNextStep = () => {
    if (currentStep < STEPS.length) {
      goToStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1)
    }
  }

  const isStep1Complete = Boolean(
    formData.full_name.trim() &&
      formData.instagram_username.trim() &&
      formData.gender &&
      formData.category &&
      formData.followers > 0
  )

  const isStep2Complete = Boolean(
    (formData.shipping_addresses && formData.shipping_addresses.length > 0) ||
      (formData.state && formData.city)
  )

  const isStep3Complete = Boolean(
    formData.account_name.trim() &&
      formData.account_number.trim() &&
      formData.ifsc_code.trim()
  )

  const isStepComplete = (stepId: number) => {
    if (stepId === 1) return isStep1Complete
    if (stepId === 2) return isStep2Complete
    if (stepId === 3) return isStep3Complete
    if (stepId === 4) return Boolean(formData.instagram_username)
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BrandLoader />
      </div>
    )
  }

  const strength = computeProfileStrength(formData)
  const strengthColor =
    strength >= 80
      ? 'from-emerald-500 to-emerald-400'
      : strength >= 50
      ? 'from-amber-500 to-amber-400'
      : 'from-red-500 to-rose-400'

  return (
    <div className="w-full flex-1 flex flex-col space-y-4">
      {/* ─── Profile Header & Strength Card ─── */}
      <ProfileHeaderCard
        profile={profile}
        isSuperAdmin={isSuperAdmin}
        saveStatus={saveStatus}
        saving={saving}
        strength={strength}
        strengthColor={strengthColor}
        handleManualSave={handleManualSave}
      />

      {/* ─── Multi-Step Visual Stepper Header ─── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs">
        <div className="relative flex items-center justify-between gap-2 max-w-4xl mx-auto">
          {/* Connector Track Line */}
          <div className="absolute left-6 right-6 top-5 -translate-y-1/2 h-0.5 bg-slate-200 z-0 hidden sm:block" />
          <div
            className="absolute left-6 top-5 -translate-y-1/2 h-0.5 bg-[#f50057] transition-all duration-500 z-0 hidden sm:block"
            style={{
              width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - 3rem)`,
            }}
          />

          {STEPS.map((step) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isDone = isStepComplete(step.id)

            return (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className="relative z-10 flex-1 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-xs transition-all duration-300 ${
                    isActive
                      ? 'bg-[#f50057] text-white ring-4 ring-pink-100 shadow-md scale-105'
                      : isDone
                      ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 group-hover:bg-slate-200 group-hover:text-slate-700'
                  }`}
                >
                  {isDone && !isActive ? (
                    <Check className="h-5 w-5 text-white stroke-[3]" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                <div className="mt-1.5 sm:mt-2 text-center max-w-[70px] sm:max-w-none mx-auto">
                  <p
                    className={`text-[10px] sm:text-xs font-bold transition-colors line-clamp-1 sm:line-clamp-none ${
                      isActive
                        ? 'text-[#f50057]'
                        : isDone
                        ? 'text-slate-800 font-semibold'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <span className="sm:hidden">{step.shortTitle.replace(/^\d+\.\s*/, '')}</span>
                    <span className="hidden sm:inline">{step.title}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium hidden md:block">
                    {step.subtitle}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Multi-Step Form Container ─── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col min-h-[460px]">
        {/* Step Title Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-100 bg-slate-50/70 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-[#f50057]/10 text-[#f50057] font-extrabold text-xs shrink-0">
              {currentStep}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                {STEPS[currentStep - 1].title}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                {STEPS[currentStep - 1].subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-400 hidden sm:inline">
              Step {currentStep} of {STEPS.length}
            </span>
            {isStepComplete(currentStep) ? (
              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                In Progress
              </span>
            )}
          </div>
        </div>

        {/* Step Body Content with Slide Animations */}
        <div className="p-3 sm:p-6 flex-1 flex flex-col justify-between overflow-x-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="w-full"
            >
              {/* STEP 1: Social & Creator Profile */}
              {currentStep === 1 && (
                <Step1PersonalDetails
                  formData={formData}
                  setFormData={setFormData}
                  isSuperAdmin={isSuperAdmin}
                  instagramProfiles={instagramProfiles}
                  openAddIgModal={openAddIgModal}
                  openEditIgModal={openEditIgModal}
                  handleSetPrimaryProfile={handleSetPrimaryProfile}
                  handleDeleteInstagramProfile={handleDeleteInstagramProfile}
                  availableNiches={availableNiches}
                  availableLanguages={availableLanguages}
                  selectedCategories={selectedCategories}
                  toggleCategory={toggleCategory}
                  selectedLanguages={selectedLanguages}
                  toggleLanguage={toggleLanguage}
                />
              )}

              {/* STEP 2: Location & Shipping Addresses */}
              {currentStep === 2 && (
                <Step2ShippingAddresses
                  shippingAddresses={formData.shipping_addresses || []}
                  isSuperAdmin={isSuperAdmin}
                  maxAddresses={MAX_ADDRESSES}
                  openAddAddressModal={openAddAddressModal}
                  openEditAddressModal={openEditAddressModal}
                  handleDeleteAddress={handleDeleteAddress}
                  handleSetDefaultAddress={handleSetDefaultAddress}
                />
              )}

              {/* STEP 3: Bank & Payout Details */}
              {currentStep === 3 && (
                <Step3BankPayout
                  formData={formData}
                  setFormData={setFormData}
                  isSuperAdmin={isSuperAdmin}
                  isUploadingPan={isUploadingPan}
                  handlePanImageUpload={handlePanImageUpload}
                  performSave={performSave}
                />
              )}

              {/* STEP 4: Instagram Feed & Stats */}
              {currentStep === 4 && (
                <Step4InstagramFeed
                  formData={formData}
                  instagramProfiles={instagramProfiles}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Stepper Navigation Footer */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between gap-2">
          <Button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            variant="outline"
            className="h-9 px-3 sm:px-4 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-lg transition-all disabled:opacity-30 cursor-pointer shrink-0"
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Previous
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="h-9 px-4 sm:px-5 bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer shrink-0"
            >
              Next Step
              <ChevronRight className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          ) : isSuperAdmin ? (
            <Button
              type="button"
              onClick={handleManualSave}
              disabled={saving}
              className="h-9 px-3.5 sm:px-6 bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-xs uppercase tracking-wide rounded-lg shadow-sm transition-all cursor-pointer shrink-0"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Save & Finish Profile</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              disabled
              className="h-9 px-3.5 sm:px-6 bg-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wide rounded-lg border border-slate-200 shrink-0 cursor-not-allowed"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              <span>Read-Only Mode</span>
            </Button>
          )}
        </div>
      </div>

      {/* Add / Edit Shipping Address Modal */}
      <AddressModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
        editingAddressId={editingAddressId}
        addressForm={addressForm}
        setAddressForm={setAddressForm}
        handleSaveAddress={handleSaveAddress}
      />

      {/* Instagram Profile Modal */}
      <InstagramModal
        isOpen={igModalOpen}
        onClose={() => setIgModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
        editingIgId={editingIgId}
        igFormHandle={igFormHandle}
        setIgFormHandle={setIgFormHandle}
        igFormFollowers={igFormFollowers}
        setIgFormFollowers={setIgFormFollowers}
        igFormCategory={igFormCategory}
        setIgFormCategory={setIgFormCategory}
        igFormIsPrimary={igFormIsPrimary}
        setIgFormIsPrimary={setIgFormIsPrimary}
        igAvailability={igAvailability}
        igSubmitting={igSubmitting}
        availableNiches={availableNiches}
        handleSaveInstagramProfile={handleSaveInstagramProfile}
      />
    </div>
  )
}
