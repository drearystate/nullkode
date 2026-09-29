/*
 * ART DIRECTION — "Saltmarsh Inn", twelve-room coastal inn on Cape Cod
 * Mood ......... airy, sun-bleached and unhurried: sand, sea-glass and driftwood.
 * Type ......... Bodoni Moda (high-contrast display, italic accents) + Jost (geometric body,
 *                wide-tracked capitals for labels).
 * Palette ...... sand-white ground, deep sea-ink text, sea-glass teal actions, driftwood accents.
 * Layout ....... centred and symmetrical, like hotel letterhead: a framed (inset) hero, arched
 *                image tops, double rules, generous white space and small-caps labels.
 * Signature .... the room rail: three arched room cards with size, bed, occupancy, view,
 *                amenities and "from" nightly rate, backed by a seasonal rate table.
 *                Booking requests go to the bookings module; questions to contact-form.
 * Prefix ....... salt-
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";

const IMG = "/templates/originals/original-hospitality";

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
/* ---------- Shared menu: letterhead bar with a double rule ---------- */
.nk-nav{position:relative;z-index:40;background:var(--nk-bg)!important;border-bottom:3px double color-mix(in srgb,var(--nk-text) 30%,transparent)!important;padding:1.1rem 0!important}
.nk-nav .container{width:min(1280px,100% - 3rem);max-width:none;padding-inline:0;margin-inline:auto}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-weight:500!important;font-size:1.2rem;letter-spacing:.32em;text-transform:uppercase;color:var(--nk-text)!important}
.nk-nav .nav-link{color:var(--nk-text)!important;font-weight:500!important;font-size:.74rem;letter-spacing:.24em;text-transform:uppercase;padding:.6rem 1rem!important}
.nk-nav .nav-link:hover,.nk-nav .nav-link.active{color:var(--nk-primary)!important;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.55em}
.nk-nav .dropdown-menu{background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;border-radius:0}
.nk-nav .dropdown-item{color:var(--nk-text)!important;letter-spacing:.06em}
.nk-nav .navbar-toggler{position:relative;width:44px;height:40px;padding:0!important;font-size:0;color:var(--nk-text)!important}
.nk-nav .navbar-toggler > span{display:none!important}
.nk-nav .navbar-toggler::before{content:"";position:absolute;left:10px;right:10px;top:50%;height:1px;background-color:currentColor;box-shadow:0 -6px 0 currentColor,0 6px 0 currentColor}
.nk-nav .nav-item:has(> a[href$="/rooms"]){order:1}
.nk-nav .nav-item:has(> a[href$="/contact-form-contact"]){order:2}
.nk-nav .nav-item:has(> a[href$="/bookings-book"]){order:9}
.nk-nav a[href$="/bookings-book"]{border:1px solid var(--nk-primary);color:var(--nk-primary)!important;margin-left:.75rem;padding-inline:1.4rem!important}
.nk-nav a[href$="/bookings-book"]:hover{background:var(--nk-primary);color:var(--nk-surface)!important;text-decoration:none}
html[data-theme="dark"] .nk-nav a[href$="/bookings-book"]:hover{color:var(--nk-text)!important}
/* Owner tools stay out of the visitor menu; the platform's role-gated "Manage" dropdown is left alone. */
.nk-nav .navbar-nav > li:has(> a[href$="-admin"]),.nk-nav .navbar-nav > li:has(> a[href$="-inbox"]),.nk-nav .navbar-nav > li:has(> a[href$="-orders"]),.nk-nav .navbar-nav > li:has(> a[href$="-subscribers"]){display:none!important}
.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:2px solid var(--nk-primary);outline-offset:3px;box-shadow:none}
@media (max-width:991.98px){
  .nk-nav .navbar-collapse{border-top:1px solid var(--nk-border);margin-top:1rem;padding:.5rem 0 .75rem}
  .nk-nav a[href$="/bookings-book"]{display:inline-block;margin:.5rem 0 0}
}

/* ---------- Foundations ---------- */
.salt-wrap{width:min(1180px,100% - 3rem);margin-inline:auto}
.salt-narrow{width:min(720px,100% - 3rem);margin-inline:auto;text-align:center}
.salt-label{font-family:var(--nk-font);font-size:.72rem;font-weight:500;letter-spacing:.34em;text-transform:uppercase;color:var(--nk-accent);margin:0 0 1.25rem}
.salt-h2{text-wrap:balance;font-family:var(--nk-font-display);font-weight:400;font-size:clamp(2.2rem,1.4rem + 2.8vw,3.9rem);line-height:1.08;letter-spacing:-.01em;color:var(--nk-text);margin:0 0 1.25rem}
.salt-h2 em{font-style:italic;color:var(--nk-primary)}
.salt-text{font-size:1.06rem;line-height:1.8;color:var(--nk-text-muted);margin:0}
.salt-rule{display:block;width:4.5rem;height:0;margin:2rem auto;border-top:3px double var(--nk-accent)}
.salt-btn{display:inline-flex;align-items:center;justify-content:center;min-height:3.2rem;padding:.9rem 2rem;border-radius:0;font-family:var(--nk-font);font-size:.76rem;font-weight:500;letter-spacing:.26em;text-transform:uppercase;text-decoration:none;transition:background-color .2s ease,color .2s ease}
.salt-btn:hover{text-decoration:none}
.salt-btn.btn-primary{box-shadow:none}
.salt-btn--line{border:1px solid var(--nk-text);color:var(--nk-text);background:transparent}
.salt-btn--line:hover{background:var(--nk-text);color:var(--nk-bg)}
.salt-link{font-size:.74rem;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--nk-primary);text-decoration:underline;text-underline-offset:.6em;text-decoration-thickness:1px}
.salt-link:hover{color:var(--nk-text)}
.salt-btn:focus-visible,.salt-link:focus-visible,.salt-footer a:focus-visible{outline:2px solid var(--nk-primary);outline-offset:4px}
.salt-arch{margin:0;overflow:hidden;border-radius:999px 999px 0 0}
.salt-arch img{display:block;width:100%;height:100%;object-fit:cover}

/* ---------- Booking band ---------- */
.salt-cta{padding:clamp(5rem,10vw,8rem) 0!important;background:var(--nk-surface-2);text-align:center}
.salt-cta__box{position:relative;padding:clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem);background:var(--nk-surface);outline:1px solid var(--nk-border);outline-offset:-12px}
.salt-cta__actions{display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;margin-top:2rem}
.salt-cta__small{margin:1.5rem 0 0;font-size:.9rem;color:var(--nk-text-muted)}

/* ---------- Footer ---------- */
.salt-footer{padding:clamp(4rem,8vw,5.5rem) 0 2.5rem;border-top:3px double color-mix(in srgb,var(--nk-text) 30%,transparent);text-align:center}
.salt-footer .salt-footer__brand{font-family:var(--nk-font-display);font-size:1.6rem;letter-spacing:.3em;text-transform:uppercase;color:var(--nk-text);margin:0 0 .5rem}
.salt-footer__tag{font-family:var(--nk-font-display);font-style:italic;font-size:1.1rem;color:var(--nk-text-muted);margin:0 0 2.5rem}
.salt-footer__cols{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;padding:2rem 0;border-block:1px solid var(--nk-border)}
.salt-footer h2{font-family:var(--nk-font);font-size:.7rem;font-weight:500;letter-spacing:.3em;text-transform:uppercase;color:var(--nk-accent);margin:0 0 .75rem}
.salt-footer p{font-size:.95rem;line-height:1.7;color:var(--nk-text-muted);margin:0}
.salt-footer a{color:var(--nk-text);text-decoration:underline;text-decoration-color:var(--nk-border);text-underline-offset:3px}
.salt-footer a:hover{color:var(--nk-primary)}
.salt-footer__base{margin:2rem 0 0;font-size:.82rem;color:var(--nk-text-muted)}
@media (max-width:767.98px){.salt-footer__cols{grid-template-columns:1fr}}
`;

const FOOTER = `
<footer class="salt-footer">
  <div class="salt-wrap">
    <p class="salt-footer__brand">Saltmarsh Inn</p>
    <p class="salt-footer__tag">Twelve rooms at the edge of the dunes</p>
    <div class="salt-footer__cols">
      <div><h2>Find us</h2><p>14 Beach Plum Lane<br>Wellfleet, MA 02667</p></div>
      <div><h2>Front desk</h2><p><a href="tel:+15085550164">(508) 555-0164</a><br><a href="mailto:stay@saltmarshinn.com">stay@saltmarshinn.com</a></p></div>
      <div><h2>Season</h2><p>Open April to December<br>Winter weekends by arrangement</p></div>
    </div>
    <p class="salt-footer__base">&copy; 2026 Saltmarsh Inn &middot; Check-in 3 pm &middot; Check-out 11 am</p>
  </div>
</footer>`;

const CTA = `
<section class="salt-cta">
  <div class="salt-wrap">
    <div class="salt-cta__box">
      <p class="salt-label">Book direct</p>
      <h2 class="salt-h2">Book direct, <em>stay a little longer</em></h2>
      <p class="salt-text">Booking with us directly gets you our best rate, a noon check-out on request and a bottle of local cider waiting in your room. Two-night minimum; three in July and August.</p>
      <div class="salt-cta__actions">
        <a class="btn btn-primary salt-btn" href="/book">Request dates</a>
        <a class="salt-btn salt-btn--line" href="tel:+15085550164">Call the front desk</a>
      </div>
      <p class="salt-cta__small">Weddings, retreats and whole-inn buyouts: <a class="salt-link" href="/contact">send us a note</a></p>
    </div>
  </div>
</section>`;

const room = (img: string, alt: string, name: string, count: string, specs: string[], amen: string[], price: string) => `
      <article class="salt-room">
        <figure class="salt-arch salt-room__img"><img src="${IMG}/${img}" alt="${alt}" width="960" height="640" loading="lazy"></figure>
        <p class="salt-room__count">${count}</p>
        <h3 class="salt-room__name">${name}</h3>
        <ul class="salt-room__specs">${specs.map((s) => `<li>${s}</li>`).join("")}</ul>
        <ul class="salt-room__amen">${amen.map((s) => `<li>${s}</li>`).join("")}</ul>
        <p class="salt-room__price">from <strong>$${price}</strong> / night</p>
      </article>`;

const HOME_HTML = `
<section class="salt-hero">
  <div class="salt-hero__frame">
    <img class="salt-hero__img" src="${IMG}/dune-path.webp" alt="A sandy path through marram grass over the dunes, with the Atlantic beyond" width="1920" height="1440" fetchpriority="high">
    <div class="salt-hero__panel">
      <p class="salt-label">Wellfleet &middot; Cape Cod</p>
      <h1 class="salt-hero__title">Twelve rooms at the <em>edge of the dunes</em></h1>
      <p class="salt-hero__lede">A small inn with big windows, a proper breakfast and the Atlantic four minutes away down a sandy path.</p>
      <div class="salt-hero__actions">
        <a class="btn btn-primary salt-btn" href="/book">Check availability</a>
        <a class="salt-btn salt-btn--line" href="/rooms">Rooms &amp; rates</a>
      </div>
    </div>
  </div>
  <ul class="salt-wrap salt-hero__facts">
    <li><span>Check in</span>from 3 pm</li>
    <li><span>Breakfast</span>8 &ndash; 10:30 am, included</li>
    <li><span>The beach</span>4 minutes on foot</li>
    <li><span>Season</span>April &ndash; December</li>
  </ul>
</section>

<section class="salt-welcome">
  <div class="salt-wrap salt-welcome__grid">
    <div class="salt-welcome__side">
      <h2 class="salt-label">Welcome</h2>
      <p class="salt-welcome__lead">Built in 1898 as a lifesaving station, Saltmarsh became an inn in 1952. We've kept the wide porches and the lookout tower, and added the things salt air calls for: deep baths, heavy linen and very good coffee.</p>
    </div>
    <figure class="salt-arch salt-welcome__img"><img src="${IMG}/bedside.webp" alt="A bright bedroom corner with a copper reading lamp, a small vase and white linen" width="960" height="640" loading="lazy"></figure>
    <div class="salt-welcome__side">
      <p class="salt-welcome__note">&ldquo;We run Saltmarsh the way we'd want to be looked after: quietly, with good local advice and a pot of coffee waiting.&rdquo;</p>
      <p class="salt-welcome__sign">Mara &amp; Tom Ellery, innkeepers</p>
    </div>
  </div>
</section>

<section class="salt-rooms" id="rooms">
  <div class="salt-narrow">
    <p class="salt-label">The rooms</p>
    <h2 class="salt-h2">Three ways to <em>wake up</em> by the sea</h2>
    <p class="salt-text">Every room has a king or queen bed dressed in stonewashed linen, a rain shower, blackout blinds and a window you'll want to leave open.</p>
    <span class="salt-rule"></span>
  </div>
  <div class="salt-wrap salt-rooms__grid">${room("dune-room.webp", "A made-up queen bed with crisp white pillows against a warm timber wall", "Dune Room", "4 rooms", ["280 sq ft", "Queen bed", "Sleeps 2", "Garden or dune view"], ["Rain shower", "Writing desk", "Dogs welcome"], "245")}${room("marsh-suite.webp", "A light-filled suite with a king bed, sheer curtains and an armchair by the window", "Marsh Suite", "5 suites", ["420 sq ft", "King bed", "Sleeps 2 + child", "Salt-marsh view"], ["Private deck", "Reading nook", "Espresso machine"], "325")}${room("lighthouse-loft.webp", "A timber-lined loft bedroom glowing with warm light behind sheer curtains", "Lighthouse Loft", "3 lofts", ["560 sq ft", "King + sofa bed", "Sleeps 4", "Atlantic view"], ["Soaking tub", "Lookout window", "Kitchenette"], "410")}
  </div>
  <p class="salt-rooms__more"><a class="salt-link" href="/rooms">Compare rooms &amp; seasonal rates</a></p>
</section>

<section class="salt-amenities">
  <div class="salt-wrap">
    <div class="salt-narrow">
      <p class="salt-label">Included with every stay</p>
      <h2 class="salt-h2">The small things, <em>done properly</em></h2>
    </div>
    <dl class="salt-amenities__grid">
      <div><dt>Breakfast</dt><dd>Cooked to order, 8 to 10:30 am</dd></div>
      <div><dt>Beach kit</dt><dd>Chairs, umbrellas and towels</dd></div>
      <div><dt>Bicycles</dt><dd>Six cruisers, helmets and a trail map</dd></div>
      <div><dt>Sauna</dt><dd>Cedar barrel sauna in the garden</dd></div>
      <div><dt>Parking</dt><dd>Free, with two EV chargers</dd></div>
      <div><dt>Dogs</dt><dd>Welcome in Dune Rooms, $40 per stay</dd></div>
      <div><dt>Wi-Fi</dt><dd>Fast and free, if you must</dd></div>
      <div><dt>Late checkout</dt><dd>Until noon when you book direct</dd></div>
    </dl>
  </div>
</section>

<section class="salt-mornings">
  <div class="salt-wrap salt-mornings__grid">
    <figure class="salt-mornings__img"><img src="${IMG}/breakfast-in-bed.webp" alt="A steaming cup of tea and an open book on a breakfast tray in bed" width="960" height="640" loading="lazy"></figure>
    <div class="salt-mornings__copy">
      <p class="salt-label">Mornings</p>
      <h2 class="salt-h2">Breakfast is <em>the whole point</em></h2>
      <p class="salt-text">Served on the long porch or on a tray in your room. Everything is made in our kitchen or bought from within twenty miles.</p>
      <ul class="salt-mornings__menu">
        <li>Warm popovers with beach-plum jam</li>
        <li>Soft-scrambled eggs, chives, sourdough toast</li>
        <li>Wellfleet oysters on Saturday mornings</li>
        <li>Blueberry buckwheat pancakes, maple butter</li>
      </ul>
    </div>
  </div>
</section>

<section class="salt-rates">
  <div class="salt-wrap">
    <div class="salt-narrow">
      <p class="salt-label">Seasonal rates</p>
      <h2 class="salt-h2">Plain prices, <em>per night</em></h2>
      <p class="salt-text">For two guests, breakfast included. Taxes are added at 11.7%. No resort fees, ever.</p>
    </div>
    <div class="salt-table-wrap" role="region" aria-label="Nightly rates by season" tabindex="0">
      <table class="salt-table">
        <thead><tr><th scope="col">Room</th><th scope="col">Nov &ndash; Mar</th><th scope="col">Apr, May &amp; Oct</th><th scope="col">Jun &ndash; Sep</th></tr></thead>
        <tbody>
          <tr><th scope="row">Dune Room</th><td data-label="Nov &ndash; Mar">$245</td><td data-label="Apr, May &amp; Oct">$295</td><td data-label="Jun &ndash; Sep">$365</td></tr>
          <tr><th scope="row">Marsh Suite</th><td data-label="Nov &ndash; Mar">$325</td><td data-label="Apr, May &amp; Oct">$385</td><td data-label="Jun &ndash; Sep">$465</td></tr>
          <tr><th scope="row">Lighthouse Loft</th><td data-label="Nov &ndash; Mar">$410</td><td data-label="Apr, May &amp; Oct">$480</td><td data-label="Jun &ndash; Sep">$575</td></tr>
        </tbody>
      </table>
    </div>
    <ul class="salt-policies">
      <li><strong>Minimum stay</strong>Two nights; three in July and August</li>
      <li><strong>Cancellation</strong>Free up to 14 days before arrival</li>
      <li><strong>Children</strong>Under 5 stay free in Marsh Suites and Lofts</li>
    </ul>
  </div>
</section>

<section class="salt-nearby">
  <div class="salt-wrap salt-nearby__grid">
    <div>
      <p class="salt-label">Out the door</p>
      <h2 class="salt-h2">Close enough <em>to walk</em></h2>
      <ol class="salt-nearby__list">
        <li><span>Newcomb Hollow Beach</span><span>4 min walk</span></li>
        <li><span>Lighthouse Trail head</span><span>0.8 mi</span></li>
        <li><span>Wellfleet harbour &amp; oyster shacks</span><span>10 min by bike</span></li>
        <li><span>Drive-in cinema</span><span>2.6 mi</span></li>
        <li><span>Bay-side sunset beach</span><span>12 min by bike</span></li>
      </ol>
    </div>
    <div class="salt-nearby__imgs">
      <figure class="salt-arch salt-nearby__tall"><img src="${IMG}/marram-path.webp" alt="A worn sand path running through dry grass towards the shore" width="960" height="641" loading="lazy"></figure>
      <figure class="salt-nearby__small"><img src="${IMG}/seashell.webp" alt="A scallop shell at the edge of a foamy wave on wet sand" width="960" height="640" loading="lazy"></figure>
    </div>
  </div>
</section>

<section class="salt-review">
  <div class="salt-narrow">
    <p class="salt-review__stars" aria-label="Rated 4.9 out of 5">&#9733; &#9733; &#9733; &#9733; &#9733;</p>
    <blockquote class="salt-review__quote">
      <p>&ldquo;The kind of place you plan next year's trip from before you've even left. Room 7 has the best view on the Cape, and those popovers ruined every other breakfast for me.&rdquo;</p>
      <footer>Hannah R., stayed in October &middot; 4.9 from 312 guest reviews</footer>
    </blockquote>
  </div>
</section>
${CTA}
${FOOTER}`;

const HOME_CSS = `${BASE_CSS}
/* ---------- Framed hero ---------- */
.salt-hero{padding:clamp(.75rem,1.5vw,1.25rem) clamp(.75rem,1.5vw,1.25rem) 0!important}
.salt-hero__frame{position:relative;isolation:isolate;overflow:hidden;min-height:620px;min-height:max(620px,calc(100svh - 7rem));display:grid;place-items:center;padding:4rem 1.25rem}
.salt-hero__img{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;object-position:50% 0%}
.salt-hero__frame::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,color-mix(in srgb,var(--nk-text) 18%,transparent),color-mix(in srgb,var(--nk-text) 38%,transparent))}
.salt-hero__panel{width:min(640px,100%);text-align:center;padding:clamp(2.25rem,5vw,3.5rem) clamp(1.5rem,4vw,3.25rem);background:color-mix(in srgb,var(--nk-bg) 92%,transparent);outline:1px solid color-mix(in srgb,var(--nk-accent) 55%,transparent);outline-offset:-12px}
.salt-hero__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:400;font-size:clamp(2.5rem,1.4rem + 4vw,4.6rem);line-height:1.04;letter-spacing:-.015em;color:var(--nk-text);margin:0 0 1.25rem}
.salt-hero__title em{font-style:italic;color:var(--nk-primary)}
.salt-hero__lede{font-size:1.08rem;line-height:1.7;color:var(--nk-text-muted);margin:0 auto 2rem;max-width:30rem}
.salt-hero__actions{display:flex;flex-wrap:wrap;gap:.9rem;justify-content:center}
.salt-hero__facts{list-style:none;margin-top:0;margin-bottom:0;padding:1.75rem 0;display:grid;grid-template-columns:repeat(4,1fr);text-align:center}
.salt-hero__facts li{padding:0 1rem;font-family:var(--nk-font-display);font-size:1.1rem;color:var(--nk-text)}
.salt-hero__facts li + li{border-left:1px solid var(--nk-border)}
.salt-hero__facts span{display:block;font-family:var(--nk-font);font-size:.66rem;font-weight:500;letter-spacing:.3em;text-transform:uppercase;color:var(--nk-accent);margin-bottom:.35rem}
@media (max-width:767.98px){
  .salt-hero__facts{grid-template-columns:1fr 1fr;row-gap:1.25rem}
  .salt-hero__facts li:nth-child(3){border-left:0}
}

/* ---------- Welcome ---------- */
.salt-welcome{padding:clamp(5rem,10vw,8rem) 0!important}
.salt-welcome__grid{display:grid;grid-template-columns:1fr minmax(0,26rem) 1fr;gap:clamp(2rem,5vw,4.5rem);align-items:center}
.salt-welcome__img{height:auto;aspect-ratio:3/4}
.salt-welcome__lead{font-size:1.06rem;line-height:1.85;color:var(--nk-text-muted);margin:0}
.salt-welcome__note{font-family:var(--nk-font-display);font-style:italic;font-size:clamp(1.35rem,1.1rem + .8vw,1.75rem);line-height:1.4;color:var(--nk-text);margin:0 0 1.25rem}
.salt-welcome__sign{font-size:.72rem;letter-spacing:.3em;text-transform:uppercase;color:var(--nk-accent);margin:0}
@media (max-width:991.98px){.salt-welcome__grid{grid-template-columns:1fr;text-align:center}.salt-welcome__img{max-width:22rem;margin-inline:auto;width:100%}}

/* ---------- Rooms (signature) ---------- */
.salt-rooms{padding:clamp(5rem,10vw,8rem) 0!important;background:var(--nk-surface)}
.salt-rooms__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1.5rem,3vw,2.75rem);margin-top:1rem}
.salt-room{text-align:center}
.salt-room__img{height:auto;aspect-ratio:4/5;margin-bottom:1.75rem}
.salt-room__count{font-size:.68rem;letter-spacing:.32em;text-transform:uppercase;color:var(--nk-accent);margin:0 0 .5rem}
.salt-room__name{font-family:var(--nk-font-display);font-weight:400;font-size:2rem;color:var(--nk-text);margin:0 0 1rem}
.salt-room__specs{list-style:none;margin:0 0 1rem;padding:.9rem 0;display:flex;flex-wrap:wrap;justify-content:center;gap:.35rem 0;border-block:1px solid var(--nk-border)}
.salt-room__specs li{font-size:.92rem;color:var(--nk-text)}
.salt-room__specs li + li::before{content:"\\00B7";margin:0 .6rem;color:var(--nk-accent)}
.salt-room__amen{list-style:none;margin:0 0 1.25rem;padding:0;font-size:.92rem;color:var(--nk-text-muted);line-height:1.9}
.salt-room__price{margin:0;font-size:.95rem;color:var(--nk-text-muted)}
.salt-room__price strong{font-family:var(--nk-font-display);font-weight:500;font-size:1.7rem;color:var(--nk-primary)}
.salt-rooms__more{text-align:center;margin:3rem 0 0}
@media (max-width:991.98px){.salt-rooms__grid{grid-template-columns:1fr;max-width:28rem;margin-inline:auto}}

/* ---------- Amenities ---------- */
.salt-amenities{padding:clamp(5rem,10vw,8rem) 0!important}
.salt-amenities__grid{display:grid;grid-template-columns:repeat(4,1fr);margin:3rem 0 0;border-top:1px solid var(--nk-border);border-left:1px solid var(--nk-border)}
.salt-amenities__grid div{padding:1.75rem 1.5rem;border-right:1px solid var(--nk-border);border-bottom:1px solid var(--nk-border);text-align:center}
.salt-amenities__grid dt{font-family:var(--nk-font-display);font-weight:400;font-size:1.35rem;color:var(--nk-text);margin-bottom:.4rem}
.salt-amenities__grid dd{margin:0;font-size:.93rem;color:var(--nk-text-muted);line-height:1.6}
@media (max-width:991.98px){.salt-amenities__grid{grid-template-columns:1fr 1fr}}
@media (max-width:340px){.salt-amenities__grid{grid-template-columns:1fr}}
@media (max-width:575.98px){.salt-amenities__grid div{padding:1.25rem .9rem}}

/* ---------- Mornings ---------- */
.salt-mornings{padding:0 0 clamp(5rem,10vw,8rem)!important}
.salt-mornings__grid{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(2.5rem,6vw,6rem);align-items:center}
.salt-mornings__img{margin:0;padding:12px;border:1px solid var(--nk-border);background:var(--nk-surface)}
.salt-mornings__img img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}
.salt-mornings__menu{list-style:none;margin:1.75rem 0 0;padding:0}
.salt-mornings__menu li{padding:.85rem 0;border-bottom:1px solid var(--nk-border);font-family:var(--nk-font-display);font-size:1.15rem;color:var(--nk-text)}
.salt-mornings__menu li::before{content:"\\2014";margin-right:.75rem;color:var(--nk-accent)}
@media (max-width:991.98px){.salt-mornings__grid{grid-template-columns:1fr}}

/* ---------- Rates ---------- */
.salt-rates{padding:clamp(5rem,10vw,8rem) 0!important;background:var(--nk-surface)}
.salt-table-wrap{position:relative;overflow-x:auto;margin-top:2.5rem}
.salt-table-wrap:focus-visible{outline:2px solid var(--nk-primary);outline-offset:4px}
.salt-table{width:100%;min-width:36rem;border-collapse:collapse;text-align:center}
.salt-table th,.salt-table td{padding:1.15rem 1rem;border-bottom:1px solid var(--nk-border);color:var(--nk-text)}
.salt-table thead th{font-family:var(--nk-font);font-size:.68rem;font-weight:500;letter-spacing:.26em;text-transform:uppercase;color:var(--nk-accent);border-bottom:3px double var(--nk-border)}
.salt-table tbody th{text-align:left;font-family:var(--nk-font-display);font-weight:400;font-size:1.3rem}
.salt-table td{font-family:var(--nk-font-display);font-size:1.25rem;font-variant-numeric:lining-nums}
.salt-policies{list-style:none;margin:2.5rem 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.salt-policies li{font-size:.95rem;color:var(--nk-text-muted);line-height:1.6;text-align:center}
.salt-policies strong{display:block;font-family:var(--nk-font);font-size:.68rem;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:var(--nk-text);margin-bottom:.4rem}
@media (max-width:767.98px){.salt-policies{grid-template-columns:1fr}}
@media (max-width:575.98px){
  .salt-table{min-width:0}
  .salt-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .salt-table tbody tr{display:block;padding:1rem 0;border-bottom:1px solid var(--nk-border)}
  .salt-table tbody th{display:block;padding:0 0 .5rem;border-bottom:0}
  .salt-table td{display:flex;justify-content:space-between;align-items:baseline;padding:.3rem 0;border-bottom:0}
  .salt-table td::before{content:attr(data-label);font-family:var(--nk-font);font-size:.66rem;letter-spacing:.2em;text-transform:uppercase;color:var(--nk-accent)}
}

/* ---------- Nearby ---------- */
.salt-nearby{padding:clamp(5rem,10vw,8rem) 0!important}
.salt-nearby__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2.5rem,6vw,6rem);align-items:center}
.salt-nearby__list{list-style:none;margin:1.5rem 0 0;padding:0;counter-reset:near}
.salt-nearby__list li{display:flex;justify-content:space-between;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--nk-border);color:var(--nk-text);counter-increment:near}
.salt-nearby__list li span:first-child::before{content:counter(near,upper-roman) ".";display:inline-block;min-width:2.4rem;font-family:var(--nk-font-display);font-style:italic;color:var(--nk-accent)}
.salt-nearby__list li span:last-child{color:var(--nk-text-muted);white-space:nowrap;font-size:.93rem}
.salt-nearby__imgs{display:grid;grid-template-columns:1.2fr .8fr;gap:1rem;align-items:end}
.salt-nearby__tall{aspect-ratio:3/4.3}
.salt-nearby__small{margin:0 0 2.5rem;aspect-ratio:1/1;overflow:hidden;border-radius:50%}
.salt-nearby__small img{width:100%;height:100%;object-fit:cover;object-position:82% 78%}
@media (max-width:991.98px){.salt-nearby__grid{grid-template-columns:1fr}}

/* ---------- Review ---------- */
.salt-review{padding:clamp(5rem,10vw,8rem) 0!important;border-top:1px solid var(--nk-border)}
.salt-review__stars{font-size:1rem;letter-spacing:.3em;color:var(--nk-accent);margin:0 0 1.5rem}
.salt-review__quote{margin:0}
.salt-review__quote p{font-family:var(--nk-font-display);font-style:italic;font-size:clamp(1.6rem,1.2rem + 1.4vw,2.5rem);line-height:1.35;color:var(--nk-text);margin:0 0 1.5rem}
.salt-review__quote footer{font-size:.72rem;letter-spacing:.28em;text-transform:uppercase;color:var(--nk-text-muted)}
`;

const roomDetail = (img: string, alt: string, name: string, lead: string, facts: [string, string][], amen: string[], rates: [string, string, string], flip = false) => `
<section class="salt-detail${flip ? " salt-detail--flip" : ""}">
  <div class="salt-wrap salt-detail__grid">
    <figure class="salt-arch salt-detail__img"><img src="${IMG}/${img}" alt="${alt}" width="960" height="640" loading="lazy"></figure>
    <div class="salt-detail__copy">
      <h2 class="salt-h2">${name}</h2>
      <p class="salt-text">${lead}</p>
      <dl class="salt-detail__facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <p class="salt-detail__amen"><span>In the room</span>${amen.join(" &middot; ")}</p>
      <table class="salt-mini">
        <caption>Nightly rate for two, breakfast included</caption>
        <thead><tr><th scope="col">Nov &ndash; Mar</th><th scope="col">Apr, May &amp; Oct</th><th scope="col">Jun &ndash; Sep</th></tr></thead>
        <tbody><tr><td>$${rates[0]}</td><td>$${rates[1]}</td><td>$${rates[2]}</td></tr></tbody>
      </table>
      <a class="btn btn-primary salt-btn" href="/book">Request this room</a>
    </div>
  </div>
</section>`;

const ROOMS_HTML = `
<section class="salt-page-head">
  <div class="salt-narrow">
    <p class="salt-label">Rooms &amp; rates</p>
    <h1 class="salt-page-head__title">Twelve rooms, <em>three characters</em></h1>
    <p class="salt-text">All rooms are on the first and second floors of the old station house, with windows that open and floors that creak just enough. Every rate includes breakfast for two.</p>
    <span class="salt-rule"></span>
  </div>
</section>
${roomDetail("dune-room.webp", "A made-up queen bed with crisp white pillows against a warm timber wall", "Dune Room", "Our snuggest rooms, tucked behind the garden and facing the grass-topped dunes. Dogs are welcome in all four.", [["Size", "280 sq ft"], ["Bed", "Queen"], ["Sleeps", "2 guests"], ["View", "Garden or dunes"]], ["Rain shower", "Writing desk", "Dog bed & bowls", "Blackout blinds", "Tea tray"], ["245", "295", "365"])}
${roomDetail("marsh-suite.webp", "A light-filled suite with a king bed, sheer curtains and an armchair by the window", "Marsh Suite", "Corner suites looking west over the salt marsh: the best place in the house to watch the tide come in and the sun go down.", [["Size", "420 sq ft"], ["Bed", "King"], ["Sleeps", "2 + child under 12"], ["View", "Salt marsh, west"]], ["Private deck", "Reading nook", "Espresso machine", "Walk-in shower", "Robes & slippers"], ["325", "385", "465"], true)}
${roomDetail("lighthouse-loft.webp", "A timber-lined loft bedroom glowing with warm light behind sheer curtains", "Lighthouse Loft", "Up in the eaves with a lookout window facing the Atlantic. Big enough for a family, or two people who want a soaking tub with a sea view.", [["Size", "560 sq ft"], ["Beds", "King + sofa bed"], ["Sleeps", "4 guests"], ["View", "Atlantic, east"]], ["Soaking tub", "Kitchenette", "Lookout window", "Two sinks", "Bluetooth speaker"], ["410", "480", "575"])}

<section class="salt-rules">
  <div class="salt-wrap">
    <div class="salt-narrow">
      <p class="salt-label">Good to know</p>
      <h2 class="salt-h2">House <em>policies</em></h2>
    </div>
    <dl class="salt-rules__grid">
      <div><dt>Arrival</dt><dd>Check-in from 3 pm. Arriving after 9 pm? We'll leave your key in a numbered envelope.</dd></div>
      <div><dt>Departure</dt><dd>Check-out by 11 am, or noon when you book direct. Luggage storage is free.</dd></div>
      <div><dt>Minimum stay</dt><dd>Two nights, three in July and August. Single nights sometimes open up midweek.</dd></div>
      <div><dt>Cancellation</dt><dd>Free up to 14 days before arrival. After that we'll try to resell the room and refund if we can.</dd></div>
      <div><dt>Accessibility</dt><dd>Dune Room 2 is step-free with a roll-in shower and grab rails.</dd></div>
      <div><dt>Quiet hours</dt><dd>10 pm to 7 am. The only thing you should hear at night is the surf.</dd></div>
    </dl>
  </div>
</section>
${CTA}
${FOOTER}`;

const ROOMS_CSS = `${BASE_CSS}
.salt-page-head{padding:clamp(4.5rem,9vw,7rem) 0 clamp(2rem,4vw,3rem)!important}
.salt-page-head__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:400;font-size:clamp(2.6rem,1.5rem + 4.2vw,4.8rem);line-height:1.04;letter-spacing:-.015em;color:var(--nk-text);margin:0 0 1.25rem}
.salt-page-head__title em{font-style:italic;color:var(--nk-primary)}
.salt-detail{padding:clamp(3rem,7vw,5rem) 0!important}
.salt-detail + .salt-detail{border-top:1px solid var(--nk-border)}
.salt-detail__grid{display:grid;grid-template-columns:5fr 6fr;gap:clamp(2.5rem,6vw,6rem);align-items:center}
.salt-detail--flip .salt-detail__img{order:2}
.salt-detail__img{height:auto;aspect-ratio:4/5}
.salt-detail__facts{display:grid;grid-template-columns:repeat(4,1fr);margin:1.75rem 0;border-block:1px solid var(--nk-border)}
.salt-detail__facts div{padding:1rem .75rem}
.salt-detail__facts div + div{border-left:1px solid var(--nk-border)}
.salt-detail__facts dt{font-size:.64rem;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:var(--nk-accent);margin-bottom:.3rem}
.salt-detail__facts dd{margin:0;font-family:var(--nk-font-display);font-size:1.1rem;color:var(--nk-text)}
.salt-detail__amen{font-size:.98rem;line-height:1.8;color:var(--nk-text-muted);margin:0 0 1.5rem}
.salt-detail__amen span{display:block;font-size:.66rem;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:var(--nk-text);margin-bottom:.3rem}
.salt-mini{width:100%;border-collapse:collapse;margin:0 0 2rem;text-align:center}
.salt-mini caption{caption-side:bottom;padding-top:.6rem;font-size:.82rem;color:var(--nk-text-muted);text-align:left}
.salt-mini th{font-size:.64rem;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--nk-accent);padding:.6rem;border-bottom:1px solid var(--nk-border)}
.salt-mini td{font-family:var(--nk-font-display);font-size:1.45rem;color:var(--nk-primary);padding:.75rem .6rem;border-bottom:1px solid var(--nk-border)}
@media (max-width:991.98px){.salt-detail__grid{grid-template-columns:1fr}.salt-detail--flip .salt-detail__img{order:0}.salt-detail__img{max-width:26rem;width:100%;margin-inline:auto}}
@media (max-width:575.98px){.salt-detail__facts{grid-template-columns:1fr 1fr}.salt-detail__facts div:nth-child(3){border-left:0}.salt-mini th{letter-spacing:.08em}}
.salt-rules{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-surface)}
.salt-rules__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin:2.5rem 0 0;border-top:1px solid var(--nk-border)}
.salt-rules__grid div{padding:1.75rem 1.5rem 1.75rem 0;border-bottom:1px solid var(--nk-border)}
.salt-rules__grid dt{font-family:var(--nk-font-display);font-weight:400;font-size:1.35rem;color:var(--nk-text);margin-bottom:.4rem}
.salt-rules__grid dd{margin:0;font-size:.95rem;line-height:1.7;color:var(--nk-text-muted)}
@media (max-width:991.98px){.salt-rules__grid{grid-template-columns:1fr 1fr;column-gap:2rem}}
@media (max-width:575.98px){.salt-rules__grid{grid-template-columns:1fr}}
`;

const template: StarterTemplate = {
  id: "original-hospitality",
  name: "Saltmarsh Inn",
  tagline: "Airy coastal boutique inn with room cards, nightly rates, amenities and booking requests",
  category: "hospitality",
  tags: ["hotel", "inn", "boutique hotel", "bed and breakfast", "b&b", "rooms", "rates", "beach", "coastal", "resort", "guesthouse", "booking"],
  source: "original",
  modules: ["bookings", "contact-form"],
  theme: {
    name: "Saltmarsh Inn",
    mode: "light",
    primary: "#2e5a5e",
    primary2: "#23474a",
    accent: "#8a6440",
    bg: "#f7f4ee",
    surface: "#fffdf9",
    surface2: "#eee8dd",
    border: "#ddd3c3",
    text: "#1e2b2c",
    textMuted: "#566566",
    font: '"Jost", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontDisplay: '"Bodoni Moda", "Didot", Georgia, serif',
    googleFonts: ["Bodoni Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400..600", "Jost:wght@400;500;600"],
    radius: "0px",
    radiusSm: "0px",
    dark: {
      name: "Saltmarsh Inn (night tide)",
      mode: "dark",
      primary: "#357075",
      primary2: "#2b5d61",
      accent: "#d2a77e",
      bg: "#101a1b",
      surface: "#172425",
      surface2: "#1e2e2f",
      border: "#2d4142",
      text: "#eef2ef",
      textMuted: "#a9b8b6",
      font: '"Jost", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      fontDisplay: '"Bodoni Moda", "Didot", Georgia, serif',
      googleFonts: ["Bodoni Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400..600", "Jost:wght@400;500;600"],
      radius: "0px",
      radiusSm: "0px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: editorSafe(HOME_CSS) },
    { title: "Rooms & Rates", slug: "rooms", isHome: false, html: ROOMS_HTML, css: editorSafe(ROOMS_CSS) },
  ],
};

registerTemplate(template);
export default template;
