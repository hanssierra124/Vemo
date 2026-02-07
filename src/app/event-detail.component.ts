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

  ngAfterViewInit() {}

  async loadEventDetail(id: string) {
    try {
      this.loading = true;
      // Al llamar a este GET, el backend dispara el RPC increment_event_views
      // Es vital que este ID llegue correctamente para sumar la vista en el panel del organizador
      const res = await fetch(`${environment.apiUrl}/api/events/${id}`);
      if (res.ok) {
        this.event = await res.json();
        this.cdr.detectChanges();
        
        if (isPlatformBrowser(this.platformId)) {
          this.initSingleMap();
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
    if (!this.event || !this.event.location_name) return;
    const L = await import('leaflet');
    
    try {
      const query = encodeURIComponent(this.event.location_name + ', Barranquilla');
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        this.map = L.map('singleEventMap', { 
          zoomControl: true, 
          scrollWheelZoom: false 
        }).setView([lat, lon], 16);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(this.map);
        L.marker([lat, lon]).addTo(this.map).bindPopup(this.event.title).openPopup();
        
        setTimeout(() => this.map.invalidateSize(), 500);
      }
    } catch (e) {
      console.error("Error cargando mapa", e);
    }
  }

  openGoogleMaps() {
    if (this.event && this.event.location_name) {
      // Corregimos la URL para que la redirección sea efectiva y directa
      const query = encodeURIComponent(`${this.event.location_name}, Barranquilla`);
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
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ rating: this.userRating, comment: this.userComment })
    });
    if (res.ok) {
      this.hasReviewed = true;
      this.loadEventDetail(this.event.id);
    }
  }

  addToGoogleCalendar() {
    const start = new Date(this.event.date_event).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(this.event.title)}&dates=${start}/${start}&details=${encodeURIComponent(this.event.description)}&location=${encodeURIComponent(this.event.location_name)}`;
    window.open(url, '_blank');
  }

  downloadIcsFile() {
    const start = new Date(this.event.date_event).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${this.event.title}\nDTSTART:${start}\nLOCATION:${this.event.location_name}\nDESCRIPTION:${this.event.description}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vemo-event.ics';
    a.click();
  }

  goBack() { this.location.back(); }
}