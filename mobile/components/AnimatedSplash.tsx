import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSequence, Easing,
  runOnJS, interpolate
} from 'react-native-reanimated'
import { Colors } from '@/constants/colors'

const { width, height } = Dimensions.get('window')

interface AnimatedSplashProps {
  onFinish: () => void
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const logoScale = useSharedValue(0.5)
  const logoOpacity = useSharedValue(0)
  const taglineOpacity = useSharedValue(0)
  const containerOpacity = useSharedValue(1)
  const ring1 = useSharedValue(0.8)
  const ring2 = useSharedValue(0.8)

  useEffect(() => {
    // Logo entrance
    logoScale.value = withDelay(200, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) }))
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }))

    // Ring pulse
    ring1.value = withDelay(400, withTiming(1.2, { duration: 1000, easing: Easing.out(Easing.ease) }))
    ring2.value = withDelay(600, withTiming(1.4, { duration: 1200, easing: Easing.out(Easing.ease) }))

    // Tagline fade in
    taglineOpacity.value = withDelay(800, withTiming(1, { duration: 600 }))

    // Fade out entire splash
    containerOpacity.value = withDelay(2200, withTiming(0, { duration: 400 }, (finished) => {
      if (finished) {
        runOnJS(onFinish)()
      }
    }))
  }, [])

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }))

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }))

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }))

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: interpolate(ring1.value, [0.8, 1.2], [0.3, 0]),
  }))

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: interpolate(ring2.value, [0.8, 1.4], [0.2, 0]),
  }))

  return (
    <Animated.View style={[s.container, containerStyle]}>
      <LinearGradient
        colors={['#0f172a', '#020617', '#020617']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative background circles */}
      <View style={s.bgCircle1} />
      <View style={s.bgCircle2} />

      {/* Pulsing rings */}
      <Animated.View style={[s.ring, ring2Style]} />
      <Animated.View style={[s.ring, ring1Style]} />

      {/* Logo */}
      <Animated.View style={[s.logoWrap, logoStyle]}>
        <LinearGradient
          colors={[Colors.purpleLight, Colors.purple, Colors.pink]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.logoGradient}
        >
          <Text style={s.logoNumber}>1<Text style={s.logoTo}>to</Text>7</Text>
        </LinearGradient>
      </Animated.View>

      {/* Brand name */}
      <Animated.View style={[s.textWrap, taglineStyle]}>
        <Text style={s.brandName}>1to7 Media</Text>
        <Text style={s.tagline}>Connecting Brands with Creators</Text>
      </Animated.View>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  bgCircle1: {
    position: 'absolute',
    top: height * 0.15,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    transform: [{ scaleX: 1.5 }],
  },
  bgCircle2: {
    position: 'absolute',
    bottom: height * 0.15,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: Colors.purpleLight,
  },
  logoWrap: {
    marginBottom: 32,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  logoTo: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0,
  },
  textWrap: {
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
})
