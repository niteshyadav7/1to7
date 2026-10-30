import { describe, it, expect } from 'vitest'
import {
  orderFieldsStateBeforeCity,
  isStateField,
  isCityField,
  getFormFieldMeta,
} from '@/lib/utils/location-utils'
import { PROFILE_FIELD_PRESETS, CANONICAL_FIELDS } from '@/lib/utils/profile-sync-utils'

describe('Form Field Ordering (State before City)', () => {
  it('identifies state and city fields across diverse naming variants', () => {
    expect(isStateField('STATE / UT')).toBe(true)
    expect(isStateField('State')).toBe(true)
    expect(isStateField('Select State')).toBe(true)
    expect(isStateField('Current State')).toBe(true)
    expect(isStateField('anything', 'state')).toBe(true)

    expect(isCityField('CURRENT CITY')).toBe(true)
    expect(isCityField('Current City')).toBe(true)
    expect(isCityField('City')).toBe(true)
    expect(isCityField('Select City')).toBe(true)
    expect(isCityField('anything', 'city')).toBe(true)
  })

  it('correctly reorders when Current City is before State / UT', () => {
    const input = [
      { name: 'Current City', type: 'dropdown', required: true },
      { name: 'State / UT', type: 'dropdown', required: true },
      { name: 'Pitch to Brand', type: 'textarea', required: false },
    ]

    const ordered = orderFieldsStateBeforeCity(input)

    expect(ordered.map(f => f.name)).toEqual([
      'State / UT',
      'Current City',
      'Pitch to Brand',
    ])
  })

  it('keeps order intact when State is already before City', () => {
    const input = [
      { name: 'State / UT', type: 'dropdown', required: true },
      { name: 'Current City', type: 'dropdown', required: true },
      { name: 'Pitch to Brand', type: 'textarea', required: false },
    ]

    const ordered = orderFieldsStateBeforeCity(input)

    expect(ordered.map(f => f.name)).toEqual([
      'State / UT',
      'Current City',
      'Pitch to Brand',
    ])
  })

  it('preserves leading and trailing fields when moving State before City', () => {
    const input = [
      { name: 'Delivery Address', type: 'text', required: true },
      { name: 'Current City', type: 'dropdown', required: true },
      { name: 'Shoe Size', type: 'dropdown', required: false },
      { name: 'State / UT', type: 'dropdown', required: true },
      { name: 'Commercial Quote', type: 'number', required: true },
    ]

    const ordered = orderFieldsStateBeforeCity(input)

    expect(ordered.map(f => f.name)).toEqual([
      'Delivery Address',
      'State / UT',
      'Current City',
      'Shoe Size',
      'Commercial Quote',
    ])
  })

  it('handles legacy apply_form_config field format with field_name property', () => {
    const legacyFields = [
      { id: '1', field_name: 'Current City', field_type: 'dropdown', is_required: true },
      { id: '2', field_name: 'State / UT', field_type: 'dropdown', is_required: true },
      { id: '3', field_name: 'Pitch', field_type: 'textarea', is_required: false },
    ]

    const ordered = orderFieldsStateBeforeCity(legacyFields)

    expect(ordered.map(f => f.field_name)).toEqual([
      'State / UT',
      'Current City',
      'Pitch',
    ])
  })

  it('handles fields that use profile_sync_key mapping', () => {
    const fields = [
      { name: 'Where do you live?', profile_sync_key: 'city', type: 'dropdown', required: true },
      { name: 'Select your state region', profile_sync_key: 'state', type: 'dropdown', required: true },
    ]

    const ordered = orderFieldsStateBeforeCity(fields)

    expect(ordered[0].profile_sync_key).toBe('state')
    expect(ordered[1].profile_sync_key).toBe('city')
  })

  it('does not alter array if only city or only state is present', () => {
    const onlyCity = [
      { name: 'Full Name' },
      { name: 'Current City' },
      { name: 'Pitch' },
    ]
    expect(orderFieldsStateBeforeCity(onlyCity).map(f => f.name)).toEqual([
      'Full Name',
      'Current City',
      'Pitch',
    ])

    const onlyState = [
      { name: 'Full Name' },
      { name: 'State / UT' },
      { name: 'Pitch' },
    ]
    expect(orderFieldsStateBeforeCity(onlyState).map(f => f.name)).toEqual([
      'Full Name',
      'State / UT',
      'Pitch',
    ])
  })

  it('handles empty or single item arrays gracefully without throwing', () => {
    expect(orderFieldsStateBeforeCity([])).toEqual([])
    expect(orderFieldsStateBeforeCity([{ name: 'State / UT' }])).toEqual([{ name: 'State / UT' }])
    expect(orderFieldsStateBeforeCity(undefined as any)).toEqual([])
  })

  it('verifies PROFILE_FIELD_PRESETS lists State / UT before Current City', () => {
    const statePresetIdx = PROFILE_FIELD_PRESETS.findIndex(p => p.canonicalKey === 'state')
    const cityPresetIdx = PROFILE_FIELD_PRESETS.findIndex(p => p.canonicalKey === 'city')

    expect(statePresetIdx).toBeGreaterThanOrEqual(0)
    expect(cityPresetIdx).toBeGreaterThanOrEqual(0)
    expect(statePresetIdx).toBeLessThan(cityPresetIdx)
  })

  it('verifies CANONICAL_FIELDS lists state before city', () => {
    const stateIdx = CANONICAL_FIELDS.findIndex(f => f.key === 'state')
    const cityIdx = CANONICAL_FIELDS.findIndex(f => f.key === 'city')

    expect(stateIdx).toBeGreaterThanOrEqual(0)
    expect(cityIdx).toBeGreaterThanOrEqual(0)
    expect(stateIdx).toBeLessThan(cityIdx)
  })
})

