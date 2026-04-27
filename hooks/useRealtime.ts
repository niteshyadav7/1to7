'use client'

import { useEffect, useRef } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string  // e.g. "user_id=eq.abc123"
  onChange: () => void
}

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Calls `onChange` whenever the specified event occurs, triggering a refetch.
 *
 * Usage:
 *   useRealtime({ table: 'applications', onChange: fetchApplications })
 *   useRealtime({ table: 'applications', filter: 'user_id=eq.xyz', onChange: refetch })
 */
export function useRealtime({ table, event = '*', filter, onChange }: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onChangeRef = useRef(onChange)

  // Keep callback ref fresh without re-subscribing
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`

    const subscriptionConfig: any = {
      event,
      schema: 'public',
      table,
    }

    if (filter) {
      subscriptionConfig.filter = filter
    }

    const channel = supabaseClient
      .channel(channelName)
      .on('postgres_changes', subscriptionConfig, () => {
        onChangeRef.current()
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, event, filter])
}
