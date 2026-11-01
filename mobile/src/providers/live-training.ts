// Laufendes Training für die Tab-Leiste (Mini-Player): wird alle 2 Sekunden leise nachgeschaut,
// solange die App sichtbar ist. Liest nur, schreibt nichts.

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { loadTimedRun } from '@/data/routines';
import { useDb } from './store-provider';
import { getActiveSession, loadRestTimer, type SessionInfo } from '@/data/training';
import type { RestTimer } from '@/domain/training';

export type LiveTraining = { session: SessionInfo | null; timer: RestTimer; timedTitle: string | null };

const EMPTY: LiveTraining = { session: null, timer: null, timedTitle: null };

export function useLiveTraining(): LiveTraining {
  const db = useDb();
  const [live, setLive] = useState<LiveTraining>(EMPTY);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (AppState.currentState === 'background') return;
      try {
        const [session, timer, timed] = await Promise.all([getActiveSession(db), loadRestTimer(db), loadTimedRun(db)]);
        if (!alive) return;
        setLive((old) => {
          const next = { session: session ?? null, timer: session ? timer : null, timedTitle: timed?.title ?? null };
          return JSON.stringify(old) === JSON.stringify(next) ? old : next;
        });
      } catch {
        // Datenbank gerade beschäftigt – beim nächsten Takt wieder.
      }
    };
    check();
    const id = setInterval(check, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [db]);
  return live;
}
