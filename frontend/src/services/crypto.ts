/**
 * WebCrypto-based end-to-end encryption primitives.
 * All operations run in the browser; the server never sees plaintext.
 */
import { argon2id } from 'hash-wasm';

const PBKDF2_ITERATIONS = 200_000;
const RSA_MODULUS_LENGTH = 2048;

// OWASP 2024 recommendation for interactive logins (m=19 MiB, t=2, p=1).
const ARGON2ID_MEMORY_KIB = 19_456;
const ARGON2ID_ITERATIONS = 2;
const ARGON2ID_PARALLELISM = 1;
const ARGON2ID_HASH_LENGTH = 32;

export type KdfAlgorithm = 'pbkdf2' | 'argon2id';

const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
};

const fromB64 = (b64: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const randomBytes = (n: number): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(new ArrayBuffer(n));
  crypto.getRandomValues(bytes);
  return bytes;
};

export type WrappedBlob = { iv: string; ct: string };

export const randomSalt = (bytes = 16): string => toB64(randomBytes(bytes));

/**
 * Derive a 256-bit master key from a password + salt using the specified KDF.
 * Defaults to PBKDF2 for backwards compatibility with old accounts. New
 * registrations and migrations should pass 'argon2id'.
 */
export const deriveMasterKey = async (
  password: string,
  saltB64: string,
  algorithm: KdfAlgorithm = 'pbkdf2'
): Promise<CryptoKey> => {
  if (algorithm === 'argon2id') {
    const raw = await argon2id({
      password,
      salt: fromB64(saltB64),
      parallelism: ARGON2ID_PARALLELISM,
      iterations: ARGON2ID_ITERATIONS,
      memorySize: ARGON2ID_MEMORY_KIB,
      hashLength: ARGON2ID_HASH_LENGTH,
      outputType: 'binary',
    });
    return crypto.subtle.importKey(
      'raw',
      new Uint8Array(raw),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromB64(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
};

export const generateRsaKeyPair = async (): Promise<CryptoKeyPair> => {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: RSA_MODULUS_LENGTH,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
};

export const exportPublicKey = async (key: CryptoKey): Promise<string> => {
  const spki = await crypto.subtle.exportKey('spki', key);
  return toB64(spki);
};

export const importPublicKey = (b64: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'spki',
    fromB64(b64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt', 'wrapKey']
  );

/**
 * Generate a random recovery code in the format `xxxx-xxxx-xxxx-xxxx`
 * (16 hex chars + 3 dashes). Codes are user-entered, so we keep them
 * comfortably typeable.
 */
export const generateRecoveryCode = (): string => {
  const bytes = randomBytes(8); // 8 bytes = 16 hex chars
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return [hex.slice(0, 4), hex.slice(4, 8), hex.slice(8, 12), hex.slice(12, 16)].join('-');
};

/** Normalize a recovery code by stripping dashes and lowercasing. */
export const normalizeRecoveryCode = (code: string): string =>
  code.trim().replace(/[\s-]+/g, '').toLowerCase();

export const wrapPrivateKeyWithMasterKey = async (
  privateKey: CryptoKey,
  masterKey: CryptoKey
): Promise<WrappedBlob> => {
  const iv = randomBytes(12);
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    pkcs8
  );
  return { iv: toB64(iv), ct: toB64(ct) };
};

export const unwrapPrivateKeyWithMasterKey = async (
  wrapped: WrappedBlob,
  masterKey: CryptoKey
): Promise<CryptoKey> => {
  const pkcs8 = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(wrapped.iv) },
    masterKey,
    fromB64(wrapped.ct)
  );
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt', 'unwrapKey']
  );
};

export const generateVaultKey = (): Promise<CryptoKey> =>
  crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

export const encryptJson = async (
  value: unknown,
  vaultKey: CryptoKey
): Promise<string> => {
  const iv = randomBytes(12);
  const pt = new TextEncoder().encode(JSON.stringify(value));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, vaultKey, pt);
  return JSON.stringify({ iv: toB64(iv), ct: toB64(ct) });
};

export const decryptJson = async <T = unknown>(
  envelope: string,
  vaultKey: CryptoKey
): Promise<T> => {
  const { iv, ct } = JSON.parse(envelope) as WrappedBlob;
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(iv) },
    vaultKey,
    fromB64(ct)
  );
  return JSON.parse(new TextDecoder().decode(pt)) as T;
};

export const wrapVaultKeyForOwner = async (
  vaultKey: CryptoKey,
  masterKey: CryptoKey
): Promise<string> => {
  const iv = randomBytes(12);
  const rawKey = await crypto.subtle.exportKey('raw', vaultKey);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    rawKey
  );
  return JSON.stringify({ iv: toB64(iv), ct: toB64(ct) });
};

export const unwrapVaultKeyWithMasterKey = async (
  wrapped: string,
  masterKey: CryptoKey
): Promise<CryptoKey> => {
  const { iv, ct } = JSON.parse(wrapped) as WrappedBlob;
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(iv) },
    masterKey,
    fromB64(ct)
  );
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

export const wrapVaultKeyForRecipient = async (
  vaultKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> => {
  const rawKey = await crypto.subtle.exportKey('raw', vaultKey);
  const ct = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    rawKey
  );
  return toB64(ct);
};

export const unwrapVaultKeyWithRecipientPrivateKey = async (
  wrappedB64: string,
  privateKey: CryptoKey
): Promise<CryptoKey> => {
  const raw = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    fromB64(wrappedB64)
  );
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
};
