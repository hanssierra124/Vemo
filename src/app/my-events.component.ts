// ════════════════════════════════════════════════════════════════════
// MyEventsComponent (Asistiré Inteligente — Fase A1) — historial de
// asistencia del usuario por estado: Asistiré / Finalizados / Cancelados.
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AttendanceService } from './attendance.service';
import { AttendanceHistoryItem, AttendanceStatus } from './models/attendance.model';

type Tab = 'going' | 'finished' | 'cancelled';

@Component({
  selector: 'app-my-events',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="me-wrap">
      <header class="me-header">
        <span class="me-eyebrow">ASISTIRÉ INTELIGENTE</span>
        <h1 class="me-title clash-display">Mis eventos</h1>
        <p class="me-sub">Tu historial de asistencia: lo que vas a vivir y lo que ya viviste.</p>
      </header>

      <div class="me-state" *ngIf="!isLoggedIn">
        Inicia sesión para ver tus eventos.
        <a routerLink="/auth" class="me-cta">Iniciar sesión</a>
      </div>

      <ng-container *ngIf="isLoggedIn">
        <div class="me-tabs">
          <button *ngFor="let t of tabs" class="me-tab" [class.active]="tab === t.value"
                  (click)="setTab(t.value)">{{ t.label }}</button>
        </div>

        <div class="me-list" *ngIf="!loading">
          <a class="me-card" *ngFor="let it of items" [routerLink]="['/event', it.event?.id]">
            <span class="me-thumb" [style.backgroundImage]="it.event?.image_url ? 'url(' + it.event?.image_url + ')' : null"></span>
            <div class="me-info">
              <h3 class="me-ev-title">{{ it.event?.title || 'Evento' }}</h3>
              <p class="me-ev-meta" *ngIf="it.event?.date_event">{{ it.event?.date_event | date:'EEE d MMM, HH:mm' }}</p>
              <p class="me-ev-meta" *ngIf="it.event?.location_name">{{ it.event?.location_name }}<span *ngIf="it.event?.city">, {{ it.event?.city }}</span></p>
              <span class="me-badge" [class]="'b-' + it.status">{{ statusLabel(it.status) }}</span>
            </div>
          </a>
          <p class="me-empty" *ngIf="items.length === 0">No hay eventos en esta categoría.</p>
        </div>

        <p class="me-state" *ngIf="loading">Cargando…</p>

        <button class="me-more" *ngIf="nextCursor && !loading" [disabled]="loadingMore" (click)="loadMore()">
          {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
        </button>
      </ng-container>
    </div>
  `,
  styles: [`
    .me-wrap { max-width: 720px; margin: 0 auto; padding: 40px 16px 90px; }
    .me-header { margin-bottom: 22px; }
    .me-eyebrow { font-size: 11px; letter-spacing: 3px; font-weight: 700;
      background: linear-gradient(135deg,#FF4D80,#FFD700); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .me-title { font-size: 38px; color: #fff; margin: 6px 0 4px; line-height: 1; }
    .me-sub { color: rgba(255,255,255,0.6); font-size: 14px; margin: 0; }
    .me-state { color: rgba(255,255,255,0.6); text-align: center; padding: 24px; }
    .me-cta { display: block; margin-top: 10px; color: #FFD700; text-decoration: none; font-weight: 700; }
    .me-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .me-tab { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7);
      border-radius: 20px; padding: 7px 18px; cursor: pointer; font-size: 13px; }
    .me-tab.active { background: linear-gradient(135deg,#FF4D80,#FFD700); color: #1a1a1a; font-weight: 700; border: none; }
    .me-card { display: flex; gap: 14px; text-decoration: none; padding: 12px; margin-bottom: 12px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; transition: border-color .15s; }
    .me-card:hover { border-color: rgba(255,77,128,0.4); }
    .me-thumb { width: 84px; height: 84px; flex: 0 0 84px; border-radius: 10px; background-size: cover; background-position: center;
      background-color: rgba(255,255,255,0.06); }
    .me-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .me-ev-title { font-size: 16px; color: #fff; margin: 0; font-weight: 700; }
    .me-ev-meta { font-size: 12px; color: rgba(255,255,255,0.6); margin: 0; }
    .me-badge { align-self: flex-start; margin-top: 4px; font-size: 11px; padding: 2px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: .5px; }
    .b-going { background: rgba(255,215,0,0.15); color: #FFD700; }
    .b-attended { background: rgba(74,222,128,0.15); color: #4ade80; }
    .b-no_show { background: rgba(255,122,144,0.15); color: #ff7a90; }
    .b-cancelled { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
    .me-empty { color: rgba(255,255,255,0.45); font-style: italic; padding: 8px 0; }
    .me-more { display: block; margin: 16px auto 0; background: transparent; color: #fff;
      border: 1px solid rgba(255,255,255,0.25); border-radius: 30px; padding: 10px 28px; cursor: pointer; }
  `],
})
export class MyEventsComponent implements OnInit {
  tab: Tab = 'going';
  items: AttendanceHistoryItem[] = [];
  nextCursor: string | null = null;
  loading = false;
  loadingMore = false;

  readonly tabs: { value: Tab; label: string }[] = [
    { value: 'going', label: 'Asistiré' },
    { value: 'finished', label: 'Finalizados' },
    { value: 'cancelled', label: 'Cancelados' },
  ];

  constructor(private attendance: AttendanceService, private cdr: ChangeDetectorRef) {}

  get isLoggedIn(): boolean {
    return !!(localStorage.getItem('vemo_token') || localStorage.getItem('token'));
  }

  ngOnInit() { if (this.isLoggedIn) this.load(); }

  statusLabel(s: AttendanceStatus): string {
    return { going: 'Asistiré', attended: 'Asististe', no_show: 'No asististe', cancelled: 'Cancelado' }[s] || s;
  }

  setTab(t: Tab) {
    if (this.tab === t) return;
    this.tab = t;
    this.load();
  }

  private async load() {
    this.loading = true;
    this.items = [];
    this.nextCursor = null;
    try {
      const page = await this.attendance.listMine(this.tab, null, 20);
      this.items = page.items;
      this.nextCursor = page.nextCursor;
    } catch { /* vacío en error */ } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loadMore() {
    if (!this.nextCursor || this.loadingMore) return;
    this.loadingMore = true;
    try {
      const page = await this.attendance.listMine(this.tab, this.nextCursor, 20);
      this.items = [...this.items, ...page.items];
      this.nextCursor = page.nextCursor;
    } catch { /* noop */ } finally {
      this.loadingMore = false;
      this.cdr.detectChanges();
    }
  }
}
