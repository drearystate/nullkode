/**
 * Millworks School — Education flagship (original-education)
 *
 * Art direction
 * - Mood: bright, practical, encouraging. An evening school in Manchester that teaches
 *   working adults data, design and code in small live classes.
 * - Type: Bricolage Grotesque (expressive, optical sizes) for display, Figtree for text.
 * - Palette: cobalt #2340c9 and sunflower #f5b700 on warm notebook paper #fbf8f1,
 *   ink #16182c. Course families are coded with cobalt, sunflower, ink and a cobalt tint.
 * - Layout grammar: dot-grid paper, rounded index cards with coloured tabs, sticker
 *   labels, marker-pen highlights, timetables instead of feature grids.
 * - Signature: the "next cohorts" board with seats-left meters, the course index cards
 *   (duration, schedule, format, price, next start) and "A week at Millworks" timetable.
 * - Pages: Home, Courses (full catalogue with week-by-week outlines and term dates),
 *   Admissions (steps, fees and instalments, scholarships, FAQ).
 * - Modules: events (open evenings) and bookings (admissions calls).
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";

const IMG = "/templates/originals/original-education";

/* ── Shared CSS ─────────────────────────────────────────────────────── */
const BASE_CSS = `
.mw-page{font-size:1.04rem;line-height:1.6}
.mw-wrap{width:min(1180px,100% - 40px);margin-inline:auto}
.mw-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.mw-dots{background-image:radial-gradient(color-mix(in srgb,var(--nk-text) 16%,transparent) 1.2px,transparent 1.3px);background-size:22px 22px;background-color:var(--nk-bg)}
.mw-sticker{display:inline-flex;align-items:center;gap:8px;margin:0 0 20px;padding:6px 14px;border-radius:999px;background:var(--nk-accent);color:var(--nk-text);font-weight:700;font-size:.85rem;transform:rotate(-2deg);box-shadow:3px 3px 0 var(--nk-text)}
.mw-label{margin:0 0 14px;font-size:.82rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-primary)}
.mw-h2{margin:0;font-size:clamp(2.1rem,4.4vw,3.4rem);line-height:1.04;letter-spacing:-.035em;font-weight:800;text-wrap:balance}
.mw-intro{margin:18px 0 0;max-width:58ch;color:var(--nk-text-muted);font-size:1.12rem}
.mw-mark{background-image:linear-gradient(transparent 58%,color-mix(in srgb,var(--nk-accent) 80%,transparent) 58%,color-mix(in srgb,var(--nk-accent) 80%,transparent) 92%,transparent 92%);padding:0 .08em}
.mw-sec{padding:clamp(64px,9vw,112px) 0}
.mw-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:20px 48px;margin-bottom:clamp(36px,5vw,56px)}
.mw-head>div{max-width:720px}
.mw-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 24px;border-radius:14px;font-weight:700;font-size:1rem;text-decoration:none;border:2px solid var(--nk-text);transition:transform .15s,box-shadow .15s,background-color .2s}
.mw-btn:hover{text-decoration:none;transform:translate(-2px,-2px);box-shadow:4px 4px 0 var(--nk-text)}
.mw-btn-primary{background:var(--nk-primary);color:var(--nk-surface)}
.mw-btn-primary:hover{color:var(--nk-surface)}
.mw-btn-light{background:var(--nk-surface);color:var(--nk-text)}
.mw-btn-light:hover{color:var(--nk-text)}
.mw-btn-sun{background:var(--nk-accent);color:var(--nk-text)}
.mw-btn-sun:hover{color:var(--nk-text)}
.mw-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:32px}
.mw-link{font-weight:700;color:var(--nk-primary);text-decoration-line:underline;text-decoration-thickness:2px;text-underline-offset:5px}
.mw-link:hover{color:var(--nk-primary-2)}
.mw-page a:focus-visible,.mw-page summary:focus-visible,.mw-page [tabindex]:focus-visible,.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px;border-radius:8px}
.mw-tab-cobalt{--mw-tab:var(--nk-primary)}
.mw-tab-sun{--mw-tab:var(--nk-accent)}
.mw-tab-ink{--mw-tab:var(--nk-text)}
.mw-tab-tint{--mw-tab:color-mix(in srgb,var(--nk-primary) 45%,var(--nk-surface))}
`;

const NAV_CSS = `
.nk-nav{padding-block:16px!important;background:var(--nk-bg)!important;border-bottom:2px solid var(--nk-text)!important;position:relative;z-index:20}
.nk-nav>.container{max-width:1180px}
.nk-nav .navbar-brand{display:inline-flex;align-items:center;gap:10px;font-weight:800!important;font-size:1.25rem;letter-spacing:-.03em;color:var(--nk-text)!important}
.nk-nav .navbar-brand::before{content:"";width:30px;height:30px;flex:none;border-radius:9px;border:2px solid var(--nk-text);background-image:linear-gradient(135deg,var(--nk-primary) 0 50%,var(--nk-accent) 50% 100%)}
.nk-nav .nav-link{color:var(--nk-text)!important;font-weight:600!important;font-size:.98rem;padding:8px 14px!important;border-radius:10px}
.nk-nav .nav-link:hover{background:color-mix(in srgb,var(--nk-accent) 30%,transparent);text-decoration:none}
.nk-nav .nav-link.active{background:var(--nk-accent)}
.nk-nav .btn{background:var(--nk-primary)!important;color:var(--nk-surface)!important;border:2px solid var(--nk-text)!important;border-radius:10px!important;font-weight:700}
.nk-nav .navbar-toggler{color:var(--nk-text)!important;padding:0!important;width:48px;height:44px;border-radius:12px!important;border:2px solid var(--nk-text)!important;background-color:var(--nk-surface)!important;font-size:0;line-height:0;background-image:linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor);background-size:20px 2.5px;background-position:center 13px,center 19.5px,center 26px;background-repeat:no-repeat}
.nk-nav .navbar-toggler>*{display:none!important}
.nk-nav .dropdown-menu{border-radius:14px;padding:8px;background:var(--nk-surface)!important;border:2px solid var(--nk-text)!important;box-shadow:5px 5px 0 var(--nk-text)}
.nk-nav .dropdown-item{border-radius:10px;padding:9px 14px;color:var(--nk-text)!important;font-weight:500}
.nk-nav .dropdown-item:hover,.nk-nav .dropdown-item:focus{background:color-mix(in srgb,var(--nk-accent) 30%,transparent)}
@media (min-width:992px){.nk-nav .dropdown{position:relative}.nk-nav .dropdown-menu-end{right:0;left:auto}}
@media (max-width:991.98px){.nk-nav .navbar-collapse{margin-top:14px;padding:10px;border-radius:16px;background:var(--nk-surface);border:2px solid var(--nk-text)}.nk-nav .nav-link{padding:12px 14px!important}}
`;

const CTA_FOOTER_CSS = `
.mw-cta{padding:clamp(56px,8vw,96px) 0}
.mw-sec:not(.mw-dates) + .mw-cta{padding-top:0}
.mw-cta-card{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:28px 48px;align-items:center;padding:clamp(28px,5vw,56px);border-radius:28px;border:2px solid var(--nk-text);background:var(--nk-primary);color:var(--nk-surface);box-shadow:8px 8px 0 var(--nk-text)}
.mw-cta-card h2{margin:0;color:var(--nk-surface);font-size:clamp(2rem,4vw,3rem);line-height:1.05;letter-spacing:-.035em;font-weight:800;text-wrap:balance}
.mw-cta-card p{margin:14px 0 0;color:color-mix(in srgb,var(--nk-surface) 84%,var(--nk-primary));font-size:1.1rem}
.mw-cta-card .mw-actions{margin-top:0;justify-content:flex-end}
.mw-cta-card a:focus-visible{outline-color:var(--nk-surface)}
@media (max-width:860px){.mw-cta-card{grid-template-columns:minmax(0,1fr)}.mw-cta-card .mw-actions{justify-content:flex-start}}
.mw-footer{padding:56px 0 28px;background:var(--nk-text);color:color-mix(in srgb,var(--nk-surface) 76%,var(--nk-text));font-size:.95rem}
.mw-foot-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:32px}
.mw-foot-brand{display:flex;align-items:center;gap:10px;margin:0 0 12px;font-family:var(--nk-font-display);font-weight:800;font-size:1.35rem;letter-spacing:-.03em;color:var(--nk-surface)}
.mw-foot-brand::before{content:"";width:26px;height:26px;border-radius:8px;border:2px solid var(--nk-surface);background-image:linear-gradient(135deg,var(--nk-primary) 0 50%,var(--nk-accent) 50% 100%)}
.mw-foot-grid address{font-style:normal;margin:0;line-height:1.7}
.mw-foot-h{margin:6px 0 14px;font-size:.78rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-accent)}
.mw-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.mw-footer a{color:color-mix(in srgb,var(--nk-surface) 76%,var(--nk-text));text-decoration:none}
.mw-footer a:hover{color:var(--nk-surface);text-decoration:underline}
.mw-footer a:focus-visible{outline-color:var(--nk-accent)}
.mw-foot-base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;margin-top:44px;padding-top:22px;border-top:1px solid color-mix(in srgb,var(--nk-surface) 18%,transparent);font-size:.85rem}
.mw-foot-base p{margin:0}
@media (max-width:860px){.mw-foot-grid{grid-template-columns:1fr 1fr}}
@media (max-width:460px){.mw-foot-grid{grid-template-columns:minmax(0,1fr)}}
`;

const PAGE_HEAD_CSS = `
.mw-phead{padding:clamp(48px,7vw,88px) 0 clamp(40px,5vw,64px);border-bottom:2px solid var(--nk-text)}
.mw-phead h1{margin:0;max-width:16ch;font-size:clamp(2.6rem,6vw,4.6rem);line-height:1;letter-spacing:-.045em;font-weight:800;text-wrap:balance}
.mw-chips{list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin:28px 0 0;padding:0}
.mw-chips a{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;border:2px solid var(--nk-text);background:var(--nk-surface);color:var(--nk-text);font-weight:600;text-decoration:none}
.mw-chips a::before{content:"";width:12px;height:12px;border-radius:4px;background:var(--mw-tab)}
.mw-chips a:hover{background:color-mix(in srgb,var(--nk-accent) 30%,var(--nk-surface));text-decoration:none}
`;

/* Price and table styles shared by several pages */
const SHARED_CSS = `
.mw-price{margin:0;font-family:var(--nk-font-display);font-weight:800;font-size:1.8rem;letter-spacing:-.03em;line-height:1}
.mw-price small{display:block;margin-top:4px;font-family:var(--nk-font);font-weight:500;font-size:.8rem;letter-spacing:0;color:var(--nk-text-muted)}
.mw-table-wrap{overflow-x:auto;position:relative;border-radius:20px;border:2px solid var(--nk-text);background:var(--nk-bg)}
.mw-table{width:100%;min-width:720px;border-collapse:collapse;margin:0}
.mw-table th,.mw-table td{padding:15px 18px;border-bottom:1px dashed var(--nk-border);text-align:left;vertical-align:middle}
.mw-table thead th{background:var(--nk-text);color:var(--nk-surface);font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-bottom:0}
.mw-table tbody tr:last-child>*{border-bottom:0}
.mw-table th[scope="row"]{font-weight:700}
.mw-pill{display:inline-block;padding:3px 10px;border-radius:999px;border:2px solid var(--nk-text);font-size:.8rem;font-weight:700;white-space:nowrap}
.mw-pill-open{background:var(--nk-accent)}
.mw-pill-few{background:var(--nk-primary);color:var(--nk-surface)}
.mw-pill-full{background:var(--nk-surface-2);color:var(--nk-text-muted);border-color:var(--nk-border)}
`;

/* ── Home ───────────────────────────────────────────────────────────── */
const HOME_CSS = `
.mw-hero{padding:clamp(40px,6vw,80px) 0 clamp(56px,7vw,96px);border-bottom:2px solid var(--nk-text)}
.mw-hero-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:48px 64px;align-items:center}
.mw-hero h1{margin:0;font-size:clamp(2.6rem,5.4vw,4.6rem);line-height:1;letter-spacing:-.045em;font-weight:800;text-wrap:balance}
.mw-lede{margin:24px 0 0;max-width:54ch;font-size:1.18rem;color:var(--nk-text-muted)}
.mw-proof{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin:26px 0 0;font-size:.95rem;color:var(--nk-text-muted)}
.mw-proof b{color:var(--nk-text)}
.mw-stars{color:var(--nk-primary);letter-spacing:2px}
.mw-hero-visual{position:relative;padding-bottom:120px}
.mw-hero-photo{margin:0;border-radius:24px;overflow:hidden;border:2px solid var(--nk-text);box-shadow:8px 8px 0 var(--nk-text)}
.mw-hero-photo img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}
.mw-board{position:absolute;left:-28px;right:40px;bottom:0;padding:18px 20px;border-radius:20px;background:var(--nk-surface);border:2px solid var(--nk-text);box-shadow:6px 6px 0 var(--nk-text)}
.mw-board-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 0 10px;font-weight:800;font-family:var(--nk-font-display);font-size:1.05rem}
.mw-board-title span{font-family:var(--nk-font);font-weight:600;font-size:.8rem;color:var(--nk-text-muted)}
.mw-board ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.mw-board li{display:grid;grid-template-columns:10px minmax(0,1fr) auto 110px;gap:12px;align-items:center;font-size:.92rem}
.mw-board li::before{content:"";width:10px;height:10px;border-radius:3px;background:var(--mw-tab)}
.mw-board b{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mw-board time{color:var(--nk-text-muted);white-space:nowrap}
.mw-seats{display:grid;gap:3px;font-size:.75rem;font-weight:600;color:var(--nk-text-muted);text-align:right}
.mw-seats i{display:block;height:6px;border-radius:99px;background:var(--nk-surface-2);overflow:hidden}
.mw-seats i::after{content:"";display:block;height:100%;width:var(--mw-fill);border-radius:99px;background:var(--nk-primary)}
.mw-f33{--mw-fill:33%}.mw-f58{--mw-fill:58%}.mw-f75{--mw-fill:75%}.mw-f92{--mw-fill:92%}
@media (max-width:960px){.mw-hero-grid{grid-template-columns:minmax(0,1fr)}.mw-hero-visual{max-width:640px}.mw-board{left:16px;right:16px}}
@media (max-width:520px){.mw-hero-visual{padding-bottom:0}.mw-board{position:relative;left:auto;right:auto;margin:-40px 10px 0}.mw-board li{grid-template-columns:10px minmax(0,1fr) 84px}.mw-board time{display:none}}
.mw-grads{padding:28px 0;border-bottom:2px solid var(--nk-text);background:var(--nk-surface)}
.mw-grads-inner{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px 40px}
.mw-grads p{margin:0;font-weight:600;color:var(--nk-text-muted)}
.mw-grads ul{list-style:none;display:flex;flex-wrap:wrap;gap:12px 36px;margin:0;padding:0}
.mw-grads li{font-family:var(--nk-font-display);font-weight:700;font-size:1.25rem;letter-spacing:-.02em;color:color-mix(in srgb,var(--nk-text) 70%,var(--nk-bg))}
.mw-courses{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.mw-course{display:flex;flex-direction:column;position:relative;padding:26px 24px 22px;border-radius:20px;background:var(--nk-surface);border:2px solid var(--nk-text);border-top-width:14px;border-top-color:var(--mw-tab);transition:transform .15s,box-shadow .15s}
.mw-course:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--nk-text)}
.mw-course-cat{margin:0;font-size:.78rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-text-muted)}
.mw-course h3{margin:8px 0 0;font-size:1.45rem;line-height:1.15;letter-spacing:-.025em;font-weight:800}
.mw-course h3 a{color:var(--nk-text);text-decoration:none}
.mw-course h3 a::after{content:"";position:absolute;inset:0;border-radius:18px}
.mw-course-sum{margin:10px 0 0;color:var(--nk-text-muted);font-size:.97rem}
.mw-meta{margin:18px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;padding:16px 0;border-top:2px dashed var(--nk-border);border-bottom:2px dashed var(--nk-border)}
.mw-meta div{display:grid;gap:1px}
.mw-meta dt{font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--nk-text-muted)}
.mw-meta dd{margin:0;font-weight:600;font-size:.95rem}
.mw-course-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-top:auto;padding-top:16px}
.mw-next{margin:0;padding:6px 10px;border-radius:10px;background:var(--nk-surface-2);font-size:.82rem;font-weight:600;text-align:right}
@media (max-width:1000px){.mw-courses{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.mw-courses{grid-template-columns:minmax(0,1fr)}}
.mw-week{background:var(--nk-surface);border-block:2px solid var(--nk-text)}
.mw-tt-wrap{overflow-x:auto;position:relative;border-radius:22px;border:2px solid var(--nk-text);background:var(--nk-bg)}
.mw-tt{display:grid;grid-template-columns:72px repeat(7,minmax(112px,1fr));grid-template-rows:44px repeat(5,64px);min-width:900px}
.mw-tt-day{grid-row:1;display:grid;place-items:center;font-weight:800;font-family:var(--nk-font-display);border-bottom:2px solid var(--nk-text);border-left:1px solid var(--nk-border);background:var(--nk-surface)}
.mw-tt-time{grid-column:1;display:flex;justify-content:flex-end;padding:6px 10px 0 0;font-size:.78rem;font-weight:600;color:var(--nk-text-muted);border-top:1px dashed var(--nk-border)}
.mw-tt-corner{grid-row:1;grid-column:1;border-bottom:2px solid var(--nk-text);background:var(--nk-surface)}
.mw-slot{margin:5px;padding:9px 11px;border-radius:12px;border:2px solid var(--nk-text);background:var(--mw-tab);color:var(--nk-text);font-size:.82rem;line-height:1.3;overflow:hidden}
.mw-slot b{display:block;font-weight:800}
.mw-slot-day{display:none;font-style:normal}
@media (max-width:640px){.mw-tt-wrap{overflow:visible;border:0;background:transparent}.mw-tt{display:flex;flex-direction:column;gap:10px;min-width:0}.mw-tt-day,.mw-tt-time,.mw-tt-corner{display:none}.mw-slot{display:grid;grid-template-columns:96px minmax(0,1fr);column-gap:12px;margin:0;padding:12px 14px;font-size:.92rem}.mw-slot-day{display:block;grid-row:span 2;font-weight:800}.mw-slot b{font-weight:700}}
.mw-slot.mw-tab-cobalt,.mw-slot.mw-tab-ink{color:var(--nk-surface)}
.mw-c2{grid-column:2}.mw-c3{grid-column:3}.mw-c4{grid-column:4}.mw-c5{grid-column:5}.mw-c6{grid-column:6}.mw-c7{grid-column:7}.mw-c8{grid-column:8}
.mw-r2{grid-row:2}.mw-r3{grid-row:3}.mw-r4{grid-row:4}.mw-r5{grid-row:5}.mw-r6{grid-row:6}
.mw-r2-4{grid-row:2/4}.mw-r4-6{grid-row:4/6}.mw-r5-7{grid-row:5/7}
.mw-tt-note{display:flex;flex-wrap:wrap;gap:8px 24px;margin:18px 0 0;color:var(--nk-text-muted);font-size:.92rem}
.mw-tt-note span{display:inline-flex;align-items:center;gap:8px}
.mw-tt-note i{width:14px;height:14px;border-radius:4px;border:2px solid var(--nk-text);background:var(--mw-tab)}
.mw-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.mw-stat{margin:0;padding:24px;border-radius:20px;border:2px solid var(--nk-text);background:var(--nk-surface)}
.mw-stat:nth-child(2){transform:rotate(1.2deg)}
.mw-stat:nth-child(3){transform:rotate(-1deg)}
.mw-stat dd{margin:0;font-family:var(--nk-font-display);font-weight:800;font-size:clamp(2.2rem,4vw,3.2rem);letter-spacing:-.04em;line-height:1}
.mw-stat dt{margin-top:10px;color:var(--nk-text-muted);font-weight:500}
.mw-stat{display:flex;flex-direction:column-reverse;justify-content:flex-end}
.mw-stat-hi{background:var(--nk-accent)}
.mw-stat-hi dt{color:var(--nk-text)}
.mw-stats-note{margin:20px 0 0;font-size:.88rem;color:var(--nk-text-muted)}
@media (max-width:900px){.mw-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:420px){.mw-stats{grid-template-columns:minmax(0,1fr)}}
.mw-people{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.mw-person{margin:0;padding:24px 20px;border-radius:20px;background:var(--nk-surface);border:2px solid var(--nk-text);text-align:center}
.mw-person img{display:block;width:112px;height:112px;margin:0 auto 18px;border-radius:50%;object-fit:cover;border:2px solid var(--nk-text);box-shadow:0 0 0 5px var(--nk-surface),0 0 0 9px var(--mw-tab)}
.mw-person h3{margin:0;font-size:1.2rem;font-weight:800;letter-spacing:-.02em}
.mw-person-teach{display:inline-block;margin-top:8px;padding:3px 10px;border-radius:999px;background:var(--nk-surface-2);font-size:.82rem;font-weight:700}
.mw-person p{margin:10px 0 0;font-size:.92rem;color:var(--nk-text-muted)}
@media (max-width:980px){.mw-people{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:460px){.mw-people{grid-template-columns:minmax(0,1fr)}}
.mw-story{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:40px 56px;align-items:center}
.mw-story-photo{margin:0;border-radius:24px;overflow:hidden;border:2px solid var(--nk-text);box-shadow:8px 8px 0 var(--nk-accent)}
.mw-story-photo img{display:block;width:100%;height:auto;aspect-ratio:2/1;object-fit:cover}
.mw-quote{margin:0}
.mw-quote p{margin:0;font-family:var(--nk-font-display);font-weight:700;font-size:clamp(1.5rem,2.6vw,2.1rem);line-height:1.2;letter-spacing:-.025em}
.mw-quote footer{margin-top:18px;color:var(--nk-text-muted)}
.mw-quote footer b{color:var(--nk-text)}
@media (max-width:900px){.mw-story{grid-template-columns:minmax(0,1fr)}}
.mw-pay{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;border:2px solid var(--nk-text);border-radius:22px;overflow:hidden;background:var(--nk-surface)}
.mw-pay div{padding:24px 22px}
.mw-pay div+div{border-left:2px dashed var(--nk-border)}
.mw-pay h3{margin:0;font-size:1.15rem;font-weight:800}
.mw-pay p{margin:8px 0 0;color:var(--nk-text-muted);font-size:.95rem}
.mw-pay b{display:block;margin-top:14px;font-family:var(--nk-font-display);font-size:1.4rem;letter-spacing:-.02em;color:var(--nk-primary)}
@media (max-width:900px){.mw-pay{grid-template-columns:repeat(2,minmax(0,1fr))}.mw-pay div:nth-child(3){border-left:0}.mw-pay div:nth-child(n+3){border-top:2px dashed var(--nk-border)}}
@media (max-width:480px){.mw-pay{grid-template-columns:minmax(0,1fr)}.mw-pay div+div{border-left:0;border-top:2px dashed var(--nk-border)}}
`;

/* ── Courses ────────────────────────────────────────────────────────── */
const COURSES_CSS = `
.mw-cdetail{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr) 300px;gap:32px 40px;padding:48px 0;border-bottom:2px dashed var(--nk-border);scroll-margin-top:16px}
.mw-cdetail:last-of-type{border-bottom:0}
.mw-cdetail h2{margin:6px 0 0;font-size:clamp(1.8rem,3vw,2.4rem);line-height:1.1;letter-spacing:-.03em;font-weight:800}
.mw-cdetail-cat{display:inline-flex;align-items:center;gap:8px;margin:0;font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-text-muted)}
.mw-cdetail-cat::before{content:"";width:14px;height:14px;border-radius:4px;border:2px solid var(--nk-text);background:var(--mw-tab)}
.mw-cdetail-main>p{margin:14px 0 0;color:var(--nk-text-muted)}
.mw-cdetail h3{margin:22px 0 10px;font-size:.8rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-family:var(--nk-font)}
.mw-build{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.mw-build li{display:flex;gap:10px}
.mw-build li::before{content:"✓";flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:7px;background:var(--nk-accent);color:var(--nk-text);font-size:.75rem;font-weight:800}
.mw-weeks{list-style:none;margin:0;padding:0;border-left:3px solid var(--mw-tab)}
.mw-weeks li{position:relative;padding:0 0 16px 20px}
.mw-weeks li::before{content:"";position:absolute;left:-8px;top:6px;width:13px;height:13px;border-radius:50%;background:var(--nk-surface);border:3px solid var(--nk-text)}
.mw-weeks b{display:block;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--nk-text-muted)}
.mw-facts{align-self:start;padding:22px;border-radius:20px;border:2px solid var(--nk-text);background:var(--nk-surface);box-shadow:5px 5px 0 var(--mw-tab)}
.mw-facts dl{margin:0;display:grid;gap:10px}
.mw-facts dl div{display:flex;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px dashed var(--nk-border)}
.mw-facts dt{color:var(--nk-text-muted);font-size:.92rem}
.mw-facts dd{margin:0;font-weight:700;text-align:right}
.mw-facts .mw-price{margin-top:16px}
.mw-facts .mw-btn{width:100%;margin-top:16px}
@media (max-width:1060px){.mw-cdetail{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.mw-facts{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:0 28px;align-items:end}.mw-facts .mw-price{margin-top:0}}
@media (max-width:680px){.mw-cdetail{grid-template-columns:minmax(0,1fr)}.mw-facts{display:block}.mw-facts .mw-price{margin-top:16px}}
.mw-dates{background:var(--nk-surface);border-block:2px solid var(--nk-text)}
.mw-course-pics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:40px}
.mw-course-pics figure{margin:0;border-radius:22px;overflow:hidden;border:2px solid var(--nk-text);position:relative}
.mw-course-pics img{display:block;width:100%;height:auto;aspect-ratio:9/8;object-fit:cover}
.mw-course-pics figcaption{position:absolute;left:14px;bottom:14px;padding:6px 12px;border-radius:10px;background:var(--nk-surface);border:2px solid var(--nk-text);font-weight:700;font-size:.9rem}
@media (max-width:640px){.mw-course-pics{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Admissions ─────────────────────────────────────────────────────── */
const ADMISSIONS_CSS = `
.mw-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;counter-reset:mwstep}
.mw-step{position:relative;padding:28px 22px 24px;border-radius:20px;border:2px solid var(--nk-text);background:var(--nk-surface);counter-increment:mwstep}
.mw-step::before{content:counter(mwstep);position:absolute;top:-18px;left:20px;display:grid;place-items:center;width:40px;height:40px;border-radius:12px;border:2px solid var(--nk-text);background:var(--nk-accent);font-family:var(--nk-font-display);font-weight:800;font-size:1.2rem}
.mw-step h3{margin:6px 0 0;font-size:1.2rem;font-weight:800}
.mw-step p{margin:8px 0 0;color:var(--nk-text-muted);font-size:.95rem}
.mw-step small{display:inline-block;margin-top:12px;padding:3px 10px;border-radius:999px;background:var(--nk-surface-2);font-weight:700;font-size:.8rem}
@media (max-width:980px){.mw-steps{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:34px}}
@media (max-width:520px){.mw-steps{grid-template-columns:minmax(0,1fr)}}
.mw-fees{background:var(--nk-surface);border-block:2px solid var(--nk-text)}
.mw-fund{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:32px}
.mw-fund article{padding:28px;border-radius:22px;border:2px solid var(--nk-text)}
.mw-fund h3{margin:0;font-size:1.5rem;font-weight:800;letter-spacing:-.02em}
.mw-fund p{margin:10px 0 0}
.mw-fund ul{margin:14px 0 0;padding-left:20px}
.mw-fund-sun{background:var(--nk-accent)}
.mw-fund-ink{background:var(--nk-text);color:var(--nk-surface)}
.mw-fund-ink h3{color:var(--nk-surface)}
.mw-fund-ink a{color:var(--nk-accent)}
.mw-fund-ink a:focus-visible{outline-color:var(--nk-accent)}
@media (max-width:820px){.mw-fund{grid-template-columns:minmax(0,1fr)}}
.mw-faq-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:32px 64px}
.mw-faq details{margin-bottom:12px;border-radius:16px;border:2px solid var(--nk-text);background:var(--nk-surface)}
.mw-faq summary{padding:18px 52px 18px 20px;font-weight:700;font-size:1.05rem}
.mw-faq summary::after{top:50%;right:14px;transform:translateY(-50%);color:var(--nk-primary)}
.mw-faq details p{margin:0;padding:0 20px 18px;color:var(--nk-text-muted)}
@media (max-width:860px){.mw-faq-grid{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Data ───────────────────────────────────────────────────────────── */
type Course = {
  id: string; tab: string; cat: string; title: string; sum: string; weeks: string; hours: string;
  days: string; format: string; price: string; next: string; seats: string; build: string[]; outline: [string, string][];
};
const COURSES: Course[] = [
  {
    id: "data-analysis", tab: "cobalt", cat: "Data", title: "Data Analysis with SQL & Python",
    sum: "Go from spreadsheets to answering real business questions with SQL, Python and clear charts.",
    weeks: "12 weeks", hours: "6 hrs / week", days: "Tue & Thu, 18:30", format: "Online or studio", price: "£2,400", next: "3 Nov", seats: "4 seats left",
    build: ["A sales dashboard from a messy real dataset", "An A/B test analysis written up for a manager", "A portfolio project on data you choose"],
    outline: [["Weeks 1–3", "SQL: querying, joining and cleaning"], ["Weeks 4–7", "Python and pandas for analysis"], ["Weeks 8–10", "Statistics you will actually use"], ["Weeks 11–12", "Final project and presentation"]],
  },
  {
    id: "ux-design", tab: "sun", cat: "Design", title: "UX & Product Design",
    sum: "Research, prototype and test products people understand, using the methods design teams use every day.",
    weeks: "10 weeks", hours: "6 hrs / week", days: "Mon & Wed, 18:30", format: "Studio + online", price: "£2,200", next: "10 Nov", seats: "7 seats left",
    build: ["A usability study with five real participants", "A clickable prototype for a mobile app", "A case study written for your portfolio"],
    outline: [["Weeks 1–2", "Research: interviews and journeys"], ["Weeks 3–5", "Wireframes, flows and prototypes"], ["Weeks 6–8", "Visual design and design systems"], ["Weeks 9–10", "Testing, iteration and case study"]],
  },
  {
    id: "front-end", tab: "ink", cat: "Code", title: "Front-end Development",
    sum: "Build fast, accessible websites with HTML, CSS and JavaScript, and ship them to the web.",
    weeks: "14 weeks", hours: "8 hrs / week", days: "Tue & Thu + Sat lab", format: "Online or studio", price: "£2,900", next: "17 Nov", seats: "2 seats left",
    build: ["A responsive site for a local business", "An interactive app using a public API", "A portfolio site you deploy yourself"],
    outline: [["Weeks 1–4", "HTML, CSS and responsive layout"], ["Weeks 5–9", "JavaScript and the browser"], ["Weeks 10–12", "Components, APIs and accessibility"], ["Weeks 13–14", "Deploy, review and demo day"]],
  },
  {
    id: "product", tab: "tint", cat: "Product", title: "Product Management",
    sum: "Learn to decide what to build next, write it down clearly and get a team to ship it.",
    weeks: "8 weeks", hours: "5 hrs / week", days: "Wed, 18:30 + 2 Saturdays", format: "Studio + online", price: "£1,850", next: "12 Nov", seats: "9 seats left",
    build: ["A product strategy for a real company", "A prioritised roadmap and a spec", "A launch plan with success metrics"],
    outline: [["Weeks 1–2", "Discovery and customer problems"], ["Weeks 3–4", "Strategy, roadmaps and trade-offs"], ["Weeks 5–6", "Specs, delivery and working with engineers"], ["Weeks 7–8", "Metrics, launch and stakeholder updates"]],
  },
  {
    id: "data-viz", tab: "cobalt", cat: "Data", title: "Data Visualisation",
    sum: "Turn numbers into charts and dashboards that people read, trust and act on.",
    weeks: "6 weeks", hours: "3 hrs / week", days: "Mon, 18:30", format: "Online", price: "£950", next: "2 Nov", seats: "5 seats left",
    build: ["A redesign of a misleading chart", "A one-page dashboard for a team", "A short data story for the web"],
    outline: [["Weeks 1–2", "Perception, chart choice and colour"], ["Weeks 3–4", "Dashboards people use"], ["Weeks 5–6", "Data stories and critique"]],
  },
  {
    id: "content-design", tab: "sun", cat: "Design", title: "Content Design",
    sum: "Write interfaces, help pages and emails that are clear the first time someone reads them.",
    weeks: "6 weeks", hours: "3 hrs / week", days: "Thu, 18:30", format: "Online", price: "£850", next: "14 Jan", seats: "12 seats left",
    build: ["A rewrite of a real sign-up flow", "A style guide for a small product", "Before-and-after results from a readability test"],
    outline: [["Weeks 1–2", "Writing for the way people read"], ["Weeks 3–4", "Interfaces, errors and microcopy"], ["Weeks 5–6", "Style guides and testing content"]],
  },
];

const courseCard = (c: Course) => `
      <article class="mw-course mw-tab-${c.tab}">
        <p class="mw-course-cat">${c.cat}</p>
        <h3><a href="/courses#${c.id}">${c.title.replace("&", "&amp;")}</a></h3>
        <p class="mw-course-sum">${c.sum}</p>
        <dl class="mw-meta">
          <div><dt>Length</dt><dd>${c.weeks}</dd></div>
          <div><dt>Time</dt><dd>${c.hours}</dd></div>
          <div><dt>When</dt><dd>${c.days.replace("&", "&amp;")}</dd></div>
          <div><dt>Where</dt><dd>${c.format}</dd></div>
        </dl>
        <div class="mw-course-foot">
          <p class="mw-price">${c.price}<small>or from £${Math.round(Number(c.price.replace(/[£,]/g, "")) / 6)} a month</small></p>
          <p class="mw-next">Starts ${c.next}</p>
        </div>
      </article>`;

const courseDetail = (c: Course) => `
  <section class="mw-cdetail mw-tab-${c.tab}" id="${c.id}" aria-labelledby="mw-${c.id}-h">
    <div class="mw-cdetail-main">
      <p class="mw-cdetail-cat">${c.cat}</p>
      <h2 id="mw-${c.id}-h">${c.title.replace("&", "&amp;")}</h2>
      <p>${c.sum}</p>
      <h3>What you will build</h3>
      <ul class="mw-build">${c.build.map((b) => `<li>${b}</li>`).join("")}</ul>
    </div>
    <div>
      <h3>Week by week</h3>
      <ol class="mw-weeks">${c.outline.map(([w, t]) => `<li><b>${w}</b>${t}</li>`).join("")}</ol>
    </div>
    <aside class="mw-facts" aria-label="${c.title.replace("&", "and")} at a glance">
      <dl>
        <div><dt>Length</dt><dd>${c.weeks}</dd></div>
        <div><dt>Commitment</dt><dd>${c.hours}</dd></div>
        <div><dt>Classes</dt><dd>${c.days.replace("&", "&amp;")}</dd></div>
        <div><dt>Format</dt><dd>${c.format}</dd></div>
        <div><dt>Next start</dt><dd>${c.next} · ${c.seats}</dd></div>
      </dl>
      <div>
        <p class="mw-price">${c.price}<small>or 6 payments of £${Math.round(Number(c.price.replace(/[£,]/g, "")) / 6)}, interest-free</small></p>
        <a class="mw-btn mw-btn-primary" href="/book">Book an admissions call</a>
      </div>
    </aside>
  </section>`;

/* ── Shared HTML ────────────────────────────────────────────────────── */
const CTA_HTML = `
<section class="mw-cta" aria-labelledby="mw-cta-h">
  <div class="mw-wrap">
    <div class="mw-cta-card">
      <div>
        <h2 id="mw-cta-h">Not sure which course is for you?</h2>
        <p>Come to a free open evening in the studio or online. Meet the instructors, try a 20-minute taster and ask anything.</p>
      </div>
      <div class="mw-actions">
        <a class="mw-btn mw-btn-sun" href="/events">See open evenings</a>
        <a class="mw-btn mw-btn-light" href="/book">Book an admissions call</a>
      </div>
    </div>
  </div>
</section>`;

const FOOTER_HTML = `
<footer class="mw-footer">
  <div class="mw-wrap">
    <div class="mw-foot-grid">
      <div>
        <p class="mw-foot-brand">Millworks</p>
        <address>Millworks School, Unit 4, Cotton Exchange Yard<br>Ancoats, Manchester M4 6DE</address>
      </div>
      <div>
        <p class="mw-foot-h">Learn</p>
        <ul>
          <li><a href="/courses">All courses</a></li>
          <li><a href="/courses#dates">Term dates</a></li>
          <li><a href="/events">Open evenings</a></li>
        </ul>
      </div>
      <div>
        <p class="mw-foot-h">Join</p>
        <ul>
          <li><a href="/admissions">Admissions</a></li>
          <li><a href="/admissions#fees">Fees and funding</a></li>
          <li><a href="/book">Book an admissions call</a></li>
        </ul>
      </div>
      <div>
        <p class="mw-foot-h">Say hello</p>
        <ul>
          <li><a href="mailto:hello@millworks.example">hello@millworks.example</a></li>
          <li><a href="tel:+441615550199">0161 555 0199</a></li>
        </ul>
      </div>
    </div>
    <div class="mw-foot-base">
      <p>© 2026 Millworks School Ltd. Registered in England and Wales.</p>
      <p>Small classes. Real projects. Evenings and weekends.</p>
    </div>
  </div>
</footer>`;

/* ── Pages ──────────────────────────────────────────────────────────── */
const HOME_HTML = `
<div class="mw-page">
<nav aria-label="Main"></nav>
<header class="mw-hero mw-dots">
  <div class="mw-wrap mw-hero-grid">
    <div>
      <p class="mw-sticker">Autumn cohorts now open</p>
      <h1>Evening courses in data, design and code, taught by people who <span class="mw-mark">do the work.</span></h1>
      <p class="mw-lede">Twelve people per class, live in our Manchester studio or online. Keep your job, build real projects and finish with work you can show an employer.</p>
      <div class="mw-actions">
        <a class="mw-btn mw-btn-primary" href="/courses">Browse courses</a>
        <a class="mw-btn mw-btn-light" href="/events">Come to an open evening</a>
      </div>
      <p class="mw-proof"><span class="mw-stars" aria-hidden="true">★★★★★</span><span><b>4.8 out of 5</b> from 1,240 graduates</span></p>
    </div>
    <div class="mw-hero-visual">
      <figure class="mw-hero-photo"><img src="${IMG}/class-whiteboard.webp" alt="An instructor sketching app wireframes on a whiteboard while two students follow along with laptops" width="959" height="640"></figure>
      <div class="mw-board">
        <p class="mw-board-title">Next cohorts <span>Autumn term</span></p>
        <ul>
          <li class="mw-tab-cobalt"><b>Data Analysis</b><time datetime="2026-11-03">Starts 3 Nov</time><span class="mw-seats mw-f75">4 seats left<i></i></span></li>
          <li class="mw-tab-sun"><b>UX &amp; Product Design</b><time datetime="2026-11-10">Starts 10 Nov</time><span class="mw-seats mw-f58">7 seats left<i></i></span></li>
          <li class="mw-tab-ink"><b>Front-end Development</b><time datetime="2026-11-17">Starts 17 Nov</time><span class="mw-seats mw-f92">2 seats left<i></i></span></li>
        </ul>
      </div>
    </div>
  </div>
</header>

<main>
<section class="mw-grads" aria-label="Where graduates work">
  <div class="mw-wrap mw-grads-inner">
    <p>Our graduates now work at</p>
    <ul>
      <li>Northline Rail</li>
      <li>Parcelly</li>
      <li>Quayside Health</li>
      <li>Ardent Games</li>
      <li>City of Salford</li>
    </ul>
  </div>
</section>

<section class="mw-sec" aria-labelledby="mw-courses-h">
  <div class="mw-wrap">
    <div class="mw-head">
      <div>
        <p class="mw-label">Courses</p>
        <h2 class="mw-h2" id="mw-courses-h">Six courses. Every one built around a <span class="mw-mark">project you can show.</span></h2>
      </div>
      <a class="mw-link" href="/courses">Compare every course →</a>
    </div>
    <div class="mw-courses">${COURSES.map(courseCard).join("")}
    </div>
  </div>
</section>

<section class="mw-sec mw-week" aria-labelledby="mw-week-h">
  <div class="mw-wrap">
    <div class="mw-head">
      <div>
        <p class="mw-label">How it works</p>
        <h2 class="mw-h2" id="mw-week-h">A week at Millworks.</h2>
        <p class="mw-intro">Two live evenings, one hands-on lab, and help whenever you are stuck. Every class is recorded in case work runs late.</p>
      </div>
    </div>
    <div class="mw-tt-wrap" tabindex="0" role="region" aria-label="Example weekly timetable for the Front-end Development course, scrolls sideways on small screens">
      <div class="mw-tt">
        <span class="mw-tt-corner"></span>
        <span class="mw-tt-day mw-c2">Mon</span><span class="mw-tt-day mw-c3">Tue</span><span class="mw-tt-day mw-c4">Wed</span><span class="mw-tt-day mw-c5">Thu</span><span class="mw-tt-day mw-c6">Fri</span><span class="mw-tt-day mw-c7">Sat</span><span class="mw-tt-day mw-c8">Sun</span>
        <span class="mw-tt-time mw-r2">10:00</span><span class="mw-tt-time mw-r3">12:00</span><span class="mw-tt-time mw-r4">14:00</span><span class="mw-tt-time mw-r5">18:30</span><span class="mw-tt-time mw-r6">20:00</span>
        <span class="mw-slot mw-tab-ink mw-c2 mw-r5"><i class="mw-slot-day">Monday</i><b>Mentor call</b>30 min, 1:1</span>
        <span class="mw-slot mw-tab-cobalt mw-c3 mw-r5-7"><i class="mw-slot-day">Tuesday</i><b>Live class</b>18:30–21:00</span>
        <span class="mw-slot mw-tab-tint mw-c4 mw-r3"><i class="mw-slot-day">Wednesday</i><b>Office hours</b>Drop in, 12:30</span>
        <span class="mw-slot mw-tab-cobalt mw-c5 mw-r5-7"><i class="mw-slot-day">Thursday</i><b>Live class</b>18:30–21:00</span>
        <span class="mw-slot mw-tab-tint mw-c6 mw-r4"><i class="mw-slot-day">Friday</i><b>Code review</b>Async feedback</span>
        <span class="mw-slot mw-tab-sun mw-c7 mw-r2-4"><i class="mw-slot-day">Saturday</i><b>Project lab</b>Studio or online, 10:00–13:00</span>
      </div>
    </div>
    <p class="mw-tt-note"><span><i class="mw-tab-cobalt"></i>Live, recorded</span><span><i class="mw-tab-sun"></i>Hands-on lab</span><span><i class="mw-tab-tint"></i>Optional help</span><span><i class="mw-tab-ink"></i>One to one</span></p>
  </div>
</section>

<section class="mw-sec mw-dots" aria-labelledby="mw-out-h">
  <div class="mw-wrap">
    <div class="mw-head">
      <div>
        <p class="mw-label">Outcomes</p>
        <h2 class="mw-h2" id="mw-out-h">What happens after the last class.</h2>
      </div>
    </div>
    <dl class="mw-stats">
      <div class="mw-stat mw-stat-hi"><dt>of graduates in a new role or promoted within six months</dt><dd>87%</dd></div>
      <div class="mw-stat"><dt>average salary increase for career changers</dt><dd>£9,400</dd></div>
      <div class="mw-stat"><dt>average course rating across all cohorts</dt><dd>4.8/5</dd></div>
      <div class="mw-stat"><dt>graduates since our first class in 2019</dt><dd>1,240</dd></div>
    </dl>
    <p class="mw-stats-note">From our 2025 graduate survey (412 responses). Individual results depend on effort, experience and the job market.</p>
  </div>
</section>

<section class="mw-sec" aria-labelledby="mw-people-h">
  <div class="mw-wrap">
    <div class="mw-head">
      <div>
        <p class="mw-label">Instructors</p>
        <h2 class="mw-h2" id="mw-people-h">Taught by people with day jobs <span class="mw-mark">in the field.</span></h2>
      </div>
    </div>
    <div class="mw-people">
      <figure class="mw-person mw-tab-cobalt"><img src="${IMG}/instructor-nadia.webp" alt="Portrait of Nadia Rahman" width="320" height="320" loading="lazy"><figcaption><h3>Nadia Rahman</h3><span class="mw-person-teach">Data Analysis</span><p>Lead analyst at a national rail operator. Nine years of SQL, still loves a messy spreadsheet.</p></figcaption></figure>
      <figure class="mw-person mw-tab-sun"><img src="${IMG}/instructor-laura.webp" alt="Portrait of Laura Whitcombe" width="320" height="320" loading="lazy"><figcaption><h3>Laura Whitcombe</h3><span class="mw-person-teach">UX &amp; Content Design</span><p>Head of design at a health-tech start-up. Has run over 300 usability tests.</p></figcaption></figure>
      <figure class="mw-person mw-tab-ink"><img src="${IMG}/instructor-mei.webp" alt="Portrait of Mei Lin Chen" width="320" height="320" loading="lazy"><figcaption><h3>Mei Lin Chen</h3><span class="mw-person-teach">Front-end Development</span><p>Senior engineer building accessible web apps. Speaks at meetups about CSS layout.</p></figcaption></figure>
      <figure class="mw-person mw-tab-tint"><img src="${IMG}/instructor-tom.webp" alt="Portrait of Tom Brennan" width="320" height="320" loading="lazy"><figcaption><h3>Tom Brennan</h3><span class="mw-person-teach">Product Management</span><p>Product director who has launched apps used by two million people.</p></figcaption></figure>
    </div>
  </div>
</section>

<section class="mw-sec mw-week" aria-labelledby="mw-story-h">
  <div class="mw-wrap mw-story">
    <figure class="mw-story-photo"><img src="${IMG}/study-group.webp" alt="Three students working together on laptops covered in stickers" width="960" height="480" loading="lazy"></figure>
    <div>
      <p class="mw-label">Graduate story</p>
      <h2 class="mw-sr" id="mw-story-h">A graduate's story</h2>
      <blockquote class="mw-quote">
        <p>“I went from answering support tickets to analysing them. Six weeks after the course I was a junior analyst on the same team.”</p>
        <footer><b>Aisha Bello</b> · Data Analysis, spring 2025 cohort</footer>
      </blockquote>
    </div>
  </div>
</section>

<section class="mw-sec" aria-labelledby="mw-pay-h">
  <div class="mw-wrap">
    <div class="mw-head">
      <div>
        <p class="mw-label">Paying for it</p>
        <h2 class="mw-h2" id="mw-pay-h">Four ways to cover your fees.</h2>
      </div>
      <a class="mw-link" href="/admissions#fees">Fees and funding in detail →</a>
    </div>
    <div class="mw-pay">
      <div><h3>Pay in full</h3><p>Pay when you reserve your seat.</p><b>5% off</b></div>
      <div><h3>Spread the cost</h3><p>Three or six monthly payments.</p><b>0% interest</b></div>
      <div><h3>Ask your employer</h3><p>We send an invoice and a learning plan for your manager.</p><b>Invoice ready</b></div>
      <div><h3>Apply for a scholarship</h3><p>Twenty places a year for people under-represented in tech.</p><b>75% covered</b></div>
    </div>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const COURSES_HTML = `
<div class="mw-page">
<nav aria-label="Main"></nav>
<header class="mw-phead mw-dots">
  <div class="mw-wrap">
    <p class="mw-label">Courses</p>
    <h1>Pick a skill. <span class="mw-mark">Ship a project.</span></h1>
    <p class="mw-intro">Every course is taught live by a practitioner, capped at twelve people and built around projects you keep. Here is exactly what each one covers.</p>
    <ul class="mw-chips" aria-label="Jump to a course">
      <li><a class="mw-tab-cobalt" href="#data-analysis">Data Analysis</a></li>
      <li><a class="mw-tab-sun" href="#ux-design">UX &amp; Product Design</a></li>
      <li><a class="mw-tab-ink" href="#front-end">Front-end</a></li>
      <li><a class="mw-tab-tint" href="#product">Product</a></li>
      <li><a class="mw-tab-cobalt" href="#data-viz">Data Visualisation</a></li>
      <li><a class="mw-tab-sun" href="#content-design">Content Design</a></li>
    </ul>
  </div>
</header>

<main>
<div class="mw-wrap">
${COURSES.map(courseDetail).join("\n")}
  <div class="mw-course-pics">
    <figure><img src="${IMG}/ux-workshop.webp" alt="Two students arranging sticky notes on a glass wall during a design workshop" width="720" height="640" loading="lazy"><figcaption>UX research sprint, week 2</figcaption></figure>
    <figure><img src="${IMG}/coding.webp" alt="A student in headphones writing code across two monitors and a laptop" width="720" height="640" loading="lazy"><figcaption>Saturday project lab</figcaption></figure>
  </div>
</div>

<section class="mw-sec mw-dates" id="dates" aria-labelledby="mw-dates-h">
  <div class="mw-wrap">
    <div class="mw-head">
      <div>
        <p class="mw-label">Term dates</p>
        <h2 class="mw-h2" id="mw-dates-h">Autumn and winter start dates.</h2>
      </div>
      <a class="mw-link" href="/book">Book an admissions call →</a>
    </div>
    <div class="mw-table-wrap" tabindex="0" role="region" aria-label="Course start dates, scrolls sideways on small screens">
      <table class="mw-table">
        <thead><tr><th scope="col">Course</th><th scope="col">Starts</th><th scope="col">Ends</th><th scope="col">Classes</th><th scope="col">Seats</th></tr></thead>
        <tbody>
          <tr><th scope="row">Data Visualisation</th><td>2 Nov 2026</td><td>7 Dec 2026</td><td>Mon 18:30–21:00</td><td><span class="mw-pill mw-pill-open">5 left</span></td></tr>
          <tr><th scope="row">Data Analysis with SQL &amp; Python</th><td>3 Nov 2026</td><td>26 Jan 2027</td><td>Tue &amp; Thu 18:30–21:00</td><td><span class="mw-pill mw-pill-few">4 left</span></td></tr>
          <tr><th scope="row">Content Design</th><td>5 Nov 2026</td><td>10 Dec 2026</td><td>Thu 18:30–21:00</td><td><span class="mw-pill mw-pill-full">Full</span></td></tr>
          <tr><th scope="row">UX &amp; Product Design</th><td>10 Nov 2026</td><td>28 Jan 2027</td><td>Mon &amp; Wed 18:30–21:00</td><td><span class="mw-pill mw-pill-open">7 left</span></td></tr>
          <tr><th scope="row">Product Management</th><td>12 Nov 2026</td><td>14 Jan 2027</td><td>Wed 18:30 + 2 Saturdays</td><td><span class="mw-pill mw-pill-open">9 left</span></td></tr>
          <tr><th scope="row">Front-end Development</th><td>17 Nov 2026</td><td>2 Mar 2027</td><td>Tue &amp; Thu + Sat lab</td><td><span class="mw-pill mw-pill-few">2 left</span></td></tr>
          <tr><th scope="row">Content Design</th><td>14 Jan 2027</td><td>18 Feb 2027</td><td>Thu 18:30–21:00</td><td><span class="mw-pill mw-pill-open">12 left</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const ADMISSIONS_HTML = `
<div class="mw-page">
<nav aria-label="Main"></nav>
<header class="mw-phead mw-dots">
  <div class="mw-wrap">
    <p class="mw-label">Admissions</p>
    <h1>From first click to first class in <span class="mw-mark">two weeks.</span></h1>
    <p class="mw-intro">No entrance exams and no degree required. We just want to be sure the course fits your goals and your week.</p>
  </div>
</header>

<main>
<section class="mw-sec" aria-labelledby="mw-apply-h">
  <div class="mw-wrap">
    <div class="mw-head"><div><p class="mw-label">How to join</p><h2 class="mw-h2" id="mw-apply-h">Four steps, one conversation.</h2></div></div>
    <ol class="mw-steps">
      <li class="mw-step"><h3>Choose a course</h3><p>Compare outlines and dates, or come to an open evening and try a taster.</p><small>Any time</small></li>
      <li class="mw-step"><h3>Tell us about you</h3><p>A short form about your goals and your week. It takes about ten minutes.</p><small>10 minutes</small></li>
      <li class="mw-step"><h3>Chat with admissions</h3><p>A friendly video call with an instructor to check the course is the right level for you.</p><small>20 minutes</small></li>
      <li class="mw-step"><h3>Reserve your seat</h3><p>A £200 deposit holds your place and counts towards your fees.</p><small>£200 deposit</small></li>
    </ol>
    <div class="mw-actions"><a class="mw-btn mw-btn-primary" href="/book">Book an admissions call</a><a class="mw-btn mw-btn-light" href="/events">Come to an open evening</a></div>
  </div>
</section>

<section class="mw-sec mw-fees" id="fees" aria-labelledby="mw-fees-h">
  <div class="mw-wrap">
    <div class="mw-head"><div><p class="mw-label">Fees and funding</p><h2 class="mw-h2" id="mw-fees-h">Clear prices, flexible payments.</h2><p class="mw-intro">All fees include recordings, project reviews and lifetime access to course materials and the alumni community.</p></div></div>
    <div class="mw-table-wrap" tabindex="0" role="region" aria-label="Course fees and payment options, scrolls sideways on small screens">
      <table class="mw-table">
        <thead><tr><th scope="col">Course</th><th scope="col">Full fee</th><th scope="col">Pay upfront (5% off)</th><th scope="col">3 monthly payments</th><th scope="col">6 monthly payments</th></tr></thead>
        <tbody>
          <tr><th scope="row">Front-end Development</th><td>£2,900</td><td>£2,755</td><td>£967</td><td>£484</td></tr>
          <tr><th scope="row">Data Analysis with SQL &amp; Python</th><td>£2,400</td><td>£2,280</td><td>£800</td><td>£400</td></tr>
          <tr><th scope="row">UX &amp; Product Design</th><td>£2,200</td><td>£2,090</td><td>£734</td><td>£367</td></tr>
          <tr><th scope="row">Product Management</th><td>£1,850</td><td>£1,758</td><td>£617</td><td>£309</td></tr>
          <tr><th scope="row">Data Visualisation</th><td>£950</td><td>£903</td><td>£317</td><td>£159</td></tr>
          <tr><th scope="row">Content Design</th><td>£850</td><td>£808</td><td>£284</td><td>£142</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mw-fund">
      <article class="mw-fund-sun">
        <h3>Access Scholarship</h3>
        <p>Twenty places a year covering 75% of fees for women, people of colour, disabled people and anyone on a low income.</p>
        <ul><li>Apply with a 300-word statement</li><li>Decisions within ten days</li><li>Next deadline: 20 October 2026</li></ul>
      </article>
      <article class="mw-fund-ink">
        <h3>Employer funding</h3>
        <p>Many of our students are funded by their employer's training budget. We provide an invoice, a learning plan and monthly progress notes.</p>
        <p><a href="mailto:hello@millworks.example?subject=Employer%20funding">Ask us for an employer pack</a></p>
      </article>
    </div>
  </div>
</section>

<section class="mw-sec" aria-labelledby="mw-faq-h">
  <div class="mw-wrap mw-faq-grid">
    <div>
      <p class="mw-label">Questions</p>
      <h2 class="mw-h2" id="mw-faq-h">Things people ask before they join.</h2>
      <p class="mw-intro">Still unsure? Email us or come along to an open evening. Real people answer, usually on the same day.</p>
    </div>
    <div class="mw-faq">
      <details open><summary>Do I need any experience?</summary><p>No. Every course starts from the basics. For Front-end Development we ask you to complete a free two-hour preparation module first, so everyone starts on the same page.</p></details>
      <details><summary>How much time will it take each week?</summary><p>Between three and eight hours, including classes. Each course page shows the exact commitment, and every class is recorded if you have to miss one.</p></details>
      <details><summary>What if I have to drop out?</summary><p>You can pause and join a later cohort at no extra cost. Before the second week we refund your fees in full, minus the deposit.</p></details>
      <details><summary>Do I get a certificate?</summary><p>Yes, once you complete your final project. More importantly, you leave with a portfolio project and a written reference from your instructor.</p></details>
      <details><summary>Can I study from outside the UK?</summary><p>Yes. Online classes run on UK time, and about a quarter of our students join from elsewhere in Europe.</p></details>
    </div>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const template: StarterTemplate = {
  id: "original-education",
  name: "Millworks School",
  tagline: "Evening school site with course index cards, a weekly timetable, instructors, term dates, fees and open-evening sign-up",
  category: "education",
  tags: ["education", "school", "courses", "bootcamp", "training", "academy", "classes", "instructors", "timetable", "enrolment"],
  source: "original",
  modules: ["events", "bookings"],
  moduleSeeds: {
    events: {
      items: [
        { title: "Open evening: every course", description: "Meet the instructors, see graduate projects and try a 20-minute taster class.", starts_at: "2026-10-15T17:30:00Z", location: "Thu 15 Oct, 18:30 · Ancoats studio", image_url: null },
        { title: "Taster: SQL in an hour", description: "Write your first queries on a real dataset. Laptops provided, no experience needed.", starts_at: "2026-10-21T17:30:00Z", location: "Wed 21 Oct, 18:30 · Online", image_url: null },
        { title: "Portfolio review night", description: "Bring a project and get friendly feedback from working designers and developers.", starts_at: "2026-10-29T18:30:00Z", location: "Thu 29 Oct, 18:30 · Ancoats studio", image_url: null },
        { title: "Open evening: Front-end Development", description: "A walk through the 14-week course, the Saturday lab and demo day.", starts_at: "2026-11-05T18:30:00Z", location: "Thu 5 Nov, 18:30 · Online", image_url: null },
      ],
    },
  },
  theme: {
    name: "Millworks",
    mode: "light",
    primary: "#2340c9",
    primary2: "#1a31a0",
    accent: "#f5b700",
    bg: "#fbf8f1",
    surface: "#ffffff",
    surface2: "#f2eee3",
    border: "#ddd6c6",
    text: "#16182c",
    textMuted: "#565a6e",
    font: `"Figtree", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    fontDisplay: `"Bricolage Grotesque", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    googleFonts: ["Bricolage Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800", "Figtree:wght@400;500;600;700;800"],
    radius: "18px",
    radiusSm: "12px",
    dark: {
      name: "Millworks Night",
      mode: "dark",
      primary: "#7d91ff",
      primary2: "#99a9ff",
      accent: "#6b5200",
      bg: "#10121f",
      surface: "#171a2b",
      surface2: "#1f2338",
      border: "#2e3352",
      text: "#eef0fb",
      textMuted: "#a8acc6",
      font: `"Figtree", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      fontDisplay: `"Bricolage Grotesque", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      googleFonts: ["Bricolage Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800", "Figtree:wght@400;500;600;700;800"],
      radius: "18px",
      radiusSm: "12px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: BASE_CSS + NAV_CSS + SHARED_CSS + HOME_CSS + CTA_FOOTER_CSS },
    { title: "Courses", slug: "courses", isHome: false, html: COURSES_HTML, css: BASE_CSS + NAV_CSS + SHARED_CSS + PAGE_HEAD_CSS + COURSES_CSS + CTA_FOOTER_CSS },
    { title: "Admissions", slug: "admissions", isHome: false, html: ADMISSIONS_HTML, css: BASE_CSS + NAV_CSS + SHARED_CSS + PAGE_HEAD_CSS + ADMISSIONS_CSS + CTA_FOOTER_CSS },
  ],
};

registerTemplate(template);
export default template;
