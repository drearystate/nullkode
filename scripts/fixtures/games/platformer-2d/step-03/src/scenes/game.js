// Step 3 — level 1 from the text map: autotiled ground, one-way clouds, decorations.
// No player yet, so the camera pans across the level to show it.
NK.scene("Game", class extends NK2D.Scene {
  create() {
    const def = NK.use("levels")[NK.run.level] || NK.use("levels")[1];
    NK2D.parallax(this, [
      { texture: "bg", frame: "background_clouds", y: this.H - 1020, height: 512, factor: 0.1, scale: 2 },
      { texture: "bg", frame: def.background, y: this.H - 512, height: 512, factor: 0.25, scale: 2 },
    ]);
    const key = "level" + NK.run.level;
    NK2D.asciiMap(this, key, { tileset: "tiles", rows: def.rows, legend: def.legend });
    this.lvl = NK2D.tilemap(this, key);
    this.panX = 0;
    NK2D.hud(this).label("title", "Level " + NK.run.level);
    NK.audio.music("music");
  }

  fixedUpdate(dt) {
    this.panX += dt * 140;
    const max = this.lvl.width - this.W;
    this.cameras.main.scrollX = Math.abs(((this.panX + max) % (2 * max)) - max);
    this.cameras.main.scrollY = this.lvl.height - this.H;
  }
});
