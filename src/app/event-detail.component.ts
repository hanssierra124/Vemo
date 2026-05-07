import { environment } from '../environments/environment';
import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent implements OnInit, AfterViewInit {
  event: any = null;
  loading: boolean = true;
  userRating: number = 0;
  userComment: string = '';
  hasReviewed: boolean = false;

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
  readonly MAX_COMMENT_LEN = 500;

  private map: any;
  private L: any; // Instancia global de Leaflet

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const eventId = this.route.snapshot.paramMap.get('id');
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

    // Coordenadas base (Barranquilla)
    let lat = 10.9685;
    let lng = -74.7813;
    let zoomLevel = 13;

    try {
      if (this.event.location_name) {
        // PLAN A: Búsqueda exacta
        let query = encodeURIComponent(`${this.event.location_name}, Barranquilla`);
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
        let res = await fetch(url);
        let data = await res.json();

        // PLAN B: Búsqueda limpia (Tu truco del Explorador)
        if (!data || data.length === 0) {
          console.warn(`Buscando con Plan B para: ${this.event.location_name}`);
          const cleanAddress = this.event.location_name.split('-')[0].replace('#', ''); 
          query = encodeURIComponent(`${cleanAddress}, Barranquilla`);
          url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
          res = await fetch(url);
          data = await res.json();
        }

        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
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

  setRating(val: number) {
    if (this.submitting) return;
    this.userRating = val;
    if (this.submitError) this.submitError = null;
  }

  async submitReview() {
    // Idempotency: ignore rapid double-clicks while a request is in flight
    if (this.submitting) return;
    if (!this.event?.id) return;

    // Validation
    if (this.userRating < 1 || this.userRating > 5) {
      this.submitError = 'Por favor selecciona una calificación entre 1 y 5 estrellas.';
      return;
    }
    const comment = (this.userComment || '').trim();
    if (comment.length > this.MAX_COMMENT_LEN) {
      this.submitError = `El comentario no puede superar ${this.MAX_COMMENT_LEN} caracteres.`;
      return;
    }

    // Auth
    const token = localStorage.getItem('token') || localStorage.getItem('vemo_token');
    if (!token) {
      this.submitError = 'Debes iniciar sesión para dejar una reseña.';
      return;
    }

    this.submitting = true;
    this.submitError = null;
    this.submitSuccess = false;
    this.cdr.detectChanges();

    try {
      const res = await fetch(`${environment.apiUrl}/api/events/${this.event.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          event_id: this.event.id,
          rating: this.userRating,
          comment: comment || null
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const msg = errBody?.message || errBody?.error || `Error ${res.status}`;
        throw new Error(msg);
      }

      const created = await res.json().catch(() => null);

      // Update local list so the new review appears immediately without
      // re-fetching the whole event (which would re-init the map).
      const optimistic = created && (created.id || created.rating !== undefined)
        ? created
        : {
            rating: this.userRating,
            comment: comment,
            username: this.getCurrentUsername() || 'Tú',
            created_at: new Date().toISOString(),
          };

      this.event = {
        ...this.event,
        reviews: [optimistic, ...(this.event.reviews || [])]
      };

      this.hasReviewed = true;
      this.submitSuccess = true;
      this.userComment = '';

      // Best-effort sync with backend for accurate usernames/IDs
      this.refreshReviews().catch(() => { /* fallback already shown */ });
    } catch (e: any) {
      console.error('Error enviando reseña:', e);
      this.submitError = e?.message || 'No pudimos enviar tu reseña. Inténtalo de nuevo.';
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  private async refreshReviews() {
    if (!this.event?.id) return;
    const res = await fetch(`${environment.apiUrl}/api/events/${this.event.id}/reviews`);
    if (!res.ok) return;
    const reviews = await res.json();
    if (Array.isArray(reviews)) {
      this.event = { ...this.event, reviews };
      this.cdr.detectChanges();
    }
  }

  private getCurrentUsername(): string | null {
    try {
      const raw = localStorage.getItem('vemo_user') || localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.username || parsed?.name || parsed?.email || null;
    } catch {
      return null;
    }
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