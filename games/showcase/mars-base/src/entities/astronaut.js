// Colonists: the KayKit Space Ranger (one character style for every person) at 2.2 m, with the pack's
// helmet + backpack on the head/chest bones. Idle, work or walk a short patrol between points.
(function () {
  /** A soft contact shadow that moves with its owner (dynamic objects: people, rover, build ghost). */
  NK.def("contactShadow", function (r, opacity) {
    const P = NK.use("PALETTE");
    const mat = NK.use("sharedMaterial")("blobDyn:" + (opacity || 0.6), () => new THREE.MeshBasicMaterial({ map: NK.use("blobTexture")(), color: P.shadow, transparent: true, opacity: opacity || 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const geo = NK.use("sharedMaterial")("blobGeo", () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; });
    const m = new THREE.Mesh(geo, mat); m.scale.set(r * 2.3, 1, r * 2.3); m.position.y = 0.06; m.renderOrder = 1;
    return m;
  });

  NK.def("Astronaut", function (scene, o) {
    const obj = new THREE.Group(); obj.name = "astronaut";
    const model = NK3D.model("ranger", { height: o.height || 2.2 }); // chibi colonist: 2.2 m reads at this camera distance (doors ~2.4 m)
    NK.use("normalise")(model);
    const head = model.getObjectByName("head"), chest = model.getObjectByName("chest");
    if (head) { const h = NK3D.model("helmet"); NK.use("normalise")(h); head.add(h); }
    if (chest) {
      const b = NK3D.model("backpack"); NK.use("normalise")(b);
      b.traverse((n) => { if (/Wing/i.test(n.name)) n.visible = false; });
      chest.add(b);
    }
    obj.add(model);
    obj.add(NK.use("contactShadow")(0.55, 0.55));
    obj.position.set(o.x, 0, o.z);
    obj.rotation.y = (o.rot || 0) * Math.PI / 180;
    scene.add(obj);
    const anim = NK3D.animator(model, NK3D.clips("anims-general", "anims-move", "anims-tools"));
    const names = { idle: "Idle_A", walk: "Walking_A", work: "Working_A", wave: "Interact" };
    anim.play(names[o.anim === "work" ? "work" : "idle"]);
    // offset each colonist's animation phase so a group never moves in lockstep
    anim.mixer.update(((o.x * 7.3 + o.z * 3.1) % 3 + 3) % 3);
    const pts = o.patrol || null;
    const e = {
      object: obj, anim, i: 0, wait: 1.5, speed: 1.3,
      update(dt) {
        if (pts) {
          if (e.wait > 0) { e.wait -= dt; if (e.wait <= 0) anim.play(names.walk); }
          else {
            const [tx, tz] = pts[(e.i + 1) % pts.length];
            const dx = tx - obj.position.x, dz = tz - obj.position.z, d = Math.hypot(dx, dz);
            if (d < 0.1) { e.i = (e.i + 1) % pts.length; e.wait = 2 + ((e.i * 1.7) % 2); anim.play(names.idle); }
            else {
              const s = Math.min(d, e.speed * dt);
              obj.position.x += (dx / d) * s; obj.position.z += (dz / d) * s;
              let a = Math.atan2(dx, dz) - obj.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a));
              obj.rotation.y += a * Math.min(1, dt * 8);
            }
          }
        }
        anim.update(dt);
      },
    };
    scene.add(e);
    return e;
  });
})();
