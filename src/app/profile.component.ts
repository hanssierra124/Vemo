import { environment } from '../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

declare var WidgetCheckout: any;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  userData: any = null;
  loading: boolean = true;

  // Datos Admin
  pendingVerifications: any[] = [];
  pendingEvents: any[] = [];
  activeTab: 'users' | 'events' = 'users';

  // Modal de Revisión (Admin)
  selectedEventForReview: any = null;

  // Datos Organizador
  myEvents: any[] = [];
  selectedEvent: any = null;           // Modal del organizador
  eventFilter: 'all' | 'active' | 'finished' = 'all';

  // MÉTRICAS GLOBALES
  totalViews: number = 0;
  totalSaves: number = 0;

  // WOMPI
  wompiPublicKey: string = 'pub_test_Q5yDA9xoKdePzhSGeVe9HAez7CTSG9IW';
  promotionPrice: number = 5000000;

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
    this.totalViews = 0;
    this.totalSaves = 0;
    this.selectedEvent = null;
    this.selectedEventForReview = null;
    this.cdr.detectChanges();
  }

  async onProfileImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.userData.profile_url = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('profileImage', file);
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');

    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/upload-profile-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const result = await res.json();
        this.userData.profile_url = result.imageUrl;
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.error("❌ Error al subir imagen", e);
      alert("No se pudo guardar la imagen. Revisa tu conexión.");
    }
  }

  calculateMetrics() {
    this.totalViews = this.myEvents.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
    this.totalSaves = this.myEvents.reduce((acc, curr) => acc + (curr.favorites_count || 0), 0);
    this.cdr.detectChanges();
  }

  get filteredMyEvents() {
    if (!this.myEvents) return [];
    const now = new Date();
    return this.myEvents.filter(event => {
      const eventDate = new Date(event.date);
      const isExpired = event.status === 'expired' || eventDate < now;
      if (this.eventFilter === 'active') return event.status === 'approved' && !isExpired;
      else if (this.eventFilter === 'finished') return isExpired || event.status === 'rejected';
      return true;
    });
  }

  setEventFilter(filter: 'all' | 'active' | 'finished') {
    this.eventFilter = filter;
  }

  // --- MODAL ORGANIZADOR ---
  viewOrganizerEvent(event: any) {
    this.selectedEvent = event;
  }

  closeOrganizerEvent() {
    this.selectedEvent = null;
  }

  duplicateOrEditEvent(event: any, mode: 'edit' | 'duplicate') {
    this.router.navigate(['/create-event'], { state: { mode, eventData: event } });
  }

  // --- WOMPI ---
  loadWompiScript() {
    if (!document.getElementById('wompi-script')) {
      const script = document.createElement('script');
      script.id = 'wompi-script';
      script.src = 'https://checkout.wompi.co/widget.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }

  promoteEvent(event: any) {
    if (event.status !== 'approved') {
      alert("Solo puedes promocionar eventos que ya hayan sido aprobados.");
      return;
    }
    if (typeof WidgetCheckout === 'undefined') {
      alert("Error cargando la pasarela de pagos. Recarga la página.");
      return;
    }

    const reference = `VEMO-PROMO-${event.id}-${Date.now()}`;
    const checkout = new WidgetCheckout({
      currency: 'COP',
      amountInCents: this.promotionPrice,
      reference: reference,
      publicKey: this.wompiPublicKey,
      redirectUrl: 'http://localhost:4200/profile',
      taxInCents: { vat: 0, consumption: 0 },
      customerData: {
        email: this.userData.email,
        fullName: this.userData.company_name || this.userData.username,
        phoneNumber: this.userData.phone,
        phoneNumberPrefix: '+57'
      }
    });

    checkout.open((result: any) => {
      const transaction = result.transaction;
      if (transaction.status === 'APPROVED') {
        alert("¡Pago Exitoso! Tu evento ahora será destacado.");
        this.savePromotionInBackend(event.id, transaction.id);
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
    } catch (e) {
      console.error("Error guardando promoción", e);
    }
  }

  openEventReview(event: any) { this.selectedEventForReview = event; }
  closeEventReview() { this.selectedEventForReview = null; }

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
        if (this.userData.role === 'admin') {
          await this.loadAdminData();
          await this.loadAdminEvents();
        } else if (this.userData.role === 'organizer' || this.userData.company_name) {
          await this.loadMyEvents();
        }
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loadMyEvents() {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    const res = await fetch(`${environment.apiUrl}/api/organizer/my-events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      this.myEvents = await res.json();
      this.calculateMetrics();
    }
  }

  goToCreateEvent() {
    if (this.userData?.verification_status === 'approved') this.router.navigate(['/create-event']);
    else alert('Tu cuenta debe estar verificada para crear eventos.');
  }

  goToVerify() { this.router.navigate(['/organizer-verify']); }

  async loadAdminData() {
    const res = await fetch(`${environment.apiUrl}/api/admin/verifications?t=${Date.now()}`);
    if (res.ok) this.pendingVerifications = await res.json();
  }

  async loadAdminEvents() {
    const res = await fetch(`${environment.apiUrl}/api/admin/events-pending`);
    if (res.ok) this.pendingEvents = await res.json();
  }

  async processDecision(userId: string, status: string) {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    let reason = status === 'rejected' ? (prompt('Motivo:') || 'Documentación incompleta') : null;
    if (!confirm(`¿Desea ${status === 'approved' ? 'aprobar' : 'rechazar'} esta identidad?`)) return;

    try {
      const res = await fetch(`${environment.apiUrl}/api/admin/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, status, reason })
      });
      if (res.ok) {
        alert("✅ Decisión procesada");
        await this.loadAdminData();
      }
    } catch (error) { console.error("Error de conexión"); }
  }

  async decideEvent(eventId: string, status: string, organizerId: string) {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    let reason = status === 'rejected' ? (prompt('Motivo:') || 'No cumple normas') : null;

    await fetch(`${environment.apiUrl}/api/admin/event-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ eventId, status, reason, organizerId })
    });
    alert(status === 'approved' ? "✅ Publicado" : "❌ Rechazado");
    this.closeEventReview();
    this.loadAdminEvents();
  }

  viewImage(url: string) { if (url) window.open(url, '_blank'); }

  logout() {
    localStorage.clear();
    sessionStorage.clear();
    this.resetLocalState();
    this.router.navigate(['/auth']);
  }
}