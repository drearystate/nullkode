// Step 2 — the art is in: layered sky + hills backdrop, the hero standing on a strip of grass, music.
NK.scene("Game", class extends NK2D.Scene {
  create() {
    NK2D.parallax(this, [
      { texture: "bg", frame: "background_clouds", y: this.H - 1020, height: 512, factor: 0.1, scale: 2 },
      { texture: "bg", frame: "background_color_hills", y: this.H - 512, height: 512, factor: 0.25, scale: 2 },
    ]);
    for (let x = 32; x < this.W; x += 64) this.add.image(x, this.H - 32, "tiles", "terrain_grass_block_top");
    this.add.sprite(this.W / 2, this.H - 112, "chars").play("hero-idle").setScale(0.75);
    this.add.sprite(this.W / 2 + 220, this.H - 96, "enemies").play("slime-walk");
    NK2D.hud(this).label("title", "Level " + NK.run.level);
    NK.audio.music("music");
  }
});
