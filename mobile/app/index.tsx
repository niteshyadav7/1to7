import { Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { ActivityIndicator, View } from 'react-native'
import { Colors } from '@/constants/colors'

export default function Index() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    )
  }

  if (user) {
    return <Redirect href="/(tabs)/home" />
  }

  return <Redirect href="/(auth)/login" />
}
