/*
 * ART DIRECTION — "Lakeside Family Health", an independent primary-care practice in Madison, WI
 * Mood ......... calm, capable and warm: plain language, generous white space, the lake light
 *                of the clinic photos. Reassuring rather than clinical.
 * Type ......... Lexend (display, designed for reading ease) + Public Sans (the plain, highly
 *                legible public-service face), set large with generous line height.
 * Palette ...... cool white ground, deep lake-blue for actions, a pine green for "accepting",
 *                "same-day" and check-mark signals, soft blue-grey panels, ink for the safety strip.
 * Layout ....... friendly and structured: rounded 18px cards on pale panels, status chips,
 *                a connected three-step booking stepper, portrait cards with overlapping chips,
 *                and a hard safety notice for urgent symptoms.
 * Signature .... the appointment flow: visit types with same-day/booking markers and self-pay
 *                prices, a "next available" slot card, a three-step booking stepper, and
 *                clinicians marked "accepting new patients". Bookings go to the appointments
 *                module (seeded with these services and clinicians); questions to contact-form.
 * Prefix ....... lkh-
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";

const IMG = "/templates/originals/original-health";

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
/* ---------- Shared menu: white, calm, a blue "Book" pill ---------- */
.nk-nav{position:sticky!important;top:0;z-index:40;background:var(--nk-surface)!important;border-bottom:1px solid var(--nk-border)!important;padding:.75rem 0!important;box-shadow:0 6px 20px -18px color-mix(in srgb,var(--nk-text) 60%,transparent)}
.nk-nav .container{width:min(1200px,100% - 2.5rem);max-width:none;padding-inline:0;margin-inline:auto}
.nk-nav .navbar-brand{font-family:var(--nk-font-display)!important;font-weight:600!important;font-size:1.3rem;letter-spacing:-.01em;color:var(--nk-text)!important;display:inline-flex;align-items:center;gap:.6rem}
.nk-nav .navbar-brand::before{content:"";width:1.6rem;height:1.6rem;border-radius:50%;background-image:radial-gradient(circle at 50% 120%,var(--nk-primary) 0 55%,transparent 56%),radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--nk-primary) 18%,var(--nk-surface)) 0 100%)}
.nk-nav .nav-link{color:var(--nk-text)!important;font-weight:600!important;font-size:1rem;padding:.55rem .95rem!important;border-radius:999px}
.nk-nav .nav-link:hover,.nk-nav .nav-link.active{background:var(--nk-surface-2);text-decoration:none}
.nk-nav .dropdown-menu{background:var(--nk-surface)!important;border:1px solid var(--nk-border)!important;border-radius:14px}
.nk-nav .dropdown-item{color:var(--nk-text)!important}
.nk-nav .navbar-toggler{position:relative;width:44px;height:40px;padding:0!important;font-size:0;color:var(--nk-text)!important;border-radius:10px}
.nk-nav .navbar-toggler > span{display:none!important}
.nk-nav .navbar-toggler::before{content:"";position:absolute;left:11px;right:11px;top:50%;height:2px;margin-top:-1px;border-radius:2px;background-color:currentColor;box-shadow:0 -6px 0 currentColor,0 6px 0 currentColor}
.nk-nav .nav-item:has(> a[href$="/services"]){order:1}
.nk-nav .nav-item:has(> a[href$="/contact-form-contact"]){order:2}
.nk-nav .nav-item:has(> a[href$="/appointments-appointments"]){order:9}
.nk-nav a[href$="/appointments-appointments"]{background:var(--nk-primary);color:var(--nk-surface)!important;margin-left:.5rem;padding-inline:1.25rem!important}
.nk-nav a[href$="/appointments-appointments"]:hover{background:var(--nk-primary-2)}
html[data-theme="dark"] .nk-nav a[href$="/appointments-appointments"]{color:var(--nk-text)!important}
/* Owner tools stay out of the visitor menu; the platform's role-gated "Manage" dropdown is left alone. */
.nk-nav .navbar-nav > li:has(> a[href$="-admin"]),.nk-nav .navbar-nav > li:has(> a[href$="-inbox"]),.nk-nav .navbar-nav > li:has(> a[href$="-orders"]),.nk-nav .navbar-nav > li:has(> a[href$="-subscribers"]){display:none!important}
.nk-nav a:focus-visible,.nk-nav button:focus-visible{outline:3px solid var(--nk-primary);outline-offset:2px;box-shadow:none}
@media (max-width:991.98px){
  .nk-nav .navbar-collapse{border-top:1px solid var(--nk-border);margin-top:.75rem;padding:.5rem 0 .75rem}
  .nk-nav a[href$="/appointments-appointments"]{display:inline-block;margin:.5rem 0 0}
}

/* ---------- Foundations ---------- */
.lkh-wrap{width:min(1200px,100% - 2.5rem);margin-inline:auto}
.lkh-eyebrow{font-family:var(--nk-font-display);font-size:.95rem;font-weight:600;color:var(--nk-primary);margin:0 0 .75rem}
.lkh-h2{text-wrap:balance;font-family:var(--nk-font-display);font-weight:600;font-size:clamp(2rem,1.4rem + 2.2vw,3.1rem);line-height:1.12;letter-spacing:-.02em;color:var(--nk-text);margin:0 0 1rem}
.lkh-lede{font-size:1.15rem;line-height:1.7;color:var(--nk-text-muted);max-width:40rem;margin:0}
.lkh-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:3.1rem;padding:.8rem 1.5rem;border-radius:12px;font-weight:700;font-size:1.02rem;text-decoration:none;transition:background-color .15s ease,color .15s ease,box-shadow .15s ease}
.lkh-btn:hover{text-decoration:none}
.lkh-btn.btn-primary{box-shadow:0 8px 20px -12px color-mix(in srgb,var(--nk-primary) 80%,transparent)}
.lkh-btn--soft{background:var(--nk-surface-2);color:var(--nk-primary)}
.lkh-btn--soft:hover{background:color-mix(in srgb,var(--nk-primary) 14%,var(--nk-surface-2));color:var(--nk-primary-2)}
.lkh-link{font-weight:700;color:var(--nk-primary);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}
.lkh-link:hover{color:var(--nk-primary-2)}
.lkh-btn:focus-visible,.lkh-link:focus-visible,.lkh-footer a:focus-visible,.lkh-card a:focus-visible,.lkh-alert a:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.lkh-chip{display:inline-flex;align-items:center;gap:.4rem;padding:.3rem .75rem;border-radius:999px;font-size:.85rem;font-weight:700;background:var(--nk-surface-2);color:var(--nk-text)}
.lkh-chip--ok{background:color-mix(in srgb,var(--nk-accent) 13%,var(--nk-surface));color:var(--nk-accent)}
.lkh-chip--ok::before{content:"";width:.5rem;height:.5rem;border-radius:50%;background:var(--nk-accent)}
.lkh-chip--wait{background:var(--nk-surface-2);color:var(--nk-text-muted)}
.lkh-chip--wait::before{content:"";width:.5rem;height:.5rem;border-radius:50%;border:2px solid currentColor}

/* ---------- Book band ---------- */
.lkh-band{padding:clamp(4rem,8vw,6rem) 0!important}
.lkh-band__box{display:grid;grid-template-columns:1.3fr 1fr;gap:2rem;align-items:center;padding:clamp(2rem,5vw,3.5rem);border-radius:28px;background:var(--nk-primary);color:var(--nk-surface)}
.lkh-band__box .lkh-h2{color:var(--nk-surface)}
.lkh-band__box p{color:color-mix(in srgb,var(--nk-surface) 85%,transparent);margin:0;font-size:1.1rem;line-height:1.7}
.lkh-band__actions{display:flex;flex-wrap:wrap;gap:.8rem;justify-content:flex-end}
.lkh-band__actions .lkh-btn{background:var(--nk-surface);color:var(--nk-primary)}
.lkh-band__actions .lkh-btn:hover{background:var(--nk-surface-2)}
.lkh-band__actions .lkh-btn--outline{background:transparent;color:var(--nk-surface);border:2px solid color-mix(in srgb,var(--nk-surface) 55%,transparent)}
.lkh-band__actions .lkh-btn--outline:hover{background:color-mix(in srgb,var(--nk-surface) 12%,transparent);color:var(--nk-surface)}
.lkh-band a:focus-visible{outline-color:var(--nk-surface)}
html[data-theme="dark"] .lkh-band__box{color:var(--nk-text)}
@media (max-width:767.98px){.lkh-band__box{grid-template-columns:1fr}.lkh-band__actions{justify-content:flex-start}}

/* ---------- Footer ---------- */
.lkh-footer{padding:clamp(3.5rem,7vw,5rem) 0 2rem;background:var(--nk-surface);border-top:1px solid var(--nk-border)}
.lkh-footer__grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:2.5rem}
.lkh-footer .lkh-footer__brand{font-family:var(--nk-font-display);font-weight:600;font-size:1.5rem;color:var(--nk-text);margin:0 0 .6rem}
.lkh-footer h2{font-family:var(--nk-font-display);font-size:1rem;font-weight:600;color:var(--nk-text);margin:0 0 .75rem}
.lkh-footer p,.lkh-footer li{font-size:1rem;line-height:1.7;color:var(--nk-text-muted);margin:0}
.lkh-footer ul{list-style:none;margin:0;padding:0}
.lkh-footer a{color:var(--nk-primary);text-decoration:underline;text-underline-offset:3px}
.lkh-footer__base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--nk-border)}
.lkh-footer__base p{font-size:.9rem;max-width:48rem}
@media (max-width:991.98px){.lkh-footer__grid{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.lkh-footer__grid{grid-template-columns:1fr}}
`;

const FOOTER = `
<footer class="lkh-footer">
  <div class="lkh-wrap">
    <div class="lkh-footer__grid">
      <div>
        <p class="lkh-footer__brand">Lakeside Family Health</p>
        <p>Independent family medicine for newborns to great-grandparents since 2009. Six clinicians, one practice, and time to actually talk.</p>
      </div>
      <div>
        <h2>Visit</h2>
        <p>1820 Lakeshore Drive, Suite 110<br>Madison, WI 53703<br>Free parking &middot; step-free entrance</p>
      </div>
      <div>
        <h2>Call or write</h2>
        <ul>
          <li><a href="tel:+16085550112">(608) 555-0112</a></li>
          <li>After-hours nurse line: <a href="tel:+16085550199">(608) 555-0199</a></li>
          <li><a href="mailto:care@lakesidefamilyhealth.com">care@lakesidefamilyhealth.com</a></li>
        </ul>
      </div>
      <div>
        <h2>Hours</h2>
        <ul>
          <li>Mon &ndash; Thu &middot; 7:30 am &ndash; 6 pm</li>
          <li>Friday &middot; 7:30 am &ndash; 4 pm</li>
          <li>Saturday &middot; 9 am &ndash; noon (sick visits)</li>
        </ul>
      </div>
    </div>
    <div class="lkh-footer__base">
      <p>&copy; 2026 Lakeside Family Health, S.C. This website is for general information and does not replace medical advice. In an emergency, call 911.</p>
    </div>
  </div>
</footer>`;

const BAND = `
<section class="lkh-band">
  <div class="lkh-wrap">
    <div class="lkh-band__box">
      <div>
        <h2 class="lkh-h2">New here? Your first visit takes two minutes to book.</h2>
        <p>We're welcoming new patients of all ages. Bring your insurance card and a list of medicines; we'll take care of the rest, including transferring your records.</p>
      </div>
      <div class="lkh-band__actions">
        <a class="lkh-btn" href="/appointments">Book a first visit</a>
        <a class="lkh-btn lkh-btn--outline" href="tel:+16085550112">(608) 555-0112</a>
      </div>
    </div>
  </div>
</section>`;

type Doc = { img: string; w: number; h: number; alt: string; name: string; cred: string; focus: string; langs: string; status: "ok" | "wait"; statusText: string };
const DOCS: Doc[] = [
  { img: "dr-hartley.webp", w: 360, h: 450, alt: "Portrait of Dr. Margaret Hartley smiling, wearing glasses and a white coat", name: "Dr. Margaret Hartley", cred: "MD, Family Medicine", focus: "Women's health, menopause care, preventive medicine", langs: "English", status: "wait", statusText: "Waitlist for new patients" },
  { img: "dr-okafor.webp", w: 400, h: 500, alt: "Portrait of Dr. Daniel Okafor in a white coat with a stethoscope and tablet", name: "Dr. Daniel Okafor", cred: "MD, Family Medicine", focus: "Chronic conditions, sports injuries, men's health", langs: "English, Yoruba", status: "ok", statusText: "Accepting new patients" },
  { img: "np-lindqvist.webp", w: 400, h: 500, alt: "Portrait of nurse practitioner Emma Lindqvist smiling while reading a tablet", name: "Emma Lindqvist", cred: "DNP, Family Nurse Practitioner", focus: "Children and teens, same-day sick visits, vaccines", langs: "English, Swedish", status: "ok", statusText: "Accepting new patients" },
  { img: "dr-aldana.webp", w: 360, h: 450, alt: "Portrait of Dr. Victor Aldana, a senior physician with a white beard, mid-conversation", name: "Dr. Victor Aldana", cred: "MD, Internal Medicine", focus: "Older adults, heart health, diabetes management", langs: "English, Spanish", status: "ok", statusText: "Accepting new patients" },
];

const docCard = (d: Doc) => `
      <article class="lkh-doc">
        <figure class="lkh-doc__img"><img src="${IMG}/${d.img}" alt="${d.alt}" width="${d.w}" height="${d.h}" loading="lazy"><figcaption class="lkh-chip lkh-chip--${d.status}">${d.statusText}</figcaption></figure>
        <h3>${d.name}</h3>
        <p class="lkh-doc__cred">${d.cred}</p>
        <p class="lkh-doc__focus">${d.focus}</p>
        <p class="lkh-doc__langs"><span>Speaks</span> ${d.langs}</p>
      </article>`;

type Visit = { name: string; what: string; mins: string; price: string; when: "same" | "book" | "tele" };
const VISITS: Visit[] = [
  { name: "Sick visit", what: "Fevers, coughs, rashes, infections, sprains", mins: "20 min", price: "95", when: "same" },
  { name: "Annual physical", what: "Head-to-toe check, screenings and a plan for the year", mins: "40 min", price: "210", when: "book" },
  { name: "Child &amp; teen check-up", what: "Growth, development, school and sports forms", mins: "30 min", price: "160", when: "book" },
  { name: "Chronic care review", what: "Diabetes, blood pressure, asthma, thyroid", mins: "30 min", price: "140", when: "book" },
  { name: "Mental health check-in", what: "Anxiety, low mood, sleep; referrals when needed", mins: "30 min", price: "120", when: "tele" },
  { name: "Vaccines &amp; travel", what: "Flu, COVID-19, childhood and travel vaccines", mins: "15 min", price: "35", when: "same" },
];
const whenLabel = { same: "Same-day", book: "Book ahead", tele: "Video or in person" };

const visitCard = (v: Visit) => `
        <li class="lkh-visit">
          <span class="lkh-visit__when lkh-visit__when--${v.when}">${whenLabel[v.when]}</span>
          <h3>${v.name}</h3>
          <p>${v.what}</p>
          <p class="lkh-visit__meta"><span>${v.mins}</span><span>Self-pay from <strong>$${v.price}</strong></span></p>
        </li>`;

const HOME_HTML = `
<section class="lkh-hero">
  <div class="lkh-wrap lkh-hero__grid">
    <div class="lkh-hero__copy">
      <p class="lkh-chip lkh-chip--ok">Accepting new patients of all ages</p>
      <h1 class="lkh-hero__title">Unhurried care for your whole family.</h1>
      <p class="lkh-lede">Family doctors and nurse practitioners who know your name, answer messages the same day and book real appointments, not five-minute ones. Same-day sick visits every weekday.</p>
      <div class="lkh-hero__actions">
        <a class="btn btn-primary lkh-btn" href="/appointments">Book an appointment</a>
        <a class="lkh-btn lkh-btn--soft" href="#visits">See visit types &amp; prices</a>
      </div>
      <ul class="lkh-hero__trust">
        <li><strong>4.9</strong> average from 1,340 patient reviews</li>
        <li><strong>6 min</strong> average wait in the lobby</li>
        <li><strong>Most insurance</strong> plus clear self-pay prices</li>
      </ul>
    </div>
    <div class="lkh-hero__media">
      <figure class="lkh-hero__img"><img src="${IMG}/caring-hands.webp" alt="A smiling older woman holding hands with a nurse during a visit" width="960" height="640" fetchpriority="high"></figure>
      <div class="lkh-slot">
        <p class="lkh-slot__label">Next available</p>
        <p class="lkh-slot__time">Today, 3:40 pm</p>
        <p class="lkh-slot__who">Sick visit with Emma Lindqvist, DNP</p>
        <a class="lkh-link" href="/appointments">Book this time</a>
      </div>
    </div>
  </div>
</section>

<aside class="lkh-alert" aria-label="Urgent symptoms">
  <div class="lkh-wrap lkh-alert__row">
    <p><strong>Chest pain, trouble breathing or signs of a stroke?</strong> Don't book online. Call <a href="tel:911">911</a> now.</p>
    <p>Worried after hours? Our nurse line answers 24/7: <a href="tel:+16085550199">(608) 555-0199</a></p>
  </div>
</aside>

<section class="lkh-visits" id="visits">
  <div class="lkh-wrap">
    <div class="lkh-visits__head">
      <div>
        <p class="lkh-eyebrow">Visit types</p>
        <h2 class="lkh-h2">What would you like to come in for?</h2>
      </div>
      <p class="lkh-lede">Most visits are covered by insurance. If you're paying yourself, these are the prices you'll see on the bill, with no facility fees.</p>
    </div>
    <ul class="lkh-visits__grid">${VISITS.map(visitCard).join("")}
    </ul>
    <p class="lkh-visits__foot">Lab tests are drawn on site. <a class="lkh-link" href="/services">See every service and what it costs</a></p>
  </div>
</section>

<section class="lkh-flow">
  <div class="lkh-wrap">
    <div class="lkh-flow__head">
      <p class="lkh-eyebrow">Booking online</p>
      <h2 class="lkh-h2">Three steps, about two minutes</h2>
    </div>
    <ol class="lkh-steps">
      <li><span class="lkh-steps__n">1</span><h3>Choose a visit type</h3><p>Tell us what's going on in a sentence. Not sure which visit? Pick "Sick visit" and we'll sort it out.</p></li>
      <li><span class="lkh-steps__n">2</span><h3>Pick a clinician and time</h3><p>See real openings for today and the next two weeks, in person or by video.</p></li>
      <li><span class="lkh-steps__n">3</span><h3>Confirm and check in</h3><p>You'll get a text confirmation and a secure link to fill in forms before you arrive.</p></li>
    </ol>
    <div class="lkh-flow__cta">
      <a class="btn btn-primary lkh-btn" href="/appointments">Start booking</a>
      <p>Prefer to talk? Call <a class="lkh-link" href="tel:+16085550112">(608) 555-0112</a>, weekdays from 7:30 am.</p>
    </div>
  </div>
</section>

<section class="lkh-docs">
  <div class="lkh-wrap">
    <div class="lkh-docs__head">
      <div>
        <p class="lkh-eyebrow">Your care team</p>
        <h2 class="lkh-h2">Clinicians who stay</h2>
      </div>
      <p class="lkh-lede">Our clinicians have been here eleven years on average, so you see the same person who knows your history.</p>
    </div>
    <div class="lkh-docs__grid">${DOCS.map(docCard).join("")}
    </div>
  </div>
</section>

<section class="lkh-first">
  <div class="lkh-wrap lkh-first__grid">
    <figure class="lkh-first__img"><img src="${IMG}/consultation.webp" alt="A physician listening to a patient across a desk while a nurse reviews notes" width="960" height="640" loading="lazy"></figure>
    <div>
      <p class="lkh-eyebrow">Your first visit</p>
      <h2 class="lkh-h2">Forty minutes, just for getting to know you</h2>
      <ul class="lkh-checklist">
        <li>A full history, not a rushed checklist</li>
        <li>Your medicines reviewed and simplified where possible</li>
        <li>Records requested from your previous doctor, by us</li>
        <li>A written plan you can read in the patient portal</li>
      </ul>
      <a class="lkh-link" href="/services">What to bring to your first visit</a>
    </div>
  </div>
</section>

<section class="lkh-trust">
  <div class="lkh-wrap">
    <dl class="lkh-trust__stats">
      <div><dt>Board-certified clinicians</dt><dd>6</dd></div>
      <div><dt>Messages answered the same day</dt><dd>94%</dd></div>
      <div><dt>Patients who'd recommend us</dt><dd>97%</dd></div>
      <div><dt>Years caring for Madison families</dt><dd>17</dd></div>
    </dl>
    <div class="lkh-trust__grid">
      <div class="lkh-trust__card">
        <h3>Insurance we accept</h3>
        <ul class="lkh-checklist lkh-checklist--tight">
          <li>Most major PPO and HMO plans</li>
          <li>Medicare and Medicare Advantage</li>
          <li>Wisconsin BadgerCare Plus</li>
          <li>Health savings accounts (HSA/FSA)</li>
        </ul>
        <p class="lkh-trust__note">Not sure about your plan? Call us with your member ID and we'll check before you book.</p>
      </div>
      <blockquote class="lkh-quote">
        <p>&ldquo;Dr. Okafor spent forty minutes with my dad and caught a medication problem three specialists had missed. The whole team treats him like family.&rdquo;</p>
        <footer>Laura M., patient since 2018</footer>
      </blockquote>
    </div>
  </div>
</section>
${BAND}
${FOOTER}`;

const HOME_CSS = `${BASE_CSS}
/* ---------- Hero ---------- */
.lkh-hero{padding:clamp(3rem,6vw,5rem) 0 clamp(3.5rem,7vw,5.5rem)!important;background-color:var(--nk-bg);background-image:radial-gradient(circle at 92% 8%,color-mix(in srgb,var(--nk-primary) 10%,transparent) 0,transparent 40%)}
.lkh-hero__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2.5rem,5vw,4.5rem);align-items:center}
.lkh-hero__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:600;font-size:clamp(2.6rem,1.6rem + 3.6vw,4.6rem);line-height:1.06;letter-spacing:-.035em;color:var(--nk-text);margin:1.25rem 0 1.25rem}
.lkh-hero__actions{display:flex;flex-wrap:wrap;gap:.8rem;margin:2rem 0}
.lkh-hero__trust{list-style:none;margin:0;padding:1.25rem 0 0;display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;border-top:1px solid var(--nk-border)}
.lkh-hero__trust li{font-size:.92rem;line-height:1.45;color:var(--nk-text-muted)}
.lkh-hero__trust strong{display:block;font-family:var(--nk-font-display);font-size:1.3rem;font-weight:600;color:var(--nk-text)}
.lkh-hero__media{position:relative;padding-bottom:3rem}
.lkh-hero__img{margin:0;border-radius:28px;overflow:hidden;box-shadow:0 30px 60px -35px color-mix(in srgb,var(--nk-text) 60%,transparent)}
.lkh-hero__img img{display:block;width:100%;height:auto;aspect-ratio:5/4.3;object-fit:cover;object-position:35% 50%}
.lkh-slot{position:absolute;left:-2rem;bottom:0;width:min(19rem,85%);padding:1.25rem 1.35rem;border-radius:18px;background:var(--nk-surface);border:1px solid var(--nk-border);box-shadow:0 20px 40px -25px color-mix(in srgb,var(--nk-text) 55%,transparent)}
.lkh-slot__label{margin:0;font-size:.85rem;font-weight:700;color:var(--nk-accent)}
.lkh-slot__time{margin:.1rem 0;font-family:var(--nk-font-display);font-weight:600;font-size:1.5rem;color:var(--nk-text)}
.lkh-slot__who{margin:0 0 .75rem;color:var(--nk-text-muted);font-size:.95rem}
@media (max-width:991.98px){.lkh-hero__grid{grid-template-columns:1fr}.lkh-slot{left:1rem}}
@media (max-width:575.98px){.lkh-hero__trust{grid-template-columns:1fr}}

/* ---------- Urgent notice ---------- */
.lkh-alert{background:var(--nk-text);color:var(--nk-surface)}
.lkh-alert__row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.5rem 2rem;padding:1rem 0}
.lkh-alert p{margin:0;font-size:1rem;color:var(--nk-surface)}
.lkh-alert strong{color:var(--nk-surface)}
.lkh-alert a{color:var(--nk-surface);font-weight:700;text-decoration:underline;text-underline-offset:3px}
.lkh-alert a:focus-visible{outline-color:var(--nk-surface)}

/* ---------- Visit types (signature) ---------- */
.lkh-visits{padding:clamp(4.5rem,9vw,7rem) 0!important}
.lkh-visits__head{display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:end;margin-bottom:2.5rem}
.lkh-visits__head .lkh-h2{margin:0}
.lkh-visits__grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem}
.lkh-visit{display:flex;flex-direction:column;padding:1.5rem;border-radius:18px;background:var(--nk-surface);border:1px solid var(--nk-border);transition:border-color .15s ease,box-shadow .15s ease}
.lkh-visit:hover{border-color:color-mix(in srgb,var(--nk-primary) 40%,var(--nk-border));box-shadow:0 18px 36px -28px color-mix(in srgb,var(--nk-primary) 70%,transparent)}
.lkh-visit__when{align-self:flex-start;margin-bottom:1rem;padding:.25rem .7rem;border-radius:999px;font-size:.82rem;font-weight:700;background:var(--nk-surface-2);color:var(--nk-primary)}
.lkh-visit__when--same{background:color-mix(in srgb,var(--nk-accent) 13%,var(--nk-surface));color:var(--nk-accent)}
.lkh-visit__when--tele{background:transparent;color:var(--nk-primary);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--nk-primary) 45%,transparent)}
.lkh-visit h3{font-family:var(--nk-font-display);font-weight:600;font-size:1.35rem;color:var(--nk-text);margin:0 0 .4rem}
.lkh-visit p{margin:0 0 1rem;color:var(--nk-text-muted);line-height:1.6}
.lkh-visit__meta{display:flex;justify-content:space-between;gap:1rem;margin:auto 0 0!important;padding-top:1rem;border-top:1px dashed var(--nk-border);font-size:.95rem}
.lkh-visit__meta strong{color:var(--nk-text);font-size:1.1rem}
.lkh-visits__foot{margin:2rem 0 0;color:var(--nk-text-muted)}
@media (max-width:991.98px){.lkh-visits__head{grid-template-columns:1fr}.lkh-visits__grid{grid-template-columns:1fr 1fr}}
@media (max-width:575.98px){.lkh-visits__grid{grid-template-columns:1fr}}

/* ---------- Booking stepper ---------- */
.lkh-flow{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-surface-2)}
.lkh-flow__head{text-align:center;margin-bottom:3rem}
.lkh-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;position:relative}
.lkh-steps::before{content:"";position:absolute;top:1.75rem;left:16%;right:16%;height:2px;background-image:linear-gradient(90deg,var(--nk-primary) 0 50%,transparent 50%);background-size:14px 2px}
.lkh-steps li{position:relative;text-align:center;padding:0 1rem}
.lkh-steps__n{position:relative;display:inline-grid;place-items:center;width:3.5rem;height:3.5rem;margin-bottom:1.25rem;border-radius:50%;background:var(--nk-primary);color:var(--nk-surface);font-family:var(--nk-font-display);font-weight:600;font-size:1.35rem;box-shadow:0 0 0 8px var(--nk-surface-2)}
.lkh-steps h3{font-family:var(--nk-font-display);font-weight:600;font-size:1.3rem;color:var(--nk-text);margin:0 0 .5rem}
.lkh-steps p{margin:0 auto;max-width:20rem;color:var(--nk-text-muted);line-height:1.6}
.lkh-flow__cta{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:1rem 1.5rem;margin-top:3rem}
.lkh-flow__cta p{margin:0;color:var(--nk-text-muted)}
@media (max-width:767.98px){.lkh-steps{grid-template-columns:1fr;gap:2rem}.lkh-steps::before{display:none}}

/* ---------- Clinicians ---------- */
.lkh-docs{padding:clamp(4.5rem,9vw,7rem) 0!important}
.lkh-docs__head{display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:end;margin-bottom:2.5rem}
.lkh-docs__head .lkh-h2{margin:0}
.lkh-docs__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem}
.lkh-doc__img{position:relative;margin:0 0 1.5rem}
.lkh-doc__img img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;border-radius:18px}
.lkh-doc__img figcaption{position:absolute;left:.75rem;bottom:-.9rem;box-shadow:0 8px 18px -10px color-mix(in srgb,var(--nk-text) 60%,transparent);background-color:var(--nk-surface)}
.lkh-doc h3{font-family:var(--nk-font-display);font-weight:600;font-size:1.25rem;color:var(--nk-text);margin:0}
.lkh-doc__cred{margin:.15rem 0 .6rem;font-weight:700;color:var(--nk-primary);font-size:.95rem}
.lkh-doc__focus{margin:0 0 .5rem;color:var(--nk-text-muted);line-height:1.55}
.lkh-doc__langs{margin:0;font-size:.92rem;color:var(--nk-text)}
.lkh-doc__langs span{color:var(--nk-text-muted)}
@media (max-width:991.98px){.lkh-docs__head{grid-template-columns:1fr}.lkh-docs__grid{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.lkh-docs__grid{grid-template-columns:1fr}}

/* ---------- First visit ---------- */
.lkh-first{padding:0 0 clamp(4.5rem,9vw,7rem)!important}
.lkh-first__grid{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(2.5rem,5vw,4.5rem);align-items:center;padding:clamp(1.25rem,3vw,2rem);border-radius:28px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.lkh-first__img{margin:0;border-radius:20px;overflow:hidden}
.lkh-first__img img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}
.lkh-checklist{list-style:none;margin:1rem 0 1.5rem;padding:0}
.lkh-checklist li{position:relative;padding:.55rem 0 .55rem 2.1rem;color:var(--nk-text);line-height:1.5}
.lkh-checklist li::before{content:"\\2713";position:absolute;left:0;top:.5rem;display:grid;place-items:center;width:1.45rem;height:1.45rem;border-radius:50%;font-size:.8rem;font-weight:700;background:color-mix(in srgb,var(--nk-accent) 14%,var(--nk-surface));color:var(--nk-accent)}
.lkh-checklist--tight{margin-bottom:1rem}
@media (max-width:991.98px){.lkh-first__grid{grid-template-columns:1fr}}

/* ---------- Trust ---------- */
.lkh-trust{padding:clamp(4.5rem,9vw,7rem) 0!important;background:var(--nk-surface-2)}
.lkh-trust__stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin:0 0 2.5rem}
.lkh-trust__stats div{padding:1.25rem 1.4rem;border-radius:18px;background:var(--nk-surface)}
.lkh-trust__stats dt{font-size:.92rem;color:var(--nk-text-muted);font-weight:400}
.lkh-trust__stats dd{margin:.2rem 0 0;font-family:var(--nk-font-display);font-weight:600;font-size:2.4rem;letter-spacing:-.03em;color:var(--nk-primary)}
.lkh-trust__grid{display:grid;grid-template-columns:1fr 1.2fr;gap:1.5rem}
.lkh-trust__card{padding:1.75rem;border-radius:18px;background:var(--nk-surface)}
.lkh-trust__card h3{font-family:var(--nk-font-display);font-weight:600;font-size:1.3rem;color:var(--nk-text);margin:0}
.lkh-trust__note{margin:0;color:var(--nk-text-muted);font-size:.95rem}
.lkh-quote{margin:0;padding:2rem;border-radius:18px;background:var(--nk-surface);display:flex;flex-direction:column;justify-content:center}
.lkh-quote p{font-family:var(--nk-font-display);font-weight:500;font-size:clamp(1.3rem,1.1rem + .7vw,1.7rem);line-height:1.45;color:var(--nk-text);margin:0 0 1rem}
.lkh-quote footer{font-weight:700;color:var(--nk-text-muted)}
@media (max-width:991.98px){.lkh-trust__stats{grid-template-columns:1fr 1fr}.lkh-trust__grid{grid-template-columns:1fr}}
`;

const svc = (name: string, what: string, covered: string, price: string) => `
          <tr><th scope="row"><span class="lkh-svc__name">${name}</span><span class="lkh-svc__what">${what}</span></th><td>${covered}</td><td class="lkh-svc__price">${price}</td></tr>`;

const SERVICES_HTML = `
<section class="lkh-shead">
  <div class="lkh-wrap lkh-shead__grid">
    <div>
      <p class="lkh-eyebrow">Services &amp; fees</p>
      <h1 class="lkh-shead__title">Everything we do, and what it costs</h1>
      <p class="lkh-lede">Clear answers before you arrive. Insurance covers most visits; if you're paying yourself, these are our full prices with no facility fees or surprise bills.</p>
    </div>
    <figure class="lkh-shead__img"><img src="${IMG}/care-team.webp" alt="A physician and two nurses discussing a patient chart beside a window" width="960" height="640" fetchpriority="high"></figure>
  </div>
</section>

<section class="lkh-svc">
  <div class="lkh-wrap">
    <h2 class="lkh-h2">Visits &amp; care</h2>
    <div class="lkh-table-wrap" role="region" aria-label="Services and self-pay prices" tabindex="0">
      <table class="lkh-table">
        <thead><tr><th scope="col">Service</th><th scope="col">Usually covered by insurance?</th><th scope="col">Self-pay price</th></tr></thead>
        <tbody>${svc("Sick visit", "Same-day, 20 minutes, in person or video", "Yes, copay applies", "$95")}${svc("Annual physical", "Screenings, labs ordered, a plan for the year", "Yes, usually no copay", "$210")}${svc("Child &amp; teen check-up", "Growth, development, vaccines, forms", "Yes, usually no copay", "$160")}${svc("Chronic care review", "Diabetes, blood pressure, thyroid, asthma", "Yes, copay applies", "$140")}${svc("Mental health check-in", "Screening, support, referrals", "Yes, copay applies", "$120")}${svc("Minor procedures", "Stitches, wart and skin tag removal, ear wash", "Often", "from $85")}${svc("Vaccines", "Flu, COVID-19, tetanus, travel", "Yes", "from $35")}${svc("On-site lab draw", "Results in your portal, usually in 1 &ndash; 2 days", "Yes", "$18 + lab fee")}
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="lkh-bring">
  <div class="lkh-wrap lkh-bring__grid">
    <div>
      <p class="lkh-eyebrow">Before your first visit</p>
      <h2 class="lkh-h2">What to bring</h2>
      <ul class="lkh-checklist">
        <li>Photo ID and your insurance card</li>
        <li>Every medicine and supplement you take, or photos of the labels</li>
        <li>Your previous doctor's name; we'll request your records</li>
        <li>Questions you want answered, written down</li>
      </ul>
    </div>
    <figure class="lkh-bring__img"><img src="${IMG}/stethoscope.webp" alt="A blue stethoscope beside a laptop on a white desk" width="960" height="613" loading="lazy"></figure>
  </div>
</section>

<section class="lkh-faq">
  <div class="lkh-wrap lkh-faq__grid">
    <div>
      <p class="lkh-eyebrow">Good to know</p>
      <h2 class="lkh-h2">Questions patients ask</h2>
      <p class="lkh-lede">Can't find your answer? <a class="lkh-link" href="/contact">Send us a message</a> and a nurse will reply within one working day.</p>
    </div>
    <div class="lkh-faq__list">
      <details open><summary>Do you see children?</summary><p>Yes, from newborns. Emma Lindqvist and Dr. Okafor see most of our children and teens, and we keep same-day slots for sick kids every weekday.</p></details>
      <details><summary>Can I get a same-day appointment?</summary><p>Usually. We hold sick-visit slots every morning and afternoon. Book online from 7 am or call us; video visits are often available within the hour.</p></details>
      <details><summary>How do prescription refills work?</summary><p>Request refills in the patient portal or ask your pharmacy to send a request. We process them within two working days.</p></details>
      <details><summary>What if I can't pay my bill in full?</summary><p>Talk to us. We offer interest-free payment plans and a sliding-scale discount based on household income.</p></details>
      <details><summary>Do you offer telehealth?</summary><p>Yes, for sick visits, mental health check-ins, medication reviews and most follow-ups. You'll get a secure link by text.</p></details>
    </div>
  </div>
</section>
${BAND}
${FOOTER}`;

const SERVICES_CSS = `${BASE_CSS}
.lkh-shead{padding:clamp(3.5rem,7vw,5.5rem) 0 clamp(2rem,4vw,3rem)!important}
.lkh-shead__grid{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(2rem,5vw,4.5rem);align-items:center}
.lkh-shead__title{text-wrap:balance;font-family:var(--nk-font-display);font-weight:600;font-size:clamp(2.5rem,1.6rem + 3vw,4rem);line-height:1.08;letter-spacing:-.035em;color:var(--nk-text);margin:0 0 1.25rem}
.lkh-shead__img{margin:0;border-radius:28px;overflow:hidden}
.lkh-shead__img img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}
@media (max-width:991.98px){.lkh-shead__grid{grid-template-columns:1fr}}
.lkh-svc{padding:clamp(3rem,6vw,4.5rem) 0!important}
.lkh-table-wrap{position:relative;overflow-x:auto;margin-top:1.5rem;border-radius:18px;border:1px solid var(--nk-border);background:var(--nk-surface)}
.lkh-table-wrap:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.lkh-table{width:100%;min-width:40rem;border-collapse:collapse}
.lkh-table th,.lkh-table td{padding:1.1rem 1.25rem;border-bottom:1px solid var(--nk-border);text-align:left;vertical-align:top;color:var(--nk-text)}
.lkh-table thead th{font-family:var(--nk-font-display);font-weight:600;font-size:.95rem;background:var(--nk-surface-2);color:var(--nk-text)}
.lkh-table tbody tr:last-child th,.lkh-table tbody tr:last-child td{border-bottom:0}
.lkh-svc__name{display:block;font-weight:700}
.lkh-svc__what{display:block;font-weight:400;font-size:.93rem;color:var(--nk-text-muted);margin-top:.15rem}
.lkh-table td{color:var(--nk-text-muted)}
.lkh-table .lkh-svc__price{font-weight:700;color:var(--nk-text);white-space:nowrap}
.lkh-bring{padding:clamp(3rem,6vw,4.5rem) 0!important}
.lkh-bring__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,4.5rem);align-items:center;padding:clamp(1.5rem,4vw,2.5rem);border-radius:28px;background:var(--nk-surface-2)}
.lkh-bring__img{margin:0;border-radius:20px;overflow:hidden}
.lkh-bring__img img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}
.lkh-checklist{list-style:none;margin:1rem 0 0;padding:0}
.lkh-checklist li{position:relative;padding:.55rem 0 .55rem 2.1rem;color:var(--nk-text);line-height:1.5}
.lkh-checklist li::before{content:"\\2713";position:absolute;left:0;top:.5rem;display:grid;place-items:center;width:1.45rem;height:1.45rem;border-radius:50%;font-size:.8rem;font-weight:700;background:color-mix(in srgb,var(--nk-accent) 14%,var(--nk-surface));color:var(--nk-accent)}
@media (max-width:991.98px){.lkh-bring__grid{grid-template-columns:1fr}}
.lkh-faq{padding:clamp(3.5rem,7vw,5rem) 0!important}
.lkh-faq__grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(2rem,5vw,4.5rem)}
.lkh-faq__list details{margin-bottom:.75rem;padding:1.1rem 1.25rem;border-radius:14px;background:var(--nk-surface);border:1px solid var(--nk-border)}
.lkh-faq__list summary{font-family:var(--nk-font-display);font-weight:600;font-size:1.1rem;color:var(--nk-text)}
.lkh-faq__list summary:focus-visible{outline:3px solid var(--nk-primary);outline-offset:3px}
.lkh-faq__list p{margin:.75rem 0 0;color:var(--nk-text-muted);line-height:1.7}
@media (max-width:991.98px){.lkh-faq__grid{grid-template-columns:1fr}}
`;

const template: StarterTemplate = {
  id: "original-health",
  name: "Lakeside Family Health",
  tagline: "Calm family practice site with visit types and prices, clinician profiles and online appointments",
  category: "health",
  tags: ["health", "clinic", "doctor", "medical", "family medicine", "primary care", "healthcare", "appointments", "nurse practitioner", "pediatrics", "telehealth", "practice"],
  source: "original",
  modules: ["appointments", "contact-form"],
  moduleSeeds: {
    appointments: {
      services: [
        { name: "Sick visit", duration_minutes: 20, price: 95, description: "Same-day care for fevers, coughs, rashes, infections and sprains." },
        { name: "Annual physical", duration_minutes: 40, price: 210, description: "A head-to-toe check, screenings and a plan for the year ahead." },
        { name: "Child & teen check-up", duration_minutes: 30, price: 160, description: "Growth and development, vaccines, school and sports forms." },
        { name: "Chronic care review", duration_minutes: 30, price: 140, description: "Diabetes, blood pressure, thyroid and asthma follow-ups." },
        { name: "Mental health check-in", duration_minutes: 30, price: 120, description: "Screening and support for anxiety, low mood and sleep." },
        { name: "Vaccines & travel", duration_minutes: 15, price: 35, description: "Flu, COVID-19, childhood and travel vaccines." },
      ],
      providers: [
        { name: "Dr. Margaret Hartley", role: "MD, Family Medicine" },
        { name: "Dr. Daniel Okafor", role: "MD, Family Medicine" },
        { name: "Emma Lindqvist", role: "DNP, Family Nurse Practitioner" },
        { name: "Dr. Victor Aldana", role: "MD, Internal Medicine" },
      ],
    },
  },
  theme: {
    name: "Lakeside",
    mode: "light",
    primary: "#1d4f91",
    primary2: "#173f75",
    accent: "#0f6b4f",
    bg: "#f6f9fb",
    surface: "#ffffff",
    surface2: "#e6eef5",
    border: "#d5e0ea",
    text: "#0f2233",
    textMuted: "#4b6072",
    font: '"Public Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontDisplay: '"Lexend", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    googleFonts: ["Lexend:wght@400;500;600;700", "Public Sans:ital,wght@0,400;0,600;0,700;1,400"],
    radius: "18px",
    radiusSm: "12px",
    dark: {
      name: "Lakeside (night)",
      mode: "dark",
      primary: "#2a64b3",
      primary2: "#2458a0",
      accent: "#4cc39a",
      bg: "#0b1622",
      surface: "#121e2b",
      surface2: "#182838",
      border: "#263a4f",
      text: "#dfe9f3",
      textMuted: "#9fb3c6",
      font: '"Public Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      fontDisplay: '"Lexend", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      googleFonts: ["Lexend:wght@400;500;600;700", "Public Sans:ital,wght@0,400;0,600;0,700;1,400"],
      radius: "18px",
      radiusSm: "12px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME_HTML, css: editorSafe(HOME_CSS) },
    { title: "Services & Fees", slug: "services", isHome: false, html: SERVICES_HTML, css: editorSafe(SERVICES_CSS) },
  ],
};

registerTemplate(template);
export default template;
