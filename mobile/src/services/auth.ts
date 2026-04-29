import api from './api';
import { storage } from './storage';
import { clearSessionKeys, setSessionKeys } from './keySession';
import type { AuthResponse, User } from '../types';
import {
  deriveMasterKey,
  exportPublicKey,
  generateRsaKeyPair,
  randomSalt,
  unwrapPrivateKeyWithMasterKey,
  wrapPrivateKeyWithMasterKey,
} from './crypto';
import { clearBiometricKey } from './biometric';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterCompleteData {
  registration_ticket: string;
  password: string;
  full_name?: string;
  phone?: string;
  checkin_interval_days?: number;
}

export interface RegisterResult extends AuthResponse {
  recoveryCodes: string[];
}

class AuthService {
  /* ─── 3-step OTP registration ─── */

  async registerInit(email: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/auth/register/init', {
      email,
    });
    return res.data;
  }

  async registerVerify(
    email: string,
    code: string
  ): Promise<{ message: string; registration_ticket: string }> {
    const res = await api.post<{ message: string; registration_ticket: string }>(
      '/auth/register/verify',
      { email, code }
    );
    return res.data;
  }

  async registerComplete(data: RegisterCompleteData): Promise<RegisterResult> {
    const kdf_algorithm = 'argon2id' as const;
    const kdf_salt = randomSalt(16);
    const masterKey = await deriveMasterKey(data.password, kdf_salt, kdf_algorithm);
    const keyPair = await generateRsaKeyPair();
    const public_key = await exportPublicKey(keyPair.publicKey);
    const wrappedPrivate = await wrapPrivateKeyWithMasterKey(
      keyPair.privateKey,
      masterKey
    );

    const response = await api.post<AuthResponse>('/auth/register/complete', {
      registration_ticket: data.registration_ticket,
      password: data.password,
      full_name: data.full_name,
      phone: data.phone,
      checkin_interval_days: data.checkin_interval_days,
      kdf_salt,
      public_key,
      encrypted_private_key: JSON.stringify(wrappedPrivate),
      kdf_algorithm,
    });

    if (response.data.token) {
      await storage.setToken(response.data.token);
      await storage.setUser(response.data.user);
      setSessionKeys({ masterKey, privateKey: keyPair.privateKey });
    }

    // Recovery codes are intentionally not generated on mobile.
    // The web client uses WebCrypto and can run 10× Argon2id in ~500 ms,
    // but on Expo Go the same work in pure JS pegs the JS thread for 1-4
    // minutes — long enough that React never gets a chance to flush the
    // navigation away from the register screen, even when fired without
    // await. Account recovery on mobile relies on the email-reset flow.
    return { ...response.data, recoveryCodes: [] };
  }

  /* ─── Login (with optional TOTP) ─── */

  async login(
    data: LoginData
  ): Promise<AuthResponse & { totp_required?: boolean; totp_challenge?: string }> {
    const response = await api.post<
      AuthResponse & { totp_required?: boolean; totp_challenge?: string }
    >('/auth/login', data);

    if (response.data.totp_required) {
      // Don't persist anything yet — second step must land first.
      return response.data;
    }

    if (response.data.token) {
      await this.finalizeLogin(response.data, data.password);
    }
    return response.data;
  }

  async verifyLoginTotp(params: {
    totp_challenge: string;
    code: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login/totp', {
      totp_challenge: params.totp_challenge,
      code: params.code,
    });
    if (response.data.token) {
      await this.finalizeLogin(response.data, params.password);
    }
    return response.data;
  }

  private async finalizeLogin(
    payload: AuthResponse,
    password: string
  ): Promise<void> {
    const user = payload.user as User;

    if (user.kdf_salt && user.encrypted_private_key) {
      try {
        const algo = (user.kdf_algorithm as 'pbkdf2' | 'argon2id') || 'pbkdf2';
        const masterKey = await deriveMasterKey(password, user.kdf_salt, algo);
        const privateKey = await unwrapPrivateKeyWithMasterKey(
          JSON.parse(user.encrypted_private_key),
          masterKey
        );
        setSessionKeys({ masterKey, privateKey });
      } catch (err) {
        console.error('Failed to derive keys on login', err);
        throw new Error('Password is correct but decryption key setup failed');
      }
    }

    await storage.setToken(payload.token);
    await storage.setUser(payload.user);
  }

  /* ─── Misc ─── */

  async fetchCurrentUser(): Promise<User> {
    const response = await api.get<{ user: User }>('/auth/me');
    await storage.setUser(response.data.user);
    return response.data.user;
  }

  async logout(): Promise<void> {
    const user = await storage.getUser<User>();
    await storage.clearToken();
    await storage.clearUser();
    clearSessionKeys();
    await clearBiometricKey(user?.id);
  }

  async getCurrentUser(): Promise<User | null> {
    return storage.getUser<User>();
  }

  async getToken(): Promise<string | null> {
    return storage.getToken();
  }

  async isAuthenticated(): Promise<boolean> {
    return !!(await storage.getToken());
  }
}

export default new AuthService();
