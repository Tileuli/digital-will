/**
 * In-memory holder for the owner's derived master key + RSA private key.
 * Cleared on logout and on app cold start — user must log in again to unlock.
 */
import type forge from 'node-forge';

type Keys = {
  masterKey: Uint8Array;
  privateKey: forge.pki.rsa.PrivateKey;
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
