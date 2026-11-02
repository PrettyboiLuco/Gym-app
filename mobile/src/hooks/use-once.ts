import { useCallback, useRef } from 'react';

/**
 * Sperre gegen Doppeltipp: Gibt der Handler ein Promise zurück, werden weitere Tipps ignoriert,
 * bis es fertig ist (Speichern, Buchen, Training starten). Ein gemeinsames Muster statt busy-Flags je Bildschirm.
 */
export function useOnce<A extends unknown[]>(handler: ((...args: A) => unknown) | undefined) {
  const running = useRef(false);
  return useCallback(
    (...args: A) => {
      if (!handler || running.current) return;
      const result = handler(...args);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        running.current = true;
        (result as Promise<unknown>).finally(() => {
          running.current = false;
        });
      }
    },
    [handler]
  );
}
