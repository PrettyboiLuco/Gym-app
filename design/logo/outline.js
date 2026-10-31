// Offset outline (miter joins, flat ends) of an open polyline -> closed polygon path.
function outline(pts, w) {
  const n = pts.length, L = [], R = [];
  const norm = (a, b) => { const dx = b[0]-a[0], dy = b[1]-a[1], l = Math.hypot(dx, dy); return [-dy/l, dx/l]; };
  for (let i = 0; i < n; i++) {
    let nx, ny, s = 1;
    if (i === 0) [nx, ny] = norm(pts[0], pts[1]);
    else if (i === n-1) [nx, ny] = norm(pts[n-2], pts[n-1]);
    else {
      const a = norm(pts[i-1], pts[i]), b = norm(pts[i], pts[i+1]);
      nx = a[0]+b[0]; ny = a[1]+b[1]; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
      s = 1 / (nx*a[0] + ny*a[1]);
    }
    L.push([pts[i][0] + nx*w*s, pts[i][1] + ny*w*s]);
    R.push([pts[i][0] - nx*w*s, pts[i][1] - ny*w*s]);
  }
  const poly = [...L, ...R.reverse()];
  return 'M' + poly.map(p => p.map(v => v.toFixed(2)).join(' ')).join(' L') + ' Z';
}
const heart = 'M50 88 C10 55 0 30 22 15 C38 4 50 20 50 20 C50 20 62 4 78 15 C100 30 90 55 50 88 Z';
const pulse = outline([[20,46],[36,46],[42,33],[50,62],[57,38],[62,46],[80,46]], 3.2);
console.log(JSON.stringify({ heart, pulse }));
