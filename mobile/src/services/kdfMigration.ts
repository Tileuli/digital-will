import api from './api';
import {
  deriveMasterKey,
  randomSalt,
  unwrapPrivateKeyWithMasterKey,
  unwrapVaultKeyWithMasterKey,
  wrapPrivateKeyWithMasterKey,
  wrapVaultKeyForOwner,
  type KdfAlgorithm,
  type WrappedBlob,
} from './crypto';
import { setSessionKeys } from './keySession';
import {
  generateAndWrapRecoveryCodes,
  uploadRecoveryCodes,
} from './recovery';
import authService from './auth';
import type { User, Vault, VaultDetailed } from '../types';
import {
  clearBiometricKey,
  isBiometricEnabled,
  storeMasterKeyForBiometric,
} from './biometric';

/**
 * Re-derive the master key with a new KDF, re-wrap the private key AND every
 * owner-side vault key, then upload the lot atomically. Without re-wrapping
 * vault keys the user would lose access to their own vaults the moment the
 * KDF salt changes — invalid GCM tag on every decrypt.
 */
export const upgradeKdf = async (params: {
  password: string;
  newAlgorithm: KdfAlgorithm;
}): Promise<{ recoveryCodes: string[] }> => {
  const user = await authService.getCurrentUser();
  if (!user || !user.kdf_salt || !user.encrypted_private_key) {
    throw new Error('No active session — please sign in again');
  }

  const oldAlgo = ((user.kdf_algorithm as KdfAlgorithm) || 'pbkdf2');
  const oldMaster = await deriveMasterKey(
    params.password,
    user.kdf_salt,
    oldAlgo
  );
  const blob = JSON.parse(user.encrypted_private_key) as WrappedBlob;
  const privateKey = await unwrapPrivateKeyWithMasterKey(blob, oldMaster);

  const newSalt = randomSalt(16);
  const newMaster = await deriveMasterKey(
    params.password,
    newSalt,
    params.newAlgorithm
  );
  const wrappedPrivate = await wrapPrivateKeyWithMasterKey(
    privateKey,
    newMaster
  );

  const vaultsRes = await api.get<{ vaults: Vault[] }>('/vaults');
  const rewrapped: { vault_id: string; wrapped_key_owner: string }[] = [];
  for (const v of vaultsRes.data.vaults || []) {
    const detailed = await api.get<{ vault: VaultDetailed }>(`/vaults/${v.id}`);
    const oldWrapped = detailed.data.vault.wrapped_key_owner;
    const vaultKey = await unwrapVaultKeyWithMasterKey(oldWrapped, oldMaster);
    const newWrapped = await wrapVaultKeyForOwner(vaultKey, newMaster);
    rewrapped.push({ vault_id: v.id, wrapped_key_owner: newWrapped });
  }

  await api.post('/kdf/migrate', {
    password: params.password,
    new_kdf_algorithm: params.newAlgorithm,
    new_kdf_salt: newSalt,
    new_encrypted_private_key: JSON.stringify(wrappedPrivate),
    rewrapped_owner_vault_keys: rewrapped,
  });

  await authService.fetchCurrentUser();
  setSessionKeys({ masterKey: newMaster, privateKey });

  // Re-encrypt the biometric master-key blob with the new master key.
  // If the user previously enabled biometric unlock, refresh it silently.
  try {
    if (await isBiometricEnabled()) {
      await clearBiometricKey(user.id);
      await storeMasterKeyForBiometric(user.id, newMaster);
    }
  } catch (err) {
    console.warn('Failed to refresh biometric key after KDF upgrade:', err);
  }

  let recoveryCodes: string[] = [];
  try {
    const generated = await generateAndWrapRecoveryCodes(
      privateKey,
      10,
      params.newAlgorithm
    );
    await uploadRecoveryCodes(generated.payload);
    recoveryCodes = generated.rawCodes;
  } catch (err) {
    console.warn('Failed to regenerate recovery codes after KDF upgrade:', err);
  }

  return { recoveryCodes };
};

export const currentKdfAlgorithm = async (): Promise<KdfAlgorithm> => {
  const user = (await authService.getCurrentUser()) as User | null;
  return ((user?.kdf_algorithm as KdfAlgorithm) || 'pbkdf2');
};
