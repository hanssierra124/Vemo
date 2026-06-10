// ════════════════════════════════════════════════════════════════════
// FollowListComponent — modal reutilizable que lista seguidores o
// seguidos de un usuario/organizador (Fase F2). Pagina por cursor y
// enlaza cada usuario a su perfil público. DRY: usado por ambos perfiles.
// ════════════════════════════════════════════════════════════════════
import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SocialService } from '../../../social.service';
import { FollowUserItem } from '../../../models/social.model';

@Component({
  selector: 'app-follow-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="fl-backdrop" (click)="close()">
      <div class="fl-modal" (click)="$event.stopPropagation()">
        <header class="fl-head">
          <h3 class="fl-title">{{ mode === 'followers' ? 'Seguidores' : 'Siguiendo' }}</h3>
          <button class="fl-close" type="button" (click)="close()" aria-label="Cerrar">✕</button>
        </header>

        <p class="fl-state" *ngIf="!loaded">Cargando…</p>
        <p class="fl-state" *ngIf="loaded && items.length === 0">
          {{ mode === 'followers' ? 'Aún no tiene seguidores.' : 'Todavía no sigue a nadie.' }}
        </p>

        <ul class="fl-list" *ngIf="items.length">
          <li class="fl-item" *ngFor="let u of items">
            <a class="fl-user" [routerLink]="['/u', u.id]" (click)="close()">
              <span class="fl-avatar" [style.backgroundImage]="u.profile_url ? 'url(' + u.profile_url + ')' : null">
                <span *ngIf="!u.profile_url">{{ (u.username || '?')[0] }}</span>
              </span>
              <span class="fl-name">{{ u.username || 'Usuario' }}</span>
            </a>
          </li>
        </ul>

        <button class="fl-more" *ngIf="nextCursor" [disabled]="loadingMore" (click)="loadMore()">
          {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .fl-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .fl-modal { width: 100%; max-width: 380px; max-height: 70vh; overflow-y: auto;
      background: #161616; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 18px; }
    .fl-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .fl-title { font-size: 18px; color: #fff; margin: 0; }
    .fl-close { background: none; border: none; color: rgba(255,255,255,0.6); font-size: 18px; cursor: pointer; }
    .fl-close:hover { color: #fff; }
    .fl-state { color: rgba(255,255,255,0.5); font-style: italic; text-align: center; padding: 16px 0; }
    .fl-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .fl-user { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 10px;
      text-decoration: none; transition: background 0.2s; }
    .fl-user:hover { background: rgba(255,255,255,0.05); }
    .fl-avatar { width: 40px; height: 40px; border-radius: 50%; flex: 0 0 40px;
      background: linear-gradient(135deg, #FF4D80, #FFD700); background-size: cover; background-position: center;
      display: flex; align-items: center; justify-content: center; font-weight: 800; color: #1a1a1a; text-transform: uppercase; }
    .fl-name { color: #fff; font-weight: 600; font-size: 14px; }
    .fl-more { display: block; margin: 12px auto 0; background: transparent; color: #fff;
      border: 1px solid rgba(255,255,255,0.25); border-radius: 30px; padding: 8px 24px; cursor: pointer; }
    .fl-more:hover:not(:disabled) { border-color: #FFD700; color: #FFD700; }
    .fl-more:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class FollowListComponent implements OnInit {
  @Input({ required: true }) userId!: string;
  @Input() mode: 'followers' | 'following' = 'followers';
  @Output() closed = new EventEmitter<void>();

  items: FollowUserItem[] = [];
  nextCursor: string | null = null;
  loaded = false;
  loadingMore = false;

  constructor(private social: SocialService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

  private fetchPage(cursor?: string | null) {
    const opts = { cursor, limit: 30 };
    return this.mode === 'followers'
      ? this.social.followers(this.userId, opts)
      : this.social.following(this.userId, opts);
  }

  private async load() {
    try {
      const page = await this.fetchPage();
      this.items = page.items;
      this.nextCursor = page.nextCursor;
    } catch { this.items = []; } finally { this.loaded = true; this.cdr.detectChanges(); }
  }

  async loadMore() {
    if (!this.nextCursor || this.loadingMore) return;
    this.loadingMore = true;
    try {
      const page = await this.fetchPage(this.nextCursor);
      this.items = [...this.items, ...page.items];
      this.nextCursor = page.nextCursor;
    } catch { /* noop */ } finally { this.loadingMore = false; this.cdr.detectChanges(); }
  }

  close() { this.closed.emit(); }
}
