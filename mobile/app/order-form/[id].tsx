import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Image,
  StatusBar, ActivityIndicator, Alert
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { Colors } from '@/constants/colors'
import { api, getToken, BASE_URL } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { DetailSkeleton } from '@/components/SkeletonLoader'

interface FormField {
  name: string
  type: string
  required: boolean
  options?: string[]
}

interface ApplicationData {
  id: string
  status: string
  form_data?: any
  campaigns: {
    brand_name: string
    campaign_code: string
    order_form?: boolean
    order_form_fields?: FormField[]
  }
}

export default function OrderFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useToast()

  const [application, setApplication] = useState<ApplicationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [orderFormData, setOrderFormData] = useState<Record<string, any>>({})
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({})
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  useEffect(() => {
    fetchApplication()
  }, [id])

  const fetchApplication = async () => {
    try {
      const { ok, data } = await api.get('/api/dashboard/applications')
      if (ok) {
        const found = (data.applications || []).find((a: any) => a.id === id)
        if (found) {
          setApplication(found)
          // Initialize form fields
          const initial: Record<string, any> = {}
          if (found.campaigns?.order_form_fields) {
            found.campaigns.order_form_fields.forEach((f: FormField) => {
              // Pre-fill from existing submission if re-submitting
              initial[f.name] = found.form_data?.order_details?.[f.name] || ''
            })
          }
          setOrderFormData(initial)
        }
      }
    } catch (e) {
      console.error('Failed to fetch application', e)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    if (!application?.campaigns?.order_form_fields) return false
    return application.campaigns.order_form_fields
      .filter(f => f.required)
      .every(f => !!orderFormData[f.name])
  }

  const pickAndUploadImage = async (fieldName: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    })

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    setUploadingFields(p => ({ ...p, [fieldName]: true }))

    try {
      const token = await getToken()
      const formData = new FormData()

      // Extract file extension
      const uriParts = asset.uri.split('.')
      const ext = uriParts[uriParts.length - 1] || 'jpg'

      formData.append('file', {
        uri: asset.uri,
        name: `order_${Date.now()}.${ext}`,
        type: asset.mimeType || `image/${ext}`,
      } as any)

      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Cookie': `auth_token=${token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setOrderFormData(p => ({ ...p, [fieldName]: data.url }))
      showToast({ type: 'success', title: 'Uploaded!', message: 'Image uploaded successfully' })
    } catch (err: any) {
      showToast({ type: 'error', title: 'Upload Failed', message: err.message || 'Failed to upload image' })
    } finally {
      setUploadingFields(p => ({ ...p, [fieldName]: false }))
    }
  }

  const handleSubmit = async () => {
    if (!application || !isFormValid()) return

    setSubmitting(true)
    try {
      const { ok, data } = await api.put(
        `/api/dashboard/applications/${application.id}/order`,
        { orderFormData }
      )

      if (!ok) throw new Error(data.error || 'Failed to submit order details')

      showToast({ type: 'success', title: 'Success!', message: 'Order details submitted successfully' })
      router.back()
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
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />
        <View style={s.errorBox}>
          <Ionicons name="warning-outline" size={48} color={Colors.warning} />
          <Text style={s.errorTitle}>Application Not Found</Text>
          <TouchableOpacity style={s.backBtnAlt} onPress={() => router.back()}>
            <Text style={s.backBtnAltText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const fields = application.campaigns?.order_form_fields || []
  const isUploading = Object.values(uploadingFields).some(Boolean)

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f172a', '#020617', '#020617']} style={StyleSheet.absoluteFillObject} />

      {/* Decorative Blur Circles */}
      <View style={s.blurCircleTop} />
      <View style={s.blurCircleBottom} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Campaign Verification</Text>
            <Text style={s.headerSub}>{application.campaigns?.brand_name} • {application.campaigns?.campaign_code}</Text>
          </View>
        </Animated.View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)} style={s.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#818cf8" />
            <Text style={s.infoBannerText}>
              Please fill all required details including screenshots to enable submission.
            </Text>
          </Animated.View>

          {/* Form Fields */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)} style={s.formCard}>
            {fields.map((field, idx) => (
              <View key={`field-${idx}`} style={s.fieldGroup}>
                <Text style={s.fieldLabel}>
                  {field.name}
                  {field.required && <Text style={{ color: Colors.error }}> *</Text>}
                </Text>

                {field.type === 'dropdown' ? (
                  <View>
                    <TouchableOpacity
                      style={s.dropdownTrigger}
                      onPress={() => setShowDropdown(showDropdown === field.name ? null : field.name)}
                    >
                      <Text style={[s.dropdownTriggerText, !orderFormData[field.name] && { color: 'rgba(255,255,255,0.3)' }]}>
                        {orderFormData[field.name] || `Select ${field.name}`}
                      </Text>
                      <Ionicons name={showDropdown === field.name ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                    {showDropdown === field.name && (
                      <View style={s.dropdownMenu}>
                        {field.options?.map(opt => (
                          <TouchableOpacity
                            key={opt}
                            style={[s.dropdownItem, orderFormData[field.name] === opt && s.dropdownItemActive]}
                            onPress={() => {
                              setOrderFormData(p => ({ ...p, [field.name]: opt }))
                              setShowDropdown(null)
                            }}
                          >
                            <Text style={[s.dropdownItemText, orderFormData[field.name] === opt && { color: Colors.purpleLight }]}>
                              {opt}
                            </Text>
                            {orderFormData[field.name] === opt && (
                              <Ionicons name="checkmark" size={16} color={Colors.purpleLight} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ) : field.type === 'textarea' ? (
                  <TextInput
                    style={[s.textInput, { height: 90, textAlignVertical: 'top' }]}
                    value={orderFormData[field.name] || ''}
                    onChangeText={text => setOrderFormData(p => ({ ...p, [field.name]: text }))}
                    placeholder={`Enter ${field.name}...`}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    keyboardAppearance="dark"
                  />
                ) : field.type === 'image' ? (
                  <View>
                    {orderFormData[field.name] ? (
                      <View style={s.imagePreview}>
                        <Image
                          source={{ uri: orderFormData[field.name] }}
                          style={s.previewImg}
                          resizeMode="contain"
                        />
                        <TouchableOpacity
                          style={s.removeImgBtn}
                          onPress={() => setOrderFormData(p => ({ ...p, [field.name]: '' }))}
                        >
                          <Ionicons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={s.uploadArea}
                        onPress={() => pickAndUploadImage(field.name)}
                        disabled={uploadingFields[field.name]}
                      >
                        {uploadingFields[field.name] ? (
                          <View style={{ alignItems: 'center', gap: 8 }}>
                            <ActivityIndicator color={Colors.purpleLight} size="small" />
                            <Text style={s.uploadingText}>Uploading...</Text>
                          </View>
                        ) : (
                          <>
                            <Ionicons name="cloud-upload-outline" size={32} color={Colors.purpleLight} />
                            <Text style={s.uploadTitle}>Tap to select image</Text>
                            <Text style={s.uploadHint}>PNG, JPG formats supported</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : field.type === 'date' ? (
                  <TextInput
                    style={s.textInput}
                    value={orderFormData[field.name] || ''}
                    onChangeText={text => setOrderFormData(p => ({ ...p, [field.name]: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardAppearance="dark"
                  />
                ) : (
                  <TextInput
                    style={s.textInput}
                    value={String(orderFormData[field.name] || '')}
                    onChangeText={text => setOrderFormData(p => ({
                      ...p,
                      [field.name]: field.type === 'number' ? Number(text) || '' : text
                    }))}
                    placeholder={`Enter ${field.name}...`}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                    keyboardAppearance="dark"
                  />
                )}
              </View>
            ))}
          </Animated.View>
        </ScrollView>

        {/* Footer Actions */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)} style={s.footer}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, (!isFormValid() || isUploading || submitting) && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isUploading || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={s.submitBtnText}>Submit Details</Text>
                <Ionicons name="send" size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  blurCircleTop: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(99, 102, 241, 0.12)', transform: [{ scaleX: 1.5 }] },
  blurCircleBottom: { position: 'absolute', bottom: -100, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(168, 85, 247, 0.08)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  scrollContent: { padding: 20, paddingBottom: 30 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    marginBottom: 20,
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#a5b4fc', fontWeight: '500', lineHeight: 20 },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    gap: 24,
  },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownTriggerText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownItemActive: { backgroundColor: 'rgba(168, 85, 247, 0.1)' },
  dropdownItemText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    gap: 6,
  },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  uploadHint: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  uploadingText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  imagePreview: {
    position: 'relative',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  previewImg: { width: '100%', height: 200 },
  removeImgBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(2,6,23,0.9)',
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  submitBtn: {
    flex: 2,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  backBtnAlt: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backBtnAltText: { fontSize: 14, fontWeight: '600', color: Colors.purpleLight },
})
