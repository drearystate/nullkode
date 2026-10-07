// Step 2 — the crypt from the KayKit dungeon pack: instanced floor + walls, pillars, crates,
// torches with flickering lights. The camera circles the room until there is a hero.
NK.scene("Game", class extends NK3D.Scene {
  create() {
    NK.use("buildDungeon")(this);
    this.t = 0;
  }
  update(dt) {
    this.t += dt * 0.15;
    this.camera.position.set(Math.sin(this.t) * 17, 10, Math.cos(this.t) * 17);
    this.camera.lookAt(0, 1.5, 0);
  }
});
