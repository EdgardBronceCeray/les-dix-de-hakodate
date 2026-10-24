'use strict';

/* Les navires en 3D, bâtis à partir des fiches (data.js).
 *  coque lissée à pavois, lisse, bandes peintes et sabords, doublage de cuivre,
 *  poupe à fenêtres, étrave dorée ; pont bordé, panneaux, cabestan, roue,
 *  claires-voies, manches à air, canons sur affûts, embarcations aux bossoirs ;
 *  mâture en trois brins avec hunes, vergues, voiles gonflées, focs, brigantine ;
 *  haubans, étais, galhaubans ; roues à aubes décorées ; pavillon qui flotte.
 * Repère du modèle : x vers l'avant, y vers le haut, z vers tribord. Mètres. */

const SHIP3D = { mats: {} };

function m3(key, make) { if (!SHIP3D.mats[key]) SHIP3D.mats[key] = make(); return SHIP3D.mats[key]; }

const GOLD = () => m3('gold', () => new THREE.MeshStandardMaterial({ color: 0xd8a84a, metalness: 0.85, roughness: 0.32 }));
const BLACKPAINT = () => m3('black', () => new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.45 }));
const IRON = () => m3('iron', () => new THREE.MeshStandardMaterial({ color: 0x1a1b1d, metalness: 0.55, roughness: 0.4 }));
const SPAR = () => m3('spar', () => new THREE.MeshStandardMaterial({ color: 0x5a4126, roughness: 0.75 }));
const SPARDARK = () => m3('spard', () => new THREE.MeshStandardMaterial({ color: 0x2a1f16, roughness: 0.7 }));
const RAILWOOD = () => m3('rail', () => new THREE.MeshStandardMaterial({ color: 0xb48a58, roughness: 0.55 }));
const BUFF = () => m3('buff', () => new THREE.MeshStandardMaterial({ color: 0xd9c9a2, roughness: 0.7 }));
const GLASS = () => m3('glass', () => new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.15, metalness: 0.3, emissive: 0x1a2a34 }));
const ROPE = () => m3('rope', () => new THREE.LineBasicMaterial({ color: 0x17110b, transparent: true, opacity: 0.8 }));
const TARRED = () => m3('tarred', () => new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.85 }));
const CANVAS_FURL = () => m3('furl', () => new THREE.MeshStandardMaterial({ color: 0xe6dcc6, roughness: 0.95 }));

/* ---------- textures ---------- */

function shipHullTexture(sp, P) {
  const k = sp.look;
  /* les navires du chantier du corsaire portent tous le même nom de fiche : leur bordé dépend de
   * leur peinture, de leur gabarit et de leur doublage */
  const key = 'hull4:' + sp.id + (k.custom ? ':' + k.hull + ':' + k.stripe + ':' + P.F.toFixed(1) + ':' + P.hb.toFixed(1) + ':' + (k.copper || 0) : '');
  if (SHIP3D.mats[key]) return SHIP3D.mats[key];
  const W_ = 2048, H_ = 256;
  const tex = canvasTex(W_, H_, (c) => {
    /* v = 0 en bas (sous l'eau), 1 en haut du pavois ; Y(m) donne la ligne en pixels */
    const Y = (m) => H_ - (m + P.D) / (P.F + P.hb + P.D) * H_;
    c.fillStyle = k.hull; c.fillRect(0, 0, W_, H_);
    /* virures du bordé */
    for (let y = 0; y < H_; y += 5) { c.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.06})`; c.fillRect(0, y, W_, 1); }
    for (let i = 0; i < 2400; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; c.fillRect(Math.random() * W_, Math.random() * H_, 6 + Math.random() * 30, 1); }
    if (P.armored) {
      for (let x = 0; x < W_; x += 34) { c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x, Y(P.F), 1.5, Y(0.2) - Y(P.F)); }
      for (let x = 6; x < W_; x += 17) for (let y = Y(P.F) + 6; y < Y(0.3); y += 12) { c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(x, y, 2, 2); }
    }
    /* préceinte noire sous le pont */
    c.fillStyle = 'rgba(8,8,10,0.85)'; c.fillRect(0, Y(P.F - 0.2), W_, Y(P.F - 0.9) - Y(P.F - 0.2));
    /* bande de batterie au niveau du pavois, avec sabords peints */
    if (!P.armored) {
      const y0 = Y(P.F + P.hb - 0.15), y1 = Y(P.F + 0.05);
      c.fillStyle = k.stripe; c.fillRect(0, y0, W_, y1 - y0);
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, y0, W_, 2);

    }
    /* liston clair au plat-bord */
    c.fillStyle = 'rgba(230,210,170,0.55)'; c.fillRect(0, Y(P.F + P.hb) , W_, 3);
    /* ligne de flottaison blanche puis cuivre */
    c.fillStyle = '#e8e2d2'; c.fillRect(0, Y(0.35), W_, Y(0.05) - Y(0.35));
    const g = c.createLinearGradient(0, Y(0.05), 0, H_);
    /* un doublage neuf (corsaire) : le cuivre luit au lieu de vert-de-griser */
    if (k.copper) { g.addColorStop(0, '#d98a4a'); g.addColorStop(0.5, k.copper >= 2 ? '#e0a058' : '#c07a40'); g.addColorStop(1, k.copper >= 3 ? '#b8864e' : '#8a6a44'); }
    else { g.addColorStop(0, '#9a5a2e'); g.addColorStop(0.5, '#7a5a34'); g.addColorStop(1, '#4b6a52'); }
    c.fillStyle = g; c.fillRect(0, Y(0.05), W_, H_ - Y(0.05));
    for (let x = 0; x < W_; x += 9) { c.fillStyle = 'rgba(0,0,0,0.1)'; c.fillRect(x, Y(0.05), 1, H_); }
    /* coulures de rouille et de sel */
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * W_, y = Y(P.F - 0.9);
      const gg = c.createLinearGradient(0, y, 0, Y(0.4));
      gg.addColorStop(0, 'rgba(130,80,40,0.28)'); gg.addColorStop(1, 'rgba(130,80,40,0)');
      c.fillStyle = gg; c.fillRect(x, y, 2 + Math.random() * 3, Y(0.4) - y);
    }
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  SHIP3D.mats[key] = tex;
  return tex;
}

function shipDeckTexture(col) {
  return m3('deck3:' + col, () => {
    const t = canvasTex(1024, 256, (c, w, h) => {
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      const ph = 9;
      for (let y = 0; y < h; y += ph) {
        c.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.07})`; c.fillRect(0, y, w, ph);
        c.fillStyle = 'rgba(30,20,10,0.45)'; c.fillRect(0, y, w, 1);
        for (let x = Math.random() * 120; x < w; x += 90 + Math.random() * 90) { c.fillStyle = 'rgba(30,20,10,0.35)'; c.fillRect(x, y, 1, ph); }
      }
      grain(c, w, h, 2500, '#3a2a18', 0.18);
      grain(c, w, h, 900, '#fff', 0.08);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

/* la toile : laizes cousues, gaines de bord et ralingue, bandes de ris avec leurs garcettes,
 * renforts aux coins, un peu de salissure au bas. reefTop : les ris en haut (voiles carrées)
 * ou en bas (voiles auriques). */
function sailCanvas(reefTop) {
  return m3('sail4:' + (reefTop ? 'sq' : 'fa'), () => {
    const t = canvasTex(512, 512, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#f4ecdb'); g.addColorStop(1, '#e2d6bc');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      /* les laizes, de teinte un peu inégale, et leurs coutures doubles */
      const cw = 30;
      for (let x = 0, i = 0; x < w; x += cw, i++) {
        c.fillStyle = `rgba(${i % 2 ? '255,250,240' : '120,100,70'},${0.035 + Math.random() * 0.03})`; c.fillRect(x, 0, cw, h);
        c.fillStyle = 'rgba(110,90,60,0.32)'; c.fillRect(x, 0, 1, h); c.fillRect(x + 3, 0, 1, h);
      }
      /* bandes de ris et garcettes */
      const reefs = reefTop ? [0.13, 0.25, 0.37] : [0.88, 0.78];
      for (const r of reefs) {
        const y = r * h;
        c.fillStyle = 'rgba(150,130,95,0.35)'; c.fillRect(0, y - 6, w, 12);
        c.fillStyle = 'rgba(100,80,55,0.45)'; c.fillRect(0, y - 6, w, 1); c.fillRect(0, y + 5, w, 1);
        for (let x = 10; x < w; x += 20) {
          c.fillStyle = 'rgba(70,55,35,0.75)'; c.fillRect(x, y - 3, 2, 2);
          c.strokeStyle = 'rgba(90,70,45,0.6)'; c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(x + 1, y - 2); c.quadraticCurveTo(x + 3, y + 8, x + 1 + Math.random() * 3, y + 15); c.stroke();
          c.beginPath(); c.moveTo(x + 1, y - 2); c.quadraticCurveTo(x - 1, y - 9, x + Math.random() * 3, y - 14); c.stroke();
        }
      }
      /* renforts des coins */
      c.fillStyle = 'rgba(200,185,150,0.55)';
      for (const [x, y, sx, sy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + sx * 46, y); c.lineTo(x, y + sy * 46); c.fill(); }
      /* salissures et coulures au bas */
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * w, y = h * (0.7 + Math.random() * 0.3), r = 12 + Math.random() * 40;
        const gr = c.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(120,100,70,0.12)'); gr.addColorStop(1, 'rgba(120,100,70,0)');
        c.fillStyle = gr; c.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      /* gaine de bord et ralingue */
      c.strokeStyle = 'rgba(160,140,105,0.6)'; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14);
      c.strokeStyle = 'rgba(70,55,35,0.75)'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
      grain(c, w, h, 3000, '#8a7a5a', 0.08);
    });
    t.anisotropy = 4;
    return t;
  });
}
function shipSailTexture() { return sailCanvas(true); }

/* voile serrée sur sa vergue : toile roulée, plis, et les rabans qui la tiennent */
function furlTexture() {
  return m3('furl4', () => canvasTex(128, 256, (c, w, h) => {
    c.fillStyle = '#e4d9c0'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6 + Math.random() * 6) { c.fillStyle = `rgba(110,90,60,${0.08 + Math.random() * 0.12})`; c.fillRect(x, 0, 2 + Math.random() * 3, h); }
    for (let y = 18; y < h; y += 34) { c.fillStyle = 'rgba(70,52,32,0.85)'; c.fillRect(0, y, w, 5); }
    grain(c, w, h, 900, '#6a5a3a', 0.1);
  }));
}

/* une toile serrée : un rouleau bosselé qui pend un peu sous la vergue */
function furlGeo(len, r) {
  const g = new THREE.CylinderGeometry(r, r, len, 9, 14);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), u = y / len;
    const k = 1 + 0.22 * Math.sin(y * 2.3 + a * 2) * Math.sin(y * 0.9 + 1.3) + 0.12 * Math.sin(a * 3 + y);
    const taper = 0.55 + 0.45 * Math.cos(u * Math.PI * 0.95);
    p.setXYZ(i, x * k * taper, y, z * k * taper + 0.12 * taper);
  }
  g.computeVertexNormals();
  return g;
}

/* les hamacs roulés dans leur filet : boudins de toile claire, chacun un peu différent, maille sombre */
function hammockTexture() {
  return m3('hammockTex', () => {
    const t = canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = '#b3a88e'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        const tone = 160 + Math.random() * 40 | 0;
        c.fillStyle = `rgb(${tone},${tone - 8},${tone - 30})`; c.fillRect(x + 1, 4, 14, h - 8);
        c.fillStyle = 'rgba(60,45,25,0.35)'; c.fillRect(x, 0, 1.5, h);
        c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x + 4, 6, 3, h - 12);
      }
      c.strokeStyle = 'rgba(30,24,16,0.5)'; c.lineWidth = 1;
      for (let x = -h; x < w; x += 10) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.moveTo(x + h, 0); c.lineTo(x, h); c.stroke(); }
      c.fillStyle = 'rgba(30,24,16,0.7)'; c.fillRect(0, 0, w, 3);
    });
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}

function sternTexture(col) {
  return m3('stern3:' + col, () => canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d8a84a'; c.fillRect(0, 10, w, 4); c.fillRect(0, h * 0.62, w, 3);
    for (let i = 0; i < 5; i++) {
      const x = w * (0.16 + i * 0.17);
      c.fillStyle = '#e8d8a0'; c.fillRect(x - 11, 22, 22, 30);
      c.fillStyle = '#20303a'; c.fillRect(x - 8, 25, 16, 24);
      c.fillStyle = 'rgba(255,220,150,0.35)'; c.fillRect(x - 8, 25, 16, 6);
    }
  }));
}

/* la face du tambour : un éventail sculpté et doré, des fentes d'aération entre les rayons,
 * un bandeau à perles sur le pourtour et une rosace au moyeu */
function paddleFaceTexture(hullCol) {
  return m3('paddle4:' + hullCol, () => canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = hullCol; c.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h, R = h * 0.97;
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n, am = (a0 + a1) / 2;
      /* fente sombre entre deux rayons */
      c.fillStyle = '#0a0908';
      c.beginPath();
      c.moveTo(cx + Math.cos(a0 + 0.05) * R * 0.3, cy - Math.sin(a0 + 0.05) * R * 0.3);
      c.lineTo(cx + Math.cos(a0 + 0.035) * R * 0.8, cy - Math.sin(a0 + 0.035) * R * 0.8);
      c.lineTo(cx + Math.cos(a1 - 0.035) * R * 0.8, cy - Math.sin(a1 - 0.035) * R * 0.8);
      c.lineTo(cx + Math.cos(a1 - 0.05) * R * 0.3, cy - Math.sin(a1 - 0.05) * R * 0.3);
      c.fill();
      /* le rayon doré, en relief */
      const gx = c.createLinearGradient(cx + Math.cos(a0) * R * 0.3, cy - Math.sin(a0) * R * 0.3, cx + Math.cos(a0) * R * 0.85, cy - Math.sin(a0) * R * 0.85);
      gx.addColorStop(0, '#b8862e'); gx.addColorStop(0.5, '#f0cf78'); gx.addColorStop(1, '#a87628');
      c.strokeStyle = gx; c.lineWidth = 7;
      c.beginPath(); c.moveTo(cx + Math.cos(a0) * R * 0.28, cy - Math.sin(a0) * R * 0.28); c.lineTo(cx + Math.cos(a0) * R * 0.84, cy - Math.sin(a0) * R * 0.84); c.stroke();
      /* petite palmette au bout de chaque fente */
      c.fillStyle = '#e2b85a';
      c.beginPath(); c.arc(cx + Math.cos(am) * R * 0.86, cy - Math.sin(am) * R * 0.86, 5, 0, TAU); c.fill();
    }
    /* bandeau extérieur à perles */
    c.strokeStyle = '#d8a84a'; c.lineWidth = 9; c.beginPath(); c.arc(cx, cy, R * 0.93, Math.PI, 0); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R * 0.9, Math.PI, 0); c.stroke();
    for (let i = 0; i <= 60; i++) { const a = Math.PI * i / 60; c.fillStyle = '#f2d790'; c.beginPath(); c.arc(cx + Math.cos(a) * R * 0.965, cy - Math.sin(a) * R * 0.965, 3, 0, TAU); c.fill(); }
    /* rosace du moyeu */
    const gr = c.createRadialGradient(cx, cy, 4, cx, cy, R * 0.27);
    gr.addColorStop(0, '#f6dc8e'); gr.addColorStop(0.7, '#c99a3c'); gr.addColorStop(1, '#8a6224');
    c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R * 0.27, Math.PI, 0); c.fill();
    for (let i = 0; i < 9; i++) { const a = Math.PI * (i + 0.5) / 9; c.fillStyle = '#7a5520'; c.beginPath(); c.arc(cx + Math.cos(a) * R * 0.19, cy - Math.sin(a) * R * 0.19, 4, 0, TAU); c.fill(); }
  }));
}

function flagTex(kind) {
  return m3('flag3:' + kind, () => canvasTex(192, 128, (c, w, h) => {
    /* le guindant (côté hampe) est à droite de la texture : le canton y va */
    if (kind === 'us') {
      for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#f4f0e6' : '#b0201a'; c.fillRect(0, i * h / 13, w, h / 13 + 1); }
      c.fillStyle = '#22306a'; c.fillRect(w * 0.58, 0, w * 0.42, h * 0.54);
      c.fillStyle = '#fff';
      for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) c.fillRect(w * 0.58 + 6 + x * 13, 6 + y * 13, 3, 3);
    } else if (kind === 'ru') {
      /* pavillon de Saint-André : croix bleue en sautoir sur fond blanc */
      c.fillStyle = '#f4f0e6'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#1f3f8a'; c.lineWidth = h * 0.16; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.moveTo(w, 0); c.lineTo(0, h); c.stroke();
    } else if (kind === 'jp') {
      /* le Hinomaru : seul le Kōtetsu de l'arcade le porte */
      c.fillStyle = '#f4f0e6'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#c0261c'; c.beginPath(); c.arc(w / 2, h / 2, h * 0.3, 0, TAU); c.fill();
    } else if (kind === 'corsair') {
      /* le pavillon du corsaire : fond noir, une roue dentée dorée sur deux os en croix */
      c.fillStyle = '#121214'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#ece4cf'; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(w * 0.32, h * 0.22); c.lineTo(w * 0.68, h * 0.8); c.moveTo(w * 0.68, h * 0.22); c.lineTo(w * 0.32, h * 0.8); c.stroke();
      const cx = w / 2, cy = h / 2, R = h * 0.26;
      c.fillStyle = '#d8a84a'; c.beginPath();
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = i % 3 === 0 ? R : R * 0.82; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      c.closePath(); c.fill();
      c.fillStyle = '#121214'; c.beginPath(); c.arc(cx, cy, R * 0.38, 0, TAU); c.fill();
    }
  }));
}

/* ---------- voiles vivantes ----------
 * La toile frémit au vent (une onde qui court sur la voile), et le soleil la traverse
 * quand il est derrière : elle s'illumine par transparence, comme la vraie toile. */
const SAIL_U = { uTime: { value: 0 }, uSunDirW: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) } };
function sailMaterial(kind) {
  return m3('sailmat:' + kind, () => {
    const m = new THREE.MeshStandardMaterial({ map: sailCanvas(kind === 'sq'), roughness: 0.92, side: THREE.DoubleSide, color: 0xece6d9, emissive: 0x15120e });
    const axis = kind === 'sq' ? 'x' : 'z';
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, SAIL_U);
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float fl = sin(uTime * 3.3 + position.y * 0.55 + position.z * 0.35 + position.x * 0.3) * 0.6
                 + sin(uTime * 5.7 + position.y * 1.3 - position.z * 0.8) * 0.25;
        transformed.${axis} += fl * 0.08;`);
      sh.fragmentShader = 'uniform vec3 uSunDirW, uSunCol;\n' + sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        {
          vec3 sv = normalize((viewMatrix * vec4(uSunDirW, 0.0)).xyz);
          float back = max(0.0, -dot(normal, sv));
          reflectedLight.directDiffuse += diffuseColor.rgb * uSunCol * back * 0.55;
        }`);
    };
    m.customProgramCacheKey = () => 'sail-' + kind;
    return m;
  });
}

/* un canon : fût tourné (bouton de culasse, renforts, tourillons, bourrelet de bouche) */
function barrelGeo(len, r, rifled) {
  const band = rifled ? 1.2 : 1.07;
  const pts = [
    [0.001, -0.5 * r], [0.2 * r, -0.48 * r], [0.3 * r, -0.36 * r], [0.24 * r, -0.24 * r], [0.2 * r, -0.14 * r],
    [0.72 * r, -0.06 * r], [0.95 * r, 0],
    [band * r, 0.03 * len], [band * r, rifled ? 0.3 * len : 0.11 * len], [1.0 * r, (rifled ? 0.3 : 0.11) * len + 0.01],
    [1.07 * r, 0.12 * len + (rifled ? 0.2 * len : 0)], [0.98 * r, 0.145 * len + (rifled ? 0.2 * len : 0)],
    [0.94 * r, 0.42 * len], [0.99 * r, 0.425 * len], [0.99 * r, 0.445 * len], [0.86 * r, 0.45 * len],
    [0.7 * r, 0.86 * len], [0.74 * r, 0.9 * len], [0.84 * r, 0.95 * len], [0.86 * r, 0.985 * len], [0.8 * r, len],
    [0.42 * r, len], [0.42 * r, len - 0.4 * r],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 16);
}
const GUNWOOD = () => m3('gunwood', () => new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.75 }));
const GUNIRON = () => m3('guniron', () => new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: 0.65, roughness: 0.38 }));
const BORE = () => m3('bore', () => new THREE.MeshBasicMaterial({ color: 0x050505 }));
/* le canon et son affût, le tourillon à l'origine, la bouche vers +x.
 * pivot : affût à glissière sur pivot (canon de chasse) ; sinon affût à roues. */
function gunModel(kg, rifled, axisH, pivot) {
  const g = new THREE.Group();
  const len = clamp(1.8 + kg * 0.065, 1.9, 4.6), r = clamp(0.16 + kg * 0.0052, 0.17, 0.42);
  const bar = new THREE.Mesh(barrelGeo(len, r, rifled), GUNIRON());
  bar.rotation.z = -Math.PI / 2; bar.position.x = -0.43 * len; bar.castShadow = true;
  g.add(bar);
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.42 * r, 10), BORE());
  bore.rotation.y = Math.PI / 2; bore.position.x = 0.57 * len - 0.35 * r; g.add(bore);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * r, 0.28 * r, 2.7 * r, 8), GUNIRON());
  tr.rotation.x = Math.PI / 2; g.add(tr);
  const wood = GUNWOOD(), iron = GUNIRON();
  const cz = r * 1.25 + 0.06;
  if (!pivot) {
    /* affût marin à quatre roues : flasques en gradins, essieux, roues, coin de mire */
    const h = axisH;
    for (const s of [1, -1]) {
      const st = [[-0.06, 0.16, h + 0.05], [-0.26, -0.06, h * 0.72], [-0.46, -0.26, h * 0.45]];
      for (const [x0, x1, hh] of st) {
        const b = new THREE.Mesh(new THREE.BoxGeometry((x1 - x0) * len, hh, 0.11), wood);
        b.position.set((x0 + x1) / 2 * len, -h + hh / 2, s * cz); b.castShadow = true; g.add(b);
      }
      for (const x of [0.1 * len, -0.38 * len]) {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.33, h * 0.33, 0.12, 10), wood);
        wh.rotation.x = Math.PI / 2; wh.position.set(x, -h + h * 0.33, s * (cz + 0.13)); g.add(wh);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34 * r, 0.06, 0.13), iron); cap.position.set(0, 0.28 * r, s * cz); g.add(cap);
    }
    for (const x of [0.1 * len, -0.38 * len]) {
      const ax = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, cz * 2 + 0.32), wood); ax.position.set(x, -h + h * 0.33, 0); g.add(ax);
    }
    const bed = new THREE.Mesh(new THREE.BoxGeometry(0.42 * len, 0.08, cz * 2), wood); bed.position.set(-0.18 * len, -h * 0.55, 0); g.add(bed);
    const quoin = new THREE.Mesh(new THREE.BoxGeometry(0.22 * len, 0.12, cz * 1.4), wood); quoin.position.set(-0.32 * len, -h * 0.45, 0); quoin.rotation.z = 0.12; g.add(quoin);
  } else {
    /* affût à glissière : le petit affût glisse sur deux longerons, qui pivotent sur des chemins de fer */
    const h = axisH;
    for (const s of [1, -1]) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.42 * len, h * 0.7, 0.1), wood); ch.position.set(-0.05 * len, -h * 0.35 + 0.1, s * cz); ch.castShadow = true; g.add(ch);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.15 * len, 0.18, 0.16), wood); rail.position.set(-0.15 * len, -h + 0.09, s * (cz + 0.05)); rail.castShadow = true; g.add(rail);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(1.15 * len, 0.03, 0.17), iron); strap.position.set(-0.15 * len, -h + 0.19, s * (cz + 0.05)); g.add(strap);
    }
    for (const x of [0.38 * len, -0.7 * len]) {
      const tran = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, cz * 2 + 0.4), wood); tran.position.set(x, -h + 0.07, 0); g.add(tran);
      for (const s of [1, -1]) { const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 8), iron); tk.rotation.x = Math.PI / 2; tk.position.set(x, -h + 0.07, s * (cz + 0.27)); g.add(tk); }
    }
  }
  g.userData.len = len;
  return g;
}

/* le nid de pie de la vigie, à la hauteur y du mât, et l'homme qui veille dedans (avec sa
 * longue-vue, scope) */
function crowsNest(y, rMast, scope) {
  const g = new THREE.Group();
  const wood = SPARDARK(), rim = RAILWOOD();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.72, 1.15, 14, 1, true), m3('nestWood', () => new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: 0.8, side: THREE.DoubleSide })));
  barrel.position.y = y; g.add(barrel);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 14), wood); floor.position.y = y - 0.55; g.add(floor);
  for (const yy of [y - 0.45, y + 0.5]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 4, 16), rim); hoop.rotation.x = Math.PI / 2; hoop.position.y = yy; g.add(hoop); }
  const skin = m3('crewSkin', () => new THREE.MeshStandardMaterial({ color: 0xc89a74, roughness: 0.8 }));
  const coat = m3('crewCoat2', () => new THREE.MeshStandardMaterial({ color: 0x1d2638, roughness: 0.9 }));
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.7, 7), coat); torso.position.set(0.32 + rMast, y + 0.35, 0); g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), skin); head.position.set(0.32 + rMast, y + 0.86, 0); g.add(head);
  if (scope) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 6), GOLD());
    tube.rotation.z = -Math.PI / 2 + 0.12; tube.position.set(0.78 + rMast, y + 0.88, 0); g.add(tube);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* un homme d'équipage : jambes, vareuse, bras, tête et bonnet, debout sur le pont */
function crewMan(rr, coat, trouser, skin, cap) {
  const g = new THREE.Group();
  for (const s of [1, -1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.82, 5), trouser); leg.position.set(0, 0.41, s * 0.09); g.add(leg);
  }
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.62, 7), coat); torso.position.y = 1.12; torso.castShadow = true; g.add(torso);
  for (const s of [1, -1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.6, 5), coat);
    arm.position.set(rr.sym(0.08), 1.12, s * 0.24); arm.rotation.x = s * 0.12; arm.rotation.z = rr.sym(0.4); g.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 6), skin); head.position.y = 1.57; g.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.08, 8), cap); hat.position.y = 1.67; g.add(hat);
  g.rotation.y = rr() * TAU;
  return g;
}

/* ---------- géométries ---------- */

function hullProfile(sp, t) {
  /* t : -1 poupe, +1 proue ; demi-largeur relative */
  const ram = sp.look && sp.look.ram;
  const fine = ram ? 0.3 : 0.18;
  let k = 1;
  if (t > fine) { const u = (t - fine) / (1 - fine); k = 1 - Math.pow(u, 1.75) * (1 - 0.0); k = Math.max(0, k) * (1 - 0.08 * u); }
  else if (t < -0.42) { const u = (-t - 0.42) / 0.58; k = 1 - Math.pow(u, 2.3) * 0.52; }
  return clamp(k, 0.012, 1);
}

function hullParams(sp) {
  const k = sp.look || {};
  const armored = !!k.casemate;
  /* le corsaire : de grandes cales haussent la muraille, la cuirasse lourde l'abaisse (fbK) */
  const F = (armored ? 1.7 : clamp(sp.B * 0.38, 2.2, 4.3)) * (k.fbK || 1);
  const hb = armored ? 0.55 : clamp(sp.B * 0.12, 0.8, 1.25);
  const broad = (sp.armament || []).filter((a) => a.mount === 'broad').reduce((n, a) => n + (a.n || 1), 0);
  /* l'éperon du corsaire s'allonge à chaque cran */
  const ramS = k.ramLv ? [1, 1, 1.4, 1.8][Math.min(3, k.ramLv)] : 1;
  return { F, hb, D: 1.6, armored, ports: armored ? 0 : Math.max(3, Math.ceil(broad / 2) + 2), sheer: armored ? 0.25 : 0.7, tumble: armored ? 0.15 : 0, ram: !!k.ram, ramS };
}

/* coque : bordé extérieur, pavois intérieur, lisse, pont, tableau */
function buildHullGroup(sp, P, mats) {
  const L = sp.L, B = sp.B;
  const NS = 48;
  const sheer = (t) => P.sheer * (t * t * 0.8 + (t > 0 ? 0.35 * t : 0.1 * -t));
  const half = (t) => B / 2 * hullProfile(sp, t);
  /* rangées du bordé : y au plat-bord, au pont, puis vers la quille */
  const rows = (t) => {
    const s = sheer(t), top = P.F + P.hb + s;
    return [top, top - 0.18, P.F + s, P.F * 0.55 + s * 0.5, 0.6, 0.15, -0.5, -1.1, -P.D];
  };
  const shape = (v, y) => {
    /* forme de couple : un peu de rentrée en haut, bouchain arrondi en bas ;
     * le cuirassé rentre franchement ses murailles au-dessus de la flottaison */
    if (P.tumble && y > 0) return 1 - P.tumble * Math.min(1, y / (P.F + P.hb));
    if (y > P.F) return 0.965 + 0.02 * (1 - (y - P.F) / P.hb);
    if (y > 0) return 1.0;
    const u = clamp(-y / P.D, 0, 1);
    return 1 - Math.pow(u, 1.8) * 0.78;
  };
  const pos = [], uv = [], idx = [];
  const NR = rows(0).length;
  const ring = [];
  /* éperon : à l'avant, chaque rangée du bordé avance ou recule ; la flottaison file en pointe
   * vers l'avant, l'étrave remonte en arrière jusqu'au pont (le profil du Kōtetsu) */
  const RAMDX = [-1.9, -1.8, -1.4, -0.3, 2.1, 3.4, 3.0, 1.6, 0.3];
  const ramK = (t) => (P.ram ? Math.pow(clamp((t - 0.66) / 0.34, 0, 1), 2) : 0);
  const xAt = (t, j) => t * L / 2 + ramK(t) * RAMDX[j] * (P.ramS || 1);
  for (let i = 0; i <= NS; i++) {
    const u = i / NS, t = u * 2 - 1;
    const R = rows(t), h = half(t), s = sheer(t);
    const pts = R.map((y, j) => {
      const x = xAt(t, j);
      const z = h * shape(0, y) * (P.ram && j >= 4 && j <= 6 ? 1 + ramK(t) * 1.6 : 1);
      const yRel = y - s * clamp(y / P.F, 0, 1);
      return [x, y, z, u, (yRel + P.D) / (P.F + P.hb + P.D)];
    });
    ring.push(pts);
  }
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= NS; i++) for (let j = 0; j < NR; j++) {
      const [x, y, z, u, v] = ring[i][j];
      pos.push(x, y, z * side); uv.push(side > 0 ? u : u, v);
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NR - 1; j++) {
      const a = base + i * NR + j, b = a + NR, c = a + 1, d = b + 1;
      if (side === 1) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
  }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  hullGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  hullGeo.setIndex(idx);
  hullGeo.computeVertexNormals();
  const g = new THREE.Group();
  const hull = new THREE.Mesh(hullGeo, mats.hull);
  hull.castShadow = true; hull.receiveShadow = true;
  g.add(hull);
  /* pavois intérieur, lisse et pont */
  const inset = 0.22;
  const ip = [], ii = [], rp = [], ri = [], dp = [], du = [], di = [];
  for (let i = 0; i <= NS; i++) {
    const t = i / NS * 2 - 1, x = xAt(t, 0), xd = xAt(t, 2);
    const s = sheer(t), top = P.F + P.hb + s, deckY = P.F + s;
    const zo = half(t) * (P.tumble ? 1 - P.tumble : 0.965), zi = Math.max(0.02, zo - inset);
    for (const side of [1, -1]) { ip.push(x, top, zi * side, xd, deckY, zi * side); rp.push(x, top + 0.06, zo * side, x, top + 0.06, zi * side); }
    dp.push(xd, deckY, zi, xd, deckY, -zi);
    du.push(xd / 9, zi / 9 + 0.5, xd / 9, -zi / 9 + 0.5);
  }
  for (let i = 0; i < NS; i++) {
    for (let s = 0; s < 2; s++) {
      const a = (i * 2 + s) * 2, b = ((i + 1) * 2 + s) * 2;
      if (s === 0) { ii.push(a, b, a + 1, b, b + 1, a + 1); ri.push(a, b, a + 1, b, b + 1, a + 1); }
      else { ii.push(a, a + 1, b, b, a + 1, b + 1); ri.push(a, a + 1, b, b, a + 1, b + 1); }
    }
    const a = i * 2, b = (i + 1) * 2;
    di.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const mk = (p, ind, uvs) => { const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); if (uvs) ge.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); ge.setIndex(ind); ge.computeVertexNormals(); return ge; };
  const inner = new THREE.Mesh(mk(ip, ii), mats.bulwark); inner.receiveShadow = true;
  const rail = new THREE.Mesh(mk(rp, ri), RAILWOOD());
  const deck = new THREE.Mesh(mk(dp, di, du), mats.deck); deck.receiveShadow = true;
  deck.material.side = THREE.FrontSide;
  g.add(inner, rail, deck);
  /* tableau arrière, avec ses fenêtres */
  const r0 = ring[0];
  const tp = [], tu = [];
  for (let j = 0; j < 4; j++) {
    const [x, y, z] = r0[j], [, y2, z2] = r0[j + 1];
    tp.push(x, y, -z, x, y2, -z2, x, y, z, x, y2, -z2, x, y2, z2, x, y, z);
    const v0 = 1 - j / 4, v1 = 1 - (j + 1) / 4;
    tu.push(0, v0, 0, v1, 1, v0, 0, v1, 1, v1, 1, v0);
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  tg.setAttribute('uv', new THREE.Float32BufferAttribute(tu, 2));
  tg.computeVertexNormals();
  const transom = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: sternTexture(sp.look.hull), roughness: 0.5, side: THREE.DoubleSide }));
  g.add(transom);
  g.userData = { deckY: (x) => { const t = clamp(x / (L / 2), -1, 1); return P.F + sheer(t); }, half, sheer, topY: (x) => { const t = clamp(x / (L / 2), -1, 1); return P.F + P.hb + sheer(t); } };
  return g;
}

/* voile carrée : envergure en haut, bordure en bas, creux vers l'avant (+x) */
function sqSailGeo(wTop, wBot, h, belly) {
  const g = new THREE.PlaneGeometry(1, 1, 14, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5;
    const w = lerp(wBot, wTop, v);
    const foot = (1 - v) * 0.0 + (v < 0.01 ? Math.pow(2 * u, 2) * h * 0.06 : 0);
    const bulge = belly * (1 - Math.pow(2 * u, 2)) * Math.sin(Math.PI * clamp(0.12 + v * 0.8, 0, 1));
    p.setXYZ(i, bulge, (v - 1) * h + foot, u * w);
  }
  g.computeVertexNormals();
  return g;
}

/* voile aurique, du mât vers l'arrière */
function gaffSailGeo(yFoot, yThroat, foot, gaffLen, gaffRise, belly) {
  const g = new THREE.PlaneGeometry(1, 1, 10, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5;
    const bottom = [-u * foot, yFoot];
    const top = [-u * gaffLen, yThroat + u * gaffRise];
    const x = lerp(bottom[0], top[0], v), y = lerp(bottom[1], top[1], v);
    const z = belly * Math.sin(Math.PI * u) * Math.sin(Math.PI * clamp(0.1 + v * 0.8, 0, 1));
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/* triangle de toile entre trois points, avec un creux */
function triSailGeo(A, Bp, C, belly) {
  const N = 9, P = [], I = [], UV = [];
  const id = (i, j) => { let k = 0; for (let a = 0; a < i; a++) k += N - a + 1; return k + j; };
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N - i; j++) {
    const a = i / N, b = j / N, c = 1 - a - b;
    const x = A[0] * c + Bp[0] * a + C[0] * b, y = A[1] * c + Bp[1] * a + C[1] * b;
    const z = belly * 3.4 * a * b * c * 3;
    P.push(x, y, z);
    UV.push(a + b * 0.5, b);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
    I.push(id(i, j), id(i + 1, j), id(i, j + 1));
    if (j < N - i - 1) I.push(id(i + 1, j), id(i + 1, j + 1), id(i, j + 1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

function spar(r0, r1, len, mat, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, seg || 8), mat || SPAR());
  m.castShadow = true;
  return m;
}

/* une embarcation : petite coque ouverte, avec ses bancs */
function boatModel(len, col) {
  const g = new THREE.Group();
  const B_ = len * 0.27, D_ = len * 0.11;
  /* bordé à bouchain arrondi : six points par couple, de plat-bord à plat-bord */
  const N = 18, ring = [0.0, 0.32, 0.7, 1.0, 0.7, 0.32];
  const pos = [], idx = [];
  const yAt = [D_ * 0.95, D_ * 0.55, D_ * 0.12, 0, 0.12 * D_, 0.55 * D_];
  for (let i = 0; i <= N; i++) {
    const t = i / N * 2 - 1, x = t * len / 2;
    const w = B_ / 2 * (1 - Math.pow(Math.abs(t), 2.4));
    const sheer = D_ * 0.25 * t * t;
    const sec = [[1, D_ + sheer], [0.92, D_ * 0.6], [0.62, D_ * 0.15], [0, 0], [-0.62, D_ * 0.15], [-0.92, D_ * 0.6], [-1, D_ + sheer]];
    for (const [k, y] of sec) pos.push(x, y - D_ * 0.6, k * w);
  }
  const NR = 7;
  for (let i = 0; i < N; i++) for (let j = 0; j < NR - 1; j++) {
    const a = i * NR + j, b = a + NR;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const outside = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col || 0xe9e2d0, roughness: 0.55 }));
  outside.castShadow = true;
  const inside = new THREE.Mesh(geo, m3('boatIn', () => new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.8, side: THREE.BackSide })));
  g.add(outside, inside);
  /* plat-bord, quille, bancs, avirons rangés */
  for (const side of [1, -1]) {
    const pts = [];
    for (let i = 0; i <= N; i++) { const t = i / N * 2 - 1; pts.push(new THREE.Vector3(t * len / 2, D_ * 0.4 + D_ * 0.25 * t * t, side * B_ / 2 * (1 - Math.pow(Math.abs(t), 2.4)))); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 5), SPARDARK());
    g.add(tube);
  }
  const keel = new THREE.Mesh(new THREE.BoxGeometry(len * 0.92, 0.1, 0.08), SPARDARK()); keel.position.y = -D_ * 0.62; g.add(keel);
  for (let i = -1; i <= 1; i++) { const th = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, B_ * 0.86 * (1 - Math.pow(Math.abs(i * 0.4), 2.4))), RAILWOOD()); th.position.set(i * len * 0.24, D_ * 0.1, 0); g.add(th); }
  for (const z of [-0.12, 0.08, 0.22]) { const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len * 0.8, 5), RAILWOOD()); oar.rotation.z = Math.PI / 2; oar.position.set(0, D_ * 0.18, z * B_); g.add(oar); }
  return g;
}

/* ---------- le navire ---------- */

/* ---------- le cuirassé à éperon (Kōtetsu, ex-Stonewall) ----------
 * Coque basse aux murailles rentrées, éperon à fleur d'eau ; casemate blindée en fer à cheval
 * derrière l'étrave (le 300 livres Armstrong, qui tire en chasse et par trois sabords), tourelle
 * fixe ovale à l'arrière (les deux 70 livres) ; entre les deux, une passerelle volante, la
 * cheminée et les deux mâts de son gréement de brick. */
function armorTexture() {
  return m3('armorTex', () => canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#3a3f43'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 14, 1 + Math.random() * 2); }
    /* les plaques, posées en quinconce, leurs joints et leurs rivets */
    for (let y = 0; y < h; y += 64) {
      for (let x = (y / 64) % 2 ? -64 : 0; x < w; x += 128) {
        c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 2.5; c.strokeRect(x + 1, y + 1, 126, 62);
        c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 1; c.strokeRect(x + 4, y + 4, 120, 56);
        for (let rx = x + 8; rx < x + 124; rx += 11) for (const ry of [y + 8, y + 56]) {
          c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(rx + 0.8, ry + 0.8, 2.2, 0, TAU); c.fill();
          c.fillStyle = 'rgba(210,215,220,0.32)'; c.beginPath(); c.arc(rx, ry, 1.7, 0, TAU); c.fill();
        }
      }
    }
    /* coulures de rouille sous les rivets */
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w, y = Math.random() * h * 0.6, l = 20 + Math.random() * 60;
      const g = c.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, 'rgba(120,70,36,0.35)'); g.addColorStop(1, 'rgba(120,70,36,0)');
      c.fillStyle = g; c.fillRect(x, y, 1.5 + Math.random() * 2.5, l);
    }
  }, { repeat: true }));
}

/* un caisson blindé : le contour au pied, le toit plus étroit (les murailles inclinées) */
function loftGeo(pts, h, k) {
  const n = pts.length;
  let cx = 0, cz = 0;
  for (const [x, z] of pts) { cx += x; cz += z; }
  cx /= n; cz /= n;
  const pos = [], uv = [], idx = [];
  let per = 0;
  for (let i = 0; i <= n; i++) {
    const [x, z] = pts[i % n];
    if (i > 0) { const [px, pz] = pts[i - 1]; per += Math.hypot(x - px, z - pz); }
    pos.push(x, 0, z, cx + (x - cx) * k, h, cz + (z - cz) * k);
    uv.push(per / 4.5, 0, per / 4.5, h / 4.5 * 2);
  }
  for (let i = 0; i < n; i++) { const a = i * 2, b = a + 2; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const c0 = pos.length / 3;
  pos.push(cx, h, cz); uv.push(0.5, 0.5);
  for (let i = 0; i < n; i++) { const [x, z] = pts[i]; pos.push(cx + (x - cx) * k, h, cz + (z - cz) * k); uv.push(x / 9, z / 9); }
  for (let i = 0; i < n; i++) idx.push(c0, c0 + 1 + i, c0 + 1 + ((i + 1) % n));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* la cuirasse du corsaire, cran par cran : une ceinture de plaques rivées à la flottaison, qui
 * s'allonge et monte jusqu'au pont (crans 1 à 5), puis jusqu'au plat-bord (6) ; un caisson blindé au
 * milieu (4), une tourelle à l'avant (5), une seconde à l'arrière (7), et pour finir un blockhaus,
 * le poste de commandement cuirassé (8). Les tourelles se mettent là où ne sont ni mâts ni cheminées. */
function corsairPlates(sp, P, add, deckY, half, topY, lvl) {
  const L = sp.L, B = sp.B, k = sp.look || {};
  lvl = Math.min(8, lvl);
  const plate = m3('armorMat', () => new THREE.MeshStandardMaterial({ map: armorTexture(), color: 0xaab0b6, roughness: 0.42, metalness: 0.45, side: THREE.DoubleSide }));
  const roofM = m3('armorRoof', () => new THREE.MeshStandardMaterial({ color: 0x34383c, roughness: 0.55, metalness: 0.4 }));
  const span = [0, 0.4, 0.58, 0.76, 0.86, 0.9, 0.95, 0.96, 0.97][lvl], yTop = [0, 0.55, 0.75, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0][lvl];
  const x0 = -span * L / 2, x1 = span * L / 2, N = 18;
  for (const side of [1, -1]) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const x = lerp(x0, x1, i / N), t = clamp(x / (L / 2), -1, 1), z = half(t) * 1.012 + 0.04;
      const yt = lvl >= 6 ? topY(x) + 0.02 : deckY(x) * yTop;
      pos.push(x, -0.25, side * z, x, yt, side * z);
      uv.push(x / 4.5, 0, x / 4.5, (yt + 0.25) / 4.5 * 2);
    }
    for (let i = 0; i < N; i++) { const a = i * 2, b = a + 2; if (side > 0) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, plate); m.castShadow = true; m.receiveShadow = true;
    add(m, 0, 0, 0);
  }
  /* ce qui occupe déjà l'axe : les mâts, les cheminées, les tambours des roues */
  const busy = [...(k.masts || []), ...[].concat(k.funnel === undefined ? [] : k.funnel), ...[].concat(k.paddle === undefined ? [] : k.paddle)].map((f) => f * L);
  const free = (cands, r) => { for (const f of cands) { const x = f * L; if (busy.every((b) => Math.abs(b - x) > r + 1.2)) { busy.push(x); return x; } } return null; };
  if (lvl >= 4) {
    /* le caisson blindé, aux murailles inclinées, au milieu du pont */
    const cx = L * 0.02, w = L * 0.2, d = B * 0.62, y = deckY(cx);
    const box = new THREE.Mesh(loftGeo([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2 + 0.8, 0], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2 - 0.8, 0]], 2.3, 0.82), plate);
    box.castShadow = true; add(box, cx, y, 0);
  }
  const r = clamp(B * 0.2, 1.2, 2.4);
  const turret = (tx_, dir) => {
    const y = deckY(tx_);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r, 1.8, 18), plate); tw.castShadow = true; add(tw, tx_, y + 0.9, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, 0.14, 18), roofM), tx_, y + 1.85, 0);
    const gun = gunModel(30, true, 1.0, false); gun.scale.setScalar(1.2); gun.rotation.y = dir > 0 ? 0 : Math.PI;
    gun.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    add(gun, tx_ + dir * r * 0.4, y + 1.1, 0);
  };
  if (lvl >= 5) {
    /* la tourelle de l'avant, ronde, avec sa pièce */
    const tx_ = free([0.3, 0.36, 0.22, 0.4, 0.15], r);
    if (tx_ !== null) turret(tx_, 1);
  }
  if (lvl >= 7) {
    /* la tourelle de l'arrière, sa pièce tournée vers la poupe */
    const tx_ = free([-0.2, -0.14, -0.26, -0.08], r);
    if (tx_ !== null) turret(tx_, -1);
  }
  if (lvl >= 8) {
    /* le blockhaus : un poste de commandement cuirassé, avec sa fente de vue, devant le caisson */
    const bx = free([0.13, 0.18, -0.1, 0.24], 1.3);
    if (bx !== null) {
      const y = deckY(bx), bh = 2.0, br = clamp(B * 0.11, 0.9, 1.4);
      const ct = new THREE.Mesh(new THREE.CylinderGeometry(br, br * 1.06, bh, 14), plate); ct.castShadow = true; add(ct, bx, y + bh / 2, 0);
      add(new THREE.Mesh(new THREE.CylinderGeometry(br * 1.08, br * 1.08, 0.16, 14), roofM), bx, y + bh + 0.06, 0);
      const slit = new THREE.Mesh(new THREE.CylinderGeometry(br * 1.01, br * 1.01, 0.12, 14, 1, true, -0.9, 1.8), m3('portBlack', () => new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 0.9 })));
      add(slit, bx, y + bh * 0.82, 0);
    }
  }
}

/* le corsaire, au chantier : l'hélice et son bâti de levage, le gouvernail (et la double roue), les
 * pompes au pied du grand mât */
function corsairFittings(sp, P, add, deckY, half, topY, k) {
  const L = sp.L, B = sp.B;
  const iron = GUNIRON(), wood = SPARDARK();
  /* le gouvernail : un safran qui déborde de l'étambot, plus large à chaque cran */
  if (k.rudder) {
    const chord = 1.0 + 0.35 * k.rudder, hh = topY(-L / 2) + 1.4;
    const rud = new THREE.Mesh(new THREE.BoxGeometry(chord, hh, 0.28), wood);
    rud.castShadow = true;
    add(rud, -L / 2 - chord / 2 - (k.screw ? 1.6 : 0.15), hh / 2 - 1.6, 0);
    /* la barre, sur le pont arrière */
    add(new THREE.Mesh(new THREE.BoxGeometry(2.2 + 0.3 * k.rudder, 0.16, 0.16), wood), -L / 2 + 0.6, deckY(-L / 2 + 0.6) + 0.5, 0);
    /* une seconde roue, jumelle, à partir du deuxième cran */
    if (k.rudder >= 2) {
      const wx = -L * 0.43 + 1.0;
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 6, 16), RAILWOOD());
      wheel.rotation.y = Math.PI / 2; wheel.castShadow = true;
      add(wheel, wx, deckY(wx) + 1.1, 0);
    }
  }
  /* l'hélice, à l'étambot, à fleur d'eau : deux, trois puis quatre pales ; au-dessus, le bâti qui la
   * hisse hors de l'eau quand on va à la voile */
  if (k.screw) {
    const blades = [2, 3, 4][Math.min(3, k.screw) - 1], R_ = clamp(B * 0.16, 0.9, 1.6) * (1 + 0.15 * (k.screw - 1));
    const bronze = m3('screwBronze', () => new THREE.MeshStandardMaterial({ color: 0xa8743a, metalness: 0.7, roughness: 0.35 }));
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), iron));
    for (let i = 0; i < blades; i++) {
      const a = i / blades * TAU, bl = new THREE.Mesh(new THREE.BoxGeometry(0.12, R_, 0.55), bronze);
      bl.position.set(0, Math.cos(a) * R_ / 2, Math.sin(a) * R_ / 2); bl.rotation.x = -a; bl.rotation.y = 0.35;
      g.add(bl);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    add(g, -L / 2 - 0.55, 0.05, 0);
    /* le bâti de levage : deux montants de fer et leur traverse, au-dessus de l'étambot */
    const fy = topY(-L / 2 + 0.5), fh = 2.2 + 0.5 * k.screw;
    for (const z of [-0.85, 0.85]) add(new THREE.Mesh(new THREE.BoxGeometry(0.2, fh, 0.2), iron), -L / 2 + 0.4, fy + fh / 2, z);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 2.0), iron), -L / 2 + 0.4, fy + fh, 0);
  }
  /* les pompes et leurs bringuebales, de part et d'autre, en arrière du grand mât */
  if (k.pumps) {
    const ms = (k.masts || [0]).map((f) => f * L), main = ms[Math.min(1, ms.length - 1)];
    for (let i = 0; i < k.pumps; i++) {
      const x = main - 2.2 - Math.floor(i / 2) * 2.4, z = (i % 2 ? 1 : -1) * half(clamp(x / (L / 2), -1, 1)) * 0.42, y = deckY(x);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.0, 8), wood), x, y + 0.5, z).castShadow = true;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.4), iron), x, y + 1.1, z);
    }
  }
}

/* la mitrailleuse Gatling du corsaire, sur son trépied : à l'avant, puis (crans 2 et 3) à la poupe
 * et sur le rouf (at : où, rotY : vers où) */
function corsairGatling(add, deckY, L, B, at, rotY) {
  const g = new THREE.Group(), iron = GUNIRON(), brass = GOLD();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 5), iron);
    b.rotation.z = Math.PI / 2; b.position.set(0.55, 1.15 + Math.cos(a) * 0.13, Math.sin(a) * 0.13); g.add(b);
  }
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), brass); drum.rotation.z = Math.PI / 2; drum.position.set(-0.1, 1.15, 0); g.add(drum);
  const hopper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.2), brass); hopper.position.set(0.05, 1.45, 0); g.add(hopper);
  for (const a of [0, 2.1, 4.2]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.3, 5), iron); leg.position.set(Math.cos(a) * 0.3, 0.55, Math.sin(a) * 0.3); leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(leg); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const x = at !== undefined ? at : L * 0.4 - 1.2;
  g.rotation.y = rotY || 0;
  add(g, x, deckY(x), 0);
}

function ironcladWorks(sp, P, add, deckY, half, parts) {
  const L = sp.L, B = sp.B;
  const plate = m3('armorMat', () => new THREE.MeshStandardMaterial({ map: armorTexture(), color: 0xaab0b6, roughness: 0.42, metalness: 0.45, side: THREE.DoubleSide }));
  const roof = m3('armorRoof', () => new THREE.MeshStandardMaterial({ color: 0x34383c, roughness: 0.55, metalness: 0.4 }));
  const black = m3('portBlack', () => new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 0.9 }));
  const grate = m3('grating', () => new THREE.MeshStandardMaterial({ color: 0x4b3a26, roughness: 0.85 }));
  const zIn = (x) => half(clamp(x / (L / 2), -1, 1)) * (1 - P.tumble) - 0.35;
  /* sabord : un trou noir dans la muraille inclinée, cerclé de fer */
  const port = (x, y, z, ang, w, hgt) => {
    const g = new THREE.Group();
    const hole = new THREE.Mesh(new THREE.BoxGeometry(0.36, hgt, w), black); g.add(hole);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, hgt + 0.22, w + 0.22), roof); frame.position.x = -0.04; g.add(frame);
    g.position.set(x, y, z); g.rotation.y = -ang;
    add(g, x, y, z);
  };
  const ringAt = (pts, cx, k, i) => { const [x, z] = pts[i]; return [cx[0] + (x - cx[0]) * k, cx[1] + (z - cx[1]) * k]; };

  /* la casemate avant, en fer à cheval */
  {
    const xc = L * 0.27, lc = L * 0.13, hw = Math.min(zIn(xc + lc / 2), B * 0.31), hc = 2.6, kTop = 0.84;
    const xr = xc - lc / 2, xf = xc + lc / 2, R = hw;
    const pts = [[xr, -hw], [xf - R, -hw]];
    for (let i = 1; i < 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI; pts.push([xf - R + Math.cos(a) * R, Math.sin(a) * R]); }
    pts.push([xf - R, hw], [xr, hw]);
    const y0 = deckY(xc) - 0.05;
    const m = new THREE.Mesh(loftGeo(pts, hc, kTop), plate);
    m.castShadow = true; m.receiveShadow = true;
    add(m, 0, y0, 0);
    let cx = 0, cz = 0; for (const [x, z] of pts) { cx += x; cz += z; } cx /= pts.length; cz /= pts.length;
    /* trois sabords : en chasse, et de chaque bord vers l'avant */
    const mid = (kTop + 1) / 2;
    for (const [a, i] of [[0, 6], [0.62, 3], [-0.62, 9]]) {
      const [px, pz] = ringAt(pts, [cx, cz], mid, i);
      const ang = Math.atan2(pz - cz, px - cx);
      port(px, y0 + hc * 0.5, pz, ang, 0.85, 0.72);
    }
    /* le 300 livres Armstrong, la volée hors du sabord de chasse */
    const len = 4.4, r = 0.44;
    const gun = new THREE.Mesh(barrelGeo(len, r, true), GUNIRON());
    gun.rotation.z = -Math.PI / 2;
    add(gun, xf + 0.9 - len, y0 + hc * 0.5, 0).castShadow = true;
    /* sur le toit : le panneau à caillebotis et la guérite de visée */
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 1.3), grate);
    add(hatch, xc - lc * 0.18, y0 + hc + 0.08, 0);
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.55, 10), roof);
    add(hood, xc + lc * 0.22, y0 + hc + 0.27, 0).castShadow = true;
    /* le chaumard et les bittes de l'avant */
    for (const z of [-0.8, 0.8]) {
      const bitt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.7, 8), IRON());
      add(bitt, L * 0.4, deckY(L * 0.4) + 0.35, z).castShadow = true;
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.85, 10), IRON());
    add(cap, L * 0.36, deckY(L * 0.36) + 0.42, 0).castShadow = true;
  }

  /* la tourelle fixe de l'arrière, ovale */
  {
    const xc = -L * 0.3, a = L * 0.068, b = Math.min(zIn(xc), B * 0.3), hc = 2.4, kTop = 0.86;
    const pts = [];
    for (let i = 0; i < 24; i++) { const t = -i / 24 * TAU; pts.push([xc + Math.cos(t) * a, Math.sin(t) * b]); }
    const y0 = deckY(xc) - 0.05;
    const m = new THREE.Mesh(loftGeo(pts, hc, kTop), plate);
    m.castShadow = true; m.receiveShadow = true;
    add(m, 0, y0, 0);
    const mid = (kTop + 1) / 2;
    /* deux sabords en retraite, un de chaque bord */
    for (const [t, w] of [[Math.PI - 0.32, 0.8], [Math.PI + 0.32, 0.8], [Math.PI / 2, 0.8], [-Math.PI / 2, 0.8]]) {
      const px = xc + Math.cos(t) * a * mid, pz = Math.sin(t) * b * mid;
      port(px, y0 + hc * 0.5, pz, Math.atan2(Math.sin(t) * a, Math.cos(t) * b), w, 0.66);
    }
    /* les deux 70 livres, en retraite */
    for (const z of [-Math.sin(0.32) * b * mid, Math.sin(0.32) * b * mid]) {
      const len = 3.3, r = 0.32;
      const gun = new THREE.Mesh(barrelGeo(len, r, true), GUNIRON());
      gun.rotation.z = Math.PI / 2;
      add(gun, xc - a * mid * 0.95 - 0.7 + len, y0 + hc * 0.5, z).castShadow = true;
    }
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 1.2), grate);
    add(hatch, xc, y0 + hc + 0.08, 0);
    /* la barre, derrière la tourelle, sous son habitacle doré */
    const wx = -L * 0.43;
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 6, 16), RAILWOOD());
    wheel.rotation.y = Math.PI / 2;
    add(wheel, wx, deckY(wx) + 1.05, 0).castShadow = true;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 1.0, 8), GOLD()), wx + 1.3, deckY(wx + 1.3) + 0.5, 0);
  }

  /* la passerelle volante, d'un bord à l'autre, sur ses épontilles */
  {
    const bx = L * 0.075, hy = deckY(bx) + 2.7, hz = half(clamp(bx / (L / 2), -1, 1)) * (1 - P.tumble) + 0.5, span = hz * 2;
    const deckB = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, span), RAILWOOD());
    deckB.castShadow = true; add(deckB, bx, hy, 0);
    for (const z of [-hz + 0.9, -1.2, 1.2, hz - 0.9]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.7, 6), IRON());
      add(st, bx, hy - 1.35, z);
    }
    for (const dx of [-0.7, 0.7]) {
      const rl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, span), RAILWOOD()); add(rl, bx + dx, hy + 0.95, 0);
      for (let i = 0; i <= 8; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), IRON()); add(st, bx + dx, hy + 0.5, -span / 2 + i * span / 8); }
    }
    /* la toile qui abrite l'officier de quart, l'habitacle et les feux de côté */
    const dodger = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, span * 0.5), m3('dodger', () => new THREE.MeshStandardMaterial({ color: 0xcfc4a8, roughness: 0.95 })));
    add(dodger, bx + 0.72, hy + 0.48, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 8), GOLD()), bx, hy + 0.5, 0);
    for (const s of [1, -1]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.12), s > 0 ? m3('lampG', () => new THREE.MeshStandardMaterial({ color: 0x1f6a3a, emissive: 0x0a3018 })) : m3('lampR', () => new THREE.MeshStandardMaterial({ color: 0x8a1f1a, emissive: 0x3a0806 })));
      add(box, bx, hy + 0.35, s * (hz - 0.05));
    }
  }
}

/* les pièces sont un peu grossies, comme les navires eux-mêmes, pour se lire à l'échelle du jeu */
const GUN_K = 1.35;

function buildShipModel(sp) {
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);
  const L = sp.L, B = sp.B, k = sp.look || {};
  const P = hullParams(sp);
  const hullTex = shipHullTexture(sp, P);
  const mats = {
    hull: new THREE.MeshStandardMaterial({ map: hullTex, roughness: P.armored ? 0.45 : 0.5, metalness: P.armored ? 0.35 : 0.05 }),
    bulwark: new THREE.MeshStandardMaterial({ color: P.armored ? 0x55585a : 0xd5c39a, roughness: 0.7 }),
    deck: new THREE.MeshStandardMaterial({ map: shipDeckTexture(k.deck || '#b59a72'), roughness: 0.85, color: 0xb8a690 }),
  };
  const H = buildHullGroup(sp, P, mats);
  tilt.add(H);
  const deckY = H.userData.deckY, half = H.userData.half, topY = H.userData.topY;
  const parts = { root, tilt, hullMat: mats.hull, sails: [], yards: [], gaffs: [], jibs: [], wheels: [], flag: null, F: P.F };
  const add = (m, x, y, z) => { m.position.set(x, y, z); tilt.add(m); return m; };

  /* étrave et figure de proue dorée */
  if (!k.ram) {
    const stem = new THREE.Mesh(new THREE.BoxGeometry(1.4, P.F + P.hb + 1.6, 0.35), mats.hull);
    add(stem, L / 2 - 0.4, (P.F + P.hb) / 2 - 0.4, 0);
    stem.rotation.z = -0.2;
  }
  if (k.figurehead || !P.armored) {
    const fh = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.6, 6), GOLD());
    fh.rotation.z = -Math.PI / 2 + 0.25;
    add(fh, L / 2 + 0.7, P.F + 0.6, 0);
    for (const s of [1, -1]) { const sc = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 16, Math.PI), GOLD()); sc.rotation.y = s * 0.6; sc.rotation.z = -0.3; add(sc, L / 2 - 1.5, P.F + 0.4, s * 0.45); }
  }
  /* l'éperon du Kōtetsu */
  if (k.ram) {
    /* la pointe de l'éperon, en fer forgé, à fleur d'eau (plus longue et plus lourde à chaque cran) */
    const rs = P.ramS || 1;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.42 * Math.sqrt(rs), 2.2 * rs, 8), IRON());
    tip.rotation.z = -Math.PI / 2; tip.scale.set(1, 1, 0.75);
    add(tip, L / 2 + 3.6 * rs, 0.3, 0);
    /* au dernier cran, l'étrave entière est bardée de fer : deux joues de plaques le long de l'éperon */
    if (k.ramLv >= 3) {
      const plate = m3('armorMat', () => new THREE.MeshStandardMaterial({ map: armorTexture(), color: 0xaab0b6, roughness: 0.42, metalness: 0.45, side: THREE.DoubleSide }));
      for (const side of [1, -1]) {
        const cheek = new THREE.Mesh(new THREE.BoxGeometry(5.2 * rs, P.F * 0.9, 0.12), plate);
        cheek.rotation.y = side * 0.32;
        cheek.castShadow = true;
        add(cheek, L / 2 + 0.6 * rs, P.F * 0.4, side * 0.55);
      }
    }
  }

  /* superstructures */
  if (P.armored) {
    ironcladWorks(sp, P, add, deckY, half, parts);
  } else {
    /* rouf arrière avec claire-voie, roue et habitacle */
    const rx = (k.houseX !== undefined ? k.houseX : -0.34) * L;
    const house = new THREE.Mesh(new THREE.BoxGeometry(L * 0.09, 1.3, B * 0.36), new THREE.MeshStandardMaterial({ color: 0xcdbb92, roughness: 0.6 }));
    add(house, rx, deckY(rx) + 0.65, 0).castShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(L * 0.095, 0.12, B * 0.39), RAILWOOD());
    add(roof, rx, deckY(rx) + 1.36, 0);
    const sky = new THREE.Mesh(new THREE.BoxGeometry(L * 0.05, 0.45, B * 0.18), GLASS());
    add(sky, rx, deckY(rx) + 1.6, 0);
    const wx = -L * 0.43;
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 6, 16), RAILWOOD());
    wheel.rotation.y = Math.PI / 2;
    add(wheel, wx, deckY(wx) + 1.1, 0).castShadow = true;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.1, 8), GOLD()), wx + 1.6, deckY(wx + 1.6) + 0.55, 0);
    /* panneaux à caillebotis et cabestan */
    for (const fx of [0.14, -0.12]) {
      const hx = fx * L;
      const hatch = new THREE.Mesh(new THREE.BoxGeometry(L * 0.05, 0.35, B * 0.26), new THREE.MeshStandardMaterial({ color: 0x5a442c, roughness: 0.8 }));
      add(hatch, hx, deckY(hx) + 0.17, 0).receiveShadow = true;
    }
    const cx = L * 0.33;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1, 10), SPARDARK()), cx, deckY(cx) + 0.5, 0).castShadow = true;
  }

  /* le corsaire : plaques de cuirasse rivées sur la muraille, caisson blindé, mitrailleuse */
  if (k.plates) corsairPlates(sp, P, add, deckY, half, topY, k.plates);
  if (k.gatling) corsairGatling(add, deckY, L, B);
  /* une deuxième mitrailleuse à la poupe, une troisième sur le rouf */
  if (k.gatlings >= 2) corsairGatling(add, deckY, L, B, -L * 0.4 + 1.6, Math.PI);
  if (k.gatlings >= 3) { const rx = (k.houseX !== undefined ? k.houseX : -0.34) * L; corsairGatling(add, (x) => deckY(rx) + 1.42, L, B, rx, Math.PI / 2); }
  if (k.custom) corsairFittings(sp, P, add, deckY, half, topY, k);

  /* roues à aubes : la roue qui tourne (jantes, rayons, pales), son tambour bombé à la face
   * sculptée et dorée, les plates-formes de part et d'autre et la passerelle entre les tambours */
  parts.wheelSpin = [];
  const paddles = k.paddle === undefined ? [] : [].concat(k.paddle);
  for (const pf of paddles) {
    const R_ = k.paddleR || Math.max(3.6, B * 0.38), wd = clamp(B * 0.26, 2.2, 3.2);
    const px = pf * L, t = px / (L / 2), hb = half(t);
    const axY = Math.max(R_ - 1.0, P.F * 0.45);
    const iron = GUNIRON(), paddleWood = m3('paddleWood', () => new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.8 }));
    const boxMat = m3('pbox:' + k.hull, () => new THREE.MeshStandardMaterial({ color: k.hull, roughness: 0.45, side: THREE.DoubleSide }));
    const face = m3('pface:' + k.hull, () => new THREE.MeshStandardMaterial({ map: paddleFaceTexture(k.hull), roughness: 0.58, metalness: 0.1 }));
    const shape = new THREE.Shape();
    const Rb = R_ + 0.35;
    shape.moveTo(-Rb, 0); shape.absarc(0, 0, Rb, Math.PI, 0, true); shape.lineTo(-Rb, 0);
    const fgeo = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 32 });
    const uvA = fgeo.attributes.uv, pA = fgeo.attributes.position;
    for (let i = 0; i < uvA.count; i++) uvA.setXY(i, (pA.getX(i) + Rb) / (2 * Rb), pA.getY(i) / Rb);
    for (const side of [1, -1]) {
      const zc = side * (hb + wd / 2 + 0.4);
      /* la roue */
      const wheel = new THREE.Group();
      wheel.position.set(px, axY, zc);
      for (const zz of [-wd / 2, wd / 2]) {
        wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R_, 0.09, 6, 40), iron).translateZ(zz));
        wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R_ * 0.55, 0.07, 5, 28), iron).translateZ(zz));
      }
      const nP = 14;
      for (let i = 0; i < nP; i++) {
        const a = i / nP * TAU;
        for (const zz of [-wd / 2, wd / 2]) {
          const sp_ = new THREE.Mesh(new THREE.BoxGeometry(R_ * 0.98, 0.1, 0.1), iron);
          sp_.position.set(Math.cos(a) * R_ * 0.49, Math.sin(a) * R_ * 0.49, zz); sp_.rotation.z = a; wheel.add(sp_);
        }
        const fl = new THREE.Mesh(new THREE.BoxGeometry(0.12, R_ * 0.3, wd * 1.04), paddleWood);
        fl.position.set(Math.cos(a) * R_ * 0.84, Math.sin(a) * R_ * 0.84, 0); fl.rotation.z = a; fl.castShadow = true; wheel.add(fl);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, wd + 0.9, 10), iron); hub.rotation.x = Math.PI / 2; wheel.add(hub);
      mergeStatic(wheel);
      tilt.add(wheel);
      parts.wheelSpin.push(wheel);
      /* le tambour : dos bombé, face sculptée vers l'extérieur, moulure dorée */
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(Rb, Rb, wd + 0.8, 36, 1, true, Math.PI / 2, Math.PI), boxMat);
      drum.rotation.x = Math.PI / 2; drum.castShadow = true;
      add(drum, px, axY, zc);
      const fc = new THREE.Mesh(fgeo, face);
      fc.castShadow = true;
      add(fc, px, axY, zc + side * (wd / 2 + 0.4) - (side > 0 ? 0.11 : 0.11));
      const mould = new THREE.Mesh(new THREE.TorusGeometry(Rb, 0.13, 6, 40, Math.PI), GOLD());
      add(mould, px, axY, zc + side * (wd / 2 + 0.52));
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(2 * Rb + 0.3, 0.16, 0.34), GOLD());
      add(ledge, px, axY - 0.02, zc + side * (wd / 2 + 0.5));
      /* sous le moyeu, le tambour descend droit jusqu'à un mètre de l'eau : on ne voit que le bas de la roue qui fouette la mer */
      const skirtH = Math.max(0.3, axY - 0.95);
      const sk = new THREE.Mesh(new THREE.BoxGeometry(2 * Rb, skirtH, 0.24), boxMat);
      sk.castShadow = true;
      add(sk, px, axY - skirtH / 2, zc + side * (wd / 2 + 0.4));
      for (const s2 of [1, -1]) {
        const ends = new THREE.Mesh(new THREE.BoxGeometry(0.14, skirtH, wd + 0.8), boxMat);
        add(ends, px + s2 * Rb, axY - skirtH / 2, zc);
      }
      const sill = new THREE.Mesh(new THREE.BoxGeometry(2 * Rb + 0.2, 0.12, 0.3), GOLD());
      add(sill, px, axY - skirtH, zc + side * (wd / 2 + 0.42));
      /* plates-formes avant et arrière, sur leurs jambettes */
      for (const s2 of [1, -1]) {
        const pl = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, wd + 0.9), RAILWOOD());
        pl.receiveShadow = true; pl.castShadow = true;
        add(pl, px + s2 * (Rb + 1.3), deckY(px) + 0.05, zc);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 0.07), RAILWOOD());
        add(rail, px + s2 * (Rb + 1.3), deckY(px) + 1.0, zc + side * (wd / 2 + 0.4));
        for (const dx of [0.2, 2.4]) {
          const stn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 5), RAILWOOD());
          add(stn, px + s2 * (Rb + dx), deckY(px) + 0.55, zc + side * (wd / 2 + 0.4));
        }
        /* la jambette : de la muraille, sous le pont, jusqu'au bord de la plate-forme */
        const dz = side * (wd + 0.7), dy = 1.6, bl = Math.hypot(dz, dy);
        for (const dx of [0.3, 2.3]) {
          const strut = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, bl), SPARDARK());
          strut.rotation.x = -Math.atan2(dy, dz);
          add(strut, px + s2 * (Rb + dx), deckY(px) - 0.05 - dy / 2, side * hb + dz / 2);
        }
      }
      /* la poutre de garde qui court le long du tambour */
      const guard = new THREE.Mesh(new THREE.BoxGeometry(2 * Rb + 5.6, 0.3, 0.3), SPARDARK());
      add(guard, px, deckY(px) - 0.25, zc + side * (wd / 2 + 0.45));
    }
    /* la passerelle d'un tambour à l'autre, avec ses garde-corps */
    const span = 2 * (hb + wd + 0.8);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, span), RAILWOOD());
    bridge.castShadow = true;
    add(bridge, px, axY + Rb + 0.12, 0);
    for (const dx of [-0.72, 0.72]) {
      const rl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, span), RAILWOOD()); add(rl, px + dx, axY + Rb + 1.0, 0);
      for (let i = 0; i <= 8; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.88, 4), RAILWOOD()); add(st, px + dx, axY + Rb + 0.56, -span / 2 + i * span / 8); }
    }
  }

  /* cheminées et manches à air */
  const funnels = k.funnel === undefined ? [] : Array.isArray(k.funnel) ? k.funnel : [k.funnel];
  parts.smoke = [];
  for (const f of funnels) {
    const fx = f * L, r = k.funnelR || clamp(B * 0.085, 0.7, 1.15), fh = k.funnelH || clamp(L * 0.13, 6, 10);
    const fg = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, fh, 18), BLACKPAINT());
    body.position.y = fh / 2; body.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, fh * 0.13, 18), new THREE.MeshStandardMaterial({ color: P.armored ? 0x6a2a20 : 0xb0302a, roughness: 0.5 }));
    band.position.y = fh * 0.78;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 6, 18), BLACKPAINT());
    lip.rotation.x = Math.PI / 2; lip.position.y = fh;
    const inside = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 16), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    inside.rotation.x = -Math.PI / 2; inside.position.y = fh - 0.05;
    fg.add(body, lip, inside);
    if (k.funnelBand !== false) fg.add(band);
    /* la cheminée est rivée par viroles : des cercles réguliers sur toute la hauteur */
    if (k.funnelBand === false) for (let yy = 0.18; yy < 0.95; yy += 0.16) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.015, 0.035, 4, 18), BLACKPAINT()); ring.rotation.x = Math.PI / 2; ring.position.y = fh * yy; fg.add(ring); }
    fg.rotation.z = 0.08;
    add(fg, fx, deckY(fx), 0);
    parts.smoke.push([fx - 0.4, deckY(fx) + fh + 0.4, 0]);
    /* le tuyau de vapeur, et le sifflet doré */
    const sp_ = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, fh * 1.08, 8), BLACKPAINT());
    add(sp_, fx - r - 0.25, deckY(fx) + fh * 0.54, 0);
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 8), GOLD());
    add(wh, fx - r - 0.25, deckY(fx) + fh * 1.08 + 0.25, 0);
    /* cercles rivés */
    if (k.funnelBand !== false) for (const yy of [0.25, 0.5]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.05, 4, 18), BLACKPAINT()); ring.rotation.x = Math.PI / 2; add(ring, fx, deckY(fx) + fh * yy, 0); }
    /* manches à air : tuyau, coude, pavillon évasé, rouge dedans */
    const white = P.armored ? m3('ventD', () => new THREE.MeshStandardMaterial({ color: 0x2a2d30, roughness: 0.5, metalness: 0.2 })) : m3('ventW', () => new THREE.MeshStandardMaterial({ color: 0xece5d4, roughness: 0.5 }));
    const red = m3('ventR', () => new THREE.MeshStandardMaterial({ color: 0xa82a22, roughness: 0.6, side: THREE.DoubleSide }));
    for (const s of [1, -1]) {
      const vg = new THREE.Group();
      const pr = 0.2, ph = 1.7;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr * 1.15, ph, 10), white); pipe.position.y = ph / 2; vg.add(pipe);
      const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.38, pr, 8, 10, Math.PI / 2), white);
      elbow.rotation.z = Math.PI / 2; elbow.position.set(0.38, ph, 0); vg.add(elbow);
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.5, pr, 0.6, 16, 1, true), white);
      bell.rotation.z = -Math.PI / 2; bell.position.set(0.38 + 0.3, ph + 0.38, 0); vg.add(bell);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(0.47, 16), red);
      inner.rotation.y = Math.PI / 2; inner.position.set(0.38 + 0.5, ph + 0.38, 0); vg.add(inner);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 4, 16), white);
      lip.rotation.y = Math.PI / 2; lip.position.set(0.38 + 0.6, ph + 0.38, 0); vg.add(lip);
      vg.rotation.y = s > 0 ? 0 : Math.PI;
      vg.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      add(vg, fx + s * 2.2, deckY(fx), s * B * 0.22);
    }
  }

  /* canons : fûts tournés sur affûts marins, passés dans de vrais sabords à mantelet relevé ;
   * les canons de chasse sur glissière et pivot. Chaque pièce porte le cran de canons à partir
   * duquel elle se montre (arcade, corsaire) : en batterie, deux sabords par bord au départ, puis
   * un de plus aux crans 2, 4, 6 et 8, les autres restant fermés par leur mantelet ; quand le
   * navire n'a pas assez de sabords, des caronades sur le pont ; à l'avant, une pièce de chasse de
   * plus aux crans 1, 3 et 7 ; à l'arrière, une pièce de retraite au cran 5, deux de plus au cran 9.
   * En mode histoire, l'armement de 1869 est montré tel quel. */
  const guns = expandGuns(sp);
  parts.gunSets = []; parts.lids = [];
  const sets = new Map();
  /* un jeu de pièces : celles d'un même bord qui apparaissent au même cran, fondues en un seul objet */
  const gunSet = (kind, side, lvl, hist) => {
    const key = kind + '|' + side + '|' + lvl + '|' + (hist ? 1 : 0);
    let g = sets.get(key);
    if (!g) { g = new THREE.Group(); g.userData = { kind, side: String(side), lvl, hist: !!hist, keep: true }; sets.set(key, g); }
    return g;
  };
  const portBlack = m3('portBlack', () => new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 0.9 }));
  const lidRed = m3('lidRed', () => new THREE.MeshStandardMaterial({ color: 0x8e2a1e, roughness: 0.6 }));
  const lidOut = m3('lidOut:' + (k.stripe || '#c9b58a'), () => new THREE.MeshStandardMaterial({ color: k.stripe || 0xc9b58a, roughness: 0.6 }));
  const BROAD_LVL = [0, 0, 2, 4, 6, 8];
  /* l'ordre d'ouverture des sabords : du milieu vers les extrémités */
  const centerOut = (n) => [...Array(n).keys()].sort((a, b) => Math.abs(a - (n - 1) / 2) - Math.abs(b - (n - 1) / 2) || a - b);
  const placeGun = (g, x, y, z, set) => { g.position.set(x, y, z); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); set.add(g); };
  const broadXs = [];
  for (const side of [1, -1]) {
    const list = guns.filter((g) => g.side === side).sort((a, b) => a.bx - b.bx);
    centerOut(list.length).forEach((idx, j) => { list[idx].ulvl = BROAD_LVL[Math.min(j, BROAD_LVL.length - 1)]; });
    if (side === 1) for (const g of list) broadXs.push(g.bx);
  }
  for (const gd of guns) {
    if (!gd.side || P.armored) continue;
    const kg = (GUN_TYPES[gd.type] || { kg: 8 }).kg;
    const rifled = /^[ra]/.test(gd.type || '');
    const t = clamp(gd.bx / (L / 2), -0.95, 0.95);
    const dY = deckY(gd.bx), axisH = P.hb * 0.5;
    const gun = gunModel(kg, rifled, axisH / GUN_K, false);
    gun.scale.setScalar(GUN_K);
    const len = gun.userData.len * GUN_K;
    const zOut = half(t) * 0.975;
    gun.rotation.y = gd.side > 0 ? -Math.PI / 2 : Math.PI / 2;
    /* la volée sort franchement du sabord : de haut, on compte les pièces en batterie */
    placeGun(gun, gd.bx, dY + axisH, gd.side * (zOut - 0.14 * len), gunSet('gun', gd.side, gd.ulvl, true));
    /* le sabord, noir, avec son mantelet : relevé quand la pièce est en batterie, rabattu sinon */
    const pw = clamp(0.55 + kg * 0.012, 0.6, 1.0), ph = Math.min(P.hb * 0.62, pw * 0.9);
    const port = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.14), portBlack);
    port.position.set(gd.bx, dY + axisH, gd.side * zOut);
    gunSet('port', gd.side, gd.ulvl, true).add(port);
    const hinge = new THREE.Group();
    hinge.position.set(gd.bx, dY + axisH + ph / 2 + 0.02, gd.side * (zOut + 0.09));
    const openA = -gd.side * 1.05;
    hinge.rotation.x = openA;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(pw * 1.06, ph * 1.06, 0.07), lidRed);
    lid.position.set(0, ph * 0.53, 0); lid.castShadow = true; hinge.add(lid);
    const lidO = new THREE.Mesh(new THREE.BoxGeometry(pw * 1.06, ph * 1.06, 0.02), lidOut);
    lidO.position.set(0, ph * 0.53, -gd.side * 0.045); hinge.add(lidO);
    hinge.userData.keep = true;
    tilt.add(hinge);
    parts.lids.push({ h: hinge, lvl: gd.ulvl, hist: true, openA, closedA: Math.PI, open: true });
  }
  /* caronades sur le pont, quand les sabords ne suffisent plus : jusqu'à six pièces par bord */
  {
    const perSide = guns.filter((g) => g.side === 1 && !P.armored).length;
    const need = Math.max(0, BROAD_LVL.length - perSide);
    if (need && !k.noDeckGuns && !k.custom) {
      const nb = Math.min(k.boats || 0, 4), blen = clamp(L * 0.09, 4.5, 6.8);
      const boatXs = []; for (let i = 0; i < nb; i++) boatXs.push((k.boatX ? k.boatX[Math.floor(i / 2) % k.boatX.length] : -0.26 + Math.floor(i / 2) * 0.42) * L);
      const pads = paddles.map((pf) => pf * L), Rb = (k.paddleR || Math.max(3.6, B * 0.38)) + 0.35;
      const cands = (P.armored ? [-0.17, 0.0, -0.1, 0.13, -0.04, 0.17] : [-0.3, 0.26, -0.2, 0.17, -0.38, 0.33, -0.1, 0.08]).map((f) => f * L);
      const ok = (x) => broadXs.every((bx) => Math.abs(bx - x) > 2.4) && boatXs.every((bx) => Math.abs(bx - x) > blen / 2 + 1.4) &&
        pads.every((pad) => Math.abs(x - pad) > Rb + 4.2) && !(P.armored && Math.abs(x - L * 0.075) < 1.6) && Math.abs(x) < L * 0.42;
      const xs = cands.filter(ok).slice(0, need);
      xs.forEach((x, j) => {
        const lvl = BROAD_LVL[perSide + j];
        for (const side of [1, -1]) {
          const t = clamp(x / (L / 2), -0.95, 0.95);
          const axisH = P.hb + 0.4;
          const gun = gunModel(4.5, false, axisH / GUN_K, false);
          gun.scale.setScalar(GUN_K);
          const len = gun.userData.len * GUN_K;
          const zIn = half(t) * (P.tumble ? 1 - P.tumble : 0.965) - 0.25;
          gun.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          placeGun(gun, x, deckY(x) + axisH, side * (zIn + 0.9 - 0.57 * len), gunSet('gun', side, lvl, false));
        }
      });
    }
  }
  /* pièces de chasse : celles du navire, puis une de plus aux crans 1, 3 et 7 */
  {
    const base = sp.chase || 1;
    const BOW_LVL = []; for (let i = 0; i < base; i++) BOW_LVL.push(0); BOW_LVL.push(1, 3, 7);
    const bowHist = guns.filter((g) => !g.side && g.arcs[0][0] !== Math.PI);
    let used = 0;
    for (const gd of bowHist) {
      const lvl = BOW_LVL[Math.min(used, BOW_LVL.length - 1)]; used++;
      if (P.armored) continue;
      const kg = (GUN_TYPES[gd.type] || { kg: 8 }).kg, rifled = /^[ra]/.test(gd.type || ''), axisH = 1.05;
      const gun = gunModel(kg, rifled, axisH, true);
      const set = gunSet('gun', 'bow', lvl, true);
      placeGun(gun, gd.bx, deckY(gd.bx) + axisH, gd.by || 0, set);
      /* les chemins de fer du pivot, en laiton */
      for (const rr_ of [gun.userData.len * 0.48, gun.userData.len * 0.72]) {
        const racer = new THREE.Mesh(new THREE.TorusGeometry(rr_, 0.06, 4, 32), GOLD());
        racer.rotation.x = Math.PI / 2; racer.position.set(gd.bx, deckY(gd.bx) + 0.04, 0);
        gunSet('port', 'bow', lvl, true).add(racer);
      }
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 8), GUNIRON());
      pin.position.set(gd.bx, deckY(gd.bx) + 0.1, 0); gunSet('port', 'bow', lvl, true).add(pin);
    }
    if (P.armored) used = Math.max(used, 1);
    const slots = P.armored ? [[0.375, 1.7], [0.375, -1.7], [0.43, 0]] : [[0.41, 0], [0.37, 1.35], [0.37, -1.35], [0.33, 2.1]];
    let si = 0;
    for (let i = used; !k.custom && i < BOW_LVL.length && si < slots.length; i++, si++) {
      const [fx, z] = slots[si], x = fx * L, axisH = 0.95;
      const gun = gunModel(6, true, axisH / GUN_K, true);
      gun.scale.setScalar(GUN_K);
      placeGun(gun, x, deckY(x) + axisH, z, gunSet('gun', 'bow', BOW_LVL[i], false));
    }
  }
  /* pièces de retraite : une au cran 5, deux de plus au cran 9 (le corsaire : celles qu'il a achetées) */
  {
    const slots = k.custom ? (k.stern ? [[-0.46, 1.1, 0], [-0.46, -1.1, 0]].slice(0, k.stern) : []) : [[-0.47, 0, 5], [-0.445, 1.6, 9], [-0.445, -1.6, 9]];
    for (const [fx, z, lvl] of slots) {
      const x = fx * L, axisH = 0.95;
      const gun = gunModel(5, true, axisH / GUN_K, true);
      gun.scale.setScalar(GUN_K);
      gun.rotation.y = Math.PI;
      placeGun(gun, x, deckY(x) + axisH, z, gunSet('gun', 'stern', lvl, false));
    }
  }
  for (const g of sets.values()) { mergeStatic(g); tilt.add(g); parts.gunSets.push(g); }

  /* embarcations aux bossoirs, sur les hanches */
  const nb = Math.min(k.boats || 0, k.custom ? 6 : 4);
  for (let i = 0; i < nb; i++) {
    const side = i % 2 ? 1 : -1;
    const bx = (k.boatX ? k.boatX[Math.floor(i / 2) % k.boatX.length] : -0.26 + Math.floor(i / 2) * 0.42) * L;
    const t = clamp(bx / (L / 2), -1, 1);
    const blen = clamp(L * 0.09, 4.5, 6.8);
    const boat = boatModel(blen);
    add(boat, bx, topY(bx) + 0.3, side * (half(t) + 1.2));
    for (const dx of [-blen * 0.38, blen * 0.38]) {
      const dav = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 4, 10, Math.PI / 2), IRON());
      dav.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      add(dav, bx + dx, topY(bx) + 0.6, side * (half(t) + 0.3));
    }
  }

  /* bastingages à hamacs : les hamacs roulés de l'équipage, serrés dans leur filet sur la lisse */
  if (k.hammocks && !P.armored) {
    const hm = m3('hammock', () => new THREE.MeshStandardMaterial({ map: hammockTexture(), roughness: 0.92 }));
    const padsH = paddles.map((pf) => pf * L), RbH = (k.paddleR || Math.max(3.6, B * 0.38)) + 0.35 + 3.0;
    const x0 = -0.3 * L, x1 = 0.34 * L, seg = 2.6;
    for (let x = x0; x < x1 - 0.5; x += seg) {
      const xa = x, xb = Math.min(x1, x + seg), xm = (xa + xb) / 2;
      if (padsH.some((pxH) => Math.abs(xm - pxH) < RbH)) continue;
      const t = clamp(xm / (L / 2), -1, 1);
      for (const side of [1, -1]) {
        const g_ = new THREE.BoxGeometry(xb - xa - 0.12, 0.46, 0.5);
        const uvA = g_.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setX(i, uvA.getX(i) * (xb - xa) / 2.6);
        const m = new THREE.Mesh(g_, hm);
        m.castShadow = true; m.receiveShadow = true;
        const dz = Math.atan2(half(clamp(xb / (L / 2), -1, 1)) - half(clamp(xa / (L / 2), -1, 1)), xb - xa);
        m.rotation.y = -side * dz;
        add(m, xm, topY(xm) + 0.3, side * (half(t) * 0.955 - 0.12));
      }
    }
  }
  /* ancres au bossoir, de chaque bord de l'avant : verge, bras, pattes et jas de bois */
  if (L > 25) {
    const ax = L * 0.39, t = clamp(ax / (L / 2), -1, 1), hz = half(t);
    const sz = clamp(L * 0.04, 1.4, 3.2);
    for (const side of [1, -1]) {
      const ag = new THREE.Group();
      const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * sz, 0.11 * sz, sz * 1.6, 6), IRON()); shank.position.y = -sz * 0.8; ag.add(shank);
      const arms = new THREE.Mesh(new THREE.TorusGeometry(sz * 0.55, 0.08 * sz, 5, 12, Math.PI), IRON()); arms.rotation.z = Math.PI; arms.position.y = -sz * 1.25; ag.add(arms);
      for (const sx of [1, -1]) { const fl = new THREE.Mesh(new THREE.ConeGeometry(0.16 * sz, 0.4 * sz, 3), IRON()); fl.position.set(sx * sz * 0.55, -sz * 1.15, 0); fl.rotation.z = sx * 0.5; ag.add(fl); }
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.16 * sz, 0.16 * sz, sz * 1.5), SPARDARK()); stock.position.y = -0.1 * sz; ag.add(stock);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16 * sz, 0.04 * sz, 4, 10), IRON()); ring.position.y = 0.08 * sz; ag.add(ring);
      ag.rotation.set(side * 0.35, 0, -0.55);
      ag.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      if (P.armored) add(ag, ax + 1.2, topY(ax) - 0.5, side * (hz * 0.93 + 0.12));
      else add(ag, ax, topY(ax) - 0.2, side * (hz + 0.28));
      /* le bossoir qui le tient */
      /* le cuirassé n'a pas de bossoir de bois : l'ancre pend à l'écubier, contre la muraille */
      if (!P.armored) {
        const cat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 1.6), SPARDARK()); cat.rotation.y = side * 0.5;
        add(cat, ax + 0.6, topY(ax) + 0.15, side * (hz + 0.3));
      }
    }
  }

  /* ---------- mâture ---------- */
  const masts = k.masts || [];
  const Hm = clamp(L * 0.58 + 4, 16, 44);
  const rig = new THREE.BufferGeometry();
  const lines = [];
  const line = (a, b) => lines.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  const sailMat = sailMaterial('sq'), sailMatFA = sailMaterial('fa');
  parts.sailMat = sailMat;
  const furlMat = m3('furlMat', () => new THREE.MeshStandardMaterial({ map: furlTexture(), roughness: 0.95 }));
  const square = sp.rig === 'square';
  const rake = 0.06;
  const mastTops = [];
  /* le corsaire : on ne grée que la toile achetée, une voile de plus à chaque cran (has : la voile
   * de ce rang est à bord ; le chantier nomme celle de chaque cran, yardSailDesc dans shipyard.js) ;
   * les autres navires portent leur voilure entière */
  const cust = !!k.custom, has = (lev) => !cust || lev < 2 + (k.sailLv || 0);
  /* les bonnettes, de part et d'autre d'une voile carrée, au bout de leurs boute-hors ; les deux
   * d'une même vergue s'établissent ensemble : un seul maillage pour la paire, un pour ses boute-hors */
  const stunsails = (yard, len, sh, lev) => {
    const ws = len * 0.27, hs = sh * 0.9, off = len * 0.475 + ws * 0.47;
    const tr = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
    const g = sqSailGeo(ws * 0.88, ws, hs, hs * 0.15);
    const st = new THREE.Mesh(mergeGeos([[g, tr(0, 0, off)], [g, tr(0, 0, -off)]]), sailMat);
    g.dispose();
    st.position.set(0.3, -0.12, 0);
    st.castShadow = true;
    st.userData.level = lev; st.userData.stun = true;
    const bg = new THREE.CylinderGeometry(0.06, 0.08, ws + 1.4, 5).rotateX(Math.PI / 2);
    const bo = new THREE.Mesh(mergeGeos([[bg, tr(-0.3, 0.14, off - 0.6)], [bg, tr(-0.3, 0.14, 0.6 - off)]]), SPAR());
    bg.dispose();
    bo.castShadow = true;
    st.add(bo);
    yard.add(st);
    parts.sails.push(st);
  };
  /* une voile d'étai, entre deux mâts : le guindant sur l'étai qui descend du mât de l'arrière (a,
   * à la hauteur up) vers celui de l'avant (b, à lo), la bordure vers l'arrière, l'écoute assez en
   * avant du mât pour ne pas toucher le ventre de ses voiles carrées */
  const staysailGeo = (a, b, up, lo) => {
    const U = a.at(a.h * up), D = b.at(b.h * lo), gap = D[0] - U[0];
    const on = (t) => [lerp(D[0], U[0], t), lerp(D[1], U[1], t)];
    const tack = on(0.1), head = on(0.9), yc = lerp(tack[1], head[1], 0.08);
    const clew = [a.x - Math.tan(rake) * (yc - a.base) + gap * 0.25, yc];
    return triSailGeo(tack, head, clew, 0.9);
  };
  masts.forEach((mf, mi) => {
    const x = mf * L, base = deckY(x);
    const last = mi === masts.length - 1, first = mi === 0;
    /* sqM : ce mât porte des vergues ; un artimon purement aurique (k.mizzenFA) n'en a pas */
    const sqM = square && !(k.mizzenFA && last);
    const h = (k.mastH ? (k.mastH[mi] || Hm) : Hm * (masts.length > 2 && last ? 0.86 : masts.length > 1 && first && !square ? 0.94 : 1)) * (k.sailK || 1);
    const mg = new THREE.Group();
    mg.position.set(x, base, 0);
    mg.rotation.z = rake;
    tilt.add(mg);
    const rLow = clamp(L * 0.0055, 0.24, 0.45);
    const low = spar(rLow * 0.8, rLow, h * 0.6, SPAR()); low.position.y = h * 0.3; mg.add(low);
    const topY_ = h * 0.56;
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, B * 0.32), SPARDARK());
    top.position.y = topY_; top.castShadow = true; mg.add(top);
    const tm = spar(rLow * 0.5, rLow * 0.68, h * 0.32, SPAR()); tm.position.y = h * 0.53 + h * 0.16; mg.add(tm);
    const ct = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, B * 0.2), SPARDARK()); ct.position.y = h * 0.82; mg.add(ct);
    const tg = spar(rLow * 0.3, rLow * 0.45, h * 0.22, SPAR()); tg.position.y = h * 0.8 + h * 0.11; mg.add(tg);
    /* le corsaire : pour les contre-cacatois, un mât de flèche au-dessus du perroquet, plus long au
     * grand mât quand il porte encore une voile au-dessus ; la pomme tout en haut */
    const sky = cust && sqM && has(7), moon = sky && mi === 1 && has(11);
    const poleTop = moon ? 1.16 : sky ? 1.1 : 1.02;
    if (sky) { const pole = spar(rLow * 0.17, rLow * 0.29, h * (poleTop - 0.97), SPAR()); pole.position.y = h * (0.97 + poleTop) / 2; mg.add(pole); }
    const truck = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), GOLD()); truck.position.y = cust ? h * poleTop + 0.1 : h * 0.915; mg.add(truck);
    /* la vigie du corsaire : un nid de pie au grand mât, avec sa longue-vue au deuxième cran ; un
     * second au mât de misaine au troisième */
    if (k.vigie && (mi === (masts.length >= 2 ? 1 : 0) || (k.vigie >= 3 && mi === 0 && masts.length >= 2))) mg.add(crowsNest(h * 0.835, rLow, k.vigie >= 2));
    /* sommets en coordonnées du navire (mât incliné) */
    const at = (y) => [x - Math.sin(rake) * y, base + Math.cos(rake) * y, 0];
    mastTops.push({ x, base, h, at });
    /* haubans vers les porte-haubans, galhaubans vers l'arrière */
    const t = clamp(x / (L / 2), -1, 1), hb = half(t);
    for (const s of [1, -1]) {
      const feet = [];
      for (let i = 0; i < 4; i++) { const tp = at(topY_); tp[2] = s * B * 0.15; const ft = [x - 1.6 + i * 0.9, topY(x) - 0.2, s * hb * 1.02 + s * 0.35]; line(tp, ft); feet.push([tp, ft]); }
      /* les enfléchures : les échelons de corde entre les haubans, jusqu'à la hune */
      const shL = Math.hypot(feet[0][0][1] - feet[0][1][1], feet[0][0][2] - feet[0][1][2]);
      for (let f = 0.05; f < 0.93; f += 0.5 / shL) {
        for (let i = 0; i < 3; i++) {
          const pa = feet[i], pb = feet[i + 1];
          line([lerp(pa[1][0], pa[0][0], f), lerp(pa[1][1], pa[0][1], f), lerp(pa[1][2], pa[0][2], f)], [lerp(pb[1][0], pb[0][0], f), lerp(pb[1][1], pb[0][1], f), lerp(pb[1][2], pb[0][2], f)]);
        }
      }
      /* le porte-haubans le long de la muraille, ses caps de mouton et ses cadènes */
      const ch = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.42), SPARDARK());
      add(ch, x - 0.25, topY(x) - 0.32, s * (hb * 1.02 + 0.2));
      for (const [, ft] of feet) {
        const de = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 8), SPARDARK()); de.rotation.x = Math.PI / 2; de.rotation.z = Math.PI / 2;
        add(de, ft[0], ft[1] - 0.05, ft[2]);
        const cp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.04), GUNIRON());
        add(cp, ft[0], ft[1] - 0.75, s * (hb * 1.0 + 0.02));
      }
      for (let i = 0; i < 2; i++) { const tp = at(h * 0.82); tp[2] = s * B * 0.09; line(tp, [x - 0.6 + i * 0.5, base + topY_ + 0.1, s * B * 0.15]); }
      const tb = at(h * 0.86); line(tb, [x - 5.5, topY(x - 5.5) - 0.1, s * half(clamp((x - 5.5) / (L / 2), -1, 1)) * 1.02]);
    }
    if (sqM) {
      /* vergues et voiles carrées ; la brigantine sur le dernier mât des trois-mâts */
      /* un brick cuirassé ne porte que basse voile, hunier et perroquet (k.sqLevels) */
      const SQ = [[0.42, 1.95, 0.0], [0.63, 1.5, 0.42], [0.79, 1.1, 0.64], [0.92, 0.76, 0.8]];
      /* le corsaire : au-dessus des cacatois, les contre-cacatois, et au grand mât une voile encore */
      if (cust) SQ.push([1.02, 0.5, 0.92], [1.09, 0.34, 1.02]);
      const levels = SQ.slice(0, k.sqLevels || SQ.length);
      /* le rang de chaque voile carrée (le hunier d'abord), et de ses bonnettes ; au corsaire, des
       * bonnettes au mât de misaine et au grand mât seulement : on n'en établissait pas à l'artimon */
      const SQLEV = cust ? [1, 0, 2, 3, 7, 11] : [1, 0, 2, 3], STUN = cust ? [6, 5, 8, 10] : [5, 4];
      const stunOK = !k.noSail && k.stunsails !== false && !(cust && mi > 1);
      levels.forEach(([hy, wl, prevHy], li) => {
        if (!has(SQLEV[li]) || (li === 4 && !sky) || (li === 5 && !moon)) return;
        const yard = new THREE.Group();
        yard.position.set(0, h * hy, 0);
        const len = B * wl * (k.sailK || 1);
        const ys = spar(0.15, 0.15, len, SPAR(), 6); ys.rotation.x = Math.PI / 2; yard.add(ys);
        const lowY = li === 0 ? Math.max(3.2, h * 0.08) : h * (prevHy + 0.01);
        const sh = h * hy - lowY;
        const wBot = li === 0 ? len * 1.06 : B * levels[li - 1][1] * 0.98;
        const sail = new THREE.Mesh(sqSailGeo(len * 0.95, wBot, sh, sh * 0.24), sailMat);
        sail.position.set(0.35, -0.15, 0);
        sail.castShadow = true;
        sail.userData.level = SQLEV[li];
        yard.add(sail);
        const furl = new THREE.Mesh(furlGeo(len * 0.9, clamp(sh * 0.05, 0.3, 0.6)), furlMat);
        furl.rotation.x = Math.PI / 2; furl.position.set(0.15, -0.32, 0); furl.visible = false; furl.castShadow = true;
        yard.add(furl);
        sail.userData.furl = furl;
        mg.add(yard);
        parts.yards.push(yard);
        parts.sails.push(sail);
        /* les bonnettes, de part et d'autre du hunier (cran 8 de voilure) et de la basse voile (cran 10),
         * au bout de leurs boute-hors : on ne les établit que par beau temps et grand largue, ici quand
         * le navire est poussé au plus loin ; au corsaire, aussi aux perroquets et aux cacatois */
        if (li < STUN.length && stunOK && has(STUN[li])) stunsails(yard, len, sh, STUN[li]);
        /* balancines et écoutes, pour la lecture */
        const ya = at(h * hy);
        for (const s of [1, -1]) { const tip = [ya[0], ya[1], s * len / 2]; line(at(h * Math.min(hy + 0.07, poleTop)), tip); }
      });
    }
    /* goélette à hunier : au mât de misaine, un hunier carré (cran 6 de voilure), puis une misaine
     * carrée (cran 10) ; serrés sur leur vergue tant qu'on ne les établit pas. Au corsaire, le cotre
     * aussi, et plus haut un perroquet, puis un cacatois ; des bonnettes au hunier, à la basse voile
     * et au perroquet */
    if (!square && mi === 0 && !k.noSail && (masts.length > 1 || cust) && k.foreSquare !== false) {
      const FS = [[0.7, 1.2, 0.5, 3], [0.48, 1.55, 0.12, 5]], FSTUN = [7, 9, 10];
      if (cust) FS.push([0.85, 0.85, 0.71, 6], [0.97, 0.6, 0.86, 11]);
      FS.forEach(([hy, wl, lowHy, lev], fi) => {
        if (!has(lev)) return;
        const yard = new THREE.Group();
        yard.position.set(0, h * hy, 0);
        const len = B * wl * (k.sailK || 1);
        const ys = spar(0.12, 0.12, len, SPAR(), 6); ys.rotation.x = Math.PI / 2; yard.add(ys);
        const lowY = Math.max(3.2, h * lowHy), sh = h * hy - lowY;
        const sail = new THREE.Mesh(sqSailGeo(len * 0.95, len * 1.02, sh, sh * 0.22), sailMat);
        sail.position.set(0.35, -0.15, 0); sail.castShadow = true; sail.userData.level = lev;
        yard.add(sail);
        const furl = new THREE.Mesh(furlGeo(len * 0.9, clamp(sh * 0.05, 0.25, 0.5)), furlMat);
        furl.rotation.x = Math.PI / 2; furl.position.set(0.15, -0.3, 0); furl.visible = false; furl.castShadow = true;
        yard.add(furl);
        sail.userData.furl = furl;
        mg.add(yard);
        parts.yards.push(yard);
        parts.sails.push(sail);
        const ya = at(h * hy);
        for (const s of [1, -1]) line(at(h * Math.min(hy + 0.06, poleTop)), [ya[0], ya[1], s * len / 2]);
        if (cust && fi < FSTUN.length && has(FSTUN[fi])) stunsails(yard, len, sh, FSTUN[fi]);
      });
    }
    if (!sqM || (last && masts.length > 1 && square)) {
      /* voile aurique (et flèche) : bôme et corne */
      /* la bôme ne grandit pas avec la mâture : elle viendrait buter sur le mât suivant */
      const nextGap = mi < masts.length - 1 ? (mf - masts[mi + 1]) * L : L * 0.2;
      const foot = clamp(nextGap * 0.95, 5, L * 0.3);
      const gl = foot * 0.72, rise = foot * 0.22;
      const gaff = new THREE.Group();
      const yFoot = 2.4, yThroat = h * (sqM ? 0.5 : 0.56);
      const sail = k.noSail ? null : new THREE.Mesh(gaffSailGeo(yFoot, yThroat, foot, gl, rise, 1.1), sailMatFA);
      if (sail) { sail.castShadow = true; sail.userData.level = 0; sail.userData.gaff = true; gaff.add(sail); }
      const boom = spar(0.12, 0.18, foot, SPAR(), 6); boom.rotation.z = Math.PI / 2; boom.position.set(-foot / 2, yFoot, 0); gaff.add(boom);
      const gsp = spar(0.1, 0.14, gl * 1.04, SPAR(), 6); gsp.position.set(-gl / 2, yThroat + rise / 2, 0); gsp.rotation.z = Math.PI / 2 + Math.atan2(rise, gl); gaff.add(gsp);
      /* la flèche ; au corsaire, sur une goélette, le hunier carré prend la place de celle du mât de misaine */
      if (!sqM && !k.noSail && has(2) && !(cust && mi === 0 && masts.length > 1 && has(3))) {
        const tops = new THREE.Mesh(triSailGeo([0, yThroat + 0.4], [-gl * 0.95, yThroat + rise + 0.2], [0, h * 0.88], 0.6), sailMatFA);
        tops.userData.level = 2; tops.userData.tri = true; tops.castShadow = true;
        gaff.add(tops);
        parts.sails.push(tops);
      }
      /* mâchoires de corne et de bôme, drisse de pic */
      for (const yy of [yFoot, yThroat]) { const jaw = new THREE.Mesh(new THREE.TorusGeometry(rLow * 0.95, 0.07, 4, 10), SPARDARK()); jaw.rotation.x = Math.PI / 2; jaw.position.y = yy; gaff.add(jaw); }
      if (k.noSail) {
        /* voile carguée : la brigantine serrée contre la corne et le long du mât */
        const fb = new THREE.Mesh(furlGeo(gl * 0.82, 0.42), furlMat);
        fb.position.set(-gl * 0.45, yThroat + rise * 0.45 - 0.5, 0); fb.rotation.z = Math.PI / 2 + Math.atan2(rise, gl);
        fb.castShadow = true; gaff.add(fb);
        const fm_ = new THREE.Mesh(furlGeo((yThroat - yFoot) * 0.8, 0.36), furlMat);
        fm_.position.set(-0.6, (yThroat + yFoot) / 2 + 0.6, 0); gaff.add(fm_);
        /* le pic de corne, où flotte le pavillon */
        const px_ = -gl * 1.02, py_ = yThroat + rise * 1.02;
        parts.peak = [x + px_ * Math.cos(rake) - py_ * Math.sin(rake), base + px_ * Math.sin(rake) + py_ * Math.cos(rake)];
        line(at(h * 0.9), parts.peak.concat([0]));
        line(at(yThroat + 0.3), [x - foot, base + yFoot + 0.2, 0]);
        /* les palans de garde de la corne, du pic vers chaque bord du couronnement,
         * et l'écoute de la bôme sur le tableau */
        const tx_ = Math.max(-L / 2 + 0.6, x - foot * 0.85);
        for (const s_ of [1, -1]) line(parts.peak.concat([0]), [tx_, topY(tx_) + 0.1, s_ * half(clamp(tx_ / (L / 2), -1, 1)) * 0.9]);
        line([x - foot + 0.4, base + yFoot, 0], [-L / 2 + 0.5, topY(-L / 2 + 0.5) + 0.05, 0]);
      }
      mg.add(gaff);
      if (!k.noSail) { parts.gaffs.push(gaff); parts.sails.push(sail); }
    }
  });
  /* mâts brisés : le tronçon, sa cassure en échardes, les cercles de fer, l'étambrai au pied */
  const rStump = clamp(L * 0.0058, 0.24, 0.48);
  const brokenMast = (x, hh, r, seed) => {
    const base = deckY(x);
    const st = spar(r * 0.96, r, hh, SPAR(), 10); st.position.set(x, base + hh / 2, 0); tilt.add(st);
    const rr = makeRng(seed);
    /* la cassure : des échardes de longueurs inégales, penchées dans le sens où le mât est tombé */
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + rr() * 0.4, d = r * (0.25 + rr() * 0.5), len = 0.4 + rr() * (i % 3 === 0 ? 1.8 : 0.9);
      const jag = new THREE.Mesh(new THREE.ConeGeometry(r * (0.18 + rr() * 0.16), len, 3), i % 2 ? SPAR() : RAILWOOD());
      jag.position.set(x + Math.cos(a) * d, base + hh + len * 0.42, Math.sin(a) * d);
      jag.rotation.set(rr.sym(0.25), rr() * 3, -0.2 - rr() * 0.35);
      jag.castShadow = true; tilt.add(jag);
    }
    for (const f of [0.3, 0.62, 0.9]) { const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.03, 0.06, 4, 14), IRON()); band.rotation.x = Math.PI / 2; band.position.set(x, base + hh * f, 0); tilt.add(band); }
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.5, r * 1.9, 0.4, 12), TARRED()); coat.position.set(x, base + 0.22, 0); tilt.add(coat);
    return base + hh;
  };
  (k.stumps || []).forEach((sf, i) => {
    const r = rStump * (i === 0 ? 1 : 0.95);
    const top = brokenMast(sf * L, k.stumpH || Hm * 0.24, r, 31 + i * 7);
    /* l'étai de l'artimon vient maintenant se capeler sur le tronçon */
    const mt = mastTops[mastTops.length - 1];
    if (mt && mt.x < sf * L) { line(mt.at(mt.h * 0.56), [sf * L + 0.3, top - 0.4, 0]); line(mt.at(mt.h * 0.82), [sf * L + 0.3, top - 0.8, 0]); }
  });
  /* le mât de fortune de l'avant : sur le tronçon du mât de misaine, une simple perche jumelée,
   * liée par des rousturés, avec une vergue courte pour les signaux. On n'y établit plus de voile. */
  let jury = null;
  if (k.jury !== undefined) {
    const x = k.jury * L, base = deckY(x), Hj = k.juryH || Hm * 0.32, r = rStump;
    brokenMast(x, 3.4, r, 97);
    const pole = spar(r * 0.42, r * 0.66, Hj, SPAR(), 8); pole.position.set(x - r * 1.35, base + Hj / 2, 0); tilt.add(pole);
    for (const yy of [0.7, 1.6, 2.5, 3.2]) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(r * 1.45, 0.07, 5, 14), TARRED());
      w.rotation.x = Math.PI / 2; w.scale.set(1.25, 0.8, 1); w.position.set(x - r * 0.65, base + yy, 0); tilt.add(w);
    }
    const yard = spar(0.11, 0.11, B * 0.8, SPAR(), 6); yard.rotation.x = Math.PI / 2; yard.position.set(x - r * 1.35, base + Hj * 0.78, 0); tilt.add(yard);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 4), GOLD()); cap.position.set(x - r * 1.35, base + Hj + 0.1, 0); tilt.add(cap);
    jury = { x: x - r * 1.35, base, h: Hj, at: (y) => [x - r * 1.35, base + y, 0] };
    const t = clamp(x / (L / 2), -1, 1), hb = half(t);
    for (const s_ of [1, -1]) {
      for (let i = 0; i < 2; i++) line([x - r * 1.35, base + Hj * 0.86, s_ * 0.2], [x - 1.4 + i * 1.6, topY(x) - 0.1, s_ * hb * 1.02]);
      line([x - r * 1.35, base + Hj * 0.78, s_ * B * 0.4], [x - r * 1.35, base + Hj * 0.97, 0]);
      /* drisses de signaux qui pendent de la vergue */
      line([x - r * 1.35, base + Hj * 0.78, s_ * B * 0.38], [x - 2.5, topY(x - 2.5) + 0.2, s_ * hb * 0.8]);
    }
    line([x - r * 1.35, base + Hj * 0.9, 0], [x - 7, deckY(x - 7) + 0.4, 0]);
  }
  /* beaupré et bâton de foc seuls, quand il n'y a plus qu'un mât de fortune à l'avant :
   * l'étai de fortune y descend, les focs ne s'établissent plus */
  if (k.bowsprit && jury) {
    const bl = k.bowsprit * L + 4;
    const bx0 = L / 2 - 1.5, by0 = topY(L / 2) - 0.3, ang = 0.2;
    const bs = spar(0.2, 0.46, bl, SPAR(), 10);
    bs.rotation.z = -Math.PI / 2 + ang;
    bs.position.set(bx0 + Math.cos(ang) * bl / 2, by0 + Math.sin(ang) * bl / 2, 0);
    tilt.add(bs);
    const jl = bl * 0.7, ang2 = ang + 0.04;
    const jb = spar(0.1, 0.2, jl, SPAR(), 8);
    jb.rotation.z = -Math.PI / 2 + ang2;
    const j0 = [bx0 + Math.cos(ang) * bl * 0.62, by0 + Math.sin(ang) * bl * 0.62 + 0.42];
    jb.position.set(j0[0] + Math.cos(ang2) * jl / 2, j0[1] + Math.sin(ang2) * jl / 2, 0);
    tilt.add(jb);
    const tip = [bx0 + Math.cos(ang) * bl, by0 + Math.sin(ang) * bl], tip2 = [j0[0] + Math.cos(ang2) * jl, j0[1] + Math.sin(ang2) * jl];
    const capB = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), SPARDARK()); capB.position.set(tip[0], tip[1] + 0.2, 0); capB.rotation.z = ang; tilt.add(capB);
    line(jury.at(jury.h * 0.97), [tip2[0], tip2[1], 0]);
    line(jury.at(jury.h * 0.86), [tip[0], tip[1], 0]);
    line([tip[0], tip[1], 0], [L / 2, 0.8, 0]);
    line([tip2[0], tip2[1], 0], [tip[0] + 0.5, tip[1] - 2.2, 0]);
    line([tip[0] + 0.5, tip[1] - 2.2, 0], [L / 2 - 0.2, 0.9, 0]);
    for (const s_ of [1, -1]) line([tip[0] - 0.5, tip[1], 0], [L / 2 - 3, topY(L / 2 - 3), s_ * half(clamp((L / 2 - 3) / (L / 2), -1, 1))]);
  }
  /* beaupré, bâton de foc et focs */
  if (k.bowsprit && !jury && masts.length && masts[0] > 0.05) {
    const bl = k.bowsprit * L + 4;
    const bx0 = L / 2 - 1.5, by0 = topY(L / 2) - 0.3, ang = 0.2;
    const bs = spar(0.18, 0.42, bl, SPAR());
    bs.rotation.z = -Math.PI / 2 + ang;
    bs.position.set(bx0 + Math.cos(ang) * bl / 2, by0 + Math.sin(ang) * bl / 2, 0);
    tilt.add(bs);
    const tip = [bx0 + Math.cos(ang) * bl, by0 + Math.sin(ang) * bl];
    const fm = mastTops[0];
    /* [hauteur au mât de misaine, amure le long du beaupré, rang, place] : la trinquette ; le grand foc
     * à l'établissement suivant ; le clin-foc, le plus en avant, plus tard sur une goélette ; au
     * corsaire, un foc de plus entre la trinquette et le grand foc. Les étais sont là, même sans leur foc */
    const heads = [[0.5, 0.15, 0, 0], [0.68, 0.6, 1, 1], [0.84, 1, square ? 2 : 4, 2]];
    if (cust) heads.splice(1, 0, [0.59, 0.38, square ? 4 : 8, 0.5]);
    heads.forEach(([hy, along, lev, ci]) => {
      const tack = [lerp(L / 2 - 0.5, tip[0], along), lerp(topY(L / 2), tip[1], along)];
      const head = fm.at(fm.h * hy);
      line([tack[0], tack[1], 0], head);
      if (!has(lev)) return;
      const clewX = lerp(tack[0], head[0], 0.62) - 3 - ci, clewY = tack[1] + 1.2 + ci * 0.6;
      const jib = new THREE.Mesh(triSailGeo([tack[0], tack[1] + 0.3], [head[0] + 0.3, head[1] - 0.6], [clewX, clewY], 1.1), sailMatFA);
      jib.userData.level = lev; jib.userData.jib = true; jib.castShadow = true;
      const jg = new THREE.Group(); jg.add(jib); tilt.add(jg);
      parts.jibs.push(jg); parts.sails.push(jib);
    });
    /* sous-barbe et martingale */
    line([tip[0], tip[1], 0], [L / 2, 0.8, 0]);
  }
  /* étais d'un mât à l'autre ; au corsaire, sur un navire à voiles carrées, un étai de plus en haut,
   * et les voiles d'étai : sur l'étai de hune au rang 4, sur l'étai du haut au rang 9 */
  const stays = { 4: [], 9: [] };
  for (let i = 1; i < mastTops.length; i++) {
    const a = mastTops[i], b = mastTops[i - 1];
    line(a.at(a.h * 0.56), [b.x + 1, b.base + 1.2, 0]);
    line(a.at(a.h * 0.82), b.at(b.h * 0.56));
    if (cust && square && !k.noSail) {
      line(a.at(a.h), b.at(b.h * 0.82));
      if (has(4)) stays[4].push(staysailGeo(a, b, 0.82, 0.56));
      if (has(9)) stays[9].push(staysailGeo(a, b, 1, 0.82));
    }
  }
  /* celles d'un même rang s'établissent ensemble : un seul maillage */
  for (const lev of [4, 9]) {
    if (!stays[lev].length) continue;
    const I = new THREE.Matrix4();
    const ss = new THREE.Mesh(mergeGeos(stays[lev].map((g) => [g, I])), sailMatFA);
    for (const g of stays[lev]) g.dispose();
    ss.userData.level = lev; ss.userData.jib = true; ss.castShadow = true;
    const jg = new THREE.Group(); jg.add(ss); tilt.add(jg);
    parts.jibs.push(jg); parts.sails.push(ss);
  }
  /* haubans de cheminée */
  for (const [fx, fy] of parts.smoke) for (const s of [1, -1]) line([fx + 0.4, fy - 1, 0], [fx + 2.5, deckY(fx) + 0.2, s * B * 0.35]);
  rig.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  const rigging = new THREE.LineSegments(rig, ROPE());
  tilt.add(rigging);

  /* pavillon à la corne ou au mât de pavillon */
  const fx = -L / 2 + 0.8;
  if (!parts.peak) { const pole = spar(0.06, 0.09, 7, SPARDARK(), 5); pole.position.set(fx, topY(fx) + 3.5, 0); tilt.add(pole); }
  const fgeo = new THREE.PlaneGeometry(4.4, 2.9, 8, 3);
  fgeo.translate(-2.2, 0, 0);
  const flagMesh = new THREE.Mesh(fgeo, new THREE.MeshStandardMaterial({ map: flagTex('us'), side: THREE.DoubleSide, roughness: 0.85 }));
  flagMesh.castShadow = true;
  const flag = new THREE.Group();
  if (parts.peak) flag.position.set(parts.peak[0], parts.peak[1] - 1.5, 0);
  else flag.position.set(fx, topY(fx) + 5.6, 0);
  flag.add(flagMesh);
  tilt.add(flag);
  parts.flag = flag; parts.flagMesh = flagMesh; parts.flagBase = fgeo.attributes.position.array.slice(); parts.flagKind = 'us';
  flag.visible = false;
  /* fanaux de route */
  parts.lights = [[L * 0.46, topY(L * 0.46) + 1], [-L * 0.48, topY(-L * 0.48) + 1.5]];
  /* l'équipage : timonier, officier, vigie, servants des pièces, en vareuse et pantalon blanc */
  {
    const coat = m3('crewCoat2', () => new THREE.MeshStandardMaterial({ color: 0x1d2638, roughness: 0.9 }));
    const trouser = m3('crewTrous', () => new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.9 }));
    const skin = m3('crewSkin', () => new THREE.MeshStandardMaterial({ color: 0xc89a74, roughness: 0.8 }));
    const capM = m3('crewCap', () => new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.8 }));
    const rr = makeRng((sp.id || 'x').length * 977 + Math.round(L * 13));
    const spots = [[-L * 0.42, 0.9], [-L * 0.38, B * 0.18], [L * 0.4, 0]];
    for (const gd of guns) if (gd.side && !P.armored && rr() < 0.7) spots.push([gd.bx + rr.sym(0.6), gd.side * (half(clamp(gd.bx / (L / 2), -1, 1)) - 2.6)]);
    const n = Math.max(4, Math.round(L / 6));
    for (let i = spots.length; i < n; i++) spots.push([rr.range(-0.32, 0.3) * L, (rr() < 0.5 ? -1 : 1) * rr.range(0.1, 0.3) * B]);
    for (const [x, z] of spots) {
      const hx = half(clamp(x / (L / 2), -1, 1));
      const man = crewMan(rr, coat, trouser, skin, capM);
      add(man, x, deckY(x), clamp(z, -hx + 0.6, hx - 0.6));
    }
    /* le corsaire : les servants des pièces (canonniers), et les abordeurs en chemise rouge, le
     * sabre au poing, le long des pavois : on voit grossir l'équipage à chaque cran */
    if (k.custom) {
      const red = m3('crewRed', () => new THREE.MeshStandardMaterial({ color: 0x9a2a20, roughness: 0.85 }));
      const steel = m3('cutlass', () => new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.8, roughness: 0.3 }));
      const more = [];
      if (k.gunners) for (const gd of guns) {
        if (!gd.side) continue;
        const zg = gd.side * (half(clamp(gd.bx / (L / 2), -1, 1)) - 2.1);
        more.push([gd.bx + 0.9, zg, false]);
        if (k.gunners >= 3) more.push([gd.bx - 0.9, zg, false]);
      }
      for (let i = 0; i < 3 * (k.boarders || 0); i++) more.push([rr.range(-0.3, 0.3) * L, (i % 2 ? 1 : -1) * 0.7, true]);
      for (const [x, zz, armed] of more) {
        const hx = half(clamp(x / (L / 2), -1, 1));
        const man = crewMan(rr, armed ? red : coat, trouser, skin, capM);
        if (armed) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.07), steel); bl.position.set(0.22, 1.25, 0.3); bl.rotation.x = -0.5; man.add(bl); }
        const z = armed ? zz * (hx - 1.0) : zz;
        add(man, x, deckY(x), clamp(z, -hx + 0.6, hx - 0.6));
      }
    }
  }
  root.userData.parts = parts;
  const moving = new Set([...parts.yards, ...parts.gaffs, ...parts.jibs, flag, ...parts.wheelSpin, ...parts.gunSets, ...parts.lids.map((l) => l.h)]);
  mergeStatic(tilt, moving);
  paletteMerge(tilt, moving);
  return root;
}

/* le pavillon ondule */
function waveFlag(P, t, theta) {
  const pos = P.flagMesh.geometry.attributes.position, base = P.flagBase;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1];
    const d = -x / 4.4;
    pos.setZ(i, Math.sin(d * 5 - t * 9) * 0.45 * d + Math.sin(d * 9 - t * 13 + y) * 0.12 * d);
  }
  pos.needsUpdate = true;
  P.flagMesh.geometry.computeVertexNormals();
}

/* ---------- la palette ----------
 * Après la fusion par matière, il restait une trentaine de maillages par navire : autant de
 * matières unies (bois, fer, laiton, peintures, toile serrée, chairs...) qui ne diffèrent que par
 * leur couleur, leur rugosité, leur éclat métallique et leur lueur. On les fond en un seul maillage
 * dont chaque sommet porte ces quatre valeurs, transmises sans interpolation (flat) : la lumière
 * se calcule avec les mêmes nombres qu'avant, pour un seul appel de dessin au lieu de trente. */
const PALETTE_MATS = new Map();
function paletteMat(side, flat) {
  const key = side + '|' + flat;
  let m = PALETTE_MATS.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({ vertexColors: true, side, flatShading: flat, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (sh, r) => {
    const F = r && r.capabilities && r.capabilities.isWebGL2 ? 'flat ' : '';
    sh.vertexShader = `attribute vec2 pRM;\nattribute vec3 pEm;\n${F}varying vec2 vPRM;\n${F}varying vec3 vPEm;\n` + sh.vertexShader
      .replace('#include <color_pars_vertex>', F + 'varying vec3 vColor;')
      .replace('#include <color_vertex>', '#include <color_vertex>\n  vPRM = pRM; vPEm = pEm;');
    sh.fragmentShader = `${F}varying vec2 vPRM;\n${F}varying vec3 vPEm;\n` + sh.fragmentShader
      .replace('#include <color_pars_fragment>', F + 'varying vec3 vColor;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vPRM.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vPRM.y;')
      .replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = vPEm;');
  };
  m.customProgramCacheKey = () => 'shipPalette';
  PALETTE_MATS.set(key, m);
  return m;
}
/* une matière unie, sans image ni réglage particulier, qui ne change jamais en cours de jeu */
function plainMat(m) {
  return !!m && m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && !m.map && !m.normalMap && !m.roughnessMap && !m.metalnessMap &&
    !m.emissiveMap && !m.aoMap && !m.lightMap && !m.bumpMap && !m.alphaMap && !m.envMap && !m.displacementMap && !m.vertexColors &&
    !m.transparent && m.opacity === 1 && m.alphaTest === 0 && !m.wireframe && !m.polygonOffset && m.depthWrite && m.depthTest && m.colorWrite &&
    m.blending === THREE.NormalBlending && m.envMapIntensity === 1 && m.fog && m.toneMapped && !m.dithering && m.shadowSide === null &&
    !m.clippingPlanes && !m.stencilWrite && !m.forceSinglePass && Object.keys(m.defines || {}).join() === 'STANDARD' &&
    (m.userData.cloud ? !!m.userData.cloudOnly : m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile);
}
/* fond une liste [géométrie, matrice, matière] (dans l'ordre des matières, comme le moteur les
 * dessinait) en une géométrie de palette */
function paletteGeo(list) {
  list.sort((a, b) => a[2].id - b[2].id || a[3] - b[3]);
  let nv = 0, ni = 0;
  for (const [g] of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), rm = new Float32Array(nv * 2), em = new Float32Array(nv * 3);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const nm = new THREE.Matrix3(), v = new THREE.Vector3(), I = new THREE.Matrix4();
  let vo = 0, io = 0;
  for (const [g, m, mat] of list) {
    const n = g.attributes.position.count, P = g.attributes.position, N = g.attributes.normal;
    const ident = m.equals(I);
    nm.getNormalMatrix(m);
    const flip = m.determinant() < 0;
    const e = mat.emissive.clone().multiplyScalar(mat.emissiveIntensity);
    for (let i = 0; i < n; i++) {
      const o = vo + i;
      if (ident) { pos[o * 3] = P.getX(i); pos[o * 3 + 1] = P.getY(i); pos[o * 3 + 2] = P.getZ(i); nor[o * 3] = N.getX(i); nor[o * 3 + 1] = N.getY(i); nor[o * 3 + 2] = N.getZ(i); }
      else {
        v.fromBufferAttribute(P, i).applyMatrix4(m); pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
      }
      col[o * 3] = mat.color.r; col[o * 3 + 1] = mat.color.g; col[o * 3 + 2] = mat.color.b;
      rm[o * 2] = mat.roughness; rm[o * 2 + 1] = mat.metalness;
      em[o * 3] = e.r; em[o * 3 + 1] = e.g; em[o * 3 + 2] = e.b;
    }
    const src = g.index ? g.index.array : null, cnt = src ? src.length : n;
    for (let t = 0; t + 2 < cnt; t += 3) {
      const a0 = src ? src[t] : t, a1 = src ? src[t + 1] : t + 1, a2 = src ? src[t + 2] : t + 2;
      idx[io++] = vo + a0;
      if (flip) { idx[io++] = vo + a2; idx[io++] = vo + a1; } else { idx[io++] = vo + a1; idx[io++] = vo + a2; }
    }
    vo += n;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('pRM', new THREE.BufferAttribute(rm, 2));
  geo.setAttribute('pEm', new THREE.BufferAttribute(em, 3));
  geo.setIndex(new THREE.BufferAttribute(idx.subarray(0, io), 1));
  geo.computeBoundingSphere();
  return geo;
}
/* la palette des pièces fixes d'un navire (celles qui bougent restent à part) */
function paletteMerge(root, keep) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  let k = 0;
  root.traverse((o) => {
    if (!o.isMesh || o === root || o.isInstancedMesh || Array.isArray(o.material) || !o.visible || !plainMat(o.material)) return;
    for (let a = o; a && a !== root; a = a.parent) if ((keep && keep.has(a)) || a.userData.keep || !a.visible) return;
    const g = o.geometry;
    if (!g.attributes.position || !g.attributes.normal || g.attributes.color || (g.morphAttributes && Object.keys(g.morphAttributes).length)) return;
    const key = o.material.side + '|' + o.material.flatShading + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + o.renderOrder;
    let e = groups.get(key);
    if (!e) groups.set(key, (e = { o, list: [], meshes: [] }));
    e.list.push([g, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), o.material, k++]);
    e.meshes.push(o);
  });
  for (const e of groups.values()) {
    if (e.meshes.length < 2) continue;
    const m = new THREE.Mesh(paletteGeo(e.list), paletteMat(e.o.material.side, e.o.material.flatShading));
    m.castShadow = e.o.castShadow; m.receiveShadow = e.o.receiveShadow; m.renderOrder = e.o.renderOrder;
    for (const x of e.meshes) x.parent.remove(x);
    root.add(m);
  }
}

/* ---------- batteries ----------
 * Les pièces d'un même bord, montrées au même moment, sont fondues en un seul maillage par
 * matière : un appel de dessin par matière au lieu d'un par cran et par pièce. Les jeux de pièces
 * d'origine restent en réserve, cachés, et l'on refond quand les crans changent. Les mantelets
 * des sabords sont fondus de même une fois immobiles ; pendant qu'ils s'ouvrent, on montre les vrais. */
function bakeParts(parts, withRoot) {
  const g = new THREE.Group(), groups = new Map();
  for (const part of parts) part.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    for (let a = o; a && a !== part; a = a.parent) if (!a.visible) return;
    /* la place de la pièce dans son jeu (withRoot : et la place du jeu lui-même) */
    const m = new THREE.Matrix4();
    for (let a = o; a; a = a.parent) {
      if (a === part && !withRoot) break;
      a.updateMatrix(); m.premultiply(a.matrix);
      if (a === part) break;
    }
    const geo = o.geometry, mt = o.material;
    /* les matières unies vont à la palette ; les autres, une par une */
    const pal = plainMat(mt) && geo.attributes.normal && !geo.attributes.color;
    const key = (pal ? 'pal|' + mt.side + '|' + mt.flatShading : mt.uuid + '|' + Object.keys(geo.attributes).sort().join(',')) + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + o.renderOrder;
    let e = groups.get(key);
    if (!e) groups.set(key, (e = { o, pal, list: [] }));
    e.list.push([geo, m, mt, e.list.length]);
  });
  for (const e of groups.values()) {
    const mesh = e.pal ? new THREE.Mesh(paletteGeo(e.list), paletteMat(e.o.material.side, e.o.material.flatShading)) : new THREE.Mesh(mergeGeos(e.list), e.o.material);
    mesh.castShadow = e.o.castShadow; mesh.receiveShadow = e.o.receiveShadow; mesh.renderOrder = e.o.renderOrder;
    g.add(mesh);
  }
  return g;
}
function dropBaked(P, g) {
  if (!g) return;
  P.tilt.remove(g);
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}
/* les pièces visibles, par bord (le recul est le même pour tout un bord), et les sabords à part */
function shipBatteries(P) {
  for (const b of P.batts || []) dropBaked(P, b);
  P.batts = [];
  const by = new Map();
  for (const g of P.gunSets) {
    if (!g.visible) continue;
    const u = g.userData, k = u.kind === 'gun' ? 'gun|' + u.side : 'port';
    let e = by.get(k);
    if (!e) by.set(k, (e = []));
    e.push(g);
  }
  for (const list of by.values()) {
    const b = bakeParts(list, false);
    for (const g of list) g.visible = false;
    b.userData = { kind: list[0].userData.kind, side: list[0].userData.side };
    P.tilt.add(b);
    P.batts.push(b);
  }
}
/* les mantelets : fondus (immobiles) ou chacun sur sa charnière (pendant qu'ils tournent) */
function shipLids(P, still) {
  dropBaked(P, P.lidBatt);
  P.lidBatt = null;
  if (!P.lids.length) return;
  for (const l of P.lids) l.h.visible = true;
  if (!still) return;
  P.lidBatt = bakeParts(P.lids.map((l) => l.h), true);
  P.tilt.add(P.lidBatt);
  for (const l of P.lids) l.h.visible = false;
}

/* coque seule, pour les épaves chavirées et les barques */
function buildHull(sp, opts) {
  const P = Object.assign(hullParams(Object.assign({ look: {}, armament: [] }, sp)), opts && opts.freeboard ? { F: opts.freeboard, hb: 0.4 } : {});
  const g = buildHullGroup(Object.assign({ look: { hull: '#2a2826' }, armament: [] }, sp), P, { hull: new THREE.MeshStandardMaterial({ color: 0x3a3a32 }), bulwark: new THREE.MeshStandardMaterial({ color: 0x4a4038 }), deck: new THREE.MeshStandardMaterial({ color: 0x5a4a38 }) });
  return { sides: g.children[0].geometry, group: g, F: P.F };
}
