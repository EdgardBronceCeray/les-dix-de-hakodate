'use strict';

/* Ce qui flotte dans l'arcade : des familles de débris bien distinctes, pour que la mer
 * ne soit pas semée cent fois du même radeau.
 *   gros débris  : pan de pont, roue à aubes arrachée, proue dressée, mât tombé avec sa hune,
 *                  radeau de fortune, rouf arraché ;
 *   moyens       : pan de pont, chaloupe chavirée, balles de riz sur un caillebotis,
 *                  radeau, tronçon de mât, rouf ;
 *   petits       : planches, tonneau, tonneau de saké, balle de riz, morceau de pavois, espars.
 * Les amas qui éclatent en quatre : tonneaux, tonneaux de saké (komodaru), balles de riz (tawara).
 * Les épaves indestructibles : coque chavirée doublée de cuivre, la même rongée de vert-de-gris,
 * jonque de commerce (bezaisen) chavirée.
 * Toutes les mesures sont en mètres ; s est le rayon de l'objet. Les petits objets sont un peu
 * grossis pour rester lisibles vus de haut. */

const WOODS = {
  mouille: ['#4c3824', '#5a4129', '#433120', '#634a31', '#3d2d1c'],
  blanchi: ['#857b6c', '#958a78', '#766d60', '#9c917e'],
  teck: ['#7a5230', '#8a5e36', '#6c482a'],
};
const PAINTS = { noir: '#1e1d1c', ocre: '#c9b58a', blanc: '#e4dfd3', rouge: '#8a2c20', vert: '#2e4a3c' };

const dMat = (key, make) => MODELS.mats[key] || (MODELS.mats[key] = make());
const paintMat = (col, rough) => dMat('paint' + col + (rough || ''), () => new THREE.MeshStandardMaterial({ color: col, roughness: rough || 0.65 }));
const ironMat = () => dMat('dIron', () => new THREE.MeshStandardMaterial({ color: 0x2a2725, roughness: 0.55, metalness: 0.5 }));
const ropeMat = () => stdMat('#c4b07e', 0.95);
const darkRope = () => stdMat('#6a5434', 0.95);
const glassMat = () => dMat('dGlass', () => new THREE.MeshStandardMaterial({ color: 0x9fb8c8, roughness: 0.15, metalness: 0.3 }));
const goldMat = () => dMat('dGold', () => new THREE.MeshStandardMaterial({ color: 0xd8a84a, roughness: 0.35, metalness: 0.7 }));
const barrelMat = () => dMat('barrel', () => new THREE.MeshStandardMaterial({ map: barrelTexture(), roughness: 0.75 }));
const wetSailMat = () => dMat('wetSail', () => new THREE.MeshStandardMaterial({ map: sailTexture(), side: THREE.DoubleSide, roughness: 1, color: 0x9a907c }));
const strawMat = () => dMat('straw', () => new THREE.MeshStandardMaterial({ map: strawTexture(), roughness: 1 }));
const taruMat = () => dMat('taru', () => new THREE.MeshStandardMaterial({ map: taruTexture(), roughness: 0.95 }));

/* ---------- textures ---------- */

function strawTexture() {
  if (MODELS.tex.straw) return MODELS.tex.straw;
  return (MODELS.tex.straw = canvasTex(128, 64, (c, w, h) => {
    c.fillStyle = '#c4ab72'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * w, y = Math.random() * h, l = 5 + Math.random() * 12;
      c.strokeStyle = `rgba(${100 + Math.random() * 90 | 0},${78 + Math.random() * 70 | 0},${30 + Math.random() * 30 | 0},0.55)`;
      c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (Math.random() - 0.5) * 2, y + l); c.stroke();
    }
    grain(c, w, h, 200, '#3a2a10', 0.2);
  }));
}

/* tonneau de saké enveloppé de sa natte, avec la marque du brasseur */
function taruTexture() {
  if (MODELS.tex.taru) return MODELS.tex.taru;
  return (MODELS.tex.taru = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#cdb47c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      c.fillStyle = `rgba(${110 + Math.random() * 80 | 0},${85 + Math.random() * 60 | 0},${35 + Math.random() * 25 | 0},0.45)`;
      c.fillRect(x, y, 1, 4 + Math.random() * 6);
    }
    /* les cordes, en haut et en bas */
    c.fillStyle = '#5a4428';
    for (const y of [10, 18, h - 22, h - 14]) c.fillRect(0, y, w, 3);
    for (let x = 0; x < w; x += 32) c.fillRect(x, 10, 3, h - 21);
    /* la marque : un grand cercle rouge et un cartouche noir */
    for (const cx of [w * 0.25, w * 0.75]) {
      c.fillStyle = '#a3261c'; c.beginPath(); c.arc(cx, h * 0.42, 17, 0, TAU); c.fill();
      c.fillStyle = '#cdb47c'; c.beginPath(); c.arc(cx, h * 0.42, 9, 0, TAU); c.fill();
      c.fillStyle = '#1c1a18'; c.fillRect(cx - 9, h * 0.62, 18, 26);
    }
  }));
}

/* coque peinte : cuivre sous la flottaison, noir au-dessus, préceinte ocre */
function hullPaintTexture() {
  if (MODELS.tex.hullPaint) return MODELS.tex.hullPaint;
  return (MODELS.tex.hullPaint = canvasTex(64, 128, (c, w, h) => {
    for (let y = 0; y < h; y++) {
      const v = 1 - y / h;
      c.fillStyle = v < 0.34 ? `rgb(${140 + Math.random() * 30 | 0},${88 + Math.random() * 20 | 0},${50 + Math.random() * 12 | 0})` : v > 0.78 && v < 0.85 ? '#c9b58a' : '#1d1c1b';
      c.fillRect(0, y, w, 1);
    }
    c.fillStyle = '#d8d0bc'; c.fillRect(0, Math.round(h * (1 - 0.34)), w, 2);
    grain(c, w, h, 300, '#000', 0.2);
  }));
}

function copperTexture(green) {
  const key = green ? 'copperG' : 'copper';
  if (MODELS.tex[key]) return MODELS.tex[key];
  return (MODELS.tex[key] = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = '#1d1c1b'; c.fillRect(0, 0, w, h);
    const cu = h * 0.42;
    for (let y = Math.floor(cu); y < h; y += 7) {
      for (let x = ((y / 7) % 2) * 9; x < w; x += 18) {
        const t = Math.random();
        c.fillStyle = green && Math.random() < 0.6 ? `rgb(${60 + t * 30 | 0},${118 + t * 30 | 0},${96 + t * 20 | 0})` : `rgb(${150 + t * 40 | 0},${92 + t * 30 | 0},${52 + t * 18 | 0})`;
        c.fillRect(x, y, 17, 6);
      }
    }
    for (let i = 0; i < (green ? 160 : 90); i++) {
      const x = Math.random() * w, y = cu + Math.random() * (h - cu) * 0.7, r = 4 + Math.random() * 18;
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(70,140,112,0.6)'); gr.addColorStop(1, 'rgba(70,140,112,0)');
      c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    c.fillStyle = '#d8d0bc'; c.fillRect(0, cu - 4, w, 2);
    grain(c, w, h, 900, '#000', 0.18);
  }));
}

/* le bordé d'une jonque, bois gris strié, sans cuivre */
function junkTexture() {
  if (MODELS.tex.junk) return MODELS.tex.junk;
  return (MODELS.tex.junk = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = '#5c5246'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 9) { c.fillStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.2})`; c.fillRect(0, y, w, 2); }
    for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(30,24,18,0.5)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 9); }
    grain(c, w, h, 1200, '#1a140e', 0.3);
  }));
}

/* ---------- petits outils de construction ---------- */

function dMesh(g, geo, mat, x, y, z, rx, ry, rz) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  return m;
}
const dBox = (g, w, h, d, mat, x, y, z, rx, ry, rz) => dMesh(g, new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
/* direction d'une pièce couchée selon l'angle a, et la direction en travers */
const along = (a, t) => [-Math.cos(a) * t, Math.sin(a) * t];
const across = (a, t) => [Math.sin(a) * t, Math.cos(a) * t];
/* une pièce ronde couchée sur l'eau, dans la direction a */
function dRod(g, r0, r1, len, mat, x, y, z, a, seg, tilt) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, seg || 8), mat);
  m.rotation.order = 'YXZ'; m.rotation.y = a; m.rotation.z = Math.PI / 2 + (tilt || 0);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  return m;
}
/* une forme plate posée sur l'eau : x en travers de a, y vers -a */
function dFlat(g, pts, mat, x, y, z, a) {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat);
  m.rotation.order = 'YXZ'; m.rotation.x = -Math.PI / 2; m.rotation.y = a - Math.PI / 2;
  m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true;
  g.add(m);
  return m;
}
/* une toile déchirée : largeur w, longueur d, bord libre en dents de scie */
function tornCloth(rr, w, d) {
  const pts = [[-w / 2, 0], [w / 2, 0]];
  const n = 7;
  for (let i = 0; i <= n; i++) pts.push([w / 2 - (i / n) * w + rr.sym(w * 0.04), d * rr.range(0.45, 1)]);
  return pts;
}
function scatterPlanks(g, s, rr, det, n, woods) {
  for (let i = 0; i < n; i++) {
    const a = rr() * TAU, d = s * rr.range(0.35, 0.85), len = s * rr.range(0.35, 0.7);
    dBox(g, len, det * 0.3, det * rr.range(0.7, 1.2), woodMat(rr.pick(woods || WOODS.mouille)), Math.cos(a) * d, 0.3, Math.sin(a) * d, rr.sym(0.05), rr() * Math.PI, rr.sym(0.05));
  }
}
function barrelAt(g, r, x, y, z, a, lying) {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 2.3, 12), barrelMat());
  if (lying) { b.rotation.order = 'YXZ'; b.rotation.y = a; b.rotation.z = Math.PI / 2; }
  b.position.set(x, y, z); b.castShadow = true;
  g.add(b);
  return b;
}
function taruAt(g, r, x, y, z, a, lying) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 1.9, 14), taruMat());
  if (lying) { t.rotation.order = 'YXZ'; t.rotation.y = a; t.rotation.z = Math.PI / 2; }
  else t.rotation.y = a;
  t.position.set(x, y, z); t.castShadow = true;
  g.add(t);
  return t;
}
/* une balle de riz : paille liée de trois cordes */
function baleAt(g, r, x, y, z, a) {
  const len = r * 1.5;
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), strawMat());
  m.rotation.order = 'YXZ'; m.rotation.y = a; m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  for (const t of [-0.32, 0, 0.32]) {
    const [dx, dz] = along(a, t * len);
    dMesh(g, new THREE.TorusGeometry(r * 1.03, r * 0.1, 5, 14), darkRope(), x + dx, y, z + dz, 0, a - Math.PI / 2, 0);
  }
  return m;
}

/* ---------- gros et moyens débris ---------- */

/* un pan de pont arraché, avec ce qui y est resté accroché */
function debrisPont(g, s, rr, det, seed) {
  const woods = rr() < 0.3 ? WOODS.blanchi : WOODS.mouille;
  const piece = new THREE.Group();
  const Lx = s * (s > 20 ? 1.45 : 1.6), Wz = s * (s > 20 ? 0.78 : 0.7);
  const nb = clamp(Math.round(Wz / clamp(s * 0.09, 0.8, 2.2)), 3, 9);
  const pw = Wz / nb;
  for (let i = 0; i < nb; i++) {
    const len = Lx * rr.range(0.55, 1.0), off = rr.sym((Lx - len) * 0.5);
    dBox(piece, len, det * 0.4, pw * 0.9, woodMat(rr.pick(woods)), off, 0.35 + rr.sym(0.08), (i - (nb - 1) / 2) * pw, rr.sym(0.05), rr.sym(0.04), 0);
    if (rr() < 0.6) dBox(piece, det * 0.9, det * 0.42, pw * 0.7, woodMat('#a7845a'), off + (len / 2) * (rr() < 0.5 ? -1 : 1), 0.4, (i - (nb - 1) / 2) * pw, 0, rr.sym(0.5), 0);
  }
  const nbeam = Math.max(2, Math.round(Lx / 9));
  for (let k = 0; k < nbeam; k++) dBox(piece, det * 0.7, det * 0.6, Wz * rr.range(1.05, 1.3), woodMat('#33251a'), -Lx / 2 + (k + 0.5) * Lx / nbeam + rr.sym(1), 0.05, rr.sym(1));
  if (s > 11) {
    const bl = Lx * rr.range(0.45, 0.75), bh = clamp(s * 0.07, 1.1, 2.4), bx = rr.sym(Lx * 0.15);
    dBox(piece, bl, bh, det * 0.35, paintMat(PAINTS.noir), bx, 0.35 + bh / 2, Wz / 2);
    dBox(piece, bl, bh * 0.18, det * 0.38, paintMat(PAINTS.ocre), bx, 0.35 + bh * 0.72, Wz / 2);
    dBox(piece, bl * 1.02, det * 0.3, det * 0.6, woodMat('#6e5236'), bx, 0.35 + bh, Wz / 2);
  }
  if (s > 15) {
    const hz = clamp(s * 0.16, 2, 5), hx = rr.sym(Lx * 0.2), hzp = rr.sym(Wz * 0.15);
    dBox(piece, hz, det * 0.5, hz * 0.8, stdMat('#1f1812', 0.95), hx, 0.6, hzp);
    for (let k = -2; k <= 2; k++) dBox(piece, det * 0.2, det * 0.2, hz * 0.8, woodMat('#7a5c3c'), hx + k * hz * 0.18, 0.88, hzp);
  }
  piece.rotation.set(rr.sym(0.1), rr() * Math.PI, rr.sym(0.06));
  g.add(piece);
  /* le mât brisé en travers, sa vergue et la voile mouillée */
  if (s > 7) {
    const mr = clamp(s * 0.022, 0.35, 0.9), ml = s * rr.range(1.6, 2.0), a = piece.rotation.y + Math.PI / 2 + rr.sym(0.5);
    dRod(g, mr * 0.8, mr, ml, stdMat('#3d2c1c', 0.9), 0, 0.6 + mr, 0, a, 10);
    const [tx, tz] = along(a, ml / 2);
    dMesh(g, new THREE.ConeGeometry(mr * 1.05, mr * 3, 6), woodMat('#a7845a'), tx, 0.6 + mr, tz, 0, a, Math.PI / 2);
    if (s > 13) {
      const yl = s * rr.range(0.9, 1.2), ya = rr.sym(ml * 0.3), b = a + Math.PI / 2 + rr.sym(0.3);
      const [yx, yz] = along(a, ya);
      dRod(g, mr * 0.45, mr * 0.55, yl, stdMat('#2a1f15', 0.9), yx, 0.6 + mr * 2.2, yz, b, 8);
      dFlat(g, tornCloth(rr, yl * 0.85, s * 0.45), wetSailMat(), yx, 0.5, yz, b + Math.PI / 2);
    }
  }
  const nbar = s > 22 ? 3 : s > 13 ? 2 : 1;
  for (let i = 0; i < nbar; i++) {
    const a = rr() * TAU, d = s * rr.range(0.15, 0.55), br = det * 0.95;
    if (i % 2) barrelAt(g, br, Math.cos(a) * d, 0.5 + br * 0.6, Math.sin(a) * d, rr() * Math.PI, true);
    else barrelAt(g, br, Math.cos(a) * d * 0.6, 0.5 + br * 1.15, Math.sin(a) * d * 0.6, 0, false);
  }
  if (s > 10) dMesh(g, new THREE.TorusGeometry(det * 0.9, det * 0.28, 6, 16), ropeMat(), rr.sym(s * 0.35), 0.75, rr.sym(s * 0.3), Math.PI / 2, 0, 0);
}

/* une roue à aubes arrachée, à plat sur l'eau, et un morceau de son tambour doré */
function debrisRoue(g, s, rr, det) {
  const R = s * 0.48, wd = clamp(s * 0.13, 2.2, 4);
  const iron = ironMat(), wood = woodMat(rr.pick(WOODS.mouille));
  const w = new THREE.Group();
  for (const z of [-wd / 2, wd / 2]) {
    dMesh(w, new THREE.TorusGeometry(R, det * 0.22, 5, 40), iron, 0, 0, z);
    dMesh(w, new THREE.TorusGeometry(R * 0.2, det * 0.2, 5, 16), iron, 0, 0, z);
  }
  const n = 12, broken = (rr() * n) | 0;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    if (i === broken || i === (broken + 1) % n) continue;        // un secteur arraché
    for (const z of [-wd / 2, wd / 2]) dBox(w, R * 0.8, det * 0.18, det * 0.18, iron, Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, z, 0, 0, a);
    dBox(w, det * 0.26, R * 0.32, wd * 1.1, wood, Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86, 0, 0, 0, a);
  }
  dMesh(w, new THREE.CylinderGeometry(det * 0.55, det * 0.55, wd * 1.6, 10), iron, 0, 0, 0, Math.PI / 2, 0, 0);
  w.rotation.x = -Math.PI / 2 + rr.sym(0.32);
  w.position.y = 0.5;
  const yaw = new THREE.Group();
  yaw.rotation.y = rr() * TAU;
  yaw.add(w);
  /* un quartier du tambour, avec son éventail doré */
  const Rb = R * 1.02;
  const shape = new THREE.Shape();
  shape.moveTo(-Rb, 0); shape.absarc(0, 0, Rb, Math.PI, Math.PI * rr.range(0.25, 0.45), true); shape.lineTo(0, 0); shape.lineTo(-Rb, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false, curveSegments: 14 });
  const uvA = geo.attributes.uv, pA = geo.attributes.position;
  for (let i = 0; i < uvA.count; i++) uvA.setXY(i, (pA.getX(i) + Rb) / (2 * Rb), pA.getY(i) / Rb);
  const face = dMat('dPaddleFace', () => new THREE.MeshStandardMaterial({ map: paddleFaceTexture(PAINTS.noir), roughness: 0.5 }));
  const pb = dMesh(yaw, geo, face, R * 0.5, 0.4, R * 1.15, -Math.PI / 2 + 0.08, 0, 0);
  pb.rotation.z = rr.sym(0.4);
  g.add(yaw);
  scatterPlanks(g, s, rr, det, 3);
}

/* la proue d'un navire coulé, dressée hors de l'eau, beaupré pointé vers le ciel */
function debrisProue(g, s, rr, det) {
  const L = s * 2.0, B = s * 0.42;
  const H = buildHull({ L, B, look: {} }, { freeboard: clamp(B * 0.32, 2, 3.6) });
  const hullMat = dMat('dHullPaint', () => new THREE.MeshStandardMaterial({ map: hullPaintTexture(), roughness: 0.55 }));
  H.group.children.forEach((m, i) => { if (m.isMesh) { m.material = i === 0 ? hullMat : i === 2 ? woodMat('#6e5236') : i === 3 ? woodMat('#8a7356') : paintMat('#3a3430'); m.castShadow = true; m.receiveShadow = true; } });
  const W = new THREE.Group();
  W.add(H.group);
  const F = H.F;
  /* beaupré, figure de proue, tronçon du mât de misaine */
  const bl = s * 0.55, ang = 0.28, bx0 = L / 2 - 1, by0 = F + 1;
  const bs = new THREE.Mesh(new THREE.CylinderGeometry(det * 0.2, det * 0.42, bl, 8), stdMat('#3a2a1c', 0.9));
  bs.rotation.z = -Math.PI / 2 + ang; bs.position.set(bx0 + Math.cos(ang) * bl / 2, by0 + Math.sin(ang) * bl / 2, 0); bs.castShadow = true;
  W.add(bs);
  dMesh(W, new THREE.ConeGeometry(det * 0.6, det * 2.2, 6), goldMat(), L / 2 + 0.3, F * 0.75, 0, 0, 0, -Math.PI / 2 - 0.4);
  const mr = clamp(s * 0.022, 0.4, 0.9), mh = s * rr.range(0.25, 0.4);
  dMesh(W, new THREE.CylinderGeometry(mr * 0.9, mr, mh, 8), stdMat('#3a2a1c', 0.9), L * 0.28, F + mh / 2, 0);
  dMesh(W, new THREE.ConeGeometry(mr, mr * 3, 5), woodMat('#a7845a'), L * 0.28, F + mh + mr, 0, 0, 0, 0.3);
  const phi = rr.range(0.36, 0.5);
  W.rotation.z = phi;
  W.position.set(-L * 0.22 * Math.cos(phi), -L * 0.055, 0);
  const yaw = new THREE.Group();
  yaw.rotation.y = rr() * TAU;
  yaw.add(W);
  g.add(yaw);
  scatterPlanks(g, s, rr, det, 4);
}

/* un mât tombé à l'eau, sa hune dressée sur la tranche, ses vergues et ses voiles déchirées */
function debrisMat(g, s, rr, det) {
  const a = rr() * Math.PI, ml = s * (s > 20 ? 1.9 : 1.6), mr = clamp(s * 0.028, 0.45, 1.1);
  const spar = stdMat('#3a2a1c', 0.9);
  dRod(g, mr * 0.7, mr, ml, spar, 0, mr * 0.5, 0, a, 10);
  const [hx, hz] = along(a, ml * 0.16);
  dBox(g, det * 0.6, s * 0.26, s * 0.3, woodMat('#5a4129'), hx, s * 0.06, hz, 0, a, 0);
  dBox(g, det * 0.7, det * 0.7, s * 0.34, woodMat('#33251a'), hx, s * 0.13 + 0.3, hz, 0, a, 0);
  const yards = s > 20 ? [[-0.12, 1.3], [0.3, 0.95]] : [[0.05, 1.1]];
  for (const [t, yl] of yards) {
    const [yx, yz] = along(a, ml * t);
    dRod(g, mr * 0.4, mr * 0.55, s * yl, stdMat('#2a1f15', 0.9), yx, mr * 0.9, yz, a + Math.PI / 2 + rr.sym(0.12), 8);
    dFlat(g, tornCloth(rr, s * yl * 0.85, ml * 0.3), wetSailMat(), yx, 0.35, yz, a + Math.PI);
  }
  for (let i = 0; i < 3; i++) {
    const [bx, bz] = along(a, ml * rr.range(-0.4, 0.4));
    const [cx, cz] = across(a, rr.sym(s * 0.25));
    dBox(g, det * 0.7, det * 0.55, det * 0.5, stdMat('#2b2017', 0.9), bx + cx, 0.45, bz + cz, 0, rr() * Math.PI, 0);
  }
  /* et sa grosse lanterne de hune, qui flotte encore */
  dMesh(g, new THREE.CylinderGeometry(det * 0.5, det * 0.55, det * 1.1, 8), stdMat('#c7a24a', 0.4, 0.6), hx + rr.sym(3), 0.6, hz + rr.sym(3));
}

/* un radeau de fortune : espars amarrés, tonneaux dessous, un bout de voile */
function debrisRadeau(g, s, rr, det) {
  const a = rr() * Math.PI, n = s > 14 ? 6 : 4, len = s * 1.35, sr = clamp(s * 0.04, 0.4, 1.0), gap = sr * 2.2;
  const woods = rr.pick([WOODS.blanchi, WOODS.teck, WOODS.mouille]);
  for (let i = 0; i < n; i++) {
    const [cx, cz] = across(a, (i - (n - 1) / 2) * gap);
    dRod(g, sr, sr * 1.05, len * rr.range(0.85, 1.05), woodMat(rr.pick(woods)), cx, sr * 0.7, cz, a, 7);
  }
  const span = n * gap * 1.25;
  for (let j = 0; j < 3; j++) {
    const [cx, cz] = along(a, (j - 1) * len * 0.38);
    dRod(g, sr * 0.7, sr * 0.7, span, woodMat('#33251a'), cx, sr * 1.7, cz, a + Math.PI / 2, 6);
    for (let i = 0; i < n; i += 2) {
      const [kx, kz] = across(a, (i - (n - 1) / 2) * gap);
      dMesh(g, new THREE.TorusGeometry(sr * 1.1, sr * 0.22, 4, 10), darkRope(), cx + kx, sr * 1.4, cz + kz, Math.PI / 2, 0, 0);
    }
  }
  for (const u of [-0.36, 0.36]) for (const v of [-0.5, 0.5]) {
    const [ax, az] = along(a, u * len), [cx, cz] = across(a, v * n * gap);
    barrelAt(g, sr * 1.5, ax + cx, 0.1, az + cz, a, true);
  }
  /* mât de fortune et bout de voile */
  const mh = s * 0.45;
  const [mx, mz] = along(a, len * 0.12);
  dMesh(g, new THREE.CylinderGeometry(sr * 0.5, sr * 0.7, mh, 6), woodMat('#5a4129'), mx, sr * 2 + mh / 2, mz);
  const sail = new THREE.BufferGeometry();
  const [ex, ez] = along(a, -s * 0.5);
  sail.setAttribute('position', new THREE.Float32BufferAttribute([mx, sr * 2 + mh, mz, mx, sr * 2 + mh * 0.25, mz, mx + ex, sr * 2 + mh * 0.3, mz + ez], 3));
  sail.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0], 2));
  sail.computeVertexNormals();
  const sm = new THREE.Mesh(sail, wetSailMat()); sm.castShadow = true;
  g.add(sm);
  dBox(g, det * 1.2, det * 0.6, det * 0.05, paintMat(PAINTS.rouge), mx, sr * 2 + mh - det * 0.4, mz, 0, a, 0);
}

/* un rouf arraché, à la dérive, avec sa claire-voie */
function debrisRouf(g, s, rr, det) {
  const W = s * 0.8, D = s * 0.5, Hh = clamp(s * 0.14, 2.4, 4.5);
  const h = new THREE.Group();
  const walls = rr() < 0.5 ? paintMat(PAINTS.blanc) : woodMat(rr.pick(WOODS.teck));
  dBox(h, W, Hh, D, walls, 0, 0, 0);
  dBox(h, W * 1.08, det * 0.35, D * 1.12, paintMat('#2a2420', 0.9), 0, Hh / 2 + det * 0.17, 0);
  dBox(h, W * 0.32, det * 0.7, D * 0.4, woodMat('#6a4a2c'), W * 0.15, Hh / 2 + det * 0.55, 0);
  dBox(h, W * 0.28, det * 0.12, D * 0.34, glassMat(), W * 0.15, Hh / 2 + det * 0.95, 0);
  for (const side of [1, -1]) for (let i = -1; i <= 1; i++) dBox(h, W * 0.12, Hh * 0.3, det * 0.12, paintMat('#141414'), i * W * 0.3, Hh * 0.1, side * (D / 2 + 0.02));
  dBox(h, det * 0.12, Hh * 0.7, D * 0.3, paintMat('#3a2416'), W / 2 + 0.02, -Hh * 0.1, 0);
  /* le bout de pont resté accroché dessous */
  for (let i = 0; i < 4; i++) dBox(h, W * rr.range(0.4, 0.9), det * 0.35, D * 0.2, woodMat(rr.pick(WOODS.mouille)), rr.sym(W * 0.2), -Hh / 2 + 0.2, D * 0.55 + i * D * 0.2);
  h.rotation.set(rr.sym(0.14), rr() * TAU, rr.sym(0.18));
  h.position.y = Hh * 0.12;
  g.add(h);
  scatterPlanks(g, s, rr, det, 2);
}

/* une chaloupe chavirée, et ses avirons */
function debrisChaloupe(g, s, rr, det) {
  const len = s * 1.35, yaw = rr() * Math.PI;
  const b = boatModel(len, rr() < 0.6 ? 0xe9e2d0 : 0x2c3e4c);
  b.rotation.set(Math.PI, yaw, 0);
  b.position.y = 0.6;
  b.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(b);
  dRod(g, det * 0.25, det * 0.25, len * 0.92, woodMat('#5a4129'), 0, 0.85, 0, -yaw, 6);
  for (let i = 0; i < 3; i++) {
    const a = rr() * Math.PI, [ox, oz] = across(yaw, rr.sym(s * 0.6));
    const ol = s * rr.range(0.5, 0.7);
    dRod(g, det * 0.1, det * 0.12, ol, woodMat('#8a6a44'), ox, 0.25, oz, a, 5);
    const [ex, ez] = along(a, ol / 2);
    dBox(g, det * 1.4, det * 0.08, det * 0.5, woodMat('#8a6a44'), ox + ex, 0.25, oz + ez, 0, a, 0);
  }
}

/* des balles de riz échappées d'une cale, sur un caillebotis */
function debrisTawara(g, s, rr, det, small) {
  const r = clamp(s * (small ? 0.26 : 0.17), 1.3, 3.2);
  const a = rr() * Math.PI;
  if (!small) {
    const gw = s * 1.05;
    dBox(g, gw, det * 0.35, gw * 0.75, stdMat('#2a1f15', 0.95), 0, 0.15, 0, 0, a, 0);
    for (let k = -3; k <= 3; k++) { const [cx, cz] = along(a, k * gw / 7); dBox(g, det * 0.22, det * 0.25, gw * 0.75, woodMat('#7a5c3c'), cx, 0.45, cz, 0, a, 0); }
    const rows = [[-1, 0], [0, 0], [1, 0], [-0.5, 1], [0.5, 1]];
    for (const [u, layer] of rows) {
      const [cx, cz] = across(a, u * r * 2.1);
      baleAt(g, r, cx, 0.6 + r + layer * r * 1.75, cz, a + rr.sym(0.12));
    }
    for (let i = 0; i < 3; i++) { const b = rr() * TAU, d = s * rr.range(0.6, 0.85); baleAt(g, r, Math.cos(b) * d, r * 0.4, Math.sin(b) * d, rr() * Math.PI); }
  } else {
    baleAt(g, r, 0, r * 0.5, 0, a);
    if (rr() < 0.7) { const [cx, cz] = across(a, r * 2.3); baleAt(g, r * 0.9, cx, r * 0.4, cz, a + rr.sym(0.6)); }
  }
}

/* ---------- petits débris ---------- */

function debrisPlanches(g, s, rr, det) {
  const woods = rr.pick([WOODS.mouille, WOODS.blanchi, WOODS.teck]);
  const n = 4 + ((rr() * 3) | 0), base = rr() * Math.PI;
  for (let i = 0; i < n; i++) {
    const len = s * rr.range(1.0, 1.6), a = base + rr.sym(0.9);
    dBox(g, len, det * 0.35, s * 0.2, woodMat(rr.pick(woods)), rr.sym(s * 0.3), 0.3 + i * det * 0.12, rr.sym(s * 0.3), rr.sym(0.05), a, rr.sym(0.05));
  }
  if (rr() < 0.6) dMesh(g, new THREE.TorusGeometry(s * 0.16, s * 0.05, 5, 12), ropeMat(), rr.sym(s * 0.4), 0.5, rr.sym(s * 0.4), Math.PI / 2, 0, 0);
}
function debrisTonneau(g, s, rr, det) {
  const r = s * 0.34;
  barrelAt(g, r, 0, r * 0.55, 0, rr() * Math.PI, true);
  for (let i = 0; i < 2; i++) dBox(g, s * 0.7, det * 0.2, s * 0.12, woodMat('#7a5530'), rr.sym(s * 0.5), 0.25, rr.sym(s * 0.5), 0, rr() * Math.PI, 0);
  dMesh(g, new THREE.TorusGeometry(r * 1.05, det * 0.08, 4, 16), ironMat(), rr.sym(s * 0.5), 0.2, rr.sym(s * 0.5), Math.PI / 2, 0, 0);
}
function debrisTaru(g, s, rr, det) {
  const r = s * 0.34, a = rr() * Math.PI;
  taruAt(g, r, 0, r * 0.6, 0, a, true);
  if (rr() < 0.6) { const [cx, cz] = across(a, r * 2.4); taruAt(g, r * 0.85, cx, r * 0.9, cz, rr() * TAU, false); }
}
function debrisPavois(g, s, rr, det) {
  const L = s * 1.6, H = s * 0.55;
  const p = new THREE.Group();
  dBox(p, L, H, det * 0.35, paintMat(PAINTS.noir), 0, 0, 0);
  dBox(p, L, H * 0.16, det * 0.4, paintMat(PAINTS.ocre), 0, H * 0.18, 0);
  dBox(p, H * 0.42, H * 0.42, det * 0.45, paintMat('#0e0e0e'), rr.sym(L * 0.2), -H * 0.12, 0);
  dBox(p, L * 1.03, det * 0.3, det * 0.7, woodMat('#6e5236'), 0, H / 2, 0);
  /* le mantelet du sabord, peint en rouge dedans, pendu à sa charnière */
  dBox(p, H * 0.44, H * 0.42, det * 0.15, paintMat(PAINTS.rouge), rr.sym(L * 0.2) + H * 0.3, -H * 0.1, det * 0.35, 0.5, 0, 0);
  p.rotation.set(-Math.PI / 2 + rr.range(0.15, 0.35), 0, 0);
  const yaw = new THREE.Group(); yaw.rotation.y = rr() * TAU; yaw.position.y = 0.5; yaw.add(p);
  g.add(yaw);
}
function debrisEspars(g, s, rr, det) {
  const n = 2 + ((rr() * 2) | 0);
  for (let i = 0; i < n; i++) dRod(g, det * 0.3, det * 0.4, s * rr.range(1.2, 1.8), stdMat(rr.pick(['#3a2a1c', '#4a3626', '#5a4630']), 0.9), rr.sym(s * 0.25), 0.4 + i * det * 0.3, rr.sym(s * 0.25), rr() * Math.PI, 7);
  dBox(g, det * 0.9, det * 0.7, det * 0.6, stdMat('#2b2017', 0.9), rr.sym(s * 0.3), 0.7, rr.sym(s * 0.3), 0, rr() * Math.PI, 0);
  dMesh(g, new THREE.TorusGeometry(s * 0.14, s * 0.045, 5, 12), ropeMat(), rr.sym(s * 0.4), 0.5, rr.sym(s * 0.4), Math.PI / 2, 0, 0);
}

const DEBRIS_BUILD = {
  pont: debrisPont, roue: debrisRoue, proue: debrisProue, mat: debrisMat, radeau: debrisRadeau, rouf: debrisRouf,
  chaloupe: debrisChaloupe, tawara: (g, s, rr, det) => debrisTawara(g, s, rr, det, s < 12),
  planches: debrisPlanches, tonneau: debrisTonneau, taru: debrisTaru, pavois: debrisPavois, espars: debrisEspars,
};

function buildDebris(o) {
  const g = new THREE.Group(), inner = new THREE.Group();
  const rr = makeRng(o.seed);
  const s = o.r / SCALE;
  const det = clamp(s * 0.075, 0.7, 2.3);
  (DEBRIS_BUILD[o.kind] || debrisPont)(inner, s, rr, det, o.seed);
  /* chaque famille est ramenée à la taille de l'objet : ce qu'on voit est ce qu'on heurte */
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const ext = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;
  const k = clamp(s * 1.9 / ext, 0.7, 2.6);
  inner.scale.setScalar(k);
  inner.position.set(-(box.min.x + box.max.x) / 2 * k, 0, -(box.min.z + box.max.z) / 2 * k);
  g.add(inner);
  return mergeStatic(g);
}

/* ---------- les amas qui éclatent en quatre ---------- */

function buildBarrels(r, seed, kind) {
  const g = new THREE.Group();
  const rr = makeRng(seed);
  const s = r / SCALE;
  if (kind === 'tawara') {
    /* une pile de balles de riz, deux rangs, prise dans un filet */
    const br = s * 0.24, a = rr() * Math.PI;
    for (const u of [-1.5, -0.5, 0.5, 1.5]) { const [cx, cz] = across(a, u * br * 2.05); baleAt(g, br, cx, br * 0.7, cz, a); }
    for (const u of [-1, 0, 1]) { const [cx, cz] = across(a, u * br * 2.05); baleAt(g, br, cx, br * 2.4, cz, a); }
    dMesh(g, new THREE.TorusGeometry(s * 0.72, 0.22, 6, 24), darkRope(), 0, br * 1.2, 0, Math.PI / 2, 0, 0);
  } else if (kind === 'taru') {
    /* tonneaux de saké, debout et couchés, liés ensemble */
    const tr = s * 0.27;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + rr.sym(0.3), d = i === 5 ? 0 : s * 0.5;
      taruAt(g, tr, Math.cos(a) * d, i % 2 ? tr * 0.7 : tr * 0.85, Math.sin(a) * d, rr() * TAU, i % 2 === 1);
    }
    dMesh(g, new THREE.TorusGeometry(s * 0.66, 0.2, 6, 24), ropeMat(), 0, 0.7, 0, Math.PI / 2, 0, 0);
  } else {
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + rr.sym(0.3), d = i === 5 ? 0 : s * 0.48;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.3, s * 0.3, s * 0.7, 10), barrelMat());
      b.position.set(Math.cos(a) * d, i === 5 ? s * 0.3 : 0.2, Math.sin(a) * d);
      b.rotation.set(i === 5 ? 0 : Math.PI / 2, rr() * Math.PI, 0);
      b.castShadow = true;
      g.add(b);
    }
    dMesh(g, new THREE.TorusGeometry(s * 0.62, 0.18, 6, 24), ropeMat(), 0, 0.6, 0, Math.PI / 2, 0, 0);
  }
  return mergeStatic(g);
}

/* ---------- les épaves qu'on ne peut pas briser ---------- */

function buildHulk(r, seed, kind) {
  const g = new THREE.Group();
  const rr = makeRng(seed);
  const junk = kind === 'jonque';
  const L = r * (junk ? 1.8 : 1.95) / SCALE, B = r * (junk ? 1.05 : 0.85) / SCALE;
  const H = buildHull({ L, B, look: { hull: '#2a2826' } }, { freeboard: junk ? 2.0 : 2.4 });
  const mat = junk
    ? dMat('dJunk', () => new THREE.MeshStandardMaterial({ map: junkTexture(), roughness: 0.95 }))
    : kind === 'vertdegris'
      ? dMat('dCopperG', () => new THREE.MeshStandardMaterial({ map: copperTexture(true), roughness: 0.55, metalness: 0.45 }))
      : dMat('copper', () => new THREE.MeshStandardMaterial({ map: copperTexture(false), roughness: 0.45, metalness: 0.55 }));
  const hull = new THREE.Mesh(H.sides, mat);
  hull.rotation.x = Math.PI;                      // retournée
  hull.rotation.z = rr.sym(0.04);
  hull.position.y = 1.2;
  if (junk) hull.scale.y = 0.7;                   // fond plat
  hull.castShadow = true; hull.receiveShadow = true;
  g.add(hull);
  if (junk) {
    /* la jonque : large semelle plate et grand safran relevé */
    dBox(g, L * 0.9, 0.5, B * 0.3, woodMat('#4a4036'), 0, 2.4, 0);
    dBox(g, 3.4, 5.5, 0.6, woodMat('#3e352c'), -L * 0.5 - 1.2, 2.6, 0, 0, 0, -0.35);
    for (let i = 0; i < 4; i++) { const a = rr() * TAU, d = L * rr.range(0.4, 0.6); baleAt(g, 1.6, Math.cos(a) * d, 0.6, Math.sin(a) * d * 0.6, rr() * Math.PI); }
  } else {
    dBox(g, L * 0.94, 0.9, 0.8, stdMat('#5a3a24', 0.8), 0, 1.2 + 1.6 + 0.35, 0);
    dBox(g, 2.2, 2.6, 0.5, stdMat('#7c5232', 0.5, 0.4), -L * 0.5 - 0.6, 2.4, 0, 0, 0, 0.15);
    if (kind === 'vertdegris') dMesh(g, new THREE.CylinderGeometry(0.4, 0.4, 3, 6), stdMat('#2a2420', 0.9), L * 0.2, 2.2, B * 0.3, 0.4, 0, 1.2);
  }
  return mergeStatic(g);
}
