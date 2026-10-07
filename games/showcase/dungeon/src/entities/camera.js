// Isometric-ish follow camera (the game's own rig; the kit's rigs are third-person/top-down).
// Fixed yaw 45° (the hall's far corner sits at the top centre, like the reference), pitch ~38°, narrow FOV so it
// reads almost orthographic. It frames a point slightly ahead of the knight, leans toward a "focus" (the vault
// when it opens), stays inside the hall's bounds, and never rotates, so the movement keys always map to the same
// screen directions (W/up = toward the top of the screen).
NK.def("IsoRig", function (scene, target, o) {
  const T = THREE, cam = scene.camera;
  o = Object.assign({ yaw: Math.PI / 4, pitch: 0.66, distance: 27, height: 0.9, lead: [0, 0, 0], follow: 3, bounds: null }, o || {});
  const look = new T.Vector3(), want = new T.Vector3(), dir = new T.Vector3();
  const rig = {
    owner: scene, mode: "iso", target, yaw: o.yaw, pitch: o.pitch, distance: o.distance,
    focus: null, focusWeight: 0, shake: 0,
    get look() { return look; },
    snap() { rig.update(1, true); },
    update(dt, instant) {
      const p = (target.object || target).position;
      want.set(p.x + o.lead[0], o.height, p.z + o.lead[2]);
      if (target.velocity) { want.x += THREE.MathUtils.clamp(target.velocity.x * 0.22, -1.2, 1.2); want.z += THREE.MathUtils.clamp(target.velocity.z * 0.22, -1.2, 1.2); }
      if (o.bounds) { want.x = THREE.MathUtils.clamp(want.x, o.bounds.x[0], o.bounds.x[1]); want.z = THREE.MathUtils.clamp(want.z, o.bounds.z[0], o.bounds.z[1]); }
      if (rig.focus && rig.focusWeight > 0) want.lerp(rig.focus, rig.focusWeight);
      if (instant) look.copy(want); else look.lerp(want, 1 - Math.exp(-o.follow * dt));
      // narrow screens (phones in portrait) step back so the same width of the hall stays visible
      const aspect = cam.aspect || 1.78;
      const d = rig.distance * (aspect < 1.6 ? Math.min(1.9, 1.6 / aspect) : 1);
      dir.set(Math.sin(rig.yaw) * Math.cos(rig.pitch), Math.sin(rig.pitch), Math.cos(rig.yaw) * Math.cos(rig.pitch));
      cam.position.copy(look).addScaledVector(dir, d);
      if (rig.shake > 0 && !NK.settings.get("reduceMotion")) { rig.shake = Math.max(0, rig.shake - dt); const a = rig.shake * 0.5; cam.position.x += (NK.rng.float() - 0.5) * a; cam.position.y += (NK.rng.float() - 0.5) * a; }
      cam.lookAt(look);
      cam.far = 160;
    },
    /** Movement is screen-relative: "up" walks away from the camera. */
    moveYaw() { return rig.yaw + Math.PI; },
  };
  scene.world.rig = rig;
  rig.snap();
  return rig;
});
