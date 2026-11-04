NK.scene("Game", class extends NK2D.Scene {
  create() {
    NK2D.text(this, this.W / 2, this.H / 2, "Level " + NK.run.level, { size: 56 });
  }
  fixedUpdate(dt) {}
});
