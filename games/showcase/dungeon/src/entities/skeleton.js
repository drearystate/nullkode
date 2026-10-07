// Skeleton guards. Both telegraph every attack on the floor in red before it lands:
//  - warrior (sword + round shield): closes in, winds up 0.55 s over a red wedge, then chops the wedge;
//  - archer (bow): keeps its distance, draws for 0.8 s over a red lane, then looses an arrow down the lane.
// The knight's shield (held, facing the blow) stops both. Hits stagger the skeleton and cancel its wind-up.
NK.def("Skeleton", function (scene, kind, spawn, hero, fx) {
  const T = THREE, Look = NK.use("Look"), Marker = NK.use("Marker");
  const warrior = kind === "warrior";
  const sk = NK3D.character(scene, {
    model: warrior ? "sk-warrior" : "sk-archer",
    clips: ["anim-general", "anim-move", warrior ? "anim-melee" : "anim-ranged"],
    anims: { idle: warrior ? "Idle_B" : "Idle_B", walk: "Walking_C", run: "Running_B", fall: "Jump_Idle", land: "Jump_Land" },
    speed: warrior ? 2.4 : 2.2, runSpeed: warrior ? 3.9 : 3.4, control: "none", position: spawn, facing: Math.PI * 0.25, radius: 0.45,
  });
  if (warrior) { Look.hold(sk, "sk-blade", "handslotr"); Look.hold(sk, "sk-shield", "handslotl"); }
  else Look.hold(sk, "bow", "handslotl");
  sk.kind = kind;
  sk.alive = true;
  sk.hp = sk.maxHp = warrior ? 4 : 3;
  const blob = new T.Mesh(new T.CircleGeometry(0.72, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.035; blob.renderOrder = 1; sk.object.add(blob);
  const mats = [];
  sk.model.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); mats.push(m.material); } });
  const base = mats.map((m) => (m.emissive ? m.emissive.clone() : null));
  const C = warrior
    ? { aggro: 7, reach: 2.5, arc: 0.95, windup: 0.6, recover: 1.0, cooldown: 1.1 }
    : { aggro: 13, keep: [4.5, 8], windup: 0.8, recover: 0.6, cooldown: 2.0, arrow: 13 };
  const st = { mode: "guard", t: 0, cd: 1.0, stun: 0, flash: 0, alertT: 0, aim: new T.Vector3(), sink: 0, arrows: [] };
  sk.state2 = st;
  const marker = warrior ? Marker.sector(scene, C.reach, C.arc * 2) : Marker.lane(scene, 0.55);
  const tmp = new T.Vector3();

  sk.hit = (dmg, from, how) => {
    if (!sk.alive) return false;
    // the warrior's round shield: it turns frontal sword blows while advancing, and nothing staggers its chop
    // (only the mage's bolts break through). Block the chop, then strike while it recovers.
    if (warrior && how === "sword" && st.mode !== "recover") {
      const a = Math.atan2(from.x - sk.object.position.x, from.z - sk.object.position.z); let d = a - sk.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (st.mode === "windup" || Math.abs(d) < 1.2) {
        NK.audio.play("sfx-block", { volume: 0.7, rate: NK.rng.float(1.05, 1.2) });
        fx.emit({ at: sk.object.position.clone().setY(1.2).addScaledVector(new T.Vector3(Math.sin(sk.facing), 0, Math.cos(sk.facing)), 0.6), n: 10, color: 0xfff0c0, speed: 4, life: 0.3, size: 0.8 });
        NK.emit("skeleton:guard", sk);
        return false;
      }
    }
    sk.hp -= dmg;
    st.flash = 0.12; st.stun = 0.4;
    if (st.mode === "windup") { st.mode = "recover"; st.t = 0.5; marker.group.visible = false; } // (bolts and the archer's draw)
    st.mode = st.mode === "guard" ? "chase" : st.mode;
    const k = sk.object.position.clone().sub(from).setY(0).normalize();
    sk.velocity.x += k.x * (how === "magic" ? 3 : 6); sk.velocity.z += k.z * (how === "magic" ? 3 : 6);
    fx.emit({ at: sk.object.position.clone().setY(1.3), n: 10, color: how === "magic" ? 0x7ff2ff : 0xffb060, speed: 4.5, life: 0.4, size: 0.9 });
    NK.audio.play(how === "magic" ? "sfx-hit2" : "sfx-hit", { volume: 0.75, rate: NK.rng.float(0.9, 1.1) });
    if (sk.hp <= 0) {
      sk.alive = false; sk.locked = true; marker.group.visible = false;
      sk.act("Death_A", { once: true });
      st.mode = "dead"; st.t = 0;
      NK.audio.play("sfx-bones", { volume: 0.8 });
      NK.emit("skeleton:dead", sk);
    } else sk.act("Hit_A", { once: true });
    return true;
  };
  function face(p, rate, dt) {
    const want = Math.atan2(p.x - sk.object.position.x, p.z - sk.object.position.z);
    let d = want - sk.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
    sk.facing += rate ? d * Math.min(1, rate * dt) : d;
  }
  function fireArrow() {
    const a = NK3D.model("arrow", { shadows: false, scale: 1.4 });
    const from = sk.object.position.clone().setY(1.35);
    const dir = st.aim.clone().setY(1.35).sub(from).setY(0).normalize();
    a.position.copy(from).addScaledVector(dir, 0.6);
    a.rotation.order = "YXZ"; a.rotation.y = Math.atan2(dir.x, dir.z); a.rotation.x = Math.PI / 2;
    scene.add(a);
    st.arrows.push({ mesh: a, dir, life: 1.6 });
    NK.audio.play("sfx-bow", { volume: 0.8, rate: NK.rng.float(0.95, 1.1) });
  }

  scene.add({
    fixedUpdate(dt) {
      st.cd = Math.max(0, st.cd - dt); st.stun = Math.max(0, st.stun - dt);
      // arrows in flight (simple segment test against the knight's capsule)
      for (const ar of st.arrows.slice()) {
        ar.life -= dt;
        ar.mesh.position.addScaledVector(ar.dir, C.arrow * dt);
        const hp = hero.object.position;
        const hit = !hero.dead && Math.hypot(ar.mesh.position.x - hp.x, ar.mesh.position.z - hp.z) < 0.65;
        if (hit || ar.life <= 0) {
          if (hit) {
            if (hero.blocks(ar.mesh.position)) { NK.emit("hero:blocked", ar.mesh.position.clone()); fx.emit({ at: ar.mesh.position, n: 12, color: 0xbfe4ff, speed: 4, life: 0.35, size: 0.9 }); }
            else hero.hurt(1, ar.mesh.position);
          }
          scene.remove(ar.mesh); st.arrows.splice(st.arrows.indexOf(ar), 1);
        }
      }
      if (!sk.alive) { if (!st.gone) sk.move(dt, 0, 0, false, false); return; }
      const me = sk.object.position, hp = hero.object.position;
      const dx = hp.x - me.x, dz = hp.z - me.z, dist = Math.hypot(dx, dz);
      if (st.stun > 0) { sk.move(dt, 0, 0, false, false); return; }
      if (sk.override && st.mode !== "windup" && !sk.anim.current.isRunning()) sk.act(null);
      let wx = 0, wz = 0, run = false;
      if (hero.dead) st.mode = "guard";
      if (st.mode === "guard") {
        // guards hold the vault yard: they engage once the knight is on the north bank (or shoots them)
        const onBank = hp.z < NK.use("level").channel.z0 - 0.4;
        if (!hero.dead && dist < C.aggro && (onBank || !warrior)) { st.mode = "chase"; NK.emit("skeleton:alert", sk); }
        else { tmp.set(spawn[0] - me.x, 0, spawn[2] - me.z); if (tmp.length() > 0.6) { tmp.normalize(); wx = tmp.x; wz = tmp.z; } else face(hp, 2, dt); }
      } else if (st.mode === "chase") {
        if (warrior) {
          if (dist > C.reach - 0.55) { wx = dx / dist; wz = dz / dist; run = dist > 4; }
          else face(hp, 8, dt);
          if (dist < C.reach + 0.1 && st.cd === 0) { st.mode = "windup"; st.t = C.windup; face(hp); st.aim.copy(hp); sk.act("Melee_1H_Attack_Chop", { once: true }); sk.anim.current.timeScale = 0.62; NK.emit("skeleton:windup", sk); }
        } else {
          if (dist < C.keep[0]) { wx = -dx / dist; wz = -dz / dist; } // back off
          else if (dist > C.keep[1]) { wx = dx / dist; wz = dz / dist; }
          else face(hp, 6, dt);
          // stay inside the guard yard (north bank)
          if (me.z > 2.5 && wz > 0) wz = 0;
          if (Math.abs(me.x) > 10.5 && Math.sign(wx) === Math.sign(me.x)) wx = 0;
          if (st.cd === 0 && dist < C.keep[1] + 2 && dist > 3) { st.mode = "windup"; st.t = C.windup; face(hp); st.aim.copy(hp); sk.act("Ranged_Bow_Draw", { once: true }); NK.emit("skeleton:windup", sk); }
        }
      } else if (st.mode === "windup") {
        st.t -= dt;
        if (!warrior) { st.aim.lerp(hp, Math.min(1, dt * 2.2)); face(st.aim, 10, dt); } // the archer tracks slowly: strafe to dodge
        if (st.t <= 0) {
          marker.group.visible = false;
          if (warrior) {
            const a = Math.atan2(dx, dz); let d = a - sk.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
            if (!hero.dead && dist < C.reach + 0.35 && Math.abs(d) < C.arc + 0.15) {
              if (hero.blocks(me)) { NK.emit("hero:blocked", hp.clone().setY(1.2)); sk.velocity.x -= dx / dist * 4; sk.velocity.z -= dz / dist * 4; st.stun = 0.5; }
              else hero.hurt(1, me);
            }
            fx.emit({ at: sk.front ? sk.front() : me.clone().addScaledVector(new T.Vector3(Math.sin(sk.facing), 0, Math.cos(sk.facing)), 1.6).setY(0.2), n: 8, color: 0xcfc4b0, speed: 2.2, life: 0.4, gravity: -3, size: 0.8 });
          } else { sk.act("Ranged_Bow_Release", { once: true }); fireArrow(); }
          st.mode = "recover"; st.t = C.recover; st.cd = C.cooldown + NK.rng.float(0, 0.6);
        }
      } else if (st.mode === "recover") {
        st.t -= dt;
        if (st.t <= 0) st.mode = "chase";
      }
      sk.move(dt, wx, wz, false, run);
    },
    update(dt) {
      // telegraph
      if (st.mode === "windup" && sk.alive) {
        marker.group.visible = true;
        const p = sk.object.position, v = 1 - Math.max(0, st.t) / C.windup;
        if (warrior) { marker.group.position.set(p.x, 0.05, p.z); marker.group.rotation.y = sk.facing + Math.PI; marker.set(v); }
        else marker.aim(p, tmp.copy(p).add(new T.Vector3(Math.sin(sk.facing), 0, Math.cos(sk.facing)).multiplyScalar(14)), v);
      }
      // hit flash
      st.flash = Math.max(0, st.flash - dt);
      mats.forEach((m, i) => { if (!m.emissive) return; if (st.flash > 0) m.emissive.setRGB(0.22, 0.15, 0.1); else if (base[i]) m.emissive.copy(base[i]); });
      // death: crumble into the floor
      if (st.mode === "dead") {
        st.t += dt;
        if (st.t > 1.3) {
          sk.model.position.y -= dt * 0.9; blob.material.opacity = Math.max(0, 0.3 - (st.t - 1.3) * 0.3);
          if (st.t < 1.9 && NK.rng.chance(0.4)) fx.emit({ at: sk.object.position.clone().setY(0.3), n: 2, color: 0xb9ae98, speed: 1.4, up: 1.2, life: 0.6, gravity: -2, size: 1, spread: 0.6 });
          if (st.t > 3 && !st.gone) { st.gone = true; sk.object.visible = false; const p = sk.object.position; sk.teleport([p.x, -40, p.z]); }
        }
      }
    },
  });
  return sk;
});
