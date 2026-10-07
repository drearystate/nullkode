// The knight (player): walks/runs screen-relative, swings (1), blocks with the shield while held (3), drinks a
// potion (4). Ability 2 is the mage's bolt (src/entities/mage.js). Health is in half hearts (NK.run.health).
NK.def("Hero", function (scene, pos, fx) {
  const T = THREE, Look = NK.use("Look");
  const hero = NK3D.character(scene, {
    model: "knight",
    clips: ["anim-general", "anim-move", "anim-melee"],
    anims: { idle: "Idle_A", walk: "Walking_A", run: "Running_A", jump: "Jump_Start", fall: "Jump_Idle", land: "Jump_Land" },
    speed: 4.4, runSpeed: 6.8, position: pos, facing: Math.PI * 1.25, radius: 0.45,
  });
  Look.hold(hero, "sword", "handslotr");
  Look.hold(hero, "shield", "handslotl");
  hero.name = "knight";
  hero.dead = false;
  const C = { swing: 0.42, hitAt: 0.11, reach: 2.45, arc: 1.25, potion: 1.1 };
  const st = { attackT: 0, hitPending: -1, combo: 0, hurtT: 0, invuln: 0, potionT: 0, stepT: 0, blockT: 0, hitstop: 0 };
  hero.state2 = st;
  hero.blocking = false;
  hero.cooldowns = { attack: 0, potion: 0 };

  // slash arc (white crescent, additive), parented to the knight so it follows the swing
  const arcMat = Look.additive(0xdff4ff, 0);
  const arc = new T.Mesh(new T.RingGeometry(1.0, 2.3, 22, 1, -1.15, 2.3), arcMat);
  arc.rotation.order = "YXZ";
  const arcHolder = new T.Group();
  arcHolder.position.y = 1.15;
  arcHolder.add(arc);
  hero.object.add(arcHolder);
  // shield ward (soft blue half ring on the floor while blocking)
  const ward = new T.Mesh(new T.RingGeometry(0.9, 1.5, 16, 1, Math.PI / 2 - 0.9, 1.8), Look.additive(0x6fb4ff, 0));
  ward.rotation.x = -Math.PI / 2; ward.position.y = 0.06; ward.renderOrder = 3;
  const wardHolder = new T.Group(); wardHolder.add(ward); hero.object.add(wardHolder);
  // contact shadow blob (grounds the character even outside the sun's shadow map)
  const blob = new T.Mesh(new T.CircleGeometry(0.75, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.035; blob.renderOrder = 1;
  hero.object.add(blob);

  // flash on hurt: per-instance material copies
  const mats = [];
  hero.model.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); mats.push(m.material); } });
  const flash = (r, g, b) => mats.forEach((m) => m.emissive && m.emissive.setRGB(r, g, b));

  hero.front = (d) => new T.Vector3(Math.sin(hero.facing), 0, Math.cos(hero.facing)).multiplyScalar(d === undefined ? 1.5 : d).add(hero.object.position);
  /** Can the knight's shield stop a blow coming from point p? (front 150°) */
  hero.blocks = (p) => {
    if (!hero.blocking || hero.dead) return false;
    const a = Math.atan2(p.x - hero.object.position.x, p.z - hero.object.position.z);
    let d = a - hero.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
    return Math.abs(d) < 1.3;
  };
  hero.hurt = (dmg, from) => {
    if (hero.dead || st.invuln > 0) return false;
    NK.run.health = Math.max(0, NK.run.health - dmg);
    st.invuln = 1.0; st.hurtT = 0.35;
    NK.audio.play("sfx-hurt", { volume: 0.8 });
    NK.vibrate(70);
    if (from) { const k = hero.object.position.clone().sub(from).setY(0).normalize().multiplyScalar(5); hero.velocity.x += k.x; hero.velocity.z += k.z; }
    fx.emit({ at: hero.object.position.clone().setY(1.2), n: 12, color: 0xff4040, speed: 4, life: 0.45, size: 1.1 });
    NK.emit("hero:hurt", hero);
    if (NK.run.health <= 0) { hero.dead = true; hero.locked = true; hero.blocking = false; hero.act("Death_A", { once: true }); NK.emit("hero:dead", hero); }
    else hero.act("Hit_A", { once: true });
    return true;
  };

  scene.add({
    fixedUpdate(dt) {
      for (const k of ["attackT", "hurtT", "invuln", "potionT", "hitstop"]) st[k] = Math.max(0, st[k] - dt);
      hero.cooldowns.attack = st.attackT / C.swing;
      hero.cooldowns.potion = st.potionT / C.potion;
      if (hero.dead || NK.run.won) { hero.blocking = false; return; }
      // shield: hold to block (slow walk, faces the way it's pushed)
      const wantBlock = NK.input.down("block") && st.attackT < 0.15 && st.hurtT === 0;
      if (wantBlock !== hero.blocking) {
        hero.blocking = wantBlock;
        if (wantBlock) { hero.act("Melee_Blocking"); NK.emit("hero:block", hero); }
        else if (hero.override === "Melee_Blocking") hero.act(null);
      }
      hero.speed = hero.blocking ? 1.7 : st.attackT > 0 ? 2.2 : 4.4;
      hero.runSpeed = hero.blocking ? 1.7 : st.attackT > 0 ? 2.2 : 6.8;
      // sword
      if (NK.input.pressed("attack") && st.attackT === 0 && !hero.blocking) {
        st.attackT = C.swing; st.hitPending = C.hitAt; st.combo = (st.combo + 1) % 2;
        const foe = (scene.foes || []).filter((f) => f.alive && f.object.position.distanceTo(hero.object.position) < 3.6).sort((a, b) => a.object.position.distanceTo(hero.object.position) - b.object.position.distanceTo(hero.object.position))[0];
        if (foe) hero.facing = Math.atan2(foe.object.position.x - hero.object.position.x, foe.object.position.z - hero.object.position.z);
        hero.act(st.combo ? "Melee_1H_Attack_Slice_Diagonal" : "Melee_1H_Attack_Slice_Horizontal", { once: true });
        arcMat.opacity = 0.9; arc.rotation.set(-1.25 + (st.combo ? 0.35 : 0), -Math.PI / 2, st.combo ? 0.5 : -0.5);
        NK.audio.play("sfx-swing", { volume: 0.7, rate: NK.rng.float(0.92, 1.08) });
        NK.emit("hero:swing", hero);
      }
      if (st.hitPending > 0) { st.hitPending -= dt; if (st.hitPending <= 0) { st.hitPending = -1; NK.emit("hero:strike", hero, C.reach, C.arc); } }
      if (hero.override && st.attackT === 0 && st.hurtT === 0 && !hero.blocking && st.potionT < C.potion - 0.7) hero.act(null);
      // potion
      if (NK.input.pressed("potion") && st.potionT === 0) {
        if (NK.run.potions > 0 && NK.run.health < NK.run.maxHealth) {
          NK.run.potions--; NK.run.health = Math.min(NK.run.maxHealth, NK.run.health + 2); st.potionT = C.potion;
          hero.act("Use_Item", { once: true });
          NK.audio.play("sfx-potion", { volume: 0.9 });
          fx.emit({ at: hero.object.position.clone().setY(0.6), n: 18, color: 0xff6b8a, speed: 1.2, up: 2.6, gravity: 0.5, life: 0.9, spread: 0.6, size: 1 });
          NK.emit("hero:potion", hero);
        } else NK.emit("hero:potion-denied", NK.run.potions > 0 ? "full" : "empty");
      }
      // footsteps
      const sp = Math.hypot(hero.velocity.x, hero.velocity.z);
      st.stepT -= dt * (sp / 4.4);
      if (sp > 0.8 && st.stepT <= 0) { st.stepT = 0.42; NK.audio.play("sfx-step", { volume: 0.22, rate: NK.rng.float(0.9, 1.1) }); }
    },
    update(dt) {
      // swing arc sweep + fade
      if (arcMat.opacity > 0) { arcMat.opacity = Math.max(0, arcMat.opacity - dt * 4.2); arc.rotation.z += dt * (st.combo ? -7 : 7); }
      ward.material.opacity += ((hero.blocking ? 0.55 : 0) - ward.material.opacity) * Math.min(1, dt * 12);
      // hurt blink (invulnerable) + red flash
      const blink = st.invuln > 0 && !hero.dead ? (Math.sin(st.invuln * 40) > 0 ? 0.35 : 0) : 0;
      flash(st.hurtT > 0.2 ? 0.4 : blink * 0.6, blink * 0.15, blink * 0.15);
      blob.material.opacity = 0.32;
    },
  });
  return hero;
});
