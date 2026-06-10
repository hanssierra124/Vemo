// ════════════════════════════════════════════════════════════════════
// PredictionService (Asistiré Inteligente — Fase A4).
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders } from './utils/api-client';
import { EventPrediction } from './models/prediction.model';

@Injectable({ providedIn: 'root' })
export class PredictionService {
  getPrediction(eventId: string): Promise<EventPrediction> {
    return apiRequest<EventPrediction>(`/api/events/${eventId}/prediction`, { headers: authHeaders() });
  }
}
