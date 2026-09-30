/*
 * ART DIRECTION — "Forge Athletic Club", a strength & conditioning gym in Denver
 * Mood ......... loud, gritty and athletic: chalk dust under hard light, a training log on a
 *                whiteboard, zero fluff.
 * Type ......... Anton (tall condensed display, uppercase, huge scale) + Work Sans (sturdy body
 *                and UI), with tabular figures for times and prices.
 * Palette ...... true black ground, chalk-white text. Volt green is the ACCENT token and carries
 *                the design (CTAs, tags, rules); safety orange is the PRIMARY token so platform
 *                buttons on module pages keep AA-contrast white text (volt cannot).
 * Layout ....... poster-like: giant stacked headlines, a skewed volt ticker, hard-edged black
 *                panels on a 12-column grid, thick volt rules, no rounded corners anywhere.
 * Signature .... "This week at Forge": a full Monday-to-Saturday class timetable (time, class,
 *                coach, intensity, spots) plus three membership tiers with a highlighted
 *                "most popular" plan. Class bookings and free trials go to the bookings module;
 *                questions to contact-form.
 * Prefix ....... frg-
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";


/*
 * The visual editor (GrapesJS) re-parses page CSS through the CSSOM and silently
 * drops any SHORTHAND whose value contains var(): `border: 1px solid var(--x)`,
 * `background: var(--x)`, `border-radius: var(--x)` all vanish after the first
 * edit-and-save. Longhands survive, so expand those shorthands at build time.
 */
const SIDES = ["top", "right", "bottom", "left"];
function splitTop(v: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of v.trim()) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
function borderParts(v: string) {
  let w = "medium";
  let s = "none";
  let c = "currentColor";
  for (const t of splitTop(v)) {
    if (/^(solid|dashed|dotted|double|none|hidden)$/.test(t)) s = t;
    else if (/^(\d|\.|thin$|medium$|thick$)/.test(t)) w = t;
    else c = t;
  }
  return { w, s, c };
}
function editorSafe(css: string): string {
  return css.replace(
    /([{;\s])(background|border|border-(?:top|right|bottom|left|block|inline|color|radius)|outline|gap)\s*:\s*([^;{}]*var\([^;{}]*)(?=[;}])/g,
    (_m, pre: string, prop: string, raw: string) => {
      const imp = /!important\s*$/.test(raw) ? "!important" : "";
      const v = raw.replace(/!important\s*$/, "").trim();
      const d = (p: string, val: string) => `${p}:${val}${imp}`;
      let out: string[];
      if (prop === "background") out = [d(/gradient\(|url\(/.test(v) ? "background-image" : "background-color", v)];
      else if (prop === "outline") {
        const b = borderParts(v);
        out = [d("outline-width", b.w), d("outline-style", b.s), d("outline-color", b.c)];
      } else if (prop === "gap") {
        const [r, c = r] = splitTop(v);
        out = [d("row-gap", r), d("column-gap", c)];
      } else if (prop === "border-radius" || prop === "border-color") {
        const [a, b = a, c = a, e = b] = splitTop(v);
        const names = prop === "border-radius"
          ? ["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"]
          : SIDES.map((s) => `border-${s}-color`);
        out = names.map((n, i) => d(n, [a, b, c, e][i]));
      } else {
        const sides = prop === "border" ? SIDES : prop === "border-block" ? ["top", "bottom"] : prop === "border-inline" ? ["left", "right"] : [prop.slice(7)];
        const b = borderParts(v);
        out = sides.flatMap((s) => [d(`border-${s}-width`, b.w), d(`border-${s}-style`, b.s), d(`border-${s}-color`, b.c)]);
      }
      return pre + out.join(";");
    },
  );
}

const BASE_CSS = `
/* ---------- Shared menu: black bar, condensed uppercase, volt "Book" ---------- */
.nk-nav{position:sticky!important;top:0;z-index:40;background:var(--nk-bg)!important;border-bottom:3px solid var(--nk-accent)!important;padding:.55rem 0!important}
.nk-nav .container{width:min(1320px,100% - 2rem);max-width:none;padding-inline:0;margin-inline:auto}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-weight:400!important;font-size:1.7rem;letter-spacing:.04em;text-transform:uppercase;color:var(--nk-text)!important;display:inline-flex;align-items:center;gap:.5rem}
.nk-nav .navbar-brand::before{content:"";width:.95rem;height:1.3rem;background:var(--nk-accent);transform:skewX(-14deg)}
.nk-nav .nav-link{font-family:var(--nk-font-display);font-weight:400!important;font-size:1.15rem;letter-spacing:.05em;text-transform:uppercase;color:var(--nk-text)!important;padding:.45rem .9rem!important}
.nk-nav .nav-link:hover,.nk-nav .nav-link.active{color:var(--nk-accent)!important;text-decoration:none}
.nk-nav .dropdown-menu{background:var(--nk-surface)!important;border:2px solid var(--nk-accent)!important;border-radius:0}
.nk-nav .dropdown-item{color:var(--nk-text)!important}
.nk-nav .dropdown-item:hover{background:var(--nk-surface-2)}
.nk-nav .navbar-toggler{position:relative;width:46px;height:42px;padding:0!important;font-size:0;color:var(--nk-text)!important}
.nk-nav .navbar-toggler > span{display:none!important}
.nk-nav .navbar-toggler::before{content:"";position:absolute;left:10px;right:10px;top:50%;height:3px;margin-top:-1.5px;background-color:currentColor;box-shadow:0 -8px 0 currentColor,0 8px 0 currentColor}
.nk-nav .nav-item:has(> a[href$="/coaches"]){order:1}
.nk-nav .nav-item:has(> a[href$="/contact-form-contact"]){order:2}
.nk-nav .nav-item:has(> a[href$="/bookings-book"]){order:9}
.nk-nav a[href$="/bookings-book"]{background:var(--nk-accent);color:var(--nk-bg)!important;margin-left:.6rem;padding-inline:1.2rem!important}
.nk-nav a[href$="/bookings-book"]:hover{background:var(--nk-text);color:var(--nk-bg)!important}
/* Owner tools stay out of the visitor menu; the platform's role-gated "Manage" dropdown is left alone. */
.nk-nav .navbar-nav > li:has(> a[href$="-admin"]),.nk-nav .navbar-nav > li:has(> a[href$="-inbox"]),.nk-nav .navbar-nav > li:has(> a[href$="-orders"]),.nk-nav .navbar-nav > li:has(> a[href$="-subscribers"]){display:none!important}
.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-primary);outline-offset:2px;box-shadow:none}
@media (max-width:991.98px){
  .nk-nav .navbar-collapse{border-top:1px solid var(--nk-border);margin-top:.6rem;padding:.5rem 0 .75rem}
  .nk-nav a[href$="/bookings-book"]{display:inline-block;margin:.5rem 0 0}
}

/* ---------- Foundations ---------- */
.frg-wrap{width:min(1320px,100% - 2rem);margin-inline:auto}
.frg-tag{display:inline-block;margin:0 0 1rem;padding:.2rem .6rem;font-family:var(--nk-font-display);font-size:1rem;letter-spacing:.08em;text-transform:uppercase;background:var(--nk-accent);color:var(--nk-bg)}
.frg-h2{font-family:var(--nk-font-display);font-weight:400;font-size:clamp(3rem,1.6rem + 5vw,6.2rem);line-height:.9;text-transform:uppercase;letter-spacing:.005em;color:var(--nk-text);margin:0 0 1.25rem}
.frg-h2 span{color:var(--nk-accent)}
.frg-text{font-size:1.08rem;line-height:1.7;color:var(--nk-text-muted);max-width:36rem;margin:0}
.frg-btn{display:inline-flex;align-items:center;justify-content:center;gap:.6rem;min-height:3.25rem;padding:.8rem 1.6rem;border-radius:0;font-family:var(--nk-font-display);font-weight:400;font-size:1.3rem;letter-spacing:.05em;text-transform:uppercase;text-decoration:none;transition:background-color .15s ease,color .15s ease,transform .15s ease}
.frg-btn:hover{text-decoration:none;transform:translate(-2px,-2px)}
.frg-btn.btn-primary{background:var(--nk-accent);border-color:var(--nk-accent);color:var(--nk-bg);box-shadow:4px 4px 0 var(--nk-text)}
.frg-btn.btn-primary:hover{background:var(--nk-accent);color:var(--nk-bg);box-shadow:6px 6px 0 var(--nk-text)}
.frg-btn--ghost{border:2px solid var(--nk-text);color:var(--nk-text);background:transparent}
.frg-btn--ghost:hover{background:var(--nk-text);color:var(--nk-bg)}
.frg-btn:focus-visible,.frg-link:focus-visible,.frg-footer a:focus-visible,.frg-plan a:focus-visible,.frg-tt a:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.frg-link{font-weight:700;color:var(--nk-accent);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}
.frg-link:hover{color:var(--nk-text)}
.frg-num{font-variant-numeric:tabular-nums}
.frg-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* ---------- Trial band ---------- */
.frg-trial{position:relative;isolation:isolate;overflow:hidden;padding:clamp(5rem,10vw,8rem) 0!important;background:var(--nk-bg)}
.frg-trial__img{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;object-position:80% 30%}
.frg-trial::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,var(--nk-bg) 0%,color-mix(in srgb,var(--nk-bg) 88%,transparent) 50%,color-mix(in srgb,var(--nk-bg) 30%,transparent) 100%)}
.frg-trial__actions{display:flex;flex-wrap:wrap;gap:1rem;margin-top:2rem}
.frg-trial__small{margin:1.5rem 0 0;font-size:.92rem;color:var(--nk-text-muted)}
@media (max-width:767.98px){.frg-trial::before{background:linear-gradient(180deg,color-mix(in srgb,var(--nk-bg) 70%,transparent),var(--nk-bg) 70%)}}

/* ---------- Footer ---------- */
.frg-footer{padding:clamp(3.5rem,7vw,5rem) 0 2rem;background:var(--nk-surface);border-top:3px solid var(--nk-accent)}
.frg-footer__grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:2.5rem}
.frg-footer .frg-footer__brand{font-family:var(--nk-font-display);font-size:3rem;line-height:.9;text-transform:uppercase;color:var(--nk-text);margin:0 0 .75rem}
.frg-footer h2{font-family:var(--nk-font-display);font-weight:400;font-size:1.25rem;letter-spacing:.05em;text-transform:uppercase;color:var(--nk-accent);margin:0 0 .75rem}
.frg-footer p,.frg-footer li{font-size:.95rem;line-height:1.7;color:var(--nk-text-muted);margin:0}
.frg-footer ul{list-style:none;margin:0;padding:0}
.frg-footer a{color:var(--nk-text);text-decoration:underline;text-decoration-color:var(--nk-accent);text-underline-offset:3px}
.frg-footer a:hover{color:var(--nk-accent)}
.frg-footer__base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--nk-border)}
.frg-footer__base p{font-size:.82rem}
@media (max-width:991.98px){.frg-footer__grid{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.frg-footer__grid{grid-template-columns:1fr}}
`;

const FOOTER = `
<footer class="frg-footer">
  <div class="frg-wrap">
    <div class="frg-footer__grid">
      <div>
        <p class="frg-footer__brand">Forge</p>
        <p>Strength and conditioning for people with jobs, kids and bad knees. Coached classes, open gym, no mirrors-and-selfies culture.</p>
      </div>
      <div>
        <h2>The gym</h2>
        <p>2750 Larimer Street<br>Denver, CO 80205<br>Free parking on 28th St.</p>
      </div>
      <div>
        <h2>Hours</h2>
        <ul>
          <li>Mon &ndash; Fri &middot; 5 am &ndash; 9 pm</li>
          <li>Sat &middot; 7 am &ndash; 2 pm</li>
          <li>Sun &middot; open gym 8 am &ndash; 12 pm</li>
        </ul>
      </div>
      <div>
        <h2>Talk to us</h2>
        <ul>
          <li><a href="tel:+13035550149">(303) 555-0149</a></li>
          <li><a href="mailto:coach@forgeathletic.club">coach@forgeathletic.club</a></li>
        </ul>
      </div>
    </div>
    <div class="frg-footer__base">
      <p>&copy; 2026 Forge Athletic Club</p>
      <p>Consult your doctor before starting a new training programme.</p>
    </div>
  </div>
</footer>`;

const TRIAL = `
<section class="frg-trial">
  <img class="frg-trial__img" src="/media/generated/fitness-profile-focus.webp" alt="" width="960" height="638" loading="lazy">
  <div class="frg-wrap">
    <p class="frg-tag">No contract. No catch.</p>
    <h2 class="frg-h2">Your first week<br><span>is on us</span></h2>
    <p class="frg-text">Seven days of unlimited classes and a one-to-one intro session with a coach, so you learn the lifts before you load the bar. Bring water and shoes you can squat in.</p>
    <div class="frg-trial__actions">
      <a class="btn btn-primary frg-btn" href="/book">Claim your free week</a>
      <a class="frg-btn frg-btn--ghost" href="/contact">Ask a coach</a>
    </div>
    <p class="frg-trial__small">New members only &middot; ages 16 and up &middot; about 40% of trials become members</p>
  </div>
</section>`;

type Slot = { t: string; name: string; coach: string; lvl: 1 | 2 | 3; spots: string; full?: boolean; kind: "str" | "con" | "mob" | "box" };
const DAYS: [string, Slot[]][] = [
  ["Mon", [
    { t: "06:00", name: "Strength Club", coach: "Ana", lvl: 2, spots: "3 left", kind: "str" },
    { t: "12:15", name: "Engine 30", coach: "Jay", lvl: 3, spots: "8 left", kind: "con" },
    { t: "17:30", name: "Strength Club", coach: "Ana", lvl: 2, spots: "Full", full: true, kind: "str" },
    { t: "18:45", name: "Mobility Lab", coach: "Priya", lvl: 1, spots: "10 left", kind: "mob" },
  ]],
  ["Tue", [
    { t: "06:00", name: "Engine 30", coach: "Jay", lvl: 3, spots: "5 left", kind: "con" },
    { t: "12:15", name: "Strength Club", coach: "Marcus", lvl: 2, spots: "7 left", kind: "str" },
    { t: "17:30", name: "Fight Fit", coach: "Tess", lvl: 3, spots: "2 left", kind: "box" },
    { t: "18:45", name: "Barbell 101", coach: "Marcus", lvl: 1, spots: "6 left", kind: "str" },
  ]],
  ["Wed", [
    { t: "06:00", name: "Strength Club", coach: "Ana", lvl: 2, spots: "Full", full: true, kind: "str" },
    { t: "12:15", name: "Mobility Lab", coach: "Priya", lvl: 1, spots: "12 left", kind: "mob" },
    { t: "17:30", name: "Engine 30", coach: "Jay", lvl: 3, spots: "4 left", kind: "con" },
    { t: "18:45", name: "Strength Club", coach: "Marcus", lvl: 2, spots: "9 left", kind: "str" },
  ]],
  ["Thu", [
    { t: "06:00", name: "Fight Fit", coach: "Tess", lvl: 3, spots: "6 left", kind: "box" },
    { t: "12:15", name: "Engine 30", coach: "Jay", lvl: 3, spots: "10 left", kind: "con" },
    { t: "17:30", name: "Strength Club", coach: "Ana", lvl: 2, spots: "1 left", kind: "str" },
    { t: "18:45", name: "Barbell 101", coach: "Marcus", lvl: 1, spots: "5 left", kind: "str" },
  ]],
  ["Fri", [
    { t: "06:00", name: "Strength Club", coach: "Marcus", lvl: 2, spots: "4 left", kind: "str" },
    { t: "12:15", name: "Fight Fit", coach: "Tess", lvl: 3, spots: "7 left", kind: "box" },
    { t: "17:00", name: "Friday Throwdown", coach: "All coaches", lvl: 3, spots: "11 left", kind: "con" },
  ]],
  ["Sat", [
    { t: "08:00", name: "Team Engine", coach: "Jay", lvl: 2, spots: "Full", full: true, kind: "con" },
    { t: "09:30", name: "Strength Club", coach: "Ana", lvl: 2, spots: "6 left", kind: "str" },
    { t: "11:00", name: "Mobility Lab", coach: "Priya", lvl: 1, spots: "14 left", kind: "mob" },
  ]],
];

const lvl = (n: number) => `<span class="frg-lvl" role="img" aria-label="Intensity ${n} of 3">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;

const slot = (s: Slot) => `
            <li class="frg-slot frg-slot--${s.kind}${s.full ? " is-full" : ""}">
              <span class="frg-slot__time frg-num">${s.t}</span>
              <span class="frg-slot__name">${s.name}</span>
              <span class="frg-slot__coach">${s.coach}</span>
              <span class="frg-slot__meta">${lvl(s.lvl)}<span class="frg-slot__spots">${s.spots}</span></span>
            </li>`;

const HOME_HTML = `
<section class="frg-hero">
  <img class="frg-hero__img" src="/media/generated/fitness-dumbbell-mirror.webp" alt="An athlete picking up dumbbells from the rack, reflected in the gym mirror" width="960" height="638" fetchpriority="high">
  <div class="frg-wrap frg-hero__inner">
    <p class="frg-tag">Denver &middot; RiNo &middot; since 2015</p>
    <h1 class="frg-hero__title">Lift heavy.<br>Move well.<br><span>Show up.</span></h1>
    <p class="frg-hero__lede">Coached strength and conditioning classes capped at twelve people, so a coach sees every rep. Beginners welcome; egos checked at the door.</p>
    <div class="frg-hero__actions">
      <a class="btn btn-primary frg-btn" href="/book">Start a free week</a>
      <a class="frg-btn frg-btn--ghost" href="#timetable">See the timetable</a>
    </div>
  </div>
  <dl class="frg-hero__stats frg-wrap">
    <div><dt>Coached classes a week</dt><dd class="frg-num">42</dd></div>
    <div><dt>Max class size</dt><dd class="frg-num">12</dd></div>
    <div><dt>Open</dt><dd>5am&ndash;9pm</dd></div>
    <div><dt>Members</dt><dd class="frg-num">640</dd></div>
  </dl>
</section>

<div class="frg-ticker" aria-hidden="true">
  <p>Squat <b>&#9632;</b> Press <b>&#9632;</b> Pull <b>&#9632;</b> Carry <b>&#9632;</b> Sprint <b>&#9632;</b> Recover <b>&#9632;</b> Repeat <b>&#9632;</b> Squat <b>&#9632;</b> Press <b>&#9632;</b> Pull <b>&#9632;</b> Carry <b>&#9632;</b> Sprint</p>
</div>

<section class="frg-classes">
  <div class="frg-wrap">
    <div class="frg-classes__head">
      <p class="frg-tag">Four ways to train</p>
      <h2 class="frg-h2">Pick your<br><span>poison</span></h2>
    </div>
    <div class="frg-classes__grid">
      <article class="frg-class frg-class--str">
        <figure><img src="/media/generated/fitness-barbell-plate.webp" alt="Close-up of an iron weight plate and collar on a barbell" width="960" height="640" loading="lazy"></figure>
        <div class="frg-class__body"><p class="frg-class__n frg-num">01</p><h3>Strength Club</h3><p>Squat, bench, deadlift and press on a twelve-week programme. Coached, logged and progressed every week.</p><p class="frg-class__meta">55 min ${lvl(2)}</p></div>
      </article>
      <article class="frg-class frg-class--con">
        <figure><img src="/media/generated/fitness-battle-ropes.webp" alt="An athlete slamming heavy battle ropes against a white brick wall" width="960" height="641" loading="lazy"></figure>
        <div class="frg-class__body"><p class="frg-class__n frg-num">02</p><h3>Engine 30</h3><p>Thirty minutes of intervals on rowers, bikes, sleds and ropes. Scalable, sweaty, finished before your coffee's cold.</p><p class="frg-class__meta">30 min ${lvl(3)}</p></div>
      </article>
      <article class="frg-class frg-class--box">
        <figure><img src="/media/generated/fitness-heavy-bag.webp" alt="A woman in boxing gloves throwing a knee into a heavy bag" width="960" height="540" loading="lazy"></figure>
        <div class="frg-class__body"><p class="frg-class__n frg-num">03</p><h3>Fight Fit</h3><p>Pad work, bag rounds and footwork drills. No sparring, all the cardio, and a surprising amount of fun.</p><p class="frg-class__meta">45 min ${lvl(3)}</p></div>
      </article>
      <article class="frg-class frg-class--mob">
        <figure><img src="/media/generated/fitness-suspension-training.webp" alt="A man training on suspension straps in warm afternoon light" width="960" height="640" loading="lazy"></figure>
        <div class="frg-class__body"><p class="frg-class__n frg-num">04</p><h3>Mobility Lab</h3><p>Slow strength, stretching and breathing to keep hips, shoulders and backs working for decades.</p><p class="frg-class__meta">45 min ${lvl(1)}</p></div>
      </article>
    </div>
  </div>
</section>

<section class="frg-timetable" id="timetable">
  <div class="frg-wrap">
    <div class="frg-timetable__head">
      <div>
        <p class="frg-tag">Updated every Sunday</p>
        <h2 class="frg-h2">This week<br><span>at Forge</span></h2>
      </div>
      <ul class="frg-legend" aria-label="Class types">
        <li class="frg-legend--str">Strength</li>
        <li class="frg-legend--con">Conditioning</li>
        <li class="frg-legend--box">Fight Fit</li>
        <li class="frg-legend--mob">Mobility</li>
      </ul>
    </div>
    <div class="frg-tt">${DAYS.map(([d, slots]) => `
      <div class="frg-tt__day">
        <h3 class="frg-tt__dayname">${d}</h3>
        <ul class="frg-tt__list">${slots.map(slot).join("")}
        </ul>
      </div>`).join("")}
    </div>
    <p class="frg-tt__foot">Open gym runs alongside every class. Sunday is open gym only, 8 am &ndash; 12 pm. <a class="frg-link" href="/book">Book a class</a></p>
  </div>
</section>

<section class="frg-plans">
  <div class="frg-wrap">
    <div class="frg-plans__head">
      <p class="frg-tag">Memberships</p>
      <h2 class="frg-h2">Simple<br><span>pricing</span></h2>
      <p class="frg-text">Month to month. Freeze for free when you travel. Cancel with 30 days' notice, no phone calls or guilt trips.</p>
    </div>
    <div class="frg-plans__grid">
      <article class="frg-plan">
        <h3>Open Gym</h3>
        <p class="frg-plan__price"><span class="frg-num">$89</span>/mo</p>
        <ul>
          <li>Unlimited open gym hours</li>
          <li>Racks, platforms, sleds, rowers</li>
          <li>Programme app access</li>
          <li class="is-off">Coached classes</li>
        </ul>
        <a class="frg-btn frg-btn--ghost" href="/book">Start Open Gym</a>
      </article>
      <article class="frg-plan frg-plan--hot">
        <p class="frg-plan__flag">Most popular</p>
        <h3>Unlimited</h3>
        <p class="frg-plan__price"><span class="frg-num">$169</span>/mo</p>
        <ul>
          <li>Every class, every day</li>
          <li>Unlimited open gym</li>
          <li>Quarterly strength testing</li>
          <li>Two guest passes a month</li>
        </ul>
        <a class="btn btn-primary frg-btn" href="/book">Go Unlimited</a>
      </article>
      <article class="frg-plan">
        <h3>10-Class Pack</h3>
        <p class="frg-plan__price"><span class="frg-num">$190</span></p>
        <ul>
          <li>Ten classes, any type</li>
          <li>Valid for three months</li>
          <li>Open gym on class days</li>
          <li class="is-off">Strength testing</li>
        </ul>
        <a class="frg-btn frg-btn--ghost" href="/book">Buy a pack</a>
      </article>
    </div>
    <p class="frg-plans__note">Students, teachers, first responders and veterans get 15% off any plan.</p>
  </div>
</section>

<section class="frg-proof">
  <div class="frg-wrap frg-proof__grid">
    <figure class="frg-proof__img"><img src="/media/generated/fitness-squat-bar.webp" alt="Black-and-white close-up of an athlete gripping a barbell across her shoulders" width="800" height="480" loading="lazy"></figure>
    <div>
      <p class="frg-tag">Member results</p>
      <blockquote class="frg-proof__quote">
        <p>&ldquo;I walked in unable to do a push-up. Fourteen months later I deadlifted twice my bodyweight at the spring meet.&rdquo;</p>
        <footer>Renee O., member since 2024</footer>
      </blockquote>
      <dl class="frg-proof__stats">
        <div><dt>Average first-year deadlift gain</dt><dd class="frg-num">+68 lb</dd></div>
        <div><dt>Members still training after a year</dt><dd class="frg-num">81%</dd></div>
      </dl>
    </div>
  </div>
</section>
${TRIAL}
${FOOTER}`;

const HOME_CSS = `${BASE_CSS}
/* ---------- Hero ---------- */
.frg-hero{position:relative;isolation:isolate;overflow:hidden;min-height:680px;min-height:max(680px,calc(100svh - 3.5rem));display:flex;flex-direction:column;justify-content:flex-end;padding:0!important}
.frg-hero__img{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;object-position:75% 40%}
.frg-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,var(--nk-bg) 0%,color-mix(in srgb,var(--nk-bg) 86%,transparent) 38%,color-mix(in srgb,var(--nk-bg) 10%,transparent) 75%),linear-gradient(0deg,var(--nk-bg) 0%,transparent 35%)}
.frg-hero__inner{padding-top:5rem;padding-bottom:3rem}
.frg-hero__title{font-family:var(--nk-font-display);font-weight:400;font-size:clamp(4rem,1.8rem + 9vw,10.5rem);line-height:1;text-transform:uppercase;color:var(--nk-text);margin:0 0 1.5rem}
.frg-hero__title span{color:var(--nk-accent)}
.frg-hero__lede{font-size:1.15rem;line-height:1.65;color:var(--nk-text);opacity:.88;max-width:34rem;margin:0 0 2rem}
.frg-hero__actions{display:flex;flex-wrap:wrap;gap:1rem}
.frg-hero__stats{display:grid;grid-template-columns:repeat(4,1fr);margin-top:0;margin-bottom:0;border-top:3px solid var(--nk-accent)}
.frg-hero__stats div{padding:1.25rem 1rem 1.5rem 0}
.frg-hero__stats div + div{padding-left:1.25rem;border-left:1px solid var(--nk-border)}
.frg-hero__stats dt{font-size:.82rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--nk-text-muted)}
.frg-hero__stats dd{margin:0;font-family:var(--nk-font-display);font-size:clamp(2.2rem,1.6rem + 2vw,3.4rem);line-height:1;color:var(--nk-text)}
@media (max-width:767.98px){
  .frg-hero::before{background:linear-gradient(180deg,color-mix(in srgb,var(--nk-bg) 45%,transparent) 0%,color-mix(in srgb,var(--nk-bg) 85%,transparent) 45%,var(--nk-bg) 75%)}
  .frg-hero__stats{grid-template-columns:1fr 1fr}
  .frg-hero__stats div:nth-child(3){padding-left:0;border-left:0}
  .frg-hero__stats div:nth-child(n+3){border-top:1px solid var(--nk-border)}
}

/* ---------- Ticker ---------- */
.frg-ticker{overflow:hidden;background:var(--nk-accent);transform:skewY(-2deg);margin:1.5rem 0}
.frg-ticker p{margin:0;padding:.7rem 0;white-space:nowrap;font-family:var(--nk-font-display);font-size:clamp(1.6rem,1.1rem + 1.6vw,2.6rem);letter-spacing:.04em;text-transform:uppercase;color:var(--nk-bg)}
.frg-ticker b{display:inline-block;margin:0 1.25rem;font-weight:400;font-size:.55em;vertical-align:.3em;color:var(--nk-bg)}

/* ---------- Classes ---------- */
.frg-classes{padding:clamp(5rem,10vw,8rem) 0!important}
.frg-classes__head{margin-bottom:2.5rem}
.frg-classes__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
.frg-class{display:flex;flex-direction:column;background:var(--nk-surface);border-top:4px solid var(--nk-accent)}
.frg-class--con{border-top-color:var(--nk-primary)}
.frg-class--box{border-top-color:var(--nk-text)}
.frg-class--mob{border-top-color:var(--nk-text-muted)}
.frg-class figure{margin:0;aspect-ratio:4/3;overflow:hidden}
.frg-class img{width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.1);transition:filter .3s ease}
.frg-class:hover img{filter:none}
.frg-class__body{display:flex;flex-direction:column;flex:1;padding:1.25rem}
.frg-class__n{margin:0 0 .25rem;font-family:var(--nk-font-display);font-size:1.1rem;color:var(--nk-accent)}
.frg-class h3{font-family:var(--nk-font-display);font-weight:400;font-size:2.1rem;line-height:1;text-transform:uppercase;color:var(--nk-text);margin:0 0 .75rem}
.frg-class__body > p:not(.frg-class__n):not(.frg-class__meta){margin:0 0 1rem;color:var(--nk-text-muted);line-height:1.6;font-size:.96rem}
.frg-class__meta{display:flex;align-items:center;gap:.75rem;margin:auto 0 0;font-weight:700;color:var(--nk-text)}
.frg-lvl{display:inline-flex;gap:3px}
.frg-lvl i{display:block;width:8px;height:14px;background:var(--nk-surface-2);transform:skewX(-14deg)}
.frg-lvl i.on{background:var(--nk-primary)}
@media (max-width:1099.98px){.frg-classes__grid{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.frg-classes__grid{grid-template-columns:1fr}}

/* ---------- Timetable (signature) ---------- */
.frg-timetable{padding:clamp(5rem,10vw,8rem) 0!important;background:var(--nk-surface)}
.frg-timetable__head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1.5rem;margin-bottom:2.5rem}
.frg-timetable__head .frg-h2{margin:0}
.frg-legend{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem 1.25rem}
.frg-legend li{display:inline-flex;align-items:center;gap:.5rem;font-weight:700;font-size:.9rem;color:var(--nk-text)}
.frg-legend li::before{content:"";width:1rem;height:4px;background:var(--nk-accent)}
.frg-legend--con::before{background:var(--nk-primary)!important}
.frg-legend--box::before{background:var(--nk-text)!important}
.frg-legend--mob::before{background:var(--nk-text-muted)!important}
.frg-tt{display:grid;grid-template-columns:repeat(6,1fr);gap:.75rem}
.frg-tt__dayname{font-family:var(--nk-font-display);font-weight:400;font-size:2rem;text-transform:uppercase;color:var(--nk-bg);background:var(--nk-accent);margin:0 0 .75rem;padding:.2rem .75rem}
.frg-tt__list{list-style:none;margin:0;padding:0;display:grid;gap:.6rem}
.frg-slot{display:grid;gap:.15rem;padding:.8rem .85rem .85rem;background:var(--nk-bg);border-left:4px solid var(--nk-accent)}
.frg-slot--con{border-left-color:var(--nk-primary)}
.frg-slot--box{border-left-color:var(--nk-text)}
.frg-slot--mob{border-left-color:var(--nk-text-muted)}
.frg-slot__time{font-family:var(--nk-font-display);font-size:1.35rem;line-height:1;color:var(--nk-text)}
.frg-slot__name{font-weight:700;font-size:.98rem;color:var(--nk-text)}
.frg-slot__coach{font-size:.85rem;color:var(--nk-text-muted)}
.frg-slot__meta{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.35rem}
.frg-slot__spots{font-size:.8rem;font-weight:700;color:var(--nk-accent)}
.frg-slot.is-full .frg-slot__spots{color:var(--nk-primary);text-decoration:line-through}
.frg-slot.is-full{opacity:.75}
.frg-tt__foot{margin:2rem 0 0;color:var(--nk-text-muted)}
@media (max-width:1199.98px){.frg-tt{grid-template-columns:repeat(3,1fr)}}
@media (max-width:767.98px){.frg-tt{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.frg-tt{grid-template-columns:1fr}}

/* ---------- Plans ---------- */
.frg-plans{padding:clamp(5rem,10vw,8rem) 0!important}
.frg-plans__head{display:grid;grid-template-columns:1fr 1fr;gap:1rem 3rem;align-items:end;margin-bottom:3rem}
.frg-plans__head .frg-tag{grid-column:1 / -1;justify-self:start}
.frg-plans__head .frg-h2{margin:0}
.frg-plans__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;align-items:stretch}
.frg-plan{position:relative;display:flex;flex-direction:column;padding:2rem 1.75rem;background:var(--nk-surface);border:2px solid var(--nk-border)}
.frg-plan--hot{border-color:var(--nk-accent);background:var(--nk-surface-2);transform:translateY(-1rem)}
.frg-plan__flag{position:absolute;top:-1rem;left:1.75rem;margin:0;padding:.2rem .7rem;font-family:var(--nk-font-display);font-size:1.05rem;letter-spacing:.05em;text-transform:uppercase;background:var(--nk-accent);color:var(--nk-bg)}
.frg-plan h3{font-family:var(--nk-font-display);font-weight:400;font-size:2.2rem;text-transform:uppercase;color:var(--nk-text);margin:0 0 .5rem}
.frg-plan__price{margin:0 0 1.5rem;font-weight:700;color:var(--nk-text-muted)}
.frg-plan__price span{font-family:var(--nk-font-display);font-weight:400;font-size:4rem;line-height:1;color:var(--nk-text)}
.frg-plan--hot .frg-plan__price span{color:var(--nk-accent)}
.frg-plan ul{list-style:none;margin:0 0 2rem;padding:0}
.frg-plan li{position:relative;padding:.6rem 0 .6rem 1.6rem;border-bottom:1px solid var(--nk-border);color:var(--nk-text)}
.frg-plan li::before{content:"\\2713";position:absolute;left:0;color:var(--nk-accent);font-weight:700}
.frg-plan li.is-off{color:var(--nk-text-muted);text-decoration:line-through}
.frg-plan li.is-off::before{content:"\\2715";color:var(--nk-text-muted)}
.frg-plan .frg-btn{margin-top:auto}
.frg-plans__note{margin:2rem 0 0;color:var(--nk-text-muted)}
@media (max-width:991.98px){.frg-plans__head,.frg-plans__grid{grid-template-columns:1fr}.frg-plan--hot{transform:none;margin-top:1rem}}

/* ---------- Proof ---------- */
.frg-proof{padding:clamp(5rem,10vw,8rem) 0!important;background:var(--nk-surface)}
.frg-proof__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2.5rem,6vw,6rem);align-items:center}
.frg-proof__img{margin:0;overflow:hidden;box-shadow:12px 12px 0 var(--nk-accent)}
.frg-proof__img img{display:block;width:100%;height:auto;aspect-ratio:5/3;object-fit:cover}
.frg-proof__quote{margin:0 0 2rem}
.frg-proof__quote p{font-family:var(--nk-font-display);font-size:clamp(1.8rem,1.3rem + 1.8vw,3rem);line-height:1.05;text-transform:uppercase;color:var(--nk-text);margin:0 0 1rem}
.frg-proof__quote footer{font-weight:700;color:var(--nk-text-muted)}
.frg-proof__stats{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin:0;padding-top:1.5rem;border-top:3px solid var(--nk-accent)}
.frg-proof__stats dt{font-size:.85rem;font-weight:600;color:var(--nk-text-muted)}
.frg-proof__stats dd{margin:0;font-family:var(--nk-font-display);font-size:3rem;line-height:1;color:var(--nk-accent)}
@media (max-width:991.98px){.frg-proof__grid{grid-template-columns:1fr}.frg-proof__img{margin-right:12px}}
`;

const coach = (initials: string, name: string, role: string, bio: string, creds: string[], teaches: string) => `
      <article class="frg-coach">
        <div class="frg-coach__mono" aria-hidden="true">${initials}</div>
        <div>
          <h3>${name}</h3>
          <p class="frg-coach__role">${role}</p>
          <p>${bio}</p>
          <ul class="frg-coach__creds">${creds.map((c) => `<li>${c}</li>`).join("")}</ul>
          <p class="frg-coach__teaches"><span>Coaches</span>${teaches}</p>
        </div>
      </article>`;

const COACHES_HTML = `
<section class="frg-chead">
  <img class="frg-chead__img" src="/media/generated/fitness-battle-ropes.webp" alt="" width="960" height="641" fetchpriority="high">
  <div class="frg-wrap frg-chead__inner">
    <p class="frg-tag">Coaches &amp; classes</p>
    <h1 class="frg-chead__title">Coached,<br><span>not counted</span></h1>
    <p class="frg-text">Every class has a certified coach who knows your name, your numbers and your old ankle injury. Here's who they are and what a class actually looks like.</p>
  </div>
</section>

<section class="frg-coaches">
  <div class="frg-wrap">
    <div class="frg-coaches__head">
      <h2 class="frg-h2">The <span>coaches</span></h2>
      <p class="frg-text">Five full-time coaches, 60+ years of combined experience and one rule: every rep gets watched.</p>
    </div>
    <div class="frg-coaches__grid">${coach("AR", "Ana Ruiz", "Head coach &middot; founder", "Former collegiate thrower who opened Forge to coach the lifts properly. Writes every Strength Club programme.", ["USAW Level 2", "CSCS", "Precision Nutrition L1"], "Strength Club")}${coach("JO", "Jay Okafor", "Conditioning lead", "Ex-rower and the reason everyone fears Friday Throwdown. Builds engines, one interval at a time.", ["CrossFit L2", "Concept2 Rowing Instructor"], "Engine 30 &middot; Team Engine")}${coach("TH", "Tess Hale", "Fight Fit coach", "Amateur Muay Thai champion who teaches pad work to people who have never thrown a punch.", ["Muay Thai Kru", "First Aid &amp; CPR"], "Fight Fit")}${coach("PS", "Priya Shah", "Mobility &amp; rehab", "Doctor of Physical Therapy. Keeps members moving well and gets injured ones back under the bar.", ["DPT", "FRC Mobility Specialist"], "Mobility Lab")}${coach("MB", "Marcus Bell", "Strength coach", "Powerlifter with a soft spot for beginners. Runs Barbell 101, our four-week on-ramp.", ["USAPL Coach", "NASM CPT"], "Strength Club &middot; Barbell 101")}
      <article class="frg-coach frg-coach--cta">
        <h3>New to lifting?</h3>
        <p>Barbell 101 is four weeks, eight sessions and a maximum of six people. You'll learn the squat, hinge, press and pull before joining regular classes.</p>
        <a class="btn btn-primary frg-btn" href="/book">Book Barbell 101</a>
      </article>
    </div>
  </div>
</section>

<section class="frg-anatomy">
  <div class="frg-wrap frg-anatomy__grid">
    <div>
      <p class="frg-tag">Inside a class</p>
      <h2 class="frg-h2">55 minutes,<br><span>no wasted ones</span></h2>
      <p class="frg-text">Every Strength Club session follows the same shape, so you always know what's next and how hard to push.</p>
    </div>
    <ol class="frg-anatomy__list">
      <li><span class="frg-num">00:00</span><div><h3>Warm-up</h3><p>Ten minutes of mobility and ramp-up sets, tailored to the day's lift.</p></div></li>
      <li><span class="frg-num">10:00</span><div><h3>Main lift</h3><p>Five working sets from the programme. Your coach checks form and adjusts weight.</p></div></li>
      <li><span class="frg-num">30:00</span><div><h3>Accessories</h3><p>Two supersets for the muscles that make the main lift stronger.</p></div></li>
      <li><span class="frg-num">45:00</span><div><h3>Finisher</h3><p>Six hard minutes of conditioning. Optional, but rarely skipped.</p></div></li>
      <li><span class="frg-num">51:00</span><div><h3>Log &amp; cool-down</h3><p>Record your numbers in the app, stretch, high-five, go home.</p></div></li>
    </ol>
  </div>
</section>

<section class="frg-faq">
  <div class="frg-wrap frg-faq__grid">
    <div>
      <p class="frg-tag">Before you come in</p>
      <h2 class="frg-h2">Good<br><span>questions</span></h2>
    </div>
    <div class="frg-faq__list">
      <details open><summary>I'm out of shape. Is Forge for me?</summary><p>Yes. Most members started unable to do a push-up. Every class is scaled, and Barbell 101 exists exactly for this.</p></details>
      <details><summary>What should I bring?</summary><p>Water, flat-soled shoes and a lock if you want a locker. We have chalk, belts and wrist wraps to borrow.</p></details>
      <details><summary>Can I freeze my membership?</summary><p>Up to three months a year, free, for travel, injury or life happening. Just email us a week ahead.</p></details>
      <details><summary>Is there childcare?</summary><p>Not yet, but kids 12 and over can train with a parent in Mobility Lab and Saturday Team Engine.</p></details>
    </div>
  </div>
</section>
${TRIAL}
${FOOTER}`;

const COACHES_CSS = `${BASE_CSS}
.frg-chead{position:relative;isolation:isolate;overflow:hidden;min-height:540px;display:flex;align-items:flex-end;padding:0!important}
.frg-chead__img{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;object-position:60% 40%;filter:grayscale(1)}
.frg-chead::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,var(--nk-bg) 10%,color-mix(in srgb,var(--nk-bg) 70%,transparent) 55%,color-mix(in srgb,var(--nk-bg) 30%,transparent)),linear-gradient(0deg,var(--nk-bg),transparent 40%)}
.frg-chead__inner{padding-top:5rem;padding-bottom:3.5rem}
.frg-chead__title{font-family:var(--nk-font-display);font-weight:400;font-size:clamp(3.6rem,1.8rem + 7vw,8.5rem);line-height:1;text-transform:uppercase;color:var(--nk-text);margin:0 0 1.5rem}
.frg-chead__title span{color:var(--nk-accent)}
@media (max-width:767.98px){.frg-chead::before{background:linear-gradient(180deg,color-mix(in srgb,var(--nk-bg) 55%,transparent),var(--nk-bg) 75%)}}
.frg-coaches{padding:clamp(4rem,8vw,6rem) 0!important}
.frg-coaches__head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1rem 3rem;margin-bottom:2rem}
.frg-coaches__head .frg-h2{margin:0}
.frg-coaches__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
.frg-coach{display:grid;grid-template-columns:auto 1fr;gap:1.25rem;padding:1.75rem;background:var(--nk-surface);border-top:4px solid var(--nk-accent)}
.frg-coach__mono{display:grid;place-items:center;width:4rem;height:4rem;font-family:var(--nk-font-display);font-size:1.8rem;background:var(--nk-accent);color:var(--nk-bg)}
.frg-coach h3{font-family:var(--nk-font-display);font-weight:400;font-size:2rem;line-height:1;text-transform:uppercase;color:var(--nk-text);margin:0 0 .25rem}
.frg-coach .frg-coach__role{margin:0 0 .9rem;font-weight:700;font-size:.88rem;letter-spacing:.04em;text-transform:uppercase;color:var(--nk-accent)}
.frg-coach p{margin:0 0 1rem;color:var(--nk-text-muted);line-height:1.6}
.frg-coach__creds{list-style:none;margin:0 0 1rem;padding:0;display:flex;flex-wrap:wrap;gap:.35rem}
.frg-coach__creds li{padding:.2rem .55rem;font-size:.78rem;font-weight:700;border:1px solid var(--nk-border);color:var(--nk-text)}
.frg-coach .frg-coach__teaches{margin:0;font-weight:700;color:var(--nk-text)}
.frg-coach__teaches span{display:block;font-size:.76rem;letter-spacing:.06em;text-transform:uppercase;color:var(--nk-text-muted)}
.frg-coach--cta{display:flex;flex-direction:column;justify-content:flex-end;background:var(--nk-surface-2);border-top-color:var(--nk-primary)}
.frg-coach--cta .frg-btn{align-self:flex-start}
@media (max-width:1099.98px){.frg-coaches__grid{grid-template-columns:1fr 1fr}}
@media (max-width:640px){.frg-coaches__grid{grid-template-columns:1fr}}
.frg-anatomy{padding:clamp(5rem,10vw,7rem) 0!important;background:var(--nk-surface)}
.frg-anatomy__grid{display:grid;grid-template-columns:1fr 1.2fr;gap:clamp(2.5rem,6vw,6rem);align-items:start}
.frg-anatomy__list{list-style:none;margin:0;padding:0;border-left:3px solid var(--nk-accent)}
.frg-anatomy__list li{display:grid;grid-template-columns:5rem 1fr;gap:1rem;padding:1.1rem 0 1.1rem 1.5rem;border-bottom:1px solid var(--nk-border)}
.frg-anatomy__list li > span{font-family:var(--nk-font-display);font-size:1.4rem;color:var(--nk-accent)}
.frg-anatomy__list h3{font-family:var(--nk-font-display);font-weight:400;font-size:1.6rem;text-transform:uppercase;color:var(--nk-text);margin:0 0 .25rem}
.frg-anatomy__list p{margin:0;color:var(--nk-text-muted)}
@media (max-width:991.98px){.frg-anatomy__grid{grid-template-columns:1fr}}
.frg-faq{padding:clamp(5rem,10vw,7rem) 0!important}
.frg-faq__grid{display:grid;grid-template-columns:1fr 1.4fr;gap:clamp(2.5rem,6vw,6rem)}
.frg-faq__list details{padding:1.2rem 0;border-bottom:1px solid var(--nk-border)}
.frg-faq__list details:first-child{border-top:3px solid var(--nk-accent)}
.frg-faq__list summary{font-weight:700;font-size:1.1rem;color:var(--nk-text)}
.frg-faq__list summary:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.frg-faq__list details > summary::after{color:var(--nk-accent)}
.frg-faq__list p{margin:.75rem 0 0;color:var(--nk-text-muted);line-height:1.7}
@media (max-width:991.98px){.frg-faq__grid{grid-template-columns:1fr}}
`;

const template: StarterTemplate = {
  id: "original-fitness",
  name: "Forge Athletic Club",
  tagline: "High-energy strength gym with a weekly class timetable, membership tiers and free-trial booking",
  category: "fitness",
  tags: ["gym", "fitness", "strength", "crossfit", "personal training", "classes", "timetable", "membership", "boxing", "conditioning", "dark", "bold"],
  source: "original",
  modules: ["bookings", "contact-form"],
  theme: {
    name: "Forge",
    mode: "dark",
    primary: "#d4420a",
    primary2: "#b3380a",
    accent: "#d4ff3a",
    bg: "#000000",
    surface: "#141416",
    surface2: "#1d1d20",
    border: "#2e2e33",
    text: "#f4f4f0",
    textMuted: "#a3a39c",
    font: '"Work Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontDisplay: '"Anton", Impact, "Arial Narrow", sans-serif',
    googleFonts: ["Anton", "Work Sans:wght@400;500;600;700"],
    radius: "0px",
    radiusSm: "0px",
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: editorSafe(HOME_CSS) },
    { title: "Coaches & Classes", slug: "coaches", isHome: false, html: COACHES_HTML, css: editorSafe(COACHES_CSS) },
  ],
};

registerTemplate(template);
export default template;
