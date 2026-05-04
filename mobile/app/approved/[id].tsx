import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Image, StatusBar, ActivityIndicator
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Clipboard from 'expo-clipboard'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { Colors } from '@/constants/colors'
import { api, getToken, BASE_URL } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { DetailSkeleton } from '@/components/SkeletonLoader'
import type { Application } from '@/types'

export default function ApprovedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Payment State
  const [requestAmount, setRequestAmount] = useState('')
  const [orderId, setOrderId] = useState('')
  const [orderScreenshot, setOrderScreenshot] = useState('')

  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return
    await Clipboard.setStringAsync(text)
    showToast({ type: 'success', title: 'Copied!', message: `${label} copied to clipboard` })
  }

  useEffect(() => { fetchApplication() }, [id])

  const fetchApplication = async () => {
    try {
      const { ok, data } = await api.get('/api/dashboard/applications')
      if (ok) {
        const found = (data.applications || []).find((a: Application) => a.id === id)
        if (found) setApplication(found)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        uploadImage(result.assets[0].uri)
      }
    } catch (e: any) {
      showToast({ type: 'error', title: 'Error', message: e.message || 'Failed to pick image' })
    }
  }

  const uploadImage = async (uri: string) => {
    setSubmitting(true)
    try {
      const filename = uri.split('/').pop() || 'upload.jpg'
      const match = /\.(\w+)$/.exec(filename)
      const type = match ? `image/${match[1]}` : `image/jpeg`

      const formData = new FormData()
      formData.append('file', { uri, name: filename, type } as any)

      const token = await getToken()
      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Cookie': `auth_token=${token}` },
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.url) {
        setOrderScreenshot(data.url)
      } else {
        throw new Error(data.error || 'Failed to upload image')
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Upload Error', message: err.message || 'Something went wrong' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestPayment = async () => {
    if (!application) return

    const amt = parseFloat(requestAmount)
    if (isNaN(amt) || amt <= 0) {
      return showToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid request amount.' })
    }
    if (amt > (application.pending_amount || 0)) {
      return showToast({ type: 'error', title: 'Error', message: 'Requested amount exceeds your pending balance.' })
    }
    if (!orderId.trim()) {
      return showToast({ type: 'error', title: 'Error', message: 'Order ID is required.' })
    }
    if (!orderScreenshot) {
      return showToast({ type: 'error', title: 'Error', message: 'Order screenshot is required.' })
    }

    setSubmitting(true)
    try {
      const payload = {
        applicationId: application.id,
        amount: amt,
        orderId,
        orderScreenshot
      }
      
      const { ok, data } = await api.post('/api/dashboard/payments/request', payload)

      if (!ok) {
        showToast({ type: 'error', title: 'Error', message: data.error || 'Failed to submit payment request.' })
        return
      }

      showToast({ type: 'success', title: 'Success!', message: 'Payment request submitted. Pending admin approval.' })
      setRequestAmount('')
      setOrderId('')
      setOrderScreenshot('')
      fetchApplication()
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message || 'Something went wrong' })
    } finally {
      setSubmitting(false)
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

  if (!application) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={s.errorText}>Application not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const finalAmt = application.final_payment || 0
  const pendingAmt = application.pending_amount || 0
  const isPaid = pendingAmt === 0 && finalAmt > 0

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f172a', '#020617']} style={StyleSheet.absoluteFillObject} />

      {/* Decorative Blur Circles */}
      <View style={s.blurCircleTop} />
      <View style={s.blurCircleBottom} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Payment & Orders</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        
        <Animated.View entering={FadeInDown.duration(600)}>
          {/* Summary Card */}
          <LinearGradient
            colors={[Colors.purple, '#0f172a']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.summaryCard}
          >
            <View style={s.summaryHeader}>
              <View style={s.brandAvatar}>
                <Text style={s.brandAvatarText}>{application.campaigns?.brand_name?.charAt(0) || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.brandName}>{application.campaigns?.brand_name}</Text>
                <TouchableOpacity onPress={() => copyToClipboard(application.campaigns?.campaign_code || '', 'Campaign ID')} style={s.copyRow}>
                  <Text style={s.campaignCode}>ID: {application.campaigns?.campaign_code}</Text>
                  <Ionicons name="copy-outline" size={14} color={Colors.purpleLight} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.financeBox}>
              <View style={s.financeCol}>
                <Text style={s.financeLabel}>Total Value</Text>
                <Text style={s.financeValue}>₹{finalAmt.toLocaleString()}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.financeCol}>
                <Text style={s.financeLabel}>Pending</Text>
                <Text style={[s.financeValue, { color: isPaid ? Colors.success : Colors.warning }]}>
                  ₹{pendingAmt.toLocaleString()}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {isPaid ? (
          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={s.paidCard}>
            <View style={s.paidIconWrap}>
              <Ionicons name="checkmark-done-circle" size={48} color={Colors.success} />
            </View>
            <Text style={s.paidTitle}>Fully Paid</Text>
            <Text style={s.paidText}>You have received the full payment of ₹{finalAmt} for this campaign.</Text>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInUp.delay(200).duration(600)}>
            {/* Payment Request Form */}
            <View style={s.formCard}>
              <View style={s.sectionHeaderWrap}>
                <Ionicons name="cash" size={16} color={Colors.purpleLight} />
                <Text style={s.sectionLabel}>REQUEST PARTIAL PAYMENT</Text>
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Amount to Request (₹)</Text>
                <View style={s.inputWrap}>
                  <Text style={s.prefix}>₹</Text>
                  <TextInput
                    style={s.input}
                    value={requestAmount}
                    onChangeText={setRequestAmount}
                    placeholder={`Max: ${pendingAmt}`}
                    placeholderTextColor={Colors.textPlaceholder}
                    keyboardType="numeric"
                    keyboardAppearance="dark"
                  />
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Order ID (Screenshot Proof)</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="receipt-outline" size={20} color={Colors.textMuted} style={{ marginRight: 10 }} />
                  <TextInput
                    style={s.input}
                    value={orderId}
                    onChangeText={setOrderId}
                    placeholder="E.g. #ORD-123456"
                    placeholderTextColor={Colors.textPlaceholder}
                    keyboardAppearance="dark"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Upload Screenshot</Text>
                <View style={s.imageUploadBox}>
                  {orderScreenshot ? (
                    <View style={{ width: '100%', alignItems: 'center' }}>
                      <Image source={{ uri: orderScreenshot }} style={s.uploadedImage} />
                      <TouchableOpacity style={s.removeImageBtn} onPress={() => setOrderScreenshot('')}>
                        <Ionicons name="close-circle" size={24} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={s.uploadBtn} onPress={pickImage}>
                      <Ionicons name="cloud-upload" size={32} color={Colors.purpleLight} />
                      <Text style={s.uploadBtnText}>Tap to upload screenshot</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Check Bank Details Warning */}
            {(!user?.account_number || !user?.ifsc_code) && (
              <View style={s.warningBox}>
                <Ionicons name="warning" size={20} color={Colors.warning} />
                <Text style={s.warningText}>
                  Your bank details are missing. Please update them in your profile before requesting payment.
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Submit Button */}
      {!isPaid && (
        <View style={s.bottomBarWrap}>
          {Platform.OS === 'ios' && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
          <View style={[s.bottomBar, Platform.OS !== 'ios' && s.bottomBarAndroid]}>
            <TouchableOpacity
              style={s.submitBtnWrapper}
              onPress={handleRequestPayment}
              disabled={submitting || !user?.account_number}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.purpleLight, Colors.purple]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.submitBtn, (submitting || !user?.account_number) && { opacity: 0.5 }]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={20} color="#fff" />
                    <Text style={s.submitBtnText}>Submit Request</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617', gap: 12 },
  errorText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  backBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backBtnText: { color: Colors.purpleLight, fontWeight: '600', fontSize: 15 },
  blurCircleTop: { position: 'absolute', top: -50, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(236, 72, 153, 0.1)', transform: [{ scaleX: 1.5 }] },
  blurCircleBottom: { position: 'absolute', bottom: 100, left: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
  scroll: { padding: 20 },
  summaryCard: { borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', shadowColor: Colors.purple, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  brandAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  brandAvatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  brandName: { fontSize: 24, fontWeight: '800', color: '#fff' },
  campaignCode: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, alignSelf: 'flex-start' },
  financeBox: { flexDirection: 'row', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  financeCol: { flex: 1, gap: 4 },
  financeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  financeValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },
  formCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, marginBottom: 16 },
  sectionHeaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: Colors.purpleLight, letterSpacing: 1.5 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 10 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, height: 56, paddingHorizontal: 16 },
  prefix: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, marginRight: 8 },
  input: { flex: 1, height: '100%', color: '#fff', fontSize: 16, fontWeight: '600' },
  imageUploadBox: { width: '100%', minHeight: 160, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(168,85,247,0.3)', backgroundColor: 'rgba(168,85,247,0.05)', overflow: 'hidden', borderStyle: 'dashed' },
  uploadBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 },
  uploadBtnText: { fontSize: 14, color: Colors.purpleLight, fontWeight: '700' },
  uploadedImage: { width: '100%', height: 200, resizeMode: 'cover', borderRadius: 16 },
  removeImageBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16 },
  paidCard: { alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)', borderRadius: 24, padding: 32 },
  paidIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(34, 197, 94, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  paidTitle: { fontSize: 24, fontWeight: '800', color: Colors.success, marginBottom: 8 },
  paidText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', borderRadius: 16, padding: 16 },
  warningText: { flex: 1, fontSize: 13, color: Colors.warning, fontWeight: '500', lineHeight: 20 },
  bottomBarWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomBar: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  bottomBarAndroid: { backgroundColor: 'rgba(2, 6, 23, 0.95)' },
  submitBtnWrapper: { shadowColor: Colors.purple, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 60, borderRadius: 16 },
  submitBtnText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
})
