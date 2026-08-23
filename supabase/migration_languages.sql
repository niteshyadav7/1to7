-- Migration: Add languages column to public.users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS languages TEXT DEFAULT '';

COMMENT ON COLUMN public.users.languages IS 'Languages the creator speaks or creates content in';
