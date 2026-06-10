// ════════════════════════════════════════════════════════════════════
// AttendanceService (Asistiré Inteligente — Fase A1).
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders, buildQuery } from './utils/api-client';
import {
  MyAttendance, AttendancePage, AttendeesPage, MarkResult, CancelResult, AttendanceStatus,
} from './models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  markGoing(eventId: string): Promise<MarkResult> {
    return apiRequest<MarkResult>(`/api/events/${eventId}/attendance`, {
      method: 'POST', headers: authHeaders(),
    });
  }

  cancel(eventId: string): Promise<CancelResult> {
    return apiRequest<CancelResult>(`/api/events/${eventId}/attendance`, {
      method: 'DELETE', headers: authHeaders(),
    });
  }

  getMine(eventId: string): Promise<MyAttendance> {
    return apiRequest<MyAttendance>(`/api/events/${eventId}/attendance/me`, { headers: authHeaders() });
  }

  listMine(status?: AttendanceStatus | 'finished' | 'all', cursor?: string | null, limit = 20): Promise<AttendancePage> {
    const q = buildQuery({ status, cursor, limit });
    return apiRequest<AttendancePage>(`/api/me/attendance${q}`, { headers: authHeaders() });
  }

  listAttendees(eventId: string, cursor?: string | null, limit = 30): Promise<AttendeesPage> {
    const q = buildQuery({ cursor, limit });
    return apiRequest<AttendeesPage>(`/api/events/${eventId}/attendees${q}`, { headers: authHeaders() });
  }

  setVisibility(eventId: string, visibility: 'public' | 'private'): Promise<{ visibility: string }> {
    return apiRequest(`/api/events/${eventId}/attendance/visibility`, {
      method: 'PATCH', headers: authHeaders(true), body: JSON.stringify({ visibility }),
    });
  }
}

