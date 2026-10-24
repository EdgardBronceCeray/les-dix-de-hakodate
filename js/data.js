'use strict';

/* Contenu du jeu : navires, objets du mode arcade, étapes du mode histoire.
 * Les navires sont dessinés à l'échelle : SCALE pixels par mètre de coque. */

const SCALE = 1.85;

/* ---------- navires ----------
 *  L, B : longueur et largeur réelles (m), pour le dessin à l'échelle
 *  speed : vitesse maximale (px/s)   turn : virage (rad/s)   hull : solidité
 *  guns : pièces de chasse tirant droit devant au départ
 *  look, guns (armement réel) : pour le dessin ; facts, note : la fiche */
const SHIPS = {
  kaiten: {
    id: 'kaiten', name: 'Kaiten', jp: '回天', faction: 'ezo', kind: { fr: 'corvette à roues', en: 'paddle corvette', ja: '外輪コルベット' },
    L: 70.1, B: 10.47, speed: 245, turn: 2.2, hull: 150, chase: 2,
    prop: 'paddle', rig: 'square', sailKind: 'square', sailMaxInit: 1,
    armament: [
      { type: 'r40', mount: 'broad', n: 10, xs: [-0.355, -0.255, -0.155, 0.165, 0.25] },
      { type: 'r50', mount: 'pivot', x: 0.385 },
      { type: 'how', mount: 'bow', x: 0.455 },
      { type: 'how', mount: 'stern', x: -0.44 },
    ],
    /* d'après la gravure du Tour du Monde et la photographie d'avant 1868 : roues un peu en avant
     * du milieu, deux cheminées de part et d'autre des tambours, artimon aurique, embarcations
     * aux bossoirs de l'arrière. En 1869 : misaine et grand mât cassés par le typhon d'octobre 1868,
     * un mât court planté à l'avant, plus de voiles. */
    look: { masts: [-0.317], mizzenFA: true, mastH: [25], stumps: [-0.07], stumpH: 4.6, jury: 0.3, juryH: 14, noSail: true,
      funnel: [-0.007, 0.101], funnelBand: false, funnelH: 7.8, funnelR: 0.92, paddle: 0.047, boats: 4, boatX: [-0.39, -0.23], houseX: -0.25,
      hull: '#2a2622', stripe: '#c9b58a', deck: '#b59a72', bowsprit: 0.13, figurehead: true, hammocks: true },
    facts: [['L', '70 m'], ['D', '1 678 t'], ['P', { fr: 'roues à aubes, sans voiles', en: 'paddle wheels, no sail', ja: '外輪、帆走なし' }], ['A', { fr: '13 pièces : 10 rayées de 40, 1 de 50, 2 obusiers', en: '13 guns: 10 rifled 40-pdrs, 1 50-pdr, 2 howitzers', ja: '13門：40斤施条砲10、50斤1、榴弾砲2' }]],
    note: { fr: 'L\'ancienne corvette prussienne Danzig. Le plus gros et le plus solide, deux pièces de chasse dès le départ, lourd à la barre. Le typhon d\'octobre 1868 lui a cassé le mât de misaine et le grand mât : il n\'a plus que son artimon et un mât court planté à l\'avant, et ne marche qu\'à la vapeur.',
      en: 'Formerly the Prussian corvette Danzig. The biggest and toughest, with two chase guns from the start, heavy on the helm. The typhoon of October 1868 broke her fore and main masts: she keeps only her mizzen and a short jury mast forward, and steams only.',
      ja: '元はプロイセンのコルベット「ダンツィヒ」。最も大きく頑丈で、最初から艦首砲を二門備えるが、舵は重い。1868年10月の台風で前檣と中檣を失い、後檣と前部に立てた短い仮檣だけとなって、蒸気だけで走る。' },
  },
  banryu: {
    id: 'banryu', name: 'Banryū', jp: '蟠竜', faction: 'ezo', kind: { fr: 'goélette à hélice', en: 'screw schooner', ja: 'スクリュー・スクーナー' },
    L: 41.8, B: 6.4, speed: 260, turn: 2.9, hull: 95, chase: 1,
    prop: 'screw', rig: 'fore', sailKind: 'fore', sailMaxInit: 3,
    armament: [{ type: 'p12', mount: 'broad', n: 4, span: 0.5 }],
    look: { masts: [0.24, 0.0, -0.22], funnel: 0.1, boats: 2, hull: '#1f2326', stripe: '#c7a35a', deck: '#c4a77e', bowsprit: 0.2, figurehead: true },
    facts: [['L', '42 m'], ['D', '370 t'], ['P', { fr: 'hélice et trois mâts', en: 'screw and three masts', ja: 'スクリューと三本マスト' }], ['A', { fr: '4 pièces de bronze de 12', en: '4 bronze 12-pdrs', ja: '12斤青銅砲4門' }]],
    note: { fr: 'L\'ancien yacht Emperor, offert au shogun en 1858 au nom de la reine Victoria : coque de fer, rapide, maniable, équilibré.',
      en: 'The former yacht Emperor, presented to the shogun in 1858 in the name of Queen Victoria: iron hull, fast, handy, balanced.',
      ja: '1858年、ヴィクトリア女王の名で将軍に贈られた元ヨット「エンペラー」。鉄の船体で、速く、扱いやすく、釣り合いがよい。' },
  },
  chiyoda: {
    id: 'chiyoda', name: 'Chiyodagata', jp: '千代田形', faction: 'ezo', kind: { fr: 'canonnière à hélice', en: 'screw gunboat', ja: 'スクリュー砲艦' },
    L: 29.7, B: 4.8, speed: 215, turn: 3.6, hull: 75, chase: 1,
    prop: 'screw', rig: 'fore', sailKind: 'fore', sailMaxInit: 3,
    armament: [{ type: 'p30', mount: 'pivot', x: 0.12 }, { type: 'how', mount: 'broad', n: 2, span: 0.1, x: -0.2 }],
    look: { masts: [0.16, -0.2], funnel: -0.02, boats: 1, hull: '#262a26', stripe: '#a99f86', deck: '#b8a07a', bowsprit: 0.14 },
    facts: [['L', '30 m'], ['D', '140 t'], ['P', { fr: 'hélice', en: 'screw', ja: 'スクリュー' }], ['A', { fr: '1 canon de 30, 2 obusiers', en: '1 30-pdr, 2 howitzers', ja: '30斤砲1、榴弾砲2' }]],
    note: { fr: 'La première canonnière à vapeur construite au Japon. Toute petite : difficile à toucher, vire sur place. Lente et fragile.',
      en: 'The first steam gunboat built in Japan. Tiny: hard to hit, turns on the spot. Slow and fragile.',
      ja: '日本で初めて建造された蒸気砲艦。小さく当てにくく、その場で回頭できるが、遅くて脆い。' },
  },
  takao: {
    id: 'takao', name: 'Takao', jp: '高雄', faction: 'ezo', kind: { fr: 'aviso à hélice', en: 'screw dispatch vessel', ja: 'スクリュー通報艦' },
    L: 40, B: 8.08, speed: 290, turn: 2.8, hull: 90, chase: 1,
    prop: 'screw', rig: 'fore', sailKind: 'fore', sailMaxInit: 3,
    armament: [{ type: 'r40', mount: 'pivot', x: 0.2 }, { type: 'p24', mount: 'broad', n: 4, span: 0.45, x: -0.06 }],
    look: { masts: [0.2, -0.14], funnel: 0.02, boats: 2, hull: '#232628', stripe: '#b9b2a0', deck: '#bea47c', bowsprit: 0.12 },
    facts: [['L', '40 m'], ['D', '350 t'], ['P', { fr: 'hélice et deux mâts', en: 'screw and two masts', ja: 'スクリューと二本マスト' }], ['A', { fr: '5 pièces : 4 lisses, 1 Armstrong', en: '5 guns: 4 smoothbores, 1 Armstrong', ja: '5門：滑腔砲4、アームストロング砲1' }]],
    note: { fr: 'L\'ancien cotre des douanes américaines Ashuelot, que Collache appelle « l\'Aschwelotte ». Le plus rapide de la flotte, coque légère.',
      en: 'The former US revenue cutter Ashuelot, which Collache calls "the Aschwelotte". The fastest of the fleet, light hull.',
      ja: '元は米国税関監視船「アシュエロット」。コラッシュは「アシュウェロット」と呼ぶ。艦隊で最も速いが、船体は軽い。' },
  },
  kotetsu: {
    id: 'kotetsu', name: 'Kōtetsu', jp: '甲鉄', faction: 'imperial', kind: { fr: 'cuirassé à éperon', en: 'ram ironclad', ja: '衝角付き装甲艦' },
    L: 56.9, B: 9.9, speed: 175, turn: 1.9, hull: 900, armor: 0.12, gatling: true, chase: 1, broad: 1,
    prop: 'screw', rig: 'square', sailKind: 'square', sailMaxInit: 2,
    armament: [{ type: 'a300', mount: 'casemate', x: 0.33 }, { type: 'a70', mount: 'aftcasemate', x: -0.33 }, { type: 'a6', mount: 'broad', n: 2, span: 0.2 }],
    look: { masts: [0.155, -0.155], mastH: [21, 19.5], sqLevels: 3, funnel: -0.01, funnelBand: false, funnelH: 7.4, funnelR: 0.88, boats: 2, boatX: [-0.07], hull: '#25292d', stripe: '#3c4247', deck: '#8f8576', ram: true, casemate: true, bowsprit: 0 },
  },
  kasuga: {
    id: 'kasuga', name: 'Kasuga', jp: '春日', faction: 'imperial', kind: { fr: 'corvette à roues', en: 'paddle corvette', ja: '外輪コルベット' },
    L: 73.6, B: 8.8, speed: 205, turn: 1.8, hull: 150, chase: 1, broad: 2,
    prop: 'paddle', rig: 'fore', sailKind: 'fore', sailMaxInit: 2,
    armament: [{ type: 'p68', mount: 'pivot', n: 2, x: 0.18 }, { type: 'p18', mount: 'broad', n: 4, span: 0.4, x: -0.12 }],
    look: { hammocks: true, masts: [0.28, -0.26], funnel: [0.1, -0.08], paddle: 0.01, boats: 2, hull: '#2a2724', stripe: '#9a8a6e', deck: '#a99272', bowsprit: 0.1 },
  },
  moshun: {
    id: 'moshun', name: 'Mōshun', jp: '孟春', faction: 'imperial', kind: { fr: 'canonnière', en: 'gunboat', ja: '砲艦' },
    L: 44.5, B: 7.2, speed: 220, turn: 2.4, hull: 90, chase: 1, broad: 1,
    prop: 'screw', rig: 'fore', sailKind: 'fore', sailMaxInit: 3,
    armament: [{ type: 'a70', mount: 'pivot', n: 2, x: 0.05 }, { type: 'a6', mount: 'broad', n: 2, span: 0.3 }],
    look: { masts: [0.22, -0.18], funnel: 0.02, boats: 2, hull: '#2c2b29', stripe: '#8c8574', deck: '#b19b78', bowsprit: 0.12 },
  },
  choyo: {
    id: 'choyo', name: 'Chōyō', jp: '朝陽', faction: 'imperial', kind: { fr: 'corvette à hélice', en: 'screw corvette', ja: 'スクリュー・コルベット' },
    L: 49, B: 7.6, speed: 190, turn: 2.1, hull: 110, chase: 1, broad: 2,
    prop: 'screw', rig: 'square', sailKind: 'square', sailMaxInit: 3,
    armament: [{ type: 'p30', mount: 'broad', n: 8, span: 0.6 }],
    look: { hammocks: true, masts: [0.28, 0.0, -0.26], funnel: 0.08, boats: 2, hull: '#2d2a26', stripe: '#b8a37a', deck: '#b39c76', bowsprit: 0.16 },
  },
  hiryu: {
    id: 'hiryu', name: 'Hiryū', jp: '飛龍', faction: 'imperial', kind: { fr: 'transport', en: 'transport', ja: '輸送船' },
    L: 53, B: 8, speed: 150, turn: 1.6, hull: 120, chase: 0, broad: 0,
    prop: 'screw', rig: 'fore', sailKind: 'fore', sailMaxInit: 2,
    armament: [],
    look: { masts: [0.24, -0.2], funnel: 0.02, boats: 6, hull: '#33302b', stripe: '#8d836e', deck: '#a8916c', bowsprit: 0.1 },
  },
};
/* le Kōtetsu, l'ancien Stonewall : jouable en arcade une fois l'arcade terminée, sous le Hinomaru */
SHIPS.stonewall = Object.assign({}, SHIPS.kotetsu, {
  id: 'stonewall', faction: 'ezo', flag: 'jp',
  speed: 205, turn: 2.0, hull: 170, armor: 0.6, gatling: false, chase: 2, broad: 0,
  facts: [['L', '57 m'], ['D', '1 358 t'], ['P', { fr: 'hélice, cuirasse de fer, éperon', en: 'screw, iron armour, ram bow', ja: 'スクリュー、鉄装甲、衝角' }], ['A', { fr: '1 Armstrong de 300 livres, 2 de 70', en: '1 Armstrong 300-pdr, 2 70-pdrs', ja: 'アームストロング300ポンド砲1、70ポンド砲2' }]],
  note: { fr: 'L\'ancien Stonewall, construit à Bordeaux pour les Confédérés, acheté par le shogunat puis livré au nouveau gouvernement en 1869 : c\'est lui que le Kaiten tenta d\'aborder à Miyako. Récompense de l\'arcade : lent et lourd à la barre, mais sa cuirasse encaisse les chocs.',
    en: 'The former Stonewall, built at Bordeaux for the Confederates, bought by the shogunate and handed to the new government in 1869: the ship the Kaiten tried to board at Miyako. The arcade\'s reward: slow and heavy on the helm, but her armour shrugs off the blows.',
    ja: '元はボルドーで南部連合のために建造された「ストーンウォール」。幕府が買い、1869年に新政府へ引き渡された。宮古湾で回天が斬り込もうとした艦である。アーケードの褒美：遅く舵も重いが、装甲が衝撃を受け止める。' },
});
const PLAYABLE = ['kaiten', 'banryu', 'takao', 'chiyoda', 'stonewall'];

/* ce qui débloque chaque navire de l'arcade : une étape du mode histoire réussie,
 * ou l'arcade terminée (dix niveaux) pour le Kōtetsu */
const ARCADE_END = 10;
const UNLOCK = { chiyoda: null, takao: 'cyclone', kaiten: 'miyako', banryu: 'hakodate', stonewall: 'arcade' };
function shipUnlocked(id) {
  const u = UNLOCK[id];
  if (!u) return true;
  if (u === 'arcade') return !!arcadeLoad().fin;
  const i = STAGES.findIndex((s) => s.id === u);
  return (storyLoad().done || 0) > i;
}
/* la flotte des menus : le Kōtetsu ne s'y joint qu'une fois gagné */
function fleetIds() { return PLAYABLE.filter((id) => id !== 'stonewall' || shipUnlocked(id)); }

/* types de pièces, pour le dessin des fûts seulement */
const GUN_TYPES = {
  p30: { kg: 13.6 }, p24: { kg: 10.9 }, p18: { kg: 8.2 }, p12: { kg: 5.4 }, p68: { kg: 30.8 },
  how: { kg: 5.4 }, r40: { kg: 18.1 }, r50: { kg: 22.7 }, a70: { kg: 31.8 }, a300: { kg: 136 }, a6: { kg: 2.7 },
  gat: { kg: 0.03, gatling: true },
};

/* ---------- mode arcade : ce qui dérive sur la mer ----------
 * Les obstacles de l'arcade, dans les eaux d'Ezo après la tempête. */
const ARC = {
  radeau: { label: 'débris', sizes: { 3: [50, 60], 2: [30, 36], 1: [16, 20] }, hp: { 3: 2, 2: 1, 1: 1 }, speed: [30, 70], dmg: { 3: 34, 2: 22, 1: 12 }, score: { 3: 20, 2: 30, 1: 50 } },
  amas: { label: 'amas de tonneaux', r: [30, 36], hp: 1, speed: [30, 60], dmg: 26, score: 40 },
  epave: { label: 'épave à la dérive', r: [48, 62], speed: [22, 42], dmg: 40 },
  brulot: { label: 'brûlot', r: [22, 28], hp: 1, speed: [125, 165], dmg: 45, score: 80 },
  tourbillon: { label: 'tourbillon', r: [60, 74], reach: 3.6, pull: 170, spin: 80, ring: 2.4, suck: 40, capture: 130, reachC: 1.7, hold: 1.3, surge: 0.5, brake: 1.1, eye: 0.7, hurt: 30 },
};

/* les familles de débris : chaque objet en tire une, sans répéter la même deux fois de suite */
const DEBRIS_KINDS = {
  radeau: { 3: ['pont', 'roue', 'proue', 'mat', 'radeau', 'rouf'], 2: ['pont', 'chaloupe', 'tawara', 'radeau', 'mat', 'rouf'], 1: ['planches', 'tonneau', 'taru', 'tawara', 'pavois', 'espars'] },
  amas: ['tonneaux', 'taru', 'tawara'],
  epave: ['cuivre', 'vertdegris', 'jonque'],
};

const PRISES = {
  voilure: { label: { fr: 'voilure', en: 'sail', ja: '帆走' }, note: { fr: 'plus vite, plus maniable', en: 'faster, handier', ja: '速く、扱いやすく' }, color: '#4c7a46' },
  coque: { label: { fr: 'coque', en: 'hull', ja: '船体' }, note: { fr: 'coque renforcée et réparée', en: 'hull strengthened and repaired', ja: '船体を補強・修理' }, color: '#9a3b2c' },
  canons: { label: { fr: 'canons', en: 'guns', ja: '砲' }, note: { fr: 'plus de pièces en batterie', en: 'more guns in battery', ja: '砲門が増える' }, color: '#33568a' },
};
/* dix crans par caisse ; les cinq derniers rapportent moitié moins (upEff) */
const MAX_UP = 10;
/* voilure gagnée : combien d'étages de voiles on établit à chaque cran (huniers et brigantine ;
 * basses voiles ; perroquets ; cacatois ; bonnettes de hunier ; bonnettes basses) */
const SAIL_CAP = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6];
const upEff = (l) => Math.min(l, 5) + Math.max(0, l - 5) * 0.5;
/* un navire qui ne marche plus à la voile (le Kaiten de 1869) : la caisse verte, c'est sa machine */
function priseText(kind, spec, what) {
  if (kind === 'voilure' && spec && spec.look && spec.look.noSail) return what === 'note' ? { fr: 'plus de vapeur : plus vite, plus maniable', en: 'more steam: faster, handier', ja: '蒸気を上げる：速く、扱いやすく' } : { fr: 'machine', en: 'engine', ja: '機関' };
  return PRISES[kind][what];
}

const ARC_PLACES = [
  { name: 'Rade d\'Esashi', season: 'hiver', snow: true, wind: 292, sea: 2.2 },
  { name: 'Détroit de Tsugaru', season: 'hiver', snow: false, wind: 300, sea: 2.8 },
  { name: 'Large de Kaminokuni', season: 'hiver', snow: true, wind: 285, sea: 2 },
  { name: 'Cap de Matsumae', season: 'hiver', snow: false, wind: 310, sea: 3 },
  { name: 'Baie de Hakodate', season: 'printemps', snow: false, wind: 200, sea: 1.2 },
  { name: 'Côte d\'Otobe', season: 'printemps', snow: false, wind: 190, sea: 1 },
  { name: 'Large de Kumaishi', season: 'hiver', snow: true, wind: 295, sea: 2.6 },
  { name: 'Baie de Miyako', season: 'printemps', snow: false, wind: 160, sea: 1.4 },
];

/* plan d'un niveau d'arcade : tout monte doucement avec le numéro, comme dans le modèle */
function arcadePlan(n) {
  /* le champ fait à peu près trois écrans : il faut de quoi le garnir */
  return {
    crates: Math.min(9, 3 + Math.floor((n - 1) / 2)),
    radeaux: Math.min(24, 6 + Math.floor(n * 1.6)),
    amas: n >= 2 ? Math.min(8, n) : 0,
    epaves: n >= 3 ? Math.min(6, n - 2) : 0,
    brulots: n >= 2 ? Math.min(9, 1 + Math.floor(n * 0.6)) : 0,
    tourbillons: n >= 4 ? Math.min(2, Math.floor((n - 1) / 3)) : 0,
    /* les caisses peintes se font plus rares dans les derniers niveaux : un choc doit y coûter */
    prises: n === 1 ? 2 : n <= 5 ? 3 : n <= 7 ? 2 : 1,
    /* tout dérive un peu plus vite à mesure qu'on avance */
    speed: 1 + Math.min(0.8, (n - 1) * 0.07),
  };
}
