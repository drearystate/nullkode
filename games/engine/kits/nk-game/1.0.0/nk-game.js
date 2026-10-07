/*!
 * nk-game runtime 1.0.0 — shared by the NullKode 2D (Phaser) and 3D (three.js) game kits.
 * Lifecycle, event bus, module registry, input, touch controls, audio, assets, saves,
 * settings, overlay UI, platform hooks and the Game Studio live-patch bridge.
 * Plain script (no modules): exposes window.NK. CC0-compatible project code.
 */
(function (global) {
  "use strict";
  if (global.NK && global.NK.__runtime) return;
  var NK = (global.NK = global.NK || {});
  NK.__runtime = true;
  NK.version = "1.0.0";
  var doc = global.document;
  var now = function () { return (global.performance && performance.now()) || Date.now(); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  NK.util = { clamp: clamp, now: now, lerp: function (a, b, t) { return a + (b - a) * t; } };

  // ---------------------------------------------------------------- event bus
  function Bus() { this._h = Object.create(null); }
  Bus.prototype.on = function (ev, fn, ctx) {
    (this._h[ev] || (this._h[ev] = [])).push({ fn: fn, ctx: ctx });
    var self = this;
    return function () { self.off(ev, fn); };
  };
  Bus.prototype.once = function (ev, fn, ctx) {
    var self = this;
    var off = this.on(ev, function () { off(); fn.apply(ctx, arguments); });
    return off;
  };
  Bus.prototype.off = function (ev, fn) {
    var l = this._h[ev];
    if (!l) return;
    this._h[ev] = fn ? l.filter(function (h) { return h.fn !== fn; }) : [];
  };
  Bus.prototype.emit = function (ev) {
    var l = this._h[ev];
    if (!l || !l.length) return;
    var args = Array.prototype.slice.call(arguments, 1);
    l.slice().forEach(function (h) {
      try { h.fn.apply(h.ctx, args); } catch (e) { NK.reportError(e, "event " + ev); }
    });
  };
  NK.Bus = Bus;
  NK.bus = new Bus();
  NK.on = NK.bus.on.bind(NK.bus);
  NK.once = NK.bus.once.bind(NK.bus);
  NK.off = NK.bus.off.bind(NK.bus);
  NK.emit = NK.bus.emit.bind(NK.bus);

  // ------------------------------------------------------------------ errors
  NK.errors = [];
  var errorQueue = [];
  NK.reportError = function (err, where) {
    var msg = err && err.message ? err.message : String(err);
    var rec = { message: msg, where: where || NK._loadingPath || "", stack: err && err.stack ? String(err.stack).split("\n").slice(0, 4).join("\n") : "", time: Date.now() };
    var last = NK.errors[NK.errors.length - 1];
    if (last && last.message === rec.message && rec.time - last.time < 1000) return; // rate limit repeats
    NK.errors.push(rec);
    if (NK.errors.length > 50) NK.errors.shift();
    errorQueue.push(rec);
    if (global.console && console.warn) console.warn("[nk-game] " + (rec.where ? rec.where + ": " : "") + msg);
    NK.emit("error", rec);
  };
  global.addEventListener("error", function (e) {
    if (e && e.target && e.target !== global && e.target.tagName) { NK.reportError(new Error("Failed to load " + (e.target.src || e.target.href || e.target.tagName)), "resource"); return; }
    NK.reportError(e.error || new Error(e.message), NK._loadingPath || (e.filename ? e.filename.split("/").pop() + ":" + e.lineno : ""));
  }, true);
  global.addEventListener("unhandledrejection", function (e) { NK.reportError(e.reason || new Error("Unhandled promise rejection"), "promise"); });
  /** Runs fn, reporting (not throwing) errors. Used around every game hook. */
  NK.guard = function (fn, ctx, args, where) {
    try { return fn.apply(ctx, args || []); } catch (e) { NK.reportError(e, where); return undefined; }
  };

  // ---------------------------------------------------------------- registry
  // Game files register what they define. Re-registering (a live patch) replaces it.
  var defs = Object.create(null);
  var sceneDefs = Object.create(null);
  var changed = null; // Set while a patch is being applied
  NK.def = function (name, value) {
    defs[name] = value;
    if (changed) changed.defs.push(name);
    return value;
  };
  NK.use = function (name) {
    if (!(name in defs)) throw new Error('NK.use("' + name + '"): nothing defined with that name');
    return defs[name];
  };
  NK.has = function (name) { return name in defs; };
  NK.scene = function (key, def) {
    if (def === undefined) return sceneDefs[key];
    sceneDefs[key] = def;
    if (changed) changed.scenes.push(key);
    NK.emit("scene:defined", key, def);
    return def;
  };
  NK.scenes = function () { return Object.assign({}, sceneDefs); };
  var gameConfig = {};
  NK.config = function (cfg) {
    if (cfg === undefined) return gameConfig;
    gameConfig = Object.assign({}, gameConfig, cfg);
    if (changed) changed.config = true;
    return gameConfig;
  };
  /** Mutable run state (score, lives, level...). Survives live patches and scene restarts. */
  NK.run = {};
  NK.resetRun = function (initial) { NK.run = Object.assign({}, initial || gameConfig.run || {}); NK.emit("run:reset", NK.run); return NK.run; };

  // ------------------------------------------------------------ random (seeded)
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry32(12345);
  NK.rng = {
    seed: function (s) { rnd = mulberry32(s >>> 0); },
    float: function (a, b) { var r = rnd(); return a === undefined ? r : a + r * ((b === undefined ? 1 : b) - a); },
    int: function (a, b) { return Math.floor(a + rnd() * (b - a + 1)); },
    pick: function (arr) { return arr[Math.floor(rnd() * arr.length)]; },
    chance: function (p) { return rnd() < p; },
  };

  // ------------------------------------------------------------ fixed stepper
  /** Deterministic fixed-step clock: advance(realSeconds) calls step(dt) 0..maxSteps times. */
  function FixedStep(hz, step, maxSteps) {
    this.dt = 1 / (hz || 60);
    this.step = step;
    this.max = maxSteps || 5;
    this.acc = 0;
    this.ticks = 0;
  }
  FixedStep.prototype.advance = function (seconds) {
    this.acc += Math.min(seconds, 0.25);
    var n = 0;
    while (this.acc >= this.dt && n < this.max) {
      this.step(this.dt, this.ticks++);
      this.acc -= this.dt;
      n++;
    }
    if (n === this.max) this.acc = 0; // too slow: drop time rather than spiral
    return this.acc / this.dt; // interpolation alpha
  };
  NK.FixedStep = FixedStep;

  // ------------------------------------------------------------ settings + saves
  var gameId = function () { return (NK.game && NK.game.id) || gameConfig.id || "game"; };
  var store = {
    get: function (k) { try { var v = global.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { global.localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
  };
  NK.storage = store;
  var SETTINGS_DEFAULTS = { music: 0.6, sfx: 0.9, muted: false, touch: "auto", quality: "auto", vibration: true, showFps: false };
  var settings = null;
  NK.settings = {
    all: function () {
      if (!settings) settings = Object.assign({}, SETTINGS_DEFAULTS, store.get("nk:" + gameId() + ":settings") || {});
      return settings;
    },
    get: function (k) { return NK.settings.all()[k]; },
    set: function (k, v) {
      var s = NK.settings.all();
      if (typeof k === "object") Object.assign(s, k); else s[k] = v;
      store.set("nk:" + gameId() + ":settings", s);
      NK.emit("settings", s);
      return s;
    },
  };
  NK.save = {
    load: function (slot, defaults) {
      var v = store.get("nk:" + gameId() + ":save:" + (slot || "main"));
      return v ? Object.assign({}, defaults || {}, v.data) : defaults ? Object.assign({}, defaults) : null;
    },
    store: function (slot, data) {
      var rec = { data: data, at: Date.now(), v: 1 };
      store.set("nk:" + gameId() + ":save:" + (slot || "main"), rec);
      NK.emit("save", slot || "main", data);
      if (NK.platform.adapter && NK.platform.adapter.saves) NK.guard(NK.platform.adapter.saves.put, null, [slot || "main", rec], "cloud save");
      return true;
    },
    clear: function (slot) { store.del("nk:" + gameId() + ":save:" + (slot || "main")); },
    /** Best-score helper: returns {best, isNew}. */
    best: function (key, score, lowerIsBetter) {
      var k = "nk:" + gameId() + ":best:" + key;
      var prev = store.get(k);
      var isNew = prev === null || (lowerIsBetter ? score < prev : score > prev);
      if (isNew && score !== undefined) store.set(k, score);
      return { best: isNew && score !== undefined ? score : prev, isNew: isNew && score !== undefined };
    },
  };

  // ------------------------------------------------------------------ assets
  // Library ids ("kenney/new-platformer-pack/sfx-coin") resolve to URLs under the asset
  // base through a lock file ({id: catalog entry}) that the studio writes for the ids a game uses.
  var lock = Object.create(null);
  var manifest = Object.create(null);
  var EXT_BY_TYPE = { image: ["png", "webp", "jpg", "svg"], atlas: ["png", "webp"], spritesheet: ["png", "webp"], tileset: ["png", "webp"], audio: ["ogg", "mp3", "wav"], music: ["ogg", "mp3"], model: ["glb", "gltf"], animation: ["glb"], tilemap: ["json", "tmj"], font: ["ttf", "woff2", "woff", "otf"], json: ["json"] };
  function joinUrl(base, rel) {
    if (/^(https?:|data:|blob:|\/)/.test(rel)) return rel;
    return base.replace(/\/?$/, "/") + rel;
  }
  var extOf = function (p) { return String(p).split("?")[0].split(".").pop().toLowerCase(); };
  /** Files of a catalog entry as {ext: path-or-url}. Library format: {files:{primary, alternates:{ext:path}}, url, urls:{ext:url}}. */
  function entryFiles(e) {
    var out = {};
    if (!e) return out;
    var skip = { licence: 1, license: 1, preview: 1 };
    var f = e.files || e.formats;
    if (f && typeof f.primary === "string") {
      out[extOf(f.primary)] = f.primary;
      Object.keys(f.alternates || {}).forEach(function (k) { if (!skip[k] && typeof f.alternates[k] === "string") out[k.toLowerCase()] = f.alternates[k]; });
    } else if (Array.isArray(f)) f.forEach(function (x) { var p = typeof x === "string" ? x : x.path || x.url || x.src; if (p) out[(x.format || x.ext || extOf(p)).toLowerCase()] = p; });
    else if (f && typeof f === "object") Object.keys(f).forEach(function (k) { var v = f[k]; if (!skip[k]) out[k.toLowerCase()] = typeof v === "string" ? v : v.path || v.url || v.src; });
    // Absolute URLs from the catalog win (they already include /game-assets/).
    if (typeof e.url === "string") out[extOf(e.url)] = e.url;
    Object.keys(e.urls || {}).forEach(function (k) { if (!skip[k] && typeof e.urls[k] === "string") out[k.toLowerCase()] = e.urls[k]; });
    ["path", "src", "file"].forEach(function (k) { if (typeof e[k] === "string" && !out[extOf(e[k])]) out[extOf(e[k])] = e[k]; });
    return out;
  }
  /** Library "kind" → loader type. */
  function kindType(e, files) {
    var k = e && (e.type || e.kind);
    if (!k) return null;
    if (k === "sfx" || k === "music" || k === "audio" || k === "voice") return "audio";
    if (k === "spritesheet") return files.xml || files.json ? "atlas" : "spritesheet";
    if (k === "tileset") return files.xml || files.json ? "atlas" : "tileset";
    if (k === "animation") return files.glb ? "animation" : "spritesheet";
    if (k === "sprite" || k === "icon" || k === "background" || k === "texture" || k === "image" || k === "ui") return "image";
    return k;
  }
  function gridOf(e) {
    var m = (e && (e.grid || e.frameGrid || e.metrics)) || null;
    if (!m) return null;
    var w = m.frameWidth || m.tileWidth, hh = m.frameHeight || m.tileHeight;
    return w && hh ? { frameWidth: w, frameHeight: hh, spacing: m.spacing || 0, margin: m.margin || 0, columns: m.columns, frames: typeof m.frames === "number" ? m.frames : undefined, fps: m.fps } : null;
  }
  var audioProbe = null;
  function canPlay(ext) {
    if (!audioProbe) try { audioProbe = doc.createElement("audio"); } catch (e) { return ext === "mp3"; }
    var mime = { ogg: 'audio/ogg; codecs="vorbis"', mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", opus: 'audio/ogg; codecs="opus"', webm: "audio/webm" }[ext];
    return !!(mime && audioProbe.canPlayType && audioProbe.canPlayType(mime));
  }
  NK.assets = {
    base: "/game-assets/",
    lock: function (entries) {
      if (Array.isArray(entries)) entries.forEach(function (e) { lock[e.id] = e; });
      else Object.keys(entries || {}).forEach(function (id) { lock[id] = Object.assign({ id: id }, entries[id]); });
      return lock;
    },
    entry: function (id) { return lock[id] || null; },
    /** Declares what the game loads: {key: "library/id" | {id, type, ...}}. Merges with earlier calls. */
    define: function (m) {
      Object.keys(m).forEach(function (key) {
        var v = typeof m[key] === "string" ? { id: m[key] } : Object.assign({}, m[key]);
        v.key = key;
        manifest[key] = v;
      });
      if (changed) changed.assets = true;
      NK.emit("assets:defined", m);
      return manifest;
    },
    manifest: function () { return manifest; },
    /** Normalised entry for a manifest key or a library id: {key,id,type,urls:{ext:url},grid,frames,meta}. */
    resolve: function (keyOrId) {
      var m = manifest[keyOrId] || { id: keyOrId, key: keyOrId };
      var e = (m.id && lock[m.id]) || null;
      var files = entryFiles(e);
      var own = {}; // page-relative files the game ships itself ({url} / {files}) — not under the library base
      if (m.url) own[m.url.split("?")[0].split(".").pop().toLowerCase()] = m.url;
      if (m.files) Object.assign(own, entryFiles({ files: m.files }));
      Object.assign(files, own);
      var type = m.type || kindType(e, files) || guessType(files, m.id);
      if (!Object.keys(files).length && m.id) {
        (EXT_BY_TYPE[type] || ["png"]).slice(0, type === "atlas" ? 1 : 2).forEach(function (ext) { files[ext] = m.id + "." + ext; });
        if (type === "atlas") files.xml = m.id + ".xml";
      }
      var urls = {};
      var base = m.base || NK.assets.base;
      Object.keys(files).forEach(function (ext) { urls[ext] = own[ext] ? own[ext] : joinUrl(base, files[ext]); });
      return { key: m.key, id: m.id, type: type, kind: e && e.kind, urls: urls, grid: m.grid || gridOf(e), frames: (e && (e.frames || (e.metrics && e.metrics.frameNames))) || null, animations: m.animations || (e && (e.animations || (e.metrics && e.metrics.animations))) || null, meta: e || {}, opts: m };
    },
    /** URL of a library id or manifest key, picking the first available of the given extensions. */
    url: function (keyOrId, exts) {
      var r = NK.assets.resolve(keyOrId);
      exts = exts ? [].concat(exts) : Object.keys(r.urls);
      for (var i = 0; i < exts.length; i++) if (r.urls[exts[i]]) return r.urls[exts[i]];
      return null;
    },
    /** Best playable audio URL for this browser (ogg, then mp3...). */
    audioUrl: function (keyOrId) {
      var r = NK.assets.resolve(keyOrId);
      var order = ["ogg", "mp3", "m4a", "wav", "webm", "opus"];
      for (var i = 0; i < order.length; i++) if (r.urls[order[i]] && canPlay(order[i])) return r.urls[order[i]];
      return r.urls.mp3 || r.urls.ogg || r.urls.wav || null;
    },
    byType: function (types) {
      types = [].concat(types);
      return Object.keys(manifest).map(NK.assets.resolve).filter(function (r) { return types.indexOf(r.type) >= 0; });
    },
  };
  function guessType(files, id) {
    if (files.glb || files.gltf) return "model";
    if (files.xml || files.atlas) return "atlas";
    if (files.ogg || files.mp3 || files.wav) return "audio";
    if (files.json || files.tmj) return "tilemap";
    if (files.ttf || files.woff2) return "font";
    if (id && /(sfx|sound|music|audio)/.test(id)) return "audio";
    return "image";
  }

  // ------------------------------------------------------------------- audio
  // Web Audio with music/sfx channels. Context is created on the first user gesture,
  // so browsers never block it; sounds requested before then are skipped (music waits).
  var A = { ctx: null, master: null, music: null, sfx: null, buffers: Object.create(null), pending: Object.create(null), current: null, wanted: null, unlocked: false };
  function applyVolumes() {
    if (!A.ctx) return;
    var s = NK.settings.all();
    A.master.gain.value = s.muted ? 0 : 1;
    A.music.gain.value = s.music;
    A.sfx.gain.value = s.sfx;
  }
  function decodeCtx() {
    if (A.ctx) return A.ctx;
    if (!A.decoder) { var O = global.OfflineAudioContext || global.webkitOfflineAudioContext; A.decoder = O ? new O(2, 1, 44100) : null; }
    return A.decoder;
  }
  NK.audio = {
    get ctx() { return A.ctx; },
    get channels() { return { master: A.master, music: A.music, sfx: A.sfx }; },
    get unlocked() { return A.unlocked; },
    unlock: function () {
      if (A.unlocked) return;
      var C = global.AudioContext || global.webkitAudioContext;
      if (!C) return;
      try {
        A.ctx = A.ctx || new C();
        A.master = A.ctx.createGain(); A.master.connect(A.ctx.destination);
        A.music = A.ctx.createGain(); A.music.connect(A.master);
        A.sfx = A.ctx.createGain(); A.sfx.connect(A.master);
        applyVolumes();
        if (A.ctx.state === "suspended") A.ctx.resume();
        A.unlocked = true;
        NK.emit("audio:unlocked", A.ctx);
        if (A.wanted) NK.audio.music(A.wanted.key, A.wanted.opts);
      } catch (e) { NK.reportError(e, "audio unlock"); }
    },
    /** Loads one sound by manifest key or library id. Resolves to the AudioBuffer (or null). */
    load: function (key, url) {
      if (A.buffers[key]) return Promise.resolve(A.buffers[key]);
      if (A.pending[key]) return A.pending[key];
      url = url || NK.assets.audioUrl(key);
      if (!url) return Promise.resolve(null);
      A.pending[key] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
        return r.arrayBuffer();
      }).then(function (data) {
        var c = decodeCtx();
        if (!c) return null;
        return new Promise(function (res, rej) { c.decodeAudioData(data, res, rej); });
      }).then(function (buf) { A.buffers[key] = buf; return buf; })
        .catch(function (e) { NK.reportError(e, "audio " + key); return null; });
      return A.pending[key];
    },
    loadAll: function (onProgress) {
      var list = NK.assets.byType(["audio", "music"]);
      var done = 0;
      return Promise.all(list.map(function (r) {
        return NK.audio.load(r.key).then(function () { done++; if (onProgress) onProgress(done / list.length); });
      }));
    },
    has: function (key) { return !!A.buffers[key]; },
    _buffer: function (key) { return A.buffers[key] || null; },
    /** Plays a sound effect: play("coin", {volume, rate, detune, loop, channel, at}) → handle {stop}. */
    play: function (key, o) {
      o = o || {};
      if (!A.unlocked || !A.buffers[key]) { if (!A.buffers[key] && manifest[key]) NK.audio.load(key); return { stop: function () {}, gain: null }; }
      var src = A.ctx.createBufferSource();
      src.buffer = A.buffers[key];
      src.loop = !!o.loop;
      if (o.rate) src.playbackRate.value = o.rate;
      if (o.detune && src.detune) src.detune.value = o.detune;
      var g = A.ctx.createGain();
      g.gain.value = o.volume === undefined ? 1 : o.volume;
      src.connect(g);
      g.connect(o.output || (o.channel === "music" ? A.music : A.sfx));
      src.start(A.ctx.currentTime + (o.delay || 0));
      return { source: src, gain: g, stop: function (fade) { try { if (fade) { g.gain.setTargetAtTime(0, A.ctx.currentTime, fade / 3); src.stop(A.ctx.currentTime + fade); } else src.stop(); } catch (e) { /* already stopped */ } } };
    },
    /** Starts (or crossfades to) a looping music track. Waits for the first tap if audio is locked. */
    music: function (key, o) {
      o = o || {};
      if (!manifest[key] && !A.buffers[key]) { NK.reportError(new Error('Music "' + key + '" is not declared in NK.assets.define'), "audio"); return; }
      A.wanted = { key: key, opts: o };
      if (!A.unlocked) return;
      if (A.current && A.current.key === key) return;
      NK.audio.stopMusic(o.fade === undefined ? 0.6 : o.fade);
      NK.audio.load(key).then(function (buf) {
        if (!buf || !A.wanted || A.wanted.key !== key) return;
        var h = NK.audio.play(key, { loop: o.loop !== false, channel: "music", volume: 0 });
        h.gain.gain.setTargetAtTime(o.volume === undefined ? 1 : o.volume, A.ctx.currentTime, (o.fade === undefined ? 0.6 : o.fade) / 3);
        h.key = key;
        A.current = h;
      });
    },
    stopMusic: function (fade) {
      if (A.current) { A.current.stop(fade === undefined ? 0.4 : fade); A.current = null; }
      if (fade === -1) A.wanted = null;
    },
    mute: function (m) { NK.settings.set("muted", m === undefined ? !NK.settings.get("muted") : !!m); return NK.settings.get("muted"); },
    suspend: function () { if (A.ctx && A.ctx.state === "running") A.ctx.suspend(); },
    resume: function () { if (A.ctx && A.ctx.state === "suspended") A.ctx.resume(); },
  };
  NK.on("settings", applyVolumes);
  ["pointerdown", "keydown", "touchend", "mousedown"].forEach(function (ev) {
    global.addEventListener(ev, function () { NK.audio.unlock(); }, { capture: true, passive: true });
  });
  NK.vibrate = function (ms) { if (NK.settings.get("vibration") && navigator.vibrate) try { navigator.vibrate(ms || 30); } catch (e) { /* not allowed */ } };

  // ------------------------------------------------------------------- input
  // Actions are named ("jump", "left"...) and bound to keys (KeyboardEvent.code),
  // gamepad buttons ("pad:0"...), touch controls ("touch:jump") and mouse ("mouse:0").
  var DEFAULT_BINDINGS = {
    left: ["ArrowLeft", "KeyA", "pad:14"], right: ["ArrowRight", "KeyD", "pad:15"],
    up: ["ArrowUp", "KeyW", "pad:12"], down: ["ArrowDown", "KeyS", "pad:13"],
    jump: ["Space", "ArrowUp", "KeyW", "pad:0", "touch:jump"], action: ["KeyJ", "KeyE", "Enter", "pad:2", "touch:action"],
    run: ["ShiftLeft", "ShiftRight", "pad:1", "pad:7"], pause: ["Escape", "KeyP", "pad:9", "touch:pause"],
    fire: ["KeyK", "mouse:0", "pad:5", "touch:fire"],
  };
  var bindings = {};
  var actions = Object.create(null); // name -> {down, pressed, released, sources:Set}
  var heldSources = Object.create(null); // source -> true
  var axesTouch = { moveX: 0, moveY: 0 };
  var look = { dx: 0, dy: 0 };
  var pointer = { x: 0, y: 0, down: false };
  var padState = [];
  function act(name) { return actions[name] || (actions[name] = { down: false, pressed: false, released: false }); }
  function refresh(name) {
    var a = act(name), was = a.down, list = bindings[name] || [];
    var down = false;
    for (var i = 0; i < list.length; i++) if (heldSources[list[i]]) { down = true; break; }
    if (down && !was) { a.pressed = true; NK.emit("input:pressed", name); }
    if (!down && was) a.released = true;
    a.down = down;
  }
  function sourceChanged(src) { Object.keys(bindings).forEach(function (n) { if (bindings[n].indexOf(src) >= 0) refresh(n); }); }
  function setSource(src, on) { if (!!heldSources[src] === on) return; if (on) heldSources[src] = true; else delete heldSources[src]; sourceChanged(src); }
  var typingTarget = function (t) { return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable); };
  global.addEventListener("keydown", function (e) {
    if (typingTarget(e.target)) return;
    NK.input.lastDevice = "keyboard";
    if (/^(Arrow|Space)/.test(e.code) && NK.input.capture) e.preventDefault();
    setSource(e.code, true);
  });
  global.addEventListener("keyup", function (e) { setSource(e.code, false); });
  global.addEventListener("blur", function () { Object.keys(heldSources).forEach(function (s) { if (s.indexOf("touch:") !== 0) setSource(s, false); }); });
  global.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch") NK.input.lastDevice = "touch"; else if (NK.input.lastDevice !== "gamepad") NK.input.lastDevice = "mouse";
    pointer.down = true; pointer.x = e.clientX; pointer.y = e.clientY;
    if (e.pointerType === "mouse" && e.target && e.target.tagName === "CANVAS") setSource("mouse:" + e.button, true);
  });
  global.addEventListener("pointerup", function (e) { pointer.down = false; if (e.pointerType === "mouse") setSource("mouse:" + e.button, false); });
  global.addEventListener("pointermove", function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY;
    if (doc.pointerLockElement) { look.dx += e.movementX || 0; look.dy += e.movementY || 0; }
  });
  NK.input = {
    capture: true,
    lastDevice: "keyboard",
    pointer: pointer,
    bindings: function () { return bindings; },
    /** bind("fire", ["KeyF", "pad:5", "touch:fire"]) adds sources; bind({...}) merges a map. */
    bind: function (name, sources) {
      if (typeof name === "object") { Object.keys(name).forEach(function (n) { NK.input.bind(n, name[n]); }); return; }
      bindings[name] = (bindings[name] || []).concat(sources).filter(function (s, i, arr) { return arr.indexOf(s) === i; });
      refresh(name);
    },
    unbind: function (name) { delete bindings[name]; delete actions[name]; },
    down: function (name) { return act(name).down; },
    pressed: function (name) { return act(name).pressed; },
    released: function (name) { return act(name).released; },
    /** -1..1 from keys/dpad, gamepad left stick and the touch joystick. Names: moveX, moveY, lookX, lookY. */
    axis: function (name) {
      var v = 0;
      if (name === "moveX") v = (act("right").down ? 1 : 0) - (act("left").down ? 1 : 0);
      else if (name === "moveY") v = (act("down").down ? 1 : 0) - (act("up").down ? 1 : 0);
      var p = padState[0];
      if (p) {
        var idx = { moveX: 0, moveY: 1, lookX: 2, lookY: 3 }[name];
        if (idx !== undefined && Math.abs(p.axes[idx] || 0) > 0.2) v = p.axes[idx];
      }
      if (axesTouch[name]) v = axesTouch[name];
      return clamp(v, -1, 1);
    },
    /** Camera look delta since the last call (mouse with pointer lock / drag, right stick, touch drag). */
    look: function () {
      var r = { dx: look.dx, dy: look.dy };
      var p = padState[0];
      if (p) { if (Math.abs(p.axes[2] || 0) > 0.15) r.dx += p.axes[2] * 12; if (Math.abs(p.axes[3] || 0) > 0.15) r.dy += p.axes[3] * 12; }
      look.dx = 0; look.dy = 0;
      return r;
    },
    addLook: function (dx, dy) { look.dx += dx; look.dy += dy; },
    setTouchAxis: function (name, v) { axesTouch[name] = v; },
    setSource: setSource,
    /** Reads gamepads. Kits call this once per frame. */
    poll: function () {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      padState = [];
      for (var i = 0; i < pads.length; i++) {
        var p = pads[i];
        if (!p || !p.connected) continue;
        padState.push(p);
        for (var b = 0; b < p.buttons.length; b++) {
          var on = p.buttons[b].pressed;
          if (on) NK.input.lastDevice = "gamepad";
          setSource("pad:" + b, on);
        }
      }
    },
    /** Clears one-step edges (pressed/released). Kits call this after each fixed step. */
    endStep: function () { for (var n in actions) { actions[n].pressed = false; actions[n].released = false; } },
    reset: function () { Object.keys(heldSources).forEach(function (s) { setSource(s, false); }); axesTouch.moveX = axesTouch.moveY = 0; NK.input.endStep(); },
  };
  NK.input.bind(DEFAULT_BINDINGS);
  NK.on("input:pressed", function (name) { if (name === "pause" && NK.state.current === "play") NK.pause(); else if (name === "pause" && NK.state.current === "pause") NK.resume(); });

  // --------------------------------------------------------------- overlay UI
  var CSS = [
    ".nk-root{position:fixed;inset:0;overflow:hidden;background:var(--nk-bg,#10141f);touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}",
    ".nk-stage{position:absolute;inset:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}",
    ".nk-stage>canvas,.nk-stage>div>canvas{display:block}",
    ".nk-ui{position:absolute;inset:0;pointer-events:none;font-family:'Kenney Future',system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff;z-index:10}",
    ".nk-ui *{box-sizing:border-box}",
    ".nk-screen{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:auto;background:rgba(8,10,20,.55);backdrop-filter:blur(2px);animation:nkfade .18s ease-out}",
    ".nk-panel{min-width:min(340px,86vw);max-width:92vw;padding:26px 26px 22px;border-radius:18px;background:linear-gradient(#2c3550,#1c2236);box-shadow:0 10px 0 #12162a,0 18px 40px rgba(0,0,0,.45);text-align:center;border:3px solid #3d4970}",
    ".nk-panel h1{margin:0 0 6px;font-size:clamp(26px,6vw,44px);letter-spacing:1px;text-shadow:0 4px 0 #12162a}",
    ".nk-panel p{margin:4px 0 16px;opacity:.85;font-size:15px;line-height:1.4;font-family:system-ui,sans-serif}",
    ".nk-btn{display:block;width:100%;margin:10px 0 0;padding:13px 18px;border:0;border-radius:12px;font:inherit;font-size:18px;color:#fff;cursor:pointer;background:#3e8ef7;box-shadow:0 5px 0 #2559a8;transition:transform .06s}",
    ".nk-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #2559a8}",
    ".nk-btn.alt{background:#4a5577;box-shadow:0 5px 0 #2d3550}.nk-btn.ok{background:#3fb06b;box-shadow:0 5px 0 #26774a}",
    ".nk-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;font-family:system-ui,sans-serif;font-size:15px}",
    ".nk-row input[type=range]{flex:1;max-width:180px;accent-color:#3e8ef7}",
    ".nk-hud{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;align-items:flex-start;padding:calc(10px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 0 calc(12px + env(safe-area-inset-left));font-size:clamp(14px,3.8vw,22px);text-shadow:0 2px 0 #000,0 0 6px rgba(0,0,0,.6)}",
    ".nk-hud .nk-hud-item{display:flex;align-items:center;gap:6px;margin-right:16px}.nk-hud img{width:28px;height:28px}",
    ".nk-iconbtn{pointer-events:auto;width:44px;height:44px;border-radius:12px;border:0;background:rgba(0,0,0,.35);color:#fff;font:inherit;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center}",
    ".nk-iconbtn img{width:30px;height:30px}",
    ".nk-toast{position:absolute;left:50%;bottom:calc(18% + env(safe-area-inset-bottom));transform:translateX(-50%);padding:10px 18px;border-radius:12px;background:rgba(10,12,24,.85);font-size:16px;white-space:nowrap;animation:nkfade .2s ease-out;font-family:system-ui,sans-serif}",
    ".nk-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--nk-bg,#10141f);pointer-events:auto;font-size:20px}",
    ".nk-bar{width:min(320px,70vw);height:14px;border-radius:8px;background:#2a3047;overflow:hidden}.nk-bar>i{display:block;height:100%;width:0;background:#3e8ef7;transition:width .15s}",
    ".nk-touch{position:absolute;inset:0;pointer-events:none;z-index:9}",
    ".nk-touch .nk-t{position:absolute;pointer-events:auto;touch-action:none;opacity:.85}",
    ".nk-touch img{width:100%;height:100%;display:block;pointer-events:none;-webkit-user-drag:none}",
    ".nk-touch .nk-t.on{opacity:1;filter:brightness(1.25)}",
    ".nk-touch .nk-fallback{width:100%;height:100%;border-radius:50%;background:rgba(255,255,255,.18);border:3px solid rgba(255,255,255,.55)}",
    ".nk-touch .nk-icon{position:absolute;inset:22%;width:56%!important;height:56%!important}",
    ".nk-touch .nk-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;text-shadow:0 2px 0 #000}",
    ".nk-orient{position:absolute;left:50%;bottom:calc(40% + env(safe-area-inset-bottom));transform:translateX(-50%);padding:8px 14px;border-radius:10px;background:rgba(10,12,24,.8);font-size:13px;font-family:system-ui,sans-serif;white-space:nowrap}",
    ".nk-fps{position:absolute;right:8px;bottom:8px;font:12px monospace;background:rgba(0,0,0,.5);padding:2px 6px;border-radius:4px}",
    "@keyframes nkfade{from{opacity:0}to{opacity:1}}",
  ].join("\n");
  var uiRoot = null;
  function ensureUi() {
    if (uiRoot) return uiRoot;
    if (!doc.getElementById("nk-game-css")) {
      var st = doc.createElement("style"); st.id = "nk-game-css"; st.textContent = CSS; doc.head.appendChild(st);
    }
    var host = NK.root();
    uiRoot = doc.createElement("div");
    uiRoot.className = "nk-ui";
    host.appendChild(uiRoot);
    return uiRoot;
  }
  /** The game's root element (#nk-game or a created one). Kits mount the canvas into NK.stage(). */
  NK.root = function () {
    var el = doc.getElementById("nk-game");
    if (!el) { el = doc.createElement("div"); el.id = "nk-game"; doc.body.appendChild(el); }
    if (!el.classList.contains("nk-root")) {
      el.classList.add("nk-root");
      if (!doc.getElementById("nk-game-css")) { var st = doc.createElement("style"); st.id = "nk-game-css"; st.textContent = CSS; doc.head.appendChild(st); }
    }
    return el;
  };
  NK.stage = function () {
    var root = NK.root();
    var s = root.querySelector(".nk-stage");
    if (!s) { s = doc.createElement("div"); s.className = "nk-stage"; root.insertBefore(s, root.firstChild); }
    return s;
  };
  function h(tag, attrs, kids) {
    var el = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") el.textContent = attrs[k];
      else if (k === "onclick") el.addEventListener("click", function (e) { e.stopPropagation(); NK.audio.play("ui-click"); attrs[k](e); });
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === "string" ? doc.createTextNode(c) : c); });
    return el;
  }
  var screens = Object.create(null);
  NK.ui = {
    h: h,
    root: ensureUi,
    /** Modal screen: screen("pause", {title, text, buttons:[{label, onClick, style:"ok"|"alt"}]}). */
    screen: function (id, o) {
      NK.ui.close(id);
      var panel = h("div", { class: "nk-panel" }, [o.title ? h("h1", { text: o.title }) : null, o.text ? h("p", { text: o.text }) : null]);
      (o.content || []).forEach(function (c) { panel.appendChild(c); });
      (o.buttons || []).forEach(function (b) { panel.appendChild(h("button", { class: "nk-btn " + (b.style || ""), "data-nk-action": b.id || b.label, onclick: b.onClick }, [b.label])); });
      var el = h("div", { class: "nk-screen", "data-nk-screen": id }, [panel]);
      ensureUi().appendChild(el);
      screens[id] = el;
      var first = panel.querySelector("button");
      if (first && NK.input.lastDevice !== "touch") try { first.focus({ preventScroll: true }); } catch (e) { /* old browser */ }
      return el;
    },
    close: function (id) {
      if (id === undefined) { Object.keys(screens).forEach(NK.ui.close); return; }
      if (screens[id]) { screens[id].remove(); delete screens[id]; }
    },
    isOpen: function (id) { return id ? !!screens[id] : Object.keys(screens).length > 0; },
    toast: function (text, ms) {
      var t = h("div", { class: "nk-toast", text: text });
      ensureUi().appendChild(t);
      setTimeout(function () { t.remove(); }, ms || 1800);
    },
    loading: function (p, label) {
      var el = ensureUi().querySelector(".nk-loading");
      if (p === false || p >= 1.0001) { if (el) el.remove(); return; }
      if (!el) { el = h("div", { class: "nk-loading" }, [h("div", { text: label || (NK.game && NK.game.title) || "Loading" }), h("div", { class: "nk-bar" }, [h("i")])]); ensureUi().appendChild(el); }
      el.querySelector("i").style.width = Math.round(clamp(p, 0, 1) * 100) + "%";
    },
    /** Settings panel (shared by both kits). onClose runs when it closes. */
    settings: function (onClose) {
      var s = NK.settings.all();
      var slider = function (label, key) {
        var input = h("input", { type: "range", min: "0", max: "1", step: "0.05", "data-nk-setting": key });
        input.value = s[key];
        input.addEventListener("input", function () { NK.settings.set(key, parseFloat(input.value)); });
        return h("label", { class: "nk-row" }, [h("span", { text: label }), input]);
      };
      var toggle = function (label, key, values, names) {
        var b = h("button", { class: "nk-btn alt", style: "width:auto;margin:0;padding:8px 14px;font-size:14px", "data-nk-setting": key });
        var show = function () { b.textContent = names[values.indexOf(NK.settings.get(key))] || String(NK.settings.get(key)); };
        b.addEventListener("click", function (e) { e.stopPropagation(); var i = (values.indexOf(NK.settings.get(key)) + 1) % values.length; NK.settings.set(key, values[i]); show(); });
        show();
        return h("div", { class: "nk-row" }, [h("span", { text: label }), b]);
      };
      NK.ui.screen("settings", {
        title: "Settings",
        content: [
          slider("Music", "music"), slider("Sound effects", "sfx"),
          toggle("Sound", "muted", [false, true], ["On", "Muted"]),
          toggle("Touch controls", "touch", ["auto", "on", "off"], ["Auto", "On", "Off"]),
          toggle("Quality", "quality", ["auto", "high", "medium", "low"], ["Auto", "High", "Medium", "Low"]),
          toggle("Vibration", "vibration", [true, false], ["On", "Off"]),
        ],
        buttons: [{ label: "Done", style: "ok", onClick: function () { NK.ui.close("settings"); if (onClose) onClose(); } }],
      });
    },
    /** DOM HUD (used by the 3D kit; 2D games draw HUD in Phaser). hud.set("score", 10). */
    hud: function (items) {
      var old = ensureUi().querySelector(".nk-hud"); if (old) old.remove();
      var left = h("div", { style: "display:flex;flex-wrap:wrap" }), right = h("div", { style: "display:flex;gap:8px" });
      var bar = h("div", { class: "nk-hud" }, [left, right]);
      var vals = {};
      (items || []).forEach(function (it) {
        var icon = it.icon ? h("img", { src: NK.assets.url(it.icon, ["png", "webp", "svg"]) || it.icon, alt: "" }) : null;
        var v = h("span", { "data-nk-hud": it.key, text: it.value === undefined ? "" : String(it.value) });
        vals[it.key] = v;
        left.appendChild(h("div", { class: "nk-hud-item" }, [icon, it.label ? h("span", { text: it.label + " " }) : null, v]));
      });
      var pause = h("button", { class: "nk-iconbtn", "aria-label": "Pause", "data-nk-action": "pause", onclick: function () { NK.pause(); } }, [pauseIcon()]);
      right.appendChild(pause);
      ensureUi().appendChild(bar);
      return { el: bar, set: function (k, val) { if (vals[k]) vals[k].textContent = String(val); }, remove: function () { bar.remove(); } };
    },
    orientationHint: function (want) {
      var shown = null;
      var check = function () {
        var el = ensureUi().querySelector(".nk-orient");
        var portrait = global.innerHeight > global.innerWidth;
        var mobile = NK.device.touch;
        var bad = mobile && ((want === "landscape" && portrait) || (want === "portrait" && !portrait));
        var key = portrait ? "p" : "l";
        if (bad && !el && shown !== key) {
          shown = key;
          el = h("div", { class: "nk-orient", text: want === "landscape" ? "Turn your phone sideways for a bigger view" : "Hold your phone upright for a bigger view" });
          ensureUi().appendChild(el);
          setTimeout(function () { el.remove(); }, 5000); // a hint, not a blocker
        }
        if (!bad && el) el.remove();
        if (!bad) shown = null;
      };
      global.addEventListener("resize", check);
      check();
      try { if (screen.orientation && screen.orientation.lock && doc.fullscreenElement) screen.orientation.lock(want).catch(function () {}); } catch (e) { /* unsupported */ }
    },
  };
  function pauseIcon() {
    var url = NK.assets.url("kenney/mobile-controls/icon-pause", ["png"]);
    if (url && NK.assets.entry("kenney/mobile-controls/icon-pause")) return h("img", { src: url, alt: "" });
    return h("span", { text: "II" });
  }

  // ------------------------------------------------------------ device + perf
  var coarse = global.matchMedia ? global.matchMedia("(pointer: coarse)").matches : false;
  NK.device = {
    touch: coarse || (navigator.maxTouchPoints || 0) > 0 && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
    mobile: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || coarse,
    cores: navigator.hardwareConcurrency || 4,
    memory: navigator.deviceMemory || 4,
    dpr: global.devicePixelRatio || 1,
  };
  var perf = { fps: 0, frameMs: 0, frames: 0, last: now(), worst: 0, samples: [] };
  NK.perf = perf;
  (function rafLoop() {
    var t0 = now();
    function tick() {
      var t = now();
      var d = t - t0; t0 = t;
      perf.frames++;
      if (d > perf.worst) perf.worst = d;
      if (t - perf.last >= 1000) {
        perf.fps = Math.round((perf.frames * 1000) / (t - perf.last));
        perf.frameMs = Math.round(((t - perf.last) / perf.frames) * 10) / 10;
        perf.samples.push(perf.fps); if (perf.samples.length > 30) perf.samples.shift();
        perf.worstMs = Math.round(perf.worst); perf.worst = 0;
        perf.frames = 0; perf.last = t;
        NK.emit("perf", perf);
        var f = uiRoot && uiRoot.querySelector(".nk-fps");
        if (NK.settings.get("showFps")) { if (!f) { f = h("div", { class: "nk-fps" }); ensureUi().appendChild(f); } f.textContent = perf.fps + " fps"; } else if (f) f.remove();
      }
      global.requestAnimationFrame(tick);
    }
    if (global.requestAnimationFrame) global.requestAnimationFrame(tick);
  })();

  // ------------------------------------------------------------ touch controls
  var touchCfg = null, touchEl = null;
  function imgOrFallback(id, cls) {
    var url = id && NK.assets.entry(id) ? NK.assets.url(id, ["png", "webp", "svg"]) : null;
    if (!url && id && NK.touch.assetsBaseOk) url = NK.assets.url(id, ["png"]);
    if (url) { var i = h("img", { src: url, alt: "", draggable: "false" }); if (cls) i.className = cls; return i; }
    return h("div", { class: cls === "nk-icon" ? "" : "nk-fallback" });
  }
  NK.touch = {
    assetsBaseOk: false,
    /**
     * setup({stick:"left"|"arrows"|false, buttons:[{action:"jump", icon:"kenney/mobile-controls/icon-jump", label}], look:true})
     * Shows Kenney mobile-control art; falls back to plain circles if those assets are not in the lock.
     */
    setup: function (cfg) { touchCfg = cfg || {}; NK.touch.refresh(); },
    visible: function () {
      var mode = NK.settings.get("touch");
      return !!touchCfg && (mode === "on" || (mode === "auto" && (NK.device.touch || NK.input.lastDevice === "touch")));
    },
    refresh: function () {
      if (touchEl) { touchEl.remove(); touchEl = null; }
      NK.input.setTouchAxis("moveX", 0); NK.input.setTouchAxis("moveY", 0);
      if (!NK.touch.visible() || !(NK.state.current === "play")) return;
      var cfg = touchCfg;
      touchEl = h("div", { class: "nk-touch", "data-nk-touch": "1" });
      var size = Math.round(clamp(Math.min(global.innerWidth, global.innerHeight) * 0.3, 110, 170));
      var pad = "calc(18px + env(safe-area-inset-bottom))";
      var stick = cfg.stick === undefined ? "left" : cfg.stick;
      if (stick === "left") {
        var base = h("div", { class: "nk-t", "data-nk-control": "stick", style: "left:calc(18px + env(safe-area-inset-left));bottom:" + pad + ";width:" + size + "px;height:" + size + "px" }, [imgOrFallback(cfg.stickPad || "kenney/mobile-controls/joystick-circle-pad-a")]);
        var nubSize = Math.round(size * 0.46);
        var nub = h("div", { style: "position:absolute;left:50%;top:50%;width:" + nubSize + "px;height:" + nubSize + "px;margin:-" + nubSize / 2 + "px 0 0 -" + nubSize / 2 + "px;pointer-events:none" }, [imgOrFallback(cfg.stickNub || "kenney/mobile-controls/joystick-circle-nub-a")]);
        base.appendChild(nub);
        bindStick(base, nub, size);
        touchEl.appendChild(base);
      } else if (stick === "arrows") {
        var bs = Math.round(size * 0.62);
        [["left", "direction-left", 0], ["right", "direction-right", bs + 14]].forEach(function (d) {
          var b = h("div", { class: "nk-t", "data-nk-control": d[0], style: "left:calc(" + (18 + d[2]) + "px + env(safe-area-inset-left));bottom:" + pad + ";width:" + bs + "px;height:" + bs + "px" }, [imgOrFallback("kenney/mobile-controls/" + d[1])]);
          bindButton(b, "touch:" + d[0]);
          touchEl.appendChild(b);
        });
        NK.input.bind("left", ["touch:left"]); NK.input.bind("right", ["touch:right"]);
      }
      (cfg.buttons || [{ action: "jump", icon: "kenney/mobile-controls/icon-jump" }]).forEach(function (b, i) {
        var bs = Math.round(size * (i === 0 ? 0.66 : 0.52));
        var right = 18 + (i === 0 ? 0 : i === 1 ? Math.round(size * 0.72) : 0);
        var bottom = i === 2 ? Math.round(size * 0.74) : 0;
        var el = h("div", { class: "nk-t", "data-nk-control": b.action, style: "right:calc(" + right + "px + env(safe-area-inset-right));bottom:calc(" + (18 + bottom) + "px + env(safe-area-inset-bottom));width:" + bs + "px;height:" + bs + "px" }, [imgOrFallback(b.art || "kenney/mobile-controls/button-circle")]);
        if (b.icon) el.appendChild(imgOrFallback(b.icon, "nk-icon"));
        if (b.label) el.appendChild(h("div", { class: "nk-label", text: b.label }));
        NK.input.bind(b.action, ["touch:" + b.action]);
        bindButton(el, "touch:" + b.action);
        touchEl.appendChild(el);
      });
      if (cfg.look) bindLookArea(touchEl);
      ensureUi();
      NK.root().appendChild(touchEl);
    },
  };
  function bindButton(el, src) {
    var ids = {};
    var set = function () { var on = Object.keys(ids).length > 0; el.classList.toggle("on", on); setSource(src, on); };
    el.addEventListener("pointerdown", function (e) { e.preventDefault(); NK.input.lastDevice = "touch"; ids[e.pointerId] = 1; try { el.setPointerCapture(e.pointerId); } catch (x) { /* synthetic */ } set(); NK.vibrate(12); });
    var up = function (e) { delete ids[e.pointerId]; set(); };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("lostpointercapture", up);
  }
  function bindStick(base, nub, size) {
    var id = null, cx = 0, cy = 0, r = size * 0.42;
    var move = function (e) {
      var dx = e.clientX - cx, dy = e.clientY - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d > r) { dx = (dx / d) * r; dy = (dy / d) * r; }
      nub.style.transform = "translate(" + dx + "px," + dy + "px)";
      var ax = dx / r, ay = dy / r;
      NK.input.setTouchAxis("moveX", Math.abs(ax) < 0.15 ? 0 : ax);
      NK.input.setTouchAxis("moveY", Math.abs(ay) < 0.15 ? 0 : ay);
      setSource("touch:left", ax < -0.4); setSource("touch:right", ax > 0.4);
      setSource("touch:up", ay < -0.5); setSource("touch:down", ay > 0.5);
    };
    base.addEventListener("pointerdown", function (e) {
      e.preventDefault(); NK.input.lastDevice = "touch";
      id = e.pointerId; var rc = base.getBoundingClientRect(); cx = rc.left + rc.width / 2; cy = rc.top + rc.height / 2;
      try { base.setPointerCapture(id); } catch (x) { /* synthetic */ }
      base.classList.add("on"); move(e);
    });
    base.addEventListener("pointermove", function (e) { if (e.pointerId === id) move(e); });
    var end = function (e) {
      if (e.pointerId !== id) return; id = null; base.classList.remove("on"); nub.style.transform = "";
      NK.input.setTouchAxis("moveX", 0); NK.input.setTouchAxis("moveY", 0);
      ["left", "right", "up", "down"].forEach(function (d) { setSource("touch:" + d, false); });
    };
    base.addEventListener("pointerup", end); base.addEventListener("pointercancel", end);
    NK.input.bind({ left: ["touch:left"], right: ["touch:right"], up: ["touch:up"], down: ["touch:down"] });
  }
  function bindLookArea(layer) {
    var area = h("div", { class: "nk-t", "data-nk-control": "look", style: "left:40%;right:0;top:15%;bottom:40%;opacity:0" });
    var id = null, lx = 0, ly = 0;
    area.addEventListener("pointerdown", function (e) { id = e.pointerId; lx = e.clientX; ly = e.clientY; try { area.setPointerCapture(id); } catch (x) { /* synthetic */ } });
    area.addEventListener("pointermove", function (e) { if (e.pointerId !== id) return; NK.input.addLook((e.clientX - lx) * 1.6, (e.clientY - ly) * 1.6); lx = e.clientX; ly = e.clientY; });
    area.addEventListener("pointerup", function () { id = null; });
    layer.insertBefore(area, layer.firstChild);
  }
  NK.on("settings", function () { NK.touch.refresh(); });

  // --------------------------------------------------------------- lifecycle
  // boot → menu → play ⇄ pause → over → (menu | play). Kits map states to scenes/overlays.
  var STATES = ["boot", "menu", "play", "pause", "over"];
  NK.state = {
    current: "boot",
    data: {},
    go: function (to, data) {
      if (STATES.indexOf(to) < 0) throw new Error("Unknown game state " + to);
      var from = NK.state.current;
      NK.state.current = to;
      NK.state.data = data || {};
      if (to !== "pause") NK.input.reset();
      NK.emit("state", to, from, NK.state.data);
      NK.emit("state:" + to, NK.state.data, from);
      NK.touch.refresh();
      return to;
    },
  };
  NK.start = function (data) { NK.resetRun(); NK.state.go("play", data); };
  NK.menu = function () { NK.state.go("menu"); };
  NK.pause = function () { if (NK.state.current === "play") NK.state.go("pause"); };
  NK.resume = function () { if (NK.state.current === "pause") NK.state.go("play", { resumed: true }); };
  /** Ends the run: gameOver({win, score}). Records best score + leaderboard (stub). */
  NK.gameOver = function (result) {
    result = result || {};
    if (result.score !== undefined) {
      var b = NK.save.best("score", result.score);
      result.best = b.best; result.newBest = b.isNew;
      NK.platform.leaderboard.submit("default", result.score);
    }
    NK.state.go("over", result);
  };
  var pauseOnBlur = function () { return gameConfig.pauseOnBlur !== false && !NK.studio.enabled; };
  doc.addEventListener("visibilitychange", function () {
    if (doc.hidden) { NK.audio.suspend(); if (gameConfig.pauseOnBlur !== false) NK.pause(); } else NK.audio.resume();
  });
  global.addEventListener("blur", function () { if (pauseOnBlur()) NK.pause(); });

  // --------------------------------------------------------- platform hooks
  // Stubs that work offline (localStorage). The platform later plugs an adapter in with
  // NK.platform.use({user, signIn, leaderboard:{submit,top}, achievements:{unlock,list}, saves:{get,put}}).
  NK.platform = {
    adapter: null,
    use: function (adapter) { NK.platform.adapter = adapter; NK.emit("platform", adapter); },
    user: function () { var a = NK.platform.adapter; return a && a.user ? Promise.resolve(a.user()) : Promise.resolve(null); },
    signIn: function () { var a = NK.platform.adapter; if (a && a.signIn) return Promise.resolve(a.signIn()); NK.ui.toast("Accounts are coming soon"); return Promise.resolve(null); },
    leaderboard: {
      submit: function (board, score, meta) {
        var a = NK.platform.adapter;
        if (a && a.leaderboard) return Promise.resolve(a.leaderboard.submit(board, score, meta));
        var k = "nk:" + gameId() + ":lb:" + board, list = store.get(k) || [];
        list.push({ score: score, at: Date.now(), name: "You" }); list.sort(function (x, y) { return y.score - x.score; });
        store.set(k, list.slice(0, 20));
        return Promise.resolve({ rank: list.findIndex(function (x) { return x.score === score; }) + 1 });
      },
      top: function (board, n) {
        var a = NK.platform.adapter;
        if (a && a.leaderboard) return Promise.resolve(a.leaderboard.top(board, n));
        return Promise.resolve((store.get("nk:" + gameId() + ":lb:" + board) || []).slice(0, n || 10));
      },
    },
    achievements: {
      unlock: function (id, title) {
        var a = NK.platform.adapter;
        var k = "nk:" + gameId() + ":ach", got = store.get(k) || {};
        if (got[id]) return Promise.resolve(false);
        got[id] = Date.now(); store.set(k, got);
        NK.ui.toast("Achievement: " + (title || id));
        NK.emit("achievement", id);
        return Promise.resolve(a && a.achievements ? a.achievements.unlock(id) : true);
      },
      list: function () { return Promise.resolve(Object.keys(store.get("nk:" + gameId() + ":ach") || {})); },
    },
  };

  // ------------------------------------------------------- file loader/boot
  // A game is: game.json {id,title,kit,files:[...],assetsBase} + JS files that call
  // NK.config / NK.assets.define / NK.def / NK.scene, + assets.lock.json.
  // Published pages may inline files as <script type="text/nk-file" data-path="...">.
  var files = Object.create(null); // path -> source
  var fileOrder = [];
  NK.files = function () { return fileOrder.map(function (p) { return { path: p, size: (files[p] || "").length }; }); };
  /** Text of a game file the runtime holds (inlined, fetched or live-patched), e.g. a level JSON; null if unknown. */
  NK.fileText = function (path) { path = String(path || "").replace(/^\.\//, ""); return files[path] !== undefined ? files[path] : null; };
  function execFile(path, code) {
    files[path] = code;
    if (/\.json$/.test(path)) return applyJson(path, code);
    var s = doc.createElement("script");
    s.textContent = code + "\n//# sourceURL=nk-game/" + path;
    s.setAttribute("data-nk-file", path);
    NK._loadingPath = path;
    var before = NK.errors.length;
    doc.head.appendChild(s);
    s.remove();
    NK._loadingPath = null;
    return NK.errors.length === before;
  }
  function applyJson(path, code) {
    var data;
    try { data = JSON.parse(code); } catch (e) { NK.reportError(e, path); return false; }
    var base = path.split("/").pop();
    if (base === "assets.lock.json") { NK.assets.lock(data); if (changed) changed.assets = true; }
    else if (base === "game.json") { applyGameJson(data); }
    else NK.def("json:" + path, data);
    return true;
  }
  function applyGameJson(g) {
    NK.game = Object.assign(NK.game || {}, g);
    if (g.assetsBase) NK.assets.base = g.assetsBase;
    (g.files || []).forEach(function (p) { if (fileOrder.indexOf(p) < 0) fileOrder.push(p); });
  }
  function fetchText(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status + " loading " + url); return r.text(); });
  }
  /**
   * Boots a game: NK.boot() reads inline <script type="text/nk-file"> blocks if present,
   * else fetches game.json (+ every listed file, + assets.lock.json) next to the page.
   */
  NK.boot = function (opts) {
    opts = opts || {};
    NK.studio.init();
    var overlay = NK.studio.enabled ? NK.studio.loadOverlay() : null;
    var inline = doc.querySelectorAll('script[type="text/nk-file"]');
    var p;
    if (inline.length) {
      p = Promise.resolve().then(function () {
        Array.prototype.forEach.call(inline, function (s) {
          var path = s.getAttribute("data-path");
          if (path === "game.json") applyGameJson(JSON.parse(s.textContent)); else { files[path] = s.textContent; if (fileOrder.indexOf(path) < 0 && !/\.json$/.test(path)) fileOrder.push(path); }
          if (/assets\.lock\.json$/.test(path)) NK.assets.lock(JSON.parse(s.textContent));
        });
      });
    } else {
      var base = opts.base || "./";
      p = fetchText(base + (opts.project || "game.json")).then(function (t) {
        applyGameJson(JSON.parse(t));
        return fetchText(base + "assets.lock.json").then(function (lt) { files["assets.lock.json"] = lt; NK.assets.lock(JSON.parse(lt)); }, function () { /* no lock file: ids fall back to <base><id>.<ext> */ });
      }).then(function () {
        return Promise.all(fileOrder.map(function (path) {
          if (overlay && overlay.files[path] !== undefined) return null;
          return fetchText(base + path).then(function (t) { files[path] = t; });
        }));
      });
    }
    return p.then(function () {
      if (overlay) Object.keys(overlay.files).forEach(function (path) {
        files[path] = overlay.files[path];
        if (/\.json$/.test(path)) applyJson(path, overlay.files[path]);
        else if (fileOrder.indexOf(path) < 0) fileOrder.push(path);
      });
      if (NK.game && NK.game.id) settings = null;
      fileOrder.forEach(function (path) { if (files[path] !== undefined) execFile(path, files[path]); });
      if (!NK.driver) throw new Error("No game kit loaded (include nk-game-2d or nk-game-3d before NK.boot)");
      NK.emit("boot", NK.game);
      return NK.driver.start(gameConfig, overlay && overlay.snapshot);
    }).then(function () {
      NK.studio.ready();
    }).catch(function (e) { NK.reportError(e, "boot"); NK.studio.ready(); });
  };

  // ----------------------------------------------------- studio live bridge
  // The Game Studio iframes the game with ?nk-studio and posts
  //   {type:"nk-game:patch", id, files:{path:source}, remove:[paths], code, reload, step}
  // The page applies it without a reload when it can (scene restart with the player kept),
  // else reloads with the patched files + a snapshot kept in sessionStorage.
  // It reports {type:"nk-game:status", fps, frameMs, errors, scene, state, step} every second.
  var studio = {
    enabled: false,
    origins: [],
    parentOrigin: null,
    step: null,
    init: function () {
      if (studio._init) return; studio._init = true;
      var q = global.location.search + global.location.hash;
      studio.enabled = /[?&#]nk-studio\b/.test(q) || global.NK_STUDIO === true;
      if (!studio.enabled) return;
      studio.origins = [global.location.origin];
      var meta = doc.querySelector('meta[name="nk-studio-origin"]');
      if (meta) studio.origins = studio.origins.concat(meta.content.split(/[\s,]+/));
      if (global.NK_STUDIO_ORIGINS) studio.origins = studio.origins.concat(global.NK_STUDIO_ORIGINS);
      global.addEventListener("message", studio.onMessage);
      setInterval(studio.status, 1000);
      NK.on("error", function () { studio.status(); });
    },
    post: function (msg) {
      if (!studio.enabled || global.parent === global) return;
      var target = studio.parentOrigin || (doc.referrer ? new URL(doc.referrer).origin : global.location.origin);
      if (studio.origins.indexOf(target) < 0) target = global.location.origin;
      try { global.parent.postMessage(msg, target); } catch (e) { /* parent gone */ }
    },
    ready: function () {
      studio.post({ type: "nk-game:ready", kit: NK.driver && NK.driver.name, version: NK.version, files: fileOrder.slice(), scene: NK.driver && NK.driver.currentScene && NK.driver.currentScene(), state: NK.state.current, step: studio.step });
      studio.status();
    },
    status: function () {
      var errs = errorQueue.splice(0, errorQueue.length);
      studio.post({ type: "nk-game:status", fps: perf.fps, frameMs: perf.frameMs, worstMs: perf.worstMs || 0, errors: errs, errorCount: NK.errors.length, scene: NK.driver && NK.driver.currentScene ? NK.driver.currentScene() : null, state: NK.state.current, step: studio.step, kit: NK.driver && NK.driver.name, stats: NK.driver && NK.driver.stats ? NK.driver.stats() : null });
    },
    onMessage: function (e) {
      if (e.source !== global.parent || studio.origins.indexOf(e.origin) < 0) return;
      var m = e.data;
      if (!m || typeof m !== "object" || typeof m.type !== "string" || m.type.indexOf("nk-game:") !== 0) return;
      studio.parentOrigin = e.origin;
      if (m.type === "nk-game:patch") studio.applyPatch(m);
      else if (m.type === "nk-game:ping") studio.ready();
      else if (m.type === "nk-game:command") {
        var c = m.command;
        if (c === "pause") NK.pause(); else if (c === "resume") NK.resume(); else if (c === "start") NK.start(m.data); else if (c === "menu") NK.menu();
        else if (c === "reload") global.location.reload();
        else if (c === "settings") NK.settings.set(m.data || {});
        studio.status();
      }
    },
    applyPatch: function (m) {
      var t0 = now();
      var errBefore = NK.errors.length;
      changed = { files: [], defs: [], scenes: [], config: false, assets: false, removed: [] };
      if (m.step !== undefined) studio.step = m.step;
      var paths = Object.keys(m.files || {});
      // game.json first (it may add files), then the rest in game.json order.
      paths.sort(function (a, b) { var ga = /game\.json$/.test(a) ? -1 : 0, gb = /game\.json$/.test(b) ? -1 : 0; return ga - gb || (fileOrder.indexOf(a) + 1 || 1e6) - (fileOrder.indexOf(b) + 1 || 1e6); });
      (m.remove || []).forEach(function (p) { delete files[p]; var i = fileOrder.indexOf(p); if (i >= 0) fileOrder.splice(i, 1); changed.removed.push(p); });
      paths.forEach(function (p) {
        if (!/\.json$/.test(p) && fileOrder.indexOf(p) < 0) fileOrder.push(p);
        changed.files.push(p);
        execFile(p, m.files[p]);
      });
      if (m.code) { changed.files.push("(code)"); execFile("studio-snippet.js", m.code); delete files["studio-snippet.js"]; }
      var c = changed; changed = null;
      studio.saveOverlay(m.files, m.remove);
      var finish = function (mode) {
        studio.post({ type: "nk-game:patched", id: m.id, step: studio.step, ok: NK.errors.length === errBefore, mode: mode, ms: Math.round(now() - t0), errors: NK.errors.slice(errBefore), scene: NK.driver && NK.driver.currentScene && NK.driver.currentScene() });
        studio.status();
      };
      if (m.reload || !NK.driver || !NK.driver.hotReload) return studio.reload(finish);
      Promise.resolve().then(function () { return NK.driver.hotReload(c); }).then(function (res) {
        if (res === "reload") studio.reload(finish); else finish("hot");
      }, function (e) { NK.reportError(e, "hot reload"); studio.reload(finish); });
    },
    reload: function (finish) {
      var snap = null;
      try { snap = NK.driver && NK.driver.snapshot ? NK.driver.snapshot() : null; } catch (e) { snap = null; }
      var o = studio.readOverlay() || { files: {} };
      o.snapshot = snap; o.run = NK.run; o.step = studio.step;
      studio.writeOverlay(o);
      finish("reload");
      setTimeout(function () { global.location.reload(); }, 30);
    },
    readOverlay: function () {
      try { return JSON.parse(global.sessionStorage.getItem("nk-studio-overlay:" + global.location.pathname) || "null"); } catch (e) { return null; }
    },
    writeOverlay: function (o) {
      try { global.sessionStorage.setItem("nk-studio-overlay:" + global.location.pathname, JSON.stringify(o)); } catch (e) { /* storage full */ }
    },
    saveOverlay: function (newFiles, removed) {
      var o = studio.readOverlay() || { files: {} };
      Object.keys(newFiles || {}).forEach(function (p) { o.files[p] = newFiles[p]; });
      (removed || []).forEach(function (p) { delete o.files[p]; });
      o.step = studio.step;
      studio.writeOverlay(o);
    },
    /** At boot: patched files from earlier in this tab, plus the run state/snapshot a reload kept (used once). */
    loadOverlay: function () {
      var o = studio.readOverlay();
      if (!o) return null;
      if (o.run) NK.run = o.run;
      if (o.step !== undefined) studio.step = o.step;
      var used = { files: o.files || {}, snapshot: o.snapshot || null };
      delete o.run; delete o.snapshot;
      studio.writeOverlay(o);
      return used;
    },
    clearOverlay: function () { try { global.sessionStorage.removeItem("nk-studio-overlay:" + global.location.pathname); } catch (e) { /* blocked */ } },
  };
  NK.studio = studio;
})(typeof window !== "undefined" ? window : this);
