# Grundnahrungsmittel (Ausbauplan A4)

Erzeugt `src/domain/basis-foods-data.ts` – die offline mitgelieferte Lebensmittelliste.

- **Quelle der Werte:** USDA National Nutrient Database for Standard Reference, Release 28 (2015). Werke der
  US-Regierung sind gemeinfrei. Bezogen über das npm-Paket `fda-nutrient-database@1.0.2` (Ordner `package/data`,
  Datei `ABBREV.txt`), weil die Server von USDA, BLS und Open Food Facts aus der Bauumgebung nicht erreichbar waren.
- **Eigene Zuordnung:** deutsche Namen, Synonyme, Gruppen, Portionen, Allergene und Ernährungsweise (`picks/*.json`).
  Allergene/Ernährungsweise werden nur gesetzt, wenn sie eindeutig sind; sonst `null` (= „keine Aussage“).
- **Umrechnung:** Kohlenhydrate ohne Ballaststoffe (EU-Etikett), Salz = Natrium × 2,5.
- **Bekannte Annäherungen:** u. a. Milch 3,5 % = US-Vollmilch 3,25 %, Magerquark = fettfreier Hüttenkäse ohne Rahm,
  Skyr = griechischer Joghurt 0 %, Räucherlachs = Wildlachs (Zuchtlachs ist fetter). Liste in den Berichten der Auswahl.

```
npm pack fda-nutrient-database@1.0.2 && tar xzf fda-nutrient-database-1.0.2.tgz -C /tmp/sr28
python3 -I scripts/basis-foods/generate.py /tmp/sr28/package/data
```

Nach Änderungen an der Liste `BASIS_VERSION` in `src/domain/basis-foods.ts` erhöhen – dann aktualisiert die App
verknüpfte Einträge beim nächsten Start (vom Nutzer geänderte bleiben unberührt).
