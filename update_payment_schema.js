require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });
  
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query(`ALTER TABLE public.campaigns ADD COLUMN payment_form_fields JSONB DEFAULT '[]'::jsonb;`);
    console.log('Added payment_form_fields column successfully.');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('Column already exists, ignoring.');
    } else {
      console.error(err);
    }
  } finally {
    await client.end();
  }
}

main();
