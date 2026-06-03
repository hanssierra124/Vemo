// ════════════════════════════════════════════════════════════════════
// Modelos de moderación (Fase F4): reportes y cola admin.
// ════════════════════════════════════════════════════════════════════
import { ReviewAuthor } from './review.model';

export type ReportReason = 'spam' | 'harassment' | 'offensive' | 'misinformation' | 'other';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface ReportTarget {
  type: 'review' | 'comment';
  id: string;
  title?: string | null;
  body?: string | null;
  status: string;
  review_id?: string;
  author: ReviewAuthor | null;
}

export interface ModerationReport {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter: ReviewAuthor | null;
  target: ReportTarget | null;
}

export interface ReportsPage {
  items: ModerationReport[];
  nextCursor: string | null;
}

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Acoso' },
  { value: 'offensive', label: 'Contenido ofensivo' },
  { value: 'misinformation', label: 'Información falsa' },
  { value: 'other', label: 'Otro' },
];
