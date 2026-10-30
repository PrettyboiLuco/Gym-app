# Anleitung: eigene Übungsbilder einfügen (Fahrplan 9.1)

Entscheidung 30.10.2026: Die App bekommt **eigene** Bilder, keine gekauften oder fremden (keine RepDB-, Gym-visual- oder
KI-umgezeichneten Bilder – deren Bedingungen verbieten das teilweise, MEDIA-006/-008). Solange es kein Bild gibt, zeigt
die App die Textanleitung. Sobald ein Bild eingetragen ist, erscheint es automatisch in der Übungsliste (ⓘ) und im
Training.

## 0. Einheitlicher Stil (Entscheidung 30.10.2026)

Alle Bilder sollen gleich aussehen und für jeden klar verständlich sein. Vor dem ersten Bild einmal festlegen und
hier eintragen: Figur (gleiche Person/Figur in allen Bildern), Kleidung, Hintergrund, Blickwinkel (meist seitlich),
Farben, Pfeile für die Bewegungsrichtung, Start- und Endposition nebeneinander oder nur Hauptposition.

**Mit Higgsfield neu erstellen** ist möglich, mit drei Regeln:
- Nur aus eigenen Vorgaben (Text, eigene Fotos) – nie fremde Übungsbilder als Vorlage hochladen (Rechte Dritter,
  MEDIA-006/-008/-010).
- Die Standardbedingungen erlauben Higgsfield, hochgeladene Inhalte zum Verbessern des Modells zu nutzen (MEDIA-011) –
  also keine privaten Fotos von anderen Personen hochladen.
- KI-Bilder zeigen Gelenkwinkel und Haltung oft falsch: jedes Bild vor dem Einfügen prüfen und vor der Veröffentlichung
  fachlich abnehmen lassen (MEDIA-012, `movementReviewed`). Im Verzeichnis bei `origin` „Higgsfield“ angeben.

Reicht das nicht, werden Medien gekauft (Lizenz für Apps prüfen, Herkunft ebenso eintragen).

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
