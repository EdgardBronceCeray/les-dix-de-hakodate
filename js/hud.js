'use strict';

/* L'interface en jeu : plaques de bois et d'or,
 * jauges brillantes, mini-carte ronde, flèches vers l'objectif, chiffres qui
 * flottent, noms des lieux, neige et pluie. */

const el = (id) => document.getElementById(id);
const HUD = { cache: {}, precip: [], mini: null, bannerT: 0, pulse: null };

const ICONS = {
  hull: '<svg viewBox="0 0 24 24"><path d="M2 13h20l-3 6H5z" fill="currentColor"/><path d="M11 3v9M11 4l6 7h-6" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
  eng: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>',
  voilure: '<svg viewBox="0 0 24 24"><path d="M7 2v20" stroke="currentColor" stroke-width="2"/><path d="M9 3c7 3 7 10 0 14z" fill="currentColor"/></svg>',
  coque: '<svg viewBox="0 0 24 24"><path d="M3 11h18l-3 7H6z" fill="currentColor"/><path d="M12 3v7M8 7h8" stroke="currentColor" stroke-width="2"/></svg>',
  canons: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="14" height="5" rx="2" fill="currentColor"/><circle cx="7" cy="16" r="3.4" fill="currentColor"/><circle cx="20" cy="11.5" r="2" fill="currentColor"/></svg>',
  crate: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1.5" fill="currentColor"/><path d="M3 4l18 16M3 12h18" stroke="rgba(0,0,0,.45)" stroke-width="1.6"/></svg>',
  auto: '<svg viewBox="0 0 24 24"><path d="M7 3h10c1.6 3 1.6 15 0 18H7C5.4 18 5.4 6 7 3z" fill="currentColor"/><path d="M5.8 8h12.4M5.8 16h12.4" stroke="rgba(0,0,0,.5)" stroke-width="1.6"/></svg>',
  fleet: '<svg viewBox="0 0 24 24"><path d="M1 12h10l-2 3.5H3z M13 16h10l-2 3.5h-6z" fill="currentColor"/><path d="M6 4v7.5M6 5l4 5H6 M18 8v7.5M18 9l4 5h-4" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
};

function buildHud() {
  el('h-ico-hull').innerHTML = ICONS.hull;
  el('h-ico-eng').innerHTML = ICONS.eng;
  el('h-ico-auto').innerHTML = ICONS.auto;
  el('h-ico-fleet').innerHTML = ICONS.fleet;
  const box = el('h-ups');
  box.innerHTML = '';
  for (const k of Object.keys(PRISES)) {
    const d = document.createElement('div');
    d.className = 'up';
    d.id = 'up-' + k;
    d.style.setProperty('--c', PRISES[k].color);
    let pips = '';
    for (let i = 0; i < MAX_UP; i++) pips += `<i class="${i >= 5 ? 'hi' : ''}"></i>`;
    d.innerHTML = `<span class="ico">${ICONS[k]}</span><span class="lbl" data-up="${k}">${tx(PRISES[k].label)}</span><span class="pips">${pips}</span>`;
    box.appendChild(d);
  }
}

function setText(id, v) { if (HUD.cache[id] === v) return; HUD.cache[id] = v; el(id).textContent = v; }
function setHtml(id, v) { if (HUD.cache[id] === v) return; HUD.cache[id] = v; el(id).innerHTML = v; }
function setStyle(id, prop, v) { const k = id + prop; if (HUD.cache[k] === v) return; HUD.cache[k] = v; el(id).style[prop] = v; }

/* les plaques du HUD : où elles sont à l'écran, et si quelque chose passe dessous */
const HUD_PLAQUES = ['h-mission', 'h-scorebox', 'h-ship', 'h-map'];
function hudRects() {
  if (!HUD.rects || HUD.rectsT !== G.hudFrame) {
    HUD.rects = HUD_PLAQUES.map((id) => { const n = el(id); if (!n || n.classList.contains('hidden') || el('hud').classList.contains('hidden')) return null; const r = n.getBoundingClientRect(); return r.width ? [r.left, r.top, r.right, r.bottom, id] : null; }).filter(Boolean);
    HUD.rectsT = G.hudFrame;
  }
  /* HUD encore caché (début de partie) : ses emplacements habituels */
  if (!HUD.rects.length) return [[0, 0, 340, 140, ''], [cam.pw - 230, 0, cam.pw, 130, ''], [0, cam.ph - 230, 370, cam.ph, '']];
  return HUD.rects;
}
function hudCovers(px, py, m) {
  m = m || 0;
  return hudRects().some(([l, t, r, b]) => px > l - m && px < r + m && py > t - m && py < b + m);
}

function showHud(on) { el('hud').classList.toggle('hidden', !on); if (on) HUD.cache = {}; }

function updateHud() {
  if (!G.me || el('hud').classList.contains('hidden')) return;
  const me = G.me, story = G.game === 'story';
  const cors = !story && G.arc && G.arc.variant === 'corsaire' && G.cors;
  let lvlL, lvlV, goal, got = 0, need = 0, showCrates = false;
  if (cors) corsHud();
  else if (story) {
    const st = G.stage, S = G.st, g = st.goal;
    lvlL = T('hud.stage', G.stageIdx + 1, STAGES.length);
    lvlV = tx(st.title);
    goal = S.calm ? T('st.calm') : storyGoalLine();
    if (g.type === 'collect' && !S.exitOpen) { got = S.got; need = S.need; showCrates = true; }
    setText('h-score-l2', T('hud.time'));
    setText('h-best', Math.floor(S.t / 60) + ':' + String(Math.floor(S.t % 60)).padStart(2, '0'));
  } else if (G.arc) {
    const A = G.arc;
    lvlL = T('hud.level'); lvlV = String(A.level);
    goal = A.state === 'clear' ? T('arc.saved') : T('hud.arcgoal');
    got = A.got; need = A.need; showCrates = true;
    setText('h-score-l2', T('hud.record'));
    setText('h-best', fmt0(Math.max(G.best || 0, G.score)));
  }
  if (!cors) {
    setText('h-level-l', lvlL || '');
    setText('h-level', lvlV || '');
    setText('h-goal', goal || '');
    if (showCrates) {
      let s = '';
      for (let i = 0; i < need; i++) s += `<i class="${i < got ? 'on' : ''}">${ICONS.crate}</i>`;
      setHtml('h-crates', s);
    } else setHtml('h-crates', '');
    setText('h-score-l', T('score'));
    setText('h-score', fmt0(G.score || 0));
    el('h-auto-row').classList.add('hidden');
    el('h-fleet-row').classList.add('hidden');
  }
  el('h-level').classList.toggle('long', story);
  /* le corsaire : son nom, et ce que le chantier en a fait (coque de noix, brick, frégate...) */
  el('h-ups').classList.toggle('hidden', !!cors);
  setText('h-ship-name', shipName(me.spec));
  setText('h-ship-jp', me.spec.custom ? tx(me.spec.kind) : LANG === 'ja' ? me.spec.name : me.spec.jp);
  const hf = clamp(me.hull / me.hullMax, 0, 1);
  setStyle('h-hull', 'width', (hf * 100).toFixed(1) + '%');
  setStyle('h-hull', 'filter', hf > 0.5 ? 'none' : hf > 0.25 ? 'hue-rotate(-40deg) saturate(1.4)' : 'hue-rotate(-95deg) saturate(1.8)');
  setText('h-hull-n', Math.round(me.hull) + ' / ' + Math.round(me.hullMax));
  el('h-ship').classList.toggle('danger', hf < 0.25);
  const t = me.throttle;
  setText('h-thr-n', me.anchored ? T('hud.moored') : T(t < -0.05 ? 'thr.back' : t < 0.08 ? 'thr.stop' : t < 0.4 ? 'thr.slow' : t < 0.75 ? 'thr.half' : 'thr.full'));
  setStyle('h-thr', 'left', ((t + 0.3) / 1.3 * 100).toFixed(1) + '%');
  /* le Kaiten de 1869 ne marche plus à la voile : sa caisse verte, c'est sa machine */
  const shipKey = me.spec.id + LANG;
  if (HUD.upShip !== shipKey) {
    HUD.upShip = shipKey;
    for (const k of Object.keys(PRISES)) {
      const n = el('up-' + k);
      n.querySelector('.lbl').textContent = tx(priseText(k, me.spec, 'label'));
      n.querySelector('.ico').innerHTML = k === 'voilure' && me.spec.look.noSail ? ICONS.eng : ICONS[k];
    }
  }
  if (!cors) for (const k of Object.keys(PRISES)) {
    const pips = el('up-' + k).querySelector('.pips').children;
    for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('on', i < me.up[k]);
  }
  if (HUD.pulse) {
    const n = el('up-' + HUD.pulse), cls = HUD.pulseBad ? 'flash-bad' : 'flash';
    n.classList.remove('flash', 'flash-bad'); void n.offsetWidth; n.classList.add(cls);
    HUD.pulse = null; HUD.pulseBad = false;
  }
  /* le navire passe sous une plaque : elle s'efface pour le laisser voir */
  G.hudFrame = (G.hudFrame || 0) + 1;
  const [mpx, mpy] = toScreen(me.x, me.y, 0);
  for (const [l, t, r, b, id] of hudRects()) if (id) el(id).classList.toggle('dim', mpx > l - 70 && mpx < r + 70 && mpy > t - 50 && mpy < b + 50);
  const ff = story && (G.stage.falseFlag || G.stage.flag);
  el('h-flag').classList.toggle('hidden', !ff);
  if (ff) setText('h-flag', me.flag === 'us' ? T('hud.flag.us') : me.flag === 'ru' ? T('hud.flag.ru') : T('hud.flag.jp'));
}

/* ---------- annonces ---------- */

/* un titre doré peint une fois dans un canevas : bien plus léger qu'un effet CSS */
const GOLD_FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Noto Serif JP", "MS PMincho", serif';

/* le titre en lettres d'or, en plusieurs morceaux de tailles différentes sur une même ligne :
 * parts = [[texte, échelle], ...], comme « LES DIX de HAKODATE » sur la couverture */
function paintTitle(cv, parts, size, spacing) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = cv.getContext('2d');
  const fontOf = (k) => `700 ${Math.round(size * k)}px ${GOLD_FONT}`;
  const gap = size * 0.22;
  let w = 0;
  const ws = parts.map(([t, k]) => { c.font = fontOf(k); if ('letterSpacing' in c) c.letterSpacing = (spacing * k) + 'px'; const m = c.measureText(t).width; w += m; return m; });
  w += gap * (parts.length - 1);
  const pad = Math.ceil(size * 0.25);
  const W_ = Math.ceil(w) + pad * 2, H_ = Math.ceil(size * 1.08) + pad;
  cv.width = W_ * dpr; cv.height = H_ * dpr;
  cv.style.width = W_ + 'px'; cv.style.height = H_ + 'px';
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const y = pad * 0.45 + size * 0.88;
  let x = pad;
  parts.forEach(([t, k], i) => {
    c.font = fontOf(k);
    if ('letterSpacing' in c) c.letterSpacing = (spacing * k) + 'px';
    const g = c.createLinearGradient(0, y - size * k * 0.85, 0, y + size * 0.1);
    g.addColorStop(0, '#fff1c4'); g.addColorStop(0.42, '#f5cf74'); g.addColorStop(0.7, '#c38a2c'); g.addColorStop(1, '#f0cd7c');
    c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = size * 0.14; c.shadowOffsetY = size * 0.05;
    c.fillStyle = g; c.fillText(t, x, y);
    c.shadowColor = 'transparent';
    c.lineWidth = Math.max(1, size * k / 60); c.strokeStyle = 'rgba(80,44,8,0.45)';
    c.strokeText(t, x, y);
    x += ws[i] + gap;
  });
}

function paintGold(cv, text, size, spacing) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = cv.getContext('2d');
  const font = `700 ${size}px ${GOLD_FONT}`;
  c.font = font;
  if ('letterSpacing' in c) c.letterSpacing = (spacing || 0) + 'px';
  const pad = Math.ceil(size * 0.25);
  const w = Math.ceil(c.measureText(text).width) + pad * 2, h = Math.ceil(size * 1.05) + pad;
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.font = font;
  if ('letterSpacing' in c) c.letterSpacing = (spacing || 0) + 'px';
  const y = pad * 0.45 + size * 0.86;
  const g = c.createLinearGradient(0, y - size * 0.85, 0, y + size * 0.1);
  g.addColorStop(0, '#fff1c4'); g.addColorStop(0.42, '#f5cf74'); g.addColorStop(0.7, '#c38a2c'); g.addColorStop(1, '#f0cd7c');
  c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = size * 0.14; c.shadowOffsetY = size * 0.05;
  c.fillStyle = g;
  c.fillText(text, pad, y);
  c.shadowColor = 'transparent';
  c.lineWidth = Math.max(1, size / 60); c.strokeStyle = 'rgba(80,44,8,0.45)';
  c.strokeText(text, pad, y);
}

function banner(title, sub, life) {
  const b = el('banner');
  paintGold(el('banner-t'), title, Math.round(clamp(window.innerWidth * 0.034, 28, 50)), 2);
  el('banner-s').textContent = sub || '';
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  HUD.bannerT = life || 2.6;
}
function tickBanner(dt) {
  if (HUD.bannerT > 0) { HUD.bannerT -= dt; if (HUD.bannerT <= 0) el('banner').classList.remove('show'); }
  if (G.mode === 'play') tickOrders(dt);
}

function floatText(x, y, text, kind) {
  if (!G.floats) G.floats = [];
  /* deux annonces au même endroit : la seconde s'écrit au-dessus */
  for (const f of G.floats) if (f.age < 0.8 && Math.abs(f.x - x) < 90 && Math.abs(f.y - y) < 26) y = f.y - 26;
  G.floats.push({ x, y, text, kind, age: 0, life: 1.6 });
  if (G.floats.length > 24) G.floats.shift();
}

/* ---------- le cyclone : la rose du vent autour du navire ---------- */

function drawCape(c) {
  const me = G.me;
  const [sx, sy] = toScreen(me.x, me.y, 0);
  const R = clamp(me.len * (cam.pw / (cam.vw || cam.w)) * 0.95, 70, 170);
  /* sur l'écran, x vers l'est et y vers le sud, comme sur la carte */
  const from = fromBearing(SEA.wind);
  const good = capeAngle() < 0.9;
  c.save();
  c.translate(sx, sy);
  /* le secteur où l'étrave doit rester : face au vent, à 50 degrés près */
  c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, from - 0.9, from + 0.9); c.closePath();
  c.fillStyle = good ? 'rgba(120,220,140,0.16)' : 'rgba(120,220,140,0.1)'; c.fill();
  c.lineWidth = 2; c.strokeStyle = 'rgba(150,235,160,0.55)';
  c.beginPath(); c.arc(0, 0, R, from - 0.9, from + 0.9); c.stroke();
  /* le travers, en rouge */
  for (const s_ of [1, -1]) { c.beginPath(); c.arc(0, 0, R, from + s_ * 1.05, from + s_ * 2.25, s_ < 0); c.strokeStyle = 'rgba(255,120,100,0.4)'; c.stroke(); }
  /* la flèche du vent, qui vient du large vers le navire */
  const ax = Math.cos(from) * (R + 34), ay = Math.sin(from) * (R + 34);
  c.translate(ax, ay); c.rotate(from + Math.PI);
  c.fillStyle = 'rgba(235,242,250,0.9)';
  c.beginPath(); c.moveTo(16, 0); c.lineTo(-10, -11); c.lineTo(-4, 0); c.lineTo(-10, 11); c.closePath(); c.fill();
  c.rotate(-(from + Math.PI));
  c.font = 'italic 600 13px "Palatino Linotype", Georgia, serif'; c.textAlign = 'center';
  c.lineWidth = 3; c.strokeStyle = 'rgba(8,12,18,0.7)'; c.strokeText(T('hud.wind'), 0, -16);
  c.fillText(T('hud.wind'), 0, -16);
  c.restore();
  /* l'étrave */
  const hx = sx + Math.cos(me.h) * R * 0.92, hy = sy + Math.sin(me.h) * R * 0.92;
  c.fillStyle = good ? 'rgba(150,240,160,0.95)' : 'rgba(255,140,110,0.95)';
  c.beginPath(); c.arc(hx, hy, 5, 0, TAU); c.fill();
}

/* ---------- la brume ---------- */

function drawMist(c, m, dt) {
  const W_ = cam.pw, H_ = cam.ph, night = R3.ambName === 'nuit';
  const col = night ? [70, 80, 96] : [214, 220, 226];
  const rgba = (a) => `rgba(${col[0]},${col[1]},${col[2]},${clamp(a, 0, 1)})`;
  HUD.mistT = (HUD.mistT || 0) + dt;
  const core = clamp(m, 0, 1);
  /* un voile général, plus léger au centre où se tient le navire */
  const [sx, sy] = G.me ? toScreen(G.me.x, G.me.y, 0) : [W_ / 2, H_ / 2];
  const g = c.createRadialGradient(sx, sy, Math.min(W_, H_) * 0.08, sx, sy, Math.max(W_, H_) * 0.75);
  g.addColorStop(0, rgba(core * core * 0.55 + Math.max(0, m - 1) * 3));
  g.addColorStop(1, rgba(core * 0.92 + Math.max(0, m - 1) * 3));
  c.fillStyle = g; c.fillRect(0, 0, W_, H_);
  /* des bancs de brume qui passent */
  const t = HUD.mistT;
  for (let i = 0; i < 9; i++) {
    const ph = i * 1.7;
    const x = ((Math.sin(ph) * 0.5 + 0.5) * W_ * 1.4 + t * (14 + i * 3)) % (W_ * 1.4) - W_ * 0.2;
    const y = (Math.cos(ph * 1.3) * 0.5 + 0.5) * H_;
    const r = Math.max(W_, H_) * (0.18 + (i % 3) * 0.07);
    const gg = c.createRadialGradient(x, y, 0, x, y, r);
    gg.addColorStop(0, rgba(core * 0.42)); gg.addColorStop(1, rgba(0));
    c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (m > 0.35 && !G.lost) {
    c.font = 'italic 21px "Palatino Linotype", Georgia, serif'; c.textAlign = 'center';
    c.fillStyle = night ? `rgba(230,236,244,${clamp((m - 0.35) * 2, 0, 0.9)})` : `rgba(30,40,50,${clamp((m - 0.35) * 2, 0, 0.85)})`;
    c.fillText(T('mist.warn'), W_ / 2, H_ * 0.7);
  }
}

/* ---------- le calque 2D par-dessus la 3D ---------- */

function drawOverlay(dt) {
  const c = R3.oc, dpr = cam.dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, cam.pw, cam.ph);
  const playing = G.mode === 'play' || G.mode === 'pause' || G.mode === 'over';
  if (G.world && G.game !== 'demo' && !YARD.open) drawLabels(c);
  drawPrecip(c, dt);
  if (!playing) return;
  /* brume au bord du monde : des bancs qui dérivent, de plus en plus serrés ; le navire reste
   * lisible au centre tant qu'on n'est pas égaré */
  if (G.mist > 0.01) drawMist(c, G.mist, dt);
  /* l'éclair blanchit tout un instant */
  if (G.lightning > 0) {
    c.fillStyle = `rgba(235,240,255,${G.lightning * 0.55})`;
    c.fillRect(0, 0, cam.pw, cam.ph);
    G.lightning = Math.max(0, G.lightning - dt * 4);
  }
  /* chiffres et mots qui flottent */
  c.textAlign = 'center';
  for (let i = G.floats.length - 1; i >= 0; i--) {
    const f = G.floats[i];
    f.age += dt;
    if (f.age > f.life) { G.floats.splice(i, 1); continue; }
    const [px, py0] = toScreen(f.x, f.y, 30);
    const py = py0 - f.age * 34;
    const a = Math.min(1, (1 - f.age / f.life) * 2.5) * Math.min(1, f.age * 8);
    c.font = (f.kind === 'gold' ? '700 17px' : '600 16px') + ' "Palatino Linotype", "Book Antiqua", Georgia, serif';
    c.lineWidth = 4; c.strokeStyle = `rgba(8,12,18,${a * 0.75})`;
    c.strokeText(f.text, px, py);
    c.fillStyle = f.kind === 'bad' ? `rgba(255,140,110,${a})` : f.kind === 'gold' ? `rgba(255,222,140,${a})` : `rgba(240,240,232,${a})`;
    c.fillText(f.text, px, py);
  }
  if (G.game === 'story' && G.st) {
    /* les cercles du mode histoire portent leur nom : bord à bord, abordage, la plage... */
    drawZoneTags(c);
    /* le Kōtetsu met en joue : la ligne de visée, qui clignote avant le coup */
    if (G.st.aim) drawAim(c, G.st.aim);
    /* la jauge du moment (charbon, abordage, évacuation), au-dessus du navire */
    if (G.st.bar && G.me && !G.me.sinking) drawBar(c, G.st.bar);
  }
  /* le corsaire : batteries et navires de l'ordinateur à l'écran, l'abri de Hakodate */
  if (G.game === 'arcade' && G.arc && G.arc.variant === 'corsaire') { drawZoneTags(c); corsaireDraw(c); }
  /* le calmar géant qui tient le navire, Akkorokamui : ce qu'il leur reste */
  if (G.game === 'arcade') beastsDraw(c);
  /* la gîte : la jauge sous le navire quand on vire trop court */
  if (G.game === 'arcade') drawGite(c);
  /* le cyclone : d'où vient le vent, et le secteur où l'étrave doit rester */
  if (G.game === 'story' && G.stage.goal.cape && G.st.phase === 'go' && !G.st.calm && G.me && !G.me.sinking) drawCape(c);
  drawPointers(c);
  drawMini();
}

const BAR_COLS = { red: ['#ff9a7a', '#b02a1a'], coal: ['#9aa0aa', '#2a2e36'], gold: ['#ffe2a0', '#b07a2a'] };
function drawBar(c, b) {
  const [px, py] = toScreen(G.me.x, G.me.y, 60);
  const f = clamp(b.f, 0, 1), cols = BAR_COLS[b.kind] || BAR_COLS.gold;
  c.fillStyle = 'rgba(16,20,26,0.82)'; roundRect(c, px - 90, py - 62, 180, 20, 10); c.fill();
  const g = c.createLinearGradient(0, py - 60, 0, py - 44);
  g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
  c.fillStyle = g; roundRect(c, px - 87, py - 59, 174 * f, 14, 7); c.fill();
  c.font = '600 12px Georgia, serif'; c.textAlign = 'center';
  c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.strokeText(b.label, px, py - 48);
  c.fillStyle = '#fff'; c.fillText(b.label, px, py - 48);
}

/* la gîte du navire : une jauge sous la coque, verte, puis orange, puis rouge ; au rouge, il chavire */
function drawGite(c) {
  const me = G.me;
  if (!me || me.sinking || !(me.gite > 0.12) || G.mode !== 'play') return;
  const g = clamp(me.gite, 0, 1);
  const [px, py0] = toScreen(me.x, me.y, 0);
  const half = me.len * (cam.pw / (cam.vw || cam.w)) * 0.5;
  const py = py0 + Math.max(42, half * 0.6 + 30);
  /* couché à fond : la jauge tremble, c'est le dernier instant pour lâcher la barre */
  const hold = me.giteHold || 0;
  const W_ = 132, x0 = px - W_ / 2 + (hold > 0 ? Math.sin(W.t * 55) * 2.5 : 0);
  const a = clamp((g - 0.12) * 4, 0, 1);
  c.save();
  c.globalAlpha = a;
  c.fillStyle = 'rgba(16,20,26,0.82)'; roundRect(c, x0 - 3, py - 3, W_ + 6, 14, 7); c.fill();
  const col = g < 0.55 ? '#9ad08a' : g < 0.8 ? '#f0b050' : (Math.sin(W.t * 18) > 0 ? '#ff4a3a' : '#ffd0c0');
  c.fillStyle = col; roundRect(c, x0, py, W_ * g, 8, 4); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  for (const t of [0.55, 0.8]) c.fillRect(x0 + W_ * t - 1, py - 2, 2, 12);
  c.font = 'italic 600 13px "Palatino Linotype", Georgia, serif'; c.textAlign = 'center';
  const lab = T(hold > 0 ? 'helm.last' : g > 0.78 ? 'helm.warn' : 'helm.gite');
  c.lineWidth = 4; c.strokeStyle = 'rgba(8,12,18,0.7)'; c.strokeText(lab, px, py + 26);
  c.fillStyle = g > 0.78 ? '#ffb09a' : '#f0e6cc'; c.fillText(lab, px, py + 26);
  c.restore();
}

function drawZoneTags(c) {
  c.textAlign = 'center';
  c.font = 'italic 600 15px "Palatino Linotype", "Book Antiqua", Georgia, serif';
  for (const z of G.zones || []) {
    if (!z.tag) continue;
    /* sous le cercle : au-dessus, la jauge du navire le cacherait */
    const [px, py, ok] = toScreen(z.x, z.y + z.r + 20, 4);
    if (!ok || px < 0 || py < 0 || px > cam.pw || py > cam.ph) continue;
    c.lineWidth = 4; c.strokeStyle = 'rgba(8,12,18,0.7)'; c.strokeText(z.tag, px, py);
    const col = new THREE.Color(z.col || 0xffe2a0);
    c.fillStyle = `rgb(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)})`;
    c.fillText(z.tag, px, py);
  }
}

function drawAim(c, A) {
  const [ax, ay, ok1] = toScreen(A.from[0], A.from[1], 8);
  const [bx, by, ok2] = toScreen(G.me.x, G.me.y, 4);
  if (!ok2) return;
  const k = 1 - A.t / A.t0;
  const flash = A.t < 0.7 ? (Math.sin(W.t * 40) > 0 ? 1 : 0.35) : 0.75;
  c.save();
  c.strokeStyle = `rgba(255,70,50,${flash})`;
  c.lineWidth = 2 + k * 2.5;
  c.setLineDash([14, 10]); c.lineDashOffset = -W.t * 60;
  c.beginPath(); c.moveTo(ok1 ? ax : bx + (ax - bx) * 0.2, ok1 ? ay : by + (ay - by) * 0.2); c.lineTo(bx, by); c.stroke();
  c.setLineDash([]);
  /* le réticule sur le Takao, qui se resserre */
  const r = 70 - k * 40;
  c.beginPath(); c.arc(bx, by, r, 0, TAU); c.stroke();
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.beginPath(); c.moveTo(bx + Math.cos(a) * (r - 10), by + Math.sin(a) * (r - 10)); c.lineTo(bx + Math.cos(a) * (r + 10), by + Math.sin(a) * (r + 10)); c.stroke(); }
  c.restore();
}

/* ---------- la carte d'ordres (en bas) et le conseil (sous l'objectif) ---------- */

function showOrders(kicker, text, delay) {
  HUD.ordQ = { kicker, text, at: delay || 0 };
}
function showHint(text) {
  const h = el('h-hint');
  if (!h) return;
  h.textContent = text;
  h.classList.remove('show'); void h.offsetWidth; h.classList.add('show');
  HUD.hintT = 5.5;
}
function tickOrders(dt) {
  if (HUD.ordQ) {
    HUD.ordQ.at -= dt;
    if (HUD.ordQ.at <= 0) {
      const o = el('orders');
      el('orders-k').textContent = HUD.ordQ.kicker;
      el('orders-t').textContent = HUD.ordQ.text;
      o.classList.remove('show'); void o.offsetWidth; o.classList.add('show');
      HUD.ordT = 6.5 + Math.min(4, HUD.ordQ.text.length / 40);
      HUD.ordQ = null;
      Snd.tick();
    }
  }
  if (HUD.ordT > 0) { HUD.ordT -= dt; if (HUD.ordT <= 0) el('orders').classList.remove('show'); }
  if (HUD.hintT > 0) { HUD.hintT -= dt; if (HUD.hintT <= 0) el('h-hint').classList.remove('show'); }
}
function hideOrders() { HUD.ordQ = null; HUD.ordT = 0; HUD.hintT = 0; const o = el('orders'); if (o) o.classList.remove('show'); const h = el('h-hint'); if (h) h.classList.remove('show'); }

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function drawLabels(c) {
  for (const l of G.world.labels) {
    const [px, py, ok] = toScreen(l.x, l.y, 40);
    if (!ok || px < -200 || py < -100 || px > cam.pw + 200 || py > cam.ph + 100) continue;
    c.textAlign = 'center';
    c.font = 'italic 600 19px "Palatino Linotype", "Book Antiqua", Georgia, serif';
    c.lineWidth = 4; c.strokeStyle = 'rgba(10,14,20,0.55)';
    const lt = LANG === 'ja' && l.jp ? l.jp : tx(l.t);
    c.strokeText(lt, px, py);
    c.fillStyle = 'rgba(255,246,226,0.92)';
    c.fillText(lt, px, py);
    if (l.jp && LANG !== 'ja') {
      c.font = '15px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif CJK JP", serif';
      c.strokeText(l.jp, px, py + 19);
      c.fillStyle = 'rgba(255,190,170,0.95)';
      c.fillText(l.jp, px, py + 19);
    }
  }
}

function drawPrecip(c, dt) {
  const want = SEA.snow ? 160 : SEA.rain ? 110 : 0;
  while (HUD.precip.length < want) HUD.precip.push({ x: Math.random() * cam.pw, y: Math.random() * cam.ph, z: 0.3 + Math.random() * 0.7, ph: Math.random() * TAU });
  if (HUD.precip.length > want) HUD.precip.length = want;
  if (!want) return;
  const [wx, wy] = W.wind;
  c.fillStyle = 'rgba(250,252,255,0.85)';
  c.strokeStyle = 'rgba(200,215,230,0.35)';
  c.lineWidth = 1;
  for (const f of HUD.precip) {
    if (SEA.snow) { f.x += (wx * 1.2 + Math.sin(W.t * 2 + f.ph) * 12) * f.z * dt; f.y += (wy * 1.2 + 40) * f.z * dt; }
    else { f.x += wx * 3 * f.z * dt; f.y += (wy * 3 + 520) * f.z * dt; }
    if (f.x < -10) f.x += cam.pw + 20; if (f.x > cam.pw + 10) f.x -= cam.pw + 20;
    if (f.y < -10) f.y += cam.ph + 20; if (f.y > cam.ph + 10) f.y -= cam.ph + 20;
    if (SEA.snow) { c.globalAlpha = 0.5 + f.z * 0.5; c.beginPath(); c.arc(f.x, f.y, 0.8 + f.z * 2, 0, TAU); c.fill(); }
    else { c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x - wx * 0.08, f.y - 14 * f.z); c.stroke(); }
  }
  c.globalAlpha = 1;
}

/* ---------- les flèches vers l'objectif ---------- */

function hudTargets() {
  const out = [], me = G.me;
  const near = (list, n, col, lab) => list.slice().sort((a, b) => dist(a.x, a.y, me.x, me.y) - dist(b.x, b.y, me.x, me.y)).slice(0, n).forEach((it) => out.push([it.x, it.y, col, lab]));
  if (G.game === 'story') {
    return storyTargets();
  } else if (G.arc && G.arc.state === 'play') {
    if (G.arc.variant === 'corsaire' && G.cors) corsTargets(out);
    else near(G.crates, 2, '#ffd98a', T('ptr.crate'));
    /* le calmar qui vous traque, hors de l'écran : une flèche rouge */
    for (const b of G.beasts || []) if (squidHunting(b)) out.push([b.x, b.y, '#ff6a4a', T('ptr.squid')]);
  }
  return out;
}

function drawPointers(c) {
  const me = G.me;
  /* le cadre des flèches évite les plaques du haut et du bas */
  const L = 70, Rr = cam.pw - 70, T = 150, B = cam.ph - 240;
  /* la plus proche d'abord ; deux flèches presque au même endroit n'en font qu'une */
  const drawn = [];
  const tgs = hudTargets().slice().sort((a, b) => dist(a[0], a[1], me.x, me.y) - dist(b[0], b[1], me.x, me.y));
  for (const [x, y, col, label] of tgs) {
    let [px, py, ok] = toScreen(x, y);
    /* visible à l'écran, et pas sous une plaque : pas besoin de flèche */
    if (ok && px > 20 && px < cam.pw - 20 && py > 20 && py < cam.ph - 20 && !hudCovers(px, py, 12)) continue;
    const [mx, my] = toScreen(me.x, me.y);
    let dx = px - mx, dy = py - my;
    if (!ok) { dx = -dx; dy = -dy; }
    const cx = (L + Rr) / 2, cy = (T + B) / 2;
    const k = Math.min((Rr - L) / 2 / Math.abs(dx || 1e-3), (B - T) / 2 / Math.abs(dy || 1e-3));
    const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
    if (drawn.some(([qx, qy, qc]) => qc === col && Math.abs(qx - ax) + Math.abs(qy - ay) < 46)) continue;
    /* deux flèches de couleurs différentes presque au même endroit : la seconde légende s'écrit dessous */
    const crowd = drawn.filter(([qx, qy]) => Math.abs(qx - ax) + Math.abs(qy - ay) < 46).length;
    drawn.push([ax, ay, col]);
    c.save();
    c.translate(ax, ay); c.rotate(a);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 8;
    c.fillStyle = col;
    c.beginPath(); c.moveTo(18, 0); c.lineTo(-10, -13); c.lineTo(-4, 0); c.lineTo(-10, 13); c.closePath(); c.fill();
    c.restore();
    const d = dist(x, y, me.x, me.y) / SCALE;
    const txt = label + ' · ' + (d > 1000 ? (d / 1000).toFixed(1).replace('.', LANG === 'fr' ? ',' : '.') + ' km' : Math.round(d / 10) * 10 + ' m');
    c.font = 'italic 600 14px "Palatino Linotype", Georgia, serif';
    c.textAlign = 'center';
    const lx = ax - Math.cos(a) * 44, ly = ay - Math.sin(a) * 30 + 5 + crowd * 18;
    c.lineWidth = 4; c.strokeStyle = 'rgba(8,12,18,0.7)'; c.strokeText(txt, lx, ly);
    c.fillStyle = col; c.fillText(txt, lx, ly);
  }
}

/* ---------- la mini-carte ronde ---------- */

function prepareMini() {
  const cv = el('minimap');
  const S = cv.clientWidth || 190;
  cv.width = cv.height = S * 2;
  const W_ = G.field.w, H_ = G.field.h;
  const k = Math.min(1, 900 / Math.max(W_, H_));
  const bg = document.createElement('canvas');
  bg.width = Math.ceil(W_ * k); bg.height = Math.ceil(H_ * k);
  const c = bg.getContext('2d');
  c.fillStyle = '#16324a'; c.fillRect(0, 0, bg.width, bg.height);
  c.scale(k, k);
  c.fillStyle = SEA.season === 'hiver' ? '#d8dcd6' : '#b9a878';
  c.strokeStyle = 'rgba(255,240,200,0.6)'; c.lineWidth = 2 / k;
  c.beginPath();
  for (const p of G.world.polys) { c.moveTo(p.f[0], p.f[1]); for (let i = 2; i < p.f.length; i += 2) c.lineTo(p.f[i], p.f[i + 1]); c.closePath(); }
  c.fill(); c.stroke();
  /* rayon visible : toute la carte en histoire, les environs en arcade */
  const radius = G.game === 'arcade' ? (G.arc && G.arc.variant === 'corsaire' ? 6500 : 2400) : Math.max(W_, H_) * 0.55;
  HUD.mini = { bg, k, radius, S };
}

function drawMini() {
  if (!HUD.mini || el('hud').classList.contains('hidden')) return;
  const M = HUD.mini, cv = el('minimap'), c = cv.getContext('2d');
  const S = cv.width, R_ = S / 2, me = G.me;
  const story = G.game !== 'arcade';
  const cx = story ? G.field.w / 2 : me.x, cy = story ? G.field.h / 2 : me.y;
  const z = R_ / M.radius;                 // pixels de mini-carte par unité
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, S, S);
  c.save();
  c.beginPath(); c.arc(R_, R_, R_ - 2, 0, TAU); c.clip();
  c.fillStyle = '#122a3e'; c.fillRect(0, 0, S, S);
  c.imageSmoothingEnabled = true;
  c.drawImage(M.bg, R_ - cx * z, R_ - cy * z, M.bg.width / M.k * z, M.bg.height / M.k * z);
  const P = (x, y) => [R_ + (x - cx) * z, R_ + (y - cy) * z];
  const rim = (x, y) => { let [px, py] = P(x, y); const dx = px - R_, dy = py - R_, d = Math.hypot(dx, dy); if (d > R_ - 14) { px = R_ + dx / d * (R_ - 14); py = R_ + dy / d * (R_ - 14); } return [px, py]; };
  for (const zn of G.game === 'arcade' && G.cors && G.arc && G.arc.variant === 'corsaire' ? [] : G.zones || []) {
    const [px, py] = rim(zn.x, zn.y);
    c.strokeStyle = '#ffd98a'; c.lineWidth = 4;
    c.beginPath(); c.arc(px, py, Math.max(9, zn.r * z), 0, TAU); c.stroke();
  }
  c.fillStyle = '#ffd98a';
  for (const k of G.crates) { const [px, py] = P(k.x, k.y); c.fillRect(px - 4, py - 4, 8, 8); }
  for (const b of G.boats || []) { if (b.noMini) continue; const [px, py] = P(b.x, b.y); c.fillRect(px - 4, py - 4, 8, 8); }
  for (const s of G.ships) {
    if (s === me || s.sunk || s.cors) continue;
    if (!story && dist(s.x, s.y, me.x, me.y) > M.radius) continue;
    const [px, py] = P(s.x, s.y);
    c.fillStyle = s === G.target ? '#ff7a5a' : '#e0443a';
    c.beginPath(); c.arc(px, py, 7, 0, TAU); c.fill();
  }
  if (G.game === 'arcade') beastsMini(c, P, me, M.radius);
  if (G.cors && G.arc && G.arc.variant === 'corsaire') corsaireMini(c, P, me, M.radius);
  const [mx, my] = P(me.x, me.y);
  c.save(); c.translate(mx, my); c.rotate(me.h);
  c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(14, 0); c.lineTo(-9, -8); c.lineTo(-4, 0); c.lineTo(-9, 8); c.closePath(); c.stroke(); c.fill();
  c.restore();
  c.restore();
}
