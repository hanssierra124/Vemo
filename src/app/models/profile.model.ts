// ════════════════════════════════════════════════════════════════════
// Modelos de perfiles públicos (Fase F3): usuario y organizador.
// ════════════════════════════════════════════════════════════════════
import { Review, ReviewStats } from './review.model';

export interface PublicUser {
  id: string;
  username: string | null;
  profile_url: string | null;
  role: string;
  company_name: string | null;
  followers_count: number;
  following_count: number;
}

export interface UserProfileStats {
  review_count: number;
  avg_rating_given: number;
  likes_received: number;
  comments_received: number;
}

export interface UserProfile {
  user: PublicUser;
  stats: UserProfileStats;
  recent_reviews: Review[];
  popular_reviews: Review[];
  is_following: boolean;
  is_self: boolean;
}

export interface OrganizerPublic extends PublicUser {
  address: string | null;
  public_email: string | null;
  creator_type: string | null;
  creator_tags: string[] | null;
}

export interface OrganizerProfile {
  organizer: OrganizerPublic;
  stats: ReviewStats;
  recent_reviews: Review[];
  featured_reviews: Review[];
  is_following: boolean;
  is_self: boolean;
}
