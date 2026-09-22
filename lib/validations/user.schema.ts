import { z } from 'zod'

export const shippingAddressSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Address label/title is required'),
  recipient_name: z.string().min(1, 'Recipient name is required'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  address_line1: z.string().min(1, 'Address line 1 is required'),
  address_line2: z.string().optional().nullable(),
  landmark: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Postal PIN code must be exactly 6 digits'),
  delivery_remarks: z.string().optional().nullable(),
  is_default: z.boolean().default(false),
})

export const updateCreatorProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name cannot be empty').optional(),
  email: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
      z.string().email('Please enter a valid email address format')
    )
    .optional(),
  mobile: z
    .preprocess((val) => {
      if (typeof val !== 'string') return val
      let clean = val.trim().replace(/[\s\-()]/g, '')
      if (clean.startsWith('+91')) {
        clean = clean.slice(3)
      } else if (clean.startsWith('91') && clean.length === 12) {
        clean = clean.slice(2)
      }
      return clean
    }, z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'))
    .optional(),
  gender: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  languages: z.string().optional().nullable(),
  bio: z.string().max(1000, 'Bio cannot exceed 1000 characters').optional().nullable(),
  youtube: z.string().optional().nullable(),
  followers: z.number().int().min(0, 'Followers cannot be negative').optional(),
  tshirt_size: z.string().optional().nullable(),
  shoe_size: z.string().optional().nullable(),
  account_name: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g. HDFC0001234)').optional().nullable().or(z.literal('')),
  pan_card: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN card number format (e.g. ABCDE1234F)').optional().nullable().or(z.literal('')),
  pan_card_image: z.string().optional().nullable(),
  shipping_addresses: z
    .preprocess((val) => {
      if (!Array.isArray(val)) return val
      // Filter out placeholder/dummy addresses where address_line1 is empty or missing
      return val.filter(
        (addr: any) =>
          addr &&
          typeof addr === 'object' &&
          typeof addr.address_line1 === 'string' &&
          addr.address_line1.trim().length > 0
      )
    }, z.array(shippingAddressSchema))
    .optional(),
  custom_attributes: z.record(z.string(), z.any()).optional(),
})

export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>
export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>
