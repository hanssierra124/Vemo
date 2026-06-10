// ════════════════════════════════════════════════════════════════════
// Modelo de predicción de asistencia (Fase A4).
// ════════════════════════════════════════════════════════════════════
export interface EventPrediction {
  event_id: string;
  committed: number;       // total que dijo "asistiré"
  confirmed: number;       // ya hicieron check-in
  probable: number;        // p_u ≥ umbral
  estimated: number;       // valor esperado redondeado
  expected_value: number;  // valor esperado (decimal)
  confidence: number;      // 0..1
  model_version: string;
  computed_at: string;
}
