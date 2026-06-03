// ════════════════════════════════════════════════════════════════════
// UserProfileComponent (Fase F3) — perfil público de usuario: cabecera con
// follow, estadísticas, reseñas populares y recientes. Identidad VEMO.
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProfilePublicService } from './profile-public.service';
import { SocialService } from './social.service';
import { UserProfile } from './models/profile.model';
import { ReviewCardComponent } from './shared/Components/review-card/review-card';
import { StarRatingComponent } from './shared/Components/star-rating/star-rating';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReviewCardComponent, StarRatingComponent],
  template: `
    <div class="up-wrap" *ngIf="data; else loadingTpl">
      <header class="up-head">
        <span class="up-avatar" [style.backgroundImage]="data.user.profile_url ? 'url(' + data.user.profile_url + ')' : null">
          <span *ngIf="!data.user.profile_url">{{ (data.user.username || '?')[0] }}</span>
        </span>
        <div class="up-id">
          <h1 class="up-name clash-display">{{ data.user.username || 'Usuario' }}</h1>
          <span class="up-role" *ngIf="data.user.role === 'organizer'">Organizador</span>
          <div class="up-follow-counts">
            <span><b>{{ data.user.followers_count }}</b> seguidores</span>
            <span><b>{{ data.user.following_count }}</b> siguiendo</span>
          </div>
        </div>
        <button class="up-follow-btn" *ngIf="!data.is_self && isLoggedIn"
                [class.following]="data.is_following" [disabled]="busyFollow" (click)="toggleFollow()">
          {{ data.is_following ? 'Siguiendo' : 'Seguir' }}
        </button>
      </header>

      <div class="up-stats">
        <div class="up-stat"><b>{{ data.stats.review_count }}</b><span>reseñas</span></div>
        <div class="up-stat">
          <b>{{ data.stats.review_count ? (data.stats.avg_rating_given | number:'1.1-1') : '—' }}</b>
          <span>promedio dado</span>
          <app-star-rating [value]="data.stats.avg_rating_given" [readonly]="true" [size]="12"></app-star-rating>
        </div>
        <div class="up-stat"><b>{{ data.stats.likes_received }}</b><span>likes recibidos</span></div>
        <div class="up-stat"><b>{{ data.stats.comments_received }}</b><span>comentarios</span></div>
      </div>

      <section *ngIf="data.popular_reviews.length">
        <h3 class="up-section clash-display">Reseñas populares</h3>
        <app-review-card *ngFor="let r of data.popular_reviews" [review]="r" [showSubjectLink]="true"></app-review-card>
      </section>

      <section>
        <h3 class="up-section clash-display">Reseñas recientes</h3>
        <app-review-card *ngFor="let r of data.recent_reviews" [review]="r" [showSubjectLink]="true"></app-review-card>
        <p class="up-empty" *ngIf="data.recent_reviews.length === 0">Aún no ha publicado reseñas.</p>
      </section>
    </div>

    <ng-template #loadingTpl>
      <div class="up-wrap"><p class="up-empty">{{ error || 'Cargando perfil…' }}</p></div>
    </ng-template>
  `,
  styles: [`
    .up-wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px 80px; }
    .up-head { display: flex; align-items: center; gap: 18px; margin-bottom: 22px; }
    .up-avatar { width: 76px; height: 76px; border-radius: 50%; flex: 0 0 76px;
      background: linear-gradient(135deg, #FF4D80, #FFD700); background-size: cover; background-position: center;
      display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 800; color: #1a1a1a; text-transform: uppercase; }
    .up-name { font-size: 28px; color: #fff; margin: 0; }
    .up-role { font-size: 12px; color: #4ade80; background: rgba(74,222,128,0.1);
      border: 1px solid rgba(74,222,128,0.25); border-radius: 20px; padding: 2px 8px; }
    .up-follow-counts { display: flex; gap: 16px; margin-top: 8px; color: rgba(255,255,255,0.6); font-size: 13px; }
    .up-follow-counts b { color: #fff; }
    .up-follow-btn { margin-left: auto; background: linear-gradient(135deg, #FF4D80, #FFD700); color: #1a1a1a;
      border: none; font-weight: 700; border-radius: 30px; padding: 10px 24px; cursor: pointer; }
    .up-follow-btn.following { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); }
    .up-follow-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .up-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 26px; }
    .up-stat { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
      padding: 14px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .up-stat b { font-size: 22px; color: #fff; }
    .up-stat span { font-size: 11px; color: rgba(255,255,255,0.55); }
    .up-section { font-size: 18px; color: #fff; margin: 18px 0 12px; }
    .up-empty { color: rgba(255,255,255,0.45); font-style: italic; }
    @media (max-width: 560px) { .up-stats { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class UserProfileComponent implements OnInit {
  data: UserProfile | null = null;
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
      this.data = await this.profiles.getUserProfile(id);
    } catch (e: any) {
      this.error = e?.message || 'No se pudo cargar el perfil.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async toggleFollow() {
    if (!this.data || this.busyFollow) return;
    this.busyFollow = true;
    const wasFollowing = this.data.is_following;
    // Optimista
    this.data.is_following = !wasFollowing;
    this.data.user.followers_count += wasFollowing ? -1 : 1;
    this.cdr.detectChanges();
    try {
      if (wasFollowing) await this.social.unfollow(this.data.user.id);
      else await this.social.follow(this.data.user.id);
    } catch {
      // revertir
      this.data.is_following = wasFollowing;
      this.data.user.followers_count += wasFollowing ? 1 : -1;
    } finally {
      this.busyFollow = false;
      this.cdr.detectChanges();
    }
  }
}
