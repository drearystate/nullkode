// Menu backdrop: the hall at rest behind the kit's menu panel; the knight and mage wait by the bridge while the
// camera drifts slowly along the channel at the play angle.
NK.scene("Menu", class extends NK3D.Scene {
  create() {
    const lvl = NK.use("buildLevel")(this);
    this.lights = lvl.lights;
    lvl.lights.vault = new THREE.Vector3(lvl.L.vault.chest[0], 2.4, lvl.L.vault.chest[2] + 1.8);
    const pose = (key, clips, clip, pos, rot, gear) => {
      const m = this.add(NK3D.model(key, { position: pos, rotationY: rot }));
      const a = NK3D.animator(m, NK3D.clips(clips));
      a.play(clip);
      (gear || []).forEach(([k, slot]) => { const b = m.getObjectByName(slot); if (b) b.add(NK3D.model(k)); });
      this.add({ update: (dt) => a.update(dt) });
    };
    pose("knight", ["anim-general"], "Idle_A", [-1.6, 0, 2.6], Math.PI * 1.15, [["sword", "handslotr"], ["shield", "handslotl"]]);
    pose("mage", ["anim-general"], "Idle_B", [-4.4, 0, 3.0], Math.PI * 1.3, [["staff", "handslotr"]]);
    this.t = 0;
  }
  update(dt) {
    this.t += dt * 0.05;
    const yaw = Math.PI / 4, pitch = 0.62, d = 30;
    const fx = 0.5 + Math.sin(this.t) * 2.5, fz = 1.5 + Math.cos(this.t * 0.7) * 2.5;
    this.camera.position.set(fx + Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, fz + Math.cos(yaw) * Math.cos(pitch) * d);
    this.camera.lookAt(fx, 0.8, fz);
    this.lights.focus.set(fx, 0, fz);
  }
});
