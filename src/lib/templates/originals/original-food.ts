/*
 * ART DIRECTION — "Proof Bakehouse", neighbourhood bakery & cafe
 * Mood ......... bright, sunny and handmade: warm paper, butter-yellow and a crust-brown ink.
 * Type ......... Fraunces (soft display serif, italic accents) + Figtree (friendly body/UI).
 * Palette ...... cream paper ground, cocoa text, terracotta "crust" for actions, butter-yellow
 *                sticker fills.
 * Layout ....... playful and rounded: pill buttons, round "stickers" tilted a few degrees,
 *                an order ticket with a dashed tear line, generous rounded image frames.
 * Signature .... "Today's bake board": every bake with its oven time, price, dietary tag,
 *                a stock status and a working "Add" button (platform cart) that feeds
 *                pickup checkout in the shop module.
 * Prefix ....... prf-
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";

const IMG = "/templates/originals/original-food";

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
/* ---------- Shared menu: sticky cream bar with a pill "Shop" ---------- */
.nk-nav{position:sticky!important;top:0;z-index:40;background:color-mix(in srgb,var(--nk-bg) 88%,transparent)!important;backdrop-filter:saturate(1.4) blur(10px);-webkit-backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--nk-border)!important;padding:.6rem 0!important}
.nk-nav .container{width:min(1200px,100% - 2.5rem);max-width:none;padding-inline:0;margin-inline:auto}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-weight:800!important;font-size:1.5rem;letter-spacing:-.02em;color:var(--nk-text)!important;display:inline-flex;align-items:center;gap:.5rem}
.nk-nav .navbar-brand::before{content:"";width:.75rem;height:.75rem;border-radius:50%;background:var(--nk-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--nk-accent) 35%,transparent)}
.nk-nav .nav-link{color:var(--nk-text)!important;font-weight:600!important;font-size:.98rem;padding:.5rem .95rem!important;border-radius:999px}
.nk-nav .nav-link:hover{background:var(--nk-surface-2);text-decoration:none}
.nk-nav .nav-link.active{background:var(--nk-surface-2)}
.nk-nav .dropdown-menu{background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;border-radius:16px}
.nk-nav .dropdown-item{color:var(--nk-text)!important}
.nk-nav .navbar-toggler{position:relative;width:44px;height:40px;padding:0!important;font-size:0;color:var(--nk-text)!important;border-radius:999px}
.nk-nav .navbar-toggler > span{display:none!important}
.nk-nav .navbar-toggler::before{content:"";position:absolute;left:12px;right:12px;top:50%;height:2px;margin-top:-1px;border-radius:2px;background-color:currentColor;box-shadow:0 -6px 0 currentColor,0 6px 0 currentColor}
.nk-nav .nav-item:has(> a[href$="/shop-shop"]){order:9}
.nk-nav a[href$="/shop-shop"]{background:var(--nk-primary);color:var(--nk-surface)!important;margin-left:.5rem;padding-inline:1.25rem!important}
.nk-nav a[href$="/shop-shop"]:hover{background:var(--nk-primary-2)}
html[data-theme="dark"] .nk-nav a[href$="/shop-shop"]{color:var(--nk-text)!important}
/* Owner tools stay out of the visitor menu; the platform's role-gated "Manage" dropdown is left alone. */
.nk-nav .navbar-nav > li:has(> a[href$="-admin"]),.nk-nav .navbar-nav > li:has(> a[href$="-inbox"]),.nk-nav .navbar-nav > li:has(> a[href$="-orders"]),.nk-nav .navbar-nav > li:has(> a[href$="-subscribers"]){display:none!important}
.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-accent);outline-offset:2px;box-shadow:none}
@media (max-width:991.98px){
  .nk-nav .navbar-collapse{background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:20px;margin-top:.75rem;padding:.75rem}
  .nk-nav a[href$="/shop-shop"]{display:inline-block;margin:.5rem 0 0}
}

/* ---------- Foundations ---------- */
.prf-wrap{width:min(1200px,100% - 2.5rem);margin-inline:auto}
.prf-label{display:inline-flex;align-items:center;gap:.5rem;font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-primary);margin:0 0 1rem}
.prf-label::before{content:"";width:1.5rem;height:2px;border-radius:2px;background:var(--nk-primary)}
.prf-h2{text-wrap:balance;font-family:var(--nk-font-display);font-weight:800;font-size:clamp(2.1rem,1.3rem + 3vw,3.6rem);line-height:1.02;letter-spacing:-.03em;color:var(--nk-text);margin:0 0 1rem}
.prf-h2 em{font-style:italic;font-weight:600;color:var(--nk-primary)}
.prf-lede{font-size:1.1rem;line-height:1.7;color:var(--nk-text-muted);max-width:34rem;margin:0}
.prf-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:3.1rem;padding:.8rem 1.6rem;border-radius:999px;font-weight:700;font-size:1rem;text-decoration:none;transition:transform .15s ease,background-color .15s ease,box-shadow .15s ease}
.prf-btn:hover{text-decoration:none;transform:translateY(-2px)}
.prf-btn.btn-primary{box-shadow:0 8px 20px -10px color-mix(in srgb,var(--nk-primary) 80%,transparent)}
.prf-btn--ghost{background:var(--nk-surface);color:var(--nk-text);border:2px solid var(--nk-text)}
.prf-btn--ghost:hover{background:var(--nk-text);color:var(--nk-bg)}
.prf-btn:focus-visible,.prf-add:focus-visible,.prf-link:focus-visible,.prf-footer a:focus-visible{outline:3px solid var(--nk-accent);outline-offset:3px}
.prf-link{font-weight:700;color:var(--nk-primary);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}
.prf-link:hover{color:var(--nk-primary-2)}
.prf-sticker{display:inline-grid;place-items:center;text-align:center;border-radius:50%;background:var(--nk-accent);color:var(--nk-text);font-family:var(--nk-font-display);font-weight:800;line-height:1.05;box-shadow:0 12px 24px -12px color-mix(in srgb,var(--nk-text) 45%,transparent)}
.prf-tag{display:inline-block;padding:.1rem .5rem;border-radius:999px;font-size:.72rem;font-weight:700;letter-spacing:.04em;color:var(--nk-text);background:var(--nk-surface-2);border:1px solid var(--nk-border);text-decoration:none;vertical-align:.1em}

/* ---------- Footer ---------- */
.prf-footer{padding:clamp(3.5rem,7vw,5rem) 0 2rem;background:var(--nk-text);color:var(--nk-bg)}
.prf-footer__grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:2.5rem}
.prf-footer .prf-footer__brand{font-family:var(--nk-font-display);font-weight:800;font-size:2rem;letter-spacing:-.02em;color:var(--nk-bg);margin:0 0 .5rem}
.prf-footer h2{font-family:var(--nk-font);font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--nk-accent);margin:0 0 .9rem}
.prf-footer p,.prf-footer li{font-size:.95rem;line-height:1.7;color:color-mix(in srgb,var(--nk-bg) 78%,transparent);margin:0}
.prf-footer ul{list-style:none;margin:0;padding:0}
.prf-footer a{color:var(--nk-bg);text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--nk-bg) 35%,transparent);text-underline-offset:3px}
.prf-footer a:hover{color:var(--nk-accent)}
.prf-footer__base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-top:3rem;padding-top:1.5rem;border-top:1px solid color-mix(in srgb,var(--nk-bg) 18%,transparent)}
.prf-footer__base p{font-size:.85rem}
@media (max-width:991.98px){.prf-footer__grid{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.prf-footer__grid{grid-template-columns:1fr}}
`;

const FOOTER = `
<footer class="prf-footer">
  <div class="prf-wrap">
    <div class="prf-footer__grid">
      <div>
        <p class="prf-footer__brand">Proof Bakehouse</p>
        <p>Naturally leavened bread, laminated pastry and good coffee. Baked every morning on Mercer Street since 2019.</p>
      </div>
      <div>
        <h2>Find us</h2>
        <p>64 Mercer Street<br>Burlington, VT 05401</p>
      </div>
      <div>
        <h2>Opening hours</h2>
        <ul>
          <li>Tue &ndash; Fri &middot; 7 am &ndash; 3 pm</li>
          <li>Sat &ndash; Sun &middot; 7:30 am &ndash; 2 pm</li>
          <li>Monday &middot; closed (we're baking)</li>
        </ul>
      </div>
      <div>
        <h2>Say hello</h2>
        <ul>
          <li><a href="tel:+18025550117">(802) 555-0117</a></li>
          <li><a href="mailto:hello@proofbakehouse.com">hello@proofbakehouse.com</a></li>
        </ul>
      </div>
    </div>
    <div class="prf-footer__base">
      <p>&copy; 2026 Proof Bakehouse</p>
      <p>We bake with wheat, dairy, eggs, nuts and sesame in one small kitchen.</p>
    </div>
  </div>
</footer>`;

const board = (time: string, name: string, note: string, tags: string, price: string, id: string, status: "plenty" | "low" | "out") => {
  const st = status === "plenty" ? "Plenty left" : status === "low" ? "Going fast" : "Sold out";
  const action = status === "out"
    ? `<span class="prf-add prf-add--out" aria-hidden="true">&mdash;</span>`
    : `<button type="button" class="prf-add" data-nk-cart-add data-nk-id="${id}" data-nk-name="${name}" data-nk-price="${price}" aria-label="Add ${name} to your order">Add</button>`;
  return `
          <li class="prf-board__row">
            <span class="prf-board__time">${time}</span>
            <div class="prf-board__item"><p class="prf-board__name">${name} ${tags}</p><p class="prf-board__note">${note}</p></div>
            <span class="prf-status prf-status--${status}">${st}</span>
            <span class="prf-board__price">$${price}</span>
            ${action}
          </li>`;
};
const VG = `<abbr class="prf-tag" title="Vegan">VG</abbr>`;
const V = `<abbr class="prf-tag" title="Vegetarian">V</abbr>`;

const HOME_HTML = `
<section class="prf-hero">
  <div class="prf-wrap prf-hero__grid">
    <div class="prf-hero__copy">
      <p class="prf-open"><span class="prf-open__dot"></span>Open today &middot; 7 am &ndash; 3 pm</p>
      <h1 class="prf-hero__title">Bread worth <em>getting up</em> for.</h1>
      <p class="prf-lede">Naturally leavened loaves, buttery laminated pastry and proper coffee, baked every morning in a tiny corner bakery on Mercer Street.</p>
      <div class="prf-hero__actions">
        <a class="btn btn-primary prf-btn" href="/shop">Order for pickup</a>
        <a class="prf-btn prf-btn--ghost" href="#today">See today's bakes</a>
      </div>
      <p class="prf-hero__proof"><span class="prf-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> 4.9 from 1,240 neighbours &middot; Best Bakery, Seven Days 2025</p>
    </div>
    <div class="prf-hero__art">
      <figure class="prf-hero__photo"><img src="${IMG}/croissant-tray.webp" alt="A tray of freshly baked butter croissants cooling by the bakery window" width="860" height="638" fetchpriority="high"></figure>
      <p class="prf-sticker prf-hero__sticker"><span>Out of<br>the oven<br><em>by 7 am</em></span></p>
      <figure class="prf-hero__cup"><img src="${IMG}/rustic-rolls.webp" alt="Flour-dusted rustic rolls straight from the oven" width="960" height="640"></figure>
    </div>
  </div>
</section>

<div class="prf-ribbon-clip" aria-hidden="true"><div class="prf-ribbon">
  <p>Country sourdough <span>&#10038;</span> Seeded rye <span>&#10038;</span> Cardamom knots <span>&#10038;</span> Almond croissants <span>&#10038;</span> Pain au chocolat <span>&#10038;</span> Rosemary focaccia <span>&#10038;</span> Brown butter blondies <span>&#10038;</span> Country sourdough <span>&#10038;</span> Seeded rye</p>
</div></div>

<section class="prf-board" id="today">
  <div class="prf-wrap prf-board__grid">
    <div class="prf-board__intro">
      <p class="prf-label">Fresh this morning</p>
      <h2 class="prf-h2">Today's <em>bake board</em></h2>
      <p class="prf-lede">Everything below came out of our deck oven today. Add what you'd like and collect it from the pickup shelf; no queue, no waiting.</p>
      <div class="prf-basket">
        <p class="prf-basket__title">Your pickup order</p>
        <p class="prf-basket__sum"><span data-nk-cart-count>0</span> items &middot; $<span data-nk-cart-total>0.00</span></p>
        <a class="btn btn-primary prf-btn" href="/shop">Checkout for pickup</a>
        <p class="prf-basket__note">Order by 2 pm for tomorrow, or by 10 am for same-day pickup after noon.</p>
      </div>
    </div>
    <div class="prf-ticket">
      <div class="prf-ticket__head">
        <p class="prf-ticket__day">Thursday</p>
        <p class="prf-ticket__meta">Updated 6:40 am &middot; prices include tax</p>
      </div>
      <ul class="prf-board__list">${board("7:00", "Country sourdough, 800 g", "38-hour ferment, dark crust, open crumb", VG, "9.00", "country-sourdough", "plenty")}${board("7:00", "Seeded rye tin", "Sunflower, flax and pumpkin seeds", VG, "8.50", "seeded-rye", "plenty")}${board("7:30", "Butter croissant", "Three days from dough to oven", V, "4.25", "butter-croissant", "low")}${board("7:30", "Pain au chocolat", "Two batons of dark chocolate", V, "4.75", "pain-au-chocolat", "low")}${board("8:30", "Cardamom knot", "Swedish-style, pearl sugar", V, "4.75", "cardamom-knot", "out")}${board("9:00", "Rosemary focaccia slab", "Sea salt, good olive oil", VG, "6.50", "rosemary-focaccia", "plenty")}${board("10:00", "Sausage &amp; fennel roll", "Rough puff, local pork", "", "6.75", "sausage-roll", "plenty")}${board("11:00", "Brown butter blondie", "White chocolate, flaky salt", V, "4.00", "blondie", "plenty")}
      </ul>
      <p class="prf-ticket__foot"><abbr class="prf-tag" title="Vegan">VG</abbr> vegan &nbsp; <abbr class="prf-tag" title="Vegetarian">V</abbr> vegetarian &nbsp;&middot;&nbsp; <a class="prf-link" href="/weekly">Full allergen chart</a></p>
    </div>
  </div>
</section>

<section class="prf-specials">
  <div class="prf-wrap">
    <div class="prf-specials__head">
      <div>
        <p class="prf-label">This week only</p>
        <h2 class="prf-h2">Specials worth <em>pre-ordering</em></h2>
      </div>
      <a class="prf-link" href="/weekly">See the whole week &rarr;</a>
    </div>
    <div class="prf-specials__grid">
      <article class="prf-card">
        <figure class="prf-card__img"><img src="${IMG}/croissant-breakfast.webp" alt="Two golden almond croissants on a white plate beside jam and orange juice" width="960" height="640" loading="lazy"><figcaption class="prf-card__day">Sat &amp; Sun</figcaption></figure>
        <div class="prf-card__body">
          <h3>Twice-baked almond croissant</h3>
          <p>Yesterday's croissants, soaked in orange syrup and baked again with frangipane.</p>
          <div class="prf-card__foot"><span class="prf-card__price">$5.25</span><button type="button" class="prf-add" data-nk-cart-add data-nk-id="almond-croissant" data-nk-name="Twice-baked almond croissant" data-nk-price="5.25" aria-label="Add twice-baked almond croissant to your order">Add</button></div>
        </div>
      </article>
      <article class="prf-card prf-card--tilt">
        <figure class="prf-card__img"><img src="${IMG}/seeded-muffins.webp" alt="A basket of pumpkin-seed muffins lined with a green gingham cloth" width="960" height="640" loading="lazy"><figcaption class="prf-card__day">Tue &ndash; Thu</figcaption></figure>
        <div class="prf-card__body">
          <h3>Spelt &amp; pumpkin muffin</h3>
          <p>Wholegrain spelt, roasted squash and toasted pepitas. Not too sweet, very good with coffee.</p>
          <div class="prf-card__foot"><span class="prf-card__price">$3.75</span><button type="button" class="prf-add" data-nk-cart-add data-nk-id="spelt-muffin" data-nk-name="Spelt &amp; pumpkin muffin" data-nk-price="3.75" aria-label="Add spelt and pumpkin muffin to your order">Add</button></div>
        </div>
      </article>
      <article class="prf-card">
        <figure class="prf-card__img"><img src="${IMG}/loaf-board.webp" alt="A round wholemeal loaf with two slices cut on a wooden board" width="960" height="640" loading="lazy"><figcaption class="prf-card__day">Saturday</figcaption></figure>
        <div class="prf-card__body">
          <h3>Porridge oat loaf</h3>
          <p>Oat porridge folded into our levain for a soft, custardy crumb. Pre-order by Friday, 2 pm.</p>
          <div class="prf-card__foot"><span class="prf-card__price">$9.50</span><button type="button" class="prf-add" data-nk-cart-add data-nk-id="porridge-loaf" data-nk-name="Porridge oat loaf" data-nk-price="9.50" aria-label="Add porridge oat loaf to your order">Add</button></div>
        </div>
      </article>
    </div>
  </div>
</section>

<section class="prf-steps">
  <div class="prf-wrap">
    <p class="prf-label">Pickup in three steps</p>
    <h2 class="prf-h2">Skip the Saturday <em>queue</em></h2>
    <ol class="prf-steps__list">
      <li><span class="prf-sticker prf-steps__num">1</span><h3>Pick your bakes</h3><p>Add loaves and pastries online by 2 pm the day before. Same-day orders close at 10 am.</p></li>
      <li><span class="prf-sticker prf-steps__num">2</span><h3>We bake them at dawn</h3><p>Your order is shaped the night before and baked fresh the morning you collect it.</p></li>
      <li><span class="prf-sticker prf-steps__num">3</span><h3>Grab it from the shelf</h3><p>Walk past the line to the pickup shelf by the door, any time until noon. Bring a bag.</p></li>
    </ol>
  </div>
</section>

<section class="prf-cafe">
  <div class="prf-wrap prf-cafe__grid">
    <figure class="prf-cafe__img"><img src="${IMG}/flat-white.webp" alt="A flat white with leaf latte art in a white cup, seen from above" width="520" height="520" loading="lazy"></figure>
    <div>
      <p class="prf-label">At the counter</p>
      <h2 class="prf-h2">Coffee &amp; <em>a little breakfast</em></h2>
      <div class="prf-cafe__menus">
        <div>
          <h3 class="prf-cafe__cat">Coffee</h3>
          <ul class="prf-price">
            <li><span>Espresso</span><span>$3.25</span></li>
            <li><span>Cortado</span><span>$3.75</span></li>
            <li><span>Flat white</span><span>$4.25</span></li>
            <li><span>Filter, refilled once</span><span>$3.50</span></li>
            <li><span>Chai with honey</span><span>$4.50</span></li>
            <li><span>Oat or almond milk</span><span>+$0.60</span></li>
          </ul>
        </div>
        <div>
          <h3 class="prf-cafe__cat">Breakfast, till 11</h3>
          <ul class="prf-price">
            <li><span>Toast, cultured butter &amp; jam</span><span>$5.50</span></li>
            <li><span>Soft eggs on sourdough</span><span>$11.00</span></li>
            <li><span>Granola, yogurt, poached fruit</span><span>$9.00</span></li>
            <li><span>Ham &amp; gruy&egrave;re croissant</span><span>$8.50</span></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="prf-bakers">
  <div class="prf-wrap prf-bakers__grid">
    <div class="prf-bakers__copy">
      <p class="prf-label">Who bakes your bread</p>
      <h2 class="prf-h2">Two bakers, <em>one deck oven</em></h2>
      <p class="prf-lede">In 2019 In&eacute;s Alvarado and Theo Marsh opened Proof with a borrowed mixer and a single oven. The oven is still here, still running from 4 am, and the menu is still written each morning around what the dough is doing.</p>
      <ul class="prf-facts">
        <li><strong>38 hrs</strong>cold ferment for every loaf</li>
        <li><strong>4</strong>flours, all milled in Vermont</li>
        <li><strong>0</strong>bags of pre-mix, ever</li>
      </ul>
    </div>
    <figure class="prf-bakers__img">
      <img src="${IMG}/baker-at-rack.webp" alt="A baker in whites sliding a tray of loaves onto the cooling rack" width="960" height="769" loading="lazy">
      <p class="prf-sticker prf-bakers__sticker"><span>Est.<br><em>2019</em></span></p>
    </figure>
  </div>
</section>

<section class="prf-order">
  <div class="prf-wrap">
    <div class="prf-order__card">
      <div>
        <h2 class="prf-h2">Birthdays, offices &amp; <em>big breakfasts</em></h2>
        <p class="prf-lede">Pastry platters from $48, whole cakes from $42 and bread for your restaurant or cafe. Give us 48 hours and we'll handle the rest.</p>
      </div>
      <div class="prf-order__actions">
        <a class="btn btn-primary prf-btn" href="/shop">Start an order</a>
        <a class="prf-btn prf-btn--ghost" href="mailto:hello@proofbakehouse.com">Email the bakery</a>
      </div>
    </div>
  </div>
</section>

<section class="prf-visit">
  <div class="prf-wrap prf-visit__grid">
    <div>
      <p class="prf-label">Come by</p>
      <h2 class="prf-h2">64 Mercer <em>Street</em></h2>
      <p class="prf-lede">On the corner of Mercer and Pine, two blocks up from the lake. Bike racks out front; free two-hour parking on Pine Street.</p>
      <table class="prf-hours">
        <caption>Opening hours</caption>
        <tbody>
          <tr><th scope="row">Tuesday &ndash; Friday</th><td>7:00 am &ndash; 3:00 pm</td></tr>
          <tr><th scope="row">Saturday &ndash; Sunday</th><td>7:30 am &ndash; 2:00 pm</td></tr>
          <tr><th scope="row">Monday</th><td>Closed</td></tr>
        </tbody>
      </table>
    </div>
    <figure class="prf-visit__img"><img src="${IMG}/bakery-counter.webp" alt="The bakery counter stacked with loaves and pastries while two bakers serve customers" width="960" height="711" loading="lazy"></figure>
  </div>
</section>
${FOOTER}`;

const HOME_CSS = `${BASE_CSS}
/* ---------- Hero ---------- */
.prf-hero{padding:clamp(2.5rem,6vw,5rem) 0 clamp(3rem,7vw,5.5rem)!important;background-color:var(--nk-bg);background-image:radial-gradient(circle at 85% 20%,color-mix(in srgb,var(--nk-accent) 30%,transparent) 0,transparent 42%)}
.prf-hero__grid{display:grid;grid-template-columns:1fr 1.05fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.prf-open{display:inline-flex;align-items:center;gap:.6rem;margin:0 0 1.5rem;padding:.45rem 1rem .45rem .75rem;border-radius:999px;background:var(--nk-surface);border:1px solid var(--nk-border);font-weight:600;font-size:.92rem;color:var(--nk-text)}
.prf-open__dot{width:.6rem;height:.6rem;border-radius:50%;background:var(--nk-primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--nk-primary) 22%,transparent)}
.prf-hero__title{font-family:var(--nk-font-display);font-weight:800;font-size:clamp(3rem,1.6rem + 5.4vw,6.2rem);line-height:.95;letter-spacing:-.03em;word-spacing:.04em;color:var(--nk-text);margin:0 0 1.5rem}
.prf-hero__title em{font-style:italic;font-weight:600;color:var(--nk-primary)}
.prf-hero__actions{display:flex;flex-wrap:wrap;gap:.9rem;margin:2rem 0 1.75rem}
.prf-hero__proof{margin:0;font-size:.95rem;color:var(--nk-text-muted)}
.prf-stars{color:var(--nk-primary);letter-spacing:.1em;margin-right:.35rem}
.prf-hero__art{position:relative;padding:0 0 3rem 3rem}
.prf-hero__photo{margin:0;aspect-ratio:1/1.02;overflow:hidden;border-radius:48% 48% 28px 28px;box-shadow:0 30px 60px -30px color-mix(in srgb,var(--nk-text) 50%,transparent)}
.prf-hero__photo img{width:100%;height:100%;object-fit:cover;object-position:40% 50%}
.prf-hero__sticker{position:absolute;top:8%;left:-.25rem;width:9.5rem;height:9.5rem;font-size:1.15rem;transform:rotate(-10deg)}
.prf-hero__sticker em{display:block;margin-top:.25rem;font-style:italic;font-weight:600;color:var(--nk-primary)}
.prf-hero__cup{position:absolute;left:0;bottom:0;width:38%;margin:0;aspect-ratio:1/1;border-radius:50%;overflow:hidden;border:8px solid var(--nk-bg);box-shadow:0 18px 40px -20px color-mix(in srgb,var(--nk-text) 55%,transparent)}
.prf-hero__cup img{width:100%;height:100%;object-fit:cover}
@media (max-width:991.98px){
  .prf-hero__grid{grid-template-columns:1fr}
  .prf-hero__art{max-width:34rem;margin-inline:auto;width:100%}
}
@media (max-width:575.98px){
  .prf-hero__art{padding:0 0 2rem 1.5rem}
  .prf-hero__sticker{width:7.5rem;height:7.5rem;font-size:.95rem}
}

/* ---------- Ribbon ---------- */
.prf-ribbon-clip{overflow:hidden;padding:1.25rem 0}
.prf-ribbon{overflow:hidden;background:var(--nk-accent);border-block:2px solid var(--nk-text);transform:rotate(-1.2deg);margin:0 -1rem}
.prf-ribbon p{margin:0;padding:.9rem 0;white-space:nowrap;font-family:var(--nk-font-display);font-weight:700;font-size:clamp(1.1rem,.9rem + .8vw,1.6rem);color:var(--nk-text)}
.prf-ribbon span{display:inline-block;margin:0 1.1rem;color:var(--nk-primary)}

/* ---------- Bake board (signature) ---------- */
.prf-board{padding:clamp(4.5rem,9vw,7rem) 0!important}
.prf-board__grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(2rem,5vw,4.5rem);align-items:start}
.prf-basket{margin-top:2rem;padding:1.5rem;border-radius:24px;background:var(--nk-surface-2);border:2px dashed var(--nk-border)}
.prf-basket__title{margin:0 0 .25rem;font-weight:700;color:var(--nk-text)}
.prf-basket__sum{margin:0 0 1rem;font-family:var(--nk-font-display);font-weight:800;font-size:1.6rem;color:var(--nk-text)}
.prf-basket__note{margin:1rem 0 0;font-size:.88rem;color:var(--nk-text-muted)}
.prf-ticket{position:relative;background:var(--nk-surface);border-radius:28px;padding:clamp(1.25rem,3vw,2.25rem);box-shadow:0 24px 50px -30px color-mix(in srgb,var(--nk-text) 45%,transparent);border:1px solid var(--nk-border)}
.prf-ticket__head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:.5rem;padding-bottom:1.1rem;margin-bottom:.4rem;border-bottom:2px dashed var(--nk-border)}
.prf-ticket__day{margin:0;font-family:var(--nk-font-display);font-style:italic;font-weight:700;font-size:2rem;color:var(--nk-text)}
.prf-ticket__meta{margin:0;font-size:.88rem;color:var(--nk-text-muted)}
.prf-board__list{list-style:none;margin:0;padding:0}
.prf-board__row{display:grid;grid-template-columns:3.6rem 1fr auto 4.4rem 4.5rem;gap:.9rem;align-items:center;padding:.85rem 0;border-bottom:1px solid var(--nk-border)}
.prf-board__time{font-variant-numeric:tabular-nums;font-weight:700;color:var(--nk-primary);font-size:.95rem}
.prf-board__name{margin:0;font-weight:700;color:var(--nk-text);font-size:1.02rem}
.prf-board__note{margin:.1rem 0 0;font-size:.88rem;color:var(--nk-text-muted)}
.prf-board__price{font-variant-numeric:tabular-nums;font-weight:700;color:var(--nk-text);text-align:right}
.prf-status{justify-self:start;padding:.2rem .6rem;border-radius:999px;font-size:.74rem;font-weight:700;white-space:nowrap}
.prf-status--plenty{background:color-mix(in srgb,var(--nk-accent) 30%,var(--nk-surface));color:var(--nk-text)}
.prf-status--low{background:color-mix(in srgb,var(--nk-primary) 14%,var(--nk-surface));color:var(--nk-primary-2)}
html[data-theme="dark"] .prf-status--low{color:var(--nk-text)}
.prf-status--out{background:var(--nk-surface-2);color:var(--nk-text-muted);text-decoration:line-through}
.prf-add{display:inline-flex;align-items:center;justify-content:center;min-height:2.5rem;padding:.45rem 1rem;border-radius:999px;border:2px solid var(--nk-text);background:var(--nk-surface);color:var(--nk-text);font-weight:700;font-size:.9rem;cursor:pointer;transition:background-color .15s ease,color .15s ease}
.prf-add:hover{background:var(--nk-text);color:var(--nk-surface)}
.prf-add:disabled{opacity:.7;cursor:default}
.prf-add--out{border-color:transparent;color:var(--nk-text-muted);cursor:default}
.prf-ticket__foot{margin:1.25rem 0 0;font-size:.9rem;color:var(--nk-text-muted)}
@media (max-width:991.98px){.prf-board__grid{grid-template-columns:1fr}}
@media (max-width:575.98px){
  .prf-board__row{grid-template-columns:3rem 1fr auto;grid-template-areas:"time item price" "time status add";row-gap:.5rem}
  .prf-board__time{grid-area:time;align-self:start;padding-top:.15rem}
  .prf-board__item{grid-area:item}
  .prf-board__price{grid-area:price;align-self:start}
  .prf-status{grid-area:status}
  .prf-board__row .prf-add{grid-area:add;justify-self:end}
}

/* ---------- Specials ---------- */
.prf-specials{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-surface-2)}
.prf-specials__head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1rem;margin-bottom:2.5rem}
.prf-specials__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem}
.prf-card{display:flex;flex-direction:column;background:var(--nk-surface);border-radius:28px;overflow:hidden;box-shadow:0 20px 40px -28px color-mix(in srgb,var(--nk-text) 50%,transparent);transition:transform .2s ease}
.prf-card:hover{transform:translateY(-4px) rotate(-.5deg)}
.prf-card--tilt{transform:translateY(1.25rem)}
.prf-card--tilt:hover{transform:translateY(calc(1.25rem - 4px)) rotate(.5deg)}
.prf-card__img{position:relative;margin:0;height:auto;aspect-ratio:4/3;overflow:hidden}
.prf-card__img img{width:100%;height:100%;object-fit:cover}
.prf-card__day{position:absolute;top:1rem;left:1rem;padding:.35rem .8rem;border-radius:999px;background:var(--nk-accent);color:var(--nk-text);font-weight:700;font-size:.82rem}
.prf-card__body{display:flex;flex-direction:column;flex:1;padding:1.4rem 1.5rem 1.5rem}
.prf-card__body h3{font-family:var(--nk-font-display);font-weight:700;font-size:1.45rem;letter-spacing:-.02em;color:var(--nk-text);margin:0 0 .5rem}
.prf-card__body p{color:var(--nk-text-muted);font-size:.97rem;line-height:1.6;margin:0 0 1.25rem}
.prf-card__foot{display:flex;justify-content:space-between;align-items:center;margin-top:auto}
.prf-card__price{font-family:var(--nk-font-display);font-weight:800;font-size:1.5rem;color:var(--nk-text)}
@media (max-width:991.98px){.prf-specials__grid{grid-template-columns:1fr 1fr}.prf-card--tilt{transform:none}.prf-card--tilt:hover{transform:translateY(-4px)}}
@media (max-width:575.98px){.prf-specials__grid{grid-template-columns:1fr}}

/* ---------- Steps ---------- */
.prf-steps{padding:clamp(4.5rem,9vw,7rem) 0!important;text-align:center}
.prf-steps .prf-label{justify-content:center}
.prf-steps__list{list-style:none;margin:3rem 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;counter-reset:none}
.prf-steps__list li{padding:0 1rem}
.prf-steps__num{width:4.5rem;height:4.5rem;font-size:2rem;margin-bottom:1.25rem}
.prf-steps__list li:nth-child(1) .prf-steps__num{transform:rotate(-8deg)}
.prf-steps__list li:nth-child(3) .prf-steps__num{transform:rotate(8deg)}
.prf-steps__list h3{font-family:var(--nk-font-display);font-weight:700;font-size:1.45rem;color:var(--nk-text);margin:0 0 .5rem}
.prf-steps__list p{color:var(--nk-text-muted);margin:0 auto;max-width:22rem}
@media (max-width:767.98px){.prf-steps__list{grid-template-columns:1fr}}

/* ---------- Cafe ---------- */
.prf-cafe{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-surface)}
.prf-cafe__grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.prf-cafe__img{margin:0;height:auto;aspect-ratio:1/1;border-radius:50%;overflow:hidden;box-shadow:0 0 0 12px var(--nk-surface-2)}
.prf-cafe__img img{width:100%;height:100%;object-fit:cover}
.prf-cafe__menus{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:1.5rem}
.prf-cafe__cat{font-size:.85rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-primary);margin:0 0 .75rem}
.prf-price{list-style:none;margin:0;padding:0}
.prf-price li{display:flex;justify-content:space-between;gap:1rem;padding:.55rem 0;border-bottom:1px dashed var(--nk-border);color:var(--nk-text)}
.prf-price li span:last-child{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
@media (max-width:991.98px){.prf-cafe__grid{grid-template-columns:1fr}.prf-cafe__img{max-width:22rem;margin-inline:auto}}
@media (max-width:575.98px){.prf-cafe__menus{grid-template-columns:1fr}}

/* ---------- Bakers ---------- */
.prf-bakers{padding:clamp(4.5rem,9vw,7rem) 0!important}
.prf-bakers__grid{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.prf-facts{list-style:none;margin:2rem 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
.prf-facts li{padding:1.1rem;border-radius:20px;background:var(--nk-surface);border:1px solid var(--nk-border);color:var(--nk-text-muted);font-size:.9rem;line-height:1.4}
.prf-facts strong{display:block;font-family:var(--nk-font-display);font-weight:800;font-size:1.9rem;color:var(--nk-text);letter-spacing:-.03em}
.prf-bakers__img{position:relative;margin:0}
.prf-bakers__img img{width:100%;height:auto;aspect-ratio:4/4.4;object-fit:cover;object-position:8% 50%;border-radius:28px 160px 28px 28px}
.prf-bakers__sticker{position:absolute;right:-.5rem;bottom:1.5rem;width:7rem;height:7rem;font-size:1rem;transform:rotate(9deg)}
.prf-bakers__sticker em{font-style:normal;font-size:1.7rem}
@media (max-width:991.98px){.prf-bakers__grid{grid-template-columns:1fr}.prf-bakers__img{max-width:30rem}}
@media (max-width:575.98px){.prf-facts{grid-template-columns:1fr}.prf-bakers__sticker{right:.5rem}}

/* ---------- Catering ---------- */
.prf-order{padding:0 0 clamp(4.5rem,9vw,7rem)!important}
.prf-order__card{display:grid;grid-template-columns:1.4fr 1fr;gap:2rem;align-items:center;padding:clamp(2rem,5vw,3.5rem);border-radius:32px;background:var(--nk-accent);border:2px solid var(--nk-text)}
.prf-order__card .prf-h2 em{color:var(--nk-text)}
.prf-order__card .prf-lede{color:var(--nk-text)}
.prf-order__actions{display:flex;flex-wrap:wrap;gap:.9rem;justify-content:flex-end}
@media (max-width:767.98px){.prf-order__card{grid-template-columns:1fr}.prf-order__actions{justify-content:flex-start}}

/* ---------- Visit ---------- */
.prf-visit{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-surface-2)}
.prf-visit__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.prf-hours{width:100%;margin-top:1.75rem;border-collapse:separate;border-spacing:0;background:var(--nk-surface);border-radius:20px;overflow:hidden;border:1px solid var(--nk-border)}
.prf-hours caption{caption-side:top;padding:0 0 .6rem;font-weight:700;color:var(--nk-text)}
.prf-hours th,.prf-hours td{padding:.9rem 1.1rem;border-bottom:1px solid var(--nk-border);color:var(--nk-text)}
.prf-hours tr:last-child th,.prf-hours tr:last-child td{border-bottom:0}
.prf-hours th{font-weight:600;text-align:left}
.prf-hours td{text-align:right;font-variant-numeric:tabular-nums}
.prf-visit__img{margin:0}
.prf-visit__img img{width:100%;height:auto;aspect-ratio:4/3.3;object-fit:cover;object-position:40% 100%;border-radius:28px;transform:rotate(1.5deg);box-shadow:0 24px 48px -28px color-mix(in srgb,var(--nk-text) 55%,transparent)}
@media (max-width:991.98px){.prf-visit__grid{grid-template-columns:1fr}}
`;

const allergen = (item: string, g: boolean, d: boolean, e: boolean, n: boolean, s: boolean) => {
  const c = (x: boolean) => (x ? `<td class="prf-yes"><span aria-hidden="true">&#9679;</span><span class="prf-sr">contains</span></td>` : `<td class="prf-no"><span aria-hidden="true">&ndash;</span><span class="prf-sr">free from</span></td>`);
  return `<tr><th scope="row">${item}</th>${c(g)}${c(d)}${c(e)}${c(n)}${c(s)}</tr>`;
};

const WEEK_HTML = `
<section class="prf-week-hero">
  <div class="prf-wrap prf-week-hero__grid">
    <div>
      <p class="prf-label">The week at Proof</p>
      <h1 class="prf-week-hero__title">What's baking, <em>day by day</em></h1>
      <p class="prf-lede">The core loaves and pastries are on every morning. These are the extras: one-day specials we bake in small batches, so pre-ordering is the only sure way to get one.</p>
    </div>
    <figure class="prf-week-hero__img"><img src="${IMG}/rustic-rolls.webp" alt="Flour-dusted rustic rolls piled in a basket" width="960" height="640" fetchpriority="high"></figure>
  </div>
</section>

<section class="prf-days">
  <div class="prf-wrap">
    <ol class="prf-days__grid">
      <li class="prf-day prf-day--closed"><h2>Monday</h2><p class="prf-day__closed">Closed. The ovens are on anyway: we're feeding the starter and laminating dough for the week.</p></li>
      <li class="prf-day"><h2>Tuesday</h2><ul><li><span>Spelt &amp; pumpkin muffin</span><span>$3.75</span></li><li><span>Olive &amp; thyme fougasse</span><span>$7.00</span></li></ul></li>
      <li class="prf-day"><h2>Wednesday</h2><ul><li><span>Cinnamon morning bun</span><span>$4.50</span></li><li><span>Seeded spelt sandwich loaf</span><span>$8.75</span></li></ul></li>
      <li class="prf-day"><h2>Thursday</h2><ul><li><span>Cheddar &amp; chive scone</span><span>$4.25</span></li><li><span>Rye &amp; caraway boule</span><span>$9.00</span></li></ul></li>
      <li class="prf-day prf-day--hot"><h2>Friday</h2><ul><li><span>Pear &amp; frangipane tart, serves 8</span><span>$34.00</span></li><li><span>Challah, plain or seeded</span><span>$10.00</span></li></ul><p class="prf-day__flag">Tarts: order by Wednesday</p></li>
      <li class="prf-day"><h2>Saturday</h2><ul><li><span>Porridge oat loaf</span><span>$9.50</span></li><li><span>Twice-baked almond croissant</span><span>$5.25</span></li><li><span>Morning buns by the box of 6</span><span>$24.00</span></li></ul></li>
      <li class="prf-day"><h2>Sunday</h2><ul><li><span>Twice-baked almond croissant</span><span>$5.25</span></li><li><span>Buttermilk biscuits, pack of 4</span><span>$12.00</span></li></ul></li>
    </ol>
  </div>
</section>

<section class="prf-allergens">
  <div class="prf-wrap">
    <p class="prf-label">Allergen chart</p>
    <h2 class="prf-h2">What's in <em>everything</em></h2>
    <p class="prf-lede">We bake in one small kitchen with shared equipment, so traces of any allergen are possible. If you have a severe allergy, talk to us before ordering.</p>
    <div class="prf-table-scroll" role="region" aria-label="Allergen chart" tabindex="0">
      <table class="prf-allergen-table">
        <thead><tr><th scope="col">Bake</th><th scope="col">Gluten</th><th scope="col">Dairy</th><th scope="col">Egg</th><th scope="col">Nuts</th><th scope="col">Sesame</th></tr></thead>
        <tbody>
          ${allergen("Country sourdough", true, false, false, false, false)}
          ${allergen("Seeded rye tin", true, false, false, false, true)}
          ${allergen("Butter croissant", true, true, true, false, false)}
          ${allergen("Pain au chocolat", true, true, true, false, false)}
          ${allergen("Cardamom knot", true, true, true, false, false)}
          ${allergen("Rosemary focaccia", true, false, false, false, false)}
          ${allergen("Twice-baked almond croissant", true, true, true, true, false)}
          ${allergen("Brown butter blondie", true, true, true, false, false)}
        </tbody>
      </table>
    </div>
    <p class="prf-allergens__key"><span aria-hidden="true">&#9679;</span> contains &nbsp;&middot;&nbsp; <span aria-hidden="true">&ndash;</span> not an ingredient</p>
  </div>
</section>

<section class="prf-bulk">
  <div class="prf-wrap prf-bulk__grid">
    <div class="prf-bulk__card">
      <h2 class="prf-h2">Ordering <em>for a crowd?</em></h2>
      <ul class="prf-bulk__list">
        <li><strong>Up to $60</strong> order by 2 pm the day before</li>
        <li><strong>$60 &ndash; $200</strong> give us 48 hours</li>
        <li><strong>Wholesale</strong> weekly standing orders for cafes and restaurants</li>
      </ul>
      <a class="btn btn-primary prf-btn" href="/shop">Order for pickup</a>
    </div>
    <figure class="prf-bulk__img"><img src="${IMG}/bakery-counter.webp" alt="Shelves of fresh loaves behind the bakery counter" width="960" height="711" loading="lazy"></figure>
  </div>
</section>
${FOOTER}`;

const WEEK_CSS = `${BASE_CSS}
.prf-week-hero{padding:clamp(3rem,7vw,5.5rem) 0 clamp(2rem,5vw,3.5rem)!important}
.prf-week-hero__grid{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(2rem,5vw,4rem);align-items:center}
.prf-week-hero__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:800;font-size:clamp(2.6rem,1.5rem + 4.4vw,5.2rem);line-height:.98;letter-spacing:-.04em;color:var(--nk-text);margin:0 0 1.25rem}
.prf-week-hero__title em{font-style:italic;font-weight:600;color:var(--nk-primary)}
.prf-week-hero__img{margin:0}
.prf-week-hero__img img{width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:160px 28px 28px 28px}
.prf-days{padding:clamp(2rem,5vw,3.5rem) 0 clamp(4rem,8vw,6rem)!important}
.prf-days__grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:1.25rem}
.prf-day{padding:1.5rem;border-radius:24px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.prf-day h2{font-family:var(--nk-font-display);font-weight:800;font-size:1.5rem;letter-spacing:-.02em;color:var(--nk-text);margin:0 0 1rem;padding-bottom:.75rem;border-bottom:2px dashed var(--nk-border)}
.prf-day ul{list-style:none;margin:0;padding:0}
.prf-day li{display:flex;justify-content:space-between;gap:.75rem;padding:.4rem 0;font-size:.95rem;color:var(--nk-text)}
.prf-day li span:last-child{font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}
.prf-day--closed{background:var(--nk-surface-2)}
.prf-day__closed{margin:0;color:var(--nk-text-muted);font-size:.95rem}
.prf-day--hot{background:var(--nk-accent);border-color:var(--nk-text)}
.prf-day--hot h2{border-bottom-color:color-mix(in srgb,var(--nk-text) 30%,transparent)}
.prf-day__flag{margin:.75rem 0 0;font-weight:700;font-size:.88rem;color:var(--nk-text)}
@media (max-width:991.98px){.prf-days__grid{grid-template-columns:1fr 1fr}.prf-week-hero__grid{grid-template-columns:1fr}}
@media (max-width:575.98px){.prf-days__grid{grid-template-columns:1fr}}
.prf-allergens{padding:clamp(4rem,8vw,6rem) 0!important;background:var(--nk-surface-2)}
.prf-table-scroll{position:relative;margin-top:2rem;overflow-x:auto;border-radius:24px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.prf-table-scroll:focus-visible{outline:3px solid var(--nk-accent);outline-offset:3px}
.prf-allergen-table{width:100%;min-width:34rem;border-collapse:collapse}
.prf-allergen-table th,.prf-allergen-table td{padding:.9rem 1rem;text-align:center;border-bottom:1px solid var(--nk-border);color:var(--nk-text)}
.prf-allergen-table thead th{font-size:.8rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--nk-primary);background:var(--nk-surface)}
.prf-allergen-table tbody th{text-align:left;font-weight:600}
.prf-allergen-table tbody tr:last-child th,.prf-allergen-table tbody tr:last-child td{border-bottom:0}
.prf-yes{color:var(--nk-primary)!important;font-size:1.1rem}
.prf-no{color:var(--nk-text-muted)!important}
.prf-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.prf-allergens__key{margin:1rem 0 0;font-size:.9rem;color:var(--nk-text-muted)}
.prf-bulk{padding:clamp(4rem,8vw,6rem) 0!important}
.prf-bulk__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,4rem);align-items:center}
.prf-bulk__card{padding:clamp(2rem,4vw,3rem);border-radius:32px;background:var(--nk-surface);border:2px solid var(--nk-text)}
.prf-bulk__list{list-style:none;margin:1.5rem 0 2rem;padding:0}
.prf-bulk__list li{padding:.8rem 0;border-bottom:1px dashed var(--nk-border);color:var(--nk-text-muted)}
.prf-bulk__list strong{display:block;color:var(--nk-text);font-size:1.05rem}
.prf-bulk__img{margin:0}
.prf-bulk__img img{width:100%;height:auto;aspect-ratio:4/3.3;object-fit:cover;border-radius:28px;transform:rotate(-1.5deg)}
@media (max-width:767.98px){.prf-bulk__grid{grid-template-columns:1fr}}
`;

const template: StarterTemplate = {
  id: "original-food",
  name: "Proof Bakehouse",
  tagline: "Sunny neighbourhood bakery with a live bake board, weekly specials and pickup ordering",
  category: "food",
  tags: ["bakery", "cafe", "coffee", "bread", "pastry", "food", "order online", "pickup", "specials", "cake", "local", "bright"],
  source: "original",
  modules: ["shop"],
  moduleSeeds: {
    shop: {
      products: [
        { name: "Country sourdough, 800 g", description: "38-hour ferment, dark crust, open crumb. Vegan.", price: 9, image_url: `${IMG}/loaf-board.webp`, in_stock: true },
        { name: "Butter croissant", description: "Three days from dough to oven. Best before noon.", price: 4.25, image_url: `${IMG}/croissant-tray.webp`, in_stock: true },
        { name: "Twice-baked almond croissant", description: "Orange syrup and frangipane. Saturdays and Sundays.", price: 5.25, image_url: `${IMG}/croissant-breakfast.webp`, in_stock: true },
        { name: "Spelt & pumpkin muffin", description: "Wholegrain spelt, roasted squash, toasted pepitas.", price: 3.75, image_url: `${IMG}/seeded-muffins.webp`, in_stock: true },
        { name: "Crusty rolls, bag of 6", description: "Our sourdough, rolled small. Great for soups and sandwiches.", price: 7, image_url: `${IMG}/rustic-rolls.webp`, in_stock: true },
        { name: "Morning pastry box for 6", description: "The baker's pick of today's croissants, buns and knots.", price: 24, image_url: `${IMG}/bakery-counter.webp`, in_stock: true },
      ],
    },
  },
  theme: {
    name: "Proof Bakehouse",
    mode: "light",
    primary: "#a6431d",
    primary2: "#8a3616",
    accent: "#f0b93a",
    bg: "#fbf5ea",
    surface: "#ffffff",
    surface2: "#f6ead7",
    border: "#e8d5b8",
    text: "#2a1c13",
    textMuted: "#6b5646",
    font: '"Figtree", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontDisplay: '"Fraunces", Georgia, "Times New Roman", serif',
    googleFonts: ["Fraunces:ital,opsz,wght@0,9..144,600..800;1,9..144,600..700", "Figtree:wght@400;500;600;700;800"],
    radius: "24px",
    radiusSm: "999px",
    dark: {
      name: "Proof Bakehouse (night)",
      mode: "dark",
      primary: "#9c4220",
      primary2: "#8a3a1b",
      accent: "#7a5510",
      bg: "#1c1511",
      surface: "#261d17",
      surface2: "#30251d",
      border: "#46372b",
      text: "#f5ebdd",
      textMuted: "#c3ad98",
      font: '"Figtree", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      fontDisplay: '"Fraunces", Georgia, "Times New Roman", serif',
      googleFonts: ["Fraunces:ital,opsz,wght@0,9..144,600..800;1,9..144,600..700", "Figtree:wght@400;500;600;700;800"],
      radius: "24px",
      radiusSm: "999px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: editorSafe(HOME_CSS) },
    { title: "Weekly Bakes", slug: "weekly", isHome: false, html: WEEK_HTML, css: editorSafe(WEEK_CSS) },
  ],
};

registerTemplate(template);
export default template;
