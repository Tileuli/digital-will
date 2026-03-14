export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  public_key?: string;
  last_checkin?: string;
  next_checkin_due?: string;
  checkin_interval_days?: number;
  reminder_sent_at?: string | null;
}

export interface Recipient {
  id: string;
  user_id: string;
  email: string;
  name: string;
  public_key?: string;
  relationship?: string;
  notification_sent: boolean;
  access_granted: boolean;
  access_granted_at?: string | null;
}

export interface VaultMetadata {
  title?: string;
  description?: string;
  type?: 'text' | 'file' | 'credentials';
}

export interface Vault {
  id: string;
  user_id: string;
  encrypted_data?: string;
  metadata?: VaultMetadata | null;
  is_active: boolean;
  release_triggered: boolean;
  release_triggered_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CheckinLog {
  id: string;
  user_id: string;
  checkin_date: string;
  method?: string;
}

export interface CheckinStatus {
  last_checkin?: string | null;
  next_checkin_due?: string | null;
  checkin_interval_days?: number;
  reminder_sent_at?: string | null;
  is_overdue: boolean;
  last_checkin_log?: CheckinLog | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}