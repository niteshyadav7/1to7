-- Phase 9 Schema Update
-- Adding additional fields derived from Google Sheet template to campaigns table

ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS looking_for text,
ADD COLUMN IF NOT EXISTS followers text,
ADD COLUMN IF NOT EXISTS additional_info text,
ADD COLUMN IF NOT EXISTS collab_date text,
ADD COLUMN IF NOT EXISTS form_link text;
