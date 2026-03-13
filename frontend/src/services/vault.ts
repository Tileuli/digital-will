import api from './api';
import type { Vault, Recipient } from '../types';

class VaultService {
  // Vault операции
  async createVault(vaultData: Partial<Vault>) {
    const response = await api.post('/vaults', vaultData);
    return response.data;
  }

  async getVaults() {
    const response = await api.get('/vaults');
    return response.data;
  }

  async getVault(id: string) {
    const response = await api.get(`/vaults/${id}`);
    return response.data;
  }

  async updateVault(id: string, vaultData: Partial<Vault>) {
    const response = await api.put(`/vaults/${id}`, vaultData);
    return response.data;
  }

  async deleteVault(id: string) {
    const response = await api.delete(`/vaults/${id}`);
    return response.data;
  }

  // Recipient операции
  async addRecipient(recipientData: Partial<Recipient>) {
    const response = await api.post('/recipients', recipientData);
    return response.data;
  }

  async getRecipients() {
    const response = await api.get('/recipients');
    return response.data;
  }

  async deleteRecipient(id: string) {
    const response = await api.delete(`/recipients/${id}`);
    return response.data;
  }

  // Check-in операции
  async checkIn() {
    const response = await api.post('/checkin');
    return response.data;
  }

  async getCheckinHistory() {
    const response = await api.get('/checkin/history');
    return response.data;
  }
}

export default new VaultService();