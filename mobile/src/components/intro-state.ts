// Start-Intro: Wer auf das Ende des Vorhangs wartet (der erste Bildschirm), meldet sich hier an. Der Vorhang ruft
// `introExiting()` zu Beginn seines Abgangs – so gleitet der Inhalt durch den verschwindenden Vorhang herein.

let exiting = false;
const waiting = new Set<() => void>();

/** Läuft das Intro noch (Inhalt soll noch warten)? */
export function introRunning(): boolean {
  return !exiting;
}

/** Ruft `cb` zu Beginn des Abgangs (sofort, wenn er schon begonnen hat). Gibt eine Abmeldung zurück. */
export function onIntroExit(cb: () => void): () => void {
  if (exiting) {
    cb();
    return () => {};
  }
  waiting.add(cb);
  return () => waiting.delete(cb);
}

export function introExiting() {
  if (exiting) return;
  exiting = true;
  for (const cb of waiting) cb();
  waiting.clear();
}
