import type { ScaffoldResult } from "./schema";

export type Violation = {
  /** Stable machine-friendly code so the repair prompt can reference rules. */
  code: string;
  /** Human-readable message shown to the model during repair. */
  message: string;
  /** Which page/flow the problem is in, if known. */
  location?: string;
};

/**
 * Catches the specific classes of broken scaffold output we've seen from the
 * cheaper model tier: dead links, unwired forms, `method="get"` mutations,
 * and Edit buttons pointing at nonexistent edit pages. Each violation carries
 * a stable code + a message sharp enough for the repair call to fix without
 * another round trip.
 *
 * This is deliberately conservative — only flags things that are almost
 * certainly bugs. Style/design opinions belong in the system prompt, not
 * here, so we don't accidentally reject good output.
 */
export function validateScaffold(scaffold: ScaffoldResult): Violation[] {
  const violations: Violation[] = [];
  const pageSlugs = new Set(scaffold.pages.map((p) => p.slug));
  // Auth module slugs that are pre-installed — always valid nav targets.
  const authSlugs = new Set([
    "login",
    "register",
    "profile",
    "forgot-password",
    "auth-login",
    "auth-register",
    "auth-profile",
    "auth-forgot-password",
  ]);
  const knownSlug = (slug: string) => pageSlugs.has(slug) || authSlugs.has(slug);

  const flowSlugs = new Set(scaffold.flows.map((f) => f.slug));

  for (const page of scaffold.pages) {
    const loc = `page "${page.slug}"`;
    const html = page.html;

    // 1. Dead anchors — href="#" or empty href.
    //    data-nk-logout-ref anchors are allowed to use href="#" because the
    //    runtime turns them into a logout + navigate action.
    const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = anchorRegex.exec(html)) !== null) {
      const attrs = m[1];
      const inner = m[2].replace(/<[^>]+>/g, " ").trim().slice(0, 60);
      const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i);
      const href = hrefMatch?.[1] ?? "";
      const isLogout = /data-nk-logout(-ref)?\s*=/i.test(attrs);
      const isAuthAware = /data-nk-auth\s*=/i.test(attrs);
      if ((href === "#" || href === "") && !isLogout && !isAuthAware) {
        violations.push({
          code: "dead-link",
          location: loc,
          message: `Anchor with text "${inner}" has href="${href}" — every link must point at a real page slug in this scaffold, an external URL, or use data-nk-logout-ref.`,
        });
      }
      // 2. Broken internal link — "/foo" that matches no page slug.
      if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api/") && !href.startsWith("/uploads/")) {
        const slug = href.slice(1).split(/[?#/]/)[0];
        if (slug && !knownSlug(slug)) {
          violations.push({
            code: "broken-link",
            location: loc,
            message: `Link "${inner}" points to "${href}" but there is no page with slug "${slug}" in this scaffold.`,
          });
        }
      }
    }

    // 3. Forms with a non-POST method (or explicit method="get").
    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let fm: RegExpExecArray | null;
    while ((fm = formRegex.exec(html)) !== null) {
      const attrs = fm[1];
      const inner = fm[2];
      const method = attrs.match(/\bmethod\s*=\s*["']([^"']+)["']/i)?.[1];
      if (method && method.toLowerCase() !== "post") {
        violations.push({
          code: "wrong-form-method",
          location: loc,
          message: `Form has method="${method}" — all flow-bound forms must be POST (just omit the method attribute).`,
        });
      }
      // 4. Forms that submit data but aren't wired to a flow.
      const hasInputs = /<(?:input|textarea|select|button)\b/i.test(inner);
      const hasFlowRef = /\bdata-nk-(?:flow|flow-ref)\s*=/i.test(attrs);
      const isFilterOnly = /\bdata-nk-filter\b/i.test(attrs);
      if (hasInputs && !hasFlowRef && !isFilterOnly) {
        const first = inner.slice(0, 120).replace(/\s+/g, " ").trim();
        violations.push({
          code: "unwired-form",
          location: loc,
          message: `Form containing "${first}..." has no data-nk-flow-ref — every form must bind to a flow slug (or be data-nk-filter only).`,
        });
      }
    }

    // 5. Edit buttons pointing at a missing edit page.
    //    Pattern the prompt mandates: href="/<thing>-edit?id={id}" inside a
    //    data-nk-item template. If the target page isn't in scaffold, flag it.
    const editLinkRegex = /href\s*=\s*["'](\/([a-z0-9-]+?-edit)(?:\?[^"']*)?)["']/gi;
    let em: RegExpExecArray | null;
    while ((em = editLinkRegex.exec(html)) !== null) {
      const targetSlug = em[2];
      if (!knownSlug(targetSlug)) {
        violations.push({
          code: "missing-edit-page",
          location: loc,
          message: `Edit link points to "${em[1]}" but there is no page with slug "${targetSlug}". You must create a <thing>-edit page (with <!--nk:require-auth-->, a data-nk-bind-flow-ref="load-<thing>" container, and a form bound to edit-<thing>) OR remove the Edit button.`,
        });
      }
    }
  }

  // 6. Flow slugs referenced from pages that don't exist.
  //    We look for data-nk-flow-ref, data-nk-bind-flow-ref, data-nk-logout-ref.
  for (const page of scaffold.pages) {
    const refRegex = /\bdata-nk-(?:flow|bind-flow|logout|update-flow|reorder-flow)-ref\s*=\s*["']([a-z0-9-]+)["']/gi;
    let rm: RegExpExecArray | null;
    while ((rm = refRegex.exec(page.html)) !== null) {
      const slug = rm[1];
      if (!flowSlugs.has(slug)) {
        violations.push({
          code: "missing-flow",
          location: `page "${page.slug}"`,
          message: `References flow slug "${slug}" but no such flow exists in the scaffold. Add the flow or remove the reference.`,
        });
      }
    }
  }

  // 7. Deduplicate identical messages so the repair prompt isn't spammy.
  const seen = new Set<string>();
  return violations.filter((v) => {
    const key = `${v.code}|${v.location ?? ""}|${v.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Renders the violation list as a block the repair prompt can paste in.
 * Kept terse — the model already has the full system prompt & the original
 * scaffold, so we just list what's broken.
 */
export function formatViolationsForRepair(violations: Violation[]): string {
  if (violations.length === 0) return "";
  return violations
    .map((v, i) => `${i + 1}. [${v.code}]${v.location ? " in " + v.location : ""}: ${v.message}`)
    .join("\n");
}
