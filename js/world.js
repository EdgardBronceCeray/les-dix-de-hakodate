'use strict';

/* Ce que les deux modes partagent : la mer et le temps, la terre et ses
 * collisions, les objets qui flottent, les navires ennemis, le tir, la caméra. */

const SEA = { wind: 292, sea: 2, snow: false, rain: false, season: 'hiver', light: 1 };

function setSea(w, ambiance) {
  Object.assign(SEA, { wind: 292, sea: 2, snow: false, rain: false, season: 'hiver', light: 1 }, w);
  const a = fromBearing(SEA.wind + 180);
  const sp = 18 + SEA.sea * 8;
  W.wind = [Math.cos(a) * sp, Math.sin(a) * sp];
  if (R3.ready) setAmbiance(ambiance || (SEA.season === 'hiver' ? 'hiver' : SEA.season), SEA.light < 0.85 ? { sunI: (AMBIANCE[ambiance || SEA.season] || AMBIANCE.hiver).sunI * SEA.light, exposure: 0.95 } : null);
  HUD.precip = [];
}

/* ---------- la terre ---------- */

function landAt(polys, x, y) {
  for (const p of polys) {
    if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1) continue;
    if (inPoly(x, y, p.f)) return true;
  }
  return false;
}

function polyFrom(flat) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < flat.length; i += 2) { x0 = Math.min(x0, flat[i]); x1 = Math.max(x1, flat[i]); y0 = Math.min(y0, flat[i + 1]); y1 = Math.max(y1, flat[i + 1]); }
  return { f: flat, x0, y0, x1, y1 };
}

/* installe un monde : polygones, écueils, noms ; construit le relief et le masque de la mer */
function setWorld(o) {
  clear3D();
  G.world = { polys: o.polys || [], rocks: o.rocks || [], w: o.w, h: o.h, labels: o.labels || [], edge: o.edge || 0 };
  /* sans terre (la pleine mer du cyclone), rien ne borne la mer : ni bord ni rebond */
  G.field = { w: o.w, h: o.h, wrap: false, open: !G.world.polys.length };
  G.mapLand = G.world.polys.length ? (x, y) => landAt(G.world.polys, x, y) : () => false;
  if (o.id && G.worldId === o.id && R3.terrain) return;
  /* les reliefs déjà bâtis restent en mémoire : revenir à une carte est immédiat */
  R3.terrains = R3.terrains || {};
  if (R3.terrain) R3.scene.remove(R3.terrain);
  G.worldId = o.id || null;
  let T = o.id ? R3.terrains[o.id] : null;
  if (!T && G.world.polys.length) {
    T = buildTerrain(G.world.polys, { clip: o.clip ? [0, 0, o.w, o.h] : null, cell: o.cell || 7, season: o.palette || SEA.season, labels: G.world.labels, rocks: G.world.rocks, hScale: o.hScale || 1, seed: o.seed || 1, maxTrees: o.maxTrees || 5000, treeRandom: o.treeRandom, maxBoulders: o.maxBoulders, beforeTowns: o.beforeTowns });
    for (const extra of o.extras || []) T.add(extra);
    if (o.id) R3.terrains[o.id] = T;
  }
  R3.terrain = T || null;
  if (T) { R3.scene.add(T); setWaterLand(T.userData.mask); cloudPatchObj(T); } else setWaterLand(null);
}

/* un point d'eau libre dans un disque, en coordonnées du monde */
function freeWater(x0, y0, r, clear) {
  for (let t = 0; t < 60; t++) {
    const a = rnd(TAU), d = Math.sqrt(Math.random()) * r;
    const x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d;
    if (x < 60 || y < 60 || x > G.field.w - 60 || y > G.field.h - 60) continue;
    if (nearLand(x, y, clear)) continue;
    return [x, y];
  }
  return null;
}

function nearLand(x, y, r) {
  if (G.mapLand(x, y)) return true;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    if (G.mapLand(x + Math.cos(a) * r, y + Math.sin(a) * r)) return true;
  }
  return false;
}

/* ---------- déplacement avec la côte ---------- */

/* on ne traverse ni la terre ni les écueils ; on glisse le long du rivage */
function moveOnMap(s, dt) {
  if (!s.safe) s.safe = [s.x, s.y, s.h];
  stepShip(s, dt);
  if (s.sinking) return;
  /* les autres navires restent sur la carte ; le joueur, lui, peut s'en écarter : la brume l'attend */
  const e = s === G.me && G.game !== 'demo' ? -(mistCfg().band + 120) : (G.world.edge || 8);
  s.x = clamp(s.x, e, G.field.w - e);
  s.y = clamp(s.y, e, G.field.h - e);
  const hit = landHit(s);
  if (!hit) { s.safe[0] = s.x; s.safe[1] = s.y; s.safe[2] = s.h; s.stuckT = 0; return; }
  /* coincé depuis un moment malgré la machine : on le dégage vers l'eau libre */
  s.stuckT = (s.stuckT || 0) + dt;
  if (s.stuckT > 1.5 && Math.abs(s.throttle) > 0.05) {
    let best = null, bd = -1;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      let free = 0;
      for (let r = 20; r <= 160; r += 20) { if (G.mapLand(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r)) break; free = r; }
      if (free > bd) { bd = free; best = a; }
    }
    const ox = s.x, oy = s.y;
    /* un pas vers l'eau libre ; si une épave ou une roche gêne encore, on essaie de biais */
    for (const step of [4, 8, 14]) {
      for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
        s.x = ox + Math.cos(best + da) * step; s.y = oy + Math.sin(best + da) * step;
        if (!landHit(s)) { s.safe[0] = s.x; s.safe[1] = s.y; s.safe[2] = s.h; return; }
      }
    }
    s.x = ox; s.y = oy;
    /* toujours pris (entre une épave et la côte) : la coque racle et glisse quand même vers le large */
    if (s.stuckT > 3.5 && !G.mapLand(ox + Math.cos(best) * 8, oy + Math.sin(best) * 8)) {
      s.x = ox + Math.cos(best) * 3; s.y = oy + Math.sin(best) * 3;
      s.safe[0] = s.x; s.safe[1] = s.y; s.safe[2] = s.h;
      return;
    }
    /* en corsaire : engagé dans une crique trop étroite pour sa coque, on le déhale au large */
    if (s.stuckT > 4 && G.game === 'arcade' && G.cors && G.arc && G.arc.variant === 'corsaire' && corsUnbeach(s)) return;
  }
  const [hx, hy, nx, ny] = hit;
  const th = s.h;
  s.x = s.safe[0]; s.y = s.safe[1];
  if (landHit(s)) {
    let freed = false;
    for (const [mx, my] of [[nx, ny], [-Math.cos(th), -Math.sin(th)], [Math.cos(th), Math.sin(th)]]) {
      s.x = s.safe[0] + mx * 2.5; s.y = s.safe[1] + my * 2.5;
      if (!landHit(s)) { freed = true; break; }
    }
    if (!freed) { s.x = s.safe[0]; s.y = s.safe[1]; s.h = s.safe[2]; }
  }
  const px = s.x, py = s.y;
  s.x += nx * 1.5; s.y += ny * 1.5;
  if (landHit(s)) { s.x = px; s.y = py; }
  s.safe[0] = s.x; s.safe[1] = s.y; s.safe[2] = s.h;
  if (s.h !== th) s.w = 0;
  const head = Math.cos(s.h) * -nx + Math.sin(s.h) * -ny;
  const impact = Math.max(0, s.v * head), v0 = s.v;
  if (head > 0.55) { s.v = 0; if (impact > 60 && s.throttle > 0) s.throttle = 0; }
  else s.v *= 0.85;
  /* l'erre ne pousse plus vers la terre */
  if (s.mx !== undefined) { const into = -(s.mx * nx + s.my * ny); if (into > 0) { s.mx += nx * into; s.my += ny * into; } }
  s.dx = 0; s.dy = 0;
  /* en corsaire, le navire que l'on mène : l'échouage dépend de l'allure (voir corsAground) */
  if (s === G.me && G.game === 'arcade' && G.cors && G.arc && G.arc.variant === 'corsaire') { corsAground(s, v0, hx, hy, null, head); return; }
  if (impact > 90) {
    fx.splinters(hx, hy, 6, '#c8b088');
    fx.splash(hx, hy, 0.7);
    if (s === G.me && s.inv <= 0) {
      const d = (impact - 60) / 10;
      damageShip(s, d);
      s.inv = 0.6;
      Snd.thud(impact / 250);
      G.shake = Math.min(1.2, (G.shake || 0) + impact / 300);
      floatText(s.x, s.y, T('w.aground', Math.round(d)), 'bad');
    }
  }
}

function landHit(s) {
  const c = Math.cos(s.h), n = Math.sin(s.h);
  const pts = [[0.5, 0], [0.32, 0.5], [0.32, -0.5], [-0.1, 0.55], [-0.1, -0.55], [-0.48, 0.3], [-0.48, -0.3]];
  for (const [fx_, fy] of pts) {
    const bx = fx_ * s.len, by = fy * s.wid;
    const x = s.x + bx * c - by * n, y = s.y + bx * n + by * c;
    if (G.mapLand(x, y)) {
      let nx = 0, ny = 0;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        if (G.mapLand(x + Math.cos(a) * 12, y + Math.sin(a) * 12)) { nx -= Math.cos(a); ny -= Math.sin(a); }
      }
      let l = Math.hypot(nx, ny);
      if (l < 0.01) { nx = s.x - x; ny = s.y - y; l = Math.hypot(nx, ny) || 1; }
      return [x, y, nx / l, ny / l];
    }
  }
  const away = (x, y) => { const l = Math.hypot(s.x - x, s.y - y) || 1; return [x, y, (s.x - x) / l, (s.y - y) / l]; };
  for (const r of G.world.rocks) {
    if (Math.abs(r.x - s.x) > s.len || Math.abs(r.y - s.y) > s.len) continue;
    if (hitsShip(s, r.x, r.y, r.r * 0.45)) return away(r.x, r.y);
  }
  for (const w of G.wrecks || []) {
    const c2 = Math.cos(w.h), n2 = Math.sin(w.h);
    for (const f of [-0.3, 0, 0.3]) {
      const x = w.x + c2 * f * w.w.L * SCALE, y = w.y + n2 * f * w.w.L * SCALE;
      if (hitsShip(s, x, y, w.w.B * SCALE * 0.55)) return away(x, y);
    }
  }
  return null;
}

/* les navires ne passent pas l'un à travers l'autre */
function shipContacts() {
  const L = G.ships;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j];
    if (a.sinking || b.sinking) continue;
    if (Math.abs(a.x - b.x) > (a.len + b.len) / 2 || Math.abs(a.y - b.y) > (a.len + b.len) / 2) continue;
    for (const [ax, ay, ar] of hullCircles(a)) for (const [bx, by, br] of hullCircles(b)) {
      const d = Math.hypot(bx - ax, by - ay);
      if (d >= ar + br || d < 0.01) continue;
      const push = (ar + br - d) / 2, nx = (bx - ax) / d, ny = (by - ay) / d;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      for (const q of [a, b]) if (q.safe && landHit(q)) { q.x = q.safe[0]; q.y = q.safe[1]; q.h = q.safe[2]; }
      const rel = Math.hypot(a.vx - b.vx, a.vy - b.vy);
      if (rel > 160 && (a === G.me || b === G.me) && G.me.inv <= 0) {
        damageShip(G.me, (rel - 100) / 10);
        G.me.inv = 0.6;
        Snd.thud(rel / 300);
        G.shake = Math.min(1.2, (G.shake || 0) + 0.5);
        fx.splinters((ax + bx) / 2, (ay + by) / 2, 10);
      }
    }
  }
}

/* ---------- le joueur ---------- */

function playerControl(dt, canFire) {
  const me = G.me;
  if (me.sinking) { steerShip(me, dt, false, false, false, false); return false; }
  steerShip(me, dt, held('ArrowUp', 'z', 'w'), held('ArrowDown', 's'), held('ArrowLeft', 'q', 'a'), held('ArrowRight', 'd'));
  helmStep(me, dt);
  if (me.sinking) return false;
  if (canFire && held('space') && me.cool <= 0) {
    /* pièces de chasse, plus la bordée du côté de l'ennemi qui est par le travers
     * (le corsaire : les pièces que le chantier lui a données) */
    const side = abeamSide(me);
    const lvl = me.up.canons, broad = me.spec.custom ? me.spec.broad : 2 + (lvl >= 2 ? 1 : 0) + (lvl >= 4 ? 1 : 0) + (lvl >= 6 ? 1 : 0) + (lvl >= 8 ? 1 : 0);
    if (side && broad) { fireShip(me, { broad, side }); me.cool = 1.5 * coolUp(lvl) * 1.05 * (me.spec.coolK || 1); }
    else fireShip(me);
    return true;
  }
  return false;
}

/* ---------- la barre du corsaire ----------
 * Un voilier gîte dans les virages. Virer court à pleine allure le couche peu à peu (une seconde
 * et demie pour prendre sa gîte), et s'il reste couché à fond plus d'un instant, il chavire : tant
 * que sa coque n'est pas assez forte (le brick, au chantier), la conduite agressive le perd. Les
 * roues à aubes le tiennent droit. La tenue (stab) : au-dessus de 1, un virage serré tenu à pleine
 * allure finit par le coucher ; en dessous, jamais. Pour l'instant, seul le mode corsaire y est
 * soumis (HELM.arcade l'étendrait à l'arcade : la moitié des crans de coque, et le Kaiten à roues
 * épargné) ; ni le mode histoire ni les navires de l'ordinateur ne le sont. */
const HELM = { arcade: false, rise: 1.5, fall: 0.7, hold: 0.7 };
function helmStab(s) {
  if (G.game !== 'arcade' || s !== G.me || !G.arc) return 0;
  if (s.spec.custom) return s.spec.stab || 0;
  if (!HELM.arcade || s.spec.prop === 'paddle') return 0;
  return (1.55 - 0.15 * s.up.coque) * (1 + 0.015 * s.up.voilure);
}
function helmStep(s, dt) {
  const S = helmStab(s);
  if (!S) { s.gite = Math.max(0, (s.gite || 0) - dt); s.giteHold = 0; return; }
  /* la part du virage tenu, et celle de l'allure (sans compter un calmar ou une soute vide) */
  const ms = s.spec.speed * PACE.speed * (1 + PACE.perUp * upEff(s.up.voilure));
  const u = clamp(Math.abs(s.w) / (turnRate(s) || 1), 0, 1.2) * Math.pow(clamp(Math.abs(s.v) / (ms || 1), 0, 1.2), 1.5);
  const want = u * S, g = s.gite || 0;
  /* la gîte se prend en une seconde et demie environ, et se perd plus vite quand on lâche la barre */
  s.gite = g + (want - g) * (1 - Math.exp(-dt / (want > g ? HELM.rise : HELM.fall)));
  if (s.gite > 0.55) { s.creakT = (s.creakT || 0) - dt; if (s.creakT <= 0) { s.creakT = 0.75 - 0.4 * clamp(s.gite, 0, 1); Snd.creak(s.gite); } }
  if (s.gite > 0.78 && !s.giteSaid) { s.giteSaid = true; G.shake = Math.min(0.6, (G.shake || 0) + 0.2); }
  if (s.gite < 0.4) s.giteSaid = false;
  /* la première fois de la traversée, on dit ce que veut dire la jauge */
  if (s.gite > 0.5 && G.cors && G.arc.variant === 'corsaire' && !G.cors.tips.gite) { G.cors.tips.gite = true; showHint(T('helm.tip')); }
  /* couché à fond, il a encore un instant pour se relever si l'on lâche la barre ; au-delà, il chavire */
  if (s.gite >= 1) {
    s.giteHold = (s.giteHold || 0) + dt;
    s.giteNear = true;
    if (s.giteHold >= HELM.hold) capsize(s);
  } else {
    s.giteHold = Math.max(0, (s.giteHold || 0) - 2 * dt);
    if (s.giteNear && s.gite < 0.6) { s.giteNear = false; floatText(s.x, s.y - 30, T('helm.saved'), 'gold'); Snd.creak(0.3); }
  }
}
/* le navire se couche, les vergues touchent l'eau, et il chavire */
function capsize(s) {
  if (s.sinking) return;
  s.capsized = true;
  s.capSide = (s.heel || 0) < 0 ? -1 : 1;
  s.capT = 0;
  s.hull = 0;
  /* il sombre sans exploser : il se couche, puis s'enfonce */
  s.sinking = 0.01;
  Snd.sink();
  fx.splash(s.x, s.y, s.len / 40);
  banner(T('helm.cap'), T('helm.cap2'), 3);
  Snd.crack(); Snd.creak(1);
  G.shake = Math.min(1.2, (G.shake || 0) + 0.8);
}

function abeamSide(me) {
  /* une bête agrippée au flanc, ou Akkorokamui par le travers : la bordée est pour elle */
  const bs = beastAbeam(me);
  if (bs) return bs;
  let best = 0, bd = 440;
  for (const s of G.ships) {
    if (s === me || s.sinking || s.faction === me.faction) continue;
    const d = dist(s.x, s.y, me.x, me.y);
    if (d > bd) continue;
    const rel = wrapA(Math.atan2(s.y - me.y, s.x - me.x) - me.h);
    if (Math.abs(Math.abs(rel) - Math.PI / 2) < 0.55) { best = rel > 0 ? 1 : -1; bd = d; }
  }
  /* le corsaire : la batterie d'un port ennemi par le travers reçoit aussi la bordée */
  if (!best && me.spec.custom && G.cors) best = corsBatteryAbeam(me);
  return best;
}

/* ---------- les navires ennemis ---------- */

/* s.ai : { anchored, weigh, route, wp, fireT, side, wakeT, home, leash }
 * hostile(s) dit si le navire cherche le combat ; mayFire(s) s'il peut tirer */
function aiStep(s, dt, hostile, mayFire) {
  /* sa cible : votre navire, ou (corsaire) le navire de votre flotte qu'il a choisi */
  const A = s.ai, me = A.target || G.me;
  if (s.sinking) { steerShip(s, dt, false, false, false, false); return; }
  const d = dist(s.x, s.y, me.x, me.y);
  const toMe = Math.atan2(me.y - s.y, me.x - s.x);
  const armed = (s.spec.chase || 0) + (s.spec.broad || 0) > 0;
  let wantH = s.h, thr = 0;
  if (A.anchored && !A.weigh) {
    thr = 0; s.v *= 0.9;
  } else {
    const range = A.sight || 720;
    if (A.wakeT > 0) { A.wakeT -= dt; thr = 0.2; }
    else if (hostile && armed && d < range && !(A.home && dist(s.x, s.y, A.home[0], A.home[1]) > (A.leash || 1e9))) {
      if (!A.side) A.side = wrapA(toMe - s.h) > 0 ? 1 : -1;
      if (s.spec.armor) wantH = toMe;
      else if (d > 360) wantH = toMe - A.side * 0.35;
      else if (d < 170) wantH = toMe - A.side * (Math.PI / 2 + 0.6);
      else wantH = toMe - A.side * Math.PI / 2;
      thr = d > 360 ? 0.9 : 0.6;
      /* il garde ses distances (le Kōtetsu qui vise le Takao) */
      if (A.keepOff && d < A.keepOff) { wantH = toMe - A.side * Math.PI / 2; thr = 0.25; }
    } else if (hostile && !armed && d < 400) {
      wantH = toMe + Math.PI; thr = 0.8;
    } else if (A.route && A.route.length) {
      const [tx, ty] = A.route[A.wp % A.route.length];
      if (dist(s.x, s.y, tx, ty) < 90) A.wp++;
      wantH = Math.atan2(ty - s.y, tx - s.x);
      thr = 0.5;
    } else if (A.home) {
      wantH = Math.atan2(A.home[1] - s.y, A.home[0] - s.x); thr = dist(s.x, s.y, A.home[0], A.home[1]) > 120 ? 0.5 : 0;
    } else if (hostile && armed) {
      wantH = toMe; thr = 0.7;
    }
    const look = s.len * 0.6 + Math.max(50, s.v * 1.1);
    const blocked = (a) => {
      const x = s.x + Math.cos(a) * look, y = s.y + Math.sin(a) * look;
      return (!G.field.open && (x < 40 || y < 40 || x > G.field.w - 40 || y > G.field.h - 40)) || nearLand(x, y, s.wid);
    };
    if (thr > 0 && blocked(wantH)) {
      let ok = false;
      for (const off of [0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4]) {
        const side = A.side || 1;
        if (!blocked(wantH + off * side)) { wantH += off * side; ok = true; break; }
      }
      thr *= ok ? 0.7 : 0.15;
      if (!ok) A.side = -(A.side || 1);
    }
  }
  s.throttle = lerp(s.throttle, thr, clamp(dt * 1.5, 0, 1));
  const diff = wrapA(wantH - s.h);
  steerShip(s, dt, false, false, diff < -0.05, diff > 0.05);
  if (!hostile || !armed || !mayFire) return;
  if (s.spec.gatling && d < 270) gatling(s, me.x + me.vx * 0.2, me.y + me.vy * 0.2, dt);
  A.fireT -= dt;
  if (A.fireT > 0 || d > 410) return;
  const rel = wrapA(toMe - s.h);
  const before = G.shots.length;
  if (Math.abs(rel) < 0.32 && (s.spec.chase || 0) > 0) fireShip(s, { broad: 0, dmg: 5, life: 0.74, speed: 520 });
  else if (Math.abs(Math.abs(rel) - Math.PI / 2) < 0.4 && (s.spec.broad || 0) > 0) fireShip(s, { side: rel > 0 ? 1 : -1, sideOnly: true, broad: s.spec.broad + Math.floor((s.up ? s.up.canons : 0) / 3), dmg: 5, life: 0.74, speed: 520 });
  else return;
  for (let i = before; i < G.shots.length; i++) {
    const p = G.shots[i], a = rndSym(0.14), c = Math.cos(a), n = Math.sin(a);
    const vx = p.vx * c - p.vy * n, vy = p.vx * n + p.vy * c;
    p.vx = vx; p.vy = vy;
  }
  A.fireT = rnd(3.2, 2) * (A.slow || 1) * coolUp(s.up ? s.up.canons : 0);
}

/* ---------- le tir ---------- */

/* onShip(s, p) appelé quand un ennemi est touché ; retourne true si le boulet s'arrête */
function shotHits(p, onShip) {
  if (!(p.grace > 0) && G.mapLand(p.x, p.y)) {
    if (p.kind === 'boulet') { fx.splinters(p.x, p.y, 4, '#8f8a7c'); extraPart({ x: p.x, y: p.y, z: 4, size: 8, c: [0.5, 0.48, 0.44], a: 0.5, life: 1, grow: 1.5 }); }
    return true;
  }
  for (const s of G.ships) {
    if (s === p.owner || s.sinking || s.faction === p.owner.faction) continue;
    if (!hitsShip(s, p.x, p.y, p.kind === 'balle' ? 2 : 5)) continue;
    const isMe = s === G.me, ours = isMe || !!s.fleet;
    /* les boulets pleins de 300 livres du Kōtetsu font plus de mal que les autres ; les navires
     * de votre flotte (corsaire) encaissent comme le vôtre */
    const dmg = p.kind === 'balle' ? (ours ? 0.35 : 1) : ours ? (p.owner.heavy ? 9 : 5) * (p.owner.dmgMe || 1) : p.dmg;
    if (damageShip(s, dmg)) {
      fx.hit(p.x, p.y);
      if (p.kind === 'boulet') Snd.hit(isMe ? 0 : dist(s.x, s.y, G.me.x, G.me.y));
      if (isMe) G.shake = Math.min(1, (G.shake || 0) + 0.25);
      else if (onShip) onShip(s, p);
    } else if (s.spec.armor && p.kind === 'boulet') { Snd.clang(dist(s.x, s.y, G.me.x, G.me.y)); fx.splinters(p.x, p.y, 3, '#666'); }
    return true;
  }
  for (let j = G.objs.length - 1; j >= 0; j--) {
    const o = G.objs[j];
    if ((p.x - o.x) ** 2 + (p.y - o.y) ** 2 > (o.r * 0.9) ** 2) continue;
    if (p.owner === G.me) hitObj(j, p);
    return true;
  }
  return false;
}

/* ---------- ce qui flotte : débris, tonneaux, épaves, brûlots, caisses ---------- */

const KIND_BAGS = {};
function pickKind(type, size) {
  const list = type === 'radeau' ? DEBRIS_KINDS.radeau[size] : DEBRIS_KINDS[type];
  if (!list) return null;
  const key = type + (size || '');
  let bag = KIND_BAGS[key];
  if (!bag || !bag.length) bag = KIND_BAGS[key] = list.slice().sort(() => Math.random() - 0.5);
  return bag.pop();
}

function addObj(type, size, x, y, vx, vy) {
  const d = ARC[type];
  const r = type === 'radeau' ? rnd(d.sizes[size][1], d.sizes[size][0]) : rnd(d.r[1], d.r[0]);
  if (vx === undefined) { const a = rnd(TAU), sp = rnd(d.speed[1], d.speed[0]) * (G.game === 'arcade' && G.arc ? 0.8 * (G.arc.speedK || 1) : 0.5); vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
  const o = { type, size, x, y, vx, vy, r, rot: rnd(TAU), spin: rndSym(0.4) * (type === 'epave' ? 0.3 : 1), hp: type === 'radeau' ? d.hp[size] : d.hp || 0, seed: (Math.random() * 1e9) | 0, cargo: false, kind: pickKind(type, size) };
  G.objs.push(o);
  return o;
}

function addCrate(x, y, vx, vy) {
  const c = { x, y, vx: vx !== undefined ? vx : rndSym(10), vy: vy !== undefined ? vy : rndSym(10), rot: rnd(TAU), spin: rndSym(0.5), bob: rnd(TAU), r: 14 };
  G.crates.push(c);
  return c;
}

function addPrise(x, y, kind) {
  if (!kind) {
    const up = G.me ? G.me.up : { voilure: 0, coque: 0, canons: 0 };
    let bag = Object.keys(PRISES).filter((k) => up[k] < MAX_UP);
    if (!bag.length) bag = Object.keys(PRISES);
    kind = bag[(Math.random() * bag.length) | 0];
  }
  const p = { kind, x, y, vx: rndSym(10), vy: rndSym(10), bob: rnd(TAU), r: 16 };
  G.prises.push(p);
  return p;
}

function addScore(n, x, y) {
  G.score += n;
  if (x !== undefined) floatText(x, y, '+' + n, 'gold');
}

function hitObj(j, p) {
  const o = G.objs[j];
  const push = clamp(1400 / o.r, 10, 70) * (o.type === 'epave' ? 0.5 : 1);
  const n = Math.hypot(p.vx, p.vy) || 1;
  o.vx += p.vx / n * push; o.vy += p.vy / n * push;
  o.spin += rndSym(0.8);
  if (o.type === 'epave') { fx.splinters(p.x, p.y, 3, '#555'); Snd.clang(0); return; }
  o.hp--;
  fx.splinters(p.x, p.y, 6, o.type === 'brulot' ? '#d07030' : '#8a6a44');
  if (o.hp > 0) { Snd.hit(0); addScore(5); return; }
  breakObj(j);
}

function breakObj(j) {
  const o = G.objs[j];
  G.objs.splice(j, 1);
  const d = ARC[o.type];
  Snd.crack();
  if (o.type === 'brulot') {
    fx.explosion(o.x, o.y, 0.7);
    G.flashAt = [o.x, o.y, 600];
    addScore(d.score, o.x, o.y);
  } else {
    fx.splinters(o.x, o.y, 10 + (o.r / 4) | 0, '#7a5a38');
    fx.splash(o.x, o.y, o.r / 30);
    addScore(o.type === 'radeau' ? d.score[o.size] : d.score, o.x, o.y);
  }
  if (o.type === 'radeau' && o.size > 1) {
    for (let k = 0; k < 2; k++) {
      const a = rnd(TAU), sp = rnd(70, 35);
      const c = addObj('radeau', o.size - 1, o.x + Math.cos(a) * o.r * 0.4, o.y + Math.sin(a) * o.r * 0.4, o.vx + Math.cos(a) * sp, o.vy + Math.sin(a) * sp);
      if (o.cargo && k === 0) c.cargo = true;
      c.home = o.home;
    }
    return;
  }
  if (o.type === 'amas') {
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * TAU + rnd(0.6);
      const c = addObj('radeau', 1, o.x + Math.cos(a) * 10, o.y + Math.sin(a) * 10, o.vx + Math.cos(a) * 80, o.vy + Math.sin(a) * 80);
      c.kind = { tonneaux: 'tonneau', taru: 'taru', tawara: 'tawara' }[o.kind] || 'tonneau'; c.home = o.home;
    }
    return;
  }
  /* le corsaire : un débris brisé laisse parfois flotter un petit coffre */
  if (G.cors && G.arc && G.arc.variant === 'corsaire') { if (Math.random() < 0.2) corsDropGold(o.x, o.y, 5 + Math.floor(rnd(6)), 1); }
  else if (o.cargo) { addCrate(o.x, o.y); floatText(o.x, o.y, T('w.crate'), 'gold'); }
  else if (Math.random() < 0.12 && priseDropOk()) { const q = addPrise(o.x, o.y); if (G.game === 'arcade') q.life = 30; }
}

/* en arcade, les débris brisés ne lâchent qu'un petit nombre de caisses peintes par niveau,
 * et jamais plus de trois à la fois sur l'eau */
function priseDropOk() {
  if (G.game !== 'arcade' || !G.arc) return true;
  const A = G.arc;
  if ((A.drops || 0) <= 0 || G.prises.filter((p) => !p.lost).length >= 3) return false;
  A.drops--;
  return true;
}

function takePrise(kind, x, y) {
  const me = G.me, P = PRISES[kind];
  Snd.levelUp();
  fx.splash(x, y, 0.8);
  if (me.up[kind] >= MAX_UP) { addScore(150, x, y); return; }
  me.up[kind]++;
  if (kind === 'coque') {
    const nm = Math.round(me.spec.hull * (1 + 0.2 * upEff(me.up.coque)));
    me.hull += nm - me.hullMax + nm * 0.25;
    me.hullMax = nm;
    me.hull = Math.min(me.hull, me.hullMax);
  }
  if (kind === 'voilure') me.sailMax = Math.min(3, me.spec.sailMaxInit + (me.up.voilure >= 2 ? 1 : 0) + (me.up.voilure >= 6 ? 1 : 0));
  addScore(80);
  floatText(x, y, tx(priseText(kind, me.spec, 'label')) + ' ' + me.up[kind] + '/' + MAX_UP + ' : ' + tx(priseText(kind, me.spec, 'note')), 'gold');
  HUD.pulse = kind;
}

/* un choc contre un objet coûte aussi une amélioration : la caisse peinte passe par-dessus bord,
 * et dérive quelques secondes avant de couler. On peut encore la rattraper. */
function loseUpgrade(me, away) {
  if (me.spec.custom) return;
  const kinds = Object.keys(PRISES).filter((k) => me.up[k] > 0);
  if (!kinds.length) return;
  /* on perd d'abord ce qu'on a le plus */
  kinds.sort((a, b) => me.up[b] - me.up[a] || Math.random() - 0.5);
  const kind = me.up[kinds[0]] === me.up[kinds[kinds.length - 1]] ? kinds[(Math.random() * kinds.length) | 0] : kinds[0];
  me.up[kind]--;
  if (kind === 'coque') {
    me.hullMax = Math.round(me.spec.hull * (1 + 0.2 * upEff(me.up.coque)));
    me.hull = Math.min(me.hull, me.hullMax);
  }
  if (kind === 'voilure') me.sailMax = Math.min(3, me.spec.sailMaxInit + (me.up.voilure >= 2 ? 1 : 0) + (me.up.voilure >= 6 ? 1 : 0));
  const a = (away === undefined ? rnd(TAU) : away) + rndSym(0.7);
  const p = addPrise(me.x + Math.cos(a) * me.len * 0.4, me.y + Math.sin(a) * me.len * 0.4, kind);
  p.vx = Math.cos(a) * 160 + me.vx * 0.5; p.vy = Math.sin(a) * 160 + me.vy * 0.5;
  p.life = 7; p.lost = true;
  floatText(me.x, me.y - 20, T(kind === 'voilure' && me.spec.look.noSail ? 'lost.machine' : 'lost.' + kind), 'bad');
  HUD.pulse = kind; HUD.pulseBad = true;
  Snd.thud && Snd.thud(0.3);
}

/* dérive des objets ; sur une carte, ils rebondissent sur la côte */
function driftObjects(dt) {
  const D = W.drift;
  for (const o of G.objs) {
    if (o.homeT !== undefined && o.target) { o.homeT -= dt; if (o.homeT <= 0) o.target = null; }
    if (o.type === 'brulot' && o.target) {
      /* un brûlot se dirige vers le navire le plus proche */
      const a = Math.atan2(o.target.y - o.y, o.target.x - o.x);
      const sp = ARC.brulot.speed[1] * 0.9;
      o.vx = lerp(o.vx, Math.cos(a) * sp, clamp(dt * 0.8, 0, 1));
      o.vy = lerp(o.vy, Math.sin(a) * sp, clamp(dt * 0.8, 0, 1));
    } else if (o.home) {
      const dx = o.home[0] - o.x, dy = o.home[1] - o.y, l = Math.hypot(dx, dy);
      if (l > o.home[2]) { o.vx += dx / l * 20 * dt; o.vy += dy / l * 20 * dt; }
    }
    const nx = o.x + (o.vx + D[0]) * dt, ny = o.y + (o.vy + D[1]) * dt;
    if (G.field.wrap) { o.x = nx; o.y = ny; wrapObj(o, o.r); }
    else if (o.type === 'brulot') { o.x = nx; o.y = ny; if (G.mapLand(nx, ny)) { fx.explosion(nx, ny, 0.5); o.life = 0; } }
    else if (G.mapLand(nx, ny) || (!G.field.open && (nx < 30 || ny < 30 || nx > G.field.w - 30 || ny > G.field.h - 30))) { o.vx = -o.vx * 0.6; o.vy = -o.vy * 0.6; }
    else { o.x = nx; o.y = ny; }
    o.rot += o.spin * dt;
  }
  for (let i = G.crates.length - 1; i >= 0; i--) {
    const c = G.crates[i];
    c.x += (c.vx + D[0]) * dt; c.y += (c.vy + D[1]) * dt;
    c.bob += dt * 2.4; c.rot += c.spin * dt;
    if (G.field.wrap) { wrapObj(c, c.r); continue; }
    if (c.home) { const dx = c.home[0] - c.x, dy = c.home[1] - c.y, l = Math.hypot(dx, dy); if (l > c.home[2]) { c.vx += dx / l * 10 * dt; c.vy += dy / l * 10 * dt; } }
    if (G.mapLand(c.x, c.y) || c.x < 0 || c.y < 0 || c.x > G.field.w || c.y > G.field.h) {
      G.crates.splice(i, 1);
      fx.splinters(c.x, c.y, 8, '#b8894a');
      floatText(c.x, c.y, T('w.broken'), 'bad');
      if (G.onCrateLost) G.onCrateLost(c);
    }
  }
  for (let i = G.prises.length - 1; i >= 0; i--) {
    const p = G.prises[i];
    /* une caisse passée par-dessus bord file d'abord, puis ralentit */
    if (p.lost) { const k = Math.exp(-dt * 1.6); p.vx *= k; p.vy *= k; p.x += p.vx * dt * 0.7; p.y += p.vy * dt * 0.7; }
    p.x += (p.vx * 0.3 + D[0]) * dt; p.y += (p.vy * 0.3 + D[1]) * dt; p.bob += dt * 2.4;
    if (G.field.wrap) wrapObj(p, p.r); else if (G.mapLand(p.x, p.y)) { p.vx = -p.vx; p.vy = -p.vy; }
    if (p.life !== undefined) { p.life -= dt; if (p.life <= 0) { G.prises.splice(i, 1); fx.splash(p.x, p.y, 0.6); } }
  }
}

/* ce que touche le navire : caisses, prises, débris */
function pickups(onCrate, dmgK) {
  const me = G.me;
  for (let i = G.crates.length - 1; i >= 0; i--) {
    const c = G.crates[i];
    if (!hitsShip(me, c.x, c.y, c.r + 6)) continue;
    G.crates.splice(i, 1);
    Snd.crate();
    fx.splash(c.x, c.y, 0.6);
    onCrate(c);
  }
  for (let i = G.prises.length - 1; i >= 0; i--) {
    const p = G.prises[i];
    if (!hitsShip(me, p.x, p.y, p.r + 6)) continue;
    G.prises.splice(i, 1);
    takePrise(p.kind, p.x, p.y);
  }
  for (let j = G.objs.length - 1; j >= 0; j--) {
    const o = G.objs[j];
    if (!hitsShip(me, o.x, o.y, o.r * 0.82)) continue;
    const a = Math.atan2(me.y - o.y, me.x - o.x);
    me.dx += Math.cos(a) * 85; me.dy += Math.sin(a) * 85; me.v *= 0.6;
    o.vx -= Math.cos(a) * 50; o.vy -= Math.sin(a) * 50;
    o.x -= Math.cos(a) * 5; o.y -= Math.sin(a) * 5;
    if (me.inv > 0) continue;
    const d = ARC[o.type];
    const dmg = (o.type === 'radeau' ? d.dmg[o.size] : d.dmg) * (dmgK || 1);
    if (damageShip(me, dmg)) {
      me.inv = 0.5;
      Snd.thud(dmg / 25);
      G.shake = Math.min(1.2, (G.shake || 0) + dmg / 25);
      floatText(me.x, me.y, '-' + Math.round(dmg * armorUp(me.up.coque)), 'bad');
      fx.hit(lerp(me.x, o.x, 0.5), lerp(me.y, o.y, 0.5));
      loseUpgrade(me, a);
    }
    if (o.type === 'brulot' || (o.type === 'radeau' && o.size === 1)) breakObj(j);
  }
}

/* tourbillons (arcade) : ils attirent tout et engloutissent caisses et débris. Pour le navire, c'est
 * un courant qui tourne et qui aspire vers l'œil : pris dans le sens du courant, il le dévie et le
 * lance (son élan dure un peu après la sortie) ; à contre-courant, il le freine et l'aspire ; l'œil
 * aspire, freine, fait tourner le navire et lui ronge la coque. */
function whirlStep(dt) {
  const me = G.me;
  if (!G.whirls.length && !(me && me.surge)) return;
  for (const w of G.whirls) {
    w.rot = (w.rot || 0) + dt * 1.6 * w.dir;
    const reach = w.r * ARC.tourbillon.reach;
    const pull = (o, mass) => {
      const d = dist(o.x, o.y, w.x, w.y);
      if (d > reach || d < 1) return d;
      const a = Math.atan2(w.y - o.y, w.x - o.x) + 0.55 * w.dir;
      const f = (1 - d / reach) * ARC.tourbillon.pull / mass * dt;
      if (o.spec) { o.dx += Math.cos(a) * f; o.dy += Math.sin(a) * f; }
      else { o.vx += Math.cos(a) * f; o.vy += Math.sin(a) * f; }
      return d;
    };
    for (const s of G.ships) {
      if (s.sinking) continue;
      if (s === me) whirlShip(me, w, dt);
      else pull(s, 2);
    }
    for (let i = G.objs.length - 1; i >= 0; i--) {
      const o = G.objs[i];
      if (pull(o, o.type === 'epave' ? 3 : 1.5) < w.r * 0.35 && o.type !== 'epave') { G.objs.splice(i, 1); fx.splash(w.x, w.y, 0.8); }
    }
    for (let i = G.crates.length - 1; i >= 0; i--) {
      if (pull(G.crates[i], 1) < w.r * 0.35) { const c = G.crates.splice(i, 1)[0]; floatText(w.x, w.y, T('w.swallowed'), 'bad'); if (G.onCrateLost) G.onCrateLost(c); }
    }
    for (let i = G.prises.length - 1; i >= 0; i--) if (pull(G.prises[i], 1) < w.r * 0.35) G.prises.splice(i, 1);
  }
  /* l'élan du courant s'éteint peu à peu hors du tourbillon */
  if (me && me.surge) {
    if (!me.inWhirl) {
      if (me.surge > 0.25 && !me.slingSaid) { me.slingSaid = true; floatText(me.x, me.y - 40, T('w.sling'), 'gold'); }
      me.surge = Math.max(0, me.surge - dt * 0.3);
    }
    me.boostK = 1 + me.surge;
    if (me.surge <= 0) { me.surge = 0; me.boostK = 1; }
  }
  if (me) { if (!me.inWhirl) { me.eyeSaid = false; me.eyeT = 0; if (!me.surge) me.slingSaid = false; } me.inWhirl = false; }
}

/* le navire dans un tourbillon : le courant tournant (dans le sens du dessin), l'aspiration vers
 * l'œil, plus forte à contre-courant ; l'élan s'il va dans le sens du courant */
function whirlShip(me, w, dt) {
  const TB = ARC.tourbillon, reach = w.r * TB.reach;
  const d = dist(me.x, me.y, w.x, w.y);
  if (d > reach || d < 0.5) return;
  me.inWhirl = true;
  const ox = (me.x - w.x) / d, oy = (me.y - w.y) / d;
  const tx = -oy * w.dir, ty = ox * w.dir;
  const k = clamp((reach - d) / (reach - w.r), 0, 1);
  const hx = Math.cos(me.h), hy = Math.sin(me.h);
  const c = hx * tx + hy * ty;
  const eye = w.r * TB.eye;
  /* le courant : il tourne surtout dans l'anneau autour du centre (jusqu'à TB.ring rayons), et tombe
   * à rien au centre ; il aspire partout, plus fort à contre-courant, et le centre happe ce qui y entre */
  const vt = TB.spin * (d < w.r ? Math.pow(d / w.r, 0.7) : clamp((TB.ring * w.r - d) / ((TB.ring - 1) * w.r), 0, 1));
  /* l'œil vous tient un moment (TB.hold), puis vous lâche, la coque entamée */
  const held = (me.eyeT || 0) < TB.hold, cr = TB.reachC * w.r;
  const vr = TB.suck * k * (c < 0 ? 1 + 0.8 * -c : 1) + (d < cr ? TB.capture * Math.sqrt(1 - d / cr) * (held ? 1 : 0.15) : 0);
  me.dx += (tx * vt - ox * vr) * 2.2 * dt;
  me.dy += (ty * vt - oy * vr) * 2.2 * dt;
  if (c > 0.2) {
    /* dans le sens du courant : il vous lance */
    const want = TB.surge * k * c;
    if (want > (me.surge || 0)) me.surge = Math.min(want, (me.surge || 0) + dt * 1.5);
    me.v += 40 * k * c * dt;
  } else if (c < -0.2) {
    /* à contre-courant : il vous freine */
    me.v *= Math.exp(-TB.brake * k * -c * dt);
    me.surge = Math.max(0, (me.surge || 0) - dt);
  }
  if (d < eye) {
    /* l'œil : il aspire, freine, fait tourner le navire et ronge la coque */
    const e = 1 - d / eye;
    me.eyeT = (me.eyeT || 0) + dt;
    if (held) { me.v *= Math.exp(-1.8 * dt); me.h = wrapA(me.h + w.dir * 1.3 * e * dt); }
    me.surge = 0;
    if (held && me.inv <= 0) { me.hull -= TB.hurt * dt; me.hitT = 0.1; if (me.hull <= 0) { me.hull = 0; sinkShip(me); } }
    G.shake = Math.min(0.5, (G.shake || 0) + dt * 0.8);
    if (!me.eyeSaid) { me.eyeSaid = true; floatText(me.x, me.y - 40, T('w.eye'), 'bad'); }
  }
}

/* ---------- le bord du monde : la brume ----------
 * Il n'y a plus de mur. En approchant du bord, la brume monte ; au-delà, elle devient
 * épaisse ; si l'on insiste, on s'égare, et l'on ressort de la brume remis sur sa route,
 * le cap vers ce qu'on cherchait, comme un navire qui retrouve la côte au petit jour. */
const MIST = { inside: 320, band: 680 };
/* en mode histoire, les cartes sont petites : la brume ne commence qu'au bord même */
function mistCfg() { return G.game === 'story' ? { inside: 40, band: 460 } : MIST; }

function mistStep(dt) {
  const me = G.me, F = G.field;
  if (!me || F.wrap) { G.mist = 0; G.lost = null; return; }
  /* distance signée au bord : négative dedans, positive dehors */
  const out = Math.max(-me.x, -me.y, me.x - F.w, me.y - F.h);
  G.mistOut = out;
  const L = G.lost;
  if (L) {
    L.t += dt;
    if (L.t < 1.3) G.mist = Math.min(1.25, (G.mist || 0) + dt * 1.2);
    else {
      if (!L.moved) { L.moved = true; relocateFromMist(); }
      G.mist = Math.max(0, 1.25 - (L.t - 1.3) * 0.8);
      if (L.t > 3.2) G.lost = null;
    }
    me.inv = Math.max(me.inv, 0.6);
    return;
  }
  const M = mistCfg();
  const target = clamp((out + M.inside) / (M.inside + M.band), 0, 1);
  G.mist = lerp(G.mist || 0, target, 1 - Math.exp(-dt * 2.5));
  if (out > M.band * 0.92 && !me.sinking && !me.sunk) {
    G.lost = { t: 0, moved: false };
    banner(T('mist.lost'), T('mist.lost2'), 2.6);
    Snd.bell && Snd.bell(1);
  }
}

/* ce que le joueur cherchait : la sortie ouverte, le navire à atteindre, la caisse la plus proche */
function mistGoal() {
  const me = G.me, F = G.field, S = G.st;
  if (G.game === 'story' && S) {
    if (S.exitOpen && S.exit) return [S.exit.x, S.exit.y];
    if (S.targets && S.targets.length) return [S.targets[0][0], S.targets[0][1]];
    if (G.target && !G.target.sunk && G.ships.includes(G.target)) return [G.target.x, G.target.y];
  }
  /* le corsaire : le port à vous le plus proche */
  if (G.cors && G.arc && G.arc.variant === 'corsaire') { const P = corsNearestOurs(me.x, me.y); return [P.hx, P.hy]; }
  let best = null, bd = Infinity;
  for (const c of [...G.crates, ...(G.boats || [])]) { const d = dist(me.x, me.y, c.x, c.y); if (d < bd) { bd = d; best = [c.x, c.y]; } }
  return best || [F.w / 2, F.h / 2];
}

function relocateFromMist() {
  const me = G.me, F = G.field;
  const gp = mistGoal();
  /* on rentre par le point du bord le plus proche, et l'on fait route vers le but */
  const ex = clamp(me.x, 0, F.w), ey = clamp(me.y, 0, F.h);
  let a = Math.atan2(gp[1] - ey, gp[0] - ex);
  const span = Math.min(420, dist(ex, ey, gp[0], gp[1]) * 0.5);
  let p = null;
  for (let k = 0; k < 6 && !p; k++) {
    const d = span + k * 120;
    p = freeWater(ex + Math.cos(a) * d, ey + Math.sin(a) * d, 120 + k * 60, me.len * 0.6 + 20);
  }
  if (!p) p = freeWater(gp[0], gp[1], 600, me.len * 0.6 + 20) || [F.w / 2, F.h / 2];
  me.x = p[0]; me.y = p[1];
  a = Math.atan2(gp[1] - me.y, gp[0] - me.x);
  me.h = a; me.w = 0;
  me.v = Math.max(me.v, maxSpeed(me) * 0.35);
  me.mx = Math.cos(a) * me.v; me.my = Math.sin(a) * me.v; me.dx = 0; me.dy = 0;
  me.safe = [me.x, me.y, me.h];
  me.trail = [];
  if (me.throttle < 0.2) me.throttle = 0.35;
  followCamera(true);
  banner(T('mist.found'), T('mist.found2'), 2.6);
}

/* ---------- caméra ---------- */

/* la vue reste centrée sur le navire ; en mode histoire, elle ne montre pas plus loin que le bord de la carte */
function followCamera(snap, dt) {
  const me = G.me;
  if (G.game !== 'story') { cam.x = me.x; cam.y = me.y; return; }
  /* hors de la carte, la vue suit le navire dans la brume */
  const m = 200 + Math.max(0, (G.mistOut || 0) + 260);
  const fit = (t, size, view) => (size <= view && m <= 200 ? size / 2 : clamp(t, Math.min(size / 2, view / 2 - m), Math.max(size / 2, size - view / 2 + m)));
  cam.x = fit(me.x, G.field.w, cam.vw || cam.w); cam.y = fit(me.y, G.field.h, cam.vh || cam.h);
}

function onScreen(x, y, m) {
  const [px, py] = toScreen(x, y);
  m = m || 20;
  return px > -m && py > -m && px < cam.pw + m && py < cam.ph + m;
}
