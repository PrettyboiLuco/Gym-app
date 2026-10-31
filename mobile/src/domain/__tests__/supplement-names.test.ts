// Namensvorschläge im Supplement-Tracker: nur Namen, keine problematischen Stoffe (31.10.2026).

import { describe, expect, test } from '@jest/globals';

import { findClaims } from '../claims';
import { NOT_SUGGESTED, SUPPLEMENT_NAMES, suggestSupplementNames } from '../supplement-names';
import { normalize } from '../wish';

describe('Namensvorschläge Supplements', () => {
  test('alle 13 Vitamine der EU-Liste sind enthalten', () => {
    const vitamins = SUPPLEMENT_NAMES.filter((s) => s.group === 'vitamin').map((s) => s.name);
    for (const v of ['Vitamin A', 'Vitamin D', 'Vitamin E', 'Vitamin K', 'Vitamin C', 'Vitamin B6', 'Vitamin B12', 'Biotin', 'Folsäure'])
      expect(vitamins).toContain(v);
    expect(vitamins.some((v) => v.includes('B1 '))).toBe(true);
    expect(vitamins.some((v) => v.includes('B2'))).toBe(true);
    expect(vitamins.some((v) => v.includes('Niacin'))).toBe(true);
    expect(vitamins.some((v) => v.includes('Pantothen'))).toBe(true);
  });
  test('keine doppelten Namen, alles ohne Wirkversprechen', () => {
    const names = SUPPLEMENT_NAMES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    expect(findClaims(names.join('. '))).toEqual([]);
  });
  test('kein problematischer Stoff in der Liste oder in den Vorschlägen', () => {
    const all = SUPPLEMENT_NAMES.flatMap((s) => [s.name, ...(s.aliases ?? [])]).map(normalize);
    for (const bad of NOT_SUGGESTED) {
      const b = normalize(bad);
      expect([bad, all.some((n) => n.includes(b))]).toEqual([bad, false]);
      expect([bad, suggestSupplementNames(bad)]).toEqual([bad, []]);
    }
  });
  test('Suche: Anfang des Namens, andere Namen, Umlaute, höchstens 6', () => {
    expect(suggestSupplementNames('vit c')).toEqual(['Vitamin C']);
    expect(suggestSupplementNames('D3')).toEqual(['Vitamin D']);
    expect(suggestSupplementNames('Kreat')).toEqual(['Kreatin']);
    expect(suggestSupplementNames('molybdan')).toEqual([]);
    expect(suggestSupplementNames('molybdaen')).toEqual(['Molybdän']);
    expect(suggestSupplementNames('fischöl')).toEqual(['Omega-3 (Fischöl)']);
    expect(suggestSupplementNames('Vitamin').length).toBe(6);
    expect(suggestSupplementNames('v')).toEqual([]);
  });
});
