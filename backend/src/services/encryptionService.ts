import CryptoJS from 'crypto-js';

const getVaultSecret = (): string => {
  const secret = process.env.VAULT_SECRET;
  if (!secret) {
    throw new Error('VAULT_SECRET is not configured');
  }
  return secret;
};

export const encryptVaultData = (plainText: string): string => {
  const secret = getVaultSecret();
  return CryptoJS.AES.encrypt(plainText, secret).toString();
};

export const decryptVaultData = (cipherText: string): string => {
  const secret = getVaultSecret();
  const bytes = CryptoJS.AES.decrypt(cipherText, secret);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error('Failed to decrypt vault data');
  }

  return decrypted;
};