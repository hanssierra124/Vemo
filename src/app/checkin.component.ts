// ════════════════════════════════════════════════════════════════════
// CheckinComponent (Asistiré Inteligente — Fase A2) — destino del QR.
// El asistente escanea el QR del evento (URL /checkin/:eventId?t=token);
// esta página realiza el check-in y muestra el resultado.
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CheckinService } from './checkin.service';

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="ck-wrap">
      <div class="ck-card">
        <div class="ck-icon" [class.ok]="state === 'ok'" [class.err]="state === 'error'">
          <span *ngIf="state === 'loading'">⏳</span>
          <span *ngIf="state === 'ok'">✓</span>
          <span *ngIf="state === 'error'">✕</span>
          <span *ngIf="state === 'login'">🔒</span>
        </div>
        <h1 class="ck-title clash-display">
          {{ state === 'loading' ? 'Registrando tu llegada…'
            : state === 'ok' ? (already ? 'Ya estabas registrado' : '¡Check-in confirmado!')
            : state === 'login' ? 'Inicia sesión'
            : 'No pudimos registrar tu llegada' }}
        </h1>
        <p class="ck-msg">{{ message }}</p>
        <a *ngIf="state === 'login'" routerLink="/auth" class="ck-btn">Iniciar sesión</a>
        <a *ngIf="state === 'ok' || state === 'error'" [routerLink]="['/event', eventId]" class="ck-btn">Ver evento</a>
      </div>
    </div>
  `,
  styles: [`
    .ck-wrap { min-height: 70vh; display: flex; align-items: center; justify-content: center;
      padding: calc(var(--vemo-header-h, 90px) + 24px) 24px 40px; }
    .ck-card { max-width: 420px; width: 100%; text-align: center; padding: 36px 28px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 22px; }
    .ck-icon { width: 72px; height: 72px; margin: 0 auto 18px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; font-size: 34px; background: rgba(255,255,255,0.06); color: #FFD700; }
    .ck-icon.ok { background: rgba(74,222,128,0.12); color: #4ade80; }
    .ck-icon.err { background: rgba(255,122,144,0.12); color: #ff7a90; }
    .ck-title { font-size: 26px; color: #fff; margin: 0 0 10px; }
    .ck-msg { color: rgba(255,255,255,0.65); margin: 0 0 20px; line-height: 1.5; }
    .ck-btn { display: inline-block; background: linear-gradient(135deg,#FF4D80,#FFD700); color: #1a1a1a;
      font-weight: 700; text-decoration: none; padding: 11px 26px; border-radius: 30px; }
  `],
})
export class CheckinComponent implements OnInit {
  eventId = '';
  state: 'loading' | 'ok' | 'error' | 'login' = 'loading';
  already = false;
  message = '';

  constructor(private route: ActivatedRoute, private checkin: CheckinService, private cdr: ChangeDetectorRef) {}

  get isLoggedIn(): boolean {
    return !!(localStorage.getItem('vemo_token') || localStorage.getItem('token'));
  }

  async ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('eventId') || '';
    const token = this.route.snapshot.queryParamMap.get('t') || '';

    if (!this.isLoggedIn) {
      this.state = 'login';
      this.message = 'Necesitas iniciar sesión para registrar tu asistencia. Vuelve a escanear el código después.';
      return;
    }
    if (!this.eventId || !token) {
      this.state = 'error';
      this.message = 'El código de check-in es inválido o está incompleto.';
      return;
    }

    try {
      const res = await this.checkin.checkIn(this.eventId, token);
      this.already = res.already;
      this.state = 'ok';
      this.message = res.already
        ? 'Tu asistencia ya estaba confirmada. ¡Disfruta el evento!'
        : 'Registramos tu llegada. ¡Disfruta el evento!';
    } catch (e: any) {
      this.state = 'error';
      this.message = e?.message || 'No pudimos registrar tu llegada. Pide ayuda al organizador.';
    } finally {
      this.cdr.detectChanges();
    }
  }
}
