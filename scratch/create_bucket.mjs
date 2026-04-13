import pg from 'pg'

const client = new pg.Client('postgresql://postgres:iJzDARF9wYq3v3AS@db.zqnedwjtppydkslhtbay.supabase.co:5432/postgres')

async function setup() {
  try {
    await client.connect()
    console.log('Connected to Postgres')
    
    // Create the bucket
    await client.query(`
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('order-uploads', 'order-uploads', true) 
      ON CONFLICT (id) DO NOTHING;
    `)
    console.log('Bucket "order-uploads" created or already exists')

    // Drop previous policies if they exist just in case
    await client.query(`DROP POLICY IF EXISTS "Public Access" ON storage.objects;`)
    
    // Enable Public uploads & reading for this bucket explicitly
    await client.query(`
      CREATE POLICY "Public Uploads Access" ON storage.objects 
      FOR ALL 
      USING (bucket_id = 'order-uploads') 
      WITH CHECK (bucket_id = 'order-uploads');
    `)
    console.log('Policy applied')

  } catch (err) {
    console.error('Error:', err)
  } finally {
    await client.end()
  }
}

setup()
