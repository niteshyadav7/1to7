import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  RefreshControl, StyleSheet, StatusBar
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { HomeSkeleton } from '@/components/SkeletonLoader'
import type { Campaign, Stats } from '@/types'

const statCards = [
  { key: 'total', label: 'Total Applied', icon: 'send', gradient: Colors.info },
  { key: 'approved', label: 'Approved', icon: 'checkmark-circle', gradient: Colors.success },
  { key: 'pending', label: 'Pending', icon: 'time', gradient: Colors.warning },
  { key: 'completed', label: 'Completed', icon: 'trending-up', gradient: Colors.purple },
]

export default function HomeScreen() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, campRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/campaigns'),
      ])
      if (statsRes.ok) setStats(statsRes.data.stats || null)
      if (campRes.ok) setCampaigns(campRes.data.campaigns || [])
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [])

  const onRefresh = () => { setRefreshing(true); fetchData() }

  const filtered = campaigns.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.brand_name?.toLowerCase().includes(q) ||
      c.campaign_code?.toLowerCase().includes(q) ||
      c.platform?.toLowerCase().includes(q)
  })

  const platformIcon = (p: string) => {
    if (p === 'Instagram') return 'logo-instagram'
    if (p === 'YouTube') return 'logo-youtube'
    return 'bag-outline'
  }

  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />
        <HomeSkeleton />
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

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purpleLight} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              {/* Header / Greeting */}
              <View style={s.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.greeting}>Hello, {user?.full_name?.split(' ')[0] || 'Creator'} 👋</Text>
                  <Text style={s.subGreeting}>Track your campaigns and performance</Text>
                </View>
                <TouchableOpacity style={s.notificationBtn}>
                  <Ionicons name="notifications-outline" size={22} color="#fff" />
                  <View style={s.notificationDot} />
                </TouchableOpacity>
              </View>

              {/* Stats */}
              <View style={s.statsGrid}>
                {statCards.map((card, i) => (
                  <View key={card.key} style={s.statCard}>
                    <View style={[s.statIconBox, { backgroundColor: card.gradient + '20' }]}>
                      <Ionicons name={card.icon as any} size={20} color={card.gradient} />
                    </View>
                    <Text style={s.statValue}>{(stats as any)?.[card.key] ?? 0}</Text>
                    <Text style={s.statLabel}>{card.label}</Text>
                  </View>
                ))}
              </View>

              {/* Section header */}
              <Text style={s.sectionTitle}>Live Campaigns</Text>

              {/* Search */}
              <View style={s.searchWrap}>
                <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginLeft: 16 }} />
                <TextInput
                  style={s.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by brand, code, platform..."
                  placeholderTextColor={Colors.textPlaceholder}
                  keyboardAppearance="dark"
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')} style={{ marginRight: 16 }}>
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </Animated.View>
          </>
        }
        ListEmptyComponent={
          <Animated.View entering={FadeInUp.delay(300).duration(600)} style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="sparkles-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>{search ? 'No matches found' : 'No live campaigns'}</Text>
            <Text style={s.emptyText}>{search ? 'Try a different keyword' : 'Check back soon!'}</Text>
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(200 + (index * 100)).duration(600)}>
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.8}
              onPress={() => router.push(`/campaign/${item.id}`)}
            >
              <View style={s.cardHeader}>
                <LinearGradient
                  colors={[Colors.purple, Colors.pink]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.brandAvatar}
                >
                  <Text style={s.brandAvatarText}>{item.brand_name?.charAt(0) || '?'}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.brandName}>{item.brand_name}</Text>
                  <Text style={s.campaignCode}>{item.campaign_code}</Text>
                </View>
                <View style={s.platformBadge}>
                  <Ionicons name={platformIcon(item.platform) as any} size={12} color={Colors.purpleLight} />
                  <Text style={s.platformText}>{item.platform}</Text>
                </View>
              </View>
              
              <View style={s.cardFooter}>
                <View style={s.tag}><Text style={s.tagText}>{item.category || 'General'}</Text></View>
                <View style={s.tag}><Text style={s.tagText}>{item.budget_type || 'Paid'}</Text></View>
                {item.gender_required && item.gender_required !== 'Any' && (
                  <View style={s.tag}><Text style={s.tagText}>{item.gender_required}</Text></View>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  blurCircleTop: { position: 'absolute', top: -50, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(236, 72, 153, 0.1)', transform: [{ scaleX: 1.5 }] },
  blurCircleBottom: { position: 'absolute', top: 200, left: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(147, 51, 234, 0.1)' },
  greeting: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: -0.5 },
  subGreeting: { fontSize: 14, color: Colors.textSecondary },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  notificationBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  notificationDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.pink, borderWidth: 1, borderColor: '#020617' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  statCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 16 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 16 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, height: 50, marginBottom: 20 },
  searchInput: { flex: 1, height: '100%', paddingHorizontal: 12, color: '#fff', fontSize: 15 },
  card: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  brandAvatar: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  brandAvatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  brandName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  campaignCode: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  platformBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(168,85,247,0.15)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  platformText: { fontSize: 11, fontWeight: '700', color: Colors.purpleLight },
  cardFooter: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
})
