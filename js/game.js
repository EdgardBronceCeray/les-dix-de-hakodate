'use strict';

/* La boucle, le fond animé des menus, le démarrage. */

const G = {
  mode: 'boot', game: null, me: null, ships: [], shots: [], parts: [], objs: [], crates: [], prises: [], whirls: [],
  boats: [], wrecks: [], floats: [], pending: [], zones: [], field: { w: 10000, h: 10000, wrap: false },
  world: { polys: [], rocks: [], labels: [], w: 10000, h: 10000 }, mapLand: () => false,
  score: 0, best: 0, shake: 0, hudT: 0, last: 0, fps: [],
};

function clearInput() { keys.clear(); pressed.clear(); }

/* ---------- le fond des menus : la flotte sous voiles devant Hakodate ---------- */

function demoStart(view) {
  const was = G.game === 'demo';
  G.game = 'demo';
  if (G.demo && was) { G.demo.view = view; return; }
  setSea({ wind: 250, sea: 1.5, season: 'soir' }, 'soir');
  setArcadeWorld();
  W.drift = [0, 0];
  RNG = makeRng(77);
  G.shots = []; G.parts = []; G.objs = []; G.crates = []; G.prises = []; G.whirls = []; G.boats = []; G.wrecks = []; G.floats = []; G.pending = []; G.zones = [];
  G.beasts = []; G.redK = 0;
  /* la flotte manœuvre en ligne de file dans la grande rade, bien à l'écart des îles */
  const cx = OPEN.arch.harbor.x, cy = OPEN.arch.harbor.y;
  G.demo = { view, focus: 0, cx, cy, R: 1150, t: 0, trail: [], gap: 300 };
  G.ships = fleetIds().map((id, i) => {
    const a = -i * 300 / 1150;
    const s = makeShip(id, cx + Math.cos(a) * 1150, cy + Math.sin(a) * 1150, a + Math.PI / 2);
    s.throttle = 0.4; s.v = 95;
    return s;
  });
  /* le sillage du chef de file, que les autres suivent */
  for (let k = 0; k <= 1400; k += 10) { const a = -k / 1150; G.demo.trail.push([cx + Math.cos(a) * 1150, cy + Math.sin(a) * 1150]); }
  G.demo.trail.reverse();
  for (let i = 0; i < 6; i++) { const p = freeWater(cx + rndSym(1300), cy + rndSym(1300), 10, 60); if (p) addObj('radeau', 1 + (i % 3), p[0], p[1], rndSym(6), rndSym(6)); }
  for (let i = 0; i < 5; i++) { const p = freeWater(cx + rndSym(1300), cy + rndSym(1300), 10, 30); if (p) addCrate(p[0], p[1], rndSym(4), rndSym(4)); }
  R3.camMode = 'cine';
  R3.cine.snap = true;
  showHud(false);
}

/* le choix du navire montre aussi le Kōtetsu pas encore gagné, avec ce qui le débloque :
 * il rejoint la file en serre-file le temps du choix, puis la quitte */
function demoTempShip(id) {
  if (G.game !== 'demo' || !G.demo || G.ships.some((s) => s.spec.id === id)) return;
  const last = G.ships[G.ships.length - 1];
  const s = makeShip(id, last.x - Math.cos(last.h) * G.demo.gap, last.y - Math.sin(last.h) * G.demo.gap, last.h);
  s.throttle = 0.4; s.v = 95; s.temp = true;
  G.ships.push(s);
}
function demoDropTemp() {
  if (G.game !== 'demo') return;
  G.ships = G.ships.filter((s) => !s.temp);
  if (G.demo) G.demo.focus = Math.min(G.demo.focus || 0, G.ships.length - 1);
}

function demoUpdate(dt) {
  const D = G.demo;
  D.t += dt;
  /* le Kōtetsu à gagner ne reste dans la file que le temps du choix du navire */
  if (D.view !== 'ships' && G.ships.some((s) => s.temp)) demoDropTemp();
  /* le chef de file tourne sur son cercle ; les autres suivent son sillage */
  const L = G.ships[0], T = D.trail;
  {
    const a = Math.atan2(L.y - D.cy, L.x - D.cx), ta = a + 0.22;
    const want = Math.atan2(D.cy + Math.sin(ta) * D.R - L.y, D.cx + Math.cos(ta) * D.R - L.x);
    const diff = wrapA(want - L.h);
    L.throttle = 95 / maxSpeed(L);
    steerShip(L, dt, false, false, diff < -0.03, diff > 0.03);
    moveOnMap(L, dt);
    const lp = T[T.length - 1];
    if (Math.hypot(L.x - lp[0], L.y - lp[1]) >= 10) { T.push([L.x, L.y]); if (T.length > 400) T.shift(); }
  }
  for (let i = 1; i < G.ships.length; i++) {
    const s = G.ships[i];
    /* le point du sillage, à i encablures derrière le chef */
    let need = i * D.gap, k = T.length - 1, acc = Math.hypot(L.x - T[k][0], L.y - T[k][1]);
    while (k > 0 && acc < need) { acc += Math.hypot(T[k][0] - T[k - 1][0], T[k][1] - T[k - 1][1]); k--; }
    /* on vise un peu plus loin sur le sillage pour suivre la courbe sans couper */
    const ka = Math.min(T.length - 1, k + 9), tp = T[ka], sp = T[k];
    const want = Math.atan2(tp[1] - s.y, tp[0] - s.x);
    const diff = wrapA(want - s.h);
    const ahead = (sp[0] - s.x) * Math.cos(s.h) + (sp[1] - s.y) * Math.sin(s.h);
    s.throttle = clamp((95 + ahead * 0.9) / maxSpeed(s), 0.15, 1);
    steerShip(s, dt, false, false, diff < -0.03, diff > 0.03);
    moveOnMap(s, dt);
  }
  shipContacts();
  driftObjects(dt);
  updateParts(dt);
  /* la caméra : toujours du côté du soleil, pour que les navires soient éclairés */
  const C = R3.cine;
  const sun = Math.atan2(R3.sunDir.z, R3.sunDir.x);
  if (D.view === 'ships') {
    const s = G.ships[D.focus];
    /* la caméra se tient toujours sur bâbord de la ligne de file : l'avant à gauche,
     * l'arrière à droite. Le navire suivant de la liste, qui vient derrière, est donc
     * toujours à droite, et la flèche droite fait glisser la vue vers la droite.
     * Dans ce demi-tour d'horizon, on se rapproche le plus possible du côté du soleil. */
    const pref = sun + 0.9 + Math.sin(D.t * 0.15) * 0.25;
    const lo = -1.95, hi = -0.7;
    let rel = wrapA(pref - s.h);
    if (rel >= lo && rel <= hi) D.camEnd = null;
    else {
      /* hors du demi-tour permis : on garde la borne la plus proche, sans sauter d'un bord à l'autre */
      if (!D.camEnd) D.camEnd = Math.abs(wrapA(rel - hi)) <= Math.abs(wrapA(rel - lo)) ? 'hi' : 'lo';
      rel = D.camEnd === 'hi' ? hi : lo;
    }
    const a = s.h + rel, dist = 150 + s.spec.L * 2.3;
    const fx_ = s.x + Math.cos(a) * dist, fz = s.y + Math.sin(a) * dist;
    /* le navire à droite de l'écran, à côté de la fiche : on vise un point à sa gauche */
    const dx = s.x - fx_, dz = s.y - fz, l = Math.hypot(dx, dz);
    const rx = -dz / l, rz = dx / l, off = dist * 0.17;
    C.at.set(s.x - rx * off, 14, s.y - rz * off);
    C.from.set(fx_, dist * 0.3, fz);
    /* la mise au point sur le navire montré */
    C.focus = dist * 1.04; C.dof = 0.9;
  } else {
    /* la tête de la ligne au premier plan, les autres qui s'éloignent derrière */
    const A = G.ships[0], B = G.ships[1];
    const k = D.camK !== undefined ? D.camK : 1;
    const mx = A.x * k + B.x * (1 - k), my = A.y * k + B.y * (1 - k);
    const a = A.h + (D.camA !== undefined ? D.camA : 0.35) + Math.sin(D.t * 0.05) * 0.12;
    const dist_ = D.camD || 560;
    const fx_ = mx + Math.cos(a) * dist_, fz = my + Math.sin(a) * dist_;
    const dx = mx - fx_, dz = my - fz, l = Math.hypot(dx, dz);
    /* la visée est décalée à gauche des navires : ils passent à droite de l'écran, à côté du menu */
    const off = D.camO !== undefined ? D.camO : 120;
    C.at.set(mx + dz / l * off, 26, my - dx / l * off);
    C.from.set(fx_, D.camH || 110, fz);
    C.focus = Math.hypot(dist_, D.camH || 110); C.dof = 0.75;
  }
}

/* ---------- la boucle ---------- */

function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.max(0, (now - (G.last || now)) / 1000);
  const dt = Math.min(0.05, raw);
  G.last = now;
  if (G.mode === 'play' || G.mode === 'over') {
    if (G.mode === 'play' && hit('p', 'Escape')) pauseGame();
    else {
      if (hit('m')) { Snd.mute(!Snd.muted); banner(T(Snd.muted ? 'snd.off' : 'snd.on'), '', 1.2); }
      W.t += dt;
      if (G.game === 'arcade') arcadeUpdate(dt);
      else if (G.game === 'story') storyUpdate(dt);
      G.hudT -= dt;
      if (G.hudT <= 0) { G.hudT = 0.08; updateHud(); }
      if (G.me) Snd.ambient(6 + SEA.sea * 4, SEA.sea, G.me.sinking ? 0 : G.me.throttle, G.me.spec.prop === 'paddle', dt);
    }
    if (G.shake > 0) { cam.x += rndSym(G.shake * 7); cam.y += rndSym(G.shake * 7); G.shake = Math.max(0, G.shake - dt * 2.5); }
  } else if (G.mode !== 'loading') {
    W.t += dt;
    if (G.game === 'demo') demoUpdate(dt);
    /* le chantier du corsaire : la caméra tourne autour du navire à quai */
    if (YARD.open) yardUpdate(dt);
    if (Snd.ac) Snd.ambient(6 + SEA.sea * 4, SEA.sea, 0, false, dt);
  }
  if (!G.noRender) { render3D(dt); drawOverlay(dt); }
  tickBanner(dt);
  qualityWatch(dt, raw);
  endFrameInput();
}

/* si l'ordinateur peine, on allège l'image par paliers. On en juge sur deux secondes et demie
 * d'images, une fois passée la première seconde d'un écran (le temps que tout se mette en place) ;
 * un à-coup isolé (onglet caché, chargement) ne compte que pour un dixième de seconde. En jeu,
 * sous 38 images par seconde ; dans les menus, sous 25 seulement. Très à la peine, on descend
 * deux paliers d'un coup. */
const QW = { n: 0, sum: 0, mode: '', skip: 0 };
function qualityWatch(dt, raw) {
  const watch = G.mode === 'play' || G.mode === 'menu';
  if (!watch || R3.quality >= 3) { QW.mode = ''; return; }
  if (G.mode !== QW.mode) { QW.mode = G.mode; QW.n = QW.sum = 0; QW.skip = 30; return; }
  if (QW.skip > 0) { QW.skip--; return; }
  QW.n++; QW.sum += Math.min(raw, 0.1);
  if (QW.sum < 2.5 || QW.n < 30) return;
  const avg = QW.sum / QW.n;
  QW.n = QW.sum = 0;
  if (avg < (G.mode === 'play' ? 0.026 : 0.04)) return;
  R3.quality = Math.min(3, (R3.quality || 0) + (avg > 0.06 ? 2 : 1));
  applyQuality();
}

/* paliers : 0 tout au maximum ; 1 définition réduite, sans reflets ; 2 sans occlusion ambiante,
 * ombres 2048 ; 3 sans halo, ombres 1024, définition basse */
function applyQuality() {
  const q = R3.quality || 0;
  const dpr = window.devicePixelRatio || 1;
  R3.r.setPixelRatio(q === 0 ? Math.min(dpr, 2) : q === 1 ? Math.min(dpr, 1.25) : q === 2 ? 1 : 0.75);
  R3.aoOn = q <= 1;
  R3.reflOn = q === 0;
  const ms = q <= 1 ? 4096 : q === 2 ? 2048 : 1024;
  if (R3.sun.shadow.mapSize.x !== ms) {
    R3.sun.shadow.mapSize.set(ms, ms);
    if (R3.sun.shadow.map) { R3.sun.shadow.map.dispose(); R3.sun.shadow.map = null; }
  }
  R3.noBloom = q >= 3;
  resize3D();
}

function boot() {
  setLang(LANG);
  init3D();
  buildHud();
  applyStaticText();
  G.onResize = () => {
    if (G.game === 'arcade' && G.arc && G.arc.variant === 'classique') arenaFit();
    if (G.mode === 'play') prepareMini();
  };
  window.addEventListener('keydown', () => Snd.wake(), { once: true });
  window.addEventListener('pointerdown', () => Snd.wake(), { once: true });
  el('loading').classList.remove('hidden');
  setTimeout(() => {
    showTitle();
    el('loading').classList.add('hidden');
    fadeIn();
    requestAnimationFrame(frame);
  }, 30);
}

window.addEventListener('load', boot);
