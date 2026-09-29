import type { Editor } from "grapesjs";

export function registerPremadeBlocks(editor: Editor) {
  // ── 1. Pricing Table ──────────────────────────────────────────────
  editor.BlockManager.add("nk-pricing-3col", {
    label: "Pricing table",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="6" height="16" rx="1"/><rect x="10" y="2" width="6" height="20" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row text-center mb-4">
      <div class="col-12">
        <h2 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700;margin-bottom:8px">Simple, transparent pricing</h2>
        <p style="color:var(--nk-text-muted);max-width:480px;margin:0 auto">Choose the plan that fits your needs. Upgrade or downgrade at any time.</p>
      </div>
    </div>
    <div class="row justify-content-center g-4">
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);padding:40px 32px;text-align:center;height:100%">
          <div style="font-weight:600;text-transform:uppercase;font-size:13px;letter-spacing:1px;color:var(--nk-primary);margin-bottom:12px">Basic</div>
          <div style="font-size:48px;font-weight:700;color:var(--nk-text);line-height:1"><span style="font-size:22px;vertical-align:top;margin-right:2px">$</span>19<span style="font-size:16px;font-weight:400;color:var(--nk-text-muted)">/mo</span></div>
          <p style="color:var(--nk-text-muted);font-size:14px;margin:16px 0 24px">For individuals and small projects</p>
          <ul style="list-style:none;padding:0;margin:0 0 32px;text-align:left">
            <li style="padding:10px 0;border-bottom:1px solid var(--nk-border);color:var(--nk-text);font-size:15px">&#10003; &nbsp;5 projects</li>
            <li style="padding:10px 0;border-bottom:1px solid var(--nk-border);color:var(--nk-text);font-size:15px">&#10003; &nbsp;Email support</li>
            <li style="padding:10px 0;color:var(--nk-text);font-size:15px">&#10003; &nbsp;Basic analytics</li>
          </ul>
          <a href="#" style="display:inline-block;padding:12px 32px;border-radius:var(--nk-radius-sm);border:1px solid var(--nk-border);color:var(--nk-text);font-weight:600;font-size:15px;text-decoration:none">Get started</a>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-primary);border-radius:var(--nk-radius);padding:40px 32px;text-align:center;height:100%;box-shadow:var(--nk-shadow-lg);position:relative">
          <span style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;padding:4px 10px;border-radius:20px">Popular</span>
          <div style="font-weight:600;text-transform:uppercase;font-size:13px;letter-spacing:1px;color:rgba(255,255,255,.8);margin-bottom:12px">Standard</div>
          <div style="font-size:48px;font-weight:700;color:#fff;line-height:1"><span style="font-size:22px;vertical-align:top;margin-right:2px">$</span>49<span style="font-size:16px;font-weight:400;color:rgba(255,255,255,.7)">/mo</span></div>
          <p style="color:rgba(255,255,255,.7);font-size:14px;margin:16px 0 24px">For growing businesses</p>
          <ul style="list-style:none;padding:0;margin:0 0 32px;text-align:left">
            <li style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.15);color:#fff;font-size:15px">&#10003; &nbsp;Unlimited projects</li>
            <li style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.15);color:#fff;font-size:15px">&#10003; &nbsp;Priority support</li>
            <li style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.15);color:#fff;font-size:15px">&#10003; &nbsp;Advanced analytics</li>
            <li style="padding:10px 0;color:#fff;font-size:15px">&#10003; &nbsp;Team collaboration</li>
          </ul>
          <a href="#" style="display:inline-block;padding:12px 32px;border-radius:var(--nk-radius-sm);background:#fff;color:var(--nk-primary);font-weight:600;font-size:15px;text-decoration:none">Get started</a>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);padding:40px 32px;text-align:center;height:100%">
          <div style="font-weight:600;text-transform:uppercase;font-size:13px;letter-spacing:1px;color:var(--nk-primary);margin-bottom:12px">Premium</div>
          <div style="font-size:48px;font-weight:700;color:var(--nk-text);line-height:1"><span style="font-size:22px;vertical-align:top;margin-right:2px">$</span>99<span style="font-size:16px;font-weight:400;color:var(--nk-text-muted)">/mo</span></div>
          <p style="color:var(--nk-text-muted);font-size:14px;margin:16px 0 24px">For large teams and enterprises</p>
          <ul style="list-style:none;padding:0;margin:0 0 32px;text-align:left">
            <li style="padding:10px 0;border-bottom:1px solid var(--nk-border);color:var(--nk-text);font-size:15px">&#10003; &nbsp;Everything in Standard</li>
            <li style="padding:10px 0;border-bottom:1px solid var(--nk-border);color:var(--nk-text);font-size:15px">&#10003; &nbsp;Dedicated account manager</li>
            <li style="padding:10px 0;color:var(--nk-text);font-size:15px">&#10003; &nbsp;Custom integrations</li>
          </ul>
          <a href="#" style="display:inline-block;padding:12px 32px;border-radius:var(--nk-radius-sm);border:1px solid var(--nk-border);color:var(--nk-text);font-weight:600;font-size:15px;text-decoration:none">Get started</a>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 2. Testimonials ───────────────────────────────────────────────
  editor.BlockManager.add("nk-testimonials", {
    label: "Testimonials",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 7h4v4c0 2-1 3-3 4"/><path d="M15 7h4v4c0 2-1 3-3 4"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-surface-2)">
  <div class="container">
    <div class="text-center mb-5">
      <h2 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700">What our customers say</h2>
      <p style="color:var(--nk-text-muted);max-width:500px;margin:0 auto">Trusted by 25,000+ happy customers around the world.</p>
    </div>
    <div class="row g-4">
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);padding:32px;box-shadow:var(--nk-shadow);height:100%">
          <div style="font-size:32px;color:var(--nk-primary);line-height:1;margin-bottom:16px">&#10077;</div>
          <p style="color:var(--nk-text);font-size:15px;line-height:1.7;margin-bottom:24px">The team delivered an exceptional product that exceeded our expectations. Their attention to detail is unmatched.</p>
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent))"></div>
            <div>
              <div style="font-weight:600;color:var(--nk-text);font-size:15px">Sarah Johnson</div>
              <div style="color:var(--nk-text-muted);font-size:13px">CEO, TechCorp</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);padding:32px;box-shadow:var(--nk-shadow);height:100%">
          <div style="font-size:32px;color:var(--nk-primary);line-height:1;margin-bottom:16px">&#10077;</div>
          <p style="color:var(--nk-text);font-size:15px;line-height:1.7;margin-bottom:24px">Outstanding service and support. They went above and beyond to ensure our project was a success from start to finish.</p>
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--nk-accent),var(--nk-success))"></div>
            <div>
              <div style="font-weight:600;color:var(--nk-text);font-size:15px">Michael Chen</div>
              <div style="color:var(--nk-text-muted);font-size:13px">Director, DesignLab</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);padding:32px;box-shadow:var(--nk-shadow);height:100%">
          <div style="font-size:32px;color:var(--nk-primary);line-height:1;margin-bottom:16px">&#10077;</div>
          <p style="color:var(--nk-text);font-size:15px;line-height:1.7;margin-bottom:24px">A truly professional team. The quality of work and speed of delivery set them apart from anyone we have worked with.</p>
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--nk-warning),var(--nk-danger))"></div>
            <div>
              <div style="font-weight:600;color:var(--nk-text);font-size:15px">Emma Rodriguez</div>
              <div style="color:var(--nk-text-muted);font-size:13px">VP Marketing, Flowbase</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 3. Team Grid ──────────────────────────────────────────────────
  editor.BlockManager.add("nk-team-grid", {
    label: "Team grid",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19c.8-3 4-4 5-4"/><path d="M21 19c-.8-3-4-4-5-4"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="text-center mb-5">
      <h2 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700">Meet our team</h2>
      <p style="color:var(--nk-text-muted);max-width:480px;margin:0 auto">The talented people behind our success.</p>
    </div>
    <div class="row g-4">
      <div class="col-lg-3 col-md-6 text-center">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);overflow:hidden;box-shadow:var(--nk-shadow-sm);border:1px solid var(--nk-border)">
          <div style="height:240px;background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent))"></div>
          <div style="padding:24px 16px">
            <div style="font-weight:600;font-size:17px;color:var(--nk-text)">Jeremy Dupont</div>
            <div style="color:var(--nk-text-muted);font-size:14px;margin-bottom:12px">Executive Officer</div>
            <div style="display:flex;gap:12px;justify-content:center">
              <a href="#" style="color:var(--nk-text-muted);text-decoration:none;font-size:14px;font-weight:500">in</a>
              <a href="#" style="color:var(--nk-text-muted);text-decoration:none;font-size:14px;font-weight:500">tw</a>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 text-center">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);overflow:hidden;box-shadow:var(--nk-shadow-sm);border:1px solid var(--nk-border)">
          <div style="height:240px;background:linear-gradient(135deg,var(--nk-accent),var(--nk-success))"></div>
          <div style="padding:24px 16px">
            <div style="font-weight:600;font-size:17px;color:var(--nk-text)">Jessica Dover</div>
            <div style="color:var(--nk-text-muted);font-size:14px;margin-bottom:12px">Vice President</div>
            <div style="display:flex;gap:12px;justify-content:center">
              <a href="#" style="color:var(--nk-text-muted);text-decoration:none;font-size:14px;font-weight:500">in</a>
              <a href="#" style="color:var(--nk-text-muted);text-decoration:none;font-size:14px;font-weight:500">tw</a>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 text-center">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);overflow:hidden;box-shadow:var(--nk-shadow-sm);border:1px solid var(--nk-border)">
          <div style="height:240px;background:linear-gradient(135deg,var(--nk-warning),var(--nk-primary))"></div>
          <div style="padding:24px 16px">
            <div style="font-weight:600;font-size:17px;color:var(--nk-text)">Matthew Taylor</div>
            <div style="color:var(--nk-text-muted);font-size:14px;margin-bottom:12px">Financial Officer</div>
            <div style="display:flex;gap:12px;justify-content:center">
              <a href="#" style="color:var(--nk-text-muted);text-decoration:none;font-size:14px;font-weight:500">in</a>
              <a href="#" style="color:var(--nk-text-muted);text-decoration:none;font-size:14px;font-weight:500">tw</a>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 text-center">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);overflow:hidden;box-shadow:var(--nk-shadow-sm);border:1px solid var(--nk-border)">
          <div style="height:240px;background:linear-gradient(135deg,var(--nk-danger),var(--nk-warning))"></div>
          <div style="padding:24px 16px">
            <div style="font-weight:600;font-size:17px;color:var(--nk-text)">Daniel James</div>
            <div style="color:var(--nk-text-muted);font-size:14px;margin-bottom:12px">People Officer</div>
            <div style="display:flex;gap:12px;justify-content:center">
              <a href="#" style="color:var(--nk-text-muted);text-decoration:none;font-size:14px;font-weight:500">in</a>
              <a href="#" style="color:var(--nk-text-muted);text-decoration:none;font-size:14px;font-weight:500">tw</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 4. Process Steps ──────────────────────────────────────────────
  editor.BlockManager.add("nk-process-steps", {
    label: "Process steps",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><line x1="7" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="17" y2="12"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-text);color:#fff">
  <div class="container">
    <div class="text-center mb-5">
      <h2 style="font-family:var(--nk-font-display);font-weight:700;color:#fff">How it works</h2>
      <p style="color:rgba(255,255,255,.6);max-width:480px;margin:0 auto">A simple three-step process to get started.</p>
    </div>
    <div class="row g-4 text-center">
      <div class="col-md-4">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--nk-primary);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px;font-weight:700;color:#fff">01</div>
        <h5 style="font-weight:600;margin-bottom:8px;color:#fff">Choose a plan</h5>
        <p style="color:rgba(255,255,255,.55);font-size:15px;max-width:260px;margin:0 auto">Select the option that works best for your needs and budget.</p>
      </div>
      <div class="col-md-4">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--nk-primary);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px;font-weight:700;color:#fff">02</div>
        <h5 style="font-weight:600;margin-bottom:8px;color:#fff">Set up your account</h5>
        <p style="color:rgba(255,255,255,.55);font-size:15px;max-width:260px;margin:0 auto">Create your profile and configure your workspace in minutes.</p>
      </div>
      <div class="col-md-4">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--nk-primary);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px;font-weight:700;color:#fff">03</div>
        <h5 style="font-weight:600;margin-bottom:8px;color:#fff">Launch &amp; grow</h5>
        <p style="color:rgba(255,255,255,.55);font-size:15px;max-width:260px;margin:0 auto">Go live and start scaling your business with powerful tools.</p>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 5. Stats / Counters ───────────────────────────────────────────
  editor.BlockManager.add("nk-stats-counters", {
    label: "Stats counters",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="14"/><line x1="22" y1="20" x2="22" y2="8"/></svg>`,
    content: `<section style="padding:48px 0;font-family:var(--nk-font);background:var(--nk-surface-2)">
  <div class="container">
    <div class="row g-4 text-center">
      <div class="col-6 col-lg-3">
        <div style="font-size:48px;font-weight:700;color:var(--nk-text);line-height:1;margin-bottom:8px;font-family:var(--nk-font-display)">2,350</div>
        <div style="color:var(--nk-text-muted);font-weight:500;font-size:15px">&#9733; Global clients</div>
      </div>
      <div class="col-6 col-lg-3">
        <div style="font-size:48px;font-weight:700;color:var(--nk-text);line-height:1;margin-bottom:8px;font-family:var(--nk-font-display)">3,200</div>
        <div style="color:var(--nk-text-muted);font-weight:500;font-size:15px">&#9200; Hours delivered</div>
      </div>
      <div class="col-6 col-lg-3">
        <div style="font-size:48px;font-weight:700;color:var(--nk-text);line-height:1;margin-bottom:8px;font-family:var(--nk-font-display)">98%</div>
        <div style="color:var(--nk-text-muted);font-weight:500;font-size:15px">&#10003; Satisfaction rate</div>
      </div>
      <div class="col-6 col-lg-3">
        <div style="font-size:48px;font-weight:700;color:var(--nk-text);line-height:1;margin-bottom:8px;font-family:var(--nk-font-display)">120+</div>
        <div style="color:var(--nk-text-muted);font-weight:500;font-size:15px">&#127760; Countries served</div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 6. Call to Action ─────────────────────────────────────────────
  editor.BlockManager.add("nk-cta", {
    label: "Call to action",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="10" rx="3"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
    content: `<section style="padding:80px 0;font-family:var(--nk-font);background:linear-gradient(135deg,var(--nk-primary),var(--nk-primary-2));text-align:center">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <h2 style="font-family:var(--nk-font-display);font-weight:700;color:#fff;font-size:clamp(28px,4vw,42px);margin-bottom:16px">Ready to start your next project?</h2>
        <p style="color:rgba(255,255,255,.75);font-size:17px;max-width:540px;margin:0 auto 32px">We would love to hear about your ideas. Let us bring your vision to life with our expert team.</p>
        <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
          <a href="#" style="display:inline-block;padding:14px 36px;border-radius:var(--nk-radius-sm);background:#fff;color:var(--nk-primary);font-weight:600;font-size:16px;text-decoration:none;box-shadow:var(--nk-shadow)">Start a project</a>
          <a href="#" style="display:inline-block;padding:14px 36px;border-radius:var(--nk-radius-sm);border:2px solid rgba(255,255,255,.35);color:#fff;font-weight:600;font-size:16px;text-decoration:none">Learn more</a>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 7. FAQ / Accordion ────────────────────────────────────────────
  editor.BlockManager.add("nk-faq-accordion", {
    label: "FAQ accordion",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .8-1.5 1.5-1.5 2.5"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <div class="text-center mb-5">
          <h2 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700">Frequently asked questions</h2>
          <p style="color:var(--nk-text-muted)">Everything you need to know about our product and services.</p>
        </div>
        <div class="accordion" id="nkFaq">
          <div class="accordion-item" style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);margin-bottom:12px;overflow:hidden;background:var(--nk-surface)">
            <h2 class="accordion-header"><button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#nkFaq1" style="font-weight:600;font-size:16px;color:var(--nk-text);background:var(--nk-surface)">How do I get started?</button></h2>
            <div id="nkFaq1" class="accordion-collapse collapse show" data-bs-parent="#nkFaq"><div class="accordion-body" style="color:var(--nk-text-muted);font-size:15px;line-height:1.7">Simply sign up for a free account, choose your plan, and you can start building right away. No credit card required for the trial period.</div></div>
          </div>
          <div class="accordion-item" style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);margin-bottom:12px;overflow:hidden;background:var(--nk-surface)">
            <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#nkFaq2" style="font-weight:600;font-size:16px;color:var(--nk-text);background:var(--nk-surface)">Can I upgrade or downgrade my plan?</button></h2>
            <div id="nkFaq2" class="accordion-collapse collapse" data-bs-parent="#nkFaq"><div class="accordion-body" style="color:var(--nk-text-muted);font-size:15px;line-height:1.7">Yes, you can change your plan at any time. Changes take effect at the start of your next billing cycle.</div></div>
          </div>
          <div class="accordion-item" style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);margin-bottom:12px;overflow:hidden;background:var(--nk-surface)">
            <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#nkFaq3" style="font-weight:600;font-size:16px;color:var(--nk-text);background:var(--nk-surface)">What kind of support do you offer?</button></h2>
            <div id="nkFaq3" class="accordion-collapse collapse" data-bs-parent="#nkFaq"><div class="accordion-body" style="color:var(--nk-text-muted);font-size:15px;line-height:1.7">We offer email support for all plans, live chat for Standard plans, and a dedicated account manager for Premium customers.</div></div>
          </div>
          <div class="accordion-item" style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);overflow:hidden;background:var(--nk-surface)">
            <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#nkFaq4" style="font-weight:600;font-size:16px;color:var(--nk-text);background:var(--nk-surface)">Is there a free trial available?</button></h2>
            <div id="nkFaq4" class="accordion-collapse collapse" data-bs-parent="#nkFaq"><div class="accordion-body" style="color:var(--nk-text-muted);font-size:15px;line-height:1.7">Absolutely! Every new account gets a 14-day free trial with full access to all features. No credit card needed.</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 8. Client Logos ───────────────────────────────────────────────
  editor.BlockManager.add("nk-client-logos", {
    label: "Client logos",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="4" height="12" rx="1"/><rect x="10" y="6" width="4" height="12" rx="1"/><rect x="17" y="6" width="4" height="12" rx="1"/></svg>`,
    content: `<section style="padding:48px 0;font-family:var(--nk-font);background:var(--nk-surface)">
  <div class="container">
    <div class="text-center mb-4">
      <p style="color:var(--nk-text-muted);font-weight:500;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0">Trusted by leading companies</p>
    </div>
    <div class="row g-4 align-items-center justify-content-center">
      <div class="col-4 col-lg-2 text-center">
        <div style="height:48px;background:var(--nk-surface-2);border-radius:var(--nk-radius-sm);display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:700;font-size:16px;opacity:.5">Brand</div>
      </div>
      <div class="col-4 col-lg-2 text-center">
        <div style="height:48px;background:var(--nk-surface-2);border-radius:var(--nk-radius-sm);display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:700;font-size:16px;opacity:.5">Studio</div>
      </div>
      <div class="col-4 col-lg-2 text-center">
        <div style="height:48px;background:var(--nk-surface-2);border-radius:var(--nk-radius-sm);display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:700;font-size:16px;opacity:.5">Agency</div>
      </div>
      <div class="col-4 col-lg-2 text-center">
        <div style="height:48px;background:var(--nk-surface-2);border-radius:var(--nk-radius-sm);display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:700;font-size:16px;opacity:.5">Corp</div>
      </div>
      <div class="col-4 col-lg-2 text-center">
        <div style="height:48px;background:var(--nk-surface-2);border-radius:var(--nk-radius-sm);display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:700;font-size:16px;opacity:.5">Tech</div>
      </div>
      <div class="col-4 col-lg-2 text-center">
        <div style="height:48px;background:var(--nk-surface-2);border-radius:var(--nk-radius-sm);display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:700;font-size:16px;opacity:.5">Labs</div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 9. Image Gallery ──────────────────────────────────────────────
  editor.BlockManager.add("nk-image-gallery", {
    label: "Image gallery",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="text-center mb-5">
      <h2 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700">Our work</h2>
      <p style="color:var(--nk-text-muted);max-width:480px;margin:0 auto">A selection of our recent projects and creative endeavors.</p>
    </div>
    <div class="row g-3">
      <div class="col-md-8">
        <div style="height:320px;border-radius:var(--nk-radius);background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent));display:flex;align-items:end;padding:24px;overflow:hidden">
          <span style="color:#fff;font-weight:600;font-size:18px">Featured project</span>
        </div>
      </div>
      <div class="col-md-4">
        <div style="height:320px;border-radius:var(--nk-radius);background:linear-gradient(135deg,var(--nk-accent),var(--nk-success));display:flex;align-items:end;padding:24px;overflow:hidden">
          <span style="color:#fff;font-weight:600;font-size:18px">Branding</span>
        </div>
      </div>
      <div class="col-md-4">
        <div style="height:240px;border-radius:var(--nk-radius);background:linear-gradient(135deg,var(--nk-warning),var(--nk-danger));display:flex;align-items:end;padding:24px;overflow:hidden">
          <span style="color:#fff;font-weight:600;font-size:18px">Photography</span>
        </div>
      </div>
      <div class="col-md-4">
        <div style="height:240px;border-radius:var(--nk-radius);background:linear-gradient(135deg,var(--nk-danger),var(--nk-primary));display:flex;align-items:end;padding:24px;overflow:hidden">
          <span style="color:#fff;font-weight:600;font-size:18px">Web design</span>
        </div>
      </div>
      <div class="col-md-4">
        <div style="height:240px;border-radius:var(--nk-radius);background:linear-gradient(135deg,var(--nk-primary-2),var(--nk-accent));display:flex;align-items:end;padding:24px;overflow:hidden">
          <span style="color:#fff;font-weight:600;font-size:18px">Illustration</span>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 10. Feature Cards ─────────────────────────────────────────────
  editor.BlockManager.add("nk-feature-cards", {
    label: "Feature cards",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-surface-2)">
  <div class="container">
    <div class="text-center mb-5">
      <h2 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700">Everything you need</h2>
      <p style="color:var(--nk-text-muted);max-width:480px;margin:0 auto">Powerful features to help your business grow.</p>
    </div>
    <div class="row g-4">
      <div class="col-lg-4 col-md-6">
        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="width:48px;height:48px;flex-shrink:0;border-radius:var(--nk-radius-sm);background:var(--nk-primary);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px">&#9881;</div>
          <div>
            <div style="font-weight:600;color:var(--nk-text);font-size:16px;margin-bottom:6px">Easy customization</div>
            <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.6;margin:0">Tailor every aspect of your project with intuitive visual controls.</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="width:48px;height:48px;flex-shrink:0;border-radius:var(--nk-radius-sm);background:var(--nk-accent);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px">&#9889;</div>
          <div>
            <div style="font-weight:600;color:var(--nk-text);font-size:16px;margin-bottom:6px">Lightning fast</div>
            <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.6;margin:0">Optimized for performance with lazy loading and minimal bundles.</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="width:48px;height:48px;flex-shrink:0;border-radius:var(--nk-radius-sm);background:var(--nk-success);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px">&#9989;</div>
          <div>
            <div style="font-weight:600;color:var(--nk-text);font-size:16px;margin-bottom:6px">Reliable uptime</div>
            <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.6;margin:0">99.9% uptime guarantee with automatic scaling and redundancy.</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="width:48px;height:48px;flex-shrink:0;border-radius:var(--nk-radius-sm);background:var(--nk-warning);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px">&#128274;</div>
          <div>
            <div style="font-weight:600;color:var(--nk-text);font-size:16px;margin-bottom:6px">Secure by default</div>
            <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.6;margin:0">Enterprise-grade security with encryption and compliance built in.</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="width:48px;height:48px;flex-shrink:0;border-radius:var(--nk-radius-sm);background:var(--nk-danger);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px">&#10084;</div>
          <div>
            <div style="font-weight:600;color:var(--nk-text);font-size:16px;margin-bottom:6px">Customer support</div>
            <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.6;margin:0">Dedicated support team available around the clock for all users.</p>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="width:48px;height:48px;flex-shrink:0;border-radius:var(--nk-radius-sm);background:var(--nk-primary-2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px">&#128640;</div>
          <div>
            <div style="font-weight:600;color:var(--nk-text);font-size:16px;margin-bottom:6px">Scale with ease</div>
            <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.6;margin:0">Grow from prototype to production without changing your stack.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 11. Newsletter Signup ─────────────────────────────────────────
  editor.BlockManager.add("nk-newsletter", {
    label: "Newsletter signup",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><polyline points="3 8 12 14 21 8"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-surface-2)">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-6 text-center">
        <h2 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700;margin-bottom:12px">Stay in the loop</h2>
        <p style="color:var(--nk-text-muted);margin-bottom:32px">Get the latest updates and offers delivered straight to your inbox.</p>
        <div style="display:flex;gap:12px;max-width:460px;margin:0 auto">
          <input type="email" placeholder="Enter your email" style="flex:1;padding:14px 20px;border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);font-size:15px;background:var(--nk-surface);color:var(--nk-text);outline:none;font-family:var(--nk-font)">
          <a href="#" style="display:inline-block;padding:14px 28px;border-radius:var(--nk-radius-sm);background:var(--nk-primary);color:#fff;font-weight:600;font-size:15px;text-decoration:none;white-space:nowrap">Subscribe</a>
        </div>
        <p style="color:var(--nk-text-muted);font-size:13px;margin-top:16px">We respect your privacy. Unsubscribe at any time.</p>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 12. Tabs Content ──────────────────────────────────────────────
  editor.BlockManager.add("nk-tabs-content", {
    label: "Tabs content",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="9" x2="8" y2="5"/><line x1="14" y1="9" x2="14" y2="5"/><rect x="3" y="9" width="18" height="11" rx="1"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-10">
        <ul class="nav nav-tabs justify-content-center mb-4" id="nkTabs" role="tablist" style="border-bottom:2px solid var(--nk-border);gap:4px">
          <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#nkTab1" style="font-weight:600;font-size:16px;color:var(--nk-text);border:none;padding:12px 24px">Planning</a></li>
          <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#nkTab2" style="font-weight:600;font-size:16px;color:var(--nk-text-muted);border:none;padding:12px 24px">Research</a></li>
          <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#nkTab3" style="font-weight:600;font-size:16px;color:var(--nk-text-muted);border:none;padding:12px 24px">Launch</a></li>
        </ul>
        <div class="tab-content">
          <div class="tab-pane fade show active" id="nkTab1">
            <div class="row align-items-center g-4">
              <div class="col-md-6">
                <div style="height:320px;border-radius:var(--nk-radius);background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent))"></div>
              </div>
              <div class="col-md-6">
                <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:var(--nk-surface-2);color:var(--nk-primary);font-size:13px;font-weight:600;text-transform:uppercase;margin-bottom:16px">Step 1</span>
                <h3 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700">Strategic planning</h3>
                <p style="color:var(--nk-text-muted);font-size:15px;line-height:1.7;margin-bottom:24px">We map out every detail of your project to ensure a smooth development process from concept to completion.</p>
                <a href="#" style="display:inline-block;padding:12px 28px;border-radius:var(--nk-radius-sm);background:var(--nk-primary);color:#fff;font-weight:600;font-size:15px;text-decoration:none">Learn more</a>
              </div>
            </div>
          </div>
          <div class="tab-pane fade" id="nkTab2">
            <div class="row align-items-center g-4">
              <div class="col-md-6">
                <div style="height:320px;border-radius:var(--nk-radius);background:linear-gradient(135deg,var(--nk-accent),var(--nk-success))"></div>
              </div>
              <div class="col-md-6">
                <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:var(--nk-surface-2);color:var(--nk-primary);font-size:13px;font-weight:600;text-transform:uppercase;margin-bottom:16px">Step 2</span>
                <h3 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700">In-depth research</h3>
                <p style="color:var(--nk-text-muted);font-size:15px;line-height:1.7;margin-bottom:24px">Data-driven research helps us understand your audience and create solutions that deliver measurable results.</p>
                <a href="#" style="display:inline-block;padding:12px 28px;border-radius:var(--nk-radius-sm);background:var(--nk-primary);color:#fff;font-weight:600;font-size:15px;text-decoration:none">Learn more</a>
              </div>
            </div>
          </div>
          <div class="tab-pane fade" id="nkTab3">
            <div class="row align-items-center g-4">
              <div class="col-md-6">
                <div style="height:320px;border-radius:var(--nk-radius);background:linear-gradient(135deg,var(--nk-warning),var(--nk-danger))"></div>
              </div>
              <div class="col-md-6">
                <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:var(--nk-surface-2);color:var(--nk-primary);font-size:13px;font-weight:600;text-transform:uppercase;margin-bottom:16px">Step 3</span>
                <h3 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700">Successful launch</h3>
                <p style="color:var(--nk-text-muted);font-size:15px;line-height:1.7;margin-bottom:24px">We handle every detail of deployment so your product reaches your audience flawlessly and on schedule.</p>
                <a href="#" style="display:inline-block;padding:12px 28px;border-radius:var(--nk-radius-sm);background:var(--nk-primary);color:#fff;font-weight:600;font-size:15px;text-decoration:none">Learn more</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 13. Reviews ───────────────────────────────────────────────────
  editor.BlockManager.add("nk-reviews", {
    label: "Reviews",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 7h4v4c0 2-1 3-3 4"/><path d="M15 7h4v4c0 2-1 3-3 4"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row g-4">
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);overflow:hidden;box-shadow:var(--nk-shadow);height:100%;display:flex;flex-direction:column">
          <div style="height:200px;background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent));position:relative">
            <div style="position:absolute;top:16px;right:16px;background:var(--nk-warning);color:#fff;font-size:13px;padding:4px 12px;border-radius:16px">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          </div>
          <div style="padding:28px 24px;flex:1">
            <p style="color:var(--nk-text);font-size:15px;line-height:1.7;margin-bottom:0">Exceptional quality and outstanding service. The team went above and beyond to deliver a perfect result.</p>
          </div>
          <div style="padding:16px 24px;border-top:1px solid var(--nk-border)">
            <span style="font-weight:700;color:var(--nk-text);font-size:14px;text-transform:uppercase">Jacob Kalling</span>
            <span style="color:var(--nk-text-muted);font-size:13px"> &mdash; Walmart</span>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);overflow:hidden;box-shadow:var(--nk-shadow);height:100%;display:flex;flex-direction:column">
          <div style="height:200px;background:linear-gradient(135deg,var(--nk-accent),var(--nk-success));position:relative">
            <div style="position:absolute;top:16px;right:16px;background:var(--nk-warning);color:#fff;font-size:13px;padding:4px 12px;border-radius:16px">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          </div>
          <div style="padding:28px 24px;flex:1">
            <p style="color:var(--nk-text);font-size:15px;line-height:1.7;margin-bottom:0">Professional support and energy throughout the entire project. Truly a collaborative and creative process.</p>
          </div>
          <div style="padding:16px 24px;border-top:1px solid var(--nk-border)">
            <span style="font-weight:700;color:var(--nk-text);font-size:14px;text-transform:uppercase">Shoko Mugikura</span>
            <span style="color:var(--nk-text-muted);font-size:13px"> &mdash; PayPal</span>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);overflow:hidden;box-shadow:var(--nk-shadow);height:100%;display:flex;flex-direction:column">
          <div style="height:200px;background:linear-gradient(135deg,var(--nk-warning),var(--nk-danger));position:relative">
            <div style="position:absolute;top:16px;right:16px;background:var(--nk-warning);color:#fff;font-size:13px;padding:4px 12px;border-radius:16px">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          </div>
          <div style="padding:28px 24px;flex:1">
            <p style="color:var(--nk-text);font-size:15px;line-height:1.7;margin-bottom:0">Easy to work with and delivered amazing results in a very short timeframe. Highly recommend their services.</p>
          </div>
          <div style="padding:16px 24px;border-top:1px solid var(--nk-border)">
            <span style="font-weight:700;color:var(--nk-text);font-size:14px;text-transform:uppercase">Alexa Harvard</span>
            <span style="color:var(--nk-text-muted);font-size:13px"> &mdash; Monday</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 14. Services Grid ─────────────────────────────────────────────
  editor.BlockManager.add("nk-services-grid", {
    label: "Services grid",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="text-center mb-5">
      <h2 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700">What we offer</h2>
      <p style="color:var(--nk-text-muted);max-width:480px;margin:0 auto">Professional services tailored to your business needs.</p>
    </div>
    <div class="row g-4">
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);overflow:hidden;height:100%">
          <div style="height:180px;background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent))"></div>
          <div style="padding:28px 24px">
            <h5 style="font-weight:600;color:var(--nk-text);margin-bottom:8px">Web Development</h5>
            <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.6;margin-bottom:16px">Custom websites and web applications built with modern technologies.</p>
            <div style="font-size:22px;font-weight:700;color:var(--nk-text)">$2,500 <span style="font-size:14px;font-weight:400;color:var(--nk-text-muted)">starting</span></div>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);overflow:hidden;height:100%">
          <div style="height:180px;background:linear-gradient(135deg,var(--nk-accent),var(--nk-success))"></div>
          <div style="padding:28px 24px">
            <h5 style="font-weight:600;color:var(--nk-text);margin-bottom:8px">Brand Design</h5>
            <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.6;margin-bottom:16px">Complete brand identity from logo design to full style guidelines.</p>
            <div style="font-size:22px;font-weight:700;color:var(--nk-text)">$1,800 <span style="font-size:14px;font-weight:400;color:var(--nk-text-muted)">starting</span></div>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);overflow:hidden;height:100%">
          <div style="height:180px;background:linear-gradient(135deg,var(--nk-warning),var(--nk-danger))"></div>
          <div style="padding:28px 24px">
            <h5 style="font-weight:600;color:var(--nk-text);margin-bottom:8px">Digital Marketing</h5>
            <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.6;margin-bottom:16px">SEO, social media, and paid advertising strategies that convert.</p>
            <div style="font-size:22px;font-weight:700;color:var(--nk-text)">$1,200 <span style="font-size:14px;font-weight:400;color:var(--nk-text-muted)">/month</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 15. Contact Form ──────────────────────────────────────────────
  editor.BlockManager.add("nk-contact-form", {
    label: "Contact form",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><polyline points="3 8 12 14 21 8"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-surface-2)">
  <div class="container">
    <div class="row justify-content-center g-4">
      <div class="col-lg-5">
        <h2 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700;margin-bottom:16px">Get in touch</h2>
        <p style="color:var(--nk-text-muted);margin-bottom:32px;font-size:15px;line-height:1.7">Have a question or want to work together? Fill out the form and we will get back to you within 24 hours.</p>
        <div style="margin-bottom:20px">
          <div style="font-weight:600;color:var(--nk-text);font-size:15px;margin-bottom:4px">&#128205; Address</div>
          <div style="color:var(--nk-text-muted);font-size:14px">401 Broadway, 24th Floor, New York</div>
        </div>
        <div style="margin-bottom:20px">
          <div style="font-weight:600;color:var(--nk-text);font-size:15px;margin-bottom:4px">&#128222; Phone</div>
          <div style="color:var(--nk-text-muted);font-size:14px">+1 (800) 222-000</div>
        </div>
        <div>
          <div style="font-weight:600;color:var(--nk-text);font-size:15px;margin-bottom:4px">&#9993; Email</div>
          <div style="color:var(--nk-text-muted);font-size:14px">hello@yoursite.com</div>
        </div>
      </div>
      <div class="col-lg-5">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);padding:32px;box-shadow:var(--nk-shadow)">
          <div style="margin-bottom:16px">
            <label style="display:block;font-weight:500;font-size:14px;color:var(--nk-text);margin-bottom:6px">Name</label>
            <input type="text" placeholder="Your name" style="width:100%;padding:12px 16px;border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);font-size:15px;background:var(--nk-bg);color:var(--nk-text);outline:none;font-family:var(--nk-font)">
          </div>
          <div style="margin-bottom:16px">
            <label style="display:block;font-weight:500;font-size:14px;color:var(--nk-text);margin-bottom:6px">Email</label>
            <input type="email" placeholder="Your email" style="width:100%;padding:12px 16px;border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);font-size:15px;background:var(--nk-bg);color:var(--nk-text);outline:none;font-family:var(--nk-font)">
          </div>
          <div style="margin-bottom:24px">
            <label style="display:block;font-weight:500;font-size:14px;color:var(--nk-text);margin-bottom:6px">Message</label>
            <textarea placeholder="Tell us about your project" rows="4" style="width:100%;padding:12px 16px;border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);font-size:15px;background:var(--nk-bg);color:var(--nk-text);outline:none;resize:vertical;font-family:var(--nk-font)"></textarea>
          </div>
          <a href="#" style="display:inline-block;padding:14px 32px;border-radius:var(--nk-radius-sm);background:var(--nk-primary);color:#fff;font-weight:600;font-size:15px;text-decoration:none;width:100%;text-align:center">Send message</a>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 16. Banner Card ───────────────────────────────────────────────
  editor.BlockManager.add("nk-banner-card", {
    label: "Banner card",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="10" rx="3"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
    content: `<section style="padding:32px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row g-4">
      <div class="col-md-6">
        <div style="border-radius:var(--nk-radius);overflow:hidden;height:320px;background:linear-gradient(135deg,var(--nk-primary),var(--nk-primary-2));position:relative;display:flex;flex-direction:column;justify-content:flex-end;padding:32px">
          <span style="display:inline-block;padding:4px 12px;background:rgba(255,255,255,.2);color:#fff;font-size:12px;font-weight:600;text-transform:uppercase;border-radius:4px;margin-bottom:12px;width:fit-content">50% Off</span>
          <h4 style="color:#fff;font-weight:600;margin-bottom:4px">Premium collection</h4>
          <p style="color:rgba(255,255,255,.7);font-size:14px;margin:0">Exclusive designs crafted for professionals.</p>
        </div>
      </div>
      <div class="col-md-6">
        <div style="border-radius:var(--nk-radius);overflow:hidden;height:320px;background:linear-gradient(135deg,var(--nk-accent),var(--nk-success));position:relative;display:flex;flex-direction:column;justify-content:flex-end;padding:32px">
          <span style="display:inline-block;padding:4px 12px;background:rgba(255,255,255,.2);color:#fff;font-size:12px;font-weight:600;text-transform:uppercase;border-radius:4px;margin-bottom:12px;width:fit-content">New</span>
          <h4 style="color:#fff;font-weight:600;margin-bottom:4px">Expert services</h4>
          <p style="color:rgba(255,255,255,.7);font-size:14px;margin:0">Unlock your full potential with our team.</p>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 17. Event Card ────────────────────────────────────────────────
  editor.BlockManager.add("nk-event-card", {
    label: "Event card",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="2" x2="9" y2="6"/><line x1="15" y1="2" x2="15" y2="6"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-text);color:#fff">
  <div class="container">
    <div class="text-center mb-5">
      <h2 style="font-family:var(--nk-font-display);font-weight:700;color:#fff">Event schedule</h2>
      <p style="color:rgba(255,255,255,.5)">Upcoming sessions and workshops.</p>
    </div>
    <div class="row g-4">
      <div class="col-lg-4 col-md-6">
        <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:var(--nk-radius);padding:32px;height:100%">
          <div style="font-size:18px;font-weight:600;color:#fff;margin-bottom:16px">Friday, Dec 24</div>
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)">
            <div style="color:rgba(255,255,255,.8);font-size:14px">Psychology Workshop</div>
            <div style="color:rgba(255,255,255,.4);font-size:13px">10:00 AM - 12:30 PM</div>
          </div>
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)">
            <div style="color:rgba(255,255,255,.8);font-size:14px">Sociology Panel</div>
            <div style="color:rgba(255,255,255,.4);font-size:13px">2:00 PM - 4:30 PM</div>
          </div>
          <div>
            <div style="color:rgba(255,255,255,.8);font-size:14px">Networking Event</div>
            <div style="color:rgba(255,255,255,.4);font-size:13px">5:00 PM - 7:30 PM</div>
          </div>
          <div style="font-size:72px;font-weight:700;color:rgba(255,255,255,.05);text-align:right;margin-top:16px;line-height:1">01</div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:var(--nk-radius);padding:32px;height:100%">
          <div style="font-size:18px;font-weight:600;color:#fff;margin-bottom:16px">Saturday, Dec 25</div>
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)">
            <div style="color:rgba(255,255,255,.8);font-size:14px">Economics Forum</div>
            <div style="color:rgba(255,255,255,.4);font-size:13px">10:00 AM - 12:30 PM</div>
          </div>
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)">
            <div style="color:rgba(255,255,255,.8);font-size:14px">Engineering Talk</div>
            <div style="color:rgba(255,255,255,.4);font-size:13px">2:00 PM - 4:30 PM</div>
          </div>
          <div>
            <div style="color:rgba(255,255,255,.8);font-size:14px">Closing Ceremony</div>
            <div style="color:rgba(255,255,255,.4);font-size:13px">5:00 PM - 7:30 PM</div>
          </div>
          <div style="font-size:72px;font-weight:700;color:rgba(255,255,255,.05);text-align:right;margin-top:16px;line-height:1">02</div>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:var(--nk-radius);padding:32px;height:100%">
          <div style="font-size:18px;font-weight:600;color:#fff;margin-bottom:16px">Sunday, Dec 26</div>
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)">
            <div style="color:rgba(255,255,255,.8);font-size:14px">Biology Seminar</div>
            <div style="color:rgba(255,255,255,.4);font-size:13px">10:00 AM - 12:30 PM</div>
          </div>
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)">
            <div style="color:rgba(255,255,255,.8);font-size:14px">Open Mic Session</div>
            <div style="color:rgba(255,255,255,.4);font-size:13px">2:00 PM - 4:30 PM</div>
          </div>
          <div>
            <div style="color:rgba(255,255,255,.8);font-size:14px">Farewell Dinner</div>
            <div style="color:rgba(255,255,255,.4);font-size:13px">5:00 PM - 7:30 PM</div>
          </div>
          <div style="font-size:72px;font-weight:700;color:rgba(255,255,255,.05);text-align:right;margin-top:16px;line-height:1">03</div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── 18. Fancy Heading ─────────────────────────────────────────────
  editor.BlockManager.add("nk-fancy-heading", {
    label: "Fancy heading",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="6" y1="6" x2="6" y2="18"/><line x1="14" y1="6" x2="14" y2="18"/><line x1="6" y1="12" x2="14" y2="12"/></svg>`,
    content: `<section style="padding:100px 0;font-family:var(--nk-font-display);background:var(--nk-surface-2);text-align:center;overflow:hidden">
  <div class="container">
    <div style="font-size:clamp(48px,10vw,140px);font-weight:800;line-height:1;color:var(--nk-text);letter-spacing:-3px">
      Creative<br>
      <span style="background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">solutions.</span>
    </div>
    <p style="color:var(--nk-text-muted);font-size:18px;max-width:500px;margin:24px auto 0;font-family:var(--nk-font);font-weight:400;letter-spacing:0">Beautifully crafted designs that speak for themselves.</p>
  </div>
</section>`,
  });

  // ── 19. Marquee Text ──────────────────────────────────────────────
  editor.BlockManager.add("nk-marquee-text", {
    label: "Marquee text",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="2" y1="12" x2="22" y2="12"/><polyline points="18 8 22 12 18 16"/><line x1="4" y1="7" x2="4" y2="17"/></svg>`,
    content: `<section style="padding:48px 0;font-family:var(--nk-font-display);background:var(--nk-bg);overflow:hidden">
  <div style="display:flex;gap:48px;white-space:nowrap;animation:nkMarquee 20s linear infinite">
    <span style="font-size:clamp(48px,8vw,120px);font-weight:700;color:var(--nk-text);letter-spacing:-2px">Developers</span>
    <span style="font-size:clamp(48px,8vw,120px);font-weight:700;color:var(--nk-text);opacity:.15;letter-spacing:-2px">&#8226;</span>
    <span style="font-size:clamp(48px,8vw,120px);font-weight:700;color:var(--nk-primary);letter-spacing:-2px">Designers</span>
    <span style="font-size:clamp(48px,8vw,120px);font-weight:700;color:var(--nk-text);opacity:.15;letter-spacing:-2px">&#8226;</span>
    <span style="font-size:clamp(48px,8vw,120px);font-weight:700;color:var(--nk-text);letter-spacing:-2px">Thinkers</span>
    <span style="font-size:clamp(48px,8vw,120px);font-weight:700;color:var(--nk-text);opacity:.15;letter-spacing:-2px">&#8226;</span>
    <span style="font-size:clamp(48px,8vw,120px);font-weight:700;color:var(--nk-accent);letter-spacing:-2px">Innovators</span>
    <span style="font-size:clamp(48px,8vw,120px);font-weight:700;color:var(--nk-text);opacity:.15;letter-spacing:-2px">&#8226;</span>
    <span style="font-size:clamp(48px,8vw,120px);font-weight:700;color:var(--nk-text);letter-spacing:-2px">Dreamers</span>
  </div>
  <style>@keyframes nkMarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}</style>
</section>`,
  });

  // ── 20. List Items ────────────────────────────────────────────────
  editor.BlockManager.add("nk-list-items", {
    label: "List items",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="5" cy="6" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="5" cy="18" r="1.5"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-10">
        <div style="border-bottom:2px solid var(--nk-text);padding-bottom:40px;margin-bottom:40px;display:flex;align-items:center;gap:32px;flex-wrap:wrap">
          <span style="font-size:48px;font-weight:700;color:var(--nk-text);font-family:var(--nk-font-display);line-height:1;flex-shrink:0;width:60px">01</span>
          <div style="flex:1;min-width:200px">
            <h4 style="color:var(--nk-text);font-weight:600;margin-bottom:6px">Strategy &amp; consulting</h4>
            <p style="color:var(--nk-text-muted);font-size:15px;margin:0;line-height:1.6">We help define your vision and create a roadmap for success with data-driven strategies.</p>
          </div>
          <a href="#" style="flex-shrink:0;width:48px;height:48px;border-radius:50%;border:2px solid var(--nk-border);display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--nk-text);font-size:20px">&#8594;</a>
        </div>
        <div style="border-bottom:2px solid var(--nk-text);padding-bottom:40px;margin-bottom:40px;display:flex;align-items:center;gap:32px;flex-wrap:wrap">
          <span style="font-size:48px;font-weight:700;color:var(--nk-text);font-family:var(--nk-font-display);line-height:1;flex-shrink:0;width:60px">02</span>
          <div style="flex:1;min-width:200px">
            <h4 style="color:var(--nk-text);font-weight:600;margin-bottom:6px">Design &amp; development</h4>
            <p style="color:var(--nk-text-muted);font-size:15px;margin:0;line-height:1.6">Beautiful interfaces and robust code come together to create exceptional digital products.</p>
          </div>
          <a href="#" style="flex-shrink:0;width:48px;height:48px;border-radius:50%;border:2px solid var(--nk-border);display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--nk-text);font-size:20px">&#8594;</a>
        </div>
        <div style="border-bottom:2px solid var(--nk-text);padding-bottom:40px;margin-bottom:40px;display:flex;align-items:center;gap:32px;flex-wrap:wrap">
          <span style="font-size:48px;font-weight:700;color:var(--nk-text);font-family:var(--nk-font-display);line-height:1;flex-shrink:0;width:60px">03</span>
          <div style="flex:1;min-width:200px">
            <h4 style="color:var(--nk-text);font-weight:600;margin-bottom:6px">Marketing &amp; growth</h4>
            <p style="color:var(--nk-text-muted);font-size:15px;margin:0;line-height:1.6">Expand your reach and convert more customers with targeted marketing campaigns.</p>
          </div>
          <a href="#" style="flex-shrink:0;width:48px;height:48px;border-radius:50%;border:2px solid var(--nk-border);display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--nk-text);font-size:20px">&#8594;</a>
        </div>
        <div style="display:flex;align-items:center;gap:32px;flex-wrap:wrap">
          <span style="font-size:48px;font-weight:700;color:var(--nk-text);font-family:var(--nk-font-display);line-height:1;flex-shrink:0;width:60px">04</span>
          <div style="flex:1;min-width:200px">
            <h4 style="color:var(--nk-text);font-weight:600;margin-bottom:6px">Support &amp; maintenance</h4>
            <p style="color:var(--nk-text-muted);font-size:15px;margin:0;line-height:1.6">Ongoing support to keep your platform running smoothly and up to date.</p>
          </div>
          <a href="#" style="flex-shrink:0;width:48px;height:48px;border-radius:50%;border:2px solid var(--nk-border);display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--nk-text);font-size:20px">&#8594;</a>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ═══════════════════════════════════════════════════════════════════
  //  LITHO BLOCKS
  // ═══════════════════════════════════════════════════════════════════

  // ── Litho 1. Footer · Dark ────────────────────────────────────────
  editor.BlockManager.add("nk-litho-footer-dark", {
    label: "Footer \u00b7 Dark",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="16" x2="21" y2="16"/></svg>`,
    content: `<footer style="background:var(--nk-text);color:rgba(255,255,255,.7);font-family:var(--nk-font)">
  <div class="container" style="padding:64px 0 0">
    <div class="row g-4">
      <div class="col-lg-3 col-sm-6">
        <h6 style="color:#fff;font-family:var(--nk-font-display);font-weight:600;margin-bottom:20px;font-size:15px">Company</h6>
        <ul style="list-style:none;padding:0;margin:0">
          <li style="margin-bottom:10px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">About company</a></li>
          <li style="margin-bottom:10px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Company services</a></li>
          <li style="margin-bottom:10px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Job opportunities</a></li>
          <li><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Contact us</a></li>
        </ul>
      </div>
      <div class="col-lg-3 col-sm-6">
        <h6 style="color:#fff;font-family:var(--nk-font-display);font-weight:600;margin-bottom:20px;font-size:15px">Customer</h6>
        <ul style="list-style:none;padding:0;margin:0">
          <li style="margin-bottom:10px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Client support</a></li>
          <li style="margin-bottom:10px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Pricing packages</a></li>
          <li style="margin-bottom:10px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Company history</a></li>
          <li><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Our process</a></li>
        </ul>
      </div>
      <div class="col-lg-3 col-sm-6">
        <h6 style="color:#fff;font-family:var(--nk-font-display);font-weight:600;margin-bottom:20px;font-size:15px">Get in touch</h6>
        <p style="font-size:14px;line-height:1.7;margin-bottom:12px">27 Eden Walk, Eden Centre,<br>Orchard View, Paris, France</p>
        <div style="font-size:14px;margin-bottom:6px">&#9742; &nbsp;+1 234 567 8910</div>
        <div style="font-size:14px">&#9993; &nbsp;<a href="mailto:info@yourdomain.com" style="color:rgba(255,255,255,.6);text-decoration:none">info@yourdomain.com</a></div>
      </div>
      <div class="col-lg-3 col-sm-6">
        <h6 style="color:#fff;font-family:var(--nk-font-display);font-weight:600;margin-bottom:20px;font-size:15px">Follow us</h6>
        <div style="display:flex;gap:12px;margin-top:8px">
          <a href="#" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.2);display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">f</a>
          <a href="#" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.2);display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">&#120143;</a>
          <a href="#" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.2);display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">in</a>
        </div>
      </div>
    </div>
  </div>
  <div style="border-top:1px solid rgba(255,255,255,.1);margin-top:48px;padding:28px 0">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-md-6 text-center text-md-start" style="font-size:13px;color:rgba(255,255,255,.45)">&copy; 2025 Your Company. All rights reserved.</div>
        <div class="col-md-6 text-center text-md-end" style="font-size:13px"><a href="#" style="color:rgba(255,255,255,.45);text-decoration:none;margin-left:16px">Privacy</a><a href="#" style="color:rgba(255,255,255,.45);text-decoration:none;margin-left:16px">Terms</a></div>
      </div>
    </div>
  </div>
</footer>`,
  });

  // ── Litho 2. Footer · Centered ────────────────────────────────────
  editor.BlockManager.add("nk-litho-footer-centered", {
    label: "Footer \u00b7 Centered",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="16" x2="21" y2="16"/></svg>`,
    content: `<footer style="background:var(--nk-text);color:rgba(255,255,255,.7);font-family:var(--nk-font)">
  <div style="border-bottom:1px solid rgba(255,255,255,.1);padding:32px 0">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-md-3 text-center text-md-start" style="margin-bottom:16px">
          <span style="font-family:var(--nk-font-display);font-weight:700;font-size:22px;color:#fff">Logo</span>
        </div>
        <div class="col-md-6 text-center" style="margin-bottom:16px">
          <span style="font-size:14px;font-weight:500;color:rgba(255,255,255,.8)">Ready to work with us? &nbsp;</span>
          <a href="#" style="color:#fff;font-weight:600;font-size:14px;text-decoration:underline;text-underline-offset:3px">Start a project &#8594;</a>
        </div>
        <div class="col-md-3 text-center text-md-end">
          <div style="display:flex;gap:10px;justify-content:center">
            <a href="#" style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.2);display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);text-decoration:none;font-size:13px">f</a>
            <a href="#" style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.2);display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);text-decoration:none;font-size:13px">&#120143;</a>
            <a href="#" style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.2);display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);text-decoration:none;font-size:13px">in</a>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="container" style="padding:56px 0 0">
    <div class="row justify-content-center g-4">
      <div class="col-lg-3 col-sm-6">
        <h6 style="color:#fff;font-weight:600;font-size:15px;margin-bottom:18px">About company</h6>
        <p style="font-size:14px;line-height:1.8;margin:0">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore.</p>
      </div>
      <div class="col-lg-2 col-sm-6">
        <h6 style="color:#fff;font-weight:600;font-size:15px;margin-bottom:18px">Company</h6>
        <ul style="list-style:none;padding:0;margin:0">
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">About</a></li>
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Services</a></li>
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Careers</a></li>
          <li><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Contact</a></li>
        </ul>
      </div>
      <div class="col-lg-2 col-sm-6">
        <h6 style="color:#fff;font-weight:600;font-size:15px;margin-bottom:18px">Customer</h6>
        <ul style="list-style:none;padding:0;margin:0">
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Support</a></li>
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">News</a></li>
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Story</a></li>
          <li><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Pricing</a></li>
        </ul>
      </div>
      <div class="col-lg-4 col-sm-6">
        <h6 style="color:#fff;font-weight:600;font-size:15px;margin-bottom:18px">Subscribe to newsletter</h6>
        <p style="font-size:14px;margin-bottom:16px">Enter your email for valuable newsletters.</p>
        <div style="display:flex;gap:0">
          <input type="email" placeholder="Enter your email" style="flex:1;padding:10px 14px;border:1px solid rgba(255,255,255,.15);border-right:none;border-radius:var(--nk-radius-sm) 0 0 var(--nk-radius-sm);background:transparent;color:#fff;font-size:14px;outline:none">
          <button style="padding:10px 18px;background:var(--nk-primary);color:#fff;border:none;border-radius:0 var(--nk-radius-sm) var(--nk-radius-sm) 0;font-size:14px;cursor:pointer">&#9993;</button>
        </div>
      </div>
    </div>
  </div>
  <div style="margin-top:48px;padding:24px 0;text-align:center;border-top:1px solid rgba(255,255,255,.1)">
    <span style="font-size:13px;color:rgba(255,255,255,.4)">&copy; 2025 Your Company. All rights reserved.</span>
  </div>
</footer>`,
  });

  // ── Litho 3. Footer · Newsletter ──────────────────────────────────
  editor.BlockManager.add("nk-litho-footer-newsletter", {
    label: "Footer \u00b7 Newsletter",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="16" x2="21" y2="16"/></svg>`,
    content: `<footer style="background:var(--nk-text);color:rgba(255,255,255,.7);font-family:var(--nk-font)">
  <div class="container" style="padding:56px 0">
    <div class="row justify-content-center g-4">
      <div class="col-lg-3 col-sm-6">
        <h6 style="color:#fff;font-weight:600;font-size:15px;margin-bottom:18px">Company</h6>
        <ul style="list-style:none;padding:0;margin:0">
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">About company</a></li>
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Our services</a></li>
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Job opportunities</a></li>
          <li><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Contact us</a></li>
        </ul>
      </div>
      <div class="col-lg-3 col-sm-6">
        <h6 style="color:#fff;font-weight:600;font-size:15px;margin-bottom:18px">Customer</h6>
        <ul style="list-style:none;padding:0;margin:0">
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Client support</a></li>
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Pricing packages</a></li>
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Company story</a></li>
          <li><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Latest news</a></li>
        </ul>
      </div>
      <div class="col-lg-3 col-sm-6">
        <h6 style="color:#fff;font-weight:600;font-size:15px;margin-bottom:18px">Services</h6>
        <ul style="list-style:none;padding:0;margin:0">
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Brand experience</a></li>
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">E-commerce website</a></li>
          <li style="margin-bottom:8px"><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Content writing</a></li>
          <li><a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:14px">Marketing strategy</a></li>
        </ul>
      </div>
      <div class="col-lg-3 col-sm-6">
        <h6 style="color:#fff;font-weight:600;font-size:15px;margin-bottom:18px">Subscribe to newsletter</h6>
        <div style="display:flex;gap:0;margin-bottom:20px">
          <input type="email" placeholder="Enter your email" style="flex:1;padding:10px 14px;border:1px solid rgba(255,255,255,.15);border-right:none;border-radius:var(--nk-radius-sm) 0 0 var(--nk-radius-sm);background:transparent;color:#fff;font-size:14px;outline:none">
          <button style="padding:10px 18px;background:var(--nk-primary);color:#fff;border:none;border-radius:0 var(--nk-radius-sm) var(--nk-radius-sm) 0;font-size:14px;cursor:pointer">&#9993;</button>
        </div>
        <p style="font-size:13px;color:rgba(255,255,255,.4);margin:0">&copy; 2025 Your Company</p>
      </div>
    </div>
  </div>
</footer>`,
  });

  // ── Litho 4. Contact · Modern ─────────────────────────────────────
  editor.BlockManager.add("nk-litho-contact-modern", {
    label: "Contact \u00b7 Modern",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><polyline points="3 8 12 14 21 8"/></svg>`,
    content: `<section style="padding:80px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row align-items-end justify-content-center">
      <div class="col-lg-5 col-md-8" style="margin-bottom:40px">
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);padding:40px;position:relative">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
            <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent,#6366f1));display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700;flex-shrink:0">?</div>
            <div style="font-family:var(--nk-font-display);font-weight:600;font-size:18px;color:var(--nk-text)">More comfortable talking with us?</div>
          </div>
          <p style="color:var(--nk-text-muted);font-size:15px;margin-bottom:16px">Schedule a 15 minute intro call with us. We will answer your questions and discuss.</p>
          <a href="#" style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--nk-text);text-decoration:underline;text-underline-offset:3px">Pick a schedule</a>
        </div>
      </div>
      <div class="col-lg-6 offset-lg-1 col-md-8">
        <h4 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:700;margin-bottom:24px">Let&rsquo;s get in touch</h4>
        <form>
          <input type="text" placeholder="Your name" style="width:100%;padding:14px 0;border:none;border-bottom:2px solid var(--nk-border);background:transparent;color:var(--nk-text);font-size:15px;margin-bottom:20px;outline:none;font-family:var(--nk-font)">
          <input type="email" placeholder="Your email address" style="width:100%;padding:14px 0;border:none;border-bottom:2px solid var(--nk-border);background:transparent;color:var(--nk-text);font-size:15px;margin-bottom:20px;outline:none;font-family:var(--nk-font)">
          <input type="tel" placeholder="Mobile no" style="width:100%;padding:14px 0;border:none;border-bottom:2px solid var(--nk-border);background:transparent;color:var(--nk-text);font-size:15px;margin-bottom:20px;outline:none;font-family:var(--nk-font)">
          <textarea rows="4" placeholder="How can we help you?" style="width:100%;padding:14px 0;border:none;border-bottom:2px solid var(--nk-border);background:transparent;color:var(--nk-text);font-size:15px;margin-bottom:28px;outline:none;resize:vertical;font-family:var(--nk-font)"></textarea>
          <button type="submit" style="padding:14px 36px;background:var(--nk-text);color:var(--nk-bg);border:none;border-radius:var(--nk-radius-sm);font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:.5px;cursor:pointer">Send message</button>
        </form>
      </div>
    </div>
    <div class="row justify-content-center" style="margin-top:56px;gap:24px;text-align:center">
      <div class="col-auto d-flex align-items-center gap-2">
        <span style="font-size:18px">&#9742;</span>
        <span style="color:var(--nk-text);font-weight:500;font-size:15px">+1 123 456 7890</span>
      </div>
      <div class="col-auto d-flex align-items-center gap-2">
        <span style="font-size:18px">&#9993;</span>
        <a href="mailto:hello@domain.com" style="color:var(--nk-text);font-weight:500;font-size:15px;text-decoration:none">hello@domain.com</a>
      </div>
      <div class="col-auto d-flex align-items-center gap-2">
        <span style="font-size:18px">&#127760;</span>
        <a href="#" style="color:var(--nk-text);font-weight:500;font-size:15px;text-decoration:none">www.yourdomain.com</a>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── Litho 5. Contact · Simple ─────────────────────────────────────
  editor.BlockManager.add("nk-litho-contact-simple", {
    label: "Contact \u00b7 Simple",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><polyline points="3 8 12 14 21 8"/></svg>`,
    content: `<section style="padding:72px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row g-4">
      <div class="col-lg-3 col-sm-6 text-center">
        <div style="font-size:36px;color:var(--nk-primary);margin-bottom:16px">&#10084;</div>
        <h6 style="font-weight:600;font-size:13px;text-transform:uppercase;color:var(--nk-text);margin-bottom:8px">Our Office</h6>
        <p style="color:var(--nk-text-muted);font-size:14px;margin:0">401 Broadway, 24th Floor<br>New York, NY 10013</p>
      </div>
      <div class="col-lg-3 col-sm-6 text-center">
        <div style="font-size:36px;color:var(--nk-primary);margin-bottom:16px">&#127897;</div>
        <h6 style="font-weight:600;font-size:13px;text-transform:uppercase;color:var(--nk-text);margin-bottom:8px">Let&rsquo;s Talk</h6>
        <p style="color:var(--nk-text-muted);font-size:14px;margin:0">Phone: 1-800-222-000<br>Fax: 1-800-222-002</p>
      </div>
      <div class="col-lg-3 col-sm-6 text-center">
        <div style="font-size:36px;color:var(--nk-primary);margin-bottom:16px">&#9993;</div>
        <h6 style="font-weight:600;font-size:13px;text-transform:uppercase;color:var(--nk-text);margin-bottom:8px">E-mail Us</h6>
        <p style="color:var(--nk-text-muted);font-size:14px;margin:0"><a href="mailto:info@yourdomain.com" style="color:var(--nk-primary);text-decoration:none">info@yourdomain.com</a><br><a href="mailto:hr@yourdomain.com" style="color:var(--nk-primary);text-decoration:none">hr@yourdomain.com</a></p>
      </div>
      <div class="col-lg-3 col-sm-6 text-center">
        <div style="font-size:36px;color:var(--nk-primary);margin-bottom:16px">&#8505;</div>
        <h6 style="font-weight:600;font-size:13px;text-transform:uppercase;color:var(--nk-text);margin-bottom:8px">Customer Services</h6>
        <p style="color:var(--nk-text-muted);font-size:14px;margin:0">Quick support for all your questions and inquiries</p>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── Litho 6. Info banner ──────────────────────────────────────────
  editor.BlockManager.add("nk-litho-info-banner", {
    label: "Info banner",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="10" rx="3"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
    content: `<section style="padding:80px 0;font-family:var(--nk-font);background:var(--nk-surface)">
  <div class="container">
    <div class="row g-4 justify-content-center">
      <div class="col-lg-4 col-sm-6">
        <div style="border-radius:var(--nk-radius);overflow:hidden;background:var(--nk-bg);box-shadow:var(--nk-shadow)">
          <div style="height:200px;background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent,#6366f1))"></div>
          <div style="padding:32px;position:relative">
            <div style="position:absolute;top:-15px;right:24px;background:var(--nk-primary);color:#fff;font-size:12px;font-weight:600;text-transform:uppercase;padding:5px 16px;border-radius:4px">$100 / mo</div>
            <h5 style="font-family:var(--nk-font-display);font-weight:600;color:var(--nk-text);margin-bottom:8px;font-size:18px">Meditation classes</h5>
            <p style="color:var(--nk-text-muted);font-size:14px;margin-bottom:20px">Lorem ipsum dolor amet consectetur adipiscing do eiusmod tempor.</p>
            <div style="height:1px;background:var(--nk-border);margin-bottom:20px"></div>
            <a href="#" style="font-size:13px;font-weight:600;text-transform:uppercase;color:var(--nk-primary);text-decoration:none;display:flex;align-items:center;justify-content:space-between">Join classes <span>&#8594;</span></a>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-sm-6">
        <div style="border-radius:var(--nk-radius);overflow:hidden;background:var(--nk-bg);box-shadow:var(--nk-shadow)">
          <div style="height:200px;background:linear-gradient(135deg,#6366f1,#a855f7)"></div>
          <div style="padding:32px;position:relative">
            <div style="position:absolute;top:-15px;right:24px;background:var(--nk-primary);color:#fff;font-size:12px;font-weight:600;text-transform:uppercase;padding:5px 16px;border-radius:4px">$150 / mo</div>
            <h5 style="font-family:var(--nk-font-display);font-weight:600;color:var(--nk-text);margin-bottom:8px;font-size:18px">Sound therapy</h5>
            <p style="color:var(--nk-text-muted);font-size:14px;margin-bottom:20px">Lorem ipsum dolor amet consectetur adipiscing do eiusmod tempor.</p>
            <div style="height:1px;background:var(--nk-border);margin-bottom:20px"></div>
            <a href="#" style="font-size:13px;font-weight:600;text-transform:uppercase;color:var(--nk-primary);text-decoration:none;display:flex;align-items:center;justify-content:space-between">Join classes <span>&#8594;</span></a>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-sm-6">
        <div style="border-radius:var(--nk-radius);overflow:hidden;background:var(--nk-bg);box-shadow:var(--nk-shadow)">
          <div style="height:200px;background:linear-gradient(135deg,#a855f7,#ec4899)"></div>
          <div style="padding:32px;position:relative">
            <div style="position:absolute;top:-15px;right:24px;background:var(--nk-primary);color:#fff;font-size:12px;font-weight:600;text-transform:uppercase;padding:5px 16px;border-radius:4px">$180 / mo</div>
            <h5 style="font-family:var(--nk-font-display);font-weight:600;color:var(--nk-text);margin-bottom:8px;font-size:18px">Kundalini yoga</h5>
            <p style="color:var(--nk-text-muted);font-size:14px;margin-bottom:20px">Lorem ipsum dolor amet consectetur adipiscing do eiusmod tempor.</p>
            <div style="height:1px;background:var(--nk-border);margin-bottom:20px"></div>
            <a href="#" style="font-size:13px;font-weight:600;text-transform:uppercase;color:var(--nk-primary);text-decoration:none;display:flex;align-items:center;justify-content:space-between">Join classes <span>&#8594;</span></a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── Litho 7. About us ─────────────────────────────────────────────
  editor.BlockManager.add("nk-litho-about-us", {
    label: "About us",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 5-6 8-6s7 2 8 6"/></svg>`,
    content: `<section style="padding:80px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row align-items-center justify-content-center">
      <div class="col-xl-7 col-lg-8 col-md-7 text-center text-md-start" style="margin-bottom:24px">
        <h4 style="font-family:var(--nk-font-display);color:var(--nk-text);font-weight:600;margin:0;line-height:1.4"><span style="color:var(--nk-primary);text-decoration:underline;text-underline-offset:4px">25 years</span> we have created websites for global brands. Our success story.</h4>
      </div>
      <div class="col-xl-3 offset-xl-2 col-lg-4 col-md-5 text-center text-md-end">
        <a href="#" style="display:inline-flex;align-items:center;gap:12px;padding:16px 32px;background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent,#6366f1));color:#fff;border-radius:var(--nk-radius);text-decoration:none;font-weight:600;font-size:15px">
          <span style="font-size:20px">&#9654;</span>
          <span><small style="opacity:.7;display:block;font-weight:400;font-size:12px">Story video</small>Watch</span>
        </a>
      </div>
    </div>
    <div class="row g-3" style="margin-top:56px">
      <div class="col-md-3 col-6"><div style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);padding:24px;text-align:center;height:80px;display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:600;font-size:14px">Partner 1</div></div>
      <div class="col-md-3 col-6"><div style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);padding:24px;text-align:center;height:80px;display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:600;font-size:14px">Partner 2</div></div>
      <div class="col-md-3 col-6"><div style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);padding:24px;text-align:center;height:80px;display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:600;font-size:14px">Partner 3</div></div>
      <div class="col-md-3 col-6"><div style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);padding:24px;text-align:center;height:80px;display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:600;font-size:14px">Partner 4</div></div>
      <div class="col-md-3 col-6"><div style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);padding:24px;text-align:center;height:80px;display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:600;font-size:14px">Partner 5</div></div>
      <div class="col-md-3 col-6"><div style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);padding:24px;text-align:center;height:80px;display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:600;font-size:14px">Partner 6</div></div>
      <div class="col-md-3 col-6"><div style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);padding:24px;text-align:center;height:80px;display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:600;font-size:14px">Partner 7</div></div>
      <div class="col-md-3 col-6"><div style="border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);padding:24px;text-align:center;height:80px;display:flex;align-items:center;justify-content:center;color:var(--nk-text-muted);font-weight:600;font-size:14px">Partner 8</div></div>
    </div>
  </div>
</section>`,
  });

  // ── Litho 8. Our story ────────────────────────────────────────────
  editor.BlockManager.add("nk-litho-our-story", {
    label: "Our story",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 5-6 8-6s7 2 8 6"/></svg>`,
    content: `<section style="padding:0 0 80px;font-family:var(--nk-font);background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent,#6366f1));position:relative;overflow:hidden">
  <div class="container" style="position:relative;z-index:2">
    <div style="margin-bottom:72px;padding-top:64px">
      <div style="width:100%;height:400px;border-radius:var(--nk-radius);background:linear-gradient(135deg,rgba(0,0,0,.2),rgba(0,0,0,.05));display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.5);font-size:48px;font-weight:700;font-family:var(--nk-font-display);text-transform:uppercase;letter-spacing:6px">Our Story</div>
    </div>
    <div class="row g-4 justify-content-center">
      <div class="col-md-4 text-center">
        <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;margin:0 auto 16px">1</div>
        <h6 style="color:#fff;font-weight:600;margin-bottom:8px;font-size:16px">Start market research</h6>
        <p style="color:rgba(255,255,255,.65);font-size:14px;line-height:1.7;margin:0">Lorem ipsum is simply text of the printing and typesetting industry lorem Ipsum has been standard dummy.</p>
      </div>
      <div class="col-md-4 text-center">
        <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;margin:0 auto 16px">2</div>
        <h6 style="color:#fff;font-weight:600;margin-bottom:8px;font-size:16px">Discussion of the idea</h6>
        <p style="color:rgba(255,255,255,.65);font-size:14px;line-height:1.7;margin:0">Lorem ipsum is simply text of the printing and typesetting industry lorem Ipsum has been standard dummy.</p>
      </div>
      <div class="col-md-4 text-center">
        <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;margin:0 auto 16px">3</div>
        <h6 style="color:#fff;font-weight:600;margin-bottom:8px;font-size:16px">Production planning</h6>
        <p style="color:rgba(255,255,255,.65);font-size:14px;line-height:1.7;margin:0">Lorem ipsum is simply text of the printing and typesetting industry lorem Ipsum has been standard dummy.</p>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── Litho 9. Services showcase ────────────────────────────────────
  editor.BlockManager.add("nk-litho-services-showcase", {
    label: "Services showcase",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/></svg>`,
    content: `<section style="padding:80px 0;font-family:var(--nk-font);background:var(--nk-surface)">
  <div class="container">
    <div class="text-center" style="margin-bottom:48px">
      <span style="font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:var(--nk-primary);display:block;margin-bottom:8px">Unlimited Possibilities</span>
      <h4 style="font-family:var(--nk-font-display);font-weight:700;color:var(--nk-text);margin:0">Research Strategy</h4>
    </div>
    <div class="row g-4 justify-content-center">
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-bg);border-radius:var(--nk-radius);padding:40px 32px;box-shadow:var(--nk-shadow);height:100%;transition:box-shadow .3s">
          <span style="font-size:15px;color:var(--nk-text-muted);display:block;margin-bottom:16px">01</span>
          <h5 style="font-family:var(--nk-font-display);font-weight:700;color:var(--nk-text);font-size:18px;margin-bottom:12px">Developing strategy</h5>
          <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.7;margin-bottom:24px">Lorem ipsum is simply dummy text of the printing typesetting lorem ipsum been dummy text.</p>
          <div style="height:1px;background:var(--nk-border);margin-bottom:20px"></div>
          <a href="#" style="font-size:13px;font-weight:600;text-transform:uppercase;color:var(--nk-text);text-decoration:none;display:flex;align-items:center;justify-content:space-between">More info <span>&#8594;</span></a>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-bg);border-radius:var(--nk-radius);padding:40px 32px;box-shadow:var(--nk-shadow);height:100%;transition:box-shadow .3s">
          <span style="font-size:15px;color:var(--nk-text-muted);display:block;margin-bottom:16px">02</span>
          <h5 style="font-family:var(--nk-font-display);font-weight:700;color:var(--nk-text);font-size:18px;margin-bottom:12px">Blazing performance</h5>
          <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.7;margin-bottom:24px">Lorem ipsum is simply dummy text of the printing typesetting lorem ipsum been dummy text.</p>
          <div style="height:1px;background:var(--nk-border);margin-bottom:20px"></div>
          <a href="#" style="font-size:13px;font-weight:600;text-transform:uppercase;color:var(--nk-text);text-decoration:none;display:flex;align-items:center;justify-content:space-between">More info <span>&#8594;</span></a>
        </div>
      </div>
      <div class="col-lg-4 col-md-6">
        <div style="background:var(--nk-bg);border-radius:var(--nk-radius);padding:40px 32px;box-shadow:var(--nk-shadow);height:100%;transition:box-shadow .3s">
          <span style="font-size:15px;color:var(--nk-text-muted);display:block;margin-bottom:16px">03</span>
          <h5 style="font-family:var(--nk-font-display);font-weight:700;color:var(--nk-text);font-size:18px;margin-bottom:12px">Customer satisfaction</h5>
          <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.7;margin-bottom:24px">Lorem ipsum is simply dummy text of the printing typesetting lorem ipsum been dummy text.</p>
          <div style="height:1px;background:var(--nk-border);margin-bottom:20px"></div>
          <a href="#" style="font-size:13px;font-weight:600;text-transform:uppercase;color:var(--nk-text);text-decoration:none;display:flex;align-items:center;justify-content:space-between">More info <span>&#8594;</span></a>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── Litho 10. Icon box · Overline ─────────────────────────────────
  editor.BlockManager.add("nk-litho-icon-box-overline", {
    label: "Icon box \u00b7 Overline",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/></svg>`,
    content: `<section style="padding:80px 0;font-family:var(--nk-font);background:var(--nk-surface)">
  <div class="container">
    <div class="row g-4 justify-content-center">
      <div class="col-lg-4 col-sm-6">
        <div style="background:var(--nk-bg);border-radius:var(--nk-radius);padding:40px 32px;box-shadow:var(--nk-shadow);border-top:4px solid var(--nk-primary);height:100%">
          <div style="font-size:36px;margin-bottom:24px">&#128100;</div>
          <h5 style="font-family:var(--nk-font-display);font-weight:600;color:var(--nk-text);font-size:17px;margin-bottom:12px">Personal integrity</h5>
          <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.7;margin:0">Lorem ipsum dolor amet consectetur adipiscing elit do eiusmod incididunt ut labore et dolore magna.</p>
        </div>
      </div>
      <div class="col-lg-4 col-sm-6">
        <div style="background:var(--nk-bg);border-radius:var(--nk-radius);padding:40px 32px;box-shadow:var(--nk-shadow);border-top:4px solid var(--nk-primary);height:100%">
          <div style="font-size:36px;margin-bottom:24px">&#127880;</div>
          <h5 style="font-family:var(--nk-font-display);font-weight:600;color:var(--nk-text);font-size:17px;margin-bottom:12px">Strengthen your skills</h5>
          <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.7;margin:0">Lorem ipsum dolor amet consectetur adipiscing elit do eiusmod incididunt ut labore et dolore magna.</p>
        </div>
      </div>
      <div class="col-lg-4 col-sm-6">
        <div style="background:var(--nk-bg);border-radius:var(--nk-radius);padding:40px 32px;box-shadow:var(--nk-shadow);border-top:4px solid var(--nk-primary);height:100%">
          <div style="font-size:36px;margin-bottom:24px">&#128161;</div>
          <h5 style="font-family:var(--nk-font-display);font-weight:600;color:var(--nk-text);font-size:17px;margin-bottom:12px">Make ideas happen</h5>
          <p style="color:var(--nk-text-muted);font-size:14px;line-height:1.7;margin:0">Lorem ipsum dolor amet consectetur adipiscing elit do eiusmod incididunt ut labore et dolore magna.</p>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── Litho 11. Login form ──────────────────────────────────────────
  editor.BlockManager.add("nk-litho-login-form", {
    label: "Login form",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
    content: `<section style="padding:80px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row justify-content-center g-4">
      <div class="col-xl-5 col-md-6">
        <h5 style="font-family:var(--nk-font-display);font-weight:600;color:var(--nk-text);margin-bottom:24px">Login</h5>
        <div style="background:var(--nk-surface);border-radius:var(--nk-radius);padding:40px">
          <label style="display:block;font-size:14px;font-weight:500;color:var(--nk-text);margin-bottom:8px">Email address <span style="color:#ef4444">*</span></label>
          <input type="email" placeholder="Enter your email" style="width:100%;padding:12px 16px;border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);background:var(--nk-bg);color:var(--nk-text);font-size:14px;margin-bottom:20px;outline:none;font-family:var(--nk-font)">
          <label style="display:block;font-size:14px;font-weight:500;color:var(--nk-text);margin-bottom:8px">Password <span style="color:#ef4444">*</span></label>
          <input type="password" placeholder="Enter your password" style="width:100%;padding:12px 16px;border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);background:var(--nk-bg);color:var(--nk-text);font-size:14px;margin-bottom:20px;outline:none;font-family:var(--nk-font)">
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--nk-text);margin-bottom:24px;cursor:pointer"><input type="checkbox" style="width:auto;margin:0"> Remember me</label>
          <button style="width:100%;padding:14px;background:var(--nk-text);color:var(--nk-bg);border:none;border-radius:var(--nk-radius-sm);font-weight:600;font-size:15px;cursor:pointer;font-family:var(--nk-font)">Login</button>
          <p style="text-align:right;margin-top:16px;margin-bottom:0"><a href="#" style="font-size:14px;color:var(--nk-text-muted);text-decoration:none">Lost your password?</a></p>
        </div>
      </div>
      <div class="col-xl-5 offset-xl-1 col-md-6">
        <h5 style="font-family:var(--nk-font-display);font-weight:600;color:var(--nk-text);margin-bottom:24px">Register</h5>
        <div style="border:1px solid var(--nk-border);border-radius:var(--nk-radius);padding:40px">
          <label style="display:block;font-size:14px;font-weight:500;color:var(--nk-text);margin-bottom:8px">Username <span style="color:#ef4444">*</span></label>
          <input type="text" placeholder="Enter your username" style="width:100%;padding:12px 16px;border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);background:var(--nk-bg);color:var(--nk-text);font-size:14px;margin-bottom:20px;outline:none;font-family:var(--nk-font)">
          <label style="display:block;font-size:14px;font-weight:500;color:var(--nk-text);margin-bottom:8px">Email address <span style="color:#ef4444">*</span></label>
          <input type="email" placeholder="Enter your email" style="width:100%;padding:12px 16px;border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);background:var(--nk-bg);color:var(--nk-text);font-size:14px;margin-bottom:20px;outline:none;font-family:var(--nk-font)">
          <label style="display:block;font-size:14px;font-weight:500;color:var(--nk-text);margin-bottom:8px">Password <span style="color:#ef4444">*</span></label>
          <input type="password" placeholder="Enter your password" style="width:100%;padding:12px 16px;border:1px solid var(--nk-border);border-radius:var(--nk-radius-sm);background:var(--nk-bg);color:var(--nk-text);font-size:14px;margin-bottom:20px;outline:none;font-family:var(--nk-font)">
          <p style="font-size:13px;color:var(--nk-text-muted);margin-bottom:20px;line-height:1.6">Your personal data will be used to support your experience, manage account access, and for purposes described in our <a href="#" style="text-decoration:underline;color:var(--nk-text)">privacy policy</a>.</p>
          <button style="width:100%;padding:14px;background:var(--nk-text);color:var(--nk-bg);border:none;border-radius:var(--nk-radius-sm);font-weight:600;font-size:15px;cursor:pointer;font-family:var(--nk-font)">Register</button>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── Litho 12. News cards ──────────────────────────────────────────
  editor.BlockManager.add("nk-litho-news-cards", {
    label: "News cards",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="14" y2="12"/><line x1="7" y1="16" x2="11" y2="16"/></svg>`,
    content: `<section style="padding:80px 0;font-family:var(--nk-font);background:var(--nk-surface)">
  <div class="container">
    <div class="text-center" style="margin-bottom:48px">
      <span style="font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:var(--nk-primary);display:block;margin-bottom:8px">Most popular news</span>
      <h4 style="font-family:var(--nk-font-display);font-weight:700;color:var(--nk-text);text-transform:uppercase;margin:0">Popular highlights</h4>
    </div>
    <div class="row g-4">
      <div class="col-lg-4 col-sm-6">
        <div style="background:var(--nk-bg);border-radius:var(--nk-radius);overflow:hidden;box-shadow:var(--nk-shadow);text-align:center">
          <div style="height:200px;background:linear-gradient(135deg,var(--nk-primary),#6366f1);position:relative">
            <a href="#" style="position:absolute;bottom:50%;left:50%;transform:translate(-50%,50%);width:40px;height:40px;background:var(--nk-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--nk-text);font-size:14px;box-shadow:var(--nk-shadow)">&#8594;</a>
          </div>
          <div style="padding:28px 24px">
            <span style="font-size:12px;text-transform:uppercase;color:var(--nk-text-muted);letter-spacing:.5px">23 February 2025</span>
            <a href="#" style="display:block;font-weight:600;color:var(--nk-text);text-decoration:none;margin-top:8px;font-size:16px">Build perfect websites</a>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-sm-6">
        <div style="background:var(--nk-bg);border-radius:var(--nk-radius);overflow:hidden;box-shadow:var(--nk-shadow);text-align:center">
          <div style="height:200px;background:linear-gradient(135deg,#6366f1,#a855f7);position:relative">
            <a href="#" style="position:absolute;bottom:50%;left:50%;transform:translate(-50%,50%);width:40px;height:40px;background:var(--nk-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--nk-text);font-size:14px;box-shadow:var(--nk-shadow)">&#8594;</a>
          </div>
          <div style="padding:28px 24px">
            <span style="font-size:12px;text-transform:uppercase;color:var(--nk-text-muted);letter-spacing:.5px">18 February 2025</span>
            <a href="#" style="display:block;font-weight:600;color:var(--nk-text);text-decoration:none;margin-top:8px;font-size:16px">Beautiful layouts design</a>
          </div>
        </div>
      </div>
      <div class="col-lg-4 col-sm-6">
        <div style="background:var(--nk-bg);border-radius:var(--nk-radius);overflow:hidden;box-shadow:var(--nk-shadow);text-align:center">
          <div style="height:200px;background:linear-gradient(135deg,#a855f7,#ec4899);position:relative">
            <a href="#" style="position:absolute;bottom:50%;left:50%;transform:translate(-50%,50%);width:40px;height:40px;background:var(--nk-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--nk-text);font-size:14px;box-shadow:var(--nk-shadow)">&#8594;</a>
          </div>
          <div style="padding:28px 24px">
            <span style="font-size:12px;text-transform:uppercase;color:var(--nk-text-muted);letter-spacing:.5px">10 January 2025</span>
            <a href="#" style="display:block;font-weight:600;color:var(--nk-text);text-decoration:none;margin-top:8px;font-size:16px">Online website builder</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── Litho 13. Message box ─────────────────────────────────────────
  editor.BlockManager.add("nk-litho-message-box", {
    label: "Message box",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l10 18H2z"/><line x1="12" y1="10" x2="12" y2="14"/></svg>`,
    content: `<section style="padding:64px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row justify-content-center" style="gap:20px 0">
      <div class="col-lg-7 col-md-9">
        <div class="alert alert-success alert-dismissible fade show" role="alert" style="font-size:15px;border-radius:var(--nk-radius-sm);margin-bottom:20px">
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          <strong>Success!</strong> Indicates a successful or positive action.
        </div>
      </div>
      <div class="col-lg-7 col-md-9">
        <div class="alert alert-info alert-dismissible fade show" role="alert" style="font-size:15px;border-radius:var(--nk-radius-sm);margin-bottom:20px">
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          <strong>Info!</strong> Indicates a neutral informative change or action.
        </div>
      </div>
      <div class="col-lg-7 col-md-9">
        <div class="alert alert-warning alert-dismissible fade show" role="alert" style="font-size:15px;border-radius:var(--nk-radius-sm);margin-bottom:20px">
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          <strong>Warning!</strong> Indicates a warning that might need attention.
        </div>
      </div>
      <div class="col-lg-7 col-md-9">
        <div class="alert alert-danger alert-dismissible fade show" role="alert" style="font-size:15px;border-radius:var(--nk-radius-sm)">
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          <strong>Danger!</strong> Indicates a dangerous or potentially negative action.
        </div>
      </div>
    </div>
  </div>
</section>`,
  });

  // ── Litho 14. Video section ───────────────────────────────────────
  editor.BlockManager.add("nk-litho-video-section", {
    label: "Video section",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><polygon points="11 9 15 12 11 15" fill="currentColor"/></svg>`,
    content: `<section style="padding:0;font-family:var(--nk-font);position:relative;min-height:480px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent,#6366f1));overflow:hidden">
  <div style="position:absolute;inset:0;background:rgba(0,0,0,.4);z-index:1"></div>
  <div class="container" style="position:relative;z-index:2;text-align:center;padding:80px 0">
    <h3 style="font-family:var(--nk-font-display);color:#fff;font-weight:700;margin-bottom:24px">Background video</h3>
    <p style="color:rgba(255,255,255,.7);font-size:18px;max-width:560px;margin:0 auto 40px;line-height:1.7">Lorem ipsum dolor sit amet, adipiscing elit, sed do eiusmod tempor incididunt ut labore dolore.</p>
    <a href="#" style="display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.5);color:#fff;text-decoration:none;font-size:24px;margin-bottom:32px;backdrop-filter:blur(4px)">&#9654;</a>
    <br>
    <a href="#" style="display:inline-block;padding:16px 40px;background:#fff;color:var(--nk-primary);border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;box-shadow:var(--nk-shadow-lg)">Get Started Now</a>
  </div>
</section>`,
  });

  // ── Litho 15. Pie charts ──────────────────────────────────────────
  editor.BlockManager.add("nk-litho-pie-charts", {
    label: "Pie charts",
    category: "Premade",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.36 3.64"/></svg>`,
    content: `<section style="padding:80px 0;font-family:var(--nk-font);background:var(--nk-bg)">
  <div class="container">
    <div class="row g-5 justify-content-center">
      <div class="col-md-4 text-center">
        <div style="position:relative;width:160px;height:160px;margin:0 auto 24px">
          <svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg)">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nk-border)" stroke-width="3"/>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nk-primary)" stroke-width="3" stroke-dasharray="73 100" stroke-linecap="round"/>
          </svg>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:var(--nk-text);font-family:var(--nk-font-display)">75%</span>
        </div>
        <div style="width:1px;height:32px;background:var(--nk-border);margin:0 auto 12px;opacity:.5"></div>
        <span style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--nk-text)">Web development</span>
      </div>
      <div class="col-md-4 text-center">
        <div style="position:relative;width:160px;height:160px;margin:0 auto 24px">
          <svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg)">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nk-border)" stroke-width="3"/>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nk-primary)" stroke-width="3" stroke-dasharray="80 100" stroke-linecap="round"/>
          </svg>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:var(--nk-text);font-family:var(--nk-font-display)">80%</span>
        </div>
        <div style="width:1px;height:32px;background:var(--nk-border);margin:0 auto 12px;opacity:.5"></div>
        <span style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--nk-text)">Social marketing</span>
      </div>
      <div class="col-md-4 text-center">
        <div style="position:relative;width:160px;height:160px;margin:0 auto 24px">
          <svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg)">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nk-border)" stroke-width="3"/>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nk-primary)" stroke-width="3" stroke-dasharray="85 100" stroke-linecap="round"/>
          </svg>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:var(--nk-text);font-family:var(--nk-font-display)">85%</span>
        </div>
        <div style="width:1px;height:32px;background:var(--nk-border);margin:0 auto 12px;opacity:.5"></div>
        <span style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--nk-text)">Content creation</span>
      </div>
    </div>
  </div>
</section>`,
  });
}
