import Constants from 'expo-constants';

const fromExtra = (Constants.expoConfig?.extra as any)?.apiBaseUrl as string | undefined;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  fromExtra ||
  'http://localhost:5001/api';
