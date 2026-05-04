import React, { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, Dimensions, StyleSheet, StatusBar, ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors } from '@/constants/colors'

const { width, height } = Dimensions.get('window')

const SLIDES = [
  {
    icon: 'sparkles',
    gradient: [Colors.purple, Colors.pink] as const,
    title: 'Discover Campaigns',
    description: 'Browse brand collaborations tailored to your niche, followers, and content style.',
    bgCircleColor: 'rgba(168, 85, 247, 0.12)',
  },
  {
    icon: 'paper-plane',
    gradient: [Colors.info, Colors.purple] as const,
    title: 'Apply & Track',
    description: 'Submit applications with a tap and track your status in real-time — all from one place.',
    bgCircleColor: 'rgba(56, 189, 248, 0.12)',
  },
  {
    icon: 'wallet',
    gradient: ['#22c55e', Colors.info] as const,
    title: 'Get Paid Securely',
    description: 'Receive payments directly to your bank account. No delays, no middlemen.',
    bgCircleColor: 'rgba(34, 197, 94, 0.12)',
  },
]

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const router = useRouter()

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      const nextSlide = currentSlide + 1
      scrollRef.current?.scrollTo({ x: nextSlide * width, animated: true })
      setCurrentSlide(nextSlide)
    } else {
      completeOnboarding()
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true')
    router.replace('/(auth)/login')
  }

  const onScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x
    const index = Math.round(x / width)
    if (index !== currentSlide) setCurrentSlide(index)
  }

  const isLastSlide = currentSlide === SLIDES.length - 1

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#020617', '#020617']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
          <Text style={s.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => (
          <View key={index} style={s.slide}>
            {/* Background circle */}
            <View style={[s.bgCircle, { backgroundColor: slide.bgCircleColor }]} />

            {/* Icon */}
            <View style={s.iconContainer}>
              <LinearGradient
                colors={slide.gradient as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.iconGradient}
              >
                <Ionicons name={slide.icon as any} size={48} color="#fff" />
              </LinearGradient>

              {/* Decorative rings */}
              <View style={[s.ring, s.ring1, { borderColor: slide.gradient[0] + '30' }]} />
              <View style={[s.ring, s.ring2, { borderColor: slide.gradient[1] + '20' }]} />
            </View>

            {/* Text */}
            <Text style={s.title}>{slide.title}</Text>
            <Text style={s.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={s.bottomControls}>
        {/* Dot indicators */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                currentSlide === i && s.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity
          style={s.nextBtnWrapper}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.purpleLight, Colors.purple]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.nextBtn}
          >
            <Text style={s.nextBtnText}>
              {isLastSlide ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name={isLastSlide ? 'rocket' : 'arrow-forward'}
              size={20}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  skipText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 160,
  },
  bgCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: height * 0.2,
  },
  iconContainer: {
    marginBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 100,
  },
  ring1: { width: 160, height: 160 },
  ring2: { width: 200, height: 200 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 28,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: {
    width: 32,
    backgroundColor: Colors.purpleLight,
  },
  nextBtnWrapper: {
    width: '100%',
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 60,
    borderRadius: 20,
  },
  nextBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
})
