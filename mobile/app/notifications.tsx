import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, StatusBar, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  link: string
  createdAt: string
}

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  approved: 'checkmark-circle',
  payment_initiated: 'cash-outline',
  completed: 'wallet',
  partial_approved: 'thumbs-up',
  partial_rejected: 'thumbs-down',
}

const colorMap: Record<string, string> = {
  approved: Colors.success,
  payment_initiated: Colors.info,
  completed: Colors.purple,
  partial_approved: Colors.success,
  partial_rejected: Colors.error,
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const fetchNotifications = useCallback(async () => {
    try {
      const { ok, data } = await api.get('/api/dashboard/notifications')
      if (ok) {
        setNotifications(data.notifications || [])
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const onRefresh = () => {
    setRefreshing(true)
    fetchNotifications()
  }

  const handlePress = (item: NotificationItem) => {
    // Determine route from link
    if (item.link === '/dashboard/approved') {
      router.push('/(tabs)/approved')
    } else {
      router.push('/(tabs)/home')
    }
  }

  if (loading) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator size="large" color={Colors.purpleLight} />
      </View>
    )
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <View style={{ width: 44 }} /> {/* Spacer */}
      </Animated.View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purpleLight} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View entering={FadeInUp.duration(600)} style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No Notifications</Text>
            <Text style={s.emptyText}>You're all caught up! We'll notify you when there's an update.</Text>
          </Animated.View>
        }
        renderItem={({ item, index }) => {
          const icon = iconMap[item.type] || 'notifications'
          const color = colorMap[item.type] || Colors.purpleLight
          const date = new Date(item.createdAt).toLocaleDateString()

          return (
            <Animated.View entering={FadeInUp.delay(100 + (index * 50)).duration(600)}>
              <TouchableOpacity 
                style={s.card} 
                activeOpacity={0.8}
                onPress={() => handlePress(item)}
              >
                <View style={[s.iconBox, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                  <Ionicons name={icon} size={24} color={color} />
                </View>
                <View style={s.cardContent}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardMessage}>{item.message}</Text>
                  <Text style={s.cardDate}>{date}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          )
        }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  listContent: { padding: 20, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 16, marginBottom: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardMessage: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  cardDate: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 100, gap: 12 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
})
