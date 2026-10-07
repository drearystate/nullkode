// The skeleton: patrols a loop of waypoints, chases the knight when close, swings when in reach.
// Two hits from the knight's swing defeat it. Its footsteps are a positional sound.
NK.def("Skeleton", function (scene, spawn, target) {
  const sk = NK3D.character(scene, {
    model: "skeleton",
    clips: ["anims-move", "anims-general"],
    anims: { idle: "Idle_B", walk: "Walking_C", run: "Running_B", fall: "Jump_Idle", land: "Jump_Land" },
    speed: 2.2,
    runSpeed: 4.4,
    control: "none",
    position: [spawn.at[0], 0, spawn.at[1]],
  });
  const steps = NK3D.sound(scene, sk.object, "steps", { loop: true, volume: 0.9, refDistance: 3, autoplay: false });
  let wp = 0, cool = 0, hp = 2, stun = 0;
  sk.alive = true;
  sk.hit = () => {
    if (!sk.alive) return;
    hp--;
    stun = 0.6;
    NK.audio.play("sfx-hit");
    if (hp <= 0) { sk.alive = false; sk.locked = true; sk.act("Death_A", { once: true }); steps.stop(); NK.emit("skeleton:dead", sk); }
    else sk.act("Hit_A", { once: true });
  };
  scene.add({
    fixedUpdate(dt) {
      cool = Math.max(0, cool - dt);
      stun = Math.max(0, stun - dt);
      if (!sk.alive) return;
      if (stun > 0) { sk.move(dt, 0, 0, false, false); return; }
      if (sk.override && cool < 0.6) sk.act(null);
      const me = sk.object.position, tp = target.object.position;
      const dx = tp.x - me.x, dz = tp.z - me.z, dist = Math.hypot(dx, dz);
      let wx = 0, wz = 0, run = false;
      if (!target.dead && dist < 1.9) {
        if (cool === 0) { cool = 1.3; sk.act("Use_Item", { once: true }); NK.emit("skeleton:swing", sk); }
        sk.facing = Math.atan2(dx, dz);
      } else if (!target.dead && dist < 10) { wx = dx / dist; wz = dz / dist; run = true; }
      else {
        const p = spawn.path[wp];
        const px = p[0] - me.x, pz = p[1] - me.z, pd = Math.hypot(px, pz);
        if (pd < 0.8) wp = (wp + 1) % spawn.path.length;
        else { wx = px / pd; wz = pz / pd; }
      }
      sk.move(dt, wx, wz, false, run);
      const moving = Math.hypot(sk.velocity.x, sk.velocity.z) > 0.5;
      if (moving && !steps.wanted) steps.play();
      if (!moving && steps.wanted) steps.stop();
      if (steps.audio) steps.audio.setPlaybackRate(run ? 1.7 : 1.1);
    },
  });
  return sk;
});
