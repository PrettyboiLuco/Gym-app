// Runde Rasterwerte für Diagramme (taste-skill: 3–5 Linien, runde Schritte, oberster Wert über dem Maximum).

/** Runde Rasterwerte (Schritt 1/2/2,5/5 × 10ⁿ), 3–5 Linien, oberster Wert über dem Maximum. */
export function niceTicks(min: number, max: number): number[] {
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.02, 1);
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => (max - min) / s <= 4) ?? 10 * pow;
  const first = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = first; v < max + step * 0.999; v += step) ticks.push(Math.round(v * 1000) / 1000);
  if (ticks[ticks.length - 1] <= max) ticks.push(Math.round((ticks[ticks.length - 1] + step) * 1000) / 1000);
  return ticks;
}
