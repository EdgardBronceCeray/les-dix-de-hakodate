'use strict';

/* Le rendu 3D : une caméra plongeante qui suit le navire (sans zoom), le soleil,
 * une mer animée, la fumée, le feu et les gerbes, puis un post-traitement
 * (lueurs, vignettage, étalonnage). Le jeu reste en 2D : (x, y) devient (X, Z). */

const R3 = {
  ready: false, frame: 0, live: new Set(),
  pitch: 56 * DEG, fov: 30, viewW: 1250, camDist: 3000,
};

const AMBIANCE = {
  hiver: { sun: 0xe6ecf6, sunI: 2.4, sunDir: [-0.55, 0.62, -0.56], sky: 0xb4c4d8, ground: 0x4a525c, hemiI: 1.5, deep: 0x0e2a3c, shallow: 0x356a76, refl: 0xa8b8cc, fog: 0x9aa8b6, horizon: 0xc4ccd6, zenith: 0x7a8ea8, haze: 0.45, exposure: 1.1, bloom: 0.45, grade: [0.97, 1.0, 1.05] },
  printemps: { sun: 0xfff0d8, sunI: 3.4, sunDir: [-0.5, 0.7, -0.5], sky: 0xbcd4f0, ground: 0x4e5640, hemiI: 1.45, deep: 0x0a3256, shallow: 0x2a8a96, refl: 0xa8c4e6, fog: 0xb8cadc, horizon: 0xd8e2ec, zenith: 0x5a86c4, haze: 0.3, exposure: 1.08, bloom: 0.45, grade: [1.02, 1.0, 0.98] },
  'été': { sun: 0xfff3dc, sunI: 3.6, sunDir: [-0.45, 0.75, -0.48], sky: 0xc0daf4, ground: 0x545c40, hemiI: 1.45, deep: 0x07345e, shallow: 0x24939a, refl: 0xaccaee, fog: 0xbdd0e2, horizon: 0xdde8f2, zenith: 0x4f80c8, haze: 0.25, exposure: 1.08, bloom: 0.45, grade: [1.03, 1.0, 0.97] },
  /* l'arcade et les menus : fin d'après-midi sur une mer d'un bleu profond */
  soir: { sun: 0xffd6a0, sunI: 3.8, sunDir: [-0.62, 0.55, -0.58], sky: 0xb0c4e8, ground: 0x46424a, hemiI: 1.6, deep: 0x07305f, shallow: 0x1f88a0, refl: 0xa4bce4, fog: 0xc4b0a8, horizon: 0xf2c8a0, zenith: 0x5a80c4, haze: 0.35, exposure: 1.2, bloom: 0.6, grade: [1.04, 1.0, 1.0] },
  tempete: { sun: 0xc9d2da, sunI: 1.5, sunDir: [-0.3, 0.82, -0.48], sky: 0x6c7680, ground: 0x2a2e32, hemiI: 1.7, deep: 0x0c2230, shallow: 0x2a4a50, refl: 0x76828c, fog: 0x56606a, horizon: 0x737d86, zenith: 0x363c44, haze: 0.75, exposure: 1.15, bloom: 0.3, grade: [0.96, 1.0, 1.02] },
  nuit: { sun: 0xb8ccf6, sunI: 2.5, sunDir: [0.4, 0.6, -0.65], sky: 0x6a7aa4, ground: 0x20263a, hemiI: 1.9, deep: 0x07204a, shallow: 0x1a5476, refl: 0x5e6e9c, fog: 0x1e2840, horizon: 0x2c3858, zenith: 0x0c1428, haze: 0.5, exposure: 1.3, bloom: 0.85, grade: [0.95, 1.0, 1.1] },
};

/* ---------- mise en place ---------- */

function init3D() {
  const cv = document.getElementById('sea');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputColorSpace = THREE.LinearSRGBColorSpace;   // l'étalonnage final se fait à la main
  r.toneMapping = THREE.NoToneMapping;
  R3.r = r;
  const scene = new THREE.Scene();
  R3.scene = scene;
  scene.fog = new THREE.Fog(0x8899aa, 2000, 4200);
  /* la caméra des menus (perspective) et celle du jeu (orthographique : le champ tient exactement dans l'écran) */
  R3.cineCam = new THREE.PerspectiveCamera(R3.fov, 1, 20, 9000);
  R3.orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 50, 9000);
  R3.cineCam.layers.enable(1); R3.orthoCam.layers.enable(1);
  R3.camera = R3.cineCam;
  R3.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(R3.hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -900; sc.right = 900; sc.top = 900; sc.bottom = -900; sc.near = 50; sc.far = 5000;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 1.2;
  scene.add(sun); scene.add(sun.target);
  R3.sun = sun;
  R3.flash = new THREE.PointLight(0xffa050, 0, 600, 1.6);
  scene.add(R3.flash);
  buildSky();
  buildWater();
  buildParticles();
  R3.camMode = 'cine';
  R3.cine = { from: new THREE.Vector3(0, 200, 600), at: new THREE.Vector3(), cf: new THREE.Vector3(0, 200, 600), ca: new THREE.Vector3(), snap: true, focus: 600, fd: 600, dof: 0, dk: 0 };
  buildPost();
  R3.shots = new THREE.InstancedMesh(new THREE.SphereGeometry(2.6, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35, metalness: 0.6 }), 300);
  R3.shots.castShadow = true;
  R3.shots.frustumCulled = false;
  scene.add(R3.shots);
  R3.overlay = document.getElementById('fx2d');
  R3.oc = R3.overlay.getContext('2d');
  window.addEventListener('resize', resize3D);
  resize3D();
  setAmbiance('soir');
  R3.ready = true;
}

function resize3D() {
  const w = window.innerWidth, h = window.innerHeight;
  R3.r.setSize(w, h, false);
  R3.r.domElement.style.width = w + 'px';
  R3.r.domElement.style.height = h + 'px';
  const dpr = R3.r.getPixelRatio();
  R3.cineCam.aspect = w / h;
  R3.cineCam.updateProjectionMatrix();
  const W_ = Math.round(w * dpr), H_ = Math.round(h * dpr);
  R3.rtMain.setSize(W_, H_);
  R3.rtA.setSize(W_ >> 1, H_ >> 1); R3.rtB.setSize(W_ >> 1, H_ >> 1);
  R3.rtC.setSize(W_ >> 2, H_ >> 2); R3.rtD.setSize(W_ >> 2, H_ >> 2);
  R3.rtE.setSize(W_ >> 2, H_ >> 2); R3.rtF.setSize(W_ >> 2, H_ >> 2);
  R3.rtRefl.setSize(Math.min(W_ >> 1, 1400), Math.round(Math.min(W_ >> 1, 1400) * H_ / W_));
  /* l'occlusion en demi-définition, plafonnée pour les grands écrans */
  const aw = Math.min(W_ >> 1, 1280), ah = Math.round(aw * H_ / W_);
  R3.rtDepth.setSize(aw, ah); R3.rtAO.setSize(aw, ah); R3.rtAO2.setSize(aw, ah);
  R3.overlay.width = Math.round(w * dpr); R3.overlay.height = Math.round(h * dpr);
  R3.overlay.style.width = w + 'px'; R3.overlay.style.height = h + 'px';
  cam.dpr = dpr; cam.pw = w; cam.ph = h;
  /* le champ de jeu : viewW unités de large ; en profondeur, la hauteur d'écran divisée par sin(inclinaison) */
  const vw = clamp(R3.viewW * Math.sqrt(w / 1440), 900, 1500);
  const hs = vw * h / w;
  /* cam.w et cam.h : la vue la plus large, celle de la pleine vitesse, qui sert aux règles du jeu */
  cam.w = vw;
  cam.h = hs / Math.sin(R3.pitch);
  R3.baseVW = vw; R3.baseHS = hs;
  applyZoom();
  if (G.onResize) G.onResize();
}

/* la caméra monte avec la vitesse : au repos, on voit le navire de plus près ;
 * à toute vapeur, on retrouve la vue large, qui est le plafond */
const ZOOM_MIN = 0.7;
function applyZoom() {
  const z = R3.zoom || ZOOM_MIN, O = R3.orthoCam, vw = R3.baseVW * z, hs = R3.baseHS * z;
  O.left = -vw / 2; O.right = vw / 2; O.top = hs / 2; O.bottom = -hs / 2;
  O.updateProjectionMatrix();
  cam.vw = vw; cam.vh = hs / Math.sin(R3.pitch);
}
function updateZoom(dt, snap) {
  const me = G.me;
  let want = 1;
  if (me && !me.sinking) want = ZOOM_MIN + (1 - ZOOM_MIN) * smooth(clamp((Math.abs(me.v) / maxSpeed(me) - 0.08) / 0.85, 0, 1));
  /* le corsaire : une coque de noix se voit de plus près qu'une frégate */
  if (me && me.spec.custom) want *= clamp((me.len + 70) / 125, 0.78, 1);
  const z0 = R3.zoom || ZOOM_MIN;
  R3.zoom = snap ? want : z0 + (want - z0) * (1 - Math.exp(-(dt || 0.016) * 0.9));
  if (Math.abs(R3.zoom - z0) > 1e-4 || snap) applyZoom();
}

function setAmbiance(name, extra) {
  R3.ambName = name;
  const A = Object.assign({}, AMBIANCE[name] || AMBIANCE.soir, extra || {});
  R3.amb = A;
  R3.hemi.color.set(A.sky); R3.hemi.groundColor.set(A.ground); R3.hemi.intensity = A.hemiI;
  R3.sun.color.set(A.sun); R3.sun.intensity = A.sunI;
  R3.sunDir = new THREE.Vector3(...A.sunDir).normalize();
  R3.scene.fog.color.set(A.fog);
  R3.fogBase = new THREE.Color(A.fog);
  const u = R3.water.material.uniforms;
  u.uDeep.value.set(A.deep); u.uShallow.value.set(A.shallow); u.uRefl.value.set(A.refl);
  u.uSun.value.set(A.sun).multiplyScalar(A.sunI * 0.6);
  u.uSunDir.value.copy(R3.sunDir);
  const su = R3.sky.material.uniforms;
  su.uHor.value.set(A.horizon); su.uZen.value.set(A.zenith);
  su.uSunDir.value.copy(R3.sunDir); su.uSun.value.set(A.sun);
  su.uSeaC.value.set(A.deep).multiplyScalar(1.4);
  R3.hemi.intensity = A.hemiI * 0.55;
  R3.hemiBase = R3.hemi.intensity;
  R3.foamK = { nuit: 0.42, soir: 0.92, hiver: 0.85, tempete: 0.8 }[name];
  /* l'écume n'est pas éclairée par la scène : on la teinte à la main selon l'heure */
  R3.foamK = R3.foamK || 1;
  u.uFoamK.value = R3.foamK;
  updateEnv();
  const pu = R3.post.uniforms;
  pu.uBloom.value = A.bloom; pu.uExposure.value = A.exposure; pu.uGrade.value.set(...A.grade);
}

/* ---------- caméra ---------- */

function place3DCamera(dt) {
  let tx, tz;
  if (R3.camMode === 'cine') {
    R3.camera = R3.cineCam;
    const C = R3.cine, k = C.snap ? 1 : clamp((dt || 0.016) * 1.6, 0, 1);
    C.cf.lerp(C.from, k); C.ca.lerp(C.at, k); C.snap = false;
    C.fd += (C.focus - C.fd) * k; C.dk += (C.dof - C.dk) * k;
    R3.camera.position.copy(C.cf);
    R3.camera.lookAt(C.ca);
    tx = C.ca.x; tz = C.ca.z;
    cam.x = tx; cam.y = tz;
    R3.scene.fog.near = 500; R3.scene.fog.far = 5200;
  } else {
    updateZoom(dt);
    const p = R3.pitch, D = R3.camDist;
    tx = cam.x; tz = cam.y;
    R3.camera = R3.orthoCam;
    R3.camera.position.set(tx, D * Math.sin(p), tz + D * Math.cos(p));
    R3.camera.lookAt(tx, 0, tz);
    /* la brume du bord du monde épaissit aussi le brouillard de la scène */
    const mi = clamp(G.mist || 0, 0, 1);
    R3.scene.fog.near = lerp(D + 600, D - 120, mi); R3.scene.fog.far = lerp(D + 3000 - R3.amb.haze * 1200, D + 650, mi);
    if (R3.fogBase) {
      if (!R3.mistCol) R3.mistCol = new THREE.Color();
      R3.mistCol.set(R3.ambName === 'nuit' ? 0x46505e : 0xd2d8de);
      R3.scene.fog.color.copy(R3.fogBase).lerp(R3.mistCol, mi * 0.85);
    }
  }
  R3.camera.updateMatrixWorld();
  R3.sky.position.copy(R3.camera.position);
  /* l'ombre suit la vue, au plus serré : plus de détail dans les ombres des gréements */
  const s = R3.sunDir, sc = R3.sun.shadow.camera;
  const half = R3.camMode === 'cine' ? 900 : Math.max(cam.vw || cam.w, cam.vh || cam.h) * 0.62 + 120;
  if (Math.abs(sc.right - half) > 1) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
  const texel = 2 * half / R3.sun.shadow.mapSize.x;
  tx = Math.round(tx / texel) * texel; tz = Math.round(tz / texel) * texel;
  R3.sun.position.set(tx + s.x * 2000, s.y * 2000, tz + s.z * 2000);
  R3.sun.target.position.set(tx, 0, tz);
  R3.sun.target.updateMatrixWorld();
}

/* ciel : un dôme dégradé avec le halo du soleil (visible dans les plans de menu) */
function buildSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uHor: { value: new THREE.Color() }, uZen: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSun: { value: new THREE.Color() }, uSeaC: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uHor, uZen, uSun, uSunDir, uSeaC; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float t = clamp(d.y, 0.0, 1.0);
        vec3 c = mix(uHor, uZen, pow(t, 0.5));
        if (d.y < 0.0) c = mix(uHor, uSeaC, smoothstep(0.0, 0.25, -d.y));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        c += uSun * (pow(s, 900.0) * 30.0 + pow(s, 24.0) * 0.5 + pow(s, 4.0) * 0.15);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  R3.sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), mat);
  R3.sky.renderOrder = -10;
  R3.sky.frustumCulled = false;
  R3.sky.layers.set(1);
  R3.scene.add(R3.sky);
  /* le même ciel, en petit, pour les reflets sur les coques et les cuivres */
  R3.envScene = new THREE.Scene();
  R3.envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat);
  R3.envScene.add(R3.envSky);
  R3.pmrem = new THREE.PMREMGenerator(R3.r);
}

function updateEnv() {
  if (R3.envRT) R3.envRT.dispose();
  R3.envRT = R3.pmrem.fromScene(R3.envScene, 0.02);
  R3.scene.environment = R3.envRT.texture;
}

const _v = new THREE.Vector3();
/* du monde à l'écran, en pixels CSS */
function toScreen(x, y, z) {
  _v.set(x, z || 0, y).project(R3.camera);
  return [(_v.x + 1) / 2 * cam.pw, (1 - _v.y) / 2 * cam.ph, _v.z < 1];
}

/* ---------- la mer ---------- */

const WATER_VS = `
varying vec3 vWorld;
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
}`;

const WATER_FS = `
uniform float uTime, uSea, uHasLand, uHaze, uClouds, uFoamK, uRain, uFlash, uReflOn;
uniform sampler2D tRefl; uniform mat4 uReflMat;
uniform vec3 uSunDir, uDeep, uShallow, uRefl, uSun;
uniform vec2 uWind;
uniform sampler2D uLand;
uniform vec4 uLandRect;
uniform vec3 uCamPos;
varying vec3 vWorld;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

float hash2d(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2d(i), hash2d(i + vec2(1, 0)), u.x), mix(hash2d(i + vec2(0, 1)), hash2d(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

/* houle : quelques ondes dans le sens du vent, plus le clapot */
vec3 waves(vec2 p, float t) {
  vec2 w = normalize(uWind + vec2(1e-4));
  vec2 q = vec2(-w.y, w.x);
  float h = 0.0; vec2 g = vec2(0.0);
  float amp = 0.2 + uSea * 0.2;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float ang = (fi - 2.5) * 0.55 + sin(fi * 7.1) * 0.4;
    vec2 d = normalize(w * cos(ang) + q * sin(ang));
    float lam = 260.0 / (1.0 + fi * 0.75);
    float k = 6.2832 / lam;
    float om = sqrt(9.8 * k * 18.0);
    float ph = k * dot(d, p) - om * t * 0.12 + fi * 1.7;
    float a = amp * lam * 0.014;
    h += a * sin(ph);
    g += a * k * cos(ph) * d;
  }
  /* clapot fin, en bruit */
  vec2 np = p * 0.035 + w * t * 0.25;
  float e = 0.6;
  float n0 = fbm(np), nx = fbm(np + vec2(0.06, 0.0)), nz = fbm(np + vec2(0.0, 0.06));
  g += vec2(nx - n0, nz - n0) / 0.06 * 0.05 * (0.6 + uSea * 0.5) * e;
  vec2 np2 = p * 0.11 - w * t * 0.5;
  float m0 = noise(np2), mx = noise(np2 + vec2(0.08, 0.0)), mz = noise(np2 + vec2(0.0, 0.08));
  g += vec2(mx - m0, mz - m0) / 0.08 * 0.03;
  /* rides fines, qui accrochent le soleil */
  vec2 np3 = p * 0.31 + vec2(t * 0.9, -t * 0.6);
  float r0 = noise(np3), rx = noise(np3 + vec2(0.1, 0.0)), rz = noise(np3 + vec2(0.0, 0.1));
  g += vec2(rx - r0, rz - r0) / 0.1 * 0.018;
  return vec3(h, g);
}

void main() {
  vec2 p = vWorld.xz;
  float t = uTime;
  vec3 W = waves(p, t);
  vec3 N = normalize(vec3(-W.y, 1.0, -W.z));
  vec3 V = normalize(uCamPos - vWorld);
  vec3 L = normalize(uSunDir);
  /* terre proche : hauts-fonds et ressac */
  float coast = 0.0, shallow = 0.0;
  if (uHasLand > 0.5) {
    vec2 uv = (p - uLandRect.xy) / uLandRect.zw;
    if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) {
      vec4 lm = texture2D(uLand, uv);
      float ef = smoothstep(0.0, 0.04, min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y)));
      coast = lm.r * ef; shallow = lm.g * ef;
    }
  }
  /* l'ombre des nuages : calculée une fois, elle sert aux caustiques et à la mer */
  vec2 wd = normalize(uWind + vec2(1e-4));
  float cloud = smoothstep(0.48, 0.72, fbm(p * 0.0009 + wd * t * 0.007 + 7.3));
  /* grandes taches de lumière dans l'eau profonde */
  float lightPatch = fbm(p * 0.0011 + vec2(t * 0.004, -t * 0.003));
  vec3 deep = uDeep * (0.75 + lightPatch * 0.7);
  vec3 base = mix(deep, uShallow, smoothstep(0.02, 0.6, shallow));
  /* près des côtes : le fond de sable qui transparaît, et les caustiques du soleil qui y dansent */
  if (shallow > 0.01) {
    vec2 q = p * 0.05;
    float c1 = 1.0 - abs(noise(q + vec2(t * 0.21, t * 0.15)) * 2.0 - 1.0);
    float c2 = 1.0 - abs(noise(q * 1.73 + vec2(-t * 0.17, t * 0.23) + 7.1) * 2.0 - 1.0);
    float caust = pow(c1 * c2, 5.0) * 1.6;
    float sandN = fbm(p * 0.02 + 3.3);
    vec3 sand = mix(vec3(0.62, 0.56, 0.42), vec3(0.48, 0.5, 0.4), sandN);
    float sh2 = smoothstep(0.35, 0.95, shallow);
    base = mix(base, mix(base, sand * 0.9, 0.55), sh2);
    base += uSun * caust * 0.05 * smoothstep(0.15, 0.85, shallow) * (1.0 - cloud * uClouds * 0.7);
  }
  float diff = max(dot(N, L), 0.0);
  /* la lumière traverse les crêtes */
  float sss = pow(max(dot(V, -L + N * 0.6), 0.0), 3.0) * max(W.x, 0.0) * 0.08;
  vec3 col = base * (0.55 + 0.6 * diff) + uShallow * sss;
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 sky = mix(uRefl * 0.75, uRefl * 1.1, N.y);
  col = mix(col, sky, fres * 0.6);
  /* le reflet des coques, des mâts et des côtes, brouillé par les vagues */
  if (uReflOn > 0.5) {
    vec4 rc = uReflMat * vec4(vWorld.x + N.x * 22.0, 0.0, vWorld.z + N.z * 22.0, 1.0);
    vec2 ruv = clamp(rc.xy / rc.w, 0.002, 0.998);
    vec4 rf = texture2D(tRefl, ruv);
    float rk = rf.a * clamp(fres * 1.25 + 0.16, 0.0, 0.78);
    col = mix(col, rf.rgb * 0.82 + base * 0.12, rk);
  }
  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  float glitter = smoothstep(0.6, 0.95, noise(p * 0.45 + vec2(t * 0.9, -t * 0.7))) * smoothstep(0.4, 0.8, noise(p * 0.13 - t * 0.3));
  float spec = (pow(nh, 500.0) * 3.0 * glitter + pow(nh, 60.0) * 0.05) * (1.0 - cloud * 0.8 * uClouds);
  col += uSun * spec;
  /* moutons quand la mer est forte */
  /* moutons : de petites traînées d'écume sur les crêtes quand la mer est forte */
  vec2 sp2 = vec2(dot(p, wd), dot(p, vec2(-wd.y, wd.x)));
  float streak = noise(sp2 * vec2(0.05, 0.2) + vec2(-t * 0.35, 0.0)) * noise(p * 0.09 + t * 0.15);
  float crest = smoothstep(0.5, 1.0, W.x / (0.3 + uSea * 1.0)) * smoothstep(0.3, 0.85, streak);
  col = mix(col, vec3(0.84, 0.9, 0.93) * uFoamK, crest * clamp((uSea - 1.5) * 0.14, 0.0, 0.24 + max(0.0, uSea - 3.0) * 0.12));
  /* gros temps : des traînées d'écume couchées par le vent, et des crêtes qui déferlent partout */
  if (uSea > 2.6) {
    float k = clamp((uSea - 2.6) / 1.4, 0.0, 1.0);
    vec2 sp3 = vec2(dot(p, wd), dot(p, vec2(-wd.y, wd.x)));
    float lines = noise(sp3 * vec2(0.012, 0.32) + vec2(-t * 0.6, 0.0)) * noise(sp3 * vec2(0.03, 0.08) + vec2(-t * 0.25, 3.0));
    float streaks = smoothstep(0.42, 0.7, lines);
    float caps = smoothstep(0.66, 0.92, noise(p * 0.06 + wd * t * 0.8) * noise(p * 0.13 - t * 0.4)) * smoothstep(0.0, 0.6, W.x);
    col = mix(col, vec3(0.86, 0.9, 0.92) * uFoamK, clamp(streaks * 0.16 * k + caps * 0.5 * k, 0.0, 0.6));
  }
  /* la pluie : de petits ronds qui s'ouvrent et s'effacent à la surface */
  if (uRain > 0.01) {
    vec2 rp = p * 0.55;
    vec2 cell = floor(rp), f = fract(rp) - 0.5;
    float h = hash2d(cell);
    float ph = fract(t * (0.9 + h) + h * 7.0);
    vec2 o = vec2(hash2d(cell + 1.7), hash2d(cell + 3.1)) - 0.5;
    float r = length(f - o * 0.6);
    float ring = smoothstep(0.05, 0.0, abs(r - ph * 0.45)) * (1.0 - ph) * step(0.35, h);
    col += vec3(0.5, 0.55, 0.6) * ring * 0.35 * uRain;
  }
  /* ombres de nuages qui glissent sur la mer */
  col *= 1.0 - cloud * 0.28 * uClouds;
  /* ressac le long de la côte */
  if (coast > 0.01) {
    /* les vagues qui déferlent : quelques rouleaux qui avancent vers la plage, brisés par endroits */
    float near = smoothstep(0.26, 0.47, coast) * (1.0 - smoothstep(0.485, 0.505, coast));
    float ph = coast * 30.0 - t * 1.25 + fbm(p * 0.035) * 5.0;
    float roll = smoothstep(0.78, 0.98, sin(ph) * 0.5 + 0.5);
    float broken = smoothstep(0.38, 0.62, fbm(p * 0.045 + vec2(t * 0.04, -t * 0.03)));
    /* l'écume de la lame qui vient mourir, frangée, au ras du sable */
    float edge = smoothstep(0.43, 0.49, coast) * (1.0 - smoothstep(0.495, 0.515, coast));
    float lace = 0.55 + 0.45 * smoothstep(0.3, 0.7, noise(p * 0.22 + t * 0.3));
    col = mix(col, vec3(0.93, 0.96, 0.97) * uFoamK, clamp(near * roll * broken * 0.6 + edge * lace * 0.8, 0.0, 0.9));
  }
  /* ombres portées : voiles, coques, îles */
  float sh = getShadowMask();
  col *= mix(0.55, 1.0, sh);
  /* l'éclair : la mer s'allume d'un coup */
  col += vec3(0.55, 0.6, 0.7) * uFlash * (0.4 + fres);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;

function buildWater() {
  const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    vertexShader: WATER_VS, fragmentShader: WATER_FS, fog: true, lights: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, THREE.UniformsLib.lights, {
      uTime: { value: 0 }, uSea: { value: 2 }, uHasLand: { value: 0 }, uHaze: { value: 0.4 }, uClouds: { value: 1 }, uFoamK: { value: 1 }, uRain: { value: 0 }, uFlash: { value: 0 },
      uReflOn: { value: 0 }, tRefl: { value: null }, uReflMat: { value: new THREE.Matrix4() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() },
      uRefl: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uWind: { value: new THREE.Vector2(1, 0) },
      uLand: { value: blank }, uLandRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uCamPos: { value: new THREE.Vector3() },
    }]),
  });
  const water = new THREE.Mesh(geo, mat);
  water.scale.set(22000, 1, 22000);
  water.receiveShadow = true;
  water.frustumCulled = false;
  R3.scene.add(water);
  R3.water = water;
}

/* masque de la terre pour la mer, calculé avec le relief (voir terrain.js) */
function setWaterLand(mask) {
  const u = R3.water.material.uniforms;
  if (!mask) { u.uHasLand.value = 0; return; }
  if (!mask.tex) {
    mask.tex = new THREE.DataTexture(mask.data, mask.GW, mask.GH);
    mask.tex.magFilter = THREE.LinearFilter; mask.tex.minFilter = THREE.LinearFilter;
    mask.tex.needsUpdate = true;
  }
  u.uLand.value = mask.tex;
  u.uLandRect.value.set(mask.x0, mask.y0, mask.w, mask.h);
  u.uHasLand.value = 1;
}

/* ---------- particules : quads toujours tournés vers la caméra ---------- */

const PART_VS = `
attribute vec3 iPos; attribute vec4 iCol; attribute float iSize; attribute float iSeed;
varying vec4 vCol; varying vec2 vUv; varying float vSeed;
void main() {
  vCol = iCol; vUv = position.xy; vSeed = iSeed;
  vec4 mv = viewMatrix * vec4(iPos, 1.0);
  float a = iSeed * 6.2832;
  vec2 c = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy;
  mv.xy += c * iSize;
  gl_Position = projectionMatrix * mv;
}`;
const PART_FS = `
varying vec4 vCol; varying vec2 vUv; varying float vSeed;
uniform float uSoft, uLit, uTime; uniform vec3 uSunV;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
void main() {
  float d = length(vUv) * 2.0;
  if (d > 1.0) discard;
  float a = 1.0 - d;
  /* une texture de volute pour la fumée, qui roule doucement sur elle-même */
  vec2 q = vUv * 3.0 + vSeed * 31.0 + vec2(uTime * 0.07, -uTime * 0.05);
  float n = noise(q) * 0.5 + noise(q * 2.1 - vSeed * 17.0) * 0.32 + noise(q * 4.7 + 3.1) * 0.18;
  /* le bord de la bouffée est déchiqueté par la volute, pas un disque */
  a = uSoft > 0.5 ? smoothstep(0.0, 0.85, a) * smoothstep(0.22, 0.78, n * 0.95 + a * 0.6) : a * a;
  vec3 col = vCol.rgb;
  if (uLit > 0.5) {
    /* une bouffée est une boule : côté soleil plus clair, côté ombre plus sombre, liseré lumineux */
    vec2 dv = vUv * 2.0;
    vec3 nrm = normalize(vec3(dv + (n - 0.5) * 0.6, sqrt(max(0.0, 1.0 - dot(dv, dv)))));
    float lit = clamp(dot(nrm, normalize(uSunV)), 0.0, 1.0);
    float rim = pow(1.0 - nrm.z, 3.0) * max(0.0, dot(normalize(dv + 1e-4), normalize(uSunV.xy + 1e-4)));
    col *= 0.62 + lit * 0.62 + rim * 0.5;
  }
  gl_FragColor = vec4(col, vCol.a * a);
}`;

function makePartSystem(max, additive, soft) {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.attributes.position);
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  const col = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const size = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
  const seed = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
  for (const a of [pos, col, size, seed]) a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iPos', pos); g.setAttribute('iCol', col); g.setAttribute('iSize', size); g.setAttribute('iSeed', seed);
  g.instanceCount = 0;
  const m = new THREE.ShaderMaterial({
    vertexShader: PART_VS, fragmentShader: PART_FS, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uSoft: { value: soft ? 1 : 0 }, uLit: { value: soft ? 1 : 0 }, uTime: { value: 0 }, uSunV: { value: new THREE.Vector3(0, 1, 0) } },
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = additive ? 3 : 2;
  mesh.layers.set(1);
  R3.scene.add(mesh);
  return { mesh, g, pos, col, size, seed, n: 0, max };
}

function buildParticles() {
  R3.pSmoke = makePartSystem(2600, false, true);
  R3.pFoam = makePartSystem(2600, false, false);
  R3.pGlow = makePartSystem(1600, true, false);
  R3.extra = [];          // particules propres au rendu (traînées, étincelles)
}

function pushPart(S, x, y, z, size, r, g, b, a, seed) {
  if (S.n >= S.max) return;
  const i = S.n++;
  S.pos.array[i * 3] = x; S.pos.array[i * 3 + 1] = y; S.pos.array[i * 3 + 2] = z;
  S.col.array[i * 4] = r; S.col.array[i * 4 + 1] = g; S.col.array[i * 4 + 2] = b; S.col.array[i * 4 + 3] = a;
  S.size.array[i] = size; S.seed.array[i] = seed;
}

const TONES = [[0.12, 0.115, 0.11], [0.62, 0.62, 0.6], [0.78, 0.77, 0.74], [0.6, 0.58, 0.54], [0.85, 0.88, 0.9], [0.16, 0.15, 0.14], [1.0, 0.55, 0.18], [0.72, 0.12, 0.08]];

function syncParticles(dt) {
  for (const S of [R3.pSmoke, R3.pFoam, R3.pGlow]) S.n = 0;
  const lightK = R3.amb ? 0.55 + R3.amb.sunI * 0.15 : 1, fk = R3.foamK || 1;
  for (const p of G.parts) {
    const t = p.age / p.life;
    const fade = (1 - t) * (t < 0.06 ? t / 0.06 : 1);
    const seed = ((p.x * 13.1 + p.y * 7.7) % 1 + 1) % 1;
    if (p.k === 'smoke') {
      const T = TONES[p.tone || 0];
      const z = (p.z0 || 5) + p.age * (p.tone === 5 ? 9 : 6);
      /* la fumée de charbon, noire au sortir de la cheminée, grisaille en se dispersant */
      const g_ = p.tone === 5 ? smooth(Math.min(1, t * 1.6)) * 0.32 : 0;
      pushPart(R3.pSmoke, p.x, z, p.y, Math.max(3, p.r * 2.6), (T[0] + g_) * lightK, (T[1] + g_) * lightK, (T[2] + g_ * 1.05) * lightK, Math.min(1, p.a * 1.3) * fade, seed);
    } else if (p.k === 'foam') {
      pushPart(R3.pFoam, p.x, 0.8, p.y, Math.max(1.5, p.r * 2.2), 0.9 * fk, 0.94 * fk, 0.96 * fk, p.a * fade * 0.8, seed);
    } else if (p.k === 'column') {
      const h = p.h * 2.6 * Math.sin(Math.min(1, t * 2.2) * Math.PI / 2) * (1 - t * 0.5);
      for (let i = 0; i < 3; i++) pushPart(R3.pSmoke, p.x + (i - 1) * p.r * 0.4, 1 + h * (0.3 + i * 0.35), p.y, p.r * (3.2 - i * 0.6) + h * 0.25, 0.92 * fk, 0.95 * fk, 0.97 * fk, p.a * fade * 0.9, seed + i * 0.3);
      pushPart(R3.pFoam, p.x, 0.8, p.y, p.r * 4 + t * 12, 0.9 * fk, 0.94 * fk, 0.96 * fk, 0.6 * (1 - t), seed);
    } else if (p.k === 'spray') {
      /* une gerbe d'embruns : des gouttes lancées en l'air qui retombent */
      const z = Math.max(0.3, (p.z0 || 0.5) + p.vz * p.age - 14 * p.age * p.age);
      pushPart(R3.pFoam, p.x, z, p.y, p.r * (1 + t * 0.6), 0.93 * fk, 0.96 * fk, 0.98 * fk, p.a * fade, seed);
    } else if (p.k === 'flash') {
      pushPart(R3.pGlow, p.x, 5, p.y, p.r * 2.4, 2.4, 1.6, 0.8, p.a * (1 - t), seed);
    } else if (p.k === 'fire') {
      const z = (p.z0 || 3) + p.age * 10;
      pushPart(R3.pGlow, p.x, z, p.y, p.r * 2.8, 2.2, 0.9 + (1 - t) * 0.6, 0.25, p.a * (1 - t), seed);
    } else if (p.k === 'chip') {
      const z = 2 + Math.sin(Math.min(1, t * 1.2) * Math.PI) * 14;
      const c = new THREE.Color(p.col || '#8a6a44');
      pushPart(R3.pFoam, p.x, z, p.y, Math.max(1.6, p.r * 1.3), c.r, c.g, c.b, fade, seed);
    }
  }
  /* particules du rendu seul */
  for (let i = R3.extra.length - 1; i >= 0; i--) {
    const p = R3.extra[i];
    if (p.once) { pushPart(R3.pGlow, p.x, p.z, p.y, p.size, p.c[0], p.c[1], p.c[2], p.a, 0.3); R3.extra.splice(i, 1); continue; }
    p.age += dt;
    if (p.age >= p.life) { R3.extra.splice(i, 1); continue; }
    const t = p.age / p.life;
    p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; p.z += (p.vz || 0) * dt;
    const S = p.glow ? R3.pGlow : p.foam ? R3.pFoam : R3.pSmoke;
    pushPart(S, p.x, p.z, p.y, p.size * (1 + t * (p.grow || 0)), p.c[0], p.c[1], p.c[2], p.a * (1 - t), p.seed || 0.5);
  }
  for (const S of [R3.pSmoke, R3.pFoam, R3.pGlow]) {
    S.g.instanceCount = S.n;
    /* on n'envoie à la carte que les particules vivantes, pas tout le réservoir */
    if (!S.n) continue;
    S.pos.updateRange.count = S.n * 3; S.col.updateRange.count = S.n * 4; S.size.updateRange.count = S.n; S.seed.updateRange.count = S.n;
    S.pos.needsUpdate = S.col.needsUpdate = S.size.needsUpdate = S.seed.needsUpdate = true;
  }
}

function extraPart(o) { if (R3.extra.length < 1500) R3.extra.push(Object.assign({ age: 0 }, o)); }

/* ---------- post-traitement ---------- */

const QUAD_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BRIGHT_FS = `uniform sampler2D tIn; varying vec2 vUv;
void main() { vec3 c = texture2D(tIn, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.85, 1.6, l), 1.0); }`;
const BLUR_FS = `uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv;
void main() {
  vec3 s = texture2D(tIn, vUv).rgb * 0.227;
  s += (texture2D(tIn, vUv + uDir * 1.385).rgb + texture2D(tIn, vUv - uDir * 1.385).rgb) * 0.316;
  s += (texture2D(tIn, vUv + uDir * 3.23).rgb + texture2D(tIn, vUv - uDir * 3.23).rgb) * 0.07;
  gl_FragColor = vec4(s, 1.0);
}`;
/* la profondeur de champ des menus : le navire montré est net, le lointain et le tout proche
 * s'adoucissent comme dans un objectif. Le flou est fait en quart de définition, pondéré par
 * le flou de chaque point : un navire net ne bave pas sur le fond flou derrière lui. */
const DOF_GLSL = `uniform sampler2D tDepth; uniform float uNear, uFar, uFocus; uniform vec2 uDPx;
float dofZ(float d) { return uNear * uFar / (uFar - d * (uFar - uNear)); }
float dofCoc(vec2 uv) {
  /* la profondeur la plus proche alentour : les haubans fins restent nets */
  float d = texture2D(tDepth, uv).x;
  d = min(d, min(texture2D(tDepth, uv + vec2(uDPx.x, 0.0)).x, texture2D(tDepth, uv - vec2(uDPx.x, 0.0)).x));
  d = min(d, min(texture2D(tDepth, uv + vec2(0.0, uDPx.y)).x, texture2D(tDepth, uv - vec2(0.0, uDPx.y)).x));
  float z = dofZ(d);
  return max(smoothstep(uFocus * 1.25, uFocus * 3.4, z), smoothstep(uFocus * 0.78, uFocus * 0.42, z) * 0.7);
}`;
const DOF_PRE_FS = `uniform sampler2D tIn; uniform vec2 uPx; varying vec2 vUv;
${DOF_GLSL}
void main() {
  vec3 c = (texture2D(tIn, vUv + uPx * vec2(-1.0, -1.0)).rgb + texture2D(tIn, vUv + uPx * vec2(1.0, -1.0)).rgb
          + texture2D(tIn, vUv + uPx * vec2(-1.0, 1.0)).rgb + texture2D(tIn, vUv + uPx * vec2(1.0, 1.0)).rgb) * 0.25;
  float k = dofCoc(vUv) + 0.002;
  gl_FragColor = vec4(c * k, k);
}`;
const BLUR4_FS = `uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv;
void main() {
  vec4 s = texture2D(tIn, vUv) * 0.227;
  s += (texture2D(tIn, vUv + uDir * 1.385) + texture2D(tIn, vUv - uDir * 1.385)) * 0.316;
  s += (texture2D(tIn, vUv + uDir * 3.23) + texture2D(tIn, vUv - uDir * 3.23)) * 0.07;
  gl_FragColor = s;
}`;
const COMP_FS = `uniform sampler2D tScene, tBloomA, tBloomB, tAO, tDof; uniform float uBloom, uExposure, uTime, uFade, uAO, uDof; uniform vec3 uGrade; varying vec2 vUv;
${DOF_GLSL}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  if (uDof > 0.0) {
    vec4 b = texture2D(tDof, vUv);
    c = mix(c, b.rgb / max(b.a, 1e-3), clamp(dofCoc(vUv) * uDof, 0.0, 1.0) * smoothstep(0.004, 0.05, b.a));
  }
  if (uAO > 0.0) c *= mix(1.0, texture2D(tAO, vUv).x, uAO);
  c += (texture2D(tBloomA, vUv).rgb * 0.6 + texture2D(tBloomB, vUv).rgb * 0.9) * uBloom;
  c *= uExposure * uGrade;
  c = aces(c * 0.9);
  c = pow(c, vec3(1.0 / 2.2));
  /* un peu de contraste, de saturation, le vignettage et un grain léger */
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.12);
  c = (c - 0.5) * 1.06 + 0.5;
  vec2 q = vUv - 0.5;
  c *= 1.0 - dot(q, q) * 0.85;
  c += (hash(vUv * 977.0 + uTime) - 0.5) * 0.018;
  gl_FragColor = vec4(c * uFade, 1.0);
}`;

/* ---------- occlusion ambiante (SSAO), en demi-définition ----------
 * Une passe de profondeur seule (sans les particules ni les transparents), puis
 * l'occlusion dans un hémisphère autour de chaque point, adoucie par un flou qui
 * respecte les arêtes. Elle assombrit les recoins : pied des bastingages, contact
 * de la coque avec l'eau, dessous des voiles, vallons et lisières des forêts. */
const AO_FS = `
uniform sampler2D tDepth; uniform mat4 uProj, uInvProj; uniform vec2 uRes; uniform float uRadius, uPower; uniform vec3 uKernel[14];
varying vec2 vUv;
vec3 viewPos(vec2 uv) { float d = texture2D(tDepth, uv).x; vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float d0 = texture2D(tDepth, vUv).x;
  if (d0 >= 0.99999) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv);
  vec2 px = 1.0 / uRes;
  vec3 pl = viewPos(vUv - vec2(px.x, 0.0)), pr = viewPos(vUv + vec2(px.x, 0.0));
  vec3 pd = viewPos(vUv - vec2(0.0, px.y)), pu = viewPos(vUv + vec2(0.0, px.y));
  vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl;
  vec3 dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
  vec3 N = normalize(cross(dx, dy));
  float a = hash(vUv * uRes) * 6.2832;
  vec3 rv = vec3(cos(a), sin(a), 0.0);
  vec3 T = normalize(rv - N * dot(rv, N)), B = cross(N, T);
  float occ = 0.0;
  for (int i = 0; i < 14; i++) {
    vec3 S = P + (T * uKernel[i].x + B * uKernel[i].y + N * uKernel[i].z) * uRadius;
    vec4 c = uProj * vec4(S, 1.0);
    vec2 suv = c.xy / c.w * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.y < 0.0 || suv.x > 1.0 || suv.y > 1.0) continue;
    float sz = viewPos(suv).z;
    float range = smoothstep(0.0, 1.0, uRadius / max(0.001, abs(P.z - sz)));
    occ += (sz >= S.z + uRadius * 0.04 ? 1.0 : 0.0) * range;
  }
  float ao = pow(clamp(1.0 - occ / 14.0, 0.0, 1.0), uPower);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`;
const AO_BLUR_FS = `
uniform sampler2D tAO, tDepth; uniform vec2 uDir; uniform float uDepthK;
varying vec2 vUv;
void main() {
  float d0 = texture2D(tDepth, vUv).x;
  float s = 0.0, w = 0.0;
  for (int i = -3; i <= 3; i++) {
    vec2 uv = vUv + uDir * float(i);
    float d = texture2D(tDepth, uv).x;
    float k = exp(-float(i * i) / 8.0) * exp(-abs(d - d0) * uDepthK);
    s += texture2D(tAO, uv).x * k; w += k;
  }
  float v = s / max(w, 1e-4);
  gl_FragColor = vec4(v, v, v, 1.0);
}`;

function buildAO() {
  const dt = new THREE.DepthTexture(4, 4);
  dt.type = THREE.UnsignedIntType;
  R3.rtDepth = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true, depthTexture: dt, type: THREE.UnsignedByteType });
  R3.rtAO = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
  R3.rtAO2 = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
  R3.depthMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  /* un noyau d'échantillons dans l'hémisphère, plus serré près du centre */
  const kernel = [];
  const rr = makeRng(42);
  for (let i = 0; i < 14; i++) {
    const v = new THREE.Vector3(rr.sym(1), rr.sym(1), rr.range(0.15, 1)).normalize();
    const t = i / 14, sc = 0.15 + 0.85 * t * t;
    kernel.push(v.multiplyScalar(sc * rr.range(0.5, 1)));
  }
  R3.ao = new THREE.ShaderMaterial({
    vertexShader: QUAD_VS, fragmentShader: AO_FS, depthTest: false, depthWrite: false,
    uniforms: { tDepth: { value: dt }, uProj: { value: new THREE.Matrix4() }, uInvProj: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2(4, 4) }, uRadius: { value: 9 }, uPower: { value: 1.6 }, uKernel: { value: kernel } },
  });
  R3.aoBlur = new THREE.ShaderMaterial({
    vertexShader: QUAD_VS, fragmentShader: AO_BLUR_FS, depthTest: false, depthWrite: false,
    uniforms: { tAO: { value: null }, tDepth: { value: dt }, uDir: { value: new THREE.Vector2() }, uDepthK: { value: 3000 } },
  });
  R3.aoOn = true;
}

function renderAO() {
  const r = R3.r, cam = R3.camera, scene = R3.scene;
  /* la profondeur des objets opaques seulement */
  cam.layers.set(0);
  scene.overrideMaterial = R3.depthMat;
  const bg = scene.background; scene.background = null;
  r.setRenderTarget(R3.rtDepth);
  r.clear();
  r.render(scene, cam);
  scene.overrideMaterial = null; scene.background = bg;
  cam.layers.enable(1);
  const u = R3.ao.uniforms;
  u.uProj.value.copy(cam.projectionMatrix);
  u.uInvProj.value.copy(cam.projectionMatrixInverse);
  u.uRes.value.set(R3.rtAO.width, R3.rtAO.height);
  /* le rayon suit le zoom en jeu ; dans les menus, la perspective rapproche les navires */
  u.uRadius.value = R3.camMode === 'cine' ? 5 : 9;
  R3.aoBlur.uniforms.uDepthK.value = cam.isOrthographicCamera ? 4000 : 20000;
  pass(R3.ao, R3.rtAO);
  R3.aoBlur.uniforms.tAO.value = R3.rtAO.texture; R3.aoBlur.uniforms.uDir.value.set(1.5 / R3.rtAO.width, 0); pass(R3.aoBlur, R3.rtAO2);
  R3.aoBlur.uniforms.tAO.value = R3.rtAO2.texture; R3.aoBlur.uniforms.uDir.value.set(0, 1.5 / R3.rtAO.height); pass(R3.aoBlur, R3.rtAO);
}

const DOF_U = { tDepth: { value: null }, uNear: { value: 1 }, uFar: { value: 1000 }, uFocus: { value: 600 }, uDPx: { value: new THREE.Vector2() } };
function renderDof() {
  const C = R3.cine, cam = R3.camera, pu = R3.post.uniforms;
  DOF_U.uNear.value = cam.near; DOF_U.uFar.value = cam.far; DOF_U.uFocus.value = C.fd;
  DOF_U.uDPx.value.set(1 / R3.rtDepth.width, 1 / R3.rtDepth.height);
  R3.dofPre.uniforms.tIn.value = R3.rtMain.texture;
  R3.dofPre.uniforms.uPx.value.set(1.5 / R3.rtMain.width, 1.5 / R3.rtMain.height);
  pass(R3.dofPre, R3.rtE);
  const w = R3.rtE.width, h = R3.rtE.height, b = R3.blur4.uniforms;
  const bp = (src, dst, dx, dy) => { b.tIn.value = src.texture; b.uDir.value.set(dx / w, dy / h); pass(R3.blur4, dst); };
  bp(R3.rtE, R3.rtF, 1, 0); bp(R3.rtF, R3.rtE, 0, 1);
  bp(R3.rtE, R3.rtF, 2, 0); bp(R3.rtF, R3.rtE, 0, 2);
  pu.tDof.value = R3.rtE.texture; pu.uDof.value = C.dk;
}

function buildPost() {
  const opt = { type: THREE.HalfFloatType, depthBuffer: true };
  R3.rtMain = new THREE.WebGLRenderTarget(4, 4, Object.assign({ samples: 4 }, opt));
  const small = { type: THREE.HalfFloatType, depthBuffer: false };
  R3.rtA = new THREE.WebGLRenderTarget(4, 4, small); R3.rtB = new THREE.WebGLRenderTarget(4, 4, small);
  R3.rtC = new THREE.WebGLRenderTarget(4, 4, small); R3.rtD = new THREE.WebGLRenderTarget(4, 4, small);
  R3.rtE = new THREE.WebGLRenderTarget(4, 4, small); R3.rtF = new THREE.WebGLRenderTarget(4, 4, small);
  /* le reflet des navires et des côtes dans l'eau : la scène vue d'une caméra miroir sous la surface */
  R3.rtRefl = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true });
  R3.reflCamP = new THREE.PerspectiveCamera(); R3.reflCamO = new THREE.OrthographicCamera();
  R3.reflMat = new THREE.Matrix4(); R3.reflPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.3);
  R3.reflOn = true;
  R3.quadScene = new THREE.Scene();
  R3.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  R3.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  R3.quad.frustumCulled = false;
  R3.quadScene.add(R3.quad);
  R3.bright = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: BRIGHT_FS, uniforms: { tIn: { value: null } }, depthTest: false, depthWrite: false });
  R3.blur = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: BLUR_FS, uniforms: { tIn: { value: null }, uDir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
  R3.post = new THREE.ShaderMaterial({
    vertexShader: QUAD_VS, fragmentShader: COMP_FS, depthTest: false, depthWrite: false,
    uniforms: Object.assign({ tScene: { value: null }, tBloomA: { value: null }, tBloomB: { value: null }, tAO: { value: null }, uAO: { value: 0 }, uBloom: { value: 0.6 }, uExposure: { value: 1 }, uTime: { value: 0 }, uFade: { value: 1 }, uGrade: { value: new THREE.Vector3(1, 1, 1) },
      tDof: { value: null }, uDof: { value: 0 } }, DOF_U),
  });
  R3.dofPre = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: DOF_PRE_FS, depthTest: false, depthWrite: false, uniforms: Object.assign({ tIn: { value: null }, uPx: { value: new THREE.Vector2() } }, DOF_U) });
  R3.blur4 = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: BLUR4_FS, depthTest: false, depthWrite: false, uniforms: { tIn: { value: null }, uDir: { value: new THREE.Vector2() } } });
  buildAO();
  DOF_U.tDepth.value = R3.rtDepth.depthTexture;
}

function pass(mat, target) {
  R3.quad.material = mat;
  R3.r.setRenderTarget(target);
  R3.r.render(R3.quadScene, R3.quadCam);
}

function renderFrame() {
  const r = R3.r;
  const pu = R3.post.uniforms;
  /* la carte des ombres ne se dessine qu'une fois par image, par la première passe qui en a
   * l'usage (l'occlusion, sinon l'image elle-même) : les passes suivantes reprennent la même */
  r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = true;
  if (R3.aoOn) { renderAO(); pu.tAO.value = R3.rtAO.texture; pu.uAO.value = 0.85; } else pu.uAO.value = 0;
  R3.water.material.uniforms.uReflOn.value = R3.reflOn && renderReflection() ? 1 : 0;
  r.setRenderTarget(R3.rtMain);
  r.render(R3.scene, R3.camera);
  pu.uTime.value = (W.t % 100);
  pu.tScene.value = R3.rtMain.texture;
  if (R3.aoOn && R3.camMode === 'cine' && R3.camera.isPerspectiveCamera && R3.cine.dk > 0.02) renderDof(); else pu.uDof.value = 0;
  if (R3.noBloom) { pu.uBloom.value = 0; pu.tBloomA.value = R3.rtMain.texture; pu.tBloomB.value = R3.rtMain.texture; pass(R3.post, null); return; }
  R3.bright.uniforms.tIn.value = R3.rtMain.texture; pass(R3.bright, R3.rtA);
  const blurPass = (src, dst, dx, dy, w, h) => { R3.blur.uniforms.tIn.value = src.texture; R3.blur.uniforms.uDir.value.set(dx / w, dy / h); pass(R3.blur, dst); };
  const w2 = R3.rtA.width, h2 = R3.rtA.height, w4 = R3.rtC.width, h4 = R3.rtC.height;
  blurPass(R3.rtA, R3.rtB, 1, 0, w2, h2); blurPass(R3.rtB, R3.rtA, 0, 1, w2, h2);
  blurPass(R3.rtA, R3.rtC, 1, 0, w4, h4); blurPass(R3.rtC, R3.rtD, 0, 1, w4, h4);
  blurPass(R3.rtD, R3.rtC, 2, 0, w4, h4); blurPass(R3.rtC, R3.rtD, 0, 2, w4, h4);
  pu.tBloomA.value = R3.rtA.texture; pu.tBloomB.value = R3.rtD.texture;
  pass(R3.post, null);
}

const _rv = { cp: new THREE.Vector3(), look: new THREE.Vector3(), rot: new THREE.Matrix4(), cc: new THREE.Color(), pl: new THREE.Plane(), C: new THREE.Vector4(), q: new THREE.Vector4(), inv: new THREE.Matrix4() };
/* le plan de l'eau devient le plan proche de la caméra miroir (le cadrage oblique d'E. Lengyel) :
 * ce qui est sous l'eau est écarté par la carte graphique avant même d'être dessiné. Un plan de coupe
 * dans les shaders faisait le même travail point par point, et doublait chaque programme. */
function obliqueNear(c, plane) {
  const pl = _rv.pl.copy(plane).applyMatrix4(c.matrixWorldInverse);
  const C = _rv.C.set(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant);
  const e = c.projectionMatrix.elements;
  const q = _rv.q.set(Math.sign(C.x), Math.sign(C.y), 1, 1).applyMatrix4(_rv.inv.copy(c.projectionMatrix).invert());
  const k = C.dot(q);
  if (!(k > 1e-12) || C.w >= 0) return false;
  C.multiplyScalar(2 / k);
  e[2] = C.x - e[3]; e[6] = C.y - e[7]; e[10] = C.z - e[11]; e[14] = C.w - e[15];
  c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
  return true;
}
function renderReflection() {
  const r = R3.r, cam = R3.camera;
  const vc = cam.isPerspectiveCamera ? R3.reflCamP : R3.reflCamO;
  const cp = _rv.cp.setFromMatrixPosition(cam.matrixWorld);
  if (cp.y < 1) return false;
  vc.copy(cam, false);
  vc.layers.set(0);
  _rv.rot.extractRotation(cam.matrixWorld);
  const look = _rv.look.set(0, 0, -1).applyMatrix4(_rv.rot).add(cp);
  /* la caméra miroir : sous la surface, regardant le reflet de ce que regarde la vraie */
  vc.position.set(cp.x, -cp.y, cp.z);
  vc.up.set(0, 1, 0).applyMatrix4(_rv.rot); vc.up.y = -vc.up.y;
  vc.lookAt(look.x, -look.y, look.z);
  vc.updateMatrixWorld();
  vc.projectionMatrix.copy(cam.projectionMatrix); vc.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
  R3.reflMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
  const u = R3.water.material.uniforms;
  u.uReflMat.value.copy(R3.reflMat);
  u.tRefl.value = R3.rtRefl.texture;
  /* on ne garde que ce qui dépasse de l'eau, sans la mer ni le ciel ni les particules */
  const auto = r.shadowMap.autoUpdate, need = r.shadowMap.needsUpdate, clip = r.clippingPlanes;
  r.getClearColor(_rv.cc); const ca = r.getClearAlpha();
  r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = false;
  if (!obliqueNear(vc, R3.reflPlane)) r.clippingPlanes = [R3.reflPlane];
  R3.water.visible = false; R3.sky.visible = false;
  r.setRenderTarget(R3.rtRefl);
  r.setClearColor(0x000000, 0); r.clear();
  r.render(R3.scene, vc);
  R3.water.visible = true; R3.sky.visible = true;
  r.clippingPlanes = clip; r.shadowMap.autoUpdate = auto; r.shadowMap.needsUpdate = need;
  r.setClearColor(_rv.cc, ca);
  return true;
}

/* ---------- ombres portées sur l'eau (la mer ne reçoit pas les ombres) ---------- */

let BLOB_TEX = null;
function blobShadow(len, wid) {
  if (!BLOB_TEX) {
    BLOB_TEX = canvasTex(128, 128, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2 - 1);
      g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.55, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    BLOB_TEX.colorSpace = THREE.NoColorSpace;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: BLOB_TEX, transparent: true, depthWrite: false, opacity: 0.8 }));
  m.layers.set(1);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(len, wid, 1);
  m.renderOrder = 1;
  return m;
}

/* anneau lumineux posé sur l'eau (caisses, objectifs) */
let RING_TEX = null;
function glowRing(col, size) {
  if (!RING_TEX) {
    RING_TEX = canvasTex(128, 128, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.9)'); g.addColorStop(0.7, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: RING_TEX, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.layers.set(1);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(size, size, 1);
  m.position.y = 0.9;
  m.renderOrder = 2;
  return m;
}

/* ---------- mouettes ----------
 * Des goélands à queue noire (umineko), communs sur les côtes d'Ezo : ils tournent
 * au-dessus des navires, battent des ailes puis planent, et leur ombre court sur l'eau. */
function buildBirds() {
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.8 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x7d858c, roughness: 0.8 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe0b030, roughness: 0.6 });
  R3.birds = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.6, 3, 6), white);
    body.rotation.z = Math.PI / 2; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 6, 5), white); head.position.set(1.9, 0.25, 0); g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 4), yellow); beak.rotation.z = -Math.PI / 2; beak.position.set(2.75, 0.2, 0); g.add(beak);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.0), black); tail.position.set(-1.9, 0, 0); g.add(tail);
    const wings = [];
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0.3, 0.2, side * 0.4);
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 3.6), grey); w.position.z = side * 1.8; w.castShadow = true; pivot.add(w);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.6), black); tip.position.set(-0.2, 0, side * 4.3); tip.rotation.y = side * 0.35; tip.castShadow = true; pivot.add(tip);
      g.add(pivot);
      wings.push([pivot, side]);
    }
    g.scale.setScalar(1.6);
    g.layers.enable(0);
    R3.scene.add(g);
    R3.birds.push({ g, wings, a: Math.random() * TAU, R: 0, ph: Math.random() * 10, cx: 0, cy: 0, h: 0, init: false, dir: Math.random() < 0.5 ? 1 : -1, sp: 0.8 + Math.random() * 0.5 });
  }
}

function updateBirds(dt) {
  if (!R3.birds) buildBirds();
  const cine = R3.camMode === 'cine', night = R3.ambName === 'nuit';
  for (const b of R3.birds) {
    b.g.visible = !night && !G.noBirds;
    if (!b.g.visible) continue;
    const wantR = cine ? 90 + (b.ph % 1) * 140 : 150 + (b.ph % 1) * 220;
    const wantH = cine ? 45 + (b.ph * 7 % 1) * 50 : 120 + (b.ph * 7 % 1) * 70;
    if (!b.init) { b.cx = cam.x; b.cy = cam.y; b.R = wantR; b.h = wantH; b.init = true; }
    /* le cercle suit la vue, sans hâte */
    const k = 1 - Math.exp(-dt * 0.35);
    b.cx += (cam.x - b.cx) * k; b.cy += (cam.y - b.cy) * k;
    b.R += (wantR - b.R) * k; b.h += (wantH - b.h) * k;
    const v = 46 * b.sp;
    b.a += b.dir * v / Math.max(30, b.R) * dt;
    const R = b.R * (1 + 0.15 * Math.sin(W.t * 0.23 + b.ph));
    const x = b.cx + Math.cos(b.a) * R, z = b.cy + Math.sin(b.a) * R;
    const y = b.h + Math.sin(W.t * 0.5 + b.ph) * 8;
    const heading = b.a + b.dir * Math.PI / 2;
    b.g.position.set(x, y, z);
    b.g.rotation.set(-b.dir * 0.32, -heading, 0, 'YXZ');
    /* battements par séries, puis vol plané, ailes un peu relevées */
    const flapping = Math.sin(W.t * 0.45 + b.ph * 3) > 0.15;
    const ang = flapping ? Math.sin(W.t * 8.5 + b.ph * 5) * 0.6 : 0.1;
    for (const [pivot, side] of b.wings) pivot.rotation.x = -side * ang;
  }
}

/* ---------- sillages ---------- */

let WAKE_TEX = null;
function wakeTexture() {
  if (WAKE_TEX) return WAKE_TEX;
  WAKE_TEX = canvasTex(128, 256, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / (w - 1), v = y / h, e = Math.abs(u - 0.5) * 2;
      /* deux lisières d'écume, le remous du milieu, et les vagues en chevrons du sillage de Kelvin */
      const edge = Math.exp(-Math.pow((1 - e - 0.07) / 0.045, 2));
      const mid = Math.exp(-Math.pow(e / 0.3, 2)) * 0.55;
      const chev = Math.pow(Math.max(0, Math.sin((v * 6 - e * 1.4) * Math.PI * 2)), 6) * 0.32 * smooth(clamp((e - 0.25) / 0.6, 0, 1)) * (1 - smooth(clamp((e - 0.9) / 0.1, 0, 1)));
      const n = vnoise(x * 0.3, y * 0.12) * 0.6 + vnoise(x * 0.8, y * 0.4) * 0.4;
      const a = clamp((edge * 0.95 + mid) * (0.35 + n * 0.9) + chev * (0.6 + n * 0.6), 0, 1);
      const o = (y * w + x) * 4;
      img.data[o] = 236; img.data[o + 1] = 244; img.data[o + 2] = 248; img.data[o + 3] = a * 255;
    }
    c.putImageData(img, 0, 0);
  });
  WAKE_TEX.wrapT = THREE.RepeatWrapping;
  return WAKE_TEX;
}

function makeWake() {
  const N = 48;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 2 * 4), 4).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(N * 2 * 2), 2).setUsage(THREE.DynamicDrawUsage));
  const idx = [];
  for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: wakeTexture(), vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  m.layers.set(1);
  m.frustumCulled = false;
  m.renderOrder = 1;
  m.userData.N = N;
  return m;
}

function updateWake(m, s) {
  const tr = s.trail, N = m.userData.N;
  const P = m.geometry.attributes.position.array, C = m.geometry.attributes.color.array, U = m.geometry.attributes.uv.array;
  const pts = [];
  const [sx_, sy_] = shipToWorld(s, -s.spec.L * 0.46, 0);
  pts.push([sx_, sy_, 0, clamp(Math.abs(s.v) / 200, 0, 1)]);
  for (let i = tr.length - 1; i >= 0 && pts.length < N; i--) {
    const age = W.t - tr[i].t;
    if (age > 3.2) break;
    /* un saut (le navire est passé d'un bord à l'autre de l'arène) coupe le sillage */
    const lp = pts[pts.length - 1];
    if (Math.abs(tr[i].x - lp[0]) + Math.abs(tr[i].y - lp[1]) > 120) break;
    pts.push([tr[i].x, tr[i].y, age, tr[i].v]);
  }
  const n = pts.length;
  let acc = s.wakeDist || 0;
  s.wakeDist = acc;
  let along = 0;
  for (let i = 0; i < N; i++) {
    const k = Math.min(i, n - 1);
    const q = pts[k];
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    if (i > 0 && i < n) along += Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]);
    const w = s.wid * (0.5 + q[2] * 0.9) * (0.6 + 0.4 * q[3]);
    const al = i >= n ? 0 : 0.6 * q[3] * Math.pow(Math.max(0, 1 - q[2] / 3.2), 1.6) * Math.min(1, q[2] * 6 + 0.4);
    P[i * 6] = q[0] - dy * w; P[i * 6 + 1] = 0.6; P[i * 6 + 2] = q[1] + dx * w;
    P[i * 6 + 3] = q[0] + dy * w; P[i * 6 + 4] = 0.6; P[i * 6 + 5] = q[1] - dx * w;
    const v = along / 140;
    U[i * 4] = 0; U[i * 4 + 1] = v; U[i * 4 + 2] = 1; U[i * 4 + 3] = v;
    for (let k2 = 0; k2 < 2; k2++) { C[i * 8 + k2 * 4] = 1; C[i * 8 + k2 * 4 + 1] = 1; C[i * 8 + k2 * 4 + 2] = 1; C[i * 8 + k2 * 4 + 3] = al; }
  }
  m.geometry.attributes.position.needsUpdate = true;
  m.geometry.attributes.color.needsUpdate = true;
  m.geometry.attributes.uv.needsUpdate = true;
}

/* ---------- les objets du jeu ---------- */

function keep(o, make) {
  if (!o._m) { o._m = make(); R3.scene.add(o._m); R3.live.add(o._m); cloudPatchObj(o._m); }
  o._m.userData.seen = R3.frame;
  return o._m;
}

/* l'écume au ras de la coque : un liseré blanc, irrégulier, tout autour de la flottaison */
let HUGFOAM_TEX = null;
function hugFoamTexture() {
  if (HUGFOAM_TEX) return HUGFOAM_TEX;
  HUGFOAM_TEX = canvasTex(256, 128, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / (w - 1) * 2 - 1, v = y / (h - 1) * 2 - 1;
      const r = Math.hypot(u, v);
      const n = vnoise(x * 0.12, y * 0.2) * 0.6 + vnoise(x * 0.4, y * 0.6) * 0.4;
      /* bord intérieur (la coque) vers 0.62, l'écume s'efface vers l'extérieur */
      const ring = smooth(clamp((r - 0.5) / 0.14, 0, 1)) * (1 - smooth(clamp((r - 0.66) / (0.34 * (0.5 + n)), 0, 1)));
      const o = (y * w + x) * 4;
      img.data[o] = 238; img.data[o + 1] = 245; img.data[o + 2] = 248; img.data[o + 3] = clamp(ring * (0.45 + n * 0.75), 0, 1) * 255;
    }
    c.putImageData(img, 0, 0);
  });
  return HUGFOAM_TEX;
}
/* autour des débris : des plaques d'écume déchiquetées, pas un anneau régulier */
let DFOAM_TEX = null;
function debrisFoamTexture() {
  if (DFOAM_TEX) return DFOAM_TEX;
  DFOAM_TEX = canvasTex(160, 160, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / (w - 1) * 2 - 1, v = y / (h - 1) * 2 - 1, r = Math.hypot(u, v);
      const n = vnoise(x * 0.09, y * 0.09) * 0.55 + vnoise(x * 0.3, y * 0.3) * 0.3 + vnoise(x * 0.8, y * 0.8) * 0.15;
      const band = Math.exp(-Math.pow((r - 0.6) / 0.2, 2));
      const a = smooth(clamp((n * band * 1.7 - 0.42) / 0.3, 0, 1));
      const o = (y * w + x) * 4;
      img.data[o] = 238; img.data[o + 1] = 245; img.data[o + 2] = 248; img.data[o + 3] = a * 255;
    }
    c.putImageData(img, 0, 0);
  });
  return DFOAM_TEX;
}

function makeHugFoam(len, wid, tex) {
  const g = new THREE.PlaneGeometry(len, wid);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex || hugFoamTexture(), transparent: true, depthWrite: false, opacity: 0.5 }));
  m.position.y = 0.3;
  m.renderOrder = 1;
  m.layers.set(1);
  return m;
}

/* la moustache d'étrave : deux traînées d'écume en V, plus franches avec la vitesse */
let BOW_TEX = null;
function bowWaveTexture() {
  if (BOW_TEX) return BOW_TEX;
  BOW_TEX = canvasTex(128, 128, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = y / (h - 1), u = Math.abs(x / (w - 1) - 0.5) * 2;      // v : de l'étrave (0) vers l'arrière (1)
      const line = 0.12 + v * 0.85;                                       // le V s'ouvre vers l'arrière
      const d = Math.abs(u - line);
      const n = vnoise(x * 0.25, y * 0.18) * 0.6 + 0.4;
      const a = Math.exp(-Math.pow(d / (0.05 + v * 0.1), 2)) * (1 - v) * n + (u < line ? 0.1 * (1 - v) * n : 0);
      const o = (y * w + x) * 4;
      img.data[o] = 240; img.data[o + 1] = 246; img.data[o + 2] = 250; img.data[o + 3] = clamp(a, 0, 1) * 255;
    }
    c.putImageData(img, 0, 0);
  });
  return BOW_TEX;
}
function makeBowWave(L, B) {
  const len = L * 0.42, wd = B * 2.1;
  const g = new THREE.PlaneGeometry(wd, len);
  g.rotateX(-Math.PI / 2);                 // couché : la longueur suit -z
  g.rotateY(-Math.PI / 2);                 // puis le long de l'axe du navire, la pointe à l'étrave
  g.translate(L / 2 - len / 2 + 0.5, 0.25, 0);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: bowWaveTexture(), transparent: true, depthWrite: false, opacity: 0 }));
  m.layers.set(1);
  m.renderOrder = 1;
  return m;
}

const breatheNear = (s) => onScreen(s.x, s.y, 200);

function trimSail(theta) {
  const a = clamp((Math.abs(theta) - 30 * DEG) * 0.6, 8 * DEG, 80 * DEG);
  return -Math.sign(theta || 1) * a;
}

function syncShip(s, dt) {
  dt = dt || 0.016;
  const root = keep(s, () => {
    const g = buildShipModel(s.spec);
    g.scale.setScalar(SCALE);
    const wk = makeWake();
    R3.scene.add(wk);
    g.userData.wake = wk;
    g.userData.bow = makeBowWave(s.spec.L, s.spec.B);
    g.add(g.userData.bow);
    /* l'écume au contact de la coque : une ellipse un peu plus grande que la flottaison */
    g.userData.hug = makeHugFoam(s.spec.L * 1.47, s.spec.B * 1.8);
    g.add(g.userData.hug);
    return g;
  });
  const P = root.userData.parts;
  const vis = !s.sunk;
  root.visible = vis;
  root.userData.wake.visible = vis;
  if (!vis) return;
  /* la houle soulève davantage les petits navires, et plus fort quand la mer grossit */
  const small = clamp(50 / s.spec.L, 0.7, 1.6), sea = 0.55 + 0.25 * SEA.sea;
  const hf = clamp(s.hull / s.hullMax, 0, 1);
  const bob = (Math.sin(W.t * 1.3 + s.id) * 0.6 + Math.sin(W.t * 0.71 + s.id * 3) * 0.35) * sea * small;
  /* un navire très touché s'enfonce et prend de la bande */
  const settle = hf < 0.5 ? (0.5 - hf) * 3 : 0, list = hf < 0.5 ? (0.5 - hf) * 0.16 * (s.id % 2 ? 1 : -1) : 0;
  /* échoué (corsaire) : il s'assied sur la roche au lieu de couler, couché sur un bord, l'étrave haute */
  const agr = s.aground ? smooth(clamp(s.sinking / 1.4, 0, 1)) : 0;
  root.position.set(s.x, bob - settle - (s.sinking ? (s.aground ? Math.min(s.sinking, 0.5) : s.sinking) * 7 : 0), s.y);
  root.rotation.y = -s.h;
  /* roulis, tangage, gîte dans les virages, coup de roulis d'une bordée */
  /* hors du mode histoire, un voilier qui vire trop court se couche à vue d'œil (s.gite) */
  const gr = Math.min(s.gite || 0, 1.25), gk = gr ? 0.55 * gr * gr * (s.w < 0 ? -1 : 1) : 0;
  s.heel = lerp(s.heel || 0, -(s.w || 0) * Math.abs(s.v) / 380 - gk, 1 - Math.exp(-dt * 3));
  s.kick = (s.kick || 0) * Math.exp(-dt * 2.5);
  const roll = Math.sin(W.t * 1.4 + s.id) * 0.045 * sea * small + Math.sin(W.t * 0.53 + s.id * 5) * 0.02 * sea;
  /* il chavire : il se couche tout à fait, les vergues dans l'eau */
  let capR = 0;
  if (s.capsized) {
    s.capT = (s.capT || 0) + dt;
    capR = s.capSide * 1.95 * smooth(clamp(s.capT / 1.3, 0, 1));
    if (s.capT > 0.45 && s.capT < 1.6 && Math.random() < 0.8) {
      const u = rndSym(s.spec.L * 0.4), [x, y] = shipToWorld(s, u, -s.capSide * s.spec.B * rnd(2.6, 0.8));
      fx.push({ k: 'spray', x, y, z0: 1, vz: rnd(9, 4), vx: rndSym(20), vy: rndSym(20), drag: 0.6, r: rnd(1.3, 0.6), grow: 0, life: 0.9, age: 0, a: 0.7 });
      fx.push({ k: 'foam', x, y, vx: rndSym(25), vy: rndSym(25), drag: 1.2, r: 2.5, grow: 6, life: 2.2, age: 0, a: 0.7 });
    }
  }
  P.tilt.rotation.x = roll + s.heel + list + s.kick * Math.cos(W.t * 6) + (s.grip || 0) + (s.sinking ? (s.aground ? 0.34 * agr * (s.id % 2 ? 1 : -1) : s.sinking * 0.12 * (s.capsized ? 0.3 : 1)) : 0) + capR;
  const acc = (s.v - (s.vPrev || s.v)) / dt;
  s.pitchA = lerp(s.pitchA || 0, clamp(-acc * 0.0012, -0.03, 0.03), 1 - Math.exp(-dt * 2));
  P.tilt.rotation.z = Math.sin(W.t * 0.9 + s.id * 2) * 0.016 * sea * small + s.pitchA - (s.sinking ? (s.aground ? -0.07 * agr : s.sinking * 0.07) : 0);
  s.vPrev = s.v;
  /* la moustache d'étrave */
  const vk = clamp(Math.abs(s.v) / 140, 0, 1);
  root.userData.bow.material.opacity = s.v > 0 && !s.sinking ? vk * 0.5 : 0;
  root.userData.bow.scale.set(1, 1, 0.8 + vk * 0.45);
  root.userData.hug.material.opacity = s.sinking ? 0.7 : 0.2 + vk * 0.3;
  const fk = R3.foamK || 1;
  root.userData.hug.material.color.setScalar(fk); root.userData.bow.material.color.setScalar(fk); root.userData.wake.material.color.setScalar(fk);
  root.userData.hug.position.y = 0.3 - root.position.y / SCALE;
  /* des embruns à l'étrave quand on file vite */
  if (vk > 0.55 && breatheNear(s) && Math.random() < (vk - 0.55) * 2.2 * dt * 30) {
    const side = Math.random() < 0.5 ? 1 : -1;
    const [x, y] = shipToWorld(s, s.spec.L * 0.42, side * s.spec.B * 0.55);
    for (let i = 0; i < 4; i++) {
      const out = rnd(28, 10), vz = rnd(10, 5) * (0.6 + vk * 0.6);
      fx.push({ k: 'spray', x: x + rndSym(1.5), y: y + rndSym(1.5), z0: 1, vz, vx: s.vx * 0.7 - Math.sin(s.h) * side * out, vy: s.vy * 0.7 + Math.cos(s.h) * side * out, drag: 0.6, r: rnd(1.1, 0.5), grow: 0, life: 2 * vz / 14 + 0.05, age: 0, a: 0.6 });
    }
  }
  /* voiles : établies quand on fait route, serrées à l'arrêt ; orientées au vent */
  const windFrom = fromBearing(SEA.wind);
  const theta = wrapA(windFrom - s.h);
  /* en arcade et en corsaire, la voilure se gagne : plus de voiles à chaque cran (SAIL_CAP) ;
   * en histoire, le navire porte sa voilure de 1869 */
  const cust = s.spec.custom, vL = cust ? 0 : G.game === 'story' || !s.up ? -1 : s.up.voilure;
  /* le corsaire : toute la toile qu'il a achetée, une voile de plus à chaque cran (rangs 0 à 11) */
  const cap = cust ? 2 + s.spec.sailLv : vL < 0 ? 3 : SAIL_CAP[clamp(vL, 0, SAIL_CAP.length - 1)];
  /* plus on gagne de voilure, plus les voiles se gonflent : de haut, elles s'ouvrent ; au corsaire,
   * à peine, puisque c'est le nombre des voiles qui grandit */
  const swell = cust ? 1 + s.spec.sailLv * 0.02 : vL > 0 ? 1 + vL * 0.05 : 1;
  const n = s.sinking || s.spec.look.noSail ? 0 : s.yardShow ? cap : Math.abs(s.throttle) < 0.08 && Math.abs(s.v) < 20 ? 0 : s.throttle > 0.55 || s.v > 100 ? cap : Math.min(cap, 2);
  /* on établit et on serre les voiles peu à peu : elles descendent de la vergue, ou glissent le long du mât */
  const breathe = onScreen(s.x, s.y, 300);
  P.sails.forEach((sl, i) => {
    const u = sl.userData, on = u.level < n;
    u.k = clamp((u.k === undefined ? (on ? 1 : 0) : u.k) + (on ? 1 : -1) * dt * 0.8, 0, 1);
    const k = u.k;
    sl.visible = k > 0.03 && !(u.jib && k < 0.5);
    const fill = (breathe ? 1 + Math.sin(W.t * 1.7 + i * 1.3 + s.id) * 0.06 : 1) * swell;
    if (u.gaff || u.tri) sl.scale.set(Math.max(0.03, k), 1, fill);
    else if (!u.jib) sl.scale.set(fill, Math.max(0.03, smooth(k)), 1);
    if (u.furl) u.furl.visible = k < 0.4;
  });
  const brace = clamp(-wrapA(theta + Math.PI), -0.38, 0.38);
  for (const y of P.yards) y.rotation.y = lerp(y.rotation.y, brace, 0.05);
  const lee = theta > 0 ? -1 : 1;
  const boom = lee * clamp((Math.abs(theta) - 30 * DEG) * 0.6, 8 * DEG, 75 * DEG);
  for (const gf of P.gaffs) { gf.rotation.y = lerp(gf.rotation.y, -boom, 0.05); gf.scale.z = lee; }
  for (const j of P.jibs) j.scale.z = lee;
  /* pavillon dans le lit du vent, qui ondule : seulement les pavillons d'emprunt des ruses
   * (américain, russe) ; sinon les navires n'en portent pas */
  const flagKind = s.flag || s.spec.flag || null;
  P.flag.visible = !!flagKind;
  if (flagKind && P.flagKind !== flagKind) { P.flagMesh.material.map = flagTex(flagKind); P.flagMesh.material.needsUpdate = true; P.flagKind = flagKind; }
  if (flagKind) {
    P.flag.rotation.y = -theta;
    if (onScreen(s.x, s.y, 200)) waveFlag(P, W.t + s.id, theta);
  }
  /* coup reçu : la coque rougeoie un instant */
  const hot = s.hitT > 0 ? s.hitT * 4 : 0;
  P.hullMat.emissive.setRGB(hot, hot * 0.3, hot * 0.1);
  /* un navire touché fume, puis brûle */
  // hf : état de la coque, calculé plus haut
  if (!s.sinking && hf < 0.55 && Math.random() < (0.55 - hf) * 1.6) {
    const [x, y] = shipToWorld(s, rndSym(s.spec.L * 0.3), rndSym(s.spec.B * 0.25));
    fx.push({ k: 'smoke', x, y, z0: 8, vx: s.vx * 0.5, vy: s.vy * 0.5, r: rnd(5, 3), grow: 9, life: rnd(3, 1.8), age: 0, a: 0.45, tone: 0, air: true });
    if (hf < 0.3 && Math.random() < 0.7) fx.push({ k: 'fire', x, y, z0: 6, vx: s.vx * 0.6, vy: s.vy * 0.6, drag: 1, r: rnd(6, 3), grow: 2, life: rnd(0.6, 0.3), age: 0, a: 0.9 });
  }
  if (s.sinking && Math.random() < 0.6) {
    const [x, y] = shipToWorld(s, rndSym(s.spec.L * 0.4), rndSym(s.spec.B * 0.3));
    fx.push({ k: 'smoke', x, y, z0: 4, vx: 0, vy: 0, r: rnd(7, 4), grow: 12, life: rnd(3.5, 2), age: 0, a: 0.5, tone: 0, air: true });
    fx.push({ k: 'foam', x, y, vx: rndSym(20), vy: rndSym(20), drag: 1, r: 2, grow: 5, life: 2, age: 0, a: 0.7 });
  }
  /* les roues tournent, les pièces reculent au coup de feu */
  for (const w of P.wheelSpin || []) w.rotation.z = -s.wheelAngle * 1.6;
  /* les pièces : en arcade et en corsaire, elles se montrent cran après cran, et les mantelets
   * des sabords encore vides restent rabattus ; en histoire, l'armement de 1869 */
  if (P.gunSets) {
    const cL = s.spec.custom ? 99 : G.game === 'story' || !s.up ? -1 : s.up.canons;
    if (P.gunCL !== cL) {
      const snap = P.gunCL === undefined;
      P.gunCL = cL;
      for (const g of P.gunSets) g.visible = cL < 0 ? g.userData.hist : g.userData.lvl <= cL;
      for (const l of P.lids) { l.open = cL < 0 ? l.hist : l.lvl <= cL; if (snap) l.h.rotation.x = l.open ? l.openA : l.closedA; }
      P.lidT = snap ? 0 : 2.5;
      /* les pièces montrées, fondues par bord ; les mantelets, fondus une fois immobiles */
      shipBatteries(P);
      shipLids(P, P.lidT <= 0);
    }
    if (P.lidT > 0) {
      P.lidT -= dt;
      for (const l of P.lids) { const want = l.open ? l.openA : l.closedA; l.h.rotation.x = P.lidT <= 0 ? want : lerp(l.h.rotation.x, want, 1 - Math.exp(-dt * 3)); }
      if (P.lidT <= 0) shipLids(P, true);
    }
    const since = W.t - (s.fireT === undefined ? -99 : s.fireT);
    const rec = since < 0 ? 0 : since < 0.07 ? since / 0.07 : Math.exp(-(since - 0.07) * 2.6);
    const d = rec * 0.6;
    for (const g of P.batts) {
      if (g.userData.kind !== 'gun') continue;
      const sd = g.userData.side;
      if (sd === '1') g.position.z = s.fireSide === 1 ? -d : 0;
      else if (sd === '-1') g.position.z = s.fireSide === -1 ? d : 0;
      else if (sd === 'bow') g.position.x = s.fireChase ? -d : 0;
      else if (sd === 'stern') g.position.x = s.fireChase ? d : 0;
    }
  }
  /* les roues battent l'eau ; l'hélice brasse une écume blanche à l'arrière */
  if (!s.sinking && breathe) {
    const sp = s.spec, lk = sp.look, av = Math.abs(s.v);
    if (sp.prop === 'paddle' && av > 15) {
      s.padT = (s.padT || 0) + dt * (3 + av / 18);
      const R_ = lk.paddleR || Math.max(3.6, sp.B * 0.38), pads = [].concat(lk.paddle || 0);
      while (s.padT > 1) {
        s.padT -= 1;
        const px = pads[(Math.random() * pads.length) | 0] * sp.L;
        for (const side of [1, -1]) {
          const [x, y] = shipToWorld(s, px - R_ * 0.4 + rndSym(R_ * 0.4), side * (sp.B / 2 + 2.2));
          const out = side * rnd(25, 8), back = -Math.sign(s.v) * rnd(45, 15);
          fx.push({ k: 'foam', x, y, vx: Math.cos(s.h) * back - Math.sin(s.h) * out + s.vx * 0.3, vy: Math.sin(s.h) * back + Math.cos(s.h) * out + s.vy * 0.3, drag: 1.6, r: 2.2, grow: 5, life: rnd(1.4, 0.8), age: 0, a: 0.75 });
          if (Math.random() < 0.35) {
            const vz = rnd(9, 4);
            fx.push({ k: 'spray', x, y, z0: 0.8, vz, vx: Math.cos(s.h) * back * 0.6 - Math.sin(s.h) * out + s.vx * 0.5, vy: Math.sin(s.h) * back * 0.6 + Math.cos(s.h) * out + s.vy * 0.5, drag: 0.5, r: rnd(0.9, 0.4), grow: 0, life: 2 * vz / 14 + 0.05, age: 0, a: 0.55 });
          }
        }
      }
    } else if (sp.prop === 'screw' && Math.abs(s.throttle) > 0.05) {
      s.padT = (s.padT || 0) + dt * (2 + Math.abs(s.throttle) * 9);
      while (s.padT > 1) {
        s.padT -= 1;
        const [x, y] = shipToWorld(s, -sp.L * 0.5 - 1.5 * Math.sign(s.throttle), rndSym(sp.B * 0.15));
        const back = -Math.sign(s.throttle) * rnd(40, 15);
        fx.push({ k: 'foam', x, y, vx: Math.cos(s.h) * back + rndSym(14), vy: Math.sin(s.h) * back + rndSym(14), drag: 1.4, r: 2, grow: 6, life: rnd(1.6, 0.9), age: 0, a: 0.7 });
      }
    }
  }
  /* la nuit, les fanaux */
  if (R3.ambName === 'nuit' && !s.sinking) {
    P.lights.forEach(([bx, by], i) => {
      const [x, y] = shipToWorld(s, bx, 0);
      extraPart({ x, y, z: by * SCALE, size: 10, c: i ? [2.4, 1.9, 1.1] : [2.6, 2.2, 1.4], a: 0.9, life: 1, glow: true, once: true });
    });
  }
  updateWake(root.userData.wake, s);
}

function disposeObj(m) {
  R3.scene.remove(m);
  if (m.userData.shadow) R3.scene.remove(m.userData.shadow);
  if (m.userData.wake) { R3.scene.remove(m.userData.wake); m.userData.wake.geometry.dispose(); }
  if (m.userData.ring) { R3.scene.remove(m.userData.ring); m.userData.ring.geometry.dispose(); m.userData.ring.material.dispose(); }
  for (const x of m.userData.extras || []) { R3.scene.remove(x); x.geometry.dispose(); x.material.dispose(); }
  /* les géométries de chaque objet lui sont propres : on rend la mémoire à la carte graphique */
  m.traverse((o) => { if (o.geometry && !o.userData.sharedGeo) o.geometry.dispose(); });
  R3.live.delete(m);
}

function syncObj(o) {
  const m = keep(o, () => {
    let g;
    if (o.type === 'epave') g = buildHulk(o.r, o.seed, o.kind);
    else if (o.type === 'amas') g = buildBarrels(o.r, o.seed, o.kind);
    else if (o.type === 'brulot') g = buildFireBoat(o.r);
    else g = buildDebris(o);
    g.scale.setScalar(SCALE);
    /* l'écume reste à plat sur l'eau : elle ne suit pas le roulis de l'objet */
    const d = o.r * 1.95;
    const hug = makeHugFoam(o.type === 'epave' ? d * 1.15 : d * 1.05, o.type === 'epave' ? d * 0.75 : d * 1.05, debrisFoamTexture());
    hug.material.opacity = 0.32;
    R3.scene.add(hug);
    g.userData.extras = [hug];
    return g;
  });
  m.position.set(o.x, Math.sin(W.t * 1.7 + o.seed) * 0.6, o.y);
  const hug = m.userData.extras[0];
  hug.position.set(o.x, 0.3, o.y); hug.rotation.y = -o.rot;
  hug.material.color.setScalar(R3.foamK || 1);
  m.rotation.y = -o.rot;
  m.rotation.x = Math.sin(W.t * 1.1 + o.seed) * 0.05;
  if (o.type === 'brulot') {
    /* des flammes tout le long de la coque, et une colonne de fumée noire */
    for (let k = 0; k < 2; k++) {
      const u = rndSym(o.r * 0.75);
      const fx_ = o.x + Math.cos(o.rot) * u + rndSym(o.r * 0.2), fy = o.y + Math.sin(o.rot) * u + rndSym(o.r * 0.2);
      fx.push({ k: 'fire', x: fx_, y: fy, z0: 5, vx: o.vx * 0.5, vy: o.vy * 0.5, drag: 1, r: rnd(11, 6), grow: 4, life: rnd(0.8, 0.4), age: 0, a: 0.95 });
    }
    if (Math.random() < 0.7) fx.push({ k: 'smoke', x: o.x, y: o.y, z0: 16, vx: o.vx * 0.2, vy: o.vy * 0.2, r: rnd(9, 5), grow: 14, life: rnd(2.8, 1.8), age: 0, a: 0.55, tone: 0, air: true });
    extraPart({ x: o.x, y: o.y, z: 10, size: o.r * 2.6, c: [2.2, 0.9, 0.3], a: 0.35 + Math.random() * 0.1, life: 1, glow: true, once: true });
  }
  /* un peu d'écume qui se détache de ce qui flotte */
  if (Math.random() < 0.04) fx.push({ k: 'foam', x: o.x + rndSym(o.r), y: o.y + rndSym(o.r), vx: 0, vy: 0, drag: 1, r: 1.5, grow: 3, life: 1.6, age: 0, a: 0.4 });
}

function syncCrate(c, kind) {
  const m = keep(c, () => {
    const g = buildCrate(kind);
    g.scale.setScalar(SCALE);
    const ring = glowRing(kind ? new THREE.Color(PRISES[kind].color).multiplyScalar(1.6) : new THREE.Color(1.6, 1.25, 0.6), 60);
    R3.scene.add(ring);
    g.userData.ring = ring;
    return g;
  });
  const bob = Math.sin(c.bob || 0);
  /* une caisse qui va couler s'enfonce, et son halo clignote */
  const sink = c.life !== undefined && c.life < 3 ? 1 - Math.max(0, c.life) / 3 : 0;
  m.position.set(c.x, 0.4 + bob * 0.8 - sink * 7, c.y);
  m.rotation.y = -(c.rot || 0);
  m.rotation.z = bob * 0.08;
  const ring = m.userData.ring;
  ring.position.set(c.x, 0.9, c.y);
  const pulse = 0.5 + 0.5 * Math.sin((c.bob || 0) * 2);
  ring.scale.setScalar(40 + pulse * 7);
  ring.material.opacity = (0.22 + pulse * 0.25) * (sink ? (1 - sink) * (0.55 + 0.45 * Math.sin(W.t * 16)) : 1);
}

function syncLaunch(b) {
  /* les chaloupes à recueillir brillent d'or ; les barques du village à tenir au large, de rouge ;
   * les canots de l'équipage qui gagnent la grève, de rien */
  const m = keep(b, () => { const g = buildLaunch(); g.scale.setScalar(SCALE); if (!b.noRing) { const ring = glowRing(b.barque ? new THREE.Color(1.6, 0.45, 0.3) : new THREE.Color(1.5, 1.2, 0.6), 60); R3.scene.add(ring); g.userData.ring = ring; } return g; });
  m.position.set(b.x, Math.sin(b.bob) * 0.5, b.y);
  m.rotation.y = -b.h;
  if (!m.userData.ring) return;
  if (b.barque && b.state === 'back') { m.userData.ring.visible = false; return; }
  m.userData.ring.position.set(b.x, 0.9, b.y);
  const pulse = 0.5 + 0.5 * Math.sin(b.bob * 2);
  m.userData.ring.scale.setScalar(54 + pulse * 8);
  m.userData.ring.material.opacity = 0.3 + pulse * 0.3;
}

function syncWreck(w) {
  const m = keep(w, () => { const g = buildWreck(w.w); g.scale.setScalar(SCALE); return g; });
  m.position.set(w.x, 0, w.y);
  m.rotation.y = -w.h;
  if (Math.random() < 0.2) fx.push({ k: 'foam', x: w.x + rndSym(w.w.L * SCALE * 0.5), y: w.y + rndSym(w.w.B * SCALE), vx: 0, vy: 0, drag: 1, r: 2, grow: 4, life: 2, age: 0, a: 0.6 });
}

/* tourbillon : un disque d'eau qui tourne, en spirale */
/* le tourbillon : des bras en spirale qui tournent dans le sens du courant et descendent vers
 * l'œil, sombre, cerné d'écume ; uEye : le rayon de l'œil, en part du disque */
const WHIRL_FS = `uniform float uTime, uDir, uEye; varying vec2 vUv;
void main() {
  vec2 q = vUv - 0.5; float r = length(q) * 2.0;
  if (r > 1.0) discard;
  float a = atan(q.y, q.x);
  float s = sin(a * 4.0 + log(r + 0.02) * 7.0 * uDir + uTime * 3.0 * uDir);
  float streak = smoothstep(0.55, 1.0, s) * (1.0 - r) * 1.1 * smoothstep(uEye * 0.55, uEye * 1.25, r);
  float dark = (1.0 - smoothstep(0.0, uEye * 1.35, r)) * 0.9;
  float ring = smoothstep(uEye * 0.7, uEye, r) * (1.0 - smoothstep(uEye, uEye * 1.35, r)) * 0.4;
  vec3 col = mix(vec3(0.0, 0.02, 0.05), vec3(0.85, 0.92, 0.95), max(streak, ring));
  float alpha = max(dark, max(streak, ring)) * smoothstep(1.0, 0.72, r);
  gl_FragColor = vec4(col, alpha);
}`;
/* le disque couvre le courant jusqu'à 2,2 fois le rayon ; l'écume suit le courant et tombe vers l'œil */
const WHIRL_DISC = 2.2;
function syncWhirl(w) {
  const m = keep(w, () => {
    const mat = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: WHIRL_FS, uniforms: { uTime: { value: 0 }, uDir: { value: w.dir }, uEye: { value: ARC.tourbillon.eye / WHIRL_DISC } }, transparent: true, depthWrite: false });
    const d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); d.layers.set(1);
    d.rotation.x = -Math.PI / 2;
    d.renderOrder = 1;
    return d;
  });
  m.position.set(w.x, 0.8, w.y);
  m.scale.set(w.r * WHIRL_DISC * 2, w.r * WHIRL_DISC * 2, 1);
  m.material.uniforms.uTime.value = W.t;
  for (let i = 0; i < 2; i++) {
    if (Math.random() > 0.5) continue;
    const a = rnd(TAU), d = w.r * rnd(2.3, 0.35), sp = 40 + 70 * clamp(1.6 - d / w.r * 0.6, 0.2, 1);
    fx.push({ k: 'foam', x: w.x + Math.cos(a) * d, y: w.y + Math.sin(a) * d, vx: -Math.sin(a) * sp * w.dir - Math.cos(a) * 14, vy: Math.cos(a) * sp * w.dir - Math.sin(a) * 14, drag: 0.5, r: 1.5, grow: 2, life: 1.2, age: 0, a: 0.6 });
  }
}

/* zone marquée sur l'eau : mission, port, sortie */
const ZONE_FS = `uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
void main() {
  vec2 q = vUv - 0.5; float r = length(q) * 2.0;
  if (r > 1.0) discard;
  float a = atan(q.y, q.x);
  float dash = step(0.0, sin(a * 28.0 + uTime * 1.5));
  float ring = smoothstep(0.968, 0.976, r) * (1.0 - smoothstep(0.984, 0.992, r)) * dash;
  float glow = smoothstep(0.85, 0.98, r) * (1.0 - smoothstep(0.98, 1.0, r)) * 0.05;
  gl_FragColor = vec4(uCol, ring * 0.7 + glow);
}`;
function syncZone(z, col) {
  const m = keep(z, () => {
    const mat = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: ZONE_FS, uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(col || 0xf0d890) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); d.layers.set(1);
    d.rotation.x = -Math.PI / 2;
    d.renderOrder = 2;
    return d;
  });
  m.position.set(z.x, 1, z.y);
  m.scale.set(z.r * 2, z.r * 2, 1);
  m.material.uniforms.uTime.value = W.t;
}

function syncShots() {
  const M = new THREE.Matrix4();
  let n = 0;
  for (const p of G.shots) {
    if (n >= 300) break;
    if (p.kind === 'balle') { if (Math.random() < 0.5) extraPart({ x: p.x, y: p.y, z: 6, size: 2.2, c: [2, 1.6, 0.8], a: 0.9, life: 0.08, glow: true }); continue; }
    const life0 = p.life0 || (p.life0 = p.life);
    const prog = clamp(1 - p.life / life0, 0, 1);
    const z = 6 + Math.sin(prog * Math.PI) * 20;
    M.makeTranslation(p.x, z, p.y);
    R3.shots.setMatrixAt(n++, M);
    if (Math.random() < 0.6) extraPart({ x: p.x, y: p.y, z, size: 3, c: [0.75, 0.74, 0.72], a: 0.35, life: 0.6, grow: 1.5, seed: Math.random() });
  }
  R3.shots.count = n;
  if (n) { R3.shots.instanceMatrix.updateRange.count = n * 16; R3.shots.instanceMatrix.needsUpdate = true; }
}

/* ---------- l'image ---------- */

function render3D(dt) {
  if (!R3.ready) return;
  R3.frame++;
  place3DCamera(dt);
  updateBirds(dt || 0.016);
  if (R3.fadeT) { const f = (performance.now() - R3.fadeT) / 700; R3.post.uniforms.uFade.value = Math.min(1, f); if (f >= 1) R3.fadeT = 0; }
  const u = R3.water.material.uniforms;
  u.uTime.value = W.t;
  TREE_TIME.value = W.t;
  /* la toile frémit, et le soleil la traverse */
  SAIL_U.uTime.value = W.t;
  SAIL_U.uSunDirW.value.copy(R3.sunDir);
  SAIL_U.uSunCol.value.copy(R3.sun.color).multiplyScalar(R3.sun.intensity * 0.3);
  u.uSea.value = SEA.sea;
  CLOUD_U.uCloudT.value = W.t;
  CLOUD_U.uCloudK.value = u.uClouds.value;
  if (R3.frame % 60 === 1) cloudPatchScene();
  u.uRain.value = lerp(u.uRain.value, SEA.rain ? 1 : 0, 0.05);
  u.uCamPos.value.copy(R3.camera.position);
  /* l'éclair d'orage illumine toute la scène un instant */
  const fl = clamp(G.lightning || 0, 0, 1);
  u.uFlash.value = fl * fl;
  if (R3.amb) R3.hemi.intensity = R3.hemiBase !== undefined ? R3.hemiBase + fl * fl * 4 : R3.hemi.intensity;
  /* la fumée éclairée par le soleil, vu de la caméra */
  if (R3.pSmoke) {
    const pu = R3.pSmoke.mesh.material.uniforms;
    pu.uTime.value = W.t;
    pu.uSunV.value.copy(R3.sunDir).transformDirection(R3.camera.matrixWorldInverse);
  }
  const wa = fromBearing(SEA.wind + 180);
  u.uWind.value.set(Math.cos(wa), Math.sin(wa));
  CLOUD_U.uCloudW.value.copy(u.uWind.value);
  R3.water.position.set(cam.x, 0, cam.y);
  for (const s of G.ships) syncShip(s, dt);
  for (const o of G.objs) syncObj(o);
  for (const c of G.crates) syncCrate(c, null);
  for (const p of G.prises) syncCrate(p, p.kind);
  for (const c of G.chests || []) syncChest(c);
  /* le corsaire : son pavillon sur les ports qu'il a pris */
  if (G.game === 'arcade' && G.arc && G.arc.variant === 'corsaire' && G.cors) for (const P of G.cors.ports) if (P.state === 'ours') syncPortFlag(P);
  for (const w of G.whirls) syncWhirl(w);
  for (const b of G.boats || []) syncLaunch(b);
  for (const w of G.wrecks || []) syncWreck(w);
  for (const z of G.zones || []) syncZone(z, z.col);
  if (G.game === 'arcade') for (const b of G.beasts || []) syncBeast(b, dt);
  /* Akkorokamui : la mer et le ciel rougissent autour d'elle */
  if (R3.amb) {
    const rk = G.game === 'arcade' ? G.redK || 0 : 0, gr = R3.amb.grade;
    R3.post.uniforms.uGrade.value.set(gr[0] * (1 + 0.3 * rk), gr[1] * (1 - 0.3 * rk), gr[2] * (1 - 0.34 * rk));
  }
  for (const m of [...R3.live]) if (m.userData.seen !== R3.frame) disposeObj(m);
  syncShots();
  syncParticles(dt);
  /* l'éclair d'une explosion */
  R3.flash.intensity = Math.max(0, R3.flash.intensity - dt * 900);
  if (G.flashAt) { R3.flash.position.set(G.flashAt[0], 30, G.flashAt[1]); R3.flash.intensity = G.flashAt[2]; G.flashAt = null; }
  renderFrame();
}

/* ---------- ombres de nuages sur la terre et les navires ----------
 * Les mêmes nuages que ceux qui assombrissent la mer (même bruit, même vent, même vitesse)
 * passent sur les îles, les forêts, les villages et les navires : on retire la lumière
 * directe du soleil sous leur ombre. Chaque matériau éclairé est retouché une fois. */
const CLOUD_U = { uCloudT: { value: 0 }, uCloudW: { value: new THREE.Vector2(1, 0) }, uCloudK: { value: 1 } };
const CLOUD_GLSL = `uniform float uCloudT, uCloudK; uniform vec2 uCloudW; varying vec3 vCWP;
float cl_h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cl_n(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(cl_h(i), cl_h(i + vec2(1, 0)), u.x), mix(cl_h(i + vec2(0, 1)), cl_h(i + vec2(1, 1)), u.x), u.y); }
float cl_f(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * cl_n(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float cloudShade(vec2 p) { vec2 wd = normalize(uCloudW + vec2(1e-4)); return 1.0 - smoothstep(0.48, 0.72, cl_f(p * 0.0009 + wd * uCloudT * 0.007 + 7.3)) * 0.55 * uCloudK; }
`;
function cloudPatch(m) {
  if (!m || m.userData.cloud || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return;
  m.userData.cloud = true;
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey();
  /* une matière sans autre retouche que les nuages peut encore aller à la palette des navires */
  m.userData.cloudOnly = prev === THREE.Material.prototype.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) {
    if (prev) prev.call(this, sh, r);
    Object.assign(sh.uniforms, CLOUD_U);
    sh.vertexShader = 'varying vec3 vCWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      {
        vec4 cwp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          cwp = instanceMatrix * cwp;
        #endif
        vCWP = (modelMatrix * cwp).xyz;
      }`);
    sh.fragmentShader = CLOUD_GLSL + sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      {
        float cs = cloudShade(vCWP.xz);
        reflectedLight.directDiffuse *= cs;
        reflectedLight.directSpecular *= cs;
      }`);
  };
  m.customProgramCacheKey = () => key + '|cloud';
  m.needsUpdate = true;
}
function cloudPatchObj(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material)) o.material.forEach(cloudPatch); else cloudPatch(o.material);
  });
}
function cloudPatchScene() {
  R3.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material)) o.material.forEach(cloudPatch); else cloudPatch(o.material);
  });
}

/* efface tout ce qui appartient à la partie précédente */
function clear3D() {
  for (const m of [...R3.live]) disposeObj(m);
  R3.extra.length = 0;
}
