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
      <Stack.Screen name="dashboard" options={{ title: 'SafeRoute Driver' }} />
      <Stack.Screen name="trip" options={{ title: 'Active Trip' }} />
      <Stack.Screen name="attendance" options={{ title: 'Attendance' }} />
    </Stack>
  );
}
