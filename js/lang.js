'use strict';

/* Les trois langues du jeu : français, anglais, japonais.
 * T('clé', ...) : les textes de l'interface ; tx(v) : les textes des données,
 * écrits { fr, en, ja } (ou une simple chaîne, alors la même partout).
 * Le choix est gardé d'une partie à l'autre. */

const LANGS = [
  { id: 'fr', name: 'Français' },
  { id: 'en', name: 'English' },
  { id: 'ja', name: '日本語' },
];
const LANG_SAVE = 'kaisen.langue';
let LANG = (() => {
  try { const v = localStorage.getItem(LANG_SAVE); if (v && LANGS.some((l) => l.id === v)) return v; } catch (e) { /* rien */ }
  const n = (navigator.language || 'fr').toLowerCase();
  return n.startsWith('ja') ? 'ja' : n.startsWith('en') ? 'en' : 'fr';
})();


function setLang(id) {
  LANG = id;
  try { localStorage.setItem(LANG_SAVE, id); } catch (e) { /* rien */ }
  document.documentElement.lang = id;
  document.documentElement.classList.toggle('ja', id === 'ja');
}

const STR = { fr: {}, en: {}, ja: {} };
/* ajoute des textes : addStr({ clé: [fr, en, ja] }) */
function addStr(o) {
  for (const k in o) { const v = o[k]; STR.fr[k] = v[0]; STR.en[k] = v[1] !== undefined ? v[1] : v[0]; STR.ja[k] = v[2] !== undefined ? v[2] : v[1] !== undefined ? v[1] : v[0]; }
}

function T(key, ...a) {
  let s = STR[LANG][key];
  if (s === undefined) s = STR.fr[key];
  if (s === undefined) return key;
  if (typeof s === 'function') return s(...a);
  return a.length ? s.replace(/\{(\d)\}/g, (m, i) => (a[+i] !== undefined ? a[+i] : m)) : s;
}

function tx(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && !Array.isArray(v)) return v[LANG] !== undefined ? v[LANG] : v.fr;
  return v;
}

/* le nom d'un navire : en kanji pour le japonais */
function shipName(spec) { return LANG === 'ja' && spec.jp ? spec.jp : spec.name; }

/* nombres : espace fine en français, virgule en anglais, rien en japonais */
function fmtN(n) {
  const s = String(Math.round(n));
  const sep = LANG === 'fr' ? ' ' : ',';
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

addStr({
  'mist.warn': ['Une brume épaisse : faites demi-tour', 'Thick fog ahead: turn back', '濃い霧だ。引き返せ'],
  'mist.lost': ['Égarés dans la brume', 'Lost in the fog', '霧の中で迷う'],
  'mist.lost2': ['On ne voit plus l\'étrave depuis la passerelle', 'From the bridge, the bow has vanished', '艦橋から艦首も見えない'],
  'mist.found': ['La brume se lève', 'The fog lifts', '霧が晴れる'],
  'mist.found2': ['On a retrouvé la route', 'We are back on course', '針路を取り戻した'],
  'lost.voilure': ['choc : un cran de voilure perdu', 'impact: one level of sail lost', '衝突：帆走が一段下がる'],
  'lost.coque': ['choc : un cran de coque perdu', 'impact: one level of hull lost', '衝突：船体が一段下がる'],
  'lost.machine': ['choc : un cran de machine perdu', 'impact: one level of engine lost', '衝突：機関が一段下がる'],
  'lost.canons': ['choc : un cran de canons perdu', 'impact: one level of guns lost', '衝突：砲が一段下がる'],
});

addStr({
  'doc.title': ['Les Dix de Hakodate · L\'aventure de De Nicol', 'The Ten of Hakodate · De Nicol\'s Adventure', '箱館の十人 · ド・ニコルの冒険'],
  'title.name': ['Les Dix de Hakodate', 'The Ten of Hakodate', '箱館の十人'],
  /* le sous-titre : le premier jeu suit De Nicol, à bord du Kaiten */
  'title.sub': ['L\'aventure de De Nicol', 'De Nicol\'s Adventure', 'ド・ニコルの冒険'],
  'title.kicker': ['Combats de mer en Ezo', 'Sea battles off Ezo', '蝦夷の海戦'],
  'title.tag': ['Le jeu officiel de la bande dessinée', 'The official game of the graphic novel', '漫画『箱館の十人』公式ゲーム'],
  'title.credit': ['La véritable histoire de Jules Brunet et des Français d\'Ezo · Night Workers', 'The True Story of Jules Brunet and the Frenchmen of Ezo · Night Workers', 'ジュール・ブリュネと蝦夷のフランス人たちの実話 · ナイトワーカーズ'],
});

/* ---------- l'interface ---------- */
addStr({
  'load': ['Préparation de la mer…', 'Preparing the sea…', '海を準備中…'],
  'score': ['Score', 'Score', 'スコア'],
  'k.choose': ['choisir', 'choose', '選択'],
  'k.enter': ['Entrée', 'Enter', 'Enter'],
  'k.ok': ['valider', 'confirm', '決定'],
  'k.esc': ['Échap', 'Esc', 'Esc'],
  'k.back': ['retour', 'back', '戻る'],
  'k.backItem': ['Retour', 'Back', '戻る'],
  'k.space': ['Espace', 'Space', 'スペース'],
  'snd.on': ['Son rétabli', 'Sound on', 'サウンドオン'],
  'snd.off': ['Son coupé', 'Sound off', 'サウンドオフ'],

  'menu.story': ['Mode histoire', 'Story mode', 'ストーリーモード'],
  'menu.story.d': ['{0} épisodes de la guerre d\'Ezo, du naufrage d\'Esashi à la baie de Hakodate, sur les vraies côtes, d\'après les recherches de la bande dessinée.', '{0} episodes of the Ezo war, from the wreck at Esashi to Hakodate Bay, on the real coastlines, based on the research behind the graphic novel.', '江差の座礁から箱館湾まで、蝦夷の戦いの{0}つのエピソード。実在の海岸線で、漫画のための調査にもとづいて描く。'],
  'menu.story.done': ['Étapes réussies : {0} / {1}.', 'Stages completed: {0} / {1}.', 'クリア：{0} / {1}'],
  'menu.arcade': ['Mode arcade', 'Arcade mode', 'アーケードモード'],
  'menu.arcade.d': ['Repêcher une cargaison perdue au milieu des débris, des brûlots, des tourbillons et des grandes bêtes de la mer, niveau après niveau, en améliorant son navire.', 'Recover a lost cargo among debris, fireships, whirlpools and the great beasts of the sea, level after level, improving your ship as you go.', '漂流物と火船と渦、そして海の大きな生き物のなかで失われた積荷を拾い、艦を強化しながらレベルを重ねていく。'],
  'menu.record': ['Record : {0}.', 'High score: {0}.', 'ハイスコア：{0}'],
  'menu.help': ['Commandes', 'Controls', '操作方法'],
  'menu.help.d': ['Tout se joue au clavier, sans souris.', 'Everything is played on the keyboard, no mouse.', 'すべてキーボードで操作する。マウスは使わない。'],
  'menu.lang': ['Langue', 'Language', '言語'],
  'menu.lang.d': ['Français, anglais ou japonais : ← → ou Entrée pour changer.', 'French, English or Japanese: ← → or Enter to change.', 'フランス語・英語・日本語。← → または Enter で切り替え。'],
  'menu.music.on': ['Musique : jouée', 'Music: on', '音楽：オン'],
  'menu.music.off': ['Musique : coupée', 'Music: off', '音楽：オフ'],
  'menu.music.d': ['La musique du jeu : koto, shakuhachi, taiko, et le fifre et le tambour des Français.', 'The game\'s music: koto, shakuhachi, taiko, and the fife and drum of the French.', 'ゲーム音楽。箏、尺八、太鼓、そしてフランス兵の横笛と小太鼓。'],
  'menu.sound.on': ['Son : activé', 'Sound: on', 'サウンド：オン'],
  'menu.sound.off': ['Son : coupé', 'Sound: off', 'サウンド：オフ'],
  'menu.sound.d': ['Couper ou rétablir tout le son (M en jeu).', 'Mute or restore all sound (M in game).', 'すべての音を切り替える（ゲーム中は M）。'],
  'menu.main': ['Menu principal', 'Main menu', 'メインメニュー'],

  'help.title': ['À la barre', 'At the helm', '舵を取る'],
  'help.up': ['Machine en avant. La manette reste où vous la laissez : le navire continue sur son erre.', 'Engine ahead. The lever stays where you leave it: the ship keeps her way.', '機関前進。レバーは離した位置のままで、船は行き足を保つ。'],
  'help.down': ['Ralentir, stopper, puis battre en arrière.', 'Slow down, stop, then go astern.', '減速、停止、そして後進。'],
  'help.lr': ['La barre. Un navire vire mieux quand il a de l\'erre ; les caisses de voilure le rendent plus vif. En corsaire, virer court à pleine allure couche un voilier : tant que sa coque est faible, il chavire. Réduisez l\'allure, ou lâchez la barre quand la jauge de gîte rougit. Les roues à aubes le tiennent droit.', 'The helm. A ship turns better when she has way on; sail crates make her livelier. In corsair mode, a hard turn at full speed lays a sailing ship over: while her hull is weak, she capsizes. Ease the speed, or let go of the helm when the heel gauge turns red. Paddle wheels keep her upright.', '舵。行き足があるほどよく曲がる。帆走の箱で機敏になる。コルセアでは、全速の急旋回で帆船は大きく傾き、船体が弱いうちは転覆する。速さを落とすか、傾斜ゲージが赤くなったら舵を戻せ。外輪船は傾かない。'],
  'help.fire': ['Feu. Les pièces de chasse tirent devant ; si un ennemi est par le travers, toute la bordée part de ce côté.', 'Fire. The chase guns fire ahead; if an enemy is abeam, the whole broadside fires on that side.', '砲撃。艦首砲は前方へ撃つ。敵が真横にいれば、その舷の砲が一斉に火を噴く。'],
  'help.pause': ['Pause.', 'Pause.', '一時停止。'],
  'help.mute': ['Couper ou rétablir le son.', 'Mute or restore the sound.', '音のオン・オフ。'],
  'help.small': ['ZQSD et WASD fonctionnent aussi. Toucher la côte à pleine vitesse abîme la coque et stoppe la machine : virez ou battez en arrière. Il n\'y a pas de bord au monde, mais au-delà de la carte la brume s\'épaissit, et l\'on s\'y égare.', 'ZQSD and WASD work too. Hitting the coast at full speed damages the hull and stops the engine: turn away or go astern. The world has no edge, but beyond the map the fog thickens, and you get lost in it.', 'WASD でも操作できる。全速で岸にぶつかると船体が傷み、機関が止まる。舵を切るか後進せよ。世界に端はないが、地図の外では霧が濃くなり、迷ってしまう。'],
  'help.float': ['Ce qui flotte', 'What floats', '漂うもの'],
  'help.o1': ['Débris', 'Debris', '漂流物'],
  'help.o1d': ['se brisent en deux, puis encore ; certains cachent une caisse', 'break in two, then again; some hide a crate', '二つに割れ、さらに割れる。木箱を隠すものもある'],
  'help.o2': ['Tonneaux', 'Barrels', '樽'],
  'help.o2d': ['éclatent en quatre d\'un coup', 'burst into four at once', '一度に四つに砕ける'],
  'help.o3': ['Épave chavirée', 'Capsized wreck', '転覆した残骸'],
  'help.o3d': ['la quille en l\'air, doublée de cuivre : indestructible, on l\'évite ou on la repousse', 'keel up, copper-sheathed: indestructible, avoid it or push it away', '竜骨を上に向けた銅張りの船体。壊せないので避けるか押しのける'],
  'help.o4': ['Brûlot', 'Fireship', '火船'],
  'help.o4d': ['une barque en flammes qui fonce sur vous', 'a burning boat that rushes at you', '燃えながら突っ込んでくる小舟'],
  'help.o5': ['Tourbillon', 'Whirlpool', '渦潮'],
  'help.o5d': ['dans le sens du courant, il vous lance ; à contre-courant, il vous aspire ; son œil ronge la coque et engloutit les caisses', 'with the current it slings you on; against it, it sucks you in; its eye gnaws the hull and swallows crates', '流れに乗れば加速し、逆らえば吸い込まれる。渦の目は船体を傷め、木箱を呑み込む'],
  'help.o6': ['Caisse verte', 'Green crate', '緑の箱'],
  'help.o6d': ['voilure : plus vite, plus maniable (pour le Kaiten, qui ne marche plus à la voile : sa machine)', 'sail: faster, handier (for the Kaiten, which no longer sails: her engine)', '帆走：速く、扱いやすく（帆を使わなくなった回天では機関）'],
  'help.o7': ['Caisse rouge', 'Red crate', '赤の箱'],
  'help.o7d': ['coque renforcée et réparée', 'hull strengthened and repaired', '船体を補強・修理'],
  'help.o8': ['Caisse bleue', 'Blue crate', '青の箱'],
  'help.o8d': ['canons : plus de pièces, bordées plus fournies', 'guns: more pieces, heavier broadsides', '砲：砲門が増え、舷側砲が厚くなる'],
  'help.levels': ['Dix crans par caisse ; les cinq derniers, cerclés d\'or, rapportent un peu moins.', 'Ten levels per crate; the last five, edged in gold, bring a little less.', '各箱は十段階。金縁の後半五段は効果がやや小さい。'],
  'help.lose': ['Chaque choc contre un objet coûte de la coque et un cran d\'amélioration : la caisse passe par-dessus bord, et l\'on a quelques secondes pour la rattraper.', 'Every collision with an object costs hull and one upgrade level: the crate goes overboard, and you have a few seconds to catch it.', '物にぶつかるたびに船体と強化が一段失われる。箱は海に落ち、数秒のうちなら拾い直せる。'],

  'ship.fleet': ['La flotte d\'Enomoto', 'Enomoto\'s fleet', '榎本艦隊'],
  'ship.speed': ['Vitesse', 'Speed', '速力'],
  'ship.helm': ['Barre', 'Helm', '舵効き'],
  'ship.hull': ['Coque', 'Hull', '船体'],
  'ship.chase': ['Chasse', 'Chase guns', '艦首砲'],
  'ship.take': ['Prendre ce navire', 'Take this ship', 'この艦で出撃'],
  'ship.scale': ['Les navires sont montrés à la même échelle', 'The ships are shown at the same scale', '各艦は同じ縮尺で描かれている'],
  'ship.change': ['changer de navire', 'change ship', '艦を替える'],
  'fact.L': ['Longueur', 'Length', '全長'],
  'fact.D': ['Déplacement', 'Displacement', '排水量'],
  'fact.P': ['Propulsion', 'Propulsion', '推進'],
  'fact.A': ['Armement', 'Armament', '兵装'],

  'arc.title.c': ['Arcade', 'Arcade', 'アーケード'],
  'arc.title.k': ['Corsaire', 'Corsair', 'コルセア'],
  'arc.c': ['Classique', 'Classic', 'クラシック'],
  'arc.c.d': ['Le navire reste toujours au centre de l\'écran, et c\'est la mer qui défile autour de lui. Pas de terre ni de carte : un champ de débris fermé, qui se referme sur lui-même (ce qui sort d\'un côté revient de l\'autre). Tout se joue d\'un coup d\'œil.', 'The ship always stays in the centre of the screen, and the sea scrolls around her. No land and no chart: a closed debris field that wraps around on itself (what leaves one side comes back on the other). It is all played at a glance.', '艦はつねに画面の中央にあり、まわりの海が流れていく。陸も海図もない。端と端がつながった閉じた漂流物の海で、片側から出たものは反対側から戻ってくる。一目ですべてを見て戦う。'],
  'arc.c.resume': ['Classique : reprendre au niveau {0}', 'Classic: resume at level {0}', 'クラシック：レベル{0}から再開'],
  'arc.new': ['Nouvelle partie', 'New game', '新しいゲーム'],
  'arc.resume.d': ['Repartir du dernier niveau atteint.', 'Start again from the last level reached.', '到達した最後のレベルから。'],
  'arc.h': ['La cargaison perdue', 'The lost cargo', '失われた積荷'],
  'arc.lead': ['Une cargaison s\'est perdue au milieu des débris : repêchez toutes les caisses pour passer au niveau suivant, sans laisser la coque tomber à zéro. Les caisses peintes améliorent la voilure, la coque et les canons. Dix niveaux pour finir l\'arcade ; on peut ensuite continuer. Et parfois, une grande bête de la mer croise la route : la baleine d\'Ebisu, le calmar géant, et plus loin Akkorokamui.', 'A cargo has been lost among the debris: recover every crate to reach the next level, without letting the hull fall to zero. The painted crates improve sail, hull and guns. Ten levels to finish the arcade; then you can carry on. And now and then a great beast of the sea crosses your path: Ebisu\'s whale, the giant squid, and further on Akkorokamui.', '漂流物のなかに積荷が散らばった。船体を失わずにすべての木箱を拾えば次のレベルへ。色付きの箱は帆走・船体・砲を強化する。十のレベルでアーケード制覇。その先も続けられる。ときおり海の大きな生き物が現れる。恵比寿の鯨、大王イカ、そしてその先にはアッコロカムイ。'],
  'arc.rec.c': ['Record arcade', 'Arcade high score', 'アーケード最高点'],
  'arc.lvl.sub': ['{0} caisses à repêcher · suivez les flèches', '{0} crates to recover · follow the arrows', '木箱{0}個 · 矢印をたどれ'],
  'arc.saved': ['Cargaison sauvée !', 'Cargo saved!', '積荷を回収！'],
  'arc.saved2': ['Prime : {0} · les charpentiers réparent un peu la coque', 'Bonus: {0} · the carpenters patch up the hull', 'ボーナス {0} · 船大工が船体を少し修理'],
  'arc.fireship': ['brûlot !', 'fireship!', '火船だ！'],
  'arc.newrec': ['nouveau record', 'new high score', '新記録'],
  'arc.reached': ['Niveau atteint', 'Level reached', '到達レベル'],
  'arc.again': ['Recommencer au niveau {0}', 'Restart at level {0}', 'レベル{0}からやり直す'],
  'arc.fromstart': ['Rejouer depuis le début', 'Play again from the start', '最初から'],

  'hud.stage': ['Étape {0} / {1}', 'Stage {0} / {1}', '第{0}幕 / {1}'],
  'hud.level': ['Niveau', 'Level', 'レベル'],
  'hud.record': ['Record', 'Best', '最高'],
  'hud.time': ['Temps', 'Time', '時間'],
  'hud.reach': ['Gagnez {0}', 'Make for {0}', '{0}へ向かえ'],
  'hud.cargo': ['Repêchez la cargaison', 'Recover the cargo', '積荷を拾え'],
  'hud.launches': ['Recueillez les chaloupes', 'Pick up the launches', '短艇を回収せよ'],
  'hud.board': ['Abordage : restez au contact ({0} %)', 'Boarding: stay in contact ({0}%)', '斬り込み：接触を保て（{0}%）'],
  'hud.approach': ['Approchez le Kōtetsu sans tirer', 'Close the Kōtetsu without firing', '撃たずに甲鉄へ近づけ'],
  'hud.cape': ['Tenez la cape : {0}', 'Ride out the storm: {0}', '嵐に耐えよ：{0}'],
  'hud.hold': ['Tenez jusqu\'au soir : {0}', 'Hold until evening: {0}', '日暮れまで持ちこたえよ：{0}'],
  'hud.coal': ['Accostez le Kaiten · charbon {0} % · soupçons {1}/{2}', 'Come alongside the Kaiten · coal {0}% · suspicion {1}/{2}', '回天に横付けせよ · 石炭{0}% · 疑念{1}/{2}'],
  'hud.coaling': ['On charbonne bord à bord · {0} % · soupçons {1}/{2}', 'Coaling alongside · {0}% · suspicion {1}/{2}', '横付けで積炭中 · {0}% · 疑念{1}/{2}'],
  'hud.beach': ['Gagnez la plage et jetez-vous à la côte', 'Reach the beach and run her ashore', '浜へ向かい、船を乗り上げよ'],
  'hud.evac': ['Évacuation : l\'équipage gagne la grève', 'Evacuation: the crew is getting ashore', '退船：乗組員が浜へ上がる'],
  'hud.sink': ['Coulez le {0}', 'Sink the {0}', '{0}を撃沈せよ'],
  'hud.moored': ['Embossé', 'Moored with springs', '係留中'],
  'hud.flag.us': ['Pavillon américain : la ruse tient', 'American colours: the ruse holds', '米国旗：偽装は保たれている'],
  'hud.flag.ru': ['Pavillon russe : la ruse tient', 'Russian colours: the ruse holds', 'ロシア旗：偽装は保たれている'],
  'hud.flag.jp': ['Pavillon d\'emprunt amené : la ruse est finie', 'False colours hauled down: the ruse is over', '偽りの旗を降ろした：偽装は終わり'],
  'hud.boardbar': ['À L\'ABORDAGE', 'BOARDERS AWAY', '斬り込み'],
  'hud.coalbar': ['CHARBON', 'COAL', '石炭'],
  'hud.wind': ['vent', 'wind', '風'],
  'hud.arcgoal': ['Repêchez les caisses : suivez les flèches', 'Recover the crates: follow the arrows', '木箱を拾え：矢印をたどれ'],
  'thr.back': ['En arrière', 'Astern', '後進'],
  'thr.stop': ['Stoppé', 'Stopped', '停止'],
  'thr.slow': ['En avant lente', 'Slow ahead', '前進微速'],
  'thr.half': ['En avant demie', 'Half ahead', '前進半速'],
  'thr.full': ['En avant toute', 'Full ahead', '前進全速'],
  'ptr.crate': ['caisse', 'crate', '木箱'],
  'ptr.launch': ['chaloupe', 'launch', '短艇'],
  'ptr.barque': ['barque', 'boat', '小舟'],
  'map.start': ['départ', 'start', '出発'],
  'map.goal': ['objectif', 'objective', '目標'],
  'map.open': ['haute mer', 'open sea', '外洋'],

  'story.h': ['Les combats de mer de la guerre d\'Ezo', 'The sea fights of the Ezo war', '蝦夷の戦いの海戦'],
  'story.lead': ['Décembre 1868 à juin 1869. Chaque étape réussie ouvre la suivante, et certaines donnent un navire de plus pour l\'arcade.', 'December 1868 to June 1869. Each stage you complete opens the next, and some give you another ship for the arcade.', '1868年12月から1869年6月まで。幕をクリアすると次の幕が開き、アーケードで使える艦が増える幕もある。'],
  'story.done': ['Réussie', 'Completed', 'クリア'],
  'brief.goal': ['Objectif', 'Objective', '目標'],
  'brief.choose': ['Vous choisissez votre navire.', 'You choose your ship.', '艦は自由に選べる。'],
  'brief.command': ['Vous commandez le {0}.', 'You command the {0}.', '{0}を指揮する。'],
  'brief.pick': ['Choisir le navire', 'Choose the ship', '艦を選ぶ'],
  'brief.sail': ['Appareiller', 'Get under way', '出航'],
  'pause.h': ['Pause', 'Paused', '一時停止'],
  'pause.resume': ['Reprendre', 'Resume', '再開'],
  'pause.restart.a': ['Recommencer ce niveau', 'Restart this level', 'このレベルをやり直す'],
  'pause.restart.s': ['Recommencer l\'étape', 'Restart the stage', 'この幕をやり直す'],
  'pause.restart.k': ['Revenir au dernier port enregistré', 'Back to the last saved port', '最後に記録した港へ戻る'],
  'helm.gite': ['gîte', 'heel', '傾斜'],
  'helm.warn': ['lâchez la barre !', 'ease the helm!', '舵を戻せ！'],
  'helm.last': ['il se couche : lâchez la barre !', 'she\'s going over: ease the helm!', '倒れるぞ、舵を戻せ！'],
  'helm.cap': ['Chaviré !', 'Capsized!', '転覆！'],
  'helm.saved': ['Rattrapé de justesse !', 'Righted just in time!', '間一髪で立て直した！'],
  'helm.tip': ['La jauge sous le navire, c\'est sa gîte : virer court à pleine allure le couche. Réduisez l\'allure ou lâchez la barre avant qu\'elle rougisse.', 'The gauge under the ship is her heel: a hard turn at full speed lays her over. Slow down or ease the helm before it turns red.', '船の下のゲージは傾きだ。全速で急旋回すると船は横倒しになる。赤くなる前に速度を落とすか、舵を戻せ。'],
  'helm.cap2': ['virer court à pleine allure couche un voilier ; avec une coque plus forte, il aurait tenu', 'a hard turn at full speed lays a sailing ship over; with a stronger hull she would have held', '全速の急旋回で帆船は横倒しになる。船体がもっと強ければ持ちこたえた'],

  'st.fired': ['Vous avez ouvert le feu : la ruse est éventée !', 'You opened fire: the ruse is blown!', '発砲した。偽装が露見した！'],
  'st.enters': ['Le {0} entre en scène', 'The {0} appears', '{0}が現れた'],
  'st.crate': ['caisse à bord {0}/{1}', 'crate aboard {0}/{1}', '木箱を回収 {0}/{1}'],
  'st.launch': ['chaloupe en remorque {0}/{1}', 'launch in tow {0}/{1}', '短艇を曳航 {0}/{1}'],
  'st.cargo.done': ['Cargaison à bord : gagnez {0}', 'Cargo aboard: make for {0}', '積荷を回収：{0}へ'],
  'st.launches.done': ['Les chaloupes suivent : gagnez {0}', 'The launches follow: make for {0}', '短艇がついてくる：{0}へ'],
  'st.cape.beam': ['une lame embarque par le travers !', 'a sea breaks aboard on the beam!', '横波が甲板を洗う！'],
  'st.cape.stern': ['la mer déferle sur l\'arrière !', 'the sea breaks over the stern!', '追い波が艦尾に砕ける！'],
  'st.cape.bury': ['il enfourne dans les lames !', 'she buries her bow in the seas!', '艦首が波に突っ込む！'],
  'st.cape.good': ['la lame passe sous l\'étrave', 'the sea passes under the bow', '波が艦首の下を抜けた'],
  'st.calm': ['Calme plat', 'Dead calm', '凪'],
  'st.calm2': ['« le calme plat succéda sans transition à la tempête »', '"dead calm followed the storm without transition"', '「嵐のあとに、いきなり凪が来た」'],
  'st.coal.start': ['bord à bord : on charbonne, on répare la machine', 'alongside: coaling and repairing the engine', '横付け：積炭と機関の修理'],
  'st.coal.done': ['Soutes pleines, machine réparée : en route pour Miyako', 'Bunkers full, engine repaired: away to Miyako', '石炭庫は満杯、機関も修理済み：宮古へ'],
  'st.barque.out': ['Les barques du village', 'The village boats', '村の小舟'],
  'st.barque.out2': ['Elles viennent aux nouvelles : tenez-les au large du Kaiten', 'They are coming for news: keep them away from the Kaiten', '様子をうかがいに来る。回天に近づけるな'],
  'st.barque.back': ['tenue au large', 'kept off', '沖に留めた'],
  'st.barque.water': ['eau fraîche acceptée, barque renvoyée', 'fresh water taken, boat sent back', '真水を受け取り、小舟を帰した'],
  'st.sus': ['Une barque a accosté le Kaiten : soupçons {0}/{1}', 'A boat reached the Kaiten: suspicion {0}/{1}', '小舟が回天に着いた：疑念{0}/{1}'],
  'st.sus2': ['Le nanushi pose trop de questions', 'The headman asks too many questions', '名主が根掘り葉掘り尋ねる'],
  'st.fail.ruse': ['La ruse est éventée', 'The ruse is found out', '偽装が露見した'],
  'st.beach.aground': ['Échoué !', 'Aground!', '座礁！'],
  'st.beach.aground2': ['À une trentaine de mètres de la grève', 'Some thirty metres from the shore', '浜からおよそ三十メートル'],
  'st.beach.spike': ['on encloue les canons', 'spiking the guns', '砲に釘を打つ'],
  'st.beach.engine': ['on brise la machine à la masse', 'smashing the engine with sledgehammers', '大槌で機関を壊す'],
  'st.beach.fuse': ['la mèche soufrée est allumée', 'the sulphur fuse is lit', '硫黄の導火線に火が付いた'],
  'st.beach.blown': ['Le Takao a sauté', 'The Takao has blown up', '高雄が爆発した'],
  'st.soup': ['soupe sucrée aux haricots : l\'équipage reprend courage', 'sweet bean soup: the crew takes heart', '汁粉で乗組員が奮い立つ'],
  'st.held': ['Le soir tombe : le Kaiten a tenu', 'Evening falls: the Kaiten has held', '日が暮れる：回天は持ちこたえた'],
  'st.retreat': ['Le {0} se retire', 'The {0} withdraws', '{0}が退く'],
  'st.retreat2': ['désemparé, il quitte le combat', 'disabled, she leaves the fight', '損傷して戦列を離れる'],
  'st.armor': ['les boulets ricochent sur la cuirasse', 'the shot bounces off the armour', '砲弾が装甲に弾かれる'],
  'st.magazine': ['La soute du Chōyō saute !', 'The Chōyō\'s magazine blows up!', '朝陽の弾薬庫が爆発！'],
  'st.magazine2': ['Un obus du Banryū a trouvé les poudres', 'A shell from the Banryū found the powder', '蟠竜の一弾が火薬に届いた'],
  'st.sinks': ['Le {0} coule', 'The {0} sinks', '{0}が沈む'],
  'st.hinomaru': ['Bas la bannière étoilée : à l\'abordage !', 'Down with the Stars and Stripes: boarders away!', '星条旗を降ろせ：斬り込め！'],
  'st.board': ['À l\'abordage !', 'Boarders away!', '斬り込め！'],
  'st.board2': ['Restez au contact du Kōtetsu', 'Stay in contact with the Kōtetsu', '甲鉄との接触を保て'],
  'st.board.fail': ['L\'abordage échoue', 'The boarding fails', '斬り込み失敗'],
  'st.board.fail2': ['Arai prend lui-même la barre et dégage le navire : au large !', 'Arai takes the helm himself and frees the ship: out to sea!', '荒井が自ら舵を取り、船体を引き離す：沖へ！'],
  'st.won': ['Étape réussie', 'Stage complete', '幕クリア'],

  'res.kicker': ['Étape réussie', 'Stage complete', '幕クリア'],
  'res.after': ['Ce qui s\'est passé', 'What happened', '史実'],
  'res.crates': ['Caisses repêchées', 'Crates recovered', '回収した木箱'],
  'res.launches': ['Chaloupes ramenées', 'Launches brought back', '連れ帰った短艇'],
  'res.board': ['Abordage', 'Boarding', '斬り込み'],
  'res.board.v': ['tenu, puis repli', 'held, then withdrew', '接触ののち撤退'],
  'res.sunk': ['coulé', 'sunk', '撃沈'],
  'res.coal': ['Charbon', 'Coal', '石炭'],
  'res.sus': ['soupçons {0}/{1}', 'suspicion {0}/{1}', '疑念{0}/{1}'],
  'res.beach': ['Échouage', 'Beaching', '座礁'],
  'res.beach.v': ['l\'équipage à terre', 'crew ashore', '乗組員は上陸'],
  'res.cape': ['Cape', 'Storm', '嵐'],
  'res.held': ['Batterie', 'Battery', '砲台'],
  'res.held.v': ['tenu', 'held', '持ちこたえた'],
  'res.time': ['Temps', 'Time', '時間'],
  'res.time.v': ['{0} min {1} s', '{0} min {1} s', '{0}分{1}秒'],
  'res.hull': ['Coque', 'Hull', '船体'],
  'res.lost': ['sacrifiée', 'sacrificed', '放棄'],
  'res.score': ['Score', 'Score', 'スコア'],
  'res.next': ['Étape suivante : {0}', 'Next stage: {0}', '次の幕：{0}'],
  'res.epilogue': ['Épilogue', 'Epilogue', 'エピローグ'],
  'res.epi.kicker': ['Ezo, 1868-1869', 'Ezo, 1868-1869', '蝦夷、1868-1869年'],
  'res.replay': ['Rejouer cette étape', 'Replay this stage', 'この幕をもう一度'],
  'res.restart': ['Recommencer l\'étape', 'Restart the stage', 'この幕をやり直す'],
  'res.orders': ['Revoir les ordres', 'Read the orders again', '命令をもう一度読む'],
  'res.sank': ['Le {0} a sombré', 'The {0} has gone down', '{0}は沈んだ'],
  'res.toArcade': ['Jouer en mode arcade', 'Play arcade mode', 'アーケードモードへ'],

  'w.aground': ['talonné ! -{0}', 'struck bottom! -{0}', '座礁！ -{0}'],
  'w.crate': ['une caisse !', 'a crate!', '木箱だ！'],
  'w.broken': ['brisée sur la côte', 'smashed on the shore', '岸で砕けた'],
  'w.swallowed': ['caisse engloutie', 'crate swallowed', '木箱が呑まれた'],
  'w.eye': ['aspiré par l\'œil !', 'sucked into the eye!', '渦の目に吸い込まれる！'],
  'w.sling': ['lancé par le courant !', 'slung by the current!', '渦に乗って加速！'],
});

/* les textes fixes de la page */

/* ---------- les ordres et les conseils du mode histoire ---------- */
addStr({
  'ord.k': ['Ordres · {0} sur {1}', 'Orders · {0} of {1}', '命令 · {0}/{1}'],
  'ord.k2': ['Ordres', 'Orders', '命令'],
  'brief.steps': ['Déroulé', 'How it goes', '展開'],
  'pause.orders': ['Vos ordres', 'Your orders', '現在の命令'],
  'h.debris': ['Les débris abîment la coque : tirez dessus (Espace) pour les briser.', 'Debris damages the hull: shoot it (Space) to break it up.', '漂流物は船体を傷める。砲撃（スペース）で砕け。'],
  'h.lee': ['Le vent vous pousse à la côte : gardez de l\'erre et remontez au large.', 'The wind is setting you ashore: keep way on and claw off to seaward.', '風に岸へ押されている。行き足を保ち、沖へ出よ。'],
  'h.cape.beam': ['Le vent est par le travers : ramenez l\'étrave dans le secteur vert (← →).', 'The wind is on the beam: bring the bow back into the green sector (← →).', '風が真横から来ている。艦首を緑の範囲に戻せ（← →）。'],
  'st.alarm': ['L\'alarme gagne la rade', 'The alarm spreads through the anchorage', '警報が湾内に広がる'],
  'st.alarm2': ['Le Kasuga ouvre le feu depuis son mouillage', 'The Kasuga opens fire from her anchorage', '春日が停泊したまま砲撃を開始'],
  'h.cape.debris': ['Débris droit devant : brisez-les au canon de chasse (Espace), ou laissez-les glisser le long du bord sans quitter le secteur vert.', 'Debris dead ahead: break it up with the bow gun (Space), or let it slide along the side without leaving the green sector.', '正面に漂流物。艦首砲（スペース）で砕くか、緑の範囲を外れずに舷側をすり抜けさせよ。'],
  'h.cape.bury': ['Trop de machine : le navire enfourne. Ralentissez (↓).', 'Too much engine: she is burying her bow. Ease off (↓).', '機関が強すぎて艦首が波に突っ込む。速力を落とせ（↓）。'],
  'h.slow': ['Trop vite pour charbonner : stoppez la machine (↓ jusqu\'à « stoppé »).', 'Too fast to coal: stop the engine (↓ down to "stopped").', '速すぎて積炭できない。機関を止めよ（↓で「停止」まで）。'],
  'h.circle': ['Entrez dans le cercle doré, le long du Kaiten.', 'Get into the golden circle, alongside the Kaiten.', '回天の横、金色の円の中に入れ。'],
  'h.back': ['Le charbon attend : revenez bord à bord, dans le cercle doré.', 'The coal is waiting: come back alongside, into the golden circle.', '石炭が待っている。金色の円に戻り、横付けせよ。'],
  'h.contact': ['Remettez l\'étrave contre le flanc du Kōtetsu, dans le cercle rouge.', 'Put your bow back against the Kōtetsu\'s side, inside the red circle.', '赤い円の中で、艦首を甲鉄の舷側に当て直せ。'],
  'h.aim': ['Le Kōtetsu vous met en joue : tournez franchement (← ou →) avant le coup !', 'The Kōtetsu is taking aim: turn hard (← or →) before she fires!', '甲鉄が狙っている。撃たれる前に大きく舵を切れ（←か→）！'],
  'h.full': ['Machine en avant toute (↑) : chaque seconde compte.', 'Full ahead (↑): every second counts.', '機関前進全速（↑）。一秒を争う。'],
  'h.broad': ['Présentez le travers au {0} : ← ou → pour pivoter.', 'Bring your broadside to bear on the {0}: ← or → to swing.', '{0}に舷側を向けよ。←か→で回頭。'],
  'h.choyo.hurt': ['Le Chōyō est entamé : un obus peut maintenant trouver sa soute.', 'The Chōyō is damaged: a shell can now find her magazine.', '朝陽は傷ついた。いまなら一弾が弾薬庫に届く。'],
  'z.berth': ['bord à bord', 'alongside', '横付け'],
  'z.hail': ['héler', 'hail', '呼び止め'],
  'z.board': ['abordage', 'boarding', '斬り込み'],
  'hud.coalwait': ['charbon : revenez bord à bord', 'coal: come back alongside', '石炭：横付けに戻れ'],
  'hud.evacbar': ['évacuation', 'evacuation', '退船'],
  'st.barque.return': ['Revenez bord à bord avec le Kaiten et stoppez : le charbon attend.', 'Come back alongside the Kaiten and stop: the coal is waiting.', '回天の横に戻って停止せよ。石炭が待っている。'],
  'st.sus.fire': ['Un coup de canon dans une baie tranquille : soupçons {0}/{1}', 'A gunshot in a quiet bay: suspicion {0}/{1}', '静かな湾に砲声：疑念{0}/{1}'],
  'st.board.jump': ['les hommes sautent un à un, trois mètres plus bas', 'the men jump one by one, three metres down', '斬り込み隊が一人ずつ、三メートル下へ飛び降りる'],
  'st.board.nicol': ['l\'aspirant Nicol est touché de deux balles', 'Midshipman Nicol is hit by two bullets', '見習士官ニコルが二発被弾'],
  'st.board.koga': ['Kōga Gengo est tué', 'Kōga Gengo is killed', '甲賀源吾戦死'],
  'st.kaiten.out': ['Le Kaiten ressort de la baie', 'The Kaiten comes out of the bay', '回天が湾から出てくる'],
  'st.kaiten.out2': ['Il file au nord sans répondre aux signaux', 'She runs north without answering signals', '信号に応えず、北へ去っていく'],
  'st.squadron': ['L\'escadre impériale appareille', 'The imperial squadron is under way', '新政府艦隊が抜錨'],
  'st.squadron2': ['Le Kōtetsu en tête, le Kasuga sur sa hanche : virez de bord vers Tanohata', 'The Kōtetsu leading, the Kasuga on her quarter: go about for Tanohata', '先頭に甲鉄、その斜め後ろに春日。反転して田野畑へ'],
  'st.aim': ['Le Kōtetsu vous met en joue !', 'The Kōtetsu is taking aim!', '甲鉄が狙いをつけた！'],
  'st.aim.miss': ['le boulet de 300 livres passe à côté', 'the 300-pound shot goes wide', '300ポンド弾はそれた'],
  'st.aim.hit': ['touché par le Kōtetsu !', 'hit by the Kōtetsu!', '甲鉄の弾が命中！'],
  'st.ammo.out': ['Plus de munitions', 'Out of ammunition', '弾薬が尽きた'],
  'st.ammo.out2': ['Le Banryū rompt le combat : vers le fort de Benten', 'The Banryū breaks off: for the Benten fort', '蟠竜は戦いを切り上げ、弁天台場へ'],
  'st.shoal': ['Le Banryū s\'échoue sous le fort de Benten', 'The Banryū runs aground below the Benten fort', '蟠竜、弁天台場下の浅瀬に乗り上げる'],
  'st.shoal2': ['L\'équipage brise la machine et gagne le fort', 'The crew smashes the engine and makes for the fort', '乗組員は機関を壊し、台場に入る'],
  'st.shoal.won': ['Le Banryū s\'est battu jusqu\'au bout', 'The Banryū fought to the end', '蟠竜は最後まで戦い抜いた'],
});


/* ---------- les déblocages ---------- */
addStr({
  'lock.h': ['Pas encore gagné', 'Not yet won', '未獲得'],
  'lock.stage': ['Se débloque en réussissant l\'étape {0} du mode histoire : {1}.', 'Unlocked by completing stage {0} of the story mode: {1}.', '物語モード第{0}幕「{1}」をクリアすると解放。'],
  'lock.arcade': ['Se débloque en finissant l\'arcade (passez le niveau {0}) ou en prenant huit ports en corsaire.', 'Unlocked by finishing the arcade (clear level {0}) or by taking eight ports in corsair mode.', 'アーケードを制覇（レベル{0}をクリア）するか、コルセアで八つの港を取ると解放。'],
  'lock.story': ['Le Kōtetsu ne sert qu\'en arcade.', 'The Kōtetsu is for the arcade only.', '甲鉄はアーケード専用。'],
  'lock.tab': ['à gagner', 'to win', '未獲得'],
  'lock.btn': ['Pas encore gagné', 'Not yet won', '未獲得'],
  'story.locked': ['Réussissez l\'étape précédente', 'Complete the previous stage', '前の幕をクリア'],
  'res.unlock': ['Nouveau navire pour l\'arcade', 'New ship for the arcade', 'アーケードに新しい艦'],
  'res.unlock.n': ['débloqué', 'unlocked', '解放'],
  'arc.fin.k': ['Arcade terminée', 'Arcade finished', 'アーケード制覇'],
  'arc.fin.t': ['La cargaison est sauvée', 'The cargo is saved', '積荷は救われた'],
  'arc.fin.text': ['Dix niveaux repêchés. En récompense, le Kōtetsu, l\'ancien Stonewall, rejoint votre flotte : il porte le Hinomaru. On peut aussi continuer, aussi loin qu\'on veut.', 'Ten levels recovered. As a reward, the Kōtetsu, the former Stonewall, joins your fleet, flying the Hinomaru. You can also carry on, as far as you like.', '十のレベルを制覇した。褒美として、元ストーンウォールの甲鉄が日の丸を掲げて艦隊に加わる。このまま先へ進むこともできる。'],
  'arc.fin.again': ['Dix niveaux repêchés, une fois de plus. On peut continuer, aussi loin qu\'on veut.', 'Ten levels recovered, once again. You can carry on, as far as you like.', '再び十のレベルを制覇した。このまま先へ進むこともできる。'],
  'arc.fin.go': ['Continuer au niveau {0}', 'Carry on to level {0}', 'レベル{0}へ進む'],
  'arc.fin.take': ['Prendre le Kōtetsu', 'Take the Kōtetsu', '甲鉄で出撃'],
});

function applyStaticText() {
  const set = (id, t) => { const n = document.getElementById(id); if (n) n.textContent = t; };
  set('loading-t', T('load'));
  set('h-score-l', T('score'));
  document.title = T('doc.title');
  document.querySelectorAll('[data-up]').forEach((n) => { n.textContent = tx(PRISES[n.dataset.up].label); });
}
