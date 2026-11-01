/**
 * Textschlüssel in beide Richtungen prüfen: jeder Text in de.ts wird benutzt, jeder feste Schlüssel im Code existiert.
 * Als benutzt gilt ein Schlüssel, wenn er als Zeichenkette im Code steht ('a.b.c') oder unter einem
 * dynamischen Präfix liegt (t(`a.b.${x}`) → alles unter a.b). Plurale (one/other/zero) zählen als ein Schlüssel.
 */
import { expect, test } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { de } from '../de';

const SRC = join(__dirname, '..', '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) && !/^de(-.*)?\.ts$/.test(name) ? [p] : [];
  });
}

const PLURAL = ['one', 'other', 'zero'];

/** Alle Textschlüssel; ein Objekt nur aus one/other/zero ist ein Plural und zählt als ein Schlüssel. */
function leaves(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') return [key];
    const sub = v as Record<string, unknown>;
    return Object.keys(sub).every((x) => PLURAL.includes(x)) ? [key] : leaves(sub, key);
  });
}

const code = files(SRC)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const literals = new Set(code.match(/['"`][a-zA-Z0-9_.]+['"`]/g)?.map((s) => s.slice(1, -1)) ?? []);
// Präfixe aus Vorlagen wie `stretch.flex.${x}` oder 'shopping.department.' + x.
const prefixes = [...(code.match(/[`'"][a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*\.(?:\$\{|['"`]\s*\+)/g) ?? [])].map((m) =>
  m.slice(1).replace(/\$\{$|['"`]\s*\+$/, '')
);

function unusedKeys(): string[] {
  return [...new Set(leaves(de))].filter((key) => !literals.has(key) && !prefixes.some((p) => key.startsWith(p)));
}

test('keine ungenutzten Textschlüssel', () => {
  expect(unusedKeys()).toEqual([]);
});

test('jeder feste Schlüssel in t(…) existiert (sonst „[missing …]“ in der App)', () => {
  const known = new Set([...leaves(de), ...Object.keys(de)]);
  const used = [...code.matchAll(/\bt\(\s*['"`]([a-zA-Z0-9_.]+)['"`]/g)].map((m) => m[1]);
  expect([...new Set(used)].filter((k) => !known.has(k))).toEqual([]);
});
