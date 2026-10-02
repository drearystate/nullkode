// The parts of a message that must survive translation: {arguments}, select keys and <tags>.
// Parsed with the real ICU parser, so plural branches that start with a word ("one {You have …}")
// are not mistaken for arguments. Plural branches may differ per language (Arabic has
// zero/one/two/few/many/other); only the "other" branch is required.
import { parse } from "@formatjs/icu-messageformat-parser";

function walk(nodes, out) {
  for (const n of nodes) {
    switch (n.type) {
      case 1: out.add(`arg:${n.value}`); break; // {name}
      case 2: out.add(`number:${n.value}`); break;
      case 3: out.add(`date:${n.value}`); break;
      case 4: out.add(`time:${n.value}`); break;
      case 5: // select: same keys in every language
        out.add(`select:${n.value}:${Object.keys(n.options).sort().join("|")}`);
        for (const o of Object.values(n.options)) walk(o.value, out);
        break;
      case 6: // plural / selectordinal
        out.add(`plural:${n.value}${"other" in n.options ? "" : ":no-other"}`);
        for (const o of Object.values(n.options)) walk(o.value, out);
        break;
      case 8: out.add(`tag:${n.value}`); walk(n.children, out); break;
      default: break; // literal text, #
    }
  }
}

export function shape(s) {
  try {
    const out = new Set();
    walk(parse(s), out);
    return JSON.stringify([...out].sort());
  } catch (e) {
    return `invalid: ${e.message}`;
  }
}
