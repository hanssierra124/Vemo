// ════════════════════════════════════════════════════════════════════
// UserProfileComponent (Fase F3) — perfil público de usuario: cabecera con
// follow, estadísticas, reseñas populares y recientes. Identidad VEMO.
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfilePublicService } from './profile-public.service';
import { SocialService } from './social.service';
import { CurrentUserService } from './current-user.service';
import { UserProfile } from './models/profile.model';
import { ReviewCardComponent } from './shared/Components/review-card/review-card';
import { FollowListComponent } from './shared/Components/follow-list/follow-list';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReviewCardComponent, FollowListComponent],
  template: `
    <div class="up-wrap" *ngIf="data; else loadingTpl">
      <div class="up-cover"></div>

      <header class="up-head">
        <span class="up-avatar" [style.backgroundImage]="data.user.profile_url ? 'url(' + data.user.profile_url + ')' : null">
          <span *ngIf="!data.user.profile_url">{{ (data.user.username || '?')[0] }}</span>
        </span>
        <div class="up-id">
          <h1 class="up-name clash-display">{{ data.user.username || 'Usuario' }}</h1>
          <span class="up-role" *ngIf="data.user.role === 'organizer'">Organizador</span>
          <div class="up-follow-counts">
            <button type="button" class="up-count-btn" (click)="openFollowModal('followers')">
              <b>{{ data.user.followers_count }}</b> seguidores
            </button>
            <button type="button" class="up-count-btn" (click)="openFollowModal('following')">
              <b>{{ data.user.following_count }}</b> siguiendo
            </button>
          </div>
        </div>
        <div class="up-actions" *ngIf="!data.is_self">
          <button class="up-follow-btn" [class.following]="data.is_following" [disabled]="busyFollow" (click)="toggleFollow()">
            <span *ngIf="busyFollow" class="up-spin"></span>
            <ng-container *ngIf="!busyFollow">{{ data.is_following ? '✓ Siguiendo' : '＋ Seguir' }}</ng-container>
          </button>
        </div>
      </header>

      <p class="up-error" *ngIf="followError">{{ followError }}</p>

      <div class="up-stats">
        <div class="up-stat"><span class="up-stat-ico">📝</span><b>{{ data.stats.review_count }}</b><span>reseñas</span></div>
        <div class="up-stat">
          <span class="up-stat-ico">⭐</span>
          <b>{{ data.stats.review_count ? (data.stats.avg_rating_given | number:'1.1-1') : '—' }}</b>
          <span>promedio dado</span>
        </div>
        <div class="up-stat"><span class="up-stat-ico">♥</span><b>{{ data.stats.likes_received }}</b><span>likes recibidos</span></div>
        <div class="up-stat"><span class="up-stat-ico">💬</span><b>{{ data.stats.comments_received }}</b><span>comentarios</span></div>
      </div>

      <section *ngIf="data.popular_reviews.length">
        <h3 class="up-section clash-display"><span class="up-section-bar"></span>Reseñas populares</h3>
        <app-review-card *ngFor="let r of data.popular_reviews" [review]="r" [currentUserId]="currentUserId" [showSubjectLink]="true"></app-review-card>
      </section>

      <section>
        <h3 class="up-section clash-display"><span class="up-section-bar"></span>Reseñas recientes</h3>
        <app-review-card *ngFor="let r of data.recent_reviews" [review]="r" [currentUserId]="currentUserId" [showSubjectLink]="true"></app-review-card>
        <p class="up-empty" *ngIf="data.recent_reviews.length === 0">Aún no ha publicado reseñas.</p>
      </section>
    </div>

    <app-follow-list *ngIf="data && followModal" [userId]="data.user.id" [mode]="followModal"
                     (closed)="followModal = null"></app-follow-list>

    <ng-template #loadingTpl>
      <div class="up-wrap"><p class="up-empty up-loading">{{ error || 'Cargando perfil…' }}</p></div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; background-color: var(--ink, #0E0D12); min-height: 100vh; }
    .up-wrap { max-width: 720px; margin: 0 auto; padding: 0 16px 90px; position: relative; }
    .up-cover { height: 150px; margin: 0 -16px 0; border-radius: 0 0 24px 24px;
      background: radial-gradient(ellipse 70% 120% at 30% 0%, rgba(255,77,128,0.35), transparent 60%),
                  radial-gradient(ellipse 70% 120% at 80% 10%, rgba(106,0,255,0.35), transparent 60%),
                  var(--surface); border-bottom: 1px solid var(--border); }
    .up-head { display: flex; align-items: flex-end; gap: 18px; margin: -54px 0 22px; position: relative; }
    .up-avatar { width: 104px; height: 104px; border-radius: 50%; flex: 0 0 104px;
      background: var(--grad-warm); background-size: cover; background-position: center;
      display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 800; color: #1a1a1a;
      text-transform: uppercase; border: 4px solid var(--ink); box-shadow: 0 8px 28px rgba(0,0,0,0.5); }
    .up-id { flex: 1; padding-bottom: 4px; }
    .up-name { font-size: 30px; color: var(--text-1); margin: 0; }
    .up-role { display: inline-block; font-size: 11px; color: #4ade80; background: rgba(74,222,128,0.1);
      border: 1px solid rgba(74,222,128,0.25); border-radius: 20px; padding: 2px 10px; margin-top: 4px; }
    .up-follow-counts { display: flex; gap: 18px; margin-top: 10px; }
    .up-count-btn { background: none; border: none; padding: 0; cursor: pointer; color: var(--text-2); font-size: 13px; transition: color .2s; }
    .up-count-btn:hover { color: var(--text-1); }
    .up-count-btn b { color: var(--text-1); font-size: 15px; }
    .up-actions { padding-bottom: 6px; }
    .up-follow-btn { min-width: 124px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      background: var(--grad-warm); color: #1a1a1a; border: none; font-weight: 700; font-size: 14px;
      border-radius: 30px; padding: 11px 22px; cursor: pointer; transition: transform .2s var(--ease-film), box-shadow .2s, background .2s; }
    .up-follow-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(255,77,128,0.35); }
    .up-follow-btn.following { background: transparent; color: var(--text-1); border: 1px solid var(--border); }
    .up-follow-btn.following:hover:not(:disabled) { border-color: #ff6b6b; color: #ff6b6b; box-shadow: none; }
    .up-follow-btn:disabled { opacity: .7; cursor: wait; }
    .up-spin { width: 15px; height: 15px; border: 2px solid rgba(26,26,26,0.4); border-top-color: #1a1a1a;
      border-radius: 50%; animation: upspin .7s linear infinite; }
    @keyframes upspin { to { transform: rotate(360deg); } }
    .up-error { color: #ff8a9b; background: rgba(255,77,128,0.08); border: 1px solid rgba(255,77,128,0.25);
      border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0 0 16px; }

    .up-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 30px; }
    .up-stat { background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
      padding: 16px 10px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 3px;
      transition: transform .2s var(--ease-film), border-color .2s; }
    .up-stat:hover { transform: translateY(-3px); border-color: var(--border-hot); }
    .up-stat-ico { font-size: 16px; opacity: .9; }
    .up-stat b { font-size: 22px; color: var(--text-1); }
    .up-stat span:last-child { font-size: 11px; color: var(--text-2); }
    .up-section { display: flex; align-items: center; gap: 10px; font-size: 18px; color: var(--text-1); margin: 26px 0 14px; }
    .up-section-bar { width: 4px; height: 18px; border-radius: 4px; background: var(--grad-warm); }
    .up-empty { color: var(--text-3); font-style: italic; }
    .up-loading { text-align: center; padding: 80px 0; }
    @media (max-width: 560px) {
      .up-stats { grid-template-columns: repeat(2, 1fr); }
      .up-head { flex-wrap: wrap; }
      .up-actions { width: 100%; }
      .up-follow-btn { width: 100%; }
    }
  `],
})
export class UserProfileComponent implements OnInit {
  data: UserProfile | null = null;
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
      this.data = await this.profiles.getUserProfile(id);
    } catch (e: any) {
      this.error = e?.message || 'No se pudo cargar el perfil.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async toggleFollow() {
    if (!this.data || this.busyFollow) return;
    if (!this.isLoggedIn) { this.router.navigate(['/auth']); return; }
    this.busyFollow = true;
    this.followError = null;
    const wasFollowing = this.data.is_following;
    // Optimista
    this.data.is_following = !wasFollowing;
    this.data.user.followers_count += wasFollowing ? -1 : 1;
    this.cdr.detectChanges();
    try {
      const res = wasFollowing
        ? await this.social.unfollow(this.data.user.id)
        : await this.social.follow(this.data.user.id);
      // Verdad del servidor (corrige el estado si difiere del optimista)
      this.data.is_following = res.following;
    } catch (e: any) {
      // Revertir y avisar (antes el error se tragaba en silencio)
      this.data.is_following = wasFollowing;
      this.data.user.followers_count += wasFollowing ? 1 : -1;
      this.followError = e?.message || 'No se pudo completar la acción. Intenta de nuevo.';
    } finally {
      this.busyFollow = false;
      this.cdr.detectChanges();
    }
  }
}
