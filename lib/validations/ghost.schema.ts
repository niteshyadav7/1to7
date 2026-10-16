import { z } from 'zod'

export const singleGhostActionSchema = z.object({
  action: z.enum(['ghosted', 'unghosted']),
  reason_category: z.string().min(3, 'Please select or provide a valid reason category'),
  comment: z
    .string()
    .trim()
    .min(15, 'Comment must be at least 15 characters explaining the situation')
    .max(2000, 'Comment cannot exceed 2000 characters'),
  proof_urls: z
    .array(z.string().url('Invalid proof image URL'))
    .min(1, 'At least 1 proof screenshot is strictly required')
    .max(10, 'Maximum 10 proof screenshots allowed'),
})

export type SingleGhostActionInput = z.infer<typeof singleGhostActionSchema>

export const bulkGhostActionSchema = z.object({
  application_ids: z
    .array(z.string().uuid('Invalid application ID'))
    .min(1, 'Please select at least 1 application to ghost')
    .max(100, 'Cannot bulk ghost more than 100 creators at once'),
  reason_category: z.string().min(3, 'Please select or provide a valid reason category'),
  comment: z
    .string()
    .trim()
    .min(15, 'Comment must be at least 15 characters explaining the situation')
    .max(2000, 'Comment cannot exceed 2000 characters'),
  proof_urls: z
    .array(z.string().url('Invalid proof image URL'))
    .min(1, 'At least 1 proof screenshot is strictly required')
    .max(10, 'Maximum 10 proof screenshots allowed'),
})

export type BulkGhostActionInput = z.infer<typeof bulkGhostActionSchema>
