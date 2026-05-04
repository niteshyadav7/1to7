import React, { useEffect, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withTiming, Easing, interpolate
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'

/**
 * Individual shimmer box — use width/height/borderRadius to shape it
 */
function SkeletonBox({
  width, height, borderRadius = 12, style
}: {
  width: number | string
  height: number
  borderRadius?: number
  style?: any
}) {
  const shimmer = useSharedValue(0)

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }))

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: 'rgba(255,255,255,0.06)',
        },
        animatedStyle,
        style,
      ]}
    />
  )
}

/**
 * Home screen skeleton — stats grid + campaign cards
 */
export function HomeSkeleton() {
  return (
    <View style={s.container}>
      {/* Greeting */}
      <View style={{ gap: 8, marginBottom: 24 }}>
        <SkeletonBox width={200} height={28} borderRadius={8} />
        <SkeletonBox width={260} height={16} borderRadius={6} />
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={s.statCard}>
            <SkeletonBox width={40} height={40} borderRadius={12} />
            <SkeletonBox width={50} height={28} borderRadius={8} style={{ marginTop: 16 }} />
            <SkeletonBox width={80} height={14} borderRadius={6} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* Section title */}
      <SkeletonBox width={140} height={20} borderRadius={8} style={{ marginBottom: 16 }} />

      {/* Search bar */}
      <SkeletonBox width="100%" height={50} borderRadius={16} style={{ marginBottom: 20 }} />

      {/* Campaign cards */}
      {[1, 2, 3].map(i => (
        <View key={i} style={s.card}>
          <View style={s.cardRow}>
            <SkeletonBox width={46} height={46} borderRadius={14} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox width={140} height={16} borderRadius={6} />
              <SkeletonBox width={100} height={12} borderRadius={4} />
            </View>
            <SkeletonBox width={80} height={30} borderRadius={10} />
          </View>
          <View style={s.tagRow}>
            <SkeletonBox width={70} height={28} borderRadius={8} />
            <SkeletonBox width={60} height={28} borderRadius={8} />
            <SkeletonBox width={50} height={28} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * Applied screen skeleton — tabs + application cards
 */
export function AppliedSkeleton() {
  return (
    <View style={s.container}>
      {/* Header */}
      <SkeletonBox width={180} height={24} borderRadius={8} style={{ marginBottom: 16 }} />

      {/* Tab pills */}
      <View style={[s.tagRow, { marginBottom: 24 }]}>
        {[1, 2, 3, 4].map(i => (
          <SkeletonBox key={i} width={70} height={36} borderRadius={20} />
        ))}
      </View>

      {/* Cards */}
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={s.card}>
          <View style={s.cardRow}>
            <SkeletonBox width={44} height={44} borderRadius={14} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox width={130} height={16} borderRadius={6} />
              <SkeletonBox width={90} height={12} borderRadius={4} />
            </View>
            <SkeletonBox width={72} height={28} borderRadius={10} />
          </View>
          <View style={s.footerRow}>
            <SkeletonBox width={16} height={16} borderRadius={8} />
            <SkeletonBox width={140} height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * Approved screen skeleton — cards with finance boxes
 */
export function ApprovedSkeleton() {
  return (
    <View style={s.container}>
      <SkeletonBox width={200} height={24} borderRadius={8} style={{ marginBottom: 24 }} />

      {[1, 2, 3].map(i => (
        <View key={i} style={s.card}>
          <View style={s.cardRow}>
            <SkeletonBox width={48} height={48} borderRadius={16} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox width={140} height={18} borderRadius={6} />
              <SkeletonBox width={100} height={12} borderRadius={4} />
            </View>
            <SkeletonBox width={80} height={28} borderRadius={10} />
          </View>
          {/* Finance box */}
          <View style={s.financeBox}>
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width={80} height={12} borderRadius={4} />
              <SkeletonBox width={70} height={22} borderRadius={6} />
            </View>
            <View style={s.divider} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width={60} height={12} borderRadius={4} />
              <SkeletonBox width={70} height={22} borderRadius={6} />
            </View>
          </View>
          <View style={s.footerRow}>
            <SkeletonBox width={160} height={14} borderRadius={4} />
            <SkeletonBox width={16} height={16} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * Detail screen skeleton — hero + sections
 */
export function DetailSkeleton() {
  return (
    <View style={s.container}>
      {/* Hero */}
      <View style={{ alignItems: 'center', marginBottom: 32, gap: 12 }}>
        <SkeletonBox width={80} height={80} borderRadius={24} />
        <SkeletonBox width={180} height={26} borderRadius={8} />
        <SkeletonBox width={120} height={14} borderRadius={4} />
        <View style={[s.tagRow, { marginTop: 8 }]}>
          <SkeletonBox width={90} height={30} borderRadius={12} />
          <SkeletonBox width={70} height={30} borderRadius={12} />
        </View>
      </View>

      {/* Info sections */}
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={s.section}>
          <View style={[s.cardRow, { marginBottom: 12 }]}>
            <SkeletonBox width={32} height={32} borderRadius={10} />
            <SkeletonBox width={100} height={14} borderRadius={6} />
          </View>
          <SkeletonBox width="100%" height={14} borderRadius={4} />
          <SkeletonBox width="80%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  container: { padding: 20, paddingTop: 60 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  financeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
})
