import { Request, Response } from 'express';
import { Recipient, User } from '../models';
import { generateToken, hashToken } from '../services/tokenService';

const findValidInvitation = async (rawToken: string) => {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const recipient = await Recipient.findOne({
    where: { invitation_token_hash: hashToken(rawToken) },
  });
  if (!recipient) return null;
  if (recipient.invitation_status === 'accepted') return null;
  if (
    recipient.invitation_expires_at &&
    recipient.invitation_expires_at.getTime() < Date.now()
  ) return null;
  return recipient;
};

export class InvitationController {
  static async getInvitation(req: Request, res: Response) {
    try {
      const token = String(req.query.token || '');
      const recipient = await findValidInvitation(token);
      if (!recipient) {
        return res.status(404).json({ message: 'Invalid or expired invitation' });
      }
      const owner = await User.findByPk(recipient.user_id);

      return res.json({
        invitation: {
          email: recipient.email,
          name: recipient.name,
          relationship: recipient.relationship,
          owner_name: owner?.full_name || owner?.email || 'A Digital Will user',
          expires_at: recipient.invitation_expires_at,
        },
      });
    } catch (error) {
      console.error('Get invitation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async acceptInvitation(req: Request, res: Response) {
    try {
      const { token, kdf_salt, public_key, encrypted_private_key } = req.body;

      if (!kdf_salt || !public_key || !encrypted_private_key) {
        return res.status(400).json({
          message: 'kdf_salt, public_key and encrypted_private_key are required',
        });
      }

      const recipient = await findValidInvitation(token);
      if (!recipient) {
        return res.status(404).json({ message: 'Invalid or expired invitation' });
      }

      const testToken = generateToken(32);

      recipient.public_key = public_key;
      recipient.encrypted_private_key = encrypted_private_key;
      recipient.kdf_salt = kdf_salt;
      recipient.invitation_status = 'accepted';
      recipient.invitation_token_hash = null;
      recipient.invitation_expires_at = null;
      recipient.test_token_hash = hashToken(testToken);
      await recipient.save();

      return res.json({
        message: 'Invitation accepted',
        recipient: {
          id: recipient.id,
          email: recipient.email,
          name: recipient.name,
        },
        test_token: testToken,
      });
    } catch (error) {
      console.error('Accept invitation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
