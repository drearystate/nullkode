/**
 * Styles and browser scripts of the Places feature's pages.
 *
 * Safety: every value that comes from a place (names, addresses, photo
 * links) is put on the page with textContent, a DOM property or an
 * attribute, never as HTML. innerHTML is only ever given the fixed icon
 * pictures below. Links from data go through safeUrl()/webUrl(), which only
 * allow http(s) and site-relative addresses (scripts/check-module-scripts.ts
 * checks the HTML sinks).
 */
import { PLACE_I18N, PLACE_PRESET_TEXT } from "./places-i18n";

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">${body}</svg>`;

/** Line icons, drawn for this feature (24px grid, stroke = currentColor). */
export const PLACE_ICONS: Record<string, string> = {
  globe: svg('<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-6-4-9.5s1.4-6.9 4-9.5z"/>'),
  refresh: svg('<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><path d="M20.5 3.5V9H15"/>'),
  login: svg('<path d="M14 3.5h4.5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H14"/><path d="M9.5 16.5 14 12 9.5 7.5"/><path d="M14 12H3.5"/>'),
  logout: svg('<path d="M10 3.5H5.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2H10"/><path d="M15.5 16.5 20 12l-4.5-4.5"/><path d="M20 12H9"/>'),
  edit: svg('<path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L12 14.8 8 16l1.2-4z"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.3-4.3"/>'),
  nav: svg('<path d="M3 11 21 3l-8 18-2-8z"/>'),
  locate: svg('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 1.5V5M12 19v3.5M1.5 12H5M19 12h3.5"/>'),
  fit: svg('<path d="M8 3.5H5.5a2 2 0 0 0-2 2V8M20.5 8V5.5a2 2 0 0 0-2-2H16M3.5 16v2.5a2 2 0 0 0 2 2H8M16 20.5h2.5a2 2 0 0 0 2-2V16"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  chev: svg('<path d="m9 18 6-6-6-6"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  pin: svg('<path d="M20 10c0 6.5-8 12.5-8 12.5S4 16.5 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  phone: svg('<path d="M21.5 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.6 4.2 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L7.5 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.9 2.1z"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7L11.8 5.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  clock: svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>'),
  star: svg('<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>'),
  grid: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-5-5L5 21"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
};

/** Leaflet, loaded the same way as the platform's Map feature. */
export const LEAFLET_TAGS = `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>`;

export const PLACES_CSS = String.raw`
.pl{--pl-accent:var(--nk-primary,#1668b8);--pl-on:var(--nk-on-primary,#fff);--pl-bg:var(--nk-bg,#fff);--pl-surface:var(--nk-surface,#fff);--pl-surface-2:var(--nk-surface-2,#f1f5f9);--pl-text:var(--nk-text,#0f172a);--pl-muted:var(--nk-text-muted,#5b6577);--pl-border:var(--nk-border,#e2e8f0);--pl-shadow:0 1px 2px rgba(15,23,42,.05),0 8px 24px rgba(15,23,42,.08);
  color:var(--pl-text);font-family:var(--nk-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);max-width:1120px;margin:0 auto;-webkit-tap-highlight-color:transparent;line-height:1.45;overflow-x:clip}
.pl[data-accent="blue"]{--pl-accent:#1668b8;--pl-on:#fff}
.pl *,.pl *::before,.pl *::after{box-sizing:border-box}
.pl [hidden]{display:none!important}
.pl-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.pl-ic{display:inline-flex;width:20px;height:20px;flex:none}
.pl-ic svg{width:100%;height:100%;display:block}
.pl section{padding-block:0}
.pl a{text-underline-offset:2px}
.pl a:hover{text-decoration:none}
.pl .pl-d-val a:hover,.pl .pl-admin-link:hover{text-decoration:underline}
.pl button{font:inherit}
.pl-top{display:flex;align-items:center;gap:4px;background:var(--pl-accent);color:var(--pl-on);padding:14px 8px 34px 18px;position:relative}
.pl-title{flex:1;min-width:0;margin:0;font-size:1.5rem;font-weight:700;line-height:1.2;color:inherit;font-family:var(--nk-font-display,inherit);letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-top .pl-icbtn:first-child{margin-left:-10px}
.pl-actions{display:flex;align-items:center;gap:0}
.pl-icbtn{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:999px;border:0;background:transparent;color:inherit;cursor:pointer;text-decoration:none;padding:0;flex:none}
.pl-icbtn:hover{background:rgba(255,255,255,.16);color:inherit}
.pl-icbtn:focus-visible{outline:2px solid currentColor;outline-offset:1px}
.pl-icbtn .pl-ic{width:24px;height:24px}
.pl-icbtn.is-spin .pl-ic{animation:pl-spin .6s linear}
@keyframes pl-spin{to{transform:rotate(360deg)}}
.pl-langwrap{position:relative}
.pl-langmenu{position:absolute;right:0;top:calc(100% + 6px);z-index:1200;min-width:180px;background:var(--pl-surface);color:var(--pl-text);border:1px solid var(--pl-border);border-radius:14px;box-shadow:0 14px 36px rgba(15,23,42,.22);padding:6px;display:grid;gap:2px}
.pl-lang-item{border:0;background:transparent;color:inherit;text-align:left;padding:10px 12px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px}
.pl-lang-item:hover,.pl-lang-item:focus-visible{background:var(--pl-surface-2);outline:none}
.pl-lang-item .pl-ic{width:18px;height:18px;color:var(--pl-accent);visibility:hidden}
.pl-lang-item[aria-checked="true"]{font-weight:700;color:var(--pl-accent)}
.pl-lang-item[aria-checked="true"] .pl-ic{visibility:visible}
.pl-sheet{position:relative;background:var(--pl-bg);border-radius:22px 22px 0 0;margin-top:-20px;padding:16px 16px 28px;min-height:60vh}
.pl-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.pl-tabs{display:flex;flex:1 0 auto;background:var(--pl-surface-2);border-radius:14px;padding:4px;gap:2px}
.pl-tab{flex:1 1 auto;border:0;background:transparent;color:var(--pl-muted);font-weight:600;font-size:.93rem;padding:8px 9px;border-radius:11px;cursor:pointer;white-space:nowrap;min-height:40px;transition:background .15s,color .15s}
.pl-tab:hover{color:var(--pl-text)}
.pl-tab[aria-selected="true"]{background:var(--pl-accent);color:var(--pl-on);box-shadow:0 4px 12px color-mix(in srgb,var(--pl-accent) 35%,transparent)}
.pl-tab:focus-visible{outline:2px solid var(--pl-accent);outline-offset:2px}
.pl-tab .pl-badge-n{display:inline-block;min-width:20px;padding:0 6px;margin-left:6px;border-radius:999px;background:#dc2626;color:#fff;font-size:.75rem;line-height:20px}
.pl-mine{display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--pl-accent);color:var(--pl-accent);background:var(--pl-surface);border-radius:12px;padding:0 13px;font-weight:600;font-size:.93rem;text-decoration:none;min-height:44px;white-space:nowrap;flex:none}
.pl-mine:hover{background:var(--pl-accent);color:var(--pl-on)}
.pl-mine:focus-visible{outline:2px solid var(--pl-accent);outline-offset:2px}
.pl-chiprow{display:flex;align-items:center;gap:8px;margin:-2px 0 12px;flex-wrap:wrap}
.pl-chip{display:inline-flex;align-items:center;gap:2px;background:color-mix(in srgb,var(--pl-accent) 12%,var(--pl-surface));color:var(--pl-accent);font-weight:600;font-size:.9rem;border-radius:999px;padding:2px 2px 2px 14px;max-width:100%}
.pl-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-chip button{border:0;background:transparent;color:inherit;width:36px;height:36px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.pl-chip button:hover{background:color-mix(in srgb,var(--pl-accent) 16%,transparent)}
.pl-chip .pl-ic{width:18px;height:18px}
.pl-tools{display:flex;gap:8px;margin-bottom:10px}
.pl-search{flex:1;min-width:0;display:flex;align-items:center;gap:8px;background:var(--pl-surface-2);border:1.5px solid transparent;border-radius:12px;padding:0 12px;min-height:48px;color:var(--pl-muted);cursor:text}
.pl-search:focus-within{border-color:var(--pl-accent);background:var(--pl-surface)}
.pl-search input{flex:1;min-width:0;border:0;background:transparent;outline:none;font:inherit;color:var(--pl-text);font-size:16px;padding:10px 0;-webkit-appearance:none;appearance:none}
.pl-search input::placeholder{color:var(--pl-muted);opacity:1}
.pl-near{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--pl-border);background:var(--pl-surface);color:var(--pl-text);border-radius:12px;padding:0 12px;min-height:48px;font-weight:600;font-size:.9rem;cursor:pointer;white-space:nowrap;flex:none}
.pl-near .pl-ic{width:18px;height:18px;color:var(--pl-accent)}
.pl-near[aria-pressed="true"]{background:var(--pl-accent);border-color:var(--pl-accent);color:var(--pl-on)}
.pl-near[aria-pressed="true"] .pl-ic{color:inherit}
.pl-near:focus-visible,.pl-small-btn:focus-visible,.pl-btn:focus-visible,.pl-btn2:focus-visible,.pl-btn-outline:focus-visible{outline:3px solid var(--pl-accent);outline-offset:2px}
.is-busy .pl-ic{animation:pl-pulse 1s ease-in-out infinite}
@keyframes pl-pulse{50%{opacity:.35}}
.pl-meta{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:2px 12px;margin:4px 2px 10px;font-size:.86rem;color:var(--pl-muted)}
.pl-meta p{margin:0}
#pl-count{white-space:nowrap;font-weight:600}
.pl-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
@media(min-width:720px){.pl-list{grid-template-columns:1fr 1fr}}
@media(min-width:1040px){.pl-list{grid-template-columns:1fr 1fr 1fr}}
.pl-card{display:flex;align-items:center;gap:14px;padding:10px 8px 10px 10px;background:var(--pl-surface);border:1px solid var(--pl-border);border-radius:18px;color:var(--pl-text);text-decoration:none;box-shadow:var(--pl-shadow);transition:transform .15s,box-shadow .15s;min-height:106px;height:100%}
.pl-card:hover{transform:translateY(-1px);box-shadow:0 2px 4px rgba(15,23,42,.06),0 14px 30px rgba(15,23,42,.12);color:var(--pl-text)}
.pl-card:focus-visible{outline:3px solid var(--pl-accent);outline-offset:2px}
.pl-card-media{position:relative;flex:none;width:86px;height:86px;border-radius:14px;overflow:hidden;background:var(--pl-surface-2);display:flex;align-items:center;justify-content:center;color:var(--pl-muted)}
.pl-card-media img{width:100%;height:100%;object-fit:cover;display:block}
.pl-badge{position:absolute;left:5px;top:5px;display:inline-flex;align-items:center;gap:3px;background:rgba(255,255,255,.95);color:#7c4a03;font-size:.66rem;font-weight:700;padding:2px 6px 2px 4px;border-radius:999px;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.pl-badge .pl-ic{width:11px;height:11px;color:#d97706}
.pl-badge svg,.pl-pill.is-gold svg{fill:#f59e0b}
.pl-card-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.pl-card-cat{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pl-accent)}
.pl-card-name{margin:0;font-size:1.05rem;font-weight:700;line-height:1.25;color:var(--pl-text);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-family:inherit}
.pl-card-addr{margin:0;font-size:.86rem;color:var(--pl-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-dist{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;font-size:.8rem;font-weight:700;color:var(--pl-accent);background:color-mix(in srgb,var(--pl-accent) 10%,transparent);padding:2px 9px 2px 7px;border-radius:999px;margin-top:3px}
.pl-dist .pl-ic{width:12px;height:12px}
.pl-card>.pl-ic{color:var(--pl-muted);width:18px;height:18px}
.pl-empty{list-style:none;text-align:center;color:var(--pl-muted);padding:36px 12px;margin:0}
.pl-empty-sm{padding:16px 12px;text-align:left;background:var(--pl-surface-2);border-radius:14px}
.pl-cats{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(min-width:720px){.pl-cats{grid-template-columns:repeat(3,1fr)}}
@media(min-width:1040px){.pl-cats{grid-template-columns:repeat(4,1fr)}}
.pl-cat{position:relative;display:block;width:100%;aspect-ratio:4/3;border:0;padding:0;border-radius:18px;overflow:hidden;cursor:pointer;background:var(--pl-surface-2);color:#fff;text-align:left;box-shadow:var(--pl-shadow)}
.pl-cat img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .3s}
.pl-cat:hover img{transform:scale(1.04)}
.pl-cat-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.75))}
.pl-cat-text{position:absolute;left:12px;right:12px;bottom:10px;display:flex;flex-direction:column;gap:1px}
.pl-cat-name{font-weight:700;font-size:1.02rem;line-height:1.2;text-shadow:0 1px 3px rgba(0,0,0,.45)}
.pl-cat-count{font-size:.8rem;opacity:.95;text-shadow:0 1px 3px rgba(0,0,0,.45)}
.pl-cat[aria-pressed="true"]{box-shadow:0 0 0 3px var(--pl-bg),0 0 0 6px var(--pl-accent)}
.pl-cat:focus-visible{outline:3px solid var(--pl-accent);outline-offset:3px}
.pl-cat.is-all{background:linear-gradient(140deg,var(--pl-accent),color-mix(in srgb,var(--pl-accent) 55%,#000))}
.pl-cat.is-all .pl-cat-shade{background:none}
.pl-cat.is-all>.pl-ic{position:absolute;right:14px;top:14px;width:30px;height:30px;opacity:.85;color:#fff}
.pl-mapwrap{position:relative;height:560px;border-radius:20px;overflow:hidden;background:#e7ecef}
@media(max-width:719px){.pl-mapwrap{margin:0 -16px -28px;border-radius:0}}
.pl-map{position:absolute;inset:0;z-index:0;font:inherit}
.pl-map.is-error{display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:var(--pl-muted)}
.pl-map .leaflet-tile-pane{filter:saturate(.72) brightness(1.03)}
.pl .leaflet-control-zoom{border:0!important;box-shadow:0 4px 16px rgba(15,23,42,.2);border-radius:12px;overflow:hidden;margin:14px 0 0 14px}
.pl .leaflet-control-zoom a{width:42px;height:42px;line-height:42px;font-size:22px;color:#1f2937;background:#fff}
.pl .leaflet-control-zoom a:focus-visible{outline:3px solid var(--pl-accent);outline-offset:-3px}
.pl .leaflet-control-attribution{font-size:10.5px;background:rgba(255,255,255,.88);border-radius:0 0 0 8px;color:#333}
.pl .leaflet-control-attribution a{color:#0b57a4}
.pl-fabs{position:absolute;right:14px;bottom:18px;z-index:500;display:flex;flex-direction:column;gap:12px;align-items:center;transition:bottom .2s}
.pl-mapwrap.has-card .pl-fabs{bottom:calc(var(--pl-card-h,140px) + 26px)}
.pl-fab{width:58px;height:58px;border-radius:999px;border:0;background:var(--pl-accent);color:var(--pl-on);box-shadow:0 8px 22px rgba(15,23,42,.3);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.pl-fab .pl-ic{width:28px;height:28px}
.pl-fab-sm{width:46px;height:46px;background:#fff;color:#1f2937;box-shadow:0 4px 16px rgba(15,23,42,.22)}
.pl-fab-sm .pl-ic{width:22px;height:22px}
.pl-fab:focus-visible{outline:3px solid #fff;box-shadow:0 0 0 6px var(--pl-accent)}
.pl-sheetcard{position:absolute;left:12px;right:12px;bottom:12px;z-index:600;display:flex;gap:14px;align-items:stretch;background:var(--pl-surface);color:var(--pl-text);border-radius:22px;padding:12px;box-shadow:0 16px 44px rgba(15,23,42,.3);animation:pl-up .22s ease-out;max-width:560px}
@media(min-width:720px){.pl-sheetcard{left:16px;right:auto;width:440px;bottom:16px}}
@keyframes pl-up{from{transform:translateY(18px);opacity:0}}
.pl-sheetcard-img{flex:none;width:120px;height:120px;border-radius:16px;object-fit:cover;background:var(--pl-surface-2)}
.pl-sheetcard-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding:2px 34px 0 0}
.pl-sheetcard-cat{margin:0;font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pl-accent)}
.pl-sheetcard-name{margin:0;font-size:1.15rem;font-weight:700;line-height:1.25;color:var(--pl-text);font-family:inherit}
.pl-sheetcard-name:focus{outline:none}
.pl-sheetcard-addr{margin:0;font-size:.88rem;color:var(--pl-muted);line-height:1.35}
.pl-sheetcard-dist{margin:0;font-size:.82rem;font-weight:700;color:var(--pl-accent)}
.pl-btn-outline{align-self:flex-start;margin-top:auto;display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 20px;border:1.5px solid var(--pl-accent);color:var(--pl-accent);background:transparent;border-radius:12px;font-weight:600;text-decoration:none;cursor:pointer}
.pl-btn-outline:hover{background:var(--pl-accent);color:var(--pl-on)}
.pl-x{position:absolute;top:6px;right:6px;width:44px;height:44px;border:0;border-radius:999px;background:transparent;color:var(--pl-accent);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.pl-x:hover{background:var(--pl-surface-2)}
.pl-x:focus-visible{outline:3px solid var(--pl-accent);outline-offset:-3px}
.pl-x .pl-ic{width:24px;height:24px}
.pl-pin-icon{background:none;border:0}
.pl-pin{position:relative;isolation:isolate;width:52px;height:52px;border-radius:15px;background:#fff;padding:3px;box-shadow:0 6px 16px rgba(15,23,42,.35);transition:transform .15s;transform-origin:50% 115%;display:flex;align-items:center;justify-content:center;color:var(--pl-accent)}
.pl-pin img{width:100%;height:100%;object-fit:cover;border-radius:12px;display:block}
.pl-pin::after{content:"";position:absolute;left:50%;bottom:-8px;width:16px;height:16px;margin-left:-8px;background:inherit;transform:rotate(45deg);border-radius:0 0 4px 0;z-index:-1;box-shadow:3px 3px 6px rgba(15,23,42,.18)}
.pl-pin.is-on{transform:scale(1.15);background:var(--pl-accent)}
.leaflet-marker-icon:focus-visible .pl-pin,.leaflet-marker-icon:hover .pl-pin{transform:scale(1.1)}
.leaflet-marker-icon:focus-visible{outline:none}
.leaflet-marker-icon:focus-visible .pl-pin{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--pl-accent)}
.pl-cluster{position:relative;width:54px;height:54px;border-radius:999px;background:var(--pl-accent);border:3px solid #fff;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px color-mix(in srgb,var(--pl-accent) 28%,transparent),0 6px 16px rgba(15,23,42,.35);transition:transform .15s}
.pl-cluster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.42}
.pl-cluster-n{position:relative;color:#fff;font-weight:800;font-size:1.1rem;line-height:1;text-shadow:0 1px 3px rgba(0,0,0,.45)}
.leaflet-marker-icon:hover .pl-cluster{transform:scale(1.08)}
.leaflet-marker-icon:focus-visible .pl-cluster{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--pl-accent)}
.pl-mapbtn{position:absolute;left:14px;top:106px;z-index:500;width:42px;height:42px;border-radius:12px;border:0;background:#fff;color:#1f2937;box-shadow:0 4px 16px rgba(15,23,42,.2);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.pl-mapbtn .pl-ic{width:20px;height:20px}
.pl-mapbtn:focus-visible{outline:3px solid var(--pl-accent);outline-offset:2px}
.pl-clist{position:absolute;left:12px;right:12px;bottom:12px;z-index:650;background:var(--pl-surface);color:var(--pl-text);border-radius:22px;padding:10px 10px 6px;box-shadow:0 16px 44px rgba(15,23,42,.3);max-height:60%;display:flex;flex-direction:column;animation:pl-up .22s ease-out;max-width:560px}
@media(min-width:720px){.pl-clist{left:16px;right:auto;width:440px;bottom:16px}}
.pl-clist-head{display:flex;align-items:center;justify-content:space-between;padding:2px 2px 6px 8px}
.pl-clist-head h2{margin:0;font-size:1rem;font-weight:700;color:var(--pl-text);font-family:inherit}
.pl-clist-head .pl-x{position:static}
.pl-clist ul{list-style:none;margin:0;padding:0;overflow-y:auto;display:grid;gap:4px}
.pl-clist-item{display:flex;align-items:center;gap:12px;width:100%;border:0;background:transparent;color:var(--pl-text);text-align:left;padding:8px;border-radius:14px;cursor:pointer;min-height:56px}
.pl-clist-item:hover,.pl-clist-item:focus-visible{background:var(--pl-surface-2);outline:none}
.pl-clist-item:focus-visible{box-shadow:0 0 0 2px var(--pl-accent) inset}
.pl-clist-item img{width:48px;height:48px;border-radius:10px;object-fit:cover;flex:none}
.pl-clist-text{display:flex;flex-direction:column;min-width:0}
.pl-clist-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-clist-cat{font-size:.8rem;color:var(--pl-muted)}
.pl-you{width:22px;height:22px;border-radius:999px;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 0 rgba(26,115,232,.5),0 2px 6px rgba(0,0,0,.35);animation:pl-ping 2.2s infinite}
@keyframes pl-ping{70%{box-shadow:0 0 0 18px rgba(26,115,232,0),0 2px 6px rgba(0,0,0,.35)}100%{box-shadow:0 0 0 0 rgba(26,115,232,0),0 2px 6px rgba(0,0,0,.35)}}
.pl-drop{width:32px;height:32px;border-radius:50% 50% 50% 0;background:var(--pl-accent);transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.35)}
.pl-d{display:block}
@media(min-width:900px){.pl-d{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:28px;align-items:start}.pl-d-side{position:sticky;top:16px}}
.pl-d-hero{position:relative;margin:-16px -16px 0;aspect-ratio:4/3;max-height:480px;overflow:hidden;background:var(--pl-surface-2);display:flex;align-items:center;justify-content:center;color:var(--pl-muted);touch-action:pan-y}
.pl-d-hero>.pl-ic{width:48px;height:48px}
@media(min-width:720px){.pl-d-hero{margin:0;border-radius:20px;aspect-ratio:16/10}}
.pl-d-hero img{width:100%;height:100%;object-fit:cover;display:block}
.pl-d-count{position:absolute;right:12px;bottom:12px;background:rgba(15,23,42,.72);color:#fff;font-size:.8rem;font-weight:600;padding:3px 10px;border-radius:999px}
.pl-d-thumbs{display:flex;gap:8px;overflow-x:auto;padding:12px 0 2px;scrollbar-width:none}
.pl-d-thumbs::-webkit-scrollbar{display:none}
.pl-d-thumb{flex:none;width:72px;height:54px;border-radius:10px;overflow:hidden;border:2.5px solid transparent;padding:0;background:var(--pl-surface-2);cursor:pointer;opacity:.75}
.pl-d-thumb[aria-pressed="true"]{border-color:var(--pl-accent);opacity:1}
.pl-d-thumb:focus-visible{outline:3px solid var(--pl-accent);outline-offset:2px}
.pl-d-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.pl-d-head{padding:16px 0 2px}
.pl-d-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pl-pill{display:inline-flex;align-items:center;gap:4px;font-size:.78rem;font-weight:700;padding:4px 11px;border-radius:999px;background:color-mix(in srgb,var(--pl-accent) 12%,var(--pl-surface));color:var(--pl-accent)}
.pl-pill .pl-ic{width:13px;height:13px}
.pl-pill.is-gold{background:#fef3c7;color:#7c4a03}
.pl-pill.is-gold .pl-ic{color:#d97706}
.pl-d-name{margin:10px 0 4px;font-size:1.75rem;line-height:1.15;font-weight:800;letter-spacing:-.015em;color:var(--pl-text)}
.pl-d-sub{display:flex;align-items:center;gap:6px;color:var(--pl-muted);margin:0;font-size:.95rem}
.pl-d-sub .pl-ic{width:16px;height:16px;color:var(--pl-accent)}
.pl-d-actions{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 6px}
.pl-btn{flex:1 1 100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;border-radius:14px;background:var(--pl-accent);color:var(--pl-on);font-weight:700;text-decoration:none;border:0;cursor:pointer;padding:0 18px;box-shadow:0 6px 16px color-mix(in srgb,var(--pl-accent) 30%,transparent)}
.pl-btn:hover{color:var(--pl-on);filter:brightness(1.06)}
.pl-btn[disabled]{opacity:.6;cursor:default}
.pl-btn2{flex:1 1 0;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:14px;background:var(--pl-surface);border:1.5px solid var(--pl-border);color:var(--pl-text);font-weight:600;text-decoration:none;cursor:pointer;padding:0 14px}
.pl-btn2:hover{border-color:var(--pl-accent);color:var(--pl-accent)}
.pl-btn2 .pl-ic,.pl-btn .pl-ic{width:20px;height:20px}
.pl-d-sec{margin-top:24px}
.pl-d-side .pl-d-sec:first-child{margin-top:18px}
@media(min-width:900px){.pl-d-side .pl-d-sec:first-child{margin-top:0}}
.pl-d-sec h2{font-size:1.08rem;font-weight:700;margin:0 0 10px;color:var(--pl-text);font-family:inherit}
.pl-d-desc{white-space:pre-line;line-height:1.65;margin:0;color:var(--pl-text)}
.pl-d-info{list-style:none;margin:0;padding:0;border:1px solid var(--pl-border);border-radius:18px;overflow:hidden;background:var(--pl-surface)}
.pl-d-info li{display:flex;gap:14px;padding:14px 16px;border-top:1px solid var(--pl-border)}
.pl-d-info li:first-child{border-top:0}
.pl-d-info li>.pl-ic{color:var(--pl-accent);margin-top:2px}
.pl-d-label{display:block;font-size:.74rem;font-weight:700;color:var(--pl-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
.pl-d-val{white-space:pre-line;word-break:break-word}
.pl-d-val a{color:var(--pl-accent);font-weight:600}
.pl-d-map{height:230px;border-radius:18px;overflow:hidden;background:#e7ecef;position:relative;z-index:0}
.pl-d-map .pl-pin{width:50px;height:50px}
.pl-intro{color:var(--pl-muted);margin:0 0 16px;line-height:1.55}
.pl-admin-link{display:inline-flex;align-items:center;gap:6px;margin:0 0 16px;color:var(--pl-accent);font-weight:600}
.pl-h2{font-size:1.15rem;font-weight:700;margin:0 0 12px;color:var(--pl-text);font-family:inherit}
.pl-mylist{list-style:none;padding:0;margin:0 0 26px;display:grid;gap:10px}
@media(min-width:720px){.pl-mylist{grid-template-columns:1fr 1fr}}
.pl-mycard{display:flex;gap:12px;align-items:flex-start;padding:12px;background:var(--pl-surface);border:1px solid var(--pl-border);border-radius:18px;box-shadow:var(--pl-shadow)}
.pl-mycard>img,.pl-mycard-ph{width:72px;height:72px;border-radius:12px;object-fit:cover;flex:none;background:var(--pl-surface-2);display:flex;align-items:center;justify-content:center;color:var(--pl-muted)}
.pl-mycard-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;align-items:flex-start}
.pl-mycard-name{margin:0;font-size:1rem;font-weight:700;line-height:1.25;color:var(--pl-text);font-family:inherit;overflow-wrap:anywhere}
.pl-mycard-sub{margin:0;font-size:.84rem;color:var(--pl-muted);overflow-wrap:anywhere}
.pl-mycard-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.pl-status{display:inline-flex;align-items:center;font-size:.74rem;font-weight:700;padding:3px 10px;border-radius:999px}
.pl-status.is-pending{background:#fef3c7;color:#7c4a03}
.pl-status.is-approved{background:#dcfce7;color:#14532d}
.pl-status.is-rejected{background:#fee2e2;color:#7f1d1d}
.pl-small-btn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 13px;border-radius:10px;border:1.5px solid var(--pl-border);background:var(--pl-surface);color:var(--pl-text);font-size:.86rem;font-weight:600;cursor:pointer;text-decoration:none;white-space:nowrap}
.pl-small-btn:hover{border-color:var(--pl-accent);color:var(--pl-accent)}
.pl-small-btn .pl-ic{width:16px;height:16px}
.pl-small-btn.is-danger{color:#b42318}
.pl-small-btn.is-danger:hover{border-color:#b42318;color:#b42318}
.pl-small-btn.is-danger[data-armed="1"]{background:#b42318;border-color:#b42318;color:#fff}
.pl-small-btn.is-primary{background:var(--pl-accent);color:var(--pl-on);border-color:var(--pl-accent)}
.pl-small-btn.is-primary:hover{color:var(--pl-on);filter:brightness(1.06)}
.pl-small-btn[disabled]{opacity:.55;cursor:default}
.pl-formcard{background:var(--pl-surface);border:1px solid var(--pl-border);border-radius:22px;padding:18px;box-shadow:var(--pl-shadow)}
@media(min-width:720px){.pl-formcard{padding:24px}}
.pl-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;min-width:0}
.pl-field>label,.pl-legend{font-weight:600;font-size:.93rem;color:var(--pl-text);padding:0}
.pl-field .pl-opt{font-weight:400;color:var(--pl-muted);font-size:.84rem}
.pl-input{width:100%;min-height:48px;border:1.5px solid var(--pl-border);border-radius:12px;padding:10px 12px;font:inherit;font-size:16px;background:var(--pl-bg);color:var(--pl-text)}
.pl-input:focus{outline:none;border-color:var(--pl-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--pl-accent) 22%,transparent)}
textarea.pl-input{min-height:100px;resize:vertical;line-height:1.5}
select.pl-input{-webkit-appearance:auto;appearance:auto}
.pl-input[type="file"]{padding:9px 10px;min-height:0}
.pl-hint{font-size:.84rem;color:var(--pl-muted);margin:0}
.pl-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pl-row2 .pl-field{margin-bottom:0}
@media(min-width:720px){.pl-cols{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}}
.pl fieldset{border:0;padding:0;margin:0 0 16px;min-width:0}
.pl-locrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0 10px}
.pl-pick{height:250px;border-radius:14px;overflow:hidden;border:1.5px solid var(--pl-border);position:relative;background:#e7ecef;z-index:0;margin-bottom:10px}
.pl-photos{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
.pl-photos img{width:76px;height:76px;object-fit:cover;border-radius:12px;border:1px solid var(--pl-border)}
.pl-msg{margin:14px 0 0;padding:11px 14px;border-radius:12px;font-size:.95rem;line-height:1.45;background:var(--pl-surface-2);color:var(--pl-text);border-left:4px solid var(--pl-border)}
.pl-msg:empty{display:none}
.pl-msg.is-error{background:color-mix(in srgb,#dc2626 9%,var(--pl-surface));border-left-color:#dc2626}
.pl-msg.is-success{background:color-mix(in srgb,#16a34a 10%,var(--pl-surface));border-left-color:#16a34a}
.pl-formbtns{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
.pl-formbtns .pl-btn{flex:1 1 220px}
.pl-formbtns .pl-btn2{flex:0 1 auto}
.pl-check{display:flex;align-items:center;gap:10px;min-height:44px;font-weight:600}
.pl-check input{width:20px;height:20px;accent-color:var(--pl-accent)}
.pl-arow{display:flex;gap:12px;align-items:flex-start;padding:12px;background:var(--pl-surface);border:1px solid var(--pl-border);border-radius:18px;box-shadow:var(--pl-shadow)}
.pl-arow>img,.pl-arow .pl-mycard-ph{width:84px;height:84px;border-radius:12px;object-fit:cover;flex:none}
.pl-alist{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.pl-atools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.pl-atools .pl-search{min-width:200px}
.pl-section{margin-top:6px}
.pl-editor{margin-bottom:20px}
@media(prefers-reduced-motion:reduce){.pl *,.pl *::before,.pl *::after{animation:none!important;transition:none!important}}
@media(min-width:720px){.pl-tabs{flex:0 1 440px}.pl-tab{padding:8px 16px}.pl-mine{margin-left:auto}}
@media(min-width:720px){.pl{padding:20px 20px 40px}.pl-top{border-radius:24px 24px 0 0;padding:20px 14px 38px 26px}.pl-sheet{padding:22px 24px 32px;border-radius:24px}}
`;

/** Helpers every page shares: words, flow calls, links, distances, the header and the map. */
const COMMON_JS = String.raw`
var LANG_NAMES = { en: 'English', es: 'Español', pt: 'Português', fr: 'Français', de: 'Deutsch' };
var LANG_KEY = 'nk-places-lang', POS_KEY = 'nk-places-pos', CAT_KEY = 'nk-places-cat';
function q(s, el){ return (el || document).querySelector(s); }
function qa(s, el){ return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
function mk(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = String(text); return e; }
function icon(name){ var s = mk('span', 'pl-ic'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[name] || ''; return s; }
function saved(kind, key){ try { var s = window[kind]; return s ? s.getItem(key) : null; } catch(e){ return null; } }
function save(kind, key, v){ try { var s = window[kind]; if(!s) return; if(v == null || v === '') s.removeItem(key); else s.setItem(key, v); } catch(e){} }
function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
var root = q('.pl');
var preset = (root && root.getAttribute('data-preset')) || 'tourist';
if(!PRESETS[preset]) preset = 'tourist';
var offered = String((root && root.getAttribute('data-langs')) || 'en').split(',').map(function(s){ return s.trim(); }).filter(function(c, i, a){ return !!I18N[c] && a.indexOf(c) === i; });
if(!offered.length) offered = ['en'];
var lang = (function(){
  var s = saved('localStorage', LANG_KEY);
  if(s && offered.indexOf(s) >= 0) return s;
  var b = String(navigator.language || '').slice(0, 2).toLowerCase();
  return offered.indexOf(b) >= 0 ? b : offered[0];
})();
function t(key, vars){
  var p = PRESETS[preset] || {};
  var s = (p[lang] && p[lang][key]) || (I18N[lang] && I18N[lang][key]) || (p.en && p.en[key]) || I18N.en[key] || key;
  if(vars) s = s.replace(/\{(\w+)\}/g, function(m, k){ return vars[k] != null ? String(vars[k]) : m; });
  return s;
}
function fmtNum(n, digits){ try { return new Intl.NumberFormat(lang, { maximumFractionDigits: digits || 0 }).format(n); } catch(e){ return String(Math.round(n)); } }
function count(n){ return t(n === 1 ? 'one' : 'many', { n: fmtNum(n) }); }
var langHooks = [];
function applyLang(){
  if(root) root.setAttribute('lang', lang);
  qa('[data-pl-t]').forEach(function(e){ e.textContent = t(e.getAttribute('data-pl-t')); });
  qa('[data-pl-ph]').forEach(function(e){ e.setAttribute('placeholder', t(e.getAttribute('data-pl-ph'))); });
  qa('[data-pl-label]').forEach(function(e){ var v = t(e.getAttribute('data-pl-label')); e.setAttribute('aria-label', v); if(!e.hasAttribute('data-pl-notitle')) e.setAttribute('title', v); });
  var title = q('#pl-title');
  if(title){
    if(!title.hasAttribute('data-pl-own')) title.setAttribute('data-pl-own', title.textContent.trim() ? '1' : '0');
    if(title.getAttribute('data-pl-own') === '0') title.textContent = t('title');
  }
  qa('.pl-lang-item').forEach(function(b){ b.setAttribute('aria-checked', b.getAttribute('data-code') === lang ? 'true' : 'false'); });
  langHooks.forEach(function(fn){ try { fn(); } catch(e){ console.error('[places]', e); } });
}
function setupHeader(onRefresh){
  var btn = q('#pl-lang-btn'), menu = q('#pl-lang-menu');
  if(btn && menu){
    if(offered.length < 2){ btn.hidden = true; }
    else {
      var closeMenu = function(){ menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
      var openMenu = function(){
        menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
        var cur = q('.pl-lang-item[aria-checked="true"]', menu) || q('.pl-lang-item', menu);
        if(cur) cur.focus();
      };
      offered.forEach(function(code){
        var it = mk('button', 'pl-lang-item');
        it.type = 'button';
        it.setAttribute('role', 'menuitemradio');
        it.setAttribute('data-code', code);
        it.setAttribute('lang', code);
        it.appendChild(mk('span', '', LANG_NAMES[code]));
        it.appendChild(icon('check'));
        it.addEventListener('click', function(){ lang = code; save('localStorage', LANG_KEY, code); closeMenu(); applyLang(); btn.focus(); });
        menu.appendChild(it);
      });
      btn.addEventListener('click', function(e){ e.stopPropagation(); if(menu.hidden) openMenu(); else closeMenu(); });
      document.addEventListener('click', function(e){ if(!menu.hidden && !menu.contains(e.target)) closeMenu(); });
      menu.addEventListener('keydown', function(e){
        var items = qa('.pl-lang-item', menu), i = items.indexOf(document.activeElement);
        if(e.key === 'Escape'){ e.preventDefault(); closeMenu(); btn.focus(); }
        else if(e.key === 'ArrowDown'){ e.preventDefault(); items[(i + 1) % items.length].focus(); }
        else if(e.key === 'ArrowUp'){ e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
        else if(e.key === 'Tab'){ closeMenu(); }
      });
    }
  }
  var r = q('#pl-refresh');
  if(r){
    if(!onRefresh) r.hidden = true;
    else r.addEventListener('click', function(){
      r.classList.add('is-spin'); r.disabled = true;
      Promise.resolve(onRefresh(true)).catch(function(){}).then(function(){ setTimeout(function(){ r.classList.remove('is-spin'); r.disabled = false; }, 450); });
    });
  }
}
function flowId(name){ var e = q('[data-pl-flow="' + name + '"]'); return (e && (e.getAttribute('data-nk-flow') || e.getAttribute('data-nk-flow-ref'))) || name; }
function run(name, body){
  return fetch('/api/run/' + encodeURIComponent(flowId(name)), { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })
    .then(function(r){
      return r.json().catch(function(){ return null; }).then(function(d){
        if(!r.ok || (d && !Array.isArray(d) && d.error)){ var err = new Error((d && d.error) || 'failed'); err.status = r.status; throw err; }
        return d;
      });
    });
}
function rowsOf(d){ return Array.isArray(d) ? d : (d && Array.isArray(d.rows) ? d.rows : []); }
function safeUrl(u){ var s = String(u == null ? '' : u).trim(); return /^https?:\/\/[^\s]+$/i.test(s) || /^\/(?!\/)[^\s]*$/.test(s) ? s : ''; }
function webUrl(u){
  var s = String(u == null ? '' : u).trim();
  if(!s) return '';
  if(/^https?:\/\/[^\s]+$/i.test(s)) return s;
  if(/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/\S*)?$/i.test(s)) return 'https://' + s;
  return '';
}
function webLabel(u){ try { return new URL(u).hostname.replace(/^www\./, ''); } catch(e){ return u; } }
function thumbOf(u){ var s = safeUrl(u); var m = /^\/media\/generated\/([\w-]+\.webp)$/.exec(s); return m ? '/media/generated/thumbs/' + m[1] : s; }
function photosOf(p){
  var out = [];
  [p.image_url].concat(String(p.gallery || '').split(/\r?\n/)).forEach(function(u){ var s = safeUrl(u); if(s && out.indexOf(s) < 0) out.push(s); });
  return out;
}
function truthy(v){ return v === true || v === 1 || v === 'true' || v === 't' || v === '1'; }
function num(v){ var n = parseFloat(v); return isFinite(n) ? n : null; }
function hasCoords(p){ var a = num(p.lat), b = num(p.lng); return a !== null && b !== null && Math.abs(a) <= 90 && Math.abs(b) <= 180 && !(a === 0 && b === 0); }
function llOf(p){ return { lat: num(p.lat), lng: num(p.lng) }; }
function km(a, b){
  var R = 6371, r = Math.PI / 180;
  var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
var units = (root && root.getAttribute('data-units')) === 'mi' ? 'mi' : 'km';
function fmtDist(k){
  if(units === 'mi'){ var mi = k * 0.621371; return mi < 0.1 ? fmtNum(Math.round(mi * 528) * 10) + ' ft' : fmtNum(mi, mi < 10 ? 1 : 0) + ' mi'; }
  return k < 1 ? fmtNum(Math.max(10, Math.round(k * 100) * 10)) + ' m' : fmtNum(k, k < 10 ? 1 : 0) + ' km';
}
function savedPos(){
  var s = saved('sessionStorage', POS_KEY);
  if(!s) return null;
  try { var p = JSON.parse(s); return p && isFinite(p.lat) && isFinite(p.lng) ? { lat: +p.lat, lng: +p.lng } : null; } catch(e){ return null; }
}
function locate(){
  return new Promise(function(resolve, reject){
    if(!navigator.geolocation){ reject(new Error(t('noGeo'))); return; }
    navigator.geolocation.getCurrentPosition(function(p){
      var pos = { lat: p.coords.latitude, lng: p.coords.longitude };
      save('sessionStorage', POS_KEY, JSON.stringify(pos));
      resolve(pos);
    }, function(){ reject(new Error(t('locError'))); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  });
}
function shortAddr(a){ var s = String(a || ''); var i = s.indexOf(','); return i > 0 ? s.slice(0, i) : s; }
function say(msg, kind){ if(window.nkToast) window.nkToast(msg, kind); else { var s = q('#pl-live'); if(s) s.textContent = msg; } }
function paintMsg(el, text, kind){ if(!el) return; el.className = 'pl-msg' + (kind ? ' is-' + kind : ''); el.setAttribute('role', kind === 'error' ? 'alert' : 'status'); el.textContent = text || ''; }
function detailsHref(id){ var a = q('#pl-details-link'); var base = (a && a.getAttribute('href')) || 'details'; return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'id=' + encodeURIComponent(id); }
function baseMap(el, opts){
  var map = L.map(el, Object.assign({ zoomControl: false, attributionControl: false }, opts || {}));
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
  L.control.attribution({ position: 'topright' }).addTo(map);
  return map;
}
function pinIcon(p, on){
  var wrap = mk('div', 'pl-pin' + (on ? ' is-on' : ''));
  var src = thumbOf(p.image_url);
  if(src){ var im = mk('img'); im.src = src; im.alt = ''; wrap.appendChild(im); }
  else wrap.appendChild(icon('pin'));
  return L.divIcon({ html: wrap, className: 'pl-pin-icon', iconSize: [52, 60], iconAnchor: [26, 60] });
}
function youIcon(){ return L.divIcon({ html: mk('div', 'pl-you'), className: 'pl-pin-icon', iconSize: [22, 22], iconAnchor: [11, 11] }); }
function dropIcon(){ return L.divIcon({ html: mk('div', 'pl-drop'), className: 'pl-pin-icon', iconSize: [32, 32], iconAnchor: [16, 38] }); }
function makePicker(el, latIn, lngIn){
  var api = { set: function(){}, clear: function(){}, center: function(){}, refresh: function(){} };
  if(!el || !latIn || !lngIn) return api;
  if(typeof L === 'undefined'){ el.hidden = true; return api; }
  var map = baseMap(el, { zoomControl: true, scrollWheelZoom: false });
  map.setView([20, 0], 2);
  var marker = null;
  function write(ll){ latIn.value = ll.lat.toFixed(6); lngIn.value = ll.lng.toFixed(6); }
  api.set = function(lat, lng, pan){
    var ll = L.latLng(lat, lng);
    if(!marker){
      marker = L.marker(ll, { draggable: true, icon: dropIcon(), keyboard: true, title: t('pickHint') }).addTo(map);
      marker.on('dragend', function(){ write(marker.getLatLng()); });
    } else marker.setLatLng(ll);
    write(ll);
    if(pan) map.setView(ll, Math.max(map.getZoom(), 16));
  };
  api.clear = function(){ if(marker){ map.removeLayer(marker); marker = null; } };
  api.center = function(lat, lng, z){ if(!marker) map.setView([lat, lng], z || 13); };
  api.refresh = function(){ setTimeout(function(){ map.invalidateSize(); }, 60); };
  map.on('click', function(e){ api.set(e.latlng.lat, e.latlng.lng, false); });
  function fromInputs(){ var a = parseFloat(latIn.value), b = parseFloat(lngIn.value); if(isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180) api.set(a, b, true); }
  latIn.addEventListener('change', fromInputs);
  lngIn.addEventListener('change', fromInputs);
  return api;
}
function checkFiles(list, max){
  var files = Array.prototype.slice.call(list || []);
  if(files.length > max) return { error: t('tooManyPhotos') };
  for(var i = 0; i < files.length; i++){
    var f = files[i];
    var okType = /^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(f.type || '') || /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(f.name || '');
    if(!okType || f.size > 15 * 1024 * 1024) return { error: t('notImage') };
  }
  return { files: files };
}
function uploadPhotos(files){
  var fd = new FormData();
  files.forEach(function(f, i){ var n = /\.[a-z0-9]{2,5}$/i.test(f.name || '') ? f.name : 'photo-' + (i + 1) + '.jpg'; fd.append('photo' + i, f, n); });
  return fetch('/api/upload', { method: 'POST', body: fd, credentials: 'same-origin' }).then(function(r){
    return r.json().catch(function(){ return {}; }).then(function(j){
      if(!r.ok || !j || !j.files){ var e = new Error('upload'); e.upload = true; throw e; }
      return files.map(function(f, i){ return safeUrl(j.files['photo' + i]); }).filter(Boolean);
    });
  });
}
function centroid(rows){
  var pts = rows.filter(hasCoords);
  if(!pts.length) return null;
  var lat = 0, lng = 0;
  pts.forEach(function(p){ lat += num(p.lat); lng += num(p.lng); });
  return { lat: lat / pts.length, lng: lng / pts.length };
}
`;

/** The guide: List, Categories and Map views. */
const GUIDE_JS = String.raw`
var VIEWS = ['list', 'categories', 'map'];
var state = { places: [], cats: [], loaded: false, failed: false, view: 'list', cat: saved('sessionStorage', CAT_KEY) || '', q: '', pos: savedPos(), sel: null };
var map = null, markers = {}, youMarker = null, fitted = false;
function byName(a, b){ return String(a.name || '').localeCompare(String(b.name || ''), lang, { sensitivity: 'base' }); }
function catOf(p){ return String(p.category || '').trim(); }
function visible(){
  var ql = state.q.trim().toLowerCase();
  return state.places.filter(function(p){
    if(state.cat && catOf(p) !== state.cat) return false;
    if(!ql) return true;
    return [p.name, p.category, p.address, p.description].join(' ').toLowerCase().indexOf(ql) >= 0;
  });
}
function ordered(list){
  var arr = list.slice();
  if(state.pos){
    arr.forEach(function(p){ p.__d = hasCoords(p) ? km(state.pos, llOf(p)) : Infinity; });
    arr.sort(function(a, b){ return a.__d - b.__d || byName(a, b); });
  } else if(root.getAttribute('data-sort') === 'name') arr.sort(byName);
  else arr.sort(function(a, b){
    var fa = truthy(a.featured) ? 1 : 0, fb = truthy(b.featured) ? 1 : 0;
    var oa = num(a.sort_order), ob = num(b.sort_order);
    return (fb - fa) || ((oa === null ? 1e9 : oa) - (ob === null ? 1e9 : ob)) || byName(a, b);
  });
  return arr;
}
function renderFilter(){
  var row = q('#pl-filter');
  if(!row) return;
  row.hidden = !state.cat;
  q('#pl-filter-name').textContent = state.cat;
}
function setCat(name){
  state.cat = name || '';
  save('sessionStorage', CAT_KEY, state.cat);
  closeCard();
  renderAll();
  if(map && state.loaded) fitAll();
}
function cardFor(p){
  var li = mk('li');
  var a = mk('a', 'pl-card');
  a.href = detailsHref(p.id);
  var media = mk('div', 'pl-card-media');
  var src = thumbOf(p.image_url);
  if(src){ var im = mk('img'); im.src = src; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; media.appendChild(im); }
  else media.appendChild(icon('image'));
  if(truthy(p.featured)){ var b = mk('span', 'pl-badge'); b.appendChild(icon('star')); b.appendChild(mk('span', '', t('featured'))); media.appendChild(b); }
  var body = mk('div', 'pl-card-body');
  if(catOf(p)) body.appendChild(mk('span', 'pl-card-cat', catOf(p)));
  body.appendChild(mk('h3', 'pl-card-name', p.name));
  if(p.address) body.appendChild(mk('p', 'pl-card-addr', shortAddr(p.address)));
  if(state.pos && isFinite(p.__d)){ var d = mk('span', 'pl-dist'); d.appendChild(icon('nav')); d.appendChild(mk('span', '', fmtDist(p.__d))); body.appendChild(d); }
  a.appendChild(media); a.appendChild(body); a.appendChild(icon('chev'));
  li.appendChild(a);
  return li;
}
function renderList(){
  var ul = q('#pl-list');
  if(!ul) return;
  ul.textContent = '';
  var note = q('#pl-sort-note');
  if(note) note.textContent = state.pos ? t('sortedNear') : '';
  var near = q('#pl-near');
  if(near) near.setAttribute('aria-pressed', state.pos ? 'true' : 'false');
  var cnt = q('#pl-count');
  if(!state.loaded){
    if(cnt) cnt.textContent = '';
    var li = mk('li', 'pl-empty', state.failed ? t('loadError') : t('loading'));
    if(state.failed){ var b = mk('button', 'pl-small-btn', t('retry')); b.type = 'button'; b.style.marginTop = '12px'; b.addEventListener('click', function(){ load(); }); li.appendChild(mk('br')); li.appendChild(b); }
    ul.appendChild(li);
    return;
  }
  var list = ordered(visible());
  if(cnt) cnt.textContent = count(list.length);
  if(!list.length){ ul.appendChild(mk('li', 'pl-empty', state.places.length ? t('noResults') : t('empty'))); return; }
  list.forEach(function(p){ ul.appendChild(cardFor(p)); });
}
function catEntries(){
  var names = [];
  state.cats.forEach(function(c){ var n = String(c.name || '').trim(); if(n && names.indexOf(n) < 0) names.push(n); });
  state.places.forEach(function(p){ var n = catOf(p); if(n && names.indexOf(n) < 0) names.push(n); });
  return names.map(function(n){
    var row = state.cats.filter(function(c){ return String(c.name || '').trim() === n; })[0];
    var inCat = state.places.filter(function(p){ return catOf(p) === n; });
    var pic = (row && safeUrl(row.image_url)) || (inCat[0] && safeUrl(inCat[0].image_url)) || '';
    return { name: n, count: inCat.length, image: pic };
  }).filter(function(c){ return c.count > 0; });
}
function tile(c, all){
  var li = mk('li');
  var b = mk('button', 'pl-cat' + (all ? ' is-all' : ''));
  b.type = 'button';
  b.setAttribute('aria-pressed', (all ? !state.cat : state.cat === c.name) ? 'true' : 'false');
  if(c.image){
    var im = mk('img'); im.src = thumbOf(c.image); im.alt = ''; im.loading = 'lazy';
    if(thumbOf(c.image) !== c.image){ im.srcset = thumbOf(c.image) + ' 400w, ' + c.image + ' 1536w'; im.sizes = '(min-width: 1040px) 25vw, (min-width: 720px) 33vw, 50vw'; }
    b.appendChild(im);
  } else if(all) b.appendChild(icon('grid'));
  b.appendChild(mk('span', 'pl-cat-shade'));
  var tx = mk('span', 'pl-cat-text');
  tx.appendChild(mk('span', 'pl-cat-name', c.name));
  tx.appendChild(mk('span', 'pl-cat-count', count(c.count)));
  b.appendChild(tx);
  b.addEventListener('click', function(){ setCat(all ? '' : c.name); switchView('list'); var tab = q('#pl-tab-list'); if(tab) tab.focus(); });
  li.appendChild(b);
  return li;
}
function renderCats(){
  var ul = q('#pl-cats');
  if(!ul) return;
  ul.textContent = '';
  if(!state.loaded){ ul.appendChild(mk('li', 'pl-empty', state.failed ? t('loadError') : t('loading'))); return; }
  ul.appendChild(tile({ name: t('all'), count: state.places.length, image: '' }, true));
  catEntries().forEach(function(c){ ul.appendChild(tile(c, false)); });
}
function sizeMap(){
  var wrap = q('#pl-mapwrap');
  if(!wrap) return;
  var top = wrap.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
  var h = Math.round(window.innerHeight - top - (window.innerWidth < 720 ? 0 : 28));
  wrap.style.height = Math.max(380, Math.min(h, 880)) + 'px';
}
// Photo pins that would overlap at the current zoom merge into one round
// bubble with the number of places. Positions are compared in pixels at the
// map's zoom, so the groups are worked out again whenever the zoom changes.
var PIN_W = 52, PIN_H = 60, BUBBLE = 54, GAP = 4;
var clusterLayers = [], clusterZoom = null;
function boxOf(g){
  var x = g.pt.x, y = g.pt.y;
  return g.items.length > 1 ? { l: x - BUBBLE / 2, r: x + BUBBLE / 2, t: y - BUBBLE / 2, b: y + BUBBLE / 2 } : { l: x - PIN_W / 2, r: x + PIN_W / 2, t: y - PIN_H, b: y };
}
function touching(a, b){ return a.l < b.r + GAP && b.l < a.r + GAP && a.t < b.b + GAP && b.t < a.b + GAP; }
function buildGroups(list, z){
  var gs = list.filter(hasCoords).map(function(p){ return { items: [p], pt: map.project([num(p.lat), num(p.lng)], z) }; });
  var changed = true, passes = 0;
  while(changed && passes++ < 50){
    changed = false;
    for(var i = 0; i < gs.length; i++){
      for(var j = i + 1; j < gs.length; j++){
        if(!touching(boxOf(gs[i]), boxOf(gs[j]))) continue;
        var a = gs[i], b = gs[j], n = a.items.length + b.items.length;
        a.pt = L.point((a.pt.x * a.items.length + b.pt.x * b.items.length) / n, (a.pt.y * a.items.length + b.pt.y * b.items.length) / n);
        a.items = a.items.concat(b.items);
        gs.splice(j, 1);
        changed = true;
        j = i;
      }
    }
  }
  return gs;
}
function clusterIcon(g){
  var wrap = mk('div', 'pl-cluster');
  var src = thumbOf(g.items[0].image_url);
  if(src){ var im = mk('img'); im.src = src; im.alt = ''; wrap.appendChild(im); }
  wrap.appendChild(mk('span', 'pl-cluster-n', fmtNum(g.items.length)));
  return L.divIcon({ html: wrap, className: 'pl-pin-icon pl-cluster-icon', iconSize: [BUBBLE, BUBBLE], iconAnchor: [BUBBLE / 2, BUBBLE / 2] });
}
function drawMarkers(){
  if(!map) return;
  Object.keys(markers).forEach(function(k){ map.removeLayer(markers[k]); });
  clusterLayers.forEach(function(m){ map.removeLayer(m); });
  markers = {}; clusterLayers = [];
  var z = map.getZoom();
  clusterZoom = z;
  var el = q('#pl-map');
  if(el) el.setAttribute('data-zoom', String(z));
  var list = visible();
  buildGroups(list, z).forEach(function(g){
    if(g.items.length === 1){
      var p = g.items[0];
      var on = !!(state.sel && String(state.sel.id) === String(p.id));
      var m = L.marker([num(p.lat), num(p.lng)], { icon: pinIcon(p, on), title: String(p.name || ''), alt: String(p.name || ''), riseOnHover: true, keyboard: true, zIndexOffset: on ? 1000 : 0 });
      m.on('click', function(){ select(p, true); });
      m.addTo(map);
      if(m.getElement()) m.getElement().setAttribute('data-id', String(p.id));
      markers[p.id] = m;
      return;
    }
    var label = count(g.items.length);
    var c = L.marker(map.unproject(g.pt, z), { icon: clusterIcon(g), title: label, keyboard: true, riseOnHover: true, zIndexOffset: 500 });
    c.on('click', function(){ openCluster(g); });
    c.addTo(map);
    var ce = c.getElement();
    if(ce){ ce.setAttribute('aria-label', label); ce.setAttribute('data-ids', g.items.map(function(p){ return String(p.id); }).join(' ')); }
    clusterLayers.push(c);
  });
  if(state.sel && !list.some(function(p){ return String(p.id) === String(state.sel.id); })) closeCard();
}
function regroup(){ if(map && state.loaded && map.getZoom() !== clusterZoom) drawMarkers(); }
function openCluster(g){
  closeCard();
  var b = L.latLngBounds(g.items.map(function(p){ return [num(p.lat), num(p.lng)]; }));
  var maxZ = map.getMaxZoom(), z = map.getZoom();
  var same = b.getNorthEast().equals(b.getSouthWest());
  if(!same && z < maxZ - 0.01){
    var want = map.getBoundsZoom(b, false, L.point(140, 180));
    map.setView(b.getCenter(), Math.min(maxZ, Math.max(z + 1, want)), { animate: true });
    return;
  }
  showClusterList(g);
}
function closeList(){ var box = q('#pl-clist'); if(!box || box.hidden) return; box.hidden = true; var wrap = q('#pl-mapwrap'); if(wrap && !state.sel) wrap.classList.remove('has-card'); }
function showClusterList(g){
  var box = q('#pl-clist'), ul = q('#pl-clist-items');
  if(!box || !ul) return;
  q('#pl-clist-title').textContent = count(g.items.length);
  ul.textContent = '';
  g.items.slice().sort(byName).forEach(function(p){
    var li = mk('li');
    var b = mk('button', 'pl-clist-item');
    b.type = 'button';
    b.setAttribute('data-id', String(p.id));
    var src = thumbOf(p.image_url);
    if(src){ var im = mk('img'); im.src = src; im.alt = ''; b.appendChild(im); } else b.appendChild(icon('image'));
    var tx = mk('span', 'pl-clist-text');
    tx.appendChild(mk('span', 'pl-clist-name', p.name));
    if(catOf(p)) tx.appendChild(mk('span', 'pl-clist-cat', catOf(p)));
    b.appendChild(tx);
    b.addEventListener('click', function(){ closeList(); select(p, false); });
    li.appendChild(b); ul.appendChild(li);
  });
  box.hidden = false;
  var wrap = q('#pl-mapwrap');
  if(wrap){ wrap.classList.add('has-card'); wrap.style.setProperty('--pl-card-h', box.offsetHeight + 'px'); }
  var first = q('.pl-clist-item', box);
  if(first) first.focus({ preventScroll: true });
}
function fitAll(){
  if(!map) return;
  var pts = visible().filter(hasCoords).map(function(p){ return [num(p.lat), num(p.lng)]; });
  if(pts.length === 1) map.setView(pts[0], 15);
  else if(pts.length) map.fitBounds(pts, { paddingTopLeft: [44, 72], paddingBottomRight: [52, 36], maxZoom: 16 });
  else if(state.pos) map.setView([state.pos.lat, state.pos.lng], 14);
}
function showYou(){
  if(!map || !state.pos) return;
  if(!youMarker) youMarker = L.marker([state.pos.lat, state.pos.lng], { icon: youIcon(), keyboard: false, interactive: false, zIndexOffset: 2000 }).addTo(map);
  else youMarker.setLatLng([state.pos.lat, state.pos.lng]);
}
function showMap(){
  var el = q('#pl-map');
  if(!el) return;
  if(typeof L === 'undefined'){ el.textContent = t('mapError'); el.classList.add('is-error'); return; }
  sizeMap();
  if(!map){
    map = baseMap(el, { zoomControl: false, zoomSnap: 0.25, zoomDelta: 1, maxZoom: 19 });
    map.on('zoomend moveend', regroup);
    L.control.zoom({ position: 'topleft', zoomInTitle: t('zoomIn'), zoomOutTitle: t('zoomOut') }).addTo(map);
    map.setView([20, 0], 2);
    map.on('click', function(){ closeCard(); closeList(); });
  }
  setTimeout(function(){
    map.invalidateSize();
    if(state.loaded){ drawMarkers(); if(!fitted){ fitted = true; fitAll(); } showYou(); }
  }, 0);
}
function select(p, pan){
  closeList();
  var prev = state.sel;
  state.sel = p;
  if(prev && markers[prev.id]) markers[prev.id].setIcon(pinIcon(prev, false)).setZIndexOffset(0);
  if(markers[p.id]) markers[p.id].setIcon(pinIcon(p, true)).setZIndexOffset(1000);
  var card = q('#pl-card'), im = q('#pl-card-img'), src = thumbOf(p.image_url);
  if(src){ im.src = src; im.hidden = false; } else im.hidden = true;
  im.alt = '';
  q('#pl-card-name').textContent = p.name || '';
  var cat = q('#pl-card-cat'); cat.textContent = catOf(p); cat.hidden = !catOf(p);
  var addr = q('#pl-card-addr'); addr.textContent = p.address || ''; addr.hidden = !p.address;
  var dist = q('#pl-card-dist');
  if(state.pos && hasCoords(p)){ dist.hidden = false; dist.textContent = t('away', { d: fmtDist(km(state.pos, llOf(p))) }); } else dist.hidden = true;
  q('#pl-card-link').href = detailsHref(p.id);
  card.hidden = false;
  var wrap = q('#pl-mapwrap');
  wrap.classList.add('has-card');
  wrap.style.setProperty('--pl-card-h', card.offsetHeight + 'px');
  if(pan && map && hasCoords(p)){
    // Only move the map when the card would cover the pin (or it's off the map).
    var size = map.getSize(), pt = map.latLngToContainerPoint([num(p.lat), num(p.lng)]);
    var mr = q('#pl-map').getBoundingClientRect(), cr = card.getBoundingClientRect();
    var cardTop = cr.top - mr.top, cardLeft = cr.left - mr.left, cardRight = cr.right - mr.left;
    var covered = pt.y + 8 > cardTop - 12 && pt.x + 30 > cardLeft && pt.x - 30 < cardRight;
    var outside = pt.x < 30 || pt.x > size.x - 30 || pt.y < 70 || pt.y > size.y;
    if(covered || outside){
      var dx = pt.x < 30 || pt.x > size.x - 30 ? pt.x - size.x / 2 : 0;
      var dy = pt.y - Math.max(cardTop / 2, 90);
      map.panBy([dx, dy], { animate: true });
    }
  }
  q('#pl-card-name').focus({ preventScroll: true });
}
function closeCard(){
  var p = state.sel;
  state.sel = null;
  if(p && markers[p.id]) markers[p.id].setIcon(pinIcon(p, false)).setZIndexOffset(0);
  var card = q('#pl-card'); if(card) card.hidden = true;
  var wrap = q('#pl-mapwrap'); if(wrap) wrap.classList.remove('has-card');
}
function findMe(fromMap){
  var btns = [q('#pl-near'), q('#pl-locate')];
  btns.forEach(function(b){ if(b) b.classList.add('is-busy'); });
  var live = q('#pl-live'); if(live) live.textContent = t('locating');
  return locate().then(function(pos){
    state.pos = pos;
    renderList();
    if(map){
      showYou();
      if(state.sel) select(state.sel, false);
      if(fromMap){
        var near = ordered(visible()).filter(hasCoords)[0];
        if(near) map.fitBounds([[pos.lat, pos.lng], [num(near.lat), num(near.lng)]], { padding: [80, 80], maxZoom: 16 });
        else map.setView([pos.lat, pos.lng], 15);
      }
    }
    if(state.view === 'map') say(t('sortedNear'), 'success'); else if(live) live.textContent = t('sortedNear');
  }).catch(function(err){ say(err && err.message ? err.message : t('locError'), 'error'); })
    .then(function(){ btns.forEach(function(b){ if(b) b.classList.remove('is-busy'); }); });
}
function switchView(v){
  if(VIEWS.indexOf(v) < 0) v = 'list';
  state.view = v;
  VIEWS.forEach(function(k){
    var tab = q('#pl-tab-' + k), panel = q('#pl-view-' + k), on = k === v;
    if(tab){ tab.setAttribute('aria-selected', on ? 'true' : 'false'); tab.tabIndex = on ? 0 : -1; }
    if(panel) panel.hidden = !on;
  });
  try { history.replaceState(history.state, '', '#' + v); } catch(e){}
  if(v === 'map') showMap();
}
function renderAll(){ renderFilter(); renderList(); renderCats(); if(map) drawMarkers(); }
function load(fromButton){
  return Promise.all([run('feed'), run('categories').catch(function(){ return []; })]).then(function(res){
    state.places = rowsOf(res[0]).filter(function(p){ return p && p.id != null && String(p.name || '').trim(); });
    state.cats = rowsOf(res[1]);
    state.loaded = true; state.failed = false;
    closeCard();
    renderAll();
    if(map && state.view === 'map'){ if(!fitted){ fitted = true; fitAll(); } showYou(); }
    if(fromButton) say(t('refreshed'), 'success');
  }).catch(function(){
    if(state.loaded) say(t('loadError'), 'error');
    else { state.failed = true; renderList(); renderCats(); }
  });
}
ready(function(){
  if(!root || root.__plReady) return;
  root.__plReady = true;
  setupHeader(function(){ return load(true); });
  var tabs = qa('.pl-tab');
  tabs.forEach(function(tab){ tab.addEventListener('click', function(){ switchView(tab.getAttribute('data-view')); }); });
  var tablist = q('.pl-tabs');
  if(tablist) tablist.addEventListener('keydown', function(e){
    var i = tabs.indexOf(document.activeElement);
    if(i < 0) return;
    var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if(n === null) return;
    e.preventDefault();
    var next = tabs[(n + tabs.length) % tabs.length];
    next.focus(); switchView(next.getAttribute('data-view'));
  });
  var search = q('#pl-q');
  if(search) search.addEventListener('input', function(){ state.q = search.value; renderList(); if(map) drawMarkers(); });
  var near = q('#pl-near');
  if(near) near.addEventListener('click', function(){
    if(state.pos){
      state.pos = null; save('sessionStorage', POS_KEY, null);
      if(youMarker && map){ map.removeLayer(youMarker); youMarker = null; }
      renderList();
    } else findMe(false);
  });
  var clear = q('#pl-filter-clear');
  if(clear) clear.addEventListener('click', function(){ setCat(''); var s = q('#pl-q'); if(s) s.focus(); });
  var loc = q('#pl-locate');
  if(loc) loc.addEventListener('click', function(){ findMe(true); });
  var fit = q('#pl-fit');
  if(fit) fit.addEventListener('click', function(){ closeCard(); closeList(); fitAll(); });
  var lx = q('#pl-clist-close');
  if(lx) lx.addEventListener('click', function(){ closeList(); });
  var x = q('#pl-card-close');
  if(x) x.addEventListener('click', function(){ var p = state.sel; closeCard(); if(p && markers[p.id] && markers[p.id].getElement()) markers[p.id].getElement().focus(); });
  document.addEventListener('keydown', function(e){ if(e.key !== 'Escape') return; if(state.sel) closeCard(); var box = q('#pl-clist'); if(box && !box.hidden){ closeList(); var m = q('#pl-map .pl-cluster-icon'); if(m) m.focus(); } });
  var rt = null;
  window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(function(){ if(map && state.view === 'map'){ sizeMap(); map.invalidateSize(); } }, 150); });
  langHooks.push(function(){
    renderAll();
    qa('.leaflet-control-zoom-in', root).forEach(function(a){ a.title = t('zoomIn'); a.setAttribute('aria-label', t('zoomIn')); });
    qa('.leaflet-control-zoom-out', root).forEach(function(a){ a.title = t('zoomOut'); a.setAttribute('aria-label', t('zoomOut')); });
    if(state.sel) select(state.sel, false);
  });
  applyLang();
  var h = String(location.hash || '').replace('#', '');
  switchView(VIEWS.indexOf(h) >= 0 ? h : 'list');
  load();
});
`;

/** One place: photos, actions, information and a small map. */
const DETAILS_JS = String.raw`
var place = null, dmap = null;
function dirUrl(p){
  var c = num(p.lat).toFixed(6) + ',' + num(p.lng).toFixed(6);
  var ua = navigator.userAgent || '';
  var apple = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return apple ? 'https://maps.apple.com/?daddr=' + c : 'https://www.google.com/maps/dir/?api=1&destination=' + c;
}
function drawMini(el, p){
  if(typeof L === 'undefined'){ el.textContent = t('mapError'); return; }
  var ll = [num(p.lat), num(p.lng)];
  dmap = baseMap(el, { zoomControl: true, scrollWheelZoom: false, dragging: !L.Browser.mobile });
  dmap.setView(ll, 16);
  L.marker(ll, { icon: pinIcon(p, true), keyboard: false, title: String(p.name || '') }).addTo(dmap);
  var you = savedPos();
  if(you) L.marker([you.lat, you.lng], { icon: youIcon(), interactive: false, keyboard: false }).addTo(dmap);
}
function render(p){
  var box = q('#pl-detail');
  if(dmap){ dmap.remove(); dmap = null; }
  box.textContent = '';
  document.title = String(p.name || document.title);
  var pics = photosOf(p), cur = 0;
  var wrap = mk('article', 'pl-d'), main = mk('div', 'pl-d-main'), side = mk('div', 'pl-d-side');
  var hero = mk('div', 'pl-d-hero'), big = null, badge = null, strip = null;
  function show(i){
    if(!big || !pics.length) return;
    cur = (i + pics.length) % pics.length;
    big.src = pics[cur];
    if(badge) badge.textContent = (cur + 1) + ' / ' + pics.length;
    if(strip) qa('.pl-d-thumb', strip).forEach(function(x, k){ x.setAttribute('aria-pressed', k === cur ? 'true' : 'false'); });
  }
  if(pics.length){ big = mk('img'); big.src = pics[0]; big.alt = String(p.name || ''); big.decoding = 'async'; hero.appendChild(big); }
  else hero.appendChild(icon('image'));
  main.appendChild(hero);
  if(pics.length > 1){
    badge = mk('span', 'pl-d-count', '1 / ' + pics.length);
    badge.setAttribute('aria-hidden', 'true');
    hero.appendChild(badge);
    strip = mk('div', 'pl-d-thumbs');
    strip.setAttribute('role', 'group');
    strip.setAttribute('aria-label', t('photos'));
    pics.forEach(function(src, i){
      var b = mk('button', 'pl-d-thumb');
      b.type = 'button';
      b.setAttribute('aria-label', t('photoOf', { i: i + 1, n: pics.length }));
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      var im = mk('img'); im.src = thumbOf(src); im.alt = ''; im.loading = 'lazy';
      b.appendChild(im);
      b.addEventListener('click', function(){ show(i); });
      strip.appendChild(b);
    });
    main.appendChild(strip);
    var sx = null;
    hero.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function(e){ if(sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if(Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); });
  }
  var head = mk('div', 'pl-d-head'), meta = mk('div', 'pl-d-meta');
  if(p.category) meta.appendChild(mk('span', 'pl-pill', p.category));
  if(truthy(p.featured)){ var f = mk('span', 'pl-pill is-gold'); f.appendChild(icon('star')); f.appendChild(mk('span', '', t('featured'))); meta.appendChild(f); }
  if(meta.children.length) head.appendChild(meta);
  head.appendChild(mk('h1', 'pl-d-name', p.name));
  var pos = savedPos();
  if(pos && hasCoords(p)){ var dd = mk('p', 'pl-d-sub'); dd.appendChild(icon('nav')); dd.appendChild(mk('span', '', t('away', { d: fmtDist(km(pos, llOf(p))) }))); head.appendChild(dd); }
  else if(p.address){ var sa = mk('p', 'pl-d-sub'); sa.appendChild(icon('pin')); sa.appendChild(mk('span', '', shortAddr(p.address))); head.appendChild(sa); }
  main.appendChild(head);
  var acts = mk('div', 'pl-d-actions');
  var tel = String(p.phone || '').replace(/[^\d+]/g, '');
  var web = webUrl(p.website);
  if(hasCoords(p)){
    var dir = mk('a', 'pl-btn'); dir.id = 'pl-directions'; dir.href = dirUrl(p); dir.target = '_blank'; dir.rel = 'noopener';
    dir.appendChild(icon('nav')); dir.appendChild(mk('span', '', t('directions'))); acts.appendChild(dir);
  }
  if(tel.length >= 5){ var c = mk('a', 'pl-btn2'); c.href = 'tel:' + tel; c.appendChild(icon('phone')); c.appendChild(mk('span', '', t('call'))); acts.appendChild(c); }
  if(web){ var w = mk('a', 'pl-btn2'); w.href = web; w.target = '_blank'; w.rel = 'noopener noreferrer'; w.appendChild(icon('link')); w.appendChild(mk('span', '', t('website'))); acts.appendChild(w); }
  if(acts.children.length) main.appendChild(acts);
  if(p.description){ var sec = mk('section', 'pl-d-sec'); sec.appendChild(mk('h2', '', t('about'))); sec.appendChild(mk('p', 'pl-d-desc', p.description)); main.appendChild(sec); }
  var info = mk('ul', 'pl-d-info');
  function row(ic, label, value){
    var li = mk('li'); li.appendChild(icon(ic));
    var d = mk('div'); d.appendChild(mk('span', 'pl-d-label', label));
    var v = mk('div', 'pl-d-val'); if(typeof value === 'string') v.textContent = value; else v.appendChild(value);
    d.appendChild(v); li.appendChild(d); info.appendChild(li);
  }
  if(p.address) row('pin', t('address'), String(p.address));
  if(p.hours) row('clock', t('hours'), String(p.hours));
  if(tel.length >= 5){ var pa = mk('a', '', p.phone); pa.href = 'tel:' + tel; row('phone', t('phone'), pa); }
  if(web){ var wa = mk('a', '', webLabel(web)); wa.href = web; wa.target = '_blank'; wa.rel = 'noopener noreferrer'; row('link', t('website'), wa); }
  if(info.children.length){ var s2 = mk('section', 'pl-d-sec'); s2.setAttribute('aria-label', t('address')); s2.appendChild(info); side.appendChild(s2); }
  var mapEl = null;
  if(hasCoords(p)){
    var s3 = mk('section', 'pl-d-sec'); s3.appendChild(mk('h2', '', t('location')));
    mapEl = mk('div', 'pl-d-map'); mapEl.setAttribute('role', 'region'); mapEl.setAttribute('aria-label', t('location'));
    s3.appendChild(mapEl); side.appendChild(s3);
  }
  wrap.appendChild(main); wrap.appendChild(side); box.appendChild(wrap);
  if(mapEl) drawMini(mapEl, p);
}
function notFound(text){
  var box = q('#pl-detail'); box.textContent = '';
  var w = mk('div', 'pl-empty'); w.appendChild(mk('p', '', text));
  var a = mk('a', 'pl-btn-outline', t('back')); a.href = q('#pl-back').getAttribute('href'); w.appendChild(a);
  box.appendChild(w);
}
ready(function(){
  if(!root || root.__plReady) return;
  root.__plReady = true;
  setupHeader(null);
  var back = q('#pl-back');
  back.addEventListener('click', function(e){
    try {
      var to = new URL(back.href, location.href);
      if(document.referrer && new URL(document.referrer).pathname === to.pathname && history.length > 1){ e.preventDefault(); history.back(); }
    } catch(x){}
  });
  var failed = false;
  langHooks.push(function(){ if(place) render(place); else if(failed) notFound(t('notFound')); });
  applyLang();
  var id = '';
  try { id = new URLSearchParams(location.search).get('id') || ''; } catch(e){}
  if(!/^[\w-]{1,64}$/.test(id)){ failed = true; notFound(t('notFound')); return; }
  run('place', { id: id }).then(function(d){
    var p = rowsOf(d)[0];
    if(!p){ failed = true; notFound(t('notFound')); return; }
    place = p; render(p);
  }).catch(function(){ notFound(t('loadError')); });
});
`;

/** "My venues": a signed-in visitor's own places and the form to add or change one. */
const MINE_JS = String.raw`
ready(function(){
  if(!root || root.__plReady) return;
  root.__plReady = true;
  var form = q('#pl-form'), msg = q('#pl-form-msg'), list = q('#pl-mylist'), catSel = q('#pl-f-category');
  var fileIn = q('#pl-f-photos'), preview = q('#pl-f-preview'), current = q('#pl-f-current'), currentWrap = q('#pl-f-current-wrap');
  var submitBtn = q('#pl-f-submit'), cancelBtn = q('#pl-f-cancel'), heading = q('#pl-form-h');
  var latIn = q('#pl-f-lat'), lngIn = q('#pl-f-lng');
  var mine = [], cats = [], editing = null, busy = false, chosen = [];
  var picker = makePicker(q('#pl-pick'), latIn, lngIn);
  function val(id){ var e = q('#pl-f-' + id); return e ? String(e.value || '').trim() : ''; }
  function setVal(id, v){ var e = q('#pl-f-' + id); if(e) e.value = v == null ? '' : String(v); }
  function statusOf(r){ var s = String(r.status || 'pending').toLowerCase(); return s === 'approved' || s === 'rejected' ? s : 'pending'; }
  function syncTexts(){
    heading.textContent = editing ? t('editing') : t('add');
    submitBtn.textContent = editing ? t('saveEdit') : t('send');
    cancelBtn.hidden = !editing;
  }
  function fillCats(){
    var keep = catSel.value;
    catSel.textContent = '';
    var first = mk('option', '', t('chooseCategory')); first.value = ''; catSel.appendChild(first);
    var names = [];
    cats.forEach(function(c){ var n = String(c.name || '').trim(); if(n && names.indexOf(n) < 0) names.push(n); });
    if(editing && editing.category && names.indexOf(String(editing.category).trim()) < 0) names.push(String(editing.category).trim());
    names.forEach(function(n){ var o = mk('option', '', n); o.value = n; catSel.appendChild(o); });
    catSel.value = keep;
  }
  function showPhotos(el, urls){
    el.textContent = '';
    urls.forEach(function(u){ var im = mk('img'); im.src = u; im.alt = ''; el.appendChild(im); });
  }
  function renderMine(){
    list.textContent = '';
    if(!mine.length){ list.appendChild(mk('li', 'pl-empty pl-empty-sm', t('noneYet'))); return; }
    mine.forEach(function(r){
      var li = mk('li', 'pl-mycard');
      var src = thumbOf(r.image_url);
      if(src){ var im = mk('img'); im.src = src; im.alt = ''; li.appendChild(im); }
      else { var ph = mk('div', 'pl-mycard-ph'); ph.appendChild(icon('image')); li.appendChild(ph); }
      var body = mk('div', 'pl-mycard-body');
      body.appendChild(mk('h3', 'pl-mycard-name', r.name));
      var st = statusOf(r);
      body.appendChild(mk('span', 'pl-status is-' + st, t(st)));
      var sub = [String(r.category || '').trim(), shortAddr(r.address)].filter(Boolean).join(' · ');
      if(sub) body.appendChild(mk('p', 'pl-mycard-sub', sub));
      var acts = mk('div', 'pl-mycard-actions');
      if(st === 'approved'){ var v = mk('a', 'pl-small-btn', t('seeDetails')); v.href = detailsHref(r.id); acts.appendChild(v); }
      var e = mk('button', 'pl-small-btn'); e.type = 'button'; e.appendChild(icon('edit')); e.appendChild(mk('span', '', t('edit')));
      e.setAttribute('aria-label', t('edit') + ': ' + String(r.name || ''));
      e.addEventListener('click', function(){ startEdit(r); });
      var d = mk('button', 'pl-small-btn is-danger', t('remove')); d.type = 'button';
      d.setAttribute('aria-label', t('remove') + ': ' + String(r.name || ''));
      d.addEventListener('click', function(){
        if(d.getAttribute('data-armed') !== '1'){
          d.setAttribute('data-armed', '1'); d.textContent = t('confirmRemove'); d.removeAttribute('aria-label');
          setTimeout(function(){ if(d.isConnected && d.getAttribute('data-armed') === '1'){ d.removeAttribute('data-armed'); d.textContent = t('remove'); } }, 5000);
          return;
        }
        d.disabled = true;
        run('delete-mine', { id: r.id }).then(function(){
          say(t('removed'), 'success');
          if(editing && String(editing.id) === String(r.id)) resetForm();
          return loadMine();
        }).catch(function(){ d.disabled = false; say(t('failed'), 'error'); });
      });
      acts.appendChild(e); acts.appendChild(d);
      body.appendChild(acts);
      li.appendChild(body);
      list.appendChild(li);
    });
  }
  function loadMine(){
    return run('my-places').then(function(d){ mine = rowsOf(d); renderMine(); }).catch(function(err){
      list.textContent = '';
      list.appendChild(mk('li', 'pl-empty pl-empty-sm', err && err.status === 401 ? t('signedOut') : t('loadError')));
    });
  }
  function resetForm(){
    editing = null; chosen = [];
    form.reset(); picker.clear();
    preview.textContent = ''; current.textContent = ''; currentWrap.hidden = true;
    fillCats(); syncTexts();
  }
  function startEdit(r){
    resetForm();
    editing = r;
    setVal('name', r.name); setVal('description', r.description); setVal('address', r.address);
    setVal('phone', r.phone); setVal('website', r.website); setVal('hours', r.hours);
    fillCats(); catSel.value = String(r.category || '').trim();
    if(hasCoords(r)) picker.set(num(r.lat), num(r.lng), true);
    var pics = photosOf(r);
    currentWrap.hidden = !pics.length;
    showPhotos(current, pics.map(thumbOf));
    syncTexts();
    paintMsg(msg, '');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    q('#pl-f-name').focus({ preventScroll: true });
  }
  fileIn.addEventListener('change', function(){
    var c = checkFiles(fileIn.files, 4);
    preview.textContent = ''; chosen = [];
    if(c.error){ paintMsg(msg, c.error, 'error'); fileIn.value = ''; return; }
    paintMsg(msg, '');
    chosen = c.files;
    chosen.forEach(function(f){ var im = mk('img'); im.src = URL.createObjectURL(f); im.alt = ''; preview.appendChild(im); });
  });
  q('#pl-f-locate').addEventListener('click', function(){
    var b = q('#pl-f-locate'); b.classList.add('is-busy'); paintMsg(msg, t('locating'), 'pending');
    locate().then(function(pos){ picker.set(pos.lat, pos.lng, true); paintMsg(msg, ''); })
      .catch(function(err){ paintMsg(msg, err && err.message ? err.message : t('locError'), 'error'); })
      .then(function(){ b.classList.remove('is-busy'); });
  });
  cancelBtn.addEventListener('click', function(){ resetForm(); paintMsg(msg, ''); });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(busy) return;
    if(!form.reportValidity()) return;
    var lat = parseFloat(latIn.value), lng = parseFloat(lngIn.value);
    if(!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180){ paintMsg(msg, t('needLoc'), 'error'); q('#pl-f-locate').focus(); return; }
    busy = true; submitBtn.disabled = true;
    var was = editing;
    var up = chosen.length ? (paintMsg(msg, t('uploading'), 'pending'), uploadPhotos(chosen)) : Promise.resolve(null);
    up.then(function(urls){
      var body = { name: val('name'), category: val('category'), description: val('description'), address: val('address'), lat: String(lat), lng: String(lng), phone: val('phone'), website: webUrl(val('website')), hours: val('hours') };
      if(urls && urls.length){ body.image_url = urls[0]; body.gallery = urls.slice(1).join('\n'); }
      else if(was){ body.image_url = was.image_url || ''; body.gallery = was.gallery || ''; }
      else { body.image_url = ''; body.gallery = ''; }
      if(was) body.id = was.id;
      paintMsg(msg, t('sending'), 'pending');
      return run(was ? 'update-mine' : 'submit', body);
    }).then(function(){
      resetForm();
      paintMsg(msg, was ? t('updated') : t('sent'), 'success');
      return loadMine();
    }).catch(function(err){
      paintMsg(msg, err && err.upload ? t('uploadFailed') : err && err.status === 401 ? t('signedOut') : t('failed'), 'error');
    }).then(function(){ busy = false; submitBtn.disabled = false; });
  });
  setupHeader(function(){ return loadMine(); });
  langHooks.push(function(){ fillCats(); renderMine(); syncTexts(); });
  applyLang();
  run('categories').then(function(d){ cats = rowsOf(d); fillCats(); }).catch(function(){});
  run('feed').then(function(d){ var c = centroid(rowsOf(d)); var you = savedPos(); var at = you || c; if(at) picker.center(at.lat, at.lng, you ? 15 : 13); }).catch(function(){});
  loadMine();
});
`;

/** The owner's page: review submissions, add, change and remove places and categories. */
const ADMIN_JS = String.raw`
ready(function(){
  if(!root || root.__plReady) return;
  root.__plReady = true;
  lang = 'en';
  var all = [], cats = [], tab = 'review', editing = null, busy = false, query = '';
  var form = q('#pl-a-form'), editor = q('#pl-a-editor'), msg = q('#pl-a-msg'), formMsg = q('#pl-a-form-msg');
  var latIn = q('#pl-a-lat'), lngIn = q('#pl-a-lng');
  var picker = makePicker(q('#pl-a-pick'), latIn, lngIn);
  function statusOf(r){ var s = String(r.status || 'pending').toLowerCase(); return s === 'approved' || s === 'rejected' ? s : 'pending'; }
  var STATUS = { pending: 'Waiting for review', approved: 'Live', rejected: 'Not accepted' };
  function val(id){ var e = q('#pl-a-' + id); return e ? String(e.value || '').trim() : ''; }
  function setVal(id, v){ var e = q('#pl-a-' + id); if(e) e.value = v == null ? '' : String(v); }
  function load(){
    return Promise.all([run('admin-list'), run('categories').catch(function(){ return []; })]).then(function(r){
      all = rowsOf(r[0]); cats = rowsOf(r[1]); render();
    }).catch(function(e){
      paintMsg(msg, e && (e.status === 401 || e.status === 403) ? 'Please sign in as an admin to manage places.' : "The places couldn't be loaded. Please try again.", 'error');
    });
  }
  function setTab(v){
    tab = v;
    qa('.pl-tab', root).forEach(function(b){ var on = b.getAttribute('data-view') === v; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    ['review', 'all', 'cats'].forEach(function(k){ q('#pl-a-' + k).hidden = k !== v; });
  }
  function act(label, cls, fn){ var b = mk('button', 'pl-small-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.addEventListener('click', function(){ fn(b); }); return b; }
  function armed(b, label, fn){
    if(b.getAttribute('data-armed') !== '1'){
      b.setAttribute('data-armed', '1'); b.textContent = 'Tap again to delete';
      setTimeout(function(){ if(b.isConnected && b.getAttribute('data-armed') === '1'){ b.removeAttribute('data-armed'); b.textContent = label; } }, 5000);
      return;
    }
    b.disabled = true; fn();
  }
  function setFields(p, values, done){
    return run('admin-set', Object.assign({ id: p.id }, values)).then(function(){ say(done || 'Saved.', 'success'); return load(); }).catch(function(){ say("That didn't save. Please try again.", 'error'); });
  }
  function rowFor(p){
    var li = mk('li', 'pl-arow');
    var src = thumbOf(p.image_url);
    if(src){ var im = mk('img'); im.src = src; im.alt = ''; im.loading = 'lazy'; li.appendChild(im); }
    else { var ph = mk('div', 'pl-mycard-ph'); ph.appendChild(icon('image')); li.appendChild(ph); }
    var body = mk('div', 'pl-mycard-body');
    body.appendChild(mk('h3', 'pl-mycard-name', p.name || '(no name)'));
    var st = statusOf(p);
    var tags = mk('div', 'pl-mycard-actions');
    tags.appendChild(mk('span', 'pl-status is-' + st, STATUS[st]));
    if(truthy(p.featured)){ var f = mk('span', 'pl-pill is-gold'); f.appendChild(icon('star')); f.appendChild(mk('span', '', 'Featured')); tags.appendChild(f); }
    body.appendChild(tags);
    var sub = [String(p.category || '').trim(), String(p.address || '').trim()].filter(Boolean).join(' · ');
    if(sub) body.appendChild(mk('p', 'pl-mycard-sub', sub));
    if(p.submitted_by || p.created_by){
      var when = p.created_at ? new Date(p.created_at) : null;
      body.appendChild(mk('p', 'pl-mycard-sub', 'Sent by ' + String(p.submitted_by || 'a signed-in visitor') + (when && !isNaN(when.getTime()) ? ' on ' + when.toLocaleDateString() : '')));
    }
    if(p.description && st === 'pending') body.appendChild(mk('p', 'pl-mycard-sub', String(p.description).slice(0, 220)));
    var acts = mk('div', 'pl-mycard-actions');
    if(st !== 'approved') acts.appendChild(act('Approve', 'is-primary', function(){ setFields(p, { status: 'approved' }, 'Approved. It now shows in the guide.'); }));
    if(st !== 'rejected') acts.appendChild(act(st === 'approved' ? 'Take down' : 'Reject', '', function(){ setFields(p, { status: 'rejected' }, st === 'approved' ? 'Taken down.' : 'Rejected.'); }));
    acts.appendChild(act(truthy(p.featured) ? 'Unfeature' : 'Feature', '', function(){ setFields(p, { featured: truthy(p.featured) ? 'false' : 'true' }); }));
    acts.appendChild(act('Edit', '', function(){ openEditor(p); }));
    if(st === 'approved'){ var v = mk('a', 'pl-small-btn', 'View'); v.href = detailsHref(p.id); acts.appendChild(v); }
    acts.appendChild(act('Delete', 'is-danger', function(b){ armed(b, 'Delete', function(){ run('admin-delete', { id: p.id }).then(function(){ say('Deleted.', 'success'); return load(); }).catch(function(){ b.disabled = false; say("That didn't delete. Please try again.", 'error'); }); }); }));
    body.appendChild(acts);
    li.appendChild(body);
    return li;
  }
  function render(){
    var pending = all.filter(function(p){ return statusOf(p) === 'pending'; });
    var n = q('#pl-a-count'); n.textContent = String(pending.length); n.hidden = !pending.length;
    var ul = q('#pl-a-pending'); ul.textContent = '';
    if(!pending.length) ul.appendChild(mk('li', 'pl-empty pl-empty-sm', 'Nothing is waiting for review.'));
    pending.forEach(function(p){ ul.appendChild(rowFor(p)); });
    var ql = query.toLowerCase();
    var shown = all.filter(function(p){ return !ql || [p.name, p.category, p.address].join(' ').toLowerCase().indexOf(ql) >= 0; });
    var ul2 = q('#pl-a-list'); ul2.textContent = '';
    if(!shown.length) ul2.appendChild(mk('li', 'pl-empty pl-empty-sm', all.length ? 'No places match.' : 'No places yet. Add the first one.'));
    shown.forEach(function(p){ ul2.appendChild(rowFor(p)); });
    var dl = q('#pl-a-catnames'); dl.textContent = '';
    var names = [];
    cats.forEach(function(c){ var nm = String(c.name || '').trim(); if(nm && names.indexOf(nm) < 0) names.push(nm); });
    all.forEach(function(p){ var nm = String(p.category || '').trim(); if(nm && names.indexOf(nm) < 0) names.push(nm); });
    names.forEach(function(nm){ var o = mk('option'); o.value = nm; dl.appendChild(o); });
    var cl = q('#pl-a-catlist'); cl.textContent = '';
    if(!cats.length) cl.appendChild(mk('li', 'pl-empty pl-empty-sm', 'No categories yet.'));
    cats.forEach(function(c){
      var li = mk('li', 'pl-arow');
      var src = thumbOf(c.image_url);
      if(src){ var im = mk('img'); im.src = src; im.alt = ''; li.appendChild(im); }
      else { var ph = mk('div', 'pl-mycard-ph'); ph.appendChild(icon('grid')); li.appendChild(ph); }
      var body = mk('div', 'pl-mycard-body');
      body.appendChild(mk('h3', 'pl-mycard-name', c.name));
      var used = all.filter(function(p){ return String(p.category || '').trim() === String(c.name || '').trim(); }).length;
      body.appendChild(mk('p', 'pl-mycard-sub', used === 1 ? '1 place' : used + ' places'));
      var acts = mk('div', 'pl-mycard-actions');
      acts.appendChild(act('Delete', 'is-danger', function(b){ armed(b, 'Delete', function(){ run('delete-category', { id: c.id }).then(function(){ say('Category deleted. Its places are kept.', 'success'); return load(); }).catch(function(){ b.disabled = false; say("That didn't delete. Please try again.", 'error'); }); }); }));
      body.appendChild(acts); li.appendChild(body); cl.appendChild(li);
    });
  }
  function openEditor(p){
    editing = p || null;
    form.reset(); picker.clear(); paintMsg(formMsg, '');
    q('#pl-a-editor-h').textContent = p ? 'Edit ' + String(p.name || 'place') : 'Add a place';
    q('#pl-a-save').textContent = p ? 'Save changes' : 'Add place';
    if(p){
      ['name', 'category', 'description', 'address', 'phone', 'website', 'hours', 'image_url', 'gallery', 'sort_order'].forEach(function(k){ setVal(k, p[k]); });
      q('#pl-a-featured').checked = truthy(p.featured);
      setVal('status', statusOf(p));
    } else setVal('status', 'approved');
    editor.hidden = false;
    picker.refresh();
    setTimeout(function(){
      if(p && hasCoords(p)) picker.set(num(p.lat), num(p.lng), true);
      else { var c = centroid(all); if(c) picker.center(c.lat, c.lng, 13); }
    }, 80);
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    q('#pl-a-name').focus({ preventScroll: true });
  }
  function closeEditor(){ editor.hidden = true; editing = null; }
  function uploadInto(input, onUrls){
    var c = checkFiles(input.files, 4);
    if(c.error){ paintMsg(formMsg, c.error, 'error'); input.value = ''; return; }
    if(!c.files.length) return;
    paintMsg(formMsg, 'Uploading photos…', 'pending');
    uploadPhotos(c.files).then(function(urls){ onUrls(urls); paintMsg(formMsg, 'Photos uploaded.', 'success'); })
      .catch(function(){ paintMsg(formMsg, "The photos couldn't be uploaded. Please try smaller pictures.", 'error'); })
      .then(function(){ input.value = ''; });
  }
  q('#pl-a-upload').addEventListener('change', function(){ uploadInto(q('#pl-a-upload'), function(urls){ setVal('image_url', urls[0]); var rest = urls.slice(1); if(rest.length){ var g = val('gallery'); setVal('gallery', (g ? g + '\n' : '') + rest.join('\n')); } }); });
  q('#pl-a-upload-more').addEventListener('change', function(){ uploadInto(q('#pl-a-upload-more'), function(urls){ var g = val('gallery'); setVal('gallery', (g ? g + '\n' : '') + urls.join('\n')); }); });
  q('#pl-a-locate').addEventListener('click', function(){ locate().then(function(pos){ picker.set(pos.lat, pos.lng, true); }).catch(function(err){ paintMsg(formMsg, err.message, 'error'); }); });
  q('#pl-a-add').addEventListener('click', function(){ openEditor(null); });
  q('#pl-a-cancel').addEventListener('click', function(){ closeEditor(); });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(busy || !form.reportValidity()) return;
    var lat = parseFloat(latIn.value), lng = parseFloat(lngIn.value);
    if(!isFinite(lat) || !isFinite(lng)){ paintMsg(formMsg, 'Please set the location: tap the map or type the latitude and longitude.', 'error'); return; }
    var body = { name: val('name'), category: val('category'), description: val('description'), address: val('address'), lat: String(lat), lng: String(lng), phone: val('phone'), website: webUrl(val('website')), hours: val('hours'), image_url: safeUrl(val('image_url')), gallery: val('gallery').split(/\r?\n/).map(safeUrl).filter(Boolean).join('\n'), featured: q('#pl-a-featured').checked ? 'true' : 'false', sort_order: String(parseInt(val('sort_order'), 10) || 0), status: val('status') || 'approved' };
    if(editing) body.id = editing.id;
    busy = true; paintMsg(formMsg, 'Saving…', 'pending');
    run(editing ? 'admin-update' : 'add', body).then(function(){
      say(editing ? 'Changes saved.' : 'Place added.', 'success');
      closeEditor(); return load();
    }).catch(function(){ paintMsg(formMsg, "That didn't save. Please check the details and try again.", 'error'); })
      .then(function(){ busy = false; });
  });
  var catForm = q('#pl-a-catform');
  catForm.addEventListener('submit', function(e){
    e.preventDefault();
    if(!catForm.reportValidity()) return;
    var name = String(q('#pl-a-catname').value || '').trim();
    run('add-category', { name: name, image_url: safeUrl(q('#pl-a-catimg').value), sort_order: String(cats.length + 1) }).then(function(){
      catForm.reset(); say('Category added.', 'success'); return load();
    }).catch(function(){ say("That didn't save. Please try again.", 'error'); });
  });
  var search = q('#pl-a-q');
  search.addEventListener('input', function(){ query = search.value; render(); });
  qa('.pl-tab', root).forEach(function(b){ b.addEventListener('click', function(){ setTab(b.getAttribute('data-view')); }); });
  setupHeader(function(){ return load(); });
  setTab('review');
  load().then(function(){ if(!all.some(function(p){ return statusOf(p) === 'pending'; })) setTab('all'); });
});
`;

const DATA_JS = `var I18N = ${JSON.stringify(PLACE_I18N)};
var PRESETS = ${JSON.stringify(PLACE_PRESET_TEXT)};
var ICONS = ${JSON.stringify(PLACE_ICONS)};
`;

function script(body: string): string {
  return `<script>(function(){\n${DATA_JS}${COMMON_JS}${body}})();</script>`;
}

export const GUIDE_SCRIPT = script(GUIDE_JS);
export const DETAILS_SCRIPT = script(DETAILS_JS);
export const MINE_SCRIPT = script(MINE_JS);
export const ADMIN_SCRIPT = script(ADMIN_JS);
