import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { Vault, VaultRecipientKey, Recipient } from '../models';

type WrappedKeyForRecipient = { recipient_id: string; wrapped_key: string };

const safeVault = (vault: Vault) => ({
  id: vault.id,
  user_id: vault.user_id,
  metadata: vault.metadata,
  is_active: vault.is_active,
  release_triggered: vault.release_triggered,
  release_triggered_at: vault.release_triggered_at,
  release_at: vault.release_at,
  created_at: vault.created_at,
  updated_at: vault.updated_at,
});

export class VaultController {
  static async createVault(req: Request, res: Response) {
    const t = await sequelize.transaction();
    try {
      const { encrypted_data, wrapped_key_owner, wrapped_keys, metadata, release_at } = req.body as {
        encrypted_data: string;
        wrapped_key_owner: string;
        wrapped_keys?: WrappedKeyForRecipient[];
        metadata?: any;
        release_at?: string | null;
      };

      let parsedReleaseAt: Date | null = null;
      if (release_at) {
        const d = new Date(release_at);
        if (isNaN(d.getTime())) {
          await t.rollback();
          return res.status(400).json({
            message: 'release_at must be a valid date',
          });
        }
        if (d.getTime() < Date.now()) {
          await t.rollback();
          return res.status(400).json({
            message: 'release_at must be in the future',
          });
        }
        parsedReleaseAt = d;
      }

      if (!encrypted_data || !wrapped_key_owner) {
        await t.rollback();
        return res.status(400).json({
          message: 'encrypted_data and wrapped_key_owner are required',
        });
      }

      if (!Array.isArray(wrapped_keys) || wrapped_keys.length === 0) {
        await t.rollback();
        return res.status(400).json({
          message: 'At least one accepted recipient is required to create a vault',
        });
      }

      const requestedIds = wrapped_keys.map((k) => k.recipient_id);
      const recipients = await Recipient.findAll({
        where: { id: requestedIds, user_id: req.user.id },
        transaction: t,
      });
      const acceptedIds = new Set(
        recipients
          .filter((r) => r.invitation_status === 'accepted' && r.public_key)
          .map((r) => r.id)
      );

      const invalid = requestedIds.filter((id) => !acceptedIds.has(id));
      if (invalid.length) {
        await t.rollback();
        return res.status(400).json({
          message:
            'All selected recipients must belong to you and have accepted the invitation',
          invalid_recipient_ids: invalid,
        });
      }

      const vault = await Vault.create(
        {
          user_id: req.user.id,
          encrypted_data,
          wrapped_key_owner,
          metadata: metadata || null,
          is_active: true,
          release_triggered: false,
          release_triggered_at: null,
          release_at: parsedReleaseAt,
        },
        { transaction: t }
      );

      const rows = wrapped_keys.map((k) => ({
        vault_id: vault.id,
        recipient_id: k.recipient_id,
        wrapped_key: k.wrapped_key,
      }));
      await VaultRecipientKey.bulkCreate(rows, { transaction: t });

      await t.commit();
      return res.status(201).json({ message: 'Vault created', vault: safeVault(vault) });
    } catch (error) {
      await t.rollback();
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

      return res.json({ vaults: vaults.map(safeVault) });
    } catch (error) {
      console.error('Get vaults error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async getVaultById(req: Request, res: Response) {
    try {
      const vault = await Vault.findOne({
        where: { id: req.params.id, user_id: req.user.id },
      });

      if (!vault) {
        return res.status(404).json({ message: 'Vault not found' });
      }

      const recipientKeys = await VaultRecipientKey.findAll({
        where: { vault_id: vault.id },
        attributes: ['recipient_id'],
      });

      return res.json({
        vault: {
          ...safeVault(vault),
          encrypted_data: vault.encrypted_data,
          wrapped_key_owner: vault.wrapped_key_owner,
          recipient_ids_with_key: recipientKeys.map((r) => r.recipient_id),
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
        where: { id: req.params.id, user_id: req.user.id },
      });

      if (!vault) {
        return res.status(404).json({ message: 'Vault not found' });
      }

      const { encrypted_data, wrapped_key_owner, metadata, is_active } = req.body;

      if (typeof encrypted_data === 'string') vault.encrypted_data = encrypted_data;
      if (typeof wrapped_key_owner === 'string') vault.wrapped_key_owner = wrapped_key_owner;
      if (metadata !== undefined) vault.metadata = metadata;
      if (typeof is_active === 'boolean') vault.is_active = is_active;

      await vault.save();
      return res.json({ message: 'Vault updated', vault: safeVault(vault) });
    } catch (error) {
      console.error('Update vault error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteVault(req: Request, res: Response) {
    try {
      const vault = await Vault.findOne({
        where: { id: req.params.id, user_id: req.user.id },
      });

      if (!vault) {
        return res.status(404).json({ message: 'Vault not found' });
      }

      await VaultRecipientKey.destroy({ where: { vault_id: vault.id } });
      await vault.destroy();

      return res.json({ message: 'Vault deleted' });
    } catch (error) {
      console.error('Delete vault error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async syncRecipientKeys(req: Request, res: Response) {
    try {
      const { vault_id } = req.params;
      const { wrapped_keys } = req.body as { wrapped_keys: WrappedKeyForRecipient[] };

      const vault = await Vault.findOne({
        where: { id: vault_id, user_id: req.user.id },
      });
      if (!vault) return res.status(404).json({ message: 'Vault not found' });

      if (!Array.isArray(wrapped_keys)) {
        return res.status(400).json({ message: 'wrapped_keys array required' });
      }

      const recipients = await Recipient.findAll({
        where: { id: wrapped_keys.map((k) => k.recipient_id), user_id: req.user.id },
      });
      const validIds = new Set(recipients.map((r) => r.id));

      for (const k of wrapped_keys) {
        if (!validIds.has(k.recipient_id)) continue;
        await VaultRecipientKey.upsert({
          vault_id: vault.id,
          recipient_id: k.recipient_id,
          wrapped_key: k.wrapped_key,
        });
      }

      return res.json({ message: 'Recipient keys synced' });
    } catch (error) {
      console.error('Sync recipient keys error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}
