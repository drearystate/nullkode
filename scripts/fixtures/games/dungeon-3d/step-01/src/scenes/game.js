// Step 1 — a first playable frame: a stone floor, and crates that fall and tumble with real physics.
NK.scene("Game", class extends NK3D.Scene {
  create() {
    const T = THREE;
    const floor = this.add(new T.Mesh(new T.BoxGeometry(28, 1, 28), new T.MeshStandardMaterial({ color: 0x6b6f7a, roughness: 0.9 })));
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    this.body(floor, { type: "fixed" });
    const mat = new T.MeshStandardMaterial({ color: 0xb07a4a, roughness: 0.7 });
    for (let i = 0; i < 12; i++) {
      const box = this.add(new T.Mesh(new T.BoxGeometry(1.2, 1.2, 1.2), mat));
      box.position.set(NK.rng.float(-3, 3), 3 + i * 1.6, NK.rng.float(-3, 3));
      box.rotation.set(NK.rng.float(0, 3), NK.rng.float(0, 3), 0);
      box.castShadow = box.receiveShadow = true;
      this.body(box, { type: "dynamic", mass: 1 });
    }
    this.t = 0;
  }
  update(dt) {
    this.t += dt * 0.2;
    this.camera.position.set(Math.sin(this.t) * 14, 8, Math.cos(this.t) * 14);
    this.camera.lookAt(0, 1, 0);
  }
});
