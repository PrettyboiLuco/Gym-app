// UI-Rundgang für Prüfungen ohne iPhone: legt Testdaten an und fotografiert jeden wichtigen Bildschirm (Web-Vorschau).
//
// Voraussetzungen (im Ordner mobile/):
//   npm ci
//   CI=1 npx expo start --web --port 8081          (in einem zweiten Terminal laufen lassen, bis „Waiting on …“)
//   npx playwright install chromium               (nur falls noch kein Chromium da ist)
// Aufruf:
//   node scripts/ui-tour.mjs [ausgabeordner]       (Standard: ui-tour/, dort dark-*.png und light-*.png)
//
// Grenzen der Web-Vorschau: Haptik, Mitteilungen, Kamera/Barcode, Face ID, Wischgesten, Glas-Tab-Leiste und
// Federgefühl gibt es nur auf dem iPhone. Alles andere (Layout, Texte, Zahlen, Fenster, Abläufe) ist echt.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:8081';
const OUT = process.argv[2] ?? 'ui-tour';
mkdirSync(OUT, { recursive: true });

const wait = (page, ms) => page.waitForTimeout(ms);

async function tap(page, name) {
  const byRole = page.getByRole('button', { name, exact: true });
  if (await byRole.count()) return byRole.first().click();
  return page.getByText(name, { exact: true }).last().click();
}

async function go(page, path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await wait(page, 1800);
}

/** React Native Web scrollt in einem inneren Container: mehrere Bilder je Seite. */
async function shoot(page, name, parts = 3) {
  for (let i = 0; i < parts; i++) {
    await page.screenshot({ path: join(OUT, `${name}-${i}.png`) });
    await page.mouse.move(195, 380);
    await page.mouse.wheel(0, 520);
    await wait(page, 700);
  }
}

async function seed(page) {
  // Erststart: volljährig → sensible Situation → Einheiten → Coach überspringen
  await go(page, '/');
  await tap(page, 'Ja');
  for (const step of ['Weiter', 'Weiter', 'Überspringen']) await tap(page, step).catch(() => {});
  await wait(page, 1500);
  // Beispielplan (4 Tage) übernehmen
  await go(page, '/training/import');
  await tap(page, '„Lucs Training“ laden');
  await wait(page, 800);
  await tap(page, 'Plan übernehmen');
  await wait(page, 1200);
  // Kalorien- und Trinkziel
  await go(page, '/nutrition/settings');
  await page.locator('input').nth(0).fill('2600');
  await page.locator('input').nth(1).fill('2500');
  await tap(page, 'Speichern');
  await wait(page, 800);
  // vier Mahlzeiten als Schnelleintrag (kcal, Eiweiß, KH, Fett, Name)
  const meals = [
    ['fruehstueck', '520', '22', '78', '12', 'Haferflocken mit Beeren'],
    ['mittag', '740', '55', '80', '18', 'Hähnchen, Reis, Brokkoli'],
    ['snack', '260', '24', '30', '2', 'Skyr mit Honig'],
    ['abend', '430', '32', '28', '20', 'Lachs mit Kartoffeln'],
  ];
  for (const [meal, ...values] of meals) {
    await go(page, `/nutrition/quick?meal=${meal}`);
    const inputs = page.locator('input');
    for (let i = 0; i < values.length; i++) await inputs.nth(i).fill(values[i]);
    await tap(page, 'Eintragen');
    await wait(page, 800);
  }
  await go(page, '/nutrition');
  await page
    .getByRole('button', { name: '+500 ml Wasser' })
    .first()
    .click()
    .catch(() => {});
  await page
    .getByRole('button', { name: 'Kaffee 200 ml' })
    .first()
    .click()
    .catch(() => {});
  // Gewicht
  await go(page, '/progress');
  await page.locator('input').first().fill('82,4');
  await tap(page, 'Speichern').catch(() => {});
  await wait(page, 800);
}

async function trainingRun(page, prefix) {
  await go(page, '/training');
  for (const start of ['Training starten', 'Trotzdem trainieren', 'Weiter trainieren']) {
    const b = page.getByRole('button', { name: start, exact: true });
    if (await b.count()) {
      await b.first().click();
      break;
    }
  }
  await wait(page, 2500);
  const inputs = page.locator('input');
  await inputs.nth(0).fill('40');
  await inputs.nth(1).fill('10');
  await page
    .locator('[aria-label^="Satz erledigt"]')
    .first()
    .click()
    .catch(() => {});
  await wait(page, 1500);
  await page.screenshot({ path: join(OUT, `${prefix}-training-pause.png`) });
  // Pause überspringen, damit die Satztabelle sichtbar ist
  for (let i = 0; i < 3; i++) {
    const skip = page.getByRole('button', { name: 'Überspringen', exact: true });
    if (!(await skip.count())) break;
    // Das Vollbild liegt als oberste Ebene über der Seite: dort den letzten (sichtbaren) Knopf nehmen.
    await skip
      .last()
      .click({ force: true })
      .catch(() => {});
    await wait(page, 700);
  }
  await shoot(page, `${prefix}-training-session`, 3);
  const end = page.getByRole('button', { name: 'Training beenden', exact: true }).first();
  await end.scrollIntoViewIfNeeded().catch(() => {});
  await end.click().catch(() => {});
  await wait(page, 1200);
  for (const confirm of ['Beenden', 'Training beenden']) {
    if (page.url().includes('/summary')) break;
    const b = page.getByRole('button', { name: confirm, exact: true });
    if (await b.count())
      await b
        .last()
        .click({ force: true })
        .catch(() => {});
    await wait(page, 1000);
  }
  await wait(page, 2500);
  await shoot(page, `${prefix}-training-summary`, 3);
}

const SCREENS = [
  ['heute', '/'],
  ['training', '/training'],
  ['training-stats', '/training/stats'],
  ['training-history', '/training/history'],
  ['ernaehrung', '/nutrition'],
  ['ernaehrung-add', '/nutrition/add'],
  ['ernaehrung-week', '/nutrition/week'],
  ['ernaehrung-gaps', '/nutrition/gaps'],
  ['ernaehrung-budget', '/nutrition/budget'],
  ['ernaehrung-fasting', '/nutrition/fasting'],
  ['fortschritt', '/progress'],
  ['einblicke', '/progress/insights'],
  ['bereitschaft', '/progress/readiness'],
  ['mehr', '/more'],
];

const browser = await chromium.launch();
for (const scheme of ['dark', 'light']) {
  const context = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, colorScheme: scheme });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)));
  await seed(page);
  for (const [name, path] of SCREENS) {
    await go(page, path);
    if (path === '/') await wait(page, 3500); // Start-Intro abwarten
    await shoot(page, `${scheme}-${name}`, scheme === 'dark' ? 4 : 2);
  }
  if (scheme === 'dark') {
    // Fenster der Ernährung
    await go(page, '/nutrition');
    await page
      .getByRole('button', { name: /Nährwerte/ })
      .first()
      .click()
      .catch(() => {});
    await wait(page, 1600);
    await page.screenshot({ path: join(OUT, 'dark-fenster-naehrwerte.png') });
    await go(page, '/nutrition');
    await page
      .locator('[aria-label*="Optionen"]')
      .first()
      .click()
      .catch(() => {});
    await wait(page, 1600);
    await page.screenshot({ path: join(OUT, 'dark-fenster-mahlzeit.png') });
    await trainingRun(page, scheme);
  }
  console.log(`${scheme}: fertig${errors.length ? `, Konsolenfehler:\n  ${errors.slice(0, 10).join('\n  ')}` : ', keine Konsolenfehler'}`);
  await context.close();
}
await browser.close();
console.log(`Screenshots in ${OUT}/`);
