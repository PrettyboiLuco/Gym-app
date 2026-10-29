# Gym-App (Expo)

Die App selbst. Planung und Register liegen in `../docs` und `../register`.

## Auf dem iPhone starten (am PC)

1. Node.js (LTS) und Git installieren (Fahrplan Phase 0).
2. Im Ordner `mobile`:
   ```bash
   npm install
   npx expo start
   ```
3. Den QR-Code mit der iPhone-Kamera scannen → öffnet sich in **Expo Go**.
   PC und iPhone müssen im selben WLAN sein.

## Prüfungen vor jedem Commit

```bash
npm run typecheck   # Typprüfung
npx expo lint       # Codestil
npm test            # automatische Tests
```

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/app/` | Die Bildschirme (Heute, Training, Ernährung, Fortschritt, Mehr) |
| `src/components/` | Wiederverwendbare Bausteine (Karte, Knopf, Tableiste) |
| `src/domain/` | Rechenlogik ohne Oberfläche, mit Tests in `__tests__` |
| `src/data/` | Lokale Datenbank (SQLite) und Migrationen |
| `src/i18n/` | Sprachdateien – jeder sichtbare Text steht in `de.ts` |
