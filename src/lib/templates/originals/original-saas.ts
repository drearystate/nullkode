/**
 * Driftline — SaaS flagship (original-saas)
 *
 * Art direction
 * - Mood: calm precision. A release "control room" for product teams, shown as live
 *   product UI built in HTML/CSS rather than a screenshot.
 * - Type: Geist for display and text (tight tracking, 600 weight headlines) with
 *   Geist Mono for kickers, dates and UI metadata.
 * - Palette: ink #0c0e14 on paper #fbfbfd, an ultraviolet signal colour (#5b45f5)
 *   for "in progress" and a mint (#12a57b) reserved for "shipped".
 * - Layout grammar: centred hero on an ink field that turns to paper halfway down the
 *   product window; thin 1px rules; three-column bento of UI fragments; mono kickers.
 * - Signature: the release timeline (swimlanes, today marker, milestone, launch
 *   checklist) and a CSS-only monthly/annual billing switch on the Pricing page.
 * - Dark mode: the ink surfaces (hero, product window, security band, featured plan)
 *   use --dl-ink / --dl-paper, derived from the theme tokens, so they stay dark
 *   when a signed-in visitor picks the dark theme instead of inverting.
 * - Pages: Home, Pricing (plans, comparison table, FAQ), Changelog.
 * - Modules: auth (Log in / Sign up in the shared menu), feature-voting (public roadmap).
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";

const MONO = `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
const IMG = "/templates/originals/original-saas";

/* ── Shared CSS (every Driftline page) ─────────────────────────────── */
const BASE_CSS = `
.dl-page,.nk-nav{--dl-ink:var(--nk-text);--dl-paper:var(--nk-bg)}
html[data-theme="dark"] .dl-page,html[data-theme="dark"] .nk-nav{--dl-ink:var(--nk-bg);--dl-paper:var(--nk-text)}
.dl-wrap{width:min(1180px,100% - 40px);margin-inline:auto}
.dl-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.dl-kicker{font-family:${MONO};font-size:.75rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-primary);margin:0 0 14px}
.dl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 20px;border-radius:10px;border:1px solid transparent;font-weight:600;font-size:.95rem;letter-spacing:-.01em;text-decoration:none;transition:background-color .2s,color .2s,border-color .2s,transform .2s}
.dl-btn:hover{text-decoration:none;transform:translateY(-1px)}
.dl-btn-primary{background:var(--nk-primary);color:var(--nk-bg);box-shadow:0 12px 30px -12px color-mix(in srgb,var(--nk-primary) 75%,transparent)}
.dl-btn-primary:hover{background:var(--nk-primary-2);color:var(--nk-bg)}
.dl-btn-ghost{color:var(--dl-paper);border-color:color-mix(in srgb,var(--dl-paper) 28%,transparent)}
.dl-btn-ghost:hover{color:var(--dl-paper);background:color-mix(in srgb,var(--dl-paper) 10%,transparent)}
.dl-btn-line{color:var(--nk-text);background:var(--nk-surface);border-color:var(--nk-border)}
.dl-btn-line:hover{color:var(--nk-text);border-color:color-mix(in srgb,var(--nk-text) 35%,var(--nk-border))}
.dl-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}
.dl-page a:focus-visible,.dl-page summary:focus-visible,.dl-page [tabindex]:focus-visible,.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:2px solid var(--nk-primary);outline-offset:3px;border-radius:6px}
.dl-head{max-width:720px;margin-bottom:clamp(36px,5vw,56px)}
.dl-head h2,.dl-h2{font-size:clamp(2rem,3.8vw,3rem);line-height:1.06;letter-spacing:-.04em;font-weight:600;margin:0;text-wrap:balance}
.dl-head>p:not(.dl-kicker){margin:18px 0 0;font-size:1.1rem;line-height:1.6;color:var(--nk-text-muted);max-width:60ch}
.dl-head-center{text-align:center;margin-inline:auto}
.dl-tag{flex:none;display:inline-block;font-family:${MONO};font-size:.72rem;font-weight:600;letter-spacing:.02em;padding:3px 9px;border-radius:6px;line-height:1.35}
.dl-tag-new{background:color-mix(in srgb,var(--nk-primary) 14%,transparent);color:var(--nk-primary-2)}
.dl-tag-imp{background:color-mix(in srgb,var(--nk-accent) 16%,transparent);color:color-mix(in srgb,var(--nk-accent) 50%,var(--nk-text))}
.dl-tag-fix{background:color-mix(in srgb,var(--nk-text) 8%,transparent);color:var(--nk-text-muted)}
`;

const NAV_CSS = `
.nk-nav{padding-block:14px;background:color-mix(in srgb,var(--nk-bg) 90%,transparent)!important;border-bottom:1px solid var(--nk-border)!important;position:relative;z-index:20}
.nk-nav .navbar-brand{display:inline-flex;align-items:center;gap:10px;font-weight:600!important;font-size:1.12rem;letter-spacing:-.03em;color:var(--nk-text)!important}
.nk-nav .navbar-brand::before{content:"";width:22px;height:22px;flex:none;border-radius:6px 50% 6px 50%;background:linear-gradient(135deg,var(--nk-primary) 0 50%,var(--nk-accent) 50% 100%)}
.nk-nav .nav-link{color:var(--nk-text-muted)!important;font-size:.94rem;font-weight:500!important;padding:8px 12px!important;border-radius:8px}
.nk-nav .nav-link:hover,.nk-nav .nav-link.active{color:var(--nk-text)!important;text-decoration:none}
.nk-nav .nav-link.active{background:color-mix(in srgb,var(--nk-text) 6%,transparent)}
.nk-nav .btn{background:var(--nk-text)!important;color:var(--nk-bg)!important;border-radius:9px!important;padding:8px 16px!important;font-weight:600;box-shadow:none}
.nk-nav .navbar-toggler{color:var(--nk-text)!important;border-radius:10px;padding:0!important;width:44px;height:40px;font-size:0;line-height:0;background-image:linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor);background-size:22px 2px;background-position:center 13px,center 19px,center 25px;background-repeat:no-repeat}
.nk-nav .navbar-toggler>*{display:none!important}
.nk-nav .dropdown-menu{border-radius:12px;padding:6px;background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;box-shadow:0 24px 50px -24px color-mix(in srgb,var(--nk-text) 40%,transparent)}
.nk-nav .dropdown-item{border-radius:8px;padding:8px 12px;color:var(--nk-text)!important;font-size:.93rem}
.nk-nav .dropdown-item:hover,.nk-nav .dropdown-item:focus{background:var(--nk-surface-2)}
@media (min-width:992px){.nk-nav .navbar-nav{gap:2px}.nk-nav .dropdown{position:relative}.nk-nav .dropdown-menu-end{right:0;left:auto}}
@media (max-width:991.98px){.nk-nav .navbar-collapse{margin-top:12px;padding:8px;border-radius:14px;background:var(--nk-surface);border:1px solid var(--nk-border)}.nk-nav .nav-link{padding:10px 12px!important}.nk-nav .navbar-nav .btn{display:block;margin:6px 0 4px;text-align:center}}
`;

/* Nav sitting on the dark hero (home page only) */
const NAV_ON_INK_CSS = `
.dl-hero .nk-nav{background:transparent!important;border-bottom-color:color-mix(in srgb,var(--dl-paper) 11%,transparent)!important}
.dl-hero .nk-nav .navbar-brand,.dl-hero .nk-nav .navbar-toggler{color:var(--dl-paper)!important}
.dl-hero .nk-nav .nav-link{color:color-mix(in srgb,var(--dl-paper) 72%,var(--dl-ink))!important}
.dl-hero .nk-nav .nav-link:hover,.dl-hero .nk-nav .nav-link.active{color:var(--dl-paper)!important}
.dl-hero .nk-nav .nav-link.active{background:color-mix(in srgb,var(--dl-paper) 10%,transparent)}
.dl-hero .nk-nav .btn{background:var(--dl-paper)!important;color:var(--dl-ink)!important}
@media (max-width:991.98px){.dl-hero .nk-nav .navbar-collapse{background:color-mix(in srgb,var(--dl-ink) 90%,var(--dl-paper));border-color:color-mix(in srgb,var(--dl-paper) 14%,transparent)}}
`;

const CTA_FOOTER_CSS = `
.dl-cta{padding:clamp(64px,9vw,110px) 0}
.dl-cta-card{text-align:center;padding:clamp(44px,7vw,88px) clamp(20px,5vw,64px);border-radius:28px;border:1px solid var(--nk-border);background:radial-gradient(ellipse 80% 90% at 50% 125%,color-mix(in srgb,var(--nk-primary) 24%,transparent),transparent 70%),var(--nk-surface)}
.dl-cta-card h2{font-size:clamp(2rem,4.4vw,3.4rem);letter-spacing:-.045em;font-weight:600;line-height:1.04;margin:0 auto;max-width:17ch;text-wrap:balance}
.dl-cta-card p{color:var(--nk-text-muted);font-size:1.1rem;margin:18px 0 0}
.dl-cta-card .dl-actions{justify-content:center}
.dl-footer{padding:64px 0 32px;border-top:1px solid var(--nk-border);background:var(--nk-bg)}
.dl-footer-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:32px}
.dl-footer-logo{display:flex;align-items:center;gap:10px;font-family:var(--nk-font-display);font-weight:600;font-size:1.15rem;letter-spacing:-.03em;margin:0 0 10px;color:var(--nk-text)}
.dl-mark{width:22px;height:22px;flex:none;border-radius:6px 50% 6px 50%;background:linear-gradient(135deg,var(--nk-primary) 0 50%,var(--nk-accent) 50% 100%)}
.dl-footer-brand p:last-child{color:var(--nk-text-muted);max-width:30ch;margin:0}
.dl-footer-h{font-family:${MONO};font-size:.72rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-text-muted);margin:6px 0 16px}
.dl-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.dl-footer a{color:var(--nk-text);text-decoration:none;font-size:.95rem;overflow-wrap:anywhere}
.dl-footer a:hover{color:var(--nk-primary);text-decoration:none}
.dl-footer-base{display:flex;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;margin-top:56px;padding-top:24px;border-top:1px solid var(--nk-border);color:var(--nk-text-muted);font-size:.88rem}
.dl-footer-base p{margin:0}
@media (max-width:760px){.dl-footer-grid{grid-template-columns:1fr 1fr}.dl-footer-brand,.dl-footer-grid>div:last-child{grid-column:1/-1}}
`;

/* Light page header used by Pricing and Changelog */
const PAGE_HEAD_CSS = `
.dl-phead{background:radial-gradient(ellipse 70% 90% at 50% -20%,color-mix(in srgb,var(--nk-primary) 15%,transparent),transparent 70%),var(--nk-bg);padding-bottom:clamp(28px,4vw,44px)}
.dl-phead-copy{text-align:center;padding-top:clamp(56px,9vw,104px);max-width:800px}
.dl-phead h1{font-size:clamp(2.4rem,5.6vw,4.2rem);letter-spacing:-.045em;line-height:1.02;font-weight:600;margin:0;text-wrap:balance}
.dl-phead-copy>p:not(.dl-kicker){color:var(--nk-text-muted);font-size:1.15rem;line-height:1.6;margin:20px auto 0;max-width:58ch}
.dl-phead .dl-actions{justify-content:center}
`;

/* Train visual (home bento + changelog lead entry) */
const TRAIN_CSS = `
.dl-train-track{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));position:relative;padding-top:4px}
.dl-train-track::before{content:"";position:absolute;left:12.5%;right:12.5%;top:15px;height:2px;background:linear-gradient(90deg,var(--nk-accent) 0 58%,color-mix(in srgb,var(--nk-text) 16%,transparent) 58% 100%)}
.dl-stop{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.dl-stop::before{content:"";width:24px;height:24px;border-radius:50%;background:var(--nk-surface);border:2px solid color-mix(in srgb,var(--nk-text) 22%,transparent)}
.dl-stop.is-done::before{background:var(--nk-accent);border-color:var(--nk-accent)}
.dl-stop.is-live::before{background:var(--nk-primary);border-color:var(--nk-primary);box-shadow:0 0 0 6px color-mix(in srgb,var(--nk-primary) 20%,transparent)}
.dl-stop b{font-family:${MONO};font-weight:500;font-size:13px;color:var(--nk-text)}
.dl-stop em{font-style:normal;font-size:12px;color:var(--nk-text-muted)}
.dl-cars{list-style:none;margin:18px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.dl-cars li{padding:4px 10px;border-radius:7px;background:var(--nk-surface);border:1px solid var(--nk-border);font-size:12px;color:var(--nk-text)}
.dl-cars b{font-family:${MONO};font-weight:500;color:var(--nk-primary-2);margin-right:6px}
.dl-train-note{margin:16px 0 0;padding-top:12px;border-top:1px dashed var(--nk-border);font-size:12.5px;color:var(--nk-text-muted)}
.dl-train-note span{color:var(--nk-primary-2);font-weight:600}
`;

/* ── Home ───────────────────────────────────────────────────────────── */
const HOME_CSS = `
.dl-hero{position:relative;overflow:hidden;color:var(--dl-paper);padding:0 0 clamp(40px,6vw,72px);background:radial-gradient(ellipse 60% 520px at 50% -40px,color-mix(in srgb,var(--nk-primary) 46%,transparent),transparent 72%),linear-gradient(180deg,var(--dl-ink) 0,var(--dl-ink) calc(100% - 210px),var(--nk-bg) calc(100% - 210px))}
.dl-hero::before{content:"";position:absolute;inset:0 0 210px 0;pointer-events:none;background-image:linear-gradient(color-mix(in srgb,var(--dl-paper) 7%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--dl-paper) 7%,transparent) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(ellipse 75% 70% at 50% 0,currentColor 25%,transparent 75%);mask-image:radial-gradient(ellipse 75% 70% at 50% 0,currentColor 25%,transparent 75%)}
.dl-hero>*{position:relative}
.dl-hero-copy{width:min(900px,100% - 40px);margin:clamp(48px,8vw,96px) auto 0;text-align:center}
.dl-announce{display:inline-flex;align-items:center;gap:10px;max-width:100%;padding:5px 14px 5px 5px;border-radius:999px;border:1px solid color-mix(in srgb,var(--dl-paper) 18%,transparent);background:color-mix(in srgb,var(--dl-paper) 6%,transparent);color:color-mix(in srgb,var(--dl-paper) 86%,var(--dl-ink));font-size:.875rem;text-decoration:none}
.dl-announce:hover{color:var(--dl-paper);text-decoration:none;border-color:color-mix(in srgb,var(--dl-paper) 34%,transparent)}
.dl-announce-tag{flex:none;padding:3px 10px;border-radius:999px;background:var(--nk-primary);color:var(--dl-paper);font-weight:600;font-size:.75rem}
.dl-announce-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dl-hero-title{margin:28px 0 0;font-size:clamp(2.5rem,6.6vw,5rem);line-height:1.02;letter-spacing:-.047em;font-weight:600;color:var(--dl-paper);text-wrap:balance}
.dl-hero-title span{color:color-mix(in srgb,var(--dl-paper) 58%,var(--dl-ink))}
.dl-hero-lede{margin:24px auto 0;max-width:640px;font-size:clamp(1.05rem,1.6vw,1.2rem);line-height:1.6;color:color-mix(in srgb,var(--dl-paper) 74%,var(--dl-ink))}
.dl-hero .dl-actions{justify-content:center}
.dl-hero-notes{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 22px;list-style:none;padding:0;margin:22px 0 0;font-family:${MONO};font-size:.78rem;color:color-mix(in srgb,var(--dl-paper) 62%,var(--dl-ink))}
.dl-hero-notes li::before{content:"✓";color:var(--nk-accent);margin-right:8px}
.dl-hero a:focus-visible{outline-color:var(--nk-accent)}
.dl-app-stage{width:min(1180px,100% - 32px);margin:clamp(48px,7vw,80px) auto 0;scroll-margin-top:24px}
.dl-app{border-radius:16px;overflow:hidden;text-align:left;font-size:13px;line-height:1.4;color:var(--dl-paper);background:color-mix(in srgb,var(--dl-ink) 94%,var(--dl-paper));border:1px solid color-mix(in srgb,var(--dl-paper) 15%,transparent);box-shadow:0 0 0 6px color-mix(in srgb,var(--dl-paper) 4%,transparent),0 50px 110px -34px color-mix(in srgb,var(--nk-primary) 55%,transparent),0 30px 60px -30px color-mix(in srgb,var(--dl-ink) 70%,transparent)}
.dl-app p{margin:0}
.dl-app-bar{display:flex;align-items:center;gap:16px;height:46px;padding:0 16px;border-bottom:1px solid color-mix(in srgb,var(--dl-paper) 10%,transparent);background:color-mix(in srgb,var(--dl-ink) 88%,var(--dl-paper))}
.dl-app-dots{display:inline-flex;gap:7px;flex:none}
.dl-app-dots i{width:11px;height:11px;border-radius:50%;background:color-mix(in srgb,var(--dl-paper) 22%,transparent)}
.dl-app-path{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:color-mix(in srgb,var(--dl-paper) 60%,transparent)}
.dl-app-path b{font-weight:400;margin:0 6px;opacity:.55}
.dl-app-path strong{color:var(--dl-paper);font-weight:600}
.dl-app-people{margin-left:auto;display:inline-flex;flex:none}
.dl-app-people i{width:26px;height:26px;margin-left:-6px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:10px;font-weight:600;color:var(--dl-ink);border:2px solid color-mix(in srgb,var(--dl-ink) 88%,var(--dl-paper))}
.dl-av-a{background:var(--nk-accent)}
.dl-av-b{background:color-mix(in srgb,var(--nk-primary) 55%,var(--dl-paper))}
.dl-av-c{background:color-mix(in srgb,var(--dl-paper) 82%,var(--dl-ink))}
.dl-app-people .dl-av-more{background:color-mix(in srgb,var(--dl-paper) 22%,var(--dl-ink));color:var(--dl-paper)}
.dl-app-share{flex:none;padding:5px 12px;border-radius:7px;background:var(--nk-primary);color:var(--dl-paper);font-weight:600;font-size:12px}
.dl-app-body{display:grid;grid-template-columns:200px minmax(0,1fr) 250px;min-height:430px}
.dl-app-side{padding:16px 12px;border-right:1px solid color-mix(in srgb,var(--dl-paper) 9%,transparent);background:color-mix(in srgb,var(--dl-ink) 98%,var(--dl-paper))}
.dl-ws{display:flex;align-items:center;gap:9px;padding:6px 8px;margin-bottom:14px!important;font-weight:600}
.dl-ws-logo{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;background:var(--nk-accent);color:var(--dl-ink);font-size:12px;font-weight:700}
.dl-side-nav,.dl-side-trains{list-style:none;margin:0;padding:0}
.dl-side-nav li,.dl-side-trains li{display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:7px;color:color-mix(in srgb,var(--dl-paper) 64%,transparent)}
.dl-side-nav li.is-active{background:color-mix(in srgb,var(--dl-paper) 9%,transparent);color:var(--dl-paper)}
.dl-side-nav li span{margin-left:auto;font-size:11px;opacity:.7}
.dl-side-label{margin:18px 8px 6px!important;font-family:${MONO};font-size:10.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--dl-paper) 46%,transparent)}
.dl-dot{width:8px;height:8px;flex:none;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--dl-paper) 45%,transparent)}
.dl-dot-live{background:var(--nk-primary);border-color:var(--nk-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--nk-primary) 32%,transparent)}
.dl-dot-done{background:var(--nk-accent);border-color:var(--nk-accent)}
.dl-app-main{padding:18px 20px 20px;min-width:0}
.dl-app-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px}
.dl-app-kicker{font-family:${MONO};font-size:10.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--dl-paper) 52%,transparent)}
.dl-app-title{margin-top:6px!important;font-size:20px;font-weight:600;letter-spacing:-.02em;color:var(--dl-paper)}
.dl-app-status{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
.dl-pill{padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:600;white-space:nowrap}
.dl-pill-ok{background:color-mix(in srgb,var(--nk-accent) 20%,transparent);color:color-mix(in srgb,var(--nk-accent) 70%,var(--dl-paper))}
.dl-app-date{color:color-mix(in srgb,var(--dl-paper) 62%,transparent);font-size:12px;white-space:nowrap}
.dl-tl{display:grid;grid-template-columns:70px repeat(6,minmax(0,1fr));grid-template-rows:28px repeat(6,34px) 22px;row-gap:8px;padding-top:6px}
.dl-tl-h{grid-row:1/-1;border-left:1px solid color-mix(in srgb,var(--dl-paper) 9%,transparent);padding-left:8px;font-family:${MONO};font-size:10.5px;line-height:28px;color:color-mix(in srgb,var(--dl-paper) 50%,transparent);white-space:nowrap;overflow:hidden}
.dl-c2{grid-column:2}.dl-c3{grid-column:3}.dl-c4{grid-column:4}.dl-c5{grid-column:5}.dl-c6{grid-column:6}.dl-c7{grid-column:7}
.dl-r2{grid-row:2}.dl-r3{grid-row:3}.dl-r4{grid-row:4}.dl-r5{grid-row:5}.dl-r6{grid-row:6}.dl-r7{grid-row:7}
.dl-tl-lane{grid-column:1;align-self:center;font-size:12px;color:color-mix(in srgb,var(--dl-paper) 64%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dl-bar{display:block;margin:0 4px;padding:0 10px;border-radius:8px;line-height:34px;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dl-bar-done{background:color-mix(in srgb,var(--nk-accent) 20%,transparent);color:color-mix(in srgb,var(--nk-accent) 45%,var(--dl-paper));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--nk-accent) 45%,transparent)}
.dl-bar-live{background:var(--nk-primary);color:var(--dl-paper);box-shadow:0 10px 24px -10px color-mix(in srgb,var(--nk-primary) 85%,transparent)}
.dl-bar-risk{color:var(--dl-paper);background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--nk-primary) 34%,transparent) 0 6px,color-mix(in srgb,var(--nk-primary) 16%,transparent) 6px 12px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--nk-primary) 65%,transparent)}
.dl-bar-plan{line-height:32px;border:1px dashed color-mix(in srgb,var(--dl-paper) 32%,transparent);color:color-mix(in srgb,var(--dl-paper) 68%,transparent)}
.dl-x2-4{grid-column:2/4}.dl-x2-5{grid-column:2/5}.dl-x3-6{grid-column:3/6}.dl-x4-7{grid-column:4/7}.dl-x5-7{grid-column:5/7}
.dl-mile{grid-row:7;grid-column:6/8;align-self:center;display:flex;align-items:center;gap:9px;margin-left:12px;font-size:12px;font-weight:600;color:var(--dl-paper);white-space:nowrap;overflow:hidden}
.dl-mile::before{content:"";flex:none;width:12px;height:12px;transform:rotate(45deg);background:var(--nk-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--nk-accent) 25%,transparent)}
.dl-today{grid-column:4;grid-row:2/-1;justify-self:start;margin-left:52%;width:2px;background:var(--nk-primary);display:flex;align-items:flex-end;justify-content:center}
.dl-today span{flex:none;padding:2px 6px;border-radius:5px;background:var(--nk-primary);color:var(--dl-paper);font-family:${MONO};font-size:9.5px;font-weight:600;line-height:1.35}
.dl-app-panel{padding:18px 16px;border-left:1px solid color-mix(in srgb,var(--dl-paper) 9%,transparent);background:color-mix(in srgb,var(--dl-ink) 97%,var(--dl-paper))}
.dl-panel-title{display:flex;justify-content:space-between;margin-bottom:10px!important;font-weight:600;color:var(--dl-paper)}
.dl-panel-title span{font-weight:500;color:color-mix(in srgb,var(--dl-paper) 56%,transparent)}
.dl-progress{display:block;height:6px;margin-bottom:14px;border-radius:99px;overflow:hidden;background:color-mix(in srgb,var(--dl-paper) 10%,transparent)}
.dl-progress span{display:block;width:70%;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--nk-accent),var(--nk-primary))}
.dl-checks{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.dl-checks li{display:flex;gap:10px;align-items:flex-start;padding:7px 6px;border-radius:7px;color:var(--dl-paper);line-height:1.35}
.dl-checks li::before{content:"";flex:none;width:15px;height:15px;margin-top:1px;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--dl-paper) 36%,transparent)}
.dl-checks li.is-done{color:color-mix(in srgb,var(--dl-paper) 56%,transparent);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--dl-paper) 30%,transparent)}
.dl-checks li.is-done::before{content:"✓";display:grid;place-items:center;font-size:10px;font-weight:700;color:var(--dl-ink);background:var(--nk-accent);border-color:var(--nk-accent)}
.dl-risk{margin-top:14px!important;padding:10px 12px;border-radius:9px;background:color-mix(in srgb,var(--nk-primary) 17%,transparent);box-shadow:inset 3px 0 0 var(--nk-primary);font-size:12px;line-height:1.45;color:color-mix(in srgb,var(--dl-paper) 86%,transparent)}
.dl-risk strong{display:block;color:var(--dl-paper);margin-bottom:2px}
@media (max-width:1080px){.dl-app-body{grid-template-columns:180px minmax(0,1fr)}.dl-app-panel{display:none}}
@media (max-width:720px){.dl-app-body{grid-template-columns:minmax(0,1fr);min-height:0}.dl-app-side,.dl-app-people,.dl-app-share,.dl-app-date{display:none}.dl-app-main{padding:16px 12px 14px}.dl-tl{grid-template-columns:56px repeat(6,minmax(0,1fr))}.dl-tl-h{font-size:9px;padding-left:3px}.dl-bar{font-size:11px;padding:0 6px;margin:0 2px}.dl-tl-lane{font-size:11px}.dl-mile{margin-left:4px;font-size:11px}}
.dl-logos{padding:clamp(40px,6vw,64px) 0 clamp(20px,3vw,32px)}
.dl-logos-title{text-align:center;color:var(--nk-text-muted);font-family:var(--nk-font);font-size:.95rem;font-weight:500;letter-spacing:0;margin:0 0 26px}
.dl-logo-row{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px;align-items:center}
.dl-logo{text-align:center;color:color-mix(in srgb,var(--nk-text) 62%,var(--nk-bg));font-family:var(--nk-font-display);font-size:1.3rem;white-space:nowrap;line-height:1.2}
.dl-logo-parcelly{font-weight:700;letter-spacing:-.06em}
.dl-logo-parcelly::before{content:"◆";font-size:.7em;margin-right:6px;vertical-align:.12em}
.dl-logo-quanta{font-weight:300;letter-spacing:.01em}
.dl-logo-quanta span{font-weight:700}
.dl-logo-oakfield{font-weight:600;letter-spacing:.3em;font-size:.95rem}
.dl-logo-lumen{font-family:${MONO};font-weight:500;letter-spacing:-.03em;font-size:1.15rem}
.dl-logo-stackhouse{font-weight:800;font-style:italic;letter-spacing:-.045em}
.dl-logo-brightpath{font-weight:500;letter-spacing:-.02em}
.dl-logo-brightpath::before{content:"";display:inline-block;width:.62em;height:.62em;margin-right:7px;border-radius:50%;border:3px solid currentColor;vertical-align:-.02em}
@media (max-width:900px){.dl-logo-row{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:24px}}
@media (max-width:480px){.dl-logo-row{grid-template-columns:repeat(2,minmax(0,1fr))}.dl-logo{font-size:1.1rem}}
.dl-proof{padding:clamp(32px,5vw,56px) 0 clamp(56px,8vw,96px)}
.dl-proof-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--nk-border);border-bottom:1px solid var(--nk-border)}
.dl-proof-item{padding:34px 32px 30px 0}
.dl-proof-item+.dl-proof-item{padding-left:32px;border-left:1px solid var(--nk-border)}
.dl-proof-num{margin:0;font-family:var(--nk-font-display);font-size:clamp(2.6rem,5vw,4rem);font-weight:600;letter-spacing:-.05em;line-height:1;color:var(--nk-text)}
.dl-proof-label{margin:12px 0 0;color:var(--nk-text-muted);max-width:26ch}
.dl-proof-note{margin:16px 0 0;font-size:.8rem;color:var(--nk-text-muted)}
@media (max-width:720px){.dl-proof-grid{grid-template-columns:1fr}.dl-proof-item,.dl-proof-item+.dl-proof-item{padding:24px 0;border-left:0}.dl-proof-item+.dl-proof-item{border-top:1px solid var(--nk-border)}}
.dl-features{padding:clamp(56px,8vw,104px) 0}
.dl-bento{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.dl-tile{display:flex;flex-direction:column;min-width:0;padding:26px;border-radius:18px;background:var(--nk-surface);border:1px solid var(--nk-border);box-shadow:0 1px 2px color-mix(in srgb,var(--nk-text) 5%,transparent)}
.dl-tile h3{font-size:1.1rem;font-weight:600;letter-spacing:-.02em;margin:0 0 8px}
.dl-tile p{color:var(--nk-text-muted);margin:0;font-size:.95rem;line-height:1.55}
.dl-tile-wide{grid-column:span 2;display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:28px;align-items:center}
.dl-viz{margin-top:22px;padding:16px;border-radius:12px;background:var(--nk-surface-2);border:1px solid var(--nk-border);font-size:13px}
.dl-tile-wide .dl-viz{margin-top:0;padding:20px 16px 16px}
.dl-deps{display:flex;flex-direction:column;align-items:flex-start}
.dl-node{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:9px;background:var(--nk-surface);border:1px solid var(--nk-border);font-weight:500;color:var(--nk-text)}
.dl-node::before{content:"";flex:none;width:8px;height:8px;border-radius:50%;background:color-mix(in srgb,var(--nk-text) 25%,transparent)}
.dl-node.is-done::before{background:var(--nk-accent)}
.dl-node.is-warn{border-color:color-mix(in srgb,var(--nk-primary) 55%,var(--nk-border));box-shadow:0 0 0 3px color-mix(in srgb,var(--nk-primary) 12%,transparent)}
.dl-node.is-warn::before{background:var(--nk-primary)}
.dl-node-2{margin-left:18px}.dl-node-3{margin-left:36px}
.dl-edge{width:2px;height:14px;background:color-mix(in srgb,var(--nk-text) 18%,transparent)}
.dl-edge-1{margin-left:22px}.dl-edge-2{margin-left:40px}
.dl-deps-note{margin-top:12px!important;font-size:12px!important;color:var(--nk-primary-2)!important;font-weight:600}
.dl-tile .dl-log p{display:flex;gap:8px;align-items:center;margin:0 0 9px;color:var(--nk-text);font-size:13px}
.dl-tile .dl-log p:last-child{margin-bottom:0}
.dl-tile .dl-log .dl-log-ver{justify-content:space-between;font-family:${MONO};font-weight:500}
.dl-log-ver span{font-size:11px;padding:2px 8px;border-radius:99px;background:color-mix(in srgb,var(--nk-text) 8%,transparent);color:var(--nk-text-muted)}
.dl-mail{background:var(--nk-surface)}
.dl-tile .dl-mail-from{font-family:${MONO};font-size:11px;margin-bottom:8px}
.dl-tile .dl-mail-subj{color:var(--nk-text);font-weight:600;font-size:14px;margin-bottom:6px}
.dl-tile .dl-mail-body{font-size:13px}
.dl-sync{list-style:none;display:grid;gap:8px;padding:12px}
.dl-sync li{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:9px;background:var(--nk-surface);border:1px solid var(--nk-border);color:var(--nk-text)}
.dl-sync em{font-style:normal;color:var(--nk-primary-2);font-weight:600}
@media (max-width:991.98px){.dl-bento{grid-template-columns:repeat(2,minmax(0,1fr))}.dl-tile-wide{grid-column:1/-1}}
@media (max-width:640px){.dl-bento{grid-template-columns:minmax(0,1fr)}.dl-tile-wide{grid-template-columns:minmax(0,1fr);gap:20px}}
.dl-steps{padding:clamp(56px,8vw,104px) 0;background:var(--nk-surface-2);border-block:1px solid var(--nk-border)}
.dl-step-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.dl-step{position:relative;padding:30px 32px 0 0;border-top:2px solid var(--nk-border)}
.dl-step:first-child{border-top-color:var(--nk-primary)}
.dl-step::before{content:"";position:absolute;top:-7px;left:0;width:12px;height:12px;border-radius:50%;background:var(--nk-primary);box-shadow:0 0 0 5px var(--nk-surface-2)}
.dl-step-no{font-family:${MONO};font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;color:var(--nk-text-muted);margin:0 0 10px}
.dl-step h3{font-size:1.3rem;letter-spacing:-.025em;margin:0 0 10px;font-weight:600}
.dl-step p:last-child{color:var(--nk-text-muted);margin:0;line-height:1.6}
@media (max-width:800px){.dl-step-list{grid-template-columns:minmax(0,1fr);gap:32px}.dl-step{padding-right:0}}
.dl-voices{padding:clamp(56px,8vw,112px) 0}
.dl-voices-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:clamp(16px,3vw,24px)}
.dl-voice-main{position:relative;overflow:hidden;margin:0;padding:clamp(28px,4vw,48px);border-radius:22px;background:var(--dl-ink);color:var(--dl-paper);display:flex;flex-direction:column;justify-content:space-between;gap:40px}
.dl-voice-main blockquote::before{content:"“";display:block;height:52px;margin-bottom:6px;font-family:Georgia,serif;font-size:120px;line-height:1;color:color-mix(in srgb,var(--nk-primary) 60%,var(--dl-paper))}
.dl-voice-main blockquote,.dl-voice blockquote{margin:0;position:relative;z-index:1}
.dl-voice-main blockquote p{font-size:clamp(1.35rem,2.4vw,2rem);line-height:1.3;letter-spacing:-.025em;font-weight:500;margin:0;color:var(--dl-paper)}
.dl-voices figcaption{display:flex;align-items:center;gap:14px;font-size:.95rem;line-height:1.4}
.dl-voices figcaption img{width:52px;height:52px;border-radius:50%;object-fit:cover;flex:none}
.dl-voices figcaption strong{display:block;font-weight:600}
.dl-voice-main figcaption{color:color-mix(in srgb,var(--dl-paper) 70%,var(--dl-ink))}
.dl-voice-main figcaption strong{color:var(--dl-paper)}
.dl-voice-side{display:grid;gap:16px;grid-template-rows:1fr auto}
.dl-voice{margin:0;padding:28px;border-radius:22px;border:1px solid var(--nk-border);background:var(--nk-surface);display:flex;flex-direction:column;justify-content:space-between;gap:24px}
.dl-voice blockquote p{font-size:1.1rem;line-height:1.5;margin:0;color:var(--nk-text)}
.dl-voice figcaption{color:var(--nk-text-muted)}
.dl-voice figcaption strong{color:var(--nk-text)}
.dl-rating{display:flex;align-items:center;gap:20px;padding:22px 28px;border-radius:22px;background:var(--nk-surface-2);border:1px solid var(--nk-border)}
.dl-rating-score{margin:0;font-family:var(--nk-font-display);font-size:3rem;font-weight:600;letter-spacing:-.05em;line-height:1}
.dl-rating-score span{font-size:1.1rem;color:var(--nk-text-muted);letter-spacing:0}
.dl-rating p:last-child{margin:0;color:var(--nk-text-muted);font-size:.92rem}
@media (max-width:900px){.dl-voices-grid{grid-template-columns:minmax(0,1fr)}}
.dl-trust{padding:clamp(56px,8vw,104px) 0;background:var(--dl-ink);color:var(--dl-paper)}
.dl-trust-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(32px,6vw,80px);align-items:start}
.dl-trust .dl-kicker{color:color-mix(in srgb,var(--nk-primary) 50%,var(--dl-paper))}
.dl-trust h2{color:var(--dl-paper)}
.dl-trust-copy>p:last-child{color:color-mix(in srgb,var(--dl-paper) 70%,var(--dl-ink));margin:18px 0 0;font-size:1.05rem;line-height:1.6}
.dl-trust-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;margin:0;border-radius:16px;overflow:hidden;background:color-mix(in srgb,var(--dl-paper) 13%,transparent);border:1px solid color-mix(in srgb,var(--dl-paper) 13%,transparent)}
.dl-trust-list div{background:var(--dl-ink);padding:26px}
.dl-trust-list dt{display:flex;align-items:center;gap:10px;font-weight:600;font-size:1.05rem;color:var(--dl-paper);margin-bottom:8px}
.dl-trust-list dt::before{content:"✓";flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:color-mix(in srgb,var(--nk-accent) 22%,transparent);color:var(--nk-accent);font-size:12px}
.dl-trust-list dd{margin:0;color:color-mix(in srgb,var(--dl-paper) 64%,var(--dl-ink));font-size:.92rem;line-height:1.5}
@media (max-width:860px){.dl-trust-grid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:520px){.dl-trust-list{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Pricing ────────────────────────────────────────────────────────── */
const PRICING_CSS = `
.dl-plans-sec{padding:8px 0 clamp(56px,8vw,96px)}
.dl-bill-input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
.dl-bill-switch{display:flex;width:max-content;max-width:100%;margin:0 auto 40px;padding:5px;border-radius:12px;background:var(--nk-surface-2);border:1px solid var(--nk-border)}
.dl-bill-switch label{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:9px;font-weight:600;font-size:.95rem;cursor:pointer;color:var(--nk-text-muted);white-space:nowrap}
.dl-bill-switch label span{font-size:.72rem;font-weight:600;padding:2px 8px;border-radius:99px;background:color-mix(in srgb,var(--nk-accent) 16%,transparent);color:color-mix(in srgb,var(--nk-accent) 48%,var(--nk-text))}
#dl-bill-annual:checked~.dl-bill-switch label[for="dl-bill-annual"],#dl-bill-monthly:checked~.dl-bill-switch label[for="dl-bill-monthly"]{background:var(--nk-surface);color:var(--nk-text);box-shadow:0 1px 3px color-mix(in srgb,var(--nk-text) 16%,transparent)}
#dl-bill-annual:focus-visible~.dl-bill-switch label[for="dl-bill-annual"],#dl-bill-monthly:focus-visible~.dl-bill-switch label[for="dl-bill-monthly"]{outline:2px solid var(--nk-primary);outline-offset:2px}
.dl-monthly{display:none}
#dl-bill-monthly:checked~.dl-plan-grid .dl-monthly{display:inline}
#dl-bill-monthly:checked~.dl-plan-grid .dl-annual{display:none}
.dl-plan-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:stretch}
.dl-plan{position:relative;display:flex;flex-direction:column;padding:30px 24px 28px;border-radius:20px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.dl-plan h3{font-size:1.15rem;font-weight:600;margin:0;letter-spacing:-.02em}
.dl-plan-for{color:var(--nk-text-muted);font-size:.92rem;line-height:1.45;margin:6px 0 22px;min-height:2.9em}
.dl-price{display:flex;flex-direction:column;margin:0 0 22px}
.dl-amt{font-family:var(--nk-font-display);font-size:2.9rem;font-weight:600;letter-spacing:-.05em;line-height:1}
.dl-per{color:var(--nk-text-muted);font-size:.85rem;margin-top:8px}
.dl-plan .dl-btn{width:100%}
.dl-feats{list-style:none;margin:24px 0 0;padding:22px 0 0;border-top:1px solid var(--nk-border);display:grid;gap:11px;font-size:.93rem;line-height:1.45}
.dl-feats li{display:flex;gap:10px}
.dl-feats li::before{content:"✓";flex:none;color:var(--nk-accent);font-weight:700}
.dl-plan-pop{background:var(--dl-ink);color:var(--dl-paper);border-color:var(--dl-ink);box-shadow:0 30px 60px -30px color-mix(in srgb,var(--nk-primary) 65%,transparent)}
.dl-plan-pop h3,.dl-plan-pop .dl-amt{color:var(--dl-paper)}
.dl-plan-pop .dl-plan-for,.dl-plan-pop .dl-per{color:color-mix(in srgb,var(--dl-paper) 66%,var(--dl-ink))}
.dl-plan-pop .dl-feats{border-top-color:color-mix(in srgb,var(--dl-paper) 14%,transparent)}
.dl-plan-badge{position:absolute;top:-12px;left:24px;margin:0;padding:4px 10px;border-radius:99px;background:var(--nk-primary);color:var(--nk-bg);font-size:.75rem;font-weight:600}
.dl-plans-foot{text-align:center;color:var(--nk-text-muted);font-size:.92rem;margin:28px 0 0}
@media (max-width:1080px){.dl-plan-grid{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:22px}}
@media (max-width:600px){.dl-plan-grid{grid-template-columns:minmax(0,1fr)}.dl-plan-for{min-height:0}}
.dl-compare{padding:clamp(56px,8vw,96px) 0;border-top:1px solid var(--nk-border)}
.dl-compare .dl-h2{margin-bottom:32px}
.dl-table-scroll{position:relative;overflow-x:auto;border:1px solid var(--nk-border);border-radius:16px;background:var(--nk-surface)}
.dl-table{width:100%;min-width:640px;border-collapse:collapse;font-size:.93rem;margin:0}
.dl-table th,.dl-table td{padding:14px 18px;border-bottom:1px solid var(--nk-border);text-align:center;vertical-align:middle}
.dl-table thead th{font-weight:600;background:var(--nk-surface-2)}
.dl-table th[scope="row"],.dl-table thead th:first-child{text-align:left;font-weight:500}
.dl-table thead th:first-child{font-weight:600}
.dl-table .dl-group th{text-align:left;font-family:${MONO};font-size:.72rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-primary-2);background:var(--nk-bg)}
.dl-table tbody tr:last-child th,.dl-table tbody tr:last-child td{border-bottom:0}
.dl-table td:nth-child(3),.dl-table thead th:nth-child(3){background:color-mix(in srgb,var(--nk-primary) 6%,transparent)}
.dl-yes{color:var(--nk-accent);font-weight:700}
.dl-no{color:color-mix(in srgb,var(--nk-text) 35%,transparent)}
.dl-faq{padding:clamp(56px,8vw,96px) 0;background:var(--nk-surface-2);border-block:1px solid var(--nk-border);scroll-margin-top:16px}
.dl-faq-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(32px,6vw,80px)}
.dl-faq-intro p{color:var(--nk-text-muted);font-size:1.05rem;line-height:1.6;margin:18px 0 0}
.dl-faq-list details{border-bottom:1px solid var(--nk-border)}
.dl-faq-list details:first-child{border-top:1px solid var(--nk-border)}
.dl-faq-list summary{padding:22px 44px 22px 0;font-weight:600;font-size:1.05rem;letter-spacing:-.01em}
.dl-faq-list summary::after{top:50%;transform:translateY(-50%);color:var(--nk-text-muted);font-weight:400}
.dl-faq-list details p{margin:-6px 0 22px;color:var(--nk-text-muted);max-width:62ch;line-height:1.6}
@media (max-width:860px){.dl-faq-grid{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Changelog ──────────────────────────────────────────────────────── */
const CHANGELOG_CSS = `
.dl-log-sec{padding:clamp(24px,4vw,48px) 0 clamp(56px,8vw,96px)}
.dl-releases{list-style:none;margin:0 auto;padding:0;max-width:1000px}
.dl-rel{display:grid;grid-template-columns:190px minmax(0,1fr);gap:40px;padding:48px 0;border-top:1px solid var(--nk-border)}
.dl-rel-meta{position:sticky;top:24px;align-self:start}
.dl-rel-ver{font-family:${MONO};font-weight:500;margin:0;font-size:.95rem;color:var(--nk-text)}
.dl-rel-date{color:var(--nk-text-muted);margin:6px 0 0;font-size:.9rem}
.dl-rel-latest{display:inline-block;margin-top:12px;padding:3px 10px;border-radius:99px;background:var(--nk-primary);color:var(--nk-bg);font-size:.75rem;font-weight:600}
.dl-rel h3{font-size:clamp(1.45rem,2.4vw,1.9rem);letter-spacing:-.035em;line-height:1.15;font-weight:600;margin:0 0 12px}
.dl-rel-body>p{color:var(--nk-text-muted);font-size:1.03rem;line-height:1.65;margin:0 0 22px;max-width:64ch}
.dl-rel-viz{margin:0 0 24px;padding:22px 20px 18px;border-radius:14px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.dl-rel-changes{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.dl-rel-changes li{display:flex;gap:12px;align-items:baseline;line-height:1.55}
.dl-rel-changes .dl-tag{min-width:74px;text-align:center}
@media (max-width:720px){.dl-rel{grid-template-columns:minmax(0,1fr);gap:14px;padding:36px 0}.dl-rel-meta{position:static;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline}.dl-rel-date,.dl-rel-latest{margin:0}.dl-rel-changes li{flex-direction:column;gap:6px}}
`;

/* ── Shared HTML ────────────────────────────────────────────────────── */
const CTA_HTML = `
<section class="dl-cta">
  <div class="dl-wrap">
    <div class="dl-cta-card">
      <h2>Your next launch could be your calmest.</h2>
      <p>Set up in an afternoon. Free for teams of up to 10, for as long as you like.</p>
      <div class="dl-actions">
        <a class="dl-btn dl-btn-primary" href="/register">Start free</a>
        <a class="dl-btn dl-btn-line" href="/pricing">Compare plans</a>
      </div>
    </div>
  </div>
</section>`;

const FOOTER_HTML = `
<footer class="dl-footer">
  <div class="dl-wrap">
    <div class="dl-footer-grid">
      <div class="dl-footer-brand">
        <p class="dl-footer-logo"><span class="dl-mark" aria-hidden="true"></span>Driftline</p>
        <p>Release planning for product teams that ship every week.</p>
      </div>
      <div>
        <p class="dl-footer-h">Product</p>
        <ul>
          <li><a href="/">Overview</a></li>
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="/changelog">Changelog</a></li>
          <li><a href="/roadmap">Public roadmap</a></li>
        </ul>
      </div>
      <div>
        <p class="dl-footer-h">Account</p>
        <ul>
          <li><a href="/register">Create an account</a></li>
          <li><a href="/login">Log in</a></li>
        </ul>
      </div>
      <div>
        <p class="dl-footer-h">Talk to us</p>
        <ul>
          <li><a href="/pricing#faq">Pricing FAQ</a></li>
          <li><a href="mailto:hello@driftline.example">hello@driftline.example</a></li>
        </ul>
      </div>
    </div>
    <div class="dl-footer-base">
      <p>© 2026 Driftline Labs, Inc. All rights reserved.</p>
      <p>Made for teams who would rather be shipping.</p>
    </div>
  </div>
</footer>`;

/* ── Pages ──────────────────────────────────────────────────────────── */
const HOME_HTML = `
<div class="dl-page">
<header class="dl-hero">
  <nav aria-label="Main"></nav>
  <div class="dl-hero-copy">
    <a class="dl-announce" href="/changelog"><span class="dl-announce-tag">New</span><span class="dl-announce-text">Release trains for multi-team launches</span><span aria-hidden="true">→</span></a>
    <h1 class="dl-hero-title">Every release on one <span>calm, shared timeline.</span></h1>
    <p class="dl-hero-lede">Driftline pulls your roadmap, pull requests and launch checklist into one plan, so product, engineering and marketing ship together without the Thursday status meeting.</p>
    <div class="dl-actions">
      <a class="dl-btn dl-btn-primary" href="/register">Start free</a>
      <a class="dl-btn dl-btn-ghost" href="#tour">See the timeline</a>
    </div>
    <ul class="dl-hero-notes">
      <li>Free for teams up to 10</li>
      <li>No credit card</li>
      <li>SOC 2 Type II</li>
    </ul>
  </div>
  <div class="dl-app-stage" id="tour">
    <div class="dl-app" role="img" aria-label="Driftline timeline for the Mobile 5.2 release. Design and API work are complete, the iOS wallet sheet is in progress, Android saved cards are at risk while they wait on the API, QA is planned for late October and the store release is on October 30. Seven of ten launch checklist items are done.">
      <div class="dl-app-bar">
        <span class="dl-app-dots"><i></i><i></i><i></i></span>
        <span class="dl-app-path">Parcelly <b>/</b> Releases <b>/</b> <strong>Mobile 5.2</strong></span>
        <span class="dl-app-people"><i class="dl-av-a">HB</i><i class="dl-av-b">MR</i><i class="dl-av-c">JO</i><i class="dl-av-more">+5</i></span>
        <span class="dl-app-share">Share</span>
      </div>
      <div class="dl-app-body">
        <div class="dl-app-side">
          <p class="dl-ws"><span class="dl-ws-logo">P</span>Parcelly</p>
          <ul class="dl-side-nav">
            <li class="is-active">Timeline</li>
            <li>Releases <span>12</span></li>
            <li>Checklists</li>
            <li>Changelog</li>
            <li>Digests</li>
          </ul>
          <p class="dl-side-label">Release trains</p>
          <ul class="dl-side-trains">
            <li><span class="dl-dot dl-dot-live"></span>Mobile 5.2</li>
            <li><span class="dl-dot dl-dot-done"></span>Web 24.10</li>
            <li><span class="dl-dot"></span>API v3</li>
            <li><span class="dl-dot"></span>Partner portal</li>
          </ul>
        </div>
        <div class="dl-app-main">
          <div class="dl-app-head">
            <div>
              <p class="dl-app-kicker">Release train · 4 teams</p>
              <p class="dl-app-title">Mobile 5.2</p>
            </div>
            <div class="dl-app-status">
              <span class="dl-pill dl-pill-ok">● On track</span>
              <span class="dl-app-date">Ships Thu, Oct 30</span>
            </div>
          </div>
          <div class="dl-tl">
            <span class="dl-tl-h dl-c2">Sep 29</span>
            <span class="dl-tl-h dl-c3">Oct 6</span>
            <span class="dl-tl-h dl-c4">Oct 13</span>
            <span class="dl-tl-h dl-c5">Oct 20</span>
            <span class="dl-tl-h dl-c6">Oct 27</span>
            <span class="dl-tl-h dl-c7">Nov 3</span>
            <span class="dl-tl-lane dl-r2">Design</span>
            <span class="dl-bar dl-bar-done dl-r2 dl-x2-4">✓ Checkout flow</span>
            <span class="dl-tl-lane dl-r3">API</span>
            <span class="dl-bar dl-bar-done dl-r3 dl-x2-5">✓ Payments API v3</span>
            <span class="dl-tl-lane dl-r4">iOS</span>
            <span class="dl-bar dl-bar-live dl-r4 dl-x3-6">Wallet sheet</span>
            <span class="dl-tl-lane dl-r5">Android</span>
            <span class="dl-bar dl-bar-risk dl-r5 dl-x4-7">Saved cards · waits on API</span>
            <span class="dl-tl-lane dl-r6">QA</span>
            <span class="dl-bar dl-bar-plan dl-r6 dl-x5-7">Regression pass</span>
            <span class="dl-tl-lane dl-r7">Launch</span>
            <span class="dl-mile">Store release</span>
            <span class="dl-today"><span>Today</span></span>
          </div>
        </div>
        <div class="dl-app-panel">
          <p class="dl-panel-title">Launch checklist <span>7 of 10</span></p>
          <span class="dl-progress"><span></span></span>
          <ul class="dl-checks">
            <li class="is-done">Release notes drafted</li>
            <li class="is-done">Store screenshots approved</li>
            <li class="is-done">Support macros updated</li>
            <li>Staged rollout to 5%</li>
            <li>Customer email scheduled</li>
          </ul>
          <p class="dl-risk"><strong>1 risk</strong>Android saved cards wait on the v3 schema freeze, due Oct 17.</p>
        </div>
      </div>
    </div>
  </div>
</header>

<main>
<section class="dl-logos" aria-labelledby="dl-logos-title">
  <div class="dl-wrap">
    <h2 class="dl-logos-title" id="dl-logos-title">Release teams at 1,900+ companies plan in Driftline</h2>
    <ul class="dl-logo-row">
      <li class="dl-logo dl-logo-parcelly">parcelly</li>
      <li class="dl-logo dl-logo-quanta">quanta<span>health</span></li>
      <li class="dl-logo dl-logo-oakfield">OAKFIELD</li>
      <li class="dl-logo dl-logo-lumen">lumen&amp;co</li>
      <li class="dl-logo dl-logo-stackhouse">Stackhouse</li>
      <li class="dl-logo dl-logo-brightpath">brightpath</li>
    </ul>
  </div>
</section>

<section class="dl-proof" aria-labelledby="dl-proof-h">
  <div class="dl-wrap">
    <h2 class="dl-sr" id="dl-proof-h">Results customers report</h2>
    <div class="dl-proof-grid">
      <div class="dl-proof-item"><p class="dl-proof-num">38%</p><p class="dl-proof-label">fewer slipped releases in the first quarter</p></div>
      <div class="dl-proof-item"><p class="dl-proof-num">6.5 h</p><p class="dl-proof-label">saved per product manager, every week</p></div>
      <div class="dl-proof-item"><p class="dl-proof-num">2 min</p><p class="dl-proof-label">from merged pull request to a published changelog</p></div>
    </div>
    <p class="dl-proof-note">Median results across 214 customer teams. Driftline customer survey, August 2026.</p>
  </div>
</section>

<section class="dl-features" id="features">
  <div class="dl-wrap">
    <div class="dl-head">
      <p class="dl-kicker">What's inside</p>
      <h2>One plan for the whole launch, not five tools that disagree.</h2>
      <p>Driftline sits on top of the tools your teams already use. Nobody changes how they work, and everyone finally sees the same dates.</p>
    </div>
    <div class="dl-bento">
      <article class="dl-tile dl-tile-wide">
        <div>
          <h3>Release trains</h3>
          <p>Group work from every team into one versioned train with one ship date. When something can't make it, move it to the next train in a click, with a one-line reason everyone can read.</p>
        </div>
        <div class="dl-viz" aria-hidden="true">
          <div class="dl-train-track">
            <span class="dl-stop is-done"><b>5.0</b><em>Aug 21</em></span>
            <span class="dl-stop is-done"><b>5.1</b><em>Sep 25</em></span>
            <span class="dl-stop is-live"><b>5.2</b><em>Oct 30</em></span>
            <span class="dl-stop"><b>5.3</b><em>Dec 4</em></span>
          </div>
          <ul class="dl-cars">
            <li><b>iOS</b>Wallet sheet</li>
            <li><b>Android</b>Saved cards</li>
            <li><b>Web</b>Receipts v2</li>
            <li><b>API</b>Payments v3</li>
          </ul>
          <p class="dl-train-note"><span>2 items</span> moved from 5.2 to 5.3 · reason shared with 14 stakeholders</p>
        </div>
      </article>
      <article class="dl-tile">
        <h3>Dependency alerts</h3>
        <p>See the blocking chain before it turns into a slipped date.</p>
        <div class="dl-viz dl-deps" aria-hidden="true">
          <span class="dl-node is-done">API v3 schema</span>
          <span class="dl-edge dl-edge-1"></span>
          <span class="dl-node dl-node-2 is-warn">Android saved cards</span>
          <span class="dl-edge dl-edge-2"></span>
          <span class="dl-node dl-node-3">Store release</span>
          <p class="dl-deps-note">Schema freeze slipped to Oct 17 · 2 days of float</p>
        </div>
      </article>
      <article class="dl-tile">
        <h3>Changelogs that write themselves</h3>
        <p>Merged pull requests become a grouped, plain-English draft that is ready to edit.</p>
        <div class="dl-viz dl-log" aria-hidden="true">
          <p class="dl-log-ver">v5.2.0 <span>Draft</span></p>
          <p><span class="dl-tag dl-tag-new">New</span> Pay with saved cards</p>
          <p><span class="dl-tag dl-tag-imp">Improved</span> Faster checkout on slow networks</p>
          <p><span class="dl-tag dl-tag-fix">Fixed</span> Duplicate receipts on refunds</p>
        </div>
      </article>
      <article class="dl-tile">
        <h3>Friday digests</h3>
        <p>Leadership gets a two-paragraph summary instead of another meeting invite.</p>
        <div class="dl-viz dl-mail" aria-hidden="true">
          <p class="dl-mail-from">Driftline digest · Fri 4:00 pm</p>
          <p class="dl-mail-subj">Mobile 5.2 is on track for Oct 30</p>
          <p class="dl-mail-body">Three of five workstreams are complete. One risk: Android saved cards wait on API v3 (owner Jo, due Oct 17).</p>
        </div>
      </article>
      <article class="dl-tile">
        <h3>Two-way sync</h3>
        <p>Dates and status flow both ways, so the plan never drifts away from the code.</p>
        <ul class="dl-viz dl-sync" aria-hidden="true">
          <li><span>Git repositories</span><em>⇄</em></li>
          <li><span>Issue trackers</span><em>⇄</em></li>
          <li><span>Team chat</span><em>→</em></li>
          <li><span>CI pipelines</span><em>←</em></li>
        </ul>
      </article>
    </div>
  </div>
</section>

<section class="dl-steps">
  <div class="dl-wrap">
    <div class="dl-head">
      <p class="dl-kicker">Setup</p>
      <h2>Live in an afternoon, not a quarter.</h2>
    </div>
    <ol class="dl-step-list">
      <li class="dl-step">
        <p class="dl-step-no">01 · 10 minutes</p>
        <h3>Connect your tools</h3>
        <p>Authorise your repositories and issue tracker. Driftline imports open work and matches it to teams for you.</p>
      </li>
      <li class="dl-step">
        <p class="dl-step-no">02 · About an hour</p>
        <h3>Draw your first train</h3>
        <p>Pick a ship date, drag in the epics that matter and let Driftline flag anything that can't make it.</p>
      </li>
      <li class="dl-step">
        <p class="dl-step-no">03 · Every Friday</p>
        <h3>Let the plan report itself</h3>
        <p>Digests, changelogs and status pages update from real progress. Your calendar gets lighter.</p>
      </li>
    </ol>
  </div>
</section>

<section class="dl-voices" aria-labelledby="dl-voices-h">
  <div class="dl-wrap">
    <h2 class="dl-sr" id="dl-voices-h">What customers say</h2>
    <div class="dl-voices-grid">
      <figure class="dl-voice-main">
        <blockquote><p>“We cancelled our weekly release meeting in March. Nobody has asked for it back, because the answer is already in Driftline.”</p></blockquote>
        <figcaption>
          <img src="${IMG}/hannah.webp" alt="Portrait of Hannah Brooks" width="360" height="360" loading="lazy">
          <span><strong>Hannah Brooks</strong>Director of Product, Parcelly</span>
        </figcaption>
      </figure>
      <div class="dl-voice-side">
        <figure class="dl-voice">
          <blockquote><p>“Our iOS and Android teams finally ship on the same day. Dependency alerts paid for the year in week two.”</p></blockquote>
          <figcaption>
            <img src="${IMG}/mateo.webp" alt="Portrait of Mateo Ruiz" width="360" height="360" loading="lazy">
            <span><strong>Mateo Ruiz</strong>Engineering Manager, Stackhouse</span>
          </figcaption>
        </figure>
        <div class="dl-rating">
          <p class="dl-rating-score">4.8<span>/5</span></p>
          <p>Average rating from 640 reviews on independent software review sites.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="dl-trust">
  <div class="dl-wrap dl-trust-grid">
    <div class="dl-trust-copy">
      <p class="dl-kicker">Security</p>
      <h2 class="dl-h2">Ready for your security review.</h2>
      <p>Driftline reads metadata, never your source code. Everything else is locked down the way your security team expects.</p>
    </div>
    <dl class="dl-trust-list">
      <div><dt>SOC 2 Type II</dt><dd>Audited every year by an independent firm.</dd></div>
      <div><dt>SAML SSO and SCIM</dt><dd>Works with any SAML 2.0 identity provider.</dd></div>
      <div><dt>EU or US hosting</dt><dd>Choose your data region when you set up.</dd></div>
      <div><dt>99.95% uptime SLA</dt><dd>Included on Business and Enterprise plans.</dd></div>
    </dl>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const PRICING_HTML = `
<div class="dl-page">
<header class="dl-phead">
  <nav aria-label="Main"></nav>
  <div class="dl-wrap dl-phead-copy">
    <p class="dl-kicker">Pricing</p>
    <h1>Pay for planners, not for viewers.</h1>
    <p>Engineers, designers and stakeholders who only view, comment or read digests are free on every plan. You pay for the people who plan releases.</p>
  </div>
</header>

<main>
<section class="dl-plans-sec" aria-labelledby="dl-plans-h">
  <div class="dl-wrap">
    <h2 class="dl-sr" id="dl-plans-h">Plans</h2>
    <div class="dl-billing">
      <input class="dl-bill-input" type="radio" name="dl-billing" id="dl-bill-annual" checked>
      <input class="dl-bill-input" type="radio" name="dl-billing" id="dl-bill-monthly">
      <div class="dl-bill-switch">
        <label for="dl-bill-annual">Annual <span>2 months free</span></label>
        <label for="dl-bill-monthly">Monthly</label>
      </div>
      <div class="dl-plan-grid">
        <article class="dl-plan">
          <h3>Free</h3>
          <p class="dl-plan-for">For small teams finding their release rhythm.</p>
          <p class="dl-price"><span class="dl-amt">$0</span><span class="dl-per">forever, for up to 10 people</span></p>
          <a class="dl-btn dl-btn-line" href="/register">Start free</a>
          <ul class="dl-feats">
            <li>1 active release train</li>
            <li>Timeline and launch checklists</li>
            <li>Git and issue-tracker sync</li>
            <li>Public changelog page</li>
          </ul>
        </article>
        <article class="dl-plan dl-plan-pop">
          <p class="dl-plan-badge">Most popular</p>
          <h3>Team</h3>
          <p class="dl-plan-for">For product teams shipping every week.</p>
          <p class="dl-price"><span class="dl-amt"><span class="dl-annual">$10</span><span class="dl-monthly">$12</span></span><span class="dl-per">per planner per month<span class="dl-annual">, billed yearly</span></span></p>
          <a class="dl-btn dl-btn-primary" href="/register">Start a 14-day trial</a>
          <ul class="dl-feats">
            <li>Unlimited release trains</li>
            <li>Dependency alerts</li>
            <li>Auto-drafted changelogs</li>
            <li>Friday digests for stakeholders</li>
            <li>Unlimited free viewers</li>
          </ul>
        </article>
        <article class="dl-plan">
          <h3>Business</h3>
          <p class="dl-plan-for">For several product lines under one roof.</p>
          <p class="dl-price"><span class="dl-amt"><span class="dl-annual">$20</span><span class="dl-monthly">$24</span></span><span class="dl-per">per planner per month<span class="dl-annual">, billed yearly</span></span></p>
          <a class="dl-btn dl-btn-line" href="/register">Start a 14-day trial</a>
          <ul class="dl-feats">
            <li>Everything in Team</li>
            <li>SAML SSO and SCIM</li>
            <li>Approval steps and custom workflows</li>
            <li>Audit log with one-year history</li>
            <li>99.95% uptime SLA</li>
          </ul>
        </article>
        <article class="dl-plan">
          <h3>Enterprise</h3>
          <p class="dl-plan-for">For regulated teams with procurement needs.</p>
          <p class="dl-price"><span class="dl-amt">Custom</span><span class="dl-per">annual agreement</span></p>
          <a class="dl-btn dl-btn-line" href="mailto:sales@driftline.example">Talk to sales</a>
          <ul class="dl-feats">
            <li>Everything in Business</li>
            <li>EU or US data residency</li>
            <li>Dedicated success manager</li>
            <li>Custom contract and invoicing</li>
            <li>Security review support</li>
          </ul>
        </article>
      </div>
    </div>
    <p class="dl-plans-foot">Prices in US dollars, excluding tax. Nonprofits and schools get 50% off Team and Business.</p>
  </div>
</section>

<section class="dl-compare" aria-labelledby="dl-compare-h">
  <div class="dl-wrap">
    <h2 class="dl-h2" id="dl-compare-h">Compare every feature</h2>
    <div class="dl-table-scroll" tabindex="0" role="region" aria-label="Plan comparison table, scrolls sideways on small screens">
      <table class="dl-table">
        <thead>
          <tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Team</th><th scope="col">Business</th><th scope="col">Enterprise</th></tr>
        </thead>
        <tbody>
          <tr class="dl-group"><th scope="colgroup" colspan="5">Planning</th></tr>
          <tr><th scope="row">Active release trains</th><td>1</td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
          <tr><th scope="row">Timeline and checklists</th><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td></tr>
          <tr><th scope="row">Dependency alerts</th><td><span class="dl-no">—</span><span class="dl-sr">Not included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td></tr>
          <tr><th scope="row">Approval steps</th><td><span class="dl-no">—</span><span class="dl-sr">Not included</span></td><td><span class="dl-no">—</span><span class="dl-sr">Not included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td></tr>
          <tr class="dl-group"><th scope="colgroup" colspan="5">Communication</th></tr>
          <tr><th scope="row">Public changelog</th><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td></tr>
          <tr><th scope="row">Auto-drafted changelogs</th><td><span class="dl-no">—</span><span class="dl-sr">Not included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td></tr>
          <tr><th scope="row">Stakeholder digests</th><td><span class="dl-no">—</span><span class="dl-sr">Not included</span></td><td>Weekly</td><td>Weekly or daily</td><td>Custom schedule</td></tr>
          <tr class="dl-group"><th scope="colgroup" colspan="5">Security and support</th></tr>
          <tr><th scope="row">SAML SSO and SCIM</th><td><span class="dl-no">—</span><span class="dl-sr">Not included</span></td><td><span class="dl-no">—</span><span class="dl-sr">Not included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td><td><span class="dl-yes">✓</span><span class="dl-sr">Included</span></td></tr>
          <tr><th scope="row">Audit log</th><td><span class="dl-no">—</span><span class="dl-sr">Not included</span></td><td>30 days</td><td>1 year</td><td>Unlimited</td></tr>
          <tr><th scope="row">Data residency</th><td>US</td><td>US</td><td>US</td><td>EU or US</td></tr>
          <tr><th scope="row">Support</th><td>Community</td><td>Email, 1 business day</td><td>Priority, 4 hours</td><td>Named success manager</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="dl-faq" id="faq" aria-labelledby="dl-faq-h">
  <div class="dl-wrap dl-faq-grid">
    <div class="dl-faq-intro">
      <p class="dl-kicker">FAQ</p>
      <h2 class="dl-h2" id="dl-faq-h">Questions, answered.</h2>
      <p>Still deciding? Start on Free. Every paid feature can be trialled for 14 days from inside the app.</p>
    </div>
    <div class="dl-faq-list">
      <details open><summary>Who counts as a planner?</summary><p>Anyone who creates or edits release trains, dates or checklists. People who view, comment or receive digests are free on every plan, however many you invite.</p></details>
      <details><summary>Can we switch between monthly and annual billing?</summary><p>Yes. Move to annual at any time and we credit the unused part of your monthly plan. Annual plans renew once a year, and you can change plans at renewal.</p></details>
      <details><summary>What happens when we outgrow Free?</summary><p>Nothing breaks. You keep full access to your existing plan; creating a second active release train simply offers a 14-day Team trial.</p></details>
      <details><summary>Does Driftline read our source code?</summary><p>No. We sync metadata only: titles, statuses, assignees, labels and merge events. Your code never leaves your git provider.</p></details>
      <details><summary>Do you offer nonprofit or education pricing?</summary><p>Registered nonprofits and accredited schools get 50% off Team and Business. Mention it when you sign up and we'll apply it to your first invoice.</p></details>
      <details><summary>How does the uptime SLA work?</summary><p>Business and Enterprise include a 99.95% monthly uptime commitment, with service credits if we miss it. Our status history is public.</p></details>
    </div>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const CHANGELOG_HTML = `
<div class="dl-page">
<header class="dl-phead">
  <nav aria-label="Main"></nav>
  <div class="dl-wrap dl-phead-copy">
    <p class="dl-kicker">Changelog</p>
    <h1>What's new in Driftline</h1>
    <p>We ship every other Monday. Here is everything that changed, written for people rather than parsers.</p>
    <div class="dl-actions">
      <a class="dl-btn dl-btn-primary" href="/register">Try it free</a>
      <a class="dl-btn dl-btn-line" href="/roadmap">Vote on what's next</a>
    </div>
  </div>
</header>

<main class="dl-log-sec">
  <div class="dl-wrap">
    <h2 class="dl-sr">Releases</h2>
    <ol class="dl-releases">
      <li class="dl-rel">
        <div class="dl-rel-meta">
          <p class="dl-rel-ver">v24.10</p>
          <p class="dl-rel-date"><time datetime="2026-09-21">September 21, 2026</time></p>
          <span class="dl-rel-latest">Latest</span>
        </div>
        <div class="dl-rel-body">
          <h3>Release trains for multi-team launches</h3>
          <p>Group work from several teams under one version and one ship date. When an item can't make the train, move it forward with a short reason that shows up in every digest.</p>
          <div class="dl-rel-viz" aria-hidden="true">
            <div class="dl-train-track">
              <span class="dl-stop is-done"><b>5.0</b><em>Aug 21</em></span>
              <span class="dl-stop is-done"><b>5.1</b><em>Sep 25</em></span>
              <span class="dl-stop is-live"><b>5.2</b><em>Oct 30</em></span>
              <span class="dl-stop"><b>5.3</b><em>Dec 4</em></span>
            </div>
            <p class="dl-train-note"><span>New:</span> late items move to the next train with their history intact</p>
          </div>
          <ul class="dl-rel-changes">
            <li><span class="dl-tag dl-tag-new">New</span>Release trains with a shared ship date and version number.</li>
            <li><span class="dl-tag dl-tag-imp">Improved</span>Moving work between trains now asks for a one-line reason.</li>
            <li><span class="dl-tag dl-tag-fix">Fixed</span>Timeline zoom no longer resets when you change filters.</li>
          </ul>
        </div>
      </li>
      <li class="dl-rel">
        <div class="dl-rel-meta">
          <p class="dl-rel-ver">v24.9</p>
          <p class="dl-rel-date"><time datetime="2026-09-07">September 7, 2026</time></p>
        </div>
        <div class="dl-rel-body">
          <h3>Dependency alerts</h3>
          <p>Driftline now warns you when a blocking item's date moves past the start of the work that depends on it, and tells the owner before the stand-up does.</p>
          <ul class="dl-rel-changes">
            <li><span class="dl-tag dl-tag-new">New</span>Alerts in team chat with a one-click "notify owner" action.</li>
            <li><span class="dl-tag dl-tag-imp">Improved</span>Dependency lines draw three times faster on plans with 500+ items.</li>
            <li><span class="dl-tag dl-tag-fix">Fixed</span>Circular dependencies are now flagged instead of silently ignored.</li>
          </ul>
        </div>
      </li>
      <li class="dl-rel">
        <div class="dl-rel-meta">
          <p class="dl-rel-ver">v24.8</p>
          <p class="dl-rel-date"><time datetime="2026-08-24">August 24, 2026</time></p>
        </div>
        <div class="dl-rel-body">
          <h3>Changelogs that draft themselves</h3>
          <p>Merged pull requests are grouped by release and rewritten in plain English. Edit the draft, hit publish, and your public changelog is up to date.</p>
          <ul class="dl-rel-changes">
            <li><span class="dl-tag dl-tag-new">New</span>Auto-drafted changelog entries from merged pull requests.</li>
            <li><span class="dl-tag dl-tag-imp">Improved</span>Public changelog pages load 40% faster.</li>
            <li><span class="dl-tag dl-tag-fix">Fixed</span>Custom domains on changelog pages now renew their certificates automatically.</li>
          </ul>
        </div>
      </li>
      <li class="dl-rel">
        <div class="dl-rel-meta">
          <p class="dl-rel-ver">v24.7</p>
          <p class="dl-rel-date"><time datetime="2026-08-10">August 10, 2026</time></p>
        </div>
        <div class="dl-rel-body">
          <h3>Friday digests</h3>
          <p>A two-paragraph summary lands in stakeholders' inboxes every Friday at 4 pm, their time. Releases with no changes are left out, so the email stays short.</p>
          <ul class="dl-rel-changes">
            <li><span class="dl-tag dl-tag-new">New</span>Weekly digests with risks and owners called out.</li>
            <li><span class="dl-tag dl-tag-fix">Fixed</span>Digest times for teams on both sides of the date line.</li>
          </ul>
        </div>
      </li>
      <li class="dl-rel">
        <div class="dl-rel-meta">
          <p class="dl-rel-ver">v24.6</p>
          <p class="dl-rel-date"><time datetime="2026-07-27">July 27, 2026</time></p>
        </div>
        <div class="dl-rel-body">
          <h3>EU data residency</h3>
          <p>New workspaces can choose to keep all data in our EU region. Existing workspaces can request a migration from the security settings page.</p>
          <ul class="dl-rel-changes">
            <li><span class="dl-tag dl-tag-new">New</span>EU hosting option for Enterprise workspaces.</li>
            <li><span class="dl-tag dl-tag-imp">Improved</span>SCIM provisioning now syncs group membership.</li>
            <li><span class="dl-tag dl-tag-fix">Fixed</span>CSV exports include archived release trains.</li>
          </ul>
        </div>
      </li>
    </ol>
  </div>
</main>
${CTA_HTML}
${FOOTER_HTML}
</div>`;

const template: StarterTemplate = {
  id: "original-saas",
  name: "Driftline",
  tagline: "SaaS launch site with a live-looking product timeline, pricing switch, changelog and public roadmap",
  category: "saas",
  tags: ["saas", "software", "startup", "product", "b2b", "pricing", "changelog", "roadmap", "app", "tech"],
  source: "original",
  modules: ["auth", "feature-voting"],
  moduleSeeds: {
    "feature-voting": {
      features: [
        { title: "Dependency alerts", description: "Warn the owner when a blocking item's date moves past the work that depends on it.", author_name: "Mateo R. · Stackhouse", status: "shipped", votes: 305 },
        { title: "Release calendar view", description: "See every train on a month calendar next to company holidays and code freezes.", author_name: "Hannah B. · Parcelly", status: "planned", votes: 214 },
        { title: "Custom fields on release items", description: "Track risk level, owning team and budget code without a side spreadsheet.", author_name: "Dana K. · Oakfield", status: "in progress", votes: 187 },
        { title: "Embeddable status widget", description: "Show upcoming releases and the latest changelog entry inside our help centre.", author_name: "Luis P. · Brightpath", status: "under review", votes: 142 },
        { title: "Launch-day push alerts", description: "Notify the on-call lead on their phone when a checklist item slips on release day.", author_name: "Aiko T. · Lumen&Co", status: "planned", votes: 118 },
        { title: "Digests in more languages", description: "Our stakeholders in Lisbon and Munich would love Portuguese and German digests.", author_name: "Marta S. · Quanta Health", status: "under review", votes: 96 },
      ],
    },
  },
  theme: {
    name: "Driftline",
    mode: "light",
    primary: "#5b45f5",
    primary2: "#4331dd",
    accent: "#12a57b",
    bg: "#fbfbfd",
    surface: "#ffffff",
    surface2: "#f2f2f7",
    border: "#e3e3ea",
    text: "#0c0e14",
    textMuted: "#5c6270",
    font: `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    fontDisplay: `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    googleFonts: ["Geist:wght@300;400;500;600;700;800", "Geist Mono:wght@400;500;600"],
    radius: "14px",
    radiusSm: "9px",
    dark: {
      name: "Driftline Night",
      mode: "dark",
      primary: "#8578ff",
      primary2: "#b3aaff",
      accent: "#2fcf9c",
      bg: "#0a0b10",
      surface: "#12141b",
      surface2: "#181b24",
      border: "#272b36",
      text: "#eceef4",
      textMuted: "#9aa1b2",
      font: `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      fontDisplay: `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      googleFonts: ["Geist:wght@300;400;500;600;700;800", "Geist Mono:wght@400;500;600"],
      radius: "14px",
      radiusSm: "9px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: BASE_CSS + NAV_CSS + NAV_ON_INK_CSS + TRAIN_CSS + HOME_CSS + CTA_FOOTER_CSS },
    { title: "Pricing", slug: "pricing", isHome: false, html: PRICING_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + PRICING_CSS + CTA_FOOTER_CSS },
    { title: "Changelog", slug: "changelog", isHome: false, html: CHANGELOG_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + TRAIN_CSS + CHANGELOG_CSS + CTA_FOOTER_CSS },
  ],
};

registerTemplate(template);
export default template;
