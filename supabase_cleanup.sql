-- Disable referential integrity to prevent foreign key constraint errors during data deletion
SET session_replication_role = 'replica';

-- ==========================================
-- 1. CLEAR DATA FROM ALL ACTIVELY USED TABLES
-- ==========================================
-- Based on the codebase, these are the current active tables.
-- `TRUNCATE` deletes all rows and `RESTART IDENTITY` resets any auto-incrementing primary keys.

TRUNCATE TABLE public.applications RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.users RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.profile_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.campaigns RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.admins RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.otps RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.apply_form_config RESTART IDENTITY CASCADE;

-- Re-enable referential integrity checks
SET session_replication_role = 'origin';

-- ==========================================
-- 2. DROP UNUSED / LEFT-OVER TABLES
-- ==========================================
-- This block automatically finds and drops ANY table in the "public" schema
-- that is NOT included in your current application codebase.
-- WARNING: This is destructive. It will permanently delete abandoned tables.

DO $$
DECLARE
    row RECORD;
BEGIN
    FOR row IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN (
            'applications', 
            'users', 
            'profile_logs', 
            'campaigns', 
            'admins', 
            'otps', 
            'apply_form_config'
        )
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(row.tablename) || ' CASCADE;';
        RAISE NOTICE 'Dropped unused table: %', row.tablename;
    END LOOP;
END;
$$;
