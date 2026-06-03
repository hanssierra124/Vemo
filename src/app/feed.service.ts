// ════════════════════════════════════════════════════════════════════
// FeedService (Fase F3): feed social PULL de las personas seguidas.
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders, buildQuery } from './utils/api-client';
import { FeedPage } from './models/feed.model';

@Injectable({ providedIn: 'root' })
export class FeedService {
  getFeed(opts?: { cursor?: string | null; limit?: number }): Promise<FeedPage> {
    const q = buildQuery({ cursor: opts?.cursor, limit: opts?.limit });
    return apiRequest<FeedPage>(`/api/feed${q}`, { headers: authHeaders() });
  }
}
