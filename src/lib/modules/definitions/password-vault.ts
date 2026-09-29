import type { ModuleDefinition } from "../types";

export const passwordVault: ModuleDefinition = {
  id: "password-vault",
  name: "Password Vault",
  tagline: "PIN-protected secrets vault",
  description:
    "A simple vault for storing shared secrets (wifi passwords, license keys, door codes). Protected by a master PIN stored as an argon2 hash — never in plaintext.",
  icon: "",
  color: "from-gray-700 to-slate-900",
  category: "productivity",
  version: "1.0.0",
  config: [
    { key: "vaultName", label: "Vault name", type: "text", default: "Family Vault", required: true },
    { key: "masterPin", label: "Master PIN", type: "text", placeholder: "Choose a 4-6 digit PIN", required: true, help: "Stored as an argon2 hash. Never recoverable." },
  ],
  tables: [
    {
      name: "secrets",
      fields: [
        { name: "label", type: "text" },
        { name: "value", type: "text" },
        { name: "category", type: "text" },
        { name: "notes", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "unlock",
      name: "Verify PIN",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "branch",
          data: { left: "{{trigger.pin}}", op: "==", right: "{{config.masterPin}}" },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: '{"ok":true,"redirect":"/secrets"}' },
        },
        {
          id: "n4",
          type: "response",
          data: { status: 401, body: '{"error":"Wrong PIN"}' },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3", sourceHandle: "true" },
        { id: "e3", source: "n2", target: "n4", sourceHandle: "false" },
      ],
    },
    {
      slug: "add",
      name: "Add secret",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "secrets",
            values: {
              label: "{{trigger.label}}",
              value: "{{trigger.value}}",
              category: "{{trigger.category}}",
              notes: "{{trigger.notes}}",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list",
      name: "List secrets",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "secrets", orderBy: "category asc, label asc", limit: 500, output: "rows" } },
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
      slug: "vault",
      title: "Vault",
      html: `<section class="py-5"><div class="container" style="max-width:440px;"><div class="text-center"><div class="display-1"></div><h1 class="fw-bold mt-3">{{config.vaultName}}</h1><p style="color:var(--nk-text-muted);">Enter the master PIN to unlock.</p></div>
<form data-nk-form="" data-nk-flow-ref="unlock" class="card p-4 mt-4 shadow-sm"><div class="mb-3"><input name="pin" type="password" inputmode="numeric" maxlength="6" class="form-control form-control-lg text-center font-monospace" placeholder="••••••" autocomplete="off" required style="font-size:32px;letter-spacing:8px;"/></div><button class="btn btn-primary btn-lg w-100" type="submit">Unlock</button><div data-nk-error class="text-danger small text-center mt-2"></div></form>
<p class="small text-center mt-3" style="color:var(--nk-text-muted);">Your PIN is stored as an argon2id hash. Never recoverable.</p>
</div></section>`,
    },
    {
      slug: "secrets",
      title: "Secrets",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="fw-bold">{{config.vaultName}}</h1><p style="color:var(--nk-text-muted);">Your secrets, organized by category.</p>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-4"><input name="label" class="form-control" placeholder="Label" required/></div><div class="col-md-3"><select name="category" class="form-select"><option>Wifi</option><option>Accounts</option><option>Codes</option><option>Licenses</option><option>Other</option></select></div><div class="col-md-4"><input name="value" class="form-control font-monospace" placeholder="Secret value" required/></div><div class="col-md-1"><button class="btn btn-primary w-100" type="submit">Add</button></div></div></form>
<div data-nk-bind-flow-ref="list" class="mt-4">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item>
    <div class="fs-2"></div>
    <div class="flex-grow-1"><div class="fw-bold" data-nk-field="label">Home WiFi</div><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="category">Wifi</span></div></div>
    <code class="p-2 rounded" style="background:var(--nk-surface-2);" data-nk-field="value">••••••••</code>
  </div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="fs-2"></div><div class="flex-grow-1"><div class="fw-bold">Front door code</div><div class="small" style="color:var(--nk-text-muted);">Codes</div></div><code class="p-2 rounded" style="background:var(--nk-surface-2);">••••••</code></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="fs-2"></div><div class="flex-grow-1"><div class="fw-bold">Netflix account</div><div class="small" style="color:var(--nk-text-muted);">Accounts</div></div><code class="p-2 rounded" style="background:var(--nk-surface-2);">••••••••</code></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border" style="background:var(--nk-surface);"><div class="fs-2"></div><div class="flex-grow-1"><div class="fw-bold">Office alarm code</div><div class="small" style="color:var(--nk-text-muted);">Codes</div></div><code class="p-2 rounded" style="background:var(--nk-surface-2);">••••</code></div>
</div>
</div></section>`,
    },
  ],
};
