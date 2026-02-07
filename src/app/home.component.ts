import { environment } from '../environments/environment';
import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FavoritesService } from './favorites.service'; // Asegúrate que la ruta sea correcta

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

  // Propiedades de Vela y Mood
  showMoodModal: boolean = false;
  currentUserMood: string | null = null;
  recommendedEvents: any[] = [];
  explorerEvents: any[] = [];
  velaMessage: string = '';

  // Propiedades de Chat
  isChatOpen = false;
  userInput = '';
  chatHistory: any[] = [];
  isTyping = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public favService: FavoritesService // Inyectamos el servicio público para usarlo en el HTML
  ) {}

  ngOnInit() {
    this.loadEvents();
    this.loadEmotions();
    this.checkMoodStatus();
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const L = await import('leaflet');
      this.map = L.map('map').setView([10.9685, -74.7813], 13);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 20
      }).addTo(this.map);
      
      setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 1000);
    }
  }

  async loadEmotions() {
    try {
      const res = await fetch('${environment.apiUrl}/api/emotions');
      if (res.ok) {
        this.availableEmotions = await res.json();
        this.cdr.detectChanges();
      }
    } catch (error) { console.error("Error cargando emociones:", error); }
  }

  checkMoodStatus() {
    if (isPlatformBrowser(this.platformId)) {
      const lastUpdate = localStorage.getItem('lastMoodUpdate');
      const today = new Date().toDateString();
      this.currentUserMood = localStorage.getItem('userCurrentMood');

      if (lastUpdate !== today) {
        setTimeout(() => { 
          this.showMoodModal = true; 
          this.cdr.detectChanges(); 
        }, 1000);
      } else {
        this.showMoodModal = false;
        this.processVelaRecommendations();
      }
    }
  }

  async selectMood(emotionId: string, emotionName: string) {
    localStorage.setItem('lastMoodUpdate', new Date().toDateString());
    localStorage.setItem('userCurrentMood', emotionName);
    this.currentUserMood = emotionName;
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('vemo_token');
      if (token) {
        fetch('${environment.apiUrl}/api/auth/update-mood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ mood: emotionName }) 
        }).catch(err => console.error("⚠️ Error de red al guardar mood:", err));
      }
    } finally {
      this.showMoodModal = false;
      this.processVelaRecommendations();
      this.cdr.detectChanges();
    }
  }

  async loadEvents() {
    try {
      const res = await fetch('${environment.apiUrl}/api/events');
      if (res.ok) {
        this.events = await res.json();
        this.processVelaRecommendations();
        setTimeout(() => this.addMarkersToMap(), 500);
      }
    } catch (error) { console.error("Error cargando eventos:", error); } 
    finally { this.loading = false; this.cdr.detectChanges(); }
  }

  processVelaRecommendations() {
    this.explorerEvents = this.events;
    if (!this.currentUserMood || this.events.length === 0) return;

    const matchByMood = this.events.filter(e => 
      e.emotions?.name.toLowerCase() === this.currentUserMood?.toLowerCase()
    );

    if (matchByMood.length > 0) {
      this.recommendedEvents = matchByMood.slice(0, 3);
      this.velaMessage = `Veo que hoy buscas ${this.currentUserMood}. He seleccionado para ti estas experiencias que vibran contigo y tu energía:`;
    } else {
      this.recommendedEvents = this.events.slice(0, 3);
      this.velaMessage = `Aunque hoy buscas ${this.currentUserMood}, no hay eventos exactos ahora. ¡Pero estas experiencias en la ciudad te encantarán!`;
    }
  }

  // --- NUEVAS FUNCIONES DE FAVORITOS ---
  toggleLike(event: any, e: Event) {
    e.stopPropagation(); // Evita abrir el detalle del evento
    this.favService.toggleFavorite(event);
  }

  isFav(eventId: string): boolean {
    return this.favService.isFavorite(eventId);
  }

  // --- CHAT ---
  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen && this.chatHistory.length === 0) {
      this.chatHistory.push({ 
        role: 'vela', 
        text: `¡Hola! Soy Vela. Veo que hoy estás en modo ${this.currentUserMood || 'explorador'}. ¿En qué puedo ayudarte?` 
      });
    }
    setTimeout(() => this.scrollToBottom(), 100);
  }

  async sendMessage() {
    if (!this.userInput.trim()) return;
    const userMsg = this.userInput;
    this.chatHistory.push({ role: 'user', text: userMsg });
    this.userInput = '';
    this.isTyping = true;
    this.scrollToBottom();

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('vemo_token');
      const res = await fetch('${environment.apiUrl}/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      this.chatHistory.push({ role: 'vela', text: data.reply });
    } catch (error) {
      this.chatHistory.push({ role: 'vela', text: 'Perdí la conexión. Inténtalo de nuevo.' });
    } finally {
      this.isTyping = false;
      this.cdr.detectChanges();
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }

  async addMarkersToMap() {
    if (!isPlatformBrowser(this.platformId) || !this.map) return;
    const L = await import('leaflet');
    for (const event of this.events) {
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const query = encodeURIComponent(event.location_name + ', Barranquilla');
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat); const lon = parseFloat(data[0].lon);
          const icon = L.divIcon({
            className: 'custom-icon',
            html: `<div style="width:40px;height:40px;border:3px solid #ff5722;border-radius:50%;background-image:url('${event.image_url}');background-size:cover;background-position:center;box-shadow:0 4px 10px rgba(0,0,0,0.3);"></div>`,
            iconSize: [40, 40], iconAnchor: [20, 20]
          });
          L.marker([lat, lon], { icon }).addTo(this.map).bindPopup(`<b>${event.title}</b>`).on('click', () => this.goToDetail(event.id));
        }
      } catch (err) {}
    }
  }

  goToDetail(eventId: string) { this.router.navigate(['/event', eventId]); }
  
  // Función para ir al perfil (si la necesitas aquí también)
  goToProfile() { this.router.navigate(['/profile']); }
}