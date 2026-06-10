// ════════════════════════════════════════════════════════════════════
// DiscoverComponent (Asistiré Inteligente — Fase A6) — "Descubrir":
// personas que quizá conozcas (co-asistencia) y eventos recomendados
// (afinidad de categorías + organizadores que sigues).
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RecommendationService } from './recommendation.service';
import { SocialService } from './social.service';
import { PersonSuggestion, RecommendedEvent } from './models/recommendation.model';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dc-wrap">
      <header class="dc-head">
        <span class="dc-eyebrow">ASISTIRÉ INTELIGENTE</span>
        <h1 class="dc-title clash-display">Descubrir</h1>
        <p class="dc-sub">Personas y eventos pensados para ti.</p>
      </header>

      <div class="dc-state" *ngIf="!isLoggedIn">
        Inicia sesión para ver recomendaciones.
        <a routerLink="/auth" class="dc-cta">Iniciar sesión</a>
      </div>

      <ng-container *ngIf="isLoggedIn">
        <!-- Personas -->
        <section *ngIf="people.length">
          <h3 class="dc-section clash-display">Personas que quizá conozcas</h3>
          <div class="dc-people">
            <div class="dc-person" *ngFor="let p of people">
              <a class="dc-avatar" [routerLink]="['/u', p.id]"
                 [style.backgroundImage]="p.profile_url ? 'url(' + p.profile_url + ')' : null">
                <span *ngIf="!p.profile_url">{{ (p.username || '?')[0] }}</span>
              </a>
              <a class="dc-name" [routerLink]="['/u', p.id]">{{ p.username || 'Usuario' }}</a>
              <span class="dc-mutual">{{ p.mutual_events }} evento(s) en común</span>
              <button class="dc-follow" [class.following]="p.followed" [disabled]="p.busy" (click)="follow(p)">
                {{ p.followed ? 'Siguiendo' : 'Seguir' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Eventos -->
        <section>
          <h3 class="dc-section clash-display">Eventos para ti</h3>
          <div class="dc-events" *ngIf="!loading">
            <a class="dc-event" *ngFor="let e of events" [routerLink]="['/event', e.id]">
              <span class="dc-ev-thumb" [style.backgroundImage]="e.image_url ? 'url(' + e.image_url + ')' : null"></span>
              <div class="dc-ev-info">
                <h4 class="dc-ev-title">{{ e.title }}</h4>
                <p class="dc-ev-meta" *ngIf="e.location_name">{{ e.location_name }}<span *ngIf="e.city">, {{ e.city }}</span></p>
                <div class="dc-reasons">
                  <span class="dc-reason" *ngFor="let r of e.reasons">{{ r }}</span>
                </div>
              </div>
            </a>
            <p class="dc-empty" *ngIf="events.length === 0">Aún no tenemos recomendaciones. Explora y marca "Asistiré" para afinarlas.</p>
          </div>
          <p class="dc-state" *ngIf="loading">Cargando…</p>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .dc-wrap { max-width: 820px; margin: 0 auto; padding: 40px 16px 90px; }
    .dc-eyebrow { font-size: 11px; letter-spacing: 3px; font-weight: 700;
      background: linear-gradient(135deg,#FF4D80,#FFD700); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .dc-title { font-size: 38px; color: #fff; margin: 6px 0 4px; }
    .dc-sub { color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 8px; }
    .dc-state { color: rgba(255,255,255,0.6); text-align: center; padding: 24px; }
    .dc-cta { display: block; margin-top: 10px; color: #FFD700; text-decoration: none; font-weight: 700; }
    .dc-section { font-size: 20px; color: #fff; margin: 26px 0 14px; }
    .dc-people { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; }
    .dc-person { flex: 0 0 150px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
    .dc-avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg,#FF4D80,#FFD700);
      background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center;
      font-weight: 800; color: #1a1a1a; font-size: 22px; text-transform: uppercase; text-decoration: none; }
    .dc-name { color: #fff; font-weight: 700; font-size: 14px; text-decoration: none; }
    .dc-name:hover { color: #FFD700; }
    .dc-mutual { font-size: 11px; color: rgba(255,255,255,0.5); }
    .dc-follow { margin-top: 4px; background: linear-gradient(135deg,#FF4D80,#FFD700); color: #1a1a1a; border: none;
      font-weight: 700; border-radius: 20px; padding: 7px 18px; cursor: pointer; font-size: 12px; }
    .dc-follow.following { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); }
    .dc-follow:disabled { opacity: 0.6; cursor: not-allowed; }
    .dc-events { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
    .dc-event { display: flex; flex-direction: column; text-decoration: none; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; transition: border-color .15s; }
    .dc-event:hover { border-color: rgba(255,77,128,0.4); }
    .dc-ev-thumb { height: 120px; background-size: cover; background-position: center; background-color: rgba(255,255,255,0.06); }
    .dc-ev-info { padding: 12px; }
    .dc-ev-title { color: #fff; font-size: 15px; margin: 0 0 4px; }
    .dc-ev-meta { color: rgba(255,255,255,0.55); font-size: 12px; margin: 0 0 8px; }
    .dc-reasons { display: flex; flex-wrap: wrap; gap: 6px; }
    .dc-reason { font-size: 10px; color: #FFD700; background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.25);
      border-radius: 12px; padding: 2px 8px; }
    .dc-empty { color: rgba(255,255,255,0.45); font-style: italic; }
  `],
})
export class DiscoverComponent implements OnInit {
  people: (PersonSuggestion & { followed?: boolean; busy?: boolean })[] = [];
  events: RecommendedEvent[] = [];
  loading = false;

  constructor(private recs: RecommendationService, private social: SocialService, private cdr: ChangeDetectorRef) {}

  get isLoggedIn(): boolean {
    return !!(localStorage.getItem('vemo_token') || localStorage.getItem('token'));
  }

  ngOnInit() {
    if (!this.isLoggedIn) return;
    this.loading = true;
    this.recs.peopleSuggestions(12).then((r) => { this.people = r.items; this.cdr.detectChanges(); }).catch(() => {});
    this.recs.eventRecommendations(12).then((r) => { this.events = r.items; }).catch(() => {}).finally(() => {
      this.loading = false; this.cdr.detectChanges();
    });
  }

  async follow(p: PersonSuggestion & { followed?: boolean; busy?: boolean }) {
    if (p.busy) return;
    p.busy = true;
    const was = p.followed;
    p.followed = !was;
    this.cdr.detectChanges();
    try {
      if (was) await this.social.unfollow(p.id);
      else await this.social.follow(p.id);
    } catch {
      p.followed = was;
    } finally {
      p.busy = false;
      this.cdr.detectChanges();
    }
  }
}
