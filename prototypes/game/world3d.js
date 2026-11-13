// PROTOTYPE. The portfolio as a small 3D game: walk a night town, open each section by
// visiting its landmark, cross the bridge and replay the Raid Log as boss fights.
// World and characters are all 3D (three.js): world3d-build.js makes the town, world3d-models.js the cast.
// Loads after game.js (XP, quests, console) and reuses the real page's sections as panels.
(() => {
  const T = window.THREE, D = window.W3D_DATA, Mo = window.W3D_models, G = window.gpGame, body = document.body;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const $ = (s, r = document) => r.querySelector(s);

  // one link flips between the world and the plain page
  const wants3d = body.classList.contains('w3d');
  const modeLink = el('a', 'w3d-mode', wants3d ? 'TEXT MODE' : '◆ ENTER 3D WORLD');
  modeLink.href = (wants3d ? '?mode=text' : '?') + location.hash;
  const toText = why => { body.classList.remove('w3d'); modeLink.textContent = '◆ ENTER 3D WORLD'; modeLink.href = '?' + location.hash; body.append(modeLink); if (why) console.warn('[world3d] ' + why); };
  if (!wants3d) return void body.append(modeLink);
  if (!T || !D || !Mo || !G) return toText('missing three.js, boss data, models or game layer');

  const canvas = el('canvas', 'w3d-canvas');
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, powerPreference: 'high-performance' }); } catch (e) { return toText('WebGL unavailable: ' + e.message); }
  body.prepend(canvas);

  const { S, save, gain, reduced, entries } = G;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = k => 1 - (1 - k) ** 3;
  S.shards ||= [];

  start();

  function start() {
    const W = window.W3D_buildWorld(T), scene = W.scene;
    const camera = new T.PerspectiveCamera(38, 1, 0.5, 900);
    renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.NeutralToneMapping;
    const composer = new T.EffectComposer(renderer, new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: coarse ? 0 : 4 }));
    composer.addPass(new T.RenderPass(scene, camera));
    composer.addPass(new T.UnrealBloomPass(new T.Vector2(1, 1), 0.72, 0.5, 1));
    composer.addPass(new T.OutputPass());

    // ================= characters =================
    const MODELS = Mo(T), actors = [];
    const spawn = (a, x = 0, y = 0, z = 0, scale = 1) => { a.obj.position.set(x, y, z); a.obj.scale.setScalar(scale); scene.add(a.obj); actors.push(a); return a; };

    // ================= particles =================
    const PN = 260, pPos = new Float32Array(PN * 3).fill(-999), pCol = new Float32Array(PN * 3), pVel = [], pLife = new Float32Array(PN), pBase = [];
    for (let i = 0; i < PN; i++) { pVel.push([0, 0, 0]); pBase.push([0, 0, 0]); }
    const pGeo = new T.BufferGeometry();
    pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new T.BufferAttribute(pCol, 3));
    const pPoints = new T.Points(pGeo, new T.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    pPoints.frustumCulled = false; scene.add(pPoints);
    let pNext = 0;
    const tmpC = new T.Color();
    const burst = (x, y, z, color, n = 16, speed = 4, up = 2) => {
      tmpC.set(color).multiplyScalar(2.4);
      for (let k = 0; k < n; k++) {
        const i = pNext = (pNext + 1) % PN, a = Math.random() * 6.28, e = Math.random() * 1.6 - 0.5, s = speed * (0.4 + Math.random() * 0.8);
        pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
        pVel[i] = [Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + up, Math.sin(a) * Math.cos(e) * s];
        pBase[i] = [tmpC.r, tmpC.g, tmpC.b]; pLife[i] = 0.5 + Math.random() * 0.5;
      }
    };
    const updateParticles = dt => {
      for (let i = 0; i < PN; i++) {
        if (pLife[i] <= 0) continue;
        pLife[i] -= dt; const v = pVel[i], k = clamp(pLife[i] * 2.2, 0, 1);
        v[1] -= 7 * dt;
        pPos[i * 3] += v[0] * dt; pPos[i * 3 + 1] += v[1] * dt; pPos[i * 3 + 2] += v[2] * dt;
        pCol[i * 3] = pBase[i][0] * k; pCol[i * 3 + 1] = pBase[i][1] * k; pCol[i * 3 + 2] = pBase[i][2] * k;
        if (pLife[i] <= 0) pPos[i * 3 + 1] = -999;
      }
      pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = true;
    };

    // ================= tweens =================
    const tweens = [];
    let skipAll = false;
    const tween = (ms, fn) => new Promise(res => { if (skipAll || reduced) { fn(1); return res(); } tweens.push({ t: 0, d: ms / 1000, fn, res }); });
    const wait = ms => skipAll ? Promise.resolve() : G.sleep(ms);
    const updateTweens = dt => {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const w = tweens[i]; w.t += dt;
        const k = skipAll ? 1 : Math.min(1, w.t / w.d);
        w.fn(k);
        if (k >= 1) { tweens.splice(i, 1); w.res(); }
      }
    };

    // ================= player =================
    const hero = spawn(MODELS.hero({ xray: true }));
    const player = { x: 0, z: 10.5, y: 0, vy: 0, yaw: 0 };
    const lamp = new T.PointLight(0xffc98a, 40, 15, 1.7);   // carried light. Kept high and ahead: any closer and it burns the hero white
    scene.add(lamp);
    let mode = 'world';   // 'world' | 'panel' | 'battle'

    const inRegion = (r, x, z) => r.r ? Math.hypot(x - r.x, z - r.z) <= r.r : x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
    const intoRegions = (x, z) => {
      if (W.regions.some(r => inRegion(r, x, z))) return [x, z];
      let best, bd = 1e9;
      for (const r of W.regions) {
        let px, pz;
        if (r.r) { const d = Math.hypot(x - r.x, z - r.z) || 1; px = r.x + (x - r.x) / d * r.r; pz = r.z + (z - r.z) / d * r.r; }
        else { px = clamp(x, r.x0, r.x1); pz = clamp(z, r.z0, r.z1); }
        const d = Math.hypot(px - x, pz - z);
        if (d < bd) { bd = d; best = [px, pz]; }
      }
      return best;
    };
    const PR = 0.45;
    const collide = (x, z) => {
      [x, z] = intoRegions(x, z);
      for (let pass = 0; pass < 3; pass++) for (const c of W.colliders) {
        if (c.r) {
          const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), min = c.r + PR;
          if (d < min) { const k = d ? min / d : 1; x = c.x + (d ? dx : min) * k; z = c.z + dz * k; }
        } else if (x > c.x0 - PR && x < c.x1 + PR && z > c.z0 - PR && z < c.z1 + PR) {
          const l = x - (c.x0 - PR), r = (c.x1 + PR) - x, t = z - (c.z0 - PR), b = (c.z1 + PR) - z, m = Math.min(l, r, t, b);
          if (m === l) x = c.x0 - PR; else if (m === r) x = c.x1 + PR; else if (m === t) z = c.z0 - PR; else z = c.z1 + PR;
        }
      }
      return intoRegions(x, z);
    };

    // ================= things in the world =================
    const zoneName = id => (G.ZONES.find(z => z.id === id) || {}).name || id;
    const interactables = [];
    // zone pads: a ring at every door, blue until the zone has been read
    const padGeo = new T.RingGeometry(1, 1.16, 40);
    W.spots.forEach(s => {
      s.name = zoneName(s.id);
      s.prompt = () => `${s.verb} ${s.name}`;
      s.act = () => openPanel(s.id);
      if (s.id !== 'status') {
        s.pad = new T.Mesh(padGeo, new T.MeshBasicMaterial({ transparent: true, depthWrite: false }));
        s.pad.rotation.x = -Math.PI / 2; s.pad.position.set(s.x, 0.06, s.z); scene.add(s.pad);
      }
      interactables.push(s);
    });

    // bosses, standing on their pedestals around the arena
    const STAGE = { x: W.ARENA.x, z: W.ARENA.z + 5 };
    const stageLight = new T.PointLight(0xdfe8ff, 0, 34, 1.5);   // only lit during a fight
    stageLight.position.set(STAGE.x, 6.5, STAGE.z + 8); scene.add(stageLight);
    const bosses = D.bosses.map((b, i) => {
      b.name = MODELS.names[i];
      const slot = W.bossSlots[i], spr = spawn(MODELS.bosses[i]());
      const gem = W.add(scene, new T.OctahedronGeometry(0.34), W.glow(0xd9b45b, 2.8), slot.x, 5.6, slot.z);
      const o = { i, b, spr, slot, gem, x: slot.x, z: slot.z, r: 4.2 };
      o.prompt = () => `${S.raids.includes(i) ? 'Rematch' : 'Fight'} ${b.name}`;
      o.act = () => fight(i);
      interactables.push(o);
      return o;
    });
    const placeBosses = () => bosses.forEach(o => {
      const done = S.raids.includes(o.i);
      o.spr.obj.position.set(o.slot.x, 0.36, o.slot.z); o.spr.obj.visible = true;
      o.spr.u.uDissolve.value = 0; o.spr.u.uFlash.value = 0;
      o.spr.u.uTint.value.setRGB(...(done ? [0.34, 0.4, 0.56] : [1, 1, 1]));
      o.spr.rate = done ? 0.35 : 1;
      o.gem.visible = done;
      o.spr.play('idle'); o.spr.face(0, true);
    });
    placeBosses();
    G.BOSSES.push(...D.bosses);   // the quest log and the console read names from here
    G.ENC.push(...bosses.map(o => ({ fight: () => fight(o.i) })));

    // data shards: small pickups scattered off the paths
    const shardGeo = new T.OctahedronGeometry(0.3);
    const shards = W.shardSpots.map(([x, z], i) => {
      const m = W.add(scene, shardGeo, W.glow(0x7fd0ff, 2.6), x, 1.1, z);
      m.scale.y = 1.6; m.visible = !S.shards.includes(i);
      return { m, x, z, i };
    });

    // the cat
    spawn(MODELS.cat(), -4.6, 0, 11, 0.34).face(0.5, true);
    const CAT_LINES = ['Mrrp.', 'The cat has read your diff. No comments.', 'It stares at something only it can see. Probably a race condition.', 'isNaN(cat) is true. Try the console.'];
    let catLine = -1, catUntil = 0;
    interactables.push({ x: -4.6, z: 11, r: 2.1, prompt: () => 'Pet the cat', act: () => {
      catLine = (catLine + 1) % CAT_LINES.length; catUntil = clock + 3.4; catLabel.el.textContent = CAT_LINES[catLine];
      burst(-4.6, 1.3, 11, 0xff8fb0, 6, 1.2, 1.6);
      if (!S.cat) { S.cat = 1; save(); gain(5, 'Pet the cat'); }
    } });
    W.colliders.push({ x: -4.6, z: 11, r: 0.4 });

    // birds on the roofs: they leave when you get close and come back later
    const birds = W.perches.map(([x, y, z], i) => {
      const s = spawn(MODELS.bird(), x, y, z, 0.9); s.face(i % 2 ? 0.7 : -0.7, true);
      return { s, home: [x, y, z], away: 0, dir: i % 2 ? 1 : -1 };
    });

    // ================= DOM: HUD, labels, panel chrome, battle =================
    const hud = el('div', 'w3d-hud');
    hud.innerHTML = `
      <div class="w3d-card">
        <canvas class="w3d-face" width="96" height="96"></canvas>
        <div class="w3d-who"><span class="w3d-name">VISITOR</span><span class="w3d-lv"></span></div>
        <div class="w3d-xp"><i></i></div>
        <div class="w3d-stats"></div>
        <div class="w3d-worldline"></div>
      </div>
      <div class="w3d-top">
        <button type="button" data-a="q">QUESTS <kbd>Q</kbd></button>
        <button type="button" data-a="c">CONSOLE <kbd>/</kbd></button>
      </div>
      <canvas class="w3d-map" width="96" height="158"></canvas>
      <div class="w3d-prompt"></div>
      <div class="w3d-keys">WASD move · SHIFT run · SPACE jump · E interact</div>
      <div class="w3d-stick"><i></i></div>
      <div class="w3d-pad"><button type="button" data-a="jump">JUMP</button><button type="button" data-a="act">E</button></div>
      <div class="w3d-proto"><b>PROTOTYPE</b> · 3D world · progress saves in this browser only</div>`;
    const labelsEl = el('div', 'w3d-labels'), fade = el('div', 'w3d-fade');
    const closeBtn = el('button', 'w3d-close', '✕ BACK TO THE WORLD <kbd>ESC</kbd>'); closeBtn.type = 'button';
    const bt = el('div', 'w3d-battle');
    bt.innerHTML = `
      <div class="w3d-foe"><div class="w3d-foe-top"><span class="tag"></span><b></b><span class="story"></span></div><div class="w3d-bar"><i></i></div><span class="hp"></span></div>
      <div class="w3d-you"><span>YOU</span><div class="w3d-bar"><i></i></div></div>
      <div class="w3d-dialog win on"><div class="bar"><span class="who"></span><span class="dot turn"></span></div>
        <div class="body"><p class="txt"></p><span class="next">▼ <kbd>SPACE</kbd></span></div></div>
      <button type="button" class="w3d-skip">SKIP FIGHT ▸</button>`;
    hud.querySelector('.w3d-top').append(modeLink);
    body.append(labelsEl, hud, bt, closeBtn, fade);
    const appEl = $('.app'), raidSec = $('#raid-log');

    hud.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      b.blur();
      ({ q: G.openQuests, c: G.openCmd, jump, act: () => mode === 'battle' ? confirm() : interact() })[b.dataset.a]();
    });

    // labels are DOM nodes pinned to a world position each frame
    const labels = [], v3 = new T.Vector3();
    const label = (cls, html, pos, show = () => true) => { const l = { el: el('div', 'w3d-label ' + cls, html), pos, show }; labelsEl.append(l.el); labels.push(l); return l; };
    W.spots.forEach(s => { s.plaque = label('w3d-plaque', '', new T.Vector3(...s.label)); });
    bosses.forEach(o => { o.plate = label('w3d-plate', '', new T.Vector3(o.slot.x, 5, o.slot.z), () => Math.hypot(player.x - o.slot.x, player.z - o.slot.z) < 8.5); });
    const catLabel = label('w3d-bubble', '', new T.Vector3(-4.6, 1.7, 11), () => clock < catUntil);
    const refreshLabels = () => {
      W.spots.forEach(s => {
        const seen = S.zones.includes(s.id);
        s.plaque.el.classList.toggle('seen', seen);
        s.plaque.el.innerHTML = `<span>${seen ? '✓' : '!'}</span>${s.name}`;
        if (s.pad) s.pad.material.color.set(seen ? 0xd9b45b : 0x4da3ff).multiplyScalar(seen ? 1.1 : 2.4);
      });
      bosses.forEach(o => {
        const done = S.raids.includes(o.i);
        o.plate.el.classList.toggle('seen', done);
        o.plate.el.innerHTML = `<b>${o.b.name}</b><small>${done ? 'CLEARED ✓' : `${o.b.hp.toLocaleString()} ${o.b.unit}`}</small>`;
      });
    };
    const floatText = (text, x, y, z, cls = '') => {
      const l = label('w3d-float ' + cls, text, new T.Vector3(x, y, z));
      const t0 = clock; l.rise = () => { l.pos.y = y + (clock - t0) * 1.3; };
      setTimeout(() => { l.el.remove(); labels.splice(labels.indexOf(l), 1); }, 1200);
    };

    // HUD numbers: cheap to rebuild, so rebuild whenever the save changes
    // the portrait is one render of the hero's head, copied into a 2D canvas
    (() => {
      const N = 96, rt = new T.WebGLRenderTarget(N, N), ps = new T.Scene(), pc = new T.PerspectiveCamera(30, 1, 0.1, 20), h = MODELS.hero();
      const key = new T.DirectionalLight(0xffffff, 2); key.position.set(2, 3, 4);
      ps.background = new T.Color(0x0b1326); ps.add(h.obj, key, new T.HemisphereLight(0xffffff, 0x334466, 2.2));
      h.face(0.45, true); h.update(0.016);
      pc.position.set(0, 2.08, 3.3); pc.lookAt(0, 2, 0);
      renderer.setRenderTarget(rt); renderer.render(ps, pc);
      const px = new Uint8Array(N * N * 4); renderer.readRenderTargetPixels(rt, 0, 0, N, N, px);
      renderer.setRenderTarget(null); rt.dispose();
      // the target is linear and bottom-up; the canvas wants sRGB and top-down
      const ctx = $('.w3d-face', hud).getContext('2d'), im = ctx.createImageData(N, N);
      for (let i = 0; i < N * N; i++) { const src = ((N - 1 - Math.floor(i / N)) * N + i % N) * 4; for (let c = 0; c < 3; c++) im.data[i * 4 + c] = 255 * (px[src + c] / 255) ** (1 / 2.2); im.data[i * 4 + 3] = 255; }
      ctx.putImageData(im, 0, 0);
    })();
    let hudSig = '';
    const refreshHud = () => {
      const sig = [S.xp, S.zones.length, S.raids.length, S.shards.length, S.ach.length].join();
      if (sig === hudSig) return; hudSig = sig;
      $('.w3d-lv', hud).textContent = 'LV. ' + G.levelFor(S.xp);
      $('.w3d-xp i', hud).style.width = (S.xp % 200) / 2 + '%';
      $('.w3d-stats', hud).innerHTML = `ZONES <b>${S.zones.length}/${G.ZONES.length}</b> · RAIDS <b>${S.raids.length}/${bosses.length}</b> · SHARDS <b>${S.shards.length}/${shards.length}</b>`;
      $('.w3d-worldline', hud).innerHTML = `${G.world.players.toLocaleString()} players · ${G.world.clearedAll} full clears <span class="gp-mock">MOCK</span>`;
      refreshLabels();
    };

    // minimap
    const map = $('.w3d-map', hud).getContext('2d');
    const mx = x => (x + 36) * (96 / 72), mz = z => (z + 83) * (158 / 119);
    const drawMap = () => {
      map.clearRect(0, 0, 96, 158);
      const disc = (c, col) => { map.fillStyle = col; map.beginPath(); map.arc(mx(c.x), mz(c.z), c.r * 96 / 72, 0, 6.2832); map.fill(); };
      disc(W.MAIN, 'rgba(30,58,102,.75)'); disc(W.ARENA, 'rgba(90,30,50,.75)');
      map.fillStyle = 'rgba(90,70,60,.9)'; map.fillRect(mx(-1.4), mz(-48), 2.8 * 96 / 72, 15 * 158 / 119);
      const dot = (x, z, col, s = 3) => { map.fillStyle = col; map.fillRect(Math.round(mx(x) - s / 2), Math.round(mz(z) - s / 2), s, s); };
      shards.forEach(s => s.m.visible && dot(s.x, s.z, '#7fd0ff', 2));
      W.spots.forEach(s => dot(s.x, s.z, S.zones.includes(s.id) ? '#d9b45b' : '#4da3ff', 4));
      bosses.forEach(o => dot(o.slot.x, o.slot.z, S.raids.includes(o.i) ? '#6d829e' : '#ff5d6c'));
      dot(player.x, player.z, '#fff', 4);
    };

    // ================= panels: the real page sections, opened over the world =================
    function openPanel(id, entry = null) {
      if (mode === 'battle') return;
      mode = 'panel'; keys.clear(); stick.x = stick.y = 0;
      body.classList.add('w3d-panel');   // before the section switches, so game.js counts the zone
      raidSec.classList.toggle('w3d-one', entry != null);
      entries.forEach((e, i) => e.classList.toggle('w3d-show', i === entry));
      (G.ZONES.find(z => z.id === id) || G.ZONES[0]).link.click();
      appEl.scrollTop = 0;
    }
    function closePanel() {
      if (mode !== 'panel') return;
      body.classList.remove('w3d-panel'); mode = 'world';
    }
    closeBtn.onclick = closePanel;
    appEl.addEventListener('pointerdown', e => { if (e.target === appEl || e.target === $('.main')) closePanel(); });

    // console and quest log send the player to the place instead of swapping the section
    G.travel = (kind, id, engage) => {
      if (mode === 'battle') return;
      closePanel();
      const t = kind === 'zone' ? W.spots.find(s => s.id === id) : bosses[id];
      if (!t) return;
      [player.x, player.z] = collide(t.x, t.z + (kind === 'zone' ? 0.8 : 4.4));
      player.yaw = Math.PI; hero.face(Math.PI, true); cam.snap = true;
      if (kind === 'zone') setTimeout(() => openPanel(id), 450);
      else if (engage) setTimeout(() => fight(id), 450);
    };
    G.COMMANDS.text = () => { location.href = modeLink.href; };
    G.COMMANDS.shards = () => G.print(`Data shards: ${S.shards.length}/${shards.length}. They are off the paths.`);

    // ================= battles: the Raid Log, replayed turn by turn =================
    const dWho = $('.who', bt), dTxt = $('.txt', bt), dNext = $('.next', bt), dTurn = $('.turn', bt);
    let typed = true, full = '', typeTimer, waiter = null, shake = 0, freeze = 0;
    const endType = () => { clearInterval(typeTimer); dTxt.textContent = full; typed = true; };
    const say = (who, text, cls = '') => {
      dWho.textContent = `⟨ ${who} ⟩`; bt.dataset.who = cls; full = text; typed = false; dTxt.textContent = '';
      clearInterval(typeTimer);
      if (skipAll || reduced) return endType();
      let n = 0; typeTimer = setInterval(() => { n += 2; dTxt.textContent = text.slice(0, n); if (n >= text.length) endType(); }, 22);
    };
    function confirm() {
      if (!typed) return endType();
      if (waiter) { const w = waiter; waiter = null; w(); }
    }
    const next = () => skipAll ? Promise.resolve() : new Promise(res => { waiter = res; dNext.classList.add('on'); }).then(() => dNext.classList.remove('on'));
    const skipFight = () => { skipAll = true; endType(); confirm(); };
    $('.w3d-dialog', bt).addEventListener('click', confirm);
    $('.w3d-skip', bt).addEventListener('click', e => { e.currentTarget.blur(); skipFight(); });
    const fadeTo = on => { fade.classList.toggle('on', on); return new Promise(r => setTimeout(r, reduced ? 0 : 300)); };
    const setBar = (sel, k) => { $(sel + ' .w3d-bar i', bt).style.width = clamp(k, 0, 1) * 100 + '%'; };

    async function fight(i) {
      if (mode !== 'world') return;
      mode = 'battle'; keys.clear(); stick.x = stick.y = 0; skipAll = false;
      const o = bosses[i], b = o.b, foe = o.spr, sep = battleSep(), hx = STAGE.x - sep, fx = STAGE.x + sep - 0.2, z = STAGE.z;
      let hp = b.hp, mine = 1;
      const once = (a, name) => skipAll ? (a.play(a.rest), Promise.resolve()) : a.once(name);
      const setHp = () => { setBar('.w3d-foe', hp / b.hp); $('.w3d-foe .hp', bt).textContent = `${hp.toLocaleString()} / ${b.hp.toLocaleString()} ${b.unit}`; };

      await fadeTo(true);
      // stage both fighters: hero on the left facing right, boss on the right
      player.x = hx; player.z = z; player.y = 0;
      hero.rest = 'battle'; hero.play('battle'); hero.face(1.15, true); foe.face(-0.5, true); stageLight.intensity = 110;
      bosses.forEach(s => { s.spr.u.uTint.value.setRGB(0.2, 0.22, 0.34); s.gem.visible = false; });   // the others watch from the dark
      foe.obj.position.set(fx, 0, z); foe.u.uTint.value.setRGB(1, 1, 1); foe.rate = 1;
      $('.w3d-foe .tag', bt).textContent = b.tag; $('.w3d-foe b', bt).textContent = b.name; $('.w3d-foe .story', bt).textContent = b.title;
      setHp(); setBar('.w3d-you', 1); dTurn.textContent = '';
      body.classList.add('w3d-fighting'); cam.snap = true;
      say('SYSTEM', `${b.name} appears! ${b.hp.toLocaleString()} ${b.unit}.`, 'sys');
      await fadeTo(false);
      await next();

      const bossTurns = b.moves.filter(m => m.w === 'b').length;
      for (const [n, m] of b.moves.entries()) {
        dTurn.textContent = `TURN ${n + 1}/${b.moves.length}`;
        if (m.w === 'h') {
          say('YOU', m.text, 'you');
          const done = once(hero, m.crit ? 'special' : 'attack');
          await wait(m.crit ? 560 : 250);
          // the bolt
          const orb = W.add(scene, new T.SphereGeometry(m.crit ? 0.34 : 0.22, 10, 8), W.glow(m.crit ? 0xffd76a : 0x7fd0ff, 3.4), hx + 1.6, 1.7, z);
          await tween(m.crit ? 260 : 200, k => { orb.position.x = hx + 1.6 + (fx - 0.8 - hx - 1.6) * k; orb.position.y = 1.7 + Math.sin(k * Math.PI) * 0.7; if (Math.random() < 0.6) burst(orb.position.x, orb.position.y, z, m.crit ? 0xffd76a : 0x7fd0ff, 1, 0.8, 0.4); });
          scene.remove(orb);
          if (m.dmg > 0) {
            hp = Math.max(0, hp - m.dmg); setHp();
            floatText(m.crit ? `CRIT −${m.dmg.toLocaleString()}` : `−${m.dmg.toLocaleString()}`, fx, 3.6, z, m.crit ? 'crit' : 'dmg');
            burst(fx, 1.8, z + 0.2, m.crit ? 0xffd76a : b.aura, m.crit ? 46 : 20, m.crit ? 7 : 4.5);
            foe.u.uFlash.value = 1; freeze = m.crit ? 0.11 : 0.06; if (!reduced) shake = m.crit ? 0.5 : 0.22;
            tween(280, k => { foe.u.uFlash.value = 1 - k; foe.obj.position.x = fx + Math.sin(k * Math.PI) * 0.5; });
          } else {
            floatText(m.miss || 'NO EFFECT', fx, 3.6, z, 'miss');
          }
          await done;
        } else {
          say(b.name.toUpperCase(), m.text, 'foe');
          const done = once(foe, 'attack');
          await tween(380, k => { foe.obj.position.x = fx - ease(k) * 3.2; });
          mine = Math.max(0.12, mine - 0.6 / bossTurns); setBar('.w3d-you', mine);
          hero.u.uFlash.value = 1; if (!reduced) shake = 0.3; freeze = 0.06;
          burst(hx + 0.6, 1.4, z + 0.2, b.aura, 14, 4);
          once(hero, 'hurt');
          tween(260, k => { hero.u.uFlash.value = 1 - k; });
          if (m.dmg < 0) {   // the boss undoes your progress
            hp = Math.min(b.hp, hp - m.dmg); setHp();
            floatText(`+${(-m.dmg).toLocaleString()} RESTORED`, fx - 3.4, 3.8, z, 'heal');
          }
          await tween(320, k => { foe.obj.position.x = fx - 3.2 + ease(k) * 3.2; });
          await done;
        }
        await next();
      }

      // death, loot
      say('SYSTEM', 'RAID CLEARED. The loot drops.', 'sys'); dTurn.textContent = 'VICTORY';
      hp = 0; setHp(); if (!reduced) shake = 0.4;
      await tween(1100, k => { foe.u.uDissolve.value = k; if (Math.random() < 0.5) burst(fx + (Math.random() - 0.5) * 2.4, 0.4 + Math.random() * 2.8, z, b.aura, 2, 1.5, 2.4); });
      foe.obj.visible = false;
      hero.play('victory');
      const loot = W.add(scene, new T.OctahedronGeometry(0.42), W.glow(0xd9b45b, 3.2), fx, 4.5, z); loot.scale.y = 1.4;
      await tween(520, k => { loot.position.y = 4.5 - (1 - (1 - k) ** 2) * 3.2; loot.rotation.y = k * 6; });
      burst(fx, 1.3, z, 0xd9b45b, 18, 3);
      await next();
      await tween(380, k => { loot.position.x = fx + (hx - fx) * ease(k); loot.position.y = 1.3 + Math.sin(k * Math.PI) * 1.6; loot.rotation.y += 0.3; });
      burst(hx, 1.4, z, 0xd9b45b, 24, 4); scene.remove(loot);
      await wait(260);

      const first = !S.raids.includes(i);
      if (first) { S.raids.push(i); save(); }
      await fadeTo(true);
      skipAll = false; waiter = null;
      body.classList.remove('w3d-fighting');
      hero.rest = 'idle'; hero.play('idle'); player.yaw = 0; hero.face(0, true); hero.u.uFlash.value = 0; stageLight.intensity = 0;
      [player.x, player.z] = collide(o.slot.x * 0.62, STAGE.z + 3);
      placeBosses(); refreshLabels(); cam.snap = true;
      mode = 'world';
      await fadeTo(false);
      if (first) gain(120, `Raid cleared: ${b.name}`);
      openPanel('raid-log', i);   // the loot is the real story
    }

    // ================= input =================
    const keys = new Set(), MOVE = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift']);
    const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    const intro = $('#intro'), introOpen = () => intro && !intro.classList.contains('hide');
    let near = null;
    const interact = () => { if (mode === 'world' && near) near.act(); };
    function jump() { if (mode === 'world' && player.y === 0) player.vy = 7.4; }
    addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target.closest && e.target.closest('input, textarea'))) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key, go = k === 'e' || k === 'Enter' || k === ' ';
      if (introOpen()) { if (go) intro.click(); return; }
      if (G.anyOpen()) return;                       // quest log or console is up: game.js owns the keys
      if (mode === 'panel') { if (k === 'Escape') closePanel(); return; }
      if (mode === 'battle') { if (go) { e.preventDefault(); confirm(); } else if (k === 'Escape') skipFight(); return; }
      if (MOVE.has(k)) { keys.add(k); if (k !== 'Shift') e.preventDefault(); }
      else if (k === 'e' || k === 'Enter') { e.preventDefault(); interact(); }
      else if (k === ' ') { e.preventDefault(); jump(); }
    }, true);
    addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
    addEventListener('blur', () => keys.clear());
    // touch: drag anywhere on the left side for a joystick
    const stickEl = $('.w3d-stick', hud);
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || stick.id != null || mode !== 'world') return;
      stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY;
      stickEl.style.cssText = `display:block;left:${e.clientX}px;top:${e.clientY}px`;
    });
    addEventListener('pointermove', e => {
      if (e.pointerId !== stick.id) return;
      const dx = e.clientX - stick.ox, dy = e.clientY - stick.oy, d = Math.hypot(dx, dy), k = Math.min(1, d / 48) / (d || 1);
      stick.x = dx * k; stick.y = dy * k;
      stickEl.firstElementChild.style.transform = `translate(${stick.x * 34}px, ${stick.y * 34}px)`;
    });
    const stickEnd = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; stickEl.style.display = 'none'; };
    addEventListener('pointerup', stickEnd); addEventListener('pointercancel', stickEnd);

    // ================= camera =================
    const cam = { tx: player.x, tz: player.z, oy: 15, oz: 24, ly: 1.2, snap: true };
    let aspectZoom = 1;
    // on a tall screen the fighters stand closer together
    const battleSep = () => camera.aspect < 0.8 ? 3.3 : 5;
    const resize = () => {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      aspectZoom = clamp(1.3 / camera.aspect, 1, 1.9);   // pull back on tall screens so the same width stays in view
    };
    addEventListener('resize', resize); resize();
    const updateCamera = dt => {
      const battle = mode === 'battle', arena = player.z < -47;
      const goal = battle ? { tx: STAGE.x, tz: STAGE.z, oy: 3.4, oz: 17.5, ly: 1.9 }
        : arena ? { tx: player.x * 0.55, tz: player.z, oy: 14, oz: 26, ly: 1.2 }
        : { tx: player.x, tz: player.z, oy: 15, oz: 24, ly: 1.2 };
      const k = cam.snap ? 1 : 1 - Math.exp(-dt * 5.5); cam.snap = false;
      for (const p in goal) cam[p] += (goal[p] - cam[p]) * k;
      const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
      shake *= Math.exp(-dt * 9);
      // a narrow screen needs a wider battle view. Backing off alone would put the camera behind the gate,
      // so past 1.4x the rest comes from a wider lens.
      let zoom = aspectZoom, fov = 38;
      if (battle) { const need = Math.max(1, (battleSep() + 3) / (6.02 * camera.aspect)); zoom = Math.min(need, 1.4); fov = 2 * Math.atan(0.3443 * need / zoom) * 57.2958; }
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
      camera.position.set(cam.tx + sx, cam.oy * zoom + sy, cam.tz + cam.oz * zoom);
      camera.lookAt(cam.tx + sx, cam.ly + sy, cam.tz);
      // one shadow box per island: no shimmer, since the light only moves when you cross the bridge
      const c = arena ? W.ARENA : W.MAIN;
      W.sun.target.position.set(c.x, 0, c.z); W.sun.position.set(c.x - 26, 46, c.z + 22);
    };

    // ================= frame =================
    let clock = 0, last = performance.now(), frameN = 0, enteredArena = false;
    const promptEl = $('.w3d-prompt', hud);
    promptEl.addEventListener('click', interact);
    const frame = now => {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (document.hidden) return;
      clock += dt; frameN++;

      if (mode === 'world' && !introOpen() && !G.anyOpen()) {
        let ix = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0) + stick.x;
        let iz = (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) + stick.y;
        const len = Math.hypot(ix, iz);
        if (len > 1) { ix /= len; iz /= len; }
        const moving = len > 0.12;
        if (moving) {
          const sp = keys.has('Shift') ? 11.5 : 7.2;
          [player.x, player.z] = collide(player.x + ix * sp * dt, player.z + iz * sp * dt);
          player.yaw = Math.atan2(ix, iz);
        }
        hero.play(player.y > 0 ? 'air' : moving ? (keys.has('Shift') ? 'run' : 'walk') : 'idle');
        hero.face(player.yaw);
        if (player.y > 0 || player.vy > 0) { player.vy -= 22 * dt; player.y = Math.max(0, player.y + player.vy * dt); if (player.y === 0) { player.vy = 0; burst(player.x, 0.15, player.z, 0x8fb6ff, 5, 1.4, 0.6); } }

        // pickups
        for (const s of shards) if (s.m.visible && Math.hypot(player.x - s.x, player.z - s.z) < 1.3) {
          s.m.visible = false; S.shards.push(s.i); save(); burst(s.x, 1.2, s.z, 0x7fd0ff, 22, 3.5);
          gain(10, `Data shard ${S.shards.length}/${shards.length}`);
          if (S.shards.length === shards.length) G.toast('ALL SHARDS FOUND', 'You walked the whole map.', { ico: '◈' });
        }
        // nearest thing to interact with
        near = null; let nd = 1e9;
        for (const t of interactables) { const d = Math.hypot(player.x - t.x, player.z - t.z); if (d < t.r && d < nd) { nd = d; near = t; } }
        if (!enteredArena && player.z < -48.5) { enteredArena = true; G.toast('RAID ARENA', 'Nine bosses. Each one is a real war story.', { ico: '⚔' }); }
      } else {
        if (mode !== 'world') near = null;
        if (mode !== 'battle') hero.play('idle');   // a panel or overlay opened mid-stride
      }
      const p = near ? near.prompt() : '';
      if (promptEl.dataset.p !== p) { promptEl.dataset.p = p; promptEl.innerHTML = p ? `<kbd>E</kbd> ${p}` : ''; promptEl.classList.toggle('on', !!p); }

      // world animation
      for (const f of W.tick) f(clock, dt);
      shards.forEach((s, i) => { s.m.rotation.y = clock * 1.6 + i; s.m.position.y = 1.1 + Math.sin(clock * 2 + i) * 0.16; });
      bosses.forEach((o, i) => { o.gem.rotation.y = clock * 1.4; o.gem.position.y = 5.6 + Math.sin(clock * 1.8 + i) * 0.14; });
      W.spots.forEach((s, i) => { if (s.pad) { const k = 1 + Math.sin(clock * 2.4 + i) * 0.06; s.pad.scale.set(k, k, 1); s.pad.material.opacity = near === s ? 1 : 0.7; } });
      for (const b of birds) {
        const [hx, hy, hz] = b.home, o = b.s.obj;
        if (!b.away && Math.hypot(player.x - hx, player.z - hz) < 6) { b.away = clock; b.s.play('fly'); b.s.face(b.dir * 1.9); }
        if (b.away) {
          const t = clock - b.away;
          o.position.set(hx + b.dir * t * 5, hy + t * 2.6, hz - t * 2); o.visible = t < 4;
          if (t > 14 && Math.hypot(player.x - hx, player.z - hz) > 9) { b.away = 0; o.position.set(hx, hy, hz); o.visible = true; b.s.play('idle'); b.s.face(-b.dir * 0.7); }
        }
      }

      // characters
      hero.obj.position.set(player.x, player.y, player.z);
      lamp.position.set(player.x, 3.6, player.z + 2.3);
      freeze = Math.max(0, freeze - dt);
      const adt = freeze > 0 ? 0 : dt;
      for (const a of actors) a.update(adt);
      updateTweens(adt); updateParticles(dt);
      updateCamera(dt);

      // labels
      const w = innerWidth, h = innerHeight, showLabels = mode === 'world' && !introOpen();
      for (const l of labels) {
        if (l.rise) l.rise();
        v3.copy(l.pos).project(camera);
        const on = (showLabels || l.rise) && l.show() && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
        l.el.style.display = on ? '' : 'none';
        if (on) l.el.style.transform = `translate(-50%, -100%) translate(${((v3.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px)`;
      }
      refreshHud();
      if (frameN % 6 === 0) drawMap();
      composer.render(dt);
    };
    refreshLabels();
    requestAnimationFrame(frame);

    // small surface for the console, tests and anyone poking around in devtools
    window.W3D = { player, bosses, fight, openPanel, closePanel, confirm, skipFight, get mode() { return mode; }, warp: (x, z) => { [player.x, player.z] = collide(x, z); cam.snap = true; } };
  }
})();
