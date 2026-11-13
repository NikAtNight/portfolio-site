// PROTOTYPE boss alternatives (Claude, file 3 of 3): The Blank Canvas, Data Bleed
// Doppelganger, Pixel Mimic. Five original concepts each, drawn in code: shapes go
// into a material grid, then one pass adds hue-shifted shading, contact shadows,
// a selective outline and a rim light. Runs standalone; registers at load time.
window.SpriteSheet = window.SpriteSheet || { groups: [], add(group, name, frames, opts = {}) {
  let g = this.groups.find(x => x.name === group); if (!g) this.groups.push(g = { name: group, items: [] });
  const i = g.items.findIndex(x => x.name === name), item = { name, frames, fps: opts.fps || 6, note: opts.note || '' };
  i >= 0 ? (g.items[i] = item) : g.items.push(item);
} };
(() => {
  // =====================================================================
  // engine: materials, grid, shading pass
  // =====================================================================
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const OUT = rgb('#05070d'), COOL = rgb('#24164f'), WARM = rgb('#fff0c0');
  const MATS = [null];
  // hue shift: shadows lean cool violet, highlights lean warm
  const shift = t => t.map((c, i) => {
    const n = t.length; if (n < 3) return c;
    const k = i / (n - 1);
    if (k < 0.5) return mix(c, COOL, (0.5 - k) * 0.55);
    if (k > 0.6) return mix(c, WARM, (k - 0.6) * 0.32);
    return c;
  });
  // tones: [deep shadow, shadow, base, light, (specular)]
  const mat = (tones, o = {}) => { const t = tones.map(rgb); MATS.push({ tones: o.raw ? t : shift(t), flat: false, shiny: !!o.shiny, line: !!o.line }); return MATS.length - 1; };
  const flat = c => { MATS.push({ tones: [rgb(c)], flat: true }); return MATS.length - 1; };

  const FONT = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31], M: [17, 27, 21, 21, 17, 17, 17],
    N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16], R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4],
    W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17], Y: [17, 17, 10, 4, 4, 4, 4],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
    4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
    8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    '#': [10, 31, 10, 10, 31, 10, 0], '%': [24, 25, 2, 4, 8, 19, 3], '+': [0, 4, 4, 31, 4, 4, 0], '-': [0, 0, 0, 31, 0, 0, 0],
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], ' ': [0, 0, 0, 0, 0, 0, 0],
  };
  // 3x5 micro font for tiny labels
  const MICRO = {
    0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [7, 1, 7, 4, 7], 3: [7, 1, 3, 1, 7], 4: [5, 5, 7, 1, 1], 5: [7, 4, 7, 1, 7],
    6: [7, 4, 7, 5, 7], 7: [7, 1, 2, 2, 2], 8: [7, 5, 7, 5, 7], 9: [7, 5, 7, 1, 7], '#': [5, 7, 5, 7, 5], A: [2, 5, 7, 5, 5],
    a: [0, 6, 3, 5, 7], D: [6, 5, 5, 5, 6], I: [7, 2, 2, 2, 7], '%': [5, 1, 2, 4, 5], '+': [0, 2, 7, 2, 0], '-': [0, 0, 7, 0, 0],
    ' ': [0, 0, 0, 0, 0],
  };

  class Grid {
    constructor(w, h) { this.w = w; this.h = h; this.m = new Uint8Array(w * h); this.p = new Uint8Array(w * h); this.pc = 0; }
    part() { this.pc = Math.min(255, this.pc + 1); return this; }
    get(x, y) { x = Math.round(x); y = Math.round(y); return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.m[y * this.w + x]; }
    raw(x, y, m) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; this.m[i] = m; this.p[i] = m ? this.pc : 0; }
    px(x, y, m) { this.raw(Math.round(x), Math.round(y), m); }
    // paint only over an existing material (decals)
    pxIf(x, y, m, only) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; if (only ? this.m[i] === only : this.m[i]) this.m[i] = m; }
    rect(x, y, w, h, m) { x = Math.round(x); y = Math.round(y); for (let j = 0; j < Math.round(h); j++) for (let i = 0; i < Math.round(w); i++) this.raw(x + i, y + j, m); }
    rectIf(x, y, w, h, m, only) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.pxIf(x + i, y + j, m, only); }
    ell(cx, cy, rx, ry, m, only) {
      rx += 0.5; ry += 0.5;
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const dx = (x - cx) / rx, dy = (y - cy) / ry;
          if (dx * dx + dy * dy <= 1) only === undefined ? this.raw(x, y, m) : this.pxIf(x, y, m, only);
        }
    }
    rrect(x, y, w, h, r, m) {
      x = Math.round(x); y = Math.round(y);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const px = x + i, py = y + j;
        const cx = Math.min(Math.max(px, x + r), x + w - 1 - r), cy = Math.min(Math.max(py, y + r), y + h - 1 - r);
        if ((px - cx) ** 2 + (py - cy) ** 2 <= (r + 0.35) ** 2) this.raw(px, py, m);
      }
    }
    dot(x, y, th, m) {
      if (th <= 1) return this.px(x, y, m);
      if (th % 2 === 0) return this.rect(Math.floor(x - th / 2 + 0.5), Math.floor(y - th / 2 + 0.5), th, th, m);
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
    // quadratic stroke with tapering thickness; `each` sees every sample
    curve(x0, y0, cx, cy, x1, y1, m, t0, t1, each) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5) + 4;
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        const th = t0 + (t1 - t0) * t;
        if (th >= 1.5) this.ell(x, y, (th - 1) / 2, (th - 1) / 2, m); else this.px(x, y, m);
        if (each) each(x, y, t, i);
      }
    }
    text(s, x, y, m) { [...s].forEach((ch, i) => (FONT[ch] || FONT[' ']).forEach((row, r) => { for (let c = 0; c < 5; c++) if (row >> (4 - c) & 1) this.px(x + i * 6 + c, y + r, m); })); }
    text2(s, x, y, m) { [...s].forEach((ch, i) => (FONT[ch] || FONT[' ']).forEach((row, r) => { for (let c = 0; c < 5; c++) if (row >> (4 - c) & 1) this.rect(x + i * 12 + c * 2, y + r * 2, 2, 2, m); })); }
    micro(s, x, y, m) { [...s].forEach((ch, i) => (MICRO[ch] || MICRO[' ']).forEach((row, r) => { for (let c = 0; c < 3; c++) if (row >> (2 - c) & 1) this.px(x + i * 4 + c, y + r, m); })); }
  }

  // light from the top left; contact shadow where a later part overlaps;
  // rim: 1px key light on the right edge; selective outline
  const render = (g, o = {}) => {
    const { w, h, m, p } = g, W2 = w + 2, H2 = h + 2;
    const rim = o.rim ? rgb(o.rim) : null;
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
      const id = at(x, y); let col = null;
      if (id) {
        const M = MATS[id], T = M.tones, pt = p[y * w + x];
        if (M.flat) col = T[0];
        else {
          let contact = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const q = at(x + dx, y + dy);
            if (q && !isFlat(q) && (q !== id || p[(y + dy) * w + x + dx] !== pt) && p[(y + dy) * w + x + dx] > pt) contact = true;
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
              if (s > 0.76) tone = 1; else if (s < 0.12) tone = 3;
            }
          }
          col = T[Math.min(tone, T.length - 1)];
          if (rim && !contact && !at(x + 1, y) && !upOpen && tone <= 2 && T.length > 2) col = mix(T[2], rim, 0.6);
        }
      } else {
        const below = at(x, y + 1), right = at(x + 1, y), above = at(x, y - 1), left = at(x - 1, y);
        const lit = below || right;
        if (lit || above || left) {
          const id = lit && !above && !left ? (below || right) : 0;
          col = id && !MATS[id].flat && MATS[id].tones.length > 2 ? mix(MATS[id].tones[0], OUT, 0.45) : OUT;
        }
      }
      if (col) { const i = ((y + 1) * W2 + x + 1) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
    }
    cx.putImageData(img, 0, 0);
    return c;
  };

  const TAU = Math.PI * 2;
  const S = (f, n, a = 1, ph = 0) => Math.round(Math.sin((f / n + ph) * TAU) * a);
  const hash = (a, b = 0) => { let t = (a * 374761393 + b * 668265263) | 0; t = (t ^ (t >>> 13)) * 1274126177 | 0; return ((t ^ (t >>> 16)) >>> 0) / 4294967296; };

  // shared materials
  const gold = mat(['#3d2a0c', '#7d5c22', '#d9b45b', '#f6dd94', '#fff4cf'], { shiny: true });
  const steel = mat(['#2c3a52', '#6f819e', '#b9c7dc', '#e8eef7', '#ffffff'], { shiny: true });
  const black = flat('#05070d'), white = flat('#ffffff'), night = flat('#0a0e1a');
  const sysBlue = flat('#4da3ff'), navy = flat('#1e3a66'), goldF = flat('#d9b45b'), textF = flat('#e8eef7');
  const red = flat('#ff5d6c'), green = flat('#5fd38d'), amber = flat('#ffb84d');

  // =====================================================================
  // registry: each concept draws (g, f, a) where a is 0 idle,
  // 1 anticipation, 2 strike, 3 recover
  // =====================================================================
  const CONCEPTS = [];
  const concept = (boss, n, name, o) => CONCEPTS.push({ boss, n, name, ...o });

  // =====================================================================
  // 7. THE BLANK CANVAS
  // =====================================================================
  const B7 = 'The Blank Canvas';

  // ---- Alt 1: Window Wisp. An empty app window that haunts the screen.
  const WW = {
    chrome: mat(['#1a2236', '#2c3a58', '#46597e', '#6f86ad', '#a9bde0'], { shiny: true }),
    pane: mat(['#a69fb8', '#d2cfdc', '#f3f1ec', '#ffffff']),
    ghost: mat(['#5c6a92', '#8d9cc4', '#c6d2ee', '#eef3ff']),
    caret: flat('#4da3ff'), dim: flat('#c7c3d4'), shadow: flat('#3a4566'),
  };
  concept(B7, 1, 'Window Wisp', {
    note: 'An empty desktop window drifting like a ghost, its pane blank but for a blinking cursor; on the strike it throws a fully built UI at you, the "working app on night one" turned against the hero.',
    w: 92, h: 90, rim: '#ffd28a',
    draw(g, f, a) {
      const bob = a ? [0, -3, 2, 1][a] : S(f, 6, 1.5), X = 8, Y = 10 + bob, Wd = 66, Hd = 50;
      const lean = a === 1 ? -2 : a === 2 ? 3 : 0;
      // ghostly tail trailing under the window
      g.part();
      const sw = [0, 1, 2, 1, 0, -1][f % 6];
      g.poly([[X + 4 + lean, Y + Hd - 4], [X + Wd - 4 + lean, Y + Hd - 4], [X + Wd - 10 + sw, Y + Hd + 8], [X + 12 - sw, Y + Hd + 8]], WW.ghost);
      // three wisp lobes, swaying out of phase
      [[X + 18, 14], [X + 33, 22], [X + 48, 16]].forEach(([lx, len], i) => {
        const s2 = [0, 1, 2, 1, 0, -1][(f + i * 2) % 6];
        g.poly([[lx - 7 + sw, Y + Hd + 4], [lx + 7 + sw, Y + Hd + 4], [lx + 2 + s2 * 2, Y + Hd + 4 + len], [lx - 1 + s2 * 2, Y + Hd + 6 + len]], WW.ghost);
      });
      // window body
      g.part(); g.rrect(X + lean, Y, Wd, Hd, 3, WW.chrome);
      g.part(); g.rect(X + 3 + lean, Y + 8, Wd - 6, Hd - 11, WW.pane);
      // traffic lights act as three eyes
      const blink = !a && f === 4;
      [red, amber, green].forEach((c, i) => { if (blink) g.rect(X + 4 + i * 5 + lean, Y + 4, 3, 1, c); else g.rect(X + 4 + i * 5 + lean, Y + 3, 3, 3, c); });
      g.rect(X + 24 + lean, Y + 3, 22, 2, WW.shadow);
      const px0 = X + 3 + lean, py0 = Y + 8;
      if (a === 2 || a === 3) {
        // the strike: the pane fills with a whole app at once
        g.rect(px0, py0, 14, Hd - 11, night);
        [4, 9, 14, 19].forEach((yy, i) => g.rect(px0 + 2, py0 + yy, 10, 2, i === 1 ? goldF : sysBlue));
        g.rect(px0 + 14, py0, Wd - 20, 5, navy);
        for (let r = 0; r < 6; r++) g.rect(px0 + 17, py0 + 8 + r * 5, 12 + Math.floor(hash(r, 3) * 26), 2, r % 3 === 0 ? green : r % 3 === 1 ? red : WW.dim);
        if (a === 3) g.rectIf(px0 + 30, py0 + 6, 30, 30, WW.pane);
      } else {
        // blank: just a caret, and a pair of faint eyes in the paper
        const ey = py0 + 13 + (a === 1 ? 2 : 0);
        g.poly([[px0 + 16, ey], [px0 + 24, ey + 2], [px0 + 24, ey + 4], [px0 + 17, ey + 3]], WW.shadow);
        g.poly([[px0 + 44, ey], [px0 + 36, ey + 2], [px0 + 36, ey + 4], [px0 + 43, ey + 3]], WW.shadow);
        if (f % 2 === 0 || a === 1) g.rect(px0 + 29, py0 + 24, 2, 8, WW.caret);
        if (a === 1) { g.rect(px0 + 22, py0 + 33, 16, 2, WW.shadow); }
      }
      // resize grip
      g.px(X + Wd - 3 + lean, Y + Hd - 2, WW.shadow); g.px(X + Wd - 5 + lean, Y + Hd - 2, WW.shadow); g.px(X + Wd - 3 + lean, Y + Hd - 4, WW.shadow);
      // the mouse cursor hand it holds out
      const hx = X + Wd + 2 + lean + (a === 2 ? 4 : a === 1 ? -3 : 0), hy = Y + 30 + (a === 1 ? -6 : 0) + S(f, 6, 1, 0.25);
      g.part(); g.poly([[hx, hy], [hx, hy + 11], [hx + 3, hy + 8], [hx + 5, hy + 12], [hx + 7, hy + 11], [hx + 5, hy + 7], [hx + 8, hy + 7]], WW.pane);
    },
  });

  // ---- Alt 2: Sketch Wyrm. A dragon still being drawn: inked head, pencil tail.
  const SW = {
    ink: mat(['#0d1834', '#183064', '#2c5aa8', '#4da3ff', '#b6dcff'], { shiny: true }),
    belly: mat(['#3a5a8a', '#6a8ec0', '#a8c6ec', '#e0eeff']),
    paper: mat(['#8c8578', '#c9c1b0', '#efe8d8', '#fffaf0']),
    pencil: flat('#8f8a80'), pencil2: flat('#bdb6a8'), eye: flat('#ffd84d'), mouth: flat('#160a20'), tooth: flat('#fffaf0'),
    lead: mat(['#1a1a22', '#33333d', '#55555f', '#8a8a96']), shaft: mat(['#7a3a10', '#c06a20', '#ffb84d', '#ffe0a0']),
  };
  concept(B7, 2, 'Sketch Wyrm', {
    note: 'A dragon still drawing itself: the head is inked and painted, the body fades back to pencil lines and then to blank paper, the way Patchdeck went from an empty screen to a finished app.',
    w: 104, h: 88, rim: '#ffd28a',
    draw(g, f, a) {
      const bob = a ? [0, 2, -2, 0][a] : S(f, 6, 1.5);
      const hx = a === 1 ? 70 : a === 2 ? 82 : 76, hy = 26 + bob + (a === 1 ? -4 : a === 2 ? 4 : 0);
      // pencil-only tail: a loose dashed spiral, still a sketch
      const sw = S(f, 6, 2);
      g.part();
      g.curve(30, 62 + bob, 8, 70 + sw, 6, 50 - sw, SW.pencil, 1, 1, (x, y, t, i) => { if (i % 3 === 0) g.px(x, y, 0); });
      g.curve(6, 50 - sw, 4, 36, 16, 38 + sw, SW.pencil2, 1, 1, (x, y, t, i) => { if (i % 2) g.px(x, y, 0); });
      // construction circles where the body will go
      for (let i = 0; i < 40; i++) { const an = i / 40 * TAU; if (i % 2) g.px(26 + Math.cos(an) * 9, 60 + bob + Math.sin(an) * 7, SW.pencil2); }
      // body: half paper (outlined), half inked
      g.part();
      g.curve(32, 62 + bob, 50, 72 + bob, hx - 12, hy + 16, SW.paper, 13, 11);
      // pencil hatching, clipped to the unpainted paper half
      for (let i = 0; i < 8; i++) for (let k = 0; k <= 10; k++) if (k % 4 !== 3) g.pxIf(28 + i * 3 + k * 0.4, 70 + bob - k, SW.pencil2, SW.paper);
      g.part();
      g.curve(46, 66 + bob, 58, 70 + bob, hx - 10, hy + 14, SW.ink, 12, 10);
      g.curve(52, 73 + bob, 62, 75 + bob, hx - 7, hy + 20, SW.belly, 3, 3);
      // ink flicks where the pen is still working
      for (let i = 0; i < 4; i++) g.px(42 - i * 2, 60 + bob + (i % 2) * 3 + S(f + i, 6, 1), SW.pencil);
      // legs: front inked claw, back one pencil
      g.part(); g.line(36, 66 + bob, 34, 84, SW.pencil, 1); g.line(34, 84, 30, 84, SW.pencil, 1); g.line(34, 84, 38, 85, SW.pencil);
      g.part(); g.line(60, 72 + bob, 62, 84, SW.ink, 4); g.rect(58, 83, 9, 3, SW.ink);
      g.px(58, 86, SW.tooth); g.px(62, 86, SW.tooth); g.px(66, 86, SW.tooth);
      // wing: half drawn, ribs in pencil and membrane partly inked
      const wf = a === 1 ? -6 : a === 2 ? 4 : S(f, 6, 2, 0.25);
      g.part();
      g.line(58, 46 + bob, 44, 18 + bob + wf, SW.ink, 2);
      g.line(44, 18 + bob + wf, 30, 30 + bob + wf, SW.pencil);
      g.line(44, 18 + bob + wf, 36, 40 + bob + wf / 2, SW.pencil);
      g.poly([[58, 46 + bob], [44, 18 + bob + wf], [38, 26 + bob + wf], [40, 34 + bob + wf * 0.7], [44, 38 + bob + wf / 2], [48, 46 + bob]], SW.ink);
      for (let i = 0; i < 10; i++) if (i % 2) g.px(36 - i * 0.6, 30 + bob + wf + i, SW.pencil);
      // head: fully inked
      g.part();
      g.ell(hx, hy, 9, 8, SW.ink);
      const open = a === 2 ? 7 : a === 1 ? 0 : 2;
      g.poly([[hx + 4, hy - 2], [hx + 18, hy + 1], [hx + 17, hy + 5], [hx + 4, hy + 5]], SW.ink);
      if (open) { g.part(); g.poly([[hx + 5, hy + 5], [hx + 17, hy + 5], [hx + 15, hy + 5 + open], [hx + 5, hy + 7 + open / 2]], SW.mouth); }
      g.part(); g.poly([[hx + 3, hy + 5 + open], [hx + 16, hy + 5 + open], [hx + 14, hy + 9 + open], [hx + 2, hy + 10]], SW.ink);
      g.px(hx + 8, hy + 5 + open - 1, SW.tooth); g.px(hx + 12, hy + 5 + open - 1, SW.tooth); g.px(hx + 10, hy + 6, SW.tooth); g.px(hx + 14, hy + 6, SW.tooth);
      // horn: one in ink, one pencil
      g.part(); g.poly([[hx - 6, hy - 5], [hx - 15, hy - 14], [hx - 2, hy - 7]], SW.ink);
      g.line(hx, hy - 7, hx - 6, hy - 16, SW.pencil);
      g.part(); g.rect(hx + 3, hy - 3, 3, 3, SW.eye); g.px(hx + 5, hy - 2, SW.mouth);
      // a big pencil tip in its claw, drawing the rest of itself
      const pa = a === 1 ? -1.2 : a === 2 ? 0.2 : -0.6 + S(f, 6, 0.15) * 0.1;
      const px0 = 72, py0 = 66 + bob, ca = Math.cos(pa), sa = Math.sin(pa);
      g.part(); g.line(px0, py0, px0 + ca * 18, py0 + sa * 18, SW.shaft, 3);
      g.part(); g.line(px0 + ca * 18, py0 + sa * 18, px0 + ca * 22, py0 + sa * 22, SW.paper, 2);
      g.px(px0 + ca * 24, py0 + sa * 24, SW.pencil);
      g.part(); g.ell(px0, py0, 3, 2.5, SW.ink);
    },
  });

  // ---- Alt 3: Blueprint Titan. A construction-scaffold giant on blueprint paper.
  const BT = {
    print: mat(['#0b1f45', '#123068', '#1d4a96', '#2e6bc4', '#5a95e6']),
    beam: mat(['#2a1a08', '#6a4818', '#b8862e', '#e6b85a', '#fff0b8'], { shiny: true }),
    line: flat('#a9d4ff'), lineDim: flat('#5a95e6'), core: flat('#fff4cf'), coreHot: flat('#ffffff'),
    sheet: mat(['#9a9488', '#cfc9bb', '#f1ece1', '#ffffff']),
  };
  concept(B7, 3, 'Blueprint Titan', {
    note: 'A scaffolding giant whose body is a rolled-out blueprint held up by gold beams, a face still in measurement lines; it is the plan for "GitHub, but not GitHub" learning to stand up.',
    w: 92, h: 94, rim: '#ffd28a',
    draw(g, f, a) {
      const bob = a ? [0, 2, -1, 1][a] : (f % 3 === 1 ? 1 : 0);
      const T = 8 + bob, cx = 46;
      // legs: scaffold towers with cross braces
      [[cx - 20, 1], [cx + 10, -1]].forEach(([lx, s]) => {
        g.part();
        g.rect(lx, 60, 3, 32, BT.beam); g.rect(lx + 9, 60, 3, 32, BT.beam);
        for (let y = 62; y < 90; y += 9) { g.line(lx + 2, y, lx + 9, y + 8, BT.beam); g.rect(lx, y, 12, 2, BT.beam); }
        g.rect(lx - 2, 91, 16, 3, BT.beam);
      });
      // torso: a blueprint sheet stretched on a frame
      g.part(); g.rect(cx - 26, T + 22, 52, 40, BT.print);
      // grid lines and a floor plan drawing on the chest
      for (let x = cx - 24; x < cx + 26; x += 6) for (let y = T + 24; y < T + 61; y += 2) g.px(x, y, BT.lineDim);
      for (let y = T + 26; y < T + 61; y += 6) for (let x = cx - 25; x < cx + 26; x += 2) g.px(x, y, BT.lineDim);
      g.rect(cx - 16, T + 30, 32, 1, BT.line); g.rect(cx - 16, T + 52, 32, 1, BT.line);
      g.rect(cx - 16, T + 30, 1, 23, BT.line); g.rect(cx + 15, T + 30, 1, 23, BT.line);
      g.rect(cx - 16, T + 37, 32, 1, BT.line); g.rect(cx - 6, T + 37, 1, 16, BT.line);
      // reactor-like core: the glowing first-night build
      const pulse = a === 2 ? 2 : (f % 3 === 0 ? 1 : 0);
      g.part(); g.ell(cx + 4, T + 45, 3 + pulse, 3 + pulse, BT.core); g.px(cx + 3, T + 44, BT.coreHot);
      // frame beams
      g.part(); g.rect(cx - 28, T + 20, 56, 3, BT.beam); g.rect(cx - 28, T + 61, 56, 3, BT.beam);
      g.rect(cx - 28, T + 20, 3, 44, BT.beam); g.rect(cx + 25, T + 20, 3, 44, BT.beam);
      // head: a rolled blueprint tube, face drawn in measure lines
      g.part(); g.rrect(cx - 14, T, 28, 20, 4, BT.print);
      g.part(); g.ell(cx - 14, T + 10, 3, 10, BT.sheet); g.ell(cx - 14, T + 10, 1, 6, BT.print);
      const ey = T + 8 + (a === 1 ? 1 : 0);
      g.rect(cx - 7, ey, 5, 3, a ? BT.coreHot : BT.line); g.rect(cx + 4, ey, 5, 3, a ? BT.coreHot : BT.line);
      for (let x = cx - 9; x <= cx + 10; x += 2) g.px(x, T + 15, BT.line);
      g.px(cx - 9, T + 14, BT.line); g.px(cx + 10, T + 14, BT.line);
      // arms: crane booms; right arm is a measuring T-square hammer
      const ra = a === 1 ? -1.9 : a === 2 ? 0.25 : a === 3 ? -0.2 : -0.5 + S(f, 6, 1) * 0.06;
      g.part();
      g.line(cx - 28, T + 24, cx - 36, T + 46, BT.beam, 3); g.line(cx - 36, T + 46, cx - 32, T + 62 + S(f, 6, 1), BT.beam, 3);
      g.rect(cx - 36, T + 62 + S(f, 6, 1), 8, 3, BT.beam);
      const sx = cx + 28, sy = T + 24, ex = sx + Math.cos(ra) * 16, ey2 = sy + Math.sin(ra) * 16 + 10;
      g.part(); g.line(sx, sy, sx + 6, sy + 10, BT.beam, 3); g.line(sx + 6, sy + 10, ex, ey2, BT.beam, 3);
      // T-square blade
      const ba = ra - Math.PI / 2, bx = Math.cos(ba), by = Math.sin(ba);
      g.part(); g.line(ex - bx * 6, ey2 - by * 6, ex + bx * 6, ey2 + by * 6, BT.sheet, 3);
      for (let k = -5; k <= 5; k += 2) g.px(ex + bx * k + Math.cos(ra) * 1, ey2 + by * k + Math.sin(ra) * 1, BT.lineDim);
    },
  });

  // ---- Alt 4: Unsigned Parcel. A shipping box creature, wax seal for a mouth.
  const UP = {
    card: mat(['#3a2210', '#7a4e26', '#b8834a', '#e0b47a', '#f6dcac']),
    tape: mat(['#7a6a3a', '#b8a060', '#e6d08a', '#fff2c0']),
    wax: mat(['#3a0612', '#7a0f26', '#c41e3a', '#ff5d6c', '#ffb3bb'], { shiny: true }),
    inside: flat('#1a0e08'), label: flat('#f1ece1'), labelInk: flat('#2a2433'), eye: flat('#ffd84d'), crack: flat('#05070d'),
    glow: flat('#ffe9a8'), stamp: flat('#c41e3a'), check: flat('#5fd38d'),
  };
  concept(B7, 4, 'Unsigned Parcel', {
    note: 'A shipping box that wants to leave but its wax signature seal is cracked, so the OS flags it; the last fight of a 14-day build is signing, notarizing and shipping, so the boss is the package itself.',
    w: 88, h: 88, rim: '#ffd28a',
    draw(g, f, a) {
      const hop = a ? [0, 3, -6, -1][a] : (f % 3 === 2 ? -1 : 0), sq = a === 1 ? 2 : 0;
      const X = 14, B = 80, Hd = 44 - sq + (a === 2 ? 2 : 0), T = B - Hd + hop, Wd = 56;
      // flaps: open like a crown, flapping
      const fl = a === 1 ? 2 : a === 2 ? -8 : S(f, 6, 2);
      g.part();
      g.poly([[X + 2, T + 2], [X + Wd / 2, T + 2], [X + Wd / 2 - 6, T - 14 - fl], [X - 6, T - 10 + fl]], UP.card);
      g.part();
      g.poly([[X + Wd / 2, T + 2], [X + Wd - 2, T + 2], [X + Wd + 6, T - 10 + fl], [X + Wd / 2 + 6, T - 14 - fl]], UP.card);
      // inner glow of the app inside
      g.part(); g.rect(X + 3, T - 2, Wd - 6, 6, UP.inside);
      g.rect(X + 18, T - 1, Wd - 36, 2, UP.glow);
      // box body
      g.part(); g.rect(X, T + 2, Wd, Hd - 2, UP.card);
      // tape strip
      g.part(); g.rect(X + Wd / 2 - 4, T + 2, 8, Hd - 2, UP.tape);
      // shipping label as the face
      g.part(); g.rect(X + 5, T + 8, 18, 12, UP.label);
      g.rect(X + 7, T + 10, 9, 1, UP.labelInk); g.rect(X + 7, T + 12, 12, 1, UP.labelInk);
      for (let i = 0; i < 12; i++) if (hash(i, 9) > 0.4) g.rect(X + 7 + i, T + 15, 1, 3, UP.labelInk);
      // eyes peeking from torn holes
      const ey = T + 13 + (a === 1 ? 1 : 0);
      g.part(); g.ell(X + 39, ey, 3, 2.5, UP.inside); g.ell(X + 49, ey, 3, 2.5, UP.inside);
      if (!(f === 3 && !a)) { g.rect(X + 39, ey - 1, 2, 2, UP.eye); g.rect(X + 49, ey - 1, 2, 2, UP.eye); }
      // wax seal mouth across the tape: cracked, unsigned
      const sy = T + 30 + (a === 2 ? 1 : 0);
      g.part(); g.ell(X + Wd / 2, sy, 8, 7, UP.wax);
      g.ell(X + Wd / 2 - 9, sy + 3, 2, 2, UP.wax); g.ell(X + Wd / 2 + 8, sy - 4, 2, 1, UP.wax);
      if (a === 2) { g.rect(X + Wd / 2 - 6, sy - 1, 12, 4, UP.inside); for (let x = -5; x <= 4; x += 3) g.px(X + Wd / 2 + x, sy - 1, UP.label); }
      else { g.line(X + Wd / 2 - 5, sy + 1, X + Wd / 2 - 1, sy - 2, UP.crack); g.line(X + Wd / 2 - 1, sy - 2, X + Wd / 2 + 2, sy + 2, UP.crack); g.line(X + Wd / 2 + 2, sy + 2, X + Wd / 2 + 5, sy - 1, UP.crack); }
      // a "!" stamp on the side: the untrusted developer warning
      g.part(); g.rect(X + 42, T + 24, 9, 12, UP.card);
      g.rectIf(X + 43, T + 25, 7, 10, UP.stamp, UP.card);
      g.rect(X + 46, T + 27, 1, 4, UP.label); g.px(X + 46, T + 33, UP.label);
      // stubby legs
      [X + 8, X + Wd - 16].forEach(lx => { g.part(); g.rect(lx, B + hop, 8, 4, UP.card); g.rect(lx - 1, B + hop + 3, 10, 3, UP.tape); });
      // packing-tape arm swinging a dispenser
      const aa = a === 1 ? -1.6 : a === 2 ? 0.5 : a === 3 ? 0.1 : -0.3 + S(f, 6, 1) * 0.1;
      const ax = X + Wd, ay = T + 20, hx = ax + Math.cos(aa) * 14, hy = ay + Math.sin(aa) * 14;
      g.part(); g.line(ax - 2, ay, hx, hy, UP.tape, 3);
      g.part(); g.ell(hx, hy, 4, 4, UP.wax); g.ell(hx, hy, 1, 1, UP.inside);
      g.part(); g.line(X, T + 20, X - 8, T + 34 + S(f, 6, 1), UP.tape, 3);
    },
  });

  // ---- Alt 5: Day-Pad Crawler. A tear-off desk calendar on crab legs, counting down 14 days.
  const DP = {
    shell: mat(['#0d1a33', '#1a3266', '#2a56a8', '#4da3ff', '#b6dcff'], { shiny: true }),
    page: mat(['#8c8578', '#cfc9bb', '#f1ece1', '#ffffff']),
    head: mat(['#4a0a14', '#8c1a28', '#d93a4a', '#ff7a86']),
    ring: mat(['#3a3a48', '#6f6f80', '#b0b0c0', '#e8e8f4'], { shiny: true }),
    leg: mat(['#1a1a24', '#2c2c3c', '#46465e', '#6a6a88']),
    num: flat('#1a1a24'), eye: flat('#ffd84d'), pupil: flat('#05070d'),
  };
  concept(B7, 5, 'Day-Pad Crawler', {
    note: 'A tear-off desk calendar scuttling on steel legs, its pad counting down from 14; every hit tears a day off, which is the two weeks of screenshot iteration as a health bar.',
    w: 96, h: 84, rim: '#ffd28a',
    draw(g, f, a) {
      const bob = a ? [0, 2, -3, 0][a] : (f % 2), X = 26, T = 14 + bob, Wd = 44;
      const day = a >= 2 ? '13' : '14';
      // legs (behind)
      for (let i = 0; i < 3; i++) {
        const st = S(f + i * 2, 6, 2);
        g.part();
        g.line(X + 4, T + 50, X - 8 - i * 4, T + 46 + i * 6 + st, DP.leg, 2); g.line(X - 8 - i * 4, T + 46 + i * 6 + st, X - 12 - i * 3, 82, DP.leg, 2);
        g.line(X + Wd - 4, T + 50, X + Wd + 8 + i * 4, T + 46 + i * 6 - st, DP.leg, 2); g.line(X + Wd + 8 + i * 4, T + 46 + i * 6 - st, X + Wd + 12 + i * 3, 82, DP.leg, 2);
      }
      // base shell
      g.part(); g.rrect(X - 4, T + 40, Wd + 8, 16, 4, DP.shell);
      // pad pages stacked
      g.part(); g.rect(X, T + 6, Wd, 40, DP.page);
      for (let i = 0; i < 4; i++) g.rect(X + 1, T + 44 - i, Wd - 2, 1, i % 2 ? DP.ring : 0);
      g.part(); g.rect(X, T + 6, Wd, 10, DP.head);
      // binder rings
      [X + 8, X + Wd - 10].forEach(rx => { g.part(); g.rect(rx, T + 2, 3, 7, DP.ring); });
      // big day number
      g.text2(day, X + 11, T + 20, DP.num);
      // eyes on stalks
      const ey = T - 4 + (a === 1 ? 2 : 0), look = a === 2 ? 1 : S(f, 6, 1);
      [X + 12, X + Wd - 12].forEach((sx, i) => {
        g.part(); g.line(sx, T + 6, sx + (i ? 2 : -2), ey + 3, DP.leg, 2);
        g.part(); g.ell(sx + (i ? 2 : -2), ey, 4, 4, DP.page);
        if (!(f === 4 && !a)) g.rect(sx + (i ? 2 : -2) + look, ey - 1, 2, 3, DP.pupil);
      });
      // torn page flying off on the strike
      if (a >= 2) {
        const fx = X + Wd + (a === 2 ? 4 : 14), fy = T + 8 + (a === 2 ? 0 : -8);
        g.part(); g.poly([[fx, fy], [fx + 16, fy + 4], [fx + 12, fy + 24], [fx - 3, fy + 20]], DP.page);
        g.part(); g.poly([[fx, fy], [fx + 16, fy + 4], [fx + 15, fy + 8], [fx - 1, fy + 4]], DP.head);
        g.text('14', fx + 2, fy + 10, DP.num);
      }
      // claws
      const ca = a === 1 ? -6 : a === 2 ? 6 : S(f, 6, 1);
      [[X - 2, -1], [X + Wd + 2, 1]].forEach(([cx0, s]) => {
        const cxp = cx0 + s * 12 + (a === 2 && s > 0 ? 8 : 0), cyp = T + 30 + ca * (s > 0 ? 1 : 0.4);
        g.part(); g.line(cx0, T + 34, cxp, cyp, DP.leg, 3);
        g.part(); g.ell(cxp + s * 3, cyp - 1, 5, 4, DP.shell);
        g.poly([[cxp + s * 4, cyp - 1], [cxp + s * 11, cyp - 3 - (a === 1 ? 3 : 1)], [cxp + s * 6, cyp + 1]], 0);
      });
    },
  });

  // =====================================================================
  // 8. DATA BLEED DOPPELGANGER
  // =====================================================================
  const B8 = 'Data Bleed Doppelganger';
  const blood = mat(['#3a0612', '#7a0f22', '#c41e3a', '#ff3d5a', '#ff9aa8'], { shiny: true });
  const bleedF = flat('#ff3d5a'), bleedD = flat('#a8102a');

  // ---- Alt 1: Matryoshka Clone. Four nesting dolls, all wearing ID #7.
  const MC = {
    lac: mat(['#05303a', '#0b5664', '#1a93a2', '#4dd8e0', '#c0f8fb'], { shiny: true }),
    face: mat(['#8a5a48', '#c89a80', '#f3d6c0', '#fff0e4']),
    scarf: mat(['#1a1240', '#2c2066', '#4a3a9a', '#7a6ad0']),
    eye: flat('#05070d'), cheek: flat('#ff8a9a'), id: flat('#fff4cf'), seam: flat('#063a44'),
  };
  concept(B8, 1, 'Matryoshka Clone', {
    note: 'Four nesting dolls that were cloned instead of carved, so every shell wears the same ID #7 and red seeps out of the seams between them; the strike pops the outer shell to throw an inner copy.',
    w: 100, h: 86, rim: '#4dd8e0',
    draw(g, f, a) {
      const doll = (cx, bot, s, i, lift) => {
        const H = Math.round(54 * s), W = Math.round(17 * s), T = bot - H - lift;
        g.part();
        g.ell(cx, bot - H * 0.32 - lift, W, H * 0.34, MC.lac);
        g.ell(cx, T + H * 0.3, W * 0.72, H * 0.3, MC.lac);
        // face disk
        g.part(); g.ell(cx, T + H * 0.3, W * 0.5, H * 0.21, MC.face);
        const ey = Math.round(T + H * 0.28), ex = Math.max(2, Math.round(W * 0.22));
        g.px(cx - ex, ey, MC.eye); g.px(cx + ex, ey, MC.eye);
        if (s > 0.7) { g.px(cx - ex, ey + 1, MC.eye); g.px(cx + ex, ey + 1, MC.eye); }
        g.px(cx - ex - 1, ey + 2, MC.cheek); g.px(cx + ex + 1, ey + 2, MC.cheek);
        g.px(cx, ey + Math.max(2, Math.round(H * 0.07)), bleedF);
        // the seam where it would twist open: leaks
        const sy = Math.round(bot - H * 0.55 - lift);
        for (let x = -W; x <= W; x++) g.pxIf(cx + x, sy, MC.seam);
        g.pxIf(cx - W + 2, sy + 1, bleedF); g.pxIf(cx - W + 2, sy + 2 + (f + i) % 3, bleedF);
        g.pxIf(cx + 2, sy + 1, bleedF); g.pxIf(cx + 2, sy + 2, bleedD);
        // painted flower on the shawl
        if (s > 0.55) { const fy2 = Math.round(T + H * 0.62); g.pxIf(cx - W + 4, fy2, MC.cheek); g.pxIf(cx - W + 3, fy2 + 1, MC.cheek); g.pxIf(cx - W + 5, fy2 + 1, MC.cheek); g.pxIf(cx - W + 4, fy2 + 2, MC.cheek); g.pxIf(cx - W + 4, fy2 + 1, MC.id); }
        // ID on the belly
        if (s > 0.6) g.micro('#7', cx - 3, Math.round(bot - H * 0.3 - lift), MC.id);
        else g.px(cx, Math.round(bot - H * 0.28 - lift), MC.id);
      };
      // bleed puddle joining them on the floor
      g.part();
      for (let x = 6; x < 94; x++) { const y = 83 + (Math.sin(x * 0.5 + f) > 0.6 ? 1 : 0); g.px(x, y, (x + f) % 7 < 4 ? bleedF : bleedD); g.px(x, 84, bleedD); }
      const lift = a === 1 ? 0 : a === 2 ? 0 : 0;
      const hop = i => (!a && (f + i * 2) % 6 < 2) ? 1 : 0;
      // smallest to largest, left to right, all identical
      doll(10, 84, 0.42, 3, hop(3));
      doll(27, 84, 0.6, 2, hop(2));
      doll(50, 84, 0.8, 1, hop(1));
      // the outer doll splits on the strike
      if (a === 2 || a === 3) {
        const gap = a === 2 ? 14 : 6, cx = 80, H = 55, W = 18, bot = 84;
        g.part(); g.ell(cx, bot - H * 0.32, W, H * 0.34, MC.lac);
        g.part(); g.ell(cx, bot - H * 0.75 - gap, W * 0.9, H * 0.3, MC.lac);
        g.part(); g.ell(cx, bot - H * 0.75 - gap, W * 0.5, H * 0.2, MC.face);
        g.px(cx - 3, bot - H * 0.78 - gap, MC.eye); g.px(cx + 3, bot - H * 0.78 - gap, MC.eye);
        // inner clone revealed, same face
        g.part(); g.ell(cx, bot - H * 0.55 - gap / 2, 6, 7, MC.lac);
        g.part(); g.ell(cx, bot - H * 0.58 - gap / 2, 3, 3, MC.face); g.px(cx - 1, bot - H * 0.6 - gap / 2, MC.eye); g.px(cx + 1, bot - H * 0.6 - gap / 2, MC.eye);
        for (let i = 0; i < 6; i++) g.px(cx - 12 + i * 5, bot - H * 0.55 - (i % 2) * 2 + (a === 2 ? -2 : 2), bleedF);
      } else doll(80, 84, a === 1 ? 0.97 : 1.02, 0, hop(0));
    },
  });

  // ---- Alt 2: Test-Tube Quartet. Four lab tubes, one culture creeping over every wall.
  const TT = {
    glass: mat(['#203a52', '#3a6a88', '#7ab8d6', '#c8ecff', '#ffffff'], { shiny: true }),
    rack: mat(['#1a1240', '#2a2058', '#3e3480', '#5e54b0', '#8a80d8']),
    liquid: blood,
    cap: mat(['#0b2f22', '#1a5a3e', '#2e9a62', '#5fd38d']),
    eye: flat('#05070d'), glint: flat('#ffffff'), label: flat('#e8eef7'), labelInk: flat('#1e3a66'),
  };
  concept(B8, 2, 'Test-Tube Quartet', {
    note: 'Four sample tubes in one rack, labelled as isolated environments, yet the same red culture with the same face climbs out of each and spills into its neighbours; isolation is a lab claim you have to verify.',
    w: 96, h: 90, rim: '#4dd8e0',
    draw(g, f, a) {
      const xs = [16, 36, 58, 78], bob = a ? [0, 1, -1, 0][a] : 0;
      xs.forEach((x, i) => {
        const T = 18 + (i % 2) * 2 + bob, H = 56, lv = T + 18 + S(f + i, 6, 2);
        // tube
        g.part(); g.rect(x - 7, T, 14, H - 6, TT.glass); g.ell(x, T + H - 7, 7, 6, TT.glass);
        // liquid
        g.part(); g.rect(x - 5, lv, 10, T + H - 6 - lv, TT.liquid); g.ell(x, T + H - 7, 5, 4, TT.liquid);
        // identical face in every liquid
        const fy = lv + 10 + (a === 1 ? 1 : 0);
        g.rect(x - 3, fy, 2, 2, TT.eye); g.rect(x + 1, fy, 2, 2, TT.eye); g.px(x - 3, fy, TT.glint); g.px(x + 1, fy, TT.glint);
        if (a === 2) g.rect(x - 2, fy + 4, 4, 3, TT.eye); else g.rect(x - 1, fy + 4, 3, 1, TT.eye);
        // bubbles
        g.px(x - 2 + (i % 2) * 3, lv + 4 + ((f * 2 + i * 3) % 12), TT.glint);
        // glass highlight stripe
        for (let y = T + 2; y < T + H - 12; y++) g.pxIf(x - 5, y, TT.glint, TT.glass);
        // label
        g.rect(x - 4, T + 6, 8, 5, TT.label); g.micro(String(i + 1), x - 1, T + 6, TT.labelInk);
        // cap
        g.part(); g.rrect(x - 8, T - 6, 16, 7, 2, TT.cap);
      });
      // overflow: culture climbs over the rims and drips into neighbours
      const sp = a === 2 ? 4 : a === 1 ? -1 : 0;
      g.part();
      for (let i = 0; i < 3; i++) {
        const x0 = xs[i] + 4, x1 = xs[i + 1] - 4, top = 10 + bob - sp + S(f + i, 6, 1);
        g.curve(x0, 17 + bob, (x0 + x1) / 2, top, x1, 17 + bob + (i % 2 ? -2 : 2), TT.liquid, 3, 3);
        const dx = Math.round((x0 + x1) / 2), dl = (f + i * 2) % 6;
        g.rect(dx, top + 2, 1, 2 + dl, bleedF); g.px(dx, top + 5 + dl + 1, bleedD);
      }
      if (a === 2) for (let i = 0; i < 4; i++) g.ell(xs[i] + 8, 4 + (i % 2) * 4, 2, 2, TT.liquid);
      // rack
      g.part(); g.rect(4, 58 + bob, 88, 6, TT.rack); g.rect(4, 84, 88, 5, TT.rack);
      g.rect(6, 64 + bob, 4, 20, TT.rack); g.rect(86, 64 + bob, 4, 20, TT.rack);
      for (let i = 0; i < 4; i++) g.px(xs[i] - 9, 60 + bob, TT.label);
    },
  });

  // ---- Alt 3: Split-Screen Laptop. Bold flat style: one laptop, four panes, one face.
  const SL = {
    body: mat(['#1a2236', '#2c3a58', '#46597e', '#8aa0c8', '#d6e2f6'], { shiny: true }),
    pane: [flat('#0d2a3a'), flat('#13304a'), flat('#0d2a3a'), flat('#13304a')],
    face: flat('#4dd8e0'), faceD: flat('#1a93a2'), key: flat('#2c3a58'), keyL: flat('#6f86ad'),
    bezel: flat('#05070d'), led: flat('#5fd38d'),
  };
  concept(B8, 3, 'Split-Screen Laptop', {
    note: 'A flat-colour, poster-style laptop whose screen is split into four isolated panes that all show the same grinning face, and red leaks across the pane borders; four stacks on one laptop, one bug.',
    w: 100, h: 84, rim: '#4dd8e0',
    draw(g, f, a) {
      const tilt = a === 1 ? -2 : a === 2 ? 3 : 0, bob = a ? 0 : S(f, 6, 1);
      const X = 14, T = 6 + bob, Wd = 72, Hd = 50;
      // lid
      g.part(); g.rrect(X - 2 + tilt, T - 2, Wd + 4, Hd + 4, 3, SL.body);
      g.rect(X + tilt, T, Wd, Hd, SL.bezel);
      const pw = (Wd - 6) / 2, ph = (Hd - 6) / 2;
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([c, r], i) => {
        const px0 = X + 2 + tilt + c * (pw + 2), py0 = T + 2 + r * (ph + 2);
        g.rect(px0, py0, pw, ph, SL.pane[i]);
        // same face, same expression, in every pane
        const cx = Math.round(px0 + pw / 2), cy = Math.round(py0 + ph / 2) - 1;
        const look = a === 2 ? 2 : S(f, 6, 1);
        if (!(f === 3 && !a)) { g.rect(cx - 7 + look, cy - 5, 4, 4, SL.face); g.rect(cx + 3 + look, cy - 5, 4, 4, SL.face); g.rect(cx - 6 + look, cy - 4, 2, 2, SL.bezel); g.rect(cx + 4 + look, cy - 4, 2, 2, SL.bezel); }
        else { g.rect(cx - 7, cy - 3, 4, 1, SL.face); g.rect(cx + 3, cy - 3, 4, 1, SL.face); }
        const mw = a === 2 ? 14 : 10;
        g.rect(cx - mw / 2, cy + 3, mw, a === 2 ? 4 : 2, SL.face);
        for (let k = 0; k < mw; k += 3) g.px(cx - mw / 2 + k, cy + 3, SL.pane[i]);
        g.micro('#7', px0 + 1, py0 + 1, SL.faceD);
      });
      // bleed across the pane dividers
      const vx = X + 2 + tilt + pw, hy = T + 2 + ph;
      for (let y = T + 1; y < T + Hd - 1; y++) if ((y + f * 2) % 5 < 3) g.px(vx + (y % 2), y, bleedF);
      for (let x = X + 1 + tilt; x < X + Wd - 1; x++) if ((x + f * 2) % 5 < 3) g.px(x, hy + (x % 2), bleedF);
      g.ell(vx + 0.5, hy + 0.5, 2 + (a === 2 ? 2 : 0), 2 + (a === 2 ? 2 : 0), bleedF);
      // drips running off the bezel
      for (let i = 0; i < 3; i++) { const dx = X + 12 + i * 24 + tilt, dl = (f + i * 2) % 6; g.rect(dx, T + Hd + 2, 1, 2 + dl, bleedF); }
      // base / keyboard
      g.part(); g.poly([[X - 6, T + Hd + 4], [X + Wd + 6, T + Hd + 4], [X + Wd + 12, T + Hd + 16], [X - 12, T + Hd + 16]], SL.body);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 13; k++) g.rect(X - 4 - r * 2 + k * 6 + r, T + Hd + 6 + r * 3, 4, 2, k % 4 === r ? SL.keyL : SL.key);
      g.rect(X + Wd / 2 - 8, T + Hd + 13, 16, 2, SL.key);
      g.px(X + Wd + 4, T + Hd + 6, f % 2 ? SL.led : SL.key);
      // red puddle the bleed collects in
      if (a >= 2) for (let x = X - 10; x < X + Wd + 10; x++) if (hash(x, 4) > 0.3) g.px(x, T + Hd + 17, bleedD);
    },
  });

  // ---- Alt 4: Mirror Doppel. One figure, three reflections, a shared red heart-vein.
  const MD = {
    cloak: mat(['#0a1630', '#14284e', '#22407a', '#3a64ac', '#7aa4e6']),
    mask: mat(['#6a7a90', '#a6b6cc', '#e0eaf6', '#ffffff'], { shiny: true }),
    ghost: mat(['#0b3a44', '#126270', '#1a93a2', '#4dd8e0']),
    glass: mat(['#06141e', '#0a2230', '#0f3344', '#1a4a5e']),
    echoMask: mat(['#126270', '#1a93a2', '#7ae0e6', '#c0f8fb']),
    eye: flat('#ff3d5a'), slit: flat('#05070d'), frame: gold,
  };
  concept(B8, 4, 'Mirror Doppel', {
    note: 'A masked figure stepping out of a mirror with three reflections behind it, all bound by one red vein to a single shared heart; four "separate" instances turn out to be one body with one database.',
    w: 104, h: 92, rim: '#4dd8e0',
    draw(g, f, a) {
      const echo = (dx, dy, m, lean) => {
        const cx = 60 + dx, T = 16 + dy;
        g.part();
        g.poly([[cx - 5, T + 15], [cx + 5, T + 15], [cx + 11 + lean, T + 70], [cx + 3 + lean, T + 66], [cx - 3 + lean, T + 71], [cx - 11 + lean, T + 66]], m);
        g.part(); g.ell(cx, T + 7, 7, 8, m);
        return { cx, T };
      };
      // mirror frame behind
      g.part(); g.rrect(6, 6, 46, 82, 20, MD.frame);
      g.part(); g.rrect(10, 10, 38, 74, 17, MD.glass);
      for (let y = 14; y < 80; y += 7) g.line(18, y + 4, 26, y - 4, flat('#4dd8e0'));
      // three reflections, offset like copies
      const sh = a === 1 ? -2 : a === 2 ? 6 : S(f, 6, 1);
      const echoes = [[-38, 3], [-26, 2], [-14, 1]].map(([dx, dy], i) => {
        const e = echo(dx + (i + 1) * sh * 0.4, dy, MD.ghost, -2 + i);
        g.part(); g.ell(e.cx, e.T + 7, 5, 6, MD.echoMask);
        g.rect(e.cx - 4, e.T + 6, 3, 2, MD.slit); g.rect(e.cx + 2, e.T + 6, 3, 2, MD.slit);
        g.px(e.cx - 3, e.T + 6, MD.eye); g.px(e.cx + 3, e.T + 6, MD.eye);
        return e;
      });
      // the real one
      const lean = a === 2 ? 4 : a === 1 ? -3 : 0;
      const me = echo(lean, a === 1 ? 2 : S(f, 6, 1, 0.5) > 0 ? 1 : 0, MD.cloak, lean);
      g.part(); g.ell(me.cx, me.T + 8, 7, 8, MD.mask);
      const ey = me.T + 7;
      g.rect(me.cx - 5, ey, 4, 2, MD.slit); g.rect(me.cx + 2, ey, 4, 2, MD.slit);
      g.px(me.cx - 4, ey, MD.eye); g.px(me.cx + 3, ey, MD.eye);
      g.micro('#7', me.cx - 3, me.T + 11, flat('#6a7a90'));
      // shared heart on the real chest, veins run to every echo
      const hb = (f % 3 === 0 || a === 2) ? 1 : 0, hx = me.cx, hy = me.T + 30;
      g.part();
      echoes.forEach((e, i) => {
        g.curve(hx, hy, (hx + e.cx) / 2, hy - 10 + i * 4, e.cx, e.T + 30, bleedF, 1, 1, (x, y, t, k) => { if ((k + f) % 4 === 0) g.px(x, y, bleedD); });
        g.ell(e.cx, e.T + 30, 2, 2, blood);
      });
      g.part(); g.ell(hx - 2, hy - 1, 2 + hb, 2 + hb, blood); g.ell(hx + 2, hy - 1, 2 + hb, 2 + hb, blood); g.poly([[hx - 4 - hb, hy], [hx + 4 + hb, hy], [hx, hy + 5 + hb]], blood);
      // reaching hand / claw
      const ax = me.cx + 10, ay = me.T + 24, ha = a === 1 ? -1.4 : a === 2 ? 0.1 : -0.2;
      const hx2 = ax + Math.cos(ha) * 18, hy2 = ay + Math.sin(ha) * 18;
      g.part(); g.line(ax, ay, hx2, hy2, MD.cloak, 4);
      g.part(); g.ell(hx2, hy2, 3, 3, MD.mask);
      for (let k = -1; k <= 1; k++) g.line(hx2 + 2, hy2 + k * 2, hx2 + 6, hy2 + k * 3, MD.mask);
    },
  });

  // ---- Alt 5: Bleed Jelly Colony. Four jellyfish bells, tentacles knotted together.
  const BJ = {
    bell: mat(['#0b2a5a', '#1a4a96', '#3a7ad6', '#7ab8ff', '#d6ecff'], { shiny: true }),
    inner: mat(['#3a0a2a', '#7a1a4a', '#c43a6a', '#ff7aa0']),
    tent: flat('#7ab8ff'), tentD: flat('#3a7ad6'), eye: flat('#05070d'), glint: flat('#ffffff'), num: flat('#d6ecff'),
  };
  concept(B8, 5, 'Bleed Jelly Colony', {
    note: 'A colony of four identical jellyfish meant to drift apart, but their tentacles are knotted together and red pulses down each one into the others; data bleeding across instances as a living organism.',
    w: 100, h: 92, rim: '#4dd8e0',
    draw(g, f, a) {
      const P = [[22, 18], [56, 10], [80, 30], [42, 40]];
      const pulse = i => a === 1 ? -2 : a === 2 ? 3 : S(f + i * 1.5, 6, 2);
      const knot = [50, 72 + (a === 2 ? 4 : 0)];
      // tentacles first, all running to one knot
      P.forEach(([x, y], i) => {
        const pl = pulse(i), by = y + 3;
        for (const k of [-1, 1]) {
          g.part();
          const sx = x + k * 4, sw = S(f + k + i, 6, 3);
          g.curve(sx, by, (sx + knot[0]) / 2 + sw, (by + knot[1]) / 2 + 6, knot[0] + k * 2, knot[1], k ? BJ.tent : BJ.tentD, 1, 1, (px, py, t, n) => {
            if ((n + f * 2 + i) % 9 < 2) { g.px(px, py, bleedF); g.px(px + 1, py, bleedF); }
          });
        }
      });
      // trailing ends below the knot
      for (let k = -2; k <= 2; k++) { g.part(); g.curve(knot[0] + k * 2, knot[1], knot[0] + k * 6 + S(f + k, 6, 3), knot[1] + 10, knot[0] + k * 8, 90, k % 2 ? BJ.tentD : BJ.tent, 1, 1); }
      g.part(); g.ell(knot[0], knot[1], 4, 3, blood);
      // bells
      P.forEach(([x, y], i) => {
        const pl = pulse(i), rx = 13 + (pl > 0 ? -1 : 1), ry = 11 + pl;
        g.part();
        for (let dy = -ry; dy <= 2; dy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (Math.min(dy, 0) / (ry + 0.5)) ** 2))); g.rect(x - hw, y + dy, hw * 2 + 1, 1, BJ.bell); }
        // scalloped skirt
        for (let s = -rx + 2; s <= rx - 2; s += 4) g.px(x + s, y + 2, BJ.bell);
        g.part(); g.ell(x, y - 2, rx - 7, Math.max(2, ry - 6), BJ.inner);
        // same face on every bell
        const fy = y - 3;
        g.px(x - 3, fy, BJ.eye); g.px(x + 3, fy, BJ.eye); g.px(x - 3, fy + 1, BJ.eye); g.px(x + 3, fy + 1, BJ.eye);
        g.px(x - 4, fy - 1, BJ.glint);
        if (a === 2) g.rect(x - 1, fy + 3, 3, 2, BJ.eye); else g.px(x, fy + 3, BJ.eye);
        g.micro('#7', x - 3, y - rx + 3 + (ry < 9 ? 1 : 0), BJ.num);
      });
    },
  });

  // =====================================================================
  // 9. PIXEL MIMIC
  // =====================================================================
  const B9 = 'Pixel Mimic';
  const magenta = flat('#ff7ad9'), cyanF = flat('#4dd8e0'), yellowF = flat('#ffe14d');

  // ---- Alt 1: Registration Chameleon. A chameleon with misaligned colour channels.
  const RC = {
    skin: mat(['#0b3a2a', '#14664a', '#22a070', '#5fd38d', '#c8ffd8'], { shiny: true }),
    crest: mat(['#3a1040', '#6a1a70', '#b03ab0', '#ff7ad9']),
    branch: mat(['#1a0e06', '#3a2210', '#6a4220', '#9a6a3a']),
    eyeball: mat(['#4a5a6a', '#8a9aaa', '#d0dce6', '#ffffff'], { shiny: true }),
    pupil: flat('#05070d'), tongue: mat(['#5a0a2a', '#a01a4a', '#e0457a', '#ff8ab0']), stripe: flat('#14664a'),
  };
  concept(B9, 1, 'Registration Chameleon', {
    note: 'A chameleon that can copy any background but never lines up: its magenta and cyan colour plates sit a few pixels off its body, and closing that offset is the whole fight, the branch matching staging pixel for pixel.',
    w: 100, h: 84, rim: '#ff7ad9',
    post: (c, f, a) => {
      // print-registration ghosts behind the body: magenta and cyan plates off by a few pixels
      const off = a === 2 ? 5 : a === 1 ? 1 : 3 + S(f, 6, 1);
      const x = c.getContext('2d'), tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height;
      const t = tmp.getContext('2d');
      const plate = (col, dx, dy) => {
        t.clearRect(0, 0, tmp.width, tmp.height); t.drawImage(c, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = col; t.fillRect(0, 0, tmp.width, tmp.height); t.globalCompositeOperation = 'source-over';
        return [tmp, dx, dy];
      };
      const out = document.createElement('canvas'); out.width = c.width; out.height = c.height; const o = out.getContext('2d');
      [['#ff7ad9', -off, -1], ['#4dd8e0', off, 1]].forEach(([col, dx, dy]) => { const [cv] = plate(col, dx, dy); o.globalAlpha = 1; o.drawImage(cv, dx, dy); });
      // punch a 1px scanline pattern into the plates so they read as ghosts, not solids
      o.globalCompositeOperation = 'destination-out';
      for (let y = 0; y < out.height; y += 2) o.fillRect(0, y, out.width, 1);
      o.globalCompositeOperation = 'source-over';
      o.drawImage(c, 0, 0);
      x.clearRect(0, 0, c.width, c.height); x.drawImage(out, 0, 0);
    },
    draw(g, f, a) {
      const bob = a ? [0, 2, -1, 0][a] : S(f, 6, 1);
      // branch
      g.part(); g.line(4, 74, 96, 70, RC.branch, 5); g.line(80, 70, 92, 60, RC.branch, 2);
      // tail curl
      g.part();
      g.curve(30, 60 + bob, 12, 62, 12, 74, RC.skin, 7, 4);
      g.curve(12, 74, 14, 84, 22, 80, RC.skin, 4, 3);
      g.ell(19, 78, 2, 2, 0);
      // legs gripping
      [[34, 1], [62, -1]].forEach(([lx]) => { g.part(); g.line(lx, 62 + bob, lx - 2, 72, RC.skin, 4); g.rect(lx - 6, 70, 9, 3, RC.skin); });
      // body
      g.part(); g.ell(48, 54 + bob, 22, 13, RC.skin);
      // dorsal crest
      for (let i = 0; i < 6; i++) { g.part(); g.poly([[32 + i * 6, 44 + bob - (i < 3 ? i : 5 - i)], [38 + i * 6, 44 + bob - (i < 3 ? i : 5 - i)], [35 + i * 6, 38 + bob - (i < 3 ? i : 5 - i)]], RC.crest); }
      // stripes
      [38, 46, 54].forEach(x => { for (let y = -8; y <= 8; y++) g.pxIf(x + Math.round(y * 0.3), 54 + bob + y, RC.stripe, RC.skin); });
      // head with casque
      const hx = 72, hy = 46 + bob + (a === 1 ? -2 : 0);
      g.part(); g.poly([[hx - 8, hy - 6], [hx + 4, hy - 14], [hx + 14, hy - 2], [hx + 16, hy + 6], [hx - 6, hy + 10]], RC.skin);
      g.part(); g.poly([[hx - 6, hy - 6], [hx + 4, hy - 14], [hx + 2, hy - 6]], RC.crest);
      // turret eye, rolling
      const look = a ? 2 : [0, 1, 1, 0, -1, -1][f % 6];
      g.part(); g.ell(hx + 4, hy, 5, 5, RC.skin);
      g.part(); g.ell(hx + 4, hy, 3, 3, RC.eyeball); g.rect(hx + 4 + look, hy - 1, 2, 2, RC.pupil);
      // mouth line and tongue shot
      g.line(hx + 6, hy + 6, hx + 15, hy + 4, RC.stripe);
      if (a === 2) {
        g.part(); g.line(hx + 15, hy + 4, hx + 26, hy - 2, RC.tongue, 2);
        g.part(); g.ell(hx + 27, hy - 3, 3, 3, RC.tongue);
      } else if (a === 3) { g.part(); g.line(hx + 15, hy + 4, hx + 20, hy + 2, RC.tongue, 2); }
    },
  });

  // ---- Alt 2: Diff Mask. A Janus mask, one half staging, the other half the branch.
  const DM = {
    left: mat(['#2a3a5a', '#5a6e96', '#a6b6d6', '#e8eef7', '#ffffff'], { shiny: true }),
    right: mat(['#4a2a5a', '#7a4a96', '#c08ad6', '#f0d0ff', '#ffffff'], { shiny: true }),
    hood: mat(['#0a0e1a', '#121a30', '#1e2a4a', '#2c3e66']),
    add: flat('#5fd38d'), del: flat('#ff5d6c'), seam: flat('#05070d'), eyeL: flat('#4da3ff'), eyeR: flat('#ff7ad9'),
  };
  concept(B9, 2, 'Diff Mask', {
    note: 'A floating two-faced mask split down a diff seam: the left half is staging, the right half is your branch, two pixels lower with a heavier brow and the wrong hover colour, and green and red diff marks stitch them together.',
    w: 86, h: 92, rim: '#ff7ad9',
    draw(g, f, a) {
      const bob = a ? [0, -2, 2, 1][a] : S(f, 6, 1.5), cx = 43, T = 12 + bob;
      const off = a === 2 ? 4 : a === 1 ? 1 : 2; // the drift between halves
      // hood/backdrop cloak with tatters
      g.part();
      g.poly([[cx - 22, T + 10], [cx + 22, T + 10], [cx + 30, T + 66], [cx + 18, T + 60], [cx + 10, T + 76], [cx, T + 66], [cx - 10, T + 78], [cx - 18, T + 62], [cx - 30, T + 70]], DM.hood);
      for (let i = 0; i < 5; i++) { const sx = cx - 24 + i * 12, l = 6 + S(f + i, 6, 2); g.line(sx, T + 64, sx + 1, T + 64 + l, DM.hood, 2); }
      // left half (staging)
      g.part();
      g.poly([[cx, T], [cx - 14, T + 4], [cx - 20, T + 18], [cx - 18, T + 34], [cx - 10, T + 46], [cx, T + 50]], DM.left);
      // right half (branch), shifted down by `off`
      g.part();
      g.poly([[cx + 1, T + off], [cx + 15, T + 4 + off], [cx + 21, T + 18 + off], [cx + 19, T + 34 + off], [cx + 11, T + 46 + off], [cx + 1, T + 50 + off]], DM.right);
      // eyes: same shape, different weight and colour
      const blink = !a && f === 3;
      g.poly([[cx - 15, T + 18], [cx - 5, T + 17], [cx - 5, T + 21], [cx - 14, T + 21]], DM.seam);
      if (!blink) g.rect(cx - 10, T + 18, 3, 2, DM.eyeL);
      g.poly([[cx + 5, T + 17 + off], [cx + 16, T + 18 + off], [cx + 15, T + 22 + off], [cx + 5, T + 22 + off]], DM.seam);
      if (!blink) g.rect(cx + 7, T + 18 + off, 4, 3, DM.eyeR);
      // brows: thin vs bold (font weight 400 vs 700)
      g.line(cx - 15, T + 14, cx - 5, T + 13, DM.seam);
      g.rect(cx + 5, T + 12 + off, 11, 2, DM.seam);
      // mouth
      const mo = a === 2 ? 3 : 0;
      g.rect(cx - 9, T + 36, 9, 2 + mo, DM.seam); g.rect(cx + 1, T + 36 + off, 10, 2 + mo, DM.seam);
      // diff seam: + and - marks stitched down the middle
      for (let i = 0; i < 6; i++) {
        const y = T + 4 + i * 8;
        if (i % 2) { g.rect(cx - 2, y + 1, 5, 1, DM.del); }
        else { g.rect(cx - 2, y + 1, 5, 1, DM.add); g.rect(cx, y - 1, 1, 5, DM.add); }
      }
      // floating diff gutter markers orbiting
      const orb = [[-30, 10], [28, 26], [-26, 44]];
      orb.forEach(([dx, dy], i) => {
        const yy = T + dy + S(f + i * 2, 6, 2), xx = cx + dx + (a === 2 ? Math.sign(dx) * 4 : 0);
        g.part(); g.rect(xx - 3, yy - 3, 7, 7, i === 1 ? DM.right : DM.left);
        if (i === 1) g.rect(xx - 2, yy, 5, 1, DM.del); else { g.rect(xx - 2, yy, 5, 1, DM.add); g.rect(xx, yy - 2, 1, 5, DM.add); }
      });
    },
  });

  // ---- Alt 3: Swatch Golem. A golem built of colour chips and font specimen blocks.
  const SG = {
    stone: mat(['#1a1a2a', '#2c2c44', '#46466a', '#6a6a96', '#a0a0c8']),
    chipA: mat(['#0c2a5a', '#1e5aa8', '#4da3ff', '#a6d2ff']),
    chipB: mat(['#5a1a50', '#a03a90', '#ff7ad9', '#ffc4ee']),
    chipC: mat(['#3d2a0c', '#7d5c22', '#d9b45b', '#f6dd94']),
    chipD: mat(['#0b3a2a', '#1a6a4a', '#5fd38d', '#b8f0cc']),
    card: mat(['#9a9488', '#cfc9bb', '#f1ece1', '#ffffff']),
    ink: flat('#1a1a2a'), core: flat('#ff7ad9'), coreHot: flat('#ffd6f3'),
  };
  concept(B9, 3, 'Swatch Golem', {
    note: 'A golem stacked from colour swatches and type specimen cards, two "Aa" blocks for fists, one regular and one bold; it is the diff queue made physical, down to font weights and hover colours.',
    w: 96, h: 94, rim: '#ff7ad9',
    draw(g, f, a) {
      const bob = a ? [0, 2, -2, 1][a] : (f % 3 === 1 ? 1 : 0), cx = 48, T = 8 + bob;
      // legs: stacked swatch chips
      [[cx - 16, [SG.chipA, SG.chipC, SG.chipB]], [cx + 6, [SG.chipD, SG.chipB, SG.chipA]]].forEach(([lx, chips]) => {
        chips.forEach((m, i) => { g.part(); g.rect(lx + (i % 2), 66 + i * 9, 11, 9, m); });
      });
      // torso: a big stone frame with a swatch grid
      g.part(); g.rrect(cx - 22, T + 22, 44, 38, 4, SG.stone);
      const chips = [SG.chipA, SG.chipB, SG.chipC, SG.chipD];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        // one chip is off by a shade: the hover colour bug; it flickers
        const m = chips[(r + c) % 4];
        g.part(); g.rect(cx - 18 + c * 9, T + 26 + r * 10, 8, 8, m);
        if (r === 1 && c === 2 && f % 2) g.rectIf(cx - 18 + c * 9 + 1, T + 26 + r * 10 + 1, 6, 6, SG.coreHot, m);
      }
      // head: specimen card with an eye slot
      g.part(); g.rrect(cx - 12, T, 24, 20, 3, SG.card);
      const ey = T + 8 + (a === 1 ? 1 : 0);
      g.rect(cx - 8, ey, 16, 4, SG.ink);
      const scan = a ? 0 : [0, 3, 6, 9, 6, 3][f % 6];
      g.rect(cx - 7 + scan, ey + 1, 4, 2, a === 2 ? SG.coreHot : SG.core);
      // shoulder chips
      g.part(); g.rect(cx - 30, T + 20, 10, 10, SG.chipB); g.part(); g.rect(cx + 20, T + 20, 10, 10, SG.chipA);
      // arms: "Aa" blocks, regular left, bold right
      const ra = a === 1 ? -14 : a === 2 ? 10 : 0, la = S(f, 6, 1);
      g.part(); g.line(cx - 26, T + 30, cx - 30, T + 48 + la, SG.stone, 4);
      g.part(); g.rect(cx - 40, T + 46 + la, 18, 16, SG.card);
      g.text('A', cx - 36, T + 47 + la, SG.ink); g.micro('a', cx - 30, T + 49 + la, SG.ink); g.micro('400', cx - 37, T + 55 + la, SG.ink);
      g.part(); g.line(cx + 26, T + 30, cx + 32 + (a === 2 ? 6 : 0), T + 46 + ra, SG.stone, 4);
      const fx = cx + 22 + (a === 2 ? 8 : 0), fy = T + 44 + ra;
      g.part(); g.rect(fx, fy, 20, 18, SG.card);
      // bold Aa: draw the micro text twice for weight
      g.text('A', fx + 3, fy + 3, SG.ink); g.text('A', fx + 4, fy + 3, SG.ink); g.micro('a', fx + 10, fy + 5, SG.ink); g.micro('a', fx + 11, fy + 5, SG.ink);
      g.micro('700', fx + 4, fy + 12, SG.ink);
    },
  });

  // ---- Alt 4: Pinned Specimen. A moth pinned in a parity case, one wing out of spec.
  const PS = {
    wing: mat(['#2a0e3a', '#5a1a70', '#9a3ab0', '#d07ae6', '#ffd0ff'], { shiny: true }),
    wing2: mat(['#0c1a3a', '#1a3a70', '#3a6ab0', '#7aa8e6', '#d0e6ff'], { shiny: true }),
    body: mat(['#1a1206', '#3a2810', '#6a4a20', '#9a7040']),
    pin: steel, head: gold, eyespot: flat('#ffd84d'), spot: flat('#05070d'),
    label: flat('#f1ece1'), labelInk: flat('#2a2433'), grid: flat('#1e3a66'), hot: flat('#ff7ad9'),
  };
  concept(B9, 4, 'Pinned Specimen', {
    note: 'A moth pinned to a measuring board like a component story: its left wing matches the spec exactly, its right wing is a near copy off by a few pixels, and the pins tear free when it attacks; Storybook parity stories pinning every component.',
    w: 104, h: 86, rim: '#ff7ad9',
    draw(g, f, a) {
      const flap = a === 1 ? -3 : a === 2 ? 5 : S(f, 6, 1), cx = 52, cy = 40 + (a === 2 ? -3 : 0);
      // measuring grid behind
      for (let x = 8; x <= 96; x += 8) for (let y = 4; y <= 76; y += 2) g.px(x, y, PS.grid);
      for (let y = 4; y <= 76; y += 8) for (let x = 8; x <= 96; x += 2) g.px(x, y, PS.grid);
      // left wing: exact
      const wing = (s, m, dy, dw) => {
        g.part();
        g.poly([[cx - s * 3, cy - 6], [cx - s * (34 + dw), cy - 24 - flap + dy], [cx - s * (40 + dw), cy - 6 + dy], [cx - s * 24, cy + 4 + dy], [cx - s * 3, cy + 2]], m);
        g.part();
        g.poly([[cx - s * 3, cy + 2], [cx - s * 22, cy + 6 + dy], [cx - s * (28 + dw), cy + 22 + flap + dy], [cx - s * 12, cy + 26 + dy], [cx - s * 3, cy + 10]], m);
        // eyespot
        g.ell(cx - s * (22 + dw / 2), cy - 10 + dy - (flap > 0 ? 1 : 0), 4, 4, PS.eyespot);
        g.ell(cx - s * (22 + dw / 2), cy - 10 + dy - (flap > 0 ? 1 : 0), 2, 2, PS.spot);
        g.ell(cx - s * 16, cy + 16 + dy, 2, 2, PS.eyespot);
      };
      wing(1, PS.wing, 0, 0);
      // right wing: slightly off (2px lower, 2px wider, the wrong blue)
      const drift = a === 2 ? 4 : 2;
      wing(-1, PS.wing2, drift, 2);
      // body
      g.part(); g.ell(cx, cy + 4, 3, 14, PS.body);
      for (let y = cy + 4; y < cy + 18; y += 3) g.pxIf(cx, y, PS.spot, PS.body);
      g.part(); g.ell(cx, cy - 10, 4, 4, PS.head);
      g.px(cx - 2, cy - 10, PS.spot); g.px(cx + 2, cy - 10 + 1, PS.spot);
      // antennae, one drawn one weight heavier
      g.line(cx - 1, cy - 13, cx - 10, cy - 24, PS.body); g.line(cx + 1, cy - 13, cx + 10, cy - 23 + 1, PS.body, 2);
      // pins: through each wing tip; in the strike they pop out
      const pins = [[cx - 30, cy - 16], [cx + 30, cy - 14 + drift], [cx - 20, cy + 20], [cx + 20, cy + 22 + drift]];
      pins.forEach(([x, y], i) => {
        const popped = a === 2 || (a === 3 && i % 2);
        const py = popped ? y - 8 - i : y;
        g.part(); g.line(x, py, x + (popped ? 3 : 1), py + 8, PS.pin);
        g.part(); g.ell(x, py - 1, 1.5, 1.5, i % 2 ? red : PS.hot);
      });
      // specimen label
      g.part(); g.rect(cx - 16, 72, 32, 9, PS.label);
      g.micro(a === 2 ? '+4' : '+2', cx - 12, 74, PS.labelInk); g.rect(cx, 76, 12, 1, PS.labelInk);
    },
  });

  // ---- Alt 5: Redline Loupe. Bold style: an annotated-screenshot eye in red marker.
  const RL = {
    rim: mat(['#1a1a24', '#33333d', '#5a5a68', '#9a9aa8', '#e8e8f4'], { shiny: true }),
    lens: mat(['#0c1a3a', '#143064', '#1e4a96', '#4d8ae6']),
    handle: mat(['#2a0e06', '#5a2010', '#9a3a1a', '#d06a3a']),
    marker: flat('#ff3d5a'), markerD: flat('#c41e3a'), pix: [flat('#4da3ff'), flat('#ff7ad9'), flat('#d9b45b'), flat('#e8eef7')],
    pupil: flat('#05070d'), note: flat('#ffe14d'), noteInk: flat('#2a2433'), lid: flat('#ff7ad9'),
  };
  concept(B9, 5, 'Redline Loupe', {
    note: 'A giant magnifying loupe whose lens is an eye made of oversized pixels, scrawled over with red reviewer circles and arrows and a sticky note; annotated screenshots are how the agent was driven to close the diff.',
    w: 100, h: 92, rim: '#ff7ad9',
    draw(g, f, a) {
      const bob = a ? [0, -2, 3, 1][a] : S(f, 6, 1.5), cx = 46, cy = 38 + bob, R = 28;
      const tilt = a === 1 ? -3 : a === 2 ? 4 : 0;
      // handle
      g.part(); g.line(cx + 18, cy + 20, cx + 38 + tilt, cy + 46 - tilt, RL.handle, 8);
      g.part(); g.rect(cx + 16, cy + 17, 7, 6, RL.rim);
      // rim + lens
      g.part(); g.ell(cx, cy, R, R, RL.rim);
      g.part(); g.ell(cx, cy, R - 4, R - 4, RL.lens);
      // magnified pixels forming an eye: 4px cells
      const look = a === 2 ? 1 : [0, 0, 1, 0, -1, 0][f % 6], blink = !a && f === 3;
      const CS = 5;
      for (let r = -3; r <= 3; r++) for (let c = -4; c <= 4; c++) {
        const x = cx + c * CS - 2, y = cy + r * CS - 2;
        const e = (c / 4.6) ** 2 + (r / 2.4) ** 2;
        let m = 0;
        if (blink) { if (r === 0 && Math.abs(c) <= 4) m = RL.pix[3]; }
        else if (e <= 1) {
          const dc = c - look, d2 = dc * dc + r * r;
          m = d2 <= 1 ? RL.pupil : d2 <= 2 ? RL.pix[1] : d2 <= 4 ? RL.pix[0] : RL.pix[3];
          if (dc === -1 && r === -1) m = RL.pix[3];
        } else if (r === -3 && Math.abs(c) <= 2) m = RL.lid;
        if (m) { g.rect(x, y, CS, CS, m); g.rect(x + CS - 1, y, 1, CS, RL.lens); g.rect(x, y + CS - 1, CS, 1, RL.lens); }
      }
      // glare
      g.line(cx - 16, cy - 12, cx - 10, cy - 18, RL.pix[3]); g.px(cx - 17, cy - 9, RL.pix[3]);
      // red reviewer markup: a lumpy circle and an arrow
      const mk = a === 1 ? 0 : a === 2 ? 3 : (f % 2);
      for (let i = 0; i < 48; i++) {
        const an = i / 48 * TAU, rr = 9 + Math.sin(an * 3 + f) * 1;
        if (i < 44) g.px(cx + 12 + Math.cos(an) * (rr + mk), cy - 14 + Math.sin(an) * (rr * 0.7 + mk), RL.marker);
      }
      g.line(cx - 36, cy + 26, cx - 18, cy + 12, RL.marker, 2); g.line(cx - 18, cy + 12, cx - 23, cy + 12, RL.marker, 2); g.line(cx - 18, cy + 12, cx - 18, cy + 17, RL.marker, 2);
      // sticky note with "2px"
      const nx = 4, ny = 4 + bob + S(f, 6, 1, 0.3);
      g.part(); g.rect(nx, ny, 18, 16, RL.note);
      g.micro('+2', nx + 3, ny + 3, RL.noteInk); g.rect(nx + 3, ny + 10, 12, 1, RL.noteInk); g.rect(nx + 3, ny + 12, 8, 1, RL.noteInk);
      // the strike: a laser of red marker from the lens
      if (a === 2) { g.part(); for (let i = 0; i < 26; i++) g.px(cx - R - i, cy + 6 + (i % 3 ? 0 : 1), i % 2 ? RL.marker : RL.markerD); g.line(cx - R - 26, cy + 4, cx - R - 26, cy + 10, RL.marker, 2); }
    },
  });

  // =====================================================================
  // build frames and register
  // =====================================================================
  const IDLE_N = 6;
  const frame = (C, f, a) => {
    const g = new Grid(C.w, C.h);
    C.draw(g, f, a);
    const c = render(g, { rim: C.rim });
    if (C.post) C.post(c, f, a);
    return c;
  };
  const SS = window.SpriteSheet;
  CONCEPTS.forEach(C => {
    const grp = `Boss alts (Claude) · ${C.boss}`, base = `Alt ${C.n} · ${C.name}`;
    SS.add(grp, `${base} · idle`, Array.from({ length: IDLE_N }, (_, f) => frame(C, f, 0)), { fps: 6, note: C.note });
    SS.add(grp, `${base} · attack`, [1, 2, 3].map(a => frame(C, 0, a)), { fps: 4, note: C.note });
  });
})();
