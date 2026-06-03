// ════════════════════════════════════════════════════════════════════
// Modelos del feed social (Fase F3). El feed es PULL: actividad de las
// personas que sigues, hidratada por el backend.
// ════════════════════════════════════════════════════════════════════
import { ReviewAuthor } from './review.model';

export type FeedVerb =
  | 'review_created'
  | 'review_liked'
  | 'comment_created'
  | 'user_followed';

export interface FeedReview {
  id: string;
  subject_type: 'event' | 'organizer';
  subject_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  like_count: number;
  comment_count: number;
  user_id: string;
  author: ReviewAuthor | null;
  liked_by_me?: boolean;
}

export interface FeedComment {
  id: string;
  review_id: string;
  body: string;
  author: ReviewAuthor | null;
}

export interface FeedItem {
  id: number;
  verb: FeedVerb;
  created_at: string;
  actor: ReviewAuthor | null;
  review: FeedReview | null;
  comment: FeedComment | null;
  target_user: ReviewAuthor | null;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
  empty_reason?: string;
}
