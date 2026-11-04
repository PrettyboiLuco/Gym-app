# Prompt für ChatGPT: kompletter Scan der App (Zweitmeinung)

Zum Einfügen in ChatGPT. Am besten mit **GitHub-Verbindung** (ChatGPT → Einstellungen → Apps/Connectors → GitHub,
Zugriff auf `prettyboiluco/gym-app`) im Modus **Deep Research** oder in **Codex**, damit ChatGPT den echten Code liest.
Die Antwort danach komplett in die Claude-Sitzung einfügen – das Ausgabeformat ist so gebaut, dass Claude jeden Punkt
prüfen und einbauen kann.

---

```text
Du bist ein unabhängiger Senior-Entwickler und Produktdesigner für iOS-Apps (React Native/Expo) mit Erfahrung bei
Fitness- und Ernährungs-Apps (Hevy, Strong, MacroFactor, Yazio, Cronometer). Mach einen KOMPLETTEN SCAN einer App
und liefere Befunde, die ein anderer Entwickler (Claude Code) danach Punkt für Punkt prüfen und einbauen wird.

## Die App
- Repository: GitHub `prettyboiluco/gym-app`, Branch `claude/plan-ergaenzung-module` (immer diesen Branch lesen).
- App-Code liegt in `mobile/` (Expo SDK 58, React Native 0.88, React 19, expo-router, expo-sqlite, react-native-reanimated 4,
  react-native-svg, react-native-gesture-handler 3). Name „Myhealth“, Sprache Deutsch, offline, kein Konto, kein Server.
- Bereiche: Training (Pläne, Satz-Logger mit Satztabelle, Pausen-Timer, Cardio, Dehnen, HIIT, Muskelkarte, Statistik),
  Ernährung (Tagebuch, Barcode über Open Food Facts, 441 Grundnahrungsmittel offline, Rezepte, Wochenplan, Einkaufsliste,
  Wochenbudget, Mikronährstoff-Ziele, „Was fehlt mir heute?“, Fasten-Timer, Mahlzeit-Erinnerungen),
  Fortschritt (Gewicht mit Trend, Maße, Fotos, Bereitschaft/Morgen-Check, Einblicke mit Wochenmustern, Coach, Check-in).
- Orientierung zuerst lesen: `docs/Code_Struktur.md` (Schichten und Regeln), `docs/App_Audit_Taste.md` (Gestaltungsregeln),
  `docs/Ausbauplan.md` (was gebaut ist, Abschnitte A1–A11 und B1–B4), `docs/Review_2026-11-03.md` (letztes Review – NICHT
  wiederholen, was dort schon als behoben steht), `docs/Ernaehrung_Redesign.md`, `getlayers.json`.
- Feste Grundsätze, die NICHT geändert werden sollen: alles lokal/offline, kein Konto, keine Werbung, keine KI-Kosten,
  keine Serien/Streaks, keine Lebensmittel-Bewertung „gut/schlecht“, keine Heilversprechen, „sensible Situation“ und
  „Zahlen ausblenden“ zeigen keine Kalorien-/Gewichtszahlen, Gestaltung true black + Lime #C6F24E nur auf Daten +
  weiße Pillen-Knöpfe + Manrope, alle Texte in `mobile/src/i18n/de.ts`, Regeln mit Fassungsnummer (Fachprüfung).

## Was du prüfen sollst
1. **Fehler** (wichtigster Teil): falsche Rechnungen (Kalorien, Makros, Wochenbudget/Übertrag, Mikronährstoff-Ziele,
   adaptiver Energiebedarf, Fasten über Mitternacht/Zeitumstellung, Essensfenster, Trainingslast/Bereitschaft,
   Steigerung, Bestleistungen, kg/lb), Datenverlust (Migrationen in `mobile/src/data/migrations.ts`, Sicherung und
   Wiederherstellung, Löschen), Hänger (Transaktions-Warteschlange in `mobile/src/data/db.ts`), Mitteilungen
   (iOS-Limit 64, doppelte Planung), React-Probleme (Animations-Lecks, setState nach Unmount, veraltete Closures,
   Gesten-Konflikte Wischen vs. Scrollen), Barrierefreiheit (VoiceOver), Hell/Dunkel, Zahlen trotz „Zahlen ausblenden“.
   Besonders den neuen Code der letzten Commits ansehen (git log des Branches).
2. **UI-Fehler und UI-Verbesserungen**: Leite aus dem Code ab, wie die Bildschirme aussehen (`mobile/src/app/**`,
   `mobile/src/components/**`). Inkonsistenzen, zu viel Text, unklare Beschriftungen, fehlende Rückmeldungen,
   Leerzustände, Kontrast, Tipp-Flächen < 44 pt.
3. **Upgrades bestehender Funktionen** (keine komplett neuen Features): was es schon gibt, aber besser, schneller
   oder klarer sein könnte – mit Vergleich zu Hevy/Strong/MacroFactor/Yazio/Cronometer, wo es passt.

## Regeln für deine Antwort
- NUR Befunde, die du im Code belegen kannst. Nenne IMMER Datei und Zeilennummer(n) auf dem Branch oben.
  Wenn du etwas nicht sicher belegen kannst, setze „sicher: nein“ – erfinde keine Dateien, Funktionen oder Zeilen.
- Keine Stilfragen (Formatierung, Benennung), keine Wiederholung von Punkten aus `docs/Review_2026-11-03.md`.
- Konkrete Fixes: was genau an welcher Stelle zu ändern ist (gern als kurzer Code-Ausschnitt).
- Deutsch, sachlich.

## Ausgabeformat (genau so, damit es maschinell weiterverarbeitet werden kann)

### A. Gesamturteil
3–6 Sätze.

### B. Befunde
Eine Markdown-Tabelle, eine Zeile pro Befund, sortiert nach Schwere:

| ID | Art | Schwere | Datei:Zeile | Problem (1 Satz) | Szenario (Eingabe → falsches Ergebnis) | Fix (konkret) | Aufwand | sicher |
|---|---|---|---|---|---|---|---|---|

- ID: F01, F02 … für Fehler; U01 … für UI; X01 … für Upgrades
- Art: Fehler | UI | Upgrade
- Schwere: kritisch | mittel | gering (bei Upgrades: hoch | mittel | niedrig = Nutzen)
- Aufwand: S (< 1 h) | M (halber Tag) | L (> 1 Tag)
- sicher: ja (im Code belegt) | nein (Vermutung)

Mindestens: alle Fehler, die du findest; 10 UI-Punkte; 8 Upgrades.

### C. Details zu kritischen und mittleren Fehlern
Je Befund (nach ID): kurze Erklärung, Code-Ausschnitt der fehlerhaften Stelle, Vorschlag für den Fix, und wie man den
Fix testet (z. B. ein Jest-Test in `mobile/src/**/__tests__/`).

### D. Was so bleiben sollte
3–5 Stärken, die bei Änderungen nicht verloren gehen dürfen.
```
