import { environment } from '../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

declare var WidgetCheckout: any;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  userData: any = null;
  loading = true;

  // Admin
  pendingVerifications: any[] = [];
  pendingEvents: any[] = [];
  allEvents: any[] = [];
  allOrganizers: any[] = [];
  activeTab: 'users' | 'events' | 'organizers' | 'all-events' = 'users';

  // Modal de Revisión (Admin)
  selectedEventForReview: any = null;
  adminEditingEvent: any = null;
  selectedCedulaReview: any = null;
  zoomedImage: string | null = null;

  // Organizador
  myEvents: any[] = [];
  selectedEvent: any = null;
  eventFilter: 'all' | 'active' | 'finished' = 'all';

  // Métricas
  totalViews = 0;
  totalSaves = 0;
  totalShares = 0;

  // Editable profile
  isEditingProfile = false;
  editProfile = {
    address: '',
    public_phone: '',
    public_email: '',
    schedule_weekdays: '',
    schedule_weekends: '',
    description: ''
  };

  // QR
  showQRModal = false;
  qrEventId: string | null = null;
  qrDataUrl: string | null = null;

  // User history
  visitHistory: any[] = [];

  // Wompi
  wompiPublicKey = 'pub_test_Q5yDA9xoKdePzhSGeVe9HAez7CTSG9IW';
  promotionPrice = 5000000;

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.resetLocalState();
    this.getProfileData();
    this.loadWompiScript();
  }

  resetLocalState() {
    this.userData = null;
    this.myEvents = [];
    this.pendingVerifications = [];
    this.pendingEvents = [];
    this.allEvents = [];
    this.allOrganizers = [];
    this.totalViews = 0;
    this.totalSaves = 0;
    this.totalShares = 0;
    this.selectedEvent = null;
    this.selectedEventForReview = null;
    this.adminEditingEvent = null;
    this.cdr.detectChanges();
  }

  // ── PROFILE IMAGE ──
  async onProfileImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.userData.profile_url = reader.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('profileImage', file);
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/upload-profile-image`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
      });
      if (res.ok) { const result = await res.json(); this.userData.profile_url = result.imageUrl; this.cdr.detectChanges(); }
    } catch (e) { console.error('Error al subir imagen', e); }
  }

  // ── METRICS ──
  calculateMetrics() {
    this.totalViews = this.myEvents.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
    this.totalSaves = this.myEvents.reduce((acc, curr) => acc + (curr.favorites_count || 0), 0);
    this.totalShares = this.myEvents.reduce((acc, curr) => acc + (curr.shares_count || 0), 0);
    this.cdr.detectChanges();
  }

  get filteredMyEvents() {
    if (!this.myEvents) return [];
    const now = new Date();
    return this.myEvents.filter(event => {
      const eventDate = new Date(event.date_event || event.date);
      const isExpired = event.status === 'expired' || eventDate < now;
      if (this.eventFilter === 'active') return event.status === 'approved' && !isExpired;
      if (this.eventFilter === 'finished') return isExpired || event.status === 'rejected';
      return true;
    });
  }

  setEventFilter(filter: 'all' | 'active' | 'finished') { this.eventFilter = filter; }

  // ── MODAL ORGANIZADOR ──
  viewOrganizerEvent(event: any) { this.selectedEvent = event; }
  closeOrganizerEvent() { this.selectedEvent = null; }

  duplicateOrEditEvent(event: any, mode: 'edit' | 'duplicate') {
    if (mode === 'edit') {
      this.router.navigate(['/edit-event', event.id]);
    } else {
      this.router.navigate(['/create-event'], { state: { mode, eventData: event } });
    }
  }

  // ── QR SYSTEM ──
  generateQR(eventId: string) {
    this.qrEventId = eventId;
    const qrContent = `VEMO-CHECKIN:${eventId}:${Date.now()}`;
    // Generate simple QR as data URL using a canvas-based approach
    this.qrDataUrl = this.generateQRDataUrl(qrContent);
    this.showQRModal = true;
  }

  generateQRDataUrl(text: string): string {
    // Simple QR code placeholder - generates a visual code representation
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 300, 300);

    // Generate deterministic pattern from text
    ctx.fillStyle = '#000000';
    const size = 10;
    const grid = 30;
    for (let i = 0; i < grid; i++) {
      for (let j = 0; j < grid; j++) {
        const charCode = text.charCodeAt((i * grid + j) % text.length);
        if ((charCode + i + j) % 3 === 0) {
          ctx.fillRect(i * size, j * size, size, size);
        }
      }
    }

    // Corner squares (QR-like appearance)
    const drawCorner = (x: number, y: number) => {
      ctx.fillStyle = '#000'; ctx.fillRect(x, y, 70, 70);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 10, y + 10, 50, 50);
      ctx.fillStyle = '#000'; ctx.fillRect(x + 20, y + 20, 30, 30);
    };
    drawCorner(0, 0); drawCorner(230, 0); drawCorner(0, 230);

    // Center text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VEMO', 150, 155);

    return canvas.toDataURL();
  }

  closeQRModal() { this.showQRModal = false; this.qrEventId = null; this.qrDataUrl = null; }

  // ── EDITABLE PROFILE ──
  startEditProfile() {
    this.editProfile = {
      address: this.userData.address || '',
      public_phone: this.userData.public_phone || '',
      public_email: this.userData.public_email || '',
      schedule_weekdays: this.userData.schedule_weekdays || '',
      schedule_weekends: this.userData.schedule_weekends || '',
      description: this.userData.description || ''
    };
    this.isEditingProfile = true;
  }

  cancelEditProfile() { this.isEditingProfile = false; }

  async saveProfile() {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(this.editProfile)
      });
      if (res.ok) {
        Object.assign(this.userData, this.editProfile);
        this.isEditingProfile = false;
        this.cdr.detectChanges();
      }
    } catch (e) { console.error('Error guardando perfil', e); }
  }

  // ── WOMPI ──
  loadWompiScript() {
    if (!document.getElementById('wompi-script')) {
      const script = document.createElement('script');
      script.id = 'wompi-script'; script.src = 'https://checkout.wompi.co/widget.js'; script.async = true;
      document.body.appendChild(script);
    }
  }

  promoteEvent(event: any) {
    if (event.status !== 'approved') { alert('Solo puedes promocionar eventos aprobados.'); return; }
    if (typeof WidgetCheckout === 'undefined') { alert('Error cargando pasarela de pagos. Recarga la página.'); return; }
    const reference = `VEMO-PROMO-${event.id}-${Date.now()}`;
    const checkout = new WidgetCheckout({
      currency: 'COP', amountInCents: this.promotionPrice, reference,
      publicKey: this.wompiPublicKey, redirectUrl: window.location.origin + '/profile',
      taxInCents: { vat: 0, consumption: 0 },
      customerData: { email: this.userData.email, fullName: this.userData.company_name || this.userData.username, phoneNumber: this.userData.phone, phoneNumberPrefix: '+57' }
    });
    checkout.open((result: any) => {
      if (result.transaction?.status === 'APPROVED') {
        alert('Pago exitoso. Tu evento ahora será destacado.');
        this.savePromotionInBackend(event.id, result.transaction.id);
      }
    });
  }

  async savePromotionInBackend(eventId: string, transactionId: string) {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    try {
      await fetch(`${environment.apiUrl}/api/organizer/promote-success`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId, transactionId })
      });
      this.loadMyEvents();
    } catch {}
  }

  // ── ADMIN: Review modals ──
  openEventReview(event: any) { this.selectedEventForReview = event; }
  closeEventReview() { this.selectedEventForReview = null; }

  startAdminEditEvent(event: any) {
    // Antes: abríamos un mini-modal con 3 campos (título, descripción, ubicación).
    // Ahora: navegamos al MISMO formulario que usa el organizador al crear un
    // evento, en modo edición, con TODO precargado (incluido el mapa, las
    // categorías, la emoción, las fechas, los match/system fields, etc.).
    if (!event?.id) return;
    this.router.navigate(['/edit-event', event.id]);
  }
  cancelAdminEdit() { this.adminEditingEvent = null; }
  async saveAdminEdit() {
    if (!this.adminEditingEvent) return;
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    try {
      const res = await fetch(`${environment.apiUrl}/api/events/update/${this.adminEditingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: this.adminEditingEvent.title,
          description: this.adminEditingEvent.description,
          location_name: this.adminEditingEvent.location_name,
          date_event: this.adminEditingEvent.date_event
        })
      });
      if (res.ok) {
        alert('Evento actualizado desde admin.');
        this.adminEditingEvent = null;
        await this.loadAdminEvents();
        await this.loadAllEvents();
      }
    } catch { alert('Error al guardar cambios.'); }
  }

  // ── DATA LOADING ──
  async getProfileData() {
    this.loading = true;
    this.resetLocalState();
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    if (!token) { this.router.navigate(['/auth']); return; }

    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/profile?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { this.logout(); return; }
      const data = await res.json();
      if (res.ok) {
        this.userData = data.user;
        console.log('Profile loaded:', { role: this.userData.role, company: this.userData.company_name, status: this.userData.verification_status, profile_url: this.userData.profile_url });
        if (this.userData.role === 'admin') {
          await Promise.all([this.loadAdminData(), this.loadAdminEvents(), this.loadAllOrganizers(), this.loadAllEvents()]);
        } else if (this.userData.role === 'organizer') {
          await this.loadMyEvents();
        } else {
          await this.loadVisitHistory();
        }
      }
    } catch (error) { console.error('Error cargando perfil:', error); }
    finally { this.loading = false; this.cdr.detectChanges(); }
  }

  async loadMyEvents() {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    try {
      const res = await fetch(`${environment.apiUrl}/api/organizer/my-events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        this.myEvents = await res.json();
        console.log('My events loaded:', this.myEvents.length);
        this.calculateMetrics();
      } else {
        console.error('Failed to load events:', res.status);
      }
    } catch (err) { console.error('Error loading events:', err); }
  }

  async loadVisitHistory() {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    try {
      const res = await fetch(`${environment.apiUrl}/api/user/visit-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) this.visitHistory = await res.json();
    } catch {}
  }

  goToCreateEvent() {
    if (this.userData?.verification_status === 'approved') this.router.navigate(['/create-event']);
    else alert('Tu cuenta debe estar verificada para crear eventos.');
  }

  goToCreateType(type: 'evento' | 'experiencia') {
    if (this.userData?.verification_status === 'approved') {
      this.router.navigate(['/create-event'], { queryParams: { type } });
    } else {
      alert('Tu cuenta debe estar verificada para crear eventos.');
    }
  }
  goToVerify() { this.router.navigate(['/onboarding/verify']); }

  // ── ADMIN DATA ──
  async loadAdminData() {
    try {
      const res = await fetch(`${environment.apiUrl}/api/admin/verifications?t=${Date.now()}`);
      if (res.ok) this.pendingVerifications = await res.json();
    } catch {}
  }

  async loadAdminEvents() {
    try {
      const res = await fetch(`${environment.apiUrl}/api/admin/events-pending`);
      if (res.ok) this.pendingEvents = await res.json();
    } catch {}
  }

  async loadAllOrganizers() {
    try {
      const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
      const res = await fetch(`${environment.apiUrl}/api/admin/organizers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) this.allOrganizers = await res.json();
    } catch {}
  }

  async loadAllEvents() {
    try {
      const res = await fetch(`${environment.apiUrl}/api/events`);
      if (res.ok) this.allEvents = await res.json();
    } catch {}
  }

  async processDecision(userId: string, status: string) {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    let reason = status === 'rejected' ? (prompt('Motivo del rechazo:') || 'Documentación incompleta') : null;
    if (status === 'action_required') reason = prompt('¿Qué debe corregir?') || 'Revisar documentos';
    if (status === 'approved' || status === 'rejected') {
      if (!confirm(`¿Desea ${status === 'approved' ? 'aprobar' : 'rechazar'} esta identidad?`)) return;
    }

    try {
      const res = await fetch(`${environment.apiUrl}/api/admin/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, status, reason })
      });
      if (res.ok) { alert('Decisión procesada'); await this.loadAdminData(); }
    } catch {}
  }

  async decideEvent(eventId: string, status: string, organizerId: string) {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    let reason = status === 'rejected' ? (prompt('Motivo:') || 'No cumple normas') : null;
    await fetch(`${environment.apiUrl}/api/admin/event-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ eventId, status, reason, organizerId })
    });
    alert(status === 'approved' ? 'Publicado' : 'Rechazado');
    this.closeEventReview();
    this.loadAdminEvents();
    this.loadAllEvents();
  }

  async toggleEventStatus(eventId: string, currentStatus: string) {
    const newStatus = currentStatus === 'approved' ? 'deactivated' : 'approved';
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    try {
      await fetch(`${environment.apiUrl}/api/admin/event-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId, status: newStatus })
      });
      await this.loadAllEvents();
      this.cdr.detectChanges();
    } catch {}
  }

  getOrganizerOnboardingStep(org: any): string {
    if (org.verification_status === 'approved') return 'Activo';
    if (org.verification_status === 'pending') return 'En revisión';
    if (org.verification_status === 'rejected') return 'Rechazado';
    if (org.verification_status === 'action_required') return 'Corrigiendo';
    return 'Sin verificar';
  }

  parseSchedule(json: string): any[] {
    try { return JSON.parse(json); } catch { return []; }
  }

  openCedulaReview(req: any) { this.selectedCedulaReview = req; }
  closeCedulaReview() { this.selectedCedulaReview = null; }

  getCedulaFrontUrl(req: any): string | null {
    return req?.frontUrl || req?.id_document_front || req?.id_front_path || null;
  }
  getCedulaBackUrl(req: any): string | null {
    return req?.backUrl || req?.id_document_back || req?.id_back_path || null;
  }

  viewImage(url: string | null) { if (url) window.open(url, '_blank'); }
  goToPlatformConfig() { this.router.navigate(['/platform-config']); }

  logout() {
    localStorage.clear(); sessionStorage.clear();
    this.resetLocalState();
    this.router.navigate(['/auth']);
  }
}
