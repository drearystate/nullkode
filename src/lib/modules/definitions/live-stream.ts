import type { ModuleDefinition } from "../types";

export const liveStream: ModuleDefinition = {
  id: "live-stream",
  name: "Live Stream",
  tagline: "Embed an HLS / YouTube Live / Twitch stream",
  description:
    "Host a live stream page that embeds an HLS .m3u8, a YouTube Live URL, or a Twitch channel, with a live chat sidebar (polling the realtime-chat flow). Admin sets the stream type + URL; viewers see the player + chat.",
  icon: "",
  color: "from-red-500 to-pink-700",
  category: "media",
  version: "1.0.0",
  worksWith: ["realtime-chat"],
  config: [
    { key: "streamKind", label: "Stream kind", type: "select", default: "hls", options: [{ value: "hls", label: "HLS (.m3u8)" }, { value: "youtube", label: "YouTube Live" }, { value: "twitch", label: "Twitch" }] },
    { key: "streamUrl", label: "Stream URL / channel ID", type: "text", default: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", required: true },
    { key: "title", label: "Stream title", type: "text", default: "Live now", required: true },
  ],
  tables: [
    {
      name: "chat",
      fields: [
        { name: "author", type: "text" },
        { name: "body", type: "text" },
      ],
    },
    {
      name: "viewers",
      fields: [
        { name: "session_id", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "post",
      name: "Post chat message",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "chat", values: { author: "{{trigger.author}}", body: "{{trigger.body}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "messages",
      name: "Recent chat",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "chat", orderBy: "created_at desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "ping-viewer",
      name: "Mark viewer present",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "viewers", values: { session_id: "{{trigger.session_id}}" } } },
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
      slug: "live",
      title: "Live",
      isHome: true,
      html: `<section class="py-3" style="background:#000;color:#fff;"><div class="container"><div class="d-flex justify-content-between align-items-center"><div><span class="badge bg-danger">● LIVE</span> <strong>{{config.title}}</strong></div><div class="small" id="nk-ls-viewers">— watching</div></div></div></section>
<section class="py-3" style="background:#0a0a0a;"><div class="container">
<div class="row g-3">
  <div class="col-lg-8">
    <div id="nk-ls-player" style="aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;"></div>
  </div>
  <div class="col-lg-4">
    <div class="card border-0 shadow-sm" style="background:#111;color:#fff;height:520px;display:flex;flex-direction:column;">
      <div class="card-header" style="background:#111;border-color:#222;"> Live chat</div>
      <div id="nk-ls-chat" class="flex-grow-1 p-2 small" style="overflow-y:auto;"></div>
      <form id="nk-ls-form" class="p-2 d-flex gap-2" style="border-top:1px solid #222;"><input id="nk-ls-author" class="form-control form-control-sm" style="max-width:100px;background:#222;border-color:#333;color:#fff;" placeholder="Name"/><input id="nk-ls-msg" class="form-control form-control-sm" style="background:#222;border-color:#333;color:#fff;" placeholder="Say something" required/><button class="btn btn-primary btn-sm" type="submit">Send</button></form>
    </div>
  </div>
</div>
</div></section>

<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13"></script>
<script>(function(){
  var kind = '{{config.streamKind}}'; var url = '{{config.streamUrl}}';
  var host = document.getElementById('nk-ls-player');
  if(kind === 'youtube'){
    var yid = url.match(/(?:v=|youtu\\.be\\/|live\\/)([\\w-]{11})/); yid = yid ? yid[1] : url;
    host.innerHTML = '<iframe style="width:100%;height:100%;border:0;" src="https://www.youtube.com/embed/'+yid+'?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
  } else if(kind === 'twitch'){
    var ch = url.replace(/.*twitch\\.tv\\//, '');
    host.innerHTML = '<iframe style="width:100%;height:100%;border:0;" src="https://player.twitch.tv/?channel='+ch+'&parent='+location.hostname+'&autoplay=true" allowfullscreen></iframe>';
  } else {
    var video = document.createElement('video'); video.controls = true; video.autoplay = true; video.style.width='100%'; video.style.height='100%'; video.style.background='#000'; host.appendChild(video);
    if(window.Hls && window.Hls.isSupported()){ var hls = new Hls(); hls.loadSource(url); hls.attachMedia(video); }
    else { video.src = url; }
  }
  var SID = sessionStorage.getItem('nk-ls-sid') || Math.random().toString(36).slice(2);
  sessionStorage.setItem('nk-ls-sid', SID);
  function ping(){ fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['ping-viewer']||'ping-viewer'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({session_id:SID}) }); }
  ping(); setInterval(ping, 30000);
  function loadChat(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['messages']||'messages'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
      .then(function(r){return r.json();}).then(function(rows){
        var el = document.getElementById('nk-ls-chat');
        el.innerHTML = (rows||[]).slice().reverse().map(function(m){ return '<div><strong>'+(m.author||'anon').replace(/[<>&]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];})+':</strong> '+(m.body||'').replace(/[<>&]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];})+'</div>'; }).join('');
        el.scrollTop = el.scrollHeight;
      });
  }
  loadChat(); setInterval(loadChat, 4000);
  document.getElementById('nk-ls-form').addEventListener('submit', function(e){
    e.preventDefault();
    var body = { author: document.getElementById('nk-ls-author').value || 'anon', body: document.getElementById('nk-ls-msg').value };
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['post']||'post'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) })
      .then(function(){ document.getElementById('nk-ls-msg').value=''; loadChat(); });
  });
})();</script>`,
    },
  ],
};
