// PROTOTYPE Raid Log battles. Throwaway. The battle engine only: every
// sprite, arena and effect palette comes from raid-sprites.js.
(() => {
  const G = window.gpGame, RS = window.RaidSprites;
  if (!G || !RS) return; // game layer is off
  const { S, save, gain, reduced, el, $, entries, activeId } = G;
  const { tinted, tintC, tintX, txt, R, hash, ease, rad, hero, BOSSES, drawArena, state, heart, gem, sprite, hurtLayer, diffGhost, dissolveAt, H, GY } = RS;
  const wait = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 90) : ms));

  // =====================================================================
  // battle engine
  // =====================================================================
  class Encounter {
    constructor(entry, i) {
      this.i = i; this.b = BOSSES[i]; this.entry = entry;
      this.cache = new Map();
      this.reset();
      this.cleared = S.raids.includes(i);
      const wrap = el('div', 'gp-enc' + (this.cleared ? ' cleared' : ''));
      wrap.style.setProperty('--aura', this.b.aura);
      wrap.innerHTML = `
        <div class="gp-plates">
          <div class="gp-plate boss"><span class="gp-pn">${this.b.name}</span><span class="gp-seg"><i class="lag"></i><i class="cur"></i></span><span class="gp-pv"></span></div>
          <div class="gp-plate you"><span class="gp-pn">YOU</span><span class="gp-seg"><i class="lag"></i><i class="cur"></i></span></div>
        </div>
        <div class="gp-stage"><canvas aria-label="Pixel art battle against ${this.b.name}"></canvas></div>
        <div class="gp-dlg"><span class="gp-who"></span><p class="gp-say"></p><button type="button" class="gp-act"></button></div>`;
      $('h3', entry).after(wrap);
      Object.assign(this, { wrap, cv: $('canvas', wrap), stage: $('.gp-stage', wrap), who: $('.gp-who', wrap), sayEl: $('.gp-say', wrap), btn: $('.gp-act', wrap) });
      this.ctx = this.cv.getContext('2d');
      this.btn.onclick = () => this.fight();
      this.cv.onclick = () => this.fight();
      this.res = $('.result', entry);
      if (this.res) { this.res.classList.add('gp-loot'); if (this.cleared) this.res.classList.add('got'); }
      if (this.cleared) entry.classList.add('gp-cleared');
      this.idleText();
      this.resize();
      new ResizeObserver(() => this.resize()).observe(this.stage);
      new IntersectionObserver(es => { this.visible = es[0].isIntersecting; }).observe(wrap);
      this.syncHud(true);
    }
    reset() {
      this.st = {}; this.b.init(this.st);
      this.hp = this.b.hp; this.heroHp = 100; this.lagHp = this.b.hp; this.lagHero = 100;
      this.parts = []; this.floats = []; this.fx = [];
      this.clock = 0; this.freezeUntil = 0; this.shake = 0; this.flashUntil = 0; this.heroFlashUntil = 0;
      this.hero = { x: 0, pose: 'idle', from: 0, to: 0, t0: 0, dur: 1 };
      this.boss = { x: 0, kx: 0, lx: 0, lt0: 0, ldur: 0, ldist: 0, phase: 0, after: [] };
      this.dead = false; this.dissolve = -1; this.victory = -1; this.st.bite = 0;
    }
    idleText() {
      this.who.textContent = this.cleared ? 'CLEARED' : 'ENCOUNTER';
      this.sayEl.textContent = this.cleared ? `${this.b.name} was defeated. The loot is yours. Fight it again?` : `${this.b.name} blocks the way. ${this.b.hp.toLocaleString()} ${this.b.unit}.`;
      this.sayEl.classList.add('done');
      this.btn.textContent = this.cleared ? '↻ REPLAY' : '⚔ ENGAGE';
      this.who.className = 'gp-who sys';
    }
    resize() {
      const cw = this.stage.clientWidth || 600;
      let sc = Math.max(1, Math.min(3, Math.round(cw / 165)));
      if (sc > 1 && cw / sc < 150) sc--;
      this.W = Math.ceil(cw / sc); this.sc = sc;
      this.cv.width = this.W; this.cv.height = H;
      this.cv.style.width = this.W * sc + 'px'; this.cv.style.height = H * sc + 'px';
      this.layout();
      this.draw(performance.now());
    }
    layout() {
      const { W, b } = this;
      this.heroX0 = Math.max(0, Math.round(W * 0.07) - 6);
      this.bossX0 = W - b.w - Math.max(4, Math.round(W * 0.05));
    }
    say(who, text) {
      clearInterval(this.typer);
      this.who.textContent = who === 'h' ? 'YOU' : who === 'b' ? this.b.name.toUpperCase() : 'SYSTEM';
      this.who.className = 'gp-who ' + (who === 'h' ? 'hero' : who === 'b' ? 'boss' : 'sys');
      this.sayEl.classList.remove('done');
      if (reduced) { this.sayEl.textContent = text; this.sayEl.classList.add('done'); return; }
      let n = 0; this.sayEl.textContent = '';
      this.typer = setInterval(() => { n += 2; this.sayEl.textContent = text.slice(0, n); if (n >= text.length) { clearInterval(this.typer); this.sayEl.classList.add('done'); } }, 22);
    }
    syncHud(instant) {
      const f = Math.max(0, this.hp / this.b.hp), hf = Math.max(0, this.heroHp / 100);
      const boss = $('.gp-plate.boss', this.wrap), you = $('.gp-plate.you', this.wrap);
      $('.cur', boss).style.width = `${f * 100}%`; $('.cur', you).style.width = `${hf * 100}%`;
      const lag = () => { $('.lag', boss).style.width = `${f * 100}%`; $('.lag', you).style.width = `${hf * 100}%`; };
      if (instant) lag(); else setTimeout(lag, 420);
      const shown = this.cleared && !this.busy && !this.victoryShown ? this.b.hp : Math.max(0, this.hp);
      $('.gp-pv', this.wrap).textContent = `${shown.toLocaleString()} ${this.b.unit}`;
    }
    // ---------- helpers for the fight script ----------
    heroTo(x, dur, pose) { const h = this.hero; h.from = h.x; h.to = x; h.t0 = this.clock; h.dur = dur; if (pose) h.pose = pose; return wait(dur); }
    float(x, y, s, col, sc = 2) {
      // stack above any label still rising nearby so CRIT, LOCKED and damage never overlap
      const busy = this.floats.filter(f => f.t < 40 && Math.abs(f.x - x) < 40).reduce((m, f) => Math.min(m, f.y - 8 * f.sc - 2), y + 8 * sc);
      this.floats.push({ x, y: Math.max(12 + 8 * sc, Math.min(y, busy)), s, col, sc, t: 0 });
    }
    burst(x, y, cols, n, spd = 2.4, up = 2) { if (reduced) n = Math.min(n, 6); for (let k = 0; k < n; k++) this.parts.push({ x, y, vx: (Math.random() - .5) * spd * 2, vy: -Math.random() * up - .3, c: cols[k % cols.length], life: 22 + Math.random() * 22, g: 0.12 }); }
    addFx(type, dur, o = {}) { const f = { type, t0: this.clock, dur, ...o }; this.fx.push(f); return f; }
    bossCenter() { return [this.bossX0 + this.b.w / 2 + this.boss.x, GY - this.b.h / 2 - (this.b.float ? 6 : 0)]; }
    bossHitPoint() { return [this.bossX0 + this.b.hitX + 10 + this.boss.x, GY - this.b.h * 0.55]; }
    hit(move) {
      const [hx, hy] = this.bossHitPoint(), [cx] = this.bossCenter();
      const crit = !!move.crit;
      this.hp -= move.dmg;
      this.flashUntil = this.clock + 150; this.boss.kx = crit ? 10 : 6;
      if (!reduced) { this.freezeUntil = performance.now() + (crit ? 150 : 70); this.shake = crit ? 7 : 3; }
      this.burst(hx, hy, ['#ffffff', '#fff1c2', this.b.aura], crit ? 26 : 14, crit ? 3.2 : 2.4);
      this.addFx('impact', 160, { x: hx, y: hy, crit });
      if (crit) this.float(cx, 14, 'CRIT', '#d9b45b', 1);
      this.float(cx, crit ? 22 : 18, '-' + move.dmg.toLocaleString(), crit ? '#ffd84d' : '#9fd8ff', 2);
      if (move.cross != null) this.st.cross = move.cross;
      this.syncHud();
    }
    miss(move) {
      const [cx] = this.bossCenter();
      this.float(cx, 18, move.miss || 'MISS', '#8a9bb3', 1);
      this.boss.kx = -4;
    }
    async heroAct(move) {
      const fx = move.fx || 'slash', b = this.b;
      const target = this.bossX0 + this.boss.x + b.hitX - 34 - this.heroX0;
      if (fx === 'cast' || fx === 'lens' || fx === 'graves') {
        this.hero.pose = 'cast';
        const hs = hero('cast', 0), hand = [this.heroX0 + this.hero.x + hs.tip[0] - 1, GY - 49 + hs.tip[1] - 1];
        if (fx === 'graves') {
          state.shakeGraves = 1; this.addFx('rune', 600, { x: hand[0], y: hand[1] }); await wait(650); state.shakeGraves = 0;
          this.miss(move); await wait(250); this.hero.pose = 'idle'; return;
        }
        if (fx === 'lens') { this.addFx('lens', 900, { x: hand[0], y: hand[1] }); await wait(520); }
        else { this.addFx('rune', 520, { x: hand[0], y: hand[1] }); await wait(380); this.addFx('bolt', 240, { x: hand[0], y: hand[1], crit: move.crit, miss: !move.dmg }); await wait(240); }
        if (move.dmg) this.hit(move); else this.miss(move);
        await wait(380); this.hero.pose = 'idle'; return;
      }
      await this.heroTo(target, 230, 'run');
      this.hero.pose = 'windup'; await wait(110);
      this.hero.pose = 'swing';
      this.addFx('slash', 180, { crit: move.crit, paint: fx === 'paint' });
      await wait(50);
      if (move.dmg) {
        this.hit(move);
        if (fx === 'lock') {
          this.st.locks = (this.st.locks || 0) + 1;
          this.burst(this.bossX0 + 42 + this.boss.x, GY - 40, ['#d9b45b', '#fff4cf'], 16);
          setTimeout(() => this.float(this.bossX0 + 42 + this.boss.x, GY - 22, 'LOCKED', '#d9b45b', 1), reduced ? 0 : 380);
        }
        if (fx === 'cut') { this.st.cut = Math.min(6, (this.st.cut || 0) + 2); this.addFx('snip', 400); }
        if (fx === 'paint') this.burst(this.bossX0 + 36 + this.boss.x, GY - 60, ['#4da3ff', '#d9b45b', '#ff5d6c', '#5fd38d'], 24, 3, 2.5);
      } else this.miss(move);
      await wait(260);
      await this.heroTo(0, 260, 'run');
      this.hero.pose = 'idle';
    }
    async bossAct(move) {
      const fx = move.fx, st = this.st;
      if (move.heads) {
        const before = st.heads; st.heads = move.heads; st.bite = 1;
        for (let k = before; k < move.heads; k++) { const [sx, sy] = this.b.slotXY(k); this.burst(this.bossX0 + sx + this.boss.x, GY - this.b.h + sy, ['#ff5d6c', '#ffb3bb', '#8a64c0'], 10, 1.8); }
        this.shake = reduced ? 0 : 3; this.float(this.bossCenter()[0], 10, `x${move.heads}`, '#ff5d6c', 2);
        await wait(380); st.bite = 0;
        return this.lunge(move, 20);
      }
      if (fx === 'stamp') {
        const t0 = this.clock; st.stampT = 0;
        await new Promise(res => { const tick = () => { st.stampT = Math.min(1, (this.clock - t0) / 520); if (st.stampT >= 0.75 || reduced) res(); else requestAnimationFrame(tick); }; tick(); });
        st.cross = 0; this.shake = reduced ? 0 : 5; this.heal(move);
        await wait(300); st.stampT = -1; return;
      }
      if (fx === 'revive') {
        st.lives = Math.max(1, st.lives - 1);
        this.addFx('heartbreak', 700, { k: st.lives });
        const t0 = this.clock; st.revT = 0;
        await new Promise(res => { const tick = () => { st.revT = Math.min(1, (this.clock - t0) / 900); if (st.revT >= 1 || reduced) res(); else requestAnimationFrame(tick); }; tick(); });
        st.revT = -1; this.heal(move); return;
      }
      if (fx === 'phase') {
        this.boss.after.push({ x: this.boss.x, t0: this.clock });
        this.boss.x = this.boss.x === 0 ? -Math.round(this.W * 0.12) : 0;
        await wait(260);
      }
      return this.lunge(move, fx === 'swipe' ? Math.round(this.W * 0.32) : fx === 'slam' ? 12 : 24);
    }
    heal(move) {
      this.hp = Math.min(this.b.hp, this.hp - move.dmg);
      const [cx] = this.bossCenter();
      this.float(cx, 18, '+' + (-move.dmg).toLocaleString(), '#5fd38d', 2);
      this.burst(cx, GY - 20, ['#5fd38d', '#e0ffe9'], 18, 1.6, 2.6);
      this.syncHud(true);
    }
    async lunge(move, dist) {
      const st = this.st;
      // anticipation: the boss winds up and pulls back before it commits
      st.atk = 1; await wait(200);
      st.atk = 2;
      if (move.fx === 'swipe') this.addFx('streak', 300);
      this.boss.lt0 = this.clock; this.boss.ldur = 360; this.boss.ldist = dist;
      await wait(150);
      const dmg = 12 + Math.floor(Math.random() * 14);
      this.heroHp = Math.max(10, this.heroHp - dmg);
      this.heroFlashUntil = this.clock + 140; this.hero.pose = 'hurt';
      if (!reduced) { this.shake = 4; this.freezeUntil = performance.now() + 60; }
      const hx = this.heroX0 + this.hero.x + 20;
      this.float(hx, 30, '-' + dmg, '#ff5d6c', 2);
      this.burst(hx, GY - 26, ['#ff5d6c', '#ffffff'], 10);
      if (move.fx === 'bleed') { st.pulse = 1; setTimeout(() => { st.pulse = 0; }, reduced ? 0 : 700); }
      if (move.fx === 'hop') this.burst(hx, GY - 30, ['#4da3ff', '#d9b45b', '#ff5d6c'], 14);
      this.syncHud();
      await wait(220); st.atk = 3;
      await wait(180); st.atk = 0;
      await wait(60); this.hero.pose = 'idle';
    }
    async fight() {
      if (this.busy) return;
      this.busy = true; this.btn.disabled = true; this.victoryShown = false; this.btn.textContent = 'IN BATTLE';
      this.reset(); this.syncHud(true);
      this.wrap.classList.add('fighting');
      this.say('sys', `${this.b.name} appears! ${this.b.hp.toLocaleString()} ${this.b.unit}.`);
      this.hero.x = -this.heroX0 - 40; await this.heroTo(0, 500, 'run'); this.hero.pose = 'idle';
      await wait(450);
      for (const move of this.b.moves) {
        this.say(move.w, move.text);
        await wait(380);
        if (move.w === 'h') await this.heroAct(move); else await this.bossAct(move);
        await wait(820);
      }
      await this.die();
      this.busy = false; this.btn.disabled = false;
    }
    async die() {
      const b = this.b;
      if (b.death === 'cage') { this.addFx('cage', 900); await wait(700); this.shake = reduced ? 0 : 8; this.burst(this.bossCenter()[0], GY - 4, ['#d9b45b', '#8a9bb3'], 20, 3); await wait(500); }
      if (b.id === 'blank') await wait(700);
      this.dissolve = this.clock; this.dead = true;
      await wait(1100);
      this.victory = this.clock; this.hero.pose = 'victory'; this.victoryShown = true;
      this.say('sys', 'RAID CLEARED. The loot drops.');
      await wait(700);
      this.addFx('loot', 700);
      await wait(650);
      this.flyLoot();
      this.entry.classList.add('gp-cleared'); this.wrap.classList.remove('fighting'); this.wrap.classList.add('cleared');
      const first = !S.raids.includes(this.i);
      this.cleared = true;
      if (first) { S.raids.push(this.i); save(); }
      await wait(reduced ? 0 : 700);
      if (first) gain(120, `Raid cleared: ${b.name}`);
      this.btn.textContent = '↻ REPLAY';
      this.syncHud();
    }
    flyLoot() {
      if (!this.res) return;
      const done = () => { this.res.classList.remove('got'); void this.res.offsetWidth; this.res.classList.add('got'); };
      if (reduced) return done();
      const r = this.cv.getBoundingClientRect(), [cx] = this.bossCenter();
      const sx = r.left + cx * this.sc, sy = r.top + (GY - 30) * this.sc;
      const e = el('div', 'gp-lootfly'); document.body.append(e);
      const tr = this.res.getBoundingClientRect(), tx = tr.left + 14, ty = tr.top + tr.height / 2;
      const midX = (sx + tx) / 2, midY = Math.min(sy, ty) - 80;
      e.animate([
        { transform: `translate(${sx}px, ${sy}px) scale(1.4) rotate(45deg)`, opacity: 1 },
        { transform: `translate(${midX}px, ${midY}px) scale(1.1) rotate(225deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${tx}px, ${ty}px) scale(.6) rotate(405deg)`, opacity: 0.9 }], { duration: 800, easing: 'cubic-bezier(.45,0,.3,1)' })
        .onfinish = () => { e.remove(); done(); };
    }
    // ---------- drawing ----------
    bossSprite() {
      const fp = this.b.frame(this.st, reduced && !this.busy ? 0 : this.clock, this);
      const k = JSON.stringify(fp);
      let c = this.cache.get(k);
      if (!c) { c = sprite(this.b, fp); if (this.cache.size > 600) this.cache.clear(); this.cache.set(k, c); }
      return c;
    }
    draw(now) {
      if (!this.ctx) return;
      const dt = Math.min(50, now - (this.last || now)); this.last = now;
      if (now >= this.freezeUntil) this.clock += dt;
      const c = this.ctx, { W, b } = this, t = this.clock, idle = reduced && !this.busy ? 0 : t;
      c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
      let sx = 0, sy = 0;
      if (this.shake > 0.3 && !reduced) { sx = Math.round((Math.random() - .5) * this.shake); sy = Math.round((Math.random() - .5) * this.shake); this.shake *= 0.86; } else this.shake = 0;
      c.translate(sx, sy);
      const cam = reduced ? 0 : Math.sin(t / 5000) * 8;
      drawArena(b.arena, c, W, H, GY, idle, cam);
      // boss aura glow on the backdrop
      const [bcx, bcy] = this.bossCenter();
      if (!this.dead) RS.glow(c, bcx, bcy, Math.round(b.w * 0.7), b.aura, 0.05);
      this.drawBossLayer(c, t, idle, 'back');
      // hero
      const h = this.hero, k = h.dur ? ease((t - h.t0) / h.dur) : 1;
      h.x = h.from + (h.to - h.from) * k;
      if (h.pose !== 'run' && k >= 1) h.x = h.to;
      const hf = h.pose === 'idle' ? Math.floor(idle / 520) % 2 : h.pose === 'run' ? Math.floor(t / 110) % 2 : h.pose === 'victory' ? Math.floor(t / 120) % 4 : 0;
      const hs = hero(h.pose, hf);
      const hx = Math.round(this.heroX0 + h.x) - 1, hy = GY - 49 - 1 + 1;
      R(c, hx + 9, GY + 1, 18, 2, 'rgba(0,0,0,.45)');
      c.drawImage(hs.c, hx, hy);
      if (t < this.heroFlashUntil && Math.floor(t / 40) % 2) { c.globalAlpha = 0.55; c.drawImage(tinted(hs.c, '#ff5d6c'), hx, hy); c.globalAlpha = 1; }
      // boss
      if (!this.dead || this.dissolve >= 0 && t - this.dissolve < 1100) this.drawBoss(c, t, idle);
      this.drawBossLayer(c, t, idle, 'front');
      this.drawFx(c, t);
      // particles and numbers
      this.parts = this.parts.filter(p => {
        if (now >= this.freezeUntil) { p.x += p.vx; p.y += p.vy; p.vy += p.g; if (p.y > GY + 2) { p.y = GY + 2; p.vy *= -0.35; p.vx *= 0.6; } p.life--; }
        R(c, p.x, p.y, p.sz || 1, p.sz || 1, p.c); return p.life > 0;
      });
      this.floats = this.floats.filter(f => {
        f.t += now >= this.freezeUntil ? 1 : 0;
        const y = f.y - Math.min(10, f.t * 0.6) - (f.t < 6 ? (6 - f.t) * 0.6 : 0);
        if (f.t < 50 || f.t % 4 < 2) txt(c, f.s, f.x, Math.round(y), f.col, f.sc, { center: true, outline: '#05070d', thick: f.sc > 1 ? 2 : 1 });
        return f.t < 64;
      });
      if (this.victory >= 0) this.drawVictory(c, t - this.victory);
      else if (this.cleared && !this.busy) { txt(c, 'CLEARED', W - 4 - 41, 4, '#d9b45b', 1, { outline: '#05070d' }); }
      // vignette edges
      c.setTransform(1, 0, 0, 1, 0, 0);
      R(c, 0, 0, W, 1, '#05070d'); R(c, 0, H - 1, W, 1, '#05070d');
    }
    drawBoss(c, t, idle) {
      const b = this.b, spr = this.bossSprite();
      const bo = this.boss;
      bo.kx *= 0.82;
      let lx = 0;
      if (bo.ldur) { const p = (t - bo.lt0) / bo.ldur; if (p < 1) lx = -Math.sin(Math.min(1, p) * Math.PI) * bo.ldist; else bo.ldur = 0; }
      if (this.st.atk === 1) lx += 3;
      const fy = b.float ? Math.round(Math.sin(idle / 600) * 2) - 6 : 0;
      const x = Math.round(this.bossX0 + bo.x + bo.kx + lx) - 1, y = GY - b.h - 1 + 2 + fy;
      if (b.float) { const w = Math.round(b.w * 0.5); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x + (b.w - w) / 2, GY + 1, w, 2); }
      else R(c, x + 8, GY + 1, b.w - 14, 2, 'rgba(0,0,0,.45)');
      // phase afterimages (wraith)
      bo.after = bo.after.filter(a => { const age = t - a.t0; if (age > 500) return false; c.globalAlpha = 0.35 * (1 - age / 500); c.drawImage(tinted(spr, b.aura), Math.round(this.bossX0 + a.x) - 1, y); c.globalAlpha = 1; return true; });
      let img = spr;
      const flashing = t < this.flashUntil && this.dissolve < 0;
      if (b.alpha) c.globalAlpha = b.alpha;
      if (this.dissolve >= 0) {
        const d = (t - this.dissolve) / 1000;
        tintC.width = spr.width; tintC.height = spr.height; tintX.drawImage(spr, 0, 0);
        const data = tintX.getImageData(0, 0, spr.width, spr.height).data;
        for (let yy = 0; yy < spr.height; yy++) for (let xx = 0; xx < spr.width; xx++) {
          const th = dissolveAt(xx, yy, spr.height);
          if (th < d) {
            const i = (yy * spr.width + xx) * 4;
            if (data[i + 3] && th > d - 0.03 && Math.random() < 0.5) this.parts.push({ x: x + xx, y: y + yy, vx: (Math.random() - .5) * 0.6, vy: -Math.random() * 1.2 - 0.3, c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`, life: 30 + Math.random() * 20, g: -0.01 });
            tintX.clearRect(xx, yy, 1, 1);
          }
        }
        img = tintC;
      }
      if (flashing) hurtLayer(c, img, x, y, Math.floor((this.flashUntil - t) / 50) % 3 === 2 ? 0 : Math.floor((this.flashUntil - t) / 50) % 3 === 1 ? 1 : 2);
      else c.drawImage(img, x, y);
      c.globalAlpha = 1;
      this.bossXY = [x, y];
    }
    drawBossLayer(c, t, idle, layer) {
      const b = this.b, [cx, cy] = this.bossCenter(), st = this.st;
      if (this.dead && this.dissolve >= 0 && t - this.dissolve > 900) return;
      if (b.id === 'dropdown' && layer === 'front' && !this.dead) {
        for (let k = 0; k < 3; k++) {
          const x = Math.round(this.bossX0 + b.w - 30 + k * 10), y = 3;
          const on = k < st.lives;
          heart(c, x, y, on ? '#ff5d6c' : '#2a1018', on ? '#ffb3bb' : '#3a1a24');
        }
      }
      if (b.id === 'mimic' && layer === 'front' && !this.dead && this.bossXY) {
        const f = Math.max(0, this.hp / b.hp);
        if (f > 0) {
          diffGhost(c, this.bossSprite(), this.bossXY[0], this.bossXY[1], f);
          txt(c, 'DIFF ' + Math.max(0, Math.round(this.hp)) + '%', this.bossXY[0] + b.w / 2 + Math.round(7 * f), GY + 4, '#ff7ad9', 1, { outline: '#05070d', center: true });
        }
      }
    }
    drawFx(c, t) {
      const hs = hero(this.hero.pose, 0);
      this.fx = this.fx.filter(f => {
        const p = (t - f.t0) / f.dur;
        if (p >= 1) return false;
        const hx = this.heroX0 + this.hero.x, [bx, by] = this.bossHitPoint(), [cx, cy] = this.bossCenter();
        if (f.type === 'slash') {
          // crescent smear that sweeps fast, then fades
          const px = hx + 20, py = GY - 22, sweep = Math.min(1, p * 3), a0 = -140, a1 = 50;
          const cur = a0 + (a1 - a0) * sweep, tail = Math.max(a0, cur - 130);
          const pal = f.paint ? ['#4da3ff', '#d9b45b', '#ff5d6c', '#5fd38d'] : null;
          c.globalAlpha = p > 0.55 ? Math.max(0, 1 - (p - 0.55) / 0.45) : 1;
          for (let a = tail; a <= cur; a += 2) {
            const k = (a - tail) / Math.max(1, cur - tail), r1 = 18 + (f.crit ? 3 : 0), r0 = r1 - Math.round(1 + k * 5);
            for (let r = r0; r <= r1; r++) {
              const col = pal ? pal[Math.floor((a + 140) / 24) % 4] : r >= r1 - 1 ? '#ffffff' : k > 0.55 ? '#bfe6ff' : '#4da3ff';
              R(c, px + Math.cos(rad(a)) * r, py + Math.sin(rad(a)) * r, 1, 1, col);
            }
          }
          c.globalAlpha = 1;
        } else if (f.type === 'impact') {
          const r = Math.round(3 + p * (f.crit ? 14 : 9));
          c.strokeStyle = p < 0.5 ? '#ffffff' : '#fff1c2'; c.lineWidth = 1;
          for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2 + 0.3; R(c, f.x + Math.cos(an) * r, f.y + Math.sin(an) * r, 2, 2, c.strokeStyle); }
          if (p < 0.35) { for (let i = -8; i <= 8; i++) R(c, f.x + i, f.y - i * 0.8, 1, 1, '#ffffff'); }
        } else if (f.type === 'rune') {
          const r = 7 + Math.round(ease(p * 2) * 3), sp = t / 120;
          for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2 + sp; R(c, f.x + Math.cos(an) * r, f.y + Math.sin(an) * r * 0.9, 1, 1, a % 4 === 0 ? '#d9b45b' : '#4da3ff'); }
          for (let a = 0; a < 6; a++) { const an = -a / 6 * Math.PI * 2 - sp * 0.7; R(c, f.x + Math.cos(an) * (r - 4), f.y + Math.sin(an) * (r - 4) * 0.9, 1, 1, '#bfe6ff'); }
          R(c, f.x - 1, f.y - 1, 3, 3, '#ffffff');
        } else if (f.type === 'bolt') {
          const x = f.x + (bx - f.x) * p, y = f.y + (by - f.y) * p - Math.sin(p * Math.PI) * 8;
          if (f.miss && p > 0.7) { this.burst(x, y, ['#8a9bb3'], 4, 1); return false; }
          for (let k = 1; k < 6; k++) { const q = Math.max(0, p - k * 0.04); R(c, f.x + (bx - f.x) * q, f.y + (by - f.y) * q - Math.sin(q * Math.PI) * 8, 1, 1, k < 3 ? '#bfe6ff' : '#4da3ff'); }
          R(c, x - 2, y - 2, 4, 4, f.crit ? '#d9b45b' : '#4da3ff'); R(c, x - 1, y - 1, 2, 2, '#ffffff');
        } else if (f.type === 'lens') {
          const lx = f.x + 4, ly = f.y - 2;
          c.globalAlpha = 0.18 + 0.08 * Math.sin(t / 60); c.fillStyle = '#fff1a8';
          const top = GY - this.b.h + 4, bot = GY - 6;
          c.beginPath(); c.moveTo(lx, ly - 2); c.lineTo(cx - this.b.w / 2 + 6, top); c.lineTo(cx - this.b.w / 2 + 6, bot); c.lineTo(lx, ly + 2); c.fill(); c.globalAlpha = 1;
          const scan = Math.round(top + ((t / 4) % (bot - top)));
          R(c, cx - this.b.w / 2 + 6, scan, this.b.w - 12, 1, '#fff1a8');
          for (let a = 0; a < 20; a++) { const an = a / 20 * Math.PI * 2; R(c, lx + Math.cos(an) * 4, ly + Math.sin(an) * 4, 1, 1, '#d9b45b'); }
          R(c, lx - 2, ly - 2, 4, 4, '#9fd0ff'); R(c, lx - 2, ly - 2, 1, 1, '#ffffff');
          for (let i = 0; i < 4; i++) R(c, lx - 3 - i, ly + 3 + i, 1, 1, '#7d5c22');
        } else if (f.type === 'cage') {
          const x0 = this.bossX0 + this.boss.x + 4, x1 = x0 + this.b.w - 8, drop = ease(p * 1.6), top = -10 + drop * (GY - this.b.h + 4 + 10);
          for (let x = x0; x <= x1; x += 6) { R(c, x - 1, top, 3, GY - top, '#05070d'); R(c, x, top, 1, GY - top, '#8a9bb3'); }
          R(c, x0 - 2, top - 2, x1 - x0 + 5, 4, '#05070d'); R(c, x0 - 1, top - 1, x1 - x0 + 3, 2, '#b9c7dc');
          if (p > 0.5) { const lx = Math.round((x0 + x1) / 2) - 9, ly = Math.round(GY - this.b.h / 2); R(c, lx - 1, ly - 1, 20, 14, '#05070d'); R(c, lx, ly, 18, 12, '#d9b45b'); R(c, lx, ly, 18, 2, '#f6dd94'); txt(c, 'CFG', lx + 1, ly + 3, '#3d2a0c'); R(c, lx + 4, ly - 6, 2, 6, '#8a9bb3'); R(c, lx + 12, ly - 6, 2, 6, '#8a9bb3'); R(c, lx + 4, ly - 7, 10, 2, '#8a9bb3'); }
        } else if (f.type === 'heartbreak') {
          const x = Math.round(this.bossX0 + this.b.w - 30 + f.k * 10), y = 3 + Math.round(p * 6);
          if (p < 0.6) heart(c, x - (p > 0.2 ? 1 : 0), y, '#ff5d6c', '#ffb3bb', p > 0.2);
        } else if (f.type === 'streak') {
          const right = this.bossXY ? this.bossXY[0] + this.b.w : cx;
          for (let i = 0; i < 7; i++) R(c, right + 2 + (i % 3) * 5 + p * 16, cy - 12 + i * 4, 12 + (i % 2) * 6, 1, i % 2 ? '#6fe8cc' : '#ffffff');
        } else if (f.type === 'snip') {
          if (p < 0.5) for (let i = 0; i < 6; i++) R(c, cx - 14 + i * 5, cy - 6 + (i % 2) * 6, 3, 1, '#ffffff');
        } else if (f.type === 'loot') {
          const x = Math.round(cx), y = Math.round(GY - 20 - Math.sin(p * Math.PI) * 18);
          for (let r = 0; r < 3; r++) R(c, x - 3 + r, y - r, 7 - r * 2, 1, '#05070d');
          gem(c, x, y);
          if (p > 0.85) this.burst(x, y, ['#d9b45b', '#fff4cf'], 8, 1.5);
        }
        return true;
      });
    }
    drawVictory(c, age) {
      const W = this.W;
      if (age < 2400 && !this.res?.classList.contains('got')) {
        const y = 18 + Math.round((1 - ease(age / 300)) * -20);
        txt(c, 'VICTORY', Math.round(W / 2), y, '#d9b45b', 2, { center: true, outline: '#05070d' });
        if (Math.floor(age / 120) % 2) txt(c, '*', Math.round(W / 2) - 54, y + 2, '#fff4cf', 1);
        else txt(c, '*', Math.round(W / 2) + 48, y + 6, '#fff4cf', 1);
        if (age < 900 && Math.random() < 0.4) this.parts.push({ x: Math.random() * W, y: 0, vx: (Math.random() - .5) * 0.6, vy: 0.6 + Math.random(), c: ['#d9b45b', '#4da3ff', '#fff4cf'][Math.floor(Math.random() * 3)], life: 80, g: 0.01 });
      } else txt(c, 'CLEARED', W - 4 - 41, 4, '#d9b45b', 1, { outline: '#05070d' });
    }
  }
  // =====================================================================
  // boot
  // =====================================================================
  G.BOSSES.push(...BOSSES);
  const ENC = entries.map((e, i) => new Encounter(e, i));
  G.ENC.push(...ENC);
  const loop = now => {
    if (activeId() === 'raid-log') ENC.forEach(e => { if (e.visible || e.busy) e.draw(now); else e.last = now; });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
