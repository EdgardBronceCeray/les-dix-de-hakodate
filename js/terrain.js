'use strict';

/* Les côtes en relief, tirées des mêmes polygones que les collisions :
 * une distance signée au rivage donne la hauteur ; la neige, l'herbe,
 * la roche et les plages suivent la pente et l'altitude ; puis des forêts
 * et des villages, instanciés. */

const PALETTE = {
  hiver: { beach: '#9d988c', low: '#e6eaee', mid: '#f1f3f5', rock: '#6f6b67', forest: '#2f3b33', forestTip: '#e8eef2', roof: '#eef2f4', wall: '#5a4a3c', under: '#4a5a5e' },
  printemps: { beach: '#c4b48a', low: '#86a05a', mid: '#6d8a48', rock: '#8a8274', forest: '#2f4a2c', forestTip: '#3f6a38', roof: '#3c3c40', wall: '#b8a888', under: '#3a5a58' },
  'été': { beach: '#cbb98e', low: '#79a04e', mid: '#5f8a3e', rock: '#8c8476', forest: '#28452a', forestTip: '#3a6634', roof: '#3a3a3e', wall: '#c0b090', under: '#3a5a58' },
  soir: { beach: '#d2b98a', low: '#6f9450', mid: '#577a3e', rock: '#8a7a6a', forest: '#24402a', forestTip: '#36603a', roof: '#4a3a36', wall: '#c8b494', under: '#2a4a58' },
};

/* l'horloge du vent dans les arbres, avancée à chaque image */
const TREE_TIME = { value: 0 };

/* distance euclidienne exacte (Felzenszwalb) sur une grille */
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
function edt(grid, W_, H_) {
  const INF = 1e12, n = Math.max(W_, H_);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const out = new Float64Array(W_ * H_);
  for (let i = 0; i < W_ * H_; i++) out[i] = grid[i] ? 0 : INF;
  for (let x = 0; x < W_; x++) {
    for (let y = 0; y < H_; y++) f[y] = out[y * W_ + x];
    edt1d(f, H_, d, v, z);
    for (let y = 0; y < H_; y++) out[y * W_ + x] = d[y];
  }
  for (let y = 0; y < H_; y++) {
    for (let x = 0; x < W_; x++) f[x] = out[y * W_ + x];
    edt1d(f, W_, d, v, z);
    for (let x = 0; x < W_; x++) out[y * W_ + x] = Math.sqrt(d[x]);
  }
  return out;
}

/* les forêts et les éboulis, rangés par carrés de terrain : chaque carré est un maillage à part,
 * que le moteur écarte d'un bloc quand il sort du champ de la vue, de l'ombre ou du reflet
 * (un seul maillage pour toute la carte était dessiné en entier, même hors de l'écran).
 * Les mêmes arbres, aux mêmes places, de la même teinte : seul le découpage change. */
const CHUNK = 800;
/* les arbres et les éboulis d'un téléphone : on n'en dessine qu'une partie (voir applyQuality). Dans
 * chaque morceau de forêt, les instances sont mêlées une fois pour toutes, sans tirage au sort (un
 * simple brassage des numéros) : la partie dessinée se répartit sur toute la forêt, et sur un
 * ordinateur, qui les dessine toutes, l'image ne change pas. */
const THIN = { list: [], k: 1 };
function thinApply(m) { m.count = Math.max(1, Math.round(m.userData.full * THIN.k)); }
function thinSet(k) { THIN.k = k; for (const m of THIN.list) thinApply(m); }
function addChunks(group, inst, margin, thin) {
  const n = inst.count, a = inst.instanceMatrix.array, cells = new Map();
  for (let i = 0; i < n; i++) {
    const key = Math.floor(a[i * 16 + 12] / CHUNK) + ',' + Math.floor(a[i * 16 + 14] / CHUNK);
    let c = cells.get(key);
    if (!c) cells.set(key, (c = []));
    c.push(i);
  }
  const M = new THREE.Matrix4(), C = new THREE.Color();
  for (const idx of cells.values()) {
    if (thin) idx.sort((i, j) => ((i * 2654435761) >>> 0) - ((j * 2654435761) >>> 0));
    const m = new THREE.InstancedMesh(inst.geometry, inst.material, idx.length);
    idx.forEach((i, j) => {
      inst.getMatrixAt(i, M); m.setMatrixAt(j, M);
      if (inst.instanceColor) { inst.getColorAt(i, C); m.setColorAt(j, C); }
    });
    m.castShadow = inst.castShadow; m.receiveShadow = inst.receiveShadow;
    /* la sphère englobante, élargie de ce que le vent fait plier les cimes */
    m.computeBoundingSphere();
    m.boundingSphere.radius += margin;
    if (thin) { m.userData.full = idx.length; THIN.list.push(m); thinApply(m); }
    group.add(m);
  }
}

function buildTerrain(polys, opts) {
  const o = Object.assign({ cell: 7, season: 'hiver', hScale: 1, maxTrees: 5000, labels: [], rocks: [], seed: 1 }, opts);
  const P = PALETTE[o.season] || PALETTE.hiver;
  const group = new THREE.Group();
  if (!polys.length) return group;
  /* emprise */
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) { x0 = Math.min(x0, p.x0); y0 = Math.min(y0, p.y0); x1 = Math.max(x1, p.x1); y1 = Math.max(y1, p.y1); }
  const m = 560;                     // marge large : les hauts-fonds s'estompent avant le bord du masque
  x0 -= m; y0 -= m; x1 += m; y1 += m;
  const c = o.cell;
  const GW = Math.ceil((x1 - x0) / c) + 1, GH = Math.ceil((y1 - y0) / c) + 1;
  /* masque de la terre */
  const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0, 0, GW, GH);
  cx.fillStyle = '#fff';
  cx.beginPath();
  for (const p of polys) { const f = p.f; cx.moveTo((f[0] - x0) / c, (f[1] - y0) / c); for (let i = 2; i < f.length; i += 2) cx.lineTo((f[i] - x0) / c, (f[i + 1] - y0) / c); cx.closePath(); }
  cx.fill();
  const img = cx.getImageData(0, 0, GW, GH).data;
  const inside = new Uint8Array(GW * GH), outside = new Uint8Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) { const on = img[i * 4] > 127; inside[i] = on ? 1 : 0; outside[i] = on ? 0 : 1; }
  /* la carte est découpée au bord du terrain de jeu : au-delà, la terre continue
     comme au bord, au lieu de s'arrêter sur un faux rivage tout droit */
  if (o.clip) {
    const i0 = clamp(Math.ceil((o.clip[0] - x0) / c) + 1, 0, GW - 1), i1 = clamp(Math.floor((o.clip[2] - x0) / c) - 1, 0, GW - 1);
    const j0 = clamp(Math.ceil((o.clip[1] - y0) / c) + 1, 0, GH - 1), j1 = clamp(Math.floor((o.clip[3] - y0) / c) - 1, 0, GH - 1);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      if (i >= i0 && i <= i1 && j >= j0 && j <= j1) continue;
      const k = j * GW + i, src = clamp(j, j0, j1) * GW + clamp(i, i0, i1);
      inside[k] = inside[src]; outside[k] = 1 - inside[k];
    }
  }
  const dOut = edt(inside, GW, GH);   // distance à la terre, pour les points d'eau
  const dIn = edt(outside, GW, GH);   // distance à l'eau, pour les points de terre
  const sdf = new Float32Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) sdf[i] = (inside[i] ? dIn[i] - 0.5 : -(dOut[i] - 0.5)) * c;
  /* la distance tirée d'une grille fait des marches d'escalier le long du rivage : on l'adoucit */
  {
    const t2 = new Float32Array(GW * GH), R = 2;
    for (let pass = 0; pass < 3; pass++) {
      for (let j = 0; j < GH; j++) {
        let acc = 0, n = 0;
        for (let i = -R; i <= R; i++) if (i >= 0 && i < GW) { acc += sdf[j * GW + i]; n++; }
        for (let i = 0; i < GW; i++) {
          t2[j * GW + i] = acc / n;
          const a = i - R, b = i + R + 1;
          if (a >= 0) { acc -= sdf[j * GW + a]; n--; }
          if (b < GW) { acc += sdf[j * GW + b]; n++; }
        }
      }
      for (let i = 0; i < GW; i++) {
        let acc = 0, n = 0;
        for (let j = -R; j <= R; j++) if (j >= 0 && j < GH) { acc += t2[j * GW + i]; n++; }
        for (let j = 0; j < GH; j++) {
          sdf[j * GW + i] = acc / n;
          const a = j - R, b = j + R + 1;
          if (a >= 0) { acc -= t2[a * GW + i]; n--; }
          if (b < GH) { acc += t2[b * GW + i]; n++; }
        }
      }
    }
  }
  /* hauteurs */
  const Hh = new Float32Array(GW * GH);
  const rough = o.season === 'hiver' ? 1 : 1;
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const k = j * GW + i, d = sdf[k];
    const wx = x0 + i * c, wy = y0 + j * c;
    const n1 = fbm(wx * 0.0042 + o.seed, wy * 0.0042 - o.seed, 4);
    const n2 = vnoise(wx * 0.03, wy * 0.03);
    let h;
    if (d > 0) {
      /* tantôt une plage, tantôt une falaise qui tombe droit dans la mer */
      const cliff = smooth(clamp((vnoise(wx * 0.0032 + 5.3, wy * 0.0032 - 9.1) - 0.48) * 4, 0, 1));
      const shore = lerp(Math.min(d * 0.28, 2.8), Math.min(d * 1.7, 16 + 12 * n2), cliff);
      const rise = smooth(clamp(d / 150, 0, 1));
      h = shore + rise * (6 + 90 * n1 * n1 * o.hScale + 5 * n2) * rough;
    } else h = Math.max(-14, d * 0.25) - 0.6;
    Hh[k] = h;
  }
  const col = (hex) => new THREE.Color(hex);
  const C = { beach: col(P.beach), low: col(P.low), mid: col(P.mid), rock: col(P.rock), under: col(P.under), forest: col(P.forest) };
  /* tuiles : seulement là où il y a de la terre */
  const T = 64;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  /* le grain du sol : des taches d'herbe, de terre et de lumière, calculées au pixel */
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = `varying vec3 vWP;
      float th(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float tn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(th(i), th(i + vec2(1, 0)), u.x), mix(th(i + vec2(0, 1)), th(i + vec2(1, 1)), u.x), u.y); }
      ` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 q = vWP.xz;
          float a = tn(q * 0.045) * 0.5 + tn(q * 0.13) * 0.3 + tn(q * 0.41) * 0.2;
          float speck = tn(q * 1.3);
          float land = smoothstep(1.5, 4.0, vWP.y);
          diffuseColor.rgb *= mix(1.0, 0.8 + 0.34 * a + 0.08 * (speck - 0.5), land);
          /* sable mouillé au bord de l'eau */
          diffuseColor.rgb *= mix(0.78, 1.0, smoothstep(0.0, 1.2, vWP.y));
        }`);
  };
  const tmp = new THREE.Color();
  for (let tj = 0; tj < GH - 1; tj += T) for (let ti = 0; ti < GW - 1; ti += T) {
    const nw = Math.min(T, GW - 1 - ti), nh = Math.min(T, GH - 1 - tj);
    let any = false;
    for (let j = tj; j <= tj + nh && !any; j++) for (let i = ti; i <= ti + nw; i++) if (sdf[j * GW + i] > -25) { any = true; break; }
    if (!any) continue;
    const geo = new THREE.PlaneGeometry(nw * c, nh * c, nw, nh);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      /* la grille de PlaneGeometry va de -w/2 à w/2 ; après rotation, z vers le sud */
      const li = Math.round((pos.getX(v) + nw * c / 2) / c), lj = Math.round((pos.getZ(v) + nh * c / 2) / c);
      const gi = ti + li, gj = tj + lj, k = gj * GW + gi;
      const h = Hh[k];
      pos.setY(v, h);
      const d = sdf[k];
      const hx = Hh[k + (gi < GW - 1 ? 1 : 0)] - Hh[k - (gi > 0 ? 1 : 0)];
      const hz = Hh[k + (gj < GH - 1 ? GW : 0)] - Hh[k - (gj > 0 ? GW : 0)];
      const slope = Math.hypot(hx, hz) / (2 * c);
      const wx = x0 + gi * c, wy = y0 + gj * c;
      const n = vnoise(wx * 0.02, wy * 0.02);
      if (h < 0.2) tmp.copy(C.under).lerp(C.beach, clamp((h + 3) / 3.2, 0, 1));
      else {
        /* du sable à l'herbe en fondu, sans marche d'escalier */
        tmp.copy(C.low).lerp(C.mid, clamp((h - 10) / 50 + (n - 0.5) * 0.4, 0, 1));
        const forest = fbm(wx * 0.006 + 40, wy * 0.006 - 13, 3);
        if (forest > 0.52 && o.season !== 'hiver') tmp.lerp(C.forest, clamp((forest - 0.52) * 4, 0, 0.6));
        tmp.lerp(C.rock, smooth(clamp((slope - 0.45) * 2.2, 0, 1)));
        const sandK = 1 - smooth(clamp((h - (1.6 + n * 1.5)) / 2.2, 0, 1));
        tmp.lerp(C.beach, sandK);
      }
      const shade = 0.92 + n * 0.16;
      colors[v * 3] = tmp.r * shade; colors[v * 3 + 1] = tmp.g * shade; colors[v * 3 + 2] = tmp.b * shade;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x0 + (ti + nw / 2) * c, 0, y0 + (tj + nh / 2) * c);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  }
  const heightAt = (x, y) => {
    const i = clamp(Math.round((x - x0) / c), 0, GW - 1), j = clamp(Math.round((y - y0) / c), 0, GH - 1);
    return [Hh[j * GW + i], sdf[j * GW + i]];
  };
  /* pour poser les maisons : la hauteur exacte du sol dessiné (les deux triangles de chaque case,
   * comme le maillage les coupe), et la distance au rivage, lissée entre les points de la grille */
  const S = {
    h(x, y) {
      const fx = (x - x0) / c, fy = (y - y0) / c;
      const i = clamp(Math.floor(fx), 0, GW - 2), j = clamp(Math.floor(fy), 0, GH - 2);
      const u = clamp(fx - i, 0, 1), v = clamp(fy - j, 0, 1);
      const a = Hh[j * GW + i], b = Hh[(j + 1) * GW + i], cc = Hh[(j + 1) * GW + i + 1], d = Hh[j * GW + i + 1];
      return u + v <= 1 ? a + u * (d - a) + v * (b - a) : cc + (1 - u) * (b - cc) + (1 - v) * (d - cc);
    },
    d(x, y) {
      const fx = (x - x0) / c, fy = (y - y0) / c;
      const i = clamp(Math.floor(fx), 0, GW - 2), j = clamp(Math.floor(fy), 0, GH - 2);
      const u = clamp(fx - i, 0, 1), v = clamp(fy - j, 0, 1);
      const k = j * GW + i;
      return lerp(lerp(sdf[k], sdf[k + 1], u), lerp(sdf[k + GW], sdf[k + GW + 1], u), v);
    },
  };
  group.userData.heightAt = heightAt;
  group.userData.sampler = S;
  /* ce que le jeu doit placer avant les villages (le corsaire : ses forts avancés) ; ce qu'il
   * renvoie, les cercles où l'on ne bâtit pas */
  const excl = o.beforeTowns ? o.beforeTowns(heightAt, S) || [] : [];
  /* les villages et les villes, autour des noms de lieux : un maillage par lieu */
  const occ = new Map(), OC = 8;
  const mark = (x, y, rad) => {
    for (let j = Math.floor((y - rad) / OC); j <= Math.floor((y + rad) / OC); j++) for (let i = Math.floor((x - rad) / OC); i <= Math.floor((x + rad) / OC); i++) occ.set(i + ',' + j, 1);
  };
  let nHouses = 0;
  for (const lab of o.labels) {
    if (lab.noTown) continue;
    const v = buildVillage(lab, S, { season: o.season, north: !!lab.north, ezo: !!lab.ezo, excl, seed: o.seed });
    if (!v) continue;
    for (const [x, y, rad] of v.userData.occ) mark(x, y, rad + 3);
    v.userData.lab = lab;
    nHouses += v.userData.houses;
    group.add(v);
  }
  for (const [x, y, rad] of excl) mark(x, y, rad);
  group.userData.houses = nHouses;
  /* forêts */
  const rr = makeRng(o.seed * 7 + 3);
  const trees = [];
  const step = 15;
  const tryTree = (px, py) => {
    const [h, d] = heightAt(px, py);
    if (d < 16 || h < 4) return;
    if (occ.has(Math.floor(px / OC) + ',' + Math.floor(py / OC))) return;
    const forest = fbm(px * 0.006 + 40, py * 0.006 - 13, 3);
    if (forest < 0.5 + rr() * 0.08) return;
    const [hx] = heightAt(px + c, py), [hz] = heightAt(px, py + c);
    if (Math.hypot(hx - h, hz - h) / c > 0.75) return;
    trees.push([px, h, py, rr.range(0.7, 1.35)]);
  };
  if (o.treeRandom) {
    /* une grande carte : des arbres tirés au hasard sur toute l'étendue, pas seulement au nord-ouest */
    for (let t = 0; t < o.maxTrees * 40 && trees.length < o.maxTrees; t++) tryTree(x0 + rr() * (x1 - x0), y0 + rr() * (y1 - y0));
  } else {
    for (let y = y0; y < y1 && trees.length < o.maxTrees; y += step) for (let x = x0; x < x1 && trees.length < o.maxTrees; x += step) tryTree(x + rr.sym(step * 0.45), y + rr.sym(step * 0.45));
  }
  if (trees.length) {
    /* deux essences : des conifères en étages, et des feuillus en boule (sauf l'hiver, où ne restent que les résineux) */
    const broadShare = o.season === 'hiver' ? 0 : 0.38;
    const conifers = [], broads = [];
    for (const t of trees) (rr() < broadShare ? broads : conifers).push(t);
    const paint = (geo, fn) => {
      const n = geo.attributes.position.count, cc = new Float32Array(n * 3);
      for (let v = 0; v < n; v++) { fn(geo.attributes.position.getY(v), tmp); cc[v * 3] = tmp.r; cc[v * 3 + 1] = tmp.g; cc[v * 3 + 2] = tmp.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      return geo;
    };
    const I = new THREE.Matrix4();
    const at = (geo, y) => [geo, new THREE.Matrix4().makeTranslation(0, y, 0)];
    const trunkCol = col('#4a3626'), base = col(P.forest), tip = col(P.forestTip);
    const coniferGeo = paint(mergeGeos([
      at(new THREE.CylinderGeometry(0.55, 0.75, 4, 5), 2),
      at(new THREE.ConeGeometry(5.8, 9, 8), 7.5),
      at(new THREE.ConeGeometry(4.5, 8, 8), 11.5),
      at(new THREE.ConeGeometry(3.1, 7, 7), 15.5),
    ]), (y, c) => {
      if (y < 3.2) { c.copy(trunkCol); return; }
      const t = clamp((y - 3) / 16, 0, 1);
      c.copy(base).lerp(tip, o.season === 'hiver' ? smooth(clamp((t - 0.2) * 1.4, 0, 1)) * 0.95 : t * 0.55);
    });
    const leaf = o.season === 'hiver' ? col('#4a5048') : o.season === 'soir' ? col('#4f6a34') : col('#56803c');
    const leafTip = o.season === 'printemps' ? col('#7fa858') : col('#6f9a48');
    const broadGeo = paint(mergeGeos([
      at(new THREE.CylinderGeometry(0.5, 0.8, 6, 5), 3),
      [new THREE.IcosahedronGeometry(5.2, 0), new THREE.Matrix4().makeTranslation(0, 9.5, 0)],
      [new THREE.IcosahedronGeometry(3.6, 0), new THREE.Matrix4().makeTranslation(2.6, 7.8, 1.4)],
      [new THREE.IcosahedronGeometry(3.4, 0), new THREE.Matrix4().makeTranslation(-2.4, 8.2, -1.6)],
    ]), (y, c) => { if (y < 5) c.copy(trunkCol); else c.copy(leaf).lerp(leafTip, clamp((y - 6) / 9, 0, 1)); });
    /* le vent dans les cimes */
    const swayMat = () => {
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = TREE_TIME;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
          #else
            vec2 ip = vec2(0.0);
          #endif
          float sw = max(0.0, transformed.y - 3.0) / 16.0; sw *= sw;
          float gust = 0.6 + 0.4 * sin(uTime * 0.37 + ip.x * 0.004);
          transformed.x += sin(uTime * 1.3 + ip.x * 0.031 + ip.y * 0.017) * sw * 0.9 * gust;
          transformed.z += cos(uTime * 1.1 + ip.x * 0.023 - ip.y * 0.029) * sw * 0.6 * gust;`);
      };
      return m;
    };
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3();
    for (const [list, geo] of [[conifers, coniferGeo], [broads, broadGeo]]) {
      if (!list.length) continue;
      const inst = new THREE.InstancedMesh(geo, swayMat(), list.length);
      list.forEach(([x, h, y, sc], i) => {
        Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * TAU);
        S.set(sc, sc * rr.range(0.85, 1.2), sc);
        V.set(x, h - 1, y);
        M.compose(V, Q, S);
        inst.setMatrixAt(i, M);
        inst.setColorAt(i, tmp.setHSL(0, 0, rr.range(0.82, 1.08)));
      });
      inst.castShadow = true; inst.receiveShadow = true;
      addChunks(group, inst, 3, true);
    }
  }
  /* éboulis au pied des falaises */
  const boulders = [];
  for (const p of polys) {
    const f = p.f, n = f.length / 2;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const ax = f[i * 2], ay = f[i * 2 + 1], bx = f[((i + 1) % n) * 2], by = f[((i + 1) % n) * 2 + 1];
      const l = Math.hypot(bx - ax, by - ay);
      acc += l;
      while (acc > 22 && boulders.length < (o.maxBoulders || 1400)) {
        acc -= 22;
        const t = rr(), x = lerp(ax, bx, t), y = lerp(ay, by, t);
        const cliff = vnoise(x * 0.0032 + 5.3, y * 0.0032 - 9.1);
        if (cliff < 0.5 || rr() < 0.35) continue;
        const nx = (by - ay) / (l || 1), ny = -(bx - ax) / (l || 1);
        const off = rr.range(-2, 6);
        boulders.push([x + nx * off, y + ny * off, rr.range(2.5, 6.5)]);
      }
    }
  }
  if (boulders.length) {
    const g = new THREE.DodecahedronGeometry(1, 0);
    const inst = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x5a5650, roughness: 0.95, flatShading: true }), boulders.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3();
    boulders.forEach(([x, y, r], i) => {
      const [hh] = heightAt(x, y);
      Q.setFromEuler(new THREE.Euler(rr() * 3, rr() * 3, rr() * 3));
      S.set(r, r * 0.7, r * rr.range(0.7, 1.2));
      V.set(x, Math.max(-0.5, hh * 0.3), y);
      M.compose(V, Q, S);
      inst.setMatrixAt(i, M);
    });
    inst.castShadow = true; inst.receiveShadow = true;
    addChunks(group, inst, 0.5, true);
  }
  /* écueils */
  if (o.rocks.length) {
    const g = new THREE.DodecahedronGeometry(1, 0);
    const inst = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x3e3c3a, roughness: 0.95, flatShading: true }), o.rocks.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3();
    o.rocks.forEach((r, i) => {
      Q.setFromEuler(new THREE.Euler(rr() * 3, rr() * 3, rr() * 3));
      const s = r.r * 0.7;
      S.set(s, s * 0.55, s * rr.range(0.7, 1.1));
      V.set(r.x, 0, r.y);
      M.compose(V, Q, S);
      inst.setMatrixAt(i, M);
    });
    inst.castShadow = true;
    group.add(inst);
  }
  group.userData.heightAt = heightAt;
  /* masque pour la mer : R = ressac (0,5 au rivage), G = hauts-fonds */
  const tex = new Uint8Array(GW * GH * 4);
  for (let i = 0; i < GW * GH; i++) {
    const d = sdf[i];
    tex[i * 4] = clamp(0.5 + d / 60, 0, 1) * 255;
    tex[i * 4 + 1] = (d >= 0 ? 1 : Math.exp(d / 160)) * 255;
    tex[i * 4 + 3] = 255;
  }
  group.userData.mask = { data: tex, GW, GH, x0, y0, w: GW * c, h: GH * c };
  return group;
}

/* le port de l'arcade : jetée, phare, entrepôts */
function buildPort(x, y, h) {
  const g = new THREE.Group();
  const wood = woodMat('#6a5034');
  const len = 120;
  const pier = new THREE.Mesh(new THREE.BoxGeometry(len, 3, 13), wood);
  pier.position.set(len / 2, 2.2, 0); pier.castShadow = pier.receiveShadow = true;
  g.add(pier);
  for (let i = 0; i < 6; i++) {
    const p = cyl(1.2, 1.2, 8, stdMat('#3a2a1a', 0.9), 6);
    p.position.set(10 + i * 21, -1, 7.5); g.add(p);
    const p2 = p.clone(); p2.position.z = -7.5; g.add(p2);
  }
  const tower = cyl(5, 7, 34, stdMat('#e8e2d6', 0.7), 12);
  tower.position.set(len + 6, 17, 0);
  g.add(tower);
  const band = cyl(5.6, 5.8, 5, stdMat('#a8382b', 0.7), 12);
  band.position.set(len + 6, 24, 0);
  g.add(band);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.6) }));
  lamp.position.set(len + 6, 37, 0);
  g.add(lamp);
  g.userData.lamp = lamp;
  g.position.set(x, 0, y);
  g.rotation.y = -h;
  return g;
}
