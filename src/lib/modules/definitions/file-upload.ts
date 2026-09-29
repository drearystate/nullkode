import type { ModuleDefinition } from "../types";

export const fileUpload: ModuleDefinition = {
  id: "file-upload",
  name: "File Upload",
  tagline: "Upload files with a form",
  description:
    "Let visitors upload files with a drag-and-drop form. Files land in a per-project storage directory and the URL is saved in a table you can browse.",
  icon: "",
  color: "from-indigo-500 to-blue-600",
  category: "utility",
  version: "1.0.0",
  provides: ["file-upload"],
  config: [
    { key: "heading", label: "Page heading", type: "text", default: "Upload a file", required: true },
  ],
  tables: [
    {
      name: "files",
      fields: [
        { name: "original_name", type: "text" },
        { name: "url", type: "text" },
        { name: "uploaded_by", type: "text" },
        { name: "notes", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "upload",
      name: "Record uploaded file",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "files",
            values: {
              original_name: "{{trigger.original_name}}",
              url: "{{trigger.url}}",
              uploaded_by: "{{trigger.uploaded_by}}",
              notes: "{{trigger.notes}}",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"File uploaded!"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "feed",
      name: "List files",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "files", orderBy: "created_at desc", limit: 200, output: "rows" } },
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
      slug: "upload",
      title: "Upload",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="display-5 fw-bold">{{config.heading}}</h1><p style="color:var(--nk-text-muted);">Drag a file in or click to browse. Max 20MB.</p>
<form id="nk-upload-form" class="card p-4 mt-4 shadow-sm" onsubmit="(async function(e){e.preventDefault();var f=e.target;var fd=new FormData();var file=f.querySelector('input[type=file]').files[0];if(!file)return;fd.append('file',file);var up=await fetch('/api/upload',{method:'POST',body:fd});var j=await up.json();if(!j.ok){alert('Upload failed');return;}var flow=f.getAttribute('data-nk-flow');var rec=await fetch('/api/run/'+flow,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({original_name:file.name,url:j.files.file,uploaded_by:f.querySelector('[name=uploaded_by]').value,notes:f.querySelector('[name=notes]').value})});f.reset();if(typeof window.__nkBindFlow==='function'){document.querySelectorAll('[data-nk-bind-flow]').forEach(function(el){window.__nkBindFlow(el);});}alert('Uploaded!');})(event);" data-nk-flow="__submit__">
  <div class="mb-3"><label class="form-label">Your name</label><input name="uploaded_by" class="form-control" required/></div>
  <div class="mb-3"><label class="form-label">Pick a file</label><input type="file" name="file" class="form-control" required/></div>
  <div class="mb-3"><label class="form-label">Notes (optional)</label><input name="notes" class="form-control"/></div>
  <div class="text-end"><button class="btn btn-primary btn-lg" type="submit">Upload file</button></div>
</form>
<script>document.getElementById('nk-upload-form').setAttribute('data-nk-flow', document.querySelector('[data-nk-bind-flow]').getAttribute('data-nk-bind-flow').replace('{{NOPE}}', ''));</script>
<h3 class="fw-bold mt-5">Recent uploads</h3>
<div data-nk-bind-flow-ref="feed" class="mt-3">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item>
    <div class="fs-2"></div>
    <div class="flex-grow-1"><div class="fw-bold" data-nk-field="original_name">design-mockup.pdf</div><div class="small" style="color:var(--nk-text-muted);">by <span data-nk-field="uploaded_by">Alex</span> · <span data-nk-field="notes">Final approved version</span></div></div>
    <a class="btn btn-outline-primary btn-sm" data-nk-href="url" href="#">Open</a>
  </div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="fs-2"></div><div class="flex-grow-1"><div class="fw-bold">product-hero.png</div><div class="small" style="color:var(--nk-text-muted);">by Jordan · Ready for the landing page</div></div><a class="btn btn-outline-primary btn-sm" href="#">Open</a></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border" style="background:var(--nk-surface);"><div class="fs-2"></div><div class="flex-grow-1"><div class="fw-bold">quarterly-report.xlsx</div><div class="small" style="color:var(--nk-text-muted);">by Priya · Q1 numbers</div></div><a class="btn btn-outline-primary btn-sm" href="#">Open</a></div>
</div>
</div></section>`,
    },
  ],
};
