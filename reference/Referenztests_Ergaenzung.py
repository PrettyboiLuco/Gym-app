"""Ergänzende Referenztests zu Kapitel 21 (Dehnung, Körperziele, Kalorienrechner, Kalorientracker).

Isoliertes Referenzmodell mit synthetischen Daten, kein Produktionscode und keine fachliche Freigabe.
Alle Zahlenwerte in den Tests (PAL-Stufen, Untergrenze, Defizit) sind Testparameter, keine freigegebenen Regeln.
"""
import json
from decimal import Decimal as D
from datetime import date, timedelta

# Mifflin-St Jeor, Originalpopulation gesunde Erwachsene 19-78 Jahre [web:106]
POPULATION_AGE = (19, 78)
SEX_TERM = {'+5': D(5), '-161': D(-161)}

def rmr_mifflin(kg, cm, age, s):
    if s not in SEX_TERM: raise ValueError('unknown formula term')
    if kg <= 0 or cm <= 0: raise ValueError('invalid body data')
    if not POPULATION_AGE[0] <= age <= POPULATION_AGE[1]: raise ValueError('outside validated population')
    return D(10)*D(str(kg)) + D('6.25')*D(str(cm)) - D(5)*D(age) + SEX_TERM[s]

def energy_estimate(rmr, level, pal_table):
    if level not in pal_table: raise ValueError('unknown activity level')
    return rmr*D(str(pal_table[level]))

def target(estimate, goal, delta, floor):
    """Gibt (Status, kcal) zurück. Unterhalb der Untergrenze kein Automatikziel, sondern Fachprüfung."""
    delta = D(str(delta))
    if goal == 'halten' and delta != 0: raise ValueError('maintain requires zero delta')
    if goal == 'abnehmen' and delta >= 0: raise ValueError('loss requires deficit')
    if goal == 'zunehmen' and delta <= 0: raise ValueError('gain requires surplus')
    if goal not in ('halten', 'abnehmen', 'zunehmen'): raise ValueError('unknown goal')
    kcal = estimate + delta
    if kcal < D(str(floor)): return ('fachpruefung', None)
    return ('vorschlag', kcal)

def day_summary(event_kcal, goal_kcal):
    """Nur bekannte Werte summieren; unbekannte markieren den Tag als unvollständig.
    Trainings-/Schrittkalorien werden bewusst nicht gutgeschrieben (Kap. 11)."""
    known = [D(str(k)) for k in event_kcal if k is not None]
    eaten = sum(known, D(0))
    return {'eaten': eaten, 'remaining': D(str(goal_kcal)) - eaten,
            'incomplete': len(known) != len(event_kcal)}

def weight_trend(entries, end, days=7, min_entries=4):
    """Mittelwert der letzten `days` Tage; bei zu wenigen Messungen kein Trend."""
    start = end - timedelta(days=days-1)
    window = [D(str(w)) for d, w in entries if start <= d <= end]
    if len(window) < min_entries: return None
    return sum(window, D(0))/len(window)

def stretch_phases(routine, switch_s, transition_s):
    """routine: Liste (übung, haltezeit_s, beidseitig). Erzeugt Timerphasen inkl. Seitenwechsel."""
    phases = []
    for i, (name, hold, bilateral) in enumerate(routine):
        if hold <= 0: raise ValueError('hold must be positive')
        if i: phases.append(('wechsel', None, transition_s))
        if bilateral:
            phases += [('halten', name+':links', hold), ('seitenwechsel', None, switch_s), ('halten', name+':rechts', hold)]
        else:
            phases.append(('halten', name, hold))
    return phases

def run():
    results = []
    def test(name, condition):
        if not condition: raise AssertionError(name)
        results.append({'test': name, 'passed': True})
    def rejects(name, fn):
        try: fn()
        except ValueError: test(name, True)
        else: test(name, False)

    # Kalorienrechner
    test('Mifflin 80 kg/180 cm/30 J/+5 = 1780', rmr_mifflin(80, 180, 30, '+5') == 1780)
    test('Mifflin 60 kg/165 cm/25 J/-161 = 1345,25', rmr_mifflin(60, 165, 25, '-161') == D('1345.25'))
    rejects('Alter 17 außerhalb Population abgelehnt', lambda: rmr_mifflin(70, 175, 17, '+5'))
    rejects('Alter 80 außerhalb Population abgelehnt', lambda: rmr_mifflin(70, 175, 80, '+5'))
    rejects('Gewicht 0 abgelehnt', lambda: rmr_mifflin(0, 175, 30, '+5'))
    pal = {'test_mittel': '1.55'}  # Testparameter, keine freigegebene Stufe
    test('Schätzung 1780 x 1,55 = 2759', energy_estimate(D(1780), 'test_mittel', pal) == 2759)
    rejects('unbekannte Aktivitätsstufe abgelehnt', lambda: energy_estimate(D(1780), 'extrem', pal))
    test('Ziel abnehmen -500 ergibt Vorschlag 2259', target(D(2759), 'abnehmen', -500, 1200) == ('vorschlag', 2259))
    test('unter Untergrenze kein Automatikziel', target(D(1600), 'abnehmen', -500, 1200) == ('fachpruefung', None))
    rejects('abnehmen mit Überschuss abgelehnt', lambda: target(D(2000), 'abnehmen', 300, 1200))
    rejects('halten mit Delta abgelehnt', lambda: target(D(2000), 'halten', -100, 1200))
    # Kalorientracker
    s = day_summary([500, 300, None], 2000)
    test('Tag: bekannte 800 kcal gegessen, 1200 übrig', s['eaten'] == 800 and s['remaining'] == 1200)
    test('unbekannter Wert markiert Tag unvollständig', s['incomplete'])
    test('bekannte Null bleibt vollständig', not day_summary([0, 250], 2000)['incomplete'])
    test('Überschreitung ergibt negativen Rest', day_summary([1500, 800], 2000)['remaining'] == -300)
    # Körperziele / Verlauf
    end = date(2026, 10, 28)
    week = [(end - timedelta(days=i), w) for i, w in enumerate([80.0, 80.4, 79.8, 80.2, 80.6, 79.6, 80.1])]
    test('7-Tage-Mittel aus 7 Messungen', weight_trend(week, end) == D('80.1'))
    test('zu wenige Messungen ergeben keinen Trend', weight_trend(week[:3], end) is None)
    test('Messungen außerhalb des Fensters ignoriert',
         weight_trend(week + [(end - timedelta(days=30), 95.0)], end) == D('80.1'))
    goals = [{'version': 1, 'type': 'abnehmen', 'from': date(2026, 9, 1)}]
    log = [{'day': date(2026, 9, 15), 'goal_version': 1}]
    before = json.dumps(log, default=str)
    goals.append({'version': 2, 'type': 'halten', 'from': date(2026, 10, 1)})
    test('neue Zielversion ändert alte Einträge nicht', json.dumps(log, default=str) == before)
    # Dehnung
    p = stretch_phases([('beinbeuger', 30, True), ('brust', 30, False)], 5, 10)
    test('beidseitige Dehnung erzeugt links und rechts', [x[1] for x in p if x[0] == 'halten'] == ['beinbeuger:links', 'beinbeuger:rechts', 'brust'])
    test('Routinendauer 30+5+30+10+30 = 105 s', sum(x[2] for x in p) == 105)
    rejects('Haltezeit 0 abgelehnt', lambda: stretch_phases([('brust', 0, False)], 5, 10))
    return results

if __name__ == '__main__':
    result = run()
    print(json.dumps({'scope': 'Isoliertes Referenzmodell Kapitel 21; keine App-/Gerätetests, keine Fachfreigabe',
                      'passed': len(result), 'tests': result}, ensure_ascii=False, indent=2))
