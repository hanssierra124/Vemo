// ════════════════════════════════════════════════════════════════════
// AnalyticsService (Asistiré Inteligente — Fase A3). Dashboard del
// organizador para un evento.
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders } from './utils/api-client';
import { EventAnalytics } from './models/analytics.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  getEventAnalytics(eventId: string): Promise<EventAnalytics> {
    return apiRequest<EventAnalytics>(`/api/organizer/events/${eventId}/analytics`, { headers: authHeaders() });
  }
}
