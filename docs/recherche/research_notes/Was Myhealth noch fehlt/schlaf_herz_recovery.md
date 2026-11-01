# Schlaf-, Herz- und Recovery-Apps: Feature-Inventar 2025–2026 (Vergleichsbasis für Myhealth)

Stand der Recherche: 01.11.2026. Methode: Websuche und Abruf ausgewählter Seiten. Hinweis: In dieser Cloud-Sitzung waren einige Domains nicht erreichbar (u. a. support.apple.com, insider.fitt.co). Aussagen dazu stammen deshalb aus Such-Snippets oder Sekundärquellen und sind als solche markiert. Viele Preise kommen aus Review-Blogs oder App-Store-Listings und schwanken je nach Land und Datum. Punkte, die nur aus Vorwissen (Trainingsdaten) stammen und in dieser Sitzung nicht belegt wurden, stehen ausdrücklich unter "Inferences" oder "Gaps".

## 1. Schlaf: Messmethoden, Schlafphasen, Score, Schlafschuld, Rhythmus, Smart Alarm, Schnarchen, Coaching

### Takeaway
Schlafphasen und Schlafdauer messen kann nur Hardware (Uhr, Ring, Band). Ein Handy kann sie lesen (HealthKit/Health Connect) oder über Mikrofon und Bewegungssensor grob schätzen, wie Sleep Cycle es macht. Die wertvollsten Schlaf-Features, die man ohne Hardware nachbauen kann, sind Logik auf vorhandenen Daten: Schlafschuld und Sleep Bank (Rise, AutoSleep), Regelmäßigkeit und Bettzeit-Empfehlung (Apple, Samsung), Energieplan nach Tagesrhythmus (Rise), Schlaf-Score aus Dauer, Regelmäßigkeit und Unterbrechungen (Apple) und ein Smart Alarm über das Mikrofon (Sleep Cycle).

### Cited Findings
**Apple (watchOS 26, Sept. 2025)**
- watchOS 26 hat einen Schlaf-Score eingeführt. Jede Nacht bekommt eine Bewertung und eine Kategorie, gestützt auf Dauer, Regelmäßigkeit der Bettzeit und Unterbrechungen. Zu sehen ist er in der Schlaf-App, im Smart Stack und als Komplikation. watchOS 26.2 bringt Mitteilungseinstellungen für den Score und eine verfeinerte Klassifizierung. — [MacRumors](https://www.macrumors.com/2025/09/15/apple-releases-watchos-26/); [Apple Support (Snippet; Seite in dieser Sitzung nicht abrufbar)](https://support.apple.com/en-us/123002)
- Eine Sekundärquelle nennt den Score 0–100 und zählt die Zeit in Schlafphasen mit. Das steht nicht in Apples eigenen Release Notes. — [TechTimes 2026](https://www.techtimes.com/articles/314370/20260130/apple-watch-health-features-complete-guide-tracking-heart-sleep-vitals.htm)

**Samsung Health (Galaxy Watch8 / One UI 8 Watch, 2025)**
- "Bedtime Guidance" empfiehlt die Schlafenszeit nach Tagesrhythmus und Schlafdruck. Es braucht 3 Nächte Daten und reagiert auch, wenn man mehrere Tage später ins Bett geht als geplant oder unregelmäßig schläft. — [Samsung Newsroom](https://news.samsung.com/global/new-features-on-one-ui-8-watch-help-users-build-healthier-habits); [Samsung UK Support](https://www.samsung.com/uk/support/mobile-devices/health-features-on-the-galaxy-watch8-and-watch8-classic/)

**Rise Science (Phone-first, Wearable optional)**
- Rise rechnet drei Kerngrößen: den persönlichen Schlafbedarf, die Schlafschuld über ein 14-Nächte-Fenster und das zirkadiane Timing. Daraus entsteht ein täglicher "Energy Schedule" mit Hochs, Tiefs, einem "Melatonin Window" für die Bettzeit und einer Aufwachzone am Morgen. Schlafphasen überlässt Rise verbundenen Wearables. Ein Wearable ist aber nicht nötig: Auf Android stammen Schlafbedarf, Schlafschuld und Energieplan aus der Handynutzung und optionalen Wearables. — [Rise Blog (Eigenquelle)](https://www.risescience.com/blog/rise-app-review); [App Store](https://apps.apple.com/us/app/rise-sleep-tracker/id1453884781)
- Dazu kommen Gewohnheits-Erinnerungen (Habit Reminders), Fortschrittsanzeigen und Lernartikel. — [Sleepopolis](https://sleepopolis.com/sleep-accessories/rise-sleep-and-energy-app-review/)

**Sleep Cycle (Phone-only, Mikrofon)**
- Sleep Cycle analysiert den Schlaf über das Handy-Mikrofon und weckt in der leichtesten Schlafphase (Smart Alarm). Es erkennt Schnarchen und Husten. Weitere Features: Schlafphasen, "AI Sleep Coach", erweiterte Schlafanalyse. Premium bringt Klangwelten, Einschlafgeschichten, Datenexport, Philips-Hue-Sonnenaufgang und Apple-Health-Sync. — [App Store](https://apps.apple.com/app/sleep-cycle-smart-alarm-clock/id320606217)
- Sleep Cycle kann den Schlaf auch vom Nachttisch aus über Geräusche bewerten, das Handy muss also nicht im Bett liegen (ältere Meldung). — [iCulture (NL)](https://www.iculture.nl/sleep-cycle-alarm-clock-update-geluid-opnemen/)

**AutoSleep (Apple Watch, Einmalkauf)**
- Der Bereich "Wellness" zeigt die "Sleep Bank" als Liniengrafik mit Schlafschuld oder Schlafguthaben und dazu "Today's Readiness". Version 6 brachte Trends zur Schlafhygiene, Siri-Kurzbefehle und eine verbesserte Watch-App. Man kann zwischen AutoSleeps eigenem Algorithmus und Apples Schlafphasen wählen. — [MacStories (AutoSleep 6)](https://www.macstories.net/reviews/autosleep-6-effortless-sleep-tracking-more-accessible-than-ever/)
- Kritik von Nutzern: AutoSleep-Werte weichen teils deutlich von Apple Health ab. — [App Store](https://apps.apple.com/il/app/id1164801111)

**Polar**
- Nightly Recharge setzt sich aus "Sleep Charge" (wie gut man geschlafen hat) und "ANS Charge" (wie gut sich das autonome Nervensystem in den ersten Schlafstunden beruhigt hat) zusammen. Beide werden mit den eigenen Werten der letzten 28 Tage verglichen. Die Skala reicht von "very poor" bis "very good". Erste Ergebnisse gibt es nach 3 Nächten. — [Polar Support](https://support.polar.com/en/nightly-recharge-recovery-measurement); [Polar Loop Manual](https://support.polar.com/e_manuals/polar-loop/polar-loop-user-manual-english/nightly-recharge.htm)

### Inferences
- Ohne Hardware realistisch für Myhealth: (a) Schlafdaten aus HealthKit/Health Connect lesen (Phasen siehe Abschnitt 5). (b) Eigener Schlaf-Score nach Apple-Logik aus Dauer, Regelmäßigkeit und Unterbrechungen. (c) Schlafschuld über 14 Nächte und Sleep Bank. (d) Bettzeit-Empfehlung aus den letzten 3+ Nächten. (e) Abendliche Bettzeit-Erinnerung. (f) Für Nutzer ohne Wearable ein manuelles Schlaftagebuch (Bett- und Aufstehzeit, Gefühl).
- Smart Alarm und Schnarcherkennung über das Mikrofon sind technisch machbar. Sie sind aber ein eigenes Produkt (Hintergrund-Audio, Akku, Datenschutz bei Audiodaten nach DSGVO) und für eine Fitness-App wahrscheinlich nicht der wichtigste Hebel.
- Ein "Energy Schedule" nach Rise-Art ist reine Modelllogik aus Aufwachzeit, Schlafschuld und Tagesrhythmus und lässt sich ohne Sensoren umsetzen. Das ist ein starkes Alleinstellungsmerkmal, das ein Handy allein leisten kann.

### Gaps
- Oura- und Whoop-Schlaf-Scores im Detail (Gewichtung, Teilwerte wie "Restfulness", "Timing", "Sleep Need/Sleep Coach" bei Whoop) wurden in dieser Sitzung nicht primär belegt. Aus Vorwissen: Whoop berechnet einen täglichen "Sleep Need" mit Schlafschuld und Strain-Zuschlag, Oura zeigt Teilwerte und einen Chronotyp. Das sollte auf whoop.com bzw. ouraring.com geprüft werden.
- Aktueller Sleep-Cycle-Premium-Preis in Deutschland: Die Listings schwanken zwischen 47,49 und 99,99 USD pro Jahr ([App Store](https://apps.apple.com/app/sleep-cycle-smart-alarm-clock/id320606217)). Einen Euro-Preis habe ich nicht gefunden.
- Apple Schlafapnoe-Mitteilungen in DE/EU: In den Treffern nicht bestätigt.

## 2. Herz: Ruhepuls, HRV, Zonen, VO2max, EKG/AFib, Blutdruck, SpO2, Atemfrequenz, Hauttemperatur

### Takeaway
Fast alle Herzwerte entstehen auf der Hardware (optischer Sensor, EKG-Elektroden, Manschette). Eine Handy-App kann sie aber fast vollständig über HealthKit/Health Connect lesen und auswerten: Ruhepuls, HRV, VO2max, SpO2, Atemfrequenz, Blutdruck, auf Android auch Hauttemperatur. Die regulierten Funktionen (EKG, AFib, Hypertonie-Mitteilungen) bleiben beim Hersteller. Der Mehrwert einer Drittanbieter-App liegt bei Baselines, Trends, Erklärungen und eigenen Zielgrößen wie Cardio-Alter oder WHOOP Age.

### Cited Findings
**Apple**
- Hypertonie-Mitteilungen (watchOS 26) erkennen Anzeichen für chronischen Bluthochdruck über 30-Tage-Fenster. Voraussetzungen: Series 9 / Ultra 2 oder neuer, Alter ab 22, keine bekannte Hypertonie-Diagnose, keine Schwangerschaft. Die FDA-Freigabe kam im September 2025. — [MacRumors](https://www.macrumors.com/2025/09/15/apple-releases-watchos-26/); [9to5Mac](https://9to5mac.com/2025/11/25/watchos-26-brings-two-powerful-health-features-for-apple-watch/); [HLTH](https://hlth.com/insights/news/apple-receives-fda-nod-for-hypertension-notification-feature-2025-09-16); [Apple Validierungspapier](https://www.apple.com/sg/health/pdf/Hypertension_Notifications_Validation_Paper_September_2025.pdf)
- Laut Sekundärquellen ist die Funktion in Deutschland, UK, Frankreich, Dänemark, Italien und anderen Ländern verfügbar (über 150 Länder). Das ist keine offizielle Apple-Länderliste. — [iGeeksBlog](https://www.igeeksblog.com/apple-watch-hypertension-notifications-global-rollout); [iThinkDiff](https://www.ithinkdiff.com/apple-watch-hypertension-notifications-availability/)

**Whoop**
- WHOOP MG ist das "medical grade"-Modell mit FDA-freigegebenem EKG und "Blood Pressure Insights". Es gibt es nur im höchsten Tarif "Life" (laut Review 359 USD/Jahr). Whoop 5.0 läuft mit den Tarifen One (laut Review 199 USD/Jahr) und Peak. — [the5krunner](https://the5krunner.com/2025/10/31/2026-whoop-5-0-mg-review-discount-accuracy-strain-recovery-athletes/); [Lifestack](https://lifestack.ai/blog/whoop-bands)
- Healthspan / WHOOP Age: physiologisches Alter und "Pace of Aging", aufgeteilt in VO2max, Krafttraining, Schlafregelmäßigkeit und tägliche Bewegung. Aktualisierung sonntags. — [WHOOP: Everything launched in 2025](https://www.whoop.com/us/en/thelocker/everything-whoop-launched-in-2025/); [Wareable](https://www.wareable.com/wearable-tech/whoop-summer-features-rollout-update-healthspan-advanced-labs)
- Advanced Labs (seit Sept. 2025, anfangs nur USA) verbindet Bluttests mit Wearable-Daten. Laborwerte kann man kostenlos hochladen, laut Sekundärquelle bis zu 65 Biomarker. Panels kosten ab 199 USD. — [Sacra](https://sacra.com/c/whoop/); [Wikipedia](https://en.wikipedia.org/wiki/Whoop_(company))

**Oura**
- Die Mitgliedschaft enthält Herzfunktionen wie Cardiovascular Age und Cardio Capacity (eine VO2max-Schätzung). Ohne Abo zeigt die App nur die drei Basis-Scores (Readiness, Sleep, Activity). — [Oura Blog](https://ouraring.com/blog/the-value-of-oura-membership/); [Lilach Bullock](https://www.lilachbullock.com/oura-membership-cost/); [BetterVitals](https://www.bettervitals.com/learn/oura-ring-subscription-worth-it-2026)

**Samsung (Galaxy Watch8, 2025)**
- "Vascular Load" misst die Belastung der Gefäße im Schlaf und braucht 3 von 14 Nächten mit Uhr. Der "Antioxidant Index" schätzt Carotinoide über den BioActive-Sensor in 5 Sekunden. Beide sind "Labs"-Funktionen, also Vorschau. Samsung nennt alles "general wellness", nicht medizinisch. — [Samsung UK Support](https://www.samsung.com/uk/support/mobile-devices/health-features-on-the-galaxy-watch8-and-watch8-classic/); [MobiHealthNews](https://www.mobihealthnews.com/news/samsung-debuts-galaxy-watch8-series-new-health-features)

**Withings**
- Withings+ enthält den "Cardio Check-Up": Ein Kardiologe prüft bis zu 4-mal im Jahr das EKG und antwortet innerhalb von 24 Stunden, verfügbar in Europa und den USA. Kompatibel sind u. a. ScanWatch 2/Nova/Brilliant, BPM Core und Body Scan. Withings+ enthält außerdem einen KI-Gesundheitsassistenten, einen täglichen Readiness-Score und Sync mit Apple Health und Health Connect. Preise: etwa 99,95 USD/Jahr, bzw. laut einer Quelle 9,95 €/Monat. Die Angaben widersprechen sich. — [Withings Cardio Check-Up](https://www.withings.com/us/en/landing/cardio-check-up); [Withings+](https://www.withings.com/en-us/pages/withings-plus); [Nextpit](https://nextpit.com/cardio-check-up-compelling-reason-subscribe-withings-plus-app); [Withings Support](https://support.withings.com/hc/articles/32557735511953)

**Ultrahuman**
- Der Ring Air ist ein Einmalkauf mit lebenslangem Zugriff auf die Kernfunktionen (Schlaf, Recovery, Aktivität). Zusatzfunktionen laufen über "PowerPlugs", einen App-Store, teils kostenpflichtig, z. B. AFib-Erkennung (FDA-Freigabe 2024). Etwa 12 % der Nutzer zahlen für PowerPlugs. — [Sacra](https://sacra.com/c/ultrahuman); [TechCrunch 2024](https://techcrunch.com/2024/07/16/ultrahumans-smart-ring-gets-fda-approved-afib-detection); [Android Authority](https://www.androidauthority.com/ultrahuman-ring-air-review-3472552)

**Garmin**
- HRV Status wird im Schlaf gemessen. Er zeigt "balanced / unbalanced / low / high" im Vergleich zur persönlichen Baseline. — [Garmin Blog](https://www.garmin.com/en-SG/blog/running/new-features-on-garmin-smartwatches-help-to-maximize-your-training/)

### Inferences
- Mit Handy plus Health-API für Myhealth machbar: HRV-Baseline mit Normalband (z. B. 7-Tage-Schnitt gegen 30–60-Tage-Band, ähnlich Garmins "balanced"), Ruhepuls-Trend mit Abweichungs-Alarm, VO2max-Verlauf mit Alters- und Geschlechtsperzentil, ein "Cardio-Alter" oder Fitness-Alter (wie Oura bzw. WHOOP Age), Blutdruck-Tagebuch (manuell oder Werte von Manschetten über die Health-API) und Pulszonen aus HFmax/HFR.
- Nicht nachbaubar ohne eigene Hardware und Zulassung: EKG, AFib-Erkennung, Hypertonie-Mitteilungen, Schlafapnoe-Erkennung. Die App kann deren Ergebnisse höchstens anzeigen, wenn sie in HealthKit liegen. Laut Vorwissen gibt es in HealthKit EKG-Aufnahmen als HKElectrocardiogram und AFib-Burden. Das wurde in dieser Sitzung nicht belegt.
- Ein "Healthspan"-Score aus VO2max, Krafttraining, Schlafregelmäßigkeit und Schritten (WHOOP-Logik) passt sehr gut zu einer Fitness- und Kraft-App wie Myhealth. Myhealth hat die Krafttrainings-Daten selbst.

### Gaps
- Apple Vitals-App (Ausreißer bei Atemfrequenz, Herzfrequenz im Schlaf, Handgelenktemperatur, SpO2, Schlafdauer): In dieser Sitzung nicht primär abgerufen. Aus Vorwissen: seit watchOS 11 (2024) mit Hinweisen, wenn 2+ Werte von der Baseline abweichen.
- Ob Hypertonie-Mitteilungen in der EU als Medizinprodukt nach MDR mit CE-Kennzeichen vermarktet werden, wurde nicht belegt.
- Camera-PPG siehe Abschnitt 6.

## 3. Recovery, Readiness und Strain: Berechnung, Trainingslast, "Heute hart trainieren?", Krankheit, Stress, Zyklus

### Takeaway
Alle Readiness-Scores folgen demselben Muster: Werte der letzten Nacht (HRV, Ruhepuls, Schlaf) werden mit der persönlichen Baseline verglichen (Polar 28 Tage) und mit der Trainingslast verrechnet (akut gegen chronisch, z. B. Polar 7 Tage gegen Toleranz). Das Ergebnis ist eine Ampel bzw. Handlungsempfehlung. Das lässt sich mit Daten aus HealthKit/Health Connect vollständig auf dem Handy nachbauen. Bevel, Athlytic und Gentler Streak beweisen das, denn sie haben keine eigene Hardware.

### Cited Findings
**Garmin**
- Training Readiness hat laut offiziellem Handbuch sechs Eingaben: Schlaf-Score der letzten Nacht, Erholungszeit, HRV Status, akute Last, Schlafverlauf der letzten 3 Nächte und Stressverlauf der letzten 3 Tage. Der Wert wird laufend über den Tag aktualisiert. — [Garmin Manual](https://www8.garmin.com/manuals/webhelp/GUID-0221611A-992D-495E-8DED-1DD448F7A066/EN-US/GUID-C21BE0C8-A08E-4DA1-B6C6-2E0E2DDDB372.html)
- Body Battery (0–100) nutzt einen Firstbeat-Algorithmus mit HRV, Stress, Aktivität und Ruhe. Exakte Gewichtungen veröffentlicht Garmin nicht. Kursierende Werte wie "30 % Schlaf / 25 % HRV" sind unbelegt. — [SlashGear](https://www.slashgear.com/1989498/how-does-garmin-measure-body-battery); [the5krunner](https://the5krunner.com/garmin-features/sleep/body-battery/); [ShouldITrain](https://www.shoulditrain.com/blog/garmin-training-readiness-vs-body-battery)
- Garmin Connect+ (seit März 2025) kostet 8,99 €/Monat oder 89,99 €/Jahr, 30 Tage gratis testbar. Enthalten sind "Active Intelligence" (KI-Hinweise z. B. bei zu wenig Erholung oder schlechtem Schlaf, anfangs Beta und auf bestimmte Sprachen und Geräte begrenzt), ein Leistungs-Dashboard und ein Coaching-Guide. Alle bisherigen Funktionen bleiben kostenlos. Das Abo wurde kritisiert, weil Garmin Abos für Endkunden-Funktionen zuvor ausgeschlossen hatte. — [WinFuture](https://winfuture.de/news,149904.html); [Nextpit DE](https://www.nextpit.de/news/garmin-sperrt-ki-tools-hinter-connect-plus-abonnement); [appgefahren](https://www.appgefahren.de/garmin-connect-neues-abo-fuer-tiefere-gesundheits-und-fitness-einblicke-376504.html)

**Polar**
- Cardio Load Status vergleicht die "Strain" (durchschnittliche Tageslast der letzten 7 Tage) mit der "Tolerance" (langfristige Belastbarkeit), also ein Akut-zu-Chronisch-Modell. Polar hat die Berechnung angepasst, damit sie bei niedriger Last (Einstieg, Erholung nach intensiver Phase) handlungsorientierter ist. Das Fitness Program ist ein virtueller Trainer mit 20 Stufen. — [Polar Unite Manual](https://support.polar.com/e_manuals/unite/polar-unite-user-manual-english/nightly-recharge.htm); [Polar Support](https://support.polar.com/en/nightly-recharge-recovery-measurement)

**Apple**
- Training Load gibt es seit watchOS 11 (2024). Eine Drittquelle berichtet von einem täglichen Readiness-Score aus Training Load, Vitals und Schlaf-Score. Das ist Sekundärberichterstattung und nicht von Apple bestätigt. — [JerryCards (Sekundär, 2026)](https://www.jerrycards.com/news/apple-watch-readiness-score-explained-activity-vitals-sleep-2026)

**Bevel (iOS, nur Software)**
- Bevel hat Scores für Recovery, Sleep, Strain, Stress und Nutrition sowie eine "Energy Bank", die Recovery, Schlaf, Strain und Stress zu einer Art Body Battery für den Tag zusammenfasst. Recovery setzt sich aus HRV, Ruhepuls, Schlafqualität und Strain des Vortags zusammen. Nutzer können die HRV-Methode umstellen: Apple Health liefert SDNN, Bevel empfiehlt RMSSD über das ganze Schlaffenster. Die Grund-Scores sind kostenlos, Bevel hat Ende 2025 zugesagt, dass das so bleibt. Pro enthält den KI-Coach. — [Lifestack Bevel Review](https://lifestack.ai/blog/bevel-app-review); [Kiledjian 07/2026](https://kiledjian.com/2026/07/07/bevel-turns-apple-watch-data.html); [App Store](https://apps.apple.com/us/app/bevel-all-in-one-health-app/id6456176249)
- Grenze: Bevel misst nichts selbst. Fehlen Daten in Apple Health, wird der Score ungenau oder hinkt hinterher. — [Kiledjian](https://kiledjian.com/2026/07/07/bevel-turns-apple-watch-data.html)

**Athlytic / Gentler Streak (iOS, nur Software)**
- Athlytic setzt stärker auf HRV-Trends und Trainingslast. Bevel deckt breiter ab (Ernährung, Krafttraining, KI-Coach). Athlytic Pro kostet etwa 29,99 USD/Jahr. — [Lifestack](https://lifestack.ai/blog/bevel-vs-athlytic); [Vora (DE)](https://askvora.com/de/blog/bevel-vs-athlytic-apple-watch-recovery-apps)
- Gentler Streak zeigt einen "Activity Path", eine tägliche optimale Zone aus HRV, Ruhepuls, Schlaf und jüngster Trainingslast (nach dem TSB-Modell). Die App schlägt tägliche Workouts passend zur Readiness vor. Mit dem Status-Schalter (krank, verletzt, Pause) lässt sich der Path pausieren. Streaks erlauben Ruhetage. Premium kostet etwa 39,99 USD/Jahr, laut Listing auch monatlich oder lifetime, inklusive Familienfreigabe. — [App Store](https://apps.apple.com/us/app/gentler-streak-fitness-tracker/id1576857102); [Lifestack](https://lifestack.ai/blog/gentler-streak); [BGR](https://www.bgr.com/tech/gentler-streak-improves-activity-path-tracking-offers-50-off-in-black-friday-deal)

**Whoop**
- Stress Monitor (seit 2023) leitet täglichen Stress aus HRV und Ruhepuls ab und bietet Atemübungen. — [Whoop App Store](https://apps.apple.com/app/id933944389); [Wikipedia](https://en.wikipedia.org/wiki/Whoop_(company))

**Samsung**
- Bedtime Guidance nutzt Schlafdruck und Tagesrhythmus (siehe Abschnitt 1). Samsung kennzeichnet alle Funktionen als "general wellness". — [Samsung UK Support](https://www.samsung.com/uk/support/mobile-devices/health-features-on-the-galaxy-watch8-and-watch8-classic/)

**Kritik an Readiness-Scores (unabhängig)**
- Ein JMIR-Beitrag von 2026 verweist auf ein Narrative Review mit 16 Studien, das die Aussagekraft absoluter Readiness-Scores infrage stellt. Patienten würden HRV übermäßig vertrauen. — [JMIR 2026](https://www.jmir.org/2026/1/e109935)
- Marco Altini (HRV4Training) fand in seinen Daten keine Korrelation zwischen einem Recovery-Score und den anderen Variablen. Er empfiehlt, Rohwerte zu zeigen statt "erfundener" Scores. — [Altini Substack](https://marcoaltini.substack.com/p/measurements-vs-made-up-scores); [HRV4Training Blog](https://www.hrv4training.com/blog2/data-interpretation-issues-in-wearables)

### Inferences
- Bauplan für einen Readiness-Score in Myhealth, der nur Software braucht: Eingaben sind HRV (nächtlicher Wert oder Morgenmessung) und Ruhepuls gegen eine 28–60-Tage-Baseline, dazu Schlafdauer gegen Bedarf, Schlafschuld, akute Last (7 Tage) gegen chronische Last (28 Tage). Die Last kommt aus den eigenen Myhealth-Krafttrainings (Volumen, RPE/RIR) plus Cardio-Workouts aus der Health-API. Ausgabe: eine Ampel mit einem Satz Empfehlung ("Heute schwer / moderat / Deload"). Wichtig ist, wie bei Altini und Polar die Rohwerte und Baselines offen zu zeigen.
- Myhealths Vorteil gegenüber Bevel und Athlytic: echte Kraftlast pro Muskelgruppe statt geschätzter Herzfrequenz-Strain. Gentler Streak räumt selbst ein, dass dünne Herzfrequenzdaten den Strain verfälschen. Wer Satz, Wiederholung und Gewicht kennt, hat eine bessere Lastgröße für Krafttraining.
- Status "krank/verletzt/Pause" und Streaks mit erlaubten Ruhetagen (Gentler Streak) sind günstig umzusetzen und kommen bei Nutzern gut an.
- Krankheitserkennung: Steigen Ruhepuls und Atemfrequenz, sinkt HRV und steigt die Hauttemperatur, kann eine Handy-App einen Warnhinweis geben, sofern die Daten in der Health-API liegen (Hauttemperatur auf Android direkt verfügbar). Medizinische Begriffe ("Infekt erkannt") sollte man wegen MDR vermeiden und neutral formulieren ("Deine Werte weichen ab").

### Gaps
- Whoop-Strain (0–21) und die Recovery-Formel (HRV, Ruhepuls, Atemfrequenz, Schlaf) sowie "Strain Target" stammen nur aus Vorwissen und wurden hier nicht primär belegt.
- Oura Readiness-Teilwerte (Temperaturabweichung, HRV-Balance, Recovery Index, Activity Balance) und Oura Symptom Radar (Krankheits-Frühwarnung): nicht primär belegt in dieser Sitzung.
- Zyklusbewusstes Coaching (Whoop Hormonal Insights, Oura Cycle Insights, Garmin Zyklus-Tracking): nicht ausreichend recherchiert. Health Connect hat Zyklus-Datentypen (Abschnitt 5).
- Apple-Readiness-Score: nicht von Apple bestätigt.

## 4. Journal, Verhaltenskorrelation, Gewohnheits-Insights, Wochen- und Monatsberichte

### Takeaway
Whoops Journal (Verhalten loggen, dann "Impact" auf Recovery) ist das Vorbild. Es ist reine Software: tägliche Ja/Nein-Fragen plus Statistik gegen den Recovery- oder HRV-Wert. Myhealth kann das komplett ohne Hardware anbieten und an eigene Daten koppeln (Ernährung, Training).

### Cited Findings
- Whoops Monthly Performance Assessment zeigt die Verteilung der täglichen Recovery und die Verhaltensweisen mit dem stärksten positiven bzw. negativen Zusammenhang. Im Whoop-Beispiel war Alkohol der stärkste negative Faktor mit im Schnitt etwa 9 Punkten weniger Recovery. Whoop warnt selbst vor Störfaktoren (Confounding). — [WHOOP Locker](https://whoop.com/eu/en/thelocker/monthly-performance-assessment-now-features-enhanced-recovery-analysis)
- Laut Whoop sinkt die Recovery nach geloggtem Alkohol im Schnitt um 8 %. Ein Wareable-Test berichtet 17 %. — [WHOOP Locker](https://www.whoop.com/us/en/thelocker/a-guide-to-self-experimentation-optimizing-your-habits-for-performance/); [Wareable](https://wareable.com/wearable-tech/whoop-4-review-8654)
- Koffein bis 4 Stunden vor dem Schlafen hängt laut Whoop mit +2 bpm Ruhepuls, −6 ms HRV und −7,5 % Recovery zusammen. — [WHOOP Locker](https://www.whoop.com/us/en/thelocker/a-guide-to-self-experimentation-optimizing-your-habits-for-performance/)
- Whoop empfiehlt höchstens 10 Verhaltensweisen gleichzeitig zu tracken und die "Impacts" nach einigen Wochen anzuschauen. — [WHOOP Locker](https://www.whoop.com/us/en/thelocker/a-guide-to-self-experimentation-optimizing-your-habits-for-performance/)
- Die "Recovery Behaviours" erschienen 2023 als neue Funktion (ältere Info). — [the5krunner 2023](https://the5krunner.com/2023/04/15/whoop-new-recovery-behaviours/)
- 2025 hat Whoop Journal, Strength Trainer und den KI-Coach überarbeitet. Der Coach hat jetzt ein Gedächtnis, etwa für Wettkampfziele. — [Wareable](https://www.wareable.com/wearable-tech/whoop-summer-features-rollout-update-healthspan-advanced-labs); [WHOOP 2025](https://www.whoop.com/us/en/thelocker/everything-whoop-launched-in-2025/)
- Gentler Streak Premium enthält ebenfalls ein Journal. — [Lifestack](https://lifestack.ai/blog/gentler-streak)
- Eine unabhängige, begutachtete Validierung der Whoop-Journal-Korrelationen habe ich nicht gefunden. Es sind Beobachtungsdaten. — (Recherche-Ergebnis, siehe [WHOOP Locker](https://whoop.com/eu/en/thelocker/monthly-performance-assessment-now-features-enhanced-recovery-analysis))

### Inferences
- Für Myhealth naheliegend: ein Abend- oder Morgen-Check-in mit 3–10 frei wählbaren Faktoren (Alkohol, Koffein nach 14 Uhr, späte Mahlzeit, Bildschirm im Bett, Stress, Sauna, Kreatin usw.). Nach 2–4 Wochen folgt eine "Impact"-Karte (Mittelwert-Differenz von HRV, Schlaf, Readiness oder Trainingsleistung mit/ohne Faktor, mit Konfidenzhinweis). Späte Mahlzeit und Kalorien kann Myhealth automatisch aus dem eigenen Ernährungstagebuch ableiten, das ist ein Plus gegenüber Whoop.
- Wochen- und Monatsbericht (Push und Teilen) mit Schlaf, Readiness-Verteilung, Trainingslast und wichtigsten Faktoren ist günstig umzusetzen und fördert die Bindung.

### Gaps
- Oura- und Bevel-Journal bzw. Tags-Korrelation: nicht im Detail recherchiert.

## 5. Was eine Drittanbieter-App über HealthKit / Health Connect lesen kann (Datentypen und Berechtigungen)

### Takeaway
Beide Plattformen geben die nötigen Rohdaten für einen Readiness- und Schlaf-Score frei: Schlafphasen, HRV, Ruhepuls, VO2max, SpO2, Atemfrequenz, Schritte, aktive Energie, Workouts, Blutdruck, Gewicht, Zyklus. Unterschiede: Apple liefert HRV als SDNN, Android als RMSSD. Android braucht eigene Berechtigungen für Hintergrund-Lesen und für Daten, die älter als 30 Tage sind. Apple verrät nicht, ob ein Lesezugriff verweigert wurde.

### Cited Findings
**Android Health Connect** (offizielle Datentyp-Seite, SDK ≥ 1.0.0-alpha10) — [Android Developers: Data types](https://developer.android.com/health-and-fitness/guides/health-connect/plan/data-types)
- Berechtigungen haben die Form `android.permission.health.READ_X` / `WRITE_X` und werden im Manifest deklariert.
- Vitals: `HeartRateVariabilityRmssdRecord` (READ_HEART_RATE_VARIABILITY), `RestingHeartRateRecord` (READ_RESTING_HEART_RATE), `HeartRateRecord`, `OxygenSaturationRecord`, `RespiratoryRateRecord`, `SkinTemperatureRecord` (braucht das Feature-Flag FEATURE_SKIN_TEMPERATURE), `BloodPressureRecord` (systolisch, diastolisch, Körperposition, Messort), `BloodGlucoseRecord`, `BodyTemperatureRecord`.
- Schlaf: `SleepSessionRecord` (READ_SLEEP), ein Intervall mit `stages`, Aggregat SLEEP_DURATION_TOTAL. Phasen sind u. a. tief, leicht, REM und wach. Der Session-Record soll erst nach dem Aufwachen geschrieben werden. — [Android Developers: Sleep](https://developer.android.com/health-and-fitness/health-connect/experiences/sleep)
- Aktivität: `Vo2MaxRecord` (READ_VO2_MAX, mit `measurementMethod`), `StepsRecord`, `ActiveCaloriesBurnedRecord`, `TotalCaloriesBurnedRecord`, `ExerciseSessionRecord` (READ_EXERCISE, Routen separat über READ_EXERCISE_ROUTE), `DistanceRecord`, `PowerRecord`, `SpeedRecord`, neu `ActivityIntensityRecord` und `PlannedExerciseSessionRecord` (mit Feature-Flags).
- Körper: Gewicht, Körperfett, Magermasse, Grundumsatz, Knochenmasse, Körperwasser, Größe. Ernährung: `NutritionRecord`, `HydrationRecord`. Zyklus: Menstruation, Basaltemperatur, Ovulationstest, Zervixschleim u. a. Wellness: neu `MindfulnessSessionRecord`.
- Zusatzberechtigungen: `READ_HEALTH_DATA_IN_BACKGROUND` (Lesen im Hintergrund) und `READ_HEALTH_DATA_HISTORY` (Daten älter als 30 Tage). Ohne die zweite sieht eine App nur 30 Tage rückwirkend ab dem Zeitpunkt der Freigabe. Medizinische Daten (Medical Records) haben einen eigenen Bereich.

**Apple HealthKit**
- Lese- und Schreibrechte werden pro Datentyp getrennt freigegeben. Ein verweigerter Lesezugriff erzeugt keinen Fehler, sondern liefert nil oder ein leeres Ergebnis. Die App kann also "keine Daten" nicht von "keine Berechtigung" unterscheiden. — [Mark Volkmann HealthKit-Guide](https://mvolkmann.github.io/blog/swift/HealthKit/); [react-native-health permissions](https://github.com/dimitris4/react-native-health/blob/master//docs/permissions.md)
- Relevante Typen: `heartRateVariabilitySDNN`, `restingHeartRate`, `vo2Max` (Quantity Types) und `sleepAnalysis` (Category Type). — [react-native-health permissions](https://github.com/dimitris4/react-native-health/blob/master//docs/permissions.md)
- Schlafphasen in `HKCategoryValueSleepAnalysis` seit iOS 16: inBed, asleepUnspecified, asleepCore, asleepDeep, asleepREM, awake. Die Seite war nur teilweise abrufbar, die Werte stammen aus der Antwort des Abruf-Tools und Vorwissen. — [Apple Developer (teilweise)](https://developer.apple.com/documentation/healthkit/hkcategoryvaluesleepanalysis)
- App Review: Jede Leseberechtigung sollte einen nachvollziehbaren Zweck haben. — [Sahha: App Store Guidelines](https://docs.sahha.ai/docs/connect/sdk/compliance/apple-app-store)
- Apple speichert HRV als SDNN. Apps wie Bevel bieten RMSSD aus dem Schlaffenster als Alternative an. — [Lifestack](https://lifestack.ai/blog/bevel-app-review)

### Inferences
- Apple schreibt nur sporadische HRV-SDNN-Werte (wenige pro Tag/Nacht) in HealthKit. Ein nächtlicher HRV-Wert wie bei Oura oder Whoop ist daher eine Schätzung aus wenigen Samples. Andere Wearables (Oura, Garmin über Drittanbieter-Sync, Withings) schreiben je nach Integration. Das ist Vorwissen und unbestätigt.
- SDNN (iOS) und RMSSD (Android) sind nicht direkt vergleichbar. Myhealth braucht pro Plattform eine eigene Baseline und darf sie nicht mischen.
- Für Myhealth sollte die Berechtigungs-UX zeigen, welche Karten (Schlaf, Readiness, Herz) ohne welche Freigabe leer bleiben. Unter iOS muss die App "keine Daten" als "vielleicht keine Freigabe" behandeln und einen Hinweis zur Freigabe zeigen.

### Gaps
- Apples offizielle Liste der Typen wie `appleSleepingWristTemperature`, `respiratoryRate`, `oxygenSaturation`, HKElectrocardiogram und AFib-Burden konnte ich wegen gesperrter Apple-Domains nicht primär prüfen. Aus Vorwissen sind sie lesbar, das ist aber unbestätigt.
- Ob Apples Schlaf-Score oder Training-Load-Werte als HealthKit-Typ für Dritte lesbar sind, habe ich nicht gefunden. Vermutlich nicht.

## 6. Ansätze nur mit dem Handy (Mikrofon, Bewegungssensor, Kamera-PPG für HRV)

### Takeaway
Zwei Wege sind erprobt: Schlaf über das Mikrofon (Sleep Cycle) und HRV über eine Morgenmessung mit der Kamera, wobei der Finger auf der Linse liegt (Welltory, HRV4Training). Kamera-PPG ist in Ruhe brauchbar, braucht etwa 1 Minute für SDNN und reagiert empfindlich auf Bewegung, Druck und Licht. Unabhängige Validierung speziell für Welltory fehlt.

### Cited Findings
- Welltory gibt an, dass seine Kamera-Messungen mit einem Polar-Brustgurt übereinstimmen (eigene Studie). Die Hilfe nennt als Fehlerquellen Fingerbewegung, Druckänderung, schlechtes Licht und Arrhythmie. — [Welltory Help](https://help.welltory.com/articles/3352614); [Welltory](https://welltory.com/heart-rate-variability-gadgets/)
- Unabhängige Studie (2024, 16 Personen) zu einer anderen Kamera-HRV-App gegen einen PPG-Sensor: Zeitbereichs-Werte korrelierten mit r > 0,7 nach etwa 0,5 Minuten, SDNN brauchte etwa 1 Minute. Die Autoren nennen die App einen gültigen Ersatz. — [JMeditec (UTM)](https://jmeditec.utm.my/index.php/jmeditec/article/view/54)
- Kontext: Handgelenk-PPG hat im Schlaf eine HRV-Abweichung von 6–15 ms, bei Aktivität ist die relative Abweichung 14–51 % höher. — [PMC 2024 Validation Study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11548599/)
- Sleep Cycle: Schlafanalyse über das Mikrofon, Smart Alarm, Schnarch- und Hustenerkennung. — [App Store](https://apps.apple.com/app/sleep-cycle-smart-alarm-clock/id320606217)
- Elite HRV setzt auf eine 2,5-minütige Morgenmessung für den Readiness-Score (mit Brustgurt oder Sensor). — [Stork.ai Elite HRV](https://www.stork.ai/en/elite-hrv)
- Rise funktioniert ohne Wearable, über Handynutzung und Schritte. — [Rise Blog](https://www.risescience.com/blog/rise-app-review)

### Inferences
- Für Myhealth-Nutzer ohne Uhr: eine optionale 60–90-Sekunden-Morgenmessung über die Kamera (rMSSD, Ruhepuls) mit Qualitätsanzeige. Damit gibt es auch ohne Wearable einen Readiness-Score. Dazu kommen ein Schlaftagebuch (Bett- und Aufstehzeit), subjektive Fragen (Muskelkater, Energie, Stimmung, wie bei HRV4Training) und Schritte aus dem Handy. Das deckt die größte Zielgruppenlücke ab (Gym-Nutzer ohne Wearable).
- Kamera-PPG in Deutschland ohne Medizinprodukt-Anspruch vermarkten: als "Wellness" bezeichnen, keine Diagnose, kein Arrhythmie-Hinweis.

### Gaps
- HRV4Training-Validierungsstudien (Plews et al. 2017 u. a.) wurden in dieser Sitzung nicht gefunden. Aus Vorwissen existieren sie, bitte primär prüfen.
- Welltory-Preise und aktuelle Features 2026 wurden nicht gefunden.

## 7. Monetarisierung, Preise DE/EU, Regulierung (MDR)

### Takeaway
Der Markt teilt sich in drei Modelle: (1) Hardware plus Pflicht-Abo (Whoop, Oura-Mitgliedschaft), (2) Hardware mit kostenlosem Kern plus optionalem KI- oder Premium-Abo (Garmin Connect+, Google Health Premium, Withings+, Ultrahuman PowerPlugs, Samsung kostenlos), (3) reine Software-Apps auf Basis von HealthKit mit Abos von etwa 30–70 USD/Jahr (Athlytic, Gentler Streak, Rise, Sleep Cycle) bzw. Einmalkauf (AutoSleep) oder Freemium mit kostenlosen Kern-Scores (Bevel). KI-Coaches sind 2025–2026 das wichtigste Bezahlfeature. Regulierte Funktionen (EKG, AFib, Blutdruck) gibt es nur bei Herstellern mit Zulassung.

### Cited Findings
| Anbieter | Modell / Preis (Quelle) |
|---|---|
| Whoop | One ca. 199 USD/J., Peak, Life mit MG (EKG, BP) ca. 359 USD/J. ([the5krunner](https://the5krunner.com/2025/10/31/2026-whoop-5-0-mg-review-discount-accuracy-strain-recovery-athletes/)). Amazon.de: Peak-Bundle mit 12 Monaten für 241,00 € ([Amazon.de](https://www.amazon.de/-/en/WHOOP-5-0-Activity-Tracker-personalised/dp/B0GSBLSGJ4)) |
| Oura | Mitgliedschaft 5,99 USD/Monat bzw. 69,99 USD/Jahr (UK 5,99 £ / 69,99 £), kein Lifetime-Kauf. Ohne Abo nur 3 Basis-Scores ([Lilach Bullock](https://www.lilachbullock.com/oura-membership-cost/); [BetterVitals](https://www.bettervitals.com/learn/oura-ring-subscription-worth-it-2026)). Oura Advisor (KI) ist im Abo enthalten |
| Garmin | Connect+ 8,99 €/Monat bzw. 89,99 €/Jahr, Kernfunktionen bleiben kostenlos ([WinFuture](https://winfuture.de/news,149904.html)) |
| Google/Fitbit | Gemini-Coach: Preview ab Okt. 2025 (USA, Android), iOS ab Feb. 2026. Im Mai 2026 Umbenennung in "Google Health" / "Google Health Coach" und globaler Start am 19.05.2026. Google Health Premium 9,99 USD/Monat bzw. 99 USD/Jahr, Import medizinischer Daten (anfangs USA/Japan) ([Android Authority](https://androidauthority.com/google-health-app-coach-rebrand-3664205/); [MobiHealthNews](https://www.mobihealthnews.com/news/google-debuts-gemini-powered-ai-health-coach-fitbit-and-pixel-watch-users); [Storyboard18](https://www.storyboard18.com/digital/fitbit-expands-gemini-powered-ai-health-coach-to-ios-in-public-preview-89551.htm)) |
| Withings | Withings+ ca. 99,95 USD/Jahr (widersprüchlich), Cardio Check-Up, KI-Assistent, Readiness ([Withings+](https://www.withings.com/en-us/pages/withings-plus); [Nextpit](https://nextpit.com/cardio-check-up-compelling-reason-subscribe-withings-plus-app)) |
| Ultrahuman | Ring ohne Abo, PowerPlugs teils kostenpflichtig. Ring Pro in den USA seit Sept. 2026 ([Sacra](https://sacra.com/c/ultrahuman)) |
| Samsung | Samsung-Health-Funktionen ohne Abo, neue Funktionen teils als "Labs"-Vorschau ([Samsung UK](https://www.samsung.com/uk/support/mobile-devices/health-features-on-the-galaxy-watch8-and-watch8-classic/)) |
| Bevel | Kern-Scores kostenlos (Zusage Ende 2025), Pro mit KI-Coach ([Lifestack](https://lifestack.ai/blog/bevel-app-review)) |
| Athlytic | Pro ca. 29,99 USD/Jahr ([Vora DE](https://askvora.com/de/blog/bevel-vs-athlytic-apple-watch-recovery-apps)) |
| Gentler Streak | Premium ca. 39,99 USD/Jahr, auch monatlich und lifetime ([Vora DE](https://askvora.com/de/blog/bevel-vs-athlytic-apple-watch-recovery-apps); [App Store](https://apps.apple.com/us/app/gentler-streak-fitness-tracker/id1576857102)) |
| Rise | 69,99 USD/Jahr nach 7 Tagen Test, alte Angabe 60 USD ([Rise Blog](https://www.risescience.com/blog/is-the-rise-sleep-app-worth-it); [App Store](https://apps.apple.com/us/app/rise-sleep-tracker/id1453884781)) |
| Sleep Cycle | Premium-Jahresabo laut Listings 47,49–99,99 USD ([App Store](https://apps.apple.com/app/sleep-cycle-smart-alarm-clock/id320606217)) |
| AutoSleep | Einmalkauf, früher 2,99 USD, ein Listing zeigt 8,99 USD ([MacStories](https://www.macstories.net/reviews/autosleep-6-effortless-sleep-tracking-more-accessible-than-ever/)) |

**Regulierung**
- Apple-Hypertonie-Mitteilungen sind FDA-freigegeben. In weiteren Regionen hängt die Verfügbarkeit von lokalen Freigaben ab (z. B. China noch ausstehend). — [HLTH](https://hlth.com/insights/news/apple-receives-fda-nod-for-hypertension-notification-feature-2025-09-16); [iGeeksBlog](https://www.igeeksblog.com/apple-watch-hypertension-notifications-global-rollout)
- Samsung erklärt die Health-Funktionen ausdrücklich als "general wellness and fitness purposes only". — [Samsung UK](https://www.samsung.com/uk/support/mobile-devices/health-features-on-the-galaxy-watch8-and-watch8-classic/)
- Whoop MG verkauft EKG als FDA-freigegeben und Blutdruck nur als "Insights", also bewusst ohne Diagnose. — [the5krunner](https://the5krunner.com/2025/10/31/2026-whoop-5-0-mg-review-discount-accuracy-strain-recovery-athletes/)

### Inferences
- Für Myhealth (DE): Ein Readiness- oder Schlaf-Feature als Wellness-Funktion ohne Diagnose-, Erkennungs- oder Therapieanspruch fällt nach üblicher Auslegung nicht unter die EU-MDR 2017/745. Sobald die App aber Krankheiten "erkennt" (AFib, Hypertonie, Schlafapnoe, Infekt), droht eine Einstufung als Medizinprodukt-Software (Klasse IIa nach Regel 11). Formulierungen sollten neutral bleiben ("Werte über deinem Normalbereich"). Das ist eine Inferenz, keine Rechtsberatung. Gesundheitsdaten fallen unter Art. 9 DSGVO (ausdrückliche Einwilligung).
- Preispositionierung: Software-Readiness-Apps liegen bei etwa 30–70 USD/Jahr. Kern-Scores kostenlos anzubieten (Bevel-Strategie) ist gerade ein Wettbewerbsdruck.

### Gaps
- Primärquellen für EU/MDR-Einstufung (z. B. MDCG 2019-11, BfArM) wurden in dieser Sitzung nicht abgerufen.
- Offizielle Euro-Preise für Whoop (One/Life), Oura-Mitgliedschaft in DE, Athlytic, Gentler Streak, Rise und Sleep Cycle in DE habe ich nicht gefunden.
- DiGA-Weg (Erstattung in Deutschland) für Schlaf-Apps (z. B. somnio) wurde nicht recherchiert.

## 8. Was Nutzer loben, kritisieren und sich wünschen

### Takeaway
Gelobt werden umsetzbare Tagesempfehlungen, übersichtliche Dashboards, dass Ruhetage in Streaks zählen, und gratis Kern-Scores. Kritisiert werden Pflicht-Abos und Paywalls nach dem Hardwarekauf (Whoop, Oura, Garmin Connect+), "Black-Box"-Scores, die nicht zum Körpergefühl passen, Datenabweichungen zwischen Apps und schwankende Qualität der KI-Coaches.

### Cited Findings
- Abo-Frust: Whoops Abo nach dem ersten Jahr sei für preisbewusste Käufer "a hard pill to swallow". — [Body Muscle Matters (Whoop 4.0 Review)](https://bodymusclematters.com/whoop-4-0-review-2025-what-i-learned/)
- Garmin Connect+ wurde kritisiert, weil Garmin Abos für Endkunden-Funktionen früher ausgeschlossen hatte. — [Nextpit DE](https://www.nextpit.de/news/garmin-sperrt-ki-tools-hinter-connect-plus-abonnement)
- Oura: Ohne Abo bleiben nur 3 Scores, die Erklärungen zur Readiness liegen hinter der Paywall. — [BetterVitals](https://www.bettervitals.com/learn/oura-ring-subscription-worth-it-2026)
- Ein Slowtwitch-Nutzer schreibt, HRV habe nicht zu seiner Leistung gepasst, und er verlasse sich nicht mehr darauf (Einzelfall). — [Slowtwitch Forum](https://forum.slowtwitch.com/t/whoop-watch-worth-buying/791475)
- Experten: Nutzer vertrauen HRV zu sehr. Recovery-Scores korrelieren teils kaum mit den Rohwerten. — [JMIR 2026](https://www.jmir.org/2026/1/e109935); [Altini](https://marcoaltini.substack.com/p/measurements-vs-made-up-scores)
- Bevel: übersichtliches Dashboard, handlungsorientierter als Apple Health. Das Feedback ist aber gemischt, die KI-Coach-Qualität schwankt. — [Lifestack](https://lifestack.ai/blog/bevel-app-review); [Kiledjian](https://kiledjian.com/2026/07/07/bevel-turns-apple-watch-data.html)
- Athlytic: Insights werden als umsetzbar gelobt, Nutzer wünschen sich das klare Design von Gentler Streak. — [App Store Athlytic](https://apps.apple.com/il/app/id1543571755)
- Gentler Streak wurde für sein Design von Apple ausgezeichnet. Der sanfte Ansatz (Ruhetage zählen) ist ein Hauptargument. — [Vora DE](https://askvora.com/de/blog/bevel-vs-athlytic-apple-watch-recovery-apps); [iMore](https://www.imore.com/apps/health-fitness-apps/want-to-hit-your-2023-fitness-goals-drop-apples-rings-and-try-gentler-streak-instead)
- AutoSleep: Werte weichen von Apple Health ab. — [App Store](https://apps.apple.com/il/app/id1164801111)
- Google: Der Coach entstand mit über 500.000 Preview-Nutzern und mehr als 1 Mio. Feedback-Einträgen. KI-Coaching ist also eine Funktion, die Nutzer sehr aktiv ausprobieren. — [Android Authority](https://androidauthority.com/google-health-app-coach-rebrand-3664205/)

### Inferences
- Häufigste Wünsche, aus den Quellen abgeleitet: (1) keine Paywall für Grund-Scores, (2) erklärbare Scores mit sichtbaren Rohwerten und Baselines, (3) Empfehlungen, die zum geplanten Training passen ("Was heißt das für mein heutiges Workout?"), (4) eine Verbindung von Krafttraining und Recovery. Whoop baut dafür den Strength Trainer, Bevel bietet Krafttraining an. Für Myhealth ist das die größte Chance.

### Gaps
- Systematische Reddit-Auswertung (r/whoop, r/ouraring, r/Garmin, r/AppleWatch) war über die Suche nicht möglich. Behauptungen wie "Genauigkeit ist ein Top-5-Beschwerdethema auf r/whoop" sind unbestätigt.
- Deutsche Testberichte (z. B. Stiftung Warentest, c't, Chip) zu Recovery-Apps 2025–2026 wurden nicht gefunden.

## 9. Kompakte Feature-Matrix: Was braucht Hardware, was geht nur mit dem Handy?

### Takeaway
Etwa zwei Drittel der Features im Inventar sind Auswertungslogik auf Daten aus HealthKit/Health Connect oder auf manuellen Eingaben. Myhealth kann sie ohne eigene Hardware anbieten.

### Cited Findings
- Software-only-Apps mit Recovery-, Sleep-, Strain-, Stress- und Nutrition-Scores auf Basis von Apple Health: Bevel, Athlytic, Gentler Streak. — [Lifestack](https://lifestack.ai/blog/bevel-vs-athlytic); [Vora DE](https://askvora.com/de/blog/bevel-vs-athlytic-apple-watch-recovery-apps)
- Health-Connect-Datentypen für alle Eingaben (HRV, Ruhepuls, Schlafphasen, VO2max, SpO2, Atemfrequenz, Hauttemperatur, Blutdruck, Schritte, Energie, Workouts, Zyklus). — [Android Developers](https://developer.android.com/health-and-fitness/guides/health-connect/plan/data-types)

| Feature | Vorbild | Handy-only / per Health-API machbar? |
|---|---|---|
| Schlafdauer und -phasen messen | Apple, Oura, Whoop, Garmin | Nein (Hardware). Lesen per API: ja. Mikrofon-Schätzung: Sleep Cycle |
| Schlaf-Score (Dauer, Regelmäßigkeit, Unterbrechungen) | Apple watchOS 26 | Ja (Logik) |
| Schlafschuld / Sleep Bank (14 Tage) | Rise, AutoSleep | Ja |
| Bettzeit-Empfehlung / Erinnerung | Samsung Bedtime Guidance, Rise | Ja |
| Energieplan (zirkadian) | Rise | Ja |
| Smart Alarm / Schnarchen | Sleep Cycle | Ja (Mikrofon), aufwendig |
| HRV-Status mit Baseline | Garmin, Oura, Whoop | Ja (Daten per API) oder Kamera-Morgenmessung |
| Ruhepuls-Trend | alle | Ja (API) |
| VO2max / Cardio-Fitness / Cardio-Alter | Apple, Oura, Garmin | Lesen ja. Altersvergleich als eigene Logik |
| Healthspan / biologisches Alter | WHOOP Age | Ja (Logik aus VO2max, Kraft, Schlaf, Schritten) |
| EKG / AFib / Hypertonie / Apnoe | Apple, Whoop MG, Withings, Ultrahuman | Nein (Hardware und Zulassung) |
| Blutdruck-Tagebuch | Withings BPM, Whoop MG | Ja (manuell bzw. API-Lesen) |
| SpO2, Atemfrequenz, Hauttemperatur-Trends | Apple Vitals, Oura | Lesen ja (Hauttemperatur iOS unbestätigt) |
| Readiness-Score / Ampel | Garmin, Oura, Whoop, Polar, Bevel | Ja |
| Akut:chronische Last | Polar Cardio Load, Garmin, Apple Training Load | Ja (Kraftlast aus eigenen Daten plus Cardio aus API) |
| Strain / Energy Bank / Body Battery | Whoop, Bevel, Garmin | Annäherung ja (HF-Daten oft dünn) |
| Stress-Score | Whoop, Garmin, Bevel | Annäherung aus HRV und Ruhepuls. Atemübung: ja |
| Krankheits-Frühwarnung | Oura, Apple Vitals | Annäherung ja (Abweichungs-Hinweis, nicht als Diagnose) |
| Pausen-Status (krank/verletzt) | Gentler Streak | Ja |
| Journal und Impact-Analyse | Whoop | Ja |
| Wochen- und Monatsbericht | Whoop | Ja |
| KI-Coach | Whoop, Oura Advisor, Google Health Coach, Garmin Active Intelligence, Bevel Pro | Ja (LLM-Kosten, Datenschutz) |
| Zyklusbewusste Hinweise | Whoop, Oura | Ja (Zyklusdaten per API oder manuell) |
| Bluttests und Laborwerte | WHOOP Advanced Labs | Upload-Ansicht machbar. Laborpartner nötig |

### Inferences
- Lücken mit dem besten Verhältnis von Nutzen zu Aufwand für eine deutsche Gym-App: (1) Readiness-Ampel aus HRV, Ruhepuls und Schlaf plus eigener Krafttrainingslast, (2) Schlafschuld, Schlaf-Score und Bettzeit-Erinnerung, (3) Journal mit Impact-Karten (gekoppelt an das Ernährungstagebuch), (4) Wochenbericht, (5) Fallback ohne Wearable: Kamera-HRV-Morgenmessung plus subjektiver Check-in.

### Gaps
- Myhealths aktueller Funktionsumfang war nicht Teil dieser Recherche (Abgleich erfolgt im Bericht).
