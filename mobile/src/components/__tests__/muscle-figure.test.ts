// Muskelkarte: jede Muskelgruppe ist zu sehen, alle Flächen liegen im Körper, die Spiegelung stimmt.

import { describe, expect, test } from '@jest/globals';

import { FIGURE, mirror, OUTLINE, TOP_DOWN } from '@/components/muscle-figure';
import { MUSCLE_GROUPS } from '@/domain/exercises';

type Pt = [number, number];

/** Pfad (nur M, L, C, Z) als Punktfolge; Kurven werden in 12 Schritten abgetastet. */
function polygon(d: string): Pt[] {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? [];
  const pts: Pt[] = [];
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M' || cmd === 'L') pts.push([num(), num()]);
    else if (cmd === 'C') {
      const [x0, y0] = pts[pts.length - 1];
      const [x1, y1, x2, y2, x3, y3] = [num(), num(), num(), num(), num(), num()];
      for (let k = 1; k <= 12; k++) {
        const s = k / 12;
        const u = 1 - s;
        pts.push([u ** 3 * x0 + 3 * u * u * s * x1 + 3 * u * s * s * x2 + s ** 3 * x3, u ** 3 * y0 + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s ** 3 * y3]);
      }
    }
  }
  return pts;
}

function inside([x, y]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a];
    const [xb, yb] = poly[b];
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) hit = !hit;
  }
  return hit;
}

const body = polygon(OUTLINE);
const VIEWS = ['front', 'back', 'frontMini', 'backMini'] as const;

describe('Muskelkarte', () => {
  test('jede Muskelgruppe außer Ganzkörper hat vorne oder hinten eine Fläche (groß und klein)', () => {
    for (const [a, b] of [
      ['front', 'back'],
      ['frontMini', 'backMini'],
    ] as const) {
      const shown = new Set([...FIGURE[a], ...FIGURE[b]].map((r) => r.group));
      for (const g of MUSCLE_GROUPS) if (g !== 'ganzkoerper') expect(shown).toContain(g);
    }
  });

  test('Ganzkörper wird als Umriss gezeigt, nicht als Fläche', () => {
    for (const v of VIEWS) expect(FIGURE[v].map((r) => r.group)).not.toContain('ganzkoerper');
    expect(TOP_DOWN.ganzkoerper).toBeGreaterThan(Math.max(...Object.values(TOP_DOWN).filter((n) => n < TOP_DOWN.ganzkoerper)));
  });

  test('alle Muskelflächen liegen innerhalb des Körperumrisses', () => {
    const outside: string[] = [];
    for (const v of VIEWS)
      for (const r of FIGURE[v])
        for (const d of r.paths) for (const p of polygon(d)) if (!inside(p, body)) outside.push(`${v}/${r.group}: ${p.map((n) => n.toFixed(1)).join(' ')}`);
    expect(outside).toEqual([]);
  });

  test('der Umriss ist ein geschlossener, symmetrischer Pfad', () => {
    expect(OUTLINE.startsWith('M50 ')).toBe(true);
    expect(OUTLINE.trim().endsWith('Z')).toBe(true);
    // Jeder Punkt hat sein Spiegelbild im Umriss (linke und rechte Hälfte gleich).
    const gap = ([x, y]: Pt) => Math.min(...body.map(([u, v]) => Math.hypot(u - (100 - x), v - y)));
    expect(Math.max(...body.map(gap))).toBeLessThan(0.02);
  });

  test('Spiegeln zweimal ergibt wieder den Pfad', () => {
    const d = 'M10 20 C11.5 22 13 24 15 26 L20 30 Z';
    const back = mirror(mirror(d))
      .match(/-?\d*\.?\d+/g)!
      .map(Number);
    expect(back).toEqual(d.match(/-?\d*\.?\d+/g)!.map(Number));
  });
});
