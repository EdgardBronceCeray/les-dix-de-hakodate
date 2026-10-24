'use strict';

/* Le moteur commun aux deux modes : un navire qui répond tout de suite,
 * des boulets, des gerbes, de la fumée. Unités : pixels et secondes. */

const W = { t: 0, wind: [0, 0], drift: [0, 0] };

/* ---------- navires ---------- */

function expandGuns(spec) {
  const out = [];
  for (const g of spec.armament || []) {
    const n = g.n || 1;
    if (g.mount === 'broad') {
      const per = Math.ceil(n / 2);
      for (const side of [1, -1]) {
        const k = side === 1 ? per : n - per;
        for (let i = 0; i < k; i++) {
          /* g.xs : les sabords placés un à un (pour laisser la place aux tambours des roues) */
          const f = g.xs ? g.xs[i % g.xs.length] - (g.x || 0) : k === 1 ? 0 : (i / (k - 1) - 0.5) * (g.span || 0.56);
          out.push({ type: g.type, side, bx: f * spec.L + (g.x || 0) * spec.L, by: side * spec.B * 0.46, arcs: [[side * Math.PI / 2, 0.5]] });
        }
      }
    } else {
      for (let i = 0; i < n; i++) {
        const x = (g.x !== undefined ? g.x : 0) * spec.L + (n > 1 ? (i - (n - 1) / 2) * 3 : 0);
        const c = g.mount === 'stern' || g.mount === 'aftcasemate' ? Math.PI : 0;
        out.push({ type: g.type, side: 0, bx: x, by: 0, arcs: [[c, 0.5]] });
      }
    }
  }
  return out;
}

let SHIP_SEQ = 1;
function makeShip(id, x, y, h) {
  const spec = SHIPS[id];
  return {
    spec, faction: spec.faction, id: SHIP_SEQ++,
    x, y, h, v: 0, vx: 0, vy: 0, dx: 0, dy: 0, w: 0,
    throttle: 0.35,
    hull: spec.hull, hullMax: spec.hull,
    up: { voilure: 0, coque: 0, canons: 0 },
    cool: 0, inv: 0, hitT: 0,
    len: spec.L * SCALE, wid: spec.B * SCALE,
    /* état pour le dessin */
    sail: 1, sailMax: spec.sailMaxInit, roll: 0, wheelAngle: 0, fire: 0, holes: [],
    dmg: { rig: 1, funnel: 1, wheelP: 1, wheelS: 1 },
    guns: expandGuns(spec),
    sinking: 0, sunk: false, smokeT: 0, trail: [],
  };
}

const fwdOf = (s) => [Math.cos(s.h), Math.sin(s.h)];
function shipToWorld(s, bx, by) {
  const c = Math.cos(s.h), n = Math.sin(s.h);
  return [s.x + (bx * c - by * n) * SCALE, s.y + (bx * n + by * c) * SCALE];
}
/* une chaîne de cercles le long de la coque, pour les chocs et les coups au but */
function hullCircles(s) {
  const c = Math.cos(s.h), n = Math.sin(s.h);
  const r = Math.max(6, s.wid * 0.62);
  const k = clamp(Math.round(s.len / (r * 1.7)), 3, 7);
  const out = [];
  for (let i = 0; i < k; i++) {
    const off = (i / (k - 1) - 0.5) * s.len * 0.76;
    out.push([s.x + c * off, s.y + n * off, r]);
  }
  return out;
}
function hitsShip(s, x, y, r) {
  for (const [cx, cy, cr] of hullCircles(s)) if ((x - cx) ** 2 + (y - cy) ** 2 < (r + cr) ** 2) return true;
  return false;
}

/* Un navire, pas une moto : sans amélioration, il file à la moitié de sa vitesse de
 * fiche et vire posément ; chaque caisse de voilure lui rend de l'allure et de la barre. */
const PACE = { speed: 0.5, turn: 0.42, perUp: 0.12, turnUp: 0.1 };
/* speedK : un calmar agrippé ; coalK : la soute vide du corsaire, un tiers de l'allure ; paceK : le
 * navire du corsaire qui vous chasse et force l'allure */
function maxSpeed(s) { return s.spec.speed * PACE.speed * (1 + PACE.perUp * upEff(s.up.voilure)) * (s.speedK || 1) * (s.coalK || 1) * (s.boostK || 1) * (s.paceK || 1); }
function turnRate(s) { return s.spec.turn * PACE.turn * (1 + PACE.turnUp * upEff(s.up.voilure)); }
/* la coque encaisse moins à chaque cran, la cadence de tir s'accélère : à rendement décroissant */
function armorUp(l) { return 1 - 0.1 * Math.min(l, 5) - 0.03 * Math.max(0, l - 5); }
function coolUp(l) { return 1 - 0.08 * Math.min(l, 5) - 0.035 * Math.max(0, l - 5); }

/* ↑ accélère, ↓ ralentit puis recule ; ← → tournent tout de suite */
function steerShip(s, dt, up, down, left, right) {
  if (up) s.throttle = Math.min(1, s.throttle + dt * 1.8);
  if (down) s.throttle = Math.max(-0.35, s.throttle - dt * 2.2);
  const turn = (right ? 1 : 0) - (left ? 1 : 0);
  const k = 0.45 + 0.55 * clamp(Math.abs(s.v) / (maxSpeed(s) * 0.45), 0, 1);
  const target = turn * turnRate(s) * k * (s.v < 0 ? -0.6 : 1);
  /* la barre mord en une demi-seconde environ */
  s.w = lerp(s.w, target, clamp(dt * 4, 0, 1));
}

function stepShip(s, dt) {
  if (s.sunk) return;
  if (s.sinking) {
    s.sinking += dt;
    s.v *= Math.exp(-dt * 1.5);
    s.w *= Math.exp(-dt * 2);
    if (s.sinking > 3.5) s.sunk = true;
  }
  /* la vitesse rejoint la consigne avec l'inertie d'une coque : trois secondes pour prendre l'erre */
  const want = s.sinking ? 0 : s.throttle * maxSpeed(s);
  const acc = (want > s.v ? 42 : 58) * (1 + 0.1 * upEff(s.up.voilure));
  s.v += clamp(want - s.v, -acc * dt, acc * dt);
  s.h = wrapA(s.h + s.w * dt);
  /* poussées extérieures (choc, tourbillon, vent) qui s'amortissent */
  s.dx *= Math.exp(-dt * 2.2);
  s.dy *= Math.exp(-dt * 2.2);
  /* l'erre suit le cap avec un léger retard : le navire glisse un peu dans les virages */
  const tx = Math.cos(s.h) * s.v, ty = Math.sin(s.h) * s.v;
  if (s.mx === undefined) { s.mx = tx; s.my = ty; }
  const kk = 1 - Math.exp(-dt * 2.6);
  s.mx += (tx - s.mx) * kk; s.my += (ty - s.my) * kk;
  s.vx = s.mx + s.dx + W.drift[0];
  s.vy = s.my + s.dy + W.drift[1];
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.inv = Math.max(0, s.inv - dt);
  s.cool -= dt;
  s.hitT = Math.max(0, s.hitT - dt);
  /* pour le dessin : roulis, roues, voiles selon l'allure */
  s.roll = Math.sin(W.t * 1.4 + s.id) * 2.5 * DEG;
  s.wheelAngle += s.v / 60 * dt;
  s.sail = s.throttle > 0.5 ? s.sailMax : s.throttle > 0.1 ? Math.min(1, s.sailMax) : 0;
  emitShip(s, dt);
}

function damageShip(s, amount, why) {
  if (s.inv > 0 || s.sinking || s.sunk) return false;
  const armor = s.armor !== undefined ? s.armor : s.spec.armor || 1;
  amount *= armor * armorUp(s.up.coque) * (s.dmgK || 1);
  s.hull -= amount;
  /* certains navires ne coulent pas ce jour-là : désemparés, ils se retirent */
  if (s.noSink && s.hull < 1) s.hull = 1;
  s.hitT = 0.25;
  if (s.holes.length < 8 && amount > 6) s.holes.push({ bx: rndSym(s.spec.L * 0.4), z: 1, size: 0.01 + amount / 1500 });
  if (s.hull <= 0) { s.hull = 0; sinkShip(s); }
  return true;
}

function sinkShip(s) {
  if (s.sinking) return;
  s.sinking = 0.01;
  fx.explosion(s.x, s.y, s.len / 70);
  Snd.sink();
}

/* ---------- tir ---------- */

/* une bordée de boulets : pièces de chasse vers l'avant, puis sur les côtés
 * à mesure que les canons montent en grade */
function fireShip(s, opts) {
  opts = opts || {};
  const lvl = s.up.canons;
  const shots = [];
  const chase = (s.spec.chase || 1) + (lvl >= 1 ? 1 : 0) + (lvl >= 3 ? 1 : 0) + (lvl >= 7 ? 1 : 0);
  const spread = 0.12;
  if (!opts.sideOnly) {
    for (let i = 0; i < chase; i++) {
      const a = s.h + (i - (chase - 1) / 2) * spread;
      shots.push([s.len * 0.5, (i - (chase - 1) / 2) * s.wid * 0.25, a]);
    }
  }
  const per = opts.broad !== undefined ? opts.broad : (lvl >= 2 ? 1 : 0) + (lvl >= 4 ? 1 : 0) + (lvl >= 8 ? 1 : 0);
  const sides = opts.side ? [opts.side] : [1, -1];
  for (const side of sides) {
    for (let i = 0; i < per; i++) {
      const bx = (i - (per - 1) / 2) * s.len * 0.25;
      shots.push([bx, side * s.wid * 0.55, s.h + side * Math.PI / 2]);
    }
  }
  /* les pièces de retraite : aux crans 5 et 9 ; le corsaire, celles que le chantier lui a données */
  if (s.spec.custom) { if (s.spec.stern && !opts.sideOnly) { shots.push([-s.len * 0.5, s.wid * 0.25, s.h + Math.PI + 0.12]); shots.push([-s.len * 0.5, -s.wid * 0.25, s.h + Math.PI - 0.12]); } }
  else {
    if (lvl >= 5 && !opts.sideOnly) shots.push([-s.len * 0.5, 0, s.h + Math.PI]);
    if (lvl >= 9 && !opts.sideOnly) { shots.push([-s.len * 0.5, s.wid * 0.25, s.h + Math.PI + 0.14]); shots.push([-s.len * 0.5, -s.wid * 0.25, s.h + Math.PI - 0.14]); }
  }
  for (const [bx, by, a] of shots) {
    const c = Math.cos(s.h), n = Math.sin(s.h);
    const x = s.x + bx * c - by * n, y = s.y + bx * n + by * c;
    const sp = opts.speed || 560;
    /* le corsaire : son calibre porte plus loin et frappe plus fort (spec.rangeK, spec.dmgK) */
    G.shots.push({ x, y, vx: Math.cos(a) * sp + s.vx * 0.5, vy: Math.sin(a) * sp + s.vy * 0.5, life: (opts.life || 0.78) * (s.spec.rangeK || 1), owner: s, dmg: (opts.dmg || 10) * (s.spec.dmgK || 1), kind: 'boulet' });
    fx.muzzle(x, y, Math.cos(a), Math.sin(a));
  }
  Snd.cannon(shots.length > 2 ? 22 : 14, s === G.me ? 0 : dist(s.x, s.y, G.me.x, G.me.y));
  G.flashAt = [s.x, s.y, 120 + shots.length * 60];
  /* pour le dessin : quelles pièces reculent */
  s.fireT = W.t; s.fireSide = opts.side || 0; s.fireChase = !opts.sideOnly;
  /* une bordée fait rouler le navire */
  if (opts.side) s.kick = -opts.side * Math.min(0.08, 0.02 * shots.length);
  /* le temps de recharger : près d'une seconde au début, un peu moins à chaque caisse de canons */
  s.cool = (opts.cool || (s === G.me ? 0.9 : 1.3)) * coolUp(lvl) * (s.spec.coolK || 1);
  return shots.length;
}

/* la Gatling du Kōtetsu : une rafale de balles */
function gatling(s, tx, ty, dt) {
  s.gatT = (s.gatT || 0) + dt * 9;
  while (s.gatT > 1) {
    s.gatT -= 1;
    const a = Math.atan2(ty - s.y, tx - s.x) + rndSym(0.08);
    G.shots.push({ x: s.x, y: s.y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, life: 0.45, owner: s, dmg: 1.6, kind: 'balle' });
    if (Math.random() < 0.3) Snd.gatling(dist(s.x, s.y, G.me.x, G.me.y));
  }
}

function stepShots(dt, onHit) {
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const p = G.shots[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.grace > 0) p.grace -= dt;
    if (G.field.wrap) wrapObj(p, 0);
    if (onHit(p)) { G.shots.splice(i, 1); continue; }
    if (p.life <= 0) {
      if (p.kind === 'boulet') { fx.splash(p.x, p.y, 0.7); if (Math.random() < 0.4) Snd.splash(dist(p.x, p.y, G.me.x, G.me.y)); }
      G.shots.splice(i, 1);
    }
  }
}

function wrapObj(o, r) {
  const f = G.field;
  /* arène classique : un champ qui se raccorde sur lui-même, centré sur le navire */
  if (f.around && G.me) {
    const cx = G.me.x, cy = G.me.y;
    if (o.x < cx - f.w / 2) o.x += f.w; else if (o.x > cx + f.w / 2) o.x -= f.w;
    if (o.y < cy - f.h / 2) o.y += f.h; else if (o.y > cy + f.h / 2) o.y -= f.h;
    return;
  }
  if (o.x < -r) o.x += f.w + 2 * r; else if (o.x > f.w + r) o.x -= f.w + 2 * r;
  if (o.y < -r) o.y += f.h + 2 * r; else if (o.y > f.h + r) o.y -= f.h + 2 * r;
}

/* ---------- traces et fumée ---------- */

function emitShip(s, dt) {
  const sp = s.spec, k = sp.look;
  if (s.sunk) return;
  if (s !== G.me && G.me && cam.w && Math.abs(s.x - cam.x) + Math.abs(s.y - cam.y) > cam.w * 1.6) { s.trail.length = 0; return; }
  /* fumée de cheminée, qui part sous le vent */
  if (sp.prop !== 'none' && !s.sinking && !s.noSteam) {
    /* à chaque cran de voilure (de machine, pour le Kaiten), on pousse plus fort les feux :
     * la fumée monte plus épaisse et plus souvent */
    const vL = G.game === 'story' ? 0 : s.up.voilure;
    const steamK = 1 + (k.noSail ? 0.11 : 0.075) * upEff(vL);
    s.smokeT += dt * (1.5 + Math.max(0, s.throttle) * 5) * (0.85 + 0.15 * steamK);
    const funnels = k.funnel === undefined ? [] : Array.isArray(k.funnel) ? k.funnel : [k.funnel];
    while (s.smokeT > 1) {
      s.smokeT -= 1;
      for (const f of funnels) {
        const [x, y] = shipToWorld(s, f * sp.L, 0);
        fx.push({ k: 'smoke', x, y, z0: (Math.max(6, sp.L * 0.12) + Math.max(2.2, sp.B * 0.34)) * SCALE, vx: s.vx * 0.6, vy: s.vy * 0.6, r: (2.5 + s.wid * 0.12) * steamK, grow: 4 + s.throttle * 3, life: rnd(3.6, 2.2), age: 0, a: Math.min(0.8, (0.2 + Math.max(0, s.throttle) * 0.2) * steamK), tone: 5, air: true });
      }
    }
  }
  /* sillage */
  const v = Math.hypot(s.vx, s.vy);
  const last = s.trail[s.trail.length - 1];
  const [tx, ty] = shipToWorld(s, -sp.L * 0.47, 0);
  if (!last || W.t - last.t > 0.12) {
    s.trail.push({ x: tx, y: ty, t: W.t, v: clamp(v / 200, 0, 1) });
    if (s.trail.length > 40) s.trail.shift();
  } else { last.x = tx; last.y = ty; }
  if (G.field && G.field.wrap && last && Math.abs(last.x - tx) + Math.abs(last.y - ty) > 200) s.trail = [];
  if (v > 40) {
    s.foamT = (s.foamT || 0) + dt * v / 30;
    while (s.foamT > 1) {
      s.foamT -= 1;
      for (const side of [-1, 1]) {
        const [x, y] = shipToWorld(s, sp.L * 0.32, side * sp.B * 0.62);
        fx.push({ k: 'foam', x, y, vx: -Math.sin(s.h) * side * v * 0.18, vy: Math.cos(s.h) * side * v * 0.18, drag: 1.2, r: 1.2, grow: 2.5, life: rnd(1.6, 1), age: 0, a: clamp(v / 250, 0.25, 0.8) });
      }
    }
  }
}

/* ---------- effets ---------- */

const fx = {
  push(p) { if (G.parts.length < 1500) G.parts.push(p); },
  muzzle(x, y, ox, oy) {
    for (let i = 0; i < 5; i++) {
      const sp = rnd(60, 15);
      fx.push({ k: 'smoke', x: x + ox * i * 3, y: y + oy * i * 3, vx: ox * sp + rndSym(10), vy: oy * sp + rndSym(10), drag: 2.4, r: rnd(4.5, 2.5), grow: rnd(8, 4), life: rnd(1.7, 1), age: 0, a: 0.3, tone: 2, air: true });
    }
    fx.push({ k: 'flash', x: x + ox * 4, y: y + oy * 4, vx: 0, vy: 0, r: 6, grow: 40, life: 0.12, age: 0, a: 1 });
  },
  splash(x, y, s) {
    fx.push({ k: 'column', x, y, vx: 0, vy: 0, r: 3.5 * s, grow: 0, life: 0.9 * Math.sqrt(s) + 0.3, age: 0, a: 0.95, h: 12 * s });
    for (let i = 0; i < 4; i++) fx.push({ k: 'foam', x: x + rndSym(3), y: y + rndSym(3), vx: rndSym(12), vy: rndSym(12), drag: 2, r: 2.5 * s, grow: 6, life: rnd(1.5, 0.8), age: 0, a: 0.6 });
  },
  splinters(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = rnd(TAU), sp = rnd(160, 40);
      fx.push({ k: 'chip', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 3, r: rnd(3.5, 1.5), grow: 0, life: rnd(0.9, 0.4), age: 0, a: 1, col: col || '#8a6a44' });
    }
  },
  hit(x, y) {
    fx.splinters(x, y, 8, '#c8b088');
    for (let i = 0; i < 3; i++) fx.push({ k: 'smoke', x: x + rndSym(4), y: y + rndSym(4), vx: rndSym(20), vy: rndSym(20), r: rnd(6, 3), grow: 10, life: rnd(1.4, 0.7), age: 0, a: 0.45, tone: 2, air: true });
    fx.push({ k: 'flash', x, y, vx: 0, vy: 0, r: 4, grow: 50, life: 0.14, age: 0, a: 1 });
  },
  explosion(x, y, s) {
    G.flashAt = [x, y, 700 * s];
    for (let i = 0; i < 26; i++) {
      const a = rnd(TAU), sp = rnd(160, 30) * s;
      fx.push({ k: 'smoke', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 2.2, r: rnd(12, 5) * s, grow: 16 * s, life: rnd(3, 1.4), age: 0, a: 0.6, tone: i % 3 ? 0 : 2, air: true });
    }
    for (let i = 0; i < 8; i++) {
      const a = rnd(TAU), sp = rnd(120, 30) * s;
      fx.push({ k: 'fire', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 3, r: rnd(8, 4) * s, grow: 6, life: rnd(0.8, 0.4), age: 0, a: 1 });
    }
    fx.splinters(x, y, 18, '#7a5a38');
    fx.push({ k: 'flash', x, y, vx: 0, vy: 0, r: 14 * s, grow: 220 * s, life: 0.3, age: 0, a: 1 });
    fx.splash(x, y, 1.6 * s);
  },
  flames(x, y) {
    fx.push({ k: 'fire', x: x + rndSym(5), y: y + rndSym(5), vx: rndSym(8), vy: rndSym(8), drag: 1, r: rnd(6, 3), grow: 3, life: rnd(0.6, 0.3), age: 0, a: 0.9 });
    if (Math.random() < 0.5) fx.push({ k: 'smoke', x, y, vx: 0, vy: 0, r: rnd(5, 3), grow: 9, life: rnd(2.4, 1.4), age: 0, a: 0.4, tone: 0, air: true });
  },
};

function updateParts(dt) {
  const [wx, wy] = W.wind;
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.age += dt;
    if (p.age >= p.life) { G.parts.splice(i, 1); continue; }
    if (p.air) {
      const k = clamp(dt * 0.9, 0, 1);
      p.vx = lerp(p.vx, wx, k); p.vy = lerp(p.vy, wy, k);
    } else if (p.drag) { p.vx *= Math.exp(-dt * p.drag); p.vy *= Math.exp(-dt * p.drag); }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.r += p.grow * dt;
  }
}
