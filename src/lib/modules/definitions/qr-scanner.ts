import type { ModuleDefinition } from "../types";

export const qrScanner: ModuleDefinition = {
  id: "qr-scanner",
  name: "QR Scanner",
  tagline: "Scan QR codes with the camera",
  description:
    "A camera-based QR code scanner powered by jsQR. Scans land in a form field you can submit — perfect for check-ins, coupons and attendance.",
  icon: "",
  color: "from-slate-700 to-gray-900",
  category: "utility",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Heading", type: "text", default: "Scan a QR code", required: true },
  ],
  tables: [
    {
      name: "scans",
      fields: [
        { name: "code", type: "text" },
        { name: "scanned_by", type: "text" },
        { name: "note", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "record",
      name: "Record scan",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "scans",
            values: {
              code: "{{trigger.code}}",
              scanned_by: "{{trigger.scanned_by}}",
              note: "{{trigger.note}}",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Scan recorded!"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "feed",
      name: "List scans",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "scans", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "scan",
      title: "Scan",
      html: `<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
<section class="py-5"><div class="container" style="max-width:540px;"><h1 class="display-5 fw-bold text-center">{{config.heading}}</h1><p class="text-center" style="color:var(--nk-text-muted);">Point your camera at any QR code.</p>
<div data-nk-qr-scanner data-nk-qr-output="code" class="mt-4 card p-3 shadow-sm"></div>
<form data-nk-form="" data-nk-flow-ref="record" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-12"><label class="form-label">Scanned code</label><input name="code" class="form-control font-monospace" placeholder="Auto-filled by scanner..." required/></div><div class="col-md-6"><label class="form-label">Your name</label><input name="scanned_by" class="form-control"/></div><div class="col-md-6"><label class="form-label">Note</label><input name="note" class="form-control"/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Record scan</button></div></div></form>
<h4 class="fw-bold mt-5">Recent scans</h4>
<div data-nk-bind-flow-ref="feed" class="mt-3">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item>
    <div class="fs-3"></div>
    <div class="flex-grow-1"><div class="fw-bold font-monospace" data-nk-field="code">https://example.com/check-in/abc123</div><div class="small" style="color:var(--nk-text-muted);">by <span data-nk-field="scanned_by">Alex</span> · <span data-nk-field="note">Event entry</span></div></div>
  </div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="fs-3"></div><div class="flex-grow-1"><div class="fw-bold font-monospace">COUPON-SPRING25</div><div class="small" style="color:var(--nk-text-muted);">by Jordan · Redeemed at checkout</div></div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border" style="background:var(--nk-surface);"><div class="fs-3"></div><div class="flex-grow-1"><div class="fw-bold font-monospace">member-card-8842</div><div class="small" style="color:var(--nk-text-muted);">by Sam · Member sign-in</div></div></div>
</div>
</div></section>`,
    },
  ],
};
