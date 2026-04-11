import { environment } from '../environments/environment';
import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css']
})
export class CreateEventComponent implements OnInit, AfterViewInit {

  // Type differentiation
  postType: 'evento' | 'experiencia' = 'evento';

  // Core data
  eventData = {
    title: '',
    description: '',
    date_event: '',
    date_end: '',
    location_name: '',
    main_emotion_id: '',
    city: 'barranquilla',
    price_range: 'gratis',
    target_audience: '',
    min_age: '',
    max_capacity: ''
  };

  // Match fields (for recommendation engine)
  matchFields = {
    ideal_company: '',    // solo, pareja, amigos, familia
    ideal_time: '',       // manana, tarde, noche
    energy_level: '',     // baja, media, alta
    dress_code: '',       // casual, elegante, tematico
    accessibility: false
  };

  // Hidden system questions
  systemFields = {
    target_user_type: '',    // jovenes, familias, profesionales, turistas
    avoid_user_type: '',     // quien NO deberia ir
    event_objective: '',     // entretenimiento, educacion, networking, cultural
    peak_hour: '',           // hora de mayor afluencia esperada
    recurrence: 'unico'     // unico, semanal, mensual
  };

  availableCategories: any[] = [];
  availableEmotions: any[] = [];
  selectedCategories: string[] = [];
  selectedFile: File | null = null;

  // Map
  selectedLat: number | null = null;
  selectedLng: number | null = null;
  private map: any;
  private marker: any;
  private L: any;

  // State
  loading = false;
  isEditMode = false;
  eventId: string | null = null;
  currentImageUrl: string | null = null;

  // Validation
  errors: { [key: string]: string } = {};
  showSystemFields = false;

  // Description guide
  descriptionCharCount = 0;
  descriptionMinChars = 50;

  // Cities
  cities = [
    { value: 'barranquilla', label: 'Barranquilla' },
    { value: 'santa_marta', label: 'Santa Marta' },
    { value: 'cartagena', label: 'Cartagena' },
    { value: 'otro', label: 'Otra ciudad' }
  ];

  companyOptions = [
    { value: 'solo', label: 'Solo/a' },
    { value: 'pareja', label: 'En pareja' },
    { value: 'amigos', label: 'Con amigos' },
    { value: 'familia', label: 'En familia' },
    { value: 'cualquiera', label: 'Cualquiera' }
  ];

  timeOptions = [
    { value: 'manana', label: 'Mañana' },
    { value: 'tarde', label: 'Tarde' },
    { value: 'noche', label: 'Noche' },
    { value: 'todo_dia', label: 'Todo el día' }
  ];

  energyOptions = [
    { value: 'baja', label: 'Relajada' },
    { value: 'media', label: 'Moderada' },
    { value: 'alta', label: 'Intensa' }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadEmotions();

    // Read type from query params (from profile create buttons)
    const typeParam = this.route.snapshot.queryParamMap.get('type');
    if (typeParam === 'evento' || typeParam === 'experiencia') {
      this.postType = typeParam;
    }

    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEditMode = true;
      this.fetchEventDetails(this.eventId);
    }
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initMap(), 300);
    }
  }

  async loadCategories() {
    try {
      const res = await fetch(`${environment.apiUrl}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        if (data?.length) this.availableCategories = data;
      }
    } catch {}
  }

  async loadEmotions() {
    try {
      const res = await fetch(`${environment.apiUrl}/api/emotions`);
      if (res.ok) {
        const data = await res.json();
        if (data?.length) this.availableEmotions = data;
      }
    } catch {}
  }

  async fetchEventDetails(id: string) {
    try {
      const res = await fetch(`${environment.apiUrl}/api/events/${id}`);
      if (res.ok) {
        const data = await res.json();
        this.eventData = {
          title: data.title || '',
          description: data.description || '',
          date_event: data.date_event ? new Date(data.date_event).toISOString().slice(0, 16) : '',
          date_end: data.date_end ? new Date(data.date_end).toISOString().slice(0, 16) : '',
          location_name: data.location_name || '',
          main_emotion_id: data.main_emotion_id || '',
          city: data.city || 'barranquilla',
          price_range: data.price_range || 'gratis',
          target_audience: data.target_audience || '',
          min_age: data.min_age || '',
          max_capacity: data.max_capacity || ''
        };
        this.postType = data.post_type || 'evento';
        this.selectedCategories = data.categoryIds || [];
        this.currentImageUrl = data.image_url;
        this.descriptionCharCount = this.eventData.description.length;

        if (data.match_fields) {
          this.matchFields = { ...this.matchFields, ...data.match_fields };
        }
        if (data.system_fields) {
          this.systemFields = { ...this.systemFields, ...data.system_fields };
        }
        if (data.latitude && data.longitude) {
          this.selectedLat = parseFloat(data.latitude);
          this.selectedLng = parseFloat(data.longitude);
        }
      }
    } catch (err) {
      console.error('Error cargando detalles del evento:', err);
    }
  }

  async initMap() {
    const mapEl = document.getElementById('event-map');
    if (!mapEl) return;

    const leafletModule = await import('leaflet');
    this.L = leafletModule.default || leafletModule;
    if (!this.L?.map) return;

    this.map = this.L.map('event-map', {
      center: [10.9685, -74.7813],
      zoom: 13, zoomControl: true
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM', maxZoom: 19
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      this.selectedLat = e.latlng.lat;
      this.selectedLng = e.latlng.lng;
      this.placeMarker(e.latlng.lat, e.latlng.lng);
      this.reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    if (this.selectedLat && this.selectedLng) {
      this.placeMarker(this.selectedLat, this.selectedLng);
      this.map.setView([this.selectedLat, this.selectedLng], 16);
    }

    setTimeout(() => this.map.invalidateSize(), 400);
  }

  placeMarker(lat: number, lng: number) {
    if (!this.L) return;
    if (this.marker) this.map.removeLayer(this.marker);
    const pinIcon = this.L.divIcon({
      className: 'event-map-pin',
      html: `<div style="
        width: 28px; height: 28px; background: #0071e3; border: 3px solid #fff;
        border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); position: relative;
      "><div style="
        width: 10px; height: 10px; background: #fff; border-radius: 50%;
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      "></div></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });
    this.marker = this.L.marker([lat, lng], { icon: pinIcon }).addTo(this.map);
  }

  async reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await res.json();
      if (data.display_name) this.eventData.location_name = data.display_name;
    } catch {}
  }

  async geocodeAddress() {
    if (!this.eventData.location_name || this.eventData.location_name.length < 5) return;
    try {
      const city = this.cities.find(c => c.value === this.eventData.city)?.label || 'Barranquilla';
      const q = encodeURIComponent(`${this.eventData.location_name}, ${city}, Colombia`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=co`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await res.json();
      if (data?.length) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        this.selectedLat = lat;
        this.selectedLng = lng;
        this.placeMarker(lat, lng);
        this.map?.setView([lat, lng], 16);
      }
    } catch {}
  }

  onDescriptionChange() {
    this.descriptionCharCount = this.eventData.description.length;
  }

  isDescriptionValid(): boolean {
    const d = this.eventData.description;
    if (d.length < this.descriptionMinChars) return false;
    // Check not only emojis
    const textOnly = d.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]/gu, '');
    return textOnly.length >= 20;
  }

  toggleCategory(id: string) {
    if (this.selectedCategories.includes(id)) {
      this.selectedCategories = this.selectedCategories.filter(c => c !== id);
    } else {
      this.selectedCategories.push(id);
    }
  }

  isSelected(id: string) { return this.selectedCategories.includes(id); }

  onFileSelected(event: any) { this.selectedFile = event.target.files[0]; }

  validate(): boolean {
    this.errors = {};

    if (!this.eventData.title || this.eventData.title.trim().length < 3) {
      this.errors['title'] = 'El título debe tener al menos 3 caracteres';
    }
    if (!this.isDescriptionValid()) {
      this.errors['description'] = `La descripción debe tener al menos ${this.descriptionMinChars} caracteres de texto real`;
    }
    if (this.postType === 'evento' && !this.eventData.date_event) {
      this.errors['date'] = 'Selecciona la fecha y hora del evento';
    }
    if (!this.eventData.location_name || this.eventData.location_name.trim().length < 3) {
      this.errors['location'] = 'Ingresa la ubicación';
    }
    if (!this.eventData.main_emotion_id) {
      this.errors['emotion'] = 'Selecciona la emoción que define esta experiencia';
    }
    if (this.selectedCategories.length === 0) {
      this.errors['categories'] = 'Selecciona al menos una categoría';
    }
    if (!this.isEditMode && !this.selectedFile) {
      this.errors['image'] = 'Sube una imagen de portada';
    }
    if (!this.matchFields.ideal_company) {
      this.errors['company'] = 'Selecciona el tipo de compañía ideal';
    }
    if (!this.matchFields.ideal_time) {
      this.errors['time'] = 'Selecciona el horario ideal';
    }

    return Object.keys(this.errors).length === 0;
  }

  hasError(field: string): boolean { return !!this.errors[field]; }

  async onSubmit() {
    if (!this.validate()) {
      const firstError = document.querySelector('.field-error');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    this.loading = true;
    const formData = new FormData();

    // Core fields
    formData.append('post_type', this.postType);
    Object.keys(this.eventData).forEach(key => {
      const val = (this.eventData as any)[key];
      if (val !== '' && val !== null && val !== undefined) formData.append(key, val);
    });
    formData.append('categoryIds', JSON.stringify(this.selectedCategories));

    // Geolocation
    if (this.selectedLat) formData.append('latitude', String(this.selectedLat));
    if (this.selectedLng) formData.append('longitude', String(this.selectedLng));

    // Match fields
    formData.append('match_fields', JSON.stringify(this.matchFields));

    // System fields
    formData.append('system_fields', JSON.stringify(this.systemFields));

    if (this.selectedFile) formData.append('image', this.selectedFile);

    try {
      const url = this.isEditMode
        ? `${environment.apiUrl}/api/events/update/${this.eventId}`
        : `${environment.apiUrl}/api/events/create`;

      const method = this.isEditMode ? 'PUT' : 'POST';
      const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');

      if (!token) {
        alert('Tu sesión no es válida. Inicia sesión de nuevo.');
        this.router.navigate(['/auth']);
        return;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        alert(this.isEditMode ? 'Evento actualizado con éxito' : 'Evento enviado a revisión');
        this.router.navigate(['/profile']);
      } else {
        let errorMsg = 'Fallo al procesar';
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch {}
        console.error('Event create/update failed:', res.status, errorMsg);
        if (res.status === 401) {
          this.router.navigate(['/auth']);
        } else {
          alert('Error (' + res.status + '): ' + errorMsg);
        }
      }
    } catch (err) {
      console.error('Event creation network error:', err);
      alert('Error de conexión.');
    } finally {
      this.loading = false;
    }
  }
}
