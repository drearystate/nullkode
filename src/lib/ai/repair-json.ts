/**
 * Salvages a JSON string that got truncated mid-way — the model's output
 * was cut off by a token limit, stream hiccup, or network blip — by
 * rewinding to the last clearly-complete structural point and closing
 * every open container on the way back up.
 *
 * Why: when mini scaffolds a complex multi-entity app it occasionally
 * outputs well-formed JSON for the first N pages/flows but runs out of
 * budget mid-string. Refusing to parse that dumps everything, including
 * the 90% that was fine. This best-effort repair lets the scaffolder
 * keep whatever objects finished cleanly.
 *
 * Strategy:
 *   1. Walk the string tracking string/array/object nesting.
 *   2. If we end up inside a string, walk back to the last structural
 *      character before that string started.
 *   3. Trim any trailing comma.
 *   4. Emit the remaining open `]` / `}` in reverse order.
 */
export function repairTruncatedJson(input: string): string | null {
  if (!input) return null;
  const stack: Array<"{" | "["> = [];
  let inString = false;
  let stringStart = -1;
  let escape = false;
  // Track last index *outside* any string where we saw a structural char,
  // so we can rewind there if the string is never closed.
  let lastSafeIdx = -1;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === '"') { inString = false; lastSafeIdx = i; }
      continue;
    }
    if (c === '"') { inString = true; stringStart = i; continue; }
    if (c === "{" || c === "[") {
      stack.push(c);
      lastSafeIdx = i;
    } else if (c === "}" || c === "]") {
      stack.pop();
      lastSafeIdx = i;
    } else if (c === "," || c === ":") {
      lastSafeIdx = i;
    }
  }

  // If we're stuck inside an unterminated string, rewind before it started
  // and re-walk to get accurate container depth up to that point.
  let end = input.length;
  if (inString && stringStart >= 0) {
    end = stringStart;
    // Re-walk [0, end) to recompute open containers without the unterminated string.
    stack.length = 0;
    inString = false;
    escape = false;
    for (let i = 0; i < end; i++) {
      const c = input[i];
      if (inString) {
        if (escape) { escape = false; continue; }
        if (c === "\\") { escape = true; continue; }
        if (c === '"') { inString = false; }
        continue;
      }
      if (c === '"') { inString = true; continue; }
      if (c === "{" || c === "[") stack.push(c);
      else if (c === "}" || c === "]") stack.pop();
    }
  }

  let body = input.slice(0, end);

  // Trim trailing whitespace + any dangling comma or colon or half-written
  // key/value so we don't hand JSON.parse something like `…,` or `…:`.
  body = body.replace(/[\s,:]+$/g, "");

  // If the last character is a quote, it's likely the closing quote of a
  // fully-formed string but the next expected token (comma or brace) is
  // missing — leave it; the close step adds the right container.
  // If the last character is a number-ish like "12.", strip the trailing dot.
  body = body.replace(/\.\s*$/g, "");

  // If we're sitting inside an object and the previous token was a bare key
  // like `"html"` with no colon/value, we need to drop back to the last
  // complete key-value pair. Approximate by trimming back to the last "}"
  // or "]" when we're mid-object without a colon on the current key.
  // This is a rough heuristic; good enough for scaffold JSON.
  // Find last complete top-level or nested value by backtracking to the last
  // ","/"]"/"}" that leaves the container stack sensible.

  // Close every still-open container in reverse order.
  const closers: string[] = [];
  for (let i = stack.length - 1; i >= 0; i--) {
    closers.push(stack[i] === "{" ? "}" : "]");
  }
  const repaired = body + closers.join("");

  // Final sanity: try parse; if it still fails, try stripping one trailing
  // object/array entry at a time until we either succeed or run out of body.
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    // Fall back: progressively strip trailing partial entries.
    let trial = body;
    for (let attempt = 0; attempt < 20; attempt++) {
      // Backtrack to the previous "}" or "]" or "," at top level of current
      // container so we drop an incomplete element.
      const lastBrace = Math.max(
        trial.lastIndexOf("}"),
        trial.lastIndexOf("]"),
      );
      if (lastBrace < 0) return null;
      trial = trial.slice(0, lastBrace + 1);
      // Recompute open containers for trial.
      const s: Array<"{" | "["> = [];
      let inS = false, esc = false;
      for (let i = 0; i < trial.length; i++) {
        const c = trial[i];
        if (inS) {
          if (esc) { esc = false; continue; }
          if (c === "\\") { esc = true; continue; }
          if (c === '"') inS = false;
          continue;
        }
        if (c === '"') { inS = true; continue; }
        if (c === "{" || c === "[") s.push(c);
        else if (c === "}" || c === "]") s.pop();
      }
      const c2: string[] = [];
      for (let i = s.length - 1; i >= 0; i--) c2.push(s[i] === "{" ? "}" : "]");
      const candidate = trial.replace(/[\s,:]+$/g, "") + c2.join("");
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        // keep trying
      }
    }
    return null;
  }
}
