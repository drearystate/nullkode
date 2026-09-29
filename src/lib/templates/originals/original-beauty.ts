/*
 * ART DIRECTION — "Aurelle Skin Studio", a facial and brow studio in East Austin
 * Mood ......... warm, soft and quietly expert: a single-shoot campaign on caramel, espresso ink,
 *                lots of breathing room. Clinical results, spa manners.
 * Type ......... Marcellus (inscriptional flared serif, used for display and small caps labels)
 *                + Mulish (light, airy body).
 * Palette ...... cream-sand ground, espresso text, caramel fields matched to the photo backdrop,
 *                cinnamon for actions.
 * Layout ....... soft editorial: a split hero whose photo fades into a caramel text field,
 *                tall pill-shaped image masks, a printed spa-menu card, hairline dividers and
 *                centred small-caps headings.
 * Signature .... "The treatment menu": facials, peels and brows with durations, prices and
 *                "most booked" markers, plus a Glow Club membership card. Bookings go to the
 *                bookings module; the mailing list to the newsletter module.
 * Prefix ....... aur-
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";

const IMG = "/templates/originals/original-beauty";

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
/* ---------- Shared menu: quiet cream bar, small-caps links, pill "Book" ---------- */
.nk-nav{position:relative;z-index:40;background:var(--nk-bg)!important;border-bottom:1px solid var(--nk-border)!important;padding:.9rem 0!important}
.nk-nav .container{width:min(1240px,100% - 3rem);max-width:none;padding-inline:0;margin-inline:auto}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-weight:400!important;font-size:1.45rem;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text)!important}
.nk-nav .nav-link{font-family:var(--nk-font-display);color:var(--nk-text)!important;font-weight:400!important;font-size:.84rem;letter-spacing:.16em;text-transform:uppercase;padding:.55rem 1rem!important}
.nk-nav .nav-link:hover,.nk-nav .nav-link.active{color:var(--nk-primary)!important;text-decoration:none}
.nk-nav .nav-link.active{box-shadow:inset 0 -1px 0 var(--nk-primary)}
.nk-nav .dropdown-menu{background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;border-radius:14px}
.nk-nav .dropdown-item{color:var(--nk-text)!important}
.nk-nav .navbar-toggler{position:relative;width:44px;height:40px;padding:0!important;font-size:0;color:var(--nk-text)!important}
.nk-nav .navbar-toggler > span{display:none!important}
.nk-nav .navbar-toggler::before{content:"";position:absolute;left:12px;right:12px;top:50%;height:1px;background-color:currentColor;box-shadow:0 -6px 0 currentColor,0 6px 0 currentColor}
.nk-nav .nav-item:has(> a[href$="/treatments"]){order:1}
.nk-nav .nav-item:has(> a[href$="/newsletter-join"]){order:2}
.nk-nav .nav-item:has(> a[href$="/bookings-book"]){order:9}
.nk-nav a[href$="/bookings-book"]{background:var(--nk-text);color:var(--nk-bg)!important;border-radius:999px;margin-left:.6rem;padding-inline:1.35rem!important}
.nk-nav a[href$="/bookings-book"]:hover{background:var(--nk-primary);color:var(--nk-surface)!important}
html[data-theme="dark"] .nk-nav a[href$="/bookings-book"]:hover{color:var(--nk-text)!important}
/* Owner tools stay out of the visitor menu; the platform's role-gated "Manage" dropdown is left alone. */
.nk-nav .navbar-nav > li:has(> a[href$="-admin"]),.nk-nav .navbar-nav > li:has(> a[href$="-inbox"]),.nk-nav .navbar-nav > li:has(> a[href$="-orders"]),.nk-nav .navbar-nav > li:has(> a[href$="-subscribers"]){display:none!important}
.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:2px solid var(--nk-primary);outline-offset:3px;box-shadow:none}
@media (max-width:991.98px){
  .nk-nav .navbar-collapse{margin-top:.8rem;padding:.75rem 0;border-top:1px solid var(--nk-border)}
  .nk-nav a[href$="/bookings-book"]{display:inline-block;margin:.5rem 0 0}
}
@media (max-width:575.98px){.nk-nav .navbar-brand{font-size:1.1rem;letter-spacing:.08em}}

/* ---------- Foundations ---------- */
.aur-wrap{width:min(1240px,100% - 3rem);margin-inline:auto}
.aur-center{text-align:center}
.aur-label{font-family:var(--nk-font-display);font-size:.82rem;letter-spacing:.24em;text-transform:uppercase;color:var(--nk-primary);margin:0 0 1rem}
.aur-h2{text-wrap:balance;font-family:var(--nk-font-display);font-weight:400;font-size:clamp(2.1rem,1.4rem + 2.6vw,3.6rem);line-height:1.1;letter-spacing:-.005em;color:var(--nk-text);margin:0 0 1.1rem}
.aur-text{font-size:1.06rem;line-height:1.8;color:var(--nk-text-muted);margin:0}
.aur-center .aur-text{max-width:38rem;margin-inline:auto}
.aur-btn{display:inline-flex;align-items:center;justify-content:center;min-height:3.15rem;padding:.85rem 1.75rem;border-radius:999px;font-weight:700;font-size:.95rem;letter-spacing:.02em;text-decoration:none;transition:background-color .2s ease,color .2s ease,border-color .2s ease}
.aur-btn:hover{text-decoration:none}
.aur-btn.btn-primary{box-shadow:none}
.aur-btn--line{border:1px solid var(--nk-text);color:var(--nk-text);background:transparent}
.aur-btn--line:hover{background:var(--nk-text);color:var(--nk-bg)}
.aur-link{font-weight:700;color:var(--nk-primary);text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:1px}
.aur-link:hover{color:var(--nk-text)}
.aur-btn:focus-visible,.aur-link:focus-visible,.aur-chip:focus-visible,.aur-footer a:focus-visible{outline:2px solid var(--nk-primary);outline-offset:3px}
.aur-pill{margin:0;overflow:hidden;border-radius:999px}
.aur-pill img{display:block;width:100%;height:100%;object-fit:cover}
.aur-tag{display:inline-block;margin-left:.5rem;padding:.15rem .6rem;border-radius:999px;font-size:.7rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;vertical-align:.15em;background:var(--nk-accent);color:var(--nk-text)}

/* ---------- Newsletter strip ---------- */
.aur-notes{padding:clamp(3.5rem,7vw,5rem) 0!important;background:var(--nk-surface-2)}
.aur-notes__grid{display:grid;grid-template-columns:1.3fr 1fr;gap:2rem;align-items:center}
.aur-notes .aur-h2{font-size:clamp(1.7rem,1.3rem + 1.4vw,2.4rem);margin-bottom:.5rem}
.aur-notes__actions{display:flex;flex-wrap:wrap;gap:.8rem;justify-content:flex-end}
@media (max-width:767.98px){.aur-notes__grid{grid-template-columns:1fr}.aur-notes__actions{justify-content:flex-start}}

/* ---------- Footer ---------- */
.aur-footer{padding:clamp(3.5rem,7vw,5rem) 0 2rem;background:var(--nk-surface);border-top:1px solid var(--nk-border);text-align:center}
.aur-footer .aur-footer__brand{font-family:var(--nk-font-display);font-size:2rem;letter-spacing:.14em;text-transform:uppercase;color:var(--nk-text);margin:0 0 .4rem}
.aur-footer__tag{margin:0 0 2.5rem;color:var(--nk-text-muted)}
.aur-footer__cols{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;max-width:62rem;margin:0 auto;padding:2rem 0;border-block:1px solid var(--nk-border)}
.aur-footer h2{font-family:var(--nk-font-display);font-size:.8rem;font-weight:400;letter-spacing:.22em;text-transform:uppercase;color:var(--nk-primary);margin:0 0 .7rem}
.aur-footer p{font-size:.95rem;line-height:1.75;color:var(--nk-text-muted);margin:0}
.aur-footer a{color:var(--nk-text);text-decoration:underline;text-decoration-color:var(--nk-border);text-underline-offset:3px}
.aur-footer a:hover{color:var(--nk-primary)}
.aur-footer__base{margin:2rem 0 0;font-size:.84rem;color:var(--nk-text-muted)}
@media (max-width:767.98px){.aur-footer__cols{grid-template-columns:1fr}}
`;

const FOOTER = `
<footer class="aur-footer">
  <div class="aur-wrap">
    <p class="aur-footer__brand">Aurelle</p>
    <p class="aur-footer__tag">Skin studio &middot; facials, peels &amp; brows</p>
    <div class="aur-footer__cols">
      <div><h2>Studio</h2><p>1108 E 6th Street, Suite 3<br>Austin, TX 78702</p></div>
      <div><h2>Hours</h2><p>Tue &ndash; Fri 10 am &ndash; 7 pm<br>Sat 9 am &ndash; 4 pm &middot; Sun &amp; Mon closed</p></div>
      <div><h2>Say hello</h2><p><a href="tel:+15125550176">(512) 555-0176</a><br><a href="mailto:hello@aurelleskin.com">hello@aurelleskin.com</a></p></div>
    </div>
    <p class="aur-footer__base">&copy; 2026 Aurelle Skin Studio &middot; All treatments by Texas-licensed estheticians</p>
  </div>
</footer>`;

const NOTES = `
<section class="aur-notes">
  <div class="aur-wrap aur-notes__grid">
    <div>
      <p class="aur-label">Skin notes</p>
      <h2 class="aur-h2">One short email a month</h2>
      <p class="aur-text">Seasonal skin advice from our estheticians, and first pick of last-minute openings. Never more than once a month.</p>
    </div>
    <div class="aur-notes__actions">
      <a class="btn btn-primary aur-btn" href="/join">Join the list</a>
    </div>
  </div>
</section>`;

const menuItem = (name: string, detail: string, mins: string, price: string, tag = "") => `
            <li class="aur-menu__item">
              <p class="aur-menu__row"><span class="aur-menu__name">${name}${tag ? `<span class="aur-tag">${tag}</span>` : ""}</span><span class="aur-menu__mins">${mins}</span><span class="aur-menu__price">$${price}</span></p>
              <p class="aur-menu__detail">${detail}</p>
            </li>`;

const HOME_HTML = `
<section class="aur-hero">
  <div class="aur-hero__grid">
    <figure class="aur-hero__img"><img src="${IMG}/portrait-caramel.webp" alt="A woman with smooth, glowing skin smiling over her shoulder against a warm caramel backdrop" width="960" height="640" fetchpriority="high"></figure>
    <div class="aur-hero__copy">
      <p class="aur-label">Aurelle Skin Studio &middot; East Austin</p>
      <h1 class="aur-hero__title">Skin care that listens first</h1>
      <p class="aur-hero__lede">Facials, peels and brow design by licensed estheticians who start every appointment with ten minutes of questions, not a sales pitch.</p>
      <div class="aur-hero__actions">
        <a class="btn btn-primary aur-btn" href="/book">Book a treatment</a>
        <a class="aur-btn aur-btn--line" href="#menu">See the menu</a>
      </div>
      <p class="aur-hero__trust"><span aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> 4.9 from 870 reviews &middot; Medical-grade products</p>
    </div>
  </div>
</section>

<section class="aur-concerns">
  <div class="aur-wrap aur-concerns__grid">
    <h2 class="aur-concerns__title">Start with what's bothering you</h2>
    <ul class="aur-concerns__list">
      <li><a class="aur-chip" href="/treatments#facials">Breakouts</a></li>
      <li><a class="aur-chip" href="/treatments#facials">Dull, tired skin</a></li>
      <li><a class="aur-chip" href="/treatments#peels">Fine lines</a></li>
      <li><a class="aur-chip" href="/treatments#peels">Dark spots</a></li>
      <li><a class="aur-chip" href="/treatments#facials">Sensitivity &amp; redness</a></li>
      <li><a class="aur-chip" href="/treatments#brows">Brows &amp; lashes</a></li>
    </ul>
  </div>
</section>

<section class="aur-signature">
  <div class="aur-wrap aur-signature__grid">
    <figure class="aur-pill aur-signature__img"><img src="${IMG}/serum-dropper.webp" alt="Close-up of a glass dropper applying serum beneath a woman's eye" width="960" height="640" loading="lazy"></figure>
    <div>
      <p class="aur-label">The signature</p>
      <h2 class="aur-h2">The Aurelle Facial</h2>
      <p class="aur-text">Our most booked treatment and the best place to start. Seventy-five minutes, built around your skin on the day.</p>
      <ol class="aur-steps">
        <li><span>10 min</span><div><h3>Consultation &amp; skin analysis</h3><p>Magnified light, a few honest questions, a plan.</p></div></li>
        <li><span>15 min</span><div><h3>Enzyme exfoliation</h3><p>Pumpkin or papaya enzymes, chosen for your skin type.</p></div></li>
        <li><span>15 min</span><div><h3>Gentle extractions</h3><p>Only where needed, and never rushed.</p></div></li>
        <li><span>20 min</span><div><h3>LED &amp; mask</h3><p>Red light for calm, blue for breakouts.</p></div></li>
        <li><span>15 min</span><div><h3>Sculpting massage</h3><p>Face, neck and shoulders, finished with SPF.</p></div></li>
      </ol>
      <p class="aur-signature__price">75 minutes &middot; <strong>$165</strong></p>
      <a class="btn btn-primary aur-btn" href="/book">Book the Aurelle Facial</a>
    </div>
  </div>
</section>

<section class="aur-menu" id="menu">
  <div class="aur-wrap">
    <div class="aur-center">
      <p class="aur-label">The treatment menu</p>
      <h2 class="aur-h2">Honest prices, no upsells</h2>
      <p class="aur-text">Every facial includes a consultation and a written home-care plan. Prices include all products used.</p>
    </div>
    <div class="aur-menu__card">
      <div class="aur-menu__col">
        <h3 class="aur-menu__cat">Facials</h3>
        <ul class="aur-menu__list">${menuItem("The Aurelle Facial", "Our signature: analysis, enzymes, extractions, LED and massage", "75 min", "165", "Most booked")}${menuItem("Clarifying Facial", "For breakouts and congestion, with a salicylic mask", "60 min", "140")}${menuItem("Calm Facial", "For redness and sensitive skin; fragrance-free throughout", "60 min", "140")}${menuItem("Express Glow", "Cleanse, enzyme, mask and SPF on a lunch break", "30 min", "85")}
        </ul>
      </div>
      <div class="aur-menu__col">
        <h3 class="aur-menu__cat">Peels &amp; skin</h3>
        <ul class="aur-menu__list">${menuItem("Lactic Brightening Peel", "Gentle resurfacing for dullness; little to no downtime", "45 min", "125")}${menuItem("Pigment Peel Series", "Three peels, four weeks apart, for dark spots", "3 &times; 45 min", "375")}${menuItem("Microneedling", "Collagen induction for texture, scars and fine lines", "75 min", "295", "Consult first")}${menuItem("Back Facial", "Deep cleanse and exfoliation for hard-to-reach skin", "50 min", "120")}
        </ul>
      </div>
      <div class="aur-menu__wide">
        <h3 class="aur-menu__cat">Brows &amp; lashes</h3>
        <ul class="aur-menu__list aur-menu__list--three">${menuItem("Brow Design", "Mapping, wax and tweeze", "30 min", "48")}${menuItem("Brow Lamination &amp; Tint", "Brushed-up brows that last six weeks", "50 min", "95")}${menuItem("Lash Lift &amp; Tint", "No extensions, just your lashes, lifted", "60 min", "105")}
        </ul>
      </div>
    </div>
    <p class="aur-menu__foot"><a class="aur-link" href="/treatments">Read every treatment in detail</a></p>
  </div>
</section>

<section class="aur-club">
  <div class="aur-wrap aur-club__grid">
    <div class="aur-club__card">
      <p class="aur-label">Membership</p>
      <h2 class="aur-h2">The Glow Club</h2>
      <p class="aur-club__price"><strong>$110</strong> / month</p>
      <ul class="aur-club__list">
        <li>One 60-minute facial every month (worth $140)</li>
        <li>15% off all home-care products</li>
        <li>A free brow tidy with every visit</li>
        <li>Unused facials roll over for 60 days</li>
      </ul>
      <p class="aur-club__small">Three-month minimum, then cancel any time with 30 days' notice.</p>
      <a class="btn btn-primary aur-btn" href="/book">Start with a consultation</a>
    </div>
    <figure class="aur-pill aur-club__img"><img src="${IMG}/cream-jar.webp" alt="A woman holding an open jar of rich face cream against a caramel backdrop" width="960" height="640" loading="lazy"></figure>
  </div>
</section>

<section class="aur-results">
  <div class="aur-wrap aur-results__grid">
    <figure class="aur-results__img"><img src="${IMG}/glow-smile.webp" alt="A woman laughing as she smooths moisturiser onto her cheek" width="960" height="640" loading="lazy"></figure>
    <div>
      <p class="aur-label">Kind words</p>
      <h2 class="aur-h2">What regulars say</h2>
      <ul class="aur-reviews">
        <li><p>&ldquo;Maya is the first esthetician who has ever told me to use <em>fewer</em> products. My skin has never been calmer.&rdquo;</p><span>Calm Facial &middot; Rachel T.</span></li>
        <li><p>&ldquo;Three pigment peels and the sun spots I've had since college are basically gone. Worth every cent.&rdquo;</p><span>Pigment Peel Series &middot; Dana W.</span></li>
        <li><p>&ldquo;The brow lamination lasted seven weeks. I get asked about it constantly.&rdquo;</p><span>Brow Lamination &middot; Jess M.</span></li>
      </ul>
    </div>
  </div>
</section>

<section class="aur-visit">
  <div class="aur-wrap">
    <div class="aur-center">
      <p class="aur-label">Your first visit</p>
      <h2 class="aur-h2">What to expect</h2>
    </div>
    <ol class="aur-visit__steps">
      <li><span class="aur-visit__n">i</span><h3>Book online</h3><p>Choose a treatment and time. If you're unsure, book the Aurelle Facial; we'll adapt it on the day.</p></li>
      <li><span class="aur-visit__n">ii</span><h3>Fill in a short form</h3><p>Five minutes on medications, allergies and what you'd like to change.</p></li>
      <li><span class="aur-visit__n">iii</span><h3>Arrive bare-faced</h3><p>Come ten minutes early for tea. Skip retinol for three days before any peel.</p></li>
      <li><span class="aur-visit__n">iv</span><h3>Leave with a plan</h3><p>A written routine using products you may already own. No pressure to buy.</p></li>
    </ol>
  </div>
</section>
${NOTES}
${FOOTER}`;

const HOME_CSS = `${BASE_CSS}
/* ---------- Hero: photo fades into a caramel text field ---------- */
.aur-hero{padding:0!important;background:var(--nk-accent)}
.aur-hero__grid{display:grid;grid-template-columns:1.15fr 1fr;align-items:stretch;min-height:640px;min-height:max(620px,calc(100svh - 5rem))}
.aur-hero__img{margin:0;position:relative;overflow:hidden}
.aur-hero__img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:30% 30%;-webkit-mask-image:linear-gradient(90deg,currentColor 62%,transparent 100%);mask-image:linear-gradient(90deg,currentColor 62%,transparent 100%)}
.aur-hero__copy{display:flex;flex-direction:column;justify-content:center;padding:clamp(3rem,6vw,5rem) clamp(1.5rem,5vw,5rem) clamp(3rem,6vw,5rem) clamp(1rem,2vw,2rem);color:var(--nk-text)}
.aur-hero .aur-label{color:var(--nk-text)}
.aur-hero__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:400;font-size:clamp(2.8rem,1.6rem + 4vw,5.2rem);line-height:1.02;color:var(--nk-text);margin:0 0 1.5rem}
.aur-hero__lede{font-size:1.12rem;line-height:1.75;margin:0 0 2rem;max-width:30rem;color:var(--nk-text)}
.aur-hero__actions{display:flex;flex-wrap:wrap;gap:.8rem}
.aur-hero .aur-btn--line{border-color:var(--nk-text)}
.aur-hero__trust{margin:2rem 0 0;font-size:.92rem;color:var(--nk-text)}
.aur-hero__trust span{letter-spacing:.15em;margin-right:.35rem}
@media (max-width:991.98px){
  .aur-hero__grid{grid-template-columns:1fr;min-height:0}
  .aur-hero__img{aspect-ratio:4/3.2}
  .aur-hero__img img{-webkit-mask-image:linear-gradient(180deg,currentColor 70%,transparent 100%);mask-image:linear-gradient(180deg,currentColor 70%,transparent 100%)}
  .aur-hero__copy{padding:1.5rem 1.5rem 3.5rem}
}

/* ---------- Concerns ---------- */
.aur-concerns{padding:clamp(2.5rem,5vw,3.5rem) 0!important;border-bottom:1px solid var(--nk-border)}
.aur-concerns__grid{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1.25rem 2rem}
.aur-concerns__title{font-family:var(--nk-font-display);font-weight:400;font-size:1.4rem;color:var(--nk-text);margin:0}
.aur-concerns__list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem}
.aur-chip{display:inline-flex;align-items:center;min-height:2.6rem;padding:.45rem 1.1rem;border:1px solid var(--nk-border);border-radius:999px;background:var(--nk-surface);color:var(--nk-text);font-weight:600;font-size:.93rem;text-decoration:none;transition:border-color .15s ease,background-color .15s ease}
.aur-chip:hover{border-color:var(--nk-primary);color:var(--nk-primary);text-decoration:none}

/* ---------- Signature facial ---------- */
.aur-signature{padding:clamp(5rem,10vw,8rem) 0!important}
.aur-signature__grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(2.5rem,6vw,6rem);align-items:center}
.aur-signature__img{aspect-ratio:3/4.4;max-width:26rem;width:100%;justify-self:center}
.aur-signature__img img{object-position:20% 40%}
.aur-steps{list-style:none;margin:2rem 0;padding:0}
.aur-steps li{display:grid;grid-template-columns:5rem 1fr;gap:1rem;padding:1rem 0;border-top:1px solid var(--nk-border)}
.aur-steps li:last-child{border-bottom:1px solid var(--nk-border)}
.aur-steps span{font-family:var(--nk-font-display);font-size:.95rem;letter-spacing:.08em;color:var(--nk-primary);padding-top:.15rem}
.aur-steps h3{font-family:var(--nk-font);font-weight:700;font-size:1.02rem;color:var(--nk-text);margin:0 0 .15rem;letter-spacing:0}
.aur-steps p{margin:0;color:var(--nk-text-muted);font-size:.96rem}
.aur-signature__price{font-family:var(--nk-font-display);font-size:1.35rem;color:var(--nk-text);margin:0 0 1.5rem}
.aur-signature__price strong{font-weight:400;font-size:1.6em;color:var(--nk-primary)}
@media (max-width:991.98px){.aur-signature__grid{grid-template-columns:1fr}.aur-signature__img{max-width:18rem}}

/* ---------- Treatment menu (signature) ---------- */
.aur-menu{padding:clamp(5rem,10vw,8rem) 0!important;background:var(--nk-surface-2)}
.aur-menu__card{margin-top:3rem;padding:clamp(1.75rem,4vw,3.5rem);background:var(--nk-surface);border-radius:28px;display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,4.5rem);box-shadow:0 30px 60px -45px color-mix(in srgb,var(--nk-text) 60%,transparent)}
.aur-menu__cat{font-family:var(--nk-font-display);font-weight:400;font-size:.95rem;letter-spacing:.24em;text-transform:uppercase;color:var(--nk-primary);margin:0 0 .5rem;padding-bottom:.75rem;border-bottom:1px solid var(--nk-border)}
.aur-menu__list{list-style:none;margin:0 0 2.25rem;padding:0}
.aur-menu__list:last-child{margin-bottom:0}
.aur-menu__item{padding:1rem 0;border-bottom:1px dotted var(--nk-border)}
.aur-menu__row{display:grid;grid-template-columns:1fr auto auto;gap:1rem;align-items:baseline;margin:0}
.aur-menu__name{font-family:var(--nk-font-display);font-size:1.25rem;color:var(--nk-text)}
.aur-menu__mins{font-size:.88rem;color:var(--nk-text-muted);white-space:nowrap}
.aur-menu__price{font-family:var(--nk-font-display);font-size:1.25rem;color:var(--nk-text);min-width:3.5rem;text-align:right}
.aur-menu__detail{margin:.3rem 0 0;font-size:.93rem;line-height:1.6;color:var(--nk-text-muted);max-width:28rem}
.aur-menu__foot{text-align:center;margin:2.5rem 0 0}
.aur-menu__wide{grid-column:1 / -1}
.aur-menu__list--three{display:grid;grid-template-columns:repeat(3,1fr);column-gap:clamp(1.5rem,3vw,2.5rem)}
@media (max-width:991.98px){.aur-menu__card{grid-template-columns:1fr}.aur-menu__list--three{grid-template-columns:1fr}}
@media (max-width:480px){.aur-menu__row{grid-template-columns:1fr auto}.aur-menu__mins{grid-column:1;grid-row:2}.aur-menu__price{grid-row:1 / span 2}}

/* ---------- Glow Club ---------- */
.aur-club{padding:clamp(5rem,10vw,8rem) 0!important}
.aur-club__grid{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(2.5rem,6vw,6rem);align-items:center}
.aur-club__card{padding:clamp(2rem,4vw,3.25rem);border:1px solid var(--nk-border);border-radius:28px;background:var(--nk-surface)}
.aur-club__price{font-family:var(--nk-font-display);font-size:1.2rem;color:var(--nk-text-muted);margin:0 0 1.5rem}
.aur-club__price strong{font-weight:400;font-size:2.6rem;color:var(--nk-text)}
.aur-club__list{list-style:none;margin:0 0 1.5rem;padding:0}
.aur-club__list li{position:relative;padding:.6rem 0 .6rem 1.75rem;border-bottom:1px solid var(--nk-border);color:var(--nk-text)}
.aur-club__list li::before{content:"\\2713";position:absolute;left:0;top:.6rem;color:var(--nk-primary);font-weight:700}
.aur-club__small{font-size:.88rem;color:var(--nk-text-muted);margin:0 0 1.75rem}
.aur-club__img{aspect-ratio:3/4.2;max-width:24rem;width:100%;justify-self:center}
.aur-club__img img{object-position:40% 50%}
@media (max-width:991.98px){.aur-club__grid{grid-template-columns:1fr}.aur-club__img{order:-1;max-width:16rem}}

/* ---------- Results ---------- */
.aur-results{padding:0 0 clamp(5rem,10vw,8rem)!important}
.aur-results__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2.5rem,6vw,6rem);align-items:center}
.aur-results__img{margin:0;overflow:hidden;border-radius:300px 300px 28px 28px}
.aur-results__img img{display:block;width:100%;height:auto;aspect-ratio:4/4.6;object-fit:cover;object-position:35% 30%}
.aur-reviews{list-style:none;margin:1.5rem 0 0;padding:0}
.aur-reviews li{padding:1.25rem 0;border-top:1px solid var(--nk-border)}
.aur-reviews p{font-family:var(--nk-font-display);font-size:1.25rem;line-height:1.5;color:var(--nk-text);margin:0 0 .5rem}
.aur-reviews span{font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--nk-primary)}
@media (max-width:991.98px){.aur-results__grid{grid-template-columns:1fr}.aur-results__img{max-width:26rem}}

/* ---------- First visit ---------- */
.aur-visit{padding:clamp(5rem,10vw,7rem) 0!important;border-top:1px solid var(--nk-border)}
.aur-visit__steps{list-style:none;margin:3rem 0 0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:2rem;text-align:center}
.aur-visit__n{display:inline-grid;place-items:center;width:3rem;height:3rem;margin-bottom:1rem;border:1px solid var(--nk-primary);border-radius:50%;font-family:var(--nk-font-display);font-size:1rem;color:var(--nk-primary)}
.aur-visit__steps h3{font-family:var(--nk-font-display);font-weight:400;font-size:1.3rem;color:var(--nk-text);margin:0 0 .5rem}
.aur-visit__steps p{margin:0;color:var(--nk-text-muted);font-size:.96rem;line-height:1.7}
@media (max-width:991.98px){.aur-visit__steps{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.aur-visit__steps{grid-template-columns:1fr}}
`;

const treat = (name: string, mins: string, price: string, what: string, forWho: string, downtime: string) => `
        <article class="aur-treat">
          <header><h3>${name}</h3><p class="aur-treat__meta">${mins} &middot; <strong>$${price}</strong></p></header>
          <p>${what}</p>
          <dl>
            <div><dt>Good for</dt><dd>${forWho}</dd></div>
            <div><dt>Downtime</dt><dd>${downtime}</dd></div>
          </dl>
        </article>`;

const TREAT_HTML = `
<section class="aur-thead">
  <div class="aur-wrap aur-thead__grid">
    <div>
      <p class="aur-label">Treatments</p>
      <h1 class="aur-thead__title">Everything we do, explained plainly</h1>
      <p class="aur-text">What happens, who it's for and how you'll look afterwards. If you're still unsure, book a free fifteen-minute consultation and we'll decide together.</p>
      <div class="aur-thead__jump" role="group" aria-label="Jump to a section">
        <a class="aur-chip" href="#facials">Facials</a>
        <a class="aur-chip" href="#peels">Peels &amp; skin</a>
        <a class="aur-chip" href="#brows">Brows &amp; lashes</a>
      </div>
    </div>
    <figure class="aur-pill aur-thead__img"><img src="${IMG}/facial-massage.webp" alt="An esthetician's hands gently massaging a client's temples during a facial" width="960" height="640" fetchpriority="high"></figure>
  </div>
</section>

<section class="aur-tsection" id="facials">
  <div class="aur-wrap">
    <h2 class="aur-tsection__title"><span>01</span> Facials</h2>
    <div class="aur-tgrid">${treat("The Aurelle Facial", "75 min", "165", "Consultation and skin analysis, enzyme exfoliation, gentle extractions, LED light therapy and a sculpting face, neck and shoulder massage.", "First visits, most skin types, a reset before an event", "None; you'll leave glowing")}${treat("Clarifying Facial", "60 min", "140", "A deep cleanse with salicylic acid, thorough extractions and blue LED to calm active breakouts.", "Congestion, blackheads, hormonal breakouts", "Some redness for an hour or two")}${treat("Calm Facial", "60 min", "140", "Cool, fragrance-free and slow. Oat and centella masks, red LED and lymphatic massage to bring redness down.", "Rosacea-prone and reactive skin", "None")}${treat("Express Glow", "30 min", "85", "Cleanse, enzyme, hydrating mask and SPF. The quickest way to look like you slept well.", "Lunch breaks, maintenance between facials", "None")}
    </div>
  </div>
</section>

<section class="aur-tsection aur-tsection--alt" id="peels">
  <div class="aur-wrap aur-tsection__split">
    <div>
      <h2 class="aur-tsection__title"><span>02</span> Peels &amp; skin</h2>
      <div class="aur-tgrid aur-tgrid--one">${treat("Lactic Brightening Peel", "45 min", "125", "A gentle lactic acid peel that lifts dullness and evens tone, finished with a barrier-repair mask.", "Dullness, uneven tone, first-time peels", "Light flaking for 2 &ndash; 3 days")}${treat("Pigment Peel Series", "3 &times; 45 min", "375", "Three progressively stronger peels, four weeks apart, with a home routine to protect results.", "Sun spots, melasma (after consultation)", "3 &ndash; 5 days of peeling each time")}${treat("Microneedling", "75 min", "295", "Fine needles trigger your skin's own collagen repair. Numbing cream included. Consultation required first.", "Acne scars, texture, fine lines", "Pink for 24 &ndash; 48 hours")}
      </div>
    </div>
    <figure class="aur-pill aur-tsection__img"><img src="${IMG}/back-massage.webp" alt="A client relaxing face-down on a treatment bed while an esthetician massages her shoulders" width="960" height="640" loading="lazy"></figure>
  </div>
</section>

<section class="aur-tsection" id="brows">
  <div class="aur-wrap">
    <h2 class="aur-tsection__title"><span>03</span> Brows &amp; lashes</h2>
    <div class="aur-tgrid aur-tgrid--three">${treat("Brow Design", "30 min", "48", "Measured mapping, wax and tweeze to shape brows that suit your face, not a trend.", "Everyone; maintenance every 4 &ndash; 6 weeks", "None")}${treat("Brow Lamination &amp; Tint", "50 min", "95", "Brushed-up, fuller-looking brows that hold their shape for about six weeks.", "Sparse, unruly or downward-growing brows", "Keep dry for 24 hours")}${treat("Lash Lift &amp; Tint", "60 min", "105", "A gentle lift and tint of your natural lashes. No extensions, no glue.", "Straight or light lashes", "Keep dry for 24 hours")}
    </div>
  </div>
</section>

<section class="aur-policies">
  <div class="aur-wrap aur-policies__grid">
    <div>
      <p class="aur-label">Good to know</p>
      <h2 class="aur-h2">Studio policies</h2>
    </div>
    <dl class="aur-policies__list">
      <div><dt>Deposits</dt><dd>A $30 deposit secures every booking and comes off your treatment price.</dd></div>
      <div><dt>Changes</dt><dd>Reschedule or cancel free up to 24 hours before. Later than that, the deposit is kept.</dd></div>
      <div><dt>Patch tests</dt><dd>Required 48 hours before any tint or first peel. They take five minutes and are free.</dd></div>
      <div><dt>Gift cards</dt><dd>Available in any amount at the studio and valid for twelve months.</dd></div>
    </dl>
  </div>
</section>
${NOTES}
${FOOTER}`;

const TREAT_CSS = `${BASE_CSS}
.aur-thead{padding:clamp(4rem,8vw,6rem) 0!important;background:var(--nk-surface-2)}
.aur-thead__grid{display:grid;grid-template-columns:1.25fr .75fr;gap:clamp(2.5rem,6vw,6rem);align-items:center}
.aur-thead__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:400;font-size:clamp(2.6rem,1.5rem + 3.6vw,4.6rem);line-height:1.05;color:var(--nk-text);margin:0 0 1.25rem}
.aur-thead__jump{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.75rem}
.aur-chip{display:inline-flex;align-items:center;min-height:2.6rem;padding:.45rem 1.1rem;border:1px solid var(--nk-border);border-radius:999px;background:var(--nk-surface);color:var(--nk-text);font-weight:600;font-size:.93rem;text-decoration:none}
.aur-chip:hover{border-color:var(--nk-primary);color:var(--nk-primary);text-decoration:none}
.aur-thead__img{aspect-ratio:3/4.2;max-width:22rem;width:100%;justify-self:center}
@media (max-width:991.98px){.aur-thead__grid{grid-template-columns:1fr}.aur-thead__img{max-width:15rem;order:-1}}
.aur-tsection{padding:clamp(4rem,8vw,6rem) 0!important;scroll-margin-top:1rem}
.aur-tsection--alt{background:var(--nk-surface)}
.aur-tsection__title{display:flex;align-items:baseline;gap:1rem;font-family:var(--nk-font-display);font-weight:400;font-size:clamp(2rem,1.5rem + 1.8vw,3rem);color:var(--nk-text);margin:0 0 2rem;padding-bottom:1rem;border-bottom:1px solid var(--nk-border)}
.aur-tsection__title span{font-size:.5em;letter-spacing:.2em;color:var(--nk-primary)}
.aur-tgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
.aur-tgrid--one{grid-template-columns:1fr}
.aur-tgrid--three{grid-template-columns:repeat(3,1fr)}
.aur-treat{padding:1.6rem;border:1px solid var(--nk-border);border-radius:22px;background:var(--nk-surface)}
.aur-tsection--alt .aur-treat{background:var(--nk-bg)}
.aur-treat header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:.5rem 1rem;margin-bottom:.6rem}
.aur-treat h3{font-family:var(--nk-font-display);font-weight:400;font-size:1.45rem;color:var(--nk-text);margin:0}
.aur-treat__meta{margin:0;color:var(--nk-text-muted);font-size:.95rem}
.aur-treat__meta strong{font-family:var(--nk-font-display);font-weight:400;font-size:1.3rem;color:var(--nk-primary)}
.aur-treat > p{margin:0 0 1rem;color:var(--nk-text-muted);line-height:1.7}
.aur-treat dl{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:0;padding-top:1rem;border-top:1px dotted var(--nk-border)}
.aur-treat dt{font-family:var(--nk-font-display);font-weight:400;font-size:.76rem;letter-spacing:.18em;text-transform:uppercase;color:var(--nk-primary);margin-bottom:.2rem}
.aur-treat dd{margin:0;font-size:.93rem;color:var(--nk-text)}
.aur-tsection__split{display:grid;grid-template-columns:1.4fr .6fr;gap:clamp(2rem,5vw,5rem);align-items:start}
.aur-tsection__img{aspect-ratio:3/5;position:sticky;top:6rem}
.aur-tsection__img img{object-position:45% 50%}
@media (max-width:991.98px){.aur-tgrid{grid-template-columns:1fr}.aur-tsection__split{grid-template-columns:1fr}.aur-tsection__img{display:none}}
@media (max-width:480px){.aur-treat dl{grid-template-columns:1fr}}
.aur-policies{padding:clamp(4rem,8vw,6rem) 0!important;border-top:1px solid var(--nk-border)}
.aur-policies__grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(2rem,5vw,5rem)}
.aur-policies__list{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem 2rem}
.aur-policies__list dt{font-family:var(--nk-font-display);font-weight:400;font-size:1.25rem;color:var(--nk-text);margin-bottom:.3rem}
.aur-policies__list dd{margin:0;color:var(--nk-text-muted);line-height:1.7}
@media (max-width:767.98px){.aur-policies__grid,.aur-policies__list{grid-template-columns:1fr}}
`;

const template: StarterTemplate = {
  id: "original-beauty",
  name: "Aurelle Skin Studio",
  tagline: "Warm, editorial skin studio with a priced treatment menu, membership and online booking",
  category: "beauty",
  tags: ["beauty", "salon", "skin care", "facial", "esthetician", "spa", "brows", "lashes", "med spa", "treatments", "booking", "wellness"],
  source: "original",
  modules: ["bookings", "newsletter"],
  theme: {
    name: "Aurelle",
    mode: "light",
    primary: "#8c4f2b",
    primary2: "#74401f",
    accent: "#c3986e",
    bg: "#f6efe7",
    surface: "#fffaf5",
    surface2: "#eadccd",
    border: "#dccab6",
    text: "#2b1d16",
    textMuted: "#6e5a4c",
    font: '"Mulish", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontDisplay: '"Marcellus", "Trajan Pro", Georgia, serif',
    googleFonts: ["Marcellus", "Mulish:wght@400;500;600;700"],
    radius: "22px",
    radiusSm: "999px",
    dark: {
      name: "Aurelle (candlelight)",
      mode: "dark",
      primary: "#9c5a33",
      primary2: "#864b29",
      accent: "#6e4a2e",
      bg: "#1b1411",
      surface: "#241b17",
      surface2: "#2e231d",
      border: "#43342b",
      text: "#f3e9df",
      textMuted: "#bfa996",
      font: '"Mulish", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      fontDisplay: '"Marcellus", "Trajan Pro", Georgia, serif',
      googleFonts: ["Marcellus", "Mulish:wght@400;500;600;700"],
      radius: "22px",
      radiusSm: "999px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: editorSafe(HOME_CSS) },
    { title: "Treatments", slug: "treatments", isHome: false, html: TREAT_HTML, css: editorSafe(TREAT_CSS) },
  ],
};

registerTemplate(template);
export default template;
