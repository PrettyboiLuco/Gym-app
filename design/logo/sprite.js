// Erzeugt die Herz-Animation für den Erststart als Bildstreifen (Raster 6 × 6, 36 Bilder, nahtlose Schleife):
// das 3D-Herz pendelt sanft um die Hochachse. Je eine Fassung für dunklen und hellen Grund.
// Aufruf: node sprite.js (danach baut sprite.py die Raster-JPEGs nach mobile/assets/images/).
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const svg = fs.readFileSync(path.join(__dirname, 'logo.svg'), 'utf8').replace('fill="#C6F24E"', 'fill="currentColor"');
const out = path.join(__dirname, '.frames');
fs.mkdirSync(out, { recursive: true });
const N = 36, SIZE = 240;
const jobs = [];
for (const [name, background] of [['dark', '#000000'], ['light', '#F6F6F7']]) {
  for (let i = 0; i < N; i++) {
    const phase = (2 * Math.PI * i) / N;
    jobs.push({ out: path.join(out, `${name}-${String(i).padStart(2, '0')}.png`), params: { svg, size: SIZE, distance: 560, background, rotX: 0.16 + 0.05 * Math.sin(phase * 2), rotY: -0.25 + 0.55 * Math.sin(phase) } });
  }
}
const jobsFile = path.join(__dirname, '.jobs.json');
fs.writeFileSync(jobsFile, JSON.stringify(jobs));
execFileSync('node', [path.join(__dirname, 'run.js'), jobsFile], { stdio: 'inherit' });
fs.unlinkSync(jobsFile);
