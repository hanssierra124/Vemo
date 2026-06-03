// ════════════════════════════════════════════════════════════════════
// Modelos del sistema de reseñas (Fase F1). Tipado fuerte para sustituir
// el `any` predominante. El `rating` siempre es decimal 0.5..5 (pasos 0.5).
// ════════════════════════════════════════════════════════════════════

export type ReviewSubjectType = 'event' | 'organizer';
export type ReviewStatus = 'visible' | 'hidden' | 'deleted';

export interface ReviewAuthor {
  id: string;
  username: string | null;
  profile_url: string | null;
}

export interface Review {
  id: string;
  user_id: string;
  subject_type: ReviewSubjectType;
  subject_id: string;
  rating: number; // 0.5 .. 5 (pasos de 0.5)
  title: string | null;
  body: string | null; // markdown
  is_verified_attendee: boolean;
  like_count: number;
  comment_count: number;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  author?: ReviewAuthor;
  liked_by_me?: boolean; // estado del visitante autenticado (F5)
}

export interface ReviewRevision {
  id: string;
  rating: number | null;
  title: string | null;
  body: string | null;
  edited_by: string | null;
  created_at: string;
}

/** Histograma con clave = valor de estrella ('0.5'..'5'), valor = conteo. */
export type RatingHistogram = Record<string, number>;

export interface ReviewStats {
  subject_type: ReviewSubjectType;
  subject_id: string;
  rating_count: number;
  rating_avg: number; // 0..5
  histogram: RatingHistogram;
}

export interface Paged<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CreateReviewInput {
  subject_type: ReviewSubjectType;
  subject_id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string | null;
  body?: string | null;
}

export type ReviewSort = 'recent' | 'popular';

export interface ListReviewsOptions {
  sort?: ReviewSort;
  cursor?: string | null;
  limit?: number;
}

/** Valores de estrella permitidos por la UI (idénticos a Letterboxd). */
export const RATING_STEPS: readonly number[] = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
] as const;
