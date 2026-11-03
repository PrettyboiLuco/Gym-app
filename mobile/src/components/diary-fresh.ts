// Welche Einträge sind gerade neu dazugekommen? Für die kurze Hervorhebung nach dem Eintragen (Ausbauplan B1, N2).
// Gilt für jeden Weg ins Tagebuch (Suche, Scan, Schnelleintrag, Rezept, Text), weil nur der Stand verglichen wird.

import { useEffect, useState } from 'react';

import { freshIds } from '@/domain/diary';

/** Nach dieser Zeit gilt nichts mehr als neu (z. B. beim Umschalten der Ansicht kein zweites Aufleuchten). */
const FRESH_MS = 2500;

const EMPTY: ReadonlySet<string> = new Set();

/**
 * `day` ist der Tag, zu dem `ids` gehören (aus den geladenen Daten, nicht der gewählte Tag – sonst wäre beim
 * Tageswechsel kurz alles „neu“). Der erste Stand eines Tages hebt nichts hervor.
 */
export function useFreshEntries(day: string, ids: readonly string[], loaded: boolean): ReadonlySet<string> {
  const key = `${day}|${ids.join(',')}`;
  const [state, setState] = useState({ key: '', day: '', ids: EMPTY, fresh: EMPTY });
  // Abgeleiteter Zustand im Rendern (React-Muster „Informationen aus früheren Renderings“): so tragen die Zeilen die
  // Markierung schon beim ersten Erscheinen und können einblenden.
  if (loaded && state.key !== key) {
    const previous = state.key !== '' && state.day === day ? state.ids : null;
    setState({ key, day, ids: new Set(ids), fresh: new Set(freshIds(previous, ids)) });
  }
  useEffect(() => {
    if (state.fresh.size === 0) return;
    const id = setTimeout(() => setState((s) => ({ ...s, fresh: EMPTY })), FRESH_MS);
    return () => clearTimeout(id);
  }, [state.fresh]);
  return state.fresh;
}
