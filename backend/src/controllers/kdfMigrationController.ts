import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { RecoveryCode, User, Vault } from '../models';

/**
 * Upgrade a user from PBKDF2 → Argon2id (or any algorithm switch).
 *
 * The client has already:
 *   - re-derived the OLD master key (to unwrap private key + owner vault keys)
 *   - derived a NEW master key with the new algorithm/salt
 *   - re-wrapped the private key + every owner-side vault key
 *   - re-issued recovery codes (server side, the client uploaded them via /recovery/codes)
 *
 * This endpoint only commits the new crypto material atomically. We require the
 * current password as a defence-in-depth check (so a session-hijacked attacker
 * can't silently re-key the account).
 *
 * Body: {
 *   password (current),
 *   new_kdf_algorithm: 'argon2id' | 'pbkdf2',
 *   new_kdf_salt,
 *   new_encrypted_private_key,
 *   rewrapped_owner_vault_keys: { vault_id, wrapped_key_owner }[]
 * }
 */
export class KdfMigrationController {
  static async migrate(req: Request, res: Response) {
    const t = await sequelize.transaction();
    try {
      const {
        password,
        new_kdf_algorithm,
        new_kdf_salt,
        new_encrypted_private_key,
        rewrapped_owner_vault_keys,
      } = req.body as {
        password?: string;
        new_kdf_algorithm?: 'argon2id' | 'pbkdf2';
        new_kdf_salt?: string;
        new_encrypted_private_key?: string;
        rewrapped_owner_vault_keys?: {
          vault_id: string;
          wrapped_key_owner: string;
        }[];
      };

      if (!password || !new_kdf_salt || !new_encrypted_private_key) {
        await t.rollback();
        return res.status(400).json({ message: 'Missing required fields' });
      }
      if (new_kdf_algorithm !== 'argon2id' && new_kdf_algorithm !== 'pbkdf2') {
        await t.rollback();
        return res
          .status(400)
          .json({ message: 'new_kdf_algorithm must be argon2id or pbkdf2' });
      }

      const user = await User.findByPk(req.user.id, { transaction: t });
      if (!user) {
        await t.rollback();
        return res.status(404).json({ message: 'User not found' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        await t.rollback();
        return res.status(401).json({ message: 'Incorrect password' });
      }

      user.kdf_algorithm = new_kdf_algorithm;
      user.kdf_salt = new_kdf_salt;
      user.encrypted_private_key = new_encrypted_private_key;
      await user.save({ transaction: t });

      if (Array.isArray(rewrapped_owner_vault_keys)) {
        for (const r of rewrapped_owner_vault_keys) {
          if (!r.vault_id || !r.wrapped_key_owner) continue;
          await Vault.update(
            { wrapped_key_owner: r.wrapped_key_owner },
            {
              where: { id: r.vault_id, user_id: user.id },
              transaction: t,
            }
          );
        }
      }

      // Burn old recovery codes — client should have re-issued already via
      // /recovery/codes (which itself replaces all codes), but if they didn't,
      // we burn here so old PBKDF2-wrapped codes aren't usable post-migration.
      await RecoveryCode.destroy({
        where: {
          user_id: user.id,
          kdf_algorithm: { [Op.ne]: new_kdf_algorithm },
        },
        transaction: t,
      });

      await t.commit();
      return res.json({
        message: 'KDF upgraded',
        kdf_algorithm: new_kdf_algorithm,
      });
    } catch (error) {
      await t.rollback();
      console.error('KDF migration error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}
