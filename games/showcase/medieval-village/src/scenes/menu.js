// Menu backdrop: the same village behind the kit's title panel, the camera drifting slowly around it.
NK.scene("Menu", class extends NK3D.Scene {
  create() {
    NK.use("hudTheme")();
    const L = NK.use("level");
    this.rig = NK.use("OrthoRig")(this, Object.assign({}, L.camera, { width: L.camera.width * 1.05 }));
    this.rig.drift = NK.settings.get("reduceMotion") ? 0 : 0.035;
    this.village = NK.use("buildVillage")(this);
    this.people = NK.use("Villagers")(this, this.village);
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    if (this.rig.drift) this.rig.drift = 0.035 * Math.cos(this.t * 0.12); // sways back and forth, never drifts away
    this.rig.update(dt);
    this.village.update(dt);
    this.people.update(dt, dt);
  }
});
