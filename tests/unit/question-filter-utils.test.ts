import { describe, it, expect } from 'vitest'
import {
  parseNumericValue,
  getApplicationQuestionAnswer,
  matchesQuestionFilter,
  QuestionFilterCriteria
} from '@/lib/utils/question-filter-utils'

describe('question-filter-utils', () => {
  describe('parseNumericValue', () => {
    it('parses standard numbers and integer strings', () => {
      expect(parseNumericValue(3500)).toBe(3500)
      expect(parseNumericValue('3500')).toBe(3500)
      expect(parseNumericValue('0')).toBe(0)
    })

    it('handles commas and currency symbols', () => {
      expect(parseNumericValue('₹3,500')).toBe(3500)
      expect(parseNumericValue('Rs. 5,000')).toBe(5000)
      expect(parseNumericValue('INR 4500/-')).toBe(4500)
      expect(parseNumericValue('$250')).toBe(250)
    })

    it('handles "k" / "K" abbreviations', () => {
      expect(parseNumericValue('3.5k')).toBe(3500)
      expect(parseNumericValue('5K')).toBe(5000)
      expect(parseNumericValue('10k')).toBe(10000)
    })

    it('returns null for empty or non-numeric strings', () => {
      expect(parseNumericValue('')).toBeNull()
      expect(parseNumericValue('N/A')).toBeNull()
      expect(parseNumericValue(null)).toBeNull()
      expect(parseNumericValue(undefined)).toBeNull()
    })
  })

  describe('getApplicationQuestionAnswer', () => {
    it('finds exact match on current question name', () => {
      const formData = {
        'Shoe Size': '8 UK',
      }
      expect(getApplicationQuestionAnswer(formData, { name: 'Shoe Size' })).toBe('8 UK')
    })

    it('finds answer with case-insensitive key', () => {
      const formData = {
        'shoe size': '9 UK',
      }
      expect(getApplicationQuestionAnswer(formData, { name: 'Shoe Size' })).toBe('9 UK')
    })

    it('resolves historical alias when question was renamed', () => {
      const formData = {
        'If not, please share your best commercials for 1 Reel + 1 Story for this collaboration.': '3500',
      }
      const field = {
        name: 'please share your best commercials for 1 Reel + 1 Story for this collaboration.',
        aliases: ['If not, please share your best commercials for 1 Reel + 1 Story for this collaboration.'],
      }
      expect(getApplicationQuestionAnswer(formData, field)).toBe('3500')
    })

    it('resolves keyword similarity when phrasing matches core prompt', () => {
      const formData = {
        'please share your best commercials for 1 Reel + 1 Story for this collaboration': '4000',
      }
      const field = {
        name: 'please share your best commercials for 1 Reel + 1 Story for this collaboration.',
      }
      expect(getApplicationQuestionAnswer(formData, field)).toBe('4000')
    })
  })

  describe('matchesQuestionFilter', () => {
    it('filters numeric min/max correctly', () => {
      const criteria: QuestionFilterCriteria = { min: 2000, max: 4000 }
      expect(matchesQuestionFilter('3500', 'number', criteria)).toBe(true)
      expect(matchesQuestionFilter('₹3,500', 'text', criteria)).toBe(true)
      expect(matchesQuestionFilter('5000', 'number', criteria)).toBe(false)
      expect(matchesQuestionFilter('1500', 'number', criteria)).toBe(false)
    })

    it('supports only min or only max (e.g. <= 3500)', () => {
      const maxOnly: QuestionFilterCriteria = { max: 3500 }
      expect(matchesQuestionFilter('3500', 'number', maxOnly)).toBe(true)
      expect(matchesQuestionFilter('3000', 'number', maxOnly)).toBe(true)
      expect(matchesQuestionFilter('4000', 'number', maxOnly)).toBe(false)
    })

    it('filters dropdown multi-selection', () => {
      const criteria: QuestionFilterCriteria = { selectedOptions: ['Yes', 'Interested'] }
      expect(matchesQuestionFilter('Yes', 'dropdown', criteria)).toBe(true)
      expect(matchesQuestionFilter('yes', 'dropdown', criteria)).toBe(true)
      expect(matchesQuestionFilter('No', 'dropdown', criteria)).toBe(false)
    })

    it('filters text search', () => {
      const criteria: QuestionFilterCriteria = { textSearch: 'bangalore' }
      expect(matchesQuestionFilter('Bengaluru, Karnataka', 'text', criteria)).toBe(false)
      expect(matchesQuestionFilter('Bangalore City', 'text', criteria)).toBe(true)
    })

    it('handles empty responses according to includeEmpty flag', () => {
      const criteriaWithEmpty: QuestionFilterCriteria = { max: 3500, includeEmpty: true }
      const criteriaWithoutEmpty: QuestionFilterCriteria = { max: 3500, includeEmpty: false }

      expect(matchesQuestionFilter(null, 'number', criteriaWithEmpty)).toBe(true)
      expect(matchesQuestionFilter(null, 'number', criteriaWithoutEmpty)).toBe(false)
      expect(matchesQuestionFilter('', 'number', criteriaWithoutEmpty)).toBe(false)
    })
  })
})
