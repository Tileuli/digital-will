import { describe, it, expect, beforeAll } from 'vitest';
import {
  randomSalt,
  deriveMasterKey,
  generateRsaKeyPair,
  exportPublicKey,
  importPublicKey,
  wrapPrivateKeyWithMasterKey,
  unwrapPrivateKeyWithMasterKey,
  generateVaultKey,
  encryptJson,
  decryptJson,
  wrapVaultKeyForOwner,
  unwrapVaultKeyWithMasterKey,
  wrapVaultKeyForRecipient,
  unwrapVaultKeyWithRecipientPrivateKey,
} from '../crypto';

beforeAll(() => {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    // Node 18 — pull WebCrypto into the global scope
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { webcrypto } = require('node:crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
  }
});

const PASSWORD = 'correct horse battery staple';
const WRONG = 'wrong horse stapled battery';

describe('PBKDF2 master key derivation', () => {
  it('produces the same key for the same password+salt', async () => {
    const salt = randomSalt(16);
    const k1 = await deriveMasterKey(PASSWORD, salt);
    const k2 = await deriveMasterKey(PASSWORD, salt);

    // Round-trip an envelope to prove keys are functionally equal
    const enc = await encryptJson({ a: 1 }, k1 as any);
    // @ts-expect-error masterKey can be reused as AES-GCM key here
    const dec = await decryptJson<{ a: number }>(enc, k2);
    expect(dec).toEqual({ a: 1 });
  });

  it('produces different keys for different passwords', async () => {
    const salt = randomSalt(16);
    const right = await deriveMasterKey(PASSWORD, salt);
    const wrong = await deriveMasterKey(WRONG, salt);

    const env = await encryptJson({ a: 1 }, right as any);
    await expect(
      // @ts-expect-error reuse as AES-GCM key
      decryptJson(env, wrong)
    ).rejects.toBeTruthy();
  });
});

describe('RSA private key wrapping with master key', () => {
  it('round-trips: derive → generate keypair → wrap → unwrap → use', async () => {
    const salt = randomSalt(16);
    const master = await deriveMasterKey(PASSWORD, salt);
    const kp = await generateRsaKeyPair();

    const wrapped = await wrapPrivateKeyWithMasterKey(kp.privateKey, master);
    const recovered = await unwrapPrivateKeyWithMasterKey(wrapped, master);

    // Use the recovered key in an RSA round-trip via a wrapped vault key
    const vaultKey = await generateVaultKey();
    const cipher = await wrapVaultKeyForRecipient(vaultKey, kp.publicKey);
    const back = await unwrapVaultKeyWithRecipientPrivateKey(cipher, recovered);

    const env = await encryptJson({ secret: 'hi' }, vaultKey);
    const dec = await decryptJson<{ secret: string }>(env, back);
    expect(dec.secret).toBe('hi');
  });

  it('fails to unwrap private key with wrong password', async () => {
    const salt = randomSalt(16);
    const master = await deriveMasterKey(PASSWORD, salt);
    const wrong = await deriveMasterKey(WRONG, salt);
    const kp = await generateRsaKeyPair();
    const wrapped = await wrapPrivateKeyWithMasterKey(kp.privateKey, master);

    await expect(
      unwrapPrivateKeyWithMasterKey(wrapped, wrong)
    ).rejects.toBeTruthy();
  });
});

describe('Public key export / import', () => {
  it('round-trips and yields a usable encryption key', async () => {
    const kp = await generateRsaKeyPair();
    const exported = await exportPublicKey(kp.publicKey);
    const imported = await importPublicKey(exported);

    const vaultKey = await generateVaultKey();
    const wrapped = await wrapVaultKeyForRecipient(vaultKey, imported);
    const unwrapped = await unwrapVaultKeyWithRecipientPrivateKey(
      wrapped,
      kp.privateKey
    );

    const env = await encryptJson({ ok: true }, vaultKey);
    const dec = await decryptJson<{ ok: boolean }>(env, unwrapped);
    expect(dec).toEqual({ ok: true });
  });
});

describe('Vault content encryption (AES-GCM)', () => {
  it('round-trips arbitrary JSON', async () => {
    const key = await generateVaultKey();
    const payload = {
      title: 'Letter',
      content: 'Привет, это секрет',
      attachments: [{ filename: 'photo.jpg', size: 1234 }],
    };
    const env = await encryptJson(payload, key);
    const back = await decryptJson<typeof payload>(env, key);
    expect(back).toEqual(payload);
  });

  it('encryption is non-deterministic (random IV per call)', async () => {
    const key = await generateVaultKey();
    const a = await encryptJson({ x: 1 }, key);
    const b = await encryptJson({ x: 1 }, key);
    expect(a).not.toBe(b);
  });

  it('rejects ciphertext encrypted with a different key', async () => {
    const k1 = await generateVaultKey();
    const k2 = await generateVaultKey();
    const env = await encryptJson({ x: 1 }, k1);
    await expect(decryptJson(env, k2)).rejects.toBeTruthy();
  });
});

describe('Owner-side vault key wrapping (AES wrap)', () => {
  it('round-trips via master key', async () => {
    const salt = randomSalt(16);
    const master = await deriveMasterKey(PASSWORD, salt);
    const vk = await generateVaultKey();

    const wrapped = await wrapVaultKeyForOwner(vk, master);
    const recovered = await unwrapVaultKeyWithMasterKey(wrapped, master);

    const env = await encryptJson({ a: 'b' }, vk);
    const dec = await decryptJson<{ a: string }>(env, recovered);
    expect(dec).toEqual({ a: 'b' });
  });
});

describe('End-to-end recipient flow', () => {
  it('owner encrypts vault → recipient unwraps with passphrase → reads plaintext', async () => {
    // Owner side
    const ownerSalt = randomSalt(16);
    const ownerMaster = await deriveMasterKey('owner-pass', ownerSalt);
    const ownerKp = await generateRsaKeyPair();
    const ownerPublicExport = await exportPublicKey(ownerKp.publicKey);

    // Recipient sets up their own keypair
    const recipientSalt = randomSalt(16);
    const recipientPassphrase = 'recipient-pass-1234';
    const recipientMaster = await deriveMasterKey(
      recipientPassphrase,
      recipientSalt
    );
    const recipientKp = await generateRsaKeyPair();
    const recipientPublicExport = await exportPublicKey(recipientKp.publicKey);
    const recipientWrappedPrivate = await wrapPrivateKeyWithMasterKey(
      recipientKp.privateKey,
      recipientMaster
    );

    // Owner imports recipient's public key (server -> client) and creates vault
    const recipientPub = await importPublicKey(recipientPublicExport);
    const vaultKey = await generateVaultKey();
    const ciphertext = await encryptJson(
      { title: 'Letter', content: 'final message' },
      vaultKey
    );
    const wrappedForRecipient = await wrapVaultKeyForRecipient(
      vaultKey,
      recipientPub
    );

    // Sanity: owner is unrelated to this — confirm the export string parses
    expect(ownerPublicExport.length).toBeGreaterThan(100);

    // Day of release: recipient logs in, derives their master, unwraps private key,
    // then unwraps vault key, then decrypts ciphertext.
    const masterAgain = await deriveMasterKey(
      recipientPassphrase,
      recipientSalt
    );
    const recPriv = await unwrapPrivateKeyWithMasterKey(
      recipientWrappedPrivate,
      masterAgain
    );
    const vk = await unwrapVaultKeyWithRecipientPrivateKey(
      wrappedForRecipient,
      recPriv
    );
    const plaintext = await decryptJson<{ title: string; content: string }>(
      ciphertext,
      vk
    );

    expect(plaintext.title).toBe('Letter');
    expect(plaintext.content).toBe('final message');
  });

  it('recipient with wrong passphrase cannot unwrap private key', async () => {
    const salt = randomSalt(16);
    const right = await deriveMasterKey('right', salt);
    const wrong = await deriveMasterKey('wrong', salt);
    const kp = await generateRsaKeyPair();
    const wrapped = await wrapPrivateKeyWithMasterKey(kp.privateKey, right);

    await expect(
      unwrapPrivateKeyWithMasterKey(wrapped, wrong)
    ).rejects.toBeTruthy();
  });
});
