import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StyleSheet
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

export default function ProfileScreen() {
  const { user, refreshUserProfile, logout, getMissingFields } = useAuth()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    instagram_username: '',
    gender: '',
    category: '',
    state: '',
    city: '',
    followers: '',
    account_name: '',
    account_number: '',
    ifsc_code: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        instagram_username: user.instagram_username || '',
        gender: user.gender || '',
        category: user.category || '',
        state: user.state || '',
        city: user.city || '',
        followers: user.followers ? String(user.followers) : '',
        account_name: user.account_name || '',
        account_number: user.account_number || '',
        ifsc_code: user.ifsc_code || '',
      })
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...formData,
        followers: formData.followers ? parseInt(formData.followers, 10) : 0
      }
      
      const { ok, data } = await api.put('/api/dashboard/profile', payload)
      if (!ok) throw new Error(data.error || 'Failed to update profile')
      
      await refreshUserProfile()
      showToast({ type: 'success', title: 'Success', message: 'Profile updated successfully!' })
    } catch (e: any) {
      showToast({ type: 'error', title: 'Error', message: e.message || 'Something went wrong' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    )
  }

  const strength = Math.round(((9 - getMissingFields().length) / 9) * 100)
  const isComplete = strength === 100

  const Field = ({ label, icon, value, onChangeText, placeholder, kbType, prefix }: any) => (
    <View style={s.fieldGroup}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        <Ionicons name={icon} size={20} color={icon === 'logo-instagram' ? Colors.pink : Colors.textMuted} style={s.inputIcon} />
        {prefix && <Text style={s.prefix}>{prefix}</Text>}
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textPlaceholder}
          keyboardType={kbType || 'default'}
          autoCapitalize="none"
          keyboardAppearance="dark"
        />
      </View>
    </View>
  )

  return (
    <View style={s.container}>
      <ScrollView 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Dynamic Hero Banner */}
        <Animated.View entering={FadeInDown.duration(600)}>
          <LinearGradient
            colors={[Colors.purple, '#020617']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={s.heroBanner}
          >
            <View style={s.heroHeader}>
              <Text style={s.heroTitle}>Your Profile</Text>
              <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>

            <View style={s.avatarContainer}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{user?.full_name?.charAt(0)?.toUpperCase() || 'U'}</Text>
              </View>
              <View style={s.heroInfo}>
                <Text style={s.name}>{user?.full_name || 'Creator'}</Text>
                <View style={s.badges}>
                  <View style={s.badge}>
                    <Ionicons name="shield-checkmark" size={12} color={Colors.purpleLight} />
                    <Text style={s.badgeText}>{user?.influencer_id || 'HY...'}</Text>
                  </View>
                  {user?.is_mobile_verified && (
                    <View style={[s.badge, { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                      <Text style={[s.badgeText, { color: Colors.success }]}>Verified</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={s.content}>
          {/* Profile Strength */}
          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={s.strengthCard}>
            <View style={s.strengthHeader}>
              <View style={s.strengthIconBox}>
                <Ionicons name="sparkles" size={18} color={Colors.purpleLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.strengthTitle}>Profile Strength</Text>
                <Text style={s.strengthSub}>Complete your profile to unlock more campaigns</Text>
              </View>
              <Text style={[s.strengthValue, strength === 100 && { color: Colors.success }]}>{strength}%</Text>
            </View>
            <View style={s.strengthBarBg}>
              <Animated.View style={[s.strengthBarFill, { width: `${strength}%`, backgroundColor: strength >= 80 ? Colors.success : strength >= 50 ? Colors.warning : Colors.error }]} />
            </View>
            {!isComplete && (
              <View style={s.missingBox}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
                <Text style={s.missingText}>Missing: {getMissingFields().join(', ')}</Text>
              </View>
            )}
          </Animated.View>

          {/* Form Sections */}
          <Animated.View entering={FadeInUp.delay(300).duration(600)} style={s.section}>
            <View style={s.sectionHeaderWrap}>
              <Ionicons name="person" size={16} color={Colors.purpleLight} />
              <Text style={s.sectionHeader}>SOCIAL & DEMOGRAPHICS</Text>
            </View>
            <Field label="FULL NAME" icon="person-outline" value={formData.full_name} onChangeText={(t: string) => setFormData({ ...formData, full_name: t })} placeholder="Your full name" />
            <Field label="INSTAGRAM USERNAME" icon="logo-instagram" prefix="@" value={formData.instagram_username} onChangeText={(t: string) => setFormData({ ...formData, instagram_username: t.replace('@', '') })} placeholder="username" />
            
            <View style={s.fieldGroup}>
              <Text style={s.label}>GENDER</Text>
              <View style={s.chipRow}>
                {['Male', 'Female', 'Other'].map(g => (
                  <TouchableOpacity key={g} style={[s.chip, formData.gender === g && s.chipActive]} onPress={() => setFormData({ ...formData, gender: g })}>
                    <Text style={[s.chipText, formData.gender === g && s.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Field label="FOLLOWERS" icon="people-outline" value={formData.followers} onChangeText={(t: string) => setFormData({ ...formData, followers: t.replace(/\D/g, '') })} placeholder="E.g. 15000" kbType="numeric" />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(600)} style={s.section}>
            <View style={s.sectionHeaderWrap}>
              <Ionicons name="location" size={16} color={Colors.purpleLight} />
              <Text style={s.sectionHeader}>LOCATION & CATEGORY</Text>
            </View>
            <Field label="STATE" icon="map-outline" value={formData.state} onChangeText={(t: string) => setFormData({ ...formData, state: t })} placeholder="E.g. Maharashtra" />
            <Field label="CITY" icon="location-outline" value={formData.city} onChangeText={(t: string) => setFormData({ ...formData, city: t })} placeholder="E.g. Mumbai" />
            <Field label="CATEGORY / NICHE" icon="pricetag-outline" value={formData.category} onChangeText={(t: string) => setFormData({ ...formData, category: t })} placeholder="E.g. Fashion & Style" />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(500).duration(600)} style={s.section}>
            <View style={s.sectionHeaderWrap}>
              <Ionicons name="card" size={16} color={Colors.purpleLight} />
              <Text style={s.sectionHeader}>BANKING DETAILS</Text>
            </View>
            <Field label="ACCOUNT NAME" icon="person-outline" value={formData.account_name} onChangeText={(t: string) => setFormData({ ...formData, account_name: t })} placeholder="Name on bank account" />
            <Field label="ACCOUNT NUMBER" icon="card-outline" value={formData.account_number} onChangeText={(t: string) => setFormData({ ...formData, account_number: t.replace(/\D/g, '') })} placeholder="Account number" kbType="numeric" />
            <Field label="IFSC CODE" icon="business-outline" value={formData.ifsc_code} onChangeText={(t: string) => setFormData({ ...formData, ifsc_code: t.toUpperCase() })} placeholder="SBIN0001234" />
          </Animated.View>
        </View>
      </ScrollView>

      {/* Floating Save Button */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={s.bottomBarWrap}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={s.saveBtnWrapper}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.purpleLight, Colors.purple]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.saveBtn, saving && { opacity: 0.8 }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={s.saveBtnText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  heroBanner: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  logoutBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  avatarContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.pink, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.pink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  heroInfo: { flex: 1 },
  name: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  content: { padding: 20, paddingTop: 10 },
  strengthCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, marginBottom: 24 },
  strengthHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  strengthIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' },
  strengthTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  strengthSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  strengthValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
  strengthBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' },
  strengthBarFill: { height: '100%', borderRadius: 5 },
  missingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  missingText: { flex: 1, fontSize: 12, color: Colors.warning, fontWeight: '500' },
  section: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, marginBottom: 20, gap: 20 },
  sectionHeaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, height: 56 },
  inputIcon: { marginLeft: 16, marginRight: 12 },
  prefix: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, marginRight: 2 },
  input: { flex: 1, height: '100%', paddingRight: 16, color: '#fff', fontSize: 15, fontWeight: '500' },
  chipRow: { flexDirection: 'row', gap: 12 },
  chip: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  chipActive: { borderColor: Colors.purpleLight, backgroundColor: 'rgba(168,85,247,0.15)' },
  chipText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.purpleLight },
  bottomBarWrap: { position: 'absolute', bottom: 70, left: 0, right: 0 },
  bottomBar: { padding: 20, paddingBottom: 12, backgroundColor: 'rgba(2, 6, 23, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', borderRadius: 20, marginHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  saveBtnWrapper: { shadowColor: Colors.purple, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 60, borderRadius: 16 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
})
