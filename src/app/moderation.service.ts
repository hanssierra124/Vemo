// ════════════════════════════════════════════════════════════════════
// ModerationService (Fase F4): reportar contenido (cualquier usuario) y
// acciones de la cola admin (cola, resolver, ocultar, suspender).
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders, buildQuery } from './utils/api-client';
import { ReportsPage, ReportReason, ReportStatus } from './models/moderation.model';

@Injectable({ providedIn: 'root' })
export class ModerationService {
  // ── Usuario: reportar ──────────────────────────────────────────────
  report(
    targetType: 'review' | 'comment',
    targetId: string,
    reason: ReportReason,
    details?: string,
  ): Promise<{ message: string; id: string }> {
    return apiRequest(`/api/reports`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details: details || null }),
    });
  }

  // ── Admin: cola y acciones ─────────────────────────────────────────
  listReports(status: ReportStatus | 'all' = 'open', cursor?: string | null, limit = 30): Promise<ReportsPage> {
    const q = buildQuery({ status, cursor, limit });
    return apiRequest<ReportsPage>(`/api/admin/reports${q}`, { headers: authHeaders() });
  }

  resolve(reportId: string, status: 'resolved' | 'dismissed', resolution?: string): Promise<{ message: string }> {
    return apiRequest(`/api/admin/reports/${reportId}/resolve`, {
      method: 'POST', headers: authHeaders(true), body: JSON.stringify({ status, resolution: resolution || null }),
    });
  }

  hideReview(id: string): Promise<{ message: string }> {
    return apiRequest(`/api/admin/reviews/${id}/hide`, { method: 'POST', headers: authHeaders() });
  }
  unhideReview(id: string): Promise<{ message: string }> {
    return apiRequest(`/api/admin/reviews/${id}/unhide`, { method: 'POST', headers: authHeaders() });
  }
  hideComment(id: string): Promise<{ message: string }> {
    return apiRequest(`/api/admin/comments/${id}/hide`, { method: 'POST', headers: authHeaders() });
  }
  suspendUser(id: string, reason?: string): Promise<{ message: string }> {
    return apiRequest(`/api/admin/users/${id}/suspend`, {
      method: 'POST', headers: authHeaders(true), body: JSON.stringify({ reason: reason || null }),
    });
  }
  unsuspendUser(id: string): Promise<{ message: string }> {
    return apiRequest(`/api/admin/users/${id}/unsuspend`, { method: 'POST', headers: authHeaders() });
  }
}
