// Step 4 — the player: spawned at "P", collides with the ground, the camera follows.
NK.scene("Game", class extends NK2D.Scene {
  create() {
    const def = NK.use("levels")[NK.run.level] || NK.use("levels")[1];
    NK2D.parallax(this, [
      { texture: "bg", frame: "background_clouds", y: this.H - 1020, height: 512, factor: 0.1, scale: 2 },
      { texture: "bg", frame: def.background, y: this.H - 512, height: 512, factor: 0.25, scale: 2 },
    ]);
    const key = "level" + NK.run.level;
    NK2D.asciiMap(this, key, { tileset: "tiles", rows: def.rows, legend: def.legend });
    const lvl = (this.lvl = NK2D.tilemap(this, key));

    const start = lvl.find("player")[0] || { cx: 128, bottom: 300 };
    this.spawnAt = { x: start.cx, y: start.bottom - 52 };
    this.player = new (NK.use("Player"))(this, this.spawnAt.x, this.spawnAt.y);
    lvl.collide(this.player);

    NK2D.follow(this, this.player, { lerp: 0.15, deadzone: [160, 120] });
    NK2D.hud(this).label("title", "Level " + NK.run.level);
    NK.audio.music("music");
  }

  fixedUpdate(dt) {
    this.player.fixedUpdate(dt);
    if (this.player.y > this.lvl.height + 150) this.player.setPosition(this.spawnAt.x, this.spawnAt.y).setVelocity(0, 0);
  }
});
