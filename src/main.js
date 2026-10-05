'use strict';
/* Game core: player, input, combat, survival, saving, main loop. */
const SAVE_KEY = 'blockhollow_save_v2', SET_KEY = 'blockhollow_settings';
const Settings = Object.assign({ sens: 1, fov: 72, view: 1, hunger: true, cine: true, fps: false, shaders: true, shadows: true }, (() => { try { return JSON.parse(localStorage.getItem(SET_KEY)) || {}; } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(Settings)); } catch (e) { } }

const Game = { state: 'title', ui: null, sel: 0, follow: null, cine: null, peaceful: false, day: 0, time: 0.32, seedName: '', zone: -1, zoneT: 0, halls: null, mods: new Map(), spawn: [128, 40, 128], save: null };
const Stats = { kills: 0, deaths: 0 };
const Player = { x: 128, y: 40, z: 128, vx: 0, vy: 0, vz: 0, hw: 0.3, h: 1.8, yaw: 0, pitch: 0, hp: 20, food: 20, onGround: false, alive: true, inv: 0, burn: 0, foodT: 0, regenT: 0, starveT: 0, fallV: 0, sneak: false };
const Inv = { slots: new Array(36).fill(null), armor: [null, null, null, null], relics: [null, null] };

// ---------------------------------------------------------------- inventory helpers
function addTo(arr, id, n, from, to) {
  const max = itemDef(id).stack;
  for (let i = from; i < to && n > 0; i++) { const s = arr[i]; if (s && s.id === id && s.n < max) { const k = Math.min(n, max - s.n); s.n += k; n -= k; } }
  for (let i = from; i < to && n > 0; i++) if (!arr[i]) { const k = Math.min(n, max); arr[i] = { id, n: k }; n -= k; }
  return n;
}
function giveItem(id, n) {
  const left = addTo(Inv.slots, id, n, 0, 36);
  if (left < n) { lastHudKey = ''; pickupToast(id, n - left); }
  if (Game.ui === 'inv') renderInventory();
  return left;
}
let pickT = 0, pickAcc = {};
function pickupToast(id, n) { pickAcc[id] = (pickAcc[id] || 0) + n; clearTimeout(pickT); pickT = setTimeout(() => { toast('+ ' + Object.entries(pickAcc).map(([i, k]) => k + ' ' + itemDef(+i).name).join(', '), 2200); pickAcc = {}; }, 120); }
function countItem(id) { let n = 0; for (const s of Inv.slots) if (s && s.id === id) n += s.n; return n; }
function takeItem(id, n) { for (let i = 35; i >= 0 && n > 0; i--) { const s = Inv.slots[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) Inv.slots[i] = null; } } lastHudKey = ''; return n === 0; }
function heldItem() { return Inv.slots[Game.sel]; }
function armorPoints() { return Inv.armor.reduce((a, s) => a + (s ? itemDef(s.id).armor : 0), 0); }
function armorReduction() { return Math.min(0.65, armorPoints() * 0.025); }
function fullSet() { const sets = Inv.armor.map(s => s ? itemDef(s.id).set : null); return sets[0] && sets.every(x => x === sets[0]) ? sets[0] : null; }
function hasRelic(k) { return Inv.relics.some(s => s && itemDef(s.id).relic === k); }
function maxHealth() { return 20 + (hasRelic('heart') ? 10 : 0); }
function clampHealth() { Player.hp = Math.min(Player.hp, maxHealth()); }
function nearTable() { const px = Math.floor(Player.x), py = Math.floor(Player.y), pz = Math.floor(Player.z); for (let y = py - 2; y <= py + 3; y++) for (let z = pz - 4; z <= pz + 4; z++) for (let x = px - 4; x <= px + 4; x++) if (getB(x, y, z) === B.TABLE) return true; return false; }
function canCraft(r, near) { if (r.table && !near) return false; return r.need.every(([id, n]) => countItem(id) >= n); }
function craft(r) { for (const [id, n] of r.need) takeItem(id, n); const left = giveItem(r.out[0], r.out[1]); if (left) dropItem(r.out[0], left, Player.x, Player.y + 1, Player.z); }

// ---------------------------------------------------------------- world edits
function blockChanged(x, y, z) {
  computeLight(Math.max(0, x - 15), Math.min(W - 1, x + 15), Math.max(0, z - 15), Math.min(D - 1, z + 15));
  const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
  rebuildChunk(cx, cz);
  if (x % CS === 0) rebuildChunk(cx - 1, cz); if (x % CS === CS - 1) rebuildChunk(cx + 1, cz);
  if (z % CS === 0) rebuildChunk(cx, cz - 1); if (z % CS === CS - 1) rebuildChunk(cx, cz + 1);
  markDirtyAround(x - 15, x + 15, z - 15, z + 15);
  dirtyChunks.delete(cx + cz * NCX);
}
function setBlockLogged(x, y, z, id, meta) {
  if (!inWorld(x, y, z)) return;
  setB(x, y, z, id, meta || 0);
  Game.mods.set(IDX(x, y, z), [id, meta || 0]);
  blockChanged(x, y, z);
}

// ---------------------------------------------------------------- world creation / loading
function hashSeed(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) || 1; }
function setLoading(p, step) { $('lprog').style.width = Math.round(p * 100) + '%'; $('lstep').textContent = step; }
const nextFrame = () => new Promise(r => setTimeout(r, 16));
async function createWorld(seedName, save) {
  Game.state = 'loading';
  showOnly('loading');
  setLoading(0, 'Clearing the old world');
  await nextFrame();
  // reset everything
  for (const m of Mobs.slice()) removeMob(m);
  for (const d of Drops) scene.remove(d.mesh); Drops.length = 0;
  for (const p of Projectiles) scene.remove(p.mesh); Projectiles.length = 0;
  for (const w of windmillMeshes) scene.remove(w.g); windmillMeshes.length = 0;
  for (let k = 0; k < chunkMeshes.length; k++) if (chunkMeshes[k]) { for (const m of chunkMeshes[k]) if (m) { scene.remove(m); m.geometry.dispose(); } chunkMeshes[k] = null; }
  wb.fill(0); wm.fill(0); wsky.fill(0); wbl.fill(0);
  Sites.length = 0; Chests.clear(); Lore.clear(); Emitters.length = 0; SpawnPoints.length = 0; BossRooms.length = 0; Windmills.length = 0; Portals.length = 0;
  ActiveBoss = null; Game.mods = new Map(); Game.follow = null; Game.zone = -1;
  Game.seedName = seedName; SEED = hashSeed(seedName); rng = makeRng(SEED);
  setLoading(0.05, 'Raising mountains and carving rivers'); await nextFrame();
  genTerrain();
  setLoading(0.2, 'Growing ancient forests'); await nextFrame();
  genPlants();
  setLoading(0.3, 'Building villages, ruins and dungeons'); await nextFrame();
  const S = buildStructures();
  Game.halls = S.halls || null;
  const spawnSite = S.wheatmere || Sites[0];
  Game.spawn = spawnSite && spawnSite.spawn ? spawnSite.spawn.slice() : [128.5, surfaceY(128, 128) + 1, 128.5];
  // fresh player
  Object.assign(Player, { x: Game.spawn[0], y: Game.spawn[1], z: Game.spawn[2], vx: 0, vy: 0, vz: 0, yaw: Math.PI, pitch: 0, hp: 20, food: 20, alive: true, burn: 0 });
  Inv.slots.fill(null); Inv.armor.fill(null); Inv.relics.fill(null);
  Game.time = 0.3; Game.day = 0; Game.sel = 0; Stats.kills = 0; Stats.deaths = 0;
  if (save) applySave(save);
  else {
    giveItem(I.compass, 1); giveItem(I.wood_sword, 1); giveItem(I.wood_pick, 1); giveItem(I.wood_axe, 1); giveItem(I.bread, 4); giveItem(B.TORCH, 8);
    if (Sites[0]) Sites[0].found = true;
  }
  pickAcc = {};
  setLoading(0.42, 'Letting the light in'); await nextFrame();
  computeLight();
  const total = NCX * NCZ;
  // mesh closest chunks first
  const order = []; for (let cz = 0; cz < NCZ; cz++) for (let cx = 0; cx < NCX; cx++) order.push([cx, cz]);
  const pcx = Player.x / CS, pcz = Player.z / CS; order.sort((a, b) => Math.hypot(a[0] - pcx, a[1] - pcz) - Math.hypot(b[0] - pcx, b[1] - pcz));
  for (let i = 0; i < total; i++) {
    rebuildChunk(order[i][0], order[i][1]);
    if (i % 6 === 5) { setLoading(0.45 + 0.55 * i / total, 'Meshing the world (' + i + '/' + total + ')'); await nextFrame(); }
  }
  buildWindmills();
  if (save && BossRooms.find(r => r.type === 'colossus' && r.done) && Game.halls) Portals.push({ x: Game.halls.portal[0], y: Game.halls.portal[1] + 1, z: Game.halls.portal[2], to: Game.halls.exit });
  Game.state = 'ready';
  lastHudKey = '';
  showOnly('clickToBegin'); $('hud').classList.remove('hidden');
  Game.save = saveGame;
  saveGame();
}
function showOnly(id) {
  for (const s of ['title', 'loading', 'clickToBegin', 'pause', 'settings', 'controls', 'death']) $(s).classList.toggle('hidden', s !== id);
}

// ---------------------------------------------------------------- saving
function saveGame() {
  if (Game.state !== 'play' && Game.state !== 'ready') return;
  const mods = []; for (const [i, v] of Game.mods) mods.push(i, v[0], v[1]);
  const chests = []; for (const [k, c] of Chests) if (c.items || c.made) chests.push([k, c.table, c.items, !!c.made]);
  const data = {
    seed: Game.seedName, mods, chests, time: Game.time, day: Game.day, stats: Stats,
    player: { x: Player.x, y: Player.y, z: Player.z, yaw: Player.yaw, pitch: Player.pitch, hp: Player.hp, food: Player.food },
    spawn: Game.spawn, inv: Inv, sel: Game.sel, found: Sites.filter(s => s.found).map(s => s.name), follow: Game.follow ? Game.follow.name : null,
    bosses: BossRooms.map(r => r.done),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { console.warn('save failed', e); }
}
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }
function applySave(s) {
  for (let i = 0; i < s.mods.length; i += 3) { const j = s.mods[i]; wb[j] = s.mods[i + 1]; wm[j] = s.mods[i + 2]; Game.mods.set(j, [s.mods[i + 1], s.mods[i + 2]]); }
  for (const [k, table, items, made] of s.chests) Chests.set(k, { table, items, made });
  Object.assign(Player, s.player); Game.spawn = s.spawn; Game.time = s.time; Game.day = s.day; Object.assign(Stats, s.stats || {});
  Inv.slots = s.inv.slots; Inv.armor = s.inv.armor; Inv.relics = s.inv.relics; Game.sel = s.sel || 0;
  for (const s2 of Sites) s2.found = s.found.includes(s2.name);
  Game.follow = Sites.find(x => x.name === s.follow) || null;
  (s.bosses || []).forEach((d, i) => { if (BossRooms[i]) BossRooms[i].done = d; });
}

// ---------------------------------------------------------------- pointer lock & menus
function lockPointer() {
  if (Game.state !== 'play') return;
  try { const p = canvasEl.requestPointerLock(); if (p && p.catch) p.catch(() => showOnly('clickToBegin')); } catch (e) { }
  setTimeout(() => { if (Game.state === 'play' && !Game.ui && document.pointerLockElement !== canvasEl) { $('clickToBegin').classList.remove('hidden'); } }, 400);
}
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvasEl;
  if (locked) { $('clickToBegin').classList.add('hidden'); $('pause').classList.add('hidden'); return; }
  Input.mouseL = Input.mouseR = false;
  if (Game.state === 'play' && !Game.ui && Player.alive) openPause();
});
$('clickToBegin').addEventListener('click', () => { if (Game.state === 'ready') Game.state = 'play'; $('clickToBegin').classList.add('hidden'); lockPointer(); });
function openPause() { Game.ui = 'pause'; $('pause').classList.remove('hidden'); }
function closePause() { $('pause').classList.add('hidden'); Game.ui = null; lockPointer(); }
let settingsReturn = 'title';
document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
  const a = b.dataset.act;
  if (a === 'resume') closePause();
  if (a === 'settings') { settingsReturn = Game.state === 'title' ? 'title' : 'pause'; openSettings(); }
  if (a === 'controls') { settingsReturn = Game.state === 'title' ? 'title' : 'pause'; $('controls').classList.remove('hidden'); }
  if (a === 'closeSettings') { $('settings').classList.add('hidden'); saveSettings(); applySettings(); }
  if (a === 'closeControls') $('controls').classList.add('hidden');
  if (a === 'savequit') quitToTitle();
  if (a === 'continue') { const s = loadSave(); if (s) createWorld(s.seed, s); }
  if (a === 'new') { $('titleMenu').classList.add('hidden'); $('newMenu').classList.remove('hidden'); $('overwriteWarn').classList.toggle('hidden', !loadSave()); $('seedInput').focus(); }
  if (a === 'back') { $('newMenu').classList.add('hidden'); $('titleMenu').classList.remove('hidden'); }
  if (a === 'create') { const name = $('seedInput').value.trim() || 'Blockhollow'; try { localStorage.removeItem(SAVE_KEY); } catch (e) { } $('newMenu').classList.add('hidden'); $('titleMenu').classList.remove('hidden'); createWorld(name, null); }
  if (a === 'quit') { toastTitle('Thanks for playing! You can close this tab.'); }
}));
function toastTitle(m) { const b = $('continueBtn'); const old = b.textContent; b.textContent = m; setTimeout(() => { b.textContent = old; }, 2500); }
function quitToTitle() {
  saveGame(); Game.state = 'title'; Game.ui = null; endCinematic();
  document.exitPointerLock && document.exitPointerLock();
  $('hud').classList.add('hidden'); showOnly('title'); refreshTitle();
}
function refreshTitle() { $('continueBtn').classList.toggle('disabled', !loadSave()); }
function openSettings() {
  $('setSens').value = Settings.sens; $('setFov').value = Settings.fov; $('setView').value = Settings.view;
  $('setHunger').checked = Settings.hunger; $('setShaders').checked = Settings.shaders; $('setShadows').checked = Settings.shadows; $('setCine').checked = Settings.cine; $('setFps').checked = Settings.fps;
  $('settings').classList.remove('hidden');
}
for (const [id, k, num] of [['setSens', 'sens', 1], ['setFov', 'fov', 1], ['setView', 'view', 1], ['setHunger', 'hunger', 0], ['setCine', 'cine', 0], ['setFps', 'fps', 0], ['setShaders', 'shaders', 0], ['setShadows', 'shadows', 0]]) {
  $(id).addEventListener('input', e => { Settings[k] = num ? +e.target.value : e.target.checked; applySettings(); });
}
function applySettings() { camera.fov = Settings.fov; camera.updateProjectionMatrix(); $('fps').style.display = Settings.fps ? '' : 'none'; lastHudKey = ''; }
$('respawnBtn').onclick = () => respawn();
$('deathQuit').onclick = () => { respawn(true); quitToTitle(); };

// ---------------------------------------------------------------- input
const Input = { keys: {}, mouseL: false, mouseR: false };
document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  Input.keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'Tab') e.preventDefault();
  if (Game.state !== 'play') return;
  if (Game.cine && (e.code === 'Space' || e.code === 'Escape')) { endCinematic(); return; }
  if (e.code === 'KeyE') { if (Game.ui === 'inv') closeInventory(); else if (!Game.ui) openInventory(); return; }
  if (e.code === 'KeyM') { if (Game.ui === 'wf') closeWayfinder(); else if (!Game.ui) openWayfinder(); return; }
  if (e.code === 'Escape') { if (Game.ui === 'inv') closeInventory(); else if (Game.ui === 'wf') closeWayfinder(); else if (Game.ui === 'lore') closeLore(); else if (Game.ui === 'pause') closePause(); return; }
  if (Game.ui) return;
  if (e.code.startsWith('Digit')) { const n = +e.code.slice(5) - 1; if (n >= 0 && n < 9) { Game.sel = n; showHeldName(); lastHudKey = ''; } }
  if (e.code === 'KeyQ') { const s = heldItem(); if (s) { const d = lookDir(); dropItem(s.id, 1, Player.x + d[0], Player.y + 1.4, Player.z + d[2]); Drops[Drops.length - 1].vx = d[0] * 6; Drops[Drops.length - 1].vz = d[2] * 6; Drops[Drops.length - 1].t = -0.5; s.n--; if (!s.n) Inv.slots[Game.sel] = null; lastHudKey = ''; } }
  if (e.code === 'F3') Settings.fps = !Settings.fps, applySettings();
});
document.addEventListener('keyup', e => { Input.keys[e.code] = false; });
document.addEventListener('mousemove', e => {
  if (Game.state !== 'play' || Game.ui || document.pointerLockElement !== canvasEl || Game.cine) return;
  const s = 0.0022 * Settings.sens;
  Player.yaw -= e.movementX * s; Player.pitch = clamp(Player.pitch - e.movementY * s, -1.55, 1.55);
});
canvasEl.addEventListener('mousedown', e => {
  if (Game.state === 'ready') return;
  if (Game.cine) { endCinematic(); return; }
  if (Game.state !== 'play' || Game.ui) return;
  if (document.pointerLockElement !== canvasEl) { lockPointer(); return; }
  if (e.button === 0) { Input.mouseL = true; attack(); }
  if (e.button === 2) { Input.mouseR = true; useStart(); }
});
document.addEventListener('mouseup', e => { if (e.button === 0) { Input.mouseL = false; Game.mine = null; } if (e.button === 2) { Input.mouseR = false; useEnd(); } });
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('wheel', e => { if (Game.state !== 'play' || Game.ui) return; Game.sel = (Game.sel + (e.deltaY > 0 ? 1 : -1) + 9) % 9; showHeldName(); lastHudKey = ''; }, { passive: true });

// ---------------------------------------------------------------- targeting
function lookDir() { const cp = Math.cos(Player.pitch); return [-Math.sin(Player.yaw) * cp, Math.sin(Player.pitch), -Math.cos(Player.yaw) * cp]; }
function eye() { return [Player.x, Player.y + (Player.sneak ? 1.35 : 1.62), Player.z]; }
const TARGETABLE = id => id !== 0 && id !== B.WATER && id !== B.LAVA;
function targetBlock(reach) { const o = eye(), d = lookDir(); return raycastBlocks(o[0], o[1], o[2], d[0], d[1], d[2], reach || 5, TARGETABLE); }
function targetMob(reach) {
  const o = eye(), d = lookDir(); let best = null, bt = reach;
  const bh = targetBlock(reach); if (bh) bt = Math.min(bt, bh.t);
  for (const m of Mobs) {
    const lo = [m.x - m.hw - 0.1, m.y, m.z - m.hw - 0.1], hi = [m.x + m.hw + 0.1, m.y + m.h, m.z + m.hw + 0.1];
    let t0 = 0, t1 = bt, ok = true;
    for (let a = 0; a < 3 && ok; a++) {
      if (Math.abs(d[a]) < 1e-8) { if (o[a] < lo[a] || o[a] > hi[a]) ok = false; continue; }
      let a0 = (lo[a] - o[a]) / d[a], a1 = (hi[a] - o[a]) / d[a]; if (a0 > a1) [a0, a1] = [a1, a0];
      t0 = Math.max(t0, a0); t1 = Math.min(t1, a1); if (t0 > t1) ok = false;
    }
    if (ok && t0 < bt) { bt = t0; best = m; }
  }
  return best;
}

// ---------------------------------------------------------------- combat
let lastSwing = 0, swingAnim = 0;
function weaponStats() {
  const s = heldItem(), d = s ? itemDef(s.id) : null;
  if (d && (d.kind === 'weapon' || d.kind === 'tool')) return d;
  return { dmg: 1, aps: 2.5, reach: 3.5 };
}
function chargeLevel() { const w = weaponStats(); return clamp((performance.now() - lastSwing) / 1000 * (w.aps || 1.5), 0, 1); }
function attack() {
  const w = weaponStats(), m = targetMob(w.reach || 3.6), charge = chargeLevel();
  swingAnim = 1;
  if (!m) { lastSwing = performance.now() - (charge >= 1 ? 0 : 0); startMining(); return; }
  lastSwing = performance.now();
  const d = lookDir();
  let dmg = w.dmg * (0.2 + 0.8 * charge * charge);
  let crit = false;
  if (!Player.onGround && Player.vy < 0 && charge > 0.9) { dmg *= 1.5; crit = true; }
  if (w.backstab) {
    const behind = Math.cos(m.g.rotation.y) * (Player.z - m.z) + Math.sin(m.g.rotation.y) * (Player.x - m.x) < 0;
    if (behind) { dmg *= 2; crit = true; } else if (Math.random() < 0.5) { dmg *= 1.5; crit = true; }
  }
  if (hasRelic('melee')) dmg *= 1.25;
  if (fullSet() === 'prism') dmg *= 1.15;
  damageMob(m, dmg, d[0], d[2], crit);
  if (crit) burst(m.x, m.y + m.h * 0.7, m.z, 10, { life: 0.5, size: 0.08, r: 1, g: 0.9, b: 0.4, glow: true, spread: 4 });
  if (w.smash && charge > 0.95) { shake(0.5); for (const o of Mobs) if (o !== m && Math.hypot(o.x - m.x, o.z - m.z) < 4.5) damageMob(o, w.dmg * 0.5, (o.x - m.x), (o.z - m.z), false); burst(m.x, m.y + 0.2, m.z, 30, { life: 0.6, size: 0.15, r: 0.6, g: 0.9, b: 1, glow: true, spread: 9, up: 2 }); }
  if (w.wave && charge > 0.95) shoot('wave', Player.x + d[0], Player.y + 1, Player.z + d[2], d[0] * 16, 0, d[2] * 16, w.dmg * 0.8, 'player');
  wearTool();
}
function wearTool() { }

// ---------------------------------------------------------------- mining
const crackTex = [];
for (let s = 0; s < 8; s++) {
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  let seed = 3; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  g.fillStyle = 'rgba(0,0,0,0.75)';
  for (let k = 0; k <= s; k++) { let x = 8, y = 8; for (let i = 0; i < 5 + s; i++) { g.fillRect(Math.round(x), Math.round(y), 1, 1); x += (r() - 0.5) * 3; y += (r() - 0.5) * 3; } }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; crackTex.push(t);
}
const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), new THREE.MeshBasicMaterial({ map: crackTex[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
crackMesh.visible = false; scene.add(crackMesh);
const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }));
scene.add(outline);
function breakTime(id) {
  const d = BLK[id];
  let hard = d.hardness;
  if (id === B.ENERGY && ActiveBoss && ActiveBoss.type === 'colossus') hard = 2.5;
  if (hard < 0) return Infinity;
  if (hard === 0) return 0.05;
  const s = heldItem(), it = s ? itemDef(s.id) : null;
  let t = hard * 1.5;
  if (it && it.kind === 'tool' && d.tool === it.toolType) t /= it.mult;
  else if (d.tool === 'pick' && hard >= 1.5) t *= 2.2;
  return Math.max(0.05, t);
}
function startMining() { const h = targetBlock(5); Game.mine = h ? { x: h.x, y: h.y, z: h.z, t: 0, need: breakTime(h.id) } : null; if (h && Game.mine.need === Infinity) toastOnce('unbreak', 'This block cannot be broken.'); }
function updateMining(dt) {
  if (!Input.mouseL || Game.ui) { Game.mine = null; crackMesh.visible = false; return; }
  const h = targetBlock(5);
  if (!h) { Game.mine = null; crackMesh.visible = false; return; }
  if (!Game.mine || Game.mine.x !== h.x || Game.mine.y !== h.y || Game.mine.z !== h.z) { if (chargeLevel() > 0.3 || !Game.mine) Game.mine = { x: h.x, y: h.y, z: h.z, t: 0, need: breakTime(h.id) }; }
  const m = Game.mine;
  if (m.need === Infinity) { crackMesh.visible = false; return; }
  m.t += dt;
  swingAnim = Math.max(swingAnim, 0.6);
  if (Math.random() < dt * 6) blockBurst(h.x, h.y, h.z, h.id, 2);
  crackMesh.visible = true; crackMesh.position.set(h.x + 0.5, h.y + 0.5, h.z + 0.5);
  crackMesh.material.map = crackTex[Math.min(7, Math.floor(m.t / m.need * 8))];
  if (m.t >= m.need) { breakBlock(h); Game.mine = null; crackMesh.visible = false; }
}
function breakBlock(h) {
  const id = h.id, d = BLK[id], k = K(h.x, h.y, h.z);
  if (id === B.CHEST) { const c = Chests.get(k); if (c && c.items) for (const s of c.items) if (s) dropItem(s.id, s.n, h.x + 0.5, h.y + 0.5, h.z + 0.5); Chests.delete(k); }
  if (id === B.ENERGY) { // a colossus pylon: the whole column shatters
    for (let y = h.y - 8; y <= h.y + 8; y++) if (getB(h.x, y, h.z) === B.ENERGY || (getB(h.x, y, h.z) === B.CRYSTAL && getB(h.x, y - 1, h.z) === B.ENERGY)) { setBlockLogged(h.x, y, h.z, B.AIR); blockBurst(h.x, y, h.z, B.ENERGY, 10); }
    shake(0.4); toast('A pylon shatters!', 1500); return;
  }
  blockBurst(h.x, h.y, h.z, id, 16);
  setBlockLogged(h.x, h.y, h.z, B.AIR);
  // plants on top fall too
  const up = getB(h.x, h.y + 1, h.z);
  if (['cross', 'flat'].includes(BLK[up].render) && up !== B.TORCH) setBlockLogged(h.x, h.y + 1, h.z, B.AIR);
  let drop = d.drop;
  if (id === B.LEAVES || id === B.LEAVES_BLOSSOM) { if (Math.random() < 0.06) drop = I.globerry; else if (Math.random() < 0.1) drop = I.stick; }
  if (id === B.TALLGRASS && Math.random() < 0.08) drop = I.wheat;
  if (drop) dropItem(drop, id === B.CRYSTAL_CLUSTER || id === B.BERRYBUSH ? 1 + Math.floor(Math.random() * 2) : 1, h.x + 0.5, h.y + 0.5, h.z + 0.5);
  if (id === B.CRACKEDBRICK && Math.random() < 1) toastOnce('cracked', 'The wall crumbles... something is hidden behind it.');
}

// ---------------------------------------------------------------- use / place
let bowDraw = 0, drawing = false, staffCd = 0, useRepeat = 0;
function useStart() {
  const s = heldItem(), d = s ? itemDef(s.id) : null;
  const h = targetBlock(5);
  if (h && interact(h)) return;
  if (d && d.kind === 'bow') { if (countItem(I.arrow) > 0) { drawing = true; bowDraw = 0; } else toastOnce('noarrow', 'You need arrows.'); return; }
  if (d && d.kind === 'staff') { castStaff(d); return; }
  if (d && d.kind === 'compass') { openWayfinder(); return; }
  if (d && d.kind === 'food') { eat(s, d); return; }
  if (s && s.id < 256) placeBlock(h, s);
  useRepeat = 0.3;
}
function useEnd() {
  if (drawing) {
    drawing = false;
    const s = heldItem(), d = s ? itemDef(s.id) : null;
    if (d && d.kind === 'bow' && bowDraw > 0.15 && takeItem(I.arrow, 1)) {
      const p = Math.min(1, bowDraw), dir = lookDir(), e = eye(), sp = 14 + 26 * p * d.power;
      shoot('arrow', e[0] + dir[0] * 0.5, e[1] - 0.1, e[2] + dir[2] * 0.5, dir[0] * sp, dir[1] * sp, dir[2] * sp, d.dmg * p, 'player', { crit: p >= 1 });
      swingAnim = 0.4;
    }
    bowDraw = 0;
  }
}
function castStaff(d) {
  if (staffCd > 0) return;
  staffCd = d.cd;
  const o = eye(), dir = lookDir();
  let first = null, bestScore = 0;
  for (const m of Mobs) {
    const dx = m.x - o[0], dy = m.y + m.h / 2 - o[1], dz = m.z - o[2], dist = Math.hypot(dx, dy, dz);
    if (dist > 22) continue;
    const dot = (dx * dir[0] + dy * dir[1] + dz * dir[2]) / dist;
    if (dot > 0.85 && dot / (1 + dist * 0.02) > bestScore) { bestScore = dot / (1 + dist * 0.02); first = m; }
  }
  const start = [o[0] + dir[0] * 0.8, o[1] - 0.2 + dir[1] * 0.8, o[2] + dir[2] * 0.8];
  swingAnim = 0.6;
  if (!first) { lightning(start, [o[0] + dir[0] * 14, o[1] + dir[1] * 14, o[2] + dir[2] * 14]); return; }
  const hit = [first]; let cur = first;
  for (let k = 0; k < 2; k++) { let nx = null, nd = 7; for (const m of Mobs) if (!hit.includes(m)) { const dd = Math.hypot(m.x - cur.x, m.z - cur.z); if (dd < nd) { nd = dd; nx = m; } } if (!nx) break; hit.push(nx); cur = nx; }
  let prev = start;
  for (const m of hit) { const p = [m.x, m.y + m.h * 0.6, m.z]; lightning(prev, p); prev = p; }
  hit.forEach((m, i) => damageMob(m, d.dmg * (i ? 0.7 : 1) * (hasRelic('melee') ? 1 : 1), 0, 0, false));
  shake(0.15);
}
function eat(s, d) {
  const needFood = Settings.hunger && Player.food < 20, needHp = Player.hp < maxHealth();
  if (!needFood && !(d.heal && needHp)) { toastOnce('full', "You're not hungry."); return; }
  Player.food = Math.min(20, Player.food + d.food); Player.hp = Math.min(maxHealth(), Player.hp + d.heal);
  s.n--; if (!s.n) Inv.slots[Game.sel] = null;
  const e = eye(), dir = lookDir();
  burst(e[0] + dir[0] * 0.5, e[1] - 0.2, e[2] + dir[2] * 0.5, 8, { life: 0.5, size: 0.06, r: 0.8, g: 0.6, b: 0.3, grav: 10, spread: 2, up: 1 });
  lastHudKey = ''; swingAnim = 0.5;
}
function placeBlock(h, s) {
  if (!h) return;
  const x = h.px, y = h.py, z = h.pz, cur = getB(x, y, z);
  if (cur !== 0 && cur !== B.WATER && BLK[cur].render !== 'cross') return;
  const d = BLK[s.id];
  if (d.solid && collides(Player.x, Player.y, Player.z, Player.hw, Player.h) === false) {
    if (x + 1 > Player.x - Player.hw && x < Player.x + Player.hw && z + 1 > Player.z - Player.hw && z < Player.z + Player.hw && y + 1 > Player.y && y < Player.y + Player.h) return;
    for (const m of Mobs) if (x + 1 > m.x - m.hw && x < m.x + m.hw && z + 1 > m.z - m.hw && z < m.z + m.hw && y + 1 > m.y && y < m.y + m.h) return;
  }
  if (d.render === 'cross' && !SOLID[getB(x, y - 1, z)]) return;
  // facing: toward the player
  const dx = Player.x - (x + 0.5), dz = Player.z - (z + 0.5);
  let meta = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 2 : 0);
  if (d.render === 'ladder') { const f = h.face; meta = f === 4 ? 0 : f === 1 ? 3 : f === 5 ? 2 : f === 0 ? 1 : -1; if (meta < 0) return; meta = [2, 3, 0, 1][meta] === undefined ? meta : meta; meta = h.face === 5 ? 2 : h.face === 4 ? 0 : h.face === 0 ? 1 : 3; }
  setBlockLogged(x, y, z, s.id, meta);
  if (s.id === B.CHEST) Chests.set(K(x, y, z), { table: 'house', items: new Array(27).fill(null), made: true });
  s.n--; if (!s.n) Inv.slots[Game.sel] = null;
  lastHudKey = ''; swingAnim = 0.5;
}
function interact(h) {
  const k = K(h.x, h.y, h.z);
  switch (h.id) {
    case B.CHEST: {
      const c = Chests.get(k) || (Chests.set(k, { table: 'house', items: null }), Chests.get(k));
      if (!c.items) { c.items = new Array(27).fill(null); const loot = rollLoot(c.table); let i = 0; for (const it of loot) { const slot = Math.floor(Math.random() * 27); let j = slot; while (c.items[j]) j = (j + 1) % 27; c.items[j] = { id: it.id, n: it.n }; i++; } }
      openInventory(k); return true;
    }
    case B.TABLET: case B.RUNEPILLAR: { const l = Lore.get(k); if (l) { openLore(l); if (!l.read) { l.read = true; } return true; } return h.id === B.TABLET; }
    case B.WAYSTONE: {
      Game.spawn = [h.x + 1.5, h.y + (getB(h.x, h.y - 1, h.z) === B.WAYSTONE ? 0 : 1), h.z + 0.5];
      if (getB(h.x, h.y - 1, h.z) === B.WAYSTONE) Game.spawn[1] = h.y;
      const sy = surfaceY(h.x + 1, h.z); Game.spawn = [h.x + 1.5, sy + 1, h.z + 0.5];
      toast('Attuned — you will return here if you fall.', 3000);
      burst(h.x + 0.5, h.y + 1, h.z + 0.5, 30, { life: 1, size: 0.1, r: 0.4, g: 0.95, b: 1, glow: true, spread: 3, up: 4 });
      saveGame(); return true;
    }
    case B.ALTAR: {
      if (!Game.halls || !Game.halls.seal) return true;
      if (takeItem(I.key, 1)) {
        for (const p of Game.halls.seal) { setBlockLogged(p[0], p[1], p[2], B.AIR); burst(p[0] + 0.5, p[1] + 0.5, p[2] + 0.5, 12, { life: 0.8, size: 0.12, r: 0.6, g: 0.4, b: 1, glow: true, spread: 3 }); }
        bossBanner('The Seal is Broken', 'Something vast stirs in the deep'); shake(0.6);
      } else toast('The Seal of the Deep is locked. The Mirewarden carries the key.', 3500);
      return true;
    }
    case B.TABLE: openInventory(); return true;
    case B.FURNACE: toastOnce('furn', 'The forge is warm. Craft at a nearby crafting table.'); return false;
  }
  return false;
}

// ---------------------------------------------------------------- damage & survival
function hurtPlayer(dmg, type, kx, kz) {
  if (!Player.alive || Game.state !== 'play') return;
  if (type === 'burn' && (hasRelic('fire') || fullSet() === 'warden')) type = null;
  if (Player.inv > 0) return;
  const real = dmg * (1 - armorReduction());
  Player.hp -= real; Player.inv = 0.5;
  if (type === 'burn') Player.burn = 3;
  if ((kx || kz) && fullSet() !== 'warden') { Player.vx += kx * 6; Player.vz += kz * 6; Player.vy = Math.max(Player.vy, 5); }
  $('vignette').style.opacity = 1; setTimeout(() => { $('vignette').style.opacity = 0; }, 180);
  shake(0.25); lastHudKey = '';
  if (Player.hp <= 0) die();
}
const DEATH_MSG = ['The world keeps turning without you.', 'Even legends rest sometimes.', 'The shards remember your name.', 'Get up. The Colossus is still sleeping.'];
function die() {
  Player.alive = false; Player.hp = 0; Stats.deaths++;
  if (ActiveBoss) { removeMob(ActiveBoss); ActiveBoss = null; }
  for (const m of Mobs.slice()) if (m.type === 'knight' && !m.spawn) removeMob(m);
  $('deathMsg').textContent = DEATH_MSG[Math.floor(Math.random() * DEATH_MSG.length)];
  $('death').classList.remove('hidden');
  Game.ui = 'death';
  document.exitPointerLock && document.exitPointerLock();
}
function respawn(silent) {
  $('death').classList.add('hidden');
  Object.assign(Player, { x: Game.spawn[0], y: Game.spawn[1], z: Game.spawn[2], vx: 0, vy: 0, vz: 0, hp: maxHealth(), food: Math.max(Player.food, 14), alive: true, burn: 0, inv: 1.5 });
  Game.ui = null; lastHudKey = '';
  if (!silent) lockPointer();
}
function updateSurvival(dt) {
  const P = Player;
  if (P.inv > 0) P.inv -= dt;
  if (P.burn > 0) { P.burn -= dt; if (Math.random() < dt * 20) emit(P.x + (Math.random() - 0.5) * 0.6, P.y + Math.random() * 1.6, P.z + (Math.random() - 0.5) * 0.6, { vy: 1.5, life: 0.5, size: 0.08, r: 1, g: 0.5, b: 0.1, glow: true }); P.burnTick = (P.burnTick || 0) - dt; if (P.burnTick <= 0) { P.burnTick = 1; const i = P.inv; P.inv = 0; hurtPlayer(1); P.inv = i; } }
  const hz = touching(P.x, P.y, P.z, P.hw, P.h, HURT);
  if (hz) { const lava = touching(P.x, P.y, P.z, P.hw, P.h, IS_LAVA); if (lava) hurtPlayer(4, 'burn'); else hurtPlayer(hz, getB(Math.floor(P.x), Math.floor(P.y), Math.floor(P.z)) === B.FIRE ? 'burn' : null); }
  if (Settings.hunger) {
    P.foodT += dt * (Input.keys.ShiftLeft && isMoving() ? 3 : 1);
    if (P.foodT > 30) { P.foodT = 0; P.food = Math.max(0, P.food - 1); lastHudKey = ''; }
    if (P.food >= 16 && P.hp < maxHealth()) { P.regenT += dt; if (P.regenT > 3) { P.regenT = 0; P.hp = Math.min(maxHealth(), P.hp + 1); lastHudKey = ''; } }
    if (P.food <= 0) { P.starveT += dt; if (P.starveT > 4) { P.starveT = 0; if (P.hp > 1) { P.hp -= 1; lastHudKey = ''; } } }
  } else if (P.hp < maxHealth()) { P.regenT += dt; if (P.regenT > 2.5) { P.regenT = 0; P.hp = Math.min(maxHealth(), P.hp + 1); lastHudKey = ''; } }
  if (hasRelic('heart') && P.hp < maxHealth()) { P.hp = Math.min(maxHealth(), P.hp + dt * 0.25); }
}
const IS_LAVA = new Uint8Array(256); IS_LAVA[B.LAVA] = 1;
function isMoving() { return Input.keys.KeyW || Input.keys.KeyA || Input.keys.KeyS || Input.keys.KeyD; }

// ---------------------------------------------------------------- player physics
function updatePlayer(dt) {
  const P = Player, K = Input.keys;
  const feet = getB(Math.floor(P.x), Math.floor(P.y + 0.3), Math.floor(P.z));
  const inWater = feet === B.WATER || getB(Math.floor(P.x), Math.floor(P.y + 1), Math.floor(P.z)) === B.WATER;
  const headWater = getB(Math.floor(P.x), Math.floor(P.y + 1.62), Math.floor(P.z)) === B.WATER;
  const climbing = touching(P.x, P.y, P.z, P.hw + 0.05, P.h, CLIMB) > 0;
  P.sneak = !!(K.ControlLeft || K.KeyC);
  let f = 0, s = 0;
  if (!Game.ui && P.alive) { if (K.KeyW) f += 1; if (K.KeyS) f -= 1; if (K.KeyD) s += 1; if (K.KeyA) s -= 1; }
  const len = Math.hypot(f, s) || 1; f /= len; s /= len;
  const sprint = K.ShiftLeft && f > 0 && (!Settings.hunger || P.food > 6);
  let speed = P.sneak ? 1.6 : sprint ? 6.4 : 4.3;
  if (inWater) speed *= 0.55;
  if (Game.peaceful) speed *= 2;
  if (drawing) speed *= 0.45;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const tx = (fx * f + rx * s) * speed, tz = (fz * f + rz * s) * speed;
  const k = Math.min(1, dt * (P.onGround ? 14 : inWater ? 5 : 3.5));
  P.vx += (tx - P.vx) * k; P.vz += (tz - P.vz) * k;
  if (climbing) { P.vy = K.Space || (f > 0 && (P.hitX || P.hitZ)) ? 3.6 : P.sneak ? 0 : Math.max(P.vy - 28 * dt, -2.2); }
  else if (inWater) { P.vy -= 9 * dt; P.vy = Math.max(P.vy, -3.2); if (K.Space && !Game.ui) P.vy = Math.min(P.vy + 26 * dt, 3.6); }
  else { P.vy -= 28 * dt; if (K.Space && P.onGround && !Game.ui && P.alive) P.vy = 8.6; }
  P.vy = Math.max(P.vy, -45);
  const wasGround = P.onGround, vyBefore = P.vy;
  // sneaking keeps you from walking off edges
  if (P.sneak && P.onGround) {
    const ox = P.x, oz = P.z;
    if (!collides(P.x + P.vx * dt, P.y - 0.1, P.z, P.hw, 0.1)) P.vx = 0;
    if (!collides(P.x, P.y - 0.1, P.z + P.vz * dt, P.hw, 0.1)) P.vz = 0;
  }
  moveBody(P, dt);
  if (P.onGround && !wasGround && vyBefore < -15 && !inWater && !climbing) hurtPlayer((-vyBefore - 15) * 0.9);
  if (P.y < -10) { P.hp = 0; die(); }
  // underwater visuals
  U.uUnder.value = headWater ? 1 : 0;
  $('underwater').style.opacity = headWater ? 1 : 0;
  // footstep dust
  if (P.onGround && Math.hypot(P.vx, P.vz) > 5 && Math.random() < dt * 8) { const id = getB(Math.floor(P.x), Math.floor(P.y - 0.5), Math.floor(P.z)); if (id) blockBurst(P.x - 0.5, P.y - 0.9, P.z - 0.5, id, 1); }
}

// ---------------------------------------------------------------- world events
let discT = 0, zoneCheckT = 0;
function updateWorldEvents(dt) {
  const P = Player;
  discT -= dt;
  if (discT <= 0) {
    discT = 0.4;
    for (const s of Sites) if (!s.found && Math.hypot(s.x - P.x, s.z - P.z) < s.r && Math.abs(P.y - s.y) < 30) { s.found = true; startCinematic(s); saveGame(); if (Game.follow === s) Game.follow = null; break; }
    const bi = bmap[clamp(Math.floor(P.x), 0, W - 1) + clamp(Math.floor(P.z), 0, D - 1) * W];
    if (bi !== Game.zone) { Game.zoneT += 0.4; if (Game.zoneT > 1.2) { Game.zone = bi; Game.zoneT = 0; if (!Game.cine) zoneBanner(BIOMES[bi].name, BIOMES[bi].lore); } } else Game.zoneT = 0;
  }
  for (const r of BossRooms) if (!r.done && !ActiveBoss && Math.hypot(r.x - P.x, r.z - P.z) < r.r - 3 && Math.abs(P.y - r.y) < 5) startBoss(r);
  if (ActiveBoss && (Math.hypot(ActiveBoss.room.x - P.x, ActiveBoss.room.z - P.z) > ActiveBoss.room.r + 25 || Math.abs(P.y - ActiveBoss.room.y) > 14)) { removeMob(ActiveBoss); ActiveBoss = null; toast('You fled. The guardian returns to its slumber.', 3000); }
  for (const p of Portals) if (Math.abs(P.x - (p.x + 0.5)) < 1.6 && Math.abs(P.z - (p.z + 0.5)) < 0.9 && Math.abs(P.y - p.y) < 2) { P.x = p.to[0]; P.y = surfaceY(Math.floor(p.to[0]), Math.floor(p.to[2])) + 1.2; P.z = p.to[2]; P.vy = 0; bossBanner('Back to the surface', 'The night air is cool'); burst(P.x, P.y + 1, P.z, 40, { life: 1, size: 0.12, r: 0.7, g: 0.95, b: 1, glow: true, spread: 4, up: 4 }); }
  // ambient emitters near the player
  for (const e of Emitters) {
    const d = Math.hypot(e.x - P.x, e.z - P.z); if (d > 48) continue;
    if (e.type === 'smoke' && Math.random() < dt * 6) emit(e.x + (Math.random() - 0.5) * 0.3, e.y, e.z + (Math.random() - 0.5) * 0.3, { vy: 1.2 + Math.random() * 0.4, vx: 0.3 + Math.random() * 0.2, life: 3, size: 0.25, grow: 2.5, r: 0.55, g: 0.55, b: 0.58, a: 0.55 });
    else if (e.type === 'splash' && Math.random() < dt * 12) emit(e.x, e.y, e.z, { vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random(), vz: (Math.random() - 0.5) * 2, grav: 10, life: 0.8, size: 0.07, r: 0.6, g: 0.8, b: 1, a: 0.8 });
    else if (e.type === 'rune' && Math.random() < dt * 5) emit(e.x + (Math.random() - 0.5), e.y - 1 + Math.random() * 2, e.z + (Math.random() - 0.5), { vy: 0.6, life: 1.5, size: 0.07, r: 0.4, g: 0.95, b: 1, glow: true });
    else if (e.type === 'sparkle' && Math.random() < dt * 10) emit(e.x + (Math.random() - 0.5) * 3, e.y + (Math.random() - 0.5) * 6, e.z + (Math.random() - 0.5) * 3, { vy: -0.4, life: 1.2, size: 0.09, r: 0.7, g: 1, b: 1, glow: true });
    else if (e.type === 'ember' && Math.random() < dt * 8) emit(e.x + (Math.random() - 0.5), e.y, e.z + (Math.random() - 0.5), { vy: 1.5, life: 1.2, size: 0.08, r: 1, g: 0.5, b: 0.1, glow: true });
    else if (e.type === 'bubble' && Math.random() < dt * 6) emit(e.x + (Math.random() - 0.5) * 0.5, e.y, e.z + (Math.random() - 0.5) * 0.5, { vy: 0.8, life: 0.8, size: 0.1, r: 0.5, g: 1, b: 0.4, glow: true });
  }
  // biome ambience: fireflies, spores, ash, dust
  const bi = Game.zone, night = U.uDay.value < 0.5;
  if (Math.random() < dt * 25) {
    const x = P.x + (Math.random() - 0.5) * 30, z = P.z + (Math.random() - 0.5) * 30, gy = surfaceY(Math.floor(x), Math.floor(z));
    if ((bi === 1 || bi === 2 || bi === 0) && night) emit(x, gy + 1 + Math.random() * 3, z, { vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.3, vz: (Math.random() - 0.5) * 0.6, life: 4, size: 0.06, r: bi === 2 ? 0.5 : 0.9, g: 1, b: bi === 2 ? 0.8 : 0.4, glow: true });
    else if (bi === 1 && !night) emit(x, gy + 1 + Math.random() * 5, z, { vx: 0.2, vy: -0.1, life: 5, size: 0.04, r: 1, g: 1, b: 0.85, a: 0.7 });
    else if (bi === 5) emit(x, gy + 1 + Math.random() * 8, z, { vx: 0.4, vy: Math.random() < 0.3 ? 1 : -0.4, life: 4, size: 0.05, r: Math.random() < 0.3 ? 1 : 0.35, g: Math.random() < 0.3 ? 0.5 : 0.32, b: 0.3, glow: Math.random() < 0.3 });
    else if (bi === 3 && !night) emit(x, gy + 0.5 + Math.random() * 2, z, { vx: 1.5, vy: 0, life: 3, size: 0.04, r: 0.95, g: 0.85, b: 0.6, a: 0.5 });
    else if (bi === 4 && night) emit(x, gy + 1 + Math.random() * 4, z, { vy: 0.3, life: 3, size: 0.05, r: 0.6, g: 1, b: 1, glow: true });
  }
  // lava pops
  if (Math.random() < dt * 4) { const x = Math.floor(P.x + (Math.random() - 0.5) * 30), z = Math.floor(P.z + (Math.random() - 0.5) * 30); const y = surfaceY(x, z); if (getB(x, y, z) === B.LAVA) burst(x + 0.5, y + 1, z + 0.5, 4, { life: 0.8, size: 0.08, r: 1, g: 0.6, b: 0.1, glow: true, grav: 12, spread: 1.5, up: 4 }); }
}

// ---------------------------------------------------------------- sky & atmosphere
const fogCur = { c: new THREE.Color(0xbfd8ee), near: 60, far: 150 };
const C_NIGHT_TOP = new THREE.Color(0x03050f), C_DAY_TOP = new THREE.Color(0x3d7fd8), C_NIGHT_H = new THREE.Color(0x0e1428), C_SUNSET = new THREE.Color(0xe87a4a);
function updateSky(dt) {
  Game.time = (Game.time + dt / 600) % 1; Game.day += dt / 600;
  const sunH = Math.sin((Game.time - 0.25) * Math.PI * 2);
  const day = clamp(sunH * 2.2 + 0.45, 0.2, 1);
  U.uDay.value = day; U.uTime.value += dt;
  const bi = Game.zone >= 0 ? Game.zone : 0, bio = BIOMES[bi];
  const k = Math.min(1, dt * 0.6);
  fogCur.c.lerp(new THREE.Color(bio.fog), k); fogCur.near += (bio.fogNear * Settings.view - fogCur.near) * k; fogCur.far += (bio.fogFar * Settings.view - fogCur.far) * k;
  const dn = clamp((day - 0.2) / 0.8, 0, 1);
  const sunset = clamp(1 - Math.abs(sunH) * 4.5, 0, 1);
  const horizon = C_NIGHT_H.clone().lerp(fogCur.c, dn).lerp(C_SUNSET, sunset * 0.55);
  const top = C_NIGHT_TOP.clone().lerp(C_DAY_TOP, dn);
  skyMat.uniforms.uTop.value.copy(top); skyMat.uniforms.uHorizon.value.copy(horizon);
  const ang = (Game.time - 0.25) * Math.PI * 2;
  skyMat.uniforms.uSunDir.value.set(0, Math.sin(ang), -Math.cos(ang)).normalize();
  skyMat.uniforms.uGlow.value.setRGB(1, 0.6, 0.3).multiplyScalar(sunset + 0.2 * dn);
  if (U.uUnder.value > 0.5) U.uFogColor.value.setRGB(0.08, 0.2, 0.42).multiplyScalar(0.4 + 0.6 * dn);
  else U.uFogColor.value.copy(horizon);
  U.uFogNear.value = fogCur.near; U.uFogFar.value = fogCur.far;
  sky.position.copy(camera.position); celestial.position.copy(camera.position);
  celestial.rotation.x = ang;
  starMat.opacity = clamp(1 - dn * 1.6, 0, 1);
  cloudGroup.position.set(camera.position.x - ((U.uTime.value * 1.2) % 12) - 240, 92, camera.position.z - 240);
  cloudGroup.position.x = Math.floor(camera.position.x / 12) * 12 - 480 + ((U.uTime.value * 1.2) % 12);
  cloudGroup.position.z = Math.floor(camera.position.z / 12) * 12 - 480;
  cloudGroup.userData.mat.color.copy(new THREE.Color(0x2a3048).lerp(new THREE.Color(0xffffff), dn).lerp(C_SUNSET, sunset * 0.4));
  auroraMat.uniforms.uAlpha.value += (((bi === 4 && dn < 0.3) ? 0.9 : 0) - auroraMat.uniforms.uAlpha.value) * k;
  aurora.position.set(camera.position.x, 0, camera.position.z);
  aurora.visible = auroraMat.uniforms.uAlpha.value > 0.01;
  U.uTorch.value.setRGB(1.0, 0.58 + 0.03 * Math.sin(U.uTime.value * 9), 0.26);
  // light direction + colours: golden hour at the horizon, cool moonlight at night
  const sunDir = skyMat.uniforms.uSunDir.value;
  const golden = new THREE.Color(1.25, 0.62, 0.3), noon = new THREE.Color(1.05, 0.98, 0.88), moon = new THREE.Color(0.07, 0.1, 0.19);
  if (sunH > -0.04) {
    U.uSunDir.value.copy(sunDir);
    U.uSunCol.value.copy(golden).lerp(noon, clamp(sunH / 0.45, 0, 1)).multiplyScalar(clamp((sunH + 0.04) / 0.14, 0, 1));
  } else {
    U.uSunDir.value.copy(sunDir).negate();
    U.uSunCol.value.copy(moon).multiplyScalar(clamp((-sunH - 0.04) / 0.2, 0, 1));
  }
  U.uAmbCol.value.setRGB(0.022, 0.03, 0.06).lerp(new THREE.Color(0.3, 0.37, 0.52), dn * dn).lerp(new THREE.Color(0.55, 0.42, 0.42), sunset * 0.35);
  U.uHazeCol.value.setRGB(1, 0.7, 0.4).multiplyScalar(sunset * 0.9 + dn * 0.12);
  Game.sunUp = clamp(sunH * 3, 0, 1) * (0.4 + sunset * 0.6);
}

// ---------------------------------------------------------------- held item view model
const viewModel = new THREE.Group(); camera.add(viewModel);
let viewId = -1, viewMesh = null;
const armMat = new THREE.MeshBasicMaterial({ map: skin('playerarm', 0xd8a07a, { accent: 0x4a6aa8, belly: 1, noise: 0.1 }) });
const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.75), armMat);
armMesh.position.set(0.42, -0.42, -0.45); armMesh.rotation.set(0.15, -0.1, 0); viewModel.add(armMesh);
function updateViewModel(dt) {
  const s = heldItem(), id = s ? s.id : 0;
  if (id !== viewId) {
    if (viewMesh) viewModel.remove(viewMesh);
    viewMesh = id ? itemMesh(id) : null; viewId = id;
    if (viewMesh) { viewModel.add(viewMesh); }
  }
  swingAnim = Math.max(0, swingAnim - dt * 3.2);
  const sw = Math.sin((1 - swingAnim) * Math.PI) * (swingAnim > 0 ? 1 : 0);
  const moving = Math.hypot(Player.vx, Player.vz) > 0.5 && Player.onGround;
  const t = U.uTime.value, bob = moving ? Math.sin(t * 10) * 0.025 : Math.sin(t * 2) * 0.006;
  viewModel.position.set(bob * 0.6, bob - sw * 0.12, 0);
  const L = lightAt(Player.x, Player.y + 1.6, Player.z), lv = Math.max(L[0] / 15 * U.uDay.value, L[1] / 15) * 0.85 + 0.15;
  armMat.color.setScalar(lv);
  if (viewMesh) {
    viewMesh.material.color.setScalar(lv);
    const d = itemDef(id);
    if (id < 256) { viewMesh.scale.setScalar(0.3); viewMesh.position.set(0.48, -0.4 + sw * 0.1, -0.75 + sw * 0.2); viewMesh.rotation.set(sw * 0.8, 0.6, 0); armMesh.visible = false; }
    else {
      armMesh.visible = false;
      viewMesh.scale.setScalar(0.3);
      if (d.kind === 'bow') { const p = drawing ? Math.min(1, bowDraw) : 0; viewMesh.position.set(0.3 - p * 0.1, -0.28, -0.66 + p * 0.12); viewMesh.rotation.set(0, Math.PI / 2 + 0.1, -0.3); }
      else { viewMesh.position.set(0.36, -0.3 + sw * 0.05, -0.62 - sw * 0.15); viewMesh.rotation.set(-sw * 1.6, -Math.PI / 2 + 0.25, 0.1 - sw * 0.4); }
    }
  } else { armMesh.visible = true; armMesh.rotation.x = 0.15 - sw * 1.2; }
}

// ---------------------------------------------------------------- main loop
let last = performance.now(), fpsAcc = 0, fpsN = 0, autosave = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { $('fps').textContent = Math.round(fpsN / fpsAcc) + ' fps · ' + Mobs.length + ' mobs'; fpsAcc = 0; fpsN = 0; }
  if (Game.state === 'title' || Game.state === 'loading') { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
  const playing = Game.state === 'play' && Player.alive && !Game.cine && Game.ui !== 'pause';
  if (Game.state === 'play' && Game.ui !== 'pause') {
    if (!Game.cine) updatePlayer(dt);
    updateMining(Game.cine ? 0 : dt);
    if (drawing) bowDraw += dt;
    staffCd -= dt;
    if (Input.mouseR && !drawing && !Game.ui && playing) { useRepeat -= dt; const s = heldItem(); if (useRepeat <= 0 && s && s.id < 256) { useRepeat = 0.22; placeBlock(targetBlock(5), s); } }
    updateSurvival(dt);
    updateMobs(dt, Player); updateSpawning(dt, Player); updateTelegraphs(dt, Player);
    updateProjectiles(dt, Player); updateDrops(dt, Player); updateBolts(dt);
    updateWorldEvents(dt);
    autosave += dt; if (autosave > 45) { autosave = 0; saveGame(); }
  }
  updateWindmills(dt);
  updateSky(dt);
  updateParticles(dt, U.uDay.value);
  updateDamageNumbers(dt);
  flushDirty(2);
  // camera
  if (!updateCinematic(dt)) {
    const e = eye();
    camera.position.set(e[0], e[1], e[2]);
    camera.rotation.set(Player.pitch, Player.yaw, 0);
    if (shakeAmt > 0) { camera.position.x += (Math.random() - 0.5) * shakeAmt * 0.3; camera.position.y += (Math.random() - 0.5) * shakeAmt * 0.3; shakeAmt = Math.max(0, shakeAmt - dt * 2); }
    if (drawing) camera.fov = Settings.fov - Math.min(1, bowDraw) * 8; else camera.fov += (Settings.fov + (Input.keys.ShiftLeft && isMoving() ? 6 : 0) - camera.fov) * Math.min(1, dt * 8);
    camera.updateProjectionMatrix();
  }
  viewModel.visible = !Game.cine;
  updateViewModel(dt);
  // block outline
  const h = !Game.ui && !Game.cine && Game.state === 'play' ? targetBlock(5) : null;
  outline.visible = !!h; if (h) outline.position.set(h.x + 0.5, h.y + 0.5, h.z + 0.5);
  // HUD
  if (Game.state === 'play') {
    drawHUD(Player); drawBossBar(); drawTracker(Player);
    const ch = chargeLevel(), c = $('charge');
    c.style.opacity = (ch < 1 || drawing) ? 1 : 0;
    c.querySelector('i').style.width = ((drawing ? Math.min(1, bowDraw) : ch) * 100) + '%';
    if (Game.ui === 'wf' && Math.random() < 0.05) renderWayfinder();
  }
  renderWorld();
}
const shadowCenter = new THREE.Vector3();
let shadowFrame = 0;
function renderWorld() {
  const shadows = Settings.shaders && Settings.shadows && U.uSunCol.value.r + U.uSunCol.value.g > 0.05;
  U.uShadowOn.value = shadows ? 1 : 0;
  if (shadows && (shadowFrame++ % 2 === 0 || Game.cine)) {
    if (Game.cine) shadowCenter.set(Game.cine.site.x, Game.cine.site.y, Game.cine.site.z); else shadowCenter.set(Math.floor(Player.x), Math.floor(Player.y), Math.floor(Player.z));
    PostFX.renderShadows(shadowCenter, U.uSunDir.value);
  }
  PostFX.render({ post: Settings.shaders, sunDir: skyMat.uniforms.uSunDir.value, sunUp: Game.sunUp || 0, night: clamp(1 - (U.uDay.value - 0.2) / 0.5, 0, 1), under: U.uUnder.value });
}

// ---------------------------------------------------------------- boot
function boot() {
  resize(); applySettings(); paintTitle(); refreshTitle();
  camera.position.set(128, 60, 128);
  requestAnimationFrame(frame);
  window.__g = { Game, Player, Inv, Sites, Mobs, BossRooms, giveItem, I, B, spawnMob, startBoss, setBlockLogged, createWorld, saveGame,
    tp(x, z, yaw) { Player.x = x + 0.5; Player.z = z + 0.5; Player.y = surfaceY(Math.floor(x), Math.floor(z)) + 1.2; Player.vy = 0; if (yaw !== undefined) Player.yaw = yaw; },
    play() { Game.state = 'play'; $('clickToBegin').classList.add('hidden'); },
    setTime(t) { Game.time = t; } };
}
boot();
