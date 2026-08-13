// ════════════════════════════════════════════════════════════════════
// ModerationComponent (Fase F4) — cola de moderación para administradores.
// Lista reportes y permite resolver/descartar, ocultar contenido y
// suspender autores. Protegida por endpoints requireAdmin (403 si no admin).
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModerationService } from './moderation.service';
import { ModerationReport, ReportStatus } from './models/moderation.model';
import { renderSafeMarkdown } from './utils/markdown';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mod-wrap">
      <header class="mod-header">
        <span class="mod-eyebrow">PANEL ADMIN</span>
        <h1 class="mod-title clash-display">Moderación</h1>
        <p class="mod-subtitle">Reportes de la comunidad: resuelve, oculta contenido o suspende autores.</p>
      </header>

      <div class="mod-tabs">
        <button *ngFor="let t of tabs" class="mod-tab" [class.active]="status === t.value"
                (click)="setStatus(t.value)">{{ t.label }}</button>
      </div>

      <p class="mod-state" *ngIf="error">{{ error }}</p>
      <p class="mod-state" *ngIf="!error && loaded && reports.length === 0">No hay reportes en esta categoría.</p>

      <div class="mod-report" *ngFor="let r of reports">
        <div class="mod-head">
          <span class="mod-reason">{{ reasonLabel(r.reason) }}</span>
          <span class="mod-status" [class]="'st-' + r.status">{{ r.status }}</span>
          <span class="mod-time">{{ r.created_at | date:'short' }}</span>
        </div>
        <p class="mod-reporter">Reportado por <b>{{ r.reporter?.username || 'Usuario' }}</b>
          <span *ngIf="r.details">— “{{ r.details }}”</span></p>

        <div class="mod-target" *ngIf="r.target; else goneTpl">
          <span class="mod-target-type">{{ r.target.type === 'review' ? 'Reseña' : 'Comentario' }}
            de <b>{{ r.target.author?.username || 'Usuario' }}</b>
            <span class="mod-hidden" *ngIf="r.target.status !== 'visible'">({{ r.target.status }})</span>
          </span>
          <p class="mod-target-title" *ngIf="r.target.title">{{ r.target.title }}</p>
          <div class="mod-target-body" *ngIf="r.target.body" [innerHTML]="render(r.target.body)"></div>
        </div>
        <ng-template #goneTpl><p class="mod-gone">El contenido ya no existe.</p></ng-template>

        <div class="mod-actions" *ngIf="r.status === 'open'">
          <button class="mod-btn warn" *ngIf="r.target && r.target.type === 'review' && r.target.status === 'visible'"
                  [disabled]="busy" (click)="hideReview(r)">Ocultar reseña</button>
          <button class="mod-btn ok" *ngIf="r.target && r.target.type === 'review' && r.target.status !== 'visible'"
                  [disabled]="busy" (click)="unhideReview(r)">Mostrar reseña</button>
          <button class="mod-btn warn" *ngIf="r.target && r.target.type === 'comment' && r.target.status === 'visible'"
                  [disabled]="busy" (click)="hideComment(r)">Ocultar comentario</button>
          <button class="mod-btn danger" *ngIf="r.target?.author" [disabled]="busy" (click)="suspend(r)">Suspender autor</button>
          <button class="mod-btn" *ngIf="r.target?.author" [disabled]="busy" (click)="unsuspend(r)">Reactivar autor</button>
          <button class="mod-btn ok" [disabled]="busy" (click)="resolve(r, 'resolved')">Resolver</button>
          <button class="mod-btn" [disabled]="busy" (click)="resolve(r, 'dismissed')">Descartar</button>
        </div>
        <p class="mod-resolution" *ngIf="r.status !== 'open' && r.resolution">Resolución: {{ r.resolution }}</p>
      </div>

      <button class="mod-more" *ngIf="nextCursor" [disabled]="loadingMore" (click)="loadMore()">
        {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; background-color: #0E0D12; min-height: 100vh; }
    .mod-wrap { max-width: 760px; margin: 0 auto; padding: calc(var(--vemo-header-h, 90px) + 28px) 16px 90px; }
    .mod-header { margin-bottom: 22px; }
    .mod-eyebrow { font-size: 11px; letter-spacing: 3px; font-weight: 700;
      background: var(--grad-warm, linear-gradient(135deg,#FF4D80,#FFD700));
      -webkit-background-clip: text; background-clip: text; color: transparent; }
    .mod-title { font-size: 38px; color: var(--text-1, #fff); margin: 6px 0 4px; line-height: 1; }
    .mod-subtitle { color: var(--text-2, rgba(255,255,255,0.6)); font-size: 14px; margin: 0; }
    .mod-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .mod-tab { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7);
      border-radius: 20px; padding: 6px 16px; cursor: pointer; font-size: 13px; }
    .mod-tab.active { background: linear-gradient(135deg, #FF4D80, #FFD700); color: #1a1a1a; font-weight: 700; border: none; }
    .mod-state { color: rgba(255,255,255,0.5); font-style: italic; }
    .mod-report { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px; padding: 16px; margin-bottom: 14px; }
    .mod-head { display: flex; align-items: center; gap: 10px; }
    .mod-reason { font-weight: 700; color: #FF4D80; text-transform: capitalize; }
    .mod-status { font-size: 11px; padding: 2px 8px; border-radius: 12px; text-transform: uppercase; }
    .mod-status.st-open { background: rgba(255,215,0,0.15); color: #FFD700; }
    .mod-status.st-resolved { background: rgba(74,222,128,0.15); color: #4ade80; }
    .mod-status.st-dismissed { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
    .mod-time { margin-left: auto; color: rgba(255,255,255,0.4); font-size: 12px; }
    .mod-reporter { color: rgba(255,255,255,0.65); font-size: 13px; margin: 8px 0; }
    .mod-target { background: rgba(255,255,255,0.03); border-left: 2px solid #FFD700; padding: 10px 12px; border-radius: 0 8px 8px 0; margin: 8px 0; }
    .mod-target-type { font-size: 12px; color: rgba(255,255,255,0.6); }
    .mod-hidden { color: #ff7a90; }
    .mod-target-title { font-weight: 700; color: #fff; margin: 4px 0; }
    .mod-target-body { color: rgba(255,255,255,0.82); font-size: 14px; line-height: 1.5; word-break: break-word; }
    .mod-gone { color: rgba(255,255,255,0.4); font-style: italic; }
    .mod-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .mod-btn { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.8);
      border-radius: 20px; padding: 7px 14px; cursor: pointer; font-size: 12px; }
    .mod-btn:hover:not(:disabled) { border-color: rgba(255,255,255,0.45); color: #fff; }
    .mod-btn.ok { color: #4ade80; border-color: rgba(74,222,128,0.4); }
    .mod-btn.warn { color: #FFD700; border-color: rgba(255,215,0,0.4); }
    .mod-btn.danger { color: #ff7a90; border-color: rgba(255,122,144,0.4); }
    .mod-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .mod-resolution { color: rgba(255,255,255,0.55); font-size: 12px; margin-top: 8px; }
    .mod-more { display: block; margin: 16px auto 0; background: transparent; color: #fff;
      border: 1px solid rgba(255,255,255,0.25); border-radius: 30px; padding: 10px 28px; cursor: pointer; }
  `],
})
export class ModerationComponent implements OnInit {
  reports: ModerationReport[] = [];
  nextCursor: string | null = null;
  status: ReportStatus | 'all' = 'open';
  loaded = false;
  loadingMore = false;
  busy = false;
  error: string | null = null;

  readonly tabs: { value: ReportStatus | 'all'; label: string }[] = [
    { value: 'open', label: 'Abiertos' },
    { value: 'resolved', label: 'Resueltos' },
    { value: 'dismissed', label: 'Descartados' },
    { value: 'all', label: 'Todos' },
  ];

  constructor(private mod: ModerationService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

  reasonLabel(r: string): string {
    const map: Record<string, string> = {
      spam: 'Spam', harassment: 'Acoso', offensive: 'Ofensivo',
      misinformation: 'Información falsa', other: 'Otro',
    };
    return map[r] || r;
  }

  render(md: string | null): string { return renderSafeMarkdown(md); }

  setStatus(s: ReportStatus | 'all') {
    if (this.status === s) return;
    this.status = s;
    this.load();
  }

  private async load() {
    this.loaded = false;
    this.error = null;
    try {
      const page = await this.mod.listReports(this.status);
      this.reports = page.items;
      this.nextCursor = page.nextCursor;
    } catch (e: any) {
      this.error = e?.message === 'Acceso restringido a administradores'
        ? 'Esta sección es solo para administradores.'
        : (e?.message || 'No se pudo cargar la cola.');
      this.reports = [];
    } finally {
      this.loaded = true;
      this.cdr.detectChanges();
    }
  }

  async loadMore() {
    if (!this.nextCursor || this.loadingMore) return;
    this.loadingMore = true;
    try {
      const page = await this.mod.listReports(this.status, this.nextCursor);
      this.reports = [...this.reports, ...page.items];
      this.nextCursor = page.nextCursor;
    } catch { /* noop */ } finally {
      this.loadingMore = false;
      this.cdr.detectChanges();
    }
  }

  async resolve(r: ModerationReport, status: 'resolved' | 'dismissed') {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.mod.resolve(r.id, status);
      r.status = status;
    } catch (e: any) { this.error = e?.message; } finally { this.busy = false; this.cdr.detectChanges(); }
  }

  async hideReview(r: ModerationReport) {
    if (this.busy || !r.target) return;
    this.busy = true;
    try {
      await this.mod.hideReview(r.target.id);
      r.target.status = 'hidden';
    } catch (e: any) { this.error = e?.message; } finally { this.busy = false; this.cdr.detectChanges(); }
  }

  async unhideReview(r: ModerationReport) {
    if (this.busy || !r.target) return;
    this.busy = true;
    try {
      await this.mod.unhideReview(r.target.id);
      r.target.status = 'visible';
    } catch (e: any) { this.error = e?.message; } finally { this.busy = false; this.cdr.detectChanges(); }
  }

  async hideComment(r: ModerationReport) {
    if (this.busy || !r.target) return;
    this.busy = true;
    try {
      await this.mod.hideComment(r.target.id);
      r.target.status = 'hidden';
    } catch (e: any) { this.error = e?.message; } finally { this.busy = false; this.cdr.detectChanges(); }
  }

  async suspend(r: ModerationReport) {
    if (this.busy || !r.target?.author) return;
    if (!confirm(`¿Suspender a ${r.target.author.username || 'este usuario'}? No podrá publicar ni interactuar.`)) return;
    this.busy = true;
    try {
      await this.mod.suspendUser(r.target.author.id);
      alert('Usuario suspendido.');
    } catch (e: any) { this.error = e?.message; } finally { this.busy = false; this.cdr.detectChanges(); }
  }

  async unsuspend(r: ModerationReport) {
    if (this.busy || !r.target?.author) return;
    if (!confirm(`¿Reactivar a ${r.target.author.username || 'este usuario'}? Volverá a poder publicar e interactuar.`)) return;
    this.busy = true;
    try {
      await this.mod.unsuspendUser(r.target.author.id);
      alert('Usuario reactivado.');
    } catch (e: any) { this.error = e?.message; } finally { this.busy = false; this.cdr.detectChanges(); }
  }
}
