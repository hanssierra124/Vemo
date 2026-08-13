// ════════════════════════════════════════════════════════════════════
// FeedComponent (Fase F3) — feed social estilo Letterboxd: actividad de
// las personas que sigues. Render por verbo, con tarjetas reutilizables.
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../environments/environment';
import { FeedService } from './feed.service';
import { FeedItem } from './models/feed.model';
import { ReviewCardComponent } from './shared/Components/review-card/review-card';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, ReviewCardComponent],
  template: `
    <div class="feed-wrap">
      <header class="feed-header">
        <span class="feed-eyebrow">VEMO SOCIAL</span>
        <h1 class="feed-title clash-display">Tu feed</h1>
        <p class="feed-sub">La actividad de las personas y organizadores que sigues.</p>
      </header>

      <!-- No autenticado -->
      <div class="feed-state" *ngIf="!isLoggedIn">
        <div class="feed-state-icon">🔒</div>
        <p class="feed-state-text">Inicia sesión para ver la actividad de las personas que sigues.</p>
        <a routerLink="/auth" class="feed-cta">Iniciar sesión</a>
      </div>

      <!-- Skeletons mientras carga -->
      <div class="feed-list" *ngIf="isLoggedIn && !loaded">
        <div class="feed-skeleton" *ngFor="let s of [1,2,3]">
          <div class="sk-line"></div>
          <div class="sk-card"></div>
        </div>
      </div>

      <!-- Vacío -->
      <div class="feed-state" *ngIf="isLoggedIn && loaded && items.length === 0">
        <div class="feed-state-icon">✨</div>
        <p class="feed-state-text" *ngIf="emptyReason === 'no_follows'">
          Aún no sigues a nadie. Explora eventos, abre una reseña y sigue a sus autores u organizadores para llenar tu feed.
        </p>
        <p class="feed-state-text" *ngIf="emptyReason !== 'no_follows'">
          Tu feed está vacío por ahora. Sigue a más personas para ver su actividad.
        </p>
        <a routerLink="/map" class="feed-cta">Explorar eventos</a>
      </div>

      <!-- Lista -->
      <div class="feed-list" *ngIf="isLoggedIn && loaded && items.length">
        <article class="feed-item" *ngFor="let it of items">
          <div class="feed-line">
            <a class="feed-actor-avatar" [routerLink]="['/u', it.actor?.id]"
               [style.backgroundImage]="it.actor?.profile_url ? 'url(' + it.actor?.profile_url + ')' : null">
              <span *ngIf="!it.actor?.profile_url">{{ (it.actor?.username || '?')[0] }}</span>
            </a>
            <p class="feed-text">
              <a class="feed-actor" [routerLink]="['/u', it.actor?.id]">{{ it.actor?.username || 'Alguien' }}</a>
              <ng-container [ngSwitch]="it.verb">
                <span *ngSwitchCase="'review_created'"><span class="feed-verb">✍️ publicó una reseña</span></span>
                <span *ngSwitchCase="'review_liked'"><span class="feed-verb">♥ le gustó una reseña</span><span *ngIf="it.review?.author"> de {{ it.review?.author?.username }}</span></span>
                <span *ngSwitchCase="'comment_created'"><span class="feed-verb">💬 comentó una reseña</span></span>
                <span *ngSwitchCase="'user_followed'"><span class="feed-verb">＋ ahora sigue a</span>
                  <a class="feed-actor" [routerLink]="['/u', it.target_user?.id]">{{ it.target_user?.username || 'alguien' }}</a>
                </span>
              </ng-container>
              <span class="feed-time">· {{ timeAgo(it.created_at) }}</span>
            </p>
          </div>

          <app-review-card *ngIf="it.review" [review]="it.review" [currentUserId]="currentUserId" [showSubjectLink]="true"></app-review-card>

          <p class="feed-comment" *ngIf="it.verb === 'comment_created' && it.comment">“{{ it.comment.body }}”</p>
        </article>

        <button class="feed-more" *ngIf="nextCursor" [disabled]="loadingMore" (click)="loadMore()">
          {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; background-color: var(--ink, #0E0D12); min-height: 100vh;
      background-image: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(106,0,255,0.10), transparent 70%); }
    .feed-wrap { max-width: 680px; margin: 0 auto; padding: calc(var(--vemo-header-h, 90px) + 28px) 16px 100px; }

    .feed-header { margin-bottom: 28px; }
    .feed-eyebrow { font-size: 11px; letter-spacing: 3px; font-weight: 700;
      background: var(--grad-warm); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .feed-title { font-size: 40px; color: var(--text-1); margin: 6px 0 4px; line-height: 1; }
    .feed-sub { color: var(--text-2); font-size: 14px; margin: 0; }

    .feed-state { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center;
      color: var(--text-2); background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; padding: 48px 28px; margin-top: 8px; }
    .feed-state-icon { font-size: 40px; filter: saturate(1.2); }
    .feed-state-text { margin: 0; max-width: 380px; line-height: 1.5; }
    .feed-cta { display: inline-block; margin-top: 6px; background: var(--grad-warm); color: #1a1a1a;
      font-weight: 700; text-decoration: none; padding: 11px 26px; border-radius: 30px;
      transition: transform .2s var(--ease-film), box-shadow .2s; }
    .feed-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,77,128,0.3); }

    .feed-item { margin-bottom: 22px; }
    .feed-line { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .feed-actor-avatar { width: 34px; height: 34px; border-radius: 50%; flex: 0 0 34px; text-decoration: none;
      background: var(--grad-warm); background-size: cover; background-position: center;
      display: flex; align-items: center; justify-content: center; font-weight: 800; color: #1a1a1a; text-transform: uppercase; font-size: 14px; }
    .feed-text { color: var(--text-2); font-size: 14px; margin: 0; line-height: 1.4; }
    .feed-actor { color: var(--text-1); font-weight: 700; text-decoration: none; }
    .feed-actor:hover { color: var(--glow); }
    .feed-verb { color: var(--text-2); }
    .feed-time { color: var(--text-3); font-size: 12px; }
    .feed-comment { color: var(--text-1); font-style: italic; margin: 8px 0 0; padding: 10px 14px;
      background: var(--surface); border-left: 2px solid var(--glow); border-radius: 0 10px 10px 0; }

    .feed-more { display: block; margin: 20px auto 0; background: transparent; color: var(--text-1);
      border: 1px solid var(--border); border-radius: 30px; padding: 11px 30px; cursor: pointer; transition: all .2s; }
    .feed-more:hover:not(:disabled) { border-color: var(--glow); color: var(--glow); }
    .feed-more:disabled { opacity: .5; cursor: not-allowed; }

    /* Skeletons */
    .feed-skeleton { margin-bottom: 22px; }
    .sk-line { height: 14px; width: 60%; border-radius: 8px; margin-bottom: 12px;
      background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.09), rgba(255,255,255,0.04));
      background-size: 200% 100%; animation: sk 1.2s ease-in-out infinite; }
    .sk-card { height: 120px; border-radius: 16px;
      background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.07), rgba(255,255,255,0.03));
      background-size: 200% 100%; animation: sk 1.2s ease-in-out infinite; }
    @keyframes sk { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `],
})
export class FeedComponent implements OnInit {
  items: FeedItem[] = [];
  nextCursor: string | null = null;
  loaded = false;
  loadingMore = false;
  emptyReason: string | undefined;
  currentUserId: string | null = null;

  constructor(private feed: FeedService, private cdr: ChangeDetectorRef) {}

  get isLoggedIn(): boolean {
    return !!(localStorage.getItem('vemo_token') || localStorage.getItem('token'));
  }

  async ngOnInit() {
    if (!this.isLoggedIn) { this.loaded = true; return; }
    await this.loadMe();
    await this.load();
  }

  private async loadMe() {
    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/profile?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        this.currentUserId = data?.user?.id ?? null;
      }
    } catch { /* anónimo */ }
  }

  private async load() {
    try {
      const page = await this.feed.getFeed({ limit: 20 });
      this.items = page.items;
      this.nextCursor = page.nextCursor;
      this.emptyReason = page.empty_reason;
    } catch { /* feed vacío en error */ } finally {
      this.loaded = true;
      this.cdr.detectChanges();
    }
  }

  async loadMore() {
    if (!this.nextCursor || this.loadingMore) return;
    this.loadingMore = true;
    try {
      const page = await this.feed.getFeed({ cursor: this.nextCursor, limit: 20 });
      this.items = [...this.items, ...page.items];
      this.nextCursor = page.nextCursor;
    } catch { /* noop */ } finally {
      this.loadingMore = false;
      this.cdr.detectChanges();
    }
  }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} d`;
  }
}
