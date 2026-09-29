/*
 * ART DIRECTION — "Northbound Treks", small-group hut-to-hut hiking tours
 * Mood ......... outdoorsy and exacting, like a well-used field guide: map paper, trail-blaze
 *                orange, forest ink and hard data.
 * Type ......... Archivo (variable: condensed 70% width, heavy, uppercase for display; normal
 *                width for body) + IBM Plex Mono for coordinates, distances and dates.
 * Palette ...... map-paper ground, forest-ink text, blaze-orange actions and trail markers,
 *                deep forest bands.
 * Layout ....... left-aligned grid with hairline rules, square corners, numbered stages,
 *                contour-line textures (pure CSS), data tables and a CSS stage-by-stage profile.
 * Signature .... "2026 departures": a departures board (trip, dates, days, grade, price,
 *                seats left) plus a featured trip with a day-by-day ascent profile. Reservations
 *                go to the bookings module; custom trip planning to contact-form.
 * Prefix ....... nbt-
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";

const IMG = "/templates/originals/original-travel";
const MONO = `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

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
/* ---------- Shared menu: transparent over the photo band ---------- */
.nk-nav{position:absolute!important;top:0;left:0;right:0;z-index:40;background:transparent!important;border-bottom:1px solid color-mix(in srgb,var(--nk-bg) 30%,transparent)!important;padding:.85rem 0!important}
.nk-nav .container{width:min(1280px,100% - 2.5rem);max-width:none;padding-inline:0;margin-inline:auto}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-stretch:72%;font-weight:800!important;font-size:1.55rem;letter-spacing:.02em;text-transform:uppercase;color:var(--nk-bg)!important;display:inline-flex;align-items:center;gap:.55rem}
.nk-nav .navbar-brand::before{content:"";width:.9rem;height:.9rem;background:var(--nk-primary);transform:rotate(45deg)}
.nk-nav .nav-link{color:var(--nk-bg)!important;font-weight:600!important;font-size:.9rem;padding:.55rem .95rem!important}
.nk-nav .nav-link:hover,.nk-nav .nav-link.active{text-decoration:underline;text-decoration-color:var(--nk-primary);text-decoration-thickness:3px;text-underline-offset:.5em}
.nk-nav .dropdown-menu{background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;border-radius:2px}
.nk-nav .dropdown-item{color:var(--nk-text)!important}
.nk-nav .navbar-toggler{position:relative;width:44px;height:40px;padding:0!important;font-size:0;color:var(--nk-bg)!important}
.nk-nav .navbar-toggler > span{display:none!important}
.nk-nav .navbar-toggler::before{content:"";position:absolute;left:10px;right:10px;top:50%;height:2px;margin-top:-1px;background-color:currentColor;box-shadow:0 -7px 0 currentColor,0 7px 0 currentColor}
.nk-nav .nav-item:has(> a[href$="/trips"]){order:1}
.nk-nav .nav-item:has(> a[href$="/contact-form-contact"]){order:2}
.nk-nav .nav-item:has(> a[href$="/bookings-book"]){order:9}
.nk-nav a[href$="/bookings-book"]{background:var(--nk-primary);color:var(--nk-surface)!important;margin-left:.6rem;padding-inline:1.2rem!important;border-radius:2px}
.nk-nav a[href$="/bookings-book"]:hover{background:var(--nk-primary-2);text-decoration:none}
html[data-theme="dark"] .nk-nav a[href$="/bookings-book"]{color:var(--nk-text)!important}
/* Owner tools stay out of the visitor menu; the platform's role-gated "Manage" dropdown is left alone. */
.nk-nav .navbar-nav > li:has(> a[href$="-admin"]),.nk-nav .navbar-nav > li:has(> a[href$="-inbox"]),.nk-nav .navbar-nav > li:has(> a[href$="-orders"]),.nk-nav .navbar-nav > li:has(> a[href$="-subscribers"]){display:none!important}
.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-primary);outline-offset:2px;box-shadow:none}
@media (max-width:991.98px){
  .nk-nav .navbar-collapse{background:var(--nk-surface);border:1px solid var(--nk-border);margin-top:.8rem;padding:.5rem 1rem 1rem}
  .nk-nav .navbar-collapse .nav-link{color:var(--nk-text)!important}
  .nk-nav a[href$="/bookings-book"]{display:inline-block;margin:.5rem 0 0;color:var(--nk-surface)!important}
}

/* ---------- Foundations ---------- */
.nbt-wrap{width:min(1280px,100% - 2.5rem);margin-inline:auto}
.nbt-eyebrow{display:flex;align-items:center;gap:.6rem;font-family:${MONO};font-size:.78rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--nk-text-muted);margin:0 0 1rem}
.nbt-eyebrow::before{content:"";width:.6rem;height:.6rem;background:var(--nk-primary);flex:none}
.nbt-h2{text-wrap:balance;font-family:var(--nk-font-display);font-stretch:72%;font-weight:800;font-size:clamp(2.4rem,1.3rem + 3.8vw,4.6rem);line-height:.95;letter-spacing:-.005em;text-transform:uppercase;color:var(--nk-text);margin:0 0 1.25rem}
.nbt-lede{font-size:1.08rem;line-height:1.7;color:var(--nk-text-muted);max-width:36rem;margin:0}
.nbt-mono{font-family:${MONO};font-variant-numeric:tabular-nums}
.nbt-btn{display:inline-flex;align-items:center;justify-content:center;gap:.6rem;min-height:3.1rem;padding:.8rem 1.5rem;border-radius:2px;font-weight:700;font-size:.98rem;text-decoration:none;transition:background-color .15s ease,color .15s ease,border-color .15s ease}
.nbt-btn:hover{text-decoration:none}
.nbt-btn.btn-primary{box-shadow:none}
.nbt-btn--ghost{border:2px solid currentColor;color:var(--nk-text);background:transparent}
.nbt-btn--ghost:hover{background:var(--nk-text);border-color:var(--nk-text);color:var(--nk-bg)}
.nbt-btn:focus-visible,.nbt-link:focus-visible,.nbt-chip:focus-visible,.nbt-footer a:focus-visible,.nbt-card a:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.nbt-link{font-weight:700;color:var(--nk-text);text-decoration:underline;text-decoration-color:var(--nk-primary);text-decoration-thickness:2px;text-underline-offset:4px}
.nbt-link:hover{color:var(--nk-primary)}
.nbt-grade{display:inline-flex;gap:3px;vertical-align:middle}
.nbt-grade i{display:block;width:9px;height:9px;border:1.5px solid var(--nk-text)}
.nbt-grade i.on{background:var(--nk-primary);border-color:var(--nk-primary)}
.nbt-contours{background-image:repeating-radial-gradient(ellipse at 20% 30%,transparent 0 22px,color-mix(in srgb,var(--nk-text) 7%,transparent) 22px 23px),repeating-radial-gradient(ellipse at 85% 80%,transparent 0 30px,color-mix(in srgb,var(--nk-text) 6%,transparent) 30px 31px)}
.nbt-contours--on-dark{background-image:repeating-radial-gradient(ellipse at 15% 20%,transparent 0 26px,color-mix(in srgb,var(--nk-bg) 9%,transparent) 26px 27px),repeating-radial-gradient(ellipse at 90% 90%,transparent 0 34px,color-mix(in srgb,var(--nk-bg) 7%,transparent) 34px 35px)}

/* ---------- Planner CTA ---------- */
.nbt-planner{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-accent);color:var(--nk-bg)}
.nbt-planner__grid{display:grid;grid-template-columns:1.3fr 1fr;gap:2.5rem;align-items:end}
.nbt-planner .nbt-h2{color:var(--nk-bg)}
.nbt-planner .nbt-lede{color:color-mix(in srgb,var(--nk-bg) 82%,transparent)}
.nbt-planner .nbt-eyebrow{color:color-mix(in srgb,var(--nk-bg) 75%,transparent)}
.nbt-planner__actions{display:flex;flex-wrap:wrap;gap:.9rem;justify-content:flex-end}
.nbt-planner .nbt-btn--ghost{color:var(--nk-bg)}
.nbt-planner .nbt-btn--ghost:hover{background:var(--nk-bg);border-color:var(--nk-bg);color:var(--nk-accent)}
@media (max-width:767.98px){.nbt-planner__grid{grid-template-columns:1fr}.nbt-planner__actions{justify-content:flex-start}}

/* ---------- Footer ---------- */
.nbt-footer{padding:clamp(3.5rem,7vw,5rem) 0 2rem;background:var(--nk-text);color:var(--nk-bg)}
.nbt-footer__grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:2.5rem}
.nbt-footer .nbt-footer__brand{font-family:var(--nk-font-display);font-stretch:72%;font-weight:800;font-size:2.2rem;text-transform:uppercase;line-height:1;color:var(--nk-bg);margin:0 0 .75rem}
.nbt-footer h2{font-family:${MONO};font-size:.74rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:color-mix(in srgb,var(--nk-bg) 65%,transparent);margin:0 0 .9rem}
.nbt-footer p,.nbt-footer li{font-size:.95rem;line-height:1.7;color:color-mix(in srgb,var(--nk-bg) 85%,transparent);margin:0}
.nbt-footer ul{list-style:none;margin:0;padding:0}
.nbt-footer a{color:var(--nk-bg);text-decoration:underline;text-decoration-color:var(--nk-primary);text-underline-offset:3px}
.nbt-footer a:hover{color:var(--nk-bg);text-decoration-thickness:2px}
.nbt-footer__base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-top:3rem;padding-top:1.5rem;border-top:1px solid color-mix(in srgb,var(--nk-bg) 18%,transparent)}
.nbt-footer__base p{font-family:${MONO};font-size:.78rem}
@media (max-width:991.98px){.nbt-footer__grid{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.nbt-footer__grid{grid-template-columns:1fr}}
`;

const FOOTER = `
<footer class="nbt-footer">
  <div class="nbt-wrap">
    <div class="nbt-footer__grid">
      <div>
        <p class="nbt-footer__brand">Northbound Treks</p>
        <p>Guided hut-to-hut hiking in small groups since 2014. Certified mountain guides, luggage transfers and every night booked before you arrive.</p>
      </div>
      <div>
        <h2>Office</h2>
        <p>220 Pearl Street, Suite 4<br>Boulder, CO 80302</p>
      </div>
      <div>
        <h2>Talk to a planner</h2>
        <ul>
          <li><a href="tel:+13035550188">(303) 555-0188</a></li>
          <li><a href="mailto:trails@northboundtreks.com">trails@northboundtreks.com</a></li>
          <li>Mon &ndash; Fri, 8 am &ndash; 6 pm MT</li>
        </ul>
      </div>
      <div>
        <h2>Travel with confidence</h2>
        <ul>
          <li>Fully bonded tour operator</li>
          <li>IFMGA &amp; UIMLA certified guides</li>
          <li>Carbon-balanced since 2019</li>
        </ul>
      </div>
    </div>
    <div class="nbt-footer__base">
      <p>&copy; 2026 Northbound Treks LLC</p>
      <p>40.0176&deg; N, 105.2797&deg; W</p>
    </div>
  </div>
</footer>`;

const PLANNER = `
<section class="nbt-planner nbt-contours--on-dark">
  <div class="nbt-wrap nbt-planner__grid">
    <div>
      <p class="nbt-eyebrow">Not sure which trek fits?</p>
      <h2 class="nbt-h2">Talk to someone who has walked it</h2>
      <p class="nbt-lede">Tell us your dates, your fitness and how much you like steep ground. A trail planner will reply within one working day with two or three honest suggestions.</p>
    </div>
    <div class="nbt-planner__actions">
      <a class="btn btn-primary nbt-btn" href="/contact">Ask a trail planner</a>
      <a class="nbt-btn nbt-btn--ghost" href="tel:+13035550188">(303) 555-0188</a>
    </div>
  </div>
</section>`;

const grade = (n: number, label: string) =>
  `<span class="nbt-grade" role="img" aria-label="Grade ${n} of 4, ${label}">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;

const dep = (trip: string, region: string, dates: string, days: string, g: number, gl: string, price: string, seats: string, status: "open" | "few" | "wait" | "guaranteed") => `
          <tr>
            <th scope="row"><span class="nbt-dep__trip">${trip}</span><span class="nbt-dep__region">${region}</span></th>
            <td data-label="Dates" class="nbt-mono">${dates}</td>
            <td data-label="Days" class="nbt-mono">${days}</td>
            <td data-label="Grade">${grade(g, gl)} <span class="nbt-dep__gl">${gl}</span></td>
            <td data-label="From" class="nbt-mono nbt-dep__price">$${price}</td>
            <td data-label="Seats"><span class="nbt-seat nbt-seat--${status}">${seats}</span></td>
            <td class="nbt-dep__cta">${status === "wait" ? `<a class="nbt-link" href="/contact">Join waitlist</a>` : `<a class="nbt-link" href="/book">Reserve</a>`}</td>
          </tr>`;

const card = (img: string, alt: string, coords: string, region: string, name: string, days: string, g: number, gl: string, price: string, anchor: string, w = 960, h = 640) => `
      <article class="nbt-card">
        <figure class="nbt-card__img"><img src="${IMG}/${img}" alt="${alt}" width="${w}" height="${h}" loading="lazy"><figcaption class="nbt-mono">${coords}</figcaption></figure>
        <div class="nbt-card__body">
          <p class="nbt-card__region">${region}</p>
          <h3 class="nbt-card__name">${name}</h3>
          <ul class="nbt-card__facts">
            <li class="nbt-mono">${days}</li>
            <li>${grade(g, gl)} ${gl}</li>
          </ul>
          <p class="nbt-card__foot"><span>from <strong class="nbt-mono">$${price}</strong></span><a class="nbt-link" href="/trips#${anchor}">Trip notes<span class="nbt-sr"> for ${name}</span></a></p>
        </div>
      </article>`;

const HOME_HTML = `
<section class="nbt-hero">
  <img class="nbt-hero__img" src="${IMG}/ridge-above-clouds.webp" alt="A sharp green ridge rising above a sea of clouds in the Japanese Northern Alps" width="1920" height="1163" fetchpriority="high">
  <div class="nbt-wrap nbt-hero__inner">
    <p class="nbt-hero__coords nbt-mono">36.3419&deg; N &middot; 137.6476&deg; E &middot; Yari&ndash;Hotaka ridge, 3,180 m</p>
    <h1 class="nbt-hero__title">Small groups.<br>Big mountains.</h1>
    <p class="nbt-hero__lede">Guided hut-to-hut treks in the Alps, Japan and New Zealand. We book every hut, move your luggage and send a certified guide for every six hikers. You just walk.</p>
    <div class="nbt-hero__actions">
      <a class="btn btn-primary nbt-btn" href="#departures">See 2026 departures</a>
      <a class="nbt-btn nbt-btn--ghost nbt-hero__ghost" href="/trips">Browse all treks</a>
    </div>
  </div>
  <div class="nbt-hero__chips">
    <div class="nbt-wrap nbt-hero__chiprow">
      <span class="nbt-mono nbt-hero__chiplabel">Jump to</span>
      <a class="nbt-chip" href="/trips#dolomites">Dolomites</a>
      <a class="nbt-chip" href="/trips#bernese-oberland">Swiss Alps</a>
      <a class="nbt-chip" href="/trips#yari-hotaka">Japan</a>
      <a class="nbt-chip" href="/trips#new-zealand">New Zealand</a>
      <a class="nbt-chip" href="/trips#alpe-di-siusi">Easy walks</a>
    </div>
  </div>
</section>

<section class="nbt-stats">
  <div class="nbt-wrap">
    <dl class="nbt-stats__grid">
      <div><dt>Years on the trail</dt><dd>12</dd></div>
      <div><dt>Hikers guided</dt><dd>4,120</dd></div>
      <div><dt>Max group size</dt><dd>10</dd></div>
      <div><dt>Guest rating</dt><dd>4.9<small>/5</small></dd></div>
    </dl>
  </div>
</section>

<section class="nbt-feature">
  <div class="nbt-wrap nbt-feature__grid">
    <div class="nbt-feature__copy">
      <p class="nbt-eyebrow">Featured trek &middot; Italy</p>
      <h2 class="nbt-h2">Dolomites<br>Alta Via 1</h2>
      <p class="nbt-lede">Eight days through the Pale di Fanes and the Civetta wall, sleeping in family-run rifugi with strudel on the terrace. The classic, done properly.</p>
      <dl class="nbt-feature__facts">
        <div><dt>Distance</dt><dd class="nbt-mono">68 km</dd></div>
        <div><dt>Total ascent</dt><dd class="nbt-mono">+4,620 m</dd></div>
        <div><dt>Nights in huts</dt><dd class="nbt-mono">5 of 7</dd></div>
        <div><dt>From</dt><dd class="nbt-mono">$3,450</dd></div>
      </dl>
      <a class="btn btn-primary nbt-btn" href="/book">Reserve a place</a>
    </div>
    <div class="nbt-feature__media">
      <figure class="nbt-feature__img"><img src="${IMG}/dolomites-lakes.webp" alt="A lone hiker standing by two alpine lakes beneath the pale cliffs of the Dolomites" width="960" height="610" loading="lazy"></figure>
      <div class="nbt-profile" role="img" aria-label="Daily ascent profile: day 1 850 m, day 2 1,120 m, day 3 640 m, day 4 980 m, day 5 420 m, day 6 1,210 m, day 7 760 m, day 8 descent to Belluno">
        <p class="nbt-profile__title nbt-mono">Daily ascent, metres</p>
        <ol class="nbt-profile__bars">
          <li><span class="nbt-bar nbt-bar--70"></span><b class="nbt-mono">850</b><em>D1</em></li>
          <li><span class="nbt-bar nbt-bar--90"></span><b class="nbt-mono">1,120</b><em>D2</em></li>
          <li><span class="nbt-bar nbt-bar--50"></span><b class="nbt-mono">640</b><em>D3</em></li>
          <li><span class="nbt-bar nbt-bar--80"></span><b class="nbt-mono">980</b><em>D4</em></li>
          <li><span class="nbt-bar nbt-bar--30"></span><b class="nbt-mono">420</b><em>D5</em></li>
          <li><span class="nbt-bar nbt-bar--100"></span><b class="nbt-mono">1,210</b><em>D6</em></li>
          <li><span class="nbt-bar nbt-bar--60"></span><b class="nbt-mono">760</b><em>D7</em></li>
          <li><span class="nbt-bar nbt-bar--10"></span><b class="nbt-mono">&darr;</b><em>D8</em></li>
        </ol>
      </div>
    </div>
  </div>
</section>

<section class="nbt-departures" id="departures">
  <div class="nbt-wrap">
    <div class="nbt-departures__head">
      <div>
        <p class="nbt-eyebrow">2026 season &middot; updated weekly</p>
        <h2 class="nbt-h2">Departures board</h2>
      </div>
      <p class="nbt-lede">Prices are per person sharing, including guides, huts and hotels, breakfasts and dinners, and luggage transfers. A trip is guaranteed to run once four hikers have booked.</p>
    </div>
    <div class="nbt-table-wrap" role="region" aria-label="2026 departures" tabindex="0">
      <table class="nbt-dep">
        <thead><tr><th scope="col">Trek</th><th scope="col">Dates</th><th scope="col">Days</th><th scope="col">Grade</th><th scope="col">From</th><th scope="col">Seats</th><th scope="col"><span class="nbt-sr">Action</span></th></tr></thead>
        <tbody>${dep("Dolomites Alta Via 1", "Italy", "Jun 14 &ndash; 21", "8", 3, "Moderate+", "3,450", "Guaranteed &middot; 4 left", "guaranteed")}${dep("Alpe di Siusi Meadows", "Italy", "Jun 28 &ndash; Jul 2", "5", 1, "Easy", "1,980", "7 of 10 left", "open")}${dep("Bernese Oberland Traverse", "Switzerland", "Jul 12 &ndash; 18", "7", 2, "Moderate", "3,890", "2 left", "few")}${dep("Yari&ndash;Hotaka Circuit", "Japan", "Aug 2 &ndash; 7", "6", 4, "Challenging", "4,280", "Waitlist", "wait")}${dep("Dolomites Alta Via 1", "Italy", "Sep 6 &ndash; 13", "8", 3, "Moderate+", "3,450", "6 of 10 left", "open")}${dep("Hooker Valley &amp; Mueller Hut", "New Zealand", "Nov 22 &ndash; 30", "9", 2, "Moderate", "4,650", "5 of 10 left", "open")}
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="nbt-treks">
  <div class="nbt-wrap">
    <div class="nbt-treks__head">
      <p class="nbt-eyebrow">Five treks, four countries</p>
      <h2 class="nbt-h2">Pick your mountains</h2>
    </div>
    <div class="nbt-treks__grid">${card("dolomites-sunrise.webp", "A hiker in a red jacket watching sunrise over the jagged Seceda ridge", "46.60&deg; N, 11.72&deg; E", "Italy &middot; Dolomites", "Alta Via 1", "8 days &middot; 68 km", 3, "Moderate+", "3,450", "dolomites", 960, 720)}${card("swiss-ridge.webp", "A hiker photographing green Swiss mountain ridges from a grassy saddle", "46.62&deg; N, 7.98&deg; E", "Switzerland &middot; Bernese Oberland", "Oberland Traverse", "7 days &middot; 62 km", 2, "Moderate", "3,890", "bernese-oberland", 960, 641)}${card("ridge-above-clouds.webp", "A green ridge above a sea of cloud in the Japanese Northern Alps", "36.34&deg; N, 137.65&deg; E", "Japan &middot; Northern Alps", "Yari&ndash;Hotaka Circuit", "6 days &middot; 41 km", 4, "Challenging", "4,280", "yari-hotaka", 1920, 1163)}${card("southern-alps.webp", "A hiker walking a golden valley track towards snow-covered peaks in New Zealand", "43.72&deg; S, 170.09&deg; E", "New Zealand &middot; Southern Alps", "Hooker Valley &amp; Mueller Hut", "9 days &middot; 74 km", 2, "Moderate", "4,650", "new-zealand")}${card("alpine-meadows.webp", "Rolling green alpine meadows dotted with larch trees beneath rocky peaks", "46.54&deg; N, 11.62&deg; E", "Italy &middot; South Tyrol", "Alpe di Siusi Meadows", "5 days &middot; 38 km", 1, "Easy", "1,980", "alpe-di-siusi")}
      <article class="nbt-card nbt-card--custom nbt-contours">
        <p class="nbt-card__region">Your dates, your pace</p>
        <h3 class="nbt-card__name">Private departures</h3>
        <p class="nbt-card__text">Any trek, any week from June to October, for groups of four or more. Priced like our scheduled trips, with your own guide.</p>
        <a class="btn btn-primary nbt-btn" href="/contact">Plan a private trek</a>
      </article>
    </div>
  </div>
</section>

<section class="nbt-grades">
  <div class="nbt-wrap nbt-grades__grid">
    <div>
      <p class="nbt-eyebrow">How hard is it?</p>
      <h2 class="nbt-h2">Our four grades</h2>
      <p class="nbt-lede">Every trek is graded on its hardest day, not its average. If you can walk for three hours with a light pack, you can do a grade 1 or 2 trek.</p>
    </div>
    <ol class="nbt-grades__list">
      <li><p class="nbt-grades__name">${grade(1, "Easy")} Easy</p><p>4 &ndash; 5 hours a day on good paths. Up to 500 m of ascent.</p></li>
      <li><p class="nbt-grades__name">${grade(2, "Moderate")} Moderate</p><p>5 &ndash; 6 hours on mountain trails. Up to 800 m, some rocky ground.</p></li>
      <li><p class="nbt-grades__name">${grade(3, "Moderate+")} Moderate+</p><p>6 &ndash; 7 hours, up to 1,200 m, short sections with fixed cables.</p></li>
      <li><p class="nbt-grades__name">${grade(4, "Challenging")} Challenging</p><p>7 &ndash; 9 hours, steep and exposed in places. Previous alpine experience needed.</p></li>
    </ol>
  </div>
</section>

<section class="nbt-included">
  <div class="nbt-wrap nbt-included__grid">
    <figure class="nbt-included__img"><img src="${IMG}/tent-view.webp" alt="View from inside a tent of pine trees and a turquoise mountain lake" width="960" height="1200" loading="lazy"></figure>
    <div>
      <p class="nbt-eyebrow">What's in the price</p>
      <h2 class="nbt-h2">Everything but your boots</h2>
      <div class="nbt-included__cols">
        <ul class="nbt-yes">
          <li>Certified guide for every 6 hikers</li>
          <li>Every hut and hotel, booked and paid</li>
          <li>Breakfasts, packed lunches, dinners</li>
          <li>Luggage moved between hotels</li>
          <li>Transfers to and from the trailhead</li>
          <li>Pre-trip fitness plan and kit list</li>
        </ul>
        <ul class="nbt-no">
          <li>Flights to the start town</li>
          <li>Travel insurance (required)</li>
          <li>Drinks and hut showers</li>
          <li>Single rooms (from $420)</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="nbt-guides">
  <div class="nbt-wrap nbt-guides__grid">
    <div>
      <p class="nbt-eyebrow">Who walks with you</p>
      <h2 class="nbt-h2">Guides who live in the valleys they lead</h2>
      <p class="nbt-lede">Our 38 guides are certified mountain leaders, trained in wilderness first aid and hired locally. They know which hut makes the best polenta, and when to turn back.</p>
      <blockquote class="nbt-quote">
        <p>&ldquo;Chiara knew every flower and every rifugio owner by name. I booked the Japan trek before we'd even reached the last hut.&rdquo;</p>
        <footer><span class="nbt-mono">Alta Via 1 &middot; Sept 2025</span> Dan K., Portland</footer>
      </blockquote>
    </div>
    <figure class="nbt-guides__img"><img src="${IMG}/small-group.webp" alt="A small group of hikers with large packs walking single file through a meadow towards the forest" width="960" height="640" loading="lazy"></figure>
  </div>
</section>
${PLANNER}
${FOOTER}`;

const HOME_CSS = `${BASE_CSS}
/* ---------- Hero ---------- */
.nbt-hero{position:relative;isolation:isolate;overflow:hidden;min-height:660px;min-height:max(660px,100svh);display:flex;flex-direction:column;justify-content:flex-end;padding:0!important;color:var(--nk-bg)}
.nbt-hero__img{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;object-position:60% 40%}
.nbt-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,color-mix(in srgb,var(--nk-text) 55%,transparent) 0%,color-mix(in srgb,var(--nk-text) 12%,transparent) 30%,color-mix(in srgb,var(--nk-text) 30%,transparent) 55%,color-mix(in srgb,var(--nk-text) 82%,transparent) 100%)}
.nbt-hero__inner{padding-top:8rem;padding-bottom:3rem}
.nbt-hero__coords{display:inline-block;padding:.35rem .65rem;font-size:.78rem;letter-spacing:.04em;margin:0 0 1.25rem;background:color-mix(in srgb,var(--nk-text) 70%,transparent);color:var(--nk-bg)}
.nbt-hero__title{font-family:var(--nk-font-display);font-stretch:68%;font-weight:900;font-size:clamp(3.6rem,1.6rem + 8vw,9.5rem);line-height:.86;text-transform:uppercase;letter-spacing:-.005em;color:var(--nk-bg);margin:0 0 1.5rem}
.nbt-hero__lede{font-size:clamp(1.02rem,.95rem + .3vw,1.2rem);line-height:1.65;max-width:38rem;margin:0 0 2rem;color:color-mix(in srgb,var(--nk-bg) 92%,transparent)}
.nbt-hero__actions{display:flex;flex-wrap:wrap;gap:.9rem}
.nbt-hero__ghost{color:var(--nk-bg)}
.nbt-hero__ghost:hover{background:var(--nk-bg);border-color:var(--nk-bg);color:var(--nk-text)}
.nbt-hero__chips{border-top:1px solid color-mix(in srgb,var(--nk-bg) 28%,transparent);background:color-mix(in srgb,var(--nk-text) 40%,transparent)}
.nbt-hero__chiprow{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;padding:1rem 0}
.nbt-hero__chiplabel{font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;margin-right:.4rem;color:color-mix(in srgb,var(--nk-bg) 80%,transparent)}
.nbt-chip{display:inline-flex;align-items:center;min-height:2.4rem;padding:.4rem .95rem;border:1px solid color-mix(in srgb,var(--nk-bg) 55%,transparent);border-radius:2px;font-weight:600;font-size:.92rem;color:var(--nk-bg);text-decoration:none}
.nbt-chip:hover{background:var(--nk-bg);color:var(--nk-text);text-decoration:none}
@media (max-width:767.98px){.nbt-hero::before{background:linear-gradient(180deg,color-mix(in srgb,var(--nk-text) 62%,transparent) 0%,color-mix(in srgb,var(--nk-text) 52%,transparent) 40%,color-mix(in srgb,var(--nk-text) 80%,transparent) 70%,color-mix(in srgb,var(--nk-text) 90%,transparent) 100%)}}
@media (max-width:575.98px){.nbt-hero__chiplabel{width:100%}}

/* ---------- Stats ---------- */
.nbt-stats{padding:0!important;background:var(--nk-surface);border-bottom:1px solid var(--nk-border)}
.nbt-stats__grid{display:grid;grid-template-columns:repeat(4,1fr);margin:0}
.nbt-stats__grid div{padding:1.75rem 1.5rem;border-left:1px solid var(--nk-border)}
.nbt-stats__grid div:first-child{border-left:0;padding-left:0}
.nbt-stats__grid dt{font-family:${MONO};font-size:.74rem;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--nk-text-muted);margin-bottom:.35rem}
.nbt-stats__grid dd{margin:0;font-family:var(--nk-font-display);font-stretch:70%;font-weight:800;font-size:clamp(2.4rem,1.8rem + 2vw,3.6rem);line-height:1;color:var(--nk-text)}
.nbt-stats__grid small{font-size:.45em;color:var(--nk-text-muted)}
@media (max-width:767.98px){.nbt-stats__grid{grid-template-columns:1fr 1fr}.nbt-stats__grid div:nth-child(3){border-left:0;padding-left:0}.nbt-stats__grid div:nth-child(n+3){border-top:1px solid var(--nk-border)}}

/* ---------- Featured trek ---------- */
.nbt-feature{padding:clamp(4.5rem,9vw,7.5rem) 0!important}
.nbt-feature__grid{display:grid;grid-template-columns:5fr 7fr;gap:clamp(2.5rem,5vw,5rem);align-items:center}
.nbt-feature__facts{display:grid;grid-template-columns:1fr 1fr;margin:2rem 0;border-top:2px solid var(--nk-text)}
.nbt-feature__facts div{padding:1rem 0;border-bottom:1px solid var(--nk-border)}
.nbt-feature__facts div:nth-child(odd){padding-right:1rem}
.nbt-feature__facts dt{font-size:.82rem;color:var(--nk-text-muted);margin-bottom:.2rem}
.nbt-feature__facts dd{margin:0;font-size:1.25rem;font-weight:600;color:var(--nk-text)}
.nbt-feature__media{position:relative}
.nbt-feature__img{margin:0;height:auto;aspect-ratio:16/11;overflow:hidden}
.nbt-feature__img img{width:100%;height:100%;object-fit:cover}
.nbt-profile{position:relative;margin:-4rem 0 0 auto;width:min(30rem,92%);padding:1.25rem 1.25rem 1rem;background:var(--nk-surface);border:1px solid var(--nk-border);border-top:4px solid var(--nk-primary)}
.nbt-profile__title{font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;color:var(--nk-text-muted);margin:0 0 1rem}
.nbt-profile__bars{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(8,1fr);gap:.4rem;align-items:end;height:9rem}
.nbt-profile__bars li{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:.3rem}
.nbt-bar{display:block;width:100%;background:var(--nk-accent)}
.nbt-profile__bars li:nth-child(6) .nbt-bar{background:var(--nk-primary)}
.nbt-bar--10{height:8%}.nbt-bar--30{height:30%}.nbt-bar--50{height:46%}.nbt-bar--60{height:56%}.nbt-bar--70{height:62%}.nbt-bar--80{height:72%}.nbt-bar--90{height:84%}.nbt-bar--100{height:92%}
.nbt-profile__bars b{font-size:.66rem;font-weight:500;color:var(--nk-text)}
.nbt-profile__bars em{font-family:${MONO};font-style:normal;font-size:.66rem;color:var(--nk-text-muted)}
@media (max-width:991.98px){.nbt-feature__grid{grid-template-columns:1fr}.nbt-feature__copy{order:2}}
@media (max-width:575.98px){.nbt-profile{margin-top:-2.5rem;width:100%}.nbt-profile__bars b{font-size:.58rem}}

/* ---------- Departures (signature) ---------- */
.nbt-departures{padding:clamp(4.5rem,9vw,7.5rem) 0!important;background:var(--nk-surface)}
.nbt-departures__head{display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:end;margin-bottom:2.5rem}
.nbt-departures__head .nbt-h2{margin:0}
.nbt-table-wrap{position:relative;overflow-x:auto}
.nbt-table-wrap:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.nbt-dep{width:100%;border-collapse:collapse;min-width:52rem}
.nbt-dep thead th{font-family:${MONO};font-size:.72rem;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--nk-text-muted);text-align:left;padding:.75rem 1rem .75rem 0;border-bottom:2px solid var(--nk-text)}
.nbt-dep tbody th,.nbt-dep td{padding:1.1rem 1rem 1.1rem 0;border-bottom:1px solid var(--nk-border);text-align:left;vertical-align:middle;color:var(--nk-text)}
.nbt-dep tbody tr:hover{background:var(--nk-bg)}
.nbt-dep__trip{display:block;font-weight:700;font-size:1.05rem}
.nbt-dep__region{display:block;font-size:.85rem;font-weight:400;color:var(--nk-text-muted)}
.nbt-dep__gl{font-size:.88rem;color:var(--nk-text-muted);margin-left:.35rem}
.nbt-dep__price{font-weight:600;font-size:1.05rem}
.nbt-dep__cta{text-align:right!important;padding-right:0!important}
.nbt-seat{display:inline-block;padding:.25rem .6rem;font-size:.82rem;font-weight:600;border:1px solid var(--nk-border);white-space:nowrap}
.nbt-seat--guaranteed{background:var(--nk-accent);border-color:var(--nk-accent);color:var(--nk-bg)}
.nbt-seat--few{border-color:var(--nk-primary);color:var(--nk-primary-2)}
.nbt-seat--wait{color:var(--nk-text-muted);border-style:dashed}
.nbt-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (max-width:767.98px){
  .nbt-departures__head{grid-template-columns:1fr}
  .nbt-dep{min-width:0}
  .nbt-dep thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .nbt-dep tbody tr{display:grid;grid-template-columns:1fr 1fr;gap:.5rem 1rem;padding:1.1rem 0;border-bottom:1px solid var(--nk-border)}
  .nbt-dep tbody th{grid-column:1 / -1;border:0;padding:0}
  .nbt-dep td{border:0;padding:0}
  .nbt-dep td::before{content:attr(data-label);display:block;font-family:${MONO};font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:var(--nk-text-muted);margin-bottom:.15rem}
  .nbt-dep__cta{grid-column:1 / -1;text-align:left!important}
}

/* ---------- Trek cards ---------- */
.nbt-treks{padding:clamp(4.5rem,9vw,7.5rem) 0!important}
.nbt-treks__head{margin-bottom:2.5rem}
.nbt-treks__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.nbt-card{position:relative;display:flex;flex-direction:column;background:var(--nk-surface);border:1px solid var(--nk-border)}
.nbt-card__img{position:relative;margin:0;height:auto;aspect-ratio:4/3;overflow:hidden}
.nbt-card__img img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.nbt-card:hover .nbt-card__img img{transform:scale(1.04)}
.nbt-card__img figcaption{position:absolute;left:0;bottom:0;padding:.35rem .6rem;font-size:.72rem;background:var(--nk-text);color:var(--nk-bg)}
.nbt-card__body{display:flex;flex-direction:column;flex:1;padding:1.25rem 1.25rem 1.1rem}
.nbt-card__region{font-size:.85rem;color:var(--nk-text-muted);margin:0 0 .3rem}
.nbt-card__name{font-family:var(--nk-font-display);font-stretch:74%;font-weight:800;font-size:1.9rem;line-height:1;text-transform:uppercase;color:var(--nk-text);margin:0 0 1rem}
.nbt-card__facts{list-style:none;margin:0 0 1.25rem;padding:0;display:flex;flex-wrap:wrap;gap:.5rem 1.25rem;font-size:.9rem;color:var(--nk-text)}
.nbt-card__facts li{display:inline-flex;align-items:center;gap:.45rem}
.nbt-card__foot{display:flex;justify-content:space-between;align-items:baseline;margin:auto 0 0;padding-top:1rem;border-top:1px solid var(--nk-border);color:var(--nk-text-muted);font-size:.9rem}
.nbt-card__foot strong{font-size:1.2rem;color:var(--nk-text)}
.nbt-card--custom{justify-content:flex-end;padding:1.75rem;background-color:var(--nk-surface-2)}
.nbt-card__text{color:var(--nk-text-muted);margin:0 0 1.5rem;line-height:1.65}
.nbt-card--custom .nbt-btn{align-self:flex-start}
@media (max-width:991.98px){.nbt-treks__grid{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.nbt-treks__grid{grid-template-columns:1fr}}

/* ---------- Grades ---------- */
.nbt-grades{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-surface-2)}
.nbt-grades__grid{display:grid;grid-template-columns:1fr 1.3fr;gap:clamp(2rem,5vw,5rem);align-items:start}
.nbt-grades__list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;border-top:2px solid var(--nk-text)}
.nbt-grades__list li{padding:1.4rem 1.25rem 1.4rem 0;border-bottom:1px solid var(--nk-border)}
.nbt-grades__list li:nth-child(even){padding-left:1.25rem;border-left:1px solid var(--nk-border)}
.nbt-grades__name{display:flex;align-items:center;gap:.6rem;margin:0 0 .4rem;font-weight:700;font-size:1.1rem;color:var(--nk-text)}
.nbt-grades__list p:last-child{margin:0;color:var(--nk-text-muted);font-size:.95rem;line-height:1.6}
@media (max-width:767.98px){.nbt-grades__grid,.nbt-grades__list{grid-template-columns:1fr}.nbt-grades__list li:nth-child(even){padding-left:0;border-left:0}}

/* ---------- Included ---------- */
.nbt-included{padding:clamp(4.5rem,9vw,7.5rem) 0!important}
.nbt-included__grid{display:grid;grid-template-columns:5fr 7fr;gap:clamp(2.5rem,5vw,5rem);align-items:center}
.nbt-included__img{margin:0;height:auto;aspect-ratio:4/5;overflow:hidden}
.nbt-included__img img{width:100%;height:100%;object-fit:cover}
.nbt-included__cols{display:grid;grid-template-columns:1.2fr 1fr;gap:2rem;margin-top:1.5rem}
.nbt-yes,.nbt-no{list-style:none;margin:0;padding:0}
.nbt-yes li,.nbt-no li{position:relative;padding:.7rem 0 .7rem 2rem;border-bottom:1px solid var(--nk-border);color:var(--nk-text)}
.nbt-yes li::before{content:"\\2713";position:absolute;left:0;top:.65rem;width:1.35rem;height:1.35rem;display:grid;place-items:center;font-size:.8rem;font-weight:700;background:var(--nk-accent);color:var(--nk-bg)}
.nbt-no li{color:var(--nk-text-muted)}
.nbt-no li::before{content:"\\2715";position:absolute;left:0;top:.65rem;width:1.35rem;height:1.35rem;display:grid;place-items:center;font-size:.72rem;border:1px solid var(--nk-border);color:var(--nk-text-muted)}
@media (max-width:991.98px){.nbt-included__grid{grid-template-columns:1fr}.nbt-included__img{height:auto;aspect-ratio:16/10}}
@media (max-width:575.98px){.nbt-included__cols{grid-template-columns:1fr}}

/* ---------- Guides ---------- */
.nbt-guides{padding:0 0 clamp(4.5rem,9vw,7.5rem)!important}
.nbt-guides__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2.5rem,5vw,5rem);align-items:center}
.nbt-quote{margin:2rem 0 0;padding:1.5rem 0 0;border-top:2px solid var(--nk-text)}
.nbt-quote p{font-size:1.25rem;line-height:1.55;font-weight:500;color:var(--nk-text);margin:0 0 1rem}
.nbt-quote footer{display:flex;flex-wrap:wrap;gap:.35rem 1rem;align-items:baseline;font-weight:700;color:var(--nk-text)}
.nbt-quote footer span{font-size:.76rem;font-weight:400;text-transform:uppercase;letter-spacing:.04em;color:var(--nk-text-muted)}
.nbt-guides__img{margin:0;height:auto;aspect-ratio:4/3;overflow:hidden}
.nbt-guides__img img{width:100%;height:100%;object-fit:cover}
@media (max-width:991.98px){.nbt-guides__grid{grid-template-columns:1fr}}
`;

const stage = (d: string, route: string, km: string, up: string, sleep: string) =>
  `<li><span class="nbt-mono nbt-day">${d}</span><div><p class="nbt-stage__route">${route}</p><p class="nbt-stage__meta nbt-mono">${km} &middot; ${up} &middot; ${sleep}</p></div></li>`;

const trek = (id: string, img: string, alt: string, w: number, h: number, region: string, name: string, lead: string, facts: [string, string][], stages: string, dates: string[], price: string, flip = false) => `
<section class="nbt-trek${flip ? " nbt-trek--flip" : ""}" id="${id}">
  <div class="nbt-wrap nbt-trek__grid">
    <div class="nbt-trek__media">
      <figure class="nbt-trek__img"><img src="${IMG}/${img}" alt="${alt}" width="${w}" height="${h}" loading="lazy"></figure>
      <dl class="nbt-trek__facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd class="nbt-mono">${v}</dd></div>`).join("")}</dl>
    </div>
    <div class="nbt-trek__copy">
      <p class="nbt-eyebrow">${region}</p>
      <h2 class="nbt-h2">${name}</h2>
      <p class="nbt-lede">${lead}</p>
      <ol class="nbt-stages">${stages}</ol>
      <div class="nbt-trek__book">
        <p class="nbt-trek__dates"><span class="nbt-mono">2026 departures</span>${dates.join(" &middot; ")}</p>
        <p class="nbt-trek__price">from <strong class="nbt-mono">$${price}</strong></p>
        <a class="btn btn-primary nbt-btn" href="/book">Reserve</a>
      </div>
    </div>
  </div>
</section>`;

const TRIPS_HTML = `
<section class="nbt-trips-hero nbt-contours--on-dark">
  <div class="nbt-wrap nbt-trips-hero__grid">
    <div class="nbt-trips-hero__copy">
      <p class="nbt-trips-hero__coords nbt-mono">Trip notes &middot; 5 treks &middot; June &ndash; November 2026</p>
      <h1 class="nbt-trips-hero__title">Every trek,<br>stage by stage</h1>
      <p class="nbt-trips-hero__lede">Distances, daily ascent, where you sleep and when we go. No surprises on day three.</p>
      <div class="nbt-trips-hero__jump" role="group" aria-label="Jump to a trek">
        <a class="nbt-chip" href="#dolomites">Dolomites</a>
        <a class="nbt-chip" href="#bernese-oberland">Swiss Alps</a>
        <a class="nbt-chip" href="#yari-hotaka">Japan</a>
        <a class="nbt-chip" href="#new-zealand">New Zealand</a>
        <a class="nbt-chip" href="#alpe-di-siusi">Alpe di Siusi</a>
      </div>
    </div>
    <figure class="nbt-trips-hero__img"><img src="${IMG}/dolomites-sunrise.webp" alt="A hiker in a red jacket watching sunrise over the jagged Seceda ridge in the Dolomites" width="960" height="720" fetchpriority="high"><figcaption class="nbt-mono">46.60&deg; N, 11.72&deg; E &middot; Seceda, 2,519 m</figcaption></figure>
  </div>
</section>
${trek("dolomites", "dolomites-lakes.webp", "A lone hiker by two alpine lakes beneath the pale cliffs of the Dolomites", 960, 610, "Italy &middot; Dolomites &middot; Grade 3", "Alta Via 1", "Lago di Braies to Belluno along the most famous high route in the Dolomites, with five nights in rifugi and two in small hotels.", [["Days", "8"], ["Distance", "68 km"], ["Ascent", "+4,620 m"], ["Group", "4 &ndash; 10"]], `${stage("D1", "Lago di Braies &rarr; Rifugio Biella", "11 km", "+850 m", "Hut")}${stage("D2", "Biella &rarr; Rifugio Lagazuoi", "16 km", "+1,120 m", "Hut")}${stage("D3", "Lagazuoi &rarr; Rifugio Nuvolau", "9 km", "+640 m", "Hut")}${stage("D4", "Nuvolau &rarr; Rifugio Coldai", "12 km", "+980 m", "Hut")}${stage("D5", "Rest day at Lago Coldai", "6 km", "+420 m", "Hut")}${stage("D6&ndash;8", "Civetta wall &rarr; Belluno", "14 km", "+1,970 m", "Hotels")}`, ["Jun 14", "Sep 6"], "3,450")}
${trek("bernese-oberland", "swiss-ridge.webp", "A hiker photographing green Swiss mountain ridges from a grassy saddle", 960, 641, "Switzerland &middot; Bernese Oberland &middot; Grade 2", "Oberland Traverse", "Beneath the Eiger, Mönch and Jungfrau on balcony paths, with mountain railways to skip the dull bits and a lake swim to finish.", [["Days", "7"], ["Distance", "62 km"], ["Ascent", "+3,300 m"], ["Group", "4 &ndash; 10"]], `${stage("D1", "Grindelwald &rarr; First &rarr; Bachalpsee", "10 km", "+520 m", "Hotel")}${stage("D2", "Faulhorn traverse &rarr; Schynige Platte", "15 km", "+780 m", "Mountain inn")}${stage("D3", "Wengen &rarr; Kleine Scheidegg", "11 km", "+620 m", "Hotel")}${stage("D4&ndash;7", "Mürren, Sefinental &amp; Lake Thun", "26 km", "+1,380 m", "Hotels")}`, ["Jul 12"], "3,890", true)}
${trek("yari-hotaka", "ridge-above-clouds.webp", "A green ridge above a sea of cloud in the Japanese Northern Alps", 1920, 1163, "Japan &middot; Northern Alps &middot; Grade 4", "Yari&ndash;Hotaka Circuit", "Japan's great alpine ridge walk: chains, ladders and huts that serve miso soup at 4 am so you can watch sunrise from 3,000 metres.", [["Days", "6"], ["Distance", "41 km"], ["Ascent", "+3,900 m"], ["Group", "4 &ndash; 8"]], `${stage("D1", "Kamikochi &rarr; Yokoo Sanso", "11 km", "+220 m", "Hut")}${stage("D2", "Yokoo &rarr; Yarigatake Sanso", "9 km", "+1,500 m", "Hut")}${stage("D3", "Daikiretto &rarr; Kitahotaka hut", "5 km", "+640 m", "Hut")}${stage("D4&ndash;6", "Okuhotaka &rarr; Kamikochi &amp; onsen", "16 km", "+1,540 m", "Hut &amp; ryokan")}`, ["Aug 2 (waitlist)"], "4,280")}
${trek("new-zealand", "southern-alps.webp", "A hiker walking a golden valley track towards snow-covered peaks in New Zealand", 960, 640, "New Zealand &middot; Southern Alps &middot; Grade 2", "Hooker Valley &amp; Mueller Hut", "Glacier lakes, swing bridges and a night at Mueller Hut beneath Aoraki / Mount Cook, then the Routeburn's lakes and beech forest.", [["Days", "9"], ["Distance", "74 km"], ["Ascent", "+3,450 m"], ["Group", "4 &ndash; 10"]], `${stage("D1&ndash;2", "Hooker Valley &amp; Tasman Glacier", "18 km", "+420 m", "Lodge")}${stage("D3", "Sealy Tarns &rarr; Mueller Hut", "5 km", "+1,050 m", "Hut")}${stage("D4&ndash;6", "Routeburn Track", "33 km", "+1,280 m", "Huts")}${stage("D7&ndash;9", "Milford Sound &amp; Queenstown", "18 km", "+700 m", "Hotels")}`, ["Nov 22"], "4,650", true)}
${trek("alpe-di-siusi", "alpine-meadows.webp", "Rolling green alpine meadows dotted with larch trees beneath rocky peaks", 960, 640, "Italy &middot; South Tyrol &middot; Grade 1", "Alpe di Siusi Meadows", "Europe's largest high meadow on gentle paths, with the same hotel every night so you only unpack once. Ideal for first-timers and families with teens.", [["Days", "5"], ["Distance", "38 km"], ["Ascent", "+1,650 m"], ["Group", "4 &ndash; 10"]], `${stage("D1", "Compatsch &rarr; Saltria loop", "8 km", "+310 m", "Hotel")}${stage("D2", "Sassolungo circuit", "11 km", "+480 m", "Hotel")}${stage("D3&ndash;5", "Seiser Alm huts &amp; Santner view", "19 km", "+860 m", "Hotel")}`, ["Jun 28"], "1,980")}

<section class="nbt-before">
  <div class="nbt-wrap nbt-before__grid">
    <div>
      <p class="nbt-eyebrow">Before you go</p>
      <h2 class="nbt-h2">Questions we hear a lot</h2>
    </div>
    <div class="nbt-before__list">
      <details open><summary>How fit do I need to be?</summary><p>For grades 1 and 2, if you can walk for five hours with breaks you'll be fine. Grades 3 and 4 need regular hill walking beforehand; we send an eight-week training plan when you book.</p></details>
      <details><summary>Can I travel on my own?</summary><p>About half our hikers do. You'll share a twin room with another solo hiker of the same gender, or pay the single supplement if you'd rather not.</p></details>
      <details><summary>What if the weather turns?</summary><p>Your guide decides on the day. We build in a rest day on most treks and always have a lower-level alternative for each stage.</p></details>
      <details><summary>What's your cancellation policy?</summary><p>Full refund up to 90 days before departure, 50% up to 45 days. After that we'll refund anything the huts return to us.</p></details>
    </div>
  </div>
</section>
${PLANNER}
${FOOTER}`;

const TRIPS_CSS = `${BASE_CSS}
.nbt-trips-hero{position:relative;padding:8.5rem 0 clamp(3.5rem,7vw,5.5rem)!important;background-color:var(--nk-accent);color:var(--nk-bg)}
.nbt-trips-hero__grid{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.nbt-trips-hero__coords{font-size:.78rem;letter-spacing:.04em;margin:0 0 1.25rem;color:color-mix(in srgb,var(--nk-bg) 78%,transparent)}
.nbt-trips-hero__title{font-family:var(--nk-font-display);font-stretch:68%;font-weight:900;font-size:clamp(3.2rem,1.6rem + 5.6vw,7.2rem);line-height:.88;text-transform:uppercase;color:var(--nk-bg);margin:0 0 1.25rem}
.nbt-trips-hero__lede{font-size:1.12rem;line-height:1.65;max-width:32rem;margin:0 0 1.75rem;color:color-mix(in srgb,var(--nk-bg) 88%,transparent)}
.nbt-trips-hero__jump{display:flex;flex-wrap:wrap;gap:.6rem}
.nbt-trips-hero__img{position:relative;margin:0;height:auto;aspect-ratio:4/4.4;overflow:hidden;box-shadow:14px 14px 0 var(--nk-primary)}
.nbt-trips-hero__img img{width:100%;height:100%;object-fit:cover;object-position:35% 50%}
.nbt-trips-hero__img figcaption{position:absolute;left:0;bottom:0;padding:.35rem .6rem;font-size:.72rem;background:var(--nk-text);color:var(--nk-bg)}
@media (max-width:991.98px){.nbt-trips-hero__grid{grid-template-columns:1fr}.nbt-trips-hero__img{height:auto;aspect-ratio:4/3;max-width:36rem;margin-right:14px}}
.nbt-chip{display:inline-flex;align-items:center;min-height:2.4rem;padding:.4rem .95rem;border:1px solid color-mix(in srgb,var(--nk-bg) 55%,transparent);border-radius:2px;font-weight:600;font-size:.92rem;color:var(--nk-bg);text-decoration:none}
.nbt-chip:hover{background:var(--nk-bg);color:var(--nk-text);text-decoration:none}
.nbt-trek{padding:clamp(4rem,8vw,6.5rem) 0!important;scroll-margin-top:1rem}
.nbt-trek + .nbt-trek{border-top:1px solid var(--nk-border)}
.nbt-trek:nth-of-type(even){background:var(--nk-surface)}
.nbt-trek__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2.5rem,5vw,5rem);align-items:start}
.nbt-trek--flip .nbt-trek__media{order:2}
.nbt-trek__img{margin:0;height:auto;aspect-ratio:4/3;overflow:hidden}
.nbt-trek__img img{width:100%;height:100%;object-fit:cover}
.nbt-trek__facts{display:grid;grid-template-columns:repeat(4,1fr);margin:0;border-bottom:1px solid var(--nk-border)}
.nbt-trek__facts div{padding:.9rem .75rem .9rem 0}
.nbt-trek__facts div + div{padding-left:.75rem;border-left:1px solid var(--nk-border)}
.nbt-trek__facts dt{font-size:.78rem;color:var(--nk-text-muted)}
.nbt-trek__facts dd{margin:0;font-size:1.1rem;font-weight:600;color:var(--nk-text)}
.nbt-stages{list-style:none;margin:1.75rem 0;padding:0;border-top:2px solid var(--nk-text)}
.nbt-stages li{display:grid;grid-template-columns:3.6rem 1fr;gap:.75rem;padding:.85rem 0;border-bottom:1px solid var(--nk-border)}
.nbt-day{display:inline-flex;align-items:center;justify-content:center;align-self:start;min-height:1.8rem;padding:0 .4rem;font-size:.78rem;font-weight:600;background:var(--nk-accent);color:var(--nk-bg)}
.nbt-stage__route{margin:0;font-weight:600;color:var(--nk-text)}
.nbt-stage__meta{margin:.15rem 0 0;font-size:.8rem;color:var(--nk-text-muted)}
.nbt-trek__book{display:flex;flex-wrap:wrap;align-items:center;gap:1rem 1.5rem}
.nbt-trek__dates{flex:1 1 100%;margin:0;color:var(--nk-text);font-weight:600}
.nbt-trek__dates span{display:block;font-size:.74rem;font-weight:400;text-transform:uppercase;letter-spacing:.05em;color:var(--nk-text-muted);margin-bottom:.2rem}
.nbt-trek__price{margin:0;color:var(--nk-text-muted)}
.nbt-trek__price strong{font-size:1.6rem;color:var(--nk-text)}
@media (max-width:991.98px){.nbt-trek__grid{grid-template-columns:1fr}.nbt-trek--flip .nbt-trek__media{order:0}}
@media (max-width:575.98px){.nbt-trek__facts{grid-template-columns:1fr 1fr}.nbt-trek__facts div:nth-child(3){padding-left:0;border-left:0}.nbt-trek__facts div:nth-child(n+3){border-top:1px solid var(--nk-border)}}
.nbt-before{padding:clamp(4.5rem,9vw,7rem) 0!important;border-top:1px solid var(--nk-border)}
.nbt-before__grid{display:grid;grid-template-columns:1fr 1.4fr;gap:clamp(2rem,5vw,5rem)}
.nbt-before__list{border-top:2px solid var(--nk-text)}
.nbt-before__list details{padding:1.1rem 0;border-bottom:1px solid var(--nk-border)}
.nbt-before__list summary{font-weight:700;font-size:1.08rem;color:var(--nk-text)}
.nbt-before__list summary:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.nbt-before__list p{margin:.75rem 0 0;color:var(--nk-text-muted);line-height:1.7}
@media (max-width:767.98px){.nbt-before__grid{grid-template-columns:1fr}}
`;

const template: StarterTemplate = {
  id: "original-travel",
  name: "Northbound Treks",
  tagline: "Small-group hiking tours with a departures board, stage-by-stage itineraries and prices",
  category: "travel",
  tags: ["travel", "tours", "hiking", "trekking", "adventure", "travel agency", "itinerary", "departures", "outdoors", "mountains", "trips", "guided tours"],
  source: "original",
  modules: ["bookings", "contact-form"],
  theme: {
    name: "Northbound Treks",
    mode: "light",
    primary: "#c2410c",
    primary2: "#9a3412",
    accent: "#1f3a2e",
    bg: "#f3f0e8",
    surface: "#ffffff",
    surface2: "#e7e2d4",
    border: "#d3ccb9",
    text: "#1f2a24",
    textMuted: "#56625a",
    font: '"Archivo", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontDisplay: '"Archivo", "Arial Narrow", ui-sans-serif, system-ui, sans-serif',
    googleFonts: ["Archivo:wdth,wght@62..125,400..900", "IBM Plex Mono:wght@400;500;600"],
    radius: "2px",
    radiusSm: "2px",
    dark: {
      name: "Northbound Treks (night hike)",
      mode: "dark",
      primary: "#c2410c",
      primary2: "#a8380a",
      accent: "#cfe3d6",
      bg: "#101713",
      surface: "#17201b",
      surface2: "#1f2a24",
      border: "#33413a",
      text: "#eef0ea",
      textMuted: "#a9b5ac",
      font: '"Archivo", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      fontDisplay: '"Archivo", "Arial Narrow", ui-sans-serif, system-ui, sans-serif',
      googleFonts: ["Archivo:wdth,wght@62..125,400..900", "IBM Plex Mono:wght@400;500;600"],
      radius: "2px",
      radiusSm: "2px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: editorSafe(HOME_CSS) },
    { title: "Treks", slug: "trips", isHome: false, html: TRIPS_HTML, css: editorSafe(TRIPS_CSS) },
  ],
};

registerTemplate(template);
export default template;
