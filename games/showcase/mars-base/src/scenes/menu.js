// Menu backdrop: the colony under a slow drifting camera behind the kit's menu panel (no HUD, no input).
NK.scene("Menu", class extends NK3D.Scene {
  create() {
    const L = NK.use("level");
    NK.rng.seed(L.seed);
    this.terrain = NK.use("buildTerrain")(this, L);
    this.colony = NK.use("buildColony")(this, L, this.terrain);
    this.rover = NK.use("Rover")(this, Object.assign({ trip: L.deposit.trip }, L.rover));
    L.people.forEach((p) => NK.use("Astronaut")(this, p));
    this.focus = new THREE.Object3D(); this.focus.object = this.focus; this.focus.position.set(-2, 0, -4); this.add(this.focus);
    this.world.shadowFollow = this.focus;
    this.t = 0;
    this.update(0);
  }
  update(dt) {
    this.t += dt * (NK.settings.get("reduceMotion") ? 0.02 : 0.05);
    const yaw = 0.49 + Math.sin(this.t) * 0.35, pitch = 0.5, d = 70;
    this.camera.position.set(-2 + Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, -4 + Math.cos(yaw) * Math.cos(pitch) * d);
    this.camera.lookAt(-2, 0, -4);
  }
});
