// ════════════════════════════════════════════════════════════════════
// Vocabularios cerrados de preferencias del usuario (onboarding + perfil).
// Deben coincidir con los CHECK de vemo-backend/migrations/012_user_preferences.sql
// y con las listas espejo en server.js (NEGATIVE_PREFERENCES, etc.).
// Compartido entre user-interests.component (onboarding) y
// profile.component (edición de perfil) para no duplicar las opciones.
// ════════════════════════════════════════════════════════════════════

export interface PreferenceOption {
  value: string;
  label: string;
  emoji: string;
  desc?: string;
}

export const INTERESES_DISPONIBLES: PreferenceOption[] = [
  { value: 'musica', label: 'Música en vivo', emoji: '🎵' },
  { value: 'gastronomia', label: 'Gastronomía', emoji: '🍽️' },
  { value: 'arte', label: 'Arte y Cultura', emoji: '🎨' },
  { value: 'deportes', label: 'Deportes', emoji: '⚽' },
  { value: 'fiesta', label: 'Fiesta y Rumba', emoji: '🎉' },
  { value: 'aire_libre', label: 'Aire Libre', emoji: '🌿' },
  { value: 'teatro', label: 'Teatro y Shows', emoji: '🎭' },
  { value: 'bienestar', label: 'Bienestar y Yoga', emoji: '🧘' },
  { value: 'tecnologia', label: 'Tecnología', emoji: '💻' },
  { value: 'fotografia', label: 'Fotografía', emoji: '📸' },
  { value: 'turismo', label: 'Turismo local', emoji: '🗺️' },
  { value: 'educacion', label: 'Talleres y Cursos', emoji: '📚' },
];

export const NEGATIVOS_DISPONIBLES: PreferenceOption[] = [
  { value: 'multitudes', label: 'Multitudes grandes', emoji: '👥' },
  { value: 'ruido', label: 'Mucho ruido', emoji: '🔊' },
  { value: 'alcohol', label: 'Ambientes con alcohol', emoji: '🍺' },
  { value: 'sol_extremo', label: 'Sol extremo', emoji: '☀️' },
  { value: 'noche', label: 'Actividades nocturnas', emoji: '🌙' },
  { value: 'espacios_cerrados', label: 'Espacios cerrados', emoji: '🏢' },
  { value: 'precios_altos', label: 'Precios altos', emoji: '💸' },
  { value: 'largo_duracion', label: 'Eventos muy largos', emoji: '⏳' },
];

export const COMPANY_OPTIONS: PreferenceOption[] = [
  { value: 'solo', label: 'Solo/a', emoji: '🧍' },
  { value: 'pareja', label: 'En pareja', emoji: '💑' },
  { value: 'amigos', label: 'Con amigos', emoji: '👫' },
  { value: 'familia', label: 'En familia', emoji: '👨‍👩‍👧' },
  { value: 'cualquiera', label: 'Cualquiera', emoji: '🤷' },
];

export const TIME_OPTIONS: PreferenceOption[] = [
  { value: 'manana', label: 'Mañana', emoji: '🌅' },
  { value: 'tarde', label: 'Tarde', emoji: '☀️' },
  { value: 'noche', label: 'Noche', emoji: '🌙' },
  { value: 'todo_dia', label: 'Cualquier hora', emoji: '🕐' },
];

/** Compañía sin "cualquiera" — dominio de mood_company / target_company (ver migraciones 012/013). */
export const TARGET_COMPANY_OPTIONS: PreferenceOption[] = [
  { value: 'solo', label: 'Solo/a', emoji: '🧍' },
  { value: 'pareja', label: 'En pareja', emoji: '💑' },
  { value: 'amigos', label: 'Con amigos', emoji: '👫' },
  { value: 'familia', label: 'En familia', emoji: '👨‍👩‍👧' },
];

/** Duración disponible — dominio de mood_time_available / target_time_available. */
export const TIME_AVAILABLE_OPTIONS: PreferenceOption[] = [
  { value: '1h', label: 'Menos de 1h', emoji: '⚡' },
  { value: '3h', label: '1 – 3 horas', emoji: '🌅' },
  { value: 'noche', label: 'Noche entera', emoji: '🌙' },
  { value: 'dia', label: 'Todo el día', emoji: '🗓️' },
];

export const BARRIOS_DISPONIBLES: string[] = [
  'Alto Prado', 'El Prado', 'Riomar', 'Villa Country', 'El Golf', 'Ciudad Jardín',
  'Boston', 'Miramar', 'La Concepción', 'Alameda del Río', 'Buenavista', 'Los Nogales',
  'San Vicente', 'Simón Bolívar', 'El Poblado', 'La Victoria', 'Las Nieves', 'Betania',
  'El Silencio', 'Bellavista', 'Colombia', 'El Recreo', 'Modelo', 'Rebolo',
  'Barranquillita', 'El Bosque', 'Las Delicias',
];

export const OUTING_FREQUENCY_OPTIONS: PreferenceOption[] = [
  { value: 'diario', label: 'Diario', emoji: '🔥' },
  { value: 'semanal', label: 'Semanalmente', emoji: '📅' },
  { value: 'quincenal', label: 'Quincenal', emoji: '🗓️' },
  { value: 'mensual', label: 'Mensual', emoji: '🌙' },
];

export const SPONTANEITY_OPTIONS: PreferenceOption[] = [
  { value: 'planeado', label: 'Planeado', emoji: '📋' },
  { value: 'improvisado', label: 'Improvisado', emoji: '🎲' },
];

export const BUDGET_RANGE_OPTIONS: PreferenceOption[] = [
  { value: 'bajo', label: 'Económico', emoji: '💵', desc: 'Hasta $50.000' },
  { value: 'medio', label: 'Moderado', emoji: '💰', desc: '$50.000 – $150.000' },
  { value: 'alto', label: 'Alto', emoji: '💎', desc: '$150.000 – $300.000' },
  { value: 'sin_limite', label: 'Sin límite', emoji: '🏆', desc: '$300.000+' },
];

export const TRANSPORT_OPTIONS: PreferenceOption[] = [
  { value: 'publico', label: 'Transporte público', emoji: '🚌' },
  { value: 'propio', label: 'Vehículo propio', emoji: '🚗' },
  { value: 'caminando', label: 'Caminando', emoji: '🚶' },
];

export const SOCIAL_ENERGY_OPTIONS: PreferenceOption[] = [
  { value: 'reservada', label: 'Reservada', emoji: '🌙' },
  { value: 'equilibrada', label: 'Equilibrada', emoji: '⚖️' },
  { value: 'extrovertida', label: 'Extrovertida', emoji: '☀️' },
];

export const INTENTION_OPTIONS: PreferenceOption[] = [
  { value: 'desahogarme', label: 'Desahogarme', emoji: '💨' },
  { value: 'conocer_gente', label: 'Conocer gente', emoji: '🤝' },
  { value: 'celebrar', label: 'Celebrar', emoji: '🎉' },
  { value: 'comer_rico', label: 'Comer rico', emoji: '🍽️' },
  { value: 'salir_zona_confort', label: 'Salir de mi zona de confort', emoji: '🚀' },
];
