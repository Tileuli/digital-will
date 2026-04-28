import axios from 'axios';
import api from './api';
import { API_BASE_URL } from '../config';

const publicApi = axios.create({
  baseURL: API_BASE_URL.replace(/\/api$/, '/api/public/confirmer'),
  headers: { 'Content-Type': 'application/json' },
});

export interface Confirmer {
  id: string;
  user_id: string;
  email: string;
  name: string;
  relationship?: string | null;
  accepted_at?: string | null;
  created_at?: string;
}

export interface ConfirmerListResponse {
  confirmers: Confirmer[];
  required_confirmations: number;
}

export const listConfirmers = async (): Promise<ConfirmerListResponse> => {
  const res = await api.get<ConfirmerListResponse>('/confirmers');
  return res.data;
};

export const addConfirmer = async (data: {
  email: string;
  name: string;
  relationship?: string;
}): Promise<{ confirmer: Confirmer }> => {
  const res = await api.post('/confirmers', data);
  return res.data;
};

export const removeConfirmer = async (id: string): Promise<void> => {
  await api.delete(`/confirmers/${id}`);
};

export const setConfirmationThreshold = async (
  required_confirmations: number
): Promise<{ required_confirmations: number }> => {
  const res = await api.post('/confirmers/threshold', {
    required_confirmations,
  });
  return res.data;
};

/* ─── Public (used by the confirmer themselves) ─── */

export interface InviteLookup {
  confirmer: { name: string; email: string; accepted: boolean };
  owner: { name: string };
}

export const lookupConfirmerInvite = async (
  token: string
): Promise<InviteLookup> => {
  const res = await publicApi.post<InviteLookup>('/invite/lookup', { token });
  return res.data;
};

export const acceptConfirmerInvite = async (
  token: string
): Promise<{ message: string }> => {
  const res = await publicApi.post('/invite/accept', { token });
  return res.data;
};

export interface VoteLookup {
  confirmer: { name: string };
  owner: { name: string };
  already_voted: 'yes' | 'no' | null;
}

export const lookupVote = async (token: string): Promise<VoteLookup> => {
  const res = await publicApi.post<VoteLookup>('/vote/lookup', { token });
  return res.data;
};

export const submitVote = async (
  token: string,
  vote: 'yes' | 'no'
): Promise<{ message: string; vote: 'yes' | 'no' }> => {
  const res = await publicApi.post('/vote', { token, vote });
  return res.data;
};
