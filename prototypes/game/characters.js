// PROTOTYPE character sprites for the portfolio game layer. Throwaway.
// Five class concepts for the player, each with an overworld set (16x24 body,
// 4 directions), a side-view battle set and a dialog portrait. Everything is
// drawn in code from parts, then a single pass adds hue-shifted shading
// (light from the top left) and selective outlines.
//
// The look is user-configurable (skin, hair, hair style, glasses, beard,
// accent). The defaults are neutral middle options, not a guess at anyone's
// real appearance. See CHARACTER_LOOK_OPTIONS.
window.SpriteSheet = window.SpriteSheet || { groups: [], add(group, name, frames, opts = {}) {
  let g = this.groups.find(x => x.name === group); if (!g) this.groups.push(g = { name: group, items: [] });
  const i = g.items.findIndex(x => x.name === name), item = { name, frames, fps: opts.fps || 6, note: opts.note || '' };
  i >= 0 ? (g.items[i] = item) : g.items.push(item);
} };

(() => {
  'use strict';
  const SS = window.SpriteSheet;
  const OUT = '#0b0d17';

  // ---------------------------------------------------------------- color
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hexToRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [h, s, l];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }
  const toward = (h, target, deg) => { const d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), deg); };
  // 5-tone ramp [contour, shadow, mid, light, specular]. Shadows drift toward
  // blue-violet and highlights toward warm yellow, so shading never looks muddy.
  function ramp(hex, o = {}) {
    const [h, s, l] = rgbToHsl(...hexToRgb(hex)), st = o.step ?? 0.11, sh = o.shift ?? 1;
    return [-2, -1, 0, 1, 2].map(d => {
      let L = l + d * st * (d < 0 ? 1 : 0.85); if (d === -2) L -= st * 0.2;
      L = clamp(L, 0.04, 0.95);
      const H = d < 0 ? toward(h, o.hue ?? 248, -d * 14 * sh) : d > 0 ? toward(h, 52, d * 9 * sh) : h;
      return hslToHex(H, clamp(s + (d < 0 ? -d * (o.sat ?? 0.02) : -d * 0.08), 0, 1), L);
    });
  }
  const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };

  // --------------------------------------------------------------- sprite
  // A grid of {part, tone}. Parts drawn later sit on top. Tone null = auto.
  class Spr {
    constructor(w, h, ox = 0, oy = 0) { Object.assign(this, { w, h, ox, oy }); this.px = new Array(w * h).fill(null); this.parts = []; this.cur = null; }
    part(mat, o = {}) { this.cur = { id: this.parts.length, mat, back: !!o.back, flat: o.flat ?? null, fx: !!o.fx, deep: o.deep || 1, decal: !!o.decal, ink: !!o.ink }; this.parts.push(this.cur); return this; }
    // decal: recolors whatever is under it but keeps that surface's shape and shading
    decal(mat, o = {}) { return this.part(mat, { ...o, decal: true }); }
    idx(x, y) { x = Math.round(x + this.ox); y = Math.round(y + this.oy); return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x; }
    put(i, t) { const prev = this.px[i], p = this.cur; this.px[i] = { p, t: t ?? null, base: p.decal && prev ? prev.base : p }; }
    set(x, y, t) { const i = this.idx(x, y); if (i >= 0) this.put(i, t); return this; }
    under(x, y, t) { const i = this.idx(x, y); if (i >= 0 && !this.px[i]) this.put(i, t); return this; }
    onto(x, y, mat, t) { const i = this.idx(x, y); if (i >= 0 && this.px[i] && this.px[i].base.mat === mat) this.put(i, t); return this; }
    at(x, y) { const i = this.idx(x, y); return i >= 0 ? this.px[i] : null; }
    clr(x, y) { const i = this.idx(x, y); if (i >= 0) this.px[i] = null; return this; }
    rect(x, y, w, h, t) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, t); return this; }
    rectU(x, y, w, h, t) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.under(x + i, y + j, t); return this; }
    ell(cx, cy, rx, ry, t) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35); if (dx * dx + dy * dy <= 1) this.set(x, y, t);
      }
      return this;
    }
    line(x0, y0, x1, y1, s = 1, t) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = Math.floor((s - 1) / 2);
      let e = dx + dy;
      for (;;) { this.rect(x0 - o, y0 - o, s, s, t); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
      return this;
    }
    trap(y0, y1, l0, r0, l1, r1, t) {
      for (let y = y0; y <= y1; y++) {
        const k = y1 === y0 ? 0 : (y - y0) / (y1 - y0), l = Math.round(l0 + (l1 - l0) * k), r = Math.round(r0 + (r1 - r0) * k);
        for (let x = l; x <= r; x++) this.set(x, y, t);
      }
      return this;
    }
    render(M) {
      const { w, h, px } = this, P = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : px[y * w + x];
      const col = new Array(w * h).fill(null);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const q = px[y * w + x]; if (!q) continue;
        const p = q.p, R = M[p.mat], B = q.base;
        if (typeof q.t === 'string') { col[y * w + x] = q.t[0] === '#' ? q.t : (typeof M[q.t] === 'string' ? M[q.t] : M[q.t][2]); continue; }
        if (typeof R === 'string') { col[y * w + x] = R; continue; }
        if (!R) { col[y * w + x] = '#ff00ff'; continue; }
        let t;
        if (q.t != null) t = q.t;
        else if (p.flat != null) t = p.flat;
        else if (B.flat != null && B !== p) t = B.flat;
        else {
          const same = (a, b) => { const n = P(a, b); return n && n.base === B; };
          const r = !same(x + 1, y), b = !same(x, y + 1), l = !same(x - 1, y), u = !same(x, y - 1);
          const deep = B.deep > 1 && (!same(x + 2, y) || !same(x, y + 2));
          if (l && r) t = b ? 1 : u ? 3 : 2;
          else if (r || b || deep) t = 1;
          else if (l || u) t = 3;
          else t = 2;
          // a separate surface drawn on top of us, just above or to the left, casts a shadow
          for (const [ax, ay] of [[0, -1], [-1, 0]]) {
            const n = P(x + ax, y + ay);
            if (n && n.base !== B && n.base.id > B.id && !n.base.fx) { t = Math.min(t, M[n.base.mat] === M[B.mat] ? 0 : 1); break; }
          }
        }
        if (q.t == null && p.flat == null) for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = P(x + ax, y + ay); if (n && n.base !== B && n.base.ink && n.base.id > B.id) { t = 0; break; } }
        if (B.back || p.back) t = Math.max(0, t - 1);
        col[y * w + x] = R[clamp(t, 0, 4)];
      }
      // selective outline: lit (top/left) edges take the material's own dark tone
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (px[y * w + x]) continue;
        const f = (a, b) => { const n = P(a, b); return n && !n.base.fx ? n : null; };
        const rn = f(x + 1, y), dn = f(x, y + 1), ln = f(x - 1, y), un = f(x, y - 1);
        if (!rn && !dn && !ln && !un) continue;
        let c = OUT;
        if ((rn || dn) && !ln && !un) { const R = M[(rn || dn).base.mat]; if (Array.isArray(R)) c = R[0]; }
        col[y * w + x] = c;
      }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'), img = g.createImageData(w, h);
      col.forEach((c, i) => { if (!c) return; const [r, gg, b] = hexToRgb(c); img.data.set([r, gg, b, 255], i * 4); });
      g.putImageData(img, 0, 0);
      return cv;
    }
  }
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const flipX = c => { const f = mk(c.width, c.height), g = f.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return f; };
  const tint = (c, color, a) => { const f = mk(c.width, c.height), g = f.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); return f; };
  const pt = (o, len, ang) => { const r = ang * Math.PI / 180; return [o[0] + Math.sin(r) * len, o[1] + Math.cos(r) * len]; };

  // tiny 3x5 glyphs for spell and code effects
  const GLYPH = {
    '>': ['1..', '.1.', '..1', '.1.', '1..'], '_': ['...', '...', '...', '...', '111'], '{': ['.11', '.1.', '1..', '.1.', '.11'],
    '}': ['11.', '.1.', '..1', '.1.', '11.'], '$': ['.11', '11.', '.1.', '.11', '11.'], '/': ['..1', '..1', '.1.', '1..', '1..'],
    '<': ['..1', '.1.', '1..', '.1.', '..1'], '*': ['...', '1.1', '.1.', '1.1', '...'], '+': ['...', '.1.', '111', '.1.', '...'],
  };
  function glyph(S, ch, x, y, color) { (GLYPH[ch] || []).forEach((r, j) => [...r].forEach((v, i) => { if (v === '1') S.set(x + i, y + j, color); })); }
  function fxPart(S) { S.part('fx', { fx: true, flat: 2 }); }

  // ---------------------------------------------------------- look options
  const LOOK_OPTIONS = {
    skin: [
      { id: 'porcelain', label: 'Porcelain', value: '#f2d3bd' }, { id: 'light', label: 'Light', value: '#e3b896' },
      { id: 'medium', label: 'Medium', value: '#c8946c' }, { id: 'tan', label: 'Tan', value: '#a8744d' },
      { id: 'brown', label: 'Brown', value: '#835536' }, { id: 'deep', label: 'Deep', value: '#5c3a26' },
    ],
    hair: [
      { id: 'black', label: 'Black', value: '#1f1b26' }, { id: 'dark-brown', label: 'Dark brown', value: '#3d2a22' },
      { id: 'brown', label: 'Brown', value: '#6e4630' }, { id: 'auburn', label: 'Auburn', value: '#8c3d26' },
      { id: 'blond', label: 'Blond', value: '#d2ac63' }, { id: 'gray', label: 'Gray', value: '#9c9ca8' },
    ],
    hairStyle: [
      { id: 'short', label: 'Short' }, { id: 'swept', label: 'Swept' }, { id: 'curly', label: 'Curly' },
      { id: 'buzz', label: 'Buzz' }, { id: 'long-tied', label: 'Long, tied' },
    ],
    glasses: [{ id: 'none', label: 'None' }, { id: 'round', label: 'Round' }, { id: 'rect', label: 'Rectangular' }],
    beard: [{ id: 'none', label: 'None' }, { id: 'stubble', label: 'Stubble' }, { id: 'full', label: 'Full' }],
    accent: [
      { id: 'sys', label: 'System blue', value: '#4da3ff' }, { id: 'gold', label: 'Gold', value: '#d9b45b' },
      { id: 'crimson', label: 'Crimson', value: '#ff5d6c' }, { id: 'violet', label: 'Violet', value: '#b48cff' },
      { id: 'mint', label: 'Mint', value: '#5fd38d' }, { id: 'cyan', label: 'Cyan', value: '#4dd8e0' },
    ],
  };
  const LOOK_DEFAULT = { skin: 'medium', hair: 'dark-brown', hairStyle: 'short', glasses: 'none', beard: 'none', accent: 'sys' };
  window.CHARACTER_LOOK_OPTIONS = LOOK_OPTIONS;
  window.CHARACTER_LOOK_DEFAULT = LOOK_DEFAULT;
  // accepts option ids, labels or raw hex values for any key
  function resolveLook(look = {}) {
    const out = {};
    for (const k of Object.keys(LOOK_OPTIONS)) {
      const want = look[k] ?? LOOK_DEFAULT[k], opts = LOOK_OPTIONS[k];
      const hit = opts.find(o => o.id === want || o.label === want || (o.value && String(o.value).toLowerCase() === String(want).toLowerCase()));
      out[k] = hit ? (hit.value || hit.id) : (typeof want === 'string' && want[0] === '#' ? want : (opts.find(o => o.id === LOOK_DEFAULT[k]).value || LOOK_DEFAULT[k]));
    }
    return out;
  }
  function baseMats(L) {
    return {
      skin: ramp(L.skin, { step: 0.07, shift: 0.7, hue: 335, sat: -0.05 }), hair: ramp(L.hair, rgbToHsl(...hexToRgb(L.hair))[2] > 0.5 ? { step: 0.1, hue: 28, sat: -0.07 } : { step: 0.1 }),
      hairBuzz: ramp(mix(L.hair, L.skin, 0.42), { step: 0.08 }), beard: ramp(mix(L.hair, '#1a1420', 0.2), { step: 0.09 }), stub: ramp(mix(L.skin, L.hair, 0.5), { step: 0.07 }),
      eye: '#17131f', white: '#f4f7ff', frame: ramp(rgbToHsl(...hexToRgb(L.skin))[2] < 0.42 ? '#a3acc0' : '#2c3142', { step: 0.08 }), lensGlint: '#cfeaff',
      mouth: mix(L.skin, '#4a1a2a', 0.5), accent: ramp(L.accent, { step: 0.12 }), glow: mix(L.accent, '#ffffff', 0.5), key: ramp('#d3dae6', { step: 0.1 }), keyDark: ramp('#59627a', { step: 0.1 }),
      glowEye: mix(L.accent, '#ffffff', 0.35), gold: ramp('#d9b45b', { step: 0.12 }), steel: ramp('#9fadc4', { step: 0.13 }),
      fx: L.accent, sole: ramp("#1a1622", { step: 0.05 }), gem: ramp(mix(L.accent, "#ffffff", 0.15), { step: 0.13 }), grip: ramp("#3b3448", { step: 0.08 }),
    };
  }

  // ------------------------------------------------------------- heads
  // b = {x, y, w, h}. Front view faces the viewer, side view faces right.
  function headFront(S, b, o = {}) {
    const { x, y, w, h } = b, big = w >= 14;
    S.part('skin', { deep: big ? 2 : 1 });
    if (big) {
      // rounded crown, tapering jaw
      const inset = r => r === 0 ? 3 : r <= 2 ? 1 : r >= h - 1 ? 4 : r >= h - 2 ? 2 : r >= h - 4 ? 1 : 0;
      for (let r = 0; r < h; r++) S.rect(x + inset(r), y + r, w - inset(r) * 2, 1);
    } else {
      S.rect(x, y, w, h);
      [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]].forEach(([a, c]) => S.clr(a, c));
    }
    const ear = y + Math.round(h * 0.5);
    S.part('skin').rect(x - 1, ear, 1, big ? 3 : 2).rect(x + w, ear, 1, big ? 3 : 2);
    if (big) S.decal('skin', { flat: 1 }).set(x - 1, ear + 1).set(x + w, ear + 1);
    const ew = big ? 2 : 1, eh = 2, ey = y + Math.round(h * (big ? 0.5 : 0.55));
    const ex1 = x + Math.round(w * (big ? 0.24 : 0.2)), ex2 = x + w - ew - Math.round(w * (big ? 0.24 : 0.2));
    b.eyes = { ey, ew, eh, ex1, ex2 };
    if (o.eyes === 'closed') { S.decal('eye').rect(ex1, ey + 1, ew, 1).rect(ex2, ey + 1, ew, 1); }
    else {
      S.decal(o.eyes === 'glow' ? 'glowEye' : 'eye').rect(ex1, ey, ew, eh).rect(ex2, ey, ew, eh);
      if (big && o.eyes !== 'glow') S.decal('white').set(ex1, ey).set(ex2, ey);
    }
    if (big) {
      const c = x + Math.floor(w / 2), ex = o.expr;
      // brows carry the expression: flat, slanted down to the nose, or lifted at the inner ends
      S.decal('hair', { flat: 1 });
      if (ex === 'determined') S.rect(ex1 - 1, ey - 3, 2, 1).rect(ex1 + 1, ey - 2, 2, 1).rect(ex2 + 1, ey - 3, 2, 1).rect(ex2 - 1, ey - 2, 2, 1);
      else if (ex === 'hurt') S.rect(ex1 - 1, ey - 2, 2, 1).rect(ex1 + 1, ey - 3, 2, 1).rect(ex2 + 1, ey - 2, 2, 1).rect(ex2 - 1, ey - 3, 2, 1);
      else S.rect(ex1 - 1, ey - 2, 3, 1).rect(ex2, ey - 2, 3, 1);
      if (ex === 'determined' && o.eyes !== 'closed') S.decal('skin', { flat: 1 }).set(ex1 + 1, ey).set(ex2, ey).set(c, ey - 2).set(c - 1, ey - 1);
      S.decal('skin', { flat: 1 }).set(c, ey + 2).set(c, ey + 1);
      S.decal('skin', { flat: 3 }).set(c - 1, ey + 1).rect(x + 2, ey + 2, 2, 1);
      if (ex === 'hurt') { S.decal('eye').rect(c - 1, y + h - 4, 3, 2); S.decal('white').rect(c - 1, y + h - 4, 3, 1); }
      else if (ex === 'determined') S.decal('mouth').rect(c - 2, y + h - 3, 4, 1);
      else { S.decal('mouth').rect(c - 1, y + h - 3, 3, 1); S.decal('skin', { flat: 3 }).set(c + 2, y + h - 4); }
      S.decal('skin', { flat: 1 }).set(c, y + h - 2);
      if (ex === 'hurt') { fxPart(S); S.set(x + w, y + 2, 'lensGlint').set(x + w, y + 3, 'lensGlint').set(x + w + 1, y + 3, 'white'); }
    }
  }
  // overworld profile, 9x9: brow, eye with a white, nose tip, mouth, ear
  function headSide(S, b, o = {}) {
    const { x, y, w, h } = b;
    S.part('skin').rect(x, y, w, h);
    [[x, y], [x + w - 1, y], [x, y + h - 1], [x + 1, y + h - 1], [x + w - 1, y + h - 1]].forEach(([a, c]) => S.clr(a, c));
    S.set(x + w, y + Math.round(h * 0.55));
    S.decal('skin', { flat: 1 }).set(x + 3, y + Math.round(h * 0.5)).set(x + 3, y + Math.round(h * 0.5) + 1).set(x + w - 1, y + Math.round(h * 0.55) + 1);
    const ey = y + Math.round(h * 0.4), ex = x + w - 3;
    b.eyes = { ey, ex, ew: 1, eh: 2 };
    if (o.eyes === 'closed' || o.eyes === 'wince') S.decal('eye').rect(ex, ey + 1, 2, 1);
    else if (o.eyes === 'glow') S.decal('glowEye').rect(ex, ey, 2, 2);
    else { S.decal('eye').rect(ex, ey, 1, 2); S.decal('white').set(ex + 1, ey + 1); }
    S.decal('hair', { flat: 1 }).rect(ex, ey - 1, 2, 1);
    S.decal('mouth').set(x + w - 2, y + h - 2);
  }

  // battle profile, 13x13 facing right: skull, brow ridge, a nose that breaks
  // the silhouette, lips, a chin, and an ear set back on the skull
  function headSideBig(S, b, o = {}) {
    const { x, y } = b;
    const rows = [[3, 9], [1, 10], [1, 11], [0, 11], [0, 11], [0, 12], [0, 11], [0, 12], [0, 11], [1, 11], [1, 11], [2, 10], [4, 8]];
    S.part('skin', { deep: 2 });
    rows.forEach(([l, r], j) => S.rect(x + l, y + j, r - l + 1, 1));
    // ear, nostril, lip line, the soft shadow under the cheekbone
    S.decal('skin', { flat: 1 }).rect(x + 3, y + 6, 2, 3).set(x + 11, y + 8);
    S.decal('skin', { flat: 0 }).set(x + 4, y + 7);
    S.decal('skin', { flat: 3 }).set(x + 10, y + 5).set(x + 9, y + 10).set(x + 11, y + 7);
    const ex = x + 9, ey = y + 5;
    b.eyes = { ey, ex, ew: 1, eh: 2 };
    const e = o.eyes;
    if (e === 'closed' || e === 'wince') S.decal('eye').rect(ex - 1, ey + 1, 3, 1);
    else if (e === 'glow') S.decal('glowEye').rect(ex - 1, ey, 2, 2);
    else { S.decal('white').rect(ex, ey, 2, 2); S.decal('eye').rect(ex, ey, 1, 2); if (e === 'squint') S.decal('skin', { flat: 1 }).rect(ex, ey, 2, 1); }
    S.decal('hair', { flat: 1 }).rect(ex - 1, ey - 2, 3, 1);
    if (e === 'wince' || e === 'squint') S.decal('hair', { flat: 1 }).set(ex + 2, ey - 1);
    S.decal('mouth').rect(x + 9, y + 9, 2, 1);
    if (o.mouth === 'open') S.decal('eye').rect(x + 9, y + 9, 2, 2);
  }

  // hair styles in three views
  function hairFront(S, b, style) {
    const { x, y, w, h } = b, big = w >= 14, cap = Math.max(2, Math.round(h * 0.3)), side = Math.round(h * 0.55);
    if (style === 'buzz') {
      S.part('hairBuzz').rect(x + 1, y, w - 2, 1).rect(x, y + 1, w, Math.max(1, cap - 1));
      if (big) S.rect(x, y + cap, 1, 2).rect(x + w - 1, y + cap, 1, 2);
      return;
    }
    S.part('hair', { deep: big ? 2 : 1 });
    if (style === 'curly') {
      S.rect(x - 1, y, w + 2, cap + 1).rect(x, y - 1, w, 1);
      if (big) for (let i = 1; i < w; i += 3) S.ell(x + i, y - 1, 1.5, 1.4);
      else for (let i = 1; i < w - 1; i += 4) S.rect(x + i, y - 2, 2, 1);
      S.rect(x - 1, y + cap, 1, side - cap + 1).rect(x + w, y + cap, 1, side - cap + 1);
      for (let i = 0; i < w; i++) if (i % 2 === 0) S.set(x + i, y + cap + 1);
      S.decal('hair', { flat: 3 });
      for (let i = 1; i < w - 1; i += 3) S.set(x + i, y + (i % 2 ? 0 : 1));
      return;
    }
    S.rect(x + 2, y - 1, w - 4, 1).rect(x, y, w, cap);
    S.clr(x, y);
    S.clr(x + w - 1, y);
    if (style === 'swept') {
      S.rect(x + 1, y - 2, Math.ceil(w * 0.55), 1).set(x + 1, y - 1);
      for (let i = 0; i < w; i++) { const d = Math.round(((w - 1 - i) / (w - 1)) * (big ? 3 : 2)); S.rect(x + i, y + cap, 1, d); }
    } else {
      // short and long-tied share a jagged fringe; long-tied parts in the middle
      for (let i = 1; i < w - 1; i++) {
        if (style === 'long-tied' && Math.abs(i - (w - 1) / 2) < 1) continue;
        if ((i + 1) % 3 !== 0) S.set(x + i, y + cap);
        if (big && i % 4 === 1) S.set(x + i, y + cap + 1);
      }
    }
    S.part('hair').rect(x, y + cap, 1, side - cap).rect(x + w - 1, y + cap, 1, side - cap);
    if (big) {
      S.rect(x + 1, y + cap, 1, 2).rect(x + w - 2, y + cap, 1, 2);
      if (style !== 'swept') S.rect(x + Math.round(w * 0.3), y + cap, 1, 2).rect(x + Math.round(w * 0.68), y + cap, 1, 2);
      S.decal('hair', { flat: 3 }).rect(x + 3, y, 4, 1).rect(x + 2, y + 1, 2, 1);
      S.decal('hair', { flat: 4 }).set(x + 4, y);
    }
    if (style === 'long-tied') { S.part('hair', { back: true }); S.rectU(x + w, y + side - 1, big ? 2 : 1, big ? 8 : 4); S.rectU(x - (big ? 2 : 1), y + side, big ? 2 : 1, big ? 6 : 3); }
  }
  function hairBack(S, b, style) {
    const { x, y, w, h } = b;
    if (style === 'buzz') { S.part('hairBuzz').rect(x + 1, y, w - 2, 1).rect(x, y + 1, w, h - 4); return; }
    S.part('hair');
    S.rect(x + 2, y - 1, w - 4, 1).rect(x, y, w, h - 1);
    S.clr(x, y); S.clr(x + w - 1, y);
    if (style === 'swept') S.rect(x + 1, y - 2, Math.ceil(w * 0.55), 1);
    if (style === 'curly') { S.rect(x - 1, y + 1, 1, h - 2).rect(x + w, y + 1, 1, h - 2); for (let i = 1; i < w - 1; i += 4) S.rect(x + i, y - 2, 2, 1); S.decal('hair', { flat: 3 }); for (let i = 1; i < w; i += 3) S.set(x + i, y + 2 + (i % 2)); }
    if (style === 'long-tied') {
      const c = x + Math.floor(w / 2) - 1;
      S.part('hair').rect(c, y + h - 2, 2, 6).set(c, y + h + 4);
      S.decal('accent', { flat: 2 }).rect(c, y + h - 2, 2, 1);
    }
    S.decal('hair', { flat: 3 }).rect(x + 2, y + 1, 2, 1).set(x + 1, y + 2);
  }
  function hairSide(S, b, style) {
    const { x, y, w, h } = b, cap = Math.max(2, Math.round(h * 0.3));
    if (style === 'buzz') { S.part('hairBuzz').rect(x + 1, y, w - 3, 1).rect(x, y + 1, w - 2, 1).rect(x, y + 2, 3, Math.round(h * 0.35)); return; }
    S.part('hair');
    S.rect(x + 1, y - 1, w - 3, 1).rect(x, y, w, cap).clr(x + w - 1, y);
    S.rect(x, y + cap, Math.round(w * 0.36), Math.round(h * 0.72) - cap);
    S.set(x + Math.round(w * 0.42), y + cap).set(x + Math.round(w * 0.42) + 1, y + cap);
    if (style === 'swept') { S.rect(x + 1, y - 2, Math.round(w * 0.5), 1); S.rect(x + w - 3, y + cap, 3, 1).set(x + w, y + cap - 1).set(x + w, y + cap); }
    else if (style === 'curly' && w >= 12) {
      // battle size: round curl clusters along the crown and down the back, each with a lit top-left
      [[2, -1], [5, -2], [8, -2], [11, -1], [0, 2], [-1, 5], [0, 8]].forEach(([dx, dy]) => S.ell(x + dx, y + dy, 1.6, 1.5));
      S.decal('hair', { flat: 3 }); [[1, -2], [4, -3], [7, -3], [10, -2], [-1, 1], [-2, 4]].forEach(([dx, dy]) => S.set(x + dx, y + dy));
      S.decal('hair', { flat: 1 }); [[3, 0], [6, -1], [9, -1], [1, 3], [0, 6]].forEach(([dx, dy]) => S.set(x + dx, y + dy));
      S.part('hair').set(x + w - 2, y + Math.max(2, Math.round(h * 0.3))).set(x + w - 4, y + Math.max(2, Math.round(h * 0.3)));
    }
    else if (style === 'curly') { S.rect(x - 1, y, 1, Math.round(h * 0.8)); for (let i = 1; i < w - 1; i += 4) S.rect(x + i, y - 2, 2, 1); S.set(x + w - 2, y + cap).set(x + w - 4, y + cap); S.decal('hair', { flat: 3 }); S.set(x + 2, y).set(x + 5, y + 1).set(x + 1, y + 3); }
    else { S.set(x + w - 2, y + cap).set(x + w - 3, y + cap); }
    if (style === 'long-tied') {
      S.part('hair', { back: true }).line(x - 1, y + 2, x - 2, y + h + 1, 2);
      S.decal('accent', { flat: 2 }).set(x - 1, y + 2).set(x, y + 2);
    }
    S.decal('hair', { flat: 3 }).rect(x + 2, y, 2, 1);
  }
  function glassesFront(S, b, style) {
    if (style === 'none' || !b.eyes) return;
    const { ey, ew, eh, ex1, ex2 } = b.eyes, round = style === 'round', big = b.w >= 14;
    S.decal('frame', { flat: 1 });
    [ex1, ex2].forEach(ex => {
      for (let xx = ex - 1; xx <= ex + ew; xx++) for (let yy = ey - 1; yy <= ey + eh; yy++) {
        const side = xx === ex - 1 || xx === ex + ew, topRow = yy === ey - 1, bot = yy === ey + eh;
        if (!(side || topRow || bot)) continue;
        if (round && side && (topRow || bot)) continue;
        if (!big && (bot || (side && yy > ey - 1))) continue;
        if (!big && round && side && yy > ey) continue;
        S.set(xx, yy);
      }
    });
    const by = big ? ey : ey - 1;
    S.rect(ex1 + ew + 1, by, ex2 - ex1 - ew - 2, 1);
    S.rect(b.x, by, ex1 - 1 - b.x, 1).rect(ex2 + ew + 1, by, b.x + b.w - (ex2 + ew + 1), 1);
    if (big) S.decal('lensGlint').set(ex1 + ew - 1, ey).set(ex2 + ew - 1, ey);
  }
  function glassesSide(S, b, style) {
    if (style === 'none' || !b.eyes) return;
    const { ey, ex } = b.eyes, round = style === 'round';
    S.decal('frame', { flat: 1 });
    for (let xx = ex - 1; xx <= ex + 1; xx++) for (let yy = ey - 1; yy <= ey + 2; yy++) {
      const edge = xx === ex - 1 || xx === ex + 1 || yy === ey - 1 || yy === ey + 2, corner = (xx !== ex) && (yy === ey - 1 || yy === ey + 2);
      if (edge && !(round && corner)) S.set(xx, yy);
    }
    S.rect(b.x + 3, ey, ex - 1 - (b.x + 3), 1);
  }
  function beardFront(S, b, style) {
    if (style === 'none' || !b.eyes) return;
    const { x, y, w, h } = b, big = w >= 14, top = b.eyes.ey + b.eyes.eh + (big ? 1 : 0);
    if (style === 'stubble') {
      S.decal('stub', { flat: big ? 2 : 1 });
      for (let yy = top; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) S.onto(xx, yy, 'skin');
      if (big) S.decal('mouth').rect(x + Math.floor(w / 2) - 1, y + h - 3, 3, 1);
      return;
    }
    S.part('beard', { deep: big ? 2 : 1 });
    for (let yy = top; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const cheek = (big ? yy < top + 2 && xx > x + 2 && xx < x + w - 3 : yy === top && xx > x && xx < x + w - 1);
      if (!cheek) S.onto(xx, yy, 'skin');
    }
    S.rect(x + (big ? 4 : 2), y + h, w - (big ? 8 : 4), 1);
    S.decal('mouth').rect(x + Math.floor(w / 2) - (big ? 1 : 0), y + h - (big ? 3 : 2), big ? 3 : 1, 1);
    if (big) S.decal('beard', { flat: 3 }).rect(x + 3, y + h - 2, 2, 1);
  }
  function beardSide(S, b, style) {
    if (style === 'none' || !b.eyes) return;
    // jaw and chin only: the cheek under the eye stays skin so the face never turns into a mass of hair
    const { x, y, w, h } = b, big = w >= 12, top = b.eyes.ey + 3;
    if (style === 'stubble') { S.decal('stub', { flat: 1 }); for (let yy = top; yy < y + h; yy++) for (let xx = x + 4; xx <= x + w; xx++) S.onto(xx, yy, 'skin'); }
    else {
      S.part('beard', { deep: big ? 2 : 1 });
      for (let yy = top; yy < y + h; yy++) for (let xx = x + 4; xx <= x + w; xx++) if (!(yy === top && xx > x + w - 4)) S.onto(xx, yy, 'skin');
      S.rect(x + 5, y + h, w - (big ? 7 : 6), 1);
    }
    S.decal('mouth').rect(big ? x + 9 : x + w - 2, big ? y + 9 : y + h - 2, big ? 2 : 1, 1);
  }
  // hood, hat, goggles, mask in three views
  function hood(S, b, view, frame = 0) {
    const { x, y, w, h } = b, big = w >= 14, c = x + Math.floor(w / 2);
    S.part('cloak', { deep: big ? 2 : 1 });
    if (view === 'front') {
      const open = y + Math.round(h * 0.32);
      S.rect(x + (big ? 2 : 0), y - 2, w - (big ? 4 : 0), 1).rect(x - 1 + (big ? 1 : 0), y - 1, w + 2 - (big ? 2 : 0), 1).rect(x - 1, y, w + 2, open - y);
      S.rect(x - 1, open, 2, h - (open - y)).rect(x + w - 1, open, 2, h - (open - y));
      S.rect(c - 1, y - 3, 2, 1).set(c - 1, y - 4);
      // cowl drapes onto the shoulders
      S.rect(x - 2, y + h - 2, 3, 3).rect(x + w - 1, y + h - 2, 3, 3);
      S.part('hair').rect(x + 2, open, 2, 1).set(x + w - 4, open);
      S.decal('cloak', { flat: 0 }).rect(x + 1, open, w - 2, 1);
      S.decal('cloak', { flat: 3 }).rect(x + 1, y - 1, 3, 1).set(x, y);
    } else if (view === 'back') {
      S.rect(x, y - 2, w, 1).rect(x - 1, y - 1, w + 2, h + 1).rect(x - 2, y + h - 2, w + 4, 3);
      S.rect(c - 1, y - 3, 2, 1).set(c - 1, y - 4);
      S.decal('cloak', { flat: 1 }).line(c, y, c, y + h - 2);
      S.decal('cloak', { flat: 3 }).rect(x + 1, y - 1, 3, 1).set(x, y);
    } else if (big) {
      // battle profile: rounded crown, a brim that shades the brow, a tip that trails back
      const f = frame % 2;
      [[2, 9], [0, 11], [-1, 12], [-1, 12], [-1, 12], [-1, 13]].forEach(([l, r], j) => S.rect(x + l, y - 2 + j, r - l + 1, 1));
      S.rect(x - 1, y + 4, 8, h - 4).rect(x - 2, y + h - 3, 11, 4);
      S.line(x, y - 1, x - 4 - f, y + 2, 2).line(x - 4 - f, y + 2, x - 6 - f, y + 6, 1);
      S.decal('cloak', { flat: 0 }).rect(x + 7, y + 3, 6, 1);
      S.decal('skin', { flat: 0 }).rect(x + 7, y + 4, 5, 1);
      S.decal('cloak', { flat: 1 }).line(x + 6, y + 4, x + 6, y + h - 1);
      S.decal('cloak', { flat: 3 }).rect(x + 1, y - 1, 6, 1).set(x, y);
      S.decal('cloak', { flat: 4 }).set(x + 3, y - 1);
    } else {
      S.rect(x, y - 2, w - 1, 1).rect(x - 1, y - 1, w + 1, 3).rect(x - 1, y + 2, Math.round(w * 0.5) + 1, h - 1);
      S.rect(x - 2, y + h - 2, Math.round(w * 0.5) + 3, 3);
      S.line(x, y - 2, x - 2 - frame % 2, y - 3, 1);
      S.decal('cloak', { flat: 0 }).rect(x + Math.round(w * 0.5), y + 2, w - Math.round(w * 0.5) - 1, 1);
      S.decal('cloak', { flat: 3 }).rect(x + 1, y - 1, 4, 1);
    }
  }
  function mask(S, b, view) {
    const { x, y, w, h } = b, big = w >= 14;
    S.part('scarf', { deep: big ? 2 : 1 });
    if (view === 'front') { const t = b.eyes ? b.eyes.ey + b.eyes.eh + (big ? 1 : 0) : y + Math.round(h * 0.7); S.rect(x - 1, t, w + 2, y + h - t + 1); S.decal('scarf', { flat: 1 }).rect(x + 1, t + 1, w - 2, 1); }
    else if (view === 'side') { const t = b.eyes.ey + 2; S.rect(x + 3, t, w - 2, y + h - t + 1); }
  }
  function hat(S, b, view, tilt = 0) {
    const { x, y, w, h } = b, big = w >= 14, brimY = y + Math.round(h * (big ? 0.22 : 0.15)), coneH = Math.round(h * (big ? 0.95 : view === 'side' ? 1.1 : 0.9));
    S.part('robe', { deep: big ? 2 : 1 });
    if (view === 'side') {
      for (let j = 0; j < coneH; j++) {
        const k = j / coneH, half = (w / 2 + 1) * (1 - k), cx = x + w / 2 - 1 - Math.round(k * k * (3 + tilt));
        S.rect(Math.round(cx - half), brimY - 1 - j, Math.max(1, Math.round(half * 2)), 1);
      }
      S.decal('accent', { flat: 2 }).rect(x, brimY - 1, w, 1);
      S.part('robe').rect(x - 3, brimY, w + 6, 1).rect(x - 2, brimY + 1, w + 3, 1);
    } else {
      for (let j = 0; j < coneH; j++) {
        const k = j / coneH, half = (w / 2) * (1 - k * 0.92), cx = x + w / 2 + Math.round(k * k * (2 + tilt)) * (view === 'back' ? -1 : 1);
        S.rect(Math.round(cx - half), brimY - 1 - j, Math.max(1, Math.round(half * 2)), 1);
      }
      S.decal('accent', { flat: 2 }).rect(x, brimY - 1, w, 1);
      if (view === 'front') S.decal('glow').set(x + Math.floor(w / 2), brimY - 1);
      S.part('robe').rect(x - 2, brimY, w + 4, 1).rect(x - 3, brimY + 1, w + 6, 1);
    }
  }
  function goggles(S, b, view) {
    const { x, y, w, h } = b, big = w >= 14, sy = y + Math.round(h * (big ? 0.2 : 0.22));
    S.decal('leather', { flat: 1 });
    if (view === 'back') { S.rect(x - 1, sy, w + 2, 1); return; }
    if (view === 'side') {
      S.rect(x, sy, w, 1);
      S.part('brass').rect(x + w - 4, sy - 1, 3, 3); S.decal('glass').set(x + w - 3, sy); return;
    }
    S.rect(x - 1, sy, w + 2, 1);
    const lw = big ? 4 : 3, lx = [x + Math.round(w * 0.12), x + w - lw - Math.round(w * 0.12)];
    lx.forEach(l => {
      S.part('brass').rect(l, sy - 1, lw, lw);
      S.decal('glass').rect(l + 1, sy, lw - 2, lw - 2);
      if (big) S.decal('lensGlint').set(l + 1, sy);
    });
  }
  function headAll(S, view, b, L, o = {}) {
    if (view === 'side') (b.w >= 12 ? headSideBig : headSide)(S, b, o); else if (view === 'front') headFront(S, b, o);
    if (!o.noHair) (view === 'side' ? hairSide : view === 'front' ? hairFront : hairBack)(S, b, L.hairStyle);
    if (view !== 'back' && !o.mask) (view === 'side' ? beardSide : beardFront)(S, b, L.beard);
    if (o.hood) hood(S, b, view, o.frame || 0);
    if (o.mask && view !== 'back') mask(S, b, view);
    if (view !== 'back') (view === 'side' ? glassesSide : glassesFront)(S, b, L.glasses);
    if (o.hat) hat(S, b, view, o.hatTilt || 0);
    if (o.goggles) goggles(S, b, view);
  }

  // ------------------------------------------------------------ overworld
  // 16x24 body on a 22x32 canvas (3px margin left, 6px on top for hats and staffs), feet on row 28.
  const OW = { w: 22, h: 32, ox: 3, oy: 6 };
  function owLegs(S, c, pants, boots) {
    const { dir, stride, uy } = c, top = 17 + Math.min(0, uy) + 1;
    if (dir === 'right') {
      const legs = [[-stride, true], [stride, false]];
      legs.forEach(([s, back]) => {
        const fx = 7 + s * 2;
        S.part(pants, { back }).line(7, top, fx, 20, 2);
        S.part(boots, { back }).rect(fx - 1, 21, 3, 2).set(fx + 2, 22);
      });
      return;
    }
    const sgn = dir === 'up' ? -1 : 1;
    [[5, stride * sgn], [9, -stride * sgn]].forEach(([lx, ext]) => {
      const foot = 22 + Math.max(0, ext) - (ext < 0 ? 1 : 0);
      S.part(pants).rect(lx, top, 2, foot - 1 - top);
      S.part(boots).rect(lx - (lx < 8 ? 1 : 0), foot - 1, 3, 2);
    });
  }
  function owTorso(S, c, mat) {
    const { dir, uy } = c;
    S.part(mat);
    if (dir === 'right') S.rect(5, 11 + uy, 6, 6); else S.rect(4, 11 + uy, 8, 6);
  }
  // arms in front/back views. opts.arm(which, ax, ext) can replace one arm
  function owArmsFB(S, c, sleeve, hand, o = {}) {
    const { dir, stride, uy } = c, sgn = dir === 'up' ? -1 : 1;
    [['L', 2, -stride * sgn], ['R', 12, stride * sgn]].forEach(([which, ax, ext]) => {
      if (o.still && o.still === which) ext = 0;
      if (o.arm && o.arm(which, ax, ext)) return;
      S.part(sleeve).rect(ax, 11 + uy, 2, 5 + ext);
      if (o.cuff) S.part(o.cuff, { flat: 2 }).rect(ax, 15 + uy + ext, 2, 1);
      S.part(hand, { flat: 2 }).rect(ax, 16 + uy + ext, 2, 1);
    });
  }
  function owArmSide(S, c, which, sleeve, hand, o = {}) {
    const { stride, uy } = c, back = which === 'back';
    let hx = 7 + (back ? stride : -stride) * 2;
    if (o.still && !back) hx = o.stillX ?? 9;
    S.part(sleeve, { back }).line(7, 12 + uy, hx, 15 + uy, 2);
    if (o.cuff) S.part(o.cuff, { flat: 2, back }).rect(hx, 15 + uy, 2, 1);
    S.part(hand, { back, flat: 2 }).rect(hx, 16 + uy, 2, 1);
    return [hx, 16 + uy];
  }
  function owHead(S, c, L, o = {}) {
    const view = c.dir === 'down' ? 'front' : c.dir === 'up' ? 'back' : 'side';
    const b = view === 'side' ? { x: 4, y: 2 + c.uy, w: 9, h: 9 } : { x: 3, y: 2 + c.uy, w: 10, h: 9 };
    headAll(S, view, b, L, { ...o, frame: c.ph });
    return b;
  }
  function famMini(S, x, y, face = 1, blink = false) {
    S.part('accent').rect(x, y, 3, 2).set(x + 1, y - 1);
    S.decal('white').set(x + (face > 0 ? 2 : 0), y);
    if (blink) S.decal('glow').set(x + 1, y + 2);
  }

  // per-class overworld painters
  const OWD = {
    engineer(S, c, L) {
      const { dir, uy } = c;
      if (dir === 'down') { S.part('grip').line(3, 11 + uy, 2, 9 + uy); S.part('key').rect(0, 8 + uy, 2, 2); S.decal('accent', { flat: 2 }).set(0, 9 + uy); }
      if (dir === 'right') { S.part('grip').line(4, 11 + uy, 3, 10 + uy); S.part('key').rect(1, 8 + uy, 2, 2); S.decal('accent', { flat: 2 }).set(1, 9 + uy); }
      owLegs(S, c, 'pants', 'boots');
      if (dir === 'right') owArmSide(S, c, 'back', 'jacket', 'skin');
      owTorso(S, c, 'jacket');
      if (dir === 'down') { S.decal('shirt').rect(7, 11 + uy, 2, 5); S.decal('jacket', { flat: 3 }).set(6, 11 + uy).set(9, 11 + uy); }
      if (dir === 'right') { S.decal('shirt').rect(10, 11 + uy, 1, 5); }
      if (dir === 'up') { S.decal('jacket', { flat: 1 }).rect(7, 13 + uy, 1, 4); }
      S.part('belt').rect(dir === 'right' ? 5 : 4, 17 + uy, dir === 'right' ? 6 : 8, 1);
      S.decal('gold', { flat: 3 }).set(dir === 'right' ? 9 : 7, 17 + uy);
      if (dir === 'right') owArmSide(S, c, 'front', 'jacket', 'skin');
      else owArmsFB(S, c, 'jacket', 'skin', { cuff: 'jacketDark' });
      // [NaN] patch on the left shoulder
      if (dir === 'down') S.decal('gold', { flat: 2 }).set(12, 12 + uy).set(13, 12 + uy);
      if (dir === 'up') S.decal('gold', { flat: 2 }).set(2, 12 + uy).set(3, 12 + uy);
      owHead(S, c, L);
      if (dir === 'up') {
        S.part('steel').line(10, 11 + uy, 5, 18 + uy);
        S.part('gold').line(10, 10 + uy, 12, 10 + uy);
        S.part('grip').line(11, 9 + uy, 12, 8 + uy);
        S.part('key').rect(12, 6 + uy, 2, 2); S.decal('accent', { flat: 2 }).set(13, 7 + uy);
      }
    },
    orchestrator(S, c, L) {
      const { dir, uy, ph, stride } = c, bob = [0, -1, 0, 1][ph % 4];
      if (dir === 'right') famMini(S, 0, 3 + bob, -1);
      owLegs(S, c, 'pants', 'boots');
      const staffX = dir === 'down' ? 1 : dir === 'up' ? 14 : null;
      if (dir === 'right') owArmSide(S, c, 'back', 'coat', 'skin', { cuff: 'gold' });
      owTorso(S, c, 'coat');
      // long coat, split at the front, gold-trimmed
      const s = stride;
      if (dir === 'down') {
        S.part('coat').trap(17 + uy, 21, 4, 7, 2 + Math.min(0, s), 6);
        S.part('coat').trap(17 + uy, 21, 8, 11, 9, 13 + Math.max(0, s));
        S.decal('gold', { flat: 2 });
        for (let y = 18 + uy; y <= 21; y++) { const k = (y - 17 - uy) / (4 - uy); S.set(Math.round(7 + (6 - 7) * k), y).set(Math.round(8 + (9 - 8) * k), y); }
        S.rect(2, 21, 5, 1).rect(9, 21, 5, 1);
        S.decal('gold', { flat: 3 }).set(7, 13 + uy).set(8, 15 + uy);
      } else if (dir === 'up') {
        S.part('coat').trap(17 + uy, 21, 4, 11, 2 + Math.min(0, s), 13 + Math.max(0, s));
        S.decal('coat', { flat: 0 }).rect(7, 19, 2, 3);
        S.decal('gold', { flat: 2 }).rect(2, 21, 12, 1);
      } else {
        S.part('coat').trap(17 + uy, 21, 5, 10, 3 - s, 11 + s);
        S.decal('gold', { flat: 2 }).rect(3 - s, 21, 9 + 2 * s, 1).rect(10, 12 + uy, 1, 5);
      }
      if (staffX != null) {
        S.part('staff').line(staffX, -1 + uy, staffX, 22);
        S.part('steel').set(staffX - 1, -1 + uy).set(staffX + 1, -1 + uy).set(staffX, 0 + uy);
        S.part('gem').rect(staffX - 1, -3 + uy, 3, 2);
        S.decal('glow').set(staffX, -3 + uy);
      }
      if (dir === 'right') {
        const [hx] = owArmSide(S, c, 'front', 'coat', 'skin', { cuff: 'gold', still: true, stillX: 9 });
        S.part('staff').line(hx + 2, -1 + uy, hx + 2, 22);
        S.part('gold').set(hx + 1, -1 + uy).set(hx + 3, -1 + uy);
        S.part('accent').rect(hx + 1, -3 + uy, 3, 2); S.decal('glow').set(hx + 2, -3 + uy);
        S.part('skin').rect(hx + 1, 16 + uy, 2, 1);
      } else owArmsFB(S, c, 'coat', 'skin', { cuff: 'gold', still: dir === 'down' ? 'L' : 'R' });
      const b = owHead(S, c, L);
      // high collar
      if (dir === 'down') { S.part('coat').rect(2, 8 + uy, 2, 4).rect(12, 8 + uy, 2, 4); S.decal('lining').set(3, 9 + uy).set(12, 9 + uy); S.decal('gold', { flat: 3 }).set(2, 8 + uy).set(13, 8 + uy); }
      if (dir === 'up') { S.part('coat').rect(3, 8 + uy, 10, 3); S.decal('gold', { flat: 3 }).rect(3, 8 + uy, 10, 1); }
      if (dir === 'right') { S.part('coat').rect(3, 7 + uy, 3, 4); S.decal('gold', { flat: 3 }).rect(3, 7 + uy, 3, 1); }
      if (dir === 'down') famMini(S, 14, 3 + bob, -1, ph % 2 === 0);
      if (dir === 'up') famMini(S, -1, 3 + bob, 1, ph % 2 === 0);
      void b;
    },
    artificer(S, c, L) {
      const { dir, uy, ph } = c, blink = ph % 2 === 0;
      if (dir === 'down') { S.part('frame').line(13, 10 + uy, 13, 6 + uy); S.decal(blink ? 'glow' : 'accent').set(13, 5 + uy); S.part('brass').rect(12, 9 + uy, 2, 2); }
      if (dir === 'right') { S.part('brass').rect(2, 11 + uy, 3, 6); S.decal('leather', { flat: 1 }).rect(2, 13 + uy, 3, 1); S.part('frame').line(3, 10 + uy, 3, 6 + uy); S.decal(blink ? 'glow' : 'accent').set(3, 5 + uy); }
      owLegs(S, c, 'pants', 'boots');
      if (dir === 'right') owArmSide(S, c, 'back', 'shirt', 'skin');
      owTorso(S, c, 'shirt');
      if (dir === 'down') { S.decal('leather').rect(4, 12 + uy, 3, 5).rect(9, 12 + uy, 3, 5); }
      if (dir === 'right') { S.decal('leather').rect(6, 12 + uy, 4, 5); }
      if (dir === 'up') { S.decal('leather').rect(4, 11 + uy, 8, 6); }
      S.part('belt').rect(dir === 'right' ? 5 : 4, 17 + uy, dir === 'right' ? 6 : 8, 1);
      if (dir !== 'up') S.decal('leather', { flat: 1 }).rect(dir === 'right' ? 5 : 4, 17 + uy, 2, 2).rect(dir === 'right' ? 9 : 10, 17 + uy, 2, 2);
      S.decal('gold', { flat: 3 }).set(dir === 'right' ? 8 : 7, 17 + uy);
      const gaunt = (x, y) => { S.part('metal').rect(x, y, 3, 3).rect(x, y + 3, 3, 1); S.decal('brass', { flat: 3 }).set(x + 1, y + 1); };
      if (dir === 'right') {
        const [hx, hy] = owArmSide(S, c, 'front', 'shirt', 'metal');
        gaunt(hx - 1, hy - 3);
      } else owArmsFB(S, c, 'shirt', 'skin', {
        arm: (which, ax, ext) => {
          const g = dir === 'down' ? 'L' : 'R';
          if (which === g) { S.part('shirt').rect(ax, 11 + uy, 2, 2); gaunt(ax - (which === 'L' ? 1 : 0), 13 + uy + ext); return true; }
          S.part('shirt').rect(ax, 11 + uy, 2, 3); S.part('skin').rect(ax, 14 + uy, 2, 2 + ext); S.part('skin').rect(ax, 16 + uy + ext, 2, 1); return true;
        },
      });
      owHead(S, c, L, { goggles: true });
      if (dir === 'up') {
        S.part('brass').rect(5, 11 + uy, 6, 6); S.decal('leather', { flat: 1 }).rect(5, 13 + uy, 6, 1);
        S.part('metal').ell(8, 15 + uy, 1, 1); S.part('frame').line(10, 10 + uy, 10, 6 + uy); S.decal(blink ? 'glow' : 'accent').set(10, 5 + uy);
      }
    },
    rogue(S, c, L) {
      const { dir, uy, ph, stride } = c, fl = ph % 2;
      if (dir === 'down') { S.part('cloak', { back: true }).rect(1, 12 + uy, 2, 7 + fl).rect(13, 12 + uy, 2, 8 - fl); }
      if (dir === 'right') { S.part('cloak').trap(11 + uy, 21, 4, 6, 1 - fl + Math.min(0, -stride), 6); }
      owLegs(S, c, 'pants', 'boots');
      if (dir === 'right') owArmSide(S, c, 'back', 'tunic', 'wrap');
      owTorso(S, c, 'tunic');
      S.part('belt').rect(dir === 'right' ? 5 : 4, 17 + uy, dir === 'right' ? 6 : 8, 1);
      if (dir === 'down') { S.part('steel').set(4, 18 + uy).set(11, 18 + uy); S.part('grip').set(4, 17 + uy).set(11, 17 + uy); S.decal('gold', { flat: 3 }).set(7, 11 + uy); S.decal('gold', { flat: 1 }).set(8, 11 + uy); }
      if (dir === 'right') { S.part('steel').set(5, 18 + uy).set(4, 19 + uy); S.decal('scarf', { flat: 1 }).rect(9, 11 + uy, 2, 2); }
      if (dir === 'right') owArmSide(S, c, 'front', 'tunic', 'wrap');
      else owArmsFB(S, c, 'tunic', 'wrap', { cuff: 'wrap' });
      owHead(S, c, L, { hood: true, mask: true, noHair: true });
      if (dir === 'up') {
        S.part('cloak').trap(12 + uy, 21, 3, 12, 1 + Math.min(0, stride) - fl, 14 + Math.max(0, stride) + fl);
        for (let x = 0; x < 16; x += 2) S.clr(x + fl, 21);
        S.decal('gold', { flat: 3 }).set(8, 15 + uy).set(7, 16 + uy).set(7, 17 + uy).set(8, 18 + uy);
        S.decal('cloak', { flat: 1 }).line(5, 14 + uy, 4, 20).line(10, 14 + uy, 11, 20);
      }
      if (dir === 'down') { S.decal('scarf').rect(5, 11 + uy, 6, 1); }
    },
    mage(S, c, L) {
      const { dir, uy, ph, stride } = c, bob = [0, -1, -1, 0][ph % 4];
      if (dir === 'up') { S.part('tome').rect(-2, 11 + bob, 4, 4); S.decal('gold', { flat: 2 }).rect(-2, 11 + bob, 1, 4); S.decal('accent', { flat: 3 }).rect(0, 12 + bob, 1, 1); S.decal('glow').set(-1, 13 + bob).set(0, 13 + bob); }
      owLegs(S, c, 'pants', 'boots');
      if (dir === 'right') owArmSide(S, c, 'back', 'robe', 'skin', { cuff: 'robeDark' });
      owTorso(S, c, 'robe');
      const s = stride;
      if (dir === 'right') S.part('robe').trap(17 + uy, 21, 5, 10, 3 - s, 12 + s);
      else S.part('robe').trap(17 + uy, 21, 4, 11, 2 + Math.min(0, s), 13 + Math.max(0, s));
      // circuit trim with nodes
      S.decal('accent', { flat: 2 });
      const l0 = dir === 'right' ? 3 - s : 2 + Math.min(0, s), r0 = dir === 'right' ? 12 + s : 13 + Math.max(0, s);
      for (let x = l0; x <= r0; x++) if ((x - l0) % 3 !== 2) S.set(x, 20);
      if (dir !== 'right') { S.rect(7, 12 + uy, 1, 7); S.decal('glow').set(7, 14 + uy).set(7, 18 + uy).set(l0 + 2, 20).set(r0 - 2, 20); }
      else { S.rect(10, 12 + uy, 1, 7); S.decal('glow').set(10, 15 + uy); }
      if (dir === 'right') owArmSide(S, c, 'front', 'robe', 'skin', { cuff: 'robeDark' });
      else owArmsFB(S, c, 'robe', 'skin', { arm: (which, ax, ext) => { S.part('robe').rect(ax, 11 + uy, 2, 4 + ext); S.part('robeDark').rect(ax - (which === 'L' ? 1 : 0), 15 + uy + ext, 3, 1); S.part('skin').set(ax + (which === 'L' ? 0 : 1), 16 + uy + ext); return true; } });
      owHead(S, c, L, { hat: true, hatTilt: ph % 2 });
      if (dir === 'down') { S.part('tome').rect(14, 11 + bob, 4, 4); S.decal('gold', { flat: 2 }).rect(14, 11 + bob, 1, 4); S.decal('accent', { flat: 3 }).set(15, 12 + bob); S.decal('glow').set(16, 12 + bob).set(15, 13 + bob); }
      if (dir === 'right') { S.part('tome').rect(13, 11 + bob, 4, 4); S.decal('gold', { flat: 2 }).rect(13, 11 + bob, 1, 4); S.decal('accent', { flat: 3 }).set(14, 12 + bob); S.decal('glow').set(15, 12 + bob).set(14, 13 + bob); }
    },
  };
  function owFrame(cls, dir, ph, idle, M, L) {
    const S = new Spr(OW.w, OW.h, OW.ox, OW.oy), d = dir === 'left' ? 'right' : dir;
    const c = { dir: d, ph, idle, stride: idle ? 0 : ph === 0 ? 1 : ph === 2 ? -1 : 0, uy: (!idle && ph % 2 === 1 ? -1 : 0) + (idle && ph === 1 ? 1 : 0) };
    OWD[cls.key](S, c, L);
    const cv = S.render(M);
    return dir === 'left' ? flipX(cv) : cv;
  }

  // --------------------------------------------------------------- battle
  // Side view facing right. Battle frames are 96x72 (1.5x the first 64x48 rig):
  // the body is about 40x56 and boot soles sit on row GY = 65. raid.js should
  // anchor sprites by that sole row, not the canvas bottom.
  const BW = 96, BH = 72, K = 1.5, GY = 65;
  function joints(P) {
    const cx = 34 + (P.x || 0), fl = P.fl || [16, -10], bl = P.bl || [-14, -4];
    const legAt = (hip, [t, k]) => { const knee = pt(hip, 9, t), ank = pt(knee, 9, t + k); return { hip, knee, ank }; };
    const pre = Math.max(legAt([cx + 2, 46], fl).ank[1], legAt([cx - 1, 46], bl).ank[1]);
    const Y = Math.round(GY - 3 - pre) - (P.air || 0), br = P.br || 0, lean = P.lean || 0, hd = P.hd || [0, 0];
    const J = { cx, Y, br, lean };
    J.LF = legAt([cx + 2, 46 + Y], fl); J.LB = legAt([cx - 1, 46 + Y], bl);
    J.head = { x: Math.round(cx - 6 + lean + hd[0]), y: Math.round(16 + Y + br + hd[1]), w: 13, h: 13 };
    J.top = 29 + Y + br; J.hipY = 46 + Y;
    const arm = (sh, [s, e]) => { const el = pt(sh, 7, s), ha = pt(el, 7, s + e); return { sh, el, ha, ang: s + e }; };
    J.AF = arm([cx + 2 + lean, 32 + Y + br], P.fa || [20, 60]);
    J.AB = arm([cx - 2 + lean, 32 + Y + br], P.ba || [-15, 30]);
    return J;
  }
  // thigh 4px, shin 3px, a booted foot with a heel, toe and sole
  function bLeg(S, L, pants, boots, back) {
    S.part(pants, { back }).line(L.hip[0], L.hip[1], L.knee[0], L.knee[1], 4).line(L.knee[0], L.knee[1], L.ank[0], L.ank[1] - 2, 3);
    const ax = Math.round(L.ank[0]), ay = Math.round(L.ank[1]);
    S.part(boots, { back }).rect(ax - 2, ay - 3, 4, 3).rect(ax - 2, ay, 6, 2).set(ax + 4, ay + 1);
    S.decal(boots, { flat: 3 }).set(ax - 1, ay - 3).set(ax + 2, ay);
    S.part('sole', { back, flat: 1 }).rect(ax - 2, ay + 2, 7, 1);
  }
  function bArm(S, A, sleeve, hand, back, o = {}) {
    S.part(sleeve, { back, ink: !back }).line(A.sh[0], A.sh[1], A.el[0], A.el[1], 3).line(A.el[0], A.el[1], A.ha[0], A.ha[1], o.fore || 3);
    if (o.cuff) { const c = pt(A.ha, -2, A.ang); S.part(o.cuff, { back, flat: 2 }).rect(Math.round(c[0]) - 1, Math.round(c[1]) - 1, o.cuffW || 3, 3); }
    S.part(hand, { back }).rect(Math.round(A.ha[0]) - 1, Math.round(A.ha[1]) - 1, 3, 3);
  }
  // shoulders 11px, chest, a waist 9px wide; lean shifts the shoulders
  function bTorso(S, J, mat, wide = 0) {
    S.part('skin').rect(J.cx - 1 + J.lean, J.top - 2, 3, 3);
    S.part(mat, { deep: 2 });
    const t = J.top, b = J.hipY;
    for (let y = t; y <= b; y++) {
      const k = (y - t) / (b - t), sh = Math.round(J.lean * (1 - k)), half = k < 0.5 ? 5 : 4;
      S.rect(J.cx - half - wide + sh, y, half * 2 + 1 + wide * 2, 1);
    }
    S.clr(J.cx - 5 - wide + J.lean, t); S.clr(J.cx + 5 + wide + J.lean, t);
  }
  const grip = A => [A.ha[0], A.ha[1]];
  function sword(S, A, ang, glow, glint) {
    const g = grip(A), base = pt(g, 3, ang), tip = pt(g, 23, ang);
    S.part('steel').line(base[0], base[1], tip[0], tip[1], 2);
    S.decal('steel', { flat: 4 }).line(...pt(g, 5, ang), ...pt(g, 20, ang));
    const gd = pt(g, 2, ang), a = pt(gd, 3, ang + 90), b = pt(gd, -3, ang + 90);
    S.part('gold').line(a[0], a[1], b[0], b[1], 2);
    const pm = pt(g, -5, ang);
    S.part('grip').line(g[0], g[1], pm[0], pm[1], 2);
    S.part('keyDark').rect(Math.round(pm[0]) - 1, Math.round(pm[1]) - 1, 3, 3);
    S.decal('accent', { flat: 2 }).set(Math.round(pm[0]), Math.round(pm[1]) - 1);
    if (glint != null && !glow) S.decal('white').set(...pt(g, 7 + (glint % 4) * 4, ang).map(Math.round));
    if (glow) { fxPart(S); for (let i = 6; i <= 23; i += 2) { const q = pt(g, i, ang), n = pt(q, 2, ang + 90); S.set(Math.round(n[0]), Math.round(n[1]), 'glow'); if (glow > 1) { const m = pt(q, -2, ang + 90); S.set(Math.round(m[0]), Math.round(m[1]), 'glow'); } } }
    return tip;
  }
  // silver cage around a gem orb, no brass
  function staff(S, A, ang) {
    const g = grip(A), bot = pt(g, -13, ang), top = pt(g, 26, ang);
    S.part('staff').line(bot[0], bot[1], top[0], top[1], 2);
    S.part('steel').line(...pt(g, -13, ang), ...pt(g, -11, ang), 2);
    const h = pt(g, 30, ang);
    S.part('steel').ell(h[0], h[1], 3.4, 3.4);
    S.part('gem').ell(h[0], h[1], 2.2, 2.2);
    S.decal('glow').set(Math.round(h[0]) - 1, Math.round(h[1]) - 1);
    S.decal('white').set(Math.round(h[0]) - 1, Math.round(h[1]) - 2);
    return h;
  }
  function dagger(S, A, ang) {
    const g = grip(A), tip = pt(g, 11, ang), base = pt(g, 2, ang);
    S.part('steel').line(base[0], base[1], tip[0], tip[1], 2);
    S.decal('steel', { flat: 4 }).line(...pt(g, 4, ang), ...pt(g, 10, ang));
    const a = pt(base, 2, ang + 90), b = pt(base, -2, ang + 90);
    S.part('steel').line(a[0], a[1], b[0], b[1]);
    const pm = pt(g, -3, ang);
    S.part('grip').line(g[0], g[1], pm[0], pm[1], 2);
    S.part('gem', { flat: 2 }).set(Math.round(pm[0]), Math.round(pm[1]));
    return tip;
  }
  function famBig(S, x, y, f, look = 1, eye = 'open') {
    x = Math.round(x); y = Math.round(y);
    S.part('accent').ell(x, y, 3, 2.2).rect(x - 1, y - 3, 3, 1);
    S.part('steel').rect(x - 1, y - 4, 1, 1); S.decal('glow').set(x - 2, y - 5);
    if (eye === 'happy') { S.decal('white').set(x - 1, y).set(x, y - 1).set(x + 1, y); }
    else if (eye === 'x') { S.decal('white').set(x + look, y - 1).set(x + look + 1, y).set(x + look, y + 1); }
    else { S.decal('white').rect(x + (look > 0 ? 0 : -2), y - 1, 3, 2); S.decal('eye').rect(x + (look > 0 ? 1 : -1), y - 1, 1, 2); }
    fxPart(S); S.set(x - 1 + (f % 2), y + 3, 'glow'); S.set(x + (f % 2), y + 4, 'fx');
  }
  function smear(S, c, r, a0, a1, maxT, fade = false) {
    fxPart(S);
    const steps = Math.ceil(Math.abs(a1 - a0) / 2.5);
    for (let i = 0; i <= steps; i++) {
      const k = i / steps, a = a0 + (a1 - a0) * k, th = Math.max(1, Math.round(maxT * Math.sin(k * Math.PI * 0.9 + 0.1)));
      for (let j = 0; j < th; j++) {
        const p = pt(c, r - j, a), col = j === 0 ? '#ffffff' : j === 1 ? 'glow' : 'fx';
        if (fade && (i + j) % 2) continue;
        S.set(Math.round(p[0]), Math.round(p[1]), col);
      }
    }
  }
  function sparkle(S, x, y, s = 2, col = '#ffffff') {
    fxPart(S); x = Math.round(x); y = Math.round(y);
    S.set(x, y, col); for (let i = 1; i <= s; i++) { S.set(x + i, y, i === s ? 'glow' : col); S.set(x - i, y, i === s ? 'glow' : col); S.set(x, y + i, i === s ? 'glow' : col); S.set(x, y - i, i === s ? 'glow' : col); }
  }

  // per-class battle painters. Each draws one pose.
  const BTL = {
    engineer(S, P, J, L) {
      bArm(S, J.AB, 'jacket', 'skin', true, { cuff: 'jacketDark' });
      bLeg(S, J.LB, 'pants', 'boots', true); bLeg(S, J.LF, 'pants', 'boots', false);
      bTorso(S, J, 'jacket');
      // jacket skirt flares a little past the hips
      S.part('jacket').trap(J.hipY - 1, J.hipY + 3, J.cx - 4, J.cx + 4, J.cx - 6 - (P.flare || 0) - [0, 0, 1, 1][(P.k || 0) % 4], J.cx + 5);
      S.decal('shirt').rect(J.cx + 3 + J.lean, J.top + 1, 2, 10);
      S.decal('jacket', { flat: 4 }).set(J.cx + 2 + J.lean, J.top + 1).set(J.cx + 2 + J.lean, J.top + 2);
      S.decal('jacketDark', { flat: 1 }).line(J.cx + 2 + J.lean, J.top + 3, J.cx + 2, J.hipY + 3);
      S.decal('belt').rect(J.cx - 4, J.hipY - 2, 9, 2); S.decal('gold', { flat: 3 }).rect(J.cx + 2, J.hipY - 2, 2, 2);
      headAll(S, 'side', J.head, L, { eyes: P.eyes, mouth: P.mouth });
      bArm(S, J.AF, 'jacket', 'skin', false, { cuff: 'jacketDark' });
      S.decal('gold', { flat: 2 }).rect(Math.round(J.AF.sh[0]) - 1, Math.round(J.AF.sh[1]) + 1, 3, 2);
      S.decal('gold', { flat: 4 }).set(Math.round(J.AF.sh[0]) - 1, Math.round(J.AF.sh[1]) + 1);
      const tip = sword(S, J.AF, P.w1 ?? 140, P.glow, P.k);
      P.fx && P.fx.forEach(f => FX[f[0]] && FX[f[0]](S, J, f, tip, L));
    },
    orchestrator(S, P, J, L) {
      const fam = famPositions(P, J), fl = P.flare || 0, sway = [0, 1, 1, 0][(P.k || 0) % 4];
      fam.filter(f => !f.front).forEach(f => famBig(S, f.x, f.y, P.k || 0, f.look ?? 1, f.eye || P.famEye));
      // split coat: a long tail streams behind, the front panel stops at the knee so the legs read
      S.part('coat', { back: true }).trap(J.hipY - 2, GY - 5, J.cx - 5, J.cx - 1, J.cx - 11 - fl - sway, J.cx - 4 - fl);
      S.decal('lining', { back: true }).line(J.cx - 4 - fl, J.hipY + 4, J.cx - 5 - fl, GY - 6, 2);
      S.decal('gold', { flat: 2, back: true }).line(J.cx - 11 - fl - sway, GY - 5, J.cx - 4 - fl, GY - 5);
      bArm(S, J.AB, 'coat', 'skin', true, { cuff: 'gold' });
      bLeg(S, J.LB, 'pants', 'boots', true); bLeg(S, J.LF, 'pants', 'boots', false);
      bTorso(S, J, 'coat');
      const kx = Math.round((J.LF.knee[0] - J.cx) * 0.6);
      S.part('coat').trap(J.hipY - 1, J.hipY + 7, J.cx - 4, J.cx + 5, J.cx - 4, J.cx + 5 + kx);
      S.decal('gold', { flat: 2 }).line(J.cx + 5 + J.lean, J.top + 1, J.cx + 5 + kx, J.hipY + 7).line(J.cx - 4, J.hipY + 7, J.cx + 5 + kx, J.hipY + 7);
      S.decal('gold', { flat: 4 }).set(J.cx + 3 + J.lean, J.top + 4).set(J.cx + 3 + J.lean, J.top + 8).set(J.cx + 3, J.top + 12);
      S.decal('coatDark', { flat: 1 }).rect(J.cx - 4, J.hipY - 1, 9, 1);
      headAll(S, 'side', J.head, L, { eyes: P.eyes, mouth: P.mouth });
      // high collar at the back of the neck
      S.part('coat').rect(J.head.x + 1, J.head.y + 7, 4, 7); S.decal('gold', { flat: 3 }).rect(J.head.x + 1, J.head.y + 7, 4, 1);
      S.decal('lining').rect(J.head.x + 4, J.head.y + 8, 1, 5);
      bArm(S, J.AF, 'coat', 'skin', false, { cuff: 'gold' });
      const tip = staff(S, J.AF, P.w1 ?? 180);
      fam.filter(f => f.front).forEach(f => famBig(S, f.x, f.y, P.k || 0, f.look ?? 1, f.eye || P.famEye));
      P.fx && P.fx.forEach(f => FX[f[0]] && FX[f[0]](S, J, f, tip, L, fam));
    },
    artificer(S, P, J, L) {
      // backpack with a blinking antenna
      S.part('brass').rect(J.cx - 10 + J.lean, J.top + 1, 6, 10); S.decal('leather', { flat: 1 }).rect(J.cx - 10 + J.lean, J.top + 4, 6, 1);
      S.decal('metal', { flat: 3 }).rect(J.cx - 9 + J.lean, J.top + 7, 2, 2);
      S.part('frame').line(J.cx - 8 + J.lean, J.top, J.cx - 8 + J.lean, J.top - 9);
      S.decal((P.k || 0) % 2 ? 'glow' : 'accent').set(J.cx - 8 + J.lean, J.top - 10).set(J.cx - 9 + J.lean, J.top - 10);
      bArm(S, J.AB, 'shirt', 'skin', true);
      if (P.wrench === true) { const g = grip(J.AB), e = pt(g, 7, J.AB.ang + 20); S.part('steel', { back: true }).line(g[0], g[1], e[0], e[1], 2); S.part('steel', { back: true }).rect(Math.round(e[0]) - 2, Math.round(e[1]), 4, 2); }
      bLeg(S, J.LB, 'pants', 'boots', true); bLeg(S, J.LF, 'pants', 'boots', false);
      bTorso(S, J, 'shirt');
      S.decal('leather').trap(J.top + 2, J.hipY, J.cx - 3 + J.lean, J.cx + 4 + J.lean, J.cx - 3, J.cx + 4);
      S.decal('leather', { flat: 3 }).line(J.cx + 4 + J.lean, J.top + 2, J.cx + 4, J.hipY);
      S.decal('belt').rect(J.cx - 4, J.hipY - 1, 9, 2); S.decal('gold', { flat: 3 }).rect(J.cx + 1, J.hipY - 1, 2, 2);
      S.part('leather').rect(J.cx - 6, J.hipY, 3, 4); S.decal('leather', { flat: 1 }).rect(J.cx - 6, J.hipY, 3, 1); S.part('steel').rect(J.cx - 5, J.hipY - 2, 1, 2);
      headAll(S, 'side', J.head, L, { eyes: P.eyes, mouth: P.mouth, goggles: true });
      const A = J.AF;
      S.part('shirt').line(A.sh[0], A.sh[1], A.el[0], A.el[1], 3);
      S.part('metal', { ink: true }).line(A.el[0], A.el[1], A.ha[0], A.ha[1], 4);
      S.part('metal').rect(Math.round(A.ha[0]) - 2, Math.round(A.ha[1]) - 2, 5, 5);
      S.decal('metal', { flat: 4 }).rect(Math.round(A.ha[0]) - 1, Math.round(A.ha[1]) - 2, 2, 1);
      S.decal('accent', { flat: 2 }).set(Math.round(A.ha[0]) + 1, Math.round(A.ha[1]));
      gear(S, A.el[0], A.el[1], P.gear || 0);
      P.fx && P.fx.forEach(f => FX[f[0]] && FX[f[0]](S, J, f, [A.ha[0] + 3, A.ha[1] + 1], L));
      if (P.turret) turret(S, P.turret, J);
    },
    rogue(S, P, J, L) {
      const fl = (P.k || 0) % 2, cl = P.capeLen || 0;
      // cape streams back; its inner lining shows along the lower edge so it never merges with the legs
      S.part('cloak', { back: true }).trap(J.top, J.hipY + 8 + cl, J.cx - 4 + J.lean, J.cx + J.lean, J.cx - 15 - fl - cl, J.cx - 5);
      S.decal('capeLining', { back: true }).line(J.cx - 6, J.hipY + 7 + cl, J.cx - 15 - fl - cl, J.hipY + 8 + cl, 2).line(J.cx - 5, J.top + 6, J.cx - 6, J.hipY + 7 + cl);
      S.decal('gold', { flat: 3, back: true }).set(J.cx - 9 - fl, J.hipY - 2).set(J.cx - 10 - fl, J.hipY - 1).set(J.cx - 10 - fl, J.hipY).set(J.cx - 10 - fl, J.hipY + 1).set(J.cx - 9 - fl, J.hipY + 2);
      bArm(S, J.AB, 'tunic', 'wrap', true, { cuff: 'wrap' });
      dagger(S, J.AB, P.w2 ?? 200);
      bLeg(S, J.LB, 'pants', 'boots', true); bLeg(S, J.LF, 'pants', 'boots', false);
      S.decal('wrap', { flat: 2 }).line(...pt(J.LF.knee, 3, 0), ...pt(J.LF.knee, 5, 0));
      bTorso(S, J, 'tunic');
      S.decal('belt').rect(J.cx - 4, J.hipY - 1, 9, 2); S.decal('gold', { flat: 3 }).rect(J.cx + 1, J.hipY - 1, 2, 2);
      S.decal('tunic', { flat: 3 }).line(J.cx + 4 + J.lean, J.top + 1, J.cx + 3, J.hipY - 2);
      headAll(S, 'side', J.head, L, { eyes: P.eyes, mouth: P.mouth, hood: true, mask: true, noHair: true, frame: P.k || 0 });
      S.part('scarf').line(J.head.x + 3, J.head.y + 11, J.head.x - 5 - fl * 2, J.head.y + 13 + fl, 3);
      S.part('scarf').line(J.head.x - 5 - fl * 2, J.head.y + 13 + fl, J.head.x - 9 - fl * 2, J.head.y + 12 + fl * 2, 2);
      bArm(S, J.AF, 'tunic', 'wrap', false, { cuff: 'wrap' });
      const tip = dagger(S, J.AF, P.w1 ?? 20);
      if (P.glint) sparkle(S, tip[0], tip[1], 1);
      if (P.moonGlint) S.decal('white').set(J.cx - 10, J.hipY - 1);
      P.fx && P.fx.forEach(f => FX[f[0]] && FX[f[0]](S, J, f, tip, L));
    },
    mage(S, P, J, L) {
      const tm = P.tome || { dx: 16, dy: 0, open: 0 }, bob = [0, -1, -1, 0][(P.k || 0) % 4];
      bArm(S, J.AB, 'robe', 'skin', true, { cuff: 'robeDark', cuffW: 4 });
      bLeg(S, J.LB, 'pants', 'boots', true); bLeg(S, J.LF, 'pants', 'boots', false);
      bTorso(S, J, 'robe');
      const sw = [0, 1, 1, 0][(P.k || 0) % 4], fx = Math.max(J.LF.ank[0] + 1, J.cx + 7) + sw, bx = Math.min(J.LB.ank[0] - 1, J.cx - 7) - sw;
      S.part('robe').trap(J.hipY - 2, GY - 3, J.cx - 4, J.cx + 5, Math.round(bx) - 2, Math.round(fx) + 2);
      S.decal('accent', { flat: 2 });
      for (let x = Math.round(bx) - 2; x <= Math.round(fx) + 2; x++) if ((x + 1) % 4) S.set(x, GY - 4);
      S.rect(J.cx + 2 + J.lean, J.top + 2, 1, 9).line(J.cx + 2, J.hipY - 1, J.cx + 3, GY - 5);
      S.decal('glow').set(J.cx + 2 + J.lean, J.top + 5).set(J.cx + 3, GY - 8).set(J.cx + 2, J.hipY + 4);
      S.decal('robeDark', { flat: 1 }).line(J.cx - 1, J.hipY, Math.round(bx), GY - 5);
      headAll(S, 'side', J.head, L, { eyes: P.eyes, mouth: P.mouth, hat: true, hatTilt: P.hatTilt ?? ((P.k || 0) % 2) });
      bArm(S, J.AF, 'robe', 'skin', false, { cuff: 'robeDark', cuffW: 4 });
      const tx = J.cx + tm.dx, ty = 36 + J.Y + (tm.dy || 0) + bob;
      tome(S, tx, ty, tm.open || 0, P.k || 0, tm.flip || 0);
      P.fx && P.fx.forEach(f => FX[f[0]] && FX[f[0]](S, J, f, [tx + 6, ty + 1], L));
    },
  };
  function gear(S, x, y, rot) {
    x = Math.round(x); y = Math.round(y);
    S.part('brass').ell(x, y, 2.4, 2.4);
    S.decal('frame', { flat: 2 }).set(x, y);
    const teeth = [[0, -4], [3, -3], [4, 0], [3, 3], [0, 4], [-3, 3], [-4, 0], [-3, -3]];
    S.part('brass', { flat: 3 });
    teeth.forEach(([a, b], i) => { if ((i + rot) % 2 === 0) S.set(x + a, y + b); });
  }
  function turret(S, T, J) {
    const x = T.x ?? 60, gy = GY;
    if (T.stage === 0) { S.part('brass').rect(Math.round(J.AF.ha[0]), Math.round(J.AF.ha[1]) - 3, 7, 6); S.decal('frame', { flat: 1 }).rect(Math.round(J.AF.ha[0]), Math.round(J.AF.ha[1]), 7, 1); return; }
    if (T.stage === 1) { S.part('brass').rect(x, gy - 5, 9, 6); S.decal('frame', { flat: 1 }).rect(x, gy - 2, 9, 1); S.part('accent').rect(x + 6, gy - 4, 2, 1); return; }
    S.part('metal').line(x + 2, gy - 4, x - 1, gy).line(x + 6, gy - 4, x + 9, gy).line(x + 4, gy - 4, x + 4, gy);
    const up = T.stage >= 3 ? 11 : 8;
    S.part('brass').rect(x, gy - up, 9, 6);
    S.decal('brass', { flat: 3 }).rect(x + 1, gy - up, 4, 1);
    S.part('metal').rect(x + 8, gy - up + 2, T.stage >= 3 ? 7 : 3, 3);
    S.decal((T.fire || 0) ? 'glow' : 'accent').rect(x + 3, gy - up + 2, 2, 2);
    if (T.fire) {
      fxPart(S); const mx = x + 16, my = gy - up + 3;
      S.set(mx, my, '#ffffff').set(mx + 1, my, 'glow').set(mx, my - 1, 'glow').set(mx, my + 1, 'glow').set(mx + 1, my - 1, '#ffffff').set(mx + 2, my, 'fx');
      const bx = T.fire === 1 ? mx + 8 : mx + 18; S.rect(bx, my - 1, 6, 2, 'glow'); S.rect(bx + 6, my - 1, 3, 2, '#ffffff');
      if (T.fire === 2) { S.part('gold').rect(x + 3, gy - up - 3, 2, 1).rect(x + 1, gy - up - 6, 2, 1); }
    }
  }
  function tome(S, x, y, open, k, flip = 0) {
    x = Math.round(x); y = Math.round(y);
    if (!open && flip) { S.part('page').rect(x + 6, y + 1, flip + 1, 7); S.decal('page', { flat: 1 }).rect(x + 6, y + 3, flip + 1, 1).rect(x + 6, y + 6, flip + 1, 1); }
    if (!open) { S.part('tome').rect(x, y, 7, 9); S.decal('gold', { flat: 2 }).rect(x, y, 2, 9); S.decal('accent', { flat: 2 }).rect(x + 3, y + 3, 3, 1).rect(x + 3, y + 5, 2, 1); return; }
    // open: a little terminal, screen lit with prompt lines
    S.part('tome').rect(x - 2, y + 7, 15, 3).rect(x, y - 3, 12, 10);
    S.decal('gold', { flat: 2 }).rect(x - 2, y + 9, 15, 1);
    S.decal('screen', { flat: 1 }).rect(x + 1, y - 2, 10, 8);
    fxPart(S);
    glyph(S, '>', x + 2, y - 1, 'glow');
    const lines = open > 1 ? [[6, y - 1, 4], [2, y + 2, 3 + (k % 4)], [2, y + 4, 6]] : [[6, y - 1, 2]];
    lines.forEach(([dx, yy, len]) => S.rect(x + dx, yy, len, 1, 'fx'));
    if (k % 2 === 0) S.rect(x + 6 + (open > 1 ? 5 : 3), y - 1, 1, 2, '#ffffff');
  }
  function famPositions(P, J) {
    if (P.fam) return P.fam.map(([x, y, front, look]) => ({ x: J.cx + x, y: J.Y + 30 + y, front: front ?? true, look }));
    const k = P.k || 0, n = P.famN || 3;
    const out = Array.from({ length: n }, (_, i) => {
      const a = (k * 30 + i * (360 / n)) * Math.PI / 180;
      return { x: J.cx + 1 + Math.cos(a) * 19, y: J.Y + 26 + Math.sin(a) * 6 - (i % 2), front: Math.sin(a) > 0, look: 1 };
    });
    if (P.nuzzle) out[0] = { x: J.head.x + 18 - P.nuzzle, y: J.head.y + 8, front: true, look: -1, eye: 'happy' };
    return out;
  }
  // effects referenced from poses as ['name', ...args]; coordinates in old-rig units get scaled by K
  const FX = {
    smear: (S, J, f) => smear(S, J.AF.sh, (f[3] || 15) * K, f[1], f[2], (f[4] || 3) + 1),
    smearFade: (S, J, f) => smear(S, J.AF.sh, (f[3] || 15) * K, f[1], f[2], 3, true),
    brackets: (S, J, f, tip) => { glyph(S, '{', tip[0] - 9, tip[1] - 2, 'glow'); glyph(S, '}', tip[0] + 6, tip[1] - 2, 'glow'); },
    shock: (S, J, f) => { fxPart(S); const r = f[1] * 10; for (let x = J.cx + 9; x < J.cx + 15 + r * 2; x++) { if ((x + f[1]) % 3 === 0) continue; S.set(x, GY, x < J.cx + 12 + r ? '#ffffff' : 'glow'); } for (let i = 0; i < 3; i++) S.rect(J.cx + 18 + r + i * 6, GY - 1 - (i % 2) * 3 - f[1], 1, 3 + i % 2, 'fx'); },
    shards: (S, J, f) => { const s = f[1]; [[21, -9], [30, -13], [39, -7]].forEach(([dx, dy], i) => { const x = J.cx + dx + s * 3, y = GY + dy - s * 4 + i; S.part('key').rect(x, y, 3, 3); S.decal('accent', { flat: 2 }).set(x + 1, y + 1); }); },
    spark: (S, J, f, tip) => sparkle(S, tip[0], tip[1], (f[1] || 2) + 1),
    beams: (S, J, f, tip, L, fam) => { fxPart(S); fam.forEach(m => { const y = Math.round(m.y); for (let x = Math.round(m.x) + 4; x < BW; x++) { S.set(x, y, f[1] > 1 ? '#ffffff' : 'glow'); if (f[1] > 1) S.set(x, y + 1, 'fx'); } }); },
    impact: (S) => { sparkle(S, 90, 26, 4); sparkle(S, 86, 37, 3, 'glow'); },
    burst: (S, J, f) => { const x = f[1] * K, y = f[2] * K + 4, r = (f[3] || 3) + 1; sparkle(S, x, y, r); fxPart(S); for (let a = 0; a < 360; a += 30) { const p = pt([x, y], r + 4, a); S.set(Math.round(p[0]), Math.round(p[1]), 'glow'); } },
    ring: (S, J, f) => { fxPart(S); for (let a = 0; a < 360; a += 8) { const p = [J.cx + 1 + Math.cos(a * Math.PI / 180) * 24, J.Y + 27 + Math.sin(a * Math.PI / 180) * 9]; if ((a / 8 + (f[1] || 0)) % 3) S.set(Math.round(p[0]), Math.round(p[1]), 'fx'); } },
    trails: (S, J, f, tip, L, fam) => { fxPart(S); fam.forEach(m => { for (let i = 1; i < 11; i++) if (i % 2) S.set(Math.round(m.x) - 3 - i, Math.round(m.y), 'fx'); }); },
    steam: (S, J) => { fxPart(S); const e = J.AF.el; [[-3, -4], [-6, -7], [-4, -10]].forEach(([a, b], i) => S.rect(Math.round(e[0]) + a, Math.round(e[1]) + b, 3 - i, 2 - (i === 2 ? 1 : 0), i ? 'glow' : '#ffffff')); },
    speed: (S, J) => { fxPart(S); const h = J.AF.ha; [[-9, -3, 7], [-13, 1, 10], [-8, 4, 6]].forEach(([a, b, l]) => S.rect(Math.round(h[0]) + a - l, Math.round(h[1]) + b, l, 1, 'glow')); },
    star: (S, J, f, tip) => { sparkle(S, tip[0] + 3, tip[1], 4); fxPart(S); [[6, -6], [6, 6], [-1, -7], [-1, 7]].forEach(([a, b]) => S.set(Math.round(tip[0] + 3 + a), Math.round(tip[1] + b), 'glow')); },
    xslash: (S, J, f) => { const c = [J.cx + 18, J.Y + 38]; smear(S, [c[0] - 9, c[1] - 9], 16, 40, 130, 4, f[1] === 'fade'); smear(S, [c[0] - 9, c[1] + 9], 16, 140, 50, 4, f[1] === 'fade'); },
    xmark: (S, J, f) => { fxPart(S); const x = Math.round(f[1] * K), y = Math.round(f[2] * K + 4), r = Math.round(f[3] * K); for (let i = -r; i <= r; i++) { S.set(x + i, y + i, Math.abs(i) < r - 1 ? '#ffffff' : 'glow'); S.set(x + i, y - i, Math.abs(i) < r - 1 ? '#ffffff' : 'glow'); if (r > 6) { S.set(x + i + 1, y + i, 'fx'); S.set(x + i + 1, y - i, 'fx'); } } },
    moon: (S, J, f, tip) => { S.part('gold').rect(tip[0], tip[1] - 9, 2, 1).rect(tip[0] - 1, tip[1] - 8, 1, 4).rect(tip[0], tip[1] - 4, 2, 1); sparkle(S, tip[0] + 6, tip[1] - 12, 1); },
    shot: (S, J, f) => { fxPart(S); const x = Math.round(f[1] * K), y = J.Y + 33; glyph(S, '>', x, y, 'glow'); glyph(S, '_', x + 4, y, '#ffffff'); for (let i = 2; i < 11; i += 2) S.set(x - i, y + 2, 'fx'); },
    rune: (S, J, f) => { fxPart(S); const cx = J.cx, cy = GY - 1, k = f[1]; for (let a = 0; a < 360; a += 7) { const p = [cx + Math.cos(a * Math.PI / 180) * 21, cy + Math.sin(a * Math.PI / 180) * 4]; S.set(Math.round(p[0]), Math.round(p[1]), (a / 7 + k) % 4 ? 'fx' : '#ffffff'); } if (k > 1) ['>', '$', '{', '}'].forEach((ch, i) => glyph(S, ch, cx - 21 + i * 12, GY - 14 - (i % 2) * 4 - k, 'glow')); },
    prompt: (S, J, f) => { fxPart(S); for (let i = 0; i < f[1] + 2; i++) S.rect(J.cx + 21 + (i % 2) * 3, 27 - i * 4 + J.Y, 7 + (i % 3) * 2, 1, i % 2 ? 'glow' : 'fx'); },
    beam: (S, J, f, src) => { fxPart(S); const y = Math.round(src[1]); for (let x = Math.round(src[0]); x < BW; x++) { S.set(x, y - 1, f[1] === 'fade' ? 'fx' : 'glow'); S.set(x, y, f[1] === 'fade' && x % 2 ? 'glow' : '#ffffff'); S.set(x, y + 1, f[1] === 'fade' ? 'fx' : '#ffffff'); S.set(x, y + 2, 'glow'); if (f[1] !== 'fade') S.set(x, y + 3, 'fx'); } },
    vent: (S, J) => { fxPart(S); const x = J.cx - 6 + J.lean, y = J.top - 1; S.rect(x, y - 1, 2, 1, '#ffffff').rect(x + 1, y - 3, 2, 1, 'glow').set(x, y - 5, 'fx'); },
    bits: (S, J) => { fxPart(S); [[60, 27], [72, 42], [82, 30], [66, 45]].forEach(([x, y], i) => glyph(S, i % 2 ? '*' : '+', x, y, 'glow')); },
  };

  // hand-keyed flinch: frame 0 snaps back from the hit, frame 1 hunches behind a raised guard
  const hurtPoses = (a, b) => [
    { x: -3, lean: -3, hd: [-2, 0], fa: [-50, 30], ba: [-120, 30], eyes: 'wince', mouth: 'open', fl: [20, -30], bl: [-35, -10], ...a },
    { x: -4, lean: 1, hd: [1, 1], br: 1, fa: [140, 70], ba: [60, 80], eyes: 'wince', fl: [35, -55], bl: [-15, -45], ...b },
  ];

  // ----------------------------------------------------------- the classes
  const CLASSES = [
    {
      key: 'engineer', name: 'Engineer', special: 'Refactor Cleave', blurb: 'Base class. Practical jacket, a sword with a keycap pommel, the [NaN] patch.',
      mats: L => ({ jacket: ramp('#3d5174', { step: 0.1 }), jacketDark: ramp('#2a3956'), shirt: ramp(L.accent, { step: 0.12 }), pants: ramp('#2b3146', { step: 0.08 }), boots: ramp('#5c3f2e', { step: 0.09 }), belt: ramp('#3a2a22'), grip: ramp('#3b3448', { step: 0.08 }) }),
      N: { fa: [55, 45], ba: [-25, 25], fl: [28, -24], bl: [-26, -8], w1: 112, lean: 1 },
      idle: [{ k: 0 }, { k: 1, w1: 113 }, { k: 2, br: 1, w1: 115 }, { k: 3, br: 1, w1: 114 }],
      attack: [
        { lean: -1, fa: [-150, 40], ba: [10, 40], w1: -120, fl: [28, -34], bl: [-14, -16] },
        { lean: -1, fa: [-172, 20], ba: [15, 40], w1: -160, fl: [30, -38], bl: [-14, -18], eyes: 'squint' },
        { x: 4, lean: 3, flare: 2, fa: [100, 0], w1: 90, fl: [45, -25], bl: [-35, -5], fx: [['smear', 195, 85, 15, 4]] },
        { x: 5, lean: 3, flare: 3, fa: [60, -10], w1: 35, fl: [45, -25], bl: [-38, -4], fx: [['smearFade', 110, 35, 15]] },
        { x: 4, lean: 2, fa: [55, 0], w1: 30, fl: [40, -24], bl: [-34, -4] },
        { x: 2, lean: 1, fa: [40, 50], w1: 100, fl: [30, -20], bl: [-24, -6] },
      ],
      specialPoses: [
        { fa: [-40, -20], ba: [-30, 20], w1: -50, fl: [35, -60], bl: [-10, -50], eyes: 'squint', glow: 1 },
        { air: 5, fa: [110, 55], ba: [168, 10], w1: 178, fl: [40, -70], bl: [-20, -40], glow: 1 },
        { air: 8, fa: [110, 55], ba: [174, 5], w1: 182, fl: [50, -80], bl: [-10, -60], glow: 2, fx: [['brackets']] },
        { air: 3, x: 3, lean: 3, fa: [95, 0], ba: [90, 5], w1: 80, fl: [40, -50], bl: [-25, -20], glow: 1, fx: [['smear', 185, 75, 16, 4]] },
        { x: 4, lean: 3, fa: [55, 0], ba: [50, 0], w1: 25, fl: [50, -60], bl: [-30, -30], fx: [['shock', 1], ['shards', 1]] },
        { x: 3, lean: 2, fa: [45, 10], ba: [40, 10], w1: 30, fl: [40, -40], bl: [-28, -15], fx: [['shock', 2], ['shards', 2]] },
      ],
      hurt: hurtPoses({ w1: 250 }, { w1: 200 }),
      victory: [
        { fa: [110, 55], w1: 172, ba: [-35, -25] }, { air: 2, fa: [110, 55], w1: 174, ba: [-35, -25] },
        { air: 3, fa: [110, 55], w1: 176, ba: [-35, -25], fx: [['spark', 3]] }, { air: 1, fa: [110, 55], w1: 174, ba: [-35, -25], fx: [['spark', 2]] },
      ],
    },
    {
      key: 'orchestrator', name: 'Agent Orchestrator', special: 'Swarm', blurb: 'Current class (2026). Long coat, conductor staff, three agent familiars.',
      mats: L => ({ coat: ramp('#24467a', { step: 0.1 }), coatDark: ramp('#182c52', { step: 0.08 }), lining: ramp(mix(L.accent, '#16203a', 0.45), { step: 0.1 }), pants: ramp('#1f2438', { step: 0.08 }), boots: ramp('#2e2232'), staff: ramp('#5a6680', { step: 0.12 }) }),
      N: { fa: [15, 70], ba: [-20, 30], fl: [22, -16], bl: [-16, -4], w1: 180, lean: 1 },
      idle: [{ k: 0 }, { k: 1 }, { k: 2, br: 1, nuzzle: 1 }, { k: 3, br: 1, nuzzle: 2 }],
      attack: [
        { k: 0, lean: -1, fa: [-40, 40], w1: 215, fam: [[-12, -10, false, 1], [-15, -4, false, 1], [-11, 1, false, 1]] },
        { k: 1, lean: 1, fa: [60, 60], w1: 145, fam: [[14, -10], [18, -4], [14, 2]] },
        { k: 2, lean: 2, x: 1, fa: [95, 10], w1: 110, flare: 2, fam: [[22, -12], [27, -5], [22, 2]], fx: [['trails']] },
        { k: 3, lean: 2, x: 1, fa: [95, 10], w1: 105, flare: 2, fam: [[22, -12], [27, -5], [22, 2]], fx: [['beams', 2]] },
        { k: 0, lean: 2, x: 1, fa: [92, 12], w1: 108, flare: 1, fam: [[21, -12], [26, -5], [21, 2]], fx: [['beams', 1], ['impact']] },
        { k: 1, lean: 0, fa: [30, 60], w1: 170 },
      ],
      specialPoses: [
        { k: 0, fa: [110, 55], ba: [150, 15], w1: 185, fam: [[-6, -16], [2, -19], [10, -16]] },
        { k: 1, fa: [110, 55], ba: [130, 20], w1: 182, famN: 6, fx: [['ring', 0]] },
        { k: 2, fa: [120, 0], ba: [100, 20], w1: 125, lean: 1, fam: [[14, -16], [20, -12], [24, -6], [24, 0], [20, 6], [14, 8]], fx: [['ring', 1]] },
        { k: 3, fa: [100, 0], ba: [90, 20], w1: 105, lean: 2, x: 1, fam: [[30, -12], [34, -8], [37, -4], [37, 0], [34, 4], [30, 6]], fx: [['trails']] },
        { k: 0, fa: [98, 0], ba: [85, 20], w1: 105, lean: 2, x: 1, fam: [[36, -6], [38, -3], [36, 0]], fx: [['burst', 56, 22, 4]] },
        { k: 1, fa: [30, 60], w1: 175, fx: [['burst', 56, 22, 2]] },
      ],
      hurt: hurtPoses({ k: 0, w1: 230, famEye: 'x', fam: [[-14, -14, false], [16, -15, true], [12, 2, true]] }, { k: 1, w1: 160, famEye: 'x', fam: [[-16, -16, false], [18, -17, true], [14, 3, true]] }),
      victory: [
        { k: 0, fa: [110, 55], w1: 175, ba: [-35, -25], fam: [[-8, -20], [1, -23], [10, -20]] }, { k: 1, air: 2, fa: [110, 55], w1: 176, ba: [-35, -25], fam: [[-6, -22], [4, -24], [12, -21]] },
        { k: 2, air: 3, fa: [110, 55], w1: 177, ba: [-35, -25], fam: [[-9, -21], [1, -25], [11, -22]], fx: [['spark', 2]] }, { k: 3, air: 1, fa: [110, 55], w1: 176, ba: [-35, -25], fam: [[-8, -20], [1, -23], [10, -20]] },
      ],
    },
    {
      key: 'artificer', name: 'Systemize Artificer', special: 'Deploy Turret', blurb: 'Passive: Systemize. Goggles, tool belt, a geared gauntlet and a pocket turret.',
      mats: L => ({ shirt: ramp('#4f7186', { step: 0.1 }), leather: ramp('#6e4c3c', { step: 0.1 }), pants: ramp('#3d4258', { step: 0.08 }), boots: ramp('#4a3326'), belt: ramp('#3a2a22'), metal: ramp('#8b98b0', { step: 0.12 }), brass: ramp('#c9a24e', { step: 0.12 }), glass: L.accent }),
      N: { fa: [35, 60], ba: [-10, 50], fl: [24, -14], bl: [-24, -6], lean: 1 },
      idle: [{ k: 0, gear: 0 }, { k: 1, gear: 0, fx: [['spark', 0]] }, { k: 2, br: 1, gear: 1 }, { k: 3, br: 1, gear: 1, fx: [['vent']] }],
      attack: [
        { k: 0, fa: [-50, 70], lean: -1, x: -1, gear: 1, fl: [28, -30], bl: [-20, -12] },
        { k: 1, fa: [-62, 80], lean: -2, x: -1, gear: 0, fl: [30, -34], bl: [-20, -14], fx: [['steam']] },
        { k: 2, fa: [92, 0], lean: 3, x: 4, gear: 1, fl: [45, -20], bl: [-35, -2], fx: [['speed']] },
        { k: 3, fa: [90, 0], lean: 3, x: 5, gear: 0, fl: [45, -20], bl: [-36, -2], fx: [['star']] },
        { k: 0, fa: [88, 0], lean: 2, x: 4, gear: 1, fl: [42, -20], bl: [-32, -4] },
        { k: 1, fa: [40, 60], lean: 1, x: 1, gear: 0 },
      ],
      specialPoses: [
        { k: 0, fl: [50, -80], bl: [-10, -60], fa: [60, 30], ba: [40, 40], wrench: false, turret: { stage: 0 } },
        { k: 1, fl: [55, -90], bl: [-5, -70], fa: [80, -10], ba: [20, 40], lean: 2, wrench: false, turret: { stage: 1, x: 38 } },
        { k: 2, fl: [24, -14], bl: [-24, -6], fa: [30, 60], turret: { stage: 2, x: 38 } },
        { k: 3, fl: [24, -14], bl: [-24, -6], fa: [20, 110], x: -1, turret: { stage: 3, x: 38 } },
        { k: 0, fl: [24, -14], bl: [-24, -6], fa: [20, 110], x: -1, turret: { stage: 4, x: 38, fire: 1 } },
        { k: 1, fl: [24, -14], bl: [-24, -6], fa: [25, 100], x: -1, turret: { stage: 4, x: 38, fire: 2 } },
      ],
      hurt: hurtPoses({ k: 0, gear: 1 }, { k: 1, gear: 0 }),
      victory: [
        { k: 0, fa: [110, 55], ba: [-35, -25], gear: 0 }, { k: 1, air: 2, fa: [110, 55], ba: [-35, -25], gear: 1 },
        { k: 2, air: 3, fa: [110, 55], ba: [-35, -25], gear: 0, fx: [['star']] }, { k: 3, air: 1, fa: [110, 55], ba: [-35, -25], gear: 1 },
      ],
    },
    {
      key: 'rogue', name: 'NikAtNight Rogue', special: 'Night Dash', blurb: 'Night handle made a class. Hood, moon clasp, twin daggers, afterimage dash.',
      mats: L => ({ cloak: ramp('#22203f', { step: 0.1 }), capeLining: ramp(mix(L.accent, '#5a2c5e', 0.55), { step: 0.1 }), tunic: ramp('#383b62', { step: 0.1 }), scarf: ramp(mix(L.accent, '#1c1d33', 0.45), { step: 0.1 }), wrap: ramp('#8c8ca6', { step: 0.1 }), pants: ramp('#4a4466', { step: 0.1 }), boots: ramp('#2a2232'), belt: ramp('#3a2a22'), grip: ramp('#3b3448', { step: 0.08 }) }),
      N: { fl: [40, -70], bl: [-20, -45], lean: 3, fa: [50, 30], w1: 15, ba: [30, 80], w2: 200, hd: [1, 0] },
      idle: [{ k: 0 }, { k: 1, glint: 1 }, { k: 2, br: 1, moonGlint: 1 }, { k: 3, br: 1 }],
      attack: [
        { k: 0, fl: [50, -90], bl: [-20, -60], lean: 4, fa: [-10, 140], ba: [5, 130], w1: 160, w2: 150 },
        { k: 1, x: 5, lean: 5, fl: [60, -60], bl: [-50, -10], fa: [20, 120], ba: [15, 120], w1: 150, w2: 140, capeLen: 3 },
        { k: 2, x: 8, lean: 5, fl: [60, -60], bl: [-50, -10], fa: [120, 0], ba: [60, 10], w1: 110, w2: 60, capeLen: 3, fx: [['xslash']] },
        { k: 3, x: 8, lean: 4, fl: [55, -60], bl: [-48, -10], fa: [130, 10], ba: [45, 10], w1: 120, w2: 50, capeLen: 2, fx: [['xslash', 'fade']] },
        { k: 0, x: 7, lean: 4, fl: [50, -65], bl: [-40, -20], fa: [100, 20], ba: [40, 30], w1: 100, w2: 80 },
        { k: 1, x: 3, lean: 3 },
      ],
      specialPoses: [
        { k: 0, fl: [55, -95], bl: [-15, -70], lean: 4, fa: [30, 60], ba: [20, 80], eyes: 'glow' },
        { k: 1, x: 6, fl: [70, -40], bl: [-60, -10], lean: 6, fa: [-40, 30], ba: [-50, 30], w1: 250, w2: 240, eyes: 'glow', capeLen: 4, after: [0, 3] },
        { k: 2, x: 14, fl: [70, -40], bl: [-60, -10], lean: 6, fa: [-40, 30], ba: [-50, 30], w1: 250, w2: 240, eyes: 'glow', capeLen: 4, after: [4, 8, 11] },
        { k: 3, x: 16, fl: [55, -60], bl: [-48, -10], lean: 4, fa: [130, 10], ba: [45, 10], w1: 120, w2: 50, eyes: 'glow', capeLen: 2, after: [10, 13], fx: [['xmark', 54, 24, 4]] },
        { k: 0, x: 15, fl: [50, -65], bl: [-40, -20], lean: 4, fa: [100, 20], ba: [40, 30], w1: 100, w2: 80, eyes: 'glow', after: [12], fx: [['xmark', 54, 24, 6]] },
        { k: 1, x: 2, after: [9] },
      ],
      hurt: hurtPoses({ k: 0, w1: 300, w2: 250 }, { k: 1, w1: 200, w2: 160, fl: [45, -70], bl: [-15, -55] }),
      victory: [
        { k: 0, fl: [16, -10], bl: [-14, -4], lean: 0, fa: [110, 55], ba: [-40, 40], w1: 165, w2: 200 },
        { k: 1, air: 2, fl: [16, -10], bl: [-14, -4], lean: 0, fa: [110, 55], ba: [-45, 40], w1: 170, w2: 205 },
        { k: 2, air: 3, fl: [16, -10], bl: [-14, -4], lean: 0, fa: [110, 55], ba: [-45, 40], w1: 175, w2: 205, fx: [['moon']] },
        { k: 3, air: 1, fl: [16, -10], bl: [-14, -4], lean: 0, fa: [110, 55], ba: [-45, 40], w1: 170, w2: 205 },
      ],
    },
    {
      key: 'mage', name: 'Terminal Mage', special: 'Terminal Spell', blurb: 'Robe with circuit trim and a floating tome that is really a terminal.',
      mats: L => ({ robe: ramp('#2c3070', { step: 0.1 }), robeDark: ramp('#1c1e4a', { step: 0.08 }), pants: ramp('#1d2036'), boots: ramp('#2a2232'), tome: ramp('#283044', { step: 0.1 }), page: ramp('#d6dcf0', { step: 0.08 }), screen: ramp('#0e1a24', { step: 0.05 }) }),
      N: { fa: [20, 60], ba: [-10, 30], fl: [10, -6], bl: [-10, -2], lean: 0, tome: { dx: 11, dy: 0, open: 0 } },
      idle: [{ k: 0 }, { k: 1, tome: { dx: 11, dy: -1, open: 0, flip: 1 } }, { k: 2, br: 1, tome: { dx: 11, dy: -1, open: 1 } }, { k: 3, br: 1, tome: { dx: 11, dy: 0, open: 0, flip: 2 } }],
      attack: [
        { k: 0, fa: [60, 60], tome: { dx: 10, dy: -2, open: 1 } },
        { k: 1, fa: [80, 30], lean: 1, tome: { dx: 10, dy: -2, open: 2 } },
        { k: 2, fa: [95, 0], x: 1, lean: 2, tome: { dx: 11, dy: -2, open: 2 }, fx: [['shot', 40]] },
        { k: 3, fa: [95, 0], x: 1, lean: 2, tome: { dx: 11, dy: -2, open: 2 }, fx: [['shot', 50]] },
        { k: 0, fa: [90, 10], x: 1, lean: 1, tome: { dx: 11, dy: -2, open: 2 }, fx: [['burst', 58, 24, 3]] },
        { k: 1, fa: [30, 60], tome: { dx: 11, dy: 0, open: 1 } },
      ],
      specialPoses: [
        { k: 0, fa: [110, 55], ba: [-20, 30], tome: { dx: 3, dy: -15, open: 1 } },
        { k: 1, fa: [110, 55], ba: [140, 20], tome: { dx: 4, dy: -16, open: 2 }, fx: [['rune', 1]] },
        { k: 2, fa: [110, 55], ba: [142, 18], tome: { dx: 4, dy: -16, open: 2 }, fx: [['rune', 2], ['prompt', 2]] },
        { k: 3, fa: [100, 0], ba: [80, 20], lean: 2, tome: { dx: 11, dy: -4, open: 2 }, fx: [['rune', 3], ['beam']] },
        { k: 0, fa: [98, 0], ba: [80, 20], lean: 2, tome: { dx: 11, dy: -4, open: 2 }, fx: [['beam', 'fade'], ['bits']] },
        { k: 1, fa: [30, 60], tome: { dx: 11, dy: 0, open: 1 } },
      ],
      hurt: hurtPoses({ k: 0, hatTilt: 5, tome: { dx: 14, dy: 5, open: 0 } }, { k: 1, hatTilt: 3, tome: { dx: 12, dy: -6, open: 0 } }),
      victory: [
        { k: 0, fa: [110, 55], ba: [-35, -25], tome: { dx: 9, dy: -14, open: 1 } }, { k: 1, air: 2, fa: [110, 55], ba: [-35, -25], tome: { dx: 10, dy: -15, open: 2 } },
        { k: 2, air: 3, fa: [110, 55], ba: [-35, -25], tome: { dx: 10, dy: -16, open: 2 }, fx: [['bits']] }, { k: 3, air: 1, fa: [110, 55], ba: [-35, -25], tome: { dx: 9, dy: -15, open: 1 } },
      ],
    },
  ];

  // poses are authored in the first rig's units; scale offsets to the 1.5x rig
  function scalePose(P) {
    const s = v => Math.round(v * K), Q = { ...P };
    ['x', 'air', 'lean', 'capeLen', 'flare'].forEach(k => { if (Q[k]) Q[k] = s(Q[k]); });
    if (Q.hd) Q.hd = Q.hd.map(s);
    if (Q.fam) Q.fam = Q.fam.map(([x, y, f, l]) => [s(x), s(y), f, l]);
    if (Q.tome) Q.tome = { ...Q.tome, dx: s(Q.tome.dx), dy: s(Q.tome.dy || 0) };
    if (Q.after) Q.after = Q.after.map(s);
    if (Q.turret && Q.turret.x != null) Q.turret = { ...Q.turret, x: s(Q.turret.x) };
    return Q;
  }
  // a cool 1px rim on right-facing outline pixels separates dark outfits from dark arenas
  function rimLight(cv, color) {
    const g = cv.getContext('2d'), w = cv.width, h = cv.height, im = g.getImageData(0, 0, w, h), d = im.data, [r, gg, b] = hexToRgb(color);
    const a = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0, out = [];
    const dark = i => d[i] + d[i + 1] + d[i + 2] < 120;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (a(x, y) && !a(x + 1, y) && a(x - 1, y) && dark(i)) out.push(i); }
    out.forEach(i => d.set([r, gg, b, 255], i));
    g.putImageData(im, 0, 0); return cv;
  }
  function battleFrame(cls, pose, M, L) {
    const P = scalePose({ ...cls.N, ...pose });
    const draw = Q => { const S = new Spr(BW, BH); BTL[cls.key](S, Q, joints(Q), L); return S.render(M); };
    let cv = draw(P);
    if (P.after) {
      const out = mk(BW, BH), g = out.getContext('2d');
      P.after.forEach((ax, i) => {
        const ghost = tint(draw({ ...P, x: ax, fx: null, after: null, eyes: 'glow' }), L.accent, 0.75);
        g.globalAlpha = 0.25 + 0.25 * (i / Math.max(1, P.after.length - 1)); g.drawImage(ghost, 0, 0);
      });
      g.globalAlpha = 1; g.drawImage(cv, 0, 0); cv = out;
    }
    return rimLight(cv, cls.rim || mix(L.accent, '#26324f', 0.7));
  }

  // ------------------------------------------------------------ portraits
  function portrait(cls, M, L, blink, expr) {
    const S = new Spr(32, 32), b = { x: 9, y: 8, w: 14, h: 15 }, o = { eyes: blink || expr === 'hurt' ? 'closed' : 'open', expr };
    const k = cls.key;
    // shoulders and outfit
    const body = { engineer: 'jacket', orchestrator: 'coat', artificer: 'shirt', rogue: 'tunic', mage: 'robe' }[k];
    if (k === 'rogue') S.part('cloak').trap(24, 31, 4, 27, 1, 30);
    S.part(body, { deep: 2 }).trap(25, 31, 7, 24, 2, 29);
    S.part('skin').rect(14, 21, 4, 5);
    if (k === 'engineer') { S.decal('shirt').trap(25, 31, 13, 18, 15, 16); S.decal('jacket', { flat: 3 }).line(12, 25, 15, 31).line(19, 25, 16, 31); S.decal('gold', { flat: 2 }).rect(23, 27, 3, 2); S.decal('gold', { flat: 4 }).set(23, 27); }
    if (k === 'orchestrator') { S.part('coat').rect(5, 18, 4, 10).rect(23, 18, 4, 10); S.decal('lining').rect(7, 20, 2, 8).rect(23, 20, 2, 8); S.decal('gold', { flat: 3 }).rect(5, 18, 4, 1).rect(23, 18, 4, 1).line(16, 27, 16, 31); S.decal('gold', { flat: 4 }).set(15, 29); }
    if (k === 'artificer') { S.decal('leather').trap(27, 31, 6, 12, 4, 12).trap(27, 31, 20, 26, 20, 28); S.part('brass').rect(27, 23, 4, 8); S.part('frame').line(29, 22, 29, 15); S.decal('glow').set(29, 14); }
    if (k === 'mage') { S.decal('accent', { flat: 2 }).line(16, 27, 16, 31).rect(10, 30, 13, 1); S.decal('glow').set(16, 29).set(12, 30).set(20, 30); S.part('robeDark').trap(25, 27, 11, 21, 10, 22); }
    if (k === 'rogue') { S.decal('gold', { flat: 3 }).set(16, 27).set(15, 28).set(15, 29).set(16, 30); }
    headAll(S, 'front', b, L, { ...o, hood: k === 'rogue', mask: k === 'rogue', noHair: k === 'rogue', hat: k === 'mage', goggles: k === 'artificer' });
    if (k === 'orchestrator') famBig(S, 4, 9, 0, 1);
    return S.render(M);
  }

  // ------------------------------------------------------------- register
  function buildCharacters(look) {
    const L = resolveLook(look);
    CLASSES.forEach(cls => {
      const M = { ...baseMats(L), ...cls.mats(L) }, group = `Characters · ${cls.name}`, owNote = '16x24 body on a 22x32 canvas, feet on row 28';
      ['down', 'up', 'left', 'right'].forEach(dir => SS.add(group, `Overworld walk ${dir}`, [0, 1, 2, 3].map(p => owFrame(cls, dir, p, false, M, L)), { fps: 8, note: owNote }));
      ['down', 'up', 'left', 'right'].forEach(dir => SS.add(group, `Overworld idle ${dir}`, [0, 1].map(p => owFrame(cls, dir, p, true, M, L)), { fps: 2, note: owNote }));
      const seq = (name, poses, fps, note) => SS.add(group, name, poses.map(p => battleFrame(cls, p, M, L)), { fps, note });
      seq('Battle idle', cls.idle, 5, 'side view, 96x72 canvas, soles on row 65');
      seq('Battle attack', cls.attack, 10, 'smear on frame 3');
      seq(`Battle special · ${cls.special}`, cls.specialPoses, 8, cls.blurb);
      seq('Battle hurt', cls.hurt, 6, '');
      seq('Battle victory', cls.victory, 6, '');
      SS.add(group, 'Portrait', [portrait(cls, M, L, false), portrait(cls, M, L, false), portrait(cls, M, L, false), portrait(cls, M, L, true)], { fps: 4, note: '32x32 dialog bust, blinks' });
      SS.add(group, 'Portrait determined', [portrait(cls, M, L, false, 'determined')], { fps: 1, note: 'attack and special lines' });
      SS.add(group, 'Portrait hurt', [portrait(cls, M, L, false, 'hurt')], { fps: 1, note: 'taking damage' });
    });
    return SS;
  }
  window.buildCharacters = buildCharacters;
  window.CHARACTER_CLASSES = CLASSES.map(c => ({ key: c.key, name: c.name, special: c.special, blurb: c.blurb }));
  buildCharacters(LOOK_DEFAULT);
})();
