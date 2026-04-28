/**
 * React-Native compatible E2E crypto primitives.
 * Output formats match the web frontend's WebCrypto-based crypto.ts so that
 * vaults created on one platform are decryptable on the other.
 *
 * Uses:
 *  - node-forge for RSA-OAEP (2048) key pair generation and encryption
 *  - @noble/hashes for PBKDF2-SHA256
 *  - @noble/ciphers for AES-256-GCM
 *  - react-native-get-random-values polyfill for crypto.getRandomValues
 */
import forge from 'node-forge';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { argon2id as argon2idHash } from '@noble/hashes/argon2';
import { gcm } from '@noble/ciphers/aes';

const PBKDF2_ITERATIONS = 200_000;
const AES_KEY_LEN = 32;
const IV_LEN = 12;

const ARGON2ID_MEMORY_KIB = 19_456;
const ARGON2ID_ITERATIONS = 2;
const ARGON2ID_PARALLELISM = 1;

export type KdfAlgorithm = 'pbkdf2' | 'argon2id';

export type WrappedBlob = { iv: string; ct: string };

/* ---------- base64 / bytes helpers ---------- */

const b64Chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const toB64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return globalThis.btoa
    ? globalThis.btoa(s)
    : forge.util.encode64(s);
};

const fromB64 = (b64: string): Uint8Array => {
  const bin = globalThis.atob
    ? globalThis.atob(b64)
    : forge.util.decode64(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const bytesToBinary = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
};

const binaryToBytes = (bin: string): Uint8Array => {
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const utf8Encode = (s: string): Uint8Array => {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
  return binaryToBytes(unescape(encodeURIComponent(s)));
};

const utf8Decode = (b: Uint8Array): string => {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(b);
  return decodeURIComponent(escape(bytesToBinary(b)));
};

const randomBytes = (n: number): Uint8Array => {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
};

/* ---------- public API ---------- */

export const randomSalt = (bytes = 16): string => toB64(randomBytes(bytes));

const HEX = '0123456789abcdef';
const bytesToHex = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i++) {
    s += HEX[b[i] >> 4] + HEX[b[i] & 0xf];
  }
  return s;
};

/**
 * Generate a random recovery code in the format `xxxx-xxxx-xxxx-xxxx`
 * (16 hex chars + 3 dashes). Format matches the web frontend.
 */
export const generateRecoveryCode = (): string => {
  const hex = bytesToHex(randomBytes(8));
  return [hex.slice(0, 4), hex.slice(4, 8), hex.slice(8, 12), hex.slice(12, 16)].join('-');
};

/** Strip dashes/whitespace and lowercase. Matches web normalizer. */
export const normalizeRecoveryCode = (code: string): string =>
  code.trim().replace(/[\s-]+/g, '').toLowerCase();

export const deriveMasterKey = async (
  password: string,
  saltB64: string,
  algorithm: KdfAlgorithm = 'pbkdf2'
): Promise<Uint8Array> => {
  const salt = fromB64(saltB64);
  const passBytes = utf8Encode(password);
  if (algorithm === 'argon2id') {
    return argon2idHash(passBytes, salt, {
      t: ARGON2ID_ITERATIONS,
      m: ARGON2ID_MEMORY_KIB,
      p: ARGON2ID_PARALLELISM,
      dkLen: AES_KEY_LEN,
    });
  }
  return pbkdf2(sha256, passBytes, salt, { c: PBKDF2_ITERATIONS, dkLen: AES_KEY_LEN });
};

/* ---------- AES-GCM envelopes ---------- */

const aesEncrypt = (plain: Uint8Array, key: Uint8Array): WrappedBlob => {
  const iv = randomBytes(IV_LEN);
  const ct = gcm(key, iv).encrypt(plain);
  return { iv: toB64(iv), ct: toB64(ct) };
};

const aesDecrypt = (blob: WrappedBlob, key: Uint8Array): Uint8Array => {
  const iv = fromB64(blob.iv);
  const ct = fromB64(blob.ct);
  return gcm(key, iv).decrypt(ct);
};

export const encryptJson = async (value: unknown, vaultKey: Uint8Array): Promise<string> => {
  const plain = utf8Encode(JSON.stringify(value));
  return JSON.stringify(aesEncrypt(plain, vaultKey));
};

export const decryptJson = async <T = unknown>(
  envelope: string,
  vaultKey: Uint8Array
): Promise<T> => {
  const blob = JSON.parse(envelope) as WrappedBlob;
  const pt = aesDecrypt(blob, vaultKey);
  return JSON.parse(utf8Decode(pt)) as T;
};

/* ---------- Vault symmetric key (AES-256) ---------- */

export const generateVaultKey = (): Uint8Array => randomBytes(AES_KEY_LEN);

export const wrapVaultKeyForOwner = async (
  vaultKey: Uint8Array,
  masterKey: Uint8Array
): Promise<string> => JSON.stringify(aesEncrypt(vaultKey, masterKey));

export const unwrapVaultKeyWithMasterKey = async (
  wrapped: string,
  masterKey: Uint8Array
): Promise<Uint8Array> => {
  const blob = JSON.parse(wrapped) as WrappedBlob;
  return aesDecrypt(blob, masterKey);
};

/* ---------- RSA key pair (for recipient key delivery) ---------- */

export type ForgeKeyPair = forge.pki.rsa.KeyPair;

export const generateRsaKeyPair = (): Promise<ForgeKeyPair> =>
  new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 }, (err, kp) => {
      if (err) reject(err);
      else resolve(kp);
    });
  });

const stripPem = (pem: string): string =>
  pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s/g, '');

export const exportPublicKey = async (
  publicKey: forge.pki.rsa.PublicKey
): Promise<string> => {
  // forge.pki.publicKeyToPem emits "-----BEGIN PUBLIC KEY-----" (SPKI DER base64).
  const pem = forge.pki.publicKeyToPem(publicKey);
  return stripPem(pem);
};

export const importPublicKey = async (
  spkiB64: string
): Promise<forge.pki.rsa.PublicKey> => {
  const pem = `-----BEGIN PUBLIC KEY-----\n${spkiB64}\n-----END PUBLIC KEY-----`;
  return forge.pki.publicKeyFromPem(pem) as forge.pki.rsa.PublicKey;
};

/* ---------- Owner's private key wrapped with master key ---------- */

const privateKeyToPkcs8Bytes = (priv: forge.pki.rsa.PrivateKey): Uint8Array => {
  const rsaAsn1 = forge.pki.privateKeyToAsn1(priv);
  const pkcs8Asn1 = forge.pki.wrapRsaPrivateKey(rsaAsn1);
  const der = forge.asn1.toDer(pkcs8Asn1).getBytes();
  return binaryToBytes(der);
};

const pkcs8BytesToPrivateKey = (pkcs8: Uint8Array): forge.pki.rsa.PrivateKey => {
  const asn1 = forge.asn1.fromDer(bytesToBinary(pkcs8));
  // privateKeyFromAsn1 accepts both RSAPrivateKey and PrivateKeyInfo (PKCS8)
  return forge.pki.privateKeyFromAsn1(asn1) as forge.pki.rsa.PrivateKey;
};

export const wrapPrivateKeyWithMasterKey = async (
  privateKey: forge.pki.rsa.PrivateKey,
  masterKey: Uint8Array
): Promise<WrappedBlob> => {
  const pkcs8 = privateKeyToPkcs8Bytes(privateKey);
  return aesEncrypt(pkcs8, masterKey);
};

export const unwrapPrivateKeyWithMasterKey = async (
  wrapped: WrappedBlob,
  masterKey: Uint8Array
): Promise<forge.pki.rsa.PrivateKey> => {
  const pkcs8 = aesDecrypt(wrapped, masterKey);
  return pkcs8BytesToPrivateKey(pkcs8);
};

/* ---------- RSA-OAEP wrap/unwrap vault key for recipient ---------- */

export const wrapVaultKeyForRecipient = async (
  vaultKey: Uint8Array,
  recipientPublicKey: forge.pki.rsa.PublicKey
): Promise<string> => {
  const raw = bytesToBinary(vaultKey);
  const ctStr = recipientPublicKey.encrypt(raw, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() },
  });
  return forge.util.encode64(ctStr);
};

export const unwrapVaultKeyWithRecipientPrivateKey = async (
  wrappedB64: string,
  privateKey: forge.pki.rsa.PrivateKey
): Promise<Uint8Array> => {
  const ctStr = forge.util.decode64(wrappedB64);
  const raw = privateKey.decrypt(ctStr, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() },
  });
  return binaryToBytes(raw);
};
