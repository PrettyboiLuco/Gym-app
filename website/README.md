# Webseiten für die Veröffentlichung (Phase 10.2)

Apple verlangt eine öffentlich erreichbare Datenschutz-URL (und Google ebenso, LAW-009). Diese Seiten sind
**Entwürfe** und werden erst nach der Rechtsprüfung (`docs/Rechtspruefung_Mappe.md`) veröffentlicht.

| Datei | Inhalt |
|---|---|
| `datenschutz.html` | Datenschutzerklärung (Platzhalter in eckigen Klammern) |
| `impressum.html` | Impressum nach § 5 DDG (Umfang klärt die Rechtsprüfung) |
| `index.html` | Startseite (31.10.2026): Stil getlayers.ai „Relay“, Hero nach „soda-hero“ mit live drehbarem 3D-Herz („SVG to 3D“), Einblick mit echten App-Bildschirmen (Beispieldaten), Regeln nach taste-skill |
| `assets/` | App-Bildschirme (WebP), Logo-SVG, App-Symbol |
| `vendor/three/` | three.js 0.158.0 (MIT) – liegt hier, damit keine Anfrage an ein CDN geht |
| `fonts/` | Manrope (SIL Open Font License) – selbst gehostet, keine Anfrage an Google Fonts (Datenschutz) |

**Startseite ansehen:** Ordner mit einem kleinen Webserver öffnen (z. B. `npx serve website`); direkt als Datei
geöffnet lädt der Browser die 3D-Bibliothek nicht (dann bleibt das App-Symbol als Bild stehen).
**Vor dem Veröffentlichen:** Datenschutzerklärung um die Startseite ergänzen (keine Cookies, keine Drittanbieter,
nur Server-Protokoll des Hosters) und die Bildschirmfotos ggf. durch neue mit echten Daten ersetzen.

**Kostenlos veröffentlichen (Vorschlag):** GitHub Pages. Dafür muss das Repository öffentlich sein oder ein
kostenpflichtiger GitHub-Tarif genutzt werden – alternativ ein eigenes kleines Repository nur für diese Seiten.
Entscheidung Luc (offen). Danach die URL in App Store Connect und in der App (Mehr → Datenschutz) eintragen.
