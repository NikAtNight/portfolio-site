// PROTOTYPE Raid Log sprites. Throwaway. Original pixel art, drawn in code:
// shapes go into a material grid, then one pass adds hue-shifted directional
// shading, contact shadows, a selective outline and an arena rim light.
// No portfolio DOM needed: sprites.html loads this file on its own.
window.SpriteSheet = window.SpriteSheet || { groups: [], add(group, name, frames, opts = {}) {
  let g = this.groups.find(x => x.name === group); if (!g) this.groups.push(g = { name: group, items: [] });
  const i = g.items.findIndex(x => x.name === name), item = { name, frames, fps: opts.fps || 6, note: opts.note || '' };
  i >= 0 ? (g.items[i] = item) : g.items.push(item);
} };
(() => {
  // =====================================================================
  // palette + sprite grid
  // =====================================================================
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const OUT = rgb('#05070d');
  const MATS = [null];
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  // hue shift: shadows lean cool violet, highlights lean warm, so ramps read
  // like painted pixel art instead of one hue going darker
  const COOL = rgb('#24164f'), WARM = rgb('#fff0c0');
  const shift = (tones, n) => tones.map((c, i) => {
    if (n < 3) return c;
    const k = i / (n - 1);
    if (k < 0.5) return mix(c, COOL, (0.5 - k) * 0.55);
    if (k > 0.6) return mix(c, WARM, (k - 0.6) * 0.32);
    return c;
  });
  // tones: [deep shadow, shadow, base, light, (specular)]
  const mat = (tones, o = {}) => { const t = tones.map(rgb); MATS.push({ tones: o.flat || o.raw ? t : shift(t, t.length), flat: !!o.flat, shiny: !!o.shiny }); return MATS.length - 1; };
  const flat = c => mat([c], { flat: true });

  const FONT = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
    4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
    8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    '+': [0, 4, 4, 31, 4, 4, 0], '-': [0, 0, 0, 31, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4], '%': [24, 25, 2, 4, 8, 19, 3],
    ',': [0, 0, 0, 0, 0, 4, 8], '.': [0, 0, 0, 0, 0, 0, 4], ':': [0, 4, 0, 0, 0, 4, 0], '/': [1, 1, 2, 4, 8, 16, 16],
    '?': [14, 17, 1, 2, 4, 0, 4], '#': [10, 31, 10, 10, 31, 10, 0], '$': [4, 15, 20, 14, 5, 30, 4], '*': [0, 21, 14, 31, 14, 21, 0],
    '^': [0, 0, 1, 2, 20, 8, 0], // used as a check mark
    ' ': [0, 0, 0, 0, 0, 0, 0],
  };

  // A sprite grid. `k` rasterizes the same design larger: shapes are redrawn
  // at the bigger size (not upscaled), so outlines stay 1px and shading has
  // room. Fine details (eyes, text) stay single-pixel crisp.
  class Grid {
    constructor(w, h, k = 1) { this.k = k; this.w = Math.round(w * k); this.h = Math.round(h * k); this.m = new Uint8Array(this.w * this.h); this.p = new Uint8Array(this.w * this.h); this.pc = 0; }
    part() { this.pc = Math.min(255, this.pc + 1); return this; }
    at(x, y) { x = Math.round(x * this.k); y = Math.round(y * this.k); return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.m[y * this.w + x]; }
    raw(x, y, m) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x; this.m[i] = m; this.p[i] = m ? this.pc : 0;
    }
    px(x, y, m) { const k = this.k, n = Math.max(1, Math.round(k)), X = Math.round(x * k), Y = Math.round(y * k); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) this.raw(X + i, Y + j, m); }
    rect(x, y, w, h, m) { const k = this.k, X = Math.round(x * k), Y = Math.round(y * k), Wd = Math.round(w * k), Hd = Math.round(h * k); for (let j = 0; j < Hd; j++) for (let i = 0; i < Wd; i++) this.raw(X + i, Y + j, m); }
    ell(cx, cy, rx, ry, m) {
      const k = this.k; cx *= k; cy *= k; rx = (rx + 0.5) * k - 0.5; ry = (ry + 0.5) * k - 0.5;
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5);
          if (dx * dx + dy * dy <= 1) this.raw(x, y, m);
        }
    }
    rrect(x, y, w, h, r, m) {
      const k = this.k; x = Math.round(x * k); y = Math.round(y * k); w = Math.round(w * k); h = Math.round(h * k); r = Math.round(r * k);
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
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * this.k));
      for (let i = 0; i <= n; i++) this.dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, th, m);
    }
    poly(pts, m) {
      const k = this.k; pts = pts.map(([x, y]) => [x * k, y * k]);
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
    curve(x0, y0, cx, cy, x1, y1, m, t0, t1, each) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5 * this.k) + 4;
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        const th = t0 + (t1 - t0) * t;
        this.ell(x, y, (th - 1) / 2, (th - 1) / 2, m);
        if (each) {
          const tx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * u * (cy - y0) + 2 * t * (y1 - cy), l = Math.hypot(tx, ty) || 1;
          each(x, y, tx / l, ty / l, th, i);
        }
      }
    }
    // fill an ellipse only over pixels that already hold `only` (clipped decals like a belly)
    ellIf(cx, cy, rx, ry, m, only) {
      const k = this.k; cx *= k; cy *= k; rx = (rx + 0.5) * k - 0.5; ry = (ry + 0.5) * k - 0.5;
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5);
          if (dx * dx + dy * dy <= 1 && x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === only) this.m[y * this.w + x] = m;
        }
    }
    // text stays 1:1 so it is always legible
    text(s, x, y, m) {
      const X = Math.round(x * this.k), Y = Math.round(y * this.k);
      [...s].forEach((ch, i) => (FONT[ch] || FONT[' ']).forEach((row, r) => { for (let c = 0; c < 5; c++) if (row >> (4 - c) & 1) this.raw(X + i * 6 + c, Y + r, m); }));
    }
  }

  // one shading pass: light from the top left, contact shadow where a later part overlaps
  // o.rim: arena key light, painted as a 1px rim on the boss's right edge
  const render = (g, o = {}) => {
    const { w, h, m, p } = g, W2 = w + 2, H2 = h + 2;
    const rim = o.rim ? rgb(o.rim) : null;
    const c = document.createElement('canvas'); c.width = W2; c.height = H2;
    const cx = c.getContext('2d'), img = cx.createImageData(W2, H2), d = img.data;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : m[y * w + x];
    const isFlat = id => id && MATS[id].flat;
    // flat decals do not break the shading of what is under them
    const same = (x, y, id, pt) => { const o = at(x, y); if (!o) return false; if (isFlat(o)) return true; return o === id && p[y * w + x] === pt; };
    // bounding box per part+material, for a soft top-left to bottom-right form gradient
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
            const o = at(x + dx, y + dy);
            if (o && !isFlat(o) && (o !== id || p[(y + dy) * w + x + dx] !== pt) && p[(y + dy) * w + x + dx] > pt) contact = true;
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
              // clean form bands, no checker noise
              const s = 0.6 * (y - b[1]) / Math.max(1, bh) + 0.4 * (x - b[0]) / Math.max(1, bw);
              if (s > 0.76) tone = 1;
              else if (s < 0.12) tone = 3;
            }
          }
          col = T[Math.min(tone, T.length - 1)];
          // rim light: lit back edge facing the arena light, never on the top-left lit side
          if (rim && !contact && !at(x + 1, y) && !upOpen && tone <= 2 && T.length > 2) col = mix(T[2], rim, 0.6);
        }
      } else {
        // selective outline: the lit (top/left) side takes a dark tone of the
        // material it wraps, the shadow side stays near-black
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

  // tinted copy (white hit flash, magenta diff ghost)
  const tintC = document.createElement('canvas'), tintX = tintC.getContext('2d');
  const tinted = (spr, color) => {
    tintC.width = spr.width; tintC.height = spr.height;
    tintX.drawImage(spr, 0, 0); tintX.globalCompositeOperation = 'source-atop';
    tintX.fillStyle = color; tintX.fillRect(0, 0, spr.width, spr.height); tintX.globalCompositeOperation = 'source-over';
    return tintC;
  };

  // bitmap text on the arena canvas, always crisp
  const txt = (c, s, x, y, col, sc = 1, o = {}) => {
    s = String(s).toUpperCase();
    const wd = s.length * 6 * sc - sc;
    if (o.center) x -= Math.floor(wd / 2);
    const draw = (ox, oy, color) => {
      c.fillStyle = color;
      [...s].forEach((ch, i) => (FONT[ch] || FONT[' ']).forEach((row, r) => { for (let k = 0; k < 5; k++) if (row >> (4 - k) & 1) c.fillRect(Math.round(x + ox + (i * 6 + k) * sc), Math.round(y + oy + r * sc), sc, sc); }));
    };
    const th = o.thick || 1;
    if (o.outline) for (let dy = -th; dy <= th; dy++) for (let dx = -th; dx <= th; dx++) if (dx || dy) draw(dx, dy, o.outline);
    draw(0, 0, col);
    return wd;
  };
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const hash = (a, b = 0) => { let t = (a * 374761393 + b * 668265263) | 0; t = (t ^ (t >>> 13)) * 1274126177 | 0; return ((t ^ (t >>> 16)) >>> 0) / 4294967296; };
  const ease = t => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

  // =====================================================================
  // hero
  // =====================================================================
  const HM = {
    cloak: mat(['#0c1c38', '#163463', '#2a62b0', '#4da3ff', '#a8d6ff']),
    lining: mat(['#0a0f20', '#111a33', '#1b2a4d', '#273a66']),
    tunic: mat(['#0b111f', '#151f36', '#22304d', '#31456b']),
    gold: mat(['#3d2a0c', '#7d5c22', '#d9b45b', '#f6dd94', '#fff4cf'], { shiny: true }),
    skin: mat(['#6e3f2c', '#a8674c', '#dca27e', '#f3c9a6']),
    steel: mat(['#2c3a52', '#6f819e', '#b9c7dc', '#e8eef7', '#ffffff'], { shiny: true }),
    leather: mat(['#160f0a', '#2e2017', '#4a3524', '#654a33']),
    eye: flat('#0a0e1a'), glow: flat('#bfe6ff'),
  };
  const POSES = {
    idle: { arm: 70, sword: -55 }, run: { arm: 35, sword: -15, lean: 1 }, windup: { arm: -125, sword: -155, lean: -1, legs: 'wide' },
    swing: { arm: 22, sword: 28, lean: 2, legs: 'wide', crouch: 1 }, cast: { arm: -12, sword: -88, glow: true },
    hurt: { arm: 115, sword: 165, lean: -2, shut: true }, victory: { arm: -78, sword: -90 },
  };
  const rad = d => d * Math.PI / 180;
  const heroGrid = (pose, f) => {
    const P = { legs: 'stand', lean: 0, crouch: 0, ...POSES[pose] };
    const g = new Grid(46, 50);
    const hop = pose === 'victory' ? [0, 2, 3, 2][f % 4] : 0;
    const bob = pose === 'idle' ? f % 2 : pose === 'run' ? f % 2 : 0;
    const by = 49 - hop, ux = 17 + P.lean, uy = 10 + bob + P.crouch - hop;
    const flap = pose === 'run' ? (f % 2 ? 3 : 1) : pose === 'hurt' ? 3 : (f % 2);
    // cape behind everything
    g.part();
    g.poly([[ux - 4, uy + 13], [ux + 3, uy + 13], [ux + 3, uy + 30], [ux - 5 - flap, uy + 31], [ux - 8 - flap, uy + 27], [ux - 6, uy + 18]], HM.cloak);
    g.poly([[ux - 3, uy + 16], [ux + 1, uy + 16], [ux + 1, uy + 29], [ux - 4 - flap, uy + 29]], HM.lining);
    // back arm
    g.part(); g.line(ux - 2, uy + 16, ux - 4, uy + 22, HM.tunic, 3); g.ell(ux - 4, uy + 23, 1, 1, HM.skin);
    // legs
    const feet = { stand: [[-3, 0], [3, 0]], wide: [[-7, 0], [7, 0]], run0: [[-7, -1], [6, 0]], run1: [[-1, 0], [3, -3]] };
    const fk = pose === 'run' ? (f % 2 ? 'run1' : 'run0') : P.legs;
    feet[fk].forEach(([fx, fy], k) => {
      g.part();
      const hx = ux + (k ? 2 : -2), hy = uy + 25, fx2 = ux + fx, fy2 = by - 3 + fy;
      g.line(hx, hy, (hx + fx2) / 2 + (k ? 1 : 0), (hy + fy2) / 2, HM.tunic, 3);
      g.line((hx + fx2) / 2 + (k ? 1 : 0), (hy + fy2) / 2, fx2, fy2, HM.tunic, 3);
      g.rrect(fx2 - 2, fy2, 6, 3, 1, HM.leather);
      g.rect(fx2 - 1, fy2 - 1, 3, 1, HM.gold);
    });
    // torso, skirt, belt
    g.part();
    g.poly([[ux - 5, uy + 14], [ux + 5, uy + 14], [ux + 4, uy + 25], [ux - 4, uy + 25]], HM.tunic);
    g.poly([[ux - 5, uy + 23], [ux + 5, uy + 23], [ux + 7, uy + 28], [ux - 6, uy + 28]], HM.cloak);
    g.rrect(ux - 2, uy + 15, 7, 6, 2, HM.steel); g.rect(ux + 1, uy + 17, 2, 2, HM.gold);
    g.rect(ux - 4, uy + 22, 9, 2, HM.leather); g.rect(ux, uy + 22, 2, 2, HM.gold);
    // head and hood
    g.part();
    g.poly([[ux - 4, uy + 4], [ux - 10, uy + 9], [ux - 5, uy + 12]], HM.cloak);
    g.ell(ux, uy + 8, 6, 6, HM.cloak);
    g.ell(ux + 3, uy + 9, 3.5, 4, HM.lining);
    g.part(); g.ell(ux + 3.5, uy + 10, 2.5, 3, HM.skin);
    g.line(ux + 2, uy + 7, ux + 5, uy + 7, HM.tunic); g.px(ux + 2, uy + 8, HM.tunic);
    if (P.shut) { g.px(ux + 5, uy + 10, HM.eye); g.px(ux + 6, uy + 10, HM.eye); }
    else { g.px(ux + 5, uy + 9, HM.eye); g.px(ux + 5, uy + 10, HM.eye); }
    g.part(); g.ell(ux, uy + 14, 5, 2, HM.cloak); g.px(ux + 3, uy + 14, HM.gold); g.px(ux + 3, uy + 15, HM.gold);
    // front arm + sword
    g.part();
    const sx = ux + 1, sy = uy + 16;
    const hx = sx + Math.cos(rad(P.arm)) * 7, hy = sy + Math.sin(rad(P.arm)) * 7;
    g.line(sx, sy, hx, hy, HM.tunic, 3);
    g.part(); g.ell(sx, sy - 1, 3, 2.5, HM.steel); g.line(sx - 3, sy + 1, sx + 3, sy + 1, HM.gold);
    g.part();
    const ca = Math.cos(rad(P.sword)), sa = Math.sin(rad(P.sword));
    g.line(hx - ca * 3, hy - sa * 3, hx, hy, HM.leather, 2);
    g.px(hx - ca * 4, hy - sa * 4, HM.gold);
    g.line(hx + ca * 2, hy + sa * 2, hx + ca * 15, hy + sa * 15, HM.steel, 2);
    g.px(hx + ca * 16, hy + sa * 16, HM.steel);
    g.line(hx - sa * 3 + ca, hy + ca * 3 + sa, hx + sa * 3 + ca, hy - ca * 3 + sa, HM.gold, 1);
    g.ell(hx, hy, 1.2, 1.2, HM.skin);
    if (P.glow) g.ell(hx + ca * 16, hy + sa * 16, 1, 1, HM.glow);
    return { g, hand: [hx + 1, hy + 1], tip: [hx + ca * 16 + 1, hy + sa * 16 + 1] };
  };
  const heroCache = new Map();
  const hero = (pose, f) => {
    const k = pose + f;
    if (!heroCache.has(k)) { const r = heroGrid(pose, f); heroCache.set(k, { c: render(r.g), hand: r.hand, tip: r.tip }); }
    return heroCache.get(k);
  };

  // =====================================================================
  // bosses
  // =====================================================================
  const gold = mat(['#3d2a0c', '#7d5c22', '#d9b45b', '#f6dd94', '#fff4cf'], { shiny: true });
  const ink = flat('#2a2433'), black = flat('#05070d'), white = flat('#ffffff');

  // Every boss frame takes `a`, the attack phase the engine is in:
  // 0 idle, 1 anticipation (wind-up), 2 strike, 3 recovery.
  const atk = st => st.atk || (st.bite ? 2 : 0);
  const TAU = Math.PI * 2;

  // ---- 1. Recursive Hydra
  const HY = {
    scale: mat(['#3a0a14', '#7a1526', '#c8304a', '#ff5d6c', '#ffb3bb'], { shiny: true }),
    belly: mat(['#4a1020', '#7a1f32', '#b8404c', '#e0706a', '#f8a890']),
    spike: mat(['#1e1030', '#3a2058', '#5e3a8e', '#8a64c0']),
    eye: flat('#ffd84d'), mouth: flat('#2a0610'), tooth: flat('#f3efe6'), seam: flat('#8c2a36'), scaleDot: flat('#9a1f34'), tongue: flat('#ff8fb0'),
  };
  const HY_SLOTS = [[26, 34, 1], [46, 18, 1], [66, 30, 1], [12, 50, .72], [86, 14, .72], [32, 12, .62], [58, 10, .62], [8, 32, .62], [92, 34, .62]];
  const hydraHead = (g, x, y, s, open, blink, tongue) => {
    g.part();
    if (open > 0) g.poly([[x + 2 * s, y + 1 * s], [x - 7 * s, y + 0.5 * s], [x - 7 * s, y + 1 * s + open], [x + 2 * s, y + 2.5 * s]], HY.mouth);
    g.poly([[x + 3 * s, y + 1.5 * s], [x - 6 * s, y + 1.5 * s + open], [x - 5 * s, y + 3.5 * s + open], [x + 4 * s, y + 4 * s]], HY.scale);
    g.part();
    g.ell(x + 3 * s, y - 1 * s, 5 * s, 4 * s, HY.scale);
    g.poly([[x + 1 * s, y - 3.5 * s], [x - 8 * s, y - 1.5 * s], [x - 8 * s, y + 1 * s], [x + 2 * s, y + 1.5 * s]], HY.scale);
    g.part();
    g.poly([[x + 4 * s, y - 4 * s], [x + 12 * s, y - 10 * s], [x + 8 * s, y - 2 * s]], HY.spike);
    g.poly([[x + 1 * s, y - 4 * s], [x + 4 * s, y - 10 * s], [x + 5 * s, y - 3 * s]], HY.spike);
    g.px(x - 7 * s, y - 1 * s, HY.mouth);
    const ec = blink ? HY.mouth : HY.eye;
    if (s > .9) { g.px(x, y - 2, ec); g.px(x + 2, y - 2, ec); g.px(x + 1, y - 2, HY.mouth); if (!blink) g.px(x + 1, y - 3, HY.eye); }
    else { g.px(x, y - 2, ec); g.px(x + 1, y - 2, ec); }
    if (open > 0) { g.px(x - 6 * s, y + 1.5 * s, HY.tooth); g.px(x - 3 * s, y + 1.5 * s, HY.tooth); g.px(x - 5 * s, y + 1 * s + open, HY.tooth); }
    if (tongue && !open) { g.line(x - 8 * s, y + 0.5 * s, x - 11 * s, y + 1.5 * s, HY.tongue); g.px(x - 12 * s, y + 1 * s, HY.tongue); g.px(x - 12 * s, y + 2.5 * s, HY.tongue); }
  };
  const hydraNeck = (g, k, slot, fr, a) => {
    const [sx0, sy0, s] = slot;
    const sw = Math.sin(fr * Math.PI / 9 + k * 1.3) * 2, sv = Math.cos(fr * Math.PI / 9 + k) * 1.5;
    // wind-up rears every head back and up; the strike snaps them forward
    const dx = a === 1 ? 5 : a === 2 ? -6 : a === 3 ? 1 : 0, dy = a === 1 ? -4 : a === 2 ? 3 : 0;
    const x = sx0 + sw + dx * s, y = sy0 + sv + dy * s;
    const bx = 56 + (sx0 - 50) * 0.3, byy = 58;
    g.part();
    g.curve(bx, byy, (bx + x) / 2 + 8, (byy + y) / 2 + 6, x + 4 * s, y + 2 * s, HY.scale, 9 * s, 5 * s, (px, py, tx, ty, th, i) => {
      if (i % 4 === 2) { const nx = ty, ny = -tx, r = th / 2; g.poly([[px + nx * r, py + ny * r], [px + nx * (r + 3) - tx * 1.5, py + ny * (r + 3) - ty * 1.5], [px + nx * r - tx * 3, py + ny * r - ty * 3]], HY.spike); }
    });
    const open = a === 2 ? 4 * s : a === 1 ? 0 : (fr + k * 5) % 12 < 2 ? 2 * s : 0;
    hydraHead(g, x, y, s, open, !a && (fr + k * 7) % 36 < 2, !a && (fr + k * 11) % 18 < 3);
  };
  const hydra = {
    id: 'hydra', name: 'Recursive Hydra', unit: 'agents', hp: 933, w: 100, h: 84, k: 1.14, rim: '#ff8f5a', arena: 'cavern', hitX: 30, aura: '#ff5d6c', death: 'cage',
    loop: [90, 36, 2],
    init: st => { st.heads = 3; },
    frame: (st, t) => ({ h: st.heads, f: Math.floor(t / 90) % 36, a: atk(st) }),
    draw(g, { h, f, a }) {
      const br = Math.round(Math.sin(f / 36 * TAU) * 0.8), tw = Math.sin(f / 36 * TAU + 1) * 4;
      for (let k = h - 1; k >= 3; k--) hydraNeck(g, k, HY_SLOTS[k], f, a);
      g.part(); g.curve(80, 64, 100, 76 + tw * 0.5, 96 + tw * 0.3, 46 + tw, HY.scale, 8, 2);
      // stubby clawed legs instead of round wheels
      g.part(); [44, 72].forEach(lx => { g.ell(lx + 4, 70, 6, 5, HY.scale); g.rrect(lx, 70, 9, 11, 3, HY.scale); });
      [44, 72].forEach(lx => { g.part(); g.rrect(lx - 2, 78, 12, 4, 2, HY.scale); });
      g.part(); g.ell(62, 64 - br, 22, 13 + br, HY.scale);
      for (let x = 46; x <= 78; x += 6) g.poly([[x, 53 - br * 2], [x + 3, 47 - br * 2], [x + 5, 53 - br * 2]], HY.spike);
      // ventral plates follow the underside of the body instead of a separate shield
      g.ellIf(54, 76, 15, 7, HY.belly, HY.scale);
      for (let j = 0; j < 2; j++) for (let x = 42; x <= 66; x++) {
        const yb = 71 + j * 3 + Math.round(((x - 54) / 12) ** 2 * 2);
        if (g.at(x, yb) === HY.belly && x % 6 !== 0) g.px(x, yb, HY.seam);
      }
      for (let y = 56; y < 70; y += 4) for (let x = 48 + (y % 8 ? 2 : 0); x < 80; x += 5) {
        if (g.at(x, y) === HY.scale && g.at(x + 2, y) === HY.scale) { g.px(x, y, HY.scaleDot); g.px(x + 1, y + 1, HY.scaleDot); g.px(x + 2, y, HY.scaleDot); }
      }
      [43, 46, 49, 71, 74, 77].forEach(x => { g.px(x, 82, HY.tooth); g.px(x, 83, HY.tooth); });
      for (let k = 2; k >= 0; k--) hydraNeck(g, k, HY_SLOTS[k], f, a);
    },
    moves: [
      { w: 'b', text: 'One review prompt splits into 5 agents.', fx: 'spawn', heads: 5 },
      { w: 'b', text: 'Each head spawns more. 928 heads. 367 MB of transcripts.', fx: 'spawn', heads: 9 },
      { w: 'h', text: 'You cast a sentence: "please don\'t over-delegate."', dmg: 0, fx: 'cast', miss: 'NO EFFECT' },
      { w: 'h', text: 'Delegation caps move into config. It can\'t talk its way past them.', dmg: 933, crit: true, fx: 'cast' }],
    special: [['Heads x3', [{ heads: 3 }]], ['Heads x5', [{ heads: 5 }]], ['Heads x9 swarm', [{ heads: 9 }]],
      ['Split (heads 3 to 9)', [3, 4, 5, 6, 7, 8, 9].map(n => ({ heads: n, bite: n > 3 ? 1 : 0 })), 8]],
  };
  hydra.slotXY = k => [HY_SLOTS[k][0] * hydra.k, HY_SLOTS[k][1] * hydra.k];

  // ---- 2. The Unverified Claim
  const CL = {
    paper: mat(['#6e5a3a', '#b39a6e', '#e8d6ad', '#fbf1d6']),
    roll: mat(['#4e3c22', '#8a6e42', '#c4a56e', '#ead09c']),
    eyeW: mat(['#7d8290', '#bfc3cc', '#eef0f4', '#ffffff']),
    iris: mat(['#0c2a5a', '#1e5aa8', '#4da3ff', '#9fd0ff']),
    red: flat('#d8304a'), wood: mat(['#2a1608', '#5a3418', '#8c5a2e', '#bf874c']), pad: mat(['#5a0a1a', '#8a1a2e', '#c8304a', '#ff5d6c']),
  };
  const claim = {
    id: 'claim', name: 'The Unverified Claim', unit: 'sessions', hp: 2610, w: 72, h: 92, k: 1.04, rim: '#ffe9b0', arena: 'archive', hitX: 8, float: true, aura: '#4da3ff',
    loop: [110, 24, 2],
    init: st => { st.cross = 0; st.stampT = -1; },
    frame: (st, t) => ({ f: Math.floor(t / 110) % 24, c: st.cross, s: st.stampT < 0 ? -1 : Math.min(8, Math.floor(st.stampT * 8)), a: atk(st) }),
    draw(g, { f, c, s, a }) {
      const fy = Math.round(Math.sin(f / 24 * TAU) * 1.5) + 12, sway = Math.round(Math.sin(f / 24 * TAU * 2));
      g.part(); g.line(15, 34 + fy, 4, 44 + fy + sway, CL.roll, 5); g.ell(3, 47 + fy + sway, 3, 3, CL.paper);
      g.part(); g.poly([[15, 4 + fy], [57, 4 + fy], [59, 46 + fy], [13, 46 + fy]], CL.paper);
      for (let x = 14; x < 59; x += 4) g.ell(x + 1, 47 + fy + ((x + f) % 8 < 4 ? 1 : 0), 2, 1.5, CL.paper);
      [18, 21, 24].forEach(y => { let x = 19; while (x < 53) { const l = 3 + Math.floor(hash(x, y) * 7); g.line(x, y + fy + 12, Math.min(52, x + l), y + fy + 12, ink); x += l + 2; } });
      g.part(); g.rect(11, -1 + fy, 50, 7, CL.roll); g.ell(11, 2 + fy, 2, 3.5, CL.roll); g.ell(61, 2 + fy, 2, 3.5, CL.roll);
      g.px(61, 2 + fy, ink); g.px(11, 2 + fy, ink);
      g.part(); g.rect(9, 49 + fy, 54, 6, CL.roll); g.ell(9, 52 + fy, 2, 3, CL.roll); g.ell(63, 52 + fy, 2, 3, CL.roll);
      // one big eye that looks around, blinks, and squints when it attacks
      g.part(); g.ell(36, 14 + fy, 9, 6, CL.eyeW);
      const ix = a ? -2 : Math.round(Math.sin(f / 24 * TAU) * 1.6);
      g.ell(33 + ix, 15 + fy, 4, 4, CL.iris); g.rect(32 + ix, 14 + fy, 2, 3, black); g.px(34 + ix, 13 + fy, white);
      const lid = f === 5 || f === 6 ? 6 : a ? 3 : 0;
      g.part(); g.poly([[26, 6 + fy], [47, 6 + fy], [47, 10 + fy + lid], [26, 13 + fy + lid]], CL.paper);
      g.line(26, 13 + fy + lid, 46, 10 + fy + lid, ink);
      // the fake DONE stamp
      const sx = 18, sy = 38 + fy;
      g.rect(sx, sy, 38, 11, CL.red); g.rect(sx + 1, sy + 1, 36, 9, CL.paper);
      g.part(); g.text('DONE', sx + 3, sy + 2, CL.red); g.text('^', sx + 29, sy + 2, CL.red);
      for (let y = sy; y < sy + 11; y++) for (let x = sx; x < sx + 38; x++) if (hash(x * 7, y * 3) < 0.13 && g.at(x, y) === CL.red) g.px(x, y, CL.paper);
      if (c >= 1) g.line(sx - 1, sy - 1, sx + 38, sy + 11, ink, 2);
      if (c >= 2) g.line(sx - 1, sy + 11, sx + 38, sy - 1, ink, 2);
      g.part(); g.line(56, 34 + fy, 67, 42 + fy - sway, CL.roll, 5); g.ell(68, 44 + fy - sway, 3, 3, CL.paper);
      // re-stamp: the rubber stamp drops in from above
      if (s >= 0) {
        const y = Math.round(-14 + ease(s / 6) * (sy - 10 + 14));
        g.part(); g.rect(33, y - 2, 6, 7, CL.wood); g.ell(36, y - 4, 4, 2.5, CL.wood);
        g.part(); g.rect(24, y + 5, 24, 3, CL.wood); g.rect(25, y + 8, 22, 2, CL.pad);
      }
    },
    moves: [
      { w: 'h', text: 'You mine 2,610 sessions across four tools.', dmg: 900, fx: 'lens', cross: 1 },
      { w: 'b', text: 'Broken methodology. Your first pass is void.', dmg: -900, fx: 'stamp' },
      { w: 'h', text: 'You throw it out and redo it properly.', dmg: 1200, cross: 1 },
      { w: 'h', text: '0 unauthorized pushes. 26 false "done" claims caught. 36 skills retired.', dmg: 1410, crit: true, fx: 'lens', cross: 2 }],
    special: [['Re-stamp', [0, 1, 2, 3, 4, 5, 6, 7].map(n => ({ stampT: n / 8, cross: 1 })), 10],
      ['Audit (crossed out 0/1/2)', [0, 1, 2].map(n => ({ cross: n })), 2]],
  };

  // ---- 3. Phantom Charge
  const PC = {
    card: mat(['#06302e', '#0f6b62', '#26b39a', '#6fe8cc', '#d8fff3'], { shiny: true }),
    stripe: mat(['#03070a', '#0a1218', '#16222e', '#24364a']),
    fang: mat(['#8a8a80', '#c9c9bc', '#f3f1e6', '#ffffff']),
    eye: flat('#ff3d6a'), eyeHot: flat('#ffb3c6'), glow: flat('#b8fff0'), mouth: flat('#03070a'), chipL: flat('#7d5c22'), sheen: flat('#5fdcbf'), coinMark: flat('#7d5c22'),
  };
  const charge = {
    id: 'charge', name: 'Phantom Charge', unit: 'tests', hp: 128, w: 80, h: 72, k: 1.2, rim: '#6fe8cc', arena: 'vault', hitX: 8, float: true, alpha: 0.92, aura: '#26b39a',
    loop: [100, 20, 1],
    init: () => {},
    frame: (st, t) => ({ f: Math.floor(t / 100) % 20, a: atk(st) }),
    draw(g, { f, a }) {
      // coins orbit through the sprite: back half first, front half last
      const ang = k => f / 20 * TAU + k / 5 * TAU;
      const coin = k => {
        // orbit low around the tails so front coins never cover the face
        const an = ang(k), x = 40 + Math.cos(an) * 36, y = 52 + Math.sin(an) * 6;
        const w = Math.max(1, Math.round(Math.abs(Math.cos(an * 2 + k)) * 4));
        g.part(); g.rrect(x - w, y - 4, w * 2 + 1, 9, Math.min(w, 3), gold);
        if (w > 2) { g.line(x, y - 2, x, y + 2, PC.coinMark); g.px(x - 1, y - 2, PC.coinMark); g.px(x + 1, y + 2, PC.coinMark); }
      };
      for (let k = 0; k < 5; k++) if (Math.sin(ang(k)) <= 0) coin(k);
      const lift = a === 1 ? -2 : 0;
      g.part();
      g.rrect(8, 8 + lift, 64, 40, 5, PC.card);
      for (let k = 0; k < 6; k++) {
        // outer tails sway less so they never drift past the card's silhouette
        const x = 12 + k * 10, amp = k === 0 || k === 5 ? 1.2 : 2.5, sw = Math.round(Math.sin(f * Math.PI / 10 + k * 1.1) * amp);
        const ex = Math.min(70, Math.max(10, x + sw * 2 - 1));
        g.curve(x + 3, 44 + lift, x + 3 - sw, 52, ex, 59 + (k % 2) * 4, PC.card, 8, 1);
      }
      for (let i = 0; i < 12; i++) { const x = 69 - Math.round(i * 0.5), y = 21 + i + lift; for (const dx of [0, -2]) if (g.at(x + dx, y) === PC.card) g.px(x + dx, y, PC.sheen); }
      g.part(); g.rect(8, 13 + lift, 64, 7, PC.stripe);
      const gx = 8 + ((f * 4) % 70) - 6;
      for (let x = Math.max(8, gx); x < Math.min(72, gx + 8); x++) g.rect(x, 15 + lift, 1, 3, PC.glow);
      g.part(); g.rrect(14, 24 + lift, 11, 9, 2, gold); g.line(19, 25 + lift, 19, 31 + lift, PC.chipL); g.line(15, 28 + lift, 23, 28 + lift, PC.chipL);
      // angry eyes narrow on the wind-up, a fanged grin opens on the strike
      const ey = a === 1 ? 1 : 0, hot = f % 10 < 2 ? PC.eyeHot : white;
      g.poly([[30, 24 + ey + lift], [38, 27 + lift], [38, 30 - ey + lift], [31, 29 - ey + lift]], PC.eye); g.px(35, 28 + lift, hot);
      g.poly([[54, 24 + ey + lift], [46, 27 + lift], [46, 30 - ey + lift], [53, 29 - ey + lift]], PC.eye); g.px(49, 28 + lift, hot);
      const mo = a === 2 ? 3 : a === 3 ? 1 : a === 1 ? -2 : 0;
      g.part(); g.rrect(28, 35 - mo + lift, 38, Math.max(4, 9 + mo * 2), 2, PC.mouth);
      for (let x = 30; x < 64; x += 5) g.poly([[x, 35 - mo + lift], [x + 3, 35 - mo + lift], [x + 1.5, 39 - mo + lift + (x % 10 === 0 ? 1 : 0)]], PC.fang);
      for (let x = 32; x < 64; x += 5) g.poly([[x, 43 + mo + lift], [x + 3, 43 + mo + lift], [x + 1.5, 40 + mo + lift]], PC.fang);
      for (let k = 0; k < 5; k++) if (Math.sin(ang(k)) > 0) coin(k);
    },
    moves: [
      { w: 'b', text: 'Email verification quietly logs the user back in.', fx: 'swipe' },
      { w: 'b', text: 'Billing can\'t see the session. The card is charged before the throw.', fx: 'swipe' },
      { w: 'h', text: 'Signup state moves into user-scoped Redis with a TTL.', dmg: 64, fx: 'cast' },
      { w: 'h', text: 'A marker that only exists once provisioning really succeeded.', dmg: 64, crit: true }],
    special: [['Swipe dash', [{ atk: 1 }, { atk: 2 }, { atk: 2 }, { atk: 3 }], 8, 'Engine adds the streak and lunge']],
  };

  // ---- 4. Stale Access Wraith
  const WR = {
    robe: mat(['#0e0818', '#1f1236', '#36205a', '#523782', '#7f62b8']),
    trim: mat(['#1a1030', '#2e1d52', '#4a3480', '#6f56b0']),
    void: flat('#040208'), eye: flat('#9ff6ff'), eye2: flat('#4dd8e0'), wisp: flat('#6f56b0'),
    bone: mat(['#4e4a40', '#8f8874', '#cfc6ad', '#f0e9d4']),
    rust: mat(['#2e1408', '#6e3412', '#a95c26', '#d98e46']), rustDot: flat('#4a1e0a'),
  };
  const wraith = {
    id: 'wraith', name: 'Stale Access Wraith', unit: 'test lines', hp: 244, w: 70, h: 86, k: 1.1, rim: '#b8b2ea', arena: 'graveyard', hitX: 6, float: true, alpha: 0.94, aura: '#7f62b8',
    loop: [110, 24, 2],
    init: st => { st.phase = 0; },
    frame: (st, t) => ({ f: Math.floor(t / 110) % 24, a: atk(st) }),
    draw(g, { f, a }) {
      const wv = k => Math.round(3 * Math.sin(f / 24 * TAU + k * 0.7));
      const sl = Math.round(Math.sin(f / 24 * TAU) * 1.5);
      // the key hand: raised on the wind-up, thrust at the hero on the strike
      const kx = a === 2 ? -5 : a === 3 ? -2 : 0, ky = a === 1 ? -9 : a === 2 ? 2 : a === 3 ? -3 : sl;
      for (let i = 0; i < 5; i++) { const yy = 77 - ((f * 1.5 + i * 7) % 18); g.part(); g.px(18 + i * 10 + Math.round(Math.sin(f / 4 + i)), yy, WR.wisp); }
      g.part();
      g.poly([[28, 28], [52, 28], [64, 70], [12, 70]], WR.robe);
      for (let x = 12; x < 64; x += 4) g.poly([[x, 69], [x + 4, 69], [x + 2, 75 + wv(x)]], WR.robe);
      g.part(); g.line(26, 30, 30, 70, WR.trim, 2);
      g.part(); g.poly([[28, 34], [36, 38], [18 + kx, 52 + ky], [10 + kx, 50 + ky]], WR.robe);
      g.part(); g.ell(10 + kx, 52 + ky, 2.5, 2, WR.bone); g.line(8 + kx, 53 + ky, 6 + kx, 56 + ky, WR.bone); g.line(11 + kx, 54 + ky, 10 + kx, 57 + ky, WR.bone);
      g.part();
      g.ell(8 + kx, 60 + ky, 4, 4, WR.rust); g.ell(8 + kx, 60 + ky, 1.5, 1.5, 0);
      g.line(8 + kx, 64 + ky, 8 + kx, 80 + ky, WR.rust, 2); g.rect(9 + kx, 74 + ky, 4, 2, WR.rust); g.rect(9 + kx, 78 + ky, 3, 2, WR.rust);
      [[6, 58], [10, 62], [8, 70], [9, 76], [7, 66]].forEach(([x, y]) => g.px(x + kx, y + ky, WR.rustDot));
      // hood with a tip that drags in the wind
      g.part();
      g.poly([[34, 4], [48, 8], [56, 24], [52, 36], [26, 36], [22, 22]], WR.robe);
      g.poly([[46, 9], [60 + sl, 14 + sl], [52, 19]], WR.robe);
      g.ell(34, 22, 8, 9, WR.void);
      if (f % 24 !== 7) { const e = a === 1 || f % 6 === 0 ? WR.eye : WR.eye2; g.rect(29, 20, 2, 2, WR.eye); g.rect(36, 20, 2, 2, WR.eye); g.px(30, 22, e); g.px(37, 22, e); }
      else { g.line(29, 21, 30, 21, WR.eye2); g.line(36, 21, 37, 21, WR.eye2); }
    },
    moves: [
      { w: 'b', text: 'Trial says success. Another host still holds stale access.', fx: 'phase' },
      { w: 'h', text: 'Branches 1, 2 and 3 close without merging.', dmg: 0, fx: 'graves' },
      { w: 'h', text: 'Branch 4 centralizes provisioning.', dmg: 80 },
      { w: 'h', text: 'Caches invalidate across hosts. Replays turn idempotent.', dmg: 164, crit: true, fx: 'cast' }],
    special: [['Teleport (afterimage)', 'teleport', 8]],
  };

  // ---- 5. Three-Life Dropdown
  const DD = {
    slime: mat(['#0c3420', '#1a6640', '#38a865', '#7ee0a0', '#e0ffe9'], { shiny: true }),
    sep: mat(['#08281a', '#124a30', '#1f7a4c', '#3aa86c']),
    field: mat(['#93a0b4', '#c3cedd', '#eef2f7', '#ffffff']),
    text: flat('#1d2a3a'), chev: flat('#e0ffe9'), bubble: flat('#62c98a'), eye: flat('#ffffff'), pupil: flat('#05070d'), gloss: flat('#f0fff5'), mouth: flat('#0a2416'),
  };
  const dropdown = {
    id: 'dropdown', name: 'Three-Life Dropdown', unit: 'resolvers', hp: 300, w: 76, h: 66, k: 1.3, rim: '#e8ff8a', arena: 'swamp', hitX: 8, aura: '#38a865',
    loop: [120, 16, 1],
    init: st => { st.lives = 3; st.revT = -1; },
    frame(st, t) {
      let sx = 1 + 0.04 * Math.sin(t / 260), sy = 1 - 0.04 * Math.sin(t / 260);
      const a = atk(st);
      if (st.revT >= 0) {
        const r = st.revT;
        if (r < 0.35) { const k = r / 0.35; sx = 1 + 0.5 * k; sy = 1 - 0.75 * k; }
        else if (r < 0.65) { const k = (r - 0.35) / 0.3; sx = 1.5 - 0.65 * k; sy = 0.25 + 1.05 * k; }
        else { const k = (r - 0.65) / 0.35; sx = 0.85 + 0.15 * k; sy = 1.3 - 0.3 * k; }
      } else if (a === 1) { sx = 1.14; sy = 0.84; } else if (a === 2) { sx = 0.9; sy = 1.14; } else if (a === 3) { sx = 1.04; sy = 0.96; }
      return { x: Math.round(sx * 20), y: Math.round(sy * 20), b: a === 2 ? 1 : 0, f: Math.floor(t / 120) % 16 };
    },
    draw(g, { x, y, b, f = 0 }) {
      const sx = x / 20, sy = y / 20, cx = 38, base = 64;
      const bw = Math.round(52 * sx), bh = Math.max(6, Math.round(44 * sy)), top = base - bh;
      g.part();
      g.ell(cx, base - 2, bw / 2 + 4, 3, DD.slime);
      g.rrect(cx - bw / 2, top, bw, bh - 1, Math.min(12, Math.floor(bh / 2) - 1), DD.slime);
      g.ell(cx - bw / 2 + 2, base - 4, 3, 2, DD.slime); g.ell(cx + bw / 2 - 1, base - 5, 2, 3, DD.slime);
      // a drip that swells and falls from the right edge
      const dp = f % 16; if (dp < 10) g.ell(cx + bw / 2 - 3, base - 3 + Math.floor(dp / 3), 1, 1 + (dp > 5 ? 1 : 0), DD.slime);
      if (bh > 14) {
        g.line(cx - bw / 2 + 5, top + 4, cx - bw / 2 + 10, top + 2, DD.gloss); g.px(cx - bw / 2 + 4, top + 6, DD.gloss);
        // bubbles rise through the body
        for (let i = 0; i < 3; i++) {
          const span = Math.max(4, bh - 14), by = base - 6 - ((f * 2 + i * 9) % span), bx = cx + bw / 2 - 7 - i * 4, r = i === 0 ? 2 : 1;
          g.ell(bx, by, r, r, DD.bubble); if (r > 1) g.px(bx - 1, by - 1, DD.gloss);
        }
        const ey = top + Math.round(bh * 0.24);
        [[cx - 11, 0], [cx + 1, 1]].forEach(([ex]) => { g.ell(ex, ey, 3, 3.5 * Math.min(1, sy), DD.eye); g.rect(ex - 2, ey - 1, 2, 3, DD.pupil); g.px(ex - 1, ey - 2, DD.eye); });
        if (b) g.rect(cx - 6, ey + 5, 6, 3, DD.mouth); else { g.px(cx - 6, ey + 5, DD.mouth); g.line(cx - 5, ey + 6, cx - 2, ey + 6, DD.mouth); g.px(cx - 1, ey + 5, DD.mouth); }
        const fy = top + Math.round(bh * 0.5), fw = bw - 20, fh = Math.max(9, Math.round(13 * Math.min(1.1, sy)));
        g.part(); g.rrect(cx - bw / 2 + 5, fy, fw, fh, 2, DD.field);
        g.text('CA', cx - bw / 2 + 9, fy + Math.floor((fh - 7) / 2), DD.text);
        g.part(); g.rrect(cx - bw / 2 + 5 + fw, fy, 11, fh, 2, DD.sep);
        const vx = cx - bw / 2 + 8 + fw, vy = fy + Math.floor(fh / 2) - 1;
        g.px(vx, vy, DD.chev); g.px(vx + 1, vy + 1, DD.chev); g.px(vx + 2, vy + 2, DD.chev); g.px(vx + 3, vy + 1, DD.chev); g.px(vx + 4, vy, DD.chev);
      }
    },
    moves: [
      { w: 'h', text: 'The obvious one-line fix.', dmg: 100 },
      { w: 'b', text: 'It revives in a second purchase-flow resolver.', dmg: -100, fx: 'revive' },
      { w: 'h', text: 'You patch the resolver.', dmg: 100 },
      { w: 'b', text: 'It revives again through browser autofill.', dmg: -100, fx: 'revive' },
      { w: 'h', text: 'Unique, ambiguous and unknown region codes. All handled.', dmg: 300, crit: true, fx: 'cast' }],
    special: [['Revive (squash and stretch)', [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1].map(r => ({ revT: r })), 12]],
  };

  // ---- 6. Gate Without Guards
  const GT = {
    stone: mat(['#191e2a', '#313a4e', '#525e78', '#7a87a3', '#a6b1c9']),
    iron: mat(['#101218', '#262a34', '#424858', '#677084', '#98a1b4'], { shiny: true }),
    mortar: flat('#121620'), void: flat('#07080c'), eye: flat('#ffb35a'), core: flat('#fff1c2'), hole: flat('#1a1206'), moss: flat('#3f6b3a'),
    flame: flat('#ff9f43'), flame2: flat('#ffd28a'),
  };
  const gate = {
    id: 'gate', name: 'Gate Without Guards', unit: 'locks', hp: 300, w: 84, h: 88, k: 1.08, rim: '#ff9f43', arena: 'rampart', hitX: 4, aura: '#ff9f43',
    loop: [120, 16, 1],
    init: st => { st.locks = 0; },
    frame: (st, t) => ({ f: Math.floor(t / 120) % 16, l: st.locks, a: atk(st) }),
    draw(g, { f, l, a }) {
      const bob = f % 8 < 4 ? 0 : 1;
      // the near fist rises on the wind-up and slams forward on the strike
      const [ax0, ay0] = a === 1 ? [-2, -12] : a === 2 ? [-9, 3] : a === 3 ? [-4, -2] : [0, 0];
      [[4, 1], [66, -1]].forEach(([ax], k) => {
        const mx = k ? 0 : ax0, my = k ? 0 : ay0;
        // shoulder, upper arm, forearm and fist stay joined as the fist moves
        const sx = ax + (k ? 6 : 8), sy = 35 + bob, ex = ax + (k ? 7 : 7) + mx * 0.5, ey = 47 + bob + my * 0.5, fx = ax + (k ? 7.5 : 5.5) + mx, fy = 60 + bob + my;
        g.part(); g.line(sx, sy, ex, ey, GT.stone, 9);
        g.part(); g.line(ex, ey, fx, fy - 3, GT.stone, 9);
        g.part(); g.rrect(ax + (k ? 0 : 2), 30 + bob, 12, 10, 2, GT.stone);
        g.part(); g.rrect(fx - 6.5, fy - 5, 13, 11, 3, GT.stone);
        g.line(fx - 3, fy - 1, fx + 3, fy - 1, GT.mortar);
      });
      g.part(); g.rect(27, 28 + bob, 30, 58 - bob, GT.void);
      g.part();
      g.rect(16, 24 + bob, 12, 62 - bob, GT.stone); g.rect(56, 24 + bob, 12, 62 - bob, GT.stone); g.rect(12, 16 + bob, 60, 13, GT.stone);
      for (let y = 22; y < 86; y += 6) { g.line(16, y + bob, 27, y + bob, GT.mortar); g.line(56, y + bob, 67, y + bob, GT.mortar); }
      for (let y = 22, r = 0; y < 86; y += 6, r++) { const o = r % 2 ? 6 : 3; g.line(16 + o, y + bob, 16 + o, y + 6 + bob, GT.mortar); g.line(58 + o, y + bob, 58 + o, y + 6 + bob, GT.mortar); }
      g.line(12, 22 + bob, 71, 22 + bob, GT.mortar);
      for (let x = 18; x < 72; x += 9) g.line(x, 16 + bob, x, 22 + bob, GT.mortar);
      [[17, 40], [60, 70], [25, 80]].forEach(([x, y]) => { g.px(x, y, GT.moss); g.px(x + 1, y, GT.moss); g.px(x, y + 1, GT.moss); });
      g.part();
      const len = 18 + l * 13;
      for (let x = 30; x <= 54; x += 6) { g.line(x, 29 + bob, x, 29 + bob + len, GT.iron, 2); g.poly([[x - 1, 29 + bob + len], [x + 2, 29 + bob + len], [x + 0.5, 33 + bob + len]], GT.iron); }
      for (let y = 34; y < 29 + len; y += 8) g.line(29, y + bob, 55, y + bob, GT.iron, 2);
      [[34, 38], [46, 50], [37, 62]].slice(0, l).forEach(([x, y]) => {
        g.part(); g.ell(x + 3, y + bob - 2, 3, 3, GT.iron); g.ell(x + 3, y + bob - 2, 1.4, 1.4, 0);
        g.part(); g.rrect(x, y + bob, 7, 6, 1, gold); g.px(x + 3, y + bob + 2, GT.hole); g.px(x + 3, y + bob + 3, GT.hole);
      });
      g.part(); g.rrect(28, 2 + bob, 28, 15, 3, GT.stone);
      g.line(30, 8 + bob, 38, 10 + bob, GT.mortar); g.line(54, 8 + bob, 46, 10 + bob, GT.mortar);
      const lit = f % 16 < 14 || a;
      g.rect(32, 11 + bob, 6, 3, GT.eye); g.rect(46, 11 + bob, 6, 3, GT.eye);
      if (lit) { g.rect(33, 12 + bob, 2, 1, GT.core); g.rect(47, 12 + bob, 2, 1, GT.core); }
      // flames lick up out of the eye sockets
      const fl = f % 3;
      [33, 47].forEach((x, k) => { g.px(x + 1 + ((fl + k) % 2), 10 + bob, GT.flame); if (fl !== 1 || a) g.px(x + 2, 9 + bob, a ? GT.flame2 : GT.flame); });
      g.line(36, 15 + bob, 48, 15 + bob, GT.mortar);
    },
    moves: [
      { w: 'b', text: 'A successor grabs a task while its predecessor still runs.', fx: 'slam' },
      { w: 'h', text: 'Claim fencing: no takeover until the old process exits.', dmg: 100, fx: 'lock' },
      { w: 'h', text: 'A fail-closed handshake between dispatcher and workers.', dmg: 100, fx: 'lock' },
      { w: 'h', text: 'Workspace leases granted at dispatch, not found at runtime.', dmg: 100, crit: true, fx: 'lock' }],
    special: [['Padlocks 0 to 3', [0, 1, 2, 3].map(n => ({ locks: n })), 2]],
  };

  // ---- 7. The Blank Canvas
  const BC = {
    wood: mat(['#2a1608', '#5a3418', '#8c5a2e', '#bf874c', '#e0b47a']),
    canvas: mat(['#9a9488', '#cfc9bb', '#f1ece1', '#ffffff']),
    icon: mat(['#0c2a5a', '#1e5aa8', '#3d8be6', '#7dc0ff', '#d6ecff'], { shiny: true }),
    char: flat('#2a2a33'), sketch: flat('#8f8a80'), navy: flat('#1e3a66'), blue: flat('#4da3ff'), goldF: flat('#d9b45b'),
    red: flat('#ff5d6c'), green: flat('#5fd38d'), dark: flat('#0a0e1a'), card: flat('#e8eef7'), tooth: flat('#ffffff'),
    palette: mat(['#4a2e14', '#8c6a3e', '#c9a46e', '#ead2a4']),
  };
  const blank = {
    id: 'blank', name: 'The Blank Canvas', unit: 'days', hp: 14, w: 72, h: 88, k: 1.08, rim: '#ffd28a', arena: 'workshop', hitX: 10, aura: '#f1ece1',
    loop: [140, 8, 1],
    init: () => {},
    frame: (st, t, enc) => {
      const p = 1 - enc.hp / enc.b.hp;
      return { f: Math.floor(t / 140) % 8, s: enc.hp <= 0 ? 3 : p <= 0.01 ? 0 : p < 0.5 ? 1 : 2, a: atk(st) };
    },
    draw(g, { f, s, a }) {
      const hop = a === 1 ? -1 : a === 2 ? 3 : a === 3 ? 1 : s < 3 && f % 4 === 1 ? 1 : 0;
      const lf = s < 3 && !a ? (f % 4 < 2 ? -2 : 1) : 0, pal = Math.round(Math.sin(f / 8 * TAU));
      const b = a === 2;
      g.part(); g.line(36, 26 - hop, 36, 84, BC.wood, 2);
      g.part(); g.line(24, 40 - hop, 12 + lf, 86, BC.wood, 3); g.line(48, 40 - hop, 60 - lf, 86, BC.wood, 3);
      g.rect(16, 68, 40, 3, BC.wood);
      g.part(); g.rect(33, 0 - hop, 6, 8, BC.wood);
      g.part(); g.rect(10, 6 - hop, 52, 42, BC.canvas);
      const X = 10, Y = 6 - hop;
      if (s >= 1) {
        g.line(X + 3, Y + 3, X + 48, Y + 3, BC.sketch); g.line(X + 3, Y + 3, X + 3, Y + 38, BC.sketch);
        g.line(X + 48, Y + 3, X + 48, Y + 38, BC.sketch); g.line(X + 3, Y + 38, X + 48, Y + 38, BC.sketch);
        g.line(X + 3, Y + 8, X + 48, Y + 8, BC.sketch); g.line(X + 13, Y + 8, X + 13, Y + 38, BC.sketch);
      }
      if (s === 2) {
        g.rect(X + 3, Y + 3, 46, 5, BC.navy); g.px(X + 5, Y + 5, BC.red); g.px(X + 7, Y + 5, BC.goldF); g.px(X + 9, Y + 5, BC.green);
        g.rect(X + 3, Y + 8, 10, 31, BC.dark);
        [11, 15, 19].forEach(y => g.rect(X + 5, Y + y, 6, 2, BC.blue));
        for (let r = 0; r < 6; r++) g.rect(X + 16, Y + 11 + r * 4, 14 + Math.floor(hash(r, 5) * 16), 2, r % 3 === 1 ? BC.red : r % 3 === 2 ? BC.green : BC.sketch);
      }
      if (s === 3) {
        g.part(); g.rrect(X + 13, Y + 7, 26, 26, 6, BC.icon);
        g.part(); g.rrect(X + 18, Y + 13, 12, 9, 1, BC.card); g.rrect(X + 21, Y + 16, 12, 9, 1, BC.card);
        g.rect(X + 23, Y + 18, 4, 1, BC.green); g.rect(X + 24, Y + 17, 1, 3, BC.green); g.rect(X + 23, Y + 22, 5, 1, BC.red);
        g.px(X + 36, Y + 8, BC.goldF); g.px(X + 35, Y + 9, BC.goldF); g.px(X + 37, Y + 9, BC.goldF); g.px(X + 36, Y + 10, BC.goldF);
      } else {
        const ey = Y + (s === 2 ? 14 : 12) + (a === 1 ? 1 : 0);
        g.poly([[X + 15, ey], [X + 22, ey + 3], [X + 22, ey + 5], [X + 16, ey + 4]], BC.char);
        g.poly([[X + 37, ey], [X + 30, ey + 3], [X + 30, ey + 5], [X + 36, ey + 4]], BC.char);
        const my = Y + 25 - (b ? 1 : 0), mh = 9 + (b ? 4 : a === 1 ? -3 : 0);
        g.poly([[X + 9, my], [X + 43, my], [X + 39, my + mh], [X + 13, my + mh]], BC.char);
        for (let x = X + 11; x < X + 41; x += 5) g.poly([[x, my], [x + 4, my], [x + 2, my + 4]], BC.tooth);
        for (let x = X + 15; x < X + 38; x += 5) g.poly([[x, my + mh], [x + 4, my + mh], [x + 2, my + mh - 3]], BC.tooth);
      }
      g.part(); g.rect(6, 46 - hop, 60, 4, BC.wood);
      g.part(); g.line(8, 40 - hop, 2, 30 - hop + pal, BC.wood, 2);
      g.part(); g.ell(4, 28 - hop + pal, 5, 3, BC.palette); g.px(1, 27 - hop + pal, BC.red); g.px(4, 26 - hop + pal, BC.blue); g.px(7, 27 - hop + pal, BC.goldF); g.px(3, 29 - hop + pal, BC.green); g.px(6, 29 - hop + pal, 0);
      const br = a === 1 ? -4 : a === 2 ? 3 : -pal;
      g.part(); g.line(63, 40 - hop, 70, 28 - hop + br, BC.wood, 2); g.rect(69, 25 - hop + br, 3, 3, BC.char); g.px(70, 24 - hop + br, BC.blue);
    },
    moves: [
      { w: 'h', text: 'Night 1: a working Tauri + React app.', dmg: 4, fx: 'paint' },
      { w: 'h', text: 'Two weeks of screenshots: multi-repo, highlighting, kanban dispatch.', dmg: 6, fx: 'paint' },
      { w: 'b', text: 'Unsigned apps scare macOS.', fx: 'hop' },
      { w: 'h', text: 'Code-signed, notarized, auto-updating.', dmg: 4, crit: true, fx: 'paint' }],
    special: [['Paint stages (blank, wireframe, painted, shipped)', [14, 10, 4, 0].map(hp => ({ __hp: hp })), 2]],
  };

  // ---- 8. Data Bleed Doppelganger
  const DB = {
    body: mat(['#05303a', '#0b5664', '#1a93a2', '#4dd8e0', '#c0f8fb'], { shiny: true }),
    top: mat(['#0b5664', '#1a93a2', '#4dd8e0', '#a6f2f6']),
    band: flat('#063a44'), id: flat('#c0f8fb'), topIn: flat('#c8fafc'), crack: flat('#ff3d5a'), eye: flat('#05070d'), glint: flat('#ffffff'),
    led: flat('#5fd38d'), bleed: flat('#ff3d5a'), bleed2: flat('#a8102a'),
  };
  const DB_POS = [[38, 40, 18, 22], [70, 38, 18, 22], [24, 70, 20, 26], [58, 70, 20, 26]]; // cx, bottom, w, h
  const DB_LINKS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
  const doppel = {
    id: 'doppel', name: 'Data Bleed Doppelganger', unit: 'instances', hp: 4, w: 92, h: 76, k: 1.2, rim: '#4dd8e0', arena: 'datacenter', hitX: 12, aura: '#4dd8e0',
    loop: [120, 12, 1],
    init: st => { st.cut = 0; st.pulse = 0; },
    frame: (st, t) => ({ f: Math.floor(t / 120) % 12, a: atk(st), cut: st.cut || 0, p: st.pulse ? 1 : 0, fl: Math.floor(t / 60) % 6 }),
    bob: f => Math.round(Math.sin(f / 12 * TAU) * 1.5),
    draw(g, { f, a, cut = 0, p = 0, fl = 0 }) {
      const bob = this.bob(f), sq = a === 1 ? 2 : a === 2 ? -3 : a === 3 ? -1 : 0;
      // bleed lines run behind the cylinders between every pair; each hero cut removes two
      g.part();
      DB_LINKS.slice(cut).forEach(([a1, z], li) => {
        const pa = DB_POS[a1], pz = DB_POS[z];
        const ax = pa[0], ay = pa[1] - pa[3] / 2 + bob, zx = pz[0], zy = pz[1] - pz[3] / 2 + bob;
        const n = Math.ceil(Math.hypot(zx - ax, zy - ay));
        for (let i = 0; i < n; i++) {
          const q = i / n, wv = Math.sin(q * Math.PI * 3 + fl * 1.05 + li) * 1.5;
          const x = ax + (zx - ax) * q, y = ay + (zy - ay) * q + wv, flow = (i + fl) % 6 < 3;
          g.px(x, y, flow ? DB.bleed : DB.bleed2); if (p) g.px(x, y + 1, DB.bleed);
        }
        if ((fl + li) % 6 === 0) g.px((ax + zx) / 2, (ay + zy) / 2 + 3, DB.bleed);
      });
      DB_POS.forEach(([cx, bot, w, h], i) => {
        const top = bot - h + bob + sq, hw = w / 2;
        g.part();
        g.ell(cx, bot + bob - 1, hw - 0.5, 3, DB.body);
        g.rect(cx - hw, top, w, bot + bob - top - 1, DB.body);
        [0.38, 0.7].forEach(k => { const yb = Math.round(top + h * k); for (let x = -hw + 1; x < hw; x++) g.px(cx + x, yb + Math.round(Math.sqrt(Math.max(0, 1 - (x / hw) ** 2)) * 2.5), DB.band); });
        g.part(); g.ell(cx, top, hw - 0.5, 3, DB.top); g.ell(cx - 1, top, hw - 4, 1, DB.topIn);
        // identical faces and identical IDs: the bug
        g.rect(cx - 6, top + 5, 3, 3, DB.eye); g.rect(cx + 2, top + 5, 3, 3, DB.eye); g.px(cx - 6, top + 5, DB.glint); g.px(cx + 2, top + 5, DB.glint);
        g.line(cx - 2, top + 9 + (a === 2 ? 1 : 0), cx + 1, top + 9 + (a === 2 ? 1 : 0), DB.eye);
        g.text('#7', cx - 5, top + Math.round(h * 0.5), DB.id);
        g.px(cx + hw - 2, top + 8, DB.crack); g.px(cx + hw - 3, top + 9, DB.crack); g.px(cx + hw - 2, top + 10, DB.crack);
        // activity LEDs blink in lockstep, because they are the same instance
        g.px(cx - hw + 3, bot + bob - 6, (f + i) % 4 < 2 ? DB.led : DB.band); g.px(cx - hw + 5, bot + bob - 6, f % 3 ? DB.led : DB.band);
      });
    },
    moves: [
      { w: 'h', text: 'One command brings up four isolated stacks.', dmg: 1, fx: 'cut' },
      { w: 'b', text: 'Cloned databases share IDs. Data bleeds across instances.', fx: 'bleed' },
      { w: 'h', text: 'Isolation is a claim. You verify it.', dmg: 2, fx: 'cut' },
      { w: 'h', text: 'Hardened until any teammate can run it.', dmg: 1, crit: true, fx: 'cut' }],
    special: [['Bleed lines cut 0/2/4/6', [0, 2, 4, 6].map(n => ({ cut: n })), 2], ['Bleed pulse', [0, 1, 2, 3, 4, 5].map(n => ({ pulse: 1, __fl: n })), 10]],
  };

  // ---- 9. Pixel Mimic
  const PM = {
    wood: mat(['#2a1206', '#5a2a10', '#8c4a1e', '#c07438', '#e8a564']),
    plank: flat('#4a2010'), inside: flat('#14050f'),
    tongue: mat(['#5a0a2a', '#a01a4a', '#e0457a', '#ff8ab0']),
    tooth: mat(['#8a8a80', '#c9c9bc', '#f3f1e6', '#ffffff']),
    eye: flat('#ff7ad9'), eyeHot: flat('#ffd6f3'), eye2: flat('#ffd6f3'), hole: flat('#1a1206'), tongueLine: flat('#a01a4a'), spark: flat('#ffd84d'),
  };
  const mimic = {
    id: 'mimic', name: 'Pixel Mimic', unit: '% diff', hp: 100, w: 72, h: 66, k: 1.3, rim: '#ff7ad9', arena: 'treasure', hitX: 8, aura: '#ff7ad9',
    loop: [90, 20, 1],
    init: () => {},
    frame: (st, t) => ({ f: Math.floor(t / 90) % 20, a: atk(st) }),
    draw(g, { f, a }) {
      // lid snaps shut on the wind-up, gapes on the strike
      const open = a === 2 ? 18 : a === 1 ? 3 : a === 3 ? 12 : Math.round(9 + 5 * Math.max(0, Math.sin(f / 20 * TAU)));
      const top = 36, lidB = top - open, tw = Math.round(Math.sin(f / 20 * TAU * 2) * 1.5);
      g.part(); g.rect(12, lidB, 48, open + 2, PM.inside);
      if (open > 6) { g.px(18 + (f * 7) % 34, lidB + 3 + (f % 3), PM.spark); g.px(22 + (f * 11) % 28, lidB + 5, PM.spark); }
      g.part(); g.rect(10, top, 52, 26, PM.wood);
      [44, 52].forEach(y => g.line(11, y, 61, y, PM.plank));
      g.part(); g.rect(14, top, 4, 26, gold); g.rect(54, top, 4, 26, gold);
      g.part(); g.rrect(32, top + 4, 8, 9, 2, gold); g.px(36, top + 7, PM.hole); g.px(36, top + 8, PM.hole);
      for (let x = 13; x < 60; x += 6) { g.part(); g.poly([[x, top], [x + 5, top], [x + 2.5, top - 5]], PM.tooth); }
      g.part(); g.rrect(9, lidB - 12, 54, 13, 4, PM.wood); g.line(11, lidB - 5, 61, lidB - 5, PM.plank);
      g.part(); g.rect(14, lidB - 12, 4, 13, gold); g.rect(54, lidB - 12, 4, 13, gold);
      const ec = f % 10 < 2 || a === 1 ? PM.eyeHot : PM.eye;
      g.poly([[24, lidB - 9], [31, lidB - 7], [31, lidB - 5], [25, lidB - 6]], ec); g.px(28, lidB - 6, PM.eye2);
      g.poly([[48, lidB - 9], [41, lidB - 7], [41, lidB - 5], [47, lidB - 6]], ec); g.px(44, lidB - 6, PM.eye2);
      for (let x = 16; x < 58; x += 6) { g.part(); g.poly([[x, lidB + 1], [x + 5, lidB + 1], [x + 2.5, lidB + 6]], PM.tooth); }
      if (a !== 1) {
        g.part(); g.poly([[19, top - 1], [30, top - 1], [29 + tw, top + 6], [26 + tw, top + 11], [22 + tw, top + 11], [19, top + 6]], PM.tongue);
        g.line(24, top + 1, 24 + tw, top + 8, PM.tongueLine);
      }
    },
    moves: [
      { w: 'b', text: 'After the upgrade, the app almost matches staging.', fx: 'chomp' },
      { w: 'h', text: 'Annotated screenshots drive the agent.', dmg: 40, fx: 'lens' },
      { w: 'h', text: 'Storybook parity stories pin components.', dmg: 35, fx: 'cast' },
      { w: 'h', text: 'The branch-to-staging diff becomes the queue. Font weights. Hover colors.', dmg: 25, crit: true }],
    special: [['Diff converging (100/60/25/0%)', 'diff', 2]],
  };

  const BOSSES = [hydra, claim, charge, wraith, dropdown, gate, blank, doppel, mimic];
  // design coords stay small; the battle uses the scaled size
  BOSSES.forEach(b => { b.w0 = b.w; b.h0 = b.h; b.w = Math.round(b.w0 * b.k); b.h = Math.round(b.h0 * b.k); b.hitX = Math.round(b.hitX * b.k); });

  // =====================================================================
  // arenas: 2-3 parallax layers, a ground plane, ambient particles
  // =====================================================================
  const field = (c, W, Hh, t, n, seed, colors, speed, rise) => {
    for (let k = 0; k < n; k++) {
      const a = hash(k, seed), b = hash(k, seed + 1), sp = 0.4 + hash(k, seed + 2);
      const x = ((a * W * 1.3 + t * speed * sp * 0.01) % (W + 10)) - 5;
      const y = rise ? Hh - ((b * Hh + t * rise * sp * 0.01) % Hh) : b * Hh + Math.sin(t / 900 + k) * 3;
      const on = Math.sin(t / 300 + k * 2.1) > -0.3;
      if (on) R(c, x, y, 1, 1, colors[k % colors.length]);
    }
  };
  const bands = (c, W, Hh, cols) => cols.forEach((col, i) => R(c, 0, Math.floor(i * Hh / cols.length), W, Math.ceil(Hh / cols.length) + 1, col));
  const floor = (c, W, H, GY, cam, base, edge, seam) => {
    R(c, 0, GY, W, H - GY, base); R(c, 0, GY, W, 1, edge);
    const o = ((cam % 16) + 16) % 16;
    for (let x = -16 + o; x < W; x += 16) { R(c, x, GY + 1, 1, 6, seam); R(c, x + 8, GY + 7, 1, H - GY - 7, seam); }
    R(c, 0, GY + 7, W, 1, seam);
  };
  const pile = (c, x, base, w, h, k) => {
    for (let i = 0; i < h; i++) {
      const rw = Math.round(w * Math.sqrt(1 - (i / h) ** 2)), y = base - i - 1;
      R(c, x - rw, y, rw * 2, 1, i % 3 === 0 ? '#b8923f' : '#d9b45b');
      R(c, x - rw, y, 1, 1, '#7d5c22'); R(c, x + rw - 1, y, 1, 1, '#7d5c22');
    }
    for (let j = 0; j < w; j++) { const px = x - w + 2 + Math.floor(hash(j, k) * (w * 2 - 4)), py = base - 1 - Math.floor(hash(k, j) * h * 0.8); R(c, px, py, 1, 1, '#f6dd94'); }
    R(c, x - 2, base - h, 2, 1, '#fff4cf');
  };
  const rack = (c, x, y, w, h, t, leds, k) => {
    R(c, x, y, w, h, '#121726'); R(c, x + 1, y + 1, w - 2, h - 2, '#0a0e18'); R(c, x, y, 1, h, '#1f2840');
    for (let u = y + 3; u < y + h - 3; u += 5) {
      R(c, x + 2, u, w - 4, 3, '#18203a');
      const blink = hash(Math.floor(t / 400) + u, k + x) ;
      R(c, x + 3, u + 1, 1, 1, leds[Math.floor(blink * leds.length)]);
      if (blink > 0.5) R(c, x + 5, u + 1, 1, 1, leds[0]);
    }
  };
  // crisp pixel disc (row spans, no anti-aliasing)
  const disc = (c, x, y, r, col) => {
    c.fillStyle = col;
    for (let j = -Math.floor(r); j <= Math.floor(r); j++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r - j * j)) + 0.5); c.fillRect(Math.round(x) - hw, Math.round(y) + j, hw * 2 + 1, 1); }
  };
  // stepped light pool: 3 hard-edged bands instead of a soft gradient
  const glow = (c, x, y, r, col, a = 0.08) => {
    c.globalAlpha = a; [1, 0.68, 0.4].forEach(k => disc(c, x, y, Math.round(r * k), col)); c.globalAlpha = 1;
  };
  // fast foreground layer: dark silhouettes along the bottom edge for depth
  const foreground = (c, W, H, cam, col) => {
    const o = Math.round(cam * 1.6);
    c.fillStyle = col;
    for (let x = -60 + (((o % 97) + 97) % 97); x < W + 60; x += 97) {
      const h = 3 + Math.floor(hash(Math.floor((x - o) / 97), 77) * 4);
      for (let j = 0; j < h; j++) { const hw = Math.round((h - j) * 2.2 + 3); c.fillRect(x - hw, H - 1 - j, hw * 2, 1); }
    }
  };
  const ARENAS = {
    cavern(c, W, H, GY, t, cam) {
      bands(c, W, GY, ['#090811', '#0c0913', '#100a15', '#140b16', '#190c18']);
      const o1 = Math.round(cam * 0.25), o2 = Math.round(cam * 0.6);
      for (let x = -20; x < W + 20; x += 13) { const h = 6 + hash(x, 1) * 16, xx = x + o1; for (let y = 0; y < h; y++) R(c, xx + 4 - (1 - y / h) * 4, y, (1 - y / h) * 8, 1, '#06050b'); }
      for (let x = -40 + (o2 % 52); x < W + 40; x += 52) {
        rack(c, x, GY - 44, 16, 44, t, ['#ff5d6c', '#5fd38d', '#4da3ff', '#2a1018'], 1);
        for (let i = 0; i < 26; i++) R(c, x + 16 + i, GY - 44 + Math.round(10 * Math.sin(i / 26 * Math.PI)), 1, 1, '#2a1626');
      }
      for (let x = -20; x < W + 20; x += 31) { const xx = x + Math.round(cam); R(c, xx, GY - 4 - hash(x, 3) * 4, 9, 8, '#0c0810'); R(c, xx + 1, GY - 5 - hash(x, 3) * 4, 5, 1, '#2a1626'); }
      floor(c, W, H, GY, cam, '#120c14', '#3a1f2a', '#0a070c');
      field(c, W, GY, t, 16, 5, ['#ff8f5a', '#ff5d6c', '#ffb36a'], 0.2, 1.4);
    },
    archive(c, W, H, GY, t, cam) {
      bands(c, W, GY, ['#0f0b09', '#130e0b', '#17110d', '#1b140f']);
      const o1 = Math.round(cam * 0.3), o2 = Math.round(cam * 0.7);
      for (let x = -30 + (o1 % 34); x < W + 30; x += 34) {
        R(c, x, 6, 30, GY - 6, '#211812'); R(c, x, 6, 30, 2, '#3a2a1c');
        for (let sh = 14; sh < GY - 4; sh += 12) {
          R(c, x, sh, 30, 2, '#3a2a1c');
          for (let i = 0; i < 6; i++) { const col = ['#d9c79a', '#b8a272', '#e8d6ad', '#8c7a52'][Math.floor(hash(x + i, sh) * 4)]; R(c, x + 2 + i * 4.5, sh - 6, 3, 6, col); R(c, x + 3 + i * 4.5, sh - 5, 1, 1, '#5a4628'); }
        }
      }
      c.globalAlpha = 0.07; c.fillStyle = '#ffe9b0';
      for (let k = 0; k < 3; k++) { const bx = (k * 90 + o2) % (W + 60) - 30; c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx + 18, 0); c.lineTo(bx + 60, GY); c.lineTo(bx + 34, GY); c.fill(); }
      c.globalAlpha = 1;
      for (let x = -20 + (Math.round(cam) % 70); x < W + 20; x += 70) { R(c, x, 0, 8, GY, '#2a1e15'); R(c, x, 0, 2, GY, '#3d2c1e'); R(c, x + 7, 0, 1, GY, '#160f0a'); }
      R(c, 0, GY, W, H - GY, '#2a1c12'); R(c, 0, GY, W, 1, '#5a4028');
      for (let y = GY + 3; y < H; y += 4) R(c, 0, y, W, 1, '#1e140c');
      for (let x = (Math.round(cam) % 23) - 23; x < W; x += 23) R(c, x, GY + 1, 1, H - GY, '#1e140c');
      field(c, W, GY, t, 22, 9, ['#ffe9b0', '#d9c79a'], 0.4, 0);
    },
    vault(c, W, H, GY, t, cam) {
      bands(c, W, GY, ['#070d10', '#091115', '#0b151a', '#0d191f']);
      const o1 = Math.round(cam * 0.25), vx = Math.round(W * 0.55) + o1, vy = 36;
      for (let r = 34; r > 0; r -= 1) disc(c, vx, vy, r, r > 31 ? '#1a262e' : r > 28 ? '#0e161b' : r % 6 === 0 ? '#22323c' : '#141e25');
      c.strokeStyle = '#2f4450'; c.lineWidth = 2;
      for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2 + t / 6000; c.beginPath(); c.moveTo(vx, vy); c.lineTo(Math.round(vx + Math.cos(an) * 14), Math.round(vy + Math.sin(an) * 14)); c.stroke(); }
      R(c, vx - 3, vy - 3, 6, 6, '#3a5260');
      for (let y = 4; y < GY; y += 9) for (let x = (o1 % 9) - 9; x < W; x += 9) R(c, x, y, 1, 1, '#1d2a32');
      const o2 = Math.round(cam * 0.7);
      for (let x = -30 + (o2 % 60); x < W + 30; x += 60) {
        pile(c, x + 10, GY, 12, 9, x);
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { R(c, x + 26 + i * 8, GY - 30 + j * 8, 7, 7, '#1e2b33'); R(c, x + 29 + i * 8, GY - 27 + j * 8, 1, 1, '#d9b45b'); }
      }
      R(c, 0, GY, W, H - GY, '#0c1418'); R(c, 0, GY, W, 1, '#2a4a4a');
      const o3 = ((Math.round(cam) % 8) + 8) % 8;
      for (let y = GY + 1; y < H; y += 4) for (let x = -8 + o3 + ((y - GY) % 8 === 1 ? 4 : 0); x < W; x += 8) R(c, x, y, 4, 4, '#111d22');
      field(c, W, GY, t, 14, 13, ['#6fe8cc', '#d9b45b'], 0.3, 0.6);
    },
    graveyard(c, W, H, GY, t, cam) {
      bands(c, W, GY, ['#0b0a1c', '#100d24', '#15112b', '#1b1532', '#211a38']);
      field(c, W, GY - 30, t, 30, 17, ['#4a4a7a', '#8a8ac0'], 0.05, 0);
      const mx = Math.round(W * 0.78 + cam * 0.1);
      glow(c, mx, 18, 26, '#b8b2ea', 0.06); disc(c, mx, 18, 10, '#d8d4ff');
      [[mx - 3, 15, 2], [mx + 4, 20, 2.5], [mx - 1, 23, 1.5]].forEach(([x, y, r]) => disc(c, x, y, r, '#b8b2ea'));
      const o1 = Math.round(cam * 0.3);
      c.fillStyle = '#120e22';
      for (let x = -20; x < W + 20; x += 2) { const h = 10 + Math.sin((x + o1) / 23) * 6 + Math.sin((x + o1) / 9) * 2; c.fillRect(x, GY - 12 - h, 2, h + 12); }
      const o2 = Math.round(cam * 0.6);
      for (let x = -30 + (o2 % 80); x < W + 30; x += 80) {
        R(c, x, GY - 40, 3, 40, '#0a0814');
        [[-8, 12, -1], [6, 18, 1], [-6, 24, -1], [5, 8, 1]].forEach(([l, y, d]) => { for (let i = 0; i < Math.abs(l); i++) R(c, x + 1 + i * d, GY - 40 + y - Math.round(i / 2), 1, 1, '#0a0814'); });
      }
      for (let x = (Math.round(cam * 0.8) % 6) - 6; x < W; x += 6) { R(c, x, GY - 12, 1, 12, '#1c1830'); R(c, x, GY - 13, 1, 1, '#2e2850'); }
      R(c, 0, GY - 9, W, 1, '#1c1830');
      // the three dead branches
      const gx = Math.round(W * 0.36 + cam);
      [0, 1, 2].forEach(k => {
        const x = gx + k * 15, y = GY - 15 + (k === 1 ? -2 : 0), shake = state.shakeGraves > 0 ? Math.round(Math.sin(t / 30 + k) * 1) : 0;
        R(c, x + shake, y + 2, 12, 15, '#3a4258'); R(c, x + 1 + shake, y, 10, 2, '#3a4258'); R(c, x + 2 + shake, y - 1, 8, 1, '#3a4258');
        R(c, x + shake, y + 2, 1, 15, '#56607a'); R(c, x + 11 + shake, y + 2, 1, 15, '#262c3e');
        txt(c, String(k + 1), x + 4 + shake, y + 4, '#1a1e2c');
        R(c, x + 2 + shake, y + 13, 3, 1, '#3f6b3a');
      });
      R(c, 0, GY, W, H - GY, '#14121e'); R(c, 0, GY, W, 1, '#2e2a44');
      for (let x = (Math.round(cam) % 5) - 5; x < W; x += 5) R(c, x, GY - 1, 1, 1, '#2a3a2a');
      c.globalAlpha = 0.16;
      for (let x = 0; x < W; x++) { const h = 3 + Math.round(2 * Math.sin((x + t * 0.012) / 9) + 1.5 * Math.sin((x - t * 0.02) / 5)); R(c, x, GY - h, 1, h + 2, '#b8b2ea'); }
      c.globalAlpha = 1;
      field(c, W, GY, t, 10, 19, ['#9ff6ff', '#7f62b8'], 0.15, 0.5);
    },
    swamp(c, W, H, GY, t, cam) {
      bands(c, W, GY, ['#0a1418', '#0c1a1c', '#0f2020', '#122624', '#162c26']);
      const o1 = Math.round(cam * 0.3);
      for (let x = -20; x < W + 20; x += 2) { const h = 22 + Math.sin((x + o1) / 13) * 8 + hash(Math.floor((x + o1) / 6), 2) * 6; R(c, x, GY - h, 2, h, '#0a1612'); }
      const o2 = Math.round(cam * 0.6);
      for (let x = -40 + (o2 % 64); x < W + 40; x += 64) {
        R(c, x, GY - 26, 22, 9, '#1d3a2e'); R(c, x + 1, GY - 25, 20, 7, '#24483a'); R(c, x + 15, GY - 25, 1, 7, '#1d3a2e');
        R(c, x + 3, GY - 23, 8, 3, '#2f5c48'); R(c, x + 17, GY - 22, 3, 1, '#7ee0a0');
      }
      for (let x = (Math.round(cam) % 9) - 9; x < W; x += 9) for (let i = 0; i < 3; i++) R(c, x + i * 2, GY - 6 - hash(x, i) * 8, 1, 8, i === 1 ? '#2f5c48' : '#1d3a2e');
      R(c, 0, GY, W, H - GY, '#0c1f1e'); R(c, 0, GY, W, 1, '#2f5c48');
      for (let y = GY + 2; y < H; y += 3) for (let x = 0; x < W; x += 12) R(c, x + ((t / 120 + y * 3) % 12), y, 4, 1, '#14302c');
      [[0.2, 4], [0.5, 8], [0.85, 5]].forEach(([fx, y]) => { const x = Math.round(W * fx + cam); R(c, x, GY + y, 8, 2, '#2a6a3e'); R(c, x + 1, GY + y, 2, 1, '#5fd38d'); });
      field(c, W, GY, t, 18, 23, ['#e8ff8a', '#7ee0a0'], 0.3, 0);
    },
    rampart(c, W, H, GY, t, cam) {
      bands(c, W, GY, ['#0a0a16', '#0e0d1a', '#13101d', '#191320']);
      field(c, W, 30, t, 20, 29, ['#5a5a8a'], 0.05, 0);
      const o1 = Math.round(cam * 0.25);
      c.fillStyle = '#100e1c';
      for (let x = -20; x < W + 20; x += 2) { const h = 14 + Math.abs(((x + o1) % 60) - 30) * 0.6; c.fillRect(x, GY - 30 - h, 2, h); }
      const o2 = Math.round(cam * 0.6);
      R(c, 0, GY - 34, W, 34, '#1f2230');
      for (let y = GY - 34; y < GY; y += 6) for (let x = ((o2 % 14) + 14) % 14 - 14 + ((y / 6) % 2 ? 7 : 0); x < W; x += 14) { R(c, x, y, 13, 5, '#262a3a'); R(c, x, y, 13, 1, '#2e3346'); }
      for (let x = -6 + (o2 % 16); x < W; x += 16) R(c, x, GY - 40, 9, 6, '#262a3a');
      for (let x = -30 + (o2 % 90); x < W + 30; x += 90) {
        R(c, x, GY - 30, 2, 8, '#3a2a1a');
        const fl = Math.floor(t / 90) % 3;
        R(c, x - 1, GY - 33 - fl, 4, 3 + fl, '#ff9f43'); R(c, x, GY - 35 - fl, 2, 3, '#ffd28a'); R(c, x, GY - 32, 2, 1, '#fff1c2');
        glow(c, x + 1, GY - 32, 15 + fl, '#ff9f43', 0.07);
        R(c, x + 30, GY - 32, 8, 18, '#5a1a2a'); R(c, x + 30, GY - 32, 8, 2, '#d9b45b'); R(c, x + 33, GY - 26, 2, 2, '#d9b45b');
      }
      R(c, 0, GY, W, H - GY, '#1a1c26'); R(c, 0, GY, W, 1, '#3a3e52');
      const o3 = ((Math.round(cam) % 20) + 20) % 20;
      for (let y = GY + 1; y < H; y += 6) for (let x = -20 + o3 + (((y - GY) / 6) % 2 ? 10 : 0); x < W; x += 20) R(c, x, y, 1, 6, '#12131a');
      for (let y = GY + 6; y < H; y += 6) R(c, 0, y, W, 1, '#12131a');
      field(c, W, GY, t, 12, 31, ['#ffb35a', '#ff9f43'], 0.2, 1.2);
    },
    workshop(c, W, H, GY, t, cam) {
      R(c, 0, 0, W, GY, '#2a1c14');
      const o1 = Math.round(cam * 0.3);
      for (let x = (o1 % 12) - 12; x < W; x += 12) R(c, x, 0, 1, GY, '#22160f');
      const wx = Math.round(W * 0.42) + o1;
      ['#ff9f6a', '#ff8a7a', '#e0708a', '#9a5a8a'].forEach((col, i) => R(c, wx, 10 + i * 7, 40, 7, col));
      R(c, wx + 6, 22, 10, 6, '#ffd28a');
      R(c, wx - 2, 8, 44, 2, '#5a3418'); R(c, wx - 2, 38, 44, 3, '#5a3418'); R(c, wx - 2, 8, 2, 32, '#5a3418'); R(c, wx + 40, 8, 2, 32, '#5a3418'); R(c, wx + 19, 8, 2, 32, '#5a3418');
      c.globalAlpha = 0.08; c.fillStyle = '#ffd28a'; c.beginPath(); c.moveTo(wx, 40); c.lineTo(wx + 40, 40); c.lineTo(wx + 70, GY); c.lineTo(wx + 10, GY); c.fill(); c.globalAlpha = 1;
      const o2 = Math.round(cam * 0.6);
      for (let x = -30 + (o2 % 110); x < W + 30; x += 110) {
        R(c, x, 30, 36, 2, '#5a3418');
        ['#4da3ff', '#d9b45b', '#ff5d6c', '#5fd38d', '#e8eef7'].forEach((col, i) => { R(c, x + 2 + i * 7, 24, 5, 6, '#c9d6e8'); R(c, x + 2 + i * 7, 26, 5, 4, col); });
        R(c, x + 4, 50, 2, 14, '#8c5a2e'); R(c, x + 3, 48, 4, 3, '#2a2a33'); R(c, x + 10, 52, 2, 12, '#8c5a2e'); R(c, x + 9, 50, 4, 3, '#ff5d6c');
      }
      R(c, 0, GY, W, H - GY, '#4a301c'); R(c, 0, GY, W, 1, '#8c5a2e');
      for (let y = GY + 4; y < H; y += 4) R(c, 0, y, W, 1, '#3a2414');
      [[0.15, '#4da3ff'], [0.6, '#ff5d6c'], [0.8, '#d9b45b']].forEach(([fx, col]) => { const x = Math.round(W * fx + cam); R(c, x, GY + 5, 5, 2, col); R(c, x + 1, GY + 4, 2, 1, col); R(c, x + 6, GY + 7, 1, 1, col); });
      field(c, W, GY, t, 16, 37, ['#ffe9b0'], 0.3, 0);
    },
    datacenter(c, W, H, GY, t, cam) {
      bands(c, W, GY, ['#050a14', '#071019', '#09151f', '#0b1a26']);
      const o1 = Math.round(cam * 0.25), o2 = Math.round(cam * 0.6);
      for (let x = -20 + (o1 % 14); x < W + 20; x += 14) rack(c, x, GY - 52, 10, 30, t, ['#4dd8e0', '#5fd38d', '#0d2a30'], 3);
      R(c, 0, 4, W, 3, '#0f2030'); for (let x = (o2 % 10) - 10; x < W; x += 10) R(c, x, 7, 1, 4, '#0f2030');
      for (let x = -30 + (o2 % 34); x < W + 30; x += 34) rack(c, x, GY - 44, 18, 44, t + 999, ['#4dd8e0', '#4da3ff', '#5fd38d', '#0d2a30'], 4);
      R(c, 0, GY, W, H - GY, '#0a141e'); R(c, 0, GY, W, 1, '#4dd8e0');
      const o3 = ((Math.round(cam) % 12) + 12) % 12;
      for (let x = -12 + o3; x < W; x += 12) R(c, x, GY + 1, 1, H - GY, '#14283a');
      R(c, 0, GY + 6, W, 1, '#14283a');
      for (let y = GY + 3; y < H; y += 3) for (let x = -12 + o3 + 3; x < W; x += 6) R(c, x, y, 1, 1, '#10202e');
      field(c, W, GY, t, 18, 41, ['#4dd8e0', '#b8f6fa'], 0.1, 1);
    },
    treasure(c, W, H, GY, t, cam) {
      R(c, 0, 0, W, GY, '#160f1c');
      const o1 = Math.round(cam * 0.4);
      for (let y = 0; y < GY; y += 7) for (let x = ((o1 % 16) + 16) % 16 - 16 + ((y / 7) % 2 ? 8 : 0); x < W; x += 16) { R(c, x, y, 15, 6, '#1e1526'); R(c, x, y, 15, 1, '#271c32'); }
      for (let x = -30 + (o1 % 96); x < W + 30; x += 96) {
        const fl = Math.floor(t / 100) % 3;
        R(c, x, 30, 3, 8, '#3a2a1a'); R(c, x - 1, 26 - fl, 5, 4 + fl, '#ff7ad9'); R(c, x, 24 - fl, 3, 2, '#ffd6f3');
        glow(c, x + 1, 28, 16 + fl, '#ff7ad9', 0.07);
      }
      const o2 = Math.round(cam * 0.7);
      for (let x = -40 + (o2 % 120); x < W + 40; x += 120) {
        pile(c, x + 15, GY, 16, 10, x + 7);
        R(c, x + 40, GY - 14, 4, 14, '#7a2a6a'); R(c, x + 41, GY - 18, 2, 4, '#ff7ad9'); R(c, x + 44, GY - 9, 3, 9, '#a03a8a'); R(c, x + 45, GY - 11, 1, 2, '#ffd6f3');
      }
      R(c, 0, GY, W, H - GY, '#1a1222'); R(c, 0, GY, W, 1, '#3a2a48');
      const o3 = ((Math.round(cam) % 14) + 14) % 14;
      for (let x = -14 + o3; x < W; x += 14) R(c, x, GY + 1, 1, H - GY, '#120c18');
      R(c, 0, GY + 7, W, 1, '#120c18');
      field(c, W, GY, t, 16, 43, ['#ffd6f3', '#d9b45b'], 0.2, 0.3);
    },
  };
  const state = { shakeGraves: 0 };
  const FG = { cavern: '#06040a', archive: '#0a0705', vault: '#04090b', graveyard: '#07060f', swamp: '#050c0b', rampart: '#08080e', workshop: '#140c07', datacenter: '#03070c', treasure: '#0a0710' };
  const drawArena = (name, c, W, H, GY, t, cam) => { ARENAS[name](c, W, H, GY, t, cam); foreground(c, W, H, cam, FG[name]); };

  const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  const heart = (c, x, y, col, hi, broken) => {
    HEART.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#' && !(broken && i === 3 && j % 2)) R(c, x + i, y + j, 1, 1, col); }));
    R(c, x + 1, y + 1, 1, 1, hi);
  };
  const gem = (c, x, y) => {
    const G2 = ['..#..', '.###.', '#####', '.###.', '..#..'];
    G2.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') R(c, x - 2 + i, y - 2 + j, 1, 1, j < 2 ? '#fff4cf' : '#d9b45b'); }));
  };

  // one boss frame, rendered with its arena rim light
  const sprite = (b, fp) => { const g = new Grid(b.w0, b.h0, b.k); b.draw(g, fp); return render(g, { rim: b.rim }); };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const copy = (src, pad = 0) => { const c = mk(src.width + pad * 2, src.height + pad * 2); c.getContext('2d').drawImage(src, pad, pad); return c; };
  // hit flash: a light palette flash that flickers instead of a solid white block
  const flashCol = '#fff4d6';
  const hurtLayer = (c, spr, x, y, phase) => {
    // phase 0: strong flash, 1: plain, 2: faint flash
    c.drawImage(spr, x, y);
    if (phase === 1) return;
    c.globalAlpha = phase === 0 ? 0.62 : 0.3; c.drawImage(tinted(spr, flashCol), x, y); c.globalAlpha = 1;
  };
  // Pixel Mimic's misaligned ghost; f = remaining diff (1 = 100%)
  const diffGhost = (c, spr, x, y, f) => {
    const dx = Math.round(7 * f), dy = Math.round(-4 * f);
    if (!dx && !dy) return;
    c.globalAlpha = 0.45; c.drawImage(spr, x + dx, y + dy);
    c.globalAlpha = 0.3; c.drawImage(tinted(spr, '#ff7ad9'), x + dx, y + dy); c.globalAlpha = 1;
  };
  // dissolve threshold per pixel, shared by the battle and the sheet
  const dissolveAt = (xx, yy, h) => hash(xx, yy) * 0.7 + (1 - yy / h) * 0.3;

  // ---------- sprite sheet registry ----------
  const SS = window.SpriteSheet;
  const fakeEnc = b => ({ hp: b.hp, b });
  const frameFor = (b, over = {}, t = 0) => {
    const st = {}; b.init(st); const { __hp, __fl, ...rest } = over; Object.assign(st, rest);
    const enc = fakeEnc(b); if (__hp != null) enc.hp = __hp;
    const fp = b.frame(st, t, enc); if (__fl != null) fp.fl = __fl;
    return sprite(b, fp);
  };
  const registerAll = () => {
    const heroFrames = { idle: 2, run: 2, windup: 1, swing: 1, cast: 1, hurt: 1, victory: 4 };
    Object.entries(heroFrames).forEach(([pose, n]) => SS.add('Raid · Hero', pose[0].toUpperCase() + pose.slice(1),
      Array.from({ length: n }, (_, f) => copy(hero(pose, f).c)), { fps: pose === 'run' ? 9 : pose === 'victory' ? 8 : 3 }));
    BOSSES.forEach(b => {
      const grp = 'Raid · ' + b.name, [ms, n, stride] = b.loop;
      SS.add(grp, 'Idle loop', Array.from({ length: Math.ceil(n / stride) }, (_, i) => frameFor(b, {}, i * stride * ms)), { fps: Math.round(1000 / (ms * stride)), note: `${b.w}x${b.h}px` });
      SS.add(grp, 'Attack: wind-up, strike, recover', [0, 1, 1, 2, 2, 3, 0].map(a => frameFor(b, { atk: a })), { fps: 7 });
      const base = frameFor(b);
      SS.add(grp, 'Hurt (palette flicker)', [0, 1, 2, 1].map(ph => { const c = mk(base.width + 8, base.height); const x = ph === 0 ? 6 : ph === 2 ? 3 : 0; hurtLayer(c.getContext('2d'), base, 8 - x, 0, ph); return c; }), { fps: 10 });
      const tc = mk(base.width, base.height), tx = tc.getContext('2d'); tx.drawImage(base, 0, 0);
      const data = tx.getImageData(0, 0, base.width, base.height).data;
      SS.add(grp, 'Death dissolve', [0, .2, .4, .6, .8, 1].map(d => {
        const c = copy(base), x = c.getContext('2d');
        for (let yy = 0; yy < base.height; yy++) for (let xx = 0; xx < base.width; xx++) {
          const th = dissolveAt(xx, yy, base.height);
          if (th < d) { x.clearRect(xx, yy, 1, 1); if (th > d - 0.06 && data[(yy * base.width + xx) * 4 + 3]) { x.fillStyle = '#fff4d6'; x.fillRect(xx, yy - 2, 1, 1); } }
        }
        return c;
      }), { fps: 6 });
      (b.special || []).forEach(([name, list, fps, note]) => {
        let frames;
        if (list === 'teleport') {
          frames = [0, 1, 2, 3, 4].map(k => { const c = mk(base.width + 40, base.height), x = c.getContext('2d'); const pos = k < 2 ? 40 : 0;
            if (k >= 2) { x.globalAlpha = 0.35 * (1 - (k - 2) / 3); x.drawImage(tinted(base, b.aura), 40, 0); x.globalAlpha = 1; }
            if (k !== 1) x.drawImage(base, pos, 0); else { x.globalAlpha = 0.5; x.drawImage(tinted(base, b.aura), 40, 0); x.globalAlpha = 1; }
            return c; });
        } else if (list === 'diff') {
          frames = [1, 0.6, 0.25, 0].map(f => { const c = mk(base.width + 10, base.height + 6), x = c.getContext('2d'); x.drawImage(base, 0, 6); diffGhost(x, base, 0, 6, f); return c; });
        } else frames = list.map(o => frameFor(b, o));
        SS.add(grp, name, frames, { fps: fps || 4, note: note || '' });
      });
    });
    const W = 320, H = 124, GY = 108;
    Object.keys(ARENAS).forEach(name => SS.add('Raid · Arenas', name[0].toUpperCase() + name.slice(1),
      [0, 300, 600, 900].map(t => { const c = mk(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false; drawArena(name, x, W, H, GY, t, Math.sin(t / 5000) * 8); return c; }), { fps: 4, note: `${W}x${H}, ground at y=${GY}` }));
  };

  window.RaidSprites = {
    Grid, render, tinted, tintC, tintX, txt, R, hash, ease, rad, hero, BOSSES, ARENAS, drawArena, state,
    heart, gem, sprite, hurtLayer, diffGhost, dissolveAt, glow, H: 124, GY: 108,
  };
  try { registerAll(); } catch (e) { console.error('raid sprite sheet', e); }
})();
