/**
 * Big Weather — Creative studio flagship (original-creative)
 *
 * Art direction
 * - Mood: loud, confident, a little cheeky. An independent Glasgow brand, motion and
 *   signage studio that designs for bars, venues, festivals and one large railway.
 * - Type: Anton (condensed, all caps, poster scale) for display; Inter Tight for text.
 * - Palette: ink #0d0d0d and bone #f2efe7, hot magenta #c80066 for actions, acid lime
 *   #d4f53c as the highlight colour (always under ink text, never as text on bone).
 * - Layout grammar: poster-scale headlines with inline image "pills" set into the type,
 *   full-bleed ink bands, outlined numerals, hard edges with the odd rotated sticker.
 * - Signature: the headline with images inside it, the static ticker band, and the
 *   typographic work index (huge project names, disciplines, year and a thumbnail;
 *   rows turn lime on hover). The Work page alternates big case layouts; the Studio
 *   page has the process, a manifesto and open roles.
 * - Pages: Home, Work, Studio.
 * - Modules: quote-request (send a brief) and jobs (careers, seeded with studio roles).
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";


/* ── Shared CSS ─────────────────────────────────────────────────────── */
const BASE_CSS = `
.bw-page{font-size:1.02rem;line-height:1.6}
.bw-wrap{width:min(1320px,100% - 40px);margin-inline:auto}
.bw-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.bw-page h1,.bw-page h2,.bw-page h3{text-transform:uppercase;font-weight:400;letter-spacing:.005em}
.bw-mega{margin:0;font-family:var(--nk-font-display);font-size:clamp(3.4rem,11vw,11.5rem);line-height:.86;text-transform:uppercase}
.bw-label{margin:0;font-family:var(--nk-font);font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.bw-h2{margin:0;font-size:clamp(2.6rem,6vw,5.6rem);line-height:.9}
.bw-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:0 26px;border-radius:999px;font-weight:700;font-size:1rem;text-decoration:none;border:2px solid transparent;transition:background-color .2s,color .2s,border-color .2s,transform .2s}
.bw-btn:hover{text-decoration:none;transform:rotate(-2deg)}
.bw-btn-ink{background:var(--nk-text);color:var(--nk-bg)}
.bw-btn-ink:hover{background:var(--nk-primary);color:var(--nk-bg)}
.bw-btn-hot{background:var(--nk-primary);color:var(--nk-bg)}
.bw-btn-hot:hover{background:var(--nk-primary-2);color:var(--nk-bg)}
.bw-btn-line{color:var(--nk-text);border-color:var(--nk-text)}
.bw-btn-line:hover{background:var(--nk-accent);color:var(--nk-text)}
.bw-hero-actions{display:flex;flex-wrap:wrap;gap:12px}
.bw-page a:focus-visible,.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.bw-ink a:focus-visible{outline-color:var(--nk-accent)}
.bw-ink{background:var(--nk-text);color:var(--nk-bg)}
.bw-ink h2,.bw-ink h3{color:var(--nk-bg)}
.bw-cta{padding:clamp(64px,9vw,128px) 0;background:var(--nk-accent);color:var(--nk-text)}
.bw-cta-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:32px 64px;align-items:end}
.bw-cta h2{margin:0;font-size:clamp(3.6rem,12vw,11rem);line-height:.84}
.bw-cta p{margin:0 0 22px;font-size:1.12rem;max-width:40ch}
.bw-cta-mail{display:block;margin-top:18px;font-weight:700;color:var(--nk-text);overflow-wrap:anywhere}
.bw-cta-mail:hover{color:var(--nk-primary-2)}
@media (max-width:860px){.bw-cta-grid{grid-template-columns:minmax(0,1fr)}}
.bw-footer{padding:56px 0 0;background:var(--nk-text);color:color-mix(in srgb,var(--nk-bg) 78%,var(--nk-text));overflow:hidden}
.bw-foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:28px}
.bw-foot-grid p{margin:0}
.bw-foot-h{margin:0 0 12px!important;font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-accent)}
.bw-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.bw-footer a{color:var(--nk-bg);text-decoration:none}
.bw-footer a:hover{color:var(--nk-accent);text-decoration:underline}
.bw-footer a:focus-visible{outline-color:var(--nk-accent)}
.bw-wordmark{margin:48px 0 -0.14em;font-family:var(--nk-font-display);font-size:clamp(4rem,19.5vw,19rem);line-height:1;text-transform:uppercase;color:var(--nk-bg);white-space:nowrap;text-align:center}
.bw-foot-base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;margin-top:32px;padding:18px 0;border-top:1px solid color-mix(in srgb,var(--nk-bg) 20%,transparent);font-size:.85rem}
@media (max-width:860px){.bw-foot-grid{grid-template-columns:1fr 1fr}}
@media (max-width:460px){.bw-foot-grid{grid-template-columns:minmax(0,1fr)}}
`;

const NAV_CSS = `
.nk-nav{padding-block:14px!important;background:var(--nk-text)!important;border-bottom:0!important;position:relative;z-index:20}
.nk-nav>.container{max-width:1320px}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-weight:400!important;font-size:1.7rem;letter-spacing:.02em;text-transform:uppercase;color:var(--nk-bg)!important}
.nk-nav .navbar-brand::after{content:"";display:inline-block;width:.42em;height:.42em;margin-left:.18em;border-radius:50%;background:var(--nk-accent)}
.nk-nav .nav-link{color:var(--nk-bg)!important;font-weight:700!important;font-size:.82rem;letter-spacing:.12em;text-transform:uppercase;padding:9px 16px!important;border-radius:999px}
.nk-nav .nav-link:hover{background:color-mix(in srgb,var(--nk-bg) 14%,transparent);text-decoration:none}
.nk-nav .nav-link.active{background:var(--nk-accent);color:var(--nk-text)!important}
.nk-nav .btn{background:var(--nk-primary)!important;color:var(--nk-bg)!important;border-radius:999px!important;font-weight:700}
.nk-nav .navbar-toggler{padding:8px 18px!important;border-radius:999px!important;border:0!important;background-color:var(--nk-accent)!important;color:var(--nk-text)!important;font-size:0;line-height:1}
.nk-nav .navbar-toggler::before{content:"Menu";font-family:var(--nk-font-display);font-size:1.15rem;letter-spacing:.04em;text-transform:uppercase}
.nk-nav .navbar-toggler[aria-expanded="true"]::before{content:"Close"}
.nk-nav .navbar-toggler>*{display:none!important}
.nk-nav .dropdown-menu{border-radius:14px;padding:8px;background:var(--nk-text)!important;border:1px solid color-mix(in srgb,var(--nk-bg) 22%,transparent)!important}
.nk-nav .dropdown-item{border-radius:8px;padding:9px 14px;color:var(--nk-bg)!important;font-weight:600}
.nk-nav .dropdown-item:hover,.nk-nav .dropdown-item:focus{background:var(--nk-accent);color:var(--nk-text)!important}
.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline-color:var(--nk-accent)!important}
@media (min-width:992px){.nk-nav .dropdown{position:relative}.nk-nav .dropdown-menu-end{right:0;left:auto}}
@media (max-width:991.98px){.nk-nav .navbar-collapse{margin-top:14px;padding-top:8px;border-top:1px solid color-mix(in srgb,var(--nk-bg) 22%,transparent)}.nk-nav .nav-link{padding:12px 14px!important;font-family:var(--nk-font-display);font-weight:400!important;font-size:1.6rem;letter-spacing:.02em}}
`;

/* ── Home ───────────────────────────────────────────────────────────── */
const HOME_CSS = `
.bw-hero{padding:clamp(28px,4vw,56px) 0 clamp(48px,6vw,80px)}
.bw-hero-meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 24px;padding-bottom:18px;margin-bottom:clamp(24px,3vw,40px);border-bottom:2px solid var(--nk-text)}
.bw-live{display:inline-flex;align-items:center;gap:10px}
.bw-live::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--nk-primary)}
.bw-mega .bw-pill{display:inline-block;width:1.9em;height:.78em;margin:0 .08em;vertical-align:-.02em;border-radius:999px;object-fit:cover;border:.05em solid var(--nk-text)}
.bw-mega .bw-pill-round{width:.8em}
.bw-mega em{font-style:normal;color:var(--nk-primary)}
.bw-hero-foot{display:grid;grid-template-columns:minmax(0,1.2fr) auto auto;gap:24px 40px;align-items:center;margin-top:clamp(28px,4vw,48px)}
.bw-lede{margin:0;font-size:1.15rem;max-width:52ch}
.bw-sticker{display:grid;place-items:center;width:132px;height:132px;margin:0;padding:18px;border-radius:50%;background:var(--nk-accent);text-align:center;font-family:var(--nk-font-display);font-size:1.25rem;line-height:1;text-transform:uppercase;transform:rotate(-12deg)}
@media (max-width:980px){.bw-hero-foot{grid-template-columns:minmax(0,1fr) auto}.bw-hero-actions{grid-column:1}.bw-sticker{grid-row:1/3;grid-column:2}}
@media (max-width:560px){.bw-hero-foot{grid-template-columns:minmax(0,1fr)}.bw-sticker{display:none}}
.bw-ticker{padding:22px 0;overflow:hidden;border-block:2px solid var(--nk-text)}
.bw-ticker p{margin:0;white-space:nowrap;font-family:var(--nk-font-display);font-size:clamp(2rem,4.4vw,3.8rem);line-height:1;text-transform:uppercase}
.bw-ticker span{color:transparent;-webkit-text-stroke:1.5px var(--nk-bg)}
.bw-ticker b{font-weight:400;color:var(--nk-accent);margin:0 .3em}
.bw-index{padding:clamp(56px,8vw,112px) 0}
.bw-index-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:16px 32px;margin-bottom:32px}
.bw-index-head a{color:var(--nk-accent);font-weight:700;text-decoration-line:underline;text-underline-offset:6px}
.bw-rows{list-style:none;margin:0;padding:0;border-top:1px solid color-mix(in srgb,var(--nk-bg) 30%,transparent)}
.bw-row{display:grid;grid-template-columns:64px minmax(0,1fr) minmax(0,.9fr) 70px 170px;gap:8px 28px;align-items:center;padding:18px 16px 18px 8px;color:var(--nk-bg);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--nk-bg) 30%,transparent);transition:background-color .2s,color .2s}
.bw-row:hover{background:var(--nk-accent);color:var(--nk-text);text-decoration:none}
.bw-row-no{font-family:var(--nk-font-display);font-size:1.6rem;color:transparent;-webkit-text-stroke:1.2px var(--nk-bg)}
.bw-row:hover .bw-row-no{-webkit-text-stroke-color:var(--nk-text)}
.bw-row-name{font-family:var(--nk-font-display);font-size:clamp(2.4rem,5.6vw,5.2rem);line-height:.95;text-transform:uppercase}
.bw-row-what{font-size:.95rem;font-weight:600}
.bw-row-year{font-weight:700;text-align:right}
.bw-row img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:8px}
@media (max-width:900px){.bw-row{grid-template-columns:40px minmax(0,1fr) 110px;padding:16px 8px}.bw-row-name{grid-column:2}.bw-row-what{grid-column:2;grid-row:2}.bw-row-year{grid-column:1;grid-row:2;text-align:left;font-size:.9rem}.bw-row img{grid-column:3;grid-row:1/3}}
@media (max-width:480px){.bw-row{grid-template-columns:30px minmax(0,1fr) 84px;gap:6px 12px}.bw-row-no{font-size:1rem}.bw-row-name{font-size:2.1rem}}
.bw-feature{padding:clamp(64px,9vw,120px) 0}
.bw-feature-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:40px 56px;align-items:center}
.bw-feature-fig{margin:0;position:relative}
.bw-feature-fig img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:18px}
.bw-feature-fig figcaption{position:absolute;left:18px;bottom:18px;padding:8px 14px;border-radius:999px;background:var(--nk-text);color:var(--nk-bg);font-weight:700;font-size:.85rem}
.bw-feature-copy .bw-h2{font-size:clamp(2.4rem,4.6vw,4.6rem)}
.bw-feature-copy p{margin:18px 0 0;font-size:1.08rem;max-width:48ch}
.bw-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:30px 0 0}
.bw-stats div{display:flex;flex-direction:column-reverse;justify-content:flex-end;gap:6px;padding:18px 16px;border-radius:14px;background:var(--nk-surface);border:2px solid var(--nk-text)}
.bw-stats div:nth-child(2){background:var(--nk-accent)}
.bw-stats div:nth-child(3){background:var(--nk-text);color:var(--nk-bg)}
.bw-stats dd{margin:0;font-family:var(--nk-font-display);font-size:clamp(2rem,3.4vw,2.8rem);line-height:1}
.bw-stats dt{font-size:.85rem;font-weight:600;line-height:1.3}
@media (max-width:900px){.bw-feature-grid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:420px){.bw-stats{grid-template-columns:minmax(0,1fr)}}
.bw-caps{padding:clamp(56px,8vw,112px) 0;border-top:2px solid var(--nk-text)}
.bw-caps-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin-top:40px;border-top:2px solid var(--nk-text)}
.bw-cap{padding:26px 24px 8px 0}
.bw-cap+.bw-cap{padding-left:24px;border-left:2px solid var(--nk-text)}
.bw-cap-no{display:block;font-family:var(--nk-font-display);font-size:4.6rem;line-height:1;color:transparent;-webkit-text-stroke:2px var(--nk-text)}
.bw-cap h3{margin:14px 0 0;font-size:2rem;line-height:1}
.bw-cap p{margin:10px 0 0;font-size:.97rem}
.bw-cap ul{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.bw-cap li{padding:4px 11px;border-radius:999px;border:1.5px solid var(--nk-text);font-size:.82rem;font-weight:600}
@media (max-width:980px){.bw-caps-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bw-cap:nth-child(3){border-left:0;padding-left:0}.bw-cap:nth-child(n+3){border-top:2px solid var(--nk-text);margin-top:12px}}
@media (max-width:560px){.bw-caps-grid{grid-template-columns:minmax(0,1fr)}.bw-cap,.bw-cap+.bw-cap{padding:22px 0 8px;border-left:0}.bw-cap+.bw-cap{border-top:2px solid var(--nk-text);margin-top:0}}
.bw-clients{padding:clamp(48px,7vw,96px) 0;background:var(--nk-surface-2)}
.bw-clients ul{list-style:none;margin:24px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px 18px;font-family:var(--nk-font-display);font-size:clamp(1.8rem,4vw,3.4rem);line-height:1.15;text-transform:uppercase}
.bw-clients li::after{content:"/";margin-left:18px;color:var(--nk-primary)}
.bw-clients li:last-child::after{content:none}
.bw-studio{padding:clamp(64px,9vw,120px) 0}
.bw-studio-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:40px 64px;align-items:center}
.bw-studio-copy p{margin:18px 0 0;font-size:1.08rem;color:color-mix(in srgb,var(--nk-bg) 82%,var(--nk-text));max-width:46ch}
.bw-awards{list-style:none;margin:26px 0 0;padding:0;border-top:1px solid color-mix(in srgb,var(--nk-bg) 30%,transparent)}
.bw-awards li{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid color-mix(in srgb,var(--nk-bg) 30%,transparent);font-weight:600}
.bw-awards span{color:var(--nk-accent)}
.bw-studio-fig{margin:0}
.bw-studio-fig img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:18px}
.bw-studio .bw-btn-line{color:var(--nk-bg);border-color:var(--nk-bg);margin-top:28px}
.bw-studio .bw-btn-line:hover{color:var(--nk-text)}
@media (max-width:900px){.bw-studio-grid{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Work ───────────────────────────────────────────────────────────── */
const PAGE_HEAD_CSS = `
.bw-phead{padding:clamp(32px,5vw,64px) 0 clamp(40px,6vw,72px);border-bottom:2px solid var(--nk-text)}
.bw-phead-row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:20px 40px;margin-top:clamp(20px,3vw,32px)}
.bw-phead-row p{margin:0;max-width:44ch;font-size:1.1rem}
`;

const WORK_CSS = `
.bw-proj{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:28px 32px;align-items:center;padding:clamp(48px,7vw,96px) 0;border-bottom:2px solid var(--nk-text);scroll-margin-top:16px}
.bw-proj figure{margin:0}
.bw-proj img{display:block;width:100%;height:auto;object-fit:cover;border-radius:18px}
.bw-proj-a figure{grid-column:1/9}.bw-proj-a .bw-proj-copy{grid-column:9/13}
.bw-proj-b figure{grid-column:5/13;grid-row:1}.bw-proj-b .bw-proj-copy{grid-column:1/5;grid-row:1}
.bw-proj-c figure{grid-column:2/7}.bw-proj-c .bw-proj-copy{grid-column:8/13}
.bw-proj-a img,.bw-proj-b img{aspect-ratio:3/2}
.bw-proj-c img{aspect-ratio:4/5}
.bw-proj-no{display:block;font-family:var(--nk-font-display);font-size:3.2rem;line-height:1;color:transparent;-webkit-text-stroke:2px var(--nk-primary)}
.bw-proj h2{margin:10px 0 0;font-size:clamp(2.6rem,5vw,4.4rem);line-height:.9}
.bw-proj-client{margin:10px 0 0;font-weight:700}
.bw-chips{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:16px 0 0;padding:0}
.bw-chips li{padding:4px 11px;border-radius:999px;background:var(--nk-accent);font-size:.8rem;font-weight:700}
.bw-proj-copy>p:not(.bw-proj-client){margin:16px 0 0}
.bw-proj-results{margin:18px 0 0;display:grid;gap:8px}
.bw-proj-results div{display:flex;gap:12px;align-items:baseline;padding-top:8px;border-top:1px solid var(--nk-border)}
.bw-proj-results dt{order:2;font-size:.92rem}
.bw-proj-results dd{margin:0;font-family:var(--nk-font-display);font-size:1.6rem;line-height:1;color:var(--nk-primary)}
@media (max-width:900px){.bw-proj-a figure,.bw-proj-b figure,.bw-proj-c figure,.bw-proj-a .bw-proj-copy,.bw-proj-b .bw-proj-copy,.bw-proj-c .bw-proj-copy{grid-column:1/-1;grid-row:auto}.bw-proj-c figure{max-width:460px}}
.bw-archive{padding:clamp(56px,8vw,104px) 0}
.bw-archive-list{list-style:none;margin:32px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 32px}
.bw-archive-list li{display:flex;justify-content:space-between;gap:12px;padding:16px 0;border-bottom:1px solid color-mix(in srgb,var(--nk-bg) 30%,transparent)}
.bw-archive-list b{font-family:var(--nk-font-display);font-weight:400;font-size:1.5rem;text-transform:uppercase;line-height:1.1}
.bw-archive-list span{color:var(--nk-accent);font-weight:600;white-space:nowrap}
@media (max-width:900px){.bw-archive-list{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Studio ─────────────────────────────────────────────────────────── */
const STUDIO_CSS = `
.bw-team{margin:0}
.bw-team img{display:block;width:100%;height:auto;aspect-ratio:21/9;object-fit:cover}
.bw-team figcaption{padding:12px 0 0;font-size:.9rem}
@media (max-width:640px){.bw-team img{aspect-ratio:4/3}}
.bw-proc{padding:clamp(56px,8vw,112px) 0}
.bw-steps{list-style:none;margin:40px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.bw-step{padding:24px;border-radius:18px;border:2px solid var(--nk-text);background:var(--nk-surface)}
.bw-step:nth-child(2){background:var(--nk-accent)}
.bw-step:nth-child(4){background:var(--nk-text);color:var(--nk-bg)}
.bw-step:nth-child(4) h3{color:var(--nk-bg)}
.bw-step small{display:block;font-weight:700;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase}
.bw-step h3{margin:16px 0 0;font-size:3rem;line-height:.9}
.bw-step p{margin:12px 0 0;font-size:.97rem}
@media (max-width:980px){.bw-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.bw-steps{grid-template-columns:minmax(0,1fr)}}
.bw-manifesto{padding:clamp(56px,8vw,112px) 0}
.bw-beliefs{list-style:none;margin:32px 0 0;padding:0;counter-reset:bwb}
.bw-beliefs li{display:grid;grid-template-columns:90px minmax(0,1fr);gap:12px 24px;align-items:baseline;padding:22px 0;border-bottom:1px solid color-mix(in srgb,var(--nk-bg) 28%,transparent);counter-increment:bwb}
.bw-beliefs li::before{content:"0" counter(bwb);font-family:var(--nk-font-display);font-size:2rem;color:var(--nk-accent)}
.bw-beliefs b{display:block;font-family:var(--nk-font-display);font-weight:400;font-size:clamp(2rem,4.4vw,3.6rem);line-height:.95;text-transform:uppercase}
.bw-beliefs span{display:block;margin-top:10px;color:color-mix(in srgb,var(--nk-bg) 80%,var(--nk-text));max-width:62ch}
@media (max-width:560px){.bw-beliefs li{grid-template-columns:minmax(0,1fr)}}
.bw-craft{padding:clamp(56px,8vw,112px) 0}
.bw-craft-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px 64px;align-items:center}
.bw-craft-grid figure{margin:0}
.bw-craft-grid img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:18px}
.bw-craft-copy p{margin:18px 0 0;font-size:1.08rem}
.bw-tools{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin:22px 0 0;padding:0}
.bw-tools li{padding:6px 14px;border-radius:999px;border:2px solid var(--nk-text);font-weight:700;font-size:.88rem}
@media (max-width:900px){.bw-craft-grid{grid-template-columns:minmax(0,1fr)}}
.bw-wall{margin:0}
.bw-wall img{display:block;width:100%;height:auto;aspect-ratio:3/1;object-fit:cover}
.bw-wall figcaption{padding:12px 20px;font-size:.9rem}
@media (max-width:640px){.bw-wall img{aspect-ratio:2/1}}
.bw-jobs{padding:clamp(56px,8vw,112px) 0}
.bw-jobs-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:32px 64px;align-items:start}
.bw-jobs-grid p{margin:18px 0 0;font-size:1.08rem}
.bw-openings{list-style:none;margin:0;padding:0;border-top:2px solid var(--nk-text)}
.bw-openings li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 16px;padding:18px 0;border-bottom:2px solid var(--nk-text)}
.bw-openings b{font-family:var(--nk-font-display);font-weight:400;font-size:1.9rem;text-transform:uppercase;line-height:1}
.bw-openings span{font-weight:600}
@media (max-width:900px){.bw-jobs-grid{grid-template-columns:minmax(0,1fr)}}
`;

/* ── Shared HTML ────────────────────────────────────────────────────── */
const CTA_HTML = `
<section class="bw-cta" aria-labelledby="bw-cta-h">
  <div class="bw-wrap bw-cta-grid">
    <h2 id="bw-cta-h">Got a brief?</h2>
    <div>
      <p>Tell us what you're opening, launching or fixing. We reply to every brief within two working days, even when the answer is no.</p>
      <a class="bw-btn bw-btn-hot" href="/quote">Send it over</a>
      <a class="bw-cta-mail" href="mailto:hello@bigweather.example">hello@bigweather.example</a>
    </div>
  </div>
</section>`;

const FOOTER_HTML = `
<footer class="bw-footer">
  <div class="bw-wrap">
    <div class="bw-foot-grid">
      <div><p class="bw-foot-h">Studio</p><p>Unit 3, The Old Bakery<br>112 Duke Street<br>Glasgow G4 0UW</p></div>
      <div><p class="bw-foot-h">Pages</p><ul><li><a href="/work">Work</a></li><li><a href="/studio">Studio</a></li><li><a href="/careers">Careers</a></li></ul></div>
      <div><p class="bw-foot-h">New work</p><ul><li><a href="/quote">Send a brief</a></li><li><a href="mailto:hello@bigweather.example">hello@bigweather.example</a></li></ul></div>
      <div><p class="bw-foot-h">Say hi</p><ul><li><a href="tel:+441415550126">0141 555 0126</a></li><li>Mon–Fri, 9.30–6</li></ul></div>
    </div>
    <p class="bw-wordmark" aria-hidden="true">Big Weather</p>
    <div class="bw-foot-base"><p>© 2026 Big Weather Studio Ltd, Glasgow</p><p>Independent since 2016</p></div>
  </div>
</footer>`;

/* ── Pages ──────────────────────────────────────────────────────────── */
const ROWS: Array<[string, string, string, string, string]> = [
  ["parlour", "Parlour", "Identity · Neon · Menus", "2025", "/media/generated/creative-parlour.webp"],
  ["northline", "Northline Rail", "Rebrand · Motion system", "2025", "/media/generated/creative-northline-waves.webp"],
  ["home-cooking", "Home Cooking", "Naming · Identity · Signage", "2024", "/media/generated/creative-home-cooking.webp"],
  ["no-33", "No. 33", "Identity · Pattern · Print", "2024", "/media/generated/creative-no-33.webp"],
  ["low-tide", "Low Tide Festival", "Campaign · Posters · Motion", "2023", "/media/generated/creative-low-tide.webp"],
];

const HOME_HTML = `
<div class="bw-page">
<nav aria-label="Main"></nav>
<header class="bw-hero">
  <div class="bw-wrap">
    <div class="bw-hero-meta">
      <p class="bw-label">Brand · Motion · Signage</p>
      <p class="bw-label">Glasgow · Est. 2016</p>
      <p class="bw-label bw-live">Booking briefs for spring 2027</p>
    </div>
    <h1 class="bw-mega">Brands for <img class="bw-pill" src="/media/generated/creative-parlour.webp" alt="" width="960" height="640"> places people <img class="bw-pill bw-pill-round" src="/media/generated/creative-no-33.webp" alt="" width="512" height="640"> <em>actually</em> go.</h1>
    <div class="bw-hero-foot">
      <p class="bw-lede">Big Weather is an independent studio of 14 designers, animators and makers. We build identities, motion and signage for bars, venues, festivals and one very large railway.</p>
      <div class="bw-hero-actions">
        <a class="bw-btn bw-btn-ink" href="/work">See the work</a>
        <a class="bw-btn bw-btn-line" href="/quote">Send a brief</a>
      </div>
      <p class="bw-sticker">12 awards, 0 stock logos</p>
    </div>
  </div>
</header>

<main>
<div class="bw-ticker bw-ink" aria-hidden="true">
  <p><span>Identity</span><b>✺</b><span>Motion</span><b>✺</b><span>Neon &amp; signage</span><b>✺</b><span>Campaigns</span><b>✺</b><span>Naming</span><b>✺</b><span>Wayfinding</span><b>✺</b><span>Identity</span><b>✺</b><span>Motion</span></p>
</div>

<section class="bw-index bw-ink" aria-labelledby="bw-index-h">
  <div class="bw-wrap">
    <div class="bw-index-head">
      <h2 class="bw-h2" id="bw-index-h">Selected work</h2>
      <a href="/work">Every project in detail →</a>
    </div>
    <ol class="bw-rows">
${ROWS.map(([id, name, what, year, img], i) => `      <li><a class="bw-row" href="/work#${id}"><span class="bw-row-no">0${i + 1}</span><span class="bw-row-name">${name}</span><span class="bw-row-what">${what}</span><span class="bw-row-year">${year}</span><img src="${img}" alt="" width="${img === "/media/generated/creative-no-33.webp" ? 512 : 960}" height="640" loading="lazy"></a></li>`).join("\n")}
    </ol>
  </div>
</section>

<section class="bw-feature" aria-labelledby="bw-feature-h">
  <div class="bw-wrap bw-feature-grid">
    <figure class="bw-feature-fig">
      <img src="/media/generated/creative-northline-waves.webp" alt="A still from the Northline Rail motion identity: layered waves in signal red, navy and sky blue" width="960" height="640" loading="lazy">
      <figcaption>Northline Rail · motion system · 2025</figcaption>
    </figure>
    <div class="bw-feature-copy">
      <p class="bw-label">Featured project</p>
      <h2 class="bw-h2" id="bw-feature-h">One wave, sixty-four stations.</h2>
      <p>Northline asked for a rebrand that people would notice on a grey platform at 7 am. We built the whole identity from a single moving line, the route map itself, so every screen, train and timetable carries it.</p>
      <dl class="bw-stats">
        <div><dt>stations rebranded in 14 months</dt><dd>64</dd></div>
        <div><dt>trains wrapped without a single day out of service</dt><dd>212</dd></div>
        <div><dt>more people who noticed the new trains, in surveys</dt><dd>3×</dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="bw-caps" aria-labelledby="bw-caps-h">
  <div class="bw-wrap">
    <h2 class="bw-h2" id="bw-caps-h">What we make</h2>
    <div class="bw-caps-grid">
      <article class="bw-cap"><span class="bw-cap-no" aria-hidden="true">01</span><h3>Identity</h3><p>Names, logos and whole visual systems that still work at 2 cm and 20 metres.</p><ul><li>Naming</li><li>Logos</li><li>Type</li><li>Guidelines</li></ul></article>
      <article class="bw-cap"><span class="bw-cap-no" aria-hidden="true">02</span><h3>Motion</h3><p>Idents, screens and social loops, animated in-house by people who also draw.</p><ul><li>Idents</li><li>Screens</li><li>Social</li></ul></article>
      <article class="bw-cap"><span class="bw-cap-no" aria-hidden="true">03</span><h3>Signage</h3><p>Neon, hand-painted and wayfinding signs, made with fabricators we have used for years.</p><ul><li>Neon</li><li>Wayfinding</li><li>Murals</li></ul></article>
      <article class="bw-cap"><span class="bw-cap-no" aria-hidden="true">04</span><h3>Campaigns</h3><p>Launch campaigns for openings and festivals, from posters to the last Instagram story.</p><ul><li>Posters</li><li>Launches</li><li>Print</li></ul></article>
    </div>
  </div>
</section>

<section class="bw-clients" aria-labelledby="bw-clients-h">
  <div class="bw-wrap">
    <h2 class="bw-label" id="bw-clients-h">Some of the people we've made things for</h2>
    <ul>
      <li>Northline Rail</li><li>Parlour</li><li>Low Tide Festival</li><li>Home Cooking</li><li>Glasgow Film Fortnight</li><li>No. 33</li><li>Kelvin Brewing</li><li>The Barras Night Market</li>
    </ul>
  </div>
</section>

<section class="bw-studio bw-ink" aria-labelledby="bw-studio-h">
  <div class="bw-wrap bw-studio-grid">
    <div class="bw-studio-copy">
      <p class="bw-label">The studio</p>
      <h2 class="bw-h2" id="bw-studio-h">14 people. One old bakery. No account managers.</h2>
      <p>You talk to the people doing the work, from the first call to the last sign going up. It's slower to explain and much faster to do.</p>
      <ul class="bw-awards">
        <li>Scottish Design Collective, Studio of the Year<span>2025</span></li>
        <li>Brand Impact Prize, Transport<span>2025</span></li>
        <li>Neon &amp; Sign Guild, Best in Show<span>2024</span></li>
      </ul>
      <a class="bw-btn bw-btn-line" href="/studio">Meet the studio</a>
    </div>
    <figure class="bw-studio-fig"><img src="/media/generated/creative-studio-team.webp" alt="Three people around a wooden studio table with laptops, notebooks and iced drinks" width="960" height="640" loading="lazy"></figure>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

type Project = { id: string; layout: "a" | "b" | "c"; name: string; client: string; chips: string[]; body: string; results: [string, string][]; img: string; w: number; h: number; alt: string };
const PROJECTS: Project[] = [
  { id: "parlour", layout: "a", name: "Parlour", client: "A late-night cocktail bar on Sauchiehall Street", chips: ["Identity", "Neon", "Menus"], body: "Parlour wanted to feel like a secret you had been let in on. We drew a looping script that works as a neon sign, a stamp and a coaster, and hid the bar's name in the pattern of the menu.", results: [["+46%", "covers in the first six months"], ["1", "sign, now the most photographed on the street"]], img: "/media/generated/creative-parlour.webp", w: 960, h: 640, alt: "The Parlour neon flourish glowing red in a dark window" },
  { id: "northline", layout: "b", name: "Northline Rail", client: "A regional rail operator with 64 stations", chips: ["Rebrand", "Motion system", "Wayfinding"], body: "A new identity built from one moving line, the route map itself. It animates on station screens, wraps the trains and tells you which platform to run for.", results: [["212", "trains wrapped with no days out of service"], ["3×", "more people noticed the new livery"]], img: "/media/generated/creative-northline-waves.webp", w: 960, h: 640, alt: "Layered red, navy and sky-blue waves from the Northline motion identity" },
  { id: "no-33", layout: "c", name: "No. 33", client: "A 12-room guesthouse in an old tiled townhouse", chips: ["Identity", "Pattern", "Print"], body: "The building's front wall was already a masterpiece of painted cubes, so we made it the brand: one pattern, three blues and the house number as the logo.", results: [["92%", "of guests book direct, not through agencies"], ["3", "blues, used on everything"]], img: "/media/generated/creative-no-33.webp", w: 512, h: 640, alt: "A wall painted with blue isometric cubes and a small tiled plaque" },
  { id: "home-cooking", layout: "a", name: "Home Cooking", client: "A group of three neighbourhood restaurants", chips: ["Naming", "Identity", "Signage"], body: "The owners' grandmother ran a café called Home Cooking in 1971. We kept the name, redrew the lettering from an old photo and turned it into neon, menus and a very good tea towel.", results: [["3", "restaurants opened in 18 months"], ["4,000", "tea towels sold at the counter"]], img: "/media/generated/creative-home-cooking.webp", w: 960, h: 640, alt: "A red and orange neon sign shaped like a steaming bowl glowing in a dark café window" },
  { id: "low-tide", layout: "b", name: "Low Tide Festival", client: "A three-day music festival on the Clyde", chips: ["Campaign", "Posters", "Motion"], body: "A hand-painted campaign made with the sign painters who letter the festival's bars and stages, so the posters and the site look like they came from the same hand.", results: [["Sold out", "in nine days, a festival record"], ["38", "painted signs across the site"]], img: "/media/generated/creative-low-tide.webp", w: 960, h: 640, alt: "Weathered boards hand-painted with bold red and cobalt wave and sun shapes" },
];

const WORK_HTML = `
<div class="bw-page">
<nav aria-label="Main"></nav>
<header class="bw-phead">
  <div class="bw-wrap">
    <h1 class="bw-mega">Work</h1>
    <div class="bw-phead-row">
      <p class="bw-label">Five projects · 2023–2025</p>
      <p>Identities, motion and signage for places with doors. Ask us for the full archive; it's longer and has more neon in it.</p>
    </div>
  </div>
</header>

<main>
<div class="bw-wrap">
${PROJECTS.map((p, i) => `  <article class="bw-proj bw-proj-${p.layout}" id="${p.id}" aria-labelledby="bw-${p.id}-h">
    <figure><img src="${p.img}" alt="${p.alt}" width="${p.w}" height="${p.h}"${i > 0 ? ' loading="lazy"' : ""}></figure>
    <div class="bw-proj-copy">
      <span class="bw-proj-no" aria-hidden="true">0${i + 1}</span>
      <h2 id="bw-${p.id}-h">${p.name}</h2>
      <p class="bw-proj-client">${p.client}</p>
      <ul class="bw-chips">${p.chips.map((c) => `<li>${c}</li>`).join("")}</ul>
      <p>${p.body}</p>
      <dl class="bw-proj-results">${p.results.map(([v, k]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
    </div>
  </article>`).join("\n")}
</div>

<section class="bw-archive bw-ink" aria-labelledby="bw-archive-h">
  <div class="bw-wrap">
    <h2 class="bw-h2" id="bw-archive-h">Also from the archive</h2>
    <ul class="bw-archive-list">
      <li><b>Kelvin Brewing</b><span>Cans, 2024</span></li>
      <li><b>Glasgow Film Fortnight</b><span>Campaign, 2024</span></li>
      <li><b>The Barras Night Market</b><span>Signage, 2023</span></li>
      <li><b>Seaweed &amp; Co</b><span>Identity, 2023</span></li>
      <li><b>Govan Swim Club</b><span>Murals, 2022</span></li>
      <li><b>Southside Book Fair</b><span>Posters, 2022</span></li>
    </ul>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const STUDIO_HTML = `
<div class="bw-page">
<nav aria-label="Main"></nav>
<header class="bw-phead">
  <div class="bw-wrap">
    <h1 class="bw-mega">We're 14 people in an old bakery.</h1>
    <div class="bw-phead-row">
      <p class="bw-label">Duke Street, Glasgow · since 2016</p>
      <p>Designers, animators, a writer, two producers and a sign-maker who used to be a baker here. We still have the oven.</p>
    </div>
  </div>
</header>

<main>
<figure class="bw-team"><img src="/media/generated/creative-studio-team.webp" alt="Three members of the studio working around a wooden table with laptops and notebooks" width="960" height="640"><figcaption class="bw-wrap">Tuesday review: every project, every week, whole team.</figcaption></figure>

<section class="bw-proc" aria-labelledby="bw-proc-h">
  <div class="bw-wrap">
    <h2 class="bw-h2" id="bw-proc-h">How a project goes</h2>
    <ol class="bw-steps">
      <li class="bw-step"><small>Weeks 1–2</small><h3>Dig</h3><p>We visit, ask awkward questions and read everything, including your reviews.</p></li>
      <li class="bw-step"><small>Weeks 3–6</small><h3>Draw</h3><p>Two or three routes, drawn properly. You pick one, or tell us they're all wrong.</p></li>
      <li class="bw-step"><small>Weeks 7–12</small><h3>Build</h3><p>The system, the motion, the signs and the rules, tested on real things.</p></li>
      <li class="bw-step"><small>Launch day</small><h3>Launch</h3><p>We're there when the sign goes up, and on call for the month after.</p></li>
    </ol>
  </div>
</section>

<section class="bw-manifesto bw-ink" aria-labelledby="bw-man-h">
  <div class="bw-wrap">
    <h2 class="bw-h2" id="bw-man-h">Things we believe</h2>
    <ol class="bw-beliefs">
      <li><div><b>Make it for the street, not the screen.</b><span>A sign seen through rain at 40 miles an hour is the real test of a brand.</span></div></li>
      <li><div><b>One good idea beats ten fine ones.</b><span>Every project has a single idea you can explain in the lift. If it doesn't, we're not done.</span></div></li>
      <li><div><b>Draw it by hand first.</b><span>Software makes things neat. Hands make them yours.</span></div></li>
      <li><div><b>Pay makers properly.</b><span>Sign painters, fabricators and printers are named in every case study and paid within 14 days.</span></div></li>
    </ol>
  </div>
</section>

<section class="bw-craft" aria-labelledby="bw-craft-h">
  <div class="bw-wrap bw-craft-grid">
    <figure><img src="/media/generated/creative-swatches.webp" alt="A fanned-out colour swatch book showing blues, magentas, oranges and yellows" width="960" height="640" loading="lazy"></figure>
    <div class="bw-craft-copy">
      <p class="bw-label">Craft</p>
      <h2 class="bw-h2" id="bw-craft-h">Colour, obsessively.</h2>
      <p>Every palette we make is tested in neon, on paper, on screens and under a supermarket strip light. The ones that survive all four go to you.</p>
      <ul class="bw-tools"><li>Neon bending</li><li>Sign painting</li><li>Risograph</li><li>Cel animation</li><li>Type design</li></ul>
    </div>
  </div>
</section>

<figure class="bw-wall bw-ink"><img src="/media/generated/creative-poster-wall.webp" alt="A wall layered with torn and pasted gig posters in many colours" width="960" height="480" loading="lazy"><figcaption>The studio stairwell: twelve years of gig posters, never once cleaned.</figcaption></figure>

<section class="bw-jobs" aria-labelledby="bw-jobs-h">
  <div class="bw-wrap bw-jobs-grid">
    <div>
      <h2 class="bw-h2" id="bw-jobs-h">Come and work here</h2>
      <p>Four-day weeks in August, a paid week off for a personal project every year, and lunch on Fridays. We hire for curiosity first and software second.</p>
      <div class="bw-hero-actions"><a class="bw-btn bw-btn-ink" href="/careers">See open roles</a></div>
    </div>
    <ul class="bw-openings" aria-label="Open roles">
      <li><b>Senior motion designer</b><span>Glasgow · hybrid</span></li>
      <li><b>Brand designer</b><span>Glasgow · studio</span></li>
      <li><b>Studio producer</b><span>Glasgow · studio</span></li>
      <li><b>Summer placement</b><span>12 weeks · paid</span></li>
    </ul>
  </div>
</section>
${CTA_HTML}
</main>
${FOOTER_HTML}
</div>`;

const template: StarterTemplate = {
  id: "original-creative",
  name: "Big Weather",
  tagline: "Bold brand and motion studio site with a typographic work index, big case layouts, a manifesto, careers and a brief form",
  category: "creative",
  tags: ["creative", "agency", "studio", "branding", "design", "motion", "portfolio", "editorial", "bold", "careers"],
  source: "original",
  modules: ["quote-request", "jobs"],
  moduleSeeds: {
    jobs: {
      openings: [
        { title: "Senior Motion Designer", location: "Glasgow · Hybrid", department: "Motion", description: "Lead motion on identity projects, from idents to station screens. After Effects and a sketchbook.", active: true },
        { title: "Brand Designer", location: "Glasgow · Studio", department: "Design", description: "Three or more years designing identities. Strong type skills and a love of making things physical.", active: true },
        { title: "Studio Producer", location: "Glasgow · Studio", department: "Production", description: "Keep five projects, twenty fabricators and one studio dog on schedule.", active: true },
        { title: "Summer Placement", location: "Glasgow · 12 weeks, paid", department: "Design", description: "For recent graduates. Real projects, a mentor and a show of your work at the end.", active: true },
      ],
    },
  },
  theme: {
    name: "Big Weather",
    mode: "light",
    primary: "#c80066",
    primary2: "#a30053",
    accent: "#d4f53c",
    bg: "#f2efe7",
    surface: "#faf8f3",
    surface2: "#e6e2d6",
    border: "#cfc9ba",
    text: "#0d0d0d",
    textMuted: "#55524b",
    font: `"Inter Tight", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    fontDisplay: `"Anton", Impact, "Arial Narrow", sans-serif`,
    googleFonts: ["Anton", "Inter Tight:wght@400;500;600;700"],
    radius: "10px",
    radiusSm: "6px",
    dark: {
      name: "Big Weather Night",
      mode: "dark",
      primary: "#ff4fa0",
      primary2: "#ff78b8",
      accent: "#4a5710",
      bg: "#0d0d0d",
      surface: "#161616",
      surface2: "#1f1f1f",
      border: "#333333",
      text: "#f2efe7",
      textMuted: "#b3aea3",
      font: `"Inter Tight", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
      fontDisplay: `"Anton", Impact, "Arial Narrow", sans-serif`,
      googleFonts: ["Anton", "Inter Tight:wght@400;500;600;700"],
      radius: "10px",
      radiusSm: "6px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: BASE_CSS + NAV_CSS + HOME_CSS },
    { title: "Work", slug: "work", isHome: false, html: WORK_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + WORK_CSS },
    { title: "Studio", slug: "studio", isHome: false, html: STUDIO_HTML, css: BASE_CSS + NAV_CSS + PAGE_HEAD_CSS + STUDIO_CSS },
  ],
};

registerTemplate(template);
export default template;
