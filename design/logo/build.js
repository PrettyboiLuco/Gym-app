// Erzeugt alle App-Symbole aus logo.svg. Braucht Playwright mit Chromium (in der Cloud-Umgebung vorhanden).
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const svg = fs.readFileSync(path.join(__dirname, 'logo.svg'), 'utf8').replace('fill="#C6F24E"', 'fill="currentColor"');
const img = path.join(__dirname, '../../mobile/assets/images');
const angle = { rotX: 0.18, rotY: -0.45 };
const jobs = [
  { out: `${img}/icon.png`, params: { svg, size: 1024, distance: 560, ...angle } },
  { out: `${img}/splash-icon.png`, params: { svg, size: 512, distance: 560, ...angle } },
  // Android: Motiv in der sicheren Mitte (66 %), Hintergrund schwarz
  { out: `${img}/android-icon-foreground.png`, params: { svg, size: 512, distance: 860, ...angle } },
  { out: `${img}/favicon.png`, params: { svg, size: 48, distance: 500, ...angle } },
];
const jobsFile = path.join(__dirname, '.jobs.json');
fs.writeFileSync(jobsFile, JSON.stringify(jobs));
execFileSync('node', [path.join(__dirname, 'run.js'), jobsFile], { stdio: 'inherit' });
fs.unlinkSync(jobsFile);

// Flache Varianten: Android-Hintergrund (schwarz) und Monochrom-Symbol (weiß, transparent, sichere Mitte).
(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const flat = async (size, fill, background, scale) => page.evaluate(async ({ svg, size, fill, background, scale }) => {
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, size, size); }
    if (scale) {
      const src = svg.replace('fill="currentColor"', `fill="${fill}"`);
      const im = new Image(); im.src = 'data:image/svg+xml;base64,' + btoa(src); await im.decode();
      const w = size * scale, h = w * 0.92;
      ctx.drawImage(im, (size - w) / 2, (size - h) / 2, w, h);
    }
    return c.toDataURL('image/png');
  }, { svg, size, fill, background, scale });
  const save = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  save(`${img}/android-icon-background.png`, await flat(512, null, '#000000', 0));
  save(`${img}/android-icon-monochrome.png`, await flat(432, '#FFFFFF', null, 0.5));
  console.log('wrote android background + monochrome');
  await browser.close();
})();
