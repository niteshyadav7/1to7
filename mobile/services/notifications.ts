import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { api } from './api'

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if registration fails or isn't possible.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return null
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    // Request if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted')
      return null
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
                      Constants.easConfig?.projectId

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    })

    const token = tokenData.data
    console.log('Push token:', token)

    // Android-specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#a855f7',
      })
    }

    return token
  } catch (error) {
    console.error('Error registering for push notifications:', error)
    return null
  }
}

/**
 * Send the push token to the backend for storage.
 */
export async function sendTokenToServer(token: string): Promise<void> {
  try {
    await api.post('/api/dashboard/push-token', {
      pushToken: token,
      platform: Platform.OS,
    })
  } catch (error) {
    console.error('Failed to send push token to server:', error)
  }
}
