import { environment } from '../environments/environment';
import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit {
  private map: any;
  private heatLayers: any[] = [];
  private markerLayers: any[] = [];
  private L: any; 

  events: any[] = [];
  availableEmotions: any[] = [];
  loading: boolean = true;
  activeEmotionName: string | null = null; // Filtramos por nombre para evitar errores de ID
  
  private coordinateCache: any = {}; 

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const leafletModule = await import('leaflet');
        this.L = leafletModule.default || leafletModule;
        (window as any).L = this.L;
        await import('leaflet.heat');
        this.initMap();
      } catch (error) { 
        console.error("❌ Error iniciando Leaflet:", error);
        this.loading = false;
      }
    }
  }

  async loadData() {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('vemo_token');
      const headers: any = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [eventsRes, emotionsRes] = await Promise.all([
        fetch(`${environment.apiUrl}/api/events`, { headers }),
        fetch(`${environment.apiUrl}/api/emotions`, { headers })
      ]);

      if (eventsRes.ok) this.events = await eventsRes.json();
      if (emotionsRes.ok) this.availableEmotions = await emotionsRes.json();

    } catch (e) { console.error("Error datos:", e); } 
    finally {
      if (this.map && this.events.length > 0) {
        this.drawMapContent(); 
      } else {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }
  }

  initMap() {
    if (!document.getElementById('main-map') || !this.L) return;

    this.map = this.L.map('main-map', {
      zoomControl: false,
      center: [10.9685, -74.7813],
      zoom: 13
    });

    this.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO',
      maxZoom: 20
    }).addTo(this.map);

    if (this.events.length > 0) this.drawMapContent();
  }

  public getColorForEmotion(emotionName: string): string {
    if (!emotionName) return '#FFFFFF';
    const name = emotionName.toLowerCase();
    if (name.includes('alegría') || name.includes('diversión')) return '#FFA500';
    if (name.includes('curiosidad') || name.includes('aprendizaje')) return '#FFD700';
    if (name.includes('emoción') || name.includes('adrenalina')) return '#FF4500';
    if (name.includes('inspiración') || name.includes('creatividad')) return '#FF1493';
    if (name.includes('introspección') || name.includes('contemplación')) return '#4B0082';
    if (name.includes('nostalgia')) return '#A9A9A9';
    if (name.includes('relajación') || name.includes('calma')) return '#00FFFF';
    if (name.includes('tristeza')) return '#1E90FF';
    if (name.includes('miedo')) return '#9400D3';
    if (name.includes('ira') || name.includes('rabia')) return '#FF0000';
    if (name.includes('amor')) return '#FF69B4';
    return '#FFFFFF';
  }

  async drawMapContent() {
    if (!this.map || !this.L) return;
    
    this.loading = true;
    this.cdr.detectChanges();

    // 1. Limpieza total de puntos previos
    this.heatLayers.forEach(l => this.map.removeLayer(l));
    this.markerLayers.forEach(l => this.map.removeLayer(l));
    this.heatLayers = [];
    this.markerLayers = [];

    // 2. Filtrado por nombre (mucho más robusto que por ID)
    let eventsToDraw = this.events;
    if (this.activeEmotionName) {
      eventsToDraw = this.events.filter(e => e.emotions?.name === this.activeEmotionName);
    }

    const groupedData: any = {};

    for (const ev of eventsToDraw) {
      let lat = ev.latitude ? parseFloat(ev.latitude) : null;
      let lng = ev.longitude ? parseFloat(ev.longitude) : null;

      // Geocoding si no hay coordenadas (Exactamente igual que en "Todo el Caos")
      if ((!lat || !lng) && ev.location_name) {
        if (this.coordinateCache[ev.location_name]) {
          lat = this.coordinateCache[ev.location_name].lat;
          lng = this.coordinateCache[ev.location_name].lng;
        } else {
          try {
            const query = encodeURIComponent(ev.location_name);
            const url = `https://photon.komoot.io/api/?q=${query}&lat=10.96&lon=-74.80&limit=1`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.features?.length > 0) {
              lng = data.features[0].geometry.coordinates[0];
              lat = data.features[0].geometry.coordinates[1];
              this.coordinateCache[ev.location_name] = { lat, lng };
            }
          } catch (err) { }
        }
      }

      if (lat && lng) {
        const emotionName = ev.emotions?.name || 'Neutro';
        if (!groupedData[emotionName]) groupedData[emotionName] = [];
        groupedData[emotionName].push({ lat, lng, title: ev.title, id: ev.id, image: ev.image_url });
      }
    }

    // 3. Dibujar si hay puntos
    if (Object.keys(groupedData).length > 0) {
      this.drawLayers(groupedData);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  drawLayers(groupedData: any) {
    Object.keys(groupedData).forEach(emotionName => {
      const items = groupedData[emotionName];
      const color = this.getColorForEmotion(emotionName);

      const heatPoints = items.map((i: any) => [i.lat, i.lng, 1.0]);
      const heatFn = (this.L as any).heatLayer || (window as any).L?.heatLayer;
      
      if (typeof heatFn === 'function' && heatPoints.length > 0) {
        const heatLayer = heatFn(heatPoints, { 
          radius: 60, blur: 40, gradient: { 0.4: color, 1.0: color }, minOpacity: 0.3 
        });
        heatLayer.addTo(this.map);
        this.heatLayers.push(heatLayer);
      }

      items.forEach((i: any) => {
        const bgImage = i.image || 'assets/placeholder.jpg'; 
        const customIcon = this.L.divIcon({
          className: 'custom-vemo-marker',
          html: `<div class="vemo-marker-bubble" style="background-image: url('${bgImage}'); border-color: ${color}; box-shadow: 0 0 15px ${color};"></div>`,
          iconSize: [50, 50], iconAnchor: [25, 25], popupAnchor: [0, -25]
        });
        const marker = this.L.marker([i.lat, i.lng], { icon: customIcon });
        marker.bindPopup(`<b style="color:black">${i.title}</b><br><span style="color:${color}">● ${emotionName}</span>`);
        marker.on('click', () => this.router.navigate(['/event', i.id]));
        marker.addTo(this.map);
        this.markerLayers.push(marker);
      });
    });
  }

  toggleEmotionFilter(emotion: any) {
    // Si ya está activo, desactivamos el filtro. Si no, lo activamos por NOMBRE.
    this.activeEmotionName = (this.activeEmotionName === emotion.name) ? null : emotion.name;
    this.drawMapContent();
  }
}