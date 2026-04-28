import axios from 'axios';
import api from './api';
import { API_BASE_URL } from '../config';
import {
  deriveMasterKey,
  generateRecoveryCode,
  normalizeRecoveryCode,
  randomSalt,
  unwrapPrivateKeyWithMasterKey,
  wrapPrivateKeyWithMasterKey,
  type KdfAlgorithm,
  type WrappedBlob,
} from './crypto';
import type forge from 'node-forge';

const publicApi = axios.create({
  baseURL: `${API_BASE_URL}/recovery`,
  headers: { 'Content-Type': 'application/json' },
});

export interface CodePayload {
  code_hash_input: string;
  kdf_salt: string;
  encrypted_private_key: string;
  kdf_algorithm: KdfAlgorithm;
}

/**
 * Generate `count` random recovery codes and wrap the user's RSA private key
 * with each one. Returns the raw codes (display once) + server payload.
 */
export const generateAndWrapRecoveryCodes = async (
  privateKey: forge.pki.rsa.PrivateKey,
  count = 10,
  algorithm: KdfAlgorithm = 'argon2id'
): Promise<{
  rawCodes: string[];
  payload: CodePayload[];
}> => {
  const rawCodes: string[] = [];
  const payload: CodePayload[] = [];

  for (let i = 0; i < count; i++) {
    const code = generateRecoveryCode();
    rawCodes.push(code);
    const normalized = normalizeRecoveryCode(code);
    const salt = randomSalt(16);
    const kdfKey = await deriveMasterKey(normalized, salt, algorithm);
    const wrapped = await wrapPrivateKeyWithMasterKey(privateKey, kdfKey);
    payload.push({
      code_hash_input: normalized,
      kdf_salt: salt,
      encrypted_private_key: JSON.stringify(wrapped),
      kdf_algorithm: algorithm,
    });
  }
  return { rawCodes, payload };
};

export const uploadRecoveryCodes = async (
  payload: CodePayload[]
): Promise<{ message: string; count: number }> => {
  const res = await api.post('/recovery/codes', { codes: payload });
  return res.data;
};

export const getRecoveryStatus = async (): Promise<{
  total: number;
  unused: number;
}> => {
  const res = await api.get('/recovery/status');
  return res.data;
};

export interface BeginRecoveryResponse {
  recovery: {
    user_id: string;
    kdf_salt: string;
    encrypted_private_key: string;
    code_id: string;
    kdf_algorithm: KdfAlgorithm;
  };
}

export const beginRecovery = async (
  email: string,
  rawCode: string
): Promise<BeginRecoveryResponse> => {
  const res = await publicApi.post<BeginRecoveryResponse>('/begin', {
    email: email.trim(),
    code: normalizeRecoveryCode(rawCode),
  });
  return res.data;
};

/**
 * Use a recovery code to unlock the private key. Returns the unwrapped
 * private key. This proves the code is correct (we don't strictly need it
 * server-side beyond completeRecovery, but the client uses the unwrapped
 * key to re-wrap with the new master key).
 */
export const unlockWithRecoveryCode = async (
  rawCode: string,
  kdfSalt: string,
  encryptedPrivateKey: string,
  algorithm: KdfAlgorithm = 'pbkdf2'
): Promise<forge.pki.rsa.PrivateKey> => {
  const normalized = normalizeRecoveryCode(rawCode);
  const kdfKey = await deriveMasterKey(normalized, kdfSalt, algorithm);
  const blob = JSON.parse(encryptedPrivateKey) as WrappedBlob;
  return unwrapPrivateKeyWithMasterKey(blob, kdfKey);
};

export const completeRecovery = async (params: {
  email: string;
  rawCode: string;
  newPassword: string;
  privateKey: forge.pki.rsa.PrivateKey;
}): Promise<void> => {
  const newAlgorithm: KdfAlgorithm = 'argon2id';
  const newSalt = randomSalt(16);
  const newMasterKey = await deriveMasterKey(
    params.newPassword,
    newSalt,
    newAlgorithm
  );
  const wrapped = await wrapPrivateKeyWithMasterKey(
    params.privateKey,
    newMasterKey
  );

  // We don't have access to the user's owner-side vault keys (those were
  // wrapped with the OLD master). After recovery, vaults still release to
  // recipients on schedule but the user can no longer view them.
  await publicApi.post('/complete', {
    email: params.email.trim(),
    code: normalizeRecoveryCode(params.rawCode),
    new_password: params.newPassword,
    new_kdf_salt: newSalt,
    new_encrypted_private_key: JSON.stringify(wrapped),
    new_kdf_algorithm: newAlgorithm,
    rewrapped_owner_vault_keys: [],
  });
};
