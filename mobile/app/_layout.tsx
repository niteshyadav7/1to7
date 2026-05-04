import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import AnimatedSplash from '@/components/AnimatedSplash'
import { useNotifications } from '@/hooks/useNotifications'

// Prevent the native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync()

function NotificationInitializer() {
  useNotifications()
  return null
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Hide native splash once our custom one is rendering
    SplashScreen.hideAsync()
    setIsReady(true)
  }, [])

  if (!isReady) return null

  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationInitializer />
        <StatusBar style="light" backgroundColor="#020617" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#020617' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="campaign/[id]"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="apply/[id]"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="approved/[id]"
            options={{ animation: 'slide_from_bottom' }}
          />
        </Stack>

        {/* Animated splash overlay */}
        {showSplash && (
          <AnimatedSplash onFinish={() => setShowSplash(false)} />
        )}
      </AuthProvider>
    </ToastProvider>
  )
}
