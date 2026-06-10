// ════════════════════════════════════════════════════════════════════
// CheckinService (Asistiré Inteligente — Fase A2).
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders } from './utils/api-client';

export interface CheckinResult { status: 'attended'; already: boolean; }
export interface TokenResult { token: string; }
export interface CheckinItem { id: string; username: string | null; profile_url: string | null; method: string; arrived_at: string; }

@Injectable({ providedIn: 'root' })
export class CheckinService {
  getToken(eventId: string): Promise<TokenResult> {
    return apiRequest<TokenResult>(`/api/events/${eventId}/checkin/token`, { headers: authHeaders() });
  }

  rotateToken(eventId: string): Promise<TokenResult> {
    return apiRequest<TokenResult>(`/api/events/${eventId}/checkin/token/rotate`, { method: 'POST', headers: authHeaders() });
  }

  checkIn(eventId: string, token: string, lat?: number, lng?: number): Promise<CheckinResult> {
    return apiRequest<CheckinResult>(`/api/events/${eventId}/checkin`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ token, lat: lat ?? null, lng: lng ?? null }),
    });
  }

  manualCheckin(eventId: string, userId: string): Promise<CheckinResult> {
    return apiRequest<CheckinResult>(`/api/events/${eventId}/checkin/manual`, {
      method: 'POST', headers: authHeaders(true), body: JSON.stringify({ user_id: userId }),
    });
  }

  listCheckins(eventId: string): Promise<{ items: CheckinItem[] }> {
    return apiRequest<{ items: CheckinItem[] }>(`/api/events/${eventId}/checkins`, { headers: authHeaders() });
  }
}
