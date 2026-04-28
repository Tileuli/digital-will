import axios from 'axios';

// Базовый URL через proxy
const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register/') ||
      url.includes('/recovery/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err: any, fallback = 'Something went wrong'): string => {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const e = data.errors[0];
    const field = e.path || e.param;
    const msg = e.msg || 'Invalid value';
    if (field === 'password' && /length/i.test(msg)) {
      return 'Password must be at least 8 characters.';
    }
    if (field === 'email') {
      return 'Please enter a valid email address.';
    }
    return field ? `${msg} (${field})` : msg;
  }
  return err?.message || fallback;
};

export default api;