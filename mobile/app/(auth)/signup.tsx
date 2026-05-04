import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StyleSheet, Dimensions, StatusBar
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

const { width } = Dimensions.get('window')

export default function SignupScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()

  const genderOptions = ['Male', 'Female', 'Other']

  const handleSignup = async () => {
    if (!fullName || !email || !mobile || !password || !gender) {
      showToast({ type: 'warning', title: 'Missing Info', message: 'Please fill in all required fields marked with *' })
      return
    }
    if (mobile.length !== 10) {
      showToast({ type: 'error', title: 'Invalid Mobile', message: 'Please enter a valid 10-digit mobile number' })
      return
    }
    if (!email.includes('@')) {
      showToast({ type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address' })
      return
    }
    if (password.length < 6) {
      showToast({ type: 'warning', title: 'Weak Password', message: 'Password must be at least 6 characters long' })
      return
    }

    setLoading(true)
    try {
      const checkRes = await api.post('/api/auth/check-user-exists', { mobile, email })
      if (checkRes.data.exists) {
        showToast({ type: 'error', title: 'Account Exists', message: checkRes.data.message || 'User already exists' })
        return
      }

      const { ok, data } = await api.post('/api/auth/signup', {
        fullName,
        email,
        mobile,
        password,
        gender,
        instagramUsername: instagramUsername || undefined,
      })

      if (!ok) {
        showToast({ type: 'error', title: 'Signup Failed', message: data.error || 'Failed to create account' })
        return
      }

      login(data.user)
      showToast({ type: 'success', title: 'Welcome! 🎉', message: 'Your account has been created successfully!' })
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message || 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#020617', '#020617']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.blurCircleTop} />
      <View style={styles.blurCircleBottom} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={[Colors.purple, Colors.pink]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.logoIcon}
            >
              <Ionicons name="sparkles" size={24} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Join 1to7 Media</Text>
          <Text style={styles.subtitle}>Start collaborating with top brands today.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(600).springify()} style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full Name *" placeholderTextColor={Colors.textPlaceholder} keyboardAppearance="dark" />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email Address *" placeholderTextColor={Colors.textPlaceholder} keyboardType="email-address" autoCapitalize="none" keyboardAppearance="dark" />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput style={styles.input} value={mobile} onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))} placeholder="Mobile Number *" placeholderTextColor={Colors.textPlaceholder} keyboardType="phone-pad" maxLength={10} keyboardAppearance="dark" />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput style={[styles.input, { paddingRight: 50 }]} value={password} onChangeText={setPassword} placeholder="Password *" placeholderTextColor={Colors.textPlaceholder} secureTextEntry={!showPassword} autoCapitalize="none" keyboardAppearance="dark" />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.genderRow}>
            {genderOptions.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderChip, gender === g && styles.genderChipActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="logo-instagram" size={20} color={Colors.pink} style={styles.inputIcon} />
            <TextInput style={styles.input} value={instagramUsername} onChangeText={(t) => setInstagramUsername(t.replace('@', ''))} placeholder="Instagram Handle (Optional)" placeholderTextColor={Colors.textPlaceholder} autoCapitalize="none" keyboardAppearance="dark" />
          </View>

          <TouchableOpacity
            style={styles.signupBtnWrapper}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.purpleLight, Colors.purple]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.signupBtn, loading && { opacity: 0.8 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signupBtnText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(600).springify()} style={styles.footer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginAction}>Sign in here</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  blurCircleTop: {
    position: 'absolute',
    top: -50,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    transform: [{ scaleX: 1.5 }],
  },
  blurCircleBottom: {
    position: 'absolute',
    bottom: -150,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  form: {
    gap: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    height: 56,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 4,
  },
  genderChip: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipActive: {
    borderColor: Colors.pinkLight,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
  },
  genderChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  genderChipTextActive: {
    color: Colors.pinkLight,
  },
  signupBtnWrapper: {
    marginTop: 12,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  signupBtn: {
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  loginAction: {
    color: Colors.purpleLight,
    fontSize: 15,
    fontWeight: '700',
  },
})
