import api from './api';
import type { AuthResponse, User } from '../types';
import {
  deriveMasterKey,
  exportPublicKey,
  generateRsaKeyPair,
  randomSalt,
  unwrapPrivateKeyWithMasterKey,
  wrapPrivateKeyWithMasterKey,
} from './crypto';
import { clearSessionKeys, setSessionKeys } from './keySession';
import {
  generateAndWrapRecoveryCodes,
  uploadRecoveryCodes,
} from './recovery';

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
  async registerInit(email: string): Promise<{ message: string }> {
    const res = await api.post('/auth/register/init', { email });
    return res.data;
  }

  async registerVerify(
    email: string,
    code: string
  ): Promise<{ message: string; registration_ticket: string }> {
    const res = await api.post('/auth/register/verify', { email, code });
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

    const response = await api.post('/auth/register/complete', {
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

    let recoveryCodes: string[] = [];

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setSessionKeys({ masterKey, privateKey: keyPair.privateKey });

      try {
        const generated = await generateAndWrapRecoveryCodes(
          keyPair.privateKey,
          10,
          kdf_algorithm
        );
        await uploadRecoveryCodes(generated.payload);
        recoveryCodes = generated.rawCodes;
      } catch (err) {
        console.warn('Failed to generate recovery codes during register:', err);
      }
    }

    return { ...response.data, recoveryCodes };
  }

  async login(data: LoginData): Promise<AuthResponse & { totp_required?: boolean; totp_challenge?: string }> {
    const response = await api.post('/auth/login', data);

    if (response.data.totp_required) {
      // Don't persist anything yet — the second step needs to land first.
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
    const response = await api.post('/auth/login/totp', {
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
        const algo = user.kdf_algorithm || 'pbkdf2';
        const masterKey = await deriveMasterKey(password, user.kdf_salt, algo);
        const privateKey = await unwrapPrivateKeyWithMasterKey(
          JSON.parse(user.encrypted_private_key),
          masterKey
        );
        setSessionKeys({ masterKey, privateKey });
      } catch (err) {
        console.error('Failed to derive keys on login', err);
        clearSessionKeys();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error('Password is correct but decryption key setup failed');
      }
    }

    localStorage.setItem('token', payload.token);
    localStorage.setItem('user', JSON.stringify(payload.user));
  }

  async fetchCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    const user = response.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearSessionKeys();
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

}

export default new AuthService();
