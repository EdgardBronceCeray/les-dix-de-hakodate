'use strict';

/* ---------- le didacticiel du corsaire ----------
 * Une traversée d'apprentissage, à part (rien ne s'y enregistre) : on prend la mer à Hakodate sur une
 * coque de noix, et l'on apprend pas à pas la barre, les coffres, le chantier, la bordée, l'enfilade,
 * l'abordage, le combat, puis la prise d'un port, Matsumae, tout près (sa batterie, son château, le
 * débarquement). Chaque étape dit ce qu'il faut faire, et passe quand c'est fait. Rien
 * d'autre ne paraît sur la mer ; les coups portent moitié moins, et le navire ne coule pas. */

const TUTO = { steps: ['sail', 'chest', 'yard', 'broad', 'rake', 'board', 'fight', 'port', 'land'], port: 'matsumae' };

function startCorsaireTuto() {
  loading(() => {
    corsaireBegin(null, 0, true);
    enterPlay();
    tutoStart();
  });
}

function tutoStart() {
  const C = G.cors, me = G.me;
  for (const s of G.ships.slice()) if (s.cors) G.ships.splice(G.ships.indexOf(s), 1);
  G.objs = []; G.chests = [];
  G.beastT = { whale: 1e9, squid: 1e9, akkoro: 1e9 };
  /* on apprend sans sombrer : les coups portent moitié moins, la coque tient, le navire ne chavire pas */
  me.dmgK = 0.5; me.noSink = true; me.noCapsize = true;
  for (const P of C.ports) { P.reliefT = 1e9; P.relief2T = 1e9; }
  /* les conseils de la traversée qui ne valent pas ici (personne ne vient au secours du port) */
  Object.assign(C.tips, { port: true, fort: true, siege: true, yard: true });
  banner(T('tuto.title'), T('tuto.title2'), 3.2);
  tutoNext();
}

const tutoPort = () => G.cors.ports.find((q) => q.id === TUTO.port);
/* un navire de l'ordinateur, d'un type donné, à une place donnée */
function tutoSpawn(id, x, y, h) {
  const pick = window.corsPickType;
  window.corsPickType = () => id;
  const s = corsSpawn(G.cors.ports.find((q) => q.state === 'enemy'), id !== 'hiryu');
  window.corsPickType = pick;
  if (!s) return null;
  s.x = x; s.y = y; s.h = h; s.v = 0; s.safe = [x, y, h]; s.cors.waitT = 0; s.cors.mended = true;
  return s;
}
/* un point d'eau libre, à peu près à d du navire, du côté a (sinon ailleurs autour) */
function tutoWater(d, a) {
  const me = G.me;
  for (let k = 0; k < 24; k++) {
    const b = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.35;
    const x = me.x + Math.cos(b) * d, y = me.y + Math.sin(b) * d;
    if (corsClear(x, y, 140) && corsLos(me.x, me.y, x, y, 60)) return [x, y, b];
  }
  return [me.x + Math.cos(a) * d, me.y + Math.sin(a) * d, a];
}

/* ce que fait chaque étape en commençant */
const TUTO_SETUP = {
  sail(U) {
    const H = G.cors.home, out = Math.atan2(H.hy - H.by, H.hx - H.bx);
    const [x, y] = tutoWater(720, out);
    U.zone = { x, y, r: 95, col: 0xffd98a, tag: T('tuto.zone'), tuto: true };
  },
  chest(U) {
    const me = G.me, [x, y] = tutoWater(280, me.h);
    U.chest = addChest(x, y, 240);
    U.chest.life = 1e9; U.chest.vx = 0; U.chest.vy = 0;
    U.coins0 = G.cors.coins;
  },
  yard(U) { U.yarded = false; },
  broad(U) {
    const me = G.me, [x, y] = tutoWater(520, me.h - 0.9);
    const s = tutoSpawn('hiryu', x, y, me.h);
    if (!s) return;
    s.cors.state = 'tuto'; s.noSink = true;
    s.hullMax = Math.round(s.hullMax * 1.5); s.hull = s.hullMax;
    U.prey = s;
  },
  rake(U) { U.raked = false; },
  board(U) { U.boards0 = G.cors.stats.boards; },
  fight(U) {
    const me = G.me, [x, y] = tutoWater(820, me.h + 1.2);
    const s = tutoSpawn('moshun', x, y, me.h + Math.PI);
    if (!s) return;
    /* une canonnière à court d'hommes : elle riposte, mais moins fort */
    s.hullMax = Math.round(s.hullMax * 0.6); s.hull = s.hullMax; s.kE *= 0.6;
    corsHunt(s, 60);
    U.foe = s;
  },
  port(U) { const P = tutoPort(); P.alarmT = 0; corsScale(); P.hp = P.hpMax; },
  land() {},
};

/* l'étape est-elle faite ? */
const TUTO_DONE = {
  sail: (U) => dist(G.me.x, G.me.y, U.zone.x, U.zone.y) < U.zone.r,
  chest: (U) => !G.chests.includes(U.chest) && G.cors.coins > U.coins0,
  yard: (U) => {
    if (YARD.open || !U.yarded) return false;
    U.yarded = false;
    if (G.me.cfg.canons >= 1) return true;
    showOrders(T('tuto.k', U.i + 1, TUTO.steps.length), T('tuto.yard.again'), 0.3);
    return false;
  },
  broad: (U) => !U.prey || U.prey.hull <= U.prey.hullMax * 0.8,
  rake: (U) => U.raked || !U.prey,
  board: (U) => !U.prey || U.prey.captured || G.cors.stats.boards > U.boards0,
  fight: (U) => !U.foe || U.foe.sinking || U.foe.captured || !G.ships.includes(U.foe),
  port: () => tutoPort().state !== 'enemy',
  land: () => tutoPort().state === 'ours',
};

function tutoNext() {
  const C = G.cors, U = C.tuto || (C.tuto = { i: -1 });
  U.i++; U.t = 0; U.tip = false; U.zone = null;
  U.step = TUTO.steps[U.i];
  G.zones = G.zones.filter((z) => !z.tuto);
  if (!U.step) { tutoEnd(); return; }
  TUTO_SETUP[U.step](U);
  if (U.i > 0) { Snd.levelUp(); floatText(G.me.x, G.me.y - 60, T('tuto.done'), 'gold'); }
  showOrders(T('tuto.k', U.i + 1, TUTO.steps.length), T('tuto.' + U.step), U.i > 0 ? 1.2 : 2.6);
}

/* à chaque pas : la mer reste vide, l'autonomie pleine ; l'étape passe quand elle est faite */
function tutoStep(dt) {
  const C = G.cors, U = C.tuto, me = G.me;
  if (!U || !U.step) return;
  C.spawnT = C.brulotT = C.siegeT = C.chestT = C.debrisT = C.ambT = 1e9;
  C.auto = 1;
  if (me.hull < 1) me.hull = 1;
  U.t += dt;
  if (U.zone && !G.zones.includes(U.zone)) G.zones.push(U.zone);
  /* la proie tourne en rond, à petite allure ; le Mōshun vous cherche dès qu'on quitte l'abri du port */
  if (U.foe && G.ships.includes(U.foe) && !U.foe.sinking && !U.foe.captured && U.foe.cors.state !== 'hunt' && !corsSafe(me.x, me.y)) corsHunt(U.foe, 30);
  if (TUTO_DONE[U.step](U)) { tutoNext(); return; }
  /* au bout d'un moment, l'ordre revient, avec une astuce s'il y en a une */
  if (U.t > 40 && !U.tip && !YARD.open) {
    U.tip = true;
    const tip = T('tuto.tip.' + U.step);
    showOrders(T('tuto.k', U.i + 1, TUTO.steps.length), tip !== 'tuto.tip.' + U.step ? tip : T('tuto.' + U.step), 0);
  }
}

/* les flèches du didacticiel */
function tutoTargets(out) {
  const U = G.cors.tuto;
  if (!U || !U.step) return;
  const P = tutoPort(), H = G.cors.home;
  if (U.zone) out.push([U.zone.x, U.zone.y, '#ffd98a', U.zone.tag]);
  if (U.step === 'yard' && !YARD.open) out.push([H.hx, H.hy, '#9ad8a0', portName(H)]);
  if ((U.step === 'broad' || U.step === 'rake' || U.step === 'board') && U.prey && G.ships.includes(U.prey)) out.push([U.prey.x, U.prey.y, '#ff8a6a', shipName(U.prey.spec)]);
  if (U.step === 'fight' && U.foe && G.ships.includes(U.foe)) out.push([U.foe.x, U.foe.y, '#ff8a6a', shipName(U.foe.spec)]);
  if (U.step === 'port') out.push([P.bx, P.by, '#ff8a6a', T('tuto.battery', portName(P))]);
}
const tutoGoal = () => { const U = G.cors.tuto; return U && U.step ? T('tuto.g.' + U.step) : ''; };

/* la fin : ce qu'on a appris, et ce qu'il reste à découvrir */
function tutoEnd() {
  const C = G.cors;
  C.tuto.step = null;
  G.mode = 'menu';
  corsClearBanner();
  Music.sting('win');
  menuShow('results', `
    <div class="scrim full"></div>
    <div class="results">
      <div class="kicker">${T('tuto.title')}</div>
      <h2>${T('tuto.end.t', portName(tutoPort()))}</h2>
      <div class="place">${T('tuto.end.s')}</div>
      <div class="after"><span>${T('tuto.end.more')}</span><p>${T('tuto.end.text')}</p></div>
      <nav class="main-list">
        <button class="item" data-item="0"><span class="bar"></span><span class="t">${T('tuto.go')}</span></button>
        <button class="item" data-item="1"><span class="bar"></span><span class="t">${T('tuto.again')}</span></button>
        <button class="item" data-item="2"><span class="bar"></span><span class="t">${T('menu.main')}</span></button>
      </nav>
    </div>
    ${hints()}`, { go: [corsaireMenu, startCorsaireTuto, showTitle], back: null });
}

addStr({
  'tuto.item': ['Didacticiel', 'Tutorial', 'チュートリアル'],
  'tuto.item.d': ['Une dizaine de minutes pour apprendre le corsaire, pas à pas : la barre, les coffres, le chantier, la bordée, l\'enfilade, l\'abordage, le combat et la prise d\'un port. Rien ne s\'y enregistre.', 'Ten minutes or so to learn the corsair, step by step: the helm, the chests, the shipyard, the broadside, raking fire, boarding, a fight and the taking of a port. Nothing is saved.', '十分ほどで、コルセアを一歩ずつ覚える。舵、箱、造船所、舷側斉射、縦射、斬り込み、戦い、そして港の奪取。何も記録されない。'],
  'tuto.title': ['Didacticiel du corsaire', 'Corsair tutorial', 'コルセアのチュートリアル'],
  'tuto.title2': ['Hakodate, sur une coque de noix', 'Hakodate, in a nutshell', '箱館、くるみの殻で'],
  'tuto.hud': ['Didacticiel', 'Tutorial', 'チュートリアル'],
  'tuto.k': ['Didacticiel · {0} / {1}', 'Tutorial · {0} / {1}', 'チュートリアル・{0}/{1}'],
  'tuto.done': ['bien !', 'well done!', 'よし！'],
  'tuto.zone': ['au large', 'the open sea', '沖'],
  'tuto.battery': ['batterie de {0}', 'battery of {0}', '{0}の砲台'],
  'tuto.sail': ['La barre et la machine. ↑ fait route (encore une fois : en avant toute), ↓ ralentit puis stoppe, ← → gouvernent. Gagnez le cercle doré, au large.', 'Helm and engine. ↑ gets under way (press again: full ahead), ↓ slows down and stops, ← → steer. Reach the gold circle out at sea.', '舵と機関。↑で前進（もう一度で全速）、↓で減速し停止、← →で舵を取る。沖の金の円へ向かえ。'],
  'tuto.g.sail': ['Gagnez le cercle doré, au large', 'Reach the gold circle out at sea', '沖の金の円へ向かえ'],
  'tuto.chest': ['Les coffres. De l\'or flotte çà et là ; les flèches dorées montrent les coffres les plus proches. Passez dessus pour les repêcher : l\'or paie le chantier.', 'Chests. Gold floats here and there; the gold arrows point to the nearest chests. Sail over them to fish them up: gold pays for the shipyard.', '箱。小判があちこちに漂っている。金の矢印が近くの箱を示す。上を通れば拾える。小判で造船所の代金を払う。'],
  'tuto.g.chest': ['Repêchez le coffre', 'Pick up the chest', '箱を拾え'],
  'tuto.yard': ['Le chantier. Rentrez à Hakodate, dans le cercle vert, et frappez Entrée : on y répare, et l\'on y arme son navire.', 'The shipyard. Return to Hakodate, into the green circle, and press Enter: there you repair, and fit out your ship.', '造船所。箱館の緑の円に戻り、Enterを押せ。ここで修理し、船を艤装する。'],
  'tuto.g.yard': ['Entrée, dans le cercle vert de Hakodate', 'Enter, in Hakodate\'s green circle', '箱館の緑の円でEnter'],
  'tuto.yard.msg': ['Didacticiel : ← → jusqu\'à l\'atelier « artillerie », ↑ ↓ sur « Canons en bordée », Entrée pour acheter (deux crans si l\'or suffit). Puis « Prendre la mer ».', 'Tutorial: ← → to the "guns" workshop, ↑ ↓ to "Broadside guns", Enter to buy (two steps if the gold allows). Then "Set sail".', 'チュートリアル：← →で「砲術」の工房へ、↑ ↓で「舷側砲」、Enterで購入（小判が足りれば二段）。それから「出航する」。'],
  'tuto.yard.again': ['Il vous faut au moins un cran de « Canons en bordée » : rouvrez le chantier (Entrée, dans le cercle vert).', 'You need at least one step of "Broadside guns": open the shipyard again (Enter, in the green circle).', '「舷側砲」が少なくとも一段必要だ。もう一度造船所を開け（緑の円でEnter）。'],
  'tuto.broad': ['La bordée. Un transport ennemi, le Hiryū, croise au large. Mettez-le par le travers, à droite ou à gauche de votre navire, et frappez Espace : la bordée part du bord qui le regarde.', 'The broadside. An enemy transport, the Hiryū, is cruising offshore. Bring her abeam, to the right or left of your ship, and press Space: the broadside fires from the side facing her.', '舷側斉射。敵の輸送船・飛龍が沖を行く。自分の船の左右どちらかの真横に捉え、スペースを押せ。敵に向いた舷の砲が火を噴く。'],
  'tuto.g.broad': ['Touchez le Hiryū par le travers (Espace)', 'Hit the Hiryū abeam (Space)', '飛龍を真横から撃て（スペース）'],
  'tuto.rake': ['L\'enfilade. Un boulet qui prend un navire dans toute sa longueur, par l\'avant ou par l\'arrière, fait double mal. Passez devant l\'étrave du Hiryū ou derrière sa poupe, et tirez.', 'Raking fire. A ball that strikes a ship along her whole length, from ahead or astern, does double damage. Cross the Hiryū\'s bow or stern, and fire.', '縦射。艦首か艦尾から船体の縦に沿って当たった弾は二倍の損害を与える。飛龍の艦首の前か艦尾の後ろを横切って撃て。'],
  'tuto.g.rake': ['Prenez le Hiryū en enfilade', 'Rake the Hiryū', '飛龍を縦射せよ'],
  'tuto.tip.rake': ['Astuce : mettez-vous dans son sillage, l\'étrave sur sa poupe, et tirez : vos pièces de chasse le prennent dans toute sa longueur.', 'Tip: get into her wake, your bow on her stern, and fire: your chase guns strike her along her whole length.', 'こつ：航跡に入り、艦首を敵の艦尾に向けて撃て。艦首砲が船体を縦に貫く。'],
  'tuto.board': ['L\'abordage. Venez bord à bord avec le Hiryū : une réglette paraît au-dessus de votre navire. Frappez Entrée quand le curseur passe dans l\'or ; un coup juste fait avancer l\'abordage, un coup raté le recule.', 'Boarding. Come alongside the Hiryū: a gauge appears above your ship. Press Enter when the cursor crosses the gold; a good stroke drives the boarding on, a miss drives it back.', '斬り込み。飛龍に舷を寄せよ。船の上にゲージが出る。カーソルが金色を通るときにEnter。当たれば斬り込みが進み、外せば押し戻される。'],
  'tuto.g.board': ['Abordez le Hiryū (Entrée dans l\'or)', 'Board the Hiryū (Enter in the gold)', '飛龍に斬り込め（金色でEnter）'],
  'tuto.tip.board': ['Astuce : il faut toucher sa coque. Rangez-vous le long de lui, à petite allure, puis frappez Entrée au bon moment.', 'Tip: you must touch her hull. Come up alongside at low speed, then press Enter at the right moment.', 'こつ：船体に触れる必要がある。低速で横に並び、よい瞬間にEnterを押せ。'],
  'tuto.fight': ['Le combat. Une canonnière, le Mōshun, vient sur vous ; elle riposte, et cherche à passer devant votre étrave ou derrière votre poupe. Gardez-la par le travers, et coulez-la ou abordez-la. La prise rapporte deux fois son or.', 'A fight. A gunboat, the Mōshun, is coming for you; she fires back, and tries to cross your bow or your stern. Keep her abeam, and sink her or board her. A prize brings twice her gold.', '戦い。砲艦・孟春が向かってくる。撃ち返し、こちらの艦首か艦尾を横切ろうとする。真横に捉え、沈めるか斬り込め。拿捕すれば小判は二倍だ。'],
  'tuto.g.fight': ['Coulez ou prenez le Mōshun', 'Sink or take the Mōshun', '孟春を沈めるか拿捕せよ'],
  'tuto.tip.fight': ['Astuce : si votre coque faiblit, rentrez à Hakodate (cercle vert) : on y répare, et le Mōshun ne vous y suit pas.', 'Tip: if your hull is weakening, go back to Hakodate (green circle): you repair there, and the Mōshun will not follow you in.', 'こつ：船体が弱ったら箱館（緑の円）へ戻れ。修理ができ、孟春は追って来ない。'],
  'tuto.port': ['Prendre un port. Matsumae est tout près : faites taire sa batterie au canon, en la passant par le travers. Son château tire par-dessus la ville jusqu\'à ce qu\'elle soit prise : ne traînez pas sous ses murs.', 'Taking a port. Matsumae is close by: silence its battery with your guns, passing it abeam. Its castle fires over the town until the town is taken: do not linger under its walls.', '港を取る。松前はすぐそばだ。砲台を真横に捉えて砲で黙らせよ。城は町が取られるまで屋根越しに撃ってくる。城下でぐずぐずするな。'],
  'tuto.g.port': ['Faites taire la batterie de Matsumae', 'Silence the battery of Matsumae', '松前の砲台を黙らせよ'],
  'tuto.tip.port': ['Astuce : tournez au large de la batterie, à deux cents mètres environ, en la gardant par le travers ; toute la bordée part sur elle.', 'Tip: circle off the battery, about two hundred metres out, keeping it abeam; the whole broadside goes into it.', 'こつ：砲台の沖、二百メートルほどを回り、真横に捉え続けよ。舷側の砲がすべて砲台に向かう。'],
  'tuto.land': ['Le débarquement. Approchez de la plage devant la ville, dans le cercle doré, et stoppez : vos chaloupes mettent les hommes à terre. Rien ne se fait tant qu\'un navire ennemi armé est à portée de la plage.', 'The landing. Close the beach in front of the town, in the gold circle, and stop: your boats put the men ashore. Nothing happens while an armed enemy ship is within range of the beach.', '上陸。町の前の浜、金の円に近づいて停船せよ。ボートが兵を上陸させる。武装した敵艦が浜の射程内にいる間は何も進まない。'],
  'tuto.g.land': ['Stoppez dans le cercle doré : le débarquement', 'Stop in the gold circle: the landing', '金の円で停船：上陸'],
  'tuto.tip.land': ['Astuce : ↓ jusqu\'à « Stoppé » ; la jauge du débarquement se remplit au-dessus de votre navire.', 'Tip: ↓ until "Stopped"; the landing gauge fills above your ship.', 'こつ：「停止」まで↓。船の上で上陸のゲージが満ちていく。'],
  'tuto.end.t': ['{0} est à vous', '{0} is yours', '{0}を占領'],
  'tuto.end.s': ['le didacticiel est fini', 'the tutorial is over', 'チュートリアル終了'],
  'tuto.end.more': ['La suite, en traversée', 'What comes next, on a voyage', '本番の航海では'],
  'tuto.end.text': ['Dans vos ports, on répare, on refait le plein de vivres et de charbon (la jauge ambrée), on touche le tribut et l\'on fortifie la batterie : l\'ennemi enverra des escadres les reprendre. Les grandes villes ont des mortiers : changez de cap quand le cercle rouge se resserre ; cinq d\'entre elles ont un arsenal, où armer d\'autres navires, qui vous suivent en ligne de file. Les ports sans mortiers ni château lâchent des brûlots : évitez-les, ou brisez-les au canon. Plus votre navire et votre domaine grandissent, plus l\'ennemi est fort, et plus ses navires sont grands. Au chantier, chaque pièce a son histoire. Bon vent !', 'In your ports you repair, take on stores and coal (the amber gauge), collect tribute and fortify the battery: the enemy will send squadrons to take them back. The great cities have mortars: change course when the red circle tightens; five of them have an arsenal, to fit out more ships, which follow you in line ahead. The ports with neither mortars nor castle send out fireships: avoid them, or break them with your guns. The more your ship and your domain grow, the stronger the enemy, and the bigger his ships. At the shipyard, every part has its story. Fair winds!', '自分の港では修理し、食糧と石炭を積み（琥珀色のゲージ）、貢ぎ物を受け取り、砲台を固める。敵は艦隊を送って取り返しに来る。大きな町には臼砲がある。赤い円が縮んだら針路を変えよ。そのうち五つの町には工廠があり、さらに艦を艤装でき、その艦は単縦陣で後に続く。臼砲も城もない港は火船を出す。避けるか、砲で砕け。船と領地が大きくなるほど敵も強くなり、敵艦も大きくなる。造船所では、どの部品にも歴史がある。順風を！'],
  'tuto.go': ['Commencer une traversée', 'Start a voyage', '航海を始める'],
  'tuto.again': ['Recommencer le didacticiel', 'Start the tutorial again', 'チュートリアルをやり直す'],
});
