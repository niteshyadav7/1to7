import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { registerForPushNotifications, sendTokenToServer } from '@/services/notifications'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook to manage push notifications lifecycle.
 * - Registers for push on mount (if user is logged in)
 * - Handles notification taps → routes to relevant screen
 */
export function useNotifications() {
  const { user } = useAuth()
  const router = useRouter()
  const notificationListener = useRef<Notifications.Subscription | null>(null)
  const responseListener = useRef<Notifications.Subscription | null>(null)

  useEffect(() => {
    if (!user) return

    // Register and send token to server
    registerForPushNotifications().then(token => {
      if (token) {
        sendTokenToServer(token)
      }
    })

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Notification received in foreground — toast will show automatically
      // via the notification handler we configured
      console.log('Notification received:', notification.request.content.title)
    })

    // Listen for notification taps (user interacted with notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data

      // Route based on notification data
      if (data?.campaignId) {
        router.push(`/campaign/${data.campaignId}`)
      } else if (data?.applicationId) {
        router.push(`/approved/${data.applicationId}`)
      } else {
        // Default: go to home
        router.push('/(tabs)/home')
      }
    })

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove()
      }
      if (responseListener.current) {
        responseListener.current.remove()
      }
    }
  }, [user])
}
