import { environment } from '../environments/environment';
import { Injectable } from '@angular/core'; 
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private storageKey = 'vemo_user_favorites';
  private favoritesSubject = new BehaviorSubject<any[]>([]);
  favorites$ = this.favoritesSubject.asObservable();

  constructor() {
    this.loadFavorites();
  }

  /**
   * Verifica si el evento es favorito (usado por el corazón).
   * Este método soluciona el error de propiedad inexistente visto en la consola.
   */
  isFavorite(eventId: string): boolean {
    return this.favoritesSubject.value.some((e: any) => e.id === eventId);
  }

  async loadFavorites() {
    // --- 1. LIMPIEZA ATÓMICA ---
    // Vaciamos el estado inmediatamente para evitar que se filtre data 
    // de la cuenta anterior durante el cambio de contexto en Barranquilla.
    this.favoritesSubject.next([]);

    // 2. Carga rápida desde local (si existe persistencia previa)
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.favoritesSubject.next(JSON.parse(saved));
      }
    }

    // 3. Carga real desde el backend filtrada por usuario
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${environment.apiUrl}/api/user/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const events = await res.json();
        // Sincronizamos con la verdad del servidor
        this.favoritesSubject.next(events);
        localStorage.setItem(this.storageKey, JSON.stringify(events));
      }
    } catch (e: any) {
      // Backend no disponible: mantenemos la cache local que ya se cargó arriba.
      // No mostramos console.error porque la app sigue funcionando con el snapshot
      // local — solo informamos para depuración.
      const isNetworkDown = e?.message === 'Failed to fetch' || e?.name === 'TypeError';
      if (isNetworkDown) {
        console.info('[Vemo] Backend offline — favoritos servidos desde cache local.');
      } else {
        console.warn('[Vemo] No se pudo sincronizar favoritos:', e?.message || e);
      }
    }
  }

  async toggleFavorite(event: any) {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    
    // --- LÓGICA OPTIMISTA (INSTANTÁNEA) ---
    const previousFavs = this.favoritesSubject.value;
    const exists = previousFavs.find((e: any) => e.id === event.id);
    
    let newFavs;
    if (exists) {
      newFavs = previousFavs.filter((e: any) => e.id !== event.id);
    } else {
      newFavs = [...previousFavs, event];
    }

    // Actualizamos la UI inmediatamente para una respuesta visual veloz
    this.favoritesSubject.next(newFavs);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(newFavs));
    }

    // Si no hay token, operamos solo localmente (Invitado)
    if (!token) return;

    try {
      // PETICIÓN AL BACKEND EN SEGUNDO PLANO
      // Esta petición dispara el RPC increment_event_favorites o decrement_event_favorites en la DB
      const res = await fetch(`${environment.apiUrl}/api/events/${event.id}/favorite`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });

      if (!res.ok) {
        throw new Error("Error en servidor");
      }
      
    } catch (e) {
      console.error("Fallo la sincronización, revirtiendo UI:", e);
      // REVERSIÓN EN CASO DE ERROR: Volvemos al estado anterior si la DB falla
      this.favoritesSubject.next(previousFavs);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(previousFavs));
      }
      alert("No se pudo guardar tu favorito en el servidor. Revisa tu conexión.");
    }
  }

  // Mantenemos este método para compatibilidad o fallbacks de red
  private handleLocalToggle(event: any) {
    let currentFavs = this.favoritesSubject.value;
    const exists = currentFavs.find((e: any) => e.id === event.id);
    currentFavs = exists 
      ? currentFavs.filter((e: any) => e.id !== event.id) 
      : [...currentFavs, event];

    this.favoritesSubject.next(currentFavs);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(currentFavs));
    }
  }

  clear() {
    // Limpieza absoluta para el logout: evita que el siguiente usuario vea tus datos
    this.favoritesSubject.next([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}