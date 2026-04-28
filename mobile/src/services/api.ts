import axios from 'axios';
import { API_BASE_URL } from '../config';
import { storage } from './storage';

console.log('[api] baseURL =', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Phone-side Argon2id + RSA-2048 keygen can take ~3-10s before the request
  // even starts; combined with Railway cold-start latency, 15s was too tight
  // and timed out *after* the server had already created the account, leaving
  // the user stuck with "verification record not found" on retry.
  timeout: 60000,
});

api.interceptors.request.use(async (config) => {
  console.log('[api] →', config.method?.toUpperCase(), (config.baseURL || '') + (config.url || ''));
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Subscribers get called on 401. Used by RootNavigator to bounce to Login.
 */
type UnauthorizedHandler = () => void;
const handlers: UnauthorizedHandler[] = [];

export const onUnauthorized = (fn: UnauthorizedHandler) => {
  handlers.push(fn);
  return () => {
    const i = handlers.indexOf(fn);
    if (i >= 0) handlers.splice(i, 1);
  };
};

api.interceptors.response.use(
  (response) => {
    console.log('[api] ←', response.status, response.config.url);
    return response;
  },
  async (error) => {
    const url: string = error?.config?.url || '';
    console.log(
      '[api] ✗',
      error?.config?.method?.toUpperCase(),
      url,
      '— status:',
      error?.response?.status,
      '— message:',
      error?.message,
      '— code:',
      error?.code,
    );
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register/') ||
      url.includes('/recovery/');
    if (error?.response?.status === 401 && !isAuthEndpoint) {
      await storage.clearToken();
      await storage.clearUser();
      handlers.forEach((h) => h());
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
