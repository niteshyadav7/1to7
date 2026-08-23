-- Migration: Add dob, custom_attributes, and extended profile fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS dob TEXT,
ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS alt_mobile TEXT,
ADD COLUMN IF NOT EXISTS tshirt_size TEXT,
ADD COLUMN IF NOT EXISTS shoe_size TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS youtube TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT;

COMMENT ON COLUMN public.users.dob IS 'Creator Date of Birth (standard format YYYY-MM-DD or DD/MM/YYYY)';
COMMENT ON COLUMN public.users.custom_attributes IS 'Flexible JSONB store for answers captured from campaign applications';
