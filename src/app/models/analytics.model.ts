// ════════════════════════════════════════════════════════════════════
// Modelos de analítica del organizador (Fase A3).
// ════════════════════════════════════════════════════════════════════
export interface AnalyticsSummary {
  interested: number;   // guardados
  going: number;        // previstos (RSVP)
  attended: number;     // reales (check-in)
  views: number;
  shares: number;
  conversion: number;   // attended / going (0..1)
  fill_rate: number | null;
  capacity: number | null;
}

export interface TrendPoint { day: string; rsvps: number; }
export interface PeakHour { hour: number; count: number; }
export interface CityCount { city: string; count: number; }

export interface Demographics {
  total: number;
  age_buckets: Record<string, number>;
  unknown_age: number;
  top_cities: CityCount[];
}

export interface EventAnalytics {
  event: { id: string; title: string; date_event: string | null };
  summary: AnalyticsSummary;
  trend: TrendPoint[];
  peak_hours: PeakHour[];
  demographics: Demographics;
}
