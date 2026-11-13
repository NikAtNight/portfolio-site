// PROTOTYPE boss alternatives (Claude designer, file 1 of 3). Throwaway.
// Bosses: Recursive Hydra, The Unverified Claim, Phantom Charge. Five original
// concepts each, drawn procedurally: shapes go into a material grid, then one
// pass adds hue-shifted shading, contact shadows, selective outlines and a rim.
window.SpriteSheet = window.SpriteSheet || { groups: [], add(group, name, frames, opts = {}) {
  let g = this.groups.find(x => x.name === group); if (!g) this.groups.push(g = { name: group, items: [] });
  const i = g.items.findIndex(x => x.name === name), item = { name, frames, fps: opts.fps || 6, note: opts.note || '' };
  i >= 0 ? (g.items[i] = item) : g.items.push(item);
} };
(() => {
  // =====================================================================
  // engine
  // =====================================================================
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const OUT = rgb('#05070d'), COOL = rgb('#1d1548'), WARM = rgb('#fff1c4');
  const MATS = [null];
  // ramps lean violet in the shadows and warm in the highlights
  const shift = t => t.map((c, i) => {
    const n = t.length; if (n < 3) return c;
    const k = i / (n - 1);
    return k < 0.5 ? mix(c, COOL, (0.5 - k) * 0.5) : k > 0.6 ? mix(c, WARM, (k - 0.6) * 0.3) : c;
  });
  // tones: [deep, shadow, base, light, (spec)]
  // o.flat: one colour, no shading. o.alpha: translucency. o.noLine: no outline (strings, sparks).
  const mat = (tones, o = {}) => {
    const t = tones.map(rgb);
    MATS.push({ tones: o.flat || o.raw ? t : shift(t), flat: !!o.flat, shiny: !!o.shiny, alpha: o.alpha == null ? 1 : o.alpha, noLine: !!o.noLine });
    return MATS.length - 1;
  };
  const flat = (c, o = {}) => mat([c], { ...o, flat: true });

  const F5 = { // 5x7
    A: [14, 17, 17, 31, 17, 17, 17], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31],
    G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], K: [17, 18, 20, 24, 20, 18, 17], N: [17, 25, 21, 19, 17, 17, 17],
    O: [14, 17, 17, 17, 17, 17, 14], R: [30, 17, 17, 30, 20, 18, 17], X: [17, 17, 10, 4, 10, 17, 17], $: [4, 15, 20, 14, 5, 30, 4], '!': [4, 4, 4, 4, 4, 0, 4], ' ': [0, 0, 0, 0, 0, 0, 0],
  };
  const F3 = { // 3x5
    A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3],
    H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7], M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2],
    P: [6, 5, 6, 4, 4], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5],
    X: [5, 5, 2, 5, 5], Y: [5, 5, 2, 2, 2], 0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [6, 1, 2, 4, 7], 3: [6, 1, 2, 1, 6], 4: [5, 5, 7, 1, 1],
    5: [7, 4, 6, 1, 6], 6: [3, 4, 7, 5, 7], 7: [7, 1, 2, 2, 2], 8: [7, 5, 7, 5, 7], 9: [7, 5, 7, 1, 6], '!': [2, 2, 2, 0, 2], '.': [0, 0, 0, 0, 2],
    ':': [0, 2, 0, 2, 0], '-': [0, 0, 7, 0, 0], '?': [6, 1, 2, 0, 2], '%': [5, 1, 2, 4, 5], ' ': [0, 0, 0, 0, 0],
  };

  class Grid {
    constructor(w, h) { this.w = w; this.h = h; this.m = new Uint8Array(w * h); this.p = new Uint8Array(w * h); this.pc = 1; this.ox = 0; this.oy = 0; }
    // origin offset, so a concept can be nudged inside its canvas without touching its coordinates
    origin(ox, oy) { this.ox = ox; this.oy = oy; return this; }
    part() { this.pc = Math.min(255, this.pc + 1); return this; }
    at(x, y) { x = Math.round(x) + this.ox; y = Math.round(y) + this.oy; return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.m[y * this.w + x]; }
    raw(x, y, m) { x += this.ox; y += this.oy; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; this.m[i] = m; this.p[i] = m ? this.pc : 0; }
    px(x, y, m) { this.raw(Math.round(x), Math.round(y), m); }
    rect(x, y, w, h, m) { x = Math.round(x); y = Math.round(y); for (let j = 0; j < Math.round(h); j++) for (let i = 0; i < Math.round(w); i++) this.raw(x + i, y + j, m); }
    ell(cx, cy, rx, ry, m) {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5); if (dx * dx + dy * dy <= 1) this.raw(x, y, m);
      }
    }
    rrect(x, y, w, h, r, m) {
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const px = x + i, py = y + j, cx = Math.min(Math.max(px, x + r), x + w - 1 - r), cy = Math.min(Math.max(py, y + r), y + h - 1 - r);
        if ((px - cx) ** 2 + (py - cy) ** 2 <= (r + 0.35) ** 2) this.raw(px, py, m);
      }
    }
    dot(x, y, th, m) {
      if (th <= 1.2) return this.px(x, y, m);
      if (Math.round(th) % 2 === 0) { const t = Math.round(th); return this.rect(Math.floor(x - t / 2 + 0.5), Math.floor(y - t / 2 + 0.5), t, t, m); }
      this.ell(Math.round(x), Math.round(y), (th - 1) / 2, (th - 1) / 2, m);
    }
    line(x0, y0, x1, y1, m, th = 1) {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let i = 0; i <= n; i++) this.dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, th, m);
    }
    poly(pts, m) {
      const ys = pts.map(p => p[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
        const xs = [];
        for (let i = 0; i < pts.length; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
          if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (y - ay) / (by - ay) * (bx - ax));
        }
        xs.sort((a, b) => a - b);
        for (let q = 0; q + 1 < xs.length; q += 2) for (let x = Math.round(xs[q]); x <= Math.round(xs[q + 1]); x++) this.raw(x, y, m);
      }
    }
    // quadratic curve with tapering thickness; `each` gets position, tangent and index
    curve(x0, y0, cx, cy, x1, y1, m, t0, t1, each) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5) + 4;
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t, x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        this.dot(x, y, t0 + (t1 - t0) * t, m);
        if (each) { const tx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * u * (cy - y0) + 2 * t * (y1 - cy), l = Math.hypot(tx, ty) || 1; each(x, y, tx / l, ty / l, t, i); }
      }
    }
    // repaint only pixels that already hold `only` (clipped decals)
    ellIf(cx, cy, rx, ry, m, only) {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5);
        if (dx * dx + dy * dy <= 1 && this.at(x, y) === only) this.m[(y + this.oy) * this.w + x + this.ox] = m;
      }
    }
    ellClip(cx, cy, rx, ry, m, ymin, ymax = 1e9) {
      for (let y = Math.max(Math.ceil(ymin), Math.floor(cy - ry - 1)); y <= Math.min(Math.floor(ymax), Math.ceil(cy + ry + 1)); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5); if (dx * dx + dy * dy <= 1) this.raw(x, y, m);
      }
    }
    pxIf(x, y, m, only) { if (this.at(x, y) === only) this.m[(Math.round(y) + this.oy) * this.w + Math.round(x) + this.ox] = m; }
    text(s, x, y, m, font = F3) {
      const cw = font === F3 ? 4 : 6, bits = font === F3 ? 3 : 5;
      [...s].forEach((ch, i) => (font[ch] || font[' ']).forEach((row, r) => { for (let c = 0; c < bits; c++) if (row >> (bits - 1 - c) & 1) this.raw(Math.round(x) + i * cw + c, Math.round(y) + r, m); }));
    }
    // pixel-clean tilt: shift each row sideways around a pivot row
    shear(k, pivotY) {
      pivotY += this.oy;
      const { w, h, m, p } = this, M = new Uint8Array(m), P = new Uint8Array(p); m.fill(0); p.fill(0);
      for (let y = 0; y < h; y++) { const o = Math.round((pivotY - y) * k); for (let x = 0; x < w; x++) { const sx = x - o; if (sx >= 0 && sx < w) { m[y * w + x] = M[y * w + sx]; p[y * w + x] = P[y * w + sx]; } } }
    }
    // shift a band of rows (glitch slices)
    slide(y0, y1, dx) {
      y0 += this.oy; y1 += this.oy;
      const { w, m, p } = this;
      for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++) {
        const M = m.slice(y * w, y * w + w), P = p.slice(y * w, y * w + w);
        for (let x = 0; x < w; x++) { const sx = x - dx; m[y * w + x] = sx >= 0 && sx < w ? M[sx] : 0; p[y * w + x] = sx >= 0 && sx < w ? P[sx] : 0; }
      }
    }
  }

  // light from the top left; contact shadow where a later part overlaps; selective outline
  const render = (g, o = {}) => {
    const { w, h, m, p } = g, W2 = w + 2, H2 = h + 2, rim = o.rim ? rgb(o.rim) : null;
    const c = document.createElement('canvas'); c.width = W2; c.height = H2;
    const cx = c.getContext('2d'), img = cx.createImageData(W2, H2), d = img.data;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : m[y * w + x];
    const isFlat = id => id && MATS[id].flat;
    const same = (x, y, id, pt) => { const q = at(x, y); if (!q) return false; if (isFlat(q)) return true; return q === id && p[y * w + x] === pt; };
    const box = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const id = m[y * w + x]; if (!id || MATS[id].flat) continue;
      const k = p[y * w + x] * 256 + id, b = box.get(k);
      if (!b) box.set(k, [x, y, x, y]); else { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
    }
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      const id = at(x, y); let col = null, al = 1;
      if (id) {
        const M = MATS[id], T = M.tones, pt = p[y * w + x]; al = M.alpha;
        if (M.flat) col = T[0];
        else {
          let contact = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const q = at(x + dx, y + dy), qp = p[(y + dy) * w + x + dx];
            if (q && !isFlat(q) && (q !== id || qp !== pt) && qp > pt) contact = true;
          }
          let dD = 4;
          for (let k = 1; k <= 3; k++) if (!same(x, y + k, id, pt) || !same(x + k, y, id, pt)) { dD = k; break; }
          const upOpen = !same(x, y - 1, id, pt), lfOpen = !same(x - 1, y, id, pt);
          let tone = 2;
          if (contact) tone = 0;
          else if (upOpen || lfOpen) tone = dD === 1 ? 2 : (M.shiny && upOpen && lfOpen ? 4 : 3);
          else if (dD === 1) tone = 0;
          else if (dD === 2) tone = 1;
          else {
            const b = box.get(pt * 256 + id), bw = b[2] - b[0], bh = b[3] - b[1];
            if (bh >= 8 || bw >= 8) {
              const s = 0.6 * (y - b[1]) / Math.max(1, bh) + 0.4 * (x - b[0]) / Math.max(1, bw);
              if (s > 0.74) tone = 1; else if (s < 0.14) tone = 3;
            }
          }
          col = T[Math.min(tone, T.length - 1)];
          if (rim && !contact && !at(x + 1, y) && !upOpen && tone <= 2 && T.length > 2) col = mix(T[2], rim, 0.55);
        }
      } else if (!o.noOutline) {
        const nb = [at(x, y + 1), at(x + 1, y), at(x, y - 1), at(x - 1, y)].filter(q => q && !MATS[q].noLine);
        if (nb.length) {
          const below = at(x, y + 1), right = at(x + 1, y), above = at(x, y - 1), left = at(x - 1, y);
          const lit = (below && !MATS[below].noLine) ? below : (right && !MATS[right].noLine) ? right : 0;
          const src = lit && !above && !left ? lit : 0;
          col = src && !MATS[src].flat && MATS[src].tones.length > 2 ? mix(MATS[src].tones[0], OUT, 0.45) : OUT;
          al = Math.max(...nb.map(q => MATS[q].alpha));
        }
      }
      if (col) { const i = ((y + 1) * W2 + x + 1) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = Math.round(255 * al); }
    }
    cx.putImageData(img, 0, 0);
    return c;
  };

  const hash = (a, b = 0) => { let t = (a * 374761393 + b * 668265263) | 0; t = (t ^ (t >>> 13)) * 1274126177 | 0; return ((t ^ (t >>> 16)) >>> 0) / 4294967296; };
  const TAU = Math.PI * 2, rad = d => d * Math.PI / 180;
  const ph = f => f / 6 * TAU; // idle phase, 6 frames
  const S = Math.sin, C = Math.cos;

  // shared materials
  const gold = mat(['#3d2a0c', '#7d5c22', '#d9b45b', '#f6dd94', '#fff4cf'], { shiny: true });
  const black = flat('#05070d'), white = flat('#ffffff'), ink = flat('#2a2433');

  // concept = { name, w, h, rim, note, draw(g, f, a) }   f: idle frame 0-5, a: 0 idle, 1 wind-up, 2 strike, 3 recover
  const register = (boss, list) => list.forEach((cpt, i) => {
    const make = (f, a) => { const g = new Grid(cpt.w, cpt.h); cpt.draw(g, f, a); return render(g, { rim: cpt.rim }); };
    const group = `Boss alts (Claude) · ${boss}`, label = `Alt ${i + 1} · ${cpt.name}`;
    window.SpriteSheet.add(group, `${label} · idle`, [0, 1, 2, 3, 4, 5].map(f => make(f, 0)), { fps: 6, note: cpt.note });
    window.SpriteSheet.add(group, `${label} · attack`, [1, 2, 3].map(a => make(0, a)), { fps: 4, note: cpt.note });
  });

  // =====================================================================
  // 1. RECURSIVE HYDRA
  // =====================================================================
  const hydra = [];

  // ---- Alt 1: Fork Bramble. A thorn tree whose every branch forks again.
  {
    const bark = mat(['#140c1c', '#2b1a31', '#4a2f45', '#6e4e5c', '#9c7c74']);
    const pod = mat(['#4a0c40', '#9a2178', '#ff4fb8', '#ff9fdb', '#ffe4f4'], { shiny: true });
    const scl = flat('#fff2a8'), slit = flat('#1c0518'), glowE = flat('#ffd2ef'), hollow = flat('#0b0610'), ember = flat('#ff4fb8');
    hydra.push({
      name: 'Fork Bramble', w: 104, h: 92, rim: '#ff8fd0',
      note: 'A thorn tree where every branch forks into two more, each tip a watching bud: one prompt that keeps branching into 933 agents.',
      draw(g, f, a) {
        const t = ph(f);
        const lean = [0, 14, -26, -6][a], spread = [27, 18, 34, 28][a];
        const buds = [];
        // recursive branch: draws itself, then forks
        const branch = (x, y, ang, len, th, depth, id) => {
          const sw = a ? 0 : S(t + depth * 0.9 + id) * (5 - depth) * 0.9;
          const A = rad(ang + sw), x1 = x + C(A) * len, y1 = y + S(A) * len;
          g.part(); g.line(x, y, x1, y1, bark, Math.max(1, th));
          if (depth >= 2 && th > 2) { // thorns
            const mx = (x + x1) / 2, my = (y + y1) / 2, n = id % 2 ? 1 : -1;
            g.line(mx, my, mx + C(A + n * 1.4) * 3, my + S(A + n * 1.4) * 3, bark, 1);
          }
          if (depth === 0) { buds.push([x1, y1, id]); return; }
          const sp = spread * (0.85 + hash(id, 3) * 0.3);
          branch(x1, y1, ang - sp, len * 0.74, th * 0.66, depth - 1, id * 2);
          branch(x1, y1, ang + sp * 0.9, len * 0.7, th * 0.66, depth - 1, id * 2 + 1);
        };
        // roots as splayed claws
        g.part();
        [[-24, 0], [-12, 2], [12, 2], [24, 0]].forEach(([dx]) => g.curve(56, 80, 56 + dx * 0.5, 84, 56 + dx, 90, bark, 6, 2));
        // trunk
        const top = [56 + lean * 0.12, 52];
        g.part(); g.curve(56, 88, 52, 70, top[0], top[1], bark, 12, 8);
        branch(top[0], top[1], -90 - 22 + lean, 17, 7, 3, 2);
        branch(top[0], top[1], -90 + 24 + lean, 15, 6, 3, 3);
        branch(top[0] - 1, top[1] + 6, -90 - 62 + lean, 12, 5, 2, 5);
        // face in the trunk
        g.part(); g.ell(51, 66, 2.5, 2, hollow); g.ell(60, 65, 2.5, 2, hollow);
        g.px(50, 66, ember); g.px(51, 66, ember); g.px(59, 65, ember); g.px(60, 65, ember); g.px(50, 65, glowE); g.px(59, 64, glowE);
        g.line(48, 62, 53, 64, hollow); g.line(62, 61, 58, 63, hollow);
        if (a === 2) g.poly([[50, 72], [61, 71], [58, 77], [52, 77]], hollow);
        else g.line(50, 73, 60, 72, hollow, 1);
        // buds: each one an eye
        buds.forEach(([x, y, id]) => {
          const big = id % 3 !== 0, r = big ? 3.5 : 2.5;
          g.part(); g.ell(x, y, r, r - 0.5, pod);
          const blink = !a && (f + id) % 6 === 0;
          if (blink) g.line(x - 2, y, x + 1, y, slit);
          else {
            g.ell(x - 0.5, y, big ? 2 : 1, 1, scl);
            g.px(x - 1, y, slit); g.px(x - 1, y - 1, slit); if (big) g.px(x - 1, y + 1, slit);
          }
          // the strike spawns two new buds off every tip
          if (a === 2 && id % 2) { g.part(); g.ell(x - 4, y - 3, 1, 1, pod); g.ell(x + 2, y - 4, 1, 1, pod); }
        });
      },
    });
  }

  // ---- Alt 2: Brood Mother. An egg sac of young, each carrying its own sac.
  {
    const chit = mat(['#081020', '#132238', '#1f3d58', '#356a80', '#86c0c4'], { shiny: true });
    const chitD = mat(['#04070e', '#0a1322', '#122236', '#1a3248']);
    const sac = mat(['#5a2208', '#9a4c12', '#e0922c', '#ffc760', '#fff0b4'], { alpha: 0.97 });
    const sacCore = flat('#ffd98a'), silk = flat('#c97a24'), young = flat('#2a1206'), yEgg = flat('#fff6d0');
    const eyeG = flat('#ffd84d'), eyeH = flat('#ffffff'), joint = flat('#4f8ea0');
    const fang = mat(['#5a4a3a', '#a89880', '#e8ddc8', '#ffffff']), sacD = flat('#ff9a3a');
    const spawn = (g, x, y, k) => { // a spiderling carrying its own tiny sac
      g.part(); g.ell(x, y, 2, 1, chitD); g.rect(x + 1, y - 2, 2, 2, sacD); g.px(x - 2, y - 1, eyeG);
      [-2, 0, 2].forEach((dx, i) => g.px(x + dx, y + 2 - ((k + i) & 1), chitD));
    };
    hydra.push({
      name: 'Brood Mother', w: 112, h: 86, rim: '#ffb36a',
      note: 'A carrier spider whose glowing egg sac holds young that each carry a sac of their own: five agents that hatch 928 more.',
      draw(g, f, a) {
        g.origin(4, 0);
        const t = ph(f), rear = [0, 7, -1, 1][a], lunge = [0, 4, -9, -1][a], br = Math.round(S(t));
        const cx = 38 + lunge, cy = 56 - rear;
        const step = k => (!a && (f + k) % 3 === 0 ? 2 : 0);
        const leg = (m, th, hx, hy, kx, ky, fx, fy) => { g.part(); g.line(hx, hy, kx, ky, m, th); g.line(kx, ky, fx, fy, m, Math.max(1, th - 1)); if (m === chit) g.px(kx, ky - 1, joint); };
        // far legs
        [[30, 22, 12], [36, 30, 30], [44, 50, 64], [48, 62, 92]].forEach(([hx, kx, fx], i) =>
          leg(chitD, 3, hx + lunge, cy + 2, kx + lunge * 0.7, 34 - rear - (i % 2) * 3, fx + lunge * (i < 2 ? 0.8 : 0.2), 82 - step(i + 1)));
        // near back legs go behind the sac and show below it
        [[44, 54, 60, 2], [46, 66, 96, 3]].forEach(([hx, kx, fx, k]) => leg(chit, 4, hx + lunge * 0.6, cy + 4, kx, 36 - rear * 0.5, fx + lunge * 0.2, 84 - step(k)));
        // the sac
        g.part(); g.ell(76, 42, 24, 20 + br, sac);
        g.ellIf(70, 36, 13, 10, sacCore, sac);
        for (const k of [-1, 0, 1]) for (let x = 54; x <= 98; x++) g.pxIf(x, Math.round(42 + k * 11 + (x - 76) * 0.3 + S(x / 6 + k) * 1.2), silk, sac);
        for (const k of [-1, 0, 1]) for (let x = 54; x <= 98; x++) g.pxIf(x, Math.round(42 + k * 11 + (x - 76) * 0.3 + S(x / 6 + k) * 1.2), silk, sacCore);
        [[66, 32], [82, 28], [90, 44], [74, 50], [62, 44], [84, 56], [76, 38]].forEach(([x, y], k) => {
          const wx = x + (a === 2 ? 0 : Math.round(S(t + k * 1.7))), wy = y + (k & 1 ? br : 0);
          g.rect(wx - 2, wy, 5, 2, young); g.px(wx - 3, wy, young);
          g.px(wx - 3, wy + 2, young); g.px(wx, wy + 2, young); g.px(wx + 3, wy + 2, young); g.px(wx - 2, wy - 1, young); g.px(wx + 2, wy - 1, young);
          g.px(wx + 1, wy - 1, yEgg); g.px(wx + 2, wy - 2, yEgg);
        });
        // pedicel + cephalothorax
        g.part(); g.ell(cx + 13, cy - 3, 5, 4, chit);
        g.part(); g.ell(cx, cy, 14, 10, chit);
        g.part(); g.ell(cx - 10, cy - 3, 7, 6, chit);
        [[-16, -5, 1], [-12, -7, 1], [-17, -1, 0], [-10, -4, 0], [-8, -8, 0]].forEach(([dx, dy, big]) => {
          const x = cx + dx, y = cy + dy; g.px(x, y, eyeG);
          if (big) { g.px(x + 1, y, eyeG); g.px(x, y + 1, eyeG); g.px(x + 1, y + 1, eyeG); g.px(x, y, eyeH); }
        });
        const op = a === 2 ? 4 : a === 1 ? 1 : 0;
        g.part(); g.poly([[cx - 16, cy + 1], [cx - 20 - op, cy + 10 + op], [cx - 13, cy + 4]], fang);
        g.poly([[cx - 11, cy + 3], [cx - 13 + op, cy + 13 + op], [cx - 8, cy + 5]], fang);
        // near front legs
        const up = [0, -16, -4, 0][a];
        leg(chit, 4, cx - 6, cy + 4, cx - 18, 30 - rear + up, cx - 32 + (a === 2 ? 6 : 0), 82 - step(0) + (a === 1 ? -20 : 0));
        leg(chit, 4, cx - 1, cy + 5, cx - 10, 34 - rear, cx - 16 + lunge * 0.3, 84 - step(4));
        // young on the floor; the strike throws a swarm out of the sac
        [[10, 83], [22, 85], [100, 84]].forEach(([x, y], k) => spawn(g, x + (f + k) % 3 - 1, y, f + k));
        if (a === 2) [[56, 18], [70, 12], [88, 16], [100, 28], [62, 4], [80, 4]].forEach(([x, y], k) => spawn(g, x, y, k));
        if (a === 3) [[46, 82], [70, 84]].forEach(([x, y], k) => spawn(g, x, y, k));
      },
    });
  }

  // ---- Alt 3: Colony Bloom. A floating siphonophore that buds copies of its own polyps.
  {
    const flt = mat(['#1a0f3e', '#3a2384', '#6a4ad6', '#a88cff', '#ece4ff'], { alpha: 0.92, shiny: true });
    const bell = mat(['#05334a', '#0b6a86', '#1fb6cf', '#80eaf2', '#e2ffff'], { alpha: 0.9, shiny: true });
    const stem = mat(['#4a0e3e', '#8a1f6a', '#d6449c', '#ff8ccc'], { alpha: 0.95 });
    const tent = flat('#ff7ac8', { noLine: true }), bead = flat('#fff0a8', { noLine: true }), core = flat('#ffffff');
    const eyeC = flat('#fff27a'), pupil = flat('#1a0c38');
    hydra.push({
      name: 'Colony Bloom', w: 92, h: 100, rim: '#9ff3ff',
      note: 'A drifting colony organism where every polyp buds a smaller polyp, which buds another: delegation that never needed permission.',
      draw(g, f, a) {
        g.origin(0, 3);
        const t = ph(f), pulse = a === 1 ? -2 : a === 2 ? 2 : Math.round(S(t) * 1.2);
        const fx = 48, fy = 16 + (a === 1 ? -3 : 0);
        // tentacles behind: long wavy strands with stinging beads
        for (let k = 0; k < 6; k++) {
          const bx = 36 + k * 5, by = 60;
          let x = bx, y = by;
          const len = a === 2 ? 40 : 30, lash = a === 2 ? -1.6 : a === 1 ? 0.4 : 0;
          for (let i = 0; i < len; i++) {
            const nx = x + lash + S(t + i * 0.35 + k) * 0.8, ny = y + (a === 2 ? 0.1 + k * 0.17 + S(i * 0.5 + k) * 0.5 : 1);
            g.part(); g.line(x, y, nx, ny, tent, 1); x = nx; y = ny;
            if (i % 6 === 5) g.px(x, y, bead);
          }
        }
        // central stem
        g.part(); g.curve(fx, fy + 8, fx - 6 + S(t) * 2, fy + 30, fx + 2, 62, stem, 4, 3);
        // polyp bells budding down the stem; each bell carries a smaller one
        const bells = [[40, 30, 7], [58, 34, 6.5], [38, 46, 6], [60, 50, 5.5], [48, 60, 5]];
        bells.forEach(([x, y, r], k) => {
          const rr = r + (k % 2 ? -pulse : pulse) * 0.3, dx = Math.round(S(t + k) * 1);
          g.part(); g.ell(x + dx, y, rr, rr * 0.85, bell);
          g.ell(x + dx, y + rr * 0.5, rr * 0.55, rr * 0.3, pupil);
          // bud
          const side = k % 2 ? 1 : -1, bx = x + dx + side * (rr + 2), by = y - rr * 0.6;
          g.part(); g.ell(bx, by, rr * 0.45, rr * 0.4, bell);
          if (rr > 5.5) { g.part(); g.ell(bx + side * 3, by - 2, 1, 1, bell); }
          g.px(x + dx - 2, y - 1, eyeC); g.px(x + dx + 1, y - 1, eyeC);
        });
        // the float on top with the colony's face
        g.part(); g.ell(fx, fy, 18 + pulse * 0.5, 9 - pulse * 0.3, flt);
        g.poly([[fx - 12, fy - 5], [fx - 2, fy - 15 - pulse], [fx + 6, fy - 13 - pulse], [fx + 14, fy - 5]], flt);
        for (let x = fx - 8; x <= fx + 10; x += 3) g.pxIf(x, fy - 7 - (x % 2), core, flt);
        const blink = !a && f === 4;
        [[fx - 8, fy + 1], [fx + 1, fy + 1]].forEach(([x, y], k) => {
          if (blink) { g.line(x, y + 1, x + 3, y + 1, pupil); return; }
          g.rect(x, y - 1, 4, 3, eyeC); g.rect(x + (a === 2 ? 0 : 1) - (k ? 0 : 0), y, 2, 2, pupil); g.px(x + 3, y - 1, core);
        });
        if (a >= 1) g.line(fx - 6, fy + 6, fx + 3, fy + 6, pupil, 1);
      },
    });
  }

  // ---- Alt 4 (bold): Window Within. A flat UI window that contains itself, forever.
  {
    const frame = mat(['#060a14', '#0d1730', '#16264a', '#1e3a66']);
    const bar = mat(['#0b2a5a', '#1d5aa8', '#4da3ff', '#a8d6ff']);
    const body = flat('#0a0e1a'), bodyB = flat('#0d1428'), eyeY = flat('#d9b45b'), eyeW = flat('#fff4cf'), pupil = flat('#05070d');
    const maw = flat('#2a0610'), dotR = flat('#ff5d6c'), dotG = flat('#d9b45b'), dotB = flat('#5fd38d'), txt = flat('#e8eef7'), tooth = mat(['#3d4a66', '#8494b4', '#d0dcef', '#ffffff']);
    hydra.push({
      name: 'Window Within', w: 110, h: 90, rim: '#4da3ff',
      note: 'An app window that opens a smaller copy of itself inside, and that one opens another: the session that spawned 933 agents, drawn as pure UI.',
      draw(g, f, a) {
        const t = ph(f), jaw = a === 2 ? 7 : a === 1 ? 0 : (f === 3 ? 1 : 0);
        const ox = [18, 20, 14, 16][a], oy = 6 + Math.round(S(t) * 1.5);
        const win = (x, y, w, h, lv) => {
          g.part(); g.rect(x, y, w, h, frame);
          const bh = Math.max(3, Math.round(h * 0.11));
          g.part(); g.rect(x + 1, y + 1, w - 2, bh, bar);
          if (w > 24) { g.px(x + 3, y + 1 + bh / 2, dotR); g.px(x + 5, y + 1 + bh / 2, dotG); g.px(x + 7, y + 1 + bh / 2, dotB); }
          g.rect(x + 1, y + 1 + bh, w - 2, h - bh - 2, lv % 2 ? bodyB : body);
          // a pair of eyes in every window
          const es = Math.max(1, Math.round(w / 22)), ey = y + bh + 2 + es, look = a ? -1 : Math.round(S(t + lv) * 1);
          const blink = !a && (f + lv) % 6 === 5;
          [x + 3, x + 3 + es * 3].forEach(ex => {
            if (blink) { g.rect(ex, ey + es, es * 2, 1, eyeY); return; }
            g.rect(ex, ey, es * 2, es * 2, eyeY); if (es > 1) g.px(ex + es * 2 - 1, ey, eyeW);
            const pw = Math.max(1, Math.ceil(es / 2) + (es > 2 ? 1 : 0));
            g.rect(ex + Math.max(0, Math.min(es * 2 - pw, Math.floor(es - pw / 2) + look - (a ? 1 : 0))), ey + es - Math.floor(pw / 2), pw, pw, pupil);
          });
          return [x + 1, y + 1 + bh, w - 2, h - bh - 2];
        };
        let [x, y, w, h] = [ox, oy, 88, 74];
        const outer = win(x, y, w, h, 0);
        // title
        g.part(); g.text(a ? '933' : ['5', '43', '210', '928', '933', '933'][f], x + w - 16, y + 2, txt);
        // nested windows drift around a swirl
        [x, y, w, h] = outer;
        for (let lv = 1; lv <= 4; lv++) {
          const s = a === 1 ? 0.62 : 0.7, nw = Math.round(w * s), nh = Math.round(h * s);
          const swirl = a ? 0 : Math.round(S(t + lv * 1.3) * 2);
          const nx = x + Math.round((w - nw) * 0.62) + swirl, ny = y + Math.round((h - nh) * 0.7) - (a === 1 ? 1 : 0);
          [x, y, w, h] = win(nx, ny, nw, nh, lv);
          if (nw < 12) break;
        }
        // jaw: fangs hang from the body; the bottom frame drops open on the strike
        if (jaw) { g.part(); g.rect(ox, oy + 74 - 2, 88, jaw + 2, frame); g.rect(ox + 2, oy + 74 - 2, 84, jaw + 1, maw); }
        for (let i = 0; i < 7; i++) { const tx = ox + 4 + i * 12; g.part(); g.poly([[tx, oy + 74 - 2], [tx + 8, oy + 74 - 2], [tx + 4, oy + 74 - 10]], tooth); }
        if (jaw) for (let i = 0; i < 7; i++) { const tx = ox + 9 + i * 12; if (tx + 7 > ox + 88) break; g.part(); g.poly([[tx, oy + 74 - 3 + jaw], [tx + 7, oy + 74 - 3 + jaw], [tx + 3.5, oy + 74 - 9 + jaw]], tooth); }
        // spawned copies fly out on the strike
        if (a === 2) [[-12, 4, 26, 20], [-10, 30, 20, 16], [-7, 52, 16, 12]].forEach(([dx, dy, ww, hh], k) => win(ox + dx, oy + dy, ww, hh, k + 1));
      },
    });
  }

  // ---- Alt 5: Nesting Doll. Open one and another comes out, and another.
  {
    const lac = mat(['#0e0a2a', '#1d1652', '#33288a', '#5248c0', '#9a90f0'], { shiny: true });
    const lac2 = mat(['#05242a', '#0b4a52', '#16808a', '#3cb8b8', '#a8f0e0'], { shiny: true });
    const lac3 = mat(['#3a0d14', '#7a1a2a', '#c23a48', '#ff7a7a', '#ffd0c0'], { shiny: true });
    const face = mat(['#7a4a3a', '#c48a6e', '#f2d2b4', '#fff0dc']), void_ = flat('#05040c');
    const cheek = flat('#ff7a8a'), eyeD = flat('#14102a'), glow = flat('#ffe06a'), lip = flat('#c8304a'), tooth = flat('#f3efe6');
    const petal = flat('#d9b45b'), petalL = flat('#fff4cf'), trim = flat('#d9b45b');
    // one doll standing on `by`; top half lifted by `lift`; `inner(y)` draws what sits in the cavity
    const doll = (g, cx, by, s, shell, lift, mood, inner) => {
      const bw = 15 * s, wy = by - 18 * s, ww = bw * 0.84;
      const bottom = clip => { g.part(); g.ellClip(cx, by - 11 * s, bw, 11 * s + 0.5, shell, clip); g.ellClip(cx, wy + 2 * s, ww, 6 * s, shell, clip, by - 11 * s); };
      bottom(wy);
      if (s > 0.6) for (let x = cx - ww; x <= cx + ww; x++) g.pxIf(x, wy + 1, trim, shell);
      if (lift > 0) {
        g.part(); g.ell(cx, wy + 1, ww * 0.92, 1.6 * s, void_);
        if (inner) { inner(wy); bottom(wy + 1.6 * s); if (s > 0.6) for (let x = cx - ww; x <= cx + ww; x++) g.pxIf(x, Math.round(wy + 2 * s), trim, shell); }
      }
      // belly flower
      const fy = by - 9 * s;
      if (s > 0.5) { [[0, -3], [3, 0], [0, 3], [-3, 0]].forEach(([dx, dy]) => g.ellIf(cx + dx * s, fy + dy * s, 2 * s, 2 * s, petal, shell)); g.ellIf(cx, fy, 1.4 * s, 1.4 * s, petalL, petal); }
      else g.pxIf(cx, fy, petal, shell);
      // top half: shoulders flaring down to the waist, then the head
      const ty = wy - lift, hcy = ty - 16 * s;
      g.part();
      g.ellClip(cx, ty, ww, 12 * s, shell, -1e9, ty - 1);
      g.ell(cx, hcy, 9.5 * s, 9.5 * s, shell);
      if (s > 0.6) for (let x = cx - ww; x <= cx + ww; x++) g.pxIf(x, ty - 1, trim, shell);
      // face window
      const fcx = cx - 1.5 * s, fcy = hcy + 1 * s;
      if (s > 0.6) { g.part(); g.ell(fcx, fcy, 7.5 * s, 7 * s, trim); }
      g.part(); g.ell(fcx, fcy, 6.5 * s, 6 * s, face);
      if (s < 0.5) { g.px(fcx - 2, fcy, eyeD); g.px(fcx + 1, fcy, eyeD); return; }
      const ey = Math.round(fcy - 1 * s);
      [fcx - 4.5 * s, fcx + 1 * s].forEach((x, k) => {
        x = Math.round(x);
        if (mood === 'shut') { g.line(x, ey + 1, x + 3 * s, ey + 1, eyeD); return; }
        const ew = Math.max(2, Math.round(3 * s)), eh = Math.max(1, Math.round(2 * s));
        g.rect(x, ey, ew, eh, eyeD); g.px(x + (mood === 'grin' ? 0 : 1), ey + eh - 1, glow); if (s > 0.9) g.px(x + 1, ey + eh - 2, glow);
        // brows slant down toward the middle
        if (k === 0) g.line(x - 1, ey - 2, x + ew, ey - 1, eyeD); else g.line(x - 1, ey - 1, x + ew, ey - 2, eyeD);
      });
      g.px(Math.round(fcx - 5 * s), ey + Math.round(3 * s), cheek); g.px(Math.round(fcx + 4 * s), ey + Math.round(3 * s), cheek);
      const my = Math.round(fcy + 3.5 * s);
      if (mood === 'grin') { g.rect(fcx - 3 * s, my, 6 * s, 2 * s, void_); for (let i = 0; i < 3; i++) g.px(fcx - 2 * s + i * 2 * s, my, tooth); }
      else { g.rect(fcx - 1, my, 3, 1, lip); }
      for (let k = -2; k <= 2; k++) g.pxIf(cx + k * 3.5 * s, hcy - 8 * s, petal, shell);
    };
    hydra.push({
      name: 'Nesting Doll', w: 104, h: 96, rim: '#ffd07a',
      note: 'A lacquered doll that opens on another doll, which opens again: recursion you can see, with the smallest copies already waddling off.',
      draw(g, f, a) {
        g.origin(-1, 0);
        const lift = [[8, 11, 14, 15, 14, 11][f], 18, 20, 11][a], innerLift = [[0, 0, 1, 2, 1, 0][f], 8, 14, 3][a];
        const lean = [0, 0, -5, -1][a];
        [[10, 95, 0], [22, 95, 1]].forEach(([x, by, k]) => doll(g, x + (a === 2 ? -2 : 0), by - (f + k) % 2, 0.3, k ? lac3 : lac2, 0, 'plain'));
        doll(g, 62, 95, 1.7, lac, lift, a === 2 ? 'shut' : 'plain', wy => {
          const si = 1.05, sunk = 10 - innerLift;
          doll(g, 62 + lean, wy + 18 * si + sunk, si, lac2, Math.max(0, innerLift - 6), a === 2 ? 'grin' : 'plain', wy2 => {
            if (innerLift > 6) doll(g, 62 + lean * 1.6, wy2 + 18 * 0.55 + 4, 0.55, lac3, 0, 'grin');
          });
        });
      },
    });
  }

  register('Recursive Hydra', hydra);

  // =====================================================================
  // 2. THE UNVERIFIED CLAIM
  // =====================================================================
  const claim = [];

  // ---- Alt 1: Yes-Man Marionette. Says DONE, holds a test vial that was never opened.
  {
    const wood = mat(['#4a2a18', '#8a5432', '#c88a5a', '#efc08c', '#fff0d0']);
    const bar = mat(['#2a1608', '#5a3418', '#8c5a2e', '#bf874c']);
    const suit = mat(['#0c1428', '#18284a', '#2a4472', '#476aa0', '#8ab0d8']);
    const hair = mat(['#120a0a', '#24140f', '#3a2218', '#55331f']);
    const glass = mat(['#2a4a5a', '#5a8a9a', '#a8d8e0', '#e8ffff'], { alpha: 0.85, shiny: true });
    const liquid = flat('#5fd38d'), cork = mat(['#4a2e14', '#7a5028', '#b07e44', '#d8a868']), wax = mat(['#5a0a14', '#9a1a2a', '#d8304a', '#ff7a8a']);
    const str = flat('#c9d6e8', { noLine: true, alpha: 0.75 }), eyeW = flat('#ffffff'), pupil = flat('#0a0e1a'), mouth = flat('#3a0a14');
    const tooth = flat('#fff4e6'), cheek = flat('#ff8a7a'), seam = flat('#6e3a20'), cloth = mat(['#3a2a0c', '#7d5c22', '#d9b45b', '#f6dd94']), done = flat('#1a7a48'), tie = flat('#d8304a');
    claim.push({
      name: 'Yes-Man Marionette', w: 86, h: 100, rim: '#ffe9b0',
      note: 'A grinning puppet that waves a DONE flag while the test vial in its other hand is still corked and wax-sealed: done, never run.',
      draw(g, f, a) {
        g.origin(0, 3);
        const t = ph(f), sw = a ? 0 : Math.round(S(t) * 2), lag = a ? 0 : Math.round(S(t - 1) * 2);
        const up = [0, -7, 4, -1][a], cx = 42 + sw + [0, 0, -4, -1][a], hy = 22 + up;
        const tilt = a ? 0 : Math.round(S(t) * 1.5);
        // control bar
        g.part(); g.line(20, 6 - tilt + (a === 1 ? -3 : 0), 66, 6 + tilt + (a === 1 ? -3 : 0), bar, 3); g.line(43, 0, 43, 13 + (a === 1 ? -3 : 0), bar, 3);
        g.part(); g.ell(20, 6 - tilt + (a === 1 ? -3 : 0), 2, 2, gold); g.ell(66, 6 + tilt + (a === 1 ? -3 : 0), 2, 2, gold);
        const by = a === 1 ? -3 : 0;
        // limbs: vial hand (left, toward the hero) and flag hand
        const lh = [[cx - 18, hy + 22 + Math.round(S(t + 1))], [cx - 22, hy + 4], [cx - 24, hy + 18], [cx - 19, hy + 20]][a];
        const rh = [cx + 17, hy + 18 - Math.round(S(t + 2))];
        const lk = [cx - 6 + lag, hy + 50], rk = [cx + 6 + lag, hy + 50 - (a === 2 ? 4 : 0)];
        const lf = [cx - 7 + lag * 2, hy + 64], rf = [cx + 7 + lag * 2 + (a === 2 ? 5 : 0), hy + 63 - (a === 2 ? 6 : 0)];
        // strings
        g.part();
        g.line(20, 6 - tilt + by, lh[0], lh[1] - 3, str); g.line(66, 6 + tilt + by, rh[0], rh[1] - 3, str);
        g.line(43, 13 + by, cx, hy - 9, str); g.line(30, 6 + by, lk[0], lk[1], str); g.line(56, 6 + by, rk[0], rk[1], str);
        // legs
        [[cx - 4, lk, lf], [cx + 4, rk, rf]].forEach(([hx, k, ft]) => {
          g.part(); g.line(hx, hy + 38, k[0], k[1], suit, 4); g.line(k[0], k[1], ft[0], ft[1], wood, 3); g.ell(k[0], k[1], 2, 2, wood);
          g.part(); g.rrect(ft[0] - 4, ft[1], 7, 4, 1, hair);
        });
        // back arm (flag)
        g.part(); g.line(cx + 7, hy + 14, rh[0] - 2, rh[1] - 6, suit, 4); g.line(rh[0] - 2, rh[1] - 6, rh[0], rh[1], wood, 3);
        g.part(); g.ell(rh[0], rh[1], 2, 2, wood);
        g.part(); g.line(rh[0] + 1, rh[1] + 2, rh[0] + 1, rh[1] - 20, bar, 1);
        const wave = a ? 0 : (f % 2);
        g.part(); g.poly([[rh[0] + 2, rh[1] - 20], [rh[0] + 21, rh[1] - 19 + wave], [rh[0] + 20, rh[1] - 11 + wave], [rh[0] + 2, rh[1] - 12]], cloth);
        g.text('DONE', rh[0] + 4, rh[1] - 18 + (wave ? 1 : 0), done);
        // torso
        g.part(); g.rrect(cx - 8, hy + 10, 16, 22, 4, suit);
        g.poly([[cx - 2, hy + 10], [cx + 2, hy + 10], [cx + 1, hy + 22], [cx, hy + 24], [cx - 1, hy + 22]], tie);
        g.part(); g.rrect(cx - 8, hy + 30, 16, 9, 3, suit);
        g.line(cx - 7, hy + 31, cx + 7, hy + 31, seam);
        // head with a hinged jaw
        g.part(); g.ell(cx, hy, 9, 9, wood); g.rect(cx - 2, hy + 8, 4, 3, wood);
        g.part(); g.ellClip(cx + 1, hy - 1, 9, 9, hair, -99, hy - 5); g.px(cx - 8, hy - 4, hair);
        const jaw = a === 2 ? 3 : (f === 2 || f === 3) ? 1 : 0;
        [[cx - 6, hy - 2], [cx + 1, hy - 2]].forEach(([x, y]) => {
          g.rect(x, y, 4, 4, eyeW); g.rect(x + (a ? 0 : 1), y + 1, 2, 2, pupil);
          g.line(x, y - 2, x + 3, y - 3, hair);
        });
        g.px(cx - 7, hy + 3, cheek); g.px(cx + 6, hy + 3, cheek);
        g.rect(cx - 5, hy + 4, 10, 2 + jaw, mouth); g.rect(cx - 4, hy + 4, 8, 1, tooth);
        g.line(cx - 5, hy + 6 + jaw, cx - 5, hy + 9, seam); g.line(cx + 4, hy + 6 + jaw, cx + 4, hy + 9, seam);
        // front arm with the sealed vial
        g.part(); g.line(cx - 7, hy + 14, (cx - 7 + lh[0]) / 2, (hy + 14 + lh[1]) / 2 + 2, suit, 4); g.line((cx - 7 + lh[0]) / 2, (hy + 14 + lh[1]) / 2 + 2, lh[0], lh[1], wood, 3);
        g.part(); g.rrect(lh[0] - 3, lh[1] - 16, 6, 16, 2, glass);
        g.rect(lh[0] - 2, lh[1] - 9, 4, 7, liquid);
        g.part(); g.rect(lh[0] - 3, lh[1] - 19, 6, 4, cork);
        g.part(); g.ell(lh[0], lh[1] - 18, 3, 2, wax); g.px(lh[0] + 2, lh[1] - 15, wax); g.px(lh[0] + 3, lh[1] - 14, wax);
        g.part(); g.ell(lh[0], lh[1], 2, 2, wood);
      },
    });
  }

  // ---- Alt 2: Hollow Trophy. A gold cup that cracked open on nothing.
  {
    const walnut = mat(['#1a0d06', '#3a1e0e', '#5e3418', '#84502a']);
    const voidC = flat('#04050a'), eyeB = flat('#4da3ff'), eyeH = flat('#d8f0ff'), etch = flat('#7d5c22'), plate = mat(['#3a3a44', '#7a7e8c', '#c9ced8', '#f2f5fa'], { shiny: true });
    const dust = flat('#8a8070', { noLine: true }), glint = flat('#ffffff'), crackL = flat('#5a3e12');
    claim.push({
      name: 'Hollow Trophy', w: 90, h: 94, rim: '#fff0b0',
      note: 'A gleaming 100% trophy with a crack that shows nothing inside but two eyes: an agent\'s "done" that was never backed by a test run.',
      draw(g, f, a) {
        g.origin(5, 0);
        const t = ph(f), cx = 42;
        // plinth
        g.part(); g.rect(20, 82, 44, 11, walnut); g.rect(17, 90, 50, 3, walnut);
        g.part(); g.rect(28, 84, 28, 7, plate); g.text('DONE', 30, 85, flat('#2a2433'));
        // stem and foot
        g.part(); g.ell(cx, 80, 12, 3, gold);
        g.part(); g.poly([[cx - 4, 64], [cx + 4, 64], [cx + 3, 78], [cx - 3, 78]], gold); g.ell(cx, 70, 5, 2, gold);
        // handles as arms
        const swing = [Math.round(S(t)), -4, 6, 1][a];
        g.part();
        g.curve(cx - 19, 30, cx - 36 - swing, 34 + swing, cx - 17, 54, gold, 4, 4);
        g.curve(cx + 19, 30, cx + 36 + swing * 0.3, 36, cx + 17, 54, gold, 4, 4);
        // the bowl
        g.part(); g.ellClip(cx, 26, 22, 38, gold, 25);
        g.part(); g.ell(cx, 25, 22, 4, gold);
        g.part(); g.ell(cx, 25, 19, 2.5, voidC);
        // engraving
        g.text('100%', cx - 7, 34, etch);
        // the crack: a jagged hole with two eyes in the dark
        const hole = [[cx - 14, 44], [cx - 9, 40], [cx - 6, 43], [cx - 1, 39], [cx + 3, 44], [cx + 1, 48], [cx + 5, 52], [cx - 3, 55], [cx - 8, 52], [cx - 13, 54]];
        g.part(); g.poly(hole, voidC);
        g.line(cx + 3, 44, cx + 9, 41, crackL); g.line(cx + 9, 41, cx + 12, 43, crackL); g.line(cx - 14, 44, cx - 18, 41, crackL); g.line(cx + 5, 52, cx + 9, 57, crackL);
        const look = a ? -2 : Math.round(S(t) * 1.4), blink = !a && f === 4;
        [[cx - 9 + look, 46], [cx - 3 + look, 46]].forEach(([x, y]) => {
          if (blink) { g.line(x, y + 1, x + 2, y + 1, eyeB); return; }
          g.rect(x, y, 3, 3, eyeB); g.px(x, y, eyeH);
        });
        // falling flakes and a sweeping glint
        if (!a) { g.px(cx - 6 + (f % 3), 57 + f * 4, gold); }
        const gx = cx - 26 + f * 10;
        for (let i = 0; i < 26; i++) { g.pxIf(gx + i * 0.5, 28 + i, glint, gold); g.pxIf(gx + 1 + i * 0.5, 28 + i, glint, gold); }
        // the strike pours out of the cup: dust, nothing else
        if (a === 2) for (let i = 0; i < 14; i++) g.px(cx - 26 - i * 1.2 + hash(i, 2) * 4, 22 + i * 2.2 + hash(i, 5) * 3, dust);
        if (a === 1) g.shear(0.12, 92);
        if (a === 2) g.shear(-0.2, 92);
        if (a === 3) g.shear(-0.04, 92);
      },
    });
  }

  // ---- Alt 3: Janus Seal. A verified-badge with a second face on the back.
  {
    const rim = mat(['#2c3446', '#5e6c86', '#a8b6cc', '#e2e9f4', '#ffffff'], { shiny: true });
    const green = mat(['#06301c', '#0f6a3a', '#24b060', '#6fe89a', '#d8ffe4']);
    const red = mat(['#3a0612', '#7a1426', '#d8304a', '#ff7a8a', '#ffd8dc']);
    const ribB = mat(['#0b2a5a', '#1d5aa8', '#4da3ff', '#a8d6ff']), ribG = mat(['#3d2a0c', '#7d5c22', '#d9b45b', '#f6dd94']);
    const ink2 = flat('#06140c'), inkR = flat('#2a0610'), eyeW = flat('#f4fff6'), spark = flat('#fff4cf', { noLine: true }), edge = mat(['#202838', '#40506a', '#7a8aa6', '#b8c6dc']);
    claim.push({
      name: 'Janus Seal', w: 86, h: 94, rim: '#c8ffd8',
      note: 'A floating "verified" seal with a smug green face; when it turns, the back is a red X: the 26 sessions that claimed done without a test.',
      draw(g, f, a) {
        const t = ph(f), bob = Math.round(S(t) * 1.5);
        const sx = a === 1 ? 0.14 : a === 3 ? 0.55 : a === 2 ? 1 : [1, 0.94, 0.82, 0.94, 1, 1][f];
        const back = a === 2, cx = 43 + (a === 2 ? -6 : 0), cy = 38 + bob + (a === 1 ? -2 : 0);
        // ribbons
        [[-8, ribB, 0], [6, ribG, 1]].forEach(([dx, m, k]) => {
          const w2 = Math.round(S(t + k * 2) * 2), x0 = cx + dx * Math.max(sx, 0.4);
          g.part(); g.poly([[x0 - 4, cy + 18], [x0 + 4, cy + 18], [x0 + 6 + w2, cy + 52], [x0 + 2 + w2, cy + 48], [x0 - 2 + w2, cy + 53]], m);
        });
        if (sx < 0.3) { // edge-on: a milled coin edge
          g.part(); g.rrect(cx - 4, cy - 26, 8, 53, 3, edge);
          for (let y = cy - 22; y < cy + 24; y += 3) g.line(cx - 3, y, cx + 3, y, flat('#202838'));
          g.part(); g.rect(cx - 1, cy - 26, 2, 53, rim);
        } else {
          // scalloped rim
          g.part();
          for (let k = 0; k < 20; k++) { const an = k / 20 * TAU; g.ell(cx + C(an) * 23 * sx, cy + S(an) * 23, 4 * Math.max(sx, 0.5), 4, rim); }
          g.ell(cx, cy, 24 * sx, 24, rim);
          const face = back ? red : green, ik = back ? inkR : ink2;
          g.part(); g.ell(cx, cy, 18 * sx, 18, face);
          const X = dx => cx + dx * sx;
          if (!back) {
            // smug: half-lidded eyes, check-mark grin
            [[-9, -6], [3, -6]].forEach(([dx, dy]) => {
              g.rect(X(dx), cy + dy, Math.max(1, 6 * sx), 3, eyeW); g.rect(X(dx + (a ? 0 : 1)), cy + dy + 1, Math.max(1, 3 * sx), 2, ik);
              g.line(X(dx - 1), cy + dy - 1, X(dx + 6), cy + dy - 1, ik, 1);
            });
            g.line(X(-9), cy + 3, X(-3), cy + 9, ik, 3); g.line(X(-3), cy + 9, X(11), cy - 1, ik, 3);
          } else {
            // the truth: angry eyes and a crossed-out mouth
            [[-11, -9, 1], [3, -9, -1]].forEach(([dx, dy, s2]) => {
              g.rect(X(dx), cy + dy + 2, 7 * sx, 4, eyeW); g.rect(X(dx + 2), cy + dy + 3, 3, 3, ik);
              g.line(X(dx - 1), cy + dy + (s2 > 0 ? -1 : 3), X(dx + 8), cy + dy + (s2 > 0 ? 3 : -1), ik, 2);
            });
            g.line(X(-8), cy + 2, X(8), cy + 12, ik, 3); g.line(X(8), cy + 2, X(-8), cy + 12, ik, 3);
            [[-30, -14], [-26, 8], [-20, 22], [-32, -2]].forEach(([dx, dy]) => { g.part(); g.px(cx + dx, cy + dy, spark); g.px(cx + dx - 1, cy + dy, spark); g.px(cx + dx + 1, cy + dy, spark); g.px(cx + dx, cy + dy - 1, spark); g.px(cx + dx, cy + dy + 1, spark); });
          }
          // banner across the top
          if (sx > 0.8) {
            g.part(); g.poly([[cx - 20, cy - 25], [cx + 20, cy - 25], [cx + 22, cy - 20], [cx + 20, cy - 16], [cx - 20, cy - 16], [cx - 22, cy - 20]], back ? red : ribB);
            g.text(back ? 'FAIL' : 'PASS', cx - 7, cy - 23, back ? flat('#ffffff') : flat('#e8eef7'));
          }
        }
        if (!a && f === 0) { g.part(); g.px(cx + 14, cy - 12, spark); g.px(cx + 13, cy - 12, spark); g.px(cx + 15, cy - 12, spark); g.px(cx + 14, cy - 13, spark); g.px(cx + 14, cy - 11, spark); }
      },
    });
  }

  // ---- Alt 4: Paper Tiger. Fierce at a glance, hollow paper underneath.
  {
    const L = flat('#ffb85e'), M = flat('#ee8a2e'), D = flat('#b45a32'), DD = flat('#5e2c3c');
    const W = flat('#fbf4e2'), WD = flat('#c9bcb4'), V = flat('#1a1424');
    const inkK = flat('#22182a'), iris = flat('#d9ff6a'), tooth = flat('#ffffff'), maw = flat('#5a1420');
    const orange = new Set([L, M, D]);
    claim.push({
      name: 'Paper Tiger', w: 118, h: 86, rim: '#ffe0a0',
      note: 'An origami tiger whose stripes are stacked lines of log text: it looks fierce until you see the open fold and nothing inside, like a claim nobody checked.',
      draw(g, f, a) {
        const t = ph(f), br = a ? 0 : Math.round(S(t)), tl = a ? 0 : Math.round(S(t + 1) * 2);
        g.origin(2, 3);
        const dx = [6, 10, 1, 4][a], dy = [0, 3, -5, 0][a];
        const P = pts => pts.map(([x, y]) => [x + dx, y + dy]);
        const poly = (pts, m) => { g.part(); g.poly(P(pts), m); };
        // a stripe is a wedge of short text lines, longest at the spine
        const stripe = (x, y, n, dir = 1) => { n *= 2; for (let i = 0; i < n; i++) { const len = Math.max(2, 8 - i * 0.8); for (let j = 0; j < len; j++) { if ((j * 3 + i * 5) % 7 === 6) continue; const px = Math.round(x + dx + j - i * dir * 0.6), py = Math.round(y + dy + i); if (orange.has(g.at(px, py))) g.px(px, py, inkK); } } };
        const fy = 77 - dy;
        // far legs
        poly([[84, 50], [94, 52], [96, fy], [86, fy]], DD);
        poly([[44, 50], [54, 52], [50 + (a === 2 ? -8 : 0), fy], [40 + (a === 2 ? -8 : 0), fy]], DD);
        // tail: folded strip curling up
        poly([[88, 36 - br], [94, 34 - br], [102 + tl, 24], [97 + tl, 21]], D);
        poly([[97 + tl, 21], [102 + tl, 24], [104 + tl, 12], [100 + tl, 11]], L);
        poly([[100 + tl, 11], [104 + tl, 12], [100 + tl, 4], [98 + tl, 6]], inkK);
        // body
        poly([[34, 30 - br], [92, 30 - br], [95, 40], [38, 42]], L);
        poly([[38, 42], [95, 40], [90, 54], [42, 56]], M);
        poly([[46, 55], [88, 53], [80, 60], [54, 61]], W); // pale belly fold
        // the open seam at the rump: white inside, nothing in it
        poly([[86, 30 - br], [93, 30 - br], [95, 39], [88, 37]], W);
        poly([[88, 31 - br], [92, 31 - br], [93, 37], [89, 35]], V);
        [[48, 30], [58, 30], [68, 30], [78, 30]].forEach(([x, y]) => stripe(x, y - br, 6, -1));
        // hind leg
        poly([[72, 33], [92, 36], [88, 60], [72, 54]], M);
        poly([[83, 58], [91, 60], [93, fy], [83, fy]], D);
        poly([[79, fy - 4], [95, fy - 4], [97, fy], [79, fy]], W);
        stripe(80, 40, 4, 1); stripe(84, 62, 3, 1);
        // front leg (reaches out on the pounce)
        const reach = a === 2 ? -18 : 0, lift = a === 2 ? -10 : 0;
        poly([[36, 36], [54, 40], [52, 60 + lift * 0.4], [38, 58 + lift * 0.4]], L);
        poly([[38, 56 + lift * 0.4], [51, 58 + lift * 0.4], [47 + reach, fy + lift], [36 + reach, fy + lift]], M);
        poly([[32 + reach, fy - 4 + lift], [48 + reach, fy - 4 + lift], [48 + reach, fy + lift], [30 + reach, fy + lift]], W);
        stripe(42, 44, 3, 1); stripe(44 + reach * 0.5, 62 + lift * 0.6, 3, 1);
        if (a === 2) [0, 4, 8].forEach(k => { g.part(); g.poly(P([[30 + reach + k, fy + lift], [32 + reach + k, fy + lift], [30 + reach + k, fy + 3 + lift]]), tooth); });
        // head: heavy angular folds with a white ruff
        const hd = a === 1 ? 3 : 0, jaw = a === 2 ? 6 : 0;
        const H = pts => pts.map(([x, y]) => [x, y + hd]);
        poly(H([[16, 22], [24, 20], [21, 10], [14, 14]]), L); poly(H([[17, 20], [22, 19], [20, 13], [16, 16]]), inkK); // ear
        poly(H([[30, 20], [38, 22], [36, 11 + (f === 3 && !a ? 3 : 0)], [30, 14]]), M); // far ear flicks
        poly(H([[6, 24], [30, 16], [44, 26], [36, 32], [12, 34]]), L); // forehead
        poly(H([[12, 34], [36, 32], [44, 26], [46, 44], [28, 50], [14, 44]]), M); // cheek
        poly(H([[30, 36], [46, 30], [48, 48], [34, 52]]), W); // ruff
        poly(H([[0, 30], [6, 24], [14, 34], [12, 42], [2, 40]]), D); // muzzle
        poly(H([[0, 29], [4, 27], [4, 33], [0, 33]]), inkK); // nose
        if (jaw) poly(H([[1, 40], [14, 42], [6, 42]]), maw);
        poly(H([[2, 40 + jaw], [12, 42], [26, 49], [10, 50 + jaw]]), W); // jaw
        if (jaw) { poly(H([[2, 40], [5, 40], [3, 44]]), tooth); poly(H([[7, 41], [10, 41], [8, 45]]), tooth); }
        // eye, brow and face stripes
        poly(H([[12, 26], [22, 24], [21, 29], [14, 29]]), inkK);
        g.px(17 + dx, 26 + dy + hd, iris); g.px(18 + dx, 26 + dy + hd, iris); g.px(17 + dx, 27 + dy + hd, iris);
        [[22, 18, 4], [28, 20, 4], [26, 36, 3], [34, 38, 3]].forEach(([x, y, n]) => stripe(x, y + hd, n, -1));
      },
    });
  }

  // ---- Alt 5 (bold): Checkmark. The green tick itself, with a red X showing through.
  {
    const grn = mat(['#063a2a', '#0f7a4a', '#2ccf78', '#86f5b0', '#e2fff0'], { shiny: true });
    const rx = mat(['#3a0612', '#80142a', '#e0304c', '#ff8090'], { alpha: 0.95 }), rxS = mat(['#1e0610', '#3a0c1e', '#6e1630', '#9a2840'], { alpha: 0.85 });
    const eyeW = flat('#ffffff'), pupil = flat('#05070d'), maw = flat('#06140c'), tooth = flat('#ffffff'), crack = flat('#06140c'), shoe = mat(['#0a0e1a', '#16203a', '#2a3a5e', '#4a6a9a']);
    claim.push({
      name: 'Checkmark', w: 90, h: 90, rim: '#c8ffd8',
      note: 'A living green tick, flat as a status badge, with a red X misregistered behind it; on the strike it flips into the X it really is.',
      draw(g, f, a) {
        const bob = a ? [0, 4, -2, 0][a] : [0, -1, -2, -1, 0, 1][f], dx = a === 2 ? -8 : 0;
        const glitch = a === 1 || (!a && (f === 2 || f === 5));
        const off = glitch ? 4 : 2;
        const tick = (m, ox, oy) => { g.part(); g.line(16 + ox, 44 + oy, 34 + ox, 64 + oy, m, 15); g.line(34 + ox, 64 + oy, 76 + ox, 14 + oy, m, 15); };
        const cross = (m, ox, oy, th = m === rx && a === 2 ? 13 : 9) => { g.part(); g.line(22 + ox, 18 + oy, 66 + ox, 64 + oy, m, th); g.line(66 + ox, 18 + oy, 22 + ox, 64 + oy, m, th); };
        // legs
        [[30, 0], [40, 1]].forEach(([x, k]) => {
          const st = !a && (f + k) % 3 === 0 ? -1 : 0;
          g.part(); g.line(x + dx, 66 + bob, x + dx - 1, 82 + st, shoe, 4);
          g.part(); g.rrect(x + dx - 6, 82 + st, 9, 5, 2, shoe);
        });
        if (a === 2) {
          tick(grn, dx + 6, bob + 3);
          cross(rx, dx, bob);
          g.part();
          [[30, 30], [50, 30]].forEach(([x, y], k) => { g.rect(x + dx, y + bob, 8, 5, eyeW); g.rect(x + dx + 1, y + bob + 2, 3, 3, pupil); g.line(x + dx - 1, y + bob + (k ? -1 : 3), x + dx + 8, y + bob + (k ? 3 : -1), pupil, 2); });
          g.rect(36 + dx, 46 + bob, 14, 5, maw); for (let i = 0; i < 4; i++) g.px(37 + dx + i * 4, 46 + bob, tooth);
          return;
        }
        cross(glitch ? rx : rxS, dx + off, bob + off - 1);
        tick(grn, dx, bob);
        // face on the long stroke
        const ex = 56, ey = 26 + bob, look = a ? -2 : 0;
        g.part(); g.ell(ex, ey, 6, 5, eyeW); g.ell(ex + 7, ey + 2, 4, 4, eyeW);
        if (!a && f === 4) { g.part(); g.rect(ex - 6, ey - 5, 18, 6, grn); }
        g.rect(ex - 3 + look, ey - 1, 3, 3, pupil); g.rect(ex + 5 + look, ey + 1, 2, 3, pupil); g.px(ex - 2, ey - 2, eyeW);
        g.line(ex - 6, ey - 8, ex + 9, ey - 3, pupil, 2);
        // smug grin at the joint
        g.part(); g.poly([[32, 56 + bob], [50, 44 + bob], [50, 48 + bob], [36, 60 + bob]], maw);
        g.line(34, 57 + bob, 49, 46 + bob, tooth);
        if (a === 3) { g.line(48, 26 + bob, 52, 34 + bob, crack); g.line(52, 34 + bob, 46, 40 + bob, crack); g.line(46, 40 + bob, 50, 48 + bob, crack); }
        if (glitch) { g.slide(18 + bob, 22 + bob, -4); g.slide(50 + bob, 53 + bob, 3); }
      },
    });
  }

  register('The Unverified Claim', claim);

  // =====================================================================
  // 3. PHANTOM CHARGE
  // =====================================================================
  const charge = [];

  // ---- Alt 1: Receipt Wyrm. A card terminal whose receipt keeps printing as a ghost tail.
  {
    const shell = mat(['#0a0c14', '#181c2a', '#2a3044', '#465068', '#8a96b0'], { shiny: true });
    const paper = [1, 0.8, 0.55].map(al => mat(['#7a7068', '#b8ac9c', '#ece2cc', '#fffaee'], { alpha: al }));
    const scr = flat('#06140e'), scrG = flat('#5fd38d'), scrR = flat('#ff4d6a'), key = flat('#5a6680'), keyL = flat('#a8b4cc');
    const slot = flat('#020306'), card = mat(['#06302e', '#0f6b62', '#26b39a', '#6fe8cc']), print = flat('#5a5048', { alpha: 0.9 }), wisp = flat('#bff5e6', { noLine: true, alpha: 0.6 });
    charge.push({
      name: 'Receipt Wyrm', w: 112, h: 94, rim: '#6fe8cc',
      note: 'A card terminal whose receipt curls out behind it like a ghostly serpent: the charge prints before the error ever shows.',
      draw(g, f, a) {
        const t = ph(f), hx = 12 + [0, 5, -4, -1][a], hy = 42 + [Math.round(S(t) * 1.5), -5, 3, 0][a];
        // receipt body, a printed ribbon that fades out
        const pts = [];
        for (let i = 0; i <= 160; i++) {
          const u = i / 160, amp = a === 2 ? 5 : 10;
          pts.push([hx + 34 + u * 56 + (a === 2 ? u * 6 : 0), hy + S(u * TAU * 1.15 - t - (a ? 1 : 0)) * amp * Math.min(1, u * 3) - u * 24]);
        }
        g.part();
        pts.forEach(([x, y], i) => {
          if (i === pts.length - 1) return;
          const [nx, ny] = pts[i + 1], tx = nx - x, ty = ny - y, l = Math.hypot(tx, ty) || 1, u = i / 160, w = 6.5 - u * 2.5;
          const m = paper[u < 0.55 ? 0 : u < 0.8 ? 1 : 2];
          g.line(x - ty / l * w, y + tx / l * w, x + ty / l * w, y - tx / l * w, m);
        });
        // printed lines across the ribbon, then a torn tail
        for (let i = 6; i < 150; i += 7) {
          const [x, y] = pts[i], [nx, ny] = pts[i + 2], tx = nx - x, ty = ny - y, l = Math.hypot(tx, ty) || 1;
          for (let k = -3; k <= 3; k += 2) if (hash(i, k) > 0.25) g.line(x - ty / l * k, y + tx / l * k, x - ty / l * k + tx / l * 2, y + tx / l * k + ty / l * 2, print);
        }
        const [ex, ey] = pts[160];
        [[4, -4], [7, 1], [5, 5]].forEach(([dx, dy], k) => g.px(ex + dx + (f + k) % 2, ey + dy, wisp));
        // terminal head
        g.part(); g.rrect(hx, hy - 10, 36, 48, 5, shell);
        g.part(); g.rect(hx + 4, hy - 6, 28, 16, scr);
        const sc = a === 2 ? scrR : scrG, blink = !a && f === 4;
        // eyes on the screen
        [[hx + 7, hy - 2], [hx + 19, hy - 2]].forEach(([x, y], k) => {
          if (blink) { g.rect(x, y + 3, 7, 1, sc); return; }
          g.rect(x, y, 7, 5, sc); g.rect(x + (a ? 0 : 2), y + 2, 3, 3, scr);
          g.line(x, y - 3 + (k ? 1 : 0), x + 6, y - 3 + (k ? 0 : 1), sc);
        });
        g.text(a === 2 ? 'ERR' : a === 1 ? '$$$' : f % 2 ? 'OK' : 'OK.', hx + 5, hy + 12, a ? scrR : scrG);
        // keypad
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { g.rect(hx + 6 + c * 7, hy + 19 + r * 4, 5, 3, key); g.rect(hx + 6 + c * 7, hy + 19 + r * 4, 5, 1, keyL); }
        // the card slot is a mouth; the card is its tongue
        const op = a === 2 ? 3 : 0, out = a === 2 ? 7 : a === 1 ? 2 : [5, 6, 7, 6, 5, 4][f];
        g.rect(hx - 1, hy + 32 - op, 18, 3 + op * 2, slot);
        g.part(); g.rect(hx - out, hy + 32, out + 10, 3, card);
        if (op) for (let k = 0; k < 5; k++) { g.px(hx + k * 3, hy + 32 - op, keyL); g.px(hx + 1 + k * 3, hy + 34 + op, keyL); }
      },
    });
  }

  // ---- Alt 2: Split-Host Specter. Two ghosts that should share one session, torn apart.
  {
    const gA = mat(['#1a1650', '#33308a', '#5a5ad0', '#9aa4ff', '#e4e8ff'], { alpha: 0.9 });
    const gB = mat(['#063a32', '#0f6b5c', '#26b39a', '#7fecd2', '#e0fff6'], { alpha: 0.9 });
    const rack = mat(['#05070d', '#0c1220', '#16203a', '#24365a']), ledG = flat('#5fd38d'), ledR = flat('#ff5d6c'), ledB = flat('#4da3ff');
    const cookie = mat(['#4a2810', '#8a5428', '#c8904c', '#ecc488']), chip = flat('#2a160a'), voidC = flat('#04050a'), stitch = flat('#fff4cf');
    const eyeW = flat('#ffffff'), pupil = flat('#0a0e1a'), coinE = flat('#d9b45b'), claw = mat(['#3d2a0c', '#7d5c22', '#d9b45b', '#f6dd94']), bang = flat('#ffd84d');
    const ghost = (g, cx, cy, m, f, k) => {
      g.part(); g.ell(cx, cy, 19, 18, m); g.rect(cx - 19, cy, 39, 30, m);
      for (let i = 0; i < 5; i++) { const x = cx - 17 + i * 8.5, d = (i + f + k) % 2 ? 4 : 2; g.ell(x, cy + 30 + d, 4.5, 3, m); }
      g.part(); g.rrect(cx - 10, cy - 17, 20, 6, 1, rack);
      [ledG, ledB, (f + k) % 3 ? ledG : ledR].forEach((l, i) => { g.px(cx - 6 + i * 5, cy - 15, l); g.px(cx - 5 + i * 5, cy - 15, l); });
    };
    charge.push({
      name: 'Split-Host Specter', w: 114, h: 90, rim: '#c8fff0',
      note: 'Two server ghosts stitched into one sheet: the login host clutches the session cookie, the billing host never got it, and the tear between them is where the card gets charged.',
      draw(g, f, a) {
        const t = ph(f), apart = [Math.round(S(t) * 1.5) + 1, 5, 2, 1][a];
        const lx = 30 - apart, ly = 29 + Math.round(S(t) * 1.5), rx = 84 + apart + (a === 2 ? -10 : 0), ry = 27 - Math.round(S(t) * 1.5) + (a === 2 ? -6 : 0);
        // the shared sheet between them, torn down the middle
        const mx = Math.round((lx + rx) / 2), tw = apart + 1;
        g.part(); g.poly([[lx + 12, ly + 8], [mx, (ly + ry) / 2 + 8], [mx, (ly + ry) / 2 + 34], [lx + 12, ly + 34]], gA);
        g.part(); g.poly([[mx, (ly + ry) / 2 + 8], [rx - 12, ry + 8], [rx - 12, ry + 34], [mx, (ly + ry) / 2 + 34]], gB);
        g.part(); for (let y = ly + 14; y < ly + 38; y++) { const z = (y % 4 < 2 ? 1 : -1); g.rect(mx - tw + z, y, tw * 2, 1, voidC); }
        for (let y = ly + 16; y < ly + 36; y += 4) g.line(mx - tw - 2, y, mx + tw + 2, y + 2, stitch);
        ghost(g, lx, ly, gA, f, 0);
        ghost(g, rx, ry, gB, f, 1);
        // login host: worried, holding the session cookie
        const blinkA = !a && f === 3;
        [[lx - 11, ly - 4], [lx + 1, ly - 4]].forEach(([x, y]) => { if (blinkA) g.rect(x, y + 4, 8, 1, pupil); else { g.ell(x + 4, y + 4, 4, 4, eyeW); g.rect(x + 2, y + 4, 3, 3, pupil); } });
        g.ell(lx - 3, ly + 10, 2, 2.5, voidC);
        g.part(); g.ell(lx - 15, ly + 20, 7, 7, cookie); [[-18, 18], [-13, 23], [-16, 22], [-12, 16], [-19, 22]].forEach(([dx, dy]) => g.px(lx + dx, ly + dy, chip));
        g.ellIf(lx - 9, ly + 15, 3, 3, 0, cookie);
        if (a === 2) { g.part(); g.rect(lx - 26, ly - 14, 2, 7, bang); g.rect(lx - 26, ly - 5, 2, 2, bang); }
        // billing host: coin eyes, grinning, reaching
        [[rx - 11, ry - 5], [rx + 1, ry - 5]].forEach(([x, y]) => { g.ell(x + 4, y + 4, 4, 4, coinE); g.rect(x + 3, y + 2, 2, 5, pupil); });
        g.rect(rx - 8, ry + 8, 15, 4, voidC); for (let i = 0; i < 5; i++) g.px(rx - 7 + i * 3, ry + 8, eyeW);
        const reach = a === 2 ? 16 : a === 1 ? -2 : 0;
        g.part(); g.curve(rx - 17, ry + 18, rx - 24 - reach * 0.5, ry + 16, rx - 26 - reach, ry + 8, gB, 6, 3);
        g.part(); [[-3, -3], [0, -4], [3, -2]].forEach(([dx, dy]) => g.line(rx - 26 - reach, ry + 8, rx - 28 - reach + dx, ry + 4 + dy, claw, 1));
        if (a === 2) { g.part(); g.ell(rx - 32 - reach, ry + 2, 3, 3, gold); }
      },
    });
  }

  // ---- Alt 3: Haunted Piggy Bank. Porcelain savings that drain out of a crack.
  {
    const porc = mat(['#3a4a6e', '#8a9cc0', '#dfe8f4', '#f6faff', '#ffffff'], { shiny: true });
    const cob = flat('#2a5ab0'), cobD = flat('#1a3a80'), socket = flat('#081018'), fire = flat('#6fe8cc', { alpha: 0.9 }), fireH = flat('#e0fff6', { alpha: 0.95 }), fireD = flat('#1f9a86', { alpha: 0.8 });
    const crack = flat('#14203a'), nos = flat('#5a6e94'), coinM = flat('#7d5c22');
    charge.push({
      name: 'Haunted Piggy Bank', w: 108, h: 90, rim: '#9ff3ff',
      note: 'A blue-painted porcelain pig with ghost-fire in its coin slot and a crack that leaks coins: money leaving the account before anything was provisioned.',
      draw(g, f, a) {
        const t = ph(f), bob = Math.round(S(t) * 1.5), dx = [0, 4, -10, -2][a], cy = 52 + bob + (a === 1 ? -3 : 0), cx = 60 + dx;
        // legs
        [[-21, 0], [-9, 1], [11, 0], [22, 1]].forEach(([lx, k]) => { g.part(); g.rrect(cx + lx - 4, cy + 16, 8, 12 + (k && !a ? f % 2 : 0), 2, porc); });
        // curly tail
        g.part(); g.curve(cx + 33, cy - 4, cx + 41, cy - 11, cx + 37, cy - 16, porc, 2, 2); g.px(cx + 35, cy - 14, porc);
        // body, head, snout, ears
        g.part(); g.ell(cx, cy, 34, 22, porc);
        g.part(); g.poly([[cx - 26, cy - 15], [cx - 22, cy - 30], [cx - 12, cy - 19]], porc); g.poly([[cx - 12, cy - 19], [cx - 5, cy - 31], [cx + 1, cy - 19]], porc);
        g.part(); g.ell(cx - 35, cy + 1, 6, 8, porc);
        g.rect(cx - 39, cy - 3, 2, 3, nos); g.rect(cx - 36, cy + 1, 2, 3, nos);
        // cobalt painted flowers and vine
        for (let x = cx - 26; x <= cx + 30; x++) { g.pxIf(x, Math.round(cy + 8 + S(x / 4) * 2), cob, porc); if (x % 5 === 0) g.pxIf(x, Math.round(cy + 6 + S(x / 4) * 2), cobD, porc); }
        [[cx - 6, cy - 8], [cx + 12, cy - 10], [cx + 24, cy + 1], [cx + 2, cy + 13], [cx - 18, cy + 12]].forEach(([x, y], k) => {
          [[0, -2], [2, 0], [0, 2], [-2, 0]].forEach(([u, v]) => g.pxIf(x + u, y + v, k % 2 ? cob : cobD, porc)); g.pxIf(x, y, cobD, porc);
        });
        // eye sockets with ghost light
        const blink = !a && f === 4;
        [[cx - 26, cy - 8], [cx - 16, cy - 9]].forEach(([x, y]) => {
          g.part(); g.ell(x, y, 3, 3, socket);
          if (!blink) { g.rect(x - 1, y - 1, 2, 2, a === 2 ? fireH : fire); g.px(x - 1, y - 1, fireH); }
        });
        g.line(cx - 31, cy - 14, cx - 23, cy - 11, socket); g.line(cx - 20, cy - 13, cx - 12, cy - 13, socket);
        // crack leaking coins
        const ck = [[cx + 9, cy + 21], [cx + 11, cy + 14], [cx + 8, cy + 9], [cx + 13, cy + 4], [cx + 15, cy - 3], [cx + 19, cy - 6]];
        for (let i = 0; i + 1 < ck.length; i++) g.line(...ck[i], ...ck[i + 1], crack);
        const coins = a === 2 ? [[cx + 18, cy + 6], [cx + 26, cy + 14], [cx + 34, cy + 4], [cx + 30, cy + 24]] : [[cx + 10, cy + 25 + (f % 3) * 4], [cx + 12, cy + 33 - (f % 2) * 3]];
        coins.forEach(([x, y]) => { g.part(); g.rrect(x - 2, y - 2, 5, 5, 2, gold); g.px(x, y, coinM); });
        // slot with ghost-fire
        g.part(); g.rect(cx - 2, cy - 22, 13, 2, socket);
        const lean = a === 2 ? 6 : a === 1 ? -1 : 0;
        for (let k = 0; k < 4; k++) {
          const h = 8 + ((f + k * 2) % 3) * 3 + (a === 1 ? 5 : 0), x0 = cx - 1 + k * 3;
          g.part(); g.poly([[x0, cy - 22], [x0 + 4, cy - 22], [x0 + 2 + lean, cy - 22 - h]], k % 2 ? fireD : fire);
          g.px(x0 + 2 + lean * 0.5, cy - 24 - h * 0.3, fireH);
        }
        if (a === 1) g.shear(0.08, cy + 28);
        if (a === 2) g.shear(-0.08, cy + 28);
      },
    });
  }

  // ---- Alt 4: Poltergeist Vending Machine. Takes the money, keeps the goods.
  {
    const body = mat(['#05161c', '#0b303a', '#145864', '#24889a', '#7fd0d8'], { shiny: true });
    const glass = flat('#0a1a26'), glassH = flat('#1e3a50'), coil = flat('#5a6e86'), sign = flat('#d9b45b'), signT = flat('#3d2a0c');
    const items = [flat('#ff5d6c'), flat('#d9b45b'), flat('#5fd38d'), flat('#4da3ff'), flat('#c48aff')];
    const face = mat(['#3a6a74', '#7fb8c0', '#c8f0f0', '#ffffff'], { alpha: 0.55 }), hole = flat('#04080c', { alpha: 0.8 }), redE = flat('#ff4d6a');
    const tail = mat(['#0b303a', '#145864', '#24889a', '#7fd0d8'], { alpha: 0.6 }), scr = flat('#03100a'), ok = flat('#5fd38d'), err = flat('#ff4d6a'), slot = flat('#020306');
    charge.push({
      name: 'Poltergeist Vending', w: 84, h: 96, rim: '#9ff3ff',
      note: 'A haunted vending machine that swallows your coin, flashes PAID, and drops nothing: a payment taken with no subscription behind it.',
      draw(g, f, a) {
        const t = ph(f), bob = Math.round(S(t) * 1.5), x0 = 18, y0 = 3 + bob + (a === 1 ? -1 : 0);
        // ghost tail instead of feet
        for (let k = 0; k < 4; k++) { g.part(); g.curve(x0 + 8 + k * 13, y0 + 80, x0 + 6 + k * 13 + S(t + k) * 3, y0 + 86, x0 + 4 + k * 13 + S(t + k + 1) * 4, y0 + 89 - (k % 2) * 2, tail, 7, 2); }
        g.part(); g.rrect(x0, y0, 54, 82, 3, body);
        // lit sign
        g.part(); g.rect(x0 + 4, y0 + 3, 46, 8, sign); g.text('PLANS', x0 + 16, y0 + 5, signT);
        // glass with items on coils
        g.part(); g.rect(x0 + 4, y0 + 14, 34, 50, glass);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
          const ix = x0 + 6 + c * 8, iy = y0 + 18 + r * 12, jig = !a && (r + c + f) % 4 === 0 ? -1 : 0;
          g.rect(ix, iy + 6, 7, 1, coil); g.rect(ix + 1, iy + jig, 5, 6, items[(r * 4 + c) % 5]); g.px(ix + 1, iy + jig, flat('#ffffff'));
        }
        g.line(x0 + 6, y0 + 16, x0 + 14, y0 + 60, glassH);
        // the ghost face reflected in the glass
        g.part(); g.ell(x0 + 21, y0 + 36, 12, 13, face);
        const ec = a ? redE : hole;
        g.ell(x0 + 16, y0 + 32, 2.5, 3.5, ec); g.ell(x0 + 25, y0 + 32, 2.5, 3.5, ec);
        g.poly([[x0 + 14, y0 + 42], [x0 + 28, y0 + 42], [x0 + 21, y0 + 47 + (a === 2 ? 3 : 0)]], hole);
        // control column
        g.part(); g.rect(x0 + 41, y0 + 14, 10, 7, scr);
        g.text(a === 2 ? 'X' : 'OK', x0 + 42, y0 + 15, a === 2 ? err : ok);
        g.rect(x0 + 44, y0 + 25, 4, 7, slot); g.px(x0 + 45, y0 + 23, gold);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) g.rect(x0 + 42 + c * 5, y0 + 36 + r * 5, 3, 3, flat('#8a9cb4'));
        // display bar
        g.part(); g.rect(x0 + 4, y0 + 66, 34, 5, scr);
        g.text(a === 2 ? 'ERROR' : (f % 2 ? 'PAID' : 'PAID.'), x0 + 6, y0 + 66, a === 2 ? err : ok);
        // dispense tray: empty, except on the strike it spits the coin back at you
        g.part(); g.rect(x0 + 6, y0 + 73, 30, 6, slot);
        if (a === 2) { [[-6, 70], [-12, 64], [-2, 62]].forEach(([dx, dy]) => { g.part(); g.rrect(x0 + dx, y0 + dy, 5, 5, 2, gold); }); }
        if (a === 1) g.shear(0.1, y0 + 82);
        if (a === 2) g.shear(-0.16, y0 + 82);
        if (a === 3) g.shear(-0.03, y0 + 82);
        if (!a) g.shear([0, 0.02, 0.03, 0.02, 0, -0.02][f], y0 + 82);
      },
    });
  }

  // ---- Alt 5 (bold): Late Error. The error dialog that shows up after the charge.
  {
    const frame = mat(['#2a3448', '#5a6a86', '#a8b6cc', '#e2e9f4']);
    const bar = mat(['#4a0612', '#8a1426', '#d8304a', '#ff7a8a']);
    const panel = flat('#d6deea'), panelD = flat('#aab6c8'), txt = flat('#ffffff'), ink2 = flat('#1a2236'), maw = flat('#2a0610'), fang = flat('#ffffff');
    const btn = mat(['#0b2a5a', '#1d5aa8', '#4da3ff', '#a8d6ff']), tail = mat(['#5a6a86', '#a8b6cc', '#d6deea', '#ffffff'], { alpha: 0.7 }), coinT = flat('#d9b45b'), arrow = flat('#ffffff'), arrowD = flat('#05070d');
    charge.push({
      name: 'Late Error', w: 100, h: 90, rim: '#ffb3c0',
      note: 'An error dialog that floats in like a ghost, fangs bared, a beat after the money is gone: the worst path charged the card first and failed second.',
      draw(g, f, a) {
        const t = ph(f), x = 10 + [0, 6, -8, -2][a], y = 6 + Math.round(S(t) * 1.5) + (a === 1 ? -2 : 0), w = 80, h = 58;
        // ghost tail under the dialog
        g.part(); g.rect(x + 3, y + h - 4, w - 6, 14, tail);
        for (let k = 0; k < 5; k++) { const lx = x + 10 + k * 15 + Math.round(S(t + k) * 2), d = (k + f) % 2 ? 4 : 1; g.ell(lx, y + h + 10 + d, 7, 4 + d, tail); }
        g.part(); g.rect(x, y, w, h, frame);
        g.part(); g.rect(x + 2, y + 2, w - 4, 10, bar);
        g.text(a === 2 ? 'CHARGED' : a === 1 ? '...' : 'ERROR', x + 5, y + 4, txt);
        g.part(); g.rect(x + w - 11, y + 3, 8, 8, frame); g.line(x + w - 9, y + 5, x + w - 6, y + 8, ink2); g.line(x + w - 6, y + 5, x + w - 9, y + 8, ink2);
        g.rect(x + 2, y + 12, w - 4, h - 14, panel); g.rect(x + 2, y + h - 3, w - 4, 1, panelD);
        // face
        const blink = !a && f === 4;
        [[x + 18, y + 20, 1], [x + 44, y + 20, -1]].forEach(([ex, ey, s2]) => {
          if (blink) { g.rect(ex, ey + 4, 12, 2, ink2); return; }
          g.rect(ex, ey + 2, 12, 6, ink2); g.rect(ex + (s2 > 0 ? 6 : 2), ey + 4, 3, 2, bar);
          g.line(ex - 1, ey + (s2 > 0 ? -1 : 3), ex + 12, ey + (s2 > 0 ? 3 : -1), ink2, 2);
        });
        const op = a === 2 ? 8 : a === 1 ? 1 : (f === 2 ? 2 : 1);
        g.rect(x + 22, y + 33, 32, 3 + op, maw);
        for (let i = 0; i < 5; i++) { g.poly([[x + 23 + i * 6, y + 33], [x + 27 + i * 6, y + 33], [x + 25 + i * 6, y + 37]], fang); }
        if (a === 2) g.text('$$$', x + 27, y + 37, coinT, F5);
        // OK button and a cursor that will never reach it in time
        g.part(); g.rrect(x + w - 24, y + h - 13, 18, 9, 2, btn); g.text('OK', x + w - 19, y + h - 11, txt);
        const cx = x + w - 6 + [0, 1, 2, 1, 0, -1][f], cy = y + h - 4;
        g.part(); g.poly([[cx, cy], [cx, cy + 9], [cx + 2, cy + 7], [cx + 4, cy + 10], [cx + 5, cy + 9], [cx + 3, cy + 6], [cx + 6, cy + 6]], arrow);
      },
    });
  }

  register('Phantom Charge', charge);

})();
