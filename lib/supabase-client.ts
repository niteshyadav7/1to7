import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase instance for Realtime subscriptions
// (separate from the server-side instance in lib/supabase.ts)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
