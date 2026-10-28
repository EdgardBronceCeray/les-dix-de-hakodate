'use strict';

/* Les écrans, à la manière des jeux d'aujourd'hui : plein écran sur la scène 3D
 * qui vit derrière, une liste à gauche, la sélection qui glisse, tout au clavier.
 * Flèches pour choisir, Entrée pour valider, Échap pour revenir. */

const MENU = { items: [], sel: 0, back: null, lr: null, axis: 'v', screen: null };

function menuShow(screen, html, opts) {
  opts = opts || {};
  const root = el('menu');
  root.className = 'menu screen-' + screen;
  root.innerHTML = html;
  root.classList.remove('hidden');
  void root.offsetWidth;
  root.classList.add('in');
  MENU.screen = screen;
  MENU.items = [...root.querySelectorAll('[data-item]')];
  MENU.go = opts.go || [];
  MENU.desc = opts.desc || [];
  MENU.back = opts.back || null;
  MENU.lr = opts.lr || null;
  MENU.axis = opts.axis || 'v';
  MENU.onSel = opts.onSel || null;
  MENU.sel = clamp(opts.sel || 0, 0, Math.max(0, MENU.items.length - 1));
  /* du doigt (touch.js) : un premier toucher choisit la ligne, dont on lit la description ; un second
   * la valide. À la souris, comme toujours : on survole, on clique */
  const touched = () => typeof touchRecent === 'function' && touchRecent();
  MENU.items.forEach((n, i) => {
    n.addEventListener('mouseenter', () => { if (!touched()) menuSelect(i); });
    n.addEventListener('click', () => { if (touched() && MENU.sel !== i) { menuSelect(i); return; } menuSelect(i); menuActivate(); });
  });
  menuSelect(MENU.sel, true);
  showHud(false);
}

function menuHide() {
  const root = el('menu');
  root.classList.add('hidden');
  root.classList.remove('in');
  MENU.screen = null;
}

function menuSelect(i, quiet) {
  if (!MENU.items.length) return;
  MENU.sel = (i + MENU.items.length) % MENU.items.length;
  MENU.items.forEach((n, k) => n.classList.toggle('sel', k === MENU.sel));
  const n = MENU.items[MENU.sel];
  if (n.scrollIntoView) n.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  const d = el('menu-desc');
  if (d && MENU.desc[MENU.sel] !== undefined) d.textContent = MENU.desc[MENU.sel];
  if (MENU.onSel) MENU.onSel(MENU.sel);
  if (!quiet) Snd.tick && Snd.tick();
}

function menuActivate() {
  const f = MENU.go[MENU.sel];
  if (f) { Snd.wake(); Snd.select && Snd.select(); f(); }
}

window.addEventListener('keydown', (e) => {
  if (!MENU.screen || el('menu').classList.contains('hidden')) return;
  const k = e.key;
  const next = MENU.axis === 'v' ? 'ArrowDown' : 'ArrowRight', prev = MENU.axis === 'v' ? 'ArrowUp' : 'ArrowLeft';
  if ((k === 'ArrowLeft' || k === 'ArrowRight') && MENU.lr) { e.preventDefault(); MENU.lr(k === 'ArrowRight' ? 1 : -1); return; }
  if (k === next || (k === 'Tab' && !e.shiftKey)) { e.preventDefault(); menuSelect(MENU.sel + 1); }
  else if (k === prev || (k === 'Tab' && e.shiftKey)) { e.preventDefault(); menuSelect(MENU.sel - 1); }
  else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (!e.repeat) menuActivate(); }
  else if ((k === 'Escape' || k === 'Backspace') && MENU.back) { e.preventDefault(); Snd.tick && Snd.tick(); MENU.back(); }
  else if ((k === 'p' || k === 'P') && MENU.screen === 'pause' && MENU.back) { e.preventDefault(); MENU.back(); }
});

const hints = (extra, noUpDown) => `<div class="hints">${extra || ''}${noUpDown ? '' : `<span><kbd>↑</kbd><kbd>↓</kbd> ${T('k.choose')}</span>`}<span><kbd>${T('k.enter')}</kbd> ${T('k.ok')}</span><span><kbd>${T('k.esc')}</kbd> ${T('k.back')}</span></div>`;
const seal = '<span class="seal"><i>海</i><i>戦</i></span>';

/* ---------- écran-titre ---------- */

function showTitle() {
  /* l'écran-titre redessiné sur place (langue, musique, son) : De Nicol ne refait pas son entrée */
  const again = MENU.screen === 'title';
  G.mode = 'menu';
  YARD.open = false;
  hidePause();
  Music.duck(false);
  demoStart('title');
  const sv = storyLoad();
  const langName = (LANGS.find((l) => l.id === LANG) || LANGS[0]).name;
  const cycleLang = (d) => {
    const i = LANGS.findIndex((l) => l.id === LANG);
    setLang(LANGS[(i + (d || 1) + LANGS.length) % LANGS.length].id);
    applyStaticText();
    showTitle(); menuSelect(5, true);
    Snd.tick && Snd.tick();
  };
  const items = [
    [T('menu.story'), T('menu.story.d', STAGES.length) + (sv.done ? ' ' + T('menu.story.done', Math.min(sv.done, STAGES.length), STAGES.length) : ''), storyMenu],
    [T('menu.corsaire'), T('menu.corsaire.d') + (corsRecord(corsDiffPick()).best ? ' ' + T('cor.menu.rec', fmt0(corsRecord(corsDiffPick()).best), T('cor.diff.' + CORS_DIFF[corsDiffPick()].id).toLowerCase()) : ''), corsaireMenu],
    [T('menu.arcade'), T('menu.arcade.d') + (arcadeBest() ? ' ' + T('menu.record', fmt0(arcadeBest())) : ''), arcadeMenu],
    [T('menu.credits'), T('menu.credits.d'), () => showCredits(showTitle)],
    [T('menu.help'), T('menu.help.d'), () => showHelp(showTitle)],
    [`${T('menu.lang')} : <b class="opt">‹ ${langName} ›</b>`, T('menu.lang.d'), () => cycleLang(1)],
    [T(Music.off ? 'menu.music.off' : 'menu.music.on'), T('menu.music.d'), () => { Music.toggle(); showTitle(); menuSelect(6, true); }],
    [T(Snd.muted ? 'menu.sound.off' : 'menu.sound.on'), T('menu.sound.d'), () => { Snd.mute(!Snd.muted); showTitle(); menuSelect(7, true); }],
  ];
  menuShow('title', `
    <div class="scrim left"></div>
    <img class="title-nicol${again ? ' still' : ''}" src="img/nicol.webp" alt="" draggable="false">
    <div class="title-block">
      <div class="logo">
        <div class="logo-top">${seal}<span class="kicker">${T('title.kicker')} · 1868-1869</span></div>
        <h1 class="logo-h" aria-label="${T('title.name')}">
          ${LANG === 'ja' ? '' : '<canvas id="logo-c1" class="logo-word small"></canvas>'}
          <canvas id="logo-c" class="logo-word"></canvas>
        </h1>
        <div class="logo-year logo-sub"><span></span>${T('title.sub')}<span></span></div>
        <p class="tagline">${T('title.tag')}</p>
        <p class="credit">${T('title.credit')}</p>
      </div>
      <nav class="main-list">${items.map(([t], i) => `<button class="item" data-item="${i}"><span class="bar"></span><span class="t">${t}</span></button>`).join('')}</nav>
      <p id="menu-desc" class="desc"></p>
    </div>
    ${hints()}`, { go: items.map((x) => x[2]), desc: items.map((x) => x[1]), lr: (d) => { if (MENU.sel === 5) cycleLang(d); } });
  Music.play('theme');
  const big = Math.round(clamp(Math.min(window.innerWidth * 0.062, window.innerHeight * 0.115), 46, 108));
  if (LANG === 'ja') paintTitle(el('logo-c'), [['箱館', 1], ['の', 0.62], ['十人', 1]], big, Math.round(big * 0.08));
  else {
    paintTitle(el('logo-c1'), LANG === 'en' ? [['THE TEN', 1], ['OF', 0.62]] : [['LES DIX', 1], ['DE', 0.62]], Math.round(big * 0.46), Math.round(big * 0.05));
    paintGold(el('logo-c'), 'HAKODATE', big, Math.round(clamp(window.innerWidth * 0.009, 6, 16)));
  }
  document.title = T('doc.title');
}

function showHelp(back) {
  G.mode = G.mode === 'pause' ? 'pause' : 'menu';
  /* en corsaire, l'aide parle d'or, de chantier et de ports, et plus de caisses */
  const cors = G.mode === 'pause' && G.arc && G.arc.variant === 'corsaire';
  const row = (k, t) => `<div class="krow"><span class="keys">${k}</span><span>${t}</span></div>`;
  const obj = (c, t, d) => `<div class="obj"><i style="background:${c}"></i><b>${t}</b><span>${d}</span></div>`;
  const beast = (c, t, d) => `<div class="beast"><i style="background:${c}"></i><b>${t}</b><span>${d}</span></div>`;
  menuShow('help', `
    <div class="scrim full"></div>
    <div class="panel wide${cors ? ' cors' : ''}">
      <div class="kicker">${T('menu.help')}</div>
      <h2>${T('help.title')}</h2>
      <div class="two">
        <div>
          ${row('<kbd>↑</kbd>', T(cors ? 'help.up.c' : 'help.up'))}
          ${row('<kbd>↓</kbd>', T('help.down'))}
          ${row('<kbd>←</kbd> <kbd>→</kbd>', T('help.lr'))}
          ${row(`<kbd>${T('k.space')}</kbd>`, T(cors ? 'help.fire.c' : 'help.fire'))}
          ${cors ? row(`<kbd>${T('k.enter')}</kbd>`, T('help.enter')) : ''}
          ${row(`<kbd>P</kbd> <kbd>${T('k.esc')}</kbd>`, T('help.pause'))}
          ${row('<kbd>M</kbd>', T('help.mute'))}
          <p class="small">${T(cors ? 'help.small.c' : 'help.small')}</p>
          ${typeof TOUCH !== 'undefined' && TOUCH.on ? `<p class="small touch-help">${T('help.touch')}</p>` : ''}
        </div>
        <div>
          <h3>${T('help.float')}</h3>
          ${obj('#8a6a44', T('help.o1'), T(cors ? 'help.c1d' : 'help.o1d'))}
          ${obj('#6a4826', T('help.o2'), T('help.o2d'))}
          ${obj('#a0603a', T('help.o3'), T('help.o3d'))}
          ${obj('#ff7a2a', T('help.o4'), T('help.o4d'))}
          ${obj('#0d2a3a', T('help.o5'), T(cors ? 'help.c5d' : 'help.o5d'))}
          ${cors ? `${obj('#e0aa40', T('help.c6'), T('help.c6d'))}
          ${obj('#c84a3a', T('help.c7'), T('help.c7d'))}
          ${obj('#3a9a4a', T('help.c8'), T('help.c8d'))}
          <p class="small">${T('help.close')}</p>` : `${obj(PRISES.voilure.color, T('help.o6'), T('help.o6d'))}
          ${obj(PRISES.coque.color, T('help.o7'), T('help.o7d'))}
          ${obj(PRISES.canons.color, T('help.o8'), T('help.o8d'))}
          <p class="small">${T('help.levels')} ${T('help.lose')}</p>`}
        </div>
      </div>
      <h3 class="beasts-h">${T('help.beasts')}</h3>
      <div class="three">
        ${beast('#3c4752', T('help.b1'), T('help.b1d'))}
        ${beast('#9a3a34', T('help.b2'), T('help.b2d'))}
        ${beast('#b8261a', T('help.b3'), T('help.b3d'))}
      </div>
      <div class="actions"><button class="item" data-item="0"><span class="bar"></span><span class="t">${T('k.backItem')}</span></button></div>
    </div>
    ${hints()}`, { go: [back], back });
}

/* ---------- choix du navire : en 3D, tous à la même échelle ---------- */

/* le choix du navire. En histoire (forStory), le Kōtetsu n'est pas proposé ; ailleurs, les navires
 * pas encore gagnés se montrent, avec ce qui les débloque, mais ne se prennent pas. */
function chooseShip(go, back, title, forStory) {
  G.mode = 'menu';
  if (G.game !== 'demo') demoStart('ships');
  else G.demo.view = 'ships';
  if (!shipUnlocked('stonewall')) demoTempShip('stonewall');
  const LIST = G.ships.map((s) => s.spec.id);
  const canTake = (id) => shipUnlocked(id) && !(forStory && id === 'stonewall');
  const lockWhy = (id) => {
    if (forStory && id === 'stonewall') return T('lock.story');
    const u = UNLOCK[id];
    if (u === 'arcade') return T('lock.arcade', ARCADE_END);
    const i = STAGES.findIndex((s) => s.id === u);
    return T('lock.stage', i + 1, tx(STAGES[i].title));
  };
  let idx = LIST.indexOf(G.shipId);
  if (idx < 0 || !canTake(LIST[idx])) idx = Math.max(0, LIST.findIndex(canTake));
  const stat = (l, v, lo, hi) => `<div class="stat"><span>${l}</span><i><b style="width:${(clamp((v - lo) / (hi - lo), 0.06, 1) * 100).toFixed(0)}%"></b></i></div>`;
  const render = () => {
    const s = SHIPS[LIST[idx]], ok = canTake(LIST[idx]);
    G.demo.focus = idx;
    el('ship-info').innerHTML = `
      <div class="kicker">${tx(s.kind)}</div>
      <h2>${LANG === 'ja' ? s.jp : s.name} <span class="jp">${LANG === 'ja' ? s.name : s.jp}</span></h2>
      <div class="stats">${stat(T('ship.speed'), s.speed, 190, 300)}${stat(T('ship.helm'), s.turn, 1.8, 3.8)}${stat(T('ship.hull'), s.hull, 60, 160)}${stat(T('ship.chase'), s.chase, 0, 2.4)}</div>
      <table class="facts">${s.facts.map(([k, v]) => `<tr><th>${T('fact.' + k)}</th><td>${tx(v)}</td></tr>`).join('')}</table>
      <p class="note">${tx(s.note)}</p>
      ${ok ? '' : `<div class="lockline"><b>${T('lock.h')}</b>${lockWhy(LIST[idx])}</div>`}`;
    el('ship-tabs').innerHTML = LIST.map((id, i) => `<span class="${i === idx ? 'on' : ''}${canTake(id) ? '' : ' locked'}">${LANG === 'ja' ? SHIPS[id].jp : SHIPS[id].name}<small>${canTake(id) ? SHIPS[id].L.toFixed(0) + ' m' : T('lock.tab')}</small></span>`).join('');
    const take = el('menu').querySelector('[data-item="0"] .t');
    if (take) { take.textContent = ok ? T('ship.take') : T('lock.btn'); take.parentNode.classList.toggle('disabled', !ok); }
  };
  menuShow('ships', `
    <div class="scrim left"></div>
    <div class="ship-panel">
      <div class="kicker">${title || T('ship.fleet')}</div>
      <div id="ship-info"></div>
      <div class="actions">
        <button class="item" data-item="0"><span class="bar"></span><span class="t">${T('ship.take')}</span></button>
        <button class="item" data-item="1"><span class="bar"></span><span class="t">${T('k.backItem')}</span></button>
      </div>
    </div>
    <div id="ship-tabs" class="ship-tabs"></div>
    <div class="scale-note">${T('ship.scale')}</div>
    ${hints(`<span><kbd>←</kbd><kbd>→</kbd> ${T('ship.change')}</span>`)}`, {
    go: [() => { if (!canTake(LIST[idx])) { Snd.clang(0); return; } G.shipId = LIST[idx]; demoDropTemp(); go(LIST[idx]); }, () => { demoDropTemp(); (back || showTitle)(); }],
    back: () => { demoDropTemp(); (back || showTitle)(); },
    lr: (d) => { idx = (idx + d + LIST.length) % LIST.length; render(); Snd.tick && Snd.tick(); },
  });
  render();
}

/* ---------- arcade ---------- */

function arcadeMenu() {
  G.mode = 'menu';
  Music.play('theme');
  if (G.game !== 'demo') demoStart('title'); else G.demo.view = 'title';
  const c = arcadeLoad('classique');
  const items = [];
  const go = (lvl) => () => chooseShip((id) => startArcade(id, lvl, 'classique'), arcadeMenu, T('arc.title.c'));
  items.push([T('arc.new'), T('arc.c.d'), go(1)]);
  if ((c.level || 1) > 1) items.push([T('arc.c.resume', c.level), T('arc.resume.d'), go(c.level)]);
  items.push([T('k.backItem'), '', showTitle]);
  menuShow('arcade', `
    <div class="scrim left"></div>
    <div class="side-block">
      <div class="kicker">${T('menu.arcade')}</div>
      <h2>${T('arc.h')}</h2>
      <p class="lead">${T('arc.lead')}</p>
      <div class="record"><span>${T('arc.rec.c')}</span><b>${fmt0(c.best || 0)}</b></div>
      <nav class="main-list">${items.map(([t], i) => `<button class="item" data-item="${i}"><span class="bar"></span><span class="t">${t}</span></button>`).join('')}</nav>
      <p id="menu-desc" class="desc"></p>
    </div>
    ${hints()}`, { go: items.map((x) => x[2]), desc: items.map((x) => x[1]), back: showTitle });
}

/* ---------- corsaire ---------- */

/* le corsaire : pas de choix de navire, on le construit soi-même au chantier */
function corsaireMenu() {
  G.mode = 'menu';
  Music.play('theme');
  if (G.game !== 'demo') demoStart('title'); else G.demo.view = 'title';
  const v = corsVoyage();
  /* la difficulté : celle de la prochaine traversée, qu'on change avec ← → ; la traversée en cours garde la sienne */
  let d = corsDiffPick();
  const vd = v ? clamp(v.diff | 0, 0, CORS_DIFF.length - 1) : 0;
  const name = (i) => T('cor.diff.' + CORS_DIFF[i].id);
  const low = (i) => name(i).toLowerCase();
  const sp = LANG === 'ja' ? '' : ' ';
  const diffItem = () => `${T('cor.diff')} : <b class="opt">‹ ${name(d)} ›</b>`;
  const diffDesc = () => T('cor.diff.' + CORS_DIFF[d].id + '.d') + (v && vd !== d ? sp + T('cor.diff.keep', low(vd)) : '');
  const newDesc = () => T(v ? 'cor.new.erase' : 'cor.new.d') + sp + T('cor.diff.of', low(d));
  const record = () => { const r = corsRecord(d); return `<span>${T('cor.rec')} · ${name(d)}</span><b>${fmt0(r.best)}</b>${r.won ? `<span>${T('cor.won')}</span><b>✓</b>` : ''}`; };
  const items = [];
  if (v) {
    corsInit();
    const P = CORS.sites.find((p) => p.id === v.last) || CORS.sites.find((p) => p.role === 'home');
    const nShips = 1 + (v.fleet ? v.fleet.length : 0);
    items.push([T('cor.resume', LANG === 'ja' ? P.jp : P.name), T('cor.resume.d', Object.keys(v.owned || {}).length, CORS_PORTS, fmt0(v.coins), nShips > 1 ? T('cor.resume.sn', nShips) : T('cor.resume.s1')) + sp + T('cor.diff.of', low(vd)), () => startCorsaire(true)]);
  }
  const iNew = items.length;
  items.push([T('cor.new'), newDesc(), () => startCorsaire(false)]);
  items.push([T('tuto.item'), T('tuto.item.d'), startCorsaireTuto]);
  const iDiff = items.length;
  const cycle = (s) => {
    d = (d + s + CORS_DIFF.length) % CORS_DIFF.length;
    arcadeSave('corsaire', { diff: d });
    const t = MENU.items[iDiff] && MENU.items[iDiff].querySelector('.t');
    if (t) t.innerHTML = diffItem();
    MENU.desc[iDiff] = diffDesc(); MENU.desc[iNew] = newDesc();
    el('cors-rec').innerHTML = record();
    menuSelect(iDiff, true);
    Snd.tick && Snd.tick();
  };
  items.push([diffItem(), diffDesc(), () => cycle(1)]);
  items.push([T('k.backItem'), '', showTitle]);
  menuShow('arcade', `
    <div class="scrim left"></div>
    <div class="side-block cors-block">
      <div class="kicker">${T('menu.corsaire')}</div>
      <h2>${T('cor.h')}</h2>
      <p class="stage-plate">${T('cor.stage')}</p>
      <p class="lead">${T('cor.lead')}</p>
      <div id="cors-rec" class="record">${record()}</div>
      <nav class="main-list">${items.map(([t], i) => `<button class="item" data-item="${i}"><span class="bar"></span><span class="t">${t}</span></button>`).join('')}</nav>
      <p id="menu-desc" class="desc"></p>
    </div>
    ${hints(`<span><kbd>←</kbd><kbd>→</kbd> ${T('cor.diff')}</span>`)}`, { go: items.map((x) => x[2]), desc: items.map((x) => x[1]), back: showTitle, lr: (s) => { if (MENU.sel === iDiff) cycle(s); } });
}

function startArcade(id, level, variant) {
  loading(() => {
    arcadeStart(id, level, variant);
    enterPlay();
  });
}

/* ---------- histoire ---------- */

function chartThumb(st, W_, H_, marks) {
  const cv = document.createElement('canvas');
  cv.width = W_ * 2; cv.height = H_ * 2;
  const c = cv.getContext('2d');
  c.scale(2, 2);
  const m = MAPS[st.map], [x0, y0, x1, y1] = m.win;
  const k = Math.min(W_ / (x1 - x0), H_ / (y1 - y0)) * 0.98;
  const ox = (W_ - (x1 - x0) * k) / 2, oy = (H_ - (y1 - y0) * k) / 2;
  const g = c.createLinearGradient(0, 0, 0, H_);
  g.addColorStop(0, '#e9dcc0'); g.addColorStop(1, '#d6c49c');
  c.fillStyle = g; c.fillRect(0, 0, W_, H_);
  c.strokeStyle = 'rgba(90,70,40,0.12)';
  for (let x = 0; x < W_; x += 18) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H_); c.stroke(); }
  for (let y = 0; y < H_; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(W_, y); c.stroke(); }
  const path = () => { c.beginPath(); for (const f of m.land) { c.moveTo(ox + (f[0] - x0) * k, oy + (f[1] - y0) * k); for (let i = 2; i < f.length; i += 2) c.lineTo(ox + (f[i] - x0) * k, oy + (f[i + 1] - y0) * k); c.closePath(); } };
  for (let i = 4; i >= 1; i--) { path(); c.strokeStyle = `rgba(60,90,110,${0.07 * (5 - i)})`; c.lineWidth = i * 3; c.stroke(); }
  path(); c.fillStyle = '#c9b48a'; c.fill();
  c.strokeStyle = '#5a4428'; c.lineWidth = 1; c.stroke();
  if (marks) {
    const P = (x, y) => [ox + (x - x0) * k, oy + (y - y0) * k];
    const [sx_, sy_] = P(st.start[0], st.start[1]);
    c.fillStyle = '#1c3a5a'; c.beginPath(); c.arc(sx_, sy_, 5, 0, TAU); c.fill();
    c.font = 'italic 12px Georgia, "Yu Mincho", serif'; c.fillText(T('map.start'), sx_ + 8, sy_ + 4);
    const g = st.goal;
    const tgt = g.type === 'collect' ? (st.crates ? st.crates[0] : st.boats ? st.boats[0] : null)
      : g.target ? (st.enemies.find((e) => e.ship === g.target) || {}).at
      : g.zone ? [g.zone.x, g.zone.y] : st.friends && g.type === 'coal' ? st.friends[0].at : null;
    if (tgt) { const [tx_, ty_] = P(tgt[0], tgt[1]); c.strokeStyle = '#a8261c'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(tx_ - 7, ty_ - 7); c.lineTo(tx_ + 7, ty_ + 7); c.moveTo(tx_ + 7, ty_ - 7); c.lineTo(tx_ - 7, ty_ + 7); c.stroke(); c.fillStyle = '#a8261c'; c.fillText(T('map.goal'), tx_ + 10, ty_ + 4); }
    if (!m.land.length) { c.fillStyle = 'rgba(60,70,90,0.6)'; c.font = 'italic 15px Georgia, "Yu Mincho", serif'; c.textAlign = 'center'; c.fillText(T('map.open'), W_ / 2, H_ * 0.3); c.textAlign = 'left'; }
  }
  /* rose des vents */
  c.save(); c.translate(W_ - 22, 24);
  c.fillStyle = '#5a4428'; c.beginPath(); c.moveTo(0, -12); c.lineTo(4, 0); c.lineTo(0, 12); c.lineTo(-4, 0); c.closePath(); c.fill();
  c.font = 'bold 10px Georgia'; c.textAlign = 'center'; c.fillText('N', 0, -15);
  c.restore();
  return cv;
}

function storyMenu() {
  G.mode = 'menu';
  Music.play('theme');
  if (G.game !== 'demo') demoStart('title'); else G.demo.view = 'title';
  const sv = storyLoad(), done = sv.done || 0, best = sv.best || {};
  const cards = STAGES.map((st, i) => `
    <div class="card${i < done ? ' done' : ''}${i > done ? ' locked' : ''}" data-item="${i}">
      <div class="thumb" data-thumb="${i}"></div>
      <div class="num">${String(i + 1).padStart(2, '0')}</div>
      <div class="body">
        <div class="when">${tx(st.when)}</div>
        <h3>${tx(st.title)}</h3>
        <div class="place">${tx(st.place)}</div>
        ${i < done ? `<div class="badge">${T('story.done')}${best[st.id] ? ' · ' + fmt0(best[st.id]) : ''}</div>` : ''}
        ${i > done ? `<div class="badge lock">${T('story.locked')}</div>` : ''}
      </div>
    </div>`).join('');
  menuShow('story', `
    <div class="scrim bottom"></div>
    <div class="story-head">
      <div class="kicker">${T('menu.story')}</div>
      <h2>${T('story.h')}</h2>
      <p class="lead">${T('story.lead')}</p>
    </div>
    <div class="cards">${cards}</div>
    ${hints(`<span><kbd>←</kbd><kbd>→</kbd> ${T('k.choose')}</span>`, true)}`, {
    go: STAGES.map((st, i) => () => { if (i > done) { Snd.clang(0); return; } storyOpen(i); }), back: showTitle, axis: 'h', sel: Math.min(done, STAGES.length - 1),
  });
  el('menu').querySelectorAll('[data-thumb]').forEach((n) => n.appendChild(chartThumb(STAGES[+n.dataset.thumb], 300, 170, false)));
}

function storyBrief(idx) {
  const st = STAGES[idx];
  G.mode = 'menu';
  if (G.game !== 'demo') demoStart('title'); else G.demo.view = 'title';
  const shipLine = st.choose ? T('brief.choose') : T('brief.command', LANG === 'ja' ? SHIPS[st.ship].jp : SHIPS[st.ship].name);
  const go = st.choose
    ? () => chooseShip((id) => startStory(idx, id), () => storyBrief(idx), T('hud.stage', idx + 1, STAGES.length) + ' · ' + tx(st.title), true)
    : () => startStory(idx, st.ship);
  /* appareiller, revoir le récit en images, revenir à la carte des étapes */
  const acts = [[T(st.choose ? 'brief.pick' : 'brief.sail'), go]];
  if (recitHas(st.id, 'avant')) acts.push([T('recit.btn'), () => showRecit(idx, 'avant', () => storyBrief(idx))]);
  acts.push([T('k.backItem'), storyMenu]);
  Music.play('brief');
  menuShow('brief', `
    <div class="scrim full"></div>
    <div class="brief">
      <div class="brief-text">
        <div class="kicker">${T('hud.stage', idx + 1, STAGES.length)} · ${tx(st.when)}</div>
        <h2>${tx(st.title)}</h2>
        <div class="place">${tx(st.place)} · ${tx(st.lunar)}</div>
        ${st.brief.map((p) => `<p>${tx(p)}</p>`).join('')}
        ${st.quote ? `<blockquote class="quote">${tx(st.quote)}<cite>${tx(COLLACHE)}</cite></blockquote>` : ''}
        ${st.steps && st.steps.length > 1
    ? `<div class="objective steps"><span>${T('brief.steps')}</span><ol>${st.steps.map((p) => `<li>${tx(p.t)}</li>`).join('')}</ol><div class="ship">${shipLine}</div></div>`
    : `<div class="objective"><span>${T('brief.goal')}</span>${tx(st.objective)} ${shipLine}</div>`}
        <div class="actions">
          ${acts.map(([t], i) => `<button class="item" data-item="${i}"><span class="bar"></span><span class="t">${t}</span></button>`).join('')}
        </div>
      </div>
      <div class="brief-map" id="brief-map"></div>
    </div>
    ${hints()}`, { go: acts.map((a) => a[1]), back: storyMenu, lr: (d) => menuSelect(MENU.sel + d) });
  el('brief-map').appendChild(chartThumb(st, 520, 560, true));
}

function startStory(idx, shipId) {
  loading(() => {
    storyStart(idx, shipId);
    enterPlay();
  });
}

/* ---------- chargement, entrée en jeu ---------- */

function loading(fn) {
  menuHide();
  hidePause();
  el('loading').classList.remove('hidden');
  G.mode = 'loading';
  setTimeout(() => {
    fn();
    el('loading').classList.add('hidden');
  }, 60);
}

function enterPlay() {
  if (G.game !== 'story') hideOrders();
  R3.camMode = 'game';
  updateZoom(0, true);
  showHud(true);
  el('h-map').classList.toggle('hidden', G.game === 'arcade' && G.arc.variant === 'classique');
  prepareMini();
  updateHud();
  clearInput();
  G.mode = 'play';
  fadeIn();
}

function fadeIn() { R3.post.uniforms.uFade.value = 0; R3.fadeT = performance.now(); }

/* ---------- pause et résultats ---------- */

function pauseGame() {
  G.mode = 'pause';
  const resume = () => { menuHide(); hidePause(); clearInput(); G.mode = 'play'; showHud(true); Music.duck(false); };
  Music.duck(true);
  const cors = G.game === 'arcade' && G.arc.variant === 'corsaire';
  const tuto = cors && G.cors && G.cors.tuto;
  const restart = tuto ? startCorsaireTuto : cors ? () => startCorsaire(true) : G.game === 'arcade' ? () => startArcade(G.shipId, G.arc.level, G.arc.variant) : () => startStory(G.stageIdx, G.shipId);
  const label = tuto ? T('tuto.title') : cors ? T('menu.corsaire') + ' · ' + T('cor.diff.' + corsD().id) + ' · ' + T('cor.res.sub', corsOwned(), CORS_PORTS) : G.game === 'arcade' ? T('menu.arcade') + ' · ' + T('hud.level') + ' ' + G.arc.level : T('hud.stage', G.stageIdx + 1, STAGES.length) + ' · ' + tx(G.stage.title);
  el('pause-veil').classList.remove('hidden');
  const items = [[T('pause.resume'), resume], [T(tuto ? 'tuto.again' : cors ? 'pause.restart.k' : G.game === 'arcade' ? 'pause.restart.a' : 'pause.restart.s'), restart], [T('menu.help'), () => showHelp(pauseGame)], [T('menu.main'), showTitle]];
  menuShow('pause', `
    <div class="pause-box">
      <div class="kicker">${label}</div>
      <h2>${T('pause.h')}</h2>
      ${G.game === 'story' && G.st ? `<div class="pause-orders"><span>${T('pause.orders')}</span>${storyGoalLine()}${G.st.step && stageStep(G.st.step) ? `<em>${tx(stageStep(G.st.step).t)}</em>` : ''}</div>` : ''}
      <nav class="main-list">${items.map(([t], i) => `<button class="item" data-item="${i}"><span class="bar"></span><span class="t">${t}</span></button>`).join('')}</nav>
    </div>
    ${hints()}`, { go: items.map((x) => x[1]), back: resume });
}
function hidePause() { el('pause-veil').classList.add('hidden'); }

function showResults(o) {
  const stats = (o.stats || []).map(([k, v, note]) => `<div class="res-stat"><span>${k}</span><b data-count="${typeof v === 'number' ? v : ''}">${typeof v === 'number' ? '0' : v}</b>${note ? `<em>${note}</em>` : ''}</div>`).join('');
  menuShow('results', `
    <div class="scrim full"></div>
    <div class="results">
      <div class="kicker">${o.kicker || ''}</div>
      <h2>${o.title}</h2>
      ${o.sub ? `<div class="place">${o.sub}</div>` : ''}
      ${o.after ? `<div class="after"><span>${T('res.after')}</span><p>${o.after}</p></div>` : ''}
      ${o.tip ? `<p class="tip">${o.tip}</p>` : ''}
      ${stats ? `<div class="res-stats">${stats}</div>` : ''}
      <nav class="main-list">${o.actions.map((a, i) => `<button class="item" data-item="${i}"><span class="bar"></span><span class="t">${a.label}</span></button>`).join('')}</nav>
    </div>
    ${hints()}`, { go: o.actions.map((a) => a.go), back: null });
  /* les chiffres défilent */
  const nodes = [...el('menu').querySelectorAll('[data-count]')].filter((n) => n.dataset.count !== '');
  const t0 = performance.now();
  const step = (now) => {
    const t = clamp((now - t0) / 1200, 0, 1), e = 1 - Math.pow(1 - t, 3);
    for (const n of nodes) n.textContent = fmt0(+n.dataset.count * e);
    if (t < 1 && MENU.screen === 'results') requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
