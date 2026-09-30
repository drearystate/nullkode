/*
 * ART DIRECTION — "Parcel Real Estate", an independent Portland brokerage
 * Mood ......... crisp, modernist and data-literate: an architect's drawing set, not a glossy
 *                billboard. Confident, local, calm.
 * Type ......... Bricolage Grotesque (characterful grotesk display) + Hanken Grotesk (clean UI
 *                and body, tabular figures for prices and specs).
 * Palette ...... limestone ground, near-black ink, cobalt for actions and prices, verdigris
 *                for "open house" and "new" signals.
 * Layout ....... architectural: faint column rules behind the hero, a floating search panel,
 *                spec-sheet listing cards, ruled data tables and monogram agent cards.
 * Signature .... "Homes for sale": a working, script-free search panel (type / bedrooms / price
 *                radio chips + :has() filtering, a live CSS-counter result count and a real
 *                reset button) over listing cards with price, beds, baths and square footage.
 *                Viewings and valuations go to the bookings module; enquiries to contact-form.
 * Prefix ....... prc-
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
/* ---------- Shared menu: white bar, ruled, with a cobalt "Book" button ---------- */
.nk-nav{position:sticky!important;top:0;z-index:40;background:var(--nk-surface)!important;border-bottom:1px solid var(--nk-text)!important;padding:.7rem 0!important}
.nk-nav .container{width:min(1280px,100% - 2.5rem);max-width:none;padding-inline:0;margin-inline:auto}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-weight:800!important;font-size:1.45rem;letter-spacing:-.03em;color:var(--nk-text)!important;display:inline-flex;align-items:center;gap:.55rem}
.nk-nav .navbar-brand::before{content:"";width:1.35rem;height:1.35rem;border:2.5px solid var(--nk-text);border-radius:3px;box-shadow:inset 0 -.55rem 0 var(--nk-primary)}
.nk-nav .nav-link{color:var(--nk-text)!important;font-weight:600!important;font-size:.95rem;padding:.5rem .9rem!important;border-radius:var(--nk-radius-sm)}
.nk-nav .nav-link:hover,.nk-nav .nav-link.active{background:var(--nk-surface-2);text-decoration:none}
.nk-nav .dropdown-menu{background:var(--nk-surface)!important;border:1px solid var(--nk-text)!important;border-radius:var(--nk-radius-sm)}
.nk-nav .dropdown-item{color:var(--nk-text)!important}
.nk-nav .navbar-toggler{position:relative;width:44px;height:40px;padding:0!important;font-size:0;color:var(--nk-text)!important}
.nk-nav .navbar-toggler > span{display:none!important}
.nk-nav .navbar-toggler::before{content:"";position:absolute;left:11px;right:11px;top:50%;height:2px;margin-top:-1px;background-color:currentColor;box-shadow:0 -6px 0 currentColor,0 6px 0 currentColor}
.nk-nav .nav-item:has(> a[href$="/neighbourhoods"]){order:1}
.nk-nav .nav-item:has(> a[href$="/contact-form-contact"]){order:2}
.nk-nav .nav-item:has(> a[href$="/bookings-book"]){order:9}
.nk-nav a[href$="/bookings-book"]{background:var(--nk-primary);color:var(--nk-surface)!important;margin-left:.5rem;padding-inline:1.15rem!important}
.nk-nav a[href$="/bookings-book"]:hover{background:var(--nk-primary-2)}
html[data-theme="dark"] .nk-nav a[href$="/bookings-book"]{color:var(--nk-text)!important}
/* Owner tools stay out of the visitor menu; the platform's role-gated "Manage" dropdown is left alone. */
.nk-nav .navbar-nav > li:has(> a[href$="-admin"]),.nk-nav .navbar-nav > li:has(> a[href$="-inbox"]),.nk-nav .navbar-nav > li:has(> a[href$="-orders"]),.nk-nav .navbar-nav > li:has(> a[href$="-subscribers"]){display:none!important}
.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-primary);outline-offset:2px;box-shadow:none}
@media (max-width:991.98px){
  .nk-nav .navbar-collapse{border-top:1px solid var(--nk-border);margin-top:.7rem;padding:.5rem 0 .75rem}
  .nk-nav a[href$="/bookings-book"]{display:inline-block;margin:.5rem 0 0}
}

/* ---------- Foundations ---------- */
.prc-wrap{width:min(1280px,100% - 2.5rem);margin-inline:auto}
.prc-kicker{display:inline-flex;align-items:center;gap:.5rem;font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--nk-text);margin:0 0 1rem}
.prc-kicker::before{content:"";width:.5rem;height:.5rem;border-radius:50%;background:var(--nk-accent)}
.prc-h2{text-wrap:balance;font-family:var(--nk-font-display);font-weight:700;font-size:clamp(2.1rem,1.3rem + 2.8vw,3.7rem);line-height:1.02;letter-spacing:-.035em;color:var(--nk-text);margin:0 0 1rem}
.prc-lede{font-size:1.08rem;line-height:1.7;color:var(--nk-text-muted);max-width:38rem;margin:0}
.prc-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:3rem;padding:.75rem 1.4rem;border-radius:var(--nk-radius-sm);font-weight:700;font-size:1rem;text-decoration:none;transition:background-color .15s ease,color .15s ease}
.prc-btn:hover{text-decoration:none}
.prc-btn.btn-primary{box-shadow:none}
.prc-btn--line{border:1.5px solid var(--nk-text);color:var(--nk-text);background:transparent}
.prc-btn--line:hover{background:var(--nk-text);color:var(--nk-bg)}
.prc-link{font-weight:700;color:var(--nk-primary);text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:4px}
.prc-link:hover{color:var(--nk-text)}
.prc-btn:focus-visible,.prc-link:focus-visible,.prc-footer a:focus-visible,.prc-card a:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.prc-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.prc-num{font-variant-numeric:tabular-nums lining-nums}

/* ---------- Valuation band ---------- */
.prc-value{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-text);color:var(--nk-bg)}
.prc-value__grid{display:grid;grid-template-columns:1.2fr 1fr;gap:2.5rem;align-items:center}
.prc-value .prc-h2{color:var(--nk-bg)}
.prc-value .prc-lede{color:color-mix(in srgb,var(--nk-bg) 78%,transparent)}
.prc-value .prc-kicker{color:var(--nk-bg)}
.prc-value__list{list-style:none;margin:0;padding:0;border-top:1px solid color-mix(in srgb,var(--nk-bg) 30%,transparent)}
.prc-value__list li{display:flex;justify-content:space-between;gap:1rem;padding:.9rem 0;border-bottom:1px solid color-mix(in srgb,var(--nk-bg) 18%,transparent);color:color-mix(in srgb,var(--nk-bg) 85%,transparent)}
.prc-value__list strong{color:var(--nk-bg)}
.prc-value__actions{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.75rem}
.prc-value .prc-btn--line{color:var(--nk-bg);border-color:var(--nk-bg)}
.prc-value .prc-btn--line:hover{background:var(--nk-bg);color:var(--nk-text)}
@media (max-width:991.98px){.prc-value__grid{grid-template-columns:1fr}}

/* ---------- Footer ---------- */
.prc-footer{padding:clamp(3.5rem,7vw,5rem) 0 2rem;background:var(--nk-surface);border-top:1px solid var(--nk-text)}
.prc-footer__grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:2.5rem}
.prc-footer .prc-footer__brand{font-family:var(--nk-font-display);font-weight:800;font-size:1.9rem;letter-spacing:-.03em;color:var(--nk-text);margin:0 0 .6rem}
.prc-footer h2{font-family:var(--nk-font);font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--nk-text);margin:0 0 .8rem}
.prc-footer p,.prc-footer li{font-size:.95rem;line-height:1.7;color:var(--nk-text-muted);margin:0}
.prc-footer ul{list-style:none;margin:0;padding:0}
.prc-footer a{color:var(--nk-text);text-decoration:underline;text-decoration-color:var(--nk-border);text-underline-offset:3px}
.prc-footer a:hover{color:var(--nk-primary)}
.prc-footer__base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--nk-border)}
.prc-footer__base p{font-size:.82rem;max-width:44rem}
@media (max-width:991.98px){.prc-footer__grid{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.prc-footer__grid{grid-template-columns:1fr}}
`;

const FOOTER = `
<footer class="prc-footer">
  <div class="prc-wrap">
    <div class="prc-footer__grid">
      <div>
        <p class="prc-footer__brand">Parcel</p>
        <p>An independent Portland brokerage. Eleven agents, one office, and a habit of telling clients what the listing leaves out.</p>
      </div>
      <div>
        <h2>Office</h2>
        <p>1030 SE Grand Ave, Suite 200<br>Portland, OR 97214</p>
      </div>
      <div>
        <h2>Contact</h2>
        <ul>
          <li><a href="tel:+15035550131">(503) 555-0131</a></li>
          <li><a href="mailto:hello@parcelhomes.com">hello@parcelhomes.com</a></li>
          <li>Mon &ndash; Sat, 9 am &ndash; 6 pm</li>
        </ul>
      </div>
      <div>
        <h2>Explore</h2>
        <ul>
          <li><a href="/neighbourhoods">Neighbourhood guide</a></li>
          <li><a href="/book">Book a viewing</a></li>
          <li><a href="/contact">Ask an agent</a></li>
        </ul>
      </div>
    </div>
    <div class="prc-footer__base">
      <p>&copy; 2026 Parcel Real Estate LLC &middot; Licensed real estate broker in Oregon, license #201234567. Listing information is deemed reliable but not guaranteed. Equal Housing Opportunity.</p>
    </div>
  </div>
</footer>`;

const VALUE = `
<section class="prc-value">
  <div class="prc-wrap prc-value__grid">
    <div>
      <p class="prc-kicker">Selling this year?</p>
      <h2 class="prc-h2">Find out what your home is worth, from someone who's been inside</h2>
      <p class="prc-lede">A free, no-pressure valuation from an agent who sells on your street. You'll get a price range, three recent comparables and a list of the fixes that actually pay back.</p>
      <div class="prc-value__actions">
        <a class="btn btn-primary prc-btn" href="/book">Book a free valuation</a>
        <a class="prc-btn prc-btn--line" href="tel:+15035550131">(503) 555-0131</a>
      </div>
    </div>
    <ul class="prc-value__list">
      <li><span>Listing fee</span><strong>2.25%, all-in</strong></li>
      <li><span>Staging &amp; photography</span><strong>Included</strong></li>
      <li><span>3D tour &amp; floor plan</span><strong>Included</strong></li>
      <li><span>Contract length</span><strong>90 days, cancel anytime</strong></li>
    </ul>
  </div>
</section>`;

type Listing = {
  img: string; alt: string; price: string; addr: string; area: string; type: "house" | "townhome" | "condo";
  beds: number; baths: string; sqft: string; band: "low" | "mid" | "high"; badge?: [string, "new" | "open" | "cut"];
};
const LISTINGS: Listing[] = [
  { img: "/media/generated/realestate-klickitat-house.webp", alt: "A two-storey craftsman house at dusk with lit windows and a double garage", price: "1,145,000", addr: "2418 NE Klickitat St", area: "Irvington", type: "house", beds: 4, baths: "3", sqft: "2,640", band: "high", badge: ["Just listed", "new"] },
  { img: "/media/generated/realestate-woodstock-modern.webp", alt: "A modern timber-clad house behind a hedge and mature trees", price: "879,000", addr: "5127 SE Woodstock Blvd", area: "Woodstock", type: "house", beds: 3, baths: "2.5", sqft: "2,080", band: "mid", badge: ["Open Sat 1 – 3 pm", "open"] },
  { img: "/media/generated/realestate-irving-townhome.webp", alt: "A white townhouse entrance with a bright yellow front door and black railings", price: "749,000", addr: "1420 NW Irving St", area: "Alphabet District", type: "townhome", beds: 3, baths: "2.5", sqft: "1,760", band: "mid" },
  { img: "/media/generated/realestate-burrage-ranch.webp", alt: "A single-storey ranch house with a lawn and a rain-wet driveway", price: "615,000", addr: "7302 N Burrage Ave", area: "Arbor Lodge", type: "house", beds: 3, baths: "2", sqft: "1,690", band: "mid", badge: ["Price reduced", "cut"] },
  { img: "/media/generated/realestate-concordia-kitchen.webp", alt: "A bright white kitchen with an island, pendant lights and tall windows", price: "1,295,000", addr: "4906 NE 29th Ave", area: "Concordia", type: "house", beds: 5, baths: "3", sqft: "3,120", band: "high" },
  { img: "/media/generated/realestate-downtown-condo.webp", alt: "A condo living room with a green sofa, oak floors and a balcony door", price: "525,000", addr: "1111 SW 10th Ave #1804", area: "Downtown", type: "condo", beds: 2, baths: "2", sqft: "1,180", band: "low", badge: ["Open Sun 11 – 1", "open"] },
  { img: "/media/generated/realestate-division-condos.webp", alt: "A modern condo building with solar panels and lit windows at dusk", price: "389,000", addr: "3345 SE Division St #210", area: "Richmond", type: "condo", beds: 1, baths: "1", sqft: "720", band: "low" },
];

const listingCard = (l: Listing) => `
        <li class="prc-card is-${l.type} beds-${Math.min(l.beds, 4)} price-${l.band}">
          <figure class="prc-card__img"><img src="${l.img}" alt="${l.alt}" width="960" height="640" loading="lazy">${l.badge ? `<figcaption class="prc-badge prc-badge--${l.badge[1]}">${l.badge[0]}</figcaption>` : ""}</figure>
          <div class="prc-card__body">
            <p class="prc-card__price prc-num">$${l.price}</p>
            <h3 class="prc-card__addr">${l.addr}</h3>
            <p class="prc-card__area">${l.area} &middot; ${l.type === "house" ? "House" : l.type === "townhome" ? "Townhome" : "Condo"}</p>
            <ul class="prc-specs">
              <li><b class="prc-num">${l.beds}</b> ${l.beds === 1 ? "bed" : "beds"}</li>
              <li><b class="prc-num">${l.baths}</b> ${l.baths === "1" ? "bath" : "baths"}</li>
              <li><b class="prc-num">${l.sqft}</b> sq ft</li>
            </ul>
            <a class="prc-card__link" href="/book">Book a viewing<span class="prc-sr"> of ${l.addr}</span> &rarr;</a>
          </div>
        </li>`;

const opt = (group: string, id: string, label: string, checked = false) =>
  `<input class="prc-radio" type="radio" name="prc-${group}" id="prc-${group}-${id}"${checked ? " checked" : ""}><label class="prc-opt" for="prc-${group}-${id}">${label}</label>`;

const HOME_HTML = `
<section class="prc-hero">
  <div class="prc-wrap prc-hero__grid">
    <div class="prc-hero__copy">
      <p class="prc-kicker">Parcel Real Estate &middot; Portland, Oregon</p>
      <h1 class="prc-hero__title">Know the street before you buy the house.</h1>
      <p class="prc-lede">We're eleven Portland agents who price with data, sell with honest photography and tell you what a listing won't: the noisy corner, the great school, the twelve-minute bike ride to work.</p>
      <div class="prc-hero__actions">
        <a class="btn btn-primary prc-btn" href="#homes">Browse homes for sale</a>
        <a class="prc-btn prc-btn--line" href="/book">What's my home worth?</a>
      </div>
    </div>
    <figure class="prc-hero__media">
      <img src="/media/generated/realestate-klickitat-house.webp" alt="A two-storey craftsman house at dusk with lit windows and a double garage" width="960" height="640" fetchpriority="high">
      <figcaption class="prc-hero__tag">
        <span class="prc-badge prc-badge--new">Just listed</span>
        <strong class="prc-num">$1,145,000</strong>
        <span>2418 NE Klickitat St &middot; Irvington</span>
        <span class="prc-num">4 beds &middot; 3 baths &middot; 2,640 sq ft</span>
      </figcaption>
    </figure>
  </div>
  <dl class="prc-wrap prc-hero__stats">
    <div><dt>Sold since 2012</dt><dd class="prc-num">$684M</dd></div>
    <div><dt>Median days on market</dt><dd class="prc-num">19</dd></div>
    <div><dt>Average sale-to-list</dt><dd class="prc-num">102.6%</dd></div>
    <div><dt>Client reviews</dt><dd class="prc-num">4.9 <span aria-hidden="true">&#9733;</span></dd></div>
  </dl>
</section>

<section class="prc-find" id="homes">
  <div class="prc-wrap">
    <form class="prc-filter" role="search" aria-label="Filter homes for sale">
      <div class="prc-filter__head">
        <h2 class="prc-filter__title">Homes for sale</h2>
        <button class="prc-reset" type="reset">Clear filters</button>
      </div>
      <fieldset class="prc-group"><legend>Home type</legend><div class="prc-options">${opt("type", "all", "All", true)}${opt("type", "house", "House")}${opt("type", "townhome", "Townhome")}${opt("type", "condo", "Condo")}</div></fieldset>
      <fieldset class="prc-group"><legend>Bedrooms</legend><div class="prc-options">${opt("beds", "any", "Any", true)}${opt("beds", "2", "2+")}${opt("beds", "3", "3+")}${opt("beds", "4", "4+")}</div></fieldset>
      <fieldset class="prc-group"><legend>Price</legend><div class="prc-options">${opt("price", "any", "Any", true)}${opt("price", "low", "Under $600k")}${opt("price", "mid", "$600k &ndash; $900k")}${opt("price", "high", "$900k +")}</div></fieldset>
    </form>
    <div class="prc-results">
      <ul class="prc-grid">${LISTINGS.map(listingCard).join("")}
        <li class="prc-cta-card">
          <p class="prc-kicker">Off-market &amp; coming soon</p>
          <h3>Not seeing the one?</h3>
          <p>About a third of our sales never reach the portals. Tell us what you're after and we'll call when it comes up.</p>
          <a class="btn btn-primary prc-btn" href="/contact">Tell us what you need</a>
        </li>
      </ul>
      <p class="prc-count"><span class="prc-count__n"></span> of ${LISTINGS.length} homes shown &middot; updated daily from the RMLS</p>
    </div>
  </div>
</section>

<section class="prc-sell">
  <div class="prc-wrap prc-sell__grid">
    <figure class="prc-sell__img"><img src="/media/generated/realestate-staged-living-room.webp" alt="A staged living room opening onto a covered garden patio" width="960" height="640" loading="lazy"></figure>
    <div>
      <p class="prc-kicker">Selling with Parcel</p>
      <h2 class="prc-h2">Four weeks from first coffee to sold sign</h2>
      <ol class="prc-steps">
        <li><span class="prc-num">01</span><div><h3>Price it honestly</h3><p>A walk-through, three true comparables and a range we'd bet our fee on. No inflated number to win the listing.</p></div></li>
        <li><span class="prc-num">02</span><div><h3>Make it look its best</h3><p>Staging, a deep clean, twilight photography and a 3D tour, booked and paid for by us.</p></div></li>
        <li><span class="prc-num">03</span><div><h3>Launch on a Thursday</h3><p>Private preview for our buyers, then open houses Saturday and Sunday. Offers reviewed Monday.</p></div></li>
        <li><span class="prc-num">04</span><div><h3>Negotiate &amp; close</h3><p>We handle inspections, repairs and the paperwork, and text you at every step.</p></div></li>
      </ol>
    </div>
  </div>
</section>

<section class="prc-market">
  <div class="prc-wrap">
    <div class="prc-market__head">
      <div>
        <p class="prc-kicker">Market snapshot &middot; Q3 2026</p>
        <h2 class="prc-h2">What homes are selling for</h2>
      </div>
      <p class="prc-lede">Median sale prices for single-family homes over the last 90 days, from RMLS data. <a class="prc-link" href="/neighbourhoods">Read the neighbourhood guide</a></p>
    </div>
    <div class="prc-table-wrap" role="region" aria-label="Neighbourhood market data" tabindex="0">
      <table class="prc-table">
        <thead><tr><th scope="col">Neighbourhood</th><th scope="col">Median price</th><th scope="col">vs. last year</th><th scope="col">Days on market</th><th scope="col">Sale-to-list</th></tr></thead>
        <tbody>
          <tr><th scope="row">Irvington</th><td class="prc-num">$1,080,000</td><td class="prc-num prc-up">&#9650; 4.1%</td><td class="prc-num">14</td><td class="prc-num">103%</td></tr>
          <tr><th scope="row">Sellwood-Moreland</th><td class="prc-num">$735,000</td><td class="prc-num prc-up">&#9650; 2.6%</td><td class="prc-num">17</td><td class="prc-num">101%</td></tr>
          <tr><th scope="row">Alberta Arts</th><td class="prc-num">$689,000</td><td class="prc-num prc-up">&#9650; 3.3%</td><td class="prc-num">12</td><td class="prc-num">104%</td></tr>
          <tr><th scope="row">Richmond</th><td class="prc-num">$712,500</td><td class="prc-num prc-down">&#9660; 0.8%</td><td class="prc-num">21</td><td class="prc-num">99%</td></tr>
          <tr><th scope="row">Arbor Lodge</th><td class="prc-num">$598,000</td><td class="prc-num prc-up">&#9650; 1.9%</td><td class="prc-num">16</td><td class="prc-num">102%</td></tr>
          <tr><th scope="row">St. Johns</th><td class="prc-num">$529,000</td><td class="prc-num prc-up">&#9650; 5.2%</td><td class="prc-num">19</td><td class="prc-num">101%</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="prc-agents">
  <div class="prc-wrap">
    <p class="prc-kicker">Your agents</p>
    <h2 class="prc-h2">Local, and it shows</h2>
    <ul class="prc-agents__grid">
      <li class="prc-agent"><span class="prc-agent__mono" aria-hidden="true">NO</span><h3>Nadia Okafor</h3><p class="prc-agent__role">Principal broker &middot; NE Portland</p><p>Sold 64 homes in Irvington and Alberta since 2019. Former urban planner; ask her about zoning.</p><a class="prc-link" href="tel:+15035550132">(503) 555-0132</a></li>
      <li class="prc-agent"><span class="prc-agent__mono" aria-hidden="true">MB</span><h3>Marcus Bell</h3><p class="prc-agent__role">Broker &middot; SE &amp; first-time buyers</p><p>Walks first-time buyers through every step, from pre-approval to keys. Fluent in Spanish.</p><a class="prc-link" href="tel:+15035550133">(503) 555-0133</a></li>
      <li class="prc-agent"><span class="prc-agent__mono" aria-hidden="true">EL</span><h3>Eun-ji Lee</h3><p class="prc-agent__role">Broker &middot; Condos &amp; downtown</p><p>Reads HOA budgets for fun, so you don't have to. Specialist in condos and new construction.</p><a class="prc-link" href="tel:+15035550134">(503) 555-0134</a></li>
    </ul>
  </div>
</section>

<section class="prc-story">
  <div class="prc-wrap prc-story__grid">
    <p class="prc-story__nums"><span class="prc-num">6</span> offers<br><span class="prc-num">4</span> days<br><span class="prc-num">+$41k</span> over asking</p>
    <blockquote class="prc-story__quote">
      <p>&ldquo;Nadia talked us out of two renovations and into one very good paint job. We listed on Thursday, had six offers by Monday and closed three weeks later. We'd hire her again tomorrow.&rdquo;</p>
      <footer>Priya &amp; Sam D. &middot; sold in Sellwood, June 2026</footer>
    </blockquote>
  </div>
</section>
${VALUE}
${FOOTER}`;

const HOME_CSS = `${BASE_CSS}
/* ---------- Hero ---------- */
.prc-hero{padding:clamp(3rem,6vw,5rem) 0 7.5rem!important;background-color:var(--nk-bg);background-image:repeating-linear-gradient(90deg,transparent 0 calc(8.333% - 1px),color-mix(in srgb,var(--nk-text) 6%,transparent) calc(8.333% - 1px) 8.333%)}
.prc-hero__grid{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(2rem,5vw,4.5rem);align-items:center}
.prc-hero__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:800;font-size:clamp(2.8rem,1.4rem + 4.6vw,5.6rem);line-height:.98;letter-spacing:-.045em;color:var(--nk-text);margin:0 0 1.5rem}
.prc-hero__actions{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:2rem}
.prc-hero__media{position:relative;margin:0}
.prc-hero__media img{display:block;width:100%;height:auto;aspect-ratio:5/4;object-fit:cover;border-radius:var(--nk-radius)}
.prc-hero__tag{position:absolute;left:-1.5rem;bottom:1.5rem;display:grid;gap:.15rem;padding:1rem 1.2rem;min-width:15rem;background:var(--nk-surface);border:1px solid var(--nk-text);border-radius:var(--nk-radius-sm);box-shadow:6px 6px 0 var(--nk-text);font-size:.9rem;color:var(--nk-text-muted)}
.prc-hero__tag strong{font-family:var(--nk-font-display);font-size:1.6rem;letter-spacing:-.03em;color:var(--nk-text)}
.prc-hero__tag .prc-badge{position:static;justify-self:start;margin-bottom:.35rem}
.prc-hero__stats{display:grid;grid-template-columns:repeat(4,1fr);margin-top:clamp(3rem,6vw,4.5rem);margin-bottom:0;border-top:1px solid var(--nk-text)}
.prc-hero__stats div{padding:1.4rem 1.25rem 0 0}
.prc-hero__stats div + div{padding-left:1.25rem;border-left:1px solid var(--nk-border)}
.prc-hero__stats dt{font-size:.85rem;font-weight:600;color:var(--nk-text-muted);margin-bottom:.25rem}
.prc-hero__stats dd{margin:0;font-family:var(--nk-font-display);font-weight:700;font-size:clamp(1.8rem,1.3rem + 1.5vw,2.6rem);letter-spacing:-.03em;color:var(--nk-text)}
.prc-hero__stats dd span{color:var(--nk-primary);font-size:.7em}
@media (max-width:991.98px){.prc-hero__grid{grid-template-columns:1fr}.prc-hero__tag{left:1rem}}
@media (max-width:767.98px){.prc-hero__stats{grid-template-columns:1fr 1fr}.prc-hero__stats div:nth-child(3){padding-left:0;border-left:0}.prc-hero__stats div{padding-bottom:1.25rem}}

/* ---------- Search & results (signature) ---------- */
.prc-find{padding:0 0 clamp(4.5rem,9vw,7rem)!important;background:var(--nk-surface-2)}
.prc-filter{position:relative;z-index:2;margin:-5.5rem 0 2.5rem;padding:clamp(1.25rem,3vw,2rem);background:var(--nk-surface);border:1px solid var(--nk-text);border-radius:var(--nk-radius);box-shadow:8px 8px 0 var(--nk-text);display:grid;grid-template-columns:repeat(3,auto);gap:1.25rem 2rem;align-items:end}
.prc-filter__head{grid-column:1 / -1;display:flex;justify-content:space-between;align-items:center;gap:1rem;padding-bottom:1rem;border-bottom:1px solid var(--nk-border)}
.prc-filter__title{font-family:var(--nk-font-display);font-weight:700;font-size:1.7rem;letter-spacing:-.03em;color:var(--nk-text);margin:0}
.prc-reset{border:0;background:transparent;padding:.4rem .2rem;font-weight:700;color:var(--nk-primary);text-decoration:underline;text-underline-offset:4px;cursor:pointer}
.prc-reset:focus-visible{outline:3px solid var(--nk-primary);outline-offset:2px}
.prc-group{margin:0;padding:0;border:0;min-width:0}
.prc-group legend{float:none;width:auto;margin:0 0 .5rem;padding:0;font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-text-muted)}
.prc-options{display:flex;flex-wrap:wrap;gap:.4rem}
.prc-radio{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
.prc-opt{display:inline-flex;align-items:center;min-height:2.6rem;padding:.45rem .95rem;border:1.5px solid var(--nk-border);border-radius:999px;font-weight:600;font-size:.94rem;color:var(--nk-text);background:var(--nk-surface);cursor:pointer;user-select:none;transition:border-color .15s ease,background-color .15s ease,color .15s ease;margin:0}
.prc-opt:hover{border-color:var(--nk-text)}
.prc-radio:checked + .prc-opt{background:var(--nk-text);border-color:var(--nk-text);color:var(--nk-bg)}
.prc-radio:focus-visible + .prc-opt{outline:3px solid var(--nk-primary);outline-offset:2px}
.prc-find:has(#prc-type-house:checked) .prc-card:not(.is-house),
.prc-find:has(#prc-type-townhome:checked) .prc-card:not(.is-townhome),
.prc-find:has(#prc-type-condo:checked) .prc-card:not(.is-condo),
.prc-find:has(#prc-beds-2:checked) .prc-card.beds-1,
.prc-find:has(#prc-beds-3:checked) .prc-card:is(.beds-1,.beds-2),
.prc-find:has(#prc-beds-4:checked) .prc-card:is(.beds-1,.beds-2,.beds-3),
.prc-find:has(#prc-price-low:checked) .prc-card:not(.price-low),
.prc-find:has(#prc-price-mid:checked) .prc-card:not(.price-mid),
.prc-find:has(#prc-price-high:checked) .prc-card:not(.price-high){display:none}
.prc-results{display:flex;flex-direction:column}
.prc-count{order:-1;margin:0 0 1.25rem;font-weight:600;color:var(--nk-text-muted)}
.prc-count__n{font-family:var(--nk-font-display);font-weight:800;font-size:1.35rem;color:var(--nk-text)}
.prc-count__n::before{content:counter(prc-homes)}
.prc-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;counter-reset:prc-homes}
.prc-card{counter-increment:prc-homes;display:flex;flex-direction:column;background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);overflow:hidden;transition:border-color .15s ease,box-shadow .15s ease}
.prc-card:hover{border-color:var(--nk-text);box-shadow:6px 6px 0 var(--nk-text)}
.prc-card__img{position:relative;margin:0;height:auto;aspect-ratio:3/2;overflow:hidden}
.prc-card__img img{width:100%;height:100%;object-fit:cover}
.prc-badge{position:absolute;top:.8rem;left:.8rem;display:inline-block;padding:.3rem .65rem;border-radius:var(--nk-radius-sm);font-size:.78rem;font-weight:700;background:var(--nk-surface);color:var(--nk-text)}
.prc-badge--new{background:var(--nk-accent);color:var(--nk-bg)}
.prc-badge--open{background:var(--nk-surface);color:var(--nk-text);border:1.5px solid var(--nk-accent)}
.prc-badge--cut{background:var(--nk-text);color:var(--nk-bg)}
.prc-card__body{display:flex;flex-direction:column;flex:1;padding:1.2rem 1.25rem 1.25rem}
.prc-card__price{font-family:var(--nk-font-display);font-weight:800;font-size:1.75rem;letter-spacing:-.03em;color:var(--nk-primary);margin:0 0 .25rem}
.prc-card__addr{font-family:var(--nk-font);font-weight:700;font-size:1.08rem;letter-spacing:0;color:var(--nk-text);margin:0}
.prc-card__area{margin:.15rem 0 1rem;font-size:.92rem;color:var(--nk-text-muted)}
.prc-specs{list-style:none;margin:0 0 1.2rem;padding:.8rem 0;display:grid;grid-template-columns:repeat(3,auto);justify-content:start;gap:0;border-block:1px solid var(--nk-border)}
.prc-specs li{padding:0 1rem;font-size:.92rem;color:var(--nk-text-muted)}
.prc-specs li:first-child{padding-left:0}
.prc-specs li + li{border-left:1px solid var(--nk-border)}
.prc-specs b{display:block;font-size:1.15rem;color:var(--nk-text)}
.prc-card__link{margin-top:auto;font-weight:700;color:var(--nk-text);text-decoration:none}
.prc-card__link:hover{color:var(--nk-primary);text-decoration:underline;text-underline-offset:4px}
.prc-cta-card{display:flex;flex-direction:column;justify-content:flex-end;padding:1.75rem;border:1.5px dashed var(--nk-text);border-radius:var(--nk-radius);background:transparent}
.prc-cta-card h3{font-family:var(--nk-font-display);font-weight:700;font-size:1.8rem;letter-spacing:-.03em;color:var(--nk-text);margin:0 0 .6rem}
.prc-cta-card p:not(.prc-kicker){color:var(--nk-text-muted);margin:0 0 1.5rem;line-height:1.6}
.prc-cta-card .prc-btn{align-self:flex-start}
@media (max-width:1099.98px){.prc-filter{grid-template-columns:1fr 1fr}.prc-filter .prc-group:last-child{grid-column:1 / -1}}
@media (max-width:991.98px){.prc-grid{grid-template-columns:1fr 1fr}}
@media (max-width:640px){.prc-filter{grid-template-columns:1fr;margin-top:-5rem}.prc-filter .prc-group:last-child{grid-column:auto}.prc-grid{grid-template-columns:1fr}}

/* ---------- Selling ---------- */
.prc-sell{padding:clamp(4.5rem,9vw,7rem) 0!important}
.prc-sell__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2.5rem,5vw,5rem);align-items:center}
.prc-sell__img{margin:0}
.prc-sell__img img{width:100%;height:auto;aspect-ratio:4/4.4;object-fit:cover;border-radius:var(--nk-radius)}
.prc-steps{list-style:none;margin:1.5rem 0 0;padding:0}
.prc-steps li{display:grid;grid-template-columns:3rem 1fr;gap:1rem;padding:1.1rem 0;border-top:1px solid var(--nk-border)}
.prc-steps li > span{font-family:var(--nk-font-display);font-weight:800;font-size:1.15rem;color:var(--nk-primary)}
.prc-steps h3{font-family:var(--nk-font);font-weight:700;font-size:1.1rem;letter-spacing:0;color:var(--nk-text);margin:0 0 .25rem}
.prc-steps p{margin:0;color:var(--nk-text-muted);line-height:1.6}
@media (max-width:991.98px){.prc-sell__grid{grid-template-columns:1fr}.prc-sell__img img{height:auto;aspect-ratio:16/10}}

/* ---------- Market table ---------- */
.prc-market{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-surface)}
.prc-market__head{display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:end;margin-bottom:2rem}
.prc-market__head .prc-h2{margin:0}
.prc-table-wrap{position:relative;overflow-x:auto}
.prc-table-wrap:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.prc-table{width:100%;min-width:40rem;border-collapse:collapse}
.prc-table th,.prc-table td{padding:1rem 1rem 1rem 0;text-align:right;border-bottom:1px solid var(--nk-border);color:var(--nk-text)}
.prc-table th:first-child{text-align:left}
.prc-table thead th{font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-text-muted);border-bottom:1.5px solid var(--nk-text)}
.prc-table tbody th{font-weight:700}
.prc-table td{font-size:1.02rem}
.prc-up{color:var(--nk-accent)!important;font-weight:700}
.prc-down{color:var(--nk-text-muted)!important;font-weight:700}
@media (max-width:767.98px){.prc-market__head{grid-template-columns:1fr}}

/* ---------- Agents ---------- */
.prc-agents{padding:clamp(4.5rem,9vw,7rem) 0!important}
.prc-agents__grid{list-style:none;margin:2rem 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.prc-agent{padding:1.75rem;background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius)}
.prc-agent__mono{display:grid;place-items:center;width:3.6rem;height:3.6rem;margin-bottom:1.25rem;border-radius:50%;border:2px solid var(--nk-text);font-family:var(--nk-font-display);font-weight:800;font-size:1.2rem;letter-spacing:-.02em;color:var(--nk-text);box-shadow:4px 4px 0 var(--nk-primary)}
.prc-agent h3{font-family:var(--nk-font-display);font-weight:700;font-size:1.5rem;letter-spacing:-.02em;color:var(--nk-text);margin:0}
.prc-agent .prc-agent__role{font-size:.9rem;font-weight:600;color:var(--nk-accent);margin:.2rem 0 .9rem}
.prc-agent p{color:var(--nk-text-muted);line-height:1.6;margin:0 0 1rem}
@media (max-width:991.98px){.prc-agents__grid{grid-template-columns:1fr}}

/* ---------- Story ---------- */
.prc-story{padding:clamp(4rem,8vw,6rem) 0!important;border-top:1px solid var(--nk-border)}
.prc-story__grid{display:grid;grid-template-columns:.8fr 1.4fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.prc-story__nums{margin:0;font-family:var(--nk-font-display);font-weight:700;font-size:clamp(1.8rem,1.2rem + 2vw,2.8rem);line-height:1.2;letter-spacing:-.03em;color:var(--nk-text-muted)}
.prc-story__nums span{color:var(--nk-primary)}
.prc-story__quote{margin:0}
.prc-story__quote p{font-size:clamp(1.25rem,1.05rem + .7vw,1.65rem);line-height:1.5;font-weight:500;color:var(--nk-text);margin:0 0 1rem}
.prc-story__quote footer{font-weight:700;color:var(--nk-text-muted)}
@media (max-width:767.98px){.prc-story__grid{grid-template-columns:1fr}}
`;

type Hood = { n: string; name: string; tagline: string; price: string; dom: string; walk: string; commute: string; good: string[]; text: string };
const HOODS: Hood[] = [
  { n: "01", name: "Irvington", tagline: "Porches, elms and 1910s craftsmen", price: "$1.08M", dom: "14", walk: "86", commute: "12 min bike", good: ["Families", "Old houses", "Trick-or-treating"], text: "Wide streets lined with century-old elms and some of the city's best-kept craftsman and colonial revival homes. Irvington Park and the Broadway shops are on the doorstep." },
  { n: "02", name: "Sellwood-Moreland", tagline: "Small-town main street, river trail", price: "$735k", dom: "17", walk: "81", commute: "22 min bus", good: ["Families", "Dog owners", "Runners"], text: "Antique shops on 13th Avenue, the Springwater trail along the Willamette and a genuine village feel twenty minutes from downtown." },
  { n: "03", name: "Alberta Arts", tagline: "Murals, food carts, Last Thursday", price: "$689k", dom: "12", walk: "92", commute: "18 min bike", good: ["First-time buyers", "Night owls", "Artists"], text: "A lively arts district with galleries, food carts and a monthly street fair. Bungalows and new infill townhomes at prices still within reach." },
  { n: "04", name: "Richmond", tagline: "Division Street's restaurant row", price: "$712k", dom: "21", walk: "90", commute: "15 min bus", good: ["Food lovers", "Condo buyers", "Car-free"], text: "Some of the city's best restaurants on Division and Clinton, plenty of new condos and a frequent bus line straight into downtown." },
  { n: "05", name: "Arbor Lodge", tagline: "Quiet streets near the MAX yellow line", price: "$598k", dom: "16", walk: "78", commute: "20 min MAX", good: ["First-time buyers", "Gardeners", "Commuters"], text: "Mid-century ranches and bungalows on generous lots, with the yellow line and the Interstate Avenue shops a few blocks away." },
  { n: "06", name: "St. Johns", tagline: "A small town inside the city", price: "$529k", dom: "19", walk: "74", commute: "30 min bus", good: ["Value", "Cathedral Park", "Community"], text: "Its own little downtown, the St. Johns Bridge and Cathedral Park by the river. The best value in the city, and prices are rising quickly." },
];

const hoodCard = (h: Hood) => `
      <article class="prc-hood">
        <header class="prc-hood__head"><span class="prc-hood__n prc-num">${h.n}</span><div><h2>${h.name}</h2><p>${h.tagline}</p></div></header>
        <dl class="prc-hood__stats">
          <div><dt>Median price</dt><dd class="prc-num">${h.price}</dd></div>
          <div><dt>Days on market</dt><dd class="prc-num">${h.dom}</dd></div>
          <div><dt>Walk score</dt><dd class="prc-num">${h.walk}</dd></div>
          <div><dt>To downtown</dt><dd>${h.commute}</dd></div>
        </dl>
        <p class="prc-hood__text">${h.text}</p>
        <ul class="prc-hood__good" aria-label="Good for">${h.good.map((g) => `<li>${g}</li>`).join("")}</ul>
      </article>`;

const HOODS_HTML = `
<section class="prc-hoods-hero">
  <div class="prc-wrap prc-hoods-hero__grid">
    <div>
      <p class="prc-kicker">Neighbourhood guide &middot; 2026</p>
      <h1 class="prc-hoods-hero__title">Portland, one neighbourhood at a time</h1>
      <p class="prc-lede">Prices, commutes and what it's actually like to live there, from agents who do. Figures are 90-day medians for single-family homes.</p>
    </div>
    <figure class="prc-hoods-hero__img"><img src="/media/generated/realestate-staged-living-room.webp" alt="A bright living room opening onto a covered garden patio" width="960" height="640" fetchpriority="high"></figure>
  </div>
</section>

<section class="prc-hoods">
  <div class="prc-wrap prc-hoods__grid">${HOODS.map(hoodCard).join("")}
  </div>
</section>

<section class="prc-first">
  <div class="prc-wrap prc-first__grid">
    <div>
      <p class="prc-kicker">Buying your first home?</p>
      <h2 class="prc-h2">The Portland first-timer's checklist</h2>
      <p class="prc-lede">Most of our buyers are buying for the first time. Here's the order we'd do things in.</p>
      <a class="btn btn-primary prc-btn prc-first__cta" href="/contact">Talk to Marcus about buying</a>
    </div>
    <ol class="prc-check">
      <li><h3>Get pre-approved, not pre-qualified</h3><p>A real pre-approval takes a week and makes your offer competitive. We'll introduce three local lenders.</p></li>
      <li><h3>Check the first-time buyer programmes</h3><p>Oregon Bond Residential Loans and the city's down-payment assistance can cover up to $80,000.</p></li>
      <li><h3>Pick two neighbourhoods, not ten</h3><p>Spend a Saturday morning and a Tuesday evening in each. Noise and parking look very different.</p></li>
      <li><h3>Budget for the sewer scope</h3><p>Portland's old clay sewer lines fail often. A $250 scope can save you $15,000.</p></li>
      <li><h3>Write a clean offer</h3><p>Price is only one part. Flexible closing dates and fewer contingencies win houses here.</p></li>
    </ol>
  </div>
</section>
${VALUE}
${FOOTER}`;

const HOODS_CSS = `${BASE_CSS}
.prc-hoods-hero{padding:clamp(3.5rem,7vw,5.5rem) 0 clamp(2.5rem,5vw,4rem)!important;background-color:var(--nk-bg);background-image:repeating-linear-gradient(90deg,transparent 0 calc(8.333% - 1px),color-mix(in srgb,var(--nk-text) 6%,transparent) calc(8.333% - 1px) 8.333%)}
.prc-hoods-hero__grid{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(2rem,5vw,4.5rem);align-items:center}
.prc-hoods-hero__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:800;font-size:clamp(2.6rem,1.4rem + 4vw,5rem);line-height:1;letter-spacing:-.045em;color:var(--nk-text);margin:0 0 1.25rem}
.prc-hoods-hero__img{margin:0}
.prc-hoods-hero__img img{width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:var(--nk-radius);box-shadow:8px 8px 0 var(--nk-text)}
@media (max-width:991.98px){.prc-hoods-hero__grid{grid-template-columns:1fr}.prc-hoods-hero__img{margin-right:8px}}
.prc-hoods{padding:clamp(2.5rem,5vw,4rem) 0 clamp(4.5rem,9vw,7rem)!important}
.prc-hoods__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.prc-hood{display:flex;flex-direction:column;padding:1.5rem;background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius)}
.prc-hood__head{display:flex;gap:1rem;align-items:flex-start;padding-bottom:1rem;border-bottom:1.5px solid var(--nk-text)}
.prc-hood__n{flex:none;display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:var(--nk-radius-sm);border:2px solid var(--nk-primary);color:var(--nk-text);font-weight:800}
.prc-hood__head h2{font-family:var(--nk-font-display);font-weight:700;font-size:1.6rem;letter-spacing:-.03em;color:var(--nk-text);margin:0}
.prc-hood__head p{margin:.1rem 0 0;font-size:.92rem;color:var(--nk-text-muted)}
.prc-hood__stats{display:grid;grid-template-columns:1fr 1fr;margin:0;border-bottom:1px solid var(--nk-border)}
.prc-hood__stats div{padding:.8rem 0}
.prc-hood__stats div:nth-child(even){padding-left:1rem;border-left:1px solid var(--nk-border)}
.prc-hood__stats div:nth-child(n+3){border-top:1px solid var(--nk-border)}
.prc-hood__stats dt{font-size:.78rem;font-weight:600;color:var(--nk-text-muted)}
.prc-hood__stats dd{margin:0;font-family:var(--nk-font-display);font-weight:700;font-size:1.3rem;letter-spacing:-.02em;color:var(--nk-text)}
.prc-hood__text{margin:1rem 0;color:var(--nk-text-muted);line-height:1.65;font-size:.97rem}
.prc-hood__good{list-style:none;margin:auto 0 0;padding:0;display:flex;flex-wrap:wrap;gap:.35rem}
.prc-hood__good li{padding:.25rem .65rem;border-radius:999px;font-size:.8rem;font-weight:600;color:var(--nk-text);background:var(--nk-surface-2)}
@media (max-width:991.98px){.prc-hoods__grid{grid-template-columns:1fr 1fr}}
@media (max-width:640px){.prc-hoods__grid{grid-template-columns:1fr}}
.prc-first{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-surface)}
.prc-first__grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(2.5rem,5vw,5rem);align-items:start}
.prc-first__cta{margin-top:1.75rem}
.prc-check{list-style:none;margin:0;padding:0;counter-reset:chk}
.prc-check li{position:relative;padding:1.1rem 0 1.1rem 3.5rem;border-top:1px solid var(--nk-border);counter-increment:chk}
.prc-check li::before{content:counter(chk);position:absolute;left:0;top:1.1rem;display:grid;place-items:center;width:2.2rem;height:2.2rem;border:1.5px solid var(--nk-text);border-radius:50%;font-weight:800;color:var(--nk-text)}
.prc-check h3{font-family:var(--nk-font);font-weight:700;font-size:1.08rem;letter-spacing:0;color:var(--nk-text);margin:0 0 .25rem}
.prc-check p{margin:0;color:var(--nk-text-muted);line-height:1.6}
@media (max-width:991.98px){.prc-first__grid{grid-template-columns:1fr}}
`;

const template: StarterTemplate = {
  id: "original-realestate",
  name: "Parcel Real Estate",
  tagline: "Modern brokerage site with filterable listings, market data, a neighbourhood guide and valuation bookings",
  category: "realestate",
  tags: ["real estate", "realtor", "property", "homes for sale", "listings", "brokerage", "agent", "housing", "neighbourhood guide", "valuation", "condo", "house"],
  source: "original",
  modules: ["bookings", "contact-form"],
  theme: {
    name: "Parcel",
    mode: "light",
    primary: "#1f44c7",
    primary2: "#1735a3",
    accent: "#0e7c66",
    bg: "#f5f5f3",
    surface: "#ffffff",
    surface2: "#eceae5",
    border: "#dcd9d2",
    text: "#0f1115",
    textMuted: "#5a606b",
    font: '"Hanken Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontDisplay: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
    googleFonts: ["Bricolage Grotesque:opsz,wght@12..96,500..800", "Hanken Grotesk:wght@400;500;600;700"],
    radius: "6px",
    radiusSm: "4px",
    dark: {
      name: "Parcel (evening)",
      mode: "dark",
      primary: "#3b5bdb",
      primary2: "#2f4bc0",
      accent: "#5fd3b5",
      bg: "#0d0f14",
      surface: "#151821",
      surface2: "#1c2030",
      border: "#2b3040",
      text: "#e9ebf0",
      textMuted: "#a3a9b5",
      font: '"Hanken Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      fontDisplay: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
      googleFonts: ["Bricolage Grotesque:opsz,wght@12..96,500..800", "Hanken Grotesk:wght@400;500;600;700"],
      radius: "6px",
      radiusSm: "4px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: editorSafe(HOME_CSS) },
    { title: "Neighbourhoods", slug: "neighbourhoods", isHome: false, html: HOODS_HTML, css: editorSafe(HOODS_CSS) },
  ],
};

registerTemplate(template);
export default template;
