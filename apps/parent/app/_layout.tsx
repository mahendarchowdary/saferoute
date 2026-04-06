import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';

export default function Layout() {
  const { loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: 'Register' }} />
      <Stack.Screen name="dashboard" options={{ title: 'My Children' }} />
      <Stack.Screen name="tracking" options={{ title: 'Live Tracking' }} />
    </Stack>
  );
}
