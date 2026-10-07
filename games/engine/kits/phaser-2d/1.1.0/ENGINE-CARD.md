# Engine card: 2D kit (Phaser 4.2.1 + nk-game 1.1.0)

Plain scripts (no imports, no build step). Globals: `Phaser`, `NK` (runtime), `NK2D` (kit). Never edit index.html; never `new Phaser.Game`.

## Files
```
game.json          {"id","title","kit":"phaser-2d@1.1.0","files":[...]}   load order = files order
assets.lock.json   written by the platform from the ids you use; never hand-edit
src/config.js      NK.config({...})
src/assets.js      NK.assets.define({...}) + NK2D.anims({...})
src/levels.js      NK.def("levels", {...})
src/entities/*.js  NK.def("Player", class extends Phaser.Physics.Arcade.Sprite {...})
src/scenes/game.js NK.scene("Game", class extends NK2D.Scene {...})
levels/*.json      optional Tiled maps (type "tilemap")
```
Add every new file to `game.json` (before the files that use it).

## Build-step order (one visible step at a time)
1 shell (config + empty Game) → 2 assets + backdrop → 3 level → 4 player + camera → 5 pickups + HUD → 6 enemies, hazards, lives, game over → 7 goal, more levels, win → 8 touch controls + polish. Each step must run on its own.

## Rules
- Kit scenes exist: Boot, Preload (loads the manifest), Menu, Pause, GameOver, NKHud. Register only "Game" unless asked.
- Flow: `NK.start()` play, `NK.pause()`/`NK.resume()`, `NK.gameOver({win, score})`, `NK.menu()`, next level: `NK.run.level++; NK.state.go("play")`. Esc/P/pad Start pause automatically; the game pauses when the tab hides.
- Gameplay in `fixedUpdate(dt)` (60 Hz, before physics). Don't override `update()`.
- Run state (score, lives, level, taken items) lives in `NK.run` (reset from `config.run` on each new game). It survives live edits, so never reset it in `create()`.
- Keep the player in `this.player` so live edits keep its position. `create(data)`: `data.__snapshot` is set on a live edit (skip intros then).
- `NK.use("Name")` inside methods, not at file top.
- Use `NK.rng` (seeded), `this.time.delayedCall` (no setTimeout), `NK.save` (no localStorage), no DOM.

## Config
```js
NK.config({ width: 1280, height: 720, background: "#c3e3ff", physics: "arcade" /* or "matter" */, gravity: 1800,
  pixelArt: false, orientation: "landscape", run: { score: 0, lives: 3, level: 1 },
  touch: { stick: "arrows" /* or "left" joystick */, buttons: [{ action: "jump", icon: "kenney/mobile-controls/icon-jump" }] },
  menu: { subtitle: "…", music: "music" } });
```
Touch icons and pads are the kit's short ids (`kenney/mobile-controls/icon-jump`, `icon-sword`, `icon-hand`, `icon-pause`, `button-circle`, `direction-left/right`, `joystick-circle-pad-a/nub-a`); the platform maps them to the library's `kenney/mobile-controls/sprites/…` files (kit.json `uiAssetIds`).
Settings: `NK.settings.get("reduceMotion")` is the player's Reduce motion toggle (settings panel). The kit then turns camera `shake`/`flash` into no-ops and freezes `NK2D.parallax`; skip your own screen flashes, big tweens and particle storms too.

## Assets (library ids only; check the asset search for ids, frames, tile sizes)
```js
NK.assets.define({
  tiles: "kenney/new-platformer-pack/spritesheet-tiles-default",   // atlas (+ tile grid from the catalog)
  chars: "kenney/new-platformer-pack/spritesheet-characters-default",
  coin: "kenney/new-platformer-pack/sfx-coin", music: "kenney/music-loops/flowing-rocks",
  level2: { url: "levels/level2.json", type: "tilemap" },          // a file of this game
});
NK2D.anims({ "hero-walk": { atlas: "chars", frames: ["character_green_walk_a", "character_green_walk_b"], fps: 10 },
             "hero-idle": { atlas: "chars", frames: ["character_green_idle"] } });
```
Frame names come from the catalog (`metrics.frameNames`). Key `"ui-click"` = menu click sound.

## Levels
ASCII → Tiled map at runtime (autotiles Kenney terrain sets):
```js
NK2D.asciiMap(this, "level1", { tileset: "tiles", rows: def.rows, legend: {
  "#": { auto: "terrain_grass" }, "=": { auto: "terrain_grass_cloud", oneWay: true },
  "X": { tile: "block_planks", solid: true }, "^": { tile: "spikes", layer: "hazards" }, "h": "bush",
  "P": { object: "player" }, "c": { object: "coin" }, "s": { object: "slime" }, "F": { object: "flag" } } });
const lvl = (this.lvl = NK2D.tilemap(this, "level1"));    // or a loaded Tiled key: NK2D.tilemap(this, "level2")
lvl.find("player")[0]   // {cx, cy, x, y, bottom, props}
lvl.spawn("coin", (o) => …); lvl.collide(spriteOrArray); lvl.layers.ground / .hazards; lvl.width / .height
```
Layers: `ground` (solid), `decor`, `hazards`; world + camera bounds set, bottom open (pits).

## Scene template
```js
NK.scene("Game", class extends NK2D.Scene {
  create(data) {
    const lvl = (this.lvl = NK2D.tilemap(this, "level" + NK.run.level));
    const s = lvl.find("player")[0];
    this.player = new (NK.use("Player"))(this, s.cx, s.bottom - 50);
    lvl.collide(this.player);
    NK2D.follow(this, this.player, { lerp: 0.15, deadzone: [160, 120] });
    this.hud = NK2D.hud(this).counter("coins", { texture: "tiles", frame: "hud_coin", value: NK.run.coins })
      .hearts("lives", { texture: "tiles", full: "hud_heart", empty: "hud_heart_empty", max: 3, value: NK.run.lives });
    if (!data.__snapshot) this.hud.flash("Level " + NK.run.level);
    NK.audio.music("music");
  }
  fixedUpdate(dt) { this.player.fixedUpdate(dt); }
});
```

## Input / audio / saves / platform
- `NK.input.axis("moveX")` (-1..1), `down("jump")`, `pressed("jump")` (one step), actions: left right up down jump action run pause fire; `NK.input.bind("dash", ["KeyL", "pad:4", "touch:dash"])` + a touch button `{action:"dash", icon:…}`.
- `NK.audio.play("coin", { volume, rate })`, `NK.audio.music("music")`; unlock on first tap is automatic.
- `NK.save.store("main", obj)`, `NK.save.load("main", defaults)`; best score is kept by `NK.gameOver`.
- `NK.platform.achievements.unlock(id, title)`, `NK.platform.leaderboard.submit(board, score)` (stubs now, accounts later).
- Backdrop: `NK2D.parallax(this, [{ texture, frame, y, height, factor, scale }])`. Text: `NK2D.text(this, x, y, str, { size })`.
