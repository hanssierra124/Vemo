// ════════════════════════════════════════════════════════════════════
// SocialService (Fase F2): likes, comentarios/respuestas, follow/unfollow.
// Usa el cliente HTTP compartido (api-client). Totalmente tipado.
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders, buildQuery } from './utils/api-client';
import { Paged } from './models/review.model';
import {
  ReviewComment,
  LikeResult,
  FollowResult,
  FollowUserItem,
} from './models/social.model';

interface PageOpts { cursor?: string | null; limit?: number; }

@Injectable({ providedIn: 'root' })
export class SocialService {
  // ── LIKES ──────────────────────────────────────────────────────────
  like(reviewId: string): Promise<LikeResult> {
    return apiRequest<LikeResult>(`/api/reviews/${reviewId}/like`, {
      method: 'POST', headers: authHeaders(),
    });
  }

  unlike(reviewId: string): Promise<LikeResult> {
    return apiRequest<LikeResult>(`/api/reviews/${reviewId}/like`, {
      method: 'DELETE', headers: authHeaders(),
    });
  }

  // ── COMENTARIOS ────────────────────────────────────────────────────
  listComments(reviewId: string, opts?: PageOpts): Promise<Paged<ReviewComment>> {
    const q = buildQuery({ cursor: opts?.cursor, limit: opts?.limit });
    return apiRequest<Paged<ReviewComment>>(`/api/reviews/${reviewId}/comments${q}`);
  }

  addComment(reviewId: string, body: string): Promise<ReviewComment> {
    return apiRequest<ReviewComment>(`/api/reviews/${reviewId}/comments`, {
      method: 'POST', headers: authHeaders(true), body: JSON.stringify({ body }),
    });
  }

  reply(commentId: string, body: string): Promise<ReviewComment> {
    return apiRequest<ReviewComment>(`/api/comments/${commentId}/replies`, {
      method: 'POST', headers: authHeaders(true), body: JSON.stringify({ body }),
    });
  }

  deleteComment(commentId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/comments/${commentId}`, {
      method: 'DELETE', headers: authHeaders(),
    });
  }

  // ── FOLLOW ─────────────────────────────────────────────────────────
  follow(userId: string): Promise<FollowResult> {
    return apiRequest<FollowResult>(`/api/users/${userId}/follow`, {
      method: 'POST', headers: authHeaders(),
    });
  }

  unfollow(userId: string): Promise<FollowResult> {
    return apiRequest<FollowResult>(`/api/users/${userId}/follow`, {
      method: 'DELETE', headers: authHeaders(),
    });
  }

  followers(userId: string, opts?: PageOpts): Promise<Paged<FollowUserItem>> {
    const q = buildQuery({ cursor: opts?.cursor, limit: opts?.limit });
    return apiRequest<Paged<FollowUserItem>>(`/api/users/${userId}/followers${q}`);
  }

  following(userId: string, opts?: PageOpts): Promise<Paged<FollowUserItem>> {
    const q = buildQuery({ cursor: opts?.cursor, limit: opts?.limit });
    return apiRequest<Paged<FollowUserItem>>(`/api/users/${userId}/following${q}`);
  }
}
