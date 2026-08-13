// ════════════════════════════════════════════════════════════════════
// RecommendationService (Asistiré Inteligente — Fase A6).
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders, buildQuery } from './utils/api-client';
import { PersonSuggestion, RecommendedEvent, NearbyPlace } from './models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  peopleSuggestions(limit = 10): Promise<{ items: PersonSuggestion[] }> {
    return apiRequest(`/api/me/suggestions/people${buildQuery({ limit })}`, { headers: authHeaders() });
  }

  eventRecommendations(limit = 12): Promise<{ items: RecommendedEvent[] }> {
    return apiRequest(`/api/me/recommendations/events${buildQuery({ limit })}`, { headers: authHeaders() });
  }

  // [] es normal para usuarios sin historial de asistencia/favoritos con
  // organizadores que tengan creator_type seteado — no es un error.
  nearbyPlaces(limit = 8): Promise<{ items: NearbyPlace[] }> {
    return apiRequest(`/api/me/suggestions/nearby-places${buildQuery({ limit })}`, { headers: authHeaders() });
  }
}
