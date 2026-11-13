// PROTOTYPE boss alternatives (Claude, file 2 of 3). Throwaway.
// Bosses 4 Stale Access Wraith, 5 Three-Life Dropdown, 6 Gate Without Guards.
// Five original concepts each, drawn in code: shapes go into a material grid,
// then one pass adds hue-shifted shading, contact shadows, selective outlines
// and a rim light. Standalone: needs only document.createElement('canvas').
window.SpriteSheet = window.SpriteSheet || { groups: [], add(group, name, frames, opts = {}) {
  let g = this.groups.find(x => x.name === group); if (!g) this.groups.push(g = { name: group, items: [] });
  const i = g.items.findIndex(x => x.name === name), item = { name, frames, fps: opts.fps || 6, note: opts.note || '' };
  i >= 0 ? (g.items[i] = item) : g.items.push(item);
} };
(() => {
  const TAU = Math.PI * 2, S = Math.sin, C = Math.cos, R = Math.round;
  const hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const COOL = hex('#1d1340'), WARM = hex('#fff2c4'), INK = hex('#06080f');

  // ---------------------------------------------------------------- materials
  // tones run dark to light; shadows drift toward violet, highlights toward cream
  const MATS = [null];
  const mat = (list, o = {}) => {
    let t = list.map(hex);
    if (!o.flat && !o.raw && t.length >= 3) t = t.map((c, i) => {
      const k = i / (t.length - 1);
      return k < 0.5 ? mix(c, COOL, (0.5 - k) * 0.5) : k > 0.6 ? mix(c, WARM, (k - 0.6) * 0.3) : c;
    });
    MATS.push({ t, flat: !!o.flat, shiny: !!o.shiny, free: !!o.free, a: o.a == null ? 255 : o.a });
    return MATS.length - 1;
  };
  // flat: one colour, never shaded. free: a loose particle that takes no outline.
  const flat = (c, o = {}) => mat([c], { ...o, flat: true });

  // 3x5 font for labels that have to fit inside small shapes
  const F3 = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110101101',
    S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', X: '101101010101101',
    Y: '101101010010010', W: '101101111111101', F: '111100110100100', '?': '110001010000010', '-': '000000111000000',
    '!': '010010010000010', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
    '4': '101101111001001', '5': '111100110001110', '9': '111101111001110', ' ': '000000000000000', '.': '000000000000010',
  };

  // ---------------------------------------------------------------- grid
  class Grid {
    constructor(w, h) { this.w = w; this.h = h; this.m = new Uint8Array(w * h); this.p = new Uint16Array(w * h); this.pc = 1; }
    part() { this.pc++; return this; }
    set(x, y, m) {
      x = R(x); y = R(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x; this.m[i] = m; this.p[i] = m ? this.pc : 0;
    }
    get(x, y) { x = R(x); y = R(y); return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.m[y * this.w + x]; }
    px(x, y, m) { this.set(x, y, m); }
    rect(x, y, w, h, m) { x = R(x); y = R(y); w = R(w); h = R(h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, m); }
    ell(cx, cy, rx, ry, m, only) {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5);
          if (dx * dx + dy * dy <= 1 && (only == null || this.get(x, y) === only)) this.set(x, y, m);
        }
    }
    rrect(x, y, w, h, r, m) {
      x = R(x); y = R(y); w = R(w); h = R(h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const cx = Math.min(Math.max(i, r), w - 1 - r), cy = Math.min(Math.max(j, r), h - 1 - r);
        if ((i - cx) ** 2 + (j - cy) ** 2 <= (r + 0.35) ** 2) this.set(x + i, y + j, m);
      }
    }
    dot(x, y, d, m) {
      if (d <= 1) return this.set(x, y, m);
      if (d === 2) return this.rect(Math.floor(x), Math.floor(y), 2, 2, m);
      this.ell(R(x), R(y), (d - 1) / 2, (d - 1) / 2, m);
    }
    line(x0, y0, x1, y1, m, d = 1) {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let i = 0; i <= n; i++) this.dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, d, m);
    }
    // polyline through points with thickness tapering from d0 to d1
    path(pts, m, d0 = 1, d1 = d0) {
      const L = []; let tot = 0;
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, Math.ceil(L[i - 1]));
        for (let s = 0; s <= n; s++) { const k = s / n, d = d0 + (d1 - d0) * (acc + L[i - 1] * k) / (tot || 1); this.dot(ax + (bx - ax) * k, ay + (by - ay) * k, Math.max(1, R(d)), m); }
        acc += L[i - 1];
      }
    }
    // quadratic curve, thickness tapers
    curve(x0, y0, cx, cy, x1, y1, m, d0 = 1, d1 = d0) {
      const pts = []; const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2) + 4;
      for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]); }
      this.path(pts, m, d0, d1);
      return pts;
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
        for (let q = 0; q + 1 < xs.length; q += 2) for (let x = R(xs[q]); x <= R(xs[q + 1]); x++) this.set(x, y, m);
      }
    }
    text(s, x, y, m) {
      x = R(x); y = R(y);
      [...s].forEach((ch, i) => { const b = F3[ch] || F3[' ']; for (let k = 0; k < 15; k++) if (b[k] === '1') this.set(x + i * 4 + k % 3, y + Math.floor(k / 3), m); });
    }
    // swap every pixel of one material for another inside a box (cel shading by hand)
    swap(x, y, w, h, from, to) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (this.get(x + i, y + j) === from) { const pt = this.p[R(y + j) * this.w + R(x + i)]; this.m[R(y + j) * this.w + R(x + i)] = to; this.p[R(y + j) * this.w + R(x + i)] = pt; } }
  }
  const rot = (pts, ox, oy, a) => pts.map(([x, y]) => [ox + x * C(a) - y * S(a), oy + x * S(a) + y * C(a)]);

  // ---------------------------------------------------------------- shading pass
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const render = (g, o = {}) => {
    const { w, h, m, p } = g, W2 = w + 2, H2 = h + 2;
    const rim = o.rim ? hex(o.rim) : null;
    const c = mk(W2, H2), cx = c.getContext('2d'), img = cx.createImageData(W2, H2), d = img.data;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : m[y * w + x];
    const pt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : p[y * w + x];
    const solid = id => id && !MATS[id].free;
    // flat decals do not break the shading of the form under them
    const same = (x, y, id, q) => { const o = at(x, y); if (!solid(o)) return false; if (MATS[o].flat) return true; return o === id && pt(x, y) === q; };
    const box = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const id = m[y * w + x]; if (!id || MATS[id].flat) continue;
      const k = p[y * w + x] * 256 + id, b = box.get(k);
      if (!b) box.set(k, [x, y, x, y]); else { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
    }
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      const id = at(x, y); let col = null, alpha = 255;
      if (id) {
        const M = MATS[id], T = M.t, q = pt(x, y); alpha = M.a;
        if (M.flat) col = T[0];
        else {
          // a later part to the left or above casts a shadow on this one
          let contact = -1;
          [[-1, 0, 0], [0, -1, 0], [1, 0, 1], [0, 1, 1]].forEach(([dx, dy, s]) => {
            const o = at(x + dx, y + dy);
            if (solid(o) && !MATS[o].flat && pt(x + dx, y + dy) > q) contact = contact === 0 ? 0 : s;
          });
          let ds = 4;
          for (let k = 1; k <= 3; k++) if (!same(x, y + k, id, q) || !same(x + k, y, id, q)) { ds = k; break; }
          const up = !same(x, y - 1, id, q), lf = !same(x - 1, y, id, q);
          let tone = 2;
          if (contact >= 0) tone = contact;
          else if (up || lf) tone = ds === 1 ? 2 : (M.shiny && up && lf ? 4 : 3);
          else if (ds === 1) tone = 0;
          else if (ds === 2) tone = 1;
          else {
            const b = box.get(q * 256 + id), bw = b[2] - b[0], bh = b[3] - b[1];
            if (bh >= 8 || bw >= 8) {
              const s = 0.6 * (y - b[1]) / Math.max(1, bh) + 0.4 * (x - b[0]) / Math.max(1, bw);
              if (s > 0.74) tone = 1; else if (s < 0.14) tone = 3;
            }
          }
          col = T[Math.min(tone, T.length - 1)];
          if (rim && contact < 0 && !solid(at(x + 1, y)) && !up && tone <= 2 && T.length > 2) col = mix(T[2], rim, 0.55);
        }
      } else {
        const below = at(x, y + 1), right = at(x + 1, y), above = at(x, y - 1), left = at(x - 1, y);
        const lit = solid(below) ? below : solid(right) ? right : 0;
        if (lit || solid(above) || solid(left)) {
          const src = lit && !solid(above) && !solid(left) ? lit : 0;
          col = src && !MATS[src].flat && MATS[src].t.length > 2 ? mix(MATS[src].t[0], INK, 0.45) : INK;
          const nb = [below, right, above, left].filter(solid);
          alpha = Math.max(...nb.map(n => MATS[n].a));
        }
      }
      if (col) { const i = ((y + 1) * W2 + x + 1) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = alpha; }
    }
    cx.putImageData(img, 0, 0);
    return c;
  };

  // ---------------------------------------------------------------- registry helper
  const SS = window.SpriteSheet;
  const IDLE = 6;
  const concept = (boss, n, name, spec) => {
    const frame = (f, a) => {
      const g = new Grid(spec.w, spec.h); spec.draw(g, f, a, f / IDLE * TAU);
      const c = render(g, { rim: spec.rim });
      return spec.post ? spec.post(c) : c;
    };
    const group = 'Boss alts (Claude) · ' + boss;
    SS.add(group, `Alt ${n} · ${name} · idle`, Array.from({ length: IDLE }, (_, f) => frame(f, 0)), { fps: 6, note: spec.note });
    SS.add(group, `Alt ${n} · ${name} · attack`, [1, 2, 3].map(a => frame(0, a)), { fps: 4, note: spec.note });
  };
  const pick = (a, idle, a1, a2, a3) => [idle, a1, a2, a3][a];

  // shared materials
  const VOID = flat('#03050a'), WHITE = flat('#ffffff');
  const GOLD = mat(['#3d2a0c', '#7d5c22', '#d9b45b', '#f6dd94', '#fff4cf'], { shiny: true });
  const RUST = mat(['#2a1208', '#5e2a10', '#9a4c20', '#c87a3a', '#eeb070']);
  const RUSTD = flat('#3e1a0a');
  const BONE = mat(['#3e3a34', '#7c7466', '#c4b9a0', '#ece2c8']);

  // a small skeleton key, bow on the right, shaft pointing left, teeth down
  const keyH = (g, x, y, len, m, glow) => {
    g.part(); g.ell(x + 3, y, 3, 3, m); g.ell(x + 3, y, 1, 1, 0);
    g.line(x, y, x - len, y, m, 2); g.rect(x - len, y + 2, 2, 3, m); g.rect(x - len + 3, y + 2, 2, 2, m);
    if (glow) [[-len - 2, 0], [-len - 1, -2], [-len - 3, 3], [-len + 1, 6]].forEach(([dx, dy]) => g.px(x + dx, y + dy, glow));
  };
  // vertical key, bow on top
  const keyV = (g, x, y, len, m) => {
    g.part(); g.ell(x, y + 2, 2, 2, m); g.px(x, y + 2, 0);
    g.line(x, y + 4, x, y + 4 + len, m, 1); g.rect(x + 1, y + 2 + len, 2, 1, m); g.rect(x + 1, y + 4 + len, 2, 1, m);
  };

  // =====================================================================
  // 4. STALE ACCESS WRAITH
  // =====================================================================
  const B4 = 'Stale Access Wraith';

  // ---- 4.1 Hourglass Revenant
  const HR = {
    shroud: mat(['#0b1219', '#16242f', '#2a4250', '#4a6e78', '#86aab0']),
    lining: mat(['#06090f', '#0d151d', '#16232c', '#21323c']),
    brass: mat(['#2a1606', '#5a3510', '#97601f', '#d2a04a', '#f8dc98'], { shiny: true }),
    glass: flat('#0f2536'), glassHi: flat('#9fdcea'), glassMid: flat('#2d5468'),
    sand: mat(['#5a2e10', '#9a5a1c', '#d89a3e', '#f6cf78']), grain: flat('#ffd98a', { free: true }),
    eye: flat('#7ff0ff'), eyeC: flat('#e8ffff'), glow: flat('#9ff6ff', { free: true }),
  };
  concept(B4, 1, 'Hourglass Revenant', {
    w: 92, h: 94, rim: '#9fdcea',
    note: 'A revenant whose ribcage is an hourglass running backwards: the race between provisioning, cache and first request, with the stale key still in its hand.',
    draw(g, f, a, t) {
      const X = 16, y = R(S(t) * 1.5) + pick(a, 0, -2, 1, 0), tw = k => R(2.5 * S(t + k * 0.9));
      // mantle behind, tatters underneath
      g.part();
      g.poly([[X + 14, y + 22], [X + 40, y + 22], [X + 50, y + 40], [X + 52, y + 76], [X + 2, y + 76], [X + 4, y + 40]], HR.shroud);
      for (let i = 0; i < 7; i++) { const x = X + 2 + i * 7.2; g.poly([[x, y + 74], [x + 7.2, y + 74], [x + 3 + tw(i), y + 84 + (i % 2) * 3 + tw(i + 3) * 0.5]], HR.shroud); }
      g.part(); g.poly([[X + 16, y + 28], [X + 38, y + 28], [X + 44, y + 74], [X + 10, y + 74]], HR.lining);
      // back arm hangs behind the glass
      g.part(); g.line(X + 42, y + 30, X + 48, y + 50, HR.shroud, 6); g.line(X + 48, y + 52, X + 47, y + 58, BONE, 2);
      // hourglass ribcage
      g.part();
      g.poly([[X + 14, y + 32], [X + 38, y + 32], [X + 37, y + 38], [X + 28, y + 50], [X + 24, y + 50], [X + 15, y + 38]], HR.glass);
      g.poly([[X + 24, y + 51], [X + 28, y + 51], [X + 37, y + 62], [X + 38, y + 69], [X + 14, y + 69], [X + 15, y + 62]], HR.glass);
      // sand clings to the ceiling of the top bulb and drains upward: time running the wrong way
      g.part();
      g.poly([[X + 15, y + 33], [X + 37, y + 33], [X + 35, y + 37], [X + 26, y + 41 + (f % 3 === 0 ? 1 : 0)], [X + 17, y + 37]], HR.sand);
      g.poly([[X + 16, y + 69], [X + 36, y + 69], [X + 33, y + 65], [X + 26, y + 63], [X + 19, y + 65]], HR.sand);
      // ribs seen through the glass
      [42, 46, 55, 59].forEach((ry, i) => { const w = i < 2 ? 8 - i * 3 : 3 + (i - 2) * 3; g.line(X + 26 - w, y + ry, X + 26 + w, y + ry, HR.glassMid); });
      g.line(X + 26, y + 41, X + 26, y + 62, HR.glassMid);
      for (let i = 0; i < 6; i++) { const gy = y + 63 - ((f * 4 + i * 4) % 24); g.px(X + 26 + (i % 2), gy, HR.grain); }
      g.line(X + 16, y + 38, X + 21, y + 44, HR.glassHi); g.line(X + 17, y + 60, X + 16, y + 66, HR.glassHi); g.px(X + 17, y + 39, HR.glassMid); g.line(X + 17, y + 63, X + 17, y + 66, HR.glassMid);
      g.part(); g.line(X + 12, y + 31, X + 12, y + 70, HR.brass, 2); g.line(X + 39, y + 31, X + 39, y + 70, HR.brass, 2);
      g.part(); g.rrect(X + 9, y + 28, 35, 5, 2, HR.brass); g.rrect(X + 9, y + 69, 35, 5, 2, HR.brass);
      // hood and skull, turned toward the hero
      g.part();
      const sw = R(2 * S(t + 1));
      g.poly([[X + 36, y + 6], [X + 52 + sw, y + 9 + sw], [X + 42, y + 15]], HR.shroud);
      g.poly([[X + 25, y + 1], [X + 38, y + 6], [X + 43, y + 20], [X + 41, y + 30], [X + 11, y + 30], [X + 10, y + 18], [X + 15, y + 6]], HR.shroud);
      g.part(); g.ell(X + 22, y + 18, 8, 9.5, VOID);
      g.part(); g.ell(X + 21, y + 17, 6, 6.5, BONE); g.rect(X + 17, y + 22, 8, 4, BONE);
      g.rect(X + 16, y + 15, 3, 3, VOID); g.rect(X + 22, y + 15, 3, 3, VOID); g.px(X + 20, y + 20, VOID);
      [17, 19, 21, 23].forEach(x => g.px(X + x, y + 24, VOID));
      if (f !== 4) { g.px(X + 17, y + 16, a ? HR.eyeC : HR.eye); g.px(X + 23, y + 16, a ? HR.eyeC : HR.eye); }
      g.part(); g.poly([[X + 8, y + 27], [X + 44, y + 27], [X + 40, y + 33], [X + 12, y + 33]], HR.shroud);
      // front arm and the rusted key
      const [hx, hy] = pick(a, [X + 2, y + 47], [X + 6, y + 27], [X - 8, y + 44], [X - 3, y + 46]);
      const [ex, ey] = pick(a, [X + 6, y + 42], [X + 4, y + 38], [X + 2, y + 40], [X + 4, y + 42]);
      g.part(); g.line(X + 14, y + 31, ex, ey, HR.shroud, 6);
      g.part(); g.line(ex, ey, hx, hy, BONE, 2);
      keyH(g, hx - 1, hy, 15, RUST, a === 2 ? HR.glow : 0);
      [[-6, 0], [-11, 1], [-3, -1]].forEach(([dx, dy]) => g.px(hx - 1 + dx, hy + dy, RUSTD));
      g.part(); g.ell(hx, hy, 1.5, 1.5, BONE);
    },
  });

  // ---- 4.2 Keyhole Moth
  const KM = {
    wing: mat(['#140e1e', '#2a2036', '#4a3c5c', '#726184', '#ab9bb8']),
    wingFar: mat(['#0c0814', '#1a1424', '#2c2338', '#3e3250']),
    fur: mat(['#2a1e14', '#5a4430', '#9a7c58', '#d4b88c', '#f4e4c0']),
    vein: flat('#2a2036'), edge: flat('#c9b6d6'), band: flat('#8d7c9e'), margin: flat('#241a30'), collar: flat('#efe0c0'),
    ring: GOLD, eye: flat('#7ff0ff'), eyeHi: flat('#e8ffff'),
    dust: flat('#b8a6c8', { free: true }), dust2: flat('#7a6a8c', { free: true }), leg: flat('#3a2a1e'),
  };
  const FORE = [[0, 0], [2, -8], [8, -24], [18, -36], [32, -40], [42, -36], [42, -26], [32, -14], [14, -3]];
  const HIND = [[2, 3], [16, 0], [30, 6], [36, 16], [30, 26], [18, 26], [8, 16]];
  concept(B4, 2, 'Keyhole Moth', {
    w: 100, h: 90, rim: '#c9b6d6',
    note: 'A dust moth drawn to an access light that should have gone out, its wings marked with keyholes that still glow on another host.',
    draw(g, f, a, t) {
      const y = R(S(t) * 2), bx = 46, by = 50 + y;
      const th = pick(a, 0.28 * S(t) - 0.05, 0.55, -1.25, -0.3);
      const legs = f % 2;
      // far wing, a step behind and darker
      g.part(); g.poly(rot(FORE, bx + 3, by - 2, th - 0.22), KM.wingFar);
      g.part(); g.poly(rot(HIND, bx + 6, by - 1, th * 0.4 + 0.5), KM.wingFar);
      // legs, abdomen, thorax, head
      g.part(); [[38, 4], [44, 5], [50, 4]].forEach(([x, l], i) => g.path([[x, by + 4], [x - 3, by + 8 + ((i + legs) % 2)], [x - 4, by + 8 + l]], KM.leg));
      g.part(); g.ell(64, by + 4, 14, 6.5, KM.fur);
      [58, 64, 70].forEach(x => g.line(x, by - 1, x + 1, by + 9, KM.vein));
      g.part(); g.ell(46, by + 1, 8, 7.5, KM.fur); [[40, by - 4], [39, by - 1], [40, by + 3], [42, by - 6]].forEach(([x, yy]) => g.px(x, yy, KM.collar));
      g.part(); g.ell(34, by + 2, 6, 6, KM.fur);
      g.ell(31, by + 1, 3, 3.5, VOID); g.px(30, by, f === 3 ? KM.eye : KM.eyeHi); g.px(31, by + 2, KM.eye);
      // antennae feathered like key teeth
      g.part();
      const aw = R(S(t + 2));
      const ant = g.curve(34, by - 4, 30, by - 14, 20 + aw, by - 22, KM.leg);
      ant.forEach(([x, yy], i) => { if (i > 3 && i % 2 === 0) g.px(x - 1, yy + 1, KM.leg); });
      // near wings with keyhole eyespots
      g.part(); g.poly(rot(HIND, bx + 2, by - 1, th * 0.4 + 0.12), KM.wing);
      g.part(); const fw = rot(FORE, bx, by - 3, th); g.poly(fw, KM.wing);
      const at = (px, py) => rot([[px, py]], bx, by - 3, th)[0];
      // pale band and a dark outer margin, the classic moth pattern
      g.poly([[12, -18], [20, -30], [26, -33], [20, -20], [14, -10]].map(([px, py]) => at(px, py)), KM.band);
      g.poly([[30, -39], [42, -36], [42, -26], [36, -19], [38, -28]].map(([px, py]) => at(px, py)), KM.margin);
      [[6, -6, 30, -36], [8, -10, 40, -30], [10, -12, 22, -32]].forEach(([x0, y0, x1, y1]) => { const p0 = at(x0, y0), p1 = at(x1, y1); g.line(p0[0], p0[1], p1[0], p1[1], KM.vein); });
      [[34, -38], [40, -33], [41, -28]].forEach(([px, py]) => { const q = at(px, py); g.px(q[0], q[1], KM.edge); });
      const [ex, ey] = at(26, -24), glowing = a === 2 || f % 3 !== 2;
      g.part(); g.ell(ex, ey, 5, 5, KM.ring); g.ell(ex, ey, 3.5, 3.5, VOID);
      g.ell(ex, ey - 1, 1, 1, glowing ? KM.eyeHi : KM.eye); g.poly([[ex - 0.5, ey], [ex + 0.5, ey], [ex + 1.5, ey + 3], [ex - 1.5, ey + 3]], KM.eye);
      const hs = rot([[20, 14]], bx + 2, by - 1, th * 0.4 + 0.35)[0];
      g.part(); g.ell(hs[0], hs[1], 3, 3, KM.ring); g.ell(hs[0], hs[1], 1.5, 1.5, VOID); g.px(hs[0], hs[1], KM.eye);
      // dust shaken loose
      for (let i = 0; i < 6; i++) { const x = 34 + i * 8 + R(S(f + i) * 2), yy = 62 + ((f * 4 + i * 11) % 26); g.px(x, yy, i % 2 ? KM.dust : KM.dust2); }
      if (a === 2) for (let i = 0; i < 14; i++) g.px(4 + (i * 7) % 22, 40 + (i * 5) % 26, i % 3 ? KM.dust : KM.eye);
    },
  });

  // ---- 4.3 Dead-Branch Treant
  const DT = {
    bark: mat(['#120d18', '#251b2e', '#3e3048', '#625070', '#9484a0']),
    barkD: mat(['#0c0910', '#1a1322', '#2a2134', '#3e3048']),
    frost: flat('#cdeeff'), ridge: flat('#7a6a8a'), frost2: flat('#7fb8d8'), eye: flat('#7ff0ff'), eyeC: flat('#e8ffff'),
    string: flat('#6a6280'), leaf: flat('#7a4a5a', { free: true }), leaf2: flat('#a86a5a', { free: true }), knot: flat('#1a1322'),
  };
  concept(B4, 3, 'Dead-Branch Treant', {
    w: 96, h: 96, rim: '#9fc8e8',
    note: 'A frost-bitten treant with three snapped branches for the three unmerged fixes, still dangling a stale key from the last limb it has.',
    draw(g, f, a, t) {
      const sw = R(S(t)), X = 14;
      // roots
      g.part();
      [[-14, 6], [-6, 4], [10, 5], [18, 6]].forEach(([dx, l]) => g.curve(X + 40, 84, X + 40 + dx * 0.6, 88, X + 40 + dx * 1.4, 94, DT.barkD, l, 2));
      // snapped branches behind the crown
      g.part(); g.curve(X + 46, 30, X + 52, 16, X + 60 + sw, 6, DT.barkD, 7, 3); g.line(X + 58 + sw, 5, X + 62 + sw, 6, DT.frost2);
      g.part(); g.curve(X + 54, 38, X + 66, 30, X + 76 + sw, 22, DT.bark, 7, 3);
      g.curve(X + 66, 31, X + 68, 24, X + 66 + sw, 18, DT.bark, 3, 1);
      g.part(); g.curve(X + 36, 32, X + 30, 16, X + 34 - sw, 4, DT.bark, 7, 3);
      g.curve(X + 32, 20, X + 24, 16, X + 22 - sw, 12, DT.bark, 3, 1);
      // jagged snapped tips with frost
      [[X + 76 + sw, 22], [X + 34 - sw, 4]].forEach(([x, y]) => { g.px(x, y - 1, DT.frost); g.px(x + 1, y, DT.frost); g.px(x - 1, y + 1, DT.frost2); });
      // trunk
      g.part();
      g.poly([[X + 28, 30], [X + 33, 26], [X + 38, 29], [X + 44, 25], [X + 50, 29], [X + 57, 27], [X + 58, 40], [X + 55, 56], [X + 59, 72], [X + 67, 88], [X + 17, 88], [X + 26, 72], [X + 30, 56], [X + 27, 40]], DT.bark);
      [[X + 50, 32, X + 48, 52, X + 54, 84], [X + 34, 62, X + 30, 74, X + 26, 86], [X + 44, 64, X + 46, 76, X + 44, 87], [X + 38, 30, X + 36, 36, X + 37, 40]].forEach(([a0, b0, a1, b1, a2, b2]) => g.curve(a0, b0, a1, b1, a2, b2, DT.knot));
      [[X + 52, 34, 14], [X + 29, 64, 10], [X + 46, 66, 12]].forEach(([x, y, l]) => g.line(x + 1, y, x + 1, y + l, DT.ridge));
      g.ell(X + 54, 58, 2, 3, DT.knot); g.line(X + 29, 30, X + 33, 27, DT.frost); g.line(X + 39, 29, X + 44, 26, DT.frost); g.line(X + 51, 29, X + 56, 28, DT.frost2);
      // hollow face
      g.part(); g.ell(X + 32, 44, 3.5, 4.5, VOID); g.ell(X + 44, 44, 3.5, 4.5, VOID);
      g.poly([[X + 31, 54], [X + 45, 53], [X + 43, 60], [X + 39, 57], [X + 36, 61]], VOID);
      if (f !== 2) { const e = a ? DT.eyeC : DT.eye; g.px(X + 31, 44, e); g.px(X + 43, 44, e); g.px(X + 31, 45, DT.eye); g.px(X + 43, 45, DT.eye); }
      // the one living limb and its stale key
      const [hx, hy] = pick(a, [X + 2, 54 + sw], [X + 8, 22], [X - 8, 62], [X - 2, 56]);
      g.part(); g.curve(X + 30, 38, X + 16, pick(a, 36, 26, 46, 40), hx, hy, DT.bark, 7, 2);
      g.curve(hx + 4, hy - 1, hx + 2, hy - 6, hx - 1, hy - 8, DT.bark, 2, 1);
      const sa = pick(a, 0.35 * S(t + 0.6), 0.9, -1.1, -0.5), kx = hx + 11 * S(sa), ky = hy + 11 * C(sa);
      g.part(); g.line(hx, hy + 1, kx, ky, DT.string);
      keyV(g, kx, ky, 9, RUST); g.px(kx, ky + 8, RUSTD);
      for (let i = 0; i < 3; i++) { const lx = X + 8 + i * 24 + R(S(f + i) * 3), ly = 30 + ((f * 6 + i * 21) % 56); g.px(lx, ly, i % 2 ? DT.leaf : DT.leaf2); g.px(lx + 1, ly, DT.leaf); }
    },
  });

  // ---- 4.4 Cache Jellyfish
  const CJ = {
    bell: mat(['#140a2a', '#2c1a58', '#4c3494', '#7e62cc', '#cdb8ff'], { a: 225 }),
    frill: mat(['#3a0a34', '#6e1a5e', '#b0368e', '#e870b8'], { a: 235 }),
    tent: flat('#9e86e0', { a: 210 }), tent2: flat('#6a52b0', { a: 200 }), pulse: flat('#f0e6ff', { free: true }),
    core: flat('#7ff0ff'), coreHi: flat('#e8ffff'), coreD: flat('#2a8aa8'), spot: flat('#b8a0f0'), gloss: flat('#e6dcff'),
  };
  concept(B4, 4, 'Cache Jellyfish', {
    w: 88, h: 96, rim: '#cdb8ff',
    note: 'A cache jellyfish that propagates copies of one key down every tentacle; four refresh, one stays stale and rusted.',
    draw(g, f, a, t) {
      const X = 16, sq = pick(a, R(2 * S(t)), -4, 3, 1), cx = X + 34, cy = 26 + pick(a, R(S(t + 1)), -3, 2, 0);
      const rx = 24 + sq, ry = 17 - sq;
      // tentacles, keys at the ends
      const lash = pick(a, 0, -0.3, 1, 0.4);
      for (let i = 0; i < 5; i++) {
        const x0 = cx - 16 + i * 8, pts = [];
        for (let j = 0; j <= 10; j++) {
          const k = j / 10, sway = 3 * S(t + i * 1.3 + j * 0.6) * k;
          pts.push([x0 + sway - lash * 30 * k * k - (i - 2) * k * 2 * (1 - lash), cy + ry - 2 + j * (5 - lash * 1.6)]);
        }
        g.part(); g.path(pts, i % 2 ? CJ.tent2 : CJ.tent, 3, 2);
        const pj = (f + i * 2) % 10, pp = pts[pj];
        g.px(pp[0], pp[1], CJ.pulse);
        const [ex, ey] = pts[10];
        if (i === 3) { keyV(g, ex, ey, 7, RUST); g.px(ex, ey + 7, RUSTD); g.px(ex - 1, ey + 2, RUSTD); } else { keyV(g, ex, ey, 7, GOLD); if ((f + i) % 3 === 0 || a === 2) g.px(ex - 2, ey + 1, CJ.pulse); }
      }
      // oral frills
      g.part();
      for (let i = 0; i < 3; i++) { const fx = cx - 8 + i * 8, fy = cy + ry - 3; g.curve(fx, fy, fx - 3 + R(2 * S(t + i)), fy + 7, fx + R(2 * S(t + i * 2)) - lash * 6, fy + 13, CJ.frill, 3, 1); }
      // bell: a dome with a scalloped rim
      g.part();
      const dome = [];
      for (let i = 0; i <= 20; i++) { const an = Math.PI + Math.PI * i / 20; dome.push([cx + rx * C(an), cy + ry * S(an)]); }
      for (let i = 0; i <= 8; i++) { const x = cx + rx - (2 * rx) * i / 8; dome.push([x, cy + 4 + (i % 2) * 3]); }
      g.poly(dome, CJ.bell);
      g.curve(cx - rx + 5, cy - 3, cx - rx + 8, cy - ry + 4, cx - 6, cy - ry + 2, CJ.gloss);
      [[-12, -4], [-2, -10], [10, -6], [16, 0], [-18, 2]].forEach(([dx, dy]) => g.px(cx + dx * rx / 24, cy + dy * ry / 17, CJ.spot));
      // key-shaped core inside the bell
      g.part(); const ky = cy - 2;
      g.ell(cx - 1, ky - 3, 3, 3, CJ.coreD); g.poly([[cx - 3, ky - 1], [cx + 1, ky - 1], [cx + 2, ky + 6], [cx - 4, ky + 6]], CJ.coreD);
      g.ell(cx - 1, ky - 3, 1.5, 1.5, f % 3 === 0 || a === 2 ? CJ.coreHi : CJ.core); g.line(cx - 1, ky - 1, cx - 1, ky + 4, CJ.core);
    },
  });

  // ---- 4.5 Stale Badge (bold: flat cel colours, heavy outline)
  const SB = {
    out: flat('#1a0a2a'), card: flat('#f2ecdf'), cardS: flat('#c4b8a4'), band: flat('#ff3d7f'), bandS: flat('#b8205a'),
    photo: flat('#1f6f78'), ghost: flat('#f6fbff'), ghostS: flat('#9fc8d8'), ink: flat('#2a1440'), ok: flat('#b6ff3b'), okS: flat('#5aa81a'),
    rib: flat('#ff3d7f'), ribS: flat('#9a1a4c'), clip: flat('#c8d0e0'), clipS: flat('#6a7088'), back: flat('#3a1c5a'), stripe: flat('#120818'),
    wisp: flat('#d8f4ff', { free: true, a: 200 }), speed: flat('#b6ff3b', { free: true }),
  };
  concept(B4, 5, 'Stale Badge', {
    w: 84, h: 96, rim: null,
    note: 'Bold flat take: a revoked access badge that never got the memo, still flashing OK on a host that missed the update.',
    draw(g, f, a, t) {
      const X = R(pick(a, 0, 6, -14, -4)), Y = R(S(t) * 2) + 30, sway = R(2 * S(t + 0.8));
      const wide = a === 1 ? 10 : 34, cx = 40 + X;
      // ribbon lanyard rising into a wispy tail
      const loop = [[cx - 3, Y], [cx - 9, Y - 10], [cx - 8 + sway, Y - 20], [cx + sway, Y - 26], [cx + 8 + sway, Y - 22], [cx + 8 + sway, Y - 12], [cx + 3, Y]];
      g.part(); g.path(loop, SB.out, 6); g.part(); g.path(loop.slice(0, 5), SB.rib, 4); g.path(loop.slice(4), SB.ribS, 4);
      const tail = [[cx + sway, Y - 26], [cx + 8 + sway * 2, Y - 31], [cx + 18 + sway, Y - 30], [cx + 26 - sway, Y - 34]];
      g.part(); g.path(tail, SB.out, 6, 3); g.part(); g.path(tail, SB.rib, 4, 1);
      [[cx + 29 - sway, Y - 36], [cx + 32, Y - 33 + (f % 2)], [cx + 35, Y - 37 + (f % 3)]].forEach(([x, y]) => g.px(x, y, SB.wisp));
      // clip
      g.part(); g.rect(cx - 4, Y - 2, 8, 6, SB.out); g.rect(cx - 3, Y - 1, 6, 4, SB.clip); g.rect(cx - 3, Y + 2, 6, 1, SB.clipS);
      // ghost hands
      const hw = R(S(t * 2) * 1.5);
      if (a !== 1) [[-1, cx - wide / 2 - 5, Y + 20 + hw], [1, cx + wide / 2 + 5, Y + 22 - hw]].forEach(([s, x, y]) => {
        g.part(); g.ell(x, y, 4, 3, SB.out); g.ell(x, y, 3, 2, SB.ghost); g.px(x + s * 2, y + 1, SB.ghostS); g.px(x - s * 3, y - 2, SB.ghost); g.px(x - s * 1, y - 3, SB.ghost);
      });
      // card
      const L = cx - wide / 2, T = Y + 4, H = 46;
      g.part(); g.rect(L - 1, T - 1, wide + 2, H + 2, SB.out);
      if (a === 1) {
        // turned edge-on, showing the back and its stripe
        g.rect(L, T, wide, H, SB.back); g.rect(L, T + 6, wide, 5, SB.stripe); g.rect(L + wide - 3, T, 3, H, SB.stripe);
        return;
      }
      g.rect(L, T, wide, H, SB.card); g.rect(L, T + H - 4, wide, 4, SB.cardS); g.rect(L + wide - 2, T, 2, H, SB.cardS);
      g.rect(L, T, wide, 9, SB.band); g.rect(L, T + 7, wide, 2, SB.bandS);
      g.text('ACCESS', L + 6, T + 2, SB.card);
      // photo: a ghost face
      g.rect(L + 3, T + 12, 14, 16, SB.out); g.rect(L + 4, T + 13, 12, 14, SB.photo);
      g.ell(L + 10, T + 20, 4, 5, SB.ghost); g.rect(L + 6, T + 22, 9, 5, SB.ghost); g.rect(L + 10, T + 22, 5, 5, SB.ghostS);
      g.px(L + 6, T + 26, SB.photo); g.px(L + 9, T + 26, SB.photo); g.px(L + 12, T + 26, SB.photo);
      const blink = f === 3; g.rect(L + 8, T + 19, 1, blink ? 1 : 2, SB.ink); g.rect(L + 11, T + 19, 1, blink ? 1 : 2, SB.ink);
      // name lines and barcode
      g.rect(L + 19, T + 13, 11, 1, SB.ink); g.rect(L + 19, T + 16, 8, 1, SB.cardS); g.rect(L + 19, T + 19, 10, 1, SB.cardS);
      for (let i = 0; i < 12; i++) if ((i * 7) % 5 !== 1) g.rect(L + 4 + i * 2, T + 32, 1 + (i % 3 === 0), 6, SB.ink);
      // stale OK stamp, flickering
      const lit = a === 2 || f % 3 !== 1;
      g.rect(L + 20, T + 22, 11, 7, lit ? SB.ok : SB.okS); g.text('OK', L + 22, T + 23, SB.ink);
      if (a === 2) for (let i = 0; i < 4; i++) g.rect(L + wide + 4 + i * 2, T + 10 + i * 9, 8 - i, 1, SB.speed);
    },
  });

  // =====================================================================
  // 5. THREE-LIFE DROPDOWN
  // =====================================================================
  const B5 = 'Three-Life Dropdown';
  const arc = (cx, cy, rx, ry, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const an = a0 + (a1 - a0) * i / n; return [cx + rx * C(an), cy + ry * S(an)]; });
  const chevron = (g, x, y, m, up) => { [0, 1, 2, 1, 0].forEach((d, i) => g.px(x + i, up ? y + 2 - d : y + d, m)); };

  // ---- 5.1 Trilife Cat
  const TC = {
    fur: mat(['#16121e', '#2e2840', '#4e4664', '#7a7092', '#b4aac8']),
    furD: mat(['#0e0b14', '#1e1a2a', '#322c44', '#4a425e']),
    cream: mat(['#4a3a34', '#8a7464', '#cdb8a0', '#f0e2cc']),
    eye: flat('#ffd04d'), pupil: flat('#05070d'), nose: flat('#e88aa0'), ink: flat('#1d2a3a'),
    tag: mat(['#5a6478', '#9aa6ba', '#e8eef7', '#ffffff']), tagHi: flat('#4da3ff'), collar: mat(['#0c2a5a', '#1f5aa8', '#4da3ff', '#a8d6ff']),
    claw: flat('#f4f0ff', { free: true }), whisk: flat('#9a90b0', { free: true }), slash: flat('#b4aac8', { free: true }),
  };
  concept(B5, 1, 'Trilife Cat', {
    w: 106, h: 88, rim: '#ffe08a',
    note: 'A cat with nine lives trimmed to three tails, each tagged with a region code it lands on: unique, ambiguous and unknown.',
    draw(g, f, a, t) {
      const X = 6, dy = pick(a, 0, 6, 3, 1), br = R(S(t));
      // three tails, each ending in a region tag
      [['CA', 0, [84, 58], [96, 28], [84, 16]], ['??', 2.1, [78, 66], [104, 54], [94, 38]], ['--', 4.2, [74, 62], [84, 40], [70, 26]]].forEach(([lab, ph, b0, b1, b2], i) => {
        const w = R(3 * S(t + ph)), tip = [X + b2[0] + w, b2[1] + R(2 * S(t + ph + 1))];
        g.part(); g.curve(X + 66, 70, X + b1[0] - 6 + w, b1[1], tip[0], tip[1], i === 1 ? TC.furD : TC.fur, 6, 4);
        g.part(); g.rrect(tip[0] - 6, tip[1] - 11, 12, 8, 2, TC.tag); g.text(lab, tip[0] - 4, tip[1] - 9, i === 0 ? TC.tagHi : TC.ink);
      });
      // haunch, body, hind foot
      g.part(); g.ell(X + 60, 64 + dy * 0.5, 15, 15, TC.fur);
      g.part(); g.ell(X + 60, 80, 10, 3, TC.fur);
      g.part(); g.poly([[X + 30, 36 + dy], [X + 50, 38 + dy], [X + 58, 60], [X + 50, 80], [X + 32, 80], [X + 28, 56]], TC.fur);
      g.part(); g.poly([[X + 30, 44 + dy], [X + 38, 46 + dy], [X + 40, 68], [X + 33, 70]], TC.cream);
      // back front leg
      g.part(); g.rect(X + 42, 62, 6, 17, TC.furD); g.ell(X + 44, 80, 4, 2, TC.furD);
      // front leg: the swiping paw
      const [px, py] = pick(a, [X + 34, 80], [X + 30, 48], [X + 8, 54], [X + 24, 66]);
      g.part(); g.line(X + 37, 58, px + 2, py - 2, TC.fur, 6);
      g.part(); g.ell(px, py, 4, 2.5, TC.cream);
      if (a === 1 || a === 2) [[-4, -2], [-4, 0], [-4, 2]].forEach(([cx, cy]) => g.px(px + cx, py + cy, TC.claw));
      if (a === 2) [0, 4, 8].forEach(k => g.curve(px - 6, py - 14 + k, px - 12, py - 4 + k, px - 6, py + 6 + k, TC.slash));
      // head
      const hy = 30 + dy + (a === 0 ? br * 0 : 0), ear = f === 2 ? 2 : 0;
      g.part(); g.poly([[X + 26, hy - 6], [X + 26 + ear, hy - 20], [X + 35, hy - 9]], TC.fur); g.poly([[X + 38, hy - 9], [X + 46, hy - 21], [X + 48, hy - 5]], TC.fur);
      g.part(); g.ell(X + 36, hy, 13, 11, TC.fur);
      g.poly([[X + 28, hy - 8], [X + 27, hy - 16], [X + 32, hy - 9]], TC.nose); g.poly([[X + 41, hy - 9], [X + 45, hy - 17], [X + 46, hy - 7]], TC.nose);
      g.part(); g.ell(X + 26, hy + 5, 6, 4.5, TC.cream);
      g.px(X + 21, hy + 2, TC.nose); g.px(X + 22, hy + 2, TC.nose); g.line(X + 22, hy + 5, X + 24, hy + 6, TC.ink);
      if (f === 4 && !a) g.line(X + 27, hy - 1, X + 32, hy - 1, TC.ink);
      else { g.ell(X + 30, hy - 2, 3, 2, TC.eye); g.line(X + 29, hy - 4, X + 29, hy, TC.pupil); if (a) g.px(X + 30, hy - 2, TC.pupil); g.ell(X + 41, hy - 2, 2, 2, TC.eye); g.line(X + 41, hy - 3, X + 41, hy - 1, TC.pupil); }
      [[3, -1], [3, 2]].forEach(([wx, wy]) => g.line(X + 20, hy + 4, X + 20 - wx * 3, hy + 4 + wy, TC.whisk));
      // collar with a select-box tag
      g.part(); g.curve(X + 28, hy + 10, X + 38, hy + 14, X + 48, hy + 8, TC.collar, 3);
      g.part(); g.rrect(X + 30, hy + 13, 12, 7, 2, TC.tag); g.rect(X + 37, hy + 13, 1, 7, TC.tagHi); chevron(g, X + 38, hy + 15, TC.ink);
    },
  });

  // ---- 5.2 Matryoshka Menu
  const MM = {
    lac: mat(['#2a0610', '#5e0f1e', '#a3202e', '#e04848', '#ffb0a0'], { shiny: true }),
    lac2: mat(['#06222a', '#0e4450', '#1f7a84', '#4ec0c0', '#b8f4ec'], { shiny: true }),
    face: mat(['#7a4a3a', '#c08a70', '#f2d2b4', '#fff0dc']),
    apron: mat(['#5a3a10', '#a0742a', '#e8c070', '#fff0c0']),
    hair: flat('#1a0e14'), cheek: flat('#ff7a8a'), lip: flat('#c0203a'), eye: flat('#1a1030'), seam: flat('#d9b45b'), gap: flat('#120408'),
    field: flat('#f6f8fc'), fieldS: flat('#b8c4d6'), ink: flat('#1d2a3a'), sel: flat('#4da3ff'), dot: flat('#fff4cf'), leaf: flat('#3a8a5a'),
  };
  const dollFace = (g, cx, cy, r, f, mats) => {
    g.part(); g.ell(cx, cy, r, r * 0.95, mats.face);
    g.ell(cx + 1, cy - r * 0.55, r * 0.95, r * 0.35, MM.hair, mats.face);
    const blink = f === 5; const ex = R(r * 0.4);
    if (blink) { g.line(cx - ex - 1, cy, cx - ex + 1, cy, MM.eye); g.line(cx + ex - 1, cy, cx + ex + 1, cy, MM.eye); }
    else { g.rect(cx - ex - 1, cy - 1, 2, 2, MM.eye); g.rect(cx + ex - 1, cy - 1, 2, 2, MM.eye); }
    if (r > 6) { g.rect(cx - ex - 3, cy + 2, 2, 2, MM.cheek); g.rect(cx + ex + 1, cy + 2, 2, 2, MM.cheek); }
    g.rect(cx - 1, cy + R(r * 0.5), 2, 1, MM.lip);
  };
  concept(B5, 2, 'Matryoshka Menu', {
    w: 76, h: 94, rim: '#ffd08a',
    note: 'A nesting doll with a region dropdown painted on her apron: knock the shell off and a smaller copy of the same bug is waiting inside.',
    draw(g, f, a, t) {
      const cx = 40, seam = 54, rock = R(S(t) * 1.5);
      const lift = pick(a, f === 3 ? 2 : f === 4 ? 3 : 0, 16, 2, 6), shx = pick(a, rock, 2, -12, -3);
      // lower shell
      g.part(); g.poly([[cx - 24, seam], ...arc(cx, 68, 24, 24, Math.PI + 0.62, 0 - 0.62 + TAU, 0).slice(0, 0), ...arc(cx, 68, 24, 24, Math.PI * 2 - 0.62, Math.PI * 2 + Math.PI + 0.62, 28)], MM.lac);
      g.ell(cx, 91, 18, 2, MM.lac);
      g.part(); g.poly(arc(cx - 1, 72, 16, 18, -0.9, Math.PI + 0.9, 20), MM.apron);
      [[cx - 14, 82], [cx + 12, 80], [cx - 8, 88], [cx + 6, 88]].forEach(([x, y]) => { g.px(x, y, MM.dot); g.px(x + 1, y + 1, MM.leaf); });
      // the painted dropdown
      g.part(); g.rect(cx - 13, 64, 26, 9, MM.field); g.rect(cx - 13, 72, 26, 1, MM.fieldS); g.text('CA', cx - 10, 66, MM.ink); g.rect(cx + 4, 64, 9, 9, MM.sel); chevron(g, cx + 6, 67, MM.field);
      g.rect(cx - 13, 73, 26, 6, MM.field); g.text('CO', cx - 10, 74, MM.fieldS);
      g.part(); g.rect(cx - 19, seam, 39, 2, MM.seam);
      // a smaller doll inside, seen when the shell lifts
      if (lift > 1) { g.part(); g.rect(cx - 18, seam - Math.min(lift, 6), 37, Math.min(lift, 6), MM.gap); }
      if (lift > 5) { g.part(); g.ell(cx, seam - 2, 15, 8, MM.lac2); dollFace(g, cx - 2, seam - 10, 7, f, { face: MM.face }); g.part(); g.ell(cx, seam - 13, 9, 3, MM.lac2, 0); }
      // upper shell: shoulders and head scarf
      const ux = cx + shx, uy = -lift;
      g.part();
      g.poly([...arc(ux, 68 + uy, 24, 24, Math.PI + 0.62, Math.PI * 2 - 0.62, 16), [ux + 20, seam + uy], [ux - 20, seam + uy]], MM.lac);
      g.ell(ux, 30 + uy, 17, 17, MM.lac);
      g.rect(ux - 19, seam - 2 + uy, 39, 2, MM.seam);
      [[ux - 13, 40], [ux + 13, 42], [ux - 6, 47], [ux + 8, 48]].forEach(([x, y]) => { g.px(x, y + uy, MM.dot); g.px(x - 1, y + 1 + uy, MM.dot); g.px(x + 1, y + 1 + uy, MM.leaf); });
      dollFace(g, ux - 3, 29 + uy, 11, f, { face: MM.face });
      g.part(); g.curve(ux - 14, 18 + uy, ux, 10 + uy, ux + 14, 18 + uy, MM.seam, 1);
    },
  });

  // ---- 5.3 Accordion Worm
  const AW = {
    pill: mat(['#2a3448', '#6a7890', '#c8d2e2', '#f2f6fb']),
    sel: mat(['#0c2a5a', '#1f5aa8', '#4da3ff', '#a8d6ff']),
    head: mat(['#08241f', '#14483c', '#2a8068', '#5ec4a0', '#c0f4dc'], { shiny: true }),
    ink: flat('#1d2a3a'), inkL: flat('#ffffff'), leg: flat('#14202e'), eye: flat('#ffffff'), pupil: flat('#05070d'), mouth: flat('#f2f6fb'), thumb: mat(['#1a2230', '#3a4658', '#6a7890', '#9aa6ba']),
  };
  concept(B5, 3, 'Accordion Worm', {
    w: 112, h: 84, rim: '#a8ffd8',
    note: 'An inchworm built from dropdown options, CA, CO, CT and worse: every time you think it is fixed, another segment of the list turns up.',
    draw(g, f, a, t) {
      const labs = ['CA', 'CO', 'CT', '??', '--'], sp = pick(a, 14, 12, 16, 14), hx = pick(a, 8, 12, 0, 6), hy = pick(a, 30, 12, 38, 30);
      const segs = labs.map((l, i) => {
        const x = hx + 38 + i * sp, arch = a === 1 ? 8 : 22;
        return [x, 66 - arch * S(Math.PI * (i + 0.6) / 5.4) + R(2.5 * S(t - i * 1.1))];
      });
      g.part(); g.curve(hx + 22, hy + 22, hx + 26, segs[0][1], segs[0][0] - 2, segs[0][1], AW.head, 9, 7);
      const [tx, ty] = segs[4];
      g.part(); g.rrect(tx + 10, ty - 4 + R(S(t)), 6, 15, 3, AW.thumb); g.rect(tx + 12, ty + R(S(t)), 2, 6, AW.ink);
      for (let i = 4; i >= 0; i--) {
        const [x, y] = segs[i], sel = i === (a === 2 ? 2 : (f >> 1) % 3);
        g.part(); g.line(x - 4, y + 7, x - 5 + ((f + i) % 2), y + 13, AW.leg, 2); g.line(x + 4, y + 7, x + 3 + ((f + i + 1) % 2), y + 13, AW.leg, 2);
        g.part(); g.rrect(x - 9, y - 8, 19, 15, 4, sel ? AW.sel : AW.pill);
        g.text(labs[i], x - 3, y - 3, sel ? AW.inkL : AW.ink);
      }
      // neck and select-box head
      g.part(); g.rrect(hx, hy, 32, 26, 6, AW.head);
      g.rect(hx + 22, hy + 3, 1, 20, AW.leg);
      const blink = f === 4 && !a;
      [[hx + 7, hy + 9], [hx + 15, hy + 9]].forEach(([ex, ey]) => { if (blink) g.line(ex - 2, ey, ex + 2, ey, AW.pupil); else { g.ell(ex, ey, 3, 3, AW.eye); g.rect(ex - 2, ey - 1, 2, 3, AW.pupil); } });
      // the chevron is its mouth: it flips open on the strike
      if (a === 2) { g.poly([[hx + 3, hy + 15], [hx + 19, hy + 15], [hx + 11, hy + 23]], VOID); [0, 5, 10].forEach(k => g.px(hx + 6 + k, hy + 16, AW.mouth)); }
      else { chevron(g, hx + 8, hy + 16, AW.mouth, a === 1); chevron(g, hx + 9, hy + 16, AW.mouth, a === 1); }
      chevron(g, hx + 24, hy + 11, AW.mouth);
    },
  });

  // ---- 5.4 Phoenix Picker
  const PP = {
    plume: mat(['#2a0a1a', '#6a1626', '#c0382a', '#f07a2a', '#ffd070'], { shiny: true }),
    wing: mat(['#2a0a1e', '#6a1430', '#b42c34', '#ee6a34', '#ffc070']),
    beak: mat(['#4a2a08', '#9a6a1a', '#e8b84a', '#fff0a8']),
    fl: flat('#ffb030'), fl2: flat('#fff2b0'), fl3: flat('#ff6a2a'), eye: flat('#fff2b0'), pupil: flat('#1a0610'),
    card: mat(['#0c1a3a', '#1e3a66', '#3d6fb8', '#7aaee8']), chip: flat('#d9b45b'), ember: flat('#ffb030', { free: true }), ember2: flat('#ff6a2a', { free: true }),
    ash: mat(['#14121a', '#2a2630', '#4a4450', '#6e6676']),
  };
  const FEATH = [[0, 0], [8, -14], [18, -30], [30, -38], [38, -34], [34, -26], [40, -22], [34, -14], [38, -8], [28, -4], [26, 2], [12, 4]];
  concept(B5, 4, 'Phoenix Picker', {
    w: 100, h: 94, rim: '#ffd070',
    note: 'A firebird that burns down and rises again, three tail flames for three lives, clutching a stored card with no subscription behind it.',
    draw(g, f, a, t) {
      const y = R(S(t) * 2), th = pick(a, 0.2 * S(t), 0.45, -0.9, -0.2), bx = 52, by = 42 + y;
      // ash heap it rose from
      g.part(); g.ell(54, 90, 22, 4, PP.ash); g.ell(48, 87, 10, 3, PP.ash);
      // far wing
      g.part(); g.poly(rot(FEATH, bx + 4, by - 2, th - 0.35), PP.wing);
      // three tail plumes, a flame eye on each
      [[0, 92, 82], [1.5, 82, 88], [3, 70, 86]].forEach(([ph, ex, ey], i) => {
        const w = R(3 * S(t + ph)), tip = [ex + w, ey - 6 + R(S(t + ph))];
        g.part(); g.curve(bx + 6, by + 14, bx + 22 + w, by + 26, tip[0], tip[1], i === 1 ? PP.wing : PP.plume, 7, 4);
        g.part(); g.ell(tip[0], tip[1], 3, 3, PP.fl); g.ell(tip[0], tip[1], 1, 1, (f + i) % 3 === 0 ? PP.fl2 : PP.fl3);
        g.px(tip[0] + 1, tip[1] - 4 - ((f + i) % 2), PP.fl);
      });
      // body
      g.part(); g.poly([[bx - 10, by - 6], [bx + 4, by - 10], [bx + 14, by + 6], [bx + 8, by + 20], [bx - 6, by + 18], [bx - 13, by + 6]], PP.plume);
      // talons and the stored card
      g.part(); g.rrect(bx - 10, by + 22, 14, 9, 2, PP.card); g.rect(bx - 10, by + 24, 14, 2, VOID); g.rect(bx - 8, by + 27, 3, 2, PP.chip);
      g.part(); [[-6, 0], [0, 1]].forEach(([dx, dd]) => { g.line(bx + dx, by + 17, bx + dx - 1, by + 23, PP.beak); g.px(bx + dx - 2, by + 23 + dd, PP.beak); g.px(bx + dx + 1, by + 23, PP.beak); });
      // neck and head
      const hk = pick(a, 0, 3, -3, 0), hx = bx - 14 + hk, hy = by - 14 + (a === 1 ? -2 : 0);
      g.part(); g.line(bx - 6, by - 4, hx + 2, hy + 4, PP.plume, 7);
      g.part(); g.ell(hx, hy, 6.5, 6, PP.plume);
      // crest flames
      [[2, -5, 0], [5, -3, 1], [7, 0, 2]].forEach(([dx, dy, k]) => { const fl = (f + k) % 3; g.part(); g.curve(hx + dx, hy + dy, hx + dx + 4, hy + dy - 6, hx + dx + 9 - fl, hy + dy - 9 - fl, k === 1 ? PP.fl : PP.fl3, 3, 1); });
      g.part(); g.poly([[hx - 5, hy - 1], [hx - 12, hy + 1], [hx - 5, hy + 3]], PP.beak);
      g.rect(hx - 3, hy - 2, 2, 2, PP.eye); g.px(hx - 3, hy - 2, PP.pupil);
      if (a === 2) { g.poly([[hx - 12, hy + 1], [hx - 34, hy - 8], [hx - 38, hy + 2], [hx - 34, hy + 10]], PP.fl3); g.poly([[hx - 12, hy + 1], [hx - 28, hy - 3], [hx - 30, hy + 2], [hx - 28, hy + 6]], PP.fl); g.poly([[hx - 12, hy + 1], [hx - 20, hy], [hx - 20, hy + 3]], PP.fl2); }
      // near wing
      g.part(); const nw = rot(FEATH, bx, by - 4, th); g.poly(nw, PP.wing);
      const wp = (px, py) => rot([[px, py]], bx, by - 4, th)[0];
      [[12, -4, 30, -32], [14, 0, 36, -18], [10, -8, 22, -28]].forEach(([x0, y0, x1, y1]) => { const p0 = wp(x0, y0), p1 = wp(x1, y1); g.line(p0[0], p0[1], p1[0], p1[1], PP.fl3); });
      for (let i = 0; i < 5; i++) { const ex = 34 + i * 10 + R(S(f + i * 2) * 2), ey = 84 - ((f * 5 + i * 13) % 40); g.px(ex, ey, i % 2 ? PP.ember : PP.ember2); }
    },
  });

  // ---- 5.5 Region Roulette (bold: flat cel colours, chunky outline)
  const RR = {
    out: flat('#1a0a2a'), body: flat('#e8434f'), bodyS: flat('#a81f3a'), bodyH: flat('#ff8a8a'), chrome: flat('#dfe6f0'), chromeS: flat('#8a94aa'),
    reel: flat('#fff6e0'), reelS: flat('#d8c8a8'), ink: flat('#1a0a2a'), heart: flat('#ff5d8f'), heartD: flat('#4a1a2a'), lime: flat('#b6ff3b'),
    gold: flat('#ffd04d'), goldS: flat('#c08a1a'), card: flat('#4da3ff'), cardS: flat('#1f5aa8'), slot: flat('#05070d'), tooth: flat('#fff6e0'), blur: flat('#8a7a6a'),
  };
  const HEART5 = ['.#.#.', '#####', '#####', '.###.', '..#..'];
  concept(B5, 5, 'Region Roulette', {
    w: 96, h: 94, rim: null,
    note: 'Bold flat take: a slot machine that keeps rolling region codes, three hearts on the marquee, and a card jammed in its tray with nothing to pay for.',
    draw(g, f, a, t) {
      const X = 10, hop = pick(a, f % 3 === 0 ? 1 : 0, 2, -1, 0);
      const B = (x, y, w, h, fill, shade) => { g.rect(x - 1, y - 1 + hop, w + 2, h + 2, RR.out); g.rect(x, y + hop, w, h, fill); if (shade) g.rect(x + w - 3, y + hop, 3, h, shade); };
      // legs
      g.part(); B(X + 14, 80, 8, 10, RR.chromeS); B(X + 44, 80, 8, 10, RR.chromeS);
      // lever on the right side
      const la = pick(a, -0.15 + 0.08 * S(t), 1.25, 0.6, 0.2), lx = X + 70, ly = 46 + hop;
      const ex = lx + 4 + 16 * S(la + 0.3), ey = ly - 16 * C(la + 0.3);
      g.part(); g.line(lx, ly, ex, ey, RR.out, 4); g.line(lx, ly, ex, ey, RR.chrome, 2);
      g.part(); g.ell(ex, ey, 4, 4, RR.out); g.ell(ex, ey, 3, 3, RR.heart); g.px(ex - 1, ey - 1, RR.bodyH);
      g.part(); B(lx - 2, ly - 4, 6, 9, RR.chrome, RR.chromeS);
      // cabinet
      g.part(); B(X + 4, 26, 64, 56, RR.body, RR.bodyS); g.rect(X + 4, 26 + hop, 64, 2, RR.bodyH);
      // marquee with three hearts (lives)
      g.part(); g.rect(X + 9, 9 + hop, 54, 19, RR.out); g.rect(X + 10, 10 + hop, 52, 17, RR.bodyS); g.rect(X + 12, 12 + hop, 48, 13, RR.out);
      [0, 1, 2].forEach(i => { const on = a === 2 ? i < 1 : true; HEART5.forEach((row, j) => [...row].forEach((ch, k) => { if (ch === '#') g.px(X + 20 + i * 14 + k, 15 + j + hop, on ? RR.heart : RR.heartD); })); });
      [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => g.px(X + 14 + i * 6, 13 + hop + ((i + f) % 2) * 10, (i + f) % 3 === 0 ? RR.lime : RR.gold));
      // reels: labels roll by, the cabinet face clips them
      const labs = ['CA', '??', '--', 'CO'];
      g.part(); g.rect(X + 9, 33 + hop, 54, 18, RR.out);
      [0, 1, 2].forEach(i => {
        const rx = X + 10 + i * 18;
        g.rect(rx, 34 + hop, 16, 16, RR.reel); g.rect(rx, 46 + hop, 16, 4, RR.reelS);
        if (a === 1) { [3, 7, 11].forEach(k => g.rect(rx + k, 34 + hop, 1, 16, RR.blur)); return; }
        const off = a === 2 ? 0 : ((f * (3 + i)) + i * 5) % 32;
        for (let k = -1; k < 5; k++) { const ty = 40 + k * 8 - off % 8, lab = a === 2 ? labs[i] : labs[(k + Math.floor(off / 8) + i + 8) % 4]; if (ty > 33 && ty < 46) g.text(lab, rx + 4, ty + hop, RR.ink); }
      });
      // re-cover the top and bottom of the reel window to clip the rolling text
      g.rect(X + 10, 32 + hop, 52, 2, RR.out); g.rect(X + 10, 50 + hop, 52, 1, RR.out); g.rect(X + 4, 28 + hop, 64, 4, RR.body); g.rect(X + 4, 51 + hop, 61, 4, RR.body);
      // angry brows over the reels
      g.line(X + 12, 30 + hop, X + 22, 31 + hop, RR.out, 2); g.line(X + 48, 31 + hop, X + 58, 30 + hop, RR.out, 2);
      // coin tray mouth with a jammed card
      const open = pick(a, 6, 4, 10, 7);
      g.part(); g.rect(X + 13, 60 + hop, 46, open + 4, RR.out); g.rect(X + 14, 61 + hop, 44, open + 2, RR.slot);
      for (let k = 0; k < 6; k++) { g.rect(X + 16 + k * 7, 61 + hop, 3, 2, RR.tooth); g.rect(X + 16 + k * 7, 61 + open + hop, 3, 2, RR.tooth); }
      g.rect(X + 10, 70 + open - 6 + hop, 52, 3, RR.chrome); g.rect(X + 10, 72 + open - 6 + hop, 52, 1, RR.chromeS);
      g.part(); g.rect(X + 26, 54 + hop, 18, 11, RR.out); g.rect(X + 27, 55 + hop, 16, 9, RR.card); g.rect(X + 27, 58 + hop, 16, 2, RR.cardS); g.rect(X + 29, 61 + hop, 3, 2, RR.gold);
      if (a === 2) [[2, 58], [8, 52], [4, 68], [12, 62], [0, 46]].forEach(([cx, cy], i) => { g.part(); g.ell(cx + 3, cy + hop, 2.5, 2.5, RR.out); g.ell(cx + 3, cy + hop, 1.5, 1.5, i % 2 ? RR.gold : RR.lime); });
    },
  });

  // =====================================================================
  // 6. GATE WITHOUT GUARDS
  // =====================================================================
  const B6 = 'Gate Without Guards';

  // ---- 6.1 Turnstile Beast
  const TB = {
    steel: mat(['#141a24', '#2c3646', '#4e5c72', '#8090a8', '#c8d4e4'], { shiny: true }),
    steelD: mat(['#0c1018', '#1a2230', '#2c3646', '#465264']),
    tube: mat(['#2a3040', '#5a6678', '#a0acc0', '#e8eef7', '#ffffff'], { shiny: true }),
    hazY: flat('#f0c040'), hazK: flat('#16120a'), go: flat('#5aff8a'), goHi: flat('#d8ffe4'), goD: flat('#1a5a2e'), stop: flat('#3a1418'),
    panel: flat('#0a1018'), cap: flat('#16120a'), spark: flat('#fff2b0', { free: true }), spark2: flat('#5aff8a', { free: true }),
  };
  concept(B6, 1, 'Turnstile Beast', {
    w: 104, h: 88, rim: '#5aff8a',
    note: 'A turnstile that walked off its post: the light is stuck on green, so its arms spin for anyone, the way the gateway let any worker take any claim.',
    draw(g, f, a, t) {
      const X = 18, lean = pick(a, 0, 3, -3, 0), bob = f % 3 === 0 ? 1 : 0;
      // crab legs
      [[X + 22, -10, 0], [X + 34, -6, 1], [X + 50, 6, 0], [X + 62, 10, 1]].forEach(([lx, sp, k]) => {
        const lift = (f + k) % 3 === 0 ? 2 : 0, kx = lx + sp, ky = 70 - lift;
        g.part(); g.path([[lx + lean, 72 + bob], [kx + sp * 0.6, 72 - lift], [kx + sp * 0.9, 86 - lift]], k ? TB.steelD : TB.steel, 4, 2);
      });
      // cabinet
      const cy = 16 + bob, L = X + 18 + lean;
      g.part(); g.poly([[L, cy + 10], [L + 16, cy], [L + 50, cy], [L + 50, cy + 58], [L, cy + 58]], TB.steel);
      g.line(L + 2, cy + 30, L + 48, cy + 30, TB.steelD); g.rect(L + 40, cy + 34, 6, 14, TB.panel); g.rect(L + 41, cy + 36, 4, 1, TB.goD);
      g.swap(L, cy + 52, 51, 6, TB.steel, TB.hazY);
      for (let i = 0; i < 10; i++) g.poly([[L + i * 6, cy + 58], [L + i * 6 + 3, cy + 58], [L + i * 6, cy + 52], [L + i * 6 - 3, cy + 52]].map(([x, y]) => [Math.max(L, Math.min(L + 50, x)), y]), TB.hazK);
      g.rect(L, cy + 51, 51, 1, TB.hazK);
      // reader face: a green arrow that never turns red
      g.part(); g.rrect(L + 18, cy + 6, 24, 18, 3, TB.panel);
      const lit = a === 2 || f % 2 === 0;
      g.ell(L + 24, cy + 13, 3, 3, lit ? TB.go : TB.goD); g.px(L + 23, cy + 12, TB.goHi);
      g.ell(L + 34, cy + 13, 3, 3, TB.stop);
      g.line(L + 21, cy + 20, L + 38, cy + 20, TB.goD);
      [0, 1, 2].forEach(i => g.px(L + 22 + i * 6 + (f % 3 === i ? 1 : 0), cy + 20, TB.go));
      // rotor hub on the hero side, three arms
      const hx = L + 4, hy = cy + 22, base = pick(a, f * 0.35, -0.7, 0.9, 0.3);
      g.part(); g.ell(hx, hy, 6, 6, TB.steelD);
      for (let k = 0; k < 3; k++) {
        const an = Math.PI + base + k * TAU / 3, len = a === 2 && k === 0 ? 34 : 24, ex = hx + C(an) * len, ey = hy + S(an) * len * 0.75;
        g.part(); g.line(hx, hy, ex, ey, TB.tube, 3); g.ell(ex, ey, 2, 2, TB.cap);
        if (a === 2 && k === 0) [[-4, -3], [-5, 2], [-2, 5], [-6, -1]].forEach(([dx, dy], i) => g.px(ex + dx, ey + dy, i % 2 ? TB.spark : TB.spark2));
      }
      g.part(); g.ell(hx, hy, 3.5, 3.5, TB.steel); g.px(hx, hy, TB.cap);
    },
  });

  // ---- 6.2 Hollow Sentry
  const HS = {
    bronze: mat(['#0e1c1a', '#1f3d38', '#3a6458', '#6c9a7c', '#c8e0b0'], { shiny: true }),
    bronzeD: mat(['#081210', '#122622', '#1f3d38', '#2e5248']),
    trim: mat(['#3d2a0c', '#7d5c22', '#c9a050', '#f0d890']),
    wood: mat(['#1e1208', '#3a2412', '#5e3c1e', '#8a5e34']),
    blade: mat(['#2c3646', '#6f819e', '#b9c7dc', '#e8eef7', '#ffffff'], { shiny: true }),
    plume: mat(['#3a0a0a', '#7a1a14', '#c8402a', '#ff8a4a']), web: flat('#8a9aa8', { free: true }), mote: flat('#3a6458', { free: true }),
    swish: flat('#e8eef7', { free: true, a: 160 }),
  };
  concept(B6, 2, 'Hollow Sentry', {
    w: 84, h: 96, rim: '#ffb35a',
    note: 'A suit of guard armour with nobody inside: its plates float loose at the joints, nothing holds the post, and the halberd swings on habit.',
    draw(g, f, a, t) {
      const X = 22, d = k => R(1.5 * S(t + k * 1.1));
      // greaves and sabatons, a gap above each
      [[X + 14, 0], [X + 28, 1]].forEach(([x, k]) => {
        g.part(); g.rrect(x - 4, 66 + d(k), 10, 16, 3, k ? HS.bronzeD : HS.bronze);
        g.part(); g.poly([[x - 6, 88], [x + 6, 88], [x + 6, 92], [x - 8, 92]].map(([px, py]) => [px, py + 0 * d(k)]), k ? HS.bronzeD : HS.bronze);
      });
      // tasset skirt
      g.part(); g.poly([[X + 6, 54 + d(2)], [X + 36, 54 + d(2)], [X + 38, 63 + d(2)], [X + 4, 63 + d(2)]], HS.bronze);
      g.line(X + 6, 58 + d(2), X + 36, 58 + d(2), HS.trim);
      // back arm floats
      g.part(); g.rrect(X + 34, 32 + d(3), 8, 14, 3, HS.bronzeD); g.rrect(X + 35, 48 + d(4), 7, 7, 2, HS.bronzeD);
      // breastplate with a dent, hollow at the neck
      g.part(); g.poly([[X + 8, 26 + d(1)], [X + 34, 26 + d(1)], [X + 36, 40 + d(1)], [X + 30, 52 + d(1)], [X + 12, 52 + d(1)], [X + 6, 40 + d(1)]], HS.bronze);
      g.line(X + 21, 28 + d(1), X + 20, 50 + d(1), HS.trim); g.ell(X + 26, 40 + d(1), 2, 1, HS.bronzeD);
      g.ell(X + 21, 27 + d(1), 6, 2, VOID);
      // great helm with the visor raised: nothing inside but a web
      const hy = 2 + d(5);
      g.part(); g.rrect(X + 9, hy + 6, 24, 20, 5, HS.bronze);
      g.part(); g.rrect(X + 8, hy + 13, 15, 9, 2, VOID);
      g.line(X + 9, hy + 14, X + 16, hy + 20, HS.web); g.px(X + 12, hy + 19, HS.web); g.px(X + 13, hy + 18, HS.web); g.px(X + 14, hy + 16, HS.web);
      g.line(X + 23, hy + 8, X + 24, hy + 24, HS.trim);
      g.part(); g.poly([[X + 6, hy + 4], [X + 22, hy + 1], [X + 24, hy + 6], [X + 8, hy + 9]], HS.bronze);
      g.line(X + 9, hy + 5, X + 20, hy + 3, HS.bronzeD);
      g.line(X + 9, hy + 25, X + 31, hy + 25, HS.trim);
      // plume
      const pw = R(2 * S(t + 0.5));
      g.part(); g.curve(X + 28, hy + 7, X + 38, hy - 2, X + 48 + pw, hy + 8 + pw, HS.plume, 5, 2);
      // pauldron
      g.part(); g.ell(X + 10, 28 + d(6), 7, 5, HS.bronze); g.line(X + 4, 30 + d(6), X + 16, 30 + d(6), HS.trim);
      // halberd held by a floating gauntlet
      const ang = pick(a, -0.12 + 0.04 * S(t), 0.45, -1.35, -0.6);
      const gx = X + 4 + pick(a, 0, 2, -6, -2), gy = 46 + d(7) + pick(a, 0, -8, 4, 0);
      const ux = S(ang), uy = -C(ang);
      g.part(); g.line(gx - ux * 30, gy - uy * 30, gx + ux * 40, gy + uy * 40, HS.wood, 2);
      const tx = gx + ux * 34, ty = gy + uy * 34, nx = -uy, ny = ux;
      g.part(); g.poly([[tx - nx * 2, ty - ny * 2], [tx - nx * 12 + ux * 6, ty - ny * 12 + uy * 6], [tx - nx * 13 - ux * 4, ty - ny * 13 - uy * 4], [tx - nx * 2 - ux * 6, ty - ny * 2 - uy * 6]], HS.blade);
      g.poly([[tx + nx * 2, ty + ny * 2], [tx + nx * 7, ty + ny * 7 - 0], [tx + nx * 2 - ux * 3, ty + ny * 2 - uy * 3]], HS.blade);
      g.poly([[tx + ux * 4 - nx, ty + uy * 4 - ny], [tx + ux * 13, ty + uy * 13], [tx + ux * 4 + nx * 1.5, ty + uy * 4 + ny * 1.5]], HS.blade);
      if (a === 2) [0, 1, 2].forEach(k => g.curve(tx - nx * 16 + 4, ty - 20 + k * 3, tx - nx * 20 - 6, ty + k * 3, tx - nx * 8, ty + 18 + k * 3, HS.swish));
      g.part(); g.rrect(gx - 4, gy - 3, 8, 7, 2, HS.bronze); g.line(gx - 3, gy - 1, gx + 3, gy - 1, HS.bronzeD);
      for (let i = 0; i < 3; i++) g.px(X + 2 + i * 14, 92 - ((f * 5 + i * 17) % 60), HS.mote);
    },
  });

  // ---- 6.3 Handshake Crab
  const HC = {
    shell: mat(['#2a0a14', '#5e1a22', '#a83a32', '#e8704a', '#ffc090']),
    shellD: mat(['#1a060c', '#3a0e16', '#6a2026', '#9a3a34']),
    lock: GOLD, steel: mat(['#2c3646', '#6f819e', '#b9c7dc', '#e8eef7', '#ffffff'], { shiny: true }),
    eye: flat('#05070d'), eyeHi: flat('#ffffff'), hole: flat('#2a1808'), mouth: flat('#1a060c'), bub: flat('#bfe6ff', { free: true }), snap: flat('#fff2b0', { free: true }),
  };
  const pincer = (g, x, y, ang, open, size, m) => {
    const up = rot([[0, 0], [-size * 0.6, -size * 0.45], [-size * 1.25, -size * 0.2], [-size * 0.7, -size * 0.05]], x, y, ang - open);
    const lo = rot([[0, 0], [-size * 0.7, size * 0.35], [-size * 1.05, size * 0.15], [-size * 0.6, 0]], x, y, ang + open);
    g.part(); g.poly(lo, m); g.part(); g.ell(x + 2, y, size * 0.42, size * 0.36, m); g.poly(up, m);
  };
  concept(B6, 3, 'Handshake Crab', {
    w: 108, h: 82, rim: '#ffc090',
    note: 'A hermit crab living in a popped padlock, its claws stuck mid-handshake: dispatcher and worker agree to nothing, so nothing stays closed.',
    draw(g, f, a, t) {
      const X = 22, op = pick(a, 0.2 + 0.18 * S(t * 2), 0.55, 0.02, 0.25), bob = f % 2;
      // walking legs
      for (let i = 0; i < 3; i++) { const lx = X + 26 + i * 9, l = (f + i) % 2; g.part(); g.path([[lx, 62], [lx - 6 + l, 70], [lx - 9 + l, 80]], HC.shellD, 3, 1); g.part(); g.path([[lx + 16, 62], [lx + 22 - l, 70], [lx + 24 - l, 80]], HC.shellD, 3, 1); }
      // padlock shell with the shackle sprung open
      const sh = pick(a, f >= 3 ? 1 : 0, 3, -1, 1);
      g.part(); g.curve(X + 44, 34, X + 46, 2 - sh, X + 66, 8 - sh, HC.steel, 5); g.line(X + 66, 8 - sh, X + 72, 20 - sh, HC.steel, 5);
      g.part(); g.rrect(X + 36, 26 + bob, 44, 36, 6, HC.lock);
      g.ell(X + 70, 34 + bob, 3, 2, HC.hole);
      g.part(); g.ell(X + 56, 40 + bob, 4, 4, HC.hole); g.poly([[X + 54, 42 + bob], [X + 58, 42 + bob], [X + 59, 50 + bob], [X + 53, 50 + bob]], HC.hole);
      [[X + 40, 30], [X + 76, 30], [X + 40, 58], [X + 76, 58]].forEach(([x, y]) => g.px(x, y + bob, HC.hole));
      // body and face peeking out the front
      g.part(); g.ell(X + 34, 56 + bob, 14, 9, HC.shell);
      const ew = R(S(t + 1));
      g.part(); g.line(X + 28, 50 + bob, X + 24 + ew, 38 + bob, HC.shell, 2); g.line(X + 34, 50 + bob, X + 33 - ew, 36 + bob, HC.shellD, 2);
      [[X + 24 + ew, 37 + bob], [X + 33 - ew, 35 + bob]].forEach(([x, y]) => { g.part(); g.ell(x, y, 2.5, 2.5, HC.eye); g.px(x - 1, y - 1, HC.eyeHi); });
      g.line(X + 22, 58 + bob, X + 27, 58 + bob, HC.mouth);
      if (f % 3 === 0) g.px(X + 20, 54 - (f % 2) * 3, HC.bub);
      // small claw
      g.part(); g.line(X + 26, 60 + bob, X + 18, 66, HC.shellD, 4); pincer(g, X + 17, 67, 0.2, 0.25, 8, HC.shellD);
      // big claw: open, then clamped shut on the strike
      const [cx, cy] = pick(a, [X - 2, 50 + bob], [X + 2, 28], [X - 16, 52], [X - 6, 50]);
      g.part(); g.path([[X + 24, 56 + bob], [X + 12, pick(a, 58, 44, 56, 56)], [cx + 6, cy]], HC.shell, 6, 5);
      pincer(g, cx + 4, cy, pick(a, 0, -0.5, 0.05, 0), op, 18, HC.shell);
      if (a === 2) [[-20, -6], [-22, 0], [-20, 6], [-16, -9], [-16, 9]].forEach(([dx, dy]) => g.px(cx + dx, cy + dy, HC.snap));
    },
  });

  // ---- 6.4 Unleashed Watchdog
  const UW = {
    fur: mat(['#0a0a10', '#16161e', '#2a2a38', '#46465c', '#72728e']),
    furD: mat(['#060608', '#0e0e14', '#1a1a24', '#2a2a38']),
    eye: flat('#ff8a3a'), eyeHi: flat('#ffe0a0'), tooth: flat('#f0ecdc'), mouth: flat('#2a0a10'), tongue: flat('#e86a7a'),
    collar: GOLD, chain: mat(['#2c3646', '#6f819e', '#b9c7dc', '#e8eef7'], { shiny: true }), tag: mat(['#5a6478', '#9aa6ba', '#e8eef7', '#ffffff']), ink: flat('#1d2a3a'),
    breath: flat('#8a8aa8', { free: true, a: 170 }), nose: flat('#05070d'),
  };
  concept(B6, 4, 'Unleashed Watchdog', {
    w: 106, h: 84, rim: '#ff8a3a',
    note: 'A watchdog that slipped its lease: the chain snapped at the collar, the tag is blank, and it goes for whatever workspace it reaches first.',
    draw(g, f, a, t) {
      const X = pick(a, 12, 16, 2, 10), low = pick(a, 0, 6, 1, 1), br = f % 2;
      // broken chain trailing behind
      const cw = R(2 * S(t));
      g.part();

      // far legs
      g.part(); g.line(X + 34, 54 + low, X + 30, 78, UW.furD, 5); g.line(X + 70, 52 + low, X + 76, 66, UW.furD, 5); g.line(X + 76, 66, X + 72, 78, UW.furD, 4);
      // tail
      const tw = R(4 * S(t * 2));
      g.part(); g.curve(X + 80, 42 + low, X + 88, 30, X + 92 + tw, 20 - low, UW.fur, 5, 2);
      // body
      g.part(); g.ell(X + 60, 46 + low + br * 0, 22, 12, UW.fur);
      g.part(); g.ell(X + 38, 46 + low, 12, 14, UW.fur);
      [[X + 52, 38], [X + 60, 37], [X + 68, 38]].forEach(([x, y]) => g.line(x, y + low, x + 3, y + 6 + low, UW.furD));
      // near legs
      g.part(); g.path([[X + 40, 54 + low], [X + 38, 66], [X + 36, 78]], UW.fur, 6, 5); g.ell(X + 34, 79, 4, 2, UW.fur);
      g.part(); g.path([[X + 74, 50 + low], [X + 80, 64], [X + 76, 78]], UW.fur, 7, 5); g.ell(X + 74, 79, 4, 2, UW.fur);
      // head, jaw opens on the strike
      const hx = X + 22, hy = 30 + low * 1.4, jaw = pick(a, br, 2, 8, 3);
      g.part(); g.poly([[hx + 6, hy - 10], [hx + 12, hy - 20], [hx + 15, hy - 8]], UW.fur);
      g.part(); g.ell(hx + 6, hy, 11, 10, UW.fur);
      g.part(); g.poly([[hx - 2, hy + 4], [hx - 14, hy + 6 + jaw], [hx - 14, hy + 9 + jaw], [hx + 4, hy + 10]], UW.furD);
      if (jaw > 2) { g.poly([[hx - 1, hy + 2], [hx - 14, hy + 2], [hx - 13, hy + 6 + jaw], [hx, hy + 6]], UW.mouth); g.line(hx - 10, hy + 5 + jaw * 0.6, hx - 3, hy + 6, UW.tongue); }
      g.part(); g.poly([[hx - 2, hy - 4], [hx - 16, hy - 1], [hx - 16, hy + 3], [hx, hy + 4]], UW.fur);
      g.rect(hx - 17, hy - 2, 3, 3, UW.nose);
      [[-14, 3], [-10, 3], [-6, 3]].forEach(([dx, dy]) => g.px(hx + dx, hy + dy + 1, UW.tooth));
      if (jaw > 2) [[-13, 5], [-9, 5]].forEach(([dx, dy]) => g.px(hx + dx, hy + dy + jaw, UW.tooth));
      else if (br && !a) g.rect(hx - 8, hy + 5, 2, 3, UW.tongue);
      g.line(hx - 2, hy - 5, hx + 4, hy - 3, UW.furD);
      g.rect(hx, hy - 4, 3, 2, UW.eye); g.px(hx, hy - 4, UW.eyeHi);
      // spiked collar and a blank lease tag
      g.part(); g.curve(hx + 12, hy - 6, hx + 15, hy + 3, hx + 13, hy + 13, UW.collar, 4);
      [[hx + 16, hy - 3], [hx + 17, hy + 3], [hx + 16, hy + 9]].forEach(([x, y]) => g.px(x + 1, y, UW.chain));
      // snapped chain drags back over its shoulders
      for (let i = 0; i < 6; i++) { const lx = hx + 18 + i * 6, ly = hy + 2 - i * 0.6 + R(cw * i / 5) + (i > 3 ? (i - 3) * 3 : 0); g.part(); if (i % 2) g.ell(lx, ly, 3, 1, UW.chain); else { g.ell(lx, ly, 3, 2, UW.chain); g.px(lx, ly, 0); } }
      g.part(); g.rrect(hx + 9, hy + 12, 7, 7, 2, UW.tag); g.rect(hx + 11, hy + 15, 3, 1, UW.ink);
      if (a === 1) [[-20, 6], [-22, 2], [-24, 7]].forEach(([dx, dy]) => g.px(hx + dx, hy + dy, UW.breath));
      if (!a && f % 3 === 0) { g.px(hx - 20, hy + 4, UW.breath); g.px(hx - 22, hy + 2, UW.breath); }
    },
  });

  // ---- 6.5 Open Port Router (bold: one-colour phosphor screen with scanlines)
  const OP = {
    body: mat(['#021a0a', '#06401c', '#0e7a34', '#3ad06a', '#b8ffc8'], { raw: true, shiny: true }),
    bodyD: mat(['#010e06', '#032a12', '#06401c', '#0e7a34'], { raw: true }),
    hi: flat('#b8ffc8'), mid: flat('#3ad06a'), dim: flat('#0e5a28'), dark: flat('#011208'),
    pkt: flat('#b8ffc8', { free: true }), pkt2: flat('#3ad06a', { free: true }),
  };
  concept(B6, 5, 'Open Port Router', {
    w: 100, h: 88, rim: null,
    note: 'Bold green-screen take: the gateway as a router with one huge open port for a mouth, waving every packet through because nobody checks the handshake.',
    post(c) {
      const x = c.getContext('2d'), im = x.getImageData(0, 0, c.width, c.height), d = im.data;
      for (let y = 1; y < c.height; y += 2) for (let i = y * c.width * 4; i < (y + 1) * c.width * 4; i += 4) { d[i] *= 0.72; d[i + 1] *= 0.72; d[i + 2] *= 0.72; }
      x.putImageData(im, 0, 0); return c;
    },
    draw(g, f, a, t) {
      const X = 14, bob = pick(a, f % 3 === 0 ? 1 : 0, -2, 1, 0), Y = 38 + bob;
      // antennae
      [[X + 22, -0.35], [X + 42, 0.05], [X + 62, 0.4]].forEach(([ax, tilt], i) => {
        const sw = 0.08 * S(t + i * 2) + (a === 1 ? -0.25 : 0), ex = ax + S(tilt + sw) * 26, ey = Y - C(tilt + sw) * 26;
        g.part(); g.line(ax, Y, ex, ey, OP.body, 3);
        g.part(); g.ell(ex, ey, 2, 2, (f + i) % 3 === 0 || a ? OP.hi : OP.dim);
        if (a === 1 || (f + i) % 3 === 0) { g.px(ex - 3, ey - 1, OP.pkt2); g.px(ex + 3, ey - 2, OP.pkt2); }
      });
      // feet
      g.part(); g.rrect(X + 12, Y + 32, 10, 6, 2, OP.bodyD); g.rrect(X + 58, Y + 32, 10, 6, 2, OP.bodyD);
      // wedge body
      g.part(); g.poly([[X + 4, Y + 6], [X + 12, Y - 2], [X + 76, Y - 2], [X + 80, Y + 6], [X + 80, Y + 34], [X + 4, Y + 34]], OP.body);
      g.line(X + 6, Y + 6, X + 78, Y + 6, OP.dim);
      for (let i = 0; i < 6; i++) g.line(X + 50 + i * 4, Y + 1, X + 50 + i * 4, Y + 4, OP.dark);
      // LED eyes
      [0, 1, 2, 3, 4].forEach(i => { const on = a === 2 ? true : (f + i * 2) % 5 < 3; g.rect(X + 10 + i * 6, Y + 10, 3, 2, on ? OP.hi : OP.dim); });
      g.rect(X + 12, Y + 8, 7, 1, OP.dark); g.rect(X + 30, Y + 8, 7, 1, OP.dark);
      // the open port mouth with contact-pin teeth
      const mo = pick(a, 0, 2, 5, 1);
      g.part(); g.rect(X + 8, Y + 16 - mo, 34, 14 + mo, OP.dark);
      g.rect(X + 18, Y + 28, 14, 4, OP.dark);
      for (let i = 0; i < 8; i++) g.rect(X + 10 + i * 4, Y + 17 - mo, 2, 4, OP.mid);
      // closed ports beside it
      [0, 1, 2].forEach(i => { g.part(); g.rect(X + 48 + i * 10, Y + 16, 8, 9, OP.dark); g.rect(X + 50 + i * 10, Y + 25, 4, 2, OP.dark); g.rect(X + 49 + i * 10, Y + 17, 6, 1, OP.dim); });
      g.part(); g.text('WAN', X + 49, Y + 29, OP.mid);
      // packets stream straight in
      if (a === 2) for (let i = 0; i < 12; i++) { const px = X + 4 - (i * 7) % 22, py = Y + 14 + (i * 5) % 18; g.rect(px, py, 2, 2, i % 3 ? OP.pkt : OP.pkt2); }
      else for (let i = 0; i < 4; i++) { const px = X - 12 + ((f * 4 + i * 9) % 30); if (px < X + 8) g.rect(px, Y + 20 + (i % 2) * 4, 2, 2, i % 2 ? OP.pkt : OP.pkt2); }
    },
  });
})();
