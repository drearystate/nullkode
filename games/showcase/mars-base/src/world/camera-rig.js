// Strategy camera rig (the kit's rigs follow a player; a base-builder needs pan + zoom over a fixed angle).
// Long lens (config.fov 26) at a fixed 28 deg yaw / 33 deg pitch = near-isometric with mild perspective.
// Mouse: drag pans, wheel zooms. Touch: one finger pans, two fingers pinch-zoom. Keys: WASD/arrows pan, +/- zoom.
// A press that moves < 8 px is a tap → onTap(clientX, clientY). Registered as world.rig (the kit updates it each frame).
NK.def("CameraRig", function (scene, o) {
  const cam = scene.camera, world = scene.world, dom = world.renderer.domElement;
  const deg = Math.PI / 180;
  const rig = {
    owner: scene, mode: "strategy",
    yaw: o.yaw * deg, pitch: o.pitch * deg,
    target: new THREE.Vector3(o.target[0], 0, o.target[1]), goal: new THREE.Vector3(o.target[0], 0, o.target[1]),
    dist: o.dist, goalDist: o.dist, minDist: o.minDist, maxDist: o.maxDist, bounds: o.bounds,
    focus: new THREE.Object3D(), // the kit's sun follows this, so shadows stay sharp where you look
    onTap: o.onTap || null, onHover: o.onHover || null,
    shake: 0,
    moveYaw() { return rig.yaw + Math.PI; },
    snap() { rig.target.copy(rig.goal); rig.dist = rig.goalDist; rig.apply(); },
    /** Distance actually used: pulls back a little in portrait so ~32 m of ground stays across the screen. */
    fitDist() { const a = cam.aspect; return a < 1 ? rig.dist * Math.min(1.6, 0.65 / a) : rig.dist; },
    apply() {
      const d = rig.fitDist();
      const dir = _d.set(Math.sin(rig.yaw) * Math.cos(rig.pitch), Math.sin(rig.pitch), Math.cos(rig.yaw) * Math.cos(rig.pitch));
      cam.position.copy(rig.target).addScaledVector(dir, d);
      if (rig.shake > 0) { cam.position.x += (NK.rng.float() - 0.5) * rig.shake; cam.position.y += (NK.rng.float() - 0.5) * rig.shake; }
      cam.lookAt(rig.target);
      rig.focus.position.copy(rig.target);
      // fog rides with the zoom: the colony is never hazed, the far plain always is
      const fog = world.scene.fog; if (fog) { fog.near = d + 18; fog.far = d + 120; }
      // shadow frustum hugs the visible ground: sharper shadows when zoomed in
      const sc = world.sun.shadow.camera, r = Math.max(22, d * 0.62);
      if (Math.abs(sc.right - r) > 0.5) { sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.far = 160; sc.updateProjectionMatrix(); }
    },
    update(dt) {
      NK.input.look(); // drain the kit's drag-look deltas (this rig pans instead)
      const kx = NK.input.axis("moveX"), ky = NK.input.axis("moveY");
      if (kx || ky) {
        const s = 22 * dt * (rig.dist / 60);
        const rx = Math.cos(rig.yaw), rz = -Math.sin(rig.yaw), fx = -Math.sin(rig.yaw), fz = -Math.cos(rig.yaw);
        rig.goal.x += (kx * rx - ky * fx) * s; rig.goal.z += (kx * rz - ky * fz) * s;
      }
      if (NK.input.down("zoomIn")) rig.goalDist -= 40 * dt;
      if (NK.input.down("zoomOut")) rig.goalDist += 40 * dt;
      rig.clamp();
      const k = 1 - Math.exp(-12 * dt);
      rig.target.lerp(rig.goal, k);
      rig.dist += (rig.goalDist - rig.dist) * k;
      if (rig.shake > 0) rig.shake = Math.max(0, rig.shake - dt * 2);
      rig.apply();
    },
    clamp() {
      const b = rig.bounds;
      rig.goal.x = THREE.MathUtils.clamp(rig.goal.x, b.minX, b.maxX);
      rig.goal.z = THREE.MathUtils.clamp(rig.goal.z, b.minZ, b.maxZ);
      rig.goalDist = THREE.MathUtils.clamp(rig.goalDist, rig.minDist, rig.maxDist);
    },
    /** Screen → ground point (y = 0 plane; the play area is flat), or null. */
    groundAt(clientX, clientY) {
      const r = dom.getBoundingClientRect();
      _ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      _ray.setFromCamera(_ndc, cam);
      const hit = _ray.ray.intersectPlane(_plane, _hit);
      return hit ? hit.clone() : null;
    },
    /** Moves the view so this ground point is centred (minimap clicks). */
    lookAt(x, z) { rig.goal.set(x, 0, z); rig.clamp(); },
    /** Pans by a screen-space drag of dx, dy pixels (keeps the grabbed ground point under the finger). */
    panPixels(dx, dy) {
      const r = dom.getBoundingClientRect();
      const worldPerPx = (2 * Math.tan((cam.fov * deg) / 2) * rig.fitDist()) / r.height;
      const rx = Math.cos(rig.yaw), rz = -Math.sin(rig.yaw), fx = -Math.sin(rig.yaw), fz = -Math.cos(rig.yaw);
      const fy = 1 / Math.sin(rig.pitch); // screen-up maps to ground-forward stretched by the view angle
      rig.goal.x -= (dx * rx - dy * fx * fy) * worldPerPx;
      rig.goal.z -= (dx * rz - dy * fz * fy) * worldPerPx;
      rig.clamp();
    },
  };
  const _d = new THREE.Vector3(), _ndc = new THREE.Vector2(), _ray = new THREE.Raycaster(), _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _hit = new THREE.Vector3();
  NK.input.bind({ zoomIn: ["Equal", "NumpadAdd"], zoomOut: ["Minus", "NumpadSubtract"] });

  // ---- pointer gestures (mouse + touch), all removed with the scene
  const pts = new Map();
  let gesture = null; // {x, y, moved, button, pinch}
  const down = (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { dom.setPointerCapture(e.pointerId); } catch (x) { /* synthetic */ }
    if (pts.size === 1) gesture = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, button: e.button, t: performance.now() };
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; gesture = { pinch: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, moved: true }; }
  };
  const move = (e) => {
    if (!pts.has(e.pointerId)) { if (e.pointerType === "mouse" && rig.onHover) rig.onHover(e.clientX, e.clientY); return; }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture) return;
    if (pts.size >= 2 && gesture.pinch) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      rig.goalDist *= gesture.pinch / Math.max(20, d);
      rig.panPixels(cx - gesture.cx, cy - gesture.cy);
      gesture.pinch = d; gesture.cx = cx; gesture.cy = cy;
      rig.clamp();
      return;
    }
    const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
    if (!gesture.moved && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > 8) gesture.moved = true;
    if (gesture.moved) rig.panPixels(dx, dy);
    gesture.x = e.clientX; gesture.y = e.clientY;
    if (e.pointerType === "mouse" && rig.onHover) rig.onHover(e.clientX, e.clientY);
  };
  const up = (e) => {
    const had = pts.delete(e.pointerId);
    if (!had) return;
    if (gesture && !gesture.moved && !gesture.pinch && pts.size === 0 && rig.onTap) rig.onTap(e.clientX, e.clientY, gesture.button, e.pointerType);
    if (pts.size === 0) gesture = null;
    else if (pts.size === 1) { const [p] = [...pts.values()]; gesture = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: true }; }
  };
  const wheel = (e) => { e.preventDefault(); rig.goalDist *= Math.exp(e.deltaY * 0.0012); rig.clamp(); };
  const ctx = (e) => e.preventDefault();
  dom.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  dom.addEventListener("wheel", wheel, { passive: false });
  dom.addEventListener("contextmenu", ctx);
  scene.onDispose(() => {
    dom.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
    dom.removeEventListener("wheel", wheel); dom.removeEventListener("contextmenu", ctx);
  });

  rig.focus.object = rig.focus; // the kit keeps a shadowFollow only if it has .object
  scene.add(rig.focus);
  world.rig = rig;
  world.shadowFollow = rig.focus;
  rig.snap();
  return rig;
});
