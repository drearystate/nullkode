/**
 * Clara Holt — Personal brand flagship (original-personal)
 *
 * Art direction
 * - Mood: warm, candid, encouraging. The personal site of a Boston leadership coach
 *   and writer who helps first-time managers; it should feel like a letter from
 *   someone who has been there, not a sales funnel.
 * - Type: Fraunces (soft optical serif, italics for the "handwritten" voice) for
 *   display, Karla for text.
 * - Palette: plum #6b2d5c on warm ivory #fbf6f0, marigold #e3a336 as the "morning sun"
 *   motif (decoration and highlight backgrounds only, never text on light ground).
 * - Layout grammar: a sun disc behind the portrait, ruled notebook paper, ticket-style
 *   offer rows with perforations, an email-client preview, postcards with stamps and
 *   a book cover drawn in CSS; generous rounded corners and slight rotations.
 * - Signature: the "Sound familiar?" notebook, the three offer tickets, the Monday
 *   Letter inbox preview and the CSS book. Inner pages add a "choose your path"
 *   flow chart, a six-week syllabus grid, a zig-zag story timeline and sticky notes.
 * - Pages: Home, Work with me (coaching, cohort, workshops, questions), About.
 * - Modules: newsletter (The Monday Letter) and bookings (free intro call).
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";


/* ── Shared CSS ─────────────────────────────────────────────────────── */
const BASE_CSS = `
.ch-page{font-size:1.06rem;line-height:1.65}
.ch-wrap{width:min(1160px,100% - 40px);margin-inline:auto}
.ch-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.ch-page h1,.ch-page h2,.ch-page h3{font-weight:500;letter-spacing:-.015em}
.ch-page h1 em,.ch-page h2 em{font-style:italic;color:var(--nk-primary)}
.ch-kicker{display:inline-flex;align-items:center;gap:10px;margin:0 0 16px;font-weight:600;font-size:.95rem;color:var(--nk-primary)}
.ch-kicker::before{content:"";width:14px;height:14px;flex:none;border-radius:50%;background:var(--nk-accent)}
.ch-h2{margin:0;font-size:clamp(2.1rem,4.4vw,3.4rem);line-height:1.08;text-wrap:balance}
.ch-intro{margin:18px 0 0;max-width:58ch;color:var(--nk-text-muted);font-size:1.12rem}
.ch-sec{padding:clamp(64px,9vw,120px) 0}
.ch-head{max-width:740px;margin-bottom:clamp(36px,5vw,56px)}
.ch-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:0 28px;border-radius:999px;font-weight:700;font-size:1.02rem;text-decoration:none;border:1.5px solid transparent;transition:background-color .2s,color .2s,border-color .2s}
.ch-btn:hover{text-decoration:none}
.ch-btn-plum{background:var(--nk-primary);color:var(--nk-surface)}
.ch-btn-plum:hover{background:var(--nk-primary-2);color:var(--nk-surface)}
.ch-btn-soft{color:var(--nk-text);background:var(--nk-surface);border-color:var(--nk-border)}
.ch-btn-soft:hover{color:var(--nk-text);border-color:var(--nk-text)}
.ch-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.ch-link{font-weight:700;color:var(--nk-primary);text-decoration-line:underline;text-decoration-style:wavy;text-decoration-color:var(--nk-accent);text-decoration-thickness:2px;text-underline-offset:7px}
.ch-link:hover{color:var(--nk-primary-2)}
.ch-page a:focus-visible,.ch-page [tabindex]:focus-visible,.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px;border-radius:10px}
.ch-tint{background:var(--nk-surface-2)}
.ch-call{padding:clamp(56px,8vw,104px) 0}
.ch-call-card{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.3fr) auto;gap:28px 48px;align-items:center;padding:clamp(32px,5vw,64px);border-radius:32px;background:var(--nk-primary);color:var(--nk-surface)}
.ch-call-card::after{content:"";position:absolute;right:-90px;top:-110px;width:300px;height:300px;border-radius:50%;background:var(--nk-accent);opacity:.9}
.ch-call-card>*{position:relative;z-index:1}
.ch-call-card h2{margin:0;color:var(--nk-surface);font-size:clamp(2rem,4vw,3.1rem);line-height:1.08}
.ch-call-card h2 em{color:var(--nk-surface)}
.ch-call-card p{margin:14px 0 0;color:color-mix(in srgb,var(--nk-surface) 84%,var(--nk-primary));font-size:1.1rem;max-width:52ch}
.ch-call-card .ch-btn{background:var(--nk-surface);color:var(--nk-primary-2)}
.ch-call-card .ch-btn:hover{background:var(--nk-bg);color:var(--nk-primary-2)}
.ch-call-card a:focus-visible{outline-color:var(--nk-surface)}
@media (max-width:820px){.ch-call-card{grid-template-columns:minmax(0,1fr);padding-top:112px}.ch-call-card::after{width:170px;height:170px;right:-50px;top:-70px}}
.ch-footer{padding:56px 0 30px;border-top:1px solid var(--nk-border)}
.ch-foot-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:32px}
.ch-foot-name{display:flex;align-items:center;gap:10px;margin:0 0 10px;font-family:var(--nk-font-display);font-style:italic;font-size:1.6rem}
.ch-foot-name::before{content:"";width:20px;height:20px;border-radius:50%;background:var(--nk-accent)}
.ch-foot-grid p{margin:0;color:var(--nk-text-muted)}
.ch-foot-h{margin:6px 0 12px!important;font-weight:700;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-text)!important}
.ch-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.ch-footer a{color:var(--nk-text-muted);text-decoration:none}
.ch-footer a:hover{color:var(--nk-primary);text-decoration:underline}
.ch-foot-base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;margin-top:40px;padding-top:20px;border-top:1px solid var(--nk-border);font-size:.9rem;color:var(--nk-text-muted)}
.ch-foot-base p{margin:0}
@media (max-width:860px){.ch-foot-grid{grid-template-columns:1fr 1fr}}
@media (max-width:460px){.ch-foot-grid{grid-template-columns:minmax(0,1fr)}}
`;

const NAV_CSS = `
.nk-nav{padding-block:18px!important;background:var(--nk-bg)!important;border-bottom:0!important;position:relative;z-index:20}
.nk-nav>.container{max-width:1160px}
.nk-nav .navbar-brand{display:inline-flex;align-items:center;gap:10px;font-family:var(--nk-font-display)!important;font-style:italic;font-weight:500!important;font-size:1.55rem;color:var(--nk-text)!important}
.nk-nav .navbar-brand::before{content:"";width:22px;height:22px;flex:none;border-radius:50%;background:var(--nk-accent);box-shadow:0 0 0 5px color-mix(in srgb,var(--nk-accent) 25%,transparent)}
.nk-nav .nav-link{color:var(--nk-text)!important;font-weight:500!important;font-size:1rem;padding:8px 14px!important}
.nk-nav .nav-link:hover{color:var(--nk-primary)!important;text-decoration:none}
.nk-nav .nav-link.active{color:var(--nk-primary)!important;text-decoration-line:underline;text-decoration-style:wavy;text-decoration-color:var(--nk-accent);text-decoration-thickness:2px;text-underline-offset:8px}
.nk-nav .btn{background:var(--nk-primary)!important;color:var(--nk-surface)!important;border-radius:999px!important;padding:8px 18px!important}
.nk-nav .navbar-toggler{padding:0!important;width:48px;height:48px;border-radius:50%!important;border:0!important;background-color:var(--nk-accent)!important;color:var(--nk-text)!important;font-size:0;line-height:0;background-image:linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor);background-size:20px 2px,12px 2px;background-position:14px 19px,14px 27px;background-repeat:no-repeat}
.nk-nav .navbar-toggler>*{display:none!important}
.nk-nav .dropdown-menu{border-radius:18px;padding:8px;background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;box-shadow:0 20px 40px -24px color-mix(in srgb,var(--nk-primary) 50%,transparent)}
.nk-nav .dropdown-item{border-radius:12px;padding:9px 14px;color:var(--nk-text)!important}
.nk-nav .dropdown-item:hover,.nk-nav .dropdown-item:focus{background:var(--nk-surface-2)}
@media (min-width:992px){.nk-nav .dropdown{position:relative}.nk-nav .dropdown-menu-end{right:0;left:auto}}
@media (max-width:991.98px){.nk-nav .navbar-collapse{margin-top:14px;padding:10px 14px;border-radius:22px;background:var(--nk-surface);border:1px solid var(--nk-border)}.nk-nav .nav-link{padding:12px 6px!important;font-family:var(--nk-font-display);font-size:1.3rem}}
`;

/* ── Home ───────────────────────────────────────────────────────────── */
const HOME_CSS = `
.ch-hero{padding:clamp(24px,4vw,48px) 0 clamp(56px,7vw,96px)}
.ch-hero-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:48px 72px;align-items:center}
.ch-hero h1{margin:0;font-size:clamp(2.8rem,6vw,5.1rem);line-height:1.02;text-wrap:balance}
.ch-lede{margin:26px 0 0;max-width:52ch;font-size:1.18rem;color:var(--nk-text-muted)}
.ch-proof{display:flex;flex-wrap:wrap;align-items:center;gap:10px 22px;margin:28px 0 0;color:var(--nk-text-muted);font-size:.95rem}
.ch-proof b{color:var(--nk-text)}
.ch-hero-fig{position:relative;margin:0;padding:26px 0 0 26px}
.ch-hero-fig::before{content:"";position:absolute;left:0;top:0;width:78%;aspect-ratio:1;border-radius:50%;background:var(--nk-accent)}
.ch-hero-fig img{position:relative;display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;border-radius:200px 200px 28px 28px}
.ch-hello{position:absolute;left:-12px;bottom:36px;max-width:250px;margin:0;padding:16px 20px;border-radius:18px;background:var(--nk-surface);box-shadow:0 20px 40px -20px color-mix(in srgb,var(--nk-text) 45%,transparent);transform:rotate(-3deg)}
.ch-hello strong{display:block;font-family:var(--nk-font-display);font-style:italic;font-weight:500;font-size:1.5rem;color:var(--nk-primary)}
.ch-hello span{font-size:.92rem;color:var(--nk-text-muted)}
@media (max-width:900px){.ch-hero-grid{grid-template-columns:minmax(0,1fr)}.ch-hero-fig{max-width:460px}.ch-hello{left:6px}}
.ch-seen{padding:26px 0;border-block:1px solid var(--nk-border)}
.ch-seen-inner{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 40px}
.ch-seen p{margin:0;font-weight:600;color:var(--nk-text-muted)}
.ch-seen ul{list-style:none;display:flex;flex-wrap:wrap;gap:10px 34px;margin:0;padding:0}
.ch-seen li{font-family:var(--nk-font-display);font-style:italic;font-size:1.25rem;color:color-mix(in srgb,var(--nk-text) 72%,var(--nk-bg))}
.ch-familiar{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:40px 72px;align-items:center}
.ch-notebook{position:relative;margin:0;padding:34px 30px 30px 74px;border-radius:6px 22px 22px 6px;background-color:var(--nk-surface);background-image:linear-gradient(90deg,transparent 52px,color-mix(in srgb,var(--nk-primary) 35%,transparent) 52px 54px,transparent 54px),repeating-linear-gradient(transparent 0 41px,color-mix(in srgb,var(--nk-primary) 16%,transparent) 41px 42px);background-position:0 0,0 22px;box-shadow:0 30px 60px -36px color-mix(in srgb,var(--nk-text) 55%,transparent);transform:rotate(1deg)}
.ch-notebook ul{list-style:none;margin:0;padding:0}
.ch-notebook li{position:relative;min-height:42px;padding:6px 0;font-family:var(--nk-font-display);font-style:italic;font-size:1.22rem;line-height:1.35}
.ch-notebook li::before{content:"✓";position:absolute;left:-40px;top:6px;font-style:normal;font-weight:700;color:var(--nk-primary)}
.ch-notebook-foot{margin:14px 0 0;font-size:1rem;color:var(--nk-text-muted)}
@media (max-width:900px){.ch-familiar{grid-template-columns:minmax(0,1fr)}.ch-notebook{transform:none}}
@media (max-width:480px){.ch-notebook{padding:28px 18px 24px 56px;background-image:linear-gradient(90deg,transparent 38px,color-mix(in srgb,var(--nk-primary) 35%,transparent) 38px 40px,transparent 40px),repeating-linear-gradient(transparent 0 41px,color-mix(in srgb,var(--nk-primary) 16%,transparent) 41px 42px)}.ch-notebook li{font-size:1.1rem}.ch-notebook li::before{left:-32px}}
.ch-tickets{display:grid;gap:22px}
.ch-ticket{position:relative;display:grid;grid-template-columns:230px minmax(0,1fr) auto;align-items:stretch;overflow:hidden;border-radius:24px;background:var(--nk-surface);border:1.5px solid var(--nk-text)}
.ch-ticket::before,.ch-ticket::after{content:"";position:absolute;left:216px;width:28px;height:28px;border-radius:50%;background:var(--nk-bg);border:1.5px solid var(--nk-text);z-index:2}
.ch-ticket::before{top:-15px}
.ch-ticket::after{bottom:-15px}
.ch-stub{display:flex;flex-direction:column;justify-content:space-between;gap:16px;padding:26px;border-right:2px dashed var(--nk-text)}
.ch-stub-sun{background:var(--nk-accent);color:var(--nk-text)}
.ch-stub-plum{background:var(--nk-primary);color:var(--nk-surface)}
.ch-stub-ink{background:var(--nk-text);color:var(--nk-surface)}
.ch-stub p{margin:0}
.ch-stub-kind{font-weight:700;font-size:.82rem;letter-spacing:.1em;text-transform:uppercase}
.ch-stub-price{font-family:var(--nk-font-display);font-size:2.4rem;line-height:1}
.ch-stub-price small{display:block;margin-top:6px;font-family:var(--nk-font);font-size:.9rem;opacity:.9}
.ch-ticket-body{padding:26px 30px}
.ch-ticket-body h3{margin:0;font-size:1.9rem;line-height:1.1}
.ch-ticket-body p{margin:10px 0 0;color:var(--nk-text-muted);max-width:56ch}
.ch-ticket-meta{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.ch-ticket-meta li{padding:4px 12px;border-radius:999px;background:var(--nk-surface-2);font-size:.88rem;font-weight:600}
.ch-ticket-cta{display:flex;align-items:center;padding:26px 30px 26px 0}
@media (max-width:900px){.ch-ticket{grid-template-columns:minmax(0,1fr)}.ch-ticket::before,.ch-ticket::after{display:none}.ch-stub{flex-direction:row;align-items:flex-end;justify-content:space-between;border-right:0;border-bottom:2px dashed var(--nk-text)}.ch-ticket-cta{padding:0 30px 28px}}
@media (max-width:420px){.ch-stub{flex-direction:column;align-items:flex-start}.ch-ticket-body{padding:22px 20px}.ch-ticket-cta{padding:0 20px 24px}}
.ch-about{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:40px 72px;align-items:center}
.ch-about-fig{position:relative;margin:0}
.ch-about-fig img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;border-radius:28px}
.ch-about-fig figcaption{position:absolute;right:-14px;top:24px;padding:8px 16px;border-radius:999px;background:var(--nk-accent);font-weight:700;font-size:.92rem;transform:rotate(4deg)}
.ch-about-copy>p{margin:18px 0 0;font-size:1.08rem}
.ch-facts{list-style:none;margin:24px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px 28px}
.ch-facts li{display:flex;gap:12px;align-items:baseline}
.ch-facts li::before{content:"";flex:none;width:10px;height:10px;border-radius:50%;background:var(--nk-accent);transform:translateY(-1px)}
.ch-sign{display:block;margin-top:24px;font-family:var(--nk-font-display);font-style:italic;font-size:2rem;color:var(--nk-primary)}
@media (max-width:900px){.ch-about{grid-template-columns:minmax(0,1fr)}.ch-about-fig{max-width:420px}}
@media (max-width:520px){.ch-facts{grid-template-columns:minmax(0,1fr)}.ch-about-fig figcaption{right:8px}}
.ch-letter{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:40px 72px;align-items:center}
.ch-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:28px 0 0}
.ch-stats div{display:flex;flex-direction:column-reverse;gap:4px;padding:16px;border-radius:16px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.ch-stats dd{margin:0;font-family:var(--nk-font-display);font-size:1.9rem;line-height:1;color:var(--nk-primary)}
.ch-stats dt{font-size:.88rem;color:var(--nk-text-muted)}
.ch-inbox{border-radius:24px;overflow:hidden;background:var(--nk-surface);border:1px solid var(--nk-border);box-shadow:0 40px 80px -48px color-mix(in srgb,var(--nk-primary) 70%,transparent)}
.ch-inbox p{margin:0}
.ch-inbox-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 22px;background:var(--nk-surface-2);border-bottom:1px solid var(--nk-border);font-weight:600;font-size:.92rem}
.ch-new{padding:3px 10px;border-radius:999px;background:var(--nk-primary);color:var(--nk-surface);font-size:.78rem;font-weight:700}
.ch-inbox-fields{margin:0;padding:16px 22px;border-bottom:1px solid var(--nk-border);display:grid;gap:6px;font-size:.95rem}
.ch-inbox-fields div{display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px}
.ch-inbox-fields dt{color:var(--nk-text-muted)}
.ch-inbox-fields dd{margin:0;font-weight:600}
.ch-inbox-body{position:relative;padding:22px 22px 0;max-height:250px;overflow:hidden;font-size:1rem;-webkit-mask-image:linear-gradient(currentColor 55%,transparent);mask-image:linear-gradient(currentColor 55%,transparent)}
.ch-inbox-body p+p{margin-top:12px}
.ch-inbox-body img{float:right;width:130px;height:auto;margin:0 0 10px 16px;border-radius:12px}
.ch-inbox-foot{padding:0 22px 22px}
.ch-issues{list-style:none;margin:22px 0 0;padding:0;border-top:1px solid var(--nk-border)}
.ch-issues li{display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid var(--nk-border)}
.ch-issues span{color:var(--nk-text-muted);white-space:nowrap}
@media (max-width:900px){.ch-letter{grid-template-columns:minmax(0,1fr)}}
@media (max-width:460px){.ch-stats{gap:8px}.ch-stats div{padding:12px 10px}.ch-stats dd{font-size:1.5rem}.ch-inbox-body img{display:none}}
.ch-book{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:48px 72px;align-items:center}
.ch-cover-wrap{display:flex;justify-content:center;padding:24px 0}
.ch-cover{position:relative;display:flex;flex-direction:column;justify-content:space-between;width:min(300px,78%);aspect-ratio:2/3;padding:30px 26px 26px 34px;border-radius:4px 16px 16px 4px;background-color:var(--nk-primary);background-image:linear-gradient(90deg,color-mix(in srgb,var(--nk-text) 38%,transparent) 0 9px,color-mix(in srgb,var(--nk-surface) 16%,transparent) 9px 11px,transparent 11px);color:var(--nk-surface);box-shadow:24px 30px 50px -24px color-mix(in srgb,var(--nk-text) 70%,transparent);transform:rotate(-4deg)}
.ch-cover::after{content:"";position:absolute;right:26px;top:118px;width:92px;height:92px;border-radius:50%;background:var(--nk-accent)}
.ch-cover p{position:relative;z-index:1;margin:0}
.ch-cover-title{font-family:var(--nk-font-display);font-size:2.9rem;line-height:.95;letter-spacing:-.02em}
.ch-cover-sub{margin-top:12px!important;font-size:.95rem;line-height:1.35;max-width:14ch}
.ch-cover-author{font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:.82rem}
.ch-book-copy blockquote{margin:24px 0 0;padding-left:20px;border-left:3px solid var(--nk-accent)}
.ch-book-copy blockquote p{margin:0;font-family:var(--nk-font-display);font-style:italic;font-size:1.3rem;line-height:1.4}
.ch-book-copy blockquote footer{margin-top:8px;color:var(--nk-text-muted);font-size:.95rem}
.ch-formats{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin:22px 0 0;padding:0}
.ch-formats li{padding:6px 14px;border-radius:999px;border:1px solid var(--nk-border);background:var(--nk-surface);font-weight:600;font-size:.9rem}
@media (max-width:900px){.ch-book{grid-template-columns:minmax(0,1fr)}}
.ch-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;padding-top:10px}
.ch-postcard{position:relative;margin:0;padding:28px 26px 24px;border-radius:8px;background:var(--nk-surface);box-shadow:0 22px 44px -28px color-mix(in srgb,var(--nk-text) 55%,transparent);transform:rotate(-1.5deg)}
.ch-postcard:nth-child(2){transform:rotate(1.2deg) translateY(14px)}
.ch-postcard:nth-child(3){transform:rotate(-.6deg)}
.ch-postcard::before{content:"";position:absolute;top:18px;right:18px;width:46px;height:54px;border:2px dashed var(--nk-accent);border-radius:4px;background-image:radial-gradient(circle at 50% 50%,var(--nk-accent) 0 11px,transparent 12px)}
.ch-postcard blockquote{margin:0;padding-right:56px}
.ch-postcard blockquote p{margin:0;font-family:var(--nk-font-display);font-style:italic;font-size:1.22rem;line-height:1.45}
.ch-postcard figcaption{margin-top:18px;padding-top:14px;border-top:1px dashed var(--nk-border);font-size:.95rem;color:var(--nk-text-muted)}
.ch-postcard figcaption b{display:block;color:var(--nk-text)}
@media (max-width:900px){.ch-cards{grid-template-columns:minmax(0,1fr);gap:22px}.ch-postcard:nth-child(2){transform:rotate(1deg)}}
`;

/* ── Work with me ───────────────────────────────────────────────────── */
const WORK_CSS = `
.ch-phead{padding:clamp(40px,6vw,80px) 0 clamp(40px,5vw,64px)}
.ch-phead h1{margin:0;max-width:18ch;font-size:clamp(2.6rem,6vw,4.6rem);line-height:1.03;text-wrap:balance}
.ch-pills{list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin:28px 0 0;padding:0}
.ch-pills a{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:var(--nk-surface);border:1px solid var(--nk-border);color:var(--nk-text);font-weight:600;text-decoration:none}
.ch-pills a::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--nk-accent)}
.ch-pills a:hover{border-color:var(--nk-primary);text-decoration:none}
.ch-flow{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;padding-top:108px}
.ch-flow-q{position:absolute;top:0;left:50%;transform:translateX(-50%);margin:0;padding:16px 26px;border-radius:999px;background:var(--nk-primary);color:var(--nk-surface);font-family:var(--nk-font-display);font-style:italic;font-size:1.35rem;white-space:nowrap}
.ch-flow::before{content:"";position:absolute;top:64px;left:calc(100% / 6);right:calc(100% / 6);height:22px;border:2px solid var(--nk-text);border-bottom:0;border-radius:18px 18px 0 0}
.ch-flow::after{content:"";position:absolute;top:44px;left:50%;width:2px;height:20px;background:var(--nk-text)}
.ch-path{position:relative;display:flex;flex-direction:column;padding:26px;border-radius:22px;background:var(--nk-surface);border:1.5px solid var(--nk-text)}
.ch-path::before{content:"";position:absolute;top:-24px;left:50%;width:2px;height:22px;background:var(--nk-text)}
.ch-path-if{margin:0;font-family:var(--nk-font-display);font-style:italic;font-size:1.3rem;line-height:1.3}
.ch-path h2{margin:18px 0 0;font-size:1.6rem}
.ch-path p:not(.ch-path-if){margin:8px 0 18px;color:var(--nk-text-muted)}
.ch-path .ch-link{margin-top:auto}
@media (max-width:900px){.ch-flow{grid-template-columns:minmax(0,1fr);padding:0 0 0 28px;gap:16px}.ch-flow::before{top:0;bottom:24px;left:0;right:auto;width:2px;height:auto;border:0;border-radius:0;background:var(--nk-text)}.ch-flow::after{display:none}.ch-flow-q{position:static;transform:none;white-space:normal;margin:0 0 6px -28px;border-radius:22px}.ch-path::before{top:50%;left:-28px;width:26px;height:2px}}
.ch-offer{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:40px 64px;align-items:start;scroll-margin-top:16px}
.ch-offer h2{margin:0;font-size:clamp(2rem,3.8vw,2.9rem);line-height:1.1}
.ch-offer-copy>p{margin:16px 0 0;font-size:1.08rem;max-width:58ch}
.ch-offer-copy h3{margin:28px 0 12px;font-family:var(--nk-font);font-size:.85rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.ch-incl{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.ch-incl li{display:flex;gap:12px}
.ch-incl li::before{content:"✓";flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--nk-accent);color:var(--nk-text);font-size:.78rem;font-weight:700}
.ch-offer-side{display:grid;gap:20px}
.ch-coach-fig{margin:0}
.ch-coach-fig img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;object-position:50% 30%;border-radius:26px}
.ch-price{padding:28px;border-radius:26px;background:var(--nk-surface);border:1px solid var(--nk-border);box-shadow:0 30px 60px -40px color-mix(in srgb,var(--nk-primary) 60%,transparent)}
.ch-price p{margin:0}
.ch-price-label{font-weight:700;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;color:var(--nk-text-muted)}
.ch-price-opts{display:grid;gap:12px;margin:16px 0 0}
.ch-price-opt{padding:16px 18px;border-radius:16px;border:1.5px solid var(--nk-border);background:var(--nk-bg)}
.ch-price-opt.is-main{border-color:var(--nk-primary);background:color-mix(in srgb,var(--nk-primary) 6%,var(--nk-surface))}
.ch-price-opt b{display:block;font-family:var(--nk-font-display);font-weight:500;font-size:1.9rem;line-height:1.1}
.ch-price-opt span{color:var(--nk-text-muted);font-size:.95rem}
.ch-price .ch-btn{width:100%;margin-top:18px}
.ch-price-note{margin-top:12px!important;font-size:.9rem;color:var(--nk-text-muted);text-align:center}
@media (max-width:900px){.ch-offer{grid-template-columns:minmax(0,1fr)}}
.ch-weeks{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;counter-reset:chw}
.ch-weeks li{padding:22px;border-radius:20px;background:var(--nk-surface);border:1px solid var(--nk-border);counter-increment:chw}
.ch-weeks li::before{content:"Week " counter(chw);display:block;font-family:var(--nk-font-display);font-style:italic;font-size:1.05rem;color:var(--nk-primary)}
.ch-weeks b{display:block;margin-top:8px;font-size:1.1rem}
.ch-weeks span{display:block;margin-top:6px;color:var(--nk-text-muted);font-size:.95rem}
@media (max-width:900px){.ch-weeks{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.ch-weeks{grid-template-columns:minmax(0,1fr)}}
.ch-cohort-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:24px 0 0}
.ch-cohort-facts div{display:flex;flex-direction:column-reverse;gap:4px;padding:14px 16px;border-radius:16px;background:var(--nk-surface-2)}
.ch-cohort-facts dd{margin:0;font-weight:700}
.ch-cohort-facts dt{font-size:.85rem;color:var(--nk-text-muted)}
@media (max-width:700px){.ch-cohort-facts{grid-template-columns:1fr 1fr}}
.ch-formats-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:8px}
.ch-format{padding:26px;border-radius:24px;border:1.5px solid var(--nk-text);background:var(--nk-surface)}
.ch-format:nth-child(2){background:var(--nk-accent)}
.ch-format h3{margin:0;font-size:1.5rem}
.ch-format p{margin:10px 0 0}
.ch-format dl{margin:16px 0 0;padding-top:12px;border-top:1px dashed color-mix(in srgb,var(--nk-text) 30%,transparent);display:grid;gap:6px;font-size:.95rem}
.ch-format dl div{display:flex;justify-content:space-between;gap:10px}
.ch-format dd{margin:0;font-weight:700;text-align:right}
.ch-clients{margin:24px 0 0;color:var(--nk-text-muted)}
@media (max-width:900px){.ch-formats-grid{grid-template-columns:minmax(0,1fr)}}
.ch-qa{column-count:2;column-gap:24px}
.ch-q{break-inside:avoid;margin:0 0 24px;padding:24px 26px;border-radius:22px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.ch-q h3{margin:0;font-family:var(--nk-font-display);font-style:italic;font-weight:500;font-size:1.3rem;line-height:1.3;color:var(--nk-primary)}
.ch-q p{margin:10px 0 0}
@media (max-width:760px){.ch-qa{column-count:1}}
`;

/* ── About ──────────────────────────────────────────────────────────── */
const ABOUT_CSS = `
.ch-ahead{padding:clamp(32px,5vw,72px) 0 clamp(48px,6vw,88px)}
.ch-ahead-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:40px 72px;align-items:center}
.ch-ahead h1{margin:0;font-size:clamp(2.6rem,5.6vw,4.5rem);line-height:1.03;text-wrap:balance}
.ch-ahead-copy>p{margin:20px 0 0;font-size:1.12rem;max-width:56ch}
.ch-ahead-fig{margin:0;position:relative}
.ch-ahead-fig img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;border-radius:999px 999px 26px 26px}
.ch-ahead-fig::after{content:"";position:absolute;right:-18px;bottom:40px;width:110px;height:110px;border-radius:50%;background:var(--nk-accent);z-index:-1}
.ch-ahead-fig{isolation:isolate}
@media (max-width:900px){.ch-ahead-grid{grid-template-columns:minmax(0,1fr)}.ch-ahead-fig{max-width:400px}.ch-ahead-fig::after{right:0}}
.ch-chapters{position:relative;list-style:none;margin:0;padding:0}
.ch-chapters::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:2px;background:var(--nk-border)}
.ch-chap{position:relative;width:calc(50% - 48px);margin-bottom:28px;padding:24px 26px;border-radius:22px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.ch-chap:nth-child(even){margin-left:auto}
.ch-chap::before{content:"";position:absolute;top:30px;right:-58px;width:20px;height:20px;border-radius:50%;background:var(--nk-accent);box-shadow:0 0 0 6px var(--nk-bg)}
.ch-chap:nth-child(even)::before{right:auto;left:-58px}
.ch-chap-year{display:block;font-family:var(--nk-font-display);font-style:italic;font-size:1.9rem;line-height:1;color:var(--nk-primary)}
.ch-chap h3{margin:10px 0 0;font-size:1.35rem}
.ch-chap p{margin:8px 0 0;color:var(--nk-text-muted)}
@media (max-width:760px){.ch-chapters::before{left:9px}.ch-chap,.ch-chap:nth-child(even){width:auto;margin-left:36px}.ch-chap::before,.ch-chap:nth-child(even)::before{left:-37px;right:auto}}
.ch-beliefs{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 48px;counter-reset:chb}
.ch-belief{display:grid;grid-template-columns:64px minmax(0,1fr);gap:4px 16px;padding-top:22px;border-top:1px solid var(--nk-border);counter-increment:chb}
.ch-belief::before{content:counter(chb);grid-row:span 2;font-family:var(--nk-font-display);font-style:italic;font-size:3rem;line-height:.9;color:var(--nk-primary)}
.ch-belief b{font-family:var(--nk-font-display);font-weight:500;font-size:1.35rem;line-height:1.25}
.ch-belief span{color:var(--nk-text-muted)}
@media (max-width:760px){.ch-beliefs{grid-template-columns:minmax(0,1fr)}}
.ch-wide{margin:0}
.ch-wide img{display:block;width:100%;height:auto;aspect-ratio:12/5;object-fit:cover;border-radius:28px}
.ch-wide figcaption{margin-top:10px;font-size:.92rem;color:var(--nk-text-muted)}
@media (max-width:640px){.ch-wide img{aspect-ratio:3/2}}
.ch-press-grid{display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,1.3fr);gap:32px 56px;align-items:center}
.ch-press-fig{margin:0}
.ch-press-fig img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;border-radius:26px}
@media (max-width:860px){.ch-press-grid{grid-template-columns:minmax(0,1fr)}.ch-press-fig{max-width:360px}}
.ch-press{list-style:none;margin:0;padding:0;border-top:1px solid var(--nk-border)}
.ch-press li{display:grid;grid-template-columns:110px minmax(0,1fr) auto;gap:6px 20px;align-items:center;padding:16px 0;border-bottom:1px solid var(--nk-border)}
.ch-chip{justify-self:start;padding:4px 12px;border-radius:999px;background:var(--nk-surface-2);font-size:.82rem;font-weight:700}
.ch-press b{font-weight:600}
.ch-press span:last-child{color:var(--nk-text-muted);font-size:.95rem;white-space:nowrap}
@media (max-width:640px){.ch-press li{grid-template-columns:minmax(0,1fr)}}
.ch-notes{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.ch-note{display:flex;flex-direction:column;justify-content:space-between;min-height:170px;padding:20px;border-radius:6px;background:color-mix(in srgb,var(--nk-accent) 35%,var(--nk-surface));box-shadow:0 16px 30px -22px color-mix(in srgb,var(--nk-text) 60%,transparent);transform:rotate(-1.5deg)}
.ch-note:nth-child(even){background:color-mix(in srgb,var(--nk-primary) 12%,var(--nk-surface));transform:rotate(1.5deg)}
.ch-note small{font-weight:700;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase}
.ch-note p{margin:12px 0 0;font-family:var(--nk-font-display);font-style:italic;font-size:1.25rem;line-height:1.3}
@media (max-width:900px){.ch-notes{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:420px){.ch-notes{grid-template-columns:minmax(0,1fr)}.ch-note{min-height:0}}
`;

/* ── Shared HTML ────────────────────────────────────────────────────── */
const CALL_HTML = `
<section class="ch-call" aria-labelledby="ch-call-h">
  <div class="ch-wrap">
    <div class="ch-call-card">
      <div>
        <h2 id="ch-call-h">Not sure where to start? <em>Let's talk.</em></h2>
        <p>Book a free 20-minute call. We'll work out whether you need a letter, a group or a coach, and it's fine if the answer is "none of the above".</p>
      </div>
      <a class="ch-btn" href="/book">Book a free call</a>
    </div>
  </div>
</section>`;

const FOOTER_HTML = `
<footer class="ch-footer">
  <div class="ch-wrap">
    <div class="ch-foot-grid">
      <div>
        <p class="ch-foot-name">Clara Holt</p>
        <p>Coaching and writing for first-time managers. Based in Boston, working with people everywhere.</p>
      </div>
      <div><p class="ch-foot-h">Work with me</p><ul><li><a href="/work-with-me#coaching">1:1 coaching</a></li><li><a href="/work-with-me#cohort">First 90 Cohort</a></li><li><a href="/work-with-me#workshops">Team workshops</a></li></ul></div>
      <div><p class="ch-foot-h">Read</p><ul><li><a href="/join">The Monday Letter</a></li><li><a href="/about">About Clara</a></li></ul></div>
      <div><p class="ch-foot-h">Say hello</p><ul><li><a href="/book">Book a free call</a></li><li><a href="mailto:hello@claraholt.example">hello@claraholt.example</a></li></ul></div>
    </div>
    <div class="ch-foot-base"><p>© 2026 Clara Holt Coaching LLC</p><p>Written by a person, not a funnel.</p></div>
  </div>
</footer>`;

/* ── Pages ──────────────────────────────────────────────────────────── */
const HOME_HTML = `
<div class="ch-page">
<nav aria-label="Main"></nav>
<header class="ch-hero">
  <div class="ch-wrap ch-hero-grid">
    <div>
      <p class="ch-kicker">Coaching and writing for first-time managers</p>
      <h1>Become the manager you <em>wish you'd had.</em></h1>
      <p class="ch-lede">I help new managers find their feet in the first 90 days: how to run one-to-ones, give feedback that lands and stop doing everyone's job. Through coaching, a small cohort course and a free letter every Monday.</p>
      <div class="ch-actions">
        <a class="ch-btn ch-btn-plum" href="/join">Get the Monday Letter</a>
        <a class="ch-btn ch-btn-soft" href="/work-with-me">Work with me</a>
      </div>
      <p class="ch-proof"><span><b>38,000</b> readers every Monday</span><span><b>420</b> managers coached</span></p>
    </div>
    <figure class="ch-hero-fig">
      <img src="/media/generated/personal-clara-hero.webp" alt="Clara Holt smiling, arms folded, leaning against a red brick wall" width="720" height="900">
      <figcaption class="ch-hello"><strong>Hi, I'm Clara.</strong><span>Coach, writer and recovering engineering manager.</span></figcaption>
    </figure>
  </div>
</header>

<main>
<section class="ch-seen" aria-label="As featured in">
  <div class="ch-wrap ch-seen-inner">
    <p>As featured in</p>
    <ul>
      <li>Workplace Weekly</li>
      <li>The Operator Podcast</li>
      <li>Northside Business Journal</li>
      <li>Management Matters</li>
    </ul>
  </div>
</section>

<section class="ch-sec" aria-labelledby="ch-fam-h">
  <div class="ch-wrap ch-familiar">
    <div>
      <p class="ch-kicker">Sound familiar?</p>
      <h2 class="ch-h2" id="ch-fam-h">Promoted on Friday. <em>Drowning by Wednesday.</em></h2>
      <p class="ch-intro">You were promoted because you were great at the work. Nobody mentioned that managing is a different job, with different skills, that you now learn in public.</p>
    </div>
    <div class="ch-notebook">
      <ul>
        <li>You still do the work, then manage at night.</li>
        <li>One-to-ones have turned into status updates.</li>
        <li>You put off a hard conversation until it became a crisis.</li>
        <li>Your old teammates report to you now, and it's weird.</li>
        <li>Nobody has told you what good looks like.</li>
      </ul>
      <p class="ch-notebook-foot">Ticked two or more? Completely normal. You're exactly who I work with.</p>
    </div>
  </div>
</section>

<section class="ch-sec ch-tint" aria-labelledby="ch-ways-h">
  <div class="ch-wrap">
    <div class="ch-head">
      <p class="ch-kicker">Ways to work together</p>
      <h2 class="ch-h2" id="ch-ways-h">Start free. Go deeper <em>when you're ready.</em></h2>
    </div>
    <div class="ch-tickets">
      <article class="ch-ticket">
        <div class="ch-stub ch-stub-sun"><p class="ch-stub-kind">Weekly letter</p><p class="ch-stub-price">Free<small>every Monday, 7 am</small></p></div>
        <div class="ch-ticket-body"><h3>The Monday Letter</h3><p>One practical idea for new managers each week, from the question that fixes a one-to-one to the script for your first difficult conversation.</p><ul class="ch-ticket-meta"><li>4-minute read</li><li>38,000 readers</li></ul></div>
        <div class="ch-ticket-cta"><a class="ch-btn ch-btn-soft" href="/join">Subscribe free</a></div>
      </article>
      <article class="ch-ticket">
        <div class="ch-stub ch-stub-plum"><p class="ch-stub-kind">Group course</p><p class="ch-stub-price">$690<small>6 weeks, live</small></p></div>
        <div class="ch-ticket-body"><h3>First 90 Cohort</h3><p>Twenty new managers, six live sessions and one playbook you will actually use. Most people expense it through their training budget.</p><ul class="ch-ticket-meta"><li>Starts Jan 12, 2027</li><li>9 seats left</li></ul></div>
        <div class="ch-ticket-cta"><a class="ch-btn ch-btn-soft" href="/work-with-me#cohort">See the syllabus</a></div>
      </article>
      <article class="ch-ticket">
        <div class="ch-stub ch-stub-ink"><p class="ch-stub-kind">1:1 coaching</p><p class="ch-stub-price">$2,400<small>3 months</small></p></div>
        <div class="ch-ticket-body"><h3>Coaching with Clara</h3><p>Twelve sessions, messages between calls and a written plan for your first year. For when you want someone firmly in your corner.</p><ul class="ch-ticket-meta"><li>2 places for January</li><li>Company billing available</li></ul></div>
        <div class="ch-ticket-cta"><a class="ch-btn ch-btn-plum" href="/book">Book an intro call</a></div>
      </article>
    </div>
  </div>
</section>

<section class="ch-sec" aria-labelledby="ch-about-h">
  <div class="ch-wrap ch-about">
    <figure class="ch-about-fig">
      <img src="/media/generated/personal-clara-notebook.webp" alt="Clara in glasses holding a notebook, sitting on the edge of a desk" width="560" height="700" loading="lazy">
      <figcaption>12 years managing teams</figcaption>
    </figure>
    <div class="ch-about-copy">
      <p class="ch-kicker">About me</p>
      <h2 class="ch-h2" id="ch-about-h">I was a bad manager first. <em>Then I got help.</em></h2>
      <p>I became a manager at 27, overnight, with six people who had been my friends the week before. I got almost everything wrong for a year. What turned it around was a patient coach and a handful of simple habits.</p>
      <p>I went on to lead engineering teams of up to 60 people at two scale-ups. Since 2021 I have coached new managers full time, and I still write every Monday Letter myself.</p>
      <ul class="ch-facts">
        <li>Certified executive coach (ICF)</li>
        <li>Author of <i>Promoted</i></li>
        <li>420 managers coached</li>
        <li>Lives in Boston, two kids, too many plants</li>
      </ul>
      <span class="ch-sign">Clara</span>
      <a class="ch-link" href="/about">Read my story</a>
    </div>
  </div>
</section>

<section class="ch-sec ch-tint" aria-labelledby="ch-letter-h">
  <div class="ch-wrap ch-letter">
    <div>
      <p class="ch-kicker">The Monday Letter</p>
      <h2 class="ch-h2" id="ch-letter-h">A better week, <em>in four minutes.</em></h2>
      <p class="ch-intro">Every Monday at 7 am: one idea, one example and one thing to try before Friday. No fluff, and no upsell at the bottom.</p>
      <dl class="ch-stats">
        <div><dt>readers</dt><dd>38k</dd></div>
        <div><dt>open every issue</dt><dd>61%</dd></div>
        <div><dt>issues so far</dt><dd>212</dd></div>
      </dl>
      <div class="ch-actions"><a class="ch-btn ch-btn-plum" href="/join">Get it free</a></div>
      <ul class="ch-issues" aria-label="Recent letters">
        <li>The feedback sandwich is stale<span>Sep 21</span></li>
        <li>What to do in your first week as a manager<span>Sep 14</span></li>
        <li>How to say no to your boss, kindly<span>Sep 7</span></li>
      </ul>
    </div>
    <div class="ch-inbox" role="img" aria-label="Preview of this week's Monday Letter in an email inbox: subject 'The one-to-one question I ask every week', from Clara Holt.">
      <div class="ch-inbox-bar"><span>Inbox · The Monday Letter</span><span class="ch-new">New</span></div>
      <dl class="ch-inbox-fields">
        <div><dt>From</dt><dd>Clara Holt</dd></div>
        <div><dt>Subject</dt><dd>The one-to-one question I ask every week</dd></div>
        <div><dt>Sent</dt><dd>Monday, 7:00 am</dd></div>
      </dl>
      <div class="ch-inbox-body">
        <img src="/media/generated/personal-letter-desk.webp" alt="" width="960" height="640" loading="lazy">
        <p>Hi friend,</p>
        <p>For two years my one-to-ones were status updates in disguise. Then a mentor gave me one question to open with: "What's taking more energy than it should right now?"</p>
        <p>It changed everything. People stopped reporting and started telling me what was actually going on. Here is how to use it this week, and the follow-up question that matters even more.</p>
      </div>
    </div>
  </div>
</section>

<section class="ch-sec" aria-labelledby="ch-book-h">
  <div class="ch-wrap ch-book">
    <div class="ch-cover-wrap" aria-hidden="true">
      <div class="ch-cover">
        <div><p class="ch-cover-title">Promoted</p><p class="ch-cover-sub">A field guide to your first year as a manager</p></div>
        <p class="ch-cover-author">Clara Holt</p>
      </div>
    </div>
    <div class="ch-book-copy">
      <p class="ch-kicker">The book</p>
      <h2 class="ch-h2" id="ch-book-h">Everything I wish someone had handed me <em>on day one.</em></h2>
      <p class="ch-intro"><i>Promoted</i> is 30 short chapters you can read on the train: scripts for hard conversations, templates for one-to-ones, and what to do when your first team member quits.</p>
      <blockquote>
        <p>“The most useful management book I've read in a decade, and the shortest.”</p>
        <footer>Workplace Weekly</footer>
      </blockquote>
      <ul class="ch-formats"><li>Hardback</li><li>Ebook</li><li>Audiobook, read by Clara</li></ul>
      <div class="ch-actions"><a class="ch-btn ch-btn-soft" href="/join">Read the first chapter free</a></div>
    </div>
  </div>
</section>

<section class="ch-sec ch-tint" aria-labelledby="ch-mail-h">
  <div class="ch-wrap">
    <div class="ch-head">
      <p class="ch-kicker">Reader mail</p>
      <h2 class="ch-h2" id="ch-mail-h">Notes from people <em>six months in.</em></h2>
    </div>
    <div class="ch-cards">
      <figure class="ch-postcard"><blockquote><p>“I stopped rewriting my team's work at midnight. My team got better and I got my evenings back.”</p></blockquote><figcaption><b>Priya N.</b>Design lead, first-time manager</figcaption></figure>
      <figure class="ch-postcard"><blockquote><p>“The cohort gave me eleven people going through exactly the same thing. We still have a group chat.”</p></blockquote><figcaption><b>Marcus D.</b>Engineering manager, First 90 Cohort</figcaption></figure>
      <figure class="ch-postcard"><blockquote><p>“Clara helped me manage my former peers without losing them as friends. I didn't think that was possible.”</p></blockquote><figcaption><b>Jenna R.</b>Head of support, coaching client</figcaption></figure>
    </div>
  </div>
</section>
${CALL_HTML}
</main>
${FOOTER_HTML}
</div>`;

const WORK_HTML = `
<div class="ch-page">
<nav aria-label="Main"></nav>
<header class="ch-phead">
  <div class="ch-wrap">
    <p class="ch-kicker">Work with me</p>
    <h1>Three ways to get better at managing, <em>faster.</em></h1>
    <p class="ch-intro">Every option is built on the same habits I teach in the Monday Letter. The difference is how much structure and support you want around them.</p>
    <ul class="ch-pills" aria-label="Jump to an option">
      <li><a href="#coaching">1:1 coaching</a></li>
      <li><a href="#cohort">First 90 Cohort</a></li>
      <li><a href="#workshops">Team workshops</a></li>
    </ul>
  </div>
</header>

<main>
<section class="ch-sec ch-tint" aria-label="Choose your path">
  <div class="ch-wrap">
    <div class="ch-flow">
      <p class="ch-flow-q">What do you need most right now?</p>
      <article class="ch-path"><p class="ch-path-if">“Ideas I can try this week.”</p><h2>The Monday Letter</h2><p>Free, weekly and practical. The best place to start.</p><a class="ch-link" href="/join">Subscribe free</a></article>
      <article class="ch-path"><p class="ch-path-if">“A structure, and people in the same boat.”</p><h2>First 90 Cohort</h2><p>Six live weeks with twenty new managers.</p><a class="ch-link" href="#cohort">See the syllabus</a></article>
      <article class="ch-path"><p class="ch-path-if">“Someone in my corner, for my situation.”</p><h2>1:1 coaching</h2><p>Three months of coaching, tailored to you.</p><a class="ch-link" href="#coaching">How coaching works</a></article>
    </div>
  </div>
</section>

<section class="ch-sec" id="coaching" aria-labelledby="ch-coach-h">
  <div class="ch-wrap ch-offer">
    <div class="ch-offer-copy">
      <p class="ch-kicker">1:1 coaching</p>
      <h2 id="ch-coach-h">Three months, one coach, <em>your actual problems.</em></h2>
      <p>We meet every week for the first month and every fortnight after that. Between calls you can message me when something comes up, which it will.</p>
      <h3>What's included</h3>
      <ul class="ch-incl">
        <li>12 video sessions of 50 minutes</li>
        <li>Message support on weekdays, replies within one working day</li>
        <li>A written first-year plan, reviewed at the end</li>
        <li>Scripts and templates for the conversations you're dreading</li>
        <li>An optional three-way session with your own manager</li>
      </ul>
    </div>
    <div class="ch-offer-side">
    <figure class="ch-coach-fig"><img src="/media/generated/personal-clara-chair.webp" alt="Clara smiling, sitting in a wicker chair beside a houseplant" width="640" height="640" loading="lazy"></figure>
    <aside class="ch-price" aria-label="Coaching prices">
      <p class="ch-price-label">Choose how to pay</p>
      <div class="ch-price-opts">
        <div class="ch-price-opt is-main"><b>$2,400</b><span>Self-funded, or 3 payments of $820</span></div>
        <div class="ch-price-opt"><b>$3,200</b><span>Company-funded, with a progress summary for your manager</span></div>
      </div>
      <a class="ch-btn ch-btn-plum" href="/book">Book a free intro call</a>
      <p class="ch-price-note">2 places open for January</p>
    </aside>
    </div>
  </div>
</section>

<section class="ch-sec ch-tint" id="cohort" aria-labelledby="ch-cohort-h">
  <div class="ch-wrap">
    <div class="ch-head">
      <p class="ch-kicker">First 90 Cohort</p>
      <h2 class="ch-h2" id="ch-cohort-h">Six weeks. Twenty managers. <em>One playbook.</em></h2>
      <p class="ch-intro">A live group course for people in their first year of managing. Each week is a 90-minute session, a short exercise and a small peer group that meets between sessions.</p>
    </div>
    <ol class="ch-weeks">
      <li><b>Your new job description</b><span>What changes, what you stop doing and how to tell if it's working.</span></li>
      <li><b>One-to-ones that matter</b><span>The agenda, the questions and the follow-through.</span></li>
      <li><b>Feedback without the dread</b><span>Giving it clearly, asking for it often, and the scripts to do both.</span></li>
      <li><b>Delegating without disappearing</b><span>Handing work over without dropping it or hovering over it.</span></li>
      <li><b>Managing former peers, and up</b><span>New boundaries with old friends; getting what you need from your boss.</span></li>
      <li><b>Your first-year plan</b><span>Goals, rituals and a plan to keep growing after the course ends.</span></li>
    </ol>
    <dl class="ch-cohort-facts">
      <div><dt>Next cohort</dt><dd>Jan 12 – Feb 16, 2027</dd></div>
      <div><dt>Sessions</dt><dd>Tuesdays, 12:00 ET</dd></div>
      <div><dt>Group size</dt><dd>20 managers</dd></div>
      <div><dt>Price</dt><dd>$690 · expensable</dd></div>
    </dl>
    <div class="ch-actions"><a class="ch-btn ch-btn-plum" href="/book">Ask about the cohort</a><a class="ch-btn ch-btn-soft" href="/join">Get notified of new dates</a></div>
  </div>
</section>

<section class="ch-sec" id="workshops" aria-labelledby="ch-work-h">
  <div class="ch-wrap">
    <div class="ch-head">
      <p class="ch-kicker">Team workshops</p>
      <h2 class="ch-h2" id="ch-work-h">For companies promoting <em>a lot of new managers at once.</em></h2>
      <p class="ch-intro">Live workshops for groups of 8 to 30, remote or in person, built around your company's own examples.</p>
    </div>
    <div class="ch-formats-grid">
      <article class="ch-format"><h3>Feedback that lands</h3><p>A practical half-day on giving and asking for feedback, with lots of practice.</p><dl><div><dt>Length</dt><dd>Half day</dd></div><div><dt>Group</dt><dd>Up to 30</dd></div><div><dt>From</dt><dd>$4,500</dd></div></dl></article>
      <article class="ch-format"><h3>New Manager Bootcamp</h3><p>A full day covering one-to-ones, delegation, feedback and the first-year plan.</p><dl><div><dt>Length</dt><dd>Full day</dd></div><div><dt>Group</dt><dd>Up to 24</dd></div><div><dt>From</dt><dd>$8,500</dd></div></dl></article>
      <article class="ch-format"><h3>Manager circles</h3><p>Monthly facilitated peer groups that keep new habits going after training ends.</p><dl><div><dt>Length</dt><dd>6 months</dd></div><div><dt>Group</dt><dd>6 to 8 each</dd></div><div><dt>From</dt><dd>$1,200 / month</dd></div></dl></article>
    </div>
    <p class="ch-clients">Recent workshops for Parcelly, Quayside Health, Lumen &amp; Co and the City of Somerville.</p>
  </div>
</section>

<section class="ch-sec ch-tint" aria-labelledby="ch-qa-h">
  <div class="ch-wrap">
    <div class="ch-head"><p class="ch-kicker">Questions</p><h2 class="ch-h2" id="ch-qa-h">Things people ask <em>before we start.</em></h2></div>
    <div class="ch-qa">
      <article class="ch-q"><h3>Can my company pay for this?</h3><p>Usually, yes. Most clients pay through a training or development budget. I can send an invoice, a short proposal for your manager and, for coaching, a progress summary at the end.</p></article>
      <article class="ch-q"><h3>I've been managing for three years. Is it too late?</h3><p>Not at all. About a third of my clients have managed for a while and want to fix habits they picked up in a hurry.</p></article>
      <article class="ch-q"><h3>Is coaching confidential?</h3><p>Completely. Even when your company pays, what we discuss stays between us. Any summary for your manager is written with you and only shared with your agreement.</p></article>
      <article class="ch-q"><h3>What if we're not a good fit?</h3><p>The intro call exists to find out. If coaching isn't right for you, I'll say so and suggest something that is, often for free.</p></article>
      <article class="ch-q"><h3>Do you work outside the US?</h3><p>Yes, all sessions are on video. I have clients from Lisbon to Melbourne; we just find a time that works.</p></article>
      <article class="ch-q"><h3>What happens after three months?</h3><p>Most people finish there, plan in hand. Some continue monthly for a while; there's never an automatic renewal.</p></article>
    </div>
  </div>
</section>
${CALL_HTML}
</main>
${FOOTER_HTML}
</div>`;

const ABOUT_HTML = `
<div class="ch-page">
<nav aria-label="Main"></nav>
<header class="ch-ahead">
  <div class="ch-wrap ch-ahead-grid">
    <div class="ch-ahead-copy">
      <p class="ch-kicker">About Clara</p>
      <h1>Hi, I'm Clara. I was <em>a terrible manager</em> first.</h1>
      <p>I don't say that to be modest. In my first year I micromanaged, avoided every difficult conversation and lost two excellent engineers. I thought I was just bad at it.</p>
      <p>It turned out I was untrained. Once I learned a handful of simple habits, managing became the best part of my job. Now I teach those habits to people who are where I was.</p>
    </div>
    <figure class="ch-ahead-fig"><img src="/media/generated/personal-clara-shelf.webp" alt="Clara standing by a wooden bookshelf, looking out of the frame" width="560" height="700"></figure>
  </div>
</header>

<main>
<section class="ch-sec ch-tint" aria-labelledby="ch-story-h">
  <div class="ch-wrap">
    <div class="ch-head"><p class="ch-kicker">How I got here</p><h2 class="ch-h2" id="ch-story-h">A career of learning things <em>the hard way.</em></h2></div>
    <ol class="ch-chapters">
      <li class="ch-chap"><span class="ch-chap-year">2012</span><h3>Promoted, overnight</h3><p>Software engineer to team lead at 27, managing six former teammates. It did not go well.</p></li>
      <li class="ch-chap"><span class="ch-chap-year">2014</span><h3>Found a coach</h3><p>A patient coach and a few simple habits turned my team, and my weekends, around.</p></li>
      <li class="ch-chap"><span class="ch-chap-year">2017</span><h3>Led a team of 60</h3><p>Director of engineering at a health-tech scale-up, hiring and training 14 new managers.</p></li>
      <li class="ch-chap"><span class="ch-chap-year">2021</span><h3>Went independent</h3><p>Started coaching full time and sent the first Monday Letter to 212 people.</p></li>
      <li class="ch-chap"><span class="ch-chap-year">2025</span><h3>Wrote the book</h3><p><i>Promoted</i> came out in March and is now in its fourth printing.</p></li>
    </ol>
  </div>
</section>

<section class="ch-sec" aria-labelledby="ch-bel-h">
  <div class="ch-wrap">
    <div class="ch-head"><p class="ch-kicker">What I believe</p><h2 class="ch-h2" id="ch-bel-h">Six things I've learned <em>about managing.</em></h2></div>
    <ol class="ch-beliefs">
      <li class="ch-belief"><b>Managing is a skill, not a personality.</b><span>Anyone who can learn a new tool can learn to run a good one-to-one.</span></li>
      <li class="ch-belief"><b>Your calendar is your strategy.</b><span>If it isn't in the calendar, it isn't a priority, whatever the slide says.</span></li>
      <li class="ch-belief"><b>Clear is kind.</b><span>Vague feedback feels gentler for you and is much harder on them.</span></li>
      <li class="ch-belief"><b>Small rituals beat big plans.</b><span>A weekly ten-minute habit changes more than a quarterly offsite.</span></li>
      <li class="ch-belief"><b>You can't do their job anymore.</b><span>Every hour you spend doing the work is an hour nobody spends leading.</span></li>
      <li class="ch-belief"><b>It gets easier.</b><span>Most people find their feet within six months, and many find they love it.</span></li>
    </ol>
  </div>
</section>

<div class="ch-wrap">
  <figure class="ch-wide"><img src="/media/generated/personal-clara-wall.webp" alt="Clara smiling with arms folded in front of a long red brick wall" width="960" height="480" loading="lazy"><figcaption>Somerville, where most Monday Letters get written.</figcaption></figure>
</div>

<section class="ch-sec" aria-labelledby="ch-press-h">
  <div class="ch-wrap">
    <div class="ch-head"><p class="ch-kicker">Talks and interviews</p><h2 class="ch-h2" id="ch-press-h">Where I've been <em>talking about this.</em></h2></div>
    <div class="ch-press-grid">
    <figure class="ch-press-fig"><img src="/media/generated/personal-clara-reading.webp" alt="Clara in glasses reading a book in a leather armchair" width="560" height="700" loading="lazy"></figure>
    <ul class="ch-press">
      <li><span class="ch-chip">Podcast</span><b>The Operator Podcast: "Your first 90 days as a manager"</b><span>48 min · 2026</span></li>
      <li><span class="ch-chip">Talk</span><b>LeadDev Boston: "Stop doing everyone's job"</b><span>25 min · 2026</span></li>
      <li><span class="ch-chip">Article</span><b>Workplace Weekly: "The one-to-one question that changed my team"</b><span>6 min read · 2025</span></li>
      <li><span class="ch-chip">Podcast</span><b>Management Matters: "Managing your former peers"</b><span>41 min · 2025</span></li>
    </ul>
    </div>
  </div>
</section>

<section class="ch-sec ch-tint" aria-labelledby="ch-notes-h">
  <div class="ch-wrap">
    <div class="ch-head"><p class="ch-kicker">Off the clock</p><h2 class="ch-h2" id="ch-notes-h">A few things <em>that aren't about work.</em></h2></div>
    <ul class="ch-notes">
      <li class="ch-note"><small>Currently reading</small><p>Anything by Ann Patchett, twice.</p></li>
      <li class="ch-note"><small>Coffee order</small><p>Oat flat white, too many.</p></li>
      <li class="ch-note"><small>Weekends</small><p>Two kids, one allotment, zero emails.</p></li>
      <li class="ch-note"><small>Secret skill</small><p>Can name every Red Sox shortstop since 1990.</p></li>
    </ul>
  </div>
</section>
${CALL_HTML}
</main>
${FOOTER_HTML}
</div>`;

const template: StarterTemplate = {
  id: "original-personal",
  name: "Clara Holt",
  tagline: "Coach and writer personal brand with offer tickets, a newsletter preview, a CSS book, reader mail, and call booking",
  category: "personal",
  tags: ["personal", "coach", "coaching", "creator", "newsletter", "personal brand", "author", "speaker", "course", "booking"],
  source: "original",
  modules: ["newsletter", "bookings"],
  theme: {
    name: "Clara Holt",
    mode: "light",
    primary: "#6b2d5c",
    primary2: "#521f46",
    accent: "#e3a336",
    bg: "#fbf6f0",
    surface: "#fffdfa",
    surface2: "#f3e9df",
    border: "#e5d6c8",
    text: "#2a1b26",
    textMuted: "#6a5a64",
    font: `"Karla", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    fontDisplay: `"Fraunces", Georgia, "Times New Roman", serif`,
    googleFonts: ["Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500", "Karla:wght@400;500;600;700"],
    radius: "22px",
    radiusSm: "12px",
    dark: {
      name: "Clara Holt Evening",
      mode: "dark",
      primary: "#d98fc6",
      primary2: "#e7abd8",
      accent: "#8a5a12",
      bg: "#1a1219",
      surface: "#231922",
      surface2: "#2c212b",
      border: "#3f313d",
      text: "#f6ece9",
      textMuted: "#c0aeb9",
      font: `"Karla", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      fontDisplay: `"Fraunces", Georgia, "Times New Roman", serif`,
      googleFonts: ["Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500", "Karla:wght@400;500;600;700"],
      radius: "22px",
      radiusSm: "12px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: BASE_CSS + NAV_CSS + HOME_CSS },
    { title: "Work with me", slug: "work-with-me", isHome: false, html: WORK_HTML, css: BASE_CSS + NAV_CSS + WORK_CSS },
    { title: "About", slug: "about", isHome: false, html: ABOUT_HTML, css: BASE_CSS + NAV_CSS + ABOUT_CSS },
  ],
};

registerTemplate(template);
export default template;
