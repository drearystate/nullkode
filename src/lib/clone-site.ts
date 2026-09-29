import { assertPublicUrl, publicFetch } from "./public-url";
import { load } from "cheerio";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { chromium, type Browser, type Page } from "playwright";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

type ClonedPage = {
  url: string;
  slug: string;
  title: string;
  html: string;
  css: string;
  isHome: boolean;
};

type CloneResult = {
  pages: ClonedPage[];
  title: string;
};

/**
 * Clone an entire website — crawls all internal links, downloads HTML for
 * each page, shares assets across pages, rewrites all paths to local copies.
 * Returns an array of pages ready to be saved as a multi-page project.
 */
export async function cloneSite(
  targetUrl: string,
  projectSlug: string,
  maxPages = 30,
  onProgress?: (message: string, pageCount?: number) => void
): Promise<CloneResult> {
  const progress = onProgress ?? (() => {});
  const baseUrl = await assertPublicUrl(targetUrl);

  // Per-clone asset folder
  const folderName = projectSlug;
  const assetsDir = join(process.cwd(), "public", "assets", "cloned", folderName);
  if (!existsSync(assetsDir)) {
    await mkdir(assetsDir, { recursive: true });
  }
  const publicPrefix = `/assets/cloned/${folderName}`;

  // Track downloaded assets so we don't re-download
  const downloaded = new Map<string, string>();

  async function downloadAsset(assetUrl: string, fallbackExt: string): Promise<string | null> {
    try {
      const absolute = new URL(assetUrl, baseUrl).href;
      if (downloaded.has(absolute)) return downloaded.get(absolute)!;

      const res = await publicFetch(absolute, {
        headers: { "User-Agent": USER_AGENT, Referer: baseUrl.origin },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;

      const contentType = res.headers.get("content-type") || "";
      // Derive filename — use URL path + hash to avoid collisions
      const urlObj = new URL(absolute);
      const origPath = urlObj.pathname.split("/").pop() || "";
      const extMatch = origPath.match(/\.([a-z0-9]+)$/i);
      let ext = extMatch ? extMatch[1].toLowerCase() : fallbackExt;
      if (!ext || ext.length > 5) ext = fallbackExt;
      // Content-type fallbacks
      if (!extMatch) {
        if (contentType.includes("jpeg")) ext = "jpg";
        else if (contentType.includes("png")) ext = "png";
        else if (contentType.includes("svg")) ext = "svg";
        else if (contentType.includes("webp")) ext = "webp";
        else if (contentType.includes("gif")) ext = "gif";
        else if (contentType.includes("css")) ext = "css";
        else if (contentType.includes("woff2")) ext = "woff2";
        else if (contentType.includes("woff")) ext = "woff";
      }
      const hash = createHash("md5").update(absolute).digest("hex").slice(0, 8);
      const cleanName = origPath.replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "asset";
      const filename = `${cleanName}-${hash}.${ext}`;
      const filepath = join(assetsDir, filename);

      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(filepath, buffer);

      const localUrl = `${publicPrefix}/${filename}`;
      downloaded.set(absolute, localUrl);
      return localUrl;
    } catch {
      return null;
    }
  }

  // Rewrite url() references inside CSS text
  async function rewriteCssUrls(cssText: string, cssBaseUrl: URL): Promise<string> {
    const urls: string[] = [];
    const regex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
    let match;
    while ((match = regex.exec(cssText)) !== null) {
      if (!match[1].startsWith("data:")) urls.push(match[1]);
    }
    const unique = [...new Set(urls)];
    const map = new Map<string, string>();
    await Promise.all(
      unique.map(async (u) => {
        try {
          const abs = new URL(u, cssBaseUrl).href;
          const local = await downloadAsset(abs, "png");
          if (local) map.set(u, local);
        } catch {}
      })
    );
    return cssText.replace(regex, (full, u) => {
      if (u.startsWith("data:")) return full;
      const local = map.get(u);
      return local ? `url("${local}")` : full;
    });
  }

  // Track CSS files we've already downloaded — they're shared across pages
  const cssCache = new Map<string, string>();

  async function fetchAndProcessStylesheet(href: string): Promise<string> {
    const absolute = new URL(href, baseUrl).href;
    if (cssCache.has(absolute)) return cssCache.get(absolute)!;
    try {
      const cssRes = await publicFetch(absolute, {
        headers: { "User-Agent": USER_AGENT, Referer: baseUrl.origin },
        signal: AbortSignal.timeout(15000),
      });
      if (!cssRes.ok) return "";
      const cssText = await cssRes.text();
      const cssBase = new URL(absolute);
      const rewritten = await rewriteCssUrls(cssText, cssBase);
      cssCache.set(absolute, rewritten);
      return rewritten;
    } catch {
      return "";
    }
  }

  /** Process a single page — uses a real browser to render JS, then captures fully-painted HTML */
  async function processPage(pageUrl: string, browser: Browser): Promise<{
    html: string;
    css: string;
    title: string;
    links: string[];
  } | null> {
    let page: Page | null = null;
    let html = "";
    try {
      page = await browser.newPage({ userAgent: USER_AGENT });
      await page.setViewportSize({ width: 1440, height: 900 });
      // Block heavy trackers/ads — they slow clones to a crawl
      await page.route("**/*", async (route) => {
        try { await assertPublicUrl(route.request().url()); } catch { await route.abort(); return; }
        const url = route.request().url();
        const blockList = [
          "googletagmanager.com", "google-analytics.com", "facebook.com/tr",
          "hotjar.com", "doubleclick.net", "googlesyndication.com",
          "clarity.ms", "zdassets.com", "optimizely.com", "mouseflow.com",
          "crazyegg.com", "fullstory.com", "segment.com", "mixpanel.com",
          "amplitude.com", "heap.io", "intercomcdn.com", "taboola.com",
          "outbrain.com", "adroll.com", "bing.com/bat", "linkedin.com/px",
          "twitter.com/i/adsct", "bat.bing.com", "cvent.com",
        ];
        if (blockList.some((b) => url.includes(b))) return route.abort();
        return route.continue();
      });

      // Use 'domcontentloaded' instead of 'networkidle' — far more reliable
      const response = await page.goto(pageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      if (!response || !response.ok()) {
        await page.close();
        return null;
      }
      // Wait briefly for JS to render content (not forever)
      await page.waitForTimeout(3000);
      // Auto-scroll to trigger lazy-loaded content (capped at 4s)
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let total = 0;
          const distance = 400;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            total += distance;
            if (total >= document.body.scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 80);
          setTimeout(() => { clearInterval(timer); resolve(); }, 4000);
        });
      });
      await page.waitForTimeout(500);
      html = await page.content();
      await page.close();
    } catch (err) {
      console.error(`[clone] page ${pageUrl} failed:`, err instanceof Error ? err.message : err);
      if (page) try { await page.close(); } catch {}
      return null;
    }
    const $ = load(html);

    // Stylesheets
    const cssChunks: string[] = [];
    const linkPromises: Promise<void>[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      linkPromises.push(
        fetchAndProcessStylesheet(href).then((css) => {
          if (css) cssChunks.push(css);
        })
      );
    });
    await Promise.all(linkPromises);

    // Inline <style>
    const inlineStyles: string[] = [];
    $("style").each((_, el) => {
      inlineStyles.push($(el).html() || "");
    });
    for (let i = 0; i < inlineStyles.length; i++) {
      inlineStyles[i] = await rewriteCssUrls(inlineStyles[i], new URL(pageUrl));
    }

    // Images
    const imgPromises: Promise<void>[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.startsWith("data:")) {
        imgPromises.push(
          (async () => {
            const local = await downloadAsset(src, "jpg");
            if (local) $(el).attr("src", local);
          })()
        );
      }
      const srcset = $(el).attr("srcset");
      if (srcset) {
        imgPromises.push(
          (async () => {
            const parts = srcset.split(",").map((p) => p.trim());
            const newParts: string[] = [];
            for (const part of parts) {
              const [url, desc] = part.split(/\s+/);
              if (!url || url.startsWith("data:")) {
                newParts.push(part);
                continue;
              }
              const localUrl = await downloadAsset(url, "jpg");
              newParts.push(localUrl ? `${localUrl}${desc ? " " + desc : ""}` : part);
            }
            $(el).attr("srcset", newParts.join(", "));
          })()
        );
      }
    });
    await Promise.all(imgPromises);

    // Background images in inline styles
    const bgPromises: Promise<void>[] = [];
    $("[style*='background'], [style*='url(']").each((_, el) => {
      const style = $(el).attr("style") || "";
      bgPromises.push(
        (async () => {
          const rewritten = await rewriteCssUrls(style, new URL(pageUrl));
          $(el).attr("style", rewritten);
        })()
      );
    });
    await Promise.all(bgPromises);

    // Collect internal links BEFORE we strip anything
    const internalLinks: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
      try {
        const absolute = new URL(href, pageUrl).href;
        const linkUrl = new URL(absolute);
        // Only same-host links, no fragments, no file extensions (skip PDFs etc)
        if (linkUrl.host !== baseUrl.host) return;
        if (/\.(pdf|zip|jpg|png|gif|mp4|mp3|webp|svg|ico|xml|json|css|js)$/i.test(linkUrl.pathname)) return;
        // Skip pagination — /page/2, /page/5, ?page=3, /p/3, /listings/3
        if (/\/page\/\d+|\/p\/\d+|[?&]page=\d+/i.test(linkUrl.pathname + linkUrl.search)) return;
        // Skip URL params that imply filtering/sorting (dealership filter pages)
        if (linkUrl.search && /[?&](sort|filter|year|make|model|price|mileage|bodystyle|trim|color|transmission)=/i.test(linkUrl.search)) return;
        // Strip hash and trailing slash for dedup
        linkUrl.hash = "";
        linkUrl.search = ""; // drop query params entirely — they fragment identical pages
        const normalized = linkUrl.href.replace(/\/$/, "");
        internalLinks.push(normalized);
      } catch {}
    });

    // Strip scripts, preloads
    $("script, noscript").remove();
    $("link[rel='preload'], link[rel='modulepreload'], link[rel='dns-prefetch'], link[rel='preconnect']").remove();

    const bodyHtml = $("body").html() || $.html();
    const title = $("title").text().trim() || "Untitled";
    const combinedCss = [...cssChunks, ...inlineStyles].join("\n\n");

    return { html: bodyHtml, css: combinedCss, title, links: [...new Set(internalLinks)] };
  }

  // Launch a single browser instance for the whole crawl
  progress(" Launching headless browser...");
  const browser = await chromium.launch({ headless: true });

  // Crawl: BFS from the start URL, max maxPages
  const visited = new Set<string>();
  const queue: string[] = [targetUrl.replace(/\/$/, "")];
  const pages: ClonedPage[] = [];
  let siteTitle = "Cloned site";

  // Smart pattern limits: we want to sample, not exhaustively copy.
  // Derive the "section" from the URL path's first meaningful segment
  // (e.g. /inventory/new-2026-chevy → section "inventory",
  //       /blog/post-slug → section "blog",
  //       /new-inventory/page/5 → section "new-inventory").
  const SECTION_SAMPLE_LIMIT = 6; // max detail pages per section
  const sectionCounts = new Map<string, number>();
  function getSection(url: string): string {
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/").filter(Boolean);
      // No path → "home", single segment → that segment
      if (parts.length === 0) return "home";
      return parts[0].toLowerCase();
    } catch {
      return "other";
    }
  }
  function isLikelyDetailPage(url: string): boolean {
    // Heuristic: URL has 2+ path segments AND last segment looks like a slug/id
    // (contains hyphens, digits, or is longer than a typical nav link).
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return false;
      const last = parts[parts.length - 1];
      // Obvious list/category pages
      if (/^(page|p)-?\d+$/i.test(last)) return false;
      if (["about", "contact", "home", "services", "pricing", "faq", "login", "register"].includes(last)) return false;
      // Detail-like: long slug, hyphenated, or contains digits
      return last.length > 15 || /-/.test(last) || /\d{2,}/.test(last);
    } catch {
      return false;
    }
  }

  try {

  while (queue.length > 0 && pages.length < maxPages) {
    const pageUrl = queue.shift()!;
    const normalized = pageUrl.replace(/\/$/, "");
    if (visited.has(normalized)) continue;

    // Enforce section sample limit for detail pages
    if (isLikelyDetailPage(pageUrl)) {
      const section = getSection(pageUrl);
      const count = sectionCounts.get(section) ?? 0;
      if (count >= SECTION_SAMPLE_LIMIT) {
        visited.add(normalized);
        continue;
      }
      sectionCounts.set(section, count + 1);
    }

    visited.add(normalized);

    progress(`⏳ Loading: ${new URL(pageUrl).pathname || "/"}`, pages.length);

    // Hard timeout per page so the whole crawl can't hang
    const result = await Promise.race([
      processPage(pageUrl, browser),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 45000)),
    ]);
    if (!result) {
      progress(` Skipped (timeout or error): ${new URL(pageUrl).pathname}`, pages.length);
      continue;
    }

    // Derive a slug from the URL path
    const urlObj = new URL(pageUrl);
    const isHome = pages.length === 0;
    let slug = urlObj.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-").replace(/\.html?$/i, "") || "home";
    slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 60);
    if (isHome) slug = "home";
    // Dedup slugs
    let unique = slug;
    let n = 2;
    while (pages.some((p) => p.slug === unique)) unique = `${slug}-${n++}`;

    if (isHome) siteTitle = result.title;

    pages.push({
      url: pageUrl,
      slug: unique,
      title: result.title,
      html: result.html,
      css: result.css,
      isHome,
    });

    progress(` Cloned: ${result.title}`, pages.length);

    // Enqueue new internal links
    for (const link of result.links) {
      if (!visited.has(link.replace(/\/$/, "")) && !queue.includes(link)) {
        queue.push(link);
      }
    }
  }

  progress(` Rewriting internal links across ${pages.length} pages...`, pages.length);

  // Build a map from original URLs → local slugs so we can rewrite all <a href> tags
  const urlToSlug = new Map<string, string>();
  for (const p of pages) {
    urlToSlug.set(p.url.replace(/\/$/, ""), p.slug);
  }

  // Second pass: rewrite all <a href> in page HTML to point to local slugs
  for (const p of pages) {
    const $ = load(p.html);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      try {
        const absolute = new URL(href, p.url).href.replace(/\/$/, "");
        const localSlug = urlToSlug.get(absolute);
        if (localSlug) {
          $(el).attr("href", localSlug === "home" ? "/" : `/${localSlug}`);
        }
      } catch {}
    });
    p.html = $("body").html() || $.html();
  }

    return {
      pages,
      title: siteTitle,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
