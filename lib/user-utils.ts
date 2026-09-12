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
    // 1. Fetch both latest user and counter to find the true max sequence
    const [{ data: latestUser }, { data: counter }] = await Promise.all([
      supabase
        .from('users')
        .select('influencer_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('influencer_id_counter')
        .select('last_number')
        .eq('id', 1)
        .single()
    ])

    let maxNum = counter?.last_number || 10000
    if (latestUser && latestUser.influencer_id && latestUser.influencer_id.startsWith('HY')) {
      const parsed = parseInt(latestUser.influencer_id.replace('HY', ''), 10)
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed
      }
    }

    // Add 1 to max. If retrying due to race condition, add attempts to jump ahead
    const nextNum = maxNum + 1 + attempts
    nextId = `HY${nextNum}`

    // 2. Verify that this specific ID hasn't been taken
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

  // 4. Fire-and-forget sync to influencer_id_counter
  if (nextId.startsWith('HY')) {
    const num = parseInt(nextId.replace('HY', ''), 10)
    if (!isNaN(num)) {
      ;(async () => {
        try {
          await supabase
            .from('influencer_id_counter')
            .upsert({ id: 1, last_number: num }, { onConflict: 'id' })
        } catch {}
      })()
    }
  }

  return nextId
}

/**
 * Masks an email with alternating 2-character visible / 2-character masked pattern.
 * e.g. "yashandroid@gmail.com" -> "ya**an**id@gmail.com"
 * e.g. "nitesh123@gmail.com" -> "ni**sh**3@gmail.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.com'
  const [local, domain] = email.split('@')
  if (!local) return `***@${domain}`
  
  if (local.length === 1) return `*@${domain}`
  if (local.length === 2) return `${local[0]}*@${domain}`

  let result = ''
  let isVisible = true
  for (let i = 0; i < local.length; i += 2) {
    const chunk = local.slice(i, i + 2)
    if (isVisible) {
      result += chunk
    } else {
      result += '*'.repeat(chunk.length)
    }
    isVisible = !isVisible
  }

  return `${result}@${domain}`
}
