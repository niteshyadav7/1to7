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

        -- 2. phone column on admins for POC profile contact
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'admins' 
            AND column_name = 'phone'
        ) THEN
          ALTER TABLE public.admins ADD COLUMN phone TEXT;
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
