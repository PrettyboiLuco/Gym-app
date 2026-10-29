// Web-Vorschau: speichert im Browser statt in SQLite, damit die Vorschau ohne besondere
// Server-Einstellungen läuft. Auf dem Handy wird store-provider.tsx verwendet.

import { useMemo, type ReactNode } from 'react';

import type { WeightEntry } from '@/domain/weight';

import { newId, StoreContext, type Store } from './store';

const KEY = 'gym-app.weights';

function read(): WeightEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as WeightEntry[];
  } catch {
    return [];
  }
}

function write(entries: WeightEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Ohne Browserspeicher bleibt die Vorschau trotzdem bedienbar.
  }
}

let memory: WeightEntry[] | null = null;

const webStore: Store = {
  listWeights: async () => {
    memory ??= read();
    return [...memory].sort((a, b) => b.day.localeCompare(a.day));
  },
  addWeight: async (day, kg) => {
    memory ??= read();
    memory = [...memory, { id: newId(), day, kg }];
    write(memory);
  },
  deleteWeight: async (id) => {
    memory ??= read();
    memory = memory.filter((e) => e.id !== id);
    write(memory);
  },
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => webStore, []);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
