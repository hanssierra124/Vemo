// ════════════════════════════════════════════════════════════════════
// EventAnalyticsComponent (Asistiré Inteligente — Fase A3) — dashboard del
// organizador para un evento: interesados, previstos, reales, conversión,
// tendencia de RSVP, horarios de mayor interacción y demografía.
// Protegido por el endpoint requireEventOwner (403 si no es el dueño).
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsService } from './analytics.service';
import { PredictionService } from './prediction.service';
import { RosterService, RosterAttendee, EventInsights, TallyEntry } from './roster.service';
import { EventAnalytics } from './models/analytics.model';
import { EventPrediction } from './models/prediction.model';
import {
  INTERESES_DISPONIBLES, NEGATIVOS_DISPONIBLES, COMPANY_OPTIONS, TIME_OPTIONS,
  OUTING_FREQUENCY_OPTIONS, SPONTANEITY_OPTIONS, BUDGET_RANGE_OPTIONS, TRANSPORT_OPTIONS,
  SOCIAL_ENERGY_OPTIONS, INTENTION_OPTIONS, TARGET_COMPANY_OPTIONS, TIME_AVAILABLE_OPTIONS,
  PreferenceOption,
} from './shared/user-preferences-options';

@Component({
  selector: 'app-event-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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

      <!-- ══════ CENTRO DE COMANDO: asistentes reales + insights ══════ -->
      <section class="an-card cc-card">
        <h3 class="an-section">Asistentes reales
          <span class="cc-sub">{{ roster.length }} en total · {{ insights?.totals?.new || 0 }} nuevos · {{ insights?.totals?.recurring || 0 }} recurrentes</span>
        </h3>
        <p class="cc-note">Muchos de estos rasgos hoy vienen de lo que la persona marcó en su propio perfil de Vemo (todavía no son inferencia de IA).</p>

        <div class="cc-table-wrap" *ngIf="roster.length; else noRoster">
          <table class="cc-table">
            <thead>
              <tr>
                <th>Nombre</th><th>Origen</th><th>Estado</th><th>Nuevo/Recurrente</th>
                <th>Inscripción</th><th>Edad</th><th>Intereses</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let a of roster">
                <td>{{ a.name }}</td>
                <td><span class="cc-pill" [class.walkin]="a.source === 'walkin'">{{ a.source === 'walkin' ? 'Registro express' : 'App' }}</span></td>
                <td>{{ a.status === 'attended' ? '✓ Asistió' : 'Va a ir' }}</td>
                <td>{{ a.is_recurring ? 'Recurrente' : 'Nuevo' }}</td>
                <td>{{ a.registered_at ? (a.registered_at | date:'d MMM, h:mm a') : '—' }}</td>
                <td>{{ a.age ?? '—' }}</td>
                <td class="cc-chips-cell">
                  <span class="cc-mini-chip" *ngFor="let i of a.interests">{{ labelFor(interestOptions, i) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #noRoster><p class="an-empty">Aún no hay asistentes registrados para este evento.</p></ng-template>
      </section>

      <section class="an-card" *ngIf="insights">
        <h3 class="an-section">Insights de tu audiencia</h3>
        <div class="cc-charts-grid">
          <div class="cc-chart-box" *ngFor="let c of chartConfigs">
            <h4 class="cc-chart-title">{{ c.title }}</h4>
            <canvas [id]="c.canvasId" height="160"></canvas>
            <p class="an-empty" *ngIf="!tallyFor(c.key).length">Sin datos todavía.</p>
          </div>
        </div>
      </section>

      <!-- Vela: preguntar sobre estos insights -->
      <section class="an-card cc-vela">
        <h3 class="an-section">Pregúntale a Vela sobre este evento</h3>
        <div class="cc-vela-log" *ngIf="velaMessages.length">
          <div class="cc-vela-msg" [class.mine]="m.role === 'organizer'" *ngFor="let m of velaMessages">
            <b>{{ m.role === 'organizer' ? 'Tú' : 'Vela' }}</b>
            <p>{{ m.text }}</p>
          </div>
        </div>
        <div class="cc-vela-input-row">
          <input type="text" [(ngModel)]="velaInput" placeholder="Ej: ¿qué tipo de gente viene a mis eventos?"
                 (keyup.enter)="askVela()" [disabled]="velaBusy">
          <button type="button" (click)="askVela()" [disabled]="velaBusy || !velaInput.trim()">
            {{ velaBusy ? 'Pensando…' : 'Preguntar' }}
          </button>
        </div>
        <div class="cc-meeting-cta">
          <span>¿Prefieres que te lo expliquemos nosotros?</span>
          <a [href]="meetingCtaHref">Agendar una reunión →</a>
        </div>
      </section>
    </div>

    <ng-template #stateTpl>
      <div class="an-wrap"><p class="an-empty">{{ error || 'Cargando analítica…' }}</p></div>
    </ng-template>
  `,
  styles: [`
    .an-wrap { max-width: 860px; margin: 0 auto; padding: calc(var(--vemo-header-h, 90px) + 28px) 16px 90px; }
    .an-eyebrow { font-size: 11px; letter-spacing: 3px; font-weight: 700;
      background: linear-gradient(135deg,#FF4D80,#FFD700); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .an-title { font-size: 34px; color: #fff; margin: 6px 0 4px; line-height: 1.05; }
    .an-back { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 13px; }
    .an-back:hover { color: #FFD700; }
    .an-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(120px, 100%), 1fr)); gap: 12px; margin: 22px 0; }
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

    /* ══════ CENTRO DE COMANDO ══════ */
    .cc-sub { font-size: 11px; font-weight: 400; color: rgba(255,255,255,0.45); margin-left: 10px; }
    .cc-note { font-size: 11px; color: rgba(255,255,255,0.4); margin: -6px 0 14px; font-style: italic; }
    .cc-table-wrap { overflow-x: auto; }
    .cc-table { width: 100%; border-collapse: collapse; font-size: 12px; white-space: nowrap; }
    .cc-table th { text-align: left; color: rgba(255,255,255,0.5); font-weight: 600; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .cc-table td { padding: 8px 10px; color: rgba(255,255,255,0.85); border-bottom: 1px solid rgba(255,255,255,0.05); }
    .cc-pill { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 100px; background: rgba(106,0,255,0.18); color: #c9a3ff; }
    .cc-pill.walkin { background: rgba(255,215,0,0.15); color: #FFD700; }
    .cc-chips-cell { white-space: normal; max-width: 220px; }
    .cc-mini-chip { display: inline-block; font-size: 10px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); border-radius: 100px; padding: 2px 8px; margin: 1px; }
    .cc-charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .cc-chart-box { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 12px; }
    .cc-chart-title { font-size: 12px; color: rgba(255,255,255,0.7); margin: 0 0 8px; }
    .cc-vela-log { max-height: 260px; overflow-y: auto; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
    .cc-vela-msg { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 8px 12px; font-size: 13px; }
    .cc-vela-msg b { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #FFD700; display: block; margin-bottom: 2px; }
    .cc-vela-msg.mine { background: rgba(106,0,255,0.1); }
    .cc-vela-msg p { margin: 0; color: rgba(255,255,255,0.85); line-height: 1.5; white-space: pre-wrap; }
    .cc-vela-input-row { display: flex; gap: 8px; }
    .cc-vela-input-row input { flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px; color: #fff; font-size: 13px; }
    .cc-vela-input-row input:focus { outline: none; border-color: #FF4D80; }
    .cc-vela-input-row button { background: linear-gradient(135deg,#FF4D80,#FFD700); border: none; color: #1a1a1a; font-weight: 700; padding: 10px 18px; border-radius: 10px; cursor: pointer; white-space: nowrap; }
    .cc-vela-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
    .cc-meeting-cta { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: rgba(255,255,255,0.5); display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .cc-meeting-cta a { color: #FFD700; text-decoration: none; font-weight: 600; }
    .cc-meeting-cta a:hover { text-decoration: underline; }
  `],
})
export class EventAnalyticsComponent implements OnInit {
  data: EventAnalytics | null = null;
  prediction: EventPrediction | null = null;
  error: string | null = null;
  maxTrend = 1;
  maxHour = 0;
  maxAge = 1;

  // ── Centro de Comando: roster + insights ──
  roster: RosterAttendee[] = [];
  insights: EventInsights | null = null;
  readonly interestOptions = INTERESES_DISPONIBLES;

  velaMessages: { role: 'organizer' | 'vela'; text: string }[] = [];
  velaInput = '';
  velaBusy = false;
  // TODO(Vemo): reemplazar por el canal real de contacto del equipo (correo/WhatsApp/Calendly).
  meetingCtaHref = 'mailto:hola@vemo.app?subject=Quiero%20entender%20mejor%20mi%20audiencia';

  readonly chartConfigs: { key: keyof EventInsights; title: string; canvasId: string; options: PreferenceOption[] }[] = [
    { key: 'interests', title: 'Qué los mueve', canvasId: 'chart-interests', options: INTERESES_DISPONIBLES },
    { key: 'negative_preferences', title: 'Qué evitan', canvasId: 'chart-avoid', options: NEGATIVOS_DISPONIBLES },
    { key: 'preferred_company', title: 'Compañía habitual', canvasId: 'chart-company', options: COMPANY_OPTIONS },
    { key: 'preferred_time', title: 'Hora preferida', canvasId: 'chart-time', options: TIME_OPTIONS },
    { key: 'neighborhood', title: 'Barrio', canvasId: 'chart-neighborhood', options: [] },
    { key: 'outing_frequency', title: 'Frecuencia de salida', canvasId: 'chart-frequency', options: OUTING_FREQUENCY_OPTIONS },
    { key: 'spontaneity', title: 'Espontaneidad', canvasId: 'chart-spontaneity', options: SPONTANEITY_OPTIONS },
    { key: 'budget_range', title: 'Presupuesto', canvasId: 'chart-budget', options: BUDGET_RANGE_OPTIONS },
    { key: 'transport_mode', title: 'Transporte', canvasId: 'chart-transport', options: TRANSPORT_OPTIONS },
    { key: 'social_energy', title: 'Energía social', canvasId: 'chart-energy', options: SOCIAL_ENERGY_OPTIONS },
    { key: 'intention', title: 'Intención al salir', canvasId: 'chart-intention', options: INTENTION_OPTIONS },
    { key: 'current_mood', title: 'Cómo quisieron sentirse (Vela)', canvasId: 'chart-mood', options: [] },
    { key: 'mood_company', title: 'Compañía real (Vela)', canvasId: 'chart-mood-company', options: TARGET_COMPANY_OPTIONS },
    { key: 'mood_time_available', title: 'Tiempo disponible (Vela)', canvasId: 'chart-mood-time', options: TIME_AVAILABLE_OPTIONS },
  ];

  constructor(
    private route: ActivatedRoute,
    private analytics: AnalyticsService,
    private predictionService: PredictionService,
    private rosterService: RosterService,
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
      this.loadRoster(id);
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

  // ── Centro de Comando ──
  private async loadRoster(eventId: string) {
    try {
      const [rosterRes, insightsRes] = await Promise.all([
        this.rosterService.getRoster(eventId),
        this.rosterService.getInsights(eventId),
      ]);
      this.roster = rosterRes.roster;
      this.insights = insightsRes;
      this.cdr.detectChanges();
      setTimeout(() => this.renderCharts(), 0);
    } catch (e) {
      console.info('[Vemo] No se pudo cargar el Centro de Comando:', (e as Error)?.message);
    }
  }

  tallyFor(key: keyof EventInsights): TallyEntry[] {
    const v = this.insights ? (this.insights as any)[key] : null;
    return Array.isArray(v) ? v : [];
  }

  labelFor(options: PreferenceOption[], value: string): string {
    if (!options.length) return value;
    return options.find((o) => o.value === value)?.label || value;
  }

  private async renderCharts() {
    if (!this.insights) return;
    const { default: Chart } = await import('chart.js/auto');
    for (const cfg of this.chartConfigs) {
      const canvas = document.getElementById(cfg.canvasId) as HTMLCanvasElement | null;
      const entries = this.tallyFor(cfg.key);
      if (!canvas || !entries.length) continue;
      const top = entries.slice(0, 8);
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: top.map((e) => this.labelFor(cfg.options, e.value)),
          datasets: [{
            data: top.map((e) => e.count),
            backgroundColor: 'rgba(255,77,128,0.55)',
            borderRadius: 6,
          }],
        },
        options: {
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,0.5)', precision: 0 }, grid: { color: 'rgba(255,255,255,0.06)' } },
            y: { ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 11 } }, grid: { display: false } },
          },
        },
      });
    }
  }

  async askVela() {
    const message = this.velaInput.trim();
    const eventId = this.data?.event?.id;
    if (!message || !eventId || this.velaBusy) return;
    this.velaMessages.push({ role: 'organizer', text: message });
    this.velaInput = '';
    this.velaBusy = true;
    this.cdr.detectChanges();
    try {
      const res = await this.rosterService.askVela(eventId, message);
      this.velaMessages.push({ role: 'vela', text: res.reply });
    } catch (e: any) {
      this.velaMessages.push({ role: 'vela', text: e?.message || 'No pude procesar tu pregunta. Intenta de nuevo.' });
    } finally {
      this.velaBusy = false;
      this.cdr.detectChanges();
    }
  }
}
