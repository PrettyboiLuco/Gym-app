# Prompt für ChatGPT: Scan der App in 4 Teilen (Zweitmeinung)

**Warum 4 Teile:** Die App hat rund 60.000 Zeilen Code (ohne Tests). In einem einzigen Durchlauf liest ChatGPT nur
Stichproben und behauptet trotzdem „alles geprüft“. Vier Durchläufe mit festem Dateibereich sind gründlicher, und man
sieht am Ende, welche Dateien wirklich gelesen wurden.

**Wo:** Am besten **Codex** (chatgpt.com/codex, Repository `prettyboiluco/gym-app` verbinden) – Codex kann den Code
klonen und die Tests ausführen. Sonst **Deep Research** mit GitHub-Verbindung (Einstellungen → Apps/Connectors →
GitHub). Ohne GitHub-Zugriff bitte nicht verwenden – dann rät ChatGPT.

**Ablauf:** Für jeden Teil einen neuen Chat/Task: zuerst den **gemeinsamen Teil**, direkt darunter **einen** der
Bereiche 1–4 einfügen. Jede Antwort komplett in die Claude-Sitzung kopieren.

---

## Gemeinsamer Teil (jedes Mal mitschicken)

```text
Du bist ein unabhängiger Senior-Entwickler und Produktdesigner für iOS-Apps (React Native/Expo) mit Erfahrung bei
Fitness- und Ernährungs-Apps (Hevy, Strong, MacroFactor, Yazio, Cronometer). Prüfe EINEN Bereich einer App gründlich.
Deine Befunde prüft und baut danach ein anderer Entwickler (Claude Code) ein.

## Die App
- GitHub `prettyboiluco/gym-app`, Branch `claude/plan-ergaenzung-module` (Standard-Branch). App-Code in `mobile/`:
  Expo SDK 58, React Native 0.88, React 19, expo-router, expo-sqlite, react-native-reanimated 4, react-native-svg,
  react-native-gesture-handler 3. Name „Myhealth“, Deutsch, offline, kein Konto, kein Server.
- Zuerst lesen: `docs/Code_Struktur.md` (Schichten/Regeln), `docs/App_Audit_Taste.md` (Gestaltung).
- Wenn du Code ausführen kannst: `cd mobile && npm ci && npx tsc --noEmit && npx jest` – Befunde gern mit einem
  kleinen Jest-Test belegen (Node-SQLite-Helfer: `mobile/src/data/testing/node-db.ts`).

## Bereits bekannt / behoben – NICHT erneut melden
- alles in `docs/Review_2026-11-03.md` (Abschnitte 1 und 5)
- Commit „Fehler aus der Zweitmeinung behoben“: Mahlzeit-Erinnerungen bleiben nach Ausschalten, Wisch-Löschen ohne
  Rückgängig, VoiceOver-Löschen im Tagebuch, Budget-Untergrenze ohne Hinweis, stehende Fasten-Restzeit, kalter
  `lastDayEnd`, Navigation hinter offenem Nährwerte-Fenster
- Bekannte UI-Punkte (nur melden, wenn du einen BESSEREN konkreten Fix hast): Pausenleiste + Tab-Leiste nehmen im
  Training viel Platz; „Training beenden“ sieht destruktiv aus; „Training läuft“ dreifach auf Heute; „1 Sätze“,
  „1 Portion(en)“, „Kohlenh.“; interner Vermerk „Fachprüfung offen“ im Nährwerte-Fenster; abgeschnittene
  Kachel-Untertitel; Gewichtseingabe unter Erklärtext

## Feste Grundsätze – nicht ändern
Offline, kein Konto, keine Werbung, keine KI-Kosten, keine Serien/Streaks, keine Lebensmittel-Bewertung „gut/schlecht“,
keine Heilversprechen; „sensible Situation“/„Zahlen ausblenden“ zeigen keine Kalorien-/Gewichtszahlen; Gestaltung
true black + Lime #C6F24E nur auf Daten + weiße Pillen-Knöpfe + Manrope; der grüne Lichtschein im Ernährungs-Kopf ist
gewollt; alle Texte in `mobile/src/i18n/de.ts`; Regeln mit Fassungsnummer (Fachprüfung).

## Was du prüfst (nur im angegebenen Bereich, Abhängigkeiten darfst du lesen)
1. FEHLER: falsche Rechnungen, Datenverlust, Hänger, Zeitzonen/Mitternacht/Zeitumstellung, kg/lb, React-Probleme
   (Lecks, setState nach Unmount, veraltete Closures, Doppeltipps), Barrierefreiheit, Hell/Dunkel, Zahlen trotz
   „Zahlen ausblenden“.
2. UI: Inkonsistenzen, zu viel Text, unklare Beschriftungen, fehlende Rückmeldung, Leerzustände, Tipp-Flächen < 44 pt.
3. UPGRADES bestehender Funktionen (keine komplett neuen Features): schneller, klarer, besser – mit Vergleich zu
   Hevy/Strong/MacroFactor/Yazio/Cronometer.

## Regeln
- Nur Befunde, die du im Code belegst. JEDER Befund mit Datei:Zeile UND einem wörtlichen Code-Zitat (1–5 Zeilen).
  Nicht sicher → „sicher: nein“. Keine erfundenen Dateien, Funktionen, Zeilen.
- Keine Stilfragen (Formatierung, Benennung). Deutsch, sachlich.

## Ausgabe (genau so)
### A. Stand
Commit-SHA, den du gelesen hast. Liste ALLER Dateien, die du tatsächlich vollständig gelesen hast.
### B. Gesamturteil (3–5 Sätze)
### C. Befunde – eine Markdown-Tabelle, sortiert nach Schwere
| ID | Art | Schwere | Datei:Zeile | Code-Zitat | Problem | Szenario (Eingabe → falsches Ergebnis) | Fix (konkret) | Aufwand | sicher |
ID: F.. Fehler, U.. UI, X.. Upgrade · Schwere: kritisch/mittel/gering (Upgrade: Nutzen hoch/mittel/niedrig) ·
Aufwand S (<1 h) / M (halber Tag) / L (>1 Tag) · sicher ja/nein
### D. Details zu kritischen und mittleren Fehlern: Erklärung, Fix-Code, Test-Idee
### E. Was so bleiben sollte (2–4 Punkte)
```

## Bereich 1 – Training

```text
BEREICH: Training. Dateien: mobile/src/app/training/** , mobile/src/components/{set-table,set-table-logic,set-check,
set-details,rest-timer-bar,mini-player,celebration,muscle-map,muscle-figure,exercise-picker,cardio-row,tiles}.* ,
mobile/src/domain/{training,training-stats,progression,logger,planner,programs,exercises,cardio,timeline,summary}.ts ,
mobile/src/data/{training,training-stats,training-week,cardio,plan-import,routines}.ts
```

## Bereich 2 – Ernährung

```text
BEREICH: Ernährung. Dateien: mobile/src/app/nutrition/** , mobile/src/components/{day-hero,day-summary,sheet,sheet-motion,
firmament,firmament-glow,meal-head,diary-*,target-*,day-switcher}.* , mobile/src/domain/{nutrition,budget,micro-targets,
nutrient-gaps,diet-profile,diary,fasting,meal-feeling,caffeine,food-text,recipe-import,meal-plan,basis-foods}.ts ,
mobile/src/data/{nutrition,meal-plan,fasting,meal-feeling,targets-settings,nutrient-gaps,off,basis-foods}.ts ,
mobile/src/services/nutrition-format.ts
```

## Bereich 3 – Heute, Fortschritt, Mehr

```text
BEREICH: Heute, Fortschritt, Mehr. Dateien: mobile/src/app/index.tsx , mobile/src/app/progress/** , mobile/src/app/more/** ,
mobile/src/components/{today-widgets,weight-overview,smooth-chart,coach-today,readiness,insight-*,empty-state,onboarding,
share-card}.* , mobile/src/domain/{readiness,adaptive,checkin,coach,energy,goals,weight,insights,steps,blood-pressure,
motivation}.ts , mobile/src/data/{readiness,goals,coach,insights,weights,report}.ts
```

## Bereich 4 – Daten, Sicherung, Mitteilungen, Grundgerüst

```text
BEREICH: Daten und Grundgerüst. Dateien: mobile/src/data/{db,migrations,backup,export-csv,import,notifications,reminders,
online,app-state,profile}.ts , mobile/src/domain/{backup,reminders,modules,time,dates}.ts , mobile/src/services/** ,
mobile/src/providers/** , mobile/src/hooks/** , mobile/src/app/_layout.tsx , mobile/src/components/{lock-gate,toast,
screen,card,fields,app-tabs,app-tabs.web,a11y}.* . Schwerpunkt: Datenverlust bei Migration/Sicherung/Wiederherstellung,
Transaktions-Warteschlange (`serialTransactions` in db.ts), App-Sperre, Mitteilungen (iOS-Limit 64), Start-Ablauf.
```

## Zusatz: So sieht und testet ChatGPT die Oberfläche (an jeden Prompt anhängen)

```text
## Oberfläche ansehen und testen
Die App läuft auch als Web-Vorschau (React Native Web) – gleiche Bildschirme, Texte, Zahlen und Fenster wie auf dem
iPhone. Nur Haptik, Mitteilungen, Kamera/Barcode, Face ID, Wischgesten, Glas-Tab-Leiste und Federgefühl gibt es
ausschließlich auf dem Gerät – dazu nur Code-Befunde, keine Screenshot-Befunde.

Wenn du Befehle ausführen kannst (Codex mit Internetzugang in der Umgebung):
1. cd mobile && npm ci
2. Web-Vorschau im Hintergrund starten: CI=1 npx expo start --web --port 8081   (warten bis http://localhost:8081 antwortet)
3. npm i --no-save playwright && npx playwright install chromium
4. node scripts/ui-tour.mjs ui-tour
   → legt Testdaten an (Erststart, Beispielplan „Lucs Training“, Kalorienziel 2600, vier Mahlzeiten, Wasser, Kaffee,
   Gewicht 82,4 kg, ein Training mit einem Satz) und speichert ~95 Screenshots (iPhone-13-Größe, dunkel und hell) in
   ui-tour/: alle Tabs, Statistik, Verlauf, Woche, Budget, Lücken, Fasten, Einblicke, Bereitschaft, Mehr, die Fenster
   „Nährwerte“ und „…“ einer Mahlzeit, Pause, Satztabelle und Abschluss. Am Ende steht, ob Konsolenfehler auftraten.
5. Sieh dir die Screenshots an und nenne bei UI-Befunden immer die Bilddatei (z. B. ui-tour/dark-ernaehrung-1.png).
   Für weitere Abläufe kannst du das Skript erweitern (Playwright; RN Web scrollt in einem inneren Container →
   page.mouse.wheel; Knöpfe über getByRole('button', { name })).

Wenn du nichts ausführen kannst: Der Nutzer lädt dir die Screenshots als ZIP hoch (gleiche Dateinamen) – nutze diese.
```
