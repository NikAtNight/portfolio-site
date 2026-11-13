// PROTOTYPE game layer for the portfolio. Throwaway: answers "does a game layer
// make the site more fun without hiding anything?" Progress lives in this
// browser's localStorage only. The world counter is mocked (would need KV).
(() => {
  const params = new URLSearchParams(location.search);
  const gameOn = params.get('game') !== '0';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const sleep = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 120) : ms));

  // ---------- prototype banner (always on, so the layer can be toggled) ----------
  const banner = el('div', 'gp-banner');
  banner.innerHTML = `<span><b>PROTOTYPE</b> · game layer ${gameOn ? 'on' : 'off'}</span>
    <a href="?game=${gameOn ? 0 : 1}${location.hash}">${gameOn ? 'Turn off' : 'Turn on'}</a>
    ${gameOn ? '<button type="button" id="gp-open-cmd">/ command</button><button type="button" id="gp-open-q">Quest log (Q)</button>' : ''}
    <a href="overworld.html">Overworld mock →</a><a href="world3d.html">3D world →</a>`;
  document.body.append(banner);
  if (!gameOn) return;

  // ---------- state ----------
  const KEY = 'portfolio-game-prototype';
  const fresh = () => ({ xp: 0, zones: [], raids: [], skills: [], quests: [], ach: [], cmd: false, firstVisit: Date.now() });
  let S;
  try { S = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { S = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  const zoneLinks = $$('.menu-list a');
  const ZONES = zoneLinks.map(a => ({ id: a.getAttribute('href').slice(1), name: a.textContent.trim(), link: a }));
  const entries = $$('#raid-log .entry');

  const levelFor = xp => 1 + Math.floor(xp / 200);
  const ACH = [
    { id: 'first-steps', ico: '◆', name: 'First steps', desc: 'Discover 2 zones', test: () => S.zones.length >= 2 },
    { id: 'cartographer', ico: '✦', name: 'Cartographer', desc: 'Discover every zone', test: () => S.zones.length >= ZONES.length },
    { id: 'first-blood', ico: '⚔', name: 'First blood', desc: 'Clear a raid', test: () => S.raids.length >= 1 },
    { id: 'raid-master', ico: '♛', name: 'Raid master', desc: 'Clear all 9 raids', test: () => S.raids.length >= entries.length },
    { id: 'appraiser', ico: '◈', name: 'Appraiser', desc: 'Inspect 5 skills', test: () => S.skills.length >= 5 },
    { id: 'quest-accepted', ico: '!', name: 'Quest accepted', desc: 'Open a Side Quest', test: () => S.quests.length >= 1 },
    { id: 'terminal', ico: '>', name: 'Root access', desc: 'Use the command bar', test: () => S.cmd },
    { id: 'secret', ico: '?', name: '[NaN]', desc: 'Find the secret', test: () => S.ach.includes('secret') },
  ];

  // ---------- toasts ----------
  const toasts = el('div', 'gp-toasts');
  toasts.setAttribute('aria-live', 'polite');
  document.body.append(toasts);
  const toast = (head, body, { ico = '', xp = false } = {}) => {
    const t = el('div', 'gp-toast' + (xp ? ' xp' : ''));
    t.innerHTML = `${ico ? `<span class="gp-ico">${ico}</span>` : ''}<div class="gp-th">${head}</div><div class="gp-tb">${body}</div>`;
    toasts.append(t);
    setTimeout(() => t.remove(), 4200);
  };

  const gain = (amount, why) => {
    const before = levelFor(S.xp);
    S.xp += amount;
    save();
    toast(`+${amount} XP`, why, { xp: true });
    if (levelFor(S.xp) > before) toast('LEVEL UP', `You reached LV. ${levelFor(S.xp)}`, { ico: '▲' });
    checkAch();
    renderVisitor();
  };
  const checkAch = () => {
    ACH.forEach(a => {
      if (a.id === 'secret' || S.ach.includes(a.id) || !a.test()) return;
      S.ach.push(a.id); save();
      setTimeout(() => toast('ACHIEVEMENT UNLOCKED', `${a.name} · <span style="color:var(--dim)">${a.desc}</span>`, { ico: a.ico }), 350);
    });
  };
  const unlockSecret = () => {
    if (S.ach.includes('secret')) return toast('ALREADY FOUND', 'The clan tag was never a bug.', { ico: '?' });
    S.ach.push('secret');
    gain(200, 'Secret found');
    toast('ACHIEVEMENT UNLOCKED', '[NaN] · <span style="color:var(--dim)">Not a Number. A clan.</span>', { ico: '?' });
    document.body.classList.add('gp-gold');
  };

  // ---------- visitor status window (idea 2) + mocked world counter (idea 5) ----------
  const visitor = el('div', 'win gp-visitor');
  visitor.innerHTML = `<div class="bar"><span>⟨ YOU ⟩</span><span class="dot">VISITOR</span></div><div class="body"></div>`;
  $('.side').append(visitor);
  setTimeout(() => visitor.classList.add('on'), 500);
  const days = Math.floor((Date.now() - new Date(2026, 8, 1)) / 864e5);
  const world = { players: 1180 + days * 7, today: 9 + (new Date().getHours() % 17), clearedAll: 31 + Math.floor(days / 4) };
  const visitorHTML = () => {
    const lv = levelFor(S.xp), into = S.xp % 200;
    return `<span class="gp-vname">Player</span><span class="gp-vlv">LV. ${lv}</span>
      <div class="gp-meter" title="${into} / 200 XP"><i style="width:${into / 2}%"></i></div>
      <div class="row"><span class="k">XP</span><span class="v">${S.xp.toLocaleString()}</span></div>
      <div class="row"><span class="k">ZONES</span><span class="v">${S.zones.length} / ${ZONES.length}</span></div>
      <div class="row"><span class="k">RAIDS</span><span class="v">${S.raids.length} / ${entries.length}</span></div>
      <div class="row"><span class="k">BADGES</span><span class="v">${S.ach.length} / ${ACH.length}</span></div>
      <div class="gp-world"><b>${world.players.toLocaleString()}</b> players · <b>${world.clearedAll}</b> full clears <span class="gp-mock">MOCK</span></div>`;
  };
  const renderVisitor = () => {
    $('.body', visitor).innerHTML = visitorHTML() + '<button class="gp-vbtn" type="button" data-q>QUEST LOG</button>';
    $('[data-q]', visitor).onclick = openQuests;
    zoneLinks.forEach(a => {
      const seen = S.zones.includes(a.getAttribute('href').slice(1));
      a.classList.toggle('gp-seen', seen);
      a.classList.toggle('gp-unseen', !seen);
    });
  };

  // ---------- zone discovery (idea 1) ----------
  // in the 3D world a zone only counts once its panel is open
  const in3d = () => document.body.classList.contains('w3d');
  const onZone = id => {
    if (!id || S.zones.includes(id) || (in3d() && !document.body.classList.contains('w3d-panel'))) return;
    S.zones.push(id); save();
    const z = ZONES.find(z => z.id === id);
    gain(50, `Zone discovered: ${z ? z.name : id}`);
  };
  const activeId = () => ($('.section.active') || {}).id;
  new MutationObserver(() => onZone(activeId())).observe($('.main'), { subtree: true, attributes: true, attributeFilter: ['class'] });

  // skills inspected, side quests accepted
  $$('.item').forEach(item => {
    const mark = () => {
      const name = ($('.nm', item) || item).textContent.trim();
      if (S.skills.includes(name)) return;
      S.skills.push(name); save();
      gain(5, `Inspected: ${name}`);
    };
    item.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') mark(); });
    item.addEventListener('focus', mark);
    item.addEventListener('click', mark);
  });
  $$('#side-quests .quests li').forEach(li => {
    const name = $('.qname', li).textContent.trim();
    $$('a', li).forEach(a => a.addEventListener('click', () => {
      if (S.quests.includes(name)) return;
      S.quests.push(name); save();
      gain(15, `Quest accepted: ${name}`);
    }));
  });

  // ---------- overlays ----------
  const overlay = inner => {
    const o = el('div', 'gp-overlay');
    o.innerHTML = inner;
    o.addEventListener('pointerdown', e => { if (e.target === o) close(o); });
    document.body.append(o);
    return o;
  };
  const close = o => { o.classList.remove("open"); if (o.contains(document.activeElement)) document.activeElement.blur(); };
  const anyOpen = () => $$('.gp-overlay.open').length > 0;

  // quest log
  const qOv = overlay(`<div class="win on"><div class="bar"><span>⟨ QUEST LOG ⟩</span><span class="dot">ESC TO CLOSE</span></div><div class="body gp-quests"></div></div>`);
  function openQuests() {
    const body = $('.body', qOv);
    const li = (done, name, extra = '') => `<li class="${done ? 'done' : ''}"><span class="gp-ck">${done ? '✓' : '·'}</span><span class="gp-qn">${name}</span><span class="gp-qx">${extra}</span></li>`;
    body.innerHTML = `
      <h4>YOU · LV. ${levelFor(S.xp)} · ${S.xp} XP</h4>
      <h4>ZONES · ${S.zones.length}/${ZONES.length}</h4>
      <ul>${ZONES.map(z => li(S.zones.includes(z.id), `<a href="#${z.id}" data-zone="${z.id}">${z.name}</a>`, '+50')).join('')}</ul>
      <h4>RAIDS · ${S.raids.length}/${entries.length}</h4>
      <ul>${entries.map((e, i) => li(S.raids.includes(i), `<a href="#raid-log" data-raid="${i}">${(G.BOSSES[i] || {}).name || 'Raid ' + (i + 1)}</a> <span class="dim">· ${$('h3', e).textContent}</span>`, '+120')).join('')}</ul>
      <h4>ACHIEVEMENTS · ${S.ach.length}/${ACH.length}</h4>
      <ul>${ACH.map(a => li(S.ach.includes(a.id), S.ach.includes(a.id) || a.id !== 'secret' ? `${a.name} <span class="dim">· ${a.desc}</span>` : '??? <span class="dim">· Find the secret</span>')).join('')}</ul>
      <p class="gp-hint" style="margin-top:14px">Nothing here is locked. Every zone is one click from the menu. This is a layer on top.<br>
      <button class="gp-vbtn" type="button" data-reset style="width:auto;display:inline-block;padding:2px 10px;margin-top:8px">RESET PROGRESS</button></p>`;
    $$('[data-zone]', body).forEach(a => a.onclick = e => { e.preventDefault(); close(qOv); goZone(a.dataset.zone); });
    $$('[data-raid]', body).forEach(a => a.onclick = e => { e.preventDefault(); close(qOv); goRaid(+a.dataset.raid, false); });
    $('[data-reset]', body).onclick = () => { try { localStorage.removeItem(KEY); } catch {} location.reload(); };
    qOv.classList.add('open');
  }

  // G.travel lets the 3D world walk the player there instead of swapping the section
  const goZone = id => { if (in3d() && G.travel) return G.travel('zone', id); const z = ZONES.find(z => z.id === id); if (z) z.link.click(); };
  const goRaid = (i, engage) => {
    if (in3d() && G.travel) return G.travel('raid', i, engage);
    goZone('raid-log');
    setTimeout(() => {
      entries[i].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      if (engage) setTimeout(() => G.ENC[i] && G.ENC[i].fight(), 500);
    }, 600);
  };

  // ---------- command bar (idea 4) ----------
  const cOv = overlay(`<div class="win on gp-cmd"><div class="bar"><span>⟨ SYSTEM CONSOLE ⟩</span><span class="dot">TYPE help</span></div>
    <div class="body"><div class="gp-cmd-out" aria-live="polite"><span class="dim">System console online. Try: help, goto argus, raid 1, inspect flo</span>\n</div>
    <label class="gp-cmd-row"><span>&gt;</span><input type="text" autocomplete="off" spellcheck="false" aria-label="Command"></label></div></div>`);
  const cIn = $('input', cOv), cOut = $('.gp-cmd-out', cOv);
  const print = (txt, cls = '') => { const s = el('span', cls); s.textContent = txt + '\n'; cOut.append(s); cOut.scrollTop = cOut.scrollHeight; };
  const openCmd = () => { cOv.classList.add('open'); cIn.focus(); };
  const quests = $$('#side-quests .quests li').map(li => ({ name: $('.qname', li).textContent.trim(), desc: ($('.qdesc', li) || {}).textContent || '' }));
  const findZone = q => ZONES.find(z => z.id === q || z.name.toLowerCase() === q || z.name.toLowerCase().startsWith(q) || z.id.startsWith(q));
  const COMMANDS = {
    help: () => print([
      'help              this list',
      'goto <zone>       jump to a zone (status, about, career, side, premise, argus, raid, guild)',
      'zones             list zones and what you have discovered',
      'raid <1-9>        fight a Raid Log boss',
      'inspect <quest>   read a Side Quest (try: inspect patchdeck)',
      'stats             your visitor stats',
      'quests            open the quest log',
      'whoami            who is this guy',
      'overworld         open the overworld mock',
      'clear             clear the console',
      'reset             wipe your progress',
    ].join('\n'), 'dim'),
    zones: () => ZONES.forEach((z, i) => print(`${i + 1}. ${S.zones.includes(z.id) ? '✓' : '·'} ${z.name}`)),
    goto: a => { const z = findZone(a); if (!z) return print(`No zone called "${a}". Try: zones`, 'err'); print(`Travelling to ${z.name}...`); setTimeout(() => { close(cOv); goZone(z.id); }, 250); },
    raid: a => { const n = parseInt(a, 10); if (!(n >= 1 && n <= entries.length)) return print(`Pick a raid from 1 to ${entries.length}.`, 'err'); print(`Engaging ${(G.BOSSES[n - 1] || {}).name || 'raid ' + n}...`); setTimeout(() => { close(cOv); goRaid(n - 1, true); }, 250); },
    inspect: a => { const q = quests.find(q => q.name.toLowerCase().startsWith(a)); if (!a || !q) return print(`Quests: ${quests.map(q => q.name).join(', ')}`, 'dim'); print(`[ ${q.name} ]\n${q.desc.trim()}`); },
    stats: () => print(`LV. ${levelFor(S.xp)} · ${S.xp} XP · zones ${S.zones.length}/${ZONES.length} · raids ${S.raids.length}/${entries.length} · badges ${S.ach.length}/${ACH.length}`),
    quests: () => { close(cOv); openQuests(); },
    whoami: () => print(`You are a visitor. He is Nikhil Kapadia, LV. ${$('#level').textContent}, Senior Software Engineer, class-changed to Agent Orchestrator.`),
    overworld: () => { location.href = 'overworld.html'; },
    clear: () => { cOut.textContent = ''; },
    reset: () => { try { localStorage.removeItem(KEY); } catch {} location.reload(); },
    sudo: () => print('Permission denied. Prose constrains nothing, but config does.', 'err'),
    nan: () => { print('isNaN([NaN]) === false. It was a clan tag all along.'); unlockSecret(); },
    nikatnight: () => { print('Welcome back, NikAtNight.'); unlockSecret(); },
  };
  cIn.addEventListener('keydown', e => {
    if (e.key === 'Escape') return close(cOv);
    if (e.key === 'Tab') {
      e.preventDefault();
      const m = Object.keys(COMMANDS).filter(c => !['sudo', 'nan', 'nikatnight'].includes(c) && c.startsWith(cIn.value.trim()));
      if (m.length === 1) cIn.value = m[0] + ' ';
      else if (m.length) print(m.join('  '), 'dim');
      return;
    }
    if (e.key !== 'Enter') return;
    const raw = cIn.value.trim().replace(/^\//, ''); cIn.value = '';
    if (!raw) return;
    print('> ' + raw, 'in');
    const [cmd, ...rest] = raw.split(/\s+/);
    const fn = COMMANDS[cmd.toLowerCase()];
    if (!fn) return print(`Unknown command "${cmd}". Type help.`, 'err');
    if (!S.cmd) { S.cmd = true; save(); gain(25, 'Opened the system console'); }
    fn(rest.join(' ').toLowerCase());
  });
  $('#gp-open-cmd').onclick = openCmd;
  $('#gp-open-q').onclick = openQuests;

  // ---------- keyboard: / console, Q quest log, W/S or arrows between zones, konami ----------
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kbuf = [];
  document.addEventListener('keydown', e => {
    kbuf = [...kbuf, e.key].slice(-KONAMI.length);
    if (kbuf.join() === KONAMI.join()) { kbuf = []; unlockSecret(); }
    if (e.key === 'Escape') return $$('.gp-overlay.open').forEach(close);
    if (anyOpen() || e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    const i = ZONES.findIndex(z => z.id === activeId());
    if (e.key === '/' || e.key === '`') { e.preventDefault(); openCmd(); }
    else if (e.key === 'q' || e.key === 'Q') openQuests();
    else if (in3d()) return;   // WASD and the arrows move the player there
    else if (['s', 'S', 'ArrowDown'].includes(e.key) && e.target === document.body) { e.preventDefault(); goZone(ZONES[(i + 1) % ZONES.length].id); }
    else if (['w', 'W', 'ArrowUp'].includes(e.key) && e.target === document.body) { e.preventDefault(); goZone(ZONES[(i - 1 + ZONES.length) % ZONES.length].id); }
    else if (/^[1-8]$/.test(e.key)) goZone(ZONES[+e.key - 1].id);
  });

  // ---------- shared with raid.js, which loads after this file and owns the Raid Log battles ----------
  const G = window.gpGame = { S, save, gain, reduced, sleep, el, $, $$, entries, activeId, BOSSES: [], ENC: [], ZONES, ACH, COMMANDS, levelFor, world, toast, openQuests, openCmd, anyOpen, print };

  // ---------- boot ----------
  renderVisitor();
  onZone(activeId());
  if (!S.tip) { S.tip = 1; save(); setTimeout(() => toast('TIP', in3d() ? 'WASD or the arrows to walk. E to interact. / for the console, Q for quests.' : 'W/S or ↑/↓ moves between zones. Press / for the console, Q for quests.', { ico: '◆' }), 1800); }
})();
