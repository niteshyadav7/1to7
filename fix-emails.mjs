import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('Fixing is_email_verified for existing users...')
  const { data, error } = await supabase
    .from('users')
    .update({ is_email_verified: true })
    .eq('is_email_verified', false)

  if (error) {
    console.error('Error updating users:', error)
  } else {
    console.log('Successfully updated users.')
  }
}

main()
