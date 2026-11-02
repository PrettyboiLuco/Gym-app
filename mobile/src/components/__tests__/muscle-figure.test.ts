// Muskelkarte (Zeichnungen aus body-art.ts): jeder Muskel hat eine Fläche, die Pfade lassen sich lesen, Antippen trifft.

import { describe, expect, test } from '@jest/globals';

import { FEMALE_BACK, FEMALE_FRONT, MALE_BACK, MALE_FRONT } from '@/components/body-art';
import { BODIES, BODIES_LIST, hitTest, polygons, sidesOf, toArt, type FigureView, type Pt } from '@/components/muscle-figure';
import { MUSCLE_GROUPS } from '@/domain/exercises';
import { MAP_GROUP, MAP_MUSCLES } from '@/domain/muscle-map';

/** Ein Punkt sicher im Inneren einer Fläche: Mitte der Begrenzung ihres größten Umrisses, geprüft per Treffer. */
function centerOf(v: FigureView, key: string): Pt {
  const r = v.regions.find((x) => x.key === key)!;
  const poly = [...r.polys].sort((a, b) => b.length - a.length)[0];
  const xs = poly.map(([x]) => x);
  const ys = poly.map(([, y]) => y);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

describe('Zeichnungen', () => {
  test('alle Pfade lassen sich lesen und ergeben Flächen innerhalb der Bildfläche', () => {
    for (const art of [MALE_FRONT, MALE_BACK, FEMALE_FRONT, FEMALE_BACK]) {
      const [x, y, w, h] = art.viewBox.split(' ').map(Number);
      for (const part of art.parts)
        for (const d of part.paths) {
          const polys = polygons(d);
          expect(polys.length).toBeGreaterThan(0);
          for (const [px, py] of polys.flat()) {
            expect(px).toBeGreaterThanOrEqual(x - 1);
            expect(px).toBeLessThanOrEqual(x + w + 1);
            expect(py).toBeGreaterThanOrEqual(y - 1);
            expect(py).toBeLessThanOrEqual(y + h + 1);
          }
        }
    }
  });

  test('jeder Kartenmuskel hat in beiden Körperformen vorne oder hinten eine Fläche', () => {
    for (const b of BODIES_LIST) {
      const shown = new Set([...BODIES[b].front.regions, ...BODIES[b].back.regions].flatMap((r) => r.muscles));
      for (const m of MAP_MUSCLES) expect(shown).toContain(m);
    }
  });

  test('jede Muskelgruppe außer Ganzkörper hat eine Fläche (kleine Karte, geschonte Bereiche)', () => {
    for (const b of BODIES_LIST) {
      const groups = new Set([...BODIES[b].front.regions, ...BODIES[b].back.regions].map((r) => r.group));
      for (const g of MUSCLE_GROUPS) if (g !== 'ganzkoerper') expect(groups).toContain(g);
    }
  });

  test('die Muskeln einer Fläche gehören zu ihrer Gruppe (bis auf bewusste Ausnahmen)', () => {
    // Trapez hinten zeigt auch den oberen Rücken, Gesäß die Abduktoren, die seitlichen Bauchstreifen den Sägemuskel,
    // die Adduktoren den Hüftbeuger, der obere Rücken die Rotatoren (Schulterblatt).
    const allowed = new Set(['trapezius', 'gluteal', 'obliques', 'adductors', 'upper-back']);
    for (const b of BODIES_LIST)
      for (const v of [BODIES[b].front, BODIES[b].back])
        for (const r of v.regions) if (!allowed.has(r.key)) for (const m of r.muscles) expect(`${r.key}:${MAP_GROUP[m]}`).toBe(`${r.key}:${r.group}`);
  });

  test('beide Körperformen haben dieselben Flächen mit Daten', () => {
    const keys = (b: 'm' | 'w', s: 'front' | 'back') => BODIES[b][s].regions.map((r) => r.key).sort();
    expect(keys('w', 'front')).toEqual(keys('m', 'front'));
    expect(keys('w', 'back')).toEqual(keys('m', 'back'));
  });

  test('Reihen laufen von oben nach unten', () => {
    const row = (k: string) => BODIES.m.front.regions.find((r) => r.key === k)!.row;
    expect(row('neck')).toBeLessThan(row('abs'));
    expect(row('abs')).toBeLessThan(row('quadriceps'));
    expect(row('quadriceps')).toBeLessThan(row('calves'));
  });
});

describe('Pfade lesen', () => {
  test('relative Befehle, Kurzformen und Bögen mit zusammengeschriebenen Merkern', () => {
    const [poly] = polygons('M10 10h5v5l-5 0z');
    expect(poly[0]).toEqual([10, 10]);
    expect(poly).toContainEqual([15, 10]);
    expect(poly).toContainEqual([15, 15]);
    // „a1.71 1.71 0 012.89 1.12“: Merker 0 und 1, Endpunkt relativ (2.89, 1.12)
    const [arc] = polygons('M0 0a1.71 1.71 0 012.89 1.12z');
    const end = arc[arc.length - 1];
    expect(end[0]).toBeCloseTo(2.89);
    expect(end[1]).toBeCloseTo(1.12);
  });

  test('Kurven werden abgetastet und enden am Zielpunkt', () => {
    const [poly] = polygons('M0 0c10 0 10 10 20 10q5 5 10 0');
    expect(poly.length).toBe(1 + 8 + 8);
    expect(poly[8][0]).toBeCloseTo(20);
    expect(poly[16][0]).toBeCloseTo(30);
  });
});

describe('Antippen', () => {
  test('die Mitte einer Fläche trifft sie – in beiden Körperformen', () => {
    for (const b of BODIES_LIST) {
      for (const key of ['chest', 'abs', 'quadriceps', 'biceps'] as const) {
        const [x, y] = centerOf(BODIES[b].front, key);
        expect(hitTest(BODIES[b].front, x, y)?.key).toBe(key);
      }
      for (const key of ['gluteal', 'upper-back', 'hamstring'] as const) {
        const [x, y] = centerOf(BODIES[b].back, key);
        expect(hitTest(BODIES[b].back, x, y)?.key).toBe(key);
      }
    }
  });

  test('weit daneben trifft nichts', () => {
    const v = BODIES.m.front;
    expect(hitTest(v, v.box.x + 5, v.box.y + 5)).toBeNull();
  });

  test('Bildpunkte werden wie beim Zeichnen eingepasst', () => {
    const v = BODIES.m.front; // 724 × 1448
    // Bild 124 × 265: Maßstab 124/724, oben und unten je ein schmaler Rand
    const [x, y] = toArt(v, 124, 265, 62, 132.5);
    expect(x).toBeCloseTo(362);
    expect(y).toBeCloseTo(724);
  });

  test('Seiten eines Muskels', () => {
    expect(sidesOf('bizeps')).toEqual(['front']);
    expect(sidesOf('lat')).toEqual(['back']);
    expect(sidesOf('waden')).toEqual(['front', 'back']);
  });
});
