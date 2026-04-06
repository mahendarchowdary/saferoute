import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth';

export default function Index() {
  const { isAuthenticated, currentTrip } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (currentTrip) {
    return <Redirect href="/trip" />;
  }

  return <Redirect href="/dashboard" />;
}
