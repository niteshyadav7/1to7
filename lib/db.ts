import { Pool, QueryResult, QueryResultRow, types } from 'pg'

// Parse NUMERIC / DECIMAL (OID 1700) as float automatically so node-postgres doesn't return strings
types.setTypeParser(1700, (val: string) => (val === null ? 0 : parseFloat(val)))

declare global {
  // Prevent multiple pool instances during Next.js hot-reloads
  var _postgresPool: Pool | undefined
  var _pocMigrationDone: boolean | undefined
}

if (!global._postgresPool) {
  if (!process.env.POSTGRES_URL) {
    console.error('Missing POSTGRES_URL environment variable')
  }

  global._postgresPool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl:
      process.env.NODE_ENV === 'production' || process.env.POSTGRES_URL?.includes('supabase')
        ? { rejectUnauthorized: false }
        : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })
}

const pool = global._postgresPool

export default pool

/**
 * Automatically ensures required POC columns and indexes exist in Supabase/PostgreSQL.
 * Purely additive and idempotent with zero downtime impact.
 */
let autoMigrationRunning = false

export async function ensurePocMigration(): Promise<void> {
  if (global._pocMigrationDone || !pool || autoMigrationRunning) return
  autoMigrationRunning = true
  try {
    await pool.query(`
      DO $$
      BEGIN
        -- 1. poc_admin_ids array on campaigns
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'campaigns' 
            AND column_name = 'poc_admin_ids'
        ) THEN
          ALTER TABLE public.campaigns ADD COLUMN poc_admin_ids UUID[] DEFAULT '{}';
          CREATE INDEX IF NOT EXISTS idx_campaigns_poc_admin_ids ON public.campaigns USING GIN (poc_admin_ids);
        END IF;

        -- 2. phone and creator-facing proxy columns on admins for POC profile contact
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'admins' 
            AND column_name = 'phone'
        ) THEN
          ALTER TABLE public.admins ADD COLUMN phone TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'admins' 
            AND column_name = 'creator_view_name'
        ) THEN
          ALTER TABLE public.admins ADD COLUMN creator_view_name TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'admins' 
            AND column_name = 'creator_view_phone'
        ) THEN
          ALTER TABLE public.admins ADD COLUMN creator_view_phone TEXT;
        END IF;

        -- Brand Admin RBAC columns on admins
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'admins' 
            AND column_name = 'brand_admin_access'
        ) THEN
          ALTER TABLE public.admins 
            ADD COLUMN brand_admin_access BOOLEAN DEFAULT false,
            ADD COLUMN brand_admin_role TEXT DEFAULT 'viewer',
            ADD COLUMN brand_admin_status TEXT DEFAULT 'pending',
            ADD COLUMN brand_admin_approved_by TEXT,
            ADD COLUMN brand_admin_approved_at TIMESTAMP WITH TIME ZONE;

          UPDATE public.admins
          SET brand_admin_access = true,
              brand_admin_role = 'brand_superadmin',
              brand_admin_status = 'approved',
              brand_admin_approved_by = 'system',
              brand_admin_approved_at = NOW()
          WHERE LOWER(email) = 'superadmin@gmail.com';
        END IF;

        -- 3. manager_phone column on campaigns for auto-linked brand manager phone
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'campaigns' 
            AND column_name = 'manager_phone'
        ) THEN
          ALTER TABLE public.campaigns ADD COLUMN manager_phone TEXT;
        END IF;

        -- 4. status and resolution tracking on feedback
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'feedback' 
            AND column_name = 'status'
        ) THEN
          ALTER TABLE public.feedback ADD COLUMN status TEXT DEFAULT 'pending';
          ALTER TABLE public.feedback ADD COLUMN admin_notes TEXT;
          ALTER TABLE public.feedback ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
          ALTER TABLE public.feedback ADD COLUMN resolved_by TEXT;
          UPDATE public.feedback SET status = 'pending' WHERE status IS NULL;
        END IF;

        -- 5. Brand review and pitch curation pipeline columns on applications
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'brand_review_status'
        ) THEN
          ALTER TABLE public.applications ADD COLUMN brand_review_status TEXT DEFAULT 'unpitched';
          CREATE INDEX IF NOT EXISTS idx_applications_brand_review_status ON public.applications (brand_review_status);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'brand_pitch_batch_name'
        ) THEN
          ALTER TABLE public.applications ADD COLUMN brand_pitch_batch_name TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'brand_pitch_notes'
        ) THEN
          ALTER TABLE public.applications ADD COLUMN brand_pitch_notes TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'brand_pitched_at'
        ) THEN
          ALTER TABLE public.applications ADD COLUMN brand_pitched_at TIMESTAMP WITH TIME ZONE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'brand_pitched_by'
        ) THEN
          ALTER TABLE public.applications ADD COLUMN brand_pitched_by TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'brand_reviewed_at'
        ) THEN
          ALTER TABLE public.applications ADD COLUMN brand_reviewed_at TIMESTAMP WITH TIME ZONE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'brand_reviewed_by'
        ) THEN
          ALTER TABLE public.applications ADD COLUMN brand_reviewed_by TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'brand_rejection_reason'
        ) THEN
          ALTER TABLE public.applications ADD COLUMN brand_rejection_reason TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'brand_feedback_notes'
        ) THEN
          ALTER TABLE public.applications ADD COLUMN brand_feedback_notes TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'applications' 
            AND column_name = 'brand_content_status'
        ) THEN
          ALTER TABLE public.applications ADD COLUMN brand_content_status TEXT DEFAULT 'pending_submission';
        END IF;

        -- 6. Sample Rosters and Pitch Lists
        CREATE TABLE IF NOT EXISTS public.sample_lists (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          brand_id TEXT,
          brand_name TEXT NOT NULL,
          category_niche TEXT,
          description TEXT,
          share_token TEXT UNIQUE NOT NULL,
          is_public_share_enabled BOOLEAN DEFAULT true,
          allow_brand_shortlisting BOOLEAN DEFAULT true,
          visible_columns JSONB DEFAULT '["creator_name", "instagram_username", "followers", "avg_reels_views", "engagement_rate", "city", "sample_reel_url"]'::jsonb,
          status TEXT DEFAULT 'active',
          view_count INTEGER DEFAULT 0,
          last_viewed_at TIMESTAMP WITH TIME ZONE,
          created_by TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_sample_lists_token ON public.sample_lists(share_token);
        CREATE INDEX IF NOT EXISTS idx_sample_lists_brand ON public.sample_lists(brand_name);

        -- 7. Creators inside Sample Rosters
        CREATE TABLE IF NOT EXISTS public.sample_list_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sample_list_id UUID NOT NULL REFERENCES public.sample_lists(id) ON DELETE CASCADE,
          user_id UUID,
          creator_name TEXT NOT NULL,
          instagram_username TEXT NOT NULL,
          followers INTEGER DEFAULT 0,
          avg_reels_views INTEGER DEFAULT 0,
          engagement_rate NUMERIC(5, 2) DEFAULT 0,
          city TEXT,
          niche TEXT,
          sample_reel_url TEXT,
          brand_commercial NUMERIC(12, 2),
          internal_cost NUMERIC(12, 2),
          admin_notes TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_sample_list_items_list ON public.sample_list_items(sample_list_id);
        CREATE INDEX IF NOT EXISTS idx_sample_list_items_user ON public.sample_list_items(user_id);

        -- 8. Inbound Brand Shortlists (When brands respond!)
        CREATE TABLE IF NOT EXISTS public.brand_shortlists (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sample_list_id UUID REFERENCES public.sample_lists(id) ON DELETE SET NULL,
          brand_name TEXT NOT NULL,
          brand_poc_name TEXT,
          brand_poc_email TEXT,
          brand_poc_phone TEXT,
          shortlisted_item_ids JSONB NOT NULL,
          shortlisted_creators_count INTEGER DEFAULT 0,
          brand_feedback_notes TEXT,
          status TEXT DEFAULT 'new',
          converted_campaign_id TEXT,
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          reviewed_by TEXT,
          reviewed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_brand_shortlists_status ON public.brand_shortlists(status);
        CREATE INDEX IF NOT EXISTS idx_brand_shortlists_brand ON public.brand_shortlists(brand_name);

        -- 9. Campaign Brand Curation and Column Shield Configuration
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'campaigns' 
            AND column_name = 'brand_visible_columns'
        ) THEN
          ALTER TABLE public.campaigns ADD COLUMN brand_visible_columns JSONB DEFAULT '["creator_name", "instagram_handle", "followers", "city", "state", "selected_variant", "sample_reel_link"]'::jsonb;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'campaigns' 
            AND column_name = 'auto_approve_on_brand_selection'
        ) THEN
          ALTER TABLE public.campaigns ADD COLUMN auto_approve_on_brand_selection BOOLEAN DEFAULT false;
        END IF;

        CREATE INDEX IF NOT EXISTS idx_applications_brand_pitch_batch ON public.applications(brand_pitch_batch_name);

        -- 10. Sample Roster Brand Portal Direct Publication & Dispatch
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'sample_lists' 
            AND column_name = 'is_published_to_brand'
        ) THEN
          ALTER TABLE public.sample_lists ADD COLUMN is_published_to_brand BOOLEAN DEFAULT false;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'sample_lists' 
            AND column_name = 'published_at'
        ) THEN
          ALTER TABLE public.sample_lists ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'sample_lists' 
            AND column_name = 'published_by'
        ) THEN
          ALTER TABLE public.sample_lists ADD COLUMN published_by TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'sample_lists' 
            AND column_name = 'pitch_note_to_brand'
        ) THEN
          ALTER TABLE public.sample_lists ADD COLUMN pitch_note_to_brand TEXT;
        END IF;

        CREATE INDEX IF NOT EXISTS idx_sample_lists_brand_portal ON public.sample_lists(brand_id, is_published_to_brand);
      END $$;
    `)
    global._pocMigrationDone = true
  } catch (err) {
    console.warn('[DB Auto-Migration] Non-fatal check during POC auto-migration:', err)
  } finally {
    autoMigrationRunning = false
  }
}

// Automatically trigger migration check on server load
if (typeof window === 'undefined' && pool && process.env.POSTGRES_URL) {
  ensurePocMigration().catch(() => {})
}

/**
 * Helper to run a query using the shared connection pool.
 */
export async function query<R extends QueryResultRow = any, I extends any[] = any[]>(
  text: string,
  params?: I
): Promise<QueryResult<R>> {
  return pool.query<R>(text, params)
}
