-- ====================================================================
-- MIGRATION: BRAND MAGIC LINKS FOR CLEAN SHORT URLS
-- Description: Stores branded 1-click magic access links
--              (e.g., brand.thehype.in/r/plum-9x4a) with click tracking,
--              expiration, and destination targeting.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.brand_magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  brand_id TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_slug TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  target_page TEXT DEFAULT 'auto',
  destination TEXT,
  batch_name TEXT,
  campaign_id TEXT,
  token TEXT NOT NULL,
  clicks_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_magic_links_code ON public.brand_magic_links(code);
CREATE INDEX IF NOT EXISTS idx_brand_magic_links_brand ON public.brand_magic_links(brand_slug);
CREATE INDEX IF NOT EXISTS idx_brand_magic_links_expires ON public.brand_magic_links(expires_at);

