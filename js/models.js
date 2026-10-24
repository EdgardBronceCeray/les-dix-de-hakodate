'use strict';

/* Modèles 3D bâtis à partir des fiches : coque lissée, pont bordé, mâture,
 * voiles gonflées, cheminée, roues à aubes, canons, embarcations, pavillon.
 * Tout est en mètres ; le groupe est ensuite mis à l'échelle du jeu (SCALE). */

const MODELS = { tex: {}, mats: {} };

/* ---------- textures peintes à la main, une fois pour toutes ---------- */

function canvasTex(w, h, paint, opts) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  paint(c, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts && opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

function grain(c, w, h, n, col, a) {
  for (let i = 0; i < n; i++) {
    c.fillStyle = col;
    c.globalAlpha = Math.random() * a;
    c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1);
  }
  c.globalAlpha = 1;
}

/* bordé de la coque : œuvres mortes peintes, bande, sabords, flottaison cuivrée */
function hullTexture(look, ports, armored) {
  const key = look.hull + look.stripe + ports + armored;
  if (MODELS.tex[key]) return MODELS.tex[key];
  const t = canvasTex(1024, 128, (c, w, h) => {
    c.fillStyle = look.hull; c.fillRect(0, 0, w, h);
    /* virures */
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
    for (let y = 8; y < h; y += 7) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + (Math.random() - 0.5) * 2); c.stroke(); }
    if (armored) {
      c.strokeStyle = 'rgba(255,255,255,0.08)';
      for (let x = 0; x < w; x += 22) { c.beginPath(); c.moveTo(x, 20); c.lineTo(x, 104); c.stroke(); }
      for (let x = 0; x < w; x += 11) for (let y = 26; y < 100; y += 14) { c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 3, y, 2, 2); }
    }
    /* bande et sabords */
    c.fillStyle = look.stripe; c.fillRect(0, 18, w, 16);
    if (ports) {
      for (let x = 70; x < w - 70; x += 46) {
        c.fillStyle = '#121010'; c.fillRect(x, 20, 12, 11);
        c.strokeStyle = 'rgba(255,255,255,0.18)'; c.strokeRect(x - 0.5, 19.5, 13, 12);
      }
    }
    /* liston clair sous le plat-bord */
    c.fillStyle = 'rgba(255,240,210,0.25)'; c.fillRect(0, 4, w, 3);
    /* flottaison : cuivre vert-de-gris sous l'eau */
    const g = c.createLinearGradient(0, 96, 0, 128);
    g.addColorStop(0, '#5a3a26'); g.addColorStop(0.4, '#6b5a3a'); g.addColorStop(1, '#3c5a4a');
    c.fillStyle = g; c.fillRect(0, 98, w, 30);
    c.fillStyle = 'rgba(230,230,220,0.35)'; c.fillRect(0, 96, w, 2);
    grain(c, w, h, 1600, '#000', 0.25);
    /* traînées de rouille et d'eau de mer */
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      const gg = c.createLinearGradient(0, 30, 0, 98);
      gg.addColorStop(0, 'rgba(120,70,40,0.25)'); gg.addColorStop(1, 'rgba(120,70,40,0)');
      c.fillStyle = gg; c.fillRect(x, 30, 2 + Math.random() * 3, 30 + Math.random() * 60);
    }
  });
  MODELS.tex[key] = t;
  return t;
}

function deckTexture(col) {
  const key = 'deck' + col;
  if (MODELS.tex[key]) return MODELS.tex[key];
  const t = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) {
      c.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.1})`; c.fillRect(0, y, w, 1);
      for (let x = Math.random() * 80; x < w; x += 60 + Math.random() * 60) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x, y, 1, 6); }
    }
    grain(c, w, h, 900, '#3a2a18', 0.3);
    grain(c, w, h, 300, '#fff', 0.15);
  });
  MODELS.tex[key] = t;
  return t;
}

function sailTexture() {
  if (MODELS.tex.sail) return MODELS.tex.sail;
  const t = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#f2ece0'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,100,70,0.22)'; c.lineWidth = 1;
    for (let x = 0; x < w; x += 10) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    c.strokeStyle = 'rgba(120,100,70,0.35)';
    c.strokeRect(1, 1, w - 2, h - 2);
    for (let y = 22; y < h; y += 28) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    grain(c, w, h, 400, '#8a7a5a', 0.12);
  });
  MODELS.tex.sail = t;
  return t;
}

function flagTexture(kind) {
  const key = 'flag' + kind;
  if (MODELS.tex[key]) return MODELS.tex[key];
  const t = canvasTex(96, 64, (c, w, h) => {
    if (kind === 'us') {
      for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#f4f0e6' : '#b0201a'; c.fillRect(0, i * h / 13, w, h / 13 + 1); }
      c.fillStyle = '#22306a'; c.fillRect(0, 0, w * 0.42, h * 0.54);
      c.fillStyle = '#fff';
      for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) c.fillRect(3 + x * 6.5, 3 + y * 6.6, 2, 2);
    } else {
      c.fillStyle = '#f4f0e6'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#c0261c'; c.beginPath(); c.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2); c.fill();
    }
  });
  MODELS.tex[key] = t;
  return t;
}

function crateTexture(kind) {
  const key = 'crate' + (kind || '');
  if (MODELS.tex[key]) return MODELS.tex[key];
  const col = kind ? PRISES[kind].color : null;
  const t = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = col || '#b8894a'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 21) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y, w, 2); }
    grain(c, w, h, 500, '#3a2410', 0.35);
    c.strokeStyle = col ? 'rgba(255,255,255,0.75)' : '#4a3218'; c.lineWidth = 10;
    c.strokeRect(5, 5, w - 10, h - 10);
    c.beginPath(); c.moveTo(8, 8); c.lineTo(w - 8, h - 8); c.stroke();
    if (!kind) { c.fillStyle = '#a8261c'; c.beginPath(); c.arc(w * 0.7, h * 0.3, 11, 0, Math.PI * 2); c.fill(); }
    else {
      c.fillStyle = '#fff'; c.font = 'bold 64px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText({ voilure: '帆', coque: '船', canons: '砲' }[kind], w / 2, h / 2 + 2);
    }
  });
  MODELS.tex[key] = t;
  return t;
}

function barrelTexture() {
  if (MODELS.tex.barrel) return MODELS.tex.barrel;
  const t = canvasTex(128, 64, (c, w, h) => {
    c.fillStyle = '#7a5530'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 9) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, 0, 1, h); }
    c.fillStyle = '#2c2420'; for (const y of [6, 20, 40, 54]) c.fillRect(0, y, w, 4);
    grain(c, w, h, 300, '#2a1a0c', 0.3);
  });
  MODELS.tex.barrel = t;
  return t;
}

function woodMat(col) {
  const key = 'wood' + col;
  if (!MODELS.mats[key]) {
    const t = canvasTex(128, 32, (c, w, h) => {
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.18})`; c.fillRect(0, y, w, 1); }
      grain(c, w, h, 200, '#000', 0.2);
    });
    MODELS.mats[key] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  }
  return MODELS.mats[key];
}
const stdMat = (col, rough, metal) => {
  const key = 'm' + col + (rough || 0.8) + (metal || 0);
  if (!MODELS.mats[key]) MODELS.mats[key] = new THREE.MeshStandardMaterial({ color: col, roughness: rough === undefined ? 0.8 : rough, metalness: metal || 0 });
  return MODELS.mats[key];
};

function cyl(r0, r1, h, col, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg || 8), typeof col === 'string' ? stdMat(col, 0.85) : col);
  m.castShadow = true;
  return m;
}

/* ---------- fusion des pièces fixes ----------
 * Un navire compte des centaines de petites pièces. On les fond en un seul maillage
 * par matière, ce qui divise d'autant le travail de la carte graphique à chaque image.
 * Les pièces qui bougent (vergues, cornes, focs, pavillon) restent à part. */
function mergeGeos(list) {
  const names = Object.keys(list[0][0].attributes);
  let nv = 0, ni = 0;
  for (const [g] of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const out = {};
  for (const n of names) out[n] = new Float32Array(nv * list[0][0].attributes[n].itemSize);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const nm = new THREE.Matrix3(), v = new THREE.Vector3();
  let vo = 0, io = 0;
  for (const [g, m] of list) {
    const n = g.attributes.position.count;
    nm.getNormalMatrix(m);
    const flip = m.determinant() < 0;
    for (const name of names) {
      const a = g.attributes[name], sz = a.itemSize, dst = out[name];
      for (let i = 0; i < n; i++) {
        if (name === 'position') { v.fromBufferAttribute(a, i).applyMatrix4(m); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
        else if (name === 'normal') { v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize(); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
        else { dst[(vo + i) * sz] = a.getX(i); if (sz > 1) dst[(vo + i) * sz + 1] = a.getY(i); if (sz > 2) dst[(vo + i) * sz + 2] = a.getZ(i); if (sz > 3) dst[(vo + i) * sz + 3] = a.getW(i); }
      }
    }
    const src = g.index ? g.index.array : null, cnt = src ? src.length : n;
    for (let t = 0; t + 2 < cnt; t += 3) {
      const a0 = src ? src[t] : t, a1 = src ? src[t + 1] : t + 1, a2 = src ? src[t + 2] : t + 2;
      idx[io++] = vo + a0;
      if (flip) { idx[io++] = vo + a2; idx[io++] = vo + a1; } else { idx[io++] = vo + a1; idx[io++] = vo + a2; }
    }
    vo += n;
  }
  const geo = new THREE.BufferGeometry();
  for (const n of names) geo.setAttribute(n, new THREE.BufferAttribute(out[n], list[0][0].attributes[n].itemSize));
  geo.setIndex(new THREE.BufferAttribute(idx.subarray(0, io), 1));
  geo.computeBoundingSphere();
  return geo;
}

function mergeStatic(root, keep) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o === root || o.isInstancedMesh || Array.isArray(o.material) || !o.visible) return;
    for (let a = o; a && a !== root; a = a.parent) if ((keep && keep.has(a)) || a.userData.keep || !a.visible) return;
    const g = o.geometry;
    if (!g.attributes.position || !g.attributes.normal || (g.morphAttributes && Object.keys(g.morphAttributes).length)) return;
    const key = o.material.uuid + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + Object.keys(g.attributes).sort().join(',') + '|' + o.renderOrder;
    let e = groups.get(key);
    if (!e) groups.set(key, (e = { o, list: [], meshes: [] }));
    e.list.push([g, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)]);
    e.meshes.push(o);
  });
  for (const e of groups.values()) {
    if (e.meshes.length < 2) continue;
    const m = new THREE.Mesh(mergeGeos(e.list), e.o.material);
    m.castShadow = e.o.castShadow; m.receiveShadow = e.o.receiveShadow; m.renderOrder = e.o.renderOrder;
    for (const x of e.meshes) x.parent.remove(x);
    root.add(m);
  }
  return root;
}

/* ---------- objets de la mer ---------- */

/* brûlot : une jonque bourrée de paille et de poix, en flammes */
function buildFireBoat(r) {
  const g = new THREE.Group();
  const L = r * 2.1 / SCALE, B = L * 0.34;
  const H = buildHull({ L, B, look: {} }, { freeboard: 1.2 });
  const hull = new THREE.Mesh(H.sides, new THREE.MeshStandardMaterial({ color: 0x1c140e, roughness: 0.9, emissive: 0x501400, emissiveIntensity: 0.6 }));
  hull.castShadow = true;
  g.add(hull);
  /* le chargement qui brûle : fagots incandescents */
  const ember = new THREE.MeshStandardMaterial({ color: 0x2a1408, emissive: 0xff6a18, emissiveIntensity: 1.4, roughness: 1 });
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(L * 0.16, 1.1 + (i % 2) * 0.5, B * 0.55), ember);
    f.position.set((i - 2) * L * 0.15, 1.5 + (i % 2) * 0.3, ((i * 37) % 5 - 2) * 0.12);
    f.rotation.y = (i - 2) * 0.25;
    g.add(f);
  }
  /* le mât, nu, noirci */
  const m = cyl(0.18, 0.25, L * 0.5, '#120c08', 6);
  m.position.set(L * 0.1, L * 0.25 + 1, 0); m.rotation.z = 0.25;
  g.add(m);
  return mergeStatic(g);
}

function buildCrate(kind) {
  const s = kind ? 3.4 : 3;
  const m = new THREE.Mesh(new THREE.BoxGeometry(s * 2, s * 1.6, s * 2), new THREE.MeshStandardMaterial({ map: crateTexture(kind), roughness: 0.8, emissive: kind ? new THREE.Color(PRISES[kind].color) : 0x000000, emissiveIntensity: kind ? 0.25 : 0 }));
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  m.position.y = s * 0.45;
  return g;
}

/* chaloupe chargée d'hommes */
function buildLaunch() {
  const g = new THREE.Group();
  const H = buildHull({ L: 9, B: 2.6, look: {} }, { freeboard: 0.8 });
  const hull = new THREE.Mesh(H.sides, woodMat('#7a5a38'));
  hull.castShadow = true;
  g.add(hull);
  const men = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.32, 0.6, 2, 6), stdMat('#20242c', 0.9), 6);
  const M = new THREE.Matrix4();
  for (let i = 0; i < 6; i++) { M.makeTranslation(-3 + i * 1.2, 1.1, i % 2 ? 0.55 : -0.55); men.setMatrixAt(i, M); }
  men.castShadow = true;
  g.add(men);
  return g;
}

/* épave échouée : le Kaiyō Maru ou le Shinsoku, couché sur le flanc, mâts brisés */
function buildWreck(w) {
  const sp = { id: 'wreck-' + w.name, L: w.L, B: w.B, look: { hull: '#26221e', stripe: '#3a342c', deck: '#6d5c46', masts: [], stumps: w.masts, funnel: w.funnel, boats: 0 }, rig: 'square', kind: 'épave', armament: [] };
  const root = buildShipModel(sp);
  const P = root.userData.parts;
  P.flag.visible = false;
  P.tilt.rotation.x = 0.32;
  P.tilt.position.y = -1.6;
  return root;
}
