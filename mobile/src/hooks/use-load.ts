import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { showToast } from '@/components/toast';
import type { Db } from '@/data/db';
import { t } from '@/i18n';
import { useDb } from '@/providers/store-provider';

/**
 * Lädt Daten aus der Datenbank, sobald der Bildschirm sichtbar wird oder sich `key` ändert
 * (z. B. der gewählte Tag), und liefert eine reload-Funktion für nach dem Speichern.
 */
export function useLoad<T>(load: (db: Db) => Promise<T>, initial: T, key = '') {
  const db = useDb();
  const [data, setData] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  // Schnelles Umschalten (Tag vor/zurück): nur das Ergebnis der letzten Anfrage zählt.
  const latest = useRef(0);

  // `load` darf bei jedem Rendern neu sein; geladen wird nur bei Fokus, bei neuem key und auf reload().
  const reload = useCallback(async () => {
    const request = ++latest.current;
    try {
      const result = await load(db);
      if (request === latest.current) {
        setData(result);
        setLoaded(true);
      }
    } catch {
      // Nicht ewig im Ladezustand hängen bleiben: Hinweis zeigen, der Bildschirm bleibt bedienbar (Phase 1 Scan).
      if (request === latest.current) {
        setLoaded(true);
        showToast(t('common.loadFailed'));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { data, reload, db, loaded };
}
