import { environment } from '../environments/environment';
import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-organizer-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organizer-verify.component.html',
  styleUrls: ['./organizer-verify.component.css']
})
export class OrganizerVerifyComponent implements OnInit, AfterViewInit {
  companyName = '';
  nit = '';
  isUploading = false;

  // ID uploads
  frontIdFile: File | null = null;
  backIdFile: File | null = null;
  frontIdPreview: string | null = null;
  backIdPreview: string | null = null;

  // Logo upload
  logoFile: File | null = null;
  logoPreview: string | null = null;

  // Address with map
  address = '';
  selectedLat: number | null = null;
  selectedLng: number | null = null;
  private map: any;
  private marker: any;
  private L: any;

  // Contact & schedule
  publicPhone = '';
  publicEmail = '';

  // Structured schedule
  sameScheduleAllDays = false;
  schedule: { day: string; label: string; enabled: boolean; open: string; close: string }[] = [
    { day: 'lun', label: 'Lunes',     enabled: false, open: '09:00', close: '18:00' },
    { day: 'mar', label: 'Martes',    enabled: false, open: '09:00', close: '18:00' },
    { day: 'mie', label: 'Miércoles', enabled: false, open: '09:00', close: '18:00' },
    { day: 'jue', label: 'Jueves',    enabled: false, open: '09:00', close: '18:00' },
    { day: 'vie', label: 'Viernes',   enabled: false, open: '09:00', close: '18:00' },
    { day: 'sab', label: 'Sábado',    enabled: false, open: '10:00', close: '14:00' },
    { day: 'dom', label: 'Domingo',   enabled: false, open: '10:00', close: '14:00' },
  ];

  // Categories
  availableCategories: any[] = [];
  selectedCategories: string[] = [];

  // Segmentation
  organizerSize: 'pequeno' | 'mediano' | 'grande' = 'pequeno';

  // Verification status (loaded from profile)
  verificationStatus: string | null = null;
  rejectionReason: string | null = null;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadCurrentStatus();
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initMap(), 300);
    }
  }

  async loadCurrentStatus() {
    const token = localStorage.getItem('vemo_token');
    if (!token) return;
    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.verificationStatus = data.user?.verification_status || null;
        this.rejectionReason = data.user?.rejection_reason || null;
        if (data.user?.company_name) this.companyName = data.user.company_name;
        if (data.user?.nit) this.nit = data.user.nit;
      }
    } catch {}
  }

  async loadCategories() {
    try {
      const res = await fetch(`${environment.apiUrl}/api/categories`);
      if (res.ok) this.availableCategories = await res.json();
    } catch {}
  }

  async initMap() {
    const mapEl = document.getElementById('verify-map');
    if (!mapEl) return;

    const leafletModule = await import('leaflet');
    this.L = leafletModule.default || leafletModule;
    if (!this.L?.map) return;

    this.map = this.L.map('verify-map', {
      center: [10.9685, -74.7813],
      zoom: 13,
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

    setTimeout(() => this.map.invalidateSize(), 400);
  }

  placeMarker(lat: number, lng: number) {
    if (!this.L) return;
    if (this.marker) this.map.removeLayer(this.marker);
    const pinIcon = this.L.divIcon({
      className: 'verify-map-pin',
      html: `<div style="
        width: 32px; height: 32px; background: #000; border: 3px solid #fff;
        border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); position: relative;
      "><div style="
        width: 12px; height: 12px; background: #fff; border-radius: 50%;
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      "></div></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
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
      if (data.display_name) {
        this.address = data.display_name;
      }
    } catch {}
  }

  async geocodeAddress() {
    if (!this.address || this.address.length < 5) return;
    try {
      const q = encodeURIComponent(`${this.address}, Barranquilla, Colombia`);
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

  onFileSelected(event: any, type: 'front' | 'back' | 'logo') {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'front') {
        this.frontIdFile = file;
        this.frontIdPreview = reader.result as string;
      } else if (type === 'back') {
        this.backIdFile = file;
        this.backIdPreview = reader.result as string;
      } else {
        this.logoFile = file;
        this.logoPreview = reader.result as string;
      }
    };
    reader.readAsDataURL(file);
  }

  hasActiveDays(): boolean {
    return this.schedule.some(d => d.enabled);
  }

  firstActiveIndex(): number {
    return this.schedule.findIndex(d => d.enabled);
  }

  toggleDay(index: number) {
    this.schedule[index].enabled = !this.schedule[index].enabled;
  }

  onSameScheduleToggle() {
    if (this.sameScheduleAllDays) {
      const first = this.schedule.find(d => d.enabled);
      if (first) {
        this.schedule.forEach(d => {
          if (d.enabled) { d.open = first.open; d.close = first.close; }
        });
      }
    }
  }

  onTimeChange(index: number) {
    if (this.sameScheduleAllDays) {
      const src = this.schedule[index];
      this.schedule.forEach(d => {
        if (d.enabled) { d.open = src.open; d.close = src.close; }
      });
    }
  }

  serializeSchedule(): string {
    const active = this.schedule.filter(d => d.enabled).map(d => ({
      day: d.day, label: d.label, open: d.open, close: d.close
    }));
    return JSON.stringify(active);
  }

  toggleCategory(id: string) {
    if (this.selectedCategories.includes(id)) {
      this.selectedCategories = this.selectedCategories.filter(c => c !== id);
    } else {
      this.selectedCategories.push(id);
    }
  }

  isCatSelected(id: string): boolean {
    return this.selectedCategories.includes(id);
  }

  getStatusLabel(): string {
    switch (this.verificationStatus) {
      case 'approved': return 'Verificado';
      case 'rejected': return 'Rechazado';
      case 'action_required': return 'Acción requerida';
      case 'pending': return 'En revisión';
      default: return 'Pendiente de envío';
    }
  }

  getStatusClass(): string {
    return this.verificationStatus || 'none';
  }

  async submitVerification() {
    // UX flexible: NIT y cédula ahora son OPCIONALES. El organizador puede
    // registrar su empresa con solo el nombre y completar NIT + documentos
    // de identidad después desde su perfil. El backend marca la cuenta como
    // "pendiente" / "incompleta" hasta que esos campos se llenen.
    if (!this.companyName) {
      alert('Completa el nombre de la empresa.');
      return;
    }

    this.isUploading = true;
    const token = localStorage.getItem('vemo_token');

    try {
      const formData = new FormData();
      formData.append('company_name', this.companyName);
      // NIT y documentos OPCIONALES — solo se adjuntan si existen.
      if (this.nit) formData.append('nit', this.nit);
      if (this.frontIdFile) formData.append('front', this.frontIdFile);
      if (this.backIdFile)  formData.append('back', this.backIdFile);
      if (this.logoFile) formData.append('logo', this.logoFile);
      if (this.address) formData.append('address', this.address);
      if (this.selectedLat) formData.append('latitude', String(this.selectedLat));
      if (this.selectedLng) formData.append('longitude', String(this.selectedLng));
      if (this.publicPhone) formData.append('public_phone', this.publicPhone);
      if (this.publicEmail) formData.append('public_email', this.publicEmail);
      const scheduleJson = this.serializeSchedule();
      if (scheduleJson !== '[]') formData.append('schedule_json', scheduleJson);
      if (this.selectedCategories.length) formData.append('categories', JSON.stringify(this.selectedCategories));
      formData.append('organizer_size', this.organizerSize);

      const res = await fetch(`${environment.apiUrl}/api/organizer/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        alert('Documentos enviados con éxito. Tu perfil está en revisión.');
        this.router.navigate(['/profile']);
      } else {
        let errorMsg = 'No se pudieron subir los documentos';
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch {}
        console.error('Verification submit failed:', res.status, errorMsg);
        alert('Error (' + res.status + '): ' + errorMsg);
      }
    } catch (err) {
      console.error('Verification network error:', err);
      alert('Error de conexión con el servidor.');
    } finally {
      this.isUploading = false;
    }
  }
}
