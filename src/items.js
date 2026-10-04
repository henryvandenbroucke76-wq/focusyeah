'use strict';
/* Items: blocks are items 1..255, everything else starts at 256. */
const ITEMS = [];          // id -> def
const I = {};              // key -> id
const RARITY = { common: '#e8e4dc', uncommon: '#6fdc6f', rare: '#5aa8ff', epic: '#c77dff', legendary: '#ffb02e' };

function regItem(key, o) {
  const id = 256 + Object.keys(I).length;
  I[key] = id;
  ITEMS[id] = Object.assign({ id, key, name: key, stack: 64, kind: 'misc', rarity: 'common', desc: '' }, o);
  return id;
}
// ---- materials
regItem('stick', { name: 'Stick', paint: 'stick', c: ['#8a6438'] });
regItem('wheat', { name: 'Wheat', paint: 'wheat', c: ['#e2c04a'] });
regItem('coal', { name: 'Coal', paint: 'lump', c: ['#2a2a30', '#4a4a52'] });
regItem('iron', { name: 'Iron Ingot', paint: 'ingot', c: ['#c8c8d0', '#f0f0f4'] });
regItem('gold', { name: 'Gold Coin', paint: 'coin', c: ['#f0c838', '#fff08a'] });
regItem('shard', { name: 'Crystal Shard', paint: 'shard', c: ['#56d2f0', '#c8f8ff'], rarity: 'uncommon' });
regItem('silk', { name: 'Crawler Silk', paint: 'silk', c: ['#e8e8f0'] });
regItem('leather', { name: 'Boar Hide', paint: 'hide', c: ['#9a6a3a', '#7a4a24'] });
regItem('arrow', { name: 'Arrow', paint: 'arrow', c: ['#8a6438', '#c8c8d0'] });
regItem('ember', { name: 'Living Ember', paint: 'shard', c: ['#ff7a2a', '#ffe46a'], rarity: 'uncommon' });
regItem('journal', { name: 'Journal Page', paint: 'page', c: ['#e8dcb4'], stack: 16, desc: 'A torn page. Someone wrote in a hurry.' });
regItem('key', { name: 'Deepseal Key', paint: 'key', c: ['#6ef0ff', '#2a8aa0'], stack: 1, rarity: 'epic', desc: 'Opens the Seal of the Deep beneath the Drowned Halls.' });
regItem('compass', { name: 'Wayfinder Compass', paint: 'compass', c: ['#d8a828', '#fff4c8'], stack: 1, rarity: 'uncommon', kind: 'compass', desc: 'Right-click (or press M) to open the Wayfinder.' });
// ---- food
regItem('bread', { name: "Traveller's Bread", kind: 'food', food: 5, heal: 0, paint: 'bread', c: ['#c8883a', '#e8b060'], stack: 16 });
regItem('globerry', { name: 'Globerries', kind: 'food', food: 2, heal: 1, paint: 'berries', c: ['#4a6ae0', '#9ab0ff'], stack: 32 });
regItem('venison', { name: 'Roast Venison', kind: 'food', food: 7, heal: 2, paint: 'meat', c: ['#a8582e', '#e8e0d0'], stack: 16 });
regItem('ration', { name: 'Ranger Ration', kind: 'food', food: 10, heal: 8, paint: 'parcel', c: ['#c8a870', '#6a4a2a'], stack: 8, rarity: 'uncommon' });
regItem('potion', { name: 'Healing Draught', kind: 'food', food: 0, heal: 20, paint: 'potion', c: ['#e84a6a', '#ffd0dc'], stack: 8, rarity: 'uncommon', desc: 'Restores all health.' });
// ---- tools
const tool = (key, name, type, tier, mult, c, rarity, extra) => regItem(key, Object.assign({ name, kind: 'tool', toolType: type, tier, mult, stack: 1, paint: type, c, dmg: 2 + tier, aps: 1.2, reach: 4.5, rarity: rarity || 'common' }, extra || {}));
tool('wood_pick', 'Wooden Pickaxe', 'pick', 1, 2, ['#b08550', '#8a6438']);
tool('wood_axe', 'Wooden Axe', 'axe', 1, 2, ['#b08550', '#8a6438'], 'common', { dmg: 4, aps: 0.9 });
tool('wood_shovel', 'Wooden Shovel', 'shovel', 1, 2, ['#b08550', '#8a6438']);
tool('stone_pick', 'Stone Pickaxe', 'pick', 2, 4, ['#9a9aa0', '#8a6438']);
tool('stone_axe', 'Stone Axe', 'axe', 2, 4, ['#9a9aa0', '#8a6438'], 'common', { dmg: 5, aps: 0.9 });
tool('stone_shovel', 'Stone Shovel', 'shovel', 2, 4, ['#9a9aa0', '#8a6438']);
tool('crystal_pick', 'Crystal Pickaxe', 'pick', 3, 9, ['#56d2f0', '#4a4a60'], 'rare');
tool('crystal_axe', 'Crystal Axe', 'axe', 3, 9, ['#56d2f0', '#4a4a60'], 'rare', { dmg: 7, aps: 1.0 });
tool('crystal_shovel', 'Crystal Shovel', 'shovel', 3, 9, ['#56d2f0', '#4a4a60'], 'rare');
// ---- weapons
const weapon = (key, o) => regItem(key, Object.assign({ kind: 'weapon', stack: 1, reach: 3.6 }, o));
weapon('wood_sword', { name: 'Wooden Sword', dmg: 4, aps: 1.6, paint: 'sword', c: ['#b08550', '#8a6438'] });
weapon('stone_sword', { name: 'Stone Sword', dmg: 5, aps: 1.6, paint: 'sword', c: ['#9a9aa0', '#8a6438'] });
weapon('crystal_sword', { name: 'Crystal Longsword', dmg: 7, aps: 1.5, paint: 'sword', c: ['#56d2f0', '#4a4a60'], rarity: 'rare' });
weapon('gloomshiv', { name: 'Gloomshiv', dmg: 4, aps: 1.9, reach: 2.6, paint: 'dagger', c: ['#6a5a8a', '#2a2234'], rarity: 'epic', backstab: true, desc: 'Backstab: hits from behind deal double damage. 50% crit chance.' });
weapon('rune_maul', { name: 'Runebreaker Maul', dmg: 12, aps: 0.7, reach: 3.4, paint: 'maul', c: ['#7a7a84', '#6ef0ff'], rarity: 'epic', smash: true, desc: 'Charged swings shake the ground and knock back everything nearby.' });
weapon('colossus_edge', { name: 'Colossus Edge', dmg: 10, aps: 1.2, reach: 4, paint: 'greatsword', c: ['#9af0ff', '#d8a828'], rarity: 'legendary', wave: true, desc: 'Fully charged swings release a crystal wave.' });
regItem('ranger_bow', { name: "Ranger's Bow", kind: 'bow', stack: 1, power: 1, dmg: 6, paint: 'bow', c: ['#8a6438', '#e8e8f0'], rarity: 'uncommon', desc: 'Hold right-click to draw. Uses arrows.' });
regItem('prism_bow', { name: 'Prism Bow', kind: 'bow', stack: 1, power: 1.5, dmg: 10, paint: 'bow', c: ['#56d2f0', '#ffffff'], rarity: 'rare', desc: 'Hold right-click to draw. Uses arrows.' });
regItem('thunder_staff', { name: 'Thundercall Staff', kind: 'staff', stack: 1, dmg: 9, cd: 1.1, paint: 'staff', c: ['#6a4a2a', '#8ad8ff'], rarity: 'epic', desc: 'Right-click: chain lightning that arcs to 3 enemies.' });
// ---- armor
const armor = (key, name, slot, pts, set, c, rarity) => regItem(key, { name, kind: 'armor', slot, armor: pts, set, stack: 1, paint: ['helm', 'chestplate', 'greaves', 'boots'][slot], c, rarity });
armor('hide_helm', 'Hide Cap', 0, 1, 'hide', ['#9a6a3a', '#6a4424'], 'common');
armor('hide_chest', 'Hide Tunic', 1, 3, 'hide', ['#9a6a3a', '#6a4424'], 'common');
armor('hide_legs', 'Hide Leggings', 2, 2, 'hide', ['#9a6a3a', '#6a4424'], 'common');
armor('hide_boots', 'Hide Boots', 3, 1, 'hide', ['#9a6a3a', '#6a4424'], 'common');
armor('prism_helm', 'Prism Knight Helm', 0, 3, 'prism', ['#56d2f0', '#c8f8ff'], 'rare');
armor('prism_chest', 'Prism Knight Chestplate', 1, 7, 'prism', ['#56d2f0', '#c8f8ff'], 'rare');
armor('prism_legs', 'Prism Knight Greaves', 2, 5, 'prism', ['#56d2f0', '#c8f8ff'], 'rare');
armor('prism_boots', 'Prism Knight Boots', 3, 3, 'prism', ['#56d2f0', '#c8f8ff'], 'rare');
armor('warden_helm', 'Bastion Warden Helm', 0, 3, 'warden', ['#3c2f40', '#d8a828'], 'epic');
armor('warden_chest', 'Bastion Warden Chestplate', 1, 6, 'warden', ['#3c2f40', '#d8a828'], 'epic');
armor('warden_legs', 'Bastion Warden Greaves', 2, 4, 'warden', ['#3c2f40', '#d8a828'], 'epic');
armor('warden_boots', 'Bastion Warden Boots', 3, 2, 'warden', ['#3c2f40', '#d8a828'], 'epic');
// ---- relics
regItem('wolf_totem', { name: 'Wolfsblood Totem', kind: 'relic', stack: 1, relic: 'melee', paint: 'totem', c: ['#e8e0d0', '#a82020'], rarity: 'rare', desc: '+25% melee damage.' });
regItem('colossus_heart', { name: 'Heart of the Colossus', kind: 'relic', stack: 1, relic: 'heart', paint: 'heart', c: ['#6ef0ff', '#ffffff'], rarity: 'legendary', desc: '+10 max health and steady regeneration.' });
regItem('ember_charm', { name: 'Emberward Charm', kind: 'relic', stack: 1, relic: 'fire', paint: 'charm', c: ['#ff7a2a', '#ffe46a'], rarity: 'rare', desc: 'Immunity to fire and lava burns.' });

// resolve block drops of the form 'item:x'
for (const d of BLK) if (typeof d.drop === 'string') d.drop = I[d.drop.slice(5)];

function itemDef(id) { return id < 256 ? blockItemDef(id) : ITEMS[id]; }
const _blockDefs = [];
function blockItemDef(id) {
  if (!_blockDefs[id]) { const b = BLK[id]; _blockDefs[id] = { id, key: b.key, name: b.name, stack: 64, kind: 'block', rarity: 'common', desc: '' }; }
  return _blockDefs[id];
}
const SET_BONUS = { prism: 'Set bonus: +15% damage', warden: 'Set bonus: immune to knockback and fire', hide: '' };

// ---------------------------------------------------------------- recipes
const RECIPES = [
  { out: [B.PLANKS, 4], need: [[B.LOG, 1]] },
  { out: [B.PLANKS_DARK, 4], need: [[B.DARKLOG, 1]] },
  { out: [I.stick, 4], need: [[B.PLANKS, 2]] },
  { out: [B.TABLE, 1], need: [[B.PLANKS, 4]] },
  { out: [I.wood_pick, 1], need: [[B.PLANKS, 3], [I.stick, 2]] },
  { out: [I.wood_axe, 1], need: [[B.PLANKS, 3], [I.stick, 2]] },
  { out: [I.wood_shovel, 1], need: [[B.PLANKS, 1], [I.stick, 2]] },
  { out: [I.wood_sword, 1], need: [[B.PLANKS, 2], [I.stick, 1]] },
  { out: [B.TORCH, 4], need: [[I.stick, 1], [I.coal, 1]] },
  { out: [B.CHEST, 1], need: [[B.PLANKS, 8]], table: true },
  { out: [B.LADDER, 3], need: [[I.stick, 7]], table: true },
  { out: [B.FENCE, 3], need: [[B.PLANKS, 2], [I.stick, 2]], table: true },
  { out: [I.stone_pick, 1], need: [[B.COBBLE, 3], [I.stick, 2]], table: true },
  { out: [I.stone_axe, 1], need: [[B.COBBLE, 3], [I.stick, 2]], table: true },
  { out: [I.stone_shovel, 1], need: [[B.COBBLE, 1], [I.stick, 2]], table: true },
  { out: [I.stone_sword, 1], need: [[B.COBBLE, 2], [I.stick, 1]], table: true },
  { out: [B.POLISHED, 4], need: [[B.COBBLE, 4]], table: true },
  { out: [B.STONEBRICK, 4], need: [[B.POLISHED, 4]], table: true },
  { out: [B.GLASS, 2], need: [[B.SAND, 2], [I.coal, 1]], table: true },
  { out: [B.LAMP, 2], need: [[I.iron, 1], [I.shard, 1], [B.TORCH, 1]], table: true },
  { out: [B.FURNACE, 1], need: [[B.COBBLE, 8]], table: true },
  { out: [I.bread, 1], need: [[I.wheat, 3]] },
  { out: [I.ration, 1], need: [[I.bread, 1], [I.venison, 1], [I.globerry, 2]], table: true },
  { out: [I.arrow, 6], need: [[I.stick, 1], [B.COBBLE, 1]] },
  { out: [I.ranger_bow, 1], need: [[I.stick, 3], [I.silk, 3]], table: true },
  { out: [I.prism_bow, 1], need: [[I.shard, 4], [I.silk, 3], [I.gold, 2]], table: true },
  { out: [I.crystal_pick, 1], need: [[I.shard, 3], [I.iron, 1], [I.stick, 2]], table: true },
  { out: [I.crystal_axe, 1], need: [[I.shard, 3], [I.iron, 1], [I.stick, 2]], table: true },
  { out: [I.crystal_shovel, 1], need: [[I.shard, 1], [I.iron, 1], [I.stick, 2]], table: true },
  { out: [I.crystal_sword, 1], need: [[I.shard, 2], [I.iron, 2], [I.stick, 1]], table: true },
  { out: [I.hide_helm, 1], need: [[I.leather, 3]], table: true },
  { out: [I.hide_chest, 1], need: [[I.leather, 6]], table: true },
  { out: [I.hide_legs, 1], need: [[I.leather, 5]], table: true },
  { out: [I.hide_boots, 1], need: [[I.leather, 3]], table: true },
  { out: [I.prism_helm, 1], need: [[I.shard, 5], [I.iron, 2]], table: true },
  { out: [I.prism_chest, 1], need: [[I.shard, 8], [I.iron, 4]], table: true },
  { out: [I.prism_legs, 1], need: [[I.shard, 7], [I.iron, 3]], table: true },
  { out: [I.prism_boots, 1], need: [[I.shard, 4], [I.iron, 2]], table: true },
];

// ---------------------------------------------------------------- loot tables  [item, min, max, chance]
const LOOT = {
  house: [[I.bread, 1, 3, 0.8], [I.gold, 1, 3, 0.5], [I.coal, 1, 3, 0.3], [B.TORCH, 2, 4, 0.4], [I.stick, 2, 5, 0.3]],
  farm: [[I.wheat, 3, 8, 1], [I.bread, 1, 3, 0.8], [I.globerry, 2, 4, 0.5], [I.gold, 1, 2, 0.4]],
  fish: [[I.bread, 1, 2, 0.7], [I.silk, 1, 3, 0.6], [I.gold, 1, 3, 0.5], [I.potion, 1, 1, 0.25]],
  library: [[I.journal, 1, 2, 1], [I.gold, 2, 5, 0.8], [I.potion, 1, 1, 0.4], [I.shard, 1, 2, 0.4]],
  market: [[I.bread, 2, 4, 1], [I.globerry, 2, 5, 0.7], [I.gold, 1, 4, 0.7], [I.ration, 1, 1, 0.3]],
  desert: [[I.gold, 2, 6, 1], [I.potion, 1, 1, 0.5], [B.POT, 1, 2, 0.5], [I.shard, 1, 2, 0.3], [I.silk, 1, 3, 0.4]],
  mine: [[I.iron, 2, 5, 1], [I.coal, 3, 8, 1], [I.shard, 1, 3, 0.6], [B.TORCH, 4, 8, 0.6], [I.gold, 1, 3, 0.4]],
  camp: [[I.bread, 1, 2, 0.8], [I.arrow, 4, 10, 0.6], [I.stick, 3, 6, 0.6], [I.gold, 1, 2, 0.4], [I.leather, 1, 3, 0.3]],
  ruins: [[I.journal, 1, 1, 1], [I.gold, 3, 7, 1], [I.shard, 1, 3, 0.6], [I.potion, 1, 1, 0.5]],
  royal: [[I.gold, 6, 12, 1], [I.shard, 2, 5, 1], [I.potion, 1, 2, 0.8], [I.wolf_totem, 1, 1, 1]],
  fort: [[I.iron, 3, 7, 1], [I.gold, 4, 9, 1], [I.ember, 1, 3, 0.8], [I.potion, 1, 2, 0.6], [I.arrow, 6, 12, 0.6]],
  armory: [[I.warden_helm, 1, 1, 1], [I.warden_chest, 1, 1, 1], [I.warden_legs, 1, 1, 1], [I.warden_boots, 1, 1, 1], [I.ember_charm, 1, 1, 1]],
  tower: [[I.ranger_bow, 1, 1, 1], [I.arrow, 12, 20, 1], [I.journal, 1, 1, 1], [I.ration, 1, 2, 0.8]],
  witch: [[I.gloomshiv, 1, 1, 1], [I.potion, 2, 3, 1], [I.globerry, 3, 6, 0.8]],
  supply: [[I.wood_pick, 1, 1, 1], [I.wood_axe, 1, 1, 1], [I.bread, 3, 3, 1], [B.TORCH, 8, 8, 1], [I.stick, 4, 4, 1]],
  coffer: [[I.gold, 4, 8, 1], [I.potion, 1, 2, 0.8], [I.arrow, 8, 16, 0.6], [I.shard, 2, 4, 0.7]],
  vault: [[I.crystal_pick, 1, 1, 1], [I.thunder_staff, 1, 1, 1], [I.gold, 8, 14, 1], [I.shard, 4, 8, 1]],
  warden: [[I.key, 1, 1, 1], [I.rune_maul, 1, 1, 1], [I.potion, 2, 2, 1]],
  hoard: [[I.colossus_edge, 1, 1, 1], [I.colossus_heart, 1, 1, 1], [I.gold, 20, 30, 1], [B.ANCIENT_GOLD, 2, 4, 1]],
};
const CHEST_NAMES = {
  house: 'Cottage Chest', farm: 'Granary Chest', fish: "Fisher's Trunk", library: 'Archive Chest', market: 'Merchant Crate',
  desert: 'Oasis Coffer', mine: 'Miner\'s Locker', camp: 'Camp Supplies', ruins: 'Weathered Chest', royal: 'Sovereign\'s Offering',
  fort: 'Bastion Strongbox', armory: 'Armory Locker', tower: "Watchkeeper's Chest", witch: "Bog Hag's Trunk", supply: 'Old Supply Chest',
  coffer: 'Drowned Coffer', vault: 'Hidden Vault', warden: "Mirewarden's Hoard", hoard: 'Hoard of the Colossus',
};
function rollLoot(table, r) {
  r = r || Math.random;
  const out = [];
  for (const [it, lo, hi, p] of LOOT[table] || LOOT.house) if (r() <= p) out.push({ id: it, n: lo + Math.floor(r() * (hi - lo + 1)) });
  return out;
}

// ---------------------------------------------------------------- icons
const ICON_CACHE = {};
function iconCanvas(id) {
  if (ICON_CACHE[id]) return ICON_CACHE[id];
  const cv = document.createElement('canvas');
  if (id < 256) { cv.width = cv.height = 32; drawBlockIcon(cv, id); }
  else { cv.width = cv.height = 16; drawItemIcon(cv, ITEMS[id]); }
  ICON_CACHE[id] = cv;
  return cv;
}
function iconURL(id) {
  const c = iconCanvas(id);
  if (!c._url) c._url = c.toDataURL();
  return c._url;
}
function tileXY(name) { const i = Atlas.tiles[name]; return [(i % ATLAS_N) * TILE, Math.floor(i / ATLAS_N) * TILE]; }
function drawBlockIcon(cv, id) {
  const ctx = cv.getContext('2d'), b = BLK[id];
  ctx.imageSmoothingEnabled = false;
  if (['cross', 'flat', 'ladder'].includes(b.render) || b.id === B.BANNER) {
    const [sx, sy] = tileXY(b.tex.side); ctx.drawImage(Atlas.canvas, sx, sy, 16, 16, 0, 0, 32, 32); return;
  }
  const face = (name, m, shade) => {
    const [sx, sy] = tileXY(name);
    ctx.save(); ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.drawImage(Atlas.canvas, sx, sy, 16, 16, 0, 0, 16, 16);
    ctx.fillStyle = 'rgba(0,0,0,' + shade + ')'; ctx.fillRect(0, 0, 16, 16); ctx.restore();
  };
  face(b.tex.top, [1, 0.5, -1, 0.5, 16, 0], 0);
  face(b.tex.front || b.tex.side, [1, 0.5, 0, 1, 0, 8], 0.25);
  face(b.tex.side, [1, -0.5, 0, 1, 16, 16], 0.42);
}
function drawItemIcon(cv, it) {
  const ctx = cv.getContext('2d'), img = ctx.createImageData(16, 16), px = [];
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const c0 = hex(it.c[0]), c1 = hex(it.c[1] || it.c[0]);
  const lit = c => c.map(v => Math.min(255, v * 1.3 + 30)), dk = c => c.map(v => v * 0.65);
  const P = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 16 && y < 16) px[x + y * 16] = c; };
  const L = (x0, y0, x1, y1, c, w) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; P(x, y, c); if (w) P(x + 1, y, c); } };
  const C = (cx, cy, r, c, ring) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - cx, y - cy); if (ring ? Math.abs(d - r) < 0.6 : d <= r) P(x, y, c); } };
  const Rr = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P(x, y, c); };
  const handle = (x0, y0, x1, y1) => L(x0, y0, x1, y1, hex('#7a5430'));
  switch (it.paint) {
    case 'stick': L(4, 12, 12, 4, c0); L(5, 12, 12, 5, dk(c0)); break;
    case 'wheat': for (let k = 0; k < 4; k++) { L(5 + k, 14, 7 + k * 2, 3, k % 2 ? c0 : dk(c0)); P(7 + k * 2, 3, lit(c0)); } L(4, 10, 11, 10, hex('#8a2a1a')); break;
    case 'lump': C(8, 8, 4.5, c0); C(7, 7, 2, c1); break;
    case 'ingot': for (let y = 6; y <= 11; y++) for (let x = 3 + (11 - y) / 2; x <= 12 - (11 - y) / 2; x++) P(x, y, y === 6 ? lit(c0) : y > 9 ? dk(c0) : c0); break;
    case 'coin': C(8, 8, 5, dk(c0)); C(8, 8, 4, c0); C(8, 8, 2, c1, true); break;
    case 'shard': for (let y = 2; y < 15; y++) { const w = y < 8 ? (y - 2) * 0.6 : (14 - y) * 0.5; for (let x = 8 - w; x <= 8 + w; x++) P(x, y, x < 8 ? c1 : c0); } break;
    case 'silk': C(8, 8, 5, c0, true); C(8, 8, 3, c0, true); C(8, 8, 1, c0); break;
    case 'hide': Rr(3, 3, 12, 12, c0); for (let i = 3; i <= 12; i += 3) { P(3, i, [0, 0, 0, 0]); P(12, i + 1, [0, 0, 0, 0]); } Rr(5, 5, 10, 10, c1); break;
    case 'arrow': L(3, 13, 12, 4, c0); L(10, 3, 13, 3, c1); L(13, 3, 13, 6, c1); L(3, 11, 3, 13, [240, 240, 240]); L(3, 13, 5, 13, [240, 240, 240]); break;
    case 'page': Rr(4, 2, 11, 13, c0); for (let y = 4; y < 12; y += 2) L(5, y, 10, y, [120, 100, 70]); break;
    case 'key': C(5, 5, 3, c0, true); C(5, 5, 3.8, dk(c1), true); L(7, 7, 13, 13, c0); L(11, 13, 13, 11, c0); L(9, 11, 11, 9, c0); break;
    case 'compass': C(8, 8, 6, dk(c0)); C(8, 8, 5, c0); C(8, 8, 4, c1); L(8, 8, 11, 5, [210, 40, 40]); L(8, 8, 5, 11, [80, 80, 90]); P(8, 8, [30, 30, 30]); break;
    case 'bread': for (let y = 5; y <= 12; y++) for (let x = 2; x <= 13; x++) if (((x - 7.5) / 6) ** 2 + ((y - 9) / 3.5) ** 2 <= 1) P(x, y, y < 8 ? c1 : c0); L(5, 7, 6, 8, dk(c0)); L(8, 6, 9, 7, dk(c0)); L(11, 7, 12, 8, dk(c0)); break;
    case 'berries': for (const [x, y] of [[6, 7], [10, 8], [8, 11], [5, 11], [11, 12]]) { C(x, y, 2, c0); P(x - 1, y - 1, c1); } L(8, 2, 8, 6, hex('#3e7a2a')); break;
    case 'meat': C(9, 7, 4.5, c0); C(8, 6, 2, lit(c0)); L(5, 10, 2, 13, c1, true); C(2, 13, 1, c1); break;
    case 'parcel': Rr(3, 5, 12, 12, c0); L(3, 8, 12, 8, c1); L(7, 5, 7, 12, c1); Rr(6, 3, 8, 5, c1); break;
    case 'potion': C(8, 10, 4.5, [200, 220, 235]); C(8, 10, 3.5, c0); P(7, 9, c1); Rr(7, 3, 9, 6, [200, 220, 235]); Rr(7, 2, 9, 3, hex('#7a5430')); break;
    case 'sword': L(5, 10, 13, 2, c0, true); L(5, 9, 12, 2, lit(c0)); L(3, 8, 7, 12, hex('#d8a828')); handle(4, 11, 2, 13); P(1, 14, hex('#d8a828')); break;
    case 'dagger': L(6, 9, 12, 3, c0, true); L(6, 8, 11, 3, lit(c0)); L(4, 8, 7, 11, c1); handle(5, 10, 3, 12); P(2, 13, hex('#a83ae0')); break;
    case 'greatsword': L(4, 10, 14, 0, c0, true); L(5, 10, 15, 0, c0); L(4, 9, 13, 0, lit(c0)); L(2, 8, 7, 13, c1, true); handle(3, 11, 1, 13); P(0, 14, c1); break;
    case 'maul': handle(3, 13, 10, 6); Rr(8, 1, 14, 7, c0); Rr(8, 1, 14, 2, lit(c0)); P(11, 4, c1); P(10, 5, c1); P(12, 5, c1); break;
    case 'staff': handle(3, 13, 11, 5); C(12, 4, 2.5, c1); P(11, 3, [255, 255, 255]); P(14, 1, c1); P(15, 5, c1); break;
    case 'bow': for (let t = 0; t <= 1; t += 0.05) { const x = 3 + 10 * t - 3 * Math.sin(t * Math.PI), y = 13 - 10 * t - 3 * Math.sin(t * Math.PI); P(x, y, c0); } L(4, 12, 12, 4, c1); break;
    case 'pick': handle(3, 13, 11, 5); L(5, 3, 9, 2, c0, true); L(9, 2, 13, 6, c0, true); L(13, 6, 14, 10, c0); L(5, 3, 4, 5, dk(c0)); break;
    case 'axe': handle(4, 13, 11, 4); Rr(9, 2, 12, 7, c0); L(13, 2, 13, 7, lit(c0)); P(8, 3, c0); P(8, 6, c0); break;
    case 'shovel': handle(3, 13, 9, 7); for (let y = 2; y <= 9; y++) for (let x = 8; x <= 14; x++) if (Math.abs(x - 11) + Math.abs(y - 5) <= 3.5) P(x, y, (x + y) % 5 ? c0 : lit(c0)); break;
    case 'helm': Rr(3, 4, 12, 10, c0); Rr(3, 4, 12, 5, lit(c0)); Rr(5, 8, 10, 10, [0, 0, 0, 0]); Rr(5, 8, 6, 9, c1); Rr(9, 8, 10, 9, c1); break;
    case 'chestplate': Rr(3, 3, 12, 13, c0); Rr(6, 3, 9, 5, [0, 0, 0, 0]); Rr(3, 8, 3, 13, [0, 0, 0, 0]); Rr(12, 8, 12, 13, [0, 0, 0, 0]); L(7, 7, 8, 11, c1); break;
    case 'greaves': Rr(4, 3, 11, 5, c0); Rr(4, 6, 7, 13, c0); Rr(8, 6, 11, 13, c0); L(4, 3, 11, 3, c1); break;
    case 'boots': Rr(3, 7, 6, 12, c0); Rr(9, 7, 12, 12, c0); Rr(1, 11, 6, 13, dk(c0)); Rr(9, 11, 14, 13, dk(c0)); L(3, 7, 6, 7, c1); L(9, 7, 12, 7, c1); break;
    case 'totem': for (let y = 2; y < 14; y++) { const x = 6 + Math.sin(y / 4) * 3; P(x, y, c0); P(x + 1, y, c0); } L(4, 3, 12, 3, c1); C(8, 3, 1.5, c1); break;
    case 'heart': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const X = (x - 7.5) / 6, Y = (y - 7) / 6; if ((X * X + Y * Y - 0.6) ** 3 - X * X * (-Y) ** 3 * 1.2 < 0) P(x, y, (x + y) % 4 ? c0 : c1); } break;
    case 'charm': C(8, 9, 4.5, c0); C(8, 9, 2.5, c1); L(8, 1, 8, 4, [200, 200, 200]); break;
    default: Rr(4, 4, 11, 11, c0);
  }
  // auto outline
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = px[x + y * 16];
    const o = (x + y * 16) * 4;
    if (c && c.length === 3) { img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; continue; }
    let edge = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = px[(x + dx) + (y + dy) * 16]; if (x + dx >= 0 && x + dx < 16 && y + dy >= 0 && y + dy < 16 && n && n.length === 3) edge = true; }
    if (edge) { img.data[o] = 24; img.data[o + 1] = 18; img.data[o + 2] = 28; img.data[o + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
}
