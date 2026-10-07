// The playable scene: the village, the orthographic camera, villagers, HUD and building placement.
// Economy: a day lasts 20 s at normal speed; buildings produce at dawn. No fail state: Hearthvale only grows.
NK.scene("Game", class extends NK3D.Scene {
  create() {
    const L = NK.use("level"), BLD = NK.use("buildings");
    this.rig = NK.use("OrthoRig")(this, L.camera);
    const V = (this.village = NK.use("buildVillage")(this));
    this.people = NK.use("Villagers")(this, V);
    const icons = NK.use("renderIcons")(this.world, [
      { id: "wood", key: "log-stack", pitch: 28 }, { id: "stone", key: "stones" }, { id: "food", key: "crate-bread", pitch: 40 }, { id: "gold", key: "coin", pitch: 38 },
      { id: "pop", key: "farmer-a", pitch: 12, zoom: 0.62, yaw: 20 },
      { id: "b-house", key: "home" }, { id: "b-farm", key: "grain", pitch: 52, zoom: 0.95, extra: [["haybale", 0.35, 0.12, 0.45, 0.4, 1], ["haybale", -0.15, 0.12, 0.62, 1.2, 0.9], ["sack", 0.62, 0.2, 0.0, 0.3, 1.4]] }, { id: "b-windmill", key: "windmill" },
      { id: "b-lumber", key: "lumbermill" }, { id: "b-well", key: "well" }, { id: "b-bridge", key: "bridge", yaw: 55, pitch: 26, zoom: 1.0 },
    ]);
    const run = NK.run;
    if (run.speed === undefined) Object.assign(run, { speed: 1, t: 0, goal: 0, goalDone: false, goalT: 0, built: {}, pop: 0, cap: 0 });
    this.speed = run.speed;
    const self = this;
    // ---- economy
    const NAMES = { townhall: "Town Hall", house: "Cottage", market: "Market", windmill: "Windmill", stables: "Granary", lumber: "Lumber Camp", blacksmith: "Smithy", well: "Well", farm: "Farm", docks: "Dock", bridge: "Bridge" };
    const econ = {
      run: () => run,
      spend(cost) { for (const k of Object.keys(cost)) run[k] -= cost[k]; self.refresh(); },
      built(type, cell, bld) {
        run.built[type] = (run.built[type] || 0) + 1;
        if (type === "farm") { const W = V.HX; for (let j = 0; j < 6; j++) { const nb = V.cell(...W.neighbour(cell.c, cell.r, j)); if (nb && nb.building && nb.building.type === "windmill") run.farmByMill = true; } }
        self.float((NAMES[type] || "Building") + " built", cell.x, cell.z, 1.4);
        self.stats();
        self.refresh();
      },
      inspect(bld, cell) { self.float(NAMES[bld.type] || "Building", cell.x, cell.z, 2.2); },
    };
    this.econ = econ;
    this.hud = NK.use("Hud")(this, icons, {
      speed: (v) => this.setSpeed(v),
      tool: (t) => this.place.setTool(t),
    });
    this.place = NK.use("Placement")(this, V, this.rig, this.hud, econ);
    this.floats = [];
    this.stats();
    if (!run.pop) run.pop = Math.max(6, run.cap - 8);
    this.setSpeed(this.speed);
    this.goals = [
      { text: "Build a windmill", sub: "Pick it in the toolbar, then a green hex", done: () => (run.built.windmill || 0) > 0 },
      { text: "Plant a farm by a windmill", sub: "Fields beside a mill give extra food", done: () => !!run.farmByMill },
      { text: "Bridge the river again", sub: "Any straight stretch of water", done: () => (run.built.bridge || 0) > 0 },
      { text: "Grow to 60 villagers", sub: "Cottages make room for families", done: () => run.pop >= 60 },
    ];
    this.showGoal();
    this.refresh();
    NK.audio.music("music", { volume: 0.45 });
  }
  stats() {
    const V = this.village, run = NK.run;
    const n = (t) => V.buildings.filter((b) => b.type === t).length;
    run.homes = n("house");
    run.cap = 4 + run.homes * 4;
    let mills = 0;
    for (const b of V.buildings) if (b.type === "windmill") {
      mills += 2;
      for (let j = 0; j < 6; j++) { const nb = V.cell(...V.HX.neighbour(b.cell.c, b.cell.r, j)); if (nb && nb.kind === "field") mills += 1; }
    }
    run.income = { gold: 2 + run.homes + n("well") * 1, food: V.cells ? [...V.cells.values()].filter((c) => c.kind === "field").length * 2 + mills : 0, wood: 2 + n("lumber") * 3, stone: 2 };
  }
  setSpeed(v) { this.speed = v; NK.run.speed = v; this.hud.speed(v); }
  refresh() { this.hud.set(NK.run); this.hud.afford(NK.run); }
  showGoal() {
    const g = this.goals[Math.min(NK.run.goal, this.goals.length - 1)];
    if (NK.run.goal >= this.goals.length) this.hud.goal("Hearthvale is thriving", "Keep building as you like", true);
    else this.hud.goal(g.text, g.sub, NK.run.goalDone);
  }
  /** A label that floats up from a spot in the world (building names, day income). */
  float(text, x, z, life) {
    const el = NK.ui.h("div", { class: "hv-float", text });
    this.hud.root.appendChild(el);
    this.floats.push({ el, p: new THREE.Vector3(x, 1.9, z), t: 0, life: life || 1.6 });
  }
  newDay() {
    const run = NK.run;
    run.day += 1;
    this.stats();
    for (const k of Object.keys(run.income)) run[k] += run.income[k];
    if (run.pop < run.cap) run.pop = Math.min(run.cap, run.pop + 2);
    NK.audio.play("sfx-coins", { volume: 0.35 });
    this.refresh();
    if (this.place.tool) this.place.preview(this.place.st.cell);
  }
  update(dt) {
    const run = NK.run;
    const sdt = dt * this.speed; // village time (0 when the time controls are paused)
    this.rig.update(dt);
    this.village.update(sdt);
    this.people.update(sdt, dt);
    this.place.update(dt);
    this.hud.update(dt);
    run.t += sdt;
    if (run.t >= 20) { run.t -= 20; this.newDay(); }
    // goals
    const g = this.goals[run.goal];
    if (g && !run.goalDone && g.done()) { run.goalDone = true; run.goalT = 2.6; this.showGoal(); NK.audio.play("sfx-goal", { volume: 0.7 }); if (run.goal === this.goals.length - 1) NK.platform.achievements.unlock("thriving", "Hearthvale is thriving"); }
    if (run.goalDone && run.goalT > 0) { run.goalT -= dt; if (run.goalT <= 0) { run.goal += 1; run.goalDone = false; this.showGoal(); } }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      const s = this.rig.toScreen(f.p);
      f.el.style.left = s.x + "px";
      f.el.style.top = s.y - f.t * 16 + "px";
      f.el.style.opacity = String(Math.min(1, (f.life - f.t) * 2.5));
      if (f.t >= f.life) { f.el.remove(); this.floats.splice(i, 1); }
    }
  }
});
