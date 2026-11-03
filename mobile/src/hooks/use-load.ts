import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

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
  // Immer die aktuelle `load` aufrufen: Sie schließt oft über Profil/Einstellungen ein, die sich ohne neuen key ändern
  // (z. B. Check-in „Neu berechnen“ nach Profiländerung).
  // Layout-Effekt: läuft nach jedem Rendern vor den Fokus-Effekten, also vor jedem Laden.
  const loadRef = useRef(load);
  useLayoutEffect(() => {
    loadRef.current = load;
  });

  // `load` darf bei jedem Rendern neu sein; geladen wird nur bei Fokus, bei neuem key und auf reload().
  const reload = useCallback(async () => {
    const request = ++latest.current;
    try {
      const result = await loadRef.current(db);
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
    // key löst bewusst neues Laden aus, auch wenn reload ihn selbst nicht liest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { data, reload, db, loaded };
}
