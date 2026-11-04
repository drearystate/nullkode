# Engine card: 3D kit 1.5.0 (three.js 0.186.1 + Rapier 0.21 + nk-game 1.5.0)

Plain scripts (no imports). Globals: `THREE` (+ `THREE.GLTFLoader`, `THREE.SkeletonUtils`…), `RAPIER`, `NK` (runtime), `NK3D` (kit). Never edit index.html, never create a renderer, loop or loader.

## Files
```
game.json          {"id","title","kit":"three-3d@1.5.0","files":[...]}   load order = files order
assets.lock.json   written by the platform from the ids you use; never hand-edit
src/config.js      NK.config({...})
src/assets.js      NK.assets.define({...})
src/level.js       NK.def("level", data) + NK.def("buildLevel", (scene) => {...})
src/entities/*.js  NK.def("Hero", (scene, pos) => …)
src/scenes/game.js NK.scene("Game", class extends NK3D.Scene {...})
src/scenes/menu.js optional 3D backdrop behind the menu
```
Add every new file to `game.json` (before the files that use it).

## Build-step order (one visible step at a time)
1 shell (config + ground + something moving) → 2 assets + level built from library models → 3 player character + camera → 4 collectibles, props, HUD, goal/win → 5 enemy, health, lose → 6 menu backdrop, music, touch controls, polish. Each step must run on its own.

## Rules
- Menus, pause, game over, settings and the HUD are HTML overlays from the kit. Flow: `NK.start()`, `NK.pause()`, `NK.resume()`, `NK.gameOver({win, score})`, `NK.menu()`.
- Gameplay in `fixedUpdate(dt)` (60 Hz, after the physics step); visuals in `update(dt)`.
- Run state in `NK.run` (reset from `config.run` per new game; survives live edits). Keep the player in `this.player` (live edits keep its position + camera).
- Add everything through the scene: `this.add(obj)`, `this.body(obj, opts)`, `this.onDispose(fn)`; listeners: `this.onDispose(NK.on("evt", fn))`. The scene is rebuilt on every live edit, so nothing may leak.
- Units: the assets' own (KayKit floor tile 4, character ≈ 2.5); place with catalog `metrics.bbox`.
- Use `NK.rng`, `NK.save`; no setTimeout, no DOM except `NK.ui`.

## Config
```js
NK.config({ physics: true, gravity: -25, background: 0x161a26, fog: [22, 55], exposure: 1.1, ambient: 0.9, sun: 1.6,
  camera: { mode: "third-person" /* or "top-down" (offset:[0,12,9]) */, distance: 8, pitch: 0.5, lookAtHeight: 2 },
  run: { score: 0, coins: 0, health: 5 }, orientation: "landscape",
  touch: { stick: "left", look: true, buttons: [{ action: "jump", icon: "kenney/mobile-controls/icon-jump" },
                                               { action: "action", icon: "kenney/mobile-controls/icon-sword" }] },
  menu: { subtitle: "…", music: "music" } });
```
Touch icons and pads are the kit's short ids (`kenney/mobile-controls/icon-jump`, `icon-sword`, `icon-hand`, `icon-pause`, `button-circle`, `joystick-circle-pad-a/nub-a`); the platform maps them to the library's `kenney/mobile-controls/sprites/…` files (kit.json `uiAssetIds`).
Settings: `NK.settings.get("reduceMotion")` is the player's Reduce motion toggle (settings panel): when it is on, no camera shake, flashes or fast camera swings.
Quality is picked per device and lowered automatically when fps stays low.

## Assets (library ids; GLB is meshopt/draco/KTX2-ready)
```js
NK.assets.define({ knight: "kaykit/adventurers/characters/knight",
  "anims-move": "kaykit/adventurers/animations/rig-medium-movementbasic",   // clips for the same rig
  wall: "kaykit/dungeon-pack/wall", coin: "kaykit/dungeon-pack/coin", "sfx-coin": "kenney/new-platformer-pack/sfx-coin" });
```
- `NK3D.model(key, { position:[x,y,z], rotationY, scale | height, shadows })` → a clone (skinned meshes handled).
- `NK3D.instances(scene, key, [[x,y,z,rotY,scale], …], { physics: "fixed" })` for floors/walls/many props.
- `NK3D.lod([[near, 0], [far, 40]])`, `NK3D.size(key)`, `NK3D.near(a, b, r)`.

## Physics (`this.body(object, opts)` → {body, collider, remove()})
`type: "fixed" | "dynamic" | "kinematic"`, `shape: "box" (default, from bounds) | "sphere" | "capsule" | "cylinder" | "convex" | "trimesh"`, `size: [x,y,z]`, `radius`, `mass`, `friction`, `restitution`, `sensor: true`, `onEnter(otherObject)`, `onExit`. Ray: `this.physics.raycast(origin, dir, max)`.

## Characters + camera
```js
this.player = NK3D.character(this, { model: "knight", clips: ["anims-move", "anims-general"],
  anims: { idle: "Idle_A", walk: "Walking_A", run: "Running_A", jump: "Jump_Start", fall: "Jump_Idle", land: "Jump_Land" },
  speed: 4.5, runSpeed: 8, jump: 10.5, position: [0, 0, 6] });          // reads input, camera-relative
const foe = NK3D.character(this, { model: "skeleton", clips: […], control: "none", speed: 2.2 });
this.add({ fixedUpdate: (dt) => foe.move(dt, dirX, dirZ, false, running) });   // AI drives it
hero.act("Throw", { once: true }); hero.act(null); hero.teleport([x, y, z]);
```
Animation names come from the catalog (`metrics.clips`); `NK3D.animator(obj, clips).play("run")` matches loosely. The camera rig is made for `this.player` from `config.camera` (drag / right stick / touch look).

## Spec characters (1.4.0) — use these for heroes, enemies and NPCs
Write each character as a JSON spec (`design/CHARACTER-SPEC.md`); never model one. `await NK3D.chars.loadBase("medium"); await NK3D.chars.loadItems([...ids]);`
`const hero = NK3D.chars.build(spec); this.player = NK3D.character(this, { actor: hero, speed: 3.2, runSpeed: 6, jump: 7 });`
`act("attack")` plays a one-off move and returns to the controller; `act("die", { hold: true })` keeps the pose. Roles: `NK3D.chars.MOVES`.

## Adventure worlds (1.5.0) — top-down / 2.5D adventures (genre card 3d-adventure)
World data = `src/world.js` (`NK.def("world", {...})`), written by the Studio from the world generator before the first step and checked to be finishable as drawn. It is listed first in game.json; NEVER edit, rewrite or delete it (edits are refused): build on `NK.use("world")`. Its items/counters are defined for you.
Load the set dresser's pack before the rooms: `await NK3D.props.load();` (the kit's own KayKit pack) — then every room is dressed: closed screens with dressed exits, trees/rocks by biome, model dungeon floors and walls with torches, banners and props, moss, light pools, light shafts.
```js
const rooms = NK3D.rooms(this, NK.use("world"), { tile: 1.5,
  onRoom: (room) => room.find("enemy").map((s, i) => NK3D.foe(this, { kind: "walker", actor: NK3D.chars.build(goblinSpec), position: [s.x, 0, s.z], rooms, delay: 0.25 + i * 0.12 })),
  build: { keeper: (ob) => npcObject3D } });           // optional looks for objects (keeper, money/shop …)
this.player = NK3D.hero(this, { actor: NK3D.chars.build(heroSpec), rooms, tools: { ranged: { kind: "orb", speed: 13, damage: 1 } } });
this.hud = NK3D.advHud(this, { rooms, toolName: (id) => names[id] || id });
const at = rooms.continue(); if (at) NK.progress.add("hearts", 99);
rooms.start(this.player, at && at.area, at && at.key);
fixedUpdate(dt) { if (rooms.fixedUpdate(this.player)) return; /* game logic */ }
```
- Without the pack, rooms fall back to built-in low-poly pieces coloured by biome (`NK3D.BIOMES`; override with `biomes:{forest:{leaf:"#…"}}`): walls, trees, rocks, worn paths to exits, torches, doors, gates, chests, keys, hearts, push block, switch, cave, crypt arch. No models needed. Camera framing is the kit's (`camera:{pitch, fit, maxDistance}`).
- Doors/gates/pickups/secrets/shops/puzzles/shutters/saves follow NK.progress exactly like NK2D.world. `room = rooms.current` {area, key, room, x0, z0, find(type) → [{type, x, z, tx, ty, position}], enemies}. Types: enemy, boss, keeper, money (shop on shop screens), block, switch, cave, dungeon.
- `rooms.bossDefeated()` (NK3D.boss calls it), `rooms.save()`, `rooms.continue()`, `rooms.mapData(area)`, `rooms.solidAt(x,z)`, `rooms.bounds(margin)`, `rooms.tile`.
- Events: `world:room(area,key,room)` · `world:blocked(type, req)` · `world:pickup(give)` · `world:secret(gives)` · `world:opened(type)` · `world:switch` · `world:push` · `world:shop` · `world:cleared` · `hero:swing` · `hero:tool` · `hero:no-weapon` · `hero:died` · `fighter:hurt(f)` · `fighter:blocked` · `fighter:immune` · `foe:died` · `boss:hp(v,max)` · `boss:staggered` · `boss:died` · `pickup(kind,n)`. Words for each come from the game (prompts ≤ 6 words, toasts for items).
- `NK3D.hero` = character without jump + sword (`action`) + roll (`dodge`) + block (`block`, needs a left-hand item) + sprint (`run`) + newest tool (`fire`, swap `toolNext`; archetypes ranged/stun/fire/bombs; passive tools like lift just open gates) + hearts (counter "hearts", halves). Moves follow the spec's held items (chars MOVESETS: shield · blade · unarmed). Weapon damage = the best owned item of the `weapon` chain ("blade"). `this.player.actor.setHeld(false)` until the blade is found.
- `NK3D.foe(this, {kind, actor | look, position, rooms, hp, damage, speed, scale, drops, delay, split(pos)})` kinds: walker · charger · shooter · tank · flier · splitter · trap (fliers/traps/slimes use `look`: any Object3D; default bat/blade trap).
- `NK3D.boss(this, {actor, position, rooms, hp, scale, weakTo:"ranged", patterns:["slam","charge","volley","summon"], summon(pos) → foe})`.
- Helpers: `NK3D.fighter(scene, who, {team, hp|counter, guard(from), canHurt(hit), onHurt, onDie})`, `NK3D.strike(scene, who, {reach, arc, damage})`, `NK3D.shots(scene).fire({from, angle, speed, damage, team, kind})`, `NK3D.drop(scene, pos, {money:.35, heart:.15})`, `NK3D.telegraph(scene, {at, radius | to, width, time, done})`, `NK3D.puff(scene, pos, {color, count})`, `NK3D.hitStop(s)`, `character.push(vx, vz, t)`.
- Timers: a list stepped in fixedUpdate (`later(s, fn)`), never setTimeout. Reference game: `work/adventure3d/game/` (Ember Hollow).

## Scene template
```js
NK.scene("Game", class extends NK3D.Scene {
  create() {
    NK.use("buildLevel")(this);
    this.player = NK.use("Hero")(this, [0, 0, 6]);
    const c = this.add(NK3D.model("coin", { position: [0, 1, 0], scale: 3 }));
    this.body(c, { type: "fixed", sensor: true, shape: "sphere", radius: 0.9, onEnter: (o) => { if (o === this.player.object) this.take(c); } });
    this.hud = NK.ui.hud([{ key: "coins", label: "Coins", value: NK.run.coins }]);
    this.onDispose(() => this.hud.remove());
    NK.audio.music("music");
  }
  take(c) { this.remove(c); NK.run.coins++; this.hud.set("coins", NK.run.coins); NK.audio.play("sfx-coin"); }
  update(dt) {}
});
```
Point lights ≤ 4. Positional sound: `NK3D.sound(this, obj, "steps", { loop: true })`.

## Also
`NK.input.axis("moveX"|"moveY")`, `pressed("jump"|"action")`, `NK.audio.play/music`, `NK.ui.toast`, `NK.save`, `NK.platform.achievements.unlock(id, title)`, `NK.platform.leaderboard.submit(board, score)` (stubs until accounts).
