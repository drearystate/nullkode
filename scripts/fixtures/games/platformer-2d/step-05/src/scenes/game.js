// Step 5 — coins from the map objects, a coin counter + score in the HUD, sparkles and a coin sound.
NK.scene("Game", class extends NK2D.Scene {
  create() {
    const run = NK.run;
    const def = NK.use("levels")[run.level] || NK.use("levels")[1];
    NK2D.parallax(this, [
      { texture: "bg", frame: "background_clouds", y: this.H - 1020, height: 512, factor: 0.1, scale: 2 },
      { texture: "bg", frame: def.background, y: this.H - 512, height: 512, factor: 0.25, scale: 2 },
    ]);
    const key = "level" + run.level;
    NK2D.asciiMap(this, key, { tileset: "tiles", rows: def.rows, legend: def.legend });
    const lvl = (this.lvl = NK2D.tilemap(this, key));

    const start = lvl.find("player")[0] || { cx: 128, bottom: 300 };
    this.spawnAt = { x: start.cx, y: start.bottom - 52 };
    this.player = new (NK.use("Player"))(this, this.spawnAt.x, this.spawnAt.y);
    lvl.collide(this.player);

    const taken = ((run.taken = run.taken || {})[run.level] = run.taken[run.level] || []);
    this.coins = [];
    lvl.spawn("coin", (o) => {
      const id = o.x + "," + o.y;
      if (!taken.includes(id)) this.coins.push(new (NK.use("Coin"))(this, o.cx, o.cy, id));
    });
    this.sparks = this.add.particles(0, 0, "tiles", {
      frame: "star", lifespan: 450, speed: { min: 120, max: 260 }, scale: { start: 0.35, end: 0 }, emitting: false,
    }).setDepth(20);
    this.physics.add.overlap(this.player, this.coins, (p, c) => this.takeCoin(c));

    NK2D.follow(this, this.player, { lerp: 0.15, deadzone: [160, 120] });
    this.hud = NK2D.hud(this)
      .counter("coins", { texture: "tiles", frame: "hud_coin", value: run.coins })
      .label("score", "Score " + run.score);
    NK.audio.music("music");
  }

  fixedUpdate(dt) {
    this.player.fixedUpdate(dt);
    if (this.player.y > this.lvl.height + 150) this.player.setPosition(this.spawnAt.x, this.spawnAt.y).setVelocity(0, 0);
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
});
