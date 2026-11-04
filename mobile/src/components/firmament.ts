// Lichtschein „Firmament“ (getlayers.ai) als Verlauf: Farben und Lichtkurve des Shaders, als Stopps für einen SVG-Verlauf.

/**
 * CONFIG-Werte eines Firmament-Rolls. Der Shader läuft in der App nicht; nachgebaut wird seine Rampe `ramp4(t)` mit der
 * Helligkeit `t = (1 - d)^curve` über den Abstand d vom Lichtpunkt (unten Mitte, `horizon` unter der Kante).
 */
export type FirmamentParams = {
  bgColor: string;
  colorA: string;
  colorB: string;
  colorC: string;
  colorD: string;
  horizon: number;
  curve: number;
  glow: number;
  vignette: number;
  breathe: number;
  speed: number;
};

/** Roll firmament-004 (dunkel), Wahl Luc 04.11.2026 – siehe getlayers.json. */
export const FIRMAMENT_DARK: FirmamentParams = {
  bgColor: '#020603',
  colorA: '#0b2b12',
  colorB: '#2f7a28',
  colorC: '#7fd93f',
  colorD: '#eaffd6',
  horizon: 0.16,
  curve: 2.2,
  glow: 0.55,
  vignette: 0.45,
  breathe: 0.06,
  speed: 0.33,
};

/**
 * Roll firmament-018 (hell): nur B, C, D sind festgelegt; A = B, damit der Rand nicht ins Dunkle kippt. Kern sehr zart
 * (≤ 0.35) und ohne dunkle Vignette – im Hellmodus wird nie ein dunkler Ton gemischt.
 */
export const FIRMAMENT_LIGHT: FirmamentParams = {
  ...FIRMAMENT_DARK,
  bgColor: '#FFFFFF',
  colorA: '#8fa96b',
  colorB: '#8fa96b',
  colorC: '#c9d6a8',
  colorD: '#f5f3e4',
  glow: 0.35,
  vignette: 0,
};

/** Abstände der Stopps vom Lichtpunkt (0 = Kern, 1 = Rand der Ellipse). */
export const GLOW_DISTANCES = [0, 0.12, 0.25, 0.4, 0.6, 1] as const;

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function hex([r, g, b]: Rgb): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.min(Math.max(v, 0), 255))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const k = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return k * k * (3 - 2 * k);
}

const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** Farbrampe des Shaders: A→B bei t 0–0.36, B→C bei 0.32–0.70, C→D bei 0.66–1.0 (weiche Übergänge). */
export function ramp4(p: FirmamentParams, t: number): string {
  let c = mix(rgb(p.colorA), rgb(p.colorB), smoothstep(0, 0.36, t));
  c = mix(c, rgb(p.colorC), smoothstep(0.32, 0.7, t));
  c = mix(c, rgb(p.colorD), smoothstep(0.66, 1, t));
  return hex(c);
}

export type GlowStop = { offset: number; color: string; opacity: number };

/** Stopps des Lichtscheins: Farbe aus der Rampe, Deckkraft = glow · t (Kern = glow, Rand = 0). */
export function firmamentStops(p: FirmamentParams, distances: readonly number[] = GLOW_DISTANCES): GlowStop[] {
  return distances.map((d) => {
    const t = Math.pow(1 - Math.min(Math.max(d, 0), 1), p.curve);
    return { offset: d, color: ramp4(p, t), opacity: Math.round(p.glow * t * 1000) / 1000 };
  });
}

/** Lichtpunkt in Anteilen der Fläche: unten Mitte, um horizon · 0.5 unter der Kante. */
export function glowCenter(p: FirmamentParams): { cx: number; cy: number } {
  return { cx: 0.5, cy: 1 + p.horizon * 0.5 };
}

/** Atmen: eine volle Schwingung dauert 2π/speed Sekunden (≈ 19 s bei 0.33). */
export function breathPeriodMs(p: FirmamentParams): number {
  return Math.round(((2 * Math.PI) / p.speed) * 1000);
}
