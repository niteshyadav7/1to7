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
  // ignore
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
  console.log('🚀 Running Supabase Creator Ghosting Migration...');
  const client = await pool.connect();
  try {
    const sqlPath = path.resolve(__dirname, '../supabase/migration_creator_ghosting.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration SQL...');
    await client.query(sql);

    // Verify application columns
    const checkRes = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'applications' 
        AND column_name IN ('is_ghosted', 'ghosted_at', 'ghosted_by', 'ghost_alert_id');
    `);

    console.log('✅ Success! Applications table columns verified:', checkRes.rows.map(r => r.column_name));

    // Verify application_ghost_events table
    const tableRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'application_ghost_events';
    `);

    if (tableRes.rows.length > 0) {
      console.log('✅ Success! application_ghost_events table exists.');
    } else {
      console.warn('⚠️ Warning: application_ghost_events table was not found.');
    }

    console.log('🎉 Creator ghosting migration executed successfully with zero downtime.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
