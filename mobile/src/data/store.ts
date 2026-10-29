// Gemeinsame Schnittstelle für die lokale Datenhaltung (Register TECH-012).
// Auf dem Handy steckt SQLite dahinter, in der Web-Vorschau der Browserspeicher.

import { createContext, useContext } from 'react';

import type { WeightEntry } from '@/domain/weight';

export interface Store {
  listWeights(): Promise<WeightEntry[]>;
  addWeight(day: string, kg: number): Promise<void>;
  deleteWeight(id: string): Promise<void>;
}

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
