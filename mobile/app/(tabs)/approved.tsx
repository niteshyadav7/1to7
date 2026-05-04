import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, StatusBar
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { ApprovedSkeleton } from '@/components/SkeletonLoader'
import type { Application } from '@/types'

const statusColors: Record<string, string> = {
  'Approved': Colors.success,
  'Completed': Colors.purple,
  'Payment Initiated': Colors.info,
  'Payment Requested': Colors.warning,
}

export default function ApprovedScreen() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const fetchApplications = useCallback(async () => {
    try {
      const { ok, data } = await api.get('/api/dashboard/applications')
      if (ok) {
        setApplications(data.applications || [])
      }
    } catch (e) {
      console.error('Failed to fetch applications', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const onRefresh = () => {
    setRefreshing(true)
    fetchApplications()
  }

  // Filter only approved/active campaigns
  const activeStatuses = ['Approved', 'Payment Requested', 'Payment Initiated', 'Completed']
  const approvedApps = applications.filter(app => activeStatuses.includes(app.status))

  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />
        <ApprovedSkeleton />
      </View>
    )
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />

      {/* Decorative Blur Circles */}
      <View style={s.blurCircleTop} />
      <View style={s.blurCircleBottom} />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={s.header}>
        <Text style={s.headerTitle}>Approved Campaigns</Text>
        <TouchableOpacity style={s.historyBtn}>
          <Ionicons name="time-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <FlatList
        data={approvedApps}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purpleLight} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View entering={FadeInUp.duration(600)} style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No active campaigns</Text>
            <Text style={s.emptyText}>When a brand approves your application, it will appear here.</Text>
          </Animated.View>
        }
        renderItem={({ item: app, index }) => {
          const brand = app.campaigns?.brand_name || 'Brand'
          const code = app.campaigns?.campaign_code || 'ID'
          const statusColor = statusColors[app.status] || Colors.textMuted
          const pendingAmt = app.pending_amount || 0
          const finalAmt = app.final_payment || 0

          return (
            <Animated.View entering={FadeInUp.delay(100 + (index * 100)).duration(600)}>
              <TouchableOpacity 
                style={s.card} 
                activeOpacity={0.8}
                onPress={() => router.push(`/approved/${app.id}`)}
              >
                <View style={s.cardHeader}>
                  <LinearGradient
                    colors={[Colors.purple, Colors.pink]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.brandAvatar}
                  >
                    <Text style={s.brandAvatarText}>{brand.charAt(0)}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={s.brandName}>{brand}</Text>
                    <Text style={s.campaignCode}>ID: {code}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{app.status}</Text>
                  </View>
                </View>

                {/* Payment Summary */}
                <View style={s.financeBox}>
                  <View style={s.financeCol}>
                    <Text style={s.financeLabel}>Total Value</Text>
                    <Text style={s.financeValue}>₹{finalAmt.toLocaleString()}</Text>
                  </View>
                  <View style={s.divider} />
                  <View style={s.financeCol}>
                    <Text style={s.financeLabel}>Pending</Text>
                    <Text style={[s.financeValue, { color: pendingAmt > 0 ? Colors.warning : Colors.success }]}>
                      ₹{pendingAmt.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={s.actionRow}>
                  <Text style={s.actionText}>View Details & Payments</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.purpleLight} />
                </View>
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
  blurCircleTop: { position: 'absolute', top: -50, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(34, 197, 94, 0.1)', transform: [{ scaleX: 1.5 }] },
  blurCircleBottom: { position: 'absolute', bottom: -50, right: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(147, 51, 234, 0.1)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  historyBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  listContent: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  brandAvatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  brandAvatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  brandName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  campaignCode: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  financeBox: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  financeCol: { flex: 1, gap: 4 },
  financeLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  financeValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 16 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  actionText: { fontSize: 14, fontWeight: '600', color: Colors.purpleLight },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
})
