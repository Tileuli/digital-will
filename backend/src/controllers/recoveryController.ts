import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database';
import { RecoveryCode, User } from '../models';
import { hashToken } from '../services/tokenService';

type WrappedCode = {
  code_hash_input: string; // raw recovery code, hashed server-side via SHA-256
  kdf_salt: string;
  encrypted_private_key: string; // wrapped blob (JSON string)
  kdf_algorithm?: 'pbkdf2' | 'argon2id';
};

/**
 * Recovery codes work like this:
 *  - Client generates 10 random codes (e.g. "abc1-def2-ghi3-jkl4")
 *  - For each code, client derives a KDF key with a fresh salt and uses it
 *    to wrap the user's RSA private key. Server stores: SHA-256(code), salt, blob.
 *  - On recovery, user pastes a code → server returns the matching salt + blob
 *  - Client derives KDF, unwraps private key, then user picks a new password
 *  - Client re-wraps everything (private key + every owner-side vault key) with
 *    the new master key derived from the new password.
 */
export class RecoveryController {
  /**
   * Replace all of the user's recovery codes. Called either right after register
   * (so the user can save them) or from settings to rotate.
   * Body: { codes: WrappedCode[] }
   */
  static async setCodes(req: Request, res: Response) {
    const t = await sequelize.transaction();
    try {
      const { codes } = req.body as { codes: WrappedCode[] };
      if (!Array.isArray(codes) || codes.length === 0 || codes.length > 20) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: 'codes must be a non-empty array (max 20)' });
      }

      for (const c of codes) {
        if (!c.code_hash_input || !c.kdf_salt || !c.encrypted_private_key) {
          await t.rollback();
          return res.status(400).json({
            message:
              'Each code requires code_hash_input, kdf_salt and encrypted_private_key',
          });
        }
      }

      await RecoveryCode.destroy({
        where: { user_id: req.user.id },
        transaction: t,
      });

      await RecoveryCode.bulkCreate(
        codes.map((c) => ({
          user_id: req.user.id,
          code_hash: hashToken(c.code_hash_input),
          kdf_salt: c.kdf_salt,
          encrypted_private_key: c.encrypted_private_key,
          kdf_algorithm: c.kdf_algorithm === 'argon2id' ? 'argon2id' : 'pbkdf2',
        })),
        { transaction: t }
      );

      await t.commit();
      return res.json({
        message: 'Recovery codes saved',
        count: codes.length,
      });
    } catch (error) {
      await t.rollback();
      console.error('Set recovery codes error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /** Number of unused codes remaining for the authed user. */
  static async status(req: Request, res: Response) {
    try {
      const total = await RecoveryCode.count({
        where: { user_id: req.user.id },
      });
      const unused = await RecoveryCode.count({
        where: { user_id: req.user.id, used_at: null },
      });
      return res.json({ total, unused });
    } catch (error) {
      console.error('Recovery status error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Public — first step of recovery. Body: { email, code }
   * Returns the wrapped private key + KDF salt for the matching unused code,
   * and the user_id (so the second step can be tied together). On purpose we
   * do NOT differentiate "user not found" vs "code not found" in errors.
   */
  static async beginRecovery(req: Request, res: Response) {
    try {
      const { email, code } = req.body as { email?: string; code?: string };
      if (!email || !code) {
        return res
          .status(400)
          .json({ message: 'Email and recovery code are required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await User.findOne({ where: { email: normalizedEmail } });

      const codeHash = hashToken(code.trim());
      const recoveryCode = user
        ? await RecoveryCode.findOne({
            where: { user_id: user.id, code_hash: codeHash, used_at: null },
          })
        : null;

      if (!user || !recoveryCode) {
        return res
          .status(401)
          .json({ message: 'Invalid email or recovery code' });
      }

      return res.json({
        recovery: {
          user_id: user.id,
          kdf_salt: recoveryCode.kdf_salt,
          encrypted_private_key: recoveryCode.encrypted_private_key,
          code_id: recoveryCode.id,
          kdf_algorithm: recoveryCode.kdf_algorithm,
        },
      });
    } catch (error) {
      console.error('Begin recovery error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Public — second step. The client has unwrapped the private key with the
   * recovery code, picked a new password, derived a new master key, and is
   * uploading the new wrapped artifacts. We update the user's auth and
   * crypto material atomically and burn ALL recovery codes.
   *
   * Body: {
   *   email, code,
   *   new_password,
   *   new_kdf_salt,
   *   new_encrypted_private_key,    // private key wrapped with new master
   *   rewrapped_owner_vault_keys: { vault_id, wrapped_key_owner }[]
   * }
   */
  static async completeRecovery(req: Request, res: Response) {
    const t = await sequelize.transaction();
    try {
      const {
        email,
        code,
        new_password,
        new_kdf_salt,
        new_encrypted_private_key,
        new_kdf_algorithm,
        rewrapped_owner_vault_keys,
      } = req.body as {
        email?: string;
        code?: string;
        new_password?: string;
        new_kdf_salt?: string;
        new_encrypted_private_key?: string;
        new_kdf_algorithm?: 'pbkdf2' | 'argon2id';
        rewrapped_owner_vault_keys?: { vault_id: string; wrapped_key_owner: string }[];
      };

      if (
        !email ||
        !code ||
        !new_password ||
        !new_kdf_salt ||
        !new_encrypted_private_key
      ) {
        await t.rollback();
        return res.status(400).json({ message: 'Missing required fields' });
      }
      if (new_password.length < 8) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: 'Password must be at least 8 characters' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await User.findOne({
        where: { email: normalizedEmail },
        transaction: t,
      });

      const codeHash = hashToken(code.trim());
      const recoveryCode = user
        ? await RecoveryCode.findOne({
            where: { user_id: user.id, code_hash: codeHash, used_at: null },
            transaction: t,
          })
        : null;

      if (!user || !recoveryCode) {
        await t.rollback();
        return res
          .status(401)
          .json({ message: 'Invalid email or recovery code' });
      }

      user.password_hash = await bcrypt.hash(new_password, 10);
      user.kdf_salt = new_kdf_salt;
      user.encrypted_private_key = new_encrypted_private_key;
      if (new_kdf_algorithm === 'argon2id' || new_kdf_algorithm === 'pbkdf2') {
        user.kdf_algorithm = new_kdf_algorithm;
      }
      await user.save({ transaction: t });

      // Update each vault's owner-side wrapped key so the user can keep using them
      if (Array.isArray(rewrapped_owner_vault_keys)) {
        const { Vault } = await import('../models');
        for (const r of rewrapped_owner_vault_keys) {
          if (!r.vault_id || !r.wrapped_key_owner) continue;
          await Vault.update(
            { wrapped_key_owner: r.wrapped_key_owner },
            { where: { id: r.vault_id, user_id: user.id }, transaction: t }
          );
        }
      }

      // Burn ALL recovery codes (one was used; the rest were issued under the
      // old master and would no longer be valid).
      await RecoveryCode.destroy({
        where: { user_id: user.id },
        transaction: t,
      });

      await t.commit();
      return res.json({ message: 'Recovery complete. Please log in.' });
    } catch (error) {
      await t.rollback();
      console.error('Complete recovery error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}
