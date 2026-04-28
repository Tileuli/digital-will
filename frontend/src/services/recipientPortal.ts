/**
 * API client for the PUBLIC recipient-facing endpoints.
 * Does NOT attach the owner's JWT.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/public',
  headers: { 'Content-Type': 'application/json' },
});

export interface InvitationSummary {
  email: string;
  name: string;
  relationship?: string;
  owner_name: string;
  expires_at?: string;
}

export interface ClaimVaultBlob {
  id: string;
  encrypted_data: string;
  wrapped_key: string;
  metadata?: any;
  release_triggered_at?: string;
}

export interface ClaimPayload {
  recipient: {
    email: string;
    name: string;
    kdf_salt: string;
    encrypted_private_key: string;
  };
  owner: { name: string; email: string };
  vaults: ClaimVaultBlob[];
}

export const fetchInvitation = async (
  token: string
): Promise<InvitationSummary> => {
  const res = await api.get('/invitations', { params: { token } });
  return res.data.invitation;
};

export interface AcceptInvitationResult {
  message: string;
  recipient: { id: string; email: string; name: string };
  test_token: string;
}

export const acceptInvitation = async (payload: {
  token: string;
  kdf_salt: string;
  public_key: string;
  encrypted_private_key: string;
}): Promise<AcceptInvitationResult> => {
  const res = await api.post<AcceptInvitationResult>(
    '/invitations/accept',
    payload
  );
  return res.data;
};

export interface TestMaterial {
  recipient: {
    name: string;
    email: string;
    kdf_salt: string;
    encrypted_private_key: string;
  };
  owner: { name: string };
}

export const fetchTestMaterial = async (
  token: string
): Promise<TestMaterial> => {
  const res = await api.get<TestMaterial>('/recipient-test/material', {
    params: { token },
  });
  return res.data;
};

export const fetchClaim = async (token: string): Promise<ClaimPayload> => {
  const res = await api.get('/claim', { params: { token } });
  return res.data.claim;
};

export const markClaimAccessed = async (token: string) => {
  const res = await api.post('/claim/accessed', { token });
  return res.data;
};
