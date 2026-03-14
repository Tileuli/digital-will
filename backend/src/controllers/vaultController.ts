import { Request, Response } from 'express';
import { Vault } from '../models';
import { encryptVaultData, decryptVaultData } from '../services/encryptionService';

export class VaultController {
  static async createVault(req: Request, res: Response) {
    try {
      const { encrypted_data, metadata } = req.body;

      if (!encrypted_data || typeof encrypted_data !== 'string') {
        return res.status(400).json({ message: 'Vault content is required' });
      }

      const cipherText = encryptVaultData(encrypted_data);

      const vault = await Vault.create({
        user_id: req.user.id,
        encrypted_data: cipherText,
        metadata: metadata || null,
        is_active: true,
        release_triggered: false,
        release_triggered_at: null,
      });

      return res.status(201).json({
        message: 'Vault created successfully',
        vault: {
          id: vault.id,
          user_id: vault.user_id,
          metadata: vault.metadata,
          is_active: vault.is_active,
          release_triggered: vault.release_triggered,
          release_triggered_at: vault.release_triggered_at,
          created_at: vault.created_at,
          updated_at: vault.updated_at,
        },
      });
    } catch (error) {
      console.error('Create vault error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async getVaults(req: Request, res: Response) {
    try {
      const vaults = await Vault.findAll({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']],
      });

      const safeVaults = vaults.map((vault) => ({
        id: vault.id,
        user_id: vault.user_id,
        metadata: vault.metadata,
        is_active: vault.is_active,
        release_triggered: vault.release_triggered,
        release_triggered_at: vault.release_triggered_at,
        created_at: vault.created_at,
        updated_at: vault.updated_at,
      }));

      return res.json({ vaults: safeVaults });
    } catch (error) {
      console.error('Get vaults error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async getVaultById(req: Request, res: Response) {
    try {
      const vault = await Vault.findOne({
        where: {
          id: req.params.id,
          user_id: req.user.id,
        },
      });

      if (!vault) {
        return res.status(404).json({ message: 'Vault not found' });
      }

      let decryptedData: string | null = null;

      try {
        decryptedData = decryptVaultData(vault.encrypted_data);
      } catch (decryptError) {
        console.error('Vault decrypt error:', decryptError);
        return res.status(500).json({ message: 'Failed to decrypt vault data' });
      }

      return res.json({
        vault: {
          id: vault.id,
          user_id: vault.user_id,
          encrypted_data: decryptedData,
          metadata: vault.metadata,
          is_active: vault.is_active,
          release_triggered: vault.release_triggered,
          release_triggered_at: vault.release_triggered_at,
          created_at: vault.created_at,
          updated_at: vault.updated_at,
        },
      });
    } catch (error) {
      console.error('Get vault by id error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async updateVault(req: Request, res: Response) {
    try {
      const vault = await Vault.findOne({
        where: {
          id: req.params.id,
          user_id: req.user.id,
        },
      });

      if (!vault) {
        return res.status(404).json({ message: 'Vault not found' });
      }

      const { encrypted_data, metadata, is_active } = req.body;

      if (typeof encrypted_data === 'string') {
        vault.encrypted_data = encryptVaultData(encrypted_data);
      }

      if (metadata !== undefined) {
        vault.metadata = metadata;
      }

      if (typeof is_active === 'boolean') {
        vault.is_active = is_active;
      }

      await vault.save();

      return res.json({
        message: 'Vault updated successfully',
        vault: {
          id: vault.id,
          user_id: vault.user_id,
          metadata: vault.metadata,
          is_active: vault.is_active,
          release_triggered: vault.release_triggered,
          release_triggered_at: vault.release_triggered_at,
          created_at: vault.created_at,
          updated_at: vault.updated_at,
        },
      });
    } catch (error) {
      console.error('Update vault error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteVault(req: Request, res: Response) {
    try {
      const vault = await Vault.findOne({
        where: {
          id: req.params.id,
          user_id: req.user.id,
        },
      });

      if (!vault) {
        return res.status(404).json({ message: 'Vault not found' });
      }

      await vault.destroy();

      return res.json({ message: 'Vault deleted successfully' });
    } catch (error) {
      console.error('Delete vault error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}