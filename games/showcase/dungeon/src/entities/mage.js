// The mage companion: follows the knight (crossing at the bridge), keeps to the knight's screen-left, and casts a
// homing magic bolt at the nearest skeleton: on command (ability 2) or by itself every few seconds in a fight.
NK.def("Mage", function (scene, pos, hero, fx, lights) {
  const T = THREE, Look = NK.use("Look"), L = NK.use("level"), ch = L.channel;
  const mage = NK3D.character(scene, {
    model: "mage",
    clips: ["anim-general", "anim-move", "anim-ranged"],
    anims: { idle: "Idle_B", walk: "Walking_B", run: "Running_B", fall: "Jump_Idle", land: "Jump_Land" },
    speed: 3.6, runSpeed: 6.6, control: "none", position: pos, facing: Math.PI * 1.25, radius: 0.42,
  });
  Look.hold(mage, "staff", "handslotr");
  const blob = new T.Mesh(new T.CircleGeometry(0.7, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.035; blob.renderOrder = 1; mage.object.add(blob);
  // staff orb glow (cyan point sprite at the staff tip)
  const tip = new T.Sprite(new T.SpriteMaterial({ map: Look.glow(), color: 0x6ff0ff, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
  tip.scale.setScalar(0.9);
  scene.add(tip);
  const staffBone = mage.model.getObjectByName("handslotr");

  const C = { cooldown: 2.4, auto: 4.6, range: 13, speed: 13 };
  const st = { cd: 0, auto: 2.5, castT: 0, castTarget: null, bolts: [] };
  mage.cooldown = () => st.cd / C.cooldown;
  mage.bolts = () => st.bolts.length;
  const tmp = new T.Vector3(), goal = new T.Vector3();

  function nearestFoe(r) {
    let best = null, bd = r;
    for (const f of scene.foes || []) { if (!f.alive) continue; const d = f.object.position.distanceTo(mage.object.position); if (d < bd) { bd = d; best = f; } }
    return best;
  }
  /** Ability 2. Returns false (with a reason) when there's nothing to hit. */
  mage.command = () => {
    if (st.cd > 0 || st.castT > 0) return "cooldown";
    const f = nearestFoe(C.range);
    if (!f) return "none";
    cast(f, true);
    return "ok";
  };
  function cast(f, ordered) {
    st.castT = 0.32; st.castTarget = f; st.cd = ordered ? C.cooldown : Math.max(st.cd, 1.2); st.auto = C.auto;
    mage.facing = Math.atan2(f.object.position.x - mage.object.position.x, f.object.position.z - mage.object.position.z);
    mage.act("Ranged_Magic_Shoot", { once: true });
    NK.emit("mage:cast", mage);
  }
  function release(f) {
    const core = new T.Mesh(new T.IcosahedronGeometry(0.2, 0), new T.MeshBasicMaterial({ color: 0xd8ffff, toneMapped: false }));
    const halo = new T.Sprite(new T.SpriteMaterial({ map: Look.glow(), color: 0x46e6ff, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.scale.setScalar(1.6); core.add(halo);
    staffBone.getWorldPosition(core.position); core.position.y += 0.9;
    scene.add(core);
    st.bolts.push({ mesh: core, target: f, life: 2.2, vel: new T.Vector3(Math.sin(mage.facing), 0.3, Math.cos(mage.facing)).multiplyScalar(6) });
    NK.audio.play("sfx-magic", { volume: 0.75, rate: NK.rng.float(0.95, 1.1) });
    lights.borrowed = 2.5;
  }

  scene.add({
    fixedUpdate(dt) {
      st.cd = Math.max(0, st.cd - dt);
      const me = mage.object.position, hp = hero.object.position;
      if (st.castT > 0) {
        st.castT -= dt;
        if (st.castT <= 0 && st.castTarget && st.castTarget.alive) release(st.castTarget);
        mage.move(dt, 0, 0, false, false);
        return;
      }
      if (mage.override && !mage.anim.current.isRunning()) mage.act(null);
      // auto-cast in a fight
      st.auto -= dt;
      const f = nearestFoe(10.5);
      if (f && st.auto <= 0 && !hero.dead) cast(f, false);
      // follow: stand at the knight's back-left (screen left), cross the channel only over the bridge
      const bx = (ch.bridge[0] + ch.bridge[1]) / 2, mid = (ch.z0 + ch.z1) / 2;
      goal.set(hp.x - 3.1, 0, hp.z + 1.9);
      if (goal.z > ch.z0 - 0.7 && goal.z < ch.z1 + 0.7 && Math.abs(goal.x - bx) > 1.2) goal.z = hp.z < mid ? ch.z0 - 1 : ch.z1 + 1; // never stand in the water
      const side = (z) => (z < ch.z0 - 0.2 ? -1 : z > ch.z1 + 0.2 ? 1 : 0);
      const mySide = side(me.z), goalSide = side(goal.z);
      if (mySide !== goalSide && goalSide !== 0) {
        if (mySide !== 0 && Math.abs(me.x - bx) > 0.8) goal.set(bx, 0, mySide < 0 ? ch.z0 - 1 : ch.z1 + 1); // walk to the bridge first
        else goal.set(bx, 0, goalSide < 0 ? ch.z0 - 1.2 : ch.z1 + 1.2); // then over it
      }
      tmp.copy(goal).sub(me).setY(0);
      const d = tmp.length();
      if (d > 0.9 && (d > 2.2 || mage.velocity.lengthSq() > 0.5)) { tmp.normalize(); mage.move(dt, tmp.x, tmp.z, false, d > 5); }
      else {
        mage.move(dt, 0, 0, false, false);
        const t = f || hero; // idle: face the nearest foe, else the way the knight faces
        if (f) mage.facing += Math.atan2(Math.sin(Math.atan2(t.object.position.x - me.x, t.object.position.z - me.z) - mage.facing), Math.cos(Math.atan2(t.object.position.x - me.x, t.object.position.z - me.z) - mage.facing)) * Math.min(1, dt * 6);
      }
    },
    update(dt) {
      staffBone.getWorldPosition(tip.position); tip.position.y += 0.95;
      tip.material.opacity = 0.65 + Math.sin(performance.now() / 180) * 0.15;
      for (const b of st.bolts.slice()) {
        b.life -= dt;
        const tp = b.target.object.position;
        tmp.set(tp.x, 1.3, tp.z).sub(b.mesh.position);
        const dist = tmp.length();
        b.vel.lerp(tmp.normalize().multiplyScalar(C.speed), Math.min(1, dt * 7));
        b.mesh.position.addScaledVector(b.vel, dt);
        b.mesh.rotation.x += dt * 9; b.mesh.rotation.y += dt * 7;
        lights.fxLight.color.setHex(0x52e8ff); lights.fxLight.intensity = Math.min(7, dist * 2.5); lights.fxLight.distance = 5; lights.fxLight.position.copy(b.mesh.position);
        fx.emit({ at: b.mesh.position, n: 2, color: 0x5ce8ff, speed: 0.6, life: 0.35, gravity: 0, size: 0.8, spread: 0.08 });
        if (dist < 0.6 || b.life <= 0 || !b.target.alive) {
          if (b.target.alive && dist < 1.2) { b.target.hit(1, b.mesh.position, "magic"); }
          fx.emit({ at: b.mesh.position, n: 16, color: 0x7ff2ff, speed: 4.5, life: 0.5, gravity: -2, size: 1.1 });
          scene.remove(b.mesh);
          st.bolts.splice(st.bolts.indexOf(b), 1);
          lights.borrowed = Math.min(lights.borrowed, 0.08);
        }
      }
    },
  });
  return mage;
});
