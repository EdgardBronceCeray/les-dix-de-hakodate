'use strict';

/* ---------- les embarcations ----------
 * Les chaloupes du corsaire, qui mettent les compagnies de débarquement à terre ; les canots de
 * l'histoire ; les barques japonaises, menées à la godille (le ro) ; les chaloupes chargées de poudre
 * et de fusils qui attendent le long du rivage d'Otobe ; la coque des brûlots. Une coque pleine
 * (bordé blanc et liston noir, vaigrage, plancher, bancs, gouvernail), des nageurs assis face à
 * l'arrière, des avirons qui battent en cadence. À la grève, la chaloupe s'échoue, les hommes sautent
 * à terre et montent vers la ville, puis elle revient le long du bord et l'on la hisse. Tout ceci
 * n'est que l'image : la partie n'en dépend pas (le hasard du jeu n'y sert pas). */

const BOATS = { geo: {}, mat: null, fx: [], tow: [], ashore: [], walk: null };
const BOATMAT = () => BOATS.mat || (BOATS.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 }));
const BCOL = {};
const bc = (hex) => BCOL[hex] || (BCOL[hex] = new THREE.Color(hex));

/* ---------- le bâtisseur ----------
 * On y verse des géométries de three.js (une matrice, une couleur) ou des nappes de points (le
 * bordé, le vaigrage) ; il en sort une seule géométrie, une couleur par sommet : un seul appel de
 * dessin pour toute une embarcation et son équipage. */
function bBuilder() {
  const P = [], N = [], C = [];
  const v = new THREE.Vector3(), nm = new THREE.Matrix3(), I = new THREE.Matrix4();
  const B = {
    add(g, m, col) {
      m = m || I;
      nm.getNormalMatrix(m);
      const pos = g.attributes.position, nor = g.attributes.normal, idx = g.index;
      const n = idx ? idx.count : pos.count, flip = m.determinant() < 0;
      for (let k = 0; k + 2 < n; k += 3) {
        const t = [0, 1, 2].map((d) => (idx ? idx.getX(k + d) : k + d));
        if (flip) t.reverse();
        for (const i of t) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m); P.push(v.x, v.y, v.z);
          v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
          C.push(col.r, col.g, col.b);
        }
      }
      return B;
    },
    /* une nappe lissée : rows[i][j] = [x, y, z] ; elle regarde à l'opposé du point « away » */
    sheet(rows, col, away) {
      const ni = rows.length, nj = rows[0].length, pos = [], idx = [];
      for (const r of rows) for (const p of r) pos.push(p[0], p[1], p[2]);
      /* le sens des faces, jugé sur un carreau du milieu qui ne soit pas plat */
      let flip = false;
      for (let i = Math.min(Math.floor(ni / 2), ni - 2), tries = 0; tries < ni; tries++, i = (i + 1) % (ni - 1)) {
        const a = rows[i][0], b = rows[i + 1][0], c = rows[i][Math.min(1, nj - 1)];
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
        const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        if (Math.hypot(nx, ny, nz) < 1e-6) continue;
        const mx = (a[0] + b[0] + c[0]) / 3 - away[0], my = (a[1] + b[1] + c[1]) / 3 - away[1], mz = (a[2] + b[2] + c[2]) / 3 - away[2];
        flip = nx * mx + ny * my + nz * mz < 0;
        break;
      }
      for (let i = 0; i < ni - 1; i++) for (let j = 0; j < nj - 1; j++) {
        const a = i * nj + j, b = (i + 1) * nj + j, c = a + 1, d = b + 1;
        if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      B.add(g, I, col);
      g.dispose();
      return B;
    },
    geometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      g.computeBoundingSphere();
      return g;
    },
  };
  return B;
}

/* les pièces toutes faites, à l'unité : on les place, on les tourne et on les étire par matrice */
const BPART = {};
const bPart = (k, make) => BPART[k] || (BPART[k] = make());
const BCYL = () => bPart('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 7));
const BSPH = () => bPart('sph', () => new THREE.SphereGeometry(1, 8, 6));
const BBOX = () => bPart('box', () => new THREE.BoxGeometry(1, 1, 1));
const _bq = new THREE.Quaternion(), _bv = new THREE.Vector3(), _bs = new THREE.Vector3(), _bu = new THREE.Vector3(0, 1, 0);
/* un cylindre de p0 à p1 (rayon r), dans le repère m */
function bRod(B, m, p0, p1, r, col) {
  const d = _bv.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]), l = d.length();
  if (l < 1e-4) return;
  _bq.setFromUnitVectors(_bu, d.divideScalar(l));
  const k = new THREE.Matrix4().compose(new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2), _bq, _bs.set(r, l, r));
  B.add(BCYL(), m ? new THREE.Matrix4().multiplyMatrices(m, k) : k, col);
}
function bBall(B, m, p, r, col, sy) {
  const k = new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion(), new THREE.Vector3(r, r * (sy || 1), r));
  B.add(BSPH(), m ? new THREE.Matrix4().multiplyMatrices(m, k) : k, col);
}
function bBlock(B, m, c, s, col, ry) {
  const k = new THREE.Matrix4().compose(new THREE.Vector3(c[0], c[1], c[2]), new THREE.Quaternion().setFromAxisAngle(_bu, ry || 0), new THREE.Vector3(s[0], s[1], s[2]));
  B.add(BBOX(), m ? new THREE.Matrix4().multiplyMatrices(m, k) : k, col);
}
const bAt = (x, y, z, ry) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(_bu, ry || 0), new THREE.Vector3(1, 1, 1));

/* ---------- les hommes ----------
 * pose : 'row' (assis sur le banc, penché vers l'aviron), 'sit' (assis), 'kneel' (assis sur les
 * talons, à la japonaise), 'stand', 'walk' (le fusil à l'épaule), 'scull' (debout, penché sur le
 * ro). Repère : les pieds ou le siège à l'origine, l'homme regarde vers +x. */
const BLOOK = {
  sailor: { coat: '#1d2638', legs: '#d8d2c2', hat: 'cap', hatC: '#15171c' },
  soldier: { coat: '#272d3b', legs: '#30364a', hat: 'kepi', hatC: '#15171c', rifle: true },
  cox: { coat: '#1d2638', legs: '#1d2638', hat: 'cap', hatC: '#15171c' },
  fisher: { coat: '#33415e', legs: '#b98c66', hat: 'kasa', hatC: '#cdb683' },
  headman: { coat: '#2b2622', legs: '#4d4436', hat: 'mage', hatC: '#16130f' },
  villager: { coat: '#3a4a64', legs: '#3a4a64', hat: 'band', hatC: '#e8e4d8' },
};
function bMan(B, m, pose, look) {
  const L = BLOOK[look] || BLOOK.sailor, coat = bc(L.coat), legs = bc(L.legs), skin = bc('#c89a74');
  let hip = 0, sh, head;
  if (pose === 'row' || pose === 'sit') {
    /* assis : les cuisses vers l'avant, les jambes vers le plancher */
    for (const s of [1, -1]) {
      bRod(B, m, [0, 0.07, s * 0.1], [0.42, 0.11, s * 0.11], 0.075, legs);
      bRod(B, m, [0.42, 0.11, s * 0.11], [0.47, -0.3, s * 0.11], 0.06, legs);
    }
    const lean = pose === 'row' ? 0.24 : 0.04;
    sh = [Math.sin(lean) * 0.56, 0.05 + Math.cos(lean) * 0.56, 0];
    bRod(B, m, [0, 0.05, 0], sh, 0.18, coat);
    head = [sh[0] + Math.sin(lean) * 0.17, sh[1] + 0.17, 0];
    for (const s of [1, -1]) {
      const hand = pose === 'row' ? [sh[0] + 0.42, sh[1] - 0.2, s * 0.13] : [0.3, 0.2, s * 0.17];
      bRod(B, m, [sh[0], sh[1] - 0.04, s * 0.2], hand, 0.05, coat);
    }
  } else if (pose === 'kneel') {
    bBlock(B, m, [-0.05, 0.1, 0], [0.5, 0.2, 0.36], legs);
    sh = [0.02, 0.74, 0];
    bRod(B, m, [0, 0.18, 0], sh, 0.18, coat);
    head = [0.03, 0.91, 0];
    for (const s of [1, -1]) bRod(B, m, [0.02, 0.68, s * 0.2], [0.24, 0.38, s * 0.12], 0.05, coat);
  } else {
    /* debout */
    const walk = pose === 'walk', scull = pose === 'scull';
    for (const s of [1, -1]) {
      const f = walk ? s * 0.16 : scull ? (s > 0 ? 0.28 : -0.22) : 0;
      bRod(B, m, [f, 0, s * 0.1], [0, 0.85, s * 0.09], 0.07, legs);
    }
    hip = 0.85;
    const lean = scull ? 0.28 : walk ? 0.08 : 0;
    sh = [Math.sin(lean) * 0.6, hip + Math.cos(lean) * 0.6, 0];
    bRod(B, m, [0, hip - 0.02, 0], sh, 0.185, coat);
    head = [sh[0] + Math.sin(lean) * 0.17, sh[1] + 0.17, 0];
    for (const s of [1, -1]) {
      const hand = scull ? [sh[0] + 0.5, sh[1] - 0.12, s * 0.06 + 0.12] : walk && s > 0 ? [sh[0] + 0.05, sh[1] + 0.02, 0.24] : [sh[0] + 0.12, hip - 0.05, s * 0.24];
      bRod(B, m, [sh[0], sh[1] - 0.04, s * 0.2], hand, 0.05, coat);
    }
  }
  bBall(B, m, head, 0.115, skin);
  const hc = bc(L.hatC);
  if (L.hat === 'cap') bRod(B, m, [head[0], head[1] + 0.07, 0], [head[0], head[1] + 0.14, 0], 0.13, hc);
  else if (L.hat === 'kepi') {
    bRod(B, m, [head[0] - 0.01, head[1] + 0.06, 0], [head[0] - 0.03, head[1] + 0.2, 0], 0.105, hc);
    bBlock(B, m, [head[0] + 0.12, head[1] + 0.07, 0], [0.1, 0.015, 0.17], hc);
  } else if (L.hat === 'kasa') {
    /* le sugegasa, le chapeau conique de laîche : un disque clair, qu'on voit de loin */
    const k = new THREE.Matrix4().compose(new THREE.Vector3(head[0], head[1] + 0.12, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    B.add(bPart('kasa', () => new THREE.ConeGeometry(0.34, 0.17, 12)), m ? new THREE.Matrix4().multiplyMatrices(m, k) : k, hc);
  } else if (L.hat === 'mage') bRod(B, m, [head[0] - 0.02, head[1] + 0.09, 0], [head[0] + 0.07, head[1] + 0.12, 0], 0.035, hc);
  else if (L.hat === 'band') bRod(B, m, [head[0], head[1] + 0.02, 0], [head[0], head[1] + 0.06, 0], 0.118, hc);
  /* le fusil, baïonnette au canon : debout entre les genoux, ou à l'épaule */
  if (L.rifle) {
    const wood = bc('#3a2a1c'), steel = bc('#b8bcc0');
    if (pose === 'walk') {
      bRod(B, m, [sh[0] + 0.08, sh[1] - 0.25, 0.24], [sh[0] - 0.3, sh[1] + 0.75, 0.2], 0.024, wood);
      bRod(B, m, [sh[0] - 0.3, sh[1] + 0.75, 0.2], [sh[0] - 0.42, sh[1] + 1.12, 0.19], 0.01, steel);
    } else {
      const base = pose === 'kneel' ? [0.3, 0.02, 0.05] : [0.36, -0.28, 0.02];
      bRod(B, m, base, [base[0] + 0.06, base[1] + 1.2, base[2]], 0.024, wood);
      bRod(B, m, [base[0] + 0.06, base[1] + 1.2, base[2]], [base[0] + 0.07, base[1] + 1.6, base[2]], 0.01, steel);
    }
  }
}

/* ---------- la chaloupe et le canot (à l'européenne) ----------
 * t de -1 (le tableau) à 1 (l'étrave) ; un couple va du plat-bord à la quille. */
const BOAT_KINDS = {
  /* le canot : 6,2 m, trois bancs de nage, six avirons ; la chaloupe : 8,2 m, quatre bancs, huit avirons */
  canot: { L: 6.2, B: 1.95, F: 0.55, D: 0.32, sheer: 0.24, thw: 3, oarIn: 0.95, oarOut: 2.45 },
  chaloupe: { L: 8.2, B: 2.4, F: 0.62, D: 0.38, sheer: 0.28, thw: 4, oarIn: 1.15, oarOut: 2.9 },
};
function launchForm(o) {
  const hb = o.B / 2;
  const hw = (t) => (t >= 0 ? hb * Math.pow(Math.max(0, 1 - Math.pow(t, 2.2)), 0.7) : hb * (1 - 0.45 * Math.pow(-t, 2.4)));
  const yg = (t) => o.F + o.sheer * t * t + (t > 0 ? 0.1 * t * t * t : 0);
  const dk = (t) => o.D * (t > 0 ? 1 - 0.6 * Math.pow(t, 3) : 1 - 0.12 * Math.pow(-t, 3));
  const X = (t) => t * o.L / 2;
  return { hw, yg, dk, X, yf: -o.D * 0.3, yt: o.F * 0.4, tk: 0.05 };
}
/* la coque, son vaigrage, son plancher, ses bancs, son gouvernail */
function launchHull(B, o) {
  const f = launchForm(o), { hw, yg, dk, X, yf, yt, tk } = f, F = o.F, NS = 18;
  const ts = []; for (let i = 0; i <= NS; i++) ts.push(-1 + 2 * i / NS);
  const outer = (t, s) => { const w = hw(t), g = yg(t), d = dk(t); return [[w, g], [w * 0.995, g - 0.13], [w * 0.95, F * 0.45], [w * 0.87, 0], [w * 0.66, -0.55 * d], [w * 0.32, -0.9 * d], [0, -d]].map(([z, y]) => [X(t), y, s * z]); };
  const inner = (t, s) => { const w = hw(t); return [[w - tk, yg(t) - 0.02], [w * 0.95 - tk, F * 0.45], [w * 0.87 - tk, 0], [w * 0.77 - tk, yf]].map(([z, y]) => [X(t), y, s * Math.max(0, z)]); };
  const white = bc('#e8e2d2'), strake = bc('#1f1b18'), wood = bc('#9a7a52'), floor = bc('#8f7048'), cap = bc('#3a2a1c'), thwart = bc('#b48a58');
  for (const s of [1, -1]) {
    const rows = ts.map((t) => outer(t, s));
    B.sheet(rows.map((r) => r.slice(0, 2)), strake, [0, 0, 0]);
    B.sheet(rows.map((r) => r.slice(1)), white, [0, 0, 0]);
    B.sheet(ts.map((t) => inner(t, s)), wood, [0, 0, s * 20]);
    B.sheet(ts.map((t) => [outer(t, s)[0], inner(t, s)[0]]), cap, [0, -20, 0]);
  }
  B.sheet(ts.map((t) => [inner(t, -1)[3], inner(t, 1)[3]]), floor, [0, -20, 0]);
  /* le tableau, dehors et dedans */
  B.sheet([outer(-1, 1), outer(-1, -1)], white, [20, 0, 0]);
  const tin = (s) => inner(-1, s).map((p) => [p[0] + tk, p[1], p[2]]);
  B.sheet([tin(1), tin(-1)], wood, [-20, 0, 0]);
  /* l'étrave */
  bRod(B, null, [X(1) - 0.05, -dk(1), 0], [X(1) + 0.04, yg(1) + 0.16, 0], 0.06, cap);
  /* les bancs de nage, la chambre (les bancs de l'arrière) et le banc de l'avant */
  const thw = [];
  for (let k = 0; k < o.thw; k++) thw.push(-0.38 + 0.8 * (k + 0.5) / o.thw);
  for (const t of thw) bBlock(B, null, [X(t), yt, 0], [0.24, 0.05, 2 * (hw(t) * 0.9 - tk)], thwart);
  const ts0 = -0.84, ts1 = -0.58;
  bBlock(B, null, [X((ts0 + ts1) / 2), yt, 0], [X(ts1) - X(ts0), 0.05, 2 * (hw(ts1) * 0.88 - tk)], thwart);
  bBlock(B, null, [X(0.74), yt + 0.04, 0], [0.5, 0.05, 2 * (hw(0.74) * 0.8 - tk)], thwart);
  /* le gouvernail et la barre */
  bBlock(B, null, [X(-1) - 0.2, (yg(-1) - dk(-1)) / 2 + 0.05, 0], [0.4, yg(-1) + dk(-1) + 0.1, 0.05], cap);
  bBlock(B, null, [X(-1) + 0.32, yg(-1) + 0.1, 0], [0.9, 0.05, 0.05], cap);
  return Object.assign(f, { thw });
}
/* où battent les avirons : pour chaque banc, un aviron de chaque bord (la chaloupe nage en pointe) */
function launchOars(o, f) {
  const out = [];
  for (const t of f.thw) {
    const x = f.X(t) - 0.38, tp = x / (o.L / 2);
    for (const s of [1, -1]) out.push({ x, y: f.yg(tp) + 0.05, z: s * (f.hw(tp) - 0.02), s });
  }
  return out;
}
/* la chaloupe et ses hommes : load : 'troops' (la compagnie de débarquement), 'crew' (des marins),
 * 'cargo' (poudre et fusils, deux hommes de garde, avirons rentrés), '' (vide : les nageurs seuls) */
function launchGeo(kind, load) {
  const key = 'L:' + kind + ':' + load;
  if (BOATS.geo[key]) return BOATS.geo[key];
  const o = BOAT_KINDS[kind], B = bBuilder(), f = launchHull(B, o);
  const { X, yt, hw } = f;
  if (load === 'cargo') {
    /* les avirons rentrés, à plat sur les bancs */
    for (const s of [1, -1]) for (const dz of [0.18, 0.42]) bRod(B, null, [X(-0.55), yt + 0.06, s * dz], [X(0.6), yt + 0.06, s * dz], 0.04, bc('#c9a878'));
    /* les barils de poudre et les caisses de fusils, sous une bâche */
    const keg = bc('#4a3624'), hoop = bc('#2a2420'), crate = bc('#a8885c'), tarp = bc('#d8cfb8');
    for (let i = 0; i < 4; i++) {
      const x = X(-0.35 + i * 0.14), z = (i % 2 ? 0.32 : -0.32);
      bRod(B, null, [x, f.yf, z], [x, f.yf + 0.48, z], 0.22, keg);
      bRod(B, null, [x, f.yf + 0.2, z], [x, f.yf + 0.26, z], 0.235, hoop);
    }
    for (let i = 0; i < 3; i++) bBlock(B, null, [X(0.25 + i * 0.12), f.yf + 0.2 + (i === 1 ? 0.32 : 0), 0], [1.25, 0.32, 0.36], crate, Math.PI / 2 + (i - 1) * 0.08);
    bBlock(B, null, [X(-0.72), yt + 0.25, 0], [0.9, 0.5, 2 * hw(-0.72) * 0.7], tarp);
    bMan(B, bAt(X(0.62), yt + 0.04, 0.3, Math.PI), 'sit', 'sailor');
    bMan(B, bAt(X(-0.9) + 0.1, yt, 0, 0), 'sit', 'cox');
  } else {
    /* les nageurs, deux par banc, face à l'arrière ; le patron de la chaloupe à la barre */
    for (const t of f.thw) for (const s of [1, -1]) bMan(B, bAt(X(t), yt + 0.03, -s * 0.36 * hw(t) / (o.B / 2), Math.PI), 'row', 'sailor');
    bMan(B, bAt(X(-0.9) + 0.12, yt, 0, 0), 'sit', 'cox');
    if (load === 'troops' || load === 'crew') {
      const who = load === 'troops' ? 'soldier' : 'sailor';
      const seats = kind === 'chaloupe'
        ? [[-0.74, 0.34], [-0.74, -0.34], [-0.62, 0], [0.7, 0.24], [0.7, -0.24], [0.56, 0]]
        : [[-0.72, 0.3], [-0.72, -0.3], [0.68, 0.18], [0.68, -0.18]];
      for (const [t, zk] of seats) bMan(B, bAt(X(t), t < 0 ? yt : yt + 0.04, zk * (o.B / 2), t < 0 ? 0 : Math.PI), 'sit', who);
    }
  }
  const g = B.geometry();
  BOATS.geo[key] = g;
  return g;
}
/* un aviron, le long de +z depuis le tolet : la poignée, le manche, la pelle */
function oarGeo(kind) {
  const key = 'oar:' + kind;
  if (BOATS.geo[key]) return BOATS.geo[key];
  const o = BOAT_KINDS[kind], B = bBuilder(), w = bc('#c9a878'), dark = bc('#8a6a44');
  bRod(B, null, [0, 0, -o.oarIn], [0, 0, -o.oarIn + 0.16], 0.032, dark);
  bRod(B, null, [0, 0, -o.oarIn + 0.16], [0, 0, 0.35], 0.05, w);
  bRod(B, null, [0, 0, 0.35], [0, 0, o.oarOut - 0.7], 0.04, w);
  bBlock(B, null, [0, 0, o.oarOut - 0.38], [0.035, 0.2, 0.76], w);
  const g = B.geometry();
  BOATS.geo[key] = g;
  return g;
}

/* ---------- la barque japonaise ----------
 * À fond plat et à bouchain vif, les flancs évasés, l'étrave haute et lancée (le misaoshi), un
 * tableau à l'arrière ; du cèdre nu. Le godilleur, debout à l'arrière, mène le ro, la longue godille
 * qui pivote sur sa cheville (le rogui) et traîne dans l'eau derrière la barque. */
function wasenForm(L, Bm, F, D) {
  const hb = Bm / 2;
  const hw = (t) => (t >= 0 ? hb * Math.pow(Math.max(0, 1 - Math.pow(t, 1.8)), 0.8) : hb * (1 - 0.25 * t * t));
  const yg = (t) => F + 0.1 * t * t + (t > 0 ? 0.62 * Math.pow(t, 3) : 0.12 * t * t);
  /* le fond se relève vers l'étrave */
  const yb = (t) => -D + (t > 0.3 ? Math.pow((t - 0.3) / 0.7, 1.7) * (D + F * 0.9) : 0);
  const X = (t) => t * L / 2 + (t > 0.7 ? (t - 0.7) * 0.12 * L : 0);
  return { hw, yg, yb, X, hb };
}
function wasenHull(B, L, Bm, F, D, cols) {
  const f = wasenForm(L, Bm, F, D), { hw, yg, yb, X } = f, NS = 20, tk = 0.04 * Math.max(1, L / 7);
  const ts = []; for (let i = 0; i <= NS; i++) ts.push(-1 + 2 * i / NS);
  const outer = (t, s) => [[hw(t), yg(t)], [hw(t) * 0.62, yb(t)], [0, yb(t)]].map(([z, y]) => [X(t), y, s * z]);
  const inner = (t, s) => [[hw(t) - tk, yg(t) - 0.02], [Math.max(0, hw(t) * 0.62 - tk), yb(t) + tk * 1.4]].map(([z, y]) => [X(t), y, s * Math.max(0, z)]);
  for (const s of [1, -1]) {
    const rows = ts.map((t) => outer(t, s));
    B.sheet(rows.map((r) => r.slice(0, 2)), cols.out, [0, F, 0]);
    B.sheet(rows.map((r) => r.slice(1)), cols.out, [0, F, 0]);
    B.sheet(ts.map((t) => inner(t, s)), cols.inn, [0, 0, s * 40]);
    B.sheet(ts.map((t) => [outer(t, s)[0], inner(t, s)[0]]), cols.rim, [0, -40, 0]);
  }
  B.sheet(ts.map((t) => [inner(t, -1)[1], inner(t, 1)[1]]), cols.floor, [0, -40, 0]);
  B.sheet([outer(-1, 1), outer(-1, -1)], cols.out, [40, 0, 0]);
  B.sheet([inner(-1, 1).map((p) => [p[0] + tk, p[1], p[2]]), inner(-1, -1).map((p) => [p[0] + tk, p[1], p[2]])], cols.inn, [-40, 0, 0]);
  /* l'étrave lancée, et les barrots (funabari) qui tiennent les flancs */
  bRod(B, null, [X(0.86), yb(0.86), 0], [X(1) + 0.1 * L / 7, yg(1) + 0.12 * L / 7, 0], 0.05 * Math.max(1, L / 7), cols.rim);
  for (const t of [-0.55, -0.1, 0.35]) bBlock(B, null, [X(t), yg(t) - 0.08, 0], [0.16 * Math.max(1, L / 9), 0.08, 2 * (hw(t) - tk)], cols.rim);
  return f;
}
function wasenGeo() {
  if (BOATS.geo.wasen) return BOATS.geo.wasen;
  const B = bBuilder();
  const f = wasenHull(B, 7.2, 1.75, 0.5, 0.22, { out: bc('#8f7a5c'), inn: bc('#9a8464'), rim: bc('#5a4a36'), floor: bc('#a89270') });
  /* le godilleur, debout à l'arrière ; le nanushi assis au milieu ; un pêcheur à l'avant */
  bMan(B, bAt(f.X(-0.78), f.yb(-0.78) + 0.1, -0.12, -0.5), 'scull', 'fisher');
  bMan(B, bAt(f.X(-0.15), f.yb(-0.15) + 0.06, 0, Math.PI), 'kneel', 'headman');
  bMan(B, bAt(f.X(0.32), f.yb(0.32) + 0.06, 0.05, Math.PI), 'kneel', 'villager');
  const g = B.geometry();
  g.userData = { scull: [f.X(-1) + 0.32, f.yg(-1) + 0.12, 0.3] };
  BOATS.geo.wasen = g;
  return g;
}
/* le ro : la poignée près du godilleur, la cheville au tableau, la pale qui traîne dans l'eau */
function roGeo() {
  if (BOATS.geo.ro) return BOATS.geo.ro;
  const B = bBuilder(), w = bc('#a08460'), dark = bc('#6a5640');
  bRod(B, null, [0.95, 0.55, -0.35], [0, 0, 0], 0.045, w);
  bRod(B, null, [0, 0, 0], [-2.2, -0.75, 0], 0.05, w);
  bBlock(B, null, [-3.0, -1.05, 0], [1.7, 0.03, 0.2], dark, 0);
  const g = B.geometry();
  BOATS.geo.ro = g;
  return g;
}

/* ---------- la coque d'un brûlot : une jonque bourrée de paille et de poix ---------- */
function fireHullGeo(L) {
  const key = 'fire:' + Math.round(L);
  if (BOATS.geo[key]) return BOATS.geo[key];
  const B = bBuilder(), Bm = L * 0.3;
  const f = wasenHull(B, L, Bm, 1.2 * L / 26, 0.9 * L / 26, { out: bc('#2a2018'), inn: bc('#1c140e'), rim: bc('#16100c'), floor: bc('#241a12') });
  /* le mât, nu et noirci */
  bRod(B, null, [f.X(0.1), f.yb(0.1), 0], [f.X(0.1) + 1.2, f.yg(0.1) + L * 0.42, 0], 0.22 * L / 26, bc('#120c08'));
  const g = B.geometry();
  g.userData = { f };
  BOATS.geo[key] = g;
  return g;
}

/* ---------- le modèle à l'écran ---------- */

/* ce que porte une embarcation : son genre et sa charge */
function boatLook(b) {
  if (b.barque) return { kind: 'wasen', load: '' };
  if (b.kind) return { kind: b.kind, load: b.load || '' };
  if (b.crew) return { kind: 'chaloupe', load: 'crew' };
  return { kind: 'chaloupe', load: 'cargo' };
}
function buildBoat3D(b) {
  const look = boatLook(b), g = new THREE.Group(), U = g.userData;
  U.kind = look.kind;
  const body = new THREE.Mesh(look.kind === 'wasen' ? wasenGeo() : launchGeo(look.kind, look.load), BOATMAT());
  body.castShadow = true; body.receiveShadow = true; body.userData.sharedGeo = true;
  g.add(body);
  U.body = body; U.load = look.load;
  if (look.kind === 'wasen') {
    const ro = new THREE.Mesh(roGeo(), BOATMAT());
    ro.userData.sharedGeo = true; ro.castShadow = true;
    const p = wasenGeo().userData.scull;
    ro.position.set(p[0], p[1], p[2]);
    g.add(ro);
    U.ro = ro;
  } else if (look.load !== 'cargo') {
    const o = BOAT_KINDS[look.kind], f = launchForm(o);
    f.thw = []; for (let k = 0; k < o.thw; k++) f.thw.push(-0.38 + 0.8 * (k + 0.5) / o.thw);
    U.oars = launchOars(o, f);
    const im = new THREE.InstancedMesh(oarGeo(look.kind), BOATMAT(), U.oars.length);
    im.userData.sharedGeo = true; im.castShadow = true; im.frustumCulled = false;
    g.add(im);
    U.oarMesh = im;
  }
  /* le pavillon du corsaire, à l'arrière des chaloupes qui débarquent */
  if (b.flag) {
    const o = BOAT_KINDS[look.kind], X = -o.L / 2 + 0.2, y = launchForm(o).yg(-1);
    const pole = new THREE.Mesh(BCYL(), stdMat('#3a2c1e', 0.8));
    pole.userData.sharedGeo = true;
    pole.scale.set(0.035, 1.6, 0.035); pole.position.set(X, y + 0.8, 0);
    g.add(pole);
    const fg = bPart('bflag', () => { const q = new THREE.PlaneGeometry(1.1, 0.72); q.translate(-0.55, 0, 0); return q; });
    const flag = new THREE.Mesh(fg, m3('bflagMat', () => new THREE.MeshStandardMaterial({ map: flagTex('corsair'), side: THREE.DoubleSide, roughness: 0.85 })));
    flag.userData.sharedGeo = true;
    flag.position.set(X, y + 1.25, 0);
    g.add(flag);
    U.flag = flag;
  }
  g.scale.setScalar(SCALE);
  return g;
}

const _om = new THREE.Matrix4(), _oe = new THREE.Euler(0, 0, 0, 'YXZ'), _oq = new THREE.Quaternion(), _op = new THREE.Vector3(), _os = new THREE.Vector3(1, 1, 1);
/* une embarcation à l'écran : sa place, sa houle, ses avirons ou son ro, sa charge, son sillage */
function syncLaunch(b) {
  const m = keep(b, () => {
    const g = buildBoat3D(b);
    if (!b.noRing) { const ring = glowRing(b.barque ? new THREE.Color(1.6, 0.45, 0.3) : new THREE.Color(1.5, 1.2, 0.6), 60); R3.scene.add(ring); g.userData.ring = ring; }
    return g;
  });
  const U = m.userData, dt = Math.min(0.05, Math.max(0, W.t - (U.t || W.t)));
  U.t = W.t;
  /* son allure, d'après le chemin fait depuis l'image précédente */
  if (dt > 0) U.spd = lerp(U.spd || 0, dist(b.x, b.y, U.px === undefined ? b.x : U.px, U.py === undefined ? b.y : U.py) / dt, clamp(dt * 6, 0, 1));
  U.px = b.x; U.py = b.y;
  /* la charge a changé (les hommes sont descendus à terre) : on change de maillage */
  const look = boatLook(b);
  if (look.load !== U.load && U.kind !== 'wasen') { U.body.geometry = launchGeo(look.kind, look.load); U.load = look.load; }
  const beached = b.state === 'beach';
  const bob = beached ? 0 : Math.sin(b.bob || 0);
  m.position.set(b.x, (b.lift || 0) * SCALE + bob * 0.4 - (beached ? 0 : 0.1), b.y);
  m.rotation.set(beached ? 0 : bob * 0.04, -b.h, beached ? 0.07 : Math.cos(b.bob || 0) * 0.025);
  /* la cadence : les avirons battent quand on nage, se reposent sinon */
  const row = b.row !== undefined ? b.row : b.crew || b.barque ? (beached ? 0 : 1) : 0;
  U.row = lerp(U.row || 0, row, clamp(dt * 3, 0, 1));
  const was = U.ph || 0;
  U.ph = was + dt * TAU * (U.kind === 'wasen' ? 0.75 : 0.9) * (0.25 + 0.75 * U.row);
  const vis = onScreen(b.x, b.y, 80);
  if (U.oarMesh) {
    const im = U.oarMesh, show = !(b.lift > 0.3) && !beached;
    im.visible = show;
    if (show && vis) {
      const A = 0.5 * U.row, ph = U.ph;
      for (let i = 0; i < U.oars.length; i++) {
        const o = U.oars[i], p = ph + (o.s > 0 ? 0 : 0.05);
        const th = A * Math.sin(p), e = U.row > 0.2 ? -0.16 + 0.1 * Math.cos(p) : -0.08;
        const fe = clamp((Math.cos(p) - 0.2) / 0.5, 0, 1) * U.row;
        _oe.set(-e, o.s > 0 ? th : Math.PI - th, fe * Math.PI / 2, 'YXZ');
        _om.compose(_op.set(o.x, o.y, o.z), _oq.setFromEuler(_oe), _os);
        im.setMatrixAt(i, _om);
      }
      im.instanceMatrix.needsUpdate = true;
      /* l'attaque : les pelles entrent dans l'eau, deux gerbes d'écume */
      const k0 = Math.floor((was - Math.PI / 2) / TAU), k1 = Math.floor((U.ph - Math.PI / 2) / TAU);
      if (k1 > k0 && U.row > 0.5 && U.oars.length) {
        const o = U.oars[U.oars.length >> 1], kind = BOAT_KINDS[U.kind], c = Math.cos(b.h), s_ = Math.sin(b.h);
        for (const s of [1, -1]) {
          const lx = (o.x + kind.oarOut * 0.9 * Math.sin(A)) * SCALE, lz = s * (Math.abs(o.z) + kind.oarOut * 0.85) * SCALE;
          fx.push({ k: 'foam', x: b.x + lx * c - lz * s_, y: b.y + lx * s_ + lz * c, vx: 0, vy: 0, drag: 1, r: 1.1, grow: 2.4, life: 0.9, age: 0, a: 0.55 });
        }
      }
    }
  }
  if (U.ro) {
    /* le ro va et vient, et tourne sur lui-même à chaque coup */
    const k = U.row, p = U.ph;
    U.ro.rotation.set(0.35 * k * Math.cos(p), 0.3 * k * Math.sin(p), 0, 'YXZ');
  }
  if (U.flag) U.flag.rotation.y = Math.PI + 0.15 * Math.sin(W.t * 3 + (b.bob || 0));
  /* le sillage, quand elle avance */
  if (vis && !beached && !(b.lift > 0.2) && (U.spd || 0) > 8 && Math.random() < dt * 9) {
    const L2 = BOAT_KINDS[U.kind === 'wasen' ? 'canot' : U.kind].L * 0.5 * SCALE;
    fx.push({ k: 'foam', x: b.x - Math.cos(b.h) * L2 + (Math.random() - 0.5) * 2, y: b.y - Math.sin(b.h) * L2 + (Math.random() - 0.5) * 2, vx: -Math.cos(b.h) * 6, vy: -Math.sin(b.h) * 6, drag: 1.4, r: 1.2, grow: 3, life: 1.4, age: 0, a: 0.5 });
  }
  if (!U.ring) return;
  if (b.noRing || (b.barque && b.state === 'back')) { U.ring.visible = false; return; }
  U.ring.position.set(b.x, 0.9, b.y);
  const pulse = 0.5 + 0.5 * Math.sin((b.bob || 0) * 2);
  U.ring.scale.setScalar(54 + pulse * 8);
  U.ring.material.opacity = 0.3 + pulse * 0.3;
}

/* ---------- la vie d'une embarcation, entre le bord et la grève ----------
 * b.mother : le navire qui l'a mise à l'eau ; b.to : la grève ; b.town : où montent les hommes.
 * 'lower' : on l'amène le long du bord ; 'go' : elle nage vers la grève ; 'beach' : échouée, les
 * hommes sautent à terre ; 'back' : elle revient ; 'hoist' : on la hisse. done : à ôter. */
const BOAT_LOWER = 1.2, BOAT_HOIST = 1.0;
function boatStation(b) {
  const s = b.mother, c = Math.cos(s.h), n = Math.sin(s.h);
  const bx = (b.slot === 1 ? -0.22 : b.slot === 2 ? 0.18 : b.slot === 3 ? -0.05 : 0.02) * s.len, by = b.side * (s.wid * 0.5 + 6);
  return [s.x + bx * c - by * n, s.y + bx * n + by * c];
}
const boatDeckH = (s) => clamp(s.spec.B * 0.38, 2.2, 4.3) * (s.spec.look && s.spec.look.fbK || 1);
const boatGround = (x, y) => {
  const S = R3.terrain && R3.terrain.userData.sampler;
  return S ? S.h(x, y) : G.mapLand(x, y) ? 1 : -3;
};
function boatTurn(b, tx, ty, dt, sp) {
  const want = Math.atan2(ty - b.y, tx - b.x);
  b.h += clamp(wrapA(want - b.h), -dt * 1.6, dt * 1.6);
  const k = Math.max(0, Math.cos(wrapA(want - b.h)));
  b.spd = sp * (0.35 + 0.65 * k);
  b.x += Math.cos(b.h) * b.spd * dt; b.y += Math.sin(b.h) * b.spd * dt;
}
function boatLife(b, dt) {
  b.t = (b.t || 0) + dt; b.age = (b.age || 0) + dt; b.bob = (b.bob || 0) + dt * 2.6;
  const s = b.mother, alive = s && !s.sinking && !s.sunk && G.ships.includes(s);
  const half = (b.barque ? 7.2 : BOAT_KINDS[b.kind].L) * 0.5 * SCALE;
  switch (b.state) {
    case 'lower': {
      if (!alive) { b.done = true; break; }
      [b.x, b.y] = boatStation(b); b.h = s.h; b.spd = 0; b.row = 0;
      b.lift = boatDeckH(s) * (1 - smooth(clamp(b.t / BOAT_LOWER, 0, 1)));
      if (b.t >= BOAT_LOWER) { b.state = 'go'; b.t = 0; b.lift = 0; }
      break;
    }
    case 'go': {
      b.row = 1;
      boatTurn(b, b.to[0], b.to[1], dt, b.sp);
      /* l'étrave touche le sable : elle s'échoue */
      const fx_ = b.x + Math.cos(b.h) * half, fy = b.y + Math.sin(b.h) * half;
      if (boatGround(fx_, fy) > -0.45 || dist(b.x, b.y, b.to[0], b.to[1]) < 8 || b.t > 40) { b.state = 'beach'; b.t = 0; b.spd = 0; }
      break;
    }
    case 'beach': {
      b.row = 0; b.spd = 0;
      if (b.load === 'troops' || b.load === 'crew') { if (b.t > 0.35) { boatUnload(b); b.load = ''; } }
      if (b.stay) break;
      if (b.t > 1.7) { b.state = 'back'; b.t = 0; }
      break;
    }
    case 'back': {
      b.row = 1;
      if (b.t < 0.7) { b.spd = -10; b.x -= Math.cos(b.h) * 10 * dt; b.y -= Math.sin(b.h) * 10 * dt; break; }
      if (!alive) { if (b.t > 12 || !onScreen(b.x, b.y, 60)) b.done = true; boatTurn(b, b.x - Math.cos(b.h) * 100, b.y - Math.sin(b.h) * 100, dt, b.sp * 0.6); break; }
      const [sx, sy] = boatStation(b);
      boatTurn(b, sx, sy, dt, b.sp);
      if (dist(b.x, b.y, sx, sy) < 12) { b.state = 'hoist'; b.t = 0; }
      else if (b.t > 45 || dist(b.x, b.y, s.x, s.y) > 2500) b.done = true;
      break;
    }
    case 'hoist': {
      if (!alive) { b.done = true; break; }
      [b.x, b.y] = boatStation(b); b.h = s.h; b.row = 0; b.spd = 0;
      b.lift = boatDeckH(s) * smooth(clamp(b.t / BOAT_HOIST, 0, 1));
      if (b.t >= BOAT_HOIST) b.done = true;
      break;
    }
    default: break;
  }
}

/* les hommes sautent à terre et montent vers la ville, en petite colonne */
function boatUnload(b) {
  const n = b.load === 'troops' ? (b.kind === 'chaloupe' ? 6 : 4) : 5;
  const half = BOAT_KINDS[b.kind].L * 0.5 * SCALE;
  const x0 = b.x + Math.cos(b.h) * half, y0 = b.y + Math.sin(b.h) * half;
  const to = b.town || [x0 + Math.cos(b.h) * 300, y0 + Math.sin(b.h) * 300];
  for (let i = 0; i < n; i++) {
    const a = b.h + (Math.random() - 0.5) * 0.9;
    const tx = to[0] + (Math.random() - 0.5) * 60, ty = to[1] + (Math.random() - 0.5) * 60, x = x0 + Math.cos(a) * 3, y = y0 + Math.sin(a) * 3;
    BOATS.ashore.push({ x, y, tx, ty, h: Math.atan2(ty - y, tx - x), sp: 9 + Math.random() * 3, wait: i * 0.22, t: 0, life: 7 + Math.random() * 2, ph: Math.random() * TAU, who: b.load === 'troops' ? 'soldier' : 'sailor' });
  }
  if (BOATS.ashore.length > 140) BOATS.ashore.splice(0, BOATS.ashore.length - 140);
}

/* une embarcation de l'histoire, ôtée du jeu près de la grève : elle reste à l'image. Une barque du
 * village finit de rentrer et s'échoue devant chez elle ; un canot du bord va jusqu'à la grève,
 * met ses hommes à terre et revient le long du navire qui l'a mis à l'eau. On lui garde son maillage. */
function boatToFx(b, to) {
  const v = { x: b.x, y: b.y, h: b.h, bob: b.bob || 0, noRing: true, barque: !!b.barque, crew: !!b.crew, state: 'go', t: 0, to, sp: b.sp || 30, _m: b._m };
  if (b.barque) v.stay = true;
  else { v.kind = 'chaloupe'; v.load = 'crew'; v.mother = G.me; v.slot = 0; v.side = wrapA(Math.atan2(b.y - G.me.y, b.x - G.me.x) - G.me.h) >= 0 ? 1 : -1; }
  b._m = null;
  BOATS.fx.push(v);
  /* les barques échouées s'accumulent : on garde les huit dernières */
  const st = BOATS.fx.filter((q) => q.stay);
  if (st.length > 8) BOATS.fx.splice(BOATS.fx.indexOf(st[0]), 1);
  return v;
}

/* les chaloupes recueillies, à la remorque : en file derrière le navire */
function boatTow(b, s) {
  BOATS.tow.push({ x: b.x, y: b.y, h: b.h, bob: b.bob || 0, noRing: true, ship: s, n: BOATS.tow.length, state: 'tow', _m: b._m });
  b._m = null;
}

/* à chaque image : les embarcations de l'image seule, les hommes à terre */
function boatsFxStep(dt) {
  for (let i = BOATS.fx.length - 1; i >= 0; i--) {
    const v = BOATS.fx[i];
    boatLife(v, dt);
    if (v.done) { BOATS.fx.splice(i, 1); continue; }
    syncLaunch(v);
  }
  for (const v of BOATS.tow) {
    /* chacune suit la précédente, au bout de sa remorque */
    const lead = v.n === 0 ? v.ship : BOATS.tow[v.n - 1];
    if (!lead) continue;
    const lh = v.n === 0 ? lead.h : lead.h, back = v.n === 0 ? (v.ship.len * 0.5 + 22) : 26;
    const tx = lead.x - Math.cos(lh) * back, ty = lead.y - Math.sin(lh) * back;
    const d = dist(v.x, v.y, tx, ty);
    if (d > 0.5) {
      v.h = Math.atan2(lead.y - v.y, lead.x - v.x);
      const k = clamp(d / 30, 0, 1) * Math.min(1, dt * 6);
      v.x += (tx - v.x) * k; v.y += (ty - v.y) * k;
    }
    v.bob += dt * 2.4; v.spd = 0;
    syncLaunch(v);
  }
  boatsWalkers(dt);
}

/* la compagnie de débarquement, à terre : une silhouette par homme, en un seul appel de dessin */
function boatsWalkers(dt) {
  const A = BOATS.ashore;
  if (!BOATS.walk) {
    const B = bBuilder();
    bMan(B, null, 'walk', 'soldier');
    const geo = B.geometry();
    const im = new THREE.InstancedMesh(geo, BOATMAT(), 160);
    im.castShadow = true; im.frustumCulled = false; im.count = 0;
    BOATS.walk = im;
    const B2 = bBuilder();
    bMan(B2, null, 'walk', 'sailor');
    const im2 = new THREE.InstancedMesh(B2.geometry(), BOATMAT(), 160);
    im2.castShadow = true; im2.frustumCulled = false; im2.count = 0;
    BOATS.walk2 = im2;
  }
  for (const im of [BOATS.walk, BOATS.walk2]) if (im.parent !== R3.scene) R3.scene.add(im);
  const S = R3.terrain && R3.terrain.userData.sampler;
  let n1 = 0, n2 = 0;
  for (let i = A.length - 1; i >= 0; i--) {
    const w = A[i];
    w.t += dt;
    if (w.t > w.life) { A.splice(i, 1); continue; }
    if (w.t < w.wait) continue;
    const a = Math.atan2(w.ty - w.y, w.tx - w.x), d = dist(w.x, w.y, w.tx, w.ty);
    if (d > 6) { w.x += Math.cos(a) * w.sp * dt; w.y += Math.sin(a) * w.sp * dt; w.h = a; }
    w.ph += dt * 9;
  }
  for (const w of A) {
    if (w.t < w.wait) continue;
    const im = w.who === 'sailor' ? BOATS.walk2 : BOATS.walk;
    const k = w.who === 'sailor' ? n2++ : n1++;
    if (k >= 160) continue;
    const ground = S ? Math.max(0.2, S.h(w.x, w.y)) : 0.2;
    /* elle s'efface à la fin : l'homme entre dans les rues */
    const fade = clamp((w.life - w.t) / 0.8, 0, 1);
    _om.compose(_op.set(w.x, ground + Math.abs(Math.sin(w.ph)) * 0.35, w.y), _oq.setFromAxisAngle(_bu, -(w.h || 0)), _os.set(SCALE * fade, SCALE * fade, SCALE * fade));
    im.setMatrixAt(k, _om);
  }
  _os.set(1, 1, 1);
  BOATS.walk.count = Math.min(160, n1); BOATS.walk2.count = Math.min(160, n2);
  BOATS.walk.instanceMatrix.needsUpdate = true; BOATS.walk2.instanceMatrix.needsUpdate = true;
}

/* une nouvelle carte : plus rien à l'eau ni à terre (les maillages, clear3D les a rendus) */
function boatsClear() {
  BOATS.fx.length = 0; BOATS.tow.length = 0; BOATS.ashore.length = 0;
  if (BOATS.walk) { BOATS.walk.count = 0; BOATS.walk2.count = 0; }
}
