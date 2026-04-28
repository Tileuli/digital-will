import cron from 'node-cron';
import { Op, WhereOptions } from 'sequelize';
import { DeathVote, TrustedConfirmer, User, Vault } from '../models';
import { releaseVaultsForUser } from './releaseService';
import {
  sendCheckinReminderEmail,
  sendDeathVoteEmail,
} from './emailService';
import { ConfirmerController } from '../controllers/confirmerController';

const REMINDER_HOURS_BEFORE_DUE = Number(process.env.REMINDER_HOURS_BEFORE_DUE || 24);

const sendUpcomingCheckinReminders = async () => {
  try {
    const now = new Date();
    const reminderWindowEnd = new Date(
      now.getTime() + REMINDER_HOURS_BEFORE_DUE * 60 * 60 * 1000
    );

    console.log(
      `Checking reminder window from ${now.toISOString()} to ${reminderWindowEnd.toISOString()}`
    );

    const reminderWhere: WhereOptions = {
      is_active: true,
      next_checkin_due: {
        [Op.gt]: now,
        [Op.lte]: reminderWindowEnd,
      },
    };

    const usersNeedingReminder = await User.findAll({
      where: reminderWhere,
    });

    console.log(`Users in reminder window: ${usersNeedingReminder.length}`);

    for (const user of usersNeedingReminder) {
      const shouldSkipReminder =
        user.reminder_sent_at &&
        user.last_checkin &&
        new Date(user.reminder_sent_at).getTime() >= new Date(user.last_checkin).getTime();

      if (shouldSkipReminder) {
        console.log(`Reminder already sent after last check-in for ${user.email}`);
        continue;
      }

      if (!user.next_checkin_due) {
        continue;
      }

      const ownerName = user.full_name || user.email;

      console.log(`Sending reminder email to ${user.email}`);

      await sendCheckinReminderEmail(user.email, ownerName, user.next_checkin_due);

      user.reminder_sent_at = new Date();
      await user.save();
    }
  } catch (error) {
    console.error('Reminder check failed:', error);
  }
};

const releaseTimeLockedVaults = async () => {
  try {
    const now = new Date();
    const dueVaults = await Vault.findAll({
      where: {
        is_active: true,
        release_triggered: false,
        release_at: { [Op.lte]: now, [Op.ne]: null },
      },
    });

    if (!dueVaults.length) return;
    console.log(`Time-locked vaults due: ${dueVaults.length}`);

    const vaultsByUser = new Map<string, string[]>();
    for (const v of dueVaults) {
      const ids = vaultsByUser.get(v.user_id) || [];
      ids.push(v.id);
      vaultsByUser.set(v.user_id, ids);
    }

    for (const [userId, vaultIds] of vaultsByUser) {
      const user = await User.findByPk(userId);
      if (!user || !user.is_active) continue;
      try {
        await releaseVaultsForUser(user, { onlyVaultIds: vaultIds });
      } catch (error) {
        console.error(
          `Failed to process time-locked release for ${user.email}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error('Time-locked release check failed:', error);
  }
};

const runInactivityCheck = async () => {
  try {
    console.log('Running inactivity check...');

    await sendUpcomingCheckinReminders();
    await releaseTimeLockedVaults();

    const now = new Date();

    const whereClause: WhereOptions = {
      is_active: true,
      next_checkin_due: {
        [Op.lt]: now,
      },
    };

    const overdueUsers = await User.findAll({
      where: whereClause,
    });

    console.log(`Overdue users found: ${overdueUsers.length}`);

    for (const user of overdueUsers) {
      console.log(`Processing overdue user: ${user.email}`);
      try {
        await processOverdueUser(user);
      } catch (error) {
        console.error(`Failed to process release for ${user.email}:`, error);
      }
    }

    if (!overdueUsers.length) {
      console.log('No overdue users found.');
    }
  } catch (error) {
    console.error('Inactivity check failed:', error);
  }
};

/**
 * For an overdue user, decide whether to release immediately or to start /
 * tally a death-confirmation voting round with trusted contacts.
 *
 * Modes:
 *  - required_confirmations === 0  →  release immediately (legacy behavior)
 *  - required_confirmations > 0 with no accepted confirmers  →  release immediately
 *  - required_confirmations > 0 with confirmers              →  voting flow
 */
const processOverdueUser = async (user: User) => {
  const threshold = user.required_confirmations || 0;

  if (threshold <= 0) {
    await releaseVaultsForUser(user);
    console.log(`Release flow finished for user ${user.email}`);
    return;
  }

  const acceptedConfirmers = await TrustedConfirmer.findAll({
    where: { user_id: user.id, accepted_at: { [Op.ne]: null } },
  });

  if (acceptedConfirmers.length === 0) {
    console.log(
      `User ${user.email} requires ${threshold} confirmations but has no accepted confirmers — releasing.`
    );
    await releaseVaultsForUser(user);
    return;
  }

  const effectiveThreshold = Math.min(threshold, acceptedConfirmers.length);

  // Tally votes for the current round (votes from prior rounds are ignored
  // because the round_id changed on the user's last check-in).
  const yesVotes = await DeathVote.count({
    where: {
      user_id: user.id,
      round_id: user.voting_round_id,
      vote: 'yes',
    },
  });

  if (yesVotes >= effectiveThreshold) {
    console.log(
      `User ${user.email} reached ${yesVotes}/${effectiveThreshold} confirmations → releasing.`
    );
    await releaseVaultsForUser(user);
    return;
  }

  // Voting round not yet decided. Send (or re-send) vote requests if we
  // haven't sent them this round. We use a heuristic: if no votes exist at
  // all this round, this is the first sweep — mail everyone.
  const anyVoteExists = await DeathVote.count({
    where: { user_id: user.id, round_id: user.voting_round_id },
  });

  if (anyVoteExists === 0) {
    const ownerName = user.full_name || user.email;
    for (const confirmer of acceptedConfirmers) {
      const token = ConfirmerController.issueVoteToken({
        user_id: user.id,
        confirmer_id: confirmer.id,
        round_id: user.voting_round_id,
      });
      sendDeathVoteEmail(confirmer.email, confirmer.name, ownerName, token).catch(
        (err) =>
          console.error(`Failed to send vote email to ${confirmer.email}:`, err)
      );
    }
    console.log(
      `Voting round opened for ${user.email}: emailed ${acceptedConfirmers.length} confirmers (need ${effectiveThreshold} yes-votes)`
    );
  } else {
    console.log(
      `Voting round in progress for ${user.email}: ${yesVotes}/${effectiveThreshold} yes-votes so far`
    );
  }
};

export const startInactivityChecker = () => {
  const cronExpression = process.env.INACTIVITY_CRON || '*/1 * * * *';

  cron.schedule(cronExpression, async () => {
    await runInactivityCheck();
  });

  console.log(`Inactivity checker started with cron: ${cronExpression}`);
};

export const runInactivityCheckNow = runInactivityCheck;