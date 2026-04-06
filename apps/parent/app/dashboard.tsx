import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { authApi, parentApi } from '../lib/api';
import { io, Socket } from 'socket.io-client';
import { User, MapPin, Clock, LogOut, Bus, Navigation } from 'lucide-react-native';

interface Student {
  id: string;
  name: string;
  grade: string;
  status?: 'PENDING' | 'ONBOARD' | 'DROPPED' | 'ABSENT';
  busLocation?: {
    lat: number;
    lng: number;
  };
  eta?: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, students, setAuth, logout, setActiveTrip } = useAuthStore();
  const [children, setChildren] = useState<Student[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadChildren = async () => {
    try {
      const response = await parentApi.getChildren();
      setChildren(response.data);
    } catch (error) {
      console.error('Failed to load children:', error);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001';
    const newSocket = io(WS_URL, {
      auth: { token: user.accessToken },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Parent socket connected');
      newSocket.emit('parent:subscribe', user.id);
    });

    newSocket.on('trip:location', (data) => {
      setChildren((prev) =>
        prev.map((child) =>
          child.id === data.studentId
            ? { ...child, busLocation: { lat: data.lat, lng: data.lng } }
            : child
        )
      );
    });

    newSocket.on('stop:arrived', (data) => {
      // Show notification or update UI
    });

    newSocket.on('attendance:updated', (data) => {
      setChildren((prev) =>
        prev.map((child) =>
          child.id === data.studentId
            ? { ...child, status: data.status }
            : child
        )
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChildren();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleTrackChild = (child: Student) => {
    router.push({
      pathname: '/tracking',
      params: { studentId: child.id, name: child.name },
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ONBOARD':
        return '#34C759';
      case 'DROPPED':
        return '#8E8E93';
      case 'ABSENT':
        return '#FF3B30';
      default:
        return '#FF9500';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'ONBOARD':
        return 'On Bus';
      case 'DROPPED':
        return 'Dropped';
      case 'ABSENT':
        return 'Absent';
      default:
        return 'Waiting';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <User size={32} color="#666" />
          </View>
          <View>
            <Text style={styles.welcome}>Hello,</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Children List */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>My Children</Text>

        {children.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No children registered</Text>
            <Text style={styles.emptySubtext}>
              Contact your school administrator to add your child
            </Text>
          </View>
        ) : (
          children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={styles.childCard}
              onPress={() => handleTrackChild(child)}
            >
              <View style={styles.childInfo}>
                <View style={styles.avatarSmall}>
                  <User size={24} color="#666" />
                </View>
                <View>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childGrade}>{child.grade}</Text>
                </View>
              </View>

              <View style={styles.statusSection}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(child.status) + '20' },
                  ]}
                >
                  <Bus
                    size={14}
                    color={getStatusColor(child.status)}
                    style={styles.statusIcon}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(child.status) },
                    ]}
                  >
                    {getStatusText(child.status)}
                  </Text>
                </View>

                {child.busLocation && (
                  <View style={styles.trackButton}>
                    <Navigation size={16} color="#007AFF" />
                    <Text style={styles.trackText}>Track</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How it works</Text>
        <View style={styles.infoItem}>
          <MapPin size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Track your child's bus in real-time on the map
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Clock size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Get notified when the bus arrives at the stop
          </Text>
        </View>
      </View>
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
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  childCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
  },
  childGrade: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusIcon: {
    marginRight: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  infoSection: {
    padding: 20,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});
