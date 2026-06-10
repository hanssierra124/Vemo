// ════════════════════════════════════════════════════════════════════
// Modelos de Asistencia ("Asistiré Inteligente" — Fase A1).
// "Asistiré" es una señal SEPARADA de favoritos (wishlist).
// ════════════════════════════════════════════════════════════════════
export type AttendanceStatus = 'going' | 'cancelled' | 'attended' | 'no_show';

export interface MyAttendance {
  status: AttendanceStatus | null;
  visibility?: string;
  going_at?: string | null;
  attended_at?: string | null;
}

export interface AttendanceEvent {
  id: string;
  title: string;
  date_event: string | null;
  image_url: string | null;
  location_name: string | null;
  city: string | null;
  status: string;
  going_count: number;
  attended_count: number;
}

export interface AttendanceHistoryItem {
  attendance_id: string;
  status: AttendanceStatus;
  going_at: string | null;
  attended_at: string | null;
  event: AttendanceEvent | null;
}

export interface AttendancePage {
  items: AttendanceHistoryItem[];
  nextCursor: string | null;
}

export interface Attendee {
  id: string;
  username: string | null;
  profile_url: string | null;
  going_at: string;
  is_following?: boolean;
  is_me?: boolean;
}

export interface AttendeesPage {
  items: Attendee[];
  nextCursor: string | null;
}

export interface MarkResult { status: 'going'; going_count: number; already: boolean; }
export interface CancelResult { status: 'cancelled'; going_count: number; }
