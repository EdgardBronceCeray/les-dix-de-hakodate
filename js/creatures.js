'use strict';

/* ---------- les grandes bêtes de la mer ----------
 * De temps en temps, en arcade et en corsaire, à la place d'une partie des débris :
 *  la baleine, qui souffle, fait route, sonde en levant la queue et parfois saute hors de l'eau.
 *    Les pêcheurs du Japon y voyaient Ebisu, le dieu qui pousse le poisson vers les côtes :
 *    on ne la chasse pas, on s'en écarte, et la croiser de près porte bonheur ;
 *  le calmar géant, qui traque le navire sous l'eau et bondit sur lui : on lui échappe en gardant
 *    de l'erre et en virant quand il bondit ; s'il saisit le navire, il le ralentit, fait passer une
 *    caisse par-dessus bord et ronge la coque, jusqu'à ce qu'on le chasse au canon. Il revient ;
 *  Akkorokamui, la pieuvre rouge géante de la baie d'Uchiura dans les récits aïnous, si grande
 *    que la mer et le ciel rougissent autour d'elle. Rare, et redoutable.
 * Les modèles sont en mètres, mis à l'échelle des navires (SCALE), un peu grandis (k) : ce sont
 * des bêtes de légende. */

let BEAST_SEQ = 1;
const BEAST = {
  baleine: { L: 30, k: 1.7, life: 120, bump: 14 },
  /* hp : sa vie, sur toutes les rencontres ; release : ce qu'il encaisse avant de lâcher prise ;
   * hunt : la durée d'une chasse ; lungeD : la distance d'où il bondit */
  calmar: { k: 1.5, hp: 30, release: 8, hold: 10, bite: 4, grab: 6, hunt: 22, lungeD: 210, windup: 0.75, lunge: 1.0, recover: 2.2, cool: 2.5 },
  akkoro: { k: 1.15, hp: 36, life: 80, dmg: 7 },
};
/* la longueur de la baleine dans le monde */
const whaleLen = () => BEAST.baleine.L * SCALE * BEAST.baleine.k;

/* ---------- les modèles ---------- */

const beastMat = (key, make) => m3('beast:' + key, make);

/* un bras : une chaîne de segments effilés le long de +x, chacun articulé au bout du précédent.
 * On le plie en tournant chaque segment autour de z (vers le haut ou le bas) et de y (de côté). */
function buildArm(len, r0, r1, n, mat, suck, club) {
  const root = new THREE.Group();
  const segs = [];
  const l = len / n;
  let parent = root;
  for (let i = 0; i < n; i++) {
    const a = r0 + (r1 - r0) * (i / n), b = r0 + (r1 - r0) * ((i + 1) / n);
    const g = new THREE.Group();
    if (i > 0) g.position.x = l;
    const geo = new THREE.CylinderGeometry(b, a, l * 1.08, 8, 1);
    geo.rotateZ(-Math.PI / 2);
    geo.translate(l / 2, 0, 0);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    g.add(m);
    /* les ventouses, sous le bras */
    if (suck && i % 2 === 1) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(a * 0.36, 6, 4), suck);
      s.scale.set(1, 0.5, 1); s.position.set(l * 0.5, -a * 0.86, 0); g.add(s);
    }
    parent.add(g);
    segs.push(g);
    parent = g;
  }
  /* la massue au bout des deux longs tentacules du calmar */
  if (club) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r1 * 3.4, 8, 6), mat);
    c.scale.set(2.6, 0.8, 1.2); c.position.x = l * 1.05; parent.add(c);
  }
  root.userData.segs = segs;
  return root;
}

/* la pose d'un bras : son départ (élévation au-dessus de l'horizontale, cap), puis une courbure
 * à chaque segment, et une ondulation qui court du pied vers la pointe */
function poseArm(arm, yaw, elev, curl, side, sway, t, ph) {
  arm.rotation.set(0, yaw, elev);
  const segs = arm.userData.segs;
  const n = segs.length;
  for (let k = 1; k < n; k++) {
    /* la pointe s'enroule davantage que le pied */
    segs[k].rotation.z = curl * (0.6 + 1.1 * k / n) + Math.sin(t * 1.8 - k * 0.6 + ph) * sway;
    segs[k].rotation.y = side + Math.cos(t * 1.3 - k * 0.5 + ph) * sway * 0.7;
  }
}

function buildWhale() {
  const B = BEAST.baleine, L = B.L, q = L / 24;
  const g = new THREE.Group();
  const skin = beastMat('whale', () => new THREE.MeshStandardMaterial({ color: 0x3c4752, roughness: 0.34, metalness: 0.04 }));
  const pale = beastMat('whaleBelly', () => new THREE.MeshStandardMaterial({ color: 0xa4abb0, roughness: 0.62 }));
  /* le corps : un profil tourné, de la queue (-x) à la tête (+x) */
  const prof = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, x = (t - 0.5) * L;
    let r;
    if (t < 0.3) r = 0.3 + Math.pow(t / 0.3, 1.6) * 1.8;
    else if (t < 0.8) r = 2.1 + Math.sin((t - 0.3) / 0.5 * Math.PI) * 0.38;
    else r = 2.25 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.8) / 0.2, 2.2))) + 0.05;
    prof.push(new THREE.Vector2(Math.max(0.03, r * q), x));
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), skin);
  body.rotation.z = -Math.PI / 2; body.scale.set(0.8, 1, 1); body.castShadow = true;
  g.add(body);
  /* le ventre clair et ses sillons, qu'on ne voit que lorsqu'elle saute */
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), pale);
  belly.scale.set(L * 0.31, 1.15 * q, 1.75 * q); belly.position.set(L * 0.1, -0.98 * q, 0);
  g.add(belly);
  const groove = beastMat('whaleGroove', () => new THREE.MeshStandardMaterial({ color: 0x6c7378, roughness: 0.7 }));
  for (const z of [-0.9, -0.3, 0.3, 0.9]) {
    const gr = new THREE.Mesh(new THREE.BoxGeometry(L * 0.42, 0.06 * q, 0.07 * q), groove);
    gr.position.set(L * 0.13, -2.06 * q, z * q); g.add(gr);
  }
  /* les longues nageoires pectorales, blanches dessous, la petite dorsale */
  for (const s of [1, -1]) {
    const fin = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), pale);
    fin.scale.set(3.7 * q, 0.22 * q, 0.75 * q);
    fin.position.set(L * 0.12, -1.0 * q, s * 2.7 * q);
    fin.rotation.set(s * 0.4, s * 0.55, -0.25);
    fin.castShadow = true;
    g.add(fin);
  }
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.7 * q, 1.4 * q, 6), skin);
  dorsal.scale.set(1.6, 1, 0.35); dorsal.position.set(-L * 0.2, 1.75 * q, 0); dorsal.rotation.z = 0.5;
  g.add(dorsal);
  const eyeM = beastMat('eye', () => new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2 }));
  for (const s of [1, -1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22 * q, 6, 4), eyeM); eye.position.set(L * 0.35, -0.35 * q, s * 2.0 * q); g.add(eye); }
  /* la queue : les deux lobes sur un pivot, pour battre et pour sortir de l'eau quand elle sonde */
  const tail = new THREE.Group();
  tail.position.set(-L * 0.5 + 0.4 * q, 0, 0);
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.bezierCurveTo(-1.2, 1.2, -2.6, 3.0, -2.2, 3.9); sh.bezierCurveTo(-1.6, 3.3, -0.9, 2.2, -0.6, 0.6);
  sh.bezierCurveTo(-0.9, -0.2, -0.9, -0.2, -0.6, -0.6); sh.bezierCurveTo(-0.9, -2.2, -1.6, -3.3, -2.2, -3.9); sh.bezierCurveTo(-2.6, -3.0, -1.2, -1.2, 0, 0);
  const flG = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false, curveSegments: 8 });
  flG.scale(q, q, q);
  const fl = new THREE.Mesh(flG, skin);
  fl.rotation.x = Math.PI / 2; fl.position.y = 0.1 * q; fl.castShadow = true;
  tail.add(fl);
  g.add(tail);
  g.userData.tail = tail;
  return g;
}

/* un point à la surface d'un ellipsoïde (centre c, demi-axes r), dans la direction d ; et sa normale */
function onEllipsoid(c, r, d) {
  const v = new THREE.Vector3(d[0], d[1], d[2]).normalize();
  const p = new THREE.Vector3(c[0] + v.x * r[0], c[1] + v.y * r[1], c[2] + v.z * r[2]);
  const n = new THREE.Vector3(v.x / r[0], v.y / r[1], v.z / r[2]).normalize();
  return [p, n];
}

function addEyes(g, c, r, dirs, er, slit) {
  const eyeW = beastMat(slit ? 'eyeO' : 'eyeW', () => new THREE.MeshStandardMaterial({ color: slit ? 0xe8c84a : 0xd8dccc, roughness: 0.25, emissive: slit ? 0x3a2a04 : 0x101410 }));
  const eyeB = beastMat('eyeB', () => new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 }));
  for (const d of dirs) {
    const [p, n] = onEllipsoid(c, r, d);
    const e = new THREE.Mesh(new THREE.SphereGeometry(er, 12, 8), eyeW);
    e.position.copy(p); g.add(e);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(er * 0.62, 10, 6), eyeB);
    /* la pupille de la pieuvre est une fente horizontale */
    if (slit) pu.scale.set(1, 0.32, 1);
    pu.position.copy(p).addScaledVector(n, er * 0.55);
    g.add(pu);
  }
}

function buildSquid() {
  const g = new THREE.Group();
  const skin = beastMat('squid', () => new THREE.MeshStandardMaterial({ color: 0x9a3a34, roughness: 0.4 }));
  const under = beastMat('squidU', () => new THREE.MeshStandardMaterial({ color: 0xe6bfae, roughness: 0.55 }));
  /* la tête, et derrière elle le long manteau en torpille, avec ses nageoires en pointe de flèche */
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin);
  head.scale.set(2.8, 2.4, 2.6); head.position.set(-4, 0.6, 0); head.castShadow = true;
  g.add(head);
  const mant = new THREE.Mesh(new THREE.ConeGeometry(2.9, 14, 18), skin);
  mant.rotation.z = Math.PI / 2; mant.position.set(-13, 0.3, 0); mant.castShadow = true;
  g.add(mant);
  {
    const d = new THREE.Shape();
    d.moveTo(0, 0); d.quadraticCurveTo(-1.5, 3.6, -4.2, 4.0); d.quadraticCurveTo(-5.8, 1.6, -6.6, 0);
    d.quadraticCurveTo(-5.8, -1.6, -4.2, -4.0); d.quadraticCurveTo(-1.5, -3.6, 0, 0);
    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(d, { depth: 0.3, bevelEnabled: false, curveSegments: 6 }), skin);
    fin.rotation.x = Math.PI / 2; fin.position.set(-14.2, 0.9, 0); fin.castShadow = true;
    g.add(fin);
  }
  addEyes(g, [-4, 0.6, 0], [2.8, 2.4, 2.6], [[0.25, 0.25, 1], [0.25, 0.25, -1]], 0.85, false);
  /* huit bras autour de la bouche, et deux longs tentacules à massue */
  const arms = [];
  for (let i = 0; i < 10; i++) {
    const longT = i >= 8;
    const rho = longT ? (i === 8 ? Math.PI / 2 : -Math.PI / 2) : (i / 8) * TAU;
    const arm = buildArm(longT ? 20 : 12, longT ? 0.55 : 1.05, longT ? 0.09 : 0.12, longT ? 12 : 9, skin, longT ? null : under, longT);
    arm.position.set(-1.6, 0.6 + Math.cos(rho) * 0.8, Math.sin(rho) * 0.9);
    arm.userData.rho = rho; arm.userData.longT = longT; arm.userData.i = i;
    g.add(arm);
    arms.push(arm);
  }
  g.userData.arms = arms;
  return g;
}

function buildOctopus() {
  const g = new THREE.Group();
  const skin = beastMat('akkoro', () => new THREE.MeshStandardMaterial({ color: 0xb8261a, roughness: 0.4, emissive: 0x2a0402 }));
  const under = beastMat('akkoroU', () => new THREE.MeshStandardMaterial({ color: 0xf0a080, roughness: 0.55 }));
  /* le manteau, en poire, penché vers l'arrière ; sous lui, la tête qui porte les yeux et les bras */
  const mant = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), skin);
  mant.scale.set(9, 11.5, 9); mant.position.set(-4.5, 8.5, 0); mant.rotation.z = 0.38; mant.castShadow = true;
  g.add(mant);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), skin);
  head.scale.set(7.2, 5.2, 7.6); head.position.set(1, 0.8, 0); head.castShadow = true;
  g.add(head);
  addEyes(g, [1, 0.8, 0], [7.2, 5.2, 7.6], [[0.6, 0.55, 0.62], [0.6, 0.55, -0.62]], 1.7, true);
  const arms = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + TAU / 16;
    const arm = buildArm(50, 2.7, 0.28, 14, skin, under, false);
    arm.position.set(1 + Math.cos(a) * 5.2, -0.6, Math.sin(a) * 5.6);
    arm.userData.a = a; arm.userData.i = i;
    g.add(arm);
    arms.push(arm);
  }
  g.userData.arms = arms;
  return g;
}

/* une tache sur l'eau, aux bords fondus : la bête vue à travers la mer, ou la mer qui rougit */
let BEAST_SOFT = null, BEAST_BLOOD = null;
function beastSoftTex() {
  if (!BEAST_SOFT) BEAST_SOFT = canvasTex(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  return BEAST_SOFT;
}
/* le sang de la mer autour d'Akkorokamui : un rouge sombre, en nappes irrégulières */
function beastBloodTex() {
  if (!BEAST_BLOOD) BEAST_BLOOD = canvasTex(256, 256, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / (w - 1) * 2 - 1, v = y / (h - 1) * 2 - 1, r = Math.hypot(u, v);
      const n = vnoise(x * 0.05, y * 0.05) * 0.6 + vnoise(x * 0.14, y * 0.14) * 0.4;
      const a = clamp((1 - smooth(clamp(r / (0.55 + 0.45 * n), 0, 1))) * (0.55 + 0.45 * n), 0, 1);
      const o = (y * w + x) * 4;
      img.data[o] = 112 + n * 46; img.data[o + 1] = 6 + n * 12; img.data[o + 2] = 10; img.data[o + 3] = a * 255;
    }
    c.putImageData(img, 0, 0);
  });
  return BEAST_BLOOD;
}
function beastDisc(rx, ry, col, op, blood) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: blood ? beastBloodTex() : beastSoftTex(), color: col, transparent: true, opacity: op, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.scale.set(rx, ry, 1);
  m.layers.set(1); m.renderOrder = 1;
  return m;
}

/* ---------- l'apparition ---------- */

function beastsReset() {
  G.beasts = []; G.redK = 0;
  G.beastT = { whale: 1e9, squid: 1e9, akkoro: 1e9 };
  if (G.arc && G.arc.variant === 'corsaire') G.beastT = { whale: rnd(70, 35), squid: rnd(150, 90), akkoro: 20 };
}

/* un point d'eau libre, juste hors de vue : dans l'arène qui se referme, ou dans la mer autour */
function beastSpot(minK, maxK) {
  const me = G.me, wrap = G.field.wrap;
  for (let t = 0; t < 60; t++) {
    const a = rnd(TAU), k = rnd(maxK, minK);
    const x = me.x + Math.cos(a) * cam.w * k, y = me.y + Math.sin(a) * (wrap ? cam.h : cam.w) * k;
    if (!wrap && (x < 300 || y < 300 || x > G.field.w - 300 || y > G.field.h - 300)) continue;
    if (!wrap && nearLand(x, y, 220)) continue;
    return [x, y];
  }
  return null;
}

/* Akkorokamui sort de l'eau devant l'étrave */
function akkoroSpot() {
  const me = G.me;
  for (let t = 0; t < 30; t++) {
    const a = me.h + rndSym(0.9 + t * 0.12), d = rnd(400, 320);
    const x = me.x + Math.cos(a) * d, y = me.y + Math.sin(a) * d;
    if (!nearLand(x, y, 150)) return [x, y];
  }
  return null;
}

function spawnBeast(kind, at) {
  const wrap = G.field.wrap;
  const p = at || beastSpot(wrap ? 0.68 : 0.78, wrap ? 0.8 : 1.0);
  if (!p) return null;
  const me = G.me;
  const b = { kind, x: p[0], y: p[1], h: rnd(TAU), v: 0, t: 0, id: BEAST_SEQ++, state: 'swim' };
  if (kind === 'baleine') {
    b.v = rnd(36, 26); b.stateT = rnd(28, 18); b.blowT = rnd(2.5, 0.5); b.life = BEAST.baleine.life;
    b.h = Math.atan2(me.y - b.y, me.x - b.x) + rndSym(0.7);
  } else if (kind === 'calmar') {
    /* il attend sous l'eau, puis prend le navire en chasse ; il revient après chaque chasse */
    b.state = 'lurk'; b.lurkT = 0.1; b.hp = BEAST.calmar.hp; b.hunts = 0; b.lunges = 0;
    b.returns = G.arc && G.arc.variant === 'corsaire' ? 3 : 99;
  } else {
    b.state = 'rise'; b.hp = BEAST.akkoro.hp; b.riseT = 0; b.life = BEAST.akkoro.life; b.slamT = 4; b.slamDur = 4; b.slamFx = 0;
    b.h = Math.atan2(me.y - b.y, me.x - b.x);
    banner(T('bst.akkoro'), T('bst.akkoro2'), 3.6);
    Snd.bell(3); Snd.thunder();
    fx.splash(b.x, b.y, 3.2);
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; fx.push({ k: 'foam', x: b.x + Math.cos(a) * 60, y: b.y + Math.sin(a) * 60, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, drag: 1.2, r: 4, grow: 9, life: 3, age: 0, a: 0.7 }); }
  }
  G.beasts.push(b);
  return b;
}

/* le plan d'un niveau d'arcade classique : parfois une bête, et alors un peu moins de débris */
function beastsLevel(n) {
  if (!G.beasts) beastsReset();
  const T_ = G.beastT;
  let fewer = 0;
  T_.whale = n >= 2 && Math.random() < 0.65 ? rnd(30, 6) : 1e9;
  if (T_.whale < 1e9) fewer += 3;
  /* le calmar d'un niveau ne suit pas au suivant : un autre, peut-être, prendra le relais */
  G.beasts = G.beasts.filter((b) => b.kind !== 'calmar');
  T_.squid = n >= 3 && Math.random() < (n >= 6 ? 0.8 : 0.6) ? rnd(25, 8) : 1e9;
  if (T_.squid < 1e9) fewer += 2;
  T_.akkoro = n >= 6 && (n % 4 === 2 || Math.random() < 0.25) ? rnd(70, 40) : 1e9;
  if (T_.akkoro < 1e9) fewer += 4;
  return fewer;
}

/* ---------- la vie des bêtes ---------- */

function beastsUpdate(dt) {
  if (!G.beasts) return;
  const me = G.me, A = G.arc, corsaire = A && A.variant === 'corsaire';
  const T_ = G.beastT;
  if (T_ && A.state === 'play' && !me.sinking) {
    T_.whale -= dt; T_.squid -= dt; T_.akkoro -= dt;
    const n = (k) => G.beasts.filter((b) => b.kind === k).length;
    if (corsaire) {
      /* en corsaire, la mer se peuple au fil du voyage ; Akkorokamui garde la baie d'Uchiura */
      const safe = corsSafe(me.x, me.y);
      if (T_.whale <= 0) { T_.whale = rnd(150, 80); if (n('baleine') < 2) spawnBeast('baleine'); }
      if (T_.squid <= 0) { T_.squid = rnd(260, 170); if (A.level >= 2 && !safe && !n('calmar') && !n('akkoro')) spawnBeast('calmar', [me.x, me.y]); }
      const U = JAPAN.uchiura;
      if (T_.akkoro <= 0 && !n('akkoro') && dist(me.x, me.y, U[0], U[1]) < U[2] * 1.3) {
        const p = akkoroSpot();
        if (p) { T_.akkoro = 300; spawnBeast('akkoro', p); } else T_.akkoro = 2;
      }
    } else {
      if (T_.whale <= 0) { T_.whale = 1e9; if (!n('baleine')) spawnBeast('baleine'); }
      if (T_.squid <= 0) { T_.squid = 1e9; if (!n('calmar')) spawnBeast('calmar', [me.x, me.y]); }
      if (T_.akkoro <= 0) { T_.akkoro = 1e9; if (!n('akkoro')) spawnBeast('akkoro', beastSpot(0.3, 0.36)); }
    }
  }
  let slow = false, red = 0;
  for (let i = G.beasts.length - 1; i >= 0; i--) {
    const b = G.beasts[i];
    b.t += dt;
    if (b.kind === 'baleine') whaleStep(b, dt);
    else if (b.kind === 'calmar') squidStep(b, dt);
    else {
      akkoroStep(b, dt);
      const d = dist(b.x, b.y, me.x, me.y);
      if (b.state === 'fight' && d < 170 && !me.sinking) slow = true;
      const fade = b.state === 'rise' ? clamp(b.riseT / 3, 0, 1) : b.state === 'fight' ? 1 : 1 - clamp((b.leaveT || 0) / 3.5, 0, 1);
      red = Math.max(red, fade * clamp(1 - (d - 260) / 1100, 0, 1));
    }
    if (b.state === 'hold') slow = true;
    if (G.field.wrap) wrapObj(b, 0);
    else if (b.state !== 'hold' && dist(b.x, b.y, me.x, me.y) > cam.w * 3.2) b.gone = true;
    if (b.gone) G.beasts.splice(i, 1);
  }
  /* pris dans les bras d'une bête : le navire se traîne et prend de la bande */
  me.speedK = slow ? 0.42 : 1;
  if (!G.beasts.some((b) => b.state === 'hold')) me.grip = (me.grip || 0) * Math.exp(-dt * 2);
  G.redK = lerp(G.redK || 0, red, 1 - Math.exp(-dt * 0.9));
}

/* la baleine : trois cercles le long du dos */
function whaleHits(b, s) {
  const c = Math.cos(b.h), n = Math.sin(b.h), L = whaleLen();
  for (const off of [-0.3, 0, 0.3]) if (hitsShip(s, b.x + c * off * L, b.y + n * off * L, L * 0.14)) return true;
  return false;
}

function whaleStep(b, dt) {
  const me = G.me, L = whaleLen();
  b.life -= dt;
  /* elle fait route sans hâte ; devant la côte, elle vire */
  const ahead = (k) => !G.field.wrap && G.mapLand(b.x + Math.cos(b.h + k) * 180, b.y + Math.sin(b.h + k) * 180);
  if (ahead(0)) b.h += (ahead(0.6) ? -1 : 1) * 0.9 * dt;
  else b.h += Math.sin(b.t * 0.13 + b.id) * 0.06 * dt;
  const sp = b.state === 'under' ? b.v * 1.6 : b.state === 'dive' ? b.v * 0.7 : b.state === 'breach' ? b.v * 1.3 : b.v;
  b.x += Math.cos(b.h) * sp * dt; b.y += Math.sin(b.h) * sp * dt;
  const d = dist(b.x, b.y, me.x, me.y);
  if (b.state === 'swim') {
    b.stateT -= dt; b.blowT -= dt;
    if (b.blowT <= 0) { b.blowT = rnd(10, 6); whaleBlow(b); }
    if (b.stateT <= 0 || b.life <= 0) { b.state = 'dive'; b.diveT = 0; }
    if (!me.sinking && d < L && whaleHits(b, me) && me.inv <= 0) {
      /* le choc : on rebondit sur son dos, et elle sonde aussitôt */
      const a = Math.atan2(me.y - b.y, me.x - b.x);
      me.dx += Math.cos(a) * 110; me.dy += Math.sin(a) * 110; me.v *= 0.5;
      if (damageShip(me, BEAST.baleine.bump)) { me.inv = 1; G.shake = Math.min(1.2, (G.shake || 0) + 0.7); Snd.thud(0.9); floatText(me.x, me.y - 20, T('bst.whale.hit'), 'bad'); }
      b.state = 'dive'; b.diveT = 0;
    } else if (!b.lucky && d < L * 3.6 && !me.sinking) {
      /* la croiser de près : Ebisu porte bonheur */
      b.lucky = true;
      addScore(120, b.x, b.y);
      floatText(b.x, b.y - 30, T('bst.whale.luck'), 'gold');
      if (G.cors && G.arc && G.arc.variant === 'corsaire') corsGold(15, b.x, b.y - 54);
    }
    /* l'écume court le long de son dos */
    b.foamT = (b.foamT || 0) + dt * 14;
    while (b.foamT > 1) {
      b.foamT -= 1;
      const u = rndSym(0.42), s = Math.random() < 0.5 ? 1 : -1, w = L * 0.085 * Math.sqrt(Math.max(0.05, 1 - (u / 0.5) ** 2));
      fx.push({ k: 'foam', x: b.x + Math.cos(b.h) * u * L - Math.sin(b.h) * s * w, y: b.y + Math.sin(b.h) * u * L + Math.cos(b.h) * s * w, vx: -Math.sin(b.h) * s * 6, vy: Math.cos(b.h) * s * 6, drag: 1, r: 1.6, grow: 3.5, life: 1.4, age: 0, a: 0.55 });
    }
  } else if (b.state === 'dive') {
    b.diveT += dt;
    /* la queue qui sort de l'eau ruisselle */
    if (b.diveT > 1.1 && b.diveT < 2.8 && Math.random() < dt * 30) {
      const tx = b.x - Math.cos(b.h) * L * 0.52, ty = b.y - Math.sin(b.h) * L * 0.52;
      fx.push({ k: 'spray', x: tx + rndSym(9), y: ty + rndSym(9), z0: rnd(16, 6), vz: rnd(2, -3), vx: 0, vy: 0, drag: 1, r: rnd(1.3, 0.6), grow: 0, life: 1.2, age: 0, a: 0.85 });
    }
    if (b.diveT > 3.4) {
      if (b.life <= 0) { b.gone = true; return; }
      b.state = 'under'; b.underT = rnd(18, 10);
    }
  } else if (b.state === 'under') {
    b.underT -= dt;
    if (b.underT <= 0) {
      /* elle remonte ; près du navire, une fois sur trois, elle saute hors de l'eau */
      if (d < cam.w * 0.75 && Math.random() < 0.38) { b.state = 'breach'; b.brT = 0; b.brOut = b.brIn = false; }
      else { b.state = 'rise'; b.riseT = 0; }
    }
  } else if (b.state === 'rise') {
    b.riseT += dt;
    if (b.riseT > 2) { b.state = 'swim'; b.stateT = rnd(28, 18); b.blowT = 0.3; b.lucky = false; }
  } else if (b.state === 'breach') {
    b.brT += dt;
    const k = b.brT / 3.4;
    if (!b.brOut && k > 0.1) {
      b.brOut = true;
      fx.splash(b.x + Math.cos(b.h) * L * 0.2, b.y + Math.sin(b.h) * L * 0.2, 2.2);
      if (d < cam.w * 0.62) { addScore(200, b.x, b.y); floatText(b.x, b.y - 50, T('bst.whale.breach'), 'gold'); }
    }
    if (!b.brIn && k > 0.64) {
      /* elle retombe : une gerbe énorme */
      b.brIn = true;
      fx.splash(b.x, b.y, 3.4);
      for (let i = 0; i < 34; i++) { const a = rnd(TAU), vz = rnd(34, 20), r = rnd(L * 0.35, 4); fx.push({ k: 'spray', x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r, z0: 2, vz, vx: Math.cos(a) * rnd(40, 10), vy: Math.sin(a) * rnd(40, 10), drag: 0.6, r: rnd(2.4, 1), grow: 0, life: vz / 14 + 0.2, age: 0, a: 0.8 }); }
      for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; fx.push({ k: 'foam', x: b.x + Math.cos(a) * L * 0.3, y: b.y + Math.sin(a) * L * 0.3, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, drag: 1.4, r: 4, grow: 8, life: 2.6, age: 0, a: 0.75 }); }
      Snd.splash(d * 0.3); Snd.thud(Math.min(1, 0.4 + 300 / (d + 1)));
      if (d < 400) G.shake = Math.min(1, (G.shake || 0) + 0.4);
    }
    if (k >= 1) { b.state = 'swim'; b.stateT = rnd(22, 14); b.blowT = 1.2; b.lucky = false; }
  }
}

/* le souffle : une gerbe de vapeur qui monte et part sous le vent */
function whaleBlow(b) {
  const L = whaleLen();
  const x = b.x + Math.cos(b.h) * L * 0.22, y = b.y + Math.sin(b.h) * L * 0.22;
  for (let i = 0; i < 8; i++) fx.push({ k: 'smoke', x: x + rndSym(2), y: y + rndSym(2), z0: 6 + i * 2.6, vx: rndSym(6), vy: rndSym(6), r: 2 + i * 0.45, grow: 3.4, life: rnd(2.8, 1.8), age: 0, a: 0.6, tone: 4, air: true });
  for (let i = 0; i < 14; i++) { const vz = rnd(34, 24); fx.push({ k: 'spray', x, y, z0: 4, vz, vx: rndSym(10), vy: rndSym(10), drag: 0.4, r: rnd(1.6, 0.8), grow: 0, life: vz / 14 + 0.15, age: 0, a: 0.75 }); }
  const d = dist(b.x, b.y, G.me.x, G.me.y);
  if (d < cam.w * 0.8) {
    Snd.splash(d * 0.5);
    if (!b.saidBlow) { b.saidBlow = true; floatText(b.x, b.y - 40, T('bst.whale'), 'gold'); }
  }
}

/* ---------- le calmar géant : il traque, il bondit, il revient ---------- */

/* il nage un peu moins vite que le navire à toute vapeur : on lui échappe en gardant de l'erre,
 * il regagne du terrain dès qu'on ralentit ou qu'on vire pour une caisse */
function squidSpeed() {
  const me = G.me;
  return clamp(me.spec.speed * PACE.speed * (1 + PACE.perUp * upEff(me.up.voilure)) * 0.9, 110, 280);
}
const squidHunting = (b) => b.kind === 'calmar' && (b.state === 'hunt' || b.state === 'windup' || b.state === 'lunge' || b.state === 'recover');

/* il remonte juste hors de vue et prend le navire en chasse */
function squidEmerge(b) {
  const wrap = G.field.wrap, me = G.me, C = BEAST.calmar;
  const p = beastSpot(wrap ? 0.66 : 0.72, wrap ? 0.8 : 0.95);
  if (!p) return false;
  b.x = p[0]; b.y = p[1];
  b.h = Math.atan2(me.y - b.y, me.x - b.x);
  b.v = squidSpeed() * 0.8;
  b.state = 'hunt'; b.hunts++; b.shoreT = 0; b.spook = 0;
  b.huntT = C.hunt + Math.min(8, Math.max(0, ((G.arc && G.arc.level) || 1) - 3));
  if (!b.seen) { b.seen = true; banner(T('bst.squid'), T('bst.squid2'), 3); Snd.bell(2); }
  else { floatText(me.x, me.y - 40, T('bst.squid.back'), 'bad'); Snd.bell(1); }
  return true;
}

/* il saisit le navire : le choc fait passer une caisse par-dessus bord, comme un débris heurté */
function squidGrab(b) {
  const me = G.me, C = BEAST.calmar;
  const rel = wrapA(Math.atan2(b.y - me.y, b.x - me.x) - me.h);
  b.side = rel > 0 ? 1 : -1;
  b.state = 'hold'; b.holdT = C.hold; b.biteT = 0.8; b.age = 0; b.holdDmg = 0;
  Snd.thud(0.9); Snd.crack();
  G.shake = Math.min(1.2, (G.shake || 0) + 0.7);
  fx.splash(b.x, b.y, 1.8);
  floatText(me.x, me.y - 30, T('bst.squid.grab'), 'bad');
  /* en arcade, une caisse peinte passe par-dessus bord ; le corsaire, lui, perd un coffre d'or */
  if (damageShip(me, C.grab)) { if (me.spec.custom) corsSpill(me, me.h - b.side * Math.PI / 2); else loseUpgrade(me, me.h - b.side * Math.PI / 2); }
}

/* il renonce, ou on l'a chassé : il replonge, et reviendra plus tard */
function squidGiveUp(b, why) {
  const me = G.me;
  if (b.state === 'hold') beastInk(b);
  b.state = 'dive'; b.leaveT = 0; b.returns--;
  const say = { escape: 'bst.squid.escape', lost: 'bst.squid.lost', free: 'bst.squid.free', tired: 'bst.squid.gone', hit: 'bst.squid.hit' }[why];
  const pts = { escape: 100, lost: 100, free: 150 }[why];
  if (pts) addScore(pts, me.x, me.y - 20);
  if (say) floatText(why === 'hit' ? b.x : me.x, (why === 'hit' ? b.y : me.y) - 44, T(say), 'gold');
}

/* le sillage d'une bête qui file sous la surface : deux bourrelets d'écume en V */
function squidWake(b, dt) {
  if (dist(b.x, b.y, G.me.x, G.me.y) > cam.w) return;
  const c = Math.cos(b.h), n = Math.sin(b.h), sp = b.v;
  b.wakeT = (b.wakeT || 0) + dt * sp / 11;
  while (b.wakeT > 1) {
    b.wakeT -= 1;
    for (const s2 of [1, -1]) {
      const back = rnd(40, 0);
      fx.push({ k: 'foam', x: b.x - c * back - n * s2 * 13, y: b.y - n * back + c * s2 * 13, vx: -n * s2 * sp * 0.18, vy: c * s2 * sp * 0.18, drag: 1.3, r: 2.4, grow: 5.5, life: rnd(2, 1.2), age: 0, a: b.state === 'lunge' ? 0.85 : 0.65 });
    }
  }
  if (b.state === 'lunge' && Math.random() < dt * 30) {
    const vz = rnd(18, 10);
    fx.push({ k: 'spray', x: b.x + rndSym(10), y: b.y + rndSym(10), z0: 2, vz, vx: c * sp * 0.3, vy: n * sp * 0.3, drag: 0.8, r: rnd(1.6, 0.8), grow: 0, life: vz / 14 + 0.2, age: 0, a: 0.8 });
  }
}

function squidStep(b, dt) {
  const me = G.me, C = BEAST.calmar, A = G.arc;
  const d = dist(b.x, b.y, me.x, me.y);
  const corsaire = A.variant === 'corsaire';
  /* entre deux niveaux, ou le navire perdu : il replonge */
  if ((A.state !== 'play' || me.sinking) && (squidHunting(b) || b.state === 'hold')) { squidGiveUp(b, null); return; }
  if (b.state === 'lurk') {
    b.lurkT -= dt;
    if (b.lurkT <= 0 && A.state === 'play') {
      /* en corsaire, il ne monte pas dans les petits fonds ni à l'abri de Hakodate */
      const ok = !corsaire || (!corsSafe(me.x, me.y) && !nearLand(me.x, me.y, 260));
      if (!ok || !squidEmerge(b)) b.lurkT = 3;
    }
    return;
  }
  if (squidHunting(b)) {
    const sp = squidSpeed();
    /* il vise un peu en avant du navire */
    const lead = clamp(d / Math.max(b.v, 60), 0, 1.2);
    const want = Math.atan2(me.y + me.vy * lead - b.y, me.x + me.vx * lead - b.x);
    const off = wrapA(want - b.h);
    const turn = { hunt: 1.15, windup: 1.8, lunge: 0.22, recover: 0.7 }[b.state];
    b.h = wrapA(b.h + clamp(off, -turn * dt, turn * dt));
    const vT = { hunt: sp, windup: sp * 0.45, lunge: sp * 2.4, recover: sp * 0.5 }[b.state];
    b.v = lerp(b.v, vT, 1 - Math.exp(-dt * (b.state === 'lunge' ? 7 : 2.5)));
    const steps = b.state === 'lunge' ? 3 : 1;
    for (let k = 0; k < steps; k++) {
      const nx = b.x + Math.cos(b.h) * b.v * dt / steps, ny = b.y + Math.sin(b.h) * b.v * dt / steps;
      /* il ne monte pas dans les petits fonds : longer la côte le fait renoncer */
      if (!G.field.wrap && nearLand(nx, ny, 130)) { b.shoreT += dt / steps; break; }
      b.x = nx; b.y = ny;
      if (b.state === 'lunge' && !me.sinking && hitsShip(me, b.x, b.y, 16)) { squidGrab(b); return; }
    }
    squidWake(b, dt);
    if (b.state === 'hunt') {
      b.huntT -= dt; b.cool = (b.cool || 0) - dt;
      if (b.huntT <= 0) { squidGiveUp(b, 'escape'); return; }
      if (corsaire && (corsSafe(me.x, me.y) || d > cam.w * 1.5 || b.shoreT > 5)) { squidGiveUp(b, 'lost'); return; }
      if (d < C.lungeD && d > 110 && b.cool <= 0 && Math.abs(off) < 0.4) {
        /* il se ramasse avant de bondir : c'est le moment de virer */
        b.state = 'windup'; b.phT = C.windup; b.lunges++;
        if (b.lunges <= 3) floatText(b.x, b.y - 30, T('bst.squid.lunge'), 'bad');
        Snd.tone(70, 0.6, 'sine', 0.3 * Snd.far(d), 150); Snd.hiss(0.6, 'lowpass', 400, 0.8, 0.25 * Snd.far(d), 900);
      }
    } else if (b.state === 'windup') {
      b.phT -= dt;
      if (Math.random() < dt * 30) fx.push({ k: 'foam', x: b.x + rndSym(26), y: b.y + rndSym(26), vx: rndSym(20), vy: rndSym(20), drag: 1.5, r: 2.2, grow: 7, life: 1.2, age: 0, a: 0.75 });
      if (b.phT <= 0) {
        /* il bondit droit sur le navire, là où il est : en virant, on le laisse passer */
        b.h = Math.atan2(me.y - b.y, me.x - b.x);
        b.state = 'lunge'; b.phT = C.lunge; b.minD = d; Snd.hiss(0.7, 'bandpass', 600, 0.6, 0.3 * Snd.far(d), 200);
      }
    } else if (b.state === 'lunge') {
      b.phT -= dt; b.minD = Math.min(b.minD, d);
      if (b.phT <= 0) {
        b.state = 'recover'; b.phT = C.recover;
        /* il a bondi tout près sans prendre le navire : esquivé */
        if (b.minD < 200) { addScore(40, me.x, me.y - 20); floatText(me.x, me.y - 44, T('bst.squid.dodge'), 'gold'); }
      }
    } else {
      b.phT -= dt;
      if (b.phT <= 0) { if (b.huntT > 0) { b.state = 'hunt'; b.cool = C.cool; } else squidGiveUp(b, 'escape'); }
    }
    return;
  }
  if (b.state === 'hold') {
    /* agrippé au flanc du navire, la tête vers la coque */
    const nx = -Math.sin(me.h), ny = Math.cos(me.h);
    b.x = me.x + nx * b.side * (me.wid * 0.5 + 10); b.y = me.y + ny * b.side * (me.wid * 0.5 + 10);
    b.h = me.h + b.side * Math.PI / 2 + Math.PI;
    b.age += dt; b.holdT -= dt; b.biteT -= dt;
    me.grip = lerp(me.grip || 0, b.side * 0.075, 1 - Math.exp(-dt * 2));
    if (b.biteT <= 0) {
      b.biteT = 0.9;
      if (damageShip(me, C.bite)) { fx.splinters(me.x + nx * b.side * me.wid * 0.4, me.y + ny * b.side * me.wid * 0.4, 6, '#8a6a44'); Snd.hit(0); }
    }
    if (b.hp <= 0) beastDies(b);
    else if (b.holdDmg >= C.release) squidGiveUp(b, 'free');
    else if (b.holdT <= 0) squidGiveUp(b, 'tired');
    return;
  }
  if (b.state === 'dive') {
    b.leaveT += dt;
    if (b.leaveT > 2.5) {
      if (b.returns > 0) { b.state = 'lurk'; b.lurkT = corsaire ? rnd(50, 30) : rnd(40, 22); }
      else b.gone = true;
    }
  } else if (b.state === 'leave' || b.state === 'die') {
    b.leaveT = (b.leaveT || 0) + dt;
    if (b.leaveT > 2.5) b.gone = true;
  }
}

function akkoroStep(b, dt) {
  const me = G.me, A = BEAST.akkoro;
  const d = dist(b.x, b.y, me.x, me.y);
  b.life -= dt;
  b.slamFx = Math.max(0, (b.slamFx || 0) - dt * 2.2);
  /* elle se tourne lentement vers le navire */
  const want = Math.atan2(me.y - b.y, me.x - b.x);
  b.h = wrapA(b.h + clamp(wrapA(want - b.h), -0.6 * dt, 0.6 * dt));
  if (b.state === 'rise') {
    b.riseT += dt;
    if (b.riseT > 3) b.state = 'fight';
  } else if (b.state === 'fight') {
    /* elle avance vers le navire, sans quitter l'eau profonde */
    if (d > 130) {
      const nx = b.x + Math.cos(b.h) * 24 * dt, ny = b.y + Math.sin(b.h) * 24 * dt;
      if (G.field.wrap || !nearLand(nx, ny, 110)) { b.x = nx; b.y = ny; }
    }
    b.slamT -= dt;
    if (b.slamT <= 0) {
      if (d < 215 && !me.sinking) {
        b.slamDur = rnd(3.2, 2.2); b.slamT = b.slamDur; b.slamFx = 1;
        if (damageShip(me, A.dmg)) {
          me.dx += Math.cos(b.h) * 70; me.dy += Math.sin(b.h) * 70;
          G.shake = Math.min(1.3, (G.shake || 0) + 0.8);
          Snd.thud(1); Snd.crack();
          fx.splash(me.x + rndSym(30), me.y + rndSym(30), 1.8);
          floatText(me.x, me.y - 30, T('bst.akkoro.slam'), 'bad');
        }
      } else { b.slamT = 0.4; b.slamDur = 0.4; }
    }
    if (b.hp <= 0) beastDies(b);
    else if (b.life <= 0 || me.sinking) { b.state = 'leave'; b.leaveT = 0; beastInk(b); banner(T('bst.akkoro.gone'), '', 2.2); }
    /* la mer rougit : une brume rouge qui traîne au ras de l'eau */
    if (Math.random() < dt * 5 && d < cam.w) fx.push({ k: 'smoke', x: b.x + rndSym(160), y: b.y + rndSym(160), z0: 3, vx: 0, vy: 0, r: rnd(12, 7), grow: 8, life: rnd(4, 2.5), age: 0, a: 0.2, tone: 7, air: true });
  } else if (b.state === 'leave' || b.state === 'die') {
    b.leaveT = (b.leaveT || 0) + dt;
    if (b.leaveT > 3.5) b.gone = true;
  }
}

/* l'encre : un nuage noir qui s'étale sur l'eau */
function beastInk(b) {
  if (!R3.extra) return;
  const big = b.kind === 'akkoro' ? 2.2 : 1;
  for (let i = 0; i < 16; i++) {
    const a = rnd(TAU), r = rnd(30, 0) * big;
    R3.extra.push({ x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r, z: 0.7, vx: Math.cos(a) * rnd(14, 4), vy: Math.sin(a) * rnd(14, 4), size: rnd(34, 18) * big, grow: 1.6, c: [0.03, 0.03, 0.05], a: 0.75, life: rnd(6, 4), age: 0, foam: true, seed: Math.random() });
  }
}

function beastDies(b) {
  b.state = 'die'; b.leaveT = 0;
  const big = b.kind === 'akkoro';
  /* la bête vaincue s'enfonce dans un remous, en lâchant son encre */
  fx.splash(b.x, b.y, big ? 3.2 : 2.2);
  for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; fx.push({ k: 'foam', x: b.x + Math.cos(a) * 30, y: b.y + Math.sin(a) * 30, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, drag: 1.3, r: 3.5, grow: 8, life: 2.6, age: 0, a: 0.75 }); }
  beastInk(b);
  addScore(big ? 1500 : 600, b.x, b.y);
  banner(T(big ? 'bst.akkoro.dead' : 'bst.squid.dead'), T(big ? 'bst.akkoro.dead2' : 'bst.squid.dead2'), 2.6);
  Snd.levelUp();
  /* le corsaire : on y trouve de l'or (on ne sait trop comment) ; ailleurs, des caisses peintes */
  if (G.cors && G.arc && G.arc.variant === 'corsaire') corsDropGold(b.x, b.y, big ? 500 : 150, big ? 3 : 2);
  else for (let i = 0; i < (big ? 2 : 1); i++) addPrise(b.x + rndSym(60), b.y + rndSym(60)).life = 40;
}

/* la distance d'un point au segment [a, b] */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

/* les boulets du joueur sur une bête ; true si le boulet s'arrête là */
function beastShot(p) {
  if (!G.beasts || p.owner !== G.me) return false;
  for (const b of G.beasts) {
    const c = Math.cos(b.h), n = Math.sin(b.h);
    if (b.kind === 'baleine') {
      if (b.state !== 'swim') continue;
      const L = whaleLen();
      if (segDist(p.x, p.y, b.x - c * L * 0.45, b.y - n * L * 0.45, b.x + c * L * 0.45, b.y + n * L * 0.45) > L * 0.15) continue;
      /* on ne tire pas sur Ebisu : elle sonde, effrayée */
      fx.splash(p.x, p.y, 0.8);
      b.state = 'dive'; b.diveT = 0;
      floatText(b.x, b.y - 30, T('bst.whale.shot'), 'bad');
      return true;
    }
    if (b.kind === 'calmar') {
      /* on l'atteint quand il chasse à fleur d'eau, mieux encore quand il bondit ; quelques coups
       * le font renoncer (les pièces de retraite servent ici). Agrippé, on le chasse à bout portant. */
      if (!(squidHunting(b) || b.state === 'hold')) continue;
      if (!(dist(p.x, p.y, b.x, b.y) < 30 || segDist(p.x, p.y, b.x, b.y, b.x - c * 46, b.y - n * 46) < 15)) continue;
      const dmg = (p.dmg || 10) / 10 * (b.state === 'hunt' || b.state === 'recover' ? 0.5 : 1);
      b.hp -= dmg;
      fx.hit(p.x, p.y); Snd.hit(0);
      if (b.state === 'hold') b.holdDmg += dmg;
      else {
        b.spook = (b.spook || 0) + (b.state === 'windup' || b.state === 'lunge' ? 1.5 : 1);
        if (b.hp <= 0) beastDies(b); else if (b.spook >= 3) squidGiveUp(b, 'hit');
      }
      return true;
    }
    if (b.state === 'die' || b.state === 'leave' || b.state === 'rise') continue;
    if (dist(p.x, p.y, b.x, b.y) >= 78) continue;
    b.hp -= (p.dmg || 10) / 10;
    fx.hit(p.x, p.y); Snd.hit(0);
    return true;
  }
  return false;
}

/* tirer à bout portant sur les bras qui tiennent le navire */
function beastsPlayerFired() {
  if (!G.beasts) return;
  for (const b of G.beasts) {
    if (b.state === 'hold') { b.hp -= 2.2; b.holdDmg += 2.2; fx.hit(b.x + rndSym(10), b.y + rndSym(10)); }
    else if (b.kind === 'akkoro' && b.state === 'fight' && dist(b.x, b.y, G.me.x, G.me.y) < 170) b.hp -= 1.2;
  }
}

/* la bordée part du côté de la bête qui tient le navire, ou de celle qui est par le travers */
function beastAbeam(me) {
  if (G.game !== 'arcade' || !G.beasts) return 0;
  for (const b of G.beasts) {
    if (b.state === 'hold') return b.side;
    if (squidHunting(b) && dist(b.x, b.y, me.x, me.y) < 320) {
      const rel = wrapA(Math.atan2(b.y - me.y, b.x - me.x) - me.h);
      if (Math.abs(Math.abs(rel) - Math.PI / 2) < 0.6) return rel > 0 ? 1 : -1;
    }
    if (b.kind === 'akkoro' && b.state === 'fight' && dist(b.x, b.y, me.x, me.y) < 440) {
      const rel = wrapA(Math.atan2(b.y - me.y, b.x - me.x) - me.h);
      if (Math.abs(Math.abs(rel) - Math.PI / 2) < 0.7) return rel > 0 ? 1 : -1;
    }
  }
  return 0;
}

/* ---------- le dessin ---------- */

function syncBeast(b, dt) {
  const m = keep(b, () => {
    const g = new THREE.Group();
    const K = SCALE * BEAST[b.kind].k;
    const body = b.kind === 'baleine' ? buildWhale() : b.kind === 'calmar' ? buildSquid() : buildOctopus();
    body.scale.setScalar(K);
    const pitch = new THREE.Group(); pitch.add(body);
    g.add(pitch);
    const L = whaleLen();
    const sh = b.kind === 'baleine' ? beastDisc(L * 0.5, L * 0.13, 0x02080c, 0.35) : b.kind === 'calmar' ? beastDisc(44, 15, 0x05080a, 0.6) : beastDisc(70, 70, 0x0a0204, 0.4);
    if (b.kind === 'calmar') sh.position.x = -22;
    sh.position.y = 0.35;
    g.add(sh);
    let glow = null;
    if (b.kind === 'akkoro') { glow = beastDisc(260, 260, 0xffffff, 0, true); glow.position.y = 0.45; glow.renderOrder = 0; g.add(glow); }
    g.userData = { body, pitch, sh, glow, tail: body.userData.tail, arms: body.userData.arms };
    return g;
  });
  const U = m.userData, t = b.t;
  m.position.set(b.x, 0, b.y);
  m.rotation.y = -b.h;
  if (b.kind === 'baleine') syncWhale(b, U, t);
  else if (b.kind === 'calmar') syncSquid(b, U, t, dt || 1 / 60);
  else syncOctopus(b, U, t);
}

function syncWhale(b, U, t) {
  const base = -3.4 + Math.sin(t * 0.8) * 0.35;
  let y = base, pitchA = Math.sin(t * 0.8 + 1) * 0.02, roll = 0, tail = Math.sin(t * 1.6) * 0.16, vis = true, shOp = 0.38;
  if (b.state === 'dive') {
    const k = clamp(b.diveT / 3.4, 0, 1);
    y = base - 14 * k;
    pitchA = -0.5 * Math.sin(Math.PI * Math.min(1, k * 1.15));
    tail = -0.95 * Math.sin(Math.PI * k);
    shOp = lerp(0.38, 0.18, k);
  } else if (b.state === 'under') { vis = false; shOp = 0.15; }
  else if (b.state === 'rise') {
    const k = clamp(b.riseT / 2, 0, 1);
    y = lerp(-18, base, smooth(k)); pitchA = 0.2 * (1 - k); shOp = lerp(0.15, 0.38, k);
  } else if (b.state === 'breach') {
    /* le saut : elle jaillit presque debout, se tourne en l'air et retombe sur le flanc */
    const k = clamp(b.brT / 3.4, 0, 1);
    y = -30 + 44 * Math.sin(Math.PI * Math.min(1, k / 0.8));
    if (k > 0.8) y = lerp(-30, base, smooth((k - 0.8) / 0.2));
    pitchA = 1.15 - 1.45 * smooth(Math.min(1, k / 0.75));
    roll = 1.7 * smooth(clamp((k - 0.2) / 0.5, 0, 1)) * (b.id % 2 ? 1 : -1);
    if (k > 0.8) { pitchA = lerp(pitchA, 0, smooth((k - 0.8) / 0.2)); roll = lerp(roll, 0, smooth((k - 0.8) / 0.2)); }
    tail = Math.sin(t * 5) * 0.3;
    shOp = 0.3;
  }
  U.body.visible = vis;
  U.pitch.position.y = y;
  U.pitch.rotation.set(roll, 0, pitchA);
  if (U.tail) U.tail.rotation.z = tail;
  U.sh.material.opacity = shOp;
}

function syncSquid(b, U, t, dt) {
  const C = BEAST.calmar, st = b.state, hold = st === 'hold';
  /* la profondeur selon ce qu'il fait : à l'affût, invisible ; en chasse, une ombre et l'arête du
   * manteau qui fend l'eau ; il se ramasse et monte ; en plein bond, la tête sort de l'eau */
  let yT = -24, shOp = 0, reachT = 0.3;
  if (st === 'hunt' || st === 'recover') { yT = -8.1 + Math.sin(t * 2.2) * 0.4; shOp = 0.6; }
  else if (st === 'windup') { yT = lerp(-8, -5.5, 1 - b.phT / C.windup); shOp = 0.8; }
  else if (st === 'lunge') { yT = -3.6; shOp = 0.4; }
  else if (hold) { yT = -1.8; reachT = 1; }
  if (U.ry === undefined || st === 'lurk') U.ry = yT;
  U.ry = lerp(U.ry, yT, 1 - Math.exp(-dt * (st === 'lunge' ? 6 : hold ? 3.5 : 2.2)));
  U.reach = lerp(U.reach === undefined ? reachT : U.reach, reachT, 1 - Math.exp(-dt * 3));
  U.shOp = lerp(U.shOp || 0, shOp, 1 - Math.exp(-dt * 4));
  U.body.visible = U.ry > -12.5;
  U.sh.visible = U.shOp > 0.02;
  U.sh.material.opacity = U.shOp;
  U.pitch.position.y = U.ry;
  U.pitch.rotation.z = hold ? -0.05 : st === 'lunge' ? 0.06 : 0;
  /* les bras : groupés en nageant, tendus en avant pour bondir, plaqués sur le pont quand il tient */
  const k = hold ? U.reach : 0, ahead = st === 'lunge' || st === 'windup' ? 1 : 0;
  for (const arm of U.arms) {
    const rho = arm.userData.rho, i = arm.userData.i;
    if (arm.userData.longT) {
      /* les deux longs tentacules : tendus devant pour saisir, puis enroulés autour de l'étrave et de la poupe */
      const s2 = rho > 0 ? 1 : -1;
      poseArm(arm, s2 * lerp(0.1 + 0.05 * ahead, 0.8, k), lerp(0.04, 0.6, k), lerp(0.01, -0.12, k), lerp(0, -s2 * 0.12, k), 0.1, t, i);
    } else {
      const fan = (i / 7 - 0.5) * 2;
      const yawS = Math.sin(rho) * (0.1 + 0.12 * ahead), elevS = Math.cos(rho) * (0.1 + 0.12 * ahead) - 0.04 * ahead;
      const yawH = fan * 0.85, elevH = 0.75 + (i % 2) * 0.3;
      poseArm(arm, lerp(yawS, yawH, k), lerp(elevS, elevH, k), lerp(0.01, -0.21, k), 0, 0.13, t, i * 1.7);
    }
  }
}

function syncOctopus(b, U, t) {
  let y = -6, reach = 1;
  if (b.state === 'rise') { const k = clamp(b.riseT / 3, 0, 1); y = lerp(-46, -6, smooth(k)); reach = 0.4 + 0.6 * k; }
  else if (b.state === 'leave' || b.state === 'die') { const k = clamp(b.leaveT / 3.5, 0, 1); y = -6 - 42 * smooth(k); reach = 1 - 0.6 * k; }
  U.pitch.position.y = y + Math.sin(t * 0.7) * 0.8;
  /* les bras se dressent tout autour en arceaux ; ceux de devant se lèvent, puis frappent */
  const wind = b.state === 'fight' ? Math.pow(clamp(1 - b.slamT / (b.slamDur || 3), 0, 1), 2) : 0;
  for (const arm of U.arms) {
    const a = arm.userData.a, i = arm.userData.i;
    const front = Math.max(0, Math.cos(a));
    let elev = (0.95 + Math.sin(t * 0.9 + i * 1.3) * 0.22) * reach;
    let curl = -(0.15 + Math.sin(t * 0.7 + i) * 0.04) * reach;
    if (front > 0.5) { elev += (0.55 * wind - 0.9 * b.slamFx) * front; curl *= 1 - 0.5 * b.slamFx; }
    poseArm(arm, -a, elev, curl, 0, 0.07, t, i * 1.9);
  }
  const fade = b.state === 'rise' ? clamp(b.riseT / 3, 0, 1) : b.state === 'fight' ? 1 : 1 - clamp(b.leaveT / 3.5, 0, 1);
  if (U.glow) { U.glow.material.opacity = (0.62 + Math.sin(t * 1.4) * 0.08) * fade; U.glow.rotation.z = t * 0.03; }
  U.sh.material.opacity = 0.4 * fade;
}

/* au-dessus du calmar qui tient le navire et d'Akkorokamui : ce qu'il leur reste */
function beastsDraw(c) {
  for (const b of G.beasts || []) {
    const show = (b.kind === 'calmar' && b.state === 'hold') || (b.kind === 'akkoro' && b.state === 'fight');
    if (!show) continue;
    const big = b.kind === 'akkoro';
    const [px, py, ok] = toScreen(b.x, b.y, big ? 70 : 34);
    if (!ok || px < -80 || py < -80 || px > cam.pw + 80 || py > cam.ph + 80) continue;
    const f = clamp(b.hp / BEAST[b.kind].hp, 0, 1), w = big ? 150 : 84, y = py - 40;
    c.fillStyle = 'rgba(16,20,26,0.82)'; roundRect(c, px - w / 2 - 2, y - 8, w + 4, 10, 5); c.fill();
    c.fillStyle = '#e8563c'; roundRect(c, px - w / 2, y - 6, w * f, 6, 3); c.fill();
    const lab = T(big ? 'bst.akkoro' : 'bst.squid.n');
    c.font = 'italic 600 13px "Palatino Linotype", Georgia, serif'; c.textAlign = 'center';
    c.lineWidth = 4; c.strokeStyle = 'rgba(8,12,18,0.7)'; c.strokeText(lab, px, y - 14);
    c.fillStyle = '#ffb09a'; c.fillText(lab, px, y - 14);
  }
}

/* sur la mini-carte : les bêtes en surface, et la baie d'Uchiura */
function beastsMini(c, P, me, radius) {
  const z = c.canvas.width / 2 / radius;
  if (G.arc && G.arc.variant === 'corsaire') {
    const U = JAPAN.uchiura;
    if (dist(U[0], U[1], me.x, me.y) < radius + U[2]) {
      const [px, py] = P(U[0], U[1]);
      c.strokeStyle = 'rgba(232,86,60,0.7)'; c.lineWidth = 2; c.setLineDash([4, 4]);
      c.beginPath(); c.arc(px, py, Math.max(8, U[2] * z), 0, TAU); c.stroke();
      c.setLineDash([]);
    }
  }
  for (const b of G.beasts || []) {
    if (dist(b.x, b.y, me.x, me.y) > radius) continue;
    if (b.kind === 'calmar' ? !(squidHunting(b) || b.state === 'hold') : b.state === 'under' || b.state === 'leave' || b.state === 'die') continue;
    const [px, py] = P(b.x, b.y);
    c.fillStyle = b.kind === 'baleine' ? '#a8d0e8' : '#ff5a3a';
    c.beginPath(); c.arc(px, py, b.kind === 'akkoro' ? 8 : 5, 0, TAU); c.fill();
  }
}

addStr({
  'bst.whale': ['une baleine souffle', 'a whale blows', '鯨が潮を吹いた'],
  'bst.whale.luck': ['la baleine d\'Ebisu : bon présage', 'Ebisu\'s whale: a good omen', '恵比寿の鯨：吉兆'],
  'bst.whale.breach': ['un saut de baleine !', 'a whale breaches!', '鯨が跳んだ！'],
  'bst.whale.hit': ['on heurte la baleine', 'we have struck the whale', '鯨にぶつかった'],
  'bst.whale.shot': ['elle sonde, effrayée', 'she sounds, frightened', '驚いて潜っていった'],
  'bst.squid': ['Un calmar géant', 'A giant squid', '大王イカ'],
  'bst.squid.n': ['calmar géant', 'giant squid', '大王イカ'],
  'bst.squid2': ['il vous prend en chasse : gardez de l\'erre, et virez quand il bondit', 'it is hunting you: keep your way on, and turn when it lunges', '追ってくる。行き足を保ち、飛びかかってきたら舵を切れ'],
  'bst.squid.back': ['le calmar revient', 'the squid is back', '大王イカが戻ってきた'],
  'bst.squid.lunge': ['il va bondir : virez !', 'it is about to lunge: turn!', '飛びかかるぞ。舵を切れ！'],
  'bst.squid.dodge': ['esquivé !', 'dodged!', 'かわした！'],
  'bst.squid.escape': ['il renonce et replonge', 'it gives up and dives', 'あきらめて潜っていった'],
  'bst.squid.lost': ['vous l\'avez semé', 'you have shaken it off', '振り切った'],
  'bst.squid.free': ['il lâche prise, blessé', 'it lets go, wounded', '傷ついて手を放した'],
  'bst.squid.hit': ['touché : il replonge', 'hit: it dives', '命中、潜っていった'],
  'bst.squid.grab': ['il saisit le navire : feu à bout portant !', 'it has seized the ship: fire point-blank!', '艦をつかまれた。至近距離で撃て！'],
  'bst.squid.gone': ['il lâche prise et replonge', 'it lets go and dives back', '手を放して沈んでいった'],
  'bst.squid.dead': ['Le calmar géant est vaincu', 'The giant squid is beaten', '大王イカを倒した'],
  'bst.squid.dead2': ['il ne reviendra plus', 'it will not come back', 'もう戻ってこない'],
  'ptr.squid': ['calmar', 'squid', 'イカ'],
  'bst.akkoro': ['Akkorokamui', 'Akkorokamui', 'アッコロカムイ'],
  'bst.akkoro2': ['la pieuvre rouge de la baie d\'Uchiura, dans les récits aïnous', 'the red octopus of Uchiura Bay, in Ainu tales', 'アイヌの伝承に語られる内浦湾の赤い大蛸'],
  'bst.akkoro.slam': ['un bras s\'abat sur le pont', 'an arm crashes down on the deck', '腕が甲板に叩きつけられた'],
  'bst.akkoro.gone': ['Akkorokamui replonge', 'Akkorokamui sinks back', 'アッコロカムイが沈んでいく'],
  'bst.akkoro.dead': ['Akkorokamui est vaincue', 'Akkorokamui is beaten', 'アッコロカムイを退けた'],
  'bst.akkoro.dead2': ['la mer redevient bleue', 'the sea turns blue again', '海が青さを取り戻す'],
  'help.beasts': ['Les grandes bêtes', 'The great beasts', '海の大きな生き物'],
  'help.b1': ['Baleine', 'Whale', '鯨'],
  'help.b1d': ['Ebisu la protège : on ne la chasse pas, mais la croiser de près porte bonheur', 'Ebisu protects her: you do not hunt her, but passing close brings luck', '恵比寿の使い。追わずに近くを通れば吉'],
  'help.b2': ['Calmar géant', 'Giant squid', '大王イカ'],
  'help.b2d': ['il vous traque sous l\'eau : gardez de l\'erre, virez quand il bondit ; s\'il vous saisit, feu à bout portant', 'it hunts you underwater: keep your way on, turn when it lunges; if it seizes you, fire point-blank', '水中から追ってくる。行き足を保ち、飛びかかってきたら舵を切れ。つかまれたら至近距離で撃て'],
  'help.b3': ['Akkorokamui', 'Akkorokamui', 'アッコロカムイ'],
  'help.b3d': ['la pieuvre rouge des récits aïnous ; en corsaire, elle hante la baie d\'Uchiura', 'the red octopus of Ainu tales; in corsair mode, she haunts Uchiura Bay', 'アイヌの伝承の赤い大蛸。コルセアでは内浦湾に棲む'],
});
