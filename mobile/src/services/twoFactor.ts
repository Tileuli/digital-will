import api from './api';

export interface TotpSetupResponse {
  secret: string;
  otpauth: string;
  qr: string; // data:image/png;base64,...
}

export interface TotpStatusResponse {
  totp_enabled: boolean;
  pending_setup: boolean;
}

export const beginTotpSetup = async (): Promise<TotpSetupResponse> => {
  const res = await api.post<TotpSetupResponse>('/2fa/setup');
  return res.data;
};

export const verifyTotpEnable = async (
  code: string
): Promise<{ message: string; totp_enabled: boolean }> => {
  const res = await api.post('/2fa/verify', { code: code.trim() });
  return res.data;
};

export const disableTotp = async (
  password: string
): Promise<{ message: string; totp_enabled: boolean }> => {
  const res = await api.post('/2fa/disable', { password });
  return res.data;
};

export const getTotpStatus = async (): Promise<TotpStatusResponse> => {
  const res = await api.get<TotpStatusResponse>('/2fa/status');
  return res.data;
};
