/**
 * Tidewell — Finance flagship (original-finance)
 *
 * Art direction
 * - Mood: calm, warm and trustworthy. A fee-only planning practice that talks about
 *   people's next thirty years, not about products.
 * - Type: Newsreader (optical-size serif, italic for emphasis) for display, Hanken
 *   Grotesk for text and all numbers in panels.
 * - Palette: evergreen #1f4d3f on warm ivory #f6f2ea, brass #a57a2c as the data and
 *   ornament colour, soft sand surfaces. No pure black or white anywhere.
 * - Layout grammar: a full-height photo that bleeds off the left edge, "statement"
 *   ledgers with dotted leaders between label and value, rounded paper panels,
 *   evergreen bands for the numbers that matter.
 * - Signature: the sample-plan projection panel (inputs, bar chart by age, retirement
 *   marker, plan confidence) and the twenty-year fee comparator. Compliance and
 *   fiduciary language are designed in, not bolted on.
 * - Pages: Home, Plans & fees (plans, inclusions table, fee check, FAQ), Our approach
 *   (fiduciary promise, process, investment mix donut, advisors).
 * - Modules: bookings (intro call) and newsletter (The Quarterly Letter).
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";


/*
 * Projection chart data: [typical markets, poor markets] as a percentage of a $2M
 * axis, for ages 52 → 94 in three-year steps. The poor-markets bar is drawn inside
 * the typical bar, so its height class is relative to its parent.
 */
const CHART_DATA: Array<[number, number]> = [[42, 42], [54, 48], [68, 53], [82, 59], [86, 58], [83, 52], [79, 46], [75, 40], [70, 33], [65, 27], [58, 21], [51, 15], [43, 10], [35, 5], [26, 2]];
const CHART_BARS = CHART_DATA.map(([typical, poor]) => [typical, Math.round((poor / typical) * 100)]);
const HEIGHT_CSS = [...new Set(CHART_BARS.flat())].sort((a, b) => a - b).map((h) => `.tw-h${h}{height:${h}%}`).join("");

/* ── Shared CSS ─────────────────────────────────────────────────────── */
const BASE_CSS = `
.tw-page{font-size:1.04rem;line-height:1.6}
.tw-wrap{width:min(1180px,100% - 40px);margin-inline:auto}
.tw-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.tw-eyebrow{margin:0 0 16px;font-size:.8rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:color-mix(in srgb,var(--nk-accent) 72%,var(--nk-text))}
.tw-h2{margin:0;font-size:clamp(2.1rem,4.2vw,3.3rem);line-height:1.06;letter-spacing:-.02em;font-weight:500;text-wrap:balance}
.tw-h2 em,.tw-page h1 em{font-style:italic;color:var(--nk-primary)}
.tw-intro{margin:20px 0 0;max-width:58ch;color:var(--nk-text-muted);font-size:1.1rem}
.tw-sec{padding:clamp(64px,9vw,120px) 0}
.tw-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 26px;border-radius:999px;font-weight:600;font-size:1rem;text-decoration:none;border:1.5px solid transparent;transition:background-color .2s,color .2s,border-color .2s}
.tw-btn:hover{text-decoration:none}
.tw-btn-primary{background:var(--nk-primary);color:var(--nk-bg)}
.tw-btn-primary:hover{background:var(--nk-primary-2);color:var(--nk-bg)}
.tw-btn-quiet{color:var(--nk-text);border-color:color-mix(in srgb,var(--nk-text) 25%,transparent)}
.tw-btn-quiet:hover{color:var(--nk-text);border-color:var(--nk-text)}
.tw-btn-light{background:var(--nk-bg);color:var(--nk-primary-2)}
.tw-btn-light:hover{background:var(--nk-surface);color:var(--nk-primary-2)}
.tw-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}
.tw-more{display:inline-flex;gap:8px;align-items:center;font-weight:600;color:var(--nk-primary);text-decoration-line:underline;text-decoration-color:color-mix(in srgb,var(--nk-accent) 60%,transparent);text-decoration-thickness:2px;text-underline-offset:6px}
.tw-more:hover{color:var(--nk-primary-2)}
.tw-band{background:var(--nk-primary);color:var(--nk-bg)}
.tw-band .tw-h2,.tw-band h3{color:var(--nk-bg)}
.tw-band .tw-h2 em{color:color-mix(in srgb,var(--nk-accent) 35%,var(--nk-bg))}
.tw-band .tw-eyebrow{color:color-mix(in srgb,var(--nk-accent) 35%,var(--nk-bg))}
.tw-band .tw-intro{color:color-mix(in srgb,var(--nk-bg) 78%,var(--nk-primary))}
.tw-services{background:var(--nk-surface);border-block:1px solid var(--nk-border)}
.tw-page a:focus-visible,.tw-page summary:focus-visible,.tw-page [tabindex]:focus-visible,.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-accent);outline-offset:3px;border-radius:6px}
.tw-ledger{margin:0;display:grid;gap:12px}
.tw-ledger div{display:flex;align-items:baseline;gap:10px}
.tw-ledger dt{font-weight:500;color:var(--nk-text-muted);white-space:nowrap}
.tw-ledger div::after{content:"";order:1;flex:1;min-width:24px;border-bottom:2px dotted color-mix(in srgb,var(--nk-text) 22%,transparent);transform:translateY(-5px)}
.tw-ledger dd{order:2;margin:0;font-weight:600;color:var(--nk-text);white-space:nowrap}
`;

const NAV_CSS = `
.nk-nav{padding-block:18px!important;background:var(--nk-bg)!important;border-bottom:1px solid var(--nk-border)!important;position:relative;z-index:20}
.nk-nav>.container{max-width:1180px}
.nk-nav .navbar-brand{display:inline-flex;align-items:center;gap:10px;font-family:var(--nk-font-display)!important;font-style:italic;font-weight:500!important;font-size:1.6rem;letter-spacing:-.01em;color:var(--nk-primary)!important}
.nk-nav .navbar-brand::before{content:"";width:28px;height:28px;flex:none;border-radius:50%;background-image:radial-gradient(circle at 50% 120%,var(--nk-primary) 0 45%,transparent 46%),radial-gradient(circle at 50% 50%,var(--nk-bg) 0 58%,transparent 59%);background-color:var(--nk-accent)}
.nk-nav .nav-link{color:var(--nk-text)!important;font-weight:500!important;font-size:.98rem;padding:8px 14px!important;border-radius:999px}
.nk-nav .nav-link:hover{color:var(--nk-primary)!important;text-decoration:none}
.nk-nav .nav-link.active{background:color-mix(in srgb,var(--nk-primary) 9%,transparent);color:var(--nk-primary)!important}
.nk-nav .navbar-toggler{color:var(--nk-primary)!important;padding:0!important;width:48px;height:48px;border-radius:50%!important;border:1.5px solid color-mix(in srgb,var(--nk-primary) 35%,transparent)!important;font-size:0;line-height:0;background-image:linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor);background-size:20px 2px;background-position:center 19px,center 27px;background-repeat:no-repeat}
.nk-nav .navbar-toggler>*{display:none!important}
.nk-nav .dropdown-menu{border-radius:14px;padding:8px;background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;box-shadow:0 24px 48px -24px color-mix(in srgb,var(--nk-primary) 45%,transparent)}
.nk-nav .dropdown-item{border-radius:10px;padding:9px 14px;color:var(--nk-text)!important}
.nk-nav .dropdown-item:hover,.nk-nav .dropdown-item:focus{background:var(--nk-surface-2)}
@media (min-width:992px){.nk-nav .dropdown{position:relative}.nk-nav .dropdown-menu-end{right:0;left:auto}}
@media (max-width:991.98px){.nk-nav .navbar-collapse{margin-top:14px;padding:10px;border-radius:18px;background:var(--nk-surface);border:1px solid var(--nk-border)}.nk-nav .nav-link{padding:12px 14px!important}}
`;

const FOOTER_CSS = `
.tw-letter{padding:clamp(56px,8vw,96px) 0}
.tw-letter-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:40px 72px;align-items:center}
.tw-issues{list-style:none;margin:0;padding:0;border-top:1px solid color-mix(in srgb,var(--nk-bg) 22%,transparent)}
.tw-issues li{display:flex;gap:18px;align-items:baseline;padding:16px 0;border-bottom:1px solid color-mix(in srgb,var(--nk-bg) 22%,transparent);color:var(--nk-bg)}
.tw-issues span{flex:none;width:72px;font-size:.82rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--nk-accent) 35%,var(--nk-bg))}
.tw-issues b{font-family:var(--nk-font-display);font-weight:500;font-size:1.15rem}
@media (max-width:860px){.tw-letter-grid{grid-template-columns:minmax(0,1fr)}}
.tw-footer{padding:64px 0 32px;border-top:1px solid var(--nk-border);background:var(--nk-surface-2);font-size:.95rem}
.tw-foot-grid{display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:36px}
.tw-foot-brand{margin:0 0 12px;font-family:var(--nk-font-display);font-style:italic;font-size:1.7rem;color:var(--nk-primary)}
.tw-foot-grid address{font-style:normal;color:var(--nk-text-muted);margin:0}
.tw-foot-h{margin:6px 0 14px;font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text)}
.tw-foot-grid ul{list-style:none;margin:0;padding:0;display:grid;gap:9px;color:var(--nk-text-muted)}
.tw-foot-grid a{color:var(--nk-text-muted);text-decoration:none}
.tw-foot-grid a:hover{color:var(--nk-primary);text-decoration:underline}
.tw-disclosure{margin:48px 0 0;padding:24px 0 0;border-top:1px solid var(--nk-border);color:var(--nk-text-muted);font-size:.82rem;line-height:1.6;max-width:110ch}
.tw-disclosure p{margin:0 0 10px}
.tw-foot-base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;margin-top:20px;color:var(--nk-text-muted);font-size:.85rem}
.tw-foot-base p{margin:0}
@media (max-width:860px){.tw-foot-grid{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.tw-foot-grid{grid-template-columns:minmax(0,1fr)}}
`;

const PAGE_HEAD_CSS = `
.tw-phead{padding:clamp(56px,8vw,112px) 0 clamp(40px,6vw,72px);background-image:radial-gradient(ellipse 50% 80% at 88% 0%,color-mix(in srgb,var(--nk-accent) 16%,transparent),transparent 70%);background-color:var(--nk-bg)}
.tw-phead h1{margin:0;max-width:18ch;font-size:clamp(2.6rem,6vw,4.6rem);line-height:1.02;letter-spacing:-.025em;font-weight:500;text-wrap:balance}
.tw-phead .tw-intro{font-size:1.15rem}
`;

/* ── Home ───────────────────────────────────────────────────────────── */
const HOME_CSS = `
.tw-hero{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);background:var(--nk-bg)}
.tw-hero-media{margin:0;min-height:100%;position:relative}
.tw-hero-media img{display:block;width:100%;height:100%;min-height:560px;object-fit:cover;object-position:60% 50%}
.tw-hero-note{position:absolute;right:20px;bottom:20px;margin:0;padding:10px 16px;border-radius:999px;background:color-mix(in srgb,var(--nk-bg) 88%,transparent);color:var(--nk-text);font-size:.85rem;font-weight:500}
.tw-hero-copy{padding:clamp(48px,7vw,104px) clamp(20px,6vw,96px) clamp(48px,6vw,88px) clamp(28px,5vw,80px);max-width:760px}
.tw-hero h1{margin:0;font-size:clamp(2.5rem,5vw,4.3rem);line-height:1.04;letter-spacing:-.025em;font-weight:500;text-wrap:balance}
.tw-lede{margin:26px 0 0;font-size:1.15rem;color:var(--nk-text-muted);max-width:54ch}
.tw-hero .tw-ledger{margin-top:44px;padding-top:28px;border-top:1px solid var(--nk-border);max-width:520px}
@media (max-width:900px){.tw-hero{grid-template-columns:minmax(0,1fr)}.tw-hero-media img{min-height:0;height:auto;aspect-ratio:4/3;object-position:62% 40%}.tw-hero-copy{padding:40px 20px 56px}}
@media (max-width:420px){.tw-ledger dt{white-space:normal}}
.tw-snap-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:48px 72px;align-items:center}
.tw-checks{list-style:none;margin:28px 0 0;padding:0;display:grid;gap:12px}
.tw-checks li{display:flex;gap:12px;color:color-mix(in srgb,var(--nk-bg) 86%,var(--nk-primary))}
.tw-checks li::before{content:"✓";flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:color-mix(in srgb,var(--nk-accent) 30%,transparent);color:var(--nk-bg);font-size:.8rem;font-weight:700}
.tw-panel{border-radius:22px;background:var(--nk-surface);color:var(--nk-text);box-shadow:0 40px 80px -40px color-mix(in srgb,var(--nk-text) 70%,transparent);overflow:hidden}
.tw-panel p{margin:0}
.tw-panel-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;padding:18px 24px;border-bottom:1px solid var(--nk-border);background:var(--nk-surface-2)}
.tw-panel-head p{font-weight:600;font-size:.95rem}
.tw-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:color-mix(in srgb,var(--nk-primary) 12%,transparent);color:var(--nk-primary-2);font-weight:700;font-size:.85rem}
.tw-badge::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--nk-primary)}
.tw-panel-body{display:grid;grid-template-columns:230px minmax(0,1fr);gap:0}
.tw-inputs{margin:0;padding:22px 24px;border-right:1px solid var(--nk-border);display:grid;gap:14px;align-content:start}
.tw-inputs div{display:grid;gap:2px}
.tw-inputs dt{font-size:.8rem;font-weight:500;color:var(--nk-text-muted)}
.tw-inputs dd{margin:0;padding:8px 12px;border-radius:8px;border:1px solid var(--nk-border);background:var(--nk-bg);font-weight:600;font-variant-numeric:tabular-nums}
.tw-chart-wrap{padding:24px 24px 18px;display:grid;grid-template-columns:44px minmax(0,1fr);grid-template-rows:240px auto auto;column-gap:10px}
.tw-chart-y{display:flex;flex-direction:column;justify-content:space-between;font-size:.75rem;color:var(--nk-text-muted);text-align:right;padding-bottom:2px}
.tw-chart{position:relative;display:grid;grid-template-columns:repeat(15,minmax(0,1fr));align-items:end;gap:6px;border-bottom:1.5px solid var(--nk-text);background-image:linear-gradient(color-mix(in srgb,var(--nk-text) 9%,transparent) 1px,transparent 1px);background-size:100% 50%}
.tw-bar{position:relative;display:block;border-radius:5px 5px 0 0;background:color-mix(in srgb,var(--nk-accent) 45%,var(--nk-surface))}
.tw-bar>span{position:absolute;left:0;right:0;bottom:0;border-radius:5px 5px 0 0;background:var(--nk-primary)}
.tw-retire{position:absolute;top:0;bottom:0;left:25.4%;width:0;border-left:2px dashed var(--nk-text)}
.tw-retire span{position:absolute;top:0;left:6px;white-space:nowrap;font-size:.75rem;font-weight:700;padding:3px 8px;border-radius:6px;background:var(--nk-text);color:var(--nk-surface)}
.tw-chart-x{grid-column:2;display:flex;justify-content:space-between;padding-top:8px;font-size:.75rem;color:var(--nk-text-muted)}
.tw-legend{grid-column:2;display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:14px!important;font-size:.82rem;color:var(--nk-text-muted)}
.tw-legend span{display:inline-flex;align-items:center;gap:8px}
.tw-legend i{width:14px;height:10px;border-radius:3px}
.tw-key-med{background:color-mix(in srgb,var(--nk-accent) 45%,var(--nk-surface))}
.tw-key-low{background:var(--nk-primary)}
.tw-panel-foot{padding:14px 24px 18px;border-top:1px solid var(--nk-border);font-size:.8rem;color:var(--nk-text-muted)}
@media (max-width:980px){.tw-snap-grid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:640px){.tw-panel-body{grid-template-columns:minmax(0,1fr)}.tw-inputs{grid-template-columns:1fr 1fr;border-right:0;border-bottom:1px solid var(--nk-border);padding:18px}.tw-chart-wrap{padding:18px 14px 14px;grid-template-columns:34px minmax(0,1fr);grid-template-rows:200px auto auto}.tw-chart{gap:3px}.tw-retire span{font-size:.7rem}}
.tw-fees-grid{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:48px 80px;align-items:center}
.tw-calc{padding:30px;border-radius:22px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.tw-calc p{margin:0}
.tw-calc-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center;padding-bottom:18px;margin-bottom:22px;border-bottom:1px solid var(--nk-border)}
.tw-calc-title{font-family:var(--nk-font-display);font-size:1.4rem}
.tw-chips{display:flex;flex-wrap:wrap;gap:8px}
.tw-chips span{padding:5px 12px;border-radius:999px;background:var(--nk-surface-2);font-size:.82rem;font-weight:600}
.tw-calc-row+.tw-calc-row{margin-top:26px}
.tw-calc-label{font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-text-muted);margin-bottom:12px!important}
.tw-bar-line{display:grid;grid-template-columns:140px minmax(0,1fr) 92px;gap:14px;align-items:center;margin-bottom:10px}
.tw-bar-name{font-size:.92rem;font-weight:500}
.tw-hbar{display:block;height:16px;border-radius:999px;background:var(--nk-surface-2);overflow:hidden}
.tw-hbar span{display:block;height:100%;border-radius:999px}
.tw-hbar-aum span{background:color-mix(in srgb,var(--nk-text) 45%,var(--nk-surface))}
.tw-hbar-flat span{background:var(--nk-primary)}
.tw-w100{width:100%}.tw-w43{width:43%}.tw-w89{width:89%}
.tw-bar-val{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
.tw-calc-total{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px;margin-top:26px!important;padding:18px 20px;border-radius:14px;background:color-mix(in srgb,var(--nk-primary) 8%,transparent)}
.tw-calc-total strong{font-family:var(--nk-font-display);font-size:2rem;font-weight:500;color:var(--nk-primary-2)}
.tw-fine{margin-top:16px!important;font-size:.8rem;color:var(--nk-text-muted)}
@media (max-width:980px){.tw-fees-grid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:560px){.tw-calc{padding:22px 18px}.tw-bar-line{grid-template-columns:minmax(0,1fr) auto;gap:6px 10px}.tw-bar-line .tw-hbar{grid-column:1/-1;grid-row:2}}
.tw-svc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;margin-top:56px;border-top:1px solid var(--nk-border)}
.tw-svc{display:grid;grid-template-columns:56px minmax(0,1fr);gap:4px 20px;padding:34px 36px 34px 0;border-bottom:1px solid var(--nk-border)}
.tw-svc:nth-child(even){padding-left:36px;padding-right:0;border-left:1px solid var(--nk-border)}
.tw-svc-no{grid-row:span 3;font-family:var(--nk-font-display);font-style:italic;font-size:2.6rem;line-height:1;color:var(--nk-accent)}
.tw-svc h3{margin:0;font-size:1.55rem;font-weight:500;letter-spacing:-.01em}
.tw-svc p{margin:6px 0 0;color:var(--nk-text-muted)}
.tw-svc ul{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.tw-svc li{padding:4px 12px;border-radius:999px;background:var(--nk-bg);border:1px solid var(--nk-border);font-size:.85rem;font-weight:500}
@media (max-width:860px){.tw-svc-grid{grid-template-columns:minmax(0,1fr)}.tw-svc,.tw-svc:nth-child(even){padding:28px 0;border-left:0}}
.tw-who-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin-top:56px}
.tw-who{display:flex;flex-direction:column;margin:0}
.tw-who img{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;border-radius:22px 22px 22px 4px}
.tw-who figcaption{padding:22px 4px 0}
.tw-who h3{margin:0;font-size:1.5rem;font-weight:500}
.tw-who p{margin:8px 0 0;color:var(--nk-text-muted)}
.tw-who-plan{display:inline-block;margin-top:14px;font-size:.85rem;font-weight:600;color:var(--nk-primary)}
.tw-who-young img{object-position:40% 50%}
@media (max-width:900px){.tw-who-grid{grid-template-columns:minmax(0,1fr)}.tw-who{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:20px;align-items:center}.tw-who figcaption{padding:0}}
@media (max-width:520px){.tw-who{grid-template-columns:minmax(0,1fr)}.tw-who img{aspect-ratio:4/3}}
.tw-steps{list-style:none;margin:56px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px;position:relative}
.tw-steps::before{content:"";position:absolute;left:28px;right:28px;top:27px;border-top:2px dotted color-mix(in srgb,var(--nk-accent) 70%,transparent)}
.tw-step{position:relative}
.tw-step-dot{display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:var(--nk-bg);border:2px solid var(--nk-accent);font-family:var(--nk-font-display);font-style:italic;font-size:1.5rem;color:var(--nk-primary)}
.tw-step-when{display:block;margin-top:22px;font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--nk-accent) 72%,var(--nk-text))}
.tw-step h3{margin:6px 0 0;font-size:1.35rem;font-weight:500}
.tw-step p{margin:8px 0 0;color:var(--nk-text-muted);font-size:.97rem}
@media (max-width:900px){.tw-steps{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:40px}.tw-steps::before{display:none}}
@media (max-width:520px){.tw-steps{grid-template-columns:minmax(0,1fr)}}
.tw-people{background:var(--nk-surface-2)}
.tw-people-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:56px}
.tw-person{margin:0;padding:28px;border-radius:22px;background:var(--nk-surface);border:1px solid var(--nk-border);text-align:center}
.tw-person img{display:block;width:132px;height:132px;margin:0 auto;border-radius:50%;object-fit:cover;box-shadow:0 0 0 6px var(--nk-bg),0 0 0 7px var(--nk-border)}
.tw-person h3{margin:22px 0 0;font-size:1.35rem;font-weight:500}
.tw-person-role{display:block;margin-top:4px;color:var(--nk-primary);font-weight:600;font-size:.9rem}
.tw-person p{margin:12px 0 0;color:var(--nk-text-muted);font-size:.95rem}
@media (max-width:900px){.tw-people-grid{grid-template-columns:minmax(0,1fr)}.tw-person{display:grid;grid-template-columns:110px minmax(0,1fr);gap:0 22px;text-align:left;align-items:center}.tw-person img{width:110px;height:110px;grid-row:span 3}.tw-person h3{margin:0}}
@media (max-width:420px){.tw-person{grid-template-columns:minmax(0,1fr);text-align:center}.tw-person img{grid-row:auto}.tw-person h3{margin-top:18px}}
.tw-quotes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:48px;margin-top:8px}
.tw-quote{margin:0;padding-top:28px;border-top:2px solid var(--nk-accent)}
.tw-quote p{margin:0;font-family:var(--nk-font-display);font-size:clamp(1.4rem,2.4vw,1.9rem);line-height:1.3;letter-spacing:-.01em}
.tw-quote footer{margin-top:18px;color:var(--nk-text-muted);font-size:.95rem}
.tw-quote footer strong{color:var(--nk-text);font-weight:600}
@media (max-width:860px){.tw-quotes{grid-template-columns:minmax(0,1fr);gap:36px}}
`;

/* ── Plans & fees ───────────────────────────────────────────────────── */
const PLANS_CSS = `
.tw-plans{padding:8px 0 clamp(56px,8vw,96px)}
.tw-plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:stretch}
.tw-plan{display:flex;flex-direction:column;padding:34px 30px 30px;border-radius:24px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.tw-plan-tag{margin:0 0 18px;font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--nk-accent) 72%,var(--nk-text))}
.tw-plan h2{margin:0;font-size:2rem;font-weight:500}
.tw-plan-for{margin:8px 0 0;color:var(--nk-text-muted);min-height:3.2em}
.tw-plan-price{margin:26px 0 4px;font-family:var(--nk-font-display);font-size:3.2rem;line-height:1;letter-spacing:-.02em}
.tw-plan-price small{font-family:var(--nk-font);font-size:1rem;color:var(--nk-text-muted);letter-spacing:0;margin-left:6px}
.tw-plan-alt{margin:0 0 26px;font-size:.9rem;color:var(--nk-text-muted)}
.tw-plan .tw-btn{width:100%}
.tw-plan ul{list-style:none;margin:28px 0 0;padding:24px 0 0;border-top:1px solid var(--nk-border);display:grid;gap:12px}
.tw-plan li{display:flex;gap:12px;line-height:1.45}
.tw-plan li::before{content:"✓";flex:none;color:var(--nk-accent);font-weight:700}
.tw-plan-feature{background:var(--nk-primary);color:var(--nk-bg);border-color:var(--nk-primary);box-shadow:0 40px 70px -40px color-mix(in srgb,var(--nk-primary) 90%,transparent)}
.tw-plan-feature h2,.tw-plan-feature .tw-plan-price{color:var(--nk-bg)}
.tw-plan-feature .tw-plan-for,.tw-plan-feature .tw-plan-alt,.tw-plan-feature .tw-plan-price small{color:color-mix(in srgb,var(--nk-bg) 78%,var(--nk-primary))}
.tw-plan-feature .tw-plan-tag,.tw-plan-feature li::before{color:color-mix(in srgb,var(--nk-accent) 35%,var(--nk-bg))}
.tw-plan-feature ul{border-top-color:color-mix(in srgb,var(--nk-bg) 22%,transparent)}
.tw-once{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:18px 32px;margin-top:22px;padding:26px 30px;border-radius:24px;border:1.5px dashed color-mix(in srgb,var(--nk-accent) 60%,transparent);background:var(--nk-surface-2)}
.tw-once h2{margin:0;font-size:1.5rem;font-weight:500}
.tw-once p{margin:6px 0 0;color:var(--nk-text-muted);max-width:60ch}
.tw-once-price{font-family:var(--nk-font-display);font-size:2.2rem;white-space:nowrap}
@media (max-width:980px){.tw-plan-grid{grid-template-columns:minmax(0,1fr)}.tw-plan-for{min-height:0}}
.tw-incl{border-top:1px solid var(--nk-border)}
.tw-table-wrap{overflow-x:auto;position:relative;margin-top:40px;border-radius:20px;border:1px solid var(--nk-border);background:var(--nk-surface)}
.tw-table{width:100%;min-width:640px;border-collapse:collapse;margin:0}
.tw-table th,.tw-table td{padding:15px 20px;border-bottom:1px solid var(--nk-border);text-align:center}
.tw-table thead th{font-family:var(--nk-font-display);font-weight:500;font-size:1.15rem;background:var(--nk-surface-2)}
.tw-table th[scope="row"],.tw-table thead th:first-child{text-align:left}
.tw-table th[scope="row"]{font-weight:500}
.tw-table tbody tr:last-child>*{border-bottom:0}
.tw-table td:nth-child(3),.tw-table thead th:nth-child(3){background:color-mix(in srgb,var(--nk-primary) 6%,transparent)}
.tw-yes{color:var(--nk-primary);font-weight:700}
.tw-no{color:color-mix(in srgb,var(--nk-text) 35%,transparent)}
.tw-check-sec{background:var(--nk-surface-2);border-block:1px solid var(--nk-border)}
.tw-check-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:40px 72px;align-items:center}
.tw-fee-table{width:100%;border-collapse:separate;border-spacing:0;margin:0;background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:20px;overflow:hidden}
.tw-fee-table caption{caption-side:bottom;padding-top:14px;font-size:.82rem;color:var(--nk-text-muted);text-align:left}
.tw-fee-table th,.tw-fee-table td{padding:16px 22px;border-bottom:1px solid var(--nk-border);text-align:right;font-variant-numeric:tabular-nums}
.tw-fee-table th:first-child{text-align:left}
.tw-fee-table thead th{font-size:.78rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-text-muted);background:var(--nk-surface-2)}
.tw-fee-table tbody tr:last-child>*{border-bottom:0}
.tw-fee-table td:last-child{font-weight:700;color:var(--nk-primary-2)}
.tw-save{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:color-mix(in srgb,var(--nk-primary) 10%,transparent);font-size:.78rem}
@media (max-width:900px){.tw-check-grid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:480px){.tw-fee-table th,.tw-fee-table td{padding:14px 12px;font-size:.9rem}.tw-save{display:block;margin:4px 0 0}}
.tw-faq-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:40px 72px}
.tw-faq details{border-bottom:1px solid var(--nk-border)}
.tw-faq details:first-child{border-top:1px solid var(--nk-border)}
.tw-faq summary{padding:22px 48px 22px 0;font-family:var(--nk-font-display);font-size:1.3rem}
.tw-faq summary::after{top:50%;transform:translateY(-50%);color:var(--nk-accent);font-family:var(--nk-font)}
.tw-faq details p{margin:-6px 0 22px;color:var(--nk-text-muted);max-width:64ch}
@media (max-width:860px){.tw-faq-grid{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Our approach ───────────────────────────────────────────────────── */
const APPROACH_CSS = `
.tw-promise{position:relative;margin:0;padding:clamp(32px,5vw,56px);border-radius:28px;background:var(--nk-surface);border:1px solid var(--nk-border);box-shadow:0 30px 60px -40px color-mix(in srgb,var(--nk-text) 45%,transparent)}
.tw-promise::before{content:"";position:absolute;inset:12px;border-radius:20px;border:1px solid color-mix(in srgb,var(--nk-accent) 45%,transparent);pointer-events:none}
.tw-promise-grid{position:relative;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:32px 64px;align-items:end}
.tw-promise blockquote{margin:0}
.tw-promise blockquote p{margin:0 0 18px;font-family:var(--nk-font-display);font-size:clamp(1.35rem,2.4vw,1.85rem);line-height:1.35}
.tw-promise figcaption{color:var(--nk-text-muted);font-size:.95rem}
.tw-signature{display:block;margin-bottom:6px;font-family:var(--nk-font-display);font-style:italic;font-size:2.2rem;color:var(--nk-primary)}
@media (max-width:860px){.tw-promise-grid{grid-template-columns:minmax(0,1fr)}}
.tw-meetings{list-style:none;margin:48px 0 0;padding:0;counter-reset:meet}
.tw-meeting{display:grid;grid-template-columns:120px minmax(0,1fr) minmax(0,1fr);gap:12px 40px;padding:30px 0;border-top:1px solid var(--nk-border)}
.tw-meeting:last-child{border-bottom:1px solid var(--nk-border)}
.tw-meeting-when{font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--nk-accent) 72%,var(--nk-text));padding-top:6px}
.tw-meeting h3{margin:0;font-size:1.6rem;font-weight:500}
.tw-meeting p{margin:0;color:var(--nk-text-muted)}
.tw-meeting ul{margin:0;padding-left:18px;color:var(--nk-text-muted)}
@media (max-width:860px){.tw-meeting{grid-template-columns:minmax(0,1fr)}}
.tw-mix-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px 80px;align-items:center}
.tw-donut-wrap{display:grid;grid-template-columns:auto minmax(0,1fr);gap:32px;align-items:center;padding:32px;border-radius:24px;background:var(--nk-surface);color:var(--nk-text)}
.tw-donut{position:relative;width:220px;height:220px;border-radius:50%;background-image:conic-gradient(var(--nk-primary) 0 36%,color-mix(in srgb,var(--nk-primary) 55%,var(--nk-surface)) 36% 60%,var(--nk-accent) 60% 95%,color-mix(in srgb,var(--nk-accent) 35%,var(--nk-surface)) 95% 100%)}
.tw-donut::after{content:"";position:absolute;inset:44px;border-radius:50%;background:var(--nk-surface)}
.tw-donut span{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;font-family:var(--nk-font-display);font-size:1.6rem;line-height:1.1}
.tw-donut small{display:block;font-family:var(--nk-font);font-size:.75rem;color:var(--nk-text-muted)}
.tw-mix-legend{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.tw-mix-legend li{display:grid;grid-template-columns:14px minmax(0,1fr) auto;gap:12px;align-items:center;font-size:.95rem}
.tw-mix-legend i{width:14px;height:14px;border-radius:4px}
.tw-mix-legend b{font-variant-numeric:tabular-nums}
.tw-c1{background:var(--nk-primary)}.tw-c2{background:color-mix(in srgb,var(--nk-primary) 55%,var(--nk-surface))}.tw-c3{background:var(--nk-accent)}.tw-c4{background:color-mix(in srgb,var(--nk-accent) 35%,var(--nk-surface))}
.tw-principles{list-style:none;margin:28px 0 0;padding:0;display:grid;gap:18px}
.tw-principles li{padding-left:22px;border-left:2px solid color-mix(in srgb,var(--nk-accent) 60%,transparent)}
.tw-principles b{display:block;font-family:var(--nk-font-display);font-weight:500;font-size:1.25rem;color:var(--nk-bg)}
.tw-principles span{color:color-mix(in srgb,var(--nk-bg) 78%,var(--nk-primary))}
@media (max-width:980px){.tw-mix-grid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:560px){.tw-donut-wrap{grid-template-columns:minmax(0,1fr);justify-items:center;padding:24px}.tw-mix-legend{width:100%}}
.tw-bio-list{display:grid;gap:24px;margin-top:48px}
.tw-bio{display:grid;grid-template-columns:180px minmax(0,1fr) minmax(0,.8fr);gap:24px 40px;align-items:start;padding:32px;border-radius:24px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.tw-bio img{width:180px;height:180px;border-radius:50%;object-fit:cover}
.tw-bio h3{margin:0;font-size:1.7rem;font-weight:500}
.tw-bio-role{display:block;margin:4px 0 12px;color:var(--nk-primary);font-weight:600}
.tw-bio p{margin:0;color:var(--nk-text-muted)}
.tw-bio .tw-ledger{font-size:.92rem}
@media (max-width:980px){.tw-bio{grid-template-columns:140px minmax(0,1fr)}.tw-bio img{width:140px;height:140px}.tw-bio .tw-ledger{grid-column:1/-1}}
@media (max-width:560px){.tw-bio{grid-template-columns:minmax(0,1fr);padding:24px}.tw-bio img{width:120px;height:120px}}
`;

/* ── Shared HTML ────────────────────────────────────────────────────── */
const LETTER_HTML = `
<section class="tw-letter tw-band" aria-labelledby="tw-letter-h">
  <div class="tw-wrap tw-letter-grid">
    <div>
      <p class="tw-eyebrow">The Quarterly Letter</p>
      <h2 class="tw-h2" id="tw-letter-h">Four emails a year. <em>No market predictions.</em></h2>
      <p class="tw-intro">Plain-English notes on tax deadlines, retirement rules and the decisions our clients are weighing this quarter. Read by 6,200 households.</p>
      <div class="tw-actions"><a class="tw-btn tw-btn-light" href="/join">Get the letter</a></div>
    </div>
    <ul class="tw-issues" aria-label="Recent issues">
      <li><span>Q3 2026</span><b>Roth conversions in a low-income year</b></li>
      <li><span>Q2 2026</span><b>When to claim Social Security, by the numbers</b></li>
      <li><span>Q1 2026</span><b>Five paperwork jobs to finish before tax day</b></li>
      <li><span>Q4 2025</span><b>Giving to family without upsetting the plan</b></li>
    </ul>
  </div>
</section>`;

const FOOTER_HTML = `
<footer class="tw-footer">
  <div class="tw-wrap">
    <div class="tw-foot-grid">
      <div>
        <p class="tw-foot-brand">Tidewell</p>
        <address>Tidewell Financial Planning, LLC<br>412 SW Alder Street, Suite 300<br>Portland, OR 97204</address>
      </div>
      <div>
        <p class="tw-foot-h">Planning</p>
        <ul>
          <li><a href="/plans">Plans &amp; fees</a></li>
          <li><a href="/approach">Our approach</a></li>
          <li><a href="/book">Book an intro call</a></li>
        </ul>
      </div>
      <div>
        <p class="tw-foot-h">Contact</p>
        <ul>
          <li><a href="tel:+15035550187">(503) 555-0187</a></li>
          <li><a href="mailto:hello@tidewell.example">hello@tidewell.example</a></li>
          <li>Mon–Fri, 8:30–5:00</li>
        </ul>
      </div>
      <div>
        <p class="tw-foot-h">Stay informed</p>
        <ul>
          <li><a href="/join">The Quarterly Letter</a></li>
          <li><a href="mailto:hello@tidewell.example?subject=Form%20ADV%20request">Request our Form ADV</a></li>
        </ul>
      </div>
    </div>
    <div class="tw-disclosure">
      <p>Tidewell Financial Planning, LLC is a registered investment adviser. Registration does not imply a certain level of skill or training. Advisory services are offered only where Tidewell and its representatives are properly licensed or exempt from licensure.</p>
      <p>Content on this site is general information, not individual investment, tax or legal advice. Investing involves risk, including possible loss of principal. Projections and illustrations are hypothetical, do not reflect actual client results and are not guarantees of future performance.</p>
    </div>
    <div class="tw-foot-base">
      <p>© 2026 Tidewell Financial Planning, LLC</p>
      <p>Fee-only. Fiduciary. Independent.</p>
    </div>
  </div>
</footer>`;

const CHART = CHART_BARS.map(([outer, inner]) => `<span class="tw-bar tw-h${outer}"><span class="tw-h${inner}"></span></span>`).join("");

/* ── Pages ──────────────────────────────────────────────────────────── */
const HOME_HTML = `
<div class="tw-page">
<nav aria-label="Main"></nav>
<header class="tw-hero">
  <figure class="tw-hero-media">
    <img src="/media/generated/finance-couple-window.webp" alt="A couple in their sixties dancing together by a sunlit window" width="600" height="640">
    <figcaption class="tw-hero-note">Clients since 2014</figcaption>
  </figure>
  <div class="tw-hero-copy">
    <p class="tw-eyebrow">Fee-only financial planning · Portland, Oregon</p>
    <h1>Plan the next thirty years with someone who <em>works only for you.</em></h1>
    <p class="tw-lede">Tidewell builds retirement, tax and investment plans for families and pre-retirees for one flat annual fee. No commissions, no percentage of your savings and nothing to sell you.</p>
    <div class="tw-actions">
      <a class="tw-btn tw-btn-primary" href="/book">Book a free intro call</a>
      <a class="tw-btn tw-btn-quiet" href="/plans">See plans and fees</a>
    </div>
    <dl class="tw-ledger">
      <div><dt>Fiduciary duty, in writing</dt><dd>Always</dd></div>
      <div><dt>Commissions or product sales</dt><dd>None</dd></div>
      <div><dt>Households we plan for</dt><dd>340</dd></div>
      <div><dt>Average client relationship</dt><dd>11 years</dd></div>
    </dl>
  </div>
</header>

<main>
<section class="tw-sec tw-band" aria-labelledby="tw-snap-h">
  <div class="tw-wrap tw-snap-grid">
    <div>
      <p class="tw-eyebrow">What a plan looks like</p>
      <h2 class="tw-h2" id="tw-snap-h">Your whole financial life, <em>on one page.</em></h2>
      <p class="tw-intro">Every plan starts with a living projection of your savings, spending, taxes and Social Security. We update it at every review, so decisions are made with today's numbers.</p>
      <ul class="tw-checks">
        <li>When you can retire, and what you can spend</li>
        <li>How much tax each withdrawal will cost</li>
        <li>What happens in a bad decade for markets</li>
      </ul>
    </div>
    <div class="tw-panel" role="img" aria-label="Sample plan for a couple aged 52 and 50 with $840,000 invested, saving $2,400 a month and retiring at 63. In typical markets their savings peak at about $1.7 million at 64 and still exceed $500,000 at 94. In poor markets money still lasts to 94. Plan confidence is 88 percent.">
      <div class="tw-panel-head"><p>Sample plan · The Nguyens, 52 and 50</p><span class="tw-badge">88% plan confidence</span></div>
      <div class="tw-panel-body">
        <dl class="tw-inputs">
          <div><dt>Invested today</dt><dd>$840,000</dd></div>
          <div><dt>Saving each month</dt><dd>$2,400</dd></div>
          <div><dt>Retire at</dt><dd>63</dd></div>
          <div><dt>Spending in retirement</dt><dd>$7,500 / mo</dd></div>
          <div><dt>Social Security from</dt><dd>67</dd></div>
        </dl>
        <div class="tw-chart-wrap">
          <div class="tw-chart-y"><span>$2M</span><span>$1M</span><span>$0</span></div>
          <div class="tw-chart">${CHART}<span class="tw-retire"><span>Retire at 63</span></span></div>
          <div class="tw-chart-x"><span>Age 52</span><span>61</span><span>70</span><span>79</span><span>88</span><span>94</span></div>
          <p class="tw-legend"><span><i class="tw-key-med"></i>Typical markets</span><span><i class="tw-key-low"></i>Poor markets (1 year in 10)</span></p>
        </div>
      </div>
      <p class="tw-panel-foot">Hypothetical illustration: 60/40 portfolio, 2.5% inflation, 1,000 simulated market paths. Not a guarantee of future results.</p>
    </div>
  </div>
</section>

<section class="tw-sec" aria-labelledby="tw-fees-h">
  <div class="tw-wrap tw-fees-grid">
    <div>
      <p class="tw-eyebrow">Why a flat fee</p>
      <h2 class="tw-h2" id="tw-fees-h">A 1% fee sounds small. <em>Over twenty years, it isn't.</em></h2>
      <p class="tw-intro">Most advisers charge a percentage of what you have invested, so their pay rises with your savings even when the work does not. We charge one flat fee, agreed in advance.</p>
      <div class="tw-actions"><a class="tw-more" href="/plans">Compare our plans <span aria-hidden="true">→</span></a></div>
    </div>
    <div class="tw-calc">
      <div class="tw-calc-head">
        <p class="tw-calc-title">Fee comparison</p>
        <p class="tw-chips"><span>$1.2M invested</span><span>5% growth a year</span><span>20 years</span></p>
      </div>
      <div class="tw-calc-row">
        <p class="tw-calc-label">Fees paid over 20 years</p>
        <div class="tw-bar-line"><span class="tw-bar-name">1% of assets</span><span class="tw-hbar tw-hbar-aum"><span class="tw-w100"></span></span><span class="tw-bar-val">$373,000</span></div>
        <div class="tw-bar-line"><span class="tw-bar-name">Tidewell flat fee</span><span class="tw-hbar tw-hbar-flat"><span class="tw-w43"></span></span><span class="tw-bar-val">$161,000</span></div>
      </div>
      <div class="tw-calc-row">
        <p class="tw-calc-label">Left in your portfolio after 20 years</p>
        <div class="tw-bar-line"><span class="tw-bar-name">1% of assets</span><span class="tw-hbar tw-hbar-aum"><span class="tw-w89"></span></span><span class="tw-bar-val">$2.60M</span></div>
        <div class="tw-bar-line"><span class="tw-bar-name">Tidewell flat fee</span><span class="tw-hbar tw-hbar-flat"><span class="tw-w100"></span></span><span class="tw-bar-val">$2.93M</span></div>
      </div>
      <p class="tw-calc-total"><span>You keep about</span><strong>$326,000 more</strong></p>
      <p class="tw-fine">Assumes 5% annual growth before fees, a 1% fee charged on year-end balances, and a $6,000 flat fee rising 3% a year. Illustrative only; actual results will vary.</p>
    </div>
  </div>
</section>

<section class="tw-sec tw-services" aria-labelledby="tw-svc-h">
  <div class="tw-wrap">
    <p class="tw-eyebrow">What we plan for</p>
    <h2 class="tw-h2" id="tw-svc-h">Four questions every plan answers.</h2>
    <div class="tw-svc-grid">
      <article class="tw-svc"><span class="tw-svc-no" aria-hidden="true">i.</span><h3>When can we retire?</h3><p>A year-by-year income plan from savings, pensions and Social Security, stress-tested against bad markets and long lives.</p><ul><li>Retirement income</li><li>Social Security timing</li></ul></article>
      <article class="tw-svc"><span class="tw-svc-no" aria-hidden="true">ii.</span><h3>How do we pay less tax?</h3><p>Which account to draw from first, when to convert to Roth and how to time big gains, planned years ahead rather than every April.</p><ul><li>Roth conversions</li><li>Withdrawal order</li></ul></article>
      <article class="tw-svc"><span class="tw-svc-no" aria-hidden="true">iii.</span><h3>Is our money invested well?</h3><p>Low-cost, globally diversified portfolios rebalanced by rule, with the right assets in the right accounts.</p><ul><li>Investment management</li><li>Asset location</li></ul></article>
      <article class="tw-svc"><span class="tw-svc-no" aria-hidden="true">iv.</span><h3>Who is looked after if we're not here?</h3><p>Wills, beneficiaries, insurance and gifting coordinated with your attorney, so your wishes are clear and your family is covered.</p><ul><li>Estate coordination</li><li>Insurance review</li></ul></article>
    </div>
  </div>
</section>

<section class="tw-sec" aria-labelledby="tw-who-h">
  <div class="tw-wrap">
    <p class="tw-eyebrow">Who we help</p>
    <h2 class="tw-h2" id="tw-who-h">Three kinds of households, <em>one kind of advice.</em></h2>
    <div class="tw-who-grid">
      <figure class="tw-who tw-who-young">
        <img src="/media/generated/finance-young-family.webp" alt="A young family and their dog lying on a picnic blanket in the park" width="840" height="560" loading="lazy">
        <figcaption><h3>Growing families</h3><p>Two careers, children and a mortgage. We balance college, retirement and today's life so nothing crowds out the rest.</p><span class="tw-who-plan">Most choose Foundations</span></figcaption>
      </figure>
      <figure class="tw-who">
        <img src="/media/generated/finance-couple-embrace.webp" alt="A smiling couple in their sixties embracing by a bright window" width="560" height="560" loading="lazy">
        <figcaption><h3>Five years from retirement</h3><p>The decade when decisions compound fastest. We set the date, the income and the tax plan, then manage the investments that fund it.</p><span class="tw-who-plan">Most choose Complete</span></figcaption>
      </figure>
      <figure class="tw-who">
        <img src="/media/generated/finance-generations.webp" alt="A grandfather and his adult grandson looking at a tablet together outdoors" width="560" height="560" loading="lazy">
        <figcaption><h3>Business owners and heirs</h3><p>Selling a company or receiving an inheritance. We plan the sale, the tax and what the money should do next, for more than one generation.</p><span class="tw-who-plan">Most choose Family Office</span></figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="tw-sec tw-services" aria-labelledby="tw-steps-h">
  <div class="tw-wrap">
    <p class="tw-eyebrow">Getting started</p>
    <h2 class="tw-h2" id="tw-steps-h">Your first ninety days.</h2>
    <ol class="tw-steps">
      <li class="tw-step"><span class="tw-step-dot" aria-hidden="true">1</span><span class="tw-step-when">Week 1</span><h3>A free intro call</h3><p>Thirty minutes to talk about what you want. If we're not the right fit, we'll say so and point you elsewhere.</p></li>
      <li class="tw-step"><span class="tw-step-dot" aria-hidden="true">2</span><span class="tw-step-when">Weeks 2–3</span><h3>Discovery</h3><p>We gather statements, tax returns and goals through a secure portal. No forms longer than they need to be.</p></li>
      <li class="tw-step"><span class="tw-step-dot" aria-hidden="true">3</span><span class="tw-step-when">Week 6</span><h3>Your plan</h3><p>We walk you through the plan, the trade-offs and the first ten actions, in order of impact.</p></li>
      <li class="tw-step"><span class="tw-step-dot" aria-hidden="true">4</span><span class="tw-step-when">Every quarter</span><h3>Ongoing reviews</h3><p>We track every action to done, and revisit the plan whenever life or the tax code changes.</p></li>
    </ol>
  </div>
</section>

<section class="tw-sec tw-people" aria-labelledby="tw-people-h">
  <div class="tw-wrap">
    <p class="tw-eyebrow">Your planners</p>
    <h2 class="tw-h2" id="tw-people-h">Small by design, so you always talk to <em>the person who knows your plan.</em></h2>
    <div class="tw-people-grid">
      <figure class="tw-person"><img src="/media/generated/finance-advisor-walter.webp" alt="Portrait of Walter Hayes" width="360" height="360" loading="lazy"><figcaption><h3>Walter Hayes</h3><span class="tw-person-role">Founding partner</span><p>Twenty-four years in retirement income planning. Former pension actuary.</p></figcaption></figure>
      <figure class="tw-person"><img src="/media/generated/finance-advisor-elena.webp" alt="Portrait of Elena Park" width="360" height="360" loading="lazy"><figcaption><h3>Elena Park</h3><span class="tw-person-role">Partner, tax planning</span><p>Enrolled agent and former tax attorney. Leads every Roth and withdrawal strategy.</p></figcaption></figure>
      <figure class="tw-person"><img src="/media/generated/finance-advisor-marcus.webp" alt="Portrait of Marcus Bell" width="360" height="360" loading="lazy"><figcaption><h3>Marcus Bell</h3><span class="tw-person-role">Senior planner</span><p>Works with families and business owners, from first home to company sale.</p></figcaption></figure>
    </div>
  </div>
</section>

<section class="tw-sec" aria-labelledby="tw-quotes-h">
  <div class="tw-wrap">
    <h2 class="tw-sr" id="tw-quotes-h">What clients say</h2>
    <div class="tw-quotes">
      <blockquote class="tw-quote"><p>“We retired two years earlier than we thought we could, and for the first time we know exactly what we can spend.”</p><footer><strong>Ruth and Daniel O.</strong>, clients since 2017</footer></blockquote>
      <blockquote class="tw-quote"><p>“Elena's Roth plan will save us more in tax than we will pay Tidewell in the next decade. That's the whole review, really.”</p><footer><strong>Priya S.</strong>, client since 2021</footer></blockquote>
    </div>
  </div>
</section>
${LETTER_HTML}
</main>
${FOOTER_HTML}
</div>`;

const PLANS_HTML = `
<div class="tw-page">
<nav aria-label="Main"></nav>
<header class="tw-phead">
  <div class="tw-wrap">
    <p class="tw-eyebrow">Plans &amp; fees</p>
    <h1>One flat fee. <em>Everything included.</em></h1>
    <p class="tw-intro">You will know the cost before we start, and it will not grow just because your savings do. Fees are billed quarterly and can be paid from your accounts or by card.</p>
  </div>
</header>

<main>
<section class="tw-plans" aria-label="Plans">
  <div class="tw-wrap">
    <div class="tw-plan-grid">
      <article class="tw-plan">
        <p class="tw-plan-tag">Planning only</p>
        <h2>Foundations</h2>
        <p class="tw-plan-for">For families building savings who manage their own investments.</p>
        <p class="tw-plan-price">$2,400<small>/ year</small></p>
        <p class="tw-plan-alt">or $200 a month</p>
        <a class="tw-btn tw-btn-quiet" href="/book">Book an intro call</a>
        <ul>
          <li>Full financial plan and projection</li>
          <li>Budget, college and home planning</li>
          <li>Investment recommendations you carry out</li>
          <li>Two review meetings a year</li>
          <li>Email your planner any time</li>
        </ul>
      </article>
      <article class="tw-plan tw-plan-feature">
        <p class="tw-plan-tag">Most chosen</p>
        <h2>Complete</h2>
        <p class="tw-plan-for">For pre-retirees and retirees who want planning and investing handled.</p>
        <p class="tw-plan-price">$6,000<small>/ year</small></p>
        <p class="tw-plan-alt">for portfolios up to $3 million</p>
        <a class="tw-btn tw-btn-light" href="/book">Book an intro call</a>
        <ul>
          <li>Everything in Foundations</li>
          <li>Investment management and rebalancing</li>
          <li>Roth conversion and withdrawal planning</li>
          <li>Annual tax-return review</li>
          <li>Four reviews a year, plus any time you need us</li>
        </ul>
      </article>
      <article class="tw-plan">
        <p class="tw-plan-tag">Complex situations</p>
        <h2>Family Office</h2>
        <p class="tw-plan-for">For business owners, inheritances and multi-generation families.</p>
        <p class="tw-plan-price">$12,000<small>/ year</small></p>
        <p class="tw-plan-alt">starting fee, quoted before you commit</p>
        <a class="tw-btn tw-btn-quiet" href="/book">Book an intro call</a>
        <ul>
          <li>Everything in Complete</li>
          <li>Business sale and succession planning</li>
          <li>Estate coordination with your attorney</li>
          <li>Family meetings across generations</li>
          <li>A dedicated two-planner team</li>
        </ul>
      </article>
    </div>
    <div class="tw-once">
      <div><h2>One-time plan</h2><p>Not ready for an ongoing relationship? We build a complete plan in six weeks, hand it over, and you carry it out.</p></div>
      <p class="tw-once-price">$3,500</p>
    </div>
  </div>
</section>

<section class="tw-sec tw-incl" aria-labelledby="tw-incl-h">
  <div class="tw-wrap">
    <p class="tw-eyebrow">What's included</p>
    <h2 class="tw-h2" id="tw-incl-h">Compare the plans side by side.</h2>
    <div class="tw-table-wrap" tabindex="0" role="region" aria-label="Plan comparison table, scrolls sideways on small screens">
      <table class="tw-table">
        <thead><tr><th scope="col">Service</th><th scope="col">Foundations</th><th scope="col">Complete</th><th scope="col">Family Office</th></tr></thead>
        <tbody>
          <tr><th scope="row">Financial plan and projection</th><td><span class="tw-yes">✓</span><span class="tw-sr">Included</span></td><td><span class="tw-yes">✓</span><span class="tw-sr">Included</span></td><td><span class="tw-yes">✓</span><span class="tw-sr">Included</span></td></tr>
          <tr><th scope="row">Investment management</th><td><span class="tw-no">—</span><span class="tw-sr">Not included</span></td><td><span class="tw-yes">✓</span><span class="tw-sr">Included</span></td><td><span class="tw-yes">✓</span><span class="tw-sr">Included</span></td></tr>
          <tr><th scope="row">Tax planning</th><td>Annual check-in</td><td>Year-round</td><td>Year-round, with your CPA</td></tr>
          <tr><th scope="row">Estate coordination</th><td><span class="tw-no">—</span><span class="tw-sr">Not included</span></td><td>Beneficiary review</td><td>Full, with your attorney</td></tr>
          <tr><th scope="row">Review meetings</th><td>2 a year</td><td>4 a year</td><td>Monthly if needed</td></tr>
          <tr><th scope="row">Planner team</th><td>1 planner</td><td>1 planner</td><td>2 planners</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="tw-sec tw-check-sec" aria-labelledby="tw-check-h">
  <div class="tw-wrap tw-check-grid">
    <div>
      <p class="tw-eyebrow">Fee check</p>
      <h2 class="tw-h2" id="tw-check-h">What a percentage fee would cost you <em>this year.</em></h2>
      <p class="tw-intro">Find the row nearest your portfolio. The difference is yours to keep, every year, and it compounds.</p>
    </div>
    <table class="tw-fee-table">
      <caption>Complete plan fee shown for portfolios up to $3 million; larger portfolios use Family Office pricing.</caption>
      <thead><tr><th scope="col">Portfolio</th><th scope="col">At 1% a year</th><th scope="col">Tidewell</th></tr></thead>
      <tbody>
        <tr><th scope="row">$500,000</th><td>$5,000</td><td>$2,400 <span class="tw-save">Foundations</span></td></tr>
        <tr><th scope="row">$1,000,000</th><td>$10,000</td><td>$6,000 <span class="tw-save">saves $4,000</span></td></tr>
        <tr><th scope="row">$2,000,000</th><td>$20,000</td><td>$6,000 <span class="tw-save">saves $14,000</span></td></tr>
        <tr><th scope="row">$4,000,000</th><td>$40,000</td><td>$12,000 <span class="tw-save">saves $28,000</span></td></tr>
      </tbody>
    </table>
  </div>
</section>

<section class="tw-sec" aria-labelledby="tw-faq-h">
  <div class="tw-wrap tw-faq-grid">
    <div>
      <p class="tw-eyebrow">Questions</p>
      <h2 class="tw-h2" id="tw-faq-h">Fees, answered plainly.</h2>
      <p class="tw-intro">Anything else? Ask on your intro call. It is free and there is no follow-up sales pitch.</p>
    </div>
    <div class="tw-faq">
      <details open><summary>Are there any other fees?</summary><p>No advisory fees beyond your plan fee. You will still pay the funds' own expense ratios, which in our portfolios average 0.07% a year, and any trading costs charged by your custodian.</p></details>
      <details><summary>Where is our money held?</summary><p>At an independent custodian, in accounts in your name. We can trade and rebalance, but we can never withdraw money to ourselves.</p></details>
      <details><summary>What does "fee-only fiduciary" mean?</summary><p>We are paid only by you, never by fund companies or insurers, and we are legally required to put your interests first. We sign that commitment at our first meeting.</p></details>
      <details><summary>Can we change plans later?</summary><p>Yes. Move up or down at any quarter. If you leave, we refund the unused part of the quarter and hand over your full plan.</p></details>
      <details><summary>Do you work with clients outside Oregon?</summary><p>Yes. Two-thirds of our clients meet with us by video. We are registered to advise clients in 21 states.</p></details>
    </div>
  </div>
</section>
${LETTER_HTML}
</main>
${FOOTER_HTML}
</div>`;

const APPROACH_HTML = `
<div class="tw-page">
<nav aria-label="Main"></nav>
<header class="tw-phead">
  <div class="tw-wrap">
    <p class="tw-eyebrow">Our approach</p>
    <h1>Advice you can check, <em>from people you can reach.</em></h1>
    <p class="tw-intro">We keep our process simple enough to explain on one page, and our investments boring enough to stay with through a bad year. Here is how both work.</p>
  </div>
</header>

<main>
<section class="tw-sec" aria-labelledby="tw-promise-h">
  <div class="tw-wrap">
    <h2 class="tw-sr" id="tw-promise-h">Our fiduciary promise</h2>
    <figure class="tw-promise">
      <div class="tw-promise-grid">
        <blockquote>
          <p>“We will act in your best interest at all times. We will tell you what everything costs before you pay it. We will never earn a commission, and we will put all of this in writing before we begin.”</p>
        </blockquote>
        <figcaption><span class="tw-signature">Walter Hayes</span>Founding partner, on behalf of every Tidewell planner</figcaption>
      </div>
    </figure>
  </div>
</section>

<section class="tw-sec tw-services" aria-labelledby="tw-meet-h">
  <div class="tw-wrap">
    <p class="tw-eyebrow">The planning year</p>
    <h2 class="tw-h2" id="tw-meet-h">Four meetings, each with a job to do.</h2>
    <ol class="tw-meetings">
      <li class="tw-meeting"><span class="tw-meeting-when">January</span><div><h3>Tax season plan</h3><p>Estimated payments, contributions and any conversions for the year ahead.</p></div><ul><li>Contribution targets</li><li>Roth conversion amount</li></ul></li>
      <li class="tw-meeting"><span class="tw-meeting-when">April</span><div><h3>Cash flow and goals</h3><p>Spending, big purchases and anything that changed at work or at home.</p></div><ul><li>Updated budget</li><li>Goal timeline</li></ul></li>
      <li class="tw-meeting"><span class="tw-meeting-when">July</span><div><h3>Investments and risk</h3><p>How the portfolio is doing against the plan, not against the headlines.</p></div><ul><li>Rebalancing check</li><li>Insurance review</li></ul></li>
      <li class="tw-meeting"><span class="tw-meeting-when">October</span><div><h3>Year-end moves</h3><p>Gifting, harvesting losses and required withdrawals before December 31.</p></div><ul><li>Gifting plan</li><li>Year-end checklist</li></ul></li>
    </ol>
  </div>
</section>

<section class="tw-sec tw-band" aria-labelledby="tw-mix-h">
  <div class="tw-wrap tw-mix-grid">
    <div>
      <p class="tw-eyebrow">How we invest</p>
      <h2 class="tw-h2" id="tw-mix-h">Global, low-cost and <em>deliberately dull.</em></h2>
      <ul class="tw-principles">
        <li><b>Own the whole market</b><span>Thousands of companies across 40 countries, through index funds.</span></li>
        <li><b>Keep costs tiny</b><span>Our portfolios' funds average 0.07% a year in expenses.</span></li>
        <li><b>Rebalance by rule</b><span>When a holding drifts 5% from target, not when the news is loud.</span></li>
        <li><b>Match risk to the plan</b><span>Your mix is set by when you need the money, not by the market mood.</span></li>
      </ul>
    </div>
    <div class="tw-donut-wrap" role="img" aria-label="Sample balanced portfolio: 36% US stocks, 24% international stocks, 35% bonds and 5% cash.">
      <div class="tw-donut"><span>60 / 40<small>sample mix</small></span></div>
      <ul class="tw-mix-legend">
        <li><i class="tw-c1"></i>US stocks<b>36%</b></li>
        <li><i class="tw-c2"></i>International stocks<b>24%</b></li>
        <li><i class="tw-c3"></i>Bonds<b>35%</b></li>
        <li><i class="tw-c4"></i>Cash<b>5%</b></li>
      </ul>
    </div>
  </div>
</section>

<section class="tw-sec" aria-labelledby="tw-team-h">
  <div class="tw-wrap">
    <p class="tw-eyebrow">The team</p>
    <h2 class="tw-h2" id="tw-team-h">Three planners, <em>340 households.</em></h2>
    <p class="tw-intro">We cap each planner at 120 households so that when you call, you get someone who remembers your last conversation.</p>
    <div class="tw-bio-list">
      <article class="tw-bio">
        <img src="/media/generated/finance-advisor-walter.webp" alt="Portrait of Walter Hayes" width="360" height="360" loading="lazy">
        <div><h3>Walter Hayes</h3><span class="tw-bio-role">Founding partner</span><p>Walter spent eleven years as a pension actuary before founding Tidewell in 2009. He leads retirement income planning and still takes every new client's intro call himself.</p></div>
        <dl class="tw-ledger"><div><dt>Planning since</dt><dd>2002</dd></div><div><dt>Focus</dt><dd>Retirement income</dd></div><div><dt>Outside work</dt><dd>Rowing</dd></div></dl>
      </article>
      <article class="tw-bio">
        <img src="/media/generated/finance-advisor-elena.webp" alt="Portrait of Elena Park" width="360" height="360" loading="lazy">
        <div><h3>Elena Park</h3><span class="tw-bio-role">Partner, tax planning</span><p>Elena practised tax law for eight years and is an enrolled agent. She designs the withdrawal and Roth conversion strategy in every Complete and Family Office plan.</p></div>
        <dl class="tw-ledger"><div><dt>Joined</dt><dd>2016</dd></div><div><dt>Focus</dt><dd>Tax strategy</dd></div><div><dt>Outside work</dt><dd>Ceramics</dd></div></dl>
      </article>
      <article class="tw-bio">
        <img src="/media/generated/finance-advisor-marcus.webp" alt="Portrait of Marcus Bell" width="360" height="360" loading="lazy">
        <div><h3>Marcus Bell</h3><span class="tw-bio-role">Senior planner</span><p>Marcus works with growing families and business owners, from first home purchase to company sale. He previously ran corporate finance for a regional manufacturer.</p></div>
        <dl class="tw-ledger"><div><dt>Joined</dt><dd>2019</dd></div><div><dt>Focus</dt><dd>Families, owners</dd></div><div><dt>Outside work</dt><dd>Youth soccer</dd></div></dl>
      </article>
    </div>
  </div>
</section>
${LETTER_HTML}
</main>
${FOOTER_HTML}
</div>`;

const template: StarterTemplate = {
  id: "original-finance",
  name: "Tidewell",
  tagline: "Fee-only financial planning site with a projection panel, flat-fee comparator, plans, advisors and intro-call booking",
  category: "finance",
  tags: ["finance", "financial planning", "wealth", "advisor", "retirement", "fiduciary", "accounting", "investment", "fees", "booking"],
  source: "original",
  modules: ["bookings", "newsletter"],
  theme: {
    name: "Tidewell",
    mode: "light",
    primary: "#1f4d3f",
    primary2: "#163a2f",
    accent: "#a57a2c",
    bg: "#f6f2ea",
    surface: "#fffdf9",
    surface2: "#eee7da",
    border: "#ddd2bf",
    text: "#1c211e",
    textMuted: "#5a5f59",
    font: `"Hanken Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    fontDisplay: `"Newsreader", Georgia, "Times New Roman", serif`,
    googleFonts: ["Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500", "Hanken Grotesk:wght@400;500;600;700"],
    radius: "14px",
    radiusSm: "8px",
    dark: {
      name: "Tidewell Evening",
      mode: "dark",
      primary: "#86d6b0",
      primary2: "#b3ead0",
      accent: "#c9a25a",
      bg: "#101815",
      surface: "#17211d",
      surface2: "#1d2a24",
      border: "#2d3b35",
      text: "#eef1ec",
      textMuted: "#a7b1aa",
      font: `"Hanken Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      fontDisplay: `"Newsreader", Georgia, "Times New Roman", serif`,
      googleFonts: ["Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500", "Hanken Grotesk:wght@400;500;600;700"],
      radius: "14px",
      radiusSm: "8px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: BASE_CSS + NAV_CSS + HOME_CSS + HEIGHT_CSS + FOOTER_CSS },
    { title: "Plans & fees", slug: "plans", isHome: false, html: PLANS_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + PLANS_CSS + FOOTER_CSS },
    { title: "Our approach", slug: "approach", isHome: false, html: APPROACH_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + APPROACH_CSS + FOOTER_CSS },
  ],
};

registerTemplate(template);
export default template;
