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
      <h1 class="feed-title clash-display">Tu feed</h1>

      <div class="feed-state" *ngIf="!isLoggedIn">
        Inicia sesión para ver la actividad de las personas que sigues.
        <a routerLink="/auth" class="feed-cta">Iniciar sesión</a>
      </div>

      <div class="feed-state" *ngIf="isLoggedIn && loaded && items.length === 0">
        <ng-container *ngIf="emptyReason === 'no_follows'">
          Aún no sigues a nadie. Explora reseñas y sigue a otras personas para llenar tu feed.
        </ng-container>
        <ng-container *ngIf="emptyReason !== 'no_follows'">Tu feed está vacío por ahora.</ng-container>
      </div>

      <div class="feed-list" *ngIf="isLoggedIn">
        <div class="feed-item" *ngFor="let it of items">
          <p class="feed-line">
            <a class="feed-actor" [routerLink]="['/u', it.actor?.id]">{{ it.actor?.username || 'Alguien' }}</a>
            <ng-container [ngSwitch]="it.verb">
              <span *ngSwitchCase="'review_created'"> publicó una reseña</span>
              <span *ngSwitchCase="'review_liked'"> le dio ♥ a una reseña<span *ngIf="it.review?.author"> de {{ it.review?.author?.username }}</span></span>
              <span *ngSwitchCase="'comment_created'"> comentó una reseña</span>
              <span *ngSwitchCase="'user_followed'"> ahora sigue a
                <a class="feed-actor" [routerLink]="['/u', it.target_user?.id]">{{ it.target_user?.username || 'alguien' }}</a>
              </span>
            </ng-container>
            <span class="feed-time">· {{ timeAgo(it.created_at) }}</span>
          </p>

          <app-review-card *ngIf="it.review" [review]="it.review" [currentUserId]="currentUserId" [showSubjectLink]="true"></app-review-card>

          <p class="feed-comment" *ngIf="it.verb === 'comment_created' && it.comment">“{{ it.comment.body }}”</p>
        </div>

        <button class="feed-more" *ngIf="nextCursor" [disabled]="loadingMore" (click)="loadMore()">
          {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .feed-wrap { max-width: 680px; margin: 0 auto; padding: 24px 16px 80px; }
    .feed-title { font-size: 32px; color: #fff; margin-bottom: 20px; }
    .feed-state { color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; text-align: center; }
    .feed-cta { display: inline-block; margin-top: 12px; color: #FFD700; text-decoration: none; font-weight: 700; }
    .feed-item { margin-bottom: 18px; }
    .feed-line { color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 8px; }
    .feed-actor { color: #fff; font-weight: 700; text-decoration: none; }
    .feed-actor:hover { color: #FFD700; }
    .feed-time { color: rgba(255,255,255,0.4); font-size: 12px; }
    .feed-comment { color: rgba(255,255,255,0.8); font-style: italic; margin: 6px 0 0; padding-left: 12px;
      border-left: 2px solid rgba(255,255,255,0.12); }
    .feed-more { display: block; margin: 16px auto 0; background: transparent; color: #fff;
      border: 1px solid rgba(255,255,255,0.25); border-radius: 30px; padding: 10px 28px; cursor: pointer; }
    .feed-more:hover:not(:disabled) { border-color: #FFD700; color: #FFD700; }
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
