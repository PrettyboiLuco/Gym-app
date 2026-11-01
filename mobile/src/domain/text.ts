// Text vereinheitlichen (Kleinschreibung, Umlaute als ae/oe/ue/ss). Zwei Varianten mit Absicht:
// - normalize: behält „/ , . -“ – zum Auslesen von Mengen und Wünschen („2,5 kg“, „push/pull“).
// - foldText: nur Buchstaben, Ziffern und % – für Suche und Namensvergleich.

/** Kleinschreibung, Umlaute als ae/oe/ue/ss, Satzzeichen außer „/ , . -“ als Leerzeichen. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9/,.\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Für Suche und Vergleich: klein, ohne Umlaute/ß, ohne Klammern und Satzzeichen. */
export function foldText(s: string): string {
  return s
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
}
