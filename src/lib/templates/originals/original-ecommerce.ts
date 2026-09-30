/*
 * ART DIRECTION — "Kiln & Co.", a small-batch ceramics studio shop in Asheville, NC
 * Mood ......... a quiet gallery shop: stone-white walls, objects given room, confident type.
 *                Products first; the story second.
 * Type ......... Syne (wide, sculptural display in caps and tight lowercase) + Karla (clean,
 *                friendly body and UI with tabular prices).
 * Palette ...... stone ground, white plinths, near-black ink for buttons and badges, celadon
 *                green for "new" and glaze notes; the product photography supplies the colour.
 * Layout ....... bento-grid hero, square product tiles on white plinths with hairline rules,
 *                uppercase microcopy, a sticky-feeling cart summary bar, generous gutters.
 * Signature .... the shop grid: eight products with glaze, size, price, stock badges and
 *                working "Add to cart" buttons (platform cart) feeding a live cart summary and
 *                checkout on the shop module page, plus three collections. The shop module is
 *                seeded with the same products; the newsletter module handles kiln-drop alerts.
 * Prefix ....... kco-
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
/* ---------- Shared menu: gallery white, caps links, an ink "Shop" pill ---------- */
.nk-nav{position:sticky!important;top:0;z-index:40;background:var(--nk-surface)!important;border-bottom:1px solid var(--nk-border)!important;padding:.8rem 0!important}
.nk-nav .container{width:min(1360px,100% - 2.5rem);max-width:none;padding-inline:0;margin-inline:auto}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-weight:800!important;font-size:1.35rem;letter-spacing:.02em;text-transform:uppercase;color:var(--nk-text)!important}
.nk-nav .nav-link{color:var(--nk-text)!important;font-weight:600!important;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;padding:.55rem .95rem!important}
.nk-nav .nav-link:hover,.nk-nav .nav-link.active{text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:.5em}
.nk-nav .dropdown-menu{background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;border-radius:0}
.nk-nav .dropdown-item{color:var(--nk-text)!important}
.nk-nav .navbar-toggler{position:relative;width:44px;height:40px;padding:0!important;font-size:0;color:var(--nk-text)!important}
.nk-nav .navbar-toggler > span{display:none!important}
.nk-nav .navbar-toggler::before{content:"";position:absolute;left:11px;right:11px;top:50%;height:1.5px;background-color:currentColor;box-shadow:0 -6px 0 currentColor,0 6px 0 currentColor}
.nk-nav .nav-item:has(> a[href$="/studio"]){order:1}
.nk-nav .nav-item:has(> a[href$="/newsletter-join"]){order:2}
.nk-nav .nav-item:has(> a[href$="/shop-shop"]){order:9}
.nk-nav a[href$="/shop-shop"]{background:var(--nk-primary);color:var(--nk-surface)!important;margin-left:.6rem;padding-inline:1.3rem!important;border-radius:999px}
.nk-nav a[href$="/shop-shop"]::after{content:"\\2192";margin-left:.5rem}
.nk-nav a[href$="/shop-shop"]:hover{background:var(--nk-accent);text-decoration:none}
html[data-theme="dark"] .nk-nav a[href$="/shop-shop"]{color:var(--nk-text)!important}
/* Owner tools stay out of the visitor menu; the platform's role-gated "Manage" dropdown is left alone. */
.nk-nav .navbar-nav > li:has(> a[href$="-admin"]),.nk-nav .navbar-nav > li:has(> a[href$="-inbox"]),.nk-nav .navbar-nav > li:has(> a[href$="-orders"]),.nk-nav .navbar-nav > li:has(> a[href$="-subscribers"]){display:none!important}
.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:2px solid var(--nk-text);outline-offset:3px;box-shadow:none}
@media (max-width:991.98px){
  .nk-nav .navbar-collapse{border-top:1px solid var(--nk-border);margin-top:.8rem;padding:.5rem 0 .75rem}
  .nk-nav a[href$="/shop-shop"]{display:inline-block;margin:.5rem 0 0}
}

/* ---------- Foundations ---------- */
.kco-wrap{width:min(1360px,100% - 2.5rem);margin-inline:auto}
.kco-micro{font-size:.76rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-text-muted);margin:0 0 1rem}
.kco-h2{text-wrap:balance;font-family:var(--nk-font-display);font-weight:700;font-size:clamp(2.2rem,1.4rem + 3vw,4rem);line-height:1;letter-spacing:-.035em;color:var(--nk-text);margin:0 0 1rem}
.kco-text{font-size:1.05rem;line-height:1.75;color:var(--nk-text-muted);max-width:36rem;margin:0}
.kco-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:3rem;padding:.75rem 1.5rem;border-radius:999px;font-weight:700;font-size:.95rem;letter-spacing:.02em;text-decoration:none;transition:background-color .15s ease,color .15s ease}
.kco-btn:hover{text-decoration:none}
.kco-btn.btn-primary{box-shadow:none}
.kco-btn--line{border:1.5px solid var(--nk-text);color:var(--nk-text);background:transparent}
.kco-btn--line:hover{background:var(--nk-text);color:var(--nk-surface)}
.kco-link{font-weight:700;color:var(--nk-text);text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:5px}
.kco-link:hover{color:var(--nk-accent)}
.kco-btn:focus-visible,.kco-link:focus-visible,.kco-add:focus-visible,.kco-footer a:focus-visible,.kco-tile:focus-visible{outline:2px solid var(--nk-text);outline-offset:3px}
.kco-num{font-variant-numeric:tabular-nums}

/* ---------- Kiln drop band ---------- */
.kco-drop{padding:clamp(4rem,8vw,6rem) 0!important;background:var(--nk-text);color:var(--nk-bg)}
.kco-drop__grid{display:grid;grid-template-columns:1.2fr 1fr;gap:2.5rem;align-items:center}
.kco-drop .kco-h2{color:var(--nk-bg)}
.kco-drop .kco-micro{color:color-mix(in srgb,var(--nk-bg) 65%,transparent)}
.kco-drop .kco-text{color:color-mix(in srgb,var(--nk-bg) 80%,transparent)}
.kco-drop__actions{display:flex;flex-wrap:wrap;gap:.8rem;justify-content:flex-end}
.kco-drop .kco-btn--light{background:var(--nk-bg);color:var(--nk-text)}
.kco-drop .kco-btn--light:hover{background:var(--nk-surface-2)}
.kco-drop a:focus-visible{outline-color:var(--nk-bg)}
@media (max-width:767.98px){.kco-drop__grid{grid-template-columns:1fr}.kco-drop__actions{justify-content:flex-start}}

/* ---------- Footer ---------- */
.kco-footer{padding:clamp(3.5rem,7vw,5rem) 0 2rem;background:var(--nk-bg);border-top:1px solid var(--nk-border)}
.kco-footer__grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:2.5rem}
.kco-footer .kco-footer__brand{font-family:var(--nk-font-display);font-weight:800;font-size:2.4rem;letter-spacing:-.02em;text-transform:uppercase;line-height:1;color:var(--nk-text);margin:0 0 .75rem}
.kco-footer h2{font-family:var(--nk-font);font-size:.76rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--nk-text);margin:0 0 .85rem}
.kco-footer p,.kco-footer li{font-size:.95rem;line-height:1.75;color:var(--nk-text-muted);margin:0}
.kco-footer ul{list-style:none;margin:0;padding:0}
.kco-footer a{color:var(--nk-text);text-decoration:underline;text-decoration-color:var(--nk-border);text-underline-offset:3px}
.kco-footer a:hover{text-decoration-color:var(--nk-text)}
.kco-footer__base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--nk-border)}
.kco-footer__base p{font-size:.85rem}
@media (max-width:991.98px){.kco-footer__grid{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.kco-footer__grid{grid-template-columns:1fr}}
`;

const FOOTER = `
<footer class="kco-footer">
  <div class="kco-wrap">
    <div class="kco-footer__grid">
      <div>
        <p class="kco-footer__brand">Kiln &amp; Co.</p>
        <p>Small-batch stoneware and porcelain, thrown, glazed and fired in our Asheville studio. Every piece is a little different, which is the point.</p>
      </div>
      <div>
        <h2>Shop</h2>
        <ul>
          <li><a href="/shop">All pottery</a></li>
          <li><a href="#collections">Collections</a></li>
          <li><a href="/join">Kiln-drop alerts</a></li>
        </ul>
      </div>
      <div>
        <h2>Help</h2>
        <ul>
          <li>Free US shipping over $85</li>
          <li>30-day returns, breakages replaced</li>
          <li><a href="mailto:studio@kilnandco.com">studio@kilnandco.com</a></li>
        </ul>
      </div>
      <div>
        <h2>Studio</h2>
        <p>81 Clingman Avenue<br>Asheville, NC 28801<br>Open Fri &amp; Sat, 11 am &ndash; 5 pm</p>
      </div>
    </div>
    <div class="kco-footer__base">
      <p>&copy; 2026 Kiln &amp; Co. Ceramics</p>
      <p>Lead-free glazes &middot; dishwasher and microwave safe unless noted</p>
    </div>
  </div>
</footer>`;

const DROP = `
<section class="kco-drop">
  <div class="kco-wrap kco-drop__grid">
    <div>
      <p class="kco-micro">Next kiln drop &middot; Tuesday, October 14</p>
      <h2 class="kco-h2">Our pieces sell out. Get first pick.</h2>
      <p class="kco-text">We fire in small batches of about 120 pieces. Subscribers get the drop 24 hours early, and one email a month at most.</p>
    </div>
    <div class="kco-drop__actions">
      <a class="kco-btn kco-btn--light" href="/join">Get kiln-drop alerts</a>
    </div>
  </div>
</section>`;

type Product = { id: string; name: string; glaze: string; size: string; price: string; img: string; w: number; h: number; alt: string; badge?: [string, "new" | "low" | "best"]; swatches: string[] };
const PRODUCTS: Product[] = [
  { id: "ridgeline-tumbler", name: "Ridgeline tumbler", glaze: "Raw terracotta", size: "12 oz", price: "32", img: "/media/generated/ecommerce-terracotta-tumblers.webp", w: 1100, h: 1100, alt: "Three ribbed terracotta tumblers on a white shelf", badge: ["Bestseller", "best"], swatches: ["Terracotta", "Ash", "Celadon"] },
  { id: "fog-mug", name: "Fog mug", glaze: "Ash grey satin", size: "11 oz", price: "36", img: "/media/generated/ecommerce-fog-mug.webp", w: 640, h: 640, alt: "A matte grey mug on a window ledge with misty hills behind", swatches: ["Ash", "Bone"] },
  { id: "milk-pitcher", name: "Milk pitcher", glaze: "Porcelain white", size: "24 oz", price: "58", img: "/media/generated/ecommerce-milk-pitcher.webp", w: 640, h: 640, alt: "A white porcelain pitcher holding a sprig of cedar beside a sheer curtain", swatches: ["Bone"] },
  { id: "ridged-planter", name: "Ridged planter", glaze: "Raw terracotta", size: "5 in, with saucer", price: "44", img: "/media/generated/ecommerce-ridged-planter.webp", w: 800, h: 800, alt: "A vertically ridged terracotta planter on its matching saucer", swatches: ["Terracotta"] },
  { id: "dune-bud-vase", name: "Dune bud vase", glaze: "Bone with iron band", size: "7 in", price: "38", img: "/media/generated/ecommerce-bud-vase.webp", w: 800, h: 800, alt: "A cream bud vase with a rust-red band holding dried gypsophila against a green wall", badge: ["3 left", "low"], swatches: ["Bone"] },
  { id: "twin-bud-vases", name: "Twin bud vases", glaze: "Chalk white, set of 2", size: "6 in", price: "46", img: "/media/generated/ecommerce-twin-vases.webp", w: 640, h: 640, alt: "Two slim white bud vases with cherry blossom sprigs on a wooden tray", swatches: ["Bone"] },
  { id: "celadon-bottle-vase", name: "Celadon bottle vase", glaze: "Celadon gloss", size: "9 in", price: "64", img: "/media/generated/ecommerce-celadon-bottles.webp", w: 960, h: 640, alt: "Rows of glossy celadon and sage bottle vases", badge: ["New", "new"], swatches: ["Celadon", "Sage", "Ink"] },
];
const productCard = (p: Product) => `
        <li class="kco-product">
          <figure class="kco-product__img"><img src="${p.img}" alt="${p.alt}" width="${p.w}" height="${p.h}" loading="lazy">${p.badge ? `<figcaption class="kco-badge kco-badge--${p.badge[1]}">${p.badge[0]}</figcaption>` : ""}</figure>
          <div class="kco-product__body">
            <div class="kco-product__row"><h3>${p.name}</h3><p class="kco-product__price kco-num">$${p.price}</p></div>
            <p class="kco-product__meta">${p.glaze} &middot; ${p.size}</p>
            <div class="kco-product__row kco-product__row--end">
              <p class="kco-product__glazes">${p.swatches.length > 1 ? `${p.swatches.length} glazes` : "One glaze"}</p>
              <button type="button" class="kco-add" data-nk-cart-add data-nk-id="${p.id}" data-nk-name="${p.name}" data-nk-price="${p.price}" data-nk-image="${p.img}" aria-label="Add ${p.name} to cart">Add to cart</button>
            </div>
          </div>
        </li>`;

const HOME_HTML = `
<p class="kco-announce"><span>Free US shipping over $85</span><span aria-hidden="true">&#10022;</span><span>Next kiln drop: Tuesday, October 14</span><span aria-hidden="true">&#10022;</span><span>Breakages replaced, no questions</span></p>

<section class="kco-hero">
  <div class="kco-wrap kco-bento">
    <div class="kco-bento__intro">
      <p class="kco-micro">Handmade in Asheville, North Carolina</p>
      <h1 class="kco-hero__title">Pottery for everyday rituals.</h1>
      <p class="kco-text">Mugs, tumblers, vases and pitchers, thrown by hand and fired twice in small batches. Made to be used every day, and to last for decades.</p>
      <div class="kco-hero__actions">
        <a class="btn btn-primary kco-btn" href="#shop">Shop the collection</a>
        <a class="kco-btn kco-btn--line" href="#collections">Browse collections</a>
      </div>
    </div>
    <figure class="kco-bento__main"><img src="/media/generated/ecommerce-terracotta-tumblers.webp" alt="Three ribbed terracotta tumblers on a white shelf" width="1100" height="1100" fetchpriority="high"><figcaption><span>Ridgeline tumbler</span><span class="kco-num">$32</span></figcaption></figure>
    <a class="kco-bento__new kco-tile" href="/studio">
      <img src="/media/generated/ecommerce-studio-shelves.webp" alt="" width="960" height="640">
      <span class="kco-bento__newlabel">Visit the studio &middot; Fri &amp; Sat</span>
    </a>
    <div class="kco-bento__stat">
      <p class="kco-bento__big kco-num">4.9<span>/5</span></p>
      <p>from 2,180 reviews. <span class="kco-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span></p>
    </div>
  </div>
</section>

<section class="kco-shop" id="shop">
  <div class="kco-wrap">
    <div class="kco-shop__head">
      <div>
        <p class="kco-micro">The shop &middot; ${PRODUCTS.length} pieces in stock</p>
        <h2 class="kco-h2">This month's pottery</h2>
      </div>
      <div class="kco-cartbar" aria-live="polite">
        <p><strong>Your cart</strong> <span class="kco-num"><span data-nk-cart-count>0</span> items &middot; $<span data-nk-cart-total>0.00</span></span></p>
        <a class="btn btn-primary kco-btn" href="/shop">Checkout</a>
      </div>
    </div>
    <ul class="kco-grid">${PRODUCTS.map(productCard).join("")}
      <li class="kco-product kco-product--gift">
        <p class="kco-micro">Can't choose?</p>
        <h3>Gift card</h3>
        <p class="kco-text">From $25, delivered by email in a minute and good for two years.</p>
        <button type="button" class="kco-add" data-nk-cart-add data-nk-id="gift-card-50" data-nk-name="Gift card" data-nk-price="50" aria-label="Add a $50 gift card to cart">Add $50 card</button>
      </li>
    </ul>
    <p class="kco-shop__note">Each piece is made by hand, so size and glaze vary a little from the photos. That's the charm, and also why no two sets match exactly.</p>
  </div>
</section>

<section class="kco-collections" id="collections">
  <div class="kco-wrap">
    <p class="kco-micro">Collections</p>
    <div class="kco-collections__grid">
      <a class="kco-col kco-tile" href="#shop"><img src="/media/generated/ecommerce-celadon-bottles.webp" alt="Rows of glossy celadon and sage bottle vases" width="960" height="640" loading="lazy"><span class="kco-col__name">Celadon</span><span class="kco-col__count">6 pieces &middot; new</span></a>
      <a class="kco-col kco-tile" href="#shop"><img src="/media/generated/ecommerce-ridged-planter.webp" alt="A ridged terracotta planter on its saucer" width="800" height="800" loading="lazy"><span class="kco-col__name">Terracotta</span><span class="kco-col__count">9 pieces</span></a>
      <a class="kco-col kco-tile" href="#shop"><img src="/media/generated/ecommerce-milk-pitcher.webp" alt="A white porcelain pitcher with a sprig of cedar" width="640" height="640" loading="lazy"><span class="kco-col__name">Porcelain white</span><span class="kco-col__count">12 pieces</span></a>
    </div>
  </div>
</section>

<section class="kco-made">
  <div class="kco-wrap kco-made__grid">
    <figure class="kco-made__img"><img src="/media/generated/ecommerce-wheel-hands.webp" alt="Clay-covered hands centring a lump of clay on a spinning potter's wheel" width="960" height="640" loading="lazy"></figure>
    <div>
      <p class="kco-micro">How it's made</p>
      <h2 class="kco-h2">Nine days from clay to your cupboard</h2>
      <ol class="kco-steps">
        <li><span class="kco-num">01</span><div><h3>Thrown</h3><p>Every piece starts as a pound of North Carolina stoneware on the wheel.</p></div></li>
        <li><span class="kco-num">02</span><div><h3>Trimmed &amp; dried</h3><p>Four days of slow drying under plastic so nothing cracks.</p></div></li>
        <li><span class="kco-num">03</span><div><h3>Twice fired</h3><p>A bisque firing, then glazes mixed in-house and fired to 2,232&deg;F.</p></div></li>
      </ol>
      <a class="kco-link" href="/studio">Meet the potters</a>
    </div>
  </div>
</section>

<section class="kco-promise">
  <div class="kco-wrap">
    <ul class="kco-promise__list">
      <li><strong>Free shipping</strong><span>on US orders over $85</span></li>
      <li><strong>30-day returns</strong><span>and breakages replaced</span></li>
      <li><strong>Everyday tough</strong><span>dishwasher &amp; microwave safe</span></li>
      <li><strong>Plastic-free</strong><span>packed in paper and wool</span></li>
    </ul>
  </div>
</section>

<section class="kco-reviews">
  <div class="kco-wrap">
    <p class="kco-micro">Reviews</p>
    <h2 class="kco-h2">Used daily, loved for years</h2>
    <ul class="kco-reviews__grid">
      <li><p class="kco-stars" aria-label="5 out of 5">&#9733;&#9733;&#9733;&#9733;&#9733;</p><blockquote><p>&ldquo;The Fog mug holds heat forever and feels perfect in the hand. I bought a second for my partner so we'd stop arguing over it.&rdquo;</p></blockquote><p class="kco-reviews__who">Jordan P. &middot; Fog mug</p></li>
      <li><p class="kco-stars" aria-label="5 out of 5">&#9733;&#9733;&#9733;&#9733;&#9733;</p><blockquote><p>&ldquo;Arrived beautifully packed, no plastic anywhere. The celadon glaze is even prettier in person.&rdquo;</p></blockquote><p class="kco-reviews__who">Amira S. &middot; Celadon bottle vase</p></li>
      <li><p class="kco-stars" aria-label="5 out of 5">&#9733;&#9733;&#9733;&#9733;&#9733;</p><blockquote><p>&ldquo;One tumbler chipped in the post. They sent a replacement the same day without asking for a single photo.&rdquo;</p></blockquote><p class="kco-reviews__who">Luis R. &middot; Ridgeline tumblers</p></li>
    </ul>
  </div>
</section>
${DROP}
${FOOTER}`;

const HOME_CSS = `${BASE_CSS}
/* ---------- Announcement ---------- */
.kco-announce{display:flex;flex-wrap:wrap;justify-content:center;gap:.4rem 1.25rem;margin:0;padding:.65rem 1rem;background:var(--nk-surface-2);font-size:.8rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--nk-text)}
.kco-announce span[aria-hidden]{color:var(--nk-accent)}

/* ---------- Bento hero ---------- */
.kco-hero{padding:clamp(1.5rem,3vw,2.5rem) 0 clamp(3.5rem,7vw,5.5rem)!important}
.kco-bento{display:grid;grid-template-columns:repeat(12,1fr);grid-template-rows:auto auto;gap:1rem}
.kco-bento__intro{grid-column:1 / span 5;grid-row:1 / span 2;display:flex;flex-direction:column;justify-content:center;padding:clamp(2rem,4vw,3.5rem);background:var(--nk-surface)}
.kco-hero__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:700;font-size:clamp(2.8rem,1.5rem + 4.4vw,5.6rem);line-height:.95;letter-spacing:-.05em;color:var(--nk-text);margin:0 0 1.5rem}
.kco-hero__actions{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:2rem}
.kco-bento__main{grid-column:6 / span 4;grid-row:1 / span 2;position:relative;margin:0;overflow:hidden;background:var(--nk-surface);min-height:26rem}
.kco-bento__main img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.kco-bento__main figcaption{position:absolute;left:1rem;right:1rem;bottom:1rem;display:flex;justify-content:space-between;padding:.7rem 1rem;background:var(--nk-surface);font-weight:700;font-size:.92rem;color:var(--nk-text)}
.kco-bento__new{grid-column:10 / span 3;position:relative;display:block;overflow:hidden;min-height:13rem;color:var(--nk-surface);text-decoration:none}
.kco-bento__new img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.kco-bento__new:hover img{transform:scale(1.05)}
.kco-bento__newlabel{position:absolute;left:1rem;bottom:1rem;right:1rem;padding:.55rem .8rem;background:var(--nk-accent);color:var(--nk-surface);font-weight:700;font-size:.85rem;letter-spacing:.04em}
.kco-bento__stat{grid-column:10 / span 3;display:flex;flex-direction:column;justify-content:center;padding:1.5rem;background:var(--nk-text);color:var(--nk-bg)}
.kco-bento__stat p{margin:0;color:color-mix(in srgb,var(--nk-bg) 80%,transparent)}
.kco-bento__big{font-family:var(--nk-font-display);font-weight:700;font-size:3.4rem!important;line-height:1;letter-spacing:-.04em;color:var(--nk-bg)!important}
.kco-bento__big span{font-size:.45em;color:color-mix(in srgb,var(--nk-bg) 60%,transparent)}
.kco-stars{letter-spacing:.12em}
@media (max-width:1099.98px){
  .kco-bento__intro{grid-column:1 / -1;grid-row:auto}
  .kco-bento__main{grid-column:1 / span 7;grid-row:auto}
  .kco-bento__new{grid-column:8 / span 5}
  .kco-bento__stat{grid-column:8 / span 5}
}
@media (max-width:640px){
  .kco-bento__main,.kco-bento__new,.kco-bento__stat{grid-column:1 / -1}
  .kco-bento__main{min-height:22rem}
}

/* ---------- Shop grid (signature) ---------- */
.kco-shop{padding:clamp(4rem,8vw,6rem) 0!important;background:var(--nk-surface-2)}
.kco-shop__head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1.5rem;margin-bottom:2rem}
.kco-shop__head .kco-h2{margin:0}
.kco-cartbar{display:flex;align-items:center;gap:1rem;padding:.6rem .6rem .6rem 1.25rem;background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:999px}
.kco-cartbar p{margin:0;color:var(--nk-text-muted);font-size:.95rem}
.kco-cartbar strong{color:var(--nk-text);margin-right:.4rem}
.kco-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
.kco-product{display:flex;flex-direction:column;background:var(--nk-surface)}
.kco-product__img{position:relative;margin:0;aspect-ratio:1/1;overflow:hidden;background:var(--nk-bg)}
.kco-product__img img{width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
.kco-product:hover .kco-product__img img{transform:scale(1.04)}
.kco-badge{position:absolute;top:.85rem;left:.85rem;padding:.3rem .65rem;font-size:.74rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:var(--nk-surface);color:var(--nk-text)}
.kco-badge--new{background:var(--nk-accent);color:var(--nk-surface)}
.kco-badge--low{background:var(--nk-surface);color:var(--nk-text);box-shadow:inset 0 0 0 1.5px currentColor}
.kco-badge--best{background:var(--nk-text);color:var(--nk-surface)}
.kco-product__body{display:flex;flex-direction:column;gap:.35rem;flex:1;padding:1rem 1.1rem 1.1rem}
.kco-product__row{display:flex;justify-content:space-between;align-items:baseline;gap:.75rem}
.kco-product__row--end{align-items:center;margin-top:auto;padding-top:.6rem}
.kco-product h3{font-family:var(--nk-font);font-weight:700;font-size:1.05rem;letter-spacing:0;color:var(--nk-text);margin:0}
.kco-product__price{margin:0;font-weight:700;font-size:1.05rem;color:var(--nk-text)}
.kco-product__meta{margin:0;font-size:.9rem;color:var(--nk-text-muted)}
.kco-product__glazes{margin:0;font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--nk-accent)}
.kco-add{min-height:2.5rem;padding:.45rem 1rem;border:1.5px solid var(--nk-text);border-radius:999px;background:transparent;color:var(--nk-text);font-weight:700;font-size:.85rem;cursor:pointer;transition:background-color .15s ease,color .15s ease}
.kco-add:hover{background:var(--nk-text);color:var(--nk-surface)}
.kco-add:disabled{opacity:.75;cursor:default}
.kco-product--gift{justify-content:flex-end;padding:1.5rem;background:var(--nk-surface);border:1.5px dashed var(--nk-border)}
.kco-product--gift h3{font-family:var(--nk-font-display);font-size:2rem;letter-spacing:-.03em;margin:0 0 .5rem}
.kco-product--gift .kco-text{font-size:.95rem;margin-bottom:1.25rem}
.kco-product--gift .kco-add{align-self:flex-start}
.kco-shop__note{margin:1.75rem 0 0;max-width:44rem;color:var(--nk-text-muted);font-size:.95rem}
@media (max-width:1099.98px){.kco-grid{grid-template-columns:repeat(3,1fr)}}
@media (max-width:767.98px){.kco-grid{grid-template-columns:1fr 1fr}.kco-cartbar{width:100%;justify-content:space-between}}
@media (max-width:480px){.kco-grid{grid-template-columns:1fr}}

/* ---------- Collections ---------- */
.kco-collections{padding:clamp(4rem,8vw,6rem) 0!important}
.kco-collections__grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:1rem}
.kco-col{position:relative;display:block;aspect-ratio:4/4.6;overflow:hidden;text-decoration:none;color:var(--nk-surface)}
.kco-col:first-child{aspect-ratio:auto}
.kco-col img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
.kco-col:hover img{transform:scale(1.05)}
.kco-col::after{content:"";position:absolute;inset:0;background-image:linear-gradient(0deg,color-mix(in srgb,var(--nk-text) 70%,transparent),transparent 55%)}
.kco-col__name{position:absolute;left:1.25rem;bottom:2.6rem;z-index:1;font-family:var(--nk-font-display);font-weight:700;font-size:clamp(1.6rem,1.2rem + 1.2vw,2.4rem);letter-spacing:-.03em;color:var(--nk-surface)}
.kco-col__count{position:absolute;left:1.25rem;bottom:1.2rem;z-index:1;font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--nk-surface)}
.kco-col:hover{text-decoration:none}
@media (max-width:767.98px){.kco-collections__grid{grid-template-columns:1fr}.kco-col,.kco-col:first-child{aspect-ratio:4/3}}

/* ---------- Made ---------- */
.kco-made{padding:0 0 clamp(4rem,8vw,6rem)!important}
.kco-made__grid{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(2.5rem,5vw,5rem);align-items:center}
.kco-made__img{margin:0}
.kco-made__img img{display:block;width:100%;height:auto;aspect-ratio:4/3.2;object-fit:cover}
.kco-steps{list-style:none;margin:1.5rem 0 2rem;padding:0}
.kco-steps li{display:grid;grid-template-columns:3rem 1fr;gap:1rem;padding:1rem 0;border-top:1px solid var(--nk-border)}
.kco-steps li > span{font-family:var(--nk-font-display);font-weight:700;color:var(--nk-accent)}
.kco-steps h3{font-family:var(--nk-font);font-weight:700;font-size:1.05rem;letter-spacing:0;color:var(--nk-text);margin:0 0 .2rem}
.kco-steps p{margin:0;color:var(--nk-text-muted)}
@media (max-width:991.98px){.kco-made__grid{grid-template-columns:1fr}}

/* ---------- Promise ---------- */
.kco-promise{padding:0!important;border-block:1px solid var(--nk-border);background:var(--nk-surface)}
.kco-promise__list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr)}
.kco-promise__list li{padding:1.5rem 1.25rem;border-left:1px solid var(--nk-border)}
.kco-promise__list li:first-child{border-left:0}
.kco-promise__list strong{display:block;font-family:var(--nk-font-display);font-weight:700;font-size:1.15rem;color:var(--nk-text)}
.kco-promise__list span{color:var(--nk-text-muted);font-size:.93rem}
@media (max-width:767.98px){.kco-promise__list{grid-template-columns:1fr 1fr}.kco-promise__list li:nth-child(3){border-left:0}.kco-promise__list li:nth-child(n+3){border-top:1px solid var(--nk-border)}}

/* ---------- Reviews ---------- */
.kco-reviews{padding:clamp(4rem,8vw,6rem) 0!important}
.kco-reviews__grid{list-style:none;margin:2rem 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
.kco-reviews__grid li{padding:1.75rem;background:var(--nk-surface)}
.kco-reviews__grid .kco-stars{margin:0 0 .75rem;color:var(--nk-text)}
.kco-reviews__grid blockquote{margin:0 0 1rem}
.kco-reviews__grid blockquote p{margin:0;font-size:1.1rem;line-height:1.6;color:var(--nk-text)}
.kco-reviews__who{margin:0;font-size:.85rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--nk-text-muted)}
@media (max-width:991.98px){.kco-reviews__grid{grid-template-columns:1fr}}
`;

const STUDIO_HTML = `
<section class="kco-studio-hero">
  <div class="kco-wrap kco-studio-hero__grid">
    <div>
      <p class="kco-micro">Our studio</p>
      <h1 class="kco-studio-hero__title">Two potters, one kiln, a lot of clay dust.</h1>
      <p class="kco-text">Kiln &amp; Co. began in 2017 with a secondhand wheel in Hana Park's garage. Today it's a small studio in Asheville's River Arts District, where Hana and Theo Marsh throw, glaze and pack every piece themselves.</p>
    </div>
    <figure class="kco-studio-hero__img"><img src="/media/generated/ecommerce-studio-shelves.webp" alt="Studio shelves stacked with unglazed bowls, cups and plates waiting for the kiln" width="960" height="640" fetchpriority="high"></figure>
  </div>
</section>

<section class="kco-numbers">
  <div class="kco-wrap">
    <dl class="kco-numbers__grid">
      <div><dt>Pieces made last year</dt><dd class="kco-num">6,400</dd></div>
      <div><dt>Glazes, all mixed in-house</dt><dd class="kco-num">14</dd></div>
      <div><dt>Firings a month</dt><dd class="kco-num">8</dd></div>
      <div><dt>Miles our clay travels</dt><dd class="kco-num">41</dd></div>
    </dl>
  </div>
</section>

<section class="kco-glazes">
  <div class="kco-wrap">
    <p class="kco-micro">The glaze library</p>
    <h2 class="kco-h2">Four glazes we're known for</h2>
    <ul class="kco-glazes__grid">
      <li><img class="kco-chip" src="/media/generated/ecommerce-celadon-bottles.webp" alt="" width="960" height="640" loading="lazy"><h3>Celadon</h3><p>A glossy sea-green that pools darker in every ridge. Our newest, and already the favourite.</p></li>
      <li><img class="kco-chip kco-chip--ash" src="/media/generated/ecommerce-fog-mug.webp" alt="" width="640" height="640" loading="lazy"><h3>Ash</h3><p>A satin grey made with wood ash from our own fireplace. Warm to hold, hard to chip.</p></li>
      <li><img class="kco-chip" src="/media/generated/ecommerce-milk-pitcher.webp" alt="" width="640" height="640" loading="lazy"><h3>Bone</h3><p>Soft off-white with flecks of iron that bloom in the kiln. Pairs with everything.</p></li>
      <li><img class="kco-chip" src="/media/generated/ecommerce-ridged-planter.webp" alt="" width="800" height="800" loading="lazy"><h3>Raw terracotta</h3><p>Unglazed outside, food-safe glaze inside. Develops a lovely patina over the years.</p></li>
    </ul>
  </div>
</section>

<section class="kco-care">
  <div class="kco-wrap kco-care__grid">
    <figure class="kco-care__img"><img src="/media/generated/ecommerce-wheel-hands.webp" alt="Clay-covered hands centring clay on the potter's wheel" width="960" height="640" loading="lazy"></figure>
    <div>
      <p class="kco-micro">Caring for your pottery</p>
      <h2 class="kco-h2">Made to be used</h2>
      <dl class="kco-care__list">
        <div><dt>Dishwasher</dt><dd>Yes, all glazed pieces. Hand-wash raw terracotta to keep its colour.</dd></div>
        <div><dt>Microwave</dt><dd>Yes. Avoid the oven and sudden temperature changes.</dd></div>
        <div><dt>Plants</dt><dd>Planters have drainage holes and matching saucers.</dd></div>
        <div><dt>Chips</dt><dd>Within 30 days we replace anything that arrives chipped or cracked.</dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="kco-visit">
  <div class="kco-wrap kco-visit__grid">
    <div>
      <p class="kco-micro">Visit</p>
      <h2 class="kco-h2">Come by the studio</h2>
      <p class="kco-text">We open the doors on Fridays and Saturdays. See the kiln, pick seconds at 30% off, and book a Saturday wheel class for two.</p>
    </div>
    <table class="kco-hours">
      <caption>Studio shop hours</caption>
      <tbody>
        <tr><th scope="row">Friday</th><td>11 am &ndash; 5 pm</td></tr>
        <tr><th scope="row">Saturday</th><td>11 am &ndash; 5 pm &middot; wheel class 10 am</td></tr>
        <tr><th scope="row">Sunday &ndash; Thursday</th><td>Closed, making pots</td></tr>
      </tbody>
    </table>
  </div>
</section>
${DROP}
${FOOTER}`;

const STUDIO_CSS = `${BASE_CSS}
.kco-studio-hero{padding:clamp(3.5rem,7vw,5.5rem) 0!important}
.kco-studio-hero__grid{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.kco-studio-hero__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:700;font-size:clamp(2.6rem,1.5rem + 3.8vw,4.8rem);line-height:.98;letter-spacing:-.05em;color:var(--nk-text);margin:0 0 1.5rem}
.kco-studio-hero__img{margin:0}
.kco-studio-hero__img img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}
@media (max-width:991.98px){.kco-studio-hero__grid{grid-template-columns:1fr}}
.kco-numbers{padding:0!important;background:var(--nk-surface);border-block:1px solid var(--nk-border)}
.kco-numbers__grid{display:grid;grid-template-columns:repeat(4,1fr);margin:0}
.kco-numbers__grid div{padding:1.75rem 1.25rem;border-left:1px solid var(--nk-border)}
.kco-numbers__grid div:first-child{border-left:0}
.kco-numbers__grid dt{font-size:.76rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text-muted)}
.kco-numbers__grid dd{margin:.35rem 0 0;font-family:var(--nk-font-display);font-weight:700;font-size:clamp(2.2rem,1.6rem + 2vw,3.4rem);letter-spacing:-.04em;color:var(--nk-text)}
@media (max-width:767.98px){.kco-numbers__grid{grid-template-columns:1fr 1fr}.kco-numbers__grid div:nth-child(3){border-left:0}.kco-numbers__grid div:nth-child(n+3){border-top:1px solid var(--nk-border)}}
.kco-glazes{padding:clamp(4rem,8vw,6rem) 0!important}
.kco-glazes__grid{list-style:none;margin:2rem 0 0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
.kco-glazes__grid li{padding:1.5rem;background:var(--nk-surface)}
.kco-chip{display:block;width:4.5rem;height:4.5rem;border-radius:50%;object-fit:cover;margin-bottom:1.25rem}
.kco-chip--ash{object-position:24% 62%}
.kco-glazes__grid h3{font-family:var(--nk-font-display);font-weight:700;font-size:1.4rem;letter-spacing:-.02em;color:var(--nk-text);margin:0 0 .5rem}
.kco-glazes__grid p{margin:0;color:var(--nk-text-muted);line-height:1.65}
@media (max-width:991.98px){.kco-glazes__grid{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.kco-glazes__grid{grid-template-columns:1fr}}
.kco-care{padding:0 0 clamp(4rem,8vw,6rem)!important}
.kco-care__grid{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(2.5rem,5vw,5rem);align-items:center}
.kco-care__img{margin:0}
.kco-care__img img{display:block;width:100%;height:auto;aspect-ratio:4/3.2;object-fit:cover;filter:grayscale(1)}
.kco-care__list{margin:1.5rem 0 0}
.kco-care__list div{display:grid;grid-template-columns:8rem 1fr;gap:1rem;padding:1rem 0;border-top:1px solid var(--nk-border)}
.kco-care__list dt{font-weight:700;color:var(--nk-text)}
.kco-care__list dd{margin:0;color:var(--nk-text-muted)}
@media (max-width:991.98px){.kco-care__grid{grid-template-columns:1fr}}
@media (max-width:480px){.kco-care__list div{grid-template-columns:1fr;gap:.25rem}}
.kco-visit{padding:clamp(4rem,8vw,6rem) 0!important;background:var(--nk-surface-2)}
.kco-visit__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,4.5rem);align-items:center}
.kco-hours{width:100%;border-collapse:collapse;background:var(--nk-surface)}
.kco-hours caption{caption-side:top;padding:0 0 .75rem;font-size:.76rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text)}
.kco-hours th,.kco-hours td{padding:1rem 1.25rem;border-bottom:1px solid var(--nk-border);text-align:left;color:var(--nk-text)}
.kco-hours tr:last-child th,.kco-hours tr:last-child td{border-bottom:0}
.kco-hours td{color:var(--nk-text-muted)}
@media (max-width:767.98px){.kco-visit__grid{grid-template-columns:1fr}}
`;

const template: StarterTemplate = {
  id: "original-ecommerce",
  name: "Kiln & Co.",
  tagline: "Gallery-style pottery shop with a product grid, cart, collections and kiln-drop alerts",
  category: "ecommerce",
  tags: ["ecommerce", "shop", "online store", "products", "ceramics", "pottery", "homeware", "handmade", "cart", "checkout", "collections", "boutique"],
  source: "original",
  modules: ["shop", "newsletter"],
  moduleSeeds: {
    shop: {
      products: PRODUCTS.map((p) => ({
        name: p.name,
        description: `${p.glaze}, ${p.size}. Thrown by hand in Asheville; every piece varies slightly.`,
        price: Number(p.price),
        image_url: p.img,
        in_stock: true,
      })),
    },
  },
  theme: {
    name: "Kiln & Co.",
    mode: "light",
    primary: "#1d1b18",
    primary2: "#000000",
    accent: "#4a6b5f",
    bg: "#f3f1ec",
    surface: "#ffffff",
    surface2: "#e9e5dd",
    border: "#d9d3c8",
    text: "#1d1b18",
    textMuted: "#625d55",
    font: '"Karla", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontDisplay: '"Syne", ui-sans-serif, system-ui, sans-serif',
    googleFonts: ["Syne:wght@600;700;800", "Karla:ital,wght@0,400;0,500;0,600;0,700;1,400"],
    radius: "0px",
    radiusSm: "999px",
    dark: {
      name: "Kiln & Co. (after hours)",
      mode: "dark",
      primary: "#4a6b5f",
      primary2: "#3e5b50",
      accent: "#8fb5a7",
      bg: "#151412",
      surface: "#1e1c1a",
      surface2: "#282522",
      border: "#3a3632",
      text: "#ece8e1",
      textMuted: "#a8a298",
      font: '"Karla", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      fontDisplay: '"Syne", ui-sans-serif, system-ui, sans-serif',
      googleFonts: ["Syne:wght@600;700;800", "Karla:ital,wght@0,400;0,500;0,600;0,700;1,400"],
      radius: "0px",
      radiusSm: "999px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: editorSafe(HOME_CSS) },
    { title: "Our Studio", slug: "studio", isHome: false, html: STUDIO_HTML, css: editorSafe(STUDIO_CSS) },
  ],
};

registerTemplate(template);
export default template;
