import { environment } from '../../environments/environment';

/**
 * Mapa base oscuro. Usa CARTO dark_all con la API key que entrega el backend
 * (variable CARTO_API_KEY en Render). Si no hay key o el backend no responde,
 * cae a Esri World Dark Gray, que no requiere key.
 */
let cartoKeyPromise: Promise<string | null> | null = null;

function getCartoKey(): Promise<string | null> {
  cartoKeyPromise ??= fetch(`${environment.apiUrl}/api/config/public`)
    .then(r => (r.ok ? r.json() : null))
    .then(cfg => cfg?.cartoApiKey || null)
    .catch(() => null);
  return cartoKeyPromise;
}

export async function addDarkBasemap(L: any, map: any, maxZoom = 20): Promise<void> {
  const key = await getCartoKey();
  if (!map.getContainer()?.isConnected) return; // el mapa se destruyó mientras esperábamos
  if (key) {
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${key}`, {
      attribution: '&copy; CARTO',
      maxZoom
    }).addTo(map);
    return;
  }
  const esri = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas';
  const opts = { maxZoom, maxNativeZoom: 16 };
  L.tileLayer(`${esri}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
    ...opts,
    attribution: 'Tiles &copy; Esri'
  }).addTo(map);
  L.tileLayer(`${esri}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, opts).addTo(map);
}
