'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Save, Loader2, Lock, Instagram, MapPin, Users, CreditCard,
  Sparkles, Shield, CheckCircle2, AtSign, Building, Hash, Globe,
  BadgeCheck, ExternalLink, Tag, X, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Check,
  RefreshCw, Plus, Home, Briefcase, Package, Pencil, Trash2, FileText, Star, Copy, Phone,
  Calendar, Youtube, Shirt, Footprints, MessageSquare, Info, Languages, UploadCloud, Eye, AlertTriangle
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'
import BrandLoader from '@/components/ui/BrandLoader'
import { extractInstagramUsername, getInstagramUrl, getInstagramDisplayHandle } from '@/lib/instagram-utils'
import { isStandardProfileField } from '@/lib/utils/profile-sync-utils'

export interface ShippingAddress {
  id: string
  title: string
  recipient_name: string
  mobile: string
  address_line1: string
  address_line2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
  delivery_remarks?: string
  is_default: boolean
  created_at?: string
}

interface UserProfile {
  id: string
  influencer_id: string
  full_name: string
  mobile: string
  email: string
  instagram_username: string
  instagram_profile_pic?: string
  gender: string
  category: string
  languages?: string
  profile_strength: number
  account_name: string
  account_number: string
  ifsc_code: string
  pan_card?: string
  pan_card_image?: string
  state: string
  city: string
  followers: number
  created_at: string
  dob?: string
  alt_mobile?: string
  tshirt_size?: string
  shoe_size?: string
  bio?: string
  youtube?: string
  pincode?: string
  custom_attributes?: Record<string, { label: string; value: string; updated_at?: string }>
  shipping_addresses?: ShippingAddress[]
  address_remarks?: string
  is_email_verified?: boolean
  is_mobile_verified?: boolean
  instagram_profiles?: LinkedInstagramProfile[]
}

interface LinkedInstagramProfile {
  id: string
  username: string
  normalized_username: string
  followers: number
  category?: string
  profile_pic?: string
  is_primary: boolean
  is_verified?: boolean
  created_at?: string
}

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

function computeProfileStrength(data: any): number {
  const fields = ['full_name', 'instagram_username', 'gender', 'category', 'languages', 'state', 'city', 'followers', 'dob', 'account_name', 'account_number', 'ifsc_code']
  let filled = 0
  for (const f of fields) {
    if (data[f] && String(data[f]).trim() !== '' && String(data[f]) !== '0') filled++
  }
  if (data.shipping_addresses && Array.isArray(data.shipping_addresses) && data.shipping_addresses.length > 0) {
    filled++
  }
  return Math.min(100, Math.round((filled / (fields.length + 1)) * 100))
}

export default function AdminVirtualProfileEditPage() {
  const params = useParams()
  const userId = (params?.userId as string) || ''

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved' | 'error'>('idle')
  const [availableNiches, setAvailableNiches] = useState<string[]>(INFLUENCER_CATEGORIES)
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(CREATOR_LANGUAGES)
  const [suggestModalOpen, setSuggestModalOpen] = useState(false)
  const [suggestType, setSuggestType] = useState<'niche' | 'language'>('niche')
  const [suggestInput, setSuggestInput] = useState('')
  const [submittingSuggest, setSubmittingSuggest] = useState(false)
  const [customNicheInput, setCustomNicheInput] = useState('')
  const [customLanguageInput, setCustomLanguageInput] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(0)

  const isInitialLoaded = useRef(false)
  const lastSavedPayload = useRef<string>('')
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [formData, setFormData] = useState({
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
    custom_attributes: {} as Record<string, any>,
    account_name: '',
    account_number: '',
    ifsc_code: '',
    pan_card: '',
    pan_card_image: '',
    shipping_addresses: [] as ShippingAddress[],
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
  const [igAvailability, setIgAvailability] = useState<{ checking: boolean; available: boolean | null; message?: string }>({
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
            }
          ]
        }

        let effectiveFollowers = typeof data.user.followers === 'number' && data.user.followers > 0 ? data.user.followers : 0
        if (!effectiveFollowers && Array.isArray(data.user.instagram_profiles) && data.user.instagram_profiles.length > 0) {
          const primary = data.user.instagram_profiles.find((p: any) => p.is_primary) || data.user.instagram_profiles[0]
          if (primary && typeof primary.followers === 'number' && primary.followers > 0) {
            effectiveFollowers = primary.followers
          }
        }

        const initialForm = {
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
          pincode: data.user.pincode || (loadedAddresses[0]?.pincode || ''),
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
        if (data.user.instagram_profiles && Array.isArray(data.user.instagram_profiles) && data.user.instagram_profiles.length > 0) {
          setInstagramProfiles(data.user.instagram_profiles)
        } else if (data.user.instagram_username) {
          setInstagramProfiles([{
            id: 'primary',
            username: data.user.instagram_username,
            normalized_username: data.user.instagram_username.toLowerCase(),
            followers: data.user.followers || 0,
            category: data.user.category,
            is_primary: true,
            created_at: new Date().toISOString()
          }])
        }

        const payload = {
          ...initialForm,
          instagram_username: extractInstagramUsername(initialForm.instagram_username)
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

  // Core save handler via Admin Gateway PUT
  const performSave = async (dataToSave = formData, isAutoSave = false) => {
    if (!userId) return

    const payload = {
      ...dataToSave,
      instagram_username: extractInstagramUsername(dataToSave.instagram_username)
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

  // Auto-Save Effect: 1500ms debounce
  useEffect(() => {
    if (!isInitialLoaded.current) return

    const currentPayload = {
      ...formData,
      instagram_username: extractInstagramUsername(formData.instagram_username)
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
        const res = await fetch(`/api/instagram/check-availability?username=${encodeURIComponent(clean)}&excludeUserId=${userId}`)
        const data = await res.json()
        setIgAvailability({
          checking: false,
          available: data.available,
          message: data.message
        })
      } catch {
        setIgAvailability({ checking: false, available: null })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [igFormHandle, igModalOpen, editingIgId, userId])

  const openAddIgModal = () => {
    setEditingIgId(null)
    setIgFormHandle('')
    setIgFormFollowers('')
    setIgFormCategory('')
    setIgFormIsPrimary(instagramProfiles.length === 0)
    setIgAvailability({ checking: false, available: null })
    setIgModalOpen(true)
  }

  const openEditIgModal = (p: LinkedInstagramProfile) => {
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
            is_primary: igFormIsPrimary
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update profile')
        const updatedProfiles = data.profiles || []
        setInstagramProfiles(updatedProfiles)
        const primary = updatedProfiles.find((p: any) => p.is_primary) || updatedProfiles[0]
        if (primary && primary.followers !== undefined) {
          setFormData(prev => ({ ...prev, followers: primary.followers }))
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
            is_primary: igFormIsPrimary
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to link profile')
        const updatedProfiles = data.profiles || []
        setInstagramProfiles(updatedProfiles)
        const primary = updatedProfiles.find((p: any) => p.is_primary) || updatedProfiles[0]
        if (primary && primary.followers !== undefined) {
          setFormData(prev => ({ ...prev, followers: primary.followers }))
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
    try {
      const res = await fetch(`/api/admin/virtual-profile/${userId}/instagram`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, is_primary: true })
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
    if (!confirm('Are you sure you want to unlink this Instagram profile for this creator?')) return
    try {
      const res = await fetch(`/api/admin/virtual-profile/${userId}/instagram?id=${profileId}`, {
        method: 'DELETE'
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

  // Suggest Modal
  const handleOpenSuggestModal = (type: 'niche' | 'language') => {
    setSuggestType(type)
    setSuggestInput('')
    setSuggestModalOpen(true)
  }

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = suggestInput.trim()
    if (!trimmed) return

    setSubmittingSuggest(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          type: suggestType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit suggestion')

      if (suggestType === 'niche') {
        if (!selectedCategories.includes(trimmed)) {
          const next = [...selectedCategories, trimmed]
          setFormData((prev) => ({ ...prev, category: next.join(', ') }))
        }
      } else {
        if (!selectedLanguages.includes(trimmed)) {
          const next = [...selectedLanguages, trimmed]
          setFormData((prev) => ({ ...prev, languages: next.join(', ') }))
        }
      }

      toast.success(data.message || `Added "${trimmed}" to profile!`)
      setSuggestModalOpen(false)
      setSuggestInput('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit')
    } finally {
      setSubmittingSuggest(false)
    }
  }

  const selectedCategories = (formData.category || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)

  const toggleCategory = (cat: string) => {
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

  const handleAddCustomCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = customNicheInput.trim()
    if (!trimmed) return
    if (!selectedCategories.includes(trimmed)) {
      const next = [...selectedCategories, trimmed]
      setFormData((prev) => ({ ...prev, category: next.join(', ') }))
    }
    setCustomNicheInput('')
  }

  const selectedLanguages = (formData.languages || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)

  const toggleLanguage = (lang: string) => {
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

  const handleAddCustomLanguage = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = customLanguageInput.trim()
    if (!trimmed) return
    if (!selectedLanguages.includes(trimmed)) {
      const next = [...selectedLanguages, trimmed]
      setFormData((prev) => ({ ...prev, languages: next.join(', ') }))
    }
    setCustomLanguageInput('')
  }

  // Address Management Handlers
  const MAX_ADDRESSES = 6

  const openAddAddressModal = () => {
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
    setEditingAddressId(addr.id)
    setAddressForm({ ...addr })
    setAddressModalOpen(true)
  }

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault()
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

    const updatedFormData = {
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
    const updatedAddrs = (formData.shipping_addresses || []).map((a) => ({
      ...a,
      is_default: a.id === addrId,
    }))
    const defaultAddr = updatedAddrs.find((a) => a.id === addrId)
    const updatedFormData = {
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
    const filtered = (formData.shipping_addresses || []).filter((a) => a.id !== addrId)
    if (filtered.length > 0 && !filtered.some((a) => a.is_default)) {
      filtered[0].is_default = true
    }
    const defaultAddr = filtered.find((a) => a.is_default)
    const updatedFormData = {
      ...formData,
      shipping_addresses: filtered,
      state: defaultAddr?.state || formData.state,
      city: defaultAddr?.city || formData.city,
    }
    setFormData(updatedFormData)
    performSave(updatedFormData)
    toast.success('Address deleted')
  }

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
  const strengthColor = strength >= 80 ? 'from-emerald-500 to-emerald-400' : strength >= 50 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-rose-400'

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

  return (
    <div className="w-full flex-1 flex flex-col space-y-4">
      {/* ─── Top Admin Mode Profile & Strength Header Bar ─── */}
      <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: User Avatar & Badges */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-base font-extrabold text-white shadow-sm border border-slate-200 overflow-hidden">
              {formData.instagram_profile_pic || profile?.instagram_profile_pic ? (
                <img
                  src={formData.instagram_profile_pic || profile?.instagram_profile_pic}
                  alt={formData.full_name || profile?.full_name || 'Creator Avatar'}
                  className="h-full w-full object-cover"
                />
              ) : (
                formData.full_name?.charAt(0)?.toUpperCase() || profile?.full_name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 border border-white">
              <CheckCircle2 className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 truncate">{profile?.full_name || 'Creator Profile'}</h2>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200 shrink-0">
                <Shield className="h-2.5 w-2.5 text-amber-600" />
                Admin Direct Edit
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span className="font-semibold text-slate-700">{profile?.influencer_id || 'HY ID'}</span>
              {profile?.created_at && (
                <>
                  <span>•</span>
                  <span>Joined {new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Group: Auto-Save Status, Profile Strength & Save Button */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {/* Live Auto-Save Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs font-bold transition-all shrink-0">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-pink-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f50057]" />
                <span>Saving to database...</span>
              </span>
            ) : saveStatus === 'unsaved' ? (
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Unsaved changes...</span>
              </span>
            ) : saveStatus === 'error' ? (
              <span className="flex items-center gap-1.5 text-rose-700">
                <X className="h-3.5 w-3.5 text-rose-600" />
                <span>Save failed</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>All saved to DB</span>
              </span>
            )}
          </div>

          {/* Profile Strength Bar */}
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 border border-slate-200/60 px-2.5 sm:px-3.5 py-1.5 rounded-lg shrink-0">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-800">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Profile Strength:</span>
              <span className="sm:hidden">Strength:</span>
              <span className="text-emerald-600 font-extrabold">{strength}%</span>
            </div>
            <div className="w-16 sm:w-28 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${strengthColor} transition-all duration-500`}
                style={{ width: `${strength}%` }}
              />
            </div>
          </div>

          {/* Quick Manual Save Button */}
          <Button
            type="button"
            onClick={handleManualSave}
            disabled={saving}
            className="h-8 sm:h-9 px-3 sm:px-5 bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer shrink-0 ml-auto sm:ml-0"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

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
                  <p className="text-[10px] text-slate-400 font-medium hidden md:block">{step.subtitle}</p>
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
                <div className="space-y-5 max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={formData.full_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all"
                          placeholder="Enter creator full name"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Gender</Label>
                      <Select value={formData.gender || ""} onValueChange={(v) => setFormData({ ...formData, gender: v || '' })}>
                        <SelectTrigger className="bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus:ring-[#f50057] rounded-lg focus:bg-white transition-all">
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
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Email Address</Label>
                      <div className="relative">
                        <Input
                          value={formData.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg focus:bg-white transition-all"
                          placeholder="creator@example.com"
                        />
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Mobile Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={formData.mobile}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, mobile: e.target.value })}
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg focus:bg-white transition-all"
                          placeholder="10-digit mobile"
                        />
                      </div>
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
                    </div>

                    {/* Profiles Grid */}
                    {instagramProfiles.length === 0 ? (
                      <div className="p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 flex flex-col items-center justify-center text-center">
                        <Instagram className="h-8 w-8 text-slate-300 mb-1.5" />
                        <p className="text-xs font-bold text-slate-800">No Instagram Profiles Linked</p>
                        <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">Link an Instagram profile for this creator to participate in campaigns.</p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={openAddIgModal}
                          className="mt-3 h-8 px-3.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Link Instagram
                        </Button>
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
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border ${
                                  p.is_primary ? 'border-pink-300 shadow-xs' : 'border-slate-200 bg-slate-100'
                                }`}>
                                  {p.profile_pic ? (
                                    <img
                                      src={p.profile_pic}
                                      alt={p.username}
                                      className="h-full w-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className={`h-full w-full flex items-center justify-center ${
                                      p.is_primary ? 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white' : 'text-slate-600'
                                    }`}>
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
                                    <span className="font-bold text-slate-700">{(p.followers || 0).toLocaleString('en-IN')} Followers</span>
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Direct Followers Input (synced with primary profile) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Total Followers</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="number"
                          min="0"
                          value={formData.followers}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, followers: parseInt(e.target.value || '0', 10) || 0 })}
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg focus:bg-white transition-all"
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
                          value={formData.dob || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dob: e.target.value })}
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg focus:bg-white transition-all"
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
                    {selectedCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-lg">
                        {selectedCategories.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200"
                          >
                            {cat}
                            <button
                              type="button"
                              onClick={() => toggleCategory(cat)}
                              className="text-pink-400 hover:text-pink-700 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Available Niches Pills */}
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
                    {selectedLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-lg">
                        {selectedLanguages.map((lang) => (
                          <span
                            key={lang}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            {lang}
                            <button
                              type="button"
                              onClick={() => toggleLanguage(lang)}
                              className="text-indigo-400 hover:text-indigo-700 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Available Languages Pills */}
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
                  </div>

                  {/* Bio & Extended Details */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Creator Bio</Label>
                      <textarea
                        rows={3}
                        value={formData.bio || ''}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Brief creator bio or intro..."
                        className="w-full p-3 bg-slate-50/50 border border-slate-200 text-slate-900 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f50057]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase">YouTube Channel URL</Label>
                        <Input
                          value={formData.youtube || ''}
                          onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                          placeholder="https://youtube.com/@..."
                          className="h-9 text-xs border-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase">T-Shirt Size</Label>
                        <Input
                          value={formData.tshirt_size || ''}
                          onChange={(e) => setFormData({ ...formData, tshirt_size: e.target.value.toUpperCase() })}
                          placeholder="S, M, L, XL, XXL"
                          className="h-9 text-xs border-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase">Shoe Size (UK)</Label>
                        <Input
                          value={formData.shoe_size || ''}
                          onChange={(e) => setFormData({ ...formData, shoe_size: e.target.value })}
                          placeholder="e.g. 7, 8, 9"
                          className="h-9 text-xs border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Location & Shipping Addresses */}
              {currentStep === 2 && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-200/80 rounded-2xl p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 border border-amber-500/30 shrink-0">
                        <Package className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                          Product Shipping & Delivery Addresses
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          Brands ship products and PR packages to these addresses. Admin can edit, add, or designate primary shipping destinations.
                        </p>
                      </div>
                    </div>

                    {(formData.shipping_addresses || []).length < MAX_ADDRESSES ? (
                      <Button
                        type="button"
                        onClick={openAddAddressModal}
                        className="h-8 px-3.5 bg-[#f50057] hover:bg-[#d8004c] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add Address
                      </Button>
                    ) : (
                      <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl shrink-0">
                        Max 6 Saved
                      </span>
                    )}
                  </div>

                  {/* Saved Addresses List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#f50057]" />
                        Saved Delivery Locations ({(formData.shipping_addresses || []).length}/{MAX_ADDRESSES})
                      </h3>
                    </div>

                    {(formData.shipping_addresses || []).length === 0 ? (
                      <div className="text-center py-10 px-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                        <Package className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-700">No delivery address added yet</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Add a delivery address for physical brand campaigns.
                        </p>
                        <Button
                          type="button"
                          onClick={openAddAddressModal}
                          className="mt-4 h-9 px-4 bg-[#f50057] hover:bg-[#d8004c] text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                        >
                          <Plus className="mr-1.5 h-4 w-4" />
                          Add Primary Address
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {(formData.shipping_addresses || []).map((addr) => (
                          <div
                            key={addr.id}
                            className={`relative rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                              addr.is_default
                                ? 'bg-gradient-to-br from-pink-50/70 via-white to-orange-50/40 border-[#f50057]/40 shadow-md shadow-pink-500/5 ring-1 ring-[#f50057]/20'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                    {addr.title.toLowerCase().includes('home') ? (
                                      <Home className="h-3.5 w-3.5 text-blue-600" />
                                    ) : addr.title.toLowerCase().includes('studio') || addr.title.toLowerCase().includes('work') ? (
                                      <Briefcase className="h-3.5 w-3.5 text-purple-600" />
                                    ) : (
                                      <Package className="h-3.5 w-3.5 text-amber-600" />
                                    )}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900">{addr.title}</span>
                                </div>

                                {addr.is_default && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#f50057]/15 text-[#f50057] border border-[#f50057]/30">
                                    <Star className="h-3 w-3 fill-[#f50057]" /> Primary
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-800 font-semibold mb-1 flex items-center justify-between">
                                <span>{addr.recipient_name}</span>
                                <span className="text-slate-500 font-normal text-[11px]">{addr.mobile}</span>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed">
                                {addr.address_line1}
                                {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                              </p>
                              {addr.landmark && (
                                <p className="text-[11px] text-slate-500 italic mt-0.5">
                                  Landmark: {addr.landmark}
                                </p>
                              )}

                              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-700">{addr.city}, {addr.state}</span>
                                <span className="font-mono font-bold text-[#f50057] bg-pink-50 px-2 py-0.5 rounded border border-pink-100 text-[11px]">
                                  PIN: {addr.pincode || 'N/A'}
                                </span>
                              </div>

                              {addr.delivery_remarks && (
                                <div className="mt-2 p-2 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5">
                                  <FileText className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                                  <span className="leading-tight"><strong className="font-semibold">Note:</strong> {addr.delivery_remarks}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
                              {!addr.is_default ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(addr.id)}
                                  className="text-[11px] font-semibold text-slate-600 hover:text-[#f50057] transition-colors cursor-pointer"
                                >
                                  Make Primary
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Selected for orders
                                </span>
                              )}

                              <div className="flex items-center gap-1.5 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => openEditAddressModal(addr)}
                                  className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Edit Address"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {(formData.shipping_addresses || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAddress(addr.id)}
                                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Delete Address"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Bank & Payout Details */}
              {currentStep === 3 && (
                <div className="space-y-5 max-w-2xl mx-auto">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Bank Payout & PAN Card Details</h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        Direct bank account details and PAN Card used for campaign payout settlements and TDS verification.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Account Holder Name */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Account Holder Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={formData.account_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, account_name: e.target.value })}
                          placeholder="As per bank records"
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Account Number */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Account Number</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={formData.account_number}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, account_number: e.target.value })}
                          placeholder="Enter Account Number"
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* IFSC Code */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">IFSC Code</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={formData.ifsc_code}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                          placeholder="e.g. HDFC0001234"
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all uppercase font-mono"
                        />
                      </div>
                    </div>

                    {/* PAN Card Number */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">PAN Card Number</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={formData.pan_card}
                          maxLength={10}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                            setFormData({ ...formData, pan_card: val })
                          }}
                          placeholder="e.g. ABCDE1234F"
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all uppercase font-mono tracking-wider"
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
                          Upload or replace the creator's PAN card document image.
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
                      </div>
                    ) : (
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
                            <span className="text-[11px] text-slate-400 mt-0.5">
                              PNG, JPG, or WEBP (Max 5MB)
                            </span>
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
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: Instagram Feed & Stats */}
              {currentStep === 4 && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-start gap-3">
                    <Instagram className="h-5 w-5 text-pink-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Instagram Feed & Profile Overview</h4>
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
                          <span>{formData.instagram_username ? `@${formData.instagram_username}` : 'No Instagram Profile'}</span>
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
                          {formData.followers > 0 ? `${formData.followers.toLocaleString('en-IN')} Total Followers` : 'Follower count not set'}
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
                        Live media grid from Instagram Meta Graph API automatically populates when creator logs in with Instagram OAuth. As an admin, you can edit followers and linked profiles in Step 1.
                      </span>
                    </div>
                  </div>
                </div>
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
          ) : (
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
          )}
        </div>
      </div>

      {/* Add / Edit Shipping Address Modal */}
      {addressModalOpen && (
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
                onClick={() => setAddressModalOpen(false)}
                className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Location Label / Tag</Label>
                <div className="flex flex-wrap gap-1.5">
                  {['Home', 'Studio / Office', 'Agency', 'Other'].map((preset) => (
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
                  onClick={() => setAddressModalOpen(false)}
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
      )}

      {/* Instagram Profile Modal */}
      {igModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 overflow-hidden relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
                  <Instagram className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingIgId ? 'Edit Instagram Profile' : 'Link Instagram Profile'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingIgId ? 'Update followers count or niche' : 'Link an additional profile'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIgModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInstagramProfile} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Instagram Handle / Link *</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500" />
                  <Input
                    required
                    disabled={Boolean(editingIgId)}
                    value={igFormHandle}
                    onChange={(e) => setIgFormHandle(e.target.value)}
                    placeholder="@username or https://instagram.com/username"
                    className="pl-9 pr-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-pink-500 disabled:bg-slate-100"
                  />
                  {igAvailability.checking ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                    </div>
                  ) : igAvailability.available === true ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" title="Username available">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  ) : igAvailability.available === false ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" title={igAvailability.message}>
                      <X className="h-4 w-4" />
                    </div>
                  ) : null}
                </div>
                {igAvailability.available === false && (
                  <p className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    {igAvailability.message || 'This Instagram profile is already linked to another account.'}
                  </p>
                )}
                {igAvailability.available === true && !editingIgId && (
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    Handle is available and ready to link!
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Followers Count *</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    required
                    type="number"
                    min="0"
                    value={igFormFollowers}
                    onChange={(e) => setIgFormFollowers(e.target.value)}
                    placeholder="e.g. 25000"
                    className="pl-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-pink-500 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Content Niche / Category</Label>
                <Select
                  value={igFormCategory || ''}
                  onValueChange={(val) => setIgFormCategory(val === '__none__' ? '' : (val || ''))}
                >
                  <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl focus:ring-pink-500 bg-white">
                    <SelectValue placeholder="Select primary niche for this profile..." />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[220px]">
                    <SelectItem value="__none__" className="text-xs py-2 text-slate-400 italic">
                      -- No Specific Niche / General --
                    </SelectItem>
                    {availableNiches.map((niche) => (
                      <SelectItem key={niche} value={niche} className="text-xs py-2 font-medium">
                        {niche}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!editingIgId && (
                <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={igFormIsPrimary}
                    onChange={(e) => setIgFormIsPrimary(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Set as Primary Instagram profile
                  </span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIgModalOpen(false)}
                  className="h-9 px-4 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={igSubmitting || (!editingIgId && igAvailability.available === false)}
                  className="h-9 px-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {igSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingIgId ? 'Save Changes' : 'Link Profile'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
