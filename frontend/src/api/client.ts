import axios, { type AxiosError } from 'axios';

// Create axios instance
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const client = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
client.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
// LƯU Ý: interceptor refresh-token 401 nằm ở `auth.ts` (setupTokenRefreshInterceptor,
// gọi trong AuthContext) — dùng đúng path `/auth/refresh-token` và lưu lại refreshToken
// mới (BE rotate refresh token). Không lặp lại logic đó ở đây để tránh 2 interceptor
// tranh nhau xử lý cùng 1 lỗi 401.
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network Error: Unable to connect to the API.');
      console.error('Please check if the backend is running on port 5000');
    }

    return Promise.reject(error);
  }
);

export default client;
