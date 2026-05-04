import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Image, StatusBar,
  ActivityIndicator
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { Colors } from '@/constants/colors'
import { api, getToken, BASE_URL } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { DetailSkeleton } from '@/components/SkeletonLoader'
import type { Campaign } from '@/types'

export default function ApplyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const { user } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()

  const pickImage = async (fieldName: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        uploadImage(result.assets[0].uri, fieldName)
      }
    } catch (e: any) {
      showToast({ type: 'error', title: 'Error', message: e.message || 'Failed to pick image' })
    }
  }

  const uploadImage = async (uri: string, fieldName: string) => {
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
        headers: {
          'Cookie': `auth_token=${token}`
        },
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.url) {
        setFormData(prev => ({ ...prev, [fieldName]: data.url }))
      } else {
        throw new Error(data.error || 'Failed to upload image')
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Upload Error', message: err.message || 'Something went wrong' })
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => { fetchCampaign() }, [id])

  const fetchCampaign = async () => {
    try {
      const allRes = await api.get('/api/campaigns')
      if (allRes.ok) {
        const found = (allRes.data.campaigns || []).find((c: Campaign) => c.id === id)
        if (found) setCampaign(found)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!campaign) return

    const missing = (campaign.form_fields || [])
      .filter(f => f.required && !formData[f.name]?.trim())
      .map(f => f.name)

    if (missing.length > 0) {
      return showToast({ type: 'warning', title: 'Required Fields', message: `Please fill: ${missing.join(', ')}` })
    }

    setSubmitting(true)
    try {
      const { ok, data } = await api.post('/api/apply', {
        campaignId: campaign.id,
        formData,
      })

      if (!ok) {
        showToast({ type: 'error', title: 'Error', message: data.error || 'Failed to submit application' })
        return
      }

      showToast({ type: 'success', title: 'Success! 🎉', message: 'Your application has been submitted successfully!' })
      setTimeout(() => router.back(), 1500)
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

  const fields = campaign.form_fields || []

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
        <Text style={s.headerTitle} numberOfLines={1}>Apply to {campaign.brand_name}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <View style={s.iconWrap}><Ionicons name="business" size={16} color={Colors.purpleLight} /></View>
              <Text style={s.infoLabel}>Brand</Text>
              <Text style={s.infoValue}>{campaign.brand_name}</Text>
            </View>
            <View style={[s.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={s.iconWrap}><Ionicons name="code-working" size={16} color={Colors.purpleLight} /></View>
              <Text style={s.infoLabel}>Campaign ID</Text>
              <Text style={s.infoValue}>{campaign.campaign_code}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(600)}>
          <View style={s.applicantCard}>
            <View style={s.sectionHeaderWrap}>
              <Ionicons name="person" size={14} color={Colors.textMuted} />
              <Text style={s.sectionLabel}>YOUR DETAILS</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Name</Text>
              <Text style={s.detailValue}>{user?.full_name || '—'}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Mobile</Text>
              <Text style={s.detailValue}>{user?.mobile ? `+91 ${user.mobile}` : '—'}</Text>
            </View>
            <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={s.detailLabel}>Instagram</Text>
              <Text style={s.detailValue}>{user?.instagram_username ? `@${user.instagram_username}` : '—'}</Text>
            </View>
          </View>
        </Animated.View>

        {fields.length > 0 && (
          <Animated.View entering={FadeInUp.delay(300).duration(600)}>
            <View style={s.formSection}>
              <View style={s.sectionHeaderWrap}>
                <Ionicons name="help-circle" size={14} color={Colors.purpleLight} />
                <Text style={[s.sectionLabel, { color: Colors.purpleLight }]}>CAMPAIGN QUESTIONS</Text>
              </View>

              {fields.map((field, i) => (
                <View key={i} style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>
                    {field.name} {field.required && <Text style={{ color: Colors.error }}>*</Text>}
                  </Text>
                  
                  {field.type === 'dropdown' && field.options?.length > 0 ? (
                    <View style={s.chipRow}>
                      {field.options.map((opt, j) => (
                        <TouchableOpacity
                          key={j}
                          style={[s.chip, formData[field.name] === opt && s.chipActive]}
                          onPress={() => setFormData({ ...formData, [field.name]: opt })}
                        >
                          <Text style={[s.chipText, formData[field.name] === opt && s.chipTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : field.type === 'image' ? (
                    <View style={s.imageUploadBox}>
                      {formData[field.name] ? (
                        <View style={{ width: '100%', alignItems: 'center' }}>
                          <Image source={{ uri: formData[field.name] }} style={s.uploadedImage} />
                          <TouchableOpacity style={s.removeImageBtn} onPress={() => setFormData(prev => { const n = {...prev}; delete n[field.name]; return n; })}>
                            <Ionicons name="close-circle" size={24} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={s.uploadBtn} onPress={() => pickImage(field.name)}>
                          <Ionicons name="cloud-upload" size={28} color={Colors.purpleLight} />
                          <Text style={s.uploadBtnText}>Upload Image</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : field.type === 'textarea' ? (
                    <TextInput
                      style={[s.input, { height: 120, textAlignVertical: 'top', paddingTop: 16 }]}
                      value={formData[field.name] || ''}
                      onChangeText={t => setFormData({ ...formData, [field.name]: t })}
                      placeholder={`Enter ${field.name.toLowerCase()}`}
                      placeholderTextColor={Colors.textPlaceholder}
                      keyboardAppearance="dark"
                      multiline
                    />
                  ) : (
                    <TextInput
                      style={s.input}
                      value={formData[field.name] || ''}
                      onChangeText={t => setFormData({ ...formData, [field.name]: t })}
                      placeholder={`Enter ${field.name.toLowerCase()}`}
                      placeholderTextColor={Colors.textPlaceholder}
                      keyboardAppearance="dark"
                      keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                    />
                  )}
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {fields.length === 0 && (
          <Animated.View entering={FadeInUp.delay(300).duration(600)} style={s.noFields}>
            <View style={s.successIconWrap}>
              <Ionicons name="checkmark" size={20} color={Colors.success} />
            </View>
            <Text style={s.noFieldsText}>No additional questions. Just hit Apply!</Text>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Glassmorphism Submit Bar */}
      <View style={s.bottomBarWrap}>
        {Platform.OS === 'ios' && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
        <View style={[s.bottomBar, Platform.OS !== 'ios' && s.bottomBarAndroid]}>
          <TouchableOpacity
            style={s.submitBtnWrapper}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.success, '#16a34a']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.submitBtn, submitting && { opacity: 0.8 }]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={s.submitBtnText}>Submit Application</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617', gap: 12 },
  errorText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  backBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backBtnText: { color: Colors.purpleLight, fontWeight: '600', fontSize: 15 },
  blurCircleTop: { position: 'absolute', top: -50, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(147, 51, 234, 0.1)', transform: [{ scaleX: 1.5 }] },
  blurCircleBottom: { position: 'absolute', bottom: 100, right: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(34, 197, 94, 0.1)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
  scroll: { padding: 20 },
  infoCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#fff', fontWeight: '800' },
  applicantCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, marginBottom: 16 },
  sectionHeaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  detailLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#fff', fontWeight: '700' },
  formSection: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, marginBottom: 16 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, height: 56, paddingHorizontal: 16, color: '#fff', fontSize: 15, fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  chipActive: { borderColor: Colors.purpleLight, backgroundColor: 'rgba(168,85,247,0.15)' },
  chipText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.purpleLight },
  noFields: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)', borderRadius: 16, padding: 16 },
  successIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(34, 197, 94, 0.2)', alignItems: 'center', justifyContent: 'center' },
  noFieldsText: { flex: 1, fontSize: 14, color: Colors.success, fontWeight: '600' },
  imageUploadBox: { width: '100%', minHeight: 140, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden', borderStyle: 'dashed' },
  uploadBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 },
  uploadBtnText: { fontSize: 14, color: Colors.purpleLight, fontWeight: '700' },
  uploadedImage: { width: '100%', height: 200, resizeMode: 'cover', borderRadius: 16 },
  removeImageBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16 },
  bottomBarWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomBar: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  bottomBarAndroid: { backgroundColor: 'rgba(2, 6, 23, 0.95)' },
  submitBtnWrapper: { shadowColor: Colors.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 60, borderRadius: 16 },
  submitBtnText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
})
