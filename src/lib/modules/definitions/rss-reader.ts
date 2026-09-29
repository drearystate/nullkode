import type { ModuleDefinition } from "../types";

export const rssReader: ModuleDefinition = {
  id: "rss-reader",
  name: "RSS Reader",
  tagline: "Pull and display an external RSS feed",
  description:
    "Subscribe to one or more external RSS / Atom feeds and display the merged latest items inside your app. A refresh flow fetches feeds (cron-friendly), parses items, and stores them locally so the reader stays snappy.",
  icon: "",
  color: "from-orange-500 to-amber-700",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Reader heading", type: "text", default: "From around the web", required: true },
  ],
  tables: [
    {
      name: "feeds",
      fields: [
        { name: "label", type: "text" },
        { name: "url", type: "text" },
      ],
      seed: [
        { label: "Hacker News", url: "https://hnrss.org/frontpage" },
      ],
    },
    {
      name: "items",
      fields: [
        { name: "feed_id", type: "text" },
        { name: "title", type: "text" },
        { name: "link", type: "text" },
        { name: "summary", type: "text" },
        { name: "published_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "feeds",
      name: "List feeds",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "feeds", orderBy: "label asc", limit: 50, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add-feed",
      name: "Subscribe to a feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "feeds", values: { label: "{{trigger.label}}", url: "{{trigger.url}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "refresh",
      name: "Fetch latest items from a feed (cron)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "feeds", where: { id: "{{trigger.feed_id}}" }, limit: 1, output: "feed" } },
        {
          id: "n3",
          type: "http_request",
          data: {
            method: "GET",
            url: "{{vars.feed.0.url}}",
            output: "raw",
          },
        },
        {
          id: "n4",
          type: "parse_json",
          data: { input: '{"items":{{vars.raw|rss_to_json}}}', output: "parsed" },
        },
        {
          id: "n5",
          type: "insert",
          data: {
            table: "items",
            values: {
              feed_id: "{{vars.feed.0.id}}",
              title: "{{vars.parsed.items.0.title}}",
              link: "{{vars.parsed.items.0.link}}",
              summary: "{{vars.parsed.items.0.summary}}",
              published_at: "{{vars.parsed.items.0.pubDate}}",
            },
          },
        },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
      ],
    },
    {
      slug: "items",
      name: "Recent items across all feeds",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "published_at desc", limit: 100, output: "rows" } },
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
      slug: "reader",
      title: "Reader",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:760px;">
<h1 class="display-5 fw-bold">{{config.heading}}</h1>
<div data-nk-bind-flow-ref="items" data-nk-refresh="120000" class="mt-3">
  <a class="card border-0 shadow-sm mb-2 text-decoration-none text-body p-3" data-nk-item data-nk-href-from="link" href="#" target="_blank">
    <div class="fw-bold" data-nk-field="title">Headline</div>
    <p class="small mt-1 mb-0" style="color:var(--nk-text-muted);" data-nk-field="summary">Summary…</p>
    <div class="small mt-1" style="color:var(--nk-text-muted);" data-nk-field="published_at">date</div>
  </a>
</div>
</div></section>`,
    },
    {
      slug: "reader-admin",
      title: "Feeds",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Feed subscriptions</h1>
<form data-nk-form="" data-nk-flow-ref="add-feed" class="card p-3 shadow-sm mt-3">
  <div class="row g-2"><div class="col-md-4"><input name="label" class="form-control" placeholder="Label" required/></div><div class="col-md-7"><input name="url" type="url" class="form-control" placeholder="https://example.com/feed.xml" required/></div><div class="col-md-1"><button class="btn btn-primary w-100" type="submit">+</button></div></div>
</form>
<div data-nk-bind-flow-ref="feeds" data-nk-refresh="15000" class="mt-3">
  <div class="d-flex justify-content-between p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><div><div class="fw-bold" data-nk-field="label">Label</div><div class="small font-monospace" style="color:var(--nk-text-muted);" data-nk-field="url">URL</div></div></div>
</div>
<div class="card mt-4 p-3 border-0" style="background:var(--nk-surface-2);"><p class="small mb-0" style="color:var(--nk-text-muted);">Hit <code>/api/run/refresh</code> with a <code>feed_id</code> from cron every 15-30 minutes to keep items current.</p></div>
</div></section>`,
    },
  ],
};
