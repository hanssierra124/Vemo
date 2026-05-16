import { environment } from '../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  pendingVerifications: any[] = [];
  loading = true;

  // Variables para el modal de detalles
  selectedVerification: any = null;

  // Variables para el visor de imágenes (si quieres ampliar la foto)
  previewImageUrl: string | null = null;
  isImageLoading = false;

  // ── Re-coordenación de eventos existentes ──
  recoordinating = false;
  recoordinateResult: { fixed?: number; skipped?: number; failed?: number; total?: number; details?: any[]; message?: string; error?: string } | null = null;

  // ── Editor de eventos / experiencias ──
  allEvents: any[] = [];
  loadingEvents = false;
  eventSearch = '';

  get filteredEvents(): any[] {
    const q = (this.eventSearch || '').trim().toLowerCase();
    if (!q) return this.allEvents;
    return this.allEvents.filter(ev =>
      (ev.title || '').toLowerCase().includes(q) ||
      (ev.location_name || '').toLowerCase().includes(q) ||
      (ev.profiles?.username || '').toLowerCase().includes(q) ||
      (ev.profiles?.company_name || '').toLowerCase().includes(q)
    );
  }

  constructor(private router: Router) {}

  async ngOnInit() {
    await this.loadVerifications();
    await this.loadAllEvents();
  }

  /**
   * Carga TODOS los eventos / experiencias para que el admin pueda editar
   * cualquiera (incluso los aprobados ya en producción).
   */
  async loadAllEvents() {
    this.loadingEvents = true;
    try {
      const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
      const res = await fetch(`${environment.apiUrl}/api/admin/all-events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        this.allEvents = await res.json();
      } else {
        console.warn('No se pudieron cargar eventos para el editor:', res.status);
      }
    } catch (err) {
      console.warn('Error cargando eventos:', err);
    } finally {
      this.loadingEvents = false;
    }
  }

  /**
   * Abre el formulario de edición (reutiliza CreateEventComponent en modo
   * edit, con todos los datos del evento pre-cargados — incluida la ubicación).
   */
  editEvent(eventId: string) {
    this.router.navigate(['/edit-event', eventId]);
  }

  async loadVerifications() {
    try {
      const res = await fetch(`${environment.apiUrl}/api/admin/verifications`);
      this.pendingVerifications = await res.json();
    } catch (error) {
      console.error("Error cargando verificaciones:", error);
    } finally {
      this.loading = false;
    }
  }

  // --- MÉTODOS DEL MODAL DE DETALLES ---
  openDetails(req: any) {
    this.selectedVerification = req;
  }

  closeDetails() {
    this.selectedVerification = null;
  }

  // --- MÉTODOS DE IMÁGENES ---
  openImagePreview(url: string) {
    if (!url) return;
    this.previewImageUrl = url;
    this.isImageLoading = true;
  }

  openImage(url: string) { this.openImagePreview(url); }
  viewImage(url: string) { this.openImagePreview(url); }

  closeImagePreview() {
    this.previewImageUrl = null;
    this.isImageLoading = false;
  }

  onImageLoad() {
    this.isImageLoading = false;
  }

  /**
   * Llama al endpoint admin que re-geocodifica eventos existentes con
   * coordenadas incorrectas o ausentes usando Google Maps Geocoding.
   *
   * @param force  Si true, re-geocodifica TODOS los eventos no verificados
   *               (incluso los que ya tienen coords pero pueden estar mal).
   *               Si false, solo los que tienen lat/lng nulas o (0,0).
   */
  async runRecoordinate(force: boolean = false) {
    if (this.recoordinating) return;
    const confirmMsg = force
      ? '¿Re-geocodificar TODOS los eventos no verificados con Google Maps? Esta operación puede tardar varios minutos según la cantidad de eventos.'
      : '¿Re-geocodificar solo eventos sin coordenadas? Esta operación es rápida.';
    if (!confirm(confirmMsg)) return;

    this.recoordinating = true;
    this.recoordinateResult = null;
    try {
      const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
      const url = `${environment.apiUrl}/api/admin/recoordinate-events${force ? '?force=true' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        this.recoordinateResult = { error: data?.error || `Error ${res.status}` };
      } else {
        this.recoordinateResult = data;
        // Limpiamos el cache local de geocoding para que el frontend lea
        // las coords actualizadas de la DB en la próxima carga.
        try { localStorage.removeItem('vemo_geocode_cache_v1'); } catch {}
      }
    } catch (err: any) {
      this.recoordinateResult = { error: err?.message || 'Error de conexión' };
    } finally {
      this.recoordinating = false;
    }
  }

  async processDecision(userId: string, status: string) {
    let reason = null;
    
    if (status === 'rejected') {
      reason = prompt('Razón del rechazo definitivo:');
      if (!reason) return;
    } else if (status === 'action_required') {
      reason = prompt('¿Qué debe corregir el organizador? (Ej: Foto borrosa):');
      if (!reason) return;
    }
    
    try {
      const res = await fetch(`${environment.apiUrl}/api/admin/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status, reason })
      });

      if (res.ok) {
        alert('Acción realizada con éxito');
        // Limpiamos de la lista local
        this.pendingVerifications = this.pendingVerifications.filter(v => v.id !== userId);
        // Cerramos el modal si estaba abierto
        if (this.selectedVerification && this.selectedVerification.id === userId) {
          this.closeDetails();
        }
      }
    } catch (error) {
      alert('Error al conectar con el servidor');
    }
  } 
}