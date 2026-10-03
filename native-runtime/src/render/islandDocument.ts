import type { NativeApp, NativePage, NativeWebNode } from "../spec";
import { resolveUrl } from "../api";

/**
 * The HTML document of a web island: the subtree plus the page's styles and
 * scripts (the NullKode runtime and the page's own), with the page's address
 * as its base so links, images and /api calls resolve. It reports its height
 * (`{ nkIsland: id, height }`) to the native view or the parent frame.
 */
export function islandDocument(node: NativeWebNode, page: NativePage, app: NativeApp, id: string): string {
  const pageUrl = resolveUrl(page.web?.url ?? "", app);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const height = `<script>(function(){var id=${JSON.stringify(id)};function send(){var h=Math.ceil(Math.max(document.body.scrollHeight,document.documentElement.scrollHeight));var m=JSON.stringify({nkIsland:id,height:h});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);else if(window.parent!==window)window.parent.postMessage(m,"*");}window.addEventListener("load",send);if(window.ResizeObserver)new ResizeObserver(send).observe(document.body);setTimeout(send,250);setTimeout(send,1500);})();</script>`;
  return (
    `<!doctype html><html lang="${esc(page.lang)}" dir="${page.dir}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><base href="${esc(pageUrl)}">` +
    (page.web?.head ?? "") +
    `<style>html,body{margin:0!important;padding:0!important;background:transparent!important;min-height:0!important;overflow:hidden!important}</style>` +
    `</head><body>${node.html}${height}${page.web?.scripts ?? ""}</body></html>`
  );
}
