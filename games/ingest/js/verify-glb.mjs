// Load GLBs with three.js GLTFLoader in Node (minimal DOM shims for textures) and report what loaded.
// Usage: node verify-glb.mjs <list.json>   list: [{ id, path }]  -> prints JSON array of results
import fs from 'node:fs';

class FakeImage {
  constructor() { this.width = 1; this.height = 1; this._l = {}; }
  addEventListener(t, f) { this._l[t] = f; }
  removeEventListener() {}
  set src(v) {
    this._src = v;
    setTimeout(() => { this._l.load && this._l.load.call(this, {}); this.onload && this.onload(); }, 0);
  }
  get src() { return this._src; }
}
globalThis.Image = FakeImage;
globalThis.document = { createElementNS: () => new FakeImage(), createElement: () => new FakeImage() };
globalThis.self = globalThis;

const THREE = await import('three');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');

const list = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const out = [];
for (const item of list) {
  const t0 = Date.now();
  try {
    const buf = fs.readFileSync(item.path);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const gltf = await new Promise((res, rej) => loader.parse(ab, '', res, rej));
    let tris = 0, meshes = 0, skinned = 0, textures = 0;
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        if (o.isSkinnedMesh) skinned++;
        const g = o.geometry;
        tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if (m && m.map) textures++;
      }
    });
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    out.push({ id: item.id, ok: true, tris: Math.round(tris), meshes, skinned, texturedMaterials: textures,
      clips: gltf.animations.map((a) => a.name), size: [size.x, size.y, size.z].map((v) => Math.round(v * 1000) / 1000),
      ms: Date.now() - t0 });
  } catch (e) {
    out.push({ id: item.id, ok: false, error: String(e && e.message || e).slice(0, 300) });
  }
}
console.log(JSON.stringify(out));
