import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Lädt neu, wenn die App wieder in den Vordergrund kommt und dieser Bildschirm sichtbar ist (Prüfung 08.11.:
 * „Heute“ zeigte morgens noch die Zahlen von gestern, bis man den Tab wechselte).
 */
export function useForegroundReload(reload: () => unknown) {
  const focused = useRef(false);
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  });
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
      };
    }, [])
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && focused.current) reloadRef.current();
    });
    return () => sub.remove();
  }, []);
}
