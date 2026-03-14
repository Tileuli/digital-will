import api from './api';
import type { Vault, Recipient, CheckinStatus } from '../types';

class VaultService {
  async createVault(vaultData: {
    encrypted_data: string;
    metadata?: {
      title?: string;
      description?: string;
      type?: 'text' | 'file' | 'credentials';
    };
  }) {
    const response = await api.post('/vaults', vaultData);
    return response.data;
  }

  async getVaults(): Promise<{ vaults: Vault[] }> {
    const response = await api.get('/vaults');
    return response.data;
  }

  async getVault(id: string): Promise<{ vault: Vault }> {
    const response = await api.get(`/vaults/${id}`);
    return response.data;
  }

  async updateVault(
    id: string,
    vaultData: Partial<{
      encrypted_data: string;
      metadata: {
        title?: string;
        description?: string;
        type?: 'text' | 'file' | 'credentials';
      };
      is_active: boolean;
    }>
  ) {
    const response = await api.put(`/vaults/${id}`, vaultData);
    return response.data;
  }

  async deleteVault(id: string) {
    const response = await api.delete(`/vaults/${id}`);
    return response.data;
  }

  async addRecipient(recipientData: {
    email: string;
    name: string;
    relationship?: string;
    public_key?: string;
  }) {
    const response = await api.post('/recipients', recipientData);
    return response.data;
  }

  async getRecipients(): Promise<{ recipients: Recipient[] }> {
    const response = await api.get('/recipients');
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