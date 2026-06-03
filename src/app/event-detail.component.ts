import { environment } from '../environments/environment';
import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { smartGeocodeColombian } from './utils/colombian-geocoding';
import { StarRatingComponent } from './shared/Components/star-rating/star-rating';
import { ReviewCardComponent } from './shared/Components/review-card/review-card';
import { ReviewService } from './review.service';
import { Review, ReviewStats } from './models/review.model';
import { renderSafeMarkdown } from './utils/markdown';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, StarRatingComponent, ReviewCardComponent],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent implements OnInit, AfterViewInit {
  event: any = null;
  loading: boolean = true;

  // ── Estado de reseñas (sistema nuevo, media-estrella) ──
  userRating: number = 0;       // 0.5..5
  userTitle: string = '';
  userComment: string = '';     // cuerpo markdown
  hasReviewed: boolean = false;
  editing: boolean = false;
  eventReviews: Review[] = [];
  reviewStats: ReviewStats | null = null;
  myReview: Review | null = null;
  me: { id: string; username: string | null; profile_url: string | null } | null = null;
  readonly MAX_TITLE_LEN = 120;
  readonly MAX_BODY_LEN = 10000;

  photos: any[] = [];
  lightboxOpen = false;
  lightboxIndex = 0;

  get allPhotos(): string[] {
    const main = this.event?.image_url ? [this.event.image_url] : [];
    const extra = (this.photos || []).map((p: any) => p.url);
    return [...main, ...extra];
  }

  openLightbox(index: number) { this.lightboxOpen = true; this.lightboxIndex = index; this.cdr.detectChanges(); }
  closeLightbox() { this.lightboxOpen = false; this.cdr.detectChanges(); }
  prevPhoto() { this.lightboxIndex = (this.lightboxIndex - 1 + this.allPhotos.length) % this.allPhotos.length; this.cdr.detectChanges(); }
  nextPhoto() { this.lightboxIndex = (this.lightboxIndex + 1) % this.allPhotos.length; this.cdr.detectChanges(); }

  // ── Estado de envío de reseña ─────────────────────────
  submitting: boolean = false;
  submitError: string | null = null;
  submitSuccess: boolean = false;

  private map: any;
  private L: any; // Instancia global de Leaflet

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private reviewService: ReviewService
  ) {}

  ngOnInit() {
    const eventId = this.route.snapshot.paramMap.get('id');
    this.loadMe();
    if (eventId) this.loadEventDetail(eventId);
  }

  async ngAfterViewInit() {
    // Precargamos Leaflet exactamente como en tu Explorador
    if (isPlatformBrowser(this.platformId)) {
      try {
        const leafletModule = await import('leaflet');
        this.L = leafletModule.default || leafletModule;
      } catch (error) {
        console.error("Error iniciando Leaflet:", error);
      }
    }
  }

  async loadEventDetail(id: string) {
    try {
      this.loading = true;
      const res = await fetch(`${environment.apiUrl}/api/events/${id}`);
      if (res.ok) {
        this.event = await res.json();
        this.cdr.detectChanges();
        this.loadPhotos(id);
        this.loadReviewsAndStats(id);
        if (isPlatformBrowser(this.platformId) && this.L) {
          setTimeout(() => {
            this.initSingleMap();
          }, 300);
        }
      }
    } catch (e) {
      console.error("Error cargando detalle:", e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async initSingleMap() {
    if (!this.event || !document.getElementById('singleEventMap') || !this.L) return;

    if (this.map) {
        this.map.remove();
    }

    // Coordenadas base (Barranquilla) — solo se usan si el evento NO trae
    // lat/lng válidas en DB y la geocodificación también falla.
    let lat = 10.9685;
    let lng = -74.7813;
    let zoomLevel = 13;

    // ── PRIORIDAD 1: usar las coordenadas reales del evento si existen ──
    // Esto evita el bug donde el detalle del evento aparecía en una posición
    // aproximada por Nominatim aunque el evento ya tuviera lat/lng exactas.
    const dbLat = this.event.latitude != null ? parseFloat(this.event.latitude) : NaN;
    const dbLng = this.event.longitude != null ? parseFloat(this.event.longitude) : NaN;
    const validDbCoords =
      isFinite(dbLat) && isFinite(dbLng) &&
      dbLat >= -90 && dbLat <= 90 &&
      dbLng >= -180 && dbLng <= 180 &&
      !(dbLat === 0 && dbLng === 0);

    if (validDbCoords) {
      lat = dbLat;
      lng = dbLng;
      zoomLevel = 16;
    }

    // ── PRIORIDAD 2: geocodificación inteligente solo si no hay coords en DB ──
    // Reemplazamos el viejo Plan A/B manual por smartGeocodeColombian, que
    // prueba varias variantes de la dirección colombiana y valida que la
    // coordenada caiga dentro del bbox de la ciudad. Esto evita que un
    // evento de "Cra 47 #76" termine pintado en "Calle 30" porque Nominatim
    // agarró un punto cualquiera de la Carrera 47 entera.
    try {
      if (!validDbCoords && this.event.location_name) {
        const cityLabel = this.event.city || 'Barranquilla';
        const cityKey = (typeof cityLabel === 'string' ? cityLabel : 'Barranquilla').toLowerCase();
        const hit = await smartGeocodeColombian(this.event.location_name, cityLabel, cityKey);
        if (hit) {
          lat = hit.lat;
          lng = hit.lng;
          zoomLevel = 16; // Acercamos la cámara al encontrarlo
        }
      }
    } catch (e) {
      console.warn("Usando coordenadas base de la ciudad.");
    }

    // 1. Inicializar el mapa
    this.map = this.L.map('singleEventMap', { 
      zoomControl: false, 
      scrollWheelZoom: false,
      dragging: false 
    }).setView([lat, lng], zoomLevel);

    // 2. Capa oscura nativa (Igual que en el Explorador)
    this.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© VEMO Map'
    }).addTo(this.map);

    // 3. Crear el marcador de Burbuja con la foto del evento
    const bgImage = this.event.image_url || 'assets/placeholder.jpg'; 
    const color = '#FF4D80'; // Magenta Vemo por defecto

    const customIcon = this.L.divIcon({
      className: 'custom-vemo-marker',
      html: `<div class="vemo-marker-bubble" style="background-image: url('${bgImage}'); border-color: ${color}; box-shadow: 0 0 15px ${color};"></div>`,
      iconSize: [50, 50], 
      iconAnchor: [25, 25], 
      popupAnchor: [0, -25]
    });

    // 4. Añadirlo al mapa
    this.L.marker([lat, lng], { icon: customIcon })
      .addTo(this.map)
      .bindPopup(`<b style="color:black">${this.event.title}</b>`)
      .openPopup();
    
    // 5. Forzar el recálculo
    setTimeout(() => this.map.invalidateSize(), 500);
  }

  openGoogleMaps() {
    if (this.event && this.event.location_name) {
      const query = encodeURIComponent(`${this.event.location_name}, Barranquilla, Colombia`);
      const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
      window.open(url, '_blank');
    }
  }

  isPostEvent(): boolean {
    if (!this.event) return false;
    return new Date(this.event.date_event) < new Date();
  }

  // ── Carga del usuario actual (para detectar su propia reseña) ──
  private async loadMe() {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    if (!token) { this.me = null; return; }
    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/profile?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const u = data?.user;
        if (u?.id) this.me = { id: u.id, username: u.username ?? null, profile_url: u.profile_url ?? null };
      }
    } catch { /* sin sesión: se reseña como invitado bloqueado en submit */ }
  }

  // ── Carga reseñas + estadísticas del evento (endpoints nuevos) ──
  async loadReviewsAndStats(id: string) {
    try {
      const [page, stats] = await Promise.all([
        this.reviewService.listForSubject('event', id, { sort: 'recent', limit: 20 }),
        this.reviewService.eventStats(id),
      ]);
      this.eventReviews = page.items || [];
      this.reviewStats = stats;
      this.myReview = this.me ? (this.eventReviews.find(r => r.user_id === this.me!.id) || null) : null;
      this.hasReviewed = !!this.myReview;
    } catch (e) {
      // No rompemos la página si las reseñas fallan; el resto del detalle sigue.
      console.info('[Vemo] No se pudieron cargar reseñas:', (e as Error)?.message);
    } finally {
      this.cdr.detectChanges();
    }
  }

  /** Reseñas de la comunidad excluyendo la del usuario (que se muestra aparte). */
  get communityReviews(): Review[] {
    if (!this.myReview) return this.eventReviews;
    return this.eventReviews.filter(r => r.id !== this.myReview!.id);
  }

  onRatingChange(val: number) {
    this.userRating = val;
    if (this.submitError) this.submitError = null;
  }

  startEdit() {
    if (!this.myReview) return;
    this.editing = true;
    this.userRating = this.myReview.rating;
    this.userTitle = this.myReview.title || '';
    this.userComment = this.myReview.body || '';
    this.submitError = null;
    this.submitSuccess = false;
    this.cdr.detectChanges();
  }

  cancelEdit() {
    this.editing = false;
    this.userRating = 0;
    this.userTitle = '';
    this.userComment = '';
    this.submitError = null;
    this.cdr.detectChanges();
  }

  async submitReview() {
    if (this.submitting) return;
    if (!this.event?.id) return;

    if (this.userRating < 0.5 || this.userRating > 5) {
      this.submitError = 'Selecciona una calificación de 0.5 a 5 estrellas.';
      return;
    }
    const title = (this.userTitle || '').trim();
    const body = (this.userComment || '').trim();
    if (title.length > this.MAX_TITLE_LEN) {
      this.submitError = `El título no puede superar ${this.MAX_TITLE_LEN} caracteres.`;
      return;
    }
    if (body.length > this.MAX_BODY_LEN) {
      this.submitError = `La reseña no puede superar ${this.MAX_BODY_LEN} caracteres.`;
      return;
    }

    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    if (!token) {
      this.submitError = 'Debes iniciar sesión para dejar una reseña.';
      return;
    }

    this.submitting = true;
    this.submitError = null;
    this.submitSuccess = false;
    this.cdr.detectChanges();

    try {
      if (this.editing && this.myReview) {
        await this.reviewService.update(this.myReview.id, {
          rating: this.userRating,
          title: title || null,
          body: body || null,
        });
      } else {
        await this.reviewService.create({
          subject_type: 'event',
          subject_id: this.event.id,
          rating: this.userRating,
          title: title || null,
          body: body || null,
        });
      }

      this.submitSuccess = true;
      this.editing = false;
      this.userTitle = '';
      this.userComment = '';
      await this.loadReviewsAndStats(this.event.id);
    } catch (e: any) {
      this.submitError = e?.message || 'No pudimos enviar tu reseña. Inténtalo de nuevo.';
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  async deleteMyReview() {
    if (!this.myReview) return;
    if (!confirm('¿Eliminar tu reseña? Esta acción no se puede deshacer.')) return;
    try {
      await this.reviewService.remove(this.myReview.id);
      this.hasReviewed = false;
      this.myReview = null;
      this.userRating = 0;
      await this.loadReviewsAndStats(this.event.id);
    } catch (e: any) {
      this.submitError = e?.message || 'No se pudo eliminar la reseña.';
      this.cdr.detectChanges();
    }
  }

  /** Render seguro del cuerpo markdown para [innerHTML]. */
  renderBody(md: string | null): string {
    return renderSafeMarkdown(md);
  }

  /** Filas del histograma (de 5 a 0.5), con % relativo al pico. */
  histogramRows(): { star: number; count: number; pct: number }[] {
    const h = this.reviewStats?.histogram || {};
    const steps = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
    const counts = steps.map(s => h[String(s)] || 0);
    const max = Math.max(1, ...counts);
    return steps.map((s, i) => ({ star: s, count: counts[i], pct: Math.round((counts[i] / max) * 100) }));
  }

  async loadPhotos(id: string) {
    try {
      const res = await fetch(`${environment.apiUrl}/api/events/${id}/photos`);
      if (res.ok) {
        this.photos = await res.json();
        this.cdr.detectChanges();
      }
    } catch {}
  }

  photoTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      facade: 'Fachada',
      activity: 'Actividad',
      interior: 'Interior',
    };
    return labels[type] ?? type;
  }

  addToGoogleCalendar() {
    if(!this.event.date_event) return;
    const start = new Date(this.event.date_event).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(this.event.title)}&dates=${start}/${start}&details=${encodeURIComponent(this.event.description)}&location=${encodeURIComponent(this.event.location_name)}`;
    window.open(url, '_blank');
  }

  downloadIcsFile() {
    if(!this.event.date_event) return;
    const start = new Date(this.event.date_event).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${this.event.title}\nDTSTART:${start}\nLOCATION:${this.event.location_name}\nDESCRIPTION:${this.event.description}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vemo-event.ics';
    a.click();
  }
}