const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env.local if present
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value.trim();
      }
    }
  }
} catch (e) {
  // ignore env loading error
}

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Error: POSTGRES_URL environment variable is missing.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🚀 Running Supabase POC Migration...');
  const client = await pool.connect();
  try {
    const sqlPath = path.resolve(__dirname, '../supabase/migration_poc_assignment.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration SQL...');
    await client.query(sql);

    // Verify column exists
    const checkRes = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'poc_admin_ids';
    `);

    if (checkRes.rows.length > 0) {
      console.log('✅ Success! Column public.campaigns.poc_admin_ids verified:', checkRes.rows[0]);
    } else {
      console.warn('⚠️ Warning: Migration executed but column was not found in schema inspection.');
    }

    // Verify index exists
    const indexRes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'campaigns' AND indexname = 'idx_campaigns_poc_admin_ids';
    `);

    if (indexRes.rows.length > 0) {
      console.log('✅ Success! GIN index idx_campaigns_poc_admin_ids verified:', indexRes.rows[0].indexname);
    }

    // Sample check of existing campaigns
    const sample = await client.query('SELECT id, campaign_code, poc_admin_ids FROM public.campaigns LIMIT 2;');
    console.log('📊 Sample Live Campaigns with POC array:', sample.rows);
    
    console.log('🎉 Supabase POC migration completed cleanly with zero downtime.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
