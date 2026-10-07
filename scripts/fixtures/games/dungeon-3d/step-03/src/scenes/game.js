// Step 3 — the knight: third-person character with walk/run/jump animations; the camera follows
// (drag or right stick to look) and pulls in before walls.
NK.scene("Game", class extends NK3D.Scene {
  create() {
    const { d } = NK.use("buildDungeon")(this);
    this.player = NK.use("Hero")(this, d.start);
  }
});
