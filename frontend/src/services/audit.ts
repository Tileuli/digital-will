import api from './api';

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface AuditLogResponse {
  total: number;
  limit: number;
  offset: number;
  logs: AuditLogEntry[];
}

export const fetchMyAuditLog = async (
  limit = 50,
  offset = 0
): Promise<AuditLogResponse> => {
  const res = await api.get<AuditLogResponse>('/audit/me', {
    params: { limit, offset },
  });
  return res.data;
};
