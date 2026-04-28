import api from './api';
import {
  deriveMasterKey,
  randomSalt,
  unwrapPrivateKeyWithMasterKey,
  unwrapVaultKeyWithMasterKey,
  wrapPrivateKeyWithMasterKey,
  wrapVaultKeyForOwner,
  type KdfAlgorithm,
} from './crypto';
import { setSessionKeys } from './keySession';
import {
  generateAndWrapRecoveryCodes,
  uploadRecoveryCodes,
} from './recovery';
import authService from './auth';
import type { User, Vault, VaultDetailed } from '../types';

/**
 * Re-derive the master key with a new KDF, re-wrap the private key AND every
 * owner-side vault key, then upload the lot atomically. Without re-wrapping
 * vault keys the user would lose access to their own vaults the moment the
 * KDF salt changes — invalid GCM tag on every decrypt.
 *
 * Returns the new recovery codes the user should save.
 */
export const upgradeKdf = async (params: {
  password: string;
  newAlgorithm: KdfAlgorithm;
}): Promise<{ recoveryCodes: string[] }> => {
  const user = authService.getCurrentUser();
  if (!user || !user.kdf_salt || !user.encrypted_private_key) {
    throw new Error('No active session — please sign in again');
  }

  // 1. Re-derive OLD master to unwrap private key + owner vault keys.
  const oldAlgo = (user.kdf_algorithm || 'pbkdf2') as KdfAlgorithm;
  const oldMaster = await deriveMasterKey(
    params.password,
    user.kdf_salt,
    oldAlgo
  );
  const privateKey = await unwrapPrivateKeyWithMasterKey(
    JSON.parse(user.encrypted_private_key),
    oldMaster
  );

  // 2. Derive NEW master with new algorithm + fresh salt.
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

  // 3. Re-wrap every owner-side vault key with the NEW master.
  const vaultsRes = await api.get<{ vaults: Vault[] }>('/vaults');
  const rewrapped: { vault_id: string; wrapped_key_owner: string }[] = [];
  for (const v of vaultsRes.data.vaults || []) {
    const detailed = await api.get<{ vault: VaultDetailed }>(`/vaults/${v.id}`);
    const oldWrapped = detailed.data.vault.wrapped_key_owner;
    const vaultKey = await unwrapVaultKeyWithMasterKey(oldWrapped, oldMaster);
    const newWrapped = await wrapVaultKeyForOwner(vaultKey, newMaster);
    rewrapped.push({ vault_id: v.id, wrapped_key_owner: newWrapped });
  }

  // 4. Send to backend (it stores new salt + algo + wrapped key, requires password).
  await api.post('/kdf/migrate', {
    password: params.password,
    new_kdf_algorithm: params.newAlgorithm,
    new_kdf_salt: newSalt,
    new_encrypted_private_key: JSON.stringify(wrappedPrivate),
    rewrapped_owner_vault_keys: rewrapped,
  });

  // 4. Update local cached user + session keys.
  const refreshed = await authService.fetchCurrentUser();
  setSessionKeys({ masterKey: newMaster, privateKey });

  // 5. Re-issue recovery codes with the new algorithm.
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

  void refreshed;

  return { recoveryCodes };
};

export const currentKdfAlgorithm = (): KdfAlgorithm => {
  const user = authService.getCurrentUser() as User | null;
  return (user?.kdf_algorithm || 'pbkdf2') as KdfAlgorithm;
};
