// Open Food Facts (Register FOOD-001–008).
// - Nur auf ausdrückliche Aktion (Scan oder „Online suchen“), nie bei jedem Tastendruck.
// - Eigene Grenzen unterhalb der dokumentierten Limits (15 Produkt- / 10 Suchabfragen pro Minute).
// - Es wird nur der Barcode bzw. der Suchbegriff gesendet, keine Tagebuchdaten.
// - Daten: Open Food Facts, ODbL; Hinweis steht in der App (Mehr → Datenquellen).
// HINWEIS: Antwortformate sind gegen die Dokumentation des Plans geschrieben, aber noch nicht gegen
// die Live-API getestet (Netzwerk der Entwicklungsumgebung gesperrt). Erster echter Test: iPhone.

import { normalizeOffProduct, type FoodDraft } from '@/domain/nutrition';

const BASE = 'https://world.openfoodfacts.org';
const SEARCH_BASE = 'https://search.openfoodfacts.org';
// Eigene App-Kennung (FOOD-006). Vor Veröffentlichung um Kontaktadresse ergänzen.
const USER_AGENT = 'GymApp/0.1 (Expo; Entwicklung)';
const FIELDS = [
  'code',
  'product_name',
  'product_name_de',
  'generic_name',
  'generic_name_de',
  'brands',
  'product_quantity_unit',
  'serving_quantity',
  'nutriments',
].join(',');

export type OffError = 'offline' | 'notFound' | 'rateLimited' | 'unavailable' | 'invalid';
export type OffResult<T> = { ok: true; value: T } | { ok: false; error: OffError };

/** Gleitendes Fenster: höchstens `max` Anfragen pro Minute. */
function limiter(max: number) {
  const calls: number[] = [];
  return (now: number) => {
    while (calls.length && now - calls[0] > 60_000) calls.shift();
    if (calls.length >= max) return false;
    calls.push(now);
    return true;
  };
}
const productLimit = limiter(12);
const searchLimit = limiter(8);

async function getJson(url: string): Promise<OffResult<unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: controller.signal });
    if (res.status === 429) return { ok: false, error: 'rateLimited' };
    if (res.status === 404) {
      // v3 meldet „nicht gefunden“ mit 404 und JSON-Inhalt.
      return { ok: true, value: await res.json().catch(() => ({ status: 'failure' })) };
    }
    if (res.status >= 500) return { ok: false, error: 'unavailable' };
    if (!res.ok) return { ok: false, error: 'invalid' };
    return { ok: true, value: await res.json() };
  } catch {
    return { ok: false, error: 'offline' };
  } finally {
    clearTimeout(timeout);
  }
}

/** Produkt per Barcode (API v3). */
export async function fetchProduct(barcode: string): Promise<OffResult<FoodDraft>> {
  if (!productLimit(Date.now())) return { ok: false, error: 'rateLimited' };
  const res = await getJson(`${BASE}/api/v3/product/${encodeURIComponent(barcode)}?fields=${FIELDS}`);
  if (!res.ok) return res;
  const draft = normalizeOffProduct(res.value, barcode);
  if (!draft) return { ok: false, error: 'notFound' };
  return { ok: true, value: draft };
}

/**
 * Textsuche. Die Suchschnittstelle ist laut Plan getrennt von der Produkt-API zu behandeln
 * (FOOD-007); erster Versuch: search.openfoodfacts.org, Fallback: klassische Suche.
 */
export async function searchProducts(query: string): Promise<OffResult<FoodDraft[]>> {
  if (!searchLimit(Date.now())) return { ok: false, error: 'rateLimited' };
  const q = encodeURIComponent(query.trim());
  const primary = await getJson(`${SEARCH_BASE}/search?q=${q}&page_size=20&langs=de,en&fields=${FIELDS}`);
  let hits = primary.ok ? extractHits(primary.value) : null;
  if (!hits) {
    const fallback = await getJson(
      `${BASE}/cgi/search.pl?search_terms=${q}&search_simple=1&json=1&page_size=20&fields=${FIELDS}`
    );
    if (!fallback.ok) return fallback;
    hits = extractHits(fallback.value);
  }
  if (!hits) return { ok: false, error: 'invalid' };
  const drafts = hits
    .map((product) => normalizeOffProduct({ product }, typeof product.code === 'string' ? product.code : ''))
    .filter((d): d is FoodDraft => d !== null && d.name.length > 0);
  return { ok: true, value: drafts };
}

function extractHits(value: unknown): Record<string, unknown>[] | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const list = Array.isArray(v.hits) ? v.hits : Array.isArray(v.products) ? v.products : null;
  return list ? (list.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]) : null;
}
