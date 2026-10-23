const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/POSTGRES_URL=([^\r\n]+)/);
const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration_campaign_lifecycle.sql...');
    const sql = fs.readFileSync('supabase/migration_campaign_lifecycle.sql', 'utf8');
    
    // In Postgres, ALTER TYPE ADD VALUE cannot run inside a multi-statement transaction block in some versions,
    // so we execute statements individually.
    // Strip comment lines first
    const cleanedSql = sql.replace(/--.*$/gm, '');
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      console.log('Executing:', stmt.replace(/\s+/g, ' ').slice(0, 80) + '...');
      await client.query(stmt);
    }

    console.log('Migration executed successfully!');

    // Verify
    const enumRes = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'campaign_status';
    `);
    console.log('Updated campaign_status enum labels:', enumRes.rows.map(r => r.enumlabel));

    const colRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns' AND column_name IN ('status', 'closed_at', 'closed_by_admin_id', 'completed_at', 'completed_by_admin_id');
    `);
    console.log('Updated campaigns columns:', colRes.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
