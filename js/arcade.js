'use strict';

/* Mode arcade : la cargaison perdue.
 *  « Une cargaison s'est perdue au milieu des débris : allez la repêcher. »
 *  débris (rochers ordinaires) : se brisent en deux, puis encore en deux
 *  tonneaux (rochers éclatants) : quatre morceaux d'un coup
 *  épave chavirée (rocher de métal) : indestructible
 *  brûlot (rocher de haute énergie) : traverse le champ à toute allure
 *  tourbillon (trou noir) : attire tout
 *  caisses peintes (voile solaire, réparation, canon laser)
 * Le champ de débris se raccorde sur lui-même autour du navire, toujours au centre de l'écran.
 * Le mode corsaire part du même moteur, sur la grande carte du Japon, mais a sa propre boucle,
 * sans niveaux (corsaire.js). */

const ARCADE_SAVE = 'kaisen.arcade2';
function arcadeLoad(v) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(ARCADE_SAVE) || '{}'); } catch (e) { /* rien */ }
  return v ? all[v] || {} : all;
}
function arcadeSave(v, o) {
  try {
    const all = arcadeLoad();
    all[v] = Object.assign(all[v] || {}, o);
    localStorage.setItem(ARCADE_SAVE, JSON.stringify(all));
  } catch (e) { /* rien */ }
}
const arcadeBest = () => arcadeLoad('classique').best || 0;

const OPEN = { size: 10000, seed: 1869 };
const ISLAND_NAMES = ['Kurojima', 'Torishima', 'Matsushima', 'Kojima', 'Ōshima', 'Shirajima', 'Kamejima', 'Tsurushima', 'Iwashima', 'Takashima', 'Uomijima', 'Kasajima', 'Hinoshima', 'Sakurajima', 'Minamijima'];

/* ---------- l'archipel du décor des menus ---------- */

function genArchipelago(seed) {
  const rr = makeRng(seed);
  const S = OPEN.size;
  const islands = [];
  /* une grande rade libre au centre, pour le départ et pour le menu */
  const harbor = { x: S * 0.5, y: S * 0.5, r: 2300 };
  const home = { x: S * 0.5 + 300, y: S * 0.5 + 2900, r: 600, name: 'Hakodate', home: true };
  islands.push(home);
  let tries = 0, ni = 0;
  while (islands.length < 17 && tries++ < 2000) {
    const r = rr.range(180, 780);
    const x = rr.range(700, S - 700), y = rr.range(700, S - 700);
    if (islands.some((i) => dist(i.x, i.y, x, y) < i.r + r + 650)) continue;
    if (dist(x, y, harbor.x, harbor.y) < harbor.r + r) continue;
    islands.push({ x, y, r, name: ISLAND_NAMES[ni++ % ISLAND_NAMES.length] });
  }
  const polys = [], rocks = [], labels = [];
  for (const isl of islands) {
    const n = 96, flat = [];
    const ox = rr.range(0, 100), oy = rr.range(0, 100);
    const bays = [[rr() * TAU, rr.range(0.15, 0.35)], [rr() * TAU, rr.range(0.1, 0.3)]];
    isl.radius = (a) => {
      let k = 0.62 + 0.75 * fbm(ox + Math.cos(a) * 1.4, oy + Math.sin(a) * 1.4, 4);
      for (const [ba, bd] of bays) k *= 1 - bd * Math.pow(Math.max(0, Math.cos(a - ba)), 12);
      return isl.r * k;
    };
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      const r = isl.radius(a);
      flat.push(isl.x + Math.cos(a) * r, isl.y + Math.sin(a) * r);
    }
    polys.push(polyFrom(flat));
    const nr = Math.round(isl.r / 80);
    for (let i = 0; i < nr; i++) {
      const a = rr() * TAU, r = isl.radius(a) * rr.range(1.06, 1.25);
      rocks.push({ x: isl.x + Math.cos(a) * r, y: isl.y + Math.sin(a) * r, r: rr.range(9, 18) });
    }
    labels.push({ x: isl.x, y: isl.y, t: isl.name, r: isl.r * 0.35, noTown: isl.r < 380 && !isl.home });
  }
  return { islands, polys, rocks, labels, harbor, home };
}

function setArcadeWorld() {
  if (!OPEN.arch) OPEN.arch = genArchipelago(OPEN.seed);
  const A = OPEN.arch;
  const px = A.home.x - 40, py = A.home.y - A.home.radius(-Math.PI / 2) + 14;
  const extras = R3.terrains && R3.terrains.arcade ? [] : [buildPort(px, py, -Math.PI / 2)];
  /* le village de l'île ne bâtit pas sur la jetée ni au pied du phare */
  setWorld({ id: 'arcade', polys: A.polys, rocks: A.rocks, w: OPEN.size, h: OPEN.size, labels: A.labels, palette: 'soir', cell: 12, hScale: 1.3, seed: 3, maxTrees: 6500, edge: 200, extras, beforeTowns: () => [[px, py, 34], [px, py - 60, 30]] });
  G.port = { x: A.home.x, y: A.home.y - A.home.r - 300, r: 200 };
}

/* ---------- mise en place ---------- */

function arcadeStart(shipId, level, variant) {
  variant = variant || 'classique';
  G.game = 'arcade';
  G.shipId = shipId;
  G.score = 0;
  G.best = arcadeLoad(variant).best || 0;
  RNG = makeRng(OPEN.seed + (level || 1));
  W.drift = [0, 0];
  G.shots = []; G.parts = []; G.objs = []; G.crates = []; G.prises = []; G.whirls = []; G.boats = []; G.wrecks = []; G.floats = [];
  G.ships = []; G.pending = []; G.zones = [];
  G.arc = { variant, level: 0, t: 0, state: 'play', crates: 0, got: 0, need: 0 };
  G.mist = 0; G.lost = null; G.mistOut = -1e9;
  setWorld({ id: 'classique', polys: [], rocks: [], w: 2000, h: 2000 });
  const me = makeShip(shipId, 0, 0, -Math.PI / 2);
  me.throttle = 0; me.inv = 2.5;
  G.me = me; G.ships.push(me);
  arenaFit();
  G.onCrateLost = (c) => { if (c.level === G.arc.level) placeCrate(); };
  beastsReset();
  arcadeLevel(level || 1);
  followCamera(true);
}

/* l'arène classique : un champ un peu plus grand que l'écran, qui se raccorde sur
 * lui-même et reste centré sur le navire. Ce qui sort derrière revient devant, hors de vue. */
const ARENA_K = 1.7;
function arenaFit() {
  G.field = { w: cam.w * ARENA_K, h: cam.h * ARENA_K, wrap: true, around: true };
}

function arcadeLevel(n) {
  const A = G.arc, me = G.me, plan = arcadePlan(n);
  A.level = n; A.plan = plan; A.need = plan.crates; A.got = 0; A.state = 'play'; A.t = 0;
  /* les prises qu'on peut encore tirer des débris brisés, pour tout le niveau */
  A.drops = n <= 5 ? 4 : n <= 7 ? 2 : 1;
  A.brulots = plan.brulots; A.brulotT = 4; A.speedK = plan.speed;
  const amb = ['soir', 'été', 'printemps', 'nuit', 'hiver'][(n - 1) % 5];
  setSea({ wind: 200 + (n * 47) % 140, sea: Math.min(3.2, 1.2 + n * 0.2), season: amb === 'nuit' || amb === 'soir' ? 'soir' : amb, snow: amb === 'hiver', rain: n % 4 === 0 }, amb);
  /* ce qui reste du niveau précédent s'en va */
  G.whirls = [];
  /* chaque niveau repart de zéro : les caisses et les prises restées du niveau d'avant s'en vont
   * (seule une caisse tout juste passée par-dessus bord se rattrape encore) */
  G.objs = []; G.crates = []; G.prises = G.prises.filter((p) => p.lost);
  me.inv = 2.5;
  A.center = [me.x, me.y];
  /* certains niveaux amènent une grande bête : il y a alors un peu moins de débris */
  const fewer = beastsLevel(n);
  for (let i = 0; i < Math.max(3, plan.radeaux - fewer); i++) spawnField('radeau', 3);
  for (let i = 0; i < plan.amas; i++) spawnField('amas');
  for (let i = 0; i < plan.epaves; i++) spawnField('epave');
  for (let i = 0; i < plan.tourbillons; i++) { const p = farFromShip(380); if (p) G.whirls.push({ x: p[0], y: p[1], r: rnd(ARC.tourbillon.r[1], ARC.tourbillon.r[0]), dir: Math.random() < 0.5 ? 1 : -1 }); }
  for (let i = 0; i < plan.crates; i++) placeCrate();
  /* deux caisses cachées dans les plus gros débris */
  const big = G.objs.filter((o) => o.type === 'radeau' && o.size === 3 && !o.cargo).slice(0, 2);
  big.forEach((o) => { o.cargo = true; });
  /* les caisses peintes du niveau ne flottent pas éternellement : elles finissent par couler */
  for (let i = 0; i < plan.prises; i++) { const p = farFromShip(250); if (p) addPrise(p[0], p[1]).life = n <= 3 ? 60 : n <= 7 ? 45 : 35; }
  banner(T('hud.level') + ' ' + n, T('arc.lvl.sub', plan.crates), 2.8);
  Music.play(n % 2 ? 'sea' : 'combat');
  arcadeSave(A.variant, { level: Math.max(n, arcadeLoad(A.variant).level || 1) });
}

/* un point libre, loin du navire : dans l'arène, ou dans la mer autour */
function farFromShip(minD, maxD) {
  const me = G.me, A = G.arc;
  for (let t = 0; t < 80; t++) {
    let x, y;
    if (A.variant === 'classique') { x = me.x + rndSym(G.field.w / 2 - 40); y = me.y + rndSym(G.field.h / 2 - 40); }
    else {
      const a = rnd(TAU), d = rnd(maxD || cam.w * 0.95, minD);
      x = me.x + Math.cos(a) * d; y = me.y + Math.sin(a) * d;
      if (x < 300 || y < 300 || x > G.field.w - 300 || y > G.field.h - 300) continue;
      if (nearLand(x, y, 70)) continue;
    }
    if (dist(x, y, me.x, me.y) < minD) continue;
    return [x, y];
  }
  return null;
}

function spawnField(type, size) {
  const p = farFromShip(300);
  if (!p) return null;
  return addObj(type, size, p[0], p[1]);
}

function placeCrate() {
  const A = G.arc;
  const p = A.variant === 'classique' ? farFromShip(240) : farFromShip(cam.w * 0.35, cam.w * 1.25);
  if (!p) return;
  const c = addCrate(p[0], p[1], rndSym(14), rndSym(14));
  c.level = A.level;
}

/* ---------- boucle ---------- */

function arcadeUpdate(dt) {
  const me = G.me, A = G.arc;
  /* le corsaire a sa propre boucle, sans niveaux (corsaire.js) */
  if (A.variant === 'corsaire') { corsaireTick(dt); return; }
  A.t += dt;
  const alive = A.state === 'play' && !me.sinking;
  if (playerControl(dt, alive)) beastsPlayerFired();
  stepShip(me, dt);
  for (const w of G.whirls) wrapObj(w, 0);
  beastsUpdate(dt);
  stepShots(dt, (p) => beastShot(p) || shotHits(p, null));
  /* les brûlots traversent le champ à toute allure */
  if (A.brulots > 0 && A.t > 3) {
    A.brulotT -= dt;
    if (A.brulotT <= 0) { A.brulotT = rnd(8, 4) / Math.sqrt(A.speedK); A.brulots--; launchBrulot(); }
  }
  for (let i = G.objs.length - 1; i >= 0; i--) {
    const o = G.objs[i];
    if (o.life !== undefined) { o.life -= dt; if (o.life <= 0) { G.objs.splice(i, 1); continue; } }
    if (o.type === 'brulot' && Math.random() < dt * 2) Snd.crackle && Snd.crackle();
  }
  driftObjects(dt);
  whirlStep(dt);
  if (alive) pickups((c) => {
    A.got++; A.crates++;
    addScore(100, c.x, c.y);
    floatText(c.x, c.y, T('st.crate', Math.min(A.got, A.need), A.need), 'gold');
  });
  updateParts(dt);
  /* niveau gagné */
  if (A.state === 'play' && A.got >= A.need) {
    A.state = 'clear'; A.clearT = 0;
    const bonus = Math.round(me.hull / me.hullMax * 500) + 250 * A.level;
    addScore(bonus);
    banner(T('arc.saved'), T('arc.saved2', fmt0(bonus)), 2.8);
    Snd.levelUp();
  }
  if (A.state === 'clear') {
    A.clearT += dt;
    /* le dixième niveau : l'arcade est finie, et le Kōtetsu est gagné */
    if (A.clearT > 3 && A.level === ARCADE_END && !A.endShown) { A.endShown = true; arcadeFinished(); return; }
    if (A.clearT > 3) { me.hull = Math.min(me.hullMax, me.hull + me.hullMax * 0.15); arcadeLevel(A.level + 1); }
  }
  if (me.sinking && A.state === 'play') { A.state = 'over'; A.overT = 0; }
  if (A.state === 'over') { A.overT += dt; if (A.overT > 2.6 && G.mode === 'play') arcadeOver(); }
  followCamera(false, dt);
  G.mist = 0;
}

function arcadeFinished() {
  const A = G.arc, first = !arcadeLoad().fin;
  A.state = 'done';
  try { const all = arcadeLoad(); all.fin = true; localStorage.setItem(ARCADE_SAVE, JSON.stringify(all)); } catch (e) { /* rien */ }
  G.best = Math.max(G.best || 0, G.score);
  arcadeSave(A.variant, { best: G.best, level: Math.max(A.level + 1, arcadeLoad(A.variant).level || 1) });
  G.mode = 'over';
  Music.sting('win');
  Music.play('brief');
  const goOn = () => {
    menuHide(); clearInput();
    G.mode = 'play'; showHud(true);
    G.me.hull = Math.min(G.me.hullMax, G.me.hull + G.me.hullMax * 0.15);
    arcadeLevel(A.level + 1);
  };
  showResults({
    kicker: T('arc.fin.k'),
    title: T('arc.fin.t'),
    sub: T(A.variant === 'classique' ? 'arc.title.c' : 'arc.title.k'),
    after: T(first ? 'arc.fin.text' : 'arc.fin.again'),
    stats: [[T('res.score'), G.score], [T('res.crates'), A.crates], [T('arc.reached'), A.level], ...(first ? [[T('res.unlock'), shipName(SHIPS.stonewall), T('res.unlock.n')]] : [])],
    actions: [
      { label: T('arc.fin.go', A.level + 1), go: goOn },
      { label: T('arc.fin.take'), go: () => { G.shipId = 'stonewall'; chooseShip((id) => startArcade(id, 1, A.variant), A.variant === 'classique' ? arcadeMenu : corsaireMenu, T(A.variant === 'classique' ? 'arc.title.c' : 'arc.title.k')); } },
      { label: T('cr.btn'), go: () => showCredits(showTitle) },
      { label: T('menu.main'), go: showTitle },
    ],
  });
}

function launchBrulot() {
  const me = G.me, A = G.arc;
  /* il arrive de hors de vue, droit sur le navire */
  const b = rnd(TAU);
  const x = me.x + Math.cos(b) * cam.w * 0.72, y = me.y + Math.sin(b) * cam.w * 0.72;
  if (A.variant !== 'classique' && nearLand(x, y, 60)) return;
  const a = Math.atan2(me.y - y, me.x - x) + rndSym(0.3);
  const sp = rnd(ARC.brulot.speed[1], ARC.brulot.speed[0]);
  const o = addObj('brulot', 0, x, y, Math.cos(a) * sp, Math.sin(a) * sp);
  o.life = 14;
  /* il cherche le navire quelques secondes, puis file tout droit */
  o.target = me; o.homeT = 2.2 + Math.min(1.5, A.level * 0.1);
  floatText(x, y, T('arc.fireship'), 'bad');
  Snd.bell(1);
}

function recycleField() {
  const me = G.me, far = cam.w * 1.35;
  for (const o of G.objs) {
    if (o.type === 'brulot') continue;
    if (dist(o.x, o.y, me.x, me.y) < far) continue;
    /* il revient en avant de la route, juste hors de vue */
    const a = me.h + rndSym(1.3), d = rnd(cam.w * 0.95, cam.w * 0.62);
    const x = me.x + Math.cos(a) * d, y = me.y + Math.sin(a) * d;
    if (x < 300 || y < 300 || x > G.field.w - 300 || y > G.field.h - 300 || nearLand(x, y, o.r + 30)) continue;
    o.x = x; o.y = y; o.home = null;
    if (o._m) o._m.userData.jump = true;
  }
  for (const c of G.crates) {
    if (dist(c.x, c.y, me.x, me.y) < cam.w * 2.2) continue;
    const p = farFromShip(cam.w * 0.5, cam.w * 1.2);
    if (p) { c.x = p[0]; c.y = p[1]; }
  }
  for (const w of G.whirls) {
    if (dist(w.x, w.y, me.x, me.y) < cam.w * 2) continue;
    const p = farFromShip(cam.w * 0.7, cam.w * 1.1);
    if (p) { w.x = p[0]; w.y = p[1]; }
  }
}

function arcadeOver() {
  const A = G.arc;
  G.mode = 'over';
  const isRecord = G.score > (G.best || 0);
  G.best = Math.max(G.best || 0, G.score);
  arcadeSave(A.variant, { best: G.best, level: Math.max(A.level, arcadeLoad(A.variant).level || 1) });
  Music.sting('lose');
  Music.play('brief');
  showResults({
    kicker: T(A.variant === 'classique' ? 'menu.arcade' : 'menu.corsaire'),
    title: T(G.me.capsized ? 'res.capsized' : 'res.sank', shipName(G.me.spec)),
    sub: T('hud.level') + ' ' + A.level,
    stats: [[T('res.score'), G.score, isRecord ? T('arc.newrec') : ''], [T('hud.record'), G.best], [T('res.crates'), A.crates], [T('arc.reached'), A.level]],
    actions: [
      { label: T('arc.again', A.level), go: () => startArcade(G.shipId, A.level, A.variant) },
      { label: T('arc.fromstart'), go: () => startArcade(G.shipId, 1, A.variant) },
      { label: T('menu.main'), go: showTitle },
    ],
  });
}
