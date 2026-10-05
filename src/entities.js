'use strict';
/* Creatures (original designs), bosses, projectiles, item drops, windmills. */
const Mobs = [];
const Projectiles = [];
const Drops = [];
let ActiveBoss = null;

// ---------------------------------------------------------------- skins
const SKIN_CACHE = {};
function skin(key, base, o) {
  if (SKIN_CACHE[key]) return SKIN_CACHE[key];
  o = o || {};
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d'), img = g.createImageData(16, 16);
  const col = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const b = col(base), acc = o.accent !== undefined ? col(o.accent) : null;
  let s = key.length * 977 + 13;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const put = (x, y, cc, a) => { const i = (x + y * 16) * 4; img.data[i] = cc[0]; img.data[i + 1] = cc[1]; img.data[i + 2] = cc[2]; img.data[i + 3] = a === undefined ? 255 : a; };
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const f = (1 + (r() - 0.5) * (o.noise === undefined ? 0.12 : o.noise)) * (o.flat ? 1 : 1.06 - y / 15 * 0.14);
    let cc = [b[0] * f, b[1] * f, b[2] * f];
    if (acc && o.spots && ((Math.floor(x / 2) * 7 + Math.floor(y / 2) * 13 + key.length) % 23) / 23 < o.spots) cc = acc;
    if (acc && o.dapples && y < 9 && (x * 5 + y * 11) % 17 === 0) { cc = acc; }
    if (acc && o.stripes && (y % 5 === 0)) cc = acc;
    if (acc && o.cracks && r() < 0.06) cc = acc;
    if (acc && o.belly && y > 11) cc = acc;
    if (acc && o.plates && (x % 8 === 0 || y % 8 === 0)) cc = acc;
    put(x, y, cc.map(v => Math.max(0, Math.min(255, v))));
  }
  if (o.edge !== false) for (let i = 0; i < 16; i++) for (const [x, y] of [[i, 0], [i, 15], [0, i], [15, i]]) { const k = (x + y * 16) * 4; img.data[k] *= 0.8; img.data[k + 1] *= 0.8; img.data[k + 2] *= 0.8; }
  if (o.dapples) for (let y = 1; y < 9; y++) for (let x = 1; x < 15; x++) if ((x * 5 + y * 11) % 17 === 0) { put(x + 1, y, col(o.accent)); put(x, y + 1, col(o.accent)); }
  if (o.eyes) for (const [x, y, w, h, e] of o.eyes) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, col(e));
  if (o.mouth) for (const [x, y, w, h, e] of o.mouth) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, col(e));
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  SKIN_CACHE[key] = t;
  return t;
}
function M(tex, emissive, extra) { const m = emissive ? new THREE.MeshBasicMaterial(Object.assign({ map: tex }, extra || {})) : new THREE.MeshLambertMaterial(Object.assign({ map: tex }, extra || {})); m.userData.emissive = !!emissive; return m; }
// creature lighting: sky + sun, driven from the same values as the world shader
const mobHemi = new THREE.HemisphereLight(0xbcd0ff, 0x4a3a2a, 0.6); scene.add(mobHemi);
const mobSun = new THREE.DirectionalLight(0xfff0dd, 0.8); mobSun.position.set(0, 1, 0); scene.add(mobSun);
function updateMobLights() {
  mobSun.position.copy(U.uSunDir.value); mobSun.color.copy(U.uSunCol.value); mobSun.intensity = 0.95;
  mobHemi.color.copy(U.uAmbCol.value).multiplyScalar(1.7); mobHemi.groundColor.copy(U.uAmbCol.value).multiplyScalar(0.55); mobHemi.intensity = 1;
}
const BOXES = {};
function boxGeo(w, h, d) { const k = w + ',' + h + ',' + d; return BOXES[k] || (BOXES[k] = new THREE.BoxGeometry(w, h, d)); }
function box(parent, w, h, d, x, y, z, mat) { const m = new THREE.Mesh(boxGeo(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; }
function limb(parent, w, h, d, x, y, z, mat, down) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); box(g, w, h, d, 0, down === false ? h / 2 : -h / 2, 0, mat); return g; }
function faceMats(side, front) { return [side, side, side, side, front, side]; }

// ---------------------------------------------------------------- models
const MODELS = {
  deer(g, m) {
    const fur = M(skin('deer2', 0xa9763f, { accent: 0xf3e6cc, dapples: 1 })), belly = M(skin('deerbelly', 0xead9b8, { flat: true }));
    const leg = M(skin('deerleg', 0x8c6034)), hoof = M(skin('hoof', 0x2e2218, { edge: false }));
    const headS = M(skin('deerhs', 0xa9763f, { eyes: [[9, 6, 3, 3, 0x1a120c], [10, 6, 1, 1, 0xffffff]] })), headT = M(skin('deerht', 0xb07e46));
    const snout = M(skin('deersn', 0xd8c4a4, { mouth: [[5, 2, 6, 4, 0x2a1c16]], flat: true }));
    const antler = M(skin('antler2', 0xe6d8b8, { noise: 0.06 })), bloom = M(skin('bloom2', 0xff8fd0, { accent: 0xfff0f8, spots: 0.25, noise: 0.06, edge: false }), true);
    box(g, 0.46, 0.46, 0.95, 0, 0.98, 0, [fur, fur, fur, belly, fur, fur]);
    box(g, 0.42, 0.06, 0.8, 0, 0.74, 0, belly);
    m.legs = [[-0.15, 0.34], [0.15, 0.34], [-0.15, -0.34], [0.15, -0.34]].map(([x, z]) => { const L = limb(g, 0.12, 0.62, 0.12, x, 0.8, z, leg); box(L, 0.13, 0.12, 0.13, 0, -0.68, 0, hoof); return L; });
    box(g, 0.12, 0.14, 0.06, 0, 1.13, -0.5, belly);
    const neck = new THREE.Group(); neck.position.set(0, 1.1, 0.38); neck.rotation.x = -0.55; g.add(neck);
    box(neck, 0.2, 0.52, 0.2, 0, 0.24, 0, fur);
    const h = new THREE.Group(); h.position.set(0, 0.52, 0.02); h.rotation.x = 0.55; neck.add(h); m.head = h;
    box(h, 0.28, 0.26, 0.3, 0, 0.02, 0.04, [headS, headS, headT, headT, headT, headT]);
    box(h, 0.18, 0.16, 0.18, 0, -0.04, 0.26, [headT, headT, headT, headT, snout, headT]);
    for (const sx of [-1, 1]) {
      const ear = box(h, 0.06, 0.16, 0.1, sx * 0.17, 0.14, -0.04, headT); ear.rotation.z = sx * -0.9;
      const a1 = box(h, 0.04, 0.3, 0.04, sx * 0.08, 0.3, -0.04, antler); a1.rotation.z = sx * -0.25;
      const a2 = box(h, 0.04, 0.18, 0.04, sx * 0.17, 0.42, -0.04, antler); a2.rotation.z = sx * -0.8;
      const a3 = box(h, 0.04, 0.16, 0.04, sx * 0.09, 0.5, 0.0, antler); a3.rotation.x = 0.4;
      box(h, 0.07, 0.07, 0.07, sx * 0.25, 0.49, -0.04, bloom); box(h, 0.06, 0.06, 0.06, sx * 0.09, 0.59, 0.03, bloom);
    }
  },
  boar(g, m) {
    const fur = M(skin('boar', 0x5a4030, { accent: 0x3a2a20, stripes: 1 })), face = M(skin('boarh', 0x5a4030, { eyes: [[3, 5, 2, 2, 0x100808], [11, 5, 2, 2, 0x100808]] }));
    const snout = M(skin('snout', 0xc88a7a, { eyes: [[4, 6, 2, 3, 0x5a2a20], [10, 6, 2, 3, 0x5a2a20]] })), tusk = M(skin('tusk', 0xf0e8d8));
    box(g, 0.6, 0.55, 1.0, 0, 0.62, 0, fur);
    box(g, 0.2, 0.22, 0.7, 0, 0.98, -0.05, M(skin('mane', 0x2a1e16)));
    m.legs = [[-0.2, 0.32], [0.2, 0.32], [-0.2, -0.32], [0.2, -0.32]].map(([x, z]) => limb(g, 0.16, 0.38, 0.16, x, 0.38, z, fur));
    const h = new THREE.Group(); h.position.set(0, 0.65, 0.55); g.add(h); m.head = h;
    box(h, 0.46, 0.42, 0.36, 0, 0, 0.1, faceMats(fur, face)); box(h, 0.26, 0.2, 0.12, 0, -0.06, 0.34, faceMats(snout, snout));
    box(h, 0.05, 0.16, 0.05, -0.16, 0.0, 0.34, tusk); box(h, 0.05, 0.16, 0.05, 0.16, 0.0, 0.34, tusk);
  },
  shade(g, m) {
    const body = M(skin('shade', 0x1a1622, { accent: 0x3a2a4a, cracks: 1, noise: 0.4 }));
    const face = M(skin('shadeh', 0x1a1622, { eyes: [[2, 7, 4, 2, 0xffa020], [10, 7, 4, 2, 0xffa020]], noise: 0.3 }), false);
    const eye = M(skin('shadeeye', 0xffb030, { noise: 0.05 }), true);
    m.legs = [limb(g, 0.16, 1.25, 0.16, -0.12, 1.25, 0, body), limb(g, 0.16, 1.25, 0.16, 0.12, 1.25, 0, body)];
    box(g, 0.48, 0.85, 0.26, 0, 1.68, 0, body);
    m.arms = [limb(g, 0.13, 1.25, 0.13, -0.32, 2.05, 0, body), limb(g, 0.13, 1.25, 0.13, 0.32, 2.05, 0, body)];
    const h = new THREE.Group(); h.position.set(0, 2.1, 0); g.add(h); m.head = h;
    box(h, 0.42, 0.42, 0.42, 0, 0.21, 0, faceMats(body, face));
    box(h, 0.12, 0.05, 0.02, -0.11, 0.2, 0.215, eye); box(h, 0.12, 0.05, 0.02, 0.11, 0.2, 0.215, eye);
    m.trail = 'shadow';
  },
  crawler(g, m) {
    const shell = M(skin('crawl', 0xb89a62, { accent: 0x7a5a32, plates: 1 })), face = M(skin('crawlh', 0x8a6a3a, { eyes: [[3, 4, 2, 2, 0xff3020], [6, 3, 2, 2, 0xff3020], [9, 3, 2, 2, 0xff3020], [12, 4, 2, 2, 0xff3020]] }));
    const legm = M(skin('crawll', 0x5a4024));
    box(g, 0.75, 0.4, 0.75, 0, 0.55, -0.35, shell);
    const h = new THREE.Group(); h.position.set(0, 0.5, 0.25); g.add(h); m.head = h;
    box(h, 0.5, 0.36, 0.42, 0, 0, 0.1, faceMats(shell, face));
    box(h, 0.06, 0.18, 0.06, -0.12, -0.2, 0.3, legm); box(h, 0.06, 0.18, 0.06, 0.12, -0.2, 0.3, legm);
    m.legs = [];
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
      const L = new THREE.Group(); L.position.set(sx * 0.3, 0.55, 0.15 - i * 0.22); L.rotation.z = sx * 0.9; L.rotation.y = sx * (0.5 - i * 0.33); g.add(L);
      box(L, 0.7, 0.07, 0.07, sx * 0.35, 0, 0, legm); const lo = new THREE.Group(); lo.position.set(sx * 0.7, 0, 0); lo.rotation.z = -sx * 1.6; L.add(lo); box(lo, 0.55, 0.06, 0.06, sx * 0.27, 0, 0, legm);
      m.legs.push(L);
    }
    m.crawl = true;
  },
  golem(g, m) {
    const stone = M(skin('golem', 0x7a7c84, { accent: 0x5a5c64, cracks: 1, noise: 0.3 }));
    const face = M(skin('golemh', 0x6a6c74, { eyes: [[2, 6, 12, 2, 0x6ef0ff]], noise: 0.25 }));
    const cry = M(skin('golemc', 0x56d2f0, { accent: 0xd8faff, spots: 0.2, noise: 0.1 }), true);
    m.legs = [limb(g, 0.42, 0.7, 0.42, -0.35, 0.7, 0, stone), limb(g, 0.42, 0.7, 0.42, 0.35, 0.7, 0, stone)];
    box(g, 1.5, 1.2, 0.95, 0, 1.3, 0, stone);
    box(g, 0.6, 0.5, 0.45, 0, 1.75, 0.38, faceMats(stone, face));
    m.arms = [limb(g, 0.42, 1.5, 0.42, -0.98, 1.85, 0, stone), limb(g, 0.42, 1.5, 0.42, 0.98, 1.85, 0, stone)];
    const spikes = [[-0.5, 2.0, -0.3, 0.25, 0.55], [0, 2.1, -0.35, 0.3, 0.7], [0.5, 2.0, -0.3, 0.25, 0.5], [-0.95, 2.05, 0, 0.2, 0.45], [0.95, 2.05, 0, 0.2, 0.45], [-0.25, 1.7, -0.5, 0.18, 0.4], [0.3, 1.6, -0.5, 0.2, 0.4]];
    for (const [x, y, z, w, h] of spikes) { const s = box(g, w, h, w, x, y, z, cry); s.rotation.z = x * 0.4; s.rotation.x = -0.3; }
    m.head = null; m.heavy = true;
  },
  wisp(g, m) {
    const core = M(skin('wispc', 0x9af0ff, { accent: 0xffffff, spots: 0.25, noise: 0.1 }), true);
    const shard = M(skin('wisps', 0x56d2f0, { accent: 0xc8f8ff, stripes: 1, noise: 0.1 }), true);
    const bodyG = new THREE.Group(); bodyG.position.y = 0.9; g.add(bodyG);
    const c = box(bodyG, 0.42, 0.42, 0.42, 0, 0, 0, core); c.rotation.set(0.7, 0.7, 0);
    m.wings = [];
    for (const sx of [-1, 1]) { const w = new THREE.Group(); w.position.set(sx * 0.2, 0.05, 0); bodyG.add(w); const a = box(w, 0.9, 0.04, 0.35, sx * 0.5, 0, 0, shard); a.rotation.y = sx * 0.3; const b = box(w, 0.5, 0.04, 0.22, sx * 0.85, 0.12, -0.2, shard); b.rotation.y = sx * 0.6; m.wings.push(w); }
    box(bodyG, 0.12, 0.12, 0.4, 0, -0.1, -0.35, shard);
    m.body = bodyG; m.fly = true; m.trail = 'sparkle';
  },
  elemental(g, m) {
    const armor = M(skin('elem', 0x2a2228, { accent: 0xff6a1a, cracks: 1, noise: 0.3 }));
    const face = M(skin('elemh', 0x2a2228, { eyes: [[2, 6, 4, 3, 0xffd040], [10, 6, 4, 3, 0xffd040]], mouth: [[5, 11, 6, 2, 0xff6a1a]] }));
    const flame = M(skin('flame', 0xff7a1a, { accent: 0xffe46a, spots: 0.35, noise: 0.15 }), true);
    m.legs = [limb(g, 0.28, 0.85, 0.28, -0.18, 0.85, 0, armor), limb(g, 0.28, 0.85, 0.28, 0.18, 0.85, 0, armor)];
    box(g, 0.7, 0.85, 0.42, 0, 1.28, 0, armor); box(g, 0.4, 0.4, 0.05, 0, 1.3, 0.22, flame);
    box(g, 0.32, 0.3, 0.5, -0.5, 1.7, 0, armor); box(g, 0.32, 0.3, 0.5, 0.5, 1.7, 0, armor);
    m.arms = [limb(g, 0.24, 0.85, 0.24, -0.5, 1.6, 0, armor), limb(g, 0.24, 0.85, 0.24, 0.5, 1.6, 0, armor)];
    const h = new THREE.Group(); h.position.set(0, 1.72, 0); g.add(h); m.head = h;
    box(h, 0.44, 0.44, 0.44, 0, 0.22, 0, faceMats(armor, face));
    m.flames = [box(h, 0.3, 0.35, 0.3, 0, 0.6, 0, flame), box(h, 0.18, 0.25, 0.18, 0.08, 0.85, -0.05, flame)];
    m.trail = 'ember';
  },
  imp(g, m) {
    const sk = M(skin('imp', 0xa8281a, { accent: 0x6a1408, cracks: 1 })), face = M(skin('imph', 0xa8281a, { eyes: [[3, 5, 3, 2, 0xffe46a], [10, 5, 3, 2, 0xffe46a]], mouth: [[5, 10, 6, 1, 0x200404]] }));
    const horn = M(skin('horn', 0x2a2020));
    m.legs = [limb(g, 0.15, 0.4, 0.15, -0.1, 0.4, 0, sk), limb(g, 0.15, 0.4, 0.15, 0.1, 0.4, 0, sk)];
    box(g, 0.38, 0.42, 0.26, 0, 0.62, 0, sk);
    m.arms = [limb(g, 0.11, 0.42, 0.11, -0.25, 0.8, 0, sk), limb(g, 0.11, 0.42, 0.11, 0.25, 0.8, 0, sk)];
    const h = new THREE.Group(); h.position.set(0, 0.84, 0); g.add(h); m.head = h;
    box(h, 0.4, 0.36, 0.36, 0, 0.18, 0, faceMats(sk, face));
    const h1 = box(h, 0.07, 0.25, 0.07, -0.14, 0.45, 0, horn); h1.rotation.z = 0.4; const h2 = box(h, 0.07, 0.25, 0.07, 0.14, 0.45, 0, horn); h2.rotation.z = -0.4;
    const tail = box(g, 0.06, 0.06, 0.5, 0, 0.5, -0.35, sk); tail.rotation.x = 0.6;
    m.trail = 'ember';
  },
  knight(g, m) {
    const arm = M(skin('knight', 0x4a5a4a, { accent: 0x2e3a2e, plates: 1, noise: 0.3 })), moss = M(skin('kmoss', 0x3e6a2e, { accent: 0x2a4a20, spots: 0.4 }));
    const face = M(skin('knighth', 0x3a463a, { eyes: [[3, 7, 10, 2, 0x5affd0]] })), blade = M(skin('kblade', 0x8a9aa0, { noise: 0.1 }));
    m.legs = [limb(g, 0.28, 0.85, 0.28, -0.17, 0.85, 0, arm), limb(g, 0.28, 0.85, 0.28, 0.17, 0.85, 0, arm)];
    box(g, 0.66, 0.8, 0.4, 0, 1.25, 0, arm); box(g, 0.5, 0.3, 0.42, 0.1, 1.45, 0.02, moss);
    m.arms = [limb(g, 0.24, 0.8, 0.24, -0.46, 1.62, 0, arm), limb(g, 0.24, 0.8, 0.24, 0.46, 1.62, 0, arm)];
    const sw = box(m.arms[1], 0.08, 1.1, 0.16, 0, -0.95, 0.35, blade); sw.rotation.x = 1.4;
    const h = new THREE.Group(); h.position.set(0, 1.66, 0); g.add(h); m.head = h;
    box(h, 0.46, 0.5, 0.46, 0, 0.25, 0, faceMats(arm, face)); box(h, 0.08, 0.2, 0.3, 0, 0.58, 0, moss);
  },
  sentinel(g, m) {
    const st = M(skin('sent', 0x6a6a74, { accent: 0x4a4a54, plates: 1 })), rune = M(skin('rune', 0x2a2a34, { eyes: [[6, 3, 4, 10, 0x8af0d0], [3, 7, 10, 2, 0x8af0d0]] }), true);
    const bodyG = new THREE.Group(); bodyG.position.y = 1.2; g.add(bodyG);
    const c = box(bodyG, 0.7, 0.7, 0.7, 0, 0, 0, [st, st, st, st, rune, st]); c.rotation.z = Math.PI / 4;
    m.legs = [];
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const L = limb(bodyG, 0.12, 0.8, 0.12, Math.cos(a) * 0.35, -0.3, Math.sin(a) * 0.35, st); L.rotation.x = Math.sin(a) * 0.3; L.rotation.z = -Math.cos(a) * 0.3; m.legs.push(L); }
    m.body = bodyG; m.fly = true;
  },
  warden(g, m) {
    const st = M(skin('ward', 0x4e5e4a, { accent: 0x6ef0d0, cracks: 1, noise: 0.3 })), moss = M(skin('wmoss', 0x3e6a2e, { accent: 0x2a4a20, spots: 0.4 }));
    const face = M(skin('wardh', 0x3a4a38, { eyes: [[2, 6, 5, 2, 0x6ef0ff], [9, 6, 5, 2, 0x6ef0ff]], mouth: [[4, 11, 8, 1, 0x6ef0d0]] }));
    const glow = M(skin('wglow', 0x6ef0ff, { accent: 0xffffff, spots: 0.2 }), true);
    m.legs = [limb(g, 0.7, 1.6, 0.7, -0.5, 1.6, 0, st), limb(g, 0.7, 1.6, 0.7, 0.5, 1.6, 0, st)];
    box(g, 2.0, 1.8, 1.1, 0, 2.5, 0, st); box(g, 1.2, 0.5, 1.12, 0, 2.6, 0.01, moss); box(g, 0.4, 0.4, 0.05, 0, 2.6, 0.58, glow);
    box(g, 0.8, 0.5, 0.9, -1.3, 3.3, 0, moss); box(g, 0.8, 0.5, 0.9, 1.3, 3.3, 0, moss);
    m.arms = [limb(g, 0.6, 2.0, 0.6, -1.3, 3.2, 0, st), limb(g, 0.6, 2.0, 0.6, 1.3, 3.2, 0, st)];
    const sw = box(m.arms[1], 0.2, 2.8, 0.4, 0, -2.4, 0.8, glow); sw.rotation.x = 1.2;
    const h = new THREE.Group(); h.position.set(0, 3.4, 0.1); g.add(h); m.head = h;
    box(h, 0.9, 0.9, 0.9, 0, 0.45, 0, faceMats(st, face)); box(h, 0.2, 0.5, 0.6, 0, 1.0, 0, glow);
    m.heavy = true;
  },
  colossus(g, m) {
    const st = M(skin('colo', 0x6a6e7a, { accent: 0x8a8e9a, plates: 1, noise: 0.25 })), dark = M(skin('colod', 0x3a3e4a, { accent: 0x6ef0ff, cracks: 1 }));
    const face = M(skin('coloh', 0x5a5e6a, { eyes: [[2, 6, 4, 3, 0x6ef0ff], [10, 6, 4, 3, 0x6ef0ff]], mouth: [[4, 12, 8, 1, 0x2a2e3a]] }));
    const heart = M(skin('heart', 0x6ef0ff, { accent: 0xffffff, spots: 0.3, noise: 0.1 }), true);
    m.legs = [limb(g, 1.4, 3.2, 1.4, -1.1, 3.2, 0, dark), limb(g, 1.4, 3.2, 1.4, 1.1, 3.2, 0, dark)];
    box(g, 3.6, 3.4, 2.0, 0, 4.9, 0, st); box(g, 2.8, 1.2, 1.6, 0, 3.6, 0, dark);
    m.heart = box(g, 1.0, 1.0, 0.3, 0, 5.1, 1.05, heart);
    m.plate = box(g, 1.6, 1.6, 0.3, 0, 5.1, 1.2, st);
    box(g, 1.6, 1.0, 1.8, -2.5, 6.4, 0, dark); box(g, 1.6, 1.0, 1.8, 2.5, 6.4, 0, dark);
    m.arms = [limb(g, 1.1, 4.0, 1.1, -2.5, 6.3, 0, st), limb(g, 1.1, 4.0, 1.1, 2.5, 6.3, 0, st)];
    for (const a of m.arms) box(a, 1.4, 1.2, 1.4, 0, -4.4, 0, dark);
    const h = new THREE.Group(); h.position.set(0, 6.6, 0.2); g.add(h); m.head = h;
    box(h, 1.5, 1.4, 1.5, 0, 0.7, 0, faceMats(st, face)); box(h, 1.7, 0.3, 0.3, 0, 1.3, 0.7, heart);
    m.heavy = true;
  },
};

const MOBDEF = {
  deer: { hp: 10, speed: 2.4, flee: 6.5, passive: true, h: 1.5, hw: 0.35, drops: [[I.venison, 1, 2, 1], [I.leather, 0, 1, 0.6]], name: 'Antlered Deer' },
  boar: { hp: 14, speed: 2.2, flee: 5, passive: true, neutral: true, dmg: 3, h: 1.0, hw: 0.4, drops: [[I.venison, 1, 2, 1], [I.leather, 1, 2, 0.8]], name: 'Bristleback Boar' },
  shade: { hp: 18, dmg: 4, speed: 3.3, det: 22, h: 2.5, hw: 0.3, drops: [[I.gold, 1, 2, 0.6], [I.arrow, 1, 4, 0.4], [I.journal, 1, 1, 0.08]], name: 'Shade' },
  crawler: { hp: 14, dmg: 3, speed: 4, det: 18, h: 0.8, hw: 0.55, drops: [[I.silk, 1, 2, 0.9]], name: 'Dune Crawler' },
  golem: { hp: 42, dmg: 7, speed: 1.9, det: 14, h: 2.6, hw: 0.8, kb: 10, drops: [[I.shard, 2, 4, 1], [I.iron, 1, 2, 0.6]], name: 'Crystal Golem' },
  wisp: { hp: 14, dmg: 4, speed: 3.5, det: 24, h: 1.2, hw: 0.4, ranged: 'bolt', drops: [[I.shard, 1, 2, 0.9]], name: 'Shard Wisp' },
  elemental: { hp: 30, dmg: 6, speed: 3.1, det: 20, h: 2.2, hw: 0.4, burn: true, drops: [[I.ember, 1, 2, 0.9], [I.iron, 1, 1, 0.3]], name: 'Fire Elemental' },
  imp: { hp: 12, dmg: 3, speed: 4.6, det: 20, h: 1.2, hw: 0.3, burn: true, drops: [[I.ember, 0, 1, 0.6], [I.gold, 1, 2, 0.5]], name: 'Magma Imp' },
  knight: { hp: 28, dmg: 6, speed: 2.7, det: 16, h: 2.1, hw: 0.4, drops: [[I.iron, 1, 2, 0.7], [I.gold, 1, 3, 0.7]], name: 'Drowned Knight' },
  sentinel: { hp: 20, dmg: 4, speed: 2.2, det: 20, h: 1.6, hw: 0.45, ranged: 'dart', drops: [[I.shard, 1, 2, 0.8], [I.gold, 1, 2, 0.5]], name: 'Rune Sentinel' },
  warden: { hp: 320, dmg: 10, speed: 2.4, det: 40, h: 4.6, hw: 1.1, boss: true, kb: 12, drops: [], name: 'The Mirewarden' },
  colossus: { hp: 650, dmg: 12, speed: 1.6, det: 50, h: 8.0, hw: 2.0, boss: true, kb: 14, drops: [], name: 'The Sleeping Colossus' },
};

function spawnMob(type, x, y, z, extra) {
  const def = MOBDEF[type];
  const g = new THREE.Group();
  const m = Object.assign({ type, def, x, y, z, vx: 0, vy: 0, vz: 0, hw: def.hw, h: def.h, hp: def.hp, maxHp: def.hp, g, yaw: Math.random() * 6.28, phase: Math.random() * 6, atk: 0, flash: 0, wt: 0, wx: 0, wz: 0, onGround: false, anger: 0, cd: 1 + Math.random() * 2, t: 0 }, extra || {});
  MODELS[type](g, m);
  m.mats = []; g.traverse(o => { if (!o.isMesh) return; for (const mt of [].concat(o.material)) if (!m.mats.includes(mt)) m.mats.push(mt); });
  g.position.set(x, y, z);
  g.traverse(o => o.layers.enable(1));
  scene.add(g); Mobs.push(m);
  return m;
}
function removeMob(m) { scene.remove(m.g); const i = Mobs.indexOf(m); if (i >= 0) Mobs.splice(i, 1); }

// ---------------------------------------------------------------- drops
function dropItem(id, n, x, y, z) {
  const mesh = itemMesh(id); mesh.scale.setScalar(id < 256 ? 0.28 : 0.42);
  mesh.position.set(x, y, z); scene.add(mesh);
  Drops.push({ id, n, x, y, z, vx: (Math.random() - 0.5) * 3, vy: 4, vz: (Math.random() - 0.5) * 3, mesh, t: 0, hw: 0.12, h: 0.25 });
}
function updateDrops(dt, p) {
  for (let i = Drops.length - 1; i >= 0; i--) {
    const d = Drops[i]; d.t += dt;
    const dx = p.x - d.x, dy = (p.y + 0.8) - d.y, dz = p.z - d.z, dist = Math.hypot(dx, dy, dz);
    if (d.t > 0.5 && dist < 2.6) { d.vx += dx / dist * 40 * dt; d.vy += dy / dist * 40 * dt; d.vz += dz / dist * 40 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.vx *= 0.9; d.vy *= 0.9; d.vz *= 0.9; }
    else { d.vy -= 18 * dt; d.vx *= 0.96; d.vz *= 0.96; moveBody(d, dt); }
    if (d.t > 0.5 && dist < 0.8) { const left = giveItem(d.id, d.n); if (left <= 0) { scene.remove(d.mesh); Drops.splice(i, 1); continue; } d.n = left; }
    if (d.t > 300) { scene.remove(d.mesh); Drops.splice(i, 1); continue; }
    d.mesh.position.set(d.x, d.y + 0.25 + Math.sin(d.t * 3) * 0.06, d.z); d.mesh.rotation.y = d.t * 1.5;
    const L = lightAt(d.x, d.y + 0.3, d.z), lv = Math.max(L[0] / 15 * U.uDay.value, L[1] / 15) * 0.85 + 0.15;
    d.mesh.material.color.setScalar(lv);
  }
}

// ---------------------------------------------------------------- projectiles
const PROJ_GEO = { arrow: null };
function projMesh(type) {
  if (type === 'arrow') { const m = itemMesh(I.arrow); m.scale.setScalar(0.6); return m; }
  const col = type === 'bolt' ? 0x9af0ff : type === 'dart' ? 0x8af0d0 : type === 'orb' ? 0x6ef0ff : type === 'wave' ? 0xc8f8ff : 0xff8a2a;
  const s = type === 'orb' ? 0.6 : type === 'wave' ? 1.6 : 0.25;
  const m = new THREE.Mesh(boxGeo(s, type === 'wave' ? 0.5 : s, s), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 }));
  return m;
}
function shoot(type, x, y, z, vx, vy, vz, dmg, owner, o) {
  const mesh = projMesh(type); mesh.position.set(x, y, z); scene.add(mesh);
  Projectiles.push(Object.assign({ type, x, y, z, vx, vy, vz, dmg, owner, mesh, life: type === 'wave' ? 1.2 : 6, grav: type === 'arrow' ? 18 : 0, hit: new Set() }, o || {}));
}
function updateProjectiles(dt, P) {
  for (let i = Projectiles.length - 1; i >= 0; i--) {
    const p = Projectiles[i];
    p.life -= dt;
    p.vy -= p.grav * dt;
    if (p.home && p.owner === 'mob') { const dx = P.x - p.x, dy = P.y + 1 - p.y, dz = P.z - p.z, d = Math.hypot(dx, dy, dz) || 1, sp = Math.hypot(p.vx, p.vy, p.vz); p.vx += (dx / d * sp - p.vx) * dt * p.home; p.vy += (dy / d * sp - p.vy) * dt * p.home; p.vz += (dz / d * sp - p.vz) * dt * p.home; }
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
    let dead = p.life <= 0;
    if (!dead && p.type !== 'wave' && solidAt(Math.floor(nx), Math.floor(ny), Math.floor(nz))) {
      dead = true;
      if (p.type === 'arrow' && p.owner === 'player' && Math.random() < 0.6) dropItem(I.arrow, 1, p.x, p.y, p.z);
    }
    p.x = nx; p.y = ny; p.z = nz;
    if (!dead && p.owner === 'player') {
      for (const m of Mobs) {
        if (p.hit.has(m)) continue;
        const r = p.type === 'wave' ? 1.6 : 0.3;
        if (Math.abs(p.x - m.x) < m.hw + r && Math.abs(p.z - m.z) < m.hw + r && p.y > m.y - 0.2 && p.y < m.y + m.h + 0.2) {
          const sp = Math.hypot(p.vx, p.vy, p.vz);
          damageMob(m, p.type === 'arrow' ? p.dmg * Math.min(1.4, sp / 30) : p.dmg, p.vx / sp, p.vz / sp, p.crit);
          p.hit.add(m);
          if (p.type !== 'wave') { dead = true; break; }
        }
      }
    } else if (!dead && p.owner === 'mob') {
      if (Math.abs(p.x - P.x) < 0.5 && Math.abs(p.z - P.z) < 0.5 && p.y > P.y && p.y < P.y + 1.9) { hurtPlayer(p.dmg, p.type === 'fire' ? 'burn' : null, p.vx, p.vz); dead = true; }
    }
    if (p.type !== 'arrow') emit(p.x, p.y, p.z, { life: 0.3, size: p.type === 'wave' ? 0.3 : 0.12, r: 0.6, g: 0.95, b: 1, glow: true, vy: 0.2 });
    if (dead) { scene.remove(p.mesh); Projectiles.splice(i, 1); if (p.type !== 'arrow') burst(p.x, p.y, p.z, 8, { life: 0.4, size: 0.1, r: 0.6, g: 0.95, b: 1, glow: true, spread: 4 }); continue; }
    p.mesh.position.set(p.x, p.y, p.z);
    if (p.type === 'arrow') { p.mesh.rotation.y = Math.atan2(p.vx, p.vz) - Math.PI / 2; p.mesh.rotation.z = Math.atan2(p.vy, Math.hypot(p.vx, p.vz)) - Math.PI / 4; }
    else { p.mesh.rotation.x += dt * 5; p.mesh.rotation.y += dt * 7; if (p.type === 'wave') p.mesh.rotation.set(0, Math.atan2(p.vx, p.vz), 0); }
  }
}

// ---------------------------------------------------------------- lightning (visual)
const bolts = [];
function lightning(a, b) {
  const pts = []; const n = 8;
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector3(lerp(a[0], b[0], t) + (i && i < n ? (Math.random() - 0.5) * 0.8 : 0), lerp(a[1], b[1], t) + (i && i < n ? (Math.random() - 0.5) * 0.8 : 0), lerp(a[2], b[2], t) + (i && i < n ? (Math.random() - 0.5) * 0.8 : 0))); }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true }));
  scene.add(line); bolts.push({ line, life: 0.25 });
  for (const p of pts) emit(p.x, p.y, p.z, { life: 0.3, size: 0.12, r: 0.75, g: 0.9, b: 1, glow: true });
}
function updateBolts(dt) { for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.life -= dt; b.line.material.opacity = b.life * 4; if (b.life <= 0) { scene.remove(b.line); b.line.geometry.dispose(); bolts.splice(i, 1); } } }

// ---------------------------------------------------------------- combat helpers
function damageMob(m, dmg, kx, kz, crit) {
  if (m.dead) return;
  if (m.shield) { burst(m.x, m.y + m.h * 0.6, m.z, 10, { life: 0.4, size: 0.15, r: 0.5, g: 0.9, b: 1, glow: true, spread: 6 }); damageNumber(m.x, m.y + m.h + 0.3, m.z, 0, false); toastOnce('shield', 'The Colossus is shielded - destroy the energy pylons!'); return; }
  m.hp -= dmg; m.flash = 0.18; m.anger = 30;
  damageNumber(m.x, m.y + m.h + 0.3, m.z, dmg, crit);
  const kb = m.def.boss ? 0.2 : (m.def.heavy ? 0.4 : 1);
  m.vx += (kx || 0) * 7 * kb; m.vz += (kz || 0) * 7 * kb; if (!m.def.boss) m.vy = Math.max(m.vy, 4 * kb);
  burst(m.x, m.y + m.h * 0.6, m.z, 6, { life: 0.4, size: 0.08, r: 0.7, g: 0.1, b: 0.1, grav: 10, spread: 3 });
  if (m.hp <= 0) killMob(m);
}
function killMob(m) {
  m.dead = true;
  for (const [it, lo, hi, p] of m.def.drops) if (Math.random() <= p) { const n = lo + Math.floor(Math.random() * (hi - lo + 1)); if (n > 0) dropItem(it, n, m.x, m.y + 0.5, m.z); }
  burst(m.x, m.y + m.h / 2, m.z, 24, { life: 0.8, size: 0.14, r: 0.5, g: 0.45, b: 0.5, spread: 4, up: 3 });
  if (m.spawn) { const k = m.spawn.alive.indexOf(m); if (k >= 0) m.spawn.alive.splice(k, 1); }
  if (m.def.boss) onBossDefeated(m);
  removeMob(m);
  Stats.kills++;
}

// ---------------------------------------------------------------- AI
function mobLight(m) { const L = lightAt(m.x, m.y + m.h * 0.6, m.z); const v = Math.max(L[0] / 15 * U.uDay.value, L[1] / 15) * 0.85 + 0.15; return m.def.boss ? Math.max(0.7, v) : v; }
function mobTint(c, m) {
  const L = lightAt(m.x, m.y + m.h * 0.6, m.z), sky = L[0] / 15, blk = L[1] / 15;
  const out = Math.max(0.18, Math.pow(sky, 1.5)), torch = Math.pow(blk, 2.2) * 1.4;
  c.setRGB(out + torch * U.uTorch.value.r, out + torch * U.uTorch.value.g, out + torch * U.uTorch.value.b);
  if (m.def.boss) { c.r = Math.max(c.r, 0.75); c.g = Math.max(c.g, 0.75); c.b = Math.max(c.b, 0.75); }
}
// ---------------------------------------------------------------- pathfinding (weighted A* on the voxel grid)
let pathBudget = 0;
function passable(x, y, z) { const id = getB(x, y, z); return !SOLID[id] && !HURT[id] && id !== B.LAVA; }
function standable(x, y, z, hgt) {
  if (y < 1 || y >= H - 2) return false;
  for (let k = 0; k < hgt; k++) if (!passable(x, y + k, z)) return false;
  const below = getB(x, y - 1, z);
  return (SOLID[below] && !HURT[below]) || below === B.WATER || getB(x, y, z) === B.WATER;
}
const _heap = [];
function findPath(m, gx, gy, gz, maxNodes) {
  const hgt = Math.max(2, Math.ceil(m.h)), sx = Math.floor(m.x), sy = Math.floor(m.y + 0.05), sz = Math.floor(m.z);
  if (!standable(sx, sy, sz, hgt)) return null;
  const key = (x, y, z) => (x + 4096) + (z + 4096) * 8192 + y * 67108864;
  const open = _heap; open.length = 0;
  const came = new Map(), g = new Map();
  const hh = (x, y, z) => Math.hypot(x - gx, z - gz) + Math.abs(y - gy) * 0.8;
  const push = n => { open.push(n); let i = open.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (open[p].f <= open[i].f) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
  const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < open.length && open[l].f < open[s].f) s = l; if (r < open.length && open[r].f < open[s].f) s = r; if (s === i) break; [open[s], open[i]] = [open[i], open[s]]; i = s; } } return top; };
  const k0 = key(sx, sy, sz); g.set(k0, 0); push({ x: sx, y: sy, z: sz, f: hh(sx, sy, sz) * 1.5 });
  let best = { x: sx, y: sy, z: sz }, bestH = hh(sx, sy, sz), n = 0;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.length && n++ < maxNodes) {
    const c = pop(), ck = key(c.x, c.y, c.z), cg = g.get(ck);
    const ch = hh(c.x, c.y, c.z);
    if (ch < bestH) { bestH = ch; best = c; }
    if (Math.abs(c.x - gx) <= 1 && Math.abs(c.z - gz) <= 1 && Math.abs(c.y - gy) <= 1) { best = c; break; }
    for (const [dx, dz] of DIRS) {
      const nx = c.x + dx, nz = c.z + dz;
      if (dx && dz && (!passable(c.x + dx, c.y, c.z) || !passable(c.x, c.y, c.z + dz) || !passable(c.x + dx, c.y + 1, c.z) || !passable(c.x, c.y + 1, c.z + dz))) continue;
      let ny = null, cost = dx && dz ? 1.414 : 1;
      if (standable(nx, c.y, nz, hgt)) ny = c.y;
      else if (!dx || !dz) {
        if (standable(nx, c.y + 1, nz, hgt) && passable(c.x, c.y + hgt, c.z)) { ny = c.y + 1; cost += 0.6; }
        else for (let d = 1; d <= 3; d++) { if (!passable(nx, c.y - d + 1, nz)) break; if (standable(nx, c.y - d, nz, hgt)) { ny = c.y - d; cost += 0.3 * d; break; } }
      }
      if (ny === null) continue;
      if (getB(nx, ny, nz) === B.WATER) cost += 2;
      const nk = key(nx, ny, nz), ng = cg + cost;
      if (g.has(nk) && g.get(nk) <= ng) continue;
      g.set(nk, ng); came.set(nk, ck);
      push({ x: nx, y: ny, z: nz, f: ng + hh(nx, ny, nz) * 1.5 });
    }
  }
  const path = []; let k = key(best.x, best.y, best.z);
  while (k !== undefined && k !== k0) { const y = Math.floor(k / 67108864), r = k - y * 67108864, z = Math.floor(r / 8192) - 4096, x = r % 8192 - 4096; path.push({ x: x + 0.5, y, z: z + 0.5 }); k = came.get(k); }
  path.reverse();
  return path;
}
function followPath(m, P, dt) {
  // returns a unit direction toward the next waypoint (or null to fall back to a straight line)
  m.repath = (m.repath || 0) - dt;
  const gx = Math.floor(P.x), gy = Math.floor(P.y + 0.05), gz = Math.floor(P.z);
  const goalMoved = !m.goal || Math.abs(m.goal[0] - gx) + Math.abs(m.goal[2] - gz) > 2 || Math.abs(m.goal[1] - gy) > 1;
  if ((m.repath <= 0 || (goalMoved && m.repath < 0.4) || !m.path) && pathBudget > 0 && m.onGround) {
    pathBudget--; m.repath = 0.6 + Math.random() * 0.5;
    m.path = findPath(m, gx, gy, gz, 900); m.pathI = 0; m.goal = [gx, gy, gz];
  }
  const p = m.path;
  if (!p || m.pathI >= p.length) return null;
  let wp = p[m.pathI];
  while (m.pathI < p.length - 1 && Math.hypot(wp.x - m.x, wp.z - m.z) < 0.35) wp = p[++m.pathI];
  const dx = wp.x - m.x, dz = wp.z - m.z, d = Math.hypot(dx, dz) || 1;
  if (wp.y > m.y + 0.4 && m.onGround && d < 1.4) m.vy = m.def.heavy ? 9 : 8.6;
  if (m.pathI === p.length - 1 && d < 0.3) return null;
  return [dx / d, dz / d];
}

function updateMobs(dt, P) {
  pathBudget = 3;
  updateMobLights();
  for (let i = Mobs.length - 1; i >= 0; i--) {
    const m = Mobs[i], def = m.def;
    m.t += dt;
    const dx = P.x - m.x, dz = P.z - m.z, dy = P.y - m.y, dist = Math.hypot(dx, dz);
    if (!def.boss && !m.spawn && dist > 90) { removeMob(m); continue; }
    if (m.spawn && dist > 110) { removeMob(m); const k = m.spawn.alive.indexOf(m); if (k >= 0) m.spawn.alive.splice(k, 1); continue; }
    if (m.y < -5) { removeMob(m); continue; }
    let tx = 0, tz = 0, speed = 0, chase = false;
    const hostile = !def.passive || (def.neutral && m.anger > 0);
    if (def.boss) { bossAI(m, dt, P, dx, dz, dist); }
    else if (def.passive && !(def.neutral && m.anger > 0)) {
      if (m.anger > 0) { tx = -dx / (dist || 1); tz = -dz / (dist || 1); speed = def.flee; m.anger -= dt; }
      else { m.wt -= dt; if (m.wt <= 0) { m.wt = 2 + Math.random() * 4; const a = Math.random() * 6.28, go = Math.random() < 0.55; m.wx = go ? Math.cos(a) : 0; m.wz = go ? Math.sin(a) : 0; } tx = m.wx; tz = m.wz; speed = def.speed * 0.5; }
    } else if (hostile && !Game.peaceful && dist < (def.det || 16) * (m.anger > 0 ? 1.6 : 1) && Math.abs(dy) < 12 && P.alive) {
      chase = true; tx = dx / (dist || 1); tz = dz / (dist || 1); speed = def.speed;
      if (!def.fly && !def.ranged && (dist > 2.2 || Math.abs(dy) > 0.8)) { const dir = followPath(m, P, dt); if (dir) { tx = dir[0]; tz = dir[1]; } }
      if (def.ranged) {
        const want = def.ranged === 'bolt' ? 8 : 10;
        if (dist < want - 2) { tx = -tx; tz = -tz; } else if (dist < want + 2) { speed = 0.6; const s = tx; tx = -tz; tz = s; }
        m.cd -= dt;
        if (m.cd <= 0 && dist < 26) {
          m.cd = def.ranged === 'bolt' ? 1.8 : 2.4;
          const sy = m.y + m.h * 0.7, ty = P.y + 1.2, d3 = Math.hypot(dx, ty - sy, dz) || 1, sp = 14;
          shoot(def.ranged, m.x, sy, m.z, dx / d3 * sp, (ty - sy) / d3 * sp, dz / d3 * sp, def.dmg, 'mob');
        }
      }
    } else { m.wt -= dt; if (m.wt <= 0) { m.wt = 2 + Math.random() * 4; const a = Math.random() * 6.28, go = Math.random() < 0.5; m.wx = go ? Math.cos(a) : 0; m.wz = go ? Math.sin(a) : 0; } tx = m.wx; tz = m.wz; speed = def.speed * 0.35; }
    if (!def.boss) {
      const k = Math.min(1, dt * (m.onGround || def.fly ? 8 : 2));
      m.vx += (tx * speed - m.vx) * k; m.vz += (tz * speed - m.vz) * k;
      const inWater = getB(Math.floor(m.x), Math.floor(m.y + 0.4), Math.floor(m.z)) === B.WATER;
      if (def.fly) {
        const ground = groundY(Math.floor(m.x), Math.floor(m.z));
        const want = chase ? Math.max(ground + 3, P.y + 2.5) : ground + 3 + Math.sin(m.t) * 0.5;
        m.vy += ((want - m.y) * 2 - m.vy) * Math.min(1, dt * 3);
      } else { m.vy -= (inWater ? 8 : 28) * dt; if (inWater) m.vy = Math.max(m.vy, -2) + 15 * dt; }
      m.vy = Math.max(m.vy, -40);
      moveBody(m, dt);
      if ((m.hitX || m.hitZ) && m.onGround && speed > 0.5) m.vy = def.heavy ? 9 : 8.5;
      if (!chase && !def.fly && m.onGround && (m.wx || m.wz)) { const ax = Math.floor(m.x + m.wx * 1.2), az = Math.floor(m.z + m.wz * 1.2), ay = Math.floor(m.y); let drop = 0; while (drop < 4 && !SOLID[getB(ax, ay - 1 - drop, az)]) drop++; if (drop >= 3 || HURT[getB(ax, ay, az)] || getB(ax, ay - 1, az) === B.LAVA) { m.wx = -m.wx; m.wz = -m.wz; m.wt = 1.5; } }
      // melee
      m.atk -= dt;
      if (chase && !def.ranged && dist < m.hw + 1.1 && Math.abs(dy) < 2 && m.atk <= 0) {
        m.atk = def.heavy ? 1.6 : 1.0; m.swing = 0.3;
        hurtPlayer(def.dmg, def.burn ? 'burn' : null, dx / (dist || 1) * (def.kb || 5) / 5, dz / (dist || 1) * (def.kb || 5) / 5);
      }
      if (def.neutral && m.anger > 0 && dist < m.hw + 1 && m.atk <= 0) { m.atk = 1.2; hurtPlayer(def.dmg, null, dx / dist, dz / dist); }
      // hazards
      const hz = touching(m.x, m.y, m.z, m.hw, m.h, HURT);
      if (hz && !def.burn) { m.hp -= hz * dt * 2; if (m.hp <= 0) { killMob(m); continue; } }
      if (m.anger > 0) m.anger -= dt;
    }
    animateMob(m, dt, chase);
  }
}
function animateMob(m, dt, chase) {
  const sp = Math.hypot(m.vx, m.vz);
  m.phase += dt * (sp * 3 + 0.5);
  const sw = Math.sin(m.phase * 2) * Math.min(1, sp / 2);
  if (sp > 0.2 && !m.def.boss) m.yaw = Math.atan2(m.vx, m.vz);
  if (m.def.boss && m.face !== undefined) m.yaw = m.face;
  let dy = m.g.rotation.y, target = m.yaw, diff = ((target - dy + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  m.g.rotation.y = dy + diff * Math.min(1, dt * 8);
  if (m.legs) {
    if (m.crawl) m.legs.forEach((L, i) => { L.rotation.x = Math.sin(m.phase * 3 + i * 1.3) * 0.35 * Math.min(1, sp); });
    else if (m.legs.length === 4 && !m.fly) { m.legs[0].rotation.x = sw * 0.8; m.legs[3].rotation.x = sw * 0.8; m.legs[1].rotation.x = -sw * 0.8; m.legs[2].rotation.x = -sw * 0.8; }
    else if (m.legs.length === 2) { m.legs[0].rotation.x = sw * 0.7; m.legs[1].rotation.x = -sw * 0.7; }
    else if (m.fly) m.legs.forEach((L, i) => { L.rotation.y = Math.sin(m.t * 2 + i) * 0.3; });
  }
  if (m.arms) {
    let a0 = -sw * 0.6, a1 = sw * 0.6;
    if (chase && (m.type === 'shade' || m.type === 'knight')) { a0 = -1.2 + sw * 0.2; a1 = -1.2 - sw * 0.2; }
    if (m.swing > 0) { m.swing -= dt; a1 = -2.2 + (0.3 - m.swing) * 6; a0 = m.def.heavy ? a1 : a0; }
    if (m.slam > 0) { a0 = a1 = -2.6 + Math.max(0, 0.5 - m.slam) * 5; }
    m.arms[0].rotation.x = a0; m.arms[1].rotation.x = a1;
  }
  if (m.head && m.type === 'deer') m.head.rotation.x = 0.5 + (sp < 0.2 ? Math.max(0, Math.sin(m.t * 0.5)) * 0.9 : 0);
  if (m.wings) { const f = Math.sin(m.t * 12) * 0.6; m.wings[0].rotation.z = f; m.wings[1].rotation.z = -f; }
  if (m.body) { m.body.position.y = (m.type === 'wisp' ? 0.9 : 1.2) + Math.sin(m.t * 2.5) * 0.12; if (m.type === 'sentinel') m.body.rotation.y += dt * 0.8; }
  if (m.flames) for (const f of m.flames) { f.scale.y = 1 + Math.sin(m.t * 14 + f.position.x * 10) * 0.25; }
  if (m.heart) { const s = 1 + Math.sin(m.t * 6) * 0.08; m.heart.scale.set(s, s, 1); m.plate.visible = !!m.shield; }
  m.g.position.set(m.x, m.y, m.z);
  const lv = mobLight(m);
  for (const mt of m.mats) {
    if (m.flash > 0) mt.color.setRGB(1, 0.3, 0.3);
    else if (mt.userData.emissive) mt.color.setScalar(1);
    else mobTint(mt.color, m);
  }
  if (m.flash > 0) m.flash -= dt;
  if (m.trail && Math.random() < dt * 14) {
    const t = m.trail;
    if (t === 'shadow') emit(m.x + (Math.random() - 0.5) * 0.5, m.y + Math.random() * m.h, m.z + (Math.random() - 0.5) * 0.5, { vy: 0.4, life: 0.9, size: 0.12, r: 0.12, g: 0.06, b: 0.18, a: 0.8, glow: true });
    else if (t === 'ember') emit(m.x + (Math.random() - 0.5) * 0.6, m.y + Math.random() * m.h, m.z + (Math.random() - 0.5) * 0.6, { vy: 1.4, vx: (Math.random() - 0.5), life: 0.8, size: 0.07, r: 1, g: 0.55, b: 0.15, glow: true });
    else emit(m.x + (Math.random() - 0.5) * 0.8, m.y + 0.9 + (Math.random() - 0.5) * 0.6, m.z + (Math.random() - 0.5) * 0.8, { vy: -0.3, life: 0.7, size: 0.07, r: 0.6, g: 0.95, b: 1, glow: true });
  }
}

// ---------------------------------------------------------------- bosses
function bossAI(m, dt, P, dx, dz, dist) {
  m.face = Math.atan2(dx, dz);
  const room = m.room;
  m.cd -= dt; m.atk -= dt;
  if (m.slam > 0) m.slam -= dt;
  if (m.type === 'warden') {
    // walk toward the player; swing when close; stomp shockwaves; summon knights at thresholds
    const sp = dist > 3.2 ? m.def.speed * (m.hp < m.maxHp * 0.4 ? 1.4 : 1) : 0;
    m.vx = dx / (dist || 1) * sp; m.vz = dz / (dist || 1) * sp;
    if (dist < 3.6 && m.atk <= 0 && Math.abs(P.y - m.y) < 3) { m.atk = 1.5; m.swing = 0.3; setTimeout(() => { if (!m.dead && Math.hypot(P.x - m.x, P.z - m.z) < 4.2) hurtPlayer(m.def.dmg, null, dx / dist * 2, dz / dist * 2); }, 250); }
    if (m.cd <= 0) { m.cd = 6.5; m.slam = 0.5; setTimeout(() => { if (!m.dead) shockwave(m.x, m.y, m.z, 9, 6, 0x6ef0d0); }, 450); }
    for (const th of [0.66, 0.33]) if (!m['sum' + th] && m.hp < m.maxHp * th) { m['sum' + th] = true; bossBanner('The Mirewarden calls the drowned!', ''); for (let k = 0; k < 2; k++) spawnMob('knight', room.x + (k ? 6 : -6), room.y, room.z - 4, { anger: 30 }); }
  } else {
    // colossus: shield while pylons stand, then the heart awakens
    const alive = room.pylons.filter(p => getB(p[0], p[1], p[2]) === B.ENERGY).length;
    if (alive > 0) m.shield = true;
    else if (m.shield) { m.shield = false; m.phase2 = true; bossBanner('The Heart Awakens', 'Strike the glowing core!'); burst(m.x, m.y + 5, m.z, 60, { life: 1.2, size: 0.25, r: 0.5, g: 0.95, b: 1, glow: true, spread: 10, up: 6 }); }
    const sp = dist > 5 ? m.def.speed : 0;
    m.vx = dx / (dist || 1) * sp; m.vz = dz / (dist || 1) * sp;
    if (dist < 5.5 && m.atk <= 0) { m.atk = 2; m.swing = 0.3; setTimeout(() => { if (!m.dead && Math.hypot(P.x - m.x, P.z - m.z) < 6) hurtPlayer(m.def.dmg, null, dx / dist * 3, dz / dist * 3); }, 300); }
    if (m.cd <= 0) {
      const r = Math.random();
      if (!m.phase2) {
        if (r < 0.5) { m.cd = 5; m.slam = 0.5; setTimeout(() => { if (!m.dead) shockwave(m.x, m.y, m.z, 15, 8, 0x9af0ff); }, 450); }
        else { m.cd = 4.5; spikeField(P, 4); }
      } else {
        if (r < 0.35) { m.cd = 3.2; m.slam = 0.5; setTimeout(() => { if (!m.dead) shockwave(m.x, m.y, m.z, 16, 9, 0x9af0ff); }, 450); }
        else if (r < 0.7) { m.cd = 2.6; for (let k = -1; k <= 1; k++) { const a = Math.atan2(dx, dz) + k * 0.4; shoot('orb', m.x, m.y + 5.5, m.z, Math.sin(a) * 9, 1, Math.cos(a) * 9, 7, 'mob', { home: 0.8, life: 5 }); } }
        else { m.cd = 3; spikeField(P, 6); }
      }
    }
  }
  moveBody(m, dt);
  m.vy -= 28 * dt;
  // keep the boss inside its room
  const rd = Math.hypot(m.x - room.x, m.z - room.z);
  if (rd > room.r) { m.x = room.x + (m.x - room.x) / rd * room.r; m.z = room.z + (m.z - room.z) / rd * room.r; }
}
const telegraphs = [];
function shockwave(x, y, z, radius, dmg, color) {
  shake(0.6);
  const c = new THREE.Color(color);
  for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; emit(x, y + 0.2, z, { vx: Math.cos(a) * radius * 1.4, vz: Math.sin(a) * radius * 1.4, vy: 0.5, life: 0.7, size: 0.3, r: c.r, g: c.g, b: c.b, glow: true }); }
  const t0 = performance.now();
  telegraphs.push({ kind: 'ring', x, y, z, radius, dmg, t0, done: false });
}
function spikeField(P, n) {
  for (let k = 0; k < n; k++) {
    const x = P.x + (k ? (Math.random() - 0.5) * 8 : 0), z = P.z + (k ? (Math.random() - 0.5) * 8 : 0);
    telegraphs.push({ kind: 'spike', x, z, y: P.y, t: 1.1, done: false });
  }
}
function updateTelegraphs(dt, P) {
  for (let i = telegraphs.length - 1; i >= 0; i--) {
    const t = telegraphs[i];
    if (t.kind === 'ring') {
      const el = (performance.now() - t.t0) / 1000, R = el * t.radius * 1.4;
      if (!t.done && P.onGround && Math.abs(Math.hypot(P.x - t.x, P.z - t.z) - R) < 1.0 && Math.abs(P.y - t.y) < 2) { t.done = true; hurtPlayer(t.dmg, null, (P.x - t.x) / R, (P.z - t.z) / R); P.vy = 7; }
      if (el > 0.75) telegraphs.splice(i, 1);
    } else {
      t.t -= dt;
      if (Math.random() < 0.6) { const a = Math.random() * 6.28; emit(t.x + Math.cos(a) * 1.2, t.y + 0.1, t.z + Math.sin(a) * 1.2, { life: 0.3, size: 0.12, r: 1, g: 0.3, b: 0.2, glow: true }); }
      if (t.t <= 0) {
        for (let k = 0; k < 20; k++) emit(t.x + (Math.random() - 0.5) * 1.4, t.y, t.z + (Math.random() - 0.5) * 1.4, { vy: 9 + Math.random() * 4, life: 0.5, size: 0.18, r: 0.6, g: 0.95, b: 1, glow: true, grav: 20 });
        if (Math.hypot(P.x - t.x, P.z - t.z) < 1.5 && Math.abs(P.y - t.y) < 2) { hurtPlayer(7, null, 0, 0); P.vy = 9; }
        telegraphs.splice(i, 1);
      }
    }
  }
}
function startBoss(room) {
  if (ActiveBoss || room.done) return;
  const m = spawnMob(room.type, room.x + 0.5, room.y, room.z + 0.5, { room });
  if (room.type === 'colossus') { m.shield = true; for (const p of room.pylons) Emitters.push({ x: p[0] + 0.5, y: p[1] + 6, z: p[2] + 0.5, type: 'sparkle' }); }
  ActiveBoss = m;
  bossBanner(room.name, room.sub);
  shake(0.8);
}
function onBossDefeated(m) {
  const room = m.room; room.done = true; ActiveBoss = null;
  Game.save && Game.save();
  if (m.type === 'warden') {
    bossBanner('Warden Defeated', 'The Deepseal Key is yours');
    setB(Math.floor(room.x), room.y, Math.floor(room.z), B.CHEST, 2); Chests.set(K(Math.floor(room.x), room.y, Math.floor(room.z)), { table: 'warden', items: null });
    blockChanged(Math.floor(room.x), room.y, Math.floor(room.z));
  } else {
    bossBanner('The Colossus Has Fallen', 'The Heart of the Buried World is yours');
    setB(Math.floor(room.x), room.y, Math.floor(room.z) + 3, B.CHEST, 0); Chests.set(K(Math.floor(room.x), room.y, Math.floor(room.z) + 3), { table: 'hoard', items: null });
    blockChanged(Math.floor(room.x), room.y, Math.floor(room.z) + 3);
    const p = Game.halls && Game.halls.portal;
    if (p) {
      for (let dy = 0; dy < 4; dy++) for (let dx = -1; dx <= 1; dx++) { const edge = dy === 0 || dy === 3 || Math.abs(dx) === 1; setBlockLogged(p[0] + dx, p[1] + dy, p[2], edge ? B.ANCIENT_GOLD : B.PORTAL); }
      setBlockLogged(p[0] - 2, p[1], p[2], B.ANCIENT_GOLD); setBlockLogged(p[0] + 2, p[1], p[2], B.ANCIENT_GOLD);
      Portals.push({ x: p[0], y: p[1] + 1, z: p[2], to: Game.halls.exit });
      toast('A portal opens. Step through to return to the surface.', 5000);
    }
  }
}

// ---------------------------------------------------------------- spawning
let spawnTimer = 0;
function updateSpawning(dt, P) {
  spawnTimer -= dt;
  // structure spawn points
  for (const sp of SpawnPoints) {
    const d = Math.hypot(sp.x - P.x, sp.z - P.z);
    sp.cool -= dt;
    if (d < 40 && sp.alive.length < sp.n && sp.cool <= 0) {
      sp.cool = sp.alive.length === 0 && !sp.first ? 0 : 25; sp.first = true;
      for (let k = 0; k < 6 && sp.alive.length < sp.n; k++) {
        const x = sp.x + (Math.random() - 0.5) * sp.r * 2, z = sp.z + (Math.random() - 0.5) * sp.r * 2;
        let y = sp.y; while (y < H - 2 && collides(x, y, z, 0.4, 2.2)) y++;
        if (y - sp.y > 4) continue;
        const m = spawnMob(sp.type, x, y, z, { spawn: sp }); sp.alive.push(m);
      }
    }
  }
  if (spawnTimer > 0) return;
  spawnTimer = 1.2;
  const bi = bmap[COL(Math.floor(P.x), Math.floor(P.z))], bio = BIOMES[bi];
  const night = U.uDay.value < 0.45;
  const wild = Mobs.filter(m => !m.spawn && !m.def.boss);
  const list = night ? bio.night.concat(bio.mob) : bio.mob;
  if (wild.length >= (night ? 22 : 12)) return;
  const type = list[Math.floor(Math.random() * list.length)];
  const hostile = !MOBDEF[type].passive;
  if (hostile && !night && bi < 3 && type === 'shade') return;
  const a = Math.random() * 6.283, r = 24 + Math.random() * 26;
  const x = Math.floor(P.x + Math.cos(a) * r), z = Math.floor(P.z + Math.sin(a) * r);
  if (!resident(x, z) || bmap[COL(x, z)] !== bi) return;
  const y = groundY(x, z);
  const top = getB(x, y, z);
  if (top === B.WATER || top === B.LAVA || !SOLID[top]) return;
  if (hostile && Sites.some(s => s.cat === 'village' && Math.hypot(s.x - x, s.z - z) < s.r + 4)) return;
  const L = lightAt(x, y + 1, z);
  if (hostile && L[1] > 7) return;
  if (collides(x + 0.5, y + 1, z + 0.5, MOBDEF[type].hw, MOBDEF[type].h)) return;
  const group = type === 'crawler' && night ? 3 : 1;
  for (let k = 0; k < group; k++) spawnMob(type, x + 0.5 + k * 0.7, y + 1, z + 0.5);
}

// ---------------------------------------------------------------- windmills
const windmillMeshes = [];
function buildWindmills() {
  const mat = new THREE.MeshBasicMaterial({ map: (() => { const t = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); const [sx, sy] = tileXY('planks'); g.drawImage(Atlas.canvas, sx, sy, 16, 16, 0, 0, 16, 16); return c; })()); t.magFilter = THREE.NearestFilter; return t; })() });
  const sail = new THREE.MeshBasicMaterial({ color: 0xe8e0cc, side: THREE.DoubleSide });
  for (const w of Windmills) {
    const g = new THREE.Group(); g.position.set(w.x, w.y, w.z);
    const rot = new THREE.Group(); g.add(rot);
    for (let k = 0; k < 4; k++) {
      const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2; rot.add(arm);
      box(arm, 0.35, 7.5, 0.25, 0, 3.9, 0, mat);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 6), sail); s.position.set(0.95, 4.2, 0.05); arm.add(s);
    }
    box(rot, 0.8, 0.8, 0.8, 0, 0, 0, mat);
    g.rotation.y = -w.r * Math.PI / 2;
    g.traverse(o => o.layers.enable(1)); scene.add(g); windmillMeshes.push({ g, rot });
  }
}
function updateWindmills(dt) { for (const w of windmillMeshes) w.rot.rotation.z += dt * 0.6; }
