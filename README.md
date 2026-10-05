# Blockhollow

A voxel fantasy RPG that runs in the browser. It is plain JavaScript on Three.js, with no build step and no network needed.
All textures, models, creatures, structures, names and lore are original and generated in code.

## Run it
Open `index.html` in a browser, or serve the folder (`python3 -m http.server`) and visit http://localhost:8000.
Click **New World**, enter a world name (it doubles as the seed), and click to begin. Progress autosaves to the browser; **Continue** resumes it.

## Features
- **World:** endless procedural voxel world (chunks stream in around you; the 256×256 starting realm holds the hand-built villages and dungeons) with six biomes: Meadowbrook Vale, Ancient Forest (giant oaks), Mystic Marsh, Sunscorch Dunes, Crystal Highlands (aurora at night) and the Ashlands (lava). It has rivers, lakes, ores and a day/night cycle with sun, moon, stars and blocky clouds.
- **Shaders:** sun and moon shadow mapping with soft (PCF) edges; linear-space lighting (golden-hour sun, cool sky ambient, warm flickering lantern light whose falloff is squared); Fresnel water with sun glints; HDR bloom, sun rays, a filmic tone curve, warm grading and a vignette. These can be turned off in Settings.
- **Rendering:** procedural 16×16 pixel textures, smooth lighting with ambient occlusion, sky light plus warm torch light, animated water and lava, swaying plants, per-biome fog, and particles (chimney smoke, fireflies, embers, crystal sparkles).
- **Villages:**
  - *Wheatmere*: farming village with a windmill whose sails turn, a barn and loft, wheat fields, a market, a fountain and a waystone.
  - *Stiltwick*: stilt fishing village with boardwalks, nets and a boat workshop.
  - *Sahra Oasis*: desert town with rooftop terraces, awnings and an artifact hall.
  - *Shardholm*: mining village with an ore face, rails and a smithy.
- **Landmarks and camps:** The Knelt Sovereign, The Shattered Oath, Beacon Lookout, Wrecked Wagon, Hollowmere Graveyard, Deepvein Mine, Ruins of Ostmere, the Ashen Bastion (lava moat and watchtowers) and five camps.
- **Dungeons:**
  - *Ruined Watchtower*: multi-floor, with ladders and a rooftop altar.
  - *Bog Hag's Hut*.
  - *The Drowned Halls*: a sunken citadel with spike traps, a hidden vault behind cracked bricks, and the **Mirewarden** boss, who drops the Deepseal Key. The key opens the seal to the colossus arena, where the multi-phase **Sleeping Colossus** fight happens: shield pylons, shockwaves and spike fields, then "The Heart Awakens". After the fight, an escape portal opens.
- **Creatures:** Antlered Deer, Bristleback Boar, Shade, Dune Crawler, Crystal Golem, Shard Wisp (flying, ranged), Fire Elemental, Magma Imp, Drowned Knight and Rune Sentinel.
- **Combat:**
  - charged swings and crits;
  - Gloomshiv backstabs;
  - Runebreaker Maul ground smash;
  - Colossus Edge crystal wave;
  - bows with draw time and arrows;
  - Thundercall Staff chain lightning;
  - floating damage numbers and boss health bars.
- **Survival and items:**
  - hearts and hunger (hunger can be turned off in settings);
  - food, armor sets with set bonuses and relics;
  - mining with tool tiers and crack stages;
  - block placing, a 36-slot inventory and loot chests;
  - a recipe-book crafting system (some recipes need a crafting table).
- **Crafting & storage:** 2×2 crafting grid in the inventory, 3×3 next to a crafting table, with shaped and shapeless recipes (89 recipes: every building block, tool, weapon, armour piece and relic). The recipe book auto-fills the grid. Chests, barrels and crates are 27-slot storage.
- **Feel:** first-person arm with a chop/punch swing that loops while mining; tools are held in the hand.
- **AI:** mobs use weighted A* pathfinding on the voxel grid (step-ups, safe drops, hazard avoidance), within a per-frame budget.
- **Performance:** Low/Medium/High/Ultra presets, render scale, auto performance (dynamic resolution), particle density, chunk distance culling and a live system info panel.
- **Exploration UI:**
  - location banners and the "Discovered" cinematic camera pan;
  - the Wayfinder's Compass (M), with tabs and Follow tracking;
  - lore tablets with pixel-art illustrations;
  - waystone attunement for respawning.
- **Menus:** title screen, world creation, pause, settings (sensitivity, FOV, view distance, hunger, cinematics, FPS), controls and a death screen.

## Controls
WASD move · Space jump/swim/climb · Shift sprint · Ctrl sneak · Left click attack/mine · Right click use/place/draw bow/cast ·
1–9 / wheel hotbar · E inventory & crafting · M Wayfinder · Q drop · Esc pause

## Layout
`src/textures.js` texture atlas · `blocks.js` block registry · `world.js` terrain + lighting · `items.js` items, recipes, loot, icons ·
`structures.js` villages/landmarks/dungeons · `render.js` mesher, shaders, sky, particles · `entities.js` creatures, bosses, projectiles ·
`postfx.js` shadows + post-processing · `ui.js` HUD and menus · `main.js` player, combat, survival, saving, main loop. `lib/three.min.js` is Three.js r147 (MIT).

Run `python3 tools/build_single.py` to rebuild the one-file `Blockhollow.html`.
