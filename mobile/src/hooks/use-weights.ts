import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useStore } from '@/data/store';
import type { WeightEntry } from '@/domain/weight';

/** Gewichtseinträge, neu geladen, sobald der Bereich sichtbar wird. */
export function useWeights() {
  const store = useStore();
  const [weights, setWeights] = useState<WeightEntry[]>([]);

  const reload = useCallback(async () => {
    setWeights(await store.listWeights());
  }, [store]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { weights, reload, store };
}
