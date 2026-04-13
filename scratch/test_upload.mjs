import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zqnedwjtppydkslhtbay.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZQEDls74CS59iHPavdlf8g_BFFjFc-7'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpload() {
  const { data, error } = await supabase.storage.getBucket('order-uploads')
  
  if (error) {
    console.error('Bucket error:', error)
    console.log('Attempting to create bucket...')
    // Anon key can't create buckets usually, but let's try or just see
  } else {
    console.log('Bucket exists:', data)
  }

  // try an upload
  const { data: upData, error: upError } = await supabase.storage
    .from('order-uploads')
    .upload('test.txt', new Uint8Array([116, 101, 115, 116]))

  console.log('Upload result:', upData, upError)
}

testUpload()
