// CSV lesen und schreiben (Ausbauplan A5). Export für Excel/Numbers in Deutschland: Semikolon, Dezimalkomma,
// UTF-8 mit BOM (sonst zeigt Excel Umlaute falsch). Import erkennt Komma, Semikolon oder Tab und Anführungszeichen.

export type Cell = string | number | null | undefined;

const BOM = '﻿';

function cell(v: Cell): string {
  if (v === null || v === undefined) return '';
  const text = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000).replace('.', ',')) : v;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return BOM + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

/** Trennzeichen aus der Kopfzeile erraten (das häufigste außerhalb von Anführungszeichen). */
function detectDelimiter(firstLine: string): string {
  const counts = { ',': 0, ';': 0, '\t': 0 } as Record<string, number>;
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/** Liest CSV in Zeilen aus Zellen (Anführungszeichen, doppelte "" und Zeilenumbrüche in Zellen werden beachtet). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const delimiter = detectDelimiter(src.split(/\r?\n/, 1)[0] ?? '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

/** Zeilen als Objekte über die Kopfzeile (Spaltennamen klein und ohne Leerzeichen am Rand). */
export function csvObjects(text: string): { header: string[]; rows: Record<string, string>[] } {
  const [head, ...body] = parseCsv(text);
  const header = (head ?? []).map((h) => h.trim().toLowerCase());
  return { header, rows: body.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()]))) };
}

/** Zahl aus CSV: „1.234,5“, „1234.5“ und „1234,5“ werden gelesen; leer oder ungültig = null. */
export function csvNumber(v: string | undefined): number | null {
  if (!v) return null;
  let t = v.trim().replace(/\s/g, '');
  if (!t) return null;
  if (t.includes(',') && t.includes('.')) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else t = t.replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
