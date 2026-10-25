-- Migration: Brand Operations Admin RBAC & Isolated Access Control
-- Principle: Access to the main Influencer Admin (/admin) DOES NOT grant access to /brand-admin!
-- Only superadmin@gmail.com is auto-authorized. All other users require explicit RBAC approval.

-- 1. Add Brand Admin columns to public.admins
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS brand_admin_access BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS brand_admin_role TEXT NOT NULL DEFAULT 'viewer',
  ADD COLUMN IF NOT EXISTS brand_admin_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS brand_admin_approved_by UUID,
  ADD COLUMN IF NOT EXISTS brand_admin_approved_at TIMESTAMP WITH TIME ZONE;

-- 2. Grant superadmin@gmail.com unconditional master access
UPDATE public.admins
SET 
  brand_admin_access = TRUE,
  brand_admin_role = 'brand_superadmin',
  brand_admin_status = 'approved',
  brand_admin_approved_at = NOW()
WHERE LOWER(TRIM(email)) = 'superadmin@gmail.com';

-- 3. Ensure other existing admins remain default pending for Brand Admin
UPDATE public.admins
SET 
  brand_admin_access = FALSE,
  brand_admin_status = 'pending'
WHERE LOWER(TRIM(email)) != 'superadmin@gmail.com' AND brand_admin_status IS NULL;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_admins_brand_admin_status 
  ON public.admins(brand_admin_status, brand_admin_access);
