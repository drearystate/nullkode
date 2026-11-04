NK.scene("Game", class extends NK3D.Scene {
  create() {
    const ground = this.add(new THREE.Mesh(new THREE.BoxGeometry(40, 1, 40), new THREE.MeshStandardMaterial({ color: 0x7a8a6a })));
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.body(ground, { type: "fixed" });
    this.camera.position.set(0, 8, 14);
    this.camera.lookAt(0, 0, 0);
  }
  fixedUpdate(dt) {}
});
