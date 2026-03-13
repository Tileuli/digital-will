export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  public_key?: string;
  last_checkin?: string;
  next_checkin_due?: string;
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
  access_granted_at?: string;
}

export interface Vault {
  id: string;
  user_id: string;
  encrypted_data: string;
  metadata?: {
    name?: string;
    description?: string;
    type?: 'text' | 'file' | 'credentials';
  };
  is_active: boolean;
  release_triggered: boolean;
  release_triggered_at?: string;
}

export interface CheckinLog {
  id: string;
  user_id: string;
  checkin_date: string;
  method?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}