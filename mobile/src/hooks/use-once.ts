import { useCallback, useRef } from 'react';

/** So lange bleibt ein Knopf nach einem Tipp ohne Promise gesperrt (z. B. Navigation), damit sich nichts stapelt. */
const SYNC_LOCK_MS = 500;

type Gate = { running: boolean; until: number };

/**
 * Sperrlogik ohne React: Ein Promise sperrt bis zu seinem Ende, ein synchroner Handler für `lockMs`.
 * Gibt zurück, ob der Handler aufgerufen wurde.
 */
export function runOnce<A extends unknown[]>(gate: Gate, handler: ((...args: A) => unknown) | undefined, args: A, now: number, lockMs = SYNC_LOCK_MS) {
  if (!handler || gate.running || now < gate.until) return false;
  const result = handler(...args);
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    gate.running = true;
    (result as Promise<unknown>).finally(() => {
      gate.running = false;
    });
  } else {
    gate.until = now + lockMs;
  }
  return true;
}

/**
 * Sperre gegen Doppeltipp: Gibt der Handler ein Promise zurück, werden weitere Tipps ignoriert,
 * bis es fertig ist (Speichern, Buchen, Training starten). Synchrone Handler (router.push) sperren kurz,
 * sonst öffnet ein Doppeltipp denselben Bildschirm zweimal. Ein gemeinsames Muster statt busy-Flags je Bildschirm.
 */
export function useOnce<A extends unknown[]>(handler: ((...args: A) => unknown) | undefined) {
  const gate = useRef<Gate>({ running: false, until: 0 });
  return useCallback(
    (...args: A) => {
      runOnce(gate.current, handler, args, Date.now());
    },
    [handler]
  );
}
