// Step 6 — polish: menu backdrop scene, music, touch controls for phones, an achievement.
// Play scene: the crypt, the knight, coins (physics sensors), pushable barrels, the skeleton,
// the chest that opens when every coin is taken. Win at the open chest; lose at 0 health.
NK.scene("Game", class extends NK3D.Scene {
  create() {
    const T = THREE, run = NK.run;
    const { d } = NK.use("buildDungeon")(this);
    this.player = NK.use("Hero")(this, d.start);

    // Pushable barrels (dynamic bodies).
    d.barrels.forEach(([x, z]) => {
      const b = this.add(NK3D.model("barrel", { position: [x, 0, z], scale: 0.7 }));
      this.body(b, { type: "dynamic", shape: "cylinder", mass: 2, friction: 0.6 });
    });

    // Coins: spinning, collected by touching their sensor. Taken ones stay taken across live edits.
    const taken = (run.taken = run.taken || []);
    this.total = d.coins.length;
    this.coins = [];
    d.coins.forEach(([x, z, y], i) => {
      if (taken.includes(i)) return;
      const c = this.add(NK3D.model("coin", { position: [x, y, z], scale: 3 }));
      c.rotation.x = Math.PI / 2;
      c.userData = { i, baseY: y };
      this.body(c, { type: "fixed", sensor: true, shape: "sphere", radius: 0.9, onEnter: (o) => { if (o === this.player.object) this.take(c); } });
      this.coins.push(c);
    });

    // The chest (lid opens once every coin is taken).
    const [cx, cz] = d.chest;
    this.chest = this.add(NK3D.model("chest", { position: [cx, 0, cz], scale: 1.4 }));
    this.lid = this.chest.getObjectByName("chest_gold_lid");
    this.body(this.chest, { type: "fixed" });
    const zone = new T.Object3D();
    zone.position.set(cx, 1, cz + 1.6);
    this.add(zone);
    this.body(zone, { type: "fixed", sensor: true, size: [3, 2, 1.6], onEnter: (o) => { if (o === this.player.object) this.reachChest(); } });

    // The skeleton.
    this.skeleton = NK.use("Skeleton")(this, d.skeleton, this.player);
    this.onDispose(NK.on("hero:attack", (h) => { if (this.skeleton.alive && h.front().distanceTo(this.skeleton.object.position) < 1.7) this.skeleton.hit(); }));
    this.onDispose(NK.on("skeleton:swing", () => this.time(0.35, () => {
      if (this.skeleton.alive && this.player.object.position.distanceTo(this.skeleton.object.position) < 2.3) this.hurt();
    })));
    this.onDispose(NK.on("skeleton:dead", () => { run.score += 250; NK.ui.toast("The skeleton crumbles"); }));

    this.hud = NK.ui.hud([
      { key: "coins", label: "Coins", value: run.coins + " / " + this.total },
      { key: "health", label: "Health", value: run.health },
      { key: "score", label: "Score", value: run.score },
    ]);
    this.onDispose(() => this.hud.remove());
    this.timers = [];
    this.open = taken.length >= this.total;
    if (this.open && this.lid) this.lid.rotation.x = -1.2;
    NK.audio.music("music");
  }

  /** Small scene-owned timer (cleared when the scene is rebuilt). */
  time(sec, fn) { this.timers.push({ t: sec, fn }); }

  update(dt) {
    for (const c of this.coins) { c.rotation.z += dt * 2.5; c.position.y = c.userData.baseY + Math.sin(performance.now() / 300 + c.userData.i) * 0.15; }
    if (this.open && this.lid && this.lid.rotation.x > -1.2) this.lid.rotation.x -= dt * 2;
    for (const t of this.timers.slice()) { t.t -= dt; if (t.t <= 0) { this.timers.splice(this.timers.indexOf(t), 1); t.fn(); } }
    if (this.player.object.position.y < -10) this.player.teleport(NK.use("dungeon").start);
  }

  take(c) {
    if (!c.parent) return;
    this.remove(c);
    this.coins.splice(this.coins.indexOf(c), 1);
    NK.run.taken.push(c.userData.i);
    NK.run.coins++;
    NK.run.score += 100;
    NK.audio.play("sfx-coin", { volume: 0.7 });
    this.hud.set("coins", NK.run.coins + " / " + this.total);
    this.hud.set("score", NK.run.score);
    if (NK.run.coins >= this.total && !this.open) {
      this.open = true;
      NK.audio.play("sfx-open");
      NK.ui.toast("The chest is open!");
    }
  }

  hurt() {
    const p = this.player;
    if (p.dead || p.hurtT > 0) return;
    NK.run.health--;
    this.hud.set("health", NK.run.health);
    NK.audio.play("sfx-hurt");
    NK.vibrate(80);
    p.hurtT = 0.5;
    if (NK.run.health <= 0) {
      p.dead = true;
      p.locked = true;
      p.act("Death_A", { once: true });
      this.time(1.4, () => NK.gameOver({ win: false, score: NK.run.score }));
    } else p.act("Hit_A", { once: true });
  }

  reachChest() {
    if (!this.open || this.won) return;
    this.won = true;
    this.player.locked = true;
    this.player.act("Interact", { once: true });
    NK.run.score += 500 + NK.run.health * 100;
    NK.platform.achievements.unlock("crypt-cleared", "Crypt cleared");
    this.time(1.2, () => NK.gameOver({ win: true, score: NK.run.score }));
  }
});
