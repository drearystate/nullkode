// Step 7 — the goal flag, level 2 from a Tiled JSON file, and winning the game.
NK.scene("Game", class extends NK2D.Scene {
  create(data) {
    const run = NK.run;
    const levels = NK.use("levels");
    const def = levels[run.level] || levels[1];

    // Background + level
    NK2D.parallax(this, [
      { texture: "bg", frame: "background_clouds", y: this.H - 1020, height: 512, factor: 0.1, scale: 2 },
      { texture: "bg", frame: def.background, y: this.H - 512, height: 512, factor: 0.25, scale: 2 },
    ]);
    const key = def.tilemap || "level" + run.level;
    if (!def.tilemap) NK2D.asciiMap(this, key, { tileset: "tiles", rows: def.rows, legend: def.legend });
    const lvl = (this.lvl = NK2D.tilemap(this, key));

    // Player
    const start = lvl.find("player")[0] || { cx: 128, bottom: 300 };
    this.spawnAt = { x: start.cx, y: start.bottom - 52 };
    this.player = new (NK.use("Player"))(this, this.spawnAt.x, this.spawnAt.y);
    lvl.collide(this.player);

    // Enemies
    this.enemies = [];
    lvl.spawn("slime", (o) => this.enemies.push(new (NK.use("Slime"))(this, o.cx, o.bottom - 32)));
    lvl.spawn("spike-slime", (o) => this.enemies.push(new (NK.use("Slime"))(this, o.cx, o.bottom - 32, "spike")));
    lvl.spawn("bee", (o) => this.enemies.push(new (NK.use("Bee"))(this, o.cx, o.cy)));
    lvl.collide(this.enemies.filter((e) => e.body.allowGravity));

    // Coins (ones already taken this run stay taken, also across live edits)
    const taken = ((run.taken = run.taken || {})[run.level] = run.taken[run.level] || []);
    this.coins = [];
    lvl.spawn("coin", (o) => {
      const id = o.x + "," + o.y;
      if (!taken.includes(id)) this.coins.push(new (NK.use("Coin"))(this, o.cx, o.cy, id));
    });
    this.sparks = this.add.particles(0, 0, "tiles", {
      frame: "star", lifespan: 450, speed: { min: 120, max: 260 }, scale: { start: 0.35, end: 0 }, emitting: false,
    }).setDepth(20);

    // Goal
    const f = lvl.find("flag")[0];
    if (f) this.flag = new (NK.use("Flag"))(this, f.cx, f.cy);

    // Rules
    this.physics.add.overlap(this.player, this.coins, (p, c) => this.takeCoin(c));
    this.physics.add.overlap(this.player, this.enemies, (p, e) => this.touchEnemy(e));
    if (lvl.layers.hazards) this.physics.add.overlap(this.player, lvl.layers.hazards, () => this.hurt(this.player.x + (this.player.flipX ? 10 : -10)), (p, t) => t.index > 0);
    if (this.flag) this.physics.add.overlap(this.player, this.flag, () => this.finish());

    // Camera, HUD, music
    NK2D.follow(this, this.player, { lerp: 0.15, deadzone: [160, 120] });
    this.hud = NK2D.hud(this)
      .counter("coins", { texture: "tiles", frame: "hud_coin", value: run.coins })
      .hearts("lives", { texture: "tiles", full: "hud_heart", empty: "hud_heart_empty", max: 3, value: run.lives })
      .label("score", "Score " + run.score);
    if (!data.__snapshot) this.hud.flash("Level " + run.level);
    NK.audio.music("music");
    this.done = false;
  }

  fixedUpdate(dt) {
    this.player.fixedUpdate(dt);
    for (const e of this.enemies) if (e.active) e.fixedUpdate(dt);
    if (this.player.y > this.lvl.height + 150) this.fell();
  }

  takeCoin(c) {
    if (!c.body.enable) return;
    NK.run.coins++;
    NK.run.score += 10;
    NK.run.taken[NK.run.level].push(c.id);
    c.collect(this.sparks);
    NK.audio.play("coin", { volume: 0.7, rate: 0.95 + NK.rng.float() * 0.1 });
    this.hud.set("coins", NK.run.coins);
    this.hud.set("score", "Score " + NK.run.score);
  }

  touchEnemy(e) {
    if (!e.alive || this.done) return;
    const p = this.player;
    const falling = p.body.velocity.y > 50 && p.body.bottom <= e.body.top + 22;
    if (falling && e.stompable) {
      e.squash();
      p.bounce(NK.input.down("jump") ? 900 : 650);
      NK.run.score += 100;
      this.hud.set("score", "Score " + NK.run.score);
      NK.audio.play("stomp");
      this.cameras.main.shake(80, 0.004);
    } else this.hurt(e.x);
  }

  hurt(fromX) {
    if (this.done || !this.player.hurt(fromX)) return;
    NK.audio.play("hurt");
    NK.vibrate(60);
    this.cameras.main.shake(160, 0.01);
    this.loseLife();
  }

  fell() {
    if (this.done) return;
    NK.audio.play("hurt");
    this.player.setPosition(this.spawnAt.x, this.spawnAt.y).setVelocity(0, 0);
    this.player.invuln = 1.6;
    this.loseLife();
  }

  loseLife() {
    NK.run.lives--;
    this.hud.set("lives", NK.run.lives);
    if (NK.run.lives <= 0) {
      this.done = true;
      this.time.delayedCall(500, () => NK.gameOver({ win: false, score: NK.run.score }));
    }
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.player.frozen = true;
    NK.audio.play("win");
    const def = NK.use("levels")[NK.run.level];
    NK.run.score += 500;
    this.hud.set("score", "Score " + NK.run.score);
    this.hud.flash(def.last ? "You made it!" : "Level complete!");
    this.time.delayedCall(1400, () => {
      if (def.last) NK.gameOver({ win: true, score: NK.run.score });
      else { NK.run.level++; NK.state.go("play", { level: NK.run.level }); }
    });
  }
});
