// ════════════════════════════════════════════════════════════════════
// EventAnalyticsComponent (Asistiré Inteligente — Fase A3) — dashboard del
// organizador para un evento: interesados, previstos, reales, conversión,
// tendencia de RSVP, horarios de mayor interacción y demografía.
// Protegido por el endpoint requireEventOwner (403 si no es el dueño).
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsService } from './analytics.service';
import { PredictionService } from './prediction.service';
import { EventAnalytics } from './models/analytics.model';
import { EventPrediction } from './models/prediction.model';

@Component({
  selector: 'app-event-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="an-wrap" *ngIf="data; else stateTpl">
      <header class="an-head">
        <span class="an-eyebrow">ASISTIRÉ INTELIGENTE · ANALÍTICA</span>
        <h1 class="an-title clash-display">{{ data.event.title }}</h1>
        <a [routerLink]="['/event', data.event.id]" class="an-back">← Volver al evento</a>
      </header>

      <!-- KPIs -->
      <div class="an-kpis">
        <div class="an-kpi"><b>{{ data.summary.interested }}</b><span>Interesados</span></div>
        <div class="an-kpi"><b>{{ data.summary.going }}</b><span>Previstos (RSVP)</span></div>
        <div class="an-kpi"><b>{{ data.summary.attended }}</b><span>Reales (check-in)</span></div>
        <div class="an-kpi highlight"><b>{{ (data.summary.conversion * 100) | number:'1.0-0' }}%</b><span>Conversión</span></div>
        <div class="an-kpi"><b>{{ data.summary.views }}</b><span>Vistas</span></div>
        <div class="an-kpi"><b>{{ data.summary.shares }}</b><span>Compartidos</span></div>
        <div class="an-kpi" *ngIf="data.summary.fill_rate !== null">
          <b>{{ (data.summary.fill_rate * 100) | number:'1.0-0' }}%</b><span>Aforo ({{ data.summary.capacity }})</span>
        </div>
      </div>

      <!-- Predicción de asistencia (A4) -->
      <section class="an-card pred" *ngIf="prediction">
        <h3 class="an-section">Predicción de asistencia
          <span class="pred-model">{{ prediction.model_version }}</span></h3>
        <div class="pred-grid">
          <div class="pred-cell"><b>{{ prediction.confirmed }}</b><span>Confirmada</span><small>check-in</small></div>
          <div class="pred-cell"><b>{{ prediction.probable }}</b><span>Probable</span><small>alta fiabilidad</small></div>
          <div class="pred-cell highlight"><b>{{ prediction.estimated }}</b><span>Estimada</span><small>valor esperado</small></div>
          <div class="pred-cell"><b>{{ prediction.committed }}</b><span>Comprometidos</span><small>dijeron "asistiré"</small></div>
        </div>
        <div class="pred-conf">
          <span class="pred-conf-lbl">Confianza del modelo</span>
          <span class="pred-conf-track"><span class="pred-conf-fill" [style.width.%]="prediction.confidence * 100"></span></span>
          <span class="pred-conf-val">{{ (prediction.confidence * 100) | number:'1.0-0' }}%</span>
        </div>
      </section>

      <!-- Tendencia de RSVP -->
      <section class="an-card">
        <h3 class="an-section">Tendencia de RSVP (30 días)</h3>
        <div class="an-bars" *ngIf="data.trend.length; else noTrend">
          <div class="an-bar-col" *ngFor="let t of data.trend">
            <div class="an-bar" [style.height.%]="barPct(t.rsvps, maxTrend)"></div>
            <span class="an-bar-val">{{ t.rsvps }}</span>
            <span class="an-bar-lbl">{{ t.day | date:'d/M' }}</span>
          </div>
        </div>
        <ng-template #noTrend><p class="an-empty">Aún no hay RSVP registrados.</p></ng-template>
      </section>

      <!-- Horarios pico -->
      <section class="an-card">
        <h3 class="an-section">Horarios de mayor interacción</h3>
        <div class="an-hours" *ngIf="maxHour > 0; else noHours">
          <div class="an-hour" *ngFor="let h of data.peak_hours" [title]="h.hour + ':00 — ' + h.count">
            <div class="an-hour-bar" [style.height.%]="barPct(h.count, maxHour)"></div>
            <span class="an-hour-lbl" *ngIf="h.hour % 3 === 0">{{ h.hour }}h</span>
          </div>
        </div>
        <ng-template #noHours><p class="an-empty">Sin interacciones registradas todavía.</p></ng-template>
      </section>

      <!-- Demografía -->
      <section class="an-card">
        <h3 class="an-section">Perfil demográfico ({{ data.demographics.total }} asistentes)</h3>
        <div class="an-demo">
          <div class="an-demo-col">
            <h4 class="an-demo-title">Edad</h4>
            <div class="an-age-row" *ngFor="let b of ageEntries()">
              <span class="an-age-lbl">{{ b.k }}</span>
              <span class="an-age-track"><span class="an-age-fill" [style.width.%]="barPct(b.v, maxAge)"></span></span>
              <span class="an-age-val">{{ b.v }}</span>
            </div>
            <p class="an-muted" *ngIf="data.demographics.unknown_age">{{ data.demographics.unknown_age }} sin edad</p>
          </div>
          <div class="an-demo-col">
            <h4 class="an-demo-title">Ciudades</h4>
            <div class="an-city" *ngFor="let c of data.demographics.top_cities">
              <span>{{ c.city }}</span><b>{{ c.count }}</b>
            </div>
            <p class="an-empty" *ngIf="data.demographics.top_cities.length === 0">Sin datos de ciudad.</p>
          </div>
        </div>
      </section>
    </div>

    <ng-template #stateTpl>
      <div class="an-wrap"><p class="an-empty">{{ error || 'Cargando analítica…' }}</p></div>
    </ng-template>
  `,
  styles: [`
    .an-wrap { max-width: 860px; margin: 0 auto; padding: 40px 16px 90px; }
    .an-eyebrow { font-size: 11px; letter-spacing: 3px; font-weight: 700;
      background: linear-gradient(135deg,#FF4D80,#FFD700); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .an-title { font-size: 34px; color: #fff; margin: 6px 0 4px; line-height: 1.05; }
    .an-back { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 13px; }
    .an-back:hover { color: #FFD700; }
    .an-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 22px 0; }
    .an-kpi { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
      padding: 16px; text-align: center; display: flex; flex-direction: column; gap: 3px; }
    .an-kpi b { font-size: 26px; color: #fff; }
    .an-kpi span { font-size: 11px; color: rgba(255,255,255,0.55); }
    .an-kpi.highlight { background: linear-gradient(135deg, rgba(255,77,128,0.14), rgba(255,215,0,0.12)); border-color: rgba(255,215,0,0.3); }
    .an-kpi.highlight b { color: #FFD700; }
    .an-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; margin-bottom: 16px; }
    .an-section { font-size: 16px; color: #fff; margin: 0 0 14px; }
    .an-bars { display: flex; gap: 6px; align-items: flex-end; height: 140px; overflow-x: auto; }
    .an-bar-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-width: 30px; height: 100%; }
    .an-bar { width: 18px; background: linear-gradient(180deg,#FFD700,#FF4D80); border-radius: 5px 5px 0 0; min-height: 3px; }
    .an-bar-val { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 3px; }
    .an-bar-lbl { font-size: 9px; color: rgba(255,255,255,0.4); }
    .an-hours { display: flex; gap: 3px; align-items: flex-end; height: 110px; }
    .an-hour { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
    .an-hour-bar { width: 100%; background: linear-gradient(180deg,#6A00FF,#FF4D80); border-radius: 3px 3px 0 0; min-height: 2px; }
    .an-hour-lbl { font-size: 9px; color: rgba(255,255,255,0.4); margin-top: 3px; }
    .an-demo { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .an-demo-title { font-size: 13px; color: rgba(255,255,255,0.7); margin: 0 0 10px; }
    .an-age-row { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 6px; }
    .an-age-lbl { width: 48px; color: rgba(255,255,255,0.6); }
    .an-age-track { flex: 1; height: 8px; background: rgba(255,255,255,0.07); border-radius: 6px; overflow: hidden; }
    .an-age-fill { display: block; height: 100%; background: linear-gradient(90deg,#FF4D80,#FFD700); }
    .an-age-val { width: 24px; color: rgba(255,255,255,0.5); text-align: right; }
    .an-city { display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,0.8); padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .an-muted { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px; }
    .an-empty { color: rgba(255,255,255,0.45); font-style: italic; }
    .pred { background: linear-gradient(135deg, rgba(106,0,255,0.10), rgba(255,77,128,0.08)); border-color: rgba(106,0,255,0.3); }
    .pred-model { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: rgba(255,255,255,0.4); margin-left: 8px; text-transform: uppercase; }
    .pred-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
    .pred-cell { text-align: center; display: flex; flex-direction: column; gap: 2px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.03); }
    .pred-cell b { font-size: 28px; color: #fff; }
    .pred-cell span { font-size: 12px; color: rgba(255,255,255,0.7); }
    .pred-cell small { font-size: 10px; color: rgba(255,255,255,0.4); }
    .pred-cell.highlight { background: linear-gradient(135deg, rgba(255,77,128,0.18), rgba(255,215,0,0.14)); }
    .pred-cell.highlight b { color: #FFD700; }
    .pred-conf { display: flex; align-items: center; gap: 10px; font-size: 12px; }
    .pred-conf-lbl { color: rgba(255,255,255,0.6); white-space: nowrap; }
    .pred-conf-track { flex: 1; height: 8px; background: rgba(255,255,255,0.08); border-radius: 6px; overflow: hidden; }
    .pred-conf-fill { display: block; height: 100%; background: linear-gradient(90deg,#6A00FF,#FFD700); }
    .pred-conf-val { color: #FFD700; font-weight: 700; }
    @media (max-width: 560px) { .an-demo { grid-template-columns: 1fr; } .pred-grid { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class EventAnalyticsComponent implements OnInit {
  data: EventAnalytics | null = null;
  prediction: EventPrediction | null = null;
  error: string | null = null;
  maxTrend = 1;
  maxHour = 0;
  maxAge = 1;

  constructor(
    private route: ActivatedRoute,
    private analytics: AnalyticsService,
    private predictionService: PredictionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  private async load(id: string) {
    try {
      this.data = await this.analytics.getEventAnalytics(id);
      this.maxTrend = Math.max(1, ...this.data.trend.map((t) => t.rsvps));
      this.maxHour = Math.max(0, ...this.data.peak_hours.map((h) => h.count));
      this.maxAge = Math.max(1, ...Object.values(this.data.demographics.age_buckets));
      // Predicción: best-effort, no bloquea la analítica.
      this.predictionService.getPrediction(id).then((p) => { this.prediction = p; this.cdr.detectChanges(); }).catch(() => {});
    } catch (e: any) {
      this.error = e?.message === 'Solo el organizador del evento puede hacer esto.'
        ? 'Esta analítica es solo para el organizador del evento.'
        : (e?.message || 'No se pudo cargar la analítica.');
    } finally {
      this.cdr.detectChanges();
    }
  }

  barPct(v: number, max: number): number {
    return max > 0 ? Math.max(2, Math.round((v / max) * 100)) : 0;
  }

  ageEntries(): { k: string; v: number }[] {
    const b = this.data?.demographics.age_buckets || {};
    return ['<18', '18-24', '25-34', '35-44', '45+'].map((k) => ({ k, v: b[k] || 0 }));
  }
}
