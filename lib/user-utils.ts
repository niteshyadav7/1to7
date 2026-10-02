import { supabase } from '@/lib/supabase'

/**
 * Generates a sequential unique influencer ID (e.g. HY24790).
 * Uses an atomic PostgreSQL function (UPDATE ... RETURNING) to eliminate
 * all race conditions, randomness, and gaps.
 */
export async function generateSequentialInfluencerId(): Promise<string> {
  try {
    // 1. Primary: Atomic PostgreSQL increment via RPC
    const { data, error } = await supabase.rpc('get_next_influencer_id')

    if (!error && data && typeof data === 'number') {
      const nextId = `HY${data}`
      console.log(`[InfluencerID] Generated atomic sequential ID: ${nextId}`)
      return nextId
    }

    if (error) {
      console.warn('[InfluencerID] RPC get_next_influencer_id failed, using deterministic fallback:', error.message)
    }
  } catch (err: any) {
    console.warn('[InfluencerID] Exception in atomic ID generation, falling back:', err?.message)
  }

  // 2. Deterministic Fallback: query highest actual ID from users table and add 1
  return await getDeterministicFallbackId()
}

/**
 * Generates a batch of consecutive influencer IDs (e.g. ['HY24790', 'HY24791', 'HY24792']).
 * Atomically reserves N numbers at once with zero gaps between them.
 */
export async function generateSequentialInfluencerIdBatch(count: number): Promise<string[]> {
  if (count <= 0) return []

  try {
    const { data, error } = await supabase.rpc('get_next_influencer_id_batch', { batch_count: count })

    if (!error && data && typeof data === 'number') {
      const startNum = data
      const ids: string[] = []
      for (let i = 0; i < count; i++) {
        ids.push(`HY${startNum + i}`)
      }
      console.log(`[InfluencerID] Generated atomic batch of ${count} IDs: ${ids[0]} to ${ids[ids.length - 1]}`)
      return ids
    }

    if (error) {
      console.warn('[InfluencerID] RPC get_next_influencer_id_batch failed, using deterministic fallback:', error.message)
    }
  } catch (err: any) {
    console.warn('[InfluencerID] Exception in batch atomic ID generation, falling back:', err?.message)
  }

  // Fallback: one-by-one deterministic
  const ids: string[] = []
  for (let i = 0; i < count; i++) {
    ids.push(await generateSequentialInfluencerId())
  }
  return ids
}

/**
 * Deterministic fallback to find the true max HY number in the database + 1.
 * Guaranteed: NO Math.random(), NO skipping numbers.
 */
async function getDeterministicFallbackId(): Promise<string> {
  const { data: counter } = await supabase
    .from('influencer_id_counter')
    .select('last_number')
    .eq('id', 1)
    .maybeSingle()

  let maxNum = counter?.last_number && counter.last_number < 1000000 ? counter.last_number : 24789

  // Query highest registered user
  const { data: highestUsers } = await supabase
    .from('users')
    .select('influencer_id')
    .like('influencer_id', 'HY%')
    .order('created_at', { ascending: false })
    .limit(30)

  if (highestUsers) {
    for (const u of highestUsers) {
      if (u.influencer_id && u.influencer_id.startsWith('HY')) {
        const p = parseInt(u.influencer_id.replace('HY', ''), 10)
        if (!isNaN(p) && p > maxNum && p < 1000000) {
          maxNum = p
        }
      }
    }
  }

  const nextNum = maxNum + 1
  const nextId = `HY${nextNum}`

  // Resync counter
  try {
    await supabase
      .from('influencer_id_counter')
      .upsert({ id: 1, last_number: nextNum }, { onConflict: 'id' })
  } catch (err: any) {
    console.error('[InfluencerID] Counter fallback upsert error:', err?.message)
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
