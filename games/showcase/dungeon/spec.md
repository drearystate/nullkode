# Vault of Embers: visual specification and asset list

Written before implementation from `showcase/references/dungeon.png` (1672×941, AI-generated).

## 1. What the reference shows

| Aspect | Reading of the reference | Target in the game |
|---|---|---|
| Camera | High three-quarter "isometric-ish" view. The room's far corner sits at the top centre: the **west wall** rises up and to the left, the **north (vault) wall** falls gently to the right. Floor lines run at roughly +25° and −25°, which puts the yaw near 45° and the pitch near 35–40°. There is slight perspective, so the field of view is narrow. | Custom follow rig with yaw 45° and pitch 38°, a 28° vertical FOV and about 27 m distance. Roughly 24 m of floor fits across the frame. The hero sits slightly left of and below centre, and the camera looks ahead toward the vault. |
| Framing | Hero at about 55% x / 42% y. The vault is up and to the right of the hero, the mage to the left on the bridge bank, and the skeletons to the right. | Same arrangement. The play area runs from the start (south of the channel) over the bridge to the vault (north). |
| Scale | Knight ≈ 140 px tall ≈ 2.5 m. Floor slabs ≈ 1–1.5 m. Walls ≈ 2 knight heights. | KayKit units as shipped: knight 2.5 m, 2 m floor tiles (slabs about 1 m), 4 m wall modules stacked to 8 m on the far walls. |
| Palette | Cool blue-grey slate stone (#3b4152 to #5a6273), navy shadows (#141826), warm torch orange (#ffb050 / #ff7a2a), teal water (#1f7f8c), accents of red banners, a blue knight and mage, a gold-trimmed chest and bone-ivory skeletons. | The KayKit dungeon palette texture is recoloured once at load: neutral greys move toward slate blue and the warm woods are kept. The hemisphere fill is cool and the point lights are warm. |
| Lighting | Dark ambient. Warm pools under 8–10 wall torches, strongest around the vault. Soft shadows with clear contact darkening under the characters. Faint glow halos and a vignette. | Hemisphere (cool) plus a weak warm-neutral key from the north-west that casts the only shadow map. Up to 4 pooled warm point lights follow the camera focus. Every torch also gets an emissive flame, an additive glow sprite and additive "light pool" decals on the wall and floor, which fake the light falloff. A CSS vignette finishes the grade. |
| Layers | **Foreground:** dark, low stone blocks, crates, a wooden rail and torch posts along the bottom and right edges, plus a hanging cage on a chain. **Middle:** the slate floor and the teal water channel running from upper-left to lower-right, crossed by a stone bridge with four posts. **Background:** tall walls with arches, a portcullis, pilasters, banners and the vault alcove. | Near walls (south and east) are low 2 m parapets of foundation blocks so they frame the view without hiding play. Far walls (north and west) are full height. The environment continues past every frame edge. |
| Detail distribution | Grouped props: crates and barrels in the far corner and on the west bank, crates, barrels and a weapon rack on the east side, torches in pairs beside arches, banners flanking the vault. The combat floor stays clear. | Same grouping, with fixed hand-placed coordinates in `src/level.js` (no random scatter). Small variation (broken tiles, rotations) comes from a seeded RNG. |
| HUD | Three red hearts top-left (~40 px). Minimap top-right (~190×170, dark slate frame) with "Floor 03". An objective pill under it ("◇ Find the vault"). A bottom-centre ability bar of 4 square slots (~64 px) with sword, magic bolt, shield and potion, each with a number badge 1–4. | Built with `NK.ui.h` DOM in one style system: slate panels, a 2 px cool border and Kenney Future numerals. Icons are Kenney board-game-icons silhouettes tinted with CSS masks (steel sword, cyan bolt, blue shield, red potion). The minimap is drawn live on a canvas. Cooldowns sweep over the slots. |

## 2. Asset mapping (all CC0: KayKit and Kenney)

| Reference element | Library asset(s) | Notes |
|---|---|---|
| Stone floor slabs | `kaykit/dungeon-pack/floor-tile-small` (+ `-broken-a/-b`, `floor-tile-small-decorated`) | 2 m grid, instanced, seeded variation |
| Tall far walls, pilasters | `wall`, `wall-pillar`, `wall-half` | 2 tiers (8 m) on the far walls |
| Portcullis arch | `wall-gated` | West wall |
| Vault alcove arch | `wall-doorway-sides` (deep arched passage) + `wall` back + `floor-foundation-*` dais steps | No arch-only piece exists; the deep doorway gives the recess |
| Vault chest | `chest-large` (wood with gold bands; the lid `chest_large_lid` is animated) | Focal point; gold `coin-stack-*` inside the alcove |
| Wall torches | `torch-mounted` + custom low-poly flame and glow | Pack torches ship unlit |
| Banners | `banner-shield-red` (vault), `banner-thin-red` (west wall) | No fleur-de-lis in the pack; the shield crest is used instead |
| Crates and barrels | `crates-stacked`, `box-large`, `box-small`, `barrel-large`, `barrel-small`, `barrel-small-stack`, `keg` | Corner groups |
| Water channel | Custom flat-shaded animated plane; sides from `floor-foundation-front`; curbs from scaled foundation blocks | No water piece in KayKit dungeon |
| Bridge posts | `column` | 4 posts plus curb posts |
| Weapon rack | `shelf-large` crossbar + `post` uprights + `kaykit/fantasy-weapons-bits/spear-a`, `halberd` | Assembled modularly |
| Hanging cage | `kaykit/mixed-bag-1/chain-hanging-a` + `kaykit/halloween-bits/lantern-hanging` | No cage exists; a hanging iron lantern on a chain is the closest match |
| Foreground blocks | `floor-foundation-allsides`, `floor-foundation-corner`, `wall-half` | Dark parapet framing |
| Knight | `kaykit/adventurers/characters/knight` + `sword-1handed` + `shield-badge-color` | Red palette swatches recoloured to royal blue to match the reference |
| Mage | `kaykit/adventurers/characters/mage` with `textures/mage-texture-alt-a` (blue) + `staff` | KayKit mage wears a pointed hat, not a hood |
| Skeleton warrior | `kaykit/skeletons/characters/skeleton-warrior` + `skeleton-blade` + `skeleton-shield-small-a` | |
| Skeleton archer | `kaykit/skeletons/characters/skeleton-minion` + `kaykit/adventurers/bow-with-string` + `skeleton-arrow` (projectile) | |
| Animations (rig-medium) | `kaykit/skeletons/animations/rig-medium/rig-medium-general`, `-movement-basic`, `kaykit/character-animations/animations/rig-medium/rig-medium-combat-melee`, `-combat-ranged` | Shared by every character |
| HUD icons | `kenney/board-game-icons/double/{suit-hearts, sword, exploding, shield, flask-full, flask-empty, lock-closed}` | Tinted by CSS mask |
| Touch controls | Kit art (`kenney/mobile-controls/*`) + board-game-icons silhouettes | Stick left; attack, bolt and block right; potion on the bar |
| Audio | `kenney/foley-sounds/swords/*`, `kenney/new-platformer-pack/sounds/sfx-magic`, `kenney/impact-sounds/impact-plate-heavy-000`, `kenney/rpg-audio/*`, `kenney/music-loops/loops/infinite-descent`, `kenney/music-jingles/...` | |

## 3. Gameplay in this area (one room, polished)

Start south of the channel. Cross the bridge with the mage following. Two skeletons (a sword-and-shield warrior and an archer) guard the vault on the north side. Every enemy attack is telegraphed with a red floor marker (warrior: a 0.55 s arc; archer: a 0.8 s aim line). The knight swings (1), orders a magic bolt from the mage (2), holds the shield to block from the front (3) and drinks a potion to heal one heart (4). Reaching the vault while the guardians stand only reveals that it is sealed. Defeating both opens it, and walking up to the chest completes the objective. Losing all hearts ends the run.
