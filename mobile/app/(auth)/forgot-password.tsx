import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()

  const handleSubmit = async () => {
    if (!email.includes('@')) { showToast({ type: 'error', title: 'Error', message: 'Enter a valid email' }); return }
    setLoading(true)
    try {
      const { ok, data } = await api.post('/api/auth/forgot-password', { email })
      if (!ok) { showToast({ type: 'error', title: 'Error', message: data.error || 'Failed to send reset email' }); return }
      setSent(true)
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message || 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
        <Text style={s.backText}>Back to login</Text>
      </TouchableOpacity>

      <View style={s.iconBox}>
        <Ionicons name="mail-outline" size={28} color={Colors.purpleLight} />
      </View>

      <Text style={s.title}>Reset Password</Text>
      <Text style={s.subtitle}>Enter your email and we'll send you a reset link.</Text>

      {sent ? (
        <View style={s.successBox}>
          <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
          <Text style={s.successTitle}>Email Sent!</Text>
          <Text style={s.successText}>Check your inbox for the password reset link.</Text>
          <TouchableOpacity style={s.btn} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.8}>
            <Text style={s.btnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={s.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={{ marginLeft: 16 }} />
            <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com"
              placeholderTextColor={Colors.textPlaceholder} keyboardType="email-address" autoCapitalize="none" autoFocus />
          </View>
          <TouchableOpacity style={[s.btn, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Reset Link</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: 24, paddingTop: 60 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 },
  backText: { fontSize: 13, color: Colors.textSecondary },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(168,85,247,0.15)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 14, height: 56, marginBottom: 16 },
  input: { flex: 1, height: '100%', paddingHorizontal: 12, color: Colors.text, fontSize: 15, fontWeight: '500' },
  btn: { height: 56, borderRadius: 14, backgroundColor: Colors.purple, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  successBox: { alignItems: 'center', gap: 12, marginTop: 20 },
  successTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  successText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
})
