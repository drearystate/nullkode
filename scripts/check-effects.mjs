// React effects must return nothing or a cleanup function. A one-line effect like
// `useEffect(() => el.scrollIntoView(), [])` returns whatever the call returns;
// current browsers make scroll methods return a promise, React later calls it as
// the cleanup, and the whole page crashes ("u is not a function"). Write effects
// with a block body instead. Exits 1 and lists offenders.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const bad = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(name)) {
      readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        // `() => expression` (not `() => {` and not a returned cleanup `() => () =>`)
        if (/use(?:Layout|Insertion)?Effect\(\s*\(\)\s*=>(?!\s*\{)(?!\s*\(\)\s*=>)/.test(line)) bad.push(`${p}:${i + 1}: ${line.trim()}`);
      });
    }
  }
}
walk("src");
if (bad.length) {
  console.error("Effects must use a block body (they may only return a cleanup function):\n" + bad.join("\n"));
  process.exit(1);
}
console.log("check:effects OK");
