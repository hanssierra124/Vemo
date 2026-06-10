// ════════════════════════════════════════════════════════════════════
// Servicio de Reseñas (Fase F1). Sigue la convención del proyecto:
// fetch() + token de localStorage + environment.apiUrl. Totalmente tipado.
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import {
  Review,
  ReviewRevision,
  ReviewStats,
  Paged,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewSubjectType,
  ListReviewsOptions,
} from './models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly base = environment.apiUrl;

  private token(): string | null {
    return localStorage.getItem('vemo_token') || localStorage.getItem('token');
  }

  private headers(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    const t = this.token();
    if (t) h['Authorization'] = `Bearer ${t}`;
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  /** Wrapper común: parsea JSON y lanza Error con el mensaje del backend. */
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.base}${path}`, init);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error((data && data.error) || `Error ${res.status}`);
    }
    return data as T;
  }

  private query(opts?: ListReviewsOptions): string {
    const p = new URLSearchParams();
    if (opts?.sort) p.set('sort', opts.sort);
    if (opts?.cursor) p.set('cursor', opts.cursor);
    if (opts?.limit) p.set('limit', String(opts.limit));
    const s = p.toString();
    return s ? `&${s}` : '';
  }

  // --- CRUD ----------------------------------------------------------
  create(input: CreateReviewInput): Promise<Review> {
    return this.request<Review>('/api/reviews', {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify(input),
    });
  }

  get(id: string): Promise<Review> {
    // Enviamos el token (si hay) para que el backend resuelva liked_by_me.
    return this.request<Review>(`/api/reviews/${id}`, { headers: this.headers() });
  }

  update(id: string, patch: UpdateReviewInput): Promise<Review> {
    return this.request<Review>(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: this.headers(true),
      body: JSON.stringify(patch),
    });
  }

  remove(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/reviews/${id}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
  }

  revisions(id: string): Promise<ReviewRevision[]> {
    return this.request<ReviewRevision[]>(`/api/reviews/${id}/revisions`, {
      headers: this.headers(),
    });
  }

  // --- LISTADOS ------------------------------------------------------
  listForSubject(
    subjectType: ReviewSubjectType,
    subjectId: string,
    opts?: ListReviewsOptions,
  ): Promise<Paged<Review>> {
    const q = `subject_type=${subjectType}&subject_id=${subjectId}${this.query(opts)}`;
    return this.request<Paged<Review>>(`/api/reviews?${q}`, { headers: this.headers() });
  }

  /**
   * Reseñas paginadas de un usuario (GET /api/users/:id/reviews).
   * Reservado para una futura sección "ver todas las reseñas" en el perfil
   * público (hoy el perfil solo muestra los previews recent/popular).
   */
  listForUser(userId: string, opts?: ListReviewsOptions): Promise<Paged<Review>> {
    const q = this.query(opts).replace(/^&/, '');
    return this.request<Paged<Review>>(`/api/users/${userId}/reviews${q ? `?${q}` : ''}`, { headers: this.headers() });
  }

  // --- STATS ---------------------------------------------------------
  // Nota: organizerStats() se eliminó por redundante — el endpoint
  // /api/organizers/:id/profile ya devuelve `stats` (ReviewStats).
  eventStats(eventId: string): Promise<ReviewStats> {
    return this.request<ReviewStats>(`/api/events/${eventId}/review-stats`);
  }
}
