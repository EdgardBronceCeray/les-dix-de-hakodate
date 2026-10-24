'use strict';

/* ---------- la flotte du corsaire ----------
 * Cinq grandes villes ont un arsenal : Edo (Shinagawa), Ōsaka (son port de Hyōgo), Kanazawa,
 * Hiroshima et Kagoshima. Une fois la ville prise, son arsenal arme un navire de plus (un par
 * arsenal). Ces navires ont le même chantier que le vôtre ; ils vous suivent en ligne de file,
 * dans votre sillage, et tirent sur ce qui passe à portée. Au chantier d'un port à vous, on choisit
 * le navire qu'on améliore, celui qu'on mène, et ceux qui suivent ou restent à quai (un navire à
 * quai défend le port). Un navire de la ligne trop touché la quitte et se replie sur le port à vous
 * le plus proche ; réparé, il rallie la flotte. Si le navire que vous menez coule, vous passez à
 * bord d'un autre : la traversée ne s'arrête qu'avec le dernier navire. */

const FLEET_MAX = 6;
/* les noms des navires de la flotte : le Corsaire, puis des oiseaux de mer */
const FLEET_NAMES = [
  { fr: 'Corsaire', art: 'le', en: 'Corsair', ja: 'コルセア号' },
  { fr: 'Mouette', art: 'la', en: 'Mouette', ja: 'ムエット号' },
  { fr: 'Cormoran', art: 'le', en: 'Cormoran', ja: 'コルモラン号' },
  { fr: 'Albatros', art: 'l\'', en: 'Albatros', ja: 'アルバトロス号' },
  { fr: 'Goéland', art: 'le', en: 'Goéland', ja: 'ゴエラン号' },
  { fr: 'Pétrel', art: 'le', en: 'Pétrel', ja: 'ペトレル号' },
];
/* ce que coûte le navire suivant, selon le nombre de navires qu'on a déjà armés */
const FLEET_COST = [300, 500, 750, 1050, 1400];
/* le prix du prochain navire de l'arsenal, selon la difficulté */
const fleetCost = () => Math.round(FLEET_COST[Math.min(FLEET_COST.length - 1, G.cors.fleet.length - 1)] * corsD().price / 5) * 5;
const CORS_ARSENALS = ['shinagawa', 'hyogo', 'kanazawa', 'hiroshima', 'kagoshima'];
/* le navire que livre un arsenal : un cotre, deux mâts, une pièce par bord */
const FLEET_NEW = { coque: 1, mats: 2, canons: 1 };
/* sous ce reste de coque, un navire de la ligne la quitte pour aller se faire réparer */
const FLEET_REP = 0.25;

/* le nom d'un navire de la flotte, avec son article (« la Mouette », « l'Albatros ») */
function fleetNameN(n, cap) {
  const N = FLEET_NAMES[n] || FLEET_NAMES[0];
  if (LANG === 'ja') return N.ja;
  if (LANG === 'en') return (cap ? 'The ' : 'the ') + N.en;
  const a = cap ? N.art.charAt(0).toUpperCase() + N.art.slice(1) : N.art;
  return a + (N.art.endsWith('\'') ? '' : ' ') + N.fr;
}
const fleetName = (s, cap) => fleetNameN(s && s.fleet ? s.fleet.n : 0, cap);
/* « à bord du Corsaire », « à bord de la Mouette », « à bord de l'Albatros » */
function fleetNameDe(s) {
  const N = FLEET_NAMES[s && s.fleet ? s.fleet.n : 0] || FLEET_NAMES[0];
  if (LANG !== 'fr') return fleetNameN(s && s.fleet ? s.fleet.n : 0);
  return (N.art === 'le' ? 'du ' : 'de ' + N.art + (N.art.endsWith('\'') ? '' : ' ')) + N.fr;
}
const fleetFollowers = () => G.cors.fleet.filter((s) => s !== G.me && s.fleet.st === 'follow' && !s.sinking);
function fleetFreeName() {
  const used = new Set(G.cors.fleet.map((s) => s.fleet.n));
  for (let i = 1; i < FLEET_NAMES.length; i++) if (!used.has(i)) return i;
  return -1;
}

/* ---------- créer, placer, enregistrer ---------- */

function fleetMake(cfg, n, st, x, y, h) {
  const s = makeShip('chiyoda', x, y, h);
  s.faction = 'ezo';
  s.fleet = { n, st };
  yardApply(s, Object.assign(yardNew(), cfg));
  s.hull = s.hullMax; s.throttle = 0; s.inv = 1.5;
  s.safe = [x, y, h];
  G.ships.push(s);
  G.cors.fleet.push(s);
  return s;
}

/* les postes à quai d'un port : le premier à côté de la jetée (celui que montre le chantier), les
 * autres bord à bord, de part et d'autre, l'étrave au large comme lui ; s'il n'y a plus de place
 * le long du rivage, un rang plus au large. Personne ne gêne la sortie du premier. */
function fleetPlace(P, list) {
  const sea = Math.atan2(P.hy - P.by, P.hx - P.bx);
  const ux = Math.cos(sea), uy = Math.sin(sea), px = -uy, py = ux;
  const placed = [];
  const put = (s, x, y) => { s.x = x; s.y = y; s.h = sea; s.v = 0; s.w = 0; s.throttle = 0; s.mx = 0; s.my = 0; s.dx = 0; s.dy = 0; s.safe = [x, y, sea]; s.trail = []; };
  const free = (s) => !landHit(s) && placed.every((o) => hullGap(o, s) > 16);
  /* le côté de la caméra du chantier reste dégagé, autant que possible */
  const camSide = YARD.sideP === P && YARD.side ? YARD.side : 0;
  let x0 = P.hx, y0 = P.hy;
  list.forEach((s, i) => {
    let ok = false;
    if (i === 0) {
      for (const k of [1, -1]) {
        const off = s.wid / 2 + 26;
        put(s, P.hx - uy * off * k, P.hy + ux * off * k);
        if (free(s)) { ok = true; break; }
      }
      if (!ok) { put(s, P.hx, P.hy); ok = free(s); }
      x0 = s.x; y0 = s.y;
    }
    const sides = camSide ? [-camSide, camSide] : [1, -1];
    for (let row = 0; !ok && row < 4; row++) {
      for (let k = 1; !ok && k <= 6; k++) {
        for (const sd of sides) {
          const lat = k * (list[0].wid / 2 + s.wid / 2 + 26), back = row ? -row * 40 : 0, fwd = row * 70;
          put(s, x0 + px * sd * lat + ux * (fwd + back), y0 + py * sd * lat + uy * (fwd + back));
          if (free(s)) { ok = true; break; }
        }
      }
    }
    if (!ok) put(s, P.hx, P.hy);
    if (s.fleet) { s.fleet.bx = s.x; s.fleet.by = s.y; s.fleet.bh = s.h; }
    placed.push(s);
  });
}

/* les navires qui sont là quand on ouvre le chantier : ceux qui vous suivent, et ceux qui sont
 * restés à quai dans ce port */
function fleetPresent(P) {
  const me = G.me;
  return [me].concat(G.cors.fleet.filter((s) => s !== me && !s.sinking && (s.fleet.st === 'follow' || s.fleet.st === P.id)));
}

/* ce que la traversée enregistrée garde de la flotte */
function fleetSave() {
  const C = G.cors, me = G.me;
  return {
    flagN: me.fleet ? me.fleet.n : 0,
    /* un navire parti se faire réparer revient réparé : il suit la flotte */
    fleet: C.fleet.filter((s) => s !== me && !s.sinking).map((s) => ({ cfg: Object.assign({}, s.cfg), n: s.fleet.n, st: s.fleet.rep ? 'follow' : s.fleet.st })),
    bought: Object.assign({}, C.bought),
  };
}

/* au début d'une traversée reprise : les navires qui suivent sont au port avec vous, ceux qui
 * étaient restés à quai retrouvent leur port (s'il est encore à vous) */
function fleetLoad(list, P) {
  const C = G.cors;
  const here = [G.me];
  const docked = {};
  for (const e of list || []) {
    let st = e.st || 'follow';
    const Q = st !== 'follow' ? C.ports.find((p) => p.id === st && p.state === 'ours') : null;
    if (st !== 'follow' && !Q) st = 'follow';
    const s = fleetMake(e.cfg, e.n, st, P.hx, P.hy, 0);
    if (st === 'follow') here.push(s);
    else (docked[st] = docked[st] || []).push(s);
  }
  fleetPlace(P, here);
  for (const id of Object.keys(docked)) fleetPlace(C.ports.find((p) => p.id === id), docked[id]);
  C.trail = [[G.me.x, G.me.y]];
}

/* ---------- au chantier ---------- */

/* un arsenal arme un navire de plus : un cotre, à faire grandir */
function fleetBuy(P) {
  const C = G.cors;
  const n = fleetFreeName();
  if (n < 0 || C.fleet.length >= FLEET_MAX || C.bought[P.id]) return null;
  const cost = fleetCost();
  if (C.coins < cost) return null;
  C.coins -= cost; C.spent += cost;
  C.bought[P.id] = true;
  const s = fleetMake(Object.assign(yardNew(), FLEET_NEW), n, 'follow', P.hx, P.hy, 0);
  C.stats.ships = (C.stats.ships || 0) + 1;
  return s;
}

/* vous passez à bord d'un autre navire de la flotte : c'est lui que vous menez */
function fleetCommand(s) {
  const C = G.cors, old = G.me;
  if (!s || s === old || s.sinking) return;
  G.me = s;
  s.fleet.st = 'follow'; old.fleet.st = 'follow';
  s.fleet.rep = false; s.fleet.arr = false; old.fleet.rep = false; old.fleet.arr = false;
  for (const q of [old, s]) { q.gite = 0; q.giteHold = 0; q.giteNear = false; q.coalK = 1; q.noSteam = false; }
  /* le navire amiral en tête de la liste */
  C.fleet = [s].concat(C.fleet.filter((q) => q !== s));
  C.trail = [[s.x, s.y]];
  corsScale();
}

/* ---------- en mer ---------- */

/* la trace du navire amiral : les navires qui suivent passent là où il est passé */
function fleetTrail() {
  const C = G.cors, me = G.me, T_ = C.trail;
  const last = T_[T_.length - 1];
  if (!last || dist(last[0], last[1], me.x, me.y) > 22) T_.push([me.x, me.y]);
  /* on ne garde que ce qu'il faut pour toute la ligne de file, et un peu plus */
  let need = 600;
  for (const s of fleetFollowers()) need += s.len + 70;
  let len = 0;
  for (let i = T_.length - 1; i > 0; i--) {
    len += dist(T_[i][0], T_[i][1], T_[i - 1][0], T_[i - 1][1]);
    if (len > need) { T_.splice(0, i - 1); break; }
  }
}

/* le point de la trace à la distance D derrière le navire amiral, et le sens de la marche */
function fleetTrailAt(D) {
  const T_ = G.cors.trail, me = G.me;
  let x = me.x, y = me.y, left = D;
  for (let i = T_.length - 1; i >= 0; i--) {
    const px = T_[i][0], py = T_[i][1], l = Math.hypot(x - px, y - py);
    if (l > 0.01 && l >= left) { const f = left / l; return [x + (px - x) * f, y + (py - y) * f, (x - px) / l, (y - py) / l, true]; }
    left -= l; x = px; y = py;
  }
  return [x, y, Math.cos(me.h), Math.sin(me.h), false];
}

function fleetStep(dt) {
  const C = G.cors, me = G.me;
  if (!C.fleet) return;
  fleetTrail();
  /* la ligne de file : chacun à sa place derrière le précédent */
  let D = 0, prev = me;
  for (const s of C.fleet.slice()) {
    if (s === me) continue;
    if (s.sinking) { fleetLost(s); continue; }
    s.coalK = me.coalK; s.noSteam = me.noSteam && !!s.cfg.chaudiere;
    const F = s.fleet;
    /* trop touché : il quitte la ligne (dans la rade d'un port à vous, les charpentiers y suffisent) */
    if (F.st === 'follow' && s.hull < s.hullMax * FLEET_REP && !corsSafe(s.x, s.y)) fleetBack(s);
    if (F.st === 'follow') {
      D += (prev.len + s.len) / 2 + 55;
      fleetFollow(s, D, dt);
      prev = s;
    } else if (F.rep && !F.arr) fleetReturn(s, dt);
    else {
      fleetDocked(s, dt);
      if (F.rep && s.hull >= s.hullMax - 0.5) fleetRejoin(s);
    }
    moveOnMap(s, dt);
    fleetFire(s, dt);
    fleetCare(s, dt);
  }
  /* les navires perdus finissent de couler, puis disparaissent */
  for (let i = C.sinking.length - 1; i >= 0; i--) {
    const s = C.sinking[i];
    if (!s.sunk) { stepShip(s, dt); continue; }
    C.sinking.splice(i, 1);
    const k = G.ships.indexOf(s);
    if (k >= 0) G.ships.splice(k, 1);
  }
}

/* suivre la trace : on vise un peu devant sa place, et l'on règle l'allure sur l'écart */
function fleetFollow(s, D, dt) {
  const me = G.me;
  const [tx, ty, fx, fy, ok] = fleetTrailAt(D);
  const look = Math.max(80, s.len);
  const [ax, ay] = fleetTrailAt(Math.max(0, D - look));
  const lag = (tx - s.x) * fx + (ty - s.y) * fy;
  const off = Math.hypot(tx - s.x, ty - s.y);
  let want = Math.abs(me.v) + clamp(lag, -160, 320) * 0.9;
  if (!ok && off < 300) want = 0;
  if (off > 300) want = maxSpeed(s);
  if (off < 50 && Math.abs(me.v) < 12) want = 0;
  const thr = clamp(want / Math.max(1, maxSpeed(s)), 0, 1);
  if (off > 260) corsSteer(s, dt, tx, ty, thr);
  else corsSteer(s, dt, ax, ay, thr);
  /* resté loin derrière, hors de vue (un cap à contourner, un navire trop lent) : il rallie ; celui
   * qui revient du port n'arrive pas avant le temps de la traversée */
  if (ok && off > Math.max(1100, cam.w * 0.9) && dist(s.x, s.y, me.x, me.y) > cam.w * 0.75 && W.t >= (s.fleet.eta || 0) && corsClear(tx, ty, s.wid + 10)) {
    s.x = tx; s.y = ty; s.h = Math.atan2(fy, fx); s.v = Math.abs(me.v) * 0.8;
    s.mx = Math.cos(s.h) * s.v; s.my = Math.sin(s.h) * s.v; s.dx = 0; s.dy = 0; s.w = 0;
    s.safe = [s.x, s.y, s.h];
  }
}

/* à quai : il tient son poste, l'étrave au large */
function fleetDocked(s, dt) {
  const F = s.fleet;
  if (F.bx === undefined) { F.bx = s.x; F.by = s.y; F.bh = s.h; }
  const d = dist(s.x, s.y, F.bx, F.by);
  if (d > 40) corsSteer(s, dt, F.bx, F.by, clamp(d / 300, 0.15, 0.5));
  else { s.throttle = lerp(s.throttle, 0, clamp(dt * 2, 0, 1)); steerShip(s, dt, false, false, false, false); }
}

/* un poste libre à quai pour un navire qui arrive, sans déplacer ceux qui y sont déjà ; put : il y
 * est tout de suite (il est arrivé hors de vue) */
function fleetBerth(P, s, put) {
  const sea = Math.atan2(P.hy - P.by, P.hx - P.bx);
  const ux = Math.cos(sea), uy = Math.sin(sea), px = -uy, py = ux;
  const occ = G.ships.filter((o) => o !== s && !o.sunk && dist(o.x, o.y, P.hx, P.hy) < 600);
  const sx = s.x, sy = s.y, sh = s.h;
  const free = () => !landHit(s) && occ.every((o) => hullGap(o, s) > 16);
  const off = s.wid / 2 + 26;
  const tries = [];
  for (const k of [1, -1]) tries.push([P.hx - uy * off * k, P.hy + ux * off * k]);
  for (let row = 0; row < 4; row++) {
    for (let k = 1; k <= 6; k++) {
      for (const sd of [1, -1]) {
        const lat = k * (s.wid + 26), f = row * 30;
        tries.push([P.hx - uy * off + px * sd * lat + ux * f, P.hy + ux * off + py * sd * lat + uy * f]);
      }
    }
  }
  let at = [P.hx, P.hy];
  for (const [x, y] of tries) { s.x = x; s.y = y; s.h = sea; if (free()) { at = [x, y]; break; } }
  const F = s.fleet;
  F.bx = at[0]; F.by = at[1]; F.bh = sea;
  if (put) {
    s.x = at[0]; s.y = at[1]; s.h = sea; s.v = 0; s.w = 0; s.throttle = 0; s.mx = 0; s.my = 0; s.dx = 0; s.dy = 0;
    s.safe = [s.x, s.y, sea]; s.trail = [];
  } else { s.x = sx; s.y = sy; s.h = sh; }
}

/* trop d'avaries : il quitte la ligne et gagne le port à vous le plus proche */
function fleetBack(s) {
  const F = s.fleet;
  const Q = corsNearestOurs(s.x, s.y);
  F.st = Q.id; F.rep = true; F.arr = false; F.path = null; F.pathT = 0; F.bx = undefined;
  /* hors de vue, il fait route quand même : on ne le retrouve au port qu'au bout de la traversée */
  F.eta = W.t + dist(s.x, s.y, Q.hx, Q.hy) / Math.max(40, maxSpeed(s));
  showHint(T('flt.back', fleetName(s, true), portName(Q)));
}

/* la route du port : il y va ; hors de vue et loin de vous, on le retrouve au port, le temps de la
 * traversée passé */
function fleetReturn(s, dt) {
  const F = s.fleet, me = G.me;
  let Q = G.cors.ports.find((p) => p.id === F.st);
  if (!Q || Q.state !== 'ours') { Q = corsNearestOurs(s.x, s.y); F.st = Q.id; F.path = null; }
  const d = dist(s.x, s.y, Q.hx, Q.hy);
  if (d < CORS_ZONE_R * 0.8) { fleetBerth(Q, s, false); F.arr = true; fleetDocked(s, dt); return; }
  if (d > 600 && dist(s.x, s.y, me.x, me.y) > cam.w * 0.75 && W.t >= (F.eta || 0)) { fleetBerth(Q, s, true); F.arr = true; return; }
  F.pathT -= dt;
  if (!F.path || F.pathT <= 0) { F.path = corsLos(s.x, s.y, Q.hx, Q.hy, 60) ? [[Q.hx, Q.hy]] : corsPath(s.x, s.y, Q.hx, Q.hy); F.pi = 0; F.pathT = 5; }
  while (F.pi < F.path.length - 1 && dist(s.x, s.y, F.path[F.pi][0], F.path[F.pi][1]) < 140) F.pi++;
  const [x, y] = F.path[F.pi];
  corsSteer(s, dt, x, y, 1);
}

/* réparé : il rallie la flotte, en queue de la ligne */
function fleetRejoin(s) {
  const C = G.cors, F = s.fleet;
  F.st = 'follow'; F.rep = false; F.arr = false; F.path = null;
  F.eta = W.t + dist(s.x, s.y, G.me.x, G.me.y) / Math.max(40, maxSpeed(s));
  C.fleet = C.fleet.filter((q) => q !== s).concat([s]);
  showHint(T('flt.rejoin', fleetName(s, true)));
}

/* le tir : la bordée sur un ennemi par le travers, les pièces de chasse sur celui qui est devant,
 * la mitrailleuse sur ce qui approche ; une batterie ennemie par le travers reçoit aussi la bordée */
function fleetFire(s, dt) {
  if (s.sinking || G.mode !== 'play') return;
  let best = null, bd = 540;
  for (const o of corsAIs()) {
    if (o.sinking || o.captured) continue;
    const d = dist(o.x, o.y, s.x, s.y);
    if (d < bd) { bd = d; best = o; }
  }
  if (best && s.cfg.gatling && bd < (s.spec.gatR || 320)) { gatling(s, best.x + best.vx * 0.2, best.y + best.vy * 0.2, dt * 0.7 * (s.spec.gatK || 1)); best.cors.hitMe = W.t; }
  if (s.cool > 0) return;
  const ck = s.spec.coolK || 1;
  if (best) {
    const rel = wrapA(Math.atan2(best.y - s.y, best.x - s.x) - s.h);
    const sideAim = Math.abs(Math.abs(rel) - Math.PI / 2) < 0.5;
    if (sideAim && s.spec.broad) { fireShip(s, { broad: s.spec.broad, side: rel > 0 ? 1 : -1, sideOnly: true }); s.cool = 1.9 * ck; }
    else if (Math.abs(rel) < 0.35 && bd < 480) { fireShip(s); s.cool = 1.5 * ck; }
    return;
  }
  const side = s.spec.broad ? corsBatteryAbeam(s) : 0;
  if (side) { fireShip(s, { broad: s.spec.broad, side, sideOnly: true }); s.cool = 2.1 * ck; }
}

/* au port : les charpentiers ; en route : les coffres qu'on croise */
function fleetCare(s, dt) {
  const C = G.cors;
  if (s.sinking) return;
  const P = corsPortAt(s.x, s.y);
  if (P && P.state === 'ours' && Math.abs(s.v) < maxSpeed(s) * 0.45 && s.hull < s.hullMax) s.hull = Math.min(s.hullMax, s.hull + s.hullMax * 0.08 * dt);
  else corsPumps(s, dt);
  for (let i = G.chests.length - 1; i >= 0; i--) {
    const c = G.chests[i];
    if (!hitsShip(s, c.x, c.y, c.r + 6)) continue;
    G.chests.splice(i, 1);
    fx.splash(c.x, c.y, 0.6);
    corsGold(c.coins, c.x, c.y);
    if (c.auto) C.auto = Math.min(1, C.auto + c.auto);
  }
}

/* un navire de la flotte coule */
function fleetLost(s) {
  const C = G.cors;
  const i = C.fleet.indexOf(s);
  if (i < 0) return;
  C.fleet.splice(i, 1);
  C.sinking.push(s);
  C.stats.shipsLost = (C.stats.shipsLost || 0) + 1;
  banner(T('flt.lost', fleetName(s, true)), T(C.fleet.length > 1 ? 'flt.lost2' : 'flt.lost2.1'), 2.6);
  Snd.bell(2);
  corsScale();
}

/* le navire que vous menez coule : vous passez à bord d'un autre, s'il en reste un */
function fleetTransfer() {
  const C = G.cors, old = G.me;
  const alive = C.fleet.filter((s) => s !== old && !s.sinking);
  if (!alive.length) return false;
  alive.sort((a, b) => (a.fleet.st === 'follow' ? 0 : 1) - (b.fleet.st === 'follow' ? 0 : 1) || dist(a.x, a.y, old.x, old.y) - dist(b.x, b.y, old.x, old.y));
  const s = alive[0];
  const far = dist(s.x, s.y, old.x, old.y) > cam.w * 0.6;
  C.fleet.splice(C.fleet.indexOf(old), 1);
  C.sinking.push(old);
  C.stats.shipsLost = (C.stats.shipsLost || 0) + 1;
  fleetCommand(s);
  C.board = null; C.landing = null; G.corsBar = null;
  s.inv = Math.max(s.inv, 2);
  banner(T('flt.transfer', fleetName(old, true)), T('flt.transfer2', fleetNameDe(s)), 3.2);
  Snd.bell(3);
  if (far) followCamera(true);
  return true;
}

/* un port tombe : les navires restés à quai gagnent le port à vous le plus proche */
function fleetPortLost(P) {
  const C = G.cors;
  const out = C.fleet.filter((s) => s.fleet.st === P.id && !s.sinking);
  if (!out.length) return;
  const Q = corsNearestOurs(P.hx, P.hy);
  /* ceux qui étaient en route pour ce port changent de route ; ceux qui y étaient s'y retrouvent */
  const coming = (s) => s.fleet.rep && !s.fleet.arr;
  for (const s of out) { s.fleet.st = Q.id; s.fleet.path = null; }
  if (out.every(coming)) return;
  fleetPlace(Q, C.fleet.filter((s) => s.fleet.st === Q.id && !s.sinking && !coming(s)));
  floatText(Q.hx, Q.hy - 40, T('flt.fled', portName(Q)), 'bad');
}

/* ---------- à l'écran ---------- */

function fleetDraw(c, label) {
  const C = G.cors;
  for (const s of C.fleet) {
    if (s === G.me || s.sinking) continue;
    const [px, py, ok] = toScreen(s.x, s.y, 50);
    if (!ok || px < -60 || py < -60 || px > cam.pw + 60 || py > cam.ph + 60) continue;
    c.font = '600 13px "Palatino Linotype", Georgia, serif';
    const F = s.fleet;
    label(fleetNameN(F.n, true) + (F.st === 'follow' ? '' : ' · ' + T(F.rep ? (F.arr ? 'flt.rep.l' : 'flt.back.l') : 'flt.docked')), px, py - 46, '#bfe8c4');
    const f = clamp(s.hull / s.hullMax, 0, 1);
    c.fillStyle = 'rgba(16,20,26,0.8)'; roundRect(c, px - 30, py - 40, 60, 6, 3); c.fill();
    c.fillStyle = f > 0.5 ? '#7fd8a8' : f > 0.25 ? '#e0c060' : '#e06a50'; roundRect(c, px - 29, py - 39, 58 * f, 4, 2); c.fill();
  }
}

function fleetMini(c, P, me, radius) {
  const C = G.cors;
  for (const s of C.fleet) {
    if (s === me || s.sinking || dist(s.x, s.y, me.x, me.y) > radius) continue;
    const [px, py] = P(s.x, s.y);
    c.save(); c.translate(px, py); c.rotate(s.h);
    c.fillStyle = '#a8f0c0'; c.strokeStyle = '#0d2a1a'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(9, 0); c.lineTo(-6, -5); c.lineTo(-6, 5); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
}

/* dans la plaque du navire : ceux qui vous suivent, et l'état de leur coque */
function fleetHud() {
  const C = G.cors;
  const row = el('h-fleet-row');
  if (!row) return;
  const F = C.fleet.filter((s) => s !== G.me && !s.sinking);
  row.classList.toggle('hidden', !F.length);
  if (!F.length) return;
  const fol = F.filter((s) => s.fleet.st === 'follow');
  const rep = F.filter((s) => s.fleet.st !== 'follow' && s.fleet.rep).length, dock = F.length - fol.length - rep;
  setHtml('h-fleet', fol.map((s) => { const f = clamp(s.hull / s.hullMax, 0, 1); return `<i style="--f:${f.toFixed(2)};--c:${f > 0.5 ? '#7fd8a8' : f > 0.25 ? '#e0c060' : '#e06a50'}"></i>`; }).join(''));
  /* ceux qui suivent, ceux qui sont à quai, ceux qui sont allés se faire réparer */
  const parts = [];
  if (fol.length) parts.push(T('flt.hud.f', fol.length));
  if (dock) parts.push(T('flt.hud.dock', dock));
  if (rep) parts.push(T('flt.hud.rep', rep));
  setText('h-fleet-n', fol.length === F.length ? T(fol.length === 1 ? 'flt.hud.1' : 'flt.hud', fol.length) : parts.join(LANG === 'ja' ? '・' : ' · '));
}

addStr({
  'flt.lost': ['{0} a sombré', '{0} has gone down', '{0}が沈んだ'],
  'flt.lost2': ['le reste de la flotte tient la ligne', 'the rest of the fleet holds the line', '残りの艦は隊列を保つ'],
  'flt.lost2.1': ['vous voilà seul', 'you are on your own now', 'これで単艦だ'],
  'flt.transfer': ['{0} a sombré', '{0} has gone down', '{0}が沈んだ'],
  'flt.transfer2': ['vous passez à bord {0} : la traversée continue', 'you go aboard {0}: the voyage goes on', '{0}に乗り移る。航海は続く'],
  'flt.fled': ['vos navires à quai se replient sur {0}', 'your docked ships fall back on {0}', '停泊中の艦は{0}へ退いた'],
  'flt.docked': ['à quai', 'docked', '停泊中'],
  'flt.back': ['{0} quitte la ligne et se replie sur {1} pour réparer ses avaries', '{0} falls out of line and makes for {1} to repair', '{0}は損傷がひどく、隊列を離れて{1}へ修理に向かう'],
  'flt.back.l': ['se replie', 'falling back', '退避中'],
  'flt.rep.l': ['en réparation', 'under repair', '修理中'],
  'flt.rejoin': ['{0} a réparé ses avaries et rallie la flotte', '{0} has made good her damage and rejoins the fleet', '{0}は修理を終え、艦隊に戻る'],
  'flt.hud': ['{0} vous suivent', '{0} following', '随伴{0}隻'],
  'flt.hud.1': ['1 vous suit', '1 following', '随伴1隻'],
  'flt.hud.f': ['{0}', '{0}', '随伴{0}'],
  'flt.hud.dock': ['{0} à quai', '{0} docked', '停泊{0}'],
  'flt.hud.rep': ['{0} en réparation', '{0} under repair', '修理{0}'],
  'flt.arsenal.k': ['Un arsenal', 'An arsenal', '工廠'],
  'flt.arsenal': ['{0} a un arsenal : à son chantier, vous pouvez armer un navire de plus. Il vous suivra en ligne de file et se battra à vos côtés.', '{0} has an arsenal: at its shipyard you can fit out one more ship. She will follow in your wake and fight at your side.', '{0}には工廠がある。その造船所でもう一隻を艤装できる。その艦は後に続き、ともに戦う。'],
});
