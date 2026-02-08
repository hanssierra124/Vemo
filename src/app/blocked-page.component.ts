import { environment } from '../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-blocked-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="blocked-screen">
      <div class="card">
        <span class="status-dot"></span>
        <h1>Acceso Restringido</h1>
        <p>Tu cuenta de organizador ha sido rechazada tras la revisión de documentos.</p>
        
        <div class="reason-panel" *ngIf="reason">
          <small>MOTIVO DEL RECHAZO:</small>
          <p>{{ reason }}</p>
        </div>

        <p class="footer-text">Tu cuenta se encuentra en proceso de restricción. Contacta a soporte para más información.</p>
        
        <button (click)="goToLogin()">Volver al Inicio</button>
      </div>
    </div>
  `,
  styleUrls: ['./blocked-page.component.css']
})
export class BlockedPageComponent implements OnInit {
  reason: string = '';

  constructor(private router: Router) {}

  async ngOnInit() {
    const token = localStorage.getItem('vemo_token');
    if (!token) { this.router.navigate(['/auth']); return; }

    // Traemos el motivo real desde la base de datos para mostrarlo aquí
    const res = await fetch(`${environment.apiUrl}/api/auth/profile`);
    const data = await res.json();
    this.reason = data.user?.rejection_reason || 'Incumplimiento de términos de verificación.';
  }

  goToLogin() {
    localStorage.removeItem('vemo_token');
    this.router.navigate(['/auth']);
  }
}