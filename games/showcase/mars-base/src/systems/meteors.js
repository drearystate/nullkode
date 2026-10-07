// Meteor watch (what Defense is for): every ~55 s a small meteor falls toward the colony. A Defense turret
// within range turns, fires and breaks it into crystals (+15). Without one it lands with a puff of dust.
// Telegraphed: a red target ring appears where it will land 2 s before impact.
NK.def("Meteors", function (scene, o) {
  const P = NK.use("PALETTE"), T = THREE;
  const rock = NK.use("piece")("boulder-a", { scale: 0.32, tint: 0x8a6a6a }); rock.visible = false; scene.add(rock);
  const glow = NK.use("glowSprite")(0xffa860, 3.2); rock.add(glow);
  const trail = [0.75, 0.55, 0.38].map((k, i) => { const s = NK.use("glowSprite")(0xff8a4a, 2.6 * k); s.material = s.material.clone(); s.material.opacity = k * 0.7; scene.add(s); s.visible = false; s.userData.lag = (i + 1) * 0.07; return s; });
  const mark = NK.use("groundRing")(1.4, 1.75, P.invalid, 0.9); mark.visible = false; scene.add(mark);
  const beamGeo = new T.CylinderGeometry(0.09, 0.09, 1, 6, 1, true); beamGeo.translate(0, 0.5, 0); beamGeo.rotateX(Math.PI / 2); beamGeo.__nkOwned = true;
  const beam = new T.Mesh(beamGeo, new T.MeshBasicMaterial({ color: P.cyan, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false })); beam.visible = false; scene.add(beam);
  const from = new T.Vector3(), to = new T.Vector3(), p = new T.Vector3(), hist = [];
  const m = {
    t: 0, active: false, dur: 3.4, turret: null, shotAt: 0, beamT: 0, warned: false,
    launch() {
      const hub = o.level.base.hub;
      const a = NK.rng.float(0, Math.PI * 2), r = NK.rng.float(9, 22);
      to.set(hub.x + Math.cos(a) * r, 0, hub.z + 9 + Math.abs(Math.sin(a)) * r * 0.5); // in front of the base: always on screen
      from.set(to.x - 22, 26, to.z - 6); // comes in from the upper left of the screen, like the sun
      m.t = 0; m.active = true; rock.visible = true; trail.forEach((s) => (s.visible = true));
      mark.position.set(to.x, 0.1, to.z); mark.visible = true; hist.length = 0;
      // the nearest turret in range takes the shot
      m.turret = null; let best = 24;
      for (const t of o.turrets()) { const d = Math.hypot(t.position.x - to.x, t.position.z - to.z); if (d < best) { best = d; m.turret = t; } }
      m.shotAt = m.turret ? 0.7 : 2;
    },
    update(dt) {
      if (beam.visible) { m.beamT -= dt; beam.material.opacity = Math.max(0, m.beamT / 0.3); if (m.beamT <= 0) beam.visible = false; }
      if (!m.active) return;
      m.t += dt / m.dur;
      const u = Math.min(1, m.t);
      p.lerpVectors(from, to, u); p.y = from.y * (1 - u) + Math.sin(u * Math.PI) * 4;
      rock.position.copy(p); rock.rotation.x += dt * 3; rock.rotation.z += dt * 2;
      hist.unshift(p.clone()); if (hist.length > 12) hist.pop();
      trail.forEach((s, i) => { const h = hist[Math.min(hist.length - 1, (i + 1) * 3)]; if (h) s.position.copy(h); });
      mark.scale.setScalar(1 + Math.sin(performance.now() / 120) * 0.08);
      if (m.turret) {
        const t = m.turret; const yaw = Math.atan2(p.x - t.position.x, p.z - t.position.z);
        let d = yaw - t.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); t.rotation.y += d * Math.min(1, dt * 10);
        if (u >= m.shotAt) {
          const muzzle = new T.Vector3(t.position.x, 3.0, t.position.z);
          beam.position.copy(muzzle); beam.lookAt(p); beam.scale.set(1, 1, muzzle.distanceTo(p));
          beam.visible = true; m.beamT = 0.3;
          m.end(); o.onShot && o.onShot(p.clone());
          return;
        }
      }
      if (u >= 1) { m.end(); o.onImpact && o.onImpact(to.clone()); }
    },
    end() { m.active = false; rock.visible = false; mark.visible = false; trail.forEach((s) => (s.visible = false)); },
  };
  scene.add(m);
  return m;
});
