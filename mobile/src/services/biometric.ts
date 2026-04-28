/**
 * Biometric unlock for the master key.
 *
 * Architecture:
 *  - We do an explicit LocalAuthentication.authenticateAsync() biometric
 *    prompt at the JS layer BEFORE reading or writing the key.
 *  - The master key is stored in expo-secure-store under a per-user item.
 *    We deliberately do NOT pass `requireAuthentication: true` because that
 *    requires the bundle's Info.plist to declare NSFaceIDUsageDescription
 *    (and a configured plugin), which is not the case in Expo Go.
 *  - On logout, account change, or password change we wipe the blob.
 *  - The user's bcrypt password hash on the server still gates new sessions.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREF_KEY = 'dw.biometric.enabled';
const masterKeyKey = (userId: string) => `dw_mk_${userId}`;

/* ───── Capability ───── */

export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    if (!hardware) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return !!enrolled;
  } catch {
    return false;
  }
};

export const getSupportedBiometricLabel = async (): Promise<string> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
  } catch {}
  return 'Biometrics';
};

/* ───── Preference flag (cleared on logout) ───── */

export const isBiometricEnabled = async (): Promise<boolean> => {
  return (await AsyncStorage.getItem(PREF_KEY)) === '1';
};

const setBiometricEnabledFlag = async (on: boolean): Promise<void> => {
  if (on) {
    await AsyncStorage.setItem(PREF_KEY, '1');
  } else {
    await AsyncStorage.removeItem(PREF_KEY);
  }
};

/* ───── Auth prompt ───── */

export const promptBiometric = async (
  reason = 'Unlock Digital Will'
): Promise<{ ok: boolean; error?: string }> => {
  // Allow OS to fall back to device passcode when biometric is unavailable.
  // In Expo Go, NSFaceIDUsageDescription is not declared in the host bundle,
  // so iOS rejects Face ID requests with `missing_usage_description` — the
  // passcode fallback is the only way to unlock there. In a development /
  // production build the expo-secure-store plugin sets that key correctly
  // and Face ID/Touch ID is used directly without falling through.
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  if (result.success) return { ok: true };
  return { ok: false, error: (result as any).error };
};

/* ───── Master key storage ───── */

const toB64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return globalThis.btoa(s);
};

const fromB64 = (b64: string): Uint8Array => {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export const storeMasterKeyForBiometric = async (
  userId: string,
  masterKey: Uint8Array
): Promise<void> => {
  await SecureStore.setItemAsync(masterKeyKey(userId), toB64(masterKey), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await setBiometricEnabledFlag(true);
};

export const loadMasterKeyWithBiometric = async (
  userId: string
): Promise<Uint8Array | null> => {
  const auth = await promptBiometric('Unlock Digital Will');
  if (!auth.ok) return null;
  try {
    const b64 = await SecureStore.getItemAsync(masterKeyKey(userId));
    if (!b64) return null;
    return fromB64(b64);
  } catch {
    return null;
  }
};

export const clearBiometricKey = async (userId?: string): Promise<void> => {
  if (userId) {
    try {
      await SecureStore.deleteItemAsync(masterKeyKey(userId));
    } catch {}
  }
  await setBiometricEnabledFlag(false);
};
