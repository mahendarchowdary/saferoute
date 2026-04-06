import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { driverApi, tripApi } from '../lib/api';
import { Bus, MapPin, LogOut, PlayCircle } from 'lucide-react-native';

interface BusType {
  id: string;
  plateNumber: string;
  model: string;
}

interface RouteType {
  id: string;
  name: string;
  stops: Array<{
    id: string;
    name: string;
    sequence: number;
  }>;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [buses, setBuses] = useState<BusType[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [selectedBus, setSelectedBus] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadResources = async () => {
    try {
      const response = await driverApi.getAvailableResources();
      setBuses(response.data.buses);
      setRoutes(response.data.routes);
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResources();
    setRefreshing(false);
  };

  const handleStartTrip = async () => {
    if (!selectedBus || !selectedRoute) {
      Alert.alert('Error', 'Please select a bus and route');
      return;
    }

    setLoading(true);
    try {
      const response = await tripApi.start({
        busId: selectedBus,
        routeId: selectedRoute,
        shift: selectedShift,
      });
      
      useAuthStore.getState().setCurrentTrip(response.data);
      router.push('/trip');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome,</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Shift Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Shift</Text>
        <View style={styles.shiftContainer}>
          {(['MORNING', 'AFTERNOON'] as const).map((shift) => (
            <TouchableOpacity
              key={shift}
              style={[
                styles.shiftButton,
                selectedShift === shift && styles.shiftButtonActive,
              ]}
              onPress={() => setSelectedShift(shift)}
            >
              <Text
                style={[
                  styles.shiftButtonText,
                  selectedShift === shift && styles.shiftButtonTextActive,
                ]}
              >
                {shift === 'MORNING' ? 'Morning Pickup' : 'Afternoon Drop'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bus Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Bus</Text>
        <View style={styles.list}>
          {buses.map((bus) => (
            <TouchableOpacity
              key={bus.id}
              style={[
                styles.item,
                selectedBus === bus.id && styles.itemActive,
              ]}
              onPress={() => setSelectedBus(bus.id)}
            >
              <Bus size={24} color={selectedBus === bus.id ? '#007AFF' : '#666'} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{bus.plateNumber}</Text>
                <Text style={styles.itemSubtitle}>{bus.model}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Route Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Route</Text>
        <View style={styles.list}>
          {routes.map((route) => (
            <TouchableOpacity
              key={route.id}
              style={[
                styles.item,
                selectedRoute === route.id && styles.itemActive,
              ]}
              onPress={() => setSelectedRoute(route.id)}
            >
              <MapPin size={24} color={selectedRoute === route.id ? '#007AFF' : '#666'} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{route.name}</Text>
                <Text style={styles.itemSubtitle}>{route.stops.length} stops</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Start Trip Button */}
      <TouchableOpacity
        style={[styles.startButton, loading && styles.startButtonDisabled]}
        onPress={handleStartTrip}
        disabled={loading}
      >
        <PlayCircle size={24} color="white" />
        <Text style={styles.startButtonText}>
          {loading ? 'Starting...' : 'Start Trip'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  welcome: {
    fontSize: 14,
    color: '#666',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  shiftContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  shiftButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  shiftButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  shiftButtonText: {
    fontSize: 14,
    color: '#333',
  },
  shiftButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 12,
  },
  itemActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
