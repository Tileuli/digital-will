/**
 * Shared TypeScript API contract types.
 * Canonical source for shapes that travel between client and server.
 *
 * Imported by:
 *   - frontend/src/types/index.ts  (re-exports)
 *   - mobile/src/types/index.ts    (re-exports)
 *
 * Backend models (Sequelize) live separately because they include
 * database-side concerns (Date objects, internal flags, etc.).
 */

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  public_key?: string;
  encrypted_private_key?: string;
  kdf_salt?: string;
  last_checkin?: string;
  next_checkin_due?: string;
  checkin_interval_days?: number;
  reminder_sent_at?: string | null;
  totp_enabled?: boolean;
  kdf_algorithm?: 'pbkdf2' | 'argon2id';
}

export type InvitationStatus = 'pending' | 'accepted';

export interface Recipient {
  id: string;
  user_id: string;
  email: string;
  name: string;
  public_key?: string;
  relationship?: string;
  invitation_status: InvitationStatus;
  notification_sent: boolean;
  access_granted: boolean;
  access_granted_at?: string | null;
  created_at?: string;
}

export interface VaultMetadata {
  type?: 'text' | 'file' | 'credentials';
  has_attachment?: boolean;
}

export interface VaultAttachment {
  filename: string;
  mimetype: string;
  data: string; // base64
  size: number;
}

export interface VaultPlaintext {
  title: string;
  description?: string;
  content: string;
  type?: 'text' | 'file' | 'credentials';
  attachments?: VaultAttachment[];
}

export interface Vault {
  id: string;
  user_id: string;
  metadata?: VaultMetadata | null;
  is_active: boolean;
  release_triggered: boolean;
  release_triggered_at?: string | null;
  release_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VaultDetailed extends Vault {
  encrypted_data: string;
  wrapped_key_owner: string;
  recipient_ids_with_key: string[];
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
