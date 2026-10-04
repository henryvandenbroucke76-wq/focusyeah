'use strict';
/* Blockhollow RPG - a Minecraft-style fantasy RPG in one file (Three.js r147 global build). */

// ---------------------------------------------------------------- constants
const W = 160, D = 160, H = 48, CS = 16, SEA = 10;
const NCX = W / CS, NCZ = D / CS;
const world = new Uint8Array(W * H * D);
const idx = (x, y, z) => x + z * W + y * W * D;
const inb = (x, y, z) => x >= 0 && x < W && z >= 0 && z < D && y >= 0 && y < H;
const get = (x, y, z) => (inb(x, y, z) ? world[idx(x, y, z)] : 0);
const set = (x, y, z, id) => { if (inb(x, y, z)) world[idx(x, y, z)] = id; };

const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, LOG: 6, LEAVES: 7, PLANKS: 8, COBBLE: 9,
  CRYSTAL: 10, LAVA: 11, PATH: 12, THATCH: 13, CHEST: 14, CARPET: 15, SANDSTONE: 16, IRON: 17, LAMP: 18,
  HAY: 19, BRICK: 20, AWNING: 21, FURNACE: 22, BEDROCK: 23, TABLET: 24, CHEST_OPEN: 25, ASH: 26,
  CACTUS: 27, WHEAT: 28, DARKBRICK: 29, SPAWNER: 30,
};
const COL = [];
function def(id, top, side, bot) {
  side = side === undefined ? top : side;
  bot = bot === undefined ? side : bot;
  COL[id] = { t: new THREE.Color(top), s: new THREE.Color(side), b: new THREE.Color(bot) };
}
def(B.GRASS, 0x5aa23f, 0x6e5a38, 0x6e5a38); def(B.DIRT, 0x7a5a3a); def(B.STONE, 0x858585);
def(B.SAND, 0xe0d08a); def(B.WATER, 0x3a6fd8); def(B.LOG, 0xb08a55, 0x5e4326);
def(B.LEAVES, 0x3f8a32); def(B.PLANKS, 0xb58b52); def(B.COBBLE, 0x777777);
def(B.CRYSTAL, 0x62e0ff); def(B.LAVA, 0xff5a14); def(B.PATH, 0xa88f5e, 0x8c7448);
def(B.THATCH, 0xc9a53d); def(B.CHEST, 0x9b6a2a, 0x7c4e1a); def(B.CARPET, 0xc23a3a, 0xc23a3a, 0x8a2a2a);
def(B.SANDSTONE, 0xd2bd7d); def(B.IRON, 0xb08f78); def(B.LAMP, 0xffe9a0); def(B.HAY, 0xd6b436, 0xb8962a);
def(B.BRICK, 0x7d8a7a); def(B.AWNING, 0xcc3b3b); def(B.FURNACE, 0x666666, 0x4d4d4d);
def(B.BEDROCK, 0x2a2a2a); def(B.TABLET, 0xc7c0b0, 0x9b9486); def(B.CHEST_OPEN, 0x5a3510);
def(B.ASH, 0x4a4545); def(B.CACTUS, 0x3f9a3c); def(B.WHEAT, 0xd8c24a, 0xb59d34);
def(B.DARKBRICK, 0x3a2f3f); def(B.SPAWNER, 0x222233);
const SOLID = new Uint8Array(256), GLOW = new Uint8Array(256);
for (let i = 1; i < 31; i++) SOLID[i] = 1;
SOLID[B.WATER] = 0; SOLID[B.LAVA] = 0;
GLOW[B.LAMP] = GLOW[B.LAVA] = GLOW[B.CRYSTAL] = 1;

// ---------------------------------------------------------------- noise
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261004);
function hash2(x, z, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ h >>> 13, 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, z, s) {
  const x0 = Math.floor(x), z0 = Math.floor(z), fx = x - x0, fz = z - z0;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(x0, z0, s), b = hash2(x0 + 1, z0, s), c = hash2(x0, z0 + 1, s), d = hash2(x0 + 1, z0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, s, o) {
  o = o || 4;
  let a = 0.5, f = 1, r = 0, n = 0;
  for (let i = 0; i < o; i++) { r += a * vnoise(x * f, z * f, s + i * 31); n += a; a *= 0.5; f *= 2; }
  return r / n;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- terrain
const hm = new Int16Array(W * D);      // terrain height (before structures)
const biome = new Uint8Array(W * D);   // 0 plains 1 desert 2 highlands 3 ashlands
const BIOME_NAME = ['Verdant Plains', 'Sunscorch Desert', 'Crystal Highlands', 'Ashlands'];
const ANCH = [[45, 45, 0], [80, 80, 0], [20, 85, 0], [85, 20, 0], [125, 35, 1], [35, 125, 2], [125, 125, 3], [140, 80, 1], [80, 140, 2]];

function generate() {
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const dt = [1e9, 1e9, 1e9, 1e9];
    for (let i = 0; i < ANCH.length; i++) {
      const a = ANCH[i];
      const pert = (fbm(x / 26 + i * 13.7, z / 26, 40 + i) - 0.5) * 38;
      const d = Math.hypot(x - a[0], z - a[1]) + pert;
      if (d < dt[a[2]]) dt[a[2]] = d;
    }
    let bi = 0, dmin = dt[0];
    for (let t = 1; t < 4; t++) if (dt[t] < dmin) { dmin = dt[t]; bi = t; }
    const e = fbm(x / 60, z / 60, 3);
    const lk = fbm(x / 30, z / 30, 5);
    let hP = 11 + (e - 0.5) * 10; if (lk > 0.6) hP -= (lk - 0.6) * 60;
    const hD = 12 + (fbm(x / 20, z / 20, 11) - 0.5) * 10;
    const hM = clamp(18 + (e - 0.2) * 28, 18, 36);
    let hA = 12 + (fbm(x / 40, z / 40, 13) - 0.5) * 8;
    const p = fbm(x / 12, z / 12, 17); if (p > 0.6) hA -= (p - 0.6) * 80;
    const hs = [hP, hD, hM, hA];
    let sw = 0, sh = 0;
    for (let t = 0; t < 4; t++) { const w = Math.exp(-(dt[t] - dmin) / 9); sw += w; sh += w * hs[t]; }
    biome[x + z * W] = bi;
    hm[x + z * W] = Math.round(clamp(sh / sw, 3, H - 10));
  }
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const h = hm[x + z * W], b = biome[x + z * W];
    let top, sub;
    if (b === 0) { top = h <= SEA + 1 ? B.SAND : B.GRASS; sub = h <= SEA + 1 ? B.SAND : B.DIRT; }
    else if (b === 1) { top = B.SAND; sub = B.SANDSTONE; }
    else if (b === 2) { top = h < 22 ? B.GRASS : B.STONE; sub = h < 22 ? B.DIRT : B.STONE; }
    else { top = B.ASH; sub = B.STONE; }
    if (h <= SEA && b !== 3) { top = B.SAND; sub = B.SAND; }
    for (let y = 0; y <= h; y++) {
      let id;
      if (y === 0) id = B.BEDROCK;
      else if (y === h) id = top;
      else if (y >= h - 3) id = sub;
      else {
        id = B.STONE;
        const r = hash2(x * 31 + y, z * 17 + y, 77);
        if (y < 16 && r < 0.012) id = B.IRON;
        else if (b === 2 && r > 0.996) id = B.CRYSTAL;
      }
      set(x, y, z, id);
    }
    if (b === 3) { for (let y = h + 1; y <= 9; y++) set(x, y, z, B.LAVA); }
    else { for (let y = h + 1; y <= SEA; y++) set(x, y, z, B.WATER); }
  }
  // vegetation
  for (let z = 4; z < D - 4; z++) for (let x = 4; x < W - 4; x++) {
    const h = hm[x + z * W], b = biome[x + z * W], top = get(x, h, z), r = hash2(x, z, 99);
    if (h <= SEA + 1) continue;
    if ((b === 0 && top === B.GRASS && r < 0.014) || (b === 2 && top === B.GRASS && r < 0.005)) {
      const th = 4 + Math.floor(hash2(x, z, 5) * 2);
      for (let y = 1; y <= th; y++) set(x, h + y, z, B.LOG);
      for (let dy = th - 2; dy <= th + 1; dy++) {
        const rad = dy >= th ? 1 : 2;
        for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && hash2(x + dx, z + dz, dy) < 0.5) continue;
          if (get(x + dx, h + dy, z + dz) === 0) set(x + dx, h + dy, z + dz, B.LEAVES);
        }
      }
    } else if (b === 1 && top === B.SAND && r < 0.005) {
      const ch = 1 + Math.floor(hash2(x, z, 6) * 3);
      for (let y = 1; y <= ch; y++) set(x, h + y, z, B.CACTUS);
    } else if (b === 3 && top === B.ASH && r < 0.006) {
      const ch = 2 + Math.floor(hash2(x, z, 7) * 3);
      for (let y = 1; y <= ch; y++) set(x, h + y, z, B.LOG);
    } else if (b === 2 && r > 0.994) {
      const ch = 2 + Math.floor(hash2(x, z, 8) * 3);
      for (let y = 1; y <= ch; y++) set(x, h + y, z, B.CRYSTAL);
      set(x + 1, h + 1, z, B.CRYSTAL); set(x, h + 1, z + 1, B.CRYSTAL);
    }
  }
}

function surfaceY(x, z) {
  for (let y = H - 1; y > 0; y--) {
    const b = get(x, y, z);
    if (b !== B.AIR && b !== B.LEAVES && b !== B.LOG && b !== B.CACTUS) return y;
  }
  return 0;
}

// ---------------------------------------------------------------- structures
const sites = [];          // {name,type,x,z,y,r,found}
const chests = new Map();  // "x,y,z" -> loot table name
const lore = new Map();    // "x,y,z" -> {title,text}
const key = (x, y, z) => x + ',' + y + ',' + z;
const siteRng = rnd;

function addSite(name, type, x, z, y, r) { sites.push({ name, type, x, z, y, r, found: false }); }

function findSpot(rad, opts) {
  opts = opts || {};
  let maxVar = opts.maxVar || 4, minDist = opts.minDist || 34;
  for (let t = 0; t < 900; t++) {
    if (t === 300) { maxVar += 3; minDist -= 8; }
    if (t === 600) { maxVar += 3; minDist -= 8; }
    let x, z;
    if (opts.near) { x = Math.floor(opts.near[0] + (rnd() - 0.5) * 2 * opts.spread); z = Math.floor(opts.near[1] + (rnd() - 0.5) * 2 * opts.spread); }
    else { x = Math.floor(rad + 6 + rnd() * (W - 2 * rad - 12)); z = Math.floor(rad + 6 + rnd() * (D - 2 * rad - 12)); }
    if (x < rad + 4 || z < rad + 4 || x > W - rad - 5 || z > D - rad - 5) continue;
    if (opts.biome !== undefined && biome[x + z * W] !== opts.biome) continue;
    let mn = 99, mx = 0, bad = false;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const sx = clamp(x + a * rad, 0, W - 1), sz = clamp(z + b * rad, 0, D - 1);
      const h = hm[sx + sz * W];
      if ((h <= SEA && !opts.allowLow) || (opts.biome !== undefined && biome[sx + sz * W] !== opts.biome && opts.strictBiome)) bad = true;
      mn = Math.min(mn, h); mx = Math.max(mx, h);
    }
    if (bad || mx - mn > maxVar) continue;
    let far = true;
    for (const s of sites) if (Math.hypot(s.x - x, s.z - z) < minDist) { far = false; break; }
    if (!far) continue;
    if (opts.nearWater) {
      let water = false;
      for (let k = 0; k < 16 && !water; k++) {
        const ang = k / 16 * Math.PI * 2;
        for (const rr of [rad + 6, rad + 12]) {
          const wx = Math.round(x + Math.cos(ang) * rr), wz = Math.round(z + Math.sin(ang) * rr);
          if (wx > 1 && wz > 1 && wx < W - 2 && wz < D - 2 && hm[wx + wz * W] < SEA && biome[wx + wz * W] !== 3) water = true;
        }
      }
      if (!water) continue;
    }
    return { x, z, gy: Math.max(hm[x + z * W], SEA + 1) };
  }
  return null;
}

function flatten(cx, cz, r, gy, topId, fillId) {
  for (let z = cz - r; z <= cz + r; z++) for (let x = cx - r; x <= cx + r; x++) {
    if (!inb(x, 1, z)) continue;
    if ((x - cx) * (x - cx) + (z - cz) * (z - cz) > r * r) continue;
    for (let y = H - 1; y > gy; y--) set(x, y, z, B.AIR);
    set(x, gy, z, topId);
    for (let y = gy - 1; y > 0; y--) {
      const b = get(x, y, z);
      if (b === B.AIR || b === B.WATER || b === B.LAVA || b === B.LEAVES || b === B.LOG || b === B.CACTUS) set(x, y, z, fillId);
      else break;
    }
  }
}

function mk(ox, oy, oz, r) {
  return function (lx, ly, lz, id) {
    let wx, wz;
    if (r === 0) { wx = lx; wz = lz; } else if (r === 1) { wx = -lz; wz = lx; }
    else if (r === 2) { wx = -lx; wz = -lz; } else { wx = lz; wz = -lx; }
    set(ox + wx, oy + ly, oz + wz, id);
    return [ox + wx, oy + ly, oz + wz];
  };
}
function fill(P, x0, y0, z0, x1, y1, z1, id) {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) P(x, y, z, id);
}
function addChest(p, table) { chests.set(key(p[0], p[1], p[2]), table); }
function addTablet(p, title, text) { lore.set(key(p[0], p[1], p[2]), { title, text }); }
function rotFor(dx, dz) { // rotation so the local -z door side points toward (-dx,-dz)
  if (Math.abs(dx) >= Math.abs(dz)) return dx > 0 ? 3 : 1;
  return dz > 0 ? 0 : 2;
}

const NATURAL = new Set([B.GRASS, B.DIRT, B.SAND, B.ASH, B.SANDSTONE, B.STONE]);
function pathTo(x0, z0, x1, z1, xFirst, wide) {
  let x = x0, z = z0;
  const lay = (px, pz) => {
    for (let w = 0; w <= (wide ? 1 : 0); w++) {
      const qx = px + (xFirst ? 0 : w), qz = pz + (xFirst ? w : 0);
      if (!inb(qx, 1, qz)) continue;
      const sy = surfaceY(qx, qz);
      if (NATURAL.has(get(qx, sy, qz))) set(qx, sy, qz, B.PATH);
    }
  };
  const stepX = () => { while (x !== x1) { lay(x, z); x += Math.sign(x1 - x); } };
  const stepZ = () => { while (z !== z1) { lay(x, z); z += Math.sign(z1 - z); } };
  if (xFirst) { stepX(); stepZ(); } else { stepZ(); stepX(); }
  lay(x, z);
}

function house(cx, cy, cz, r, hw, hd, wh, st, opts) {
  opts = opts || {};
  const P = mk(cx, cy, cz, r);
  for (let ly = 1; ly <= wh + hw + 3; ly++) for (let lz = -hd - 1; lz <= hd + 1; lz++) for (let lx = -hw - 1; lx <= hw + 1; lx++) P(lx, ly, lz, B.AIR);
  for (let lz = -hd; lz <= hd; lz++) for (let lx = -hw; lx <= hw; lx++) P(lx, 0, lz, st.floor);
  for (let ly = 1; ly <= wh; ly++) {
    for (let lx = -hw; lx <= hw; lx++) { P(lx, ly, -hd, st.wall); P(lx, ly, hd, st.wall); }
    for (let lz = -hd; lz <= hd; lz++) { P(-hw, ly, lz, st.wall); P(hw, ly, lz, st.wall); }
  }
  for (let ly = 1; ly <= wh; ly++) for (const sx of [-hw, hw]) for (const sz of [-hd, hd]) P(sx, ly, sz, st.post);
  P(0, 1, -hd, B.AIR); P(0, 2, -hd, B.AIR);
  if (wh >= 3) { P(-hw, 2, 0, B.AIR); P(hw, 2, 0, B.AIR); P(0, 2, hd, B.AIR); }
  if (st.flat) {
    for (let lz = -hd - 1; lz <= hd + 1; lz++) for (let lx = -hw - 1; lx <= hw + 1; lx++) {
      const edge = Math.abs(lx) === hw + 1 || Math.abs(lz) === hd + 1;
      P(lx, wh + 1, lz, st.roof);
      if (edge) P(lx, wh + 2, lz, st.roof);
    }
  } else {
    for (let k = 0; ; k++) {
      const ex = hw + 1 - k, ez = hd + 1 - k;
      if (ex < 0 || ez < 0) break;
      for (let lz = -ez; lz <= ez; lz++) for (let lx = -ex; lx <= ex; lx++) {
        if (Math.abs(lx) === ex || Math.abs(lz) === ez) P(lx, wh + 1 + k, lz, st.roof);
      }
    }
  }
  P(0, wh, 0, B.LAMP);
  if (!opts.bare) {
    P(-hw + 1, 1, hd - 1, B.CARPET); P(-hw + 1, 1, hd - 2, B.CARPET);
    const c = P(hw - 1, 1, hd - 1, B.CHEST); addChest(c, opts.loot || 'plain');
    P(hw - 1, 1, -hd + 1, B.FURNACE);
    P(-hw + 1, 1, -hd + 1, B.PLANKS);
  }
  const front = P(0, 0, -hd - 1, B.PATH);
  return { front, P };
}

function fountain(cx, gy, cz, rad, water) {
  rad = rad || 2;
  for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
    const m = Math.max(Math.abs(dx), Math.abs(dz));
    if (m === rad) set(cx + dx, gy + 1, cz + dz, B.COBBLE);
    else set(cx + dx, gy, cz + dz, B.WATER);
  }
  if (!water) { set(cx, gy + 1, cz, B.COBBLE); set(cx, gy + 2, cz, B.COBBLE); set(cx, gy + 3, cz, B.LAMP); }
}
function lampPost(x, gy, z) { set(x, gy + 1, z, B.LOG); set(x, gy + 2, z, B.LOG); set(x, gy + 3, z, B.LAMP); }
function stall(cx, gy, cz, r, loot) {
  const P = mk(cx, gy, cz, r);
  for (const sx of [-2, 2]) for (const sz of [-1, 1]) fill(P, sx, 1, sz, sx, 3, sz, B.LOG);
  for (let lz = -2; lz <= 2; lz++) for (let lx = -3; lx <= 3; lx++) P(lx, 4, lz, B.AWNING);
  for (let lx = -2; lx <= 2; lx++) P(lx, 1, -1, B.PLANKS);
  addChest(P(0, 1, 1, B.CHEST), loot);
}
function windmill(cx, gy, cz, r) {
  const P = mk(cx, gy, cz, r);
  for (let ly = 1; ly <= 9; ly++) for (let lz = -2; lz <= 2; lz++) for (let lx = -2; lx <= 2; lx++) {
    const edge = Math.abs(lx) === 2 || Math.abs(lz) === 2;
    P(lx, ly, lz, edge ? B.COBBLE : B.AIR);
  }
  P(0, 1, -2, B.AIR); P(0, 2, -2, B.AIR);
  for (let k = 0; k < 4; k++) for (let lz = -3; lz <= 3; lz++) for (let lx = -3; lx <= 3; lx++) {
    if (Math.abs(lx) + Math.abs(lz) <= 3 + k * 0 && Math.abs(lx) + Math.abs(lz) >= 0 && k === 0) P(lx, 10, lz, B.THATCH);
  }
  for (let i = -5; i <= 5; i++) { P(i, 7, -3, B.PLANKS); P(0, 7 + i, -3, B.PLANKS); }
  for (let i = -4; i <= 4; i += 1) { if (i !== 0) { P(i, 7 + (i > 0 ? 1 : -1), -3, B.AWNING); P(i > 0 ? 1 : -1, 7 + i, -3, B.AWNING); } }
  P(0, 7, -3, B.LOG);
  P(0, 1, 0, B.CARPET);
}
function pier(cx, gy, cz) {
  let best = null, bd = 1e9;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let d = 8; d < 40; d++) {
      const x = cx + dx * d, z = cz + dz * d;
      if (!inb(x, 1, z)) break;
      if (hm[x + z * W] < SEA) { if (d < bd) { bd = d; best = [dx, dz]; } break; }
    }
  }
  if (!best) return null;
  const [dx, dz] = best, px = -dz, pz = dx;
  let last = null;
  for (let d = 4; d < bd + 12; d++) {
    for (let w = -1; w <= 1; w++) {
      const x = cx + dx * d + px * w, z = cz + dz * d + pz * w;
      if (!inb(x, 1, z)) continue;
      set(x, SEA + 1, z, B.PLANKS);
      for (let y = SEA; y > hm[x + z * W] && y > 1; y--) if (w !== 0 && d % 3 === 0) set(x, y, z, B.LOG);
      for (let y = SEA + 2; y < SEA + 5; y++) if (get(x, y, z) !== B.AIR) set(x, y, z, B.AIR);
    }
    last = [cx + dx * d, cz + dz * d];
  }
  // boat
  if (last) {
    const bx = last[0] + best[0] * 0, bz = last[1];
    const P = mk(bx + px * 3, SEA, bz + pz * 3, dx !== 0 ? 1 : 0);
    for (let lz = -2; lz <= 2; lz++) for (let lx = -1; lx <= 1; lx++) P(lx, 1, lz, B.PLANKS);
    for (let lz = -2; lz <= 2; lz++) { P(-1, 2, lz, B.PLANKS); P(1, 2, lz, B.PLANKS); }
    P(0, 2, 2, B.PLANKS); P(0, 2, -2, B.PLANKS); fill(P, 0, 2, 0, 0, 4, 0, B.LOG);
    for (let ly = 3; ly <= 4; ly++) for (let lx = 1; lx <= 2; lx++) P(lx, ly, 0, B.AWNING);
    addChest(P(0, 2, 1, B.CHEST), 'sea');
  }
  return last;
}

const VILLAGE = {
  farm: { biome: 0, top: B.GRASS, fill: B.DIRT, st: { wall: B.PLANKS, floor: B.PLANKS, roof: B.THATCH, post: B.LOG }, loot: 'farm' },
  sea: { biome: 0, top: B.GRASS, fill: B.DIRT, st: { wall: B.PLANKS, floor: B.PLANKS, roof: B.AWNING, post: B.LOG }, loot: 'sea' },
  desert: { biome: 1, top: B.SAND, fill: B.SANDSTONE, st: { wall: B.SANDSTONE, floor: B.SANDSTONE, roof: B.SANDSTONE, post: B.SANDSTONE, flat: true }, loot: 'desert' },
  mining: { biome: 2, top: B.STONE, fill: B.STONE, st: { wall: B.COBBLE, floor: B.PLANKS, roof: B.PLANKS, post: B.LOG }, loot: 'mine' },
};
const HOUSE_SLOTS = [[-13, -9], [13, -9], [-13, 9], [13, 9], [0, -16], [0, 16]];

function buildVillage(kind, name, spot) {
  const cfg = VILLAGE[kind], { x: cx, z: cz, gy } = spot;
  flatten(cx, cz, 28, gy, cfg.top, cfg.fill);
  addSite(name, 'village', cx, cz, gy, 26);
  // plaza
  for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) set(cx + dx, gy, cz + dz, B.PATH);
  if (kind === 'desert') {
    fountain(cx, gy, cz, 4, true);
    for (const [dx, dz] of [[-3, -3], [3, 3]]) { for (let y = 1; y <= 5; y++) set(cx + dx * 2, gy + y, cz + dz * 2, B.LOG); for (let a = -2; a <= 2; a++) { set(cx + dx * 2 + a, gy + 6, cz + dz * 2, B.LEAVES); set(cx + dx * 2, gy + 6, cz + dz * 2 + a, B.LEAVES); } }
  } else fountain(cx, gy, cz, 2, false);
  lampPost(cx + 5, gy, cz + 5); lampPost(cx - 5, gy, cz - 5); lampPost(cx + 5, gy, cz - 5); lampPost(cx - 5, gy, cz + 5);
  HOUSE_SLOTS.forEach(([ox, oz], i) => {
    const hx = cx + ox, hz = cz + oz, r = rotFor(ox, oz);
    const big = i >= 4;
    const hw = big ? 4 : 2 + (i % 2), hd = big ? 5 : 2 + ((i + 1) % 2), wh = big ? 5 : 3;
    const st = Object.assign({}, cfg.st);
    let loot = cfg.loot;
    if (i === 4) { if (kind === 'farm') { st.wall = B.AWNING; st.roof = B.PLANKS; } if (kind === 'sea') { st.wall = B.COBBLE; } }
    if (i === 5) { st.wall = kind === 'desert' ? B.SANDSTONE : B.BRICK; loot = 'ruins'; }
    const h = house(hx, gy, hz, r, hw, hd, wh, st, { loot });
    if (i === 4 && kind === 'farm') { const P = h.P; fill(P, -hw + 1, 1, -hd + 2, -hw + 2, 2, hd - 2, B.HAY); }
    pathTo(h.front[0], h.front[1], cx, cz, r === 1 || r === 3, false);
  });
  stall(cx + 8, gy, cz - 3, 1, 'market'); stall(cx - 8, gy, cz + 3, 3, 'market');
  if (kind === 'farm') {
    windmill(cx - 22, gy, cz, 1);
    for (const oz of [-9, 9]) for (let dz = 0; dz < 5; dz++) for (let dx = 0; dx < 8; dx++) {
      const x = cx + 17 + dx - 4, z = cz + oz + dz - 2;
      if ((x - cx) ** 2 + (z - cz) ** 2 < 27 * 27) { set(x, gy, z, B.WHEAT); for (let y = gy + 1; y < gy + 4; y++) set(x, y, z, B.AIR); }
    }
  }
  if (kind === 'sea') pier(cx, gy, cz);
  if (kind === 'mining') {
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { set(cx + 20 + dx, gy, cz + 4 + dz, hash2(dx, dz, 3) < 0.4 ? B.CRYSTAL : B.IRON); if (Math.abs(dx) < 2 && Math.abs(dz) < 2) set(cx + 20 + dx, gy + 1, cz + 4 + dz, hash2(dx, dz, 4) < 0.5 ? B.IRON : B.AIR); }
    for (const [dx, dz] of [[0, -4], [0, 4], [-4, 0], [4, 0]]) set(cx + dx, gy + 4, cz + dz, B.CRYSTAL);
  }
  return spot;
}

function kneelingKing(spot) {
  const { x: cx, z: cz, gy } = spot, P = mk(cx, gy, cz, 0);
  flatten(cx, cz, 10, gy, B.BRICK, B.DIRT);
  fill(P, -7, 0, -7, 7, 0, 7, B.BRICK);
  fill(P, -6, 1, -6, 6, 1, -5, B.COBBLE); // steps
  fill(P, -2, 1, -1, 2, 4, 3, B.STONE);   // legs
  fill(P, -2, 1, -4, 0, 2, -2, B.STONE);  // kneeling shin
  fill(P, -2, 5, -1, 2, 11, 2, B.STONE);  // torso
  fill(P, -4, 7, -1, -3, 10, 0, B.STONE); fill(P, 3, 7, -1, 4, 10, 0, B.STONE); // arms
  fill(P, -1, 12, -1, 1, 14, 2, B.STONE); // head
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 2], [1, 2], [0, 0]]) P(a, 15, b, B.CRYSTAL); // crown
  fill(P, 0, 1, -5, 0, 10, -5, B.CRYSTAL); fill(P, -2, 11, -5, 2, 11, -5, B.COBBLE); fill(P, 0, 12, -5, 0, 13, -5, B.COBBLE); // greatsword
  P(-4, 11, -5, B.AIR);
  for (const [a, b] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) { fill(P, a, 1, b, a, 3, b, B.COBBLE); P(a, 4, b, B.LAMP); }
  addTablet(P(0, 1, -7, B.TABLET), 'The Kneeling King',
    'He did not flee. The last king knelt before the Guardian, laid down his sword, and the mountain kept his vigil ever since.');
  addChest(P(0, 1, 4, B.CHEST), 'royal');
  addSite('The Kneeling King', 'landmark', cx, cz, gy, 20);
}
function sunderedBlade(spot) {
  const { x: cx, z: cz, gy } = spot, P = mk(cx, gy, cz, 0);
  flatten(cx, cz, 8, gy, B.STONE, B.STONE);
  fill(P, 0, 1, 0, 1, 17, 0, B.IRON); fill(P, 0, 1, 0, 1, 2, 0, B.COBBLE);
  fill(P, -1, 12, 0, 2, 12, 0, B.COBBLE); P(0, 17, 0, B.CRYSTAL); P(1, 18, 0, B.CRYSTAL);
  fill(P, 4, 1, 2, 7, 1, 2, B.IRON); fill(P, 5, 2, 2, 6, 2, 2, B.IRON); // fallen shard
  for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, d = 3 + rnd() * 4; const x = Math.round(Math.cos(a) * d), z = Math.round(Math.sin(a) * d); fill(P, x, 1, z, x, 1 + Math.floor(rnd() * 3), z, B.CRYSTAL); }
  addTablet(P(2, 1, -3, B.TABLET), 'The Sundered Blade', 'Forged to end the sky-fall, snapped by it instead. Whoever drew it never came back to finish the swing.');
  addChest(P(-3, 1, 1, B.CHEST), 'fort');
  addSite('The Sundered Blade', 'landmark', cx, cz, gy, 16);
}
function graveyard(spot) {
  const { x: cx, z: cz, gy } = spot, P = mk(cx, gy, cz, 0);
  flatten(cx, cz, 9, gy, B.DIRT, B.DIRT);
  for (let i = -6; i <= 6; i++) for (const e of [-5, 5]) { P(i, 1, e, B.COBBLE); P(e, 1, i, B.COBBLE); }
  P(0, 1, -5, B.AIR); P(1, 1, -5, B.AIR); P(-1, 1, -5, B.AIR);
  for (let k = 0; k < 9; k++) { const x = -4 + (k % 3) * 3, z = -2 + Math.floor(k / 3) * 3; fill(P, x, 1, z, x, 2, z, B.COBBLE); P(x, 3, z, B.COBBLE); P(x - 1, 2, z, B.COBBLE); P(x + 1, 2, z, B.COBBLE); }
  for (let y = 1; y <= 4; y++) P(-4, y, 4, B.LOG); P(-3, 4, 4, B.LOG); P(-5, 3, 4, B.LOG);
  const c = house(cx, gy, cz + 9, 2, 2, 2, 3, { wall: B.COBBLE, floor: B.COBBLE, roof: B.COBBLE, post: B.DARKBRICK }, { bare: true, loot: 'ruins' });
  addChest(c.P(0, 1, 1, B.CHEST), 'ruins');
  addTablet(P(0, 1, -3, B.TABLET), 'Graveyard of the Fallen', 'Row on row, the guardians who held the pass. None were buried with names - only with their orders.');
  addSite('Graveyard', 'landmark', cx, cz, gy, 14);
}
function wagon(spot) {
  const { x: cx, z: cz, gy } = spot, P = mk(cx, gy, cz, 0);
  flatten(cx, cz, 6, gy, spot.top || B.SAND, spot.fill || B.SANDSTONE);
  fill(P, -1, 1, -3, 1, 1, 2, B.PLANKS); fill(P, -1, 2, -3, -1, 3, 2, B.PLANKS); P(-1, 3, 1, B.AIR); P(-1, 3, -1, B.AIR); P(1, 2, 2, B.PLANKS);
  P(1, 2, 0, B.AIR); P(0, 1, 0, B.AIR);
  for (const z of [-2, 2]) { P(2, 1, z, B.LOG); P(2, 2, z, B.LOG); P(2, 3, z, B.LOG); P(3, 2, z, B.LOG); P(1, 2, z, B.LOG); }
  P(4, 1, -1, B.HAY); P(4, 1, 0, B.HAY); P(5, 1, -1, B.HAY);
  addChest(P(0, 2, 0, B.CHEST), 'desert');
  addSite('Wrecked Wagon', 'landmark', cx, cz, gy, 10);
}
function oldMine(spot) {
  const { x: cx, z: cz, gy } = spot, P = mk(cx, gy, cz, 0);
  flatten(cx, cz, 6, gy, B.STONE, B.STONE);
  const depth = Math.min(14, gy - 4);
  for (let i = 0; i <= depth; i++) for (let lx = -1; lx <= 1; lx++) for (let ly = 1; ly <= 3; ly++) P(lx, -i + ly, i + 1, B.AIR);
  for (let i = 0; i <= depth; i += 4) { P(-1, -i + 3, i + 1, B.LAMP); }
  for (const s of [-2, 2]) fill(P, s, 1, 0, s, 4, 0, B.LOG); fill(P, -2, 5, 0, 2, 5, 0, B.PLANKS);
  for (let i = -2; i <= 2; i += 2) P(i, 0, -1, B.COBBLE);
  const bx = depth + 2;
  for (let lz = bx; lz <= bx + 8; lz++) for (let lx = -4; lx <= 4; lx++) for (let ly = -depth; ly <= -depth + 4; ly++) {
    const edge = Math.abs(lx) === 4 || lz === bx + 8;
    P(lx, ly, lz, edge ? (hash2(lx, lz, 9) < 0.3 ? B.IRON : B.STONE) : (ly === -depth ? B.STONE : B.AIR));
  }
  for (let i = 0; i <= 8; i++) { P(0, -depth + 1, depth + 1 + i, B.AIR); }
  P(-3, -depth + 1, bx + 6, B.CRYSTAL); P(3, -depth + 1, bx + 6, B.CRYSTAL); P(3, -depth + 2, bx + 6, B.CRYSTAL);
  P(0, -depth + 4, bx + 4, B.LAMP);
  addChest(P(0, -depth + 1, bx + 7, B.CHEST), 'mine');
  addTablet(P(0, 1, -2, B.TABLET), 'Old Mine', 'Seventeen shifts went down. The lamps burn still, but nobody has counted the miners since.');
  addSite('Old Mine', 'landmark', cx, cz, gy, 14);
}
function ruins(spot) {
  const { x: cx, z: cz, gy } = spot, P = mk(cx, gy, cz, 0);
  flatten(cx, cz, 11, gy, spot.top || B.SAND, spot.fill || B.SANDSTONE);
  fill(P, -6, 0, -6, 6, 0, 6, B.BRICK);
  for (let i = -7; i <= 7; i++) for (const e of [-7, 7]) {
    const h1 = Math.floor(hash2(i, e, 21) * 5), h2 = Math.floor(hash2(e, i, 22) * 5);
    if (hash2(i, e, 23) > 0.25) fill(P, i, 1, e, i, h1, e, B.BRICK);
    if (hash2(e, i, 24) > 0.25) fill(P, e, 1, i, e, h2, i, B.BRICK);
  }
  for (const [a, b] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) fill(P, a, 1, b, a, 5 + Math.floor(hash2(a, b, 30) * 4), b, B.BRICK);
  for (let k = 0; k < 8; k++) { const x = Math.floor(rnd() * 10 - 5), z = Math.floor(rnd() * 10 - 5); P(x, 1, z, hash2(x, z, 31) < 0.5 ? B.BRICK : B.CRYSTAL); }
  addTablet(P(0, 1, -2, B.TABLET), 'Veale Hold', 'The people of Veale Hold lived in the shadow of the Titan and called it their Guardian. The ninth year of the last king, the sky split and struck glass.');
  addTablet(P(3, 1, 3, B.TABLET), 'Veale Hold - Last Entry', 'Burning shards fell across the land and the Guardian woke in anger. We are leaving the keys under the altar.');
  addChest(P(0, 1, 0, B.CHEST), 'ruins');
  addSite('Ruins of Veale Hold', 'landmark', cx, cz, gy, 16);
}
function lookout(spot) {
  const { x: cx, z: cz, gy } = spot, P = mk(cx, gy, cz, 0);
  flatten(cx, cz, 7, gy, spot.top || B.GRASS, spot.fill || B.DIRT);
  fill(P, -1, 1, -1, 1, 12, 1, B.COBBLE);
  for (let k = 0; k < 12; k++) fill(P, 3 + k, 1, 0, 3 + k, 12 - k, 0, B.PLANKS);
  fill(P, -2, 13, -2, 2, 13, 2, B.PLANKS);
  for (let i = -2; i <= 2; i++) for (const e of [-2, 2]) { P(i, 14, e, B.PLANKS); P(e, 14, i, B.PLANKS); }
  P(2, 14, 0, B.AIR);
  for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { P(a, 15, b, B.LOG); P(a, 16, b, B.LAMP); }
  addChest(P(0, 14, 0, B.CHEST), 'camp');
  addTablet(P(-1, 14, 1, B.TABLET), 'Lookout Post', 'From here you can see every road in the realm, and everything walking along them after dark.');
  addSite('Lookout Post', 'landmark', cx, cz, gy, 14);
}
function camp(spot, name, top, fillB) {
  const { x: cx, z: cz, gy } = spot, P = mk(cx, gy, cz, 0);
  flatten(cx, cz, 6, gy, top, fillB);
  for (let lz = -2; lz <= 2; lz++) for (let lx = -2; lx <= 2; lx++) { P(lx, 3 - Math.abs(lx), lz, B.AWNING); P(lx, 0, lz, B.CARPET); }
  for (let lx = -1; lx <= 1; lx++) { P(lx, 1, -2, B.AWNING); }
  addChest(P(0, 1, 1, B.CHEST), 'camp');
  fill(P, 4, 1, -3, 4, 1, 0, B.LOG); fill(P, 4, 2, -2, 4, 2, -1, B.LOG);
  P(-4, 1, 2, B.COBBLE); P(-3, 1, 2, B.COBBLE); P(-4, 1, 3, B.COBBLE); P(-3, 1, 3, B.COBBLE); P(-4, 2, 2, B.LAMP);
  addSite(name, 'camp', cx, cz, gy, 9);
}
function fortress(spot) {
  const { x: cx, z: cz, gy } = spot, P = mk(cx, gy, cz, 0);
  flatten(cx, cz, 19, gy, B.ASH, B.STONE);
  for (let lz = -18; lz <= 18; lz++) for (let lx = -18; lx <= 18; lx++) {
    const m = Math.max(Math.abs(lx), Math.abs(lz));
    if (m >= 14 && m <= 16) { for (let y = 1; y <= 3; y++) P(lx, -y, lz, B.AIR); P(lx, -2, lz, B.LAVA); P(lx, -3, lz, B.LAVA); P(lx, -4, lz, B.STONE); P(lx, 0, lz, B.AIR); }
  }
  for (let lx = -2; lx <= 2; lx++) for (let lz = 13; lz <= 17; lz++) { P(lx, 0, lz, B.DARKBRICK); P(lx, -1, lz, B.DARKBRICK); P(lx, -2, lz, B.DARKBRICK); P(lx, -3, lz, B.DARKBRICK); } // bridge
  fill(P, -12, 0, -12, 12, 0, 12, B.DARKBRICK);
  for (let ly = 1; ly <= 7; ly++) for (let i = -12; i <= 12; i++) for (const e of [-12, 12]) {
    if (!(e === 12 && Math.abs(i) <= 1 && ly <= 3)) P(i, ly, e, B.DARKBRICK);
    P(e, ly, i, B.DARKBRICK);
  }
  for (let i = -12; i <= 12; i += 2) for (const e of [-12, 12]) { P(i, 8, e, B.DARKBRICK); P(e, 8, i, B.DARKBRICK); }
  for (const [a, b] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) { fill(P, a - 2, 1, b - 2, a + 2, 13, b + 2, B.DARKBRICK); fill(P, a - 1, 14, b - 1, a + 1, 14, b + 1, B.LAVA); P(a, 15, b, B.LAMP); }
  fill(P, -4, 1, -4, 4, 9, 4, B.DARKBRICK); fill(P, -3, 1, -3, 3, 8, 3, B.AIR); P(0, 1, 4, B.AIR); P(0, 2, 4, B.AIR);
  P(0, 8, 0, B.LAMP);
  addChest(P(0, 1, -2, B.CHEST), 'fort'); addChest(P(-2, 1, 2, B.CHEST), 'fort');
  P(2, 1, 2, B.SPAWNER); P(-8, 1, -8, B.SPAWNER); P(8, 1, -8, B.SPAWNER);
  addTablet(P(0, 1, 7, B.TABLET), 'Cinder Keep', 'Built where the sky-glass burned deepest. The garrison asked for water. The mountain answered with lava.');
  addSite('Cinder Keep', 'landmark', cx, cz, gy, 22);
}

function buildWorld() {
  generate();
  const plan = [];
  const centre = findSpot(28, { near: [80, 80], spread: 14, maxVar: 6, minDist: 0, biome: 0 }) ||
    findSpot(28, { maxVar: 8, minDist: 0 });
  buildVillage('farm', 'Greenhollow', centre);
  const spawnSite = centre;
  const tryBuild = (rad, opts, fn) => { const s = findSpot(rad, opts); if (s) fn(s); return s; };
  tryBuild(28, { biome: 0, nearWater: true, maxVar: 6, minDist: 40 }, s => buildVillage('sea', 'Reedwater', s)) ||
    tryBuild(28, { biome: 0, maxVar: 7, minDist: 36 }, s => buildVillage('sea', 'Brookmere', s));
  tryBuild(28, { biome: 1, maxVar: 6, minDist: 40 }, s => buildVillage('desert', 'Amaru Oasis', s));
  tryBuild(28, { biome: 2, maxVar: 12, minDist: 36, allowLow: true }, s => buildVillage('mining', 'Iron Crag', s));
  tryBuild(12, { biome: 0, maxVar: 5, minDist: 34 }, kneelingKing) || tryBuild(12, { maxVar: 6, minDist: 30 }, kneelingKing);
  tryBuild(10, { biome: 2, maxVar: 7, minDist: 28 }, sunderedBlade) || tryBuild(10, { maxVar: 7, minDist: 26 }, sunderedBlade);
  tryBuild(11, { biome: 0, maxVar: 5, minDist: 30 }, graveyard);
  tryBuild(8, { biome: 1, maxVar: 4, minDist: 26 }, s => { s.top = B.SAND; s.fill = B.SANDSTONE; wagon(s); });
  tryBuild(8, { biome: 2, maxVar: 7, minDist: 28 }, oldMine);
  tryBuild(13, { biome: 1, maxVar: 5, minDist: 30 }, s => { s.top = B.SAND; s.fill = B.SANDSTONE; ruins(s); }) || tryBuild(13, { maxVar: 6, minDist: 28 }, ruins);
  tryBuild(9, { biome: 0, maxVar: 5, minDist: 28 }, lookout);
  tryBuild(22, { biome: 3, maxVar: 10, minDist: 30, allowLow: true }, fortress);
  tryBuild(8, { biome: 0, maxVar: 5, minDist: 26 }, s => camp(s, "Woodcutter's Camp", B.GRASS, B.DIRT));
  tryBuild(8, { biome: 1, maxVar: 5, minDist: 26 }, s => camp(s, 'Dune Camp', B.SAND, B.SANDSTONE));
  tryBuild(8, { biome: 2, maxVar: 7, minDist: 26 }, s => camp(s, 'Crystal Camp', B.STONE, B.STONE));
  tryBuild(8, { biome: 3, maxVar: 7, minDist: 26 }, s => camp(s, 'Ember Camp', B.ASH, B.STONE));
  // roads between villages
  const vil = sites.filter(s => s.type === 'village');
  for (let i = 1; i < vil.length; i++) pathTo(vil[i].x, vil[i].z, vil[0].x, vil[0].z, i % 2 === 0, true);
  plan.push(spawnSite);
  return spawnSite;
}

// ---------------------------------------------------------------- items / loot
const LOOT = {
  farm: [['bread', 1, 3, 1], ['potion', 1, 1, 0.3], ['gold', 1, 3, 0.6]],
  sea: [['bread', 1, 2, 1], ['potion', 1, 1, 0.5], ['gold', 1, 4, 0.6]],
  desert: [['potion', 1, 2, 0.7], ['gold', 2, 5, 0.8], ['shard', 1, 1, 0.3]],
  mine: [['iron', 2, 5, 1], ['shard', 1, 3, 0.7], ['gold', 1, 3, 0.5]],
  ruins: [['journal', 1, 1, 1], ['gold', 3, 6, 1], ['shard', 1, 2, 0.6], ['potion', 1, 1, 0.5]],
  camp: [['bread', 1, 2, 0.8], ['gold', 1, 2, 0.5]],
  royal: [['journal', 1, 1, 1], ['gold', 5, 10, 1], ['shard', 2, 4, 1], ['potion', 1, 2, 0.8]],
  fort: [['iron', 3, 6, 1], ['gold', 4, 8, 1], ['potion', 1, 2, 0.8], ['shard', 1, 3, 0.7]],
  market: [['bread', 2, 4, 1], ['potion', 1, 1, 0.4], ['gold', 1, 3, 0.7]],
  plain: [['bread', 1, 2, 0.7], ['gold', 1, 2, 0.4]],
};
const ITEM_LABEL = { bread: 'Bread', potion: 'Ranger Potion', shard: 'Crystal Shard', journal: 'Journal Page', iron: 'Iron Ingot', gold: 'Gold Coin' };
const items = { bread: 2, potion: 0, shard: 0, journal: 0, iron: 0, gold: 0 };
const HOTBAR = [B.PLANKS, B.COBBLE, B.DIRT, B.STONE, B.SAND, B.LOG, B.THATCH, B.LAMP, B.CRYSTAL];
const inv = {}; for (const b of HOTBAR) inv[b] = 0;
inv[B.PLANKS] = 64; inv[B.COBBLE] = 64; inv[B.LAMP] = 8;
let sel = 0;

// ---------------------------------------------------------------- rendering
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.08, 220);
camera.rotation.order = 'YXZ';
scene.fog = new THREE.Fog(0x87c5f0, 50, 118);
const matOpq = new THREE.MeshBasicMaterial({ vertexColors: true });
const matGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
const matWater = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.68, depthWrite: false });
const mats = [matOpq, matWater, matGlow];

const FACES = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], sh: 0.82, k: 's' },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], sh: 0.82, k: 's' },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], sh: 1, k: 't' },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], sh: 0.5, k: 'b' },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], sh: 0.68, k: 's' },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], sh: 0.68, k: 's' },
];
const chunkMeshes = new Array(NCX * NCZ).fill(null);
function nb(x, y, z) { if (x < 0 || z < 0 || x >= W || z >= D || y < 0) return 255; if (y >= H) return 0; return world[idx(x, y, z)]; }

function buildChunk(cx, cz) {
  const g = [{ p: [], c: [], i: [] }, { p: [], c: [], i: [] }, { p: [], c: [], i: [] }];
  const x0 = cx * CS, z0 = cz * CS;
  for (let y = 0; y < H; y++) for (let z = z0; z < z0 + CS; z++) for (let x = x0; x < x0 + CS; x++) {
    const id = world[idx(x, y, z)];
    if (!id) continue;
    const liquid = id === B.WATER || id === B.LAVA;
    const gi = id === B.WATER ? 1 : (GLOW[id] ? 2 : 0), gg = g[gi];
    const jit = 0.93 + 0.14 * hash2(x * 7 + y * 13, z, 5);
    const cdef = COL[id];
    for (let f = 0; f < 6; f++) {
      const F = FACES[f], n = nb(x + F.n[0], y + F.n[1], z + F.n[2]);
      const vis = liquid ? n === 0 : (n === 0 || n === B.WATER || n === B.LAVA);
      if (!vis) continue;
      const base = F.k === 't' ? cdef.t : F.k === 'b' ? cdef.b : cdef.s;
      const sh = gi === 2 ? 1 : F.sh * jit;
      const start = gg.p.length / 3;
      for (let v = 0; v < 4; v++) {
        const vv = F.v[v];
        const wy = (id === B.WATER && F.k === 't') ? y + 0.88 : y + vv[1];
        gg.p.push(x + vv[0], wy, z + vv[2]);
        const cc = (id === B.GRASS && F.k === 's' && vv[1] === 1) ? cdef.t : base;
        gg.c.push(cc.r * sh, cc.g * sh, cc.b * sh);
      }
      gg.i.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  }
  const out = [];
  for (let k = 0; k < 3; k++) {
    if (!g[k].i.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g[k].p, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(g[k].c, 3));
    geo.setIndex(g[k].i);
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mats[k]);
    if (k === 1) m.renderOrder = 1;
    scene.add(m); out.push(m);
  }
  return out;
}
function rebuildChunk(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= NCX || cz >= NCZ) return;
  const i = cx + cz * NCX;
  if (chunkMeshes[i]) for (const m of chunkMeshes[i]) { scene.remove(m); m.geometry.dispose(); }
  chunkMeshes[i] = buildChunk(cx, cz);
}
function setBlock(x, y, z, id) {
  if (!inb(x, y, z)) return;
  set(x, y, z, id);
  const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
  rebuildChunk(cx, cz);
  if (x % CS === 0) rebuildChunk(cx - 1, cz); if (x % CS === CS - 1) rebuildChunk(cx + 1, cz);
  if (z % CS === 0) rebuildChunk(cx, cz - 1); if (z % CS === CS - 1) rebuildChunk(cx, cz + 1);
}

// sky: sun + moon
const skyPivot = new THREE.Group(); scene.add(skyPivot);
const sun = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: 0xfff1a8, fog: false, depthWrite: false }));
const moon = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false, depthWrite: false }));
sun.position.set(0, 0, -150); moon.position.set(0, 0, 150); sun.lookAt(0, 0, 0); moon.lookAt(0, 0, 0);
sun.renderOrder = -2; moon.renderOrder = -2;
skyPivot.add(sun, moon);
const SKY_DAY = new THREE.Color(0x87c5f0), SKY_NIGHT = new THREE.Color(0x070b1e), SKY_DUSK = new THREE.Color(0xe8905a);
let timeOfDay = 0.18, daylight = 1;
function updateSky(dt) {
  timeOfDay = (timeOfDay + dt / 360) % 1;
  const s = Math.sin(timeOfDay * Math.PI * 2);
  daylight = clamp(s * 1.5 + 0.35, 0.16, 1);
  const c = SKY_NIGHT.clone().lerp(SKY_DAY, (daylight - 0.16) / 0.84);
  const dusk = Math.max(0, 1 - Math.abs(s) * 4) * 0.55;
  c.lerp(SKY_DUSK, dusk);
  scene.background = c; scene.fog.color.copy(c);
  matOpq.color.setScalar(0.28 + 0.72 * (daylight - 0.16) / 0.84 + 0.0);
  matWater.color.setScalar(0.35 + 0.65 * (daylight - 0.16) / 0.84);
  skyPivot.position.copy(camera.position);
  skyPivot.rotation.x = timeOfDay * Math.PI * 2 - Math.PI / 2;
}

// ---------------------------------------------------------------- physics
function solidAt(x, y, z) {
  if (y < 0) return true;
  if (x < 0 || z < 0 || x >= W || z >= D) return true;
  if (y >= H) return false;
  return SOLID[world[idx(x, y, z)]] === 1;
}
function collides(px, py, pz, hw, h) {
  const x0 = Math.floor(px - hw), x1 = Math.floor(px + hw), y0 = Math.floor(py), y1 = Math.floor(py + h - 0.001), z0 = Math.floor(pz - hw), z1 = Math.floor(pz + hw);
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (solidAt(x, y, z)) return true;
  return false;
}
function moveBody(b, dt) {
  b.hitX = false; b.hitZ = false; b.onGround = false;
  const nx = b.x + b.vx * dt;
  if (!collides(nx, b.y, b.z, b.hw, b.h)) b.x = nx; else { b.vx = 0; b.hitX = true; }
  const nz = b.z + b.vz * dt;
  if (!collides(b.x, b.y, nz, b.hw, b.h)) b.z = nz; else { b.vz = 0; b.hitZ = true; }
  const ny = b.y + b.vy * dt;
  if (!collides(b.x, ny, b.z, b.hw, b.h)) b.y = ny;
  else { if (b.vy < 0) { b.onGround = true; const sy = Math.floor(ny) + 1; if (!collides(b.x, sy, b.z, b.hw, b.h)) b.y = sy; } b.vy = 0; }
}

// ---------------------------------------------------------------- player
const player = { x: 80, y: 30, z: 80, vx: 0, vy: 0, vz: 0, hw: 0.3, h: 1.8, hp: 20, onGround: false, yaw: 0, pitch: 0, hurtT: 0, atkT: 0, useT: 0 };
let spawnPoint = [80, 30, 80];
const keys = {};
let playing = false, explorer = false, mouseL = false, mouseR = false, showCompass = true;

function powerLevel() { return 3 + Math.min(6, Math.floor(items.iron / 2)); }

// voxel ray
function raycast(ox, oy, oz, dx, dy, dz, max) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
  const tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity, tdz = dz ? Math.abs(1 / dz) : Infinity;
  let tx = dx > 0 ? (x + 1 - ox) * tdx : dx < 0 ? (ox - x) * tdx : Infinity;
  let ty = dy > 0 ? (y + 1 - oy) * tdy : dy < 0 ? (oy - y) * tdy : Infinity;
  let tz = dz > 0 ? (z + 1 - oz) * tdz : dz < 0 ? (oz - z) * tdz : Infinity;
  let px = x, py = y, pz = z, t = 0;
  for (let i = 0; i < 80; i++) {
    const id = get(x, y, z);
    if (id && id !== B.WATER && id !== B.LAVA) return { x, y, z, px, py, pz, t, id };
    px = x; py = y; pz = z;
    if (tx < ty && tx < tz) { t = tx; x += sx; tx += tdx; } else if (ty < tz) { t = ty; y += sy; ty += tdy; } else { t = tz; z += sz; tz += tdz; }
    if (t > max) break;
  }
  return null;
}
function lookDir() {
  const cp = Math.cos(player.pitch);
  return [-Math.sin(player.yaw) * cp, Math.sin(player.pitch), -Math.cos(player.yaw) * cp];
}

// ---------------------------------------------------------------- HUD
const $ = id => document.getElementById(id);
const hudHearts = $('hearts'), hudPower = $('power'), hudHot = $('hotbar'), hudItems = $('items'), hudComp = $('compass');
let toastTimer = 0;
function toast(msg, ms) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms || 3200);
}
function banner(name) {
  const b = $('banner'); $('bname').textContent = name;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
function hex(c) { return '#' + c.getHexString(); }
function drawHud() {
  const full = Math.ceil(player.hp / 2);
  hudHearts.textContent = '♥'.repeat(full) + '♡'.repeat(10 - full);
  hudPower.textContent = 'Power ' + powerLevel() + ' · ' + items.gold + ' gold · ' + sites.filter(s => s.found).length + '/' + sites.length + ' discovered' + (explorer ? ' · EXPLORER' : '');
  let h = '';
  HOTBAR.forEach((b, i) => { h += '<div class="slot' + (i === sel ? ' sel' : '') + '"><s>' + (i + 1) + '</s><i style="background:' + hex(COL[b].t) + '"></i><b>' + inv[b] + '</b></div>'; });
  hudHot.innerHTML = h;
  let it = '';
  for (const k of Object.keys(items)) if (items[k] > 0 || k === 'bread') it += ITEM_LABEL[k] + ': ' + items[k] + (k === 'bread' ? ' [F]' : k === 'potion' ? ' [Q]' : '') + '<br>';
  hudItems.innerHTML = it;
}
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
function drawCompass() {
  if (!showCompass) { hudComp.style.display = 'none'; return; }
  hudComp.style.display = '';
  const list = sites.map(s => ({ s, d: Math.hypot(s.x - player.x, s.z - player.z) })).sort((a, b) => a.d - b.d).slice(0, 7);
  let h = '<b>COMPASS</b><br>';
  for (const { s, d } of list) {
    const ang = Math.atan2(-(s.x - player.x), -(s.z - player.z)) - player.yaw;
    const k = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
    h += '<span class="' + (s.found ? 'd' : 'u') + '">' + ARROWS[k] + ' ' + (s.found ? s.name : '???') + ' ' + Math.round(d) + 'm</span><br>';
  }
  hudComp.innerHTML = h;
}
const mapCv = $('map'), mapCtx = mapCv.getContext('2d');
const mapBase = document.createElement('canvas'); mapBase.width = W; mapBase.height = D;
function buildMinimap() {
  const ctx = mapBase.getContext('2d'), img = ctx.createImageData(W, D);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    let y = H - 1; while (y > 0 && !world[idx(x, y, z)]) y--;
    const id = world[idx(x, y, z)], c = COL[id] ? COL[id].t : new THREE.Color(0);
    const sh = 0.72 + (y - 10) * 0.012, o = (x + z * W) * 4;
    img.data[o] = clamp(c.r * 255 * sh, 0, 255); img.data[o + 1] = clamp(c.g * 255 * sh, 0, 255); img.data[o + 2] = clamp(c.b * 255 * sh, 0, 255); img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
function drawMinimap() {
  mapCtx.drawImage(mapBase, 0, 0, 160, 160);
  for (const s of sites) { if (!s.found) continue; mapCtx.fillStyle = s.type === 'village' ? '#ffd86b' : '#fff'; mapCtx.fillRect(s.x - 2, s.z - 2, s.type === 'village' ? 5 : 4, s.type === 'village' ? 5 : 4); }
  mapCtx.save(); mapCtx.translate(player.x, player.z); mapCtx.rotate(-player.yaw);
  mapCtx.fillStyle = '#ff3b4a'; mapCtx.beginPath(); mapCtx.moveTo(0, -5); mapCtx.lineTo(3.5, 4); mapCtx.lineTo(-3.5, 4); mapCtx.fill(); mapCtx.restore();
}

// ---------------------------------------------------------------- mobs
const MOBS = {
  zombie: { hp: 10, sp: 2.4, dmg: 3, body: 0x3f7fb0, skin: 0x5fb06a, det: 16, s: 1 },
  husk: { hp: 12, sp: 2.5, dmg: 3, body: 0x9c8250, skin: 0xd2bd8f, det: 16, s: 1 },
  golem: { hp: 22, sp: 1.9, dmg: 5, body: 0x2b86a8, skin: 0x7fe3ff, det: 13, s: 1.3 },
  imp: { hp: 8, sp: 3.3, dmg: 3, body: 0x8a1f0a, skin: 0xff7a2a, det: 20, s: 0.85 },
};
const BIOME_MOB = ['zombie', 'husk', 'golem', 'imp'];
const mobs = [];
const boxGeo = {};
function bg(w, h, d) { const k = w + 'x' + h + 'x' + d; return boxGeo[k] || (boxGeo[k] = new THREE.BoxGeometry(w, h, d)); }
function makeMob(type, x, y, z) {
  const d = MOBS[type], s = d.s;
  const mBody = new THREE.MeshBasicMaterial({ color: d.body }), mSkin = new THREE.MeshBasicMaterial({ color: d.skin });
  const g = new THREE.Group();
  const torso = new THREE.Mesh(bg(0.6 * s, 0.8 * s, 0.35 * s), mBody); torso.position.y = 1.0 * s;
  const head = new THREE.Mesh(bg(0.5 * s, 0.5 * s, 0.5 * s), mSkin); head.position.y = 1.65 * s;
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x111111 });
  for (const ex of [-0.12, 0.12]) { const e = new THREE.Mesh(bg(0.1 * s, 0.1 * s, 0.05 * s), eyeM); e.position.set(ex * s, 1.7 * s, 0.26 * s); g.add(e); }
  const limb = (w, hh, px, py, mat) => { const pv = new THREE.Group(); pv.position.set(px * s, py * s, 0); const m = new THREE.Mesh(bg(w * s, hh * s, w * s), mat); m.position.y = -hh * s / 2; pv.add(m); g.add(pv); return pv; };
  const legL = limb(0.25, 0.6, -0.15, 0.6, mBody), legR = limb(0.25, 0.6, 0.15, 0.6, mBody);
  const armL = limb(0.2, 0.7, -0.4, 1.4, mSkin), armR = limb(0.2, 0.7, 0.4, 1.4, mSkin);
  g.add(torso, head); scene.add(g);
  const m = { type, x, y, z, vx: 0, vy: 0, vz: 0, hw: 0.3 * Math.max(1, s), h: 1.9 * s, hp: d.hp, g, legL, legR, armL, armR, mats: [mBody, mSkin], flash: 0, atk: 0, wx: 0, wz: 0, wt: 0, phase: Math.random() * 6, onGround: false };
  mobs.push(m); return m;
}
function removeMob(m) {
  scene.remove(m.g); const i = mobs.indexOf(m); if (i >= 0) mobs.splice(i, 1);
  for (const x of m.mats) x.dispose();
}
function inVillage(x, z, pad) { for (const s of sites) if (s.type === 'village' && Math.hypot(s.x - x, s.z - z) < s.r + (pad || 0)) return true; return false; }
function trySpawnMob(type, x, z) {
  x = Math.floor(x); z = Math.floor(z);
  if (x < 3 || z < 3 || x > W - 4 || z > D - 4) return false;
  const y = surfaceY(x, z);
  const top = get(x, y, z);
  if (top === B.WATER || top === B.LAVA || y <= SEA) return false;
  if (inVillage(x, z, 6)) return false;
  if (collides(x + 0.5, y + 1, z + 0.5, 0.35, 2.4)) return false;
  makeMob(type, x + 0.5, y + 1, z + 0.5);
  return true;
}
function hurtPlayer(n) {
  if (player.hurtT > 0) return;
  player.hp -= n; player.hurtT = 0.6;
  const h = $('hurt'); h.style.opacity = 1; setTimeout(() => { h.style.opacity = 0; }, 160);
  if (player.hp <= 0) {
    player.hp = 20; player.x = spawnPoint[0]; player.y = spawnPoint[1]; player.z = spawnPoint[2]; player.vx = player.vy = player.vz = 0;
    toast('You died - respawned in Greenhollow. Your loot is safe.', 4000);
  }
}
function killMob(m) {
  const d = Math.random();
  if (d < 0.5) items.gold += 1 + Math.floor(Math.random() * 2);
  if (d > 0.8) items.bread++;
  if (m.type === 'golem' && Math.random() < 0.6) items.shard++;
  if (m.type === 'imp' && Math.random() < 0.3) items.iron++;
  removeMob(m); drawHud();
}
let spawnTimer = 0;
function updateMobs(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = 1.5;
    const pb = biome[clamp(Math.floor(player.x), 0, W - 1) + clamp(Math.floor(player.z), 0, D - 1) * W];
    const type = BIOME_MOB[pb];
    const cap = type === 'zombie' ? 14 : 10;
    const night = daylight < 0.55;
    if (mobs.filter(m => m.type === type).length < cap && (type !== 'zombie' || night)) {
      const a = Math.random() * 6.283, r = 22 + Math.random() * 22;
      const x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r;
      if (biome[clamp(Math.floor(x), 0, W - 1) + clamp(Math.floor(z), 0, D - 1) * W] === pb) trySpawnMob(type, x, z);
    }
  }
  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i], d = MOBS[m.type];
    const dx = player.x - m.x, dz = player.z - m.z, dist = Math.hypot(dx, dz);
    if (dist > 75 || (m.type === 'zombie' && daylight > 0.8 && dist > 30) || m.y < 1) { removeMob(m); continue; }
    let mx = 0, mz = 0, speed = 0;
    if (!explorer && dist < d.det && Math.abs(player.y - m.y) < 8) { mx = dx / dist; mz = dz / dist; speed = d.sp; }
    else { m.wt -= dt; if (m.wt <= 0) { m.wt = 2 + Math.random() * 3; const a = Math.random() * 6.283, on = Math.random() < 0.5; m.wx = on ? Math.cos(a) : 0; m.wz = on ? Math.sin(a) : 0; } mx = m.wx; mz = m.wz; speed = 0.9; }
    const inW = get(Math.floor(m.x), Math.floor(m.y + 0.4), Math.floor(m.z)) === B.WATER;
    m.vx += (mx * speed - m.vx) * Math.min(1, dt * 10); m.vz += (mz * speed - m.vz) * Math.min(1, dt * 10);
    m.vy -= (inW ? 6 : 28) * dt; if (inW) m.vy = Math.max(m.vy, -2) + 14 * dt; m.vy = Math.max(m.vy, -30);
    moveBody(m, dt);
    if ((m.hitX || m.hitZ) && m.onGround && speed > 0) m.vy = 8.2;
    if (get(Math.floor(m.x), Math.floor(m.y + 0.2), Math.floor(m.z)) === B.LAVA && m.type !== 'imp') { m.hp -= 4 * dt; if (m.hp <= 0) { removeMob(m); continue; } }
    m.phase += dt * (Math.hypot(m.vx, m.vz) * 2.4 + 0.1);
    const sw = Math.sin(m.phase * 2) * 0.7 * Math.min(1, Math.hypot(m.vx, m.vz));
    m.legL.rotation.x = sw; m.legR.rotation.x = -sw;
    const chase = speed === d.sp && dist < d.det;
    m.armL.rotation.x = chase ? -1.4 : -sw; m.armR.rotation.x = chase ? -1.4 : sw;
    if (Math.hypot(m.vx, m.vz) > 0.1) m.g.rotation.y = Math.atan2(m.vx, m.vz);
    m.g.position.set(m.x, m.y, m.z);
    m.atk -= dt;
    if (!explorer && dist < 0.9 * (MOBS[m.type].s > 1 ? 1.5 : 1) && Math.abs(player.y - m.y) < 1.6 && m.atk <= 0) { m.atk = 1.0; hurtPlayer(d.dmg); }
    if (m.flash > 0) { m.flash -= dt; const c = m.flash > 0 ? 0xff3030 : null; m.mats[0].color.set(c || d.body); m.mats[1].color.set(c || d.skin); }
  }
}
function rayMob(ox, oy, oz, dx, dy, dz, max) {
  let best = null, bt = max;
  for (const m of mobs) {
    const lo = [m.x - m.hw, m.y, m.z - m.hw], hi = [m.x + m.hw, m.y + m.h, m.z + m.hw], o = [ox, oy, oz], dd = [dx, dy, dz];
    let t0 = 0, t1 = bt, ok = true;
    for (let a = 0; a < 3 && ok; a++) {
      if (Math.abs(dd[a]) < 1e-8) { if (o[a] < lo[a] || o[a] > hi[a]) ok = false; }
      else { let a0 = (lo[a] - o[a]) / dd[a], a1 = (hi[a] - o[a]) / dd[a]; if (a0 > a1) { const t = a0; a0 = a1; a1 = t; } t0 = Math.max(t0, a0); t1 = Math.min(t1, a1); if (t0 > t1) ok = false; }
    }
    if (ok && t0 < bt) { bt = t0; best = m; }
  }
  return best ? { m: best, t: bt } : null;
}

// ---------------------------------------------------------------- interaction
function rollLoot(table) {
  const got = [];
  for (const [it, lo, hi, p] of LOOT[table] || LOOT.plain) {
    if (Math.random() > p) continue;
    const n = lo + Math.floor(Math.random() * (hi - lo + 1)); items[it] += n; got.push(n + ' ' + ITEM_LABEL[it]);
  }
  return got;
}
const DROP = { [B.GRASS]: B.DIRT, [B.STONE]: B.COBBLE, [B.LEAVES]: 0, [B.CHEST]: B.PLANKS, [B.CHEST_OPEN]: B.PLANKS, [B.PATH]: B.DIRT, [B.WHEAT]: 0, [B.TABLET]: 0, [B.CRYSTAL]: B.CRYSTAL, [B.IRON]: 0, [B.CACTUS]: 0, [B.AWNING]: 0, [B.CARPET]: 0, [B.SPAWNER]: 0, [B.ASH]: B.STONE, [B.SANDSTONE]: B.SAND };
function breakBlock(h) {
  const id = h.id;
  if (id === B.BEDROCK) return;
  const k = key(h.x, h.y, h.z);
  if (id === B.IRON) { items.iron++; }
  if (id === B.CRYSTAL) { items.shard++; }
  if (id === B.WHEAT && Math.random() < 0.3) items.bread++;
  const drop = id in DROP ? DROP[id] : id;
  if (drop && inv[drop] !== undefined) inv[drop]++;
  chests.delete(k); lore.delete(k);
  setBlock(h.x, h.y, h.z, B.AIR);
  drawHud();
}
function useOrPlace(h) {
  const k = key(h.x, h.y, h.z);
  if (h.id === B.CHEST) {
    const got = rollLoot(chests.get(k) || 'plain');
    setBlock(h.x, h.y, h.z, B.CHEST_OPEN); chests.delete(k);
    toast(got.length ? 'Chest: ' + got.join(', ') : 'The chest is empty.', 3600); drawHud(); return;
  }
  if (h.id === B.CHEST_OPEN) { toast('Already looted.', 1500); return; }
  if (h.id === B.TABLET) { const l = lore.get(k); if (l) toast('📜 ' + l.title + ' - ' + l.text, 9000); return; }
  if (h.id === B.FURNACE) { toast('Weapon power grows with every 2 iron ingots you carry (now ' + powerLevel() + ').', 4000); return; }
  const b = HOTBAR[sel];
  if (inv[b] <= 0) { toast('Out of that block - mine more.', 1500); return; }
  const x = h.px, y = h.py, z = h.pz;
  if (get(x, y, z) !== 0 && get(x, y, z) !== B.WATER && get(x, y, z) !== B.LAVA) return;
  if (SOLID[b]) {
    const hw = player.hw;
    if (x + 1 > player.x - hw && x < player.x + hw && z + 1 > player.z - hw && z < player.z + hw && y + 1 > player.y && y < player.y + player.h) return;
  }
  inv[b]--; setBlock(x, y, z, b); drawHud();
}
function interactTick(dt) {
  player.atkT -= dt; player.useT -= dt;
  if (!playing) return;
  const o = [player.x, player.y + 1.62, player.z], d = lookDir();
  if (mouseL && player.atkT <= 0) {
    const bh = raycast(o[0], o[1], o[2], d[0], d[1], d[2], 5.5);
    const mh = rayMob(o[0], o[1], o[2], d[0], d[1], d[2], Math.min(3.6, bh ? bh.t : 3.6));
    if (mh) {
      player.atkT = 0.4; const m = mh.m; m.hp -= powerLevel(); m.flash = 0.2;
      m.vx += d[0] * 7; m.vz += d[2] * 7; m.vy = 5; if (m.hp <= 0) killMob(m);
    } else if (bh) { player.atkT = 0.22; breakBlock(bh); }
  }
  if (mouseR && player.useT <= 0) {
    player.useT = 0.25;
    const bh = raycast(o[0], o[1], o[2], d[0], d[1], d[2], 5.5);
    if (bh) useOrPlace(bh);
  }
}

// ---------------------------------------------------------------- player update
function updatePlayer(dt) {
  const p = player;
  const inWater = get(Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z)) === B.WATER;
  const inLava = get(Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z)) === B.LAVA || get(Math.floor(p.x), Math.floor(p.y + 0.1), Math.floor(p.z)) === B.LAVA;
  let f = 0, s = 0;
  if (playing) {
    if (keys.KeyW) f += 1; if (keys.KeyS) f -= 1; if (keys.KeyD) s += 1; if (keys.KeyA) s -= 1;
  }
  const len = Math.hypot(f, s) || 1; f /= len; s /= len;
  let speed = (keys.ShiftLeft || keys.ShiftRight ? 6.6 : 4.4) * (explorer ? 2 : 1) * (inWater ? 0.55 : 1);
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  const tx = (fx * f + rx * s) * speed, tz = (fz * f + rz * s) * speed;
  const k = Math.min(1, dt * (p.onGround ? 14 : 4));
  p.vx += (tx - p.vx) * k; p.vz += (tz - p.vz) * k;
  p.vy -= (inWater ? 8 : 28) * dt;
  if (inWater) { p.vy = Math.max(p.vy, -3); if (playing && keys.Space) p.vy = Math.min(p.vy + 24 * dt, 3.2); }
  else if (playing && keys.Space && p.onGround) p.vy = 8.6;
  p.vy = Math.max(p.vy, -40);
  moveBody(p, dt);
  if (inLava) { p.vy = Math.max(p.vy, -1.5); hurtPlayer(4); }
  if (p.hurtT > 0) p.hurtT -= dt;
  if (p.hp < 20 && p.hurtT <= 0) p.hp = Math.min(20, p.hp + dt * 0.35);
  camera.position.set(p.x, p.y + 1.62, p.z);
  camera.rotation.y = p.yaw; camera.rotation.x = p.pitch;
}

// discovery
let discoverT = 0;
function checkDiscovery(dt) {
  discoverT -= dt; if (discoverT > 0) return; discoverT = 0.4;
  for (const s of sites) {
    if (s.found) continue;
    if (Math.hypot(s.x - player.x, s.z - player.z) < s.r) { s.found = true; banner(s.name); drawHud(); }
  }
}

// ---------------------------------------------------------------- input
function resize() { renderer.setSize(window.innerWidth, window.innerHeight, false); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize);
const overlay = $('overlay');
overlay.addEventListener('click', () => { if (canvas.requestPointerLock) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => { playing = document.pointerLockElement === canvas; overlay.style.display = playing ? 'none' : 'flex'; if (!playing) { mouseL = mouseR = false; } });
document.addEventListener('mousemove', e => {
  if (!playing) return;
  player.yaw -= e.movementX * 0.0022; player.pitch = clamp(player.pitch - e.movementY * 0.0022, -1.55, 1.55);
});
document.addEventListener('mousedown', e => { if (!playing) return; if (e.button === 0) mouseL = true; if (e.button === 2) mouseR = true; });
document.addEventListener('mouseup', e => { if (e.button === 0) mouseL = false; if (e.button === 2) mouseR = false; });
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('wheel', e => { if (!playing) return; sel = (sel + (e.deltaY > 0 ? 1 : -1) + HOTBAR.length) % HOTBAR.length; drawHud(); }, { passive: true });
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (!playing) return;
  if (e.code.startsWith('Digit')) { const n = +e.code.slice(5) - 1; if (n >= 0 && n < HOTBAR.length) { sel = n; drawHud(); } }
  if (e.code === 'KeyF' && items.bread > 0 && player.hp < 20) { items.bread--; player.hp = Math.min(20, player.hp + 5); drawHud(); }
  if (e.code === 'KeyQ' && items.potion > 0) { items.potion--; player.hp = 20; toast('Ranger Potion: fully healed.', 1800); drawHud(); }
  if (e.code === 'KeyC') { showCompass = !showCompass; drawCompass(); }
  if (e.code === 'KeyG') { explorer = !explorer; toast(explorer ? 'Explorer mode ON: 2× speed, mobs ignore you.' : 'Explorer mode OFF.', 2000); drawHud(); }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// ---------------------------------------------------------------- boot
let last = 0, hudT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  updatePlayer(dt); interactTick(dt); updateMobs(dt); updateSky(dt); checkDiscovery(dt);
  hudT -= dt; if (hudT <= 0) { hudT = 0.12; drawHud(); drawCompass(); }
  drawMinimap();
  renderer.render(scene, camera);
}
function boot() {
  const spawn = buildWorld();
  for (let cz = 0; cz < NCZ; cz++) for (let cx = 0; cx < NCX; cx++) rebuildChunk(cx, cz);
  buildMinimap();
  const sx = spawn.x + 4, sz = spawn.z + 4;
  spawnPoint = [sx + 0.5, surfaceY(sx, sz) + 1.01, sz + 0.5];
  Object.assign(player, { x: spawnPoint[0], y: spawnPoint[1], z: spawnPoint[2], yaw: Math.PI * 0.75 });
  const v0 = sites[0]; if (v0) { v0.found = true; }
  resize(); drawHud();
  $('loading').style.display = 'none';
  requestAnimationFrame(frame);
}
window.__g = {
  player, sites, mobs, items, world, biome, B,
  start() { playing = true; overlay.style.display = 'none'; },
  tp(x, z, yawv) { player.x = x + 0.5; player.z = z + 0.5; player.y = surfaceY(Math.floor(x), Math.floor(z)) + 1.2; player.vy = 0; if (yawv !== undefined) player.yaw = yawv; },
  setTime(t) { timeOfDay = t; },
  spawn(type, x, z) { return trySpawnMob(type, x, z); },
};
boot();
