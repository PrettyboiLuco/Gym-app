/// <reference types="node" />
// Hilfe/FAQ (UX-005) und Prüfung auf unzulässige Versprechen in App- und Store-Texten (10.4: COACH-011, HIIT-006).

import { describe, expect, test } from '@jest/globals';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { de } from '@/i18n/de';

import { findClaims } from '../claims';
import { HELP_QUESTIONS, HELP_SECTIONS, searchHelp, type HelpQuestion } from '../help';

const text = (id: HelpQuestion) => de.help.q[id];

/** Alle Texte der Sprachdatei mit ihrem Schlüssel. */
function allStrings(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (node && typeof node === 'object') return Object.entries(node).flatMap(([k, v]) => allStrings(v, path ? `${path}.${k}` : k));
  return [];
}

describe('Hilfe und häufige Fragen', () => {
  test('jede Frage hat Frage, Antwort und genau einen Bereich', () => {
    expect(new Set(HELP_QUESTIONS).size).toBe(HELP_QUESTIONS.length);
    for (const id of HELP_QUESTIONS) {
      expect(text(id).q.endsWith('?') || text(id).q.endsWith('.')).toBe(true);
      expect(text(id).a.length).toBeGreaterThan(20);
    }
    for (const s of HELP_SECTIONS) expect(de.help.sections).toHaveProperty(s.id);
    expect(Object.keys(de.help.q).sort()).toEqual([...HELP_QUESTIONS].sort());
  });

  test('Suche ohne Umlaut- und Groß-/Kleinschreibungs-Unterschied, mehrere Wörter = alle müssen passen', () => {
    expect(searchHelp('', text)).toEqual(HELP_QUESTIONS);
    expect(searchHelp('  ', text)).toEqual(HELP_QUESTIONS);
    expect(searchHelp('SICHERUNG', text)).toContain('sicherung');
    expect(searchHelp('loeschen', text)).toContain('loeschen');
    expect(searchHelp('löschen', text)).toContain('loeschen');
    expect(searchHelp('neues handy', text)).toEqual(expect.arrayContaining(['neuesHandy']));
    expect(searchHelp('xyzunbekannt', text)).toEqual([]);
  });
});

describe('Keine unzulässigen Versprechen', () => {
  test('erkennt typische falsche Aussagen', () => {
    expect(findClaims('Mit diesem Programm Bauchfett wegtrainieren!').map((h) => h.rule)).toContain('bauchfett');
    expect(findClaims('Cardio bringt nichts.').map((h) => h.rule)).toContain('cardio');
    expect(findClaims('Garantiert 5 kg in 14 Tagen.').map((h) => h.rule)).toContain('garantie');
    expect(findClaims('100 % Erfolg für jeden.').map((h) => h.rule)).toContain('garantie');
    expect(findClaims('Die App heilt Rückenschmerzen.').map((h) => h.rule)).toContain('medizin');
    expect(findClaims('Alle Pläne sind wissenschaftlich bewiesen.').map((h) => h.rule)).toContain('geprueft');
    expect(findClaims('Dieses Produkt ist allergenfrei.').map((h) => h.rule)).toContain('allergenfrei');
    expect(findClaims('Die beste App für dein Training.').map((h) => h.rule)).toContain('superlativ');
  });

  test('Aufklärung mit Verneinung und Fragen sind erlaubt', () => {
    expect(findClaims('Gezielt Bauchfett abbauen kann keine Übung.')).toEqual([]);
    expect(findClaims('Die App kann nie zusichern, dass etwas allergenfrei ist.')).toEqual([]);
    expect(findClaims('Sind die Empfehlungen fachlich geprüft?')).toEqual([]);
  });

  test('alle App-Texte (Sprachdatei)', () => {
    const hits = allStrings(de).flatMap(([key, value]) => findClaims(value).map((h) => `${key} [${h.rule}]: ${h.sentence}`));
    expect(hits).toEqual([]);
  });

  test('Store-Texte (docs/Store_Texte.md), sobald vorhanden', () => {
    const file = join(__dirname, '../../../../docs/Store_Texte.md');
    if (!existsSync(file)) return;
    // Nur der Teil zwischen den Markierungen ist der echte Store-Text; die Prüfliste darunter nennt Verbotenes absichtlich.
    const content = readFileSync(file, 'utf8');
    const start = content.indexOf('<!-- store:start -->');
    const end = content.indexOf('<!-- store:end -->');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const store = content.slice(start, end).replace(/^[#|>*-].*$/gm, (line: string) => line.replace(/^[#|>*-]+/, ''));
    expect(findClaims(store).map((h) => `[${h.rule}] ${h.sentence}`)).toEqual([]);
  });

  test('Store-Texte halten Apples Längen ein', () => {
    const file = join(__dirname, '../../../../docs/Store_Texte.md');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf8');
    const block = content.slice(content.indexOf('<!-- store:start -->'), content.indexOf('<!-- store:end -->'));
    const fields = Object.fromEntries(
      block
        .split('\n## ')
        .slice(1)
        .map((section) => {
          const [title, ...body] = section.split('\n');
          return [title.split(' (')[0], body.join('\n').trim()];
        })
    );
    const limits: Record<string, number> = { Name: 30, Untertitel: 30, Werbetext: 170, Beschreibung: 4000, 'Stichwörter': 100 };
    for (const [field, max] of Object.entries(limits)) {
      expect(fields[field]?.length ?? 0).toBeGreaterThan(0);
      expect([field, [...fields[field]].length <= max]).toEqual([field, true]);
    }
    expect(fields['Stichwörter']).not.toMatch(/\s/);
  });
});
