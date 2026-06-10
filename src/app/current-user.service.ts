// ════════════════════════════════════════════════════════════════════
// CurrentUserService — resuelve y CACHEA el usuario autenticado vía
// /api/auth/profile. Evita repetir el mismo fetch en navbar, feed,
// event-detail y los perfiles públicos. En modo zoneless no maneja CD:
// los componentes consumidores llaman a detectChanges() si lo necesitan.
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { authToken } from './utils/api-client';

export interface CurrentUser {
  id: string;
  username: string | null;
  profile_url: string | null;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  // undefined = aún no resuelto · null = anónimo · objeto = autenticado
  private cache: CurrentUser | null | undefined = undefined;
  private inflight: Promise<CurrentUser | null> | null = null;

  /** Usuario autenticado (cacheado). Devuelve null si no hay sesión. */
  async getMe(): Promise<CurrentUser | null> {
    if (this.cache !== undefined) return this.cache;
    if (this.inflight) return this.inflight;

    const token = authToken();
    if (!token) { this.cache = null; return null; }

    this.inflight = fetch(`${environment.apiUrl}/api/auth/profile?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const u = data?.user;
        this.cache = u?.id
          ? { id: u.id, username: u.username ?? null, profile_url: u.profile_url ?? null, role: u.role ?? 'user' }
          : null;
        return this.cache;
      })
      .catch(() => { this.cache = null; return this.cache; })
      .finally(() => { this.inflight = null; });

    return this.inflight;
  }

  /** Id del usuario autenticado o null. */
  async getMyId(): Promise<string | null> {
    return (await this.getMe())?.id ?? null;
  }

  /** Invalida la caché (p. ej. tras login/logout). */
  clear() { this.cache = undefined; this.inflight = null; }
}
