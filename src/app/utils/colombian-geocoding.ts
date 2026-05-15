/**
 * Geocodificación específica para direcciones colombianas.
 *
 * Estrategia de doble motor:
 *   1. PHOTON (https://photon.komoot.io) — motor primario.
 *      - Gratis, sin API key, basado en OSM con Elasticsearch encima.
 *      - Hace fuzzy matching y entiende mejor variaciones de nomenclatura
 *        colombiana ("Cra", "Carrera", "Cl", etc.).
 *      - Aceptamos un BIAS geográfico (lat/lon/zoom) para que priorice
 *        resultados dentro de la ciudad.
 *   2. NOMINATIM — fallback si Photon no devolvió hit válido.
 *      - El motor original de OSM, más estricto pero todavía útil
 *        cuando Photon no encuentra nada.
 *
 * Para AMBOS motores aplicamos:
 *   - Múltiples variantes de la dirección (exacta, intersección,
 *     limpieza, "No." en lugar de "#").
 *   - Validación de bounding box de la ciudad: si la coordenada cae
 *     fuera del bbox, la descartamos (evita resultados absurdos).
 *
 * NO tiene side effects, NO toca DB, NO modifica endpoints.
 */

export interface GeoHit {
  lat: number;
  lng: number;
  /** "photon-exact" | "photon-intersection" | "nominatim-..." | etc. */
  source: string;
}

/**
 * Bounding boxes aproximados por ciudad (lat min, lat max, lng min, lng max).
 * Usados para descartar geocodificaciones que cayeron fuera de la ciudad.
 * Centroide se usa como bias para Photon.
 */
const CITY_INFO: Record<string, { bbox: [number, number, number, number]; center: [number, number] }> = {
  'barranquilla': { bbox: [10.85, 11.10, -74.95, -74.70], center: [10.9685, -74.7813] },
  'santa marta':  { bbox: [11.10, 11.30, -74.30, -74.05], center: [11.2408, -74.2099] },
  'cartagena':    { bbox: [10.30, 10.55, -75.65, -75.40], center: [10.3997, -75.5144] },
};

/** Abreviaciones colombianas → forma completa, sensitive a posición. */
function normalizeColombianAddress(raw: string): string {
  return raw
    .replace(/\bCra\.?\b/gi, 'Carrera')
    .replace(/\bKra\.?\b/gi, 'Carrera')
    .replace(/\bKr\.?\b/gi, 'Carrera')
    .replace(/\bCll\.?\b/gi, 'Calle')
    .replace(/\bCl\.?\b/gi, 'Calle')
    .replace(/\bAv\.?\b/gi, 'Avenida')
    .replace(/\bAvda\.?\b/gi, 'Avenida')
    .replace(/\bDg\.?\b/gi, 'Diagonal')
    .replace(/\bTv\.?\b/gi, 'Transversal')
    .replace(/\bTr\.?\b/gi, 'Transversal')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Genera variantes de query de la dirección, en orden de precisión esperada
 * (más específica → más genérica). NO incluye city/country todavía — eso lo
 * agrega cada motor según su sintaxis.
 */
function buildAddressVariants(address: string): string[] {
  const normalized = normalizeColombianAddress(address);
  const variants = new Set<string>();

  variants.add(normalized);

  // "Cra N #M-K" → "Cra N #M" (sin número de casa)
  const dashMatch = normalized.match(/^(.+?#\s?\d+[A-Z]?)\s?-\s?\d+/i);
  if (dashMatch) variants.add(dashMatch[1]);

  // "Carrera N #M" → intersección "Calle M con Carrera N"
  const interMatch = normalized.match(/Carrera\s+(\d+[A-Z]?)\s*#?\s*(\d+[A-Z]?)/i);
  if (interMatch) {
    variants.add(`Calle ${interMatch[2]} con Carrera ${interMatch[1]}`);
    variants.add(`Calle ${interMatch[2]} y Carrera ${interMatch[1]}`);
  }

  // "Calle N #M" → intersección "Carrera M con Calle N"
  const inverseMatch = normalized.match(/Calle\s+(\d+[A-Z]?)\s*#?\s*(\d+[A-Z]?)/i);
  if (inverseMatch) {
    variants.add(`Carrera ${inverseMatch[2]} con Calle ${inverseMatch[1]}`);
  }

  // Versión con "No." en lugar de "#"
  if (/#/.test(normalized)) {
    variants.add(normalized.replace(/#\s?/g, 'No. '));
  }

  // Última opción: limpia # y guion-número
  const cleaned = normalized.split('-')[0].replace('#', '').trim();
  if (cleaned !== normalized && cleaned.length >= 5) variants.add(cleaned);

  return Array.from(variants);
}

/** Verifica que (lat, lng) caiga dentro del bbox de la ciudad. */
function isWithinCity(lat: number, lng: number, cityKey: string): boolean {
  const info = CITY_INFO[cityKey.toLowerCase()];
  if (!info) return true; // ciudad desconocida → no validamos
  const [latMin, latMax, lngMin, lngMax] = info.bbox;
  return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}

// ─────────────────────────────────────────────────────────────────────
// MOTOR 1: PHOTON
// ─────────────────────────────────────────────────────────────────────

interface PhotonFeature {
  geometry: { coordinates: [number, number]; type: string };
  properties: { country?: string; city?: string; street?: string; name?: string };
}

async function tryPhoton(
  variant: string,
  cityLabel: string,
  cityKey: string,
): Promise<{ lat: number; lng: number } | null> {
  const info = CITY_INFO[cityKey.toLowerCase()];
  const center = info?.center;

  // Photon acepta bias con lat/lon (NO bbox estricto en el endpoint público).
  // Le pedimos resultados centrados en la ciudad con zoom alto.
  const params = new URLSearchParams({
    q: `${variant}, ${cityLabel}`,
    limit: '5',
    lang: 'es',
  });
  if (center) {
    params.set('lat', String(center[0]));
    params.set('lon', String(center[1]));
    params.set('zoom', '16');
  }

  try {
    const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
    if (!res.ok) return null;
    const data: { features?: PhotonFeature[] } = await res.json();
    const features = data.features || [];

    // Buscamos el primer feature dentro del bbox de la ciudad.
    for (const f of features) {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const lng = coords[0];
      const lat = coords[1];
      if (!isFinite(lat) || !isFinite(lng)) continue;
      if (lat === 0 && lng === 0) continue;

      // Validamos pais y ciudad cuando Photon los devuelve
      const country = (f.properties?.country || '').toLowerCase();
      if (country && !country.includes('colombia')) continue;
      if (!isWithinCity(lat, lng, cityKey)) continue;

      return { lat, lng };
    }
  } catch {
    // ignoramos error de red — caemos al siguiente motor
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// MOTOR 2: NOMINATIM (fallback)
// ─────────────────────────────────────────────────────────────────────

async function tryNominatim(
  variant: string,
  cityLabel: string,
  cityKey: string,
): Promise<{ lat: number; lng: number } | null> {
  const info = CITY_INFO[cityKey.toLowerCase()];
  const params = new URLSearchParams({
    format: 'json',
    q: `${variant}, ${cityLabel}, Colombia`,
    limit: '1',
    countrycodes: 'co',
    addressdetails: '0',
  });
  // Le pasamos el bbox de la ciudad como viewbox + bounded=1 para que
  // Nominatim NO devuelva resultados fuera del área.
  if (info) {
    const [latMin, latMax, lngMin, lngMax] = info.bbox;
    params.set('viewbox', `${lngMin},${latMax},${lngMax},${latMin}`);
    params.set('bounded', '1');
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { 'Accept-Language': 'es' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (
        isFinite(lat) && isFinite(lng) &&
        !(lat === 0 && lng === 0) &&
        isWithinCity(lat, lng, cityKey)
      ) {
        return { lat, lng };
      }
    }
  } catch {
    // ignoramos
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// CACHE COMPARTIDO (localStorage)
// ─────────────────────────────────────────────────────────────────────
// Un mismo evento puede aparecer en home, mapa principal y detalle.
// Sin cache, cada vista geocodifica la dirección por separado y golpea
// Photon/Nominatim 3 veces por la misma string. El cache vive 7 días
// para tolerar cambios eventuales en la base OSM.

const CACHE_KEY = 'vemo_geocode_cache_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

interface CacheEntry { lat: number; lng: number; source: string; ts: number; }
type CacheMap = Record<string, CacheEntry>;

function readCache(): CacheMap {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeCache(map: CacheMap) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch { /* quota llena: ignoramos */ }
}

function cacheKey(address: string, cityKey: string): string {
  return `${cityKey.toLowerCase().trim()}::${normalizeColombianAddress(address).toLowerCase()}`;
}

function getFromCache(address: string, cityKey: string): GeoHit | null {
  const map = readCache();
  const entry = map[cacheKey(address, cityKey)];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return { lat: entry.lat, lng: entry.lng, source: entry.source + '-cached' };
}

function saveToCache(address: string, cityKey: string, hit: GeoHit) {
  const map = readCache();
  map[cacheKey(address, cityKey)] = { lat: hit.lat, lng: hit.lng, source: hit.source, ts: Date.now() };
  writeCache(map);
}

// ─────────────────────────────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────────────────────────────

export async function smartGeocodeColombian(
  address: string,
  cityLabel: string = 'Barranquilla',
  cityKey: string = 'barranquilla'
): Promise<GeoHit | null> {
  if (!address || address.trim().length < 5) return null;

  // 0. Cache: si ya geocodificamos esta dirección antes, la devolvemos
  // instantáneamente sin tocar Photon ni Nominatim.
  const cached = getFromCache(address, cityKey);
  if (cached) return cached;

  const variants = buildAddressVariants(address);

  // 1. Photon (mejor fuzzy matching). Probamos cada variante.
  for (let i = 0; i < variants.length; i++) {
    const hit = await tryPhoton(variants[i], cityLabel, cityKey);
    if (hit) {
      const result: GeoHit = {
        ...hit,
        source: i === 0 ? 'photon-exact'
              : i < 3   ? 'photon-intersection'
                        : 'photon-cleaned',
      };
      saveToCache(address, cityKey, result);
      return result;
    }
  }

  // 2. Nominatim como fallback.
  for (let i = 0; i < variants.length; i++) {
    const hit = await tryNominatim(variants[i], cityLabel, cityKey);
    if (hit) {
      const result: GeoHit = {
        ...hit,
        source: i === 0 ? 'nominatim-exact'
              : i < 3   ? 'nominatim-intersection'
                        : 'nominatim-cleaned',
      };
      saveToCache(address, cityKey, result);
      return result;
    }
  }

  return null;
}
