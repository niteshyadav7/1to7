import { supabase } from '@/lib/supabase'

/**
 * Generates a sequential unique influencer ID (e.g. HY12345).
 * It finds the most recent ID, adds 1, and securely retries if there's a race condition.
 */
export async function generateSequentialInfluencerId(): Promise<string> {
  let attempts = 0
  let isUnique = false
  let nextId = ''

  while (!isUnique && attempts < 5) {
    // 1. Fetch the absolute latest user to find the "max" sequence
    const { data: latestUser } = await supabase
      .from('users')
      .select('influencer_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let nextNum = 10000 + Math.floor(Math.random() * 90000) // Fallback generator
    
    if (latestUser && latestUser.influencer_id && latestUser.influencer_id.startsWith('HY')) {
       const parsed = parseInt(latestUser.influencer_id.replace('HY', ''), 10)
       if (!isNaN(parsed)) {
         // Add 1 to the max. If we are retrying (due to race condition), add `attempts` so we skip the exact duplicate!
         nextNum = parsed + 1 + attempts 
       }
    }

    nextId = `HY${nextNum}`

    // 2. Verify that this specific ID hasn't been taken in the last millisecond
    const { data: checkData } = await supabase
      .from('users')
      .select('id')
      .eq('influencer_id', nextId)
      .single()

    if (!checkData) {
       isUnique = true
    }
    attempts++
  }

  // 3. Absolute failsafe for massive unhandled traffic spikes
  if (!isUnique) {
     nextId = `HY${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 99)}`
  }

  return nextId
}
