# Entscheidungsvorlage: Pro-Abo und Werbung (Phase 10.3)

Stand 30.10.2026 · Register BUS-001–010, CALC-006, LAW-008, O5 · **Entscheidung Luc – offen.**

Im Fahrplan steht für 10.3 „Pro-Abo und Werbung einbauen, Free/Pro-Grenze“. Seit dem 30.10.2026 gilt aber
„kostenfreie Version: keine gekauften Medien, keine KI, kein Server“. Deshalb wird hier **nichts eingebaut**, bis du
entschieden hast. Diese Vorlage zeigt die Möglichkeiten mit Folgen, damit die Entscheidung schnell geht.

## Möglichkeiten

| | A: Kostenlos zum Start | B: Kostenlos + Pro-Abo | C: Werbung + Pro werbefrei | D: Kostenlos + „Unterstützen“ |
|---|---|---|---|---|
| Was | Alles frei, keine Käufe | Basis frei, Zusatzfunktionen im Abo (z. B. 2–4 €/Monat, 20–30 €/Jahr) | Werbung in der freien Version, Abo entfernt sie | Freiwilliger Einmalkauf ohne Gegenleistung |
| Einnahmen | keine | nur wenn genug zahlen (BUS-003: 100 Jahresabos ≈ 3000 € Umsatz, kein Gewinn nach Kosten) | Werbung bringt bei wenigen Nutzern sehr wenig (BUS-009) | gering |
| Aufwand Technik | keiner | Kauf über Apple (In-App-Kauf/StoreKit), Wiederherstellen, Pro-Ende ohne Datenverlust (BUS-010); braucht Development Build | Werbe-SDK (z. B. AdMob) + Einwilligung (UMP), nie im Satz/Timer (BUS-006) | Kauf über Apple |
| Datenschutz | „Keine Werbung, kein Tracking“ bleibt wahr | bleibt wahr (Apple verarbeitet den Kauf) | **Widerspricht** dem bisherigen Versprechen; Einwilligung nach TDDDG nötig, auch für nicht personalisierte Werbung (LAW-008); Gesundheitsdaten nie für Werbung (BUS-007) | bleibt wahr |
| Recht/Steuern | Gewerbe evtl. nicht nötig (Rechtsprüfung, LAW-001) | Gewerbe, Steuern, Verbraucherinformationen; Apple-Vertrag für bezahlte Apps (Bankdaten, Steuerformulare) | wie B plus Werbevertrag | wie B (Umsatz) |
| Apple-Anteil | – | 15 % im Small Business Program | 15 % auf Abos | 15 % |

## Mögliche Free/Pro-Grenze (nur für B oder C)

Vorschlag aus Kap. 21 (CALC-006): **Rechner und Tracker gehören in die kostenlose Basis.** Danach:

| Kostenlos (bleibt so) | Pro (Kandidaten, nur Neues) |
|---|---|
| Trainingspläne, Satzlogger, Pausen-Timer, Verlauf | später: Apple-Health-Sync, Widgets/Live Activity |
| Dehnen, Mobilität, HIIT-Vorlagen | weitere Programme/Vorlagen |
| Ernährungstagebuch, Barcode-Scan, Rezepte, Getränke | später: Statistiken über Monate/Jahre |
| Kalorienrechner, Coach-Einrichtung, Tagesziel | Planassistent „befristet umplanen“? (Alleinstellungsmerkmal) |
| Sicherung, Wiederherstellen, alle Daten löschen | – |

Wichtig: **Nichts, was Pilot-Testerinnen und -Tester schon kostenlos hatten, nachträglich wegnehmen**, und Daten nie
hinter eine Bezahlschranke stellen (BUS-010).

## Empfehlung

**A – kostenlos starten**, Entscheidung über B nach dem Pilot: Die Feedback-Frage „Zahlungsbereitschaft“ (BUS-002)
liefert echte Antworten, bevor Aufwand für Abo, Gewerbe und Steuern entsteht. Werbung (C) passt nicht zum
Datenschutzversprechen, das die App heute auszeichnet (Wettbewerbsvergleich).

## Deine Entscheidung

| Frage | Antwort | Datum |
|---|---|---|
| Modell zum Start (A/B/C/D) | | |
| Falls B/C: Preis Monat/Jahr | | |
| Falls B/C: was ist Pro? | | |

Danach trägt Claude Code die Entscheidung in `docs/Entscheidungen.md` ein und baut – nur bei B/C/D – den Kauf ein.
