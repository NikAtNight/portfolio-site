// PROTOTYPE. Builds the static 3D world for world3d.js: two floating islands, eight
// landmarks (one per portfolio section), a bridge and a raid arena. No game logic here.
// Everything faces +Z because the camera never rotates.
window.W3D_buildWorld = T => {
  const scene = new T.Scene();
  const colliders = [];   // { x, z, r } circles and { x0, x1, z0, z1 } boxes
  const tick = [];        // (t, dt) => void, for things that move on their own
  const spots = [];       // places the player can interact with
  const MAIN = { x: 0, z: 0, r: 34 }, ARENA = { x: 0, z: -65, r: 18 };
  const regions = [
    { x: MAIN.x, z: MAIN.z, r: MAIN.r - 0.9 },
    { x0: -1.8, x1: 1.8, z0: -48.5, z1: -32 },
    { x: ARENA.x, z: ARENA.z, r: ARENA.r - 0.8 },
  ];

  // seeded random, so the town looks the same on every visit
  let seed = 1337;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + rnd() * (b - a);

  // ---------- materials and mesh helpers ----------
  const M = (color, o = {}) => new T.MeshStandardMaterial({ color, flatShading: true, roughness: 0.92, ...o });
  const glow = (color, k = 2.6, o = {}) => new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(k), ...o });
  const add = (p, geo, mat, x, y, z, o = {}) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    const lit = mat.isMeshStandardMaterial;
    m.castShadow = lit && o.cast !== false; m.receiveShadow = lit;
    p.add(m); return m;
  };
  // y is always the base of the shape, which keeps stacking readable
  const box = (p, w, h, d, mat, x, y, z, o) => add(p, new T.BoxGeometry(w, h, d), mat, x, y + h / 2, z, o);
  const cyl = (p, rt, rb, h, seg, mat, x, y, z, o) => add(p, new T.CylinderGeometry(rt, rb, h, seg), mat, x, y + h / 2, z, o);
  const cone = (p, r, h, seg, mat, x, y, z, o) => add(p, new T.ConeGeometry(r, h, seg), mat, x, y + h / 2, z, o);
  const ball = (p, r, mat, x, y, z, o) => add(p, new T.SphereGeometry(r, 12, 8), mat, x, y, z, o);
  // triangular prism. ridge 'z' shows the gable to the camera, ridge 'x' shows the roof slope
  const prism = (p, span, h, len, mat, x, y, z, ridge = 'x') => {
    const s = new T.Shape(); s.moveTo(-span / 2, 0); s.lineTo(span / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2);
    return add(p, g, mat, x, y, z, ridge === 'x' ? { ry: Math.PI / 2 } : {});
  };
  const group = (x, z) => { const g = new T.Group(); g.position.set(x, 0, z); scene.add(g); return g; };
  const wall = (x, z, w, d) => colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });

  const C = {
    stone: M(0x1b2440), stoneLt: M(0x56648f), stoneDk: M(0x131a30), wallA: M(0x2a3760), wallB: M(0x27335a), wallC: M(0x33305a),
    wood: M(0x3a2c2a), woodLt: M(0x5a4232), dark: M(0x0b101e), paper: M(0xb9b08f),
    roofRed: M(0x7a3b4a), roofTeal: M(0x1f6a7a), roofBlue: M(0x3a6a8c), roofPurple: M(0x5b3a78), roofAmber: M(0x8a5a34),
    warm: glow(0xffc46b, 2.2), warmDim: glow(0xffb45a, 1.2), sys: glow(0x4da3ff, 2.8), sysDim: glow(0x4da3ff, 1.1), gold: glow(0xd9b45b, 2.6), red: glow(0xff4d5e, 2.8), flame: glow(0xff8a3a, 3.2),
  };
  const window_ = (p, x, y, z, w, h, mat = C.warm) => { box(p, w + 0.24, h + 0.24, 0.1, C.dark, x, y - 0.12, z, { cast: false }); box(p, w, h, 0.06, mat, x, y, z + 0.06); box(p, 0.07, h, 0.08, C.dark, x, y, z + 0.07, { cast: false }); };
  const door = (p, x, y, z, w, h) => { box(p, w + 0.36, h + 0.2, 0.12, C.stoneLt, x, y, z, { cast: false }); box(p, w, h, 0.1, C.dark, x, y, z + 0.06, { cast: false }); box(p, w * 0.7, 0.09, 0.08, C.warm, x, y + h + 0.3, z + 0.06); };
  const lantern = (p, x, y, z) => { box(p, 0.3, 0.1, 0.3, C.dark, x, y + 0.36, z, { cast: false }); return ball(p, 0.19, C.warm, x, y + 0.18, z); };

  // ---------- sky, void, lights ----------
  scene.background = new T.Color(0x05070f);
  scene.fog = new T.FogExp2(0x070c1a, 0.0105);
  scene.add(new T.HemisphereLight(0x6f8fe0, 0x0b0f1e, 1.5));
  const sun = new T.DirectionalLight(0xa9c0ff, 1.9);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 140 }); sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);

  const starGeo = new T.BufferGeometry(), sp = [];
  for (let i = 0; i < 1400; i++) {
    // a shell far out, plus a band below the islands so the void isn't empty when looking down
    const a = rnd() * Math.PI * 2, low = i % 3 === 0, r = low ? rr(60, 240) : rr(240, 300), y = low ? rr(-90, -14) : rr(-40, 260);
    sp.push(Math.cos(a) * r, y, Math.sin(a) * r - 30);
  }
  starGeo.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
  scene.add(new T.Points(starGeo, new T.PointsMaterial({ color: new T.Color(0x9fc4ff).multiplyScalar(1.6), size: 1.7, sizeAttenuation: false, fog: false })));
  ball(scene, 16, new T.MeshBasicMaterial({ color: new T.Color(0xcfe0ff).multiplyScalar(1.5), fog: false }), -110, 62, -330);
  ball(scene, 14.6, new T.MeshBasicMaterial({ color: 0x05070f, fog: false }), -102, 66, -322);   // bite out of the moon: a crescent
  const grid = new T.GridHelper(900, 90, 0x2f5fa8, 0x16305e);
  grid.position.y = -38; grid.material.transparent = true; grid.material.opacity = 0.55; grid.material.fog = false;
  scene.add(grid);

  // drifting motes
  const moteN = 170, moteGeo = new T.BufferGeometry(), mp = new Float32Array(moteN * 3), mseed = [];
  for (let i = 0; i < moteN; i++) { const far = i % 3 === 0; mseed.push([rr(-40, 40), rr(0.4, 9), far ? rr(-84, -44) : rr(-36, 36), rr(0.2, 0.7), rnd() * 6.28]); }
  moteGeo.setAttribute('position', new T.BufferAttribute(mp, 3));
  scene.add(new T.Points(moteGeo, new T.PointsMaterial({ color: new T.Color(0x7fc0ff).multiplyScalar(2.2), size: 0.11, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false })));
  tick.push(t => {
    for (let i = 0; i < moteN; i++) { const s = mseed[i]; mp[i * 3] = s[0] + Math.sin(t * 0.3 + s[4]) * 1.2; mp[i * 3 + 1] = (s[1] + t * s[3] * 0.5) % 10 + 0.3; mp[i * 3 + 2] = s[2] + Math.cos(t * 0.24 + s[4]) * 1.2; }
    moteGeo.attributes.position.needsUpdate = true;
  });

  // ---------- island bodies ----------
  const rock = M(0x18203a), rockDk = M(0x0f1528);
  const island = (c, rim) => {
    const side = new T.CylinderGeometry(c.r, c.r * 0.62, 9, 40, 3, true), pos = side.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 4.4) continue;   // keep the top ring round so it meets the ground disc
      const k = 1 + (Math.sin(pos.getX(i) * 1.7) * Math.cos(pos.getZ(i) * 1.3)) * 0.09 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.03;
      pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k);
    }
    add(scene, side, rock, c.x, -4.5, c.z, { cast: false });
    add(scene, new T.ConeGeometry(c.r * 0.66, 15, 14), rockDk, c.x, -16, c.z, { rx: Math.PI, cast: false });
    add(scene, new T.TorusGeometry(c.r + 0.25, 0.07, 6, 96), glow(rim, 2.2), c.x, -0.7, c.z, { rx: Math.PI / 2 });
  };
  island(MAIN, 0x4da3ff); island(ARENA, 0xff4d5e);
  // loose rocks floating in the void
  for (let i = 0; i < 14; i++) {
    const a = rnd() * 6.28, r = rr(44, 80), s = rr(1.2, 4.5), y0 = rr(-22, -3);
    const m = add(scene, new T.DodecahedronGeometry(s, 0), i % 2 ? rock : rockDk, Math.cos(a) * r, y0, Math.sin(a) * r - 25, { cast: false });
    m.scale.y = rr(0.5, 0.9); m.rotation.set(rnd(), rnd(), rnd());
    const ph = rnd() * 6.28;
    if (i % 3 === 0) add(m, new T.OctahedronGeometry(s * 0.28), C.sysDim, 0, s * 0.9, 0);
    tick.push(t => { m.position.y = y0 + Math.sin(t * 0.35 + ph) * 0.7; m.rotation.y += 0.0009; });
  }

  // ---------- painted ground ----------
  // paths run from the plaza to every door; painting them keeps them aligned with the landmarks
  const PATHS = [
    [[0, -6], [0, -29]], [[0, -13], [-15.5, -13], [-15.5, -15.6]], [[0, -13], [15.5, -13], [15.5, -15.8]],
    [[-6, 0], [-25, 0], [-25, -3.6]], [[6, 0], [25, 0], [25, -3.8]],
    [[0, 6], [0, 24.4], [15.4, 24.4]], [[0, 17], [-13, 17], [-13, 15.2]],
  ];
  const LAMPS = [[-2.6, -19], [2.6, -24.5], [-9, -11.2], [9, -11.2], [-13, 1.9], [13, 1.9], [-2.6, 12], [-7, 18.8], [7, 22.5]];
  const paint = (size, c, fn) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d'), k = size / (c.r * 2);
    x.setTransform(k, 0, 0, k, size / 2, size / 2);   // draw in world units, origin at the island centre
    fn(x);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    return tex;
  };
  const line = (x, pts, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); };
  const ring = (x, cx, cz, r, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.arc(cx, cz, r, 0, 6.2832); x.stroke(); };
  const pool = (x, cx, cz, r, rgb, a) => { const g = x.createRadialGradient(cx, cz, 0, cx, cz, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.fillRect(cx - r, cz - r, r * 2, r * 2); };
  const along = (pts, step, fn) => pts.slice(1).forEach(([bx, bz], i) => { const [ax, az] = pts[i], n = Math.hypot(bx - ax, bz - az); for (let d = 0; d <= n; d += step) fn(ax + (bx - ax) * d / n, az + (bz - az) * d / n, (bx - ax) / n, (bz - az) / n); });

  const mainMap = paint(2048, MAIN, x => {
    const g = x.createRadialGradient(0, 0, 4, 0, 0, 34); g.addColorStop(0, '#15263c'); g.addColorStop(0.75, '#101d31'); g.addColorStop(1, '#0a1220');
    x.fillStyle = g; x.fillRect(-34, -34, 68, 68);
    for (let i = 0; i < 9000; i++) { x.fillStyle = ['#16304a', '#0c1626', '#1a3a52', '#12243a', '#1d4458'][i % 5]; x.globalAlpha = rr(0.25, 0.8); const s = rr(0.08, 0.3); x.fillRect(rr(-34, 34), rr(-34, 34), s, s * rr(0.6, 2.4)); }
    x.globalAlpha = 1;
    x.strokeStyle = 'rgba(77,163,255,.045)'; x.lineWidth = 0.05;
    for (let i = -34; i <= 34; i += 2) { x.beginPath(); x.moveTo(i, -34); x.lineTo(i, 34); x.moveTo(-34, i); x.lineTo(34, i); x.stroke(); }
    PATHS.forEach(p => line(x, p, 3.5, '#1a2340'));
    PATHS.forEach(p => line(x, p, 3, '#27325a'));
    PATHS.forEach(p => along(p, 0.22, (px, pz) => { x.fillStyle = ['#323f6c', '#1f2848', '#2e3962', '#3a487a'][Math.floor(rnd() * 4)]; x.globalAlpha = 0.75; const s = rr(0.22, 0.46); x.fillRect(px + rr(-1.3, 1.3), pz + rr(-1.3, 1.3), s, s * 0.8); }));
    x.globalAlpha = 1;
    x.fillStyle = '#243058'; x.beginPath(); x.arc(0, 0, 7.4, 0, 6.2832); x.fill();
    for (let r = 7.4; r > 1; r -= 1.25) ring(x, 0, 0, r, 0.09, '#141c38');
    for (let a = 0; a < 24; a++) line(x, [[Math.cos(a * 0.2618) * 2.4, Math.sin(a * 0.2618) * 2.4], [Math.cos(a * 0.2618) * 7.4, Math.sin(a * 0.2618) * 7.4]], 0.07, '#141c38');
    ring(x, 0, 0, 7.4, 0.3, '#3a487a');
  });
  const mainGlow = paint(1024, MAIN, x => {
    x.fillStyle = '#000'; x.fillRect(-34, -34, 68, 68);
    ring(x, 0, 0, 6.5, 0.09, '#4da3ff'); ring(x, 0, 0, 5.1, 0.05, '#2b6fc4');
    for (let a = 0; a < 16; a++) { const c = Math.cos(a * 0.3927), s = Math.sin(a * 0.3927); line(x, [[c * 5.4, s * 5.4], [c * 6.2, s * 6.2]], a % 4 ? 0.06 : 0.16, a % 4 ? '#4da3ff' : '#d9b45b'); }
    PATHS.forEach(p => along(p, 2.2, (px, pz, dx, dz) => { x.fillStyle = '#2f78d6'; [-1.72, 1.72].forEach(o => x.fillRect(px - dz * o - 0.06, pz + dx * o - 0.06, 0.12, 0.12)); }));
    LAMPS.forEach(([lx, lz]) => pool(x, lx, lz, 4.6, '255,168,86', 0.34));
    [[-25, -3.4], [-15.5, -15.2], [15.5, -15.4], [25, -4.4], [15.4, 23.2], [-13, 15]].forEach(([dx, dz]) => pool(x, dx, dz, 3.4, '255,190,110', 0.26));
    pool(x, 0, -28, 6.5, '255,70,90', 0.3);
  });
  const mainGround = add(scene, new T.CircleGeometry(MAIN.r, 72), new T.MeshStandardMaterial({ map: mainMap, emissiveMap: mainGlow, emissive: 0xffffff, emissiveIntensity: 1.7, roughness: 0.95 }), 0, 0, 0, { rx: -Math.PI / 2 });
  mainGround.castShadow = false;

  // ---------- 1. Status: the system core, in the middle of the plaza ----------
  {
    const g = group(0, 0);
    cyl(g, 3.6, 3.9, 0.3, 12, C.stone, 0, 0, 0); cyl(g, 2.6, 2.9, 0.3, 12, C.wallA, 0, 0.3, 0); cyl(g, 1.2, 1.5, 0.9, 8, C.stoneLt, 0, 0.6, 0);
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.7854, x = Math.cos(a) * 3.1, z = Math.sin(a) * 3.1; cyl(g, 0.22, 0.3, 2.6, 6, C.stoneLt, x, 0.3, z); add(g, new T.OctahedronGeometry(0.26), C.sys, x, 3.25, z); }
    const core = add(g, new T.OctahedronGeometry(1.05), glow(0x4da3ff, 3.2), 0, 3.6, 0); core.scale.y = 1.5;
    const r1 = add(g, new T.TorusGeometry(1.9, 0.045, 6, 48), C.gold, 0, 3.6, 0), r2 = add(g, new T.TorusGeometry(2.3, 0.03, 6, 48), C.sys, 0, 3.6, 0);
    const light = new T.PointLight(0x4da3ff, 60, 22, 1.8); light.position.set(0, 4, 0); g.add(light);
    tick.push(t => { core.rotation.y = t * 0.6; core.position.y = 3.6 + Math.sin(t * 1.3) * 0.22; r1.rotation.set(1.2 + Math.sin(t * 0.5) * 0.3, t * 0.7, 0); r2.rotation.set(t * 0.45, 0.4, t * 0.3); light.intensity = 54 + Math.sin(t * 2.1) * 8; });
    colliders.push({ x: 0, z: 0, r: 2.9 });
    spots.push({ id: 'status', kind: 'zone', verb: 'Read', x: 0, z: 0, r: 5.4, label: [0, 6.6, 0] });
  }

  // ---------- 2. About: a house ----------
  {
    const X = -25, Z = -8, g = group(X, Z);
    box(g, 7.6, 0.3, 6.6, C.stone, 0, 0, 0); box(g, 7, 3.6, 6, C.wallA, 0, 0.3, 0);
    prism(g, 7, 2.9, 8, C.roofRed, 0, 3.9, 0, 'x');
    box(g, 0.9, 2.3, 0.9, C.stoneLt, 2.2, 4.4, -1.2); box(g, 1.1, 0.2, 1.1, C.stone, 2.2, 6.7, -1.2);
    door(g, 0, 0.3, 3.02, 1.3, 2.2); window_(g, -2.2, 1.6, 3.02, 1.1, 1.2); window_(g, 2.2, 1.6, 3.02, 1.1, 1.2);
    box(g, 2.2, 0.16, 1, C.stoneLt, 0, 0, 3.6, { cast: false });
    lantern(g, 1.15, 2.5, 3.2);
    for (let i = 0; i < 6; i++) box(g, 0.12, 0.8, 0.12, C.woodLt, -4.6, 0, 3.4 - i * 1.2);
    box(g, 0.08, 0.1, 6.2, C.woodLt, -4.6, 0.55, 0.4, { cast: false });
    wall(X, Z, 7.6, 6.6);
    spots.push({ id: 'about', kind: 'zone', verb: 'Enter', x: X, z: Z + 4.7, r: 2.5, label: [X, 8, Z] });
  }

  // ---------- 3. Career Log: a hall with a tiered tower, one band per level ----------
  {
    const X = -15.5, Z = -21, g = group(X, Z);
    box(g, 11.8, 0.3, 8.6, C.stone, 0, 0, 0); box(g, 11, 0.3, 8, C.stoneLt, 0, 0.3, 0);
    box(g, 10, 4.4, 6, C.wallB, 0, 0.6, -0.6);
    [-4.4, -1.7, 1.7, 4.4].forEach(x => { cyl(g, 0.34, 0.4, 4, 8, C.stoneLt, x, 0.6, 3.3); box(g, 0.95, 0.2, 0.95, C.stoneLt, x, 4.6, 3.3); });
    box(g, 10.8, 0.5, 8, C.stoneLt, 0, 4.8, 0);
    prism(g, 10.8, 2.3, 8, C.roofTeal, 0, 5.3, 0, 'z');
    add(g, new T.OctahedronGeometry(0.42), C.gold, 0, 6.2, 4.06);
    door(g, 0, 0.6, 2.46, 1.7, 2.9);
    [-3.05, 3.05].forEach((x, i) => box(g, 0.9, 2.7, 0.08, i ? C.sysDim : glow(0xd9b45b, 1.1), x, 1.5, 2.46));
    const tiers = [[3.6, 4.2, 5.2], [2.8, 3.2, 9.4], [2, 2.6, 12.6]];
    tiers.forEach(([w, h, y]) => { box(g, w, h, w, C.wallB, 0, y, -2.2); box(g, w + 0.3, 0.16, w + 0.3, C.sys, 0, y + h - 0.5, -2.2); window_(g, 0, y + h * 0.3, -2.2 + w / 2 + 0.02, 0.6, 0.9); });
    cone(g, 1.7, 2.8, 4, C.roofTeal, 0, 15.2, -2.2, { ry: 0.7854 });
    wall(X, Z, 11.8, 8.6);
    spots.push({ id: 'career', kind: 'zone', verb: 'Enter', x: X, z: Z + 5.7, r: 2.6, label: [X, 9.2, Z + 3] });
  }

  // ---------- 4. The Premise: a domed library with one big idea floating over it ----------
  {
    const X = 15.5, Z = -21, g = group(X, Z);
    box(g, 10, 0.4, 7.8, C.stone, 0, 0, 0); box(g, 9, 5.2, 6.4, C.wallA, 0, 0.4, 0); box(g, 9.6, 0.4, 7, C.stoneLt, 0, 5.6, 0);
    add(g, new T.SphereGeometry(3.1, 14, 6, 0, 6.2832, 0, 1.5708), C.roofBlue, 0, 6, 0);
    cyl(g, 0.5, 0.6, 0.7, 8, C.stoneLt, 0, 8.9, 0);
    const idea = ball(g, 0.5, glow(0xffe08a, 3.4), 0, 10.6, 0), halo = add(g, new T.TorusGeometry(0.95, 0.03, 6, 32), C.gold, 0, 10.6, 0);
    tick.push(t => { idea.position.y = 10.6 + Math.sin(t * 1.1) * 0.25; halo.position.y = idea.position.y; halo.rotation.set(t * 0.9, t * 0.6, 0); });
    door(g, 0, 0.4, 3.22, 1.5, 2.5);
    add(g, new T.CircleGeometry(1.05, 20), C.sys, 0, 4.4, 3.24); add(g, new T.TorusGeometry(1.12, 0.1, 6, 24), C.stoneLt, 0, 4.4, 3.24);
    [-3.1, 3.1].forEach(x => { window_(g, x, 1.4, 3.22, 0.9, 2.8); box(g, 0.5, 5.2, 0.3, C.stoneLt, x * 0.58, 0.4, 3.3); box(g, 0.5, 5.2, 0.3, C.stoneLt, x * 1.4, 0.4, 3.3); });
    wall(X, Z, 10, 7.8);
    spots.push({ id: 'premise', kind: 'zone', verb: 'Enter', x: X, z: Z + 5.5, r: 2.6, label: [X, 12.2, Z] });
  }

  // ---------- 5. Argus: a watchtower with a sweeping beam and too many eyes ----------
  {
    const X = 25, Z = -8, g = group(X, Z);
    cyl(g, 3.1, 3.3, 0.5, 8, C.stone, 0, 0, 0); cyl(g, 1.9, 2.5, 9, 8, C.wallB, 0, 0.5, 0);
    cyl(g, 2.7, 2.2, 0.6, 8, C.stoneLt, 0, 9.5, 0);
    for (let i = 0; i < 8; i++) { const a = i * 0.7854 + 0.3927; box(g, 0.7, 0.6, 0.5, C.stoneLt, Math.cos(a) * 2.45, 10.1, Math.sin(a) * 2.45, { ry: -a + 1.5708 }); }
    cyl(g, 1.5, 1.6, 1.8, 8, C.wallA, 0, 10.1, 0); cone(g, 2.2, 2.6, 8, C.roofPurple, 0, 11.9, 0);
    door(g, 0, 0.5, 2.36, 1.2, 2.1);
    const eye = ball(g, 0.62, glow(0xffd76a, 3.4), 0, 11, 1.5); ball(g, 0.24, C.dark, 0, 11, 2.06);
    const eyes = [];
    for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.36, y = 2.4 + i * 0.72, r = 2.42 - (y - 0.5) * 0.066; eyes.push(ball(g, 0.14, glow(0xffd76a, 2.4), Math.sin(a) * r, y, Math.cos(a) * r)); }
    const beamPivot = new T.Group(); beamPivot.position.set(0, 11, 0); g.add(beamPivot);
    const beamGeo = new T.ConeGeometry(2.6, 20, 20, 1, true); beamGeo.translate(0, -10, 0);
    const beam = new T.Mesh(beamGeo, new T.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.03, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
    beam.rotation.x = -1.18; beamPivot.add(beam);
    tick.push(t => { beamPivot.rotation.y = t * 0.45; eye.scale.setScalar(1 + Math.sin(t * 2.4) * 0.06); eyes.forEach((e, i) => { e.visible = Math.sin(t * 1.7 + i * 2.3) > -0.82; }); });
    colliders.push({ x: X, z: Z, r: 3.3 });
    spots.push({ id: 'argus', kind: 'zone', verb: 'Enter', x: X, z: Z + 4.2, r: 2.5, label: [X, 15.2, Z] });
  }

  // ---------- 6. Side Quests: a notice board ----------
  {
    const X = -13, Z = 13, g = group(X, Z);
    box(g, 6.4, 0.22, 2.6, C.stone, 0, 0, 0);
    [-2.5, 2.5].forEach(x => cyl(g, 0.18, 0.22, 3.6, 6, C.woodLt, x, 0.22, 0));
    box(g, 5, 2.5, 0.24, C.wood, 0, 1, 0); prism(g, 1.8, 0.8, 6, C.roofRed, 0, 3.7, 0, 'x');
    const notes = [[-1.8, 2.5, 0.7, 0.9, 0.06, C.paper], [-0.8, 2.2, 0.6, 0.7, -0.08, C.gold], [0.2, 2.6, 0.8, 0.6, 0.04, C.paper], [1.4, 2.4, 0.7, 0.9, -0.05, C.paper], [-1.5, 1.4, 0.8, 0.6, -0.04, C.paper], [-0.3, 1.3, 0.6, 0.8, 0.07, C.sysDim], [0.9, 1.4, 0.7, 0.7, 0.03, C.paper], [1.9, 1.4, 0.5, 0.6, -0.07, C.warmDim]];
    notes.forEach(([x, y, w, h, rz, m]) => box(g, w, h, 0.05, m, x, y - h / 2, 0.15, { rz, cast: false }));
    const bang = new T.Group(); bang.position.set(0, 5.4, 0); g.add(bang);
    box(bang, 0.3, 0.95, 0.3, C.gold, 0, 0.45, 0); box(bang, 0.3, 0.3, 0.3, C.gold, 0, 0, 0);
    tick.push(t => { bang.position.y = 5.2 + Math.sin(t * 2) * 0.2; bang.rotation.y = t * 1.4; });
    box(g, 1.1, 0.9, 0.9, C.woodLt, 3.9, 0, -0.2, { ry: 0.3 }); box(g, 0.8, 0.7, 0.8, C.wood, 4.2, 0.9, -0.1, { ry: -0.2 }); lantern(g, 3.5, 1.1, 0.4);
    wall(X, Z, 5.6, 1.2); wall(X + 4, Z - 0.2, 1.6, 1.4);
    spots.push({ id: 'side-quests', kind: 'zone', verb: 'Read', x: X, z: Z + 2.3, r: 2.8, label: [X, 6.6, Z] });
  }

  // ---------- 7. Guild: a two-storey tavern ----------
  {
    const X = 17, Z = 19, g = group(X, Z);
    box(g, 8.6, 0.3, 6.6, C.stone, 0, 0, 0); box(g, 8, 3.4, 6, C.wallC, 0, 0.3, 0); box(g, 8.7, 2.3, 6.5, M(0x3d3a6c), 0, 3.7, 0);
    [-4.3, -1.45, 1.45, 4.3].forEach(x => box(g, 0.22, 2.3, 0.2, C.wood, x, 3.7, 3.28));
    box(g, 8.9, 0.22, 0.24, C.wood, 0, 3.6, 3.28);
    prism(g, 7.4, 2.9, 9.6, C.roofAmber, 0, 6, 0, 'x');
    door(g, -1.6, 0.3, 3.02, 1.4, 2.3);
    window_(g, 1.7, 1.4, 3.02, 2, 1.3); window_(g, -2.85, 4.3, 3.28, 1.1, 1.1); window_(g, 0, 4.3, 3.28, 1.1, 1.1); window_(g, 2.85, 4.3, 3.28, 1.1, 1.1);
    box(g, 0.12, 0.12, 1.5, C.wood, -3.3, 3.2, 3.7, { cast: false });
    const sign = box(g, 1.3, 1, 0.12, C.wood, -3.3, 2, 4.3); add(sign, new T.OctahedronGeometry(0.3), C.gold, 0, 0, 0.14);
    tick.push(t => { sign.rotation.z = Math.sin(t * 1.3) * 0.06; });
    cyl(g, 0.5, 0.5, 1, 8, C.woodLt, 3.5, 0, 3.7); cyl(g, 0.5, 0.5, 1, 8, C.woodLt, 2.6, 0, 3.9); cyl(g, 0.45, 0.45, 0.9, 8, C.wood, 3.1, 1, 3.75);
    lantern(g, -0.5, 2.6, 3.2);
    wall(X, Z, 8.7, 6.6); wall(X + 3.1, Z + 3.8, 2, 1.2);
    spots.push({ id: 'guild', kind: 'zone', verb: 'Enter', x: X - 1.6, z: Z + 4.7, r: 2.5, label: [X, 9.8, Z] });
  }

  // ---------- 8. Raid Log: the gate, the lectern, the bridge, the arena ----------
  const portalTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 64;
    const x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
    x.fillStyle = gr; x.fillRect(0, 0, 8, 64);
    return new T.CanvasTexture(cv);
  })();
  const brazier = (g, x, z) => {
    cyl(g, 0.16, 0.3, 1.5, 6, C.stoneDk, x, 0, z); cyl(g, 0.6, 0.3, 0.4, 6, C.stoneDk, x, 1.5, z);
    const f = cone(g, 0.4, 1.1, 5, C.flame, x, 1.8, z), ph = rnd() * 6;
    const l = new T.PointLight(0xff7a3a, 22, 13, 1.8); l.position.set(x, 2.6, z); g.add(l);
    tick.push(t => { const k = 1 + Math.sin(t * 11 + ph) * 0.12 + Math.sin(t * 23 + ph) * 0.07; f.scale.set(k, 1 + Math.sin(t * 9 + ph) * 0.2, k); f.rotation.y = t * 3; l.intensity = 20 * k; });
    colliders.push({ x: g.position.x + x, z: g.position.z + z, r: 0.55 });
  };
  {
    const X = 0, Z = -30.5, g = group(X, Z), dk = M(0x2a2238), dk2 = M(0x3a2c48);
    [-3.3, 3.3].forEach(x => { box(g, 2.2, 7.4, 2.2, dk, x, 0, 0); box(g, 2.6, 0.5, 2.6, dk2, x, 0, 0); box(g, 2.5, 0.4, 2.5, dk2, x, 7, 0); cone(g, 0.6, 2.2, 4, dk2, x * 1.12, 9, 0, { rz: -Math.sign(x) * 0.35 }); });
    box(g, 9, 1.7, 2.3, dk, 0, 7.4, 0); box(g, 9.5, 0.35, 2.7, dk2, 0, 9.1, 0);
    const gem = add(g, new T.OctahedronGeometry(0.62), C.red, 0, 8.25, 1.25);
    const veil = new T.Mesh(new T.PlaneGeometry(4.4, 7.4), new T.MeshBasicMaterial({ map: portalTex, color: new T.Color(0xff3d55).multiplyScalar(1.6), transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    veil.position.set(0, 3.7, 0); g.add(veil);
    tick.push(t => { veil.material.opacity = 0.42 + Math.sin(t * 2.2) * 0.12; gem.rotation.y = t; });
    brazier(g, -5.3, 2.4); brazier(g, 5.3, 2.4);
    wall(X - 3.3, Z, 2.6, 2.6); wall(X + 3.3, Z, 2.6, 2.6);
    // lectern holding the written Raid Log, for anyone who would rather read than fight
    box(g, 0.9, 0.2, 0.9, C.stoneLt, -6.2, 0, 4.4); box(g, 0.3, 1.1, 0.3, C.wood, -6.2, 0.2, 4.4);
    box(g, 1.2, 0.12, 0.9, C.wood, -6.2, 1.4, 4.4, { rx: 0.5 }); box(g, 0.95, 0.05, 0.65, glow(0xffe6b0, 1.6), -6.2, 1.5, 4.45, { rx: 0.5 });
    colliders.push({ x: X - 6.2, z: Z + 4.4, r: 0.7 });
    spots.push({ id: 'raid-log', kind: 'zone', verb: 'Read', x: X - 6.2, z: Z + 5.4, r: 2.3, label: [X, 11.2, Z] });
  }
  // bridge
  for (let i = 0; i < 16; i++) box(scene, 4.4, 0.22, 0.74, i % 2 ? C.wood : C.woodLt, 0, -0.2, -33.6 - i * 0.9);
  [-2.25, 2.25].forEach(x => { box(scene, 0.07, 0.07, 14.4, glow(0xff4d5e, 1.6), x, 1, -40.5); for (let z = -34; z >= -47; z -= 3.25) cyl(scene, 0.09, 0.11, 1.1, 5, C.stoneDk, x, 0, z); });

  // arena
  const bossSlots = [];
  {
    const cx = ARENA.x, cz = ARENA.z;
    const map = paint(1024, ARENA, x => {
      x.fillStyle = '#19121f'; x.fillRect(-18, -18, 36, 36);
      for (let i = 0; i < 3600; i++) { x.fillStyle = ['#241828', '#120c18', '#2c1c2e', '#1f1526'][i % 4]; x.globalAlpha = rr(0.3, 0.9); const s = rr(0.1, 0.45); x.fillRect(rr(-18, 18), rr(-18, 18), s, s * rr(0.6, 1.8)); }
      x.globalAlpha = 1;
      x.fillStyle = '#231728'; x.beginPath(); x.arc(0, 0, 8.2, 0, 6.2832); x.fill();
      for (let r = 8.2; r > 1; r -= 1.6) ring(x, 0, 0, r, 0.1, '#120b16');
      line(x, [[0, 18], [0, 8]], 3.4, '#231728');
    });
    const glowMap = paint(1024, ARENA, x => {
      x.fillStyle = '#000'; x.fillRect(-18, -18, 36, 36);
      ring(x, 0, 0, 7.6, 0.1, '#ff4d5e'); ring(x, 0, 0, 6.9, 0.05, '#a52c40'); ring(x, 0, 0, 2.2, 0.07, '#ff4d5e');
      for (let i = 0; i < 9; i++) { const a = Math.PI - i * Math.PI / 8, c = Math.cos(a), s = -Math.sin(a); line(x, [[c * 2.2, s * 2.2], [c * 7.6, s * 7.6]], 0.05, '#8a2436'); }
      pool(x, 0, 0, 9, '255,70,90', 0.16);
    });
    const ground = add(scene, new T.CircleGeometry(ARENA.r, 56), new T.MeshStandardMaterial({ map, emissiveMap: glowMap, emissive: 0xffffff, emissiveIntensity: 1.7, roughness: 0.95 }), cx, 0, cz, { rx: -Math.PI / 2 });
    ground.castShadow = false;
    const g = group(cx, cz), spike = M(0x3a2040), spikeLt = M(0x5a2c58);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI - i * Math.PI / 8, x = Math.cos(a) * 13.4, z = -Math.sin(a) * 13.4;
      bossSlots.push({ x: cx + x, z: cz + z });
      cyl(g, 2, 2.3, 0.36, 10, C.stoneDk, x, 0, z);
      colliders.push({ x: cx + x, z: cz + z, r: 2.1 });
    }
    for (let i = 0; i < 15; i++) {
      const a = Math.PI * 1.08 - i * Math.PI * 1.16 / 14, r = 16.7 + (i % 2) * 0.5, h = rr(3, 7.5);
      cone(g, rr(0.6, 1.1), h, 5, i % 3 ? spike : spikeLt, Math.cos(a) * r, 0, -Math.sin(a) * r, { rz: rr(-0.12, 0.12), rx: rr(-0.1, 0.1) });
    }
    brazier(g, -8, 13.8); brazier(g, 8, 13.8);
    const l = new T.PointLight(0xff4d5e, 46, 30, 1.7); l.position.set(0, 7, 0); g.add(l);
  }

  // ---------- trees, rocks, lamps ----------
  const nearPath = (x, z, d) => PATHS.some(p => p.slice(1).some(([bx, bz], i) => {
    const [ax, az] = p[i], l2 = (bx - ax) ** 2 + (bz - az) ** 2, k = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / l2));
    return Math.hypot(x - ax - (bx - ax) * k, z - az - (bz - az) * k) < d;
  }));
  const blocked = (x, z, pad) => colliders.some(c => c.r ? Math.hypot(x - c.x, z - c.z) < c.r + pad : x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad);
  const trees = [];
  const free = (x, z, path, pad) => !nearPath(x, z, path) && !blocked(x, z, pad);
  for (let n = 0; n < 1500 && trees.length < 26; n++) {
    const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 31.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (r < 10 || !free(x, z, 4.2, 2.2) || trees.some(t => Math.hypot(t.x - x, t.z - z) < 2.8)) continue;
    // the camera looks north, so anything tall south of where people walk hides the player
    if (z > -5 && !(r > 29.5 && z < 12)) continue;
    if (spots.some(s => Math.abs(x - s.x) < 7 && z > s.z - 1 && z < s.z + 10)) continue;
    trees.push({ x, z, s: rr(0.8, 1.3), ry: rnd() * 6.28 });
  }
  const parts = [
    [new T.CylinderGeometry(0.16, 0.26, 1.3, 6).translate(0, 0.65, 0), M(0x2a2233)],
    [new T.ConeGeometry(1.5, 2.3, 7).translate(0, 2, 0), M(0x163a4c)],
    [new T.ConeGeometry(1.12, 2, 7).translate(0, 3.2, 0), M(0x1b4c5c)],
    [new T.ConeGeometry(0.72, 1.6, 7).translate(0, 4.3, 0), M(0x24656e)],
  ];
  const mtx = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0);
  parts.forEach(([geo, mat]) => {
    const im = new T.InstancedMesh(geo, mat, trees.length); im.castShadow = im.receiveShadow = true;
    trees.forEach((t, i) => im.setMatrixAt(i, mtx.compose(new T.Vector3(t.x, 0, t.z), q.setFromAxisAngle(up, t.ry), new T.Vector3(t.s, t.s, t.s))));
    scene.add(im);
  });
  trees.forEach(t => colliders.push({ x: t.x, z: t.z, r: 0.45 }));
  const rockGeo = new T.DodecahedronGeometry(0.5, 0), rocks = new T.InstancedMesh(rockGeo, M(0x2a3558), 46);
  rocks.castShadow = rocks.receiveShadow = true;
  for (let i = 0; i < 46; i++) {
    const onArena = i > 36, c = onArena ? ARENA : MAIN, a = rnd() * 6.28, r = onArena ? rr(14.8, 17) : (i % 3 ? rr(29, 33) : rr(10, 28)), s = rr(0.4, 1.3);
    let x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
    if (nearPath(x, z, 2.4) || blocked(x, z, 1) || (onArena && Math.abs(x) < 3 && z > c.z)) { x = c.x + Math.cos(a) * (c.r - 1); z = c.z + Math.sin(a) * (c.r - 1); }
    rocks.setMatrixAt(i, mtx.compose(new T.Vector3(x, s * 0.2, z), q.setFromEuler(new T.Euler(rnd(), rnd(), rnd())), new T.Vector3(s, s * 0.7, s)));
  }
  scene.add(rocks);
  // low ground cover: bushes and small glowing flowers, so the open south half isn't bare
  const scatter = (geo, mat, n, y, smin, smax, lit) => {
    const im = new T.InstancedMesh(geo, mat, n); im.castShadow = im.receiveShadow = !!lit;
    for (let i = 0; i < n; i++) {
      let x, z, tries = 0;
      do { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 32; x = Math.cos(a) * r; z = Math.sin(a) * r; } while (++tries < 30 && (Math.hypot(x, z) < 8 || !free(x, z, 2, 0.8)));
      const s = rr(smin, smax);
      im.setMatrixAt(i, mtx.compose(new T.Vector3(x, y * s, z), q.setFromAxisAngle(up, rnd() * 6.28), new T.Vector3(s, s * (lit ? 0.72 : 1.5), s)));
    }
    scene.add(im);
  };
  scatter(new T.IcosahedronGeometry(0.62, 0), M(0x1a4254), 44, 0.3, 0.6, 1.25, true);
  scatter(new T.OctahedronGeometry(0.06), glow(0x4da3ff, 1.2), 60, 0.14, 0.7, 1.3);
  scatter(new T.OctahedronGeometry(0.06), glow(0xff8fb0, 1), 28, 0.14, 0.7, 1.3);
  scatter(new T.OctahedronGeometry(0.06), glow(0xffd76a, 1.1), 28, 0.14, 0.7, 1.3);
  LAMPS.forEach(([x, z]) => {
    cyl(scene, 0.07, 0.1, 2.7, 6, C.stoneDk, x, 0, z); box(scene, 0.36, 0.08, 0.36, C.stoneDk, x, 2.7, z); box(scene, 0.3, 0.06, 0.3, C.stoneDk, x, 3.14, z);
    ball(scene, 0.2, C.warm, x, 2.96, z);
    colliders.push({ x, z, r: 0.25 });
  });

  // ---------- pickups and perches ----------
  const shardSpots = [[-8, 7], [9, -6], [-20, 8], [21, 8], [-6, -26], [-8, 27], [-28, -14], [0, -40.5], [-12, -54], [10, -70]];
  const perches = [[-25, 6.82, -8], [17, 8.92, 19], [-13, 4.52, 13], [15.5, 9.62, -21]];

  return { scene, colliders, tick, spots, regions, bossSlots, shardSpots, perches, sun, MAIN, ARENA, glow, add };
};
