import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://saferouteapi-production.up.railway.app/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials: { email?: string; phone?: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  getMe: () => apiClient.get('/auth/me'),
};

export const driverApi = {
  getAvailableResources: () => apiClient.get('/drivers/available-resources'),
};

export const tripApi = {
  start: (data: { busId: string; routeId: string; shift: 'MORNING' | 'AFTERNOON' }) =>
    apiClient.post('/trips/start', data),
  end: (tripId: string) => apiClient.post(`/trips/${tripId}/end`),
  getById: (tripId: string) => apiClient.get(`/trips/${tripId}`),
  batchLocation: (tripId: string, points: any[]) =>
    apiClient.post(`/trips/${tripId}/location/batch`, { points }),
};

export const attendanceApi = {
  getByTrip: (tripId: string) => apiClient.get(`/attendance/trip/${tripId}`),
  onboard: (tripId: string, studentId: string) =>
    apiClient.post('/attendance/onboard', { tripId, studentId }),
  drop: (tripId: string, studentId: string) =>
    apiClient.post('/attendance/drop', { tripId, studentId }),
  absent: (tripId: string, studentId: string) =>
    apiClient.post('/attendance/absent', { tripId, studentId }),
  dropAll: (tripId: string) =>
    apiClient.post('/attendance/drop-all', { tripId }),
};

export const alertApi = {
  sendSOS: (tripId: string, message: string) =>
    apiClient.post('/alerts/sos', { tripId, message }),
};
