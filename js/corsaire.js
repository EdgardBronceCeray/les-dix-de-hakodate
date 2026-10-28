'use strict';

/* ---------- mode corsaire : les navires de l'époque, mis en scène ----------
 * Dans les années 1860, la marine change d'âge : la vapeur s'ajoute à la voile, l'hélice remplace
 * les roues à aubes, le fer couvre le bois. Ce mode met ces navires en scène. On part de Hakodate
 * sur une coque de noix, avec soixante pièces d'or. L'or se trouve dans les coffres qui flottent,
 * dans les épaves des navires qu'on coule, dans les cales des navires qu'on prend à l'abordage,
 * dans les magasins des ports qu'on conquiert. Il se dépense au chantier d'un port à vous
 * (shipyard.js) : le navire s'y construit pièce par pièce, sous vos yeux, et chaque pièce y a son
 * cartel, qui dit ce qu'elle était à l'époque. Pas de niveaux : la mer devient plus dure à mesure
 * que votre navire et votre domaine grandissent. Un port dont on a détruit la batterie se prend ;
 * on le fortifie ensuite, car l'ennemi envoie des escadres le reprendre. Tous les ports pris, le
 * Japon est à vous (une conquête qui n'a existé que sur cette carte). Trois façons de vaincre un
 * navire : le canon ; l'éperon (la vitesse et la cuirasse font le choc) ; l'abordage (rester bord
 * à bord). Une seule jauge d'autonomie dit quand rentrer : les vivres s'épuisent avec le temps, et
 * une machine y ajoute son charbon ; à vide, un tiers de l'allure. Dans chaque port à vous, on
 * répare, on refait le plein et l'on touche le tribut. */

const CORS = { polys: null, raster: null, nav: null, sites: null, forts: false, placed: false };

/* ---------- la carte : terre en grille, chenaux de navigation, ports ---------- */

function corsRaster(polys, W_, H_, cell) {
  const GW = Math.ceil(W_ / cell), GH = Math.ceil(H_ / cell);
  const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH;
  const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, GW, GH);
  c.fillStyle = '#fff'; c.beginPath();
  for (const p of polys) { const f = p.f; c.moveTo(f[0] / cell, f[1] / cell); for (let i = 2; i < f.length; i += 2) c.lineTo(f[i] / cell, f[i + 1] / cell); c.closePath(); }
  c.fill();
  const d = c.getImageData(0, 0, GW, GH).data, land = new Uint8Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) land[i] = d[i * 4] > 127 ? 1 : 0;
  return {
    GW, GH, cell, land,
    at(x, y) {
      const i = Math.floor(x / cell), j = Math.floor(y / cell);
      if (i < 0 || j < 0 || i >= GW || j >= GH) return false;
      return land[j * GW + i] === 1;
    },
  };
}

/* assez d'eau libre autour d'un point pour un navire */
function corsClear(x, y, r) {
  const R = CORS.raster;
  if (R.at(x, y)) return false;
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; if (R.at(x + Math.cos(a) * r, y + Math.sin(a) * r)) return false; }
  return true;
}

function corsLos(x0, y0, x1, y1, r) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 45);
  for (let i = 1; i < n; i++) { const t = i / n; if (!corsClear(lerp(x0, x1, t), lerp(y0, y1, t), r)) return false; }
  return true;
}

/* le mouillage d'un port (eau libre la plus proche de la ville) et sa batterie (sur le rivage) */
function corsSite(p) {
  const R = CORS.raster;
  let hx = p.x, hy = p.y, found = false;
  for (let r = 0; r <= 3200 && !found; r += 40) {
    const n = Math.max(1, Math.round(r / 30));
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (corsClear(x, y, 180)) { hx = x; hy = y; found = true; break; }
    }
  }
  let bx = p.x, by = p.y;
  const dx = p.x - hx, dy = p.y - hy, l = Math.hypot(dx, dy);
  let onLand = false;
  if (l > 30) {
    for (let t = 0; t <= l + 600; t += 8) {
      const x = hx + dx / l * t, y = hy + dy / l * t;
      if (R.at(x, y)) { bx = x + dx / l * 28; by = y + dy / l * 28; onLand = true; break; }
    }
  }
  if (!onLand) {
    /* la ville est au bord de l'eau : la terre la plus proche du mouillage */
    for (let r = 40; r <= 1600 && !onLand; r += 30) for (let k = 0; k < 32; k++) {
      const a = k / 32 * TAU, x = hx + Math.cos(a) * r, y = hy + Math.sin(a) * r;
      if (R.at(x, y)) { bx = x + Math.cos(a) * 28; by = y + Math.sin(a) * 28; onLand = true; break; }
    }
  }
  /* la plage devant la ville : là où l'eau finit, du mouillage vers la batterie ; le mouillage du
   * débarquement, à une encablure de la grève */
  let sx = bx, sy = by;
  const ex = bx - hx, ey = by - hy, ll = Math.hypot(ex, ey) || 1;
  for (let t = 0; t <= ll; t += 6) { const x = hx + ex / ll * t, y = hy + ey / ll * t; if (R.at(x, y)) { sx = x; sy = y; break; } }
  const back = clamp(dist(hx, hy, sx, sy) - 30, 40, 75);
  return { id: p.id, name: p.name, jp: p.jp, role: p.role, cx: p.x, cy: p.y, hx, hy, bx, by, sx, sy, lx: sx - ex / ll * back, ly: sy - ey / ll * back };
}

/* les forts avancés d'un port : sur les pointes qui commandent ses approches, entre 260 et 820 du
 * mouillage, loin de la batterie et l'un de l'autre ; tournés vers la mer. Avec le relief (hAt),
 * on les veut sur une pointe qu'on voit : le rivage dessiné est adouci, et une pointe mince y
 * fond dans la mer ; on recule un peu dans les terres, pas trop, pour que les boulets les touchent */
function corsOutposts(site, n, hAt) {
  if (!n) return [];
  const R = CORS.raster, cands = [], out = [];
  for (let k = 0; k < 72; k++) {
    const a = k / 72 * TAU;
    for (let r = 120; r <= 820; r += 10) {
      const x = site.hx + Math.cos(a) * r, y = site.hy + Math.sin(a) * r;
      if (!R.at(x, y)) continue;
      if (r >= 260) {
        let best = null;
        for (const inl of [22, 30, 38]) {
          const ix = x + Math.cos(a) * inl, iy = y + Math.sin(a) * inl;
          if (!R.at(ix, iy)) break;
          const vis = hAt ? hAt(ix, iy)[1] : 99;
          if (!best || (best.vis < 8 && vis > best.vis)) best = { ix, iy, vis };
          if (vis >= 8) break;
        }
        if (best) {
          /* une pointe : de l'eau tout autour */
          let w = 0;
          for (let j = 0; j < 16; j++) { const b = j / 16 * TAU; if (!R.at(x + Math.cos(b) * 160, y + Math.sin(b) * 160)) w++; }
          cands.push({ x: best.ix, y: best.iy, a: a + Math.PI, r, w, vis: best.vis });
        }
      }
      break;
    }
  }
  cands.sort((p, q) => q.w - p.w || p.r - q.r);
  for (const min of [8, -4, -24, -1e9]) for (const c of cands) {
    if (out.length >= n) break;
    if (c.vis < min || dist(c.x, c.y, site.bx, site.by) < 380 || out.some((o) => dist(o.x, o.y, c.x, c.y) < 420)) continue;
    out.push({ x: c.x, y: c.y, a: c.a });
  }
  return out;
}

/* une fois le relief bâti : le mouillage du débarquement dans de l'eau franche (au fond d'une anse
 * étroite, le rivage dessiné avance sur l'eau de la carte), la grève des chaloupes sur la terre
 * qu'on voit, et les forts avancés sur des pointes qu'on voit */
function corsPlace(p, hAt) {
  const ex = p.hx - p.sx, ey = p.hy - p.sy, l = Math.hypot(ex, ey) || 1;
  let t = Math.min(l, dist(p.sx, p.sy, p.lx, p.ly));
  while (t < l) {
    const x = p.sx + ex / l * t, y = p.sy + ey / l * t;
    if (hAt(x, y)[1] <= -40 && corsClear(x, y, 30)) break;
    t += 6;
  }
  t = Math.min(t, l);
  p.lx = p.sx + ex / l * t; p.ly = p.sy + ey / l * t;
  const fx = p.bx - p.lx, fy = p.by - p.ly, lb = Math.hypot(fx, fy) || 1;
  for (let k = 0; k <= lb; k += 6) {
    const x = p.lx + fx / lb * k, y = p.ly + fy / lb * k;
    if (hAt(x, y)[1] >= 4) { p.sx = x; p.sy = y; break; }
  }
  p.outs = corsOutposts(p, CORS_OUTPOSTS[p.id] || 0, hAt);
  /* la grève des chaloupes : depuis le mouillage, le rivage le plus proche de la ville, loin de la
   * batterie et des forts avancés (on ne s'échoue pas au pied des murs) */
  let best = null;
  for (let k = 0; k < 72; k++) {
    const a = k / 72 * TAU, c = Math.cos(a), sn = Math.sin(a);
    for (let r = 16; r <= 560; r += 6) {
      const x = p.lx + c * r, y = p.ly + sn * r;
      if (hAt(x, y)[1] < 2) continue;
      if (dist(x, y, p.bx, p.by) < 95 || p.outs.some((o) => dist(x, y, o.x, o.y) < 60)) break;
      const sc = r + 0.6 * dist(x, y, p.cx, p.cy);
      if (!best || sc < best.sc) best = { x, y, sc };
      break;
    }
  }
  p.gx = best ? best.x : p.sx; p.gy = best ? best.y : p.sy;
}

function corsNavGrid() {
  /* des cases de 100 unités (6 km) : les détroits de Tsugaru et de Tairadate restent ouverts */
  const C = 100, GW = Math.ceil(JAPAN.w / C), GH = Math.ceil(JAPAN.h / C), free = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) free[j * GW + i] = corsClear((i + 0.5) * C, (j + 0.5) * C, 52) ? 1 : 0;
  return { C, GW, GH, free };
}

/* une route d'eau d'un point à un autre : A* sur la grille, puis lissée en lignes droites */
function corsPath(x0, y0, x1, y1) {
  const N = CORS.nav, C = N.C, GW = N.GW, GH = N.GH;
  const cellOf = (x, y) => [clamp(Math.floor(x / C), 0, GW - 1), clamp(Math.floor(y / C), 0, GH - 1)];
  const nearestFree = (i, j) => {
    if (N.free[j * GW + i]) return j * GW + i;
    for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const a = i + di, b = j + dj;
      if (a >= 0 && b >= 0 && a < GW && b < GH && N.free[b * GW + a]) return b * GW + a;
    }
    return -1;
  };
  const s = nearestFree(...cellOf(x0, y0)), t = nearestFree(...cellOf(x1, y1));
  if (s < 0 || t < 0) return [[x1, y1]];
  const ti = t % GW, tj = (t / GW) | 0;
  const g = new Float32Array(GW * GH).fill(Infinity), from = new Int32Array(GW * GH).fill(-1), closed = new Uint8Array(GW * GH);
  const heap = [];
  const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const hEst = (n) => { const dx = Math.abs(n % GW - ti), dy = Math.abs(((n / GW) | 0) - tj); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  g[s] = 0; push(s, hEst(s));
  let steps = 0;
  while (heap.length && steps++ < 160000) {
    const [, n] = pop();
    if (n === t) break;
    if (closed[n]) continue;
    closed[n] = 1;
    const ni = n % GW, nj = (n / GW) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const a = ni + di, b = nj + dj;
      if (a < 0 || b < 0 || a >= GW || b >= GH) continue;
      const m = b * GW + a;
      if (!N.free[m] || closed[m]) continue;
      if (di && dj && (!N.free[nj * GW + a] || !N.free[b * GW + ni])) continue;
      const ng = g[n] + (di && dj ? 1.414 : 1);
      if (ng < g[m]) { g[m] = ng; from[m] = n; push(m, ng + hEst(m)); }
    }
  }
  if (from[t] < 0 && s !== t) return [[x1, y1]];
  const cells = [];
  for (let n = t; n >= 0; n = from[n]) { cells.push([(n % GW + 0.5) * C, (((n / GW) | 0) + 0.5) * C]); if (n === s) break; }
  cells.reverse();
  cells.push([x1, y1]);
  /* lissage : on file droit tant que l'eau est libre */
  const out = [];
  let cx = x0, cy = y0, i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !corsLos(cx, cy, cells[j][0], cells[j][1], 70)) j--;
    out.push(cells[j]);
    [cx, cy] = cells[j];
    i = j + 1;
  }
  return out;
}

function corsInit() {
  if (CORS.polys) return;
  CORS.polys = JAPAN.land.map((f) => polyFrom(f.slice()));
  CORS.raster = corsRaster(CORS.polys, JAPAN.w, JAPAN.h, 16);
  CORS.sites = JAPAN.ports.map(corsSite);
  for (const p of CORS.sites) p.outs = p.role === 'home' ? [] : corsOutposts(p, CORS_OUTPOSTS[p.id] || 0);
  CORS.nav = corsNavGrid();
}

/* ---------- le monde ---------- */

/* la taille de la ville autour de chaque port : les grandes villes, les bourgs, un village au bout
 * d'Ezo ; au nord (Ezo, le haut du Tōhoku), les toits de bardeaux lestés de pierres dominent */
const CORS_VILLAGES = ['akkeshi', 'mihonoseki', 'toba'];
/* les villes dont le château avait encore son donjon en 1868 (le nombre d'étages ; 1 : le bas des
 * murs bardé de planches noires) :
 * Matsumae (achevé en 1854), Hiroshima, Hagi (démoli après 1874), Wakayama (rebâti en 1850), Kōchi,
 * Uwajima. Kanazawa, Edo, Ōsaka, Kagoshima n'en avaient plus, ou n'en avaient jamais eu. */
const CORS_CASTLES = { matsumae: [3], hiroshima: [5, 1], hagi: [5], wakayama: [3], kochi: [4], uwajima: [3] };
const corsTownClass = (p) => (p.role === 'home' || CORS_MAJOR.includes(p.id) ? 'city' : CORS_VILLAGES.includes(p.id) ? 'village' : 'town');
/* où l'on ne bâtit pas : la batterie et les forts avancés de chaque port, le fort de Hakodate */
function corsNoBuild() {
  const out = [];
  for (const p of CORS.sites) {
    out.push([p.bx, p.by, p.role === 'home' ? 66 : 58]);
    if (p.role === 'home') { const a = Math.atan2(p.hy - p.by, p.hx - p.bx); out.push([p.sx - Math.sin(a) * 95, p.sy + Math.cos(a) * 95, 22]); }
    for (const o of p.outs || []) out.push([o.x, o.y, 36]);
  }
  return out;
}

function setCorsaireWorld() {
  corsInit();
  const labels = CORS.sites.map((p) => ({ x: p.cx, y: p.cy, t: p.name, jp: p.jp, r: 240, cls: corsTownClass(p), north: p.cy < 11500, ezo: p.cy < 8400, castle: CORS_CASTLES[p.id] }));
  /* les forts avancés se placent sur le relief, avant les villes, qui les évitent */
  const beforeTowns = (hAt) => {
    if (!CORS.placed) { CORS.placed = true; for (const p of CORS.sites) if (p.role !== 'home') corsPlace(p, hAt); }
    return corsNoBuild();
  };
  setWorld({ id: 'japon', polys: CORS.polys, rocks: [], w: JAPAN.w, h: JAPAN.h, labels, palette: 'printemps', cell: 26, hScale: 1.7, seed: 7, maxTrees: 36000, treeRandom: true, maxBoulders: 3000, edge: 300, beforeTowns });
  /* la terre, en grille : bien plus rapide que les polygones, sur une carte de cette taille */
  G.mapLand = (x, y) => CORS.raster.at(x, y);
  if (R3.terrain && !CORS.placed) {
    CORS.placed = true;
    for (const p of CORS.sites) if (p.role !== 'home') corsPlace(p, R3.terrain.userData.heightAt);
  }
  /* le château des villes à donjon : là où le village l'a bâti */
  if (R3.terrain) for (const p of CORS.sites) {
    if (!CORS_CASTLES[p.id] || p.castle) continue;
    const v = R3.terrain.children.find((c) => c.userData && c.userData.castleAt && c.userData.lab && c.userData.lab.x === p.cx && c.userData.lab.y === p.cy);
    if (v) p.castle = v.userData.castleAt.slice();
  }
  if (R3.terrain && !R3.terrain.userData.forts) {
    R3.terrain.userData.forts = true;
    const hAt = R3.terrain.userData.heightAt;
    for (const p of CORS.sites) {
      R3.terrain.add(p.role === 'home' ? buildHomePort(p, hAt) : buildFort(p, hAt));
      for (const o of p.outs || []) R3.terrain.add(buildOutpost(o, hAt));
    }
  }
}

/* les forts de la côte, à la manière des daiba des années 1850 et 1860 : un polygone de pierre en
 * talus, un terre-plein de terre battue, et sur les faces qui regardent la mer un rempart de terre
 * gazonné, percé d'embrasures où les pièces sont sur leurs plateformes ; une poudrière, un corps de
 * garde, une porte côté terre, des pins aux angles. L'emprise reste celle des collisions (46 et 27). */
const FORT_PAL = () => VPAL.printemps;
const FORT_GUN = 2.9;
function fortParts(P, x, z, base, ang, B, g, pts, H, guns, r, gate, opts) {
  opts = opts || {};
  const c = Math.cos(ang), sn = Math.sin(ang);
  const W = (lx, lz) => [x + c * lx - sn * lz, z + sn * lx + c * lz];
  B.at(x, base, z, ang);
  vFort(B, pts, H, guns.map((q) => [q[0], q[1]]), FORT_PAL(), r, { embrasure: 3.1, ramparts: opts.ramparts });
  /* le chemin de ronde, de gravier, derrière les pièces ; l'allée qui y mène depuis la porte ; une
   * pile de boulets à côté de chaque pièce */
  let cx = 0, cz = 0;
  for (const [px, pz] of pts) { cx += px / pts.length; cz += pz / pts.length; }
  const gravel = vc('#b9a988', 1, r, 0.04), y = H + 0.36;
  const rear = guns.map(([lx, lz, la]) => [lx - Math.cos(la) * 6.5, lz - Math.sin(la) * 6.5]).sort((a, b) => Math.atan2(a[1] - cz, a[0] - cx) - Math.atan2(b[1] - cz, b[0] - cx));
  for (let i = 0; i + 1 < rear.length; i++) vPath(B, rear[i], rear[i + 1], 3, y, gravel);
  if (gate && rear.length) {
    /* l'allée va au milieu du chemin de ronde, ou au plus proche (opts.near) */
    const m = opts.near ? rear.reduce((a, b) => ((b[0] - gate[0]) ** 2 + (b[1] - gate[1]) ** 2 < (a[0] - gate[0]) ** 2 + (a[1] - gate[1]) ** 2 ? b : a))
      : rear.length % 2 ? rear[(rear.length - 1) / 2] : [(rear[rear.length / 2 - 1][0] + rear[rear.length / 2][0]) / 2, (rear[rear.length / 2 - 1][1] + rear[rear.length / 2][1]) / 2];
    vPath(B, gate, m, 3.4, y + 0.01, gravel);
  }
  for (const [lx, lz, la] of guns) {
    const ox = -1.2, oz = 4.1 * (lz >= 0 ? -1 : 1);
    const px = lx + Math.cos(la) * ox - Math.sin(la) * oz, pz = lz + Math.sin(la) * ox + Math.cos(la) * oz;
    B.at(x, base, z, ang);
    const W2 = B.w([px, 0, pz]);
    B.at(W2[0], base + H + 0.3, W2[2], ang + la); vShotPile(B, 0.9);
  }
  const top = base + H + 0.3;
  for (const [lx, lz, la] of guns) {
    const [wx, wz] = W(lx, lz);
    B.at(wx, top, wz, ang + la); vGunDeck(B, r, FORT_GUN / 2.4);
    const gun = gunModel(14, false, 1.2, false);
    gun.scale.setScalar(FORT_GUN);
    gun.position.set(wx, top + 0.35 + 1.2 * FORT_GUN, wz); gun.rotation.y = -(ang + la);
    g.add(gun);
  }
  return { W, top, c, sn };
}

function buildFort(P, hAt) {
  const g = new THREE.Group(), B = vBuilder(), pal = FORT_PAL();
  const r = makeRng(P.id.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0);
  const ang = Math.atan2(P.hy - P.by, P.hx - P.bx);
  const base = Math.max(1.2, hAt(P.bx, P.by)[0]);
  const H = 6;
  /* la lunette : la pointe vers la mer, deux faces, deux flancs, la gorge côté terre */
  const pts = [[44, 0], [20, 40], [-30, 32], [-30, -32], [20, -40]];
  const fa = Math.atan2(0.515, 0.858);
  const guns = [[32.2, 10.9, fa], [22.8, 26.5, fa], [32.2, -10.9, -fa], [22.8, -26.5, -fa]];
  const { W, top } = fortParts(P, P.bx, P.by, base, ang, B, g, pts, H, guns, r, [-29, 0]);
  /* la poudrière et le corps de garde, devant la gorge ; la porte, la rampe qui descend vers la ville */
  let [x, z] = W(-15, 15); B.at(x, top, z, ang + Math.PI); vMagazine(B, 12, 8, r, pal);
  [x, z] = W(-15, -15); B.at(x, top, z, ang); vHouse(B, 'tile', 16, 7.5, r, pal);
  [x, z] = W(-30, 0); B.at(x, top, z, ang + Math.PI / 2); vGate(B, r, pal);
  [x, z] = W(-30, 0); B.at(x, base, z, ang + Math.PI);
  B.face([[0, H + 0.3, -3], [0, H + 0.3, 3], [16, -1, 3], [16, -1, -3]], vc('#a8977a'), [8, -20, 0]);
  /* des pins aux épaules, à l'abri du rempart */
  for (const [lx, lz] of [[2, 29], [2, -29], [-24, -25]]) { [x, z] = W(lx, lz); B.at(x, top, z, r() * TAU); vPine(B, r, 1.0, pal); }
  /* les grandes villes : deux mortiers, au milieu du terre-plein, pointés haut vers la mer */
  if (P.major) for (const lz of [11, -11]) { [x, z] = W(6, lz); fortMortar(g, x, top, z, ang); }
  /* le mât de signaux, où l'on hisse l'alarme */
  const mast = cyl(0.8, 1.1, 24, '#4a3a2a', 6);
  [x, z] = W(-22, 24); mast.position.set(x, top + 12, z); g.add(mast);
  const mesh = new THREE.Mesh(B.geometry(), VMAT());
  g.add(mesh);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return mergeStatic(g);
}

/* un mortier sur son affût de bois : un fût court et gros, pointé à quarante-cinq degrés */
function fortMortar(g, x, y, z, ang) {
  const iron = stdMat('#1d1d20', 0.45, 0.6), wood = stdMat('#4a3a2a', 0.85);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.8, 5.2), wood);
  bed.position.set(x, y + 0.9, z); bed.rotation.y = -ang; bed.castShadow = true; g.add(bed);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.1, 4.8, 14), iron);
  tube.rotation.set(0, -ang, -Math.PI / 4);
  tube.position.set(x + Math.cos(ang) * 0.9, y + 3.4, z + Math.sin(ang) * 0.9);
  tube.castShadow = true; g.add(tube);
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.2, 12), stdMat('#050505', 0.9));
  bore.rotation.copy(tube.rotation);
  bore.position.set(x + Math.cos(ang) * 2.6, y + 5.1, z + Math.sin(ang) * 2.6);
  g.add(bore);
}

/* un fort avancé : un petit pentagone sur sa pointe, deux pièces, un corps de garde */
function buildOutpost(o, hAt) {
  const g = new THREE.Group(), B = vBuilder(), pal = FORT_PAL();
  const r = makeRng(Math.round(o.x * 3 + o.y * 7) >>> 0);
  const base = Math.max(1.2, hAt(o.x, o.y)[0]);
  const pts = [[26, 0], [6, 22], [-18, 14], [-18, -14], [6, -22]];
  const fa = Math.atan2(0.673, 0.74);
  const guns = [[13, 8.3, fa], [13, -8.3, -fa]];
  const { W, top } = fortParts(null, o.x, o.y, base, o.a, B, g, pts, 5, guns, r, [-17, 0]);
  const [x, z] = W(-8, 7.5); B.at(x, top, z, o.a + Math.PI); vHouse(B, 'tile', 10, 6, r, pal);
  const [px, pz] = W(-8, -8); B.at(px, top, pz, r() * TAU); vPine(B, r, 0.9, pal);
  const mesh = new THREE.Mesh(B.geometry(), VMAT());
  g.add(mesh);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return mergeStatic(g);
}

/* le fort de Benten (achevé en 1863) : à la pointe du cap de Benten, au bout du port de Hakodate, un
 * hexagone de pierre irrégulier, allongé comme une pièce de shōgi, chaque face tournée vers un autre
 * côté de la rade ; quinze grosses pièces, des casernes, une poudrière, un magasin. (x, z) : le centre,
 * ang : vers la mer (la pointe), base : le pied des murs. Le corsaire en fait son port d'attache ;
 * l'histoire le montre dans la baie de Hakodate, en juin 1869. pier : une jetée à côté, au rivage */
function bentenFort(x, z, ang, base, pier) {
  const g = new THREE.Group(), B = vBuilder(), pal = FORT_PAL();
  const r = makeRng(1863);
  /* k : l'échelle du plan ; la pointe reste à moins de 48 du centre */
  const k = 0.82, K2 = (q) => [q[0] * k, q[1] * k];
  const pts = [[58, 0], [22, 42], [-38, 36], [-48, 0], [-38, -36], [22, -42]].map(K2);
  /* les pièces : quatre sur chaque face de la pointe, trois sur chaque flanc, une sur l'arrière ; la
   * dernière face, côté terre, porte la porte */
  const guns = [];
  const per = [4, 3, 1, 0, 3, 4];
  for (let i = 0; i < 6; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % 6];
    let nx = bz - az, nz = -(bx - ax);
    const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    if (nx * ((ax + bx) / 2 + 2 * k) + nz * ((az + bz) / 2) < 0) { nx = -nx; nz = -nz; }
    for (let k = 0; k < per[i]; k++) {
      const t = per[i] === 1 ? 0.55 : 0.2 + 0.6 * k / (per[i] - 1);
      guns.push([ax + (bx - ax) * t - nx * 5, az + (bz - az) * t - nz * 5, Math.atan2(nz, nx)]);
    }
  }
  const gate = K2([-40, -17]);
  const { W, top } = fortParts(null, x, z, base, ang, B, g, pts, 7, guns, r, gate, { ramparts: per.map((n) => n > 0), near: true });
  /* les casernes, la poudrière, le magasin, la porte */
  let [px, pz] = W(-4, 11.5); B.at(px, top, pz, ang + Math.PI); vHouse(B, 'tile', 18, 6.5, r, pal);
  [px, pz] = W(-4, -11.5); B.at(px, top, pz, ang); vHouse(B, 'tile', 18, 6.5, r, pal);
  [px, pz] = W(-20, 16); B.at(px, top, pz, ang + Math.PI); vMagazine(B, 9, 6, r, pal);
  [px, pz] = W(-25, 2); B.at(px, top, pz, ang + Math.PI / 2); vKura(B, 8, 6, r, pal);
  [px, pz] = W(...K2([-43, -18])); B.at(px, top, pz, ang + Math.atan2(-0.963, 0.267)); vGate(B, r, pal);
  for (const [lx, lz] of [[12, 0], [-12, 0], [-2, 21]]) { [px, pz] = W(lx, lz); B.at(px, top, pz, r() * TAU); vPine(B, r, 1.05, pal); }
  if (pier) { const c = Math.cos(ang), sn = Math.sin(ang); B.at(pier[0] - c * 6, 0, pier[1] - sn * 6, ang); vPier(B, 80, r); }
  const mesh = new THREE.Mesh(B.geometry(), VMAT());
  g.add(mesh);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return mergeStatic(g);
}

/* Hakodate, port d'attache du corsaire : le fort de Benten, et une jetée de bois à côté, vers le mouillage */
function buildHomePort(P, hAt) {
  const ang = Math.atan2(P.hy - P.by, P.hx - P.bx);
  const c = Math.cos(ang), sn = Math.sin(ang);
  /* un peu en retrait de la batterie, la pointe au rivage (on n'y heurte rien : Hakodate n'a pas d'emprise) */
  const x = P.bx - c * 18, z = P.by - sn * 18;
  return bentenFort(x, z, ang, Math.max(1.2, hAt(x, z)[0]), [P.sx - sn * 95, P.sy + c * 95]);
}

/* ---------- les réglages ---------- */

/* le rayon d'un port à vous : on y répare, on y refait le plein, on y ouvre le chantier */
const CORS_ZONE_R = 340;
/* les ports à prendre : tous, sauf Hakodate, qui est à vous dès le départ */
const CORS_PORTS = 30;
const CORS_START_COINS = 60;
/* les navires de l'ordinateur : poids de tirage, menace à partir de laquelle ils paraissent,
 * ce que vaut leur cale en pièces d'or, et la force de leur équipage à l'abordage */
const CORS_TYPES = [
  { id: 'hiryu', w: 3, from: 1, value: 90, crew: 1 },
  { id: 'moshun', w: 3, from: 1, value: 55, crew: 1.2 },
  { id: 'kasuga', w: 3, from: 2.5, value: 80, crew: 1.7 },
  { id: 'choyo', w: 2, from: 3.5, value: 85, crew: 1.6 },
  { id: 'kotetsu', w: 1, from: 7, value: 200, crew: 2.6 },
];
const corsType = (id) => CORS_TYPES.find((t) => t.id === id) || CORS_TYPES[1];

/* ---------- les navires de l'ordinateur, à leur taille ----------
 * Leur coque vient de leurs dimensions, comme au chantier (4,4 × (L × B)^0,65 : la frégate de 66 m y
 * a 330 points, le Kasuga de 74 m en a 295 ; le Kōtetsu, tout de fer, une fois et demie de plus) ;
 * leur bordée vient de leur armement (data.js), pièce par pièce : chacune tire quand elle porte, et
 * frappe selon son calibre (le canon de 12 du corsaire, au premier cran : 10). Au début de la
 * traversée, ils sortent à court d'hommes et de poudre ; ils prennent toute leur force à mesure que
 * la menace monte (span : en tant de points de menace). À pleine force, ils gardent un peu moins de
 * coque que leur taille ne le voudrait (84 %), et leurs coups (dmg, sur chaque boulet) restent
 * moins lourds que les vôtres : vous menez un seul navire, eux sont légion. */
const CORS_GUN = {
  p12: [10, 390], p18: [11, 400], p24: [12, 410], p30: [13, 410], p68: [17, 430], how: [9, 340],
  r40: [14, 450], r50: [15, 460], a70: [17, 470], a6: [6, 380], a300: [40, 470],
};
const CORS_FOE = { hull: [0.44, 0.84], dmg: [0.14, 0.36], span: 6, rate: [2, 3.2], aim: 0.09, flee: 0.3 };
const corsRamp = (thr) => clamp((thr - 1) / CORS_FOE.span, 0, 1);
const corsHullOf = (sp) => 4.4 * Math.pow(sp.L * sp.B, 0.65) * (sp.id === 'kotetsu' ? 1.6 : 1);
/* leur manière de se battre : la distance qu'ils tiennent, et leur goût pour l'enfilade (passer
 * devant l'étrave ou derrière la poupe de leur cible) ; le Kōtetsu éperonne */
const CORS_DOCTRINE = { moshun: { range: 320, rake: 0.3 }, kasuga: { range: 290, rake: 0.5 }, choyo: { range: 240, rake: 0.7 }, kotetsu: { range: 200, rake: 0, ram: true } };
/* les pièces d'un navire, d'après son armement : où elles sont, de quel côté elles portent */
function corsGunsOf(sp) {
  if (sp._cg) return sp._cg;
  const out = [];
  for (const a of sp.armament || []) {
    const n = a.n || 1, g = CORS_GUN[a.type] || CORS_GUN.p24;
    for (let i = 0; i < n; i++) {
      const gun = { dmg: g[0], range: g[1] };
      if (a.mount === 'broad') {
        const per = Math.max(1, Math.ceil(n / 2)), k = i >> 1;
        Object.assign(gun, { arc: 'side', side: i % 2 ? 1 : -1, x: (a.x || 0) + (per > 1 ? (k / (per - 1) - 0.5) * (a.span || 0.4) : 0) });
      } else if (a.mount === 'pivot') Object.assign(gun, { arc: 'pivot', x: (a.x || 0) + (i - (n - 1) / 2) * 0.1 });
      else if (a.mount === 'casemate' || a.mount === 'bow') Object.assign(gun, { arc: 'bow', wide: a.mount === 'bow' ? 0.45 : 1.1, x: a.x || 0.4 });
      else if (a.mount === 'aftcasemate' || a.mount === 'stern') Object.assign(gun, { arc: 'stern', wide: a.mount === 'stern' ? 0.45 : 1.1, x: a.x || -0.4 });
      else continue;
      out.push(gun);
    }
  }
  sp._cg = out;
  return out;
}
/* les grands ports : batteries plus fortes, magasins plus riches, tribut plus gros (les cinq
 * villes à arsenal en sont, voir fleet.js) */
const CORS_MAJOR = ['shinagawa', 'uraga', 'hyogo', 'nagasaki', 'kagoshima', 'shimonoseki', 'niigata', 'kanazawa', 'hiroshima'];
/* les forts avancés : deux autour des grandes villes, un autour de dix autres ports */
const CORS_OUTPOSTS = Object.assign(Object.fromEntries(CORS_MAJOR.map((id) => [id, 2])), { miyako: 1, sakata: 1, shimoda: 1, toba: 1, kochi: 1, choshi: 1, wakayama: 1, oita: 1, hakata: 1, mihonoseki: 1 });
/* les fortifications d'un port pris, par niveau : solidité de la batterie, pièces par salve, portée */
const FORT = { hp: [0, 160, 320, 520], guns: [0, 1, 2, 3], range: [0, 540, 640, 740], cost: [120, 260, 480] };
const fortCost = (P) => (P.fort >= 3 ? null : Math.round(FORT.cost[P.fort] * (P.major ? 1.5 : 1)));
const fortHp = (P) => Math.round(FORT.hp[P.fort] * (P.major ? 1.4 : 1));
const CORS_AMB = ['printemps', 'été', 'soir', 'printemps', 'nuit'];
const portName = (P) => (LANG === 'ja' ? P.jp : P.name);

/* ---------- la difficulté ----------
 * Au moyen, l'ennemi a la coque plus solide, fait plus mal (sur vous, votre flotte et vos forts, à
 * l'abordage et à l'éperon aussi) et tire plus vite ; il y a un navire de plus en mer, ils sortent plus
 * souvent et gagnent leurs crans plus vite ; on vous prend en chasse un peu plus tôt et de plus loin ;
 * les batteries tiennent plus longtemps, les sièges viennent plus souvent, l'abordage est plus serré ;
 * l'or rentre un peu moins vite. Au difficile, tout cela plus fort, et l'ennemi sort avec un cran
 * d'avance, ses escadres de secours et de siège comptent un navire de plus. Au moyen et au difficile,
 * une batterie tient aussi tête à votre artillerie : il lui faut au moins batV bordées du navire que vous
 * menez (batVM pour une grande ville), si bien armé soit-il.
 * Partout, le chantier se paie (price : le prix de chaque pièce, et de chaque navire de l'arsenal),
 * les vivres et le charbon s'épuisent (burn), et qui vous chasse force l'allure (chase : jusqu'à cette
 * part de votre vitesse, sans dépasser chaseCap fois la sienne). Le facile reste le plus généreux.
 * (Éprouvé avec le joueur automatique : voir le README.) */
const CORS_DIFF = [
  { id: 'facile', dmg: 1, hull: 1, fire: 1, crowd: 0, spawn: 1, start: 0, gain: 1, sightMin: 2, sight: 1, battery: 1, batV: 0, batVM: 0, relief: 0, gold: 1, burn: 1.1, board: 1, siege: 1, siegeN: 0, price: 1.5, chase: 0.85, chaseCap: 1.45 },
  { id: 'moyen', dmg: 1.15, hull: 1.15, fire: 0.9, crowd: 1, spawn: 0.9, start: 0, gain: 0.85, sightMin: 1.5, sight: 1.1, battery: 1.2, batV: 9, batVM: 16, relief: 0, gold: 0.9, burn: 1.3, board: 1.1, siege: 0.85, siegeN: 0, price: 2, chase: 0.93, chaseCap: 1.7 },
  { id: 'difficile', dmg: 1.35, hull: 1.3, fire: 0.8, crowd: 3, spawn: 0.8, start: 1, gain: 0.7, sightMin: 1, sight: 1.25, battery: 1.45, batV: 12, batVM: 21, relief: 1, gold: 0.8, burn: 1.6, board: 1.2, siege: 0.7, siegeN: 1, price: 2.8, chase: 1, chaseCap: 2 },
];
const corsD = () => CORS_DIFF[(G.cors && G.cors.diff) || 0];
/* la difficulté choisie pour la prochaine traversée (celle qui est en cours garde la sienne) */
const corsDiffPick = () => clamp(arcadeLoad('corsaire').diff | 0, 0, CORS_DIFF.length - 1);
/* le record et la victoire, pour chaque difficulté (facile : les clés d'origine) */
const corsRecKey = (d) => (d ? ['best' + d, 'won' + d] : ['best', 'won']);
function corsRecord(d) { const k = arcadeLoad('corsaire'), [b, w] = corsRecKey(d); return { best: k[b] || 0, won: !!k[w] }; }

/* ---------- la traversée enregistrée ---------- */

function corsVoyage() { const v = arcadeLoad('corsaire').voyage; return v && v.v === 2 ? v : null; }

/* on enregistre au chantier, et quand on prend un port : c'est là qu'on reprendra si l'on coule */
function corsaireSave() {
  const C = G.cors, me = G.me;
  if (!C || !me || !me.cfg || C.tuto) return;
  const owned = {};
  for (const P of C.ports) if (P.state === 'ours' && P.role !== 'home') owned[P.id] = P.fort;
  arcadeSave('corsaire', { voyage: Object.assign({ v: 2, diff: C.diff || 0, cfg: Object.assign({}, me.cfg), coins: Math.floor(C.coins), spent: C.spent, owned, last: C.lastPort, stats: Object.assign({}, C.stats), score: G.score, tribute: C.tribute, won: !!C.won }, fleetSave()) });
}
/* un port perdu l'est aussi dans la traversée enregistrée */
function corsSavePorts() {
  const v = corsVoyage();
  if (!v || G.cors.tuto) return;
  const owned = {};
  for (const P of G.cors.ports) if (P.state === 'ours' && P.role !== 'home') owned[P.id] = P.fort;
  v.owned = owned;
  if (!G.cors.ports.some((P) => P.id === v.last && P.state === 'ours')) v.last = 'hakodate';
  arcadeSave('corsaire', { voyage: v });
}

/* ---------- la partie ---------- */

/* diff : pour une nouvelle traversée, la difficulté voulue (sinon celle choisie au menu) */
function startCorsaire(resume, diff) {
  loading(() => {
    corsaireBegin(resume ? corsVoyage() : null, diff);
    enterPlay();
    /* une nouvelle traversée s'ouvre au chantier de Hakodate */
    if (!resume) yardOpen(G.cors.home);
  });
}

function corsaireBegin(save, pick, tuto) {
  G.game = 'arcade'; G.shipId = 'corsaire';
  G.score = save ? save.score || 0 : 0;
  const diff = save ? clamp(save.diff | 0, 0, CORS_DIFF.length - 1) : pick !== undefined ? clamp(pick | 0, 0, CORS_DIFF.length - 1) : corsDiffPick();
  if (!save && !tuto && diff !== corsDiffPick()) arcadeSave('corsaire', { diff });
  G.best = corsRecord(diff).best;
  RNG = makeRng(G.testSeed || ((Date.now() % 100000) + 1869));
  W.drift = [0, 0];
  G.shots = []; G.parts = []; G.objs = []; G.crates = []; G.prises = []; G.whirls = []; G.boats = []; G.wrecks = []; G.floats = []; G.chests = [];
  G.ships = []; G.pending = []; G.zones = [];
  G.arc = { variant: 'corsaire', level: 1, t: 0, state: 'play', crates: 0, got: 0, need: 0, drops: 0, brulots: 0, speedK: 1 };
  G.mist = 0; G.lost = null; G.mistOut = -1e9; G.corsBar = null;
  YARD.open = false; YARD.shop = 0;
  setCorsaireWorld();
  const owned = (save && save.owned) || {};
  G.cors = {
    v2: true, t: 0, diff,
    coins: save ? save.coins : CORS_START_COINS, spent: save ? save.spent || 0 : 0, tribute: save ? save.tribute || 0 : 0,
    stats: Object.assign({ sinks: 0, boards: 0, rams: 0, taken: 0, earned: 0, lost: 0 }, save ? save.stats : {}),
    ports: CORS.sites.map((p) => {
      const home = p.role === 'home', own = home || owned[p.id] !== undefined;
      const outs = (p.outs || []).map((o) => ({ x: o.x, y: o.y, a: o.a, hp: own ? 1 : 0, hpMax: own ? 1 : 0, fireT: rnd(4, 1.5), hitAt: -99, owner: { faction: own ? 'ezo' : 'imperial', x: o.x, y: o.y, port: true, dmgMe: 1 } }));
      return { ...p, outs, major: CORS_MAJOR.includes(p.id), state: own ? 'ours' : 'enemy', fort: home ? 3 : own ? owned[p.id] : 0, hp: 0, hpMax: 0, fireT: rnd(3, 1), alarmT: 0, downT: 0, fallT: 0, hitT: 0, hitAt: -99, owner: { faction: own ? 'ezo' : 'imperial', x: p.bx, y: p.by, port: true, dmgMe: 1 } };
    }),
    auto: 1, threat: 1, menace: 0, sight: 0, scaleT: 0,
    spawnT: 3, huntSaid: -99, aiN: 0, chestT: 3, brulotT: 70, ambT: 240, ambI: 0, siegeT: 210, siege: null, board: null, musicT: 0, debrisT: 0,
    lastPort: save ? save.last : 'hakodate', here: null, repT: 0, tips: {},
    won: !!(save && save.won), winT: 0, seen: {}, seenT: 0,
    fleet: [], sinking: [], trail: [], bought: Object.assign({}, save && save.bought), landing: null, crowd: 4, shells: [], tuto: tuto ? { i: -1 } : null,
  };
  const C = G.cors;
  C.home = C.ports.find((p) => p.role === 'home');
  for (const P of C.ports) if (P.state === 'ours') { P.hpMax = fortHp(P); P.hp = P.hpMax; }
  const P = C.ports.find((p) => p.id === C.lastPort && p.state === 'ours') || C.home;
  C.lastPort = P.id;
  /* le navire du joueur : la coque de noix, ou ce que le chantier en a fait */
  const cfg = save ? Object.assign(yardNew(), save.cfg) : yardNew();
  const me = makeShip('chiyoda', P.hx, P.hy, Math.atan2(P.hy - P.by, P.hx - P.bx));
  me.faction = 'ezo';
  me.fleet = { n: save ? save.flagN || 0 : 0, st: 'follow' };
  yardApply(me, cfg);
  me.hull = me.hullMax; me.throttle = 0; me.inv = 2.5;
  G.me = me; G.ships.push(me);
  C.fleet.push(me);
  /* la flotte : ceux qui suivent sont au port avec vous, les autres à leur quai */
  fleetLoad(save ? save.fleet : [], P);
  corsScale();
  corsZones();
  beastsReset();
  setSea({ wind: 220, sea: 1.4, season: 'printemps' }, CORS_AMB[0]);
  /* un peu de débris autour, hors de vue */
  for (let i = 0; i < 4; i++) { const p = corsOffscreen(80); if (p) addObj('radeau', 3, p[0], p[1]); }
  Music.play('sea');
  followCamera(true);
}

/* ---------- ce qu'on déduit de la partie ---------- */

const corsAIs = () => G.ships.filter((s) => s.cors && !s.sunk);
const corsArmed = (s) => (s.spec.chase || 0) + (s.spec.broad || 0) > 0;
const corsOwnedPorts = () => G.cors.ports.filter((P) => P.state === 'ours' && P.role !== 'home');
const corsOwned = () => corsOwnedPorts().length;

/* la puissance du navire, pièce par pièce : la toile compte peu, les canons et la coque beaucoup */
function corsPower(c) {
  const lv = (k) => c[k] || 0;
  return c.coque + 0.4 * c.canons + 0.25 * c.chasse + 0.3 * Math.min(5, c.cuirasse) + 0.2 * Math.max(0, c.cuirasse - 5) + 0.6 * Math.min(1, c.gatling) + 0.2 * Math.max(0, c.gatling - 1)
    + 0.4 * Math.min(1, c.eperon) + 0.15 * Math.max(0, c.eperon - 1) + 0.25 * Math.min(3, c.abordeurs) + 0.12 * Math.max(0, c.abordeurs - 3) + 0.15 * (c.mats - 1) + 0.08 * c.voiles + 0.2 * c.chaudiere + 0.15 * c.roues
    + 0.35 * lv('calibre') + 0.25 * lv('canonniers') + 0.1 * (lv('machine') + lv('helice') + lv('doublage')) + 0.05 * lv('gouvernail') + 0.15 * lv('pompes') + 0.05 * (lv('chaloupes') + lv('cales') + lv('vigie'));
}

/* la menace (ce que l'ordinateur oppose) grandit avec la puissance de votre navire et les ports
 * pris ; ce que vous inspirez (le danger que vous représentez) décide s'il vous chasse à vue */
function corsScale() {
  const C = G.cors, me = G.me, cfg = me && me.cfg ? me.cfg : yardNew();
  const owned = corsOwned();
  /* la flotte qui vous suit pèse aussi, un peu moins que le navire que vous menez */
  const esc = (C.fleet || []).filter((s) => s !== me && !s.sinking);
  const escP = esc.reduce((a, s) => a + corsPower(s.cfg), 0);
  C.threat = Math.min(14, 1 + 0.5 * corsPower(cfg) + 0.15 * Math.min(30, escP) + 0.25 * owned);
  /* plus on avance, plus il y a de monde en mer : des navires, et des escadres */
  const D = corsD();
  C.crowd = Math.min(26 + D.crowd, 4 + D.crowd + Math.floor(0.6 * C.threat) + Math.floor(owned / 2) + 2 * esc.length);
  C.menace = cfg.coque + 0.5 * cfg.canons + 0.3 * cfg.chasse + 0.4 * cfg.cuirasse + 0.8 * Math.min(1, cfg.gatling) + 0.5 * Math.min(1, cfg.eperon) + 0.3 * Math.min(3, cfg.abordeurs) + 0.3 * (cfg.calibre || 0) + 0.3 * Math.min(10, C.stats.sinks + C.stats.boards) + 0.8 * owned + 0.6 * esc.length;
  /* une coque de noix ne vaut pas un boulet : tant qu'on ne menace personne, on vous laisse passer */
  C.sight = C.menace < D.sightMin ? 0 : clamp((250 + 140 * C.menace) * D.sight, 0, 1500 * D.sight);
  G.arc.level = Math.max(1, Math.floor(C.threat));
  const dmgMe = Math.min(1.8, 1 + 0.05 * (C.threat - 1)) * D.dmg;
  /* ce que fait une bordée du navire que vous menez, quand tous ses boulets portent */
  const volley = me && me.spec ? (me.spec.broad || 0) * 10 * (me.spec.dmgK || 1) : 0;
  for (const P of C.ports) {
    if (P.state === 'ours') continue;
    P.owner.dmgMe = dmgMe;
    /* une batterie tient longtemps : il faut s'y reprendre à plusieurs bordées ; au moyen et au
     * difficile, au moins batV (batVM pour une grande ville), si forte que soit votre artillerie */
    const m = Math.round(Math.max(Math.round((P.major ? 220 + 50 * C.threat : 100 + 30 * C.threat) * 1.6 * D.battery), Math.floor(volley * (P.major ? D.batVM : D.batV))) * (C.tuto ? 0.35 : 1));
    if (P.state === 'enemy') P.hp = P.hpMax ? P.hp * m / P.hpMax : m;
    P.hpMax = m;
    const om = Math.round(m * 0.45);
    for (const o of P.outs) { o.owner.dmgMe = dmgMe; if (!o.hpMax) o.hp = om; else if (o.hp > 0) o.hp = o.hp * om / o.hpMax; o.hpMax = om; }
  }
}

/* les cercles verts des ports à vous, et les cercles d'or des ports à prendre */
function corsZones() {
  G.zones = [];
  for (const P of G.cors.ports) {
    if (P.state === 'ours') G.zones.push({ x: P.hx, y: P.hy, r: CORS_ZONE_R * 0.8, col: 0x9ad8a0, tag: T(CORS_ARSENALS.includes(P.id) && !G.cors.bought[P.id] ? 'cor.zone.ars' : 'cor.zone', portName(P)), port: P });
    else if (P.state === 'down') G.zones.push({ x: P.lx, y: P.ly, r: corsLandR(G.me), col: 0xffd98a, tag: T('cor.zone.take', portName(P)), port: P });
  }
}

/* à l'abri d'un port à vous : personne ne vous y poursuit, le calmar n'y monte pas */
function corsSafe(x, y) {
  if (!G.cors) return false;
  for (const P of G.cors.ports) if (P.state === 'ours' && (x - P.hx) ** 2 + (y - P.hy) ** 2 < CORS_ZONE_R * CORS_ZONE_R) return true;
  return false;
}
/* le port (à vous, ou à prendre) dont on est dans la rade */
function corsPortAt(x, y) {
  for (const P of G.cors.ports) if ((P.state === 'ours' || P.state === 'down') && (x - P.hx) ** 2 + (y - P.hy) ** 2 < CORS_ZONE_R * CORS_ZONE_R) return P;
  return null;
}
function corsNearestOurs(x, y) {
  let best = G.cors.home, bd = Infinity;
  for (const P of G.cors.ports) { if (P.state !== 'ours') continue; const d = dist(x, y, P.hx, P.hy); if (d < bd) { bd = d; best = P; } }
  return best;
}

/* un point d'eau libre, juste hors de vue */
function corsOffscreen(clear) {
  const me = G.me;
  for (let t = 0; t < 30; t++) {
    const a = rnd(TAU), d = rnd(cam.w * 1.0, cam.w * 0.64);
    const x = me.x + Math.cos(a) * d, y = me.y + Math.sin(a) * d;
    if (x < 300 || y < 300 || x > G.field.w - 300 || y > G.field.h - 300) continue;
    if (nearLand(x, y, clear) || corsSafe(x, y)) continue;
    return [x, y];
  }
  return null;
}

/* ---------- l'or ---------- */

function corsGold(n, x, y, quiet) {
  const C = G.cors;
  n = Math.round(n * corsD().gold);
  if (n <= 0) return 0;
  C.coins += n; C.stats.earned += n;
  if (!quiet) floatText(x, y, T('cor.gold', n), 'gold');
  Snd.coins();
  return n;
}

/* un coffre d'or ; auto : des barils de vivres et des sacs de charbon avec (l'autonomie qu'ils rendent) */
function addChest(x, y, coins, auto) {
  const c = { x, y, vx: rndSym(10), vy: rndSym(10), rot: rnd(TAU), spin: rndSym(0.4), bob: rnd(TAU), r: 13, coins: Math.max(1, Math.round(coins)), auto: auto || 0, life: 110 };
  G.chests.push(c);
  return c;
}

/* l'or d'une épave, ou d'un port qu'on a fait taire : quelques coffres qui remontent */
function corsDropGold(x, y, total, n, auto) {
  n = Math.max(1, n || 1);
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), d = n > 1 ? rnd(46, 14) : 0;
    let cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
    if (G.mapLand(cx, cy)) { cx = x; cy = y; }
    const c = addChest(cx, cy, total / n, auto ? auto / n : 0);
    c.vx = Math.cos(a) * rnd(30, 10); c.vy = Math.sin(a) * rnd(30, 10);
  }
}

/* le calmar secoue le navire : un coffre passe par-dessus bord ; on peut encore le repêcher */
function corsSpill(me, away) {
  const C = G.cors;
  const n = Math.min(Math.floor(C.coins), Math.max(10, Math.round(C.coins * 0.15)));
  if (n <= 0) return;
  C.coins -= n;
  const a = (away === undefined ? rnd(TAU) : away) + rndSym(0.6);
  const c = addChest(me.x + Math.cos(a) * me.len * 0.45, me.y + Math.sin(a) * me.len * 0.45, n);
  c.vx = Math.cos(a) * 150 + me.vx * 0.5; c.vy = Math.sin(a) * 150 + me.vy * 0.5;
  c.life = 25; c.spilled = true;
  floatText(me.x, me.y - 20, T('cor.spill', n), 'bad');
}

function corsChestsStep(dt, alive) {
  const me = G.me, D = W.drift, C = G.cors;
  for (let i = G.chests.length - 1; i >= 0; i--) {
    const c = G.chests[i];
    const k = Math.exp(-dt * 1.3);
    c.vx *= k; c.vy *= k;
    const nx = c.x + (c.vx + D[0]) * dt, ny = c.y + (c.vy + D[1]) * dt;
    if (G.mapLand(nx, ny)) { c.vx = -c.vx * 0.5; c.vy = -c.vy * 0.5; } else { c.x = nx; c.y = ny; }
    c.bob += dt * 2.4; c.rot += c.spin * dt;
    c.life -= dt;
    if (c.life <= 0 || dist(c.x, c.y, me.x, me.y) > cam.w * 2.6) {
      G.chests.splice(i, 1);
      if (c.life <= 0) fx.splash(c.x, c.y, 0.5);
      continue;
    }
    if (alive && hitsShip(me, c.x, c.y, c.r + 6)) {
      G.chests.splice(i, 1);
      fx.splash(c.x, c.y, 0.6);
      corsGold(c.coins, c.x, c.y);
      if (c.auto) { C.auto = Math.min(1, C.auto + c.auto); floatText(c.x, c.y - 26, T('cor.auto.got'), 'gold'); }
    }
  }
}

/* un coffre cerclé de laiton, au couvercle bombé */
function buildChest() {
  const g = new THREE.Group();
  const wood = stdMat('#6e4624', 0.85), brass = stdMat('#d0a440', 0.35, 0.75);
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, 3.4), wood); body.position.y = 1.3; g.add(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 5.2, 14), wood); lid.rotation.z = Math.PI / 2; lid.position.y = 2.6; g.add(lid);
  for (const x of [-1.9, 0, 1.9]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.66, 3.48), brass); b.position.set(x, 1.3, 0); g.add(b);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(1.76, 1.76, 0.34, 14), brass); r.rotation.z = Math.PI / 2; r.position.set(x, 2.6, 0); g.add(r);
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.2), brass); lock.position.set(0, 2.25, 1.78); g.add(lock);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return mergeStatic(g);
}

function syncChest(c) {
  const m = keep(c, () => {
    const g = buildChest();
    g.scale.setScalar(SCALE);
    const ring = glowRing(new THREE.Color(1.7, 1.3, 0.45), 60);
    R3.scene.add(ring);
    g.userData.ring = ring;
    return g;
  });
  const bob = Math.sin(c.bob);
  const sink = c.life < 4 ? 1 - Math.max(0, c.life) / 4 : 0;
  m.position.set(c.x, 0.2 + bob * 0.7 - sink * 6, c.y);
  m.rotation.y = -c.rot;
  m.rotation.z = bob * 0.07;
  const ring = m.userData.ring;
  ring.position.set(c.x, 0.9, c.y);
  const pulse = 0.5 + 0.5 * Math.sin(c.bob * 2);
  ring.scale.setScalar(36 + pulse * 6 + Math.min(16, c.coins / 10));
  ring.material.opacity = (0.26 + pulse * 0.26) * (sink ? 1 - sink : 1);
}

/* les bombes de mortier en l'air, et le cercle rouge, qui se resserre, où elles tomberont */
function corsSync3D() {
  for (const b of G.cors.shells) {
    const m = keep(b, () => {
      const g = new THREE.Group();
      const ball = new THREE.Mesh(BSPH(), stdMat('#151515', 0.4, 0.6));
      ball.userData.sharedGeo = true; ball.scale.setScalar(3.6); ball.castShadow = true;
      g.add(ball);
      const ring = glowRing(new THREE.Color(1.9, 0.32, 0.18), 60);
      R3.scene.add(ring);
      g.userData.ring = ring;
      return g;
    });
    const k = clamp(b.t / b.T, 0, 1);
    m.position.set(lerp(b.x0, b.x, k), 8 + 4 * b.apex * k * (1 - k), lerp(b.y0, b.y, k));
    const ring = m.userData.ring;
    ring.position.set(b.x, 1, b.y);
    ring.scale.setScalar(b.r * (4.4 - 2.4 * k));
    ring.material.opacity = 0.3 + 0.55 * k * (0.65 + 0.35 * Math.sin(W.t * (8 + 22 * k)));
    if (Math.random() < 0.6) fx.push({ k: 'smoke', x: m.position.x, y: m.position.z, z0: m.position.y, vx: 0, vy: 0, r: 2.2, grow: 5, life: 1.3, age: 0, a: 0.3, tone: 2, air: true });
  }
}

/* le pavillon du corsaire, hissé sur les ports qu'on a pris (et sur Hakodate) */
function syncPortFlag(P) {
  if (P._m && !R3.live.has(P._m)) P._m = null;
  const m = keep(P, () => {
    const g = new THREE.Group();
    const hAt = R3.terrain && R3.terrain.userData.heightAt;
    const base = hAt ? Math.max(0, hAt(P.bx, P.by)[0]) : 0;
    const pole = cyl(0.7, 1, 46, '#3a2c1e', 6); pole.position.y = base + 23; g.add(pole);
    const fgeo = new THREE.PlaneGeometry(20, 13, 10, 3);
    fgeo.translate(-10, 0, 0);
    const flag = new THREE.Mesh(fgeo, new THREE.MeshStandardMaterial({ map: flagTex('corsair'), side: THREE.DoubleSide, roughness: 0.85 }));
    flag.castShadow = true;
    const fg = new THREE.Group(); fg.position.y = base + 39; fg.add(flag); g.add(fg);
    g.userData.fg = fg; g.userData.flag = flag; g.userData.base = fgeo.attributes.position.array.slice();
    const a = Math.atan2(P.hy - P.by, P.hx - P.bx);
    g.position.set(P.bx - Math.cos(a) * 30, 0, P.by - Math.sin(a) * 30);
    return g;
  });
  /* il flotte dans le lit du vent */
  const U = m.userData, theta = fromBearing(SEA.wind + 180);
  U.fg.rotation.y = -theta + Math.PI;
  if (onScreen(m.position.x, m.position.z, 120)) {
    const pos = U.flag.geometry.attributes.position, b = U.base, t = W.t;
    for (let i = 0; i < pos.count; i++) { const d = -b[i * 3] / 20; pos.setZ(i, Math.sin(d * 5 - t * 7) * 1.8 * d + Math.sin(d * 9 - t * 11 + b[i * 3 + 1] * 0.2) * 0.5 * d); }
    pos.needsUpdate = true;
    U.flag.geometry.computeVertexNormals();
  }
}

/* ---------- la boucle ---------- */

function corsaireTick(dt) {
  const me = G.me, A = G.arc, C = G.cors;
  A.t += dt; C.t += dt;
  const alive = A.state === 'play' && !me.sinking;
  if (C.tuto) tutoStep(dt);
  C.scaleT -= dt;
  if (C.scaleT <= 0) { C.scaleT = 1; corsScale(); }
  /* Espace tire toujours, même bord à bord : l'abordage se frappe sur Entrée */
  if (playerControl(dt, alive)) beastsPlayerFired();
  const mx0 = me.x, my0 = me.y;
  moveOnMap(me, dt);
  corsForts(me, mx0, my0);
  corsRamLockStep(dt);
  corsPlayer(dt, alive);
  if (G.mode !== 'play') return;
  if (C.winT > 0) { C.winT -= dt; if (C.winT <= 0) { corsVictory(); return; } }
  corsAIsStep(dt);
  fleetStep(dt);
  corsBoatsStep(dt);
  corsSightings(dt);
  corsPortsStep(dt);
  corsContacts();
  beastsUpdate(dt);
  stepShots(dt, (p) => (p.siege ? corsSiegeShot(p) : beastShot(p) || corsShot(p) || shotHits(p, corsOnShipHit)));
  corsHazards(dt);
  for (let i = G.objs.length - 1; i >= 0; i--) {
    const o = G.objs[i];
    if (o.life !== undefined) { o.life -= dt; if (o.life <= 0) { G.objs.splice(i, 1); continue; } }
    if (o.type === 'brulot' && Math.random() < dt * 2) Snd.crackle && Snd.crackle();
  }
  driftObjects(dt);
  corsChestsStep(dt, alive);
  whirlStep(dt);
  if (alive) corsDebris();
  recycleField();
  updateParts(dt);
  /* le navire que vous menez coule : vous passez à bord d'un autre de la flotte, s'il en reste */
  if (me.sinking && A.state === 'play' && !fleetTransfer()) { A.state = 'over'; A.overT = 0; C.board = null; C.landing = null; G.corsBar = null; }
  if (A.state === 'over') { A.overT += dt; if (A.overT > 2.8 && G.mode === 'play') corsaireOver(); }
  followCamera(false, dt);
  mistStep(dt);
}

/* ---------- le joueur : autonomie, ports, mitrailleuse, abordage ---------- */

/* ce que le navire consomme par seconde de son autonomie : les vivres, toujours ; le charbon,
 * d'autant plus qu'on pousse la machine */
function corsBurn(me) {
  const thr = Math.max(0, me.throttle);
  return (1 / me.spec.vivresT + (me.cfg.chaudiere ? Math.pow(thr, 1.6) / me.spec.coalT : 0)) * corsD().burn;
}

function corsPlayer(dt, alive) {
  const me = G.me, C = G.cors, cfg = me.cfg;
  me.ramT = Math.max(0, (me.ramT || 0) - dt);
  const P = corsPortAt(me.x, me.y);
  C.here = P;
  /* l'autonomie : les vivres s'épuisent en mer, et la machine brûle son charbon ; à vide, un
   * tiers de l'allure. Dans un port à vous, on refait le plein. */
  if (alive && C.auto > 0 && !(P && P.state === 'ours')) C.auto = Math.max(0, C.auto - corsBurn(me) * dt);
  if (C.auto <= 0 && !C.autoOut) { C.autoOut = true; banner(T(cfg.chaudiere ? 'cor.auto.out.c' : 'cor.auto.out'), T('cor.auto.out2'), 2.8); Snd.bell(1); }
  if (C.auto > 0.02) C.autoOut = false;
  if (C.auto > 0 && C.auto < 0.25 && !C.autoLow) { C.autoLow = true; floatText(me.x, me.y - 44, T('cor.auto.low'), 'bad'); }
  if (C.auto > 0.35) C.autoLow = false;
  me.coalK = C.auto <= 0 ? 1 / 3 : 1;
  me.noSteam = !!cfg.chaudiere && C.auto <= 0;
  if (!alive) return;
  /* le coup de boutoir : deux appuis sur ↑, coup sur coup */
  if (hit('ArrowUp', 'z', 'w')) {
    if (W.t - (C.upT || -9) < 0.35 && W.t > (C.boostCd || 0)) corsBoost(me);
    C.upT = W.t;
  }
  if (me.boostT > 0) { me.boostT -= dt; if (me.boostT <= 0) me.boostK = 1; }
  /* en entrant dans la rade d'un port à vous, on touche le tribut de tous vos ports */
  const inPort = !!(P && P.state === 'ours');
  if (inPort && !C.wasInPort && C.tribute >= 1) { const n = Math.floor(C.tribute); C.tribute -= n; const got = corsGold(n, me.x, me.y - 50, true); if (got) floatText(me.x, me.y - 50, T('cor.tribute', got), 'gold'); }
  C.wasInPort = inPort;
  if (inPort) {
    /* au mouillage : les charpentiers, les vivres et le charbon */
    if (Math.abs(me.v) < maxSpeed(me) * 0.45) {
      let said = null;
      if (me.hull < me.hullMax) { me.hull = Math.min(me.hullMax, me.hull + me.hullMax * 0.08 * dt); said = 'cor.repair'; }
      if (C.auto < 1) { C.auto = Math.min(1, C.auto + 0.3 * dt); said = said || 'cor.supply'; }
      C.repT -= dt;
      if (said && C.repT <= 0) { C.repT = 2.5; floatText(me.x, me.y - 30, T(said), 'gold'); }
    }
    if (hit('Enter') && W.t > (C.yardCool || 0) && !(C.board && C.board.on)) { yardOpen(P); return; }
  }
  corsLanding(dt);
  /* la mitrailleuse tire seule sur ce qui s'approche */
  if (cfg.gatling) {
    let best = null, bd = me.spec.gatR || 320;
    for (const s of corsAIs()) { if (s.sinking || s.captured) continue; const d = dist(s.x, s.y, me.x, me.y); if (d < bd) { bd = d; best = s; } }
    if (best) { gatling(me, best.x + best.vx * 0.2, best.y + best.vy * 0.2, dt * 0.7 * (me.spec.gatK || 1)); best.cors.hitMe = W.t; }
  }
  /* les pompes et les charpentiers, en mer ; la vigie qui crie quand on court sur la terre */
  if (!inPort) { corsPumps(me, dt); corsLookout(me, dt); }
  corsBoardStep(dt);
}

/* l'écart entre deux coques (négatif quand elles se touchent) */
function hullGap(a, b) {
  let g = 1e9;
  for (const [ax, ay, ar] of hullCircles(a)) for (const [bx, by, br] of hullCircles(b)) g = Math.min(g, Math.hypot(bx - ax, by - ay) - ar - br);
  return g;
}

/* la vitesse d'un abordage : vos abordeurs et votre coque contre son équipage ; un navire
 * déjà bien touché se rend plus vite */
/* l'abordage se gagne en mesure : ce que vaut son équipage contre le vôtre (au-dessus de 1, il est
 * plus fort que vous) ; un navire déjà touché se défend moins bien */
function corsBoardOdds(s) {
  const cfg = G.me.cfg, hf = clamp(s.hull / s.hullMax, 0, 1);
  const theirs = corsType(s.spec.id).crew * (1 + 0.06 * (s.up.voilure + s.up.coque + s.up.canons)) * (0.55 + 0.45 * hf);
  const ours = (1 + 0.35 * cfg.abordeurs) * (1 + 0.1 * cfg.coque);
  return theirs / ours * corsD().board;
}

/* la réglette : un curseur va et vient ; Entrée quand il passe dans l'or (Espace reste au tir). Plus
 * l'ennemi est fort, plus l'or est étroit, le curseur vif, et les coups justes à réussir nombreux. */
function corsRhythm(B) {
  const r = corsBoardOdds(B.s);
  const R = B.rh || (B.rh = { x: 0, dir: 1, lock: 0, flash: 0, ok: false, hits: 0, ready: 0.35 });
  R.w = clamp(0.3 / Math.pow(r, 0.7), 0.07, 0.36);
  R.sp = clamp(0.8 * Math.pow(r, 0.6), 0.6, 2) * (1 + 0.04 * R.hits);
  R.need = clamp(Math.round(3 + 2.2 * r), 3, 10);
  if (R.z0 === undefined) { R.z0 = rnd(0.85 - R.w, 0.15); R.z1 = R.z0 + R.w; }
  return R;
}

function corsRhythmStep(B, dt) {
  const R = corsRhythm(B);
  R.x += R.dir * R.sp * 2 * dt;
  if (R.x >= 1) { R.x = 2 - R.x; R.dir = -1; }
  if (R.x <= 0) { R.x = -R.x; R.dir = 1; }
  R.lock = Math.max(0, R.lock - dt); R.flash = Math.max(0, R.flash - dt);
  /* un instant pour voir la réglette avant que les coups comptent */
  if (R.ready > 0) { R.ready -= dt; return; }
  if (!hit('Enter') || R.lock > 0) return;
  if (R.x >= R.z0 - 0.01 && R.x <= R.z1 + 0.01) {
    B.f = Math.min(1, B.f + 1 / R.need);
    R.hits++; R.ok = true; R.flash = 0.25;
    R.z0 = rnd(0.88 - R.w, 0.12); R.z1 = R.z0 + R.w;
    Snd.clang(0);
  } else {
    B.f = Math.max(0, B.f - 0.6 / R.need);
    R.ok = false; R.flash = 0.35; R.lock = 0.45;
    Snd.musket();
    floatText(G.me.x, G.me.y - 50, T('cor.board.miss'), 'bad');
  }
}

/* bord à bord avec un navire ennemi : les grappins, puis l'abordage */
function corsBoardStep(dt) {
  const me = G.me, C = G.cors;
  let best = null, bg = 1e9;
  for (const s of corsAIs()) {
    if (s.sinking || s.captured) continue;
    if (Math.abs(s.x - me.x) > s.len + me.len || Math.abs(s.y - me.y) > s.len + me.len) continue;
    const g = hullGap(me, s);
    if (g < bg) { bg = g; best = s; }
  }
  let B = C.board;
  if (best && bg < 20) {
    if (!B || B.s !== best) {
      B = C.board = { s: best, f: 0, on: true };
      floatText(best.x, best.y - 44, T('cor.board.go'), 'gold');
      Snd.clang(0);
      corsOnShipHit(best, { owner: me });
      if (!C.tips.board) { C.tips.board = true; showHint(T('cor.tip.board')); }
    }
    B.on = true;
    corsRhythmStep(B, dt);
    /* les grappins : il perd son erre */
    best.v *= Math.exp(-dt * 1.5);
    best.throttle = Math.min(best.throttle, 0.1);
    /* la mousqueterie de son équipage, par-dessus les bastingages */
    if (me.inv <= 0) {
      me.hull -= 0.7 * corsType(best.spec.id).crew * (me.spec.armor || 1) * corsD().dmg * (me.dmgK || 1) * dt;
      me.hitT = Math.max(me.hitT, 0.06);
      if (me.hull <= 0) { if (me.noSink) me.hull = 1; else { me.hull = 0; sinkShip(me); return; } }
    }
    if (Math.random() < dt * 7) {
      const t = Math.random(), x = lerp(me.x, best.x, t) + rndSym(10), y = lerp(me.y, best.y, t) + rndSym(10);
      fx.push({ k: 'flash', x, y, vx: 0, vy: 0, r: 2, grow: 18, life: 0.08, age: 0, a: 0.9 });
      fx.push({ k: 'smoke', x, y, vx: rndSym(10), vy: rndSym(10), r: 2.5, grow: 6, life: rnd(1.2, 0.6), age: 0, a: 0.35, tone: 2, air: true });
      Snd.musket();
    }
    if (B.f >= 1) corsCapture(best);
  } else if (B) {
    B.on = false;
    B.f -= dt * 0.3;
    if (B.f <= 0 || B.s.sinking || B.s.captured || !G.ships.includes(B.s)) C.board = null;
  }
  G.corsBar = C.board ? { f: C.board.f, kind: 'red', label: T('cor.board', shipName(C.board.s.spec), Math.round(C.board.f * 100)) }
    : C.landing && C.landing.why !== 'away' && (C.landing.f > 0 || !C.landing.why) ? { f: C.landing.f, kind: 'gold', label: T(C.landing.why ? 'cor.landing.' + C.landing.why : 'cor.landing', portName(C.landing.P), Math.round(C.landing.f * 100)) } : null;
}

/* l'échouage. Au ralenti, la côte ou un fort abîme la coque ; à bonne allure, le navire s'y brise et il
 * est perdu. r : l'allure portée vers la terre (head : 1 droit dessus, 0 en glissant le long du bord),
 * en part de la pleine allure (sans le coup de boutoir ni une soute vide) ; un frôlement ne fait
 * rien. Un choc qui abîme la coque stoppe la machine. */
const CORS_WRECK = 0.55;
function corsAground(s, v0, hx, hy, fort, head) {
  if (s.sinking) return;
  const top = maxSpeed(s) / ((s.coalK || 1) * (s.boostK || 1)) || 1;
  const r = Math.max(0, v0) * clamp(head === undefined ? 1 : head, 0, 1) / top;
  if (r < 0.15 || W.t < (s.groundT || 0)) return;
  s.groundT = W.t + 1.2;
  s.throttle = Math.min(s.throttle, 0);
  fx.splinters(hx, hy, Math.round(6 + 14 * r), '#c8b088');
  fx.splash(hx, hy, 0.6 + r);
  Snd.thud(Math.min(1.2, 0.3 + r));
  G.shake = Math.min(1.4, (G.shake || 0) + 0.25 + r);
  if (r >= CORS_WRECK && !s.noSink) { corsWreck(s, fort); return; }
  const d = s.hullMax * (0.05 + 0.6 * (Math.min(r, CORS_WRECK) - 0.15)) * (s.dmgK || 1);
  s.hull -= d; s.hitT = 0.25;
  floatText(s.x, s.y - 30, T('cor.ground', Math.round(d)), 'bad');
  if (s.hull <= 0) { if (s.noSink) s.hull = 1; else { corsWreck(s, fort); return; } }
  if (!G.cors.tips.ground) { G.cors.tips.ground = true; showHint(T('cor.tip.ground')); }
}

/* la vigie crie quand on court sur la terre trop vite pour s'arrêter à temps */
function corsLookout(me, dt) {
  const C = G.cors;
  C.lookT = (C.lookT || 0) - dt;
  if (C.lookT > 0 || me.v <= 0) return;
  C.lookT = 0.25;
  const top = maxSpeed(me) / ((me.coalK || 1) * (me.boostK || 1)) || 1;
  if (me.v < top * CORS_WRECK * 0.9) return;
  const stop = me.v * me.v / (2 * 58) + me.len * 0.5 + 40, c = Math.cos(me.h), n = Math.sin(me.h);
  for (let d = me.len * 0.5; d < stop; d += 16) {
    if (!G.mapLand(me.x + c * d, me.y + n * d)) continue;
    if (W.t > (C.reefSaid || 0)) { C.reefSaid = W.t + 3; floatText(me.x, me.y - 46, T('cor.reef'), 'bad'); Snd.bell(2); }
    return;
  }
}

/* le navire s'échoue : il se couche sur la roche, la coque ouverte, et ne se relève pas */
function corsWreck(s, fort) {
  if (s.sinking) return;
  s.aground = true; s.hull = 0;
  s.v = 0; s.w = 0; s.throttle = 0;
  s.sinking = 0.01;
  Snd.sink(); Snd.crack(); Snd.creak(1);
  fx.splash(s.x, s.y, s.len / 40);
  fx.splinters(s.x + Math.cos(s.h) * s.len * 0.4, s.y + Math.sin(s.h) * s.len * 0.4, 24, '#c8b088');
  banner(T('cor.wreck'), T(fort ? 'cor.wreck.fort' : 'cor.wreck2', fort ? portName(fort) : ''), 3);
}

/* les forts (batteries et forts avancés) sont de la maçonnerie : on n'y passe pas au travers, et
 * l'on s'y échoue comme sur la côte (x0, y0 : où était le navire avant de bouger) */
function corsForts(me, x0, y0) {
  if (me.sinking) return;
  const C = G.cors;
  for (const P of C.ports) {
    if (P.role === 'home') continue;
    for (const [fx_, fy, fr] of [[P.bx, P.by, 46], ...P.outs.map((o) => [o.x, o.y, 27])]) {
      if (Math.abs(fx_ - me.x) > me.len + fr || Math.abs(fy - me.y) > me.len + fr) continue;
      let over = 0, cx = 0, cy = 0;
      for (const [hx, hy, hr] of hullCircles(me)) { const o = hr + fr - Math.hypot(hx - fx_, hy - fy); if (o > over) { over = o; cx = hx; cy = hy; } }
      if (over <= 0) continue;
      const l = Math.hypot(cx - fx_, cy - fy) || 1, nx = (cx - fx_) / l, ny = (cy - fy) / l;
      const head = Math.cos(me.h) * -nx + Math.sin(me.h) * -ny, v0 = me.v;
      /* on ressort du fort, du côté d'où l'on vient (et si la côte est là, on revient où l'on était) */
      me.x += nx * (over + 0.3); me.y += ny * (over + 0.3);
      if (landHit(me)) { me.x = x0; me.y = y0; }
      if (head > 0.55) me.v = 0; else me.v *= 0.85;
      if (me.mx !== undefined) { const into = -(me.mx * nx + me.my * ny); if (into > 0) { me.mx += nx * into; me.my += ny * into; } }
      me.dx = 0; me.dy = 0;
      if (me.safe) { me.safe[0] = me.x; me.safe[1] = me.y; me.safe[2] = me.h; }
      corsAground(me, v0, fx_ + nx * fr, fy + ny * fr, P, head);
      return;
    }
  }
}

/* les pompes et les charpentiers : loin des coups depuis six secondes, la coque se refait peu à peu,
 * jusqu'aux trois quarts (le reste attend le chantier) */
function corsPumps(s, dt) {
  if (s._hullSeen !== undefined && s.hull < s._hullSeen - 0.01) s._hitAt = W.t;
  s._hullSeen = s.hull;
  const k = s.spec.regen || 0;
  if (!k || s.sinking || W.t - (s._hitAt || -99) < 6 || s.hull >= s.hullMax * 0.75) return;
  s.hull = Math.min(s.hullMax * 0.75, s.hull + s.hullMax * k * dt);
  s._hullSeen = s.hull;
}

/* le rayon du mouillage de débarquement, selon la longueur du navire */
const corsLandR = (s) => 80 + 0.3 * (s ? s.len : 40);

/* le débarquement : devant la plage d'une ville réduite au silence, navire stoppé, les chaloupes
 * portent les compagnies de débarquement à terre. Il y faut du temps (plus pour une grande ville),
 * moins avec des chaloupes, des abordeurs et la flotte autour ; tant qu'un navire ennemi armé est
 * à portée de la plage, les chaloupes attendent. */
function corsLanding(dt) {
  const C = G.cors, me = G.me, cfg = me.cfg;
  let P = null, bd = Infinity;
  for (const q of C.ports) { if (q.state !== 'down') continue; const d = dist(me.x, me.y, q.lx, q.ly); if (d < bd) { bd = d; P = q; } }
  const R = corsLandR(me);
  if (C.landing && (C.landing.P !== P || C.landing.P.state !== 'down')) C.landing = null;
  if (!P || bd > Math.max(R * 3, CORS_ZONE_R + 200)) {
    if (C.landing) { C.landing.why = 'away'; C.landing.f -= dt * 0.05; if (C.landing.f <= 0) C.landing = null; }
    return;
  }
  const L = C.landing || (C.landing = { P, f: 0, boatT: 0, why: '' });
  const near = bd < R;
  const slow = Math.abs(me.v) < Math.max(40, maxSpeed(me) * 0.15);
  const foe = corsAIs().some((s) => !s.sinking && !s.captured && corsArmed(s) && dist(s.x, s.y, P.lx, P.ly) < 520);
  L.why = !near ? 'far' : !slow ? 'fast' : foe ? 'fire' : '';
  if (L.why) return;
  const help = fleetFollowers().filter((s) => dist(s.x, s.y, P.lx, P.ly) < R * 2.6 && Math.abs(s.v) < 60);
  const dur = 16 * (P.major ? 1.4 : 1) / ((1 + 0.2 * (cfg.chaloupes || 0)) * (1 + 0.06 * cfg.abordeurs) * (1 + 0.15 * Math.min(3, help.length)));
  L.f += dt / dur;
  /* les embarcations vont et viennent entre le bord et la grève (boats.js) : l'image seule */
  L.boatT -= dt;
  if (L.boatT <= 0) {
    L.boatT = 0.8;
    corsBoat(me, P);
    for (const s of help) corsBoat(s, P);
  }
  if (L.f >= 1) { C.landing = null; corsTake(P); }
}

/* combien d'embarcations un navire met à l'eau : celles de sa coque et ses chaloupes (le chantier),
 * de une à quatre */
function corsBoatsOf(s) {
  const c = s.cfg;
  if (!c) return 2;
  return clamp(Math.min([1, 2, 3, 4, 6, 6][c.coque], [0, 0, 2, 2, 2, 4][c.coque] + (c.chaloupes || 0)), 1, 4);
}

/* on amène une embarcation le long du bord, du côté de la grève ; elle y portera ses hommes */
function corsBoat(s, P) {
  const mine = G.boats.filter((b) => b.mother === s);
  if (mine.length >= corsBoatsOf(s)) return;
  let slot = 0;
  while (mine.some((b) => b.slot === slot)) slot++;
  const gx = P.gx !== undefined ? P.gx : P.sx, gy = P.gy !== undefined ? P.gy : P.sy;
  const a = Math.atan2(gy - s.y, gx - s.x), side = wrapA(a - s.h) >= 0 ? 1 : -1;
  /* chacune vise sa part de la grève, de part et d'autre du milieu */
  const off = (slot % 2 ? 1 : -1) * (6 + 13 * Math.ceil(slot / 2)) + (Math.random() - 0.5) * 8;
  const b = { kind: s.spec.L < 36 ? 'canot' : 'chaloupe', load: 'troops', flag: true, mother: s, P, side, slot, state: 'lower', t: 0, h: s.h, bob: Math.random() * TAU,
    sp: 36 + Math.random() * 8, crew: true, noRing: true, noMini: true, to: [gx - Math.sin(a) * off, gy + Math.cos(a) * off], town: [P.cx, P.cy] };
  [b.x, b.y] = boatStation(b);
  G.boats.push(b);
  if (s === G.me) Snd.splash(0);
}

function corsBoatsStep(dt) {
  const L = G.cors.landing;
  for (let i = G.boats.length - 1; i >= 0; i--) {
    const b = G.boats[i];
    if (!b.mother) continue;
    /* le débarquement interrompu ou fini : celles qu'on amenait remontent à bord */
    if (b.state === 'lower' && !(L && L.P === b.P && !L.why)) { b.state = 'hoist'; b.t = BOAT_HOIST * (1 - clamp(b.t / BOAT_LOWER, 0, 1)); }
    boatLife(b, dt);
    if (b.done) G.boats.splice(i, 1);
  }
}

/* le navire est pris : son or, son charbon ; un équipage de prise le ramène au port */
function corsCapture(s) {
  const C = G.cors, me = G.me;
  C.board = null; G.corsBar = null;
  s.captured = true; s.faction = 'ezo'; s.flag = 'corsair';
  s.cors.state = 'prize'; s.cors.path = []; s.cors.dest = corsNearestOurs(s.x, s.y); s.cors.siegeOf = null;
  s.throttle = 0.5;
  const ups = s.up.voilure + s.up.coque + s.up.canons;
  corsGold(corsValue(s) * 2 + (s.cors.cargo || 0), s.x, s.y - 30);
  /* sa cambuse et ses soutes regarnissent les vôtres */
  C.auto = Math.min(1, C.auto + 0.35); floatText(me.x, me.y - 56, T('cor.auto.taken'), 'gold');
  C.stats.boards++;
  addScore(400 + 60 * ups, s.x, s.y);
  banner(T('cor.prize', shipName(s.spec)), T('cor.prize2'), 2.6);
  Snd.levelUp();
}

/* ce que vaut la cale d'un navire de l'ordinateur : plus dur à vaincre qu'avant la version 6
 * (deuxième mise à jour), il rapporte d'autant plus */
function corsValue(s) { return corsType(s.spec.id).value * (1 + 0.15 * (s.up.voilure + s.up.coque + s.up.canons)) * (0.4 + 0.6 * (s.toughF || 1)); }

/* ---------- les chocs : l'éperon ---------- */

/* les navires ne passent pas l'un à travers l'autre ; quand votre étrave frappe un navire ennemi,
 * le choc grandit comme le carré de la vitesse, et la cuirasse et l'éperon le font plus rude */
function corsContacts() {
  const L = G.ships, me = G.me, cfg = me.cfg;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j];
    if (a.sinking || b.sinking) continue;
    if (G.cors.lock && ((a === G.cors.lock.me && b === G.cors.lock.s) || (b === G.cors.lock.me && a === G.cors.lock.s))) continue;
    if (Math.abs(a.x - b.x) > (a.len + b.len) / 2 || Math.abs(a.y - b.y) > (a.len + b.len) / 2) continue;
    for (const [ax, ay, ar] of hullCircles(a)) for (const [bx, by, br] of hullCircles(b)) {
      const d = Math.hypot(bx - ax, by - ay);
      if (d >= ar + br || d < 0.01) continue;
      const push = (ar + br - d) / 2, nx = (bx - ax) / d, ny = (by - ay) / d;
      /* un navire de votre flotte s'efface devant celui que vous menez */
      const wa = a === me && b.fleet ? 0 : b === me && a.fleet ? 2 : 1, wb = 2 - wa;
      a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
      for (const q of [a, b]) if (q.safe && landHit(q)) { q.x = q.safe[0]; q.y = q.safe[1]; q.h = q.safe[2]; }
      if (a !== me && b !== me) continue;
      const o = a === me ? b : a, sg = a === me ? 1 : -1;
      if (o.captured || o.fleet || me.inv > 0 || me.ramT > 0) continue;
      /* n : de vous vers lui */
      const ux = nx * sg, uy = ny * sg, cx = (ax + bx) / 2, cy = (ay + by) / 2;
      const close = (me.vx - o.vx) * ux + (me.vy - o.vy) * uy;
      const myBow = ((cx - me.x) * Math.cos(me.h) + (cy - me.y) * Math.sin(me.h)) / (me.len / 2);
      const hisBow = ((cx - o.x) * Math.cos(o.h) + (cy - o.y) * Math.sin(o.h)) / (o.len / 2);
      /* l'éperonnage : il y faut le coup de boutoir (deux appuis sur ↑) au moment du choc ; sans
       * lui, on ne fait que heurter. Le coup grandit avec la vitesse, l'éperon, la cuirasse et le
       * poids de votre navire contre le sien. */
      const armed = W.t < (me.ramArm || 0);
      if (myBow > 0.3 && close > 55 && !armed) {
        if (close > 90 && !G.cors.tips.ram2) { G.cors.tips.ram2 = true; showHint(T('cor.tip.ram2')); }
      } else if (myBow > 0.3 && close > 55) {
        /* au-delà d'une bonne allure, le coup ne grandit plus : la coque cède avant l'éperon ; et un
         * navire plus lourd que l'autre n'en tire qu'un avantage borné */
        const k2 = (Math.min(close, 160) / 100) ** 2;
        const cu = cfg.cuirasse, mMe = corsMass(me), mO = corsMass(o);
        const hitO = 7 * k2 * (1 + 0.15 * Math.min(5, cu) + 0.06 * Math.max(0, cu - 5)) * (me.spec.ramK || 1) * Math.min(1.4, Math.sqrt(mMe / mO)) * Math.pow(o.toughF || 1, 0.75);
        const hitMe = 5 * k2 * (cfg.eperon ? 0.35 / (1 + 0.25 * (cfg.eperon - 1)) : 1) * Math.sqrt(mO / mMe);
        me.ramArm = 0;
        o.lastRam = W.t; o.cors && (o.cors.hitMe = W.t);
        damageShip(o, hitO);
        damageShip(me, hitMe);
        o.dx += ux * close * 0.7; o.dy += uy * close * 0.7;
        me.v *= 0.5;
        me.ramT = 0.8;
        fx.splinters(cx, cy, 16, '#c8b088'); fx.splash(cx, cy, 1.2);
        Snd.thud(Math.min(1, 0.4 + k2 * 0.3)); Snd.crack();
        G.shake = Math.min(1.2, (G.shake || 0) + 0.4 + k2 * 0.2);
        floatText(cx, cy - 30, T('cor.ram', Math.round(hitO)), 'gold');
        if (o.cors) corsOnShipHit(o, { owner: me });
        /* trop solide pour couler : il reste planté sur l'éperon, et l'on peut l'aborder */
        if (cfg.eperon && !o.sinking && o.hull > 0 && o.cors) corsRamLock(me, o);
        if (!G.cors.tips.ram) { G.cors.tips.ram = true; showHint(T('cor.tip.ram')); }
      } else if (hisBow > 0.3 && -close > 70) {
        /* c'est lui qui vous éperonne (le Kōtetsu a un éperon) */
        const k2 = (close / 100) ** 2;
        damageShip(me, 6 * k2 * (o.spec.id === 'kotetsu' ? 2.2 : 1) * Math.sqrt(o.len / me.len) * corsD().dmg);
        me.ramT = 0.8;
        Snd.thud(0.8); G.shake = Math.min(1.2, (G.shake || 0) + 0.6);
        fx.splinters(cx, cy, 10);
        floatText(me.x, me.y - 24, T('cor.rammedMe'), 'bad');
      } else if (Math.abs(close) > 160) {
        damageShip(me, (Math.abs(close) - 100) / 14);
        me.ramT = 0.6;
        Snd.thud(0.4);
        fx.splinters(cx, cy, 8);
      }
    }
  }
}

/* le navire éperonné qui n'a pas coulé reste planté sur l'éperon : il suit votre étrave, ne manœuvre
 * plus, et l'abordage commence (bord à bord, c'est la même réglette) ; on se dégage en reculant (↓),
 * et il se dégage seul au bout de quinze secondes si l'abordage n'avance pas */
function corsRamLock(me, o) {
  const C = G.cors, c = Math.cos(me.h), sn = Math.sin(me.h);
  const dx = o.x - me.x, dy = o.y - me.y;
  C.lock = { me, s: o, fx: dx * c + dy * sn, fy: -dx * sn + dy * c, dh: wrapA(o.h - me.h), t: 0 };
  o.v = 0; o.throttle = 0;
  if (!C.tips.lock) { C.tips.lock = true; showHint(T('cor.tip.lock')); }
}
function corsRamLockStep(dt) {
  const C = G.cors, L = C.lock;
  if (!L) return;
  const me = L.me, o = L.s;
  L.t += dt;
  const board = C.board && C.board.s === o ? C.board.f : 0;
  if (me !== G.me || me.sinking || o.sinking || o.captured || !G.ships.includes(o) || held('ArrowDown', 's') || (L.t > 15 && board < 0.5) || L.t > 40) {
    C.lock = null;
    if (!o.sinking && !o.captured) { o.dx = (o.dx || 0) + Math.cos(me.h) * 40; o.dy = (o.dy || 0) + Math.sin(me.h) * 40; }
    return;
  }
  /* planté sur l'étrave : il suit, et il freine le navire qui le porte */
  const c = Math.cos(me.h), sn = Math.sin(me.h);
  const x0 = o.x, y0 = o.y, h0 = o.h;
  o.x = me.x + L.fx * c - L.fy * sn; o.y = me.y + L.fx * sn + L.fy * c; o.h = me.h + L.dh;
  /* emporté contre la côte : il se dégage, et reste où il était */
  if (landHit(o)) { o.x = x0; o.y = y0; o.h = h0; C.lock = null; return; }
  o.vx = me.vx; o.vy = me.vy; o.v = 0; o.throttle = 0; o.w = 0;
  me.v = Math.min(me.v, maxSpeed(me) * 0.3);
}

/* le poids d'un navire, pour les chocs : la coque et ce qu'elle porte (le Kōtetsu, tout de fer) */
function corsMass(s) {
  if (s.spec.mass) return s.spec.mass;
  return s.spec.L * s.spec.B * 0.6 * (1 + 0.05 * (s.up ? s.up.coque : 0)) + (s.spec.id === 'kotetsu' ? 200 : 0);
}

/* le coup de boutoir : deux appuis sur ↑ coup sur coup ; un élan bref, et l'éperonnage armé */
function corsBoost(me) {
  const C = G.cors;
  C.boostCd = W.t + 3;
  me.boostT = 0.9; me.boostK = 1.3;
  me.ramArm = W.t + 1.2;
  me.throttle = 1;
  me.v = Math.min(maxSpeed(me), Math.max(0, me.v) + maxSpeed(me) * 0.35);
  const bx = me.x + Math.cos(me.h) * me.len * 0.5, by = me.y + Math.sin(me.h) * me.len * 0.5;
  fx.splash(bx, by, 1.1);
  floatText(me.x, me.y - 52, T('cor.boost'), 'gold');
  Snd.splash(0);
}

/* les débris : l'éperon les brise de face presque sans dommage */
function corsDebris() {
  const me = G.me, cfg = me.cfg;
  for (let j = G.objs.length - 1; j >= 0; j--) {
    const o = G.objs[j];
    if (!hitsShip(me, o.x, o.y, o.r * 0.82)) continue;
    const a = Math.atan2(me.y - o.y, me.x - o.x);
    const bow = cfg.eperon && o.type !== 'epave' && Math.cos(Math.atan2(o.y - me.y, o.x - me.x) - me.h) > 0.72 && me.v > 40;
    me.dx += Math.cos(a) * (bow ? 30 : 85); me.dy += Math.sin(a) * (bow ? 30 : 85); me.v *= bow ? 0.85 : 0.6;
    o.vx -= Math.cos(a) * 50; o.vy -= Math.sin(a) * 50;
    o.x -= Math.cos(a) * 5; o.y -= Math.sin(a) * 5;
    if (me.inv > 0) continue;
    const d = ARC[o.type];
    /* le choc dépend de l'allure : une coque de noix qui flâne ne s'y brise pas */
    const dmg = (o.type === 'radeau' ? d.dmg[o.size] : d.dmg) * (bow ? 0.25 : 1) * clamp(Math.abs(me.v) / 110, 0.3, 1.2);
    if (damageShip(me, dmg)) {
      me.inv = 0.5;
      Snd.thud(dmg / 25);
      G.shake = Math.min(1.2, (G.shake || 0) + dmg / 25);
      floatText(me.x, me.y, '-' + Math.round(dmg * (me.spec.armor || 1)), 'bad');
      fx.hit(lerp(me.x, o.x, 0.5), lerp(me.y, o.y, 0.5));
    }
    if (bow || o.type === 'brulot' || (o.type === 'radeau' && o.size === 1)) breakObj(j);
  }
}

/* ---------- les dangers de la mer : débris, coffres, brûlots, le temps ---------- */

function corsHazards(dt) {
  const me = G.me, C = G.cors;
  const safe = corsSafe(me.x, me.y);
  /* un champ de débris léger, qui s'épaissit avec la menace */
  C.debrisT -= dt;
  if (C.debrisT <= 0) {
    C.debrisT = 0.8;
    const want = { radeau: Math.min(14, 4 + Math.floor(C.threat)), amas: C.threat >= 2 ? 2 : 0, epave: C.threat >= 3 ? 1 : 0 };
    for (const type of ['radeau', 'amas', 'epave']) {
      if (G.objs.filter((o) => o.type === type).length >= want[type]) continue;
      const p = corsOffscreen(80);
      if (p) addObj(type, type === 'radeau' ? 3 : 0, p[0], p[1]);
      break;
    }
  }
  /* des coffres qui flottent, çà et là */
  C.chestT -= dt;
  if (C.chestT <= 0) {
    C.chestT = rnd(15, 8);
    if (G.chests.filter((c) => !c.spilled).length < 5) {
      const p = farFromShip(cam.w * 0.35, cam.w * 1.1);
      if (p && !corsSafe(p[0], p[1])) addChest(p[0], p[1], 12 + rnd(10) + 2 * C.threat);
    }
  }
  /* les brûlots, dès que la menace monte */
  C.brulotT -= dt;
  if (C.brulotT <= 0) {
    C.brulotT = rnd(75, 45) / Math.sqrt(Math.max(1, C.threat / 3));
    if (C.threat >= 2 && !safe && !me.sinking) launchBrulot();
  }
  /* le temps change : printemps, été, soir, nuit */
  C.ambT -= dt;
  if (C.ambT <= 0) {
    C.ambT = 240; C.ambI = (C.ambI + 1) % CORS_AMB.length;
    const amb = CORS_AMB[C.ambI];
    setSea({ wind: 180 + rnd(160), sea: 1.2 + rnd(1.4), season: amb === 'nuit' || amb === 'soir' ? 'soir' : amb, rain: Math.random() < 0.2 }, amb);
  }
  /* la musique : le combat quand on vous chasse, ou qu'un de vos ports est assiégé */
  C.musicT -= dt;
  if (C.musicT <= 0) {
    C.musicT = 2;
    const hunted = corsAIs().some((s) => s.cors.state === 'hunt' && dist(s.x, s.y, me.x, me.y) < 1600);
    Music.play(hunted || C.siege ? 'combat' : 'sea');
  }
}

/* ---------- les navires de l'ordinateur ---------- */

function corsPickType(threat) {
  const list = CORS_TYPES.filter((t) => t.from <= threat);
  let r = Math.random() * list.reduce((a, t) => a + t.w, 0);
  for (const t of list) { r -= t.w; if (r <= 0) return t.id; }
  return list[0].id;
}

/* un navire de l'ordinateur paraît dans un port ennemi, hors de vue du joueur */
function corsSpawn(at, armed) {
  const me = G.me, C = G.cors;
  let P = at;
  if (!P) {
    const cand = C.ports.filter((p) => p.state !== 'ours' && dist(p.hx, p.hy, me.x, me.y) > 2600);
    if (!cand.length) return null;
    /* de préférence pas trop loin du joueur, pour qu'il y ait de la rencontre */
    cand.sort((a, b) => dist(a.hx, a.hy, me.x, me.y) - dist(b.hx, b.hy, me.x, me.y));
    P = cand[Math.min(cand.length - 1, (Math.random() * Math.min(5, cand.length)) | 0)];
  }
  let id = corsPickType(C.threat);
  /* une escadre de secours, un navire de garde : des navires armés, pas le transport */
  for (let k = 0; armed && k < 8 && !((SHIPS[id].chase || 0) + (SHIPS[id].broad || 0)); k++) id = corsPickType(C.threat);
  const s = makeShip(id, P.hx + rndSym(60), P.hy + rndSym(60), rnd(TAU));
  s.faction = 'imperial';
  const D = corsD();
  s.ai = { anchored: false, weigh: true, route: [], wp: 0, fireT: rnd(3, 1.5), side: 0, wakeT: 0, slow: D.fire };
  s.cors = { state: 'patrol', dest: null, path: [], pi: 0, waitT: rnd(6, 1), alertT: 0, lostT: 0, repath: 0, gainT: rnd(110, 80) * D.gain, n: ++C.aiN, cargo: 0, dir: Math.random() < 0.5 ? 1 : -1, hitMe: -99 };
  /* le Kōtetsu reste redoutable, mais sa cuirasse ne le rend plus invulnérable */
  if (id === 'kotetsu') { s.armor = 0.35; s.heavy = true; }
  s.cors.thr = C.threat;
  s.up = { voilure: 0, coque: 0, canons: 0 };
  const start = Math.min(15, Math.floor(0.45 * (C.threat - 1)) + D.start);
  for (let i = 0; i < start; i++) corsGain(s, null, true);
  corsSetHull(s, true);
  s.dmgMe = Math.min(1.8, 1 + 0.05 * (C.threat - 1)) * D.dmg;
  /* ses boulets : selon le calibre de chaque pièce, et l'état de ses équipages */
  s.kE = (CORS_FOE.dmg[0] + (CORS_FOE.dmg[1] - CORS_FOE.dmg[0]) * corsRamp(C.threat)) * D.dmg;
  /* sa manière : en ligne de bataille, ou à la recherche de l'enfilade */
  const doc = CORS_DOCTRINE[id];
  s.cors.rake = !!doc && rnd() < doc.rake;
  s.throttle = 0.4;
  G.ships.push(s);
  return s;
}

/* plus on avance, plus souvent les navires de l'ordinateur viennent en escadre : un chef de file,
 * et deux ou trois navires dans son sillage */
function corsSpawnGroup(room) {
  const owned = corsOwned();
  const lead = corsSpawn();
  if (!lead) return;
  if (room < 2 || owned < 3 || Math.random() > 0.2 + 0.025 * owned) return;
  const k = Math.min(room - 1, 1 + (owned >= 10 && Math.random() < 0.5 ? 1 : 0) + (owned >= 20 && Math.random() < 0.5 ? 1 : 0));
  const P = G.cors.ports.reduce((b, p) => (dist(p.hx, p.hy, lead.x, lead.y) < dist(b.hx, b.hy, lead.x, lead.y) ? p : b));
  for (let i = 0; i < k; i++) {
    const s = corsSpawn(P);
    if (!s) break;
    s.cors.lead = lead; s.cors.slot = i + 1;
  }
}

function corsSetHull(s, full) {
  const D = corsD(), thr = s.cors && s.cors.thr !== undefined ? s.cors.thr : G.cors.threat;
  const k = CORS_FOE.hull[0] + (CORS_FOE.hull[1] - CORS_FOE.hull[0]) * corsRamp(thr);
  const m = Math.round(corsHullOf(s.spec) * k * D.hull * (1 + 0.12 * upEff(s.up.coque)));
  if (full) s.hull = m; else s.hull = Math.min(m, s.hull + (m - (s.hullMax || m)));
  s.hullMax = m;
  /* ce qu'il encaisse de plus qu'avant la version 6 (deuxième mise à jour) : l'éperon et vos forts,
   * qui frappent d'un nombre fixe, s'y règlent */
  s.toughF = m / (s.spec.hull * (s.spec.id === 'kotetsu' ? 0.35 : 0.75) * D.hull * (1 + 0.2 * upEff(s.up.coque)));
}

/* un cran de plus pour un navire de l'ordinateur : plus de voiles, de coque ou de canons */
function corsGain(s, kind, quiet) {
  const kinds = Object.keys(PRISES).filter((k) => s.up[k] < MAX_UP);
  if (!kinds.length) return;
  const k = kind && s.up[kind] < MAX_UP ? kind : kinds[(Math.random() * kinds.length) | 0];
  s.up[k]++;
  if (k === 'coque') corsSetHull(s, false);
  if (!quiet && dist(s.x, s.y, G.me.x, G.me.y) < cam.w) floatText(s.x, s.y - 40, T('cor.gain', shipName(s.spec), tx(PRISES[k].label)), 'bad');
}

function corsHunt(s, alert) {
  const C = s.cors;
  if (alert) C.alertT = Math.max(C.alertT, alert);
  if (C.state === 'hunt' || C.state === 'prize' || C.state === 'repair' || C.state === 'tuto') return;
  if (!corsArmed(s)) { C.state = 'flee'; return; }
  C.state = 'hunt'; C.lostT = 0; C.repath = 0;
  s.ai.side = 0; s.ai.fireT = Math.max(s.ai.fireT, rnd(2, 1));
  if (W.t - G.cors.huntSaid > 6) {
    G.cors.huntSaid = W.t;
    floatText(s.x, s.y - 50, T('cor.hunt', shipName(s.spec)), 'bad');
    Snd.bell(2);
  }
}

/* la chasse finie, il retourne à sa route, ou au siège qu'il menait */
function corsEndHunt(s) {
  const C = s.cors, S = G.cors.siege;
  C.state = C.siegeOf && C.siegeOf.state === 'ours' && S && S.ships.includes(s) ? 'siege' : 'patrol';
  C.dest = null; C.path = []; C.waitT = rnd(3, 1);
  /* l'escadre de secours, sa chasse finie, rejoint la circulation ordinaire */
  C.relief = null;
}

/* l'alarme d'un port : tous les navires armés des environs accourent */
function corsAlarm(P) {
  const first = P.alarmT <= 0;
  P.alarmT = 70;
  if (!first) return;
  banner(T('cor.alarm', portName(P)), T('cor.alarm2'), 2.6);
  Snd.bell(3);
  let n = 0;
  for (const s of corsAIs()) {
    /* une escadre de siège ne se détourne pas pour l'alarme d'un autre port : elle va au sien */
    if (s.captured || !corsArmed(s) || s.cors.state === 'siege') continue;
    if (dist(s.x, s.y, P.hx, P.hy) < 5000) { corsHunt(s, 60); n++; }
  }
  /* personne aux environs : le port arme un navire de garde */
  if (n === 0 && !G.cors.tuto) { const s = corsSpawn(P, true); if (s) { s.cors.waitT = 0; corsHunt(s, 60); } }
  /* et il appelle à l'aide : une escadre de secours part du port ennemi voisin */
  if (W.t > (P.reliefT || 0)) { P.reliefT = W.t + 240; corsRelief(P, 0); }
}

/* l'escadre de secours : du port ennemi voisin, assez loin pour qu'on la voie venir, des navires
 * armés qui foncent sur vous ; plus forte autour des grandes villes et quand la menace monte. La
 * seconde (wave 1), quand la batterie tombe, compte un navire de moins. */
function corsRelief(P, wave) {
  const C = G.cors, me = G.me;
  /* des navires à leur taille : moins nombreux qu'avant la version 6 (deuxième mise à jour), mais
   * chacun pèse deux fois plus */
  const n = clamp(Math.floor((C.threat - 1) / 3), 1, 5) + (P.major ? 1 : 0) - wave + corsD().relief;
  if (n <= 0) return;
  const from = C.ports.filter((q) => q !== P && q.state === 'enemy' && dist(q.hx, q.hy, P.hx, P.hy) > 2600 && dist(q.hx, q.hy, me.x, me.y) > cam.w)
    .sort((a, b) => dist(a.hx, a.hy, P.hx, P.hy) - dist(b.hx, b.hy, P.hx, P.hy))[0];
  let k = 0, lead = null;
  for (let i = 0; i < n; i++) {
    const s = corsSpawn(from, true);
    if (!s) break;
    s.cors.relief = P; s.cors.waitT = 0;
    /* l'escadre de secours vient en ligne de file, derrière le premier navire */
    if (lead) { s.cors.lead = lead; s.cors.slot = i; } else lead = s;
    corsHunt(s, 150);
    k++;
  }
  if (k) showHint(T(from ? 'cor.relief' : 'cor.relief.sea', portName(P), from ? portName(from) : '', k));
}

/* le joueur touche un navire de l'ordinateur : il riposte, et ses voisins l'entendent */
function corsOnShipHit(s, p) {
  if (!s.cors || s.captured || !p || !(p.owner === G.me || (p.owner && p.owner.fleet))) return;
  s.cors.hitMe = W.t;
  corsHunt(s, 40);
  for (const o of corsAIs()) if (o !== s && !o.captured && dist(o.x, o.y, s.x, s.y) < 1800) corsHunt(o, 30);
}

/* la première fois qu'un type de navire paraît dans la traversée, on le présente : son nom et ce
 * qu'il est (« le Kasuga, corvette à roues ») */
function corsSightings(dt) {
  const C = G.cors, me = G.me;
  C.seenT = Math.max(0, C.seenT - dt);
  if (C.seenT > 0 || HUD.hintT > 0) return;
  for (const s of corsAIs()) {
    if (s.captured || s.sinking || C.seen[s.spec.id] || dist(s.x, s.y, me.x, me.y) > cam.w * 0.45) continue;
    C.seen[s.spec.id] = true; C.seenT = 7;
    showHint(T('cor.seen', LANG === 'ja' ? s.spec.jp : s.spec.name, tx(s.spec.kind)));
    return;
  }
}

function corsAIsStep(dt) {
  const C = G.cors;
  const n = corsAIs().filter((s) => !s.captured && !s.cors.siegeOf && !s.cors.relief).length;
  C.spawnT -= dt;
  if (C.spawnT <= 0 && n < C.crowd) { C.spawnT = rnd(14, 8) / (1 + corsOwned() / 12) * corsD().spawn; corsSpawnGroup(C.crowd - n); }
  for (const s of corsAIs()) corsAI(s, dt);
  for (let i = G.ships.length - 1; i >= 0; i--) {
    const s = G.ships[i];
    if (!s.cors) continue;
    if (s.sinking && !s.cors.looted && !s.captured) { s.cors.looted = true; corsLoot(s); }
    if (s.sunk || s.gone) G.ships.splice(i, 1);
  }
}

/* un navire de l'ordinateur coule : son or remonte en coffres */
function corsLoot(s) {
  const C = G.cors;
  const ups = s.up.voilure + s.up.coque + s.up.canons;
  const v = corsValue(s) + (s.cors.cargo || 0);
  corsDropGold(s.x, s.y, v, v > 90 ? 3 : 2, 0.1);
  /* coulé par vous (et non par la batterie d'un de vos ports) : la gloire est pour vous */
  if (W.t - (s.cors.hitMe || -99) < 10) {
    addScore(250 + 40 * ups, s.x, s.y);
    C.stats.sinks++;
    if (s.lastRam && W.t - s.lastRam < 2.5) { C.stats.rams++; floatText(s.x, s.y - 44, T('cor.rammed', shipName(s.spec)), 'gold'); }
    else floatText(s.x, s.y - 44, T('cor.sunk', shipName(s.spec)), 'gold');
  }
}

/* une coque trop longue pour la crique où elle s'est engagée (le moteur n'y peut rien) : on la
 * déhale jusqu'à l'eau libre la plus proche, où elle tient sans toucher la rive ni un autre navire */
function corsUnbeach(s) {
  const x0 = s.x, y0 = s.y, h0 = s.h;
  const clear = () => !landHit(s) && G.ships.every((o) => o === s || o.sunk || hullGap(o, s) > 10);
  for (let r = 30; r <= 900; r += 30) {
    const n = Math.max(8, Math.round(r / 15));
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, x = x0 + Math.cos(a) * r, y = y0 + Math.sin(a) * r;
      if (nearLand(x, y, s.wid)) continue;
      for (const h of [h0, a, h0 + Math.PI]) {
        s.x = x; s.y = y; s.h = h;
        if (!clear()) continue;
        s.v = 0; s.w = 0; s.mx = 0; s.my = 0; s.dx = 0; s.dy = 0;
        s.safe = [x, y, h]; s.stuckT = 0; s.trail = [];
        if (s === G.me) floatText(x, y - 40, T('cor.afloat'), 'gold');
        return true;
      }
    }
  }
  s.x = x0; s.y = y0; s.h = h0;
  return false;
}

function corsSteer(s, dt, tx_, ty_, thr) {
  let want = Math.atan2(ty_ - s.y, tx_ - s.x);
  /* l'eau libre devant, sinon on cherche de part et d'autre */
  const look = s.len * 0.7 + Math.max(60, Math.abs(s.v) * 1.3);
  const blocked = (a) => !corsClear(s.x + Math.cos(a) * look, s.y + Math.sin(a) * look, s.wid);
  if (blocked(want)) {
    for (const off of [0.4, -0.4, 0.8, -0.8, 1.3, -1.3, 2, -2, 2.7, -2.7]) if (!blocked(want + off)) { want += off; thr *= 0.75; break; }
  }
  const diff = wrapA(want - s.h);
  steerShip(s, dt, false, false, diff < -0.05, diff > 0.05);
  s.throttle = lerp(s.throttle, thr, clamp(dt * 1.5, 0, 1));
}

function corsFollow(s, dt, thr) {
  const C = s.cors;
  while (C.pi < C.path.length && dist(s.x, s.y, C.path[C.pi][0], C.path[C.pi][1]) < 140) C.pi++;
  if (C.pi >= C.path.length) return true;
  const [x, y] = C.path[C.pi];
  corsSteer(s, dt, x, y, thr);
  return false;
}

/* la cible d'un navire de l'ordinateur : le navire de la flotte le plus proche, de préférence
 * celui que vous menez ; il n'en change pas à tout instant */
function corsTarget(s) {
  const me = G.me, F = G.cors.fleet, C = s.cors;
  if (!F || F.length < 2) return me;
  if (C.tgt && C.tgtT > W.t && F.includes(C.tgt) && !C.tgt.sinking && !(C.tgt.fleet.rep && !C.tgt.fleet.arr)) return C.tgt;
  let best = me, bd = me.sinking ? Infinity : dist(s.x, s.y, me.x, me.y) * 0.8;
  /* un navire qui se replie pour réparer n'est plus chassé : on s'en prend à la ligne */
  for (const f of F) { if (f === me || f.sinking || (f.fleet.rep && !f.fleet.arr)) continue; const d = dist(s.x, s.y, f.x, f.y); if (d < bd) { bd = d; best = f; } }
  C.tgt = best; C.tgtT = W.t + 1.5;
  return best;
}

function corsAI(s, dt) {
  const C = s.cors, K = G.cors;
  if (s.sinking) { steerShip(s, dt, false, false, false, false); moveOnMap(s, dt); return; }
  if (K.lock && K.lock.s === s) return;
  /* une prise reprend son pas : l'équipage de prise ne force pas l'allure */
  if (s.captured) { s.paceK = 1; corsPrize(s, dt); moveOnMap(s, dt); return; }
  const me = corsTarget(s);
  s.ai.target = me;
  const d = dist(s.x, s.y, me.x, me.y);
  const safe = corsSafe(me.x, me.y) || me.sinking;
  if (C.alertT > 0) C.alertT -= dt;
  /* avec le temps, il grandit aussi */
  C.gainT -= dt;
  if (C.gainT <= 0) { C.gainT = rnd(130, 90) * corsD().gain; corsGain(s, null, false); }
  /* il vous voit : un navire armé vous prend en chasse (si vous valez un boulet), un transport s'enfuit ;
   * une escadre de siège ne lâche sa proie que si vous venez sur elle (ou si vous tirez sur l'un des siens) */
  if (C.state !== 'hunt' && C.state !== 'repair' && C.state !== 'tuto' && !safe) {
    if (corsArmed(s)) { if (C.state === 'siege' ? d < 520 : (K.sight && d < K.sight) || (C.alertT > 0 && d < 3500)) corsHunt(s, 0); }
    else if (d < 520 && C.state !== 'flee') C.state = 'flee';
  }
  /* qui vous chasse ne se laisse pas distancer : il force l'allure, jusqu'à une part de la vôtre
   * (corsD().chase), sans dépasser chaseCap fois la sienne ; la chasse finie, il reprend son pas */
  {
    const D = corsD(), own = maxSpeed(s) / (s.paceK || 1);
    const want = C.state === 'hunt' && !safe && own > 0 && d > 650 ? clamp(D.chase * maxSpeed(me) / (me.boostK || 1) / own, 1, D.chaseCap) : 1;
    s.paceK = lerp(s.paceK || 1, want, clamp(dt * 0.6, 0, 1));
  }
  /* il repêche les coffres qui flottent près de lui : vous retrouverez cet or dans sa cale */
  if (C.state === 'patrol' || C.state === 'collect') {
    for (let i = G.chests.length - 1; i >= 0; i--) {
      const it = G.chests[i];
      if (!hitsShip(s, it.x, it.y, it.r + 6)) continue;
      G.chests.splice(i, 1);
      fx.splash(it.x, it.y, 0.6);
      C.cargo = (C.cargo || 0) + it.coins;
      if (d < cam.w) floatText(it.x, it.y - 20, T('cor.ai.chest', shipName(s.spec)), 'bad');
    }
    if (!C.item || !G.chests.includes(C.item)) {
      C.item = null;
      let bd = 650;
      for (const it of G.chests) { const dd = dist(it.x, it.y, s.x, s.y); if (dd < bd && corsLos(s.x, s.y, it.x, it.y, 60)) { bd = dd; C.item = it; } }
      if (C.item) C.state = 'collect';
      else if (C.state === 'collect') C.state = 'patrol';
    }
  }
  switch (C.state) {
    case 'hunt': {
      if (safe) C.lostT += dt * 2;
      else if (d > 2300 && C.alertT <= 0) C.lostT += dt;
      else C.lostT = Math.max(0, C.lostT - dt);
      if (C.lostT > 9) { corsEndHunt(s); break; }
      /* touché à mort, il rompt le combat et va se faire réparer au port ennemi le plus proche (une
       * fois ; la deuxième, il se bat jusqu'au bout) */
      if (corsArmed(s) && s.hull < s.hullMax * CORS_FOE.flee && !C.siegeOf && !C.mended && corsRetreat(s)) break;
      const clearShot = d < 1500 && corsLos(s.x, s.y, me.x, me.y, 55);
      if (clearShot) {
        s.ai.sight = 1e9; s.ai.weigh = true; s.ai.anchored = false;
        corsCombat(s, dt, me, safe);
      } else {
        /* la côte entre vous : il contourne par les chenaux */
        C.repath -= dt;
        if (C.repath <= 0 || !C.path.length) { C.repath = 3; C.path = corsPath(s.x, s.y, me.x, me.y); C.pi = 0; }
        corsFollow(s, dt, 0.95);
      }
      break;
    }
    case 'flee': {
      if (d > 1500) { corsEndHunt(s); break; }
      const away = Math.atan2(s.y - me.y, s.x - me.x);
      corsSteer(s, dt, s.x + Math.cos(away) * 600, s.y + Math.sin(away) * 600, 1);
      break;
    }
    case 'collect': {
      if (!C.item) { C.state = 'patrol'; break; }
      corsSteer(s, dt, C.item.x, C.item.y, 0.75);
      break;
    }
    case 'siege': corsSiegeAI(s, dt); break;
    case 'repair': corsRepairAI(s, dt, me, d); break;
    /* le didacticiel : la proie tourne en rond, à petite allure */
    case 'tuto': corsSteer(s, dt, s.x + Math.cos(s.h + 0.16) * 300, s.y + Math.sin(s.h + 0.16) * 300, 0.3); break;
    default: {
      /* en escadre : dans le sillage du chef de file, tant qu'il fait route ; s'il vous prend en
       * chasse, l'escadre le suit au combat, toujours en ligne */
      const L = C.lead;
      if (L && G.ships.includes(L) && !L.sinking && !L.captured && L.cors.state === 'hunt' && corsArmed(s)) { corsHunt(s, 30); break; }
      if (L && (!G.ships.includes(L) || L.sinking || L.captured || L.cors.state !== 'patrol')) C.lead = null;
      else if (L) {
        if (L.cors.waitT > 0) { s.throttle = lerp(s.throttle, 0, clamp(dt, 0, 1)); steerShip(s, dt, false, false, false, false); break; }
        const gap = C.slot * ((L.len + s.len) / 2 + 60);
        corsSteer(s, dt, L.x - Math.cos(L.h) * gap, L.y - Math.sin(L.h) * gap, clamp(L.throttle + (dist(s.x, s.y, L.x, L.y) > gap * 1.3 ? 0.25 : 0), 0, 1));
        break;
      }
      if (C.waitT > 0) {
        C.waitT -= dt;
        s.throttle = lerp(s.throttle, 0, clamp(dt, 0, 1));
        steerShip(s, dt, false, false, false, false);
        break;
      }
      if (!C.dest || !C.path.length) {
        /* le prochain port ennemi : plutôt un port proche du joueur, pour qu'on se croise */
        const ports = K.ports.filter((p) => p.state !== 'ours' && p !== C.dest);
        if (!ports.length) { C.waitT = 5; break; }
        let tot = 0;
        const w = ports.map((p) => { const v = 1 / (1 + dist(p.hx, p.hy, G.me.x, G.me.y) / 3500) + 0.15 / (1 + dist(p.hx, p.hy, s.x, s.y) / 3000); tot += v; return v; });
        let r = Math.random() * tot, P = ports[0];
        for (let i = 0; i < ports.length; i++) { r -= w[i]; if (r <= 0) { P = ports[i]; break; } }
        C.dest = P; C.path = corsPath(s.x, s.y, P.hx + rndSym(120), P.hy + rndSym(120)); C.pi = 0;
      }
      if (corsFollow(s, dt, 0.62)) { C.path = []; C.waitT = rnd(14, 5); }
    }
  }
  /* loin de tout, on ne s'occupe que de sa route ; près du joueur, les chocs comptent */
  moveOnMap(s, dt);
}

/* ---------- le combat d'un navire de l'ordinateur ----------
 * Chacun selon sa manière (CORS_DOCTRINE) : il tient la distance de ses pièces, et soit il se bat
 * par le travers, en tournant autour de sa cible, soit il cherche l'enfilade : la place devant
 * l'étrave ou derrière la poupe de sa cible, d'où sa bordée la prend dans toute sa longueur. Le
 * Kōtetsu fonce l'étrave en avant, son canon de 300 livres pointé par les sabords de l'avant. En
 * escadre, les navires restent dans le sillage du chef de file, et leurs bordées partent l'une
 * après l'autre en passant. */
function corsCombat(s, dt, me, safe) {
  const A = s.ai, C = s.cors, doc = CORS_DOCTRINE[s.spec.id] || CORS_DOCTRINE.choyo;
  const d = dist(s.x, s.y, me.x, me.y), toMe = Math.atan2(me.y - s.y, me.x - s.x), side = wrapA(toMe - s.h) > 0 ? 1 : -1;
  let tx, ty, thr;
  /* en ligne de file derrière son chef de file, tant qu'il se bat et qu'il n'est pas trop loin */
  const L = C.lead;
  if (L && (!G.ships.includes(L) || L.sinking || L.captured || L.cors.state !== 'hunt' || s.hull < s.hullMax * 0.5 || (d < 220 && dist(s.x, s.y, L.x, L.y) > 700))) C.lead = null;
  C.passT = (C.passT || 0) - dt;
  if (C.lead) {
    const gap = C.slot * ((L.len + s.len) / 2 + 60);
    tx = L.x - Math.cos(L.h) * gap; ty = L.y - Math.sin(L.h) * gap;
    thr = clamp(L.throttle + (dist(s.x, s.y, tx, ty) > gap * 0.4 ? 0.3 : 0), 0.3, 1);
  } else if (doc.ram) {
    /* droit sur lui, en visant où il sera */
    const lt = Math.min(1.6, d / Math.max(80, maxSpeed(s)));
    tx = me.x + me.vx * lt; ty = me.y + me.vy * lt; thr = 1;
  } else {
    const R = doc.range, c = Math.cos(me.h), n = Math.sin(me.h);
    /* sa place par rapport à la cible : en avant (+) ou en arrière, à droite (+) ou à gauche de son axe */
    const fx_ = (s.x - me.x) * c + (s.y - me.y) * n, fy = -(s.x - me.x) * n + (s.y - me.y) * c;
    /* la passe d'enfilade : déjà vers l'avant ou l'arrière de sa cible, il coupe son axe à bonne
     * distance, toute sa bordée dehors, puis reprend le combat par le travers */
    if (C.pass && (Math.sign(fy) !== C.pass.side || C.pass.t < 0)) { C.pass = null; C.passT = rnd(14, 8); }
    if (!C.pass && C.rake && C.passT <= 0 && d < R + 260 && Math.abs(fx_) > Math.abs(fy) * 0.9) C.pass = { end: fx_ > 0 ? 1 : -1, side: Math.sign(fy) || 1, t: 9 };
    if (C.pass) {
      C.pass.t -= dt;
      const ax = me.x + c * R * C.pass.end + me.vx * 0.5, ay = me.y + n * R * C.pass.end + me.vy * 0.5;
      tx = ax + n * C.pass.side * 260; ty = ay - c * C.pass.side * 260;
      tx = ax - (tx - ax); ty = ay - (ty - ay);
      thr = 0.95;
    } else if (d > R + 150) {
      /* il approche, de biais, pour arriver par le travers */
      const want = toMe - side * 0.35;
      tx = s.x + Math.cos(want) * 200; ty = s.y + Math.sin(want) * 200; thr = 0.95;
    } else {
      /* par le travers : il tourne autour de sa cible, en se rapprochant ou en s'éloignant */
      const off = d > R + 50 ? Math.PI / 2 - 0.5 : d < R - 60 ? Math.PI / 2 + 0.5 : Math.PI / 2;
      const want = toMe - side * off;
      tx = s.x + Math.cos(want) * 200; ty = s.y + Math.sin(want) * 200;
      thr = d > R + 50 ? 0.85 : 0.6;
    }
  }
  /* trop près : il s'écarte (on ne l'aborde pas si facilement) */
  if (!doc.ram && d < 130 && !C.lead) { const away = toMe + Math.PI - side * 0.8; tx = s.x + Math.cos(away) * 200; ty = s.y + Math.sin(away) * 200; thr = 1; }
  corsSteer(s, dt, tx, ty, thr);
  if (safe) return;
  if (s.spec.gatling && d < 270) gatling(s, me.x + me.vx * 0.2, me.y + me.vy * 0.2, dt);
  A.fireT -= dt;
  if (A.fireT <= 0 && d < 480 && corsFire(s, me)) A.fireT = rnd(CORS_FOE.rate[1], CORS_FOE.rate[0]) * (A.slow || 1) * coolUp(s.up ? s.up.canons : 0);
}

/* les pièces qui portent tirent ; renvoie combien ont tiré. Comme les vôtres, celles de la bordée
 * partent droit par le travers ; celles à pivot et celles de chasse se pointent sur la cible, là où
 * elle est (sans la viser en avant) */
function corsFire(s, t) {
  const d = dist(s.x, s.y, t.x, t.y), rel = wrapA(Math.atan2(t.y - s.y, t.x - s.x) - s.h), side = rel > 0 ? 1 : -1, ar = Math.abs(rel);
  const abeam = Math.abs(ar - Math.PI / 2) < 0.38;
  const bears = (g) => (g.arc === 'side' ? abeam && g.side === side : g.arc === 'pivot' ? ar > 0.35 && ar < 2.3 : g.arc === 'bow' ? ar < g.wide : ar > Math.PI - g.wide);
  const list = corsGunsOf(s.spec).filter((g) => bears(g) && d < g.range);
  /* ses crans de canons : une pièce de plus par bord tous les trois crans, et des pièces de chasse */
  const lvl = s.up ? s.up.canons : 0;
  if (abeam) for (let i = 0; i < Math.floor(lvl / 3); i++) list.push({ arc: 'side', side, x: (i % 2 ? 0.12 : -0.12) * (1 + i), dmg: 12, range: 410 });
  if (ar < 0.4 && d < 410) for (let i = 0; i < (lvl >= 2 ? 1 : 0) + (lvl >= 6 ? 1 : 0); i++) list.push({ arc: 'bow', wide: 0.4, x: 0.45, dmg: 12, range: 410 });
  if (!list.length) return 0;
  const c = Math.cos(s.h), n = Math.sin(s.h);
  for (const g of list) {
    const by = g.arc === 'side' ? g.side * s.wid * 0.5 : 0, bx = g.x * s.len;
    const ox = s.x + bx * c - by * n, oy = s.y + bx * n + by * c;
    const a = (g.arc === 'side' ? s.h + g.side * Math.PI / 2 : Math.atan2(t.y - oy, t.x - ox)) + rndSym(CORS_FOE.aim);
    G.shots.push({ x: ox, y: oy, vx: Math.cos(a) * 520 + s.vx * 0.5, vy: Math.sin(a) * 520 + s.vy * 0.5, life: g.range / 520, owner: s, dmg: 10, dmgE: g.dmg * (s.kE || 0.5), kind: 'boulet', src: 'ship' });
    fx.muzzle(ox, oy, Math.cos(a), Math.sin(a));
  }
  Snd.cannon(list.length > 2 ? 22 : 14, dist(s.x, s.y, G.me.x, G.me.y));
  G.flashAt = [s.x, s.y, 120 + list.length * 60];
  s.fireT = W.t; s.fireSide = abeam ? side : 0; s.fireChase = !abeam;
  if (abeam) s.kick = -side * Math.min(0.08, 0.02 * list.length);
  return list.length;
}

/* l'enfilade : le boulet d'un navire file dans l'axe d'un autre (à moins de 25 degrés) et le frappe
 * par l'avant ou par l'arrière ; au corsaire seulement, et de navire à navire (les batteries tirent
 * comme avant) */
function corsRake(s, p) {
  if (!(G.game === 'arcade' && G.arc && G.arc.variant === 'corsaire' && G.cors) || !p.owner || !p.owner.spec) return false;
  const v = Math.hypot(p.vx, p.vy) || 1, c = Math.cos(s.h), n = Math.sin(s.h);
  if (Math.abs(p.vx * c + p.vy * n) / v < 0.906) return false;
  return Math.abs((p.x - s.x) * c + (p.y - s.y) * n) > s.len * 0.22;
}
function corsRakeSaid(s, p, ours) {
  if (W.t - (s._rakeSaid || -9) < 1.2) return;
  s._rakeSaid = W.t;
  floatText(s.x, s.y - 34, T(ours ? 'cor.rakeMe' : 'cor.rake'), ours ? 'bad' : 'gold');
  Snd.crack();
  fx.splinters(p.x, p.y, 10, '#c8b088');
  if (!ours && G.cors.tuto) G.cors.tuto.raked = true;
  else if (!ours && !G.cors.tips.rake) { G.cors.tips.rake = true; showHint(T('cor.tip.rake')); }
}

/* touché à mort : il rompt et fait route vers le port ennemi le plus proche ; false s'il n'en a pas.
 * Pas vers celui que vous attaquez, ni vers celui où vous êtes : sous le feu, on ne répare rien */
function corsRetreat(s) {
  const C = s.cors, K = G.cors, me = G.me;
  let P = null, bd = 9000;
  for (const q of K.ports) {
    if (q.state !== 'enemy' || q.alarmT > 0 || dist(q.hx, q.hy, me.x, me.y) < 1600) continue;
    const dd = dist(q.hx, q.hy, s.x, s.y); if (dd < bd) { bd = dd; P = q; }
  }
  if (!P) return false;
  C.state = 'repair'; C.dest = P; C.path = corsPath(s.x, s.y, P.hx, P.hy); C.pi = 0; C.lead = null; C.mended = true;
  if (dist(s.x, s.y, G.me.x, G.me.y) < cam.w) floatText(s.x, s.y - 50, T('cor.retreat', shipName(s.spec)), 'gold');
  return true;
}
/* il se replie, à l'allure que lui laisse sa coque (on peut le rattraper), ses pièces de retraite
 * sur qui le suit ; au port, on le répare */
function corsRepairAI(s, dt, me, d) {
  const C = s.cors, P = C.dest;
  if (!P || P.state !== 'enemy') { if (!corsRetreat(s)) { C.state = 'patrol'; C.dest = null; C.path = []; } return; }
  /* vous attaquez le port où il se répare : il se bat avec ce qui lui reste */
  if (P.alarmT > 0) { C.state = 'patrol'; C.dest = null; C.path = []; corsHunt(s, 60); return; }
  if (dist(s.x, s.y, P.hx, P.hy) > 260) {
    if (!C.path.length) { C.path = corsPath(s.x, s.y, P.hx, P.hy); C.pi = 0; }
    if (corsFollow(s, dt, 0.7)) C.path = [];
  } else {
    s.throttle = lerp(s.throttle, 0, clamp(dt, 0, 1));
    steerShip(s, dt, false, false, false, false);
    s.hull = Math.min(s.hullMax, s.hull + s.hullMax * 0.05 * dt);
    if (s.hull >= s.hullMax * 0.92) { C.state = 'patrol'; C.dest = null; C.path = []; C.waitT = rnd(4, 1); }
  }
  s.ai.fireT -= dt;
  if (s.ai.fireT <= 0 && d < 430 && !me.sinking && !corsSafe(me.x, me.y) && corsFire(s, me)) s.ai.fireT = rnd(CORS_FOE.rate[1], CORS_FOE.rate[0]) * (s.ai.slow || 1);
}

/* une prise : l'équipage de prise la mène au port à vous le plus proche */
function corsPrize(s, dt) {
  const C = s.cors, me = G.me;
  const P = C.dest && C.dest.state === 'ours' ? C.dest : (C.dest = corsNearestOurs(s.x, s.y));
  if (!C.path.length) { C.path = corsPath(s.x, s.y, P.hx, P.hy); C.pi = 0; }
  const done = corsFollow(s, dt, 0.55);
  if (done || dist(s.x, s.y, me.x, me.y) > cam.w * 1.8) s.gone = true;
}

/* ---------- les ports ---------- */

function corsPortsStep(dt) {
  const me = G.me, C = G.cors;
  corsShellsStep(dt);
  for (const P of C.ports) {
    if (P.alarmT > 0) P.alarmT -= dt;
    if (P.hitT > 0) P.hitT -= dt;
    if (P.role !== 'home') corsDefenses(P, dt);
    if (P.state === 'down') {
      /* la ville réduite au silence fume ; si personne ne la prend, l'ennemi relève sa batterie */
      P.downT -= dt;
      if (Math.random() < dt * 3 && dist(P.bx, P.by, me.x, me.y) < cam.w * 1.2) fx.push({ k: 'smoke', x: P.bx + rndSym(30), y: P.by + rndSym(30), z0: 10, vx: 0, vy: 0, r: rnd(9, 5), grow: 14, life: rnd(4, 2.5), age: 0, a: 0.5, tone: 0, air: true });
      if (P.downT <= 0) { P.state = 'enemy'; P.hp = P.hpMax; P.owner.faction = 'imperial'; for (const o of P.outs) o.hp = o.hpMax; corsZones(); }
      corsOutpostsStep(P, dt);
      continue;
    }
    if (P.state === 'enemy') {
      const range = P.alarmT > 0 ? 820 : 430;
      let t = null, bd = range;
      /* la batterie tire sur le navire le plus proche ; celui qui se replie pour réparer passe après
       * ceux qui se battent encore */
      for (const f of C.fleet) { if (f.sinking) continue; const d = dist(P.bx, P.by, f.x, f.y) * (f.fleet && f.fleet.rep && !f.fleet.arr ? 1.6 : 1); if (d < bd) { bd = d; t = f; } }
      if (t) {
        P.fireT -= dt;
        /* pas dans la mêlée : un de ses navires près de la cible, ou dans la ligne de tir, et elle attend */
        if (P.fireT <= 0) { if (corsFriendInLine(P.bx, P.by, t)) { P.fireT = 0.4; if (t === me && !C.tips.shield && P.alarmT > 0) { C.tips.shield = true; showHint(T('cor.tip.shield')); } } else { P.fireT = rnd(3.3, 2.2) * (1 - 0.025 * Math.min(12, C.threat)) * corsD().fire; corsPortFire(P, t); } }
      }
      /* laissée tranquille, la batterie se répare */
      if (P.hp < P.hpMax && W.t - (P.hitAt || -99) > 30) P.hp = Math.min(P.hpMax, P.hp + P.hpMax * 0.004 * dt);
      corsOutpostsStep(P, dt);
      continue;
    }
    /* un port à vous : le tribut s'amasse, la batterie défend la rade */
    C.tribute += (P.role === 'home' ? 1 / 5 : P.major ? 1 / 2 : 1 / 4) * (1 + 0.25 * P.fort) * dt;
    if (P.fort > 0 && P.hp > 0) {
      P.fireT -= dt;
      if (P.fireT <= 0) {
        let best = null, bd = FORT.range[P.fort];
        for (const s of corsAIs()) { if (s.sinking || s.captured) continue; const dd = dist(P.bx, P.by, s.x, s.y); if (dd < bd) { bd = dd; best = s; } }
        P.fireT = best ? rnd(3, 2.3) : 0.5;
        if (best) corsFortFire(P, best);
      }
    }
    /* la batterie se relève peu à peu quand l'ennemi n'est plus là */
    if (P.hp < P.hpMax && !(C.siege && C.siege.P === P)) P.hp = Math.min(P.hpMax, P.hp + P.hpMax * 0.012 * dt);
    corsOutpostsStep(P, dt);
  }
  corsSiegeStep(dt);
}

/* les forts avancés : ceux de l'ennemi tirent sur la flotte (et se réparent si on les laisse) ; ceux
 * d'un port à vous tirent sur les navires ennemis ; réduits au silence, ils fument */
function corsOutpostsStep(P, dt) {
  const C = G.cors, me = G.me;
  for (const o of P.outs) {
    if (o.hp <= 0) {
      if (Math.random() < dt * 1.5 && dist(o.x, o.y, me.x, me.y) < cam.w * 1.2) fx.push({ k: 'smoke', x: o.x + rndSym(16), y: o.y + rndSym(16), z0: 8, vx: 0, vy: 0, r: rnd(7, 4), grow: 11, life: rnd(3.5, 2), age: 0, a: 0.45, tone: 0, air: true });
      continue;
    }
    if (P.state !== 'ours' && o.hp < o.hpMax && W.t - o.hitAt > 30) o.hp = Math.min(o.hpMax, o.hp + o.hpMax * 0.004 * dt);
    o.fireT -= dt;
    if (o.fireT > 0) continue;
    if (P.state === 'ours') {
      let best = null, bd = 560;
      for (const s of corsAIs()) { if (s.sinking || s.captured) continue; const d = dist(o.x, o.y, s.x, s.y); if (d < bd) { bd = d; best = s; } }
      o.fireT = best ? rnd(3.6, 2.8) : 0.6;
      if (best) corsGunFire(o.x, o.y, best, 2, 9 * (best.toughF || 1), o.owner);
    } else {
      const range = P.alarmT > 0 ? 700 : 430;
      let t = null, bd = range;
      for (const f of C.fleet) { if (f.sinking) continue; const d = dist(o.x, o.y, f.x, f.y) * (f.fleet && f.fleet.rep && !f.fleet.arr ? 1.6 : 1); if (d < bd) { bd = d; t = f; } }
      if (t && corsFriendInLine(o.x, o.y, t)) { o.fireT = 0.4; continue; }
      o.fireT = t ? rnd(3.8, 2.6) * (1 - 0.02 * Math.min(12, C.threat)) * corsD().fire : 0.6;
      if (t) corsGunFire(o.x, o.y, t, 1 + (C.threat >= 5 ? 1 : 0), 6, o.owner);
    }
  }
}

/* ---------- les défenses propres à chaque ville ----------
 * Les grandes villes ont deux mortiers dans leur batterie : leurs bombes montent haut et retombent
 * là où un cercle rouge se resserre sur l'eau ; on les évite en changeant de cap ou d'allure, et
 * faire taire la batterie fait taire les mortiers. Les villes à donjon ont leur château, qui tire
 * de loin par-dessus les toits, et jusqu'à ce que la ville soit prise ; à vous, il défend le port.
 * Les autres ports (ni mortiers ni château) lâchent des brûlots quand on les attaque. */
const CORS_MORTAR = { dmg: 20, r: 40, T: 2.4, apex: 210, every: [9, 6.5] };
const CORS_CASTLE = { dmg: 6, every: [10, 7] };
const CORS_FIRESHIP = { every: [50, 32], near: 750 };
/* le navire de votre flotte le plus proche, entre lo et hi d'un point */
function corsFleetNear(x, y, lo, hi) {
  let t = null, bd = hi;
  for (const f of G.cors.fleet) { if (f.sinking) continue; const d = dist(x, y, f.x, f.y) * (f.fleet && f.fleet.rep && !f.fleet.arr ? 1.6 : 1); if (d >= lo && d < bd) { bd = d; t = f; } }
  return t;
}
function corsDefenses(P, dt) {
  const C = G.cors, me = G.me, D = corsD();
  if (P.major && P.state === 'enemy') {
    P.mortT = (P.mortT === undefined ? rnd(4, 2) : P.mortT) - dt;
    if (P.mortT <= 0) {
      const t = corsFleetNear(P.bx, P.by, 180, P.alarmT > 0 ? 1050 : 650);
      P.mortT = t ? rnd(CORS_MORTAR.every[0], CORS_MORTAR.every[1]) * D.fire * (1 - 0.02 * Math.min(12, C.threat)) : 1;
      if (t) corsMortar(P, t);
    }
  }
  if (!P.major && !P.castle && P.state === 'enemy' && P.alarmT > 0) {
    P.fsT = (P.fsT === undefined ? rnd(9, 5) : P.fsT) - dt;
    if (P.fsT <= 0) {
      P.fsT = rnd(CORS_FIRESHIP.every[0], CORS_FIRESHIP.every[1]) * D.fire;
      if (!me.sinking && dist(me.x, me.y, P.hx, P.hy) < CORS_FIRESHIP.near && !G.objs.some((o) => o.type === 'brulot' && o.port === P)) corsFireship(P, me);
    }
  }
  if (P.castle) corsCastleStep(P, dt);
}

/* une bombe de mortier : elle part de la batterie, monte, et retombe où sera le navire, à peu près */
function corsMortar(P, t) {
  const C = G.cors, D = corsD(), d = dist(P.bx, P.by, t.x, t.y), ft = CORS_MORTAR.T + d / 900;
  const x = t.x + t.vx * ft * 0.8 + rndSym(45), y = t.y + t.vy * ft * 0.8 + rndSym(45);
  if (G.mapLand(x, y)) return;
  C.shells.push({ x0: P.bx, y0: P.by, x, y, t: 0, T: ft, dmg: CORS_MORTAR.dmg * (0.6 + 0.4 * corsRamp(C.threat)) * D.dmg, r: CORS_MORTAR.r, apex: CORS_MORTAR.apex + d * 0.12 });
  for (let i = 0; i < 6; i++) fx.push({ k: 'smoke', x: P.bx + rndSym(8), y: P.by + rndSym(8), z0: 12, vx: rndSym(14), vy: rndSym(14), r: rnd(9, 5), grow: 12, life: rnd(2.6, 1.6), age: 0, a: 0.55, tone: 2, air: true });
  fx.push({ k: 'flash', x: P.bx, y: P.by, vx: 0, vy: 0, r: 8, grow: 60, life: 0.16, age: 0, a: 1 });
  Snd.cannon(26, dist(P.bx, P.by, G.me.x, G.me.y));
  if (!C.tips.mortar && dist(P.bx, P.by, G.me.x, G.me.y) < 1100) { C.tips.mortar = true; showHint(T('cor.tip.mortar')); }
}
function corsShellsStep(dt) {
  const C = G.cors, me = G.me;
  for (let i = C.shells.length - 1; i >= 0; i--) {
    const b = C.shells[i];
    b.t += dt;
    if (b.t < b.T) continue;
    C.shells.splice(i, 1);
    /* elle tombe : en plein sur un navire, ou tout près ; sinon une gerbe d'eau */
    let hit = false;
    for (const f of C.fleet) {
      if (f.sinking) continue;
      const k = hitsShip(f, b.x, b.y, b.r * 0.45) ? 1 : hitsShip(f, b.x, b.y, b.r) ? 0.5 : 0;
      if (!k) continue;
      if (damageShip(f, b.dmg * k)) { hit = true; if (f === me) { G.shake = Math.min(1.4, (G.shake || 0) + 0.6 * k); floatText(me.x, me.y - 30, T('cor.mortar.hit'), 'bad'); } }
    }
    if (hit) { fx.explosion(b.x, b.y, 0.8); Snd.crack(); }
    else { fx.splash(b.x, b.y, 2.2); Snd.splash(dist(b.x, b.y, me.x, me.y)); }
  }
}

/* un brûlot sort du port, droit sur vous */
function corsFireship(P, t) {
  const a = Math.atan2(t.y - P.hy, t.x - P.hx), x = P.hx + Math.cos(a) * 60, y = P.hy + Math.sin(a) * 60;
  if (G.mapLand(x, y)) return;
  const sp = rnd(ARC.brulot.speed[1], ARC.brulot.speed[0]) * 0.85;
  const o = addObj('brulot', 0, x, y, Math.cos(a) * sp, Math.sin(a) * sp);
  o.life = 18; o.target = t; o.homeT = 3.4; o.port = P;
  floatText(x, y - 20, T('cor.fireship', portName(P)), 'bad');
  Snd.bell(1);
  if (!G.cors.tips.fireship) { G.cors.tips.fireship = true; showHint(T('cor.tip.fireship')); }
}

/* le château : ennemi, il tire sur votre flotte par-dessus la ville (la ville prise, il se tait) ;
 * à vous, sur les navires ennemis qui approchent */
function corsCastleStep(P, dt) {
  const C = G.cors, D = corsD(), [cx, cy] = P.castle;
  /* il commande la rade et la plage, pas toute la baie */
  const range = P.castleR || (P.castleR = Math.max(520, dist(cx, cy, P.hx, P.hy) + 160));
  P.castT = (P.castT === undefined ? rnd(4, 2) : P.castT) - dt;
  if (P.castT > 0) return;
  if (P.state === 'ours') {
    let best = null, bd = range;
    for (const s of corsAIs()) { if (s.sinking || s.captured) continue; const d = dist(cx, cy, s.x, s.y); if (d < bd) { bd = d; best = s; } }
    P.castT = best ? rnd(CORS_CASTLE.every[0], CORS_CASTLE.every[1]) : 1;
    if (best) corsCastleFire(P, best, 12 * (best.toughF || 1), undefined);
    return;
  }
  /* il ne se mêle de rien tant qu'on n'attaque pas la ville ; l'alarme donnée, il tire jusqu'à ce
   * qu'elle soit prise */
  const t = P.state === 'down' || P.alarmT > 0 ? corsFleetNear(cx, cy, 0, range) : null;
  P.castT = t ? rnd(CORS_CASTLE.every[0], CORS_CASTLE.every[1]) * D.fire * (1 - 0.02 * Math.min(12, C.threat)) : 1;
  if (t) {
    corsCastleFire(P, t, 10, CORS_CASTLE.dmg * (0.6 + 0.4 * corsRamp(C.threat)) * D.dmg);
    if (!C.tips.castle && dist(cx, cy, G.me.x, G.me.y) < range) { C.tips.castle = true; showHint(T('cor.tip.castle', portName(P))); }
  }
}
function corsCastleFire(P, t, dmg, dmgE) {
  const [cx, cy] = P.castle, d = dist(cx, cy, t.x, t.y), lt = d / 520;
  const a = Math.atan2(t.y + t.vy * lt - cy, t.x + t.vx * lt - cx) + rndSym(0.05);
  /* le boulet passe par-dessus les toits : il ne s'arrête pas à la terre avant d'avoir gagné l'eau */
  let land = 0;
  for (let k = 20; k < d && G.mapLand(cx + Math.cos(a) * k, cy + Math.sin(a) * k); k += 20) land = k;
  const shot = { x: cx, y: cy, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: (d + 90) / 520, owner: P.owner, dmg, kind: 'boulet', grace: (land + 40) / 520, src: 'castle' };
  if (dmgE !== undefined) shot.dmgE = dmgE;
  G.shots.push(shot);
  fx.muzzle(cx, cy, Math.cos(a), Math.sin(a));
  P.castFired = W.t;
  for (let i = 0; i < 3; i++) fx.push({ k: 'smoke', x: cx + rndSym(6), y: cy + rndSym(6), z0: 24, vx: rndSym(10), vy: rndSym(10), r: rnd(7, 4), grow: 10, life: rnd(2.4, 1.4), age: 0, a: 0.5, tone: 2, air: true });
  Snd.cannon(20, dist(cx, cy, G.me.x, G.me.y));
}

/* une pièce de côte tire : n boulets vers la cible, en visant devant elle */
function corsGunFire(x0, y0, t, n, dmg, owner) {
  const lead = dist(x0, y0, t.x, t.y) / 520;
  const tx_ = t.x + t.vx * lead, ty_ = t.y + t.vy * lead;
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(ty_ - y0, tx_ - x0) + rndSym(0.1);
    const x = x0 + Math.cos(a) * 22, y = y0 + Math.sin(a) * 22;
    G.shots.push({ x, y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 1.6, owner, dmg, kind: 'boulet', grace: 0.6, src: 'outpost' });
    fx.muzzle(x, y, Math.cos(a), Math.sin(a));
  }
  Snd.cannon(16, dist(x0, y0, G.me.x, G.me.y));
}

/* les batteries et les forts ne tirent pas dans la mêlée : un navire des leurs près de la cible, ou
 * dans la ligne de tir, et ils retiennent leur feu (on peut s'en faire un bouclier) */
function corsFriendInLine(x0, y0, t) {
  const dx = t.x - x0, dy = t.y - y0, L2 = dx * dx + dy * dy || 1;
  for (const s of corsAIs()) {
    if (s.sinking || s.captured || s.faction !== 'imperial') continue;
    if (dist(s.x, s.y, t.x, t.y) < 110) return true;
    const u = ((s.x - x0) * dx + (s.y - y0) * dy) / L2;
    if (u > 0 && u < 1 && Math.hypot(x0 + dx * u - s.x, y0 + dy * u - s.y) < 50 + s.len * 0.3) return true;
  }
  return false;
}

/* une batterie ennemie tire sur vous (ou sur un navire de votre flotte) */
function corsPortFire(P, t) {
  const me = t || G.me, C = G.cors;
  const lead = dist(P.bx, P.by, me.x, me.y) / 520;
  const tx_ = me.x + me.vx * lead, ty_ = me.y + me.vy * lead;
  const n = 2 + (C.threat >= 4 ? 1 : 0) + (P.major && C.threat >= 7 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(ty_ - P.by, tx_ - P.bx) + rndSym(0.1);
    const x = P.bx + Math.cos(a) * 30, y = P.by + Math.sin(a) * 30;
    G.shots.push({ x, y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 1.7, owner: P.owner, dmg: 6, kind: 'boulet', grace: 0.6, src: 'battery' });
    fx.muzzle(x, y, Math.cos(a), Math.sin(a));
  }
  Snd.cannon(18, dist(P.bx, P.by, G.me.x, G.me.y));
}

/* la batterie d'un port à vous tire sur le navire ennemi le plus proche */
function corsFortFire(P, t) {
  const lead = dist(P.bx, P.by, t.x, t.y) / 520;
  const tx_ = t.x + t.vx * lead, ty_ = t.y + t.vy * lead;
  for (let i = 0; i < FORT.guns[P.fort]; i++) {
    const a = Math.atan2(ty_ - P.by, tx_ - P.bx) + rndSym(0.07);
    const x = P.bx + Math.cos(a) * 30, y = P.by + Math.sin(a) * 30;
    G.shots.push({ x, y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 1.6, owner: P.owner, dmg: 10 * (t.toughF || 1), kind: 'boulet', grace: 0.6 });
    fx.muzzle(x, y, Math.cos(a), Math.sin(a));
  }
  Snd.cannon(18, dist(P.bx, P.by, G.me.x, G.me.y));
}

/* une batterie ennemie par le travers, à portée de bordée : de quel bord (0 sinon) */
function corsBatteryAbeam(me) {
  const side = (x, y) => {
    if (dist(x, y, me.x, me.y) > 430) return 0;
    const rel = wrapA(Math.atan2(y - me.y, x - me.x) - me.h);
    return Math.abs(Math.abs(rel) - Math.PI / 2) < 0.5 ? (rel > 0 ? 1 : -1) : 0;
  };
  for (const P of G.cors.ports) {
    if (P.state === 'ours') continue;
    const k = P.state === 'enemy' ? side(P.bx, P.by) : 0;
    if (k) return k;
    /* les forts avancés reçoivent aussi la bordée */
    for (const o of P.outs) { if (o.hp <= 0) continue; const j = side(o.x, o.y); if (j) return j; }
  }
  return 0;
}

/* vos boulets sur les batteries ennemies ; true si le boulet s'arrête là */
function corsShot(p) {
  if (!G.cors || !(p.owner === G.me || (p.owner && p.owner.fleet))) return false;
  for (const P of G.cors.ports) {
    if (P.state === 'ours') continue;
    for (const o of P.outs) {
      if (o.hp <= 0 || (p.x - o.x) ** 2 + (p.y - o.y) ** 2 > 50 * 50) continue;
      o.hp -= p.dmg || 10; o.hitAt = W.t;
      fx.hit(p.x, p.y); fx.splinters(p.x, p.y, 5, '#8f897c');
      Snd.hit(0);
      corsAlarm(P);
      if (o.hp <= 0) corsOutpostDown(P, o);
      return true;
    }
    if (P.state !== 'enemy') continue;
    if ((p.x - P.bx) ** 2 + (p.y - P.by) ** 2 > 70 * 70) continue;
    P.hp -= p.dmg || 10; P.hitAt = W.t;
    fx.hit(p.x, p.y); fx.splinters(p.x, p.y, 6, '#8f897c');
    Snd.hit(0);
    corsAlarm(P);
    if (!G.cors.tips.port) { G.cors.tips.port = true; showHint(T('cor.tip.port')); }
    if (P.hp <= 0) corsPortDown(P);
    return true;
  }
  return false;
}

/* les boulets d'une escadre de siège : ils passent par-dessus le rivage jusqu'à la batterie */
function corsSiegeShot(p) {
  const P = p.siege, me = G.me;
  if ((p.x - P.bx) ** 2 + (p.y - P.by) ** 2 < 60 * 60) {
    if (P.state === 'ours' && P.hp > 0) {
      P.hp = Math.max(0, P.hp - p.dmg); P.hitT = 0.3;
      fx.hit(p.x, p.y); fx.splinters(p.x, p.y, 5, '#8f897c');
      if (P.hp <= 0) { fx.explosion(P.bx, P.by, 0.9); floatText(P.bx, P.by - 40, T('cor.fort.down', portName(P)), 'bad'); }
    }
    return true;
  }
  for (const f of G.cors.fleet) {
    if (f.sinking || !hitsShip(f, p.x, p.y, 5)) continue;
    if (damageShip(f, 5 * (p.owner.dmgMe || 1))) { fx.hit(p.x, p.y); Snd.hit(f === me ? 0 : dist(f.x, f.y, me.x, me.y)); if (f === me) G.shake = Math.min(1, (G.shake || 0) + 0.25); }
    return true;
  }
  return false;
}

/* un fort avancé réduit au silence */
function corsOutpostDown(P, o) {
  const C = G.cors;
  o.hp = 0;
  fx.explosion(o.x, o.y, 0.9);
  floatText(o.x, o.y - 40, T('cor.out.down', portName(P)), 'gold');
  addScore(200 + 25 * Math.floor(C.threat), o.x, o.y);
  Snd.bell(1);
  /* un petit coffre au pied de la pointe, côté mer */
  corsDropGold(o.x + Math.cos(o.a) * 80, o.y + Math.sin(o.a) * 80, 12 + 3 * C.threat, 1);
}

/* un port ennemi réduit au silence : il reste à le prendre ; la ville appelle encore à l'aide */
function corsPortDown(P) {
  const C = G.cors;
  P.state = 'down'; P.downT = 150; P.hp = 0; P.alarmT = 0;
  fx.explosion(P.bx, P.by, 1.4);
  banner(T('cor.down', portName(P)), T(P.outs.some((o) => o.hp > 0) ? 'cor.down2.out' : 'cor.down2'), 3);
  addScore(500 + 50 * Math.floor(C.threat), P.hx, P.hy);
  Snd.levelUp();
  corsDropGold(P.hx, P.hy, (P.major ? 60 : 30) + 6 * C.threat, 2);
  corsZones();
  if (W.t > (P.relief2T || 0)) { P.relief2T = W.t + 240; corsRelief(P, 1); }
}

/* on entre dans la rade et l'on prend le port : ses magasins, son chantier, son charbon */
function corsTake(P) {
  const C = G.cors, me = G.me;
  P.state = 'ours'; P.fort = 0; P.hpMax = 0; P.hp = 0; P.owner.faction = 'ezo'; P.alarmT = 0; P.fallT = 0;
  /* ses forts avancés passent à vous, remis en état */
  for (const o of P.outs) { o.owner.faction = 'ezo'; o.hp = Math.max(1, o.hpMax); o.fireT = rnd(3, 1); }
  C.stats.taken++;
  C.lastPort = P.id;
  corsGold(P.major ? 300 + 60 * C.threat : 120 + 30 * C.threat, me.x, me.y - 40);
  addScore(P.major ? 2000 : 1000, P.hx, P.hy);
  banner(T('cor.take', portName(P)), T('cor.take2'), 3.2);
  Snd.levelUp(); Snd.bell(2);
  corsZones(); corsScale();
  /* les navires ennemis au mouillage lèvent l'ancre */
  for (const s of corsAIs()) if (!s.captured && s.cors.state !== 'hunt' && dist(s.x, s.y, P.hx, P.hy) < 700) { s.cors.state = 'patrol'; s.cors.dest = null; s.cors.path = []; s.cors.waitT = 0; }
  if (CORS_ARSENALS.includes(P.id) && !C.bought[P.id]) showOrders(T('flt.arsenal.k'), T('flt.arsenal', portName(P)), 5.5);
  else if (!C.tips.fort) { C.tips.fort = true; showOrders(T('cor.tip.fort.k'), T('cor.tip.fort'), 3.4); }
  const n = corsOwned();
  /* huit ports pris : le Kōtetsu rejoint la flotte de l'arcade */
  if (n >= 8 && !arcadeLoad().fin) {
    try { const all = arcadeLoad(); all.fin = true; localStorage.setItem(ARCADE_SAVE, JSON.stringify(all)); } catch (e) { /* rien */ }
    showOrders(T('res.unlock'), T('cor.unlock'), 6);
  }
  corsaireSave();
  /* le dernier port : on laisse l'annonce se faire, puis le Japon est à vous */
  if (n >= CORS_PORTS && !C.won) C.winT = 3.4;
}

/* un de vos ports retombe aux mains de l'ennemi */
function corsPortLost(P) {
  const C = G.cors;
  P.state = 'enemy'; P.fort = 0; P.owner.faction = 'imperial'; P.hpMax = 0;
  for (const o of P.outs) { o.owner.faction = 'imperial'; o.hpMax = 0; }
  corsScale();
  P.hp = P.hpMax * 0.6;
  for (const o of P.outs) o.hp = o.hpMax * 0.6;
  C.stats.lost++;
  if (C.lastPort === P.id) C.lastPort = corsNearestOurs(P.hx, P.hy).id;
  banner(T('cor.lost', portName(P)), T('cor.lost2'), 3);
  Snd.bell(3);
  fleetPortLost(P);
  corsSiegeEnd(false);
  corsZones();
  corsSavePorts();
}

/* ---------- les sièges : l'ennemi vient reprendre ce que vous avez pris ---------- */

function corsSiegeStep(dt) {
  const C = G.cors, me = G.me;
  const owned = corsOwnedPorts();
  if (!C.siege) {
    if (!owned.length) { C.siegeT = Math.max(C.siegeT, 150); return; }
    C.siegeT -= dt;
    if (C.siegeT <= 0) corsSiegeLaunch();
    return;
  }
  const S = C.siege, P = S.P;
  S.ships = S.ships.filter((s) => G.ships.includes(s) && !s.sinking && !s.captured);
  if (P.state !== 'ours') { C.siege = null; return; }
  if (!S.ships.length) { corsSiegeEnd(true); return; }
  /* l'escadre devant la rade : la batterie d'abord, puis la garnison */
  const near = S.ships.some((s) => dist(s.x, s.y, P.hx, P.hy) < 760);
  if (near) {
    S.t += dt;
    if (!S.started) { S.started = true; if (dist(me.x, me.y, P.hx, P.hy) > cam.w) banner(T('cor.siege.on', portName(P)), T('cor.siege.on2'), 2.6); }
    if (P.hp <= 0) { P.fallT -= dt; if (P.fallT <= 0) corsPortLost(P); }
  } else S.way = (S.way || 0) + dt;
  /* elle se lasse au bout d'un moment devant la rade (ou d'une trop longue route) */
  if (S.t > 300 || S.way > 420) corsSiegeEnd(true);
}

function corsSiegeLaunch() {
  const C = G.cors, me = G.me;
  const owned = corsOwnedPorts();
  /* de préférence un port mal défendu */
  let tot = 0;
  const w = owned.map((P) => { const v = (4 - P.fort) * (dist(P.hx, P.hy, me.x, me.y) < 7000 ? 1.5 : 1); tot += v; return v; });
  let r = Math.random() * tot, P = owned[0];
  for (let i = 0; i < owned.length; i++) { r -= w[i]; if (r <= 0) { P = owned[i]; break; } }
  /* l'escadre part du port ennemi le plus proche de sa cible, hors de votre vue */
  const src = C.ports.filter((p) => p.state !== 'ours' && dist(p.hx, p.hy, me.x, me.y) > cam.w * 1.2).sort((a, b) => dist(a.hx, a.hy, P.hx, P.hy) - dist(b.hx, b.hy, P.hx, P.hy))[0];
  if (!src) { C.siegeT = 60; return; }
  const n = Math.min(6 + corsD().siegeN, 1 + corsD().siegeN + Math.floor((C.threat - 1) / 3) + Math.floor(owned.length / 6));
  const ships = [];
  for (let i = 0; i < n; i++) {
    const s = corsSpawn(src);
    if (!s) continue;
    s.cors.state = 'siege'; s.cors.siegeOf = P; s.cors.waitT = 0; s.cors.repath = 0;
    ships.push(s);
  }
  if (!ships.length) { C.siegeT = 60; return; }
  C.siege = { P, ships, t: 0, started: false };
  P.fallT = P.fort ? 20 : 30;
  banner(T('cor.siege', portName(P)), ships.length > 1 ? T('cor.siege2', ships.length) : T('cor.siege2.1'), 3.2);
  Snd.bell(3);
  if (!C.tips.siege) { C.tips.siege = true; showHint(T('cor.tip.siege')); }
  C.siegeT = rnd(270, 170) * (owned.length >= 15 ? 0.65 : owned.length >= 6 ? 0.8 : 1) * corsD().siege;
}

function corsSiegeEnd(held) {
  const C = G.cors, S = C.siege;
  if (!S) return;
  C.siege = null;
  /* une escadre qui n'est jamais arrivée devant la rade n'a rien assiégé : pas de « le port a tenu » */
  if (!S.started) held = false;
  for (const s of S.ships) if (G.ships.includes(s) && !s.sinking && !s.captured) { s.cors.siegeOf = null; if (s.cors.state === 'siege') { s.cors.state = 'patrol'; s.cors.dest = null; s.cors.path = []; } }
  if (held && S.P.state === 'ours') {
    banner(T('cor.held', portName(S.P)), T('cor.held2'), 2.6);
    C.tribute += 40 + 10 * C.threat;
    addScore(500);
  }
}

/* une escadre de siège : elle gagne la rade, tourne au large et canonne la batterie */
function corsSiegeAI(s, dt) {
  const C = s.cors, P = C.siegeOf;
  if (!P || P.state !== 'ours') { C.siegeOf = null; corsEndHunt(s); return; }
  const d0 = dist(s.x, s.y, P.hx, P.hy);
  if (d0 > 600) {
    C.repath -= dt;
    if (!C.path.length || C.repath <= 0) { C.repath = 8; C.path = corsPath(s.x, s.y, P.hx, P.hy); C.pi = 0; }
    corsFollow(s, dt, 0.85);
  } else {
    const a = Math.atan2(s.y - P.hy, s.x - P.hx) + 0.6 * C.dir;
    corsSteer(s, dt, P.hx + Math.cos(a) * 240, P.hy + Math.sin(a) * 240, 0.4);
  }
  s.ai.fireT -= dt;
  if (s.ai.fireT <= 0 && P.hp > 0 && dist(s.x, s.y, P.bx, P.by) < 720) { s.ai.fireT = rnd(3.4, 2.3) * corsD().fire; corsSiegeFire(s, P); }
}

function corsSiegeFire(s, P) {
  const n = clamp((s.spec.broad || 0) + (s.spec.chase || 0), 1, 3);
  const dd = dist(s.x, s.y, P.bx, P.by);
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(P.by - s.y, P.bx - s.x) + rndSym(0.08);
    const x = s.x + Math.cos(a) * s.len * 0.3, y = s.y + Math.sin(a) * s.len * 0.3;
    G.shots.push({ x, y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: dd / 520 + 0.3, owner: s, dmg: 5 * (s.dmgMe || 1), kind: 'boulet', siege: P });
    fx.muzzle(x, y, Math.cos(a), Math.sin(a));
  }
  Snd.cannon(14, dist(s.x, s.y, G.me.x, G.me.y));
  s.fireT = W.t; s.fireChase = true; s.fireSide = 0;
}

/* ---------- la fin : coulé, ou le Japon pris ---------- */

/* l'écran de fin ne garde ni l'annonce ni les ordres de la partie */
function corsClearBanner() {
  HUD.bannerT = 0; el('banner').classList.remove('show'); hideOrders();
}

function corsaireOver() {
  const C = G.cors;
  G.mode = 'over';
  corsClearBanner();
  if (C.tuto) {
    showResults({ kicker: T('tuto.title'), title: T('cor.res.sank', fleetName(G.me, true), ''), actions: [{ label: T('tuto.again'), go: startCorsaireTuto }, { label: T('menu.main'), go: showTitle }] });
    return;
  }
  const isRecord = G.score > (G.best || 0);
  G.best = Math.max(G.best || 0, G.score);
  const [bk] = corsRecKey(C.diff || 0);
  arcadeSave('corsaire', { [bk]: G.best });
  Music.sting('lose');
  Music.play('brief');
  const v = corsVoyage();
  const last = v ? C.ports.find((p) => p.id === v.last) || C.home : null;
  showResults({
    kicker: T('menu.corsaire') + ' · ' + T('cor.diff.' + corsD().id),
    /* le nom du navire avec son article (« La Mouette s'est échouée ») */
    title: T(G.me.capsized ? 'cor.res.capsized' : G.me.aground ? 'cor.res.aground' : 'cor.res.sank', fleetName(G.me, true), (FLEET_NAMES[G.me.fleet ? G.me.fleet.n : 0] || FLEET_NAMES[0]).art === 'la' ? 'e' : ''),
    sub: T('cor.res.sub', corsOwned(), CORS_PORTS),
    tip: last ? T('cor.res.tip', portName(last), fmt0(v.coins)) : '',
    stats: [[T('res.score'), G.score, isRecord ? T('arc.newrec') : ''], [T('cor.st.ports'), corsOwned()], [T('cor.st.sinks'), C.stats.sinks], [T('cor.st.boards'), C.stats.boards], [T('cor.st.gold'), C.stats.earned]],
    actions: [
      ...(last ? [{ label: T('cor.again', portName(last)), go: () => startCorsaire(true) }] : []),
      { label: T('cor.fresh'), go: () => startCorsaire(false, C.diff || 0) },
      { label: T('menu.main'), go: showTitle },
    ],
  });
}

function corsVictory() {
  const C = G.cors;
  if (C.won) return;
  C.won = true; C.winT = 0;
  G.best = Math.max(G.best || 0, G.score);
  const [bk, wk] = corsRecKey(C.diff || 0);
  arcadeSave('corsaire', { [wk]: true, [bk]: G.best });
  corsaireSave();
  G.mode = 'menu';
  corsClearBanner();
  Music.sting('win');
  Music.play('brief');
  showResults({
    kicker: T('menu.corsaire') + ' · ' + T('cor.diff.' + corsD().id),
    title: T('cor.win.t'),
    sub: T('cor.win.s'),
    after: T('cor.win.text'),
    stats: [[T('res.score'), G.score], [T('cor.st.sinks'), C.stats.sinks], [T('cor.st.boards'), C.stats.boards], [T('cor.st.rams'), C.stats.rams], [T('cor.st.gold'), C.stats.earned]],
    actions: [
      { label: T('cor.win.go'), go: () => { menuHide(); clearInput(); G.mode = 'play'; showHud(true); Music.play('sea'); } },
      { label: T('menu.main'), go: showTitle },
    ],
  });
}

/* ---------- ce que montre l'écran ---------- */

/* ce qu'on peut faire là où l'on est : la ligne d'objectif du HUD */
function corsGoalLine() {
  const C = G.cors, me = G.me, P = C.here;
  if (me.sinking) return '';
  if (C.tuto && C.tuto.step && !C.board && !(C.landing && C.landing.why !== 'away')) return tutoGoal();
  if (C.board) return T('cor.g.board');
  if (P && P.state === 'ours') return T(CORS_ARSENALS.includes(P.id) && !C.bought[P.id] ? 'cor.g.arsenal' : 'cor.g.yard', portName(P));
  const L = C.landing;
  if (L && L.why !== 'away') return T(L.why === 'far' ? 'cor.g.beach' : L.why === 'fast' ? 'cor.g.stop' : L.why === 'fire' ? 'cor.g.fire' : 'cor.g.take', portName(L.P));
  if (C.siege) return T('cor.g.siege', portName(C.siege.P));
  if (C.auto <= 0) return T('cor.g.auto');
  if (me.hull < me.hullMax * 0.3) return T('cor.g.repair');
  return T('cor.g.free');
}

/* les flèches : les coffres, le port assiégé, les ports à prendre, un abri quand ça va mal */
function corsTargets(out) {
  const C = G.cors, me = G.me;
  if (me.sinking) return;
  if (C.tuto) tutoTargets(out);
  const vig = me.cfg.vigie || 0;
  G.chests.slice().sort((a, b) => dist(a.x, a.y, me.x, me.y) - dist(b.x, b.y, me.x, me.y)).slice(0, 2 + vig).forEach((c) => out.push([c.x, c.y, '#ffd98a', T('ptr.chest')]));
  /* la vigie signale les navires qui vous chassent, de plus en plus loin */
  if (vig) {
    const far = 1500 + 800 * vig;
    corsAIs().filter((s) => s.cors.state === 'hunt' && !s.sinking && !s.cors.relief && dist(s.x, s.y, me.x, me.y) < far).sort((a, b) => dist(a.x, a.y, me.x, me.y) - dist(b.x, b.y, me.x, me.y)).slice(0, vig).forEach((s) => out.push([s.x, s.y, '#ff8a6a', shipName(s.spec)]));
  }
  if (C.siege) out.push([C.siege.P.hx, C.siege.P.hy, '#ff6a4a', T('ptr.siege', portName(C.siege.P))]);
  for (const P of C.ports) if (P.state === 'down') out.push([P.lx, P.ly, '#ffd98a', T('ptr.take', portName(P))]);
  /* l'escadre de secours qui vient sur vous */
  let rs = null, rd = 7000;
  for (const s of corsAIs()) { if (!s.cors.relief || s.cors.state !== 'hunt' || s.sinking) continue; const d = dist(s.x, s.y, me.x, me.y); if (d < rd) { rd = d; rs = s; } }
  if (rs) out.push([rs.x, rs.y, '#ff6a4a', T('ptr.relief')]);
  if (me.hull < me.hullMax * 0.35 || C.auto < 0.3) { const P = corsNearestOurs(me.x, me.y); out.push([P.hx, P.hy, '#9ad8a0', portName(P)]); }
}

/* les batteries, les forts et les navires de l'ordinateur à l'écran ; la jauge d'abordage */
function corsaireDraw(c) {
  const C = G.cors;
  if (!C) return;
  c.textAlign = 'center';
  const label = (t, px, y, col) => { c.lineWidth = 4; c.strokeStyle = 'rgba(8,12,18,0.7)'; c.strokeText(t, px, y); c.fillStyle = col; c.fillText(t, px, y); };
  for (const P of C.ports) {
    if (P.role === 'home') continue;
    const [px, py, ok] = toScreen(P.bx, P.by, 30);
    if (!ok || px < -60 || py < -60 || px > cam.pw + 60 || py > cam.ph + 60) continue;
    const y = py + 34;
    c.font = 'italic 600 13px "Palatino Linotype", Georgia, serif';
    if (P.state === 'down') { label(T('cor.silent'), px, y, '#ffe2a0'); continue; }
    if (P.state === 'ours' && P.fort === 0) { label(T('cor.fort.none'), px, y, '#b8e0b8'); continue; }
    const f = clamp(P.hp / (P.hpMax || 1), 0, 1), ours = P.state === 'ours';
    c.fillStyle = 'rgba(16,20,26,0.82)'; roundRect(c, px - 46, y - 8, 92, 10, 5); c.fill();
    c.fillStyle = ours ? (P.hitT > 0 ? '#ffffff' : '#9ad08a') : P.alarmT > 0 ? '#ff7a5a' : '#c8b07a';
    roundRect(c, px - 44, y - 6, 88 * f, 6, 3); c.fill();
    const lab = (ours ? T('cor.fort', P.fort) : T(P.alarmT > 0 ? 'cor.battery.alarm' : 'cor.battery')) + (!ours && P.major ? ' · ' + T('cor.mortars') : '') + (CORS_ARSENALS.includes(P.id) && !C.bought[P.id] ? ' · ' + T('cor.arsenal') : '');
    label(lab, px, y + 18, ours ? '#c8f0c8' : P.alarmT > 0 ? '#ff9a7a' : '#efe2c0');
  }
  /* les châteaux : ennemis, ils tirent (en rouge quand le coup vient de partir) ; à vous, ils défendent */
  for (const P of C.ports) {
    if (!P.castle) continue;
    const [px, py, ok] = toScreen(P.castle[0], P.castle[1], 40);
    if (!ok || px < -60 || py < -60 || px > cam.pw + 60 || py > cam.ph + 60) continue;
    c.font = 'italic 600 12px "Palatino Linotype", Georgia, serif';
    label(T(P.state === 'ours' ? 'cor.castle.ours' : 'cor.castle'), px, py + 30, P.state === 'ours' ? '#c8f0c8' : W.t - (P.castFired || -9) < 1.2 ? '#ff9a7a' : '#efe2c0');
  }
  /* les forts avancés : leur état, et ce qu'il leur reste */
  for (const P of C.ports) {
    for (const o of P.outs) {
      const [px, py, ok] = toScreen(o.x, o.y, 24);
      if (!ok || px < -60 || py < -60 || px > cam.pw + 60 || py > cam.ph + 60) continue;
      const y = py + 28, ours = P.state === 'ours';
      c.font = 'italic 600 12px "Palatino Linotype", Georgia, serif';
      if (o.hp <= 0) { label(T('cor.out.silent'), px, y, '#cfc6b0'); continue; }
      if (!ours) {
        const f = clamp(o.hp / (o.hpMax || 1), 0, 1);
        c.fillStyle = 'rgba(16,20,26,0.82)'; roundRect(c, px - 34, y - 8, 68, 8, 4); c.fill();
        c.fillStyle = P.alarmT > 0 ? '#ff7a5a' : '#c8b07a'; roundRect(c, px - 32, y - 6, 64 * f, 4, 2); c.fill();
      }
      label(T(ours ? 'cor.out.ours' : 'cor.out'), px, y + 15, ours ? '#c8f0c8' : P.alarmT > 0 ? '#ff9a7a' : '#efe2c0');
    }
  }
  for (const s of corsAIs()) {
    if (s.sinking) continue;
    const [px, py, ok] = toScreen(s.x, s.y, 50);
    if (!ok || px < -60 || py < -60 || px > cam.pw + 60 || py > cam.ph + 60) continue;
    c.font = '600 13px "Palatino Linotype", Georgia, serif';
    if (s.captured) { label(T('cor.prize.tag', shipName(s.spec)), px, py - 46, '#9ad8a0'); continue; }
    const lvl = s.up.voilure + s.up.coque + s.up.canons;
    label(shipName(s.spec) + ' · ' + lvl + (s.cors.state === 'repair' ? ' · ' + T('cor.retreating') : ''), px, py - 46, s.cors.state === 'hunt' ? '#ff8a6a' : s.cors.state === 'siege' ? '#ffb070' : s.cors.state === 'repair' ? '#d8c8a8' : '#e8dcc0');
    const f = clamp(s.hull / s.hullMax, 0, 1);
    c.fillStyle = 'rgba(16,20,26,0.8)'; roundRect(c, px - 30, py - 40, 60, 6, 3); c.fill();
    c.fillStyle = f > 0.5 ? '#9ad08a' : f > 0.25 ? '#e0c060' : '#e06a50'; roundRect(c, px - 29, py - 39, 58 * f, 4, 2); c.fill();
  }
  fleetDraw(c, label);
  const me = G.me;
  if (G.corsBar && me && !me.sinking) { drawBar(c, G.corsBar); corsRhythmDraw(c); }
  /* dans un port à vous : ce que fait Entrée, au-dessus du navire */
  else if (me && !me.sinking && G.mode === 'play' && C.here && C.here.state === 'ours') corsPrompt(c, T('k.enter'), T(CORS_ARSENALS.includes(C.here.id) && !C.bought[C.here.id] ? 'cor.prompt.arsenal' : 'cor.prompt.yard', portName(C.here)));
}

/* la réglette de l'abordage, au-dessus de la jauge */
function corsRhythmDraw(c) {
  const B = G.cors.board, me = G.me;
  if (!B || !B.on || !B.rh || G.mode !== 'play') return;
  const R = B.rh;
  const [px, py] = toScreen(me.x, me.y, 60);
  const W_ = 200, x0 = px - W_ / 2, y0 = py - 96;
  c.fillStyle = 'rgba(16,20,26,0.88)'; roundRect(c, x0 - 8, y0 - 8, W_ + 16, 26, 13); c.fill();
  c.strokeStyle = 'rgba(230,184,90,0.6)'; c.lineWidth = 1; roundRect(c, x0 - 8, y0 - 8, W_ + 16, 26, 13); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(c, x0, y0, W_, 10, 5); c.fill();
  c.fillStyle = R.flash > 0 ? (R.ok ? 'rgba(150,240,160,0.95)' : 'rgba(255,110,80,0.9)') : 'rgba(230,184,90,0.9)';
  roundRect(c, x0 + R.z0 * W_, y0 - 3, Math.max(4, (R.z1 - R.z0) * W_), 16, 4); c.fill();
  const cx = x0 + R.x * W_;
  c.fillStyle = R.lock > 0 ? '#ff7a5a' : '#ffffff';
  c.fillRect(cx - 2, y0 - 6, 4, 22);
  c.font = '600 12px Georgia, serif'; c.textAlign = 'center';
  const t = T('cor.board.key', R.hits, R.need);
  c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.65)'; c.strokeText(t, px, y0 - 14);
  c.fillStyle = '#ffe2a0'; c.fillText(t, px, y0 - 14);
}

/* une invite au-dessus du navire : la touche, et ce qu'elle fait */
function corsPrompt(c, key, text) {
  const [px, py] = toScreen(G.me.x, G.me.y, 60);
  const y = py - 54 + Math.sin(W.t * 3) * 1.5;
  c.font = '600 14px "Palatino Linotype", Georgia, serif';
  const tw = c.measureText(text).width;
  c.font = '600 12px Georgia, serif';
  const kw = c.measureText(key).width + 14;
  const w = kw + 10 + tw + 26, x0 = px - w / 2;
  c.fillStyle = 'rgba(16,20,26,0.86)'; roundRect(c, x0, y - 15, w, 30, 15); c.fill();
  c.strokeStyle = 'rgba(230,184,90,0.75)'; c.lineWidth = 1.5; roundRect(c, x0, y - 15, w, 30, 15); c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, x0 + 10, y - 10, kw, 20, 5); c.fill();
  c.strokeStyle = 'rgba(244,234,212,0.85)'; c.lineWidth = 1; roundRect(c, x0 + 10, y - 10, kw, 20, 5); c.stroke();
  c.textAlign = 'center'; c.fillStyle = '#f4ead4'; c.fillText(key, x0 + 10 + kw / 2, y + 4);
  c.font = '600 14px "Palatino Linotype", Georgia, serif';
  c.textAlign = 'left'; c.fillStyle = '#ffe2a0'; c.fillText(text, x0 + 10 + kw + 10, y + 5);
  c.textAlign = 'center';
}

/* sur la mini-carte : les ports (à vous en vert, à prendre en or), les navires, les coffres */
function corsaireMini(c, P, me, radius) {
  const C = G.cors;
  if (!C) return;
  c.fillStyle = '#ffd98a';
  for (const k of G.chests) { if (dist(k.x, k.y, me.x, me.y) > radius) continue; const [px, py] = P(k.x, k.y); c.fillRect(px - 3, py - 3, 6, 6); }
  for (const p of C.ports) {
    const [px, py] = P(p.hx, p.hy);
    const siege = C.siege && C.siege.P === p;
    c.fillStyle = p.state === 'ours' ? (siege && Math.sin(W.t * 8) > 0 ? '#ff6a4a' : '#9ad8a0') : p.state === 'down' ? '#ffd98a' : p.alarmT > 0 ? '#ff6a4a' : '#e8d6a8';
    c.beginPath(); c.moveTo(px, py - 8); c.lineTo(px + 7, py); c.lineTo(px, py + 8); c.lineTo(px - 7, py); c.closePath(); c.fill();
    if (p.state === 'ours' && p.fort > 0) { c.strokeStyle = '#0d2a1a'; c.lineWidth = 2; c.stroke(); }
    /* les villes à arsenal : un cercle d'or, tant qu'on n'y a pas armé son navire */
    if (CORS_ARSENALS.includes(p.id) && !C.bought[p.id]) { c.strokeStyle = '#ffd98a'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 12, 0, TAU); c.stroke(); }
    /* ses forts avancés */
    for (const o of p.outs) {
      if (dist(o.x, o.y, me.x, me.y) > radius) continue;
      const [ox, oy] = P(o.x, o.y);
      c.fillStyle = p.state === 'ours' ? '#9ad8a0' : o.hp <= 0 ? '#8a8478' : p.alarmT > 0 ? '#ff6a4a' : '#e8d6a8';
      c.fillRect(ox - 3, oy - 3, 6, 6);
    }
  }
  fleetMini(c, P, me, radius);
  for (const s of corsAIs()) {
    if (dist(s.x, s.y, me.x, me.y) > radius) continue;
    const [px, py] = P(s.x, s.y);
    const st = s.cors.state;
    c.fillStyle = s.captured ? '#9ad8a0' : st === 'hunt' ? '#ff5a3a' : st === 'siege' ? '#ffa050' : '#d8d0c0';
    c.beginPath(); c.arc(px, py, st === 'hunt' || st === 'siege' ? 7 : 5, 0, TAU); c.fill();
  }
}

/* le HUD du corsaire : ports, or, charbon */
function corsHud() {
  const C = G.cors, me = G.me;
  setText('h-level-l', T(C.tuto ? 'tuto.hud' : 'cor.hud.ports'));
  setText('h-level', C.tuto ? Math.min(TUTO.steps.length, C.tuto.i + 1) + ' / ' + TUTO.steps.length : corsOwned() + ' / ' + CORS_PORTS);
  setText('h-goal', corsGoalLine());
  setHtml('h-crates', '');
  setText('h-score-l', T('cor.hud.gold'));
  setText('h-score', fmt0(Math.floor(C.coins)));
  setText('h-score-l2', T('res.score'));
  setText('h-best', fmt0(G.score || 0));
  /* l'autonomie : ce qu'il reste de minutes en mer, à l'allure du moment, pour rentrer au port */
  el('h-auto-row').classList.remove('hidden');
  const a = clamp(C.auto, 0, 1);
  setStyle('h-auto', 'width', (a * 100).toFixed(1) + '%');
  setStyle('h-auto', 'filter', a > 0.35 ? 'none' : a > 0.15 ? 'hue-rotate(-25deg) saturate(1.3)' : 'hue-rotate(-45deg) saturate(1.8)');
  setText('h-auto-n', a <= 0 ? T('cor.auto.none') : C.here && C.here.state === 'ours' ? Math.round(a * 100) + ' %' : T('cor.auto.min', fmtMin(a / corsBurn(me))));
  el('h-ship').classList.toggle('noauto', a <= 0);
  fleetHud();
}

addStr({
  'menu.corsaire': ['Mode corsaire', 'Corsair mode', 'コルセアモード'],
  'menu.corsaire.d': ['Les navires de l\'époque, mis en scène : partez d\'une coque de noix, faites-en au chantier un brick, une frégate ou un cuirassé, et prenez le Japon port après port.', 'The ships of the day, put on stage: start from a nutshell, make her a brig, a frigate or an ironclad at the shipyard, and take Japan port by port.', '当時の艦船を舞台に。くるみの殻から始め、造船所でブリッグやフリゲート、装甲艦に仕立て、港を一つずつ取って日本を手に入れよ。'],
  'cor.h': ['Le corsaire à vapeur', 'The steam corsair', '蒸気のコルセア'],
  'cor.stage': ['Une mise en scène des navires de l\'époque', 'A staging of the ships of the day', '当時の艦船を見せる舞台'],
  'cor.lead': ['Dans les années 1860, la marine change d\'âge : la vapeur s\'ajoute à la voile, l\'hélice remplace les roues à aubes, le fer couvre le bois. Ce mode met ces navires en scène. Vous partez de Hakodate sur une coque de noix, avec soixante pièces d\'or ; au chantier d\'un port à vous, vous en faites un cotre, une goélette, un brick, une corvette, une frégate, avec ses mâts, ses canons, sa machine, sa cuirasse, son éperon, et chaque pièce a son histoire. L\'or se trouve dans les coffres qui flottent, les épaves, les cales des navires pris à l\'abordage, les magasins des ports. Les vivres et le charbon s\'épuisent en mer : rentrez au port à temps. Faites taire la batterie d\'un port, et ses forts avancés s\'il en a ; il appelle à l\'aide, des navires accourent. Approchez alors de la plage devant la ville et stoppez : vos chaloupes mettent les hommes à terre, et le port est à vous ; fortifiez-le, car l\'ennemi viendra le reprendre. Cinq grandes villes ont un arsenal, où armer un navire de plus : il vous suit, et vous menez bientôt une flotte. Trente ports, et le Japon est à vous.', 'In the 1860s, navies enter a new age: steam joins sail, the screw replaces the paddle wheel, iron covers wood. This mode puts those ships on stage. You leave Hakodate in a nutshell with sixty gold coins; at the shipyard of one of your ports you make her a cutter, a schooner, a brig, a corvette, a frigate, with her masts, guns, engine, armour and ram, and every part has its story. Gold lies in floating chests, in wrecks, in the holds of ships taken by boarding, in the harbours\' stores. Stores and coal run down at sea: get back to port in time. Silence a harbour\'s battery, and its outlying forts if it has any; it calls for help, and ships hurry in. Then close the beach in front of the town and stop: your boats put the men ashore, and the port is yours; fortify it, for the enemy will come to take it back. Five great cities have an arsenal where you can fit out one more ship: she follows you, and soon you lead a fleet. Thirty ports, and Japan is yours.', '1860年代、海軍は新しい時代に入る。帆に蒸気が加わり、外輪はスクリューに代わり、木は鉄で覆われる。このモードは、そうした艦船を舞台に乗せる。箱館をくるみの殻で、小判六十枚とともに出る。自分の港の造船所で、カッター、スクーナー、ブリッグ、コルベット、フリゲートへと仕立て、マスト、砲、機関、装甲、衝角を備えよ。どの部品にも歴史がある。小判は漂う箱に、残骸に、斬り込んで奪った艦の船倉に、港の倉にある。食糧と石炭は海で減っていく。間に合ううちに港へ戻れ。港の砲台を、出砲台があればそれも黙らせよ。港は救援を呼び、艦が駆けつける。それから町の前の浜に近づいて停船せよ。ボートが兵を上陸させ、港はおまえのものになる。敵は取り返しに来るから、砦を固めよ。五つの大きな町には工廠があり、もう一隻を艤装できる。その艦が後に続き、やがて艦隊を率いることになる。三十の港を取れば、日本はおまえのものだ。'],
  'cor.new': ['Nouvelle traversée', 'New voyage', '新しい航海'],
  'cor.new.d': ['Une coque de noix, soixante pièces d\'or, et tout le Japon à prendre.', 'A nutshell, sixty gold coins, and all of Japan to take.', 'くるみの殻と小判六十枚、そして奪うべき日本全土。'],
  'cor.new.erase': ['Une coque de noix, soixante pièces d\'or, et tout le Japon à prendre. La traversée en cours sera effacée.', 'A nutshell, sixty gold coins, and all of Japan to take. The current voyage will be erased.', 'くるみの殻と小判六十枚、そして奪うべき日本全土。いまの航海は消える。'],
  'cor.resume': ['Reprendre à {0}', 'Resume at {0}', '{0}から再開'],
  'cor.resume.d': ['Ports pris : {0} sur {1} ; {2} pièces d\'or ; {3}.', 'Ports taken: {0} of {1}; {2} gold coins; {3}.', '占領した港：{1}のうち{0}。小判{2}枚。{3}。'],
  'cor.resume.s1': ['le navire tel que le chantier l\'a laissé', 'the ship as the yard left her', '造船所を出たときのままの船'],
  'cor.resume.sn': ['{0} navires, tels que le chantier les a laissés', '{0} ships, as the yard left them', '造船所を出たときのままの{0}隻'],
  'cor.rec': ['Record corsaire', 'Corsair high score', 'コルセア最高点'],
  'cor.won': ['Le Japon a déjà été pris une fois', 'Japan has already been taken once', '日本はすでに一度征服された'],
  'cor.diff': ['Difficulté', 'Difficulty', '難易度'],
  'cor.diff.facile': ['Facile', 'Easy', 'かんたん'],
  'cor.diff.moyen': ['Moyen', 'Medium', 'ふつう'],
  'cor.diff.difficile': ['Difficile', 'Hard', 'むずかしい'],
  'cor.diff.facile.d': ['Pour apprendre le chantier, l\'abordage et la prise des ports : l\'ennemi pardonne les erreurs, et l\'or vient vite.', 'To learn the shipyard, boarding and the taking of ports: the enemy forgives mistakes, and gold comes quickly.', '造船所、斬り込み、港の奪い方を覚えるために。敵は失敗を許し、小判もすぐ集まる。'],
  'cor.diff.moyen.d': ['L\'ennemi est plus solide, frappe plus fort et sort plus nombreux ; ses batteries tiennent bon, même face à une forte artillerie, et il se laisse moins distancer. Le chantier coûte plus cher, l\'or rentre moins vite.', 'The enemy is tougher, hits harder and puts to sea in greater numbers; his batteries stand firm even against heavy guns, and he is harder to outrun. The shipyard costs more, gold comes in more slowly.', '敵はより頑丈で、より強く撃ち、より多く海に出る。砲台は強力な砲にも耐え、振り切るのも難しい。造船所は高く、小判は入りにくい。'],
  'cor.diff.difficile.d': ['Plus dur encore : l\'ennemi sort mieux armé, vous prend en chasse plus tôt et ne se laisse pas distancer, ses secours et ses sièges viennent en force, le chantier est hors de prix et les soutes vite vides. Pour qui a déjà pris le Japon.', 'Harder still: the enemy puts to sea better armed, hunts you sooner and will not be outrun, his relief and his sieges come in strength, the shipyard is dear and the bunkers soon run empty. For those who have already taken Japan.', 'さらに厳しい。敵はより強い装備で海に出て、より早く追い、振り切れない。救援も包囲も大挙して来る。造船所は高くつき、石炭庫はすぐ空になる。すでに日本を手に入れた者のために。'],
  'cor.diff.of': ['Difficulté : {0}.', 'Difficulty: {0}.', '難易度：{0}。'],
  'cor.diff.keep': ['La traversée en cours reste en {0}.', 'The current voyage stays on {0}.', 'いまの航海は{0}のまま。'],
  'cor.menu.rec': ['Record en mode {1} : {0}.', 'High score on {1}: {0}.', '{1}モードのハイスコア：{0}'],
  'cor.zone': ['{0} · chantier (Entrée)', '{0} · shipyard (Enter)', '{0}・造船所（Enter）'],
  'cor.zone.ars': ['{0} · arsenal (Entrée)', '{0} · arsenal (Enter)', '{0}・工廠（Enter）'],
  'cor.boost': ['coup de boutoir !', 'ramming speed!', '体当たり！'],
  'cor.tip.ram2': ['Pour éperonner : deux appuis sur ↑ juste avant le choc, le coup de boutoir. Sans lui, on ne fait que heurter.', 'To ram: press ↑ twice just before the blow, for ramming speed. Without it, you only bump.', '衝角攻撃は、衝突の直前に↑を二度押して体当たり。押さなければぶつかるだけだ。'],
  'cor.zone.take': ['{0} · débarquement : approchez et stoppez', '{0} · landing: close in and stop', '{0}・上陸地点：近づいて停船'],
  'cor.gold': ['+{0} or', '+{0} gold', '小判+{0}'],
  'cor.spill': ['un coffre passe par-dessus bord : -{0}', 'a chest goes overboard: -{0}', '箱が海へ落ちた：-{0}'],
  'cor.tribute': ['tribut des ports : +{0}', 'harbour tribute: +{0}', '港の貢ぎ物：+{0}'],
  'cor.repair': ['les charpentiers réparent', 'the carpenters are repairing', '船大工が修理中'],
  'cor.supply': ['on embarque vivres et charbon', 'taking on stores and coal', '食糧と石炭を積み込み中'],
  'cor.auto.out': ['À bout de vivres', 'Out of stores', '食糧が尽きた'],
  'cor.auto.out.c': ['À bout de vivres et de charbon', 'Out of stores and coal', '食糧も石炭も尽きた'],
  'cor.auto.out2': ['l\'équipage n\'en peut plus : un tiers de l\'allure, au mieux ; rentrez au port', 'the crew is spent: a third of your speed at best; make for port', '乗組員は疲れ果てた。速さは三分の一。港へ戻れ'],
  'cor.auto.low': ['autonomie basse : pensez au retour', 'running low: think of getting back', '残りわずか。帰港を考えよ'],
  'cor.auto.got': ['+ vivres', '+ stores', '食糧を得た'],
  'cor.auto.taken': ['sa cambuse et ses soutes : + autonomie', 'her stores and bunkers: + endurance', '敵の食糧と石炭：航続力を得た'],
  'cor.auto.min': ['{0} min', '{0} min', '{0}分'],
  'cor.auto.none': ['à bout', 'spent', '尽きた'],
  'cor.board': ['Abordage du {0} · {1} %', 'Boarding the {0} · {1}%', '{0}に斬り込み中・{1}%'],
  'cor.board.go': ['à l\'abordage !', 'boarders away!', '斬り込め！'],
  'cor.ground': ['échouage ! -{0}', 'aground! -{0}', '座礁！ -{0}'],
  'cor.wreck': ['Échoué !', 'Aground!', '座礁！'],
  'cor.reef': ['Terre devant ! Réduisez l\'allure', 'Land ahead! Ease the speed', '前方に陸！ 減速せよ'],
  'cor.wreck2': ['à cette allure, la côte a ouvert la coque', 'at that speed, the coast tore the hull open', 'この速さでは、岸が船体を引き裂いた'],
  'cor.wreck.fort': ['à cette allure, le fort de {0} a ouvert la coque', 'at that speed, the fort of {0} tore the hull open', 'この速さでは、{0}の砦が船体を引き裂いた'],
  'cor.tip.ground': ['Au ralenti, toucher la côte ou un fort abîme la coque ; à bonne allure, droit dessus (plus de la moitié de la pleine allure), le navire s\'y brise et il est perdu. En glissant le long du bord, on s\'en tire mieux.', 'At low speed, touching the coast or a fort damages the hull; at a good speed, head on (over half of full speed), the ship is wrecked and lost. Grazing along the shore costs less.', '低速で岸や砦に触れれば船体が傷む。全速の半分を超えて正面からぶつかれば、船は砕けて失われる。岸をかすめる程度なら傷は浅い。'],
  'cor.res.sank': ['{0} a sombré', '{0} has gone down', '{0}は沈んだ'],
  'cor.res.capsized': ['{0} a chaviré', '{0} has capsized', '{0}は転覆した'],
  'cor.res.aground': ['{0} s\'est échoué{1}', '{0} has run aground', '{0}は座礁した'],
  'help.small.c': ['ZQSD et WASD fonctionnent aussi. Au ralenti, toucher la côte ou un fort abîme la coque ; à bonne allure, le navire s\'échoue et il est perdu. Il n\'y a pas de bord au monde, mais au-delà de la carte la brume s\'épaissit, et l\'on s\'y égare.', 'ZQSD and WASD work too. At low speed, touching the coast or a fort damages the hull; at a good speed, the ship runs aground and is lost. The world has no edge, but beyond the map the fog thickens, and you get lost in it.', 'WASD でも操作できる。低速で岸や砦に触れれば船体が傷み、速ければ座礁して船を失う。世界に端はないが、地図の外では霧が濃くなり、迷ってしまう。'],
  'cor.board.miss': ['repoussés !', 'beaten back!', '押し返された！'],
  'cor.board.key': ['Entrée quand le curseur est dans l\'or · {0} / {1}', 'Enter when the cursor is in the gold · {0} / {1}', 'カーソルが金色に入ったらEnter・{0}/{1}'],
  'cor.prize': ['Le {0} est pris', 'The {0} is taken', '{0}を拿捕'],
  'cor.prize2': ['son or est à vous ; un équipage de prise le ramène au port', 'her gold is yours; a prize crew takes her to port', '積荷の小判は自分のもの。回航員が港へ運ぶ'],
  'cor.prize.tag': ['{0} · prise', '{0} · prize', '{0}・拿捕艦'],
  'cor.ram': ['éperonné ! -{0}', 'rammed! -{0}', '衝角攻撃！ -{0}'],
  'cor.rammed': ['{0} coulé à l\'éperon', '{0} sunk by the ram', '{0}を衝角で撃沈'],
  'cor.rammedMe': ['il vous éperonne !', 'she rams you!', '体当たりされた！'],
  'cor.hunt': ['{0} vous prend en chasse', '{0} gives chase', '{0}が追ってくる'],
  'cor.gain': ['{0} gagne en {1}', '{0} improves its {1}', '{0}の{1}が上がった'],
  'cor.ai.chest': ['{0} repêche un coffre', '{0} picks up a chest', '{0}が箱を拾った'],
  'cor.alarm': ['Alarme à {0}', 'Alarm at {0}', '{0}で警報'],
  'cor.alarm2': ['les navires des environs accourent, et la ville appelle à l\'aide', 'the ships nearby are coming, and the town calls for help', '近くの艦が駆けつけ、町は救援を求める'],
  'cor.relief': ['{0} appelle à l\'aide : une escadre de {2} navire(s) arrive de {1}', '{0} calls for help: a squadron of {2} ship(s) is coming from {1}', '{0}が救援を求めた：{1}から{2}隻の艦隊が来る'],
  'cor.relief.sea': ['{0} appelle à l\'aide : une escadre de {2} navire(s) arrive du large', '{0} calls for help: a squadron of {2} ship(s) is coming from the open sea', '{0}が救援を求めた：沖から{2}隻の艦隊が来る'],
  'ptr.relief': ['escadre de secours', 'relief squadron', '救援艦隊'],
  'cor.out': ['fort avancé', 'outlying fort', '出砲台'],
  'cor.out.ours': ['fort avancé · à vous', 'outlying fort · yours', '出砲台・味方'],
  'cor.out.silent': ['fort avancé réduit au silence', 'outlying fort silenced', '沈黙した出砲台'],
  'cor.out.down': ['un fort avancé de {0} se tait', 'an outlying fort of {0} falls silent', '{0}の出砲台が沈黙した'],
  'cor.landing.far': ['Approchez de la plage : {1} %', 'Close the beach: {1}%', '浜に近づけ：{1}%'],
  'cor.landing.fast': ['Stoppez pour débarquer : {1} %', 'Stop to land: {1}%', '停船して上陸：{1}%'],
  'cor.landing.fire': ['Ennemi à portée : les chaloupes attendent ({1} %)', 'Enemy in range: the boats wait ({1}%)', '敵が射程内：ボートは待機（{1}%）'],
  'cor.g.beach': ['Approchez de la plage de {0} (le cercle doré) et stoppez', 'Close the beach at {0} (the gold circle) and stop', '{0}の浜（金の円）に近づいて停船せよ'],
  'cor.g.stop': ['Stoppez : les chaloupes ne partent pas en marche', 'Stop: the boats cannot leave while under way', '停船せよ：航行中はボートを降ろせない'],
  'cor.g.fire': ['Un navire ennemi est à portée de la plage : les chaloupes attendent', 'An enemy ship is in range of the beach: the boats wait', '敵艦が浜の射程内にいる：ボートは待機'],
  'cor.down': ['{0} réduit au silence', '{0} silenced', '{0}を沈黙させた'],
  'cor.down2': ['approchez de la plage devant la ville et stoppez : vos chaloupes débarquent les hommes', 'close the beach in front of the town and stop: your boats put the men ashore', '町の前の浜に近づいて停船せよ。ボートで上陸する'],
  'cor.down2.out': ['ses forts avancés tirent encore ; débarquez devant la plage, navire stoppé', 'its outlying forts still fire; land off the beach, ship stopped', '出砲台はまだ撃ってくる。浜の前で停船して上陸せよ'],
  'cor.take': ['{0} est à vous', '{0} is yours', '{0}を占領'],
  'cor.take2': ['ses magasins, son chantier, ses vivres et son charbon ; fortifiez-le au chantier', 'its stores, its shipyard, its supplies and coal; fortify it at the yard', '倉も造船所も食糧も石炭も手に入れた。造船所で砦を固めよ'],
  'cor.tip.fort.k': ['Un port à vous', 'A port of yours', '自分の港'],
  'cor.tip.fort': ['On y répare, on y refait le plein de vivres et de charbon, on y touche le tribut, et son chantier est ouvert. Mais l\'ennemi enverra une escadre le reprendre : au chantier, fortifiez-le. Une batterie solide tient seule ; un port sans défense tombe en trente secondes.', 'You can repair, take on stores and coal, and collect tribute there, and its yard is open. But the enemy will send a squadron to take it back: fortify it at the yard. A strong battery holds on its own; an undefended port falls in thirty seconds.', 'ここで修理し、食糧と石炭を積み、貢ぎ物を受け取れる。造船所も使える。だが敵は艦隊を送って取り返しに来る。造船所で砦を固めよ。強い砲台は自力で持ちこたえるが、守りのない港は三十秒で落ちる。'],
  'cor.afloat': ['remis à flot', 'afloat again', '離礁した'],
  'cor.unlock': ['Huit ports pris : le Kōtetsu rejoint la flotte de l\'arcade.', 'Eight ports taken: the Kōtetsu joins the arcade fleet.', '八つの港を手に入れた。甲鉄がアーケードの艦隊に加わる。'],
  'cor.lost': ['{0} est repris', '{0} is retaken', '{0}が奪い返された'],
  'cor.lost2': ['il faudra le reprendre, et mieux le fortifier', 'you will have to take it again, and fortify it better', 'もう一度奪い、砦をもっと固めよ'],
  'cor.siege': ['Une escadre fait route vers {0}', 'A squadron is heading for {0}', '艦隊が{0}へ向かう'],
  'cor.siege2': ['{0} navires viennent reprendre le port : la batterie tiendra-t-elle ?', '{0} ships are coming to retake the port: will the battery hold?', '{0}隻が港を奪い返しに来る。砲台は持ちこたえるか'],
  'cor.siege2.1': ['un navire vient reprendre le port : la batterie tiendra-t-elle ?', 'a ship is coming to retake the port: will the battery hold?', '一隻が港を奪い返しに来る。砲台は持ちこたえるか'],
  'cor.siege.on': ['{0} est assiégé', '{0} is under siege', '{0}が包囲された'],
  'cor.siege.on2': ['la batterie tombée, la garnison ne tiendra pas longtemps', 'once the battery falls, the garrison will not hold long', '砲台が落ちれば守備隊は長くもたない'],
  'cor.held': ['{0} a tenu', '{0} has held', '{0}は持ちこたえた'],
  'cor.held2': ['la ville reconnaissante grossit le tribut', 'the grateful town adds to the tribute', '町は感謝して貢ぎ物を増やす'],
  'cor.fort.down': ['la batterie de {0} est tombée', 'the battery of {0} has fallen', '{0}の砲台が落ちた'],
  'cor.fort': ['vos fortifications · {0}/3', 'your fortifications · {0}/3', '自軍の砦・{0}/3'],
  'cor.fort.none': ['à vous · sans défense', 'yours · undefended', '自軍・無防備'],
  'cor.sunk': ['{0} coule : son or remonte', '{0} sinks: her gold floats up', '{0}撃沈：小判が浮かぶ'],
  'cor.silent': ['réduit au silence · à prendre', 'silenced · to take', '沈黙・占領できる'],
  'cor.battery': ['batterie', 'battery', '砲台'],
  'cor.battery.alarm': ['batterie en alerte', 'battery on alert', '警戒中の砲台'],
  'cor.hud.ports': ['Ports', 'Ports', '港'],
  'cor.hud.gold': ['Or', 'Gold', '小判'],
  'cor.g.board': ['À l\'abordage ! Entrée quand le curseur passe dans l\'or', 'Boarders away! Enter when the cursor is in the gold', '斬り込め！ カーソルが金色に入ったらEnter'],
  'cor.g.yard': ['Entrée : le chantier de {0}', 'Enter: the shipyard of {0}', 'Enter：{0}の造船所'],
  'cor.g.take': ['Les chaloupes débarquent à {0}', 'The boats are landing at {0}', '{0}にボートで上陸中'],
  'cor.g.arsenal': ['Entrée : l\'arsenal de {0}, où armer un navire de plus', 'Enter: the arsenal of {0}, to fit out one more ship', 'Enter：{0}の工廠でもう一隻を艤装'],
  'cor.landing': ['Débarquement à {0} : {1} %', 'Landing at {0}: {1}%', '{0}に上陸中：{1}%'],
  'cor.prompt.yard': ['le chantier de {0}', 'the shipyard of {0}', '{0}の造船所'],
  'cor.prompt.arsenal': ['l\'arsenal de {0} : armer un navire', 'the arsenal of {0}: fit out a ship', '{0}の工廠：艦を艤装'],
  'cor.arsenal': ['arsenal', 'arsenal', '工廠'],
  'cor.g.siege': ['{0} est assiégé : allez le défendre', '{0} is under siege: go and defend it', '{0}が包囲された。守りに行け'],
  'cor.g.auto': ['À bout de vivres : rentrez au port', 'Out of stores: make for port', '食糧が尽きた。港へ戻れ'],
  'cor.g.repair': ['La coque ne tient plus : rentrez au port', 'The hull is failing: make for port', '船体がもたない。港へ戻れ'],
  'cor.g.free': ['Coulez, abordez, pillez : l\'or paie le chantier', 'Sink, board, plunder: gold pays for the yard', '沈め、斬り込み、奪え。小判で船を造る'],
  'cor.tip.board': ['Bord à bord, frappez Entrée quand le curseur passe dans l\'or : chaque coup juste fait avancer l\'abordage, un coup raté le recule. Plus l\'ennemi est fort, plus c\'est serré ; vos abordeurs vous aident. Espace tire toujours.', 'Alongside, strike Enter when the cursor crosses the gold: each good stroke drives the boarding on, a miss drives it back. The stronger the enemy, the tighter it gets; your boarders help. Space still fires.', '舷を寄せたら、カーソルが金色を通るときにEnter。当たれば斬り込みが進み、外せば押し戻される。敵が強いほど難しく、斬り込み隊が助けになる。スペースはいつも通り射撃。'],
  'cor.tip.lock': ['Planté sur l\'éperon, il ne coule pas mais ne manœuvre plus : frappez Entrée quand le curseur passe dans l\'or pour l\'aborder ; ↓ pour vous dégager.', 'Stuck on your ram, she will not sink but cannot manoeuvre: strike Enter when the cursor crosses the gold to board her; ↓ to back off.', '衝角に刺さった艦は沈まないが動けない。カーソルが金色に入ったらEnterで斬り込め。↓で離れる。'],
  'cor.tip.ram': ['Le choc grandit avec la vitesse ; la cuirasse et l\'éperon le rendent terrible.', 'The blow grows with speed; armour and a ram make it terrible.', '衝撃は速さとともに大きくなる。装甲と衝角でさらに強烈に。'],
  'cor.tip.port': ['Faites taire sa batterie, puis approchez de la plage devant la ville et stoppez : vos chaloupes débarquent les hommes, et le port est à vous. Le port appelle à l\'aide : des navires viendront.', 'Silence its battery, then close the beach in front of the town and stop: your boats put the men ashore and the port is yours. The port calls for help: ships will come.', '砲台を黙らせ、町の前の浜に近づいて停船せよ。ボートで上陸すれば港はおまえのものだ。港は救援を呼ぶ。艦が来るぞ。'],
  'cor.tip.siege': ['Une flèche rouge montre le port assiégé. Ses fortifications tiennent seules ; sinon, allez-y.', 'A red arrow points to the besieged port. Its fortifications hold on their own; otherwise, go there.', '赤い矢印が包囲された港を示す。砦が強ければ自力で守る。そうでなければ駆けつけよ。'],
  'ptr.chest': ['coffre', 'chest', '箱'],
  'ptr.siege': ['{0} assiégé', '{0} besieged', '{0}包囲'],
  'ptr.take': ['{0} à prendre', 'take {0}', '{0}を占領'],
  'cor.res.sub': ['ports pris : {0} sur {1}', 'ports taken: {0} of {1}', '占領した港：{1}のうち{0}'],
  'cor.res.tip': ['La traversée reprend à {0}, avec {1} pièces d\'or et les navires de ce moment-là.', 'The voyage resumes at {0}, with {1} gold coins and the ships you had then.', '航海は{0}から、小判{1}枚とそのときの艦で再開する。'],
  'cor.again': ['Reprendre à {0}', 'Resume at {0}', '{0}から再開'],
  'cor.fresh': ['Nouvelle traversée', 'New voyage', '新しい航海'],
  'cor.st.ports': ['Ports pris', 'Ports taken', '占領した港'],
  'cor.st.sinks': ['Navires coulés', 'Ships sunk', '撃沈'],
  'cor.st.boards': ['Navires pris', 'Ships boarded', '拿捕'],
  'cor.st.rams': ['Coulés à l\'éperon', 'Sunk by the ram', '衝角で撃沈'],
  'cor.st.gold': ['Or gagné', 'Gold earned', '得た小判'],
  'cor.win.t': ['Le Japon est à vous', 'Japan is yours', '日本はおまえのものだ'],
  'cor.win.s': ['trente ports, d\'Akkeshi à Kagoshima', 'thirty ports, from Akkeshi to Kagoshima', '厚岸から鹿児島まで三十の港'],
  'cor.win.text': ['Plus un port ne vous résiste. Cette conquête n\'a existé que sur cette carte : le 27 juin 1869, le gouvernement d\'Ezo se rendait à Hakodate. Mais la coque, la machine et les armes de votre navire, elles, sont bien celles de l\'époque.', 'Not one port holds out against you. That conquest only ever existed on this map: on 27 June 1869, the Ezo government surrendered at Hakodate. But your ship\'s hull, engine and weapons are truly those of the day.', 'もはやどの港も抗わない。この征服はこの地図の上にしかない。1869年6月27日、蝦夷の政府は箱館で降伏した。だが、おまえの船の船体も機関も武器も、まさに当時のものだ。'],
  'cor.win.go': ['Continuer la traversée', 'Carry on sailing', '航海を続ける'],
  'res.capsized': ['Le {0} a chaviré', 'The {0} has capsized', '{0}は転覆した'],
  'cor.seen': ['En vue : le {0}, {1}', 'Sighted: the {0}, {1}', '{0}（{1}）が見えた'],
  'cor.rake': ['enfilade !', 'raking fire!', '縦射！'],
  'cor.mortar.hit': ['une bombe de mortier !', 'a mortar bomb!', '臼砲弾が命中！'],
  'cor.mortars': ['mortiers', 'mortars', '臼砲'],
  'cor.tip.mortar': ['Les grandes villes ont des mortiers : leurs bombes montent haut et retombent là où le cercle rouge se resserre. Changez de cap ou d\'allure, elles tombent à l\'eau. Faire taire la batterie fait taire ses mortiers.', 'The great cities have mortars: their bombs climb high and fall where the red circle tightens. Change course or speed and they fall into the sea. Silencing the battery silences its mortars.', '大きな町には臼砲がある。砲弾は高く上がり、赤い円が縮むところに落ちる。針路か速さを変えれば海に落ちる。砲台を黙らせれば臼砲も黙る。'],
  'cor.castle': ['château', 'castle', '城'],
  'cor.castle.ours': ['château · à vous', 'castle · yours', '城・味方'],
  'cor.tip.castle': ['Le château de {0} tire de loin, par-dessus les toits, et ne se tait que lorsque la ville est prise. Débarquez vite ; une fois à vous, il défendra le port.', 'The castle of {0} fires from afar, over the rooftops, and falls silent only when the town is taken. Land quickly; once yours, it will defend the port.', '{0}の城は屋根越しに遠くから撃ってくる。町を取るまで黙らない。急いで上陸せよ。取れば港を守ってくれる。'],
  'cor.fireship': ['un brûlot sort de {0} !', 'a fireship comes out of {0}!', '{0}から火船が出てきた！'],
  'cor.tip.fireship': ['Attaqués, les ports qui n\'ont ni mortiers ni château lâchent des brûlots. Évitez-les, ou brisez-les au canon avant qu\'ils ne vous touchent.', 'Under attack, the ports with neither mortars nor castle send out fireships. Avoid them, or break them with your guns before they reach you.', '臼砲も城もない港は、攻められると火船を出す。避けるか、届く前に砲で砕け。'],
  'cor.tip.rake': ['L\'enfilade : un boulet qui prend un navire par l\'avant ou par l\'arrière, dans toute sa longueur, fait double mal. Passez devant son étrave ou derrière sa poupe, et lâchez la bordée ; et ne lui présentez pas les vôtres.', 'Raking fire: a ball that strikes a ship from ahead or astern, along her whole length, does double damage. Cross her bow or her stern and let fly the broadside; and do not show her yours.', '縦射：艦首か艦尾から船体の縦に沿って当たった弾は二倍の損害を与える。敵の艦首の前か艦尾の後ろを横切って舷側斉射を浴びせよ。自分の艦首と艦尾は敵に向けるな。'],
  'cor.rakeMe': ['pris en enfilade !', 'raked!', '縦射を受けた！'],
  'cor.retreat': ['le {0} rompt le combat pour réparer', 'the {0} breaks off to repair', '{0}が修理のため離脱'],
  'cor.retreating': ['en retraite', 'retreating', '退却中'],
  'cor.tip.shield': ['La batterie retient son feu : un navire des siens est trop près de vous, ou dans sa ligne de tir. Battez-vous contre lui sous ses murs : elle n\'ose pas tirer.', 'The battery holds its fire: one of its own ships is too close to you, or in its line of fire. Fight her under its walls: it dare not shoot.', '砲台が撃つのを控えている。味方の艦があなたに近すぎるか、射線上にいるのだ。城壁の下でその艦と戦えば、砲台は撃てない。'],
  /* l'aide, en corsaire */
  'help.enter': ['Dans un port à vous (cercle vert) : le chantier, ou l\'arsenal. Bord à bord : l\'abordage, quand le curseur passe dans l\'or.', 'In one of your ports (green circle): the shipyard, or the arsenal. Alongside: boarding, as the cursor crosses the gold.', '自分の港（緑の円）では造船所か工廠。舷を寄せたら、カーソルが金色を通るときに斬り込み。'],
  'help.c1d': ['se brisent en deux, puis encore ; certains lâchent un petit coffre', 'break in two, then again; some drop a small chest', '二つに割れ、さらに割れる。小さな箱を落とすものもある'],
  'help.c5d': ['attire tout, engloutit les coffres', 'pulls everything in, swallows chests', 'すべてを引き寄せ、箱を呑み込む'],
  'help.up.c': ['Machine en avant ; deux appuis coup sur coup : le coup de boutoir, pour éperonner.', 'Engine ahead; two quick presses: ramming speed, to ram.', '機関前進。素早く二度押すと体当たり（衝角攻撃）。'],
  'help.fire.c': ['Feu, et la bordée sur l\'ennemi par le travers, même bord à bord. Dans sa longueur, par l\'avant ou l\'arrière (l\'enfilade), un boulet fait double mal.', 'Fire, with the broadside on an enemy abeam, even alongside. Along her length, from ahead or astern (raking fire), a ball does double damage.', '射撃。真横の敵には舷側斉射。舷を寄せていても撃てる。艦首か艦尾から縦に当てれば（縦射）、損害は二倍。'],
  'help.c6': ['Coffre d\'or', 'Gold chest', '小判の箱'],
  'help.c6d': ['de l\'or pour le chantier ; les navires ennemis les repêchent aussi', 'gold for the shipyard; enemy ships fish them up too', '造船所で使う小判。敵艦も拾っていく'],
  'help.c7': ['Batterie d\'un port', 'Harbour battery', '港の砲台'],
  'help.c7d': ['faites-la taire, ses forts avancés aussi si vous voulez, puis débarquez : devant la plage (cercle doré), navire stoppé. Les grandes villes ont des mortiers, les villes à donjon leur château ; les autres lâchent des brûlots', 'silence it, its outlying forts too if you like, then land: off the beach (gold circle), ship stopped. The great cities have mortars, the castle towns their castle; the others send out fireships', '黙らせ、望むなら出砲台も。浜の前（金の円）で停船して上陸。大きな町には臼砲、天守のある町には城がある。ほかの港は火船を出す'],
  'help.c8': ['Port à vous', 'Your port', '自分の港'],
  'help.c8d': ['chantier, réparations, vivres et charbon ; cinq grandes villes ont un arsenal, où armer un navire de plus', 'shipyard, repairs, stores and coal; five great cities have an arsenal, to fit out one more ship', '造船所、修理、食糧と石炭。五つの大きな町には工廠があり、もう一隻を艤装できる'],
  'help.close': ['Un choc coûte de la coque, jamais une pièce du navire : ce que le chantier a construit reste. Les vivres et le charbon s\'épuisent en mer ; à vide, le navire n\'avance plus qu\'au tiers de sa vitesse.', 'A collision costs hull, never a part of the ship: what the shipyard built stays. Stores and coal run down at sea; once they are gone the ship makes only a third of her speed.', '衝突で減るのは船体だけで、造船所で造ったものは失われない。食糧と石炭は海で減り、尽きると速さは三分の一になる。'],
});
