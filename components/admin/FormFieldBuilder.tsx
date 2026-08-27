'use client'

import { useState } from 'react'
import {
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Type, Hash, AlignLeft, List, ImageIcon, Calendar,
  Sparkles, CheckCircle2, FileText, ArrowRight, Info, Zap
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PROFILE_FIELD_PRESETS,
  ProfileFieldPreset,
  getFieldSyncStatus,
  getCanonicalField,
  CANONICAL_FIELDS
} from '@/lib/utils/profile-sync-utils'

export interface FormField {
  name: string
  type: 'text' | 'number' | 'textarea' | 'dropdown' | 'image' | 'date'
  required: boolean
  options: string[] // only for dropdown
  sync_to_profile?: boolean // explicit toggle: true = sync to profile, false = campaign-only
  profile_sync_key?: string // optional explicit profile target key
}

const typeIcons: Record<string, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  textarea: <AlignLeft className="h-3.5 w-3.5" />,
  dropdown: <List className="h-3.5 w-3.5" />,
  image: <ImageIcon className="h-3.5 w-3.5" />,
  date: <Calendar className="h-3.5 w-3.5" />,
}

const typeLabels: Record<string, string> = {
  text: 'Short Text',
  number: 'Number',
  textarea: 'Long Text',
  dropdown: 'Dropdown',
  image: 'Image Upload',
  date: 'Date',
}

export default function FormFieldBuilder({
  fields,
  onChange,
}: {
  fields: FormField[]
  onChange: (fields: FormField[]) => void
}) {
  const [optionInput, setOptionInput] = useState<Record<number, string>>({})

  const addField = () => {
    onChange([...fields, { name: '', type: 'text', required: true, options: [], sync_to_profile: false, profile_sync_key: 'none' }])
  }

  const addPresetField = (preset: ProfileFieldPreset) => {
    // Check if a field with similar name already exists
    const existingIndex = fields.findIndex(
      f => f.name.toLowerCase().includes(preset.id) || f.profile_sync_key === preset.canonicalKey
    )
    if (existingIndex >= 0) {
      // Focus or alert
      return
    }

    const newField: FormField = {
      name: preset.name,
      type: preset.type,
      required: preset.required,
      options: [...preset.options],
      sync_to_profile: true,
      profile_sync_key: preset.canonicalKey,
    }
    onChange([...fields, newField])
  }

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...fields]
    updated[index] = { ...updated[index], ...updates }
    // Clear options if type is changed away from dropdown
    if (updates.type && updates.type !== 'dropdown') {
      updated[index].options = []
    }
    onChange(updated)
  }

  const moveField = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) return
    const updated = [...fields]
    const [item] = updated.splice(from, 1)
    updated.splice(to, 0, item)
    onChange(updated)
  }

  const addOption = (fieldIndex: number) => {
    const value = (optionInput[fieldIndex] || '').trim()
    if (!value) return
    const updated = [...fields]
    if (!updated[fieldIndex].options.includes(value)) {
      updated[fieldIndex].options = [...updated[fieldIndex].options, value]
    }
    onChange(updated)
    setOptionInput({ ...optionInput, [fieldIndex]: '' })
  }

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const updated = [...fields]
    updated[fieldIndex].options = updated[fieldIndex].options.filter((_, i) => i !== optionIndex)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* ─── 1-Click Profile Fields Presets Bar ─── */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-950 border border-indigo-500/20 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Quick-Add Profile Synced Fields
            </span>
          </div>
          <span className="text-[10px] text-indigo-300 font-medium">
            ⚡ Pre-fills automatically & updates Creator Profile!
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PROFILE_FIELD_PRESETS.map((preset) => {
            const isAlreadyAdded = fields.some(
              f => f.name.toLowerCase() === preset.name.toLowerCase() || f.profile_sync_key === preset.canonicalKey
            )
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => addPresetField(preset)}
                disabled={isAlreadyAdded}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isAlreadyAdded
                    ? 'bg-slate-900/60 border-white/5 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-slate-900/90 border-indigo-500/30 text-slate-200 hover:text-white hover:bg-indigo-600/30 hover:border-indigo-400/60 shadow-xs'
                }`}
                title={isAlreadyAdded ? 'Already added to form' : preset.description}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
                {isAlreadyAdded ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-0.5" />
                ) : (
                  <Plus className="h-3 w-3 text-indigo-400 ml-0.5" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Field List ─── */}
      <AnimatePresence>
        {fields.map((field, index) => {
          const syncStatus = getFieldSyncStatus(field)
          const isSyncOn = field.sync_to_profile === true || (field.sync_to_profile !== false && syncStatus.isProfileSync)

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-3 ${
                isSyncOn
                  ? 'bg-slate-900/80 border-emerald-500/30 ring-1 ring-emerald-500/10'
                  : 'bg-slate-900/50 border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Reorder Grip */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveField(index, index - 1)}
                    disabled={index === 0}
                    className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors cursor-pointer"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(index, index + 1)}
                    disabled={index === fields.length - 1}
                    className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors cursor-pointer"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <span className="text-[10px] text-slate-600 font-bold w-5 text-center">{index + 1}</span>

                {/* Field Name */}
                <div className="flex-1 min-w-0">
                  <Input
                    value={field.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(index, { name: e.target.value })}
                    placeholder="Question / Field label (e.g. Pitch, Shoe Size, Comments)"
                    className="w-full bg-slate-950/70 border-white/10 text-white h-9 text-xs sm:text-sm focus-visible:ring-indigo-500 rounded-lg placeholder:text-slate-500"
                  />
                </div>

                {/* Type Select */}
                <Select value={field.type} onValueChange={(v) => updateField(index, { type: v as FormField['type'] })}>
                  <SelectTrigger className="w-32 sm:w-36 bg-slate-950/70 border-white/10 text-white h-9 text-xs focus:ring-indigo-500 rounded-lg shrink-0">
                    <div className="flex items-center gap-1.5">
                      {typeIcons[field.type]}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-slate-900 border border-white/20 text-white shadow-2xl shadow-black/80 min-w-[170px] p-1.5 space-y-0.5 z-[250]">
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <SelectItem
                        key={value}
                        value={value}
                        className="text-slate-200 hover:text-white focus:text-white focus:bg-indigo-600/30 data-[highlighted]:bg-indigo-600/30 data-[highlighted]:text-white cursor-pointer py-2 px-3 rounded-lg text-xs font-medium"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-indigo-400 shrink-0">{typeIcons[value]}</span>
                          <span className="font-medium text-slate-100">{label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Required Toggle */}
                <button
                  type="button"
                  onClick={() => updateField(index, { required: !field.required })}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    field.required
                      ? 'bg-red-500/15 text-red-300 border-red-500/20'
                      : 'bg-slate-800/50 text-slate-500 border-white/5'
                  }`}
                >
                  {field.required ? 'Required' : 'Optional'}
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* ─── Sync to Creator Profile Toggler ─── */}
              <div className="ml-7 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 pb-1 border-t border-white/5">
                {/* Switch & Mode Label */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextSync = !isSyncOn
                      updateField(index, {
                        sync_to_profile: nextSync,
                        profile_sync_key: nextSync
                          ? (field.profile_sync_key && field.profile_sync_key !== 'none' ? field.profile_sync_key : (getCanonicalField(field.name) || 'dob'))
                          : 'none'
                      })
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isSyncOn ? 'bg-emerald-500 shadow-xs shadow-emerald-500/40' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isSyncOn ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${isSyncOn ? 'text-emerald-300' : 'text-slate-400'}`}>
                      {isSyncOn ? '⚡ Syncs to Creator Profile' : '📄 Campaign-Only'}
                    </span>
                    <span className="text-[10px] text-slate-500 hidden lg:inline">
                      {isSyncOn
                        ? '— Pre-fills and permanently updates creator profile'
                        : '— Stored in application submission only (does not touch creator profile)'}
                    </span>
                  </div>
                </div>

                {/* Target Profile Field Selector (When Sync is ON) */}
                {isSyncOn && (
                  <div className="flex items-center gap-2 shrink-0 animate-in fade-in">
                    <Label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target Field:</Label>
                    <select
                      value={field.profile_sync_key && field.profile_sync_key !== 'none' && field.profile_sync_key !== 'auto' ? field.profile_sync_key : (getCanonicalField(field.name) || 'dob')}
                      onChange={(e) => updateField(index, { sync_to_profile: true, profile_sync_key: e.target.value })}
                      className="h-7 bg-slate-950 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] rounded-md px-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="dob">🎂 Date of Birth</option>
                      <option value="shoe_size">👟 Shoe Size</option>
                      <option value="tshirt_size">👕 T-Shirt / Cloth Size</option>
                      <option value="languages">🗣️ Spoken Languages</option>
                      <option value="alt_mobile">📱 WhatsApp / Alt Mobile</option>
                      <option value="city">🏙️ Current City</option>
                      <option value="state">📍 State / UT</option>
                      <option value="pincode">📮 Pincode</option>
                      <option value="gender">👤 Gender</option>
                      <option value="bio">📝 Bio / About</option>
                      <option value="youtube">🎥 YouTube Channel</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Dropdown Options */}
              {field.type === 'dropdown' && (
                <div className="ml-7 space-y-2 pt-1 border-t border-white/5">
                  <Label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Dropdown Options</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {field.options.map((opt, oi) => (
                      <span
                        key={oi}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 text-xs border border-indigo-500/20"
                      >
                        {opt}
                        <button
                          type="button"
                          onClick={() => removeOption(index, oi)}
                          className="hover:text-red-400 transition-colors cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={optionInput[index] || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setOptionInput({ ...optionInput, [index]: e.target.value })
                      }
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') { e.preventDefault(); addOption(index) }
                      }}
                      placeholder="Type an option and press Enter (or click Add)"
                      className="flex-1 bg-slate-950/70 border-white/10 text-white h-8 text-xs focus-visible:ring-indigo-500 rounded-lg placeholder:text-slate-500"
                    />
                    <Button
                      type="button"
                      onClick={() => addOption(index)}
                      variant="outline"
                      className="h-8 px-3 text-xs rounded-lg border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/10 bg-slate-950 cursor-pointer"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Add Field Button */}
      <button
        type="button"
        onClick={addField}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/10 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all cursor-pointer text-sm font-medium"
      >
        <Plus className="h-4 w-4" />
        Add Custom Field
      </button>
    </div>
  )
}
