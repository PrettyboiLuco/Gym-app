// Sichtprüfung der Muskelkarte: zeichnet beide Körperformen (src/components/body-art.ts über muscle-figure.ts) hell und
// dunkel, vorne und hinten, mit Beispiel-Stufen – als PNG für einen Vorher/Nachher-Vergleich.
//
//   node scripts/muskelkarte/ansicht.mjs [ausgabe.png] ['{"chest":4,"quadriceps":2}']
//
// Die Stufen gelten je Körperteil der Zeichnung (chest, abs, biceps …). Braucht die installierten Pakete (typescript)
// und Playwright mit Chromium.
import fs from 'fs';
import { createRequire } from 'module';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '../..');
const require = createRequire(join(app, 'package.json'));
const ts = require('typescript');
const { chromium } = require('playwright');

const modules = {};
function load(file) {
  if (modules[file]) return modules[file];
  const js = ts.transpileModule(fs.readFileSync(join(app, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  const req = (spec) => (spec === '@/components/body-art' ? load('src/components/body-art.ts') : {});
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req);
  return (modules[file] = mod.exports);
}
const { BODIES } = load('src/components/muscle-figure.ts');
const themeSrc = fs.readFileSync(join(app, 'src/constants/theme.ts'), 'utf8');
const ramp = (name) => [...themeSrc.match(new RegExp(`${name}: \\[([^\\]]+)\\]`))[1].matchAll(/'(#[0-9A-Fa-f]{6})'/g)].map((m) => m[1]);
const color = (obj, scheme) =>
  themeSrc.match(new RegExp(`export const ${obj} = \\{ light: '(#[0-9A-Fa-f]{6})', dark: '(#[0-9A-Fa-f]{6})'`))[scheme === 'light' ? 1 : 2];
const THEMES = ['light', 'dark'].map((s) => ({
  bg: s === 'light' ? '#FFFFFF' : '#111111',
  skin: color('BodyDetail', s),
  hair: color('BodyHair', s),
  ramp: ramp(s),
}));

const out = resolve(process.argv[2] ?? 'muskelkarte.png');
const levels = JSON.parse(process.argv[3] || '{"chest":4,"deltoids":3,"biceps":2,"abs":1,"quadriceps":4,"upper-back":3,"gluteal":4,"calves":1}');

function view(v, theme, w, h) {
  let s = '';
  for (const part of v.base) for (const d of part.paths) s += `<path d="${d}" fill="${part.hair ? theme.hair : theme.skin}"/>`;
  for (const r of v.regions) for (const d of r.paths) s += `<path d="${d}" fill="${theme.ramp[levels[r.key] ?? 0]}"/>`;
  return `<svg width="${w}" height="${h}" viewBox="${v.viewBox}">${s}</svg>`;
}

let html = '<body style="margin:0">';
for (const theme of THEMES) {
  html += `<div style="background:${theme.bg};padding:20px;display:flex;gap:24px;align-items:flex-end">`;
  for (const set of Object.values(BODIES)) html += view(set.front, theme, 124, 265) + view(set.back, theme, 124, 265);
  for (const set of Object.values(BODIES))
    html += `<div style="display:flex;gap:4px">${view(set.front, theme, 54, 116)}${view(set.back, theme, 54, 116)}</div>`;
  html += '</div>';
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(html + '</body>');
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
