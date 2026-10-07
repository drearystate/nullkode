// Orthographic camera rig (the kit's rigs are perspective + player-following; this one is the game's own).
// The scene swaps it into world.camera while it runs and puts the kit's camera back on dispose.
//  - elevated orthographic view, pitched 40° down, yawed so the village reads diagonally
//  - pan by drag, zoom by wheel / pinch (about the pointer), both clamped so the world's edge never shows
//  - fits the sun's shadow box to what is on screen every frame (sharp shadows at any zoom)
NK.def("OrthoRig", function (scene, o) {
  const w = scene.world;
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.5, 300);
  const prev = w.camera;
  w.camera = cam;
  if (prev.parent) prev.parent.add(cam); // keeps the audio listener's parent chain alive
  scene.onDispose(() => { if (w.camera === cam) w.camera = prev; cam.removeFromParent(); w.shadowFollow = null; });

  const D = 120; // camera distance along the view ray (orthographic: only sets clipping)
  const rig = {
    camera: cam,
    target: new THREE.Vector3(o.target[0], 0, o.target[1]),
    goal: new THREE.Vector3(o.target[0], 0, o.target[1]),
    yaw: THREE.MathUtils.degToRad(o.yaw), pitch: THREE.MathUtils.degToRad(o.pitch),
    width: o.width, goalWidth: o.width, minWidth: o.minWidth, maxWidth: o.maxWidth,
    home: { x: o.target[0], z: o.target[1] }, pan: o.pan || [10, 8],
    drift: 0, // menu backdrop: slow sideways drift
    _w: 0, _h: 0,
    /** Visible world width for this aspect: landscape keeps the width, portrait keeps at least 60% of it. */
    viewWidth(aspect) { return aspect >= 1 ? rig.width : Math.max(rig.width * aspect * 1.25, rig.width * 0.64); },
    right() { return new THREE.Vector3(Math.cos(rig.yaw), 0, -Math.sin(rig.yaw)); },
    fwd() { return new THREE.Vector3(-Math.sin(rig.yaw), 0, -Math.cos(rig.yaw)); },
    clampGoal() {
      const g = rig.goal, h = rig.home;
      const slack = Math.max(0, (o.maxWidth - rig.goalWidth) / (o.maxWidth - o.minWidth)); // zoomed in = more room to pan
      const px = rig.pan[0] * (0.55 + 0.45 * slack), pz = rig.pan[1] * (0.55 + 0.45 * slack);
      g.x = THREE.MathUtils.clamp(g.x, h.x - px, h.x + px);
      g.z = THREE.MathUtils.clamp(g.z, h.z - pz, h.z + pz);
    },
    /** Drag by screen pixels. */
    panBy(dxPx, dyPx) {
      const per = rig.viewWidth(rig._w / Math.max(1, rig._h)) / Math.max(1, rig._w);
      const r = rig.right(), f = rig.fwd();
      rig.goal.addScaledVector(r, -dxPx * per).addScaledVector(f, (dyPx * per) / Math.sin(rig.pitch));
      rig.clampGoal();
    },
    /** Zoom by a factor (<1 = closer) keeping the ground point under (px, py) in place. */
    zoomBy(f, px, py) {
      const before = rig.groundAt(px, py, true);
      rig.goalWidth = THREE.MathUtils.clamp(rig.goalWidth * f, rig.minWidth, rig.maxWidth);
      const saveW = rig.width, saveT = rig.target.clone();
      rig.width = rig.goalWidth; rig.target.copy(rig.goal); rig.place();
      const after = rig.groundAt(px, py, true);
      rig.width = saveW; rig.target.copy(saveT); rig.place();
      if (before && after) { rig.goal.x += before.x - after.x; rig.goal.z += before.z - after.z; }
      rig.clampGoal();
    },
    place() {
      const W = rig._w || 1, H = rig._h || 1, aspect = W / H;
      const vw = rig.viewWidth(aspect), vh = vw / aspect;
      cam.left = -vw / 2; cam.right = vw / 2; cam.top = vh / 2; cam.bottom = -vh / 2;
      cam.updateProjectionMatrix();
      const dir = new THREE.Vector3(Math.sin(rig.yaw) * Math.cos(rig.pitch), Math.sin(rig.pitch), Math.cos(rig.yaw) * Math.cos(rig.pitch));
      cam.position.copy(rig.target).addScaledVector(dir, D);
      cam.lookAt(rig.target);
      cam.updateMatrixWorld(true);
    },
    /** World point on the ground plane (y = 0) under a client pixel. */
    groundAt(px, py, raw) {
      const el = w.renderer.domElement, rc = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((px - rc.left) / rc.width) * 2 - 1, -((py - rc.top) / rc.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, cam);
      const t = -ray.ray.origin.y / ray.ray.direction.y;
      if (!isFinite(t) || t < 0) return null;
      return ray.ray.origin.clone().addScaledVector(ray.ray.direction, t);
    },
    /** Client pixel of a world point (for HUD markers). */
    toScreen(v) {
      const el = w.renderer.domElement, rc = el.getBoundingClientRect();
      const p = v.clone().project(cam);
      return { x: rc.left + (p.x + 1) / 2 * rc.width, y: rc.top + (1 - p.y) / 2 * rc.height };
    },
    /** Sun shadow box around the visible ground (orthographic view = a known rectangle). */
    fitShadow() {
      const sun = w.sun;
      if (!sun || !sun.castShadow) return;
      const vw = cam.right - cam.left, vh = cam.top - cam.bottom;
      const depth = vh / Math.sin(rig.pitch);
      const half = Math.sqrt(vw * vw + depth * depth) / 2 + 2.5;
      const sc = sun.shadow.camera;
      if (Math.abs(sc.right - half) > 0.01) {
        Object.assign(sc, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 90 });
        sc.updateProjectionMatrix();
      }
    },
    update(dt) {
      const el = w.renderer.domElement;
      const W = el.clientWidth || el.width, H = el.clientHeight || el.height;
      rig._w = W; rig._h = H;
      if (rig.drift) { rig.yaw += rig.drift * dt; }
      const k = 1 - Math.exp(-12 * dt);
      rig.target.lerp(rig.goal, k);
      rig.width += (rig.goalWidth - rig.width) * k;
      rig.place();
      rig.fitShadow();
    },
  };
  // Soft, slightly lifted shadows: wider PCF disk + 88% strength keeps detail readable in shade.
  if (w.sun) { w.sun.shadow.radius = 2.6; w.sun.shadow.intensity = 0.88; w.sun.shadow.bias = -0.0006; w.sun.shadow.normalBias = 0.02; }
  // Shadow box follows the camera target (the kit centres the sun on world.shadowFollow).
  const follow = new THREE.Object3D();
  w.shadowFollow = { object: follow };
  const upd = rig.update;
  rig.update = (dt) => { upd(dt); follow.position.copy(rig.target); };
  rig._w = w.renderer.domElement.clientWidth; rig._h = w.renderer.domElement.clientHeight;
  rig.update(1);
  return rig;
});
