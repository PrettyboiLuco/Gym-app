// Prüft die eigene Logik der Open-Food-Facts-Anbindung mit nachgestellten Antworten.
// Ob die Live-API genau so antwortet, ist damit NICHT bewiesen (Test auf dem iPhone).

import { afterEach, describe, expect, jest, test } from '@jest/globals';

type FetchMock = jest.Mock<(url: string, init?: unknown) => Promise<Response>>;

function respond(status: number, body: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

function loadOff(mock: FetchMock): typeof import('../off') {
  (globalThis as { fetch: unknown }).fetch = mock;
  let mod: typeof import('../off') | undefined;
  // Frisches Modul pro Test, damit die eigenen Abfragegrenzen nicht zwischen Tests geteilt werden.
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolierter Modul-Neuladen im Test
    mod = require('../off');
  });
  return mod!;
}

afterEach(() => {
  jest.restoreAllMocks();
});

const product = {
  status: 'success',
  product: { product_name: 'Haferflocken', brands: 'X', nutriments: { 'energy-kcal_100g': 370, proteins_100g: 13 } },
};

describe('Produkt per Barcode', () => {
  test('gefunden: Entwurf mit Werten, unbekannte bleiben unbekannt', async () => {
    const fetchMock: FetchMock = jest.fn(async () => respond(200, product));
    const off = await loadOff(fetchMock);
    const res = await off.fetchProduct('4000000000001');
    expect(res).toEqual({
      ok: true,
      value: expect.objectContaining({ name: 'Haferflocken', per100: { kcal: 370, protein: 13, carbs: null, fat: null } }),
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toContain('/api/v3/product/4000000000001');
    expect(init.headers['User-Agent']).toMatch(/^GymApp\//);
  });
  test('nicht gefunden (404 mit JSON)', async () => {
    const off = await loadOff(jest.fn(async () => respond(404, { status: 'failure', product: null })) as FetchMock);
    expect(await off.fetchProduct('1')).toEqual({ ok: false, error: 'notFound' });
  });
  test('429 wird als Limit gemeldet', async () => {
    const off = await loadOff(jest.fn(async () => respond(429, {})) as FetchMock);
    expect(await off.fetchProduct('1')).toEqual({ ok: false, error: 'rateLimited' });
  });
  test('503 wird als nicht verfügbar gemeldet', async () => {
    const off = await loadOff(jest.fn(async () => respond(503, {})) as FetchMock);
    expect(await off.fetchProduct('1')).toEqual({ ok: false, error: 'unavailable' });
  });
  test('kein Netz', async () => {
    const off = await loadOff(jest.fn(async () => {
      throw new Error('network');
    }) as FetchMock);
    expect(await off.fetchProduct('1')).toEqual({ ok: false, error: 'offline' });
  });
  test('eigene Grenze: höchstens 12 Abfragen pro Minute', async () => {
    const fetchMock: FetchMock = jest.fn(async () => respond(200, product));
    const off = await loadOff(fetchMock);
    for (let i = 0; i < 12; i++) await off.fetchProduct(String(i));
    expect(await off.fetchProduct('13')).toEqual({ ok: false, error: 'rateLimited' });
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });
});

describe('Textsuche', () => {
  test('Treffer aus der neuen Suche (hits)', async () => {
    const off = await loadOff(jest.fn(async () => respond(200, { hits: [{ code: '1', ...product.product }] })) as FetchMock);
    const res = await off.searchProducts('hafer');
    expect(res.ok && res.value.map((d) => d.name)).toEqual(['Haferflocken']);
  });
  test('Ausweichen auf klassische Suche (products)', async () => {
    const fetchMock: FetchMock = jest.fn(async (url: string) =>
      url.includes('search.openfoodfacts.org') ? respond(500, {}) : respond(200, { products: [{ code: '2', ...product.product }] })
    );
    const off = await loadOff(fetchMock);
    const res = await off.searchProducts('hafer');
    expect(res.ok && res.value[0].barcode).toBe('2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
