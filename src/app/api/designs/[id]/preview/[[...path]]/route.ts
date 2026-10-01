import { getCurrentUser } from "@/lib/auth";
import { cleanPath, NotFound, readFile, versionFiles } from "@/lib/design-studio/store";

export const dynamic = "force-dynamic";

/**
 * One page of a design, for the workspace preview. The page is the user's
 * own AI-made code, so it's served sandboxed (no access to this site, its
 * cookies or other windows) even if opened on its own. Links between pages
 * are made relative so they work inside the preview, and ?version= shows an
 * earlier version. ?pick=1 adds the click-to-comment helper.
 */
const PICKER = `<script>(function(){
var last=null;function mark(el){if(last)last.style.outline=last.__o||"";if(el){el.__o=el.style.outline;el.style.outline="2px solid #8b5cf6";el.style.outlineOffset="2px";}last=el;}
document.addEventListener("mouseover",function(e){mark(e.target);},true);
document.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();var el=e.target;var clone=el.cloneNode(true);clone.style&&(clone.style.outline="");
parent.postMessage({type:"nk-pick",html:clone.outerHTML.slice(0,1500),text:(el.innerText||"").trim().slice(0,200),tag:el.tagName.toLowerCase()},"*");},true);
})();</script>`;

// The sandbox has no storage of its own, so a design that saves anything in the
// browser (a game's high scores, a theme choice) would throw on its first
// localStorage call. It gets an in-memory stand-in for the preview instead;
// the published app, on its own address, uses the real one.
const STORAGE = `<script>(function(){function mem(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}["localStorage","sessionStorage"].forEach(function(n){try{void window[n].length}catch(e){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}}})})();</script>`;

const PAGE_REPORT = `<script>parent.postMessage({type:"nk-page",path:location.pathname.split("/preview/")[1]||"index.html"},"*");</script>`;

export async function GET(req: Request, ctx: { params: Promise<{ id: string; path?: string[] }> }) {
  const { id, path } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  const url = new URL(req.url);
  const version = url.searchParams.get("version");
  const pick = url.searchParams.get("pick") === "1";
  const file = cleanPath((path ?? []).join("/") || "index.html");
  if (!file || !/\.html?$/i.test(file)) return new Response("Not found", { status: 404 });

  let html: string | null;
  try {
    html = version ? (await versionFiles(user.id, id, version))[file] ?? null : await readFile(user.id, id, file);
  } catch (err) {
    if (err instanceof NotFound) return new Response("Not found", { status: 404 });
    throw err;
  }
  if (html === null) {
    html = `<!doctype html><html><body style="font-family:system-ui;display:grid;place-items:center;min-height:90vh;color:#6b7280;background:#0f1017"><p>${file === "index.html" ? "Nothing here yet. Describe your app to build it." : "This page doesn't exist in this version."}</p></body></html>`;
  }

  // "/about.html" and "/" point at the site root; inside the preview they
  // must stay inside this design (and this version).
  const keep = new URLSearchParams();
  if (version) keep.set("version", version);
  if (pick) keep.set("pick", "1");
  const q = keep.toString() ? `?${keep}` : "";
  html = html
    .replace(/\bhref=(["'])\/(?:index\.html)?(?:#[^"']*)?\1/gi, `href=$1index.html${q}$1`)
    .replace(/\bhref=(["'])\/([a-zA-Z0-9_-]+\.html)(\?[^"'#]*)?(#[^"']*)?\1/g, (_m, qt: string, page: string, _qs: string | undefined, hash: string | undefined) => `href=${qt}${page}${q}${hash ?? ""}${qt}`);
  // Before the design's own scripts, so they find storage in place.
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + STORAGE) : STORAGE + html;
  const inject = PAGE_REPORT + (pick ? PICKER : "");
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${inject}</body>`) : html + inject;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "sandbox allow-scripts allow-forms allow-popups allow-modals; frame-ancestors 'self'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}
