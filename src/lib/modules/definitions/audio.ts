import type { ModuleDefinition } from "../types";

export const audio: ModuleDefinition = {
  id: "audio",
  name: "Audio Playlist",
  tagline: "Host a playlist of tracks",
  description:
    "A playlist page that lists audio tracks with title, artist and a streaming URL. Each track gets an HTML5 audio player so visitors can preview directly.",
  icon: "",
  color: "from-purple-500 to-fuchsia-600",
  category: "media",
  version: "1.0.0",
  config: [
    { key: "playlistName", label: "Playlist name", type: "text", default: "My Playlist", required: true },
  ],
  tables: [
    {
      name: "tracks",
      fields: [
        { name: "title", type: "text" },
        { name: "artist", type: "text" },
        { name: "audio_url", type: "text" },
        { name: "cover_url", type: "text" },
        { name: "duration_seconds", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Playlist feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tracks", orderBy: "created_at asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add track",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "tracks", values: {
          title: "{{trigger.title}}",
          artist: "{{trigger.artist}}",
          audio_url: "{{trigger.audio_url}}",
          cover_url: "{{trigger.cover_url}}",
          duration_seconds: "{{trigger.duration_seconds}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "playlist",
      title: "Playlist",
      html: `<section class="py-5" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;"><div class="container text-center"><h1 class="display-4 fw-bold">{{config.playlistName}}</h1></div></section>
<section class="py-5"><div class="container" style="max-width:760px;">
<div data-nk-bind-flow-ref="feed">
  <div class="d-flex align-items-center gap-3 p-3 border-bottom" data-nk-item>
    <img class="rounded" style="width:56px;height:56px;object-fit:cover;" data-nk-src="cover_url" src="https://picsum.photos/seed/a1/120/120" alt=""/>
    <div class="flex-grow-1">
      <div class="fw-bold" data-nk-field="title">Midnight Drive</div>
      <div class="small" style="color:var(--nk-text-muted);" data-nk-field="artist">The Wanderers</div>
    </div>
    <div class="small" style="color:var(--nk-text-muted);">3:42</div>
    <button class="btn btn-sm btn-outline-primary rounded-circle" style="width:36px;height:36px;">&#9654;</button>
  </div>
  <div class="d-flex align-items-center gap-3 p-3 border-bottom">
    <img class="rounded" style="width:56px;height:56px;object-fit:cover;" src="https://picsum.photos/seed/a2/120/120" alt=""/>
    <div class="flex-grow-1"><div class="fw-bold">Sunlight</div><div class="small" style="color:var(--nk-text-muted);">Field Notes</div></div>
    <div class="small" style="color:var(--nk-text-muted);">4:18</div>
    <button class="btn btn-sm btn-outline-primary rounded-circle" style="width:36px;height:36px;">&#9654;</button>
  </div>
  <div class="d-flex align-items-center gap-3 p-3 border-bottom">
    <img class="rounded" style="width:56px;height:56px;object-fit:cover;" src="https://picsum.photos/seed/a3/120/120" alt=""/>
    <div class="flex-grow-1"><div class="fw-bold">Signal Lost</div><div class="small" style="color:var(--nk-text-muted);">Room 12</div></div>
    <div class="small" style="color:var(--nk-text-muted);">2:55</div>
    <button class="btn btn-sm btn-outline-primary rounded-circle" style="width:36px;height:36px;">&#9654;</button>
  </div>
  <div class="d-flex align-items-center gap-3 p-3">
    <img class="rounded" style="width:56px;height:56px;object-fit:cover;" src="https://picsum.photos/seed/a4/120/120" alt=""/>
    <div class="flex-grow-1"><div class="fw-bold">Afterhours</div><div class="small" style="color:var(--nk-text-muted);">Late Bloom</div></div>
    <div class="small" style="color:var(--nk-text-muted);">5:02</div>
    <button class="btn btn-sm btn-outline-primary rounded-circle" style="width:36px;height:36px;">&#9654;</button>
  </div>
</div>
</div></section>`,
    },
    {
      slug: "playlist-admin",
      title: "Add track",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Add a track</h1><form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-8"><label class="form-label">Title</label><input name="title" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Artist</label><input name="artist" class="form-control"/></div><div class="col-12"><label class="form-label">Audio URL (MP3)</label><input name="audio_url" type="url" class="form-control" placeholder="https://..." required/></div><div class="col-md-8"><label class="form-label">Cover image URL</label><input name="cover_url" type="url" class="form-control"/></div><div class="col-md-4"><label class="form-label">Duration (s)</label><input name="duration_seconds" type="number" class="form-control"/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Add</button></div></div></form></div></section>`,
    },
  ],
};
