'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Type, Hash, AlignLeft, List, ImageIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'

export interface FormField {
  name: string
  type: 'text' | 'number' | 'textarea' | 'dropdown' | 'image'
  required: boolean
  options: string[] // only for dropdown
}

const typeIcons: Record<string, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  textarea: <AlignLeft className="h-3.5 w-3.5" />,
  dropdown: <List className="h-3.5 w-3.5" />,
  image: <ImageIcon className="h-3.5 w-3.5" />,
}

const typeLabels: Record<string, string> = {
  text: 'Short Text',
  number: 'Number',
  textarea: 'Long Text',
  dropdown: 'Dropdown',
  image: 'Image Upload',
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
    onChange([...fields, { name: '', type: 'text', required: true, options: [] }])
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
      <AnimatePresence mode="popLayout">
        {fields.map((field, index) => (
          <motion.div
            layout
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-3"
          >
            {/* Header row */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveField(index, index - 1)}
                  disabled={index === 0}
                  className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveField(index, index + 1)}
                  disabled={index === fields.length - 1}
                  className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <span className="text-[10px] text-slate-600 font-bold w-5 text-center">{index + 1}</span>

              {/* Field Name */}
              <Input
                value={field.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(index, { name: e.target.value })}
                placeholder="Field name (e.g. Comments, Date of Birth)"
                className="flex-1 bg-slate-950/60 border-white/10 text-white h-9 text-sm focus-visible:ring-indigo-500 rounded-lg"
              />

              {/* Type Select */}
              <Select value={field.type} onValueChange={(v) => updateField(index, { type: v as FormField['type'] })}>
                <SelectTrigger className="w-36 bg-slate-950/60 border-white/10 text-white h-9 text-xs focus:ring-indigo-500 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    {typeIcons[field.type]}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2">
                      <div className="flex items-center gap-2">
                        {typeIcons[value]}
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Required Toggle */}
              <button
                type="button"
                onClick={() => updateField(index, { required: !field.required })}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer whitespace-nowrap ${
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
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Dropdown Options */}
            {field.type === 'dropdown' && (
              <div className="ml-7 space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Dropdown Options</Label>
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
                    placeholder="Type an option and press Enter"
                    className="flex-1 bg-slate-950/60 border-white/10 text-white h-8 text-xs focus-visible:ring-indigo-500 rounded-lg"
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
        ))}
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
