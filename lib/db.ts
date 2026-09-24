import { Pool, QueryResult, QueryResultRow, types } from 'pg'

// Parse NUMERIC / DECIMAL (OID 1700) as float automatically so node-postgres doesn't return strings
types.setTypeParser(1700, (val: string) => (val === null ? 0 : parseFloat(val)))

declare global {
  // Prevent multiple pool instances during Next.js hot-reloads
  var _postgresPool: Pool | undefined
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
 * Helper to run a query using the shared connection pool.
 */
export async function query<R extends QueryResultRow = any, I extends any[] = any[]>(
  text: string,
  params?: I
): Promise<QueryResult<R>> {
  return pool.query<R>(text, params)
}
