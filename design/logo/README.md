# App-Symbol (3D-Herz)

Herz mit ausgeschnittener Pulslinie, als 3D-Körper in Lime-Chrom (#C6F24E) auf Schwarz.
Vorlage: getlayers.ai Tool „SVG to 3D“, Preset *Heart*, Farbe/Licht #C6F24E, Hintergrund #000000, Drehung aus.
Alle Werte (Material, Licht, Bloom, Normalen) sind 1:1 aus dem Build-Prompt des Tools übernommen; `render.html`
setzt sie mit three.js **0.158.0** um (genau diese Version, sonst ändern sich Chrom und Glanz).

| Datei | Inhalt |
|---|---|
| `logo.svg` | Form (Herz + Pulslinie als Loch). Hier ändern, wenn das Motiv sich ändert |
| `outline.js` | Rechnet die Pulslinie in eine geschlossene Fläche um (für das Loch) |
| `render.html` / `run.js` | 3D-Darstellung im Browser, Ausgabe als PNG |
| `build.js` | Erzeugt alle Symbole nach `mobile/assets/images/` |

**Neu erzeugen:** `npm install && npm run build` (braucht Playwright mit Chromium). Danach `icon.png`, `favicon.png`
und `android-icon-background.png` ohne Transparenz speichern (App Store verlangt das beim Symbol), z. B.
`python3 -c "from PIL import Image; [Image.open(f).convert('RGB').save(f) for f in ['icon.png','favicon.png','android-icon-background.png']]"`
im Ordner `mobile/assets/images`.

Das neue Symbol erscheint erst mit dem nächsten Build (TestFlight); Expo Go zeigt immer sein eigenes Symbol.
