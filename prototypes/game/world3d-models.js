// PROTOTYPE. Low-poly 3D characters for world3d.js, built from primitives so there are
// no model files to load: the hero, the nine Raid Log bosses, the town cat and the birds.
// Every model is an "actor": a group, a few named animations, and three shader hooks
// (hit flash, death dissolve, tint) shared by all of its materials.
// Models face +Z and stand with their feet at y = 0.
window.W3D_models = T => {
  // The hero's look. Change these, or set window.W3D_LOOK before this file loads.
  const LOOK = { skin: '#c8946c', hair: '#3d2a22', coat: '#24589c', coatDark: '#183c70', trim: '#d9b45b', glasses: false, beard: false, ...window.W3D_LOOK };

  // ---------- small canvas textures for faces and labels ----------
  const tex = (w, h, draw) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    return t;
  };
  const word = (text, fg, bg, w = 128, h = 48, px = 34) => tex(w, h, x => {
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
    x.fillStyle = fg; x.font = `bold ${px}px ui-monospace, Menlo, Consolas, monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, w / 2, h / 2 + px * 0.06);
  });

  // ---------- mesh helpers: x, y, z is always the centre of the shape ----------
  const mesh = (p, geo, mat, x = 0, y = 0, z = 0, r) => {
    const m = new T.Mesh(geo, mat); m.position.set(x, y, z);
    if (r) m.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0);
    m.castShadow = !!mat.isMeshStandardMaterial && !mat.transparent;
    p.add(m); return m;
  };
  const box = (p, w, h, d, mat, x, y, z, r) => mesh(p, new T.BoxGeometry(w, h, d), mat, x, y, z, r);
  const cyl = (p, rt, rb, h, seg, mat, x, y, z, r) => mesh(p, new T.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, r);
  const cone = (p, rad, h, seg, mat, x, y, z, r) => mesh(p, new T.ConeGeometry(rad, h, seg), mat, x, y, z, r);
  const ball = (p, rad, mat, x, y, z, s) => { const m = mesh(p, new T.IcosahedronGeometry(rad, 1), mat, x, y, z); if (s) m.scale.set(...s); return m; };
  const plane = (p, w, h, mat, x, y, z, r) => mesh(p, new T.PlaneGeometry(w, h), mat, x, y, z, r);
  const pv = (p, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); p.add(g); return g; };
  const ease = k => 1 - (1 - k) ** 3, tri = k => Math.sin(Math.min(1, Math.max(0, k)) * Math.PI);
  // strike envelope for a one-shot attack: 0 during the wind-up, 1 at the hit, back to 0
  const hit = k => k < 0.35 ? 0 : k < 0.5 ? ease((k - 0.35) / 0.15) : 1 - ease((k - 0.5) / 0.5);
  const wind = k => k < 0.35 ? Math.sin(k / 0.35 * Math.PI / 2) : Math.max(0, 1 - (k - 0.35) / 0.12);

  // ---------- actor ----------
  const DISSOLVE = 'float dn = fract(sin(dot(floor(gl_FragCoord.xy / 3.0), vec2(12.9898, 78.233))) * 43758.5453); if (dn < uDissolve) discard;';
  const actor = (rest = 'idle') => {
    const u = { uFlash: { value: 0 }, uDissolve: { value: 0 }, uTint: { value: new T.Color(1, 1, 1) } };
    const patch = m => {
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, u);
        sh.fragmentShader = 'uniform float uFlash, uDissolve; uniform vec3 uTint;\n' + sh.fragmentShader
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + DISSOLVE)
          .replace('#include <dithering_fragment>', 'gl_FragColor.rgb = mix(gl_FragColor.rgb * uTint, vec3(1.7), uFlash);\n#include <dithering_fragment>');
      };
      return m;
    };
    const a = { obj: new T.Group(), u, rate: 1, clock: Math.random() * 10, anim: rest, rest, t: 0, dur: 1, done: null, yaw: 0, yawTo: 0, durs: {} };
    a.turn = pv(a.obj);     // facing
    a.body = pv(a.turn);    // bob and lean
    // lit, with a little self-light so characters stay readable at night
    a.M = (c, o) => patch(new T.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, emissive: c, emissiveIntensity: 0.2, ...o }));
    a.G = (c, k = 2.2, o) => patch(new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), ...o }));
    a.D = (map, o) => patch(new T.MeshBasicMaterial({ map, alphaTest: 0.5, ...o }));
    const finish = () => { const f = a.done; a.done = null; if (f) f(); };
    a.play = name => { finish(); if (a.anim !== name) { a.anim = name; a.t = 0; } };
    a.once = (name, dur = a.durs[name] || 0.6) => new Promise(res => { finish(); a.anim = name; a.t = 0; a.dur = dur; a.done = res; });
    a.face = (yaw, snap) => { a.yawTo = yaw; if (snap) a.yaw = yaw; };
    a.update = dt => {
      const d = dt * a.rate; a.t += d; a.clock += d;
      const turn = ((a.yawTo - a.yaw + Math.PI) % 6.2832 + 6.2832) % 6.2832 - Math.PI;
      a.yaw += turn * (1 - Math.exp(-dt * 12)); a.turn.rotation.y = a.yaw;
      a.pose(a.anim, a.t, a.clock, a.done ? Math.min(1, a.t / a.dur) : 0, dt);
      if (a.done && a.t >= a.dur) { a.anim = a.rest; a.t = 0; finish(); }
    };
    return a;
  };

  // drawn only where the world hides the model, so the player is never lost behind a roof
  const silMat = new T.MeshBasicMaterial({ color: 0x4da3ff, depthFunc: T.GreaterDepth, depthWrite: false });
  silMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (mod(floor(gl_FragCoord.x * 0.5) + floor(gl_FragCoord.y * 0.5), 2.0) < 1.0) discard;'); };
  const xray = a => {
    const ms = []; a.obj.traverse(m => m.isMesh && ms.push(m));
    // order matters: world (0), then the silhouette (1), then the model itself (2)
    ms.forEach(m => { m.renderOrder = 2; const s = new T.Mesh(m.geometry, silMat); s.renderOrder = 1; m.add(s); });
  };

  // =====================================================================
  // hero: the Agent Orchestrator. Long coat, staff, three agent drones.
  // =====================================================================
  const hero = (o = {}) => {
    const a = actor(), b = a.body;
    const skin = a.M(LOOK.skin), hair = a.M(LOOK.hair), coat = a.M(LOOK.coat), coatDk = a.M(LOOK.coatDark), trim = a.M(LOOK.trim, { emissiveIntensity: 0.45 }), dark = a.M('#161c30'), boot = a.M('#2c2230');
    const leg = x => { const p = pv(b, x, 0.74, 0); box(p, 0.27, 0.62, 0.3, dark, 0, -0.31, 0); box(p, 0.3, 0.2, 0.44, boot, 0, -0.64, 0.06); return p; };
    const legL = leg(-0.2), legR = leg(0.2);
    const torso = pv(b, 0, 0.74, 0);
    box(torso, 0.8, 0.78, 0.48, coat, 0, 0.43, 0);
    cyl(torso, 0.43, 0.66, 0.52, 8, coatDk, 0, -0.04, 0);
    box(torso, 0.84, 0.1, 0.52, trim, 0, 0.1, 0);
    box(torso, 0.1, 0.62, 0.03, trim, 0, 0.47, 0.245);
    box(torso, 0.92, 0.16, 0.56, coatDk, 0, 0.8, 0);
    const head = pv(torso, 0, 0.88, 0);
    box(head, 0.8, 0.72, 0.74, skin, 0, 0.4, 0);
    box(head, 0.88, 0.3, 0.82, hair, 0, 0.72, -0.01); box(head, 0.88, 0.56, 0.28, hair, 0, 0.42, -0.3); box(head, 0.88, 0.14, 0.1, hair, 0, 0.6, 0.38);
    [-0.19, 0.19].forEach(x => box(head, 0.11, 0.17, 0.03, dark, x, 0.36, 0.375));
    if (LOOK.beard) box(head, 0.84, 0.26, 0.78, hair, 0, 0.14, 0.0);
    if (LOOK.glasses) { [-0.19, 0.19].forEach(x => box(head, 0.26, 0.22, 0.02, dark, x, 0.36, 0.39)); box(head, 0.14, 0.04, 0.02, dark, 0, 0.38, 0.39); }
    const arm = x => { const p = pv(torso, x, 0.72, 0); box(p, 0.24, 0.6, 0.26, coat, 0, -0.28, 0); box(p, 0.26, 0.1, 0.28, trim, 0, -0.56, 0); box(p, 0.2, 0.17, 0.22, skin, 0, -0.68, 0); return p; };
    const armL = arm(-0.53), armR = arm(0.53);
    const staff = pv(armR, 0, -0.68, 0.14);
    cyl(staff, 0.045, 0.045, 2.5, 6, a.M('#6e5a48'), 0, 0.65, 0);
    mesh(staff, new T.TorusGeometry(0.21, 0.04, 5, 12, 4.4), trim, 0, 2, 0, [0, 0, -0.63]);
    const gem = mesh(staff, new T.OctahedronGeometry(0.14), a.G('#4da3ff', 3.2), 0, 2, 0);
    const drones = [0, 1, 2].map(() => { const d = pv(a.obj); mesh(d, new T.OctahedronGeometry(0.14), a.G('#7fd0ff', 2.8)); mesh(d, new T.TorusGeometry(0.24, 0.025, 4, 10), a.G('#4da3ff', 1.4), 0, 0, 0, [1.57, 0, 0]); return d; });

    // joints. Arms swing forward on negative angles. The staff stands upright when armR + staff = 0.
    const REST = { y: 0, lean: 0, legL: 0, legR: 0, armL: 0, armR: 0, armLz: 0, armRz: 0, staff: 0, head: 0, spin: 1, orbit: 0.95, fwd: 0 }, cur = { ...REST };
    let ang = 0;
    a.durs = { attack: 0.6, special: 0.9, hurt: 0.42 };
    a.pose = (n, t, c, k, dt) => {
      const j = { ...REST }, br = Math.sin(c * 2.2);
      if (n === 'idle') { j.y = br * 0.015; j.armL = br * 0.04; j.armR = -0.12; j.staff = 0.12; }
      else if (n === 'walk' || n === 'run') {
        const run = n === 'run', f = run ? 13 : 9.5, s = Math.sin(t * f), amp = run ? 0.95 : 0.62;
        j.legL = s * amp; j.legR = -s * amp; j.armL = -s * amp * 0.8; j.armR = s * 0.14 - 0.2; j.staff = 0.2 - s * 0.14;
        j.y = Math.abs(Math.cos(t * f)) * 0.07; j.lean = run ? 0.2 : 0.07;
      }
      else if (n === 'air') { j.legL = 0.55; j.legR = -0.35; j.armL = -2.5; j.armR = -0.6; j.staff = 0.6; }
      else if (n === 'battle') { j.y = br * 0.02; j.legL = 0.22; j.legR = -0.2; j.armR = -0.75; j.staff = 1; j.armL = -0.3; j.armLz = -0.2; j.lean = 0.06; }
      else if (n === 'attack') {
        if (k < 0.4) { j.armR = 0.5; j.staff = -0.9; j.lean = -0.12; j.legL = 0.1; j.legR = -0.1; }
        else { j.armR = -1.4; j.staff = 2.75; j.lean = 0.28; j.legL = 0.45; j.legR = -0.4; j.orbit = 0.3; j.fwd = 1.5; }
      }
      else if (n === 'special') {
        j.spin = 7;
        if (k < 0.62) { j.armR = -2.9; j.staff = 2.9; j.armL = -2.8; j.y = 0.3; j.orbit = 1.7; j.head = -0.25; }
        else { j.armR = -1.5; j.staff = 2.9; j.armL = -1.4; j.lean = 0.3; j.legL = 0.5; j.legR = -0.45; j.orbit = 0.25; j.fwd = 1.8; }
      }
      else if (n === 'hurt') { j.lean = -0.38; j.head = -0.35; j.armLz = -1; j.armRz = 0.7; j.armR = -0.2; j.staff = 0.5; j.legL = -0.3; j.legR = 0.2; j.y = tri(k) * 0.12; }
      else if (n === 'victory') { const p = Math.abs(Math.sin(t * 5)); j.y = p * 0.24; j.armR = -2.9 + p * 0.2; j.staff = 2.9; j.armL = -2.7; j.armLz = -0.25; j.head = -0.2; j.spin = 4; j.orbit = 1.3; }
      const s = 1 - Math.exp(-dt * 20);
      for (const key in cur) cur[key] += (j[key] - cur[key]) * s;
      b.position.y = cur.y; b.rotation.x = cur.lean;
      legL.rotation.x = cur.legL; legR.rotation.x = cur.legR;
      armL.rotation.set(cur.armL, 0, cur.armLz); armR.rotation.set(cur.armR, 0, cur.armRz);
      staff.rotation.x = cur.staff; head.rotation.x = cur.head; gem.rotation.y = c * 2;
      ang += dt * cur.spin * 1.6;
      const fx = Math.sin(a.yaw) * cur.fwd, fz = Math.cos(a.yaw) * cur.fwd;
      drones.forEach((d, i) => { const q = ang + i * 2.094; d.position.set(Math.cos(q) * cur.orbit + fx, 1.75 + Math.sin(c * 2 + i * 2) * 0.2 + cur.y, Math.sin(q) * cur.orbit + fz); d.rotation.y = c * 3; });
    };
    if (o.xray) xray(a);
    return a;
  };

  // =====================================================================
  // bosses. Each returns an actor with 'idle' and a one-shot 'attack'.
  // =====================================================================

  // 0. Window Within: a window holding a smaller window holding a smaller window. The title counts the spawned agents.
  const windowWithin = () => {
    const a = actor(), g = pv(a.body, 0, 2.25, 0);
    const navy = a.M('#101a33'), edge = a.M('#3d6fb8'), bar = a.G('#4da3ff', 1.5), gold = a.G('#d9b45b', 1.6), white = a.M('#e8eef7');
    const wins = [];
    let p = g;
    for (let i = 0; i < 5; i++) {
      const w = pv(p, i ? 0.34 : 0, i ? -0.2 : 0, i ? 0.3 : 0); w.scale.setScalar(i ? 0.68 : 1);
      box(w, 4.2, 3.2, 0.14, navy, 0, 0, 0); box(w, 4.36, 0.42, 0.2, bar, 0, 1.6, 0);
      box(w, 0.08, 3.3, 0.2, edge, -2.14, 0, 0); box(w, 0.08, 3.3, 0.2, edge, 2.14, 0, 0); box(w, 4.36, 0.08, 0.2, edge, 0, -1.62, 0);
      box(w, 0.3, 0.3, 0.06, gold, -1.7, 1.05, 0.1); box(w, 0.3, 0.3, 0.06, gold, -1.25, 1.05, 0.1);
      wins.push(w); p = w;
    }
    for (let i = 0; i < 7; i++) cone(g, 0.17, 0.42, 4, white, -1.65 + i * 0.55, -1.38, 0.2);
    const counts = ['5', '43', '210', '928', '933'].map(n => word(n, '#0a1020', null, 96, 40, 34));
    const count = plane(g, 0.95, 0.4, a.D(counts[0]), 1.5, 1.6, 0.11);
    a.durs = { attack: 0.75 };
    a.pose = (n, t, c, k) => {
      const h = n === 'attack' ? hit(k) : 0, w = n === 'attack' ? wind(k) : 0;
      g.position.y = 2.25 + Math.sin(c * 1.4) * 0.12; g.rotation.z = Math.sin(c * 0.9) * 0.03; g.rotation.x = -w * 0.18 + h * 0.2;
      wins.forEach((win, i) => { if (!i) return; win.position.z = 0.3 + h * 1.5 - w * 0.12; win.rotation.z = Math.sin(c * 1.1 - i * 0.7) * 0.05; win.position.x = 0.34 + Math.sin(c * 0.8 - i * 0.6) * 0.06; });
      count.material.map = counts[n === 'attack' ? 4 : Math.floor(c * 0.8) % 5];
    };
    return a;
  };

  // 1. Janus Seal: a PASS medal with FAIL on the back. It keeps almost showing you.
  const janusSeal = () => {
    const a = actor(), g = pv(a.body, 0, 2.55, 0);
    const silver = a.M('#aab4c8'), blue = a.M('#3d8fe0'), gold = a.M('#d9a93b');
    const face = (bg, dark, good) => tex(128, 128, x => {
      x.fillStyle = bg; x.beginPath(); x.arc(64, 64, 64, 0, 6.2832); x.fill();
      x.strokeStyle = dark; x.lineWidth = 13; x.lineCap = x.lineJoin = 'round'; x.beginPath();
      if (good) { x.moveTo(34, 58); x.lineTo(56, 80); x.lineTo(96, 36); } else { x.moveTo(40, 34); x.lineTo(88, 82); x.moveTo(88, 34); x.lineTo(40, 82); }
      x.stroke(); x.lineWidth = 6; x.beginPath();
      if (good) x.arc(64, 82, 26, 0.5, 2.64); else x.arc(64, 122, 24, 3.75, 5.67);
      x.stroke();
    });
    cyl(g, 1.42, 1.42, 0.3, 20, silver, 0, 0, 0, [1.5708]);
    for (let i = 0; i < 12; i++) ball(g, 0.3, silver, Math.cos(i * 0.5236) * 1.42, Math.sin(i * 0.5236) * 1.42, 0, [1, 1, 0.5]);
    mesh(g, new T.CircleGeometry(1.16, 28), a.D(face('#2fa84f', '#0e4a22', true)), 0, 0, 0.16);
    mesh(g, new T.CircleGeometry(1.16, 28), a.D(face('#d8334a', '#5a0f1c', false)), 0, 0, -0.16, [0, Math.PI]);
    box(g, 1.7, 0.46, 0.42, blue, 0, 1.52, 0);
    plane(g, 1.5, 0.4, a.D(word('PASS', '#fff', null)), 0, 1.52, 0.22); plane(g, 1.5, 0.4, a.D(word('FAIL', '#ffd0d6', null)), 0, 1.52, -0.22, [0, Math.PI]);
    box(g, 0.44, 1.5, 0.1, blue, -0.36, -1.85, 0, [0, 0, -0.16]); box(g, 0.44, 1.5, 0.1, gold, 0.36, -1.85, 0, [0, 0, 0.16]);
    a.durs = { attack: 0.8 };
    a.pose = (n, t, c, k) => {
      // every so often it turns just far enough to show the other face
      const peek = Math.max(0, Math.sin(c * 0.7)) ** 6;
      g.position.y = 2.55 + Math.sin(c * 1.6) * 0.12;
      g.rotation.y = n === 'attack' ? Math.PI * Math.min(1, ease(k / 0.4)) + (k > 0.7 ? Math.PI * ease((k - 0.7) / 0.3) : 0) : Math.sin(c * 1.1) * 0.3 + peek * 2.4;
      g.rotation.z = Math.sin(c * 0.9) * 0.05; g.scale.setScalar(1 + (n === 'attack' ? hit(k) * 0.18 : 0));
    };
    return a;
  };

  // 2. Late Error: an error dialog that charges you first. The cursor never quite reaches OK.
  const lateError = () => {
    const a = actor(), g = pv(a.body, 0, 2.5, 0);
    const pale = a.M('#d6dbe6'), red = a.M('#d8334a'), white = a.M('#f4f6fa'), blue = a.M('#3d8fe0');
    const face = mad => tex(160, 96, x => {
      x.fillStyle = '#1a1d2b';
      [[34, 1], [126, -1]].forEach(([cx, d]) => { x.beginPath(); x.moveTo(cx - 20, 22 - d * 8); x.lineTo(cx + 20, 22 + d * 8); x.lineTo(cx + 20, 40); x.lineTo(cx - 20, 40); x.fill(); });
      x.fillStyle = '#d8334a'; x.fillRect(28, 28, 12, 10); x.fillRect(120, 28, 12, 10);
      x.fillStyle = '#1a1d2b';
      if (mad) { x.fillRect(42, 54, 76, 34); x.fillStyle = '#ffd76a'; x.font = 'bold 26px ui-monospace, Menlo, monospace'; x.textAlign = 'center'; x.fillText('$$$', 80, 80); }
      else { x.beginPath(); x.moveTo(40, 62); for (let i = 0; i <= 8; i++) x.lineTo(40 + i * 10, i % 2 ? 76 : 62); x.lineTo(120, 62); x.fill(); }
    });
    box(g, 3.5, 2.5, 0.45, pale, 0, 0, 0); box(g, 3.5, 0.5, 0.5, red, 0, 1.0, 0); box(g, 0.32, 0.32, 0.06, white, 1.5, 1.0, 0.26);
    const titles = [word('ERROR', '#fff', null, 128, 40, 30), word('CHARGED', '#fff', null, 160, 40, 30)], faces = [face(false), face(true)];
    const title = plane(g, 1.5, 0.4, a.D(titles[0]), -0.85, 1.0, 0.26), mug = plane(g, 2.9, 1.74, a.D(faces[0]), 0, -0.15, 0.24);
    box(g, 0.86, 0.42, 0.12, blue, 1.12, -0.86, 0.24); plane(g, 0.7, 0.34, a.D(word('OK', '#fff', null, 64, 32, 26)), 1.12, -0.86, 0.31);
    const fringe = [-1.4, -0.7, 0, 0.7, 1.4].map(x => ball(g, 0.42, pale, x, -1.3, 0, [1, 1.1, 0.5]));
    const ink = a.M('#1a1d2b'), cursor = pv(g, 0.2, -0.9, 0.5); cone(cursor, 0.2, 0.5, 3, ink, 0, 0, 0, [0, 0, 0.6]); box(cursor, 0.09, 0.34, 0.05, ink, 0.12, -0.3, 0, [0, 0, 0.6]);
    a.durs = { attack: 0.8 };
    a.pose = (n, t, c, k) => {
      const atk = n === 'attack', h = atk ? hit(k) : 0;
      g.position.y = 2.5 + Math.sin(c * 1.5) * 0.14; g.rotation.z = Math.sin(c * 1.1) * 0.04 + (atk ? Math.sin(t * 60) * 0.03 * h : 0);
      g.scale.setScalar(1 + h * 0.14);
      fringe.forEach((f, i) => { f.position.y = -1.3 + Math.sin(c * 3 + i * 1.1) * 0.09; });
      title.material.map = titles[atk && k > 0.3 ? 1 : 0]; title.scale.x = atk && k > 0.3 ? 1.25 : 1; title.position.x = atk && k > 0.3 ? -0.68 : -0.85;
      mug.material.map = faces[atk && k > 0.3 ? 1 : 0];
      const creep = (c * 0.35) % 1;   // drifts toward OK, then snaps back just short of it
      cursor.position.x = 0.1 + creep * 0.62; cursor.position.y = -1 + Math.sin(c * 2) * 0.03;
    };
    return a;
  };

  // 3. Dead-Branch Treant: three dead branches and one that finally lived.
  const treant = () => {
    const a = actor(), g = pv(a.body);
    const bark = a.M('#2c2140'), barkLt = a.M('#44325e'), dead = a.M('#6d5a8c'), live = a.G('#5fd38d', 2.4), eye = a.G('#c9b8ff', 2.2), dark = a.M('#120d1c');
    cyl(g, 0.55, 0.9, 2.7, 7, bark, 0, 1.35, 0);
    for (let i = 0; i < 6; i++) { const q = i * 1.047 + 0.3; cone(g, 0.3, 1.1, 5, bark, Math.cos(q) * 0.85, 0.22, Math.sin(q) * 0.85, [Math.sin(q) * 1.15, 0, -Math.cos(q) * 1.15]); }
    box(g, 0.24, 0.13, 0.08, eye, -0.26, 1.95, 0.56, [0, 0, -0.3]); box(g, 0.24, 0.13, 0.08, eye, 0.26, 1.95, 0.56, [0, 0, 0.3]);
    box(g, 0.56, 0.2, 0.08, dark, 0, 1.45, 0.66); for (let i = 0; i < 4; i++) cone(g, 0.06, 0.16, 3, eye, -0.2 + i * 0.13, 1.5, 0.7, [Math.PI]);
    // a branch is a pivot with a tapered limb growing up from it, plus a commit dot at the tip
    const branch = (p, x, y, z, len, r, rot, tip) => { const b = pv(p, x, y, z); b.rotation.set(...rot); cyl(b, r * 0.5, r, len, 5, barkLt, 0, len / 2, 0); if (tip) ball(b, 0.15, tip, 0, len + 0.05, 0); b.len = len; return b; };
    const tops = [[-0.3, 1.5, [0, 0, 0.55]], [0.05, 1.8, [0.1, 0, -0.08]], [0.32, 1.3, [0, 0, -0.7]]].map(([x, len, rot]) => {
      const b = branch(g, x, 2.6, 0, len, 0.2, rot, dead);
      branch(b, 0, len * 0.55, 0, len * 0.45, 0.1, [0, 0, x < 0 ? 0.8 : -0.8], dead);
      box(b, 0.3, 0.05, 0.05, dead, 0, len + 0.05, 0, [0, 0, 0.785]); box(b, 0.3, 0.05, 0.05, dead, 0, len + 0.05, 0, [0, 0, -0.785]);   // crossed out
      return b;
    });
    const armL = branch(g, -0.55, 2.1, 0.1, 1.5, 0.2, [0, 0, 1.35], dead), armR = branch(g, 0.55, 2.2, 0.1, 1.7, 0.22, [0, 0, -1.2], live);
    box(armL, 0.04, 0.5, 0.04, a.M('#d9b45b'), 0, 1.1, 0.25, [1.5708]); box(armL, 0.16, 0.28, 0.05, a.M('#d9b45b'), 0, 1.1, 0.56);
    a.durs = { attack: 0.8 };
    a.pose = (n, t, c, k) => {
      const atk = n === 'attack', h = atk ? hit(k) : 0, w = atk ? wind(k) : 0;
      g.rotation.z = Math.sin(c * 0.8) * 0.03; g.rotation.x = h * 0.2 - w * 0.1;
      tops.forEach((b, i) => { b.rotation.x = Math.sin(c * 1.2 + i * 1.7) * 0.07; });
      armL.rotation.z = 1.35 + Math.sin(c * 1.3) * 0.08;
      armR.rotation.z = -1.2 + Math.sin(c * 1.1 + 1) * 0.08 + w * 0.9; armR.rotation.x = h * 1.5 - w * 0.5;
    };
    return a;
  };

  // 4. Trilife Cat: one cat, three tails, one per time the bug came back. Also the town cat, with one tail.
  const cat = (o = {}) => {
    const { tails = 3, tags = ['CA', '??', 'NA'] } = o;
    const a = actor(), g = pv(a.body);
    const fur = a.M('#221c34'), furLt = a.M('#3a3152'), paw = a.M('#d8c8b0'), pink = a.M('#e08aa6'), eyeM = a.G('#ffd23a', 1.3), dark = a.M('#0d0a16'), collar = a.M('#3d8fe0'), gold = a.M('#d9b45b');
    ball(g, 1, fur, 0, 1.05, 0, [0.82, 1.05, 0.85]); ball(g, 0.55, furLt, 0, 1.2, 0.5, [0.8, 1, 0.6]);
    ball(g, 0.5, fur, -0.55, 0.42, 0.1, [0.8, 0.8, 1.2]); ball(g, 0.5, fur, 0.55, 0.42, 0.1, [0.8, 0.8, 1.2]);
    const leg = x => { const p = pv(g, x, 1.2, 0.55); cyl(p, 0.15, 0.13, 1.05, 6, fur, 0, -0.52, 0); ball(p, 0.19, paw, 0, -1.08, 0.06, [1, 0.7, 1.3]); return p; };
    leg(-0.3); const swipe = leg(0.3);
    mesh(g, new T.TorusGeometry(0.44, 0.08, 5, 14), collar, 0, 1.92, 0.2, [1.4]); box(g, 0.16, 0.16, 0.06, gold, 0, 1.78, 0.62);
    const head = pv(g, 0, 2.35, 0.3);
    ball(head, 0.66, fur, 0, 0, 0, [1.08, 0.92, 0.92]);
    [-1, 1].forEach(s => { cone(head, 0.24, 0.48, 4, fur, s * 0.38, 0.6, 0, [0, 0, -s * 0.2]); cone(head, 0.12, 0.3, 4, pink, s * 0.38, 0.56, 0.08, [0, 0, -s * 0.2]); });
    const eyes = [-1, 1].map(s => { const e = ball(head, 0.13, eyeM, s * 0.26, 0.06, 0.52, [1, 1, 0.5]); box(e, 0.05, 0.22, 0.06, dark, 0, 0, 0.1); return e; });
    ball(head, 0.06, pink, 0, -0.12, 0.62);
    // a tail is a chain of short segments, each bending a little more than the last
    const tailSet = [];
    for (let i = 0; i < tails; i++) {
      let p = pv(g, (i - (tails - 1) / 2) * 0.3, 0.45, -0.75); p.rotation.set(-0.5, 0, -(i - (tails - 1) / 2) * 0.62);
      const segs = [];
      for (let k = 0; k < 7; k++) { cyl(p, 0.09, 0.1, 0.44, 5, fur, 0, 0.22, 0); segs.push(p); p = pv(p, 0, 0.42, 0); }
      if (tags && tags[i]) { box(p, 0.5, 0.34, 0.07, a.M('#eef2fa'), 0, 0.2, 0); plane(p, 0.46, 0.3, a.D(word(tags[i], '#1a2238', null, 64, 40, 28)), 0, 0.2, 0.04); }
      tailSet.push(segs);
    }
    a.durs = { attack: 0.7 };
    a.pose = (n, t, c, k) => {
      const atk = n === 'attack', h = atk ? hit(k) : 0, w = atk ? wind(k) : 0;
      g.position.z = h * 0.5; g.rotation.x = h * 0.18 - w * 0.08;
      head.rotation.z = Math.sin(c * 0.7) * 0.1; head.rotation.x = h * 0.2;
      const blink = (c % 3.6) < 0.12 ? 0.1 : 1; eyes.forEach(e => { e.scale.y = blink; });
      swipe.rotation.x = -w * 0.9 - h * 1.7; swipe.rotation.z = h * 0.3;
      tailSet.forEach((segs, i) => segs.forEach((s, q) => { if (q) { s.rotation.x = 0.2 + Math.sin(c * 1.8 - q * 0.6 + i * 2) * 0.16 + h * 0.15; s.rotation.z = Math.sin(c * 1.3 - q * 0.5 + i) * 0.14; } }));
    };
    return a;
  };

  // 5. Handshake Crab: wears the lock, offers a claw. No takeover until the handshake.
  const crab = () => {
    const a = actor(), g = pv(a.body);
    const red = a.M('#c0392b'), redDk = a.M('#8a2418'), lock = a.M('#d0a73c', { emissiveIntensity: 0.3 }), steel = a.M('#aab4c8'), dark = a.M('#1a1420'), white = a.M('#f4f6fa');
    ball(g, 1, red, 0, 0.8, 0, [1.55, 0.5, 1.05]);
    box(g, 2, 1.65, 1, lock, 0, 1.95, -0.1); box(g, 2.1, 0.16, 1.1, a.M('#a8842a'), 0, 1.2, -0.1);
    mesh(g, new T.TorusGeometry(0.62, 0.13, 6, 14, Math.PI), steel, 0, 2.78, -0.1);
    cyl(g, 0.2, 0.2, 0.08, 10, dark, 0, 2.1, 0.42, [1.5708]); box(g, 0.14, 0.42, 0.08, dark, 0, 1.82, 0.42);
    [-1, 1].forEach(s => { cyl(g, 0.05, 0.05, 0.5, 5, redDk, s * 0.45, 1.2, 0.85); const e = ball(g, 0.16, white, s * 0.45, 1.5, 0.85); ball(e, 0.07, dark, 0, 0, 0.13); });
    const legs = [];
    [-1, 1].forEach(s => [0.45, 0, -0.45].forEach((z, i) => {
      const p = pv(g, s * 1.3, 0.75, z); box(p, 0.75, 0.13, 0.13, redDk, s * 0.33, 0.14, 0, [0, 0, s * 0.4]); box(p, 0.13, 0.85, 0.13, redDk, s * 0.7, -0.14, 0, [0, 0, s * 0.25]);
      p.ph = i * 2.1 + (s > 0 ? 1 : 0); p.s = s; legs.push(p);
    }));
    const claw = (s, size) => {
      const p = pv(g, s * 1.25, 0.95, 0.75); box(p, 0.95 * size, 0.18, 0.18, redDk, s * 0.45 * size, 0, 0);
      const hand = pv(p, s * 0.95 * size, 0, 0); ball(hand, 0.42 * size, red, s * 0.2 * size, 0, 0, [1.2, 0.9, 0.7]);
      const up = pv(hand, s * 0.45 * size, 0.1 * size, 0), down = pv(hand, s * 0.45 * size, -0.1 * size, 0);
      cone(up, 0.17 * size, 0.7 * size, 4, red, s * 0.3 * size, 0, 0, [0, 0, -s * 1.5708]); cone(down, 0.13 * size, 0.6 * size, 4, redDk, s * 0.26 * size, 0, 0, [0, 0, -s * 1.5708]);
      return { p, up, down, s };
    };
    const big = claw(-1, 1.25), small = claw(1, 0.8);
    a.durs = { attack: 0.75 };
    a.pose = (n, t, c, k) => {
      const atk = n === 'attack', h = atk ? hit(k) : 0, w = atk ? wind(k) : 0;
      g.position.y = Math.abs(Math.sin(c * 3)) * 0.05; g.rotation.z = Math.sin(c * 1.5) * 0.03;
      legs.forEach(l => { l.rotation.z = Math.sin(c * 6 + l.ph) * 0.14; l.rotation.y = Math.cos(c * 6 + l.ph) * 0.12; });
      // the offered claw bobs like a hand waiting to be shaken
      big.p.rotation.z = -0.25 + Math.sin(c * 2.2) * 0.14 - w * 0.4; big.p.rotation.y = 0.4 - w * 0.9 + h * 0.1; big.p.position.x = -1.25 - h * 0.9; big.p.scale.setScalar(1 + h * 0.35);
      small.p.rotation.z = 0.5 + Math.sin(c * 1.7) * 0.08;
      const snap = atk ? (k > 0.45 ? 0 : 0.6) : 0.3 + Math.max(0, Math.sin(c * 4)) * 0.25;
      [big, small].forEach(q => { q.up.rotation.z = -q.s * snap; q.down.rotation.z = q.s * snap * 0.6; });
    };
    return a;
  };

  // 6. Day-Pad Crawler: a tear-off calendar counting the 14 days. Each hit costs it a page.
  const dayPad = () => {
    const a = actor(), g = pv(a.body, 0, 1.15, 0);
    const paper = a.M('#efe9da'), red = a.M('#d8334a'), steel = a.M('#aab4c8'), blue = a.M('#2f6fd0'), blueDk = a.M('#1d4a94'), white = a.M('#f4f6fa'), dark = a.M('#1a1420');
    box(g, 2.2, 0.32, 1, blue, 0, 0, 0);
    const pad = pv(g, 0, 0.16, 0);
    box(pad, 1.95, 2.05, 0.7, paper, 0, 1.03, 0); box(pad, 2, 0.5, 0.74, red, 0, 2.05, 0);
    [-0.5, 0.5].forEach(x => mesh(pad, new T.TorusGeometry(0.15, 0.04, 5, 10), steel, x, 2.36, 0, [0, 1.5708, 0]));
    const nums = ['14', '13'].map(n => word(n, '#1a1d2b', null, 128, 96, 84));
    const num = plane(pad, 1.6, 1.2, a.D(nums[0]), 0, 0.92, 0.36);
    const page = pv(pad, 0, 1.8, 0.37); const sheet = box(page, 1.9, 1.75, 0.03, a.M('#fbf7ea'), 0, -0.87, 0); sheet.visible = false;
    const stalks = [-0.45, 0.45].map(x => { const p = pv(pad, x, 2.3, 0.1); cyl(p, 0.045, 0.045, 0.55, 5, steel, 0, 0.27, 0); const e = ball(p, 0.19, white, 0, 0.62, 0); ball(e, 0.08, dark, 0, 0, 0.15); return p; });
    const legs = [];
    [-1, 1].forEach(s => [0.35, -0.35].forEach((z, i) => {
      const p = pv(g, s * 1.05, 0, z); box(p, 0.8, 0.13, 0.13, blueDk, s * 0.36, 0.2, 0, [0, 0, s * 0.55]); box(p, 0.12, 1.25, 0.12, blueDk, s * 0.75, -0.25, 0, [0, 0, s * 0.18]);
      ball(p, 0.11, steel, s * 0.72, 0.4, 0); p.ph = i * 3.14 + (s > 0 ? 1.57 : 0); legs.push(p);
    }));
    const arms = [-1, 1].map(s => { const p = pv(g, s * 1.0, 0.1, 0.5); box(p, 0.7, 0.1, 0.1, blueDk, s * 0.3, 0.1, 0.1, [0, -s * 0.5, s * 0.3]); cyl(p, 0.05, 0.05, 0.5, 5, a.M('#e0b23c'), s * 0.62, 0.3, 0.3, [0.4, 0, -s * 0.4]); return p; });
    a.durs = { attack: 0.9 };
    a.pose = (n, t, c, k) => {
      const atk = n === 'attack', h = atk ? hit(k) : 0;
      g.position.y = 1.15 + Math.sin(c * 2.4) * 0.06; g.rotation.z = Math.sin(c * 1.2) * 0.03; pad.rotation.x = Math.sin(c * 1.6) * 0.03 - h * 0.12;
      legs.forEach(l => { l.rotation.z = Math.sin(c * 5 + l.ph) * 0.1; l.position.y = Math.max(0, Math.sin(c * 5 + l.ph)) * 0.1; });
      arms.forEach((p, i) => { p.rotation.z = Math.sin(c * 3 + i * 2) * 0.2; });
      stalks.forEach((p, i) => { p.rotation.z = Math.sin(c * 1.8 + i) * 0.16; p.rotation.x = Math.sin(c * 1.3 + i * 2) * 0.12; });
      // tear a page off and throw it
      const tear = atk && k > 0.3;
      num.material.map = nums[tear ? 1 : 0]; sheet.visible = tear && k < 0.95;
      if (tear) { const q = (k - 0.3) / 0.65; page.rotation.x = -q * 2.2; page.position.set(-q * 0.6, 1.8 + Math.sin(q * 3.14) * 0.5, 0.37 + q * 2.6); page.rotation.z = q * 1.5; }
    };
    return a;
  };

  // 7. Test-Tube Quartet: four isolated instances that share more than they should.
  const testTubes = () => {
    const a = actor(), g = pv(a.body);
    const rack = a.M('#5a3d9a'), rackDk = a.M('#3d2870'), cap = a.M('#2fa84f'), glass = a.M('#bfe3ff', { transparent: true, opacity: 0.26, depthWrite: false, emissiveIntensity: 0.5 });
    const liquid = a.M('#d8334a', { emissiveIntensity: 0.55 }), bleed = a.G('#ff4d5e', 2.2), label = a.M('#eef2fa');
    box(g, 4.5, 0.2, 1.1, rack, 0, 0.5, 0); box(g, 4.5, 0.16, 1, rack, 0, 2, 0);
    [-2.1, 2.1].forEach(x => [-0.4, 0.4].forEach(z => cyl(g, 0.09, 0.09, 2, 6, rackDk, x, 1, z)));
    [-1.9, 1.9].forEach(x => box(g, 0.5, 0.2, 1.3, rackDk, x, 0.1, 0));
    const mug = tex(64, 48, x => { x.fillStyle = '#3a0a14'; x.fillRect(12, 10, 10, 12); x.fillRect(42, 10, 10, 12); x.fillRect(16, 32, 32, 6); });
    const tubes = [0, 1, 2, 3].map(i => {
      const p = pv(g, -1.5 + i * 1, 2, 0);
      cyl(p, 0.37, 0.37, 2.5, 10, glass, 0, 0.1, 0); ball(p, 0.37, glass, 0, -1.15, 0);
      const liq = pv(p, 0, -1.3, 0); cyl(liq, 0.3, 0.3, 1, 10, liquid, 0, 0.5, 0); ball(p, 0.3, liquid, 0, -1.25, 0);
      const face = plane(p, 0.5, 0.38, a.D(mug), 0, -0.6, 0.32);
      cyl(p, 0.42, 0.42, 0.26, 10, cap, 0, 1.45, 0);
      box(p, 0.4, 0.34, 0.05, label, 0, 0.75, 0.38); plane(p, 0.36, 0.3, a.D(word(String(i + 1), '#1a2238', null, 48, 40, 32)), 0, 0.75, 0.41);
      return { p, liq, face };
    });
    const arcs = [0, 1, 2].map(i => mesh(g, new T.TorusGeometry(0.5, 0.06, 5, 12, Math.PI), bleed, -1 + i * 1, 3.55, 0));
    a.durs = { attack: 0.8 };
    a.pose = (n, t, c, k) => {
      const atk = n === 'attack', h = atk ? hit(k) : 0;
      g.rotation.z = Math.sin(c * 1.3) * 0.025 + (atk ? Math.sin(t * 50) * 0.03 * h : 0); g.position.z = h * 0.4;
      tubes.forEach((q, i) => {
        const lvl = Math.min(2.3, 1.25 + Math.sin(c * 1.3 + i * 1.57) * 0.5 + h * 1.2);   // levels trade places: what leaves one tube shows up in the next
        q.liq.scale.y = lvl; q.face.position.y = -1.3 + lvl * 0.55; q.p.rotation.z = Math.sin(c * 2 + i * 1.3) * 0.04;
      });
      arcs.forEach((r, i) => { const s = 0.7 + Math.max(0, Math.sin(c * 2.6 - i * 1.2)) * 0.5 + h * 0.6; r.scale.set(1, s, 1); r.visible = s > 0.8; });
    };
    return a;
  };

  // 8. Diff Mask: two halves of a face that almost line up.
  const diffMask = () => {
    const a = actor(), g = pv(a.body, 0, 2.75, 0);
    const side = T.DoubleSide, left = a.M('#b9c4dc', { side }), right = a.M('#d77fd0', { side }), dark = a.M('#141826'), cloak = a.M('#1c2238', { side }), pupil = a.G('#4da3ff', 2.6);
    const half = (mat, from) => { const p = pv(g); const m = mesh(p, new T.SphereGeometry(1.15, 5, 8, from, Math.PI / 2), mat); m.scale.set(1, 1.3, 0.6); return p; };
    const L = half(left, 0), R = half(right, Math.PI / 2);
    box(L, 0.52, 0.2, 0.12, dark, -0.48, 0.3, 0.6, [0, -0.42, 0.14]); box(L, 0.15, 0.15, 0.12, pupil, -0.46, 0.3, 0.64);
    box(R, 0.52, 0.1, 0.12, dark, 0.48, 0.3, 0.6, [0, 0.42, -0.14]);
    box(L, 0.52, 0.09, 0.12, dark, -0.27, -0.62, 0.62, [0, -0.25, 0]); box(R, 0.52, 0.09, 0.12, dark, 0.27, -0.62, 0.62, [0, 0.25, 0]);
    box(L, 0.1, 0.5, 0.1, a.M('#8f9cc0'), -0.06, -0.12, 0.72); box(R, 0.1, 0.5, 0.1, a.M('#b060ac'), 0.06, -0.12, 0.72);   // nose bridge, split too
    const robe = pv(a.body, 0, 1.75, -0.1);
    mesh(robe, new T.ConeGeometry(1.35, 2.5, 7, 1, true), cloak, 0, 0, 0);
    for (let i = 0; i < 7; i++) { const q = i * 0.8976; cone(robe, 0.3, 0.6, 4, cloak, Math.cos(q) * 1.15, -1.45, Math.sin(q) * 1.15, [Math.PI]); }
    const bits = [0, 1, 2, 3, 4, 5].map(i => box(a.body, 0.2, 0.2, 0.2, a.G(i % 2 ? '#ff7ad9' : '#5fd38d', 2), 0, 0, 0));
    a.durs = { attack: 0.8 };
    a.pose = (n, t, c, k) => {
      const atk = n === 'attack', h = atk ? hit(k) : 0, w = atk ? wind(k) : 0;
      g.position.y = 2.75 + Math.sin(c * 1.4) * 0.14; robe.position.y = 1.75 + Math.sin(c * 1.4 - 0.4) * 0.14; robe.rotation.z = Math.sin(c * 1.1) * 0.05;
      const d = atk ? w * 0.7 : 0.1 + Math.sin(c * 1.5) * 0.08;   // how far out of register the two halves are
      R.position.set(d, -d * 0.5, 0); L.position.set(-d * 0.3, d * 0.2, 0);
      g.scale.setScalar(1 + h * 0.2); g.rotation.z = Math.sin(c * 0.8) * 0.06;
      bits.forEach((b, i) => { const q = c * (0.7 + i * 0.07) + i * 1.05, r = 1.7 + Math.sin(c + i) * 0.2 + h * 0.8; b.position.set(Math.cos(q) * r, 2.5 + Math.sin(q * 1.7) * 0.9, Math.sin(q) * r * 0.6); b.rotation.set(q, q * 1.3, 0); });
    };
    return a;
  };

  // ---------- birds ----------
  const bird = () => {
    const a = actor(), g = pv(a.body, 0, 0.16, 0);
    const feather = a.M('#cfd8ea'), wingM = a.M('#8fa0c0'), beak = a.M('#e0902c'), dark = a.M('#141826');
    ball(g, 0.16, feather, 0, 0, 0, [0.9, 0.9, 1.3]); const head = pv(g, 0, 0.14, 0.16); ball(head, 0.11, feather, 0, 0.02, 0);
    cone(head, 0.04, 0.12, 4, beak, 0, 0, 0.14, [1.5708]); [-1, 1].forEach(s => ball(head, 0.025, dark, s * 0.07, 0.05, 0.07));
    box(g, 0.12, 0.03, 0.2, wingM, 0, 0, -0.26, [0.3]);
    const wings = [-1, 1].map(s => { const p = pv(g, s * 0.12, 0.04, 0); box(p, 0.3, 0.03, 0.2, wingM, s * 0.15, 0, 0); p.s = s; return p; });
    a.pose = (n, t, c) => {
      const fly = n === 'fly';
      wings.forEach(w => { w.rotation.z = fly ? Math.sin(t * 28) * 0.9 * w.s : -w.s * 1.25; });
      head.rotation.x = fly ? 0 : Math.max(0, Math.sin(c * 1.3)) ** 8 * 0.9;
      g.rotation.x = fly ? -0.2 : 0;
    };
    return a;
  };

  return {
    hero, bird, cat: () => cat({ tails: 1, tags: null }),
    bosses: [windowWithin, janusSeal, lateError, treant, cat, crab, dayPad, testTubes, diffMask],
    names: ['Window Within', 'Janus Seal', 'Late Error', 'Dead-Branch Treant', 'Trilife Cat', 'Handshake Crab', 'Day-Pad Crawler', 'Test-Tube Quartet', 'Diff Mask'],
  };
};
