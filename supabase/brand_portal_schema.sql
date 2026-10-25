-- ====================================================================
-- MIGRATION: BRAND PORTAL & BRAND ADMIN SCHEMA
-- Description: Supports dedicated Brand Workspace, Sub-brands, Brand RBAC,
--              Creator Review tracking, and Audit Logs.
-- ====================================================================

-- 1. Brand Organizations (Parent Company / Holding Entity)
CREATE TABLE IF NOT EXISTS public.brand_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  gstin TEXT,
  billing_email TEXT,
  billing_address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Brands / Sub-Brands (e.g., Mamaearth, The Derma Co under Honasa)
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.brand_organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  brand_guidelines_url TEXT,
  guidelines_notes TEXT,
  assigned_1to7_kam_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  sla_review_hours INTEGER DEFAULT 48,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Brand User Roles Enum
DO $$ BEGIN
  CREATE TYPE brand_user_role AS ENUM ('owner', 'admin', 'reviewer', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Brand Users Table (Completely isolated from 1to7 Admins & Creators)
CREATE TABLE IF NOT EXISTS public.brand_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.brand_organizations(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role brand_user_role DEFAULT 'reviewer' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  invite_token TEXT,
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Brand Audit Logs (Tracks approvals, rejections, notes, team invites)
CREATE TABLE IF NOT EXISTS public.brand_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.brand_users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL, -- e.g. 'approved_creator', 'rejected_creator', 'batch_approved', 'content_approved'
  target_id UUID,       -- application_id, campaign_id, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Link Campaigns to Brands
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- 7. Add Brand Review Tracking Columns to Applications
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS brand_review_status TEXT DEFAULT 'not_sent', 
  -- Statuses: 'not_sent', 'pending_brand_review', 'brand_approved', 'brand_rejected', 'changes_requested'
  ADD COLUMN IF NOT EXISTS brand_reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS brand_reviewed_by UUID REFERENCES public.brand_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS brand_feedback_notes TEXT,
  ADD COLUMN IF NOT EXISTS brand_content_status TEXT DEFAULT 'pending';
  -- Content Statuses: 'pending', 'approved', 'revision_requested'

-- 8. Indexes for Instant Lookups & Filtering
CREATE INDEX IF NOT EXISTS idx_brands_slug ON public.brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_org_id ON public.brands(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_users_email ON public.brand_users(email);
CREATE INDEX IF NOT EXISTS idx_brand_users_brand_id ON public.brand_users(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON public.campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_applications_brand_review_status ON public.applications(brand_review_status);
CREATE INDEX IF NOT EXISTS idx_brand_audit_logs_brand ON public.brand_audit_logs(brand_id, created_at DESC);
