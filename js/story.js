'use strict';

/* Mode histoire : de vraies côtes, réduites comme dans les jeux de marine
 * d'autrefois, et des navires qui gardent leur taille. Neuf étapes (stages.js).
 *
 * Chaque étape se joue en plusieurs temps (st.steps) : à chaque temps, une carte
 * d'ordres s'affiche en bas de l'écran, la ligne d'objectif change, et des flèches
 * et des cercles montrent où aller. Quand le joueur se trompe (trop vite pour
 * charbonner, hors du cercle, par le travers dans le cyclone...), un conseil
 * s'écrit sous l'objectif. Les règles propres à chaque étape sont dans RULES. */

const STORY_SAVE = 'kaisen.histoire';
function storyLoad() { try { return JSON.parse(localStorage.getItem(STORY_SAVE) || '{}'); } catch (e) { return {}; } }
function storySave(o) { try { localStorage.setItem(STORY_SAVE, JSON.stringify(Object.assign(storyLoad(), o))); } catch (e) { /* rien */ } }

/* les forts qu'on montre dans l'histoire : le fort de Benten, près du haut-fond où le Banryū s'échoua
 * le 20 juin 1869 (coordonnées de la carte) */
const STORY_FORTS = { hakodate: [1450, 380] };

/* la carte d'une étape, en unités du jeu */
function stageWorld(st) {
  const m = MAPS[st.map], k = st.k, [wx0, wy0, wx1, wy1] = m.win;
  const P = (x, y) => [(x - wx0) * k, (y - wy0) * k];
  const polys = m.land.map((f) => {
    const g = new Array(f.length);
    for (let i = 0; i < f.length; i += 2) { g[i] = (f[i] - wx0) * k; g[i + 1] = (f[i + 1] - wy0) * k; }
    return polyFrom(g);
  });
  const rocks = m.rocks.map(([x, y, r]) => ({ x: (x - wx0) * k, y: (y - wy0) * k, r: Math.max(6, r * k * 2.2) }));
  const labels = (MAP_LABELS[st.map] || []).map((l) => ({ x: (l.x - wx0) * k, y: (l.y - wy0) * k, t: l.t, jp: l.jp, r: 150, noTown: !!l.noTown, cls: l.cls || 'village', north: true, ezo: !!l.ezo }));
  return { P, polys, rocks, labels, w: (wx1 - wx0) * k, h: (wy1 - wy0) * k };
}

/* un point d'eau libre près d'un point donné, en cherchant de plus en plus loin */
function waterNear(x, y, clear) {
  for (const r of [0, 60, 140, 260, 420, 650]) {
    if (!r) { if (!nearLand(x, y, clear) && x > 60 && y > 60 && x < G.field.w - 60 && y < G.field.h - 60) return [x, y]; continue; }
    const p = freeWater(x, y, r, clear);
    if (p) return p;
  }
  return [x, y];
}

/* « {0} / {1} » : les valeurs dans un texte à trous */
function fill(s, args) { return String(s).replace(/\{(\d)\}/g, (m, i) => (args && args[i] !== undefined ? args[i] : '')); }

/* ---------- les ordres, les conseils ---------- */

function stageStep(id) { return (G.stage.steps || []).find((x) => x.id === id) || null; }

/* passer au temps suivant : la carte d'ordres s'affiche, et la ligne d'objectif suit */
function setStep(id, quiet) {
  const S = G.st;
  if (!S || S.step === id) return;
  S.step = id; S.stepT = 0;
  const list = G.stage.steps || [];
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0 && !quiet) showOrders(T('ord.k', i + 1, list.length), tx(list[i].t), S.t < 1 ? 3.6 : 0);
}

/* un conseil sous l'objectif, au plus une fois toutes les cd secondes pour la même raison */
function hint(key, text, cd) {
  const S = G.st;
  if (!S || S.phase === 'won' || S.phase === 'lost') return;
  if (S.hintCd[key] !== undefined && S.t < S.hintCd[key]) return;
  S.hintCd[key] = S.t + (cd || 10);
  showHint(text);
}

/* la ligne d'objectif de la plaque du haut */
function storyGoalLine() {
  const S = G.st, st = G.stage;
  if (!S) return '';
  if (S.phase === 'won') return T('st.won');
  if (S.exitOpen && S.exit && S.step === 'exit') return T('hud.reach', S.exit.label);
  const sp = stageStep(S.step);
  if (sp && sp.goal) return fill(tx(sp.goal), S.gv || []);
  if (sp) return tx(sp.t);
  return tx(st.objective);
}

/* les flèches vers l'objectif : calculées par les règles de l'étape, à chaque image */
function storyTargets() {
  const S = G.st;
  if (!S || S.phase === 'won' || S.phase === 'lost') return [];
  return S.targets || [];
}

/* ---------- mise en place ---------- */

function storyStart(idx, shipId) {
  const st = STAGES[idx], goal = st.goal;
  G.game = 'story';
  G.stage = st; G.stageIdx = idx;
  G.shipId = shipId || st.ship;
  G.score = 0;
  RNG = makeRng(1869 + idx * 7);
  setSea(st.weather, st.weather.season === 'hiver' ? 'hiver' : st.weather.season);
  const SW = stageWorld(st);
  G.P = SW.P;
  /* deux étapes sur la même carte, à deux échelles : deux reliefs ; dans la baie de Hakodate, le fort
   * de Benten, au rivage le plus proche du haut-fond où le Banryū vint s'échouer */
  const fortNear = STORY_FORTS[st.map];
  let fortSite = null;
  const beforeTowns = fortNear ? (hAt, S) => {
    const [fx, fy] = SW.P(fortNear[0], fortNear[1]);
    let best = null, bd = 1e18;
    for (let rr = 0; rr <= 1200 && !best; rr += 12) {
      const n = Math.max(1, Math.round(rr / 8));
      for (let k = 0; k < n; k++) {
        const a = k / n * TAU, x = fx + Math.cos(a) * rr, y = fy + Math.sin(a) * rr, d = S.d(x, y);
        if (d < 44 || d > 70) continue;
        const dd = (x - fx) ** 2 + (y - fy) ** 2;
        if (dd < bd) { bd = dd; best = [x, y]; }
      }
    }
    if (!best) return [];
    const [x, y] = best, e = 6;
    const gx = S.d(x + e, y) - S.d(x - e, y), gy = S.d(x, y + e) - S.d(x, y - e);
    fortSite = { x, y, ang: Math.atan2(-gy, -gx), base: Math.max(1.2, hAt(x, y)[0]) };
    return [[x, y, 66]];
  } : null;
  setWorld({ id: 'stage-' + st.map + '-' + st.k, polys: SW.polys, rocks: SW.rocks, w: SW.w, h: SW.h, labels: SW.labels, palette: st.weather.season === 'tempete' ? 'printemps' : st.weather.season, cell: 6, hScale: 1, seed: idx + 2, maxTrees: 5000, clip: true, beforeTowns });
  if (fortSite && R3.terrain && !R3.terrain.userData.benten) { R3.terrain.userData.benten = [fortSite.x, fortSite.y]; R3.terrain.add(bentenFort(fortSite.x, fortSite.y, fortSite.ang, fortSite.base)); }
  W.drift = st.drift ? [st.drift[0] * 12, st.drift[1] * 12] : [0, 0];
  G.shots = []; G.parts = []; G.objs = []; G.crates = []; G.prises = []; G.whirls = []; G.boats = []; G.wrecks = []; G.floats = []; G.zones = [];
  const P = SW.P;
  let [x0, y0] = P(st.start[0], st.start[1]);
  const me = makeShip(G.shipId, x0, y0, fromBearing(st.start[2]));
  if (st.anchored) {
    [x0, y0] = waterNear(x0, y0, me.len * 0.8);
    me.x = x0; me.y = y0;
    me.anchored = true; me.throttle = 0; me.v = 0;
  } else { me.throttle = 0.3; me.v = maxSpeed(me) * 0.3; }
  me.inv = 1.5;
  if (st.flag) me.flag = st.flag;
  if (st.engine) me.speedK = st.engine;
  if (st.dmgK) me.dmgK = st.dmgK;
  if (goal.cape) me.speedK = 0.75;
  G.me = me;
  G.ships = [me];
  const S = G.st = {
    t: 0, got: 0, need: goal.n || 1, phase: 'go', exitOpen: false, board: 0, alert: !st.falseFlag, spill: 4, towed: 0, endT: 0, said: {}, reportAt: 2.4,
    coal: 0, sus: 0, barques: 0, barqueT: -1, soupT: goal.soup || 0, waveT: 3, flashT: 4, windB: st.weather.wind, windRate: 4, calm: false, beachT: -1,
    step: null, stepT: 0, hintCd: {}, gv: [], targets: [], bar: null, ammo: -1, aim: null, aimT: 6,
  };
  G.mate = null;
  if (goal.exit) {
    const [ex, ey] = P(goal.exit.x, goal.exit.y);
    S.exit = { x: ex, y: ey, r: Math.max(80, goal.exit.r * st.k), label: tx(st.exitLabel), tag: tx(st.exitLabel), col: 0xffe2a0 };
  }
  if (goal.zone) {
    const [zx, zy] = P(goal.zone.x, goal.zone.y);
    S.zone = { x: zx, y: zy, r: Math.max(70, goal.zone.r * st.k), label: tx(st.exitLabel), tag: tx(st.exitLabel), col: 0xffb070 };
  }
  if (st.falseFlag) me.flag = 'us';
  if (st.anchored) S.anchor = [me.x, me.y];
  for (const w of st.wrecks || []) {
    const [x, y] = P(w.x, w.y);
    G.wrecks.push({ x, y, h: fromBearing(w.h), w: WRECKS[w.kind], state: 0 });
  }
  for (const [cx, cy, r, n] of st.crates || []) for (let i = 0; i < n; i++) spawnStoryCrate(cx, cy, r);
  for (const [cx, cy, r, n] of st.debris || []) {
    const [px, py] = P(cx, cy);
    for (let i = 0; i < n; i++) {
      const p = freeWater(px, py, r * st.k, 40);
      if (p) addObj('radeau', Math.random() < 0.5 ? 3 : 2, p[0], p[1], rndSym(12), rndSym(12));
    }
  }
  /* le charbon du pont, jeté à la mer aux premières rafales */
  for (let i = 0; i < (st.jetsam || 0); i++) {
    const a = rnd(TAU), d = rnd(260, 90);
    const o = addObj('radeau', 1, me.x + Math.cos(a) * d, me.y + Math.sin(a) * d, rndSym(15), rndSym(15));
    o.kind = i % 3 ? 'tawara' : 'tonneau';
  }
  for (const [bx, by] of st.boats || []) {
    const [x, y] = P(bx, by);
    const [wx, wy] = waterNear(x, y, 20);
    G.boats.push({ x: wx, y: wy, h: rnd(TAU), bob: rnd(TAU), r: 16 });
  }
  /* les navires amis : le Kaiten mouillé à Yamada, ou la flottille qui se perd dans le cyclone */
  for (const f of st.friends || []) {
    const [x, y] = P(f.at[0], f.at[1]);
    const s = makeShip(f.ship, x, y, fromBearing(f.at[2]));
    addFriend(s, f.flag, f.anchored, f.leave ? P(f.leave[0], f.leave[1]) : null);
    if (goal.type === 'coal' && !G.mate) G.mate = s;
  }
  S.shore = (st.shore || []).map(([x, y]) => { const [px, py] = P(x, y); return waterNear(px, py, 24); });
  G.pending = [];
  for (const e of st.enemies || []) {
    const [x, y] = P(e.at[0], e.at[1]);
    const s = makeShip(e.ship, x, y, fromBearing(e.at[2]));
    s.ai = { anchored: !!e.anchored, weigh: false, route: (e.route || []).map(([a, b]) => P(a, b)), wp: 0, fireT: rnd(3, 1.5), side: 0, wakeT: 0 };
    if (e.heavy) s.heavy = true;
    if (e.aims) s.aims = true;
    if (e.keepOff) s.ai.keepOff = e.keepOff;
    /* pris par surprise : il tire moins vite */
    if (e.slowFire) s.ai.slow = e.slowFire;
    if (e.hullK) { s.hullMax *= e.hullK; s.hull = s.hullMax; }
    /* aucun navire impérial ne coula dans ces combats, sauf le Chōyō : touchés, ils se retirent */
    if (st.retreat && e.ship !== goal.target) s.noSink = true;
    s.throttle = e.anchored ? 0 : 0.55;
    s.v = e.anchored ? 0 : maxSpeed(s) * 0.4;
    if (e.arrive) G.pending.push({ at: e.arrive, s });
    else G.ships.push(s);
  }
  G.target = goal.target ? [...G.ships, ...G.pending.map((p) => p.s)].find((s) => s.spec.id === goal.target) : null;
  G.onCrateLost = null;
  G.mist = 0; G.lost = null; G.mistOut = -1e9;
  hideOrders();
  Music.play(st.music || 'combat');
  followCamera(true);
  banner(tx(st.title), tx(st.place) + ' · ' + tx(st.when), 3.4);
  const R = RULES[st.id];
  if (R && R.init) R.init(S, st);
  else if (st.steps && st.steps.length) setStep(st.steps[0].id);
}

function addFriend(s, flag, anchored, leaveTo) {
  s.friend = true;
  s.flag = flag || null;
  s.ai = { anchored: !!anchored, route: [], wp: 0, fireT: 1e9, side: 0, wakeT: 0, sight: 0 };
  if (leaveTo) { s.leaveTo = leaveTo; s.throttle = 0.85; s.v = maxSpeed(s) * 0.5; }
  else { s.throttle = 0; s.v = 0; }
  G.ships.push(s);
  return s;
}

function spawnStoryCrate(cx, cy, r) {
  const [px, py] = G.P(cx, cy);
  const p = freeWater(px, py, r * G.stage.k, 24);
  if (p) addCrate(p[0], p[1], rndSym(6), rndSym(6));
  return !!p;
}

/* ---------- boucle ---------- */

function storyUpdate(dt) {
  const me = G.me, S = G.st, st = G.stage, goal = st.goal;
  const R = RULES[st.id] || {};
  S.t += dt; S.stepT += dt;
  const alive = S.phase !== 'won' && S.phase !== 'lost' && !me.sinking && S.phase !== 'beach';
  if (playerControl(dt, alive && S.ammo !== 0 && !S.noFire)) onPlayerFired();
  for (let i = G.pending.length - 1; i >= 0; i--) {
    if (S.t >= G.pending[i].at) {
      const s = G.pending[i].s;
      G.ships.push(s);
      G.pending.splice(i, 1);
      if (!R.quietArrivals) banner(T('st.enters', shipName(s.spec)), tx(s.spec.kind), 2.6);
      Snd.bell(2);
    }
  }
  for (let i = G.ships.length - 1; i >= 0; i--) {
    const s = G.ships[i];
    if (s.friend) { if (friendStep(s, dt)) { G.ships.splice(i, 1); continue; } }
    else if (s !== me && s.ai) {
      if (st.retreat && s !== G.target && !s.ai.retreat && s.hull < s.hullMax * st.retreat) { s.ai.retreat = true; banner(T('st.retreat', shipName(s.spec)), T('st.retreat2'), 2.4); addScore(300, s.x, s.y); }
      if (s.ai.retreat) { if (retreatStep(s, dt)) { G.ships.splice(i, 1); continue; } moveOnMap(s, dt); continue; }
      const hostile = S.alert && !me.sinking;
      /* sous faux pavillon, seul le navire visé riposte ; puis l'alarme gagne la flotte (Miyako) */
      const mayFire = !(st.falseFlag && S.phase === 'go' && s !== G.target && !S.alarm) && !s.aims;
      aiStep(s, dt, hostile, mayFire);
    }
    moveOnMap(s, dt);
  }
  /* embossé ou échoué : le navire ne quitte plus sa place, il pivote seulement */
  if (S.anchor) {
    me.x = S.anchor[0]; me.y = S.anchor[1];
    me.v = 0; me.mx = 0; me.my = 0; me.dx = 0; me.dy = 0; me.throttle = 0;
    me.w = S.aground ? 0 : clamp(me.w, -0.11, 0.11);
  }
  shipContacts();
  stepShots(dt, (p) => shotHits(p, onEnemyHitStory));
  driftObjects(dt);
  for (const b of G.boats) b.bob += dt * 2;
  if (alive) {
    pickups((c) => {
      S.got++;
      addScore(100, c.x, c.y);
      floatText(c.x, c.y, T('st.crate', Math.min(S.got, S.need), S.need), 'gold');
    }, 0.34);
  }
  if (goal.soup) soupStep(dt);
  barqueMove(dt);
  S.targets = []; S.bar = null;
  if (R.update) R.update(dt, S, st, alive);
  /* la sortie ouverte : son cercle, sa flèche */
  if (S.exitOpen && S.exit) {
    if (!G.zones.includes(S.exit)) G.zones.push(S.exit);
    if (!S.targets.length) S.targets.push([S.exit.x, S.exit.y, '#ffe2a0', S.exit.label]);
  }
  updateParts(dt);
  mistStep(dt);
  if (S.phase === 'go' || S.phase === 'exit') {
    if (me.sinking) { S.phase = 'lost'; S.endT = 0; }
    else if (S.exitOpen && S.exit && dist(me.x, me.y, S.exit.x, S.exit.y) < S.exit.r) storyWin();
  }
  if (S.phase === 'lost') { S.endT += dt; if (S.endT > 2.6 && G.mode === 'play') storyLost(); }
  if (S.phase === 'won') { S.endT += dt; if (S.endT > S.reportAt && G.mode === 'play') storyReport(); }
  followCamera(false, dt);
}

/* le joueur a tiré : sous faux pavillon, c'est la ruse qui saute ; et les munitions se comptent */
function onPlayerFired() {
  const S = G.st, R = RULES[G.stage.id] || {};
  if (S.ammo > 0) S.ammo--;
  if (R.onFire) R.onFire(S);
  else if (!S.alert) reveal(T('st.fired'));
}

/* un navire ami : il reste mouillé, ou s'éloigne et disparaît dans le mauvais temps */
function friendStep(s, dt) {
  const A = s.ai;
  if (s.leaveTo) {
    const want = Math.atan2(s.leaveTo[1] - s.y, s.leaveTo[0] - s.x), diff = wrapA(want - s.h);
    s.throttle = s.leaveThr || 0.85;
    steerShip(s, dt, false, false, diff < -0.05, diff > 0.05);
    if (s.leaveT > 0) { s.leaveT -= dt; return false; }
    const d = dist(s.x, s.y, G.me.x, G.me.y);
    if (d > 900 && !onScreen(s.x, s.y, 120)) return true;
    return false;
  }
  if (A.anchored) { s.throttle = 0; s.v *= 0.9; }
  steerShip(s, dt, false, false, false, false);
  return false;
}

/* un navire désemparé s'éloigne, puis disparaît hors de vue */
function retreatStep(s, dt) {
  const me = G.me, away = Math.atan2(s.y - me.y, s.x - me.x), diff = wrapA(away - s.h);
  s.throttle = 0.7;
  steerShip(s, dt, false, false, diff < -0.05, diff > 0.05);
  if (Math.random() < dt * 2) fx.push({ k: 'smoke', x: s.x, y: s.y, z0: 6, vx: s.vx * 0.4, vy: s.vy * 0.4, r: 4, grow: 8, life: 2.5, age: 0, a: 0.4, tone: 0, air: true });
  return dist(s.x, s.y, me.x, me.y) > 900 && !onScreen(s.x, s.y, 150);
}

const near2 = (list, n) => list.slice().sort((a, b) => dist(a.x, a.y, G.me.x, G.me.y) - dist(b.x, b.y, G.me.x, G.me.y)).slice(0, n);
const enemiesAfloat = () => G.ships.filter((s) => s !== G.me && !s.friend && s.ai && !s.sinking && !s.sunk && !s.ai.retreat);

/* ---------- les cargaisons : repêcher, puis gagner la sortie ---------- */

function cargoRules() {
  return {
    init() { setStep('cargo'); },
    update(dt, S, st) {
      const me = G.me;
      if (S.phase === 'go') {
        /* l'épave se disloque : d'autres caisses tombent à la mer, tant qu'il en manque */
        S.spill -= dt;
        if (S.spill <= 0) {
          S.spill = rnd(9, 5);
          if (G.crates.length < 5 && S.got + G.crates.length < S.need + 3) {
            const src = st.crates[(Math.random() * st.crates.length) | 0];
            const n = G.crates.length < 2 ? 2 : 1;
            let ok = false;
            for (let i = 0; i < n; i++) ok = spawnStoryCrate(src[0], src[1], src[2] * 0.6) || ok;
            if (ok && st.spill && !S.said.spill && S.t > 8) { S.said.spill = 1; floatText(me.x, me.y - 40, tx(st.spill.msg), 'gold'); }
          }
        }
        S.gv = [Math.min(S.got, S.need), S.need];
        for (const c of near2(G.crates, 2)) S.targets.push([c.x, c.y, '#ffd98a', T('ptr.crate')]);
        if (S.got >= S.need) { openExit(T('st.cargo.done', S.exit.label)); setStep('exit'); }
        if (me.hull < me.hullMax * 0.6) hint('debris', T('h.debris'), 40);
        if (st.lee && nearLand(me.x, me.y, me.len * 1.1)) hint('lee', T('h.lee'), 16);
      }
    },
  };
}

/* ---------- le cyclone : tenir la cape ---------- */

function capeAngle() {
  /* l'angle entre l'étrave et la direction d'où vient le vent */
  return Math.abs(wrapA(fromBearing(SEA.wind) - G.me.h));
}

function capeStep(dt) {
  const S = G.st, me = G.me, goal = G.stage.goal;
  if (S.phase !== 'go') return;
  if (!S.calm) {
    /* le vent fait le tour du compas, plus ou moins vite */
    S.windRate = 4.2 + 2.6 * Math.sin(S.t * 0.11) + 1.4 * Math.sin(S.t * 0.37 + 1);
    S.windB = (S.windB + S.windRate * dt + 360) % 360;
    SEA.wind = S.windB;
    const a = fromBearing(SEA.wind + 180), sp = 18 + SEA.sea * 8;
    W.wind = [Math.cos(a) * sp, Math.sin(a) * sp];
    W.drift = [Math.cos(a) * 11, Math.sin(a) * 11];
    capeDebris(dt, S, me);
    /* des éclairs dans la pluie */
    S.flashT -= dt;
    if (S.flashT <= 0) { S.flashT = rnd(9, 3.5); G.lightning = 1; Snd.thunder && Snd.thunder(); }
    const r = capeAngle();
    if (r > 1.05) hint('beam', T('h.cape.beam'), 7);
    else if (r < 0.9 && me.throttle > 0.62) hint('bury', T('h.cape.bury'), 7);
    /* les lames */
    S.waveT -= dt;
    if (S.waveT <= 0) {
      S.waveT = rnd(3.1, 2.1);
      let dmg = 0, msg = null;
      if (r > 1.05 && r < 2.25) { dmg = 7; msg = T('st.cape.beam'); }
      else if (r >= 2.25) { dmg = 5; msg = T('st.cape.stern'); }
      else if (r < 0.9 && me.throttle > 0.62) { dmg = 3; msg = T('st.cape.bury'); }
      if (dmg) {
        me.inv = 0;
        if (damageShip(me, dmg)) {
          G.shake = Math.min(1.3, (G.shake || 0) + 0.6);
          Snd.thud(0.8);
          floatText(me.x, me.y - 30, msg, 'bad');
          for (let i = 0; i < 18; i++) {
            const a2 = rnd(TAU), v = rnd(60, 20);
            fx.push({ k: 'spray', x: me.x + rndSym(me.len * 0.4), y: me.y + rndSym(me.wid * 0.8), z0: 1, vz: rnd(14, 7), vx: Math.cos(a2) * v + W.drift[0], vy: Math.sin(a2) * v + W.drift[1], drag: 0.5, r: rnd(1.6, 0.7), grow: 0, life: 1.6, age: 0, a: 0.7 });
          }
        }
      } else if (!S.said.capeGood) { S.said.capeGood = 1; floatText(me.x, me.y - 30, T('st.cape.good'), 'gold'); }
    }
    if (S.t >= goal.time) {
      if (me.sinking) return;
      S.calm = true; S.calmT = 0;
      banner(T('st.calm'), T('st.calm2'), 3);
      Snd.levelUp();
    }
  } else {
    /* « le calme plat succéda sans transition à la tempête » */
    S.calmT += dt;
    SEA.sea = Math.max(0.3, SEA.sea - dt * 2);
    SEA.rain = false;
    W.drift = [W.drift[0] * 0.9, W.drift[1] * 0.9];
    if (S.calmT > 2.6) storyWin();
  }
}

/* ce que charrie la tempête : le charbon du pont jeté à la mer, des tonneaux, des espars
 * arrachés, une embarcation emportée. Tout arrive par l'avant, poussé par le vent, et de
 * plus en plus serré : on le brise au canon de chasse, ou on le laisse glisser le long du
 * bord sans quitter le secteur vert. */
const CAPE_KINDS = { 1: ['tawara', 'tawara', 'tonneau', 'taru', 'planches', 'espars'], 2: ['mat', 'chaloupe', 'tawara', 'radeau'], 3: ['mat', 'radeau'] };
function capeDebris(dt, S, me) {
  const k = clamp(S.t / G.stage.goal.time, 0, 1), up = fromBearing(SEA.wind);
  /* ce qui est passé loin sous le vent ne reviendra pas */
  for (let j = G.objs.length - 1; j >= 0; j--) { const o = G.objs[j]; if (dist(o.x, o.y, me.x, me.y) > 1300) G.objs.splice(j, 1); }
  /* un débris droit devant : le conseil, une fois de temps en temps */
  for (const o of G.objs) {
    const dx = o.x - me.x, dy = o.y - me.y, f = dx * Math.cos(me.h) + dy * Math.sin(me.h), s2 = -dx * Math.sin(me.h) + dy * Math.cos(me.h);
    if (f > 0 && f < 360 && Math.abs(s2) < o.r + me.wid) { hint('capeDebris', T('h.cape.debris'), 26); break; }
  }
  S.debT = (S.debT === undefined ? 1.5 : S.debT) - dt;
  if (S.debT > 0 || G.objs.length > 34) return;
  S.debT = lerp(2.0, 0.85, k) * rnd(1.3, 0.75);
  const n = Math.random() < 0.3 + k * 0.4 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const d = rnd(1050, 820), side = rndSym(380);
    const x = me.x + Math.cos(up) * d - Math.sin(up) * side, y = me.y + Math.sin(up) * d + Math.cos(up) * side;
    if (G.mapLand(x, y)) continue;
    const roll = Math.random();
    const size = roll < 0.08 + k * 0.1 ? 3 : roll < 0.4 ? 2 : 1;
    /* poussé sous le vent, un peu vers le navire : il faut s'en occuper */
    const tx0 = me.x - x, ty0 = me.y - y, tl = Math.hypot(tx0, ty0) || 1;
    let vx = -Math.cos(up) + tx0 / tl * 0.8, vy = -Math.sin(up) + ty0 / tl * 0.8;
    const vl = Math.hypot(vx, vy) || 1, sp = rnd(95, 60) * (size === 3 ? 0.75 : 1);
    const o = addObj('radeau', size, x, y, vx / vl * sp + rndSym(8), vy / vl * sp + rndSym(8));
    const ks = CAPE_KINDS[size];
    o.kind = ks[(Math.random() * ks.length) | 0];
    o.spin = rndSym(0.9);
  }
}

/* ---------- Yamada : le charbon bord à bord, et les barques à renvoyer ---------- */

/* les deux places le long du Kaiten, une de chaque bord : on prend la plus proche */
function berthPoint(K, me) {
  const nx = -Math.sin(K.h), ny = Math.cos(K.h), off = K.wid * 0.5 + me.wid * 0.5 + 8;
  const a = [K.x + nx * off, K.y + ny * off], b = [K.x - nx * off, K.y - ny * off];
  return dist(a[0], a[1], me.x, me.y) < dist(b[0], b[1], me.x, me.y) ? a : b;
}

function launchBarque(S, K) {
  /* du rivage du village, au fond de la baie */
  const p = S.shore[(Math.random() * S.shore.length) | 0];
  const water = S.barques === 1;
  S.barques++;
  const b = { x: p[0], y: p[1], home: p, h: Math.atan2(K.y - p[1], K.x - p[0]), bob: rnd(TAU), r: 14, barque: true, state: 'go', water, sp: rnd(34, 29) };
  b.ring = { x: b.x, y: b.y, r: 80, col: 0xff8a6a, tag: T('z.hail') };
  G.boats.push(b);
  banner(T('st.barque.out'), T('st.barque.out2'), 2.6);
  Snd.bell(1);
  setStep('barque');
  return b;
}

/* ---------- Tanohata : le Kōtetsu met en joue ---------- */

function aimStep(dt, S) {
  const me = G.me;
  const K = G.ships.find((s) => s.aims && !s.sinking);
  if (!K || me.sinking || S.phase !== 'go') { S.aim = null; return; }
  const d = dist(K.x, K.y, me.x, me.y);
  if (S.aim) {
    const A = S.aim;
    A.t -= dt;
    A.from = [K.x, K.y];
    if (A.t <= 0) {
      /* le coup part : si le Takao a tourné franchement, le boulet passe à côté */
      const turned = Math.abs(wrapA(me.h - A.h0)) > 0.3 || dist(me.x, me.y, A.px, A.py) > me.len * 0.9;
      const a0 = Math.atan2(me.y - K.y, me.x - K.x);
      fx.muzzle(K.x + Math.cos(a0) * K.len * 0.4, K.y + Math.sin(a0) * K.len * 0.4, Math.cos(a0), Math.sin(a0));
      Snd.cannon(130, dist(K.x, K.y, me.x, me.y));
      if (turned) {
        const a = rnd(TAU);
        fx.splash(A.px + Math.cos(a) * 30, A.py + Math.sin(a) * 30, 1.4);
        floatText(me.x, me.y - 30, T('st.aim.miss'), 'gold');
        addScore(50);
      } else {
        me.inv = 0;
        if (damageShip(me, 20)) {
          fx.hit(me.x, me.y); fx.splinters(me.x, me.y, 14, '#8a6a44');
          G.shake = Math.min(1.5, (G.shake || 0) + 1);
          Snd.thud(1);
          floatText(me.x, me.y - 30, T('st.aim.hit'), 'bad');
        }
      }
      S.aim = null;
      S.aimT = rnd(9, 6);
    }
    return;
  }
  S.aimT -= dt;
  if (S.aimT <= 0 && d < 780 && d > 120) {
    /* il vise : là où sera le Takao dans deux secondes et demie, s'il garde sa route */
    const T0 = 2.5;
    S.aim = { t: T0, t0: T0, h0: me.h, px: me.x + me.vx * T0, py: me.y + me.vy * T0, from: [K.x, K.y] };
    floatText(me.x, me.y - 40, T('st.aim'), 'bad');
    hint('aim', T('h.aim'), 0);
    Snd.bell(3);
  }
}

/* ---------- Tanohata : l'échouage volontaire ---------- */

function beachStep(dt) {
  const S = G.st, me = G.me, goal = G.stage.goal;
  if (S.phase === 'go' && S.zone && dist(me.x, me.y, S.zone.x, S.zone.y) < S.zone.r && !me.sinking) {
    S.phase = 'beach'; S.beachT = 0; S.aim = null;
    S.anchor = [me.x, me.y]; S.aground = true;
    me.throttle = 0;
    banner(T('st.beach.aground'), T('st.beach.aground2'), 2.6);
    setStep('evac');
    Snd.thud(1); G.shake = 1;
    fx.splinters(me.x, me.y, 14, '#c8b088');
    /* la grève la plus proche, pour les canots */
    let best = null, bd = 1e9;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU;
      for (let r = 20; r < 400; r += 20) { const x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r; if (G.mapLand(x, y)) { if (r < bd) { bd = r; best = [x, y]; } break; } }
    }
    S.shoreAt = best || [me.x - 200, me.y];
  }
  if (S.phase !== 'beach') return;
  S.beachT += dt;
  me.inv = Math.max(me.inv, 0.5);
  S.bar = { f: clamp(S.beachT / goal.evac, 0, 1), label: T('hud.evacbar'), kind: 'gold' };
  if (Math.random() < dt * 0.9) {
    /* le canot est amené le long du bord, du côté de la grève (les mêmes tirages qu'avant) */
    const ox = rndSym(me.len * 0.3), oy = rndSym(me.wid * 0.5), bob = rnd(TAU);
    const a = Math.atan2(S.shoreAt[1] - me.y, S.shoreAt[0] - me.x), bx = ox, by = (wrapA(a - me.h) >= 0 ? 1 : -1) * (me.wid * 0.5 + 6) + oy * 0.2;
    G.boats.push({ x: me.x + bx * Math.cos(me.h) - by * Math.sin(me.h), y: me.y + bx * Math.sin(me.h) + by * Math.cos(me.h), h: a, bob, r: 10, crew: true, noRing: true, to: S.shoreAt, sp: 30 });
  }
  const e = goal.evac;
  if (S.beachT > e * 0.25 && !S.said.spike) { S.said.spike = 1; floatText(me.x, me.y - 95, T('st.beach.spike'), 'gold'); Snd.clang(0); }
  if (S.beachT > e * 0.5 && !S.said.engine) { S.said.engine = 1; floatText(me.x, me.y - 95, T('st.beach.engine'), 'gold'); Snd.clang(0); }
  if (S.beachT > e * 0.75 && !S.said.fuse) { S.said.fuse = 1; floatText(me.x, me.y - 95, T('st.beach.fuse'), 'bad'); }
  if (S.beachT > e && !S.said.boom) {
    S.said.boom = 1;
    fx.explosion(me.x, me.y, 2.2);
    fx.explosion(me.x + Math.cos(me.h) * 18, me.y + Math.sin(me.h) * 18, 1.4);
    G.flashAt = [me.x, me.y, 2200];
    Snd.explosion();
    G.shake = 1.6;
    S.reportAt = 4.2;
    S.phase = 'go';
    storyWin(T('st.beach.blown'));
    sinkShip(me);
  }
}

/* ---------- la batterie flottante : la soupe sucrée d'Arai ---------- */

function soupStep(dt) {
  const S = G.st, me = G.me;
  if (S.phase !== 'go') return;
  S.soupT -= dt;
  if (S.soupT <= 0) {
    S.soupT = G.stage.goal.soup;
    me.hull = Math.min(me.hullMax, me.hull + me.hullMax * 0.1);
    floatText(me.x, me.y - 30, T('st.soup'), 'gold');
    Snd.bell(1);
  }
}

/* ---------- les règles de chaque étape ---------- */

const RULES = {
  naufrage: cargoRules(),
  tabakaze: cargoRules(),

  cyclone: {
    init() { setStep('cape'); },
    update(dt, S, st) {
      capeStep(dt);
      const left = Math.max(0, st.goal.time - S.t);
      S.gv = [Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0')];
    },
  },

  yamada: {
    init(S) { setStep('join'); S.berth = { x: 0, y: 0, r: 50, col: 0xffe2a0, tag: T('z.berth') }; },
    onFire(S) {
      /* un coup de canon dans une baie tranquille : le village s'inquiète */
      if (S.phase !== 'go') return;
      S.sus++;
      Snd.bell(3);
      if (S.sus >= G.stage.goal.suspicion) { S.failWhy = T('st.fail.ruse'); S.phase = 'lost'; S.endT = 0; banner(T('st.fail.ruse'), '', 2.6); }
      else banner(T('st.sus.fire', S.sus, G.stage.goal.suspicion), T('st.sus2'), 2.6);
    },
    update(dt, S, st) {
      const me = G.me, K = G.mate, goal = st.goal;
      if (!K) return;
      const [bx, by] = berthPoint(K, me);
      const B = S.berth;
      B.x = bx; B.y = by; B.r = Math.max(46, me.len * 0.42);
      const dB = dist(me.x, me.y, bx, by), dK = dist(me.x, me.y, K.x, K.y);
      const inB = dB < B.r, slow = Math.abs(me.v) < maxSpeed(me) * 0.22;
      const out = G.boats.find((b) => b.barque && b.state === 'go');
      G.zones = [];
      if (S.phase === 'go') {
        G.zones.push(B);
        if (S.step === 'join' && dK < K.len * 1.7) setStep('berth');
        S.coaling = inB && slow && S.step !== 'join';
        if (S.coaling) {
          if (!S.said.coal) { S.said.coal = 1; floatText(me.x, me.y - 95, T('st.coal.start'), 'gold'); }
          S.coal = Math.min(1, S.coal + dt / goal.time);
          if (Math.random() < dt * 5) {
            const f = Math.random();
            fx.push({ k: 'smoke', x: lerp(me.x, K.x, f) + rndSym(6), y: lerp(me.y, K.y, f) + rndSym(6), z0: 3, vx: rndSym(6), vy: rndSym(6), r: 2, grow: 4, life: 1.4, age: 0, a: 0.35, tone: 0, air: true });
          }
          if (Math.random() < dt * 0.8) Snd.clang(400);
          if (S.coal >= 1) {
            me.speedK = 1;
            for (const b of G.boats) if (b.barque) b.state = 'back';
            openExit(T('st.coal.done'));
            setStep('exit');
          }
        } else if (S.step !== 'join' && !out) {
          if (inB && !slow) hint('slow', T('h.slow'), 6);
          else if (!inB && dK < K.len * 1.7) hint('circle', T('h.circle'), 8);
          else if (S.coal > 0 && dK >= K.len * 1.7) hint('back', T('h.back'), 10);
        }
        /* les barques : la première quand on a commencé à charbonner, puis une toutes les
         * huit à douze secondes, deux au plus sur l'eau à la fois ; six en tout */
        const nOut = G.boats.filter((b) => b.barque && b.state === 'go').length;
        if (S.coal >= 0.08 && S.barques < (goal.barques || 4) && nOut < 2 && S.phase === 'go') {
          if (S.barqueT < 0) S.barqueT = S.barques === 0 ? 0.5 : rnd(12, 8);
          S.barqueT -= dt;
          if (S.barqueT <= 0) { S.barqueT = -1; launchBarque(S, K); }
        }
        for (const b of G.boats) {
          if (!b.barque || b.state !== 'go') continue;
          b.ring.x = b.x; b.ring.y = b.y;
          G.zones.push(b.ring);
          if (dist(me.x, me.y, b.x, b.y) < b.ring.r + me.len * 0.25) {
            /* hélée : la barque fait demi-tour */
            b.state = 'back';
            addScore(60, b.x, b.y);
            Snd.crate();
            if (b.water) { me.hull = Math.min(me.hullMax, me.hull + me.hullMax * 0.1); floatText(b.x, b.y, T('st.barque.water'), 'gold'); }
            else floatText(b.x, b.y, T('st.barque.back'), 'gold');
            if (!G.boats.some((o) => o !== b && o.barque && o.state === 'go')) { showOrders(T('ord.k2'), T('st.barque.return'), 0); setStep('berth', true); }
          } else if (dist(b.x, b.y, K.x, K.y) < K.len * 0.5 + 95) {
            /* à portée de voix du Kaiten : le nanushi pose ses questions */
            b.state = 'back';
            S.sus++;
            Snd.bell(3);
            if (!G.boats.some((o) => o !== b && o.barque && o.state === 'go')) setStep('berth', true);
            if (S.sus >= goal.suspicion) {
              S.failWhy = T('st.fail.ruse');
              S.phase = 'lost'; S.endT = 0;
              banner(T('st.fail.ruse'), '', 2.6);
            } else banner(T('st.sus', S.sus, goal.suspicion), T('st.sus2'), 2.6);
          }
        }
        const nowOut = G.boats.find((b) => b.barque && b.state === 'go');
        if (nowOut) S.targets.push([nowOut.x, nowOut.y, '#ff8a6a', T('ptr.barque')]);
        S.targets.push(S.step === 'join' ? [K.x, K.y, '#ffe2a0', shipName(K.spec)] : [bx, by, '#ffe2a0', T('z.berth')]);
        if (S.coal > 0 && S.coal < 1) S.bar = { f: S.coal, label: T(S.coaling ? 'hud.coalbar' : 'hud.coalwait'), kind: 'coal' };
      }
      S.gv = [Math.round(S.coal * 100), S.sus, goal.suspicion];
    },
  },

  miyako: {
    init() { setStep('approach'); },
    update(dt, S, st) {
      const me = G.me, K = G.target, goal = st.goal;
      if (!K) return;
      const d = dist(me.x, me.y, K.x, K.y);
      if (!S.ramZ) S.ramZ = { x: K.x, y: K.y, r: K.len * 0.62, col: 0xff6a4a, tag: T('z.board') };
      S.ramZ.x = K.x; S.ramZ.y = K.y;
      G.zones = [];
      if (S.phase === 'go') {
        if (S.step === 'approach') {
          if (!S.alert && d < 330) { me.flag = null; reveal(T('st.hinomaru')); }
          if (S.alert) setStep('ram');
        }
        if (S.step === 'ram') G.zones.push(S.ramZ);
        S.targets.push([K.x, K.y, '#ff8a6a', shipName(K.spec)]);
        /* au contact : l'étrave contre son flanc, ou presque (les deux coques se repoussent) */
        const contact = d < (me.len + K.len) * 0.62 && hullCircles(me).some(([x, y, r]) => hitsShip(K, x, y, r + 32));
        if (contact && S.step === 'ram') {
          S.board += dt;
          if (!S.said.board) { S.said.board = 1; banner(T('st.board'), T('st.board2'), 2); }
          if (Math.random() < dt * 6) fx.push({ k: 'smoke', x: lerp(me.x, K.x, 0.5) + rndSym(10), y: lerp(me.y, K.y, 0.5) + rndSym(10), z0: 8, vx: 0, vy: 0, r: 3, grow: 8, life: 1.2, age: 0, a: 0.4, tone: 2, air: true });
          if (Math.random() < dt * 4) Snd.gatling(0);
          const f = S.board / goal.hold;
          if (f > 0.25 && !S.said.jump) { S.said.jump = 1; floatText(me.x, me.y - 95, T('st.board.jump'), 'gold'); }
          /* l'alarme gagne la rade : les autres navires ouvrent le feu depuis leur mouillage */
          if (f > 0.3 && !S.alarm) { S.alarm = true; banner(T('st.alarm'), T('st.alarm2'), 2.4); Snd.bell(3); }
          if (f > 0.5 && !S.said.nicol) { S.said.nicol = 1; floatText(me.x, me.y - 95, T('st.board.nicol'), 'bad'); }
          if (f > 0.8 && !S.said.koga) { S.said.koga = 1; floatText(me.x, me.y - 95, T('st.board.koga'), 'bad'); }
        } else if (S.step === 'ram') {
          S.board = Math.max(0, S.board - dt * 0.1);
          if (S.board > 0 || d < 400) hint('contact', T('h.contact'), 6);
        }
        if (S.step === 'ram') S.bar = { f: clamp(S.board / goal.hold, 0, 1), label: T('hud.boardbar'), kind: 'red' };
        if (S.board >= goal.hold) {
          me.flag = null;
          banner(T('st.board.fail'), T('st.board.fail2'), 3.6);
          Snd.bell(3);
          openExit(null);
          setStep('escape');
          S.alarm = true;
          /* la flotte impériale appareille aussitôt et se lance à la poursuite */
          for (const s of G.ships) {
            if (!s.ai || s.friend || s === K) continue;
            /* le temps de pousser les feux : quelques secondes avant la poursuite */
            s.ai.weigh = true; s.ai.wakeT = rnd(5, 3); s.ai.sight = 1800; s.ai.fireT = rnd(1.6, 0.8); s.ai.slow = 0.75;
          }
        }
      }
      S.gv = [Math.round(clamp(S.board / goal.hold, 0, 1) * 100)];
    },
  },

  takao: {
    quietArrivals: true,
    init(S, st) {
      setStep('south');
      const [tx_, ty_] = G.P(st.south.to[0], st.south.to[1]);
      S.southTo = [tx_, ty_];
    },
    update(dt, S, st) {
      const me = G.me;
      G.zones = [];
      if (S.step === 'south') {
        S.targets.push([S.southTo[0], S.southTo[1], '#ffe2a0', tx(st.south.label)]);
        /* le Kaiten ressort de la baie et file au nord sans répondre aux signaux */
        const KR = st.kaitenRun;
        if (S.t >= KR.at && !S.kaiten) {
          const [x, y] = G.P(KR.from[0], KR.from[1]);
          const k = makeShip('kaiten', x, y, fromBearing(KR.from[2]));
          k.v = maxSpeed(k) * 0.8; k.leaveThr = 1; k.leaveT = 30;
          S.kaiten = addFriend(k, null, false, G.P(KR.to[0], KR.to[1]));
          banner(T('st.kaiten.out'), T('st.kaiten.out2'), 3.2);
          Snd.bell(2);
        }
        if (S.kaiten && G.ships.includes(S.kaiten)) S.targets.push([S.kaiten.x, S.kaiten.y, '#9ad0ff', shipName(S.kaiten.spec)]);
        if (S.t >= st.enemies[0].arrive - 0.2) {
          banner(T('st.squadron'), T('st.squadron2'), 3.2);
          setStep('beach');
        }
      }
      if (S.step === 'beach') {
        G.zones.push(S.zone);
        S.targets.push([S.zone.x, S.zone.y, '#ffb070', S.zone.label]);
        aimStep(dt, S);
        if (G.me.v < maxSpeed(me) * 0.6 && S.stepT > 4) hint('full', T('h.full'), 14);
      }
      beachStep(dt);
      if (S.step === 'evac') G.zones = [];
    },
  },

  otobe: {
    init() { setStep('launches'); },
    update(dt, S, st, alive) {
      const me = G.me, goal = st.goal;
      if (S.phase === 'go' && alive) {
        for (let i = G.boats.length - 1; i >= 0; i--) {
          const b = G.boats[i];
          if (b.barque || b.crew || !hitsShip(me, b.x, b.y, b.r + 8)) continue;
          /* elle passe à la remorque, en file derrière le navire (l'image seule) */
          boatTow(b, me);
          G.boats.splice(i, 1);
          S.got++; S.towed++;
          /* chaque chaloupe en remorque freine un peu le navire */
          me.speedK = Math.max(0.6, 1 - (goal.tow || 0) * S.towed);
          addScore(150, b.x, b.y);
          Snd.crate();
          floatText(b.x, b.y, T('st.launch', Math.min(S.got, S.need), S.need), 'gold');
        }
        S.gv = [Math.min(S.got, S.need), S.need];
        for (const b of near2(G.boats.filter((b) => !b.barque && !b.crew), 2)) S.targets.push([b.x, b.y, '#ffd98a', T('ptr.launch')]);
        if (S.got >= S.need) { openExit(T('st.launches.done', S.exit.label)); setStep('exit'); }
      }
    },
  },

  batterie: {
    init() { setStep('hold'); },
    update(dt, S, st) {
      const me = G.me;
      const left = Math.max(0, st.goal.time - S.t);
      S.gv = [Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0')];
      if (S.phase === 'go' && S.t >= st.goal.time && !me.sinking) storyWin(T('st.held'));
      const en = near2(enemiesAfloat(), 1)[0];
      if (en) {
        S.targets.push([en.x, en.y, '#ff8a6a', shipName(en.spec)]);
        const d = dist(en.x, en.y, me.x, me.y), rel = wrapA(Math.atan2(en.y - me.y, en.x - me.x) - me.h);
        if (d < 440 && Math.abs(Math.abs(rel) - Math.PI / 2) > 0.6) hint('broad', T('h.broad', shipName(en.spec)), 9);
      }
    },
  },

  hakodate: {
    init() { setStep('choyo'); },
    update(dt, S, st) {
      const me = G.me, C = G.target, goal = st.goal;
      G.zones = [];
      if (S.step === 'choyo') {
        if (C && !C.sinking) S.targets.push([C.x, C.y, '#ff8a6a', shipName(C.spec)]);
        S.gv = [C ? Math.round(clamp(C.hull / C.hullMax, 0, 1) * 100) : 0];
        if (C && C.hull < C.hullMax * goal.magazine && !S.said.wounded) { S.said.wounded = 1; hint('wounded', T('h.choyo.hurt'), 0); }
        if (C && (C.sunk || C.sinking) && !S.choyoDown) { S.choyoDown = S.t; }
        if (S.choyoDown && S.t - S.choyoDown > 3.5) {
          S.ammo = goal.ammo;
          setStep('fight');
          /* toute l'escadre se tourne vers le Banryū */
          for (const p of G.pending) p.at = Math.min(p.at, S.t + 2);
        }
      } else if (S.step === 'fight') {
        S.gv = [S.ammo];
        const en = near2(enemiesAfloat(), 1)[0];
        if (en) S.targets.push([en.x, en.y, '#ff8a6a', shipName(en.spec)]);
        if (S.ammo === 0) {
          banner(T('st.ammo.out'), T('st.ammo.out2'), 3);
          Snd.bell(3);
          me.speedK = 0.6;
          setStep('shoal');
        }
      } else if (S.step === 'shoal') {
        G.zones.push(S.zone);
        S.targets.push([S.zone.x, S.zone.y, '#ffb070', S.zone.label]);
        if (S.phase === 'go' && dist(me.x, me.y, S.zone.x, S.zone.y) < S.zone.r && !me.sinking) {
          S.phase = 'beach'; S.beachT = 0; S.anchor = [me.x, me.y]; S.aground = true;
          banner(T('st.shoal'), T('st.shoal2'), 3);
          Snd.thud(1); G.shake = 1;
          fx.splinters(me.x, me.y, 14, '#c8b088');
        }
      }
      if (S.phase === 'beach') {
        S.beachT += dt;
        me.inv = Math.max(me.inv, 0.5);
        if (S.beachT > 3.2) { S.phase = 'go'; storyWin(T('st.shoal.won')); }
      }
    },
  },
};

/* les barques rament : vers le Kaiten, ou vers leur rive quand on les renvoie */
function barqueMove(dt) {
  const K = G.mate;
  for (let i = G.boats.length - 1; i >= 0; i--) {
    const b = G.boats[i];
    if (!b.barque && !b.crew) continue;
    const tgt = b.crew ? b.to : b.state === 'go' && K ? [K.x, K.y] : b.home;
    const want = Math.atan2(tgt[1] - b.y, tgt[0] - b.x);
    b.h += clamp(wrapA(want - b.h), -dt * 1.5, dt * 1.5);
    const sp = b.sp * (b.state === 'back' ? 1.25 : 1);
    const nx = b.x + Math.cos(b.h) * sp * dt, ny = b.y + Math.sin(b.h) * sp * dt;
    if (!G.mapLand(nx, ny) || b.crew) { b.x = nx; b.y = ny; }
    else b.h += dt * 2;
    b.bob += dt * 3;
    /* à la grève : la partie l'oublie, l'image la garde (boats.js) */
    if ((b.state === 'back' || b.crew) && dist(b.x, b.y, tgt[0], tgt[1]) < 26) { boatToFx(b, tgt); G.boats.splice(i, 1); }
  }
}

function onEnemyHitStory(s) {
  const S = G.st, goal = G.stage.goal;
  G.score += 10;
  if (s.spec.armor) { if (!S.said.armor) { S.said.armor = 1; floatText(s.x, s.y, T('st.armor'), 'bad'); } return; }
  /* Hakodate : un coup heureux dans la soute du Chōyō, une fois sa coque entamée */
  if (goal.type === 'sink' && s === G.target && !s.sinking && s.hull < s.hullMax * (goal.magazine || 1) && Math.random() < 0.14) {
    s.hull = 0;
    fx.explosion(s.x, s.y, 2.6);
    fx.explosion(s.x + Math.cos(s.h) * 20, s.y + Math.sin(s.h) * 20, 1.6);
    G.flashAt = [s.x, s.y, 2500];
    Snd.explosion();
    G.shake = 1.6;
    sinkShip(s);
    banner(T('st.magazine'), T('st.magazine2'), 3.2);
  }
  if (s.hull <= 0 || s.sinking) {
    G.score += 500;
    if (s !== G.target) banner(T('st.sinks', shipName(s.spec)), '', 2);
  }
}

function openExit(msg) {
  const S = G.st;
  S.phase = 'exit'; S.exitOpen = true;
  if (msg) banner(msg, '', 2.8);
  Snd.levelUp();
}

function reveal(msg) {
  const S = G.st;
  if (S.alert) return;
  S.alert = true;
  G.me.flag = null;
  banner(msg, '', 2.8);
  Snd.bell(4);
  for (const s of G.ships) if (s.ai && !s.friend) s.ai.fireT = rnd(3.5, 2);
}

/* ---------- fin d'étape ---------- */

function storyWin(msg) {
  const S = G.st;
  if (S.phase === 'won') return;
  S.phase = 'won'; S.endT = 0;
  const bonus = Math.round(G.me.hull / G.me.hullMax * 400) + Math.max(0, Math.round(600 - S.t * 3));
  G.score += bonus;
  banner(msg || T('st.won'), tx(G.stage.title), 2.6);
  Snd.levelUp();
  Music.sting('win');
  const sv = storyLoad();
  const best = sv.best || {};
  best[G.stage.id] = Math.max(best[G.stage.id] || 0, G.score);
  /* la première fois : un navire de plus pour l'arcade, s'il en dépend */
  S.first = (sv.done || 0) <= G.stageIdx;
  if (S.first) S.newShip = Object.keys(UNLOCK).find((id) => UNLOCK[id] === G.stage.id) || null;
  storySave({ done: Math.max(sv.done || 0, G.stageIdx + 1), best });
}

function storyReport() {
  const st = G.stage, S = G.st, me = G.me, g = st.goal;
  G.mode = 'over';
  /* la première victoire : la suite de l'histoire en images, puis le bilan */
  if (S.first && !S.suiteDone && recitHas(st.id, 'apres')) { S.suiteDone = true; showRecit(G.stageIdx, 'apres', storyReport); return; }
  Music.play('brief');
  const next = STAGES[G.stageIdx + 1];
  let goalLine, goalVal;
  if (g.type === 'collect') { goalLine = T(st.boats ? 'res.launches' : 'res.crates'); goalVal = S.got + ' / ' + S.need; }
  else if (g.type === 'board') { goalLine = T('res.board'); goalVal = T('res.board.v'); }
  else if (g.type === 'sink') { goalLine = shipName(SHIPS[g.target]); goalVal = T('res.sunk'); }
  else if (g.type === 'coal') { goalLine = T('res.coal'); goalVal = T('res.sus', S.sus, g.suspicion); }
  else if (g.type === 'beach') { goalLine = T('res.beach'); goalVal = T('res.beach.v'); }
  else { goalLine = T(g.cape ? 'res.cape' : 'res.held'); goalVal = T('res.held.v'); }
  const m = Math.floor(S.t / 60), s = Math.round(S.t % 60);
  const hullV = g.type === 'beach' ? T('res.lost') : Math.round(me.hull / me.hullMax * 100) + ' %';
  showResults({
    kicker: T('res.kicker') + ' · ' + tx(st.when),
    title: tx(st.title),
    sub: tx(st.place),
    after: tx(st.after),
    stats: [[goalLine, goalVal], [T('res.time'), T('res.time.v', m, String(s).padStart(2, '0'))], [T('res.hull'), hullV], [T('res.score'), G.score],
      ...(S.newShip ? [[T('res.unlock'), shipName(SHIPS[S.newShip]), T('res.unlock.n')]] : [])],
    actions: [
      ...(next ? [{ label: T('res.next', tx(next.title)), go: () => storyOpen(G.stageIdx + 1) }] : [{ label: T('res.epilogue'), go: storyEnd }]),
      ...(recitHas(st.id, 'apres') ? [{ label: T('recit.again'), go: () => { S.suiteDone = true; showRecit(G.stageIdx, 'apres', storyReport); } }] : []),
      { label: T('res.replay'), go: () => storyBrief(G.stageIdx) },
      { label: T('menu.main'), go: showTitle },
    ],
  });
}

function storyLost() {
  const st = G.stage, S = G.st;
  G.mode = 'over';
  Music.sting('lose');
  Music.play('brief');
  showResults({
    kicker: tx(st.when),
    title: S.failWhy || T('res.sank', shipName(G.me.spec)),
    sub: tx(st.title),
    tip: tx(st.tip),
    stats: [],
    actions: [
      { label: T('res.restart'), go: () => startStory(G.stageIdx, G.shipId) },
      { label: T('res.orders'), go: () => storyBrief(G.stageIdx) },
      { label: T('menu.main'), go: showTitle },
    ],
  });
}

function storyEnd() {
  showResults({
    kicker: T('res.epi.kicker'),
    title: tx(EPILOGUE.title),
    sub: T('res.epilogue'),
    after: tx(EPILOGUE.text),
    stats: [],
    actions: [
      { label: T('cr.btn'), go: () => showCredits(showTitle) },
      { label: T('res.toArcade'), go: arcadeMenu },
      { label: T('menu.main'), go: showTitle },
    ],
  });
}
