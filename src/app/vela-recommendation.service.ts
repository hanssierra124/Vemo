import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

// ── INTERFACES ──────────────────────────────────────

export interface UserProfile {
  interests: string[];
  negative_preferences: string[];
  preferred_company: string;
  preferred_time: string;
}

export interface DailyMood {
  mood: string;
  company: string;
  timeAvailable: string;
}

export interface ScoredEvent {
  event: any;
  score: number;
  reasons: string[];
  topReason: string;
}

// ── CONSTANTES DE SCORING ───────────────────────────

const WEIGHTS = {
  EMOTION:         35,
  INTEREST:        25,
  COMPANY:         15,
  TIME:            10,
  NEGATIVE_PENALTY: -10,
  PRICE_BONUS:      5,
  TARGET_BONUS:     5,
  FRESHNESS:        5,
};

// Emociones relacionadas (familias emocionales)
const EMOTION_FAMILIES: { [key: string]: string[] } = {
  'energia_positiva': ['alegría', 'emoción', 'diversión', 'adrenalina'],
  'calma':            ['calma', 'relajación', 'paz', 'tranquilidad'],
  'descubrimiento':   ['curiosidad', 'inspiración', 'creatividad', 'aprendizaje'],
  'sentimiento':      ['nostalgia', 'amor', 'romanticismo'],
};

// Mapping de preferencias negativas a categorías/características de eventos
const NEGATIVE_MAPS: { [key: string]: { categories: string[]; traits: string[] } } = {
  'multitudes':        { categories: ['fiesta', 'deportes'],              traits: ['alta'] },
  'ruido':             { categories: ['musica', 'fiesta'],                traits: ['alta'] },
  'alcohol':           { categories: ['fiesta'],                          traits: [] },
  'sol_extremo':       { categories: ['aire_libre', 'deportes'],          traits: [] },
  'noche':             { categories: [],                                  traits: ['noche'] },
  'espacios_cerrados': { categories: ['teatro', 'tecnologia'],            traits: [] },
  'precios_altos':     { categories: [],                                  traits: ['premium', 'alto'] },
  'largo_duracion':    { categories: [],                                  traits: ['dia'] },
};

@Injectable({ providedIn: 'root' })
export class VelaRecommendationService {

  private userProfile: UserProfile | null = null;
  private profileLoaded = false;

  // ── CARGAR PERFIL DEL USUARIO ─────────────────────

  async loadUserProfile(): Promise<UserProfile | null> {
    if (this.profileLoaded && this.userProfile) return this.userProfile;

    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    if (!token) return null;

    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return null;

      const data = await res.json();
      const user = data.user;

      this.userProfile = {
        interests: user.interests || [],
        negative_preferences: user.negative_preferences || [],
        preferred_company: user.preferred_company || '',
        preferred_time: user.preferred_time || '',
      };
      this.profileLoaded = true;
      return this.userProfile;
    } catch {
      return null;
    }
  }

  clearProfile() {
    this.userProfile = null;
    this.profileLoaded = false;
  }

  // ── OBTENER MOOD DIARIO DESDE LOCALSTORAGE ────────

  getDailyMood(): DailyMood {
    return {
      mood: localStorage.getItem('userCurrentMood') || '',
      company: localStorage.getItem('userCompany') || '',
      timeAvailable: localStorage.getItem('userTimeAvailable') || '',
    };
  }

  // ── MOTOR PRINCIPAL DE RECOMENDACIÓN ──────────────

  async scoreEvents(events: any[]): Promise<ScoredEvent[]> {
    const profile = await this.loadUserProfile();
    const daily = this.getDailyMood();

    return events
      .map(event => this.scoreEvent(event, profile, daily))
      .sort((a, b) => b.score - a.score);
  }

  private scoreEvent(event: any, profile: UserProfile | null, daily: DailyMood): ScoredEvent {
    let score = 0;
    const reasons: string[] = [];

    const eventEmotion = (event.emotions?.name || '').toLowerCase();
    const eventCategories = this.extractCategories(event);
    const matchFields = event.match_fields || {};
    const systemFields = event.system_fields || {};

    // ─── 1. EMOTION MATCH (35 pts) ───────────────────
    const dailyMood = daily.mood.toLowerCase();
    if (dailyMood && eventEmotion) {
      if (eventEmotion === dailyMood) {
        score += WEIGHTS.EMOTION;
        reasons.push(`Vibra con tu mood de hoy: ${daily.mood}`);
      } else if (this.areRelatedEmotions(dailyMood, eventEmotion)) {
        score += WEIGHTS.EMOTION * 0.5;
        reasons.push(`Conecta con tu energía de ${daily.mood}`);
      }
    }

    // ─── 2. INTEREST/CATEGORY MATCH (25 pts) ─────────
    if (profile?.interests?.length && eventCategories.length) {
      const overlap = eventCategories.filter(c => profile.interests.includes(c));
      if (overlap.length > 0) {
        const ratio = Math.min(overlap.length / Math.max(eventCategories.length, 1), 1);
        score += Math.round(WEIGHTS.INTEREST * ratio);
        reasons.push(`Encaja con tus gustos`);
      }
    }

    // ─── 3. COMPANY MATCH (15 pts) ───────────────────
    const userCompany = daily.company || profile?.preferred_company || '';
    const eventCompany = matchFields.ideal_company || '';
    if (userCompany && eventCompany) {
      if (eventCompany === userCompany) {
        score += WEIGHTS.COMPANY;
        reasons.push(this.getCompanyReason(userCompany));
      } else if (eventCompany === 'cualquiera' || userCompany === 'cualquiera') {
        score += Math.round(WEIGHTS.COMPANY * 0.6);
      }
    }

    // ─── 4. TIME MATCH (10 pts) ──────────────────────
    const userTime = this.normalizeTime(daily.timeAvailable) || profile?.preferred_time || '';
    const eventTime = matchFields.ideal_time || '';
    if (userTime && eventTime) {
      if (eventTime === userTime) {
        score += WEIGHTS.TIME;
        reasons.push(`Perfecto para tu horario`);
      } else if (eventTime === 'todo_dia' || userTime === 'todo_dia') {
        score += Math.round(WEIGHTS.TIME * 0.6);
      }
    }

    // ─── 5. NEGATIVE PREFERENCE PENALTY (-10 pts c/u, max -20) ──
    if (profile?.negative_preferences?.length) {
      let penalty = 0;
      for (const neg of profile.negative_preferences) {
        const mapping = NEGATIVE_MAPS[neg];
        if (!mapping) continue;

        const catHit = mapping.categories.some(c => eventCategories.includes(c));
        const traitHit = mapping.traits.some(t =>
          eventCompany === t || eventTime === t ||
          matchFields.energy_level === t || event.price_range === t
        );

        if (catHit || traitHit) {
          penalty += WEIGHTS.NEGATIVE_PENALTY;
        }
      }
      score += Math.max(penalty, -20);
      if (penalty < 0) {
        reasons.push(`Podria no ser ideal segun tus preferencias`);
      }
    }

    // ─── 6. PRICE BONUS (5 pts) ─────────────────────
    const price = (event.price_range || '').toLowerCase();
    if (price === 'gratis' || price === 'free') {
      score += WEIGHTS.PRICE_BONUS;
    } else if (profile?.negative_preferences?.includes('precios_altos') && (price === 'bajo' || price === 'gratis')) {
      score += WEIGHTS.PRICE_BONUS;
    }

    // ─── 7. TARGET AUDIENCE BONUS (5 pts) ────────────
    if (systemFields.target_user_type && profile?.preferred_company) {
      const targetMap: { [k: string]: string[] } = {
        'solo':    ['jovenes', 'profesionales'],
        'pareja':  ['jovenes', 'turistas'],
        'amigos':  ['jovenes'],
        'familia': ['familias'],
      };
      const targets = targetMap[profile.preferred_company] || [];
      if (targets.includes(systemFields.target_user_type)) {
        score += WEIGHTS.TARGET_BONUS;
      }
    }

    // ─── 8. FRESHNESS BONUS (5 pts) ─────────────────
    if (event.date_event) {
      const eventDate = new Date(event.date_event);
      const now = new Date();
      const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntil >= 0 && daysUntil <= 7) {
        score += WEIGHTS.FRESHNESS;
        reasons.push(`Ocurre pronto`);
      }
    }

    // Clamp score 0-100
    score = Math.max(0, Math.min(100, score));

    // Top reason: la mas relevante
    const topReason = reasons.length > 0
      ? reasons[0]
      : (score > 30 ? 'Experiencia destacada para ti' : 'Experiencia disponible');

    return { event, score, reasons, topReason };
  }

  // ── HELPERS ──────────────────────────────────────

  private extractCategories(event: any): string[] {
    // Los eventos pueden traer categories como array de objetos o categoryIds como array de strings
    if (event.categoryIds && Array.isArray(event.categoryIds)) {
      return event.categoryIds;
    }
    if (event.categories && Array.isArray(event.categories)) {
      return event.categories.map((c: any) => typeof c === 'string' ? c : c.id || c.name || '');
    }
    return [];
  }

  private areRelatedEmotions(a: string, b: string): boolean {
    for (const family of Object.values(EMOTION_FAMILIES)) {
      const aIn = family.some(e => a.includes(e));
      const bIn = family.some(e => b.includes(e));
      if (aIn && bIn) return true;
    }
    return false;
  }

  private normalizeTime(timeAvailable: string): string {
    // Convertir opciones del daily onboarding al formato del evento
    const map: { [k: string]: string } = {
      '1h': 'tarde',
      '3h': 'tarde',
      'noche': 'noche',
      'dia': 'todo_dia',
    };
    return map[timeAvailable] || timeAvailable;
  }

  private getCompanyReason(company: string): string {
    const map: { [k: string]: string } = {
      'solo':    'Ideal para ir solo/a',
      'pareja':  'Perfecto en pareja',
      'amigos':  'Genial con amigos',
      'familia': 'Para toda la familia',
    };
    return map[company] || 'Encaja con tu compañia';
  }

  // ── GENERAR MENSAJE DE VELA ───────────────────────

  generateVelaMessage(scored: ScoredEvent[], daily: DailyMood): string {
    if (!scored.length) return 'No hay experiencias disponibles ahora mismo.';

    const topScore = scored[0]?.score || 0;

    if (!daily.mood) {
      return 'Cuéntame cómo te sientes hoy y calibraré la ciudad a tu frecuencia.';
    }

    if (topScore >= 60) {
      return `Hoy buscas ${daily.mood}. Encontré experiencias que vibran perfecto contigo.`;
    }
    if (topScore >= 35) {
      return `Veo que hoy quieres ${daily.mood}. Estas opciones conectan con tu energía.`;
    }
    return `No hay un match perfecto para ${daily.mood} ahora, pero estas experiencias te pueden sorprender.`;
  }
}
