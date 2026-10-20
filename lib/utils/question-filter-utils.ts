/**
 * Question Filter Utilities for 1to7 Influencer Platform
 *
 * Provides tolerant parsing, alias-aware field resolution, and type-safe filtering
 * for custom campaign questions stored in JSONB (`applications.form_data`).
 */

export interface QuestionFilterCriteria {
  // Numeric bounds (e.g. quoted commercial <= 3500)
  min?: number | null
  max?: number | null
  // Options selection (e.g. Yes/No, or specific cities)
  selectedOptions?: string[]
  // Text search
  textSearch?: string
  // Date range
  startDate?: string | null
  endDate?: string | null
  // Include applicants who didn't answer / unparseable
  includeEmpty?: boolean
}

/**
 * Safely parses any number from a creator's text response.
 * Handles strings like "3500", "₹3,500", "3.5k", "5K", "Rs. 4000/-"
 */
export function parseNumericValue(val: any): number | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return isNaN(val) ? null : val

  const str = String(val).trim().toLowerCase()
  if (!str) return null

  // Check for 'k' suffix, e.g. "3.5k" or "5k"
  const kMatch = str.match(/^([\d.,]+)\s*k$/i)
  if (kMatch) {
    const numPart = parseFloat(kMatch[1].replace(/,/g, ''))
    if (!isNaN(numPart)) return numPart * 1000
  }

  // Strip currency symbols, commas, trailing slashes, whitespace, and 'rs'
  const cleaned = str
    .replace(/[₹$,/\s\-]/g, '')
    .replace(/rs\.?/i, '')
    .replace(/inr\.?/i, '')

  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

/**
 * Resolves the answer to a question from application form_data,
 * checking the primary question name, case-insensitive keys, and historical aliases.
 */
export function getApplicationQuestionAnswer(
  formData: Record<string, any> | null | undefined,
  field: { name: string; aliases?: string[] }
): any {
  if (!formData || typeof formData !== 'object') return undefined

  // 1. Direct exact match on current question name
  if (formData[field.name] !== undefined && formData[field.name] !== null) {
    return formData[field.name]
  }

  const normalizedFieldName = field.name.trim().toLowerCase()

  // 2. Case-insensitive match on current question name
  for (const [key, val] of Object.entries(formData)) {
    if (key.trim().toLowerCase() === normalizedFieldName && val !== undefined && val !== null) {
      return val
    }
  }

  // 3. Historical aliases match
  if (field.aliases && Array.isArray(field.aliases)) {
    for (const alias of field.aliases) {
      if (!alias) continue
      // Direct exact match
      if (formData[alias] !== undefined && formData[alias] !== null) {
        return formData[alias]
      }
      // Case-insensitive match on alias
      const normalizedAlias = alias.trim().toLowerCase()
      for (const [key, val] of Object.entries(formData)) {
        if (key.trim().toLowerCase() === normalizedAlias && val !== undefined && val !== null) {
          return val
        }
      }
    }
  }

  // 4. Substring keyword fallback for long questions (e.g. commercial wording)
  const coreKeywords = normalizedFieldName.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3)
  if (coreKeywords.length >= 3) {
    for (const [key, val] of Object.entries(formData)) {
      if (val === undefined || val === null) continue
      const normKey = key.trim().toLowerCase()
      const matchCount = coreKeywords.filter(w => normKey.includes(w)).length
      if (matchCount >= Math.min(4, coreKeywords.length)) {
        return val
      }
    }
  }

  return undefined
}

/**
 * Checks whether an application satisfies a question filter criteria.
 */
export function matchesQuestionFilter(
  rawAnswer: any,
  fieldType: 'text' | 'number' | 'textarea' | 'dropdown' | 'image' | 'date' | string,
  criteria: QuestionFilterCriteria
): boolean {
  const isAnswerEmpty = rawAnswer === undefined || rawAnswer === null || String(rawAnswer).trim() === ''

  if (isAnswerEmpty) {
    return Boolean(criteria.includeEmpty)
  }

  // Numeric filtering (or text questions asking for numbers/commercials)
  if (fieldType === 'number' || criteria.min !== undefined || criteria.max !== undefined) {
    const num = parseNumericValue(rawAnswer)
    if (num === null) {
      return Boolean(criteria.includeEmpty)
    }

    if (criteria.min !== undefined && criteria.min !== null && num < criteria.min) {
      return false
    }
    if (criteria.max !== undefined && criteria.max !== null && num > criteria.max) {
      return false
    }
    return true
  }

  // Dropdown / Option multi-select filtering
  if (criteria.selectedOptions && criteria.selectedOptions.length > 0) {
    const answerStr = String(rawAnswer).trim().toLowerCase()
    return criteria.selectedOptions.some(opt => {
      const optStr = String(opt).trim().toLowerCase()
      return answerStr === optStr || answerStr.includes(optStr)
    })
  }

  // Text search
  if (criteria.textSearch && criteria.textSearch.trim()) {
    const search = criteria.textSearch.toLowerCase().trim()
    const answerStr = String(rawAnswer).toLowerCase()
    return answerStr.includes(search)
  }

  // Date filtering
  if (fieldType === 'date' || criteria.startDate || criteria.endDate) {
    const ansDate = new Date(rawAnswer)
    if (isNaN(ansDate.getTime())) {
      return Boolean(criteria.includeEmpty)
    }

    if (criteria.startDate) {
      const start = new Date(criteria.startDate)
      if (!isNaN(start.getTime()) && ansDate < start) return false
    }
    if (criteria.endDate) {
      const end = new Date(criteria.endDate)
      if (!isNaN(end.getTime()) && ansDate > end) return false
    }
    return true
  }

  return true
}
