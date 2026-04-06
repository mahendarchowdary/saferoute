import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  photoUrl?: string;
  routeId?: string;
  stopId?: string;
}

interface ActiveTrip {
  id: string;
  status: string;
  driver: {
    name: string;
    phone: string;
  };
  bus: {
    plateNumber: string;
  };
  route: {
    name: string;
  };
}

interface AuthState {
  user: User | null;
  students: Student[];
  activeTrip: ActiveTrip | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  setAuth: (user: User, students: Student[], accessToken: string, refreshToken: string) => Promise<void>;
  setActiveTrip: (trip: ActiveTrip | null) => void;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  students: [],
  activeTrip: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  setAuth: async (user, students, accessToken, refreshToken) => {
    await AsyncStorage.multiSet([
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
      ['user', JSON.stringify(user)],
      ['students', JSON.stringify(students)],
    ]);
    set({ user, students, accessToken, refreshToken, isAuthenticated: true });
  },

  setActiveTrip: (trip) => {
    set({ activeTrip: trip });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user', 'students']);
    set({ user: null, students: [], activeTrip: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      const [accessToken, refreshToken, userStr, studentsStr] = await AsyncStorage.multiGet([
        'accessToken',
        'refreshToken',
        'user',
        'students',
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
      const studentsValue = studentsStr?.[1];

      if (tokenValue && tokenValue !== 'undefined' && 
          refreshValue && refreshValue !== 'undefined') {
        const user = safeParse(userValue);
        if (user) {
          const students = safeParse(studentsValue, []);
          set({ user, students, accessToken: tokenValue, refreshToken: refreshValue, isAuthenticated: true });
        }
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    }
  },
}));
