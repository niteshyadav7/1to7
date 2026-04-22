import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin bypass

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearDatabase() {
  console.log('⚠️  WARNING: This will delete ALL data except Admins.')
  console.log('Starting cleanup...')

  // The order is important to avoid foreign key constraint errors
  const tablesToClear = [
    'applications',
    'campaigns',
    'users'
  ]

  for (const table of tablesToClear) {
    console.log(`Clearing ${table}...`)
    // Delete all rows where id is not null (which is everything)
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Dummy condition to delete all

    if (error) {
      console.error(`❌ Error clearing ${table}:`, error.message)
    } else {
      console.log(`✅ Cleared ${table}`)
    }
  }

  console.log('\n🎉 Database cleared successfully (Admin accounts preserved).')
}

clearDatabase()
