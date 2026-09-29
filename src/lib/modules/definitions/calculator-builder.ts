import type { ModuleDefinition } from "../types";

export const calculatorBuilder: ModuleDefinition = {
  id: "calculator-builder",
  name: "Calculator Builder",
  tagline: "Build embeddable formula calculators",
  description:
    "Build mini calculators with custom inputs and a formula (e.g. mortgage payment, BMI, savings projection, tip splitter, currency converter). Each calculator has a unique slug; embed it anywhere via /calc?slug=…",
  icon: "",
  color: "from-green-600 to-emerald-800",
  category: "utility",
  version: "1.0.0",
  tables: [
    {
      name: "calculators",
      fields: [
        { name: "slug", type: "text" },
        { name: "name", type: "text" },
        { name: "inputs_json", type: "text" },
        { name: "formula", type: "text" },
        { name: "result_label", type: "text" },
      ],
      seed: [
        { slug: "tip", name: "Tip splitter", inputs_json: '[{"key":"bill","label":"Bill ($)","default":50},{"key":"tip","label":"Tip (%)","default":18},{"key":"people","label":"People","default":2}]', formula: "((bill * (1 + tip/100)) / people).toFixed(2)", result_label: "Per person ($)" },
        { slug: "bmi", name: "BMI", inputs_json: '[{"key":"weight_kg","label":"Weight (kg)","default":70},{"key":"height_cm","label":"Height (cm)","default":175}]', formula: "(weight_kg / ((height_cm/100)*(height_cm/100))).toFixed(1)", result_label: "BMI" },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "List calculators",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "calculators", orderBy: "name asc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "by-slug",
      name: "Get calculator by slug",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "calculators", where: { slug: "{{trigger.slug}}" }, limit: 1, output: "row" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.row.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "create",
      name: "Create a calculator",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "calculators",
            values: {
              slug: "{{trigger.slug}}",
              name: "{{trigger.name}}",
              inputs_json: "{{trigger.inputs_json}}",
              formula: "{{trigger.formula}}",
              result_label: "{{trigger.result_label}}",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"redirect":"/calc?slug={{trigger.slug}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "calculators",
      title: "Calculators",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:760px;">
<h1 class="display-5 fw-bold">Calculators</h1>
<div data-nk-bind-flow-ref="list" class="row g-3 mt-3">
  <div class="col-md-6" data-nk-item><a class="card border-0 shadow-sm h-100 p-3 text-decoration-none text-body" data-nk-href-template="/calc?slug={slug}" href="#"><div class="fs-1"></div><h5 class="fw-bold mt-2" data-nk-field="name">Calculator</h5><code class="small" style="color:var(--nk-text-muted);" data-nk-field="slug">slug</code></a></div>
</div>

<form data-nk-form="" data-nk-flow-ref="create" class="card p-3 shadow-sm mt-5">
  <h5 class="fw-bold">Create one</h5>
  <input name="name" class="form-control mb-2" placeholder="Name" required/>
  <input name="slug" class="form-control mb-2" placeholder="url-slug" required/>
  <input name="result_label" class="form-control mb-2" placeholder="Result label"/>
  <label class="form-label small mb-1">Inputs (JSON array of {key,label,default})</label>
  <textarea name="inputs_json" class="form-control font-monospace small mb-2" rows="3" required>[{"key":"a","label":"A","default":10},{"key":"b","label":"B","default":2}]</textarea>
  <label class="form-label small mb-1">Formula (JS expression using input keys)</label>
  <input name="formula" class="form-control font-monospace" placeholder="(a + b).toFixed(2)" required/>
  <button class="btn btn-primary mt-3" type="submit">Create</button>
</form>
</div></section>`,
    },
    {
      slug: "calc",
      title: "Calculator",
      html: `<section class="py-5"><div class="container" style="max-width:480px;">
<a href="/calculators" class="small text-decoration-none" style="color:var(--nk-text-muted);">← All</a>
<h1 class="fw-bold mt-2" id="nk-calc-name">Loading…</h1>
<form id="nk-calc-form" class="card p-4 shadow-sm mt-3"><div id="nk-calc-inputs"></div><button class="btn btn-primary w-100 mt-2" type="submit">Calculate</button></form>
<div class="card p-4 mt-3 text-center" style="background:linear-gradient(135deg,#10b981,#065f46);color:#fff;border:none;border-radius:14px;display:none;" id="nk-calc-result"><div class="small text-uppercase" id="nk-calc-rlabel">Result</div><div class="display-3 fw-bold mt-2" id="nk-calc-rval">—</div></div>
<script>(function(){
  var slug = new URLSearchParams(location.search).get('slug') || '';
  var def = null;
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['by-slug']||'by-slug'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({slug:slug}) })
    .then(function(r){return r.json();}).then(function(c){
      if(!c){ document.getElementById('nk-calc-name').textContent = 'Not found.'; return; }
      def = c;
      document.getElementById('nk-calc-name').textContent = c.name;
      document.getElementById('nk-calc-rlabel').textContent = c.result_label || 'Result';
      var inputs = []; try { inputs = JSON.parse(c.inputs_json || '[]'); } catch(e){}
      document.getElementById('nk-calc-inputs').innerHTML = inputs.map(function(f){
        return '<div class="mb-2"><label class="form-label">'+f.label+'</label><input type="number" step="any" name="'+f.key+'" value="'+(f.default!=null?f.default:'')+'" class="form-control" required/></div>';
      }).join('');
      document.getElementById('nk-calc-form').addEventListener('submit', function(e){
        e.preventDefault();
        var vals = {}; inputs.forEach(function(f){ var el = e.target.querySelector('[name="'+f.key+'"]'); vals[f.key] = parseFloat(el.value); });
        try {
          var keys = Object.keys(vals); var args = keys.map(function(k){return vals[k];});
          var fn = new Function(keys.join(','), 'return ' + c.formula);
          var r = fn.apply(null, args);
          document.getElementById('nk-calc-result').style.display = 'block';
          document.getElementById('nk-calc-rval').textContent = r;
        } catch(err){ alert('Formula error: ' + err.message); }
      });
    });
})();</script>
</div></section>`,
    },
  ],
};
