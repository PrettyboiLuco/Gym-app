// Deutsche Texte. Jeder sichtbare Text der App steht hier und nicht im Code (Register UX-004).
// Weitere Sprachen kommen als eigene Datei mit denselben Schlüsseln dazu.

export const de = {
  tabs: {
    today: 'Heute',
    training: 'Training',
    nutrition: 'Ernährung',
    progress: 'Fortschritt',
    more: 'Mehr',
  },
  common: {
    save: 'Speichern',
    delete: 'Löschen',
    comingSoon: 'Kommt bald',
    kg: '{{value}} kg',
  },
  today: {
    title: 'Heute',
    calories: 'Kalorien',
    caloriesHint: 'Hier siehst du bald, was du gegessen hast und wie viel noch übrig ist.',
    training: 'Training',
    trainingHint: 'Hier erscheint bald dein Trainingsplan für heute.',
    weight: 'Gewicht',
    weightNone: 'Noch kein Gewicht eingetragen.',
    weightLast: 'Zuletzt: {{kg}} am {{date}}',
  },
  training: {
    title: 'Training',
    intro: 'Bald kannst du hier Pläne anlegen, Sätze protokollieren und den Pausentimer nutzen.',
    plans: 'Trainingspläne – fertig oder selbst erstellt',
    logger: 'Satzprotokoll mit Gewicht und Wiederholungen',
    timer: 'Pausentimer zwischen den Sätzen',
    hiit: 'Fertige HIIT-Abläufe, z. B. für den Bauch',
    stretching: 'Dehnen und Mobilität',
  },
  nutrition: {
    title: 'Ernährung',
    intro: 'Bald kannst du hier Essen und Getränke eintragen.',
    tracker: 'Kalorientracker mit Tagesübersicht',
    barcode: 'Barcode-Scanner für Lebensmittel',
    calculator: 'Kalorienrechner aus Gewicht, Bewegung und Erhaltungskalorien',
    drinks: 'Wasser und Getränke',
  },
  progress: {
    title: 'Fortschritt',
    weightTitle: 'Körpergewicht',
    weightLabel: 'Gewicht in kg',
    weightPlaceholder: 'z. B. 80,5',
    weightInvalid: 'Bitte ein Gewicht zwischen 20 und 400 kg eingeben.',
    trend: '7-Tage-Durchschnitt: {{kg}}',
    trendMissing: 'Für einen Durchschnitt brauchst du mindestens 4 Messungen in 7 Tagen.',
    empty: 'Noch keine Einträge.',
    history: 'Verlauf',
  },
  more: {
    title: 'Mehr',
    privacyTitle: 'Deine Daten',
    privacy: 'Alles bleibt auf deinem Gerät. Es gibt kein Konto und nichts wird hochgeladen.',
    healthTitle: 'Hinweis',
    health:
      'Die App unterstützt allgemeine Fitness für Erwachsene. Sie ersetzt keine ärztliche oder ' +
      'fachliche Beratung. Alle Kalorienwerte sind Schätzungen.',
    languageTitle: 'Sprache',
    language: 'Deutsch. Weitere Sprachen folgen.',
    versionTitle: 'Version',
  },
};

// Gleiche Struktur, aber mit beliebigem Text – für weitere Sprachen.
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type Translations = Shape<typeof de>;
