import api from './api';
import type {
  Vault,
  VaultDetailed,
  VaultPlaintext,
  Recipient,
  CheckinStatus,
} from '../types';
import {
  decryptJson,
  encryptJson,
  generateVaultKey,
  importPublicKey,
  unwrapVaultKeyWithMasterKey,
  wrapVaultKeyForOwner,
  wrapVaultKeyForRecipient,
} from './crypto';
import { getSessionKeys } from './keySession';

const requireSession = () => {
  const keys = getSessionKeys();
  if (!keys) {
    throw new Error(
      'Encryption session is locked. Please log in again to unlock your keys.'
    );
  }
  return keys;
};

const wrapVaultKeyForRecipients = async (
  vaultKey: CryptoKey,
  recipients: Recipient[]
): Promise<{ recipient_id: string; wrapped_key: string }[]> => {
  const out: { recipient_id: string; wrapped_key: string }[] = [];
  for (const r of recipients) {
    if (r.invitation_status !== 'accepted' || !r.public_key) {
      throw new Error(
        `Recipient ${r.email} has not accepted the invitation yet`
      );
    }
    const pub = await importPublicKey(r.public_key);
    const wrapped = await wrapVaultKeyForRecipient(vaultKey, pub);
    out.push({ recipient_id: r.id, wrapped_key: wrapped });
  }
  return out;
};

class VaultService {
  async createVault(
    input: VaultPlaintext,
    recipientIds: string[],
    options: { releaseAt?: string | null } = {}
  ): Promise<{ vault: Vault }> {
    if (!recipientIds || recipientIds.length === 0) {
      throw new Error('Select at least one accepted recipient for this vault');
    }
    const { masterKey } = requireSession();

    const recipientsRes = await api.get('/recipients');
    const allRecipients: Recipient[] = recipientsRes.data.recipients || [];
    const selected = allRecipients.filter((r) => recipientIds.includes(r.id));
    if (selected.length !== recipientIds.length) {
      throw new Error('Some selected recipients were not found');
    }

    const vaultKey = await generateVaultKey();
    const encrypted_data = await encryptJson(input, vaultKey);
    const wrapped_key_owner = await wrapVaultKeyForOwner(vaultKey, masterKey);
    const wrapped_keys = await wrapVaultKeyForRecipients(vaultKey, selected);

    const response = await api.post('/vaults', {
      encrypted_data,
      wrapped_key_owner,
      wrapped_keys,
      metadata: { type: input.type || 'text' },
      ...(options.releaseAt ? { release_at: options.releaseAt } : {}),
    });
    return response.data;
  }

  async getVaults(): Promise<{ vaults: Vault[] }> {
    const response = await api.get('/vaults');
    return response.data;
  }

  async getVaultDetailed(
    id: string
  ): Promise<{ vault: VaultDetailed; plaintext: VaultPlaintext }> {
    const { masterKey } = requireSession();
    const response = await api.get(`/vaults/${id}`);
    const vault: VaultDetailed = response.data.vault;

    const vaultKey = await unwrapVaultKeyWithMasterKey(
      vault.wrapped_key_owner,
      masterKey
    );
    const plaintext = await decryptJson<VaultPlaintext>(
      vault.encrypted_data,
      vaultKey
    );
    return { vault, plaintext };
  }

  async updateVault(
    id: string,
    input: Partial<VaultPlaintext> & { is_active?: boolean }
  ) {
    const { masterKey } = requireSession();

    const { vault, plaintext } = await this.getVaultDetailed(id);
    const merged: VaultPlaintext = {
      title: input.title ?? plaintext.title,
      description: input.description ?? plaintext.description,
      content: input.content ?? plaintext.content,
      type: input.type ?? plaintext.type,
    };

    const vaultKey = await unwrapVaultKeyWithMasterKey(
      vault.wrapped_key_owner,
      masterKey
    );
    const encrypted_data = await encryptJson(merged, vaultKey);

    const response = await api.put(`/vaults/${id}`, {
      encrypted_data,
      ...(typeof input.is_active === 'boolean' && { is_active: input.is_active }),
    });
    return response.data;
  }

  async deleteVault(id: string) {
    const response = await api.delete(`/vaults/${id}`);
    return response.data;
  }

  async addRecipient(data: {
    email: string;
    name: string;
    relationship?: string;
  }) {
    const response = await api.post('/recipients', data);
    return response.data;
  }

  async getRecipients(): Promise<{ recipients: Recipient[] }> {
    const response = await api.get('/recipients');
    return response.data;
  }

  async resendInvitation(id: string) {
    const response = await api.post(`/recipients/${id}/resend-invitation`);
    return response.data;
  }

  async deleteRecipient(id: string) {
    const response = await api.delete(`/recipients/${id}`);
    return response.data;
  }

  async checkIn() {
    const response = await api.post('/checkin', { method: 'manual' });
    return response.data;
  }

  async getCheckinHistory() {
    const response = await api.get('/checkin/history');
    return response.data;
  }

  async getCheckinStatus(): Promise<CheckinStatus> {
    const response = await api.get('/checkin/status');
    return response.data;
  }
}

export default new VaultService();
