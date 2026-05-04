import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withDelay,
  withTiming, runOnJS, FadeIn, FadeOut
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastData {
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  showToast: (data: ToastData) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const TOAST_CONFIG: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: {
    icon: 'checkmark-circle',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.25)',
  },
  error: {
    icon: 'close-circle',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.25)',
  },
  info: {
    icon: 'information-circle',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.25)',
  },
  warning: {
    icon: 'warning',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.25)',
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insets = useSafeAreaInsets()

  const hideToast = useCallback(() => {
    setVisible(false)
    setTimeout(() => setToast(null), 300)
  }, [])

  const showToast = useCallback((data: ToastData) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    
    setToast(data)
    setVisible(true)

    timerRef.current = setTimeout(() => {
      hideToast()
    }, data.duration || 3000)
  }, [hideToast])

  const config = toast ? TOAST_CONFIG[toast.type] : TOAST_CONFIG.info

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && visible && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[
            s.toastContainer,
            { top: insets.top + 12 },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            entering={FadeIn.springify().damping(15).stiffness(150)}
            style={[
              s.toast,
              {
                backgroundColor: config.bg,
                borderColor: config.border,
              },
            ]}
          >
            <View style={[s.iconWrap, { backgroundColor: config.color + '20' }]}>
              <Ionicons name={config.icon as any} size={22} color={config.color} />
            </View>
            <View style={s.textWrap}>
              <Text style={[s.title, { color: config.color }]}>{toast.title}</Text>
              {toast.message && (
                <Text style={s.message} numberOfLines={2}>{toast.message}</Text>
              )}
            </View>
            <TouchableOpacity onPress={hideToast} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const { width } = Dimensions.get('window')

const s = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    // Glassmorphism backdrop
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    lineHeight: 18,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
