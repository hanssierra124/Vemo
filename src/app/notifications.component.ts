// ════════════════════════════════════════════════════════════════════
// NotificationsComponent (Asistiré Inteligente — Fase A5) — bandeja in-app:
// lista de notificaciones, marcar leídas y preferencia de recordatorios.
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NotificationService } from './notification.service';
import { AppNotification, NotificationPreferences } from './models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="nt-wrap">
      <header class="nt-head">
        <div>
          <span class="nt-eyebrow">ASISTIRÉ INTELIGENTE</span>
          <h1 class="nt-title clash-display">Notificaciones</h1>
        </div>
        <button class="nt-readall" *ngIf="items.length" (click)="markAll()">Marcar todo leído</button>
      </header>

      <div class="nt-state" *ngIf="!isLoggedIn">
        Inicia sesión para ver tus notificaciones.
        <a routerLink="/auth" class="nt-cta">Iniciar sesión</a>
      </div>

      <ng-container *ngIf="isLoggedIn">
        <label class="nt-pref" *ngIf="prefs">
          <input type="checkbox" [checked]="prefs.reminders_enabled" (change)="toggleReminders($event)" />
          Recordatorios de mis eventos (7 días, 24 h, 1 h e inicio)
        </label>

        <div class="nt-list" *ngIf="!loading">
          <button class="nt-item" *ngFor="let n of items" [class.unread]="!n.read_at" (click)="open(n)">
            <span class="nt-icon">{{ icon(n.type) }}</span>
            <span class="nt-body">
              <b class="nt-it-title">{{ n.title || 'Notificación' }}</b>
              <span class="nt-it-text">{{ n.body }}</span>
              <span class="nt-time">{{ n.created_at | date:'short' }}</span>
            </span>
            <span class="nt-dot" *ngIf="!n.read_at"></span>
          </button>
          <p class="nt-empty" *ngIf="items.length === 0">No tienes notificaciones todavía.</p>
        </div>
        <p class="nt-state" *ngIf="loading">Cargando…</p>

        <button class="nt-more" *ngIf="nextCursor && !loading" [disabled]="loadingMore" (click)="loadMore()">
          {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
        </button>
      </ng-container>
    </div>
  `,
  styles: [`
    .nt-wrap { max-width: 620px; margin: 0 auto; padding: calc(var(--vemo-header-h, 90px) + 28px) 16px 90px; }
    .nt-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 18px; gap: 12px; }
    .nt-eyebrow { font-size: 11px; letter-spacing: 3px; font-weight: 700;
      background: linear-gradient(135deg,#FF4D80,#FFD700); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .nt-title { font-size: 32px; color: #fff; margin: 6px 0 0; }
    .nt-readall { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.8);
      border-radius: 20px; padding: 7px 14px; cursor: pointer; font-size: 12px; white-space: nowrap; }
    .nt-readall:hover { border-color: #FFD700; color: #FFD700; }
    .nt-state { color: rgba(255,255,255,0.6); text-align: center; padding: 24px; }
    .nt-cta { display: block; margin-top: 10px; color: #FFD700; text-decoration: none; font-weight: 700; }
    .nt-pref { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.8); font-size: 13px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; cursor: pointer; }
    .nt-item { display: flex; align-items: flex-start; gap: 12px; width: 100%; text-align: left; cursor: pointer;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; margin-bottom: 10px; }
    .nt-item.unread { background: rgba(255,77,128,0.06); border-color: rgba(255,77,128,0.22); }
    .nt-item:hover { border-color: rgba(255,255,255,0.25); }
    .nt-icon { font-size: 20px; flex: 0 0 auto; }
    .nt-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .nt-it-title { color: #fff; font-size: 14px; }
    .nt-it-text { color: rgba(255,255,255,0.7); font-size: 13px; }
    .nt-time { color: rgba(255,255,255,0.4); font-size: 11px; margin-top: 2px; }
    .nt-dot { width: 9px; height: 9px; border-radius: 50%; background: #FF4D80; flex: 0 0 auto; margin-top: 4px; }
    .nt-empty { color: rgba(255,255,255,0.45); font-style: italic; }
    .nt-more { display: block; margin: 14px auto 0; background: transparent; color: #fff;
      border: 1px solid rgba(255,255,255,0.25); border-radius: 30px; padding: 10px 28px; cursor: pointer; }
  `],
})
export class NotificationsComponent implements OnInit {
  items: AppNotification[] = [];
  prefs: NotificationPreferences | null = null;
  nextCursor: string | null = null;
  loading = false;
  loadingMore = false;

  constructor(private notifications: NotificationService, private router: Router, private cdr: ChangeDetectorRef) {}

  get isLoggedIn(): boolean {
    return !!(localStorage.getItem('vemo_token') || localStorage.getItem('token'));
  }

  ngOnInit() {
    if (!this.isLoggedIn) return;
    this.load();
    this.notifications.getPreferences().then((p) => { this.prefs = p; this.cdr.detectChanges(); }).catch(() => {});
  }

  icon(type: string): string {
    return {
      reminder_7d: '🗓️', reminder_24h: '⏰', reminder_1h: '⌛', event_start: '🎉',
      event_decision: '📋', verification_decision: '🛡️', event_updated: '🔄',
      mood_confirm: '🎭', nearby_recommendation: '📍',
      generic: '🔔',
    }[type] || '🔔';
  }

  private async load() {
    this.loading = true;
    try {
      const page = await this.notifications.list({ limit: 20 });
      this.items = page.items;
      this.nextCursor = page.nextCursor;
    } catch { /* vacío */ } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loadMore() {
    if (!this.nextCursor || this.loadingMore) return;
    this.loadingMore = true;
    try {
      const page = await this.notifications.list({ cursor: this.nextCursor, limit: 20 });
      this.items = [...this.items, ...page.items];
      this.nextCursor = page.nextCursor;
    } catch { /* noop */ } finally {
      this.loadingMore = false;
      this.cdr.detectChanges();
    }
  }

  async open(n: AppNotification) {
    if (!n.read_at) {
      n.read_at = new Date().toISOString();
      this.notifications.markRead(n.id).catch(() => {});
    }
    this.navigateFor(n);
    this.cdr.detectChanges();
  }

  // title/body ya vienen redactados desde el backend — el front solo decide
  // a dónde saltar según el `type` (y el `event_id` cuando aplica).
  private navigateFor(n: AppNotification) {
    switch (n.type) {
      case 'mood_confirm':
        // Abre el detalle del evento con el picker de emociones ya desplegado.
        if (n.event_id) this.router.navigate(['/event', n.event_id], { queryParams: { confirmMood: '1' } });
        return;
      case 'verification_decision':
        this.router.navigate(['/onboarding/verify']);
        return;
      case 'nearby_recommendation':
        this.router.navigate(['/descubrir']);
        return;
      case 'event_decision':
      case 'event_updated':
      default:
        if (n.event_id) this.router.navigate(['/event', n.event_id]);
        else this.router.navigate(['/profile']);
    }
  }

  async markAll() {
    try {
      await this.notifications.markAllRead();
      const now = new Date().toISOString();
      this.items = this.items.map((n) => ({ ...n, read_at: n.read_at || now }));
    } catch { /* noop */ } finally {
      this.cdr.detectChanges();
    }
  }

  async toggleReminders(ev: Event) {
    const enabled = (ev.target as HTMLInputElement).checked;
    try {
      this.prefs = await this.notifications.updatePreferences({ reminders_enabled: enabled });
    } catch { /* revert visual */ } finally {
      this.cdr.detectChanges();
    }
  }
}
