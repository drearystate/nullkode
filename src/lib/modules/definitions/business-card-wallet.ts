import type { ModuleDefinition } from "../types";

export const businessCardWallet: ModuleDefinition = {
  id: "business-card-wallet",
  name: "Business Card Wallet",
  tagline: "Digital vCard wallet — share & save contacts",
  description:
    "Each user has a digital business card (name, title, company, contact, photo) plus a wallet of cards they've saved from others. Share your card via QR; recipients can scan and one-tap save to their wallet (and export as a vCard file for their phone's address book).",
  icon: "",
  color: "from-blue-700 to-indigo-900",
  category: "community",
  version: "1.0.0",
  worksWith: ["qr-scanner", "auth"],
  tables: [
    {
      name: "cards",
      fields: [
        { name: "name", type: "text" },
        { name: "title", type: "text" },
        { name: "company", type: "text" },
        { name: "email", type: "text" },
        { name: "phone", type: "text" },
        { name: "website", type: "text" },
        { name: "photo_url", type: "text" },
        { name: "linkedin", type: "text" },
        { name: "owner_user_id", type: "text" },
      ],
      seed: [
        { name: "Avery Chen", title: "Founder", company: "Pebble Labs", email: "avery@pebble.example", phone: "+1 415 555 0143", website: "https://pebble.example", photo_url: "https://i.pravatar.cc/200?img=8", linkedin: "https://linkedin.com/in/avery", owner_user_id: "" },
      ],
    },
    {
      name: "saved",
      fields: [
        { name: "saver_user_id", type: "text" },
        { name: "card_id", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "create",
      name: "Create / update my card",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "cards",
            values: {
              name: "{{trigger.name}}",
              title: "{{trigger.title}}",
              company: "{{trigger.company}}",
              email: "{{trigger.email}}",
              phone: "{{trigger.phone}}",
              website: "{{trigger.website}}",
              photo_url: "{{trigger.photo_url}}",
              linkedin: "{{trigger.linkedin}}",
              owner_user_id: "{{trigger.owner_user_id}}",
            },
            output: "card",
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"id":"{{vars.card.id}}","redirect":"/card?id={{vars.card.id}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "get",
      name: "Get a card by id",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "cards", where: { id: "{{trigger.id}}" }, limit: 1, output: "row" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.row.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "save",
      name: "Save a card to my wallet",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "saved", values: { saver_user_id: "{{trigger.saver_user_id}}", card_id: "{{trigger.card_id}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list",
      name: "Browse cards",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "cards", orderBy: "name asc", limit: 200, output: "rows" } },
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
      slug: "cards",
      title: "Cards",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:760px;"><h1 class="fw-bold">Business cards</h1>
<div data-nk-bind-flow-ref="list" data-nk-refresh="30000" class="row g-3 mt-3">
  <div class="col-md-6" data-nk-item><a class="card border-0 shadow-sm h-100 p-3 d-flex flex-row gap-3 align-items-center text-decoration-none text-body" data-nk-href-template="/card?id={id}" href="#"><img class="rounded" style="width:64px;height:64px;object-fit:cover;" data-nk-src="photo_url" src="https://i.pravatar.cc/200" alt=""/><div><div class="fw-bold" data-nk-field="name">Name</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="title">Title</div><div class="small" data-nk-field="company">Company</div></div></a></div>
</div>
</div></section>`,
    },
    {
      slug: "card",
      title: "Business card",
      html: `<section class="py-5"><div class="container" style="max-width:440px;">
<div class="card shadow text-center" style="border-radius:18px;overflow:hidden;">
<div class="p-4 text-white" style="background:linear-gradient(135deg,#1e3a8a,#0f172a);">
<div data-nk-bind-flow-ref="get" data-nk-source="query:id"><div data-nk-item>
  <img class="rounded-circle border border-3 border-light" style="width:100px;height:100px;object-fit:cover;" data-nk-src="photo_url" src="https://i.pravatar.cc/200" alt=""/>
  <h2 class="fw-bold mt-3" data-nk-field="name">Name</h2>
  <div class="small" style="opacity:0.85;"><span data-nk-field="title">Title</span> · <span data-nk-field="company">Company</span></div>
  <hr style="border-color:rgba(255,255,255,.25);"/>
  <div class="small text-start"><div> <a class="text-white" data-nk-href-template="mailto:{email}" href="#"><span data-nk-field="email">email</span></a></div><div> <a class="text-white" data-nk-href-template="tel:{phone}" href="#"><span data-nk-field="phone">phone</span></a></div><div> <a class="text-white" data-nk-href-from="website" href="#" target="_blank"><span data-nk-field="website">site</span></a></div></div>
</div></div>
</div>
<div class="p-3">
  <div id="nk-vcard-qr" class="d-flex justify-content-center"></div>
  <a class="btn btn-primary w-100 mt-2" id="nk-vcard-dl" href="#"> Save to phone (.vcf)</a>
</div>
</div></div></section>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js" integrity="sha512-ZDSPMa/JM1D+7kdg2x3BsruQ6T/JpJo3jWDWkCZsP+5yVyp1KfESqLI+7RqB5k24F7p2cV7i2YHh/890y6P6Sw==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script>(function(){
  var id = new URLSearchParams(location.search).get('id') || '';
  // The QR code opens this very page (whatever address the app lives at).
  var box = document.getElementById('nk-vcard-qr');
  if(box && typeof qrcode === 'function'){
    var qr = qrcode(0, 'M'); qr.addData(location.href.split('#')[0]); qr.make();
    var size = qr.getModuleCount() + 8, cell = Math.max(2, Math.floor(180 / size));
    var img = document.createElement('img');
    img.src = qr.createDataURL(cell, 4); img.width = img.height = cell * size;
    img.alt = 'QR code for this card';
    box.appendChild(img);
  }
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['get']||'get'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id:id}) })
    .then(function(r){return r.json();}).then(function(c){
      if(Array.isArray(c)) c = c[0];
      if(!c || c.error) return;
      var line = function(v){ return String(v == null ? '' : v).replace(/[\\r\\n]+/g, ' '); };
      var vcf = ['BEGIN:VCARD','VERSION:3.0','FN:'+line(c.name),'TITLE:'+line(c.title),'ORG:'+line(c.company),'EMAIL:'+line(c.email),'TEL:'+line(c.phone),'URL:'+line(c.website),'END:VCARD'].join('\\n');
      var blob = new Blob([vcf], {type:'text/vcard'});
      var dl = document.getElementById('nk-vcard-dl');
      dl.href = URL.createObjectURL(blob);
      dl.setAttribute('download', (String(c.name||'card').replace(/\\s+/g,'_').replace(/[^\\w.-]/g,'') || 'card') + '.vcf');
    });
})();</script>`,
    },
    {
      slug: "new-card",
      title: "Create my card",
      html: `<section class="py-5"><div class="container" style="max-width:520px;"><h1 class="fw-bold">My card</h1>
<form data-nk-form="" data-nk-flow-ref="create" class="card p-3 shadow-sm mt-3">
  <div class="row g-2"><div class="col-md-6"><input name="name" class="form-control" placeholder="Name" required/></div><div class="col-md-6"><input name="title" class="form-control" placeholder="Title"/></div><div class="col-12"><input name="company" class="form-control" placeholder="Company"/></div><div class="col-md-6"><input name="email" type="email" class="form-control" placeholder="Email"/></div><div class="col-md-6"><input name="phone" class="form-control" placeholder="Phone"/></div><div class="col-md-6"><input name="website" type="url" class="form-control" placeholder="Website"/></div><div class="col-md-6"><input name="linkedin" type="url" class="form-control" placeholder="LinkedIn"/></div><div class="col-12"><input name="photo_url" type="url" class="form-control" placeholder="Photo URL"/></div></div>
  <button class="btn btn-primary mt-3 w-100" type="submit">Create my card</button>
</form>
</div></section>`,
    },
  ],
};
