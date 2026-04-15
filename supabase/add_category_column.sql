-- Add category column to users table for influencer niche/category
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS category TEXT;
