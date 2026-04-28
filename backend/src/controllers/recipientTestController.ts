import { Request, Response } from 'express';
import { Recipient, User } from '../models';
import { hashToken } from '../services/tokenService';

const findByTestToken = async (rawToken: string) => {
  if (!rawToken || typeof rawToken !== 'string') return null;
  return Recipient.findOne({
    where: { test_token_hash: hashToken(rawToken) },
  });
};

export class RecipientTestController {
  /**
   * Returns the material a recipient needs to verify their passphrase still works:
   *   - kdf_salt
   *   - encrypted_private_key (wrapped blob)
   * The recipient derives their master key in the browser, attempts to unwrap,
   * and gets a yes/no answer locally. The server never sees the passphrase.
   */
  static async getTestMaterial(req: Request, res: Response) {
    try {
      const token = String(req.query.token || '');
      const recipient = await findByTestToken(token);

      if (
        !recipient ||
        recipient.invitation_status !== 'accepted' ||
        !recipient.kdf_salt ||
        !recipient.encrypted_private_key
      ) {
        return res
          .status(404)
          .json({ message: 'Invalid or expired test link' });
      }

      const owner = await User.findByPk(recipient.user_id);

      return res.json({
        recipient: {
          name: recipient.name,
          email: recipient.email,
          kdf_salt: recipient.kdf_salt,
          encrypted_private_key: recipient.encrypted_private_key,
        },
        owner: {
          name: owner?.full_name || owner?.email || 'A Digital Will user',
        },
      });
    } catch (error) {
      console.error('Test material fetch error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}
