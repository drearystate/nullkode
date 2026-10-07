// Villagers: KayKit farmers walking the village roads between meaningful places (square, fields, lumber camp,
// dock, homes), doing a short task at each end. Deterministic: same people, same jobs, same starting points.
(() => {
  // job: route name, which end to work at, the task animation, how long, where along the route they start (0..1)
  const JOBS = [
    { model: "farmer-a", route: "east", extra: [[4, 0]], task: "Working_A", wait: 4, start: 0.55, side: 1 },
    { model: "farmer-b", route: "east", extra: [[3, 0]], task: "Digging", wait: 5, start: 0.15, side: -1, speed: 0.9 },
    { model: "farmer-a", route: "west", extra: [[-7, -1]], task: "Chopping", wait: 5, start: 0.62, side: 1, tint: 0.92 },
    { model: "farmer-b", route: "south", task: "Fishing_Idle", wait: 7, start: 0.8, side: -1 },
    { model: "farmer-b", route: "west", task: "Interact", wait: 3, start: 0.05, side: -1, short: 3 },
    { model: "farmer-a", route: "south", task: "PickUp", wait: 2.5, start: 0.3, side: 1, short: 3, speed: 1.1 },
  ];
  NK.def("Villagers", function (scene, V) {
    const HX = V.HX, PAL = NK.use("palette");
    const blobMat = new THREE.MeshBasicMaterial({ map: PAL.blobTexture(), color: 0x3a2d1a, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const blobGeo = new THREE.PlaneGeometry(0.5, 0.5).rotateX(-Math.PI / 2);
    blobGeo.__nkOwned = true;
    const people = [];
    const plaza = new THREE.Vector3(-1.2, 0, -0.4);
    const lite = NK3D.world && NK3D.world.tier !== "high";
    for (const job of lite ? JOBS.slice(0, 4) : JOBS) { // phones: four villagers (each is ~6k triangles)
      const cells = (V.routes[job.route] || []).slice(0, job.short || 99).concat(job.extra || []);
      if (cells.length < 2) continue;
      const pts = [plaza.clone()].concat(cells.slice(1).map(([c, r]) => { const w = HX.world(c, r); return new THREE.Vector3(w.x, 0, w.z); }));
      // last stop: stand at the edge of a building's hex, not inside it
      const last = pts[pts.length - 1], prev = pts[pts.length - 2];
      const endCell = V.cellAtWorld(last.x, last.z);
      if (endCell && endCell.building) last.lerp(prev, 0.55);
      let jettyFrom = 1;
      if (endCell && endCell.dock) { jettyFrom = (pts.length - 0.4) / pts.length; pts.push(new THREE.Vector3(endCell.dock.x, 0, endCell.dock.z)); }
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
      const len = curve.getLength();
      // villagers are grounded by their contact blob: no shadow casting (half the draw calls)
      const model = NK3D.model(job.model, { castShadow: false, receiveShadow: true, scale: PAL.scaleOf(job.model) });
      const holder = new THREE.Group();
      holder.add(model);
      scene.add(holder);
      const blob = new THREE.Mesh(blobGeo, blobMat);
      blob.renderOrder = 1;
      scene.add(blob);
      const anim = NK3D.animator(model, NK3D.clips("anims-move", "anims-general", "anims-tools"));
      const p = { job, curve, len, t: job.start * len, dir: 1, wait: 0, holder, blob, anim, speed: 0.42 * (job.speed || 1), facing: 0, jettyFrom };
      anim.play("Walking_A", { speed: 0.9 * (job.speed || 1) });
      people.push(p);
    }
    const tmp = new THREE.Vector3(), tan = new THREE.Vector3(), side = new THREE.Vector3();
    function place(p) {
      const u = THREE.MathUtils.clamp(p.t / p.len, 0, 1);
      p.curve.getPointAt(u, tmp);
      p.curve.getTangentAt(u, tan);
      // keep to one side of the path so two people never walk through each other
      side.set(-tan.z, 0, tan.x).multiplyScalar(0.16 * p.job.side * p.dir);
      tmp.add(side);
      tmp.y = u > p.jettyFrom ? 0.1 : V.heightAt(tmp.x, tmp.z); // on the jetty planks
      p.holder.position.copy(tmp);
      p.blob.position.set(tmp.x, tmp.y + 0.014, tmp.z);
      if (p.wait <= 0) {
        const want = Math.atan2(tan.x * p.dir, tan.z * p.dir);
        let d = want - p.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
        p.facing += d * 0.2;
      }
      p.holder.rotation.y = p.facing;
    }
    people.forEach((p) => { const u = THREE.MathUtils.clamp(p.t / p.len, 0, 1); p.curve.getTangentAt(u, tan); p.facing = Math.atan2(tan.x, tan.z); place(p); });
    return {
      people,
      /** dt already scaled by the game speed (0 when the village is paused). */
      update(dt, realDt) {
        for (const p of people) {
          if (p.wait > 0) {
            p.wait -= dt;
            if (p.wait <= 0) { p.dir = -p.dir; p.anim.play("Walking_A", { speed: 0.9 * (p.job.speed || 1) }); }
          } else {
            p.t += p.dir * p.speed * dt;
            if (p.t >= p.len || p.t <= 0) {
              p.t = THREE.MathUtils.clamp(p.t, 0, p.len);
              const atWork = p.t >= p.len;
              p.wait = atWork ? p.job.wait : 2 + (p.len % 2);
              p.anim.play(atWork ? p.job.task : "Idle_A", { fade: 0.25 });
            }
          }
          place(p);
          p.anim.update(dt > 0 ? dt : realDt * 0); // frozen when time is paused
        }
      },
    };
  });
})();
