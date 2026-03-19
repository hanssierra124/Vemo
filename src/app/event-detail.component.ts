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

  setRating(val: number) { this.userRating = val; }

  async submitReview() {
    if (this.userRating === 0) return;
    const token = localStorage.getItem('token') || localStorage.getItem('vemo_token');
    const res = await fetch(`${environment.apiUrl}/api/events/${this.event.id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ rating: this.userRating, comment: this.userComment })
    });
    if (res.ok) {
      this.hasReviewed = true;
      this.loadEventDetail(this.event.id);
    }
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