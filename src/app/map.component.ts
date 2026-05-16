import { environment } from '../environments/environment';
import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { smartGeocodeColombian } from './utils/colombian-geocoding';

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
  activeEmotionName: string | null = null;
  locatingUser = false;
  // Eventos cerca del usuario: poblado automáticamente al conceder geolocalización
  // (top 3 más cercanos por Haversine) y reemplazado si el usuario aprieta el
  // botón "Localizar" (que consulta el endpoint /api/events/nearby).
  nearbyEvents: any[] = [];
  showNearbyPanel = false;
  showRoutePanel = false;
  routeInfo: { distance: string; duration: string; destTitle: string } | null = null;
  // Estado del permiso del navegador para geolocalización.
  geoStatus: 'idle' | 'requesting' | 'granted' | 'denied' | 'error' = 'idle';
  private userMarker: any = null;
  private userLat: number | null = null;
  private userLng: number | null = null;
  private routeLayers: any[] = [];
  private coordinateCache: any = {};

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    public router: Router
  ) {}

  ngOnInit() {
    this.loadData();
    (window as any).__vemoDetail     = (id: string) => this.router.navigate(['/event', id]);
    (window as any).__vemoRoute      = (lat: number, lng: number, title: string) => this.getRoute(lat, lng, title);
    (window as any).__vemoClosePopup = () => this.map?.closePopup();
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

    this.map.on('popupclose', () => { this.clearRoute(); });

    if (this.events.length > 0) this.drawMapContent();

    // Pedimos la ubicación del usuario después de inicializar el mapa.
    // No bloqueante: si la deniega o falla, el mapa funciona igual.
    this.requestUserLocation();
  }

  /**
   * Solicita la geolocalización del navegador. NO es invasivo:
   * si el usuario la rechaza o falla, simplemente no se dibuja
   * el marcador y nearestEvents queda vacío.
   */
  requestUserLocation() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!navigator?.geolocation) {
      this.geoStatus = 'error';
      return;
    }
    this.geoStatus = 'requesting';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLat = pos.coords.latitude;
        this.userLng = pos.coords.longitude;
        this.geoStatus = 'granted';
        this.placeUserMarker();
        this.computeNearestEvents();
        this.cdr.detectChanges();
      },
      (err) => {
        console.warn('[Vemo] Geolocalización no disponible:', err.message);
        this.geoStatus = err.code === err.PERMISSION_DENIED ? 'denied' : 'error';
        this.cdr.detectChanges();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  /** Pinta un marcador animado con la ubicación del usuario en tiempo real. */
  private placeUserMarker() {
    if (!this.map || !this.L || this.userLat == null || this.userLng == null) return;
    if (this.userMarker) this.map.removeLayer(this.userMarker);

    const userIcon = this.L.divIcon({
      className: 'user-location-marker',
      html: `<div class="ulm-pulse"></div><div class="ulm-dot"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    this.userMarker = this.L.marker([this.userLat, this.userLng], {
      icon: userIcon,
      zIndexOffset: 1000,
    })
      .bindPopup('Estás aquí')
      .addTo(this.map);
  }

  /**
   * Distancia Haversine en kilómetros entre dos coordenadas.
   * Pura, testeable, sin dependencias externas.
   */
  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // radio de la Tierra en km
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Calcula y guarda los 3 eventos más cercanos al usuario.
   * Solo considera eventos con latitude/longitude válidas en la DB
   * (no re-geocodifica para evitar llamadas externas masivas).
   */
  private computeNearestEvents() {
    if (this.userLat == null || this.userLng == null) {
      this.nearbyEvents = [];
      this.showNearbyPanel = false;
      return;
    }
    const candidates = (this.events || [])
      .map((ev) => {
        const lat = ev.latitude != null ? parseFloat(ev.latitude) : NaN;
        const lng = ev.longitude != null ? parseFloat(ev.longitude) : NaN;
        if (!isFinite(lat) || !isFinite(lng)) return null;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
        const distance_km = this.haversineKm(this.userLat!, this.userLng!, lat, lng);
        return { ...ev, distance_km };
      })
      .filter((x): x is any => x !== null)
      .sort((a, b) => a.distance_km - b.distance_km);

    this.nearbyEvents = candidates.slice(0, 3);
    this.showNearbyPanel = this.nearbyEvents.length > 0;
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
      let lat = ev.latitude != null ? parseFloat(ev.latitude) : null;
      let lng = ev.longitude != null ? parseFloat(ev.longitude) : null;

      // Validación estricta: rango válido de coordenadas + no ser (0,0)
      // ya que ese par suele indicar coords no inicializadas en DB.
      const validCoords =
        lat !== null && lng !== null &&
        isFinite(lat) && isFinite(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180 &&
        !(lat === 0 && lng === 0);

      if (!validCoords) {
        lat = null;
        lng = null;
        if (ev.latitude != null || ev.longitude != null) {
          console.warn(`[Vemo Map] Evento "${ev.title}" tiene coordenadas inválidas en DB:`, ev.latitude, ev.longitude);
        }
      }

      // Fallback a geocoding inteligente solo si NO había coords válidas en DB.
      // Usamos smartGeocodeColombian: prueba varias variantes de la dirección
      // colombiana (Carrera/Calle, intersección, con/sin '#', etc.) y valida
      // que el resultado caiga dentro del bbox de la ciudad. Esto evita que
      // un evento de "Cra 47 #76" termine pintado en cualquier punto de la
      // Carrera 47 (la calle entera) cuando Nominatim no encuentra el número.
      if ((!lat || !lng) && ev.location_name) {
        // Cache para no re-geocodificar la misma dirección entre re-renders.
        if (this.coordinateCache[ev.location_name]) {
          lat = this.coordinateCache[ev.location_name].lat;
          lng = this.coordinateCache[ev.location_name].lng;
        } else {
          const cityLabel = ev.city || 'Barranquilla';
          const cityKey = (typeof cityLabel === 'string' ? cityLabel : 'Barranquilla').toLowerCase();
          const hit = await smartGeocodeColombian(ev.location_name, cityLabel, cityKey);
          if (hit) {
            lat = hit.lat;
            lng = hit.lng;
            this.coordinateCache[ev.location_name] = { lat, lng };
          } else {
            console.info(`[Vemo Map] Sin geocodificación válida para "${ev.location_name}" — el evento no se pintará.`);
          }
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
        // Envolvemos la burbuja en un contenedor con dos ondas radar que
        // pulsan hacia afuera con el color de la emoción del evento. Las
        // ondas se posicionan absolutas detrás de la burbuja y se animan
        // con CSS (ver .vemo-radar-wave en map.component.css).
        const customIcon = this.L.divIcon({
          className: 'custom-vemo-marker',
          html: `
            <div class="vemo-marker-wrap" style="--radar-color: ${color};">
              <span class="vemo-radar-wave"></span>
              <span class="vemo-radar-wave vemo-radar-wave--delay"></span>
              <div class="vemo-marker-bubble" style="background-image: url('${bgImage}'); border-color: ${color}; box-shadow: 0 0 15px ${color};"></div>
            </div>`,
          iconSize: [50, 50], iconAnchor: [25, 25], popupAnchor: [0, -25]
        });
        const marker = this.L.marker([i.lat, i.lng], { icon: customIcon });
        const safeTitle = i.title.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        const thumb = i.image ? `<div style="width:100%;height:72px;border-radius:8px;background:url('${i.image}') center/cover no-repeat;margin-bottom:10px;flex-shrink:0"></div>` : '';
        marker.bindPopup(`
          <div style="background:#0d0d12;border:1px solid ${color}55;border-radius:14px;padding:12px;min-width:190px;font-family:system-ui,sans-serif;box-shadow:0 0 24px ${color}25,0 8px 32px rgba(0,0,0,0.6);position:relative">
            <button onclick="window.__vemoClosePopup()" style="position:absolute;top:8px;right:8px;background:rgba(245,243,239,0.08);border:none;color:rgba(245,243,239,0.5);width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif">✕</button>
            ${thumb}
            <b style="color:#F5F3EF;font-size:13px;font-weight:700;display:block;margin-bottom:4px;line-height:1.3;padding-right:26px">${i.title}</b>
            <span style="color:${color};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:12px">● ${emotionName}</span>
            <div style="display:flex;gap:7px">
              <button onclick="window.__vemoDetail('${i.id}')"
                style="flex:1;padding:8px 0;background:rgba(245,243,239,0.07);color:#F5F3EF;border:1px solid rgba(245,243,239,0.12);border-radius:8px;cursor:pointer;font-size:11px;font-weight:600;font-family:system-ui,sans-serif">
                Ver evento
              </button>
              <button onclick="window.__vemoRoute(${i.lat},${i.lng},'${safeTitle}')"
                style="flex:1;padding:8px 0;background:${color};color:#000;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:800;font-family:system-ui,sans-serif">
                🗺 Ruta
              </button>
            </div>
          </div>`, { maxWidth: 220, className: 'vemo-popup' });
        marker.addTo(this.map);
        this.markerLayers.push(marker);
      });
    });
  }

  /** Navega al detalle de un evento desde el panel "Cerca de ti". */
  goToEventDetail(eventId: string) {
    this.router.navigate(['/event', eventId]);
  }

  toggleEmotionFilter(emotion: any) {
    this.activeEmotionName = (this.activeEmotionName === emotion.name) ? null : emotion.name;
    this.drawMapContent();
  }

  private getUserLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (this.userLat !== null && this.userLng !== null) {
        resolve({ lat: this.userLat, lng: this.userLng });
        return;
      }
      if (!navigator.geolocation) { reject(new Error('no geolocation')); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLat = pos.coords.latitude;
          this.userLng = pos.coords.longitude;
          if (this.userMarker) this.map.removeLayer(this.userMarker);
          const icon = this.L.divIcon({
            className: '',
            html: `<div style="width:18px;height:18px;background:#4A90E2;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(74,144,226,0.25);"></div>`,
            iconSize: [18, 18], iconAnchor: [9, 9]
          });
          this.userMarker = this.L.marker([this.userLat, this.userLng], { icon })
            .addTo(this.map)
            .bindPopup('<b style="color:#000">Tu ubicación</b>');
          resolve({ lat: this.userLat!, lng: this.userLng! });
        },
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async locateUser() {
    this.locatingUser = true;
    this.cdr.detectChanges();
    try {
      const { lat, lng } = await this.getUserLocation();
      this.map.setView([lat, lng], 14);
      this.userMarker?.openPopup();
      const res = await fetch(`${environment.apiUrl}/api/events/nearby?lat=${lat}&lng=${lng}&radius=5`);
      if (res.ok) {
        this.nearbyEvents = await res.json();
        this.showNearbyPanel = this.nearbyEvents.length > 0;
      }
    } catch {}
    this.locatingUser = false;
    this.cdr.detectChanges();
  }

  async getRoute(toLat: number, toLng: number, destTitle: string) {
    this.clearRoute();
    try {
      const { lat: uLat, lng: uLng } = await this.getUserLocation();
      const url = `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${toLng},${toLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code !== 'Ok') return;

      const route = data.routes[0];
      const coords: [number, number][] = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);

      const shadow = this.L.polyline(coords, { color: '#000', weight: 9, opacity: 0.35, lineCap: 'round', lineJoin: 'round' }).addTo(this.map);
      const line   = this.L.polyline(coords, { color: '#FF4D80', weight: 4, opacity: 1,    lineCap: 'round', lineJoin: 'round' }).addTo(this.map);
      this.routeLayers = [shadow, line];

      this.map.fitBounds(line.getBounds(), { padding: [80, 80] });

      this.routeInfo = {
        distance: `${(route.distance / 1000).toFixed(1)} km`,
        duration: `${Math.round(route.duration / 60)} min`,
        destTitle
      };
      this.showRoutePanel = true;
      this.cdr.detectChanges();
    } catch (e) { console.error('Error ruta:', e); }
  }

  clearRoute() {
    this.routeLayers.forEach(l => this.map.removeLayer(l));
    this.routeLayers = [];
    this.showRoutePanel = false;
    this.routeInfo = null;
    this.cdr.detectChanges();
  }

  closeNearbyPanel() {
    this.showNearbyPanel = false;
    this.cdr.detectChanges();
  }
}