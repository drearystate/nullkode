# Character spec — how to build any character for the 3D kit (3D, 2.5D side-on, top-down)

You never model, draw or sculpt a character. You write a **spec** (JSON). The kit (`NK3D.chars`, three-3d ≥ 1.4.0)
builds it on a rigged CC0 body, fits every part to that body, puts library items in its fists and plays
motion-captured moves. Read `CHARACTER-RULES.md` for the design rules (silhouette, proportions, originality).

```js
await NK3D.chars.loadBase("medium");
await NK3D.chars.loadItems(["kaykit/fantasy-weapons-bits/sword-c", "kaykit/fantasy-weapons-bits/shield-a"]);
const hero = NK3D.chars.build(SPEC);
this.player = NK3D.character(this, { actor: hero, speed: 3.2, runSpeed: 6, jump: 7 });   // controller plays its moves
this.player.act("attack");            // one-off move; returns to idle/walk/run by itself
this.player.act("die", { hold: true }); // keeps the last pose
```

## 1. The spec

```json
{
  "name": "Bram",
  "base": "medium",
  "headScale": 0.72,
  "colors": { "top": "#6b7b8c", "bottom": "#3a3f48", "feet": "#2d2f36", "hands": "#5b636e", "head": "#d9a882", "face": "#d9a882" },
  "parts": [
    { "type": "helmet", "color": "#9aa6b2", "plume": "#c0392b" },
    { "type": "eyes", "color": "#1a1a1a" },
    { "type": "pauldrons", "color": "#9aa6b2" },
    { "type": "cape", "color": "#8e2020", "length": 0.5 },
    { "type": "belt", "color": "#3b2a1c", "buckle": "#d4a017" }
  ],
  "held": { "right": { "item": "kaykit/fantasy-weapons-bits/sword-c" }, "left": { "item": "kaykit/fantasy-weapons-bits/shield-a" } },
  "moves": { "idle": "Idle (great sword)" }
}
```

| Field | Meaning |
|---|---|
| `base` | Body. `medium` = 1.58 m male-build body, `female` = 1.55 m female-build body (both CC0, same rig and moves). Specs work on either. |
| `headScale` | 0.65–0.8 for heroes (0.7 reads best at game zoom), 1.0 = chibi. Parts on the head scale with it. |
| `colors` | Paints the body's **slots**: `top` (torso, arms), `bottom` (hips, legs), `feet`, `hands`, `head`, `face` (front of the head). Skin tones go on `head`/`face`/`hands` for bare skin. |
| `parts` | Ready-made parts and composed shapes (sections 2–3). Order does not matter. |
| `held.right` / `held.left` | A library item id (section 4). The character's own right/left. |
| `moves` | Optional: replace the clip used for a move role (section 5). |

## 2. Ready-made parts

Each is fitted to anchors the kit **measures on the body** (head centre and radius, face front, waist width/depth,
back depth, shoulders, palms), so it always sits on the surface, never floating or buried.

| type | options | notes |
|---|---|---|
| `hood` | `color`, `shade` (face opening, default dark), `tip`: `"droop"`/`"none"`, `ember` (glowing tip colour) | Recolours the head itself as the hood; the face becomes the shadowed opening. Add `eyes` with `glow`. |
| `face` | `eyes`: `dot` · `round` · `oval` · `cute` · `sleepy` · `narrow` · `angry` · `glow`; `eyeColor`, `eyeSize` (0.12), `lashes` (true); `brows`: `normal` · `thick` · `angry` · `worried` · `raised` · `none`, `browColor`; `nose`: `button` · `round` · `pointy` · `long` · `none`, `noseColor`; `mouth`: `smile` · `grin` · `line` · `frown` · `open` · `none`, `mouthColor` | Every feature is placed on the head's real surface and turned to face along it. Give every non-hooded character a face. Personality lives here: `angry` eyes + `thick` brows = brute; `cute` + `lashes` + `smile` = friendly; `sleepy` + `worried` = old/weary; `glow` = hooded, undead, spirit. |
| `eyes` | `color`, `glow`, `size` | Short form of `face` with only eyes. |
| `hair` | `color`, `style`: `short` · `spiky` · `long` · `bob` · `ponytail` · `bun` · `pigtails` · `braid`; `tie` (band colour), `hairline` (0.32; lower = more forehead covered), `thickness`, `fringe` (true = bangs) | Built from the head's own scalp, so it hugs any head. |
| `wizardHat` | `color`, `band` | |
| `helmet` | `color`, `plume` | Dome + nose guard. |
| `beard` | `color`, `style`: `goatee` · `full` · `long`, `moustache` (false = none) | Tufts follow the jaw on the face surface; the moustache is a drooping arch. |
| `skirt` | `color`, `length` (m, 0.18–0.4), `flare` (1.45) | Panels: front/back ride the hips, sides ride each thigh, so legs never pass through. Use with `bottom` = skin or tights colour. |
| `crown` | — | Library model on the head (load `quaternius/ultimate-rpg-items-pack/crown`). |
| `collar` | `color`, `tails` (false = no scarf tails) | Scarf ring at the neck with two cloth tails. |
| `cape` | `color`, `length` (m, 0.3–0.55), `width` (1) | Real cloth: hangs from the shoulders, collides with back, legs, arms and ground. |
| `belt` | `color`, `buckle` | Fitted to the waist's real width and depth. |
| `pouch` | `color` | On the hip. |
| `pauldrons` | `color` | Shoulder plates; they ride the upper arms. |

## 3. Composing new parts: place and merge shapes

Anything not in the table is **composed from shapes placed on anchors**. This is how you build quivers, horns,
backpacks, antennae, masks, spikes, gems, tails, ears, visors, epaulettes, sashes, armour plates.

```json
{ "type": "shape", "shape": "cone", "at": "head.top", "offset": [0.35, 0.2, 0], "size": [0.25, 0.7, 0.25], "dir": [0.5, 1, 0], "color": "#e8e0c8", "mirror": true }
```

| key | meaning |
|---|---|
| `shape` | `sphere` · `box` · `cone` · `cylinder` · `tube` (open) · `torus` · `dome` (half sphere) · `wedge` (3-sided prism) · `gem` (octahedron) |
| `at` | Anchor (list below). The shape rides that anchor's bone: it moves, turns and scales with the body. |
| `offset` | `[x, y, z]` from the anchor. **x = the character's left, y = up, z = forward.** |
| `size` | Number or `[x, y, z]`. A unit shape is 1 across, so size is its full width/height/depth. |
| `dir` | Which way the shape's height (its y) points: `"up"`, `"down"`, `"forward"`, `"back"`, `"left"`, `"right"` or a vector. Cones point their tip along `dir`. |
| `color`, `glow` | Colour; `glow: true` for lights, gems, eyes, magic. |
| `mirror` | `true` also places the mirror image on the other side (ears, horns, pauldrons, side plates). |
| `double` | `true` for thin shells seen from inside (open hoods, sails). |

**Units.** Head anchors (`head.*`) measure in **head radii** (1 = from the head's centre to its surface), so a
head part keeps its fit whatever `headScale` is. Every other anchor measures in **body units u = height / 16**
(≈ 0.1 m on `medium`).

**Anchors**

| Head (units = head radius) | Body (units = u) | Limbs (each also `.right`) |
|---|---|---|
| `head.center` `head.top` `head.back` `head.front` (eye line, on the face) `head.left` `head.right` `head.chin` | `neck` `chest.front` `back` (between the shoulder blades, on the surface) `waist.front` `waist.back` `waist.left` `waist.right` `hips` | `shoulder.left` `upperarm.left` `elbow.left` `forearm.left` `hand.left` (palm) `thigh.left` `knee.left` `shin.left` `foot.left` |

**Merging rules** (how shapes become one believable part):
1. **Overlap, don't touch.** Sink every shape at least 20–30 % into the surface or into the shape it joins
   (offset toward the body). Touching shapes look glued on; overlapping ones read as one piece.
2. **Build from the anchor outward:** the base shape on the anchor first, then each next shape offset from the
   same anchor so it overlaps the previous one (a horn = cone at `head.top` + smaller cone further along `dir`).
3. **One colour per part, two at most** (base + trim). Trims are thin shapes laid over the base (a torus band, a
   flattened box), offset 0.02–0.05 outward so they sit on top.
4. **Silhouette first:** a part must change the outline seen from the side (2.5D) or from above (top-down).
   Small details inside the outline are wasted at game zoom.
5. **Ride the right bone:** things that swing with the arm go on arm anchors, things that bob with the head on
   head anchors, backpacks/quivers on `back`, sashes/tassets on `waist.*`. Never put an arm part on the torso.
6. **Mirror symmetric parts** (`mirror: true`) instead of writing both sides.
7. **Keep the face clear:** nothing on `head.front` but eyes, masks, visors or beards.
8. **Budget:** at most ~12 shapes per character; enemies 4–8.

Worked examples:
```json
{ "type": "shape", "shape": "cylinder", "at": "back", "offset": [0.7, 0.4, -0.9], "size": [1.1, 4.2, 1.1], "dir": [0.35, 1, 0], "color": "#6b4a2b" }
```
A quiver: a cylinder on the back, tilted across the shoulder (`dir` leans toward the character's left), sunk 0.9 u
into the back so it overlaps. Arrow fletching = a cone further along the same `dir`.

```json
{ "type": "shape", "shape": "cone", "at": "head.top", "offset": [0.45, -0.05, 0], "size": [0.3, 0.9, 0.3], "dir": [0.7, 0.8, 0], "color": "#e8e0c8", "mirror": true }
```
Two horns, mirrored. `offset` sinks them into the scalp (`y -0.05`), `dir` angles them out and up.

```json
{ "type": "shape", "shape": "box", "at": "back", "offset": [0, -0.6, -1.2], "size": [2.4, 2.8, 1.4], "color": "#7a5a3a" },
{ "type": "shape", "shape": "box", "at": "back", "offset": [0, 0.4, -1.8], "size": [2.5, 0.5, 1.5], "color": "#5a3e26" }
```
A backpack plus its flap: the flap overlaps the top of the pack.

## 4. Held items

Items are CC0 library models. The kit grips them **through the closed fist**: the handle runs across the palm on
the thumb side, the crossguard lines up with the forearm, shields strap along the forearm facing out, bows hold
the grip with the string toward the wrist. You only name the item.

| Kind | Library ids (`kaykit/fantasy-weapons-bits/…`) |
|---|---|
| Swords | `sword-a` … `sword-g` |
| Daggers | `dagger-a` `dagger-b` `dagger-c` |
| Axes / hammers | `axe-a` … `axe-d`, `hammer-a` … `hammer-d` |
| Staffs / wands | `staff-a` … `staff-d`, `wand-a` `wand-b` |
| Polearms | `spear-a` `spear-b` `halberd` `scythe` |
| Shields (left hand) | `shield-a` … `shield-d` |
| Bows (left hand) | `bow-a-with-string` `bow-b-with-string` `bow-c-with-string` |

`{ "item": "…", "scale": 0.42 }` changes the size (0.42 suits `medium`). `gripY` moves the grip along the shaft
for poles. Load every item the game uses with `NK3D.chars.loadItems([...])` before `build`.

## 5. Moves

The controller plays `idle` `walk` `run` `jump` `fall` `land` by itself. Everything else is `act(role)`:

| Group | Roles |
|---|---|
| Moving | `idle` `walk` `run` `sprint` `backpedal` `slide` `roll` `dodgeLeft` `dodgeBack` `backflip` |
| Air / walls | `jump` `runJump` `fall` `land` `wallRun` `wallJump` `climb` `hang` `shimmy` `fly` `flyKick` |
| Fighting | `attack` `attack2` `jumpAttack` `slideAttack` `punch` `hook` `kick` `block` `cast` `cast2` |
| Hurt | `hurt` `hurtBig` `knockdown` `getUp` `die` `dieForward` `dieArmed` |

Moves play **in place**; the controller moves the body. Pick moves by what they do: an armed character uses
`attack`; an unarmed brawler uses `punch` / `hook` / `kick`; a caster uses `cast`.

## 6. Women, men, ages, builds
- **Female characters:** `base: "female"` plus hair, `face` with `lashes`, and whatever outfit fits the role:
  a warrior woman wears armour and trousers like anyone else; a skirt or dress is a choice, not a default.
- Male characters: `base: "medium"`; beards, stubble colours, heavier brows.
- Age: grey/white hair and brows, `sleepy` eyes, `long` nose for elders; `cute` eyes and a higher `headScale`
  (0.85–1.0) for children and young characters.
- Never make every woman look the same: vary hair style and colour, eyes, mouth, outfit colours and parts.

## 7. A whole cast

Write every character in the game as a spec in one `CAST` object: the hero, each enemy type, NPCs, bosses.
Variants are a new spec with different colours and one or two parts swapped (a "red goblin" is the goblin spec
with new colours, not a new design). Bosses: `headScale` lower (more imposing), one big silhouette part, a
glowing detail.

## 8. Checklist before you ship a spec
- Every `held` item is in `loadItems`.
- Parts change the silhouette from the side **and** from above.
- No shape floats: each one overlaps the body or another shape.
- Colours: `top` and `bottom` differ; the character stands out from the level's floor and walls.
- Every non-hooded character has a `face` (eyes, brows, nose, mouth) that matches its personality.
- Original design (see `CHARACTER-RULES.md`): never a copy of a known character.
