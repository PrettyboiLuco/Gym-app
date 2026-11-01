// Kleine Rechenhilfen, damit Mittelwert und Runden überall gleich funktionieren.

/** Mittelwert; leere Liste → null (nie 0, damit „keine Daten“ sichtbar bleibt). */
export function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

/** Auf ein Vielfaches runden, z. B. roundTo(2_963, 50) → 2_950. */
export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Auf Nachkommastellen runden, z. B. roundDigits(1.2345, 2) → 1.23. */
export function roundDigits(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
