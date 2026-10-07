// Play scene: the colony, the camera rig, the HUD, building placement, the rover run, the economy and the
// objective chain. Run state lives in NK.run (survives live edits): resources, sol, finished objectives and
// every building the player placed (rebuilt on scene restart).
NK.scene("Game", class extends NK3D.Scene {
  create() {
    const L = (this.L = NK.use("level")), run = NK.run;
    run.built = run.built || []; run.done = run.done || {}; run.trips = run.trips || 0; run.tickT = run.tickT || 0;
    NK.rng.seed(L.seed);

    // ---- world
    this.terrain = NK.use("buildTerrain")(this, L);
    this.colony = NK.use("buildColony")(this, L, this.terrain);
    this.solids = this.colony.solids;
    this.fx = NK.use("Effects")(this);
    this.rover = NK.use("Rover")(this, Object.assign({ trip: L.deposit.trip }, L.rover));
    this.people = L.people.map((p) => NK.use("Astronaut")(this, p));
    this.rig = NK.use("CameraRig")(this, Object.assign({ bounds: L.bounds, onTap: (x, y, b, t) => this.tap(x, y, b, t), onHover: (x, y) => this.hover(x, y) }, L.camera));
    this.solarCount = L.solar.arrays.length;
    this.storage = 0;
    this.timers = [];
    this.turrets = [];
    this.buildSocket();
    this.meteors = NK.use("Meteors")(this, {
      level: L, turrets: () => this.turrets,
      onShot: (p) => { this.fx.sparkle(p.x, p.y, p.z, 12); this.gain("crystals", 15); NK.audio.play("sfx-laser", { volume: 0.6 }); },
      onImpact: (p) => {
        this.fx.puff(p.x, p.z, 1.6); NK.audio.play("sfx-impact", { volume: 0.7 });
        if (!NK.settings.get("reduceMotion")) this.rig.shake = 0.5;
        if (!run.meteorHint) { run.meteorHint = true; NK.ui.toast("Meteor! A Defense turret shoots them down for crystals", 3200); }
      },
    });

    // ---- interface
    this.hud = NK.use("Hud")(this, {
      buildings: L.buildings,
      onSelect: (id) => this.select(id), onRotate: () => { this.place.rotate(); this.place.check(); this.syncPlacing(); }, onCancel: () => this.select(null), onConfirm: () => this.confirm(),
    });
    this.hud.setThumbs(NK.use("renderThumbs")(this.world, L.buildings.map((b) => b.id), "#2f3550"));
    this.place = NK.use("Placement")(this, { level: L, terrain: this.terrain, solids: this.solids, socket: () => (run.done.power ? null : this.colony.socket), have: () => run });
    this.structures = [
      { x: L.base.hub.x, z: L.base.hub.z, r: 5, kind: "hub" }, ...L.base.spine.map((s) => ({ x: s.x, z: s.z, r: s.kind === "tunnel" ? 1.6 : 3.6, kind: s.kind })),
      { x: L.base.pad.x, z: L.base.pad.z, r: 7, kind: "pad" }, ...L.solar.arrays.map((a) => ({ x: a.x, z: a.z, r: 2.2, kind: "solar" })),
      { x: L.base.dish.x, z: L.base.dish.z, r: 2, kind: "dish" }, ...L.base.tanks.map((t) => ({ x: t.x, z: t.z, r: 1.6, kind: "tank" })),
    ];
    this.minimap = NK.use("Minimap")(this, {
      hud: this.hud, rig: this.rig, rover: this.rover, ground: this.terrain.ground, yaw: L.camera.yaw, center: L.minimapCenter || [-1, -4], deposit: L.deposit,
      cable: L.solar.cable, powered: () => !!run.done.power, socket: () => (run.done.power ? null : this.colony.socket),
      rocks: L.boulders.map((b) => [b[1], b[2], b[4]]), structures: () => this.structures,
    });

    // ---- rover: tap it, then the crystals
    this.rover.onArrive = () => { const p = this.rover.object.position; this.fx.sparkle(p.x, 2, p.z, 10); NK.audio.play("sfx-mine", { volume: 0.7 }); };
    this.rover.onDeliver = (n) => this.deliver(n);
    this.depositPoint = new THREE.Vector3(L.deposit.x - L.deposit.r + 0.4, 0, L.deposit.z + 0.9);
    if (!run.done.rover) { this.rover.select(true); this.rover.preview(this.depositPoint); }

    // ---- keys: 1-5 build, R rotate, Esc cancels a build (P or the pause button pauses)
    NK.input.unbind("pause"); NK.input.bind("pause", ["KeyP", "pad:9", "touch:pause"]);
    NK.input.bind({ cancel: ["Escape"], rotate: ["KeyR"], b1: ["Digit1", "Numpad1"], b2: ["Digit2", "Numpad2"], b3: ["Digit3", "Numpad3"], b4: ["Digit4", "Numpad4"], b5: ["Digit5", "Numpad5"] });
    this.onDispose(NK.on("input:pressed", (name) => { if (name === "cancel" && NK.state.current === "pause") NK.resume(); }));

    // ---- restore what the player built (live edits and reloads keep the colony)
    for (const b of run.built) this.spawn(L.buildings.find((d) => d.id === b.id), b.x, b.z, b.rot, b.atSocket, true);
    if (run.done.power) this.powerOn(true);
    this.refreshHud();
    this.updateObjective(true);
    NK.audio.music("music", { volume: 0.5 });
    this.ready = true;
  }

  // ------------------------------------------------------------ socket marker (objective 1)
  buildSocket() {
    const s = this.colony.socket, P = NK.use("PALETTE");
    const g = new THREE.Group(); g.position.set(s.x, 0.02, s.z);
    this.socketRing = NK.use("groundRing")(2.1, 2.45, P.cyan, 0.9);
    g.add(this.socketRing, NK.use("groundRing")(0, 2.1, P.cyan, 0.12));
    const glow = NK.use("glowSprite")(P.cyan, 2.2); glow.position.y = 0.6; g.add(glow);
    this.add(g);
    this.socketMarker = g;
    this.solids.push({ x: s.x, z: s.z, r: 2.4, what: "socket" });
  }

  // ------------------------------------------------------------ input
  tap(x, y, button, type) {
    if (NK.state.current !== "play") return;
    const p = this.rig.groundAt(x, y);
    if (!p) return;
    if (button === 2) { this.select(null); return; }
    if (this.place.active) {
      const touch = type === "touch";
      if (touch && Math.hypot(p.x - this.place.pos.x, p.z - this.place.pos.z) > this.place.def.radius + 0.6) { this.place.moveTo(p.x, p.z); this.syncPlacing(); return; }
      if (!touch) this.place.moveTo(p.x, p.z);
      this.confirm();
      return;
    }
    const D = this.L.deposit;
    if (this.rover.hitTest(p)) {
      this.rover.select(!this.rover.selected);
      if (this.rover.selected) this.rover.preview(this.depositPoint); else this.rover.clearPreview();
      NK.audio.play("ui-click");
      return;
    }
    if (Math.hypot(p.x - D.x, p.z - D.z) < D.r + 1.5) { this.sendRover(); return; }
    if (this.rover.selected && this.rover.state === "idle") { this.rover.select(false); this.rover.clearPreview(); }
  }
  hover(x, y) {
    if (NK.state.current !== "play") return;
    const p = this.rig.groundAt(x, y);
    if (!p) return;
    if (this.place.active) { this.place.moveTo(p.x, p.z); this.syncPlacing(); }
    const D = this.L.deposit;
    const over = !this.place.active && (this.rover.hitTest(p) || Math.hypot(p.x - D.x, p.z - D.z) < D.r + 1.5);
    this.world.renderer.domElement.style.cursor = over ? "pointer" : "";
  }
  select(id) {
    const run = NK.run;
    if (!id || (this.place.active && this.place.def.id === id)) { this.place.cancel(); this.hud.setSelected(null); this.hud.setPlacing(null); return; }
    let at = this.rig.groundAt(innerWidth / 2, innerHeight * 0.45);
    if (id === "solar" && !run.done.power) { // guide objective 1: start the ghost on the socket and bring it into view
      at = new THREE.Vector3(this.colony.socket.x, 0, this.colony.socket.z);
      this.focus((at.x * 2 + this.rig.goal.x) / 3, (at.z * 2 + this.rig.goal.z) / 3);
    }
    this.place.start(id, at);
    this.hud.setSelected(id);
    this.syncPlacing();
    NK.audio.play("ui-click");
  }
  syncPlacing() {
    const d = this.place.def; if (!d) return;
    const touch = NK.input.lastDevice === "touch";
    const status = this.place.ok ? (this.place.atSocket ? "Connects the power line" : touch ? "Tap again or press Place" : "Click to place") : this.place.why;
    this.hud.setPlacing({ name: d.name, cost: d.cost, have: NK.run, desc: d.info, status, ok: this.place.ok, touch });
  }
  confirm() {
    const r = this.place.confirm();
    if (!r) { NK.audio.play("sfx-error", { volume: 0.6 }); this.syncPlacing(); return; }
    const run = NK.run;
    for (const k in r.def.cost) { run[k] -= r.def.cost[k]; this.hud.pop(k, -r.def.cost[k]); }
    run.built.push({ id: r.def.id, x: r.x, z: r.z, rot: r.rot, atSocket: r.atSocket });
    this.hud.setSelected(null); this.hud.setPlacing(null);
    this.spawn(r.def, r.x, r.z, r.rot, r.atSocket, false);
    this.refreshHud();
  }

  // ------------------------------------------------------------ building
  spawn(def, x, z, rot, atSocket, silent) {
    if (!def) return;
    const obj = NK.use("makeBuilding")(def.id);
    obj.position.set(x, 0, z); obj.rotation.y = (rot || 0) * Math.PI / 180;
    obj.add(NK.use("contactShadow")(def.radius * 0.95, 0.5));
    this.add(obj);
    this.solids.push({ x, z, r: def.radius, what: def.id });
    this.structures.push({ x, z, r: def.radius * 0.8, kind: def.id });
    if (def.id === "solar") this.solarCount++;
    if (def.id === "storage") this.storage++;
    if (def.id === "defense") this.turrets.push(obj);
    if (atSocket) this.socketMarker.visible = false;
    if (silent) return;
    this.fx.popIn(obj); this.fx.puff(x, z, def.radius);
    NK.audio.play("sfx-build", { volume: 0.8 });
    NK.run.score = (NK.run.score || 0) + 50;
    if (def.id === "habitat") this.newCrew(x, z, rot);
    if (def.id === "solar" && atSocket) this.powerOn(false);
    if (def.id === "oxygen") this.complete("oxygen");
    if (def.id === "habitat") this.complete("habitat");
  }
  newCrew(x, z, rot) {
    const a = (rot || 0) * Math.PI / 180, d = 3.8;
    const px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d;
    this.people.push(NK.use("Astronaut")(this, { x: px, z: pz, rot: rot || 0, anim: "walk", patrol: [[px, pz], [px + 2.5, pz + 1.5], [px - 1.5, pz + 2.5]] }));
  }
  powerOn(silent) {
    this.colony.cable.setPowered(true); this.colony.socketCable.setPowered(true);
    this.socketMarker.visible = false;
    if (!silent) { NK.audio.play("sfx-power", { volume: 0.8 }); this.complete("power"); }
  }
  sendRover() {
    if (this.rover.state !== "idle") { NK.ui.toast("The rover is already on a run"); return; }
    this.rover.send(this.depositPoint);
    NK.audio.play("sfx-send", { volume: 0.7 });
  }
  deliver(n) {
    const run = NK.run, got = Math.max(0, Math.min(n, this.cap() - run.crystals));
    run.crystals += got; run.trips++; run.score = (run.score || 0) + 25;
    this.hud.pop("crystals", got);
    const p = this.rover.object.position; this.fx.sparkle(p.x, 2.4, p.z, 10);
    NK.audio.play("sfx-deliver", { volume: 0.8 });
    if (got < n) NK.ui.toast("Storage full: build Storage");
    this.complete("rover");
    this.refreshHud();
  }

  // ------------------------------------------------------------ objectives
  complete(id) {
    const run = NK.run;
    if (run.done[id]) return;
    run.done[id] = true;
    const cur = this.L.objectives[run.objective];
    if (cur && cur.id === id) { this.hud.setObjective(cur.text, "Done", true); NK.audio.play("sfx-objective", { volume: 0.8 }); this.after(1.6, () => this.updateObjective()); }
    else this.updateObjective();
  }
  updateObjective(first) {
    const run = NK.run, list = this.L.objectives;
    let i = 0; while (i < list.length && run.done[list[i].id]) i++;
    if (i === run.objective && !first) return;
    run.objective = i;
    if (i >= list.length) {
      this.hud.setObjective("Colony established", "All systems online", true);
      if (!run.won) { run.won = true; NK.platform.achievements.unlock("colony", "Colony established"); this.after(2.4, () => NK.gameOver({ win: true, title: "Colony established", score: this.score() })); }
      return;
    }
    this.hud.setObjective(list[i].text, list[i].hint, false);
    if (!first) this.frameObjective(list[i].id);
    // the hint line opens for a few seconds when an objective starts, then folds into the compact one-line panel
    this.hud.openObjective(true); this.after(first ? 7 : 5, () => this.hud.openObjective(false));
  }
  /** Brings the next objective's target into view, above the toolbar (short phone screens get a bigger lift). */
  frameObjective(id) {
    const L = this.L, R = this.rover.object.position;
    const at = id === "power" ? [this.colony.socket.x, this.colony.socket.z]
      : id === "rover" ? [(R.x + L.deposit.x) / 2, (R.z + L.deposit.z) / 2]
      : [L.base.hub.x + 4, L.base.hub.z + 9];
    this.focus(at[0], at[1]);
  }
  focus(x, z) {
    const yaw = this.rig.yaw, lift = innerHeight < 520 ? 4 : 2; // move the target toward the camera = point sits higher on screen
    this.rig.lookAt(x + Math.sin(yaw) * lift, z + Math.cos(yaw) * lift);
  }
  score() { const r = NK.run; return Math.round((r.score || 0) + r.crystals + r.water + r.energy + r.trips * 10); }
  after(sec, fn) { this.timers.push({ t: sec, fn }); }

  // ------------------------------------------------------------ economy + time
  gain(k, n) { const run = NK.run, v = Math.max(0, Math.min(n, this.cap() - run[k])); run[k] += v; this.hud.pop(k, v); this.refreshHud(); return v; }
  cap() { return this.L.economy.cap + this.storage * this.L.economy.capPerStorage; }
  refreshHud() {
    const run = NK.run;
    this.hud.setResources(run, this.cap());
    this.hud.setSol(run.sol);
    const aff = {}; for (const b of this.L.buildings) aff[b.id] = Object.keys(b.cost).every((k) => run[k] >= b.cost[k]);
    this.hud.setAffordable(aff);
    if (this.place && this.place.active) { this.place.check(); this.syncPlacing(); }
  }
  fixedUpdate(dt) {
    const run = NK.run, E = this.L.economy;
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    for (let i = 0; i < 5; i++) if (NK.input.pressed("b" + (i + 1))) this.select(this.L.buildings[i].id);
    if (NK.input.pressed("rotate") && this.place.active) { this.place.rotate(); this.place.check(); this.syncPlacing(); }
    if (NK.input.pressed("cancel")) { if (this.place.active) this.select(null); else NK.pause(); }
    // economy tick: wired solar → energy, the extractor → water (capped by storage)
    run.tickT += dt;
    if (run.tickT >= E.tick) {
      run.tickT -= E.tick;
      const cap = this.cap();
      const add = (k, n) => { const v = Math.min(n, cap - run[k]); if (v > 0) { run[k] += v; this.hud.pop(k, v); } };
      if (run.done.power) add("energy", this.solarCount * E.solarPerTick);
      add("water", E.waterPerTick);
      this.refreshHud();
    }
    // meteor watch starts once the colony has power (a calm first minute)
    if (run.done.power) { run.meteorT = (run.meteorT || 0) + dt; if (run.meteorT >= E.meteorEvery && !this.meteors.active) { run.meteorT = 0; this.meteors.launch(); } }
    run.solT = (run.solT || 0) + dt;
    if (run.solT >= E.solPeriod) { run.solT -= E.solPeriod; run.sol++; this.hud.setSol(run.sol); NK.audio.play("sfx-sol", { volume: 0.5 }); }
  }
  update(dt) {
    const t = performance.now() / 1000;
    if (this.socketMarker.visible) { const s = 1 + Math.sin(t * 3) * 0.06; this.socketRing.scale.set(s, 1, s); }
    if (this.colony.depositGlow) this.colony.depositGlow.material.opacity = 0.28 + Math.sin(t * 1.7) * 0.08;
    this.mapT = (this.mapT || 0) - dt;
    if (this.mapT <= 0) { this.mapT = 0.1; this.minimap.draw(); }
  }
});
