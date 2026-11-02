// Die drei Logo-Vorschläge als gefüllte Flächen (SVGLoader braucht Flächen, keine Linien) für getlayers „SVG to 3D“.
const fs = require('fs');
const path = require('path');
const f = (n) => n.toFixed(2);
// Linienzug -> geschlossene Fläche (Gehrung an den Ecken, flache Enden), wie outline.js beim Herz
function outline(pts, w) {
  const n = pts.length, L = [], R = [];
  const norm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [-dy / l, dx / l]; };
  for (let i = 0; i < n; i++) {
    let nx, ny, s = 1;
    if (i === 0) [nx, ny] = norm(pts[0], pts[1]);
    else if (i === n - 1) [nx, ny] = norm(pts[n - 2], pts[n - 1]);
    else {
      const a = norm(pts[i - 1], pts[i]), b = norm(pts[i], pts[i + 1]);
      nx = a[0] + b[0]; ny = a[1] + b[1]; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
      s = Math.min(1 / (nx * a[0] + ny * a[1]), 2.2);
    }
    L.push([pts[i][0] + nx * w * s, pts[i][1] + ny * w * s]);
    R.push([pts[i][0] - nx * w * s, pts[i][1] - ny * w * s]);
  }
  const poly = [...L, ...R.reverse()];
  return 'M' + poly.map((p) => p.map(f).join(' ')).join(' L') + ' Z';
}
const rect = (x, y, w, h, r) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
// Ringbogen als Fläche: außen im Uhrzeigersinn, innen zurück
function arc(cx, cy, rOut, rIn, a0, a1, steps = 90) {
  const pts = [];
  for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; pts.push([cx + rOut * Math.cos(a), cy + rOut * Math.sin(a)]); }
  for (let i = steps; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / steps; pts.push([cx + rIn * Math.cos(a), cy + rIn * Math.sin(a)]); }
  return 'M' + pts.map((p) => p.map(f).join(' ')).join(' L') + ' Z';
}
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor">${inner}</svg>`;
const logos = {
  // 1 Puls-Hantel: Scheiben links/rechts, die Stange ist eine Pulslinie
  pulshantel: svg(
    rect(10, 33, 7, 34, 3) + rect(19, 39, 6, 22, 2.5) + rect(83, 33, 7, 34, 3) + rect(75, 39, 6, 22, 2.5) +
      `<path d="${outline([[25, 50], [38, 50], [43, 37], [50, 64], [55, 50], [75, 50]], 3.2)}"/>`
  ),
  // 2 M-Puls: das M von Myhealth als Herzschlag, mit Punkt am Ende
  mpuls: svg(`<path d="${outline([[12, 60], [26, 60], [32, 28], [50, 64], [68, 28], [74, 60], [84, 60]], 4.2)}"/><circle cx="88" cy="60" r="5.2"/>`),
  // 3 Ring + Herzschlag: drei Viertel Fortschrittsring, innen der Puls
  ring: svg(
    `<path d="${arc(50, 50, 38, 30, -Math.PI / 2, Math.PI * 0.95)}"/>` +
      `<path d="${outline([[28, 51], [39, 51], [43, 41], [50, 61], [54, 51], [70, 51]], 3)}"/>`
  ),
};
const jobs = [];
for (const [name, s] of Object.entries(logos)) {
  fs.writeFileSync(path.join(__dirname, `3d/${name}.svg`), s);
  jobs.push({ out: path.join(__dirname, `3d/${name}-3d.png`), params: { svg: s, size: 1024, rotY: -0.42, rotX: 0.06 } });
  jobs.push({ out: path.join(__dirname, `3d/${name}-3d-front.png`), params: { svg: s, size: 1024 } });
}
fs.writeFileSync(path.join(__dirname, '3d/jobs.json'), JSON.stringify(jobs));
console.log(jobs.length, 'jobs');
