// Play scene: the flooded hall. Knight + mage start south of the channel; two skeletons guard the vault.
// Objective: Find the vault → Defeat its guards → Open the vault (walk up to the chest). 0 hearts = game over.
NK.scene("Game", class extends NK3D.Scene {
  create() {
    const T = THREE, run = NK.run, cfg = NK.config();
    const lvl = NK.use("buildLevel")(this);
    const L = lvl.L;
    this.lvl = lvl;
    this.fx = NK.use("FX")(this);
    this.player = NK.use("Hero")(this, L.start, this.fx);
    this.mage = NK.use("Mage")(this, L.mageStart, this.player, this.fx, lvl.lights);
    this.foes = [NK.use("Skeleton")(this, "warrior", L.guards.warrior, this.player, this.fx), NK.use("Skeleton")(this, "archer", L.guards.archer, this.player, this.fx)];
    this.rig = NK.use("IsoRig")(this, this.player, Object.assign({}, cfg.camera, { bounds: L.bounds }));
    this.world.shadowFollow = this.player;
    lvl.lights.vault = new T.Vector3(L.vault.chest[0], 2.4, L.vault.chest[2] + 1.8);
    this.hud = NK.use("Hud")(this);
    this.timers = [];
    this.elapsed = run.elapsed || 0;
    this.seen = run.seen || {};
    this.vaultOpen = run.vault === "open";
    if (this.vaultOpen && lvl.lid) lvl.lid.rotation.x = -1.25;
    // already-defeated guards stay defeated across live edits
    (run.slain || []).forEach((k) => { const f = this.foes.find((x) => x.kind === k); if (f) { f.alive = false; f.object.visible = false; f.teleport([0, -40, 0]); f.state2.gone = true; f.state2.mode = "dead"; } });
    this.refreshHud();

    // combat wiring ------------------------------------------------------------------------------------------
    this.onDispose(NK.on("hero:strike", (hero, reach, arc) => {
      let landed = 0;
      for (const f of this.foes) {
        if (!f.alive) continue;
        const d = f.object.position.clone().sub(hero.object.position).setY(0);
        let a = Math.atan2(d.x, d.z) - hero.facing; a = Math.atan2(Math.sin(a), Math.cos(a));
        if (d.length() < reach + 0.4 && Math.abs(a) < arc) { if (f.hit(1, hero.object.position, "sword")) landed++; }
      }
      if (landed) { this.hitstop(0.07); this.rig.shake = 0.12; }
    }));
    this.onDispose(NK.on("hero:blocked", (p) => {
      NK.audio.play("sfx-block", { volume: 0.8, rate: NK.rng.float(0.95, 1.08) });
      this.fx.emit({ at: p.clone ? p.clone().setY(Math.max(1, p.y)) : this.player.front(0.8).setY(1.2), n: 14, color: 0xcfe4ff, speed: 5, life: 0.35, size: 0.9 });
      this.hud.press("block", true); this.later(0.15, () => this.hud.press("block", NK.input.down("block")));
    }));
    this.onDispose(NK.on("hero:hurt", () => { this.refreshHud(true); this.rig.shake = 0.18; }));
    this.onDispose(NK.on("hero:potion", () => { this.refreshHud(true); this.hud.press("potion", true); this.later(0.2, () => this.hud.press("potion", false)); }));
    this.onDispose(NK.on("hero:potion-denied", (why) => { this.hud.deny("potion"); NK.ui.toast(why === "full" ? "Already at full health" : "No potions left", 1200); }));
    this.onDispose(NK.on("hero:dead", () => this.later(1.6, () => NK.gameOver({ win: false, score: run.score, title: "Fallen in the hall" }))));
    this.onDispose(NK.on("skeleton:alert", (sk) => {
      if (!this.seen.combat) { this.seen.combat = true; this.hud.hint(this.touch() ? "Tap the sword to swing" : "Press 1 or Space to swing", 4); }
      if (sk.kind === "archer" && !this.seen.block) this.later(2.2, () => { if (!this.seen.block) { this.seen.block = true; this.hud.hint(this.touch() ? "Hold the shield to block" : "Hold 3 to raise your shield", 4); } });
      this.updateObjective();
    }));
    this.onDispose(NK.on("skeleton:dead", (sk) => {
      run.kills++; run.score += 250;
      run.slain = (run.slain || []).concat(sk.kind);
      this.updateObjective(true);
      if (this.foes.every((f) => !f.alive)) { NK.ui.toast("The vault's seal breaks", 1800); NK.audio.play("sfx-locked", { volume: 0.9, rate: 0.8 }); }
    }));
    this.onDispose(NK.on("skeleton:guard", () => { if (!this.seen.guard) { this.seen.guard = true; this.hud.hint(this.touch() ? "Block, then strike after its swing" : "Block its chop, then strike back", 4.5); } }));
    this.onDispose(NK.on("mage:cast", () => { this.hud.press("bolt", true); this.later(0.2, () => this.hud.press("bolt", false)); }));

    // ambience
    this.dripT = 2;
    NK.audio.music("music", { volume: 0.5 });
    this.hud.hint(this.touch() ? "Use the stick to move" : "WASD or arrows to move", 4.5);
    this.updateObjective();
  }

  touch() { return NK.touch.visible() || NK.input.lastDevice === "touch"; }
  /** Scene-owned timer (cleared when the scene is rebuilt). */
  later(sec, fn) { this.timers.push({ t: sec, fn }); }
  hitstop(sec) { [this.player, ...this.foes].forEach((c) => { c.anim.mixer.timeScale = 0; }); this.later(sec, () => [this.player, ...this.foes].forEach((c) => { c.anim.mixer.timeScale = 1; })); }

  refreshHud(bump) {
    this.hud.setHearts(NK.run.health, NK.run.maxHealth, bump);
    this.hud.setPotions(NK.run.potions);
  }
  updateObjective(flash) {
    const left = this.foes.filter((f) => f.alive).length;
    if (this.vaultOpen) this.hud.setObjective("Vault opened", true);
    else if (left && (this.seen.sealed || this.foes.some((f) => f.state2.mode !== "guard" && f.alive) || NK.run.kills)) this.hud.setObjective("Defeat the guards " + (2 - left) + "/2");
    else if (!left) this.hud.setObjective("Open the vault");
    else this.hud.setObjective("Find the vault");
    void flash;
  }

  fixedUpdate(dt) {
    const run = NK.run, p = this.player;
    this.elapsed += dt; run.elapsed = this.elapsed; run.seen = this.seen;
    // ability 2: order the mage's bolt
    if (NK.input.pressed("bolt") && !p.dead) {
      const r = this.mage.command();
      if (r === "none") { this.hud.deny("bolt"); NK.ui.toast("No skeleton in range", 1000); }
      else if (r === "cooldown") this.hud.deny("bolt");
    }
    // the vault
    const L = this.lvl.L, c = L.vault.chest;
    const near = Math.hypot(p.object.position.x - c[0], p.object.position.z - (c[2] + 1.9)) < 2.1 && !p.dead;
    if (near && !this.vaultOpen) {
      if (this.foes.some((f) => f.alive)) {
        if (!this.sealedT || this.elapsed - this.sealedT > 4) { this.sealedT = this.elapsed; this.seen.sealed = true; NK.audio.play("sfx-locked", { volume: 0.9 }); NK.ui.toast("Sealed. Defeat the vault's guards.", 1800); this.updateObjective(true); }
      } else this.openVault();
    }
    if (!this.seen.moved && Math.hypot(p.velocity.x, p.velocity.z) > 1) { this.seen.moved = true; this.later(1.2, () => this.hud.hideHint()); }
    if (p.object.position.y < -6) p.teleport(L.start);
  }

  openVault() {
    if (this.vaultOpen) return;
    const run = NK.run, T = THREE, L = this.lvl.L;
    this.vaultOpen = true; run.vault = "open"; run.won = true;
    this.player.locked = true;
    this.player.facing = Math.PI * 1; this.player.act("Interact", { once: true });
    NK.audio.play("sfx-chest", { volume: 0.9 });
    this.later(0.5, () => NK.audio.play("sfx-coins", { volume: 0.9 }));
    this.later(0.7, () => { NK.audio.stopMusic(0.5); NK.audio.play("sfx-win", { volume: 0.8 }); });
    this.rig.focus = new T.Vector3(L.vault.chest[0], 0.9, L.vault.chest[2] + 3);
    this.lvl.lights.vaultPower = 40;
    this.updateObjective();
    const bonus = Math.max(0, Math.round(600 - this.elapsed * 4));
    run.score += 500 + run.health * 50 + run.potions * 100 + bonus;
    NK.platform.achievements.unlock("vault-floor-03", "Vault of floor 03");
    this.later(2.6, () => NK.gameOver({ win: true, score: run.score, title: "Vault opened" }));
  }

  update(dt) {
    for (const t of this.timers.slice()) { t.t -= dt; if (t.t <= 0) { this.timers.splice(this.timers.indexOf(t), 1); t.fn(); } }
    const lvl = this.lvl, p = this.player;
    lvl.lights.focus.copy(this.rig.look);
    // HUD
    this.hud.setCooldown("attack", p.cooldowns.attack);
    this.hud.setCooldown("bolt", this.mage.cooldown());
    this.hud.setCooldown("potion", NK.run.potions > 0 ? p.cooldowns.potion : 0);
    this.hud.press("block", p.blocking);
    this.hud.press("attack", p.cooldowns.attack > 0.75);
    this.hud.update(dt);
    this.mapT = (this.mapT || 0) - dt;
    if (this.mapT <= 0) { this.mapT = 0.1; this.hud.drawMap({ hero: p, mage: this.mage, foes: this.foes, vaultOpen: this.vaultOpen }); }
    // vault opening: lid swings, gold light swells, coins sparkle
    if (this.vaultOpen) {
      if (lvl.lid && lvl.lid.rotation.x > -1.25) lvl.lid.rotation.x = Math.max(-1.25, lvl.lid.rotation.x - dt * 1.8);
      this.rig.focusWeight = Math.min(0.7, this.rig.focusWeight + dt * 0.8);
      const c = lvl.L.vault.chest;
      if (NK.rng.chance(0.5)) this.fx.emit({ at: new THREE.Vector3(c[0], c[1] + 1.2, c[2]), n: 2, color: 0xffd36a, speed: 1.6, up: 3, gravity: -3, life: 0.9, spread: 0.6, size: 1.1 });
    }
    // ambience: a drip now and then
    this.dripT -= dt;
    if (this.dripT <= 0) { this.dripT = NK.rng.float(2.5, 6); NK.audio.play("sfx-drip", { volume: 0.25, rate: NK.rng.float(0.85, 1.15) }); }
  }
});
