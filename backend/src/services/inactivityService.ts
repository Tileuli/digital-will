import cron from 'node-cron';
import { Op, WhereOptions } from 'sequelize';
import { User } from '../models';
import { releaseVaultsForUser } from './releaseService';
import { sendCheckinReminderEmail } from './emailService';

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

const runInactivityCheck = async () => {
  try {
    console.log('Running inactivity check...');

    await sendUpcomingCheckinReminders();

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
        await releaseVaultsForUser(user);
        console.log(`Release flow finished for user ${user.email}`);
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

export const startInactivityChecker = () => {
  const cronExpression = process.env.INACTIVITY_CRON || '*/1 * * * *';

  cron.schedule(cronExpression, async () => {
    await runInactivityCheck();
  });

  console.log(`Inactivity checker started with cron: ${cronExpression}`);
};

export const runInactivityCheckNow = runInactivityCheck;