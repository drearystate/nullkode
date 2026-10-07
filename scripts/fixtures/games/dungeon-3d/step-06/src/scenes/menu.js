// Menu backdrop: the crypt seen from a slowly circling camera behind the menu panel.
NK.scene("Menu", class extends NK3D.Scene {
  create() {
    NK.use("buildDungeon")(this);
    this.t = 0;
  }
  update(dt) {
    this.t += dt * 0.12;
    this.camera.position.set(Math.sin(this.t) * 17, 9, Math.cos(this.t) * 17);
    this.camera.lookAt(0, 1.5, 0);
  }
});
