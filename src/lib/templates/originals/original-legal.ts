/**
 * Calloway Stone LLP — Legal flagship (original-legal)
 *
 * Art direction
 * - Mood: discreet authority. A Chicago trial boutique that reads like a well-set
 *   legal brief: sober, precise, confident about its record.
 * - Type: Libre Caslon Display for headings and numerals (classic, high contrast),
 *   Libre Franklin for text, labels set in letter-spaced small caps.
 * - Palette: ink #15171c on stone paper #f5f3ef, oxblood #7b1e2c as the only colour,
 *   slate for secondary labels. Portraits are rendered in black and white.
 * - Layout grammar: square corners, double hairline rules like a document header,
 *   "§" section marks, roman-numeral practice index, ledger rows instead of cards.
 * - Signature: the results docket on an ink band (large Caslon amounts, matter, court,
 *   year), the six-part practice index, and a consultation card that states fees up
 *   front. Practice pages add "how we charge" and "how long it takes" for each area.
 * - Pages: Home, Practice areas, Attorneys.
 * - Modules: bookings (Request a consultation) and contact-form (Contact).
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";

/* Mid-size serif text uses the sturdier Caslon Text cut, falling back to the theme's display face. */
const SERIF_TEXT = `"Libre Caslon Text", var(--nk-font-display)`;

/* ── Shared CSS ─────────────────────────────────────────────────────── */
const BASE_CSS = `
.cs-page{font-size:1.03rem;line-height:1.65}
.cs-wrap{width:min(1160px,100% - 40px);margin-inline:auto}
.cs-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.cs-kicker{margin:0 0 18px;font-size:.78rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--nk-accent)}
.cs-kicker b{color:var(--nk-primary);font-weight:600}
.cs-sec{padding:clamp(64px,9vw,120px) 0}
.cs-head{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:20px 64px;align-items:end;margin-bottom:clamp(40px,6vw,64px);padding-bottom:28px;border-bottom:1px solid var(--nk-border)}
.cs-head .cs-kicker{grid-column:1/-1;margin:0}
.cs-head h2,.cs-h2{margin:0;font-size:clamp(2.1rem,4.2vw,3.4rem);line-height:1.08;font-weight:400;letter-spacing:-.01em;text-wrap:balance}
.cs-head>p:last-child{margin:0;color:var(--nk-text-muted);font-size:1.05rem}
@media (max-width:860px){.cs-head{grid-template-columns:minmax(0,1fr)}}
.cs-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 28px;font-weight:600;font-size:.88rem;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;border:1px solid transparent;transition:background-color .2s,color .2s,border-color .2s}
.cs-btn:hover{text-decoration:none}
.cs-btn-solid{background:var(--nk-primary);color:var(--nk-surface)}
.cs-btn-solid:hover{background:var(--nk-primary-2);color:var(--nk-surface)}
.cs-btn-line{color:var(--nk-text);border-color:var(--nk-text)}
.cs-btn-line:hover{background:var(--nk-text);color:var(--nk-surface)}
.cs-phone{display:inline-flex;flex-direction:column;line-height:1.25;color:var(--nk-text);text-decoration:none}
.cs-phone small{font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-text-muted)}
.cs-phone strong{font-family:${SERIF_TEXT};font-weight:400;font-size:1.3rem}
.cs-phone:hover{color:var(--nk-primary);text-decoration:none}
.cs-actions{display:flex;flex-wrap:wrap;align-items:center;gap:18px 28px;margin-top:36px}
.cs-page a:focus-visible,.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:2px solid var(--nk-primary);outline-offset:4px}
.cs-arrow{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-primary);text-decoration:none}
.cs-arrow:hover{color:var(--nk-primary-2);text-decoration:underline;text-underline-offset:5px}
`;

const NAV_CSS = `
.nk-nav{padding-block:20px!important;background:var(--nk-bg)!important;border-bottom:0!important;position:relative;z-index:20}
.nk-nav::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;border-top:1px solid var(--nk-text);border-bottom:1px solid var(--nk-text);pointer-events:none}
.nk-nav>.container{max-width:1160px}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-weight:400!important;font-size:1.3rem;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-text)!important}
.nk-nav .nav-link{color:var(--nk-text)!important;font-size:.78rem;font-weight:600!important;letter-spacing:.14em;text-transform:uppercase;padding:10px 14px!important}
.nk-nav .nav-link:hover{color:var(--nk-primary)!important;text-decoration:none}
.nk-nav .nav-link.active{color:var(--nk-primary)!important;text-decoration-line:underline;text-decoration-thickness:1px;text-underline-offset:8px}
.nk-nav .btn{background:var(--nk-primary)!important;color:var(--nk-surface)!important;border-radius:0!important;text-transform:uppercase;letter-spacing:.12em;font-size:.75rem}
.nk-nav .navbar-toggler{color:var(--nk-text)!important;padding:0!important;width:48px;height:44px;border-radius:0!important;border:1px solid var(--nk-text)!important;font-size:0;line-height:0;background-image:linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor);background-size:20px 1.5px;background-position:center 15px,center 21px,center 27px;background-repeat:no-repeat}
.nk-nav .navbar-toggler>*{display:none!important}
.nk-nav .dropdown-menu{border-radius:0;padding:6px 0;background:var(--nk-surface)!important;border:1px solid var(--nk-text)!important;box-shadow:6px 6px 0 color-mix(in srgb,var(--nk-text) 12%,transparent)}
.nk-nav .dropdown-item{padding:10px 18px;color:var(--nk-text)!important;font-size:.92rem}
.nk-nav .dropdown-item:hover,.nk-nav .dropdown-item:focus{background:var(--nk-surface-2)}
@media (min-width:992px){.nk-nav .dropdown{position:relative}.nk-nav .dropdown-menu-end{right:0;left:auto}}
@media (max-width:991.98px){.nk-nav .navbar-collapse{margin-top:18px;border-top:1px solid var(--nk-text)}.nk-nav .nav-link{padding:14px 2px!important;border-bottom:1px solid var(--nk-border)}.nk-nav .dropdown-menu{box-shadow:none}}
`;

const CTA_FOOTER_CSS = `
.cs-cta{padding:clamp(64px,9vw,112px) 0;background:var(--nk-surface);border-top:1px solid var(--nk-border);text-align:center}
.cs-cta .cs-kicker{margin-bottom:22px}
.cs-cta h2{margin:0 auto;max-width:20ch;font-size:clamp(2.2rem,4.8vw,3.8rem);line-height:1.06;font-weight:400;text-wrap:balance}
.cs-cta p{margin:22px auto 0;max-width:56ch;color:var(--nk-text-muted);font-size:1.08rem}
.cs-cta .cs-actions{justify-content:center}
.cs-footer{background:var(--nk-text);color:color-mix(in srgb,var(--nk-surface) 76%,var(--nk-text));padding:64px 0 28px;font-size:.95rem}
.cs-foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:36px;padding-bottom:40px;border-bottom:1px solid color-mix(in srgb,var(--nk-surface) 18%,transparent)}
.cs-foot-name{margin:0 0 14px;font-family:${SERIF_TEXT};font-size:1.3rem;letter-spacing:.1em;text-transform:uppercase;color:var(--nk-surface)}
.cs-footer address{font-style:normal;margin:0;line-height:1.7}
.cs-foot-h{margin:6px 0 14px;font-size:.72rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--nk-surface)}
.cs-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.cs-footer a{color:color-mix(in srgb,var(--nk-surface) 76%,var(--nk-text));text-decoration:none}
.cs-footer a:hover{color:var(--nk-surface);text-decoration:underline}
.cs-footer a:focus-visible{outline-color:var(--nk-surface)}
.cs-legal{margin:28px 0 0;font-size:.82rem;line-height:1.65;max-width:118ch}
.cs-legal p{margin:0 0 10px}
.cs-foot-base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;margin-top:18px;font-size:.82rem}
.cs-foot-base p{margin:0}
@media (max-width:900px){.cs-foot-grid{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.cs-foot-grid{grid-template-columns:minmax(0,1fr)}}
`;

const PAGE_HEAD_CSS = `
.cs-phead{border-bottom:1px solid var(--nk-border);background:var(--nk-bg)}
.cs-phead-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr);gap:40px 72px;align-items:center;padding:clamp(48px,7vw,96px) 0}
.cs-phead h1{margin:0;font-size:clamp(2.6rem,6vw,4.8rem);line-height:1.02;font-weight:400;letter-spacing:-.015em;text-wrap:balance}
.cs-phead-copy>p:last-child{margin:24px 0 0;color:var(--nk-text-muted);font-size:1.12rem;max-width:56ch}
.cs-phead-fig{margin:0;position:relative;isolation:isolate}
.cs-phead-fig img{display:block;width:100%;height:auto;object-fit:cover}
.cs-phead-fig::after{content:"";position:absolute;inset:14px -14px -14px 14px;border:1px solid var(--nk-text);z-index:-1}
@media (max-width:860px){.cs-phead-grid{grid-template-columns:minmax(0,1fr)}.cs-phead-fig{max-width:420px}}
`;

/* ── Home ───────────────────────────────────────────────────────────── */
const HOME_CSS = `
.cs-hero{background:var(--nk-bg)}
.cs-hero-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:48px 80px;align-items:center;padding:clamp(48px,7vw,96px) 0 clamp(40px,5vw,64px)}
.cs-hero h1{margin:0;font-size:clamp(2.7rem,5.8vw,5rem);line-height:1.02;font-weight:400;letter-spacing:-.018em;text-wrap:balance}
.cs-hero h1 em{font-style:italic;color:var(--nk-primary)}
.cs-lede{margin:28px 0 0;max-width:56ch;font-size:1.15rem;color:var(--nk-text-muted)}
.cs-hero-note{margin:22px 0 0;font-size:.9rem;color:var(--nk-text-muted)}
.cs-hero-note b{color:var(--nk-text);font-weight:600}
.cs-hero-fig{margin:0;position:relative;padding:0 0 0 18px}
.cs-hero-fig::before{content:"";position:absolute;left:0;top:18px;bottom:-18px;right:18px;border:1px solid var(--nk-text)}
.cs-hero-fig img{position:relative;display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}
.cs-hero-fig figcaption{position:relative;margin-top:30px;font-size:.78rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-text-muted)}
@media (max-width:900px){.cs-hero-grid{grid-template-columns:minmax(0,1fr)}.cs-hero-fig{max-width:420px}}
.cs-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:0;border-top:4px double var(--nk-text);border-bottom:1px solid var(--nk-text)}
.cs-facts div{display:flex;flex-direction:column-reverse;justify-content:flex-end;gap:6px;padding:26px 22px 24px}
.cs-facts div+div{border-left:1px solid var(--nk-border)}
.cs-facts div:first-child{padding-left:0}
.cs-facts dd{margin:0;font-family:var(--nk-font-display);font-size:clamp(2rem,3.4vw,2.8rem);line-height:1}
.cs-facts dt{font-size:.85rem;color:var(--nk-text-muted);font-weight:500}
@media (max-width:760px){.cs-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.cs-facts div:nth-child(3){border-left:0;padding-left:0}.cs-facts div:nth-child(n+3){border-top:1px solid var(--nk-border)}}
.cs-index{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:64px}
.cs-index li{display:grid;grid-template-columns:64px minmax(0,1fr);gap:4px 12px;padding:28px 0;border-bottom:1px solid var(--nk-border);position:relative}
.cs-index li::before{content:"";position:absolute;left:0;top:-1px;height:2px;width:0;background:var(--nk-primary);transition:width .3s}
.cs-index li:hover::before{width:64px}
.cs-roman{grid-row:span 2;font-family:${SERIF_TEXT};font-size:1.5rem;line-height:1.2;color:var(--nk-primary)}
.cs-index h3{margin:0;font-family:${SERIF_TEXT};font-size:1.35rem;font-weight:400;line-height:1.25}
.cs-index h3 a{color:var(--nk-text);text-decoration:none}
.cs-index h3 a::after{content:"";position:absolute;inset:0}
.cs-index h3 a:hover{color:var(--nk-primary)}
.cs-index p{margin:6px 0 0;color:var(--nk-text-muted)}
@media (max-width:820px){.cs-index{grid-template-columns:minmax(0,1fr)}.cs-index li{grid-template-columns:52px minmax(0,1fr)}}
.cs-docket{background:var(--nk-text);color:color-mix(in srgb,var(--nk-surface) 80%,var(--nk-text))}
.cs-docket .cs-head{border-bottom-color:color-mix(in srgb,var(--nk-surface) 22%,transparent)}
.cs-docket .cs-head h2{color:var(--nk-surface)}
.cs-docket .cs-kicker{color:color-mix(in srgb,var(--nk-surface) 70%,var(--nk-text))}
.cs-docket .cs-kicker b{color:var(--nk-surface)}
.cs-docket .cs-head>p:last-child{color:color-mix(in srgb,var(--nk-surface) 74%,var(--nk-text))}
.cs-docket-list{list-style:none;margin:0;padding:0}
.cs-case{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.6fr) minmax(0,.6fr);gap:10px 48px;align-items:baseline;padding:30px 0;border-bottom:1px solid color-mix(in srgb,var(--nk-surface) 16%,transparent)}
.cs-amt{margin:0;font-family:var(--nk-font-display);font-size:clamp(2.4rem,4.6vw,3.6rem);line-height:1;color:var(--nk-surface)}
.cs-case h3{margin:0;color:var(--nk-surface);font-family:var(--nk-font);font-size:1.1rem;font-weight:600;letter-spacing:.01em}
.cs-case h3+p{margin:8px 0 0;line-height:1.6}
.cs-court{margin:0;font-size:.78rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:color-mix(in srgb,var(--nk-surface) 64%,var(--nk-text));text-align:right}
.cs-docket-note{margin:28px 0 0;font-size:.85rem;color:color-mix(in srgb,var(--nk-surface) 64%,var(--nk-text))}
@media (max-width:900px){.cs-case{grid-template-columns:minmax(0,1fr);gap:10px}.cs-court{text-align:left}}
.cs-team{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px}
.cs-atty{margin:0}
.cs-atty img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}
.cs-atty figcaption{padding-top:18px}
.cs-atty h3{margin:0;font-family:${SERIF_TEXT};font-size:1.3rem;font-weight:400}
.cs-atty-role{display:block;margin-top:4px;font-size:.75rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-primary)}
.cs-atty p{margin:10px 0 0;font-size:.92rem;color:var(--nk-text-muted)}
.cs-team-foot{margin:36px 0 0}
@media (max-width:980px){.cs-team{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:440px){.cs-team{gap:20px}.cs-atty p{display:none}.cs-atty h3{font-size:1.2rem}}
.cs-consult{background:var(--nk-surface);border-block:1px solid var(--nk-border)}
.cs-consult-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px 80px;align-items:start}
.cs-steps{list-style:none;margin:32px 0 0;padding:0;counter-reset:step}
.cs-steps li{position:relative;padding:0 0 28px 64px;counter-increment:step}
.cs-steps li::before{content:counter(step,upper-roman);position:absolute;left:0;top:-4px;width:44px;height:44px;display:grid;place-items:center;border:1px solid var(--nk-text);font-family:${SERIF_TEXT};font-size:1rem}
.cs-steps li::after{content:"";position:absolute;left:22px;top:48px;bottom:8px;width:1px;background:var(--nk-border)}
.cs-steps li:last-child::after{display:none}
.cs-steps h3{margin:0;font-family:${SERIF_TEXT};font-size:1.25rem;font-weight:400}
.cs-steps p{margin:6px 0 0;color:var(--nk-text-muted)}
.cs-card{padding:clamp(26px,4vw,40px);background:var(--nk-bg);border:1px solid var(--nk-text);box-shadow:10px 10px 0 color-mix(in srgb,var(--nk-text) 10%,transparent)}
.cs-card-title{margin:0 0 20px;font-family:${SERIF_TEXT};font-size:1.5rem;line-height:1.25}
.cs-fees{margin:0;display:grid;gap:0}
.cs-fees div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 16px;padding:16px 0;border-top:1px solid var(--nk-border)}
.cs-fees dt{font-weight:600}
.cs-fees dd{margin:0;font-family:${SERIF_TEXT};font-size:1.2rem;text-align:right}
.cs-fees dd+dd{grid-column:1/-1;font-family:var(--nk-font);font-size:.9rem;color:var(--nk-text-muted);text-align:left}
.cs-bring{margin:22px 0 0;padding:18px 20px;background:var(--nk-surface-2);font-size:.92rem}
.cs-bring strong{display:block;margin-bottom:6px;font-size:.75rem;letter-spacing:.16em;text-transform:uppercase}
.cs-card .cs-btn{width:100%;margin-top:24px}
@media (max-width:900px){.cs-consult-grid{grid-template-columns:minmax(0,1fr)}}
.cs-words{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:4px double var(--nk-text)}
.cs-word{margin:0;padding:32px 32px 8px 0}
.cs-word+.cs-word{padding-left:32px;border-left:1px solid var(--nk-border)}
.cs-word p{margin:0;font-family:${SERIF_TEXT};font-size:1.2rem;line-height:1.55}
.cs-word footer{margin-top:18px;font-size:.78rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text-muted)}
@media (max-width:900px){.cs-words{grid-template-columns:minmax(0,1fr)}.cs-word,.cs-word+.cs-word{padding:28px 0;border-left:0}.cs-word+.cs-word{border-top:1px solid var(--nk-border)}}
.cs-notes-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:48px 72px;align-items:start}
.cs-notes-fig{margin:0}
.cs-notes-fig img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}
.cs-notes{list-style:none;margin:0;padding:0;border-top:1px solid var(--nk-text)}
.cs-notes li{padding:22px 0;border-bottom:1px solid var(--nk-border)}
.cs-notes-meta{margin:0;font-size:.75rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-accent)}
.cs-notes h3{margin:8px 0 0;font-family:${SERIF_TEXT};font-size:1.25rem;font-weight:400;line-height:1.35}
.cs-notes li p:last-child{margin:6px 0 0;color:var(--nk-text-muted);font-size:.95rem}
@media (max-width:900px){.cs-notes-grid{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Practice areas ─────────────────────────────────────────────────── */
const PRACTICE_CSS = `
.cs-layout{display:grid;grid-template-columns:240px minmax(0,1fr);gap:64px;padding:clamp(48px,7vw,88px) 0}
.cs-toc{position:sticky;top:24px;align-self:start}
.cs-toc p{margin:0 0 14px;font-size:.72rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--nk-text-muted)}
.cs-toc ol{list-style:none;margin:0;padding:0;border-top:1px solid var(--nk-text)}
.cs-toc li{border-bottom:1px solid var(--nk-border)}
.cs-toc a{display:flex;gap:12px;padding:12px 0;color:var(--nk-text);text-decoration:none;font-size:.95rem}
.cs-toc a span{width:26px;font-family:${SERIF_TEXT};color:var(--nk-primary)}
.cs-toc a:hover{color:var(--nk-primary)}
.cs-area{padding:0 0 64px;margin-bottom:64px;border-bottom:1px solid var(--nk-border);scroll-margin-top:24px}
.cs-area:last-child{margin-bottom:0;border-bottom:0;padding-bottom:0}
.cs-area-head{display:flex;align-items:baseline;gap:18px}
.cs-area-head span{font-family:var(--nk-font-display);font-size:2.4rem;color:var(--nk-primary);line-height:1}
.cs-area h2{margin:0;font-size:clamp(2rem,3.6vw,2.8rem);font-weight:400;line-height:1.1}
.cs-area-lede{margin:18px 0 0;font-size:1.1rem;color:var(--nk-text-muted);max-width:62ch}
.cs-area-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px 48px;margin-top:32px}
.cs-area h3{margin:0 0 12px;font-family:var(--nk-font);font-size:.75rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--nk-text)}
.cs-matters{list-style:none;margin:0;padding:0;border-top:1px solid var(--nk-text)}
.cs-matters li{padding:11px 0 11px 22px;border-bottom:1px solid var(--nk-border);position:relative}
.cs-matters li::before{content:"§";position:absolute;left:0;top:11px;color:var(--nk-primary);font-family:${SERIF_TEXT}}
.cs-terms{margin:0;border-top:1px solid var(--nk-text)}
.cs-terms div{display:grid;grid-template-columns:120px minmax(0,1fr);gap:12px;padding:11px 0;border-bottom:1px solid var(--nk-border)}
.cs-terms dt{font-weight:600}
.cs-terms dd{margin:0;color:var(--nk-text-muted)}
.cs-area-result{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 24px;align-items:baseline;margin:28px 0 0;padding:20px 24px;background:var(--nk-surface);border-left:3px solid var(--nk-primary)}
.cs-area-result strong{font-family:var(--nk-font-display);font-weight:400;font-size:2rem;line-height:1}
.cs-area-result span{color:var(--nk-text-muted)}
@media (max-width:980px){.cs-layout{grid-template-columns:minmax(0,1fr);gap:40px}.cs-toc{position:static}.cs-toc ol{display:grid;grid-template-columns:1fr 1fr;column-gap:24px}}
@media (max-width:640px){.cs-area-grid{grid-template-columns:minmax(0,1fr)}.cs-terms div{grid-template-columns:minmax(0,1fr);gap:2px}.cs-area-result{grid-template-columns:minmax(0,1fr)}}
@media (max-width:420px){.cs-toc ol{grid-template-columns:minmax(0,1fr)}}
.cs-help{background:var(--nk-text);color:color-mix(in srgb,var(--nk-surface) 78%,var(--nk-text))}
.cs-help-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:32px 72px;align-items:center}
.cs-help h2{margin:0;color:var(--nk-surface);font-size:clamp(2rem,3.8vw,3rem);font-weight:400;line-height:1.1}
.cs-help p{margin:16px 0 0;max-width:56ch}
.cs-help .cs-btn-line{color:var(--nk-surface);border-color:var(--nk-surface)}
.cs-help .cs-btn-line:hover{background:var(--nk-surface);color:var(--nk-text)}
.cs-help a:focus-visible{outline-color:var(--nk-surface)}
.cs-help .cs-actions{margin-top:0;justify-content:flex-end}
@media (max-width:860px){.cs-help-grid{grid-template-columns:minmax(0,1fr)}.cs-help .cs-actions{justify-content:flex-start}}
`;

/* ── Attorneys ──────────────────────────────────────────────────────── */
const ATTORNEYS_CSS = `
.cs-banner{margin:0;position:relative}
.cs-banner img{display:block;width:100%;height:clamp(220px,32vw,420px);object-fit:cover;filter:grayscale(.35) contrast(1.05)}
.cs-banner figcaption{position:absolute;right:20px;bottom:16px;padding:6px 12px;background:var(--nk-bg);font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-text)}
.cs-intro{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:32px 72px;align-items:end;padding:clamp(48px,7vw,88px) 0 clamp(28px,4vw,40px);border-bottom:4px double var(--nk-text)}
.cs-intro h1{margin:0;font-size:clamp(2.6rem,6vw,4.6rem);font-weight:400;line-height:1.02}
.cs-intro>p{margin:0;color:var(--nk-text-muted);font-size:1.08rem}
@media (max-width:860px){.cs-intro{grid-template-columns:minmax(0,1fr)}}
.cs-bio{display:grid;grid-template-columns:280px minmax(0,1fr) minmax(0,.75fr);gap:32px 56px;padding:56px 0;border-bottom:1px solid var(--nk-border)}
.cs-bio img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}
.cs-bio h2{margin:0;font-size:clamp(2rem,3.4vw,2.6rem);font-weight:400;line-height:1.1}
.cs-bio-role{display:block;margin:8px 0 18px;font-size:.75rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--nk-primary)}
.cs-bio-main>p{margin:0 0 14px;color:var(--nk-text-muted)}
.cs-bio-main h3{margin:24px 0 10px;font-family:var(--nk-font);font-size:.75rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase}
.cs-bio-main ul{margin:0;padding-left:20px;color:var(--nk-text-muted)}
.cs-bio-main li+li{margin-top:6px}
.cs-cred{margin:0;border-top:1px solid var(--nk-text);font-size:.93rem}
.cs-cred div{padding:12px 0;border-bottom:1px solid var(--nk-border)}
.cs-cred dt{font-size:.72rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--nk-text-muted)}
.cs-cred dd{margin:4px 0 0}
.cs-cred a{color:var(--nk-primary)}
@media (max-width:1000px){.cs-bio{grid-template-columns:220px minmax(0,1fr)}.cs-bio .cs-cred{grid-column:2}}
@media (max-width:640px){.cs-bio{grid-template-columns:minmax(0,1fr)}.cs-bio img{max-width:300px}.cs-bio .cs-cred{grid-column:auto}}
.cs-staff{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:1px solid var(--nk-text)}
.cs-staff li{padding:22px 24px 22px 0;border-bottom:1px solid var(--nk-border)}
.cs-staff li+li{padding-left:24px;border-left:1px solid var(--nk-border)}
.cs-staff strong{display:block;font-family:${SERIF_TEXT};font-weight:400;font-size:1.2rem}
.cs-staff span{color:var(--nk-text-muted);font-size:.92rem}
@media (max-width:800px){.cs-staff{grid-template-columns:minmax(0,1fr)}.cs-staff li,.cs-staff li+li{padding:18px 0;border-left:0}}
`;

/* ── Shared HTML ────────────────────────────────────────────────────── */
const CTA_HTML = `
<section class="cs-cta" aria-labelledby="cs-cta-h">
  <div class="cs-wrap">
    <p class="cs-kicker"><b>§</b> Next step</p>
    <h2 id="cs-cta-h">Tell us what happened. We'll tell you where you stand.</h2>
    <p>Most people know within one conversation whether they have a case. Book a consultation online, or call and speak to an attorney today.</p>
    <div class="cs-actions">
      <a class="cs-btn cs-btn-solid" href="/book">Request a consultation</a>
      <a class="cs-btn cs-btn-line" href="/contact">Send a message</a>
    </div>
  </div>
</section>`;

const FOOTER_HTML = `
<footer class="cs-footer">
  <div class="cs-wrap">
    <div class="cs-foot-grid">
      <div>
        <p class="cs-foot-name">Calloway Stone</p>
        <address>180 North LaSalle Street, Suite 2400<br>Chicago, Illinois 60601</address>
      </div>
      <div>
        <p class="cs-foot-h">The firm</p>
        <ul>
          <li><a href="/practice-areas">Practice areas</a></li>
          <li><a href="/attorneys">Attorneys</a></li>
          <li><a href="/book">Request a consultation</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
      <div>
        <p class="cs-foot-h">Call or write</p>
        <ul>
          <li><a href="tel:+13125550148">(312) 555-0148</a></li>
          <li><a href="mailto:intake@callowaystone.example">intake@callowaystone.example</a></li>
          <li>Mon–Fri, 8:00 am–6:00 pm</li>
        </ul>
      </div>
      <div>
        <p class="cs-foot-h">Languages</p>
        <ul>
          <li>English, Spanish</li>
          <li>Hindi, Polish</li>
        </ul>
      </div>
    </div>
    <div class="cs-legal">
      <p>Attorney advertising. The information on this website is for general information only and is not legal advice. Contacting Calloway Stone LLP does not create an attorney–client relationship; please do not send confidential information until we have confirmed that we can represent you.</p>
      <p>Prior results do not guarantee a similar outcome. Attorneys are licensed in Illinois unless otherwise stated.</p>
    </div>
    <div class="cs-foot-base">
      <p>© 2026 Calloway Stone LLP</p>
      <p>Trial lawyers since 1985</p>
    </div>
  </div>
</footer>`;

/* ── Pages ──────────────────────────────────────────────────────────── */
const HOME_HTML = `
<div class="cs-page">
<nav aria-label="Main"></nav>
<header class="cs-hero">
  <div class="cs-wrap">
    <div class="cs-hero-grid">
      <div>
        <p class="cs-kicker"><b>§</b> Trial lawyers · Chicago · Since 1985</p>
        <h1>Chicago trial lawyers for employees, owners <em>and families.</em></h1>
        <p class="cs-lede">Calloway Stone takes on the disputes that decide livelihoods: wrongful firings, broken partnerships, contested estates. We prepare every case as if it will go to trial, which is exactly why most of them don't have to.</p>
        <div class="cs-actions">
          <a class="cs-btn cs-btn-solid" href="/book">Request a consultation</a>
          <a class="cs-phone" href="tel:+13125550148"><small>Or call an attorney</small><strong>(312) 555-0148</strong></a>
        </div>
        <p class="cs-hero-note"><b>Free 30-minute case review</b> for employment and personal injury matters.</p>
      </div>
      <figure class="cs-hero-fig">
        <img src="/media/generated/legal-courthouse.webp" alt="A neoclassical stone building with four fluted columns, photographed in black and white" width="640" height="800">
        <figcaption>180 N. LaSalle Street · Chicago</figcaption>
      </figure>
    </div>
    <dl class="cs-facts">
      <div><dt>recovered for clients since 2000</dt><dd>$212M</dd></div>
      <div><dt>jury trials tried to verdict</dt><dd>63</dd></div>
      <div><dt>average rating from 380 client reviews</dt><dd>4.9</dd></div>
      <div><dt>to hear back after you contact us</dt><dd>1 day</dd></div>
    </dl>
  </div>
</header>

<main>
<section class="cs-sec" aria-labelledby="cs-practice-h">
  <div class="cs-wrap">
    <div class="cs-head">
      <p class="cs-kicker"><b>§ 1</b> Practice</p>
      <h2 id="cs-practice-h">Six areas of law, each led by a partner who has tried those cases.</h2>
      <p>We keep our practice narrow on purpose. Depth wins cases; breadth mostly wins invoices.</p>
    </div>
    <ol class="cs-index">
      <li><span class="cs-roman" aria-hidden="true">I</span><h3><a href="/practice-areas#employment">Employment law</a></h3><p>Wrongful termination, unpaid wages, discrimination and retaliation.</p></li>
      <li><span class="cs-roman" aria-hidden="true">II</span><h3><a href="/practice-areas#business">Business disputes</a></h3><p>Breach of contract, partner disputes and non-compete agreements.</p></li>
      <li><span class="cs-roman" aria-hidden="true">III</span><h3><a href="/practice-areas#real-estate">Real estate</a></h3><p>Commercial leases, construction defects and landlord–tenant litigation.</p></li>
      <li><span class="cs-roman" aria-hidden="true">IV</span><h3><a href="/practice-areas#estates">Wills, trusts &amp; estates</a></h3><p>Estate plans, probate and contested inheritances.</p></li>
      <li><span class="cs-roman" aria-hidden="true">V</span><h3><a href="/practice-areas#family">Family law</a></h3><p>Divorce, custody and relocation, with mediation where it can work.</p></li>
      <li><span class="cs-roman" aria-hidden="true">VI</span><h3><a href="/practice-areas#injury">Personal injury</a></h3><p>Vehicle collisions, unsafe premises and workplace injuries.</p></li>
    </ol>
  </div>
</section>

<section class="cs-sec cs-docket" aria-labelledby="cs-docket-h">
  <div class="cs-wrap">
    <div class="cs-head">
      <p class="cs-kicker"><b>§ 2</b> Results</p>
      <h2 id="cs-docket-h">A record the other side reads before making an offer.</h2>
      <p>A selection of matters from the last three years, shared with our clients' permission.</p>
    </div>
    <ol class="cs-docket-list">
      <li class="cs-case"><p class="cs-amt">$4.2M</p><div><h3>Jury verdict · Retaliatory discharge</h3><p>A plant supervisor fired eleven days after reporting safety violations to a state inspector.</p></div><p class="cs-court">Cook County · 2025</p></li>
      <li class="cs-case"><p class="cs-amt">$2.7M</p><div><h3>Settlement · Truck collision</h3><p>A delivery driver left with a spinal injury after a fleet vehicle ran a red light.</p></div><p class="cs-court">Will County · 2024</p></li>
      <li class="cs-case"><p class="cs-amt">$1.35M</p><div><h3>Settlement · Unpaid overtime</h3><p>Back pay for 212 warehouse workers whose pre-shift security screening went unpaid.</p></div><p class="cs-court">N.D. Illinois · 2024</p></li>
      <li class="cs-case"><p class="cs-amt">Dismissed</p><div><h3>Non-compete · Defence verdict</h3><p>A suit against a departing sales director, dismissed with our client's legal fees awarded.</p></div><p class="cs-court">DuPage County · 2025</p></li>
    </ol>
    <p class="cs-docket-note">Prior results do not guarantee a similar outcome. Every case depends on its own facts.</p>
  </div>
</section>

<section class="cs-sec" aria-labelledby="cs-team-h">
  <div class="cs-wrap">
    <div class="cs-head">
      <p class="cs-kicker"><b>§ 3</b> Attorneys</p>
      <h2 id="cs-team-h">You will work with a partner, not a call centre.</h2>
      <p>Every client has a named partner and a direct phone number from the first day of the case to the last.</p>
    </div>
    <div class="cs-team">
      <figure class="cs-atty"><img src="/media/generated/legal-attorney-helen.webp" alt="Portrait of Helen Calloway" width="480" height="600" loading="lazy"><figcaption><h3>Helen Calloway</h3><span class="cs-atty-role">Founding partner · Employment</span><p>Thirty-one jury trials. Former chair of the county bar's labour section.</p></figcaption></figure>
      <figure class="cs-atty"><img src="/media/generated/legal-attorney-daniel.webp" alt="Portrait of Daniel Stone" width="480" height="600" loading="lazy"><figcaption><h3>Daniel Stone</h3><span class="cs-atty-role">Partner · Business disputes</span><p>Represents founders and family businesses in partner and contract disputes.</p></figcaption></figure>
      <figure class="cs-atty"><img src="/media/generated/legal-attorney-rohan.webp" alt="Portrait of Rohan Mehta" width="480" height="600" loading="lazy"><figcaption><h3>Rohan Mehta</h3><span class="cs-atty-role">Partner · Real estate &amp; injury</span><p>Former insurance defence counsel who now sits on the other side of the table.</p></figcaption></figure>
      <figure class="cs-atty"><img src="/media/generated/legal-attorney-claire.webp" alt="Portrait of Claire Novak" width="480" height="600" loading="lazy"><figcaption><h3>Claire Novak</h3><span class="cs-atty-role">Partner · Estates &amp; family</span><p>Certified mediator. Resolves most family matters without a courtroom.</p></figcaption></figure>
    </div>
    <p class="cs-team-foot"><a class="cs-arrow" href="/attorneys">Read full biographies <span aria-hidden="true">→</span></a></p>
  </div>
</section>

<section class="cs-sec cs-consult" aria-labelledby="cs-consult-h">
  <div class="cs-wrap cs-consult-grid">
    <div>
      <p class="cs-kicker"><b>§ 4</b> Your first meeting</p>
      <h2 class="cs-h2" id="cs-consult-h">A straight answer in the first hour.</h2>
      <ol class="cs-steps">
        <li><h3>Tell us what happened</h3><p>Book online or call. An intake attorney reads your summary the same business day.</p></li>
        <li><h3>Meet the partner</h3><p>In person on LaSalle Street or by video. We explain your options, your odds and what each would cost.</p></li>
        <li><h3>Decide with the facts</h3><p>You leave with a written summary and a fee agreement to consider. There is never pressure to sign on the day.</p></li>
      </ol>
    </div>
    <div class="cs-card">
      <p class="cs-card-title">What a consultation costs</p>
      <dl class="cs-fees">
        <div><dt>Case review</dt><dd>Free</dd><dd>30 minutes · employment and personal injury matters</dd></div>
        <div><dt>Consultation</dt><dd>$250</dd><dd>60 minutes · business, real estate, estates and family. Credited to your first invoice.</dd></div>
        <div><dt>If we take your case</dt><dd>Agreed first</dd><dd>Contingency, hourly or flat fee, set out in writing before any work begins.</dd></div>
      </dl>
      <p class="cs-bring"><strong>Bring if you can</strong>Letters or emails you received, any contract or agreement, pay records, and a short timeline in your own words.</p>
      <a class="cs-btn cs-btn-solid" href="/book">Request a consultation</a>
    </div>
  </div>
</section>

<section class="cs-sec" aria-labelledby="cs-words-h">
  <div class="cs-wrap">
    <h2 class="cs-sr" id="cs-words-h">Client reviews</h2>
    <div class="cs-words">
      <blockquote class="cs-word"><p>“Helen told me in our first meeting what my case was worth and how long it would take. She was right on both counts.”</p><footer>Former plant supervisor · Employment</footer></blockquote>
      <blockquote class="cs-word"><p>“Daniel untangled a partnership my brother and I had spent six years building, and we are still on speaking terms.”</p><footer>Restaurant owner · Business dispute</footer></blockquote>
      <blockquote class="cs-word"><p>“Claire kept our custody arrangement out of court entirely. Our kids never had to testify.”</p><footer>Parent · Family law</footer></blockquote>
    </div>
  </div>
</section>

<section class="cs-sec cs-consult" aria-labelledby="cs-notes-h">
  <div class="cs-wrap">
    <div class="cs-head">
      <p class="cs-kicker"><b>§ 5</b> Notes from the firm</p>
      <h2 id="cs-notes-h">Plain-English guides to the questions we hear most.</h2>
    </div>
    <div class="cs-notes-grid">
      <figure class="cs-notes-fig"><img src="/media/generated/legal-law-books.webp" alt="Rows of old leather-bound law books on a wooden shelf" width="960" height="640" loading="lazy"></figure>
      <ul class="cs-notes">
        <li><p class="cs-notes-meta">Employment · 6 min read</p><h3>Fired after you complained? The first 48 hours matter.</h3><p>What to write down, what not to sign, and which deadlines start running straight away.</p></li>
        <li><p class="cs-notes-meta">Business · 5 min read</p><h3>Is your non-compete enforceable? Four questions courts ask.</h3><p>Scope, time, geography and consideration, explained with recent examples.</p></li>
        <li><p class="cs-notes-meta">Estates · 7 min read</p><h3>Probate without a will: what families should expect.</h3><p>Who inherits, who manages the estate, and how long it usually takes.</p></li>
      </ul>
    </div>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const AREAS = [
  {
    id: "employment", n: "I", title: "Employment law",
    lede: "We represent employees and executives who have been fired, underpaid or treated unfairly at work. Most cases resolve through negotiation; the ones that don't, we try.",
    matters: ["Wrongful and retaliatory termination", "Unpaid wages and overtime, including class actions", "Discrimination and harassment", "Severance and executive exit negotiations", "Whistleblower protection"],
    terms: [["Fees", "Contingency, usually 33⅓% of the recovery. No fee unless we win."], ["First step", "Free 30-minute case review"], ["Typical length", "Settlement in 6–12 months; trial in 18–30 months"]],
    result: ["$4.2M", "Jury verdict for a supervisor fired after reporting safety violations, 2025"],
  },
  {
    id: "business", n: "II", title: "Business disputes",
    lede: "For founders, partners and family businesses in conflicts that threaten the company itself. We aim to protect the business first and win the argument second.",
    matters: ["Breach of contract", "Partner and shareholder disputes", "Non-compete and trade secret claims", "Buy-outs and business divorces", "Vendor and supplier litigation"],
    terms: [["Fees", "Hourly ($325–$575) or blended flat-fee phases"], ["First step", "$250 consultation, credited to your first invoice"], ["Typical length", "Mediation in 3–6 months; trial in 12–24 months"]],
    result: ["Dismissed", "Non-compete suit against a sales director, with fees awarded to our client, 2025"],
  },
  {
    id: "real-estate", n: "III", title: "Real estate",
    lede: "Commercial tenants, landlords and owners in disputes over leases, construction and property rights, from a single storefront to a mixed-use block.",
    matters: ["Commercial lease disputes", "Construction defect claims", "Landlord–tenant litigation", "Boundary and easement disputes", "Lease review before you sign"],
    terms: [["Fees", "Hourly, or flat fees from $1,200 for lease reviews"], ["First step", "$250 consultation, credited to your first invoice"], ["Typical length", "Lease reviews in 5 days; litigation in 9–18 months"]],
    result: ["$860K", "Build-out costs and rent returned to a restaurant tenant, 2023"],
  },
  {
    id: "estates", n: "IV", title: "Wills, trusts & estates",
    lede: "We draft estate plans that keep families out of court, and represent families when a will or trust is contested.",
    matters: ["Wills, trusts and powers of attorney", "Probate administration", "Will and trust contests", "Guardianship", "Trustee and executor disputes"],
    terms: [["Fees", "Flat fees for estate plans from $1,800; hourly for disputes"], ["First step", "$250 consultation, credited to your first invoice"], ["Typical length", "Estate plan in 3 weeks; probate in 9–14 months"]],
    result: ["$1.1M", "Estate assets recovered from a trustee who self-dealt, 2024"],
  },
  {
    id: "family", n: "V", title: "Family law",
    lede: "Divorce and custody handled with discretion and a clear plan. Where mediation can work, we use it; where it can't, we are ready for court.",
    matters: ["Divorce and property division", "Custody and parenting plans", "Relocation cases", "Child and spousal support", "Mediation and collaborative divorce"],
    terms: [["Fees", "Hourly ($300–$450), with a written budget at the start"], ["First step", "$250 consultation, credited to your first invoice"], ["Typical length", "Mediated divorce in 4–8 months; contested in 12–18 months"]],
    result: ["Approved", "Relocation with shared custody agreed in mediation, without a hearing, 2025"],
  },
  {
    id: "injury", n: "VI", title: "Personal injury",
    lede: "For people hurt by someone else's carelessness. We deal with the insurers so you can concentrate on recovering.",
    matters: ["Car and truck collisions", "Unsafe premises and falls", "Workplace injuries involving third parties", "Cyclist and pedestrian injuries", "Wrongful death"],
    terms: [["Fees", "Contingency, usually 33⅓%. No fee unless we recover."], ["First step", "Free 30-minute case review"], ["Typical length", "Settlement in 9–18 months, depending on treatment"]],
    result: ["$2.7M", "Settlement for a driver with a spinal injury after a fleet truck ran a red light, 2024"],
  },
];

const PRACTICE_HTML = `
<div class="cs-page">
<nav aria-label="Main"></nav>
<header class="cs-phead">
  <div class="cs-wrap cs-phead-grid">
    <div class="cs-phead-copy">
      <p class="cs-kicker"><b>§</b> Practice areas</p>
      <h1>What we do, what it costs and how long it takes.</h1>
      <p>Six practices, each led by a partner with trial experience in that field. Below you will find the matters we take on, how we charge and a realistic timeline for each.</p>
    </div>
    <figure class="cs-phead-fig"><img src="/media/generated/legal-columns.webp" alt="Weathered stone columns of a classical building, seen from below" width="600" height="711"></figure>
  </div>
</header>

<main class="cs-wrap cs-layout">
  <aside class="cs-toc" aria-label="Practice areas on this page">
    <p>On this page</p>
    <ol>
${AREAS.map((a) => `      <li><a href="#${a.id}"><span>${a.n}</span>${a.title.replace("&", "&amp;")}</a></li>`).join("\n")}
    </ol>
  </aside>
  <div>
${AREAS.map((a) => `    <section class="cs-area" id="${a.id}" aria-labelledby="cs-${a.id}-h">
      <div class="cs-area-head"><span aria-hidden="true">${a.n}</span><h2 id="cs-${a.id}-h">${a.title.replace("&", "&amp;")}</h2></div>
      <p class="cs-area-lede">${a.lede}</p>
      <div class="cs-area-grid">
        <div><h3>Matters we handle</h3><ul class="cs-matters">${a.matters.map((m) => `<li>${m}</li>`).join("")}</ul></div>
        <div><h3>Fees and timing</h3><dl class="cs-terms">${a.terms.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl></div>
      </div>
      <p class="cs-area-result"><strong>${a.result[0]}</strong><span>${a.result[1]}</span></p>
    </section>`).join("\n")}
  </div>
</main>

<section class="cs-sec cs-help" aria-labelledby="cs-help-h">
  <div class="cs-wrap cs-help-grid">
    <div>
      <h2 id="cs-help-h">Not sure which of these fits?</h2>
      <p>Many problems cross two practices, such as a business dispute with an employment claim inside it. Describe it in your own words and we will route it to the right partner.</p>
    </div>
    <div class="cs-actions">
      <a class="cs-btn cs-btn-solid" href="/book">Request a consultation</a>
      <a class="cs-btn cs-btn-line" href="/contact">Send a message</a>
    </div>
  </div>
</section>
${FOOTER_HTML}
</div>`;

const BIOS = [
  {
    img: "/media/generated/legal-attorney-helen.webp", name: "Helen Calloway", role: "Founding partner · Employment law",
    body: ["Helen founded the firm in 1985 after six years as a public defender. She has tried thirty-one employment cases to verdict and is known for preparing every case as if it will go to a jury.", "She chaired the county bar's labour and employment section from 2016 to 2019 and teaches trial advocacy to new lawyers each summer."],
    matters: ["$4.2M verdict for a supervisor fired after reporting safety violations", "$1.35M overtime settlement for 212 warehouse workers", "Executive severance negotiations for hospital leadership"],
    cred: [["Education", "J.D., Loyola University Chicago · B.A., University of Illinois"], ["Admitted", "Illinois, 1979 · U.S. District Court, N.D. Illinois"], ["Languages", "English"], ["Email", "hcalloway@callowaystone.example"]],
  },
  {
    img: "/media/generated/legal-attorney-daniel.webp", name: "Daniel Stone", role: "Partner · Business disputes",
    body: ["Daniel represents founders, partners and family-owned companies when a business relationship breaks down. He spent eight years at a large corporate firm before joining Calloway Stone in 2011.", "His aim in every dispute is to keep the business running while it is resolved."],
    matters: ["Defence verdict and fee award in a non-compete suit", "Negotiated buy-out of a restaurant group partner", "Supply-contract recovery for a regional manufacturer"],
    cred: [["Education", "J.D., Northwestern University · B.S., Purdue University"], ["Admitted", "Illinois, 2003 · Indiana, 2004"], ["Languages", "English, Spanish"], ["Email", "dstone@callowaystone.example"]],
  },
  {
    img: "/media/generated/legal-attorney-rohan.webp", name: "Rohan Mehta", role: "Partner · Real estate & personal injury",
    body: ["Rohan spent a decade defending insurance companies before switching sides in 2016. He now uses that experience to value claims accurately and to know when an insurer is bluffing.", "He also advises commercial tenants on leases before they sign, which is the cheapest way to win a lease dispute."],
    matters: ["$2.7M settlement for a driver injured by a fleet truck", "$860K recovered for a restaurant tenant over build-out costs", "Construction defect claim for a 40-unit condominium association"],
    cred: [["Education", "J.D., University of Chicago · B.A., University of Michigan"], ["Admitted", "Illinois, 2006 · U.S. District Court, N.D. Illinois"], ["Languages", "English, Hindi"], ["Email", "rmehta@callowaystone.example"]],
  },
  {
    img: "/media/generated/legal-attorney-claire.webp", name: "Claire Novak", role: "Partner · Estates & family law",
    body: ["Claire is a certified family mediator who resolves most of her matters without a contested hearing. When a case does need a judge, she is a calm and exact advocate.", "She also drafts estate plans designed to keep families out of the probate disputes she litigates."],
    matters: ["$1.1M recovered from a self-dealing trustee", "Mediated relocation and shared custody agreement", "Estate plans for more than 400 Chicago families"],
    cred: [["Education", "J.D., DePaul University · B.A., Loyola University Chicago"], ["Admitted", "Illinois, 2012"], ["Languages", "English, Polish"], ["Email", "cnovak@callowaystone.example"]],
  },
];

const ATTORNEYS_HTML = `
<div class="cs-page">
<nav aria-label="Main"></nav>
<header>
  <figure class="cs-banner"><img src="/media/generated/legal-library.webp" alt="A grand wood-panelled law library with a painted ceiling and floor-to-ceiling bookshelves" width="960" height="640"><figcaption>Est. 1985</figcaption></figure>
  <div class="cs-wrap cs-intro">
    <div>
      <p class="cs-kicker"><b>§</b> Attorneys</p>
      <h1>Four partners. One standard.</h1>
    </div>
    <p>Every partner at Calloway Stone has tried cases to verdict in their own field. You will meet yours at the first consultation, and you will have their direct line until the case is closed.</p>
  </div>
</header>

<main class="cs-wrap">
${BIOS.map((b) => `  <article class="cs-bio" aria-labelledby="cs-bio-${b.img}">
    <img src="${b.img}" alt="Portrait of ${b.name}" width="480" height="600" loading="lazy">
    <div class="cs-bio-main">
      <h2 id="cs-bio-${b.img}">${b.name}</h2>
      <span class="cs-bio-role">${b.role.replace("&", "&amp;")}</span>
${b.body.map((p) => `      <p>${p}</p>`).join("\n")}
      <h3>Notable matters</h3>
      <ul>${b.matters.map((m) => `<li>${m}</li>`).join("")}</ul>
    </div>
    <dl class="cs-cred">${b.cred.map(([k, v]) => `<div><dt>${k}</dt><dd>${k === "Email" ? `<a href="mailto:${v}">${v}</a>` : v}</dd></div>`).join("")}</dl>
  </article>`).join("\n")}

  <section class="cs-sec" aria-labelledby="cs-staff-h">
    <div class="cs-head">
      <p class="cs-kicker"><b>§</b> Associates &amp; staff</p>
      <h2 id="cs-staff-h">The people who keep every case moving.</h2>
    </div>
    <ul class="cs-staff">
      <li><strong>Marisol Ortega</strong><span>Associate · Employment and injury intake</span></li>
      <li><strong>James Whitfield</strong><span>Associate · Business and real estate litigation</span></li>
      <li><strong>Anna Kowalski</strong><span>Senior paralegal · Estates and probate</span></li>
    </ul>
  </section>
</main>
${CTA_HTML}
${FOOTER_HTML}
</div>`;

const template: StarterTemplate = {
  id: "original-legal",
  name: "Calloway Stone LLP",
  tagline: "Law firm site with a practice index, results docket, attorney biographies, upfront consultation fees and booking",
  category: "legal",
  tags: ["legal", "law firm", "lawyer", "attorney", "litigation", "consultation", "employment law", "estate planning", "family law", "booking"],
  source: "original",
  modules: ["bookings", "contact-form"],
  theme: {
    name: "Calloway Stone",
    mode: "light",
    primary: "#7b1e2c",
    primary2: "#5f1621",
    accent: "#56606b",
    bg: "#f5f3ef",
    surface: "#fcfbf9",
    surface2: "#ebe7e0",
    border: "#d6d0c6",
    text: "#15171c",
    textMuted: "#5b5f66",
    font: `"Libre Franklin", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    fontDisplay: `"Libre Caslon Display", "Libre Caslon Text", Georgia, "Times New Roman", serif`,
    googleFonts: ["Libre Caslon Display", "Libre Caslon Text:ital,wght@0,400;0,700;1,400", "Libre Franklin:wght@400;500;600;700"],
    radius: "0px",
    radiusSm: "0px",
    dark: {
      name: "Calloway Stone Night",
      mode: "dark",
      primary: "#d66b7d",
      primary2: "#e2899a",
      accent: "#a2acb7",
      bg: "#111317",
      surface: "#181b20",
      surface2: "#20242b",
      border: "#30353d",
      text: "#ece9e3",
      textMuted: "#a9adb3",
      font: `"Libre Franklin", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      fontDisplay: `"Libre Caslon Display", "Libre Caslon Text", Georgia, "Times New Roman", serif`,
      googleFonts: ["Libre Caslon Display", "Libre Caslon Text:ital,wght@0,400;0,700;1,400", "Libre Franklin:wght@400;500;600;700"],
      radius: "0px",
      radiusSm: "0px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: BASE_CSS + NAV_CSS + HOME_CSS + CTA_FOOTER_CSS },
    { title: "Practice areas", slug: "practice-areas", isHome: false, html: PRACTICE_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + PRACTICE_CSS + CTA_FOOTER_CSS },
    { title: "Attorneys", slug: "attorneys", isHome: false, html: ATTORNEYS_HTML, css: BASE_CSS + NAV_CSS + ATTORNEYS_CSS + CTA_FOOTER_CSS },
  ],
};

registerTemplate(template);
export default template;
