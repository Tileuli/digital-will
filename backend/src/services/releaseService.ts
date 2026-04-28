import { Op } from 'sequelize';
import { Recipient, ReleaseToken, User, Vault, VaultRecipientKey } from '../models';
import { generateToken, hashToken } from './tokenService';
import { sendReleaseEmail } from './emailService';

const RELEASE_TOKEN_TTL_DAYS = Number(process.env.RELEASE_TOKEN_TTL_DAYS || 30);
const EMAIL_THROTTLE_MS = Number(process.env.EMAIL_THROTTLE_MS || 1500);
const EMAIL_MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isRateLimitError = (err: any): boolean => {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    err?.responseCode === 421 ||
    err?.responseCode === 450 ||
    err?.responseCode === 550 ||
    msg.includes('too many') ||
    msg.includes('rate limit')
  );
};

const sendReleaseEmailWithRetry = async (
  to: string,
  name: string,
  ownerName: string,
  token: string
): Promise<void> => {
  let delay = EMAIL_THROTTLE_MS;
  for (let attempt = 1; attempt <= EMAIL_MAX_RETRIES; attempt++) {
    try {
      await sendReleaseEmail(to, name, ownerName, token);
      return;
    } catch (err) {
      if (attempt === EMAIL_MAX_RETRIES || !isRateLimitError(err)) throw err;
      console.warn(
        `Release email to ${to} throttled (attempt ${attempt}/${EMAIL_MAX_RETRIES}) — backing off ${delay}ms`
      );
      await sleep(delay);
      delay *= 2;
    }
  }
};

export const releaseVaultsForUser = async (
  user: User,
  options: { onlyVaultIds?: string[] } = {}
) => {
  console.log(`Processing release for ${user.email}`);

  const recipients = await Recipient.findAll({
    where: { user_id: user.id, invitation_status: 'accepted' },
  });

  if (!recipients.length) {
    console.log(`No accepted recipients for ${user.email} — nothing to release.`);
    return;
  }

  const vaultWhere: any = {
    user_id: user.id,
    is_active: true,
    release_triggered: false,
  };
  if (options.onlyVaultIds && options.onlyVaultIds.length > 0) {
    vaultWhere.id = { [Op.in]: options.onlyVaultIds };
  }

  const vaults = await Vault.findAll({ where: vaultWhere });

  if (!vaults.length) {
    console.log(`No active unreleased vaults for ${user.email}.`);
    return;
  }

  const vaultIds = vaults.map((v) => v.id);
  const wrappedKeys = await VaultRecipientKey.findAll({
    where: { vault_id: { [Op.in]: vaultIds } },
  });

  const ownerName = user.full_name || user.email;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + RELEASE_TOKEN_TTL_DAYS);

  const releasedVaultIds = new Set<string>();
  let isFirstSend = true;

  for (const recipient of recipients) {
    const recipientVaultIds = wrappedKeys
      .filter((k) => k.recipient_id === recipient.id)
      .map((k) => k.vault_id);
    if (!recipientVaultIds.length) {
      console.log(
        `Recipient ${recipient.email} has no wrapped keys — skipping (owner must sync keys after recipient accepts).`
      );
      continue;
    }

    if (!isFirstSend) await sleep(EMAIL_THROTTLE_MS);
    isFirstSend = false;

    const rawToken = generateToken(32);
    const tokenRow = await ReleaseToken.create({
      recipient_id: recipient.id,
      user_id: user.id,
      token_hash: hashToken(rawToken),
      expires_at: expiresAt,
    });

    try {
      await sendReleaseEmailWithRetry(
        recipient.email,
        recipient.name,
        ownerName,
        rawToken
      );
      recipient.notification_sent = true;
      await recipient.save();
      recipientVaultIds.forEach((id) => releasedVaultIds.add(id));
    } catch (err) {
      console.error(`Failed to send release email to ${recipient.email}:`, err);
      await tokenRow.destroy();
    }
  }

  for (const vault of vaults) {
    if (!releasedVaultIds.has(vault.id)) continue;
    vault.release_triggered = true;
    vault.release_triggered_at = new Date();
    await vault.save();
  }
};
