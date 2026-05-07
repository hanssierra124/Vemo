import { environment } from '../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-private-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './private-event.component.html',
  styleUrls: ['./private-event.component.css']
})
export class PrivateEventComponent implements OnInit {
  event: any = null;
  loading = true;
  error = '';
  token = '';

  needsPassword = false;
  passwordInput = '';
  passwordError = '';
  checkingPassword = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (this.token) this.loadEvent();
  }

  async loadEvent() {
    this.loading = true;
    this.error = '';
    try {
      const res = await fetch(`${environment.apiUrl}/api/events/private/${this.token}`);
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.requiresPassword) {
          this.needsPassword = true;
        } else {
          this.error = 'No tienes acceso a este evento.';
        }
      } else if (res.status === 404) {
        this.error = 'El link de este evento no existe o ya expiró.';
      } else if (res.ok) {
        this.event = await res.json();
      } else {
        this.error = 'Error al cargar el evento.';
      }
    } catch {
      this.error = 'Error de conexión.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async submitPassword() {
    if (!this.passwordInput.trim()) return;
    this.checkingPassword = true;
    this.passwordError = '';
    try {
      const res = await fetch(
        `${environment.apiUrl}/api/events/private/${this.token}?password=${encodeURIComponent(this.passwordInput)}`,
      );
      if (res.ok) {
        this.event = await res.json();
        this.needsPassword = false;
      } else {
        this.passwordError = 'Contraseña incorrecta. Inténtalo de nuevo.';
      }
    } catch {
      this.passwordError = 'Error de conexión.';
    } finally {
      this.checkingPassword = false;
      this.cdr.detectChanges();
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  goHome() { this.router.navigate(['/home']); }
}
