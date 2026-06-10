// ════════════════════════════════════════════════════════════════════
// EngagementService (Asistiré Inteligente — Fase A3). Registra señales de
// interacción (fire-and-forget; nunca rompe la UX). Atribuye anónimos con
// un session_id persistente.
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders } from './utils/api-client';

export type EngagementKind = 'view' | 'rsvp_click' | 'share' | 'save' | 'unsave' | 'dismiss';

@Injectable({ providedIn: 'root' })
export class EngagementService {
  private sessionId(): string {
    try {
      let s = localStorage.getItem('vemo_session');
      if (!s) {
        s = (crypto as any)?.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('vemo_session', s);
      }
      return s;
    } catch {
      return 'anon';
    }
  }

  /** Registra una señal. Fire-and-forget: ignora errores. */
  track(eventId: string, kind: EngagementKind, metadata?: Record<string, unknown>): void {
    apiRequest(`/api/events/${eventId}/engagement`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ kind, metadata: metadata || null, session_id: this.sessionId() }),
    }).catch(() => { /* señal no crítica */ });
  }
}
