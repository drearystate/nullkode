/**
 * Common Table — Nonprofit flagship (original-nonprofit)
 *
 * Art direction
 * - Mood: warm, hopeful, neighbourly. A Baltimore food-rescue charity that runs free
 *   markets and a community kitchen. It should feel like a market morning, not a
 *   fundraising appeal.
 * - Type: Young Serif for display (friendly, bookish, one weight) with Lexend for text,
 *   a face designed around reading fluency.
 * - Palette: tomato #b4381f and leaf green #2f6b3a on market-paper cream #fcf4e8,
 *   dark soil brown text.
 * - Layout grammar: a striped market awning with scalloped edge, round "stamp" figures,
 *   price-tag labels, a paper receipt for gifts, soft 20px corners and photos framed
 *   like produce crates.
 * - Signature: the awning hero, the "surplus to supper" route, the gift receipt that
 *   translates dollars into meals, and the volunteer shift board. The Impact report page
 *   adds monthly rescue bars, a where-the-food-went breakdown and financials.
 * - Pages: Home, Impact report, Get involved.
 * - Modules: donations (Donate, with a seeded donor wall) and contact-form (volunteer
 *   and partner enquiries).
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";


/* ── Shared CSS ─────────────────────────────────────────────────────── */
const BASE_CSS = `
.ct-page{font-size:1.06rem;line-height:1.65}
.ct-wrap{width:min(1160px,100% - 40px);margin-inline:auto}
.ct-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.ct-eyebrow{display:inline-flex;align-items:center;gap:10px;margin:0 0 16px;font-weight:700;font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-accent)}
.ct-eyebrow::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--nk-primary)}
.ct-h2{margin:0;font-size:clamp(2.1rem,4.4vw,3.3rem);line-height:1.08;font-weight:400;letter-spacing:-.01em;text-wrap:balance}
.ct-h2 em{font-style:normal;color:var(--nk-primary)}
.ct-intro{margin:18px 0 0;max-width:58ch;color:var(--nk-text-muted);font-size:1.12rem}
.ct-sec{padding:clamp(64px,9vw,112px) 0}
.ct-head{max-width:760px;margin-bottom:clamp(36px,5vw,56px)}
.ct-head-center{text-align:center;margin-inline:auto}
.ct-head-center .ct-intro{margin-inline:auto}
.ct-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:0 26px;border-radius:999px;font-weight:700;font-size:1.02rem;text-decoration:none;border:2px solid transparent;transition:background-color .2s,color .2s,border-color .2s}
.ct-btn:hover{text-decoration:none}
.ct-btn-tomato{background:var(--nk-primary);color:var(--nk-surface)}
.ct-btn-tomato:hover{background:var(--nk-primary-2);color:var(--nk-surface)}
.ct-btn-leaf{background:var(--nk-accent);color:var(--nk-surface)}
.ct-btn-leaf:hover{background:color-mix(in srgb,var(--nk-accent) 82%,var(--nk-text));color:var(--nk-surface)}
.ct-btn-line{color:var(--nk-text);border-color:var(--nk-text)}
.ct-btn-line:hover{background:var(--nk-text);color:var(--nk-surface)}
.ct-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.ct-link{font-weight:700;color:var(--nk-primary);text-decoration-line:underline;text-decoration-thickness:2px;text-underline-offset:5px}
.ct-link:hover{color:var(--nk-primary-2)}
.ct-programs{background:var(--nk-surface);border-block:2px solid var(--nk-text)}
.ct-page a:focus-visible,.ct-page summary:focus-visible,.ct-page [tabindex]:focus-visible,.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-accent);outline-offset:3px;border-radius:8px}
.ct-tag{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 22px;border-radius:6px 999px 999px 6px;background:var(--nk-surface);border:2px solid var(--nk-text);font-weight:700;font-size:.88rem;position:relative}
.ct-tag::before{content:"";position:absolute;left:8px;top:50%;width:7px;height:7px;margin-top:-3.5px;border-radius:50%;background:var(--nk-text)}
.ct-awning{position:relative;height:46px;margin-bottom:22px;background-image:repeating-linear-gradient(90deg,var(--nk-primary) 0 44px,var(--nk-surface-2) 44px 88px);box-shadow:inset 0 -6px 0 color-mix(in srgb,var(--nk-text) 12%,transparent)}
.ct-awning::after{content:"";position:absolute;left:0;right:0;top:100%;height:22px;background-image:radial-gradient(circle at 50% 0,var(--nk-primary) 21px,transparent 22px),radial-gradient(circle at 50% 0,var(--nk-surface-2) 21px,transparent 22px);background-size:88px 22px,88px 22px;background-position:0 0,44px 0;background-repeat:repeat-x}
`;

const NAV_CSS = `
.nk-nav{padding-block:16px!important;background:var(--nk-surface)!important;border-bottom:0!important;position:relative;z-index:20}
.nk-nav>.container{max-width:1160px}
.nk-nav .navbar-brand{display:inline-flex;align-items:center;gap:12px;font-family:var(--nk-font-display)!important;font-weight:400!important;font-size:1.45rem;color:var(--nk-text)!important}
.nk-nav .navbar-brand::before{content:"";width:34px;height:34px;flex:none;border-radius:50%;background-image:radial-gradient(circle at 50% 36%,var(--nk-accent) 0 5px,transparent 5.5px),radial-gradient(circle at 50% 62%,var(--nk-primary) 0 11px,transparent 11.5px);background-color:var(--nk-surface-2);box-shadow:inset 0 0 0 2px var(--nk-text)}
.nk-nav .nav-link{color:var(--nk-text)!important;font-weight:700!important;font-size:.98rem;padding:8px 14px!important;border-radius:999px}
.nk-nav .nav-link:hover{color:var(--nk-primary)!important;text-decoration:none}
.nk-nav .nav-link.active{background:var(--nk-surface-2);color:var(--nk-primary)!important}
.nk-nav .navbar-toggler{color:var(--nk-surface)!important;background-color:var(--nk-primary)!important;padding:0!important;width:48px;height:48px;border-radius:50%!important;border:0!important;font-size:0;line-height:0;background-image:linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor);background-size:20px 2.5px;background-position:center 16px,center 23px,center 30px;background-repeat:no-repeat}
.nk-nav .navbar-toggler>*{display:none!important}
.nk-nav .dropdown-menu{border-radius:18px;padding:8px;background:var(--nk-surface)!important;border:2px solid var(--nk-text)!important}
.nk-nav .dropdown-item{border-radius:12px;padding:9px 14px;color:var(--nk-text)!important;font-weight:600}
.nk-nav .dropdown-item:hover,.nk-nav .dropdown-item:focus{background:var(--nk-surface-2)}
@media (min-width:992px){.nk-nav .dropdown{position:relative}.nk-nav .dropdown-menu-end{right:0;left:auto}}
@media (max-width:991.98px){.nk-nav .navbar-collapse{margin-top:14px;padding:10px;border-radius:20px;background:var(--nk-bg);border:2px solid var(--nk-text)}.nk-nav .nav-link{padding:12px 16px!important}}
`;

const CTA_FOOTER_CSS = `
.ct-give{padding:clamp(56px,8vw,96px) 0;background:var(--nk-primary);color:var(--nk-surface)}
.ct-give-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:28px 56px;align-items:center}
.ct-give h2{margin:0;color:var(--nk-surface);font-size:clamp(2.1rem,4.4vw,3.3rem);line-height:1.08;font-weight:400;text-wrap:balance}
.ct-give p{margin:16px 0 0;color:color-mix(in srgb,var(--nk-surface) 95%,var(--nk-primary));font-size:1.12rem;max-width:52ch}
.ct-give .ct-actions{margin-top:0;justify-content:flex-end}
.ct-give .ct-btn-line{color:var(--nk-surface);border-color:var(--nk-surface)}
.ct-give .ct-btn-line:hover{background:var(--nk-surface);color:var(--nk-primary)}
.ct-btn-cream{background:var(--nk-surface);color:var(--nk-primary-2)}
.ct-btn-cream:hover{background:var(--nk-bg);color:var(--nk-primary-2)}
.ct-give a:focus-visible{outline-color:var(--nk-surface)}
@media (max-width:860px){.ct-give-grid{grid-template-columns:minmax(0,1fr)}.ct-give .ct-actions{justify-content:flex-start}}
.ct-footer{padding:56px 0 28px;background:var(--nk-text);color:color-mix(in srgb,var(--nk-surface) 78%,var(--nk-text));font-size:.98rem}
.ct-foot-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:32px}
.ct-foot-name{margin:0 0 12px;font-family:var(--nk-font-display);font-size:1.6rem;color:var(--nk-surface)}
.ct-foot-grid address{font-style:normal;margin:0;line-height:1.7}
.ct-foot-h{margin:6px 0 14px;font-weight:700;font-size:.82rem;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-surface)}
.ct-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.ct-footer a{color:color-mix(in srgb,var(--nk-surface) 78%,var(--nk-text));text-decoration:none}
.ct-footer a:hover{color:var(--nk-surface);text-decoration:underline}
.ct-footer a:focus-visible{outline-color:var(--nk-surface)}
.ct-foot-base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;margin-top:44px;padding-top:22px;border-top:1px solid color-mix(in srgb,var(--nk-surface) 18%,transparent);font-size:.88rem}
.ct-foot-base p{margin:0}
@media (max-width:860px){.ct-foot-grid{grid-template-columns:1fr 1fr}}
@media (max-width:460px){.ct-foot-grid{grid-template-columns:minmax(0,1fr)}}
`;

const PAGE_HEAD_CSS = `
.ct-phead{background:var(--nk-surface)}
.ct-phead-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:32px 64px;align-items:center;padding:clamp(40px,6vw,80px) 0 clamp(48px,7vw,88px)}
.ct-phead h1{margin:0;font-size:clamp(2.6rem,6vw,4.6rem);line-height:1.02;font-weight:400;letter-spacing:-.015em;text-wrap:balance}
.ct-phead h1 em{font-style:normal;color:var(--nk-primary)}
.ct-phead-fig{margin:0;border-radius:24px;overflow:hidden;border:2px solid var(--nk-text);transform:rotate(1.5deg)}
.ct-phead-fig img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}
@media (max-width:860px){.ct-phead-grid{grid-template-columns:minmax(0,1fr)}.ct-phead-fig{max-width:460px;transform:none}}
`;

/* ── Home ───────────────────────────────────────────────────────────── */
const HOME_CSS = `
.ct-hero{background:var(--nk-surface);padding-bottom:clamp(56px,7vw,96px)}
.ct-hero-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:48px 64px;align-items:center;padding-top:clamp(32px,5vw,64px)}
.ct-hero h1{margin:0;font-size:clamp(2.7rem,5.8vw,4.9rem);line-height:1.02;font-weight:400;letter-spacing:-.02em;text-wrap:balance}
.ct-hero h1 em{font-style:normal;color:var(--nk-primary)}
.ct-lede{margin:24px 0 0;max-width:52ch;font-size:1.2rem;color:var(--nk-text-muted)}
.ct-hero-note{display:flex;flex-wrap:wrap;gap:8px 20px;margin:24px 0 0;color:var(--nk-text-muted);font-size:.95rem}
.ct-hero-note b{color:var(--nk-accent)}
.ct-hero-fig{margin:0;position:relative}
.ct-hero-fig img{display:block;width:100%;height:auto;aspect-ratio:5/4;object-fit:cover;object-position:38% 50%;border-radius:28px 28px 28px 4px;border:2px solid var(--nk-text)}
.ct-hero-fig .ct-tag{position:absolute;left:-14px;top:22px;transform:rotate(-4deg);box-shadow:4px 4px 0 var(--nk-text)}
.ct-hero-fig .ct-tag b{color:var(--nk-primary)}
.ct-hero-fig figcaption{margin-top:16px;padding-left:4px;font-size:.9rem;color:var(--nk-text-muted)}
@media (max-width:900px){.ct-hero-grid{grid-template-columns:minmax(0,1fr)}.ct-hero-fig .ct-tag{left:10px}}
.ct-stamps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;margin:0}
.ct-stamp{display:flex;flex-direction:column-reverse;align-items:center;justify-content:center;gap:6px;aspect-ratio:1;padding:18px;border-radius:50%;text-align:center;background:var(--nk-surface);border:2px dashed color-mix(in srgb,var(--nk-text) 45%,transparent);box-shadow:0 0 0 8px var(--nk-surface),0 0 0 10px var(--nk-text)}
.ct-stamp dd{margin:0;font-family:var(--nk-font-display);font-size:clamp(1.9rem,3.6vw,2.8rem);line-height:1;color:var(--nk-primary)}
.ct-stamp dt{font-weight:700;font-size:.95rem;line-height:1.3;max-width:15ch}
.ct-stamp:nth-child(even) dd{color:var(--nk-accent)}
.ct-stamps-note{margin:40px 0 0;text-align:center;color:var(--nk-text-muted);font-size:.92rem}
@media (max-width:900px){.ct-stamps{grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}}
@media (max-width:420px){.ct-stamps{gap:22px 18px}.ct-stamp{padding:10px}.ct-stamp dt{font-size:.8rem}}
.ct-route{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;counter-reset:ctroute}
.ct-stop{position:relative;padding:26px 22px 24px;border-radius:22px;background:var(--nk-surface);border:2px solid var(--nk-text);counter-increment:ctroute}
.ct-stop::before{content:counter(ctroute);display:grid;place-items:center;width:46px;height:46px;margin-bottom:16px;border-radius:50%;background:var(--nk-primary);color:var(--nk-surface);font-family:var(--nk-font-display);font-size:1.4rem}
.ct-stop:nth-child(even)::before{background:var(--nk-accent)}
.ct-stop::after{content:"";position:absolute;top:48px;right:-20px;width:22px;height:2px;background:var(--nk-text)}
.ct-stop:last-child::after{display:none}
.ct-stop h3{margin:0;font-size:1.4rem;font-weight:400}
.ct-stop p{margin:8px 0 0;color:var(--nk-text-muted);font-size:.98rem}
.ct-stop small{display:inline-block;margin-top:14px;padding:4px 10px;border-radius:999px;background:var(--nk-surface-2);font-weight:700;font-size:.82rem}
@media (max-width:980px){.ct-route{grid-template-columns:repeat(2,minmax(0,1fr))}.ct-stop:nth-child(2)::after{display:none}}
@media (max-width:560px){.ct-route{grid-template-columns:minmax(0,1fr)}.ct-stop::after{display:none}}
.ct-prog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.ct-prog{display:flex;flex-direction:column;border-radius:24px;overflow:hidden;background:var(--nk-bg);border:2px solid var(--nk-text)}
.ct-prog img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-bottom:2px solid var(--nk-text)}
.ct-prog-body{display:flex;flex-direction:column;flex:1;padding:24px}
.ct-prog-when{margin:0;font-weight:700;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-accent)}
.ct-prog h3{margin:8px 0 0;font-size:1.7rem;font-weight:400;line-height:1.15}
.ct-prog-body>p:not(.ct-prog-when){margin:10px 0 0;color:var(--nk-text-muted)}
.ct-prog-fig{display:flex;align-items:baseline;gap:10px;margin:auto 0 0!important;padding-top:18px;border-top:2px dashed var(--nk-border)}
.ct-prog-body .ct-prog-fig{color:var(--nk-text)}
.ct-prog-fig strong{font-family:var(--nk-font-display);font-weight:400;font-size:2rem;color:var(--nk-primary)}
@media (max-width:980px){.ct-prog-grid{grid-template-columns:minmax(0,1fr)}.ct-prog{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)}.ct-prog img{height:100%;aspect-ratio:auto;border-bottom:0;border-right:2px solid var(--nk-text)}}
@media (max-width:600px){.ct-prog{display:flex}.ct-prog img{height:auto;aspect-ratio:4/3;border-right:0;border-bottom:2px solid var(--nk-text)}}
.ct-story{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:40px 64px;align-items:center}
.ct-story-fig{margin:0;position:relative}
.ct-story-fig img{display:block;width:100%;height:auto;aspect-ratio:9/8;object-fit:cover;border-radius:50% 50% 24px 24px;border:2px solid var(--nk-text)}
.ct-quote{margin:0}
.ct-quote p{margin:0;font-family:var(--nk-font-display);font-size:clamp(1.6rem,3vw,2.4rem);line-height:1.25}
.ct-quote p::before{content:"“";color:var(--nk-primary)}
.ct-quote p::after{content:"”";color:var(--nk-primary)}
.ct-quote footer{margin-top:22px;color:var(--nk-text-muted)}
.ct-quote footer b{color:var(--nk-text)}
.ct-story-more{margin:22px 0 0;color:var(--nk-text-muted);max-width:56ch}
@media (max-width:900px){.ct-story{grid-template-columns:minmax(0,1fr)}.ct-story-fig{max-width:460px}}
.ct-donate{background:var(--nk-surface-2);border-block:2px solid var(--nk-text)}
.ct-donate-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,420px);gap:48px 72px;align-items:center}
.ct-donate-fig{margin:28px 0 0;display:flex;align-items:center;gap:18px}
.ct-donate-fig img{width:120px;height:120px;border-radius:50%;object-fit:cover;border:2px solid var(--nk-text);flex:none}
.ct-donate-fig figcaption{color:var(--nk-text-muted);font-size:.98rem}
.ct-donate-fig figcaption b{display:block;color:var(--nk-text);font-size:1.05rem}
.ct-receipt{position:relative;padding:30px 30px 44px;background:var(--nk-surface);border:2px solid var(--nk-text);border-bottom:0;border-radius:14px 14px 0 0;box-shadow:8px 8px 0 color-mix(in srgb,var(--nk-text) 14%,transparent)}
.ct-receipt::after{content:"";position:absolute;left:-2px;right:-2px;bottom:-14px;height:16px;background-image:linear-gradient(135deg,var(--nk-surface) 50%,transparent 50%),linear-gradient(225deg,var(--nk-surface) 50%,transparent 50%);background-size:16px 16px;background-repeat:repeat-x}
.ct-receipt-head{margin:0 0 4px;text-align:center;font-family:var(--nk-font-display);font-size:1.6rem}
.ct-receipt-sub{margin:0 0 20px;text-align:center;font-size:.85rem;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text-muted)}
.ct-lines{margin:0;border-top:2px dashed var(--nk-border)}
.ct-lines div{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:baseline;padding:14px 0;border-bottom:2px dashed var(--nk-border)}
.ct-lines dt{font-family:var(--nk-font-display);font-size:1.5rem;color:var(--nk-primary);min-width:72px}
.ct-lines dd{margin:0;line-height:1.45}
.ct-receipt-total{display:flex;justify-content:space-between;gap:12px;margin:18px 0 0;font-weight:700}
.ct-receipt .ct-btn{width:100%;margin-top:20px}
.ct-receipt-fine{margin:14px 0 0;text-align:center;font-size:.85rem;color:var(--nk-text-muted)}
@media (max-width:900px){.ct-donate-grid{grid-template-columns:minmax(0,1fr)}.ct-receipt{max-width:460px}}
@media (max-width:420px){.ct-receipt{padding:24px 18px 40px}}
.ct-shifts{list-style:none;margin:0;padding:0;border-top:2px solid var(--nk-text)}
.ct-shift{display:grid;grid-template-columns:130px minmax(0,1.3fr) minmax(0,1fr) auto;gap:10px 28px;align-items:center;padding:20px 4px;border-bottom:2px dashed var(--nk-border)}
.ct-shift-day{font-family:var(--nk-font-display);font-size:1.35rem}
.ct-shift h3{margin:0;font-family:var(--nk-font);font-size:1.08rem;font-weight:700}
.ct-shift p{margin:2px 0 0;color:var(--nk-text-muted);font-size:.95rem}
.ct-shift-time{color:var(--nk-text-muted);font-weight:700}
.ct-spots{justify-self:end;padding:6px 14px;border-radius:999px;font-weight:700;font-size:.88rem;white-space:nowrap;background:color-mix(in srgb,var(--nk-accent) 14%,var(--nk-surface));color:var(--nk-accent);border:2px solid var(--nk-accent)}
.ct-spots-low{background:color-mix(in srgb,var(--nk-primary) 12%,var(--nk-surface));color:var(--nk-primary-2);border-color:var(--nk-primary)}
.ct-shifts-foot{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;margin-top:28px}
.ct-shifts-foot p{margin:0;color:var(--nk-text-muted)}
@media (max-width:820px){.ct-shift{grid-template-columns:minmax(0,1fr) auto}.ct-shift-day{grid-column:1/-1}.ct-shift-time{grid-column:1}.ct-spots{grid-row:2/4;grid-column:2;align-self:center}}
.ct-money{background:var(--nk-surface)}
.ct-money-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:40px 72px;align-items:center}
.ct-split{display:flex;height:64px;border-radius:16px;overflow:hidden;border:2px solid var(--nk-text)}
.ct-split span{display:flex;align-items:center;padding:0 14px;font-weight:700;font-size:.92rem;white-space:nowrap;overflow:hidden}
.ct-split-prog{flex:88;background:var(--nk-accent);color:var(--nk-surface)}
.ct-split-fund{flex:7;background:var(--nk-primary)}
.ct-split-admin{flex:5;background:var(--nk-surface-2)}
.ct-split-key{list-style:none;display:grid;gap:10px;margin:22px 0 0;padding:0}
.ct-split-key li{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:12px;align-items:center}
.ct-split-key i{width:18px;height:18px;border-radius:5px;border:2px solid var(--nk-text)}
.ct-split-key b{font-family:var(--nk-font-display);font-weight:400;font-size:1.3rem}
.ct-k-prog{background:var(--nk-accent)}.ct-k-fund{background:var(--nk-primary)}.ct-k-admin{background:var(--nk-surface-2)}
.ct-trust{list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin:26px 0 0;padding:0}
.ct-trust li{padding:8px 14px;border-radius:999px;background:var(--nk-surface-2);font-weight:700;font-size:.9rem}
@media (max-width:900px){.ct-money-grid{grid-template-columns:minmax(0,1fr)}}
.ct-partners{padding:40px 0;border-top:2px solid var(--nk-text)}
.ct-partners-inner{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:18px 40px}
.ct-partners p{margin:0;font-weight:700;color:var(--nk-text-muted)}
.ct-partners ul{list-style:none;display:flex;flex-wrap:wrap;gap:12px 32px;margin:0;padding:0}
.ct-partners li{font-family:var(--nk-font-display);font-size:1.25rem;color:color-mix(in srgb,var(--nk-text) 72%,var(--nk-bg))}
`;

/* ── Impact report ──────────────────────────────────────────────────── */
const IMPACT_CSS = `
.ct-year{display:inline-block;margin:0 0 18px;padding:8px 18px;border-radius:999px;background:var(--nk-primary);color:var(--nk-surface);font-weight:700}
.ct-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:0}
.ct-kpi{display:flex;flex-direction:column-reverse;justify-content:flex-end;gap:8px;padding:26px;border-radius:22px;background:var(--nk-surface);border:2px solid var(--nk-text)}
.ct-kpi dd{margin:0;font-family:var(--nk-font-display);font-size:clamp(2.2rem,4vw,3rem);line-height:1;color:var(--nk-primary)}
.ct-kpi dt{font-weight:700}
.ct-kpi dt span{display:block;margin-top:4px;font-weight:400;color:var(--nk-text-muted);font-size:.92rem}
.ct-kpi:nth-child(3n+2) dd{color:var(--nk-accent)}
@media (max-width:900px){.ct-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.ct-kpis{grid-template-columns:minmax(0,1fr)}}
.ct-chart-card{padding:28px;border-radius:24px;background:var(--nk-surface);border:2px solid var(--nk-text)}
.ct-chart-title{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;margin:0 0 22px}
.ct-chart-title b{font-family:var(--nk-font-display);font-weight:400;font-size:1.5rem}
.ct-chart-title span{color:var(--nk-text-muted)}
.ct-bars{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px;align-items:end;height:260px;padding-bottom:0;border-bottom:2px solid var(--nk-text);background-image:linear-gradient(color-mix(in srgb,var(--nk-text) 10%,transparent) 1px,transparent 1px);background-size:100% 25%}
.ct-bar{position:relative;display:block;border-radius:10px 10px 0 0;background:var(--nk-accent)}
.ct-bar.is-peak{background:var(--nk-primary)}
.ct-bar b{position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%);font-size:.78rem;white-space:nowrap}
.ct-bar-x{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px;margin-top:8px;font-size:.82rem;color:var(--nk-text-muted);text-align:center}
.ct-v58{height:58%}.ct-v61{height:61%}.ct-v66{height:66%}.ct-v64{height:64%}.ct-v70{height:70%}.ct-v74{height:74%}.ct-v79{height:79%}.ct-v83{height:83%}.ct-v77{height:77%}.ct-v81{height:81%}.ct-v92{height:92%}.ct-v88{height:88%}
@media (max-width:640px){.ct-chart-card{padding:20px 14px}.ct-bars{gap:4px;height:200px}.ct-bar b{display:none}.ct-bar-x{gap:4px;font-size:.7rem}}
.ct-where{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;margin-top:28px}
.ct-hbars{list-style:none;margin:0;padding:0;display:grid;gap:18px}
.ct-hbar-top{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;font-weight:700}
.ct-hbar-top span:last-child{font-family:var(--nk-font-display);font-weight:400;font-size:1.25rem;color:var(--nk-primary)}
.ct-hbar{display:block;height:14px;border-radius:999px;background:var(--nk-surface-2);overflow:hidden;border:2px solid var(--nk-text)}
.ct-hbar i{display:block;height:100%;background:var(--nk-accent)}
.ct-w58{width:58%}.ct-w22{width:22%}.ct-w14{width:14%}.ct-w6{width:6%}.ct-w31{width:31%}.ct-w24{width:24%}.ct-w19{width:19%}.ct-w15{width:15%}.ct-w11{width:11%}
@media (max-width:860px){.ct-where{grid-template-columns:minmax(0,1fr)}}
.ct-voices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.ct-voice{margin:0;padding:26px;border-radius:24px;background:var(--nk-surface);border:2px solid var(--nk-text)}
.ct-voice p{margin:0;font-family:var(--nk-font-display);font-size:1.25rem;line-height:1.4}
.ct-voice footer{margin-top:16px;color:var(--nk-text-muted);font-size:.95rem}
.ct-voice footer b{display:block;color:var(--nk-text)}
@media (max-width:900px){.ct-voices{grid-template-columns:minmax(0,1fr)}}
.ct-fin{background:var(--nk-surface);border-block:2px solid var(--nk-text)}
.ct-fin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}
.ct-fin-card{display:grid;grid-template-columns:180px minmax(0,1fr);gap:24px;align-items:center;padding:26px;border-radius:24px;background:var(--nk-bg);border:2px solid var(--nk-text)}
.ct-fin-card h3{grid-column:1/-1;margin:0;font-size:1.5rem;font-weight:400}
.ct-donut{position:relative;width:180px;height:180px;border-radius:50%;border:2px solid var(--nk-text)}
.ct-donut::after{content:"";position:absolute;inset:38px;border-radius:50%;background:var(--nk-bg);border:2px solid var(--nk-text)}
.ct-donut span{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--nk-font-display);font-size:1.3rem;line-height:1.1}
.ct-donut small{font-family:var(--nk-font);font-size:.78rem;color:var(--nk-text-muted)}
.ct-donut-in{background-image:conic-gradient(var(--nk-primary) 0 41%,var(--nk-accent) 41% 69%,color-mix(in srgb,var(--nk-primary) 45%,var(--nk-surface)) 69% 86%,var(--nk-surface-2) 86% 100%)}
.ct-donut-out{background-image:conic-gradient(var(--nk-accent) 0 88%,var(--nk-primary) 88% 95%,var(--nk-surface-2) 95% 100%)}
.ct-fin-card ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.ct-fin-card li{display:grid;grid-template-columns:14px minmax(0,1fr) auto;gap:10px;align-items:center;font-size:.95rem}
.ct-fin-card li i{width:14px;height:14px;border-radius:4px;border:2px solid var(--nk-text)}
.ct-c-tomato{background:var(--nk-primary)}.ct-c-leaf{background:var(--nk-accent)}.ct-c-blush{background:color-mix(in srgb,var(--nk-primary) 45%,var(--nk-surface))}.ct-c-sand{background:var(--nk-surface-2)}
.ct-fin-note{margin:24px 0 0;color:var(--nk-text-muted);font-size:.92rem}
@media (max-width:980px){.ct-fin-grid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:520px){.ct-fin-card{grid-template-columns:minmax(0,1fr);justify-items:center}.ct-fin-card ul{width:100%}}
.ct-goals{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 40px}
.ct-goal-top{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.ct-goal h3{margin:0;font-family:var(--nk-font);font-size:1.08rem;font-weight:700}
.ct-goal-top span{font-family:var(--nk-font-display);font-size:1.25rem;color:var(--nk-accent);white-space:nowrap}
.ct-goal p{margin:6px 0 10px;color:var(--nk-text-muted);font-size:.95rem}
.ct-goal .ct-hbar i{background:var(--nk-primary)}
.ct-w35{width:35%}.ct-w40{width:40%}.ct-w60{width:60%}.ct-w70{width:70%}
@media (max-width:760px){.ct-goals{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Get involved ───────────────────────────────────────────────────── */
const INVOLVED_CSS = `
.ct-roles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.ct-role{display:flex;flex-direction:column;padding:26px;border-radius:24px;background:var(--nk-surface);border:2px solid var(--nk-text)}
.ct-role-icon{display:grid;place-items:center;width:52px;height:52px;margin-bottom:16px;border-radius:16px;background:var(--nk-surface-2);border:2px solid var(--nk-text);font-family:var(--nk-font-display);font-size:1.4rem;color:var(--nk-primary)}
.ct-role h3{margin:0;font-size:1.5rem;font-weight:400}
.ct-role p{margin:8px 0 0;color:var(--nk-text-muted)}
.ct-role dl{margin:auto 0 0;padding-top:18px;display:grid;gap:8px;font-size:.95rem}
.ct-role dl div{display:flex;justify-content:space-between;gap:12px;padding-top:8px;border-top:2px dashed var(--nk-border)}
.ct-role dt{color:var(--nk-text-muted)}
.ct-role dd{margin:0;font-weight:700;text-align:right}
@media (max-width:980px){.ct-roles{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:600px){.ct-roles{grid-template-columns:minmax(0,1fr)}}
.ct-ways{background:var(--nk-surface);border-block:2px solid var(--nk-text)}
.ct-ways-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.ct-way{padding:30px;border-radius:24px;border:2px solid var(--nk-text)}
.ct-way h3{margin:0;font-size:1.7rem;font-weight:400}
.ct-way p{margin:10px 0 0}
.ct-way ul{margin:14px 0 0;padding-left:20px}
.ct-way li+li{margin-top:6px}
.ct-way-leaf{background:var(--nk-accent);color:var(--nk-surface)}
.ct-way-leaf h3{color:var(--nk-surface)}
.ct-way-leaf a{color:var(--nk-surface)}
.ct-way-leaf a:focus-visible{outline-color:var(--nk-surface)}
.ct-way-cream{background:var(--nk-bg)}
@media (max-width:860px){.ct-ways-grid{grid-template-columns:minmax(0,1fr)}}
.ct-accept{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.ct-accept-col{padding:26px;border-radius:24px;background:var(--nk-surface);border:2px solid var(--nk-text)}
.ct-accept-col h3{margin:0 0 14px;font-size:1.4rem;font-weight:400}
.ct-accept-col ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.ct-accept-col li{display:flex;gap:12px}
.ct-yes li::before{content:"✓";flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--nk-accent);color:var(--nk-surface);font-weight:700;font-size:.8rem}
.ct-no li::before{content:"×";flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--nk-primary);color:var(--nk-surface);font-weight:700}
@media (max-width:760px){.ct-accept{grid-template-columns:minmax(0,1fr)}}
.ct-faq-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:32px 64px}
.ct-faq details{margin-bottom:12px;border-radius:18px;background:var(--nk-surface);border:2px solid var(--nk-text)}
.ct-faq summary{padding:18px 54px 18px 22px;font-weight:700;font-size:1.05rem}
.ct-faq summary::after{top:50%;right:16px;transform:translateY(-50%);color:var(--nk-primary)}
.ct-faq details p{margin:0;padding:0 22px 20px;color:var(--nk-text-muted)}
@media (max-width:860px){.ct-faq-grid{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Shared HTML ────────────────────────────────────────────────────── */
const GIVE_HTML = `
<section class="ct-give" aria-labelledby="ct-give-h">
  <div class="ct-wrap ct-give-grid">
    <div>
      <h2 id="ct-give-h">Tonight, 4,000 pounds of good food needs a home.</h2>
      <p>A gift of any size keeps our trucks on the road and our markets stocked. Monthly gifts help us plan the pick-ups for next season.</p>
    </div>
    <div class="ct-actions">
      <a class="ct-btn ct-btn-cream" href="/donate">Give a gift</a>
      <a class="ct-btn ct-btn-line" href="/get-involved">Volunteer a shift</a>
    </div>
  </div>
</section>`;

const FOOTER_HTML = `
<footer class="ct-footer">
  <div class="ct-wrap">
    <div class="ct-foot-grid">
      <div>
        <p class="ct-foot-name">Common Table</p>
        <address>Common Table Food Collective<br>2211 Harford Road<br>Baltimore, MD 21218</address>
      </div>
      <div>
        <p class="ct-foot-h">Help</p>
        <ul>
          <li><a href="/donate">Give a gift</a></li>
          <li><a href="/get-involved">Volunteer</a></li>
          <li><a href="/contact">Partner with us</a></li>
        </ul>
      </div>
      <div>
        <p class="ct-foot-h">Learn</p>
        <ul>
          <li><a href="/impact">Impact report 2025</a></li>
          <li><a href="/get-involved#faq">Volunteer FAQ</a></li>
        </ul>
      </div>
      <div>
        <p class="ct-foot-h">Visit</p>
        <ul>
          <li>Markets open Tue–Sat</li>
          <li><a href="tel:+14105550163">(410) 555-0163</a></li>
          <li><a href="mailto:hello@commontable.example">hello@commontable.example</a></li>
        </ul>
      </div>
    </div>
    <div class="ct-foot-base">
      <p>© 2026 Common Table Food Collective, a registered 501(c)(3) nonprofit. EIN 52-4418307. Gifts are tax-deductible as allowed by law.</p>
      <p>No good food wasted. No neighbor hungry.</p>
    </div>
  </div>
</footer>`;

/* ── Pages ──────────────────────────────────────────────────────────── */
const HOME_HTML = `
<div class="ct-page">
<nav aria-label="Main"></nav>
<header class="ct-hero">
  <div class="ct-awning" aria-hidden="true"></div>
  <div class="ct-wrap ct-hero-grid">
    <div>
      <p class="ct-eyebrow">Food rescue · Baltimore, since 2014</p>
      <h1>Good food belongs on <em>tables,</em> not in landfill.</h1>
      <p class="ct-lede">Every night, grocers and farms throw away food that could feed thousands. We rescue it and share it with our neighbors through free markets and a community kitchen, with no forms, no lines and no judgement.</p>
      <div class="ct-actions">
        <a class="ct-btn ct-btn-tomato" href="/donate">Give a gift</a>
        <a class="ct-btn ct-btn-line" href="/get-involved">Volunteer a shift</a>
      </div>
      <p class="ct-hero-note"><span><b>$1</b> rescues about 3 meals</span><span><b>88¢</b> of every dollar goes to programs</span></p>
    </div>
    <figure class="ct-hero-fig">
      <img src="/media/generated/nonprofit-market-hands.webp" alt="A volunteer hands an apple across a market stall piled with tomatoes and nectarines" width="960" height="640">
      <span class="ct-tag">Rescued today: <b>4,120 lb</b></span>
      <figcaption>Saturday morning at our Harford Road market.</figcaption>
    </figure>
  </div>
</header>

<main>
<section class="ct-sec" aria-labelledby="ct-impact-h">
  <div class="ct-wrap">
    <div class="ct-head ct-head-center">
      <p class="ct-eyebrow">Last year, together</p>
      <h2 class="ct-h2" id="ct-impact-h">What 1,850 volunteers made possible in 2025.</h2>
    </div>
    <dl class="ct-stamps">
      <div class="ct-stamp"><dt>pounds of food rescued</dt><dd>3.1M</dd></div>
      <div class="ct-stamp"><dt>meals shared with neighbors</dt><dd>2.6M</dd></div>
      <div class="ct-stamp"><dt>households at our markets</dt><dd>14,200</dd></div>
      <div class="ct-stamp"><dt>grocers, farms and bakeries</dt><dd>140</dd></div>
    </dl>
    <p class="ct-stamps-note">Figures from our audited 2025 impact report. <a class="ct-link" href="/impact">Read the full report</a></p>
  </div>
</section>

<section class="ct-sec" aria-labelledby="ct-route-h">
  <div class="ct-wrap">
    <div class="ct-head">
      <p class="ct-eyebrow">How it works</p>
      <h2 class="ct-h2" id="ct-route-h">From surplus to supper in <em>under 24 hours.</em></h2>
    </div>
    <ol class="ct-route">
      <li class="ct-stop"><h3>Rescue</h3><p>Our refrigerated trucks collect surplus from 140 grocers, farms and bakeries, seven nights a week.</p><small>9 pm – 1 am</small></li>
      <li class="ct-stop"><h3>Sort</h3><p>Volunteers check every item for quality at our warehouse and pack it for the next morning.</p><small>7 – 10 am</small></li>
      <li class="ct-stop"><h3>Share</h3><p>Neighbors choose their own groceries, free, at three markets and eighteen school pantries.</p><small>11 am – 6 pm</small></li>
      <li class="ct-stop"><h3>Cook</h3><p>Anything left becomes hot meals in our community kitchen, cooked by trainee chefs.</p><small>Every evening</small></li>
    </ol>
  </div>
</section>

<section class="ct-sec ct-programs" aria-labelledby="ct-prog-h">
  <div class="ct-wrap">
    <div class="ct-head">
      <p class="ct-eyebrow">Our programs</p>
      <h2 class="ct-h2" id="ct-prog-h">Three ways good food reaches the table.</h2>
    </div>
    <div class="ct-prog-grid">
      <article class="ct-prog">
        <img src="/media/generated/nonprofit-market-greens.webp" alt="Wooden crates of leeks, beets and greens at an outdoor market" width="800" height="533" loading="lazy">
        <div class="ct-prog-body">
          <p class="ct-prog-when">Tue – Sat · 3 locations</p>
          <h3>Neighborhood Markets</h3>
          <p>Free grocery markets that look and feel like any other shop. Neighbors pick what they need and what their families actually eat.</p>
          <p class="ct-prog-fig"><strong>9,600</strong>shoppers each week</p>
        </div>
      </article>
      <article class="ct-prog">
        <img src="/media/generated/nonprofit-kitchen.webp" alt="A trainee chef preparing meals in a stainless-steel community kitchen" width="720" height="640" loading="lazy">
        <div class="ct-prog-body">
          <p class="ct-prog-when">Every evening · Harford Road</p>
          <h3>Community Kitchen</h3>
          <p>Hot meals for seniors and shelters, cooked by adults in our 12-week paid culinary training program.</p>
          <p class="ct-prog-fig"><strong>86%</strong>of trainees hired within 3 months</p>
        </div>
      </article>
      <article class="ct-prog">
        <img src="/media/generated/nonprofit-groceries-basket.webp" alt="A woven basket of asparagus, avocados, peppers and tomatoes" width="600" height="600" loading="lazy">
        <div class="ct-prog-body">
          <p class="ct-prog-when">School days · 18 schools</p>
          <h3>School Pantries</h3>
          <p>Discreet pantries inside city schools, so children and families can take food home with no sign-up at all.</p>
          <p class="ct-prog-fig"><strong>6,300</strong>students with access</p>
        </div>
      </article>
    </div>
  </div>
</section>

<section class="ct-sec" aria-labelledby="ct-story-h">
  <div class="ct-wrap ct-story">
    <figure class="ct-story-fig"><img src="/media/generated/nonprofit-shopper-peas.webp" alt="An older man's hands opening a fresh pea pod at a market stall" width="720" height="640" loading="lazy"></figure>
    <div>
      <p class="ct-eyebrow">Neighbor story</p>
      <h2 class="ct-sr" id="ct-story-h">Walter's story</h2>
      <blockquote class="ct-quote">
        <p>I came for the vegetables after my wife passed and money got tight. Now I run the Tuesday produce table. Nobody here treats you like a charity case.</p>
        <footer><b>Walter Ellis, 71</b> · shopper since 2021, volunteer since 2023</footer>
      </blockquote>
      <p class="ct-story-more">A third of our volunteers first came to Common Table as shoppers. That's our favorite number.</p>
    </div>
  </div>
</section>

<section class="ct-sec ct-donate" aria-labelledby="ct-donate-h">
  <div class="ct-wrap ct-donate-grid">
    <div>
      <p class="ct-eyebrow">Give</p>
      <h2 class="ct-h2" id="ct-donate-h">Rescued food is free. <em>Getting it here isn't.</em></h2>
      <p class="ct-intro">Your gift pays for fuel, refrigeration, warehouse space and the kitchen. Because the food itself is donated, every dollar goes a very long way.</p>
      <figure class="ct-donate-fig">
        <img src="/media/generated/nonprofit-bread.webp" alt="A basket of sliced sourdough bread lined with a red checked cloth" width="800" height="600" loading="lazy">
        <figcaption><b>Every night, 11 bakeries</b>send us their unsold bread instead of throwing it away.</figcaption>
      </figure>
    </div>
    <div class="ct-receipt">
      <p class="ct-receipt-head">What your gift does</p>
      <p class="ct-receipt-sub">Common Table · receipt of good</p>
      <dl class="ct-lines">
        <div><dt>$25</dt><dd>rescues 75 meals' worth of fresh produce</dd></div>
        <div><dt>$60</dt><dd>stocks a week of groceries for a family of four</dd></div>
        <div><dt>$150</dt><dd>keeps a refrigerated truck on the road for a night</dd></div>
        <div><dt>$500</dt><dd>funds a month of paid training for a trainee chef</dd></div>
      </dl>
      <p class="ct-receipt-total"><span>Monthly gifts</span><span>Plan next season's pick-ups</span></p>
      <a class="ct-btn ct-btn-tomato" href="/donate">Give a gift</a>
      <p class="ct-receipt-fine">Secure giving. Tax-deductible receipt by email.</p>
    </div>
  </div>
</section>

<section class="ct-sec" aria-labelledby="ct-shifts-h">
  <div class="ct-wrap">
    <div class="ct-head">
      <p class="ct-eyebrow">Volunteer</p>
      <h2 class="ct-h2" id="ct-shifts-h">Give a shift this week.</h2>
      <p class="ct-intro">No experience needed, and shifts are three hours or less. Come alone, bring a friend or book for your whole team.</p>
    </div>
    <ul class="ct-shifts">
      <li class="ct-shift"><span class="ct-shift-day">Tuesday</span><div><h3>Produce table</h3><p>Stock the market and help neighbors find what they need.</p></div><span class="ct-shift-time">10 am – 1 pm</span><span class="ct-spots">6 spots</span></li>
      <li class="ct-shift"><span class="ct-shift-day">Wednesday</span><div><h3>Warehouse sort</h3><p>Check and pack last night's rescue for the markets.</p></div><span class="ct-shift-time">7 – 10 am</span><span class="ct-spots ct-spots-low">2 spots</span></li>
      <li class="ct-shift"><span class="ct-shift-day">Thursday</span><div><h3>Kitchen prep</h3><p>Chop, portion and pack meals alongside our trainee chefs.</p></div><span class="ct-shift-time">3 – 6 pm</span><span class="ct-spots">8 spots</span></li>
      <li class="ct-shift"><span class="ct-shift-day">Saturday</span><div><h3>Driver's mate</h3><p>Ride along on a pick-up route and help load the truck.</p></div><span class="ct-shift-time">9 pm – 12 am</span><span class="ct-spots ct-spots-low">1 spot</span></li>
    </ul>
    <div class="ct-shifts-foot">
      <p>Groups of 5–20 can book private shifts on weekdays.</p>
      <a class="ct-btn ct-btn-leaf" href="/get-involved">See all shifts</a>
    </div>
  </div>
</section>

<section class="ct-sec ct-money" aria-labelledby="ct-money-h">
  <div class="ct-wrap ct-money-grid">
    <div>
      <p class="ct-eyebrow">Transparency</p>
      <h2 class="ct-h2" id="ct-money-h">Where every dollar goes.</h2>
      <p class="ct-intro">Our books are audited every year and published in full. Donated food is not counted as income, so these numbers show real costs.</p>
      <ul class="ct-trust"><li>Audited financials</li><li>Four-star rated charity</li><li>Board of neighbors</li></ul>
    </div>
    <div>
      <div class="ct-split" role="img" aria-label="88% of spending goes to programs, 7% to fundraising and 5% to administration">
        <span class="ct-split-prog">88% programs</span><span class="ct-split-fund"></span><span class="ct-split-admin"></span>
      </div>
      <ul class="ct-split-key">
        <li><i class="ct-k-prog"></i>Food rescue, markets and kitchen<b>88%</b></li>
        <li><i class="ct-k-fund"></i>Fundraising<b>7%</b></li>
        <li><i class="ct-k-admin"></i>Administration<b>5%</b></li>
      </ul>
    </div>
  </div>
</section>

<section class="ct-partners" aria-label="Food partners">
  <div class="ct-wrap ct-partners-inner">
    <p>Food donated by 140 partners, including</p>
    <ul>
      <li>Harbor Street Bakery</li>
      <li>Greenmount Grocers</li>
      <li>Two Rivers Farm</li>
      <li>Fells Point Fish Co.</li>
      <li>Hampden Co-op</li>
    </ul>
  </div>
</section>
${GIVE_HTML}
</main>
${FOOTER_HTML}
</div>`;

const MONTHS: Array<[string, number, string]> = [["Jan", 58, "212k"], ["Feb", 61, "224k"], ["Mar", 66, "241k"], ["Apr", 64, "236k"], ["May", 70, "257k"], ["Jun", 74, "271k"], ["Jul", 79, "289k"], ["Aug", 83, "304k"], ["Sep", 77, "282k"], ["Oct", 81, "296k"], ["Nov", 92, "337k"], ["Dec", 88, "322k"]];

const IMPACT_HTML = `
<div class="ct-page">
<nav aria-label="Main"></nav>
<header class="ct-phead">
  <div class="ct-awning" aria-hidden="true"></div>
  <div class="ct-wrap ct-phead-grid">
    <div>
      <p class="ct-year">Impact report 2025</p>
      <h1>A record year for rescue, <em>and for neighbors.</em></h1>
      <p class="ct-intro">We rescued more food than ever, opened a third market and doubled our school pantries. Here is where the food went, who it reached and how we spent every dollar.</p>
    </div>
    <figure class="ct-phead-fig"><img src="/media/generated/nonprofit-rescue-crate.webp" alt="A crate of rescued strawberries, oranges, cucumbers, carrots and kale seen from above" width="600" height="600"></figure>
  </div>
</header>

<main>
<section class="ct-sec" aria-labelledby="ct-kpi-h">
  <div class="ct-wrap">
    <div class="ct-head"><p class="ct-eyebrow">The year in numbers</p><h2 class="ct-h2" id="ct-kpi-h">Six numbers we are proud of.</h2></div>
    <dl class="ct-kpis">
      <div class="ct-kpi"><dt>pounds of food rescued<span>up 24% on 2024</span></dt><dd>3.1M</dd></div>
      <div class="ct-kpi"><dt>meals shared<span>at markets, pantries and the kitchen</span></dt><dd>2.6M</dd></div>
      <div class="ct-kpi"><dt>households served<span>from 41 zip codes</span></dt><dd>14,200</dd></div>
      <div class="ct-kpi"><dt>volunteers<span>who gave 62,000 hours</span></dt><dd>1,850</dd></div>
      <div class="ct-kpi"><dt>trainee chefs graduated<span>86% hired within three months</span></dt><dd>48</dd></div>
      <div class="ct-kpi"><dt>tonnes of CO₂e avoided<span>by keeping food out of landfill</span></dt><dd>5,900</dd></div>
    </dl>
  </div>
</section>

<section class="ct-sec ct-programs" aria-labelledby="ct-month-h">
  <div class="ct-wrap">
    <div class="ct-head"><p class="ct-eyebrow">Rescue by month</p><h2 class="ct-h2" id="ct-month-h">Busiest in November, as always.</h2></div>
    <div class="ct-chart-card">
      <p class="ct-chart-title"><b>Pounds rescued each month, 2025</b><span>Total 3.1 million lb</span></p>
      <div class="ct-bars" role="img" aria-label="Pounds rescued by month in 2025, rising from 212,000 in January to a peak of 337,000 in November and 322,000 in December.">
${MONTHS.map(([m, v, label]) => `        <span class="ct-bar ct-v${v}${m === "Nov" ? " is-peak" : ""}"><b>${label}</b></span>`).join("\n")}
      </div>
      <div class="ct-bar-x" aria-hidden="true">${MONTHS.map(([m]) => `<span>${m}</span>`).join("")}</div>
    </div>
    <div class="ct-where">
      <div class="ct-chart-card">
        <p class="ct-chart-title"><b>Where the food went</b></p>
        <ul class="ct-hbars">
          <li><div class="ct-hbar-top"><span>Neighborhood Markets</span><span>58%</span></div><span class="ct-hbar"><i class="ct-w58"></i></span></li>
          <li><div class="ct-hbar-top"><span>Community Kitchen</span><span>22%</span></div><span class="ct-hbar"><i class="ct-w22"></i></span></li>
          <li><div class="ct-hbar-top"><span>School Pantries</span><span>14%</span></div><span class="ct-hbar"><i class="ct-w14"></i></span></li>
          <li><div class="ct-hbar-top"><span>Partner shelters</span><span>6%</span></div><span class="ct-hbar"><i class="ct-w6"></i></span></li>
        </ul>
      </div>
      <div class="ct-chart-card">
        <p class="ct-chart-title"><b>What we rescued</b></p>
        <ul class="ct-hbars">
          <li><div class="ct-hbar-top"><span>Fresh produce</span><span>31%</span></div><span class="ct-hbar"><i class="ct-w31"></i></span></li>
          <li><div class="ct-hbar-top"><span>Dairy and eggs</span><span>24%</span></div><span class="ct-hbar"><i class="ct-w24"></i></span></li>
          <li><div class="ct-hbar-top"><span>Bread and bakery</span><span>19%</span></div><span class="ct-hbar"><i class="ct-w19"></i></span></li>
          <li><div class="ct-hbar-top"><span>Meat and fish</span><span>15%</span></div><span class="ct-hbar"><i class="ct-w15"></i></span></li>
          <li><div class="ct-hbar-top"><span>Pantry staples</span><span>11%</span></div><span class="ct-hbar"><i class="ct-w11"></i></span></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="ct-sec" aria-labelledby="ct-voices-h">
  <div class="ct-wrap">
    <div class="ct-head"><p class="ct-eyebrow">In their words</p><h2 class="ct-h2" id="ct-voices-h">The year, told by the people who lived it.</h2></div>
    <div class="ct-voices">
      <blockquote class="ct-voice"><p>“The school pantry means my kids get fruit every day, not just the week after payday.”</p><footer><b>Keisha M.</b>Parent, Barclay Elementary</footer></blockquote>
      <blockquote class="ct-voice"><p>“We used to throw away forty loaves a night. Now I know exactly whose table they end up on.”</p><footer><b>Dimitri A.</b>Owner, Harbor Street Bakery</footer></blockquote>
      <blockquote class="ct-voice"><p>“Twelve weeks in the kitchen got me my first full-time job in six years.”</p><footer><b>Andre T.</b>Kitchen graduate, now line cook</footer></blockquote>
    </div>
  </div>
</section>

<section class="ct-sec ct-fin" aria-labelledby="ct-fin-h">
  <div class="ct-wrap">
    <div class="ct-head"><p class="ct-eyebrow">Financials</p><h2 class="ct-h2" id="ct-fin-h">$4.2 million raised, spent carefully.</h2></div>
    <div class="ct-fin-grid">
      <div class="ct-fin-card">
        <h3>Where it came from</h3>
        <div class="ct-donut ct-donut-in" role="img" aria-label="Income: 41% individual donors, 28% foundations, 17% businesses and 14% government grants"><span>$4.2M<small>income</small></span></div>
        <ul>
          <li><i class="ct-c-tomato"></i>Individual donors<b>41%</b></li>
          <li><i class="ct-c-leaf"></i>Foundations<b>28%</b></li>
          <li><i class="ct-c-blush"></i>Businesses<b>17%</b></li>
          <li><i class="ct-c-sand"></i>Government grants<b>14%</b></li>
        </ul>
      </div>
      <div class="ct-fin-card">
        <h3>Where it went</h3>
        <div class="ct-donut ct-donut-out" role="img" aria-label="Spending: 88% programs, 7% fundraising and 5% administration"><span>$4.0M<small>spent</small></span></div>
        <ul>
          <li><i class="ct-c-leaf"></i>Programs<b>88%</b></li>
          <li><i class="ct-c-tomato"></i>Fundraising<b>7%</b></li>
          <li><i class="ct-c-sand"></i>Administration<b>5%</b></li>
        </ul>
      </div>
    </div>
    <p class="ct-fin-note">The $200,000 difference went into our reserve for a second refrigerated truck. Donated food, valued at $5.3 million, is not included in these figures.</p>
  </div>
</section>

<section class="ct-sec" aria-labelledby="ct-goals-h">
  <div class="ct-wrap">
    <div class="ct-head"><p class="ct-eyebrow">Next year</p><h2 class="ct-h2" id="ct-goals-h">Our goals for 2026, and how far along we are.</h2></div>
    <ul class="ct-goals">
      <li class="ct-goal"><div class="ct-goal-top"><h3>Open a fourth market in West Baltimore</h3><span>60%</span></div><p>Site signed; fit-out starts in spring.</p><span class="ct-hbar"><i class="ct-w60"></i></span></li>
      <li class="ct-goal"><div class="ct-goal-top"><h3>Pantries in 30 schools</h3><span>18 of 30</span></div><p>Twelve schools on the waiting list.</p><span class="ct-hbar"><i class="ct-w60"></i></span></li>
      <li class="ct-goal"><div class="ct-goal-top"><h3>A second refrigerated truck</h3><span>40%</span></div><p>$84,000 raised of $210,000.</p><span class="ct-hbar"><i class="ct-w40"></i></span></li>
      <li class="ct-goal"><div class="ct-goal-top"><h3>70 trainee chefs graduated</h3><span>35%</span></div><p>Two new cohorts start in January and May.</p><span class="ct-hbar"><i class="ct-w35"></i></span></li>
    </ul>
    <div class="ct-actions"><a class="ct-btn ct-btn-tomato" href="/donate">Help us get there</a></div>
  </div>
</section>
${GIVE_HTML}
</main>
${FOOTER_HTML}
</div>`;

const INVOLVED_HTML = `
<div class="ct-page">
<nav aria-label="Main"></nav>
<header class="ct-phead">
  <div class="ct-awning" aria-hidden="true"></div>
  <div class="ct-wrap ct-phead-grid">
    <div>
      <p class="ct-eyebrow">Get involved</p>
      <h1>Three hours, one shift, <em>a lot of good food.</em></h1>
      <p class="ct-intro">Volunteers do most of the work at Common Table. Pick a role that suits you, bring your team, run a food drive or partner with us as a business.</p>
      <div class="ct-actions"><a class="ct-btn ct-btn-tomato" href="/contact">Sign up to volunteer</a><a class="ct-btn ct-btn-line" href="/donate">Give instead</a></div>
    </div>
    <figure class="ct-phead-fig"><img src="/media/generated/nonprofit-grower.webp" alt="A hand holding two freshly pulled radishes with soil still on the roots" width="800" height="600"></figure>
  </div>
</header>

<main>
<section class="ct-sec" aria-labelledby="ct-roles-h">
  <div class="ct-wrap">
    <div class="ct-head"><p class="ct-eyebrow">Volunteer roles</p><h2 class="ct-h2" id="ct-roles-h">Find the shift that fits.</h2></div>
    <div class="ct-roles">
      <article class="ct-role"><span class="ct-role-icon" aria-hidden="true">1</span><h3>Market host</h3><p>Welcome shoppers, restock tables and help people find what they need.</p><dl><div><dt>When</dt><dd>Tue – Sat, 10 am – 1 pm</dd></div><div><dt>Good for</dt><dd>People persons</dd></div></dl></article>
      <article class="ct-role"><span class="ct-role-icon" aria-hidden="true">2</span><h3>Warehouse sorter</h3><p>Check last night's rescue for quality and pack it for the markets.</p><dl><div><dt>When</dt><dd>Daily, 7 – 10 am</dd></div><div><dt>Good for</dt><dd>Early risers, groups</dd></div></dl></article>
      <article class="ct-role"><span class="ct-role-icon" aria-hidden="true">3</span><h3>Kitchen prep</h3><p>Chop, portion and pack meals alongside our trainee chefs.</p><dl><div><dt>When</dt><dd>Mon – Fri, 3 – 6 pm</dd></div><div><dt>Good for</dt><dd>Home cooks</dd></div></dl></article>
      <article class="ct-role"><span class="ct-role-icon" aria-hidden="true">4</span><h3>Driver's mate</h3><p>Ride along on a night pick-up route and help load the truck.</p><dl><div><dt>When</dt><dd>Evenings, 9 pm – 12 am</dd></div><div><dt>Good for</dt><dd>Night owls, 18+</dd></div></dl></article>
      <article class="ct-role"><span class="ct-role-icon" aria-hidden="true">5</span><h3>School pantry buddy</h3><p>Keep a school pantry stocked and tidy once a week.</p><dl><div><dt>When</dt><dd>School days, 2 – 4 pm</dd></div><div><dt>Good for</dt><dd>Parents, retirees</dd></div></dl></article>
      <article class="ct-role"><span class="ct-role-icon" aria-hidden="true">6</span><h3>Language helper</h3><p>Help Spanish, French and Dari speakers at our markets feel at home.</p><dl><div><dt>When</dt><dd>Flexible</dd></div><div><dt>Good for</dt><dd>Bilingual neighbors</dd></div></dl></article>
    </div>
  </div>
</section>

<section class="ct-sec ct-ways" aria-labelledby="ct-ways-h">
  <div class="ct-wrap">
    <div class="ct-head"><p class="ct-eyebrow">More ways to help</p><h2 class="ct-h2" id="ct-ways-h">For teams, businesses and food donors.</h2></div>
    <div class="ct-ways-grid">
      <article class="ct-way ct-way-leaf">
        <h3>Bring your team</h3>
        <p>Private weekday shifts for groups of 5 to 20. Most teams sort two to three thousand pounds of food in a morning.</p>
        <ul><li>Book at least two weeks ahead</li><li>Closed-toe shoes, we provide aprons and gloves</li><li><a href="/contact">Request a team shift</a></li></ul>
      </article>
      <article class="ct-way ct-way-cream">
        <h3>Donate surplus food</h3>
        <p>Grocers, farms, caterers and bakeries: we collect for free, seven nights a week, and give you a monthly report for your tax records.</p>
        <ul><li>Refrigerated pick-ups from 9 pm</li><li>Covered by the federal Good Samaritan Food Donation Act</li><li><a href="/contact">Become a food partner</a></li></ul>
      </article>
    </div>
  </div>
</section>

<section class="ct-sec" aria-labelledby="ct-accept-h">
  <div class="ct-wrap">
    <div class="ct-head"><p class="ct-eyebrow">Food drives</p><h2 class="ct-h2" id="ct-accept-h">Running a food drive? Here is what helps most.</h2></div>
    <div class="ct-accept">
      <div class="ct-accept-col ct-yes"><h3>Please bring</h3><ul><li>Cooking oil, rice, beans and lentils</li><li>Canned fish and chicken</li><li>Peanut butter and whole-grain cereal</li><li>Diapers, sizes 4 to 6</li><li>Spices and seasonings</li></ul></div>
      <div class="ct-accept-col ct-no"><h3>Please don't bring</h3><ul><li>Anything opened or past its date</li><li>Homemade food</li><li>Alcohol</li><li>Items in glass jars, which break in transit</li><li>Clothing, which we can't store</li></ul></div>
    </div>
  </div>
</section>

<section class="ct-sec ct-ways" id="faq" aria-labelledby="ct-faq-h">
  <div class="ct-wrap ct-faq-grid">
    <div>
      <p class="ct-eyebrow">Questions</p>
      <h2 class="ct-h2" id="ct-faq-h">Before your first shift.</h2>
      <p class="ct-intro">Anything else? Send us a message and a volunteer coordinator will reply within one working day.</p>
    </div>
    <div class="ct-faq">
      <details open><summary>How old do I need to be?</summary><p>Volunteers aged 14 to 17 are welcome with a parent or guardian on the same shift. Driver's mates must be 18 or over.</p></details>
      <details><summary>Do I need any training?</summary><p>No. Every shift starts with a ten-minute briefing, and a shift lead stays with you the whole time.</p></details>
      <details><summary>Can I count hours for school or court service?</summary><p>Yes. Ask your shift lead to sign your form, or download a letter from your volunteer account after each shift.</p></details>
      <details><summary>Is the building accessible?</summary><p>All three markets and the warehouse are step-free, with accessible restrooms. Tell us what you need and we'll plan the shift around it.</p></details>
    </div>
  </div>
</section>
${GIVE_HTML}
</main>
${FOOTER_HTML}
</div>`;

const template: StarterTemplate = {
  id: "original-nonprofit",
  name: "Common Table",
  tagline: "Food-rescue charity site with impact stamps, a gift receipt, volunteer shifts, an annual impact report and donations",
  category: "nonprofit",
  tags: ["nonprofit", "charity", "food bank", "community", "volunteer", "donate", "fundraising", "impact report", "ngo", "foundation"],
  source: "original",
  modules: ["donations", "contact-form"],
  moduleSeeds: {
    donations: {
      pledges: [
        { donor_name: "Harbor Street Bakery", email: null, amount: 500, message: "Proud to send our unsold bread your way every night.", public: true },
        { donor_name: "The Okafor family", email: null, amount: 250, message: "Your market got us through a hard winter. Paying it forward.", public: true },
        { donor_name: "Tom and Rita Alvarez", email: null, amount: 150, message: "In memory of Rita's mother, who fed the whole street.", public: true },
        { donor_name: "Grace L.", email: null, amount: 100, message: "For the Saturday kitchen crew.", public: true },
        { donor_name: "Anonymous", email: null, amount: 60, message: "A week of groceries for someone.", public: true },
        { donor_name: "Sam and Priya", email: null, amount: 25, message: "Monthly gift. Keep the trucks rolling!", public: true },
      ],
    },
  },
  theme: {
    name: "Common Table",
    mode: "light",
    primary: "#b4381f",
    primary2: "#8f2b17",
    accent: "#2f6b3a",
    bg: "#fcf4e8",
    surface: "#fffaf2",
    surface2: "#f5e7d3",
    border: "#e6d3b8",
    text: "#2a1b13",
    textMuted: "#6b5545",
    font: `"Lexend", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    fontDisplay: `"Young Serif", Georgia, "Times New Roman", serif`,
    googleFonts: ["Young Serif", "Lexend:wght@400;500;600;700"],
    radius: "20px",
    radiusSm: "12px",
    dark: {
      name: "Common Table Evening",
      mode: "dark",
      primary: "#e0694f",
      primary2: "#ea8570",
      accent: "#6fb77a",
      bg: "#1b1410",
      surface: "#241b15",
      surface2: "#2e231b",
      border: "#433427",
      text: "#f7ecdf",
      textMuted: "#c4b09f",
      font: `"Lexend", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      fontDisplay: `"Young Serif", Georgia, "Times New Roman", serif`,
      googleFonts: ["Young Serif", "Lexend:wght@400;500;600;700"],
      radius: "20px",
      radiusSm: "12px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: BASE_CSS + NAV_CSS + HOME_CSS + CTA_FOOTER_CSS },
    { title: "Impact report", slug: "impact", isHome: false, html: IMPACT_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + IMPACT_CSS + CTA_FOOTER_CSS },
    { title: "Get involved", slug: "get-involved", isHome: false, html: INVOLVED_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + INVOLVED_CSS + CTA_FOOTER_CSS },
  ],
};

registerTemplate(template);
export default template;
