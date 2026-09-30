import type { ModuleDefinition } from "../types";

export const channelFeed: ModuleDefinition = {
  id: "channel-feed",
  name: "YouTube / Vimeo Channel Feed",
  tagline: "Auto-import latest videos from a channel",
  description:
    "Subscribe to a YouTube or Vimeo channel feed and auto-display the latest videos in a grid. Refresh flow polls the channel's RSS endpoint; cached items stay snappy. Click a video to open it in an embedded player.",
  icon: "",
  color: "from-red-600 to-rose-800",
  category: "media",
  version: "1.0.0",
  config: [
    { key: "channelKind", label: "Channel type", type: "select", default: "youtube", options: [{ value: "youtube", label: "YouTube" }, { value: "vimeo", label: "Vimeo" }] },
    { key: "channelId", label: "Channel ID", type: "text", placeholder: "UCxxxxxxxxxxxx", required: true },
    { key: "heading", label: "Section heading", type: "text", default: "Latest videos", required: true },
  ],
  tables: [
    {
      name: "videos",
      fields: [
        { name: "video_id", type: "text" },
        { name: "title", type: "text" },
        { name: "thumb_url", type: "text" },
        { name: "embed_url", type: "text" },
        { name: "published_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "Cached videos",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "videos", orderBy: "published_at desc", limit: 60, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "refresh",
      name: "Fetch latest from channel (cron)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "http_request",
          data: {
            method: "GET",
            url: "{{config.channelKind|eq:youtube,https://www.youtube.com/feeds/videos.xml?channel_id={{config.channelId}},https://vimeo.com/channels/{{config.channelId}}/videos/rss}}",
            output: "feed",
          },
        },
        {
          id: "n3",
          type: "parse_json",
          data: { input: "{{vars.feed|video_rss_to_json}}", output: "parsed" },
        },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "videos",
            values: {
              video_id: "{{vars.parsed.items.0.video_id}}",
              title: "{{vars.parsed.items.0.title}}",
              thumb_url: "{{vars.parsed.items.0.thumb_url}}",
              embed_url: "{{vars.parsed.items.0.embed_url}}",
              published_at: "{{vars.parsed.items.0.published_at}}",
            },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
  ],
  pages: [
    {
      slug: "videos",
      title: "Videos",
      isHome: true,
      html: `<section class="py-5"><div class="container"><h1 class="display-5 fw-bold">{{config.heading}}</h1>
<div data-nk-bind-flow-ref="list" data-nk-refresh="300000" class="row g-3 mt-3">
  <div class="col-md-4 col-sm-6" data-nk-item><a class="card border-0 shadow-sm h-100 text-decoration-none text-body" data-nk-href-template="/watch?id={video_id}" href="#"><div class="position-relative" style="aspect-ratio:16/9;background:#000;overflow:hidden;"><img class="w-100 h-100" style="object-fit:cover;" data-nk-src="thumb_url" src="/media/generated/music-recording-studio.webp" alt=""/><span class="position-absolute top-50 start-50 translate-middle fs-1">▶</span></div><div class="card-body"><h6 class="fw-bold mb-1" data-nk-field="title">Video title</h6><div class="small" style="color:var(--nk-text-muted);" data-nk-field="published_at">date</div></div></a></div>
</div>
<div class="card mt-4 p-3 border-0" style="background:var(--nk-surface-2);"><p class="small mb-0" style="color:var(--nk-text-muted);">Hit <code>/api/run/refresh</code> from cron every 30 min to pull in fresh videos from {{config.channelId}}.</p></div>
</div></section>`,
    },
    {
      slug: "watch",
      title: "Watch",
      html: `<section class="py-3"><div class="container" style="max-width:980px;">
<a href="/videos" class="small text-decoration-none" style="color:var(--nk-text-muted);">← All videos</a>
<div id="nk-cf-player" class="mt-2" style="aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;"></div>
<h2 class="fw-bold mt-3" id="nk-cf-title">Loading…</h2>
<script>(function(){
  var vid = new URLSearchParams(location.search).get('id') || '';
  if(!vid) return;
  var kind = '{{config.channelKind}}';
  var embed = kind === 'youtube' ? 'https://www.youtube.com/embed/' + encodeURIComponent(vid) : 'https://player.vimeo.com/video/' + encodeURIComponent(vid);
  document.getElementById('nk-cf-player').innerHTML = '<iframe style="width:100%;height:100%;border:0;" src="'+embed+'" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['list']||'list'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
    .then(function(r){return r.json();}).then(function(rows){
      var m = (rows||[]).find(function(r){ return r.video_id === vid; });
      if(m) document.getElementById('nk-cf-title').textContent = m.title;
    });
})();</script>
</div></section>`,
    },
  ],
};
