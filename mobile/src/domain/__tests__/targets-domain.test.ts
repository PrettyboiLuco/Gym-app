// Ziele und Nährstoffe (Ausbauplan B2): Wochenbudget, Mikronährstoff-Ziele, Lückenvorschläge, Ernährungsformen.

import { describe, expect, test } from '@jest/globals';

import { MICRO_KEYS } from '../basis-foods';
import { applyCarryover, distributeWeek, fillGoals, planWeek, presetWeights, sanitizeBudget, stepShare, DEFAULT_BUDGET, type BudgetDay } from '../budget';
import { macrosFor } from '../coach';
import { carbLimit, dietMacros, dietProfilesFor, effectiveDietProfile, netCarbs, showsNetCarbs } from '../diet-profile';
import { MAX_PINNED, microBar, microRefs, microZone, sanitizePins, togglePin, topSources } from '../micro-targets';
import { amountOptions, fitsDiet, openGaps, rankFoods, suggestFoods, valuePer100, type GapFood } from '../nutrient-gaps';

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

describe('Wochenbudget: Verteilung', () => {
  test('Summe bleibt gleich, Wochenende höher', () => {
    const goals = Array(7).fill(2000);
    const out = distributeWeek(14000, presetWeights('wochenende', goals, [], DEFAULT_BUDGET.shares), 1500);
    expect(sum(out)).toBe(14000);
    expect(out[5]).toBe(out[6]);
    expect(out[5]).toBeGreaterThan(out[0]);
    expect(out.every((v) => v % 10 === 0)).toBe(true);
    // 5 × 100 + 2 × 115 = 730 Anteile → 14000 × 115 / 730 ≈ 2205,5
    expect(out[5]).toBeGreaterThanOrEqual(2200);
    expect(out[5]).toBeLessThanOrEqual(2210);
  });

  test('Trainingstage höher, „wie Ziel“ übernimmt die Tagesziele', () => {
    const goals = [2200, 1900, 2200, 1900, 2200, 1900, 1900];
    expect(distributeWeek(sum(goals), presetWeights('ziel', goals, [], DEFAULT_BUDGET.shares), 1200)).toEqual(goals);
    const training = distributeWeek(14000, presetWeights('training', Array(7).fill(2000), [1, 3, 5], DEFAULT_BUDGET.shares), 1200);
    expect(sum(training)).toBe(14000);
    expect(training[0]).toBeGreaterThan(training[1]);
    expect(training[0]).toBe(training[2]);
  });

  test('kein Tag unter der Untergrenze; was fehlt, tragen die anderen', () => {
    const out = distributeWeek(10500, [140, 70, 70, 70, 70, 140, 140], 1300);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(1300);
    expect(sum(out)).toBe(10500);
    expect(out[1]).toBe(1300);
  });

  test('Budget unter 7 × Untergrenze: jeder Tag auf der Untergrenze', () => {
    expect(distributeWeek(8000, Array(7).fill(100), 1200)).toEqual(Array(7).fill(1200));
  });

  test('ungerade Summen werden auf 10 kcal gerundet verteilt', () => {
    const out = distributeWeek(13997, [100, 100, 100, 100, 100, 100, 100], 1200);
    expect(sum(out)).toBe(14000);
    expect(out.every((v) => v % 10 === 0)).toBe(true);
  });

  test('Tage ohne Ziel nehmen das nächste bekannte', () => {
    expect(fillGoals([null, null, 2000, 2000, 2100, 2100, 2100])).toEqual([2000, 2000, 2000, 2000, 2100, 2100, 2100]);
    expect(fillGoals([2000, null, null, null, null, null, null])).toEqual(Array(7).fill(2000));
    expect(fillGoals(Array(7).fill(null))).toBeNull();
  });

  test('Einstellungen werden bereinigt, eigene Anteile im Rahmen 70–140 %', () => {
    expect(sanitizeBudget(null)).toEqual(DEFAULT_BUDGET);
    expect(sanitizeBudget({ enabled: true, preset: 'quatsch' as never, shares: [200, 10, 100, 100, 100, 100, 100] })).toEqual({
      enabled: true,
      preset: 'ziel',
      shares: [140, 70, 100, 100, 100, 100, 100],
      carryover: false,
    });
    expect(stepShare([140, 100, 100, 100, 100, 100, 100], 0, 1)[0]).toBe(140);
    expect(stepShare([100, 100, 100, 100, 100, 100, 100], 1, -1)[1]).toBe(95);
  });
});

describe('Wochenbudget: Übertrag', () => {
  const planned = Array(7).fill(2000);

  test('ungenutzte Kalorien verteilen sich auf die restlichen Tage', () => {
    const { targets, balance, carried } = applyCarryover(planned, [1700, 1800, null, null, null, null, null], 2, 1500);
    expect(balance).toBe(500);
    expect(targets.slice(0, 2)).toEqual([2000, 2000]);
    expect(targets[2]).toBe(2100); // 500 / 5 Tage
    expect(carried).toBe(500);
  });

  test('zu viel Gegessenes senkt die restlichen Tage, gedeckelt auf 300 je Tag', () => {
    const { targets } = applyCarryover(planned, [4000, 3500, 3500, 3000, 3000, 3000, null], 6, 1200);
    expect(targets[6]).toBe(1700);
  });

  test('nie unter die Untergrenze', () => {
    const { targets } = applyCarryover(planned, [2600, 2600, 2600, 2600, null, null, null], 4, 1900);
    expect(targets.slice(4)).toEqual([1900, 1900, 1900]);
  });

  test('unvollständige oder leere Tage zählen nicht (fehlende Werte ≠ 0)', () => {
    expect(applyCarryover(planned, [null, null, null, null, null, null, null], 3, 1200).targets).toEqual(planned);
  });

  test('planWeek: Übertrag nur aus vollständigen Tagen, Anzeige x von y', () => {
    const days: BudgetDay[] = [
      { kcal: 1500, complete: true, unknown: 0 },
      { kcal: 900, complete: false, unknown: 2 },
      { kcal: null, complete: false, unknown: 0 },
      { kcal: 600, complete: true, unknown: 0 },
      { kcal: null, complete: false, unknown: 0 },
      { kcal: null, complete: false, unknown: 0 },
      { kcal: null, complete: false, unknown: 0 },
    ];
    const week = planWeek({
      goals: Array(7).fill(2000),
      days,
      index: 2,
      trainingWeekdays: [],
      settings: { ...DEFAULT_BUDGET, enabled: true, carryover: true },
      floor: 1200,
    })!;
    expect(week.total).toBe(14000);
    expect(week.dayTarget).toBe(2100); // 500 aus Montag / 5 Tage; Dienstag zählt nicht
    expect(week.carriedToday).toBe(100);
    expect(week.eaten).toBe(2400); // bis einschließlich Mittwoch
    expect(week.unknown).toBe(true);
    const noCarry = planWeek({ goals: Array(7).fill(2000), days, index: 2, trainingWeekdays: [], settings: DEFAULT_BUDGET, floor: 1200 })!;
    expect(noCarry.dayTarget).toBe(2000);
    expect(planWeek({ goals: Array(7).fill(null), days, index: 2, trainingWeekdays: [], settings: DEFAULT_BUDGET, floor: 1200 })).toBeNull();
  });
});

describe('Mikronährstoff-Ziele', () => {
  test('für jeden Nährstoff aus den Daten ein Ziel; Untergrenze ≤ Ziel ≤ Obergrenze', () => {
    for (const term of ['+5', '-161', null] as const) {
      const refs = microRefs(term);
      for (const key of MICRO_KEYS) {
        const r = refs[key];
        expect(r.target).toBeGreaterThan(0);
        if (r.lower !== null) expect(r.lower).toBeLessThanOrEqual(r.target);
        if (r.upper !== null) expect(r.upper).toBeGreaterThan(r.target);
      }
    }
    expect(microRefs('+5').iron.target).toBe(11);
    expect(microRefs('-161').iron.target).toBe(16);
    expect(microRefs(null).iron.target).toBe(16);
    expect(microRefs(null).vitD.upper).toBe(100);
  });

  test('Zielerreichung beschreibend', () => {
    const ref = { lower: 750, target: 1000, upper: 2500 };
    expect(microZone(500, ref)).toBe('unterUntergrenze');
    expect(microZone(800, ref)).toBe('unterZiel');
    expect(microZone(1000, ref)).toBe('ziel');
    expect(microZone(3000, ref)).toBe('ueberObergrenze');
    expect(microZone(10, { lower: null, target: 20, upper: null })).toBe('unterZiel');
  });

  test('Balken: Markierungen in der richtigen Reihenfolge, Wert begrenzt', () => {
    const bar = microBar(500, { lower: 750, target: 1000, upper: 2500 });
    expect(bar.fill).toBeLessThan(bar.lower!);
    expect(bar.lower!).toBeLessThan(bar.target);
    expect(bar.upper).toBe(1);
    expect(bar.share).toBe(0.5);
    expect(microBar(99999, { lower: null, target: 4, upper: null }).fill).toBe(1);
  });

  test('höchstens drei angeheftet', () => {
    let pins = togglePin([], 'iron');
    pins = togglePin(pins, 'vitD');
    pins = togglePin(pins, 'calcium');
    expect(togglePin(pins, 'zinc')).toHaveLength(MAX_PINNED);
    expect(togglePin(pins, 'vitD')).toEqual(['iron', 'calcium']);
    expect(sanitizePins(['iron', 'iron', 'xyz', 'vitD', 'zinc', 'calcium'], MICRO_KEYS)).toEqual(['iron', 'vitD', 'zinc']);
    expect(sanitizePins('iron', MICRO_KEYS)).toEqual([]);
  });

  test('Top-Quellen des Tages nur aus Einträgen mit Angabe', () => {
    const entries = [
      { name: 'Linsen', micros: { iron: 3.3 } },
      { name: 'Brot', micros: null },
      { name: 'Spinat', micros: { iron: 2.7 } },
      { name: 'Apfel', micros: { iron: 0 } },
    ];
    expect(topSources(entries, (e) => e.micros?.iron).map((s) => s.entry.name)).toEqual(['Linsen', 'Spinat']);
  });
});

const food = (over: Partial<GapFood>): GapFood => ({
  id: 'x',
  name: 'x',
  basis: 'g',
  kcal: 100,
  protein: 0,
  fiber: 0,
  micros: null,
  portions: [],
  serving: null,
  group: 'eier_milch',
  favorite: false,
  diet: 'vegan',
  allergens: [],
  ...over,
});

describe('Was fehlt mir heute?', () => {
  const quark = food({ id: 'quark', name: 'Magerquark', kcal: 67, protein: 12, portions: [{ label: '1 Becher', g: 250 }], diet: 'vegetarisch', allergens: ['milch'] });
  const huhn = food({ id: 'huhn', name: 'Hähnchenbrust', kcal: 110, protein: 23, group: 'fleisch_fisch', diet: 'nicht_vegetarisch', portions: [{ label: '1 Filet', g: 150 }] });
  const linsen = food({ id: 'linsen', name: 'Linsen gekocht', kcal: 116, protein: 9, fiber: 8, group: 'huelsenfruechte' });
  const schoko = food({ id: 'schoko', name: 'Schokolade', kcal: 540, protein: 8, fiber: 7, group: 'suesses_snacks' });
  const eier = food({ id: 'ei', name: 'Ei', kcal: 140, protein: 13, portions: [{ label: '1 Ei (M)', g: 50 }], diet: 'vegetarisch' });

  test('Lücken ab 10 g Eiweiß, 5 g Ballaststoffe, Mikros unter 90 %', () => {
    const gaps = openGaps({
      protein: { target: 150, eaten: 145 },
      fiber: { target: 30, eaten: 12 },
      micros: [
        { key: 'iron', target: 16, eaten: 15 },
        { key: 'vitD', target: 20, eaten: 2 },
      ],
    });
    expect(gaps.map((g) => g.key)).toEqual(['fiber', 'vitD']);
    expect(gaps[0].open).toBe(18);
  });

  test('Menge schließt die Lücke, ohne das kcal-Ziel zu sprengen', () => {
    const gaps = openGaps({ protein: { target: 150, eaten: 120 }, fiber: null, micros: [] });
    const list = suggestFoods(gaps, 400, [quark, huhn, schoko]);
    expect(list.map((s) => s.food.id)).toEqual(['huhn', 'quark']); // Süßes wird nicht vorgeschlagen
    const chicken = list[0];
    expect(chicken.amount).toBe(150);
    expect(chicken.adds.protein).toBeCloseTo(34.5);
    for (const s of list) expect(s.kcal).toBeLessThanOrEqual(400);
    // wenig kcal übrig: Becher Quark (167 kcal) passt nicht mehr, Hähnchen ohne Portion unter 150 g auch nicht
    expect(suggestFoods(gaps, 120, [quark, huhn])).toEqual([]);
    expect(suggestFoods(gaps, 0, [quark, huhn])).toEqual([]);
  });

  test('kleine Portionen bis drei Stück, kleinste ausreichende Menge', () => {
    expect(amountOptions(eier).map((o) => o.amount)).toEqual([50, 100, 150]);
    const gaps = openGaps({ protein: { target: 100, eaten: 88 }, fiber: null, micros: [] });
    const [s] = suggestFoods(gaps, null, [eier]);
    expect(s.count).toBe(2);
    expect(s.amount).toBe(100); // 2 Eier: 13 g ≥ 12 g
    expect(amountOptions(food({ portions: [] })).map((o) => o.amount)).toEqual([50, 100, 150, 200]);
  });

  test('Ballaststoff-Lücke: Hülsenfrüchte vor Fleisch', () => {
    const gaps = openGaps({ protein: { target: 100, eaten: 60 }, fiber: { target: 30, eaten: 10 }, micros: [] });
    const list = suggestFoods(gaps, 800, [huhn, linsen]);
    expect(list[0].food.id).toBe('linsen');
    expect(list[0].adds.fiber).toBeGreaterThan(0);
  });

  test('Ernährungsweise und Allergien; unbekannt = nicht vorschlagen', () => {
    expect(fitsDiet(quark, 'vegan', [])).toBe(false);
    expect(fitsDiet(quark, 'vegetarisch', [])).toBe(true);
    expect(fitsDiet(quark, 'alles', ['milch'])).toBe(false);
    expect(fitsDiet(huhn, 'vegetarisch', [])).toBe(false);
    expect(fitsDiet(food({ diet: null }), 'vegetarisch', [])).toBe(false);
    expect(fitsDiet(food({ allergens: null }), 'alles', ['gluten'])).toBe(false);
    expect(fitsDiet(food({ allergens: null }), 'alles', [])).toBe(true);
  });

  test('Nährstoff-Suche je 100 g oder je 100 kcal', () => {
    const foods = [quark, huhn, schoko, linsen, food({ id: 'kraut', kcal: 5, protein: 3 }), food({ id: 'pulver', group: 'backen_sonstiges', protein: 90 })];
    expect(rankFoods(foods, 'protein', 'g100').map((r) => r.food.id)).toEqual(['huhn', 'quark', 'linsen', 'schoko', 'kraut']);
    expect(rankFoods(foods, 'protein', 'kcal100').map((r) => r.food.id)).toEqual(['huhn', 'quark', 'linsen', 'schoko']);
    expect(rankFoods(foods, 'protein', 'kcal100')[0].value).toBeCloseTo(20.9, 1);
    expect(valuePer100(food({ micros: { iron: 2 } }), 'iron')).toBe(2);
    expect(valuePer100(food({ micros: null }), 'iron')).toBeNull();
  });
});

describe('Ernährungsformen', () => {
  const base = macrosFor(2000, 130); // Coach: Fett 30 %, Rest Kohlenhydrate

  test('Ausgewogen = Coach-Werte; anderes Tagesziel nur über Kohlenhydrate', () => {
    expect(dietMacros('ausgewogen', 2000, base, 2000, null)).toEqual(base);
    expect(dietMacros('ausgewogen', 2200, base, 2000, null).carbs).toBe(base.carbs + 50);
  });

  test('Eiweiß aus dem Coach bleibt; Eiweißreich mindestens 30 %, höchstens 2,5 g/kg', () => {
    for (const p of ['lowcarb', 'keto', 'lowfat'] as const) expect(dietMacros(p, 2000, base, 2000, 80).protein).toBe(130);
    expect(dietMacros('eiweissreich', 2000, base, 2000, null).protein).toBe(150);
    expect(dietMacros('eiweissreich', 2000, base, 2000, 50).protein).toBe(130); // 2,5 × 50 = 125 < Coach 130 → Coach
    expect(dietMacros('eiweissreich', 2400, base, 2000, 70).protein).toBe(175);
  });

  test('Low-Carb, Keto, Low-Fat: Anteile und Energie stimmen', () => {
    const lowcarb = dietMacros('lowcarb', 2000, base, 2000, null);
    expect(lowcarb.carbs).toBe(100);
    expect(dietMacros('lowcarb', 3000, base, 3000, null).carbs).toBe(130);
    const keto = dietMacros('keto', 2000, base, 2000, null);
    expect(keto.carbs).toBe(30);
    expect(keto.protein * 4 + keto.carbs * 4 + keto.fat * 9).toBeGreaterThan(1990);
    expect(keto.protein * 4 + keto.carbs * 4 + keto.fat * 9).toBeLessThan(2010);
    const lowfat = dietMacros('lowfat', 2000, base, 2000, null);
    expect(lowfat.fat).toBe(44);
    expect(lowfat.fiber).toBe(base.fiber);
    expect(carbLimit('ausgewogen', 2000)).toBeNull();
  });

  test('Netto-Kohlenhydrate: EU-Angabe ohne Abzug, Gesamt-KH minus Ballaststoffe', () => {
    expect(netCarbs(40, 12)).toBe(40);
    expect(netCarbs(40, 12, 'gesamt')).toBe(28);
    expect(netCarbs(5, 12, 'gesamt')).toBe(0);
    expect(netCarbs(40, null, 'gesamt')).toBe(40);
    expect(showsNetCarbs('keto')).toBe(true);
    expect(showsNetCarbs('eiweissreich')).toBe(false);
  });

  test('bei sensibler Situation kein Low-Carb und kein Keto', () => {
    expect(dietProfilesFor(true)).toEqual(['ausgewogen', 'eiweissreich', 'lowfat']);
    expect(dietProfilesFor(false)).toHaveLength(5);
    expect(effectiveDietProfile('keto', true)).toBe('ausgewogen');
    expect(effectiveDietProfile('keto', false)).toBe('keto');
  });
});
