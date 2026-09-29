import type { ModuleDefinition } from "../types";

export const tags: ModuleDefinition = {
  id: "tags",
  name: "Tags",
  tagline: "Generic tag any module can attach to",
  description:
    "A simple tagging system. Define tags (with optional color), then attach them to any row in any table via a polymorphic tagging table (entity_table + entity_id). Useful for categorizing leads, projects, or content.",
  icon: "",
  color: "from-lime-500 to-emerald-600",
  category: "utility",
  version: "1.0.0",
  tables: [
    {
      name: "tags",
      fields: [
        { name: "name", type: "text" },
        { name: "color", type: "text" },
      ],
      seed: [
        { name: "Important", color: "#ef4444" },
        { name: "Follow-up", color: "#f59e0b" },
        { name: "Idea", color: "#3b82f6" },
      ],
    },
    {
      name: "taggings",
      fields: [
        { name: "tag_id", type: "text" },
        { name: "entity_table", type: "text" },
        { name: "entity_id", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "list-tags",
      name: "List all tags",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tags", orderBy: "name asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "create-tag",
      name: "Create a new tag",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: { table: "tags", values: { name: "{{trigger.name}}", color: "{{trigger.color}}" } },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "attach",
      name: "Attach a tag to an entity",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "taggings",
            values: {
              tag_id: "{{trigger.tag_id}}",
              entity_table: "{{trigger.entity_table}}",
              entity_id: "{{trigger.entity_id}}",
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
      slug: "detach",
      name: "Remove a tagging",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "delete", data: { table: "taggings", where: { id: "{{trigger.id}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list-for-entity",
      name: "List tags attached to a specific entity",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "taggings",
            where: { entity_table: "{{trigger.entity_table}}", entity_id: "{{trigger.entity_id}}" },
            limit: 50,
            output: "rows",
          },
        },
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
      slug: "tags",
      title: "Tags",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:720px;">
<h1 class="fw-bold">Tags</h1>
<p style="color:var(--nk-text-muted);">Define a vocabulary of tags. Other modules can attach them to rows via the <code>attach</code> flow.</p>

<form data-nk-form="" data-nk-flow-ref="create-tag" class="d-flex gap-2 align-items-end mt-3">
  <div class="flex-grow-1"><label class="form-label small mb-1">New tag name</label><input name="name" class="form-control" placeholder="Priority" required/></div>
  <div style="width:120px;"><label class="form-label small mb-1">Color</label><input name="color" type="color" value="#3b82f6" class="form-control form-control-color w-100"/></div>
  <button class="btn btn-primary" type="submit">Add</button>
</form>

<h4 class="fw-bold mt-5">All tags</h4>
<div data-nk-bind-flow-ref="list-tags" data-nk-refresh="15000" class="d-flex flex-wrap gap-2 mt-2">
  <span class="badge p-2 fs-6" style="background:var(--nk-surface-2);color:var(--nk-text);border-left:4px solid #3b82f6;" data-nk-item><span data-nk-field="name">Important</span></span>
</div>
</div></section>`,
    },
  ],
};
