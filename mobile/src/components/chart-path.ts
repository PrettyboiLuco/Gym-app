// Geometrie für Verlaufsdiagramme: weiche Kurve ohne Überschwingen und der nächstgelegene Punkt zu einem Finger.

export type XY = [number, number];

/**
 * Weiche Kurve durch alle Punkte (monotone kubische Interpolation nach Fritsch–Carlson): Die Linie schwingt nie über
 * einen Messwert hinaus – ein Tief bleibt ein Tief, es entstehen keine erfundenen Spitzen zwischen zwei Tagen.
 * Punkte müssen nach x aufsteigend sortiert sein. Gibt einen SVG-Pfad zurück („M … C …“).
 */
export function monotonePath(points: XY[]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${f(points[0][0])} ${f(points[0][1])}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1][0] - points[i][0]);
    slope.push(dx[i] === 0 ? 0 : (points[i + 1][1] - points[i][1]) / dx[i]);
  }
  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  tangent.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      tangent[i] = k * a * slope[i];
      tangent[i + 1] = k * b * slope[i];
    }
  }
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const h = dx[i] / 3;
    d += ` C${f(x0 + h)} ${f(y0 + tangent[i] * h)} ${f(x1 - h)} ${f(y1 - tangent[i + 1] * h)} ${f(x1)} ${f(y1)}`;
  }
  return d;
}

/** Ungefähre Länge der Kurve (Summe der Abstände, leicht aufgerundet) – für das Einzeichnen per Strichversatz. */
export function approxLength(points: XY[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return Math.ceil(len * 1.08) + 2;
}

/** Index des Punkts, dessen x am nächsten an `x` liegt (Punkte nach x sortiert); -1 ohne Punkte. */
export function nearestIndex(xs: number[], x: number): number {
  if (xs.length === 0) return -1;
  let best = 0;
  for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i;
  return best;
}

/** Drei runde Werte für die y-Achse, die den Bereich [lo, hi] einschließen (z. B. 91, 91.5, 92). */
export function axisTicks(lo: number, hi: number): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [];
  if (hi - lo < 0.2) {
    lo -= 0.5;
    hi += 0.5;
  }
  const raw = (hi - lo) / 2;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.floor(lo / step) * step;
  const ticks = [start, start + step, start + 2 * step];
  while (ticks[ticks.length - 1] < hi - 1e-9) ticks.push(ticks[ticks.length - 1] + step);
  return ticks.map((v) => Math.round(v * 1000) / 1000);
}

const f = (v: number) => (Math.round(v * 10) / 10).toString();
