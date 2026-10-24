'use strict';

/* Les villages et les villes de la côte, et les forts : bâtis face par face (des faces plates, chacune
 * de sa couleur), puis fondus en un seul maillage par village, que le moteur écarte d'un bloc quand
 * il sort du champ. Une maison, c'est un corps de bois ou de torchis et un toit : de chaume en croupe
 * dans les campagnes, de bardeaux lestés de pierres en Ezo et dans le Nord, de tuiles dans les villes ;
 * les kura, entrepôts blancs au soubassement sombre ; un temple, un torii. Les rues suivent le rivage,
 * les maisons se tournent vers la rue, les barques sont tirées sur la grève, les rizières s'étendent
 * derrière. */

/* ---------- l'atelier : des faces orientées, colorées, posées dans le monde ---------- */

function vBuilder() {
  const P = [], N = [], Cc = [];
  const B = {
    ox: 0, oy: 0, oz: 0, ca: 1, sa: 0,
    /* la pose courante : origine au sol, x le long de la façade, z vers la rue, y vers le haut */
    at(x, y, z, a) { B.ox = x; B.oy = y; B.oz = z; B.ca = Math.cos(a); B.sa = Math.sin(a); return B; },
    w(p) { return [B.ox + p[0] * B.ca - p[2] * B.sa, B.oy + p[1], B.oz + p[0] * B.sa + p[2] * B.ca]; },
    /* une face plane (3 ou 4 points, locaux), tournée à l'opposé du point « dedans » */
    face(pts, col, inside) {
      const q = pts.map(B.w);
      const a = q[0], b = q[1], c = q[2];
      let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
      let ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      let nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (inside) {
        const I = B.w(inside);
        let mx = 0, my = 0, mz = 0;
        for (const p of q) { mx += p[0]; my += p[1]; mz += p[2]; }
        mx = mx / q.length - I[0]; my = my / q.length - I[1]; mz = mz / q.length - I[2];
        if (nx * mx + ny * my + nz * mz < 0) { q.reverse(); nx = -nx; ny = -ny; nz = -nz; }
      }
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      const tri = (i, j, k) => {
        for (const p of [q[i], q[j], q[k]]) { P.push(p[0], p[1], p[2]); N.push(nx, ny, nz); Cc.push(col.r, col.g, col.b); }
      };
      tri(0, 1, 2);
      if (q.length === 4) tri(0, 2, 3);
      return B;
    },
    /* une boîte : x0..x1, y0..y1, z0..z1 (sans le dessous) ; top=false : sans le dessus */
    box(x0, y0, z0, x1, y1, z1, col, top) {
      const I = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
      const c2 = col.clone ? col : col;
      B.face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c2, I);
      B.face([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], c2, I);
      B.face([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], c2, I);
      B.face([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], c2, I);
      if (top !== false) B.face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], c2, I);
      return B;
    },
    count() { return P.length / 3; },
    geometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
      g.computeBoundingSphere();
      return g;
    },
  };
  return B;
}

const VCOL = {};
/* une couleur, éclaircie ou assombrie (k), un peu bougée (j) par le hasard r */
function vc(hex, k, r, j) {
  let c = VCOL[hex];
  if (!c) c = VCOL[hex] = new THREE.Color(hex);
  const out = c.clone();
  const f = (k || 1) * (r ? 1 + (r() - 0.5) * (j || 0.12) : 1);
  return out.multiplyScalar(f);
}

/* les couleurs de la saison : toits, murs, rues, rizières */
const VPAL = {
  printemps: { thatch: '#9c8758', thatchR: '#75633f', shingle: '#8f877b', tile: '#68686b', tileR: '#4a4a4d', street: '#c3ad86', paddy: ['#7fa6a3', '#8db36a', '#79a55a', '#9ab8a8'], dyke: '#7a8f52', yard: '#9b8a62', snow: false },
  'été': { thatch: '#9a8556', thatchR: '#73613d', shingle: '#8d8579', tile: '#66676a', tileR: '#48494c', street: '#c8b48c', paddy: ['#5f9a40', '#6aa448', '#58913a', '#73ad50'], dyke: '#6f8a48', yard: '#9a8a60', snow: false },
  soir: { thatch: '#9e8457', thatchR: '#76603d', shingle: '#8f8274', tile: '#615f66', tileR: '#45434a', street: '#b9a27a', paddy: ['#b9a052', '#c4aa5c', '#a8944c', '#c9b46a'], dyke: '#8a7f4a', yard: '#9a8660', snow: false },
  hiver: { thatch: '#e8ecee', thatchR: '#cfd5d8', shingle: '#e4e8ea', tile: '#e6eaec', tileR: '#c8ced2', street: '#cfd4d8', paddy: ['#eef1f3', '#e6eaed', '#f2f4f5'], dyke: '#d0d6d9', yard: '#dfe3e6', snow: true },
};

/* ---------- les bâtiments, en coordonnées locales (origine au sol, au centre) ---------- */

/* le corps d'une maison : soubassement, murs (bas de bois, haut de torchis ou de bois), pignons */
function vBody(B, W, D, H, wall, low, r, gable) {
  const hw = W / 2, hd = D / 2;
  /* le soubassement descend sous le sol, pour les pentes */
  B.box(-hw - 0.15, -(B.drop || 2.5), -hd - 0.15, hw + 0.15, 0.35, hd + 0.15, vc('#6f6a62', 1, r), false);
  B.box(-hw, 0.35, -hd, hw, 1.3, hd, low, false);
  B.box(-hw, 1.3, -hd, hw, H, hd, wall, false);
  /* les pignons (sous un toit à deux pentes) : x = ±hw */
  if (gable) for (const s of [-1, 1]) B.face([[s * hw, H, -hd], [s * hw, H, hd], [s * hw, H + gable, 0]], wall, [0, H, 0]);
  /* la porte coulissante et une fenêtre à claire-voie, sur la façade (z = +hd) */
  const door = vc('#2e2620', 1, r), lat = vc('#3a3028', 1, r);
  B.face([[-hw * 0.55, 0.35, hd + 0.04], [-hw * 0.15, 0.35, hd + 0.04], [-hw * 0.15, 2.1, hd + 0.04], [-hw * 0.55, 2.1, hd + 0.04]], door, [0, 1, 0]);
  B.face([[hw * 0.2, 1.4, hd + 0.04], [hw * 0.7, 1.4, hd + 0.04], [hw * 0.7, 2.3, hd + 0.04], [hw * 0.2, 2.3, hd + 0.04]], lat, [0, 1, 0]);
}

/* un toit à deux pentes : faîte le long de x, égouts à z = ±(D/2 + oz), débords ox aux pignons */
function vGable(B, W, D, H, R, ox, oz, col, ridge, thick) {
  const hw = W / 2 + ox, hd = D / 2 + oz, t = thick || 0.35;
  const drop = R * oz / (D / 2);
  const ye = H - drop, yr = H + R;
  for (const s of [-1, 1]) {
    /* la pente, puis son épaisseur au bord, puis le dessous (vu d'en bas, sous l'avant-toit) */
    B.face([[-hw, ye, s * hd], [hw, ye, s * hd], [hw, yr, 0], [-hw, yr, 0]], col, [0, yr - 2, 0]);
    B.face([[-hw, ye - t, s * hd], [hw, ye - t, s * hd], [hw, ye, s * hd], [-hw, ye, s * hd]], vc('#000000').copy(col).multiplyScalar(0.7), [0, ye, 0]);
    B.face([[-hw, ye - t, s * hd], [hw, ye - t, s * hd], [hw, yr - t, 0], [-hw, yr - t, 0]], vc('#000000').copy(col).multiplyScalar(0.55), [0, yr + 4, 0]);
    /* la tranche du pignon */
    B.face([[s * hw, ye - t, -hd], [s * hw, ye, -hd], [s * hw, yr, 0], [s * hw, yr - t, 0]], vc('#000000').copy(col).multiplyScalar(0.75), [0, yr, 0]);
    B.face([[s * hw, ye - t, hd], [s * hw, ye, hd], [s * hw, yr, 0], [s * hw, yr - t, 0]], vc('#000000').copy(col).multiplyScalar(0.75), [0, yr, 0]);
  }
  if (ridge) B.box(-hw + 0.1, yr - 0.15, -0.38, hw - 0.1, yr + 0.38, 0.38, ridge);
}

/* un toit en croupe (le chaume) : quatre pans, faîte court, épais au bord */
function vHip(B, W, D, H, R, o, col, ridge, thick) {
  const hw = W / 2 + o, hd = D / 2 + o, t = thick || 0.7;
  const k = Math.min(hd, hw) * 0.92;              // le recul des croupes, presque à 45 degrés
  const yr = H + R, ye = H - R * o / (D / 2);
  const rx = Math.max(0.6, hw - k);
  const I = [0, yr - 3, 0];
  B.face([[-hw, ye, hd], [hw, ye, hd], [rx, yr, 0], [-rx, yr, 0]], col, I);
  B.face([[-hw, ye, -hd], [hw, ye, -hd], [rx, yr, 0], [-rx, yr, 0]], col, I);
  const side = vc('#000000').copy(col).multiplyScalar(0.92);
  B.face([[hw, ye, -hd], [hw, ye, hd], [rx, yr, 0]], side, I);
  B.face([[-hw, ye, -hd], [-hw, ye, hd], [-rx, yr, 0]], side, I);
  /* l'épaisseur du chaume, tout autour */
  const edge = vc('#000000').copy(col).multiplyScalar(0.62);
  for (const [a, b] of [[[-hw, hd], [hw, hd]], [[hw, hd], [hw, -hd]], [[hw, -hd], [-hw, -hd]], [[-hw, -hd], [-hw, hd]]]) {
    B.face([[a[0], ye - t, a[1]], [b[0], ye - t, b[1]], [b[0], ye, b[1]], [a[0], ye, a[1]]], edge, [0, ye, 0]);
  }
  B.face([[-hw, ye - t, -hd], [hw, ye - t, -hd], [hw, ye - t, hd], [-hw, ye - t, hd]], vc('#000000').copy(col).multiplyScalar(0.45), [0, ye + 3, 0]);
  if (ridge) B.box(-rx - 0.3, yr - 0.3, -0.55, rx + 0.3, yr + 0.45, 0.55, ridge);
}

/* une maison de village : chaume, bardeaux lestés de pierres, ou tuiles (kind) */
function vHouse(B, kind, W, D, r, pal) {
  const plaster = r() < 0.5;
  const wall = plaster && kind === 'tile' ? vc('#d6cbb2', 1, r) : vc('#5d4a38', 1, r, 0.2);
  const low = vc('#463729', 1, r);
  if (kind === 'thatch') {
    const H = 2.6;
    vBody(B, W, D, H, wall, low, r, 0);
    vHip(B, W, D, H, 3.6 + D * 0.12, 0.9, vc(pal.thatch, 1, r, 0.14), vc(pal.thatchR, 1, r), 0.75);
  } else if (kind === 'shingle') {
    const H = 2.8, R = 1.6 + D * 0.06;
    vBody(B, W, D, H, wall, low, r, R);
    const roof = vc(pal.shingle, 1, r, 0.14);
    vGable(B, W, D, H, R, 0.6, 0.8, roof, null, 0.25);
    /* les pierres qui tiennent les bardeaux, en rangées sur chaque pan */
    if (!pal.snow) {
      const st = vc('#59564f', 1, r);
      for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
        const z = s * (D / 2 + 0.8) * (0.35 + 0.35 * i), y = H + R * (1 - Math.abs(z) / (D / 2 + 0.8)) - R * 0.8 / (D / 2) + 0.15;
        for (let x = -W / 2 + 0.8; x < W / 2 - 0.4; x += 1.5 + r() * 0.8) B.box(x - 0.3, y, z - 0.3, x + 0.3, y + 0.4, z + 0.3, st);
      }
    }
  } else {
    const H = 3.1, R = 1.9 + D * 0.08;
    vBody(B, W, D, H, wall, low, r, R);
    vGable(B, W, D, H, R, 0.6, 0.95, vc(pal.tile, 1, r, 0.1), vc(pal.tileR, 1, r), 0.35);
  }
}

/* un kura : entrepôt de torchis blanc, soubassement sombre, lourd toit de tuiles */
function vKura(B, W, D, r, pal) {
  const H = 4.6, R = 1.6;
  const white = vc('#ece6d8', 1, r, 0.06), band = vc('#34363a', 1, r);
  B.box(-W / 2 - 0.15, -(B.drop || 2.5), -D / 2 - 0.15, W / 2 + 0.15, 0.4, D / 2 + 0.15, vc('#7a756c', 1, r), false);
  B.box(-W / 2, 0.4, -D / 2, W / 2, 1.6, D / 2, band, false);
  B.box(-W / 2, 1.6, -D / 2, W / 2, H, D / 2, white, false);
  for (const s of [-1, 1]) B.face([[s * W / 2, H, -D / 2], [s * W / 2, H, D / 2], [s * W / 2, H + R, 0]], white, [0, H, 0]);
  /* la porte de fer, la petite fenêtre */
  const iron = vc('#2c2c2e', 1, r);
  B.face([[-0.8, 0.4, D / 2 + 0.05], [0.8, 0.4, D / 2 + 0.05], [0.8, 2.6, D / 2 + 0.05], [-0.8, 2.6, D / 2 + 0.05]], iron, [0, 1, 0]);
  B.face([[-0.5, 3.4, D / 2 + 0.05], [0.5, 3.4, D / 2 + 0.05], [0.5, 4.1, D / 2 + 0.05], [-0.5, 4.1, D / 2 + 0.05]], iron, [0, 1, 0]);
  vGable(B, W, D, H, R, 0.35, 0.55, vc(pal.tile, 0.95, r, 0.08), vc(pal.tileR, 1, r), 0.45);
}

/* un temple : grand pavillon sur son socle de pierre, toit de tuiles en croupe à pignons */
function vTemple(B, r, pal) {
  const W = 15, D = 12, H = 4.6;
  const stone = vc('#9a948a', 1, r), wood = vc('#6a4e3a', 1, r), dark = vc('#3b2e24', 1, r);
  B.box(-W / 2 - 2.2, -(B.drop || 2.5), -D / 2 - 2.2, W / 2 + 2.2, 1.2, D / 2 + 2.2, stone);
  B.box(-W / 2, 1.2, -D / 2, W / 2, H, D / 2, wood, false);
  /* la galerie et ses piliers, devant */
  for (let x = -W / 2; x <= W / 2 + 0.01; x += W / 4) B.box(x - 0.3, 1.2, D / 2 + 1.1, x + 0.3, H, D / 2 + 1.7, dark);
  B.face([[-W * 0.3, 1.2, D / 2 + 0.05], [W * 0.3, 1.2, D / 2 + 0.05], [W * 0.3, 3.6, D / 2 + 0.05], [-W * 0.3, 3.6, D / 2 + 0.05]], dark, [0, 2, 0]);
  const roof = vc(pal.tile, 0.9, r, 0.06), ridge = vc(pal.tileR, 0.95, r);
  vHip(B, W + 2.4, D + 2.6, H, 5.6, 1.6, roof, ridge, 0.6);
  /* le petit pignon au sommet (irimoya) */
  const yr = H + 5.6;
  for (const s of [-1, 1]) B.face([[s * 3.2, yr - 2.2, -1.6], [s * 3.2, yr - 2.2, 1.6], [s * 3.2, yr + 0.2, 0]], vc('#7a5c44', 1, r), [0, yr - 3, 0]);
}

/* une porte de temple : deux piliers, un petit toit à deux pentes */
function vGate(B, r, pal) {
  const wood = vc('#5e4634', 1, r);
  for (const x of [-2.2, 2.2]) B.box(x - 0.35, 0, -0.35, x + 0.35, 4.2, 0.35, wood);
  B.box(-2.6, 3.6, -0.4, 2.6, 4.2, 0.4, wood);
  vGable(B, 4.4, 1.6, 4.2, 1.2, 0.6, 0.6, vc(pal.tile, 0.9, r), vc(pal.tileR, 1, r), 0.3);
}

/* un torii vermillon : deux piliers, la traverse basse, le linteau noir aux bouts relevés */
function vTorii(B, r, pal) {
  const red = vc('#b6452f', 1, r, 0.08), black = vc('#262222', 1, r);
  for (const x of [-2.6, 2.6]) B.box(x - 0.38, 0, -0.38, x + 0.38, 5.4, 0.38, red);
  B.box(-3.3, 3.9, -0.28, 3.3, 4.5, 0.28, red);
  B.box(-3.9, 5.4, -0.45, 3.9, 5.9, 0.45, pal.snow ? vc('#e8ecee') : black);
  B.box(-4.3, 5.75, -0.4, -3.6, 6.15, 0.4, black);
  B.box(3.6, 5.75, -0.4, 4.3, 6.15, 0.4, black);
}

/* un petit sanctuaire, derrière son torii */
function vShrine(B, r, pal) {
  const wood = vc('#7a5a40', 1, r);
  B.box(-2.6, -2, -2.2, 2.6, 0.9, 2.2, vc('#8f8a80', 1, r));
  B.box(-1.9, 0.9, -1.6, 1.9, 3.0, 1.6, wood, false);
  for (const s of [-1, 1]) B.face([[s * 1.9, 3.0, -1.6], [s * 1.9, 3.0, 1.6], [s * 1.9, 4.3, 0]], wood, [0, 3, 0]);
  vGable(B, 3.8, 3.2, 3.0, 1.3, 0.5, 1.0, vc(pal.snow ? '#e8ecee' : '#5b4d3c', 1, r), vc('#3a3028', 1, r), 0.25);
}

/* une barque de pêche tirée sur la grève : coque de planches, étrave haute (x vers l'avant) */
function vBoat(B, r, L) {
  const wood = vc('#8a7456', 1, r, 0.14), inner = vc('#5a4a36', 1, r), rim = vc('#4a3c2c', 1, r), hw = 1.15;
  const x0 = -L / 2, x1 = L / 2 - 1.8, xp = L / 2 + 0.3;
  /* les flancs, évasés, et l'étrave qui se relève en pointe */
  for (const s of [-1, 1]) {
    B.face([[x0, 0.1, s * 0.6], [x1, 0.1, s * 0.6], [x1, 1.0, s * hw], [x0, 0.85, s * hw * 0.92]], wood, [0, 0.6, 0]);
    B.face([[x1, 0.1, s * 0.6], [xp, 1.45, 0], [x1, 1.0, s * hw]], wood, [x1 - 1, 0.6, 0]);
  }
  B.face([[x0, 0.1, -0.6], [x0, 0.1, 0.6], [x0, 0.85, hw * 0.92], [x0, 0.85, -hw * 0.92]], wood, [0, 0.5, 0]);
  /* le fond, vu d'en haut, les bancs */
  B.face([[x0 + 0.2, 0.4, -0.75], [x1, 0.4, -0.75], [x1, 0.4, 0.75], [x0 + 0.2, 0.4, 0.75]], inner, [0, -2, 0]);
  B.face([[x1, 0.4, -0.75], [x1 + 1.2, 0.7, 0], [x1, 0.4, 0.75]], inner, [0, -2, 0]);
  for (const x of [-L * 0.22, L * 0.12]) B.box(x - 0.25, 0.4, -hw + 0.1, x + 0.25, 0.8, hw - 0.1, rim);
}

/* un carré de potager derrière une maison : des planches de légumes en rangs */
function vPlot(B, W, D, r, pal) {
  const soil = vc(pal.snow ? '#e4e8ea' : '#8c7552', 1, r, 0.1), crop = vc(pal.snow ? '#d6dbde' : '#5f8a40', 1, r, 0.15);
  B.face([[-W / 2, 0.2, -D / 2], [W / 2, 0.2, -D / 2], [W / 2, 0.2, D / 2], [-W / 2, 0.2, D / 2]], soil, [0, -5, 0]);
  if (pal.snow) return;
  for (let z = -D / 2 + 0.6; z < D / 2 - 0.3; z += 1.1) B.face([[-W / 2 + 0.3, 0.32, z], [W / 2 - 0.3, 0.32, z], [W / 2 - 0.3, 0.32, z + 0.5], [-W / 2 + 0.3, 0.32, z + 0.5]], crop, [0, -5, 0]);
}

/* une jetée de planches sur pilotis, de x = 0 (au rivage) à x = L (au large) */
function vPier(B, L, r) {
  const plank = vc('#7d6c54', 1, r), post = vc('#46392c', 1, r);
  B.box(-2, 0.9, -2.2, L, 1.5, 2.2, plank);
  for (let x = 2; x < L; x += 6) for (const z of [-2.0, 2.0]) B.box(x - 0.35, -3, z - 0.35, x + 0.35, 1.9, z + 0.35, post);
}

/* la tour de guet du feu (hinomi yagura) : quatre poteaux, une échelle, la plateforme et sa cloche
 * sous un petit toit, au-dessus des toits de la ville */
function vFireTower(B, r, pal) {
  const wood = vc('#4a3a2c', 1, r), dark = vc('#2e2620', 1, r);
  for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) B.box(x - 0.18, 0, z - 0.18, x + 0.18, 13.2, z + 0.18, wood);
  for (const y of [4, 8]) { B.box(-1.7, y, -1.7, 1.7, y + 0.2, -1.4, wood); B.box(-1.7, y, 1.4, 1.7, y + 0.2, 1.7, wood); }
  B.box(-2.1, 10.6, -2.1, 2.1, 10.95, 2.1, wood);
  for (const s of [-1, 1]) { B.box(-2.1, 10.95, s * 2.1 - 0.06, 2.1, 11.9, s * 2.1 + 0.06, dark); B.box(s * 2.1 - 0.06, 10.95, -2.1, s * 2.1 + 0.06, 11.9, 2.1, dark); }
  B.box(-0.35, 11.6, -0.35, 0.35, 12.5, 0.35, vc('#6b5a3a'));
  /* l'échelle, contre un côté */
  B.box(-0.6, 0, 1.75, 0.6, 10.6, 1.95, vc('#5a4632', 1, r));
  vHip(B, 3.6, 3.6, 13.2, 1.5, 0.5, vc(pal.tile, 0.9, r), vc(pal.tileR, 1, r), 0.25);
}

/* un château (local : x le long de la façade, z vers la mer) : le honmaru sur sa plateforme de pierre en
 * talus, le mur blanc chaperonné de tuiles qui la borde, une porte côté mer, deux tourelles aux angles,
 * et au fond le donjon (tenshu) sur son socle : des étages de murs blancs (noirs en bas, à Hiroshima),
 * chacun sous un toit de tuiles débordant, le dernier en croupe. h0 : le bas du talus, sous le dessus */
function vCastle(B, r, pal, tiers, dark, h0) {
  const stone = vc('#8d887e', 1, r, 0.05), stoneD = vc('#77736b', 1, r, 0.05), ground = vc(pal.snow ? '#e6eaec' : '#b3a588', 1, r, 0.04);
  const white = vc(pal.snow ? '#f4f4f2' : '#ece8dc', 1, r, 0.03), black = vc('#2e2b28', 1, r), win = vc('#2a2622', 1, r);
  const roof = vc(pal.tile, 0.85, r, 0.05), ridge = vc(pal.tileR, 1, r);
  /* une plateforme de pierre en talus : du rectangle (w0, d0) en bas au rectangle (w1, d1) en haut */
  const platform = (cx, cz, w0, d0, w1, d1, yb, yt, top) => {
    const P0 = [[-w0, -d0], [w0, -d0], [w0, d0], [-w0, d0]], P1 = [[-w1, -d1], [w1, -d1], [w1, d1], [-w1, d1]];
    for (let i = 0; i < 4; i++) {
      const a0 = P0[i], b0 = P0[(i + 1) % 4], a1 = P1[i], b1 = P1[(i + 1) % 4];
      B.face([[cx + a0[0], yb, cz + a0[1]], [cx + b0[0], yb, cz + b0[1]], [cx + b1[0], yt, cz + b1[1]], [cx + a1[0], yt, cz + a1[1]]], i % 2 ? stone : stoneD, [cx, (yb + yt) / 2, cz]);
    }
    if (top) B.face(P1.map(([x, z]) => [cx + x, yt, cz + z]), top, [cx, yt - 5, cz]);
  };
  /* le honmaru : 56 sur 48 en haut */
  platform(0, 0, 31, 27, 28, 24, h0, 0, ground);
  /* le mur blanc et son chaperon, sur le bord ; la porte au milieu du côté de la mer (z = +24) */
  const wall = (x0, z0, x1, z1) => {
    const l = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / l, uz = (z1 - z0) / l, nx = -uz * 0.45, nz = ux * 0.45;
    const q = (x, z, y) => [x, y, z];
    B.face([q(x0 + nx, z0 + nz, 0), q(x1 + nx, z1 + nz, 0), q(x1 + nx, z1 + nz, 2.4), q(x0 + nx, z0 + nz, 2.4)], white, [(x0 + x1) / 2 - nx * 3, 1, (z0 + z1) / 2 - nz * 3]);
    B.face([q(x0 - nx, z0 - nz, 0), q(x1 - nx, z1 - nz, 0), q(x1 - nx, z1 - nz, 2.4), q(x0 - nx, z0 - nz, 2.4)], white, [(x0 + x1) / 2 + nx * 3, 1, (z0 + z1) / 2 + nz * 3]);
    const cn = nx * 2.2, cz2 = nz * 2.2;
    B.face([q(x0 + cn, z0 + cz2, 2.2), q(x1 + cn, z1 + cz2, 2.2), q(x1, z1, 3.1), q(x0, z0, 3.1)], roof, [(x0 + x1) / 2, -5, (z0 + z1) / 2]);
    B.face([q(x0 - cn, z0 - cz2, 2.2), q(x1 - cn, z1 - cz2, 2.2), q(x1, z1, 3.1), q(x0, z0, 3.1)], roof, [(x0 + x1) / 2, -5, (z0 + z1) / 2]);
  };
  wall(-27, -23, 27, -23); wall(27, -23, 27, 23); wall(-27, 23, -27, -23);
  wall(-27, 23, -4, 23); wall(4, 23, 27, 23);
  /* la porte (local de la porte : x le long du mur) */
  const ca = B.ca, sa = B.sa, ox = B.ox, oy = B.oy, oz = B.oz;
  B.at(ox + (0 * ca - 23 * sa), oy, oz + (0 * sa + 23 * ca), Math.atan2(sa, ca)); vGate(B, r, pal);
  /* deux tourelles (yagura) aux angles de la mer, à deux étages */
  for (const sx of [-1, 1]) {
    B.at(ox + (sx * 23 * ca - 19 * sa), oy, oz + (sx * 23 * sa + 19 * ca), Math.atan2(sa, ca));
    B.box(-3.5, 0, -3, 3.5, 4, 3, white, false);
    vHip(B, 7, 6, 4, 1.6, 1.2, roof, ridge, 0.3);
    B.box(-2.4, 4.6, -2, 2.4, 7.4, 2, white, false);
    vHip(B, 4.8, 4, 7.4, 1.8, 1.1, roof, ridge, 0.3);
  }
  /* le donjon, au fond (côté terre) */
  B.at(ox + (0 * ca - (-8) * sa), oy, oz + (0 * sa + (-8) * ca), Math.atan2(sa, ca));
  platform(0, 0, 15, 12.5, 13, 10.5, 0, 6, stone);
  let y = 6, w = 23, d = 18.5;
  const hT = 5;
  for (let k = 0; k < tiers; k++) {
    const last = k === tiers - 1;
    /* à Hiroshima, le bas des murs est bardé de planches noires (shitami-itabari) */
    if (dark) { B.box(-w / 2, y, -d / 2, w / 2, y + hT * 0.55, d / 2, black, false); B.box(-w / 2, y + hT * 0.55, -d / 2, w / 2, y + hT, d / 2, white, false); }
    else B.box(-w / 2, y, -d / 2, w / 2, y + hT, d / 2, white, false);
    /* les fenêtres, en rang sur chaque face */
    const nW = Math.max(2, Math.floor(w / 4)), nD = Math.max(2, Math.floor(d / 4));
    for (let i = 0; i < nW; i++) {
      const x = -w / 2 + (i + 0.5) * w / nW;
      for (const s of [-1, 1]) B.face([[x - 0.55, y + 1.8, s * (d / 2 + 0.05)], [x + 0.55, y + 1.8, s * (d / 2 + 0.05)], [x + 0.55, y + 2.9, s * (d / 2 + 0.05)], [x - 0.55, y + 2.9, s * (d / 2 + 0.05)]], win, [x, y + 2, 0]);
    }
    for (let i = 0; i < nD; i++) {
      const z = -d / 2 + (i + 0.5) * d / nD;
      for (const s of [-1, 1]) B.face([[s * (w / 2 + 0.05), y + 1.8, z - 0.55], [s * (w / 2 + 0.05), y + 1.8, z + 0.55], [s * (w / 2 + 0.05), y + 2.9, z + 0.55], [s * (w / 2 + 0.05), y + 2.9, z - 0.55]], win, [0, y + 2, z]);
    }
    if (last) {
      vHip(B, w, d, y + hT, 3.4, 2.2, roof, ridge, 0.45);
      /* les poissons d'or (shachihoko) aux deux bouts du faîte */
      const hw = w / 2 + 2.2, hd = d / 2 + 2.2, rx = Math.max(0.6, hw - Math.min(hd, hw) * 0.92), yr = y + hT + 3.4;
      const gold = vc('#d6a83e');
      for (const sx of [-1, 1]) B.box(sx * (rx + 0.3) - 0.45, yr + 0.3, -0.35, sx * (rx + 0.3) + 0.45, yr + 1.6, 0.35, gold);
      break;
    }
    /* le toit de l'étage : une jupe de tuiles, du débord jusqu'au pied de l'étage suivant */
    const w2 = w * 0.76, d2 = d * 0.76, o = 2.6, ye = y + hT - 0.4, yi = y + hT + 1.5;
    const E = [[-w / 2 - o, -d / 2 - o], [w / 2 + o, -d / 2 - o], [w / 2 + o, d / 2 + o], [-w / 2 - o, d / 2 + o]];
    const I = [[-w2 / 2, -d2 / 2], [w2 / 2, -d2 / 2], [w2 / 2, d2 / 2], [-w2 / 2, d2 / 2]];
    for (let i = 0; i < 4; i++) {
      const a = E[i], b = E[(i + 1) % 4], c = I[(i + 1) % 4], e = I[i];
      B.face([[a[0], ye, a[1]], [b[0], ye, b[1]], [c[0], yi, c[1]], [e[0], yi, e[1]]], roof, [0, ye - 6, 0]);
      B.face([[a[0], ye - 0.35, a[1]], [b[0], ye - 0.35, b[1]], [b[0], ye, b[1]], [a[0], ye, a[1]]], vc('#000000').copy(roof).multiplyScalar(0.7), [0, ye, 0]);
    }
    y = yi - 0.2; w = w2; d = d2;
  }
}

/* un séchoir à filets sur la grève : des perches, une traverse, le filet tendu (le long de x) */
function vRack(B, L, r) {
  const pole = vc('#5a4a38', 1, r), net = vc('#3d3a34', 1, r, 0.2);
  for (let x = -L / 2; x <= L / 2 + 0.01; x += L / Math.max(2, Math.round(L / 3))) B.box(x - 0.14, -0.5, -0.14, x + 0.14, 3.3, 0.14, pole);
  B.box(-L / 2 - 0.2, 3.0, -0.12, L / 2 + 0.2, 3.25, 0.12, pole);
  B.box(-L / 2, 0.9, -0.07, L / 2, 3.0, 0.07, net);
}

/* un pin noir du rivage : tronc penché, nuages d'aiguilles en étages */
function vPine(B, r, s, pal) {
  s = s || 1;
  const trunk = vc('#4a3a2c', 1, r), green = pal && pal.snow ? vc('#9fb0ad', 1, r, 0.1) : vc('#2f4a33', 1, r, 0.16);
  const lean = (r() - 0.5) * 1.4 * s;
  B.box(-0.35 * s, 0, -0.35 * s, 0.35 * s, 5.2 * s, 0.35 * s, trunk);
  const clumps = [[lean * 0.6, 5.4, 0, 2.6], [lean, 7.2, 0.4, 2.0], [lean * 0.4 - 1.2, 4.6, -0.8, 1.7]];
  for (const [x, y, z, rad] of clumps) {
    const R = rad * s, h = 0.75 * s;
    const n = 6, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU + r() * 0.4; pts.push([x * s + Math.cos(a) * R, y * s, z * s + Math.sin(a) * R]); }
    const top = [x * s, y * s + h, z * s], bot = [x * s, y * s - h * 0.6, z * s];
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      B.face([p, q, top], green, [x * s, y * s, z * s]);
      B.face([p, q, bot], vc('#000000').copy(green).multiplyScalar(0.7), [x * s, y * s, z * s]);
    }
  }
}

/* un arbre de jardin, en boule */
function vGardenTree(B, r, pal) {
  const leaf = pal.snow ? vc('#8a8f88', 1, r) : vc('#4e7a3c', 1, r, 0.2);
  B.box(-0.25, 0, -0.25, 0.25, 2.2, 0.25, vc('#4a3a2c'));
  const R = 1.8 + r() * 0.8, y = 3.2, n = 6, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push([Math.cos(a) * R, y, Math.sin(a) * R]); }
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    B.face([p, q, [0, y + R * 0.9, 0]], leaf, [0, y, 0]);
    B.face([p, q, [0, y - R * 0.7, 0]], vc('#000000').copy(leaf).multiplyScalar(0.7), [0, y, 0]);
  }
}

/* ---------- le plan d'un village : rues le long du rivage, maisons, temple, grève, rizières ---------- */

/* la taille d'un lieu : hameau, village, bourg, ville */
/* gap : l'espace entre deux maisons ; plots : la part des maisons qui ont un potager derrière ; quay :
 * un quai de pierre le long du front de mer, à la place des maisons côté mer */
const VCLASS = {
  hamlet: { rows: 1, rowGap: 25, half: 45, boats: 5, racks: 2, tower: 0, piers: 0, temple: 0, shrine: 1, fields: 26, kura: 0, tile: 0.05, shingle: 0.35, gap: [3, 7], plots: 0.55, quay: false },
  village: { rows: 2, rowGap: 25, half: 85, boats: 9, racks: 3, tower: 0, piers: 0, temple: 1, shrine: 1, fields: 60, kura: 0.04, tile: 0.12, shingle: 0.35, gap: [2, 5], plots: 0.45, quay: false },
  town: { rows: 3, rowGap: 28, half: 140, boats: 12, racks: 2, tower: 1, piers: 1, temple: 1, shrine: 1, fields: 80, kura: 0.14, tile: 0.55, shingle: 0.28, gap: [0.6, 2], plots: 0.12, quay: false },
  city: { rows: 4, rowGap: 30, half: 220, boats: 14, racks: 0, tower: 2, piers: 2, temple: 2, shrine: 1, fields: 90, kura: 0.22, tile: 0.82, shingle: 0.12, gap: [0.3, 1.2], plots: 0.05, quay: true },
};

/* S : l'échantillonneur du terrain ({ h(x, y), d(x, y) : hauteur, distance signée au rivage }) */
function buildVillage(lab, S, opts) {
  const o = Object.assign({ season: 'printemps', north: false, ezo: false, excl: [], seed: 1 }, opts);
  const pal = VPAL[o.season] || VPAL.printemps;
  const K = VCLASS[lab.cls || 'village'];
  const r = makeRng(Math.round(lab.x * 7 + lab.y * 13 + o.seed * 101) >>> 0);
  const B = vBuilder();
  const occ = [];                          // ce qu'on a posé, en cercles [x, y, rayon] : les arbres l'évitent
  /* les emprises, en rectangles orientés (centre, axe u, demi-largeur le long de u, demi-profondeur) :
   * les maisons se serrent le long des rues sans jamais se chevaucher */
  const HC = 24, hash = new Map();
  const hkey = (i, j) => i * 100003 + j;
  const box = (x, y, ux, uy, hw, hd) => ({ x, y, ux, uy, hw, hd, R: Math.hypot(hw, hd) });
  const cells = (x, y, R, fn) => { for (let j = Math.floor((y - R) / HC); j <= Math.floor((y + R) / HC); j++) for (let i = Math.floor((x - R) / HC); i <= Math.floor((x + R) / HC); i++) fn(hkey(i, j)); };
  const addBox = (b) => { cells(b.x, b.y, b.R, (k) => { let l = hash.get(k); if (!l) hash.set(k, (l = [])); l.push(b); }); return b; };
  const apart = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    for (const [nx, ny] of [[a.ux, a.uy], [-a.uy, a.ux], [b.ux, b.uy], [-b.uy, b.ux]]) {
      const ra = a.hw * Math.abs(a.ux * nx + a.uy * ny) + a.hd * Math.abs(a.ux * ny - a.uy * nx);
      const rb = b.hw * Math.abs(b.ux * nx + b.uy * ny) + b.hd * Math.abs(b.ux * ny - b.uy * nx);
      if (Math.abs(dx * nx + dy * ny) > ra + rb) return true;
    }
    return false;
  };
  const inExcl = (x, y, R) => o.excl.some(([ex, ey, er]) => (x - ex) ** 2 + (y - ey) ** 2 < (er + R) ** 2);
  const freeBox = (b) => {
    if (inExcl(b.x, b.y, b.R * 0.85)) return false;
    let ok = true;
    const seen = new Set();
    cells(b.x, b.y, b.R, (k) => {
      if (!ok) return;
      const l = hash.get(k);
      if (l) for (const q of l) { if (seen.has(q)) continue; seen.add(q); if ((q.x - b.x) ** 2 + (q.y - b.y) ** 2 < (q.R + b.R) ** 2 && !apart(q, b)) { ok = false; return; } }
    });
    return ok;
  };
  /* un petit objet rond (barque, pin, rizière) : ni sur une emprise, ni sur un autre objet */
  const free = (x, y, rad) => freeBox(box(x, y, 1, 0, rad * 0.75, rad * 0.75)) && !occ.some(([ox, oy, orr]) => (x - ox) ** 2 + (y - oy) ** 2 < (orr + rad) ** 2 * 0.8);
  const grad = (x, y) => { const e = 5; const gx = S.d(x + e, y) - S.d(x - e, y), gy = S.d(x, y + e) - S.d(x, y - e); const l = Math.hypot(gx, gy) || 1; return [gx / l, gy / l, l / (2 * e)]; };
  /* ramener un point sur la courbe de niveau du rivage (distance lev) */
  const onLevel = (x, y, lev) => {
    for (let k = 0; k < 4; k++) { const [gx, gy, gl] = grad(x, y); const e = (lev - S.d(x, y)) / Math.max(0.3, gl); x += gx * clamp(e, -12, 12); y += gy * clamp(e, -12, 12); }
    return [x, y];
  };
  /* le point de la courbe (lev) le plus proche du centre */
  let start = null, bd = 1e9;
  const R0 = (lab.r || 200) * 1.2;
  for (let yy = -R0; yy <= R0; yy += 8) for (let xx = -R0; xx <= R0; xx += 8) {
    const x = lab.x + xx, y = lab.y + yy, d = S.d(x, y);
    if (Math.abs(d - 18) > 5) continue;
    const dd = xx * xx + yy * yy;
    if (dd < bd) { bd = dd; start = [x, y]; }
  }
  if (!start) return null;
  /* une rue le long de la courbe (lev), de part et d'autre du point de départ */
  const trace = (p0, lev, half) => {
    const sides = [];
    for (const dir of [1, -1]) {
      const pts = [];
      let [x, y] = onLevel(p0[0], p0[1], lev), len = 0, prevA = null, h0 = S.h(x, y);
      while (len < half) {
        const [gx, gy] = grad(x, y);
        const tx = -gy * dir, ty = gx * dir;
        let [nx, ny] = onLevel(x + tx * 4, y + ty * 4, lev);
        const a = Math.atan2(ny - y, nx - x);
        if (prevA !== null && Math.abs(wrapA(a - prevA)) > 0.6) break;
        const h = S.h(nx, ny);
        if (h > 42 || Math.abs(h - h0) > 3.2 || Math.abs(S.d(nx, ny) - lev) > 4) break;
        len += Math.hypot(nx - x, ny - y);
        prevA = a; x = nx; y = ny; h0 = h;
        pts.push([x, y]);
      }
      sides.push(pts);
    }
    const [x0, y0] = onLevel(p0[0], p0[1], lev);
    return [...sides[1].reverse(), [x0, y0], ...sides[0]];
  };
  const streets = [];
  for (let k = 0; k < K.rows; k++) {
    const lev = 18 + k * K.rowGap;
    const [gx, gy] = grad(start[0], start[1]);
    const p0 = [start[0] + gx * k * K.rowGap, start[1] + gy * k * K.rowGap];
    const pl = trace(p0, lev, K.half * (1 - k * 0.12));
    if (pl.length < 4) break;
    streets.push({ pl, lev });
  }
  if (!streets.length) return null;
  /* une rue : un ruban de terre battue collé au sol, et ses emprises (on n'y bâtit pas) */
  const streetCol = vc(pal.street);
  const ribbon = (pl, wdt, col, lift) => {
    for (let i = 0; i < pl.length - 1; i++) {
      const [ax, ay] = pl[i], [bx, by] = pl[i + 1];
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (inExcl(mx, my, 1)) continue;
      const l = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / l, uy = (by - ay) / l, nx = -uy * wdt / 2, ny = ux * wdt / 2;
      B.at(0, 0, 0, 0);
      const p = (x, y) => [x, S.h(x, y) + lift, y];
      B.face([p(ax + nx, ay + ny), p(bx + nx, by + ny), p(bx - nx, by - ny), p(ax - nx, ay - ny)], vc('#000000').copy(col).multiplyScalar(0.94 + r() * 0.1), [mx, -100, my]);
      addBox(box(mx, my, ux, uy, l / 2 + 0.6, wdt / 2 + 0.4));
      if (i % 2 === 0) occ.push([ax, ay, wdt / 2 + 0.2]);
    }
  };
  for (const { pl } of streets) ribbon(pl, 4.6, streetCol, 0.22);
  const straight = (x0, y0, x1, y1, n) => { const pl = []; for (let j = 0; j <= n; j++) pl.push([lerp(x0, x1, j / n), lerp(y0, y1, j / n)]); return pl; };
  /* les ruelles qui montent d'une rue à l'autre, tracées avant les maisons, qui les laissent libres */
  for (let k = 0; k + 1 < streets.length; k++) {
    const a = streets[k].pl, b = streets[k + 1].pl;
    for (let i = 6; i < a.length - 6; i += 12 + Math.floor(r() * 8)) {
      const [x0, y0] = a[i];
      let best = null, bd2 = 1e9;
      for (const q of b) { const dd = (q[0] - x0) ** 2 + (q[1] - y0) ** 2; if (dd < bd2) { bd2 = dd; best = q; } }
      if (best && bd2 < (K.rowGap + 15) ** 2) ribbon(straight(x0, y0, best[0], best[1], 5), 3, streetCol, 0.2);
    }
  }
  const front = streets[0].pl, mid = front[Math.floor(front.length / 2)];
  const [mgx, mgy] = grad(mid[0], mid[1]);
  /* le quai de pierre des villes, côté mer de la première rue : le dessus dallé, et le mur qui tombe sur la grève */
  if (K.quay) {
    const stone = vc('#8e8a80'), face = vc('#6e6a62');
    for (let i = 0; i < front.length - 1; i++) {
      const [ax, ay] = front[i], [bx, by] = front[i + 1];
      const [gx, gy] = grad(ax, ay), [hx, hy] = grad(bx, by);
      const pa = [ax - gx * 2.3, ay - gy * 2.3], pb = [bx - hx * 2.3, by - hy * 2.3], qa = [ax - gx * 8, ay - gy * 8], qb = [bx - hx * 8, by - hy * 8];
      const mx = (qa[0] + pb[0]) / 2, my = (qa[1] + pb[1]) / 2;
      if (inExcl(mx, my, 3)) continue;
      const ya = S.h(ax, ay) + 0.25, yb = S.h(bx, by) + 0.25;
      B.at(0, 0, 0, 0);
      B.face([[pa[0], ya, pa[1]], [pb[0], yb, pb[1]], [qb[0], yb, qb[1]], [qa[0], ya, qa[1]]], stone, [ax, -100, ay]);
      B.face([[qa[0], ya, qa[1]], [qb[0], yb, qb[1]], [qb[0], -1.5, qb[1]], [qa[0], -1.5, qa[1]]], face, [ax + gx * 20, ya - 1, ay + gy * 20]);
      const l = Math.hypot(bx - ax, by - ay) || 1;
      addBox(box(mx, my, (bx - ax) / l, (by - ay) / l, l / 2 + 0.5, 3.4));
    }
  }
  /* les passages vers la grève, entre les maisons du front de mer */
  if (!K.quay) {
    for (let i = 4 + Math.floor(r() * 6); i < front.length - 3; i += 11 + Math.floor(r() * 7)) {
      const [x0, y0] = front[i], [gx, gy] = grad(x0, y0);
      ribbon(straight(x0, y0, x0 - gx * 12, y0 - gy * 12, 3), 2.6, streetCol, 0.2);
    }
  }
  /* le sanctuaire et son torii, au bout du front de mer, avant les maisons */
  for (let k = 0, tries = 0; k < K.shrine && tries < 2; tries++) {
    const end = tries ? front[Math.min(2, front.length - 1)] : front[front.length - 1 - Math.min(2, front.length - 1)];
    const [gx, gy] = grad(end[0], end[1]);
    const x = end[0] + gx * 10, y = end[1] + gy * 10;
    const sb = box(x + gx * 5, y + gy * 5, -gy, gx, 6, 10);
    if (!freeBox(sb) || S.d(x, y) < 6) continue;
    k++;
    addBox(sb);
    B.at(x, S.h(x, y), y, Math.atan2(gx, -gy)); vTorii(B, r, pal);
    const sx = x + gx * 9, sy = y + gy * 9;
    B.at(sx, S.h(sx, sy), sy, Math.atan2(gx, -gy)); vShrine(B, r, pal);
    for (const a of [-5, 5]) { const px = sx + -gy * a, py = sy + gx * a; B.at(px, S.h(px, py), py, r() * TAU); vPine(B, r, 1.1, pal); }
    occ.push([x + gx * 4, y + gy * 4, 9]);
  }
  /* le château, là où un donjon se dressait en 1868 : sur la hauteur la plus en vue, derrière la ville */
  let castleWhy = null, castleAt = null;
  if (lab.castle) {
    let best = null;
    castleWhy = { band: 0, box: 0, slope: 0 };
    for (let k = 0; k < 160; k++) {
      const a = (k / 160) * TAU * 7, rr2 = 60 + (k / 160) * 200;
      const x = mid[0] + Math.cos(a) * rr2, y = mid[1] + Math.sin(a) * rr2, d = S.d(x, y);
      if (d < 55 || d > 150) { castleWhy.band++; continue; }
      const [gx, gy] = grad(x, y);
      const cb = box(x, y, -gy, gx, 31, 27);
      if (!freeBox(cb)) { castleWhy.box++; continue; }
      const hs = [-1, 0, 1].flatMap((a2) => [-1, 0, 1].map((b2) => S.h(x - gy * a2 * 30 + gx * b2 * 26, y + gx * a2 * 30 + gy * b2 * 26)));
      const hmax = Math.max(...hs), hmin = Math.min(...hs);
      if (hmax - hmin > 14 || hmin < 1) { castleWhy.slope++; continue; }
      const score = hmax * 0.5 - (hmax - hmin) * 0.5 - d * 0.05;
      if (!best || score > best.score) best = { x, y, gx, gy, hmax, hmin, score, cb };
    }
    if (best) {
      const { x, y, gx, gy, hmax, hmin, cb } = best;
      addBox(cb);
      /* la façade (la porte) vers la mer : z local = - le gradient */
      B.at(x, hmax + 2, y, Math.atan2(gx, -gy));
      vCastle(B, r, pal, lab.castle[0], !!lab.castle[1], hmin - hmax - 3);
      occ.push([x, y, 40]);
      castleWhy = 'ok';
      castleAt = [x, y];
    }
  }
  /* le temple, au-dessus de la dernière rue, face à la mer */
  const last = streets[streets.length - 1];
  for (let k = 0; k < K.temple; k++) {
    const pl = trace(mid, last.lev + 27, 70);
    const order = pl.map((p, i) => i).sort((a, b) => Math.abs(a - pl.length / 2 + (k ? 18 : 0)) - Math.abs(b - pl.length / 2 + (k ? 18 : 0)));
    for (const i of order) {
      const [x, y] = pl[i];
      const [gx, gy] = grad(x, y);
      const tb = box(x, y, -gy, gx, 12, 12);
      if (!freeBox(tb)) continue;
      const hs = [-9, 9].flatMap((a) => [-8, 8].map((b) => S.h(x + -gy * a + gx * b, y + gx * a + gy * b)));
      if (Math.max(...hs) - Math.min(...hs) > 4) continue;
      addBox(tb);
      B.drop = Math.max(...hs) - Math.min(...hs) + 1.5;
      B.at(x, Math.max(...hs), y, Math.atan2(gx, -gy));
      vTemple(B, r, pal);
      B.drop = 0;
      const gtx = x - gx * 15, gty = y - gy * 15;
      B.at(gtx, S.h(gtx, gty), gty, Math.atan2(gx, -gy)); vGate(B, r, pal);
      for (const [a, b] of [[-11, 4], [11, 3], [-9, -9], [10, -10]]) {
        const px = x + -gy * a + gx * b, py = y + gx * a + gy * b;
        if (S.d(px, py) > 10) { B.at(px, S.h(px, py), py, r() * TAU); vPine(B, r, 1.05, pal); }
      }
      occ.push([x, y, 13]);
      /* l'allée, de la porte à la rue */
      ribbon(straight(gtx, gty, gtx - gx * 22, gty - gy * 22, 6), 2.6, vc('#a89c88'), 0.24);
      break;
    }
  }
  /* la tour de guet du feu (hinomi yagura), au-dessus des toits des bourgs et des villes */
  for (let k = 0; k < K.tower && streets.length > 1; k++) {
    const pl = streets[Math.min(1, streets.length - 1)].pl;
    for (let t = 0; t < 30; t++) {
      const i = Math.floor(pl.length * (0.3 + 0.4 * r()));
      const [x0, y0] = pl[i], [gx, gy] = grad(x0, y0);
      const x = x0 + gx * 7, y = y0 + gy * 7;
      if (!free(x, y, 3)) continue;
      const hs = [S.h(x - 1.5, y - 1.5), S.h(x + 1.5, y + 1.5), S.h(x, y)];
      if (Math.max(...hs) - Math.min(...hs) > 2.5) continue;
      addBox(box(x, y, 1, 0, 2.2, 2.2));
      B.at(x, Math.min(...hs), y, Math.atan2(gx, -gy)); vFireTower(B, r, pal);
      occ.push([x, y, 3]);
      break;
    }
  }
  /* les maisons, de part et d'autre de chaque rue, la façade sur la rue ; sur une pente, la maison
   * se pose au plus haut de son terrain, sur un soubassement de pierre */
  const roofKind = () => { const u = r(); const tile = K.tile * (o.north ? 0.6 : 1), sh = K.shingle * (o.north ? 1.8 : 1); return u < tile ? 'tile' : u < tile + sh ? 'shingle' : 'thatch'; };
  let houses = 0;
  const dense = K.gap[1] < 3;
  const lots = (pl, side) => {
    const L = [0];
    for (let i = 1; i < pl.length; i++) L.push(L[i - 1] + Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]));
    const total = L[L.length - 1];
    const at = (sv) => {
      let i = 1;
      while (i < pl.length - 1 && L[i] < sv) i++;
      const t = clamp((sv - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]), 0, 1);
      const dx = pl[i][0] - pl[i - 1][0], dy = pl[i][1] - pl[i - 1][1], l = Math.hypot(dx, dy) || 1;
      return [lerp(pl[i - 1][0], pl[i][0], t), lerp(pl[i - 1][1], pl[i][1], t), dx / l, dy / l];
    };
    let sv = r() * 4;
    while (sv < total - 3) {
      const kura = r() < K.kura && (side < 0 || r() < 0.3);
      const kind = kura ? 'kura' : roofKind();
      const gapN = K.gap[0] + r() * (K.gap[1] - K.gap[0]);
      /* en ville, les maisons de marchands sont étroites et profondes, serrées le long de la rue */
      const Wd = kura ? 5.5 + r() * 1.5 : kind === 'thatch' ? 10 + r() * 3 : dense && kind === 'tile' ? 6 + r() * 2.5 : 7 + r() * 3.5;
      const Dp = kura ? 4.5 + r() : kind === 'thatch' ? 7 + r() * 1.5 : dense && kind === 'tile' ? 9 + r() * 3 : 6 + r() * 2;
      const [px, py, tx, ty] = at(sv + Wd / 2);
      let nx = -ty, ny = tx;
      const [gx, gy] = grad(px, py);
      if (nx * gx + ny * gy < 0) { nx = -nx; ny = -ny; }
      const off = 2.3 + 0.8 + Dp / 2;
      const cx = px + nx * side * off, cy = py + ny * side * off;
      const hb = box(cx, cy, tx, ty, Wd / 2, Dp / 2);
      let hs = null;
      if (S.d(cx, cy) > 6 && freeBox(hb)) {
        hs = [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 0]].map(([a, b]) => S.h(cx + tx * a * Wd / 2 + nx * b * Dp / 2, cy + ty * a * Wd / 2 + ny * b * Dp / 2));
        if (Math.max(...hs) - Math.min(...hs) > 5 || Math.max(...hs) > 40 || Math.min(...hs) < 0.5) hs = null;
      }
      if (!hs) { sv += 2.5; continue; }
      const hmax = Math.max(...hs), hmin = Math.min(...hs);
      addBox(hb);
      /* la cour de terre battue, du bord de la rue au fond de la maison, et l'écart qui suit */
      {
        const b0 = 2.3, b1 = 2.3 + 0.8 + Dp + 1.2, a0 = -Wd / 2, a1 = Wd / 2 + Math.min(gapN, 3) - 0.05;
        const Q = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map(([a, b]) => { const x = px + tx * a + nx * side * b, y = py + ty * a + ny * side * b; return [x, S.h(x, y) + 0.14, y]; });
        B.at(0, 0, 0, 0);
        B.face(Q, vc(pal.yard, 1, r, 0.08), [px, -100, py]);
      }
      /* la façade vers la rue */
      const fx = -nx * side, fy = -ny * side;
      B.drop = hmax - hmin + 1.2;
      B.at(cx, hmax + 0.05, cy, Math.atan2(-fx, fy));
      if (kura) vKura(B, Wd, Dp, r, pal); else vHouse(B, kind, Wd, Dp, r, pal);
      B.drop = 0;
      occ.push([cx, cy, Math.max(Wd, Dp) / 2 + 0.6]);
      houses++;
      /* le potager, derrière */
      if (r() < K.plots) {
        const qx = cx + nx * side * (Dp / 2 + 2.9), qy = cy + ny * side * (Dp / 2 + 2.9);
        const pb = box(qx, qy, tx, ty, Wd * 0.42, 2.2);
        if (S.d(qx, qy) > 8 && freeBox(pb)) {
          const ph = [-1, 1].map((a) => S.h(qx + tx * a * Wd * 0.42, qy + ty * a * Wd * 0.42)).concat([S.h(qx, qy)]);
          if (Math.max(...ph) - Math.min(...ph) < 1.6) { addBox(pb); B.at(qx, Math.max(...ph), qy, Math.atan2(nx * side, -ny * side)); vPlot(B, Wd * 0.85, 4.2, r, pal); occ.push([qx, qy, 2.4]); }
        }
      }
      /* un arbre au jardin, de temps en temps, derrière la maison */
      if (r() < 0.2) {
        const ax = cx + nx * side * (Dp / 2 + 3), ay = cy + ny * side * (Dp / 2 + 3);
        if (S.d(ax, ay) > 8 && free(ax, ay, 2)) { B.at(ax, S.h(ax, ay), ay, r() * TAU); vGardenTree(B, r, pal); occ.push([ax, ay, 2.5]); }
      }
      sv += Wd + gapN;
    }
  };
  for (let k = 0; k < streets.length; k++) { const { pl } = streets[k]; lots(pl, 1); if (!(k === 0 && K.quay)) lots(pl, -1); }
  /* les barques tirées sur la grève, en rang, l'étrave vers la mer, de part et d'autre du milieu du front */
  const beach = [];
  for (const p of front) { const [gx, gy] = grad(p[0], p[1]); beach.push([p[0] - gx * 13, p[1] - gy * 13, gx, gy]); }
  let boats = 0;
  const bi0 = Math.floor(beach.length / 2);
  const used = new Set();
  for (let k = 0; k < beach.length && boats < K.boats; k++) {
    const i = bi0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2);
    if (i < 0 || i >= beach.length) continue;
    const [x0, y0, gx, gy] = beach[i];
    const [x, y] = onLevel(x0, y0, 3.4 + r() * 1.4);
    if (!free(x, y, 2.4) || S.h(x, y) < 0.15) continue;
    B.at(x, S.h(x, y) + 0.02, y, Math.atan2(-gy, -gx) + (r() - 0.5) * 0.25);
    vBoat(B, r, 7.5 + r() * 2);
    occ.push([x, y, 2.6]);
    used.add(i);
    boats++;
  }
  /* les séchoirs à filets, sur la grève, plus loin que les barques */
  let racks = 0;
  const far = beach.map((_, i) => i).sort((a, b) => Math.abs(b - bi0) - Math.abs(a - bi0));
  for (const i of far) {
    if (racks >= K.racks) break;
    if (used.has(i) || used.has(i - 1) || used.has(i + 1) || used.has(i - 2) || used.has(i + 2)) continue;
    const [x0, y0, gx, gy] = beach[i];
    const [x, y] = onLevel(x0, y0, 7);
    if (!free(x, y, 6) || S.h(x, y) < 0.4) continue;
    const hs = [S.h(x - gy * 5, y + gx * 5), S.h(x + gy * 5, y - gx * 5)];
    if (Math.abs(hs[0] - hs[1]) > 2) continue;
    B.at(x, Math.min(...hs), y, Math.atan2(gx, -gy));
    vRack(B, 10 + r() * 4, r);
    occ.push([x, y, 6]);
    for (let q = i - 3; q <= i + 3; q++) used.add(q);
    racks++;
  }
  /* les pins du rivage, entre la rue et la grève */
  for (let i = 3; i < front.length - 3; i += 5 + Math.floor(r() * 6)) {
    const [x0, y0] = front[i], [gx, gy] = grad(x0, y0);
    const x = x0 - gx * (7 + r() * 3), y = y0 - gy * (7 + r() * 3);
    if (!free(x, y, 2.5) || S.d(x, y) < 5) continue;
    B.at(x, S.h(x, y), y, r() * TAU); vPine(B, r, 0.8 + r() * 0.35, pal);
    occ.push([x, y, 2.5]);
  }
  /* les jetées, au large du milieu */
  for (let k = 0; k < K.piers; k++) {
    const i = clamp(Math.floor(front.length * (0.35 + 0.3 * (K.piers > 1 ? k / (K.piers - 1) : 0.5))), 0, front.length - 1);
    const [x0, y0] = front[i], [gx, gy] = grad(x0, y0);
    const [sx, sy] = onLevel(x0 - gx * 14, y0 - gy * 14, 4);
    if (!free(sx - gx * 20, sy - gy * 20, 6)) continue;
    B.at(sx, 0, sy, Math.atan2(-gy, -gx));
    vPier(B, 34 + r() * 14, r);
    occ.push([sx - gx * 20, sy - gy * 20, 6]);
  }
  /* les rizières, derrière le village : un damier aligné sur le rivage ; sur la pente, en terrasses,
   * chacune à plat sur sa levée de terre. En Ezo, où l'on ne cultivait guère le riz, des champs secs,
   * moins nombreux : la terre brune et ses rangs de légumes et de millet */
  const fx0 = mid[0] + mgx * (last.lev - 18 + 30), fy0 = mid[1] + mgy * (last.lev - 18 + 30);
  const tx = -mgy, ty = mgx;
  let fields = 0;
  const cw = 13, ch = 9.5, dyke = vc(pal.dyke);
  const nFields = o.ezo ? Math.round(K.fields * 0.4) : K.fields;
  const soil = vc(pal.snow ? '#e4e8ea' : '#8c7552'), crop = vc(pal.snow ? '#d6dbde' : '#5f8a40');
  for (let j = 0; j < 12 && fields < nFields; j++) for (let i = -12; i <= 12 && fields < nFields; i++) {
    const cx = fx0 + tx * i * cw + mgx * j * ch, cy = fy0 + ty * i * cw + mgy * j * ch;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + tx * a * (cw / 2 - 0.7) + mgx * b * (ch / 2 - 0.6), cy + ty * a * (cw / 2 - 0.7) + mgy * b * (ch / 2 - 0.6)]);
    const hs = corners.map(([x, y]) => S.h(x, y));
    const hmax = Math.max(...hs), hmin = Math.min(...hs);
    if (hmax - hmin > 4.5 || hmax > 32) continue;
    if (corners.some(([x, y]) => S.d(x, y) < last.lev + 8)) continue;
    const fb = box(cx, cy, tx, ty, cw / 2 - 0.4, ch / 2 - 0.3);
    if (!freeBox(fb)) continue;
    addBox(fb);
    const top = hmax + 0.28;
    const c = o.ezo ? vc('#000000').copy(soil).multiplyScalar(0.92 + r() * 0.16) : vc(pal.paddy[Math.floor(r() * pal.paddy.length)], 1, r, 0.1);
    B.at(0, 0, 0, 0);
    B.face(corners.map(([x, y]) => [x, top, y]), c, [cx, -100, cy]);
    /* en Ezo, les rangs du champ sec */
    if (o.ezo && !pal.snow) {
      for (let q = -ch / 2 + 1.4; q < ch / 2 - 1; q += 1.6) {
        const P4 = [[-1, q], [1, q], [1, q + 0.7], [-1, q + 0.7]].map(([a, b]) => [cx + tx * a * (cw / 2 - 1.2) + mgx * b, top + 0.06, cy + ty * a * (cw / 2 - 1.2) + mgy * b]);
        B.face(P4, crop, [cx, -100, cy]);
      }
    }
    /* la levée, là où la terrasse domine la pente */
    if (hmax - hmin > 0.6) {
      for (let q = 0; q < 4; q++) {
        const [ax, ay] = corners[q], [bx, by] = corners[(q + 1) % 4];
        if (Math.min(hs[q], hs[(q + 1) % 4]) > top - 0.6) continue;
        B.face([[ax, top, ay], [bx, top, by], [bx, hmin - 0.8, by], [ax, hmin - 0.8, ay]], dyke, [cx, top - 1, cy]);
      }
    }
    occ.push([cx, cy, 6.5]);
    fields++;
  }
  if (!B.count()) return null;
  const mesh = new THREE.Mesh(B.geometry(), VMAT());
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.occ = occ;
  mesh.userData.houses = houses;
  mesh.userData.castleAt = castleAt;
  mesh.userData.stats = { streets: streets.map((q) => q.pl.length), boats, fields, racks, castle: castleWhy };
  return mesh;
}

/* la matière des villages : des couleurs aux sommets, mates */
let _vmat = null;
const VMAT = () => _vmat || (_vmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 }));

/* ---------- les forts : un polygone de pierre en talus, un rempart de terre gazonné, des embrasures ---------- */

/* pts : le tracé (points locaux [x, z], x vers la mer), H : la hauteur du mur ; sea : les faces qui
 * regardent la mer portent le rempart, percé d'une embrasure devant chaque pièce (guns : [x, z]) */
function vFort(B, pts, H, guns, pal, r, opts) {
  const o = Object.assign({ rampart: 2.4, width: 7, batter: 3.2 }, opts);
  const n = pts.length;
  let cx = 0, cz = 0;
  for (const [x, z] of pts) { cx += x / n; cz += z / n; }
  const stone = vc('#8f8a80', 1, r, 0.06), stoneD = vc('#76726a', 1, r, 0.06), coping = vc('#a39e94', 1, r);
  const earth = vc(pal.snow ? '#e8ecee' : '#97865f', 1, r, 0.05), grass = vc(pal.snow ? '#eef1f3' : '#6f8f4e', 1, r, 0.08), slope = vc(pal.snow ? '#dfe3e6' : '#7d8a52', 1, r, 0.08);
  const C = [cx, H * 0.5, cz];
  const out = (i) => {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n];
    let nx = bz - az, nz = -(bx - ax);
    const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    if (nx * ((ax + bx) / 2 - cx) + nz * ((az + bz) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    return [nx, nz];
  };
  /* les murs en talus, et leur couronnement */
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n], [nx, nz] = out(i);
    const [px, pz] = out((i + n - 1) % n), [qx, qz] = out((i + 1) % n);
    /* au pied, le mur s'écarte (le talus) ; aux angles, on suit la bissectrice */
    const fa = [ax + (nx + px) * o.batter * 0.5, az + (nz + pz) * o.batter * 0.5], fb = [bx + (nx + qx) * o.batter * 0.5, bz + (nz + qz) * o.batter * 0.5];
    B.face([[fa[0], -3.5, fa[1]], [fb[0], -3.5, fb[1]], [bx, H, bz], [ax, H, az]], i % 2 ? stone : stoneD, C);
    B.face([[ax, H, az], [bx, H, bz], [bx - nx * 1.2, H + 0.35, bz - nz * 1.2], [ax - nx * 1.2, H + 0.35, az - nz * 1.2]], coping, [cx, -50, cz]);
  }
  /* le terre-plein */
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n], [nx, nz] = out(i);
    B.face([[cx, H + 0.3, cz], [ax - nx * 1.2, H + 0.3, az - nz * 1.2], [bx - nx * 1.2, H + 0.3, bz - nz * 1.2]], earth, [cx, -50, cz]);
  }
  /* le rempart des faces de mer, coupé d'une embrasure devant chaque pièce */
  for (let i = 0; i < n; i++) {
    const [nx, nz] = out(i);
    if (o.ramparts ? !o.ramparts[i] : nx < 0.25) continue;
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n];
    const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
    /* les coupures : la projection de chaque pièce sur la face */
    const cuts = guns.map(([gx, gz]) => ({ t: (gx - ax) * tx + (gz - az) * tz, d: (gx - ax) * nx + (gz - az) * nz })).filter((g) => g.t > 0 && g.t < L && g.d > -12 && g.d < 2).map((g) => g.t).sort((a, b) => a - b);
    const segs = [];
    let t0 = 1.5;
    const ew = o.embrasure || 2.6;
    for (const t of cuts) { if (t - ew > t0) segs.push([t0, t - ew]); t0 = t + ew; }
    if (L - 1.5 > t0) segs.push([t0, L - 1.5]);
    const h1 = H + 0.3, h2 = H + o.rampart, w = o.width;
    for (const [s0, s1] of segs) {
      const P = (t, dIn, y) => [ax + tx * t - nx * dIn, y, az + tz * t - nz * dIn];
      /* face extérieure, sommet gazonné, talus intérieur, et les deux bouts */
      B.face([P(s0, 1.2, h1), P(s1, 1.2, h1), P(s1, 2.4, h2), P(s0, 2.4, h2)], grass, [cx, h1, cz]);
      B.face([P(s0, 2.4, h2), P(s1, 2.4, h2), P(s1, w - 2.2, h2), P(s0, w - 2.2, h2)], grass, [cx, -50, cz]);
      B.face([P(s0, w - 2.2, h2), P(s1, w - 2.2, h2), P(s1, w, h1), P(s0, w, h1)], slope, [ax + tx * (s0 + s1) / 2 - nx * 2, h1, az + tz * (s0 + s1) / 2 - nz * 2]);
      for (const [sA, sB] of [[s0, s0 + 0.01], [s1, s1 - 0.01]]) {
        B.face([P(sA, 1.2, h1), P(sA, 2.4, h2), P(sA, w - 2.2, h2), P(sA, w, h1)], slope, P(sB + (sB > sA ? 2 : -2), w / 2, h1));
      }
    }
  }
}

/* la plateforme de bois sous une pièce, dans son embrasure (k : sa taille) */
function vGunDeck(B, r, k) {
  k = k || 1;
  B.box(-3.2 * k, 0, -2.6 * k, 3.2 * k, 0.35, 2.6 * k, vc('#6a5440', 1, r));
  for (let x = -2.6 * k; x <= 2.7 * k; x += 1.3 * k) B.face([[x, 0.36, -2.6 * k], [x + 0.08 * k, 0.36, -2.6 * k], [x + 0.08 * k, 0.36, 2.6 * k], [x, 0.36, 2.6 * k]], vc('#4a3a2c'), [0, -5, 0]);
}

/* une pile de boulets, en pyramide */
function vShotPile(B, s) {
  const c = vc('#3b3b3e'), d = vc('#2a2a2c'), h = s * 0.75;
  const P = [[-s, 0, -s], [s, 0, -s], [s, 0, s], [-s, 0, s]], top = [0, h, 0];
  for (let i = 0; i < 4; i++) B.face([P[i], P[(i + 1) % 4], top], i % 2 ? c : d, [0, -2, 0]);
}

/* une allée de gravier, posée à plat (points locaux [x, z], hauteur y) */
function vPath(B, a, b, w, y, col) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
  B.face([[a[0] + nx, y, a[1] + nz], [b[0] + nx, y, b[1] + nz], [b[0] - nx, y, b[1] - nz], [a[0] - nx, y, a[1] - nz]], col, [a[0], y - 5, a[1]]);
}

/* une poudrière : murs de pierre épais, lourd toit de tuiles */
function vMagazine(B, W, D, r, pal) {
  B.box(-W / 2, -2, -D / 2, W / 2, 3.4, D / 2, vc('#8a857b', 1, r), false);
  for (const s of [-1, 1]) B.face([[s * W / 2, 3.4, -D / 2], [s * W / 2, 3.4, D / 2], [s * W / 2, 5.0, 0]], vc('#8a857b', 1, r), [0, 3, 0]);
  B.face([[-0.7, 0, D / 2 + 0.05], [0.7, 0, D / 2 + 0.05], [0.7, 2.2, D / 2 + 0.05], [-0.7, 2.2, D / 2 + 0.05]], vc('#2c2c2e'), [0, 1, 0]);
  vGable(B, W, D, 3.4, 1.6, 0.4, 0.6, vc(pal.tile, 0.95, r), vc(pal.tileR, 1, r), 0.5);
}
