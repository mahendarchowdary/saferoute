import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers!.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API functions
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  registerSchool: (data: any) =>
    apiClient.post('/auth/register-school', data),
  getMe: () => apiClient.get('/auth/me'),
};

export const dashboardApi = {
  getStats: () => apiClient.get('/dashboard/stats'),
};

export const busesApi = {
  getAll: () => apiClient.get('/buses'),
  create: (data: any) => apiClient.post('/buses', data),
  update: (id: string, data: any) => apiClient.patch(`/buses/${id}`, data),
  delete: (id: string) => apiClient.delete(`/buses/${id}`),
};

export const driversApi = {
  getAll: () => apiClient.get('/drivers'),
  create: (data: any) => apiClient.post('/drivers', data),
};

export const studentsApi = {
  getAll: () => apiClient.get('/students'),
  create: (data: any) => apiClient.post('/students', data),
  bulkImport: (data: any[]) => apiClient.post('/students/bulk-import', data),
};

export const routesApi = {
  getAll: () => apiClient.get('/routes'),
  create: (data: any) => apiClient.post('/routes', data),
  update: (id: string, data: any) => apiClient.patch(`/routes/${id}`, data),
};

export const tripsApi = {
  getAll: () => apiClient.get('/trips'),
  getActive: () => apiClient.get('/trips/active'),
  getById: (id: string) => apiClient.get(`/trips/${id}`),
  getDriverAttendance: (date: string) => apiClient.get(`/trips/driver-attendance/${date}`),
};

export const alertsApi = {
  getAll: () => apiClient.get('/alerts'),
  resolve: (id: string) => apiClient.patch(`/alerts/${id}/resolve`),
};
