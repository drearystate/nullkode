import type { ModuleDefinition } from "../types";

export const stripeCheckout: ModuleDefinition = {
  id: "stripe-checkout",
  name: "Stripe Checkout",
  tagline: "Sell anything with Stripe",
  description:
    "A product page with a Checkout button that creates a real Stripe Checkout session and redirects the customer to pay. Bring your own Stripe secret key in the module config.",
  icon: "",
  color: "from-violet-500 to-purple-700",
  category: "commerce",
  version: "1.0.0",
  provides: ["payments"],
  config: [
    { key: "productName", label: "Product name", type: "text", default: "My Product", required: true },
    { key: "priceCents", label: "Price in cents", type: "number", default: 4900, required: true },
    { key: "currency", label: "Currency code", type: "text", default: "usd", required: true },
    { key: "stripeSecret", label: "Stripe secret key", type: "text", placeholder: "sk_test_...", required: true, help: "Your Stripe secret key. Use a test key to start." },
    { key: "successUrl", label: "Success redirect URL", type: "url", default: "https://nullkode.com/app/your-app", required: true },
    { key: "cancelUrl", label: "Cancel redirect URL", type: "url", default: "https://nullkode.com/app/your-app", required: true },
  ],
  tables: [
    {
      name: "sessions",
      fields: [
        { name: "session_id", type: "text" },
        { name: "customer_email", type: "text" },
        { name: "amount_cents", type: "int" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "start-checkout",
      name: "Create checkout session",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "http_request",
          data: {
            label: "Stripe create session",
            method: "POST",
            url: "https://api.stripe.com/v1/checkout/sessions",
            headers: {
              Authorization: "Bearer {{config.stripeSecret}}",
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "mode=payment&success_url={{config.successUrl}}&cancel_url={{config.cancelUrl}}&line_items[0][price_data][currency]={{config.currency}}&line_items[0][price_data][product_data][name]={{config.productName}}&line_items[0][price_data][unit_amount]={{config.priceCents}}&line_items[0][quantity]=1&customer_email={{trigger.email}}",
            output: "stripe",
          },
        },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "sessions",
            values: {
              session_id: "{{vars.stripe.body.id}}",
              customer_email: "{{trigger.email}}",
              amount_cents: "{{config.priceCents}}",
              status: "pending",
            },
          },
        },
        {
          id: "n4",
          type: "response",
          data: { status: 200, body: '{"redirect":"{{vars.stripe.body.url}}"}' },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "list",
      name: "List checkout sessions",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "sessions", orderBy: "created_at desc", limit: 200, output: "rows" } },
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
      slug: "buy",
      title: "Buy",
      html: `<section class="py-5"><div class="container" style="max-width:560px;"><div class="card border-0 shadow-lg"><div class="card-body p-5 text-center"><div class="display-1"></div><h1 class="fw-bold mt-3">{{config.productName}}</h1><div class="display-5 fw-bold my-3" style="color:var(--nk-primary);">$<span>49</span></div><p style="color:var(--nk-text-muted);">Secure payment powered by Stripe. Your card details never touch our server.</p><form data-nk-form="" data-nk-flow-ref="start-checkout" class="mt-4"><div class="mb-3"><label class="form-label">Your email</label><input name="email" type="email" class="form-control form-control-lg" required/></div><button class="btn btn-primary btn-lg w-100" type="submit">Checkout with Stripe →</button><div data-nk-error class="text-danger small mt-2"></div></form></div></div><p class="small text-center mt-3" style="color:var(--nk-text-muted);">You'll be redirected to Stripe to complete your payment.</p></div></section>`,
    },
    {
      slug: "stripe-admin",
      title: "Payments",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Stripe sessions</h1><div data-nk-bind-flow-ref="list" class="mt-4">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body d-flex align-items-center"><div class="flex-grow-1"><div class="fw-bold font-monospace small" data-nk-field="session_id">cs_test_a1b2c3</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="customer_email">buyer@example.com</div></div><div class="text-end"><div class="fw-bold">$<span data-nk-field="amount_cents">4900</span></div><span class="badge" style="background:var(--nk-primary);color:var(--nk-text);" data-nk-field="status">pending</span></div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex align-items-center"><div class="flex-grow-1"><div class="fw-bold font-monospace small">cs_test_d4e5f6</div><div class="small" style="color:var(--nk-text-muted);">alice@test.com</div></div><div class="text-end"><div class="fw-bold">$4900</div><span class="badge" style="background:var(--nk-primary);">paid</span></div></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body d-flex align-items-center"><div class="flex-grow-1"><div class="fw-bold font-monospace small">cs_test_g7h8i9</div><div class="small" style="color:var(--nk-text-muted);">bob@test.com</div></div><div class="text-end"><div class="fw-bold">$4900</div><span class="badge" style="background:var(--nk-primary);">paid</span></div></div></div>
</div>
</div></section>`,
    },
  ],
};
