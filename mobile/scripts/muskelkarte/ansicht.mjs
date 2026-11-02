// Sichtprüfung der Muskelkarte: zeichnet src/components/muscle-figure.ts hell und dunkel, in den Größen der App
// (Statistik 124 × 265, „Heute“ 54 × 116) und dreifach vergrößert, beide Körperformen (flach, ohne 3D-Verläufe) – als
// PNG für einen Vorher/Nachher-Vergleich.
//
//   node scripts/muskelkarte/ansicht.mjs [ausgabe.png] ['{"brust":4,"ruecken":2}'] [ganzkoerper-stufe]
//
// Braucht die installierten Pakete (typescript) und Playwright mit Chromium.
import fs from 'fs';
import { createRequire } from 'module';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '../..');
const require = createRequire(join(app, 'package.json'));
const ts = require('typescript');
const { chromium } = require('playwright');

const load = (file) => {
  const js = ts.transpileModule(fs.readFileSync(join(app, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  // Die Zeichnung braucht aus der Logik nur die Muskelgruppe je Muskel; für das Bild reicht ein Platzhalter.
  new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({ MAP_GROUP: new Proxy({}, { get: () => 'gruppe' }) }));
  return mod.exports;
};
const { BODIES, VIEWBOX } = load('src/components/muscle-figure.ts');
const themeSrc = fs.readFileSync(join(app, 'src/constants/theme.ts'), 'utf8');
const ramp = (name) => [...themeSrc.match(new RegExp(`${name}: \\[([^\\]]+)\\]`))[1].matchAll(/'(#[0-9A-Fa-f]{6})'/g)].map((m) => m[1]);
const THEMES = {
  light: { bg: '#FFFFFF', body: '#EEEEEE', detail: '#DCDDE0', hair: '#BDBFC4', ramp: ramp('light') },
  dark: { bg: '#111111', body: '#2A2A2A', detail: '#363636', hair: '#1B1B1B', ramp: ramp('dark') },
};

const out = resolve(process.argv[2] ?? 'muskelkarte.png');
const levels = JSON.parse(process.argv[3] || '{"brust":4,"schultern":3,"arme":2,"bauch":1,"beine":4,"nacken":2,"ruecken":3,"gesaess":4,"waden":1,"huefte":2}');
const whole = Number(process.argv[4] ?? 0);

function view(set, side, theme, w, h, gap, withDetails) {
  const regions = set[side];
  const details = withDetails ? set.details[side.replace('Mini', '')] : null;
  const OUTLINE = set.outline;
  const muscles = regions
    .map((r) =>
      r.paths
        .map(
          (d) =>
            `<path d="${d}" fill="${theme.ramp[levels[r.muscle] ?? levels[r.group] ?? 0]}" stroke="${theme.body}" stroke-width="${gap}" stroke-linejoin="round"/>`
        )
        .join('')
    )
    .join('');
  const ring = whole ? `<path d="${OUTLINE}" fill="none" stroke="${theme.ramp[whole]}" stroke-width="${gap * 1.2}" stroke-linejoin="round"/>` : '';
  const extra = details
    ? details.fills.map((d) => `<path d="${d}" fill="${theme.detail}"/>`).join('') +
      details.hair.map((d) => `<path d="${d}" fill="${theme.hair}"/>`).join('') +
      details.lines.map((d) => `<path d="${d}" fill="none" stroke="${theme.detail}" stroke-width="${gap * 0.8}" stroke-linecap="round"/>`).join('')
    : '';
  return `<svg width="${w}" height="${h}" viewBox="${VIEWBOX}"><path d="${OUTLINE}" fill="${theme.body}"/>${extra}${muscles}${ring}</svg>`;
}

let html = '<body style="margin:0">';
for (const set of Object.values(BODIES))
  for (const theme of Object.values(THEMES)) {
    html += `<div style="background:${theme.bg};padding:20px;display:flex;gap:24px;align-items:flex-end">`;
    html += view(set, 'front', theme, 124, 265, 1, true) + view(set, 'back', theme, 124, 265, 1, true);
    html += `<div style="display:flex;gap:4px">${view(set, 'frontMini', theme, 54, 116, 1.6)}${view(set, 'backMini', theme, 54, 116, 1.6)}</div>`;
    html += view(set, 'front', theme, 372, 795, 1, true) + view(set, 'back', theme, 372, 795, 1, true) + '</div>';
  }
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(html + '</body>');
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
