// ════════════════════════════════════════════════════════════════════
// OrganizerProfileComponent (Fase F3) — perfil público de organizador:
// rating promedio + histograma, reseñas destacadas y recientes, follow.
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProfilePublicService } from './profile-public.service';
import { SocialService } from './social.service';
import { OrganizerProfile } from './models/profile.model';
import { ReviewCardComponent } from './shared/Components/review-card/review-card';
import { StarRatingComponent } from './shared/Components/star-rating/star-rating';

@Component({
  selector: 'app-organizer-profile',
  standalone: true,
  imports: [CommonModule, ReviewCardComponent, StarRatingComponent],
  template: `
    <div class="op-wrap" *ngIf="data; else loadingTpl">
      <header class="op-head">
        <span class="op-avatar" [style.backgroundImage]="data.organizer.profile_url ? 'url(' + data.organizer.profile_url + ')' : null">
          <span *ngIf="!data.organizer.profile_url">{{ (data.organizer.company_name || data.organizer.username || '?')[0] }}</span>
        </span>
        <div class="op-id">
          <h1 class="op-name clash-display">{{ data.organizer.company_name || data.organizer.username }}</h1>
          <p class="op-meta" *ngIf="data.organizer.address">{{ data.organizer.address }}</p>
          <div class="op-follow-counts">
            <span><b>{{ data.organizer.followers_count }}</b> seguidores</span>
          </div>
        </div>
        <button class="op-follow-btn" *ngIf="!data.is_self && isLoggedIn"
                [class.following]="data.is_following" [disabled]="busyFollow" (click)="toggleFollow()">
          {{ data.is_following ? 'Siguiendo' : 'Seguir' }}
        </button>
      </header>

      <div class="op-summary">
        <div class="op-avg">
          <div class="op-avg-num">{{ data.stats.rating_count ? (data.stats.rating_avg | number:'1.1-1') : '—' }}</div>
          <app-star-rating [value]="data.stats.rating_avg" [readonly]="true" [size]="18"></app-star-rating>
          <div class="op-avg-count">{{ data.stats.rating_count }} reseña(s)</div>
        </div>
        <div class="op-hist">
          <div class="op-hist-row" *ngFor="let row of histogramRows()">
            <span class="op-hist-label">{{ row.star }}</span>
            <span class="op-hist-track"><span class="op-hist-fill" [style.width.%]="row.pct"></span></span>
            <span class="op-hist-count">{{ row.count }}</span>
          </div>
        </div>
      </div>

      <section *ngIf="data.featured_reviews.length">
        <h3 class="op-section clash-display">Reseñas destacadas</h3>
        <app-review-card *ngFor="let r of data.featured_reviews" [review]="r"></app-review-card>
      </section>

      <section>
        <h3 class="op-section clash-display">Reseñas recientes</h3>
        <app-review-card *ngFor="let r of data.recent_reviews" [review]="r"></app-review-card>
        <p class="op-empty" *ngIf="data.recent_reviews.length === 0">Aún no hay reseñas de este organizador.</p>
      </section>
    </div>

    <ng-template #loadingTpl>
      <div class="op-wrap"><p class="op-empty">{{ error || 'Cargando organizador…' }}</p></div>
    </ng-template>
  `,
  styles: [`
    .op-wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px 80px; }
    .op-head { display: flex; align-items: center; gap: 18px; margin-bottom: 22px; }
    .op-avatar { width: 76px; height: 76px; border-radius: 18px; flex: 0 0 76px;
      background: linear-gradient(135deg, #FF4D80, #FFD700); background-size: cover; background-position: center;
      display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 800; color: #1a1a1a; text-transform: uppercase; }
    .op-name { font-size: 26px; color: #fff; margin: 0; }
    .op-meta { color: rgba(255,255,255,0.55); font-size: 13px; margin: 4px 0; }
    .op-follow-counts { color: rgba(255,255,255,0.6); font-size: 13px; }
    .op-follow-counts b { color: #fff; }
    .op-follow-btn { margin-left: auto; background: linear-gradient(135deg, #FF4D80, #FFD700); color: #1a1a1a;
      border: none; font-weight: 700; border-radius: 30px; padding: 10px 24px; cursor: pointer; }
    .op-follow-btn.following { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); }
    .op-follow-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .op-summary { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; padding: 18px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; margin-bottom: 26px; }
    .op-avg { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 110px; }
    .op-avg-num { font-size: 46px; font-weight: 800; color: #fff; line-height: 1; }
    .op-avg-count { font-size: 12px; color: rgba(255,255,255,0.55); }
    .op-hist { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 4px; }
    .op-hist-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .op-hist-label { width: 26px; text-align: right; color: rgba(255,255,255,0.6); }
    .op-hist-track { flex: 1; height: 8px; background: rgba(255,255,255,0.07); border-radius: 6px; overflow: hidden; }
    .op-hist-fill { display: block; height: 100%; background: linear-gradient(90deg, #FF4D80, #FFD700); border-radius: 6px; }
    .op-hist-count { width: 24px; color: rgba(255,255,255,0.45); }
    .op-section { font-size: 18px; color: #fff; margin: 18px 0 12px; }
    .op-empty { color: rgba(255,255,255,0.45); font-style: italic; }
  `],
})
export class OrganizerProfileComponent implements OnInit {
  data: OrganizerProfile | null = null;
  error: string | null = null;
  busyFollow = false;

  constructor(
    private route: ActivatedRoute,
    private profiles: ProfilePublicService,
    private social: SocialService,
    private cdr: ChangeDetectorRef,
  ) {}

  get isLoggedIn(): boolean {
    return !!(localStorage.getItem('vemo_token') || localStorage.getItem('token'));
  }

  ngOnInit() {
    this.route.paramMap.subscribe((p) => {
      const id = p.get('id');
      if (id) this.load(id);
    });
  }

  private async load(id: string) {
    this.data = null;
    this.error = null;
    try {
      this.data = await this.profiles.getOrganizerProfile(id);
    } catch (e: any) {
      this.error = e?.message || 'No se pudo cargar el organizador.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  histogramRows(): { star: number; count: number; pct: number }[] {
    const h = this.data?.stats.histogram || {};
    const steps = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
    const counts = steps.map((s) => h[String(s)] || 0);
    const max = Math.max(1, ...counts);
    return steps.map((s, i) => ({ star: s, count: counts[i], pct: Math.round((counts[i] / max) * 100) }));
  }

  async toggleFollow() {
    if (!this.data || this.busyFollow) return;
    this.busyFollow = true;
    const was = this.data.is_following;
    this.data.is_following = !was;
    this.data.organizer.followers_count += was ? -1 : 1;
    this.cdr.detectChanges();
    try {
      if (was) await this.social.unfollow(this.data.organizer.id);
      else await this.social.follow(this.data.organizer.id);
    } catch {
      this.data.is_following = was;
      this.data.organizer.followers_count += was ? 1 : -1;
    } finally {
      this.busyFollow = false;
      this.cdr.detectChanges();
    }
  }
}
