// ════════════════════════════════════════════════════════════════════
// Cliente HTTP compartido (DRY) para los servicios de reseñas/social.
// Convención del proyecto: fetch() + token de localStorage + environment.
// Lanza Error con el mensaje del backend en respuestas no-OK.
// ════════════════════════════════════════════════════════════════════
import { environment } from '../../environments/environment';

export function authToken(): string | null {
  return localStorage.getItem('vemo_token') || localStorage.getItem('token');
}

export function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  const t = authToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${environment.apiUrl}${path}`, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error((data && data.error) || `Error ${res.status}`);
  }
  return data as T;
}

/** Construye un querystring de paginación opcional (sort/cursor/limit…). */
export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') p.set(k, String(val));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}
