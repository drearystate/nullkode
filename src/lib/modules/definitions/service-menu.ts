import type { ModuleDefinition } from "../types";

export const serviceMenu: ModuleDefinition = {
  id: "service-menu",
  name: "Service Menu",
  tagline: "Salon-style services with prices",
  description:
    "A service menu like a salon or spa — each service has a name, duration, price and description. Perfect next to a booking page.",
  icon: "",
  color: "from-pink-500 to-fuchsia-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "businessName", label: "Business name", type: "text", default: "Our Salon", required: true },
    { key: "currency", label: "Currency", type: "text", default: "$" },
  ],
  tables: [
    {
      name: "services",
      fields: [
        { name: "name", type: "text" },
        { name: "description", type: "text" },
        { name: "duration_minutes", type: "int" },
        { name: "price", type: "float" },
        { name: "category", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "List services",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "services", orderBy: "category asc, name asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add service",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "services", values: {
          name: "{{trigger.name}}",
          description: "{{trigger.description}}",
          duration_minutes: "{{trigger.duration_minutes}}",
          price: "{{trigger.price}}",
          category: "{{trigger.category}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "services",
      title: "Services",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container text-center"><h1 class="display-4 fw-bold">{{config.businessName}}</h1><p class="lead" style="color:var(--nk-text-muted);">Our services and prices</p></div></section>
<section class="py-5"><div class="container" style="max-width:720px;">
<div data-nk-bind-flow-ref="feed">
  <div class="d-flex justify-content-between align-items-start py-4 border-bottom" data-nk-item>
    <div class="flex-grow-1">
      <div class="fw-bold fs-5" data-nk-field="name">Classic haircut</div>
      <div class="small" style="color:var(--nk-text-muted);" data-nk-field="description">Wash, cut, style. Take-home styling tips included.</div>
      <div class="small mt-1" style="color:var(--nk-text-muted);"><span data-nk-field="duration_minutes">45</span> min</div>
    </div>
    <div class="fw-bold fs-4 ms-3">{{config.currency}}<span data-nk-field="price">55</span></div>
  </div>
  <div class="d-flex justify-content-between align-items-start py-4 border-bottom"><div class="flex-grow-1"><div class="fw-bold fs-5">Color & highlights</div><div class="small" style="color:var(--nk-text-muted);">Full color or balayage, consultation included.</div><div class="small mt-1" style="color:var(--nk-text-muted);">120 min</div></div><div class="fw-bold fs-4 ms-3">{{config.currency}}145</div></div>
  <div class="d-flex justify-content-between align-items-start py-4 border-bottom"><div class="flex-grow-1"><div class="fw-bold fs-5">Deep conditioning</div><div class="small" style="color:var(--nk-text-muted);">Restorative treatment for dry or damaged hair.</div><div class="small mt-1" style="color:var(--nk-text-muted);">30 min</div></div><div class="fw-bold fs-4 ms-3">{{config.currency}}40</div></div>
  <div class="d-flex justify-content-between align-items-start py-4"><div class="flex-grow-1"><div class="fw-bold fs-5">Mani-pedi combo</div><div class="small" style="color:var(--nk-text-muted);">Classic manicure plus a spa pedicure with massage.</div><div class="small mt-1" style="color:var(--nk-text-muted);">90 min</div></div><div class="fw-bold fs-4 ms-3">{{config.currency}}85</div></div>
</div>
</div></section>`,
    },
  ],
};
