// ════════════════════════════════════════════════════════════════════
// ReviewCardComponent (Fase F3) — tarjeta de reseña REUTILIZABLE con capa
// social: estrella, autor enlazado, cuerpo markdown seguro, like (toggle),
// e hilo de comentarios + respuestas. Usada en feed, perfiles y detalle de
// evento (DRY). El conteo de likes proviene siempre de la respuesta del
// servidor (fuente de verdad).
// ════════════════════════════════════════════════════════════════════
import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StarRatingComponent } from '../star-rating/star-rating';
import { ReviewAuthor, ReviewRevision } from '../../../models/review.model';
import { ReviewComment } from '../../../models/social.model';
import { ReportReason, REPORT_REASONS } from '../../../models/moderation.model';
import { SocialService } from '../../../social.service';
import { ModerationService } from '../../../moderation.service';
import { ReviewService } from '../../../review.service';
import { renderSafeMarkdown } from '../../../utils/markdown';

export interface ReviewCardData {
  id: string;
  user_id: string;
  subject_type: 'event' | 'organizer';
  subject_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  like_count: number;
  comment_count: number;
  is_verified_attendee?: boolean;
  author?: ReviewAuthor | null;
  liked_by_me?: boolean;
  edited_at?: string | null;
}

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StarRatingComponent],
  templateUrl: './review-card.html',
  styleUrls: ['./review-card.css'],
})
export class ReviewCardComponent implements OnInit {
  @Input({ required: true }) review!: ReviewCardData;
  @Input() currentUserId: string | null = null;
  @Input() showSubjectLink = false;

  liked = false;
  likeCount = 0;
  busyLike = false;

  showComments = false;
  comments: ReviewComment[] = [];
  commentsLoaded = false;
  loadingComments = false;
  newComment = '';
  posting = false;

  replyOpenFor: string | null = null;
  replyText = '';

  // Reportes
  reportOpen = false;
  reporting = false;
  reportSent = false;
  readonly reasons = REPORT_REASONS;

  // Historial de revisiones
  revisionsOpen = false;
  revisions: ReviewRevision[] = [];
  revisionsLoaded = false;
  loadingRevisions = false;

  constructor(
    private social: SocialService,
    private moderation: ModerationService,
    private reviews: ReviewService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.likeCount = this.review.like_count || 0;
    this.liked = !!this.review.liked_by_me;
  }

  get isLoggedIn(): boolean {
    return !!(localStorage.getItem('vemo_token') || localStorage.getItem('token'));
  }

  renderBody(md: string | null): string {
    return renderSafeMarkdown(md);
  }

  subjectRouterLink(): any[] {
    return this.review.subject_type === 'organizer'
      ? ['/organizer', this.review.subject_id]
      : ['/event', this.review.subject_id];
  }

  async toggleLike() {
    if (this.busyLike || !this.isLoggedIn) return;
    this.busyLike = true;
    try {
      const res = this.liked
        ? await this.social.unlike(this.review.id)
        : await this.social.like(this.review.id);
      this.liked = res.liked;
      this.likeCount = res.like_count;
    } catch (_) {
      // silencioso: la UI no cambia si el servidor falla
    } finally {
      this.busyLike = false;
      this.cdr.detectChanges();
    }
  }

  async toggleComments() {
    this.showComments = !this.showComments;
    if (this.showComments && !this.commentsLoaded) {
      await this.loadComments();
    }
    this.cdr.detectChanges();
  }

  private async loadComments() {
    this.loadingComments = true;
    try {
      const page = await this.social.listComments(this.review.id, { limit: 50 });
      this.comments = page.items || [];
      this.commentsLoaded = true;
    } catch (_) {
      this.comments = [];
    } finally {
      this.loadingComments = false;
      this.cdr.detectChanges();
    }
  }

  async submitComment() {
    const body = (this.newComment || '').trim();
    if (!body || this.posting || !this.isLoggedIn) return;
    this.posting = true;
    try {
      const created = await this.social.addComment(this.review.id, body);
      this.comments = [...this.comments, created];
      this.review.comment_count = (this.review.comment_count || 0) + 1;
      this.newComment = '';
    } catch (_) {
      /* feedback mínimo */
    } finally {
      this.posting = false;
      this.cdr.detectChanges();
    }
  }

  openReply(commentId: string) {
    this.replyOpenFor = this.replyOpenFor === commentId ? null : commentId;
    this.replyText = '';
    this.cdr.detectChanges();
  }

  async submitReply(comment: ReviewComment) {
    const body = (this.replyText || '').trim();
    if (!body || this.posting || !this.isLoggedIn) return;
    this.posting = true;
    try {
      const created = await this.social.reply(comment.id, body);
      comment.replies = [...(comment.replies || []), created];
      this.review.comment_count = (this.review.comment_count || 0) + 1;
      this.replyOpenFor = null;
      this.replyText = '';
    } catch (_) {
      /* feedback mínimo */
    } finally {
      this.posting = false;
      this.cdr.detectChanges();
    }
  }

  /** El visitante autenticado solo puede borrar sus propios comentarios. */
  canDelete(c: ReviewComment): boolean {
    return !!this.currentUserId && c.user_id === this.currentUserId;
  }

  /** Borra un comentario o respuesta propio. `parent` se pasa si es respuesta. */
  async deleteComment(c: ReviewComment, parent?: ReviewComment) {
    if (this.posting || !this.canDelete(c)) return;
    if (!confirm('¿Eliminar este comentario?')) return;
    this.posting = true;
    try {
      await this.social.deleteComment(c.id);
      if (parent) {
        parent.replies = (parent.replies || []).filter(r => r.id !== c.id);
      } else {
        this.comments = this.comments.filter(x => x.id !== c.id);
      }
      this.review.comment_count = Math.max(0, (this.review.comment_count || 1) - 1);
    } catch (_) {
      /* feedback mínimo */
    } finally {
      this.posting = false;
      this.cdr.detectChanges();
    }
  }

  // ── Reportar ────────────────────────────────────────────────────────
  toggleReport() {
    this.reportOpen = !this.reportOpen;
    this.cdr.detectChanges();
  }

  async submitReport(reason: ReportReason) {
    if (this.reporting || this.reportSent) return;
    this.reporting = true;
    try {
      await this.moderation.report('review', this.review.id, reason);
      this.reportSent = true;
      this.reportOpen = false;
    } catch (_) {
      // 409 = ya reportado: lo tratamos como enviado
      this.reportSent = true;
      this.reportOpen = false;
    } finally {
      this.reporting = false;
      this.cdr.detectChanges();
    }
  }

  // ── Historial de revisiones ──────────────────────────────────────────
  get wasEdited(): boolean {
    return !!this.review.edited_at;
  }

  async toggleRevisions() {
    this.revisionsOpen = !this.revisionsOpen;
    if (this.revisionsOpen && !this.revisionsLoaded) {
      await this.loadRevisions();
    }
    this.cdr.detectChanges();
  }

  private async loadRevisions() {
    this.loadingRevisions = true;
    try {
      this.revisions = await this.reviews.revisions(this.review.id);
      this.revisionsLoaded = true;
    } catch (_) {
      this.revisions = [];
    } finally {
      this.loadingRevisions = false;
      this.cdr.detectChanges();
    }
  }
}
