// Hex grid maths for the KayKit hex tiles (2 m flat-to-flat). The tiles are modelled pointy-top; the village uses a
// flat-top grid (every tile turned 30°) so that rows read left-to-right on screen like the reference.
// Cells are written as offset coordinates [col, row] ("odd-q": odd columns sit half a row lower).
// World: x = col * √3, z = 2 * row + (col odd ? 1 : 0). Six neighbour directions j = 0..5 at 30° + 60°·j (atan2(z, x)).
(() => {
  const SQ3 = Math.sqrt(3);
  const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]; // axial (q, r) steps for j = 0..5
  const key = (c, r) => c + "," + r;
  const toAxial = (c, r) => [c, r - (c - (c & 1)) / 2];
  const fromAxial = (q, a) => [q, a + (q - (q & 1)) / 2];
  function world(c, r) { return { x: c * SQ3, z: 2 * r + (c & 1 ? 1 : 0) }; }
  function roundAxial(q, a) {
    let x = q, z = a, y = -x - z;
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
    return [rx, rz];
  }
  /** Cell [c, r] under a world point. */
  function cellAt(x, z) {
    const q = x / SQ3, a = (z - q) / 2;
    const [rq, ra] = roundAxial(q, a);
    return fromAxial(rq, ra);
  }
  function neighbour(c, r, j) { const [q, a] = toAxial(c, r); const d = DIRS[((j % 6) + 6) % 6]; return fromAxial(q + d[0], a + d[1]); }
  /** Direction index j from cell A to its neighbour B, or -1. */
  function dirTo(a, b) { for (let j = 0; j < 6; j++) { const n = neighbour(a[0], a[1], j); if (n[0] === b[0] && n[1] === b[1]) return j; } return -1; }
  function distance(a, b) {
    const [q1, r1] = toAxial(a[0], a[1]), [q2, r2] = toAxial(b[0], b[1]);
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
  }
  /** Contiguous cells from a to b (hex line). */
  function line(a, b) {
    const n = distance(a, b), out = [];
    const [q1, r1] = toAxial(a[0], a[1]), [q2, r2] = toAxial(b[0], b[1]);
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0 : i / n;
      const [q, r] = roundAxial(q1 + (q2 - q1) * t + 1e-6, r1 + (r2 - r1) * t + 1e-6);
      out.push(fromAxial(q, r));
    }
    return out;
  }
  /** Waypoints -> contiguous path of cells (duplicates removed). */
  function path(points) {
    const out = [];
    for (let i = 0; i < points.length - 1; i++) for (const c of line(points[i], points[i + 1])) {
      const last = out[out.length - 1];
      if (!last || last[0] !== c[0] || last[1] !== c[1]) out.push(c);
    }
    return out;
  }
  // Tile variants: which model edges (k = 0..5, at 60°·k in the model's own frame) carry the road / river.
  // Measured from the models' geometry (tools/diag): a straight, b gentle bend, c sharp bend, d-g forks, m dead end.
  const ROAD = [["road-a", [0, 3]], ["road-b", [3, 5]], ["road-c", [3, 4]], ["road-d", [1, 3, 5]], ["road-e", [0, 3, 5]], ["road-f", [0, 1, 3]], ["road-g", [2, 3, 4]], ["road-m", [3]]];
  const RIVER = [["river-a", [0, 3]], ["river-b", [3, 5]], ["river-c", [3, 4]]];
  /** Model + rotation for a set of world directions: model edge k ends up facing j = k - n - 1 when turned π/6 + n·π/3. */
  function autotile(variants, dirs) {
    const want = [...new Set(dirs)].sort().join(",");
    for (const [model, edges] of variants) {
      if (edges.length !== want.split(",").length) continue;
      for (let n = 0; n < 6; n++) {
        const got = edges.map((k) => (((k - n - 1) % 6) + 6) % 6).sort().join(",");
        if (got === want) return { model, rotY: Math.PI / 6 + (n * Math.PI) / 3, n };
      }
    }
    return null;
  }
  /** Rotation that turns a model's +Z front to face world direction j. */
  function faceRot(j) { const a = (30 + 60 * j) * Math.PI / 180; return Math.atan2(Math.cos(a), Math.sin(a)); }
  NK.def("hex", { SQ3, DIRS, key, world, cellAt, neighbour, dirTo, distance, line, path, autotile, faceRot, ROAD, RIVER, R: 2 / SQ3 });
})();
