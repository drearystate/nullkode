/**
 * Corvane Group — Corporate flagship (original-corporate)
 *
 * Art direction
 * - Mood: engineered, assured, accountable. The site of a listed engineering and
 *   infrastructure group that designs, builds and then runs what it builds.
 * - Type: Schibsted Grotesk for display (heavy, tight, editorial-industrial) with
 *   Public Sans for text (neutral, very legible at small sizes).
 * - Palette: harbour navy ink #0b1f33 on cool paper #f4f6f8, a single signal orange
 *   (#c2410c, the colour of port cranes) for actions and data, steel blue as support.
 * - Layout grammar: hard 2px corners, left-aligned 12-column rhythm, hairline rules,
 *   numbered section labels ("01 — What we do"), spec-sheet rows instead of cards,
 *   full-width navy bands for figures and results.
 * - Signature: the key-figures ribbon under the hero, the four-row capability spec
 *   sheet, the results band with outcome numerals, and the delivery-phase Gantt on
 *   the Services page.
 * - Pages: Home, Services, Company (history timeline, leadership, values, offices).
 * - Modules: contact-form (Contact) and jobs (Careers).
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";


/* ── Shared CSS ─────────────────────────────────────────────────────── */
const BASE_CSS = `
.cv-page{font-size:1.02rem}
.cv-wrap{width:min(1200px,100% - 40px);margin-inline:auto}
.cv-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.cv-label{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0 0 20px;font-size:.78rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text-muted)}
.cv-label::before{content:"";width:28px;height:2px;background:var(--nk-primary);flex:none}
.cv-label b{color:var(--nk-text);font-weight:700}
.cv-results .cv-label b,.cv-values .cv-label b{color:var(--nk-surface)}
.cv-sec{padding:clamp(64px,9vw,120px) 0}
.cv-sec-head{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:24px 64px;align-items:end;margin-bottom:clamp(36px,5vw,64px)}
.cv-sec-head h2{margin:0;font-size:clamp(2rem,4vw,3.25rem);line-height:1.04;letter-spacing:-.035em;font-weight:800;text-wrap:balance}
.cv-sec-head>p{margin:0;color:var(--nk-text-muted);font-size:1.08rem;line-height:1.65;max-width:52ch}
.cv-sec-head .cv-label{grid-column:1/-1;margin:0}
@media (max-width:860px){.cv-sec-head{grid-template-columns:minmax(0,1fr)}}
.cv-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;padding:0 24px;border-radius:var(--nk-radius-sm);font-weight:600;font-size:.98rem;text-decoration:none;border:1px solid transparent;transition:background-color .2s,color .2s,border-color .2s}
.cv-btn:hover{text-decoration:none}
.cv-btn-solid{background:var(--nk-primary);color:var(--nk-surface)}
.cv-btn-solid:hover{background:var(--nk-primary-2);color:var(--nk-surface)}
.cv-btn-ink{background:var(--nk-text);color:var(--nk-surface)}
.cv-btn-ink:hover{background:color-mix(in srgb,var(--nk-text) 85%,var(--nk-accent));color:var(--nk-surface)}
.cv-btn-line{color:var(--nk-text);border-color:color-mix(in srgb,var(--nk-text) 30%,transparent)}
.cv-btn-line:hover{color:var(--nk-text);border-color:var(--nk-text)}
.cv-link{display:inline-flex;align-items:center;gap:8px;font-weight:600;color:var(--nk-text);text-decoration:none;border-bottom:2px solid var(--nk-primary);padding-bottom:3px}
.cv-link:hover{color:var(--nk-primary-2);text-decoration:none}
.cv-band-white{background:var(--nk-surface)}
.cv-band-paper{background:var(--nk-bg)}
.cv-page a:focus-visible,.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
`;

const NAV_CSS = `
.nk-nav{padding-block:0!important;min-height:76px;background:var(--nk-surface)!important;border-bottom:1px solid var(--nk-border)!important;position:relative;z-index:20}
.nk-nav>.container{max-width:1200px;min-height:76px}
.nk-nav .navbar-brand{display:inline-flex;align-items:center;gap:12px;font-weight:800!important;font-size:1.05rem;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text)!important}
.nk-nav .navbar-brand::before{content:"";width:26px;height:26px;flex:none;background:linear-gradient(135deg,var(--nk-text) 0 62%,var(--nk-primary) 62% 100%)}
.nk-nav .nav-link{color:var(--nk-text)!important;font-size:.8rem;font-weight:600!important;letter-spacing:.1em;text-transform:uppercase;padding:28px 14px!important}
.nk-nav .nav-link:hover{color:var(--nk-primary-2)!important;text-decoration:none}
.nk-nav .nav-link.active{box-shadow:inset 0 -3px 0 var(--nk-primary)}
.nk-nav .navbar-toggler{color:var(--nk-text)!important;padding:0!important;width:46px;height:46px;border:1px solid var(--nk-border)!important;font-size:0;line-height:0;background-image:linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor);background-size:20px 2px;background-position:center 15px,center 21px,center 27px;background-repeat:no-repeat}
.nk-nav .navbar-toggler>*{display:none!important}
.nk-nav .dropdown-menu{border-radius:0;padding:8px 0;margin-top:0;background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;border-top:3px solid var(--nk-primary)!important;box-shadow:0 20px 40px -20px color-mix(in srgb,var(--nk-text) 35%,transparent)}
.nk-nav .dropdown-item{padding:10px 20px;color:var(--nk-text)!important;font-size:.92rem;font-weight:500}
.nk-nav .dropdown-item:hover,.nk-nav .dropdown-item:focus{background:var(--nk-surface-2)}
@media (min-width:992px){.nk-nav .dropdown{position:relative}.nk-nav .dropdown-menu-end{right:0;left:auto}}
@media (max-width:991.98px){.nk-nav .navbar-collapse{margin:0 -12px;padding:8px 12px 16px;border-top:1px solid var(--nk-border)}.nk-nav .nav-link{padding:14px 4px!important;border-bottom:1px solid var(--nk-border)}.nk-nav .nav-link.active{box-shadow:inset 3px 0 0 var(--nk-primary);padding-left:14px!important}.nk-nav .dropdown-menu{border-top-width:1px!important;box-shadow:none}}
`;

const CTA_FOOTER_CSS = `
.cv-cta{padding-block:0;background:var(--nk-text);color:var(--nk-surface);position:relative;overflow:hidden}
.cv-cta::before{content:"";position:absolute;left:0;top:0;bottom:0;width:10px;background:var(--nk-primary)}
.cv-cta-grid{display:grid;grid-template-columns:minmax(0,1.3fr) auto;gap:32px 64px;align-items:center;padding:clamp(56px,8vw,96px) 0}
.cv-cta h2{margin:0;color:var(--nk-surface);font-size:clamp(2rem,4vw,3.1rem);line-height:1.05;letter-spacing:-.035em;font-weight:800;max-width:20ch;text-wrap:balance}
.cv-cta p{margin:16px 0 0;color:color-mix(in srgb,var(--nk-surface) 72%,var(--nk-text));font-size:1.08rem;max-width:56ch;line-height:1.6}
.cv-cta-actions{display:flex;flex-wrap:wrap;gap:12px}
.cv-cta .cv-btn-line{color:var(--nk-surface);border-color:color-mix(in srgb,var(--nk-surface) 40%,transparent)}
.cv-cta .cv-btn-line:hover{border-color:var(--nk-surface);color:var(--nk-surface)}
.cv-cta a:focus-visible{outline-color:var(--nk-surface)}
@media (max-width:860px){.cv-cta-grid{grid-template-columns:minmax(0,1fr)}}
.cv-footer{background:var(--nk-surface);border-top:1px solid var(--nk-border);padding:64px 0 28px;font-size:.95rem}
.cv-foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.3fr;gap:40px}
.cv-foot-brand{display:flex;align-items:center;gap:12px;margin:0 0 14px;font-family:var(--nk-font-display);font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text)}
.cv-foot-brand::before{content:"";width:22px;height:22px;background:linear-gradient(135deg,var(--nk-text) 0 62%,var(--nk-primary) 62% 100%)}
.cv-foot-grid address{font-style:normal;color:var(--nk-text-muted);line-height:1.7;margin:0}
.cv-foot-h{margin:4px 0 16px;font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text)}
.cv-foot-grid ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.cv-foot-grid li{color:var(--nk-text-muted)}
.cv-foot-grid a{color:var(--nk-text-muted);text-decoration:none}
.cv-foot-grid a:hover{color:var(--nk-primary-2);text-decoration:underline}
.cv-foot-base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 24px;margin-top:56px;padding-top:24px;border-top:1px solid var(--nk-border);color:var(--nk-text-muted);font-size:.85rem}
.cv-foot-base p{margin:0}
@media (max-width:900px){.cv-foot-grid{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.cv-foot-grid{grid-template-columns:minmax(0,1fr)}}
`;

/* Inner-page header shared by Services and Company */
const PAGE_HEAD_CSS = `
.cv-phead{background:var(--nk-surface);border-bottom:1px solid var(--nk-border)}
.cv-phead-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:24px 64px;align-items:end;padding:clamp(56px,8vw,104px) 0 clamp(40px,6vw,72px)}
.cv-phead h1{margin:0;font-size:clamp(2.5rem,5.6vw,4.4rem);line-height:1;letter-spacing:-.045em;font-weight:800;text-wrap:balance}
.cv-phead-grid>p{margin:0;color:var(--nk-text-muted);font-size:1.12rem;line-height:1.65}
.cv-phead .cv-label{grid-column:1/-1;margin:0}
.cv-crumbs{list-style:none;display:flex;gap:10px;margin:0;padding:0;font-size:.85rem;color:var(--nk-text-muted)}
.cv-crumbs li+li::before{content:"/";margin-right:10px;color:var(--nk-border)}
.cv-crumbs a{color:var(--nk-text-muted)}
@media (max-width:860px){.cv-phead-grid{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Home ───────────────────────────────────────────────────────────── */
const HOME_CSS = `
.cv-hero{background:var(--nk-bg);position:relative}
.cv-hero-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:48px 72px;align-items:center;padding:clamp(48px,7vw,96px) 0 clamp(56px,7vw,96px)}
.cv-hero h1{margin:0;font-size:clamp(2.6rem,5.4vw,4.6rem);line-height:.98;letter-spacing:-.05em;font-weight:800;text-wrap:balance}
.cv-hero h1 em{font-style:normal;color:var(--nk-primary)}
.cv-lede{margin:28px 0 0;font-size:clamp(1.05rem,1.5vw,1.2rem);line-height:1.65;color:var(--nk-text-muted);max-width:56ch}
.cv-actions{display:flex;flex-wrap:wrap;align-items:center;gap:14px 28px;margin-top:40px}
.cv-hero-media{position:relative;margin:0;padding:0 0 28px 28px}
.cv-hero-media::before{content:"";position:absolute;left:0;bottom:0;width:62%;height:70%;background-image:linear-gradient(90deg,color-mix(in srgb,var(--nk-text) 14%,transparent) 1px,transparent 1px),linear-gradient(color-mix(in srgb,var(--nk-text) 14%,transparent) 1px,transparent 1px);background-size:22px 22px}
.cv-hero-media img{position:relative;display:block;width:100%;height:auto;aspect-ratio:7/8;object-fit:cover;box-shadow:0 30px 60px -30px color-mix(in srgb,var(--nk-text) 60%,transparent)}
.cv-hero-card{position:absolute;left:0;bottom:0;max-width:300px;padding:20px 22px;background:var(--nk-text);color:color-mix(in srgb,var(--nk-surface) 78%,var(--nk-text));font-size:.9rem;line-height:1.5;border-left:4px solid var(--nk-primary)}
.cv-hero-card span{display:block;margin-bottom:6px;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--nk-primary) 55%,var(--nk-surface))}
.cv-hero-card strong{display:block;color:var(--nk-surface);font-size:1.05rem;margin-bottom:4px}
@media (max-width:900px){.cv-hero-grid{grid-template-columns:minmax(0,1fr)}.cv-hero-media{padding:0 0 22px 22px;max-width:560px}}
.cv-figures{background:var(--nk-text);color:var(--nk-surface)}
.cv-figures-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:0}
.cv-figures-grid div{display:flex;flex-direction:column-reverse;justify-content:flex-end;gap:8px;padding:34px 28px 30px;border-left:1px solid color-mix(in srgb,var(--nk-surface) 14%,transparent)}
.cv-figures-grid div:first-child{border-left:0;padding-left:0}
.cv-figures-grid dd{margin:0;font-family:var(--nk-font-display);font-size:clamp(2rem,3.4vw,2.9rem);font-weight:800;letter-spacing:-.04em;line-height:1;color:var(--nk-surface)}
.cv-figures-grid dd small{font-size:.5em;letter-spacing:0;margin-left:2px;color:color-mix(in srgb,var(--nk-primary) 55%,var(--nk-surface))}
.cv-figures-grid dt{font-size:.85rem;font-weight:500;color:color-mix(in srgb,var(--nk-surface) 70%,var(--nk-text))}
.cv-figures-note{margin:0;padding:0 0 18px;font-size:.78rem;color:color-mix(in srgb,var(--nk-surface) 74%,var(--nk-text))}
@media (max-width:860px){.cv-figures-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cv-figures-grid div:nth-child(3){border-left:0;padding-left:0}.cv-figures-grid div:nth-child(n+3){border-top:1px solid color-mix(in srgb,var(--nk-surface) 14%,transparent)}}
@media (max-width:420px){.cv-figures-grid div{padding:26px 16px 24px}}
.cv-caps{background:var(--nk-surface)}
.cv-cap-list{list-style:none;margin:0;padding:0;border-top:2px solid var(--nk-text)}
.cv-cap{display:grid;grid-template-columns:96px minmax(0,1fr) minmax(0,1.5fr) minmax(0,.8fr);gap:16px 40px;align-items:start;padding:34px 0;border-bottom:1px solid var(--nk-border);position:relative;transition:background-color .2s}
.cv-cap::before{content:"";position:absolute;left:0;top:-1px;height:3px;width:0;background:var(--nk-primary);transition:width .35s}
.cv-cap:hover::before{width:96px}
.cv-cap-no{font-family:var(--nk-font-display);font-weight:800;font-size:2.4rem;line-height:1;letter-spacing:-.04em;color:transparent;-webkit-text-stroke:1.5px var(--nk-text)}
.cv-cap h3{margin:4px 0 0;font-size:1.45rem;letter-spacing:-.025em;font-weight:700}
.cv-cap p{margin:4px 0 0;color:var(--nk-text-muted);line-height:1.65}
.cv-cap .cv-cap-fact{margin:4px 0 0;color:var(--nk-text);font-size:.92rem;line-height:1.4}
.cv-cap-fact strong{display:block;font-family:var(--nk-font-display);font-size:1.9rem;font-weight:800;letter-spacing:-.03em;color:var(--nk-primary)}
@media (max-width:980px){.cv-cap{grid-template-columns:72px minmax(0,1fr)}.cv-cap p,.cv-cap .cv-cap-fact{grid-column:2}}
@media (max-width:520px){.cv-cap{grid-template-columns:minmax(0,1fr);gap:10px}.cv-cap p,.cv-cap .cv-cap-fact{grid-column:1}.cv-cap-no{font-size:1.9rem}}
.cv-sectors{background:var(--nk-bg)}
.cv-sector-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.cv-sector{display:flex;flex-direction:column;background:var(--nk-surface);border:1px solid var(--nk-border)}
.cv-sector-media{position:relative;margin:0}
.cv-sector-media img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}
.cv-sector-media figcaption{position:absolute;inset:auto 0 0 0;padding:64px 24px 22px;background:linear-gradient(transparent,color-mix(in srgb,var(--nk-text) 88%,transparent));color:var(--nk-surface)}
.cv-sector h3{margin:0;color:var(--nk-surface);font-size:1.5rem;font-weight:800;letter-spacing:-.03em}
.cv-sector-media p{margin:6px 0 0;color:color-mix(in srgb,var(--nk-surface) 82%,var(--nk-text));font-size:.95rem;line-height:1.5}
.cv-sector dl{display:grid;grid-template-columns:1fr 1fr;margin:0}
.cv-sector dl div{display:flex;flex-direction:column-reverse;justify-content:flex-end;padding:20px 24px;border-top:1px solid var(--nk-border)}
.cv-sector dl div+div{border-left:1px solid var(--nk-border)}
.cv-sector dd{margin:0;font-family:var(--nk-font-display);font-weight:800;font-size:1.55rem;letter-spacing:-.03em;color:var(--nk-text)}
.cv-sector dt{font-size:.82rem;font-weight:500;color:var(--nk-text-muted);line-height:1.35}
@media (max-width:980px){.cv-sector-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cv-sector:last-child{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.cv-sector:last-child .cv-sector-media img{height:100%}.cv-sector:last-child dl{align-content:end}}
@media (max-width:640px){.cv-sector-grid{grid-template-columns:minmax(0,1fr)}.cv-sector:last-child{display:flex}.cv-sector-media img{aspect-ratio:5/4}}
.cv-results{background:var(--nk-text);color:var(--nk-surface)}
.cv-results .cv-sec-head h2{color:var(--nk-surface)}
.cv-results .cv-sec-head>p{color:color-mix(in srgb,var(--nk-surface) 72%,var(--nk-text))}
.cv-results .cv-label{color:color-mix(in srgb,var(--nk-surface) 70%,var(--nk-text))}
.cv-result-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid color-mix(in srgb,var(--nk-surface) 20%,transparent)}
.cv-result{padding:36px 32px 8px 0}
.cv-result+.cv-result{padding-left:32px;border-left:1px solid color-mix(in srgb,var(--nk-surface) 14%,transparent)}
.cv-result-num{margin:0;font-family:var(--nk-font-display);font-size:clamp(2.6rem,4.6vw,4rem);font-weight:800;letter-spacing:-.05em;line-height:1;color:color-mix(in srgb,var(--nk-primary) 58%,var(--nk-surface))}
.cv-result h3{margin:18px 0 0;color:var(--nk-surface);font-size:1.15rem;font-weight:700;letter-spacing:-.01em}
.cv-result-where{margin:4px 0 0;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--nk-surface) 74%,var(--nk-text))}
.cv-result p:last-child{margin:14px 0 0;color:color-mix(in srgb,var(--nk-surface) 74%,var(--nk-text));line-height:1.6}
@media (max-width:900px){.cv-result-grid{grid-template-columns:minmax(0,1fr)}.cv-result,.cv-result+.cv-result{padding:30px 0;border-left:0}.cv-result+.cv-result{border-top:1px solid color-mix(in srgb,var(--nk-surface) 14%,transparent)}}
.cv-leaders{background:var(--nk-surface)}
.cv-leader-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px}
.cv-leader{margin:0}
.cv-leader img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;filter:saturate(.85)}
.cv-leader figcaption{padding-top:18px;border-top:3px solid var(--nk-text);margin-top:-3px;position:relative}
.cv-leader h3{margin:0;font-size:1.15rem;font-weight:700;letter-spacing:-.015em}
.cv-leader-role{display:block;margin-top:4px;color:var(--nk-primary-2);font-size:.85rem;font-weight:600}
.cv-leader p{margin:10px 0 0;color:var(--nk-text-muted);font-size:.92rem;line-height:1.55}
@media (max-width:980px){.cv-leader-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:460px){.cv-leader-grid{gap:20px}.cv-leader p{display:none}}
.cv-esg{background:var(--nk-bg)}
.cv-esg-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:40px 80px;align-items:start}
.cv-esg-copy h2{margin:0;font-size:clamp(2rem,3.6vw,2.9rem);line-height:1.05;letter-spacing:-.035em;font-weight:800}
.cv-esg-copy>p{margin:20px 0 28px;color:var(--nk-text-muted);line-height:1.65;font-size:1.05rem}
.cv-esg-copy>p.cv-meter-key{display:flex;align-items:center;gap:10px;margin:-8px 0 28px;font-size:.85rem;color:var(--nk-text-muted)}
.cv-key-bar{width:22px;height:8px;background:var(--nk-primary)}
.cv-key-tick{width:2px;height:16px;margin-left:12px;background:var(--nk-text)}
.cv-meters{list-style:none;margin:0;padding:0;display:grid;gap:30px}
.cv-meter-top{display:flex;justify-content:space-between;gap:16px;align-items:baseline;margin-bottom:12px}
.cv-meter-top h3{margin:0;font-size:1.02rem;font-weight:600;letter-spacing:-.01em;font-family:var(--nk-font)}
.cv-meter-top strong{font-family:var(--nk-font-display);font-size:1.6rem;font-weight:800;letter-spacing:-.03em;white-space:nowrap}
.cv-meter-bar{display:block;height:10px;background:var(--nk-surface-2);border:1px solid var(--nk-border);position:relative}
.cv-meter-bar span{display:block;height:100%;background:var(--nk-primary)}
.cv-meter-bar i{position:absolute;top:-6px;bottom:-6px;width:2px;background:var(--nk-text)}
.cv-meter p{margin:10px 0 0;color:var(--nk-text-muted);font-size:.88rem}
.cv-w46{width:46%}.cv-w58{width:58%}.cv-w36{width:36%}.cv-w81{width:81%}
.cv-t70{left:70%}.cv-t75{left:75%}.cv-t40{left:40%}.cv-t90{left:90%}
@media (max-width:900px){.cv-esg-grid{grid-template-columns:minmax(0,1fr)}}
.cv-news{background:var(--nk-surface);border-top:1px solid var(--nk-border)}
.cv-news-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:2px solid var(--nk-text)}
.cv-news-item{padding:28px 28px 8px 0}
.cv-news-item+.cv-news-item{padding-left:28px;border-left:1px solid var(--nk-border)}
.cv-news-meta{margin:0;display:flex;gap:12px;font-size:.8rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--nk-text-muted)}
.cv-news-meta span{color:var(--nk-primary-2)}
.cv-news-item h3{margin:14px 0 0;font-size:1.25rem;line-height:1.3;letter-spacing:-.02em;font-weight:700}
.cv-news-item p:last-child{margin:10px 0 0;color:var(--nk-text-muted);line-height:1.6;font-size:.95rem}
.cv-news-foot{margin:32px 0 0;color:var(--nk-text-muted)}
@media (max-width:900px){.cv-news-grid{grid-template-columns:minmax(0,1fr)}.cv-news-item,.cv-news-item+.cv-news-item{padding:24px 0;border-left:0}.cv-news-item+.cv-news-item{border-top:1px solid var(--nk-border)}}
`;

/* ── Services ───────────────────────────────────────────────────────── */
const SERVICES_CSS = `
.cv-jump{list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin:0;padding:22px 0}
.cv-jump a{display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border:1px solid var(--nk-border);background:var(--nk-surface);color:var(--nk-text);font-weight:600;font-size:.9rem;text-decoration:none}
.cv-jump a span{color:var(--nk-primary-2);font-family:var(--nk-font-display);font-weight:800}
.cv-jump a:hover{border-color:var(--nk-text);text-decoration:none}
.cv-svc{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:32px 80px;padding:clamp(48px,7vw,88px) 0;border-top:1px solid var(--nk-border);scroll-margin-top:16px}
.cv-svc:first-child{border-top:0}
.cv-svc-head{position:sticky;top:24px;align-self:start}
.cv-svc-no{display:block;font-family:var(--nk-font-display);font-weight:800;font-size:4.4rem;line-height:.9;letter-spacing:-.05em;color:transparent;-webkit-text-stroke:1.5px var(--nk-primary)}
.cv-svc h2{margin:18px 0 0;font-size:clamp(1.8rem,3.2vw,2.5rem);line-height:1.08;letter-spacing:-.035em;font-weight:800}
.cv-svc-head>p{margin:18px 0 0;color:var(--nk-text-muted);line-height:1.65;font-size:1.05rem}
.cv-svc-body h3{margin:0 0 16px;font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text-muted);font-family:var(--nk-font)}
.cv-deliv{list-style:none;margin:0 0 36px;padding:0;display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--nk-border)}
.cv-deliv li{padding:16px 16px 16px 26px;border-bottom:1px solid var(--nk-border);position:relative;line-height:1.5}
.cv-deliv li::before{content:"";position:absolute;left:4px;top:24px;width:10px;height:2px;background:var(--nk-primary)}
.cv-deliv li:nth-child(odd){border-right:1px solid var(--nk-border)}
.cv-scale{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:0;background:var(--nk-text);color:var(--nk-surface)}
.cv-scale div{display:flex;flex-direction:column-reverse;justify-content:flex-end;padding:22px 22px 20px}
.cv-scale div+div{border-left:1px solid color-mix(in srgb,var(--nk-surface) 16%,transparent)}
.cv-scale dd{margin:0;font-family:var(--nk-font-display);font-weight:800;font-size:1.7rem;letter-spacing:-.03em;color:var(--nk-surface)}
.cv-scale dt{font-size:.82rem;color:color-mix(in srgb,var(--nk-surface) 70%,var(--nk-text));line-height:1.35}
@media (max-width:900px){.cv-svc{grid-template-columns:minmax(0,1fr)}.cv-svc-head{position:static}}
@media (max-width:560px){.cv-deliv{grid-template-columns:minmax(0,1fr)}.cv-deliv li:nth-child(odd){border-right:0}.cv-scale{grid-template-columns:minmax(0,1fr)}.cv-scale div+div{border-left:0;border-top:1px solid color-mix(in srgb,var(--nk-surface) 16%,transparent)}}
.cv-phases-sec{background:var(--nk-surface);border-block:1px solid var(--nk-border)}
.cv-gantt{display:grid;row-gap:10px;margin:0 0 20px;padding:0;list-style:none}
.cv-gantt>li{display:grid;grid-template-columns:200px repeat(12,minmax(0,1fr));align-items:center}
.cv-gantt-scale>span{padding:0 0 12px 8px;border-left:1px solid var(--nk-border);font-size:.75rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-text-muted);white-space:nowrap;overflow:hidden}
.cv-gantt-scale>span:first-child{border-left:0;padding-left:0}
.cv-g-label{grid-column:1;align-self:center;padding-right:16px}
.cv-g-label strong{display:block;font-size:1rem;letter-spacing:-.01em}
.cv-g-label span{font-size:.82rem;color:var(--nk-text-muted)}
.cv-g-bar{align-self:center;min-height:44px;display:flex;align-items:center;padding:0 14px;font-size:.85rem;font-weight:600;background:color-mix(in srgb,var(--nk-accent) 16%,var(--nk-surface));border-left:4px solid var(--nk-accent);color:var(--nk-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cv-g-bar.is-build{background:var(--nk-primary);border-left-color:var(--nk-primary-2);color:var(--nk-surface)}
.cv-g-bar.is-run{background-image:repeating-linear-gradient(90deg,color-mix(in srgb,var(--nk-text) 10%,transparent) 0 2px,transparent 2px 14px);background-color:var(--nk-surface-2);border-left-color:var(--nk-text)}
.cv-g1{grid-column:2/4}.cv-g2{grid-column:3/6}.cv-g3{grid-column:5/11}.cv-g4{grid-column:10/12}.cv-g5{grid-column:11/14}
.cv-gantt-note{margin:0;color:var(--nk-text-muted);font-size:.9rem}
@media (max-width:820px){.cv-gantt>li{grid-template-columns:repeat(12,minmax(0,1fr));row-gap:6px}.cv-gantt>li.cv-gantt-scale{display:none}.cv-g-label{grid-column:1/-1;padding:12px 0 0}.cv-g-bar{min-height:36px;font-size:.8rem}.cv-g1{grid-column:1/4}.cv-g2{grid-column:2/6}.cv-g3{grid-column:4/11}.cv-g4{grid-column:9/12}.cv-g5{grid-column:10/13}}
.cv-matrix-wrap{overflow-x:auto;position:relative;border:1px solid var(--nk-border);background:var(--nk-surface)}
.cv-matrix{width:100%;min-width:720px;border-collapse:collapse;margin:0}
.cv-matrix th,.cv-matrix td{padding:18px 20px;border-bottom:1px solid var(--nk-border);text-align:center;vertical-align:middle}
.cv-matrix thead th{background:var(--nk-text);color:var(--nk-surface);font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.cv-matrix th[scope="row"],.cv-matrix thead th:first-child{text-align:left}
.cv-matrix th[scope="row"]{font-weight:600}
.cv-matrix tbody tr:last-child>*{border-bottom:0}
.cv-dot{display:inline-block;width:14px;height:14px;background:var(--nk-primary)}
.cv-dot-half{background-image:linear-gradient(135deg,var(--nk-primary) 0 50%,transparent 50%);background-color:var(--nk-surface);box-shadow:inset 0 0 0 1.5px var(--nk-primary)}
.cv-matrix-key{display:flex;flex-wrap:wrap;gap:8px 24px;margin:16px 0 0;color:var(--nk-text-muted);font-size:.88rem}
.cv-matrix-key span{display:inline-flex;align-items:center;gap:8px}
.cv-quote{margin:0;padding:clamp(28px,4vw,48px);border-left:6px solid var(--nk-primary);background:var(--nk-surface)}
.cv-quote p{margin:0;font-family:var(--nk-font-display);font-size:clamp(1.4rem,2.6vw,2.1rem);line-height:1.25;letter-spacing:-.025em;font-weight:700;max-width:40ch}
.cv-quote footer{margin-top:22px;color:var(--nk-text-muted);font-size:.95rem}
.cv-quote footer strong{color:var(--nk-text)}
`;

/* ── Company ────────────────────────────────────────────────────────── */
const COMPANY_CSS = `
.cv-glance{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-block:0;border-top:1px solid var(--nk-border)}
.cv-glance div{display:flex;flex-direction:column-reverse;justify-content:flex-end;gap:6px;padding:30px 24px}
.cv-glance div:first-child{padding-left:0}
.cv-glance div+div{border-left:1px solid var(--nk-border)}
.cv-glance dd{margin:0;font-family:var(--nk-font-display);font-size:2.2rem;font-weight:800;letter-spacing:-.04em;line-height:1}
.cv-glance dt{color:var(--nk-text-muted);font-size:.9rem}
@media (max-width:760px){.cv-glance{grid-template-columns:repeat(2,minmax(0,1fr))}.cv-glance div:nth-child(3){border-left:0;padding-left:0}.cv-glance div:nth-child(n+3){border-top:1px solid var(--nk-border)}}
.cv-story{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:40px 80px}
.cv-story-copy h2{margin:0;font-size:clamp(2rem,3.6vw,2.9rem);line-height:1.05;letter-spacing:-.035em;font-weight:800}
.cv-story-copy p{margin:20px 0 0;color:var(--nk-text-muted);line-height:1.7}
.cv-timeline{list-style:none;margin:0;padding:0;border-left:2px solid var(--nk-text)}
.cv-tl-item{display:grid;grid-template-columns:110px minmax(0,1fr);gap:8px 24px;padding:0 0 34px 28px;position:relative}
.cv-tl-item::before{content:"";position:absolute;left:-7px;top:6px;width:12px;height:12px;background:var(--nk-surface);border:2px solid var(--nk-text)}
.cv-tl-item.is-now::before{background:var(--nk-primary);border-color:var(--nk-primary)}
.cv-tl-year{font-family:var(--nk-font-display);font-weight:800;font-size:1.5rem;letter-spacing:-.03em;line-height:1.1}
.cv-tl-item h3{margin:0;font-size:1.1rem;font-weight:700;letter-spacing:-.01em}
.cv-tl-item p{margin:6px 0 0;color:var(--nk-text-muted);line-height:1.6;font-size:.95rem}
@media (max-width:900px){.cv-story{grid-template-columns:minmax(0,1fr)}}
@media (max-width:520px){.cv-tl-item{grid-template-columns:minmax(0,1fr);padding-left:22px}}
.cv-bios{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.cv-bio{display:grid;grid-template-columns:200px minmax(0,1fr);gap:0;background:var(--nk-surface);border:1px solid var(--nk-border)}
.cv-bio img{display:block;width:100%;height:100%;min-height:250px;object-fit:cover}
.cv-bio-body{padding:26px 28px}
.cv-bio h3{margin:0;font-size:1.3rem;font-weight:800;letter-spacing:-.02em}
.cv-bio-role{display:block;margin-top:4px;font-size:.85rem;font-weight:600;color:var(--nk-primary-2)}
.cv-bio-body p{margin:14px 0 0;color:var(--nk-text-muted);line-height:1.6;font-size:.95rem}
.cv-bio-facts{list-style:none;margin:16px 0 0;padding:14px 0 0;border-top:1px solid var(--nk-border);display:grid;gap:6px;font-size:.85rem;color:var(--nk-text-muted)}
.cv-bio-facts b{color:var(--nk-text);font-weight:600}
@media (max-width:980px){.cv-bios{grid-template-columns:minmax(0,1fr)}}
@media (max-width:560px){.cv-bio{grid-template-columns:minmax(0,1fr)}.cv-bio img{aspect-ratio:4/3;min-height:0;height:auto;object-position:50% 25%}}
.cv-values{background:var(--nk-text);color:var(--nk-surface)}
.cv-values .cv-sec-head h2{color:var(--nk-surface)}
.cv-values .cv-label{color:color-mix(in srgb,var(--nk-surface) 70%,var(--nk-text))}
.cv-values .cv-sec-head>p{color:color-mix(in srgb,var(--nk-surface) 72%,var(--nk-text))}
.cv-value-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:color-mix(in srgb,var(--nk-surface) 16%,transparent);border:1px solid color-mix(in srgb,var(--nk-surface) 16%,transparent)}
.cv-value{padding:32px 26px;background:var(--nk-text)}
.cv-value span{font-family:var(--nk-font-display);font-weight:800;color:color-mix(in srgb,var(--nk-primary) 58%,var(--nk-surface));font-size:.95rem;letter-spacing:.06em}
.cv-value h3{margin:14px 0 0;color:var(--nk-surface);font-size:1.3rem;font-weight:800;letter-spacing:-.02em}
.cv-value p{margin:10px 0 0;color:color-mix(in srgb,var(--nk-surface) 72%,var(--nk-text));line-height:1.6;font-size:.95rem}
@media (max-width:980px){.cv-value-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.cv-value-grid{grid-template-columns:minmax(0,1fr)}}
.cv-office-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-top:2px solid var(--nk-text)}
.cv-office{padding:24px 20px 8px 0}
.cv-office+.cv-office{padding-left:20px;border-left:1px solid var(--nk-border)}
.cv-office h3{margin:0;font-size:1.2rem;font-weight:800;letter-spacing:-.02em}
.cv-office-tag{display:inline-block;margin-top:6px;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-primary-2)}
.cv-office address{margin:12px 0 0;font-style:normal;color:var(--nk-text-muted);line-height:1.6;font-size:.92rem}
@media (max-width:1000px){.cv-office-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.cv-office:nth-child(4){border-left:0;padding-left:0}.cv-office:nth-child(n+4){border-top:1px solid var(--nk-border);margin-top:16px}}
@media (max-width:620px){.cv-office-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cv-office,.cv-office+.cv-office{padding:20px 12px 8px 0;border-left:0;margin-top:0;border-top:0}.cv-office:nth-child(n+3){border-top:1px solid var(--nk-border)}}
`;

/* ── Shared HTML ────────────────────────────────────────────────────── */
const CTA_HTML = `
<section class="cv-cta" aria-labelledby="cv-cta-h">
  <div class="cv-wrap cv-cta-grid">
    <div>
      <h2 id="cv-cta-h">Planning something that has to work for forty years?</h2>
      <p>Talk to the engineers who will design it, build it and keep it running. We reply to every project enquiry within two working days.</p>
    </div>
    <div class="cv-cta-actions">
      <a class="cv-btn cv-btn-solid" href="/contact">Start a conversation</a>
      <a class="cv-btn cv-btn-line" href="/careers">Join Corvane</a>
    </div>
  </div>
</section>`;

const FOOTER_HTML = `
<footer class="cv-footer">
  <div class="cv-wrap">
    <div class="cv-foot-grid">
      <div>
        <p class="cv-foot-brand">Corvane</p>
        <address>Corvane Group N.V.<br>Maaskade 140<br>3071 NG Rotterdam<br>The Netherlands</address>
      </div>
      <div>
        <p class="cv-foot-h">Group</p>
        <ul>
          <li><a href="/services">Services</a></li>
          <li><a href="/company">Company</a></li>
          <li><a href="/careers">Careers</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
      <div>
        <p class="cv-foot-h">Enquiries</p>
        <ul>
          <li><a href="mailto:projects@corvane.example">projects@corvane.example</a></li>
          <li><a href="mailto:press@corvane.example">press@corvane.example</a></li>
          <li><a href="tel:+31105550142">+31 10 555 0142</a></li>
        </ul>
      </div>
      <div>
        <p class="cv-foot-h">Offices</p>
        <ul>
          <li>Rotterdam · Aberdeen · Hamburg</li>
          <li>Singapore · Houston</li>
        </ul>
      </div>
    </div>
    <div class="cv-foot-base">
      <p>© 2026 Corvane Group N.V. All rights reserved.</p>
      <p>Safety first, on every site, every shift.</p>
    </div>
  </div>
</footer>`;

/* ── Pages ──────────────────────────────────────────────────────────── */
const HOME_HTML = `
<div class="cv-page">
<nav aria-label="Main"></nav>
<header class="cv-hero">
  <div class="cv-wrap cv-hero-grid">
    <div>
      <p class="cv-label"><b>Corvane Group</b><span>Engineering · Construction · Operations</span></p>
      <h1>We engineer the ports, plants and power networks <em>economies run on.</em></h1>
      <p class="cv-lede">Corvane designs, builds and operates critical infrastructure in 38 countries, from automated container terminals to offshore wind substations, and stays on to run what we deliver.</p>
      <div class="cv-actions">
        <a class="cv-btn cv-btn-ink" href="/services">Explore our services</a>
        <a class="cv-link" href="/contact">Talk to an engineer <span aria-hidden="true">→</span></a>
      </div>
    </div>
    <figure class="cv-hero-media">
      <img src="/media/generated/corporate-port-terminal.webp" alt="Orange ship-to-shore cranes above stacked containers at a deep-water terminal" width="560" height="640">
      <figcaption class="cv-hero-card"><span>Delivered 2025</span><strong>Aalvik Container Terminal</strong>Twelve automated stacking cranes, installed while every berth stayed open.</figcaption>
    </figure>
  </div>
  <div class="cv-figures">
    <div class="cv-wrap">
      <h2 class="cv-sr">Corvane in figures</h2>
      <dl class="cv-figures-grid">
        <div><dt>Revenue, 2025</dt><dd>€4.8<small>bn</small></dd></div>
        <div><dt>Engineers, builders and operators</dt><dd>11,400</dd></div>
        <div><dt>Countries with active projects</dt><dd>38</dd></div>
        <div><dt>Of new orders in energy transition</dt><dd>62<small>%</small></dd></div>
      </dl>
      <p class="cv-figures-note">Figures from the 2025 annual report, audited.</p>
    </div>
  </div>
</header>

<main>
<section class="cv-sec cv-caps" aria-labelledby="cv-caps-h">
  <div class="cv-wrap">
    <div class="cv-sec-head">
      <p class="cv-label"><b>01</b> What we do</p>
      <h2 id="cv-caps-h">Four capabilities. One team accountable for all of them.</h2>
      <p>Most infrastructure fails at the hand-offs between designer, builder and operator. We remove the hand-offs by doing all three, under one contract and one safety culture.</p>
    </div>
    <ol class="cv-cap-list">
      <li class="cv-cap">
        <span class="cv-cap-no">01</span>
        <h3>Engineering &amp; design</h3>
        <p>Feasibility, concept and detailed design, with a digital twin built from the first survey and handed to operations on day one.</p>
        <p class="cv-cap-fact"><strong>2,100</strong>engineers in-house</p>
      </li>
      <li class="cv-cap">
        <span class="cv-cap-no">02</span>
        <h3>Construction &amp; delivery</h3>
        <p>Full EPC contracts up to €1.5bn, with our own site managers, commissioning crews and a supply chain we have worked with for decades.</p>
        <p class="cv-cap-fact"><strong>91%</strong>delivered on schedule since 2020</p>
      </li>
      <li class="cv-cap">
        <span class="cv-cap-no">03</span>
        <h3>Operations &amp; maintenance</h3>
        <p>Long-term contracts to run and maintain what we build, with availability guarantees written into the agreement rather than the brochure.</p>
        <p class="cv-cap-fact"><strong>140</strong>sites under long-term O&amp;M</p>
      </li>
      <li class="cv-cap">
        <span class="cv-cap-no">04</span>
        <h3>Automation &amp; digital</h3>
        <p>Control systems, operational-technology security and predictive maintenance that find faults before they become outages.</p>
        <p class="cv-cap-fact"><strong>−33%</strong>unplanned downtime on average</p>
      </li>
    </ol>
  </div>
</section>

<section class="cv-sec cv-sectors" aria-labelledby="cv-sectors-h">
  <div class="cv-wrap">
    <div class="cv-sec-head">
      <p class="cv-label"><b>02</b> Sectors</p>
      <h2 id="cv-sectors-h">Where our work carries the most weight.</h2>
      <p>Three sectors account for four-fifths of what we build. In each, we bring teams that have done the job before, many times over.</p>
    </div>
    <div class="cv-sector-grid">
      <article class="cv-sector">
        <figure class="cv-sector-media">
          <img src="/media/generated/corporate-wind-turbine.webp" alt="A wind turbine against a deep blue sky with the sun behind its tower" width="600" height="750" loading="lazy">
          <figcaption><h3>Energy transition</h3><p>Offshore substations, grid connections and hydrogen-ready plants.</p></figcaption>
        </figure>
        <dl><div><dt>offshore wind connected</dt><dd>6.2 GW</dd></div><div><dt>grid substations since 2020</dt><dd>14</dd></div></dl>
      </article>
      <article class="cv-sector">
        <figure class="cv-sector-media">
          <img src="/media/generated/corporate-steel-works.webp" alt="Molten metal glowing inside a steelworks as a crane lifts a ladle" width="512" height="640" loading="lazy">
          <figcaption><h3>Heavy industry</h3><p>Decarbonising steel, cement and chemicals without stopping the line.</p></figcaption>
        </figure>
        <dl><div><dt>plants modernised</dt><dd>31</dd></div><div><dt>CO₂ avoided each year</dt><dd>1.9 Mt</dd></div></dl>
      </article>
      <article class="cv-sector">
        <figure class="cv-sector-media">
          <img src="/media/generated/corporate-data-centre.webp" alt="An engineer connecting network cables to a switch in a server rack" width="512" height="640" loading="lazy">
          <figcaption><h3>Digital infrastructure</h3><p>Data centres, cable landing stations and resilient private networks.</p></figcaption>
        </figure>
        <dl><div><dt>data-centre capacity delivered</dt><dd>420 MW</dd></div><div><dt>Tier IV facilities</dt><dd>9</dd></div></dl>
      </article>
    </div>
  </div>
</section>

<section class="cv-sec cv-results" aria-labelledby="cv-results-h">
  <div class="cv-wrap">
    <div class="cv-sec-head">
      <p class="cv-label"><b>03</b> Results</p>
      <h2 id="cv-results-h">Measured in outcomes, not in hours billed.</h2>
      <p>Every contract names the numbers we are accountable for. These are three we delivered in the past eighteen months.</p>
    </div>
    <div class="cv-result-grid">
      <article class="cv-result">
        <p class="cv-result-num">31%</p>
        <h3>faster vessel turnaround</h3>
        <p class="cv-result-where">Aalvik Container Terminal · Norway</p>
        <p>New automated stacking cranes and terminal software, commissioned in phases so that no berth closed during the works.</p>
      </article>
      <article class="cv-result">
        <p class="cv-result-num">4 wks</p>
        <h3>early energisation</h3>
        <p class="cv-result-where">Dunmore Bank Offshore Wind · UK</p>
        <p>Two offshore substations and 64 km of export cable bringing 1.2 GW ashore, ahead of a fixed grid-connection date.</p>
      </article>
      <article class="cv-result">
        <p class="cv-result-num">−38%</p>
        <h3>energy per tonne of steel</h3>
        <p class="cv-result-where">Ferrosa Steelworks · Spain</p>
        <p>A blast furnace replaced by an electric arc furnace across three planned outages, with output back to target in six weeks.</p>
      </article>
    </div>
  </div>
</section>

<section class="cv-sec cv-leaders" aria-labelledby="cv-leaders-h">
  <div class="cv-wrap">
    <div class="cv-sec-head">
      <p class="cv-label"><b>04</b> Leadership</p>
      <h2 id="cv-leaders-h">Led by people who have run a site.</h2>
      <p>Every member of the executive committee started their career on a project, not in a boardroom.</p>
    </div>
    <div class="cv-leader-grid">
      <figure class="cv-leader">
        <img src="/media/generated/corporate-leader-amara.webp" alt="Portrait of Amara Okafor-Lind" width="480" height="600" loading="lazy">
        <figcaption><h3>Amara Okafor-Lind</h3><span class="cv-leader-role">Group Chief Executive</span><p>Ran our offshore business through its first gigawatt. CEO since 2022.</p></figcaption>
      </figure>
      <figure class="cv-leader">
        <img src="/media/generated/corporate-leader-henrik.webp" alt="Portrait of Henrik Vestergaard" width="480" height="600" loading="lazy">
        <figcaption><h3>Henrik Vestergaard</h3><span class="cv-leader-role">Chair of the Board</span><p>Thirty years in port engineering, including twelve as a harbour master.</p></figcaption>
      </figure>
      <figure class="cv-leader">
        <img src="/media/generated/corporate-leader-ingrid.webp" alt="Portrait of Ingrid Salo" width="480" height="600" loading="lazy">
        <figcaption><h3>Ingrid Salo</h3><span class="cv-leader-role">Chief Financial Officer</span><p>Previously project controls director on our largest EPC contracts.</p></figcaption>
      </figure>
      <figure class="cv-leader">
        <img src="/media/generated/corporate-leader-tomas.webp" alt="Portrait of Tomás Reyes" width="480" height="600" loading="lazy">
        <figcaption><h3>Tomás Reyes</h3><span class="cv-leader-role">Chief Operating Officer</span><p>Commissioned four steel plants and a hydrogen pilot before joining the board.</p></figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="cv-sec cv-esg" aria-labelledby="cv-esg-h">
  <div class="cv-wrap cv-esg-grid">
    <div class="cv-esg-copy">
      <p class="cv-label"><b>05</b> Commitments</p>
      <h2 id="cv-esg-h">Targets we publish, and progress we report every year.</h2>
      <p>Our sustainability report is assured by an independent auditor. Where we are behind, we say so and explain the plan to catch up.</p>
      <p class="cv-meter-key"><span class="cv-key-bar"></span>Progress today <span class="cv-key-tick"></span>Published target</p>
      <a class="cv-link" href="/company">How we work <span aria-hidden="true">→</span></a>
    </div>
    <ul class="cv-meters">
      <li class="cv-meter">
        <div class="cv-meter-top"><h3>Scope 1 and 2 emissions vs 2019</h3><strong>−46%</strong></div>
        <span class="cv-meter-bar"><span class="cv-w46"></span><i class="cv-t70"></i></span>
        <p>Target −70% by 2030</p>
      </li>
      <li class="cv-meter">
        <div class="cv-meter-top"><h3>Revenue from energy transition work</h3><strong>58%</strong></div>
        <span class="cv-meter-bar"><span class="cv-w58"></span><i class="cv-t75"></i></span>
        <p>Target 75% by 2030</p>
      </li>
      <li class="cv-meter">
        <div class="cv-meter-top"><h3>Women in senior leadership</h3><strong>36%</strong></div>
        <span class="cv-meter-bar"><span class="cv-w36"></span><i class="cv-t40"></i></span>
        <p>Target 40% by 2027</p>
      </li>
      <li class="cv-meter">
        <div class="cv-meter-top"><h3>Sites with zero lost-time injuries</h3><strong>81%</strong></div>
        <span class="cv-meter-bar"><span class="cv-w81"></span><i class="cv-t90"></i></span>
        <p>Target 90% every year</p>
      </li>
    </ul>
  </div>
</section>

<section class="cv-sec cv-news" aria-labelledby="cv-news-h">
  <div class="cv-wrap">
    <div class="cv-sec-head">
      <p class="cv-label"><b>06</b> Newsroom</p>
      <h2 id="cv-news-h">Latest from the group.</h2>
    </div>
    <div class="cv-news-grid">
      <article class="cv-news-item">
        <p class="cv-news-meta"><span>Contract</span><time datetime="2026-09-18">18 Sep 2026</time></p>
        <h3>Corvane selected for €640m North Sea grid hub</h3>
        <p>An offshore converter platform linking three wind farms to two national grids, with first power planned for 2030.</p>
      </article>
      <article class="cv-news-item">
        <p class="cv-news-meta"><span>Investors</span><time datetime="2026-07-29">29 Jul 2026</time></p>
        <h3>Half-year results: order intake up 14%</h3>
        <p>Record backlog of €11.2bn, with energy transition projects making up 62% of new orders.</p>
      </article>
      <article class="cv-news-item">
        <p class="cv-news-meta"><span>Recognition</span><time datetime="2026-06-03">3 Jun 2026</time></p>
        <h3>Aalvik named Port Project of the Year</h3>
        <p>The judges cited zero lost-time injuries across 1.4 million hours worked on the terminal upgrade.</p>
      </article>
    </div>
    <p class="cv-news-foot">Media enquiries: <a href="mailto:press@corvane.example">press@corvane.example</a></p>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const SERVICES_HTML = `
<div class="cv-page">
<nav aria-label="Main"></nav>
<header class="cv-phead">
  <div class="cv-wrap cv-phead-grid">
    <ol class="cv-crumbs cv-label"><li><a href="/">Home</a></li><li aria-current="page">Services</li></ol>
    <h1>From first survey to the fortieth year of operation.</h1>
    <p>Hire us for one stage or all four. Either way you get one accountable partner, one safety culture and engineers who stay with your asset long after the ribbon is cut.</p>
  </div>
</header>

<main>
<div class="cv-wrap">
  <ul class="cv-jump" aria-label="Jump to a service">
    <li><a href="#engineering"><span>01</span>Engineering &amp; design</a></li>
    <li><a href="#construction"><span>02</span>Construction &amp; delivery</a></li>
    <li><a href="#operations"><span>03</span>Operations &amp; maintenance</a></li>
    <li><a href="#automation"><span>04</span>Automation &amp; digital</a></li>
  </ul>

  <section class="cv-svc" id="engineering" aria-labelledby="cv-s1">
    <div class="cv-svc-head">
      <span class="cv-svc-no" aria-hidden="true">01</span>
      <h2 id="cv-s1">Engineering &amp; design</h2>
      <p>We design for the full life of the asset. Maintenance access, spare-part strategy and decommissioning are part of the first drawing set, not an afterthought.</p>
    </div>
    <div class="cv-svc-body">
      <h3>What you get</h3>
      <ul class="cv-deliv">
        <li>Feasibility and options studies</li>
        <li>Concept, FEED and detailed design</li>
        <li>Permitting and environmental assessment</li>
        <li>A digital twin kept current through handover</li>
        <li>Cost estimates to ±10% at FEED</li>
        <li>Independent design verification</li>
      </ul>
      <dl class="cv-scale"><div><dt>engineers in-house</dt><dd>2,100</dd></div><div><dt>design disciplines</dt><dd>27</dd></div><div><dt>designs delivered since 2015</dt><dd>460+</dd></div></dl>
    </div>
  </section>

  <section class="cv-svc" id="construction" aria-labelledby="cv-s2">
    <div class="cv-svc-head">
      <span class="cv-svc-no" aria-hidden="true">02</span>
      <h2 id="cv-s2">Construction &amp; delivery</h2>
      <p>Fixed-price or target-cost EPC contracts, delivered with our own site leadership. Our programme is shared with you weekly, including the risks.</p>
    </div>
    <div class="cv-svc-body">
      <h3>What you get</h3>
      <ul class="cv-deliv">
        <li>EPC and EPCM contracts up to €1.5bn</li>
        <li>Procurement through long-standing suppliers</li>
        <li>Modular fabrication in our own yards</li>
        <li>Brownfield works without production stops</li>
        <li>Commissioning and performance testing</li>
        <li>Live programme and risk dashboards</li>
      </ul>
      <dl class="cv-scale"><div><dt>delivered on schedule since 2020</dt><dd>91%</dd></div><div><dt>fabrication yards</dt><dd>4</dd></div><div><dt>lost-time injury rate per million hours</dt><dd>0.21</dd></div></dl>
    </div>
  </section>

  <section class="cv-svc" id="operations" aria-labelledby="cv-s3">
    <div class="cv-svc-head">
      <span class="cv-svc-no" aria-hidden="true">03</span>
      <h2 id="cv-s3">Operations &amp; maintenance</h2>
      <p>We run what we build, under contracts of five to twenty-five years, with availability and response times written in and paid against.</p>
    </div>
    <div class="cv-svc-body">
      <h3>What you get</h3>
      <ul class="cv-deliv">
        <li>Availability-based O&amp;M contracts</li>
        <li>24/7 control-room cover</li>
        <li>Planned and predictive maintenance</li>
        <li>Spare-part pooling across sites</li>
        <li>Life-extension studies</li>
        <li>Monthly performance reporting</li>
      </ul>
      <dl class="cv-scale"><div><dt>sites under long-term contract</dt><dd>140</dd></div><div><dt>average availability, 2025</dt><dd>99.7%</dd></div><div><dt>contract renewal rate</dt><dd>94%</dd></div></dl>
    </div>
  </section>

  <section class="cv-svc" id="automation" aria-labelledby="cv-s4">
    <div class="cv-svc-head">
      <span class="cv-svc-no" aria-hidden="true">04</span>
      <h2 id="cv-s4">Automation &amp; digital</h2>
      <p>Control systems and data that make an asset safer and cheaper to run, secured to the standards critical infrastructure now demands.</p>
    </div>
    <div class="cv-svc-body">
      <h3>What you get</h3>
      <ul class="cv-deliv">
        <li>Control system design and integration</li>
        <li>Operational-technology security (IEC 62443)</li>
        <li>Predictive maintenance models</li>
        <li>Remote operations centres</li>
        <li>Terminal and yard automation</li>
        <li>Energy optimisation for heavy industry</li>
      </ul>
      <dl class="cv-scale"><div><dt>reduction in unplanned downtime</dt><dd>−33%</dd></div><div><dt>assets monitored remotely</dt><dd>2,700</dd></div><div><dt>certified OT security specialists</dt><dd>180</dd></div></dl>
    </div>
  </section>
</div>

<section class="cv-sec cv-phases-sec" aria-labelledby="cv-phases-h">
  <div class="cv-wrap">
    <div class="cv-sec-head">
      <p class="cv-label"><b>How we deliver</b></p>
      <h2 id="cv-phases-h">A typical project, from brief to handover.</h2>
      <p>Durations below are for a mid-sized port or industrial project. Operations then runs for the life of the contract.</p>
    </div>
    <ol class="cv-gantt" aria-label="Project phases">
      <li class="cv-gantt-scale" aria-hidden="true"><span>Phase</span><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span><span>Q5</span><span>Q6</span><span>Q7</span><span>Q8</span><span>Q9</span><span>Q10</span><span>Q11</span><span>Q12</span></li>
      <li><span class="cv-g-label"><strong>Discover</strong><span>0–6 months</span></span><span class="cv-g-bar cv-g1">Surveys, options</span></li>
      <li><span class="cv-g-label"><strong>Define</strong><span>3–12 months</span></span><span class="cv-g-bar cv-g2">FEED, permits, fixed price</span></li>
      <li><span class="cv-g-label"><strong>Deliver</strong><span>12–27 months</span></span><span class="cv-g-bar cv-g3 is-build">Procurement, fabrication and construction</span></li>
      <li><span class="cv-g-label"><strong>Commission</strong><span>2–6 months</span></span><span class="cv-g-bar cv-g4">Testing, trials, training</span></li>
      <li><span class="cv-g-label"><strong>Operate</strong><span>5–25 years</span></span><span class="cv-g-bar cv-g5 is-run">O&amp;M contract begins</span></li>
    </ol>
    <p class="cv-gantt-note">Overlapping phases are deliberate: the operations team joins during design, so nothing is lost at handover.</p>
  </div>
</section>

<section class="cv-sec" aria-labelledby="cv-matrix-h">
  <div class="cv-wrap">
    <div class="cv-sec-head">
      <p class="cv-label"><b>Where we apply it</b></p>
      <h2 id="cv-matrix-h">Capabilities by sector.</h2>
      <p>Full squares show where we hold a leading position and a long reference list. Half squares show selective work, usually with a partner.</p>
    </div>
    <div class="cv-matrix-wrap" tabindex="0" role="region" aria-label="Capabilities by sector table, scrolls sideways on small screens">
      <table class="cv-matrix">
        <thead><tr><th scope="col">Sector</th><th scope="col">Engineering</th><th scope="col">Construction</th><th scope="col">Operations</th><th scope="col">Automation</th></tr></thead>
        <tbody>
          <tr><th scope="row">Ports &amp; logistics</th><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td></tr>
          <tr><th scope="row">Energy transition</th><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot cv-dot-half"></span><span class="cv-sr">Selective</span></td></tr>
          <tr><th scope="row">Heavy industry</th><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot cv-dot-half"></span><span class="cv-sr">Selective</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td></tr>
          <tr><th scope="row">Digital infrastructure</th><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot cv-dot-half"></span><span class="cv-sr">Selective</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td></tr>
          <tr><th scope="row">Water &amp; utilities</th><td><span class="cv-dot cv-dot-half"></span><span class="cv-sr">Selective</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot"></span><span class="cv-sr">Leading</span></td><td><span class="cv-dot cv-dot-half"></span><span class="cv-sr">Selective</span></td></tr>
        </tbody>
      </table>
    </div>
    <p class="cv-matrix-key"><span><span class="cv-dot"></span>Leading position</span><span><span class="cv-dot cv-dot-half"></span>Selective, often with a partner</span></p>
  </div>
</section>

<section class="cv-sec cv-band-paper" aria-label="Client view">
  <div class="cv-wrap">
    <blockquote class="cv-quote">
      <p>“Corvane's operations lead sat in our design reviews from week one. Two years after handover we have not had a single unplanned stop on the new line.”</p>
      <footer><strong>Lucía Ferrer</strong>, Plant Director, Ferrosa Steelworks</footer>
    </blockquote>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const COMPANY_HTML = `
<div class="cv-page">
<nav aria-label="Main"></nav>
<header class="cv-phead">
  <div class="cv-wrap cv-phead-grid">
    <ol class="cv-crumbs cv-label"><li><a href="/">Home</a></li><li aria-current="page">Company</li></ol>
    <h1>Sixty-four years of building things that last.</h1>
    <p>Corvane began as a harbour engineering office on the Maas with eleven people. Today we are 11,400, and the principle is unchanged: stay accountable for what you build.</p>
  </div>
  <dl class="cv-glance cv-wrap">
    <div><dt>Founded in Rotterdam</dt><dd>1962</dd></div>
    <div><dt>Listed on Euronext</dt><dd>1994</dd></div>
    <div><dt>Order backlog</dt><dd>€11.2bn</dd></div>
    <div><dt>Nationalities on our teams</dt><dd>74</dd></div>
  </dl>
</header>

<main>
<section class="cv-sec" aria-labelledby="cv-story-h">
  <div class="cv-wrap cv-story">
    <div class="cv-story-copy">
      <p class="cv-label"><b>Our story</b></p>
      <h2 id="cv-story-h">From one harbour to thirty-eight countries.</h2>
      <p>Each step in our history came from a client asking us to stay a little longer: first to maintain a quay we had designed, then to run a terminal, then to automate it.</p>
      <p>That habit of staying on is still the core of the business. More than half our profit now comes from assets we designed and built ourselves.</p>
    </div>
    <ol class="cv-timeline">
      <li class="cv-tl-item"><span class="cv-tl-year">1962</span><div><h3>Founded on the Maas</h3><p>Eleven engineers design quay walls and locks for the growing port of Rotterdam.</p></div></li>
      <li class="cv-tl-item"><span class="cv-tl-year">1979</span><div><h3>First offshore platform</h3><p>A gas platform for the southern North Sea takes the company offshore.</p></div></li>
      <li class="cv-tl-item"><span class="cv-tl-year">1994</span><div><h3>Listed on Euronext</h3><p>The listing funds our first fabrication yard and an office in Singapore.</p></div></li>
      <li class="cv-tl-item"><span class="cv-tl-year">2008</span><div><h3>Nordvind Automation joins</h3><p>Control-system specialists who now lead our automation and digital business.</p></div></li>
      <li class="cv-tl-item"><span class="cv-tl-year">2016</span><div><h3>First offshore wind substation</h3><p>Energised on time, the first of fourteen grid connections since.</p></div></li>
      <li class="cv-tl-item is-now"><span class="cv-tl-year">2026</span><div><h3>Net-zero plan on track</h3><p>Scope 1 and 2 emissions down 46% against 2019, audited and published.</p></div></li>
    </ol>
  </div>
</section>

<section class="cv-sec cv-band-white" aria-labelledby="cv-exec-h">
  <div class="cv-wrap">
    <div class="cv-sec-head">
      <p class="cv-label"><b>Executive committee</b></p>
      <h2 id="cv-exec-h">The people accountable for every project we sign.</h2>
      <p>Our executive committee reviews every contract over €50m and visits at least one active site each month.</p>
    </div>
    <div class="cv-bios">
      <article class="cv-bio">
        <img src="/media/generated/corporate-leader-amara.webp" alt="Portrait of Amara Okafor-Lind" width="480" height="600" loading="lazy">
        <div class="cv-bio-body">
          <h3>Amara Okafor-Lind</h3><span class="cv-bio-role">Group Chief Executive</span>
          <p>Amara joined as a structural engineer in 2004 and led the offshore business through its first gigawatt before becoming CEO.</p>
          <ul class="cv-bio-facts"><li><b>Joined</b> 2004</li><li><b>Background</b> Structural engineering, offshore wind</li></ul>
        </div>
      </article>
      <article class="cv-bio">
        <img src="/media/generated/corporate-leader-henrik.webp" alt="Portrait of Henrik Vestergaard" width="480" height="600" loading="lazy">
        <div class="cv-bio-body">
          <h3>Henrik Vestergaard</h3><span class="cv-bio-role">Chair of the Board</span>
          <p>Henrik spent twelve years as a harbour master before three decades in port engineering and infrastructure finance.</p>
          <ul class="cv-bio-facts"><li><b>Board member since</b> 2015</li><li><b>Background</b> Port operations, infrastructure finance</li></ul>
        </div>
      </article>
      <article class="cv-bio">
        <img src="/media/generated/corporate-leader-ingrid.webp" alt="Portrait of Ingrid Salo" width="480" height="600" loading="lazy">
        <div class="cv-bio-body">
          <h3>Ingrid Salo</h3><span class="cv-bio-role">Chief Financial Officer</span>
          <p>Ingrid ran project controls on our largest EPC contracts and built the risk process every bid now goes through.</p>
          <ul class="cv-bio-facts"><li><b>Joined</b> 2011</li><li><b>Background</b> Project controls, corporate finance</li></ul>
        </div>
      </article>
      <article class="cv-bio">
        <img src="/media/generated/corporate-leader-tomas.webp" alt="Portrait of Tomás Reyes" width="480" height="600" loading="lazy">
        <div class="cv-bio-body">
          <h3>Tomás Reyes</h3><span class="cv-bio-role">Chief Operating Officer</span>
          <p>Tomás commissioned four steel plants and a green hydrogen pilot, and now leads our 140 operating sites.</p>
          <ul class="cv-bio-facts"><li><b>Joined</b> 2009</li><li><b>Background</b> Commissioning, heavy industry</li></ul>
        </div>
      </article>
    </div>
  </div>
</section>

<section class="cv-sec cv-values" aria-labelledby="cv-values-h">
  <div class="cv-wrap">
    <div class="cv-sec-head">
      <p class="cv-label"><b>How we work</b></p>
      <h2 id="cv-values-h">Four rules we hold every team to.</h2>
      <p>They are short so that people remember them at 3 a.m. on a night shift, which is when they matter most.</p>
    </div>
    <ul class="cv-value-grid">
      <li class="cv-value"><span>RULE 1</span><h3>Safe, or not at all</h3><p>Anyone on site can stop the work. Nobody is ever questioned for doing so.</p></li>
      <li class="cv-value"><span>RULE 2</span><h3>Own the outcome</h3><p>We sign up to results, then organise ourselves to deliver them.</p></li>
      <li class="cv-value"><span>RULE 3</span><h3>Build for the long run</h3><p>Design choices are judged over forty years, not over the tender period.</p></li>
      <li class="cv-value"><span>RULE 4</span><h3>Tell it straight</h3><p>Bad news travels fastest. Clients hear about risks from us first.</p></li>
    </ul>
  </div>
</section>

<section class="cv-sec" aria-labelledby="cv-offices-h">
  <div class="cv-wrap">
    <div class="cv-sec-head">
      <p class="cv-label"><b>Offices</b></p>
      <h2 id="cv-offices-h">Five regional centres, one way of working.</h2>
    </div>
    <ul class="cv-office-grid">
      <li class="cv-office"><h3>Rotterdam</h3><span class="cv-office-tag">Group headquarters</span><address>Maaskade 140<br>3071 NG Rotterdam</address></li>
      <li class="cv-office"><h3>Aberdeen</h3><span class="cv-office-tag">Offshore energy</span><address>18 Riverside Quay<br>Aberdeen AB11 5RD</address></li>
      <li class="cv-office"><h3>Hamburg</h3><span class="cv-office-tag">Automation</span><address>Kehrwieder 7<br>20457 Hamburg</address></li>
      <li class="cv-office"><h3>Singapore</h3><span class="cv-office-tag">Asia Pacific</span><address>80 Marina Parade<br>Singapore 039594</address></li>
      <li class="cv-office"><h3>Houston</h3><span class="cv-office-tag">Americas</span><address>1400 Clinton Drive<br>Houston, TX 77020</address></li>
    </ul>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const template: StarterTemplate = {
  id: "original-corporate",
  name: "Corvane Group",
  tagline: "Engineering and infrastructure group site with capabilities, sectors, results, leadership, careers and contact",
  category: "corporate",
  tags: ["corporate", "engineering", "infrastructure", "industrial", "enterprise", "group", "consulting", "business", "careers", "investor"],
  source: "original",
  modules: ["contact-form", "jobs"],
  moduleSeeds: {
    jobs: {
      openings: [
        { title: "Senior Electrical Engineer, Grid Connections", location: "Rotterdam · Hybrid", department: "Energy transition", description: "Lead substation design packages from FEED to energisation on North Sea projects.", active: true },
        { title: "Project Controls Manager", location: "Aberdeen · On site", department: "Construction & delivery", description: "Own cost, schedule and risk reporting on a €640m offshore converter platform.", active: true },
        { title: "OT Security Specialist", location: "Hamburg · Hybrid", department: "Automation & digital", description: "Secure control systems for port and industrial clients to IEC 62443.", active: true },
        { title: "Site Manager, Terminal Upgrade", location: "Singapore · On site", department: "Construction & delivery", description: "Run daily works on a live container terminal, with safety as the first measure of success.", active: true },
        { title: "Maintenance Planner", location: "Houston · On site", department: "Operations & maintenance", description: "Plan preventive work for twelve sites and keep availability above 99.5%.", active: true },
        { title: "Graduate Engineer Programme 2027", location: "All offices", department: "Early careers", description: "Two years, four rotations across design, site and operations, with a chartership mentor.", active: true },
      ],
    },
  },
  theme: {
    name: "Corvane",
    mode: "light",
    primary: "#c2410c",
    primary2: "#9a3412",
    accent: "#1e5a8a",
    bg: "#f4f6f8",
    surface: "#ffffff",
    surface2: "#e9edf1",
    border: "#d6dde4",
    text: "#0b1f33",
    textMuted: "#4f5d6b",
    font: `"Public Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    fontDisplay: `"Schibsted Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    googleFonts: ["Schibsted Grotesk:wght@500;600;700;800", "Public Sans:wght@400;500;600;700"],
    radius: "2px",
    radiusSm: "2px",
    dark: {
      name: "Corvane Night",
      mode: "dark",
      primary: "#e8590c",
      primary2: "#f07a38",
      accent: "#60a5fa",
      bg: "#07121e",
      surface: "#0d1b2a",
      surface2: "#132536",
      border: "#223649",
      text: "#e8eef4",
      textMuted: "#9fb0c0",
      font: `"Public Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      fontDisplay: `"Schibsted Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      googleFonts: ["Schibsted Grotesk:wght@500;600;700;800", "Public Sans:wght@400;500;600;700"],
      radius: "2px",
      radiusSm: "2px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: BASE_CSS + NAV_CSS + HOME_CSS + CTA_FOOTER_CSS },
    { title: "Services", slug: "services", isHome: false, html: SERVICES_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + SERVICES_CSS + CTA_FOOTER_CSS },
    { title: "Company", slug: "company", isHome: false, html: COMPANY_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + COMPANY_CSS + CTA_FOOTER_CSS },
  ],
};

registerTemplate(template);
export default template;
