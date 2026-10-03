import type { ModuleDefinition } from "../types";

export const radio: ModuleDefinition = {
  id: "radio",
  name: "Radio Player",
  tagline: "Stream multiple radio stations",
  description:
    "A radio page with a big play button, a station directory the listener can switch between live, and a song-request form. Starts with one station seeded from your config and grows as you add more from the admin page.",
  icon: "",
  color: "from-amber-500 to-red-500",
  category: "media",
  version: "1.1.0",
  config: [
    {
      key: "stationName",
      label: "Default station name",
      type: "text",
      default: "My Radio",
      required: true,
    },
    {
      key: "tagline",
      label: "Default station tagline",
      type: "text",
      default: "Streaming 24/7",
    },
    {
      key: "streamUrl",
      label: "Default stream URL (https)",
      type: "url",
      placeholder: "https://example.com/stream.mp3",
      required: true,
    },
  ],
  tables: [
    {
      name: "stations",
      fields: [
        { name: "name", type: "text" },
        { name: "tagline", type: "text" },
        { name: "stream_url", type: "text" },
        { name: "image_url", type: "text" },
        { name: "sort_order", type: "int" },
      ],
      seed: [
        {
          name: "{{config.stationName}}",
          tagline: "{{config.tagline}}",
          stream_url: "{{config.streamUrl}}",
          image_url: "",
          sort_order: 0,
        },
      ],
    },
    {
      name: "requests",
      fields: [
        { name: "listener_name", type: "text" },
        { name: "song_request", type: "text" },
        { name: "message", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "list-stations",
      name: "List stations",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "stations",
            orderBy: "sort_order asc",
            limit: 100,
            output: "rows",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: "{{vars.rows}}" },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add-station",
      name: "Add station",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "stations",
            values: {
              name: "{{trigger.name}}",
              tagline: "{{trigger.tagline}}",
              stream_url: "{{trigger.stream_url}}",
              image_url: "{{trigger.image_url}}",
              sort_order: "{{trigger.sort_order}}",
            },
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: '{"ok":true,"message":"Station added."}' },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "delete-station",
      name: "Delete station",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "delete",
          data: {
            table: "stations",
            where: { id: "{{trigger.id}}" },
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: '{"ok":true,"message":"Station removed."}' },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "request",
      name: "Song request",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "requests",
            values: {
              listener_name: "{{trigger.listener_name}}",
              song_request: "{{trigger.song_request}}",
              message: "{{trigger.message}}",
            },
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: '{"ok":true,"message":"Request sent!"}' },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list-requests",
      name: "Recent requests",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "requests",
            orderBy: "created_at desc",
            limit: 100,
            output: "rows",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: "{{vars.rows}}" },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "radio",
      title: "Radio",
      html: `<section class="py-5 text-center" style="min-height:72vh;background:radial-gradient(circle at 50% 0%,#2a1040 0%,#0a0a14 60%);color:#fff;">
  <div class="container" style="max-width:720px;padding:8vh 1rem 3rem;">
    <div class="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-4" style="background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.35);color:#fda4a4;font-size:11px;font-weight:600;letter-spacing:.25em;text-transform:uppercase;">
      <span style="width:8px;height:8px;border-radius:50%;background:#f87171;animation:nk-radio-pulse 1.6s ease-in-out infinite;"></span>
      Live on air
    </div>
    <h1 class="display-3 fw-bold mb-2" data-nk-radio-name>{{config.stationName}}</h1>
    <p class="lead mb-5" style="color:rgba(255,255,255,0.5);">{{config.tagline}}</p>

    <div data-nk-radio id="nk-radio-player" style="display:flex;flex-direction:column;align-items:center;gap:2rem;">
      <audio data-nk-radio-audio preload="none" src="{{config.streamUrl}}"></audio>
      <button data-nk-radio-play type="button" aria-label="Play live stream" class="border-0 rounded-circle shadow-lg d-flex align-items-center justify-content-center" style="width:128px;height:128px;background:linear-gradient(135deg,#c4a1ff 0%,#6b21a8 100%);color:white;font-size:44px;cursor:pointer;transition:transform .15s ease;">
        <span data-nk-radio-icon style="margin-left:6px;">&#9654;</span>
      </button>
      <div data-nk-radio-eq style="display:flex;gap:6px;align-items:flex-end;height:60px;opacity:.35;transition:opacity .4s ease;">
        <span class="nk-eq-bar" style="animation-delay:-.2s"></span>
        <span class="nk-eq-bar" style="animation-delay:-1.1s"></span>
        <span class="nk-eq-bar" style="animation-delay:-.7s"></span>
        <span class="nk-eq-bar" style="animation-delay:-1.6s"></span>
        <span class="nk-eq-bar" style="animation-delay:-.4s"></span>
        <span class="nk-eq-bar" style="animation-delay:-1.3s"></span>
        <span class="nk-eq-bar" style="animation-delay:-.9s"></span>
        <span class="nk-eq-bar" style="animation-delay:-.5s"></span>
      </div>
    </div>
  </div>
</section>

<section class="py-5"><div class="container" style="max-width:960px;">
  <div class="nk-section-title">
    <span class="nk-eyebrow">STATIONS</span>
    <h2 class="display-6 fw-bold">Pick a station</h2>
    <p class="lead">Tap any station to tune in.</p>
  </div>
  <div data-nk-bind-flow-ref="list-stations" class="row g-3">
    <div class="col-md-6 col-lg-4" data-nk-item>
      <button type="button" class="nk-feature w-100 text-start" data-nk-radio-pick
              data-nk-attr-data-nk-radio-src="{stream_url}"
              data-nk-attr-data-nk-radio-label="{name}"
              data-nk-radio-target="#nk-radio-player"
              style="cursor:pointer;">
        <div class="fw-bold" data-nk-field="name">Station</div>
        <div class="small mt-1" style="color:var(--nk-text-muted);" data-nk-field="tagline">Tagline</div>
      </button>
    </div>
  </div>
</div></section>

<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:640px;">
  <h2 class="fw-bold">Request a song</h2>
  <form data-nk-form="" data-nk-flow-ref="request" class="card p-4 mt-4 shadow-sm">
    <div class="row g-3">
      <div class="col-md-6"><label class="form-label">Your name</label><input name="listener_name" class="form-control" required/></div>
      <div class="col-md-6"><label class="form-label">Song request</label><input name="song_request" class="form-control" required/></div>
      <div class="col-12"><label class="form-label">Message (optional)</label><textarea name="message" class="form-control" rows="3"></textarea></div>
      <div class="col-12 text-end"><button class="btn btn-primary" type="submit">Send request</button></div>
    </div>
    <div data-nk-error class="text-danger small mt-3"></div>
  </form>
</div></section>`,
      css: `.nk-eq-bar{display:inline-block;width:7px;height:100%;border-radius:4px;background:linear-gradient(180deg,#e9d5ff 0%,#a855f7 50%,#6b21a8 100%);transform-origin:bottom;animation:nk-eq-bounce 1.1s ease-in-out infinite;}
@keyframes nk-eq-bounce{0%,100%{transform:scaleY(.15)}50%{transform:scaleY(1)}}
@keyframes nk-radio-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}
[data-nk-radio-play]:hover{transform:scale(1.04);}
[data-nk-radio-play]:active{transform:scale(.97);}
[data-nk-radio].playing [data-nk-radio-eq]{opacity:1 !important;}
[data-nk-radio-pick].active{border-color:var(--nk-primary);background:color-mix(in srgb, var(--nk-primary) 12%, var(--nk-surface));}`,
    },
    {
      slug: "stations",
      title: "Manage stations",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);">
  <div class="container">
    <span class="nk-eyebrow">ADMIN</span>
    <h1 class="display-5 fw-bold mb-2">Stations</h1>
    <p class="lead">Add or remove the stations your listeners can switch to.</p>
    <a class="small mt-2 d-inline-block" data-nk-attr-href="./{{page.radio}}" href="#">← Back to player</a>
  </div>
</section>
<section class="py-5"><div class="container" style="max-width:720px;">
  <h3 class="fw-bold mb-3">Add a new station</h3>
  <form data-nk-form="" data-nk-flow-ref="add-station" class="card p-4 shadow-sm">
    <div class="row g-3">
      <div class="col-md-6"><label class="form-label">Name</label><input name="name" class="form-control" required/></div>
      <div class="col-md-6"><label class="form-label">Tagline</label><input name="tagline" class="form-control"/></div>
      <div class="col-12"><label class="form-label">Stream URL</label><input name="stream_url" class="form-control" placeholder="https://example.com/stream.mp3" required/></div>
      <div class="col-md-8"><label class="form-label">Image URL (optional)</label><input name="image_url" class="form-control"/></div>
      <div class="col-md-4"><label class="form-label">Sort order</label><input name="sort_order" type="number" class="form-control" value="1"/></div>
      <div class="col-12 text-end"><button class="btn btn-primary" type="submit">Add station</button></div>
    </div>
    <div data-nk-error class="text-danger small mt-3"></div>
  </form>
</div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:720px;">
  <h3 class="fw-bold mb-3">Current stations</h3>
  <div data-nk-bind-flow-ref="list-stations">
    <div data-nk-item class="card mb-2">
      <div class="card-body d-flex align-items-center gap-3">
        <div class="flex-grow-1">
          <div class="fw-bold" data-nk-field="name">Station</div>
          <div class="small" style="color:var(--nk-text-muted);" data-nk-field="tagline">Tagline</div>
          <div class="small font-monospace text-truncate" data-nk-field="stream_url">https://…</div>
        </div>
        <form data-nk-form="" data-nk-flow-ref="delete-station" class="m-0">
          <input type="hidden" name="id" data-nk-attr-value="{id}"/>
          <button type="submit" class="btn btn-sm btn-outline-danger">Remove</button>
        </form>
      </div>
    </div>
  </div>
</div></section>`,
    },
  ],
};
