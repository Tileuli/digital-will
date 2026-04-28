import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sequelize } from '../config/database';
import { DeathVote, TrustedConfirmer, User } from '../models';
import { hashToken } from '../services/tokenService';
import {
  sendConfirmerInvitationEmail,
} from '../services/emailService';

const VOTE_TOKEN_TTL = '7d';

const safeConfirmer = (c: TrustedConfirmer) => {
  const obj = c.get({ plain: true }) as any;
  delete obj.invitation_token_hash;
  return obj;
};

export class ConfirmerController {
  /** List the authed user's trusted confirmers + threshold. */
  static async list(req: Request, res: Response) {
    try {
      const [confirmers, user] = await Promise.all([
        TrustedConfirmer.findAll({
          where: { user_id: req.user.id },
          order: [['created_at', 'ASC']],
        }),
        User.findByPk(req.user.id),
      ]);

      return res.json({
        confirmers: confirmers.map(safeConfirmer),
        required_confirmations: user?.required_confirmations ?? 0,
      });
    } catch (error) {
      console.error('List confirmers error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /** Add a new trusted confirmer + send invitation email. */
  static async add(req: Request, res: Response) {
    try {
      const { email, name, relationship } = req.body as {
        email?: string;
        name?: string;
        relationship?: string;
      };
      if (!email || !name) {
        return res.status(400).json({ message: 'email and name are required' });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existing = await TrustedConfirmer.findOne({
        where: { user_id: req.user.id, email: normalizedEmail },
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: 'This contact is already in your list.' });
      }

      const rawToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = hashToken(rawToken);

      const confirmer = await TrustedConfirmer.create({
        user_id: req.user.id,
        email: normalizedEmail,
        name: name.trim(),
        relationship: relationship?.trim() || null,
        invitation_token_hash: tokenHash,
      });

      const owner = await User.findByPk(req.user.id);
      const ownerName = owner?.full_name || owner?.email || 'A Digital Will user';

      sendConfirmerInvitationEmail(
        normalizedEmail,
        confirmer.name,
        ownerName,
        rawToken
      ).catch((err) => console.error('Failed to send confirmer invite:', err));

      return res.status(201).json({ confirmer: safeConfirmer(confirmer) });
    } catch (error) {
      console.error('Add confirmer error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const deleted = await TrustedConfirmer.destroy({
        where: { id, user_id: req.user.id },
      });
      if (!deleted) {
        return res.status(404).json({ message: 'Confirmer not found' });
      }
      return res.json({ message: 'Removed' });
    } catch (error) {
      console.error('Remove confirmer error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /** Update the M-of-N threshold. */
  static async setThreshold(req: Request, res: Response) {
    try {
      const { required_confirmations } = req.body as {
        required_confirmations?: number;
      };
      if (
        typeof required_confirmations !== 'number' ||
        required_confirmations < 0 ||
        required_confirmations > 20
      ) {
        return res
          .status(400)
          .json({ message: 'required_confirmations must be 0-20' });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.required_confirmations = required_confirmations;
      await user.save();

      return res.json({ required_confirmations });
    } catch (error) {
      console.error('Set threshold error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /* ─── Public endpoints used by the confirmer themselves ─── */

  /**
   * Public — used by a confirmer who clicked the invitation email link.
   * Body: { token } → returns the owner's name + a confirmation that they can
   * accept the role.
   */
  static async lookupInvite(req: Request, res: Response) {
    try {
      const { token } = req.body as { token?: string };
      if (!token) return res.status(400).json({ message: 'Token required' });

      const tokenHash = hashToken(token);
      const confirmer = await TrustedConfirmer.findOne({
        where: { invitation_token_hash: tokenHash },
        include: [{ model: User, as: 'owner', attributes: ['email', 'full_name'] }],
      });
      if (!confirmer) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      const owner: any = (confirmer as any).owner;
      return res.json({
        confirmer: {
          name: confirmer.name,
          email: confirmer.email,
          accepted: !!confirmer.accepted_at,
        },
        owner: {
          name: owner?.full_name || owner?.email,
        },
      });
    } catch (error) {
      console.error('Lookup invite error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /** Public — confirmer accepts the role. Body: { token } */
  static async acceptInvite(req: Request, res: Response) {
    try {
      const { token } = req.body as { token?: string };
      if (!token) return res.status(400).json({ message: 'Token required' });

      const tokenHash = hashToken(token);
      const confirmer = await TrustedConfirmer.findOne({
        where: { invitation_token_hash: tokenHash },
      });
      if (!confirmer) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      if (confirmer.accepted_at) {
        return res.json({ message: 'Already accepted' });
      }

      confirmer.accepted_at = new Date();
      // Keep the invitation hash so the link continues to identify them.
      await confirmer.save();

      return res.json({ message: 'Accepted' });
    } catch (error) {
      console.error('Accept invite error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /** Public — look up a vote token (issued by inactivity service). */
  static async lookupVote(req: Request, res: Response) {
    try {
      const { token } = req.body as { token?: string };
      if (!token) return res.status(400).json({ message: 'Token required' });

      const decoded = ConfirmerController.verifyVoteToken(token);
      if (!decoded) {
        return res.status(401).json({ message: 'Vote link invalid or expired' });
      }

      const [confirmer, user, existingVote] = await Promise.all([
        TrustedConfirmer.findByPk(decoded.confirmer_id),
        User.findByPk(decoded.user_id),
        DeathVote.findOne({
          where: {
            user_id: decoded.user_id,
            confirmer_id: decoded.confirmer_id,
            round_id: decoded.round_id,
          },
        }),
      ]);

      if (!confirmer || !user) {
        return res.status(404).json({ message: 'Vote no longer valid' });
      }
      if (decoded.round_id !== user.voting_round_id) {
        return res.status(410).json({
          message: 'This vote has been cancelled — the user checked in.',
        });
      }

      return res.json({
        confirmer: { name: confirmer.name },
        owner: { name: user.full_name || user.email },
        already_voted: existingVote ? existingVote.vote : null,
      });
    } catch (error) {
      console.error('Lookup vote error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /** Public — submit a vote. Body: { token, vote: 'yes' | 'no' } */
  static async submitVote(req: Request, res: Response) {
    const t = await sequelize.transaction();
    try {
      const { token, vote } = req.body as {
        token?: string;
        vote?: 'yes' | 'no';
      };
      if (!token || (vote !== 'yes' && vote !== 'no')) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: "Vote token + 'yes'|'no' required" });
      }

      const decoded = ConfirmerController.verifyVoteToken(token);
      if (!decoded) {
        await t.rollback();
        return res.status(401).json({ message: 'Vote link invalid or expired' });
      }

      const user = await User.findByPk(decoded.user_id, { transaction: t });
      if (!user) {
        await t.rollback();
        return res.status(404).json({ message: 'Vote no longer valid' });
      }
      if (decoded.round_id !== user.voting_round_id) {
        await t.rollback();
        return res.status(410).json({
          message: 'This vote has been cancelled — the user checked in.',
        });
      }

      // Upsert by composite key (user, round, confirmer).
      const [existing, created] = await DeathVote.findOrCreate({
        where: {
          user_id: decoded.user_id,
          confirmer_id: decoded.confirmer_id,
          round_id: decoded.round_id,
        },
        defaults: {
          user_id: decoded.user_id,
          confirmer_id: decoded.confirmer_id,
          round_id: decoded.round_id,
          vote,
          voted_at: new Date(),
        },
        transaction: t,
      });

      if (!created) {
        existing.vote = vote;
        existing.voted_at = new Date();
        await existing.save({ transaction: t });
      }

      await t.commit();
      return res.json({ message: 'Vote recorded', vote });
    } catch (error) {
      await t.rollback();
      console.error('Submit vote error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /* ─── Helpers ─── */

  static issueVoteToken(params: {
    user_id: string;
    confirmer_id: string;
    round_id: number;
  }): string {
    return jwt.sign(
      {
        user_id: params.user_id,
        confirmer_id: params.confirmer_id,
        round_id: params.round_id,
        scope: 'death_vote',
      },
      process.env.JWT_SECRET as string,
      { expiresIn: VOTE_TOKEN_TTL }
    );
  }

  static verifyVoteToken(
    token: string
  ): { user_id: string; confirmer_id: string; round_id: number } | null {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      if (decoded?.scope !== 'death_vote') return null;
      if (
        typeof decoded.user_id !== 'string' ||
        typeof decoded.confirmer_id !== 'string' ||
        typeof decoded.round_id !== 'number'
      )
        return null;
      return {
        user_id: decoded.user_id,
        confirmer_id: decoded.confirmer_id,
        round_id: decoded.round_id,
      };
    } catch {
      return null;
    }
  }
}
