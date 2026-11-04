// Loads the shared runtime (src/nk-game/nk-game.js) in Node with a minimal browser stub, for tools
// and tests that use NK.progress (the world solver) outside a page.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
export function loadNK() {
  const noop = () => {};
  const el = () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop }, appendChild: noop, addEventListener: noop, setAttribute: noop, querySelector: () => null, querySelectorAll: () => [] });
  const mem = {};
  const win = {
    addEventListener: noop, removeEventListener: noop, navigator: {}, location: { pathname: "/node", search: "", hash: "" },
    localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    matchMedia: () => ({ matches: false, addEventListener: noop }), requestAnimationFrame: noop, performance: { now: () => 0 },
    document: { addEventListener: noop, createElement: el, body: el(), head: el(), documentElement: el(), querySelector: () => null, getElementById: () => null, hidden: false },
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "src/nk-game/nk-game.js"), "utf8"), win);
  return win.NK;
}
