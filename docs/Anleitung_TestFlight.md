# Anleitung: Apple Developer Program und TestFlight – Fahrplan 7.1 und 7.2

Stand 30.10.2026. Die App ist für den Pilot vorbereitet (Build-Profile, Exportkontrolle, Feedback in der App).
Diese Schritte kann nur Luc selbst machen, weil sie Konto, Zahlung und Identität betreffen.

## 7.1 Apple Developer Program (99 $/Jahr, BUS-011)

1. developer.apple.com/programs → „Enroll“ mit deiner Apple-ID (Zwei-Faktor-Anmeldung muss an sein).
2. Als **Einzelperson** anmelden: Im App Store erscheint dann dein rechtlicher Name als Anbieter (BUS-011).
   Eine Firma (mit D-U-N-S-Nummer) wäre später möglich, ist für den Pilot nicht nötig.
3. Bezahlen; die Freischaltung dauert meist einige Stunden bis zwei Tage.

## Vorher festlegen (offene Entscheidungen)

- **App-Name:** Arbeitstitel „Myhealth“ (Entscheidung Luc 30.10.2026, endgültiger Name offen). Der Name im App Store
  muss dort einmalig sein; ist „Myhealth“ schon vergeben, in App Store Connect z. B. „Myhealth Pilot“ eintragen –
  unter dem Symbol auf dem iPhone steht trotzdem „Myhealth“.
- **Bundle-ID:** `myhealth.system` (eingetragen in `mobile/app.json`, Entscheidung Luc 30.10.2026). Nach dem
  ersten Upload gehört sie fest zu dieser App. Ist sie bei Apple schon vergeben, meldet EAS das beim Build –
  dann eine andere wählen.
- **App-Symbol**: Noch ist das Expo-Standardsymbol drin. Ein eigenes Symbol (1024×1024) brauchst du spätestens
  für den App Store, für TestFlight ist es dringend empfohlen.

## 7.2 TestFlight-Version bauen und verteilen

Alles vom Windows-PC oder MacBook aus, ohne Xcode (EAS baut in der Cloud):

1. Im Ordner `mobile`: `npx eas-cli@latest login` (dein Expo-Konto).
2. `npx eas-cli@latest build --platform ios --profile production`
   – EAS fragt nach der Apple-ID und legt Zertifikate selbst an. Die Build-Nummer zählt automatisch hoch.
3. `npx eas-cli@latest submit --platform ios --latest`
   – lädt den Build zu App Store Connect hoch (beim ersten Mal wird die App dort angelegt).
4. In App Store Connect → deine App → TestFlight:
   - **Interne Tester** (bis 100 Personen mit Zugang zu deinem Team): sofort, ohne Prüfung.
   - **Externe Tester** (deine 5–10 Leute aus dem Gym, BUS-016): Gruppe anlegen, Build zuweisen,
     „Beta-App-Beschreibung“, Feedback-E-Mail und Kontaktdaten ausfüllen; die erste Version geht durch eine
     kurze Beta-Prüfung von Apple. Danach per öffentlichem Link oder E-Mail einladen.
5. Tester installieren die App „TestFlight“ aus dem App Store und öffnen deinen Link.

Hinweise:
- `ITSAppUsesNonExemptEncryption = false` ist gesetzt: Die App nutzt nur normale HTTPS-Verbindungen
  (Open Food Facts), daher keine Exportkontroll-Frage bei jedem Build.
- Ein TestFlight-Build läuft 90 Tage; danach neuen Build hochladen.
- Datenschutzangaben („App Privacy“) fragt Apple erst für die App-Store-Veröffentlichung verbindlich ab;
  ein Entwurf liegt in `docs/Datenschutz_Entwurf.md` (nicht rechtlich geprüft, Phase 10.2).
- Absturzberichte und Bildschirmfoto-Feedback der Tester siehst du in App Store Connect → TestFlight.

## Korrekturen ohne neuen Build (EAS Update)

Reine Code-Änderungen (keine neuen nativen Pakete) lassen sich direkt an die TestFlight-Version schicken:
`npx eas-cli@latest update --channel production --message "Kurzbeschreibung"`. Die Tester bekommen sie beim
nächsten Neustart der App. Sobald ein neues natives Paket dazukommt, ist ein neuer Build nötig.

## Danach (7.3)

Ablauf, Fragen und Auswertung: `docs/Pilot_Leitfaden.md`. In der App: Mehr → Feedback geben.
