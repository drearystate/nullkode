import type { ModuleDefinition } from "../types";

export const eWallet: ModuleDefinition = {
  id: "e-wallet",
  name: "E-Wallet",
  tagline: "User credit balances with top-up & spend",
  description:
    "Give each user a credit balance. Add credits (top-up), spend credits (deduct), and view a full ledger of every transaction. Other modules can spend on behalf of the signed-in user via the spend flow.",
  icon: "",
  color: "from-teal-500 to-emerald-700",
  category: "commerce",
  version: "1.0.0",
  requires: ["auth-session", "auth-users"],
  worksWith: ["stripe-checkout"],
  config: [
    { key: "currencySymbol", label: "Currency symbol", type: "text", default: "$" },
  ],
  tables: [
    {
      name: "balances",
      fields: [
        { name: "user_id", type: "text" },
        { name: "amount", type: "float" },
      ],
    },
    {
      name: "transactions",
      fields: [
        { name: "user_id", type: "text" },
        { name: "kind", type: "text" },
        { name: "amount", type: "float" },
        { name: "note", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "balance",
      name: "Get my balance",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "branch", data: { left: "{{vars.session.userId}}", op: "exists", right: "" } },
        { id: "n4", type: "query", data: { table: "balances", where: { user_id: "{{vars.session.userId}}" }, limit: 1, output: "b" } },
        { id: "n5", type: "response", data: { status: 200, body: '{"amount":{{vars.b.0.amount|0}}}' } },
        { id: "n6", type: "response", data: { status: 401, body: '{"error":"Sign in first"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },
    {
      slug: "topup",
      name: "Add credits to my wallet",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "query", data: { table: "balances", where: { user_id: "{{vars.session.userId}}" }, limit: 1, output: "b" } },
        { id: "n4", type: "branch", data: { left: "{{vars.b.0.id}}", op: "exists", right: "" } },
        { id: "n5", type: "math", data: { expression: "({{vars.b.0.amount}}) + ({{trigger.amount}})", output: "next" } },
        {
          id: "n6",
          type: "update",
          data: { table: "balances", where: { id: "{{vars.b.0.id}}" }, values: { amount: "{{vars.next}}" } },
        },
        {
          id: "n7",
          type: "insert",
          data: { table: "balances", values: { user_id: "{{vars.session.userId}}", amount: "{{trigger.amount}}" } },
        },
        {
          id: "n8",
          type: "insert",
          data: {
            table: "transactions",
            values: {
              user_id: "{{vars.session.userId}}",
              kind: "topup",
              amount: "{{trigger.amount}}",
              note: "{{trigger.note}}",
            },
          },
        },
        { id: "n9", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5", sourceHandle: "true" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n6", target: "n8" },
        { id: "e7", source: "n4", target: "n7", sourceHandle: "false" },
        { id: "e8", source: "n7", target: "n8" },
        { id: "e9", source: "n8", target: "n9" },
      ],
    },
    {
      slug: "spend",
      name: "Spend credits",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "query", data: { table: "balances", where: { user_id: "{{vars.session.userId}}" }, limit: 1, output: "b" } },
        { id: "n4", type: "branch", data: { left: "{{vars.b.0.amount}}", op: ">=", right: "{{trigger.amount}}" } },
        { id: "n5", type: "math", data: { expression: "({{vars.b.0.amount}}) - ({{trigger.amount}})", output: "next" } },
        {
          id: "n6",
          type: "update",
          data: { table: "balances", where: { id: "{{vars.b.0.id}}" }, values: { amount: "{{vars.next}}" } },
        },
        {
          id: "n7",
          type: "insert",
          data: {
            table: "transactions",
            values: {
              user_id: "{{vars.session.userId}}",
              kind: "spend",
              amount: "-{{trigger.amount}}",
              note: "{{trigger.note}}",
            },
          },
        },
        { id: "n8", type: "response", data: { status: 200, body: '{"ok":true,"remaining":{{vars.next}}}' } },
        { id: "n9", type: "response", data: { status: 402, body: '{"error":"Insufficient credits"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5", sourceHandle: "true" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n6", target: "n7" },
        { id: "e7", source: "n7", target: "n8" },
        { id: "e8", source: "n4", target: "n9", sourceHandle: "false" },
      ],
    },
    {
      slug: "ledger",
      name: "My transaction history",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "query", data: { table: "transactions", where: { user_id: "{{vars.session.userId}}" }, orderBy: "created_at desc", limit: 100, output: "rows" } },
        { id: "n4", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
  ],
  pages: [
    {
      slug: "wallet",
      title: "Wallet",
      isHome: true,
      html: `<!--nk:require-auth-->
<section class="py-5"><div class="container" style="max-width:680px;">
<div class="card p-5 text-center text-white" style="background:linear-gradient(135deg,var(--nk-primary),#0ea5e9);border-radius:18px;">
  <div class="small text-uppercase">Your balance</div>
  <div class="display-2 fw-bold mt-2" data-nk-bind-flow-ref="balance" data-nk-refresh="5000"><span data-nk-field="amount">0.00</span> <small class="fs-3">{{config.currencySymbol}}</small></div>
</div>

<form data-nk-form="" data-nk-flow-ref="topup" class="card p-3 mt-3 shadow-sm">
  <div class="d-flex gap-2 align-items-end">
    <div class="flex-grow-1"><label class="form-label small mb-1">Top up amount</label><input name="amount" type="number" step="0.01" min="1" class="form-control" required/></div>
    <input type="hidden" name="note" value="Manual top-up"/>
    <button class="btn btn-primary" type="submit">Add credits</button>
  </div>
</form>

<h4 class="fw-bold mt-5">History</h4>
<div data-nk-bind-flow-ref="ledger" data-nk-refresh="10000" class="mt-3">
  <div class="d-flex justify-content-between align-items-center p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);">
    <div><div class="fw-bold text-capitalize" data-nk-field="kind">topup</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="note">Stripe top-up</div></div>
    <div class="fw-bold fs-5">{{config.currencySymbol}}<span data-nk-field="amount">+25.00</span></div>
  </div>
</div>
</div></section>`,
    },
  ],
};
