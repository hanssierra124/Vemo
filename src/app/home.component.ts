import { environment } from '../environments/environment';
import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FavoritesService } from './favorites.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  events: any[] = [];
  availableEmotions: any[] = [];
  loading: boolean = true;
  private map: any;
  mapMarkers: any[] = [];
  private mapHeatLayers: any[] = [];
  private mapReady: boolean = false;          // ← flag: mapa listo
  private eventsReady: boolean = false;       // ← flag: eventos listos
  activeEmotionName: string | null = null;
  mapLoading: boolean = false;
  hudHidden: boolean = false;
  private coordinateCache: { [key: string]: { lat: number; lng: number } } = {};

  // ── ONBOARDING ──────────────────────────────────────
  showOnboarding: boolean = false;
  closingOnboarding: boolean = false;
  onboardingStep: number = 1;
  selectedEmotion: any = null;
  selectedCompany: string = '';
  selectedTime: string = '';
  particles: any[] = [];

  companyOptions = [
    { icon: '🧍', label: 'Solo/a',       value: 'solo'    },
    { icon: '👫', label: 'En pareja',    value: 'pareja'  },
    { icon: '👯', label: 'Con amigos',   value: 'amigos'  },
    { icon: '👨‍👩‍👧', label: 'En familia',  value: 'familia' },
  ];

  timeOptions = [
    { icon: '⚡', label: 'Menos de 1h',  desc: 'Algo rápido y cercano',       value: '1h'    },
    { icon: '🌅', label: '1 – 3 horas',  desc: 'Una tarde bien aprovechada',  value: '3h'    },
    { icon: '🌙', label: 'Noche entera', desc: 'Dispuesto a todo',            value: 'noche' },
    { icon: '🗓️', label: 'Todo el día',  desc: 'Modo aventura activado',      value: 'dia'   },
  ];

  // ── VELA & MOOD ─────────────────────────────────────
  showMoodModal: boolean = false;
  currentUserMood: string | null = null;
  recommendedEvents: any[] = [];
  explorerEvents: any[] = [];
  velaMessage: string = '';

  // ── CHAT ────────────────────────────────────────────
  isChatOpen = false;
  userInput = '';
  chatHistory: any[] = [];
  isTyping = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public favService: FavoritesService
  ) {}

  ngOnInit() {
    this.generateParticles();
    this.loadEvents();
    this.loadEmotions();
    this.checkOnboardingStatus();
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initNoiseCanvas();
      this.initMouseGlow();
      setTimeout(async () => {
        await this.initHomeMap();
      }, 100);
    }
  }

  // ── MAPA INTERACTIVO EN HOME ──────────────────────
  async initHomeMap() {
    const mapElement = document.getElementById('map-home') as HTMLElement;
    if (!mapElement) return;
    mapElement.style.width  = '100%';
    mapElement.style.height = '100%';
    mapElement.style.minHeight = '600px';

    const leafletModule = await import('leaflet');
    const L = leafletModule.default || leafletModule;
    if (!L || !L.map) return;

    if (this.map) { this.map.remove(); this.map = null; }

    this.map = L.map('map-home', {
      zoomControl: false,
      center: [10.9685, -74.7813],
      zoom: 13,
      zoomSnap: 0.5
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO', maxZoom: 20
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Cargar caché de sessionStorage al iniciar
    try {
      const stored = sessionStorage.getItem('vemo_geo_cache');
      if (stored) this.coordinateCache = JSON.parse(stored);
    } catch {}
    const el = document.getElementById('map-home') as HTMLElement;
if (el) {
  el.style.width = '100%';
  el.style.height = '100%';
  el.style.minHeight = '400px';
}

    setTimeout(() => {
      this.map.invalidateSize();
      setTimeout(() => {
        this.map.invalidateSize();
        this.mapReady = true;
        if (this.eventsReady) this.drawHomeMap();
      }, 400);
    }, 300);
  }

  async drawHomeMap() {
    if (!this.map) return;
    this.mapLoading = true;
    this.cdr.detectChanges();

    const leafletModule = await import('leaflet');
    const L = leafletModule.default || leafletModule;

    // Limpiar capas previas
    this.mapMarkers.forEach(m => this.map.removeLayer(m));
    this.mapHeatLayers.forEach(h => this.map.removeLayer(h));
    this.mapMarkers = [];
    this.mapHeatLayers = [];

    const eventsToDraw = this.activeEmotionName
      ? this.events.filter(e => e.emotions?.name === this.activeEmotionName)
      : this.events;

    // ── GEOCODING EN PARALELO (mucho más rápido que secuencial) ──
    const geocodeEvent = async (ev: any): Promise<{ ev: any; lat: number; lng: number } | null> => {
      try {
        // 1. Usar coordenadas del evento si existen
        if (ev.latitude && ev.longitude) {
          return { ev, lat: parseFloat(ev.latitude), lng: parseFloat(ev.longitude) };
        }

        // 2. Usar caché si ya geocodificamos esta dirección
        if (this.coordinateCache[ev.location_name]) {
          const c = this.coordinateCache[ev.location_name];
          return { ev, lat: c.lat, lng: c.lng };
        }

        // 3. Geocodificar con Nominatim
        if (!ev.location_name) return null;

        const q = encodeURIComponent(`${ev.location_name}, Barranquilla, Colombia`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=co`,
          { headers: { 'Accept-Language': 'es' } }
        );
        const data = await res.json();

        // Fallback: dirección simplificada sin número de casa
        if (!data?.length) {
          const clean = ev.location_name.split('-')[0].replace(/#/g, '').trim();
          const q2 = encodeURIComponent(`${clean}, Barranquilla, Colombia`);
          const res2 = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${q2}&limit=1&countrycodes=co`
          );
          const data2 = await res2.json();
          if (!data2?.length) return null;
          const lat = parseFloat(data2[0].lat);
          const lng = parseFloat(data2[0].lon);
          this.coordinateCache[ev.location_name] = { lat, lng };
          return { ev, lat, lng };
        }

        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        this.coordinateCache[ev.location_name] = { lat, lng };
        // Persistir en sessionStorage para recarga instantánea
        try { sessionStorage.setItem('vemo_geo_cache', JSON.stringify(this.coordinateCache)); } catch {}
        return { ev, lat, lng };

      } catch { return null; }
    };

    // Lanzar todas las geocodificaciones a la vez (máx 8 en paralelo para no saturar Nominatim)
    const BATCH = 8;
    const results: ({ ev: any; lat: number; lng: number } | null)[] = [];

    for (let i = 0; i < eventsToDraw.length; i += BATCH) {
      const batch = eventsToDraw.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(geocodeEvent));
      results.push(...batchResults);
      // Pequeña pausa entre lotes para respetar el rate limit de Nominatim
      if (i + BATCH < eventsToDraw.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // ── PINTAR MARCADORES con entrada animada ──
    let staggerIndex = 0;
    for (const result of results) {
      if (!result) continue;
      const { ev, lat, lng } = result;
      const color = this.getColorForEmotion(ev.emotions?.name || '');
      const delay = staggerIndex * 60; // 60ms entre cada marcador

      const icon = L.divIcon({
        className: 'custom-vemo-marker',
        html: `<div class="vemo-pin" style="
          --pin-color: ${color};
          animation-delay: ${delay}ms;
        ">
          <div class="vemo-pin-img" style="background-image:url('${ev.image_url || 'assets/placeholder.jpg'}');"></div>
          <div class="vemo-pin-ring"></div>
          <div class="vemo-pin-pulse"></div>
        </div>`,
        iconSize: [52, 52], iconAnchor: [26, 26], popupAnchor: [0, -30]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(this.map);
      marker.bindPopup(`
        <div class="vemo-popup-inner">
          <div class="vpi-img" style="background-image:url('${ev.image_url || 'assets/placeholder.jpg'}')"></div>
          <div class="vpi-info">
            <span class="vpi-emotion" style="color:${color}">● ${ev.emotions?.name || 'Evento'}</span>
            <b class="vpi-title">${ev.title}</b>
            <span class="vpi-loc">📍 ${ev.location_name}</span>
          </div>
        </div>
      `);
      marker.on('click', () => this.goToDetail(ev.id));
      this.mapMarkers.push(marker);
      staggerIndex++;
    }

    this.mapLoading = false;
    this.cdr.detectChanges();
  }

  toggleHomeEmotionFilter(emotion: any) {
    this.activeEmotionName = this.activeEmotionName === emotion.name ? null : emotion.name;
    this.drawHomeMap();
  }

  getColorForEmotion(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('alegría') || n.includes('diversión')) return '#FFA500';
    if (n.includes('curiosidad') || n.includes('aprendizaje')) return '#FFD700';
    if (n.includes('emoción') || n.includes('adrenalina')) return '#FF4500';
    if (n.includes('inspiración') || n.includes('creatividad')) return '#FF1493';
    if (n.includes('introspección') || n.includes('contemplación')) return '#9B59B6';
    if (n.includes('nostalgia')) return '#A9A9A9';
    if (n.includes('relajación') || n.includes('calma')) return '#00FFFF';
    if (n.includes('tristeza')) return '#1E90FF';
    if (n.includes('amor')) return '#FF69B4';
    return '#FF4D80';
  }

  // ── MOUSE GLOW ───────────────────────────────────
  initMouseGlow() {
    const glow = document.getElementById('mouseGlow');
    if (!glow) return;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    });

    const animate = () => {
      // Lerp suave para seguimiento fluido
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      glow.style.left = currentX + 'px';
      glow.style.top  = currentY + 'px';
      requestAnimationFrame(animate);
    };
    animate();
  }

  // ── NOISE CANVAS (película de cine) ─────────────────
  initNoiseCanvas() {
    const canvas = document.getElementById('noiseCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const drawNoise = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const buffer = new Uint32Array(imageData.data.buffer);
      for (let i = 0; i < buffer.length; i++) {
        if (Math.random() < 0.5) buffer[i] = 0xff000000 | (Math.random() * 255);
      }
      ctx.putImageData(imageData, 0, 0);
      requestAnimationFrame(drawNoise);
    };
    drawNoise();
  }

  // ── ONBOARDING ──────────────────────────────────────
  generateParticles() {
    this.particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100 + 20,
      size: Math.random() * 4 + 1.5,
      delay: Math.random() * 8,
      duration: Math.random() * 10 + 8,
    }));
  }

  checkOnboardingStatus() {
    if (!isPlatformBrowser(this.platformId)) return;
    const lastUpdate = localStorage.getItem('lastMoodUpdate');
    const today = new Date().toDateString();
    this.currentUserMood = localStorage.getItem('userCurrentMood');

    if (lastUpdate !== today) {
      this.showOnboarding = true;
      this.onboardingStep = 1;
      this.selectedEmotion = null;
      this.selectedCompany = '';
      this.selectedTime = '';
    } else {
      this.showOnboarding = false;
      this.processVelaRecommendations();
    }
    this.cdr.detectChanges();
  }

  selectEmotion(emotion: any) { this.selectedEmotion = emotion; }
  nextStep() { if (this.onboardingStep < 3) this.onboardingStep++; }
  prevStep() { if (this.onboardingStep > 1) this.onboardingStep--; }

  async finishOnboarding() {
    if (!this.selectedEmotion || !this.selectedCompany || !this.selectedTime) return;
    localStorage.setItem('lastMoodUpdate', new Date().toDateString());
    localStorage.setItem('userCurrentMood', this.selectedEmotion.name);
    localStorage.setItem('userCompany', this.selectedCompany);
    localStorage.setItem('userTimeAvailable', this.selectedTime);
    this.currentUserMood = this.selectedEmotion.name;

    this.closingOnboarding = true;
    this.cdr.detectChanges();

    const token = localStorage.getItem('token') || localStorage.getItem('vemo_token');
    if (token) {
      fetch(`${environment.apiUrl}/api/auth/update-mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mood: this.selectedEmotion.name, company: this.selectedCompany, timeAvailable: this.selectedTime })
      }).catch(() => {});
    }

    setTimeout(() => {
      this.showOnboarding = false;
      this.closingOnboarding = false;
      this.processVelaRecommendations();
      this.cdr.detectChanges();
    }, 800);
  }

  scrollToExplorer() {
    document.getElementById('seccion-explorador')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── EMOCIONES ───────────────────────────────────────
  async loadEmotions() {
    try {
      const res = await fetch(`${environment.apiUrl}/api/emotions`);
      if (res.ok) { this.availableEmotions = await res.json(); this.cdr.detectChanges(); }
    } catch (e) { console.error('Emociones:', e); }
  }

  async selectMood(emotionId: string, emotionName: string) {
    localStorage.setItem('lastMoodUpdate', new Date().toDateString());
    localStorage.setItem('userCurrentMood', emotionName);
    this.currentUserMood = emotionName;
    const token = localStorage.getItem('token') || localStorage.getItem('vemo_token');
    if (token) {
      fetch(`${environment.apiUrl}/api/auth/update-mood`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mood: emotionName })
      }).catch(() => {});
    }
    this.showMoodModal = false;
    this.processVelaRecommendations();
    this.cdr.detectChanges();
  }

  // ── EVENTOS ─────────────────────────────────────────
  async loadEvents() {
    try {
      const res = await fetch(`${environment.apiUrl}/api/events`);
      if (res.ok) {
        this.events = await res.json();
        this.processVelaRecommendations();
        this.eventsReady = true;
        // Si el mapa ya estaba listo cuando llegaron los eventos → dibujamos ahora
        if (this.mapReady) this.drawHomeMap();
      }
    } catch (e) { console.error('Eventos:', e); }
    finally { this.loading = false; this.cdr.detectChanges(); }
  }

  processVelaRecommendations() {
    this.explorerEvents = this.events;
    if (!this.currentUserMood || !this.events.length) return;
    const match = this.events.filter(e => e.emotions?.name.toLowerCase() === this.currentUserMood?.toLowerCase());
    if (match.length > 0) {
      this.recommendedEvents = match.slice(0, 3);
      this.velaMessage = `Veo que hoy buscas ${this.currentUserMood}. Estas experiencias vibran en tu frecuencia.`;
    } else {
      this.recommendedEvents = this.events.slice(0, 3);
      this.velaMessage = `No hay eventos exactos para ${this.currentUserMood} ahora mismo, pero estas experiencias te van a sorprender.`;
    }
  }

  // ── FAVORITOS ────────────────────────────────────────
  toggleLike(event: any, e: Event) { e.stopPropagation(); this.favService.toggleFavorite(event); }
  isFav(eventId: string): boolean { return this.favService.isFavorite(eventId); }

  // ── CHAT ─────────────────────────────────────────────
  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen && !this.chatHistory.length) {
      this.chatHistory.push({ role: 'vela', text: `Hola. Soy Vela. ${this.currentUserMood ? 'Detecto que hoy buscas ' + this.currentUserMood + '.' : ''} ¿Qué experiencia estás buscando?` });
    }
    setTimeout(() => this.scrollToBottom(), 100);
  }

  abrirChatDirecto() { if (!this.isChatOpen) this.toggleChat(); }

  async sendMessage() {
    if (!this.userInput.trim()) return;
    const userMsg = this.userInput;
    this.chatHistory.push({ role: 'user', text: userMsg });
    this.userInput = '';
    this.isTyping = true;
    this.scrollToBottom();
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('vemo_token');
      const res = await fetch(`${environment.apiUrl}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      this.chatHistory.push({ role: 'vela', text: data.reply });
    } catch { this.chatHistory.push({ role: 'vela', text: 'Perdí señal. Intenta de nuevo.' }); }
    finally { this.isTyping = false; this.cdr.detectChanges(); this.scrollToBottom(); }
  }

  private scrollToBottom() {
    if (this.chatContainer) this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
  }

  goToDetail(eventId: string) { this.router.navigate(['/event', eventId]); }
  goToProfile() { this.router.navigate(['/profile']); }
}