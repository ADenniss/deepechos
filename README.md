# Deep Echoes 2D

Deep Echoes 2D is a turn-based cave crawler where you collect crystals, manage hunger, harvest materials, craft supplies, improve armor, and evade lurking monsters. Carried food is eaten automatically when hunger falls to 80 or below.

## Larger cave engine

The game now runs on a purpose-built modern Canvas engine with a smooth following camera and visible-tile rendering. Every map is 84×56 tiles, with ten connected chambers and broad tunnel networks, while the 900×600 view follows the explorer through the world. A live minimap in the lower-right corner marks cave walls, breakable resources, crystals, monsters, the exit, the player, and the current camera area.

## Walkable home cave and cave gate

Every run begins inside a much larger walkable Home Cave with finished wood flooring and dedicated sleeping, storage, crafting, forge, living, resident, and cave-gate areas. Walk with WASD, face an object or person, and press E to interact.

- **Bed:** Restores health, hunger, and upgraded armor.
- **Storage chests:** Store or withdraw wood blocks and food in groups of five. Each chest adds 20 storage spaces.
- **Crafting bench:** Builds expedition supplies and home furniture.
- **Forge:** Installs equipment and upgrades armor.
- **Main Cave Gate:** Opens the list of all 20 cave passages.

## Settlers, conversations, and missions

Five named settlers now live around the Home Cave. Speak to them with E to hear their dialogue, accept a repeatable mission, check progress, and claim rewards. Press J anywhere to open the mission journal.

- **Mira, Cartographer:** Rewards exploring new cave tiles.
- **Bram, Stonewright:** Rewards breaking resource blocks.
- **Ilyra, Cave Gardener:** Rewards gathering food.
- **Kato, Lantern Guard:** Rewards defeating monsters.
- **Orrin, Echo Scholar:** Rewards collecting crystals.

Each completed mission raises its next tier, grants useful resources or crafted supplies, and adds one renown. The HUD shows active missions and calls out rewards that are ready to claim.

The home starts with a bed, one chest, crafting bench, forge, two crystal lamps, five residents, and plank flooring. Crafting additional lamps, chests, a table, four chairs, a rug, and display shelves makes those pieces appear in furnishing slots around the room. Crystal lamps also illuminate their surrounding area.

Completing a cave increases the descent level and returns you home. If health or hunger runs out, you also wake at home without losing gathered materials.

## Harvesting and crafting

- Press E to break the resource block or crush the egg directly in front of you. Breaking and crushing give nearby monsters a turn.
- Nine breakable block types now appear: rubble gives wood, ore gives shards, ancient roots give extra wood, geodes give three shards, and fossil blocks may contain preserved food. Emberstone can hold burst energy, glowcap blocks provide food and wood, ancient metal provides both building material and shards, and sun amber preserves food.
- Wood bundles are scattered through every cave and are especially common in Verdant, Fungal, Living, Nest, and Mine caves.
- At the Home Crafting Bench, wood and crystal shards can be turned into armor plates, repair kits, and burst cells.
- **Smoke Bomb:** Makes every monster lose track of you for 15 steps.
- **Glow Flask:** Greatly increases lantern range for 35 steps.
- **Rescue Beacon:** Automatically revives you with two hearts and emergency smoke cover.
- **Mushroom Stew:** Uses two food and one wood to restore 50 hunger and one heart.
- **Reinforced Pick:** Permanently doubles rewards from every breakable resource block.
- **Echo Compass:** Adds an on-screen arrow pointing to the nearest crystal, then the exit.
- **Healing Tonic:** Restores two hearts immediately.
- **Sonic Charge:** Defeats ordinary monsters within seven tiles.
- **Field Camp:** Restores hunger, armor, and one heart underground.
- **Recall Rope:** Returns you home safely without abandoning gathered supplies.
- **Mining Charge:** Harvests every resource block within two tiles.
- **Prospector Charm:** Sometimes adds an extra reward when breaking a block.
- The bench can also build crystal lamps, storage chests, cavewood tables and chairs, an echo rug, and display shelves.
- The expanded furnishing catalog adds a glow garden, map table, and echo monument.
- Armor plates are consumed at the forge to unlock up to three rechargeable armor points.
- Repair kits restore all armor during a cave run.
- A burst cell is consumed automatically to add 3 tiles of range to the next lantern burst.

## Expanded forge

- **Pulse Lance:** Increases lantern burst range and reaches distant wisps.
- **Crystal Blade:** Allows an adjacent attack with F.
- **Heart Vessel:** Adds one permanent health point, up to six.
- **Swift Boots:** Improves normal walking and sprint speed.
- **Lantern Lens:** Increases the visible area around the player.
- **Reinforced Pack:** Doubles every food pickup.
- **Armor Upgrade:** Uses crafted armor plates and shards to add rechargeable armor points.

## Movement and hunger

- Move with WASD or the arrow keys.
- Hold Shift while moving to sprint at twice the normal movement speed.
- Normal walking consumes 1 hunger after every 26 successful steps.
- Sprinting consumes 1 hunger after every 13 successful steps.
- Walking into a wall does not count as a step or consume hunger.

The explorer now starts with six hearts and five food. Caves contain more food, fewer monsters, shorter enemy sight ranges, longer damage recovery, more hiding moss, and generous completion bonuses. Healing springs, treasure chests, and echo shrines create useful discoveries between major objectives.

## Monsters, eggs, and hiding

- Caves now contain crawlers, stalkers, wisps, armored cave beetles, and fluttering cave moths.
- The Nest contains two large broodmothers and ten glowing eggs. An egg hatches into a real baby monster when its visible timer runs out.
- Crush an egg by stepping onto it or by facing it and pressing E. Each crushed egg gives one shard.
- Blue hiding moss appears throughout the caves. While standing in it, monsters stop tracking you and the HUD displays **HIDDEN**.
- Broodmothers cannot be defeated by ordinary weapons, so hiding in blue moss is the safe way to let them pass.
- Broodmothers patrol in real time even while the player stands still. They pause at home and while a menu is open.
- Beetles and crawlers move only every other player turn, and damage has a short recovery window.
- Most enemies pause after moving, detection ranges are short, damage recovery lasts longer, and Nest eggs take longer to hatch.

## Cave types

The four original caves—Basalt, Frost, Ember, and Verdant—remain in the rotation. Sixteen mechanically distinct caves have been added:

- **Flooded Grotto:** Water slows walking and sprinting.
- **Crystal Cathedral:** Lantern bursts reach 3 tiles farther.
- **Fungal Hollow:** Mushrooms contain food or hunger-draining spores.
- **Magma Veins:** Lava damages the lantern once before cooling.
- **Frozen Depths:** Ice slides the player forward.
- **Echo Labyrinth:** Visibility is reduced and sprinting attracts monsters from farther away.
- **Ancient Mine:** Rails speed movement and supply crates contain food and shards.
- **Living Cavern:** New walls grow every 18 successful steps without making objectives unreachable.
- **Void Rift:** A pair of portals teleports the player across the cave.
- **The Nest:** Glowing eggs hatch into crawlers, beetles, or moths while two broodmothers hunt between safe hiding patches.
- **Geode Garden:** Break glowing geode blocks for extra crystal shards.
- **Sunken Vault:** Follow fast mine rails, open supply caches, and harvest ore blocks.
- **Glowstone Reef:** Stand in luminous pools to expand lantern visibility.
- **Bone Ossuary:** Collect bone relics and break fossil blocks that may preserve food.
- **Storm Cavern:** Dodge unstable lightning sparks that discharge after one strike.
- **Rootbound Burrow:** Harvest thick ancient roots for large amounts of building wood.

See [CAVE_IDEAS.md](CAVE_IDEAS.md) for expanded concepts for future cave types.

To test locally, run:

```sh
python3 -m http.server --bind 0.0.0.0 8007
```

Then open http://localhost:8007.
