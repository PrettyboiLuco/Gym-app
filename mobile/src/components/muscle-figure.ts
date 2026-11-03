import { FEMALE_BACK, FEMALE_FRONT, MALE_BACK, MALE_FRONT, type ArtView } from '@/components/body-art';
import type { MuscleGroup } from '@/domain/exercises';
import type { MapMuscle } from '@/domain/muscle-map';

/**
 * Zeichnung der Muskelkarte: männliche und weibliche Figur, vorne und hinten, aus den Körperzeichnungen in
 * `body-art.ts` (react-native-body-highlighter, MIT). Hier steht, welches Körperteil der Zeichnung welche unserer
 * Kartenmuskeln zeigt, dazu das Antippen (Treffer über die abgetasteten Umrisse) und die Reihen für den Versatz.
 */

export type Pt = [number, number];

// ------------------------------------------------------------------------------------ Pfade lesen

/** Liest einen SVG-Pfad Zeichen für Zeichen: Befehle, Zahlen und Bogen-Merker (eine Ziffer, oft ohne Trennzeichen). */
class Scanner {
  private i = 0;
  constructor(private readonly d: string) {}
  private skip() {
    while (this.i < this.d.length && /[\s,]/.test(this.d[this.i])) this.i++;
  }
  /** Nächster Befehlsbuchstabe oder null, wenn eine Zahl folgt (Wiederholung des letzten Befehls). */
  command(): string | null {
    this.skip();
    const ch = this.d[this.i];
    if (ch && /[A-Za-z]/.test(ch)) {
      this.i++;
      return ch;
    }
    return null;
  }
  done(): boolean {
    this.skip();
    return this.i >= this.d.length;
  }
  number(): number {
    this.skip();
    const m = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(this.d.slice(this.i));
    if (!m) throw new Error(`Zahl erwartet bei ${this.i}`);
    this.i += m[0].length;
    return Number(m[0]);
  }
  flag(): number {
    this.skip();
    const ch = this.d[this.i++];
    if (ch !== '0' && ch !== '1') throw new Error(`Merker erwartet bei ${this.i - 1}`);
    return Number(ch);
  }
}

/**
 * Pfad als Umrisse in absoluten Koordinaten: Kurven in 8 Schritten abgetastet, Bögen als Strecke zum Endpunkt (in
 * diesen Zeichnungen nur kleine Rundungen). Ein Pfad kann mehrere Teilflächen haben (mehrere M).
 */
export function polygons(d: string): Pt[][] {
  const sc = new Scanner(d);
  const polys: Pt[][] = [];
  let cur: Pt[] = [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let lastCtrl: Pt | null = null;
  let lastQ: Pt | null = null;
  let cmd = '';
  const sample = (f: (t: number) => Pt) => {
    for (let k = 1; k <= 8; k++) cur.push(f(k / 8));
  };
  while (!sc.done()) {
    const next = sc.command();
    if (next) cmd = next;
    else if (cmd === 'M') cmd = 'L';
    else if (cmd === 'm') cmd = 'l';
    const rel = cmd === cmd.toLowerCase();
    const c = cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    let ctrl: Pt | null = null;
    let q: Pt | null = null;
    if (c === 'z') {
      if (cur.length) polys.push(cur);
      cur = [];
      [x, y] = [sx, sy];
    } else if (c === 'm') {
      if (cur.length) polys.push(cur);
      x = ox + sc.number();
      y = oy + sc.number();
      [sx, sy] = [x, y];
      cur = [[x, y]];
    } else if (c === 'l') {
      x = ox + sc.number();
      y = oy + sc.number();
      cur.push([x, y]);
    } else if (c === 'h') {
      x = ox + sc.number();
      cur.push([x, y]);
    } else if (c === 'v') {
      y = oy + sc.number();
      cur.push([x, y]);
    } else if (c === 'c' || c === 's') {
      const p1: Pt = c === 'c' ? [ox + sc.number(), oy + sc.number()] : lastCtrl ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y];
      const p2: Pt = [ox + sc.number(), oy + sc.number()];
      const p3: Pt = [ox + sc.number(), oy + sc.number()];
      const [x0, y0] = [x, y];
      sample((t) => {
        const u = 1 - t;
        return [
          u * u * u * x0 + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * y0 + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ];
      });
      [x, y] = p3;
      ctrl = p2;
    } else if (c === 'q' || c === 't') {
      const p1: Pt = c === 'q' ? [ox + sc.number(), oy + sc.number()] : lastQ ? [2 * x - lastQ[0], 2 * y - lastQ[1]] : [x, y];
      const p2: Pt = [ox + sc.number(), oy + sc.number()];
      const [x0, y0] = [x, y];
      sample((t) => {
        const u = 1 - t;
        return [u * u * x0 + 2 * u * t * p1[0] + t * t * p2[0], u * u * y0 + 2 * u * t * p1[1] + t * t * p2[1]];
      });
      [x, y] = p2;
      q = p1;
    } else if (c === 'a') {
      sc.number(); // Radius x
      sc.number(); // Radius y
      sc.number(); // Drehung
      sc.flag(); // großer Bogen
      sc.flag(); // Richtung
      x = ox + sc.number();
      y = oy + sc.number();
      cur.push([x, y]);
    } else {
      throw new Error(`Unbekannter Pfadbefehl ${cmd}`);
    }
    lastCtrl = ctrl;
    lastQ = q;
  }
  if (cur.length) polys.push(cur);
  return polys;
}

// ------------------------------------------------------------------------------------ Körperteile → Kartenmuskeln

/**
 * Welche Kartenmuskeln ein Körperteil der Zeichnung zeigt, und zu welcher Muskelgruppe es gehört (kleine Karte,
 * geschonte Bereiche). Die Zeichnung ist gröber als unsere 24 Muskeln: die Brust ist eine Fläche, der Sägemuskel liegt
 * in den seitlichen Bauchstreifen, die Rotatoren im oberen Rücken. Die Liste unter der Karte zeigt die Feinheiten.
 */
type PartMap = { group: MuscleGroup; muscles: MapMuscle[] };

const FRONT_PARTS: Record<string, PartMap> = {
  chest: { group: 'brust', muscles: ['brust_mitte', 'brust_oben', 'brust_unten'] },
  obliques: { group: 'bauch', muscles: ['bauch_schraeg', 'saegemuskel'] },
  abs: { group: 'bauch', muscles: ['bauch_gerade'] },
  biceps: { group: 'arme', muscles: ['bizeps'] },
  triceps: { group: 'arme', muscles: ['trizeps'] },
  forearm: { group: 'arme', muscles: ['unterarme'] },
  neck: { group: 'nacken', muscles: ['nacken'] },
  trapezius: { group: 'nacken', muscles: ['nacken'] },
  deltoids: { group: 'schultern', muscles: ['schulter_vorn', 'schulter_seitlich'] },
  adductors: { group: 'huefte', muscles: ['adduktoren', 'hueftbeuger'] },
  quadriceps: { group: 'beine', muscles: ['quadrizeps'] },
  calves: { group: 'waden', muscles: ['waden'] },
};

const BACK_PARTS: Record<string, PartMap> = {
  neck: { group: 'nacken', muscles: ['nacken'] },
  trapezius: { group: 'nacken', muscles: ['nacken', 'oberer_ruecken'] },
  deltoids: { group: 'schultern', muscles: ['schulter_hinten', 'schulter_seitlich'] },
  'upper-back': { group: 'ruecken', muscles: ['lat', 'oberer_ruecken', 'rotatoren'] },
  'lower-back': { group: 'ruecken', muscles: ['unterer_ruecken'] },
  triceps: { group: 'arme', muscles: ['trizeps'] },
  forearm: { group: 'arme', muscles: ['unterarme'] },
  gluteal: { group: 'gesaess', muscles: ['gesaess', 'abduktoren'] },
  adductors: { group: 'huefte', muscles: ['adduktoren'] },
  hamstring: { group: 'beine', muscles: ['beinbeuger'] },
  calves: { group: 'waden', muscles: ['waden'] },
};

/** Teile ohne Daten (Kopf, Haar, Hände, Füße, Knie …): Körperton bzw. Haarfarbe. */
export type BasePart = { hair: boolean; paths: string[] };

/**
 * Eine Fläche der Karte: Körperteil der Zeichnung mit Gruppe und den Kartenmuskeln, die es zeigt; abgetastete Umrisse
 * für das Antippen und die Reihe von oben (0–9) für den Versatz beim Überblenden.
 */
export type Region = { key: string; group: MuscleGroup; muscles: MapMuscle[]; paths: string[]; polys: Pt[][]; row: number };

/** Eine Ansicht: viewBox der Zeichnung, Flächen mit Daten und Teile ohne Daten (in Zeichenreihenfolge). */
export type FigureView = { viewBox: string; box: { x: number; y: number; w: number; h: number }; regions: Region[]; base: BasePart[] };

function view(art: ArtView, map: Record<string, PartMap>): FigureView {
  const [x, y, w, h] = art.viewBox.split(' ').map(Number);
  const regions: Region[] = [];
  const base: BasePart[] = [];
  for (const part of art.parts) {
    const m = map[part.slug];
    if (!m) {
      base.push({ hair: part.slug === 'hair', paths: part.paths });
      continue;
    }
    const polys = part.paths.flatMap(polygons);
    const ys = polys.flat().map(([, py]) => py);
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    const row = Math.min(9, Math.max(0, Math.round(((cy - y) / h) * 9)));
    regions.push({ key: part.slug, group: m.group, muscles: m.muscles, paths: part.paths, polys, row });
  }
  return { viewBox: art.viewBox, box: { x, y, w, h }, regions, base };
}

// ------------------------------------------------------------------------------------ Körperformen

export const BODIES_LIST = ['m', 'w'] as const;
export type Body = (typeof BODIES_LIST)[number];
export type BodySet = { front: FigureView; back: FigureView };

export const BODIES: Record<Body, BodySet> = {
  m: { front: view(MALE_FRONT, FRONT_PARTS), back: view(MALE_BACK, BACK_PARTS) },
  w: { front: view(FEMALE_FRONT, FRONT_PARTS), back: view(FEMALE_BACK, BACK_PARTS) },
};

/** Liegt ein Muskel vorne, hinten oder auf beiden Seiten? (Für die Einzelansicht.) */
export function sidesOf(muscle: MapMuscle): ('front' | 'back')[] {
  const out: ('front' | 'back')[] = [];
  if (BODIES.m.front.regions.some((r) => r.muscles.includes(muscle))) out.push('front');
  if (BODIES.m.back.regions.some((r) => r.muscles.includes(muscle))) out.push('back');
  return out;
}

// ------------------------------------------------------------------------------------ Antippen

function inside([x, y]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a];
    const [xb, yb] = poly[b];
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) hit = !hit;
  }
  return hit;
}

function distance([x, y]: Pt, poly: Pt[]): number {
  let best = Infinity;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[b];
    const [xb, yb] = poly[a];
    const dx = xb - xa;
    const dy = yb - ya;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - xa) * dx + (y - ya) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(x - (xa + t * dx), y - (ya + t * dy)));
  }
  return best;
}

/** Fangradius als Anteil der Bildhöhe (≈ 7 px in der Statistik). */
export const HIT_RADIUS = 0.027;

/**
 * Welche Fläche liegt unter dem Finger? Punkt in Zeichnungs-Koordinaten. Zuerst die Fläche, die ihn enthält (die
 * zuletzt gezeichnete gewinnt), sonst die nächste im Fangradius, sonst keine.
 */
export function hitTest(v: FigureView, x: number, y: number, radius = HIT_RADIUS): Region | null {
  const p: Pt = [x, y];
  for (let i = v.regions.length - 1; i >= 0; i--) if (v.regions[i].polys.some((poly) => inside(p, poly))) return v.regions[i];
  let best: Region | null = null;
  let bestDist = radius * v.box.h;
  for (const r of v.regions)
    for (const poly of r.polys) {
      const d = distance(p, poly);
      if (d <= bestDist) {
        bestDist = d;
        best = r;
      }
    }
  return best;
}

/**
 * Tipp-Position im Bild (Pixel) → Zeichnungs-Koordinaten. Die Zeichnung ist mittig eingepasst (preserveAspectRatio
 * „xMidYMid meet“), daher Maßstab und Rand wie beim Zeichnen.
 */
export function toArt(v: FigureView, width: number, height: number, px: number, py: number): Pt {
  const s = Math.min(width / v.box.w, height / v.box.h);
  const dx = (width - v.box.w * s) / 2;
  const dy = (height - v.box.h * s) / 2;
  return [v.box.x + (px - dx) / s, v.box.y + (py - dy) / s];
}
