import type { MuscleGroup } from '@/domain/exercises';

/**
 * Zeichnung der Muskelkarte (viewBox 0 0 100 214, Mitte bei x = 50). Gezeichnet wird nur die linke Körperhälfte;
 * die rechte entsteht hier im Code gespiegelt, der Umriss als ein einziger geschlossener Pfad (keine Naht in der Mitte).
 * Proportionen nach dem 8-Kopf-Schema: Kinn 27, Brust 56, Nabel 78, Schritt 106, Knie 148, Sohle 211.
 * Pfade nur mit absoluten Befehlen M, L, C, Z – so lassen sie sich spiegeln und umkehren.
 */

export const VIEWBOX = '0 0 100 214';

type Pt = [number, number];
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
  'M50 1.6 C44.8 1.6 41.2 5.6 41.2 12.4 C41.2 15.2 41.5 17.6 42.1 19.6 C42.7 22.2 43.5 24.2 44.6 25.6 ' + // Kopf, Kiefer
  'C45.1 27.4 45.1 29.4 44.7 31 C42.2 33.1 37.6 34.5 31.8 35.7 ' + // Hals, Trapez
  'C25.6 36.5 21.5 39.3 20.3 44.4 C19.5 48.2 19.4 52.2 19.2 56 ' + // Schulter
  'C18.8 62 18.2 68 17.8 74 C17.6 76.4 17.1 78.6 16.7 81 ' + // Oberarm, Ellbogen
  'C16.1 87 15.5 94 14.9 100.8 C14 104.2 13.2 108 13.4 112 C13.6 116 14.4 119.6 16 121.4 ' + // Unterarm, Hand
  'C17.4 122.8 18.9 122.1 19.3 120 C19.7 116.6 19.9 112.4 20.3 109 C20.5 106.6 20.7 104.4 20.9 102.4 ' + // Finger, Handinnenseite
  'C21.7 95 22.6 88 23.2 82 C23.4 80 23.6 78.4 23.9 77 C24.5 70 25.4 62 26.6 54.6 C26.8 53.4 27.2 52.4 27.7 52 ' + // Arm innen
  'C28.5 58 29.9 66 30.6 74 C31 80 30.6 86 30 91 C29.2 97 28.8 104 29 110 ' + // Rumpf, Taille, Hüfte
  'C29.2 120 30 132 31.6 142 C32.2 145.4 32.6 148.6 32.6 152 ' + // Oberschenkel, Knie
  'C32 158 31.8 166 33 174 C34 182 35.4 190 35.8 196 ' + // Wade, Unterschenkel
  'C35.8 198.6 35.1 200.6 33.9 202.8 C32.7 205 32.4 207.6 33.6 209 C35.4 210.6 41.4 211 44 210.1 ' + // Fuß
  'C45.2 209.4 45.6 207.6 45.4 205.6 C45.2 203 45 200 45 197 ' + // Fuß innen, Knöchel
  'C45.6 190 46.6 182 46.8 174 C47 166 46.6 158 45.8 152 C45.6 149 45.9 146 46.4 143 ' + // Wade innen, Knie innen
  'C47.8 134 48.6 122 48.8 112 C49 108.4 49.4 106.6 50 106'; // Oberschenkel innen, Schritt

export const OUTLINE = wholeOutline(OUTLINE_HALF);

// ------------------------------------------------------------------------------------ Muskeln (linke Hälfte)

type Half = Partial<Record<MuscleGroup, string[]>>;

// Gemeinsame Formen vorne und hinten
const DELTOID =
  'M32.4 36.6 C26 36.9 22 39.6 20.9 44.8 C20.3 48.8 20.3 53 20.7 57 C22.6 54.2 25 51.8 27.6 50.6 C29.6 49.6 30.6 47.6 31 45 C31.4 42 31.8 39 32.4 36.6 Z';
const FOREARM_FRONT = 'M17.4 79.6 C16.5 85.6 16 92 15.8 97.8 C16.6 99.6 18.6 99.8 20 98.4 C21.2 92 22.2 86 22.9 80.6 C21.2 78.8 18.8 78.6 17.4 79.6 Z';
const FOREARM_BACK = 'M17.3 79.8 C16.4 85.6 15.9 92 15.8 97.6 C16.6 99.4 18.5 99.7 19.8 98.3 C21 92 22 86.2 22.8 81 C21.2 79.2 18.8 78.8 17.3 79.8 Z';

const FRONT_HALF: Half = {
  nacken: [
    // Kopfwender (schräg am Hals) und der vordere Rand des Trapezes über dem Schlüsselbein
    'M45.6 27 C46.2 29.8 47.4 32.6 49 35.2 C48.4 35.8 47.6 35.6 47 35 C46 32.8 45.4 30.4 45.2 27.8 Z',
    'M44 32.6 C41.4 34.2 37.6 35.4 33.6 36.4 C37.4 37 41.2 36.8 44.4 35.8 C44.4 34.6 44.3 33.6 44 32.6 Z',
  ],
  schultern: [DELTOID],
  brust: [
    'M49.4 38.6 C45.4 37.4 40.6 37.4 36.8 38.2 C34.4 38.8 33 40.8 32.2 43.6 C31.5 46.4 30.9 49.4 30.8 52.2 C33.8 56.2 38 58.6 42.4 58.6 C45 58.6 47.4 58 49.4 57 Z',
  ],
  arme: [
    // Bizeps, Unterarm
    'M25.8 55.6 C22.6 56.2 20.2 59.6 19.7 64.6 C19.3 69 19.8 73.2 21 76 C23.2 76 24.4 73 24.6 68.6 C25 64.4 25.6 59.6 25.8 55.6 Z',
    FOREARM_FRONT,
  ],
  bauch: [
    rounded(42.4, 59.4, 49.4, 66.8, 2.4),
    rounded(42.6, 67.8, 49.4, 75.2, 2.4),
    rounded(43, 76.2, 49.4, 83.8, 2.4),
    'M43.6 84.8 L49.4 84.8 L49.4 100 C47.8 99.8 46.4 98.6 45.4 96.6 C44.2 93.6 43.6 89.4 43.6 84.8 Z',
    // seitliche Bauchmuskeln
    'M39.6 61.2 C36.6 61.6 33.8 62.8 31.4 64.8 C32 69.4 32.3 74 32.2 78.6 C32 83 31.6 87.2 31.4 90.4 C34.6 92.4 37.8 95.2 40.6 98.4 C41 92 41.2 80 41 71 C40.9 66.6 40.6 63.4 39.6 61.2 Z',
  ],
  huefte: [
    // Spanner der Oberschenkelbinde außen, Lenden-Darmbein-Muskel in der Leiste
    'M30.6 94 C32.6 96 34.2 98.8 35.2 102 C34.8 106 34 109.6 32.8 112.6 C31.2 109.6 30.2 105 30 100.4 C30 98 30.2 95.8 30.6 94 Z',
    'M41.8 100.6 C43.6 101.6 45.4 103.2 46.8 105.4 C45.4 106.6 43.6 106.8 42 106.2 C41.4 104.4 41.4 102.4 41.8 100.6 Z',
  ],
  beine: [
    // äußerer Schenkelmuskel, gerader Schenkelmuskel, innerer (Tropfen über dem Knie), Adduktoren
    'M33.8 106 C31.4 113 30.6 122 30.8 131 C31 137.4 32.1 142.4 33.8 146.4 C35.6 147.4 37.6 147 38.8 146.2 C36.6 141.4 35.4 136 35 130 C34.6 122 34.6 114 33.8 106 Z',
    'M37 103.8 C35.6 111 35.6 121 36.2 130 C36.8 136.6 38.2 141.8 39.8 145 C41.2 141 41.8 136 42 130 C42.2 121 40.8 111.6 37 103.8 Z',
    'M43.6 130.6 C45.6 133 46.2 137.2 46 141 C45.8 144.6 44.2 147 41.6 147.2 C40.8 144.6 41.6 140 42.4 136.6 C42.8 134.4 43.2 132.4 43.6 130.6 Z',
    'M43.6 107.6 C42.4 112 42.6 117.4 43.4 122 C44 125.4 45 128 46.2 130 C47.2 126 47.9 120.6 48.1 115.4 C48.2 112.4 48 110 47.6 108.4 C46.2 107.4 44.8 107.2 43.6 107.6 Z',
  ],
  waden: [
    // von vorne nur die Ränder der Wade: innen der Zwillingswadenmuskel, außen der Schollenmuskel
    'M44 152.4 C45.6 155.6 46.3 161.6 46.1 167.6 C45.9 172 45.2 175.6 44 178.4 C42.6 172.4 42.2 165 42.6 158.8 C42.8 156.2 43.3 154 44 152.4 Z',
    'M33 155.4 C32.3 161 32.4 168 33.6 175 C34.2 178.8 35.2 182 36.2 184 C36.8 177 36.8 169 36.2 162.6 C35.8 159.6 34.6 157.2 33 155.4 Z',
  ],
};

const BACK_HALF: Half = {
  ruecken: [
    // Untergrätenmuskel (Schulterblatt), breiter Rückenmuskel, Rückenstrecker
    'M31.4 45.4 C35 44.6 38.8 45.4 41.8 47.6 C41.8 51.6 40.4 55.4 37.8 58 C35 57.6 32.4 56 30.8 53.6 C30.4 50.6 30.6 47.8 31.4 45.4 Z',
    'M28.4 53 C32.4 57.6 37.4 60 41.8 60.4 C43.8 63.4 44.8 68 44.8 73 C44.8 78.4 44.2 83.4 43.2 87.6 C40 86 36.6 83.2 34.2 79.8 C32.6 76 31.6 71.4 31 66.6 C30.4 61.8 29.6 57.2 28.4 53 Z',
    'M48.2 58.6 C47 64 46.4 72 46 80 C45.6 87 45.8 93 46.6 97.6 L49.4 98 L49.4 58.6 Z',
  ],
  nacken: [
    // Trapez: vom Hinterkopf über die Schulterhöhe bis zur Brustwirbelsäule
    'M49.4 24.8 C48 26 46.6 27.8 45.8 29.8 C44.4 32.4 40.2 34.2 34 35.8 C31.6 36.4 30.2 37.2 29.9 38.4 C33.8 39.6 37.4 41.6 40.2 44.6 C43.8 49 46.6 56.4 48.2 64 C48.6 67 49 69.6 49.4 71.6 Z',
  ],
  schultern: [DELTOID],
  arme: [
    // Trizeps (unten hufeisenförmig eingezogen, wo die Sehnenplatte liegt), Unterarm-Strecker
    'M20.2 55.4 C19.4 60 19.2 66 19.7 71 C19.9 72.8 20.4 73.8 21 74 C21.6 71.6 22.2 70.4 22.8 70.4 C23.4 70.4 23.8 71.8 24 73.2 C24.3 72.4 24.4 71.2 24.5 69.6 C24.9 65 25.6 60 25.8 55.6 C24 54.6 21.8 54.6 20.2 55.4 Z',
    FOREARM_BACK,
  ],
  huefte: [
    // mittlerer Gesäßmuskel (seitlich über dem großen)
    'M31.6 89.4 C35 89 38.8 89.8 42.2 91.8 C41.8 94.4 40.2 96.2 37.8 97.6 C35.4 98.6 33 100 31 101.8 C30.6 97.4 30.8 93 31.6 89.4 Z',
  ],
  gesaess: [
    'M49.4 101.4 C47.6 99.4 44.6 98.2 41.2 98.4 C36.4 98.8 32.6 102.6 31.4 107.6 C30.6 112.6 31.8 117.8 35.4 120.6 C38.6 123 44 123.2 46.4 121.6 C47.6 120.4 48.3 116 48.5 111.6 L49.4 106.6 Z',
  ],
  beine: [
    // Beinbeuger: außen zweiköpfiger, innen halbsehniger/-häutiger Muskel
    'M33 123.4 C31.4 128 31.2 134 31.8 139 C32.4 143.2 33.8 146.8 35.8 149.2 C37.6 147 38.6 143 38.8 138.6 C39 133 38.6 128 37.8 123.6 C36.2 122.8 34.6 122.8 33 123.4 Z',
    'M39.8 124 C39.6 130 39.8 137 40.6 142.6 C41.2 145.6 42 148 43.2 149.6 C44.8 147.4 45.8 143.6 46.2 139 C46.6 134 46.8 129 46.8 124.6 C44.4 123.4 42 123.2 39.8 124 Z',
  ],
  waden: [
    // Zwillingswadenmuskel mit zwei Köpfen (innen tiefer), darunter seitlich der Schollenmuskel
    'M33.4 153.6 C32.2 158 32 164 33 169.6 C33.8 172.6 35.4 174.6 37.4 175.4 C38.6 170 39 163 38.6 157.6 C37.4 155 35.4 153.8 33.4 153.6 Z',
    'M40.4 153.6 C39.6 160 39.8 168 41.2 174.6 C42.2 177.6 44 178.4 45.4 177 C46.6 172 47 164 46.2 158.6 C44.8 155.4 42.6 153.8 40.4 153.6 Z',
    'M33.8 177.8 C34.4 182 35.4 186 36.6 189.4 C37.6 186 37.8 182 37.4 178.8 C36.2 177.8 35 177.4 33.8 177.8 Z',
  ],
};

// Vereinfachte Fassung für die kleine Karte (54 × 116): weniger, größere Flächen, kein Bauchgitter.
const FRONT_MINI_HALF: Half = {
  ...FRONT_HALF,
  nacken: [FRONT_HALF.nacken![1]],
  bauch: ['M43.2 59.4 L49.4 59.4 L49.4 99.6 C47 99 45.2 96.6 44.4 93 C43.6 86 43.2 72 43.2 59.4 Z', FRONT_HALF.bauch![4]],
  huefte: [FRONT_HALF.huefte![0]],
  beine: [
    'M35 104.4 C31.8 112 30.7 122 30.9 131 C31.4 138 32.8 143 34.6 146.4 C37.6 147.6 42 147.6 45.2 146 C46.6 140 47.2 132 47.4 124 C48 117 47.6 111 46.6 107.4 C43 105 39 104 35 104.4 Z',
  ],
  waden: [FRONT_HALF.waden![0]],
};

const BACK_MINI_HALF: Half = {
  ...BACK_HALF,
  ruecken: [
    'M28.8 50 C33 47.6 38 47 42.4 48.6 C45 56 46.6 66 47 76 C47.2 84 47 91 46.6 96.6 C42 92 37 87 33.6 82 C32.4 76 31.6 68 30.8 60 C30.4 56.4 29.8 53 28.8 50 Z',
  ],
  arme: [
    'M20.2 55.4 C19.4 60 19.2 66 19.7 71 C20.3 74 21.8 75.6 23 75.4 C24 75.2 24.4 73 24.5 69.6 C24.9 65 25.6 60 25.8 55.6 C24 54.6 21.8 54.6 20.2 55.4 Z',
    FOREARM_BACK,
  ],
  beine: [
    'M33.2 123.6 C31.6 128 31.4 134 32 139 C32.8 144 34.6 148 37 149.6 C39 148.2 40.4 148.4 42 149.6 C44.6 147.4 45.8 143 46.2 138 C46.6 133 46.6 128 46.6 124.6 C42.2 123 37.6 122.8 33.2 123.6 Z',
  ],
  waden: [
    'M33.4 153.6 C32 159 32 166 33.4 172 C35 177 38 178.8 40.4 178.6 C43 178.8 45.4 177 46.2 172 C47 166 46.8 160 46 157 C42 152.6 37.4 152.4 33.4 153.6 Z',
  ],
};

export type Region = { group: MuscleGroup; paths: string[] };

/** Linke Hälfte + gespiegelte rechte Hälfte; die Reihenfolge der Einträge ist die Zeichenreihenfolge. */
function build(half: Half, order: MuscleGroup[]): Region[] {
  return order.filter((g) => half[g]?.length).map((group) => ({ group, paths: half[group]!.flatMap((d) => [d, mirror(d)]) }));
}

// Rücken vor dem Nacken, damit der Trapez über dem Rückenstrecker liegt.
const ORDER_FRONT: MuscleGroup[] = ['nacken', 'schultern', 'brust', 'arme', 'bauch', 'huefte', 'beine', 'waden'];
const ORDER_BACK: MuscleGroup[] = ['ruecken', 'nacken', 'schultern', 'arme', 'huefte', 'gesaess', 'beine', 'waden'];

export const FIGURE = {
  front: build(FRONT_HALF, ORDER_FRONT),
  back: build(BACK_HALF, ORDER_BACK),
  frontMini: build(FRONT_MINI_HALF, ORDER_FRONT),
  backMini: build(BACK_MINI_HALF, ORDER_BACK),
} as const;

/** Reihenfolge von oben nach unten – für den kleinen Versatz, wenn sich die Farben ändern. */
export const TOP_DOWN: Record<MuscleGroup, number> = {
  nacken: 0,
  schultern: 1,
  brust: 2,
  ruecken: 2,
  arme: 3,
  bauch: 4,
  huefte: 5,
  gesaess: 5,
  beine: 6,
  waden: 7,
  ganzkoerper: 8,
};
