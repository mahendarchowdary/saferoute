/**
 * SafeRoute Driver - Device Precheck Screen
 * M13 - Validates device readiness before starting duty
 */

import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import NetInfo from '@react-native-community/netinfo';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  Battery as BatteryIcon,
  Wifi,
  Shield,
  ArrowRight
} from 'lucide-react-native';
import { useAuthStore } from '../store/auth';

interface CheckItem {
  id: string;
  name: string;
  status: 'pending' | 'checking' | 'passed' | 'failed' | 'warning';
  message: string;
  icon: React.ReactNode;
}

export default function PrecheckScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [checks, setChecks] = useState<CheckItem[]>([
    {
      id: 'gps',
      name: 'GPS Accuracy',
      status: 'pending',
      message: 'Checking GPS signal strength...',
      icon: <MapPin size={24} color="#007AFF" />,
    },
    {
      id: 'location',
      name: 'Location Permissions',
      status: 'pending',
      message: 'Verifying location access...',
      icon: <Shield size={24} color="#007AFF" />,
    },
    {
      id: 'battery',
      name: 'Battery Level',
      status: 'pending',
      message: 'Checking battery status...',
      icon: <BatteryIcon size={24} color="#007AFF" />,
    },
    {
      id: 'network',
      name: 'Network Connection',
      status: 'pending',
      message: 'Testing connectivity...',
      icon: <Wifi size={24} color="#007AFF" />,
    },
  ]);
  
  const [allPassed, setAllPassed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  // Animated values for status indicators
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto-run checks on mount
    runAllChecks();

    // Battery listener
    let batterySubscription: any;
    const setupBattery = async () => {
      const level = await Battery.getBatteryLevelAsync();
      setBatteryLevel(level);
      batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
        setBatteryLevel(batteryLevel);
      });
    };
    setupBattery();

    return () => {
      batterySubscription?.remove();
    };
  }, []);

  const updateCheck = (id: string, status: CheckItem['status'], message: string) => {
    setChecks(prev => 
      prev.map(check => 
        check.id === id ? { ...check, status, message } : check
      )
    );
  };

  const runAllChecks = async () => {
    setIsChecking(true);
    setAllPassed(false);

    // Check GPS Accuracy
    await checkGPS();

    // Check Location Permissions
    await checkLocationPermissions();

    // Check Battery
    await checkBattery();

    // Check Network
    await checkNetwork();

    setIsChecking(false);
    verifyAllPassed();
  };

  const checkGPS = async () => {
    updateCheck('gps', 'checking', 'Acquiring GPS signal...');
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        updateCheck('gps', 'failed', 'Location permission denied');
        return;
      }

      // Get current position with high accuracy
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const accuracy = position.coords.accuracy;

      if (accuracy && accuracy < 20) {
        updateCheck('gps', 'passed', `Excellent accuracy (${Math.round(accuracy)}m)`);
      } else if (accuracy && accuracy < 50) {
        updateCheck('gps', 'warning', `Acceptable accuracy (${Math.round(accuracy)}m)`);
      } else {
        updateCheck('gps', 'failed', `Poor accuracy (${Math.round(accuracy || 999)}m). Move to open area.`);
      }
    } catch (error) {
      updateCheck('gps', 'failed', 'GPS unavailable. Check device settings.');
    }
  };

  const checkLocationPermissions = async () => {
    updateCheck('location', 'checking', 'Checking permissions...');

    try {
      // Check foreground permission
      const foreground = await Location.getForegroundPermissionsAsync();
      if (foreground.status !== 'granted') {
        const request = await Location.requestForegroundPermissionsAsync();
        if (request.status !== 'granted') {
          updateCheck('location', 'failed', 'Foreground location permission required');
          return;
        }
      }

      // Check background permission
      const background = await Location.getBackgroundPermissionsAsync();
      if (background.status !== 'granted') {
        updateCheck('location', 'warning', 'Background location not enabled. Enable for continuous tracking.');
        return;
      }

      updateCheck('location', 'passed', 'All location permissions granted');
    } catch (error) {
      updateCheck('location', 'failed', 'Permission check failed');
    }
  };

  const checkBattery = async () => {
    updateCheck('battery', 'checking', 'Checking battery...');

    try {
      const level = await Battery.getBatteryLevelAsync();
      const percentage = Math.round(level * 100);

      if (percentage >= 50) {
        updateCheck('battery', 'passed', `Battery at ${percentage}% - Good`);
      } else if (percentage >= 20) {
        updateCheck('battery', 'warning', `Battery at ${percentage}% - Consider charging`);
      } else {
        updateCheck('battery', 'failed', `Battery at ${percentage}% - Too low, please charge`);
      }
    } catch (error) {
      updateCheck('battery', 'warning', 'Battery status unavailable');
    }
  };

  const checkNetwork = async () => {
    updateCheck('network', 'checking', 'Testing connection...');

    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        if (netInfo.type === 'wifi') {
          updateCheck('network', 'passed', `Connected to ${netInfo.type} (${netInfo.details?.ssid || 'WiFi'})`);
        } else if (netInfo.type === 'cellular') {
          updateCheck('network', 'passed', `Connected to ${netInfo.type} (${netInfo.details?.cellularGeneration || 'mobile'})`);
        } else {
          updateCheck('network', 'passed', `Connected to ${netInfo.type}`);
        }
      } else {
        updateCheck('network', 'failed', 'No network connection');
      }
    } catch (error) {
      updateCheck('network', 'warning', 'Network check failed');
    }
  };

  const verifyAllPassed = () => {
    const allGood = checks.every(check => 
      check.status === 'passed' || check.status === 'warning'
    );
    const noFailures = checks.every(check => 
      check.status !== 'failed'
    );
    setAllPassed(allGood && noFailures);
  };

  useEffect(() => {
    verifyAllPassed();
  }, [checks]);

  const handleProceed = () => {
    // Log precheck results to server
    logPrecheck();
    
    // Navigate to dashboard
    router.replace('/dashboard');
  };

  const logPrecheck = async () => {
    try {
      // TODO: Send precheck log to server
      console.log('Precheck completed:', {
        userId: user?.id,
        timestamp: new Date().toISOString(),
        checks: checks.map(c => ({ id: c.id, status: c.status })),
        batteryLevel,
      });
    } catch (error) {
      console.error('Failed to log precheck:', error);
    }
  };

  const getStatusIcon = (status: CheckItem['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 size={28} color="#34C759" />;
      case 'failed':
        return <XCircle size={28} color="#FF3B30" />;
      case 'warning':
        return <AlertCircle size={28} color="#FF9500" />;
      case 'checking':
        return (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <ActivityIndicator size="small" color="#007AFF" />
          </Animated.View>
        );
      default:
        return <View style={styles.pendingDot} />;
    }
  };

  const getStatusColor = (status: CheckItem['status']) => {
    switch (status) {
      case 'passed':
        return '#34C759';
      case 'failed':
        return '#FF3B30';
      case 'warning':
        return '#FF9500';
      case 'checking':
        return '#007AFF';
      default:
        return '#C7C7CC';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Check</Text>
        <Text style={styles.subtitle}>Verify your device is ready for duty</Text>
      </View>

      <View style={styles.checksContainer}>
        {checks.map((check, index) => (
          <View 
            key={check.id} 
            style={[
              styles.checkItem,
              { borderLeftColor: getStatusColor(check.status) }
            ]}
          >
            <View style={styles.checkIcon}>
              {check.icon}
            </View>
            
            <View style={styles.checkContent}>
              <Text style={styles.checkName}>{check.name}</Text>
              <Text style={[
                styles.checkMessage,
                { color: getStatusColor(check.status) }
              ]}>
                {check.message}
              </Text>
            </View>

            <View style={styles.checkStatus}>
              {getStatusIcon(check.status)}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.retryButton, isChecking && styles.buttonDisabled]}
          onPress={runAllChecks}
          disabled={isChecking}
        >
          <Text style={styles.retryButtonText}>
            {isChecking ? 'Checking...' : 'Run Checks Again'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.proceedButton,
            !allPassed && styles.buttonDisabled
          ]}
          onPress={handleProceed}
          disabled={!allPassed}
        >
          <Text style={styles.proceedButtonText}>
            Proceed to Dashboard
          </Text>
          <ArrowRight size={20} color="white" style={styles.arrowIcon} />
        </TouchableOpacity>

        {!allPassed && (
          <Text style={styles.warningText}>
            Fix all failed checks before proceeding
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  checksContainer: {
    flex: 1,
    padding: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkContent: {
    flex: 1,
  },
  checkName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  checkMessage: {
    fontSize: 13,
    marginTop: 2,
  },
  checkStatus: {
    marginLeft: 8,
  },
  pendingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C7C7CC',
  },
  footer: {
    padding: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  retryButton: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  proceedButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  arrowIcon: {
    marginLeft: 8,
  },
  warningText: {
    textAlign: 'center',
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 12,
  },
});
