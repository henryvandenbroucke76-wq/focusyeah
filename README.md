# Blockhollow RPG

A Minecraft-style fantasy RPG that runs in the browser (Three.js, no build step).
Open `index.html` directly, or run `python3 -m http.server` and visit http://localhost:8000.

## What's in it
- 160×160 voxel world, 4 biomes: Verdant Plains, Sunscorch Desert, Crystal Highlands, Ashlands (lava)
- 4 themed villages (farm + windmill, fishing + pier/boat, desert oasis, highland mining) with houses, markets, fountains, chests, roads between them
- Landmarks with lore tablets and loot: Kneeling King statue, Sundered Blade, Graveyard, Wrecked Wagon, Old Mine, Ruins of Veale Hold, Lookout Post, Cinder Keep (lava fortress), 4 camps
- "DISCOVERED" banner when you enter a site, compass list, minimap
- Biome mobs (zombie / husk / crystal golem / lava imp), night spawns, day/night cycle
- Mine and place blocks, loot chests, bread/potions, weapon power from iron

## Controls
WASD move · Space jump · Shift sprint · mouse look · LMB mine/attack · RMB place/open chest/read tablet ·
1–9 or wheel select block · F bread · Q potion · C compass · G explorer mode (2× speed, mobs ignore you)

`lib/three.min.js` is Three.js r147 (MIT, see `lib/THREE_LICENSE`).
