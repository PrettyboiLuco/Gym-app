import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useDb } from '@/data/store-provider';
import type { Db } from '@/data/db';

/**
 * Lädt Daten aus der Datenbank, sobald der Bildschirm sichtbar wird, und liefert eine
 * reload-Funktion für nach dem Speichern.
 */
export function useLoad<T>(load: (db: Db) => Promise<T>, initial: T) {
  const db = useDb();
  const [data, setData] = useState<T>(initial);

  // `load` darf bei jedem Rendern neu sein; geladen wird nur bei Fokus und auf reload().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => setData(await load(db)), [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { data, reload, db };
}
