import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useAuthStore } from '../store/auth';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, Navigation, Clock, MapPin } from 'lucide-react-native';

interface BusLocation {
  lat: number;
  lng: number;
  speed?: number;
  timestamp: number;
}

interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
}

export default function TrackingScreen() {
  const router = useRouter();
  const { studentId, name } = useLocalSearchParams<{ studentId: string; name: string }>();
  const { user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [route, setRoute] = useState<Stop[]>([]);
  const [eta, setEta] = useState<string>('Calculating...');
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  // Connect to WebSocket
  useEffect(() => {
    if (!user?.accessToken) return;

    const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001';
    const newSocket = io(WS_URL, {
      auth: { token: user.accessToken },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Tracking socket connected');
      newSocket.emit('trip:subscribe', studentId);
    });

    newSocket.on('trip:location', (data: BusLocation) => {
      setBusLocation(data);
      setLoading(false);

      // Animate map to bus location
      if (mapRef.current && data) {
        mapRef.current.animateToRegion({
          latitude: data.lat,
          longitude: data.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    });

    newSocket.on('stop:arrived', (data) => {
      // Show arrival notification
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user, studentId]);

  const initialRegion = busLocation
    ? {
        latitude: busLocation.lat,
        longitude: busLocation.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Tracking</Text>
          <Text style={styles.subtitle}>{name}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ETA Card */}
      <View style={styles.etaCard}>
        <Clock size={20} color="#007AFF" />
        <Text style={styles.etaLabel}>Estimated Arrival</Text>
        <Text style={styles.etaValue}>{eta}</Text>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {busLocation && (
          <Marker
            coordinate={{
              latitude: busLocation.lat,
              longitude: busLocation.lng,
            }}
            title="School Bus"
            description={`Speed: ${busLocation.speed ? (busLocation.speed * 3.6).toFixed(0) : 0} km/h`}
          >
            <View style={styles.busMarker}>
              <Navigation size={20} color="white" />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {route.length > 0 && (
          <Polyline
            coordinates={route.map((stop) => ({
              latitude: stop.latitude,
              longitude: stop.longitude,
            }))}
            strokeColor="#007AFF"
            strokeWidth={3}
          />
        )}

        {/* Stops */}
        {route.map((stop, index) => (
          <Marker
            key={stop.id}
            coordinate={{
              latitude: stop.latitude,
              longitude: stop.longitude,
            }}
            title={stop.name}
            description={`Stop ${index + 1}`}
          >
            <View style={styles.stopMarker}>
              <MapPin size={16} color="#FF9500" />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Connecting to bus...</Text>
        </View>
      )}

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <View style={styles.infoRow}>
          <Navigation size={20} color="#666" />
          <Text style={styles.infoText}>
            {busLocation?.speed
              ? `${(busLocation.speed * 3.6).toFixed(0)} km/h`
              : 'Speed unavailable'}
          </Text>
        </View>
        <Text style={styles.lastUpdate}>
          Last update: {busLocation ? new Date(busLocation.timestamp).toLocaleTimeString() : 'Never'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  etaLabel: {
    fontSize: 14,
    color: '#666',
  },
  etaValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginLeft: 'auto',
  },
  map: {
    flex: 1,
  },
  busMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  stopMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  bottomInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
  },
});
