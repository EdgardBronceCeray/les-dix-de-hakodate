'use strict';

/* ---------- le chantier du corsaire ----------
 * Le mode corsaire met en scène les navires de l'époque : on part de Hakodate sur une coque de
 * noix, et l'on fait de son navire ce qu'on veut, pièce par pièce, au chantier d'un port à soi
 * (Hakodate, ou un port qu'on a pris) : une coque plus grande, des mâts, une voile de plus à
 * chaque cran, des canons, une chaudière et ses cheminées, jusqu'à trois paires de roues à aubes, des
 * plaques de cuirasse, un éperon, des abordeurs, une mitrailleuse. Chaque cran coûte plus cher que
 * le précédent ; on paie en pièces d'or. Le navire change sous les yeux à chaque achat. On y
 * fortifie aussi le port lui-même. Sous la liste, un cartel dit ce qu'était chaque pièce à
 * l'époque (les faits sont vérifiés ; les dates sont grégoriennes). */

/* les coques : de la coque de noix à la frégate ; ce qu'elles portent, et leur tenue à la gîte
 * (stab : au-dessus de 1, un virage serré tenu à pleine allure finit par coucher le navire) */
const YARD_HULLS = [
  { L: 16, B: 4.6, hull: 70, turn: 3.9, base: 130, stab: 1.25, masts: 2, guns: 2, wheels: 1, name: { fr: 'coque de noix', en: 'nutshell', ja: 'くるみの殻' } },
  { L: 22, B: 5.6, hull: 100, turn: 3.5, base: 140, stab: 1.18, masts: 2, guns: 3, wheels: 2, name: { fr: 'cotre', en: 'cutter', ja: 'カッター' } },
  { L: 30, B: 6.6, hull: 140, turn: 3.1, base: 150, stab: 1.08, masts: 3, guns: 4, wheels: 2, name: { fr: 'goélette', en: 'schooner', ja: 'スクーナー' } },
  { L: 40, B: 8.2, hull: 190, turn: 2.7, base: 160, stab: 0.8, masts: 3, guns: 5, wheels: 3, name: { fr: 'brick', en: 'brig', ja: 'ブリッグ' } },
  { L: 52, B: 9.6, hull: 255, turn: 2.35, base: 170, stab: 0.72, masts: 4, guns: 6, wheels: 3, name: { fr: 'corvette', en: 'corvette', ja: 'コルベット' } },
  { L: 66, B: 11.2, hull: 330, turn: 2.05, base: 180, stab: 0.64, masts: 4, guns: 7, wheels: 3, name: { fr: 'frégate', en: 'frigate', ja: 'フリゲート' } },
];

/* les ateliers du chantier, et leurs pièces : leurs crans, et ce que coûte chaque cran (w : l'atelier) */
const YARD_SHOPS = ['coque', 'arme', 'machine', 'defense', 'equipage'];
const YARD_PARTS = [
  { id: 'coque', w: 0, max: 5, cost: [120, 280, 520, 900, 1450] },
  { id: 'mats', w: 0, min: 1, max: (c) => YARD_HULLS[c.coque].masts, cost: [120, 300, 650] },
  { id: 'voiles', w: 0, max: 10, cost: [60, 130, 230, 360, 520, 700, 900, 1150, 1450, 1800] },
  { id: 'doublage', w: 0, max: 3, cost: [150, 380, 760] },
  { id: 'gouvernail', w: 0, max: 4, cost: [70, 160, 300, 500] },
  { id: 'canons', w: 1, max: (c) => YARD_HULLS[c.coque].guns, cost: [50, 100, 170, 260, 370, 500, 650] },
  { id: 'calibre', w: 1, max: 6, cost: [120, 260, 450, 700, 1000, 1400] },
  { id: 'canonniers', w: 1, max: 5, cost: [90, 200, 360, 580, 860] },
  { id: 'chasse', w: 1, max: 3, cost: [90, 220, 420] },
  { id: 'gatling', w: 1, max: 3, cost: [420, 700, 1100] },
  { id: 'chaudiere', w: 2, max: 3, cost: [150, 340, 600] },
  { id: 'machine', w: 2, max: 5, cost: [160, 340, 580, 900, 1300], needs: 'chaudiere' },
  { id: 'roues', w: 2, max: (c) => (c.chaudiere ? YARD_HULLS[c.coque].wheels : 0), cost: [200, 450, 800], needs: 'chaudiere' },
  { id: 'helice', w: 2, max: 3, cost: [220, 480, 850], needs: 'chaudiere' },
  { id: 'cuirasse', w: 3, max: 8, cost: [100, 210, 350, 540, 800, 1100, 1450, 1900] },
  { id: 'eperon', w: 3, max: 3, cost: [320, 780, 1500] },
  { id: 'pompes', w: 3, max: 5, cost: [110, 240, 420, 660, 960] },
  { id: 'abordeurs', w: 4, max: 6, cost: [80, 180, 340, 540, 800, 1100] },
  { id: 'chaloupes', w: 4, max: 5, cost: [60, 140, 260, 420, 640] },
  { id: 'cales', w: 4, max: 5, cost: [70, 160, 290, 470, 720] },
  { id: 'vigie', w: 4, max: 3, cost: [90, 220, 420] },
];
/* les pièces de la bordée selon le calibre : canons lisses, plus lourds, obusiers, rayés, Armstrong */
const YARD_GUNS = { small: ['p12', 'p18', 'p24', 'r40', 'r40', 'a70', 'a70'], big: ['p24', 'p30', 'p68', 'r40', 'r50', 'a70', 'a70'] };

/* la peinture : gratuite, au choix */
const YARD_PAINTS = [
  { hull: '#2a2622', stripe: '#c9a85a', deck: '#b59a72', name: { fr: 'noir et or', en: 'black and gold', ja: '黒と金' } },
  { hull: '#7a1e1a', stripe: '#e8d9b0', deck: '#b59a72', name: { fr: 'rouge laqué', en: 'red lacquer', ja: '朱塗り' } },
  { hull: '#1f3a2e', stripe: '#d8b860', deck: '#a8916c', name: { fr: 'vert bouteille', en: 'bottle green', ja: '深緑' } },
  { hull: '#e6decb', stripe: '#2a2a2e', deck: '#b8a07a', name: { fr: 'blanc de céruse', en: 'lead white', ja: '白' } },
  { hull: '#26324a', stripe: '#d0d6dc', deck: '#a8916c', name: { fr: 'bleu de Prusse', en: 'Prussian blue', ja: '紺青' } },
  { hull: '#5a3a1e', stripe: '#e0b04a', deck: '#c0a070', name: { fr: 'bois verni', en: 'varnished wood', ja: '木地' } },
  { hull: '#3a3f43', stripe: '#b07a40', deck: '#8a8a84', name: { fr: 'fer et cuivre', en: 'iron and copper', ja: '鉄と銅' } },
];

function yardNew() { return { coque: 0, mats: 1, voiles: 0, canons: 0, chasse: 0, chaudiere: 0, roues: 0, cuirasse: 0, eperon: 0, abordeurs: 0, gatling: 0, paint: 0, doublage: 0, gouvernail: 0, calibre: 0, canonniers: 0, machine: 0, helice: 0, pompes: 0, chaloupes: 0, cales: 0, vigie: 0 }; }
const yardPart = (id) => YARD_PARTS.find((p) => p.id === id);
const yardMax = (p, c) => (typeof p.max === 'function' ? p.max(c) : p.max);
/* le prix du cran suivant, ou null si la pièce est au plus haut ; la difficulté le multiplie */
function yardCost(p, c) {
  const lv = c[p.id];
  if (lv >= yardMax(p, c)) return null;
  return Math.round(p.cost[Math.min(p.cost.length - 1, lv - (p.min || 0))] * corsD().price / 5) * 5;
}

/* les qualités du navire, tirées de ses pièces */
function yardStats(c) {
  const H = YARD_HULLS[c.coque];
  const v = c.voiles, cu = c.cuirasse;
  /* la toile : une voile de plus à chaque cran, plus haute et plus petite que la précédente ; le
   * premier cran rapporte 0,18 de la toile de départ, et chacun 0,014 de moins que le précédent */
  const sail = 26 * c.mats * (1 + 0.18 * v - 0.007 * v * (v - 1));
  /* la vapeur : roues, hélice, et une machine meilleure qui pousse le tout */
  const steam = (34 * c.chaudiere + 42 * c.roues + (c.chaudiere ? 24 * c.helice : 0)) * (1 + 0.1 * c.machine);
  const weight = 14 * Math.min(cu, 5) + 10 * Math.max(0, cu - 5) + 3 * c.canons + 4 * c.gatling + 2 * c.calibre;
  /* le doublage de cuivre : une carène propre file mieux */
  const raw = (H.base + sail + steam - weight) * (1 + 0.04 * c.doublage);
  return {
    speed: clamp(raw <= 470 ? raw : 470 + (raw - 470) * 0.5, 90, 540),
    /* les roues à aubes : une barre vive ; un voilier vire plus posément ; le gouvernail aide */
    turn: H.turn * (c.roues ? 1 + 0.12 * c.roues : 0.88) * (1 - 0.04 * Math.min(cu, 5) - 0.02 * Math.max(0, cu - 5)) * (c.eperon ? 0.97 : 1) * (1 + 0.06 * c.gouvernail),
    /* la tenue à la gîte : la toile et les mâts couchent le navire ; les tambours des roues,
     * la cuirasse et la machine, bas dans la coque, le tiennent droit */
    stab: H.stab * (1 + 0.02 * v + 0.03 * (c.mats - 1)) * Math.pow(0.75, c.roues) * (1 - 0.025 * cu) * (1 - 0.02 * c.chaudiere),
    hull: Math.round(H.hull * (1 + 0.1 * cu)),
    armor: 1 - 0.1 * Math.min(cu, 5) - 0.04 * Math.max(0, cu - 5),
    chase: 1 + Math.min(2, c.chasse),
    stern: c.chasse >= 3 ? 2 : 0,
    broad: c.canons,
    ram: !!c.eperon,
    /* l'éperon : chaque cran frappe plus fort */
    ramK: c.eperon ? 1.3 + 0.2 * c.eperon : 1,
    gatling: !!c.gatling,
    /* la Gatling : cadence et portée */
    gatK: 1 + 0.45 * Math.max(0, c.gatling - 1), gatR: 320 + 50 * Math.max(0, c.gatling - 1),
    /* le calibre : chaque coup fait plus de mal et porte plus loin ; les canonniers rechargent vite */
    dmgK: 1 + 0.12 * c.calibre, rangeK: 1 + 0.05 * c.calibre, coolK: Math.max(0.65, 1 - 0.07 * c.canonniers),
    /* les pompes et les charpentiers : la coque se refait en mer, par seconde, jusqu'aux trois quarts */
    regen: 0.003 * c.pompes,
    /* le poids du navire, pour les chocs : la coque, le fer, les pièces, la machine */
    mass: H.L * H.B * 0.6 + 16 * cu + 4 * c.canons + 3 * c.calibre + 10 * c.chaudiere + 8 * c.roues + 6 * c.helice + 20 * c.eperon,
    /* l'autonomie : combien de secondes les vivres tiennent en mer (une plus grande coque a
     * de plus grandes cales), et le charbon d'une soute pleine à toute vapeur ; une meilleure
     * machine en brûle moins */
    vivresT: 200 * (1 + 0.15 * c.coque) * (1 + 0.2 * c.cales),
    coalT: 120 * (1 + 0.2 * c.coque) / (1 + 0.35 * Math.max(0, c.chaudiere - 1) + 0.3 * c.roues + 0.15 * c.helice) * (1 + 0.12 * c.machine) * (1 + 0.2 * c.cales),
  };
}

/* deux mâts ou plus sur une coque de brick ou plus grande : des voiles carrées ; sinon, des voiles
 * auriques (cotre, goélette), avec des voiles carrées au mât de l'avant */
const yardSquare = (c) => c.mats >= 2 && c.coque >= 3;

/* ce que chaque cran de voiles ajoute, du premier au dixième (les rangs de la mâture, ships3d.js) :
 * 'yard.sq.N' sur un navire à voiles carrées, 'yard.sf.N' sur un cotre ou une goélette */
function yardSailDesc(c) {
  const v = c.voiles, sq = yardSquare(c), sep = LANG === 'ja' ? '' : ' ';
  if (v >= 10) return T('yard.d.voiles') + sep + T('yard.s.all');
  /* un cotre n'a qu'une voile aurique, et donc qu'une flèche ; sur une goélette, le hunier carré
   * remplace la flèche du mât de misaine */
  const key = sq ? 'yard.sq.' + (v + 1) : v === 0 && c.mats === 1 ? 'yard.sf.1a' : v === 1 && c.mats > 1 ? 'yard.sf.2a' : 'yard.sf.' + (v + 1);
  return T('yard.d.voiles') + sep + T('yard.s.next', T(key));
}

/* où vont les mâts, les cheminées et les roues sur la longueur (en fraction de la coque) */
function yardLayout(c) {
  const masts = [[0.08], [0.24, -0.22], [0.3, 0.02, -0.28], [0.33, 0.11, -0.11, -0.31]][c.mats - 1].slice();
  let pads = [[], [0.0], [0.18, -0.15], [0.27, 0.03, -0.24]][c.roues].slice();
  /* une roue ne se met pas au pied d'un mât : sa passerelle le couperait */
  pads = pads.map((p) => { const m = masts.find((x) => Math.abs(x - p) < 0.07); return m === undefined ? p : p + (p > m ? 0.07 : -0.07); });
  /* les cheminées dans les plus grands vides de l'axe */
  const funnels = [];
  for (let i = 0; i < c.chaudiere; i++) {
    const xs = [0.36, ...masts, ...funnels, -0.36].sort((a, b) => b - a);
    let best = 0, at = 0;
    for (let k = 0; k < xs.length - 1; k++) { const g = xs[k] - xs[k + 1]; if (g > best) { best = g; at = (xs[k] + xs[k + 1]) / 2; } }
    funnels.push(at);
  }
  return { masts, pads, funnels };
}

/* un navire de la flotte, tel que le chantier l'a fait (n : son nom, voir fleet.js) */
function yardSpec(c, n) {
  const H = YARD_HULLS[c.coque], st = yardStats(c), lay = yardLayout(c), paint = YARD_PAINTS[c.paint % YARD_PAINTS.length];
  const N = FLEET_NAMES[n || 0] || FLEET_NAMES[0];
  /* la coque suit ce qu'elle porte : de grandes cales l'allongent et la haussent, une batterie plus
   * nombreuse veut un pont plus long, le fer l'élargit ; au-delà du caisson, la cuirasse l'abaisse */
  const L = H.L * (1 + 0.03 * c.cales + 0.012 * c.canons), B = H.B * (1 + 0.012 * c.cuirasse + 0.01 * c.cales);
  const fbK = (1 + 0.035 * c.cales) * (c.cuirasse > 5 ? 1 - 0.035 * (c.cuirasse - 5) : 1);
  /* les embarcations : celles de la coque, plus une par cran de chaloupes ; aux bossoirs, loin des
   * tambours des roues et du pied des mâts */
  const boats = Math.min([1, 2, 3, 4, 6, 6][c.coque], [0, 0, 2, 2, 2, 4][c.coque] + c.chaloupes);
  const blen = clamp(L * 0.09, 4.5, 6.8), Rb = clamp(B * 0.42, 2.4, 4.4) + 0.35;
  const boatX = [];
  const boatOk = (f) => Math.abs(f) <= 0.38 && lay.pads.every((p) => Math.abs(f - p) * L > Rb + blen / 2 + 1.2) && lay.masts.every((m) => Math.abs(f - m) * L > blen / 2 - 1) && boatX.every((q) => Math.abs(f - q) * L > blen + 1);
  for (const f0 of [-0.26, 0.16, -0.05, 0.3, -0.36]) {
    if (boatX.length >= Math.ceil(boats / 2)) break;
    for (const d of [0, 0.01, -0.01, 0.02, -0.02, 0.03, -0.03, 0.04, -0.04, 0.05, -0.05]) if (boatOk(f0 + d)) { boatX.push(f0 + d); break; }
  }
  const armament = [], cal = Math.min(6, c.calibre || 0);
  if (st.broad) armament.push({ type: (c.coque >= 3 ? YARD_GUNS.big : YARD_GUNS.small)[cal], mount: 'broad', n: st.broad * 2, span: Math.min(0.62, 0.22 + 0.07 * st.broad), x: -0.02 });
  armament.push({ type: cal >= 6 && c.coque >= 4 ? 'a300' : cal >= 5 ? 'a70' : cal >= 3 ? 'r40' : c.coque >= 2 ? 'p24' : 'how', mount: 'pivot', x: 0.37, n: st.chase });
  const square = yardSquare(c);
  return {
    id: 'corsaire', custom: true, name: LANG === 'en' ? N.en : N.fr, jp: N.ja, faction: 'ezo', kind: H.name,
    L, B, speed: st.speed, turn: st.turn, hull: st.hull, armor: st.armor, chase: st.chase, broad: st.broad, stern: st.stern,
    ram: st.ram, gatling: st.gatling, flag: 'corsair', stab: st.stab, coalT: st.coalT, vivresT: st.vivresT,
    ramK: st.ramK, gatK: st.gatK, gatR: st.gatR, dmgK: st.dmgK, rangeK: st.rangeK, coolK: st.coolK, regen: st.regen, mass: st.mass,
    prop: c.chaudiere ? (c.roues ? 'paddle' : 'screw') : 'none',
    rig: square ? 'square' : 'fore', sailKind: square ? 'square' : 'fore', sailMaxInit: 3, sailLv: c.voiles,
    armament,
    look: {
      /* la mâture s'élance un peu à chaque cran de voiles ; c'est surtout le nombre des voiles qui grandit */
      custom: true, masts: lay.masts, sailK: 1 + 0.015 * c.voiles, sailLv: c.voiles,
      paddle: lay.pads.length ? lay.pads : undefined, paddleR: clamp(B * 0.42, 2.4, 4.4),
      funnel: lay.funnels.length ? lay.funnels : undefined,
      /* la machine : des cheminées plus hautes et plus larges à chaque cran */
      funnelH: clamp(L * 0.13, 6, 10) * (1 + 0.1 * c.machine), funnelR: clamp(B * 0.085, 0.7, 1.15) * (1 + 0.05 * c.machine),
      boats: Math.min(boats, 2 * boatX.length), boatX, bowsprit: 0.12 + 0.02 * c.coque, figurehead: true, hammocks: c.coque >= 4,
      ram: st.ram, ramLv: c.eperon, plates: c.cuirasse, gatling: st.gatling, gatlings: c.gatling, stern: st.stern, fbK,
      screw: c.chaudiere ? c.helice : 0, rudder: c.gouvernail, pumps: c.pompes, vigie: c.vigie,
      boarders: c.abordeurs, gunners: c.canonniers,
      hull: paint.hull, stripe: paint.stripe, deck: paint.deck, copper: c.doublage || 0,
    },
    facts: [], note: { fr: '', en: '', ja: '' },
  };
}

/* le navire prend sa nouvelle forme : on garde l'état de la coque, et le modèle est refait */
function yardApply(me, c) {
  const frac = me.hullMax ? clamp(me.hull / me.hullMax, 0, 1) : 1;
  const sp = yardSpec(c, me.fleet ? me.fleet.n : 0);
  me.cfg = c; me.spec = sp;
  me.len = sp.L * SCALE; me.wid = sp.B * SCALE;
  me.hullMax = sp.hull; me.hull = Math.max(1, Math.round(sp.hull * frac));
  me.armor = sp.armor;
  me.guns = expandGuns(sp);
  me.sailMax = 3;
  if (me._m) { disposeObj(me._m); me._m = null; }
}

/* ---------- l'écran du chantier ----------
 * YARD.ship : le navire que le chantier montre et améliore (le vôtre, ou un autre de la flotte) ;
 * YARD.present : les navires de la flotte qui sont là (ceux qui vous suivent, ceux restés à quai) */

const YARD = { open: false, P: null, t: 0, msg: '', ship: null, present: [], shop: 0, view: 'rig' };

function yardOpen(P) {
  const me = G.me, C = G.cors;
  YARD.open = true; YARD.P = P; YARD.t = 0; YARD.msg = '';
  G.mode = 'menu';
  /* la flotte au mouillage du chantier, l'étrave au large ; les charpentiers remettent tout en état,
   * on remplit les soutes, on touche le tribut */
  YARD.present = fleetPresent(P);
  YARD.ship = me;
  fleetPlace(P, YARD.present);
  for (const s of YARD.present) {
    s.gite = 0; s.giteHold = 0; s.giteNear = false;
    s.hull = s.hullMax;
    /* venu se faire réparer : c'est fait, il reprend sa place dans la ligne */
    if (s.fleet && s.fleet.rep) { s.fleet.rep = false; s.fleet.arr = false; s.fleet.st = 'follow'; }
    if (s.fleet) s.fleet.eta = 0;
    /* au chantier, on montre toute la toile */
    s.yardShow = true;
  }
  C.auto = 1;
  if (C.tribute >= 1) { const n = Math.floor(C.tribute); C.tribute -= n; const got = corsGold(n, me.x, me.y, true); if (got) YARD.msg = T('yard.tribute', got); }
  C.board = null; C.landing = null; G.corsBar = null;
  /* l'annonce en cours s'efface : le chantier prend tout l'écran */
  HUD.bannerT = 0; el('banner').classList.remove('show');
  R3.camMode = 'cine'; R3.cine.snap = true;
  yardUpdate(0);
  Music.duck(true);
  yardRender(yardPick());
}

/* où mettre le curseur : sur une pièce qu'on peut payer dans l'atelier montré (sinon dans un autre),
 * et sur « Prendre la mer » quand la bourse ne permet plus rien */
function yardPick() {
  const s = YARD.ship || G.me, c = s.cfg, coins = G.cors.coins;
  const can = (p) => { const k = yardCost(p, c); return k !== null && k <= coins && !(p.needs && !c[p.needs]); };
  const here = YARD_PARTS.find((p) => p.w === YARD.shop && can(p));
  if (here) return 'p:' + here.id;
  const other = YARD_PARTS.find(can);
  if (other) { YARD.shop = other.w; return 'p:' + other.id; }
  return 'leave';
}

/* ← → sur la ligne « Atelier » (ou sur une pièce) : l'atelier suivant */
function yardShop(d, fromPart) {
  YARD.shop = (YARD.shop + d + YARD_SHOPS.length) % YARD_SHOPS.length;
  Snd.tick();
  const first = YARD_PARTS.find((p) => p.w === YARD.shop);
  yardRender(fromPart ? 'p:' + first.id : 'shop');
}

function yardClose() {
  const me = G.me, P = YARD.P, C = G.cors;
  YARD.open = false;
  C.tips.yardFirst = true;
  for (const s of YARD.present) s.yardShow = false;
  menuHide(); clearInput();
  if (landHit(me)) corsUnbeach(me);
  me.safe = [me.x, me.y, me.h];
  /* ceux qui restent à quai gardent leur poste ; les autres suivront votre sillage */
  for (const s of YARD.present) if (s.fleet) { s.fleet.bx = s.x; s.fleet.by = s.y; s.fleet.bh = s.h; }
  C.trail = [[me.x, me.y]];
  R3.camMode = 'game'; updateZoom(0, true);
  G.mode = 'play'; showHud(true);
  Music.duck(false);
  C.lastPort = P.id;
  /* Entrée tenue enfoncée ne rouvre pas aussitôt le chantier */
  C.yardCool = W.t + 0.8;
  corsScale(); corsZones();
  corsaireSave();
  floatText(me.x, me.y - 30, T('yard.done'), 'gold');
  /* la première fois : comment revenir au chantier */
  if (!C.tips.yard) { C.tips.yard = true; showOrders(T('yard.tip.k'), T('yard.tip'), 5); }
}

/* la caméra se tient au large, de trois quarts avant, va et vient lentement ; le navire reste
 * à droite de l'écran, au-dessus des qualités */
/* la vue de la coque, au chantier : distance (en longueurs), décalage, hauteur */
const YARD_HULLVIEW = { d: 2.5, d0: 16, side: 0.15, near: 0.27, y: 0.0, h: 0.46 };
function yardUpdate(dt) {
  if (!YARD.open || !G.me) return;
  const s = YARD.ship || G.me, C = R3.cine, P = YARD.P;
  YARD.t += dt;
  const sea = Math.atan2(P.hy - P.by, P.hx - P.bx);
  /* la vue suit ce qu'on choisit : la mâture et toute la toile pour les mâts, les voiles et la vigie ;
   * pour le reste, la coque, voiles serrées, de plus près et d'un peu plus haut */
  const rig = YARD.view === 'rig';
  for (const q of YARD.present) q.yardShow = rig || q !== s;
  /* assez loin pour la coque et pour toute la toile ; les mâts de flèche des contre-cacatois la haussent */
  const pole = s.spec.custom && s.spec.rig === 'square' ? (s.spec.sailLv >= 10 ? 1.14 : s.spec.sailLv >= 6 ? 1.08 : 1) : 1;
  const Lw = s.spec.L * SCALE, Hw = (0.55 * s.spec.L + 8) * (s.spec.look.sailK || 1) * pole * SCALE;
  /* toute la mâture, jusqu'à la pomme du grand mât, au-dessus des qualités ; la flottaison reste au même
   * endroit de l'écran */
  const d = rig ? Math.max(1.9 * Lw, 4.45 * Hw) + 20 : YARD_HULLVIEW.d * Lw + YARD_HULLVIEW.d0;
  /* du côté où il y a le plus d'eau */
  if (YARD.side === undefined || YARD.sideP !== P) {
    YARD.sideP = P;
    const water = (k) => { let n = 0; for (let i = 0; i < 6; i++) { const a = sea + k * (0.5 + i * 0.12); if (!G.mapLand(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d)) n++; } return n; };
    YARD.side = water(1) >= water(-1) ? 1 : -1;
  }
  let a = sea + YARD.side * (0.85 + Math.sin(YARD.t * 0.11) * 0.32);
  /* jamais au-dessus des collines */
  for (let k = 0; k < 6 && G.mapLand(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d); k++) a = sea + (a - sea) * 0.6;
  const fx_ = s.x + Math.cos(a) * d, fz = s.y + Math.sin(a) * d;
  const dx = s.x - fx_, dz = s.y - fz, l = Math.hypot(dx, dz) || 1;
  /* on vise un peu à gauche du navire et un peu en deçà : il se tient à droite, et haut */
  const V = rig ? { side: 0.19, near: 0.2, y: Hw * 0.25, h: 0.4 } : { side: YARD_HULLVIEW.side, near: YARD_HULLVIEW.near, y: YARD_HULLVIEW.y * Lw, h: YARD_HULLVIEW.h };
  const side = d * V.side, near = d * V.near;
  C.at.set(s.x - (-dz / l) * side - (dx / l) * near, V.y, s.y - (dx / l) * side - (dz / l) * near);
  C.from.set(fx_, d * V.h, fz);
  C.focus = d * 1.02; C.dof = 0.7;
  if (dt) {
    for (const q of YARD.present) if (q.spec.prop !== 'none') { q.throttle = 0.15; emitShip(q, dt); q.throttle = 0; }
    updateParts(dt);
  }
}

/* les lignes du chantier : le navire montré (s'il y en a plusieurs), ses pièces, sa peinture, ce
 * qu'il fait (mener, suivre ou rester à quai), l'arsenal, les fortifications du port, le départ */
function yardRows() {
  const C = G.cors, P = YARD.P, s = YARD.ship || G.me, c = s.cfg, coins = Math.floor(C.coins);
  const pips = (lv, max, min) => { let o = ''; for (let i = min || 0; i < Math.max(max, lv); i++) o += `<i class="${i < lv ? 'on' : ''}"></i>`; return o; };
  const costTag = (cost) => `<span class="yc${cost > coins ? ' dear' : ''}"><b>${fmt0(cost)}</b></span>`;
  const R = [];
  const w = YARD.shop || 0, wid = YARD_SHOPS[w];
  if (YARD.present.length > 1) {
    const dots = YARD.present.map((q) => `<i class="${q === s ? 'on' : ''}${q === G.me ? ' flag' : ''}"></i>`).join('');
    R.push({ id: 'ship', cls: 'shiprow', inner: `<span class="yn">${T('yard.p.ship')}</span><span class="yp ships">${dots}</span><span class="yc max">‹ ${fleetName(s)} ›</span>`, go: () => yardShip(1), lr: (d) => yardShip(d), desc: T('yard.d.ship'), era: T('yard.e.ship') });
  }
  /* l'atelier montré : coque et voilure, artillerie, machine, défense, équipage */
  const era = (p) => (p.id === 'coque' ? T('yard.e.h' + Math.min(5, c.coque + 1)) : T('yard.e.' + p.id));
  const firstPart = YARD_PARTS.find((p) => p.w === w);
  const wdots = YARD_SHOPS.map((k, i) => `<i class="${i === w ? 'on' : ''}"></i>`).join('');
  R.push({ id: 'shop', cls: 'shoprow', inner: `<span class="yn">${T('yard.p.shop')}</span><span class="yp ships">${wdots}</span><span class="yc max">‹ ${T('yard.w.' + wid)} ›</span>`, go: () => yardShop(1), lr: (d) => yardShop(d), desc: T('yard.d.w.' + wid), era: era(firstPart) });
  for (const p of YARD_PARTS) {
    if (p.w !== w) continue;
    const cost = yardCost(p, c), max = yardMax(p, c), locked = p.needs && !c[p.needs];
    const right = locked ? `<span class="yc lock">${T('yard.needs.' + p.needs)}</span>` : cost === null ? `<span class="yc max">${T(max > (p.min || 0) ? 'yard.max' : 'yard.none')}</span>` : costTag(cost);
    /* le cartel : ce qu'était la pièce à l'époque ; pour la coque, celle qu'on achèterait */
    R.push({ id: 'p:' + p.id, inner: `<span class="yn">${T('yard.p.' + p.id)}</span><span class="yp${max - (p.min || 0) > 6 ? ' many' : ''}">${pips(c[p.id], max, p.min)}</span>${right}`, go: () => yardBuy(p), lr: (d) => yardShop(d, true), desc: p.id === 'voiles' ? yardSailDesc(c) : T('yard.d.' + p.id), era: era(p) });
  }
  const paint = YARD_PAINTS[c.paint % YARD_PAINTS.length];
  R.push({ id: 'paint', inner: `<span class="yn">${T('yard.p.paint')}</span><span class="yp paint"><i style="background:${paint.hull}"></i><i style="background:${paint.stripe}"></i></span><span class="yc max">‹ ${tx(paint.name)} ›</span>`, go: () => yardPaint(1), lr: (d) => yardPaint(d), desc: T('yard.d.paint'), era: T('yard.e.paint') });
  /* un autre navire de la flotte : on peut passer à son bord, ou le laisser à quai */
  if (s !== G.me) {
    R.push({ id: 'cmd', cls: 'fleetrow', inner: `<span class="yn">${T('yard.p.cmd', fleetNameDe(s))}</span>`, go: yardCommand, desc: T('yard.d.cmd', fleetNameDe(s), fleetName(G.me)), era: T('yard.e.cmd') });
    const stays = s.fleet.st === P.id;
    R.push({ id: 'station', cls: 'fleetrow', inner: `<span class="yn">${T('yard.p.station')}</span><span class="yp"></span><span class="yc max">‹ ${T(stays ? 'yard.st.stay' : 'yard.st.follow', portName(P))} ›</span>`, go: yardStation, lr: yardStation, desc: T('yard.d.station', portName(P)), era: T('yard.e.station') });
  }
  /* l'arsenal d'une grande ville : un navire de plus */
  if (CORS_ARSENALS.includes(P.id) && !C.bought[P.id] && C.fleet.length < FLEET_MAX && fleetFreeName() > 0) {
    const cost = fleetCost();
    R.push({ id: 'buy', cls: 'fleetrow buyrow', inner: `<span class="yn">${T('yard.p.buy', fleetNameN(fleetFreeName()))}</span><span class="yp"></span>${costTag(cost)}`, go: yardBuyShip, desc: T('yard.d.buy', portName(P)), era: T('yard.e.buy') });
  }
  /* le port lui-même : ses fortifications (Hakodate, avec le Goryōkaku et le fort de Benten, n'en a pas besoin) */
  if (P.role !== 'home') {
    const fc = fortCost(P);
    R.push({ id: 'fort', cls: 'fortrow', inner: `<span class="yn">${T('yard.p.fort', portName(P))}</span><span class="yp">${pips(P.fort, 3)}</span>${fc === null ? `<span class="yc max">${T('yard.max')}</span>` : costTag(fc)}`, go: yardFort, desc: T('yard.d.fort', portName(P)), era: T('yard.e.fort') });
  }
  R.push({ id: 'leave', cls: 'leave', inner: `<span class="yn">${T('yard.leave')}</span><span class="yk"><kbd>${T('k.enter')}</kbd></span>`, go: yardClose, desc: T(YARD.present.length > 1 ? 'yard.d.leave.n' : 'yard.d.leave'), era: T('yard.e.h' + c.coque) });
  return R;
}

function yardRender(sel) {
  const C = G.cors, P = YARD.P, s = YARD.ship || G.me, c = s.cfg, coins = Math.floor(C.coins), st = yardStats(c), H = YARD_HULLS[c.coque];
  /* l'autonomie affichée est celle de la difficulté : les vivres et le charbon y durent moins */
  const bk = corsD().burn;
  const R = yardRows();
  let i0 = typeof sel === 'number' ? sel : R.findIndex((r) => r.id === sel);
  if (i0 < 0) i0 = R.findIndex((r) => r.id === 'shop');
  const row = (r, i) => `<button class="item yrow${r.cls ? ' ' + r.cls : ''}" data-item="${i}"><span class="bar"></span>${r.inner}</button>`;
  const last = R.length - 1;
  /* la première fois : ce qu'on fait ici, et comment on en sort */
  const first = !G.cors.tips.yardFirst;
  const lr = T(YARD.present.length > 1 ? 'yard.lrKey' : 'yard.paintKey');
  const stat = (l, v, lo, hi, txt, bad) => `<div class="stat${bad ? ' bad' : ''}"><span>${l}</span><i><b style="width:${(clamp((v - lo) / (hi - lo), 0.04, 1) * 100).toFixed(0)}%"></b></i>${txt ? `<em>${txt}</em>` : ''}</div>`;
  const stabTxt = st.stab >= 1 ? T('yard.stab.risk') : st.stab >= 0.85 ? T('yard.stab.mid') : T('yard.stab.ok');
  const ars = CORS_ARSENALS.includes(P.id);
  const flagTag = s === G.me && YARD.present.length > 1 ? `<span class="flagtag">${T('yard.flag')}</span>` : '';
  menuShow('yard', `
    <div class="scrim left"></div>
    <div class="yard-panel">
      <div class="kicker">${T(ars ? 'yard.k.ars' : 'yard.k', portName(P))}</div>
      <h2>${fleetName(s, true)} <span class="jp">${tx(H.name)}</span>${flagTag}</h2>
      <div class="yard-coins"><b>${fmt0(coins)}</b><span>${T('yard.coins')}</span>${YARD.msg ? `<em>${YARD.msg}</em>` : ''}</div>
      <nav class="yard-list${R.length > 16 ? ' dense' : ''}">${R.slice(0, last).map(row).join('')}</nav>
      ${first ? `<p class="yard-first">${T('yard.first')}</p>` : ''}
      <div class="yard-go">${row(R[last], last)}</div>
      <div class="yard-era"><div class="kicker">${T('yard.era')}</div><p id="yard-era-t">${R[i0] ? R[i0].era : ''}</p></div>
    </div>
    <div class="yard-side">
      <div class="kicker">${T('yard.qual')}</div>
      <div class="stats">
        ${stat(T('ship.speed'), st.speed, 90, 540, '')}
        ${stat(T('ship.helm'), st.turn, 1.4, 4.5, c.roues ? T('yard.helm.wheels') : '')}
        ${stat(T('yard.stab'), 1.6 - st.stab, 0, 1.15, stabTxt, st.stab >= 1)}
        ${stat(T('ship.hull'), st.hull, 60, 600, fmt0(st.hull))}
        ${stat(T('yard.guns'), (st.broad * 2 + st.chase + st.stern + (st.gatling ? 2 : 0)) * st.dmgK / st.coolK, 1, 40, T('yard.gunsN', st.broad * 2, st.chase, st.stern))}
        ${stat(T('yard.armor'), 1 - st.armor, 0, 0.62, Math.round((1 - st.armor) * 100) + ' %')}
        ${stat(T('yard.auto'), st.vivresT / bk, 150, 450, T(c.chaudiere ? 'yard.autoTc' : 'yard.autoT', fmtMin(st.vivresT / bk), fmtMin(1 / ((1 / st.vivresT + 1 / st.coalT) * bk))))}
      </div>
      <p id="menu-desc" class="desc">${R[i0] ? R[i0].desc : ''}</p>
    </div>
    <div class="hints"><span><kbd>←</kbd><kbd>→</kbd> ${lr}</span><span><kbd>↑</kbd><kbd>↓</kbd> ${T('k.choose')}</span><span><kbd>${T('k.enter')}</kbd> ${T('yard.k.buy')}</span><span><kbd>${T('k.esc')}</kbd> ${T('yard.leave.k')}</span></div>`, {
    go: R.map((r) => r.go), back: yardClose, sel: i0, desc: R.map((r) => r.desc),
    lr: (d) => { const r = R[MENU.sel]; if (r && r.lr) r.lr(d); },
    onSel: (i) => { const e = el('yard-era-t'); if (e) e.textContent = R[i] ? R[i].era : ''; yardView(R[i]); },
  });
  yardView(R[MENU.sel]);
  /* la liste et le cartel se partagent la hauteur : si, au plus long des cartels, la liste déborde,
   * on la serre (une fois pour tout l'écran, pour que les lignes ne sautent pas d'un choix à l'autre) */
  const list = document.querySelector('.yard-list'), era = el('yard-era-t');
  if (list && era && !list.classList.contains('dense')) {
    const cur = era.textContent;
    era.textContent = R.reduce((a, r) => (r.era && r.era.length > a.length ? r.era : a), '');
    if (list.scrollHeight > list.clientHeight + 1) list.classList.add('dense');
    era.textContent = cur;
    const n = MENU.items[MENU.sel];
    if (n && n.scrollIntoView) n.scrollIntoView({ block: 'nearest' });
  }
}

/* ce que montre la caméra du chantier : la mâture pour les mâts, les voiles et la vigie (et la ligne
 * de l'atelier de la coque et de la voilure), la coque pour tout le reste */
function yardView(r) {
  YARD.view = r && (/^p:(mats|voiles|vigie)$/.test(r.id) || (r.id === 'shop' && YARD.shop === 0)) ? 'rig' : 'hull';
}

const fmtMin = (s) => { const m = Math.round(s / 30) / 2; return (LANG === 'fr' ? String(m).replace('.', ',') : String(m)); };

function yardBuy(p) {
  const s = YARD.ship || G.me, c = s.cfg, C = G.cors, cost = yardCost(p, c);
  if (cost === null || (p.needs && !c[p.needs]) || cost > C.coins) { Snd.clang(0); return; }
  C.coins -= cost; C.spent += cost;
  c[p.id]++;
  yardApply(s, c);
  s.hull = s.hullMax;
  /* la coque a grandi : si elle touche la rive ou un voisin à son poste, chacun reprend sa place */
  if (YARD.P && (landHit(s) || YARD.present.some((o) => o !== s && hullGap(o, s) < 8))) fleetPlace(YARD.P, YARD.present);
  YARD.msg = '';
  Snd.crate(); Snd.levelUp();
  yardRender(yardPick() === 'leave' ? 'leave' : 'p:' + p.id);
}

function yardPaint(d) {
  const s = YARD.ship || G.me, c = s.cfg;
  c.paint = (c.paint + d + YARD_PAINTS.length) % YARD_PAINTS.length;
  yardApply(s, c);
  Snd.tick();
  yardRender('paint');
}

function yardFort() {
  const P = YARD.P, C = G.cors, cost = fortCost(P);
  if (cost === null || cost > C.coins) { Snd.clang(0); return; }
  C.coins -= cost;
  P.fort++;
  P.hpMax = fortHp(P); P.hp = P.hpMax;
  YARD.msg = '';
  Snd.crate(); Snd.levelUp();
  yardRender('fort');
}

/* ← → : le navire suivant de la flotte ; il prend le poste du chantier, sous la caméra */
function yardShip(d) {
  const L = YARD.present;
  if (L.length < 2) return;
  const i = L.indexOf(YARD.ship);
  YARD.ship = L[(i + d + L.length) % L.length];
  fleetPlace(YARD.P, [YARD.ship].concat(L.filter((q) => q !== YARD.ship)));
  R3.cine.snap = true; yardUpdate(0);
  Snd.tick();
  yardRender('ship');
}

/* passer à bord du navire montré : c'est lui que vous menez */
function yardCommand() {
  const s = YARD.ship;
  if (!s || s === G.me) return;
  fleetCommand(s);
  YARD.present = [s].concat(YARD.present.filter((q) => q !== s));
  YARD.msg = T('yard.cmd.done', fleetNameDe(s));
  Snd.bell(1);
  yardRender('ship');
}

/* il suit la flotte, ou il reste à quai dans ce port */
function yardStation() {
  const s = YARD.ship, P = YARD.P;
  if (!s || s === G.me) return;
  s.fleet.st = s.fleet.st === P.id ? 'follow' : P.id;
  s.fleet.rep = false; s.fleet.arr = false;
  Snd.tick();
  yardRender('station');
}

/* l'arsenal arme un navire de plus : il paraît au mouillage, et le chantier le montre */
function yardBuyShip() {
  const P = YARD.P;
  const s = fleetBuy(P);
  if (!s) { Snd.clang(0); return; }
  s.yardShow = true;
  YARD.present.push(s);
  YARD.ship = s;
  fleetPlace(P, [s].concat(YARD.present.filter((q) => q !== s)));
  R3.cine.snap = true; yardUpdate(0);
  YARD.msg = T('yard.bought', fleetName(s, true));
  Snd.crate(); Snd.levelUp(); Snd.bell(2);
  corsScale(); corsZones();
  YARD.shop = 0;
  yardRender('p:coque');
}

addStr({
  'yard.ship': ['Le Corsaire', 'The Corsair', 'コルセア号'],
  'yard.shipName': ['Corsaire', 'Corsair', 'コルセア号'],
  'yard.k': ['Le chantier de {0}', 'The shipyard of {0}', '{0}の造船所'],
  'yard.k.ars': ['L\'arsenal de {0}', 'The arsenal of {0}', '{0}の工廠'],
  'yard.flag': ['vous êtes à bord', 'you are aboard', '乗艦中'],
  'yard.lrKey': ['atelier, navire, peinture, consigne', 'workshop, ship, paint, orders', '工房・艦・塗装・命令'],
  'yard.k.buy': ['acheter', 'buy', '購入'],
  'yard.first': ['Choisissez vos pièces : ↑ ↓ pour la ligne, Entrée pour acheter, ← → pour changer d\'atelier. Puis « Prendre la mer ».', 'Choose your parts: ↑ ↓ for the line, Enter to buy, ← → to change workshop. Then « Set sail ».', '部品を選ぼう：↑↓で行、Enterで購入、←→で工房を替える。終われば「出航する」。'],
  'yard.p.shop': ['Atelier', 'Workshop', '工房'],
  'yard.w.coque': ['coque et voilure', 'hull and sails', '船体と帆'],
  'yard.w.arme': ['artillerie', 'guns', '砲術'],
  'yard.w.machine': ['machine', 'engine room', '機関'],
  'yard.w.defense': ['défense', 'defence', '防御'],
  'yard.w.equipage': ['équipage', 'crew', '乗組員'],
  'yard.d.w.coque': ['La coque, les mâts, la toile, le doublage de cuivre et le gouvernail. ← → : un autre atelier.', 'The hull, the masts, the canvas, the copper sheathing and the rudder. ← →: another workshop.', '船体、マスト、帆、銅板被覆、舵。←→で別の工房へ。'],
  'yard.d.w.arme': ['Les canons de la bordée, leur calibre et leurs obus, les canonniers, les pièces de chasse et la Gatling. ← → : un autre atelier.', 'The broadside guns, their calibre and shells, the gun crews, the chase guns and the Gatling. ← →: another workshop.', '舷側砲、その口径と砲弾、砲手、艦首砲、ガトリング砲。←→で別の工房へ。'],
  'yard.d.w.machine': ['La chaudière, la machine, les roues à aubes et l\'hélice : tout ce qui pousse sans le vent. ← → : un autre atelier.', 'The boiler, the engine, the paddle wheels and the screw: all that drives you without wind. ← →: another workshop.', 'ボイラー、機関、外輪、スクリュー。風なしで進むためのすべて。←→で別の工房へ。'],
  'yard.d.w.defense': ['La cuirasse, l\'éperon, les pompes et les charpentiers. ← → : un autre atelier.', 'The armour, the ram, the pumps and the carpenters. ← →: another workshop.', '装甲、衝角、ポンプと船大工。←→で別の工房へ。'],
  'yard.d.w.equipage': ['Les abordeurs, les chaloupes et les compagnies de débarquement, les cales et les vivres, la vigie. ← → : un autre atelier.', 'The boarders, the boats and landing companies, the holds and stores, the lookout. ← →: another workshop.', '斬り込み隊、ボートと上陸部隊、船倉と食糧、見張り。←→で別の工房へ。'],
  'yard.p.doublage': ['Doublage de cuivre', 'Copper sheathing', '銅板被覆'],
  'yard.p.gouvernail': ['Gouvernail', 'Rudder and wheel', '舵'],
  'yard.p.calibre': ['Pièces et obus', 'Guns and shells', '砲と砲弾'],
  'yard.p.canonniers': ['Canonniers', 'Gun crews', '砲手'],
  'yard.p.machine': ['Machine', 'Engine', '機関'],
  'yard.p.helice': ['Hélice', 'Screw propeller', 'スクリュー'],
  'yard.p.pompes': ['Pompes et charpentiers', 'Pumps and carpenters', 'ポンプと船大工'],
  'yard.p.chaloupes': ['Chaloupes', 'Boats', 'ボート'],
  'yard.p.cales': ['Cales et vivres', 'Holds and stores', '船倉と食糧'],
  'yard.p.vigie': ['Vigie et longue-vue', 'Lookout and telescope', '見張りと望遠鏡'],
  'yard.d.doublage': ['Des feuilles de cuivre sous la flottaison : la carène reste propre, et le navire file plus vite, à la voile comme à la vapeur.', 'Copper sheets below the waterline: the bottom stays clean, and the ship runs faster, under sail as under steam.', '喫水線下に銅板を張る。船底がきれいに保たれ、帆でも蒸気でも速くなる。'],
  'yard.d.gouvernail': ['Un gouvernail plus grand, mieux mené depuis la roue : le navire vire plus court.', 'A larger rudder, better worked from the wheel: the ship turns tighter.', 'より大きな舵を舵輪でよく操る。旋回が小さくなる。'],
  'yard.d.calibre': ['Des pièces plus lourdes, puis des obus, puis des canons rayés : chaque coup porte plus loin et fait plus de mal. On le voit aux pièces de la bordée.', 'Heavier guns, then shells, then rifled guns: every shot reaches further and hurts more. You can see it on the broadside guns.', 'より重い砲、次に炸裂弾、さらに施条砲。一発ごとに遠く、強くなる。舷側の砲に現れる。'],
  'yard.d.canonniers': ['Des canonniers exercés : on recharge plus vite, et la bordée part plus souvent.', 'Trained gun crews: you reload faster, and the broadside fires more often.', '訓練された砲手。装填が速くなり、舷側斉射の回数が増える。'],
  'yard.d.machine': ['Une machine plus puissante et plus économe : plus d\'allure à la vapeur, moins de charbon brûlé.', 'A stronger, thriftier engine: more speed under steam, less coal burnt.', 'より強く、燃費のよい機関。蒸気での速力が増し、石炭の消費が減る。'],
  'yard.d.helice': ['Une hélice sous l\'arrière : de l\'allure en plus à la vapeur, à l\'abri des boulets.', 'A screw under the stern: more speed under steam, safe from the shot.', '艦尾の下のスクリュー。蒸気での速力が増し、砲弾も届かない。'],
  'yard.d.pompes': ['Des pompes et des charpentiers : en mer, loin des coups, ils aveuglent les voies d\'eau, et la coque se refait peu à peu, jusqu\'aux trois quarts.', 'Pumps and carpenters: at sea, away from the shot, they stop the leaks, and the hull mends little by little, up to three quarters.', 'ポンプと船大工。海上で砲火を離れれば浸水を止め、船体は少しずつ四分の三まで直る。'],
  'yard.d.chaloupes': ['Plus de chaloupes, et des compagnies de débarquement exercées : on prend un port bien plus vite.', 'More boats, and trained landing companies: you take a port much faster.', 'ボートを増やし、上陸部隊を鍛える。港をずっと早く奪える。'],
  'yard.d.cales': ['Des cales plus grandes : plus de vivres et de charbon, plus de temps en mer avant de rentrer.', 'Bigger holds: more stores and coal, more time at sea before you must come back.', '船倉を広げる。食糧と石炭が増え、長く海にいられる。'],
  'yard.d.vigie': ['Une vigie en tête de mât et une bonne longue-vue : les navires qui vous chassent, et plus de coffres, sont signalés au bord de l\'écran.', 'A lookout at the masthead and a good telescope: the ships hunting you, and more chests, are pointed out at the edge of the screen.', '檣頭の見張りとよい望遠鏡。追ってくる艦や、より多くの箱が画面の端に示される。'],
  'yard.p.ship': ['Navire', 'Ship', '艦'],
  'yard.d.ship': ['Le navire que le chantier montre et améliore : ← → pour passer de l\'un à l\'autre. Chacun a ses pièces et sa peinture.', 'The ship the yard shows and improves: ← → to go from one to the next. Each has its own parts and paint.', '造船所が見せ、改装する艦。← →で切り替える。艦ごとに部品と塗装がある。'],
  'yard.e.ship': ['À l\'époque, une escadre navigue souvent en ligne de file, chaque navire dans le sillage de celui qui le précède. Début octobre 1868, la flotte d\'Enomoto quittait Shinagawa pour le nord.', 'In those days a squadron often sails in line ahead, each ship in the wake of the one before. In early October 1868, Enomoto\'s fleet left Shinagawa for the north.', '当時の艦隊はしばしば単縦陣で進み、各艦が前の艦の航跡をたどった。1868年10月初め、榎本の艦隊は品川を発って北へ向かった。'],
  'yard.p.cmd': ['Passer à bord {0}', 'Go aboard {0}', '{0}に乗り移る'],
  'yard.d.cmd': ['Vous prenez le commandement à bord {0} : c\'est désormais ce navire que vous menez, et {1} prend place dans la ligne de file.', 'You take command aboard {0}: from now on you sail this ship, and {1} takes her place in the line.', '{0}に乗り移って指揮を執る。以後はこの艦を操り、{1}は隊列に加わる。'],
  'yard.e.cmd': ['Le chef d\'une escadre hisse sa marque sur le navire qu\'il monte : c\'est ce navire que les autres suivent.', 'A squadron\'s commander hoists his flag on the ship he sails in: that is the ship the others follow.', '艦隊の指揮官は座乗する艦に将旗を掲げる。他の艦はその艦に続く。'],
  'yard.p.station': ['Consigne', 'Orders', '命令'],
  'yard.st.follow': ['suit la flotte', 'follows the fleet', '艦隊に随伴'],
  'yard.st.stay': ['reste à quai à {0}', 'stays at {0}', '{0}に停泊'],
  'yard.d.station': ['Un navire qui reste à quai défend le port : il tire sur les navires ennemis qui approchent, et aide la batterie quand une escadre vient reprendre {0}. Vous le retrouverez au chantier de {0}.', 'A ship left at the quay defends the port: she fires on enemy ships that come near, and helps the battery when a squadron comes to retake {0}. You will find her at the yard of {0}.', '停泊した艦は港を守る。近づく敵艦を撃ち、艦隊が{0}を奪い返しに来れば砲台を助ける。{0}の造船所で再び合流できる。'],
  'yard.e.station': ['Un navire mouillé sous les batteries renforce la défense d\'un port : à Hakodate, en juin 1869, le Kaiten, trop atteint pour manœuvrer, fut échoué sur un haut-fond et se battit encore en batterie flottante, avec le fort de Benten.', 'A ship moored under the batteries strengthens a port\'s defence: at Hakodate in June 1869, the Kaiten, too badly hit to manoeuvre, was run onto a shoal and fought on as a floating battery, alongside the Benten fort.', '砲台の下に停泊した艦は港の守りを固める。1869年6月の箱館で、損傷して動けなくなった回天は浅瀬に乗り上げ、浮き砲台として弁天台場とともに戦い続けた。'],
  'yard.p.buy': ['Armer un navire : {0}', 'Fit out a ship: {0}', '艦を艤装：{0}'],
  'yard.d.buy': ['L\'arsenal de {0} arme un navire de plus : un cotre, une pièce par bord, que vous ferez grandir à n\'importe quel chantier. Il vous suit en ligne de file et se bat à vos côtés ; si le navire que vous menez coule, vous passez à son bord.', 'The arsenal of {0} fits out one more ship: a cutter with one gun a side, to be grown at any of your yards. She follows in your wake and fights at your side; if the ship you sail goes down, you go aboard her.', '{0}の工廠がもう一隻を艤装する。両舷に一門ずつのカッターで、どの造船所でも育てられる。後に続いてともに戦い、乗艦が沈めばこの艦に乗り移る。'],
  'yard.e.buy': ['Pour armer des navires à l\'occidentale, il faut des arsenaux : le chantier d\'Ishikawajima à Edo, ouvert en 1853 ; la fonderie de Nagasaki, bâtie avec des ingénieurs hollandais et achevée en 1861 ; l\'arsenal de Yokosuka, que le shogunat fit construire avec l\'ingénieur français Léonce Verny.', 'Western-style ships need arsenals: the Ishikawajima yard at Edo, opened in 1853; the Nagasaki ironworks, built with Dutch engineers and completed in 1861; the Yokosuka arsenal, which the shogunate had built with the French engineer Léonce Verny.', '洋式の船を造るには工廠が要る。1853年に開かれた江戸の石川島造船所、オランダ人技師の手で1861年に完成した長崎製鉄所、そして幕府がフランス人技師ヴェルニーとともに築いた横須賀製鉄所。'],
  'yard.bought': ['{0} rejoint la flotte', '{0} joins the fleet', '{0}が艦隊に加わった'],
  'yard.cmd.done': ['vous êtes à bord {0}', 'you are aboard {0}', '{0}に乗艦'],
  'yard.d.leave.n': ['On quitte le chantier, réparés, cales et soutes pleines : la traversée est enregistrée ici. Ceux qui suivent la flotte prennent votre sillage ; ceux qui restent à quai gardent le port.', 'Leave the yard, repaired, holds and bunkers full: the voyage is saved here. Ships following the fleet take your wake; those left at the quay guard the port.', '修理と補給を終えて造船所を出る。航海はここで記録される。随伴する艦は航跡に続き、停泊する艦は港を守る。'],
  'yard.tip.k': ['Le chantier', 'The shipyard', '造船所'],
  'yard.tip': ['Pour y revenir : entrez dans le cercle vert d\'un port à vous et appuyez sur Entrée. Chaque port pris a son chantier.', 'To come back: sail into the green circle of one of your ports and press Enter. Every port you take has its yard.', '戻るには、自分の港の緑の円に入ってEnterを押す。占領した港にはどこも造船所がある。'],
  'yard.qual': ['Les qualités du navire', 'The ship\'s qualities', '船の性能'],
  'yard.era': ['À l\'époque', 'In those days', '当時は'],
  'yard.coins': ['pièces d\'or', 'gold coins', '小判'],
  'yard.tribute': ['tribut de vos ports : +{0}', 'tribute from your ports: +{0}', '港からの貢ぎ物：+{0}'],
  'yard.max': ['au plus haut', 'at the top', '最大'],
  'yard.none': ['pas sur cette coque', 'not on this hull', 'この船体では不可'],
  'yard.needs.chaudiere': ['il faut une chaudière', 'needs a boiler', 'ボイラーが必要'],
  'yard.leave': ['Prendre la mer', 'Set sail', '出航する'],
  'yard.leave.k': ['prendre la mer', 'set sail', '出航'],
  'yard.done': ['les charpentiers ont fini', 'the carpenters are done', '船大工の仕事が終わった'],
  'yard.paintKey': ['atelier, peinture', 'workshop, paint', '工房・塗装'],
  'yard.guns': ['Canons', 'Guns', '砲'],
  'yard.gunsN': ['{0} en bordée, {1} en chasse, {2} en retraite', '{0} broadside, {1} chase, {2} stern', '舷側{0}・艦首{1}・艦尾{2}'],
  'yard.armor': ['Cuirasse', 'Armour', '装甲'],
  'yard.stab': ['Tenue', 'Stability', '安定'],
  'yard.stab.risk': ['chavire si l\'on vire court à pleine allure', 'capsizes in a hard turn at full speed', '全速で急旋回すると転覆する'],
  'yard.stab.mid': ['gîte fort, mais tient', 'heels hard, but holds', '大きく傾くが持ちこたえる'],
  'yard.stab.ok': ['tient les virages serrés', 'holds tight turns', '急旋回にも耐える'],
  'yard.helm.wheels': ['les roues aident', 'the wheels help', '外輪が効く'],
  'yard.auto': ['Autonomie', 'Endurance', '航続力'],
  'yard.autoT': ['{0} min en mer', '{0} min at sea', '海上で{0}分'],
  'yard.autoTc': ['{0} min en mer, {1} à toute vapeur', '{0} min at sea, {1} at full steam', '海上で{0}分、全速なら{1}分'],
  'yard.p.coque': ['Coque', 'Hull', '船体'],
  'yard.p.mats': ['Mâts', 'Masts', 'マスト'],
  'yard.p.voiles': ['Voiles', 'Sails', '帆'],
  'yard.p.canons': ['Canons en bordée', 'Broadside guns', '舷側砲'],
  'yard.p.chasse': ['Chasse et retraite', 'Chase and stern guns', '艦首砲と艦尾砲'],
  'yard.p.chaudiere': ['Chaudière', 'Boiler', 'ボイラー'],
  'yard.p.roues': ['Roues à aubes', 'Paddle wheels', '外輪'],
  'yard.p.cuirasse': ['Cuirasse', 'Armour plates', '装甲板'],
  'yard.p.eperon': ['Éperon', 'Ram', '衝角'],
  'yard.p.abordeurs': ['Abordeurs', 'Boarders', '斬り込み隊'],
  'yard.p.gatling': ['Mitrailleuse Gatling', 'Gatling gun', 'ガトリング砲'],
  'yard.p.paint': ['Peinture', 'Paint', '塗装'],
  'yard.p.fort': ['Fortifier {0}', 'Fortify {0}', '{0}の砦'],
  'yard.d.coque': ['Une coque plus grande : plus solide, plus stable dans les virages, avec de plus grandes cales (plus d\'autonomie), et qui porte plus de mâts, de canons et de roues. Plus lourde à la barre. De la coque de noix au cotre, à la goélette, au brick, à la corvette, à la frégate. À partir du brick, on peut virer court à pleine allure sans chavirer.', 'A bigger hull: tougher, steadier in turns, with bigger holds (more endurance), and able to carry more masts, guns and wheels. Heavier on the helm. From nutshell to cutter, schooner, brig, corvette and frigate. From the brig upwards, you can turn hard at full speed without capsizing.', 'より大きな船体。頑丈で旋回にも安定し、船倉が広く航続力が増え、マスト・砲・外輪を多く積める。舵は重くなる。くるみの殻からカッター、スクーナー、ブリッグ、コルベット、フリゲートへ。ブリッグからは全速で急旋回しても転覆しない。'],
  'yard.d.mats': ['Un mât de plus, avec ses voiles : plus d\'allure, mais un peu plus de gîte.', 'One more mast, with its sails: more speed, but a little more heel.', 'マストを一本増やす。速さは増すが、少し傾きやすくなる。'],
  'yard.d.voiles': ['Une voile de plus à chaque cran, jusqu\'à couvrir le navire de toile : plus d\'allure, mais chaque cran en donne un peu moins que le précédent. Gare aux virages.', 'One more sail at each step, until the ship is covered in canvas: more speed, though each step gives a little less than the one before. Mind the turns.', '一段ごとに帆が一枚増え、ついには船じゅうが帆に覆われる。速くなるが、一段ごとの伸びは少しずつ小さくなる。旋回に注意。'],
  'yard.s.next': ['Au prochain cran : {0}.', 'Next step: {0}.', '次の段：{0}。'],
  'yard.s.all': ['Le navire porte toute la toile qu\'il peut porter.', 'She carries all the canvas she can.', '張れる帆はすべて張った。'],
  'yard.sq.1': ['les perroquets, et le clin-foc', 'the topgallants, and the flying jib', 'トゲルンスルとフライングジブ'],
  'yard.sq.2': ['les cacatois', 'the royals', 'ロイヤル'],
  'yard.sq.3': ['des voiles d\'étai entre les mâts, et un foc de plus', 'staysails between the masts, and one more jib', 'マストの間のステースルと、もう一枚のジブ'],
  'yard.sq.4': ['les bonnettes de hunier', 'the topmast studding sails', 'トップスルの両脇のスタンスル'],
  'yard.sq.5': ['les bonnettes basses', 'the lower studding sails', '下帆の両脇のスタンスル'],
  'yard.sq.6': ['les contre-cacatois, tout en haut des mâts', 'the skysails, at the very top of the masts', 'マストのいちばん上にスカイスル'],
  'yard.sq.7': ['les bonnettes de perroquet', 'the topgallant studding sails', 'トゲルンスルの両脇のスタンスル'],
  'yard.sq.8': ['d\'autres voiles d\'étai, plus haut', 'more staysails, higher up', 'さらに高いステースル'],
  'yard.sq.9': ['les bonnettes de cacatois', 'the royal studding sails', 'ロイヤルの両脇のスタンスル'],
  'yard.sq.10': ['une dernière voile au grand mât, au-dessus du contre-cacatois', 'one last sail on the mainmast, above the skysail: the moonsail', 'メインマストのスカイスルの上に、最後の一枚（ムーンスル）'],
  'yard.sf.1': ['des flèches au-dessus des voiles auriques', 'gaff topsails above the gaff sails', '縦帆の上にガフトップスル'],
  'yard.sf.2': ['un hunier carré', 'a square topsail', '横帆のトップスル'],
  'yard.sf.3': ['le clin-foc', 'the flying jib', 'フライングジブ'],
  'yard.sf.4': ['une fortune carrée, sous le hunier', 'a square foresail, below the topsail', 'トップスルの下に横帆の下帆'],
  'yard.sf.5': ['un perroquet, au-dessus du hunier', 'a topgallant, above the topsail', 'トップスルの上にトゲルンスル'],
  'yard.sf.6': ['les bonnettes de hunier', 'the topmast studding sails', 'トップスルの両脇のスタンスル'],
  'yard.sf.7': ['un foc de plus', 'one more jib', 'もう一枚のジブ'],
  'yard.sf.8': ['les bonnettes basses', 'the lower studding sails', '下帆の両脇のスタンスル'],
  'yard.sf.9': ['les bonnettes de perroquet', 'the topgallant studding sails', 'トゲルンスルの両脇のスタンスル'],
  'yard.sf.10': ['un cacatois, tout en haut du mât', 'a royal, at the top of the mast', 'マストのいちばん上にロイヤル'],
  'yard.sf.1a': ['la flèche, au-dessus de la voile aurique', 'a gaff topsail above the gaff sail', '縦帆の上にガフトップスル'],
  'yard.sf.2a': ['un hunier carré au mât de misaine, à la place de sa flèche', 'a square topsail on the foremast, in place of its gaff topsail', 'フォアマストのガフトップスルに代えて横帆のトップスル'],
  'yard.d.canons': ['Une pièce de plus de chaque bord : la bordée part quand un ennemi est par le travers.', 'One more gun on each side: the broadside fires when an enemy is abeam.', '両舷に砲を一門ずつ追加。敵が真横にいると舷側砲が火を噴く。'],
  'yard.d.chasse': ['Une pièce de chasse de plus à l\'avant ; au dernier cran, deux pièces de retraite à l\'arrière.', 'One more chase gun forward; at the last level, two stern guns aft.', '艦首砲を一門追加。最後の段階で艦尾砲二門。'],
  'yard.d.chaudiere': ['Une chaudière et sa cheminée : la machine pousse sans le vent, et il en faut une pour les roues. Elle brûle du charbon : à toute vapeur, l\'autonomie fond bien plus vite. On refait le plein dans vos ports.', 'A boiler and its funnel: the engine pushes without the wind, and the wheels need one. It burns coal: at full steam, your endurance melts away much faster. You coal again in your ports.', 'ボイラーと煙突。風がなくても進み、外輪にはこれが要る。石炭を燃やすので、全速では航続力がずっと早く減る。自分の港で補給できる。'],
  'yard.d.roues': ['Une paire de roues à aubes de plus : beaucoup plus d\'allure, une barre vive, et leurs tambours tiennent le navire droit dans les virages. Jusqu\'à trois paires. Elles brûlent du charbon.', 'One more pair of paddle wheels: much more speed, a lively helm, and their boxes keep the ship upright in turns. Up to three pairs. They burn coal.', '外輪を一対追加。ずっと速く、舵も軽くなり、外輪箱が旋回中の船を立たせる。三対まで。石炭を食う。'],
  'yard.d.cuirasse': ['Des plaques de fer rivées : on encaisse moins à chaque coup, et le navire pèse plus lourd au choc ; mais il s\'alourdit aussi à la marche. Au cinquième cran, un caisson blindé et une tourelle ; au-delà, des plaques plus épaisses.', 'Riveted iron plates: each hit hurts less, and the ship weighs more in a collision; but it is heavier to drive too. At the fifth level, an armoured casemate and a turret; beyond, thicker plates.', 'リベット留めの鉄板。被害が減り、衝突では重さが効くが、航行も重くなる。五段目で装甲砲郭と砲塔、その先はさらに厚い板。'],
  'yard.d.eperon': ['Un éperon de fer à l\'étrave, plus lourd à chaque cran : foncez droit sur un navire et appuyez deux fois sur ↑ juste avant le choc. Le coup grandit avec la vitesse, la cuirasse et le poids de votre navire, et votre étrave en souffre moins. Un navire trop solide pour couler reste planté sur l\'éperon : on l\'aborde (↓ pour se dégager).', 'An iron ram at the bow, heavier at each level: charge straight at a ship and press ↑ twice just before the blow. It grows with speed, armour and your ship\'s weight, and your bow suffers less. A ship too sturdy to sink stays stuck on the ram: board her (↓ to back off).', '艦首の鉄の衝角。段階ごとに重くなる。敵艦にまっすぐ突っ込み、衝突の直前に↑を二度押せ。一撃は速さ、装甲、船の重さで大きくなり、自艦の艦首の傷みは減る。沈まなかった艦は衝角に刺さったまま。斬り込め（↓で離れる）。'],
  'yard.d.abordeurs': ['Des abordeurs, haches et sabres d\'abordage : bord à bord avec un navire ennemi, frappez Entrée en mesure, et il est à vous, avec son or, ses vivres et son charbon, bien plus qu\'une épave n\'en rend. Chaque cran rend l\'abordage plus facile.', 'Boarders, with axes and cutlasses: alongside an enemy ship, strike Enter in time, and she is yours, with her gold, stores and coal, far more than a wreck gives. Each level makes boarding easier.', '斧とカトラスの斬り込み隊。敵艦に舷を寄せ、拍子に合わせてEnterを打てば、その艦は小判と食糧と石炭ごと自分のものに。段階ごとに斬り込みが楽になる。'],
  'yard.d.gatling': ['Une mitrailleuse Gatling à l\'avant : elle tire seule sur ce qui s\'approche. Chaque cran de plus : une cadence plus vive et plus de portée.', 'A Gatling gun forward: it fires by itself at whatever comes close. Each further level: a faster rate and more reach.', '艦首にガトリング砲。近づくものを自動で撃つ。段階を上げるごとに速く、遠くまで撃つ。'],
  'yard.d.paint': ['La couleur de la coque, au choix, et gratuite : ← →.', 'The colour of the hull, free to choose: ← →.', '船体の色。無料で選べる：← →。'],
  'yard.d.fort': ['Des batteries pour {0} : elles tirent sur les navires ennemis qui approchent et tiennent les sièges. Un port sans défense tombe en trente secondes quand une escadre vient le reprendre.', 'Batteries for {0}: they fire on approaching enemy ships and hold out against sieges. An undefended port falls in thirty seconds when a squadron comes to retake it.', '{0}の砲台。近づく敵艦を撃ち、包囲に耐える。守りのない港は、艦隊が奪い返しに来ると三十秒で落ちる。'],
  'yard.d.leave': ['On quitte le chantier, réparé, les cales et les soutes pleines : la traversée est enregistrée ici. Si le navire coule, on reprendra dans ce port.', 'Leave the shipyard, repaired, holds and bunkers full: the voyage is saved here. If the ship sinks, you will start again from this port.', '造船所を出る。ここで航海を記録する。沈没したらこの港からやり直す。'],
  /* les cartels : ce qu'étaient à l'époque les coques et les pièces du chantier */
  'yard.e.h0': ['La coque de noix : canots, chaloupes et baleinières, à la rame ou à la voile, peuplent toutes les rades de l\'époque. C\'est en chaloupe qu\'on va à terre, qu\'on porte une ancre, qu\'on monte à l\'abordage.', 'The nutshell: launches, longboats and whaleboats, under oars or sail, crowd every roadstead of the day. A boat takes you ashore, carries out an anchor, goes in to board.', 'くるみの殻。当時はどの泊地にも、櫂や帆で走る短艇、ランチ、捕鯨ボートがひしめいていた。上陸するにも、錨を運ぶにも、斬り込むにも、まずは小舟だ。'],
  'yard.e.h1': ['Le cotre : un seul mât, une grand-voile aurique et des focs. Rapide, bon marcheur au plus près du vent, c\'est le navire des douaniers, des pilotes et des contrebandiers.', 'The cutter: a single mast, a gaff mainsail and headsails. Fast and close-winded, she is the craft of customs men, pilots and smugglers.', 'カッター。マストは一本、縦帆の主帆と前帆。速く、風上にもよく切り上がる。税関、水先案内人、密輸業者の船だ。'],
  'yard.e.h2': ['La goélette : des voiles auriques tendues dans l\'axe, sur deux mâts ou plus ; peu d\'hommes pour la manœuvrer, et de la vitesse. Le Banryū d\'Ezo en est une, à hélice : l\'ancien yacht Emperor, offert au shogun en 1858 au nom de la reine Victoria.', 'The schooner: fore-and-aft sails on two masts or more; a small crew, and speed. Ezo\'s Banryū is one, with a screw: the former yacht Emperor, presented to the shogun in 1858 in the name of Queen Victoria.', 'スクーナー。二本以上のマストに縦帆を張る。少ない人数で操れて、速い。蝦夷の蟠竜もスクリュー付きのスクーナーで、1858年にヴィクトリア女王の名で将軍に贈られた元ヨット「エンペラー」である。'],
  'yard.e.h3': ['Le brick : deux mâts gréés de voiles carrées. Petit navire de guerre ou de commerce, il tient la mer par tous les temps. Le Kōtetsu lui-même, cuirassé à éperon, était gréé en brick.', 'The brig: two square-rigged masts. A small warship or merchantman that keeps the sea in any weather. The Kōtetsu herself, a ram ironclad, was brig-rigged.', 'ブリッグ。横帆を張った二本マスト。小型の軍艦にも商船にもなり、どんな天候でも海に出られる。衝角付き装甲艦の甲鉄も、ブリッグ式の帆装だった。'],
  'yard.e.h4': ['La corvette : trois mâts et une seule rangée de canons. Plus petite que la frégate, elle éclaire les escadres et montre le pavillon au loin. Le Kaiten, l\'ancienne corvette prussienne Danzig, et le Kasuga avancent sur des roues à aubes.', 'The corvette: three masts and a single tier of guns. Smaller than a frigate, she scouts for squadrons and shows the flag far away. The Kaiten, once the Prussian corvette Danzig, and the Kasuga move on paddle wheels.', 'コルベット。三本マストに砲列は一段。フリゲートより小さく、艦隊の偵察や遠方での示威にあたる。元プロイセンのコルベット「ダンツィヒ」である回天も、春日も、外輪で進む。'],
  'yard.e.h5': ['La frégate : trois mâts, et une batterie couverte sous le pont, en plus des pièces du pont : le grand navire de guerre de l\'époque. Le Kaiyō Maru, vaisseau amiral d\'Enomoto Takeaki, frégate construite à Dordrecht, aux Pays-Bas, se perdit devant Esashi le 28 décembre 1868.', 'The frigate: three masts and a covered gun deck below the upper deck\'s guns: the great warship of the day. The Kaiyō Maru, Enomoto Takeaki\'s flagship, a frigate built at Dordrecht in the Netherlands, was lost off Esashi on 28 December 1868.', 'フリゲート。三本マストに、上甲板の砲に加えて甲板下の砲列甲板を持つ、当時の大型軍艦。榎本武揚の旗艦・開陽丸はオランダのドルトレヒトで建造されたフリゲートで、1868年12月28日に江差沖で失われた。'],
  'yard.e.mats': ['Le nombre et le gréement des mâts font le type du navire : un mât pour le cotre, deux mâts à voiles carrées pour le brick, trois pour la corvette et la frégate. Le géant de l\'époque, le Great Eastern, lancé en 1858, en portait six.', 'The number and rig of the masts make the type of ship: one mast for a cutter, two square-rigged for a brig, three for a corvette or a frigate. The giant of the day, the Great Eastern, launched in 1858, carried six.', 'マストの数と帆装で船の種類が決まる。カッターは一本、ブリッグは横帆の二本、コルベットとフリゲートは三本。当時の巨船グレート・イースタン（1858年進水）は六本も立てていた。'],
  'yard.e.voiles': ['Huniers, perroquets, cacatois, contre-cacatois, voiles d\'étai, bonnettes au bout des vergues : les clippers des années 1850 portaient tout cela. La toile haute rapportait peu : en décembre 1854, le Champion of the Seas fila 465 milles en un jour, un record, sans rien au-dessus de ses cacatois.', 'Topsails, topgallants, royals, skysails, staysails, studding sails at the yardarms: the clippers of the 1850s carried all of it. The highest canvas gave little: in December 1854 Champion of the Seas ran 465 miles in a day, a record, with nothing set above her royals.', 'トップスル、トゲルンスル、ロイヤル、スカイスル、ステースル、帆桁の先のスタンスル。1850年代のクリッパーはそのすべてを張った。だが、いちばん高い帆の効き目は小さかった。1854年12月、一日に465海里を走って記録を作ったチャンピオン・オブ・ザ・シーズ号は、ロイヤルより上に何も張っていなかった。'],
  'yard.e.canons': ['La bordée : une rangée de pièces de chaque bord, qui tirent par les sabords. En 1868, les vieux canons lisses à boulets ronds côtoient les canons rayés, plus précis, qui tirent des obus.', 'The broadside: a row of guns on each side, firing through the ports. In 1868, old smoothbores firing round shot sit beside rifled guns, more accurate, firing shells.', '舷側砲。両舷に並ぶ砲が砲門から撃つ。1868年には、球形弾を撃つ旧式の滑腔砲と、より正確に砲弾を撃つ施条砲とが並んでいた。'],
  'yard.e.chasse': ['Des pièces sur pivot, à l\'avant et à l\'arrière, tirent dans l\'axe : en chasse sur celui qu\'on poursuit, en retraite sur celui qui vous poursuit. Le Kōtetsu portait à l\'avant un canon Armstrong de 300 livres.', 'Pivot guns forward and aft fire along the keel line: chase guns at the ship you pursue, stern guns at the one pursuing you. The Kōtetsu carried a 300-pounder Armstrong gun forward.', '艦首と艦尾の旋回砲は船の軸線に沿って撃つ。追う敵には艦首砲、追ってくる敵には艦尾砲。甲鉄は艦首に300ポンドのアームストロング砲を備えていた。'],
  'yard.e.chaudiere': ['Dans les années 1860, la vapeur aide la voile plus qu\'elle ne la remplace : on pousse les feux pour entrer au port, remonter le vent ou combattre. La machine fait tourner une hélice, à l\'abri sous la flottaison. Il faut du charbon, et des ports pour en charger.', 'In the 1860s, steam helps sail rather than replacing it: you raise steam to enter port, beat against the wind or fight. The engine turns a screw, safe below the waterline. It needs coal, and ports to take it on.', '1860年代、蒸気は帆に代わるというより帆を助けるものだった。入港や向かい風、戦闘のときに火を焚く。機関は喫水線の下で守られたスクリューを回す。石炭が要り、それを積む港が要る。'],
  'yard.e.roues': ['Les premiers vapeurs avançaient sur des roues à aubes, comme le Kaiten et le Kasuga : le navire est vif à la barre, mais les tambours, exposés aux boulets, prennent la place des canons. Le Great Eastern avait à la fois des roues et une hélice.', 'The first steamers moved on paddle wheels, like the Kaiten and the Kasuga: the ship is lively on the helm, but the paddle boxes, exposed to shot, take up room for guns. The Great Eastern had both wheels and a screw.', '初期の蒸気船は回天や春日のように外輪で進んだ。舵の効きはよいが、砲弾にさらされる外輪箱が砲の場所をふさぐ。グレート・イースタンは外輪とスクリューの両方を備えていた。'],
  'yard.e.cuirasse': ['Des plaques de fer sur une coque de bois : la Gloire française, lancée en 1859, est le premier cuirassé de haute mer ; le 9 mars 1862, à Hampton Roads, le duel du Monitor et du Virginia change la guerre sur mer. Le Kōtetsu fut le premier cuirassé de la marine japonaise.', 'Iron plates over a wooden hull: the French Gloire, launched in 1859, is the first ocean-going ironclad; on 9 March 1862, at Hampton Roads, the duel between the Monitor and the Virginia changes war at sea. The Kōtetsu was the Japanese navy\'s first ironclad.', '木の船体に鉄板を張る。1859年進水のフランスのグロワールが最初の外洋装甲艦で、1862年3月9日、ハンプトン・ローズでのモニターとヴァージニアの一騎打ちが海戦を変えた。甲鉄は日本海軍最初の装甲艦である。'],
  'yard.e.eperon': ['Une étrave renforcée pour éventrer l\'ennemi : à Lissa, le 20 juillet 1866, le cuirassé autrichien Erzherzog Ferdinand Max coula ainsi le Re d\'Italia. Le Kōtetsu, conçu comme bélier cuirassé, avait le sien.', 'A strengthened stem to rip the enemy open: at Lissa, on 20 July 1866, the Austrian ironclad Erzherzog Ferdinand Max sank the Re d\'Italia that way. The Kōtetsu, designed as an armoured ram, had one.', '敵の舷側を突き破る補強された艦首。1866年7月20日のリッサ海戦で、オーストリアの装甲艦エルツヘルツォーク・フェルディナント・マックスがこうしてレ・ディタリアを沈めた。装甲衝角艦として設計された甲鉄にもあった。'],
  'yard.e.abordeurs': ['Haches, sabres et revolvers : sauter à bord reste le moyen de prendre un navire intact. Le 6 mai 1869, dans la baie de Miyako, les hommes du Kaiten tentèrent ainsi d\'enlever le Kōtetsu.', 'Axes, cutlasses and revolvers: jumping aboard is still the way to take a ship intact. On 6 May 1869, in Miyako Bay, the Kaiten\'s men tried to seize the Kōtetsu that way.', '斧、カトラス、拳銃。船を無傷で手に入れるには、乗り移るのがいちばんだ。1869年5月6日、宮古湾で回天の乗員はこうして甲鉄を奪おうとした。'],
  'yard.e.gatling': ['Six canons qui tournent autour d\'un axe, à la manivelle : la mitrailleuse de Richard Gatling, brevetée le 4 novembre 1862. À Miyako, selon certains récits, celle du Kōtetsu repoussa les abordeurs du Kaiten ; un marin japonais affirma plus tard qu\'on n\'avait tiré qu\'au fusil.', 'Six barrels turning round a shaft, cranked by hand: Richard Gatling\'s gun, patented on 4 November 1862. At Miyako, according to some accounts, the Kōtetsu\'s Gatling drove back the Kaiten\'s boarders; a Japanese sailor later said only rifles were fired.', '六本の銃身が軸のまわりを回る、手回し式の機関銃。リチャード・ガトリングが1862年11月4日に特許を得た。宮古湾では甲鉄のガトリング砲が回天の斬り込み隊を退けたとする記録もあるが、小銃だけだったと後に語った水兵もいる。'],
  'yard.e.doublage': ['Du cuivre sous la flottaison : sans tarets ni salissures, le navire file mieux. En 1761, la frégate Alarm fut le premier navire de la Royal Navy doublé en entier ; en 1832, George Muntz fit breveter un laiton aussi efficace, pour deux tiers du prix environ.', 'Copper below the waterline: free of shipworm and fouling, the ship sails faster. In 1761 the frigate Alarm became the first Royal Navy ship sheathed all over; in 1832 George Muntz patented a brass that did the same job for about two thirds of the price.', '喫水線より下を銅板で覆えば、フナクイムシや付着生物から船体が守られ、船足も速くなる。1761年、英国海軍のフリゲート「アラーム」が初めて船底全体を銅で覆った。1832年にはジョージ・マンツが、銅のおよそ3分の2の値段で同じ働きをする真鍮の特許を取った。'],
  'yard.e.gouvernail': ['La roue enroule sur un tambour les drosses qui manœuvrent la barre : apparue au début du XVIIIe siècle, elle fut officiellement adoptée par la marine française en 1709. En 1866, l\'Écossais John McFarlane Gray fit breveter un appareil à gouverner à vapeur.', 'The wheel winds the tiller ropes round a drum to swing the tiller: it appeared at the start of the 18th century, and the French navy officially adopted it in 1709. In 1866 the Scottish engineer John McFarlane Gray patented a steam steering engine.', '舵輪は、ドラムに巻いた操舵索で舵柄を動かす。18世紀の初めに現れ、フランス海軍は1709年にこれを正式に採用した。1866年には、スコットランドの技師ジョン・マクファーレン・グレイが蒸気式操舵機の特許を取った。'],
  'yard.e.calibre': ['Du boulet plein à l\'obus qui éclate dans la coque : en 1824, l\'artilleur Henri-Joseph Paixhans démontra son canon à obus contre le vaisseau Pacificateur. À Sinope, le 30 novembre 1853, les obus russes de Nakhimov anéantirent l\'escadre ottomane.', 'From solid round shot to shells that burst inside the hull: in 1824 the artillerist Henri-Joseph Paixhans proved his shell gun against the ship of the line Pacificateur. At Sinop, on 30 November 1853, Nakhimov\'s Russian shells wiped out the Ottoman squadron.', '鉄の実体弾から、船体の中で炸裂する砲弾へ。1824年、砲兵将校アンリ＝ジョセフ・ペクサンは戦列艦パシフィカトゥールを標的にして、自らの砲の威力を実証した。1853年11月30日のシノープの海戦では、ナヒーモフ率いるロシア艦隊の炸裂弾がオスマン艦隊を壊滅させた。'],
  'yard.e.canonniers': ['Des servants exercés chargent et pointent plus vite : en juin 1830, la Royal Navy installa son école de canonnage à bord du vieux vaisseau Excellent, à Portsmouth.', 'Drilled gun crews load and aim faster: in June 1830 the Royal Navy set up its gunnery school aboard the old ship Excellent at Portsmouth.', '訓練を積んだ砲員は、装填も照準も速い。1830年6月、英国海軍はポーツマスの老朽艦「エクセレント」に砲術学校を置いた。'],
  'yard.e.machine': ['Une même vapeur sert deux fois, à haute puis à basse pression : la machine compound brevetée en 1853 par Randolph et Elder prit la mer en 1854 sur le vapeur à hélice Brandon. Elle épargnait 30 à 40 % du charbon.', 'The same steam works twice, at high then at low pressure: the compound engine patented by Randolph and Elder in 1853 went to sea in 1854 in the screw steamer Brandon. It saved 30 to 40 percent of the coal.', '同じ蒸気を、高圧と低圧で二度働かせる。1853年にランドルフとエルダーが特許を取った複式蒸気機関は、1854年、スクリュー汽船「ブランドン」に積まれて海に出た。石炭の消費は3割から4割も減った。'],
  'yard.e.helice': ['Une hélice sous la poupe plutôt que des roues : le 3 avril 1845, attelé poupe à poupe à l\'Alecto à roues, le Rattler à hélice l\'entraîna à reculons à 2,8 nœuds. En 1850 fut lancé le Napoléon de Dupuy de Lôme, premier vaisseau de ligne conçu pour l\'hélice.', 'A screw under the stern instead of paddle wheels: on 3 April 1845, tied stern to stern with the paddle sloop Alecto, the screw sloop Rattler towed her backwards at 2.8 knots. In 1850 France launched Dupuy de Lôme\'s Napoléon, the first ship of the line designed for the screw.', '外輪ではなく、船尾のスクリューで進む。1845年4月3日、スクリュー艦「ラトラー」と外輪艦「アレクト」を船尾どうしで綱につなぐと、ラトラーはアレクトを後ろ向きのまま2.8ノットで引いていった。1850年には、デュピュイ・ド・ローム設計の「ナポレオン」が進水した。初めからスクリュー推進として設計された最初の戦列艦である。'],
  'yard.e.pompes': ['Pomper pendant que le charpentier aveugle les voies d\'eau : la pompe à chaîne de William Cole et du capitaine John Bentinck, brevetée en 1771, fut adoptée par toute la Royal Navy ; à l\'essai, quatre hommes y pompaient plus vite que sept sur l\'ancienne.', 'Keep pumping while the carpenter plugs the leaks: the chain pump of William Cole and Captain John Bentinck, patented in 1771, was adopted throughout the Royal Navy; in trials, four men on it pumped faster than seven on the old one.', '船大工が浸水口をふさぐ間も、ポンプは止められない。ウィリアム・コールとジョン・ベンティンク艦長が改良し、1771年に特許を得たチェーンポンプは、英国海軍の全艦に採用された。試験では、4人で旧式ポンプの7人より速く水をくみ出した。'],
  'yard.e.chaloupes': ['Chaloupes et canots mettent les marins à terre : à Shimonoseki, le 20 juillet 1863, la Sémiramis et le Tancrède de Benjamin Jaurès débarquèrent 250 hommes, qui détruisirent une batterie ; les 5 et 6 septembre 1864, les alliés y prirent d\'assaut les batteries.', 'Launches and cutters put the men ashore: at Shimonoseki, on 20 July 1863, Benjamin Jaurès\'s Sémiramis and Tancrède landed 250 men, who destroyed a battery; on 5 and 6 September 1864, allied landing parties stormed the batteries there.', '陸戦隊を岸へ運ぶのは艦載ボートである。1863年7月20日、ジョレス率いる仏艦セミラミスとタンクレードは下関に250人を上陸させ、砲台を破壊した。1864年9月5日と6日には、四国連合艦隊の陸戦隊が同地の砲台を占拠した。'],
  'yard.e.cales': ['Des vivres pour tenir la mer : en 1810, le ministère de l\'Intérieur versa 12 000 francs à Nicolas Appert pour qu\'il publie son procédé de conserves, très apprécié des marins. Dès 1795, la Royal Navy distribuait chaque jour du jus de citron contre le scorbut.', 'Stores to keep the sea: in 1810 the French Interior Ministry paid Nicolas Appert 12,000 francs to make public his way of preserving food, which sailors came to prize. From 1795 the Royal Navy issued lemon juice every day against scurvy.', '長い航海を支える食糧を積む。1810年、フランス内務省はニコラ・アペールに1万2000フランを与え、食品保存法を公開させた。その保存食は船乗りに重宝された。英国海軍は1795年から、壊血病を防ぐためレモン果汁を毎日配給していた。'],
  'yard.e.vigie': ['Voir l\'ennemi avant d\'être vu : en 1758, John Dollond fit breveter la lentille achromatique, qui atténue les franges colorées des longues-vues. Le baleinier William Scoresby père inventa le nid-de-pie, un tonneau en tête de mât, mentionné dès 1807.', 'See the enemy before he sees you: in 1758 John Dollond patented the achromatic lens, which cuts down the coloured fringes in telescopes. The whaler William Scoresby Sr. invented the crow\'s nest, a barrel at the masthead, recorded as early as 1807.', '敵より先に敵を見つける。1758年、ジョン・ドロンドは色のにじみを抑える色消しレンズの特許を取り、遠眼鏡の像を鮮明にした。捕鯨船長ウィリアム・スコアズビー（父）は、マストの頂に樽を据えた見張り台「クロウズネスト」を考案した。その記録は1807年までさかのぼる。'],
  'yard.e.paint': ['Coques noires, bande claire au droit des sabords, bois verni des yachts : chaque marine, chaque armateur a ses couleurs.', 'Black hulls, a light band along the gunports, the varnished wood of yachts: every navy and every owner has its colours.', '黒い船体、砲門に沿った明るい帯、ヨットのニス塗りの木肌。海軍ごと、船主ごとに色がある。'],
  'yard.e.fort': ['Des batteries de côte croisent leurs feux sur la rade : à Hakodate, le fort de Benten, achevé en 1863, gardait l\'entrée du port.', 'Shore batteries cross their fire over the roads: at Hakodate, the Benten fort, completed in 1863, guarded the harbour entrance.', '沿岸砲台が泊地に十字砲火を浴びせる。箱館では1863年完成の弁天台場が港の入口を守っていた。'],
});
