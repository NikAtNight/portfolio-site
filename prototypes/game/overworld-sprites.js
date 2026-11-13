// PROTOTYPE. Overworld art: tiles, buildings, props, critters, player and UI.
// Loaded by overworld.html (which adds the runtime) and by sprites.html (the sheet viewer).
// Classic script on purpose: its top-level names are shared with the overworld runtime.
window.SpriteSheet = window.SpriteSheet || { groups: [], add(group, name, frames, opts = {}) {
  let g = this.groups.find(x => x.name === group); if (!g) this.groups.push(g = { name: group, items: [] });
  const i = g.items.findIndex(x => x.name === name), item = { name, frames, fps: opts.fps || 6, note: opts.note || '' };
  i >= 0 ? (g.items[i] = item) : g.items.push(item);
} };

// sprites.html sets SPRITE_GALLERY before loading this file; the overworld never pays for the captures.
const GALLERY = window.SPRITE_GALLERY === true;
const SHEET = {}; // tile samples cropped from the ground layer while it is baked (gallery only)
const crop = (src, x, y, w, h) => { const c = mk(w, h); c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h); return c; };

// ---------- Zones: id, label and building kind. Panel text is added by overworld.html. ----------
const ZONES = [
  { id: 'status', name: 'Status', sub: 'PLAYER INFO', kind: 'shrine' },
  { id: 'about', name: 'About', sub: '01 · THE PLAYER', kind: 'house' },
  { id: 'career', name: 'Career Log', sub: '02', kind: 'hall' },
  { id: 'side-quests', name: 'Side Quests', sub: '03 · PROJECTS', kind: 'board' },
  { id: 'premise', name: 'The Premise', sub: '04', kind: 'library' },
  { id: 'argus', name: 'Argus', sub: '05 · PRIVATE REPO', kind: 'watchtower' },
  { id: 'raid-log', name: 'Raid Log', sub: '06 · WAR STORIES', kind: 'dungeon' },
  { id: 'guild', name: 'Guild', sub: '07 · TALIX', kind: 'tavern' },
];

// ---------- Placement (tiles). Widths are odd so every door sits on the centre line. ----------
const PLACE = {
  status: [20, 4, 5, 3], about: [6, 6, 5, 4], career: [30, 5, 7, 5], 'side-quests': [11, 16, 3, 2],
  premise: [29, 16, 7, 4], argus: [39, 14, 3, 3], 'raid-log': [4, 23, 7, 4], guild: [18, 23, 7, 4],
};
ZONES.forEach(z => { [z.x, z.y, z.w, z.h] = PLACE[z.id]; });

// ---------- Helpers ----------
const T = 16, W = 44, H = 32;
const GRASS = 0, PATH = 1, WATER = 2, TREE = 3, BLD = 4, FLOWER = 5, ROCK = 6, FENCE = 7, LAMP = 8, FOUNT = 9;
const map = new Uint8Array(W * H), reserved = new Uint8Array(W * H);
const idx = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const at = (x, y) => inside(x, y) ? map[idx(x, y)] : TREE;
function mulberry(seed) {
  return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rand = mulberry(29);
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); return c; };
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
function circ(g, cx, cy, r, c) { g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1); } }
function ell(g, cx, cy, rx, ry, c) { g.fillStyle = c; for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))); g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1); } }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const KEY = '#ff00ff';

// Recolour every KEY pixel with ordered-dither lighting from the top left.
function shadeMask(c, tones, cx, cy, rx, ry, o = {}) {
  const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), d = im.data, cw = c.width;
  const tn = tones.map(rgb), lx = o.lx ?? -0.55, ly = o.ly ?? -0.8, noise = o.noise ?? 0.15, rim = o.rim && rgb(o.rim);
  const key = new Uint8Array(cw * c.height);
  for (let p = 0; p < key.length; p++) key[p] = d[p * 4] === 255 && d[p * 4 + 1] === 0 && d[p * 4 + 2] === 255 && d[p * 4 + 3] === 255 ? 1 : 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < cw; x++) {
    const p = y * cw + x; if (!key[p]) continue;
    const nx = (x - cx) / rx, ny = (y - cy) / ry;
    const l = nx * lx + ny * ly + ((hash(x + (o.seed || 0), y) % 100) / 100 - 0.5) * noise * 2;
    let ti = Math.floor((l + 1) / 2 * tn.length + BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5);
    ti = Math.max(0, Math.min(tn.length - 1, ti));
    let col = tn[ti];
    if (rim && l > 0.15 && ((y > 0 && !key[p - cw] && d[(p - cw) * 4 + 3] === 0) || (x > 0 && !key[p - 1] && d[(p - 1) * 4 + 3] === 0))) col = rim;
    d[p * 4] = col[0]; d[p * 4 + 1] = col[1]; d[p * 4 + 2] = col[2];
  }
  g.putImageData(im, 0, 0);
}
function outline(c, col) {
  const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), d = im.data, w = c.width, h = c.height;
  const a = new Uint8Array(w * h); for (let p = 0; p < a.length; p++) a[p] = d[p * 4 + 3] > 0 ? 1 : 0;
  const [r, gg, bb] = rgb(col);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x; if (a[p]) continue;
    if ((x > 0 && a[p - 1]) || (x < w - 1 && a[p + 1]) || (y > 0 && a[p - w]) || (y < h - 1 && a[p + w])) { d[p * 4] = r; d[p * 4 + 1] = gg; d[p * 4 + 2] = bb; d[p * 4 + 3] = 255; }
  }
  g.putImageData(im, 0, 0);
}

// ---------- Palette (rooted in the site tokens) ----------
const G = ['#0d1b1f', '#122427', '#172e30', '#1e3b3a', '#2a5048'];
const PV = ['#151827', '#1e2236', '#282d44', '#343a55', '#454d6c'];
const WA = ['#0a1830', '#10284e', '#173a6a', '#245692', '#4da3ff', '#bfe0ff'];
const C = {
  stone: ['#191f30', '#242c44', '#323c5a', '#44507a', '#5a6894'],
  rock: ['#121624', '#1b2133', '#283049', '#384363'],
  wood: ['#20161a', '#34241f', '#4c3427', '#6b4a34'],
  roofN: ['#0e2141', '#18335f', '#254a84', '#3d6fb8'],
  roofP: ['#28152d', '#3f2040', '#592e54', '#7a446d'],
  roofT: ['#10303a', '#174654', '#21606e', '#33828c'],
  plaster: ['#2a3047', '#38405c', '#4a5476'],
  win: ['#b0702a', '#ffc964', '#ffe8ad'], winOff: ['#0a1324', '#152240', '#26395f'],
  gold: ['#8a6d2e', '#d9b45b', '#f2d68c'], sys: ['#1e3a66', '#4da3ff', '#a8d6ff'],
  out: '#04060c',
};

// ---------- 5x7 bitmap font ----------
const GLYPHS = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.', C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.', E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#', I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..', K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#', O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....', Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..', U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..', W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.', 2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
  3: '####.|....#|....#|.###.|....#|....#|####.', 4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '.###.|#....|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...', 8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  9: '.###.|#...#|#...#|.####|....#|....#|.###.', '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..', '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  '.': '.....|.....|.....|.....|.....|.....|..#..', ':': '.....|..#..|.....|.....|.....|..#..|.....', '-': '.....|.....|.....|.###.|.....|.....|.....',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....', '*': '.....|..#..|.###.|#####|.###.|..#..|.....', '+': '.....|..#..|.#.#.|#...#|.#.#.|..#..|.....',
  ' ': '.....|.....|.....|.....|.....|.....|.....',
};
const FONT = {};
for (const k in GLYPHS) FONT[k] = GLYPHS[k].split('|').map(r => [...r].map(ch => ch === '#'));
const textW = s => s.length * 6 - 1;
function pixText(g, s, x, y, col, shadow) {
  s = s.toUpperCase();
  for (const pass of shadow ? [1, 0] : [0]) {
    g.fillStyle = pass ? shadow : col;
    [...s].forEach((ch, i) => {
      const gl = FONT[ch] || FONT['?'];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c]) g.fillRect(Math.round(x) + i * 6 + c + pass, Math.round(y) + r + pass, 1, 1);
    });
  }
}

// ---------- World layout ----------
const LAKE = { x: 33, y: 27.2, rx: 6.6, ry: 2.5 };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x - LAKE.x) / LAKE.rx) ** 2 + ((y - LAKE.y) / LAKE.ry) ** 2 < 1) map[idx(x, y)] = WATER;
for (let y = 12; y <= 17; y++) for (let x = 18; x <= 26; x++) map[idx(x, y)] = PATH;
const FOUNTAIN = { x: 21, y: 14, w: 3, h: 2 };
for (let y = FOUNTAIN.y; y < FOUNTAIN.y + FOUNTAIN.h; y++) for (let x = FOUNTAIN.x; x < FOUNTAIN.x + FOUNTAIN.w; x++) map[idx(x, y)] = FOUNT;

function bfs(sx, sy, tx, ty, ok) {
  const prev = new Int32Array(W * H).fill(-1), q = [idx(sx, sy)];
  prev[q[0]] = q[0];
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi], cx = c % W, cy = (c / W) | 0;
    if (cx === tx && cy === ty) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inside(nx, ny) || !ok(nx, ny)) continue;
      const n = idx(nx, ny);
      if (prev[n] !== -1) continue;
      prev[n] = c; q.push(n);
    }
  }
  const end = idx(tx, ty);
  if (prev[end] === -1) return null;
  const out = [];
  for (let c = end; c !== prev[c]; c = prev[c]) out.push([c % W, (c / W) | 0]);
  return out.reverse();
}

const ART = {}; // filled below; ZONES get their art height from it
function layoutZones() {
  ZONES.forEach(z => {
    z.up = ART[z.kind].up;
    for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) map[idx(x, y)] = BLD;
    z.door = { x: z.x + (z.w >> 1), y: z.y + z.h };
    for (let y = z.y - z.up; y <= z.y + z.h; y++) for (let x = z.x - 1; x <= z.x + z.w; x++) if (inside(x, y)) reserved[idx(x, y)] = 1;
  });
  const roadOk = (x, y) => x > 2 && y > 2 && x < W - 3 && y < H - 3 && ![BLD, WATER, FOUNT].includes(map[idx(x, y)]);
  // Dijkstra where existing road is cheap, so later roads join earlier ones instead of running beside them
  const route = (sx, sy, tx, ty) => {
    const dist = new Float64Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1), done = new Uint8Array(W * H);
    dist[idx(sx, sy)] = 0;
    for (;;) {
      let c = -1, best = Infinity;
      for (let i = 0; i < W * H; i++) if (!done[i] && dist[i] < best) { best = dist[i]; c = i; }
      if (c < 0) return [];
      done[c] = 1;
      const cx = c % W, cy = (c / W) | 0;
      if (cx === tx && cy === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (!inside(nx, ny) || !roadOk(nx, ny)) continue;
        const n = idx(nx, ny), nd = best + (map[n] === PATH ? 1 : 5) + (reserved[n] ? 3 : 0);
        if (nd < dist[n]) { dist[n] = nd; prev[n] = c; }
      }
    }
    const out = []; for (let c = idx(tx, ty); c !== idx(sx, sy); c = prev[c]) out.push([c % W, (c / W) | 0]);
    return out.reverse();
  };
  ZONES.forEach(z => {
    const p = route(21, 13, z.door.x, z.door.y);
    p.forEach(([x, y], i) => {
      map[idx(x, y)] = PATH;
      // widen to two tiles so the roads read as roads, not corridors
      const [px, py] = p[Math.max(0, i - 1)], horiz = py === y;
      const wx = horiz ? x : x + 1, wy = horiz ? y + 1 : y;
      if (inside(wx, wy) && map[idx(wx, wy)] === GRASS) map[idx(wx, wy)] = PATH;
    });
    map[idx(z.door.x, z.door.y)] = PATH;
  });
  // picket fence around the About yard
  const ab = ZONES.find(z => z.id === 'about');
  for (let x = ab.x - 2; x <= ab.x + ab.w + 1; x++) for (const y of [ab.y + ab.h + 1]) if (map[idx(x, y)] === GRASS && Math.abs(x - ab.door.x) > 1) map[idx(x, y)] = FENCE;
  for (let y = ab.y + 1; y <= ab.y + ab.h + 1; y++) for (const x of [ab.x - 2, ab.x + ab.w + 1]) if (map[idx(x, y)] === GRASS) map[idx(x, y)] = FENCE;

  const near = (x, y, r, types) => {
    for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) if (inside(xx, yy) && types.includes(map[idx(xx, yy)])) return true;
    return false;
  };
  // lamps along the roads, spaced out
  const lamps = [];
  const tryLamp = (x, y) => {
    if (!inside(x, y) || map[idx(x, y)] !== GRASS || reserved[idx(x, y)]) return;
    if (lamps.some(l => Math.abs(l.x - x) + Math.abs(l.y - y) < 6)) return;
    map[idx(x, y)] = LAMP; lamps.push({ x, y });
  };
  [[16, 12], [27, 12], [16, 17], [27, 17]].forEach(([x, y]) => tryLamp(x, y));
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    if (map[idx(x, y)] !== PATH || hash(x, y) % 5) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) tryLamp(x + dx, y + dy);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (map[i] !== GRASS) continue;
    const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    const doorClose = ZONES.some(z => Math.abs(z.door.x - x) <= 1 && Math.abs(z.door.y - y) <= 2);
    if (edge < 2 || (edge === 2 && rand() < 0.6)) { map[i] = TREE; continue; }
    if (reserved[i] || doorClose) continue;
    if (!near(x, y, 1, [PATH, BLD, LAMP, FENCE, WATER]) && rand() < 0.13) map[i] = TREE;
    else if (!near(x, y, 1, [PATH, BLD, LAMP]) && rand() < 0.025) map[i] = ROCK;
    else if (rand() < 0.07) map[i] = FLOWER;
  }
  return lamps;
}
const SOLID = new Set([TREE, WATER, BLD, ROCK, FENCE, LAMP, FOUNT]);
const walkable = (x, y) => inside(x, y) && !SOLID.has(map[idx(x, y)]);

// ---------- Sprite factories ----------
const TREE_TONES = ['#0b2024', '#12322f', '#1b4840', '#2a6352'];
function makeTree(seed, pine) {
  const c = mk(32, 42), g = c.getContext('2d'), r = mulberry(seed);
  R(g, 14, 27, 4, 12, C.wood[2]); R(g, 14, 27, 1, 12, C.wood[3]); R(g, 17, 27, 1, 12, C.wood[0]);
  R(g, 12, 37, 2, 2, C.wood[1]); R(g, 18, 37, 2, 2, C.wood[1]); R(g, 13, 36, 1, 2, C.wood[2]);
  if (pine) {
    g.fillStyle = KEY;
    for (let tier = 0; tier < 4; tier++) { const ty = 3 + tier * 6, hw = 5 + tier * 3; for (let dy = 0; dy < 10; dy++) { const w = Math.round(hw * dy / 9) + 1 + (dy === 9 && hash(tier, seed) % 2 ? 1 : 0); g.fillRect(16 - w, ty + dy, w * 2, 1); } }
    shadeMask(c, ['#0a1f22', '#0f2e2e', '#174339', '#235b4b'], 16, 18, 13, 16, { noise: 0.35, rim: '#3a8068', seed });
  } else {
    circ(g, 16, 16, 10, KEY);
    for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2, d = 7 + r() * 3; circ(g, 16 + Math.cos(a) * d, 15 + Math.sin(a) * d * 0.75, 3 + (r() * 3 | 0), KEY); }
    shadeMask(c, TREE_TONES, 16, 14, 13, 12, { noise: 0.32, rim: '#3d8a6e', seed });
    // leaf clumps: short dark crescents give the canopy volume
    for (let i = 0; i < 6; i++) { const x = 8 + (r() * 16 | 0), y = 9 + (r() * 12 | 0); const im = g.getImageData(x, y, 1, 1).data; if (im[3]) R(g, x, y + 1, 3, 1, TREE_TONES[0]); }
  }
  outline(c, '#03090b');
  return c;
}
function makeRock(seed) {
  const c = mk(16, 14), g = c.getContext('2d'), r = mulberry(seed);
  ell(g, 8, 8, 6, 4, KEY); circ(g, 6 + (r() * 3 | 0), 6, 3, KEY);
  shadeMask(c, C.rock, 8, 7, 6, 5, { noise: 0.3, rim: C.stone[4], seed });
  R(g, 4, 5, 2, 1, G[3]); R(g, 9, 4, 1, 1, G[4]);
  outline(c, C.out);
  return c;
}
function makeBush(seed) {
  const c = mk(16, 12), g = c.getContext('2d'), r = mulberry(seed);
  ell(g, 8, 7, 6, 4, KEY); circ(g, 5, 5, 3, KEY); circ(g, 10, 4, 3, KEY);
  shadeMask(c, TREE_TONES, 8, 6, 6, 5, { noise: 0.3, rim: '#3d8a6e', seed });
  if (r() < 0.6) [[5, 6], [9, 5], [11, 8]].forEach(([x, y]) => R(g, x, y, 1, 1, r() < 0.5 ? '#9fd0ff' : '#c86b7a'));
  outline(c, '#03090b');
  return c;
}
function makeLamp() {
  const c = mk(14, 36), g = c.getContext('2d');
  R(g, 4, 31, 6, 4, C.stone[2]); R(g, 4, 31, 6, 1, C.stone[3]);
  R(g, 6, 10, 2, 22, '#1c2233'); R(g, 6, 10, 1, 22, '#3a4562');
  R(g, 3, 9, 8, 2, '#262d42');
  R(g, 3, 3, 8, 7, '#2a3047'); R(g, 4, 4, 6, 5, C.win[1]); R(g, 4, 4, 6, 1, C.win[2]); R(g, 6, 4, 2, 5, C.win[2]);
  R(g, 2, 2, 10, 1, '#262d42'); R(g, 4, 1, 6, 1, '#262d42'); R(g, 6, 0, 2, 1, C.gold[1]);
  outline(c, C.out);
  return c;
}

// ---------- Hero: 16x24, 4 directions x 4 walk frames + 2 idle frames ----------
const PC = {
  hair: ['#1a1428', '#2b2244', '#43386a'], skin: ['#b4846a', '#deb393', '#f3d1b4'], coat: ['#122544', '#1e3a66', '#2f5c96'],
  scarf: ['#2468b8', '#4da3ff', '#a8d6ff'], pants: ['#141a2a', '#1f2840'], boot: ['#17111a', '#2e2230'], eye: '#0a0e1a', blush: '#e0907e',
};
const HERO_PAL = {
  h: PC.hair[0], H: PC.hair[1], i: PC.hair[2], s: PC.skin[0], S: PC.skin[1], e: PC.eye, b: '#4da3ff', r: PC.blush,
  c: PC.coat[0], C: PC.coat[1], k: PC.coat[2], f: PC.scarf[0], F: PC.scarf[1], g: PC.scarf[2], y: '#d9b45b', Y: '#6b5320',
  p: PC.pants[0], P: PC.pants[1], o: PC.boot[1],
};
const HERO_UP = {
  down: ['................', '.....hHHHHh.....', '....hHiiHHHh....', '...hHiHHHHHHh...', '...hHHHHHHHHh...', '...hHSHHSHHHh...',
    '...hSSSSSSSSh...', '...hSeSSSSeSh...', '...hSbSSSSbSh...', '...hrSSSSSSrh...', '....sSSSSSSs....', '....gggggggg....',
    '...kFFFFFFFFc...', '..kkCCCyCCfFcc..', '..kCCCCyCCCFcc..', '..SYYYYyyYYYYs..', '...kCCCCCCCCc...', '...YYYYYYYYYY...'],
  up: ['................', '.....hHHHHh.....', '....hHiiHHHh....', '...hHiHHHHHHh...', '...hHHiHHHHHh...', '...hHHHHHHHHh...',
    '...hHHHHHHHHh...', '...hhHHHHHHhh...', '...hhHHHHHHhh...', '...shhHHHHhhs...', '....hhhhhhhh....', '....gggggggg....',
    '...kFFFFFFFFc...', '..kkCCCFFCCCcc..', '..kCCCCfFCCCcc..', '..SYYYYYYYYYYs..', '...kCCCcCCCCc...', '...YYYYYYYYYY...'],
  right: ['................', '.....hHHHHh.....', '....hHiiHHHh....', '...hHiHHHHHHh...', '...hHHHHHHSHh...', '...hHHHHHSSSh...',
    '...hHHHHSSSSS...', '...hHHHsSSSeS...', '...hHHHSSSSbS...', '....hHHSSSSrS...', '.....hhsSSSs....', '.....gggggg.....',
    '....fFFFFFFk....', '...f.kCCCCCc....', '...f.kCCCCCc....', '.....YYYYyYY....', '.....kCCCCCc....', '....YYYYYYYY....'],
};
const HERO_LEGS = {
  front: [
    ['.....pp..pp.....', '.....pp..oo.....', '.....oo..oo.....', '.....oo..ooo....', '....ooo.........'],
    ['.....pp..pp.....', '.....pp..pp.....', '.....oo..oo.....', '.....oo..oo.....', '....ooo..ooo....'],
    ['.....pp..pp.....', '.....oo..pp.....', '.....oo..oo.....', '....ooo..oo.....', '.........ooo....'],
  ],
  side: [
    ['.......pPP......', '......pp.PP.....', '.....oo...oo....', '.....oo...oo....', '....oo....ooo...'],
    ['.......pP.......', '.......pP.......', '.......oo.......', '.......oo.......', '.......ooo......'],
    ['.......PPp......', '......PP.pp.....', '.....oo...oo....', '.....oo...oo....', '....oo....ooo...'],
  ],
};
function bakeHero(dir, phase, bob) {
  const c = mk(18, 26), g = c.getContext('2d');
  const put = (x, y, ch) => { if (ch !== '.' && x >= 0 && x < 16 && y >= 0 && y < 24) R(g, 1 + x, 1 + y, 1, 1, HERO_PAL[ch]); };
  const side = dir === 'left' || dir === 'right';
  const legs = (side ? HERO_LEGS.side : HERO_LEGS.front)[phase === 0 ? 0 : phase === 2 ? 2 : 1];
  const lift = phase === 1 || phase === 3 ? -1 : 0, oy = lift + bob;
  const rows = HERO_UP[side ? 'right' : dir];
  rows.forEach((r, y) => [...r].forEach((ch, x) => put(x, y + oy, ch)));
  if (side) {
    // front arm swings with the stride; the scarf tail flutters
    const arm = phase === 0 ? [[8, 12], [9, 13], [9, 14], [10, 15, 'S']] : phase === 2 ? [[8, 12], [7, 13], [6, 14], [6, 15, 'S']] : [[8, 12], [8, 13], [8, 14], [8, 15, 'S']];
    arm.forEach(([x, y, ch]) => put(x, y + oy, ch || 'k'));
    if (phase % 2) { put(3, 14 + oy, '.'); put(2, 14 + oy, 'f'); }
  } else if (phase === 0 || phase === 2) {
    const l = phase === 0 ? 1 : -1;
    put(2, 15 + oy, 'k'); put(2, 15 + oy + l, 'S'); put(13, 15 + oy, 'c'); put(13, 15 + oy - l, 's');
  }
  legs.forEach((r, y) => [...r].forEach((ch, x) => put(x, 18 + y, ch)));
  outline(c, C.out);
  if (dir === 'left') { const f = mk(18, 26), fg = f.getContext('2d'); fg.translate(18, 0); fg.scale(-1, 1); fg.drawImage(c, 0, 0); return f; }
  return c;
}
for (const k in HERO_UP) HERO_UP[k].forEach((r, i) => { if (r.length !== 16) console.warn('hero row', k, i, r.length); });
for (const k in HERO_LEGS) HERO_LEGS[k].forEach(f => f.forEach((r, i) => { if (r.length !== 16) console.warn('leg row', k, i, r.length); }));
const HERO = {};
['down', 'up', 'left', 'right'].forEach(d => { HERO[d] = { walk: [0, 1, 2, 3].map(p => bakeHero(d, p, 0)), idle: [bakeHero(d, 1, 1), bakeHero(d, 1, 0)] }; });

// ---------- Building art. Each draws onto its own canvas; the footprint's top-left is (fx, fy). ----------
function bricks(g, x, y, w, h, tones, bw = 6, bh = 4) {
  R(g, x, y, w, h, tones[1]);
  for (let yy = 0; yy < h; yy += bh) {
    const off = ((yy / bh) % 2) * (bw >> 1);
    R(g, x, y + yy, w, 1, tones[0]);
    for (let xx = -off; xx < w; xx += bw) {
      if (xx >= 0) R(g, x + xx, y + yy, 1, Math.min(bh, h - yy), tones[0]);
      const sx = Math.max(0, xx + 1);
      if (sx < w) R(g, x + sx, y + yy + 1, 1, 1, tones[2]);
      if (hash(x + xx, y + yy) % 7 === 0 && xx + 3 < w && xx + 2 > 0) R(g, x + xx + 2, y + yy + 2, 2, 1, tones[0]);
    }
  }
}
function roof(g, x, y, w, h, inset, tones) {
  for (let yy = 0; yy < h; yy++) {
    const i = Math.round(inset * (1 - yy / Math.max(1, h - 1)));
    const x0 = x + i, ww = w - i * 2, row = yy % 4;
    R(g, x0, y + yy, ww, 1, row === 0 ? tones[0] : tones[1]);
    for (let xx = ((yy >> 2) % 2) * 2; xx < ww; xx += 4) {
      if (row === 3) R(g, x0 + xx, y + yy, 1, 1, tones[0]);
      if (row === 1) R(g, x0 + xx + 1, y + yy, 2, 1, tones[2]);
    }
    R(g, x0, y + yy, 1, 1, tones[2]); R(g, x0 + ww - 1, y + yy, 1, 1, tones[0]);
  }
  R(g, x + inset, y, w - inset * 2, 2, tones[3]);
  R(g, x, y + h - 2, w, 2, tones[0]);
}
function windowPane(g, x, y, w, h, lit, o = {}) {
  const fr = o.frame || C.wood;
  R(g, x - 1, y - 1, w + 2, h + 2, fr[1]);
  if (lit) { R(g, x, y, w, h, C.win[1]); R(g, x, y, w, 2, C.win[2]); R(g, x, y + h - 1, w, 1, C.win[0]); }
  else { R(g, x, y, w, h, C.winOff[1]); R(g, x, y + h - 2, w, 2, C.winOff[0]); for (let i = 0; i < Math.min(w, h) - 2; i++) R(g, x + 1 + i, y + h - 3 - i, 1, 1, C.winOff[2]); }
  if (o.mullion !== false) { R(g, x + (w >> 1), y, 1, h, fr[2]); R(g, x, y + (h >>> 1), w, 1, fr[2]); }
  if (o.arch) { R(g, x, y, 2, 1, fr[1]); R(g, x, y, 1, 2, fr[1]); R(g, x + w - 2, y, 2, 1, fr[1]); R(g, x + w - 1, y, 1, 2, fr[1]); }
  if (o.sill !== false) { R(g, x - 2, y + h + 1, w + 4, 2, C.stone[3]); R(g, x - 2, y + h + 3, w + 4, 1, 'rgba(0,0,0,.35)'); }
}
function door(g, cx, bottom, w, h, o = {}) {
  const x = cx - (w >> 1), y = bottom - h;
  R(g, x - 2, y - 2, w + 4, h + 2, o.frame || C.stone[3]);
  R(g, x, y, w, h, C.wood[2]);
  for (let xx = 2; xx < w; xx += 3) R(g, x + xx, y, 1, h, C.wood[1]);
  R(g, x, y, w, 1, C.wood[3]);
  R(g, x - 2, y - 2, 2, 2, 'rgba(0,0,0,0)');
  if (o.arch) { g.clearRect(x - 2, y - 2, 2, 1); g.clearRect(x + w, y - 2, 2, 1); R(g, x, y, 1, 1, o.frame || C.stone[3]); R(g, x + w - 1, y, 1, 1, o.frame || C.stone[3]); }
  if (o.double) R(g, cx, y, 1, h, C.wood[0]);
  R(g, o.double ? cx - 2 : x + w - 3, y + (h >>> 1), 1, 2, C.gold[1]);
  if (o.double) R(g, cx + 2, y + (h >>> 1), 1, 2, C.gold[1]);
  R(g, x - 3, bottom - 1, w + 6, 1, C.stone[4]);
}
function lightAt(L, x, y, r, col, kind = 'win', a = 0.9) { L.push({ x, y, r, col, kind, a }); }

ART.house = {
  up: 3, smoke: [[74, 22]],
  draw(g, fx, fy, fw, fh, lit, L) {
    const ch = fy + fh, wallTop = fy + 18;
    // chimney behind the roof ridge
    bricks(g, fx + fw - 22, fy - 26, 8, 22, C.stone, 4, 3); R(g, fx + fw - 23, fy - 27, 10, 2, C.stone[3]);
    R(g, fx + 2, wallTop, fw - 4, ch - 6 - wallTop, C.plaster[1]);
    for (let yy = wallTop; yy < ch - 6; yy += 2) if (hash(yy, 3) % 3 === 0) R(g, fx + 3 + hash(yy, 7) % (fw - 8), yy, 2, 1, C.plaster[0]);
    R(g, fx + 2, wallTop, 2, ch - 6 - wallTop, C.wood[1]); R(g, fx + fw - 4, wallTop, 2, ch - 6 - wallTop, C.wood[1]);
    R(g, fx + 4, wallTop, 1, ch - 6 - wallTop, C.plaster[2]);
    R(g, fx + 2, wallTop + 16, fw - 4, 2, C.wood[1]);
    for (const bx of [fx + 28, fx + fw - 30]) R(g, bx, wallTop, 2, ch - 6 - wallTop, C.wood[1]);
    bricks(g, fx + 1, ch - 7, fw - 2, 7, C.stone, 5, 3); R(g, fx + 1, ch - 7, fw - 2, 1, C.stone[3]);
    roof(g, fx - 5, fy - 16, fw + 10, wallTop - (fy - 16) + 4, 12, C.roofN);
    R(g, fx + 2, wallTop + 4, fw - 4, 2, 'rgba(0,0,0,.4)');
    // dormer
    const dx = fx + (fw >> 1);
    R(g, dx - 7, fy - 6, 14, 12, C.plaster[1]); roof(g, dx - 9, fy - 12, 18, 7, 6, C.roofN);
    windowPane(g, dx - 3, fy - 3, 6, 6, lit, { sill: false });
    if (lit) lightAt(L, dx, fy, 16, '#ffc964');
    for (const wx of [fx + 9, fx + fw - 23]) {
      windowPane(g, wx, wallTop + 22, 14, 11, lit);
      R(g, wx - 1, wallTop + 36, 16, 3, C.wood[2]); R(g, wx - 1, wallTop + 36, 16, 1, C.wood[3]);
      for (let i = 0; i < 6; i++) R(g, wx + i * 3, wallTop + 34 + (i % 2), 2, 2, ['#c86b7a', '#d9b45b', '#9fd0ff'][i % 3]);
      if (lit) lightAt(L, wx + 7, wallTop + 28, 26, '#ffc964');
    }
    door(g, fx + 2 * T + 8, ch, 12, 20, { arch: true });
    R(g, fx + 2 * T + 18, ch - 22, 1, 4, '#2a2f40'); R(g, fx + 2 * T + 17, ch - 18, 3, 4, '#ffc964'); R(g, fx + 2 * T + 17, ch - 19, 3, 1, '#2a2f40');
    lightAt(L, fx + 2 * T + 18, ch - 16, 30, '#ffb85c', 'always', 0.8);
  },
};

ART.hall = {
  up: 3,
  draw(g, fx, fy, fw, fh, lit, L) {
    const ch = fy + fh, cx = fx + 3 * T + 8;
    roof(g, fx - 2, fy - 8, fw + 4, 24, 8, C.roofN);
    bricks(g, fx + 4, fy + 16, fw - 8, ch - 10 - (fy + 16), C.stone, 8, 5);
    R(g, fx + 2, ch - 13, fw - 4, 3, C.stone[3]); R(g, fx + 2, ch - 13, fw - 4, 1, C.stone[4]);
    const cols = [fx + 9, fx + 29, fx + fw - 35, fx + fw - 15];
    for (const wx of [fx + 17, fx + fw - 26]) { windowPane(g, wx, fy + 26, 9, 24, lit, { arch: true, frame: C.stone, sill: false }); if (lit) lightAt(L, wx + 4, fy + 38, 26, '#ffc964'); }
    cols.forEach(x => {
      R(g, x, fy + 18, 6, ch - 13 - (fy + 18), C.stone[3]); R(g, x, fy + 18, 1, ch - 31 - fy, C.stone[4]); R(g, x + 5, fy + 18, 1, ch - 31 - fy, C.stone[1]);
      R(g, x + 2, fy + 18, 1, ch - 31 - fy, C.stone[2]);
      R(g, x - 1, fy + 17, 8, 2, C.stone[4]); R(g, x - 1, ch - 15, 8, 2, C.stone[4]);
    });
    // banners on the outer columns
    for (const x of [cols[0] - 1, cols[3] - 1]) {
      R(g, x, fy + 22, 8, 18, C.sys[0]); R(g, x + 1, fy + 22, 6, 17, '#2a5a9e'); R(g, x, fy + 22, 8, 1, C.gold[1]);
      R(g, x + 3, fy + 28, 2, 4, C.gold[1]); R(g, x + 2, fy + 29, 4, 2, C.gold[1]);
      g.clearRect(x + 3, fy + 39, 2, 1); R(g, x, fy + 40, 3, 1, C.sys[0]); R(g, x + 5, fy + 40, 3, 1, C.sys[0]);
    }
    // entablature + pediment
    R(g, fx, fy + 10, fw, 7, C.stone[3]); R(g, fx, fy + 10, fw, 1, C.stone[4]); R(g, fx, fy + 16, fw, 1, C.stone[1]);
    for (let x = fx + 2; x < fx + fw - 2; x += 4) R(g, x, fy + 14, 2, 1, C.stone[1]);
    for (let yy = 0; yy < 22; yy++) {
      const hw = Math.round((yy + 1) * (fw / 2 - 2) / 22);
      R(g, cx - hw, fy - 12 + yy, hw * 2, 1, C.stone[2]); R(g, cx - hw, fy - 12 + yy, 2, 1, C.stone[4]); R(g, cx + hw - 2, fy - 12 + yy, 2, 1, C.stone[1]);
      if (yy > 5 && yy < 20) { const iw = Math.round((yy - 5) * (fw / 2 - 12) / 16); R(g, cx - iw, fy - 12 + yy, iw * 2, 1, C.stone[1]); }
    }
    R(g, fx, fy + 9, fw, 1, C.stone[4]);
    // gold crest
    for (let i = 0; i < 5; i++) { R(g, cx - i, fy - 2 + i, i * 2 + 1, 1, C.gold[1]); R(g, cx - i, fy + 8 - i, i * 2 + 1, 1, C.gold[i < 2 ? 0 : 1]); }
    R(g, cx - 1, fy + 1, 2, 3, C.gold[2]);
    door(g, cx, ch - 9, 18, 24, { double: true, arch: true, frame: C.gold });
    for (let s = 0; s < 3; s++) { const sw = 46 - s * 6; R(g, cx - sw / 2, ch - 3 - s * 3, sw, 3, C.stone[2]); R(g, cx - sw / 2, ch - 3 - s * 3, sw, 1, C.stone[4]); }
    lightAt(L, cx, ch - 20, 26, '#ffc964', 'win', 0.7);
  },
  anim(b, ox, oy) {
    const cx = ox + 8 + 3 * T + 8, top = oy + 3 * T - 14;
    R(b, cx, top - 9, 1, 10, '#6b5a40');
    for (let i = 0; i < 7; i++) { const yy = Math.round(Math.sin(time * 5 - i * 0.8)); R(b, cx + 1 + i, top - 9 + yy, 1, 4 - (i >> 1), i % 2 ? C.gold[1] : C.gold[2]); }
  },
};

ART.board = {
  up: 3,
  draw(g, fx, fy, fw, fh, lit, L) {
    const ch = fy + fh;
    for (const px of [fx + 4, fx + fw - 8]) { R(g, px, fy - 6, 4, ch - fy + 6, C.wood[1]); R(g, px, fy - 6, 1, ch - fy + 6, C.wood[3]); }
    roof(g, fx - 4, fy - 20, fw + 8, 10, 3, C.roofN);
    R(g, fx, fy - 10, fw, 24, C.wood[2]); R(g, fx, fy - 10, fw, 1, C.wood[3]); R(g, fx, fy + 13, fw, 1, C.wood[0]);
    R(g, fx + 2, fy - 8, fw - 4, 20, '#4a3528');
    for (let i = 0; i < 30; i++) R(g, fx + 2 + hash(i, 1) % (fw - 4), fy - 8 + hash(i, 2) % 20, 1, 1, '#5c4232');
    const notes = [[4, -6, '#e8dcc0'], [13, -7, '#cfe0f5'], [23, -5, '#f2d68c'], [33, -7, '#e8dcc0'], [7, 3, '#f2d68c'], [18, 2, '#e8dcc0'], [28, 3, '#bcd0e8'], [37, 2, '#f5e1c8']];
    notes.forEach(([x, y, col], i) => {
      if (fx + x + 7 > fx + fw - 2) return;
      R(g, fx + x, fy + y, 7, 8, col); R(g, fx + x + 6, fy + y + 1, 1, 7, 'rgba(0,0,0,.25)');
      for (let l = 0; l < 3; l++) R(g, fx + x + 1, fy + y + 2 + l * 2, 3 + hash(i, l) % 3, 1, '#6b5a48');
      R(g, fx + x + 3, fy + y, 1, 1, i % 3 ? '#c0463a' : '#4da3ff');
    });
    // crate and barrel beside the board
    R(g, fx - 7, ch - 10, 9, 9, C.wood[2]); R(g, fx - 7, ch - 10, 9, 1, C.wood[3]); R(g, fx - 7, ch - 6, 9, 1, C.wood[1]); R(g, fx - 3, ch - 10, 1, 9, C.wood[1]);
    ell(g, fx + fw + 3, ch - 6, 4, 5, C.wood[2]); R(g, fx + fw, ch - 9, 7, 1, '#2a2f40'); R(g, fx + fw, ch - 4, 7, 1, '#2a2f40'); R(g, fx + fw, ch - 11, 7, 1, C.wood[3]);
    R(g, fx + fw - 4, fy - 6, 1, 4, '#2a2f40'); R(g, fx + fw - 6, fy - 2, 5, 5, '#2a3047'); R(g, fx + fw - 5, fy - 1, 3, 3, '#ffc964');
    lightAt(L, fx + fw - 4, fy + 1, 28, '#ffb85c', 'always', 0.75);
  },
  anim(b, ox, oy, z) {
    if (discovered.has(z.id)) return;
    const x = ox + 8 + 24, y = oy + 3 * T - 34 + Math.round(Math.sin(time * 4) * 2);
    R(b, x - 2, y - 1, 5, 10, C.out); R(b, x - 2, y + 10, 5, 5, C.out);
    R(b, x - 1, y, 3, 8, C.gold[1]); R(b, x - 1, y, 1, 8, C.gold[2]); R(b, x - 1, y + 11, 3, 3, C.gold[1]);
  },
};

ART.library = {
  up: 4,
  draw(g, fx, fy, fw, fh, lit, L) {
    const ch = fy + fh, cx = fx + 3 * T + 8;
    // dome
    const dome = mk(g.canvas.width, g.canvas.height), dg = dome.getContext('2d');
    for (let yy = 0; yy <= 30; yy++) { const hw = Math.round(36 * Math.sqrt(1 - (yy / 31) ** 2)); dg.fillStyle = KEY; dg.fillRect(cx - hw, fy + 4 - yy, hw * 2, 1); }
    shadeMask(dome, C.roofT, cx, fy + 4, 36, 31, { noise: 0.12, rim: '#5fb0b4', lx: -0.6, ly: -0.7 });
    for (let k = -2; k <= 2; k++) for (let yy = 0; yy <= 30; yy++) { const hw = 36 * Math.sqrt(1 - (yy / 31) ** 2); R(dg, Math.round(cx + k * hw / 2.6), fy + 4 - yy, 1, 1, k ? C.roofT[0] : C.gold[0]); }
    g.drawImage(dome, 0, 0);
    R(g, cx - 1, fy - 36, 2, 9, C.gold[1]); R(g, cx - 2, fy - 31, 4, 2, C.gold[2]); circ(g, cx, fy - 37, 1, C.gold[2]);
    // drum with oculi
    R(g, fx + 14, fy + 2, fw - 28, 8, C.stone[3]); R(g, fx + 14, fy + 2, fw - 28, 1, C.stone[4]);
    for (const ox of [-24, -8, 8, 24]) { R(g, cx + ox - 2, fy + 4, 4, 4, lit ? C.sys[2] : C.winOff[1]); R(g, cx + ox - 1, fy + 5, 2, 2, lit ? '#e6f4ff' : C.winOff[2]); if (lit) lightAt(L, cx + ox, fy + 6, 10, '#4da3ff', 'win', 0.5); }
    bricks(g, fx + 2, fy + 12, fw - 4, ch - (fy + 12), [C.stone[2], C.stone[3], C.stone[4]], 8, 5);
    R(g, fx, fy + 9, fw, 4, C.stone[4]); R(g, fx, fy + 12, fw, 1, C.stone[1]);
    for (const px of [fx + 1, fx + fw - 8]) { R(g, px, fy - 4, 7, 14, C.stone[3]); R(g, px, fy - 4, 1, 14, C.stone[4]); for (let i = 0; i < 4; i++) R(g, px + i, fy - 8 + i, 7 - i * 2, 1, C.stone[i < 2 ? 3 : 4]); }
    const spines = ['#d9b45b', '#4da3ff', '#8f6cc4', '#c0463a', '#c9d6e8', '#3d6fb8', '#5fae8a'];
    for (const wx of [fx + 9, fx + fw - 27]) {
      R(g, wx - 2, fy + 18, 22, 28, C.stone[4]);
      R(g, wx, fy + 20, 18, 26, lit ? '#3a2614' : '#0b1220');
      for (let s = 0; s < 4; s++) {
        R(g, wx, fy + 26 + s * 6, 18, 1, lit ? C.wood[3] : C.wood[1]);
        for (let i = 0; i < 17; i++) { const hgt = 3 + hash(i, s) % 3; R(g, wx + 1 + i, fy + 26 + s * 6 - hgt, 1, hgt, lit ? spines[hash(i * 3, s) % spines.length] : C.winOff[1 + (i % 2)]); }
      }
      R(g, wx, fy + 20, 2, 1, C.stone[4]); R(g, wx + 16, fy + 20, 2, 1, C.stone[4]); R(g, wx + 8, fy + 20, 2, 26, C.stone[4]);
      if (lit) { R(g, wx, fy + 20, 18, 2, 'rgba(255,201,100,.35)'); lightAt(L, wx + 9, fy + 32, 28, '#ffc964'); }
    }
    door(g, cx, ch - 3, 14, 22, { arch: true, frame: C.stone[4] });
    R(g, cx - 5, ch - 29, 10, 1, lit ? C.sys[1] : C.sys[0]);
    for (let s = 0; s < 2; s++) { const sw = 26 - s * 6; R(g, cx - sw / 2, ch - 2 - s * 2, sw, 2, C.stone[3]); R(g, cx - sw / 2, ch - 2 - s * 2, sw, 1, C.stone[4]); }
  },
};

ART.watchtower = {
  up: 7,
  draw(g, fx, fy, fw, fh, lit, L) {
    const ch = fy + fh, cx = fx + T + 8, top = 40;
    // tapering stone shaft with cylindrical dithered shading
    for (let yy = top; yy < ch; yy++) {
      const hw = 15 + Math.round((yy - top) / (ch - top) * 2);
      for (let xx = -hw; xx < hw; xx++) {
        const t = (xx + hw) / (hw * 2) + (BAYER[(yy & 3) * 4 + (xx & 3)] / 16 - 0.5) * 0.25;
        const tone = t < 0.18 ? 4 : t < 0.42 ? 3 : t < 0.75 ? 2 : 1;
        const row = (yy - top) % 5, off = (((yy - top) / 5 | 0) % 2) * 4;
        R(g, cx + xx, yy, 1, 1, row === 0 || (xx + hw + off) % 8 === 0 ? C.stone[Math.max(0, tone - 1)] : C.stone[tone]);
      }
    }
    R(g, cx - 18, ch - 7, 36, 7, C.stone[2]); R(g, cx - 18, ch - 7, 36, 1, C.stone[3]);
    for (const sy of [62, 94]) { R(g, cx - 2, sy - 1, 4, 10, C.stone[1]); R(g, cx - 1, sy, 2, 8, lit ? C.win[1] : C.winOff[1]); if (lit) lightAt(L, cx, sy + 4, 14, '#ffc964', 'win', 0.6); }
    door(g, cx, ch, 12, 18, { arch: true });
    R(g, cx - 6, ch - 12, 12, 1, '#1a1f2c'); R(g, cx - 6, ch - 6, 12, 1, '#1a1f2c');
    // balcony
    R(g, cx - 21, 36, 42, 6, C.stone[3]); R(g, cx - 21, 36, 42, 1, C.stone[4]); R(g, cx - 21, 41, 42, 1, C.stone[1]);
    for (let x = cx - 20; x < cx + 20; x += 6) { R(g, x, 42, 3, 3, C.stone[2]); R(g, x + 1, 45, 1, 1, C.stone[1]); }
    for (let x = cx - 21; x < cx + 21; x += 7) { R(g, x, 31, 4, 5, C.stone[3]); R(g, x, 31, 4, 1, C.stone[4]); R(g, x + 3, 32, 1, 4, C.stone[1]); }
    // eye chamber
    R(g, cx - 15, 20, 30, 16, C.stone[2]); R(g, cx - 15, 20, 1, 16, C.stone[3]);
    R(g, cx - 11, 22, 22, 9, '#03050a'); R(g, cx - 11, 22, 22, 1, C.stone[1]);
    // cone roof
    for (let yy = 0; yy < 20; yy++) {
      const hw = Math.round(yy * 20 / 19) + 1, row = yy % 3;
      R(g, cx - hw, 2 + yy, hw * 2, 1, row === 0 ? C.roofN[0] : C.roofN[1]);
      R(g, cx - hw, 2 + yy, Math.max(1, hw >> 1), 1, row === 0 ? C.roofN[1] : C.roofN[2]);
      if (row === 1) for (let xx = -hw + ((yy / 3 | 0) % 2) * 2; xx < hw; xx += 4) R(g, cx + xx, 2 + yy, 1, 1, C.roofN[0]);
    }
    R(g, cx - 22, 21, 44, 2, C.roofN[0]);
    R(g, cx, 0, 1, 3, C.gold[1]);
    lightAt(L, cx, 27, 30, '#4da3ff', 'eye', 0.9);
  },
  anim(b, ox, oy, z) {
    const cx = ox + 8 + T + 8, ey = oy + 27;
    const wx = z.x * T + T + 8, wy = (z.y - z.up) * T + 27;
    const lx = Math.max(-5, Math.min(5, Math.round((player.x - wx) / 24))), ly = Math.max(-2, Math.min(2, Math.round((player.y - 12 - wy) / 40)));
    const blink = (time % 4.2) < 0.14;
    const lxc = Math.max(-3, Math.min(3, lx));
    for (let dy = -2; dy <= 2; dy++) {
      const hw = Math.round(7 * Math.sqrt(1 - (dy * dy) / 8));
      if (blink && dy !== 0) continue;
      R(b, cx - hw, ey + dy, hw * 2, 1, dy < 0 ? '#aebcd4' : '#d8e2f0');
    }
    if (!blink) {
      R(b, cx - 2 + lxc, ey - 2 + Math.max(-1, Math.min(1, ly)), 4, 4, C.sys[1]); R(b, cx - 2 + lxc, ey - 2, 4, 1, C.sys[0]);
      R(b, cx - 1 + lxc, ey - 1, 2, 2, '#03050a'); R(b, cx - 2 + lxc, ey - 2, 1, 1, '#ffffff');
    }
    R(b, cx - 8, ey - 3, 16, 1, '#2a3550'); R(b, cx - 6, ey - 4, 12, 1, '#2a3550'); R(b, cx - 7, ey + 3, 14, 1, '#1a2238');
    // pennant from the roof tip
    for (let i = 0; i < 8; i++) { const yy = Math.round(Math.sin(time * 6 - i * 0.7)); R(b, cx + 1 + i, oy - 2 + yy, 1, 4 - (i >> 1), i < 2 ? C.gold[1] : C.sys[1]); }
  },
};

ART.dungeon = {
  up: 3,
  draw(g, fx, fy, fw, fh, lit, L) {
    const ch = fy + fh, cx = fx + 3 * T + 8;
    const r = mulberry(7);
    const boulder = (bx, by, rx, ry, seed) => {
      const t = mk(g.canvas.width, g.canvas.height), tg = t.getContext('2d');
      ell(tg, bx, by, rx, ry, KEY); circ(tg, bx - rx / 3, by - ry / 2, Math.round(ry * 0.6), KEY);
      shadeMask(t, ['#10131f', '#1a2032', '#283049', '#3a4566', '#4f5c84'], bx - 2, by - 2, rx, ry, { noise: 0.22, rim: '#6a78a4', seed });
      outline(t, '#05070d'); g.drawImage(t, 0, 0);
    };
    [[cx - 40, ch - 36, 20, 16], [cx + 40, ch - 38, 20, 17], [cx - 18, ch - 54, 22, 16], [cx + 16, ch - 56, 22, 15], [cx, ch - 62, 18, 12]].forEach(([x, y, rx, ry], i) => boulder(x, y, rx, ry, i * 13));
    [[cx - 50, ch - 14, 14, 13], [cx + 50, ch - 14, 14, 13], [cx - 30, ch - 16, 16, 15], [cx + 30, ch - 16, 16, 15]].forEach(([x, y, rx, ry], i) => boulder(x, y, rx, ry, 50 + i * 7));
    g.clearRect(0, ch, g.canvas.width, 8);
    // moss on the lit tops
    for (let i = 0; i < 40; i++) { const x = cx - 50 + (r() * 100 | 0), y = ch - 70 + (r() * 40 | 0); const p = g.getImageData(x, y - 1, 1, 1).data, q = g.getImageData(x, y, 1, 1).data; if (!p[3] && q[3]) { R(g, x, y, 3, 1, G[3]); R(g, x + 1, y, 1, 1, G[4]); } }
    // archway
    for (let yy = -30; yy <= 0; yy++) for (let xx = -30; xx <= 30; xx++) {
      const d = Math.hypot(xx, yy);
      if (d <= 28 && d > 18) { const seg = Math.floor((Math.atan2(yy, xx) + Math.PI) / (Math.PI / 7)); const edge = Math.abs(d - 23) > 4 || Math.abs(((Math.atan2(yy, xx) + Math.PI) / (Math.PI / 7)) - seg - 0.5) > 0.42; R(g, cx + xx, ch - 34 + yy, 1, 1, edge ? C.stone[1] : (yy < -20 ? C.stone[4] : C.stone[3])); }
      else if (d <= 18) R(g, cx + xx, ch - 34 + yy, 1, 1, '#04060b');
    }
    for (const jx of [cx - 28, cx + 19]) { bricks(g, jx, ch - 34, 10, 34, [C.stone[1], C.stone[3], C.stone[4]], 10, 6); }
    R(g, cx - 18, ch - 34, 37, 34, '#04060b');
    for (let s = 0; s < 5; s++) { const sw = 34 - s * 4, sy = ch - 3 - s * 4; R(g, cx - sw / 2, sy, sw, 2, ['#3a4566', '#2b334b', '#1e2436', '#141826', '#0b0e18'][s]); R(g, cx - sw / 2, sy + 2, sw, 1, '#04060b'); }
    R(g, cx - 4, ch - 64, 9, 11, C.stone[4]); R(g, cx - 4, ch - 64, 9, 1, '#7b88b0'); R(g, cx - 4, ch - 54, 9, 1, C.stone[1]);
    R(g, cx - 2, ch - 61, 1, 2, '#ff6b5a'); R(g, cx + 2, ch - 61, 1, 2, '#ff6b5a'); R(g, cx - 1, ch - 58, 3, 1, '#ff6b5a');
    lightAt(L, cx, ch - 59, 12, '#ff6b5a', 'always', 0.5);
    // skull and bones by the right jamb
    R(g, cx + 32, ch - 5, 5, 4, '#c9c2b0'); R(g, cx + 33, ch - 4, 1, 1, '#04060b'); R(g, cx + 35, ch - 4, 1, 1, '#04060b'); R(g, cx + 33, ch - 1, 3, 1, '#a59e8c');
    R(g, cx + 38, ch - 2, 6, 1, '#c9c2b0'); R(g, cx - 40, ch - 3, 5, 1, '#c9c2b0');
    for (const tx of [cx - 36, cx + 36]) { R(g, tx - 1, ch - 32, 3, 9, '#2a2f40'); R(g, tx - 3, ch - 33, 7, 2, '#3a3f55'); lightAt(L, tx, ch - 38, 44, '#ff9a3c', 'torch', 0.95); }
  },
  anim(b, ox, oy) {
    const cx = ox + 8 + 3 * T + 8, ch = oy + 7 * T;
    for (const tx of [cx - 36, cx + 36]) {
      const f = Math.sin(time * 17 + tx) > 0 ? 1 : 0, f2 = Math.sin(time * 11 + tx * 2) > 0.3 ? 1 : 0;
      R(b, tx - 2, ch - 38 - f, 5, 5 + f, '#c4441f'); R(b, tx - 1, ch - 41 - f - f2, 3, 5, '#e0823d'); R(b, tx - 1, ch - 37, 3, 3, '#ffc964'); R(b, tx, ch - 39 - f2, 1, 2, '#fff3c4');
      if ((time * 3 + tx) % 2 < 0.25) R(b, tx + (f ? 1 : -1), ch - 45 - f2 * 2, 1, 1, '#ffc964');
    }
    if ((time % 5) > 4.1 && (time % 5) < 4.9) { R(b, cx - 5, ch - 20, 2, 1, '#ff3b30'); R(b, cx + 3, ch - 20, 2, 1, '#ff3b30'); }
  },
};

ART.tavern = {
  up: 4, smoke: [[28, 26]],
  draw(g, fx, fy, fw, fh, lit, L) {
    const ch = fy + fh, cx = fx + 3 * T + 8;
    bricks(g, fx + 16, fy - 38, 8, 26, C.stone, 4, 3); R(g, fx + 15, fy - 39, 10, 2, C.stone[3]);
    roof(g, fx - 5, fy - 22, fw + 10, 34, 13, C.roofP);
    // dormer
    R(g, cx + 14, fy - 14, 16, 14, C.plaster[1]); roof(g, cx + 12, fy - 20, 20, 8, 7, C.roofP);
    windowPane(g, cx + 18, fy - 10, 8, 7, lit, { sill: false }); if (lit) lightAt(L, cx + 22, fy - 7, 16, '#ffc964');
    // upper floor: plaster and dark timber
    R(g, fx + 1, fy + 10, fw - 2, 24, C.plaster[1]); R(g, fx + 1, fy + 10, fw - 2, 2, C.wood[1]); R(g, fx + 1, fy + 32, fw - 2, 2, C.wood[1]);
    for (let x = fx + 1; x < fx + fw; x += 18) R(g, x, fy + 10, 2, 24, C.wood[1]);
    for (const x0 of [fx + 19, fx + fw - 37]) for (let i = 0; i < 18; i++) { R(g, x0 + i, fy + 12 + Math.round(i * 20 / 18), 1, 2, C.wood[1]); R(g, x0 + 17 - i, fy + 12 + Math.round(i * 20 / 18), 1, 2, C.wood[1]); }
    R(g, fx + 1, fy + 12, fw - 2, 2, 'rgba(0,0,0,.35)');
    for (const wx of [fx + 5, fx + fw / 2 - 5, fx + fw - 15]) { windowPane(g, wx, fy + 16, 10, 10, lit); if (lit) lightAt(L, wx + 5, fy + 21, 20, '#ffc964'); }
    // ground floor: stone
    bricks(g, fx + 4, fy + 34, fw - 8, ch - fy - 34, C.stone, 7, 4);
    R(g, fx + 4, fy + 34, fw - 8, 3, 'rgba(0,0,0,.45)');
    for (const wx of [fx + 9, fx + fw - 29]) {
      windowPane(g, wx, fy + 42, 20, 11, lit, { mullion: false });
      for (let x = 4; x < 20; x += 5) R(g, wx + x, fy + 42, 1, 11, C.wood[1]);
      if (lit) lightAt(L, wx + 10, fy + 47, 30, '#ffb85c');
    }
    door(g, cx, ch, 14, 20, { arch: true, frame: C.wood[3] });
    // barrels
    for (const [bx, by] of [[cx - 22, ch - 7], [cx - 14, ch - 6], [cx - 18, ch - 13]]) { ell(g, bx, by, 4, 5, C.wood[2]); R(g, bx - 3, by - 3, 7, 1, '#2a2f40'); R(g, bx - 3, by + 2, 7, 1, '#2a2f40'); R(g, bx - 2, by - 5, 4, 1, C.wood[3]); R(g, bx - 3, by - 2, 1, 4, C.wood[3]); }
    R(g, cx + 10, fy + 38, 16, 2, '#2a2f40'); R(g, cx + 10, fy + 36, 2, 6, '#2a2f40');
  },
  anim(b, ox, oy) {
    const sx = ox + 8 + 3 * T + 8 + 22, sy = oy + 4 * T + 40, sw = Math.round(Math.sin(time * 2.2) * 1.2);
    R(b, sx - 4, sy, 1, 4, '#2a2f40'); R(b, sx + 4, sy, 1, 4, '#2a2f40');
    const x = sx - 7 + sw, y = sy + 4;
    R(b, x - 1, y - 1, 16, 12, C.out); R(b, x, y, 14, 10, C.wood[2]); R(b, x, y, 14, 1, C.wood[3]); R(b, x, y + 9, 14, 1, C.wood[1]);
    R(b, x + 4, y + 3, 5, 5, C.gold[1]); R(b, x + 4, y + 3, 1, 5, C.gold[2]); R(b, x + 9, y + 4, 2, 1, C.gold[1]); R(b, x + 10, y + 4, 1, 3, C.gold[1]); R(b, x + 9, y + 6, 2, 1, C.gold[1]);
    R(b, x + 4, y + 2, 5, 1, '#e8eef7'); R(b, x + 5, y + 1, 2, 1, '#e8eef7');
  },
};

ART.shrine = {
  up: 4,
  draw(g, fx, fy, fw, fh, lit, L) {
    const ch = fy + fh, cx = fx + 2 * T + 8;
    const tier = (x, y, w, h) => { R(g, x, y, w, h, C.stone[2]); R(g, x, y, w, 1, C.stone[4]); R(g, x, y + 1, w, 1, C.stone[3]); R(g, x, y + h - 1, w, 1, C.stone[1]); for (let xx = 6; xx < w; xx += 9) R(g, x + xx, y + 2, 1, h - 3, C.stone[1]); };
    tier(fx - 2, ch - 9, fw + 4, 9); tier(fx + 5, ch - 16, fw - 10, 7); tier(fx + 12, ch - 22, fw - 24, 6);
    for (let i = 0; i < 6; i++) R(g, fx + 10 + i * 11, ch - 13, 5, 1, C.sys[1]);
    for (let s = 0; s < 6; s++) { R(g, cx - 9, ch - 4 - s * 3.5, 18, 3, C.stone[3]); R(g, cx - 9, ch - 4 - s * 3.5, 18, 1, C.stone[4]); }
    for (const px of [fx + 7, fx + fw - 16]) {
      R(g, px, fy - 22, 9, ch - 22 - (fy - 22), C.stone[3]); R(g, px, fy - 22, 2, ch - 22 - (fy - 22), C.stone[4]); R(g, px + 7, fy - 22, 2, ch - 22 - (fy - 22), C.stone[1]);
      for (let i = 0; i < 5; i++) R(g, px + 1 + i, fy - 27 + i, 9 - i * 2 - 1, 1, i < 2 ? C.stone[4] : C.stone[3]);
      for (let i = 0; i < 4; i++) R(g, px + 4, fy - 12 + i * 8, 2, 4, C.sys[i % 2 ? 1 : 2]);
      lightAt(L, px + 5, fy, 18, '#4da3ff', 'always', 0.5);
    }
    R(g, fx + 3, fy - 32, fw - 6, 6, C.stone[3]); R(g, fx + 3, fy - 32, fw - 6, 1, C.stone[4]); R(g, fx + 3, fy - 27, fw - 6, 1, C.stone[1]);
    R(g, fx + 1, fy - 34, fw - 2, 2, C.stone[4]);
    for (let i = 0; i < 3; i++) R(g, cx - i, fy - 31 + i, i * 2 + 1, 1, C.gold[1]); for (let i = 0; i < 2; i++) R(g, cx - i, fy - 27 - i, i * 2 + 1, 1, C.gold[1]);
    lightAt(L, cx, fy - 4, 60, '#4da3ff', 'crystal', 0.95);
  },
  anim(b, ox, oy) {
    const cx = ox + 8 + 2 * T + 8, cy = oy + 4 * T - 6 + Math.round(Math.sin(time * 1.6) * 2);
    const pulse = (Math.sin(time * 2.4) + 1) / 2;
    for (let i = 0; i < 9; i++) {
      const hw = Math.round(i * 5 / 8);
      R(b, cx - hw - 1, cy - 9 + i, hw + 1, 1, i < 3 ? '#e6f4ff' : C.sys[2]); R(b, cx, cy - 9 + i, hw + 1, 1, C.sys[1]);
    }
    for (let i = 0; i < 9; i++) {
      const hw = Math.round((8 - i) * 5 / 8);
      R(b, cx - hw - 1, cy + i, hw + 1, 1, C.sys[1]); R(b, cx, cy + i, hw + 1, 1, '#2a5a9e');
    }
    R(b, cx - 3, cy - 4, 1, 3, '#ffffff');
    for (let i = 0; i < 3; i++) {
      const a = time * 1.4 + i * 2.1, sx = cx + Math.round(Math.cos(a) * 13), sy = cy + Math.round(Math.sin(a) * 4);
      if (Math.sin(a) > -0.2 || pulse > 0.5) R(b, sx, sy, 1, 1, i ? C.sys[2] : '#ffffff');
    }
  },
};

// ---------- Build the world ----------
const LAMPS = layoutZones();
const TREES = [], DECO_SHADOWS = [];
const treeSprites = [makeTree(11, false), makeTree(23, false), makeTree(37, true), makeTree(51, false)];
const rockSprites = [makeRock(4), makeRock(9)], bushSprites = [makeBush(5), makeBush(14)];
const lampSprite = makeLamp();

ZONES.forEach(z => {
  const A = ART[z.kind], cw = z.w * T + 16, ch = (z.h + z.up) * T;
  z.art = {};
  for (const lit of [true, false]) {
    const c = mk(cw, ch), g = c.getContext('2d'), L = [];
    A.draw(g, 8, z.up * T, z.w * T, z.h * T, lit, L);
    outline(c, C.out);
    z.art[lit ? 'lit' : 'dark'] = c;
    if (lit) z.lights = L;
  }
  const d = z.art.lit.getContext('2d').getImageData(0, 0, cw, ch).data;
  z.artTop = 0; outer: for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3]) { z.artTop = y; break outer; }
  z.ox = z.x * T - 8; z.oy = (z.y - z.up) * T;
});

// Ground layer: baked once.
const ground = mk(W * T, H * T), gg = ground.getContext('2d');
const isPath = (x, y) => [PATH, FOUNT].includes(at(x, y));
const isWater = (x, y) => at(x, y) === WATER;
function grassTile(x, y) {
  const sx = x * T, sy = y * T, h = hash(x, y), v = h % 4;
  R(gg, sx, sy, T, T, G[1]);
  for (let i = 0; i < 14; i++) { const hh = hash(x * 31 + i, y * 17); R(gg, sx + hh % 16, sy + (hh >>> 5) % 16, 1, 1, i % 3 ? G[0] : G[2]); }
  if (v === 0) for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 8; xx++) if ((xx + yy) % 2 === 0 && (hash(xx + sx, yy + sy) % 3)) R(gg, sx + 4 + xx, sy + 5 + yy, 1, 1, G[2]);
  if (v === 1 || v === 3) for (let i = 0; i < 3; i++) { const hh = hash(x + i * 7, y * 3 + i); const tx = sx + 2 + hh % 12, ty = sy + 3 + (hh >>> 4) % 10; R(gg, tx, ty, 1, 2, G[3]); R(gg, tx + 2, ty, 1, 2, G[3]); R(gg, tx + 1, ty + 1, 1, 2, G[3]); R(gg, tx + 1, ty, 1, 1, G[4]); }
  if (v === 2) for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 7; xx++) if ((xx + yy) % 2) R(gg, sx + 6 + xx, sy + 2 + yy, 1, 1, G[0]);
}
function lip(x, y, side, col = G[1], rimCol = G[2]) {
  const sx = x * T, sy = y * T;
  for (let i = 0; i < 16; i++) {
    const lh = 2 + (hash(sx + i * 3 + side, sy + side * 5) % 3 === 0 ? 1 : 0) - (hash(sx + i, sy + side) % 4 === 0 ? 1 : 0);
    if (side === 0) { R(gg, sx + i, sy, 1, lh, col); R(gg, sx + i, sy + lh, 1, 1, 'rgba(0,0,0,.35)'); if (i % 3 === 0) R(gg, sx + i, sy + lh - 1, 1, 1, rimCol); }
    if (side === 2) { R(gg, sx + i, sy + 16 - lh, 1, lh, col); if (i % 4 === 1) R(gg, sx + i, sy + 16 - lh, 1, 1, rimCol); }
    if (side === 3) { R(gg, sx, sy + i, lh, 1, col); R(gg, sx + lh, sy + i, 1, 1, 'rgba(0,0,0,.25)'); }
    if (side === 1) { R(gg, sx + 16 - lh, sy + i, lh, 1, col); if (i % 3 === 0) R(gg, sx + 16 - lh, sy + i, 1, 1, rimCol); }
  }
}
function corners(x, y, same, col, size = 4) {
  const sx = x * T, sy = y * T;
  const n = same(x, y - 1), s = same(x, y + 1), w = same(x - 1, y), e = same(x + 1, y);
  const fill = (cx, cy, dx, dy) => { for (let j = 0; j < size; j++) { const w = Math.round(size - Math.sqrt(size * size - (size - j) ** 2)) || (j < size ? 1 : 0); const ww = size - Math.round(Math.sqrt(Math.max(0, size * size - (size - j - 0.5) ** 2))); if (ww > 0) R(gg, dx > 0 ? cx : cx - ww + 1, cy + j * dy, ww, 1, col); } };
  if (!n && !w) fill(sx, sy, 1, 1); if (!n && !e) fill(sx + 15, sy, -1, 1); if (!s && !w) fill(sx, sy + 15, 1, -1); if (!s && !e) fill(sx + 15, sy + 15, -1, -1);
  if (n && w && !same(x - 1, y - 1)) { R(gg, sx, sy, 2, 1, col); R(gg, sx, sy + 1, 1, 1, col); }
  if (n && e && !same(x + 1, y - 1)) { R(gg, sx + 14, sy, 2, 1, col); R(gg, sx + 15, sy + 1, 1, 1, col); }
  if (s && w && !same(x - 1, y + 1)) { R(gg, sx, sy + 15, 2, 1, col); R(gg, sx, sy + 14, 1, 1, col); }
  if (s && e && !same(x + 1, y + 1)) { R(gg, sx + 14, sy + 15, 2, 1, col); R(gg, sx + 15, sy + 14, 1, 1, col); }
}
const stoneRows = [];
function stoneRow(ry) {
  if (stoneRows[ry]) return stoneRows[ry];
  const out = []; let x = -(hash(ry, 99) % 5);
  while (x < W * T) { const w = 4 + hash(x, ry) % 3; out.push([x, w]); x += w; }
  return (stoneRows[ry] = out);
}
function pathTile(x, y) {
  const sx = x * T, sy = y * T;
  R(gg, sx, sy, T, T, PV[0]);
  for (let r = 0; r < 4; r++) {
    const wy = sy + r * 4;
    for (const [wx, sw] of stoneRow(y * 4 + r)) {
      if (wx + sw <= sx || wx >= sx + 16) continue;
      const h2 = hash(wx, wy), col = [PV[2], PV[2], PV[3], PV[1], PV[2], PV[3]][h2 % 6];
      const x0 = Math.max(wx + 1, sx), x1 = Math.min(wx + sw, sx + 16);
      if (x1 <= x0) continue;
      R(gg, x0, wy + 1, x1 - x0, 3, col);
      if (wx + 1 >= sx) { R(gg, wx + 1, wy + 1, 1, 1, PV[0]); R(gg, wx + 2, wy + 1, Math.min(2, x1 - wx - 2), 1, PV[4]); }
      if (x1 === wx + sw) { R(gg, x1 - 1, wy + 3, 1, 1, PV[0]); R(gg, x1 - 1, wy + 2, 1, 1, PV[1]); }
      if (h2 % 23 === 0 && x1 - x0 > 2) R(gg, x0 + 1, wy, 1, 1, G[3]);
    }
  }
  if (!isPath(x, y - 1)) lip(x, y, 0); if (!isPath(x + 1, y)) lip(x, y, 1); if (!isPath(x, y + 1)) lip(x, y, 2); if (!isPath(x - 1, y)) lip(x, y, 3);
  corners(x, y, isPath, G[1]);
}
function waterTile(x, y) {
  const sx = x * T, sy = y * T;
  R(gg, sx, sy, T, T, WA[1]);
  let deep = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!isWater(x + dx, y + dy)) deep = false;
  if (deep) for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) if ((xx + yy) % 2 === 0 && hash(sx + xx, sy + yy) % 3) R(gg, sx + xx, sy + yy, 1, 1, WA[0]);
  if (!isWater(x, y - 1)) { R(gg, sx, sy, 16, 5, '#191722'); R(gg, sx, sy + 4, 16, 1, '#0e0d15'); for (let i = 0; i < 16; i += 3) R(gg, sx + i, sy + 1 + hash(sx + i, sy) % 3, 1, 1, '#24212f'); lip(x, y, 0); R(gg, sx, sy + 5, 16, 1, WA[2]); }
  if (!isWater(x, y + 1)) { lip(x, y, 2); R(gg, sx, sy + 12, 16, 1, WA[3]); }
  if (!isWater(x - 1, y)) { lip(x, y, 3); R(gg, sx + 3, sy, 1, 16, WA[2]); }
  if (!isWater(x + 1, y)) { lip(x, y, 1); R(gg, sx + 12, sy, 1, 16, WA[2]); }
  corners(x, y, isWater, G[1], 8);
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) grassTile(x, y);
if (GALLERY) {
  // clean grass, one sample per variant, before paths and decoration cover it
  SHEET.grass = [0, 1, 2, 3].map(v => { for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (hash(x, y) % 4 === v) return crop(ground, x * T, y * T, T, T); });
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const t = map[idx(x, y)], sx = x * T, sy = y * T, h = hash(x, y);
  if (t === PATH || t === FOUNT) pathTile(x, y);
  else if (t === WATER) waterTile(x, y);
}
if (GALLERY) {
  // one sample per autotile mask (N=1, E=2, S=4, W=8), cropped before decoration lands on top
  const byMask = (type, same) => {
    const out = {};
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (map[idx(x, y)] !== type) continue;
      const m = (same(x, y - 1) ? 1 : 0) | (same(x + 1, y) ? 2 : 0) | (same(x, y + 1) ? 4 : 0) | (same(x - 1, y) ? 8 : 0);
      if (!out[m]) out[m] = { x, y, c: crop(ground, x * T, y * T, T, T) };
    }
    return out;
  };
  SHEET.path = byMask(PATH, isPath);
  SHEET.water = byMask(WATER, isWater);
}
// plaza inlay ring around the fountain
{ const fcx = (FOUNTAIN.x + 1.5) * T, fcy = (FOUNTAIN.y + 1.6) * T;
  for (let yy = -30; yy <= 30; yy++) for (let xx = -50; xx <= 50; xx++) {
    const d = (xx / 46) ** 2 + (yy / 27) ** 2, d2 = (xx / 41) ** 2 + (yy / 23) ** 2;
    if (d <= 1 && d2 > 1) { const seg = Math.floor((Math.atan2(yy, xx) + Math.PI) * 9); R(gg, fcx + xx, fcy + yy, 1, 1, seg % 2 ? '#4a4a60' : '#5a5870'); if (d > 0.9) R(gg, fcx + xx, fcy + yy, 1, 1, PV[0]); }
  } }
const MUSHROOMS = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const t = map[idx(x, y)], sx = x * T, sy = y * T, h = hash(x, y);
  if (t === GRASS || t === FLOWER) {
    const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isWater(x + dx, y + dy));
    if (nearWater && h % 5 < 3) for (let i = 0; i < 4; i++) { const rx = sx + 2 + (hash(x, i) % 12), hgt = 4 + hash(i, y) % 4; R(gg, rx, sy + 14 - hgt, 1, hgt, G[3]); R(gg, rx, sy + 14 - hgt, 1, 2, i % 2 ? C.wood[3] : G[4]); }
    else if (t === GRASS && !reserved[idx(x, y)] && h % 37 === 0) { gg.drawImage(bushSprites[h % 2], sx, sy + 3); }
    else if (t === GRASS && h % 29 === 1) { const glow = h % 3 === 0; const mx = sx + 4 + h % 8, my = sy + 6 + (h >>> 3) % 6; R(gg, mx, my + 2, 1, 2, '#c9c2b0'); R(gg, mx - 1, my, 3, 2, glow ? C.sys[1] : '#a0503c'); R(gg, mx - 1, my, 1, 1, glow ? C.sys[2] : '#c87a5c'); if (glow) MUSHROOMS.push({ x: mx, y: my }); }
    else if (t === GRASS && h % 11 === 2) { R(gg, sx + h % 14, sy + (h >>> 4) % 14, 2, 1, C.stone[3]); R(gg, sx + h % 14, sy + (h >>> 4) % 14 + 1, 2, 1, C.stone[1]); }
  }
  if (t === FLOWER) for (let i = 0; i < 4; i++) {
    const hh = hash(x * 5 + i, y * 9), fx = sx + 2 + hh % 12, fy = sy + 3 + (hh >>> 4) % 10, col = ['#9fd0ff', '#d9b45b', '#c58bd6', '#e8eef7'][(hh >>> 8) % 4];
    R(gg, fx, fy + 2, 1, 2, G[3]); R(gg, fx - 1, fy, 3, 1, col); R(gg, fx, fy - 1, 1, 3, col); R(gg, fx, fy, 1, 1, i % 2 ? '#fff3c4' : C.gold[1]);
  }
  if (t === ROCK) { gg.fillStyle = 'rgba(0,0,0,.35)'; ell(gg, sx + 9, sy + 13, 7, 2, 'rgba(0,0,0,.35)'); gg.drawImage(rockSprites[h % 2], sx, sy + 1); }
  if (t === FENCE) {
    const e = at(x + 1, y) === FENCE, w = at(x - 1, y) === FENCE, n = at(x, y - 1) === FENCE, s = at(x, y + 1) === FENCE;
    const rail = (x0, len) => { R(gg, x0, sy + 6, len, 2, C.wood[2]); R(gg, x0, sy + 6, len, 1, C.wood[3]); R(gg, x0, sy + 10, len, 2, C.wood[2]); R(gg, x0, sy + 10, len, 1, C.wood[3]); R(gg, x0, sy + 12, len, 1, 'rgba(0,0,0,.35)'); };
    if (e) rail(sx + 9, 7); if (w) rail(sx, 7);
    if (n) { R(gg, sx + 7, sy, 2, 4, C.wood[2]); R(gg, sx + 7, sy, 1, 4, C.wood[3]); }
    if (s) { R(gg, sx + 7, sy + 14, 2, 2, C.wood[2]); }
    R(gg, sx + 6, sy + 3, 4, 11, C.wood[2]); R(gg, sx + 6, sy + 3, 1, 11, C.wood[3]); R(gg, sx + 9, sy + 3, 1, 11, C.wood[1]); R(gg, sx + 6, sy + 2, 4, 1, C.wood[3]); R(gg, sx + 7, sy + 1, 2, 1, C.wood[3]);
    R(gg, sx + 6, sy + 14, 5, 1, 'rgba(0,0,0,.4)');
  }
  if (t === TREE) {
    const jx = (h % 7) - 3, jy = ((h >>> 3) % 5) - 2;
    TREES.push({ x: sx + 8 + jx, y: sy + 15 + jy, spr: treeSprites[(h >>> 6) % treeSprites.length] });
    ell(gg, sx + 11 + jx, sy + 14 + jy, 10, 3, 'rgba(0,0,0,.32)');
  }
  if (t === LAMP) ell(gg, sx + 9, sy + 14, 5, 2, 'rgba(0,0,0,.35)');
}
ZONES.forEach(z => {
  R(gg, z.x * T - 2, (z.y + z.h) * T - 3, z.w * T + 4, 4, 'rgba(0,0,0,.4)');
  R(gg, (z.x + z.w) * T, z.y * T + 6, 6, z.h * T - 6, 'rgba(0,0,0,.28)');
});

// Fountain sprite (static part)
const fountain = mk(56, 46), fg2 = fountain.getContext('2d');
ell(fg2, 28, 34, 25, 10, KEY); shadeMask(fountain, C.stone.slice(1), 24, 30, 25, 10, { noise: 0.15, rim: C.stone[4] });
ell(fg2, 28, 33, 20, 7, WA[2]); ell(fg2, 28, 34, 18, 5, WA[1]);
R(fg2, 25, 12, 6, 22, C.stone[3]); R(fg2, 25, 12, 2, 22, C.stone[4]); R(fg2, 30, 12, 1, 22, C.stone[1]);
ell(fg2, 28, 12, 9, 3, C.stone[3]); ell(fg2, 28, 11, 7, 2, WA[3]); R(fg2, 19, 12, 18, 1, C.stone[4]);
outline(fountain, C.out);
const FOUNT_POS = { x: FOUNTAIN.x * T - 4, y: (FOUNTAIN.y + FOUNTAIN.h) * T - 46 };
ell(gg, FOUNT_POS.x + 30, FOUNT_POS.y + 42, 26, 6, 'rgba(0,0,0,.3)');

// Fog texture (tileable soft blobs)
const fogTex = mk(192, 192), fogG = fogTex.getContext('2d');
for (let i = 0; i < 26; i++) {
  const x = rand() * 192, y = rand() * 192, r = 18 + rand() * 30;
  for (const ox of [-192, 0, 192]) for (const oy of [-192, 0, 192]) {
    const gr = fogG.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
    gr.addColorStop(0, 'rgba(150,175,215,.10)'); gr.addColorStop(1, 'rgba(150,175,215,0)');
    fogG.fillStyle = gr; fogG.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
  }
}

// ---------- Small actors ----------
function drawCat(sx, sy) {
  const x = Math.round(sx), y = Math.round(sy), tail = Math.round(Math.sin(time * 2.2) * 1.5);
  ell(b, x, y + 1, 5, 1, 'rgba(0,0,0,.4)');
  const body = '#15131f', rim = '#3d3a58';
  R(b, x - 4, y - 6, 8, 6, body); R(b, x - 3, y - 7, 6, 1, body); R(b, x - 4, y - 6, 1, 3, rim);
  R(b, x + 4, y - 3, 2, 2, body); R(b, x + 5 + (tail > 0 ? 1 : 0), y - 6 + tail, 1, 4, body); R(b, x + 5, y - 2, 1, 1, body);
  R(b, x - 3, y - 12, 7, 5, body); R(b, x - 3, y - 12, 1, 4, rim); R(b, x - 3, y - 14, 2, 2, body); R(b, x + 2, y - 14, 2, 2, body); R(b, x - 3, y - 14, 1, 1, rim);
  const blink = (time % 3.7) < 0.12;
  if (!blink) { R(b, x - 2, y - 10, 1, 2, '#f2d68c'); R(b, x + 1, y - 10, 1, 2, '#f2d68c'); } else { R(b, x - 2, y - 9, 1, 1, '#6b5a40'); R(b, x + 1, y - 9, 1, 1, '#6b5a40'); }
  R(b, x - 1, y - 8, 1, 1, '#d98a9a');
  R(b, x - 3, y - 1, 2, 1, rim); R(b, x + 1, y - 1, 2, 1, rim);
}
function drawBird(bd, sx, sy) {
  const x = Math.round(sx), y = Math.round(sy);
  if (bd.st === 'fly') {
    const up = Math.floor(time * 14) % 2;
    R(b, x - 1, y - 1, 3, 2, '#9aa8c4'); R(b, x + bd.face * 2, y - 1, 1, 1, C.gold[1]);
    R(b, x - 3, y - 2 - up, 2, 1, '#5d6b8a'); R(b, x + 2, y - 2 - up, 2, 1, '#5d6b8a');
    return;
  }
  ell(b, x, y, 2, 1, 'rgba(0,0,0,.3)');
  const pk = bd.peck > 0 ? 1 : 0, f = bd.face;
  R(b, x - 3, y - 4, 6, 4, C.out); R(b, x - 2, y - 5, 4, 1, C.out);
  R(b, x - 2, y - 4, 4, 3, '#8f9dbb'); R(b, x - 2, y - 2, 4, 1, '#c9d2e4'); R(b, x - 1 - f, y - 4, 2, 2, '#5d6b8a');
  R(b, x - 3 * f - (f < 0 ? 0 : 0), y - 3, 1, 1, '#5d6b8a');
  const hx = x + (f > 0 ? 1 : -3);
  R(b, hx, y - 6 + pk, 2, 2, '#aab6cf'); R(b, f > 0 ? hx + 2 : hx - 1, y - 5 + pk, 1, 1, C.gold[1]); R(b, f > 0 ? hx + 1 : hx, y - 6 + pk, 1, 1, '#05070d');
  R(b, x - 1, y, 1, 1, C.gold[0]); R(b, x + 1, y, 1, 1, C.gold[0]);
}
function bubble(sx, sy, text, keycap) {
  const tw = textW(text) + (keycap ? 13 : 0), w = tw + 8, h = 13;
  let x = Math.round(sx - w / 2); x = Math.max(2, Math.min(buf.width - w - 2, x));
  const y = Math.round(sy - h);
  R(b, x - 1, y - 1, w + 2, h + 2, C.out); R(b, x, y, w, h, '#0d1629'); R(b, x, y, w, 1, '#1e3a66');
  R(b, x, y, 1, h, C.gold[1]); R(b, x + w - 1, y, 1, h, C.gold[1]); R(b, x, y, w, 1, C.gold[1]); R(b, x, y + h - 1, w, 1, C.gold[0]);
  const tx = Math.max(x + 3, Math.min(x + w - 4, Math.round(sx)));
  R(b, tx - 2, y + h, 5, 1, C.gold[0]); R(b, tx - 1, y + h + 1, 3, 1, C.gold[0]); R(b, tx, y + h + 2, 1, 1, C.gold[0]);
  let cx = x + 4;
  if (keycap) { R(b, cx, y + 2, 9, 9, C.gold[1]); R(b, cx, y + 10, 9, 1, C.gold[0]); R(b, cx + 1, y + 3, 7, 6, '#f2d68c'); pixText(b, keycap, cx + 2, y + 3, '#0d1629'); cx += 13; }
  pixText(b, text, cx, y + 3, '#e8eef7', '#04060c');
}
function plaque(b, sx, sy, text, state) {
  const w = textW(text) + 8, h = 11, x = Math.round(sx - w / 2), y = Math.round(sy - h);
  const edge = state === 'found' ? C.gold[1] : state === 'near' ? C.sys[1] : '#2a3f66';
  R(b, x - 1, y - 1, w + 2, h + 2, C.out); R(b, x, y, w, h, 'rgba(10,17,33,.92)');
  R(b, x, y, w, 1, edge); R(b, x, y + h - 1, w, 1, edge); R(b, x, y, 1, h, edge); R(b, x + w - 1, y, 1, h, edge);
  pixText(b, text, x + 4, y + 2, state === 'found' ? C.gold[2] : state === 'near' ? '#e8eef7' : '#7d90ad', '#04060c');
}

// ---------- Animated overlays (shared by the overworld render loop and sprites.html) ----------
// One water tile's shimmer and foam. (x, y) is the tile, (sx, sy) where it lands on screen.
function waterAnim(b, x, y, sx, sy, time) {
  const h = hash(x, y);
  for (let i = 0; i < 2; i++) {
    const ly = sy + 6 + ((h >>> (i * 4)) % 6), lx = sx + 2 + Math.round((Math.sin(time * 1.3 + x * 0.8 + i * 2.5 + y) + 1) * 4);
    R(b, lx, ly, 4, 1, i ? 'rgba(77,163,255,.35)' : 'rgba(168,214,255,.18)');
  }
  if ((Math.floor(time * 2) + h) % 13 === 0) R(b, sx + h % 12 + 2, sy + 7 + (h >>> 5) % 6, 1, 1, WA[5]);
  if (!isWater(x, y - 1)) for (let i = 0; i < 16; i++) if ((i + Math.floor(time * 5) + x * 3) % 7 < 3) R(b, sx + i, sy + 5 + ((i + Math.floor(time * 2)) % 9 === 0 ? 1 : 0), 1, 1, 'rgba(191,224,255,.55)');
  if (!isWater(x, y + 1)) for (let i = 0; i < 16; i++) if ((i + Math.floor(time * 4) + x * 5) % 9 < 2) R(b, sx + i, sy + 12, 1, 1, 'rgba(191,224,255,.4)');
  if (!isWater(x - 1, y)) if ((Math.floor(time * 3) + y) % 4 < 2) R(b, sx + 3, sy + 4 + h % 8, 1, 2, 'rgba(191,224,255,.4)');
  if (!isWater(x + 1, y)) if ((Math.floor(time * 3) + y) % 4 >= 2) R(b, sx + 12, sy + 4 + h % 8, 1, 2, 'rgba(191,224,255,.4)');
}
// Fountain spout, droplets and ripples over the static fountain sprite at (fx, fy).
function fountainAnim(b, fx, fy, time) {
  for (let i = 0; i < 14; i++) {
    const ph = (time * 0.9 + i / 14) % 1, side = i % 2 ? 1 : -1, dist = ph * 15;
    const px = fx + 28 + side * dist, py = fy + 10 - Math.sin(ph * Math.PI) * 9 + ph * 22;
    R(b, px, py, 1, 1, ph < 0.6 ? WA[5] : WA[4]);
  }
  R(b, fx + 27, fy + 4 + Math.round(Math.sin(time * 8)), 2, 6, WA[5]);
  for (let i = 0; i < 3; i++) { const rr = ((time * 0.8 + i / 3) % 1) * 14; ell(b, fx + 28, fy + 34, Math.round(rr), Math.max(1, Math.round(rr * 0.3)), `rgba(168,214,255,${0.25 * (1 - rr / 14)})`); }
}

// ---------- Sprite sheet registration (sprites.html only) ----------
// Animated captures borrow the runtime's globals (b, buf, time, player, discovered),
// which sprites.html declares for this file before loading it.
if (GALLERY) {
  const add = (group, name, frames, opts) => SpriteSheet.add(group, name, Array.isArray(frames) ? frames : [frames], opts);
  const draw = (w, h, fn) => { const c = mk(w, h); fn(c.getContext('2d'), c); return c; };
  const at_ = (canvas, t) => { buf = canvas; b = canvas.getContext('2d'); time = t; return b; };
  const times = (n, step, from = 0) => Array.from({ length: n }, (_, i) => from + i * step);
  const MASK = m => ((m & 1 ? 'N' : '') + (m & 2 ? 'E' : '') + (m & 4 ? 'S' : '') + (m & 8 ? 'W' : '')) || 'island';
  const firstTile = test => { for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (test(x, y)) return [x, y]; return null; };
  const tileAt = ([x, y]) => crop(ground, x * T, y * T, T, T);

  // Tiles
  const TL = 'Overworld · Tiles';
  add(TL, 'Grass · 4 variants', SHEET.grass, { fps: 2, note: 'dithered base, tufts, clover and a dark patch' });
  for (const [key, label] of [['path', 'Cobble path'], ['water', 'Water']]) {
    const masks = Object.keys(SHEET[key]).map(Number).sort((a, c) => a - c);
    add(TL, `${label} · autotile`, masks.map(m => SHEET[key][m].c), { fps: 2, note: 'neighbour mask per frame: ' + masks.map(MASK).join(' · ') });
  }
  const shore = Object.entries(SHEET.water).find(([m]) => !(m & 1));
  if (shore) {
    const { x, y } = shore[1];
    add(TL, 'Water · north shore, animated', times(16, 1 / 8).map(t => draw(T, T, g => { g.drawImage(SHEET.water[shore[0]].c, 0, 0); waterAnim(g, x, y, 0, 0, t); })), { fps: 8, note: 'foam line and shimmer drawn over the baked tile each frame' });
  }
  const deep = SHEET.water[15];
  if (deep) add(TL, 'Water · deep, animated', times(16, 1 / 8).map(t => draw(T, T, g => { g.drawImage(deep.c, 0, 0); waterAnim(g, deep.x, deep.y, 0, 0, t); })), { fps: 8 });
  const fences = {};
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (map[idx(x, y)] !== FENCE) continue;
    const f = (xx, yy) => at(xx, yy) === FENCE, m = (f(x, y - 1) ? 1 : 0) | (f(x + 1, y) ? 2 : 0) | (f(x, y + 1) ? 4 : 0) | (f(x - 1, y) ? 8 : 0);
    if (!fences[m]) fences[m] = tileAt([x, y]);
  }
  const fm = Object.keys(fences).map(Number).sort((a, c) => a - c);
  add(TL, 'Picket fence · autotile', fm.map(m => fences[m]), { fps: 2, note: 'neighbour mask per frame: ' + fm.map(MASK).join(' · ') });
  const flowers = []; for (let y = 1; y < H - 1 && flowers.length < 4; y++) for (let x = 1; x < W - 1 && flowers.length < 4; x++) if (map[idx(x, y)] === FLOWER) flowers.push(tileAt([x, y]));
  add(TL, 'Flower patches', flowers, { fps: 2 });
  const reed = firstTile((x, y) => map[idx(x, y)] === GRASS && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isWater(x + dx, y + dy)) && hash(x, y) % 5 < 3);
  if (reed) add(TL, 'Reeds by the shore', tileAt(reed));
  { const fcx = Math.round((FOUNTAIN.x + 1.5) * T), fcy = Math.round((FOUNTAIN.y + 1.6) * T); add(TL, 'Plaza inlay ring', crop(ground, fcx - 52, fcy - 32, 104, 64)); }

  // Buildings
  const BL = 'Overworld · Buildings';
  player = { x: 0, y: 0 }; discovered = new Set();
  ZONES.forEach(z => {
    add(BL, `${z.name} · ${z.kind}`, [z.art.dark, z.art.lit], { fps: 1, note: 'frame 0 undiscovered (dark windows), frame 1 discovered (lit)' });
    const A = ART[z.kind];
    if (!A.anim) return;
    const pad = 14, cw = z.art.lit.width, ch = z.art.lit.height + pad;
    player = { x: z.ox + cw / 2 + 40, y: z.oy + ch + 12 };
    add(BL, `${z.name} · animated`, times(16, 0.125).map(t => {
      const c = mk(cw, ch), g = at_(c, t);
      g.drawImage(z.art.lit, 0, pad); A.anim(g, 0, pad, z);
      return c;
    }), { fps: 8, note: 'lit art plus the per-frame overlay (flames, eye, crystal, smoke anchors)' });
  });

  // Props
  const PR = 'Overworld · Props';
  add(PR, 'Trees · 3 round, 1 pine', treeSprites, { fps: 1, note: 'drawn y-sorted so the player can walk behind them' });
  add(PR, 'Rocks', rockSprites, { fps: 1 });
  add(PR, 'Bushes', bushSprites, { fps: 1 });
  add(PR, 'Lamp post', lampSprite);
  add(PR, 'Fountain · animated', times(16, 1 / 8).map(t => draw(fountain.width, fountain.height, g => { g.drawImage(fountain, 0, 0); fountainAnim(g, 0, 0, t); })), { fps: 8 });
  if (MUSHROOMS.length) add(PR, 'Glowing mushroom', crop(ground, MUSHROOMS[0].x - 8, MUSHROOMS[0].y - 8, T, T));
  add(PR, 'Fog texture · tileable', fogTex, { note: 'soft blobs, drawn at 55% over the world and scrolled' });

  // Critters
  const CR = 'Overworld · Critters';
  add(CR, 'Cat · idle (tail, blink)', [...times(12, 0.24, 0.3), 3.72].map(t => { const c = mk(16, 18); at_(c, t); drawCat(6, 16); return c; }), { fps: 6 });
  const bird = (st, face, peck, t, y) => { const c = mk(12, 10); at_(c, t); drawBird({ st, face, peck }, 6, y); return c; };
  add(CR, 'Bird · idle and peck', [bird('idle', 1, 0, 0, 8), bird('idle', 1, 1, 0, 8), bird('idle', -1, 0, 0, 8), bird('idle', -1, 1, 0, 8)], { fps: 3 });
  add(CR, 'Bird · flying', [bird('fly', 1, 0, 0, 5), bird('fly', 1, 0, 1 / 14, 5)], { fps: 7 });

  // Player
  const PL = 'Overworld · Player';
  ['down', 'up', 'left', 'right'].forEach(d => {
    add(PL, `Walk · ${d}`, HERO[d].walk, { fps: 9, note: '4-frame stride with arm swing' });
    add(PL, `Idle · ${d}`, HERO[d].idle, { fps: 2 });
  });

  // UI
  const UI = 'Overworld · UI';
  const plaqueFrame = (text, st) => { const w = textW(text) + 12, c = mk(w, 14); plaque(c.getContext('2d'), w / 2, 12, text, st); return c; };
  add(UI, 'Building plaque · idle, near, found', [plaqueFrame('+ RAID LOG', 'idle'), plaqueFrame('+ RAID LOG', 'near'), plaqueFrame('* RAID LOG', 'found')], { fps: 1 });
  const bubbleFrame = (text, key) => { const w = textW(text) + (key ? 13 : 0) + 14, c = mk(w, 20); at_(c, 0); bubble(w / 2, 15, text, key); return c; };
  add(UI, 'Prompt bubble · enter', bubbleFrame('ENTER RAID LOG', 'E'));
  add(UI, 'Speech bubble · cat', bubbleFrame('MRRP', null));
  const keys = Object.keys(GLYPHS), cols = 16;
  add(UI, `Bitmap font · 5x7, ${keys.length} glyphs`, draw(cols * 7 + 1, Math.ceil(keys.length / cols) * 9 + 1, g => {
    R(g, 0, 0, cols * 7 + 1, Math.ceil(keys.length / cols) * 9 + 1, '#0d1629');
    keys.forEach((k, i) => pixText(g, k, 1 + (i % cols) * 7, 1 + Math.floor(i / cols) * 9, '#e8eef7'));
  }), { note: keys.join(' ') });
  const ramps = [['grass', G], ['path', PV], ['water', WA], ['trees', TREE_TONES], ...Object.entries(C).filter(([, v]) => Array.isArray(v))];
  add(UI, 'Palette ramps', draw(6 * 6 + 2, ramps.length * 7 + 1, g => ramps.forEach(([, r], y) => r.forEach((col, x) => R(g, 1 + x * 6, 1 + y * 7, 5, 6, col)))), { note: 'rows: ' + ramps.map(([n]) => n).join(', ') });
}
