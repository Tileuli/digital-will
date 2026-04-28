/**
 * In-memory storage for the owner's master key and private key.
 * Cleared on page reload / tab close / logout. Never persisted.
 *
 * If the user refreshes the page, they must re-enter their password
 * (which re-derives the master key) before accessing vaults.
 */

type Keys = {
  masterKey: CryptoKey;
  privateKey: CryptoKey;
};

let session: Keys | null = null;

export const setSessionKeys = (keys: Keys) => {
  session = keys;
};

export const getSessionKeys = (): Keys | null => session;

export const clearSessionKeys = () => {
  session = null;
};

export const hasSessionKeys = (): boolean => session !== null;
