import { Request, Response } from 'express';
import { Vault } from '../models';

export class VaultController {
  // Создание сейфа
  static async createVault(req: Request, res: Response) {
    try {
      const { encrypted_data, metadata } = req.body;

      const vault = await Vault.create({
        user_id: req.user.id,
        encrypted_data,
        metadata: metadata || {},
        is_active: true,
        release_triggered: false,
      });

      res.status(201).json({
        message: 'Vault created successfully',
        vault,
      });
    } catch (error) {
      console.error('Create vault error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Получение всех сейфов пользователя
  static async getVaults(req: Request, res: Response) {
    try {
      const vaults = await Vault.findAll({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']],
      });

      res.json({ vaults });
    } catch (error) {
      console.error('Get vaults error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Получение конкретного сейфа
  static async getVault(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vault = await Vault.findOne({
        where: { id, user_id: req.user.id },
      });

      if (!vault) {
        return res.status(404).json({ message: 'Vault not found' });
      }

      res.json({ vault });
    } catch (error) {
      console.error('Get vault error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Обновление сейфа
  static async updateVault(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { encrypted_data, metadata, is_active } = req.body;

      const vault = await Vault.findOne({
        where: { id, user_id: req.user.id },
      });

      if (!vault) {
        return res.status(404).json({ message: 'Vault not found' });
      }

      // Обновляем только разрешенные поля
      if (encrypted_data !== undefined) vault.encrypted_data = encrypted_data;
      if (metadata !== undefined) vault.metadata = metadata;
      if (is_active !== undefined) vault.is_active = is_active;

      await vault.save();

      res.json({
        message: 'Vault updated successfully',
        vault,
      });
    } catch (error) {
      console.error('Update vault error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Удаление сейфа
  static async deleteVault(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vault = await Vault.findOne({
        where: { id, user_id: req.user.id },
      });

      if (!vault) {
        return res.status(404).json({ message: 'Vault not found' });
      }

      await vault.destroy();

      res.json({ message: 'Vault deleted successfully' });
    } catch (error) {
      console.error('Delete vault error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}