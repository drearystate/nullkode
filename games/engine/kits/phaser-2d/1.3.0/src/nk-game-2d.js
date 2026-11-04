/*!
 * nk-game-2d 1.2.0 — NullKode 2D game kit on Phaser 4 (needs window.Phaser and window.NK).
 * Scenes: Boot/Preload/Menu/Pause/GameOver/NKHud are provided; the game registers "Game"
 * (and may override any of the others) with NK.scene(key, class extends NK2D.Scene {...}).
 */
(function (global) {
  "use strict";
  var NK = global.NK, Phaser = global.Phaser;
  if (!NK || !Phaser) throw new Error("nk-game-2d needs nk-game.js and phaser.min.js loaded first");
  var NK2D = (global.NK2D = { version: "1.3.0", phaser: Phaser.VERSION });
  // Reduce motion (player setting, 1.1.0): camera shake and flash do nothing while it is on.
  (function () {
    var Cam = Phaser.Cameras && Phaser.Cameras.Scene2D && Phaser.Cameras.Scene2D.Camera;
    if (!Cam || !Cam.prototype) return;
    ["shake", "flash"].forEach(function (m) {
      var orig = Cam.prototype[m];
      if (typeof orig !== "function") return;
      Cam.prototype[m] = function () { if (NK.settings && NK.settings.get("reduceMotion")) return this; return orig.apply(this, arguments); };
    });
  })();
  var KIT_SCENES = ["Boot", "Preload", "Menu", "Pause", "GameOver", "NKHud"];
  var game = null, bootSnapshot = null, cfg = null;
  var FONT = "'Kenney Future', system-ui, sans-serif";
  NK2D.font = FONT;

  // Kit font (CC0 Kenney Future) shipped next to this script.
  (function () {
    var cur = document.currentScript && document.currentScript.src;
    var base = cur ? cur.replace(/[^/]*$/, "") : "";
    if (!document.getElementById("nk2d-font")) {
      var st = document.createElement("style");
      st.id = "nk2d-font";
      st.textContent = "@font-face{font-family:'Kenney Future';src:url('" + base + "fonts/kenney-future.ttf') format('truetype');font-display:swap}";
      document.head.appendChild(st);
    }
  })();

  // ------------------------------------------------------------- base scene
  /**
   * Base class for every scene. Put gameplay in fixedUpdate(dt) (60 Hz, deterministic,
   * runs before physics). Keep the player sprite in this.player so live patches and
   * reloads keep its position (snapshot/restore).
   */
  class Scene extends Phaser.Scene {
    constructor(config) { super(config); }
    fixedUpdate() {}
    snapshot() {
      var s = {};
      if (this.player && this.player.active !== false) s.player = { x: this.player.x, y: this.player.y, flipX: !!this.player.flipX };
      var cam = this.cameras && this.cameras.main;
      if (cam) s.camera = { x: cam.scrollX, y: cam.scrollY };
      return s;
    }
    restore(s) {
      if (s.player && this.player) {
        this.player.setPosition(s.player.x, s.player.y);
        if (this.player.body && this.player.body.reset) this.player.body.reset(s.player.x, s.player.y);
        if (this.player.setFlipX) this.player.setFlipX(s.player.flipX);
      }
      if (s.camera && this.cameras) { this.cameras.main.scrollX = s.camera.x; this.cameras.main.scrollY = s.camera.y; }
    }
    /** Phaser-drawn button: this.button(x, y, "Play", () => ..., {width, color}). */
    button(x, y, label, onClick, o) { return NK2D.button(this, x, y, label, onClick, o); }
    get W() { return this.scale.width; }
    get H() { return this.scale.height; }
  }
  NK2D.Scene = Scene;

  function wrapScene(key, Cls) {
    if (!Cls) return null;
    var W = class extends Cls {
      constructor() { super({ key: key }); this.sys.settings.key = key; }
    };
    ["init", "preload"].forEach(function (m) {
      var orig = Cls.prototype[m];
      if (orig) W.prototype[m] = function () { try { return orig.apply(this, arguments); } catch (e) { NK.reportError(e, key + "." + m); } };
    });
    var origCreate = Cls.prototype.create;
    W.prototype.create = function (data) {
      var self = this;
      data = data || {};
      self.events.once("shutdown", function () { NK.emit("scene:shutdown", key, self); });
      if (KIT_SCENES.indexOf(key) < 0) installView(self);
      if (origCreate) { try { origCreate.call(self, data); } catch (e) { NK.reportError(e, key + ".create"); } }
      if (data.__snapshot) { try { self.restore(data.__snapshot); } catch (e) { NK.reportError(e, key + ".restore"); } }
      NK.emit("scene:created", key, self);
    };
    W.prototype.__nkFixed = function (dt) { if (this.fixedUpdate) { try { this.fixedUpdate(dt); } catch (e) { NK.reportError(e, key + ".fixedUpdate"); } } };
    var origUpdate = Cls.prototype.update;
    if (origUpdate) W.prototype.update = function (t, d) { try { origUpdate.call(this, t, d); } catch (e) { NK.reportError(e, key + ".update"); } };
    return W;
  }

  // ----------------------------------------------------------------- UI bits
  NK2D.text = function (scene, x, y, str, o) {
    o = o || {};
    var t = scene.add.text(x, y, str, {
      fontFamily: FONT, fontSize: (o.size || 28) + "px", color: o.color || "#ffffff",
      stroke: o.stroke || "#1b2033", strokeThickness: o.strokeThickness === undefined ? Math.max(3, Math.round((o.size || 28) / 6)) : o.strokeThickness,
      align: o.align || "center",
    });
    t.setOrigin(o.originX === undefined ? 0.5 : o.originX, o.originY === undefined ? 0.5 : o.originY);
    if (o.shadow !== false) t.setShadow(0, Math.max(2, Math.round((o.size || 28) / 10)), "rgba(0,0,0,.45)", 0, true, true);
    return t;
  };
  NK2D.button = function (scene, x, y, label, onClick, o) {
    o = o || {};
    var w = o.width || 260, hgt = o.height || 64, col = o.color === undefined ? 0x3e8ef7 : o.color, dark = o.shade === undefined ? Phaser.Display.Color.ValueToColor(col).darken(28).color : o.shade;
    var c = scene.add.container(x, y);
    var g = scene.add.graphics();
    var draw = function (pressed) {
      g.clear();
      g.fillStyle(dark, 1).fillRoundedRect(-w / 2, -hgt / 2 + 6, w, hgt, 14);
      g.fillStyle(col, 1).fillRoundedRect(-w / 2, -hgt / 2 + (pressed ? 4 : 0), w, hgt, 14);
      g.fillStyle(0xffffff, 0.16).fillRoundedRect(-w / 2 + 6, -hgt / 2 + 5 + (pressed ? 4 : 0), w - 12, hgt / 2 - 6, 10);
      t.y = pressed ? 4 : 0;
    };
    var t = NK2D.text(scene, 0, 0, label, { size: o.size || 26, strokeThickness: 0, shadow: false });
    c.add([g, t]);
    draw(false);
    c.setSize(w, hgt + 6);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", function () { draw(true); });
    c.on("pointerout", function () { draw(false); c.setScale(1); });
    c.on("pointerover", function () { c.setScale(1.04); });
    c.on("pointerup", function () { draw(false); NK.audio.play("ui-click"); if (onClick) onClick(); });
    c.label = t;
    return c;
  };
  /** Dark rounded panel behind menus. */
  NK2D.panel = function (scene, x, y, w, hgt) {
    var g = scene.add.graphics();
    g.fillStyle(0x12162a, 1).fillRoundedRect(x - w / 2, y - hgt / 2 + 8, w, hgt, 20);
    g.fillStyle(0x253049, 1).fillRoundedRect(x - w / 2, y - hgt / 2, w, hgt, 20);
    g.lineStyle(4, 0x3d4970, 1).strokeRoundedRect(x - w / 2, y - hgt / 2, w, hgt, 20);
    return g;
  };

  // --------------------------------------------------------------- assets
  NK2D.queueAssets = function (scene) {
    var list = Object.keys(NK.assets.manifest()).map(NK.assets.resolve);
    var tex = scene.textures, cache = scene.cache;
    list.forEach(function (r) {
      var u = r.urls;
      try {
        if (r.type === "audio" || r.type === "music" || r.type === "model" || r.type === "animation" || r.type === "font") return;
        if (r.type === "tilemap" || r.type === "json") {
          // Files the game ships (inlined in the page or sent by a live patch) come from memory.
          var mem = NK.fileText(r.opts.url);
          if (r.type === "tilemap") {
            if (mem !== null) { if (cache.tilemap.exists(r.key)) cache.tilemap.remove(r.key); cache.tilemap.add(r.key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: JSON.parse(mem) }); }
            else if (!cache.tilemap.exists(r.key)) scene.load.tilemapTiledJSON(r.key, u.json || u.tmj);
          }
          if (r.type === "json") {
            if (mem !== null) { if (cache.json.exists(r.key)) cache.json.remove(r.key); cache.json.add(r.key, JSON.parse(mem)); }
            else if (!cache.json.exists(r.key)) scene.load.json(r.key, u.json);
          }
          return;
        }
        if (tex.exists(r.key)) return;
        var img = u.png || u.webp || u.jpg || u.svg;
        if (r.type === "spritesheet" || (r.opts.as === "spritesheet" && r.grid)) scene.load.spritesheet(r.key, img, { frameWidth: (r.grid || r.opts.frame).frameWidth, frameHeight: (r.grid || r.opts.frame).frameHeight, spacing: (r.grid || {}).spacing || 0, margin: (r.grid || {}).margin || 0 });
        else if (r.type === "atlas" && u.xml) scene.load.atlasXML(r.key, img, u.xml);
        else if (r.type === "atlas" && u.json) scene.load.atlas(r.key, img, u.json);
        else if (u.svg && !u.png) scene.load.svg(r.key, u.svg, r.opts.svg);
        else scene.load.image(r.key, img);
      } catch (e) { NK.reportError(e, "asset " + r.key); }
    });
  };
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([document.fonts.load("28px 'Kenney Future'").catch(function () {}), new Promise(function (r) { setTimeout(r, 1500); })]);
  }
  /** Loads assets added to the manifest after boot (live patches). */
  NK2D.loadMissing = function (scene) {
    return new Promise(function (resolve) {
      NK2D.queueAssets(scene);
      var audio = NK.audio.loadAll();
      if (!scene.load.list.size && !scene.load.inflight.size) return audio.then(function () { NK2D.buildAnims(scene); resolve(); });
      scene.load.once("complete", function () { audio.then(function () { NK2D.buildAnims(scene); resolve(); }); });
      scene.load.start();
    });
  };

  // ------------------------------------------------------------ animations
  var animDefs = {}, builtSig = {};
  /**
   * NK2D.anims({ "hero-walk": {atlas:"chars", frames:["character_beige_walk_a","character_beige_walk_b"], fps:8},
   *              "hero-idle": {atlas:"chars", frames:["character_beige_idle"]} })
   * Frames may be names (atlas) or numbers (spritesheet). repeat defaults to -1 (loop).
   */
  NK2D.anims = function (defs) {
    Object.keys(defs).forEach(function (k) { animDefs[k] = defs[k]; });
    if (game) NK2D.buildAnims(game.scene.getScenes(true)[0]);
  };
  NK2D.buildAnims = function (scene) {
    if (!scene) return;
    var A = scene.anims;
    Object.keys(animDefs).forEach(function (k) {
      var d = animDefs[k];
      if (!scene.textures.exists(d.atlas || d.texture)) return;
      var sig = JSON.stringify(d);
      if (A.exists(k) && builtSig[k] === sig) return;
      if (A.exists(k)) A.remove(k);
      builtSig[k] = sig;
      var key = d.atlas || d.texture;
      A.create({ key: k, frames: d.frames.map(function (f) { return { key: key, frame: f }; }), frameRate: d.fps || 8, repeat: d.repeat === undefined ? (d.frames.length > 1 ? -1 : 0) : d.repeat, yoyo: !!d.yoyo });
    });
    // Library "animation" assets (numbered frames packed into a strip): one looping anim named after the key.
    NK.assets.byType(["spritesheet"]).forEach(function (r) {
      if (r.kind !== "animation" || !scene.textures.exists(r.key) || A.exists(r.key)) return;
      A.create({ key: r.key, frames: A.generateFrameNumbers(r.key), frameRate: (r.grid && r.grid.fps) || 10, repeat: -1 });
    });
    // Animations listed in the asset library (catalog "animations": {name: [frames]}).
    NK.assets.byType(["atlas", "spritesheet"]).forEach(function (r) {
      if (!r.animations || !scene.textures.exists(r.key)) return;
      Object.keys(r.animations).forEach(function (name) {
        var a = r.animations[name], k = r.key + ":" + name;
        if (A.exists(k)) return;
        var frames = Array.isArray(a) ? a : a.frames;
        A.create({ key: k, frames: frames.map(function (f) { return { key: r.key, frame: f }; }), frameRate: a.fps || 8, repeat: a.repeat === undefined ? -1 : a.repeat });
      });
    });
  };
  /** Groups atlas frames named like walk_a/walk_b or run_1/run_2 into animations "<atlas>:<base>". */
  NK2D.autoAnims = function (scene, atlas, o) {
    o = o || {};
    var names = scene.textures.get(atlas).getFrameNames().slice().sort();
    var groups = {};
    names.forEach(function (n) {
      var m = n.match(/^(.*?)[_-]?([a-z]|\d+)$/i);
      var base = m && m[1] && /[_-]([a-z]|\d+)$/i.test(n) ? m[1] : n;
      (groups[base] = groups[base] || []).push(n);
    });
    Object.keys(groups).forEach(function (base) {
      var k = atlas + ":" + base;
      if (scene.anims.exists(k)) return;
      scene.anims.create({ key: k, frames: groups[base].map(function (f) { return { key: atlas, frame: f }; }), frameRate: o.fps || 8, repeat: groups[base].length > 1 ? -1 : 0 });
    });
    return Object.keys(groups).map(function (b) { return atlas + ":" + b; });
  };

  // -------------------------------------------------------------- tilemaps
  function frameIndex(tex, name, tw, th, margin, spacing, cols) {
    var f = tex.has(name) ? tex.get(name) : null;
    if (!f) return -1;
    return Math.round((f.cutY - margin) / (th + spacing)) * cols + Math.round((f.cutX - margin) / (tw + spacing));
  }
  /**
   * Builds Tiled JSON from text rows so levels can be written as ASCII:
   * NK2D.asciiMap(scene, "level1", { tileset:"tiles", rows:[...], legend:{
   *   "#": {auto:"terrain_grass"},              // autotiled block/strip/column by neighbours
   *   "=": {auto:"terrain_stone_cloud", oneWay:true},
   *   "B": "block_coin",                         // a tile by atlas frame name
   *   "c": {object:"coin"}, "P": {object:"player"}, "~": {tile:"water", layer:"hazards"} } })
   * Layers: "ground" (solid), "decor", "hazards", plus an "objects" object layer.
   */
  NK2D.asciiMap = function (scene, key, def) {
    var tsKey = def.tileset;
    var tex = scene.textures.get(tsKey);
    var r = NK.assets.resolve(tsKey);
    var grid = def.grid || r.grid || { frameWidth: 64, frameHeight: 64, spacing: 0, margin: 0 };
    var tw = grid.frameWidth, th = grid.frameHeight, sp = grid.spacing || 0, mg = grid.margin || 0;
    var src = tex.getSourceImage();
    var cols = Math.floor((src.width - 2 * mg + sp) / (tw + sp)), rowsN = Math.floor((src.height - 2 * mg + sp) / (th + sp));
    var rows = def.rows, H = rows.length, W = Math.max.apply(null, rows.map(function (s) { return s.length; }));
    var legend = def.legend || {};
    var layers = { ground: [], decor: [], hazards: [] }, oneWayCells = [];
    Object.keys(layers).forEach(function (l) { for (var i = 0; i < W * H; i++) layers[l].push(0); });
    var objects = [], nextId = 1;
    var at = function (x, y) { return y >= 0 && y < H && x >= 0 && x < W ? rows[y][x] || " " : " "; };
    var gid = function (name) { var i = frameIndex(tex, name, tw, th, mg, sp, cols); if (i < 0) { NK.reportError(new Error('No tile "' + name + '" in ' + tsKey), "asciiMap " + key); return 0; } return i + 1; };
    var pick = function (names) { for (var i = 0; i < names.length; i++) if (tex.has(names[i])) return names[i]; return names[names.length - 1]; };
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var ch = at(x, y);
      if (ch === " " || ch === ".") continue;
      var L = legend[ch];
      if (L === undefined) continue;
      if (typeof L === "string") L = { tile: L };
      var idx = y * W + x;
      if (L.auto) {
        var same = function (dx, dy) { var c = at(x + dx, y + dy); return c === ch || (L.joins && L.joins.indexOf(c) >= 0); };
        var u = same(0, -1), d = same(0, 1), l = same(-1, 0), rr = same(1, 0), p = L.auto, name;
        if (!u && !d) name = l && rr ? p + "_horizontal_middle" : l ? p + "_horizontal_right" : rr ? p + "_horizontal_left" : p + "_block";
        else if (!l && !rr && !(L.auto.indexOf("cloud") >= 0)) name = !u ? p + "_vertical_top" : !d ? p + "_vertical_bottom" : p + "_vertical_middle";
        else if (!u) name = !l ? p + "_block_top_left" : !rr ? p + "_block_top_right" : p + "_block_top";
        else if (!d) name = !l ? p + "_block_bottom_left" : !rr ? p + "_block_bottom_right" : p + "_block_bottom";
        else name = !l ? p + "_block_left" : !rr ? p + "_block_right" : p + "_block_center";
        if (p.indexOf("cloud") >= 0) name = l && rr ? p + "_middle" : l ? p + "_right" : rr ? p + "_left" : p;
        layers[L.layer || "ground"][idx] = gid(pick([name, p + "_block", p]));
        if (L.oneWay) oneWayCells.push(idx);
      } else if (L.tile) {
        layers[L.layer || (L.solid ? "ground" : "decor")][idx] = gid(L.tile);
        if (L.oneWay) oneWayCells.push(idx);
      }
      if (L.object) {
        objects.push({ id: nextId++, name: L.name || "", type: L.object, x: x * tw, y: y * th, width: tw, height: th, rotation: 0, visible: true, properties: Object.keys(L.props || {}).map(function (k) { return { name: k, type: typeof L.props[k] === "number" ? "float" : typeof L.props[k] === "boolean" ? "bool" : "string", value: L.props[k] }; }) });
      }
    }
    var lid = 1;
    var json = {
      type: "map", version: "1.10", tiledversion: "1.11.0", orientation: "orthogonal", renderorder: "right-down", infinite: false,
      width: W, height: H, tilewidth: tw, tileheight: th, nextobjectid: nextId,
      properties: [{ name: "oneWay", type: "string", value: oneWayCells.join(",") }],
      layers: Object.keys(layers).filter(function (l) { return layers[l].some(Boolean); }).map(function (l) {
        return { id: lid++, type: "tilelayer", name: l, width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data: layers[l], properties: l === "ground" ? [{ name: "collides", type: "bool", value: true }] : [] };
      }).concat([{ id: lid++, type: "objectgroup", name: "objects", draworder: "topdown", opacity: 1, visible: true, x: 0, y: 0, objects: objects }]),
      tilesets: [{ firstgid: 1, name: tsKey, image: tsKey + ".png", imagewidth: src.width, imageheight: src.height, tilewidth: tw, tileheight: th, margin: mg, spacing: sp, columns: cols, tilecount: cols * rowsN }],
    };
    json.nextlayerid = lid;
    if (scene.cache.tilemap.exists(key)) scene.cache.tilemap.remove(key);
    scene.cache.tilemap.add(key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: json });
    return json;
  };
  /**
   * Creates a Tiled map (loaded via the manifest or made by asciiMap): tile layers, collisions,
   * one-way platforms, objects, world + camera bounds.
   * const lvl = NK2D.tilemap(this, "level1", {collide:["ground"]}); lvl.objects / lvl.spawn("coin", o => ...)
   */
  NK2D.tilemap = function (scene, key, o) {
    o = o || {};
    var map = scene.make.tilemap({ key: key });
    var tilesets = map.tilesets.map(function (ts) {
      var texKey = (o.tilesets && o.tilesets[ts.name]) || ts.name;
      var g = (NK.assets.resolve(texKey).grid) || {};
      return map.addTilesetImage(ts.name, texKey, ts.tileWidth || g.frameWidth, ts.tileHeight || g.frameHeight, ts.tileMargin || g.margin || 0, ts.tileSpacing || g.spacing || 0);
    });
    var layers = {}, solid = [];
    var oneWay = {};
    (map.properties && map.properties.length !== undefined ? map.properties : []).forEach(function (p) { if (p.name === "oneWay" && p.value) p.value.split(",").forEach(function (i) { oneWay[i] = true; }); });
    var depth = o.depth || 0;
    map.layers.forEach(function (ld) {
      var layer = map.createLayer(ld.name, tilesets, 0, 0);
      if (!layer) return;
      layer.setDepth(depth + (ld.name === "decor" ? 1 : 0));
      layers[ld.name] = layer;
      var props = {}; (ld.properties || []).forEach(function (p) { props[p.name] = p.value; });
      var collides = (o.collide ? o.collide.indexOf(ld.name) >= 0 : props.collides || /^(ground|solid|collision|walls?)$/i.test(ld.name));
      if (collides) {
        layer.setCollisionByExclusion([-1]);
        layer.forEachTile(function (t) { if (oneWay[t.y * map.width + t.x] || (t.properties && t.properties.oneWay)) t.setCollision(false, false, true, false); });
        solid.push(layer);
        if (scene.matter && scene.matter.world) scene.matter.world.convertTilemapLayer(layer);
      }
    });
    var objects = [];
    map.objects.forEach(function (layer) {
      layer.objects.forEach(function (ob) {
        var props = {};
        (ob.properties || []).forEach(function (p) { props[p.name] = p.value; });
        var w = ob.width || map.tileWidth, hh = ob.height || map.tileHeight;
        var top = ob.gid ? ob.y - hh : ob.y; // tile objects are bottom-anchored in Tiled
        objects.push({ type: ob.type || ob.class || ob.name, name: ob.name, x: ob.x, y: top, width: w, height: hh, cx: ob.x + w / 2, cy: top + hh / 2, bottom: top + hh, props: props, layer: layer.name });
      });
    });
    var Wp = map.widthInPixels, Hp = map.heightInPixels;
    if (scene.physics && scene.physics.world) { scene.physics.world.setBounds(0, 0, Wp, Hp + (o.pitDepth || 400)); scene.physics.world.setBoundsCollision(true, true, true, false); }
    if (o.camera !== false) scene.cameras.main.setBounds(0, 0, Wp, Hp);
    return {
      map: map, layers: layers, solid: solid, objects: objects, width: Wp, height: Hp, tileWidth: map.tileWidth, tileHeight: map.tileHeight,
      find: function (type) { return objects.filter(function (ob) { return ob.type === type; }); },
      spawn: function (type, fn) { return objects.filter(function (ob) { return ob.type === type; }).map(fn); },
      /** Adds arcade colliders between the solid layers and a sprite/group. */
      collide: function (obj, cb) { return solid.map(function (l) { return scene.physics.add.collider(obj, l, cb); }); },
    };
  };

  // ------------------------------------------------------------ room worlds (1.3.0)
  // Screen-by-screen worlds (top-down adventure, flip-screen games): every room is its own ASCII
  // grid, rooms sit side by side in world space, and the camera slides one full screen between them.
  // Doors, gates and pickups read/write NK.progress, so keys, items and opened doors are kept.
  // World data: tools/world-gen.mjs output, or hand-written in the same shape:
  //   { screen:{tiles:[16,11]}, overworld:{ start, screens:{ "x,y": {ascii, exits, gives, features} } },
  //     dungeons:[{ id, entrance, overworld, entryReq, rooms:{ "x,y": {kind, ascii, exits, gives} } }] }
  var STRUCT_CHARS = { L: "locked", K: "boss", S: "shutter" };
  var GATE_CHARS = { "~": "water", R: "boulder", "%": "thicket", C: "cracked-wall", E: "far-switch", N: "dark-room", _: "gap", Z: "seal", $: "toll", Y: "heart-gate" };
  var PICKUP_CHARS = { k: "key", B: "boss-key", T: "tool", H: "heart" };
  /**
   * const world = NK2D.world(this, data, { tileset:"tiles", legend:{ "#": {tile:"wall"}, ".": … , "L": {tile:"door_locked"}, "k": {tile:"key"}, … },
   *   onRoom(room) { … spawn enemies from room.find("enemy"); return enemiesArray },   // called each time a room is built
   *   transition: 0.6, shutters: true });
   * world.start(player)                  // overworld start (or the saved room after world.continue())
   * fixedUpdate: if (world.fixedUpdate(this.player)) return;   // true while sliding between rooms (freeze the game)
   * world.bossDefeated() · world.save() · world.continue() · world.current · world.mapData()
   * Events: world:room (area, key, room) · world:blocked (gateType, req) · world:opened (type) · world:pickup (give) · world:cleared · world:secret (gives)
   */
  NK2D.world = function (scene, data, o) {
    o = o || {};
    var tiles = (data.screen && data.screen.tiles) || [16, 11];
    var tsKey = o.tileset;
    var grid = (NK.assets.resolve(tsKey).grid) || { frameWidth: 64, frameHeight: 64 };
    var TW = o.tileSize || grid.frameWidth, TH = o.tileSize || grid.frameHeight;
    var RW = tiles[0] * TW, RH = tiles[1] * TH;
    var legend = o.legend || {};
    var areas = { overworld: data.overworld.screens };
    (data.dungeons || []).forEach(function (d) { areas[d.id] = d.rooms; });
    var dungeonById = {};
    (data.dungeons || []).forEach(function (d) { dungeonById[d.id] = d; });
    var built = null;   // {area, key, layers, blockers, pickups, enemies, x0, y0, room}
    var sliding = false;
    var player = null;
    var api;
    var roomXY = function (k) { var p = k.split(","); return [+p[0], +p[1]]; };
    var origin = function (area, k) {
      // Dungeons sit far below the overworld so their rooms never overlap it.
      var xy = roomXY(k), ai = area === "overworld" ? 0 : Object.keys(dungeonById).indexOf(area) + 1;
      return [xy[0] * RW + ai * 64 * RW, xy[1] * RH + ai * 64 * RH];
    };
    var flagKey = function (kind, area, k, dir) { return kind + ":" + area + ":" + k + (dir ? ":" + dir : ""); };
    var sideOf = function (x, y) { return y === 0 ? "n" : y === tiles[1] - 1 ? "s" : x === 0 ? "w" : x === tiles[0] - 1 ? "e" : null; };
    var OPP = { n: "s", s: "n", e: "w", w: "e" };
    var DXY = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
    var fallbackBox = function (x, y, color) { return scene.add.rectangle(x, y, TW, TH, color); };
    var drawCell = function (ch, x, y) {
      var L = legend[ch];
      if (typeof L === "string") L = { tile: L };
      if (L && L.tile && scene.textures.get(tsKey).has(L.tile)) return scene.add.image(x, y, tsKey, L.tile).setDisplaySize(TW, TH);
      return fallbackBox(x, y, L && L.color !== undefined ? L.color : 0xff00ff);
    };

    function destroyRoom(b) {
      if (!b) return;
      b.layers.forEach(function (l) { l.destroy(); });
      b.blockers.clear(true, true);
      b.pickups.forEach(function (p) { if (p.active) p.destroy(); });
      (b.enemies || []).forEach(function (e) { if (e && e.active) e.destroy(); });
      b.colliders.forEach(function (c) { c.destroy(); });
    }

    function buildRoom(area, k) {
      var room = areas[area][k];
      var rows = room.ascii;
      var o0 = origin(area, k), x0 = o0[0], y0 = o0[1];
      // Floor + walls through asciiMap; structure, gate and pickup chars become floor there and are added below.
      var plain = rows.map(function (r) {
        return r.split("").map(function (c) { return STRUCT_CHARS[c] || GATE_CHARS[c] || PICKUP_CHARS[c] || /[Pe XDcm wY]/.test(c) ? "." : c; }).join("");
      });
      var mapLegend = {};
      Object.keys(legend).forEach(function (c) { if (!STRUCT_CHARS[c] && !GATE_CHARS[c] && !PICKUP_CHARS[c]) mapLegend[c] = legend[c]; });
      var mapKey = "nkw:" + area + ":" + k;
      var floorRows = plain.map(function (r) { return r.replace(/[^.]/g, "f"); });
      var layers = [];
      if (legend.floor) {
        NK2D.asciiMap(scene, mapKey + ":floor", { tileset: tsKey, rows: floorRows.map(function (r) { return r.replace(/\./g, "f"); }), legend: { f: legend.floor } });
        var fm = scene.make.tilemap({ key: mapKey + ":floor" });
        var fts = fm.addTilesetImage(tsKey, tsKey, TW, TH, grid.margin || 0, grid.spacing || 0);
        fm.layers.forEach(function (ld) { var l = fm.createLayer(ld.name, fts, x0, y0); if (l) { l.setDepth(-10); layers.push(l); } });
      }
      NK2D.asciiMap(scene, mapKey, { tileset: tsKey, rows: plain, legend: mapLegend });
      var map = scene.make.tilemap({ key: mapKey });
      var ts = map.addTilesetImage(tsKey, tsKey, TW, TH, grid.margin || 0, grid.spacing || 0);
      var colliders = [];
      map.layers.forEach(function (ld) {
        var l = map.createLayer(ld.name, ts, x0, y0);
        if (!l) return;
        if (ld.name === "ground") { l.setCollisionByExclusion([-1]); if (player) colliders.push(scene.physics.add.collider(player, l)); }
        l.setDepth(ld.name === "decor" ? -5 : -8);
        layers.push(l);
      });
      var blockers = scene.physics.add.staticGroup();
      var pickups = [];
      var objects = [];
      var giveFor = {
        k: function () { return "key:" + area; },
        B: function () { return "key:" + area + "-boss"; },
        T: function () { var d = dungeonById[area]; return d ? d.tool : null; },
        H: function () { return "heart-container"; },
      };
      rows.forEach(function (r, ty) {
        r.split("").forEach(function (ch, tx) {
          var cx = x0 + tx * TW + TW / 2, cy = y0 + ty * TH + TH / 2;
          var side = sideOf(tx, ty);
          var doorType = STRUCT_CHARS[ch] || (GATE_CHARS[ch] && side ? "gate" : null);
          if (doorType) {
            if (NK.progress.flag(flagKey("open", area, k, side))) return;
            var ex = (room.exits || {})[side] || {};
            var img = drawCell(ch, cx, cy);
            scene.physics.add.existing(img, true);
            img.nkDoor = { type: doorType, side: side, gate: GATE_CHARS[ch] || null, req: ex.req || null };
            blockers.add(img);
            return;
          }
          if (PICKUP_CHARS[ch]) {
            var give = giveFor[ch]();
            var id = flagKey("took", area, k, ch + tx + "," + ty);
            if (!give || NK.progress.flag(id)) return;
            if (ch === "H" && room.kind === "boss" && !NK.progress.flag(area)) { objects.push({ type: "heart-after-boss", x: cx, y: cy, give: give, id: id }); return; }
            pickups.push(makePickup(ch, cx, cy, give, id));
            return;
          }
          var type = { P: "player", e: "enemy", X: "boss", D: "dungeon", c: "cave", m: "block", w: "switch", Y: "keeper", $: "money" }[ch];
          if (!type) {
            if (GATE_CHARS[ch]) type = "secret";
            else return;
          }
          objects.push({ type: type, x: cx, y: cy, tx: tx, ty: ty, ch: ch });
        });
      });
      if (player) colliders.push(scene.physics.add.collider(player, blockers, function (pl, b) { tryOpen(b); }));
      var b = { area: area, key: k, room: room, layers: layers, blockers: blockers, pickups: pickups, objects: objects, x0: x0, y0: y0, colliders: colliders, enemies: [] };
      b.find = function (t) { return objects.filter(function (ob) { return ob.type === t; }); };
      NK.progress.flag(flagKey("seen", area, k), true);
      return b;
    }

    function makePickup(ch, x, y, give, id) {
      var img = drawCell(ch, x, y);
      scene.physics.add.existing(img, true);
      img.nkGive = give; img.nkId = id;
      return img;
    }

    function openDoor(b) {
      var d = b.nkDoor, area = built.area, k = built.key;
      NK.progress.flag(flagKey("open", area, k, d.side), true);
      var ex = (built.room.exits || {})[d.side];
      if (ex && ex.to && areas[area][ex.to]) NK.progress.flag(flagKey("open", area, ex.to, OPP[d.side]), true);
      // Both tiles of a 2-wide door open together.
      built.blockers.getChildren().slice().forEach(function (o2) { if (o2.nkDoor && o2.nkDoor.side === d.side && o2.nkDoor.type === d.type) o2.destroy(); });
      NK.emit("world:opened", d.type, d.gate);
    }

    function tryOpen(b) {
      var d = b.nkDoor;
      if (!d || sliding) return;
      if (d.type === "shutter") return;
      if (d.type === "locked") { if (NK.progress.useKey(built.area)) openDoor(b); else NK.emit("world:blocked", "locked", "key:" + built.area); return; }
      if (d.type === "boss") { if (NK.progress.useKey(built.area + "-boss")) openDoor(b); else NK.emit("world:blocked", "boss", "key:" + built.area + "-boss"); return; }
      if (NK.progress.meets(d.req)) openDoor(b);
      else NK.emit("world:blocked", d.gate, d.req);
    }

    // Shutters: in a room with live enemies every open exit closes until they are beaten.
    function shut() {
      if (o.shutters === false || !built.enemies.length) return;
      Object.keys(built.room.exits || {}).forEach(function (side) {
        var ex = built.room.exits[side];
        if (ex.type !== "open") return;
        var cells = side === "n" || side === "s" ? [[7, side === "n" ? 0 : tiles[1] - 1], [8, side === "n" ? 0 : tiles[1] - 1]] : [[side === "w" ? 0 : tiles[0] - 1, 4], [side === "w" ? 0 : tiles[0] - 1, 5]];
        cells.forEach(function (c) {
          var img = drawCell("S", built.x0 + c[0] * TW + TW / 2, built.y0 + c[1] * TH + TH / 2);
          scene.physics.add.existing(img, true);
          img.nkDoor = { type: "shutter", side: side };
          built.blockers.add(img);
        });
      });
      built.shut = true;
    }
    function unshut() {
      built.blockers.getChildren().slice().forEach(function (b) { if (b.nkDoor && b.nkDoor.type === "shutter") b.destroy(); });
      built.shut = false;
      NK.emit("world:cleared");
    }

    function enter(area, k, px, py) {
      var old = built;
      built = buildRoom(area, k);
      if (o.onRoom) built.enemies = (o.onRoom.call(scene, built) || []).filter(Boolean);
      scene.cameras.main.setBounds(built.x0, built.y0, RW, RH);
      if (px !== undefined && player) { player.setPosition(px, py); if (player.body) player.body.reset(px, py); }
      destroyRoom(old);
      shut();
      NK.emit("world:room", area, k, built.room);
      return built;
    }

    function exitTo(side) {
      var ex = (built.room.exits || {})[side];
      if (ex && ex.type === "exit") return leaveDungeon();
      if (!ex || !areas[built.area][ex.to]) return false;
      var from = built, toKey = ex.to, area = built.area;
      var t = (o.transition || 0.6) * 1000;
      var o1 = origin(area, toKey);
      sliding = true;
      var next = buildRoom(area, toKey);
      var cam = scene.cameras.main;
      cam.setBounds(Math.min(from.x0, o1[0]), Math.min(from.y0, o1[1]), RW * (side === "e" || side === "w" ? 2 : 1), RH * (side === "n" || side === "s" ? 2 : 1));
      var dxy = DXY[side];
      if (player.body) player.body.setVelocity(0, 0);
      var tx = player.x + dxy[0] * TW * 1.2, ty = player.y + dxy[1] * TH * 1.2;
      scene.tweens.add({ targets: player, x: tx, y: ty, duration: t });
      scene.tweens.add({
        targets: cam, scrollX: o1[0] + RW / 2 - cam.width / 2, scrollY: o1[1] + RH / 2 - cam.height / 2, duration: t, ease: "Sine.easeInOut",
        onComplete: function () {
          destroyRoom(from);
          built = next;
          if (o.onRoom) built.enemies = (o.onRoom.call(scene, built) || []).filter(Boolean);
          cam.setBounds(built.x0, built.y0, RW, RH);
          if (player.body) player.body.reset(tx, ty);
          sliding = false;
          shut();
          NK.emit("world:room", area, toKey, built.room);
        },
      });
      return true;
    }

    function enterDungeon(dg) {
      var e = dg.rooms[dg.entrance];
      var spot = null;
      e.ascii.forEach(function (r, ty) { var tx = r.indexOf("P"); if (tx >= 0) spot = [tx, ty]; });
      spot = spot || [7, tiles[1] - 3];
      var o0 = origin(dg.id, dg.entrance);
      api.returnTo = { key: built.key, x: player.x, y: player.y + TH };
      enter(dg.id, dg.entrance, o0[0] + spot[0] * TW + TW / 2, o0[1] + spot[1] * TH + TH / 2);
      if (o.autosave !== false) api.save();
    }
    function leaveDungeon() {
      var d = dungeonById[built.area];
      var back = api.returnTo || { key: d.overworld };
      var o0 = origin("overworld", back.key);
      enter("overworld", back.key, back.x || o0[0] + RW / 2, back.y || o0[1] + RH / 2);
      return true;
    }

    api = {
      width: RW, height: RH, tileWidth: TW, tileHeight: TH,
      get current() { return built; },
      get sliding() { return sliding; },
      /** Starts at the overworld start screen (or the room passed in). */
      start: function (pl, area, k) {
        player = pl;
        area = area || "overworld";
        k = k || data.overworld.start;
        var room = areas[area][k];
        var spot = null;
        room.ascii.forEach(function (r, ty) { var tx = r.indexOf("P"); if (tx >= 0) spot = [tx, ty]; });
        spot = spot || [Math.floor(tiles[0] / 2), Math.floor(tiles[1] / 2)];
        var o0 = origin(area, k);
        if (scene.physics && scene.physics.world) scene.physics.world.setBounds(-1e5, -1e5, 2e5, 2e5);
        return enter(area, k, o0[0] + spot[0] * TW + TW / 2, o0[1] + spot[1] * TH + TH / 2);
      },
      /** Call first in fixedUpdate; returns true while the camera slides between rooms. */
      fixedUpdate: function (pl) {
        player = pl || player;
        if (sliding || !built || !player) return sliding;
        var lx = player.x - built.x0, ly = player.y - built.y0;
        var side = lx < 0 ? "w" : lx > RW ? "e" : ly < 0 ? "n" : ly > RH ? "s" : null;
        if (side) { if (!exitTo(side)) { player.x = Phaser.Math.Clamp(player.x, built.x0 + 4, built.x0 + RW - 4); player.y = Phaser.Math.Clamp(player.y, built.y0 + 4, built.y0 + RH - 4); } return sliding; }
        // Pickups and touch objects (dungeon entrances, caves, secrets).
        var pb = player.getBounds ? player.getBounds() : new Phaser.Geom.Rectangle(player.x - 16, player.y - 16, 32, 32);
        built.pickups.forEach(function (p) {
          if (!p.active || !Phaser.Geom.Intersects.RectangleToRectangle(pb, p.getBounds())) return;
          NK.progress.grant(p.nkGive);
          NK.progress.flag(p.nkId, true);
          NK.emit("world:pickup", p.nkGive);
          p.destroy();
        });
        built.objects.forEach(function (ob) {
          if (ob.done) return;
          var near = Math.abs(player.x - ob.x) < TW * 0.6 && Math.abs(player.y - ob.y) < TH * 0.6;
          if (!near) { ob.blockedShown = false; return; }
          if (ob.type === "dungeon") {
            var dg = (data.dungeons || []).filter(function (d) { return d.overworld === built.key; })[0];
            if (!dg) return;
            if (NK.progress.meets(dg.entryReq)) { ob.done = true; enterDungeon(dg); }
            else if (!ob.blockedShown) { ob.blockedShown = true; NK.emit("world:blocked", "seal", dg.entryReq); }
          } else if (ob.type === "cave" || ob.type === "secret" || ob.type === "keeper") {
            var sc = ((data.overworld.secrets || []).filter(function (s) { return s.screen === built.key; })[0]) || null;
            var req = sc ? sc.req : null;
            var gives = (built.room.gives || []).slice();
            var id = flagKey("secret", built.area, built.key);
            if (NK.progress.flag(id) || !gives.length) { ob.done = true; return; }
            if (!NK.progress.meets(req)) { if (!ob.blockedShown) { ob.blockedShown = true; NK.emit("world:blocked", sc && sc.gate, req); } return; }
            gives.forEach(function (g) { NK.progress.grant(g); });
            NK.progress.flag(id, true);
            ob.done = true;
            NK.emit("world:secret", gives);
          }
        });
        if (built.shut) {
          var alive = built.enemies.filter(function (e) { return e && e.active; }).length;
          if (!alive) unshut();
        }
        return false;
      },
      /** The current dungeon's boss is beaten: sets its flag and shows the heart container. */
      bossDefeated: function () {
        NK.progress.flag(built.area, true);
        built.objects.filter(function (ob) { return ob.type === "heart-after-boss"; }).forEach(function (ob) {
          built.pickups.push(makePickup("H", ob.x, ob.y, ob.give, ob.id));
        });
        if (o.autosave !== false) api.save();
      },
      /** Opens a door/gate of the current room from game code (a far switch hit by an arrow, a torch lit…). */
      open: function (side) {
        built.blockers.getChildren().slice().forEach(function (b) { if (b.nkDoor && b.nkDoor.side === side) openDoor(b); });
      },
      save: function () {
        var at = built.area === "overworld" ? { area: "overworld", key: built.key } : { area: built.area, key: dungeonById[built.area].entrance, returnTo: api.returnTo };
        return NK.progress.save("main", { world: at });
      },
      /** Loads the saved progress and returns where to start ({area, key}) or null without a save. */
      continue: function () {
        var extra = NK.progress.load("main");
        if (!extra || !extra.world) return null;
        api.returnTo = extra.world.returnTo || null;
        return extra.world;
      },
      /** Rooms of an area for a map screen: [{key, x, y, seen, current, kind}]. */
      mapData: function (area) {
        area = area || (built && built.area) || "overworld";
        return Object.keys(areas[area]).map(function (k2) {
          var xy = roomXY(k2);
          return { key: k2, x: xy[0], y: xy[1], seen: NK.progress.flag(flagKey("seen", area, k2)), current: built && built.area === area && built.key === k2, kind: areas[area][k2].kind || null };
        });
      },
    };
    return api;
  };

  // ------------------------------------------------------- camera + parallax
  /** NK2D.follow(scene, sprite, {lerp:0.12, deadzone:[w,h], zoom, offsetY}) */
  NK2D.follow = function (scene, target, o) {
    o = o || {};
    var cam = scene.cameras.main;
    cam.startFollow(target, true, o.lerp || 0.12, o.lerpY || o.lerp || 0.12);
    if (o.deadzone) cam.setDeadzone(o.deadzone[0], o.deadzone[1]);
    if (o.zoom) cam.setZoom(o.zoom);
    if (o.offsetY) cam.setFollowOffset(0, o.offsetY);
    cam.roundPixels = !!(cfg && cfg.pixelArt);
    return cam;
  };
  /** Repeating backgrounds that scroll slower than the camera: [{texture, frame, factor, y, height, tint}] */
  /** Copies one atlas frame into its own texture (seamless repeating, no bleeding from neighbours). */
  NK2D.frameTexture = function (scene, texture, frame, scale) {
    scale = scale || 1;
    if ((frame === undefined || frame === null) && scale === 1) return texture;
    var key = texture + ":" + frame + (scale !== 1 ? "@" + scale : "");
    if (scene.textures.exists(key)) return key;
    var fr = scene.textures.getFrame(texture, frame);
    if (!fr) { NK.reportError(new Error('No frame "' + frame + '" in ' + texture), "frameTexture"); return texture; }
    var w = Math.round(fr.cutWidth * scale), hh = Math.round(fr.cutHeight * scale);
    var ct = scene.textures.createCanvas(key, w, hh);
    // Exact 1:1 copy first (no sampling outside the frame), then scale that copy.
    var tmp = document.createElement("canvas");
    tmp.width = fr.cutWidth; tmp.height = fr.cutHeight;
    tmp.getContext("2d").drawImage(fr.source.image, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, 0, fr.cutWidth, fr.cutHeight);
    ct.context.imageSmoothingQuality = "high";
    ct.context.drawImage(tmp, 0, 0, fr.cutWidth, fr.cutHeight, 0, 0, w, hh);
    ct.refresh();
    return key;
  };
  NK2D.parallax = function (scene, layers) {
    var cam = scene.cameras.main, W = scene.scale.width, H = scene.scale.height;
    var items = layers.map(function (l, i) {
      // Pre-scaled copy of the frame → 1:1 texels, so repeats never blur into each other.
      var tex = NK2D.frameTexture(scene, l.texture, l.frame, l.scale || 1);
      var fr = scene.textures.getFrame(tex);
      var hh = l.height || (fr ? fr.height : H);
      var ts = scene.add.tileSprite(0, Math.round(l.y === undefined ? H - hh : l.y), W, hh, tex).setOrigin(0, 0).setScrollFactor(0).setDepth(-100 + i);
      if (l.tint) ts.setTint(l.tint);
      return { ts: ts, f: l.factor === undefined ? 0.3 : l.factor, fy: l.factorY || 0 };
    });
    // Reduce motion: the layers stand still.
    var upd = function () { var still = NK.settings.get("reduceMotion"); items.forEach(function (it) { it.ts.tilePositionX = still ? 0 : Math.round(cam.scrollX * it.f); it.ts.tilePositionY = still ? 0 : Math.round(cam.scrollY * it.fy); }); };
    scene.events.on("update", upd);
    scene.events.once("shutdown", function () { scene.events.off("update", upd); });
    return items.map(function (i) { return i.ts; });
  };

  // ----------------------------------------------------- tilted view (1.2.0)
  // config.view: "tilted" (or { tilt: 0.5..0.95 }, default 0.75) — for top-down games: the ground is seen by a
  // camera tilted down at it (squashed vertically by `tilt`), while every sprite stands upright at its own size,
  // anchored at its feet. It only changes how a frame is drawn: positions, physics, input and game code see the
  // plain top-down world (pointer world coordinates land on the ground). Tile layers, tile sprites, graphics,
  // particles, ellipses/arcs (shadows) and rotated objects lie flat; NK2D.flat(obj) / NK2D.stand(obj) override.
  // Objects with a scroll factor other than 1 (backdrops, in-scene UI) are not tilted. scene.nkView = false
  // turns it off for one scene; camera.nkFlat = true keeps one camera untilted (a minimap).
  var FLAT_TYPES = { TilemapLayer: 1, TilemapGPULayer: 1, TileSprite: 1, Graphics: 1, ParticleEmitter: 1, Blitter: 1, Ellipse: 1, Arc: 1, Rope: 1, Mesh: 1, Plane: 1, PointLight: 1, Light: 1, Zone: 1 };
  function viewTilt() {
    var v = cfg && cfg.view, t = 0;
    if (v === "tilted" || v === true) t = 0.75;
    else if (v && typeof v === "object") t = +v.tilt || (v.mode === "tilted" ? 0.75 : 0);
    return t > 0 && t < 1 ? Math.max(0.5, t) : 0;
  }
  NK2D.flat = function (o) { o.nkFlat = true; o.nkStand = false; return o; };
  NK2D.stand = function (o) { o.nkStand = true; o.nkFlat = false; return o; };
  /** The vertical squash of the ground this frame (1 = plain top-down). */
  NK2D.tilt = function () { return viewTilt() || 1; };
  function installView(scene) {
    var saved = [], cams = [], t = 0, main = null;
    function standUp(o, cam) {
      if (!o || o.visible === false) return;
      if (o.type === "Layer") { (o.list || []).forEach(function (c) { standUp(c, cam); }); return; }
      var sfy = o.scrollFactorY === undefined ? 1 : o.scrollFactorY, y = o.y, sc = o.scaleY;
      if (typeof y !== "number" || typeof sc !== "number") return;
      if (sfy !== 1) {
        // backdrops / in-scene UI: undo the squash entirely (screen = centre + zoom * offset, as without the view)
        var oy = cam.height * cam.originY, base = cam.scrollY * sfy + oy;
        saved.push(o, y, sc); o.y = base + (y - base) / t; o.scaleY = sc / t; return;
      }
      if (o.nkFlat || (!o.nkStand && (FLAT_TYPES[o.type] || o.rotation))) return;
      // stand up around the feet: the foot lands on the tilted ground, the art keeps its size
      var foot = o.type === "Container" || o.originY === undefined ? y : y + (1 - o.originY) * (o.height || 0) * sc;
      saved.push(o, y, sc); o.y = foot - (foot - y) / t; o.scaleY = sc / t;
    }
    function pre() {
      t = scene.nkView === false ? 0 : viewTilt();
      if (!t) return;
      cams.length = 0;
      scene.cameras.cameras.forEach(function (c) { if (c.nkFlat) return; cams.push(c, c.zoomY); c.zoomY = c.zoomX * t; });
      main = scene.cameras.main;
      // the objects stand up after the main camera has followed its target this frame (fresh scroll)
      if (main && !main.__nkView) {
        var orig = main.preRender;
        main.preRender = function () { orig.apply(this, arguments); if (this.__nkView.on) this.__nkView.fn(this); };
        main.__nkView = { on: false, fn: null };
      }
      if (main) { main.__nkView.on = true; main.__nkView.fn = function (cam) { cam.__nkView.on = false; scene.sys.displayList.list.forEach(function (o) { standUp(o, cam); }); }; }
    }
    function post() {
      var i;
      for (i = saved.length - 3; i >= 0; i -= 3) { saved[i].y = saved[i + 1]; saved[i].scaleY = saved[i + 2]; }
      saved.length = 0;
      for (i = 0; i < cams.length; i += 2) cams[i].zoomY = cams[i].zoomX;
      cams.length = 0;
      if (main && main.__nkView) main.__nkView.on = false;
    }
    scene.events.on("prerender", pre);
    scene.events.on("render", post);
    scene.events.once("shutdown", function () { post(); scene.events.off("prerender", pre); scene.events.off("render", post); });
  }

  // ------------------------------------------------------------------ HUD
  // Lives in its own scene (NKHud) above the game so camera zoom/shake never moves it.
  var hudScene = null;
  /**
   * const hud = NK2D.hud(this);
   * hud.counter("coins", {texture:"tiles", frame:"hud_coin", value:0});
   * hud.hearts("lives", {texture:"tiles", full:"hud_heart", empty:"hud_heart_empty", max:3, value:3});
   * hud.label("level", "Level 1"); hud.set("coins", 3); hud.set("lives", 2);
   */
  NK2D.hud = function (owner) {
    // NKHud runs from boot and is never restarted (restarting a scene clears what it shows).
    var s = hudScene || game.scene.getScene("NKHud");
    if (!s.sys.isActive() && s.sys.settings.status < Phaser.Scenes.START) game.scene.run("NKHud");
    hudScene = s;
    game.scene.bringToTop("NKHud");
    s.clearHud();
    var api = {
      items: {},
      _y: 40,
      counter: function (key, o) {
        var x = 20, y = api._y; api._y += 60;
        var icon = o.texture ? s.add.image(x, y, o.texture, o.frame).setOrigin(0, 0.5).setDisplaySize(o.iconSize || 60, o.iconSize || 60) : null;
        var t = NK2D.text(s, x + (icon ? (o.iconSize || 60) + 4 : 0), y + 2, (o.prefix || "") + (o.value === undefined ? 0 : o.value), { size: 28, originX: 0 });
        api.items[key] = { set: function (v) { t.setText((o.prefix || "") + v); s.tweens.add({ targets: t, scale: { from: 1.25, to: 1 }, duration: 160 }); }, objs: [icon, t] };
        return api;
      },
      hearts: function (key, o) {
        var x = 20, y = api._y; api._y += 60;
        var sz = o.iconSize || 60, hs = [];
        for (var i = 0; i < o.max; i++) hs.push(s.add.image(x + i * (sz - 6), y, o.texture, o.full).setOrigin(0, 0.5).setDisplaySize(sz, sz));
        var set = function (v) { hs.forEach(function (im, i) { im.setFrame(i < v ? o.full : o.empty); im.setDisplaySize(sz, sz); }); };
        set(o.value === undefined ? o.max : o.value);
        api.items[key] = { set: set, objs: hs };
        return api;
      },
      label: function (key, text, o) {
        o = o || {};
        var t = NK2D.text(s, s.scale.width / 2, o.y || 30, text, { size: o.size || 26 });
        api.items[key] = { set: function (v) { t.setText(v); }, objs: [t] };
        return api;
      },
      set: function (key, v) { if (api.items[key]) api.items[key].set(v); },
      /** Big centred message that fades: hud.flash("Level 2!") */
      flash: function (text, ms) {
        var t = NK2D.text(s, s.scale.width / 2, s.scale.height * 0.4, text, { size: 54 });
        s.tweens.add({ targets: t, alpha: { from: 1, to: 0 }, y: t.y - 40, delay: ms || 900, duration: 500, onComplete: function () { t.destroy(); } });
      },
    };
    s.pauseBtn();
    if (owner && owner.events) owner.events.once("shutdown", function () { if (hudScene === s) s.clearHud(); });
    return api;
  };
  class NKHud extends Scene {
    constructor() { super({ key: "NKHud" }); }
    create() { hudScene = this; }
    clearHud() { this.children.removeAll(true); this._pause = null; }
    pauseBtn() {
      if (this._pause) return;
      var x = this.scale.width - 40, y = 40;
      var hasIcon = this.textures.exists("nk-icon-pause");
      var bg = this.add.circle(x, y, 28, 0x000000, 0.35).setInteractive({ useHandCursor: true });
      var ic = hasIcon ? this.add.image(x, y, "nk-icon-pause").setDisplaySize(34, 34) : NK2D.text(this, x, y, "II", { size: 22 });
      bg.on("pointerup", function () { NK.pause(); });
      this._pause = [bg, ic];
    }
  }

  // ------------------------------------------------------------ kit scenes
  class Boot extends Scene {
    constructor() { super({ key: "Boot" }); }
    create() { this.scene.start("Preload"); }
  }
  class Preload extends Scene {
    constructor() { super({ key: "Preload" }); }
    preload() {
      var self = this;
      NK.ui.loading(0);
      NK2D.queueAssets(this);
      var icon = NK.assets.entry("kenney/mobile-controls/icon-pause") ? NK.assets.url("kenney/mobile-controls/icon-pause", ["png"]) : null;
      if (icon) this.load.image("nk-icon-pause", icon);
      var aud = 1, img = 0;
      this.audioDone = NK.audio.loadAll(function (p) { aud = p; NK.ui.loading(img * 0.8 + aud * 0.2); });
      this.load.on("progress", function (p) { img = p; NK.ui.loading(img * 0.8 + aud * 0.2); });
      this.load.on("loaderror", function (f) { NK.reportError(new Error("Could not load " + f.key + " (" + f.url + ")"), "assets"); });
      self.fontsDone = loadFonts();
    }
    create() {
      var self = this;
      Promise.all([this.audioDone, this.fontsDone]).then(function () {
        NK2D.buildAnims(self);
        game.scene.run("NKHud");
        NK.ui.loading(false);
        if (bootSnapshot && bootSnapshot.state && bootSnapshot.state !== "menu") {
          var s = bootSnapshot; bootSnapshot = null;
          NK.state.go("play", Object.assign({}, s.data || {}, { __snapshot: s.snap }));
        } else if (cfg.menu === false) NK.start();
        else NK.state.go("menu");
      });
    }
  }
  class Menu extends Scene {
    constructor() { super({ key: "Menu" }); }
    create() {
      var W = this.W, H = this.H, m = cfg.menu || {};
      this.cameras.main.setBackgroundColor(m.background || cfg.background || "#5aa7e8");
      if (m.parallax) NK2D.parallax(this, m.parallax);
      NK2D.text(this, W / 2, H * 0.26, (NK.game && NK.game.title) || cfg.title || "Game", { size: Math.min(84, Math.round(W / 11)) });
      if (m.subtitle) NK2D.text(this, W / 2, H * 0.26 + 64, m.subtitle, { size: 22 });
      this.button(W / 2, H * 0.56, m.play || "Play", function () { NK.start(); });
      this.button(W / 2, H * 0.56 + 84, "Settings", function () { NK.ui.settings(); }, { color: 0x56628a });
      var best = NK.save.best("score").best;
      if (best) NK2D.text(this, W / 2, H * 0.9, "Best " + best, { size: 22 });
      if (m.music) NK.audio.music(m.music);
    }
    fixedUpdate() { if ((NK.input.pressed("jump") || NK.input.pressed("action")) && !NK.ui.isOpen()) NK.start(); }
  }
  class Pause extends Scene {
    constructor() { super({ key: "Pause" }); }
    create() {
      var W = this.W, H = this.H;
      this.add.rectangle(0, 0, W, H, 0x080a14, 0.6).setOrigin(0).setInteractive();
      NK2D.panel(this, W / 2, H / 2, 360, 380);
      NK2D.text(this, W / 2, H / 2 - 140, "Paused", { size: 44 });
      this.button(W / 2, H / 2 - 50, "Resume", function () { NK.resume(); }, { color: 0x3fb06b });
      this.button(W / 2, H / 2 + 30, "Settings", function () { NK.ui.settings(); }, { color: 0x56628a });
      this.button(W / 2, H / 2 + 110, "Quit", function () { NK.menu(); }, { color: 0x56628a });
    }
  }
  class GameOver extends Scene {
    constructor() { super({ key: "GameOver" }); }
    create(data) {
      var W = this.W, H = this.H, win = !!data.win;
      this.add.rectangle(0, 0, W, H, 0x080a14, 0.6).setOrigin(0).setInteractive();
      NK2D.panel(this, W / 2, H / 2, 420, 400);
      NK2D.text(this, W / 2, H / 2 - 140, data.title || (win ? "You win!" : "Game over"), { size: 46, color: win ? "#ffe066" : "#ffffff" });
      if (data.score !== undefined) NK2D.text(this, W / 2, H / 2 - 70, "Score " + data.score + (data.newBest ? "  New best!" : data.best ? "  Best " + data.best : ""), { size: 24 });
      this.button(W / 2, H / 2 + 20, win ? "Play again" : "Try again", function () { NK.start(); }, { color: 0x3fb06b });
      this.button(W / 2, H / 2 + 100, "Menu", function () { NK.menu(); }, { color: 0x56628a });
      if (cfg.overMusic) NK.audio.music(cfg.overMusic);
      this.t0 = this.time.now;
    }
    fixedUpdate() { if (NK.input.pressed("jump") && this.time.now - this.t0 > 600 && !NK.ui.isOpen()) NK.start(); }
  }
  var KIT = { Boot: Boot, Preload: Preload, Menu: Menu, Pause: Pause, GameOver: GameOver, NKHud: NKHud };

  // ------------------------------------------------------------ state → scenes
  function playKey() { return cfg.playScene || "Game"; }
  function stopAll(except) {
    except = (except || []).concat(["NKHud"]);
    game.scene.getScenes(false).forEach(function (s) {
      var k = s.sys.settings.key;
      if (except.indexOf(k) >= 0) return;
      if (s.sys.isActive() || s.sys.isPaused() || s.sys.isSleeping()) game.scene.stop(k);
    });
  }
  function onState(to, from, data) {
    if (!game) return;
    var P = playKey();
    if (to === "menu") { stopAll(); game.scene.start("Menu"); }
    else if (to === "play") {
      if (from === "pause" && data && data.resumed) { game.scene.stop("Pause"); game.scene.resume(P); NK.audio.resume(); }
      else { stopAll(); game.scene.start(P, data || {}); game.scene.bringToTop("NKHud"); }
    } else if (to === "pause") { game.scene.pause(P); game.scene.run("Pause"); game.scene.bringToTop("Pause"); }
    else if (to === "over") { game.scene.pause(P); game.scene.stop("Pause"); game.scene.run("GameOver", data || {}); game.scene.bringToTop("GameOver"); }
  }

  // --------------------------------------------------------------- driver
  function sceneClass(key) { return wrapScene(key, NK.scene(key) || KIT[key]); }
  function applyLayout() {
    var root = NK.root();
    var portrait = global.innerHeight > global.innerWidth * 1.1 && NK.device.touch && cfg.width > cfg.height;
    root.classList.toggle("nk-portrait", portrait);
    var inner = root.querySelector(".nk-canvas");
    // Portrait phone + landscape game: game strip near the top, the space below is for the thumbs.
    if (inner) inner.style.height = portrait ? Math.round(global.innerWidth * cfg.height / cfg.width + 120) + "px" : "100%";
    if (game && game.scale) game.scale.refresh();
  }
  var DEFAULTS = { width: 1280, height: 720, background: "#5aa7e8", physics: "arcade", gravity: 1400, pixelArt: false, orientation: "landscape" };
  var driver = {
    name: "phaser-2d",
    start: function (config, snapshot) {
      cfg = Object.assign({}, DEFAULTS, config);
      bootSnapshot = snapshot || null;
      var stage = NK.stage();
      var inner = stage.querySelector(".nk-canvas") || document.createElement("div");
      inner.className = "nk-canvas";
      inner.style.cssText = "position:relative;width:100%;height:100%";
      stage.appendChild(inner);
      var physics = cfg.physics === "matter"
        ? { default: "matter", matter: Object.assign({ gravity: { y: (cfg.gravity || 1) > 10 ? 1 : cfg.gravity }, debug: !!cfg.debug }, cfg.matter || {}) }
        : cfg.physics === false ? undefined
        : { default: "arcade", arcade: Object.assign({ gravity: { y: cfg.gravity }, debug: !!cfg.debug, fixedStep: true, fps: 60, tileBias: 32 }, cfg.arcade || {}) };
      var keys = KIT_SCENES.slice();
      Object.keys(NK.scenes()).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
      if (keys.indexOf(playKey()) < 0) NK.reportError(new Error('No "' + playKey() + '" scene registered yet'), "boot");
      // Order: Boot first, overlays last (drawn on top).
      var order = ["Boot", "Preload", "Menu"].concat(keys.filter(function (k) { return ["Boot", "Preload", "Menu", "Pause", "GameOver", "NKHud"].indexOf(k) < 0; }), ["NKHud", "Pause", "GameOver"]);
      applyLayout();
      return new Promise(function (resolve) {
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: inner,
          width: cfg.width, height: cfg.height,
          backgroundColor: cfg.background,
          pixelArt: !!cfg.pixelArt,
          antialias: !cfg.pixelArt,
          roundPixels: !!cfg.pixelArt,
          banner: false,
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          physics: physics,
          input: { activePointers: 3, gamepad: false, keyboard: true },
          audio: { noAudio: true },
          loader: { crossOrigin: "anonymous", maxParallelDownloads: 16 },
          fps: { target: 60, smoothStep: true },
          disableContextMenu: true,
          scene: order.map(sceneClass).filter(Boolean),
          callbacks: { postBoot: function () { resolve(); } },
        });
        NK2D.game = game;
        global.addEventListener("resize", applyLayout);
        // One deterministic 60 Hz clock for all running scenes (before physics); input edges clear once per tick.
        var stepper = new NK.FixedStep(60, function (dt) {
          game.scene.getScenes(true).forEach(function (sc) { if (sc.__nkFixed && sc.sys.settings.status === Phaser.Scenes.RUNNING) sc.__nkFixed(dt); });
          NK.input.endStep();
        });
        game.events.on("prestep", function (time, delta) { NK.input.poll(); stepper.advance(delta / 1000); });
        if (cfg.orientation) NK.ui.orientationHint(cfg.orientation);
        if (cfg.touch) NK.touch.setup(cfg.touch);
      });
    },
    currentScene: function () {
      if (!game) return null;
      var act = game.scene.getScenes(true).map(function (s) { return s.sys.settings.key; }).filter(function (k) { return k !== "NKHud"; });
      return act.length ? act[act.length - 1] : null;
    },
    stats: function () {
      var s = game && game.scene.getScene(playKey());
      if (!s || !s.sys || !s.sys.displayList) return null;
      return { objects: s.sys.displayList.length, bodies: s.physics && s.physics.world ? s.physics.world.bodies.size : 0 };
    },
    snapshot: function () {
      var s = game && game.scene.getScene(playKey());
      var active = s && (s.sys.isActive() || s.sys.isPaused());
      return { state: NK.state.current === "pause" || NK.state.current === "over" ? "play" : NK.state.current, data: active ? cleanData(s.sys.settings.data) : {}, snap: active ? NK.guard(s.snapshot, s, [], "snapshot") : null };
    },
    hotReload: function (c) {
      if (!game) return "reload";
      if (c.config) {
        var n = Object.assign({}, DEFAULTS, NK.config());
        if (n.width !== cfg.width || n.height !== cfg.height || n.physics !== cfg.physics || !!n.pixelArt !== !!cfg.pixelArt || n.gravity !== cfg.gravity) return "reload";
        Object.assign(cfg, n);
        if (n.background && game.scene.getScene("Menu").sys.isActive()) game.scene.getScene("Menu").cameras.main.setBackgroundColor(n.background);
        if (cfg.touch) NK.touch.setup(cfg.touch);
      }
      var P = playKey();
      var anyScene = game.scene.getScenes(true)[0] || game.scene.getScene("Menu");
      var ready = c.assets ? NK2D.loadMissing(anyScene) : Promise.resolve(NK2D.buildAnims(anyScene));
      return ready.then(function () {
        var uniq = c.scenes.filter(function (k, i, a) { return a.indexOf(k) === i; });
        var restartedPlay = false;
        uniq.forEach(function (key) {
          if (KIT_SCENES.indexOf(key) >= 0 && key !== "Menu" && key !== "Pause" && key !== "GameOver") return;
          var old = game.scene.getScene(key);
          var wasRunning = !!(old && (old.sys.isActive() || old.sys.isPaused()));
          var wasPaused = !!(old && old.sys.isPaused());
          var data = old ? cleanData(old.sys.settings.data) : {};
          var snap = wasRunning ? NK.guard(old.snapshot, old, [], key + ".snapshot") : null;
          if (old) game.scene.remove(key);
          game.scene.add(key, sceneClass(key), false);
          if (wasRunning) {
            game.scene.start(key, Object.assign({}, data, { __snapshot: snap }));
            if (key === P) restartedPlay = true;
            if (wasPaused) game.events.once("poststep", function () { game.scene.pause(key); });
          } else if (key === P && NK.state.current === "play") { game.scene.start(key, {}); restartedPlay = true; }
          else if (key === "Menu" && NK.state.current === "menu") game.scene.start("Menu");
        });
        if (!restartedPlay && (c.defs.length || c.assets || c.config || c.files.indexOf("(code)") >= 0)) {
          var s = game.scene.getScene(P);
          if (s && (s.sys.isActive() || s.sys.isPaused())) {
            var data = cleanData(s.sys.settings.data);
            s.scene.restart(Object.assign({}, data, { __snapshot: NK.guard(s.snapshot, s, [], "snapshot") }));
          } else if (NK.state.current === "menu") { var m = game.scene.getScene("Menu"); if (m && m.sys.isActive()) m.scene.restart(); }
        }
        ["NKHud", "Pause", "GameOver"].forEach(function (k) { var s = game.scene.getScene(k); if (s && s.sys.isActive()) game.scene.bringToTop(k); });
        return "hot";
      });
    },
  };
  function cleanData(d) { var o = Object.assign({}, d || {}); delete o.__snapshot; return o; }
  NK.on("state", onState);
  NK.driver = driver;
})(window);
