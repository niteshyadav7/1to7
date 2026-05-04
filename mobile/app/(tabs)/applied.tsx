import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, ScrollView, StatusBar
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { AppliedSkeleton } from '@/components/SkeletonLoader'
import type { Application } from '@/types'

const TABS = ['All', 'Pending', 'Approved', 'Rejected']

const statusColors: Record<string, string> = {
  'Pending': Colors.warning,
  'Approved': Colors.success,
  'Rejected': Colors.error,
  'Completed': Colors.purple,
}

export default function AppliedScreen() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('All')
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

  const filtered = applications.filter(app => {
    if (activeTab === 'All') return true
    return app.status === activeTab
  })

  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />
        <AppliedSkeleton />
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
        <Text style={s.headerTitle}>My Applications</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
          {TABS.map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purpleLight} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View entering={FadeInUp.duration(600)} style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No applications found</Text>
            <Text style={s.emptyText}>You haven't applied to any {activeTab === 'All' ? '' : activeTab.toLowerCase()} campaigns yet.</Text>
          </Animated.View>
        }
        renderItem={({ item: app, index }) => {
          const brand = app.campaigns?.brand_name || 'Brand'
          const code = app.campaigns?.campaign_code || 'ID'
          const statusColor = statusColors[app.status] || Colors.textMuted
          const appliedDate = new Date(app.created_at).toLocaleDateString()

          return (
            <Animated.View entering={FadeInUp.delay(100 + (index * 100)).duration(600)}>
              <TouchableOpacity 
                style={s.card} 
                activeOpacity={0.8}
                onPress={() => router.push(`/campaign/${app.campaigns?.id}`)}
              >
                <View style={s.cardHeader}>
                  <View style={s.brandAvatar}>
                    <Text style={s.brandAvatarText}>{brand.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.brandName}>{brand}</Text>
                    <Text style={s.campaignCode}>ID: {code}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{app.status}</Text>
                  </View>
                </View>

                {app.status === 'Rejected' && app.rejection_reason && (
                  <View style={s.reasonBox}>
                    <Ionicons name="information-circle" size={16} color={Colors.error} />
                    <Text style={s.reasonText}>{app.rejection_reason}</Text>
                  </View>
                )}

                <View style={s.cardFooter}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                  <Text style={s.dateText}>Applied on {appliedDate}</Text>
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
  blurCircleTop: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(147, 51, 234, 0.1)', transform: [{ scaleX: 1.5 }] },
  blurCircleBottom: { position: 'absolute', bottom: -100, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  header: { paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', paddingHorizontal: 20, marginBottom: 16, letterSpacing: -0.5 },
  tabScroll: { paddingHorizontal: 20, gap: 10 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tabBtnActive: { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: Colors.purpleLight },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.purpleLight },
  listContent: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' },
  brandAvatarText: { fontSize: 20, fontWeight: '800', color: Colors.purpleLight },
  brandName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  campaignCode: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  reasonText: { flex: 1, fontSize: 12, color: Colors.error, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  dateText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
})
