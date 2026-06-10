// ════════════════════════════════════════════════════════════════════
// NotificationService (Asistiré Inteligente — Fase A5). Bandeja in-app.
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders, buildQuery } from './utils/api-client';
import { NotificationPage, NotificationPreferences } from './models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  list(opts?: { unread?: boolean; cursor?: string | null; limit?: number }): Promise<NotificationPage> {
    const q = buildQuery({ unread: opts?.unread ? '1' : undefined, cursor: opts?.cursor, limit: opts?.limit });
    return apiRequest<NotificationPage>(`/api/me/notifications${q}`, { headers: authHeaders() });
  }

  unreadCount(): Promise<{ count: number }> {
    return apiRequest<{ count: number }>(`/api/me/notifications/unread-count`, { headers: authHeaders() });
  }

  markRead(id: string): Promise<{ ok: boolean; changed: boolean }> {
    return apiRequest(`/api/me/notifications/${id}/read`, { method: 'POST', headers: authHeaders() });
  }

  markAllRead(): Promise<{ ok: boolean }> {
    return apiRequest(`/api/me/notifications/read-all`, { method: 'POST', headers: authHeaders() });
  }

  getPreferences(): Promise<NotificationPreferences> {
    return apiRequest<NotificationPreferences>(`/api/me/notification-preferences`, { headers: authHeaders() });
  }

  updatePreferences(patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return apiRequest<NotificationPreferences>(`/api/me/notification-preferences`, {
      method: 'PUT', headers: authHeaders(true), body: JSON.stringify(patch),
    });
  }
}
