// The knight: third-person character (walk/run/jump from the KayKit rig animations) + a swing attack.
NK.def("Hero", function (scene, pos) {
  const hero = NK3D.character(scene, {
    model: "knight",
    clips: ["anims-move", "anims-general"],
    anims: { idle: "Idle_A", walk: "Walking_A", run: "Running_A", jump: "Jump_Start", fall: "Jump_Idle", land: "Jump_Land" },
    speed: 4.5,
    runSpeed: 8,
    jump: 10.5,
    position: pos,
    facing: Math.PI,
  });
  hero.attackT = 0;
  hero.hurtT = 0;
  scene.add({
    fixedUpdate(dt) {
      hero.attackT = Math.max(0, hero.attackT - dt);
      hero.hurtT = Math.max(0, hero.hurtT - dt);
      if (hero.override && hero.attackT === 0 && hero.hurtT === 0 && !hero.dead) hero.act(null);
      if (NK.input.pressed("action") && hero.attackT === 0 && !hero.dead) {
        hero.attackT = 0.55;
        hero.act("Throw", { once: true });
        NK.emit("hero:attack", hero);
      }
    },
  });
  scene.onDispose(NK.on("character:jump", (c) => { if (c === hero) NK.audio.play("sfx-jump", { volume: 0.5 }); }));
  /** Point 1.5 units in front of the knight (where the swing lands). */
  hero.front = () => new THREE.Vector3(Math.sin(hero.facing), 0, Math.cos(hero.facing)).multiplyScalar(1.5).add(hero.object.position);
  return hero;
});
