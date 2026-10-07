// Optimise glTF/GLB models into the library and record metrics.
// Usage: node model.mjs <jobs.json>
//   jobs.json: [{ id, input, output, metricsOut }]
// Each job: read input (GLB or glTF+bin+textures), compute metrics, optimise
// (dedup, prune, resample, webp textures, meshopt compression that never touches
// node transforms), write GLB, read it back to prove it loads, write metrics JSON.
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, getBounds, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, resample, reorder, quantize, textureCompress, unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

sharp.concurrency(1);
const quiet = new Logger(Logger.Verbosity.ERROR);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
    'draco3d.decoder': await draco3d.createDecoderModule(),
  });

function metricsOf(doc) {
  const root = doc.getRoot();
  const scene = root.getDefaultScene() || root.listScenes()[0];
  let tris = 0, verts = 0, meshNodes = 0, morph = false;
  const seenTex = new Set();
  const walk = (node) => {
    const mesh = node.getMesh();
    if (mesh) {
      meshNodes++;
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        const idx = prim.getIndices();
        const n = idx ? idx.getCount() : pos ? pos.getCount() : 0;
        const mode = prim.getMode();
        if (mode === 4) tris += Math.floor(n / 3);
        else if (mode === 5 || mode === 6) tris += Math.max(0, n - 2);
        verts += pos ? pos.getCount() : 0;
        if (prim.listTargets().length) morph = true;
      }
    }
    node.listChildren().forEach(walk);
  };
  if (scene) scene.listChildren().forEach(walk);
  let bbox = null;
  if (scene) {
    try {
      const b = getBounds(scene);
      if (isFinite(b.min[0]) && isFinite(b.max[0])) {
        const r = (v) => Math.round(v * 10000) / 10000;
        bbox = { min: b.min.map(r), max: b.max.map(r), size: b.max.map((v, i) => r(v - b.min[i])) };
      }
    } catch (e) { /* ignore */ }
  }
  const clips = root.listAnimations().map((a) => {
    let dur = 0;
    for (const s of a.listSamplers()) {
      const inp = s.getInput();
      if (inp) dur = Math.max(dur, inp.getMax([0])[0]);
    }
    return { name: a.getName() || 'clip', duration: Math.round(dur * 1000) / 1000 };
  });
  const skins = root.listSkins();
  for (const t of root.listTextures()) seenTex.add(t);
  const texSizes = root.listTextures().map((t) => t.getSize()).filter(Boolean);
  const out = {
    triangles: tris,
    vertices: verts,
    meshNodes,
    nodes: root.listNodes().length,
    materials: root.listMaterials().length,
    materialNames: root.listMaterials().map((m) => m.getName()).filter(Boolean).slice(0, 20),
    textures: seenTex.size,
    textureMaxPx: texSizes.length ? Math.max(...texSizes.map((s) => Math.max(s[0], s[1]))) : 0,
    rigged: skins.length > 0,
    joints: skins.reduce((a, s) => a + s.listJoints().length, 0),
    morphTargets: morph,
    clips,
    bbox,
    nodeNames: root.listNodes().map((n) => n.getName()).filter(Boolean).slice(0, 40),
  };
  if (bbox) {
    const m = Math.max(...bbox.size);
    out.maxDimM = Math.round(m * 1000) / 1000;
    if (m > 100) out.scaleNote = 'very large (>100 m): source units may be centimetres';
    else if (m > 0 && m < 0.02) out.scaleNote = 'very small (<2 cm): source units may be off';
  }
  return out;
}

async function processJob(job) {
  const t0 = Date.now();
  const inSize = fs.statSync(job.input).size;
  const doc = await io.read(job.input);
  doc.setLogger(quiet);
  const metrics = metricsOf(doc);
  // Compression: never quantize POSITION/NORMAL so node transforms (pivots) stay untouched.
  const hasTextures = doc.getRoot().listTextures().length > 0;
  const transforms = [dedup(), prune({ keepLeaves: false, keepAttributes: false }), resample()];
  if (hasTextures) {
    transforms.push(
      textureCompress({ encoder: sharp, targetFormat: 'webp', formats: /png|webp/, lossless: true, effort: 70 }),
      textureCompress({ encoder: sharp, targetFormat: 'webp', formats: /jpeg/, quality: 88 }),
    );
  }
  await doc.transform(...transforms);
  let compressed = false;
  if (doc.getRoot().listAccessors().length) {
    if (!doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === 'KHR_mesh_primitive_restart')) {
      await doc.transform(
        reorder({ encoder: MeshoptEncoder, target: 'size' }),
        quantize({
          pattern: /^(TEXCOORD|JOINTS|WEIGHTS|COLOR)(_\d+)?$/,
          patternTargets: /^(TEXCOORD|JOINTS|WEIGHTS|COLOR)(_\d+)?$/,
        }),
      );
      doc.createExtension(EXTMeshoptCompression).setRequired(true)
        .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
      compressed = true;
    }
  }
  // Drop any Draco extension left from the input (we re-encode with meshopt).
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (ext.extensionName === 'KHR_draco_mesh_compression') ext.dispose();
  }
  await doc.transform(unpartition());
  doc.getRoot().getAsset().generator = 'nullkode game-assets ingest (glTF-Transform)';
  const glb = await io.writeBinary(doc);
  // Load check: parse the written GLB back.
  const back = await io.readBinary(glb);
  back.setLogger(quiet);
  const m2 = metricsOf(back);
  if (m2.triangles !== metrics.triangles || m2.clips.length !== metrics.clips.length) {
    throw new Error(`reload mismatch tris ${metrics.triangles}->${m2.triangles} clips ${metrics.clips.length}->${m2.clips.length}`);
  }
  fs.mkdirSync(path.dirname(job.output), { recursive: true });
  const tmp = job.output + '.tmp';
  fs.writeFileSync(tmp, glb);
  fs.renameSync(tmp, job.output);
  metrics.extensions = back.getRoot().listExtensionsUsed().map((e) => e.extensionName);
  metrics.meshopt = compressed;
  metrics.bytesIn = inSize;
  metrics.bytesOut = glb.byteLength;
  metrics.ms = Date.now() - t0;
  return metrics;
}

const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let ok = 0, fail = 0;
for (const job of jobs) {
  let result;
  try {
    result = { ok: true, metrics: await processJob(job) };
    ok++;
  } catch (e) {
    result = { ok: false, error: String(e && e.message || e).slice(0, 500) };
    fail++;
  }
  fs.mkdirSync(path.dirname(job.metricsOut), { recursive: true });
  fs.writeFileSync(job.metricsOut, JSON.stringify(result));
}
console.log(JSON.stringify({ ok, fail }));
