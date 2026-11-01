# Feature-Inventar führender Ernährungs-/Kalorien-Apps (Stand: Nov. 2026)

> Methodik-Hinweis: Recherche nur per WebSearch. WebFetch war in dieser Session blockiert (macrofactorapp.com, macrofactor.com, cronometer.com, thenutritionmagazine.com nicht erreichbar), darum konnte ich keine Herstellerseite direkt lesen. **Ein Großteil der Vergleichsquellen 2026 sind SEO-Blogs von Konkurrenz-Apps** (nutrola.app, nutriscan.app, calorietrackerlab.com, mycallie.app, pensumapp.com, calorix.ai, macroful.app). Sie haben ein kommerzielles Interesse und widersprechen sich oft bei Preisen und Paywall-Details. Wo es Widersprüche gibt, sind sie markiert. Seriösere bzw. primäre Quellen: TechCrunch, App-Store-Einträge (apple.com), Stronger by Science / Google Play (MacroFactor Workouts), PR Newswire (MyNetDiary), appgefahren/connect.de (FDDB, ältere Berichte). Aussagen ohne Quelle stehen nur unter „Inferences“ (mein Vorwissen, für 2026 nicht verifiziert) oder unter „Gaps“.

## 1. Erfassungs-Methoden (Barcode, Datenbank, Foto-KI, Sprache, Text, Restaurant, Rezept-Import, Vorlagen, Tag kopieren, Quick Add)

### Takeaway
2026 ist die Foto-/KI-Erfassung Standard. Bei fast allen etablierten Apps ist sie aber hinter der Paywall oder stark begrenzt (MFP: 0 kostenlose Scans seit Mai 2026; Lose It!: 3 Probeversuche; Cronometer, Yazio und FDDB: nur Premium). Die Hauptunterschiede liegen bei der Qualität der Datenbank (verifiziert oder Crowdsourcing) und bei der Frage, ob der Barcode-Scan kostenlos ist.

### Cited Findings
**Datenbank-Größe und -Qualität**
- MyFitnessPal hat die größte, aber „lauteste“ Datenbank. In einem Validierungstest lag der mittlere Fehler (MAPE) bei 11,2 %, gegenüber 4,8 % bei MacroFactor und 6,8 % bei Cronometer (Herkunft des Tests unklar) — [Clinical Nutrition Report](https://clinicalnutritionreport.com/rankings/best-calorie-counter-apps-2026/)
- Durch Nutzer-Einträge zeigt dasselbe Lebensmittel bei MFP je nach gewähltem Eintrag stark unterschiedliche Kalorien. Das ist eine häufige Reddit-Beschwerde — [Callie (Reddit-Zusammenfassung)](https://www.mycallie.app/en/blog/best-calorie-tracker-app-reddit)
- MacroFactor nutzt eine verifizierte Datenbank. Die Angaben schwanken zwischen 1,15 Mio. und über 1,36 Mio. verifizierten Einträgen — [Amy Food Journal](https://www.amyfoodjournal.com/blog/macrofactor-review); [Mealift](https://www.mealift.app/blog/macrofactor-review)
- Cronometer erfasst laut einer Quelle über 80 Mikronährstoffe aus verifizierten Quellen, eine andere nennt 95 Nährstoffe — [Clinical Nutrition Report](https://clinicalnutritionreport.com/rankings/best-calorie-counter-apps-2026/); [NutriScan](https://nutriscan.app/blog/posts/macrofactor-vs-cronometer-2026-62a278ee64)
- Nach der Übernahme ist Cal AI mit der MFP-Datenbank verknüpft. Fotos werden mit Daten zu 68.500 Marken und über 380 Restaurantketten abgeglichen (laut MealThinker) — [MealThinker](https://mealthinker.com/blog/myfitnesspal-acquires-cal-ai)
- FDDB hat eine „riesige“ Datenbank, in der man fast alle Produkte findet, und eigene Produkte lassen sich anlegen (ältere Testberichte) — [netzwelt / appgefahren via Suche](https://www.appgefahren.de/fddb-extender-kalorienzaehler-fuer-iphone-und-ipad-271105.html)

**Barcode-Scanner (kostenlos oder kostenpflichtig)**
- MFP: Der Barcode-Scan liegt seit Jahren hinter der Paywall (2022 oder 2023, die Quellen widersprechen sich) und ist die größte Reddit-Beschwerde — [useprotrack](https://useprotrack.com/blog/myfitnesspal-price-increase); [Callie](https://www.mycallie.app/en/blog/best-calorie-tracker-app-reddit)
- Cronometer: Der Barcode-Scan ist in der Free-Version enthalten — [Nutrola: Is Cronometer free](https://nutrola.app/en/blog/is-cronometer-free-2026)
- Lose It!: widersprüchlich. Laut einer Quelle ist der Barcode-Scan seit August 2026 für Neukonten Premium (Altkonten behalten ihn), laut einer anderen ist er kostenlos — [NutriScan Lose It pricing](https://nutriscan.app/blog/posts/lose-it-pricing-2026-free-vs-premium-2b4e921555); [Fitbudd](https://www.fitbudd.com/post/lose-it-premium-review)
- Yazio: widersprüchlich. Je nach Quelle ist der Barcode-Scan kostenlos oder nur in PRO — [Nutrola Yazio free vs Pro](https://nutrola.app/en/blog/yazio-free-vs-pro-what-do-you-actually-get); [NutriScan Yazio pricing](https://nutriscan.app/blog/posts/yazio-pricing-2026-free-vs-pro-what-pro-unlocks-33b26f8fc7)
- FDDB: Der Barcode-Scanner ist laut Store-Beschreibung in der Basisversion enthalten — [App Store Fddb](https://apps.apple.com/app/fddb-extender-kalorienz%C3%A4hler/id1105332761)

**Foto-/KI-Erkennung**
- MFP „Scan-a-Meal“: Bis Mai 2026 hatten Free-Nutzer 5 Scans pro Tag. Seit dem 1. Mai 2026 sind es 0, es geht also nur noch mit Premium. Das löste eine Welle von 1-Stern-Bewertungen aus — [ConsumerTechWire](https://consumertechwire.com/news/myfitnesspal-paywall-expansion-may-2026/); [Nutrition Magazine (Suchsnippet)](https://thenutritionmagazine.com/articles/myfitnesspal-paywall-changes-explained/)
- MacroFactor: Barcode-Scanner, **Nährwert-Etikett-Scanner**, „AI Describe“ (beschreiben, was man gegessen hat, per Text oder Sprache) und Foto-Logging. Foto-Logging startete 2025 als Beta und erzeugt editierbare Einträge aus einem Foto plus optionalem Text — [Amy Food Journal](https://www.amyfoodjournal.com/blog/macrofactor-review); [Mealift](https://www.mealift.app/blog/macrofactor-review)
- Cronometer: Photo Log und Voice Log nur in Gold — [Nutrola](https://nutrola.app/en/blog/is-cronometer-free-2026)
- Lose It! „Snap It“ (Foto): 3 Versuche gratis, unbegrenzt mit Premium. Das Ergebnis wird vor dem Speichern zur Prüfung angezeigt — [NutriScan Lifesum vs Lose It](https://nutriscan.app/blog/posts/lifesum-vs-lose-it-2026-photo-voice-logging-meal-plans-473027de34)
- Yazio: Die KI-Fotoerfassung war zum Start kostenlos, heute ist sie nur in PRO. Im App Store heißt die App inzwischen „Yazio: KI Kalorien Zähler“ — [tryember](https://www.tryember.eu/de/ratgeber/artikel/yazio-kostenlos); [App Store Yazio](https://apps.apple.com/de/app/yazio-ki-kalorien-z%C3%A4hler/id946099227)
- FDDB: Die App heißt im Store inzwischen „Fddb: KI Kalorienzähler & Diät-App“. Foto-KI ist laut der Konkurrenzquelle Pensum Premium — [App Store AT](https://itunes.apple.com/at/app/fddb-extender-kalorienz%C3%A4hler/id1105332761); [Pensum vs FDDB](https://pensumapp.com/pensum-vs-fddb)
- Genauigkeit der KI-Foto-Apps (nicht unabhängig verifiziert, die Rangfolge kippt je nach Quelle): Cal AI ±14,6 %, Foodvisor ±16,2 %, SnapCalorie ±19,8 % (die Quelle nennt eine „DAI Six-App Validation Study“). Nutrola misst dagegen Foodvisor mit 11,8 %, Cal AI mit 14,2 % und SnapCalorie mit 16,4 % — [CalorieTrackerLab](https://calorietrackerlab.com/compare/cal-ai-vs-foodvisor-vs-snapcalorie-photo-ai-2026/); [Nutrola 100 meals](https://nutrola.app/en/blog/we-photographed-100-meals-and-tested-every-ai-food-scanner)
- SnapCalorie bietet als einzige App **LiDAR-basierte Portionsmessung** auf iPhone Pro. Ob die App noch aktiv gepflegt wird, ist seit April 2026 unklar — [CalorieTrackerLab SnapCalorie Review](https://calorietrackerlab.com/reviews/snapcalorie/)
- Foodvisor gilt als stark bei europäischer Küche und hat einen nutzbaren Free-Tier — [CalorieTrackerLab](https://calorietrackerlab.com/bestof/best-photo-calorie-counter-app-2026/)
- In Ranglisten von Drittanbietern liegt PlateLens (KI-Foto-App) teils auf Platz 1 (96/100 vor MacroFactor mit 90) — [Clinical Nutrition Report](https://clinicalnutritionreport.com/rankings/best-calorie-counter-apps-2026/)

**Sprache und Text (natürliche Sprache)**
- Lose It! „Say It“ (Sprache): 3 Versuche gratis, sonst Premium — [NutriScan](https://nutriscan.app/blog/posts/lifesum-vs-lose-it-2026-photo-voice-logging-meal-plans-473027de34)
- MacroFactor „AI Describe“ per Text oder Sprache — [Amy Food Journal](https://www.amyfoodjournal.com/blog/macrofactor-review)
- Cronometer Voice Log nur in Gold — [Nutrola](https://nutrola.app/en/blog/is-cronometer-free-2026)

**Rezept-Import per URL**
- MFP: Rezept-Import per URL ist seit Mai 2026 Premium, ebenso die Makros pro Mahlzeit — [ConsumerTechWire](https://consumertechwire.com/news/myfitnesspal-paywall-expansion-may-2026/)

**UX der Erfassung**
- MFP v26.16.0 (April 2026) ersetzte das „Diary“ durch einen „Today“-Screen. Nutzer klagen über mehr Taps — [Callie](https://www.mycallie.app/en/blog/best-calorie-tracker-app-reddit)

### Inferences
- Aus Vorwissen (für 2026 nicht verifiziert): Quick Add (nur Kalorien oder Makros), Mahlzeit bzw. Tag kopieren, gespeicherte Mahlzeiten und Favoriten, „zuletzt gegessen“ und eigene Rezepte gehören bei MFP, Lose It!, Cronometer, Yazio, FDDB und MacroFactor zum Grundumfang, meist kostenlos. MacroFactor wirbt seit Jahren mit dem schnellsten Logging (wenige Taps, „Smart History“ mit tageszeitabhängigen Vorschlägen).
- Für Myhealth heißt das: Wettbewerbsfähig ist mindestens Barcode (kostenlos) + Foto-KI + Text/Sprache + Etikett-Scan + Rezept-URL-Import. Ein kostenloser oder großzügiger Zugang zur Foto-KI wäre ein Differenzierungsmerkmal, weil MFP und Yazio gerade dafür kritisiert werden, dass sie sie hinter die Paywall gestellt haben.
- Deutsche Produktabdeckung (FDDB, Yazio) ist für den DACH-Markt wichtiger als die reine Größe der Datenbank. Eine Anbindung an Open Food Facts (Vorwissen) wäre ein naheliegender Weg zu kostenlosem Barcode-Scan.

### Gaps
- Für Yazio, FDDB und Lifesum gibt es keine verifizierte 2026-Angabe zu Datenbankgröße oder Anteil verifizierter Einträge.
- Restaurant-Menüs (MFP hatte früher eine Restaurant-Suche) und ein DACH-Restaurant-Angebot: keine 2026-Quelle gefunden.
- Ob Meal-Templates, Tag kopieren und Quick Add irgendwo hinter der Paywall liegen, ließ sich nicht belegen.

## 2. Adaptives Coaching (dynamischer TDEE, Check-ins, Diätphasen, Refeeds, Diet Breaks)

### Takeaway
MacroFactor ist weiterhin die Referenz. Die App schätzt den tatsächlichen Energieverbrauch aus geloggter Aufnahme und Gewichtstrend und passt die Makros wöchentlich an. Das ist ihr Haupt-Kaufgrund und der meistgelobte Punkt auf Reddit. Keine andere etablierte App ist in den Quellen mit einem vergleichbaren Algorithmus belegt.

### Cited Findings
- MacroFactor schätzt den Energieverbrauch aus dem Verhältnis von geloggter Aufnahme zu Gewichtsmessungen und passt den Makroplan jede Woche automatisch an — [VimaFitness](https://www.vimafitness.com/blog/best-macro-tracking-apps-2026/); [Amy Food Journal](https://www.amyfoodjournal.com/blog/macrofactor-review)
- Der Startwert kommt aus einer generischen Formel und nähert sich nach 2–4 Wochen konsequenten Loggens und Wiegens dem echten Verbrauch an — [Mealift](https://www.mealift.app/blog/macrofactor-review)
- Widerspruch: Eine Quelle beschreibt einen wöchentlichen Check-in, der neue Ziele vorschlägt. Eine Konkurrenzquelle sagt, der „Coached“-Modus wende die Anpassung automatisch an, ohne Check-in — [Amy Food Journal](https://www.amyfoodjournal.com/blog/macrofactor-review); [NutriScan MFP vs MacroFactor](https://nutriscan.app/blog/posts/myfitnesspal-vs-macrofactor-2026-which-paid-tracker-b86a2f0b87)
- MacroFactor hat **keinen Free-Tier**: 7 Tage Testphase, dann 11,99 $/Monat, 47,99 $/6 Monate oder 71,99 $/Jahr (US, Stand Aug./Sep. 2026) — [Amy Food Journal](https://www.amyfoodjournal.com/blog/macrofactor-review); [Mealift](https://www.mealift.app/blog/macrofactor-review)
- Reddit: Der Algorithmus für adaptive Ziele wird gelobt, ebenso das klare Design und das schnelle Logging. Der Haupteinwand ist der Preis — [TheSaaSDir](https://thesaasdir.com/blog/best-calorie-tracker-app-reddit/); [CalorieTrackerLab Reddit](https://calorietrackerlab.com/articles/reddit-best-calorie-tracker-2026/)
- MFP: Laut einer einzelnen, unbestätigten Quelle brachte das „Summer Release“ (25.08.2026) einen **AI Coach** für Premium und Premium+ sowie einen kostenlosen Progress-Tab — [Roid](https://roid.app/guides/myfitnesspal-premium-worth-it)

### Inferences
- Aus Vorwissen (für 2026 nicht verifiziert): MacroFactor bietet die Programmtypen Abnehmen, Aufbauen und Halten, eine wählbare Rate (z. B. % Körpergewicht pro Woche), Coached oder Collaborative bzw. Manual, Makro-Zyklen mit unterschiedlichen Zielen pro Wochentag sowie eine Gewichtstrend-Glättung. Cronometer Gold hat ein „Macro Scheduling“ (Ziele pro Wochentag). Explizite Refeed- und Diet-Break-Planer oder einen Reverse-Diet-Modus habe ich in keiner Quelle belegt gefunden.
- Für Myhealth, das bereits Gewichtsprognosen hat, ist ein adaptiver TDEE aus Gewichtstrend und Aufnahme die wertvollste Coaching-Funktion. Fertige Diätphasen (Cut, Bulk, Erhalt, Reverse) mit automatischem Wechsel wären eine echte Lücke im Markt.

### Gaps
- MacroFactors Herstellerseiten (Changelog, Annual Report 2026) waren nicht abrufbar. Details zu Reverse Diet, Refeeds und Diet Breaks bleiben unbestätigt.
- Ob Yazio, Lifesum oder Lose It! 2026 adaptive Kalorienziele haben, ist nicht belegt.

## 3. Mikronährstoffe, Zielwerte, Wasser/Koffein/Alkohol, Food-Scores, Intervallfasten

### Takeaway
Cronometer bleibt der Maßstab für Mikronährstoffe, und auch die Free-Version deckt sie voll ab. Yazio und FDDB sind im DACH-Raum stark beim Intervallfasten. Lifesum setzt auf einen zusammengesetzten Ernährungs-Score („Life Score“), der nur in Premium aktiv ist.

### Cited Findings
- Cronometer Free enthält Barcode-Scan, Geräte-Sync und das volle Mikronährstoff-Tracking. Berichte gehen nur über 7 Tage, und es gibt Werbung. Gold bringt Fasten-Timer, Uhrzeiten pro Mahlzeit, unbegrenzte Berichtshistorie und keine Werbung — [Nutrola](https://nutrola.app/en/blog/is-cronometer-free-2026); [Turbulence Gains](https://turbulencegains.com/cronometer-gold-review-2025/)
- Cronometer gilt als Wahl für Leute, die „alles aufs Gramm wiegen“. Kritik gibt es am klinischen, veralteten UI und an der steilen Lernkurve — [Callie](https://www.mycallie.app/en/blog/best-calorie-tracker-app-reddit)
- In der r/MacroFactor-Community wird ein besseres Mikronährstoff-Tracking gewünscht — [TheSaaSDir](https://thesaasdir.com/blog/best-calorie-tracker-app-reddit/)
- Lifesum **Life Score**: ein zusammengesetzter Wellness-Wert aus Essmustern, Makro-Balance, Lebensmittelqualität und Gewohnheiten. Free-Nutzer sehen nur eine Teaser-Karte — [Nutrola Lifesum free](https://nutrola.app/en/blog/is-lifesum-free-anymore)
- Lifesum Premium-only: Diätpläne, Rezeptbibliothek, eigene Makros, Life Score. Free: Basis-Logging, Datenbank, Kalorienziel, Gewicht — [BestCalorieApps](https://bestcalorieapps.com/en/reviews/lifesum/)
- Yazio Intervallfasten: In Free sind nur 16:8 und wenige Einsteiger-Optionen enthalten, weitere Fastenpläne gibt es in PRO — [Nutrola Yazio free](https://nutrola.app/en/blog/is-yazio-free-anymore)
- Yazio Free: Kalorien, Lebensmittelsuche, Wasser- und Gewichtstracking, einfacher Fasten-Timer, mit Werbung. PRO: detaillierte Mikronährstoffe, Statistiken über bis zu 2 Jahre, Mahlzeitenplanung — [calorix](https://calorix.ai/de/vergleich/yazio-kosten/); [tryember](https://www.tryember.eu/de/ratgeber/artikel/yazio-kostenlos)
- Ein Test mit deutschen Gerichten sieht Yazio stark bei der deutschen Rezeptdatenbank und den Fasten-Timern (Herausgeber ist ein Wettbewerber) — [NutriScan DE](https://nutriscan.app/de/blog/posts/nutrition-apps-germany-review)
- FDDB hat einen Fasten-Tracker. Laut Konkurrenzquelle sind eigene Makroziele nur in Premium — [App Store Fddb](https://apps.apple.com/de/app/fddb-kalorien-z%C3%A4hler-fasten/id1105332761); [Pensum vs FDDB](https://pensumapp.com/pensum-vs-fddb)
- GLP-1-Begleitfunktionen sind 2025/26 ein neuer Trend: MyNetDiary startete im Mai 2026 einen „GLP-1 Companion“ in Premium mit Spritzen-Erinnerungen, Protein-Tracking, Protokoll für Verdauungssymptome und Mahlzeitenplanung — [PR Newswire](https://www.prnewswire.com/news-releases/mynetdiary-launches-glp-1-companion-for-ozempic-wegovy-and-mounjaro-users-302761158.html)
- Spezialisierte GLP-1-Apps: MeAgain (Spritzen- und Pillen-Tracking, Logging per Foto, Barcode, Sprache und Quick Add, Ziele für Protein, Ballaststoffe und Wasser) und Shotsy (Dosis-Log, geschätzte Medikamentenspiegel-Kurve, Nebenwirkungen, PDF-Export für den Arzt) — [MeAgain](https://meagain.com/); [Shotsy-Vergleich](https://shotsyapp.com/best-glp-1-tracker-apps/)
- Helsa schätzt glykämischen Index und glykämische Last der geloggten Mahlzeiten ohne CGM — [Helsa](https://helsa.health/)

### Inferences
- Aus Vorwissen (nicht 2026-verifiziert): Lose It!, MFP, Yazio und Cronometer haben Wasser-Tracker. Cronometer und MacroFactor erlauben eigene Ziele pro Nährstoff. Koffein und Alkohol werden in Cronometer als Nährstoffe erfasst. Yazio hat eine Lebensmittel-Bewertung („gut/schlecht“-Hinweise), deren 2026-Stand ich nicht belegen konnte.
- Für Myhealth als Fitness-App sind Protein- und Ballaststoff-Ziele, ein einfacher Fasten-Timer und ein GLP-1-Modus (Protein-Fokus, Muskelerhalt, Spritzen-Erinnerung, Symptom-Log) besonders relevant, weil GLP-1-Nutzer Krafttraining zum Muskelerhalt brauchen.

### Gaps
- Kein belegter 2026-Stand zu Yazios Lebensmittel-Bewertung, zu Koffein- und Alkohol-Trackern und zu Nährstoffzahlen bei Yazio und FDDB.
- Keine Quelle bestätigt eine direkte CGM-Datenintegration (Dexcom, Abbott Lingo, Libre) in Cronometer, MFP oder Lifesum für 2026.

## 4. Rezepte, Meal-Plans, Einkaufslisten, Vorrat, Budget

### Takeaway
Rezeptbibliotheken und Meal-Plans sind fast überall Premium (Yazio PRO mit 2.900–3.000+ Rezepten und Einkaufslisten, Lifesum Premium mit Diätplänen, Lose It! Premium mit Meal Planning). Vorrats- und Budget-Funktionen habe ich bei keiner der großen Apps belegt gefunden. Das ist eine potenzielle Lücke im Markt.

### Cited Findings
- Yazio PRO: über 3.000 Rezepte und Einkaufslisten (laut Yazio-Hilfebereich, zitiert von einem Vergleichsportal), anderswo 2.900+. In Free sind nur wenige Rezepte zugänglich — [calorix](https://calorix.ai/de/vergleich/yazio-kosten/); [NutriScan Yazio](https://nutriscan.app/blog/posts/yazio-pro-worth-it-2026-4f450da831)
- Lifesum: Diätpläne und Rezeptbibliothek nur in Premium — [BestCalorieApps](https://bestcalorieapps.com/en/reviews/lifesum/)
- Lose It!: „Meal & Exercise Planning“ in Premium, ohne kuratierte Programme — [NutriScan Lifesum vs Lose It](https://nutriscan.app/blog/posts/lifesum-vs-lose-it-2026-photo-voice-logging-meal-plans-473027de34)
- MFP: Rezept-URL-Import seit Mai 2026 Premium — [ConsumerTechWire](https://consumertechwire.com/news/myfitnesspal-paywall-expansion-may-2026/)
- MyNetDiary GLP-1 Companion enthält Mahlzeitenplanung — [PR Newswire](https://www.prnewswire.com/news-releases/mynetdiary-launches-glp-1-companion-for-ozempic-wegovy-and-mounjaro-users-302761158.html)

### Inferences
- Aus Vorwissen (nicht 2026-verifiziert): MFP Premium+ bündelt einen Meal-Planner mit Einkaufsliste (früher über die übernommene Firma „Intent“). Das erklärt plausibel den Aufpreis von etwa 20 $ gegenüber Premium.
- Ein Meal-Plan-Generator, der die adaptiven Makroziele trifft und daraus eine Einkaufsliste macht, idealerweise mit deutschen Supermarktprodukten, wäre für Myhealth eine Differenzierung. Vorrat und Budget scheint kein großer Anbieter abzudecken.

### Gaps
- Kein belegter Inhalt von MFP Premium+ für 2026 (der NutriScan-Artikel „Premium vs Premium+“ war nur als Titel sichtbar).
- Keine Belege zu Vorrats- und Budget-Funktionen.

## 5. Integrationen (Apple Health, Health Connect, Garmin, Fitbit, Waagen, CGM, Trainingskalorien)

### Takeaway
Direkte Garmin-Connect-Integration ist laut Quellen vor allem eine Stärke von MFP und Cronometer. Andere Apps gehen den Weg über Apple Health oder Health Connect. Bei Yazio und FDDB hängen Tracker-Sync und Health Connect teilweise an Premium. Eine echte CGM-Integration ist bei Mainstream-Apps nicht belegt.

### Cited Findings
- MFP und Cronometer haben direkte Garmin-Connect-Integrationen. Lose It! läuft über die Brücke Apple Health bzw. Health Connect — [CalorieTrackerLab Smartwatch](https://calorietrackerlab.com/bestof/best-calorie-tracker-with-smartwatch-integration-2026/)
- Yazio und Garmin: widersprüchlich. Eine Quelle sagt, Yazio habe den Garmin-Support in Version 9.2 entfernt, eine andere listet Garmin als unterstützt — [CalorieTrackerLab](https://calorietrackerlab.com/bestof/best-calorie-tracker-with-smartwatch-integration-2026/); [Wearables Nutrition Matrix](https://wearablesnutrition.com/compatibility-matrix/)
- Yazio PRO enthält laut deutschen Ratgebern die Synchronisation mit Fitbit, Garmin, Polar und Samsung Health — [calorix](https://calorix.ai/de/vergleich/yazio-kosten/)
- FDDB: Laut Konkurrenzquelle sind Health Connect und die Tracker-Kopplung Premium. Ein älterer Testbericht nennt Apple Health, Garmin und Fitbit — [Pensum vs FDDB](https://pensumapp.com/pensum-vs-fddb); [connect.de](https://www.connect.de/testbericht/fddb-extender-test-android-diaet-app-kalorienzaehler-2773043.html)
- Cronometer: Geräte-Sync ist in Free enthalten — [Nutrola](https://nutrola.app/en/blog/is-cronometer-free-2026)
- MacroFactor Workouts soll im nächsten großen Release Workouts in Apple Health schreiben — [MacroFactor Jan 2026 (Suchsnippet)](https://macrofactor.com/mm-jan-2026/)

### Inferences
- Aus Vorwissen (nicht 2026-verifiziert): Bei MFP, Lose It! und Cronometer lassen sich Trainingskalorien zum Tagesziel addieren (oft mit Wahl zwischen „alle“, „anteilig“ und „keine“). MacroFactor ignoriert Trainingskalorien bewusst, weil sein adaptiver TDEE die Aktivität bereits einrechnet. Smarte Waagen (Withings, Renpho, Eufy) laufen meist über Apple Health oder Health Connect.
- Myhealth hat als Gym-App einen Vorteil: Trainingsdaten sind nativ vorhanden. Eine „Trainingstag- vs. Ruhetag-Makro“-Logik oder die automatische Einrechnung von Trainingskalorien ist naheliegend.

### Gaps
- CGM-Integration (Dexcom, Libre, Lingo) in den großen Apps 2026: keine Quelle gefunden. Signos und Levels sind CGM-first-Apps, aber nicht verifiziert.
- Fitbit-Status nach Googles Umstellung auf Health Connect: nicht recherchiert.

## 6. UX (Widgets, Apple Watch/Wear OS, Siri/Shortcuts, Offline, Export, Sync, Familie)

### Takeaway
Die Apple-Watch-App von Lose It! gilt als die ausgereifteste (watch-first). Die Uhr-Apps von MFP und Cronometer sind eher rudimentär. FDDB hat eine Watch-App, bei der Widgets laut Konkurrenz Premium sind. Familien- bzw. geteilte Konten habe ich bei keiner großen App belegt gefunden.

### Cited Findings
- Lose It! hat die am weitesten entwickelte Apple-Watch-App, „designed for watch-first workflows“. Die MFP-Watch-App funktioniert, wirkt aber zweitrangig. Cronometer bietet auf der Uhr nur Quick-Log. Yazio wird für eine klare Glance-UI gelobt. PlateLens gilt laut einer Matrix vom April 2026 als die polierteste Watch-App — [CalorieTrackerLab Apple Watch](https://calorietrackerlab.com/bestof/best-calorie-tracking-app-for-apple-watch-2026/); [Wearables Nutrition Matrix](https://wearablesnutrition.com/compatibility-matrix/)
- Die FDDB-Watch-App braucht watchOS 9+ und zeigt Kalorien, Wasser und Nährstoffe, dazu gibt es Komplikationen fürs Zifferblatt (Bericht teils älter) — [App Store Fddb](https://apps.apple.com/app/fddb-extender-kalorienz%C3%A4hler/id1105332761); [appgefahren Watch](https://www.appgefahren.de/kalorienzaehler-fddb-extender-mit-neuer-apple-watch-app-291000.html)
- FDDB: Alle Widgets sind Premium (laut Konkurrenzquelle) — [Pensum vs FDDB](https://pensumapp.com/pensum-vs-fddb)
- MacroFactor Workouts hat seit dem Launch im Januar 2026 Workouts auf der Apple Watch — [MacroFactor Annual Report 2026 (Suchsnippet)](https://macrofactor.com/annual-report-2026/)
- Cronometer Free: Berichte nur über 7 Tage, unbegrenzte Historie gibt es nur mit Gold. Yazio PRO: Statistiken über bis zu 2 Jahre — [Nutrola](https://nutrola.app/en/blog/is-cronometer-free-2026); [calorix](https://calorix.ai/de/vergleich/yazio-kosten/)
- Shotsy (GLP-1) bietet „doctor-ready PDF exports“ — [Shotsy-Vergleich](https://shotsyapp.com/best-glp-1-tracker-apps/)

### Inferences
- Aus Vorwissen (nicht 2026-verifiziert): MFP und Cronometer bieten Datenexport als CSV (MFP nur Premium). Cronometer hat eine vollwertige Web-App. MacroFactor bietet Widgets und vollständigen Datenexport. Siri-Shortcuts gibt es vereinzelt (z. B. Wasser loggen). Wear OS wird kaum ernsthaft unterstützt, das ist eine mögliche Marktlücke.
- Interaktive Home-Screen- und Lock-Screen-Widgets (z. B. „Wasser +250 ml“, „Protein übrig“) sowie Live Activities für den Fasten-Timer sind für Myhealth günstige Quick-Wins.

### Gaps
- Kein belegter 2026-Stand zu Offline-Modus, Familien- oder geteilten Konten, Siri/App Intents und Wear-OS-Apps bei den großen Anbietern.

## 7. Social, Community, Gamification

### Takeaway
Lose It! ist die Gamification-App (Challenges, Abzeichen, Streaks), Yazio hat Streaks. MacroFactor und Cronometer verzichten weitgehend darauf. Insgesamt war die Quellenlage zu Social-Features 2026 dünn.

### Cited Findings
- Lose It! hat eingebaute Challenges und wird als „gamifizierter Kalorienzähler, der dich zurückkommen lässt“ beschrieben — [CalorieTrackerLab](https://calorietrackerlab.com/bestof/best-calorie-tracker-with-smartwatch-integration-2026/); [Gaya Review](https://www.trygaya.com/review/lose-it-review)
- Yazio bietet Meal-Plans, Streaks und solides Tracking — [CalorieTrackerLab](https://calorietrackerlab.com/bestof/best-calorie-tracker-with-smartwatch-integration-2026/)
- WeightWatchers kombiniert im GLP-1-Programm Logging mit Workshops, Community und Zugang zu Ernährungsberatern — [Shotsy-Vergleich](https://shotsyapp.com/best-glp-1-tracker-apps/)

### Inferences
- Aus Vorwissen (nicht 2026-verifiziert): MFP hat Freunde, einen Newsfeed und Community-Foren (die Foren wurden zeitweise eingeschränkt). Lose It! bietet Freunde, Abzeichen und Gruppen-Challenges.
- Für Myhealth passen Streaks und Abzeichen, die Training und Ernährung koppeln (z. B. „Proteinziel an 5 von 7 Trainingstagen“), gut zum bestehenden Bestleistungs-System.

### Gaps
- Keine verlässliche 2026-Quelle zu MFP-Community, Lifesum-Challenges und Yazio-Social-Features.

## 8. Monetarisierung, Paywall, Preise (inkl. DE/EU)

### Takeaway
2025/26 haben die großen Apps die Paywall deutlich ausgeweitet (MFP Mai 2026, Lose It! Preis verdoppelt, Yazio und FDDB Foto-KI nur Premium). FDDB ist im DACH-Raum die günstigste und großzügigste Free-Option. MacroFactor hat bewusst keinen Free-Tier. Konsolidierung: MFP hat Cal AI übernommen.

### Cited Findings
| App | Free-Tier | Preis (laut Quellen, Stand 2026) | Quelle |
|---|---|---|---|
| MyFitnessPal | ja, stark eingeschränkt (kein Barcode, seit 05/2026 keine Foto-Scans, kein URL-Import, keine Makros pro Mahlzeit) | Premium 19,99 $/Monat bzw. 79,99 $/Jahr; Premium+ 24,99 $/Monat bzw. 99,99 $/Jahr (laut einer Quelle schon seit April 2025 unverändert) | [useprotrack](https://useprotrack.com/blog/myfitnesspal-price-increase); [ConsumerTechWire](https://consumertechwire.com/news/myfitnesspal-paywall-expansion-may-2026/) |
| MacroFactor | nein, 7 Tage Test | 11,99 $/Monat, 47,99 $/6 Monate, 71,99 $/Jahr (US) | [Amy Food Journal](https://www.amyfoodjournal.com/blog/macrofactor-review) |
| Cronometer | ja, großzügig (Mikros, Barcode, Sync; Werbung, 7-Tage-Berichte) | Gold meist 59,99 $/Jahr bzw. 10,99 $/Monat; andere Quellen 49,99 $/Jahr (widersprüchlich) | [Nutrola](https://nutrola.app/en/blog/how-much-does-cronometer-cost-now-2026) |
| Lose It! | ja (3 Probe-Snaps und -Say-Its, Barcode umstritten) | 79,99 $/Jahr (vorher 39,99 $), kein Monatsabo; Lifetime 299,99 $ bzw. 229,99 $ für Bestandskunden | [NutriScan](https://nutriscan.app/blog/posts/lose-it-pricing-2026-free-vs-premium-2b4e921555) |
| Lifesum | ja, Basis | 44,99–54,99 $/Jahr (US); EU geschätzt ca. 8–10 €/Monat bzw. ca. 49,99 €/Jahr (unbestätigt) | [BestCalorieApps](https://bestcalorieapps.com/en/reviews/lifesum/); [Nutrient Metrics](https://nutrient-metrics.com/en/guides/lifesum-price-increase-analysis/) |
| Yazio | ja, mit Werbung | DE App Store: PRO 23,90–83,90 € für 12 Monate (Aktionspreise schwanken stark); andere Angaben 6,99 €/Monat bzw. 44,99 €/Jahr | [mahlzait](https://www.mahlzait.de/kalorienzaehler-app/); [Nutrola DE](https://nutrola.app/de/blog/was-ist-die-beste-kalorienzaehler-app) |
| FDDB | ja, laut Anbieter Kalorienzähler und Tagebuch kostenlos und werbefrei (Nutrola widerspricht: Werbung, veraltetes Design) | Jahresabo 19,99–39,99 € (App Store); Listenpreis Premium 39,99 €/Jahr | [mahlzait](https://www.mahlzait.de/kalorienzaehler-app/); [Pensum](https://pensumapp.com/pensum-vs-fddb); [nextpit](https://www.nextpit.de/kaufberatungen/die-besten-kalorienzaehler-apps) |
| Cal AI | Download kostenlos, Foto-Scan nur im Abo | stark widersprüchlich: 19,99–79 $/Jahr | [NutriScan Cal AI](https://nutriscan.app/blog/posts/cal-ai-pricing-2026-monthly-yearly-premium-abc6e7b26f); [CalorieTrackerLab](https://calorietrackerlab.com/compare/cal-ai-vs-foodvisor-vs-snapcalorie-photo-ai-2026/) |
| Foodvisor | ja | meist 39,99 $/Jahr; eine Quelle 83,99 $/Jahr bzw. 14,99 $/Monat | [CalorieTrackerLab](https://calorietrackerlab.com/compare/cal-ai-vs-foodvisor-vs-snapcalorie-photo-ai-2026/) |
| SnapCalorie | 3 KI-Fotos pro Tag gratis (eine Quelle) | 8,99 $/Monat oder 19,99 $/Monat bzw. 149 $/Jahr (widersprüchlich) | [CalorieTrackerLab](https://calorietrackerlab.com/reviews/snapcalorie/) |

- MFP übernahm Cal AI (Bekanntgabe 02.03.2026). Cal AI hatte über 15 Mio. Downloads und über 30 Mio. $ Jahresumsatz und soll laut TechCrunch eigenständig bleiben. Laut Nutrition Magazine werden Nutzer migriert, was widersprüchlich ist — [TechCrunch](https://techcrunch.com/2026/03/02/myfitnesspal-has-acquired-cal-ai-the-viral-calorie-app-built-by-teens/); [Hoot Fitness](https://www.hootfitness.com/blog/myfitnesspal-acquired-cal-ai)
- MFP gehört Francisco Partners. Laut Reuters (09.04.2026, über Wikipedia, nicht selbst verifiziert) wird ein Verkauf erwogen — [Wikipedia](https://en.wikipedia.org/wiki/MyFitnessPal)
- Yazio hat im deutschen App Store 4,6 Sterne bei über 300.000 Bewertungen — [App Store Yazio DE](https://apps.apple.com/de/app/yazio-ki-kalorien-z%C3%A4hler/id946099227)
- MacroFactor Workouts (separate Trainings-App des MacroFactor-Teams, Launch Januar 2026) erstellt Kraft- und Hypertrophiepläne und passt sie an die geloggte Leistung an. Abo nach 7 Tagen Test — [Stronger by Science](https://www.strongerbyscience.com/macrofactor-workouts-survey/); [App Store MF Workouts](https://apps.apple.com/app/id6737156524)

### Inferences
- Der Markt bewegt sich zu „Ernährung + Training in einem Ökosystem“ (MacroFactor Workouts, MFP mit Cal AI). Für Myhealth als Gym-App mit Ernährungsteil ist das Bestätigung und Bedrohung zugleich: MacroFactor greift gerade das Kernterrain an.
- Preisanker DE: FDDB ca. 20–40 €/Jahr, Yazio effektiv oft 24–45 €/Jahr bei Aktionen, MacroFactor ca. 72 $/Jahr. Kostenloser Barcode-Scan und ein werbefreier Free-Tier sind im DACH-Raum durch FDDB quasi Erwartung.

### Gaps
- Offizielle EU- und DE-Preise für MacroFactor, Cronometer, Lose It! und Lifesum: nicht verifiziert.
- Keine Stiftung-Warentest-, CHIP- oder t3n-Tests von 2025/26 in den Suchergebnissen.

## 9. Nutzer-Stimmung: Lob, Beschwerden, Wunsch-Features

### Takeaway
Die drei größten Ärgernisse sind (1) Paywall-Ausweitung bei Funktionen, die früher gratis waren (Barcode, Foto-Scan, URL-Import), (2) ungenaue Crowdsourcing-Daten mit vielen Duplikaten und (3) UI-Umbauten, die mehr Taps kosten. Gelobt werden adaptive Ziele (MacroFactor), Genauigkeit und ein großzügiger Free-Tier (Cronometer) sowie Logging-Geschwindigkeit.

### Cited Findings
- MFP ist die meistgenannte und meistkritisierte App. Größter Kritikpunkt ist der Barcode-Scan hinter der Paywall, neu dazu kommt der „Today“-Screen aus v26.16.0 (April 2026) mit mehr Taps — [Callie](https://www.mycallie.app/en/blog/best-calorie-tracker-app-reddit)
- MFP-Paywall vom 1. Mai 2026: Welle von 1-Stern-Bewertungen in beiden Stores — [ConsumerTechWire](https://consumertechwire.com/news/myfitnesspal-paywall-expansion-may-2026/)
- Cronometer bekommt die wärmsten Kommentare zu Genauigkeit und Free-Tier, Kritik gibt es am klinischen UI — [Callie](https://www.mycallie.app/en/blog/best-calorie-tracker-app-reddit)
- MacroFactor: Lob für Algorithmus, Design und Logging-Tempo. Fast jeder „worth it?“-Thread dreht sich um den Preis. Gewünscht wird mehr Mikronährstoff-Tracking — [TheSaaSDir](https://thesaasdir.com/blog/best-calorie-tracker-app-reddit/)
- Rangfolge nach Subreddit (widersprüchlich): Cronometer führt in r/loseit, MacroFactor in r/fitness und r/MacroFactor. Andere Auswertungen nennen MFP am häufigsten, Cronometer am positivsten — [CalorieTrackerLab Reddit](https://calorietrackerlab.com/articles/reddit-best-calorie-tracker-2026/); [Callie](https://www.mycallie.app/en/blog/best-calorie-tracker-app-reddit)
- FDDB wird als günstige Referenz-Datenbank gelobt, gilt aber als aktiver Tracker weniger komfortabel und optisch veraltet — [Nutrola DE](https://nutrola.app/de/blog/was-ist-die-beste-kalorienzaehler-app)

### Inferences
- Aus den Beschwerden abgeleitete Chancen für Myhealth: verifizierte, deduplizierte Lebensmittel-DB mit DACH-Fokus; Kern-Logging (Barcode, Quick Add, Kopieren) dauerhaft kostenlos; Foto-KI immer als editierbarer Vorschlag mit Portionskorrektur (das Prinzip „verify before logging“ bei Snap It wird positiv gesehen); minimale Taps; adaptiver TDEE ohne MacroFactor-Preis; Mikronährstoffe ohne Cronometer-Komplexität.

### Gaps
- Original-Reddit-Threads und App-Store-Reviews konnte ich nicht direkt lesen, nur Zusammenfassungen von Drittseiten, die selbst kommerzielle Interessen haben.
- Kein belegtes Stimmungsbild zu Yazio und FDDB aus deutschen Foren oder Reviews.
