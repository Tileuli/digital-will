import { Request, Response } from 'express';
import { Recipient, User } from '../models';
import { generateToken, hashToken } from '../services/tokenService';
import { sendRecipientInvitationEmail } from '../services/emailService';

const INVITATION_TTL_DAYS = 30;

const safeRecipient = (recipient: Recipient) => {
  const data = recipient.get({ plain: true }) as any;
  delete data.invitation_token_hash;
  delete data.encrypted_private_key;
  delete data.kdf_salt;
  return data;
};

export class RecipientController {
  static async addRecipient(req: Request, res: Response) {
    try {
      const { email, name, relationship } = req.body;

      const rawToken = generateToken(32);
      const token_hash = hashToken(rawToken);
      const expires = new Date();
      expires.setDate(expires.getDate() + INVITATION_TTL_DAYS);

      const recipient = await Recipient.create({
        user_id: req.user.id,
        email,
        name,
        relationship,
        invitation_status: 'pending',
        invitation_token_hash: token_hash,
        invitation_expires_at: expires,
        notification_sent: false,
        access_granted: false,
      });

      const owner = await User.findByPk(req.user.id);
      const ownerName = owner?.full_name || owner?.email || 'A Digital Will user';

      try {
        await sendRecipientInvitationEmail(email, name, ownerName, rawToken);
      } catch (err) {
        console.error('Failed to send invitation email:', err);
      }

      res.status(201).json({
        message: 'Recipient added. Invitation email sent.',
        recipient: safeRecipient(recipient),
      });
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Recipient already exists' });
      }
      console.error('Add recipient error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getRecipients(req: Request, res: Response) {
    try {
      const recipients = await Recipient.findAll({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']],
      });
      res.json({ recipients: recipients.map(safeRecipient) });
    } catch (error) {
      console.error('Get recipients error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteRecipient(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const recipient = await Recipient.findOne({
        where: { id, user_id: req.user.id },
      });

      if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

      await recipient.destroy();
      res.json({ message: 'Recipient deleted successfully' });
    } catch (error) {
      console.error('Delete recipient error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async resendInvitation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const recipient = await Recipient.findOne({
        where: { id, user_id: req.user.id },
      });
      if (!recipient) return res.status(404).json({ message: 'Recipient not found' });
      if (recipient.invitation_status === 'accepted') {
        return res.status(400).json({ message: 'Recipient has already accepted' });
      }

      const rawToken = generateToken(32);
      recipient.invitation_token_hash = hashToken(rawToken);
      const expires = new Date();
      expires.setDate(expires.getDate() + INVITATION_TTL_DAYS);
      recipient.invitation_expires_at = expires;
      await recipient.save();

      const owner = await User.findByPk(req.user.id);
      const ownerName = owner?.full_name || owner?.email || 'A Digital Will user';

      await sendRecipientInvitationEmail(recipient.email, recipient.name, ownerName, rawToken);

      res.json({ message: 'Invitation resent' });
    } catch (error) {
      console.error('Resend invitation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
