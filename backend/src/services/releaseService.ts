import { Recipient, User, Vault } from '../models';
import { sendReleaseEmail } from './emailService';
import { decryptVaultData } from './encryptionService';

export const releaseVaultsForUser = async (user: User) => {
  console.log(`Looking for vaults for user ${user.email}`);

  const vaults = await Vault.findAll({
    where: {
      user_id: user.id,
      is_active: true,
      release_triggered: false,
    },
  });

  console.log(`Vaults found: ${vaults.length}`);

  const recipients = await Recipient.findAll({
    where: {
      user_id: user.id,
    },
  });

  console.log(`Recipients found: ${recipients.length}`);

  if (!vaults.length) {
    console.log(`No active unreleased vaults for ${user.email}`);
    return;
  }

  if (!recipients.length) {
    console.log(`No recipients for ${user.email}`);
    return;
  }

  const ownerName = user.full_name || user.email;

  for (const vault of vaults) {
    let decryptedData: string;

    try {
      decryptedData = decryptVaultData(vault.encrypted_data);
    } catch (error) {
      console.error(`Failed to decrypt vault ${vault.id}:`, error);
      continue;
    }

    for (const recipient of recipients) {
      console.log(`Sending release email to ${recipient.email}`);

      await sendReleaseEmail(
        recipient.email,
        recipient.name,
        ownerName,
        decryptedData
      );

      recipient.notification_sent = true;
      recipient.access_granted = true;
      recipient.access_granted_at = new Date();
      await recipient.save();
    }

    vault.release_triggered = true;
    vault.release_triggered_at = new Date();
    await vault.save();
  }
};