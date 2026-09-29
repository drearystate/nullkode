import type { Editor } from "grapesjs";

const svg = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const I = {
  section: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>'),
  container: svg('<rect x="4" y="4" width="16" height="16" rx="2"/>'),
  cols2: svg('<rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/>'),
  cols3: svg('<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="16" rx="1"/><rect x="16" y="4" width="5" height="16" rx="1"/>'),
  cols4: svg('<rect x="2" y="5" width="4" height="14" rx="1"/><rect x="7.5" y="5" width="4" height="14" rx="1"/><rect x="13" y="5" width="4" height="14" rx="1"/><rect x="18.5" y="5" width="4" height="14" rx="1"/>'),
  grid: svg('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>'),
  spacer: svg('<line x1="6" y1="6" x2="18" y2="6"/><line x1="6" y1="18" x2="18" y2="18"/><line x1="12" y1="9" x2="12" y2="15"/><polyline points="9 12 12 9 15 12"/><polyline points="9 15 12 18 15 15"/>'),
  divider: svg('<line x1="3" y1="12" x2="21" y2="12"/>'),
  hero: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="10" x2="17" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/>'),
  cta: svg('<rect x="3" y="7" width="18" height="10" rx="3"/><line x1="9" y1="12" x2="15" y2="12"/>'),
  features: svg('<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>'),
  pricing: svg('<rect x="3" y="4" width="6" height="16" rx="1"/><rect x="10" y="2" width="6" height="20" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/>'),
  testimonial: svg('<path d="M7 10c0-2 1-3 3-3"/><path d="M14 10c0-2 1-3 3-3"/><circle cx="8" cy="11" r="2"/><circle cx="15" cy="11" r="2"/><path d="M5 18c1-3 5-3 7 0"/>'),
  team: svg('<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19c.8-3 4-4 5-4"/><path d="M21 19c-.8-3-4-4-5-4"/>'),
  faq: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .8-1.5 1.5-1.5 2.5"/><line x1="12" y1="17" x2="12" y2="17.01"/>'),
  stats: svg('<line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="14"/><line x1="22" y1="20" x2="22" y2="8"/>'),
  logos: svg('<rect x="3" y="6" width="4" height="12" rx="1"/><rect x="10" y="6" width="4" height="12" rx="1"/><rect x="17" y="6" width="4" height="12" rx="1"/>'),
  footer: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="16" x2="21" y2="16"/>'),
  navbar: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>'),
  newsletter: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><polyline points="3 8 12 14 21 8"/>'),
  heading: svg('<line x1="6" y1="6" x2="6" y2="18"/><line x1="14" y1="6" x2="14" y2="18"/><line x1="6" y1="12" x2="14" y2="12"/>'),
  paragraph: svg('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/>'),
  list: svg('<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/>'),
  olist: svg('<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><text x="3" y="9" font-size="7">1</text><text x="3" y="15" font-size="7">2</text><text x="3" y="21" font-size="7">3</text>'),
  quote: svg('<path d="M7 7h4v4c0 2-1 3-3 4"/><path d="M15 7h4v4c0 2-1 3-3 4"/>'),
  code: svg('<polyline points="8 6 3 12 8 18"/><polyline points="16 6 21 12 16 18"/>'),
  alert: svg('<path d="M12 3l10 18H2z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/>'),
  badge: svg('<rect x="4" y="8" width="16" height="8" rx="4"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><polyline points="3 18 9 12 13 16 17 12 21 16"/>'),
  gallery: svg('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>'),
  video: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><polygon points="11 9 15 12 11 15 11 9" fill="currentColor"/>'),
  audio: svg('<path d="M9 18V8l10-2v10"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>'),
  icon: svg('<polygon points="12 3 14.5 9 21 9.5 16 14 17.5 21 12 17.5 6.5 21 8 14 3 9.5 9.5 9 12 3"/>'),
  map: svg('<polygon points="3 6 9 4 15 6 21 4 21 18 15 20 9 18 3 20 3 6"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>'),
  button: svg('<rect x="3" y="9" width="18" height="6" rx="3"/>'),
  buttonGroup: svg('<rect x="3" y="9" width="8" height="6" rx="2"/><rect x="13" y="9" width="8" height="6" rx="2"/>'),
  link: svg('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>'),
  card: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/>'),
  accordion: svg('<rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/>'),
  tabs: svg('<line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="9" x2="8" y2="5"/><line x1="14" y1="9" x2="14" y2="5"/><line x1="3" y1="5" x2="8" y2="5"/><line x1="14" y1="5" x2="20" y2="5"/><rect x="3" y="9" width="18" height="11" rx="1"/>'),
  carousel: svg('<rect x="6" y="6" width="12" height="12" rx="1"/><polyline points="3 12 1 12"/><polyline points="23 12 21 12"/>'),
  modal: svg('<rect x="2" y="3" width="20" height="18" rx="2"/><rect x="6" y="7" width="12" height="10" rx="1"/>'),
  progress: svg('<rect x="3" y="10" width="18" height="4" rx="2"/><rect x="3" y="10" width="11" height="4" rx="2" fill="currentColor"/>'),
  form: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="13" y2="17"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16" y2="16"/>'),
  login: svg('<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>'),
  product: svg('<rect x="4" y="6" width="16" height="14" rx="1"/><line x1="9" y1="6" x2="9" y2="2"/><line x1="15" y1="6" x2="15" y2="2"/>'),
  cart: svg('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 4h3l3 12h12l2-8H6"/>'),
  social: svg('<circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><line x1="9" y1="11" x2="15" y2="7"/><line x1="9" y1="13" x2="15" y2="17"/>'),
  share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>'),
  embed: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><circle cx="6" cy="6" r=".7"/><circle cx="9" cy="6" r=".7"/>'),
  data: svg('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'),
  table: svg('<rect x="3" y="4" width="18" height="16" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 5-6 8-6s7 2 8 6"/>'),
  lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/>'),
  api: svg('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="14" y1="4" x2="10" y2="20"/>'),
};

type BlockDef = {
  id: string;
  label: string;
  category: string;
  media: string;
  content: string;
};

const BLOCKS: BlockDef[] = [
  // ───────── Layout ─────────
  {
    id: "nk-section",
    label: "Section",
    category: "Layout",
    media: I.section,
    content: `<section><div class="container"><h2>Section heading</h2><p class="lead">A few words about this part of your business.</p></div></section>`,
  },
  {
    id: "nk-container",
    label: "Container",
    category: "Layout",
    media: I.container,
    content: `<div class="container py-4"><p>Container content</p></div>`,
  },
  {
    id: "nk-row-2",
    label: "2 Columns",
    category: "Layout",
    media: I.cols2,
    content: `<div class="row g-4"><div class="col-md-6"><div class="p-3">Column one</div></div><div class="col-md-6"><div class="p-3">Column two</div></div></div>`,
  },
  {
    id: "nk-row-3",
    label: "3 Columns",
    category: "Layout",
    media: I.cols3,
    content: `<div class="row g-4"><div class="col-md-4"><div class="p-3">Column one</div></div><div class="col-md-4"><div class="p-3">Column two</div></div><div class="col-md-4"><div class="p-3">Column three</div></div></div>`,
  },
  {
    id: "nk-row-4",
    label: "4 Columns",
    category: "Layout",
    media: I.cols4,
    content: `<div class="row g-3"><div class="col-md-3"><div class="p-3">One</div></div><div class="col-md-3"><div class="p-3">Two</div></div><div class="col-md-3"><div class="p-3">Three</div></div><div class="col-md-3"><div class="p-3">Four</div></div></div>`,
  },
  {
    id: "nk-grid",
    label: "Auto Grid",
    category: "Layout",
    media: I.grid,
    content: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.25rem;"><div class="p-3" style="background:var(--nk-surface-2);border-radius:var(--nk-radius-sm);">Cell</div><div class="p-3" style="background:var(--nk-surface-2);border-radius:var(--nk-radius-sm);">Cell</div><div class="p-3" style="background:var(--nk-surface-2);border-radius:var(--nk-radius-sm);">Cell</div></div>`,
  },
  {
    id: "nk-spacer",
    label: "Spacer",
    category: "Layout",
    media: I.spacer,
    content: `<div style="height:60px;" aria-hidden="true"></div>`,
  },
  {
    id: "nk-divider",
    label: "Divider",
    category: "Layout",
    media: I.divider,
    content: `<hr class="my-4"/>`,
  },

  // ───────── Sections (prebuilt) ─────────
  {
    id: "nk-hero-centered",
    label: "Big intro · Centered",
    category: "Sections",
    media: I.hero,
    content: `<section class="nk-hero text-center"><div class="container"><span class="nk-eyebrow">Welcome</span><h1 class="display-4 mb-3">Friendly service, close to home</h1><p class="lead mx-auto" style="max-width:620px;">Pop in, give us a call, or book online. We&rsquo;re here to help.</p><div class="d-flex gap-2 justify-content-center mt-4"><a class="btn btn-primary btn-lg" href="#">Book now</a><a class="btn btn-outline-primary btn-lg" href="#">Our services</a></div></div></section>`,
  },
  {
    id: "nk-hero-split",
    label: "Big intro · With picture",
    category: "Sections",
    media: I.hero,
    content: `<section class="nk-hero"><div class="container"><div class="row align-items-center g-5"><div class="col-lg-6"><span class="nk-eyebrow">About us</span><h1 class="display-5 mb-3">Made with care, every day</h1><p class="lead">We&rsquo;re a small local business that takes pride in doing things properly. Come and see us, or get in touch today.</p><div class="d-flex gap-2 mt-4"><a class="btn btn-primary btn-lg" href="#">Get in touch</a><a class="btn btn-outline-primary btn-lg" href="#">See our prices</a></div></div><div class="col-lg-6"><img src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=900" alt="Our team at work" class="img-fluid rounded shadow-lg"/></div></div></div></section>`,
  },
  {
    id: "nk-hero-form",
    label: "Big intro · Sign-up",
    category: "Sections",
    media: I.hero,
    content: `<section class="nk-hero text-center"><div class="container" style="max-width:640px;"><h1 class="display-5 mb-3">Hear about our news</h1><p class="lead">Special offers and new arrivals, straight to your inbox.</p><form class="row g-2 mt-4 justify-content-center" data-nk-form=""><div class="col-md-7"><input class="form-control form-control-lg" type="email" name="email" placeholder="you@example.com" required/></div><div class="col-md-auto"><button class="btn btn-primary btn-lg w-100" type="submit">Sign up</button></div></form></div></section>`,
  },
  {
    id: "nk-cta-band",
    label: "Action banner",
    category: "Sections",
    media: I.cta,
    content: `<section><div class="container"><div class="nk-cta-band"><h2 class="display-6 mb-2">Ready when you are</h2><p class="lead mb-4">Call, message or book online. We&rsquo;d love to hear from you.</p><a class="btn btn-lg" href="#">Get in touch</a></div></div></section>`,
  },
  {
    id: "nk-features-3",
    label: "Features · 3 col",
    category: "Sections",
    media: I.features,
    content: `<section><div class="container"><div class="nk-section-title"><span class="nk-eyebrow">Why us</span><h2 class="display-6">What we offer</h2><p class="lead">A few reasons people keep coming back.</p></div><div class="row g-4"><div class="col-md-4"><div class="nk-feature"><div class="nk-icon-chip">★</div><h3>Friendly service</h3><p>We take the time to listen and get things right the first time.</p></div></div><div class="col-md-4"><div class="nk-feature"><div class="nk-icon-chip">★</div><h3>Fair prices</h3><p>Clear prices with no surprises, whatever you need.</p></div></div><div class="col-md-4"><div class="nk-feature"><div class="nk-icon-chip">★</div><h3>Local and trusted</h3><p>Part of the neighbourhood for years, with plenty of happy regulars.</p></div></div></div></div></section>`,
  },
  {
    id: "nk-features-4",
    label: "Features · 2x2",
    category: "Sections",
    media: I.features,
    content: `<section><div class="container"><div class="nk-section-title"><h2 class="display-6">Why customers choose us</h2></div><div class="row g-4"><div class="col-md-6"><div class="nk-feature"><div class="nk-icon-chip">★</div><h3>Easy to book</h3><p>Pick a time that suits you, online or over the phone.</p></div></div><div class="col-md-6"><div class="nk-feature"><div class="nk-icon-chip">★</div><h3>Flexible hours</h3><p>Early mornings, late evenings and weekends too.</p></div></div><div class="col-md-6"><div class="nk-feature"><div class="nk-icon-chip">★</div><h3>Quality you can see</h3><p>We use good materials and take care over every detail.</p></div></div><div class="col-md-6"><div class="nk-feature"><div class="nk-icon-chip">★</div><h3>Here to help</h3><p>Questions before or after? Just ask, we&rsquo;re happy to help.</p></div></div></div></div></section>`,
  },
  {
    id: "nk-pricing-3",
    label: "Pricing · 3 tier",
    category: "Sections",
    media: I.pricing,
    content: `<section><div class="container"><div class="nk-section-title"><h2 class="display-6">Simple prices</h2><p class="lead">No hidden extras. Pick what suits you.</p></div><div class="row g-4 align-items-stretch"><div class="col-md-4"><div class="card h-100"><div class="card-body text-center"><h3 class="card-title">Basic</h3><div class="display-5 my-3">$25</div><p class="text-muted">A quick visit</p><ul class="list-unstyled my-4"><li>30 minutes</li><li>Friendly advice</li><li>No booking fee</li></ul><a class="btn btn-outline-primary w-100" href="#">Book Basic</a></div></div></div><div class="col-md-4"><div class="card h-100 shadow-lg" style="border-color:var(--nk-primary);"><div class="card-body text-center"><span class="badge bg-primary mb-2">Most popular</span><h3 class="card-title">Standard</h3><div class="display-5 my-3">$45</div><p class="text-muted">Our favourite</p><ul class="list-unstyled my-4"><li>60 minutes</li><li>Everything in Basic</li><li>Free follow-up</li></ul><a class="btn btn-primary w-100" href="#">Book Standard</a></div></div></div><div class="col-md-4"><div class="card h-100"><div class="card-body text-center"><h3 class="card-title">Premium</h3><div class="display-5 my-3">$80</div><p class="text-muted">The full treatment</p><ul class="list-unstyled my-4"><li>90 minutes</li><li>Everything in Standard</li><li>Priority booking</li></ul><a class="btn btn-outline-primary w-100" href="#">Book Premium</a></div></div></div></div></div></section>`,
  },
  {
    id: "nk-testimonials",
    label: "Testimonials",
    category: "Sections",
    media: I.testimonial,
    content: `<section><div class="container"><div class="nk-section-title"><h2 class="display-6">What our customers say</h2></div><div class="row g-4" data-nk-connect-list="testimonials-feed"><div class="col-md-4" data-nk-item><div class="card h-100"><div class="card-body"><p>&ldquo;<span data-nk-field="quote">Friendly, quick and great value. I wouldn&rsquo;t go anywhere else.</span>&rdquo;</p><div class="d-flex align-items-center gap-3 mt-3"><img src="https://i.pravatar.cc/64?img=12" data-nk-src="photo_url" alt="" class="rounded-circle" width="44"/><div><strong data-nk-field="author">Maya R.</strong><div class="text-muted small" data-nk-field="role">Regular customer</div></div></div></div></div></div><div class="col-md-4"><div class="card h-100"><div class="card-body"><p>&ldquo;They went out of their way to help. You can tell they really care.&rdquo;</p><div class="d-flex align-items-center gap-3 mt-3"><img src="https://i.pravatar.cc/64?img=24" alt="" class="rounded-circle" width="44"/><div><strong>Devon K.</strong><div class="text-muted small">Customer since 2021</div></div></div></div></div></div><div class="col-md-4"><div class="card h-100"><div class="card-body"><p>&ldquo;Booking was easy and everything was ready on time. Highly recommended.&rdquo;</p><div class="d-flex align-items-center gap-3 mt-3"><img src="https://i.pravatar.cc/64?img=32" alt="" class="rounded-circle" width="44"/><div><strong>Priya S.</strong><div class="text-muted small">First-time customer</div></div></div></div></div></div></div></div></section>`,
  },
  {
    id: "nk-team",
    label: "Team",
    category: "Sections",
    media: I.team,
    content: `<section><div class="container"><div class="nk-section-title"><h2 class="display-6">Meet the team</h2></div><div class="row g-4 text-center"><div class="col-md-3 col-6"><img src="https://i.pravatar.cc/200?img=15" alt="" class="rounded-circle mb-3" width="120"/><h5 class="mb-0">Alex Chen</h5><div class="text-muted small">Owner</div></div><div class="col-md-3 col-6"><img src="https://i.pravatar.cc/200?img=16" alt="" class="rounded-circle mb-3" width="120"/><h5 class="mb-0">Jordan Lee</h5><div class="text-muted small">Manager</div></div><div class="col-md-3 col-6"><img src="https://i.pravatar.cc/200?img=17" alt="" class="rounded-circle mb-3" width="120"/><h5 class="mb-0">Sam Patel</h5><div class="text-muted small">Customer care</div></div><div class="col-md-3 col-6"><img src="https://i.pravatar.cc/200?img=18" alt="" class="rounded-circle mb-3" width="120"/><h5 class="mb-0">Casey Brown</h5><div class="text-muted small">Bookings</div></div></div></div></section>`,
  },
  {
    id: "nk-faq",
    label: "FAQ",
    category: "Sections",
    media: I.faq,
    content: `<section><div class="container" style="max-width:760px;"><div class="nk-section-title"><h2 class="display-6">Frequently asked</h2></div><details class="card mb-3"><summary class="card-body fw-semibold">What are your opening hours?</summary><div class="card-body pt-0">We&rsquo;re open Monday to Saturday, 9am to 6pm.</div></details><details class="card mb-3"><summary class="card-body fw-semibold">Do I need to book ahead?</summary><div class="card-body pt-0">Booking is best, but walk-ins are welcome when we have space.</div></details><details class="card mb-3"><summary class="card-body fw-semibold">How can I pay?</summary><div class="card-body pt-0">Cash, card, or online when you book.</div></details><details class="card"><summary class="card-body fw-semibold">Where can I park?</summary><div class="card-body pt-0">There&rsquo;s free parking right outside and a bus stop around the corner.</div></details></div></section>`,
  },
  {
    id: "nk-stats",
    label: "Numbers strip",
    category: "Sections",
    media: I.stats,
    content: `<section><div class="container"><div class="nk-stats"><div class="text-center"><div class="nk-stat-value">10+</div><div class="nk-stat-label">Years in business</div></div><div class="text-center"><div class="nk-stat-value">2,000+</div><div class="nk-stat-label">Happy customers</div></div><div class="text-center"><div class="nk-stat-value">4.9</div><div class="nk-stat-label">Average rating</div></div><div class="text-center"><div class="nk-stat-value">7</div><div class="nk-stat-label">Days a week</div></div></div></div></section>`,
  },
  {
    id: "nk-logo-cloud",
    label: "Logo row",
    category: "Sections",
    media: I.logos,
    content: `<section><div class="container text-center"><p class="text-muted small text-uppercase mb-4" style="letter-spacing:.18em;">As seen in</p><div class="row g-4 align-items-center justify-content-center" style="opacity:.7;"><div class="col-6 col-md-2"><div class="fw-bold fs-4">Acme</div></div><div class="col-6 col-md-2"><div class="fw-bold fs-4">Northwind</div></div><div class="col-6 col-md-2"><div class="fw-bold fs-4">Globex</div></div><div class="col-6 col-md-2"><div class="fw-bold fs-4">Initech</div></div><div class="col-6 col-md-2"><div class="fw-bold fs-4">Hopr</div></div></div></div></section>`,
  },
  {
    id: "nk-newsletter",
    label: "Newsletter",
    category: "Sections",
    media: I.newsletter,
    content: `<section><div class="container" style="max-width:560px;"><div class="text-center"><h2 class="mb-2">Get the newsletter</h2><p class="text-muted">One short email a month. No spam, ever.</p><form class="input-group input-group-lg mt-4" data-nk-form="" data-nk-flow-ref="newsletter-subscribe"><input type="email" name="email" class="form-control" placeholder="you@example.com" required/><button class="btn btn-primary" type="submit">Subscribe</button></form></div></div></section>`,
  },
  {
    id: "nk-navbar",
    label: "Menu bar",
    category: "Sections",
    media: I.navbar,
    content: `<nav class="navbar navbar-expand-lg" style="background:var(--nk-surface);border-bottom:1px solid var(--nk-border);"><div class="container"><a class="navbar-brand fw-bold" href="#">Brand</a><div class="d-flex gap-3 align-items-center"><a class="text-body" href="#">Services</a><a class="text-body" href="#">Prices</a><a class="text-body" href="#">About</a><a class="btn btn-primary btn-sm" href="#">Contact</a></div></div></nav>`,
  },
  {
    id: "nk-footer-simple",
    label: "Footer · Simple",
    category: "Sections",
    media: I.footer,
    content: `<footer class="py-5" style="background:var(--nk-surface-2);border-top:1px solid var(--nk-border);"><div class="container text-center"><div class="fw-bold mb-2">Brand</div><div class="text-muted small">© 2026 Your Company. All rights reserved.</div><div class="mt-3"><a class="me-3" href="#">Privacy</a><a class="me-3" href="#">Terms</a><a href="#">Contact</a></div></div></footer>`,
  },
  {
    id: "nk-footer-multi",
    label: "Footer · Multi-col",
    category: "Sections",
    media: I.footer,
    content: `<footer class="py-5" style="background:var(--nk-surface-2);border-top:1px solid var(--nk-border);"><div class="container"><div class="row g-4"><div class="col-md-4"><div class="fw-bold fs-4 mb-2">Brand</div><p class="text-muted small">Friendly local service since 2015.</p></div><div class="col-md-2 col-6"><h6>Services</h6><ul class="list-unstyled small"><li><a href="#">What we do</a></li><li><a href="#">Prices</a></li><li><a href="#">Book now</a></li></ul></div><div class="col-md-2 col-6"><h6>About</h6><ul class="list-unstyled small"><li><a href="#">Our story</a></li><li><a href="#">Team</a></li><li><a href="#">Jobs</a></li></ul></div><div class="col-md-2 col-6"><h6>Help</h6><ul class="list-unstyled small"><li><a href="#">Questions</a></li><li><a href="#">News</a></li><li><a href="#">Contact</a></li></ul></div><div class="col-md-2 col-6"><h6>Legal</h6><ul class="list-unstyled small"><li><a href="#">Privacy</a></li><li><a href="#">Terms</a></li></ul></div></div><hr class="my-4"/><div class="text-muted small">© 2026 Your Company.</div></div></footer>`,
  },

  // ───────── Content ─────────
  { id: "nk-h1", label: "Heading 1", category: "Content", media: I.heading, content: `<h1>Heading 1</h1>` },
  { id: "nk-h2", label: "Heading 2", category: "Content", media: I.heading, content: `<h2>Heading 2</h2>` },
  { id: "nk-h3", label: "Heading 3", category: "Content", media: I.heading, content: `<h3>Heading 3</h3>` },
  { id: "nk-paragraph", label: "Paragraph", category: "Content", media: I.paragraph, content: `<p>We&rsquo;re a friendly local business. We love what we do, and we&rsquo;d love to help you too.</p>` },
  { id: "nk-lead", label: "Lead text", category: "Content", media: I.paragraph, content: `<p class="lead">A larger paragraph used to introduce a section.</p>` },
  { id: "nk-list-ul", label: "Bullet list", category: "Content", media: I.list, content: `<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>` },
  { id: "nk-list-ol", label: "Numbered list", category: "Content", media: I.olist, content: `<ol><li>First step</li><li>Second step</li><li>Third step</li></ol>` },
  { id: "nk-quote", label: "Quote", category: "Content", media: I.quote, content: `<blockquote class="border-start ps-3" style="border-color:var(--nk-primary)!important;border-width:3px!important;"><p class="lead mb-2">A pithy, memorable quote that anchors the page.</p><footer class="text-muted small">— Someone Famous</footer></blockquote>` },
  { id: "nk-code", label: "Code block", category: "Content", media: I.code, content: `<pre style="background:var(--nk-surface-2);padding:1rem;border-radius:var(--nk-radius-sm);overflow:auto;"><code>const greet = (name) =&gt; \`Hello, \${name}!\`;</code></pre>` },
  { id: "nk-alert-info", label: "Alert · Info", category: "Content", media: I.alert, content: `<div class="alert alert-info">Heads up — here&rsquo;s some context for the reader.</div>` },
  { id: "nk-alert-success", label: "Alert · Success", category: "Content", media: I.alert, content: `<div class="alert alert-success">All good. The thing you tried worked.</div>` },
  { id: "nk-alert-warn", label: "Alert · Warning", category: "Content", media: I.alert, content: `<div class="alert alert-warning">Careful — double-check before you continue.</div>` },
  { id: "nk-alert-danger", label: "Alert · Error", category: "Content", media: I.alert, content: `<div class="alert alert-danger">Something went wrong. Try again or contact support.</div>` },
  { id: "nk-badge", label: "Badge", category: "Content", media: I.badge, content: `<span class="badge bg-primary">New</span>` },

  // ───────── Media ─────────
  { id: "nk-image", label: "Image", category: "Media", media: I.image, content: `<img src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900" alt="" class="img-fluid rounded"/>` },
  { id: "nk-image-caption", label: "Image w/ caption", category: "Media", media: I.image, content: `<figure class="figure"><img src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900" alt="" class="figure-img img-fluid rounded"/><figcaption class="figure-caption text-muted">Mountain at dawn.</figcaption></figure>` },
  { id: "nk-gallery", label: "Gallery · 3 col", category: "Media", media: I.gallery, content: `<div class="row g-3"><div class="col-md-4"><img class="img-fluid rounded" src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600" alt=""/></div><div class="col-md-4"><img class="img-fluid rounded" src="https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600" alt=""/></div><div class="col-md-4"><img class="img-fluid rounded" src="https://images.unsplash.com/photo-1493612276216-ee3925520721?w=600" alt=""/></div></div>` },
  { id: "nk-youtube", label: "YouTube", category: "Media", media: I.video, content: `<div class="ratio ratio-16x9 rounded overflow-hidden"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube" allowfullscreen></iframe></div>` },
  { id: "nk-vimeo", label: "Vimeo", category: "Media", media: I.video, content: `<div class="ratio ratio-16x9 rounded overflow-hidden"><iframe src="https://player.vimeo.com/video/76979871" title="Vimeo" allowfullscreen></iframe></div>` },
  { id: "nk-video-file", label: "Video file", category: "Media", media: I.video, content: `<video controls class="w-100 rounded"><source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"/></video>` },
  { id: "nk-audio", label: "Audio", category: "Media", media: I.audio, content: `<audio controls class="w-100"><source src="https://www.w3schools.com/html/horse.mp3" type="audio/mpeg"/></audio>` },
  { id: "nk-icon-chip", label: "Icon chip", category: "Media", media: I.icon, content: `<div class="nk-icon-chip">★</div>` },
  { id: "nk-map", label: "Map", category: "Media", media: I.map, content: `<div class="ratio ratio-16x9 rounded overflow-hidden"><iframe src="https://maps.google.com/maps?q=san+francisco&z=12&output=embed" title="Map"></iframe></div>` },

  // ───────── Interactive ─────────
  { id: "nk-btn-primary", label: "Button · Primary", category: "Interactive", media: I.button, content: `<a class="btn btn-primary" href="#">Get started</a>` },
  { id: "nk-btn-outline", label: "Button · Outline", category: "Interactive", media: I.button, content: `<a class="btn btn-outline-primary" href="#">Learn more</a>` },
  { id: "nk-btn-lg", label: "Button · Large", category: "Interactive", media: I.button, content: `<a class="btn btn-primary btn-lg" href="#">Book now</a>` },
  { id: "nk-btn-group", label: "Button group", category: "Interactive", media: I.buttonGroup, content: `<div class="d-flex gap-2"><a class="btn btn-primary" href="#">Book now</a><a class="btn btn-outline-primary" href="#">Learn more</a></div>` },
  { id: "nk-link", label: "Link", category: "Interactive", media: I.link, content: `<a href="#">Read more</a>` },
  { id: "nk-card", label: "Card", category: "Interactive", media: I.card, content: `<div class="card"><div class="card-body"><h5 class="card-title">Card title</h5><p class="card-text text-muted">Some quick example text to build on the card title.</p><a class="btn btn-primary btn-sm" href="#">Action</a></div></div>` },
  { id: "nk-card-image", label: "Card · with image", category: "Interactive", media: I.card, content: `<div class="card"><img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600" class="card-img-top" alt=""/><div class="card-body"><h5 class="card-title">Card title</h5><p class="card-text text-muted">A card that uses an image header.</p><a class="btn btn-outline-primary btn-sm" href="#">Read more</a></div></div>` },
  { id: "nk-accordion", label: "Accordion", category: "Interactive", media: I.accordion, content: `<div><details class="card mb-2" open><summary class="card-body fw-semibold">First item</summary><div class="card-body pt-0">Body content for the first item.</div></details><details class="card mb-2"><summary class="card-body fw-semibold">Second item</summary><div class="card-body pt-0">Body content for the second item.</div></details><details class="card"><summary class="card-body fw-semibold">Third item</summary><div class="card-body pt-0">Body content for the third item.</div></details></div>` },
  { id: "nk-tabs", label: "Tabs", category: "Interactive", media: I.tabs, content: `<div><ul class="nav nav-tabs" role="tablist"><li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#tab-1">Tab 1</a></li><li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-2">Tab 2</a></li><li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-3">Tab 3</a></li></ul><div class="tab-content p-3"><div class="tab-pane fade show active" id="tab-1">First tab content.</div><div class="tab-pane fade" id="tab-2">Second tab content.</div><div class="tab-pane fade" id="tab-3">Third tab content.</div></div></div>` },
  { id: "nk-carousel", label: "Carousel", category: "Interactive", media: I.carousel, content: `<div id="nk-carousel-1" class="carousel slide rounded overflow-hidden" data-bs-ride="carousel"><div class="carousel-inner"><div class="carousel-item active"><img src="https://images.unsplash.com/photo-1503264116251-35a269479413?w=1200" class="d-block w-100" alt=""/></div><div class="carousel-item"><img src="https://images.unsplash.com/photo-1493612276216-ee3925520721?w=1200" class="d-block w-100" alt=""/></div></div><button class="carousel-control-prev" type="button" data-bs-target="#nk-carousel-1" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button><button class="carousel-control-next" type="button" data-bs-target="#nk-carousel-1" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button></div>` },
  { id: "nk-modal", label: "Pop-up", category: "Interactive", media: I.modal, content: `<div><button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#nk-modal-1">Open pop-up</button><div class="modal fade" id="nk-modal-1" tabindex="-1"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Pop-up title</h5><button class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><p>A few words for your visitors.</p></div><div class="modal-footer"><button class="btn btn-outline-primary" data-bs-dismiss="modal">Close</button><button class="btn btn-primary">Save</button></div></div></div></div></div>` },
  { id: "nk-progress", label: "Progress bar", category: "Interactive", media: I.progress, content: `<div class="progress" style="height:10px;"><div class="progress-bar" role="progressbar" style="width:65%;background:var(--nk-primary);"></div></div>` },

  // ───────── Forms (extras beyond plugin) ─────────
  { id: "nk-form-contact", label: "Contact form", category: "Forms", media: I.form, content: `<form class="card" data-nk-form="" data-nk-flow-ref="contact-form-submit"><div class="card-body"><h4 class="mb-3">Get in touch</h4><div class="mb-3"><label class="form-label">Name</label><input class="form-control" name="full_name" required/></div><div class="mb-3"><label class="form-label">Email</label><input type="email" class="form-control" name="email" required/></div><div class="mb-3"><label class="form-label">Message</label><textarea class="form-control" name="body" rows="4" required></textarea></div><button class="btn btn-primary" type="submit">Send message</button><div data-nk-error data-nk-auto></div></div></form>` },
  { id: "nk-form-newsletter", label: "Newsletter inline", category: "Forms", media: I.form, content: `<form class="input-group" data-nk-form=""><input type="email" class="form-control" name="email" placeholder="you@example.com" required/><button class="btn btn-primary" type="submit">Subscribe</button></form>` },
  { id: "nk-form-login", label: "Login form", category: "Forms", media: I.login, content: `<form class="card mx-auto" style="max-width:400px;" data-nk-form="" data-nk-action="login"><div class="card-body"><h4 class="mb-3">Sign in</h4><div class="mb-3"><label class="form-label">Email</label><input type="email" class="form-control" name="email" required/></div><div class="mb-3"><label class="form-label">Password</label><input type="password" class="form-control" name="password" required/></div><button class="btn btn-primary w-100" type="submit">Sign in</button><p class="text-center small mt-3 mb-0"><a href="#">Forgot password?</a></p></div></form>` },
  { id: "nk-form-signup", label: "Signup form", category: "Forms", media: I.login, content: `<form class="card mx-auto" style="max-width:420px;" data-nk-form="" data-nk-action="signup"><div class="card-body"><h4 class="mb-3">Create account</h4><div class="mb-3"><label class="form-label">Full name</label><input class="form-control" name="name" required/></div><div class="mb-3"><label class="form-label">Email</label><input type="email" class="form-control" name="email" required/></div><div class="mb-3"><label class="form-label">Password</label><input type="password" class="form-control" name="password" required/></div><button class="btn btn-primary w-100" type="submit">Create account</button></div></form>` },
  { id: "nk-form-search", label: "Search bar", category: "Forms", media: I.search, content: `<form class="d-flex" role="search"><input class="form-control me-2" type="search" placeholder="Search..." aria-label="Search"/><button class="btn btn-outline-primary" type="submit">Search</button></form>` },

  // ───────── Commerce ─────────
  { id: "nk-product", label: "Product card", category: "Commerce", media: I.product, content: `<div class="card"><img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600" class="card-img-top" alt=""/><div class="card-body"><div class="d-flex justify-content-between align-items-start"><h5 class="card-title mb-1">Air Max 90</h5><span class="badge bg-success">In stock</span></div><div class="text-muted small mb-2">Sneakers</div><div class="d-flex justify-content-between align-items-center mt-3"><div class="fw-bold fs-5">$129</div><button class="btn btn-primary btn-sm">Add to cart</button></div></div></div>` },
  { id: "nk-product-grid", label: "Product grid", category: "Commerce", media: I.product, content: `<div class="row g-4"><div class="col-md-4"><div class="card h-100"><img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600" class="card-img-top" alt=""/><div class="card-body"><h6 class="card-title">Air Max 90</h6><div class="d-flex justify-content-between align-items-center mt-2"><span class="fw-bold">$129</span><button class="btn btn-outline-primary btn-sm">Buy</button></div></div></div></div><div class="col-md-4"><div class="card h-100"><img src="https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600" class="card-img-top" alt=""/><div class="card-body"><h6 class="card-title">Forum Low</h6><div class="d-flex justify-content-between align-items-center mt-2"><span class="fw-bold">$110</span><button class="btn btn-outline-primary btn-sm">Buy</button></div></div></div></div><div class="col-md-4"><div class="card h-100"><img src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600" class="card-img-top" alt=""/><div class="card-body"><h6 class="card-title">Classic Leather</h6><div class="d-flex justify-content-between align-items-center mt-2"><span class="fw-bold">$95</span><button class="btn btn-outline-primary btn-sm">Buy</button></div></div></div></div></div>` },
  { id: "nk-pricing-card", label: "Pricing card", category: "Commerce", media: I.pricing, content: `<div class="card text-center"><div class="card-body"><h4 class="card-title">Pro</h4><div class="display-5 my-3">$29<span class="fs-6 text-muted">/mo</span></div><ul class="list-unstyled my-4"><li>Unlimited projects</li><li>Custom domains</li><li>Email support</li></ul><button class="btn btn-primary w-100">Choose plan</button></div></div>` },
  { id: "nk-add-cart", label: "Add to cart", category: "Commerce", media: I.cart, content: `<button class="btn btn-primary">Add to cart</button>` },
  { id: "nk-cart-icon", label: "Cart icon", category: "Commerce", media: I.cart, content: `<a class="btn btn-outline-primary position-relative" href="#"><span>Cart</span><span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary">3</span></a>` },

  // ───────── Social ─────────
  { id: "nk-social-row", label: "Social icons", category: "Social", media: I.social, content: `<div class="d-flex gap-2"><a class="btn btn-outline-primary btn-sm" href="#" aria-label="Twitter">𝕏</a><a class="btn btn-outline-primary btn-sm" href="#" aria-label="Instagram">IG</a><a class="btn btn-outline-primary btn-sm" href="#" aria-label="LinkedIn">in</a><a class="btn btn-outline-primary btn-sm" href="#" aria-label="GitHub">⌂</a></div>` },
  { id: "nk-share", label: "Share buttons", category: "Social", media: I.share, content: `<div class="d-flex gap-2"><a class="btn btn-sm btn-outline-primary" href="#">Share on X</a><a class="btn btn-sm btn-outline-primary" href="#">Share on Facebook</a><a class="btn btn-sm btn-outline-primary" href="#">Share on LinkedIn</a></div>` },
  { id: "nk-iframe", label: "Embed (iframe)", category: "Social", media: I.embed, content: `<div class="ratio ratio-16x9 rounded overflow-hidden"><iframe src="https://example.com" title="Embed"></iframe></div>` },

  // ───────── Dynamic (Nullkode runtime) ─────────
  {
    id: "nk-flow-form",
    label: "Form that runs a flow",
    category: "Live data",
    media: I.form,
    content: `<form class="card" data-nk-form="" data-nk-flow=""><div class="card-body"><div class="mb-3"><label class="form-label">Email</label><input class="form-control" type="email" name="email"/></div><div class="mb-3"><label class="form-label">Message</label><textarea class="form-control" name="message" rows="3"></textarea></div><button class="btn btn-primary" type="submit">Submit</button></div></form>`,
  },
  {
    id: "nk-data-list",
    label: "List of items",
    category: "Live data",
    media: I.data,
    content: `<div data-nk-bind-flow="" class="nk-data-list p-3"><div class="text-muted small">Choose what to show in Settings.</div></div>`,
  },
  {
    id: "nk-data-table",
    label: "Table of items",
    category: "Live data",
    media: I.table,
    content: `<div data-nk-bind-flow="" class="table-responsive"><table class="table"><thead><tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr></thead><tbody><tr><td colspan="3" class="text-muted small">Choose what to show in Settings.</td></tr></tbody></table></div>`,
  },
  {
    id: "nk-data-cards",
    label: "Grid of items",
    category: "Live data",
    media: I.grid,
    content: `<div data-nk-bind-flow="" class="row g-3"><div class="col-md-4"><div class="card"><div class="card-body text-muted small">Choose what to show in Settings.</div></div></div></div>`,
  },
  {
    id: "nk-auth-gate",
    label: "Members-only area",
    category: "Live data",
    media: I.lock,
    content: `<div data-nk-auth="required"><div class="alert alert-info">Only people who are signed in see this.</div></div>`,
  },
  {
    id: "nk-user-menu",
    label: "User menu",
    category: "Live data",
    media: I.user,
    content: `<div data-nk-user-menu="" class="dropdown"><button class="btn btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">Account</button><ul class="dropdown-menu"><li><a class="dropdown-item" href="#">Profile</a></li><li><a class="dropdown-item" href="#">Settings</a></li><li><hr class="dropdown-divider"/></li><li><a class="dropdown-item" href="#" data-nk-action="logout">Sign out</a></li></ul></div>`,
  },
  {
    id: "nk-signout",
    label: "Sign out button",
    category: "Live data",
    media: I.lock,
    content: `<button class="btn btn-outline-primary" data-nk-action="logout">Sign out</button>`,
  },
  {
    id: "nk-api-call",
    label: "Button that runs a flow",
    category: "Live data",
    media: I.api,
    content: `<button class="btn btn-primary" data-nk-action="call" data-nk-flow="">Go</button>`,
  },
];

const CATEGORY_ORDER = [
  "Layout",
  "Sections",
  "Content",
  "Media",
  "Interactive",
  "Forms",
  "Commerce",
  "Social",
  "Live data",
];

export function registerBlocks(editor: Editor) {
  const bm = editor.BlockManager;
  for (const b of BLOCKS) {
    bm.add(b.id, {
      label: b.label,
      category: b.category,
      media: b.media,
      content: b.content,
    });
  }
  // Reorder categories so the panel reads top-to-bottom in a sensible flow.
  // Backbone.Collection.sort() throws "Cannot sort a set without a comparator"
  // unless a comparator is attached first — so assign one, *then* sort.
  const cats = bm.getCategories();
  const orderOf: Record<string, number> = {};
  CATEGORY_ORDER.forEach((label, idx) => {
    orderOf[label] = idx;
  });
  CATEGORY_ORDER.forEach((label, idx) => {
    const cat = cats.where({ label })[0] ?? cats.where({ id: label })[0];
    if (cat) cat.set("order", idx);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyCats = cats as any;
  anyCats.comparator = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    b: any
  ) => {
    const ao = Number(a?.get?.("order") ?? orderOf[a?.get?.("label")] ?? 999);
    const bo = Number(b?.get?.("order") ?? orderOf[b?.get?.("label")] ?? 999);
    return ao - bo;
  };
  try {
    anyCats.sort?.();
  } catch {
    // Ordering is cosmetic; never let it break the editor load.
  }
}
