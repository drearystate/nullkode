# Engine card: 3D kit (three.js 0.186.1 + Rapier 0.21 + nk-game 1.0.0)

Plain scripts (no imports). Globals: `THREE` (+ `THREE.GLTFLoader`, `THREE.SkeletonUtils`…), `RAPIER`, `NK` (runtime), `NK3D` (kit). Never edit index.html, never create a renderer, loop or loader.

## Files
```
game.json          {"id","title","kit":"three-3d@1.0.0","files":[...]}   load order = files order
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
