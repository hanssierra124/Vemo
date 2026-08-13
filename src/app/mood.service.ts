// ════════════════════════════════════════════════════════════════════
// MoodService: catálogo de emociones + confirmación de ambiente
// post-evento (punto B.6/B.7 de Notificaciones inteligentes).
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders } from './utils/api-client';
import { Emotion } from './models/emotion.model';
import { MoodSummary } from './models/mood.model';

@Injectable({ providedIn: 'root' })
export class MoodService {
  private emotionsCache: Emotion[] | null = null;
  private emotionsPending: Promise<Emotion[]> | null = null;

  getEmotions(): Promise<Emotion[]> {
    if (this.emotionsCache) return Promise.resolve(this.emotionsCache);
    if (this.emotionsPending) return this.emotionsPending;

    this.emotionsPending = apiRequest<Emotion[]>('/api/emotions')
      .then((data) => { this.emotionsCache = data; return data; })
      .catch(() => [])
      .finally(() => { this.emotionsPending = null; });

    return this.emotionsPending;
  }

  // Upsert: si el usuario ya había confirmado, el backend lo pisa sin error.
  // Puede rechazar con 400 si no hay asistencia (going/attended) o si el
  // evento aún no empezó — el llamador debe mostrar el mensaje del backend.
  confirmMood(eventId: string, emotionId: string): Promise<{ ok: boolean }> {
    return apiRequest(`/api/events/${eventId}/confirm-mood`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ emotion_id: emotionId }),
    });
  }

  getMoodSummary(eventId: string): Promise<MoodSummary> {
    return apiRequest<MoodSummary>(`/api/events/${eventId}/mood-confirmations/summary`);
  }
}
