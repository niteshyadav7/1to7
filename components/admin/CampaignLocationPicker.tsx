'use client'

import React, { useState, useMemo } from 'react'
import {
  MapPin, Globe, Building2, Store, Check, Plus, X, Lock, Unlock,
  Search, AlertCircle, Sparkles, Filter, ExternalLink, Navigation, Users, Trash2, Edit2
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'
import { formatCampaignLocationText, StoreLocation } from '@/lib/utils/location-utils'

export interface CampaignLocationPickerProps {
  locationType: 'PAN_INDIA' | 'STATES' | 'CITIES' | 'STORES' | string
  targetStates: string[]
  targetCities: string[]
  storeLocations?: StoreLocation[]
  enforceLocation: boolean
  locationDisplay: string
  onChange: (updates: {
    location_type: 'PAN_INDIA' | 'STATES' | 'CITIES' | 'STORES'
    target_states: string[]
    target_cities: string[]
    store_locations: StoreLocation[]
    enforce_location: boolean
    location: string
  }) => void
}

const REGION_PRESETS: Record<string, { label: string; states: string[] }> = {
  METROS: {
    label: 'Major Metros',
    states: ['NCT OF DELHI', 'MAHARASHTRA', 'KARNATAKA', 'TAMIL NADU', 'TELANGANA', 'WEST BENGAL'],
  },
  NORTH: {
    label: 'North India',
    states: ['NCT OF DELHI', 'UTTAR PRADESH', 'HARYANA', 'PUNJAB', 'RAJASTHAN', 'HIMACHAL PRADESH', 'UTTARAKHAND', 'CHANDIGARH'],
  },
  SOUTH: {
    label: 'South India',
    states: ['KARNATAKA', 'TAMIL NADU', 'TELANGANA', 'ANDHRA PRADESH', 'KERALA'],
  },
  WEST: {
    label: 'West India',
    states: ['MAHARASHTRA', 'GUJARAT', 'GOA', 'RAJASTHAN'],
  },
  EAST: {
    label: 'East India',
    states: ['WEST BENGAL', 'BIHAR', 'ODISHA', 'JHARKHAND', 'ASSAM'],
  },
}

export default function CampaignLocationPicker({
  locationType = 'PAN_INDIA',
  targetStates = [],
  targetCities = [],
  storeLocations = [],
  enforceLocation = false,
  locationDisplay = '',
  onChange,
}: CampaignLocationPickerProps) {
  const currentType = (locationType || 'PAN_INDIA').toUpperCase() as 'PAN_INDIA' | 'STATES' | 'CITIES' | 'STORES'

  const [stateSearch, setStateSearch] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [activeStateFilterForCity, setActiveStateFilterForCity] = useState<string>('')
  const [customCityInput, setCustomCityInput] = useState('')

  // Store Builder State
  const [newStoreState, setNewStoreState] = useState<string>('MAHARASHTRA')
  const [newStoreCity, setNewStoreCity] = useState<string>('Mumbai')
  const [newStoreName, setNewStoreName] = useState<string>('')
  const [newStoreArea, setNewStoreArea] = useState<string>('')
  const [newStoreAddress, setNewStoreAddress] = useState<string>('')
  const [newStoreLandmark, setNewStoreLandmark] = useState<string>('')
  const [newStoreMapsUrl, setNewStoreMapsUrl] = useState<string>('')
  const [newStoreSlots, setNewStoreSlots] = useState<string>('')

  // Filtered states for state picker
  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return STATES
    const q = stateSearch.toLowerCase()
    return STATES.filter(s => s.toLowerCase().includes(q))
  }, [stateSearch])

  // Available cities for active state
  const availableCitiesForActiveState = useMemo(() => {
    const st = activeStateFilterForCity || (targetStates.length > 0 ? targetStates[0] : 'MAHARASHTRA')
    const list = INDIA_DATA[st] || []
    if (!citySearch.trim()) return list
    const q = citySearch.toLowerCase()
    return list.filter(c => c.toLowerCase().includes(q))
  }, [activeStateFilterForCity, targetStates, citySearch])

  // Available cities for store state
  const availableCitiesForStore = useMemo(() => {
    return INDIA_DATA[newStoreState] || []
  }, [newStoreState])

  const handleTypeChange = (newType: 'PAN_INDIA' | 'STATES' | 'CITIES' | 'STORES') => {
    let nextStates = [...targetStates]
    let nextCities = [...targetCities]
    let nextStores = [...storeLocations]

    if (newType === 'PAN_INDIA') {
      nextStates = []
      nextCities = []
      nextStores = []
    } else if (newType === 'STORES') {
      if (nextStores.length > 0) {
        nextCities = Array.from(new Set(nextStores.map(s => s.city)))
        nextStates = Array.from(new Set(nextStores.map(s => s.state.toUpperCase())))
      }
    }

    const updatedConfig = {
      location_type: newType,
      target_states: nextStates,
      target_cities: nextCities,
      store_locations: nextStores,
      enforce_location: enforceLocation,
      location: formatCampaignLocationText({
        location_type: newType,
        target_states: nextStates,
        target_cities: nextCities,
        store_locations: nextStores,
      }),
    }
    onChange(updatedConfig)
  }

  const toggleState = (st: string) => {
    const norm = st.toUpperCase().trim()
    let nextStates: string[]
    if (targetStates.includes(norm)) {
      nextStates = targetStates.filter(s => s !== norm)
    } else {
      nextStates = [...targetStates, norm]
    }

    const updatedConfig = {
      location_type: currentType,
      target_states: nextStates,
      target_cities: targetCities,
      store_locations: storeLocations,
      enforce_location: enforceLocation,
      location: formatCampaignLocationText({
        location_type: currentType,
        target_states: nextStates,
        target_cities: targetCities,
        store_locations: storeLocations,
      }),
    }
    onChange(updatedConfig)
  }

  const applyRegionPreset = (presetKey: string) => {
    const preset = REGION_PRESETS[presetKey]
    if (!preset) return
    const merged = Array.from(new Set([...targetStates, ...preset.states]))
    onChange({
      location_type: 'STATES',
      target_states: merged,
      target_cities: targetCities,
      store_locations: storeLocations,
      enforce_location: enforceLocation,
      location: formatCampaignLocationText({
        location_type: 'STATES',
        target_states: merged,
        target_cities: targetCities,
        store_locations: storeLocations,
      }),
    })
  }

  const toggleCity = (cityName: string, stateName?: string) => {
    const trimmed = cityName.trim()
    if (!trimmed) return
    let nextCities: string[]
    if (targetCities.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      nextCities = targetCities.filter(c => c.toLowerCase() !== trimmed.toLowerCase())
    } else {
      nextCities = [...targetCities, trimmed]
    }

    let nextStates = [...targetStates]
    if (stateName && !nextStates.includes(stateName.toUpperCase())) {
      nextStates.push(stateName.toUpperCase())
    }

    onChange({
      location_type: currentType,
      target_states: nextStates,
      target_cities: nextCities,
      store_locations: storeLocations,
      enforce_location: enforceLocation,
      location: formatCampaignLocationText({
        location_type: currentType,
        target_states: nextStates,
        target_cities: nextCities,
        store_locations: storeLocations,
      }),
    })
  }

  const handleAddCustomCity = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = customCityInput.trim()
    if (!trimmed) return
    if (!targetCities.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toggleCity(trimmed)
    }
    setCustomCityInput('')
  }

  // Add new store outlet
  const handleAddStore = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newStoreName.trim()) {
      return
    }

    const newStore: StoreLocation = {
      id: `store_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: newStoreName.trim(),
      state: newStoreState,
      city: newStoreCity || (INDIA_DATA[newStoreState] ? INDIA_DATA[newStoreState][0] : 'City'),
      area: newStoreArea.trim() || undefined,
      address: newStoreAddress.trim() || newStoreName.trim(),
      landmark: newStoreLandmark.trim() || undefined,
      google_maps_url: newStoreMapsUrl.trim() || undefined,
      slots_needed: newStoreSlots ? parseInt(newStoreSlots, 10) : undefined,
    }

    const updatedStores = [...storeLocations, newStore]
    const updatedCities = Array.from(new Set(updatedStores.map(s => s.city)))
    const updatedStates = Array.from(new Set(updatedStores.map(s => s.state.toUpperCase())))

    onChange({
      location_type: 'STORES',
      target_states: updatedStates,
      target_cities: updatedCities,
      store_locations: updatedStores,
      enforce_location: enforceLocation,
      location: formatCampaignLocationText({
        location_type: 'STORES',
        target_states: updatedStates,
        target_cities: updatedCities,
        store_locations: updatedStores,
      }),
    })

    // Reset inputs
    setNewStoreName('')
    setNewStoreArea('')
    setNewStoreAddress('')
    setNewStoreLandmark('')
    setNewStoreMapsUrl('')
    setNewStoreSlots('')
  }

  const handleRemoveStore = (storeId: string) => {
    const updatedStores = storeLocations.filter(s => s.id !== storeId)
    const updatedCities = Array.from(new Set(updatedStores.map(s => s.city)))
    const updatedStates = Array.from(new Set(updatedStores.map(s => s.state.toUpperCase())))

    onChange({
      location_type: 'STORES',
      target_states: updatedStates,
      target_cities: updatedCities,
      store_locations: updatedStores,
      enforce_location: enforceLocation,
      location: formatCampaignLocationText({
        location_type: 'STORES',
        target_states: updatedStates,
        target_cities: updatedCities,
        store_locations: updatedStores,
      }),
    })
  }

  const toggleEnforcement = () => {
    const nextVal = !enforceLocation
    onChange({
      location_type: currentType,
      target_states: targetStates,
      target_cities: targetCities,
      store_locations: storeLocations,
      enforce_location: nextVal,
      location: locationDisplay || formatCampaignLocationText({
        location_type: currentType,
        target_states: targetStates,
        target_cities: targetCities,
        store_locations: storeLocations,
      }),
    })
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-4">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Location & Store Outlets Targeting
            </h4>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Target creators PAN India, by specific states/cities, or by exact offline store outlets / branch visits.
          </p>
        </div>

        {/* Mode Selector Tabs (4 Modes) */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-white/10 rounded-xl flex-wrap">
          {[
            { id: 'PAN_INDIA', label: 'PAN India', icon: Globe },
            { id: 'STATES', label: 'Specific States', icon: MapPin },
            { id: 'CITIES', label: 'Specific Cities', icon: Building2 },
            { id: 'STORES', label: 'Store Outlets (Visit)', icon: Store },
          ].map((mode) => {
            const Icon = mode.icon
            const isSelected = currentType === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleTypeChange(mode.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{mode.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Mode 1: PAN India ─── */}
      {currentType === 'PAN_INDIA' && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
          <Globe className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-indigo-200">Open to All Creators Across India</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Creators from any state, city, or union territory in India can view and apply for this collaboration.
            </p>
          </div>
        </div>
      )}

      {/* ─── Mode 2: Specific States ─── */}
      {currentType === 'STATES' && (
        <div className="space-y-3.5 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Selected States ({targetStates.length})
            </span>
            {targetStates.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({
                  location_type: 'STATES',
                  target_states: [],
                  target_cities: targetCities,
                  store_locations: storeLocations,
                  enforce_location: enforceLocation,
                  location: 'PAN India',
                })}
                className="text-[11px] text-red-400 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {targetStates.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-900 border border-white/10">
              {targetStates.map((st) => (
                <span
                  key={st}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 shadow-xs"
                >
                  <MapPin className="h-3 w-3 text-indigo-400" />
                  {st}
                  <button
                    type="button"
                    onClick={() => toggleState(st)}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Please select at least 1 state below to restrict this campaign.</span>
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(REGION_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyRegionPreset(key)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* State Search & Grid */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                placeholder="Search Indian states (e.g. Uttar Pradesh, Maharashtra)..."
                className="pl-8 bg-slate-900 border-white/10 text-white h-9 text-xs focus-visible:ring-indigo-500 rounded-lg placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto p-2.5 bg-slate-900/60 border border-white/10 rounded-xl">
              {filteredStates.map((st) => {
                const isSelected = targetStates.includes(st)
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleState(st)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm font-semibold'
                        : 'bg-slate-950 text-slate-300 border-white/10 hover:border-white/20 hover:bg-slate-800'
                    }`}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-40" />}
                    {st}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Mode 3: Specific Cities ─── */}
      {currentType === 'CITIES' && (
        <div className="space-y-3.5 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Selected Target Cities ({targetCities.length})
            </span>
            {targetCities.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({
                  location_type: 'CITIES',
                  target_states: targetStates,
                  target_cities: [],
                  store_locations: storeLocations,
                  enforce_location: enforceLocation,
                  location: 'PAN India',
                })}
                className="text-[11px] text-red-400 hover:underline cursor-pointer"
              >
                Clear All Cities
              </button>
            )}
          </div>

          {targetCities.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-900 border border-white/10">
              {targetCities.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 shadow-xs"
                >
                  <Building2 className="h-3 w-3 text-indigo-400" />
                  {city}
                  <button
                    type="button"
                    onClick={() => toggleCity(city)}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Please pick or add target cities below (e.g. Mumbai, Pune, Lucknow, Bangalore).</span>
            </div>
          )}

          {/* State Filter & City Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400 uppercase font-bold">Select State to Browse Cities</Label>
              <select
                value={activeStateFilterForCity || (targetStates[0] || 'MAHARASHTRA')}
                onChange={(e) => setActiveStateFilterForCity(e.target.value)}
                className="w-full h-9 bg-slate-900 border border-white/10 text-white text-xs rounded-lg px-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                {STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400 uppercase font-bold">Search District / City</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Filter cities..."
                  className="pl-7 bg-slate-900 border-white/10 text-white h-9 text-xs focus-visible:ring-indigo-500 rounded-lg placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Available Cities Grid */}
          <div className="space-y-1.5">
            <p className="text-[11px] text-slate-400 font-medium">
              Click to select cities in {activeStateFilterForCity || (targetStates[0] || 'MAHARASHTRA')}:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto p-2.5 bg-slate-900/60 border border-white/10 rounded-xl">
              {availableCitiesForActiveState.map((city) => {
                const isSelected = targetCities.some(c => c.toLowerCase() === city.toLowerCase())
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => toggleCity(city, activeStateFilterForCity || (targetStates[0] || 'MAHARASHTRA'))}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm font-semibold'
                        : 'bg-slate-950 text-slate-300 border-white/10 hover:border-white/20 hover:bg-slate-800'
                    }`}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-40" />}
                    {city}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom City Adder */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={customCityInput}
                onChange={(e) => setCustomCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustomCity()
                  }
                }}
                placeholder="Add custom city/region (e.g. Navi Mumbai, Greater Noida, Mohali)..."
                className="pl-8 bg-slate-900 border-white/10 text-white h-9 text-xs focus-visible:ring-indigo-500 rounded-lg placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustomCity}
              disabled={!customCityInput.trim()}
              className="h-9 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add City
            </button>
          </div>
        </div>
      )}

      {/* ─── Mode 4: Specific Store Outlets / Physical Visit (3-Tier Hierarchy) ─── */}
      {currentType === 'STORES' && (
        <div className="space-y-4 animate-in fade-in zoom-in-95">
          {/* Header Info */}
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
            <Store className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-purple-200">
                Store / Branch Visit Campaign (State → City → Store Outlets)
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Add the exact offline store branches/outlets where influencers need to visit. Creators will be able to pick which store they can visit when applying.
              </p>
            </div>
          </div>

          {/* Added Stores List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-indigo-400" />
                Configured Store Outlets ({storeLocations.length})
              </span>
              {storeLocations.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({
                    location_type: 'STORES',
                    target_states: [],
                    target_cities: [],
                    store_locations: [],
                    enforce_location: enforceLocation,
                    location: 'PAN India',
                  })}
                  className="text-[11px] text-red-400 hover:underline cursor-pointer"
                >
                  Clear All Stores
                </button>
              )}
            </div>

            {storeLocations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto p-1">
                {storeLocations.map((store, sIdx) => (
                  <div
                    key={store.id || sIdx}
                    className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1.5 relative group hover:border-indigo-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">
                            {store.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                            {store.city}, {store.state}
                          </span>
                          {store.area && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                              📍 {store.area}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {store.address}
                        </p>
                        {store.landmark && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Landmark: {store.landmark}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStore(store.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                        title="Remove Store Outlet"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px] text-slate-400">
                      {store.google_maps_url ? (
                        <a
                          href={store.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          View Map
                        </a>
                      ) : (
                        <span>No map link</span>
                      )}

                      {store.slots_needed ? (
                        <span className="text-amber-300 font-bold">
                          Quota: {store.slots_needed} Creators
                        </span>
                      ) : (
                        <span>Open slots</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-dashed border-white/20 text-center space-y-1">
                <Store className="h-6 w-6 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No store outlets added yet.</p>
                <p className="text-[11px] text-slate-500">Fill in the outlet details below to add branches for this campaign.</p>
              </div>
            )}
          </div>

          {/* Store Outlet Adder Form */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-indigo-400" />
              Add New Store Outlet / Branch
            </span>

            {/* Hierarchy Level 1 & 2: State & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase font-bold">1. Select State *</Label>
                <select
                  value={newStoreState}
                  onChange={(e) => {
                    const nextSt = e.target.value
                    setNewStoreState(nextSt)
                    const cities = INDIA_DATA[nextSt] || []
                    setNewStoreCity(cities[0] || '')
                  }}
                  className="w-full h-8 bg-slate-950 border border-white/10 text-white text-xs rounded-lg px-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  {STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase font-bold">2. Select City *</Label>
                <select
                  value={newStoreCity}
                  onChange={(e) => setNewStoreCity(e.target.value)}
                  className="w-full h-8 bg-slate-950 border border-white/10 text-white text-xs rounded-lg px-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  {availableCitiesForStore.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Level 3: Store Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase font-bold">3. Store / Branch Name *</Label>
                <Input
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="e.g. Starbucks - Bandra West, Zudio - Hazratganj"
                  className="h-8 text-xs bg-slate-950 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase font-bold">Mall / Area / Locality</Label>
                <Input
                  value={newStoreArea}
                  onChange={(e) => setNewStoreArea(e.target.value)}
                  placeholder="e.g. Phoenix Palladium, Linking Rd, Gomti Nagar"
                  className="h-8 text-xs bg-slate-950 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Address & Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase font-bold">Full Store Address *</Label>
                <Input
                  value={newStoreAddress}
                  onChange={(e) => setNewStoreAddress(e.target.value)}
                  placeholder="e.g. Ground Floor, Shop 12, High Street Mall"
                  className="h-8 text-xs bg-slate-950 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase font-bold">Landmark / Note</Label>
                <Input
                  value={newStoreLandmark}
                  onChange={(e) => setNewStoreLandmark(e.target.value)}
                  placeholder="e.g. Next to Cinema hall, Opposite Metro Gate 2"
                  className="h-8 text-xs bg-slate-950 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Google Maps Link & Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase font-bold">Google Maps URL (Optional)</Label>
                <Input
                  value={newStoreMapsUrl}
                  onChange={(e) => setNewStoreMapsUrl(e.target.value)}
                  placeholder="e.g. https://maps.app.goo.gl/..."
                  className="h-8 text-xs bg-slate-950 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase font-bold">Creators Needed / Quota (Optional)</Label>
                <Input
                  type="number"
                  value={newStoreSlots}
                  onChange={(e) => setNewStoreSlots(e.target.value)}
                  placeholder="e.g. 5"
                  className="h-8 text-xs bg-slate-950 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleAddStore}
              disabled={!newStoreName.trim()}
              className="w-full h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add This Store Outlet
            </Button>
          </div>
        </div>
      )}

      {/* ─── Strict Location Enforcement Control ─── */}
      <div
        onClick={toggleEnforcement}
        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
          enforceLocation
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
            : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
        }`}
      >
        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
          enforceLocation ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
        }`}>
          {enforceLocation ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              {enforceLocation ? 'Strict Location Enforcement (Enabled)' : 'Location Filtering (Flexible / Open)'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              enforceLocation ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
            }`}>
              {enforceLocation ? 'STRICT REQUIRED' : 'PREFERRED'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            {enforceLocation
              ? 'Only creators who have a saved delivery address in the target states/cities/store locations can apply.'
              : 'Creators from any region can apply, but location badges will indicate preferred candidate geography.'}
          </p>
        </div>
      </div>
    </div>
  )
}
