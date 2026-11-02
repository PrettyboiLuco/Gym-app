import type { MuscleGroup } from '@/domain/exercises';
import { MAP_GROUP, type MapMuscle } from '@/domain/muscle-map';

/**
 * Zeichnung der Muskelkarte (viewBox 0 0 100 214, Mitte bei x = 50). Gezeichnet wird nur die linke Körperhälfte;
 * die rechte entsteht hier im Code gespiegelt, der Umriss als ein einziger geschlossener Pfad (keine Naht in der Mitte).
 * Athletischer Körperbau nach dem 8-Kopf-Schema (Kinn 26, Brust 58, Nabel 80, Schritt 106, Knie 148, Sohle 211):
 * breite Schultern, V-Form, schmale Taille, kräftige Arme, Oberschenkel und Waden.
 * Pfade nur mit absoluten Befehlen M, L, C, Z – so lassen sie sich spiegeln und umkehren.
 */

export const VIEWBOX = '0 0 100 214';

export type Pt = [number, number];
type Seg = { cmd: 'L'; to: Pt } | { cmd: 'C'; c1: Pt; c2: Pt; to: Pt };

function parse(d: string): { start: Pt; segs: Seg[] } {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? [];
  let i = 0;
  const num = () => Number(tokens[i++]);
  const pt = (): Pt => [num(), num()];
  let start: Pt = [0, 0];
  const segs: Seg[] = [];
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') start = pt();
    else if (cmd === 'L') segs.push({ cmd: 'L', to: pt() });
    else if (cmd === 'C') segs.push({ cmd: 'C', c1: pt(), c2: pt(), to: pt() });
  }
  return { start, segs };
}

const r = (n: number) => Math.round(n * 100) / 100;
const mx = ([x, y]: Pt): string => `${r(100 - x)} ${r(y)}`;

/** Spiegelt einen Pfad an der Mitte (x → 100 − x). */
export function mirror(d: string): string {
  return d.replace(/([MLC])([^MLCZ]*)/g, (_, cmd: string, args: string) => {
    const n = args.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
    const out: string[] = [];
    for (let k = 0; k < n.length; k += 2) out.push(`${r(100 - n[k])} ${r(n[k + 1])}`);
    return `${cmd}${out.join(' ')} `;
  });
}

/** Linke Hälfte (von oben Mitte bis Schritt Mitte) + gespiegelte rechte Hälfte rückwärts = ein geschlossener Umriss. */
function wholeOutline(half: string): string {
  const { start, segs } = parse(half);
  const points = [start, ...segs.map((s) => s.to)];
  let back = '';
  for (let k = segs.length - 1; k >= 0; k--) {
    const s = segs[k];
    const from = points[k];
    back += s.cmd === 'C' ? ` C${mx(s.c2)} ${mx(s.c1)} ${mx(from)}` : ` L${mx(from)}`;
  }
  return `${half}${back} Z`;
}

/** Abgerundetes Rechteck als Pfad (für die Bauchsegmente). */
function rounded(x0: number, y0: number, x1: number, y1: number, rad: number): string {
  const k = rad * 0.45;
  return (
    `M${x0 + rad} ${y0} L${x1 - rad} ${y0} C${x1 - k} ${y0} ${x1} ${y0 + k} ${x1} ${y0 + rad} L${x1} ${y1 - rad} ` +
    `C${x1} ${y1 - k} ${x1 - k} ${y1} ${x1 - rad} ${y1} L${x0 + rad} ${y1} C${x0 + k} ${y1} ${x0} ${y1 - k} ${x0} ${y1 - rad} ` +
    `L${x0} ${y0 + rad} C${x0} ${y0 + k} ${x0 + k} ${y0} ${x0 + rad} ${y0} Z`
  );
}

// ------------------------------------------------------------------------------------ Umriss (linke Hälfte)

const OUTLINE_HALF =
  'M50 2.4 C45.3 2.4 41.9 6.2 41.9 12.6 C41.9 15.4 42.2 17.8 42.7 19.8 C43.3 22.2 44 24 45 25.4 ' + // Kopf, Kiefer
  'C44.6 27.2 44.2 29 43.6 30.4 C40.6 32.2 35.4 33.6 29.4 34.6 ' + // kräftiger Hals, Trapez
  'C22.4 35.4 17.8 38.6 16.6 44.8 C15.8 49 15.8 53.6 15.8 58 ' + // breite Schulter
  'C15.4 63 14.6 68 14 73 C13.7 75.6 13.4 77.6 13.2 79.6 ' + // Oberarm, Ellbogen
  'C12 85 11.2 92 11 98 C10.8 100.4 10.4 102.4 10 104.6 ' + // Unterarm, Handgelenk
  'C9.4 108.4 9.4 112.6 10 116.2 C10.6 119.4 11.8 121.6 13.4 122.2 C14.8 122.6 15.8 121.8 16 120 ' + // Hand, Finger
  'C16.2 116.8 16.4 113.2 16.8 110 C17 107.8 17.2 105.8 17.6 104 ' + // Handinnenseite
  'C19.4 97 20.6 90 21.2 84.4 C21.4 82.4 21.6 80.4 22 78.8 C23.4 72 24.1 64 24.5 57.6 C24.6 55.4 25.2 53.2 26.2 51.8 ' + // Arm innen
  'C25.6 55.4 25.6 59 26.2 62.6 C27 68.6 29.4 75 30.6 80.4 C31 84.6 30.8 88.4 30.2 92 C29.4 97 28.8 103 28.8 109 ' + // V-Form, Taille, Hüfte
  'C28.4 118 28.8 130 30.6 141 C31.4 145.4 31.8 148.6 31.8 152 ' + // Oberschenkel, Knie
  'C30.6 158 30.4 166 31.8 173.6 C33 181 34.8 189 35.4 196 ' + // Wade, Unterschenkel
  'C35.4 198.6 34.8 200.6 33.6 202.8 C32.4 205 32.2 207.6 33.4 209 C35.2 210.6 41.4 211 44 210.1 ' + // Fuß
  'C45.2 209.4 45.6 207.6 45.4 205.6 C45.2 203 45 200 45 197 ' + // Fuß innen, Knöchel
  'C45.8 190 47.2 181 47.4 172.6 C47.6 164 47 157 46 152 C45.8 149 45.9 146 46.4 143 ' + // Wade innen, Knie innen
  'C48 134 48.8 122 49 112 C49.2 108.4 49.5 106.8 50 106.4'; // Oberschenkel innen, Schritt

export const OUTLINE = wholeOutline(OUTLINE_HALF);

// ------------------------------------------------------------------------------------ Muskeln (linke Hälfte)

// Volle Karte: eine Fläche je Kartenmuskel (Zielmuskel, docs/Muskelkarte_Ausbau.md Punkt 1). Kleine Karte: je
// Muskelgruppe wenige, große Flächen.
type Half = Partial<Record<MapMuscle, string[]>>;
type GroupHalf = Partial<Record<MuscleGroup, string[]>>;

// Schulter: außen der seitliche Anteil, innen vorne der vordere bzw. hinten der hintere Anteil
const DELT_SIDE = 'M24.8 36.4 C20.6 37.6 18.2 40.6 17.6 45 C16.9 49.2 16.9 54 17.2 58.6 C18.6 56.2 20.2 54.4 21.8 53 C21.8 47.6 22.8 41.6 24.8 36.4 Z';
const DELT_INNER =
  'M31.8 35.8 C29.4 35.8 27.4 36 26 36.2 C24 41.4 23.2 47 23.2 52.2 C24 51.4 24.8 50.8 25.6 50.4 C28.2 49.2 29.6 46.8 30.2 43.8 C30.6 41 31 38.2 31.8 35.8 Z';
const DELTOID =
  'M31.8 35.8 C24.6 36 19 38.8 17.6 45 C16.9 49.2 16.9 54 17.2 58.6 C19.4 55 22.4 52 25.6 50.4 C28.2 49.2 29.6 46.8 30.2 43.8 C30.6 41 31 38.2 31.8 35.8 Z';
// Unterarm in zwei Strängen: außen Oberarmspeichenmuskel/Strecker, innen Beuger
const FOREARM_OUT = 'M13.8 80.2 C12.4 84.6 11.8 90.6 12 96.8 C12.4 99 14.2 99.8 15.6 98.6 C16 92.6 16.6 86.4 17.4 81 C16.4 79.6 14.8 79.4 13.8 80.2 Z';
const FOREARM_IN = 'M18.4 80.2 C17.6 85.8 17 92 16.8 98.4 C17.6 99.6 18.6 99.4 19 97.6 C19.6 92 20.6 87 21.2 82.6 C20.8 80.8 19.6 80 18.4 80.2 Z';
const FOREARM_MINI = 'M13.8 80.2 C12.4 85 11.8 91 12 97.4 C13.2 99.8 17.4 100 18.8 97.8 C19.6 92 20.6 87 21.2 82.6 C19.4 79.4 15.8 79.2 13.8 80.2 Z';

const NECK_FRONT = [
  // Kopfwender (schräg am Hals) und der vordere Rand des Trapezes über dem Schlüsselbein
  'M45.4 27.4 C46.1 30.2 47.3 32.8 48.9 35.4 C48.3 36 47.5 35.8 46.9 35.2 C45.9 33 45.2 30.6 45 28.2 Z',
  'M43.4 31.8 C40.6 33.4 36.2 34.6 31.2 35.6 C35.6 36.4 40.4 36.4 44 35.4 C43.9 34.2 43.7 33 43.4 31.8 Z',
];
const PEC =
  'M49.4 38.2 C45 36.8 39.4 36.6 35 37.4 C32.6 37.8 31.4 39.8 30.8 42.6 C30.2 45.8 29.2 49.4 27.8 52.4 C31.4 57.4 37 60.4 42.4 60.4 C45.2 60.4 47.6 59.8 49.4 58.8 Z';
const BICEPS = 'M24 55.6 C20.4 55.8 17.4 59.4 16.8 64.6 C16.3 69.4 17 73.8 18.6 77 C21 77 22.4 73.6 22.8 68.6 C23.3 64 23.8 59.6 24 55.6 Z';
const OBLIQUE =
  'M40.6 63.2 C37.4 63.6 34.6 65 32.4 67.2 C33 71.4 33.2 76 32.8 80.4 C32.6 84.6 32 88.6 31.6 91.6 C35 93.6 38.2 96.6 41 99.6 C41.2 93 41.4 82 41.2 73 C41.1 68.6 41 65.6 40.6 63.2 Z';
const TFL = 'M30 94.6 C32 96.6 33.6 99.4 34.6 102.6 C34.2 106.6 33.4 110.2 32.2 113.2 C30.6 110 29.6 105.6 29.6 101 C29.6 98.6 29.7 96.4 30 94.6 Z';
const CALF_FRONT_IN =
  'M44 152.6 C45.8 156 46.6 162.4 46.4 168.6 C46.2 173 45.6 176.6 44.4 179.4 C42.8 173.4 42.2 166 42.6 159.6 C42.8 156.8 43.3 154.4 44 152.6 Z';
const TRAPEZIUS =
  'M49.4 24.6 C48 25.8 46 27.6 44.8 29.6 C43 32 38.6 33.6 32.4 35 C29.8 35.6 28.4 36.6 28.2 37.8 C32.8 39 36.8 41.2 39.8 44.4 C43.6 48.8 46.4 56.4 48 64 C48.6 67 49 69.6 49.4 71.6 Z';
const GLUTE_MED = 'M31 89.6 C34.6 89.2 38.6 90 42 92 C41.6 94.6 40 96.4 37.6 97.8 C35 98.8 32.4 100.4 30.2 102.2 C29.8 97.6 30 93.2 31 89.6 Z';
const GLUTE =
  'M49.4 101.4 C47.4 99.2 44.2 98 40.6 98.4 C35.6 98.8 31.6 102.6 30.4 107.8 C29.6 113 31 118.4 34.8 121.2 C38.4 123.8 44 124 46.6 122.2 C47.8 121 48.6 116.4 48.7 111.8 L49.4 106.8 Z';

const FRONT_HALF: Half = {
  nacken: NECK_FRONT,
  schulter_seitlich: [DELT_SIDE],
  schulter_vorn: [DELT_INNER],
  // Brust als Fächer in drei Bändern (oben = Schlüsselbeinanteil, Mitte, unten)
  brust_oben: ['M49.4 38.2 C45 36.8 39.4 36.6 35 37.4 C32.6 37.8 31.4 39.8 30.8 42.6 C30.5 44 30.2 45.4 29.8 46.6 C35.4 44.6 42.4 43.8 49.4 44.4 Z'],
  brust_mitte: ['M49.4 45.6 C42.4 45 35.6 45.8 29.4 48 C29 49.4 28.6 50.6 28.1 51.8 C35 50.6 42.4 50.8 49.4 52 Z'],
  brust_unten: ['M49.4 53.2 C42.4 52 35.2 52 28.4 53 C32 57.6 37.4 60.4 42.4 60.4 C45.2 60.4 47.6 59.8 49.4 58.8 Z'],
  // Sägemuskel: drei Zacken unter der Achsel
  saegemuskel: [
    'M27.8 55.4 C29.6 55.8 31.2 56.8 32.4 58 C31.4 59 29.8 59 28.4 58.2 C28 57.2 27.8 56.2 27.8 55.4 Z',
    'M28.4 59.8 C30.2 60.2 31.8 61.2 33 62.4 C32 63.4 30.4 63.4 29 62.6 C28.6 61.6 28.4 60.6 28.4 59.8 Z',
    'M29.2 64 C30.6 64.4 31.6 65 32.2 65.6 C31.4 66.6 30.4 66.8 29.8 66.4 C29.4 65.6 29.2 64.8 29.2 64 Z',
  ],
  bizeps: [BICEPS],
  unterarme: [FOREARM_OUT, FOREARM_IN],
  bauch_gerade: [
    rounded(42.2, 61.4, 49.4, 68.8, 2.6),
    rounded(42.4, 69.8, 49.4, 77.2, 2.6),
    rounded(42.8, 78.2, 49.4, 85.6, 2.6),
    'M43.4 86.6 L49.4 86.6 L49.4 101.4 C47.6 101.2 46.2 100 45.2 98 C44 95 43.4 91 43.4 86.6 Z',
  ],
  bauch_schraeg: [OBLIQUE],
  // Spanner der Oberschenkelbinde außen (Abduktoren), Lenden-Darmbein-Muskel in der Leiste (Hüftbeuger)
  abduktoren: [TFL],
  hueftbeuger: ['M41.8 101.6 C43.6 102.6 45.4 104.2 46.8 106.4 C45.4 107.6 43.6 107.8 42 107.2 C41.4 105.4 41.4 103.4 41.8 101.6 Z'],
  // äußerer, gerader und innerer Schenkelmuskel (Tropfen über dem Knie)
  quadrizeps: [
    'M33 106.4 C30.4 113 29.6 122 29.8 131 C30 137.6 31.2 142.6 33 146.8 C35 147.8 37 147.4 38.4 146.4 C36 141.6 34.6 136 34.2 130 C33.8 122 33.8 114 33 106.4 Z',
    'M36.4 103.8 C34.8 111 34.8 121 35.4 130 C36 136.8 37.6 142 39.4 145.4 C41 141.4 41.8 136 42 130 C42.2 121 40.6 111.6 36.4 103.8 Z',
    'M43.8 129.6 C45.8 132.2 46.4 136.6 46.2 140.6 C46 144.6 44.4 147.2 41.6 147.4 C40.8 144.8 41.6 140.2 42.4 136.6 C42.8 134.2 43.2 131.8 43.8 129.6 Z',
  ],
  adduktoren: [
    'M43.4 108.4 C42.2 112.6 42.4 118 43.2 122.6 C43.8 126 44.8 128.6 46 130.4 C47.4 126.4 48.2 121 48.4 115.8 C48.5 112.8 48.3 110.4 47.8 108.8 C46.2 107.8 44.6 107.8 43.4 108.4 Z',
  ],
  // von vorne nur die Ränder der Wade: innen der Zwillingswadenmuskel, außen der Schollenmuskel
  waden: [
    CALF_FRONT_IN,
    'M32.4 155.6 C31.6 161.4 31.6 168.4 32.8 175.4 C33.4 179 34.4 182.2 35.4 184.4 C36 177.4 36 169.4 35.4 163 C35 160 34 157.6 32.4 155.6 Z',
  ],
};

const BACK_HALF: Half = {
  // Rücken zuerst, damit der Trapez darüber liegt
  lat: [
    'M27 54.4 C31.6 59 37 61.4 42 61.8 C44 64.8 45 69.4 45 74.4 C45 79.8 44.4 84.6 43.4 88.6 C40 87 36.4 84 33.8 80.6 C31.6 76.6 29.8 71.6 28.6 66.6 C27.6 62.6 27 58.4 27 54.4 Z',
  ],
  unterer_ruecken: ['M48.2 58.6 C46.8 64.6 46.2 72 45.8 80 C45.4 87 45.6 93 46.4 97.6 L49.4 98 L49.4 58.6 Z'],
  // Untergrätenmuskel auf dem Schulterblatt
  rotatoren: ['M30.6 45 C34.6 44 38.8 44.8 42 47.2 C42 51.4 40.6 55.4 37.8 58.2 C34.8 57.8 32 56 30.2 53.4 C29.8 50.4 29.8 47.6 30.6 45 Z'],
  // Trapez: oberer Teil (Nacken) bis zur Schulterhöhe, mittlerer und unterer Teil (oberer Rücken) bis zur Brustwirbelsäule
  nacken: [
    'M49.4 24.6 C48 25.8 46 27.6 44.8 29.6 C43 32 38.6 33.6 32.4 35 C29.8 35.6 28.4 36.6 28.2 37.8 C33.4 38.6 38.6 39.2 43.4 39.6 C45.4 39.8 47.4 40 49.4 40.2 Z',
  ],
  oberer_ruecken: ['M49.4 41.4 C45.2 41.2 39.2 40.8 33.6 40.2 C36 41.4 38.2 42.8 39.8 44.4 C43.6 48.8 46.4 56.4 48 64 C48.6 67 49 69.6 49.4 71.6 Z'],
  schulter_seitlich: [DELT_SIDE],
  schulter_hinten: [DELT_INNER],
  // Trizeps (unten hufeisenförmig eingezogen, wo die Sehnenplatte liegt), Unterarm-Strecker
  trizeps: [
    'M17 56.4 C16 61.4 15.8 67.4 16.6 72.4 C17 74.4 17.8 75.4 18.6 75.2 C19.4 72.6 20.4 71.2 21.2 71.2 C22 71.2 22.4 72.6 22.6 74 C23 72.6 23 70.6 23.1 68.4 C23.5 64 23.9 59.6 24 56 C21.8 54.6 19 55 17 56.4 Z',
  ],
  unterarme: [FOREARM_OUT, FOREARM_IN],
  // mittlerer Gesäßmuskel (Abduktoren) seitlich über dem großen
  abduktoren: [GLUTE_MED],
  gesaess: [GLUTE],
  // Beinbeuger: außen zweiköpfiger, innen halbsehniger/-häutiger Muskel
  beinbeuger: [
    'M32 124.4 C30.4 129 30.4 135 31 140 C31.6 144 33 147.6 35 150 C37 147.8 38.2 143.6 38.4 139 C38.6 133.4 38.2 128.4 37.4 124.4 C35.6 123.6 33.6 123.6 32 124.4 Z',
    'M39.6 125 C39.4 131 39.6 138 40.4 143.4 C41 146.4 41.8 148.8 43.2 150.4 C45 148.2 46.2 144.4 46.6 139.8 C47 134.8 47.2 129.8 47.2 125.6 C44.6 124.2 41.8 124 39.6 125 Z',
  ],
  // Zwillingswadenmuskel mit zwei Köpfen (innen tiefer), darunter seitlich der Schollenmuskel
  waden: [
    'M32.6 153.8 C31.2 158.6 31.1 165 32.2 170.8 C33 174 34.6 176 36.8 176.8 C38.2 171 38.6 163.6 38.2 158 C37 155.2 34.6 153.8 32.6 153.8 Z',
    'M40 153.8 C39.2 160.4 39.4 168.6 40.8 175.4 C41.8 178.6 43.8 179.6 45.4 178 C46.8 172.8 47.2 164.6 46.4 159 C45 155.6 42.4 154 40 153.8 Z',
    'M33.4 179 C34 183 35 187 36.2 190.4 C37.2 187 37.4 183 37 179.8 C35.8 178.8 34.6 178.6 33.4 179 Z',
  ],
};

// Kleine Karte (54 × 116): je Muskelgruppe wenige, große Flächen, kein Bauchgitter, kein Sägemuskel.
const FRONT_MINI_HALF: GroupHalf = {
  nacken: [NECK_FRONT[1]],
  schultern: [DELTOID],
  brust: [PEC],
  arme: [BICEPS, FOREARM_MINI],
  bauch: ['M42.4 61.4 L49.4 61.4 L49.4 101.4 C47 100.8 45 98.4 44 94.8 C43 88 42.4 74 42.4 61.4 Z', OBLIQUE],
  huefte: [TFL],
  beine: [
    'M34.2 104.4 C30.8 112 29.8 122 30 131 C30.4 138 31.8 143.4 33.8 146.8 C37.2 148.2 42 148.2 45.4 146.4 C46.4 141 47.2 133 47.6 125 C48.2 118 47.8 111.4 47 107.8 C42.8 105 38.6 104 34.2 104.4 Z',
  ],
  waden: [CALF_FRONT_IN],
};

const BACK_MINI_HALF: GroupHalf = {
  ruecken: [
    'M27 50.4 C32 47.4 38 46.8 42.6 48.4 C45.4 56 46.8 66 47.2 76 C47.4 84 47.2 91 46.8 96.8 C42 92.4 36.8 87 33.4 81.6 C31 76.6 29.4 70 28.4 63.6 C27.6 59.4 27.2 55 27 50.4 Z',
  ],
  nacken: [TRAPEZIUS],
  schultern: [DELTOID],
  arme: [
    'M17 56.4 C16 61.4 15.8 67.4 16.6 72.4 C17.2 75.4 19.4 76.6 21 76.4 C22.4 76.2 22.9 73.4 23.1 68.4 C23.5 64 23.9 59.6 24 56 C21.8 54.6 19 55 17 56.4 Z',
    FOREARM_MINI,
  ],
  huefte: [GLUTE_MED],
  gesaess: [GLUTE],
  beine: [
    'M32 124.4 C30.4 129 30.4 135 31 140 C31.8 145 33.8 149 36.6 150.6 C38.8 149.2 40.6 149.2 42.6 150.6 C45.4 148.4 46.6 144 46.8 139 C47.2 134 47.2 129 47.2 125.4 C42.4 123.6 37 123.4 32 124.4 Z',
  ],
  waden: [
    'M32.6 153.8 C31.2 159 31.2 166 32.6 172 C34.2 177.4 37.4 179.4 40 179.2 C42.8 179.4 45.4 177.6 46.4 172.4 C47.2 166.4 47 160 46.2 157 C42 152.4 37 152.4 32.6 153.8 Z',
  ],
};

// ------------------------------------------------------------------------------------ Regionen und Treffer

/** Pfad (nur M, L, C, Z) als Punktfolge; Kurven in 12 Schritten abgetastet. */
export function polygon(d: string): Pt[] {
  const { start, segs } = parse(d);
  const pts: Pt[] = [start];
  for (const s of segs) {
    const [x0, y0] = pts[pts.length - 1];
    if (s.cmd === 'L') pts.push(s.to);
    else
      for (let k = 1; k <= 12; k++) {
        const t = k / 12;
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const c = 3 * u * t * t;
        const e = t * t * t;
        pts.push([a * x0 + b * s.c1[0] + c * s.c2[0] + e * s.to[0], a * y0 + b * s.c1[1] + c * s.c2[1] + e * s.to[1]]);
      }
  }
  return pts;
}

/**
 * Eine Fläche der Karte: Gruppe (für die kleine Karte und geschonte Bereiche), Kartenmuskel (volle Karte, sonst null),
 * Pfade beider Seiten, abgetastete Umrisse für das Antippen und die Reihe von oben (0–9) für den Versatz.
 */
export type Region = { key: string; group: MuscleGroup; muscle: MapMuscle | null; paths: string[]; polys: Pt[][]; row: number };

function region(key: string, group: MuscleGroup, muscle: MapMuscle | null, half: string[]): Region {
  const paths = half.flatMap((d) => [d, mirror(d)]);
  const polys = paths.map(polygon);
  const ys = polys.flat().map(([, y]) => y);
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  return { key, group, muscle, paths, polys, row: Math.min(9, Math.round((cy / 214) * 9)) };
}

const byMuscle = (half: Half): Region[] => (Object.entries(half) as [MapMuscle, string[]][]).map(([m, paths]) => region(m, MAP_GROUP[m], m, paths));
const byGroup = (half: GroupHalf): Region[] => (Object.entries(half) as [MuscleGroup, string[]][]).map(([g, paths]) => region(g, g, null, paths));

/** Die vier Zeichnungen; die Reihenfolge der Einträge ist die Zeichenreihenfolge. */
export const FIGURE = {
  front: byMuscle(FRONT_HALF),
  back: byMuscle(BACK_HALF),
  frontMini: byGroup(FRONT_MINI_HALF),
  backMini: byGroup(BACK_MINI_HALF),
} as const;

/** Liegt ein Muskel vorne, hinten oder auf beiden Seiten? (Für die Einzelansicht, Punkt 5.5.) */
export function sidesOf(muscle: MapMuscle): ('front' | 'back')[] {
  const out: ('front' | 'back')[] = [];
  if (FIGURE.front.some((r) => r.muscle === muscle)) out.push('front');
  if (FIGURE.back.some((r) => r.muscle === muscle)) out.push('back');
  return out;
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

/** Fangradius in Zeichnungs-Einheiten (≈ 7 px in der Statistik). */
export const HIT_RADIUS = 6;

/**
 * Welche Fläche liegt unter dem Finger? Zuerst die Fläche, die den Punkt enthält (die zuletzt gezeichnete gewinnt),
 * sonst die nächste im Fangradius, sonst keine.
 */
export function hitTest(regions: readonly Region[], x: number, y: number, radius = HIT_RADIUS): Region | null {
  const p: Pt = [x, y];
  for (let i = regions.length - 1; i >= 0; i--) if (regions[i].polys.some((poly) => inside(p, poly))) return regions[i];
  let best: Region | null = null;
  let bestDist = radius;
  for (const r of regions)
    for (const poly of r.polys) {
      const d = distance(p, poly);
      if (d <= bestDist) {
        bestDist = d;
        best = r;
      }
    }
  return best;
}
