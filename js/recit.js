'use strict';

/* ---------- le récit en images ----------
 * Avant chaque étape, quelques cases de la bande dessinée « Les Dix de Hakodate »,
 * reprises sans leurs bulles, racontent ce qui a mené là ; après la victoire, la suite.
 * Une petite projection au clavier : ← → pour feuilleter, Entrée pour avancer,
 * Échap pour passer. Les légendes suivent la charte des textes du jeu (dates
 * grégoriennes, aucune parole inventée) ; les images viennent des tomes 1 à 4. */

const RECIT_DIR = 'img/recit/';
const RECIT_SAVE = 'kaisen.recit';

const RECIT = {
  naufrage: {
    avant: [
      { img: 'naufrage_1', tome: 1, t: { fr: 'Décembre 1868. Esashi est prise. Le Kaiyō Maru, vaisseau amiral d\'Enomoto Takeaki, mouille devant la ville.', en: 'December 1868. Esashi has been taken. The Kaiyō Maru, Enomoto Takeaki\'s flagship, lies at anchor off the town.', ja: '1868年12月、江差は落ちた。榎本武揚の旗艦・開陽丸が町の沖に錨を下ろしている。' } },
      { img: 'naufrage_2', tome: 1, t: { fr: 'Dans la nuit du 28 décembre, une tempête de neige se lève.', en: 'On the night of 28 December, a snowstorm blows up.', ja: '12月28日の夜、吹雪が起こる。' } },
      { img: 'naufrage_3', tome: 1, t: { fr: 'Le vent tourne. Sur un mauvais fond, l\'ancre chasse.', en: 'The wind shifts. On poor holding ground, the anchor drags.', ja: '風が回り、悪い海底で錨が走る。' } },
      { img: 'naufrage_4', tome: 1, t: { fr: 'Le navire est jeté sur les roches. On ne pourra pas le renflouer.', en: 'The ship is driven onto the rocks. She will never be refloated.', ja: '艦は岩礁に打ち上げられた。もう離礁はかなわない。' } },
      { img: 'naufrage_5', tome: 1, t: { fr: 'Au matin, l\'équipage est à terre. La cargaison flotte dans la rade, et le vent la pousse vers les roches.', en: 'By morning the crew is ashore. The cargo is adrift in the roads, and the wind is pushing it onto the rocks.', ja: '朝、乗組員は陸に上がった。積荷は湾内を漂い、風に押されて岩礁へ向かう。' } },
    ],
  },
  tabakaze: {
    avant: [
      { img: 'tabakaze_1', tome: 1, t: { fr: 'Le Kaiten et le Shinsoku sont venus de Hakodate pour sauver le vaisseau amiral. Au large, le ciel se ferme de nouveau.', en: 'The Kaiten and the Shinsoku have come from Hakodate to save the flagship. Out to sea, the sky is closing in again.', ja: '回天と神速が旗艦を救おうと箱館から駆けつけた。沖では、ふたたび空が暗くなる。' } },
      { img: 'tabakaze_2', tome: 4, t: { fr: 'La taba-kaze souffle de nouveau sur l\'épave du Kaiyō Maru, plus fort que la première fois.', en: 'The taba-kaze blows again over the wreck of the Kaiyō Maru, harder than the first time.', ja: 'たば風がふたたび開陽丸の残骸に吹きつける。前よりも強く。' } },
    ],
    apres: [
      { img: 'tabakaze_3', tome: 1, t: { fr: 'Il ne reste dans la rade d\'Esashi que deux épaves. Ezo devra se défendre sans son vaisseau amiral.', en: 'All that is left in Esashi roads is two wrecks. Ezo will have to defend itself without its flagship.', ja: '江差の湾に残ったのは二隻の残骸だけ。蝦夷は旗艦なしで戦わねばならない。' } },
    ],
  },
  cyclone: {
    avant: [
      { img: 'cyclone_1', tome: 4, t: { fr: '2 mai 1869. Le Kaiten, le Banryū et le Takao quittent Hakodate pour Miyako. Arai Ikunosuke commande l\'escadre.', en: '2 May 1869. The Kaiten, the Banryū and the Takao leave Hakodate for Miyako. Arai Ikunosuke commands the squadron.', ja: '1869年5月2日、回天・蟠竜・高雄の三隻が宮古をめざして箱館を出る。艦隊を率いるのは荒井郁之助。' } },
      { img: 'cyclone_2', tome: 4, t: { fr: 'Au large, la queue d\'un cyclone les rattrape. Dès les premières rafales, les trois navires se perdent de vue.', en: 'Out at sea, the tail of a cyclone catches them. At the first squalls the three ships lose sight of one another.', ja: '沖で台風の尾が三隻に追いつく。最初の突風で、三隻は互いを見失う。' } },
      { img: 'cyclone_3', tome: 2, t: { fr: 'À bord du Takao, la machine souffre. Il faudra tenir jusqu\'à ce que la mer tombe.', en: 'Aboard the Takao, the engine is suffering. She will have to hold on until the sea goes down.', ja: '高雄の機関が悲鳴を上げる。海が鎮まるまで持ちこたえねばならない。' } },
    ],
    apres: [
      { img: 'cyclone_4', tome: 2, t: { fr: 'La mer tombe d\'un coup. Depuis la mâture, la vigie du Takao fouille l\'horizon : ni le Kaiten ni le Banryū.', en: 'The sea drops all at once. From aloft, the Takao\'s lookout searches the horizon: neither the Kaiten nor the Banryū.', ja: '海は急に静まった。高雄の見張りが帆柱の上から水平線を探す。回天も蟠竜も見えない。' } },
    ],
  },
  yamada: {
    avant: [
      { img: 'yamada_1', tome: 2, t: { fr: '5 mai, à l\'aube : le Takao retrouve le Kaiten. Le Banryū ne reparaîtra pas.', en: 'Dawn, 5 May: the Takao finds the Kaiten again. The Banryū will not reappear.', ja: '5月5日の夜明け、高雄は回天と再会する。蟠竜はついに姿を見せない。' } },
      { img: 'yamada_2', tome: 2, t: { fr: 'Dans la baie de Yamada, on se déguise : pavillon américain sur le Kaiten, pavillon russe sur le Takao.', en: 'In Yamada Bay they go in disguise: American colours on the Kaiten, Russian colours on the Takao.', ja: '山田湾で二隻は姿を偽る。回天には米国旗、高雄にはロシア国旗。' } },
      { img: 'yamada_3', tome: 2, t: { fr: 'Il faut charbonner avant Miyako, sans attirer l\'attention.', en: 'They must take on coal before Miyako without drawing attention.', ja: '宮古の前に、目立たぬよう石炭を積まねばならない。' } },
    ],
    apres: [
      { img: 'yamada_4', tome: 2, t: { fr: 'Le nanushi du village vient saluer les étrangers. On le tient à distance, poliment.', en: 'The village headman comes to greet the foreigners. He is kept at a polite distance.', ja: '村の名主が異国の船にあいさつに来る。一行は丁重に距離を保たせた。' } },
      { img: 'yamada_5', tome: 2, t: { fr: 'Le soir tombe sur deux navires sous de faux pavillons. Demain, Miyako.', en: 'Evening falls on two ships under false colours. Tomorrow, Miyako.', ja: '偽りの旗を掲げた二隻に夜が来る。明日は宮古だ。' } },
    ],
  },
  miyako: {
    avant: [
      { img: 'miyako_1', tome: 4, t: { fr: '6 mai, à l\'aube. Le Kaiten entre seul dans la baie de Miyako, sous pavillon américain, au milieu de la flotte impériale.', en: 'Dawn, 6 May. The Kaiten enters Miyako Bay alone, under American colours, in the middle of the imperial fleet.', ja: '5月6日の夜明け。回天は米国旗を掲げ、ただ一隻で宮古湾に入る。周りは新政府の艦隊だ。' } },
      { img: 'miyako_2', tome: 4, t: { fr: 'Au mouillage, le cuirassé Kōtetsu. C\'est lui qu\'il faut prendre.', en: 'At anchor lies the ironclad Kōtetsu. She is the prize.', ja: '停泊しているのは装甲艦・甲鉄。奪うべきはこの艦だ。' } },
    ],
    apres: [
      { img: 'miyako_3', tome: 4, t: { fr: 'Au dernier moment, le Kaiten hisse ses vraies couleurs et lance son étrave sur le flanc du cuirassé.', en: 'At the last moment the Kaiten shows her true colours and drives her bow onto the ironclad\'s side.', ja: '最後の瞬間、回天は本当の旗を掲げ、甲鉄の舷側に艦首を乗り上げる。' } },
      { img: 'miyako_4', tome: 4, t: { fr: 'Le pont du Kaiten domine celui du Kōtetsu de près de trois mètres. Les hommes sautent un à un, sous le feu.', en: 'The Kaiten\'s deck stands nearly three metres above the Kōtetsu\'s. The men jump one by one, under fire.', ja: '回天の甲板は甲鉄より三メートル近く高い。男たちは銃火の中、一人ずつ飛び降りる。' } },
      { img: 'miyako_5', tome: 4, t: { fr: 'L\'aspirant Nicol reçoit deux balles.', en: 'Midshipman Nicol is hit by two bullets.', ja: '見習士官ニコルは二発の銃弾を受ける。' } },
      { img: 'miyako_6', tome: 4, t: { fr: 'Kōga Gengo, qui commande le Kaiten, est tué.', en: 'Kōga Gengo, in command of the Kaiten, is killed.', ja: '回天の艦長・甲賀源吾が戦死する。' } },
      { img: 'miyako_7', tome: 4, t: { fr: 'Arai Ikunosuke prend lui-même la barre, dégage la coque et ramène le Kaiten vers le large. L\'affaire a duré une demi-heure.', en: 'Arai Ikunosuke takes the helm himself, frees the hull and brings the Kaiten back out to sea. It has lasted half an hour.', ja: '荒井郁之助がみずから舵を取り、船体を引き離して回天を沖へ戻す。戦いは三十分で終わった。' } },
    ],
  },
  takao: {
    avant: [
      { img: 'takao_1', tome: 2, t: { fr: 'Pendant ce temps, le Takao, machine avariée, se traîne vers Miyako à trois nœuds.', en: 'Meanwhile the Takao, her engine damaged, is crawling towards Miyako at three knots.', ja: 'そのころ高雄は、傷んだ機関で三ノットしか出せず、宮古へと這うように進んでいた。' } },
      { img: 'takao_2', tome: 2, t: { fr: 'Le Kaiten ressort de la baie et le dépasse, sans répondre aux signaux.', en: 'The Kaiten comes out of the bay and passes her, without answering signals.', ja: '回天が湾から出てきて、信号に応えぬまま高雄を追い越していく。' } },
      { img: 'takao_3', tome: 2, t: { fr: 'Derrière lui, l\'escadre impériale : le Kōtetsu en tête, le Kasuga sur sa hanche.', en: 'Behind her comes the imperial squadron: the Kōtetsu leading, the Kasuga on her quarter.', ja: 'その後ろに新政府艦隊。先頭に甲鉄、その斜め後ろに春日。' } },
    ],
    apres: [
      { img: 'takao_4', tome: 2, t: { fr: 'Le Takao se jette volontairement à la côte, près de Tanohata.', en: 'The Takao runs herself ashore on purpose, near Tanohata.', ja: '高雄は田野畑の近くで、みずから浜に乗り上げる。' } },
      { img: 'takao_5', tome: 2, t: { fr: 'On encloue les canons, on brise la machine.', en: 'The guns are spiked, the engine smashed.', ja: '砲に釘を打ち、機関を叩き壊す。' } },
      { img: 'takao_6', grav: true, t: { fr: 'Les embarcations gagnent la grève.', en: 'The boats make for the beach.', ja: 'ボートが浜へ向かう。' } },
      { img: 'takao_7', tome: 2, t: { fr: 'Depuis la grève, l\'équipage regarde le navire sauter.', en: 'From the beach, the crew watches the ship blow up.', ja: '浜から乗組員たちが、艦が爆発するのを見つめる。' } },
    ],
  },
  otobe: {
    avant: [
      { img: 'otobe_1', tome: 3, t: { fr: 'Vers le 20 mai 1869, les troupes impériales débarquent à Otobe, sous la protection de leurs navires.', en: 'Around 20 May 1869, imperial troops land at Otobe, covered by their warships.', ja: '1869年5月20日ごろ、新政府軍が軍艦の援護のもと乙部に上陸する。' } },
      { img: 'otobe_2', tome: 3, t: { fr: 'Les positions du sud tombent l\'une après l\'autre. Chaque jour, l\'île d\'Ezo rétrécit.', en: 'The southern positions fall one after another. Every day, the island of Ezo grows smaller.', ja: '南の拠点が次々と落ちる。蝦夷の島は日ごとに狭まっていく。' } },
    ],
  },
  batterie: {
    avant: [
      { img: 'batterie_1', tome: 4, t: { fr: 'Juin 1869. L\'escadre impériale entre dans la baie de Hakodate. La flotte d\'Ezo, réduite à trois navires, doit tenir le port.', en: 'June 1869. The imperial squadron enters Hakodate Bay. The Ezo fleet, down to three ships, must hold the harbour.', ja: '1869年6月。新政府艦隊が箱館湾に入る。三隻に減った蝦夷の艦隊は港を守らねばならない。' } },
      { img: 'batterie_2', tome: 4, t: { fr: 'Le 16 juin, la machine du Kaiten est touchée. Échoué près du fort de Benten, il ne bouge plus, mais ses canons tirent encore.', en: 'On 16 June the Kaiten\'s engine is hit. Aground near the Benten fort, she can no longer move, but her guns still fire.', ja: '6月16日、回天の機関が被弾する。弁天台場の近くに乗り上げて動けないが、砲はまだ火を噴く。' } },
    ],
    apres: [
      { img: 'batterie_3', tome: 4, t: { fr: 'Arai, qui ne buvait pas une goutte d\'alcool, a fait préparer de grandes marmites de soupe sucrée aux haricots. On la sert entre deux salves.', en: 'Arai, who never drank a drop of alcohol, has had great pots of sweet bean soup prepared. It is served between broadsides.', ja: '酒を一滴も飲まなかった荒井は、大鍋で汁粉を作らせた。砲撃の合間にそれが配られる。' } },
      { img: 'batterie_4', tome: 4, t: { fr: 'Sur le pont, on la boit sous les obus.', en: 'On deck, they drink it under the shells.', ja: '甲板で、砲弾の下それをすする。' } },
    ],
  },
  hakodate: {
    avant: [
      { img: 'hakodate_1', tome: 4, t: { fr: '20 juin 1869, jour de l\'assaut général. Le Banryū, dernier navire d\'Ezo encore à flot, se bat seul contre l\'escadre.', en: '20 June 1869, the day of the general assault. The Banryū, the last Ezo ship still afloat, fights the squadron alone.', ja: '1869年6月20日、総攻撃の日。まだ浮かんでいる最後の蝦夷の軍艦・蟠竜が、ただ一隻で艦隊と戦う。' } },
    ],
    apres: [
      { img: 'hakodate_2', tome: 4, t: { fr: 'Un obus du Banryū atteint la soute du Chōyō. Le navire saute.', en: 'A shell from the Banryū reaches the Chōyō\'s magazine. The ship blows up.', ja: '蟠竜の一弾が朝陽の弾薬庫に届く。朝陽は爆沈する。' } },
      { img: 'hakodate_3', tome: 3, t: { fr: 'Sur les remparts, on crie hourra. Ce sera le dernier.', en: 'On the ramparts, a cheer goes up. It will be the last.', ja: '台場の上で歓声が上がる。それが最後の歓声となった。' } },
      { img: 'hakodate_4', tome: 4, t: { fr: 'À court de munitions, le Banryū finit sur un haut-fond, sous le fort de Benten.', en: 'Out of ammunition, the Banryū ends up on a shoal below the Benten fort.', ja: '弾薬の尽きた蟠竜は、弁天台場下の浅瀬に乗り上げる。' } },
    ],
  },
};

addStr({
  'recit.h': ['Le récit en images', 'The story in pictures', '絵で見る物語'],
  'recit.suite': ['La suite en images', 'What happened next', 'その後の物語'],
  'recit.btn': ['Le récit en images', 'The story in pictures', '絵で見る物語'],
  'recit.again': ['Revoir la suite en images', 'See what happened next again', 'その後の物語をもう一度'],
  'recit.src': ['D\'après la bande dessinée « Les Dix de Hakodate », tome {0}', 'From the graphic novel "The Ten of Hakodate", volume {0}', '漫画『箱館の十人』第{0}巻より'],
  'recit.grav': ['Gravure du Tour du Monde, 1874, reprise dans la bande dessinée', 'Engraving from Le Tour du Monde, 1874, as used in the graphic novel', '『ル・トゥール・デュ・モンド』（1874年）の版画、漫画より'],
  'recit.next': ['Suite', 'Next', '次へ'],
  'recit.orders': ['Les ordres de mission', 'The orders', '命令を読む'],
  'recit.report': ['Le bilan', 'The report', '結果を見る'],
  'k.images': ['images', 'pictures', '画像'],
  'k.next': ['suite', 'next', '次へ'],
  'k.skip': ['passer', 'skip', '飛ばす'],
});

function recitHas(id, part) { return !!(RECIT[id] && RECIT[id][part] && RECIT[id][part].length); }

/* les récits déjà vus : on ne les impose qu'une fois, ils restent à revoir depuis les ordres */
function recitSeen(key, mark) {
  try {
    const seen = JSON.parse(localStorage.getItem(RECIT_SAVE) || '[]');
    if (mark && !seen.includes(key)) { seen.push(key); localStorage.setItem(RECIT_SAVE, JSON.stringify(seen)); }
    return seen.includes(key);
  } catch (e) { return !!mark; }
}

/* ouvrir une étape depuis la carte des étapes : le récit d'abord, la première fois */
function storyOpen(idx) {
  const id = STAGES[idx].id;
  if (recitHas(id, 'avant') && !recitSeen(id + ':avant')) showRecit(idx, 'avant', () => storyBrief(idx));
  else storyBrief(idx);
}

function showRecit(idx, part, done) {
  const st = STAGES[idx], list = RECIT[st.id][part];
  recitSeen(st.id + ':' + part, true);
  if (part === 'avant') { G.mode = 'menu'; if (G.game !== 'demo') demoStart('title'); else G.demo.view = 'title'; }
  else G.mode = 'over';
  Music.play('brief');
  el('banner').classList.remove('show'); HUD.bannerT = 0;
  /* les images arrivent avant qu'on les demande */
  list.forEach((s) => { const im = new Image(); im.src = RECIT_DIR + s.img + '.webp'; });
  let cur = -1, closed = false;
  const finish = () => { if (closed) return; closed = true; done(); };
  const show = (k) => {
    if (closed) return;
    if (k < 0) { Snd.clang && Snd.clang(0); return; }
    if (k >= list.length) { finish(); return; }
    const dir = k >= cur ? 1 : -1;
    cur = k;
    const s = list[k], src = RECIT_DIR + s.img + '.webp';
    const frame = el('recit-frame');
    frame.querySelectorAll('.slide:not(.out)').forEach((o) => { o.classList.add('out'); o.style.setProperty('--dx', (-dir * 40) + 'px'); setTimeout(() => o.remove(), 650); });
    const d = document.createElement('div');
    d.className = 'slide ' + (k % 2 ? 'kb-b' : 'kb-a');
    d.style.setProperty('--dx', (dir * 40) + 'px');
    d.innerHTML = `<div class="pic"><img src="${src}" alt=""></div>`;
    frame.appendChild(d);
    const img = d.querySelector('img');
    if (img.complete && img.naturalWidth) recitFit(d); else img.onload = () => recitFit(d);
    el('recit-bg').style.backgroundImage = `url("${src}")`;
    const cap = el('recit-cap');
    el('recit-n').textContent = (k + 1) + ' / ' + list.length;
    el('recit-src').textContent = s.grav ? T('recit.grav') : T('recit.src', s.tome);
    el('recit-t').textContent = tx(s.t);
    cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
    el('menu').querySelectorAll('.recit-dots i').forEach((n, j) => { n.classList.toggle('on', j === k); n.classList.toggle('done', j < k); });
    el('recit-go').textContent = k === list.length - 1 ? T(part === 'avant' ? 'recit.orders' : 'recit.report') : T('recit.next');
  };
  menuShow('recit', `
    <div class="recit-bg" id="recit-bg"></div>
    <div class="recit-veil"></div>
    <div class="recit">
      <div class="recit-head">
        <div class="kicker">${T(part === 'avant' ? 'recit.h' : 'recit.suite')} · ${T('hud.stage', idx + 1, STAGES.length)}</div>
        <h2>${tx(st.title)}</h2>
      </div>
      <div class="recit-frame" id="recit-frame"></div>
      <div class="recit-cap" id="recit-cap">
        <div class="recit-meta"><span id="recit-n"></span><span id="recit-src"></span></div>
        <p id="recit-t"></p>
      </div>
      <div class="recit-foot">
        <div class="recit-dots">${list.map(() => '<i></i>').join('')}</div>
        <button class="recit-go sel" data-item="0"><span id="recit-go"></span><b>›</b></button>
      </div>
    </div>
    <div class="hints"><span><kbd>←</kbd><kbd>→</kbd> ${T('k.images')}</span><span><kbd>${T('k.enter')}</kbd> ${T('k.next')}</span><span><kbd>${T('k.esc')}</kbd> ${T('k.skip')}</span></div>`, {
    go: [() => show(cur + 1)], back: finish, lr: (d) => { Snd.tick && Snd.tick(); show(cur + d); },
  });
  show(0);
}

/* l'image à la taille de l'écran, sans la déformer ; le cadre la serre au plus près */
function recitFit(slide) {
  const fr = el('recit-frame'), pic = slide.querySelector('.pic'), img = slide.querySelector('img');
  if (!fr || !pic || !img || !img.naturalWidth) return;
  const k = Math.min(fr.clientWidth / img.naturalWidth, fr.clientHeight / img.naturalHeight, 1.6);
  pic.style.width = Math.round(img.naturalWidth * k) + 'px';
  pic.style.height = Math.round(img.naturalHeight * k) + 'px';
}
window.addEventListener('resize', () => { if (MENU.screen === 'recit') document.querySelectorAll('#recit-frame .slide').forEach(recitFit); });
