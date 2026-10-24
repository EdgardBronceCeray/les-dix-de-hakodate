'use strict';

/* Outils communs : mathématiques, unités, hasard réglé, clavier.
 * Toutes les grandeurs physiques du jeu sont en unités réelles :
 * mètres, secondes, kilogrammes. L'écran est en mètres à l'échelle du zoom. */

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const KN = 0.514444;            // un nœud, en m/s

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const sgn = (v) => (v < 0 ? -1 : 1);

/* angle ramené dans ]-π, π] */
function wrapA(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/* cap marin (0 = nord, 90 = est) depuis un angle écran (0 = est, sens horaire) */
const toBearing = (a) => ((a / DEG + 90) % 360 + 360) % 360;
const fromBearing = (b) => (b - 90) * DEG;

const ROSE = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
const roseName = (b) => ROSE[Math.round(((b % 360) + 360) % 360 / 22.5) % 16];

/* hasard réglé, pour qu'un niveau se rejoue à l'identique */
function makeRng(seed) {
  let s = seed >>> 0;
  const r = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + (b - a) * r();
  r.sym = (a) => (r() * 2 - 1) * a;
  r.pick = (arr) => arr[(r() * arr.length) | 0];
  r.gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };
  return r;
}
let RNG = makeRng(1868);
const rnd = (a = 1, b = 0) => b + (a - b) * RNG();
const rndSym = (a) => RNG.sym(a);
const gauss = () => RNG.gauss();

/* bruit de valeur 2D, lisse, pour les vagues, la terre et les grains */
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smooth(xf), v = smooth(yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f) * a; n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}

/* point dans un polygone donné à plat [x0,y0,x1,y1,...] */
function inPoly(px, py, f) {
  let inside = false;
  const n = f.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
    const xi = f[i], yi = f[i + 1], xj = f[j], yj = f[j + 1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* ---------- clavier ---------- */

const keys = new Set();
const pressed = new Set();       // touches enfoncées depuis la dernière image
function keyName(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  return k === ' ' ? 'space' : k;
}
window.addEventListener('keydown', (e) => {
  const k = keyName(e);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'space', 'Tab'].includes(k)) e.preventDefault();
  if (!keys.has(k)) pressed.add(k);
  keys.add(k);
  if (e.shiftKey) keys.add('Shift');
});
window.addEventListener('keyup', (e) => {
  keys.delete(keyName(e));
  if (!e.shiftKey) keys.delete('Shift');
});
window.addEventListener('blur', () => keys.clear());
const hit = (...names) => names.some((n) => pressed.has(n));
const held = (...names) => names.some((n) => keys.has(n));

function endFrameInput() {
  pressed.clear();
}

/* ---------- caméra ---------- */

const cam = { x: 0, y: 0, zoom: 0.8, tz: 0.8, w: 1, h: 1, dpr: 1 };
const sx = (x) => (x - cam.x) * cam.zoom + cam.w / 2;
const sy = (y) => (y - cam.y) * cam.zoom + cam.h / 2;
const wxOf = (px) => (px - cam.w / 2) / cam.zoom + cam.x;
const wyOf = (py) => (py - cam.h / 2) / cam.zoom + cam.y;

/* formatage */
const fmt1 = (v) => v.toFixed(1).replace('.', ',');
const fmt0 = (v) => Math.round(v).toLocaleString('fr-FR');
const knots = (ms) => ms / KN;
