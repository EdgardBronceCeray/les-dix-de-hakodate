'use strict';

/* Son entièrement synthétisé : vent, mer, machine, canon, cloche du
 * télégraphe. Le navigateur n'ouvre le son qu'après un geste du joueur. */

const Snd = {
  ac: null, master: null, noise: null, muted: false,
  wind: null, windF: null, sea: null, seaF: null, eng: null, engT: 0,

  wake() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { this.ac = new AC(); } catch (e) { return false; }
    const ac = this.ac;
    this.master = ac.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    /* un limiteur en bout de chaîne : quand une bordée, une explosion et la musique tombent
     * ensemble, le son s'écrase doucement au lieu de saturer (la saturation grésille) */
    const lim = ac.createDynamicsCompressor();
    lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
    this.master.connect(lim).connect(ac.destination);
    const n = ac.sampleRate * 2;
    this.noise = ac.createBuffer(1, n, ac.sampleRate);
    const d = this.noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.6 + b * 2.2; }
    /* le fond de mer et de vent : un bruit rose, sans le souffle aigu du bruit blanc (qui sonnait
     * comme un grésillement), et dont la fin se fond dans le début : la boucle n'a pas de raccord */
    this.amb = ac.createBuffer(1, n, ac.sampleRate);
    {
      const m = Math.floor(ac.sampleRate * 0.25), raw = new Float32Array(n + m);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < n + m; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
        raw[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25;
      }
      const a = this.amb.getChannelData(0);
      for (let i = 0; i < n; i++) a[i] = raw[i];
      for (let i = 0; i < m; i++) { const k = i / m; a[i] = raw[n + i] * Math.sqrt(1 - k) + raw[i] * Math.sqrt(k); }
    }
    const loop = (type, f, q) => {
      const s = ac.createBufferSource(); s.buffer = this.amb; s.loop = true;
      const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = ac.createGain(); g.gain.value = 0;
      s.connect(fl).connect(g).connect(this.master); s.start();
      return [g, fl];
    };
    [this.wind, this.windF] = loop('bandpass', 500, 0.8);
    [this.sea, this.seaF] = loop('lowpass', 380, 0.4);
    Music.init();
    return true;
  },

  mute(on) {
    this.muted = on;
    if (this.master) this.master.gain.value = on ? 0 : 0.5;
    try { localStorage.setItem('kaisen1869.muted', on ? '1' : '0'); } catch (e) { /* rien */ }
  },

  /* volume selon la distance, en mètres */
  far(d) { return d === undefined ? 1 : clamp(1 / (1 + d / 450), 0.02, 1); },

  hiss(dur, type, freq, q, gain, slideTo, delay) {
    if (!this.ac || this.muted || gain < 0.004) return;
    const t = this.ac.currentTime + (delay || 0);
    const s = this.ac.createBufferSource(); s.buffer = this.noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    const g = this.ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },

  tone(freq, dur, type, gain, slideTo, delay) {
    if (!this.ac || this.muted || gain < 0.004) return;
    const t = this.ac.currentTime + (delay || 0);
    const o = this.ac.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },

  /* ambiance : vent selon Beaufort, mer selon la houle, machine selon la puissance */
  ambient(windMs, sea, power, paddle, dtGame) {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const wv = clamp(windMs / 22, 0, 1);
    /* le vent : discret par temps maniable, il ne siffle que dans la tempête, par rafales */
    const gust = 0.75 + 0.25 * Math.sin(t * 0.41) * Math.sin(t * 0.17 + 1.3);
    this.wind.gain.setTargetAtTime(this.muted ? 0 : (0.02 + wv * wv * 0.16) * gust, t, 0.5);
    this.windF.frequency.setTargetAtTime(260 + wv * 520 + Math.sin(t * 0.7) * 80 * wv, t, 0.3);
    /* la mer : un ressac qui va et vient avec la houle, au lieu d'un bruit continu */
    const swell = 0.7 + 0.3 * Math.sin(t * 0.8) * (0.6 + 0.4 * Math.sin(t * 0.13));
    this.sea.gain.setTargetAtTime(this.muted ? 0 : (0.07 + clamp(sea / 4, 0, 1) * 0.17) * swell, t, 0.8);
    this.seaF.frequency.setTargetAtTime(240 + 120 * Math.sin(t * 0.35), t, 0.5);
    /* coups de piston, ou battement des aubes */
    const rpm = Math.abs(power);
    if (rpm > 0.02) {
      this.engT -= dtGame * (paddle ? 1.1 : 2.2) * (0.3 + rpm);
      if (this.engT <= 0) {
        this.engT = 1;
        this.hiss(0.14, 'lowpass', paddle ? 260 : 420, 0.9, 0.05 + rpm * 0.08);
        if (paddle) this.hiss(0.22, 'bandpass', 900, 0.8, 0.02 + rpm * 0.03, 500, 0.05);
      }
    }
  },

  cannon(kg, d) {
    const v = this.far(d), k = clamp(Math.sqrt(kg / 14), 0.4, 3);
    this.hiss(0.5 + k * 0.2, 'lowpass', 900, 0.6, 0.55 * v, 90);
    this.tone(70 / Math.sqrt(k), 0.6 + k * 0.2, 'sine', 0.5 * v, 28);
    this.hiss(1.8, 'lowpass', 300, 0.5, 0.12 * v, 60, 0.15);
  },
  gatling(d) { const v = this.far(d); this.hiss(0.05, 'highpass', 1800, 1, 0.12 * v); },
  splash(d) { const v = this.far(d); this.hiss(0.6, 'bandpass', 1100, 0.7, 0.18 * v, 400); },
  hit(d) {
    const v = this.far(d);
    this.hiss(0.18, 'bandpass', 1500, 1.4, 0.4 * v, 600);
    this.tone(160, 0.25, 'triangle', 0.18 * v, 60);
  },
  clang(d) { const v = this.far(d); this.tone(1240, 0.5, 'triangle', 0.16 * v, 1180); this.tone(1870, 0.35, 'sine', 0.08 * v); },
  thud(force) {
    const g = clamp(force, 0.15, 1);
    this.hiss(0.35, 'lowpass', 300, 0.8, g * 0.55, 80);
    this.tone(70, 0.6, 'sine', g * 0.5, 30);
  },
  crack() { this.hiss(0.3, 'highpass', 1400, 0.8, 0.35, 700); this.hiss(0.6, 'bandpass', 500, 0.8, 0.2, 200, 0.1); },
  crate() {
    this.hiss(0.12, 'bandpass', 700, 1.2, 0.2);
    this.tone(330, 0.2, 'triangle', 0.12, null, 0.05);
  },
  /* la cloche du télégraphe de la machine */
  telegraph() {
    this.tone(1320, 0.5, 'sine', 0.1);
    this.tone(1980, 0.35, 'sine', 0.04);
    this.tone(1320, 0.5, 'sine', 0.08, null, 0.18);
  },
  bell(n) {
    for (let i = 0; i < n; i++) {
      this.tone(880, 1.2, 'sine', 0.14, null, i * 0.45);
      this.tone(2210, 0.6, 'sine', 0.04, null, i * 0.45);
    }
  },
  explosion() {
    this.hiss(2.2, 'lowpass', 600, 0.5, 0.8, 50);
    this.tone(44, 2, 'sine', 0.6, 22);
  },
  sink() {
    this.hiss(2.5, 'lowpass', 500, 0.6, 0.4, 60);
    this.tone(120, 2.4, 'sawtooth', 0.12, 34);
  },
  thunder() { this.hiss(2.4, 'lowpass', 160, 0.7, 0.5, 60); this.hiss(1.2, 'lowpass', 420, 0.6, 0.25, 120, 0.15); },
  tick() { this.tone(1500, 0.05, 'triangle', 0.04); },
  /* la coque qui craque quand le navire se couche */
  creak(k) {
    const g = clamp(k || 0.6, 0.3, 1);
    this.tone(95 + Math.random() * 40, 0.5, 'sawtooth', 0.05 * g, 60 + Math.random() * 20);
    this.hiss(0.4, 'bandpass', 240 + Math.random() * 160, 3, 0.12 * g, 140);
  },
  /* des pièces d'or qui tintent */
  coins() { for (let i = 0; i < 3; i++) this.tone(2400 + Math.random() * 900, 0.18, 'triangle', 0.035, null, i * 0.05 + Math.random() * 0.03); },
  /* la mousqueterie d'un abordage */
  musket() { this.hiss(0.08, 'highpass', 1600, 0.9, 0.12); this.hiss(0.3, 'lowpass', 700, 0.7, 0.05, 200, 0.02); },
  select() { this.tone(880, 0.12, 'triangle', 0.07); this.tone(1320, 0.2, 'sine', 0.05, null, 0.06); },
  levelUp() { [587, 698, 880, 1175].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.14, null, i * 0.16)); },
};

try { Snd.muted = localStorage.getItem('kaisen1869.muted') === '1'; } catch (e) { /* rien */ }

/* ---------- la musique ----------
 * Six morceaux composés pour le jeu (music-data.js) : le thème des menus, les ordres de mission,
 * la mer, le combat, et deux éclats pour la victoire et la défaite. Ils sont décodés au premier
 * geste du joueur, bouclent à l'échantillon près, et passent de l'un à l'autre en fondu.
 * La musique passe par le volume général : M coupe tout. */
const Music = {
  off: (() => { try { return localStorage.getItem('kaisen.musique') === '0'; } catch (e) { return false; } })(),
  vol: 0.42, bufs: {}, want: null, cur: null, gain: null, ducked: false,

  init() {
    if (this.gain || !Snd.ac || typeof MUSIC_DATA === 'undefined') return;
    const ac = Snd.ac;
    this.gain = ac.createGain();
    this.gain.gain.value = this.off ? 0 : this.vol;
    this.gain.connect(Snd.master);
    /* le morceau attendu d'abord, puis les autres, un par un */
    const order = [this.want || 'theme', ...Object.keys(MUSIC_DATA)].filter((v, i, a) => v && a.indexOf(v) === i);
    const next = () => {
      const n = order.shift();
      if (!n) return;
      let u8;
      try { const bin = atob(MUSIC_DATA[n]); u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); } catch (e) { next(); return; }
      const done = (b) => { this.bufs[n] = b; if (this.want === n && (!this.cur || this.cur.name !== n)) this.start(n); next(); };
      try {
        const p = ac.decodeAudioData(u8.buffer, done, () => next());
        if (p && p.catch) p.catch(() => {});
      } catch (e) { next(); }
    };
    next();
  },

  play(name) {
    this.want = name;
    if (this.cur && this.cur.name === name) return;
    if (this.bufs[name]) this.start(name);
  },

  start(name) {
    const ac = Snd.ac, b = this.bufs[name];
    if (!ac || !b) return;
    const t = ac.currentTime;
    if (this.cur) { const c = this.cur; c.g.gain.cancelScheduledValues(t); c.g.gain.setTargetAtTime(0, t, 0.7); try { c.src.stop(t + 4); } catch (e) { /* rien */ } }
    const src = ac.createBufferSource();
    src.buffer = b;
    const L = MUSIC_LOOPS[name];
    if (L) { src.loop = true; src.loopStart = 0; src.loopEnd = Math.min(L, b.duration); }
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.setTargetAtTime(1, t, 0.6);
    src.connect(g).connect(this.gain);
    src.start(t);
    this.cur = { name, src, g };
  },

  /* un éclat par-dessus : la boucle s'efface un moment, puis revient */
  sting(name) {
    const ac = Snd.ac, b = this.bufs[name];
    if (!ac || !b || this.off) return;
    const t = ac.currentTime;
    if (this.cur) {
      const g = this.cur.g.gain;
      g.cancelScheduledValues(t); g.setTargetAtTime(0.12, t, 0.15); g.setTargetAtTime(1, t + Math.max(1, b.duration - 2), 1.2);
    }
    const src = ac.createBufferSource();
    src.buffer = b;
    src.connect(this.gain);
    src.start(t);
  },

  toggle() {
    this.off = !this.off;
    try { localStorage.setItem('kaisen.musique', this.off ? '0' : '1'); } catch (e) { /* rien */ }
    this.level();
  },

  /* plus bas pendant la pause */
  duck(on) { this.ducked = on; this.level(); },
  level() {
    if (!this.gain || !Snd.ac) return;
    this.gain.gain.setTargetAtTime(this.off ? 0 : this.vol * (this.ducked ? 0.45 : 1), Snd.ac.currentTime, 0.3);
  },
};
