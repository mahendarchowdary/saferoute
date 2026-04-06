import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuthStore } from '../store/auth';
import { tripApi, attendanceApi, alertApi } from '../lib/api';
import { io, Socket } from 'socket.io-client';
import { MapPin, Users, AlertTriangle, Navigation, Square, ChevronRight } from 'lucide-react-native';

interface LocationPoint {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  battery: number;
  timestamp: number;
}

interface Attendance {
  id: string;
  status: 'PENDING' | 'ONBOARD' | 'DROPPED' | 'ABSENT';
  student: {
    id: string;
    name: string;
    grade: string;
  };
}

export default function TripScreen() {
  const router = useRouter();
  const { currentTrip, setCurrentTrip, user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [currentStop, setCurrentStop] = useState(0);
  const [gpsQueue, setGpsQueue] = useState<LocationPoint[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const gpsQueueRef = useRef<LocationPoint[]>([]);

  // Connect to WebSocket
  useEffect(() => {
    if (!currentTrip) return;

    const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001';
    const newSocket = io(WS_URL, {
      auth: { token: user?.accessToken },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('trip:join', currentTrip.id);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [currentTrip, user]);

  // Load attendance
  const loadAttendance = useCallback(async () => {
    if (!currentTrip) return;
    try {
      const response = await attendanceApi.getByTrip(currentTrip.id);
      setAttendance(response.data);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  }, [currentTrip]);

  useEffect(() => {
    loadAttendance();
    const interval = setInterval(loadAttendance, 5000);
    return () => clearInterval(interval);
  }, [loadAttendance]);

  // Start GPS tracking
  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location permission is needed for tracking');
      return;
    }

    const bgStatus = await Location.requestBackgroundPermissionsAsync();
    console.log('Background permission:', bgStatus.status);

    setIsTracking(true);

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5,
      },
      (newLocation) => {
        setLocation(newLocation);

        const point: LocationPoint = {
          lat: newLocation.coords.latitude,
          lng: newLocation.coords.longitude,
          speed: newLocation.coords.speed,
          heading: newLocation.coords.heading,
          accuracy: newLocation.coords.accuracy,
          battery: -1, // Could use expo-battery
          timestamp: Date.now(),
        };

        gpsQueueRef.current.push(point);

        // Stream real-time
        socket?.emit('location:stream', {
          tripId: currentTrip?.id,
          ...point,
        });
      }
    );
  };

  // Batch sync GPS when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && gpsQueueRef.current.length > 0) {
        syncGpsBatch();
      }
    });

    return () => subscription.remove();
  }, []);

  const syncGpsBatch = async () => {
    if (!currentTrip || gpsQueueRef.current.length === 0) return;

    const points = [...gpsQueueRef.current];
    gpsQueueRef.current = [];

    try {
      await tripApi.batchLocation(currentTrip.id, points);
    } catch (error) {
      // Put points back in queue on failure
      gpsQueueRef.current = [...points, ...gpsQueueRef.current];
    }
  };

  useEffect(() => {
    if (currentTrip) {
      startTracking();
    }

    return () => {
      locationSubscription.current?.remove();
      syncGpsBatch();
    };
  }, [currentTrip]);

  const handleMarkOnboard = async (studentId: string) => {
    try {
      await attendanceApi.onboard(currentTrip!.id, studentId);
      socket?.emit('attendance:update', {
        tripId: currentTrip!.id,
        studentId,
        status: 'ONBOARD',
      });
      loadAttendance();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark student onboard');
    }
  };

  const handleMarkDrop = async (studentId: string) => {
    try {
      await attendanceApi.drop(currentTrip!.id, studentId);
      socket?.emit('attendance:update', {
        tripId: currentTrip!.id,
        studentId,
        status: 'DROPPED',
      });
      loadAttendance();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark student dropped');
    }
  };

  const handleSOS = () => {
    Alert.alert(
      'Emergency SOS',
      'This will immediately alert school administrators. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              await alertApi.sendSOS(currentTrip!.id, 'Emergency button pressed by driver');
              Alert.alert('SOS Sent', 'Administrators have been notified');
            } catch (error) {
              Alert.alert('Error', 'Failed to send SOS');
            }
          },
        },
      ]
    );
  };

  const handleEndTrip = () => {
    const onboardCount = attendance.filter((a) => a.status === 'ONBOARD').length;
    
    if (onboardCount > 0) {
      Alert.alert(
        'Students Still Onboard',
        `${onboardCount} students have not been dropped. Drop all at school?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Drop All & End',
            onPress: async () => {
              try {
                await attendanceApi.dropAll(currentTrip!.id);
                endTrip();
              } catch (error) {
                Alert.alert('Error', 'Failed to drop students');
              }
            },
          },
        ]
      );
    } else {
      endTrip();
    }
  };

  const endTrip = async () => {
    try {
      await tripApi.end(currentTrip!.id);
      await setCurrentTrip(null);
      router.replace('/dashboard');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to end trip');
    }
  };

  if (!currentTrip) {
    return (
      <View style={styles.container}>
        <Text>No active trip</Text>
      </View>
    );
  }

  const onboardCount = attendance.filter((a) => a.status === 'ONBOARD').length;
  const pendingCount = attendance.filter((a) => a.status === 'PENDING').length;

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.stat}>
          <Navigation size={20} color="#007AFF" />
          <Text style={styles.statValue}>
            {location?.coords.speed ? (location.coords.speed * 3.6).toFixed(0) : 0} km/h
          </Text>
          <Text style={styles.statLabel}>Speed</Text>
        </View>
        <View style={styles.stat}>
          <Users size={20} color="#34C759" />
          <Text style={styles.statValue}>{onboardCount}</Text>
          <Text style={styles.statLabel}>Onboard</Text>
        </View>
        <View style={styles.stat}>
          <MapPin size={20} color="#FF9500" />
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Route Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.routeName}>{currentTrip.route.name}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stopsRow}>
          {currentTrip.route.stops.map((stop: any, index: number) => (
            <View key={stop.id} style={styles.stopIndicator}>
              <View
                style={[
                  styles.stopDot,
                  index <= currentStop && styles.stopDotActive,
                ]}
              />
              <Text style={styles.stopName}>{stop.name}</Text>
              {index < currentTrip.route.stops.length - 1 && (
                <ChevronRight size={16} color="#ccc" />
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Attendance List */}
      <ScrollView style={styles.attendanceList}>
        <Text style={styles.sectionTitle}>Students</Text>
        {attendance.map((item) => (
          <View key={item.id} style={styles.studentCard}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.student.name}</Text>
              <Text style={styles.studentGrade}>{item.student.grade}</Text>
            </View>
            <View style={styles.statusButtons}>
              {item.status === 'PENDING' && (
                <TouchableOpacity
                  style={[styles.statusButton, styles.onboardButton]}
                  onPress={() => handleMarkOnboard(item.student.id)}
                >
                  <Text style={styles.statusButtonText}>Onboard</Text>
                </TouchableOpacity>
              )}
              {item.status === 'ONBOARD' && (
                <TouchableOpacity
                  style={[styles.statusButton, styles.dropButton]}
                  onPress={() => handleMarkDrop(item.student.id)}
                >
                  <Text style={styles.statusButtonText}>Drop</Text>
                </TouchableOpacity>
              )}
              {item.status === 'DROPPED' && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>Dropped</Text>
                </View>
              )}
              {item.status === 'ABSENT' && (
                <View style={[styles.statusBadge, styles.absentBadge]}>
                  <Text style={styles.statusBadgeText}>Absent</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
          <AlertTriangle size={24} color="white" />
          <Text style={styles.sosButtonText}>SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endButton} onPress={handleEndTrip}>
          <Square size={20} color="white" />
          <Text style={styles.endButtonText}>End Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    gap: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressSection: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  stopsRow: {
    flexDirection: 'row',
  },
  stopIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
  },
  stopDotActive: {
    backgroundColor: '#007AFF',
  },
  stopName: {
    fontSize: 12,
    marginHorizontal: 4,
  },
  attendanceList: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  studentGrade: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  onboardButton: {
    backgroundColor: '#34C759',
  },
  dropButton: {
    backgroundColor: '#FF9500',
  },
  statusButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
  },
  absentBadge: {
    backgroundColor: '#FFE5E5',
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#666',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sosButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  sosButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  endButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8E8E93',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  endButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
