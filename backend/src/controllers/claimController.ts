import { Request, Response } from 'express';
import {
  ReleaseToken,
  Recipient,
  User,
  Vault,
  VaultRecipientKey,
} from '../models';
import { hashToken } from '../services/tokenService';

const findValidReleaseToken = async (rawToken: string) => {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const token = await ReleaseToken.findOne({
    where: { token_hash: hashToken(rawToken) },
  });
  if (!token) return null;
  if (token.expires_at.getTime() < Date.now()) return null;
  return token;
};

export class ClaimController {
  static async getClaim(req: Request, res: Response) {
    try {
      const raw = String(req.query.token || '');
      const releaseToken = await findValidReleaseToken(raw);
      if (!releaseToken) {
        return res.status(404).json({ message: 'Invalid or expired claim token' });
      }

      const recipient = await Recipient.findByPk(releaseToken.recipient_id);
      if (!recipient || recipient.invitation_status !== 'accepted') {
        return res.status(404).json({ message: 'Recipient not ready' });
      }

      const owner = await User.findByPk(releaseToken.user_id);
      if (!owner) return res.status(404).json({ message: 'Owner not found' });

      const wrappedKeys = await VaultRecipientKey.findAll({
        where: { recipient_id: recipient.id },
      });
      const vaultIds = wrappedKeys.map((k) => k.vault_id);
      const vaults = vaultIds.length
        ? await Vault.findAll({
            where: { id: vaultIds, user_id: owner.id, release_triggered: true },
          })
        : [];

      const keysByVault: Record<string, string> = {};
      wrappedKeys.forEach((k) => {
        keysByVault[k.vault_id] = k.wrapped_key;
      });

      return res.json({
        claim: {
          recipient: {
            email: recipient.email,
            name: recipient.name,
            kdf_salt: recipient.kdf_salt,
            encrypted_private_key: recipient.encrypted_private_key,
          },
          owner: {
            name: owner.full_name || owner.email,
            email: owner.email,
          },
          vaults: vaults.map((v) => ({
            id: v.id,
            encrypted_data: v.encrypted_data,
            wrapped_key: keysByVault[v.id],
            metadata: v.metadata,
            release_triggered_at: v.release_triggered_at,
          })),
        },
      });
    } catch (error) {
      console.error('Get claim error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async markClaimed(req: Request, res: Response) {
    try {
      const raw = String(req.body.token || '');
      const releaseToken = await findValidReleaseToken(raw);
      if (!releaseToken) {
        return res.status(404).json({ message: 'Invalid or expired claim token' });
      }
      if (!releaseToken.used_at) {
        releaseToken.used_at = new Date();
        await releaseToken.save();
      }
      const recipient = await Recipient.findByPk(releaseToken.recipient_id);
      if (recipient) {
        recipient.access_granted = true;
        recipient.access_granted_at = releaseToken.used_at || new Date();
        await recipient.save();
      }
      return res.json({ message: 'Claim marked as accessed' });
    } catch (error) {
      console.error('Mark claimed error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
