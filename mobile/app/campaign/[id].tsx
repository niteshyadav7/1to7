import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Linking, StyleSheet, StatusBar, Platform
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { DetailSkeleton } from '@/components/SkeletonLoader'
import * as Clipboard from 'expo-clipboard'
import type { Campaign } from '@/types'

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text)
    showToast({ type: 'success', title: 'Copied!', message: `${label} copied to clipboard` })
  }

  useEffect(() => {
    fetchCampaign()
  }, [id])

  const fetchCampaign = async () => {
    try {
      const { ok, data } = await api.get(`/api/campaigns/${id}`)
      if (ok && data.campaign) {
        setCampaign(data.campaign)
      } else {
        const allRes = await api.get('/api/campaigns')
        if (allRes.ok) {
          const found = (allRes.data.campaigns || []).find((c: Campaign) => c.id === id)
          if (found) setCampaign(found)
        }
      }
    } catch (e) {
      console.error('Failed to fetch campaign:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />
        <DetailSkeleton />
      </View>
    )
  }

  if (!campaign) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={s.errorText}>Campaign not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const platformIcon = campaign.platform === 'Instagram' ? 'logo-instagram' :
    campaign.platform === 'YouTube' ? 'logo-youtube' : 'bag-outline'

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f172a', '#020617']} style={StyleSheet.absoluteFillObject} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Dynamic Hero Banner */}
        <Animated.View entering={FadeInDown.duration(600)}>
          <LinearGradient
            colors={[Colors.purple, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={s.heroBanner}
          >
            <View style={s.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={s.backBtnIcon}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={s.headerTitle} numberOfLines={1}>Campaign Details</Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={s.brandCard}>
              <View style={s.brandAvatar}>
                <Text style={s.brandAvatarText}>{campaign.brand_name?.charAt(0)}</Text>
              </View>
              <Text style={s.brandName}>{campaign.brand_name}</Text>
              <TouchableOpacity onPress={() => copyToClipboard(campaign.campaign_code, 'Campaign ID')} style={s.copyRow}>
                <Text style={s.campaignCode}>ID: {campaign.campaign_code}</Text>
                <Ionicons name="copy-outline" size={14} color={Colors.purpleLight} />
              </TouchableOpacity>
              <View style={s.badgeRow}>
                <View style={s.platformBadge}>
                  <Ionicons name={platformIcon as any} size={14} color="#fff" />
                  <Text style={s.platformText}>{campaign.platform}</Text>
                </View>
                <View style={s.budgetBadge}>
                  <Ionicons name="cash-outline" size={14} color={Colors.success} />
                  <Text style={s.budgetText}>{campaign.budget_type || 'Paid'}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={s.content}>
          <Animated.View entering={FadeInUp.delay(200).duration(600)}>
            {campaign.deliverables && <InfoSection icon="clipboard" title="Deliverables" content={campaign.deliverables} />}
            {campaign.requirements && <InfoSection icon="shield-checkmark" title="Requirements" content={campaign.requirements} />}
            {campaign.category && <InfoSection icon="pricetag" title="Category" content={campaign.category} />}
            {campaign.gender_required && campaign.gender_required !== 'Any' && <InfoSection icon="people" title="Gender Required" content={campaign.gender_required} />}
            {campaign.location && <InfoSection icon="location" title="Location" content={campaign.location} />}
            {campaign.looking_for && <InfoSection icon="search" title="Looking For" content={campaign.looking_for} />}
            {campaign.followers && <InfoSection icon="trending-up" title="Min Followers" content={campaign.followers} />}
            {campaign.collab_date && <InfoSection icon="calendar" title="Collaboration Date" content={campaign.collab_date} />}
            {campaign.additional_info && <InfoSection icon="information-circle" title="Additional Info" content={campaign.additional_info} />}
            
            {campaign.product_links && campaign.product_links.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <View style={s.iconBox}><Ionicons name="link" size={16} color={Colors.cyan} /></View>
                  <Text style={s.sectionTitle}>Product Links</Text>
                </View>
                {campaign.product_links.map((link, i) => (
                  <View key={i} style={s.linkRowWrap}>
                    <TouchableOpacity onPress={() => Linking.openURL(link)} style={s.linkRow}>
                      <Ionicons name="open-outline" size={14} color={Colors.info} />
                      <Text style={s.linkText} numberOfLines={1}>{link}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => copyToClipboard(link, 'Link')} style={s.copyBtn}>
                      <Ionicons name="copy-outline" size={18} color={Colors.purpleLight} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Floating Glassmorphism Apply Bar */}
      <View style={s.bottomBarWrap}>
        {Platform.OS === 'ios' && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
        <View style={[s.bottomBar, Platform.OS !== 'ios' && s.bottomBarAndroid]}>
          <TouchableOpacity
            style={s.applyBtnWrapper}
            activeOpacity={0.8}
            onPress={() => router.push(`/apply/${campaign.id}`)}
          >
            <LinearGradient
              colors={[Colors.purpleLight, Colors.purple]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.applyBtn}
            >
              <Ionicons name="paper-plane" size={20} color="#fff" />
              <Text style={s.applyBtnText}>Apply Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function InfoSection({ icon, title, content }: { icon: string; title: string; content: string }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.iconBox}>
          <Ionicons name={icon as any} size={16} color={Colors.purpleLight} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <Text style={s.sectionContent}>{content}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617', gap: 12 },
  errorText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  backBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backBtnText: { color: Colors.purpleLight, fontWeight: '600', fontSize: 15 },
  scroll: { flexGrow: 1 },
  heroBanner: { paddingTop: 50, paddingBottom: 40, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  backBtnIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  brandCard: { alignItems: 'center' },
  brandAvatar: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  brandAvatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  brandName: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  campaignCode: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  platformBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  platformText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  budgetBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34, 197, 94, 0.2)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  budgetText: { fontSize: 12, fontWeight: '700', color: Colors.success },
  content: { padding: 20 },
  section: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionContent: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  linkRowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  linkRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8, paddingHorizontal: 12 },
  linkText: { fontSize: 14, color: Colors.info, flex: 1, fontWeight: '500' },
  copyBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(168,85,247,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' },
  bottomBarWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomBar: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  bottomBarAndroid: { backgroundColor: 'rgba(2, 6, 23, 0.95)' },
  applyBtnWrapper: { shadowColor: Colors.purple, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 60, borderRadius: 16 },
  applyBtnText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
})
