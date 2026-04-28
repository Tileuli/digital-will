import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'dw.token';
const USER_KEY = 'dw.user';

export const storage = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async clearToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
  async getUser<T = unknown>(): Promise<T | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async setUser(user: unknown): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async clearUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },
};
