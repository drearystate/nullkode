/*
 * ART DIRECTION — "Alder & Ash", wood-fire kitchen & wine bar
 * Mood ......... candlelit, smoky and intimate: a dark room lit by one open hearth.
 * Type ......... Cormorant Garamond (display, italic accents) + Manrope (body, labels).
 * Palette ...... warm charcoal ground, cream ink, brass hairlines, ember-orange fills.
 * Layout ....... editorial and asymmetric, left-weighted. Thin brass rules, italic
 *                numerals, images in offset brass frames, generous dark space.
 * Signature .... "Tonight, from the hearth": a two-column menu with dotted price
 *                leaders, dietary tags (V, VG, GF, DF, N), a legend and allergy note.
 *                Reservations go to the bookings module.
 * Prefix ....... aash-  (every class is scoped so Bootstrap/platform styles never collide)
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

/* Shared by both designed pages: shared-menu skin, type, buttons, footer. */
const BASE_CSS = `
/* ---------- Shared menu (auto-generated nav) ---------- */
.nk-nav{position:absolute!important;top:0;left:0;right:0;z-index:40;background:transparent!important;border-bottom:1px solid color-mix(in srgb,var(--nk-accent) 22%,transparent)!important;padding:1rem 0!important}
.nk-nav .container{width:min(1240px,100% - 2.5rem);max-width:none;padding-inline:0;margin-inline:auto}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-style:italic;font-weight:600!important;font-size:1.75rem;letter-spacing:.01em;color:var(--nk-text)!important}
.nk-nav .nav-link{color:color-mix(in srgb,var(--nk-text) 82%,transparent)!important;font-weight:600!important;font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;padding:.65rem .9rem!important;border-radius:var(--nk-radius-sm)}
.nk-nav .nav-link:hover,.nk-nav .nav-link.active{color:var(--nk-accent)!important;text-decoration:none}
.nk-nav .dropdown-menu{background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;border-radius:var(--nk-radius-sm)}
.nk-nav .dropdown-item{color:var(--nk-text)!important;font-size:.9rem}
.nk-nav .dropdown-item:hover{background:var(--nk-surface-2)}
.nk-nav .navbar-toggler{position:relative;width:44px;height:40px;padding:0!important;font-size:0;color:var(--nk-text)!important}
.nk-nav .navbar-toggler > span{display:none!important}
.nk-nav .navbar-toggler::before{content:"";position:absolute;left:11px;right:11px;top:50%;height:2px;margin-top:-1px;background-color:currentColor;box-shadow:0 -7px 0 currentColor,0 7px 0 currentColor}
.nk-nav .nav-item:has(> a[href$="/bookings-book"]){order:9}
.nk-nav a[href$="/bookings-book"]{border:1px solid var(--nk-accent);color:var(--nk-accent)!important;margin-left:.75rem}
.nk-nav a[href$="/bookings-book"]:hover{background:var(--nk-accent);color:var(--nk-bg)!important}
/* Owner tools stay out of the visitor menu; the platform's role-gated "Manage" dropdown is left alone. */
.nk-nav .navbar-nav > li:has(> a[href$="-admin"]),.nk-nav .navbar-nav > li:has(> a[href$="-inbox"]),.nk-nav .navbar-nav > li:has(> a[href$="-orders"]),.nk-nav .navbar-nav > li:has(> a[href$="-subscribers"]){display:none!important}
.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:2px solid var(--nk-accent);outline-offset:3px;box-shadow:none}
@media (max-width:991.98px){
  .nk-nav .navbar-collapse{background:var(--nk-surface);border:1px solid var(--nk-border);margin-top:.9rem;padding:.5rem 1rem 1rem}
  .nk-nav a[href$="/bookings-book"]{display:inline-block;margin:.5rem 0 0}
}

/* ---------- Foundations ---------- */
.aash-wrap{width:min(1240px,100% - 2.5rem);margin-inline:auto}
.aash-kicker{font-family:var(--nk-font);font-size:.72rem;font-weight:600;letter-spacing:.28em;text-transform:uppercase;color:var(--nk-accent);margin:0 0 1.25rem}
.aash-h2{text-wrap:balance;font-family:var(--nk-font-display);font-weight:500;font-size:clamp(2.4rem,1.4rem + 3.4vw,4.4rem);line-height:1.02;letter-spacing:-.01em;color:var(--nk-text);margin:0 0 1.5rem}
.aash-h2 em,.aash-hero__title em{font-style:italic;color:var(--nk-accent)}
.aash-body{font-size:1.05rem;line-height:1.75;color:var(--nk-text-muted);max-width:36rem}
.aash-btn{display:inline-flex;align-items:center;justify-content:center;gap:.6em;min-height:3.25rem;padding:.95rem 1.7rem;font-family:var(--nk-font);font-size:.74rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;border-radius:var(--nk-radius-sm);text-decoration:none;transition:background-color .2s ease,color .2s ease,border-color .2s ease}
.aash-btn:hover{text-decoration:none}
.aash-btn.btn-primary{box-shadow:0 10px 30px -12px color-mix(in srgb,var(--nk-primary) 70%,transparent)}
.aash-btn.btn-primary:hover{box-shadow:0 14px 34px -12px color-mix(in srgb,var(--nk-primary) 85%,transparent)}
.aash-btn--line{border:1px solid color-mix(in srgb,var(--nk-text) 45%,transparent);color:var(--nk-text)}
.aash-btn--line:hover{border-color:var(--nk-accent);color:var(--nk-accent)}
.aash-link{color:var(--nk-accent);font-weight:600;font-size:.78rem;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--nk-accent) 45%,transparent);padding-bottom:.3rem}
.aash-link:hover{color:var(--nk-text);border-color:var(--nk-text);text-decoration:none}
.aash-btn:focus-visible,.aash-link:focus-visible,.aash-footer a:focus-visible{outline:2px solid var(--nk-accent);outline-offset:4px}
.aash-frame{position:relative;margin:0;isolation:isolate}
.aash-frame::after{content:"";position:absolute;inset:1.1rem -1.1rem -1.1rem 1.1rem;border:1px solid color-mix(in srgb,var(--nk-accent) 55%,transparent);z-index:-1;pointer-events:none}
.aash-frame img{display:block;width:100%;height:100%;object-fit:cover}

/* ---------- Reservation band ---------- */
.aash-reserve{position:relative;isolation:isolate;overflow:hidden;padding:clamp(6rem,12vw,9.5rem) 0!important;text-align:center}
.aash-reserve__bg{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover}
.aash-reserve::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at center,color-mix(in srgb,var(--nk-bg) 62%,transparent) 0%,color-mix(in srgb,var(--nk-bg) 88%,transparent) 70%)}
.aash-reserve .aash-h2{max-width:16ch;margin-inline:auto}
.aash-reserve__text{color:var(--nk-text);opacity:.86;max-width:34rem;margin:0 auto 2.25rem;font-size:1.05rem;line-height:1.7}
.aash-reserve__actions{display:flex;flex-wrap:wrap;gap:1rem;justify-content:center}
.aash-reserve__note{margin:2rem auto 0;font-size:.85rem;color:var(--nk-text-muted)}
.aash-reserve__note a{color:var(--nk-accent)}

/* ---------- Footer ---------- */
.aash-footer{padding:clamp(4rem,8vw,6rem) 0 2rem;border-top:1px solid color-mix(in srgb,var(--nk-accent) 25%,transparent);background:var(--nk-surface)}
.aash-footer__grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:2.5rem}
.aash-footer .aash-footer__brand{font-family:var(--nk-font-display);font-style:italic;font-size:2.2rem;color:var(--nk-text);margin:0 0 .75rem;line-height:1}
.aash-footer h2{font-family:var(--nk-font);font-size:.72rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--nk-accent);margin:0 0 1rem}
.aash-footer p,.aash-footer li,.aash-footer dd,.aash-footer dt{font-size:.95rem;line-height:1.7;color:var(--nk-text-muted)}
.aash-footer ul{list-style:none;margin:0;padding:0}
.aash-footer dl{display:grid;grid-template-columns:auto 1fr;gap:.2rem 1rem;margin:0}
.aash-footer dt{font-weight:600;color:var(--nk-text)}
.aash-footer dd{margin:0}
.aash-footer a{color:var(--nk-text);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--nk-text) 25%,transparent)}
.aash-footer a:hover{color:var(--nk-accent);border-color:var(--nk-accent);text-decoration:none}
.aash-footer__base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-top:3.5rem;padding-top:1.5rem;border-top:1px solid var(--nk-border);font-size:.8rem;color:var(--nk-text-muted)}
.aash-footer__base p{font-size:.8rem;margin:0}
@media (max-width:991.98px){.aash-footer__grid{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.aash-footer__grid{grid-template-columns:1fr}}
`;

const FOOTER = `
<footer class="aash-footer">
  <div class="aash-wrap">
    <div class="aash-footer__grid">
      <div>
        <p class="aash-footer__brand">Alder &amp; Ash</p>
        <p>Wood-fire kitchen and wine bar in the old Calder Street forge. Dinner Tuesday to Sunday; bar seats always kept for walk-ins.</p>
      </div>
      <div>
        <h2>Visit</h2>
        <p>412 Calder Street<br>Providence, RI 02903</p>
        <p>Street parking after 6 pm. Step-free entrance on Mill Lane.</p>
      </div>
      <div>
        <h2>Hours</h2>
        <dl>
          <dt>Tue – Thu</dt><dd>5:30 – 10 pm</dd>
          <dt>Fri – Sat</dt><dd>5:30 – 11 pm</dd>
          <dt>Sunday</dt><dd>4 – 9 pm</dd>
          <dt>Monday</dt><dd>Closed</dd>
        </dl>
      </div>
      <div>
        <h2>Contact</h2>
        <ul>
          <li><a href="tel:+14015550142">(401) 555-0142</a></li>
          <li><a href="mailto:tables@alderandash.com">tables@alderandash.com</a></li>
          <li><a href="mailto:events@alderandash.com">events@alderandash.com</a></li>
        </ul>
      </div>
    </div>
    <div class="aash-footer__base">
      <p>&copy; 2026 Alder &amp; Ash. All rights reserved.</p>
      <p>Gratuity is always at your discretion and is shared by the whole team.</p>
    </div>
  </div>
</footer>`;

const HOME_HTML = `
<section class="aash-hero">
  <img class="aash-hero__bg" src="/media/generated/restaurant-dining-room.webp" alt="The candlelit dining room at Alder &amp; Ash, with timber beams, brass lamps and set tables" width="1500" height="1245" fetchpriority="high">
  <div class="aash-wrap aash-hero__inner">
    <p class="aash-kicker">Wood-fire kitchen &amp; wine bar &middot; Providence</p>
    <h1 class="aash-hero__title">Cooked over oak.<br><em>Served by candlelight.</em></h1>
    <p class="aash-hero__lede">A 48-seat dining room built around one open hearth. Seasonal plates, whole-animal cooking and a short list of wines we would happily drink ourselves.</p>
    <div class="aash-hero__actions">
      <a class="btn btn-primary aash-btn" href="/book">Book a table</a>
      <a class="aash-btn aash-btn--line" href="#menu">Tonight's menu</a>
    </div>
  </div>
  <div class="aash-hero__bar">
    <div class="aash-wrap aash-hero__facts">
      <p><span>Dinner</span>Tue &ndash; Sun from 5:30 pm</p>
      <p><span>Find us</span>412 Calder Street</p>
      <p><span>Call</span><a href="tel:+14015550142">(401) 555-0142</a></p>
      <p><span>No booking?</span>Bar seats kept for walk-ins</p>
    </div>
  </div>
</section>

<section class="aash-manifesto">
  <div class="aash-wrap aash-manifesto__grid">
    <div class="aash-manifesto__copy">
      <p class="aash-kicker">Since 2016</p>
      <p class="aash-manifesto__statement">Good food takes time. Our lamb shoulder spends <em>eleven hours</em> over the embers, the bread proves for two days, and the fire is lit at nine every morning, whether we are full or not.</p>
    </div>
    <figure class="aash-manifesto__img">
      <img src="/media/generated/restaurant-oak-fire.webp" alt="A split log of red oak glowing orange as it burns in the hearth" width="960" height="720" loading="lazy">
    </figure>
    <ul class="aash-manifesto__facts">
      <li><strong>11 hrs</strong><span>slow-roasted over red oak and apple wood</span></li>
      <li><strong>48</strong><span>seats around a single open hearth</span></li>
      <li><strong>32 mi</strong><span>the farthest any of our produce travels</span></li>
    </ul>
  </div>
</section>

<section class="aash-menu" id="menu">
  <div class="aash-wrap">
    <header class="aash-menu__head">
      <div>
        <p class="aash-kicker">The menu &middot; changes weekly with the market</p>
        <h2 class="aash-h2">Tonight, from <em>the hearth</em></h2>
      </div>
      <p class="aash-menu__legend"><abbr title="Vegetarian">V</abbr> vegetarian &middot; <abbr title="Vegan">VG</abbr> vegan &middot; <abbr title="Gluten-free">GF</abbr> gluten-free &middot; <abbr title="Dairy-free">DF</abbr> dairy-free &middot; <abbr title="Contains nuts">N</abbr> contains nuts</p>
    </header>
    <div class="aash-menu__grid">
      <div class="aash-menu__group">
        <h3 class="aash-menu__cat"><span>I.</span> To start</h3>
        <ul class="aash-menu__list">
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Hearth bread &amp; cultured butter</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$7</span></p><p class="aash-dish__desc">Two-day sourdough, smoked sea salt <abbr class="aash-tag" title="Vegetarian">V</abbr></p></li>
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Charred leeks</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$14</span></p><p class="aash-dish__desc">Hazelnut romesco, aged sherry vinegar <abbr class="aash-tag" title="Vegan">VG</abbr><abbr class="aash-tag" title="Gluten-free">GF</abbr><abbr class="aash-tag" title="Contains nuts">N</abbr></p></li>
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Ember-roasted oysters</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$18</span></p><p class="aash-dish__desc">Half dozen, chilli butter, charred lime <abbr class="aash-tag" title="Gluten-free">GF</abbr></p></li>
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Beef tartare</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$19</span></p><p class="aash-dish__desc">Smoked egg yolk, pickled mustard seed, rye crisps <abbr class="aash-tag" title="Dairy-free">DF</abbr></p></li>
        </ul>
      </div>
      <div class="aash-menu__group">
        <h3 class="aash-menu__cat"><span>II.</span> From the hearth</h3>
        <ul class="aash-menu__list">
          <li class="aash-dish aash-dish--signature"><p class="aash-dish__row"><span class="aash-dish__name">Lamb shoulder, eleven hours</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$64</span></p><p class="aash-dish__desc">For two. Flatbread, pickled shallot, green sauce <abbr class="aash-tag" title="Dairy-free">DF</abbr></p></li>
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Whole grilled bream</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$36</span></p><p class="aash-dish__desc">Brown butter, capers, charred lemon <abbr class="aash-tag" title="Gluten-free">GF</abbr></p></li>
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Dry-aged pork chop</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$38</span></p><p class="aash-dish__desc">Apple mustard, cider jus, crackling <abbr class="aash-tag" title="Gluten-free">GF</abbr><abbr class="aash-tag" title="Dairy-free">DF</abbr></p></li>
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Ember-roasted celeriac</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$26</span></p><p class="aash-dish__desc">Whipped feta, toasted walnut, burnt honey <abbr class="aash-tag" title="Vegetarian">V</abbr><abbr class="aash-tag" title="Gluten-free">GF</abbr><abbr class="aash-tag" title="Contains nuts">N</abbr></p></li>
        </ul>
      </div>
      <div class="aash-menu__group">
        <h3 class="aash-menu__cat"><span>III.</span> On the side</h3>
        <ul class="aash-menu__list">
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Crushed potatoes, beef fat &amp; rosemary</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$9</span></p><p class="aash-dish__desc">Cooked in the ashes, finished on the grill <abbr class="aash-tag" title="Gluten-free">GF</abbr><abbr class="aash-tag" title="Dairy-free">DF</abbr></p></li>
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Bitter leaves &amp; pear</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$10</span></p><p class="aash-dish__desc">Radicchio, shaved pecorino, brown-butter dressing <abbr class="aash-tag" title="Vegetarian">V</abbr><abbr class="aash-tag" title="Gluten-free">GF</abbr></p></li>
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Fire-blistered greens</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$9</span></p><p class="aash-dish__desc">Garlic, Calabrian chilli, lemon <abbr class="aash-tag" title="Vegan">VG</abbr><abbr class="aash-tag" title="Gluten-free">GF</abbr></p></li>
        </ul>
      </div>
      <div class="aash-menu__group">
        <h3 class="aash-menu__cat"><span>IV.</span> Something sweet</h3>
        <ul class="aash-menu__list">
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Burnt honey tart</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$12</span></p><p class="aash-dish__desc">Cr&egrave;me fra&icirc;che, thyme <abbr class="aash-tag" title="Vegetarian">V</abbr></p></li>
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Smoked chocolate pot</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$11</span></p><p class="aash-dish__desc">Olive oil, flaked salt <abbr class="aash-tag" title="Vegetarian">V</abbr><abbr class="aash-tag" title="Gluten-free">GF</abbr></p></li>
          <li class="aash-dish"><p class="aash-dish__row"><span class="aash-dish__name">Three cheeses from the board</span><span class="aash-dish__lead"></span><span class="aash-dish__price">$18</span></p><p class="aash-dish__desc">Quince paste, oat crackers <abbr class="aash-tag" title="Vegetarian">V</abbr></p></li>
        </ul>
      </div>
    </div>
    <footer class="aash-menu__foot">
      <p>Allergies or dietary needs? Tell us when you book &mdash; the kitchen can adapt most dishes. A vegetarian tasting menu is available every night.</p>
      <a class="aash-link" href="/menu">The full menu &rarr;</a>
    </footer>
  </div>
</section>

<section class="aash-hearth">
  <div class="aash-wrap aash-hearth__grid">
    <div class="aash-hearth__media">
      <figure class="aash-frame aash-hearth__main">
        <img src="/media/generated/restaurant-the-pass.webp" alt="Chefs placing grilled steak and roast chicken on warm plates at the kitchen pass" width="960" height="1200" loading="lazy">
      </figure>
    </div>
    <div class="aash-hearth__copy">
      <p class="aash-kicker">The kitchen</p>
      <h2 class="aash-h2">One fire.<br><em>Every dish.</em></h2>
      <p class="aash-body">There is no gas line in our kitchen. Chef Marisol Reyes cooks everything, from the bread to the burnt honey tart, over a three-metre hearth of red oak and apple wood. What the fire does not suit, we do not serve.</p>
      <blockquote class="aash-quote">
        <p>&ldquo;Fire doesn't forgive shortcuts. That is exactly why we cook with it.&rdquo;</p>
        <footer>Marisol Reyes, chef &amp; co-owner</footer>
      </blockquote>
      <ul class="aash-hearth__list">
        <li><span>Wood</span>Red oak &amp; apple, split on site</li>
        <li><span>Meat</span>Whole animals from two farms</li>
        <li><span>Bread</span>Baked daily in the hearth oven</li>
      </ul>
      <a class="aash-link" href="/story">Read our story &rarr;</a>
    </div>
  </div>
</section>

<section class="aash-table">
  <div class="aash-wrap aash-table__grid">
    <div class="aash-table__card">
      <p class="aash-kicker">Chef's counter</p>
      <h2 class="aash-h2">The Hearth <em>Table</em></h2>
      <p class="aash-body">Seven courses at the counter, cooked a metre from your seat. Chef talks you through each plate; you watch the fire do the rest.</p>
      <dl class="aash-table__specs">
        <div><dt>When</dt><dd>Thu &ndash; Sat, one seating at 7:30 pm</dd></div>
        <div><dt>Seats</dt><dd>Eight guests</dd></div>
        <div><dt>Menu</dt><dd>$95 per guest</dd></div>
        <div><dt>Pairing</dt><dd>$60 &middot; non-alcoholic $35</dd></div>
      </dl>
      <a class="btn btn-primary aash-btn" href="/book">Reserve the counter</a>
    </div>
    <figure class="aash-frame aash-table__img">
      <img src="/media/generated/restaurant-lamb-rack.webp" alt="A rack of lamb, charred from the grill, resting on a slate board with thyme" width="960" height="720" loading="lazy">
    </figure>
  </div>
</section>

<section class="aash-cellar">
  <div class="aash-wrap aash-cellar__grid">
    <figure class="aash-cellar__img">
      <img src="/media/generated/restaurant-wine-pour.webp" alt="A server pouring white wine into a row of glasses along the bar" width="960" height="640" loading="lazy">
    </figure>
    <div class="aash-cellar__copy">
      <p class="aash-kicker">The bar</p>
      <h2 class="aash-h2">Wine by the glass, <em>poured generously</em></h2>
      <ul class="aash-cellar__list">
        <li><span class="aash-cellar__wine">Picpoul de Pinet<small>Languedoc &middot; 2024</small></span><span class="aash-cellar__price">$13</span></li>
        <li><span class="aash-cellar__wine">Skin-contact Malvasia<small>Friuli &middot; 2023</small></span><span class="aash-cellar__price">$16</span></li>
        <li><span class="aash-cellar__wine">Gamay, Beaujolais-Villages<small>Burgundy &middot; 2023</small></span><span class="aash-cellar__price">$14</span></li>
        <li><span class="aash-cellar__wine">Syrah<small>Northern Rh&ocirc;ne &middot; 2021</small></span><span class="aash-cellar__price">$18</span></li>
      </ul>
      <p class="aash-cellar__note">140 bottles on the full list &middot; corkage $25, free on Sundays</p>
    </div>
  </div>
</section>

<section class="aash-press">
  <div class="aash-wrap">
    <h2 class="aash-kicker aash-press__kicker">What people are saying</h2>
    <div class="aash-press__grid">
      <blockquote class="aash-press__item">
        <p>&ldquo;The most confident fire cooking in New England right now. Order the lamb and cancel your plans.&rdquo;</p>
        <footer>Ocean State Table</footer>
      </blockquote>
      <blockquote class="aash-press__item">
        <p>&ldquo;A dining room that smells of woodsmoke and good decisions. Even the bread gets a standing ovation.&rdquo;</p>
        <footer>Providence Weekly</footer>
      </blockquote>
      <blockquote class="aash-press__item">
        <p>&ldquo;Warm, unfussy and quietly brilliant. The Hearth Table is the best seat in the city.&rdquo;</p>
        <footer>Northeast Eats Guide, 2025</footer>
      </blockquote>
    </div>
  </div>
</section>

<section class="aash-reserve">
  <img class="aash-reserve__bg" src="/media/generated/restaurant-embers.webp" alt="" width="1920" height="900" loading="lazy">
  <div class="aash-wrap">
    <p class="aash-kicker">Reservations</p>
    <h2 class="aash-h2">Tables open <em>thirty days</em> ahead</h2>
    <p class="aash-reserve__text">Book online in under a minute, or call us between 2 and 5 pm. We hold a third of the room and the whole bar for walk-ins every night.</p>
    <div class="aash-reserve__actions">
      <a class="btn btn-primary aash-btn" href="/book">Book a table</a>
      <a class="aash-btn aash-btn--line" href="tel:+14015550142">Call (401) 555-0142</a>
    </div>
    <p class="aash-reserve__note">Parties of seven or more, and private dining for up to 24: <a href="mailto:events@alderandash.com">events@alderandash.com</a></p>
  </div>
</section>
${FOOTER}`;

const HOME_CSS = `${BASE_CSS}
/* ---------- Hero ---------- */
.aash-hero{position:relative;isolation:isolate;overflow:hidden;min-height:640px;min-height:max(640px,100svh);display:flex;flex-direction:column;justify-content:flex-end;padding:0!important}
.aash-hero__bg{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;object-position:35% 50%}
.aash-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,color-mix(in srgb,var(--nk-bg) 94%,transparent) 0%,color-mix(in srgb,var(--nk-bg) 78%,transparent) 42%,color-mix(in srgb,var(--nk-bg) 30%,transparent) 100%),linear-gradient(0deg,var(--nk-bg) 0%,transparent 42%)}
.aash-hero__inner{padding-top:9rem;padding-bottom:3.5rem}
.aash-hero__title{font-family:var(--nk-font-display);font-weight:500;font-size:clamp(3rem,1.5rem + 6vw,7rem);line-height:.98;letter-spacing:-.015em;color:var(--nk-text);margin:0 0 1.75rem;max-width:15ch}
.aash-hero__lede{font-size:clamp(1rem,.95rem + .3vw,1.2rem);line-height:1.7;color:var(--nk-text);opacity:.86;max-width:34rem;margin:0 0 2.25rem}
.aash-hero__actions{display:flex;flex-wrap:wrap;gap:1rem}
.aash-hero__bar{border-top:1px solid color-mix(in srgb,var(--nk-accent) 30%,transparent);background:color-mix(in srgb,var(--nk-bg) 55%,transparent)}
.aash-hero__facts{display:grid;grid-template-columns:repeat(4,1fr)}
.aash-hero__facts p{margin:0;padding:1.4rem 1.5rem 1.4rem 0;font-size:.95rem;color:var(--nk-text);line-height:1.45}
.aash-hero__facts p + p{padding-left:1.5rem;border-left:1px solid color-mix(in srgb,var(--nk-accent) 22%,transparent)}
.aash-hero__facts span{display:block;font-size:.66rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--nk-accent);margin-bottom:.35rem}
.aash-hero__facts a{color:var(--nk-text);text-decoration:none}
.aash-hero__facts a:hover{color:var(--nk-accent)}
@media (max-width:767.98px){
  .aash-hero::before{background:linear-gradient(180deg,color-mix(in srgb,var(--nk-bg) 70%,transparent) 0%,color-mix(in srgb,var(--nk-bg) 82%,transparent) 55%,var(--nk-bg) 100%)}
  .aash-hero__inner{padding-top:7.5rem}
  .aash-hero__facts{grid-template-columns:1fr 1fr}
  .aash-hero__facts p,.aash-hero__facts p + p{padding:1rem 0;border-left:0}
  .aash-hero__facts p:nth-child(even){padding-left:1rem;border-left:1px solid color-mix(in srgb,var(--nk-accent) 22%,transparent)}
  .aash-hero__facts p:nth-child(n+3){border-top:1px solid color-mix(in srgb,var(--nk-accent) 22%,transparent)}
}

/* ---------- Manifesto ---------- */
.aash-manifesto{padding:clamp(5rem,11vw,9rem) 0!important}
.aash-manifesto__grid{display:grid;grid-template-columns:repeat(12,1fr);gap:2rem;align-items:end}
.aash-manifesto__copy{grid-column:1 / span 8}
.aash-manifesto__statement{font-family:var(--nk-font-display);font-weight:500;font-size:clamp(1.8rem,1.1rem + 2.2vw,3.1rem);line-height:1.2;color:var(--nk-text);margin:0}
.aash-manifesto__statement em{color:var(--nk-accent)}
.aash-manifesto__img{grid-column:10 / span 3;margin:0;height:auto;aspect-ratio:3/4;overflow:hidden;border-radius:var(--nk-radius-sm)}
.aash-manifesto__img img{width:100%;height:100%;object-fit:cover}
.aash-manifesto__facts{grid-column:1 / -1;list-style:none;margin:2.5rem 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid color-mix(in srgb,var(--nk-accent) 30%,transparent)}
.aash-manifesto__facts li{padding:2rem 2rem 0 0}
.aash-manifesto__facts li + li{padding-left:2rem;border-left:1px solid color-mix(in srgb,var(--nk-accent) 20%,transparent)}
.aash-manifesto__facts strong{display:block;font-family:var(--nk-font-display);font-style:italic;font-weight:500;font-size:clamp(2.6rem,2rem + 2vw,3.8rem);line-height:1;color:var(--nk-accent);margin-bottom:.6rem}
.aash-manifesto__facts span{color:var(--nk-text-muted);font-size:.98rem}
@media (max-width:767.98px){
  .aash-manifesto__copy,.aash-manifesto__img{grid-column:1 / -1}
  .aash-manifesto__img{height:auto;aspect-ratio:16/10}
  .aash-manifesto__facts{grid-template-columns:1fr}
  .aash-manifesto__facts li,.aash-manifesto__facts li + li{padding:1.5rem 0;border-left:0;border-bottom:1px solid color-mix(in srgb,var(--nk-accent) 20%,transparent)}
}

/* ---------- Menu (signature) ---------- */
.aash-menu{padding:clamp(5rem,10vw,8.5rem) 0!important;background:var(--nk-surface);border-block:1px solid color-mix(in srgb,var(--nk-accent) 18%,transparent)}
.aash-menu__head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1.5rem 3rem;margin-bottom:clamp(2.5rem,5vw,4rem)}
.aash-menu__head .aash-h2{margin:0}
.aash-menu__legend{max-width:22rem;margin:0;font-size:.82rem;line-height:1.8;color:var(--nk-text-muted)}
.aash-menu__legend abbr{text-decoration:none;font-weight:700;color:var(--nk-accent)}
.aash-menu__grid{display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(2.5rem,6vw,6rem)}
.aash-menu__group{min-width:0}
.aash-menu__cat{display:flex;align-items:baseline;gap:.9rem;font-family:var(--nk-font-display);font-weight:500;font-size:clamp(1.7rem,1.4rem + .9vw,2.2rem);color:var(--nk-text);margin:0 0 1.25rem;padding-bottom:.9rem;border-bottom:1px solid color-mix(in srgb,var(--nk-accent) 35%,transparent)}
.aash-menu__cat span{font-style:italic;color:var(--nk-accent);font-size:.8em}
.aash-menu__list{list-style:none;margin:0 0 3.25rem;padding:0}
.aash-dish{padding:.95rem 0}
.aash-dish + .aash-dish{border-top:1px solid color-mix(in srgb,var(--nk-border) 70%,transparent)}
.aash-dish__row{display:flex;align-items:baseline;gap:.75rem;margin:0}
.aash-dish__name{font-weight:600;font-size:1.05rem;color:var(--nk-text)}
.aash-dish__lead{flex:1;min-width:1.5rem;border-bottom:1px dotted color-mix(in srgb,var(--nk-text) 35%,transparent);transform:translateY(-.3rem)}
.aash-dish__price{font-family:var(--nk-font-display);font-weight:600;font-size:1.3rem;color:var(--nk-accent);font-variant-numeric:lining-nums tabular-nums}
.aash-dish__desc{margin:.35rem 0 0;font-size:.93rem;line-height:1.6;color:var(--nk-text-muted)}
.aash-dish--signature .aash-dish__name::after{content:"House signature";margin-left:.6rem;padding:.15rem .5rem;font-size:.6rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;vertical-align:.2em;color:var(--nk-bg);background:var(--nk-accent);border-radius:2px}
.aash-tag{display:inline-block;margin-left:.35rem;padding:.08rem .38rem;font-size:.62rem;font-weight:700;letter-spacing:.08em;line-height:1.5;text-decoration:none;color:var(--nk-accent);border:1px solid color-mix(in srgb,var(--nk-accent) 50%,transparent);border-radius:2px;vertical-align:.12em;cursor:help}
.aash-menu__foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1.5rem;padding-top:2rem;border-top:1px solid color-mix(in srgb,var(--nk-accent) 30%,transparent)}
.aash-menu__foot p{margin:0;max-width:40rem;color:var(--nk-text-muted);font-size:.95rem}
@media (max-width:767.98px){.aash-menu__grid{grid-template-columns:1fr}.aash-dish--signature .aash-dish__name::after{display:none}}

/* ---------- Kitchen ---------- */
.aash-hearth{padding:clamp(5rem,11vw,9rem) 0!important}
.aash-hearth__grid{display:grid;grid-template-columns:5fr 6fr;gap:clamp(3rem,7vw,7rem);align-items:center}
.aash-hearth__main{aspect-ratio:4/5;margin-right:1.1rem}
.aash-quote{margin:2rem 0;padding:0 0 0 1.5rem;border-left:2px solid var(--nk-primary)}
.aash-quote p{font-family:var(--nk-font-display);font-style:italic;font-size:clamp(1.4rem,1.1rem + .9vw,1.9rem);line-height:1.3;color:var(--nk-text);margin:0 0 .6rem}
.aash-quote footer{font-size:.74rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--nk-accent)}
.aash-hearth__list{list-style:none;margin:0 0 2.25rem;padding:0;border-top:1px solid var(--nk-border)}
.aash-hearth__list li{display:flex;gap:1.5rem;padding:.9rem 0;border-bottom:1px solid var(--nk-border);color:var(--nk-text)}
.aash-hearth__list span{flex:0 0 5.5rem;font-size:.7rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--nk-accent);padding-top:.2rem}
@media (max-width:767.98px){.aash-hearth__grid{grid-template-columns:1fr}.aash-hearth__main{aspect-ratio:4/4.4}}

/* ---------- Hearth Table ---------- */
.aash-table{padding:0 0 clamp(5rem,11vw,9rem)!important}
.aash-table__grid{display:grid;grid-template-columns:6fr 5fr;gap:clamp(3rem,7vw,6rem);align-items:center}
.aash-table__card{padding:clamp(2rem,4vw,3.5rem);background:var(--nk-surface);border:1px solid color-mix(in srgb,var(--nk-accent) 30%,transparent)}
.aash-table__specs{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem 2rem;margin:2rem 0 2.5rem}
.aash-table__specs dt{font-size:.66rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--nk-accent);margin-bottom:.3rem}
.aash-table__specs dd{margin:0;color:var(--nk-text);font-size:1rem}
.aash-table__img{height:auto;aspect-ratio:4/3.4;margin-right:1.1rem}
@media (max-width:767.98px){.aash-table__grid{grid-template-columns:1fr}.aash-table__img{order:-1}.aash-table__specs{grid-template-columns:1fr}}

/* ---------- Bar ---------- */
.aash-cellar{padding:clamp(5rem,10vw,8rem) 0!important;background:var(--nk-surface-2)}
.aash-cellar__grid{display:grid;grid-template-columns:repeat(12,1fr);gap:2rem;align-items:center}
.aash-cellar__img{grid-column:1 / span 6;margin:0;height:auto;aspect-ratio:3/2;overflow:hidden;border-radius:var(--nk-radius-sm)}
.aash-cellar__img img{width:100%;height:100%;object-fit:cover}
.aash-cellar__copy{grid-column:8 / span 5}
.aash-cellar__list{list-style:none;margin:0 0 1.5rem;padding:0}
.aash-cellar__list li{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;padding:1rem 0;border-bottom:1px solid color-mix(in srgb,var(--nk-accent) 20%,transparent)}
.aash-cellar__wine{font-weight:600;color:var(--nk-text)}
.aash-cellar__wine small{display:block;font-weight:400;font-size:.85rem;color:var(--nk-text-muted);margin-top:.15rem}
.aash-cellar__price{font-family:var(--nk-font-display);font-size:1.35rem;font-weight:600;color:var(--nk-accent)}
.aash-cellar__note{font-size:.88rem;color:var(--nk-text-muted);margin:0}
@media (max-width:991.98px){.aash-cellar__img,.aash-cellar__copy{grid-column:1 / -1}}

/* ---------- Press ---------- */
.aash-press{padding:clamp(5rem,10vw,8rem) 0!important}
.aash-press__kicker{text-align:center;margin-bottom:3rem}
.aash-press__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0}
.aash-press__item{margin:0;padding:0 clamp(1.5rem,3vw,2.5rem);text-align:center}
.aash-press__item + .aash-press__item{border-left:1px solid color-mix(in srgb,var(--nk-accent) 25%,transparent)}
.aash-press__item p{font-family:var(--nk-font-display);font-style:italic;font-size:clamp(1.3rem,1.1rem + .6vw,1.65rem);line-height:1.35;color:var(--nk-text);margin:0 0 1.25rem}
.aash-press__item footer{font-size:.7rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--nk-accent)}
@media (max-width:767.98px){.aash-press__grid{grid-template-columns:1fr;gap:2.5rem}.aash-press__item{padding:0}.aash-press__item + .aash-press__item{border-left:0;border-top:1px solid color-mix(in srgb,var(--nk-accent) 25%,transparent);padding-top:2.5rem}}
`;

const STORY_HTML = `
<section class="aash-story-hero">
  <img class="aash-story-hero__bg" src="/media/generated/restaurant-oak-fire.webp" alt="" width="960" height="720" fetchpriority="high">
  <div class="aash-wrap aash-story-hero__inner">
    <p class="aash-kicker">Our story</p>
    <h1 class="aash-story-hero__title">A kitchen built around <em>one fire</em></h1>
    <p class="aash-story-hero__lede">Ten years ago this was a blacksmith's forge with a cold chimney. We lit it again.</p>
  </div>
</section>

<section class="aash-story">
  <div class="aash-wrap aash-story__grid">
    <div class="aash-story__aside">
      <p class="aash-kicker">The short version</p>
      <p class="aash-story__pull">Two cooks, one hearth, and a rule that the fire decides the menu.</p>
    </div>
    <div class="aash-story__text">
      <p class="aash-story__first">Marisol Reyes and Jonah Whitfield met cooking at an inn on the Maine coast, where the kitchen had a single wood oven and no patience for waste. When the old Calder Street forge came up for lease in 2015, they rebuilt its chimney brick by brick and opened with twenty-two seats, a hearth and a borrowed wine list.</p>
      <p>We still cook the way that inn taught us. Whole animals arrive from two farms we visit every season, and every part of them finds its way onto the menu. Vegetables come from growers within an hour's drive, so the menu changes whenever the market does, sometimes twice in a week.</p>
      <p>The dining room has grown to forty-eight seats, but the kitchen has not. Everything still passes through one fire, and the people who cook your dinner are the same people who split the wood that morning.</p>
    </div>
  </div>
</section>

<section class="aash-timeline">
  <div class="aash-wrap">
    <p class="aash-kicker">Along the way</p>
    <h2 class="aash-h2">Ten years <em>in the embers</em></h2>
    <ol class="aash-timeline__list">
      <li><span class="aash-timeline__year">2016</span><div><h3>The forge reopens</h3><p>Twenty-two seats, one hearth and a chalkboard menu that changed daily.</p></div></li>
      <li><span class="aash-timeline__year">2018</span><div><h3>Bread comes in-house</h3><p>We built a clay oven into the hearth and started baking our two-day sourdough.</p></div></li>
      <li><span class="aash-timeline__year">2021</span><div><h3>The dining room doubles</h3><p>We took over the old tool store next door and opened the bar to walk-ins.</p></div></li>
      <li><span class="aash-timeline__year">2025</span><div><h3>The Hearth Table</h3><p>An eight-seat counter facing the fire, with a seven-course menu from Chef Reyes.</p></div></li>
    </ol>
  </div>
</section>

<section class="aash-growers">
  <div class="aash-wrap aash-growers__grid">
    <figure class="aash-frame aash-growers__img">
      <img src="/media/generated/restaurant-house-bread.webp" alt="Toasted house bread and a jar of whipped butter on a candlelit table" width="960" height="636" loading="lazy">
    </figure>
    <div>
      <p class="aash-kicker">Who we buy from</p>
      <h2 class="aash-h2">Close to home, <em>and named</em></h2>
      <table class="aash-growers__table">
        <caption>Our regular suppliers and how far their produce travels</caption>
        <thead><tr><th scope="col">Supplier</th><th scope="col">What they grow</th><th scope="col">Distance</th></tr></thead>
        <tbody>
          <tr><td>Blackbird Hollow Farm</td><td>Lamb &amp; heritage pork</td><td>14 mi</td></tr>
          <tr><td>Sakonnet Point Oysters</td><td>Oysters &amp; clams</td><td>29 mi</td></tr>
          <tr><td>Stonewall Grain Co-op</td><td>Rye &amp; wheat for our bread</td><td>32 mi</td></tr>
          <tr><td>Seven Acre Greens</td><td>Leaves, leeks, roots</td><td>11 mi</td></tr>
          <tr><td>Harrow Hill Dairy</td><td>Butter, cream, feta</td><td>18 mi</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="aash-people">
  <div class="aash-wrap">
    <p class="aash-kicker">The people</p>
    <div class="aash-people__grid">
      <article class="aash-person">
        <h3>Marisol Reyes</h3>
        <p class="aash-person__role">Chef &amp; co-owner</p>
        <p>Cooked in Oaxaca and on the Maine coast before opening Alder &amp; Ash. Runs the hearth, writes the menu, and still splits the first log of the day.</p>
      </article>
      <article class="aash-person">
        <h3>Jonah Whitfield</h3>
        <p class="aash-person__role">Wine &amp; co-owner</p>
        <p>Builds the list around small growers who farm the way we cook. Ask him for something odd; he will have three bottles to show you.</p>
      </article>
      <article class="aash-person">
        <h3>Priya Anand</h3>
        <p class="aash-person__role">Head baker</p>
        <p>Keeps the starter alive seven days a week and bakes every loaf, cracker and tart shell in the hearth oven.</p>
      </article>
    </div>
  </div>
</section>

<section class="aash-reserve aash-reserve--story">
  <img class="aash-reserve__bg" src="/media/generated/restaurant-dinner-table.webp" alt="" width="960" height="640" loading="lazy">
  <div class="aash-wrap">
    <p class="aash-kicker">Come and eat</p>
    <h2 class="aash-h2">Pull up a chair<br><em>by the fire</em></h2>
    <p class="aash-reserve__text">Dinner from 5:30 pm, Tuesday to Sunday. Book ahead, or take your chances at the bar.</p>
    <div class="aash-reserve__actions">
      <a class="btn btn-primary aash-btn" href="/book">Book a table</a>
      <a class="aash-btn aash-btn--line" href="/menu">See the menu</a>
    </div>
  </div>
</section>
${FOOTER}`;

const STORY_CSS = `${BASE_CSS}
.aash-story-hero{position:relative;isolation:isolate;overflow:hidden;min-height:520px;min-height:max(520px,72svh);display:flex;align-items:flex-end;padding:0!important}
.aash-story-hero__bg{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;object-position:60% 50%}
.aash-story-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(0deg,var(--nk-bg) 0%,color-mix(in srgb,var(--nk-bg) 70%,transparent) 55%,color-mix(in srgb,var(--nk-bg) 45%,transparent) 100%)}
.aash-story-hero__inner{padding-top:9rem;padding-bottom:clamp(3rem,7vw,5rem)}
.aash-story-hero__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:500;font-size:clamp(2.8rem,1.4rem + 5.5vw,6.2rem);line-height:1;letter-spacing:-.01em;color:var(--nk-text);max-width:14ch;margin:0 0 1.5rem}
.aash-story-hero__title em{font-style:italic;color:var(--nk-accent)}
.aash-story-hero__lede{font-size:1.15rem;color:var(--nk-text);opacity:.86;max-width:32rem;margin:0}
.aash-story{padding:clamp(5rem,10vw,8rem) 0!important}
.aash-story__grid{display:grid;grid-template-columns:4fr 7fr;gap:clamp(2.5rem,7vw,7rem)}
.aash-story__pull{font-family:var(--nk-font-display);font-style:italic;font-size:clamp(1.6rem,1.2rem + 1.2vw,2.3rem);line-height:1.25;color:var(--nk-text);margin:0;padding-top:1.5rem;border-top:1px solid color-mix(in srgb,var(--nk-accent) 40%,transparent)}
.aash-story__text p{font-size:1.08rem;line-height:1.85;color:var(--nk-text-muted);margin:0 0 1.4rem}
.aash-story__first::first-letter{float:left;font-family:var(--nk-font-display);font-size:4.6rem;line-height:.8;padding:.35rem .6rem 0 0;color:var(--nk-accent)}
.aash-timeline{padding:clamp(5rem,10vw,8rem) 0!important;background:var(--nk-surface)}
.aash-timeline__list{list-style:none;margin:2.5rem 0 0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid color-mix(in srgb,var(--nk-accent) 35%,transparent)}
.aash-timeline__list li{padding:2rem 1.75rem 0 0}
.aash-timeline__list li + li{padding-left:1.75rem;border-left:1px solid color-mix(in srgb,var(--nk-accent) 18%,transparent)}
.aash-timeline__year{display:block;font-family:var(--nk-font-display);font-style:italic;font-size:2.8rem;line-height:1;color:var(--nk-accent);margin-bottom:1rem}
.aash-timeline__list h3{font-family:var(--nk-font);font-size:1rem;font-weight:700;color:var(--nk-text);margin:0 0 .5rem;letter-spacing:0}
.aash-timeline__list p{font-size:.95rem;color:var(--nk-text-muted);margin:0}
.aash-growers{padding:clamp(5rem,10vw,8rem) 0!important}
.aash-growers__grid{display:grid;grid-template-columns:5fr 6fr;gap:clamp(3rem,7vw,6rem);align-items:center}
.aash-growers__img{height:auto;aspect-ratio:4/5;margin-right:1.1rem}
.aash-growers__table{width:100%;border-collapse:collapse;font-size:.98rem}
.aash-growers__table caption{caption-side:bottom;padding-top:1rem;font-size:.82rem;color:var(--nk-text-muted)}
.aash-growers__table th{font-size:.66rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--nk-accent);text-align:left;padding:.75rem .75rem .75rem 0;border-bottom:1px solid color-mix(in srgb,var(--nk-accent) 40%,transparent)}
.aash-growers__table td{padding:.95rem .75rem .95rem 0;border-bottom:1px solid var(--nk-border);color:var(--nk-text-muted)}
.aash-growers__table td:first-child{color:var(--nk-text);font-weight:600}
.aash-growers__table td:last-child,.aash-growers__table th:last-child{text-align:right;padding-right:0;font-variant-numeric:tabular-nums}
.aash-people{padding:0 0 clamp(5rem,10vw,8rem)!important}
.aash-people__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;margin-top:1rem}
.aash-person{padding:2rem;border:1px solid color-mix(in srgb,var(--nk-accent) 25%,transparent);background:var(--nk-surface)}
.aash-person h3{font-family:var(--nk-font-display);font-weight:500;font-size:1.9rem;color:var(--nk-text);margin:0}
.aash-person .aash-person__role{font-size:.68rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--nk-accent);margin:.4rem 0 1rem}
.aash-person p{font-size:.96rem;line-height:1.7;color:var(--nk-text-muted);margin:0}
@media (max-width:991.98px){.aash-timeline__list{grid-template-columns:1fr 1fr;row-gap:2rem}.aash-timeline__list li:nth-child(3){padding-left:0;border-left:0}}
@media (max-width:767.98px){
  .aash-story__grid,.aash-growers__grid,.aash-people__grid{grid-template-columns:1fr}
  .aash-growers__img{height:auto;aspect-ratio:16/11}
  .aash-timeline__list{grid-template-columns:1fr}
  .aash-timeline__list li,.aash-timeline__list li + li{padding:1.5rem 0;border-left:0;border-bottom:1px solid color-mix(in srgb,var(--nk-accent) 18%,transparent)}
}
`;

const template: StarterTemplate = {
  id: "original-restaurant",
  name: "Alder & Ash",
  tagline: "Candlelit wood-fire restaurant with a priced menu, dietary tags and table bookings",
  category: "restaurant",
  tags: ["restaurant", "dining", "wood-fire", "grill", "wine bar", "menu", "reservations", "bistro", "dark", "elegant", "fine dining", "chef"],
  source: "original",
  modules: ["menu", "bookings"],
  moduleSeeds: {
    menu: {
      items: [
        { name: "Hearth bread & cultured butter", description: "Two-day sourdough, smoked sea salt (V)", price: 7, category: "I. To start", featured: false },
        { name: "Charred leeks", description: "Hazelnut romesco, aged sherry vinegar (VG, GF, N)", price: 14, category: "I. To start", featured: false },
        { name: "Ember-roasted oysters", description: "Half dozen, chilli butter, charred lime (GF)", price: 18, category: "I. To start", featured: false },
        { name: "Beef tartare", description: "Smoked egg yolk, pickled mustard seed, rye crisps (DF)", price: 19, category: "I. To start", featured: false },
        { name: "Lamb shoulder, eleven hours", description: "For two. Flatbread, pickled shallot, green sauce (DF)", price: 64, category: "II. From the hearth", featured: true },
        { name: "Whole grilled bream", description: "Brown butter, capers, charred lemon (GF)", price: 36, category: "II. From the hearth", featured: false },
        { name: "Dry-aged pork chop", description: "Apple mustard, cider jus, crackling (GF, DF)", price: 38, category: "II. From the hearth", featured: false },
        { name: "Ember-roasted celeriac", description: "Whipped feta, toasted walnut, burnt honey (V, GF, N)", price: 26, category: "II. From the hearth", featured: false },
        { name: "Crushed potatoes, beef fat & rosemary", description: "Cooked in the ashes, finished on the grill (GF, DF)", price: 9, category: "III. On the side", featured: false },
        { name: "Bitter leaves & pear", description: "Radicchio, shaved pecorino, brown-butter dressing (V, GF)", price: 10, category: "III. On the side", featured: false },
        { name: "Fire-blistered greens", description: "Garlic, Calabrian chilli, lemon (VG, GF)", price: 9, category: "III. On the side", featured: false },
        { name: "Burnt honey tart", description: "Crème fraîche, thyme (V)", price: 12, category: "IV. Something sweet", featured: false },
        { name: "Smoked chocolate pot", description: "Olive oil, flaked salt (V, GF)", price: 11, category: "IV. Something sweet", featured: false },
        { name: "Three cheeses from the board", description: "Quince paste, oat crackers (V)", price: 18, category: "IV. Something sweet", featured: false },
      ],
    },
  },
  theme: {
    name: "Alder & Ash",
    mode: "dark",
    primary: "#b4502a",
    primary2: "#9a4322",
    accent: "#d7b27a",
    bg: "#15110e",
    surface: "#1d1814",
    surface2: "#241e19",
    border: "#3a3129",
    text: "#f1e8dc",
    textMuted: "#b3a593",
    font: '"Manrope", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontDisplay: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
    googleFonts: ["Cormorant Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600", "Manrope:wght@400;500;600;700"],
    radius: "4px",
    radiusSm: "2px",
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: editorSafe(HOME_CSS) },
    { title: "Our Story", slug: "story", isHome: false, html: STORY_HTML, css: editorSafe(STORY_CSS) },
  ],
};

registerTemplate(template);
export default template;
