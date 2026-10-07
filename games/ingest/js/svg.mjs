// Rasterise SVGs to PNG previews (fit inside size x size, transparent) and report intrinsic size.
// Usage: node svg.mjs <jobs.json>   jobs: [{ input, output, result, size }]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

sharp.concurrency(1);
const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const job of jobs) {
  let res;
  try {
    const meta = await sharp(job.input).metadata();
    const size = job.size || 256;
    const scale = Math.max(1, Math.min(8, size / Math.max(meta.width || size, meta.height || size)));
    fs.mkdirSync(path.dirname(job.output), { recursive: true });
    await sharp(job.input, { density: Math.round(72 * scale), limitInputPixels: false })
      .resize(size, size, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toFile(job.output);
    res = { ok: true, width: meta.width, height: meta.height };
  } catch (e) {
    res = { ok: false, error: String(e.message || e).slice(0, 300) };
  }
  fs.mkdirSync(path.dirname(job.result), { recursive: true });
  fs.writeFileSync(job.result, JSON.stringify(res));
}
