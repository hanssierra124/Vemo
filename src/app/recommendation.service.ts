// ════════════════════════════════════════════════════════════════════
// RecommendationService (Asistiré Inteligente — Fase A6).
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders, buildQuery } from './utils/api-client';
import { PersonSuggestion, RecommendedEvent } from './models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  peopleSuggestions(limit = 10): Promise<{ items: PersonSuggestion[] }> {
    return apiRequest(`/api/me/suggestions/people${buildQuery({ limit })}`, { headers: authHeaders() });
  }

  eventRecommendations(limit = 12): Promise<{ items: RecommendedEvent[] }> {
    return apiRequest(`/api/me/recommendations/events${buildQuery({ limit })}`, { headers: authHeaders() });
  }
}
