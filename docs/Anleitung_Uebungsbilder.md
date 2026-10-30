# Anleitung: eigene Übungsbilder einfügen (Fahrplan 9.1)

Entscheidung 30.10.2026: Die App bekommt **eigene** Bilder, keine gekauften oder fremden (keine RepDB-, Gym-visual- oder
KI-umgezeichneten Bilder – deren Bedingungen verbieten das teilweise, MEDIA-006/-008). Solange es kein Bild gibt, zeigt
die App die Textanleitung. Sobald ein Bild eingetragen ist, erscheint es automatisch in der Übungsliste (ⓘ) und im
Training.

## 1. Bild vorbereiten

- **Format:** WebP oder PNG, quadratisch, 800 × 800 Pixel, heller oder transparenter Hintergrund.
- **Inhalt:** eine Person (du oder jemand mit schriftlicher Einwilligung) in der wichtigsten Position der Übung;
  kein fremdes Logo, keine Marke im Bild, keine anderen Personen im Hintergrund.
- **Dateiname = Übungs-ID**, z. B. `kniebeuge.webp`. Die IDs stehen in `mobile/src/domain/exercises.ts`.
- Ablegen in `mobile/assets/exercises/`.

## 2. Im Verzeichnis eintragen

In `mobile/src/media/exercise-media.ts` einen Eintrag ergänzen:

```ts
{
  exerciseId: 'kniebeuge',
  source: require('@/assets/exercises/kniebeuge.webp'),
  kind: 'bild',
  author: 'Luc',
  license: 'eigenes Werk',
  origin: 'eigenes Foto, Studio XY',
  checkedAt: '2026-11-15',
  movementReviewed: false,
},
```

- `movementReviewed` erst auf `true`, wenn eine Fachperson die Ausführung auf dem Bild geprüft hat (MEDIA-012,
  Phase 10.1). Bis dahin steht unter dem Bild „Bewegung noch nicht fachlich geprüft“.
- Ein automatischer Test prüft jeden Eintrag (Übung existiert, Autor/Lizenz/Herkunft ausgefüllt, Datum, keine Doppelten).

## 3. Prüfen

```bash
cd mobile
npm test          # Verzeichnis gültig?
npx expo start    # Übungen → Übung antippen → Bild sichtbar?
```

Mit Claude Code: „Füge die Bilder aus `mobile/assets/exercises/` ins Verzeichnis ein“ genügt.
