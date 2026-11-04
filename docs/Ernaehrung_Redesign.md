# Ernährungsseite neu (04.11.2026) – Bauplan nach getlayers.ai

Wunsch Luc: „Die Kalorien-Seite sieht zu langweilig aus, und die Fenster kommen nicht von getlayers.“
Entscheidung Luc: Kopf **„Lichtbühne“**, Fenster **„Platte federt auf“**. Festgehalten in `getlayers.json` (Projektwurzel).

Grundregeln bleiben: true black flat, Lime (`theme.accent`, hell `theme.tint`) nur auf Daten, weiße Pillen-Knöpfe,
Manrope für Zahlen und Überschriften, alle Texte in `i18n/de.ts`, „Bewegung reduzieren“ beachten, sensible Situation
bzw. „Zahlen ausblenden“ zeigen keine Zahlen, Module beachten. Keine neuen Pakete.

## 1. Fenster: „Platte federt auf“ (getlayers Section `loader-lumora`, Bewegung = preserve)

Neue Komponente `components/sheet.tsx` (`Sheet` + `SheetRow`), ersetzt jedes Blatt der Ernährung:

- Transparentes `Modal` (`animationType="none"`, `transparent`), dunkler Hintergrund (`rgba(0,0,0,0.55)`) blendet ein.
- **Platte**: unten verankert, obere Ecken Radius 28, Hintergrund `theme.backgroundElement` (dunkel #111), Griffleiste
  oben (36×4, `theme.backgroundSelected`). Öffnen: `translateY` von Plattenhöhe → 0 mit **Feder Spannung 220, Reibung 30,
  Masse 1** (Reanimated `withSpring({ stiffness: 220, damping: 30, mass: 1 })` – das ist dieselbe Physik wie react-spring
  tension/friction). Schließen: Inhalt geht zuerst (**Feder 260/26, 12 px Drift nach unten, Deckkraft → 0**), die Platte
  folgt mit 220/30 nach unten; `onClose` erst, wenn die Platte ruht.
- **Inhalt steigt durch die Bewegung hinein** (getlayers „Reveal choreography“: Gate beim START der Bewegung, nicht am
  Ende): `SheetRow index={i}` blendet nach der Leiter **150, 200, 250, 300, 400, 550, 650, 750, 900 ms** (ab Index 9:
  +100 ms je Zeile, höchstens 1200 ms) ein, je Zeile Feder 170/26, von `translateY 10 px`/Deckkraft 0 auf 0/1.
- Schließen per Antippen des Hintergrunds, per Zurück (Android) und per **Wischen nach unten** (react-native-gesture-handler
  `Gesture.Pan`; ab 120 px oder Geschwindigkeit > 800 schließen, sonst zurückfedern 220/30). Web: Wischen optional.
- **App-Sperre**: gesperrt (`useAppLocked()`) → nichts zeigen, sofort zu (wie bisher).
- „Bewegung reduzieren“: alles sofort, ohne Federn.
- Kopf: Titel (Manrope 20) links, runder Schließen-Knopf rechts (wie bisher), optional `footer` unten fest.
- Inhalt scrollt (`ScrollView`), Höhe höchstens 88 % des Bildschirms, Sicherheitsabstand unten.

Umstellen auf `Sheet`: `components/diary-sheet.tsx` (darüber laufen „Kopieren auf …“ und „Mehr Getränke“),
`MicrosSheet` in `components/day-summary.tsx`, und das neue Mahlzeiten-Optionen-Fenster (Abschnitt 3). Jede Zeile in
diesen Fenstern ist eine `SheetRow`.

**Inhalt der Fenster nach getlayers-Komposition `vesper-faq`**: ein Panel, kleiner Punkt + zentrierter Titel nicht
nötig – aber volle Breite, Zeilen mit Haarlinie oben getrennt, jede Zeile eine Einheit (Name links, Wert/Balken rechts).
Das Vitamin-Fenster heißt jetzt **„Nährwerte“** und enthält zuerst Ballaststoffe, Zucker, gesättigte Fettsäuren, Salz
(Haarlinien-Zeilen, Wert rechtsbündig, Ziffern gleicher Breite), darunter die Vitamine/Mineralstoffe wie bisher
(`TargetMicroBar` bzw. Summen), Hinweise und Knöpfe wie bisher.

## 2. Kopf: „Lichtbühne“ (Komposition `altitude-stats` + Verlauf `firmament`, Roll `firmament-004`)

Neue Komponenten `components/firmament-glow.tsx` und `components/day-hero.tsx`; `DaySummary` nutzt `DayHero` oben.

**Lichtschein** (`firmament-glow.tsx`): Der Shader läuft in der App nicht und `storage.getlayers.ai` ist gesperrt, also
Nachbau als `react-native-svg`-Verlauf aus den CONFIG-Werten des Rolls **firmament-004**:
`bgColor #020603, colorA #0b2b12, colorB #2f7a28, colorC #7fd93f, colorD #eaffd6, horizon 0.16, curve 2.2, glow 0.55,
vignette 0.45, breathe 0.06, speed 0.33`.
- Ein `RadialGradient` mit Mittelpunkt unten Mitte (cy ≈ 1 + horizon·0.5, also leicht unter der Kante), rx ≈ 0.9 Breite,
  ry ≈ 0.75 Höhe. Stopps aus der Rampe des Shaders `ramp4(t)` (A→B bei t 0–0.36, B→C 0.32–0.70, C→D 0.66–1.0), wobei die
  Helligkeit t über den Abstand d mit `t = (1 - d)^curve` fällt – also Stopps bei d = 0, 0.12, 0.25, 0.4, 0.6, 1.0 mit der
  jeweils berechneten Farbe und Deckkraft `glow`-gewichtet (Kern ≈ 0.55, außen 0). Grund der Karte: `bgColor`.
  Die Stopps **im Code berechnen** (kleine reine Funktion in `domain/` oder neben der Komponente, mit Test), nicht raten.
- Vignette: zweiter Verlauf, Ränder um `vignette` (0.45) abgedunkelt.
- **Atmen** (`breathe 0.06`, `speed 0.33`): Deckkraft des Scheins pendelt ruhig ±6 % mit Periode 2π/0.33 ≈ 19 s
  (Reanimated `withRepeat`, sinusförmig); bei „Bewegung reduzieren“ still.
- Hellmodus (Ton nie mischen): Roll `firmament-018` (hell): `colorB #8fa96b, colorC #c9d6a8, colorD #f5f3e4`, Kern sehr
  zart (Deckkraft ≤ 0.35) auf `theme.backgroundElement`, keine dunkle Vignette.

**Aufbau** (`day-hero.tsx`) nach `altitude-stats`, schmale Fassung (390 px): oben mittig der **Ring** (ca. 168 px,
Strich 12, `growIn`, Lime bzw. Rot nur über dem Ziel) mit **Prozent vom Ziel** groß in der Mitte (Manrope 34) und
„vom Ziel“ klein darunter; ohne Ziel: gegessene kcal in der Mitte. Darunter eine **Haarlinie über die volle Breite**, darauf
links „**Gegessen**“ (Zahl groß, Manrope 28, hochzählend mit `useCountUp`, Einheit klein grau), rechts „**Übrig**“ bzw.
„**Drüber**“ (Rot) rechtsbündig, in der Mitte ein **Punkt** und darunter „Ziel 2600 kcal“ klein. Zahlen und Titel gleich
groß (Regel der Komposition). Darunter die **Makro-Leiste**: drei Spalten (Eiweiß in Datenfarbe, Kohlenh. hell, Fett grau)
mit Wert („133 g“), dünnem Balken (`MeterBar growIn`, Höhe 4) und „von 160 g“ bzw. „29 % kcal“ – ohne graue Kacheln.
Alle bisherigen Angaben bleiben erhalten („≥“ bei unbekannten Werten, Wochenbudget/Netto-KH/angeheftete Nährstoffe über
`TargetDayExtras` unter der Makro-Leiste, Zeile „Nährwerte“ öffnet das Fenster). Die Karte hat Radius 28 und den
Lichtschein hinter dem Ring (der Schein liegt unter dem Ring, Text bleibt gut lesbar – die Komposition ist „safest asset
to put text on“).
- Die Hinweise „Training wird nicht dazugerechnet …“, „geschätzt“, „Noch kein Kalorienziel …“ werden über die vorhandene
  Komponente `components/insight-info.tsx` („i“ / „Mehr erfahren“) eingeklappt statt als Fließtext.
- Leerer Tag: Ring leer mit „0 %“, darunter „Noch nichts eingetragen“ und der Knopf „Ganzen Vortag übernehmen“ wie bisher.

## 3. Mahlzeiten: Komposition `lumora-services` (Schiene aus Haarlinien-Zeilen)

Statt vier gleich aussehender Karten mit je drei Knopfreihen: **eine Karte „Mahlzeiten“**. Je Mahlzeit ein Block:
- Kopfzeile: kleine Index-Zahl („01“–„04“, `textSecondary`, Ziffern gleicher Breite), Mahlzeitname (Manrope 18), rechts
  kcal-Summe (Ziffern gleicher Breite) und ein **runder „+“-Knopf** (40 px, weiß gefüllt wie der Hauptknopf) → Hinzufügen;
  daneben ein runder „…“-Knopf (`backgroundSelected`) → **Mahlzeiten-Optionen-Fenster** (`Sheet`): „Wie am Vortag“
  (nur bei leerer Mahlzeit), „Kopieren auf …“, „Als Vorlage speichern“, und das Befinden (`DiaryMealFeeling`) –
  jede Zeile eine `SheetRow`. Vorlagen-Name im Fenster eingeben statt in der Karte.
- Darunter die Einträge (vorhandene `DiaryEntryRow`, Wischen zum Löschen bleibt).
- Blöcke durch eine Haarlinie getrennt (`theme.backgroundSelected`), keine eigenen Karten.
- Einblenden beim Laden: die Blöcke steigen gestaffelt auf (Leiter wie oben, einmal je Bildschirmaufruf).
- Rückmeldungen („2 Einträge kopiert“ usw.) als Toast (`showToast`) statt Text in der Karte.
- Ansicht „Zeitleiste“ bleibt (Segmented), sieht aber genauso aus (Karte mit Haarlinien-Zeilen).

## 4. Getränke

- Kopf wie die Mahlzeiten-Blöcke (Name, Summe „950 ml von 2,5 l“ rechts, runder „+“ für „Anderes Getränk“).
- Wasserglas + Schnellwahl bleiben, aber kompakter: die Wasser-Knöpfe als eine Reihe (horizontal scrollbar), Koffein-Chips
  als zweite Reihe; die langen DGE-/EFSA-Texte hinter `insight-info`.
- „Mehr …“ öffnet das `Sheet`.

## 5. Bereiche unten

Statt der langen Liste ein **2er-Raster** mit `TileGrid`/`CardRow` aus `components/tiles.tsx` (Woche, Wochenplan,
Rezeptbuch, Rezepte, Supplements, Was fehlt mir heute?, Fasten-Timer (nur ohne sensible Situation), Einstellungen),
mit **eigenen Symbolen** je Kachel – nicht zweimal derselbe Kalender bzw. dasselbe Buch (in `components/icon.tsx` bei
Bedarf zwei, drei Symbole ergänzen: z. B. `week`, `planner`, `recipe`, `cart`).

## Prüfen

tsc, Lint (0 Warnungen), Prettier, alle Tests grün; neue reine Logik (Verlaufs-Stopps, Zeilen-Verzögerungen) getestet.
Browser (Web-Vorschau, iPhone-Größe, hell + dunkel) mit Einträgen: Seite, jedes Fenster offen. Screenshots ablegen unter
dem Scratchpad (siehe Auftrag).

## Umgesetzt (04.11.2026)

**Neu:** `components/sheet.tsx` (`Sheet`, `SheetRow`, `Rise`, `useSheetClose`), `components/sheet-motion.ts` (Zeilen-Leiter,
Wischgrenze), `components/firmament.ts` (Rampe `ramp4`, Stopps, Lichtpunkt, Atem-Periode), `components/firmament-glow.tsx`,
`components/day-hero.tsx` (`HeroCard`, `DayHero`), `components/meal-head.tsx` (Kopfzeile Index/Name/Summe/„+“/„…“),
`components/diary-meal-options.tsx` (Mahlzeiten-Optionen), Test `components/__tests__/firmament-sheet.test.ts`.
Bewegungswerte in `constants/motion.ts` → `SheetMotion`. Symbole `more`, `week`, `planner`, `recipe` in `icon.tsx`.

**Umgebaut:** `app/nutrition/index.tsx`, `day-summary.tsx` (Fenster „Nährwerte“ statt Vitamin-Fenster und Extras-Raster),
`diary-copy-sheet.tsx`, `diary-drinks.tsx`, `diary-meal-feeling.tsx` (nur noch die Stufen, im Fenster), `diary-entry-row.tsx`
(`last`), `target-day-extras.tsx` (Haarlinie statt Kasten), `tiles.tsx` (Titel bis zwei Zeilen), `hooks/use-count-up.ts`
(`fromPrevious`). `diary-sheet.tsx` entfällt (ersetzt durch `Sheet`). Texte in `i18n/de.ts` ergänzt bzw. ungenutzte entfernt
(`summary.title`, `summary.goal`, `drinks.quick`, `feeling.edit`, `feeling.done`).

**Abweichungen (mit Grund):**
- Wischen: react-native-gesture-handler 3.3 ist installiert, dort ist `Gesture.Pan` die Altform – genutzt wird
  `usePanGesture` + `GestureDetector` (gleiche Physik). Gewischt wird an Griffleiste und Kopf, damit das Scrollen im Inhalt
  nicht mit dem Schließen streitet. Funktioniert auch im Web.
- Schließen: „die Platte folgt“ hat im Bauplan keine Zahl – sie startet 80 ms nach dem Inhalt (`SheetMotion.exitLagMs`).
- Lichtschein: liegt auf der **Bühne** (Ring bis zur Haarlinie), nicht unter der ganzen Karte; die Haarlinie ist der
  Horizont, rx/ry beziehen sich auf die Bühne. So stehen Zahlen, Makros und Zeilen darunter auf ruhigem Grund (Lesbarkeit).
  Ellipse über `viewBox 100×120` + `preserveAspectRatio="none"` (rx/ry des RadialGradient gibt es im Web nicht).
- Atmen: Deckkraft 0,88–1,0 (Mitte 0,94) statt um 1,0 – der Schein wird nie heller als die CONFIG-Werte.
- Hell (firmament-018): `colorA` ist nicht festgelegt → gleich `colorB`.
- Leerer Tag ohne Ziel zeigt „0 kcal“ im Ring (ohne Ziel gibt es keine Prozent).
- Hinweis „Einträge ohne Kalorienangabe“ bleibt sichtbar (rot), weil er die Summe betrifft; eingeklappt sind „Wie wird
  gezählt?“ (Training/geschätzt) und „Noch kein Ziel“.
- Getränke: eigene Karte mit gleichem Kopf wie die Mahlzeiten (statt Block in der Mahlzeiten-Karte); „Mehr …“ ist der
  letzte Chip der Koffein-Reihe; „Koffein heute“ steht neben dem Glas, DGE-/EFSA-Text hinter „Trinkmenge und Koffein“.
- Befinden: Eingabe im Optionen-Fenster, die Kurzzeile („Hunger: mittel · …“) bleibt unter den Einträgen sichtbar.
  Mahlzeit nur mit Rezepten: statt „Als Vorlage speichern“ der vorhandene Hinweis `templateNoFoods`.
- Sensible Situation: Verhalten wie bisher (Ziele/Wochenbudget/Vitamin-Ziele aus, Fasten-Kachel aus); ohne Zahlen nur bei
  „Zahlen ausblenden“ – dann zeigt die Bühne nur „N Einträge. Zahlen sind ausgeblendet“.

**Geprüft:** tsc, Lint (0 Warnungen), Prettier, Jest (78 Suiten, 906 Tests). Browser iPhone-13-Größe dunkel/hell, alle
Fenster offen, „Bewegung reduzieren“ (Fenster sofort voll da), Wischen nach unten. Nur am iPhone prüfbar: Federgefühl der
Platte, Wischen im nativen Modal, Tastatur über dem Vorlagen-Namen, VoiceOver-Reihenfolge im Fenster, App-Sperre bei offenem
Fenster.
