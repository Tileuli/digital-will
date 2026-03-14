import cron from 'node-cron';
import { Op, WhereOptions } from 'sequelize';
import { User } from '../models';
import { releaseVaultsForUser } from './releaseService';

const runInactivityCheck = async () => {
  try {
    console.log('Running inactivity check...');

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
        console.log(`Release flow processed for user ${user.email}`);
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