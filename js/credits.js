'use strict';

/* ---------- le générique de fin ----------
 * Après l'épilogue du mode histoire, à la fin de l'arcade, ou depuis l'écran-titre :
 * le générique défile, puis une dernière carte présente les cinq tomes de la bande
 * dessinée, avec leurs couvertures (édition française). Entrée : aller à la dernière
 * carte ; Échap : revenir. Trois langues, comme le reste du jeu. */

const COVERS = [
  { img: 'img/couv/tome1.webp', t: 'L\'équipe', g: { en: 'The Team', ja: '仲間たち' } },
  { img: 'img/couv/tome2.webp', t: 'Collache', g: { ja: 'コラッシュ' } },
  { img: 'img/couv/tome3.webp', t: 'Hijikata', g: { ja: '土方' } },
  { img: 'img/couv/tome4.webp', t: 'Arai', g: { ja: '荒井' } },
  { img: 'img/couv/tome5.webp', t: 'Les absents', g: { en: 'The Absent', ja: '不在の者たち' } },
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const BD_AUTHORS = [['Edgard Bronce-Ceray', ''], ['Sofia E. V. Hamett', ''], ['Charles Hidetamabiveti', 'シャルル・ヒデタマビヴェティ']];
const THE_TEN = {
  fr: ['Brunet', 'Cazeneuve', 'Marlin', 'Bouffier', 'Fortant', 'Collache', 'Nicol', 'Clataud', 'Pradier', 'Tribou'],
  ja: ['ブリュネ', 'カズヌーヴ', 'マルラン', 'ブッフィエ', 'フォルタン', 'コラッシュ', 'ニコル', 'クラトー', 'プラディエ', 'トリブー'],
};

addStr({
  'cr.btn': ['Le générique', 'The credits', 'エンドロール'],
  'cr.end': ['Fin', 'The End', '完'],
  'cr.after': ['D\'après la bande dessinée', 'Based on the graphic novel', '原作漫画'],
  'cr.series': ['La véritable histoire de Jules Brunet et des Français d\'Ezo', 'The True Story of Jules Brunet and the Frenchmen of Ezo', 'ジュール・ブリュネと蝦夷のフランス人たちの実話'],
  'cr.five': ['En cinq tomes', 'In five volumes', '全5巻'],
  'cr.tome': ['Tome {0}', 'Volume {0}', '第{0}巻'],
  'cr.by': ['Une bande dessinée de', 'A graphic novel by', '作'],
  'cr.pub': ['Night Workers', 'Night Workers', 'ナイトワーカーズ'],
  'cr.pubh': ['Éditions', 'Published by', '発行'],
  'cr.ten': ['Les Dix', 'The Ten', '十人'],
  'cr.sources': ['Sources', 'Sources', '出典'],
  'cr.src.collache': ['Eugène Collache, « Une aventure au Japon », Le Tour du Monde, 1874 : les citations et la gravure', 'Eugène Collache, "Une aventure au Japon", Le Tour du Monde, 1874: the quotations and the engraving', 'ウジェーヌ・コラッシュ『日本での冒険』（『ル・トゥール・デュ・モンド』1874年）：引用と版画'],
  'cr.src.coast': ['Les côtes : Kokudo Sūchi Jōhō (ministère japonais du Territoire, MLIT)', 'The coastlines: Kokudo Sūchi Jōhō (Japan\'s MLIT)', '海岸線：国土数値情報（国土交通省）'],
  'cr.src.japan': ['La carte du Japon du mode corsaire : Natural Earth (domaine public)', 'The chart of Japan in corsair mode: Natural Earth (public domain)', 'コルセアモードの日本地図：Natural Earth（パブリックドメイン）'],
  'cr.src.folk': ['Les grandes bêtes : la baleine d\'Ebisu, dans les croyances des pêcheurs japonais ; Akkorokamui, dans les récits aïnous de la baie d\'Uchiura', 'The great beasts: Ebisu\'s whale, from the beliefs of Japanese fishermen; Akkorokamui, from the Ainu tales of Uchiura Bay', '海の大きな生き物：漁師の信仰に伝わる恵比寿の鯨、内浦湾のアイヌの伝承に語られるアッコロカムイ'],
  'cr.src.bd': ['Les images du récit : les cases de la bande dessinée, sans leurs bulles', 'The story pictures: panels from the graphic novel, without their balloons', '物語の絵：漫画のコマ（吹き出しなし）'],
  'cr.gameh': ['Le jeu', 'The game', 'ゲーム'],
  'cr.music': ['Musique originale composée pour le jeu', 'Original music composed for the game', 'ゲームのために作曲したオリジナル音楽'],
  'cr.three': ['Rendu 3D : Three.js (licence MIT)', '3D rendering: Three.js (MIT licence)', '3D描画：Three.js（MITライセンス）'],
  'cr.made': ['Un jeu Night Workers', 'A Night Workers game', 'ナイトワーカーズのゲーム'],
  'cr.thanks': ['Merci d\'avoir joué', 'Thank you for playing', 'プレイしていただき、ありがとうございました'],
  'cr.read': ['L\'histoire continue dans la bande dessinée', 'The story goes on in the graphic novel', '物語は漫画で続く'],
  'cr.buy': ['En vente sur Amazon : cherchez « Les Dix de Hakodate »', 'On sale on Amazon: search for "Les Dix de Hakodate"', 'Amazonで発売中：「Les Dix de Hakodate」で検索'],
  'cr.k.final': ['dernière carte', 'last card', '最後へ'],
  'cr.k.leave': ['quitter', 'leave', '終了'],
  'menu.credits': ['La bande dessinée', 'The graphic novel', '原作漫画'],
  'menu.credits.d': ['Les cinq tomes des « Dix de Hakodate », et le générique du jeu.', 'The five volumes of "The Ten of Hakodate", and the game credits.', '『箱館の十人』全5巻と、ゲームのエンドロール。'],
});

/* le numéro d'un tome : chiffres romains, comme sur les couvertures ; chiffres arabes en japonais */
const tomeNo = (i) => T('cr.tome', LANG === 'ja' ? i + 1 : ROMAN[i]);
const coverGloss = (c) => (LANG !== 'fr' && c.g[LANG] ? `<em>${c.g[LANG]}</em>` : '');
const coverCard = (c, i) => `<figure class="cover"><img src="${c.img}" alt="${tomeNo(i)} · ${c.t}"><figcaption><span>${tomeNo(i)}</span><b>${c.t}</b>${coverGloss(c)}</figcaption></figure>`;

function showCredits(done) {
  G.mode = 'menu';
  if (G.game !== 'demo') demoStart('title'); else G.demo.view = 'title';
  Music.play('theme');
  hidePause();
  el('banner').classList.remove('show'); HUD.bannerT = 0;
  const ten = THE_TEN[LANG === 'ja' ? 'ja' : 'fr'];
  let raf = 0, closed = false;
  const stop = () => { closed = true; cancelAnimationFrame(raf); };
  const leave = () => { stop(); (done || showTitle)(); };
  const finale = () => { stop(); creditsFinale(leave); };
  menuShow('credits', `
    <div class="credits-veil"></div>
    <div class="credits-view">
      <div class="credits-roll" id="credits-roll">
        <section class="cr-open">
          <div class="kicker">${T('cr.end')}</div>
          <h1 class="gold">${T('title.name')}</h1>
          <div class="cr-sub">${T('title.sub')}</div>
        </section>
        <section>
          <div class="kicker">${T('cr.after')}</div>
          <h2>${T('title.name')}</h2>
          <p class="cr-lead">${T('cr.series')}</p>
          <p class="cr-small">${T('cr.five')}</p>
          <div class="covers">${COVERS.map(coverCard).join('')}</div>
        </section>
        <section>
          <div class="kicker">${T('cr.by')}</div>
          ${BD_AUTHORS.map(([n, j]) => `<p class="cr-name">${n}${j ? `<small>${j}</small>` : ''}</p>`).join('')}
          <div class="kicker cr-gap">${T('cr.pubh')}</div>
          <p class="cr-name">${T('cr.pub')}</p>
        </section>
        <section>
          <div class="kicker">${T('cr.ten')}</div>
          <div class="cr-ten">${ten.map((n) => `<span>${n}</span>`).join('')}</div>
        </section>
        <section>
          <div class="kicker">${T('cr.sources')}</div>
          <p>${T('cr.src.collache')}</p>
          <p>${T('cr.src.bd')}</p>
          <p>${T('cr.src.coast')}</p>
          <p>${T('cr.src.japan')}</p>
          <p>${T('cr.src.folk')}</p>
        </section>
        <section>
          <div class="kicker">${T('cr.gameh')}</div>
          <p>${T('cr.music')}</p>
          <p>${T('cr.three')}</p>
          <p class="cr-name cr-gap">${T('cr.made')}</p>
        </section>
      </div>
    </div>
    <div class="hints"><span><kbd>${T('k.enter')}</kbd> ${T('cr.k.final')}</span><span><kbd>${T('k.esc')}</kbd> ${T('cr.k.leave')}</span></div>`, {
    go: [finale], back: leave,
  });
  /* le défilement : une hauteur d'écran toutes les treize secondes environ */
  const roll = el('credits-roll');
  let y = window.innerHeight * 0.92, last = performance.now();
  const step = (now) => {
    if (closed || MENU.screen !== 'credits') return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    y -= dt * window.innerHeight * 0.078;
    roll.style.transform = `translateY(${y.toFixed(1)}px)`;
    if (y < -roll.offsetHeight) { finale(); return; }
    raf = requestAnimationFrame(step);
  };
  roll.style.transform = `translateY(${y}px)`;
  raf = requestAnimationFrame(step);
}

/* la dernière carte : merci, et les cinq tomes */
function creditsFinale(leave) {
  menuShow('credits-end', `
    <div class="credits-veil"></div>
    <div class="credits-final">
      <div class="kicker">${T('title.name')}</div>
      <h2 class="gold">${T('cr.thanks')}</h2>
      <p class="cr-lead">${T('cr.read')}</p>
      <div class="covers big">${COVERS.map(coverCard).join('')}</div>
      <p class="cr-buy">${T('cr.buy')}</p>
      <nav class="main-list"><button class="item" data-item="0"><span class="bar"></span><span class="t">${T('menu.main')}</span></button></nav>
    </div>
    ${hints('', true)}`, { go: [leave], back: leave });
}
