/**
 * Ines Varga — Portfolio flagship (original-portfolio)
 *
 * Art direction
 * - Mood: quiet, precise, gallery-like. The personal portfolio of a Copenhagen interior
 *   architect: the work speaks, the page gets out of the way.
 * - Type: Instrument Serif (display, with italics for emphasis) and Instrument Sans for
 *   text; captions and labels in small letter-spaced capitals.
 * - Palette: gallery white #f6f4f0, graphite #1d1c1a, clay #8a4b2d as the single accent
 *   and sage #5e7563 for secondary marks. No cards, no shadows, no rounded corners.
 * - Layout grammar: an asymmetric 12-column grid with offset tiles and captions set
 *   beneath each image, hairline rules, CSS-counter numbering (menu, sections, tiles).
 * - Signature: the offset "selected work" grid, the numbered project index, and a case
 *   study with a floor plan drawn in HTML/CSS plus a materials palette.
 * - Pages: Home, Vesterbro Loft (case study), About (bio, services, process, fees,
 *   recognition).
 * - Modules: contact-form (project enquiries).
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";


/* ── Shared CSS ─────────────────────────────────────────────────────── */
const BASE_CSS = `
.iv-page{font-size:1.02rem;line-height:1.65}
.iv-wrap{width:min(1240px,100% - 48px);margin-inline:auto}
.iv-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.iv-cap-label{margin:0;font-size:.74rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-text-muted)}
.iv-sec{padding:clamp(64px,9vw,128px) 0}
.iv-sec-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:12px 32px;padding-bottom:18px;margin-bottom:clamp(32px,5vw,56px);border-bottom:1px solid var(--nk-text)}
.iv-sec-head h2{margin:0;font-size:clamp(2rem,4vw,3.2rem);font-weight:400;line-height:1.05}
.iv-sec-head h2 em{color:var(--nk-primary)}
.iv-page em{font-style:italic}
.iv-arrow{display:inline-flex;align-items:center;gap:10px;font-weight:600;color:var(--nk-text);text-decoration:none;border-bottom:1px solid var(--nk-text);padding-bottom:2px}
.iv-arrow:hover{color:var(--nk-primary);border-bottom-color:var(--nk-primary);text-decoration:none}
.iv-page a:focus-visible,.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:2px solid var(--nk-primary);outline-offset:4px}
.iv-cta{padding:clamp(72px,10vw,140px) 0;border-top:1px solid var(--nk-text)}
.iv-cta-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px 64px;align-items:end}
.iv-cta h2{margin:0;font-size:clamp(2.6rem,6vw,5rem);line-height:1;font-weight:400}
.iv-cta h2 em{color:var(--nk-primary)}
.iv-cta p{margin:0 0 18px;color:var(--nk-text-muted);max-width:44ch}
.iv-mail{display:inline-block;font-family:var(--nk-font-display);font-size:clamp(1.5rem,3.2vw,2.4rem);line-height:1.2;color:var(--nk-text);text-decoration:none;border-bottom:1px solid var(--nk-text);overflow-wrap:anywhere}
.iv-mail:hover{color:var(--nk-primary);border-bottom-color:var(--nk-primary);text-decoration:none}
.iv-cta-actions{display:flex;flex-wrap:wrap;gap:14px 28px;align-items:center;margin-top:28px}
.iv-btn{display:inline-flex;align-items:center;min-height:50px;padding:0 26px;background:var(--nk-text);color:var(--nk-bg);font-weight:600;text-decoration:none;border:1px solid var(--nk-text);transition:background-color .2s,color .2s}
.iv-btn:hover{background:var(--nk-primary);border-color:var(--nk-primary);color:var(--nk-bg);text-decoration:none}
@media (max-width:820px){.iv-cta-grid{grid-template-columns:minmax(0,1fr)}}
.iv-footer{padding:36px 0 40px;border-top:1px solid var(--nk-border)}
.iv-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px 32px;font-size:.9rem;color:var(--nk-text-muted)}
.iv-foot p{margin:0}
.iv-foot ul{list-style:none;display:flex;flex-wrap:wrap;gap:8px 22px;margin:0;padding:0}
.iv-foot a{color:var(--nk-text);text-decoration:none}
.iv-foot a:hover{color:var(--nk-primary);text-decoration:underline}
`;

const NAV_CSS = `
.nk-nav{padding-block:22px!important;background:var(--nk-bg)!important;border-bottom:0!important;position:relative;z-index:20}
.nk-nav>.container{max-width:1240px}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-style:italic;font-weight:400!important;font-size:1.75rem;letter-spacing:0;color:var(--nk-text)!important}
.nk-nav .navbar-nav{counter-reset:ivnav}
.nk-nav .nav-link{color:var(--nk-text)!important;font-size:.95rem;font-weight:500!important;padding:6px 12px!important}
.nk-nav .navbar-nav>.nav-item>.nav-link::before{counter-increment:ivnav;content:"0" counter(ivnav);margin-right:7px;font-family:var(--nk-font-display);font-style:italic;font-size:.9rem;color:var(--nk-text-muted)}
.nk-nav .nav-link:hover{color:var(--nk-primary)!important;text-decoration:none}
.nk-nav .nav-link.active{color:var(--nk-primary)!important}
.nk-nav .btn{background:var(--nk-text)!important;color:var(--nk-bg)!important;border-radius:0!important}
.nk-nav .navbar-toggler{color:var(--nk-text)!important;padding:4px 0!important;border:0!important;border-bottom:1px solid var(--nk-text)!important;border-radius:0!important;font-size:0;line-height:1}
.nk-nav .navbar-toggler::before{content:"Menu";font-size:1rem;font-weight:600}
.nk-nav .navbar-toggler[aria-expanded="true"]::before{content:"Close"}
.nk-nav .navbar-toggler>*{display:none!important}
.nk-nav .dropdown-menu{border-radius:0;padding:6px 0;background:var(--nk-bg)!important;border:1px solid var(--nk-text)!important}
.nk-nav .dropdown-item{padding:9px 18px;color:var(--nk-text)!important}
.nk-nav .dropdown-item:hover,.nk-nav .dropdown-item:focus{background:var(--nk-surface-2)}
@media (min-width:992px){.nk-nav .dropdown{position:relative}.nk-nav .dropdown-menu-end{right:0;left:auto}}
@media (max-width:991.98px){.nk-nav .navbar-collapse{margin-top:18px;border-top:1px solid var(--nk-text)}.nk-nav .nav-link{padding:14px 0!important;border-bottom:1px solid var(--nk-border);font-size:1.3rem;font-family:var(--nk-font-display);font-weight:400!important}}
`;

/* ── Home ───────────────────────────────────────────────────────────── */
const HOME_CSS = `
.iv-intro{padding:clamp(40px,6vw,88px) 0 clamp(48px,6vw,80px)}
.iv-intro-meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px 32px;margin:0 0 clamp(28px,4vw,48px);padding-bottom:16px;border-bottom:1px solid var(--nk-border)}
.iv-avail{display:inline-flex;align-items:center;gap:10px}
.iv-avail::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--nk-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--nk-accent) 22%,transparent)}
.iv-intro-grid{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:40px 64px;align-items:end}
.iv-intro h1{margin:0;font-size:clamp(3rem,6.6vw,6.2rem);line-height:.98;font-weight:400;letter-spacing:-.01em;text-wrap:balance}
.iv-intro h1 em{color:var(--nk-primary)}
.iv-lede{margin:clamp(24px,3vw,40px) 0 0;font-size:1.15rem;color:var(--nk-text-muted);max-width:46ch}
.iv-intro-links{display:flex;flex-wrap:wrap;gap:12px 32px;margin-top:28px}
.iv-intro-fig{margin:0}
.iv-intro-fig img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}
.iv-intro-fig figcaption{display:flex;gap:12px;align-items:baseline;margin-top:12px;font-size:.9rem;color:var(--nk-text-muted)}
.iv-intro-fig figcaption span{font-family:var(--nk-font-display);font-style:italic;font-size:1.05rem;color:var(--nk-primary)}
@media (max-width:860px){.iv-intro-grid{grid-template-columns:minmax(0,1fr)}.iv-intro-fig{max-width:460px}}
.iv-work{padding:0 0 clamp(64px,9vw,128px)}
.iv-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:24px;row-gap:clamp(48px,7vw,96px);counter-reset:ivtile}
.iv-tile{margin:0;counter-increment:ivtile}
.iv-tile-img{display:block;overflow:hidden;background:var(--nk-surface-2)}
.iv-tile img{display:block;width:100%;height:auto;object-fit:cover;transition:transform .6s ease}
.iv-tile-img:hover img{transform:scale(1.025)}
.iv-land img{aspect-ratio:3/2}
.iv-port img{aspect-ratio:4/5}
.iv-tile figcaption{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:2px 12px;align-items:baseline;padding-top:14px;margin-top:14px;border-top:1px solid var(--nk-border)}
.iv-tile figcaption::before{content:"0" counter(ivtile);grid-row:span 2;font-family:var(--nk-font-display);font-style:italic;font-size:1.3rem;line-height:1;color:var(--nk-primary)}
.iv-tile h3{margin:0;font-family:var(--nk-font);font-size:1.05rem;font-weight:600;letter-spacing:0}
.iv-tile h3 a{color:var(--nk-text);text-decoration:none}
.iv-tile h3 a:hover{color:var(--nk-primary);text-decoration:underline}
.iv-tile-meta{grid-column:2/-1;margin:0;font-size:.9rem;color:var(--nk-text-muted)}
.iv-tile-year{font-size:.9rem;color:var(--nk-text-muted)}
.iv-t1{grid-column:1/8}
.iv-t2{grid-column:9/13;margin-top:clamp(40px,10vw,160px)}
.iv-t3{grid-column:2/7}
.iv-t4{grid-column:8/13;margin-top:clamp(32px,8vw,120px)}
.iv-case-link{display:inline-block;margin-top:12px;font-size:.9rem;font-weight:600;color:var(--nk-primary)}
@media (max-width:900px){.iv-grid{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:18px}.iv-t1{grid-column:1/-1}.iv-t2{grid-column:1;margin-top:0}.iv-t3{grid-column:2;align-self:end}.iv-t4{grid-column:1/-1;margin-top:0}}
@media (max-width:560px){.iv-grid{grid-template-columns:minmax(0,1fr)}.iv-t2,.iv-t3,.iv-t4{grid-column:1}.iv-port img{aspect-ratio:4/4.4}}
.iv-disc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;counter-reset:ivdisc}
.iv-disc-item{padding:28px 28px 8px 0;counter-increment:ivdisc}
.iv-disc-item+.iv-disc-item{padding-left:28px;border-left:1px solid var(--nk-border)}
.iv-disc-item::before{content:"(" counter(ivdisc) ")";display:block;margin-bottom:26px;font-family:var(--nk-font-display);font-style:italic;color:var(--nk-text-muted)}
.iv-disc-item h3{margin:0;font-size:1.6rem;font-weight:400;line-height:1.15}
.iv-disc-item p{margin:12px 0 0;color:var(--nk-text-muted);font-size:.97rem}
.iv-disc-item small{display:block;margin-top:14px;font-size:.78rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-accent)}
@media (max-width:980px){.iv-disc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.iv-disc-item:nth-child(3){border-left:0;padding-left:0}.iv-disc-item:nth-child(n+3){border-top:1px solid var(--nk-border);margin-top:20px}}
@media (max-width:560px){.iv-disc-grid{grid-template-columns:minmax(0,1fr)}.iv-disc-item,.iv-disc-item+.iv-disc-item{padding:24px 0 8px;border-left:0}.iv-disc-item+.iv-disc-item{border-top:1px solid var(--nk-border);margin-top:0}}
.iv-index{width:100%;border-collapse:collapse;margin:0}
.iv-index th,.iv-index td{padding:16px 12px 16px 0;border-bottom:1px solid var(--nk-border);text-align:left;vertical-align:baseline}
.iv-index thead th{padding-block:12px;font-size:.74rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-text-muted)}
.iv-index td:first-child{width:70px;font-family:var(--nk-font-display);font-style:italic;color:var(--nk-text-muted)}
.iv-index th[scope="row"]{font-family:var(--nk-font-display);font-weight:400;font-size:1.45rem;line-height:1.2}
.iv-index th[scope="row"] a{color:var(--nk-text);text-decoration:none;border-bottom:1px solid var(--nk-primary)}
.iv-index th[scope="row"] a:hover{color:var(--nk-primary);text-decoration:none}
.iv-index td:last-child{text-align:right;padding-right:0}
.iv-index thead th:last-child{text-align:right;padding-right:0}
.iv-index tbody tr:hover{background:color-mix(in srgb,var(--nk-surface-2) 60%,transparent)}
.iv-index-note{margin:20px 0 0;color:var(--nk-text-muted);font-size:.92rem}
@media (max-width:700px){.iv-index th:nth-child(4),.iv-index td:nth-child(4){display:none}.iv-index th[scope="row"]{font-size:1.2rem}.iv-index td:first-child{width:44px}}
@media (max-width:440px){.iv-index th:nth-child(3),.iv-index td:nth-child(3){display:none}}
.iv-numbers{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:40px 72px;align-items:start}
.iv-quote{margin:0}
.iv-quote p{margin:0;font-family:var(--nk-font-display);font-size:clamp(1.8rem,3.4vw,2.8rem);line-height:1.15}
.iv-quote p em{color:var(--nk-primary)}
.iv-quote footer{margin-top:22px;color:var(--nk-text-muted)}
.iv-stats{margin:0;border-top:1px solid var(--nk-text)}
.iv-stats div{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:16px 0;border-bottom:1px solid var(--nk-border)}
.iv-stats dt{color:var(--nk-text-muted)}
.iv-stats dd{margin:0;font-family:var(--nk-font-display);font-size:2.2rem;line-height:1}
@media (max-width:860px){.iv-numbers{grid-template-columns:minmax(0,1fr)}}
.iv-press{list-style:none;margin:0;padding:0}
.iv-press li{display:grid;grid-template-columns:90px minmax(0,1fr) auto;gap:6px 24px;align-items:baseline;padding:18px 0;border-bottom:1px solid var(--nk-border)}
.iv-press-year{font-family:var(--nk-font-display);font-style:italic;color:var(--nk-text-muted)}
.iv-press b{font-weight:600}
.iv-press span:last-child{color:var(--nk-text-muted);font-size:.92rem;text-align:right}
@media (max-width:640px){.iv-press li{grid-template-columns:60px minmax(0,1fr)}.iv-press span:last-child{grid-column:2;text-align:left}}
`;

/* ── Case study ─────────────────────────────────────────────────────── */
const CASE_CSS = `
.iv-case-head{padding:clamp(32px,5vw,64px) 0 clamp(32px,4vw,48px)}
.iv-back{display:inline-block;margin-bottom:28px;color:var(--nk-text-muted);text-decoration:none;font-size:.95rem}
.iv-back:hover{color:var(--nk-primary)}
.iv-case-title{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:24px 64px;align-items:end}
.iv-case-title h1{margin:0;font-size:clamp(3rem,8vw,7rem);line-height:.95;font-weight:400}
.iv-case-title h1 em{color:var(--nk-primary)}
.iv-case-title p{margin:0;font-size:1.15rem;color:var(--nk-text-muted)}
@media (max-width:820px){.iv-case-title{grid-template-columns:minmax(0,1fr)}}
.iv-case-hero{margin:0}
.iv-case-hero img{display:block;width:100%;height:auto;aspect-ratio:21/10;object-fit:cover}
.iv-case-hero figcaption{margin-top:10px;font-size:.88rem;color:var(--nk-text-muted)}
@media (max-width:640px){.iv-case-hero img{aspect-ratio:4/3}}
.iv-case-body{display:grid;grid-template-columns:300px minmax(0,1fr);gap:40px 80px;padding:clamp(48px,7vw,96px) 0}
.iv-facts{position:sticky;top:24px;align-self:start;margin:0;border-top:1px solid var(--nk-text)}
.iv-facts div{padding:12px 0;border-bottom:1px solid var(--nk-border)}
.iv-facts dt{font-size:.74rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-text-muted)}
.iv-facts dd{margin:4px 0 0}
.iv-story{counter-reset:ivstory}
.iv-chapter{padding:0 0 56px;margin-bottom:56px;border-bottom:1px solid var(--nk-border);counter-increment:ivstory}
.iv-chapter:last-child{border-bottom:0;margin-bottom:0;padding-bottom:0}
.iv-chapter h2{display:flex;align-items:baseline;gap:14px;margin:0 0 18px;font-size:clamp(1.8rem,3vw,2.4rem);font-weight:400}
.iv-chapter h2::before{content:"0" counter(ivstory);font-size:1rem;font-style:italic;color:var(--nk-primary)}
.iv-chapter>p{margin:0 0 16px;max-width:62ch}
.iv-plan-wrap{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:28px 40px;align-items:start;margin-top:28px}
.iv-plan{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-template-rows:repeat(9,34px);padding:12px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.iv-room{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:4px;text-align:center;font-size:.78rem;line-height:1.3;color:var(--nk-text-muted);box-shadow:inset 0 0 0 2px var(--nk-text);overflow:hidden}
.iv-room b{color:var(--nk-text);font-weight:600;font-size:.84rem}
.iv-r-living{grid-column:1/7;grid-row:1/6;background:color-mix(in srgb,var(--nk-accent) 14%,transparent)}
.iv-r-kitchen{grid-column:7/13;grid-row:1/5;background:color-mix(in srgb,var(--nk-primary) 12%,transparent)}
.iv-r-study{grid-column:7/10;grid-row:5/7}
.iv-r-hall{grid-column:10/13;grid-row:5/8}
.iv-r-bath{grid-column:1/4;grid-row:6/10}
.iv-r-bed{grid-column:4/7;grid-row:6/10}
.iv-r-kids{grid-column:7/10;grid-row:7/10}
.iv-r-store{grid-column:10/13;grid-row:8/10}
.iv-plan-key{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.iv-plan-key li{padding-left:18px;border-left:2px solid var(--nk-border)}
.iv-plan-key b{display:block;font-family:var(--nk-font-display);font-weight:400;font-size:1.4rem}
.iv-plan-key span{color:var(--nk-text-muted);font-size:.95rem}
@media (max-width:760px){.iv-plan-wrap{grid-template-columns:minmax(0,1fr)}.iv-plan{grid-template-rows:repeat(9,30px);padding:8px}.iv-room{font-size:.68rem}.iv-room b{font-size:.72rem}}
.iv-swatches{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.iv-swatch i{display:block;aspect-ratio:5/3;margin-bottom:10px;border:1px solid var(--nk-border)}
.iv-swatch b{display:block;font-weight:600;font-size:.92rem}
.iv-swatch span{color:var(--nk-text-muted);font-size:.85rem}
.iv-sw-oak{background:color-mix(in srgb,var(--nk-primary) 38%,var(--nk-bg))}
.iv-sw-lime{background:var(--nk-surface-2)}
.iv-sw-sage{background:var(--nk-accent)}
.iv-sw-steel{background:var(--nk-text)}
.iv-sw-clay{background:var(--nk-primary)}
@media (max-width:640px){.iv-swatches{grid-template-columns:repeat(3,minmax(0,1fr))}}
.iv-pair{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:20px;margin:28px 0 0}
.iv-pair figure{margin:0}
.iv-pair img{display:block;width:100%;height:100%;object-fit:cover}
.iv-pair figcaption{margin-top:10px;font-size:.88rem;color:var(--nk-text-muted)}
@media (max-width:640px){.iv-pair{grid-template-columns:minmax(0,1fr)}.iv-pair img{height:auto}}
.iv-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:28px 0 0;border-top:1px solid var(--nk-text)}
.iv-results div{display:flex;flex-direction:column-reverse;justify-content:flex-end;gap:8px;padding:20px 20px 0 0}
.iv-results div+div{padding-left:20px;border-left:1px solid var(--nk-border)}
.iv-results dd{margin:0;font-family:var(--nk-font-display);font-size:clamp(2.4rem,4.4vw,3.4rem);line-height:1;color:var(--nk-primary)}
.iv-results dt{color:var(--nk-text-muted);font-size:.95rem}
@media (max-width:640px){.iv-results{grid-template-columns:minmax(0,1fr)}.iv-results div,.iv-results div+div{padding:18px 0;border-left:0;border-bottom:1px solid var(--nk-border)}}
.iv-client{margin:32px 0 0;padding-left:24px;border-left:2px solid var(--nk-primary)}
.iv-client p{margin:0;font-family:var(--nk-font-display);font-size:1.6rem;line-height:1.3}
.iv-client footer{margin-top:14px;color:var(--nk-text-muted)}
@media (max-width:980px){.iv-case-body{grid-template-columns:minmax(0,1fr)}.iv-facts{position:static;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px}}
@media (max-width:420px){.iv-facts{grid-template-columns:minmax(0,1fr)}}
.iv-next{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:24px 48px;align-items:center;padding:clamp(48px,7vw,80px) 0;border-top:1px solid var(--nk-text)}
.iv-next p{margin:0}
.iv-next h2{margin:6px 0 0;font-size:clamp(2.2rem,5vw,4rem);font-weight:400;line-height:1}
.iv-next h2 a{color:var(--nk-text);text-decoration:none}
.iv-next h2 a:hover{color:var(--nk-primary)}
.iv-next img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}
@media (max-width:760px){.iv-next{grid-template-columns:minmax(0,1fr)}}
`;

/* ── About ──────────────────────────────────────────────────────────── */
const ABOUT_CSS = `
.iv-about-head{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:40px 80px;align-items:end;padding:clamp(32px,5vw,72px) 0 clamp(48px,7vw,96px)}
.iv-portrait{margin:0}
.iv-portrait img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}
.iv-portrait figcaption{margin-top:10px;font-size:.88rem;color:var(--nk-text-muted)}
.iv-about-head h1{margin:0 0 24px;font-size:clamp(3rem,7vw,6rem);line-height:.95;font-weight:400}
.iv-about-head h1 em{color:var(--nk-primary)}
.iv-about-copy p{margin:0 0 16px;max-width:56ch}
.iv-about-copy .iv-bio-lead{font-size:1.2rem}
.iv-about-meta{margin:28px 0 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--nk-text)}
.iv-about-meta div{padding:14px 12px 0 0}
.iv-about-meta dt{font-size:.74rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-text-muted)}
.iv-about-meta dd{margin:4px 0 0}
@media (max-width:860px){.iv-about-head{grid-template-columns:minmax(0,1fr)}.iv-portrait{max-width:420px}}
@media (max-width:480px){.iv-about-meta{grid-template-columns:minmax(0,1fr)}}
.iv-services{list-style:none;margin:0;padding:0;counter-reset:ivsvc}
.iv-service{display:grid;grid-template-columns:60px minmax(0,1fr) minmax(0,1.2fr) minmax(0,.7fr);gap:10px 32px;align-items:baseline;padding:0 0 26px;margin-bottom:26px;border-bottom:1px solid var(--nk-border);counter-increment:ivsvc}
.iv-service::before{content:"0" counter(ivsvc);font-family:var(--nk-font-display);font-style:italic;color:var(--nk-primary)}
.iv-service h3{margin:0;font-size:1.7rem;font-weight:400;line-height:1.1}
.iv-service p{margin:0;color:var(--nk-text-muted)}
.iv-service span{font-size:.9rem;color:var(--nk-text-muted)}
@media (max-width:860px){.iv-service{grid-template-columns:44px minmax(0,1fr)}.iv-service p,.iv-service span{grid-column:2}}
.iv-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}
.iv-step{padding:0 24px 8px 0}
.iv-step+.iv-step{padding-left:24px;border-left:1px solid var(--nk-border)}
.iv-step small{display:block;font-size:.74rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-accent)}
.iv-step h3{margin:14px 0 0;font-size:1.8rem;font-weight:400}
.iv-step p{margin:10px 0 0;color:var(--nk-text-muted);font-size:.97rem}
@media (max-width:980px){.iv-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.iv-step:nth-child(3){border-left:0;padding-left:0}.iv-step:nth-child(n+3){border-top:1px solid var(--nk-border);margin-top:16px;padding-top:20px}}
@media (max-width:540px){.iv-steps{grid-template-columns:minmax(0,1fr)}.iv-step,.iv-step+.iv-step{padding:22px 0 8px;border-left:0}.iv-steps .iv-step:first-child{padding-top:0}.iv-step+.iv-step{border-top:1px solid var(--nk-border);margin-top:0}}
.iv-fees{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px 72px;margin-top:40px;padding:28px 32px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.iv-fees h3{margin:0;font-size:1.6rem;font-weight:400}
.iv-fees p{margin:10px 0 0;color:var(--nk-text-muted)}
.iv-fees dl{margin:0}
.iv-fees dl div{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--nk-border)}
.iv-fees dt{color:var(--nk-text-muted)}
.iv-fees dd{margin:0;font-weight:600;text-align:right}
@media (max-width:820px){.iv-fees{grid-template-columns:minmax(0,1fr);padding:24px 20px}}
.iv-clients{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 28px}
.iv-clients li{font-family:var(--nk-font-display);font-size:clamp(1.5rem,2.6vw,2.1rem);line-height:1.3}
.iv-clients li::after{content:"·";margin-left:28px;color:var(--nk-text-muted)}
.iv-clients li:last-child::after{content:none}
`;

/* ── Shared HTML ────────────────────────────────────────────────────── */
const CTA_HTML = `
<section class="iv-cta" aria-labelledby="iv-cta-h">
  <div class="iv-wrap iv-cta-grid">
    <h2 id="iv-cta-h">Have a space in mind? <em>Tell me about it.</em></h2>
    <div>
      <p>I take on six to eight projects a year so each one gets my full attention. The next opening is March 2027.</p>
      <a class="iv-mail" href="mailto:studio@inesvarga.example">studio@inesvarga.example</a>
      <div class="iv-cta-actions">
        <a class="iv-btn" href="/contact">Start a project enquiry</a>
        <a class="iv-arrow" href="tel:+4531555018">+45 31 55 50 18</a>
      </div>
    </div>
  </div>
</section>`;

const FOOTER_HTML = `
<footer class="iv-footer">
  <div class="iv-wrap iv-foot">
    <p>© 2026 Ines Varga Interior Architecture ApS · Ravnsborggade 14, 2200 Copenhagen N</p>
    <ul>
      <li><a href="/">Work</a></li>
      <li><a href="/vesterbro-loft">Case study</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </div>
</footer>`;

/* ── Pages ──────────────────────────────────────────────────────────── */
const PROJECTS: Array<[string, string, string, string, string, string]> = [
  ["32", "Vesterbro Loft", "Residential", "Copenhagen", "142 m²", "2025"],
  ["31", "Kaffebar Ro", "Hospitality", "Copenhagen", "64 m²", "2024"],
  ["30", "Østerbro Reading Room", "Residential", "Copenhagen", "38 m²", "2024"],
  ["29", "Hotel Tanne, 12 rooms", "Hospitality", "Aarhus", "610 m²", "2024"],
  ["28", "Frederiksberg Townhouse", "Residential", "Frederiksberg", "210 m²", "2023"],
  ["27", "Nordlys Studio", "Workplace", "Copenhagen", "410 m²", "2023"],
  ["26", "Harbour Study", "Residential", "Malmö", "22 m²", "2023"],
  ["25", "Bageri Solsort", "Hospitality", "Copenhagen", "48 m²", "2022"],
  ["24", "Refshaleøen Boathouse", "Residential", "Copenhagen", "96 m²", "2022"],
  ["23", "Alfama Apartment", "Residential", "Lisbon", "88 m²", "2021"],
];

const HOME_HTML = `
<div class="iv-page">
<nav aria-label="Main"></nav>
<header class="iv-intro">
  <div class="iv-wrap">
    <div class="iv-intro-meta">
      <p class="iv-cap-label">Ines Varga · Interior architect · Copenhagen</p>
      <p class="iv-cap-label iv-avail">Booking projects from March 2027</p>
    </div>
    <div class="iv-intro-grid">
      <div class="iv-intro-copy">
        <h1>Rooms that feel <em>quiet,</em> work hard and age well.</h1>
        <p class="iv-lede">For nine years I have designed homes, cafés and workplaces around three things: daylight, honest materials and the way people actually live in a room.</p>
        <div class="iv-intro-links">
          <a class="iv-arrow" href="#work">Selected work <span aria-hidden="true">↓</span></a>
          <a class="iv-arrow" href="/about">About the studio <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <figure class="iv-intro-fig">
        <img src="/media/generated/portfolio-reading-room.webp" alt="A leather butterfly chair with a striped throw in front of tall windows and sheer curtains" width="512" height="640">
        <figcaption><span>Latest</span>Østerbro Reading Room, 2024 · a spare room made into a library</figcaption>
      </figure>
    </div>
  </div>
</header>

<main>
<section class="iv-work" id="work" aria-labelledby="iv-work-h">
  <div class="iv-wrap">
    <div class="iv-sec-head"><h2 id="iv-work-h">Selected <em>work</em></h2><p class="iv-cap-label">Four of 32 projects · 2023–2025</p></div>
    <div class="iv-grid">
      <figure class="iv-tile iv-land iv-t1">
        <a class="iv-tile-img" href="/vesterbro-loft"><img src="/media/generated/portfolio-vesterbro-loft.webp" alt="An open-plan loft with a grey sofa, a long white dining table, herringbone oak floors and black steel windows" width="960" height="640"></a>
        <figcaption><h3><a href="/vesterbro-loft">Vesterbro Loft</a></h3><span class="iv-tile-year">2025</span><p class="iv-tile-meta">A former print works turned family home · 142 m² · <a class="iv-case-link" href="/vesterbro-loft">Read the case study</a></p></figcaption>
      </figure>
      <figure class="iv-tile iv-port iv-t2">
        <span class="iv-tile-img"><img src="/media/generated/portfolio-townhouse-stair.webp" alt="An oak staircase with black steel balusters seen from the top floor looking down" width="640" height="800" loading="lazy"></span>
        <figcaption><h3>Frederiksberg Townhouse</h3><span class="iv-tile-year">2023</span><p class="iv-tile-meta">Four floors joined by one oak stair · 210 m²</p></figcaption>
      </figure>
      <figure class="iv-tile iv-land iv-t3">
        <span class="iv-tile-img"><img src="/media/generated/portfolio-kaffebar-ro.webp" alt="A pale counter with a glass coffee maker and a cactus in warm morning light by a window" width="959" height="640" loading="lazy"></span>
        <figcaption><h3>Kaffebar Ro</h3><span class="iv-tile-year">2024</span><p class="iv-tile-meta">A 20-seat espresso bar in a former dairy · 64 m²</p></figcaption>
      </figure>
      <figure class="iv-tile iv-land iv-t4">
        <span class="iv-tile-img"><img src="/media/generated/portfolio-nordlys-studio.webp" alt="A long dark meeting table lined with grey upholstered chairs in a white room" width="960" height="640" loading="lazy"></span>
        <figcaption><h3>Nordlys Studio</h3><span class="iv-tile-year">2023</span><p class="iv-tile-meta">A workplace for a 40-person game studio · 410 m²</p></figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="iv-sec" aria-labelledby="iv-disc-h">
  <div class="iv-wrap">
    <div class="iv-sec-head"><h2 id="iv-disc-h">What I <em>design</em></h2><p class="iv-cap-label">From one room to a whole building</p></div>
    <div class="iv-disc iv-disc-grid">
      <div class="iv-disc-item"><h3>Homes</h3><p>Renovations and new builds, planned around the light and the family that lives there.</p><small>60–250 m²</small></div>
      <div class="iv-disc-item"><h3>Hospitality</h3><p>Cafés, bakeries and small hotels where the room is part of the reason to return.</p><small>30–800 m²</small></div>
      <div class="iv-disc-item"><h3>Workplaces</h3><p>Offices for studios and small companies that want calm, not a slide in the lobby.</p><small>Up to 1,000 m²</small></div>
      <div class="iv-disc-item"><h3>Joinery</h3><p>Kitchens, shelving and one-off furniture, drawn in-house and built by local makers.</p><small>Made in Denmark</small></div>
    </div>
  </div>
</section>

<section class="iv-sec" aria-labelledby="iv-index-h">
  <div class="iv-wrap">
    <div class="iv-sec-head"><h2 id="iv-index-h">Project <em>index</em></h2><p class="iv-cap-label">The ten most recent</p></div>
    <div class="iv-index-wrap">
      <table class="iv-index">
        <thead><tr><th scope="col">No.</th><th scope="col">Project</th><th scope="col">Type</th><th scope="col">Location</th><th scope="col">Year</th></tr></thead>
        <tbody>
${PROJECTS.map(([n, name, type, city, , year]) => `          <tr><td>${n}</td><th scope="row">${name === "Vesterbro Loft" ? `<a href="/vesterbro-loft">${name}</a>` : name}</th><td>${type}</td><td>${city}</td><td>${year}</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>
    <p class="iv-index-note">A full list with drawings is available on request.</p>
  </div>
</section>

<section class="iv-sec" aria-labelledby="iv-num-h">
  <div class="iv-wrap iv-numbers">
    <h2 class="iv-sr" id="iv-num-h">Approach</h2>
    <blockquote class="iv-quote">
      <p>“Every room starts with one question: <em>where does the light fall at eight in the morning?</em> The rest follows from that.”</p>
      <footer>Ines Varga</footer>
    </blockquote>
    <dl class="iv-stats">
      <div><dt>Projects completed</dt><dd>32</dd></div>
      <div><dt>Years in practice</dt><dd>9</dd></div>
      <div><dt>Cities</dt><dd>7</dd></div>
      <div><dt>Awards and shortlists</dt><dd>4</dd></div>
    </dl>
  </div>
</section>

<section class="iv-sec" aria-labelledby="iv-press-h">
  <div class="iv-wrap">
    <div class="iv-sec-head"><h2 id="iv-press-h">Recognition</h2><p class="iv-cap-label">Selected</p></div>
    <ul class="iv-press">
      <li><span class="iv-press-year">2025</span><span><b>Northern Interiors Prize</b>, Residential, for Vesterbro Loft</span><span>Winner</span></li>
      <li><span class="iv-press-year">2024</span><span><b>Tegl Magazine</b>, “Twelve rooms that changed our minds”</span><span>Feature</span></li>
      <li><span class="iv-press-year">2024</span><span><b>Copenhagen Design Week</b>, talk on designing for daylight</span><span>Speaker</span></li>
      <li><span class="iv-press-year">2023</span><span><b>Nordic Hospitality Awards</b>, Small Space, for Kaffebar Ro</span><span>Shortlist</span></li>
    </ul>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const CASE_HTML = `
<div class="iv-page">
<nav aria-label="Main"></nav>
<header class="iv-case-head">
  <div class="iv-wrap">
    <a class="iv-back" href="/#work">← All work</a>
    <div class="iv-case-title">
      <h1>Vesterbro <em>Loft</em></h1>
      <p>A former print works on Istedgade turned into a light-filled home for a family of four, without losing the building's industrial bones.</p>
    </div>
  </div>
</header>

<main>
<div class="iv-wrap">
  <figure class="iv-case-hero">
    <img src="/media/generated/portfolio-vesterbro-loft.webp" alt="The finished loft: a grey sofa and a long white dining table under exposed ducts, with black steel windows" width="960" height="640">
    <figcaption>The living and dining space, looking west towards the new steel windows.</figcaption>
  </figure>

  <div class="iv-case-body">
    <dl class="iv-facts">
      <div><dt>Client</dt><dd>Private, family of four</dd></div>
      <div><dt>Location</dt><dd>Vesterbro, Copenhagen</dd></div>
      <div><dt>Area</dt><dd>142 m² on one floor</dd></div>
      <div><dt>Completed</dt><dd>May 2025</dd></div>
      <div><dt>Scope</dt><dd>Interior architecture, joinery, lighting</dd></div>
      <div><dt>Timeline</dt><dd>7 months design, 11 weeks on site</dd></div>
      <div><dt>Contractor</dt><dd>Holm &amp; Søn Byg</dd></div>
      <div><dt>Recognition</dt><dd>Northern Interiors Prize 2025</dd></div>
    </dl>

    <div class="iv-story">
      <section class="iv-chapter" aria-labelledby="iv-c1">
        <h2 id="iv-c1">The brief</h2>
        <p>The family had bought the top floor of a 1911 print works: one long, dark room with three small windows, a concrete floor and ducting everywhere. They wanted two bedrooms, a study for two parents who work from home, and a kitchen big enough for friends on a Friday night.</p>
        <p>Above all, they asked for a home that felt calm with two children under six in it.</p>
      </section>

      <section class="iv-chapter" aria-labelledby="iv-c2">
        <h2 id="iv-c2">The plan</h2>
        <p>We kept the living, kitchen and dining space as one volume along the new windows and gathered every closed room into a single timber "box" on the north side. Walls that did not carry anything came out.</p>
        <div class="iv-plan-wrap">
          <div class="iv-plan" role="img" aria-label="Floor plan. An open living room of 38 square metres and a kitchen and dining room of 31 square metres fill the south side. On the north side sit a bathroom, the main bedroom, a children's room, a study niche, the hall and storage.">
            <span class="iv-room iv-r-living"><b>Living</b>38 m²</span>
            <span class="iv-room iv-r-kitchen"><b>Kitchen &amp; dining</b>31 m²</span>
            <span class="iv-room iv-r-study"><b>Study</b>6 m²</span>
            <span class="iv-room iv-r-hall"><b>Hall</b>9 m²</span>
            <span class="iv-room iv-r-bath"><b>Bath</b>8 m²</span>
            <span class="iv-room iv-r-bed"><b>Bedroom</b>16 m²</span>
            <span class="iv-room iv-r-kids"><b>Children</b>14 m²</span>
            <span class="iv-room iv-r-store"><b>Store</b>4 m²</span>
          </div>
          <ul class="iv-plan-key">
            <li><b>Before</b><span>Five rooms off a dark corridor; only the kitchen had a window.</span></li>
            <li><b>After</b><span>One open south-facing space; every room borrows daylight through clerestory glass.</span></li>
            <li><b>Kept</b><span>The 1911 beams, the ducting and the concrete floor, now polished.</span></li>
          </ul>
        </div>
      </section>

      <section class="iv-chapter" aria-labelledby="iv-c3">
        <h2 id="iv-c3">Materials</h2>
        <p>Five materials, used everywhere, so the flat reads as one calm room. Nothing is painted that could be left as it is.</p>
        <ul class="iv-swatches">
          <li class="iv-swatch"><i class="iv-sw-oak"></i><b>Smoked oak</b><span>Floors and joinery</span></li>
          <li class="iv-swatch"><i class="iv-sw-lime"></i><b>Lime plaster</b><span>All new walls</span></li>
          <li class="iv-swatch"><i class="iv-sw-sage"></i><b>Sage linoleum</b><span>Desks and shelves</span></li>
          <li class="iv-swatch"><i class="iv-sw-steel"></i><b>Blackened steel</b><span>Windows and stair</span></li>
          <li class="iv-swatch"><i class="iv-sw-clay"></i><b>Clay tile</b><span>Kitchen and bath</span></li>
        </ul>
        <div class="iv-pair">
          <figure><img src="/media/generated/portfolio-loft-table.webp" alt="Late afternoon sun casting window shadows across a smoked oak dining table" width="959" height="640" loading="lazy"><figcaption>The oak table at 5 pm in April.</figcaption></figure>
          <figure><img src="/media/generated/portfolio-loft-lamp.webp" alt="A black floor lamp against a sage green wall" width="512" height="640" loading="lazy"><figcaption>The study niche, in sage.</figcaption></figure>
        </div>
      </section>

      <section class="iv-chapter" aria-labelledby="iv-c4">
        <h2 id="iv-c4">The result</h2>
        <p>The family moved back in after eleven weeks, on the day we promised. Measured at the dining table, daylight on a grey March morning is now more than three times what it was.</p>
        <dl class="iv-results">
          <div><dt>more daylight at the dining table</dt><dd>3.4×</dd></div>
          <div><dt>weeks on site, on schedule</dt><dd>11</dd></div>
          <div><dt>of the original structure kept</dt><dd>80%</dd></div>
        </dl>
        <blockquote class="iv-client">
          <p>“It still feels like the building it was, only now we can see our children from the kitchen.”</p>
          <footer>Mette and Jonas, the clients</footer>
        </blockquote>
      </section>
    </div>
  </div>
</div>

<section class="iv-wrap iv-next" aria-labelledby="iv-next-h">
  <div>
    <p class="iv-cap-label">Keep reading</p>
    <h2 id="iv-next-h"><a href="/about">Meet the studio <span aria-hidden="true">→</span></a></h2>
  </div>
  <img src="/media/generated/portfolio-reading-room.webp" alt="A leather butterfly chair in front of tall windows" width="512" height="640" loading="lazy">
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const ABOUT_HTML = `
<div class="iv-page">
<nav aria-label="Main"></nav>
<header class="iv-wrap iv-about-head">
  <figure class="iv-portrait">
    <img src="/media/generated/portfolio-ines-portrait.webp" alt="Portrait of Ines Varga smiling at her desk surrounded by brushes and material samples" width="480" height="600">
    <figcaption>In the studio on Ravnsborggade.</figcaption>
  </figure>
  <div class="iv-about-copy">
    <p class="iv-cap-label">About</p>
    <h1>Ines <em>Varga</em></h1>
    <p class="iv-bio-lead">I trained as an architect in Budapest and Copenhagen, spent five years designing hotels for a large practice, and opened my own studio in 2017 to work on smaller, more personal projects.</p>
    <p>Today the studio is me, one architect and a network of carpenters, metalworkers and upholsterers within an hour of Copenhagen. I draw every project myself and I am on site every week.</p>
    <dl class="iv-about-meta">
      <div><dt>Studio</dt><dd>Est. 2017</dd></div>
      <div><dt>Team</dt><dd>2 architects</dd></div>
      <div><dt>Languages</dt><dd>Danish, English, Hungarian</dd></div>
    </dl>
  </div>
</header>

<main>
<section class="iv-sec" aria-labelledby="iv-svc-h">
  <div class="iv-wrap">
    <div class="iv-sec-head"><h2 id="iv-svc-h">Services</h2><p class="iv-cap-label">Full service or a single stage</p></div>
    <ol class="iv-services">
      <li class="iv-service"><h3>Interior architecture</h3><p>Layouts, walls, light, heating and every surface, drawn to construction detail and managed on site.</p><span>Homes, cafés, offices</span></li>
      <li class="iv-service"><h3>Joinery &amp; furniture</h3><p>Kitchens, wardrobes, shelving and one-off pieces, built by local workshops I have worked with for years.</p><span>Oak, ash, linoleum, steel</span></li>
      <li class="iv-service"><h3>Lighting design</h3><p>Daylight studies, lighting plans and fixtures chosen so rooms work at 8 am and at 10 pm.</p><span>Daylight modelling included</span></li>
      <li class="iv-service"><h3>Consultations</h3><p>A two-hour visit with sketches and a written summary, for owners who want direction before hiring a builder.</p><span>DKK 3,500, credited to a full project</span></li>
    </ol>
  </div>
</section>

<section class="iv-sec" aria-labelledby="iv-proc-h">
  <div class="iv-wrap">
    <div class="iv-sec-head"><h2 id="iv-proc-h">How a project <em>runs</em></h2><p class="iv-cap-label">A typical home renovation</p></div>
    <ol class="iv-steps">
      <li class="iv-step"><small>Weeks 1–2</small><h3>Listen</h3><p>Two visits, a measured survey and a long conversation about how you live now.</p></li>
      <li class="iv-step"><small>Weeks 3–8</small><h3>Plan</h3><p>Two layout options, a materials palette and a first cost estimate you can check with a builder.</p></li>
      <li class="iv-step"><small>Weeks 9–16</small><h3>Detail</h3><p>Construction drawings, joinery, lighting and a tender to two or three contractors.</p></li>
      <li class="iv-step"><small>8–14 weeks</small><h3>Build</h3><p>Weekly site visits and one point of contact until the last shelf is fitted.</p></li>
    </ol>
    <div class="iv-fees">
      <div>
        <h3>Fees</h3>
        <p>A fixed fee for each stage, agreed before we start, so you always know what the next step costs. Most home projects land between 10% and 14% of the construction budget.</p>
      </div>
      <dl>
        <div><dt>First consultation</dt><dd>DKK 3,500</dd></div>
        <div><dt>Plan stage, home up to 150 m²</dt><dd>from DKK 45,000</dd></div>
        <div><dt>Full service</dt><dd>10–14% of build cost</dd></div>
        <div><dt>Joinery drawings only</dt><dd>from DKK 18,000</dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="iv-sec" aria-labelledby="iv-clients-h">
  <div class="iv-wrap">
    <div class="iv-sec-head"><h2 id="iv-clients-h">Clients &amp; <em>collaborators</em></h2><p class="iv-cap-label">Since 2017</p></div>
    <ul class="iv-clients">
      <li>Kaffebar Ro</li><li>Hotel Tanne</li><li>Nordlys Games</li><li>Bageri Solsort</li><li>Holm &amp; Søn Byg</li><li>Værksted 9</li><li>Linden Lighting</li><li>32 private homes</li>
    </ul>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const template: StarterTemplate = {
  id: "original-portfolio",
  name: "Ines Varga",
  tagline: "Interior architect portfolio with an offset work grid, project index, a case study with a drawn floor plan, and enquiries",
  category: "portfolio",
  tags: ["portfolio", "interior design", "architect", "case study", "designer", "personal", "work", "projects", "studio", "minimal"],
  source: "original",
  modules: ["contact-form"],
  theme: {
    name: "Ines Varga",
    mode: "light",
    primary: "#8a4b2d",
    primary2: "#6f3b22",
    accent: "#5e7563",
    bg: "#f6f4f0",
    surface: "#fbfaf7",
    surface2: "#ece8e1",
    border: "#dcd6cc",
    text: "#1d1c1a",
    textMuted: "#5d5953",
    font: `"Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    fontDisplay: `"Instrument Serif", Georgia, "Times New Roman", serif`,
    googleFonts: ["Instrument Serif:ital@0;1", "Instrument Sans:wght@400;500;600"],
    radius: "0px",
    radiusSm: "0px",
    dark: {
      name: "Ines Varga Night",
      mode: "dark",
      primary: "#d4926c",
      primary2: "#e0a887",
      accent: "#93b19a",
      bg: "#141312",
      surface: "#1b1a18",
      surface2: "#24221f",
      border: "#35322d",
      text: "#efebe4",
      textMuted: "#aca598",
      font: `"Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      fontDisplay: `"Instrument Serif", Georgia, "Times New Roman", serif`,
      googleFonts: ["Instrument Serif:ital@0;1", "Instrument Sans:wght@400;500;600"],
      radius: "0px",
      radiusSm: "0px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: BASE_CSS + NAV_CSS + HOME_CSS },
    { title: "Vesterbro Loft", slug: "vesterbro-loft", isHome: false, html: CASE_HTML, css: BASE_CSS + NAV_CSS + CASE_CSS },
    { title: "About", slug: "about", isHome: false, html: ABOUT_HTML, css: BASE_CSS + NAV_CSS + ABOUT_CSS },
  ],
};

registerTemplate(template);
export default template;
