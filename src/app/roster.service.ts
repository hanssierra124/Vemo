// ════════════════════════════════════════════════════════════════════
// RosterService — Centro de Comando del Organizador: asistentes reales
// (app + walk-in) e insights agregados de un evento, más Vela para
// preguntar sobre esos datos.
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders } from './utils/api-client';

export interface RosterAttendee {
  source: 'app' | 'walkin';
  id: string;
  name: string;
  status: string;
  is_recurring: boolean;
  registered_at: string | null;
  checked_in_at: string | null;
  age: number | null;
  interests: string[];
  negative_preferences: string[];
  preferred_company: string | null;
  preferred_time: string | null;
  neighborhood: string | null;
  outing_frequency: string | null;
  spontaneity: string | null;
  budget_range: string | null;
  transport_mode: string | null;
  social_energy: string | null;
  intention: string | null;
  mood_company: string | null;
  mood_time_available: string | null;
  current_mood: string | null;
}

export interface RosterResponse {
  event: { id: string; title: string };
  roster: RosterAttendee[];
}

export interface TallyEntry { value: string; count: number; }

export interface EventInsights {
  event: { id: string; title: string };
  totals: { total: number; app: number; walkin: number; new: number; recurring: number; checked_in: number };
  age: { buckets: Record<string, number>; unknown: number };
  interests: TallyEntry[];
  negative_preferences: TallyEntry[];
  preferred_company: TallyEntry[];
  preferred_time: TallyEntry[];
  neighborhood: TallyEntry[];
  outing_frequency: TallyEntry[];
  spontaneity: TallyEntry[];
  budget_range: TallyEntry[];
  transport_mode: TallyEntry[];
  social_energy: TallyEntry[];
  intention: TallyEntry[];
  mood_company: TallyEntry[];
  mood_time_available: TallyEntry[];
  current_mood: TallyEntry[];
}

@Injectable({ providedIn: 'root' })
export class RosterService {
  getRoster(eventId: string): Promise<RosterResponse> {
    return apiRequest<RosterResponse>(`/api/organizer/events/${eventId}/roster`, { headers: authHeaders() });
  }

  getInsights(eventId: string): Promise<EventInsights> {
    return apiRequest<EventInsights>(`/api/organizer/events/${eventId}/insights`, { headers: authHeaders() });
  }

  askVela(eventId: string, message: string): Promise<{ reply: string }> {
    return apiRequest<{ reply: string }>(`/api/organizer/events/${eventId}/vela-insights`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  }
}
