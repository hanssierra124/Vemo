// ════════════════════════════════════════════════════════════════════
// OrganizerProfileComponent (Fase F3) — perfil público de organizador:
// rating promedio + histograma, reseñas destacadas y recientes, follow.
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfilePublicService } from './profile-public.service';
import { SocialService } from './social.service';
import { CurrentUserService } from './current-user.service';
import { OrganizerProfile } from './models/profile.model';
import { ReviewCardComponent } from './shared/Components/review-card/review-card';
import { StarRatingComponent } from './shared/Components/star-rating/star-rating';
import { FollowListComponent } from './shared/Components/follow-list/follow-list';

@Component({
  selector: 'app-organizer-profile',
  standalone: true,
  imports: [CommonModule, ReviewCardComponent, StarRatingComponent, FollowListComponent],
  template: `
    <div class="op-wrap" *ngIf="data; else loadingTpl">
      <div class="op-cover"></div>

      <header class="op-head">
        <span class="op-avatar" [style.backgroundImage]="data.organizer.profile_url ? 'url(' + data.organizer.profile_url + ')' : null">
          <span *ngIf="!data.organizer.profile_url">{{ (data.organizer.company_name || data.organizer.username || '?')[0] }}</span>
        </span>
        <div class="op-id">
          <span class="op-badge">✦ Organizador</span>
          <h1 class="op-name clash-display">{{ data.organizer.company_name || data.organizer.username }}</h1>
          <p class="op-meta" *ngIf="data.organizer.address">📍 {{ data.organizer.address }}</p>
          <div class="op-follow-counts">
            <button type="button" class="op-count-btn" (click)="openFollowModal('followers')">
              <b>{{ data.organizer.followers_count }}</b> seguidores
            </button>
          </div>
        </div>
        <div class="op-actions" *ngIf="!data.is_self">
          <button class="op-follow-btn" [class.following]="data.is_following" [disabled]="busyFollow" (click)="toggleFollow()">
            <span *ngIf="busyFollow" class="op-spin"></span>
            <ng-container *ngIf="!busyFollow">{{ data.is_following ? '✓ Siguiendo' : '＋ Seguir' }}</ng-container>
          </button>
        </div>
      </header>

      <p class="op-error" *ngIf="followError">{{ followError }}</p>

      <div class="op-summary">
        <div class="op-avg">
          <div class="op-avg-num clash-display">{{ data.stats.rating_count ? (data.stats.rating_avg | number:'1.1-1') : '—' }}</div>
          <app-star-rating [value]="data.stats.rating_avg" [readonly]="true" [size]="18"></app-star-rating>
          <div class="op-avg-count">{{ data.stats.rating_count }} reseña(s)</div>
        </div>
        <div class="op-hist">
          <div class="op-hist-row" *ngFor="let row of histogramRows()">
            <span class="op-hist-label">{{ row.star }}★</span>
            <span class="op-hist-track"><span class="op-hist-fill" [style.width.%]="row.pct"></span></span>
            <span class="op-hist-count">{{ row.count }}</span>
          </div>
        </div>
      </div>

      <section *ngIf="data.featured_reviews.length">
        <h3 class="op-section clash-display"><span class="op-section-bar"></span>Reseñas destacadas</h3>
        <app-review-card *ngFor="let r of data.featured_reviews" [review]="r" [currentUserId]="currentUserId"></app-review-card>
      </section>

      <section>
        <h3 class="op-section clash-display"><span class="op-section-bar"></span>Reseñas recientes</h3>
        <app-review-card *ngFor="let r of data.recent_reviews" [review]="r" [currentUserId]="currentUserId"></app-review-card>
        <p class="op-empty" *ngIf="data.recent_reviews.length === 0">Aún no hay reseñas de este organizador.</p>
      </section>
    </div>

    <app-follow-list *ngIf="data && followModal" [userId]="data.organizer.id" [mode]="followModal"
                     (closed)="followModal = null"></app-follow-list>

    <ng-template #loadingTpl>
      <div class="op-wrap"><p class="op-empty op-loading">{{ error || 'Cargando organizador…' }}</p></div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; background-color: var(--ink, #0E0D12); min-height: 100vh; }
    .op-wrap { max-width: 720px; margin: 0 auto; padding: var(--vemo-header-h, 90px) 16px 90px; position: relative; }
    .op-cover { height: 150px; margin: 0 -16px 0; border-radius: 0 0 24px 24px;
      background: radial-gradient(ellipse 70% 120% at 25% 0%, rgba(255,77,128,0.35), transparent 60%),
                  radial-gradient(ellipse 70% 120% at 85% 10%, rgba(106,0,255,0.4), transparent 60%),
                  var(--surface); border-bottom: 1px solid var(--border); }
    .op-head { display: flex; align-items: flex-end; gap: 18px; margin: -54px 0 20px; position: relative; }
    .op-avatar { width: 104px; height: 104px; border-radius: 24px; flex: 0 0 104px;
      background: var(--grad-hot); background-size: cover; background-position: center;
      display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 800; color: #fff;
      text-transform: uppercase; border: 4px solid var(--ink); box-shadow: 0 8px 28px rgba(0,0,0,0.5); }
    .op-id { flex: 1; padding-bottom: 4px; }
    .op-badge { font-size: 11px; letter-spacing: 1px; color: var(--gold); font-weight: 700; }
    .op-name { font-size: 28px; color: var(--text-1); margin: 2px 0; }
    .op-meta { color: var(--text-2); font-size: 13px; margin: 2px 0; }
    .op-follow-counts { margin-top: 6px; }
    .op-count-btn { background: none; border: none; padding: 0; cursor: pointer; color: var(--text-2); font-size: 13px; transition: color .2s; }
    .op-count-btn:hover { color: var(--text-1); }
    .op-count-btn b { color: var(--text-1); font-size: 15px; }
    .op-actions { padding-bottom: 6px; }
    .op-follow-btn { min-width: 124px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      background: var(--grad-warm); color: #1a1a1a; border: none; font-weight: 700; font-size: 14px;
      border-radius: 30px; padding: 11px 22px; cursor: pointer; transition: transform .2s var(--ease-film), box-shadow .2s; }
    .op-follow-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(255,77,128,0.35); }
    .op-follow-btn.following { background: transparent; color: var(--text-1); border: 1px solid var(--border); }
    .op-follow-btn.following:hover:not(:disabled) { border-color: #ff6b6b; color: #ff6b6b; box-shadow: none; }
    .op-follow-btn:disabled { opacity: .7; cursor: wait; }
    .op-spin { width: 15px; height: 15px; border: 2px solid rgba(26,26,26,0.4); border-top-color: #1a1a1a; border-radius: 50%; animation: opspin .7s linear infinite; }
    @keyframes opspin { to { transform: rotate(360deg); } }
    .op-error { color: #ff8a9b; background: rgba(255,77,128,0.08); border: 1px solid rgba(255,77,128,0.25);
      border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0 0 16px; }

    .op-summary { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; padding: 20px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 18px; margin-bottom: 28px; }
    .op-avg { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 110px; }
    .op-avg-num { font-size: 50px; font-weight: 800; color: var(--text-1); line-height: 1;
      background: var(--grad-warm); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .op-avg-count { font-size: 12px; color: var(--text-2); }
    .op-hist { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 5px; }
    .op-hist-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .op-hist-label { width: 30px; text-align: right; color: var(--text-2); }
    .op-hist-track { flex: 1; height: 8px; background: rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden; }
    .op-hist-fill { display: block; height: 100%; background: var(--grad-warm); border-radius: 6px; transition: width .5s var(--ease-film); }
    .op-hist-count { width: 24px; color: var(--text-3); }
    .op-section { display: flex; align-items: center; gap: 10px; font-size: 18px; color: var(--text-1); margin: 26px 0 14px; }
    .op-section-bar { width: 4px; height: 18px; border-radius: 4px; background: var(--grad-warm); }
    .op-empty { color: var(--text-3); font-style: italic; }
    .op-loading { text-align: center; padding: 80px 0; }
    @media (max-width: 560px) {
      .op-head { flex-wrap: wrap; }
      .op-actions { width: 100%; }
      .op-follow-btn { width: 100%; }
    }
  `],
})
export class OrganizerProfileComponent implements OnInit {
  data: OrganizerProfile | null = null;
  error: string | null = null;
  busyFollow = false;
  followError: string | null = null;
  currentUserId: string | null = null;
  followModal: 'followers' | 'following' | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private profiles: ProfilePublicService,
    private social: SocialService,
    private currentUser: CurrentUserService,
    private cdr: ChangeDetectorRef,
  ) {}

  get isLoggedIn(): boolean {
    return !!(localStorage.getItem('vemo_token') || localStorage.getItem('token'));
  }

  ngOnInit() {
    this.currentUser.getMyId().then((id) => { this.currentUserId = id; this.cdr.detectChanges(); });
    this.route.paramMap.subscribe((p) => {
      const id = p.get('id');
      if (id) this.load(id);
    });
  }

  openFollowModal(mode: 'followers' | 'following') {
    this.followModal = mode;
    this.cdr.detectChanges();
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
    if (!this.isLoggedIn) { this.router.navigate(['/auth']); return; }
    this.busyFollow = true;
    this.followError = null;
    const was = this.data.is_following;
    this.data.is_following = !was;
    this.data.organizer.followers_count += was ? -1 : 1;
    this.cdr.detectChanges();
    try {
      const res = was
        ? await this.social.unfollow(this.data.organizer.id)
        : await this.social.follow(this.data.organizer.id);
      this.data.is_following = res.following;
    } catch (e: any) {
      this.data.is_following = was;
      this.data.organizer.followers_count += was ? 1 : -1;
      this.followError = e?.message || 'No se pudo completar la acción. Intenta de nuevo.';
    } finally {
      this.busyFollow = false;
      this.cdr.detectChanges();
    }
  }
}
