'use strict';

/* ---------- le jeu du bout des doigts ----------
 * Sur ordinateur, tout se joue au clavier, et rien n'y change : ce qui suit ne s'éveille qu'au
 * premier toucher d'un écran tactile (ou d'emblée sur un téléphone et une tablette). On pose alors
 * par-dessus le jeu de quoi jouer du doigt : à gauche, le manche, qui tient la barre et la machine ;
 * à droite, le feu et Entrée ; en haut, la pause. Dans les menus, un premier toucher choisit une
 * ligne (sa description s'affiche), un second la valide ; la barre des touches, en bas à droite, se
 * touche comme un clavier ; d'un glissé du doigt, on passe d'une page ou d'un navire à l'autre. Tout
 * passe par de fausses touches du clavier : le jeu ne sait pas qu'on le joue du doigt. Sur un
 * téléphone, la page se met en page comme sur un petit écran d'ordinateur, à l'horizontale ; tenu à
 * la verticale, on demande de le tourner. */

const TOUCH = { on: false, last: 0, built: false, swipe: null, stick: null };
/* un toucher tout récent : les événements de souris qui le suivent viennent de lui */
const touchRecent = () => TOUCH.on && performance.now() - TOUCH.last < 900;

/* une fausse touche du clavier, enfoncée ou relâchée */
function touchKey(key, down) {
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key }));
}
function touchTap(key) { touchKey(key, true); touchKey(key, false); }

/* un téléphone se met en page sur un écran d'ordinateur de 1 100 à 1 400 points de large, assez
 * pour que les menus et les plaques y tiennent ; une tablette garde sa mise en page */
function touchViewport() {
  const m = document.querySelector('meta[name="viewport"]');
  const a = Math.max(screen.width, screen.height), b = Math.min(screen.width, screen.height);
  if (!m || !b || b >= 600) return;
  const w = Math.round(clamp(540 * a / b, 1100, 1400));
  m.setAttribute('content', 'width=' + w + ', user-scalable=no');
}

/* tenu à la verticale : « tournez votre téléphone » */
function touchOrient() {
  const r = el('t-rotate');
  if (!r) return;
  const tall = window.matchMedia('(orientation: portrait)').matches && Math.min(screen.width, screen.height) < 600;
  r.classList.toggle('hidden', !tall);
  setText('t-rotate-t', T('touch.rotate'));
}

/* les touches de la barre du bas d'un écran : ce que dit le cabochon */
function touchKeyOf(kbd) {
  const t = (kbd.textContent || '').trim();
  const map = { '↑': 'ArrowUp', '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight', P: 'p', M: 'm' };
  map[T('k.enter')] = 'Enter'; map[T('k.esc')] = 'Escape'; map[T('k.space')] = ' ';
  return map[t] || null;
}

function touchBuild() {
  if (TOUCH.built) return;
  TOUCH.built = true;
  const pad = document.createElement('div');
  pad.id = 'tpad';
  pad.className = 'tpad hidden';
  pad.innerHTML = `
    <div id="tp-stick" class="tp-stick">
      <div class="tp-base"><i class="tp-a tp-n">▲</i><i class="tp-a tp-s">▼</i><i class="tp-a tp-w">◀</i><i class="tp-a tp-e">▶</i></div>
      <div class="tp-knob"></div>
    </div>
    <div id="tp-right" class="tp-group tp-r">
      <div class="tp-col">
        <button class="tb tb-enter" data-k="Enter"><b id="tp-enter-t"></b></button>
        <button class="tb tb-fire" data-k=" "><b id="tp-fire-t"></b></button>
      </div>
    </div>
    <button id="tp-pause" class="tb tb-pause" data-k="p" aria-label="pause"><i>❚❚</i></button>`;
  document.body.appendChild(pad);
  touchStick(el('tp-stick'));
  /* chaque bouton tient sa touche enfoncée tant que le doigt y reste ; plusieurs doigts à la fois */
  for (const b of pad.querySelectorAll('.tb')) {
    const k = b.dataset.k;
    const up = (e) => { if (!b.classList.contains('down')) return; b.classList.remove('down'); touchKey(k, false); if (e && e.pointerId !== undefined && b.hasPointerCapture && b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId); };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      TOUCH.last = performance.now();
      if (b.setPointerCapture) try { b.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
      if (b.classList.contains('down')) return;
      b.classList.add('down');
      touchKey(k, true);
    });
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  /* les plaques du jeu ne passent pas sous les boutons, ni les flèches des coffres */
  if (typeof HUD_PLAQUES !== 'undefined') HUD_PLAQUES.push('tp-stick', 'tp-right');
  const rot = document.createElement('div');
  rot.id = 't-rotate';
  rot.className = 'hidden';
  rot.innerHTML = '<div class="t-phone"></div><p id="t-rotate-t"></p>';
  document.body.appendChild(rot);
  /* dans les menus : la barre des touches se touche, et un glissé tourne les pages */
  const menu = el('menu');
  menu.addEventListener('click', (e) => {
    if (!TOUCH.on) return;
    const span = e.target.closest('.hints span');
    if (!span) return;
    const kbd = e.target.closest('kbd') || span.querySelector('kbd:last-of-type');
    const k = kbd && touchKeyOf(kbd);
    if (!k) return;
    e.stopPropagation();
    kbd.classList.add('flash'); setTimeout(() => kbd.classList.remove('flash'), 160);
    touchTap(k);
  });
  /* chaque menu qui s'affiche se met à la taille de l'écran (voir touchFit) */
  new MutationObserver(() => { requestAnimationFrame(touchFit); setTimeout(touchFit, 450); }).observe(menu, { childList: true });
  menu.addEventListener('scroll', (e) => { if (e.target.classList && e.target.classList.contains('lead')) touchFit(); }, { capture: true, passive: true });
  window.addEventListener('resize', touchFit);
  menu.addEventListener('touchstart', (e) => { const t = e.touches[0]; TOUCH.swipe = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, t: performance.now() } : null; }, { passive: true });
  menu.addEventListener('touchend', (e) => {
    const s = TOUCH.swipe; TOUCH.swipe = null;
    if (!s || !MENU.lr || !e.changedTouches.length) return;
    const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy) && performance.now() - s.t < 700) touchTap(dx < 0 ? 'ArrowRight' : 'ArrowLeft');
  }, { passive: true });
  /* la page elle-même ne défile jamais (un scrollIntoView y suffirait, sur un écran bas) : seuls
   * les blocs des menus défilent */
  window.addEventListener('scroll', () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); }, { passive: true });
  /* un doigt qui s'attarde n'ouvre pas de menu du navigateur */
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('resize', touchOrient);
  window.addEventListener('orientationchange', () => setTimeout(touchOrient, 200));
  /* la boucle des boutons : ils ne paraissent qu'en jeu, et disent ce qu'ils font dans la langue */
  const loop = () => {
    requestAnimationFrame(loop);
    if (typeof G === 'undefined' || typeof MENU === 'undefined') return;
    const play = G.mode === 'play' && !MENU.screen && !el('hud').classList.contains('hidden');
    pad.classList.toggle('hidden', !play);
    if (play) { setText('tp-fire-t', T('touch.fire')); setText('tp-enter-t', T('k.enter')); }
    /* plus en jeu : aucun bouton ne reste enfoncé, le manche revient au centre */
    if (!play) for (const b of pad.querySelectorAll('.tb.down')) { b.classList.remove('down'); touchKey(b.dataset.k, false); }
    touchStickKeys(play);
  };
  requestAnimationFrame(loop);
  touchOrient();
}

/* le manche : un pommeau qu'on pousse du pouce dans un cercle ; il suit le doigt sans sortir du
 * cercle et revient au centre quand on le lâche. On peut le saisir n'importe où dans le coin. */
const STICK_R = 62;   // la course du pommeau, en points
function touchStick(stick) {
  const base = stick.querySelector('.tp-base'), knob = stick.querySelector('.tp-knob');
  const S = TOUCH.stick = { id: null, vx: 0, vy: 0, acc: 0, keys: new Set(), el: stick, a: {} };
  for (const d of ['n', 's', 'w', 'e']) S.a[d] = stick.querySelector('.tp-' + d);
  const move = (e) => {
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
    S.vx = dx / STICK_R; S.vy = dy / STICK_R;
    knob.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';
  };
  S.release = (e) => {
    if (S.id === null || (e && e.pointerId !== S.id)) return;
    S.id = null; S.vx = 0; S.vy = 0;
    stick.classList.remove('on');
    knob.style.transform = '';
  };
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    TOUCH.last = performance.now();
    if (S.id !== null) return;
    S.id = e.pointerId;
    S.acc = 0.99;
    try { stick.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    stick.classList.add('on');
    move(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === S.id) move(e); });
  stick.addEventListener('pointerup', S.release);
  stick.addEventListener('pointercancel', S.release);
  stick.addEventListener('lostpointercapture', S.release);
  stick.addEventListener('contextmenu', (e) => e.preventDefault());
}

/* à chaque image, le manche tient les flèches du clavier. En haut et en bas, la machine, avec un peu
 * de jeu autour du seuil : un pouce qui tremble ne redouble pas l'appui (deux appuis coup sur coup
 * donnent le coup de boutoir, qu'on obtient en poussant deux fois le manche). À gauche et à droite,
 * la barre : le jeu ne connaît que la barre à fond ou droite ; le manche à mi-course la tient une
 * image sur deux, et le navire tourne à mi-régime, comme sous de petits coups de barre. */
function touchStickKeys(play) {
  const S = TOUCH.stick;
  if (!S) return;
  if (!play) S.release();
  const want = new Set();
  if (play && S.id !== null) {
    S.acc += clamp((Math.abs(S.vx) - 0.2) / 0.65, 0, 1);
    if (S.acc >= 1) { S.acc -= 1; want.add(S.vx < 0 ? 'ArrowLeft' : 'ArrowRight'); }
    if (S.keys.has('ArrowUp') ? S.vy < -0.4 : S.vy < -0.55) want.add('ArrowUp');
    if (S.keys.has('ArrowDown') ? S.vy > 0.4 : S.vy > 0.55) want.add('ArrowDown');
  }
  for (const k of [...S.keys]) if (!want.has(k)) { S.keys.delete(k); touchKey(k, false); }
  for (const k of want) if (!S.keys.has(k)) { S.keys.add(k); touchKey(k, true); }
  const on = S.id !== null;
  S.a.n.classList.toggle('lit', want.has('ArrowUp'));
  S.a.s.classList.toggle('lit', want.has('ArrowDown'));
  S.a.w.classList.toggle('lit', on && S.vx < -0.2);
  S.a.e.classList.toggle('lit', on && S.vx > 0.2);
}

/* sur un écran bas, ou quand le menu ne la tient pas, la description de la ligne choisie quitte le
 * bloc du menu pour la bande libre du bas, à gauche des touches : elle reste lisible même quand le
 * long texte du menu défile. Un texte qui se poursuit plus bas s'efface en dégradé, jusqu'à ce qu'on
 * l'ait fait défiler au bout. */
function touchFit() {
  const root = el('menu');
  if (!root || root.classList.contains('hidden')) return;
  const d = el('menu-desc');
  const blk = d && d.parentNode !== root ? d.closest('.title-block, .side-block') : null;
  if (blk && (innerHeight <= 660 || blk.scrollHeight > blk.clientHeight + 1)) {
    root.appendChild(d);
    d.classList.add('t-desc');
  }
  if (d && d.classList.contains('t-desc')) {
    const h = root.querySelector('.hints'), r = h ? h.getBoundingClientRect() : null;
    d.style.right = Math.round(r && r.width ? innerWidth - r.left + 24 : 24) + 'px';
  }
  for (const n of root.querySelectorAll('.side-block > .lead')) n.classList.toggle('t-more', n.scrollTop + n.clientHeight < n.scrollHeight - 2);
}

function touchQuality() { if (!(R3.quality > 0)) { R3.quality = 1; applyQuality(); } }

/* sur l'écran d'accueil d'un téléphone, le jeu s'ouvre en plein écran, à l'horizontale, avec son
 * sceau pour icône (le manifeste n'a de sens que servi par un site, pas ouvert depuis le disque) */
function touchHomeScreen() {
  const add = (tag, attrs) => { const n = document.createElement(tag); for (const k in attrs) n.setAttribute(k, attrs[k]); document.head.appendChild(n); };
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' });
  add('meta', { name: 'apple-mobile-web-app-title', content: 'Hakodate' });
  add('meta', { name: 'theme-color', content: '#050a12' });
  add('link', { rel: 'apple-touch-icon', href: 'img/icone-180.png' });
  if (/^https?:$/.test(location.protocol)) add('link', { rel: 'manifest', href: 'manifest.webmanifest' });
}

function touchEnable() {
  if (TOUCH.on) return;
  TOUCH.on = true;
  document.documentElement.classList.add('touch');
  addStr(TOUCH_STR);
  touchViewport();
  touchHomeScreen();
  if (document.body) touchBuild();
  else window.addEventListener('DOMContentLoaded', touchBuild);
  /* un téléphone peine plus qu'un ordinateur : on part d'une image un peu allégée (le jeu
   * l'allège encore de lui-même s'il le faut) */
  if (typeof R3 !== 'undefined' && R3.r) touchQuality();
}

addStr({
  'touch.fire': ['Feu', 'Fire', '撃て'],
  'help.touch': ['Du bout des doigts : le manche, à gauche, mène le navire. Vers le haut, la machine en avant ; vers le bas, elle ralentit, stoppe, puis recule ; à gauche, à droite, la barre, d\'autant plus forte qu\'on le pousse loin ; deux poussées vers le haut, coup sur coup, donnent le coup de boutoir. À droite, Feu et Entrée ; en haut, ❚❚ pour la pause. Dans les menus, un premier toucher choisit une ligne, un second la valide ; la barre des touches, en bas à droite, se touche comme un clavier, et l\'on tourne les pages d\'un glissé du doigt.', 'With your fingers: the stick, on the left, sails the ship. Up, the engine ahead; down, it slows, stops, then goes astern; left or right, the helm, the harder the further you push; two quick pushes up give ramming speed. On the right, Fire and Enter; at the top, ❚❚ to pause. In the menus, a first touch chooses a line, a second confirms it; the key bar at the bottom right works like a keyboard, and you turn pages with a swipe.', '指で遊ぶ：左のスティックで船を操る。上で機関前進、下で減速・停止・後進、左右で舵（大きく倒すほど強く切る）。上へすばやく二度倒すと体当たりの突進。右に撃てとEnter、上に❚❚で一時停止。メニューでは一度触れて選び、もう一度触れて決定。右下のキーの列はキーボードのように触れて使い、ページは指でスワイプしてめくる。'],
  'touch.rotate': ['Tournez votre téléphone : le jeu se joue à l\'horizontale.', 'Turn your phone sideways: the game is played in landscape.', 'スマートフォンを横向きにしてください。このゲームは横画面で遊びます。'],
});

/* au doigt, les conseils qui parlent de touches parlent du manche et des boutons (au clavier, ils
 * restent tels quels : ils ne changent qu'une fois le jeu tactile éveillé) */
const TOUCH_STR = {
  'tuto.sail': ['La barre et la machine, au manche, à gauche de l\'écran. Poussé vers le haut, il fait route (tenu plus longtemps : en avant toute) ; vers le bas, il ralentit puis stoppe ; à gauche ou à droite, il gouverne, d\'autant plus fort qu\'on le pousse loin. Gagnez le cercle doré, au large.', 'Helm and engine, on the stick at the left of the screen. Push it up to get under way (hold it longer: full ahead), down to slow down and stop, left or right to steer, the harder the further you push. Reach the gold circle out at sea.', '舵と機関は画面左のスティックで。上に倒すと前進（長く倒せば全速）、下に倒すと減速して停止、左右に倒すと舵を取る（大きく倒すほど強く切る）。沖の金の円へ向かえ。'],
  'tuto.yard.msg': ['Didacticiel : sur la ligne « Atelier », passez à l\'« artillerie » (← → dans la barre des touches, ou d\'un glissé du doigt) ; touchez « Canons en bordée » pour le choisir, puis une seconde fois pour l\'acheter (deux crans si l\'or suffit). Puis « Prendre la mer ».', 'Tutorial: on the "Workshop" line, move to "guns" (← → in the key bar, or swipe); tap "Broadside guns" to choose it, then again to buy (two steps if the gold allows). Then "Set sail".', 'チュートリアル：「工房」の行で「砲術」へ（キーの列の← →、または指でスワイプ）。「舷側砲」に触れて選び、もう一度触れて購入（小判が足りれば二段）。それから「出航する」。'],
  'tuto.broad': ['La bordée. Un transport ennemi, le Hiryū, croise au large. Mettez-le par le travers, à droite ou à gauche de votre navire, et touchez Feu : la bordée part du bord qui le regarde.', 'The broadside. An enemy transport, the Hiryū, is cruising offshore. Bring her abeam, to the right or left of your ship, and tap Fire: the broadside fires from the side facing her.', '舷側斉射。敵の輸送船・飛龍が沖を行く。自分の船の左右どちらかの真横に捉え、「撃て」に触れよ。敵に向いた舷の砲が火を噴く。'],
  'tuto.g.broad': ['Touchez le Hiryū par le travers (Feu)', 'Hit the Hiryū abeam (Fire)', '飛龍を真横から撃て（「撃て」ボタン）'],
  'tuto.tip.land': ['Astuce : le manche vers le bas jusqu\'à « Stoppé » ; la jauge du débarquement se remplit au-dessus de votre navire.', 'Tip: stick down until "Stopped"; the landing gauge fills above your ship.', 'こつ：「停止」までスティックを下へ。船の上で上陸のゲージが満ちていく。'],
  'cor.tip.ram2': ['Pour éperonner : deux poussées du manche vers le haut juste avant le choc, le coup de boutoir. Sans lui, on ne fait que heurter.', 'To ram: push the stick up twice just before the blow, for ramming speed. Without it, you only bump.', '衝角攻撃は、衝突の直前にスティックを上へ二度倒して体当たり。倒さなければぶつかるだけだ。'],
  'yard.first': ['Choisissez vos pièces : touchez une ligne pour la choisir, une seconde fois pour l\'acheter ; sur la ligne « Atelier », ← → (dans la barre des touches) ou un glissé du doigt changent d\'atelier. Puis « Prendre la mer ».', 'Choose your parts: tap a line to choose it, again to buy; on the "Workshop" line, ← → (in the key bar) or a swipe changes workshop. Then « Set sail ».', '部品を選ぼう：行に触れて選び、もう一度触れて購入。「工房」の行では、キーの列の←→かスワイプで工房を替える。終われば「出航する」。'],
  'yard.d.eperon': ['Un éperon de fer à l\'étrave, plus lourd à chaque cran : foncez droit sur un navire et poussez deux fois le manche vers le haut juste avant le choc. Le coup grandit avec la vitesse, la cuirasse et le poids de votre navire, et votre étrave en souffre moins. Un navire trop solide pour couler reste planté sur l\'éperon : on l\'aborde (le manche vers le bas pour se dégager).', 'An iron ram at the bow, heavier at each level: charge straight at a ship and push the stick up twice just before the blow. It grows with speed, armour and your ship\'s weight, and your bow suffers less. A ship too sturdy to sink stays stuck on the ram: board her (stick down to back off).', '艦首の鉄の衝角。段階ごとに重くなる。敵艦にまっすぐ突っ込み、衝突の直前にスティックを上へ二度倒せ。一撃は速さ、装甲、船の重さで大きくなり、自艦の艦首の傷みは減る。沈まなかった艦は衝角に刺さったまま。斬り込め（スティックを下へ倒して離れる）。'],
  'h.full': ['Machine en avant toute (le manche vers le haut) : chaque seconde compte.', 'Full ahead (stick up): every second counts.', '機関前進全速（スティックを上へ）。一秒を争う。'],
  'h.debris': ['Les débris abîment la coque : tirez dessus (Feu) pour les briser.', 'Debris damages the hull: shoot it (Fire) to break it up.', '漂流物は船体を傷める。砲撃（「撃て」）で砕け。'],
};

/* le premier toucher éveille le jeu tactile ; un téléphone ou une tablette l'éveillent d'emblée */
window.addEventListener('touchstart', () => { TOUCH.last = performance.now(); touchEnable(); }, { capture: true, passive: true });
window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { TOUCH.last = performance.now(); touchEnable(); } }, { capture: true });
window.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') TOUCH.last = performance.now(); }, { capture: true });
/* le son ne s'ouvre que sur un geste : le premier toucher relâché */
window.addEventListener('touchend', () => {
  /* les événements de souris qu'un toucher entraîne suivent son relâché : c'est de là qu'on compte */
  TOUCH.last = performance.now();
  if (typeof Snd !== 'undefined' && Snd.wake) Snd.wake();
}, { capture: true, passive: true });
if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches) touchEnable();
