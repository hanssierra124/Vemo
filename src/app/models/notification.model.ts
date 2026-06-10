// ════════════════════════════════════════════════════════════════════
// Modelos de notificaciones (Fase A5).
// ════════════════════════════════════════════════════════════════════
export type NotificationType =
  | 'reminder_7d' | 'reminder_24h' | 'reminder_1h' | 'event_start' | 'generic';

export interface AppNotification {
  id: string;
  event_id: string | null;
  type: NotificationType;
  channel: string;
  title: string | null;
  body: string | null;
  scheduled_for: string | null;
  read_at: string | null;
  status: string;
  created_at: string;
}

export interface NotificationPage {
  items: AppNotification[];
  nextCursor: string | null;
}

export interface NotificationPreferences {
  user_id: string;
  reminders_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}
