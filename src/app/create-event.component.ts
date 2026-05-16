import { environment } from '../environments/environment';
import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { smartGeocodeColombian } from './utils/colombian-geocoding';

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

  isPrivate = false;
  accessPassword = '';
  generatedAccessToken: string | null = null;
  privateEventLink: string | null = null;

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

  galleryPhotoTypes = [
    { value: 'facade', label: 'Foto de la fachada' },
    { value: 'activity', label: 'Video / foto de la actividad' },
    { value: 'interior', label: 'Foto dentro del lugar' },
  ];
  galleryPhotos: { file: File | null; purpose: string; preview: string | null }[] = [];

  addGallerySlot() {
    if (this.galleryPhotos.length < 5) {
      this.galleryPhotos.push({ file: null, purpose: 'fachada', preview: null });
    }
  }

  removeGallerySlot(index: number) {
    this.galleryPhotos.splice(index, 1);
  }

  onGalleryFileSelected(event: any, index: number) {
    const file: File = event.target.files[0];
    if (!file) return;
    this.galleryPhotos[index].file = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.galleryPhotos[index].preview = e.target.result; };
    reader.readAsDataURL(file);
  }

  private async uploadGalleryPhotos(eventId: string, token: string) {
    const photos = this.galleryPhotos.filter(gp => gp.file);
    for (const gp of photos) {
      const fd = new FormData();
      fd.append('photo', gp.file!);
      fd.append('photo_type', gp.purpose);
      try {
        await fetch(`${environment.apiUrl}/api/events/${eventId}/photos`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd
        });
      } catch {}
    }
  }

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
  descriptionMaxChars = 1000;

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
    public router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  copyPrivateLink() {
    if (this.privateEventLink) {
      navigator.clipboard.writeText(this.privateEventLink).catch(() => {});
    }
  }

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

  /** Parse JSON sin tirar excepción; usado para JSONB serializados. */
  private safeParse(raw: string): any {
    try { return JSON.parse(raw); } catch { return null; }
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

        // Supabase JSONB normalmente vuelve como objeto, pero defensivamente
        // soportamos también string JSON por si algún driver intermedio lo
        // serializa. Sin esto, los selects de "compañía ideal / horario / energía"
        // quedan vacíos al editar.
        const mf = typeof data.match_fields === 'string'
          ? this.safeParse(data.match_fields)
          : data.match_fields;
        if (mf) this.matchFields = { ...this.matchFields, ...mf };

        const sf = typeof data.system_fields === 'string'
          ? this.safeParse(data.system_fields)
          : data.system_fields;
        if (sf) this.systemFields = { ...this.systemFields, ...sf };

        // Privacidad: pre-cargamos el flag para que el toggle aparezca con el
        // estado real. El access_password NO se devuelve (está hasheado en DB);
        // si el admin quiere cambiarlo, escribe uno nuevo; si lo deja vacío,
        // el backend mantiene el actual.
        this.isPrivate = data.is_private === true;
        if (data.access_token) {
          this.generatedAccessToken = data.access_token;
          this.privateEventLink = `${window.location.origin}/eventos/privado/${data.access_token}`;
        }

        if (data.latitude && data.longitude) {
          this.selectedLat = parseFloat(data.latitude);
          this.selectedLng = parseFloat(data.longitude);
          // Si el mapa ya se inicializó, dibujamos el pin EN ESTE INSTANTE
          // para que el admin/organizador vea la ubicación guardada.
          // Si el mapa todavía no existe, initMap() detectará selectedLat/Lng
          // ya seteadas y dibujará el pin por sí mismo. Cubrimos ambos casos.
          if (this.map && this.L) {
            this.placeMarker(this.selectedLat, this.selectedLng);
            this.map.setView([this.selectedLat, this.selectedLng], 17);
            setTimeout(() => this.map?.invalidateSize(), 200);
          }
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

    // Centramos inicial: si ya tenemos coords del evento (modo edición),
    // arrancamos sobre ellas. Si no, sobre Barranquilla por defecto.
    const initialCenter: [number, number] =
      this.selectedLat != null && this.selectedLng != null
        ? [this.selectedLat, this.selectedLng]
        : [10.9685, -74.7813];
    const initialZoom = this.selectedLat != null && this.selectedLng != null ? 17 : 13;

    this.map = this.L.map('event-map', {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true
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

    // Pin precargado (modo edición con coords ya guardadas).
    if (this.selectedLat && this.selectedLng) {
      this.placeMarker(this.selectedLat, this.selectedLng);
    }

    // invalidateSize en 2 momentos (defensivo: a veces Leaflet renderiza
    // antes de que el contenedor tenga su altura final). Si en modo edición
    // las coords llegaron DESPUÉS del initMap, intentamos dibujar el pin otra vez.
    setTimeout(() => {
      this.map?.invalidateSize();
      if (this.selectedLat && this.selectedLng && !this.marker) {
        this.placeMarker(this.selectedLat, this.selectedLng);
        this.map?.setView([this.selectedLat, this.selectedLng], 17);
      }
    }, 400);
    setTimeout(() => {
      this.map?.invalidateSize();
      if (this.selectedLat && this.selectedLng && !this.marker) {
        this.placeMarker(this.selectedLat, this.selectedLng);
        this.map?.setView([this.selectedLat, this.selectedLng], 17);
      }
    }, 1200);
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
    // Pin DRAGGABLE: el organizador puede arrastrarlo para ajustar la
    // ubicación con precisión visual quirúrgica si la geocodificación
    // automática quedó cerca pero no exacta.
    this.marker = this.L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(this.map);
    this.marker.on('dragend', () => {
      const pos = this.marker.getLatLng();
      this.selectedLat = pos.lat;
      this.selectedLng = pos.lng;
    });
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

  /**
   * Geocodifica la dirección escrita por el organizador con el helper
   * smartGeocodeColombian (varias variantes + validación bbox de ciudad)
   * y posiciona el marcador en el mapa. Devuelve true si encontró coords.
   */
  async geocodeAddress(): Promise<boolean> {
    if (!this.eventData.location_name || this.eventData.location_name.length < 5) return false;

    const cityCfg = this.cities.find(c => c.value === this.eventData.city);
    const cityLabel = cityCfg?.label || 'Barranquilla';
    const cityKey = (cityCfg?.value || 'barranquilla').replace(/_/g, ' ');

    const hit = await smartGeocodeColombian(this.eventData.location_name, cityLabel, cityKey);
    if (hit) {
      this.selectedLat = hit.lat;
      this.selectedLng = hit.lng;
      this.placeMarker(hit.lat, hit.lng);
      this.map?.setView([hit.lat, hit.lng], 17);
      return true;
    }
    return false;
  }

  onDescriptionChange() {
    this.descriptionCharCount = this.eventData.description.length;
  }

  isDescriptionValid(): boolean {
    const d = this.eventData.description;
    if (d.length < this.descriptionMinChars) return false;
    if (d.length > this.descriptionMaxChars) return false;
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
      const len = this.eventData.description.length;
      if (len > this.descriptionMaxChars) {
        this.errors['description'] = `La descripción no puede superar los ${this.descriptionMaxChars} caracteres (actualmente ${len}).`;
      } else {
        this.errors['description'] = `La descripción debe tener al menos ${this.descriptionMinChars} caracteres de texto real.`;
      }
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

    // ── GARANTÍA DE COORDENADAS PRECISAS ─────────────────────────
    // Si el organizador no apretó "Buscar" ni hizo click en el mapa,
    // selectedLat/Lng quedan en null. Sin coords, los mapas (principal y
    // de detalle) tendrán que adivinar con Nominatim después y van a
    // mostrar el evento en una posición aproximada/incorrecta.
    // Aquí intentamos UNA última geocodificación antes de enviar.
    if ((!this.selectedLat || !this.selectedLng) && this.eventData.location_name) {
      const ok = await this.geocodeAddress();
      if (!ok) {
        this.loading = false;
        const proceed = confirm(
          'No pudimos ubicar la dirección automáticamente. ' +
          'Te recomendamos hacer click en el mapa para fijar la ubicación exacta. ' +
          '\n\n¿Quieres enviar el evento de todos modos? Aparecerá en una ubicación aproximada.'
        );
        if (!proceed) return;
        this.loading = true;
      }
    }

    const formData = new FormData();

    // Core fields
    formData.append('post_type', this.postType);
    // Campos que la tabla 'events' de Supabase aún NO soporta —
    // se mantienen en la UI pero no se envían al backend para evitar
    // "Could not find the 'X' column of 'events' in the schema cache".
    // Cuando la migración SQL agregue estas columnas, eliminar de la lista.
    const unsupportedFields = new Set<string>(['date_end']);
    Object.keys(this.eventData).forEach(key => {
      if (unsupportedFields.has(key)) return;
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

    // Privacidad: enviamos SIEMPRE el flag en modo edición (para que se pueda
    // cambiar de privado a público y viceversa). En modo creación, solo cuando
    // el usuario lo activó.
    if (this.isEditMode) {
      formData.append('is_private', this.isPrivate ? 'true' : 'false');
      if (this.isPrivate && this.accessPassword.trim()) {
        formData.append('access_password', this.accessPassword.trim());
      }
    } else if (this.isPrivate) {
      formData.append('is_private', 'true');
      if (this.accessPassword.trim()) formData.append('access_password', this.accessPassword.trim());
    }

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
        const data = await res.json();
        const eventId = data.id || data.event?.id;
        if (eventId) await this.uploadGalleryPhotos(eventId, token!);
        if (this.isPrivate && data.access_token) {
          this.generatedAccessToken = data.access_token;
          this.privateEventLink = `${window.location.origin}/eventos/privado/${data.access_token}`;
        } else {
          alert(this.isEditMode ? 'Evento actualizado con éxito' : 'Evento enviado a revisión');
          this.router.navigate(['/profile']);
        }
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
