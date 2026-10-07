/*!
 * nk-game-3d 1.1.0 — NullKode 3D game kit: three.js + Rapier physics + nk-game runtime driver.
 * Bundled into one classic script (nk-three.min.js) that exposes window.THREE, window.RAPIER, window.NK3D.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const NK = window.NK;
if (!NK) throw new Error("nk-three needs nk-game.js loaded first");
// Global THREE for game code (a plain copy of the namespace + the addons games commonly need).
window.THREE = Object.assign({}, THREE, { GLTFLoader, DRACOLoader, KTX2Loader, SkeletonUtils, BufferGeometryUtils, RoomEnvironment });
// Rapier (4 MB with its inline WebAssembly) is a separate file, loaded only when physics is on.
let RAPIER = null;
function loadRapier() {
  if (window.RAPIER) { RAPIER = window.RAPIER; return Promise.resolve(RAPIER); }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = cfg.rapierUrl || KIT_BASE + "rapier.min.js";
    if (NK3D.rapierIntegrity && !cfg.rapierUrl) { s.integrity = NK3D.rapierIntegrity; s.crossOrigin = "anonymous"; }
    s.onload = () => { RAPIER = window.RAPIER; NK3D.RAPIER = RAPIER; resolve(RAPIER); };
    s.onerror = () => reject(new Error("Could not load the physics engine (" + s.src + ")"));
    document.head.appendChild(s);
  });
}
// In 3D, W / ArrowUp walk forward; only Space (or pad A / touch) jumps.
NK.input.unbind("jump");
NK.input.bind("jump", ["Space", "pad:0", "touch:jump"]);
const KIT_BASE = (document.currentScript && document.currentScript.src || "").replace(/[^/]*$/, "");
const NK3D = (window.NK3D = { version: "1.1.0", three: THREE.REVISION, rapier: "0.21.0", THREE, RAPIER: null, rapierIntegrity: "__RAPIER_SRI__" });
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _box = new THREE.Box3();
let world = null; // the single running world
let cfg = null, bootSnapshot = null;

// ------------------------------------------------------------- quality tier
function detectTier() {
  const q = NK.settings.get("quality");
  if (q && q !== "auto") return q;
  let gpu = "";
  try {
    const c = document.createElement("canvas").getContext("webgl2");
    const ext = c && c.getExtension("WEBGL_debug_renderer_info");
    gpu = ext ? String(c.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    const lose = c && c.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
  } catch (e) { /* no webgl2 */ }
  NK3D.gpu = gpu;
  if (/swiftshader|llvmpipe|software/i.test(gpu)) return "low";
  if (NK.device.mobile) return NK.device.memory >= 6 && NK.device.cores >= 8 ? "medium" : "low";
  return NK.device.cores <= 2 || NK.device.memory <= 2 ? "medium" : "high";
}
const TIERS = {
  high: { pixelRatio: 2, shadows: true, shadowSize: 2048, shadowType: THREE.PCFSoftShadowMap, antialias: true },
  medium: { pixelRatio: 1.5, shadows: true, shadowSize: 1024, shadowType: THREE.PCFShadowMap, antialias: true },
  low: { pixelRatio: 1, shadows: true, shadowSize: 512, shadowType: THREE.PCFShadowMap, antialias: false },
};

// ------------------------------------------------------------------ physics
/** Thin Rapier wrapper. Bodies made from three.js objects; dynamic ones drive their object. */
class Physics {
  constructor(gravity) {
    this.world = new RAPIER.World({ x: 0, y: gravity, z: 0 });
    this.events = new RAPIER.EventQueue(true);
    this.dynamic = new Set();
    this.byCollider = new Map();
    this.R = RAPIER;
  }
  /**
   * add(object, {type:"fixed"|"dynamic"|"kinematic", shape:"box"|"sphere"|"capsule"|"cylinder"|"convex"|"trimesh",
   *              size:[x,y,z]|radius, mass, friction, restitution, sensor, onEnter(other), onExit(other), lockRotations, ccd})
   * Shapes default to the object's bounding box. Returns {body, collider, object, remove()}.
   */
  add(object, o = {}) {
    const R = RAPIER;
    object.updateWorldMatrix(true, true);
    const pos = object.getWorldPosition(new THREE.Vector3());
    const quat = object.getWorldQuaternion(new THREE.Quaternion());
    const scl = object.getWorldScale(new THREE.Vector3());
    const type = o.type || "fixed";
    const desc = type === "dynamic" ? R.RigidBodyDesc.dynamic() : type === "kinematic" ? R.RigidBodyDesc.kinematicPositionBased() : R.RigidBodyDesc.fixed();
    desc.setTranslation(pos.x, pos.y, pos.z).setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    if (o.ccd) desc.setCcdEnabled(true);
    if (o.lockRotations) desc.lockRotations();
    if (o.damping) desc.setLinearDamping(o.damping);
    const body = this.world.createRigidBody(desc);
    // Local-space bounds (without the object's own transform) → collider size + offset.
    const inv = new THREE.Matrix4().copy(object.matrixWorld).invert();
    _box.makeEmpty();
    object.traverse((m) => {
      if (!m.isMesh || !m.geometry) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      _box.union(b);
    });
    if (_box.isEmpty()) _box.set(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5));
    const size = _box.getSize(new THREE.Vector3()).multiply(scl);
    const center = _box.getCenter(new THREE.Vector3()).multiply(scl);
    if (o.size) Array.isArray(o.size) ? size.set(o.size[0], o.size[1], o.size[2]) : size.setScalar(o.size * 2);
    if (o.offset) center.set(o.offset[0], o.offset[1], o.offset[2]);
    const shape = o.shape || "box";
    let cd;
    if (shape === "sphere") cd = R.ColliderDesc.ball(o.radius || Math.max(size.x, size.y, size.z) / 2);
    else if (shape === "capsule") { const r = o.radius || Math.max(size.x, size.z) / 2; cd = R.ColliderDesc.capsule(Math.max(0.01, size.y / 2 - r), r); }
    else if (shape === "cylinder") cd = R.ColliderDesc.cylinder(size.y / 2, o.radius || Math.max(size.x, size.z) / 2);
    else if (shape === "convex" || shape === "trimesh") {
      const { vertices, indices } = meshData(object, inv, scl);
      cd = shape === "convex" ? R.ColliderDesc.convexHull(vertices) : R.ColliderDesc.trimesh(vertices, indices);
      if (!cd) cd = R.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
      center.set(0, 0, 0);
    } else cd = R.ColliderDesc.cuboid(Math.max(0.01, size.x / 2), Math.max(0.01, size.y / 2), Math.max(0.01, size.z / 2));
    cd.setTranslation(center.x, center.y, center.z);
    if (o.friction !== undefined) cd.setFriction(o.friction);
    if (o.restitution !== undefined) cd.setRestitution(o.restitution);
    if (o.mass) cd.setMass(o.mass);
    if (o.sensor) { cd.setSensor(true); cd.setActiveCollisionTypes(R.ActiveCollisionTypes.ALL); }
    if (o.sensor || o.onEnter || o.onExit) cd.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    const collider = this.world.createCollider(cd, body);
    const h = { body, collider, object, type, onEnter: o.onEnter, onExit: o.onExit, offsetY: 0, removed: false };
    h.remove = () => this.remove(h);
    collider.__nk = h;
    this.byCollider.set(collider.handle, h);
    if (type === "dynamic") { this.dynamic.add(h); h.parentInv = object.parent ? new THREE.Matrix4() : null; }
    return h;
  }
  remove(h) {
    if (!h || h.removed) return;
    h.removed = true;
    this.byCollider.delete(h.collider.handle);
    this.dynamic.delete(h);
    this.world.removeRigidBody(h.body);
  }
  step(dt) {
    this.world.timestep = dt;
    this.world.step(this.events);
    for (const h of this.dynamic) {
      const t = h.body.translation(), r = h.body.rotation();
      const obj = h.object;
      _v.set(t.x, t.y, t.z); _q.set(r.x, r.y, r.z, r.w);
      if (obj.parent && obj.parent.type !== "Scene") { obj.parent.updateWorldMatrix(true, false); obj.parent.worldToLocal(_v); }
      obj.position.copy(_v);
      obj.quaternion.copy(_q);
    }
    this.events.drainCollisionEvents((a, b, started) => {
      const ha = this.byCollider.get(a), hb = this.byCollider.get(b);
      if (!ha || !hb) return;
      const fire = (x, y) => { const f = started ? x.onEnter : x.onExit; if (f) NK.guard(f, x, [y.object, y], "physics contact"); };
      fire(ha, hb); fire(hb, ha);
    });
  }
  /** raycast(origin, dir, maxDist, excludeHandle) → {distance, point, normal, object} | null */
  raycast(origin, dir, max = 100, exclude) {
    const ray = new RAPIER.Ray({ x: origin.x, y: origin.y, z: origin.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.world.castRayAndGetNormal(ray, max, true, undefined, undefined, exclude ? exclude.collider : undefined, exclude ? exclude.body : undefined, (c) => !c.isSensor());
    if (!hit) return null;
    const toi = hit.timeOfImpact !== undefined ? hit.timeOfImpact : hit.toi;
    const h = this.byCollider.get(hit.collider.handle);
    return { distance: toi, point: new THREE.Vector3(origin.x + dir.x * toi, origin.y + dir.y * toi, origin.z + dir.z * toi), normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z), object: h ? h.object : null };
  }
  dispose() { try { this.world.free(); this.events.free(); } catch (e) { /* already freed */ } }
}
function meshData(object, inv, scl) {
  const geos = [];
  object.traverse((m) => {
    if (!m.isMesh || !m.geometry) return;
    const g = m.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
    g.morphAttributes = {};
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    geos.push(g.index ? g : g.toNonIndexed());
  });
  const merged = geos.length > 1 ? BufferGeometryUtils.mergeGeometries(geos.map((g) => (g.index ? g : BufferGeometryUtils.mergeVertices(g))), false) : geos[0];
  const pos = merged.attributes.position;
  const vertices = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { vertices[i * 3] = pos.getX(i) * scl.x; vertices[i * 3 + 1] = pos.getY(i) * scl.y; vertices[i * 3 + 2] = pos.getZ(i) * scl.z; }
  let indices;
  if (merged.index) indices = new Uint32Array(merged.index.array);
  else { indices = new Uint32Array(pos.count); for (let i = 0; i < pos.count; i++) indices[i] = i; }
  return { vertices, indices };
}

// ------------------------------------------------------------------ assets
const cache = { gltf: new Map(), tex: new Map() };
let gltfLoader = null;
function loaders(renderer) {
  if (gltfLoader) return gltfLoader;
  const draco = new DRACOLoader().setDecoderPath(cfg.dracoPath || KIT_BASE + "decoders/draco/");
  const ktx2 = new KTX2Loader().setTranscoderPath(cfg.basisPath || KIT_BASE + "decoders/basis/").detectSupport(renderer);
  gltfLoader = new GLTFLoader().setCrossOrigin("anonymous").setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  return gltfLoader;
}
/** Loads every model/animation/texture/audio in the manifest (skips ones already cached). */
NK3D.loadAll = async function (onProgress) {
  const list = NK.assets.byType(["model", "animation", "image", "texture"]);
  let done = 0;
  const total = list.length + 1;
  const tick = () => { done++; if (onProgress) onProgress(done / total); };
  const loader = loaders(world.renderer);
  const jobs = list.map(async (r) => {
    try {
      if (r.type === "model" || r.type === "animation") {
        if (cache.gltf.has(r.key)) return tick();
        const url = r.urls.glb || r.urls.gltf;
        const g = await loader.loadAsync(url);
        cache.gltf.set(r.key, g);
      } else {
        if (cache.tex.has(r.key)) return tick();
        const t = await new THREE.TextureLoader().setCrossOrigin("anonymous").loadAsync(r.urls.png || r.urls.webp || r.urls.jpg);
        t.colorSpace = THREE.SRGBColorSpace;
        cache.tex.set(r.key, t);
      }
    } catch (e) { NK.reportError(new Error("Could not load " + r.key + " (" + (r.id || "") + "): " + (e && e.message ? e.message : e && e.target && e.target.status ? "HTTP " + e.target.status : "network error") + " " + (r.urls.glb || r.urls.png || "")), "assets"); }
    tick();
  });
  jobs.push(NK.audio.loadAll().then(tick));
  await Promise.all(jobs);
};
NK3D.gltf = (key) => { const g = cache.gltf.get(key); if (!g) throw new Error('Model "' + key + '" is not loaded (add it to NK.assets.define)'); return g; };
NK3D.texture = (key) => cache.tex.get(key) || null;
/** A ready-to-place copy of a loaded model (skinned meshes cloned properly). {shadows:true, scale, height} */
NK3D.model = function (key, o = {}) {
  const src = NK3D.gltf(key).scene;
  const obj = SkeletonUtils.clone(src);
  const cast = o.castShadow !== undefined ? o.castShadow : o.shadows !== false;
  const recv = o.receiveShadow !== undefined ? o.receiveShadow : o.shadows !== false;
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; if (m.isSkinnedMesh) m.frustumCulled = false; } });
  if (o.height) { _box.setFromObject(obj); const hgt = _box.max.y - _box.min.y; if (hgt > 0) obj.scale.multiplyScalar(o.height / hgt); }
  else if (o.scale) obj.scale.multiplyScalar(o.scale);
  if (o.position) obj.position.set(...o.position);
  if (o.rotationY) obj.rotation.y = o.rotationY;
  return obj;
};
/** Bounding size of a loaded model (THREE.Vector3). */
NK3D.size = (keyOrObj) => { const o = typeof keyOrObj === "string" ? NK3D.gltf(keyOrObj).scene : keyOrObj; return new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); };
/** All animation clips from one or more loaded GLBs (e.g. a character + KayKit rig animation packs). */
NK3D.clips = (...keys) => keys.flat().flatMap((k) => NK3D.gltf(k).animations || []);

// --------------------------------------------------------------- animation
/** animator(object, clips) → play("Running_A"|"run", {fade, once, speed}). Names match exactly, then loosely. */
NK3D.animator = function (object, clips) {
  const mixer = new THREE.AnimationMixer(object);
  const byName = new Map(clips.map((c) => [c.name, c]));
  const find = (name) => {
    if (byName.has(name)) return byName.get(name);
    const l = name.toLowerCase();
    return clips.find((c) => c.name.toLowerCase() === l) || clips.find((c) => c.name.toLowerCase().startsWith(l)) || clips.find((c) => c.name.toLowerCase().includes(l)) || null;
  };
  const actions = new Map();
  const api = {
    mixer, clips, current: null, currentName: null,
    has: (n) => !!find(n),
    names: () => clips.map((c) => c.name),
    play(name, o = {}) {
      const clip = find(name);
      if (!clip) { NK.reportError(new Error('No animation "' + name + '". Clips: ' + clips.map((c) => c.name).join(", ")), "animator"); return null; }
      if (api.currentName === clip.name && !o.restart) return api.current;
      let a = actions.get(clip.name);
      if (!a) { a = mixer.clipAction(clip); actions.set(clip.name, a); }
      a.reset();
      a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      a.clampWhenFinished = !!o.once;
      a.timeScale = o.speed || 1;
      a.enabled = true;
      a.setEffectiveWeight(1);
      if (api.current && api.current !== a) a.crossFadeFrom(api.current, o.fade === undefined ? 0.2 : o.fade, false);
      a.play();
      api.current = a; api.currentName = clip.name;
      return a;
    },
    update: (dt) => mixer.update(dt),
    onFinished(fn) { mixer.addEventListener("finished", fn); },
  };
  return api;
};

// ---------------------------------------------------------- scene base class
/**
 * class extends NK3D.Scene { async create(data) {...}  fixedUpdate(dt) {...}  update(dt) {...} }
 * this.world (renderer/scene/camera/physics), this.add(obj), this.body(obj, opts), this.player (kept on live patches).
 */
class Scene {
  constructor(w, key) { this.world = w; this.key = key; this.root = new THREE.Group(); this.root.name = "scene:" + key; this.entities = []; this.handles = []; this.sounds = []; this.cleanups = []; }
  get THREE() { return THREE; }
  get physics() { return this.world.physics; }
  get camera() { return this.world.camera; }
  /** Adds a three.js object (and entities with fixedUpdate/update/dispose) to this scene. */
  add(obj, parent) {
    if (obj && obj.isObject3D) (parent || this.root).add(obj);
    else if (obj && (obj.fixedUpdate || obj.update)) this.entities.push(obj);
    if (obj && obj.object && obj.object.isObject3D && !obj.object.parent) this.root.add(obj.object);
    return obj;
  }
  remove(obj) {
    if (!obj) return;
    if (obj.isObject3D) { obj.removeFromParent(); obj.traverse((m) => { if (m.__nkBody) m.__nkBody.remove(); }); }
    const i = this.entities.indexOf(obj); if (i >= 0) this.entities.splice(i, 1);
    if (obj.dispose && !obj.isObject3D) obj.dispose();
  }
  /** Physics body for an object (see Physics.add). Removed with the scene. */
  body(obj, o) { if (!this.physics) throw new Error("physics is off (NK.config({physics:true}))"); const h = this.physics.add(obj, o); obj.__nkBody = h; this.handles.push(h); return h; }
  onDispose(fn) { this.cleanups.push(fn); }
  snapshot() {
    const s = {};
    const p = this.player && (this.player.object || this.player);
    if (p && p.position) s.player = { p: p.position.toArray(), ry: (this.player.facing !== undefined ? this.player.facing : p.rotation.y) };
    if (this.world.rig) s.rig = { yaw: this.world.rig.yaw, pitch: this.world.rig.pitch };
    return s;
  }
  restore(s) {
    if (s.player && this.player) { if (this.player.teleport) this.player.teleport(s.player.p, s.player.ry); else (this.player.object || this.player).position.fromArray(s.player.p); }
    if (s.rig && this.world.rig) { this.world.rig.yaw = s.rig.yaw; this.world.rig.pitch = s.rig.pitch; this.world.rig.snap(); }
  }
  create() {}
  fixedUpdate() {}
  update() {}
  _dispose() {
    this.cleanups.forEach((f) => NK.guard(f, this, [], this.key + ".dispose"));
    if (this.dispose) NK.guard(this.dispose, this, [], this.key + ".dispose");
    this.entities.forEach((e) => { if (e.dispose) NK.guard(e.dispose, e, [], "entity.dispose"); });
    this.handles.forEach((h) => this.physics && this.physics.remove(h));
    this.sounds.forEach((s) => s.stop && s.stop());
    this.root.removeFromParent();
    this.root.traverse((m) => { if (m.isMesh && m.geometry && m.geometry.__nkOwned) m.geometry.dispose(); });
    if (this.world.rig && this.world.rig.owner === this) this.world.rig = null;
  }
}
NK3D.Scene = Scene;

// ------------------------------------------------------------- camera rigs
/**
 * NK3D.cameraRig(scene, target, {mode:"third-person"|"top-down"|"fixed", distance, height, pitch, yaw, lookAtHeight, collide})
 * Third person: drag (mouse/touch right side) or right stick orbits; the camera pulls in before walls.
 */
NK3D.cameraRig = function (scene, target, o = {}) {
  const w = scene.world, cam = w.camera;
  const rig = {
    owner: scene, mode: o.mode || "third-person", target,
    distance: o.distance || 6, height: o.height || 1.6, lookAtHeight: o.lookAtHeight === undefined ? 1.2 : o.lookAtHeight,
    yaw: o.yaw || 0, pitch: o.pitch === undefined ? 0.35 : o.pitch, minPitch: o.minPitch === undefined ? -0.1 : o.minPitch, maxPitch: o.maxPitch === undefined ? 1.2 : o.maxPitch,
    sensitivity: o.sensitivity || 0.005, smooth: o.smooth === undefined ? 10 : o.smooth, collide: o.collide !== false,
    offset: new THREE.Vector3(...(o.offset || [0, 12, 9])),
    _pos: new THREE.Vector3(), _look: new THREE.Vector3(), _dist: o.distance || 6,
    targetPos() { const t = target.object || target; return t.getWorldPosition(_v2); },
    snap() { rig.update(1, true); },
    update(dt, instant) {
      const tp = rig.targetPos().clone();
      let want;
      const look = tp.clone(); look.y += rig.lookAtHeight;
      if (rig.mode === "top-down") want = tp.clone().add(rig.offset);
      else if (rig.mode === "fixed") want = new THREE.Vector3(...(o.position || [0, 10, 10]));
      else {
        if (!instant) { const l = NK.input.look(); rig.yaw -= l.dx * rig.sensitivity; rig.pitch = THREE.MathUtils.clamp(rig.pitch + l.dy * rig.sensitivity, rig.minPitch, rig.maxPitch); }
        const portrait = world.camera.aspect < 1;
        let d = rig.distance * (portrait ? 1.3 : 1);
        const pitch = Math.min(rig.maxPitch, rig.pitch + (portrait ? 0.2 : 0));
        const dir = new THREE.Vector3(Math.sin(rig.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(rig.yaw) * Math.cos(pitch));
        if (rig.collide && w.physics) {
          const hit = w.physics.raycast(look, dir, d, target.handle);
          if (hit) d = Math.max(0.8, hit.distance - 0.3);
        }
        rig._dist = instant ? d : THREE.MathUtils.damp(rig._dist, d, d < rig._dist ? 30 : 4, dt);
        want = look.clone().addScaledVector(dir, rig._dist);
      }
      if (instant) { rig._pos.copy(want); rig._look.copy(look); }
      else { rig._pos.lerp(want, 1 - Math.exp(-rig.smooth * dt)); rig._look.lerp(look, 1 - Math.exp(-rig.smooth * 1.5 * dt)); }
      cam.position.copy(rig._pos);
      cam.lookAt(rig._look);
    },
    /** Yaw that "forward" input should use (camera-relative movement). */
    moveYaw() { return rig.mode === "top-down" || rig.mode === "fixed" ? Math.PI : rig.yaw + Math.PI; },
  };
  w.rig = rig;
  rig.snap();
  return rig;
};

// ------------------------------------------------------- character controller
/**
 * NK3D.character(scene, {model:"knight", clips:["knight-moves","knight-general"], anims:{idle,walk,run,jump,fall,land},
 *   speed:4, runSpeed:7, jump:7.5, gravity, radius, height, position:[x,y,z], control:"player"|"none"})
 * Kinematic capsule (Rapier character controller): slopes, steps, snap to ground. Movement is camera-relative.
 */
NK3D.character = function (scene, o) {
  const w = scene.world;
  const obj = new THREE.Group();
  obj.name = "character";
  const model = typeof o.model === "string" ? NK3D.model(o.model, { height: o.modelHeight }) : o.model;
  if (o.modelScale) model.scale.multiplyScalar(o.modelScale);
  obj.add(model);
  const size = NK3D.size(model);
  const height = o.height || size.y || 1.8, radius = o.radius || Math.min(0.5, Math.max(size.x, size.z) * 0.3);
  const start = o.position || [0, 0, 0];
  obj.position.set(start[0], start[1], start[2]);
  scene.add(obj);
  const clips = o.clips ? NK3D.clips(o.clips) : NK3D.gltf(o.model).animations;
  const anim = NK3D.animator(model, clips);
  const names = Object.assign({ idle: "Idle", walk: "Walking_A", run: "Running_A", jump: "Jump_Start", fall: "Jump_Idle", land: "Jump_Land" }, o.anims || {});
  const R = RAPIER, phys = w.physics;
  const half = Math.max(0.05, height / 2 - radius);
  const body = phys.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start[0], start[1] + half + radius, start[2]));
  const collider = phys.world.createCollider(R.ColliderDesc.capsule(half, radius).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS).setActiveCollisionTypes(R.ActiveCollisionTypes.ALL), body);
  const handle = { body, collider, object: obj, type: "kinematic", removed: false, onEnter: o.onEnter, onExit: o.onExit };
  handle.remove = () => { if (!handle.removed) { handle.removed = true; phys.byCollider.delete(collider.handle); phys.world.removeRigidBody(body); } };
  phys.byCollider.set(collider.handle, handle);
  const kcc = phys.world.createCharacterController(0.02);
  kcc.setUp({ x: 0, y: 1, z: 0 });
  kcc.setMaxSlopeClimbAngle((o.maxSlope || 50) * Math.PI / 180);
  kcc.setMinSlopeSlideAngle(60 * Math.PI / 180);
  kcc.enableAutostep(o.step || 0.35, 0.2, false);
  kcc.enableSnapToGround(0.3);
  kcc.setApplyImpulsesToDynamicBodies(true);
  const ch = {
    object: obj, model, anim, handle, body, collider, controller: kcc, radius, height,
    speed: o.speed || 4, runSpeed: o.runSpeed || 7, jumpSpeed: o.jump || 7.5, gravity: o.gravity || w.gravity,
    velocity: new THREE.Vector3(), grounded: false, facing: o.facing || 0, control: o.control || "player", wish: new THREE.Vector3(), locked: false,
    _air: 0, _landT: 0, state: null,
    /** Moves by an input wish (x,z in -1..1, camera-relative already applied). Called by fixedUpdate for player control. */
    move(dt, wishX, wishZ, wantJump, running) {
      const sp = running ? ch.runSpeed : ch.speed;
      const target = _v.set(wishX * sp, 0, wishZ * sp);
      const accel = ch.grounded ? 14 : 5;
      ch.velocity.x = THREE.MathUtils.damp(ch.velocity.x, target.x, accel, dt);
      ch.velocity.z = THREE.MathUtils.damp(ch.velocity.z, target.z, accel, dt);
      if (ch.grounded && wantJump) { ch.velocity.y = ch.jumpSpeed; ch.grounded = false; ch._air = 0.01; NK.emit("character:jump", ch); }
      ch.velocity.y += ch.gravity * dt;
      if (ch.grounded && ch.velocity.y < 0) ch.velocity.y = -2;
      const delta = { x: ch.velocity.x * dt, y: ch.velocity.y * dt, z: ch.velocity.z * dt };
      kcc.computeColliderMovement(collider, delta, R.QueryFilterFlags.EXCLUDE_SENSORS);
      const m = kcc.computedMovement();
      const t = body.translation();
      body.setNextKinematicTranslation({ x: t.x + m.x, y: t.y + m.y, z: t.z + m.z });
      const wasGrounded = ch.grounded;
      ch.grounded = kcc.computedGrounded();
      if (ch.grounded && ch.velocity.y > 0 && m.y < delta.y * 0.5) ch.velocity.y = 0; // hit ceiling
      if (!ch.grounded) ch._air += dt; else { if (!wasGrounded && ch._air > 0.25) { ch._landT = 0.18; NK.emit("character:land", ch); } ch._air = 0; }
      if (Math.abs(wishX) + Math.abs(wishZ) > 0.05) {
        const want = Math.atan2(wishX, wishZ);
        let d = want - ch.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
        ch.facing += d * Math.min(1, dt * 12);
      }
    },
    fixedUpdate(dt) {
      if (ch.locked) { ch.move(dt, 0, 0, false, false); return; }
      if (ch.control === "player") {
        const ix = NK.input.axis("moveX"), iz = NK.input.axis("moveY");
        const yaw = w.rig ? w.rig.moveYaw() : Math.PI;
        // forward (-moveY) points away from the camera
        const fx = Math.sin(yaw), fz = Math.cos(yaw);
        const rx = Math.cos(yaw), rz = -Math.sin(yaw);
        let wx = -iz * fx - ix * rx, wz = -iz * fz - ix * rz;
        const len = Math.hypot(wx, wz); if (len > 1) { wx /= len; wz /= len; }
        ch.wish.set(wx, 0, wz);
        ch.move(dt, wx, wz, NK.input.pressed("jump"), NK.input.down("run") || len > 0.92 && NK.input.lastDevice === "touch");
      }
    },
    update(dt) {
      const t = body.translation();
      obj.position.set(t.x, t.y - half - radius, t.z);
      obj.rotation.y = ch.facing;
      const hs = Math.hypot(ch.velocity.x, ch.velocity.z);
      let st = "idle";
      if (!ch.grounded && ch._air > 0.12) st = ch.velocity.y > 0 ? "jump" : "fall";
      else if (ch._landT > 0) { st = "land"; ch._landT -= dt; }
      else if (hs > ch.speed + 0.5) st = "run";
      else if (hs > 0.4) st = "walk";
      if (ch.override) st = ch.override;
      if (st !== ch.state || ch.override) { ch.state = st; if (names[st]) anim.play(names[st], { fade: 0.15, once: st === "jump" || st === "land" || (ch.override && ch.overrideOnce) }); }
      anim.update(dt);
    },
    /** Plays a one-off animation (attack, hit, death...). Pass null to clear. */
    act(name, o2 = {}) { ch.override = name ? name : null; ch.overrideOnce = !!o2.once; if (name) anim.play(name, { once: !!o2.once, fade: 0.1, restart: true }); },
    teleport(p, facing) { body.setTranslation({ x: p[0], y: p[1] + half + radius, z: p[2] }, true); body.setNextKinematicTranslation({ x: p[0], y: p[1] + half + radius, z: p[2] }); ch.velocity.set(0, 0, 0); if (facing !== undefined) ch.facing = facing; ch.update(0); },
    get position() { return obj.position; },
    dispose() { handle.remove(); phys.world.removeCharacterController(kcc); },
  };
  scene.add(ch);
  scene.handles.push(handle);
  return ch;
};

// --------------------------------------------------------- instancing + LOD
/**
 * Many copies of one model as InstancedMeshes: NK3D.instances(scene, "floor", [[x,y,z,rotY,scale], ...], {physics:"fixed"})
 */
NK3D.instances = function (scene, key, transforms, o = {}) {
  const src = NK3D.gltf(key).scene;
  src.updateWorldMatrix(true, true);
  const group = new THREE.Group();
  group.name = "instances:" + key;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(), p = new THREE.Vector3();
  const mats = transforms.map((t) => { q.setFromAxisAngle(up, t[3] || 0); s.setScalar(t[4] || 1); p.set(t[0], t[1], t[2]); return new THREE.Matrix4().compose(p, q, s); });
  src.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, transforms.length);
    im.castShadow = o.castShadow !== undefined ? o.castShadow : true;
    im.receiveShadow = o.receiveShadow !== undefined ? o.receiveShadow : true;
    mats.forEach((mt, i) => { m4.multiplyMatrices(mt, mesh.matrixWorld); im.setMatrixAt(i, m4); });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });
  scene.add(group);
  if (o.physics && o.physics !== "none" && scene.physics) {
    const proxy = new THREE.Group();
    const bounds = new THREE.Box3().setFromObject(src);
    const sz = bounds.getSize(new THREE.Vector3()), c = bounds.getCenter(new THREE.Vector3());
    transforms.forEach((t, i) => {
      const holder = new THREE.Object3D();
      holder.applyMatrix4(mats[i]);
      scene.root.add(holder); holder.updateWorldMatrix(true, false);
      const h = scene.physics.add(holder, { type: "fixed", shape: "box", size: [sz.x, sz.y, sz.z], offset: [c.x, c.y, c.z], friction: o.friction });
      scene.handles.push(h);
      holder.removeFromParent();
    });
    void proxy;
  }
  return group;
};
/** Level-of-detail: NK3D.lod([[objNear, 0], [objFar, 30]]) — far copies may be NK3D.model(key, ...) of simpler assets. */
NK3D.lod = function (levels) { const l = new THREE.LOD(); levels.forEach(([obj, dist]) => l.addLevel(obj, dist)); return l; };
/** Distance helper (ignores Y when flat=true). */
NK3D.near = (a, b, r, flat) => { const pa = (a.object || a).position, pb = (b.object || b).position; const dx = pa.x - pb.x, dy = flat ? 0 : pa.y - pb.y, dz = pa.z - pb.z; return dx * dx + dy * dy + dz * dz <= r * r; };

// ------------------------------------------------------------- 3D audio
/** Positional sound on an object: NK3D.sound(scene, obj, "torch", {loop:true, volume:0.6, refDistance:2}) */
NK3D.sound = function (scene, obj, key, o = {}) {
  const h = { audio: null, stop() { if (h.audio && h.audio.isPlaying) h.audio.stop(); h.wanted = false; }, play() { h.wanted = true; make(); if (h.audio && !h.audio.isPlaying) h.audio.play(); }, wanted: o.autoplay !== false };
  const make = () => {
    if (h.audio || !world.listener || !NK.audio.has(key)) return;
    const a = new THREE.PositionalAudio(world.listener);
    a.setBuffer(NK.audio._buffer(key));
    a.setRefDistance(o.refDistance || 2);
    a.setRolloffFactor(o.rolloff || 1.5);
    a.setMaxDistance(o.maxDistance || 40);
    a.setLoop(!!o.loop);
    a.setVolume(o.volume === undefined ? 1 : o.volume);
    obj.add(a);
    h.audio = a;
    if (h.wanted) a.play();
  };
  make();
  if (!h.audio) { const off = NK.on("audio:listener", () => { off(); make(); }); scene.onDispose(off); }
  scene.sounds.push(h);
  return h;
};

// -------------------------------------------------------------- world/loop
function makeWorld() {
  const tierName = detectTier();
  const tier = Object.assign({}, TIERS[tierName] || TIERS.medium);
  const stage = NK.stage();
  const renderer = new THREE.WebGLRenderer({ antialias: tier.antialias, powerPreference: "high-performance", alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.maxPixelRatio || tier.pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping, none: THREE.NoToneMapping }[cfg.toneMapping || "aces"];
  renderer.toneMappingExposure = cfg.exposure || 1;
  renderer.shadowMap.enabled = cfg.shadows !== false && tier.shadows;
  renderer.shadowMap.type = tier.shadowType;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.background === undefined ? 0x87b5e0 : cfg.background);
  if (cfg.fog) scene.fog = new THREE.Fog(scene.background, cfg.fog[0], cfg.fog[1]);
  if (cfg.environment !== false) {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = cfg.environmentIntensity === undefined ? 0.6 : cfg.environmentIntensity;
    pm.dispose();
  }
  const camera = new THREE.PerspectiveCamera(cfg.fov || 55, 1, 0.1, cfg.far || 300);
  camera.position.set(0, 6, 10);
  const hemi = new THREE.HemisphereLight(cfg.skyColor || 0xcfe3ff, cfg.groundColor || 0x5a4a3a, cfg.ambient === undefined ? 1.2 : cfg.ambient);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(cfg.sunColor || 0xfff1dc, cfg.sun === undefined ? 2.2 : cfg.sun);
  const sunDir = new THREE.Vector3(...(cfg.sunDirection || [0.5, 1, 0.35])).normalize();
  sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(tier.shadowSize, tier.shadowSize);
  const sr = cfg.shadowRange || 18;
  Object.assign(sun.shadow.camera, { left: -sr, right: sr, top: sr, bottom: -sr, near: 0.5, far: 80 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const w = {
    THREE, renderer, scene, camera, sun, hemi, tier: tierName, tierCfg: tier, gravity: cfg.gravity || -20, physics: null, listener: null, rig: null, current: null, key: null, time: 0, paused: true,
    /** Keeps the shadow camera centred on a target so shadows stay sharp near the player. */
    shadowFollow: null,
    perfLog: [],
  };
  w.resize = () => {
    const r = stage.getBoundingClientRect();
    const W = Math.max(1, r.width), H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = (cfg.fov || 55) * (W < H ? 1.25 : 1); // wider view in portrait
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", w.resize);
  w.resize();
  w.updateSun = () => {
    const t = w.shadowFollow ? (w.shadowFollow.object || w.shadowFollow).position : _v.set(0, 0, 0);
    sun.target.position.copy(t);
    sun.position.copy(t).addScaledVector(sunDir, 30);
  };
  // drag to look (desktop mouse / touch outside controls)
  let drag = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  window.addEventListener("pointermove", (e) => { if (!drag || drag.id !== e.pointerId) return; NK.input.addLook(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY; });
  window.addEventListener("pointerup", (e) => { if (drag && drag.id === e.pointerId) drag = null; });
  return w;
}
function ensureListener() {
  if (world.listener || !NK.audio.ctx) return;
  THREE.AudioContext.setContext(NK.audio.ctx);
  const l = new THREE.AudioListener();
  l.gain.disconnect();
  l.gain.connect(NK.audio.channels.sfx);
  world.camera.add(l);
  if (!world.camera.parent) world.scene.add(world.camera);
  world.listener = l;
  NK.emit("audio:listener", l);
}
NK.on("audio:unlocked", () => { if (world) ensureListener(); });

// Performance guard: lower pixel ratio, then shadow quality, when fps stays low.
let perfWindow = [];
function perfGuard() {
  if (!world || world.paused || cfg.adaptive === false) return;
  perfWindow.push(NK.perf.fps);
  if (perfWindow.length < 3) return;
  const avg = perfWindow.reduce((a, b) => a + b, 0) / perfWindow.length;
  perfWindow = [];
  const r = world.renderer;
  const target = cfg.targetFps || 50;
  if (avg < target * 0.8) {
    const pr = r.getPixelRatio();
    if (pr > 0.75) { r.setPixelRatio(Math.max(0.75, pr - 0.25)); world.resize(); world.perfLog.push("pixelRatio→" + r.getPixelRatio()); }
    else if (world.sun.shadow.mapSize.x > 512) { world.sun.shadow.mapSize.set(512, 512); world.sun.shadow.map && world.sun.shadow.map.dispose(); world.sun.shadow.map = null; world.perfLog.push("shadows→512"); }
    else if (r.shadowMap.enabled) { r.shadowMap.enabled = false; world.scene.traverse((m) => { if (m.material) m.material.needsUpdate = true; }); world.perfLog.push("shadows→off"); }
  }
}
NK.on("perf", perfGuard);

const fixed = new NK.FixedStep(60, (dt) => {
  if (world.physics) world.physics.step(dt);
  const s = world.current;
  if (s) {
    NK.guard(s.fixedUpdate, s, [dt], s.key + ".fixedUpdate");
    for (const e of s.entities.slice()) if (e.fixedUpdate) NK.guard(e.fixedUpdate, e, [dt], "entity.fixedUpdate");
  }
  NK.input.endStep();
});
let last = 0;
function frame(t) {
  const dt = Math.min(0.1, last ? (t - last) / 1000 : 0.016);
  last = t;
  NK.input.poll();
  const s = world.current;
  if (!world.paused && s) {
    fixed.advance(dt);
    world.time += dt;
    for (const e of s.entities.slice()) if (e.update) NK.guard(e.update, e, [dt], "entity.update");
    NK.guard(s.update, s, [dt], s.key + ".update");
    if (world.rig) NK.guard(world.rig.update, world.rig, [dt], "camera rig");
  } else if (world.menuSpin) { world.menuSpin(dt); }
  world.updateSun();
  world.renderer.render(world.scene, world.camera);
}

async function runScene(key, data) {
  if (world.current) { world.current._dispose(); world.current = null; }
  world.rig = null;
  const Cls = NK.scene(key);
  if (!Cls) { NK.reportError(new Error('No "' + key + '" scene registered yet'), "scene"); return; }
  const s = typeof Cls === "function" ? new Cls(world, key) : Object.assign(new Scene(world, key), Cls);
  s.world = world; s.key = key; if (!s.root) Object.assign(s, new Scene(world, key));
  world.scene.add(s.root);
  world.key = key;
  try { await s.create(data || {}); } catch (e) { NK.reportError(e, key + ".create"); }
  if (data && data.__snapshot) NK.guard(s.restore, s, [data.__snapshot], key + ".restore");
  if (!world.rig && s.player) NK3D.cameraRig(s, s.player, cfg.camera || {});
  if (!world.shadowFollow || !world.shadowFollow.object) world.shadowFollow = s.player || null;
  world.current = s;
  world.lastData = Object.assign({}, data || {}); delete world.lastData.__snapshot;
  NK.emit("scene:created", key, s);
}

// ----------------------------------------------------------- default screens
function menuScreen() {
  const m = cfg.menu || {};
  NK.ui.screen("menu", { title: (NK.game && NK.game.title) || cfg.title || "Game", text: m.subtitle || "", buttons: [{ id: "play", label: m.play || "Play", style: "ok", onClick: () => NK.start() }, { id: "settings", label: "Settings", style: "alt", onClick: () => NK.ui.settings(() => menuScreen()) }] });
  const best = NK.save.best("score").best;
  if (best) NK.ui.root().querySelector('[data-nk-screen="menu"] .nk-panel').appendChild(NK.ui.h("p", { text: "Best " + best, style: "margin:12px 0 0" }));
}
function pauseScreen() {
  NK.ui.screen("pause", { title: "Paused", buttons: [{ id: "resume", label: "Resume", style: "ok", onClick: () => NK.resume() }, { id: "settings", label: "Settings", style: "alt", onClick: () => NK.ui.settings(() => pauseScreen()) }, { id: "quit", label: "Quit", style: "alt", onClick: () => NK.menu() }] });
}
function overScreen(d) {
  NK.ui.screen("over", { title: d.title || (d.win ? "You win!" : "Game over"), text: d.score !== undefined ? "Score " + d.score + (d.newBest ? "  New best!" : d.best ? "  Best " + d.best : "") : "", buttons: [{ id: "retry", label: d.win ? "Play again" : "Try again", style: "ok", onClick: () => NK.start() }, { id: "menu", label: "Menu", style: "alt", onClick: () => NK.menu() }] });
}
NK.on("state", async (to, from, data) => {
  if (!world) return;
  const P = cfg.playScene || "Game";
  NK.ui.close("menu"); NK.ui.close("pause"); NK.ui.close("over");
  if (to === "menu") {
    world.paused = true;
    if (NK.scene("Menu")) { await runScene("Menu", {}); world.paused = false; }
    else if (world.current && world.current.key === P) { /* keep the frozen level behind the menu */ }
    if (cfg.menu && cfg.menu.music) NK.audio.music(cfg.menu.music);
    menuScreen();
  } else if (to === "play") {
    if (from === "pause" && data && data.resumed) { world.paused = false; return; }
    world.paused = true;
    await runScene(P, data);
    world.paused = false;
  } else if (to === "pause") { world.paused = true; pauseScreen(); }
  else if (to === "over") { world.paused = true; overScreen(data || {}); }
  NK.touch.refresh();
});

// ------------------------------------------------------------------- driver
NK.driver = {
  name: "three-3d",
  async start(config, snapshot) {
    cfg = Object.assign({ physics: true, gravity: -20, background: 0x87b5e0 }, config);
    bootSnapshot = snapshot || null;
    world = makeWorld();
    NK3D.world = world;
    NK.ui.loading(0);
    if (cfg.physics !== false) {
      await loadRapier();
      await RAPIER.init();
      world.physics = new Physics(world.gravity);
    }
    world.renderer.setAnimationLoop(frame);
    await NK3D.loadAll((p) => NK.ui.loading(p * 0.98));
    NK.ui.loading(false);
    if (NK.audio.ctx) ensureListener();
    if (cfg.touch) NK.touch.setup(cfg.touch);
    if (cfg.orientation) NK.ui.orientationHint(cfg.orientation);
    if (bootSnapshot && bootSnapshot.state === "play") { const s = bootSnapshot; bootSnapshot = null; NK.state.go("play", Object.assign({}, s.data || {}, { __snapshot: s.snap })); }
    else if (cfg.menu === false) NK.start();
    else NK.state.go("menu");
  },
  currentScene() { return world && world.current ? world.current.key : null; },
  stats() {
    if (!world) return null;
    const i = world.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, pixelRatio: world.renderer.getPixelRatio(), shadows: world.renderer.shadowMap.enabled, tier: world.tier, bodies: world.physics ? world.physics.world.bodies.len() : 0, perfLog: world.perfLog.slice(-5) };
  },
  snapshot() {
    const s = world && world.current;
    return { state: NK.state.current === "pause" || NK.state.current === "over" ? "play" : NK.state.current, data: world ? world.lastData || {} : {}, snap: s && s.snapshot ? NK.guard(s.snapshot, s, [], "snapshot") : null };
  },
  async hotReload(c) {
    if (!world) return "reload";
    if (c.config) {
      const n = Object.assign({ physics: true, gravity: -20, background: 0x87b5e0 }, NK.config());
      if (n.physics !== cfg.physics || n.shadows !== cfg.shadows || n.gravity !== cfg.gravity) return "reload";
      Object.assign(cfg, n);
      if (n.background !== undefined) world.scene.background = new THREE.Color(n.background);
      if (cfg.touch) NK.touch.setup(cfg.touch);
    }
    if (c.assets) await NK3D.loadAll();
    const s = world.current;
    if (s && (NK.state.current === "play" || NK.state.current === "pause" || NK.state.current === "over")) {
      const snap = NK.guard(s.snapshot, s, [], "snapshot");
      const wasPaused = world.paused;
      world.paused = true;
      await runScene(s.key, Object.assign({}, world.lastData || {}, { __snapshot: snap }));
      world.paused = wasPaused;
    } else if (NK.state.current === "play" && !s) {
      await runScene(cfg.playScene || "Game", {});
      world.paused = false;
    }
    return "hot";
  },
};
export default NK3D;
