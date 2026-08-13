// ════════════════════════════════════════════════════════════════════
// Modelos de recomendaciones (Fase A6).
// ════════════════════════════════════════════════════════════════════
export interface PersonSuggestion {
  id: string;
  username: string | null;
  profile_url: string | null;
  mutual_events: number;
}

export interface NearbyPlace {
  id: string;
  username: string | null;
  company_name: string | null;
  profile_url: string | null;
  creator_type: string | null;
  creator_tags: string[];
  distance_km: number;
}

export interface RecommendedEvent {
  id: string;
  title: string;
  image_url: string | null;
  date_event: string | null;
  location_name: string | null;
  city: string | null;
  rating_avg: number;
  going_count: number;
  score: number;
  reasons: string[];
}
