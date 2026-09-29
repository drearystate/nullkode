import type { ModuleDefinition } from "../types";

export const mediaPlaylist: ModuleDefinition = {
  id: "media-playlist",
  name: "Media Playlist",
  tagline: "Curated playlist of mixed audio + video",
  description:
    "An admin-curated playlist combining audio and video items, played through a single unified player. The player auto-advances to the next item, supports skip / replay, and shows a queue panel with thumbnails.",
  icon: "",
  color: "from-violet-600 to-indigo-800",
  category: "media",
  version: "1.0.0",
  config: [
    { key: "playlistName", label: "Playlist name", type: "text", default: "Today's mix", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "kind", type: "text" },
        { name: "title", type: "text" },
        { name: "artist", type: "text" },
        { name: "url", type: "text" },
        { name: "thumb_url", type: "text" },
        { name: "duration_s", type: "int" },
        { name: "sort_order", type: "int" },
      ],
      seed: [
        { kind: "audio", title: "Sample audio", artist: "Various", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", thumb_url: "https://picsum.photos/seed/aud/300/300", duration_s: 372, sort_order: 1 },
        { kind: "video", title: "Big Buck Bunny", artist: "Blender", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", thumb_url: "https://picsum.photos/seed/vid/300/300", duration_s: 596, sort_order: 2 },
      ],
    },
  ],
  flows: [
    {
      slug: "items",
      name: "Playlist items",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "sort_order asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add-item",
      name: "Add an item",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "items",
            values: {
              kind: "{{trigger.kind}}",
              title: "{{trigger.title}}",
              artist: "{{trigger.artist}}",
              url: "{{trigger.url}}",
              thumb_url: "{{trigger.thumb_url}}",
              duration_s: "{{trigger.duration_s}}",
              sort_order: "{{trigger.sort_order}}",
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
  ],
  pages: [
    {
      slug: "playlist",
      title: "Playlist",
      isHome: true,
      html: `<section class="py-4"><div class="container" style="max-width:880px;">
<h1 class="fw-bold">{{config.playlistName}}</h1>
<div class="row g-3 mt-2">
  <div class="col-lg-7">
    <div class="card border-0 shadow-sm">
      <video id="nk-pl-video" controls style="width:100%;background:#000;display:none;" playsinline></video>
      <audio id="nk-pl-audio" controls style="width:100%;display:none;"></audio>
      <div class="card-body">
        <div class="fw-bold fs-5" id="nk-pl-title">Loading…</div>
        <div class="small" style="color:var(--nk-text-muted);" id="nk-pl-artist">—</div>
        <div class="btn-group mt-2"><button class="btn btn-outline-secondary btn-sm" type="button" id="nk-pl-prev">← Prev</button><button class="btn btn-outline-secondary btn-sm" type="button" id="nk-pl-next">Next →</button></div>
      </div>
    </div>
  </div>
  <div class="col-lg-5">
    <h6 class="fw-bold">Queue</h6>
    <div id="nk-pl-queue" style="max-height:60vh;overflow-y:auto;"></div>
  </div>
</div>
<script>(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function safeUrl(u){u=String(u||'');return /^(https?:|\\/|data:image\\/)/i.test(u)?u:'#'}
  function start(m){ var p = m.play(); if(p && p.catch) p.catch(function(){}); }
  var items = []; var idx = 0;
  function play(i){
    if(i < 0 || i >= items.length) return;
    idx = i;
    var it = items[i];
    var a = document.getElementById('nk-pl-audio'); var v = document.getElementById('nk-pl-video');
    a.style.display='none'; v.style.display='none'; a.pause(); v.pause();
    if(it.kind === 'video'){ v.src = safeUrl(it.url); v.style.display='block'; start(v); }
    else { a.src = safeUrl(it.url); a.style.display='block'; start(a); }
    document.getElementById('nk-pl-title').textContent = it.title || '';
    document.getElementById('nk-pl-artist').textContent = it.artist || '';
    Array.from(document.querySelectorAll('[data-pl-idx]')).forEach(function(el){ el.classList.toggle('border-primary', parseInt(el.getAttribute('data-pl-idx'),10) === i); });
  }
  function next(){ play((idx + 1) % items.length); }
  function prev(){ play((idx - 1 + items.length) % items.length); }
  document.getElementById('nk-pl-next').addEventListener('click', next);
  document.getElementById('nk-pl-prev').addEventListener('click', prev);
  document.getElementById('nk-pl-audio').addEventListener('ended', next);
  document.getElementById('nk-pl-video').addEventListener('ended', next);
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['items']||'items'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
    .then(function(r){return r.json();}).then(function(rows){
      items = Array.isArray(rows) ? rows : [];
      document.getElementById('nk-pl-queue').innerHTML = items.map(function(it, i){
        var icon = it.kind === 'video' ? '' : '';
        return '<div data-pl-idx="'+i+'" class="d-flex gap-2 align-items-center p-2 border rounded mb-2" style="cursor:pointer;background:var(--nk-surface);"><img style="width:48px;height:48px;object-fit:cover;border-radius:6px;" src="'+esc(safeUrl(it.thumb_url||'https://picsum.photos/seed/x/100'))+'" alt=""/><div class="flex-grow-1"><div class="fw-bold small">'+icon+' '+esc(it.title||'')+'</div><div class="small" style="color:var(--nk-text-muted);">'+esc(it.artist||'')+'</div></div></div>';
      }).join('');
      document.querySelectorAll('[data-pl-idx]').forEach(function(el){ el.addEventListener('click', function(){ play(parseInt(el.getAttribute('data-pl-idx'),10)); }); });
      if(items.length) play(0);
    });
})();</script>
</div></section>`,
    },
    {
      slug: "playlist-admin",
      title: "Manage playlist",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Playlist items</h1>
<form data-nk-form="" data-nk-flow-ref="add-item" class="card p-3 shadow-sm mt-3">
  <div class="row g-2"><div class="col-md-3"><select name="kind" class="form-select"><option value="audio">Audio</option><option value="video">Video</option></select></div><div class="col-md-9"><input name="title" class="form-control" placeholder="Title" required/></div><div class="col-md-6"><input name="artist" class="form-control" placeholder="Artist / source"/></div><div class="col-md-6"><input name="sort_order" type="number" class="form-control" placeholder="Order"/></div><div class="col-12"><input name="url" type="url" class="form-control" placeholder="Media URL" required/></div><div class="col-12"><input name="thumb_url" type="url" class="form-control" placeholder="Thumbnail URL"/></div></div>
  <button class="btn btn-primary mt-3" type="submit">Add</button>
</form>
<div data-nk-bind-flow-ref="items" data-nk-refresh="15000" class="mt-3">
  <div class="d-flex gap-3 align-items-center p-2 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><img style="width:48px;height:48px;object-fit:cover;border-radius:6px;" data-nk-src="thumb_url" src="https://picsum.photos/seed/x/100"/><div class="flex-grow-1"><div class="fw-bold small" data-nk-field="title">Title</div><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="kind">audio</span> · <span data-nk-field="artist">artist</span></div></div></div>
</div>
</div></section>`,
    },
  ],
};
