// ════════════════════════════════════════════════════════════════════
// Modelos de la capa social (Fase F2): likes, comentarios/respuestas,
// follow. Reutiliza ReviewAuthor/Paged de review.model.
// ════════════════════════════════════════════════════════════════════
import { ReviewAuthor } from './review.model';

export interface ReviewComment {
  id: string;
  review_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  author: ReviewAuthor | null;
  replies: ReviewComment[];
}

export interface LikeResult {
  liked: boolean;
  like_count: number;
}

export interface FollowResult {
  following: boolean;
}

export interface FollowUserItem extends ReviewAuthor {
  followed_at: string;
}
