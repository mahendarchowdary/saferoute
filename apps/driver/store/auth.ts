import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId?: string;
}

interface Trip {
  id: string;
  busId: string;
  routeId: string;
  shift: 'MORNING' | 'AFTERNOON';
  status: string;
  route: {
    name: string;
    stops: Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      sequence: number;
    }>;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  currentTrip: Trip | null;
  
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  setCurrentTrip: (trip: Trip | null) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  currentTrip: null,

  setAuth: async (user, accessToken, refreshToken) => {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  setCurrentTrip: async (trip) => {
    if (trip) {
      await AsyncStorage.setItem('currentTrip', JSON.stringify(trip));
    } else {
      await AsyncStorage.removeItem('currentTrip');
    }
    set({ currentTrip: trip });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user', 'currentTrip']);
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, currentTrip: null });
  },

  loadStoredAuth: async () => {
    try {
      const [accessToken, refreshToken, userStr, tripStr] = await AsyncStorage.multiGet([
        'accessToken',
        'refreshToken',
        'user',
        'currentTrip'
      ]);

      const safeParse = (str: string | null, defaultVal: any = null) => {
        if (!str || str === 'undefined' || str === 'null') return defaultVal;
        try {
          return JSON.parse(str);
        } catch {
          return defaultVal;
        }
      };

      const tokenValue = accessToken?.[1];
      const refreshValue = refreshToken?.[1];
      const userValue = userStr?.[1];
      const tripValue = tripStr?.[1];

      if (tokenValue && tokenValue !== 'undefined' && 
          refreshValue && refreshValue !== 'undefined') {
        const user = safeParse(userValue);
        if (user) {
          const currentTrip = safeParse(tripValue);
          set({ 
            user, 
            accessToken: tokenValue, 
            refreshToken: refreshValue, 
            isAuthenticated: true,
            currentTrip 
          });
        }
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    }
  },
}));
