import { notFound, redirect } from "next/navigation";
import { liveSnapshot } from "./deployments";
import { cookies as nextCookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAppSession, sessionCookieName } from "@/lib/flow/session";
import { getAppLocale, localeBootScript, runtimeText, type AppLocale, type PageLanguage } from "@/lib/app-locale";
import { documentAttributesScript, splitDesignerDocument } from "@/lib/design-studio/document-split";
import { DEFAULT_LOCALE, localeDir, type Locale } from "@/i18n/locales";

const AUTH_MARKER = "<!--nk:require-auth-->";
const ROLE_MARKER_RE = /<!--\s*nk:require-role:([a-zA-Z0-9_-]+)\s*-->/;

export const RUNTIME_JS = `
(function(){
  // ── Project-aware navigation ──────────────────────────────
  // Flow responses can return { redirect: "/login" }. On a /app/<slug>/
  // deployment that would send the browser to the platform's /login page,
  // not the app's. Rewrite any root-relative path whose first segment is
  // a known page slug of this project to the app's base.
  function nkRewritePath(path){
    try {
      if(!path || typeof path !== 'string') return path;
      if(path.indexOf('http') === 0) return path;
      if(path.charAt(0) !== '/') return path;
      var base = (typeof window !== 'undefined' && window.__nkPublicBase) || '';
      if(!base) return path;
      // Leave platform paths alone.
      if(/^\\/(api|uploads|templates|assets|designer|icons|_next|_host|nk-|favicon|nullkode|manifest\\.webmanifest|sw\\.js)(\\/|$)/.test(path)) return path;
      // Static files (images, styles, fonts, media) are shared by every app.
      if(/\\.(png|jpe?g|webp|avif|gif|svg|ico|css|js|mjs|woff2?|ttf|otf|mp4|webm|mp3|wav|pdf|json|txt|xml|map)(\\?|#|$)/i.test(path)) return path;
      // Already prefixed — don't double-prefix.
      if(path === base || path.indexOf(base + '/') === 0 || path.indexOf('/app/') === 0) return path;
      // "/" alone → app root.
      if(path === '/' || path === '') return base + '/';
      // Any other root-relative path → namespace it under the app.
      return base + path;
    } catch(_){ return path; }
  }
  if(typeof window !== 'undefined'){
    window.__nkNavigate = function(p){ window.location.href = nkRewritePath(p); };
  }

  // No auto-injected dark/light toggle. The project's chosen theme is
  // the single source of truth — same as any other website. The editor
  // canvas and the published page render the same colors, fonts and
  // backgrounds, period. If a project wants a user-flippable dark mode
  // it must add its own toggle wired to data-theme="dark" on <html>.

  // The runtime's own visitor texts in the app's language: window.__nkText,
  // set by the page's locale script (lib/app-locale.ts), from
  // messages/<locale>/runtime.json. English apps have none and get the
  // English written here, as before.
  function nkT(key, en, vars){
    var t = (typeof window !== 'undefined' && window.__nkText && window.__nkText[key]) || en;
    if(vars) t = String(t).replace(/\\{(\\w+)\\}/g, function(m, k){ return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m; });
    return t;
  }
  // The language dates and numbers are written in: the app's, or for
  // English apps (as before) the visitor's browser default.
  function nkIntl(){
    var l = typeof window !== 'undefined' && window.__nkLocale && window.__nkLocale.lang;
    return l && l !== 'en' ? l : undefined;
  }

  // Fills {field} placeholders from a row. (This script lives in a template
  // string, so every regex backslash is written twice here.)
  function tpl(str, row){
    return String(str).replace(/\\{(\\w+)\\}/g, function(_, k){
      var v = row[k];
      return v == null ? '' : String(v);
    });
  }
  // Like tpl, but leaves {words} alone unless the row has that field, so
  // ordinary braces in an attribute survive.
  function nkFillKnown(str, row){
    return String(str).replace(/\\{(\\w+)\\}/g, function(m, k){
      if(!row || !Object.prototype.hasOwnProperty.call(row, k)) return m;
      var v = row[k];
      return v == null ? '' : String(v);
    });
  }
  // Values in rows come from the app's visitors, so they are escaped before
  // they touch HTML, and links built from them can't run script.
  function nkEsc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;';
    });
  }
  function nkSafeUrl(v, forSrc){
    var s = String(v == null ? '' : v).trim();
    var bare = s.replace(/[\\u0000-\\u0020]/g, '').toLowerCase();
    if(forSrc && /^data:image\\/(png|jpe?g|gif|webp|avif|svg\\+xml)[;,]/.test(bare)) return s;
    if(/^(javascript|vbscript|data|blob|file):/.test(bare)) return '#';
    return s;
  }
  var NK_URL_ATTRS = { href: 1, src: 0, action: 1, formaction: 1, poster: 0, 'xlink:href': 1, background: 0, cite: 1, data: 1, ping: 1 };
  function nkFillable(name){
    var n = String(name).toLowerCase();
    if(n.indexOf('data-nk-attr-') === 0 || /-template$/.test(n)) return false;
    return n === 'value' || n === 'title' || n === 'alt' || n === 'aria-label' || n === 'placeholder' ||
      n.indexOf('data-') === 0 || Object.prototype.hasOwnProperty.call(NK_URL_ATTRS, n);
  }
  // data-nk-format="date|datetime|time|number|money" on a data-nk-field.
  function nkFormat(val, fmt){
    if(val == null) return '';
    try {
      if(fmt === 'date' || fmt === 'datetime' || fmt === 'time'){
        var d = new Date(val);
        if(isNaN(d.getTime())) return String(val);
        if(fmt === 'date') return d.toLocaleDateString(nkIntl(), { dateStyle: 'medium' });
        if(fmt === 'time') return d.toLocaleTimeString(nkIntl(), { timeStyle: 'short' });
        return d.toLocaleString(nkIntl(), { dateStyle: 'medium', timeStyle: 'short' });
      }
      if(fmt === 'number' || fmt === 'money'){
        var n = Number(val);
        if(!isFinite(n)) return String(val);
        return fmt === 'money' ? n.toLocaleString(nkIntl(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toLocaleString(nkIntl());
      }
    } catch(_){}
    return String(val);
  }
  // Built-in layout for rows without a template: friendly labels, dates
  // formatted, internal columns hidden. Values are escaped.
  function nkLabel(k){ var s = String(k).replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }
  function nkRowCard(r){
    var hidden = /^(id|created_by|updated_at)$|password|_hash$|secret|token/i;
    var when = r.created_at ? '<div class="small" style="color:var(--nk-text-muted);">' + nkEsc(nkFormat(r.created_at, 'datetime')) + '</div>' : '';
    var fields = Object.keys(r).filter(function(k){ return !hidden.test(k) && k !== 'created_at' && r[k] != null && r[k] !== ''; }).map(function(k){
      var v = r[k];
      var text = typeof v === 'object' ? JSON.stringify(v) : /(_at|_date|date)$/i.test(k) ? nkFormat(v, 'datetime') : String(v);
      return '<div><span class="small" style="color:var(--nk-text-muted);">' + nkEsc(nkLabel(k)) + '</span><div style="white-space:pre-wrap;">' + nkEsc(text) + '</div></div>';
    }).join('');
    return '<div class="p-3 mb-2" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);display:grid;gap:.5rem;">' + when + fields + '</div>';
  }
  // The element itself and everything inside it that matches: a row template
  // can be the bound element (<option data-nk-item data-nk-field="name">).
  function nkSelfAndAll(el, sel){
    var list = Array.prototype.slice.call(el.querySelectorAll(sel));
    if(el.matches && el.matches(sel)) list.unshift(el);
    return list;
  }
  function applyRowToElement(el, row){
    if(!el) return;
    // Text fields: <span data-nk-field="name">…</span>. A choice (an <option>,
    // or a radio/checkbox <input>) also gets the value it submits, unless it
    // already has one of its own.
    nkSelfAndAll(el, '[data-nk-field]').forEach(function(f){
      var key = f.getAttribute('data-nk-field');
      var val = row[key];
      var txt = nkFormat(val, f.getAttribute('data-nk-format'));
      if(f.tagName === 'INPUT'){
        if(!f.hasAttribute('value') || f.getAttribute('value') === '' || f.getAttribute('value') === 'on') f.setAttribute('value', val == null ? '' : String(val));
        return;
      }
      f.textContent = txt;
      if(f.tagName === 'OPTION' && (!f.hasAttribute('value') || f.getAttribute('value') === '')) f.setAttribute('value', val == null ? '' : String(val));
    });
    // Pre-fill form inputs from row data — used on edit pages where a
    // "load-<thing>" flow returns the single row to populate. Handles
    // text inputs, textareas, selects, and datetime-local (which needs
    // the "YYYY-MM-DDTHH:mm" form, not a full ISO string with seconds+Z).
    nkSelfAndAll(el, '[data-nk-field-value]').forEach(function(f){
      var key = f.getAttribute('data-nk-field-value');
      var val = row[key];
      if(val == null) return;
      var s = String(val);
      if(f.tagName === 'INPUT' && (f.type === 'datetime-local' || f.type === 'date' || f.type === 'time')){
        var d = new Date(s);
        if(!isNaN(d.getTime())){
          var pad = function(n){ return String(n).padStart(2,'0'); };
          if(f.type === 'datetime-local'){
            s = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
          } else if(f.type === 'date'){
            s = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
          } else {
            s = pad(d.getHours())+':'+pad(d.getMinutes());
          }
        }
      }
      if(f.tagName === 'INPUT' && f.type === 'checkbox'){
        f.checked = (s === 'true' || s === '1' || s === 'on');
      } else {
        f.value = s;
      }
    });
    // Single-attribute shortcuts (legacy + common cases)
    nkSelfAndAll(el, '[data-nk-src]').forEach(function(f){
      var key = f.getAttribute('data-nk-src');
      var val = row[key];
      if(!val) return;
      var url = nkSafeUrl(val, true);
      if(/^(IMG|VIDEO|AUDIO|SOURCE|IFRAME|EMBED|TRACK)$/.test(f.tagName)) { f.setAttribute('src', url); return; }
      // Any other element (a card's picture area, say) shows it as a cover image.
      if(url === '#') return;
      f.style.backgroundImage = 'url("' + encodeURI(url).replace(/%25([0-9A-Fa-f]{2})/g, '%$1') + '")';
      if(!f.style.backgroundSize) f.style.backgroundSize = 'cover';
      if(!f.style.backgroundPosition) f.style.backgroundPosition = 'center';
    });
    nkSelfAndAll(el, '[data-nk-href]').forEach(function(f){
      var key = f.getAttribute('data-nk-href');
      var val = row[key];
      if(val) f.setAttribute('href', nkSafeUrl(val, false));
    });
    // General templated attributes: data-nk-attr-<name>="/path?id={id}&q={q}"
    // The attribute value is a template whose {field} placeholders are filled
    // from the current row, then the result is set as the real <name> attr.
    // We snapshot the attribute list first so setAttribute calls don't mutate
    // the live NamedNodeMap while we're iterating it.
    var nodes = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*')));
    for(var i=0;i<nodes.length;i++){
      var node = nodes[i];
      var snap = [];
      for(var j=0;j<node.attributes.length;j++){
        snap.push({ name: node.attributes[j].name, value: node.attributes[j].value });
      }
      // Plain attributes can hold placeholders too: data-nk-row-id="{id}",
      // value="{id}" on a delete form, href="/edit?id={id}". Fill the ones
      // the row has (event handlers and styles are never touched).
      for(var q=0;q<snap.length;q++){
        var pv = snap[q].value;
        if(pv.indexOf('{') < 0 || !nkFillable(snap[q].name)) continue;
        var fv = nkFillKnown(pv, row);
        if(fv === pv) continue;
        var pl = snap[q].name.toLowerCase();
        if(Object.prototype.hasOwnProperty.call(NK_URL_ATTRS, pl)) fv = nkSafeUrl(fv, pl === 'src' || pl === 'poster' || pl === 'background');
        node.setAttribute(snap[q].name, fv);
      }
      for(var k=0;k<snap.length;k++){
        var aname = snap[k].name;
        if(aname.indexOf('data-nk-attr-') !== 0) continue;
        var real = aname.substring('data-nk-attr-'.length);
        // Never let data create event handlers or inline documents.
        if(!real || /^on/i.test(real) || /^srcdoc$/i.test(real)) continue;
        var filled = tpl(snap[k].value, row);
        var lower = real.toLowerCase();
        if(Object.prototype.hasOwnProperty.call(NK_URL_ATTRS, lower)) filled = nkSafeUrl(filled, lower === 'src' || lower === 'poster' || lower === 'background');
        node.setAttribute(real, filled);
      }
    }
  }
  function fillTemplate(tplHtml, row){
    // Parse inside <template>: a <div> drops <tr>/<td>, so table rows came
    // out as their first link or button only.
    var frag = document.createElement('template');
    frag.innerHTML = tplHtml;
    var item = frag.content.firstElementChild;
    if(!item) return '';
    applyRowToElement(item, row);
    return item.outerHTML;
  }

  function queryStringAsObject(){
    var out = {};
    try {
      var sp = new URLSearchParams(location.search);
      // Old links from before placeholders were filled carry ?id={id}.
      sp.forEach(function(v,k){ if(!/^\\{\\w+\\}$/.test(v)) out[k] = v; });
    } catch(_){}
    return out;
  }

  async function bindFlow(el){
    var flowId = el.getAttribute('data-nk-bind-flow');
    if(!flowId) return;
    if(!el.__nkTplHtml && el.__nkTplHtml !== ''){
      var template = el.querySelector('[data-nk-item]') || el.firstElementChild;
      // A lone "Loading…" line isn't a row template (older module pages had
      // only that); rows then get the built-in readable layout instead.
      var placeholder = template && !template.hasAttribute('data-nk-item') &&
        !template.querySelector('[data-nk-field],[data-nk-src],[data-nk-href],[data-nk-field-value]') &&
        !/data-nk-attr-/.test(template.outerHTML) && /^\\s*loading/i.test(template.textContent || '');
      el.__nkTplHtml = template && !placeholder ? template.outerHTML : '';
    }
    try {
      // Pass URL query params in the POST body so detail pages can bind to
      // flows parameterised by ?id=xxx without any per-page wiring.
      var body = queryStringAsObject();
      // Explicit overrides: data-nk-arg-<name>="value"
      var attrs = el.attributes;
      for(var i=0;i<attrs.length;i++){
        var name = attrs[i].name;
        if(name.indexOf('data-nk-arg-') === 0){
          body[name.substring('data-nk-arg-'.length)] = attrs[i].value;
        }
      }
      // Merge reactive filter values if any
      var filterVals = el.__nkFilters || {};
      for(var fk in filterVals){ if(filterVals.hasOwnProperty(fk)) body[fk] = filterVals[fk]; }
      var res = await fetch('/api/run/'+flowId, {
        method:'POST',
        headers:{'content-type':'application/json'},
        body: JSON.stringify(body),
        credentials:'same-origin',
      });
      var data = {};
      try { data = await res.json(); } catch(_){}
      // A list of rows, { rows: [...] }, or one database row (a "load one"
      // flow like a ticket or an edit page's record) shown as a list of one.
      var single = res.ok && data && typeof data === 'object' && !Array.isArray(data) && data.id != null && data.error == null;
      var rows = Array.isArray(data) ? data : (Array.isArray(data && data.rows) ? data.rows : (single ? [data] : []));
      if(rows.length === 0){
        // In the editor canvas keep the design-time item so it stays editable.
        if(!window.__nkProjectId) return;
        // Published pages: never show placeholder items to visitors.
        var custom = el.querySelector('[data-nk-empty]');
        if(custom){
          Array.prototype.forEach.call(el.children, function(c){ if(c !== custom) c.style.display = 'none'; });
          custom.hidden = false;
          custom.style.display = '';
          return;
        }
        var text = el.getAttribute('data-nk-empty-text') || nkT('nothingHere', 'Nothing here yet.');
        var style = 'color:var(--nk-text-muted);padding:1.5rem 0;text-align:center;list-style:none;';
        var tag = el.tagName;
        el.innerHTML = tag === 'TBODY' || tag === 'TABLE'
          ? '<tr><td colspan="99" class="nk-empty" style="' + style + '"></td></tr>'
          : (tag === 'UL' || tag === 'OL') ? '<li class="nk-empty" style="' + style + '"></li>' : '<p class="nk-empty" style="' + style + '"></p>';
        el.querySelector('.nk-empty').textContent = text;
        return;
      }
      if(el.__nkTplHtml){
        el.innerHTML = rows.map(function(row){ return fillTemplate(el.__nkTplHtml, row); }).join('');
      } else {
        el.innerHTML = rows.map(nkRowCard).join('');
      }
      // Forms inside the rows (a Delete or Buy button) get the same set-up
      // as the page's other forms.
      nkPrepForms(el);
    } catch(err){ console.error('[nk] bind-flow failed', err); }
  }

  // ── Calendar primitive ────────────────────────────────────
  // Renders a month grid of events from a flow that returns rows with a
  // date/timestamp field. Used by schedulers, booking apps, event planners.
  // Layout, nav, and "+N more" overflow are all handled here so the AI (or
  // a user) only has to drop a single <div data-nk-calendar="month" ...>.
  var CAL_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#84cc16','#f97316','#14b8a6'];
  function calHash(s){
    var h = 0, str = String(s || '');
    for(var i=0;i<str.length;i++){ h = ((h<<5)-h) + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }
  function calColorFor(val){
    if(val == null || val === '') return 'var(--nk-primary)';
    return CAL_COLORS[calHash(val) % CAL_COLORS.length];
  }
  function calInjectStyles(){
    if(document.getElementById('nk-cal-styles')) return;
    var s = document.createElement('style');
    s.id = 'nk-cal-styles';
    s.textContent = [
      '.nk-cal{background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius,12px);overflow:hidden;color:var(--nk-text);max-width:100%;}',
      '.nk-cal-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}',
      '@media (max-width:540px){.nk-cal-cell{min-height:70px;padding:.2rem;}.nk-cal-ev{font-size:.6rem;padding:.1rem .3rem;}.nk-cal-dow{font-size:.6rem;padding:.35rem .2rem;}}',
      '.nk-cal-hd{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1rem;border-bottom:1px solid var(--nk-border);}',
      '.nk-cal-title{font-weight:700;font-size:1.05rem;}',
      '.nk-cal-btn{background:transparent;border:1px solid var(--nk-border);color:var(--nk-text);padding:.3rem .7rem;border-radius:8px;cursor:pointer;font-size:.85rem;}',
      '.nk-cal-btn:hover{background:var(--nk-border);}',
      '.nk-cal-btn+.nk-cal-btn{margin-inline-start:.35rem;}',
      '.nk-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);}',
      '.nk-cal-dow{padding:.55rem .5rem;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--nk-text-muted);border-bottom:1px solid var(--nk-border);background:var(--nk-bg,transparent);text-align:center;}',
      '.nk-cal-cell{min-height:110px;border-right:1px solid var(--nk-border);border-bottom:1px solid var(--nk-border);padding:.35rem;display:flex;flex-direction:column;gap:.2rem;background:var(--nk-surface);}',
      '.nk-cal-cell:nth-child(7n){border-right:none;}',
      '.nk-cal-cell.dim{opacity:.45;}',
      '.nk-cal-cell.today .nk-cal-day{background:var(--nk-primary);color:#fff;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;width:1.5rem;height:1.5rem;font-size:.75rem;}',
      '.nk-cal-day{font-size:.75rem;color:var(--nk-text-muted);}',
      '.nk-cal-ev{display:block;font-size:.72rem;padding:.18rem .4rem;border-radius:5px;color:#fff;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none;}',
      '.nk-cal-ev:hover{filter:brightness(1.1);}',
      '.nk-cal-more{font-size:.7rem;color:var(--nk-text-muted);cursor:pointer;padding:.1rem .3rem;}',
      '.nk-cal-empty{padding:2rem;text-align:center;color:var(--nk-text-muted);font-size:.9rem;}',
    ].join('');
    document.head.appendChild(s);
  }
  function calParseDate(v){
    if(v == null || v === '') return null;
    if(v instanceof Date) return isNaN(v.getTime()) ? null : v;
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  function calFmtMonth(d){
    return d.toLocaleDateString(nkIntl(), { month: 'long', year: 'numeric' });
  }
  function calIsSameDay(a, b){
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  }
  async function calFetchOne(flowId){
    if(!flowId) return [];
    try {
      var body = queryStringAsObject();
      var res = await fetch('/api/run/'+flowId, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      });
      var data = {};
      try { data = await res.json(); } catch(_){}
      return Array.isArray(data) ? data : (Array.isArray(data && data.rows) ? data.rows : []);
    } catch(err){ console.error('[nk] calendar fetch failed', err); return []; }
  }
  // Collects every source (self + children with data-nk-calendar-source).
  // Each source carries its own flow id, optional colour/label and optional
  // date/title overrides, so events + travel + reminders can coexist.
  function calSources(el){
    var rootDate = el.getAttribute('data-nk-date-field') || 'date';
    var rootTitle = el.getAttribute('data-nk-title-field') || 'title';
    var out = [];
    var selfFlow = el.getAttribute('data-nk-bind-flow') || el.getAttribute('data-nk-flow');
    if(selfFlow){
      out.push({
        el: el, flowId: selfFlow,
        color: el.getAttribute('data-nk-color') || '',
        label: el.getAttribute('data-nk-label') || '',
        dateField: el.getAttribute('data-nk-date-field') || rootDate,
        titleField: el.getAttribute('data-nk-title-field') || rootTitle,
        hrefTpl: el.getAttribute('data-nk-href-template') || '',
      });
    }
    el.querySelectorAll('[data-nk-calendar-source]').forEach(function(src){
      var fid = src.getAttribute('data-nk-bind-flow') || src.getAttribute('data-nk-flow');
      if(!fid) return;
      out.push({
        el: src, flowId: fid,
        color: src.getAttribute('data-nk-color') || '',
        label: src.getAttribute('data-nk-label') || '',
        dateField: src.getAttribute('data-nk-date-field') || rootDate,
        titleField: src.getAttribute('data-nk-title-field') || rootTitle,
        hrefTpl: src.getAttribute('data-nk-href-template') || el.getAttribute('data-nk-href-template') || '',
      });
      // The source node is a config carrier — don't let it clutter the DOM.
      src.style.display = 'none';
    });
    return out;
  }
  async function calFetchAll(el){
    var srcs = calSources(el);
    if(srcs.length === 0) return [];
    var results = await Promise.all(srcs.map(function(s){ return calFetchOne(s.flowId); }));
    var all = [];
    for(var i=0;i<srcs.length;i++){
      var s = srcs[i];
      for(var j=0;j<results[i].length;j++){
        all.push({ row: results[i][j], src: s });
      }
    }
    return all;
  }
  function calRenderMonth(el){
    var items = el.__nkItems || [];
    var cursor = el.__nkCursor || new Date();
    var colorField = el.getAttribute('data-nk-color-field') || '';

    var year = cursor.getFullYear(), month = cursor.getMonth();
    var first = new Date(year, month, 1);
    var startDow = first.getDay();
    var gridStart = new Date(year, month, 1 - startDow);
    var today = new Date();

    // Bucket merged items by yyyy-mm-dd, using each source's own dateField.
    var buckets = {};
    for(var i=0;i<items.length;i++){
      var it = items[i];
      var d = calParseDate(it.row[it.src.dateField]);
      if(!d) continue;
      var key = d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();
      (buckets[key] = buckets[key] || []).push({ row: it.row, src: it.src, date: d });
    }

    // Legend: one chip per source that carries a label.
    var sources = el.__nkSources || [];
    var legend = '';
    var legendSources = sources.filter(function(s){ return s.label; });
    if(legendSources.length > 0){
      legend = '<div style="display:flex;flex-wrap:wrap;gap:.6rem;padding:.6rem 1rem;border-bottom:1px solid var(--nk-border);font-size:.8rem;">'
        + legendSources.map(function(s){
            var c = s.color || calColorFor(s.label);
            return '<span style="display:inline-flex;align-items:center;gap:.35rem;color:var(--nk-text-muted);"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:'+c+';"></span>'+String(s.label).replace(/</g,'&lt;')+'</span>';
          }).join('')
        + '</div>';
    }

    var dowLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    if(nkIntl()){
      // 1 Jan 2023 was a Sunday.
      try { dowLabels = dowLabels.map(function(_, i){ return new Date(2023, 0, 1 + i).toLocaleDateString(nkIntl(), { weekday: 'short' }); }); } catch(_){}
    }
    var html = '<div class="nk-cal-hd">'
      + '<div class="nk-cal-title">'+calFmtMonth(cursor).replace(/</g,'&lt;')+'</div>'
      + '<div>'
      +   '<button type="button" class="nk-cal-btn" data-nk-cal-nav="prev" aria-label="'+nkEsc(nkT('previousMonth', 'Previous month'))+'">&lsaquo;</button>'
      +   '<button type="button" class="nk-cal-btn" data-nk-cal-nav="today">'+nkEsc(nkT('today', 'Today'))+'</button>'
      +   '<button type="button" class="nk-cal-btn" data-nk-cal-nav="next" aria-label="'+nkEsc(nkT('nextMonth', 'Next month'))+'">&rsaquo;</button>'
      + '</div>'
    + '</div>';
    html += legend;
    html += '<div class="nk-cal-grid">';
    for(var di=0; di<7; di++){ html += '<div class="nk-cal-dow">'+dowLabels[di]+'</div>'; }
    for(var w=0; w<6; w++){
      for(var d2=0; d2<7; d2++){
        var cell = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w*7 + d2);
        var inMonth = cell.getMonth() === month;
        var isToday = calIsSameDay(cell, today);
        var key2 = cell.getFullYear()+'-'+cell.getMonth()+'-'+cell.getDate();
        var dayItems = buckets[key2] || [];
        html += '<div class="nk-cal-cell'+(inMonth?'':' dim')+(isToday?' today':'')+'">';
        html += '<div><span class="nk-cal-day">'+cell.getDate()+'</span></div>';
        var shown = dayItems.slice(0, 3);
        for(var k=0; k<shown.length; k++){
          var it2 = shown[k];
          var title = it2.row[it2.src.titleField] || nkT('untitled', '(untitled)');
          var color = it2.src.color
            || (colorField ? calColorFor(it2.row[colorField]) : '')
            || calColorFor(it2.src.label || it2.src.flowId);
          var href = it2.src.hrefTpl ? nkSafeUrl(tpl(it2.src.hrefTpl, it2.row), false) : '';
          html += '<a class="nk-cal-ev" title="'+nkEsc(title)+'" style="background:'+nkEsc(color)+';"'
               + (href ? ' href="'+nkEsc(href)+'"' : ' href="#"')
               + '>'+nkEsc(title)+'</a>';
        }
        if(dayItems.length > shown.length){
          html += '<div class="nk-cal-more">'+nkEsc(nkT('moreCount', '+{count} more', { count: dayItems.length - shown.length }))+'</div>';
        }
        html += '</div>';
      }
    }
    html += '</div>';
    if(items.length === 0){
      html += '<div class="nk-cal-empty">'+nkEsc(nkT('nothingScheduled', 'Nothing scheduled yet. Add an item to see it on the calendar.'))+'</div>';
    }
    el.classList.add('nk-cal');
    el.innerHTML = html;

    // Wire nav buttons
    el.querySelectorAll('[data-nk-cal-nav]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var dir = btn.getAttribute('data-nk-cal-nav');
        var c = el.__nkCursor || new Date();
        if(dir === 'prev') el.__nkCursor = new Date(c.getFullYear(), c.getMonth()-1, 1);
        else if(dir === 'next') el.__nkCursor = new Date(c.getFullYear(), c.getMonth()+1, 1);
        else el.__nkCursor = new Date();
        calRenderMonth(el);
      });
    });
  }
  async function initCalendar(el){
    calInjectStyles();
    el.__nkCursor = new Date();
    el.__nkSources = calSources(el);
    el.__nkItems = await calFetchAll(el);
    calRenderMonth(el);
  }
  async function refreshCalendar(el){
    el.__nkItems = await calFetchAll(el);
    calRenderMonth(el);
  }

  // ── Notices and form feedback ─────────────────────────────
  // window.nkToast(message, kind) shows a short notice at the bottom of the
  // screen that screen readers read out; kind is 'error', 'success' or
  // anything else for a plain notice. Styles are inline, in the app's
  // --nk-* colours, because apps made in the AI Designer don't load the
  // platform stylesheet.
  function nkToast(msg, kind){
    try {
      var text = String(msg == null ? '' : msg);
      if(!text) return;
      var host = document.getElementById('nk-toasts');
      var fresh = !host;
      if(fresh){
        host = document.createElement('div');
        host.id = 'nk-toasts';
        host.setAttribute('role', 'status');
        host.setAttribute('aria-live', 'polite');
        host.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom, 0px));transform:translateX(-50%);z-index:2147483000;display:flex;flex-direction:column;align-items:center;gap:8px;width:max-content;max-width:calc(100vw - 32px);pointer-events:none;';
        (document.body || document.documentElement).appendChild(host);
      }
      var bad = kind === 'error';
      var edge = bad ? 'var(--nk-danger, #dc2626)' : kind === 'success' ? 'var(--nk-success, #16a34a)' : 'var(--nk-primary, #4f46e5)';
      var t = document.createElement('div');
      if(bad) t.setAttribute('role', 'alert');
      t.textContent = text;
      t.style.cssText = 'pointer-events:auto;box-sizing:border-box;max-width:100%;padding:10px 14px;border-radius:var(--nk-radius-sm, 10px);background:var(--nk-surface, #fff);color:var(--nk-text, #111);border:1px solid var(--nk-border, #e5e7eb);border-inline-start:4px solid ' + edge + ';box-shadow:0 8px 24px rgba(0,0,0,.18);font:inherit;font-size:15px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere;cursor:pointer;';
      t.addEventListener('click', function(){ t.remove(); });
      // A live region that was only just added needs a moment before new
      // text in it is read out.
      setTimeout(function(){ host.appendChild(t); }, fresh ? 150 : 0);
      setTimeout(function(){ t.remove(); }, Math.min(12000, 4000 + text.length * 60));
    } catch(_){}
  }
  if(typeof window !== 'undefined') window.nkToast = nkToast;

  function nkSendFailed(){ return nkT('sendFailed', "Sorry, that didn't send. Please try again."); }
  // The editor shows pages inside GrapesJS's canvas. Forms there aren't
  // re-wired, so the editor's copy of the page is never changed.
  function nkInEditor(){
    try {
      var fr = window.frameElement;
      return !!(fr && /(^|\\s)gjs-frame(\\s|$)/.test(fr.className || ''));
    } catch(_){ return false; }
  }
  // A page whose flow reference was never turned into a flow id (say,
  // data-nk-flow-ref="save-note" left by an interrupted edit) still works:
  // /api/run also accepts a flow's name.
  var NK_REF_ATTRS = [
    ['data-nk-flow-ref', 'data-nk-flow'],
    ['data-nk-bind-flow-ref', 'data-nk-bind-flow'],
    ['data-nk-update-flow-ref', 'data-nk-update-flow'],
    ['data-nk-reorder-flow-ref', 'data-nk-reorder-flow'],
    ['data-nk-logout-ref', 'data-nk-logout'],
    ['data-nk-calendar-flow-ref', 'data-nk-flow'],
  ];
  function nkResolveRefs(root){
    NK_REF_ATTRS.forEach(function(pair){
      root.querySelectorAll('[' + pair[0] + ']').forEach(function(el){
        var ref = el.getAttribute(pair[0]);
        if(ref && !el.hasAttribute(pair[1])) el.setAttribute(pair[1], ref);
      });
    });
  }
  // Every form gets a spam trap: a field people never see or fill in
  // (_nk_hp) and the time the form appeared (_nk_t, in ms). The server may
  // use them to skip obvious bots; it never requires them.
  function nkPrepForm(form){
    if(form.__nkPrepped) return;
    form.__nkPrepped = true;
    if(!form.querySelector('input[name="_nk_hp"]')){
      var hp = document.createElement('input');
      hp.type = 'text';
      hp.name = '_nk_hp';
      hp.setAttribute('tabindex', '-1');
      hp.setAttribute('autocomplete', 'off');
      hp.setAttribute('aria-hidden', 'true');
      // Off-screen on the side that never scrolls (right in right-to-left pages).
      var side = document.documentElement.getAttribute('dir') === 'rtl' ? 'right' : 'left';
      hp.style.cssText = 'position:absolute !important;' + side + ':-10000px !important;top:auto !important;width:1px !important;height:1px !important;overflow:hidden !important;opacity:0 !important;';
      form.appendChild(hp);
    }
    var stamp = form.querySelector('input[name="_nk_t"]');
    if(!stamp){
      stamp = document.createElement('input');
      stamp.type = 'hidden';
      stamp.name = '_nk_t';
      form.appendChild(stamp);
    }
    if(!stamp.value) stamp.value = String(Date.now());
  }
  // Browsers word their "Please fill out this field" bubbles in the
  // visitor's browser language. Apps with a language of their own
  // (window.__nkText) use the app's words instead.
  function nkValidationText(el){
    var v = el.validity;
    if(!v) return '';
    var pattern = function(){ return nkT('fieldPattern', 'Please match the requested format.'); };
    if(v.valueMissing) return (el.tagName === 'SELECT' || el.type === 'radio' || el.type === 'checkbox') ? nkT('fieldChoose', 'Please choose an option.') : nkT('fieldRequired', 'Please fill in this field.');
    if(v.typeMismatch) return el.type === 'email' ? nkT('fieldEmail', 'Please enter an email address.') : el.type === 'url' ? nkT('fieldUrl', 'Please enter a web address.') : pattern();
    if(v.badInput) return nkT('fieldNumber', 'Please enter a number.');
    if(v.tooShort) return nkT('fieldTooShort', 'Please use at least {min} characters.', { min: el.minLength });
    if(v.tooLong) return nkT('fieldTooLong', 'Please use no more than {max} characters.', { max: el.maxLength });
    if(v.rangeUnderflow) return nkT('fieldMin', 'Please enter {min} or more.', { min: el.min });
    if(v.rangeOverflow) return nkT('fieldMax', 'Please enter {max} or less.', { max: el.max });
    if(v.patternMismatch || v.stepMismatch) return pattern();
    return '';
  }
  function nkBindValidation(){
    if(document.__nkValidationBound || !window.__nkText || nkInEditor()) return;
    document.__nkValidationBound = true;
    document.addEventListener('invalid', function(e){
      var el = e.target;
      if(!el || !el.setCustomValidity || !el.form || !el.form.hasAttribute('data-nk-form')) return;
      el.setCustomValidity('');
      if(el.validity.valid) return;
      el.setCustomValidity(nkValidationText(el));
    }, true);
    var clear = function(e){
      var el = e.target;
      if(el && el.setCustomValidity && el.validity && el.validity.customError) el.setCustomValidity('');
    };
    document.addEventListener('input', clear, true);
    document.addEventListener('change', clear, true);
  }
  function nkPrepForms(root){
    root = root || document;
    if(nkInEditor()) return;
    nkResolveRefs(root);
    if(root.matches && root.matches('form[data-nk-form]')) nkPrepForm(root);
    root.querySelectorAll('form[data-nk-form]').forEach(nkPrepForm);
    // Messages in these elements are read out by screen readers.
    root.querySelectorAll('[data-nk-error],[data-nk-success]').forEach(function(el){
      if(!el.getAttribute('role')) el.setAttribute('role', 'status');
      if(!el.getAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
    });
  }
  // Where a form's result is shown: its [data-nk-error] element, or one
  // added right after the form.
  function nkFeedbackEl(form, create){
    var el = form.__nkFeedback || form.querySelector('[data-nk-error]');
    if(!el && create){
      el = document.createElement('div');
      el.setAttribute('data-nk-error', '');
      el.setAttribute('data-nk-auto', '');
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;';
      el.__nkBorn = Date.now();
      form.insertAdjacentElement('afterend', el);
    }
    if(el) form.__nkFeedback = el;
    return el;
  }
  // kind: 'error', 'success' or 'pending'. Errors are announced at once
  // (role=alert), everything else politely.
  function nkPaint(el, text, kind){
    if(!el) return;
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    if(!el.getAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
    var apply = function(){
      el.textContent = text || '';
      if(el.hasAttribute('data-nk-auto')){
        var edge = kind === 'error' ? 'var(--nk-danger, #dc2626)' : kind === 'success' ? 'var(--nk-success, #16a34a)' : 'var(--nk-border, #d1d5db)';
        el.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;' + (text ? 'margin-top:.75rem;padding:.6rem .85rem;border-inline-start:4px solid ' + edge + ';border-radius:var(--nk-radius-sm, 10px);background:color-mix(in srgb, ' + edge + ' 10%, transparent);color:var(--nk-text, inherit);font-size:.95rem;line-height:1.45;' : '');
      } else if(typeof el.className === 'string'){
        if(kind === 'error') el.className = el.className.replace(/\\btext-success\\b/g, 'text-danger');
        else if(kind === 'success') el.className = el.className.replace(/\\btext-danger\\b/g, 'text-success');
      }
    };
    // A live region added a moment ago needs a beat before it's read out.
    if(text && el.__nkBorn && Date.now() - el.__nkBorn < 150) setTimeout(apply, 150);
    else apply();
  }
  function nkShowFeedback(form, text, kind){
    var errEl = nkFeedbackEl(form, false);
    var okEl = form.querySelector('[data-nk-success]');
    if(kind === 'success' && okEl){ nkPaint(okEl, text, kind); nkPaint(errEl, '', kind); return; }
    if(okEl) nkPaint(okEl, '', kind);
    nkPaint(errEl, text, kind);
  }
  // A flow's own error ("Wrong password") is shown when it's a short
  // sentence; anything else gets a plain apology.
  function nkErrorText(body){
    var e = body && typeof body === 'object' ? body.error : null;
    if(typeof e === 'string'){
      e = e.trim();
      if(e && e.length <= 200 && e !== 'Flow not found or disabled') return e;
    }
    return nkSendFailed();
  }
  // The flow's message, or the field named by data-nk-message-field (the
  // AI Assistant shows its answer this way).
  function nkMessageText(form, body){
    var key = form.getAttribute('data-nk-message-field') || 'message';
    var m = body && typeof body === 'object' ? body[key] : null;
    return typeof m === 'string' || typeof m === 'number' ? String(m) : '';
  }

  function runtime(){
    // Wire up leftover flow references, spam traps and message regions
    // before anything is bound.
    nkPrepForms(document);
    nkBindValidation();
    // 0a. Shared nav: hamburger + dropdown toggling for the auto-generated
    //     menu (data-nk-nav). Bootstrap's JS bundle isn't loaded on
    //     published pages, so the collapse/dropdown "show" classes are
    //     driven here. One delegated listener; also closes the expanded
    //     mobile menu after a link is tapped.
    if(!document.__nkNavBound){
      document.__nkNavBound = true;
      document.addEventListener('click', function(e){
        var t = e.target && e.target.closest ? e.target.closest('[data-nk-nav-toggle]') : null;
        if(t){
          e.preventDefault();
          var sel = t.getAttribute('data-nk-nav-toggle');
          var target = sel ? document.querySelector(sel) : null;
          if(target){
            target.classList.toggle('show');
            t.setAttribute('aria-expanded', target.classList.contains('show') ? 'true' : 'false');
          }
          return;
        }
        document.querySelectorAll('.nk-nav .dropdown-menu.show').forEach(function(m){ m.classList.remove('show'); });
        var link = e.target && e.target.closest ? e.target.closest('.nk-nav a[href]') : null;
        if(link){
          document.querySelectorAll('.nk-nav .navbar-collapse.show').forEach(function(m){ m.classList.remove('show'); });
        }
      });
    }

    // 0. Hydrate inputs from the URL query string. A hidden input with
    //    data-nk-qs-field="id" will pick up ?id=… from the URL so detail
    //    pages can forward the current id to form submissions.
    var qs = queryStringAsObject();
    document.querySelectorAll('[data-nk-qs-field]').forEach(function(el){
      var key = el.getAttribute('data-nk-qs-field');
      if(key && qs[key] != null){ el.value = qs[key]; }
    });

    // 1. Forms bound to flows. One listener for the whole page, so forms
    //    that appear later (a Delete or Buy button inside a list's rows)
    //    work too. The outcome is always shown and read out: the flow's
    //    message (or "Done."), or a plain error.
    //    Optional on the form: data-nk-pending-text="Thinking…" while it
    //    sends, data-nk-success-text="…" instead of "Done.", and
    //    data-nk-message-field="answer" to show that field of the reply.
    async function nkSubmit(form, flowId, submitter){
      if(form.__nkSending) return;
      if(!nkInEditor()) nkPrepForm(form);
      nkFeedbackEl(form, true);
      var submit = submitter && submitter.form === form ? submitter : form.querySelector('[type=submit],button:not([type])');
      form.__nkSending = true;
      if(submit){ submit.disabled = true; submit.setAttribute('aria-busy', 'true'); }
      nkShowFeedback(form, form.getAttribute('data-nk-pending-text') || '', 'pending');
      try {
        var hasFile = false;
        form.querySelectorAll('input[type=file]').forEach(function(f){ if(f.files && f.files.length) hasFile = true; });
        var res;
        if(hasFile){
          res = await fetch('/api/run/'+flowId, { method:'POST', body: new FormData(form), credentials:'same-origin' });
        } else {
          var data = {};
          new FormData(form).forEach(function(v,k){
            var el = form.elements[k];
            if(el && el.type === 'checkbox'){ data[k] = el.checked ? (el.value||'true') : 'false'; }
            else { data[k] = v; }
          });
          res = await fetch('/api/run/'+flowId, {
            method:'POST',
            headers:{'content-type':'application/json'},
            body: JSON.stringify(data),
            credentials:'same-origin',
          });
        }
        var body = {};
        try { body = await res.json(); } catch(_){ body = {}; }
        if(!res.ok || (body && body.error)){
          nkShowFeedback(form, nkErrorText(body), 'error');
          form.dispatchEvent(new CustomEvent('nk:error',{detail:body}));
          return;
        }
        form.dispatchEvent(new CustomEvent('nk:success',{detail:body}));
        // A flow can signal the runtime to empty the client-side cart
        // (shop place-order does this after a successful checkout).
        if(body && body.clearCart){ cartWrite([]); }
        if(body && body.redirect){ if(window.__nkNavigate) window.__nkNavigate(body.redirect); else window.location.href = body.redirect; return; }
        form.reset();
        nkShowFeedback(form, nkMessageText(form, body) || form.getAttribute('data-nk-success-text') || nkT('done', 'Done.'), 'success');
        document.querySelectorAll('[data-nk-bind-flow]').forEach(function(el){
          if(el.hasAttribute('data-nk-calendar') || el.hasAttribute('data-nk-calendar-source')) return;
          bindFlow(el);
        });
        document.querySelectorAll('[data-nk-calendar]').forEach(function(el){ refreshCalendar(el); });
      } catch(err){
        console.error('[nk] form submit failed', err);
        nkShowFeedback(form, nkT('sendFailedOffline', "Sorry, that didn't send. Please check your connection and try again."), 'error');
      } finally {
        form.__nkSending = false;
        if(submit){ submit.disabled = false; submit.removeAttribute('aria-busy'); }
      }
    }
    if(!document.__nkFormsBound){
      document.__nkFormsBound = true;
      document.addEventListener('submit', function(e){
        var form = e.target;
        if(!form || form.tagName !== 'FORM' || !form.hasAttribute('data-nk-form')) return;
        var flowId = form.getAttribute('data-nk-flow') || form.getAttribute('data-nk-flow-ref');
        if(!flowId) return;
        e.preventDefault();
        nkSubmit(form, flowId, e.submitter);
      });
    }

    // 2. Data-bound lists (with optional polling refresh).
    //    Skip elements that are actually a calendar or a calendar-source —
    //    those share the same data-nk-bind-flow attribute but are rendered
    //    by the calendar path below, not as a generic list.
    document.querySelectorAll('[data-nk-bind-flow]').forEach(function(el){
      if(el.__nkBound) return;
      if(el.hasAttribute('data-nk-calendar')) return;
      if(el.hasAttribute('data-nk-calendar-source')) return;
      el.__nkBound = true;
      bindFlow(el);
      var refresh = parseInt(el.getAttribute('data-nk-refresh')||'0', 10);
      if(refresh > 0) setInterval(function(){ bindFlow(el); }, refresh);
    });

    // 2a. Calendars — month/week grid fed by the same flow pattern as lists.
    //     Attributes:
    //       data-nk-calendar="month"|"week"
    //       data-nk-flow="<id>" (rewritten from data-nk-calendar-flow-ref="<slug>")
    //       data-nk-date-field="start_time"  (required)
    //       data-nk-end-field="end_time"     (optional)
    //       data-nk-title-field="title"      (optional — defaults to "title")
    //       data-nk-color-field="event_type" (optional — hashed to a palette slot)
    //       data-nk-href-template="/events?id={id}" (optional — click navigates)
    document.querySelectorAll('[data-nk-calendar]').forEach(function(el){
      if(el.__nkBound) return; el.__nkBound = true;
      initCalendar(el);
      var refresh = parseInt(el.getAttribute('data-nk-refresh')||'0', 10);
      if(refresh > 0) setInterval(function(){ refreshCalendar(el); }, refresh);
    });

    // 3. Logout link/button
    document.querySelectorAll('[data-nk-logout]').forEach(function(el){
      if(el.__nkBound) return; el.__nkBound = true;
      el.addEventListener('click', async function(e){
        e.preventDefault();
        var flowId = el.getAttribute('data-nk-logout');
        var redirect = el.getAttribute('data-nk-redirect') || '/';
        try {
          await fetch('/api/run/'+flowId, {
            method:'POST',
            headers:{'content-type':'application/json'},
            body:'{}',
            credentials:'same-origin',
          });
        } catch(_){}
        if(window.__nkNavigate) window.__nkNavigate(redirect); else window.location.href = redirect;
      });
    });

    // 4. Radio player (custom)
    document.querySelectorAll('[data-nk-radio]').forEach(function(el){
      if(el.__nkBound) return; el.__nkBound = true;
      var audio = el.querySelector('[data-nk-radio-audio]') || el.querySelector('audio');
      var btn = el.querySelector('[data-nk-radio-play]');
      var icon = el.querySelector('[data-nk-radio-icon]');
      if(!audio || !btn) return;
      btn.addEventListener('click', function(){
        if(audio.paused){
          var p = audio.play();
          if(p && p.catch) p.catch(function(err){ console.error('[nk] radio play failed', err); });
          el.classList.add('playing');
          if(icon){ icon.innerHTML='&#10074;&#10074;'; icon.style.marginLeft='0'; }
        } else {
          audio.pause();
          el.classList.remove('playing');
          if(icon){ icon.innerHTML='&#9654;'; icon.style.marginLeft='6px'; }
        }
      });
      audio.addEventListener('ended', function(){
        el.classList.remove('playing');
        if(icon){ icon.innerHTML='&#9654;'; icon.style.marginLeft='6px'; }
      });
    });

    // 5. Leaflet maps
    document.querySelectorAll('[data-nk-map]').forEach(function(el){
      if(el.__nkBound) return; el.__nkBound = true;
      if(typeof L === 'undefined'){ return; }
      var lat = parseFloat(el.getAttribute('data-nk-lat')||'47.6062');
      var lng = parseFloat(el.getAttribute('data-nk-lng')||'-122.3321');
      var zoom = parseInt(el.getAttribute('data-nk-zoom')||'13', 10);
      var label = el.getAttribute('data-nk-label') || '';
      var map = L.map(el).setView([lat, lng], zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);
      // Pins from data: data-nk-map-flow (rows with data-nk-lat-field /
      // -lng-field / -label-field, defaults lat, lng, name). Without a centre
      // of its own the map shows all the pins.
      var pinFlow = el.getAttribute('data-nk-map-flow') || el.getAttribute('data-nk-map-flow-ref');
      var ownCenter = el.hasAttribute('data-nk-lat');
      if(!isNaN(lat) && !isNaN(lng) && (!pinFlow || ownCenter)){
        var marker = L.marker([lat, lng]).addTo(map);
        if(label) marker.bindPopup(label).openPopup();
      }
      if(pinFlow){
        var latF = el.getAttribute('data-nk-lat-field') || 'lat', lngF = el.getAttribute('data-nk-lng-field') || 'lng', labelF = el.getAttribute('data-nk-label-field') || 'name';
        fetch('/api/run/'+pinFlow, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(queryStringAsObject()), credentials:'same-origin' })
          .then(function(r){ return r.json(); })
          .then(function(data){
            var rows = Array.isArray(data) ? data : (data && Array.isArray(data.rows) ? data.rows : []);
            var pts = [];
            rows.forEach(function(row){
              var plat = parseFloat(row[latF]), plng = parseFloat(row[lngF]);
              if(isNaN(plat) || isNaN(plng)) return;
              var m = L.marker([plat, plng]).addTo(map);
              if(row[labelF] != null && row[labelF] !== ''){ var tip = document.createElement('span'); tip.textContent = String(row[labelF]); m.bindPopup(tip); }
              pts.push([plat, plng]);
            });
            if(pts.length && !ownCenter) map.fitBounds(pts, { padding: [30, 30], maxZoom: 16 });
          })
          .catch(function(err){ console.error('[nk] map pins failed', err); });
      }
    });

    // 5b. QR codes: <div data-nk-qr="{code}"> shows a QR code of its value
    //     (filled from the row in bound lists). The encoder (qrcode-generator,
    //     the one the app modules use) loads only on pages that have one; the
    //     phone app draws the same codes natively.
    if(document.querySelector('[data-nk-qr]') && !document.__nkQrBound){
      document.__nkQrBound = true;
      var drawQr = function(){
        if(typeof qrcode !== 'function') return;
        if(qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
        document.querySelectorAll('[data-nk-qr]').forEach(function(el){
          var v = el.getAttribute('data-nk-qr') || '';
          if(!v || /\\{\\w+\\}/.test(v) || el.__nkQr === v) return;
          el.__nkQr = v;
          try {
            var qr = qrcode(0, 'M'); qr.addData(v); qr.make();
            var size = qr.getModuleCount() + 8, cell = Math.max(2, Math.floor(Math.min(el.clientWidth || 200, 320) / size));
            var img = document.createElement('img');
            img.src = qr.createDataURL(cell, 4); img.width = img.height = cell * size;
            img.alt = nkT('qrCodeOf', 'QR code: {value}', { value: v });
            el.textContent = ''; el.appendChild(img);
          } catch(err){ console.error('[nk] QR code failed', err); }
        });
      };
      var qrTimer = null;
      if(window.MutationObserver) new MutationObserver(function(){ if(qrTimer) return; qrTimer = setTimeout(function(){ qrTimer = null; drawQr(); }, 50); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-nk-qr'] });
      if(typeof qrcode === 'function') drawQr();
      else {
        var qs = document.createElement('script');
        qs.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
        qs.integrity = 'sha512-ZDSPMa/JM1D+7kdg2x3BsruQ6T/JpJo3jWDWkCZsP+5yVyp1KfESqLI+7RqB5k24F7p2cV7i2YHh/890y6P6Sw==';
        qs.crossOrigin = 'anonymous'; qs.referrerPolicy = 'no-referrer';
        qs.onload = drawQr;
        document.head.appendChild(qs);
      }
    }

    // 6. QR scanner
    document.querySelectorAll('[data-nk-qr-scanner]').forEach(function(el){
      if(el.__nkBound) return; el.__nkBound = true;
      if(typeof jsQR === 'undefined'){ return; }
      var video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      video.style.width = '100%'; video.style.borderRadius = '8px';
      var result = document.createElement('div');
      result.className = 'mt-3 small text-muted';
      result.textContent = nkT('qrPoint', 'Point your camera at a QR code');
      var canvas = document.createElement('canvas');
      canvas.style.display = 'none';
      el.appendChild(video); el.appendChild(canvas); el.appendChild(result);
      var ctx = canvas.getContext('2d');
      var scanning = false;
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function(stream){
        video.srcObject = stream; video.play(); scanning = true; tick();
      }).catch(function(err){
        result.textContent = nkT('qrDenied', 'Camera access denied: {reason}', { reason: err.message });
      });
      function tick(){
        if(!scanning) return;
        if(video.readyState === video.HAVE_ENOUGH_DATA){
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          var code = jsQR(imageData.data, imageData.width, imageData.height);
          if(code){
            result.textContent = nkT('qrScanned', 'Scanned: {value}', { value: code.data });
            var target = el.getAttribute('data-nk-qr-output');
            if(target){
              var input = document.querySelector('[name="'+target+'"]');
              if(input) input.value = code.data;
            }
            if(el.getAttribute('data-nk-qr-once') !== 'false'){
              scanning = false;
              if(video.srcObject){ video.srcObject.getTracks().forEach(function(t){ t.stop(); }); }
              return;
            }
          }
        }
        requestAnimationFrame(tick);
      }
    });

    // 7. Radio station picker — switch the <audio> src on a data-nk-radio
    //    player when the user clicks a station card. Event delegation on
    //    document so dynamically-rendered station lists work without re-
    //    binding after every flow render.
    if(!document.__nkRadioPickBound){
      document.__nkRadioPickBound = true;
      document.addEventListener('click', function(e){
        var btn = e.target && e.target.closest ? e.target.closest('[data-nk-radio-pick]') : null;
        if(!btn) return;
        e.preventDefault();
        var target = btn.getAttribute('data-nk-radio-target') || '';
        var src = btn.getAttribute('data-nk-radio-src') || '';
        if(!src) return;
        var player = target ? document.querySelector(target) : document.querySelector('[data-nk-radio]');
        if(!player) return;
        var audio = player.querySelector('[data-nk-radio-audio]') || player.querySelector('audio');
        if(!audio) return;
        var wasPlaying = !audio.paused;
        audio.pause();
        audio.src = src;
        audio.load();
        var nameEl = player.querySelector('[data-nk-radio-name]');
        if(nameEl){
          var label = btn.getAttribute('data-nk-radio-label') || '';
          if(label) nameEl.textContent = label;
        }
        document.querySelectorAll('[data-nk-radio-pick].active').forEach(function(el){ el.classList.remove('active'); });
        btn.classList.add('active');
        if(wasPlaying){
          var p = audio.play();
          if(p && p.catch) p.catch(function(err){ console.error('[nk] radio swap play failed', err); });
        }
      });
    }

    // 8. Cart (localStorage) — minimal client-side shopping cart so shop
    //    modules can add/remove/list/total items without a server round-trip.
    //    Items are scoped per hostname so two apps on neighbouring
    //    subdomains don't share a basket.
    var CART_KEY = 'nk-cart-' + (location.hostname || 'app');
    function cartRead(){
      try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
      catch(_){ return []; }
    }
    function cartWrite(items){
      try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch(_){}
      window.dispatchEvent(new CustomEvent('nk:cart-change', { detail: items }));
    }
    function cartAdd(item){
      var items = cartRead();
      var key = item.product_id || item.name;
      var existing = items.filter(function(i){ return (i.product_id||i.name) === key; })[0];
      if(existing){ existing.quantity = (parseInt(existing.quantity,10)||1) + (parseInt(item.quantity,10)||1); }
      else { items.push(Object.assign({ quantity: parseInt(item.quantity,10)||1 }, item)); }
      cartWrite(items);
    }
    function cartRemove(key){
      cartWrite(cartRead().filter(function(i){ return (i.product_id||i.name) !== key; }));
    }
    function cartTotal(){
      return cartRead().reduce(function(s, i){
        var p = parseFloat(i.price)||0;
        var q = parseInt(i.quantity,10)||1;
        return s + p*q;
      }, 0);
    }
    function cartRenderCounts(){
      var total = cartTotal();
      var count = cartRead().reduce(function(s,i){ return s + (parseInt(i.quantity,10)||1); }, 0);
      document.querySelectorAll('[data-nk-cart-count]').forEach(function(el){ el.textContent = String(count); });
      document.querySelectorAll('[data-nk-cart-total]').forEach(function(el){ el.textContent = total.toFixed(2); });
    }
    function cartRenderList(){
      document.querySelectorAll('[data-nk-cart-list]').forEach(function(container){
        if(!container.__nkTplHtml){
          var template = container.querySelector('[data-nk-item]') || container.firstElementChild;
          container.__nkTplHtml = template ? template.outerHTML : '';
        }
        var items = cartRead();
        if(items.length === 0){
          container.innerHTML = container.getAttribute('data-nk-empty') || '<div class="text-muted small p-3">' + nkEsc(nkT('cartEmpty', 'Your cart is empty.')) + '</div>';
          return;
        }
        if(container.__nkTplHtml){
          container.innerHTML = items.map(function(row){ return fillTemplate(container.__nkTplHtml, row); }).join('');
          // After render, wire up remove buttons within each item
          container.querySelectorAll('[data-nk-cart-remove]').forEach(function(btn){
            if(btn.__nkBound) return; btn.__nkBound = true;
            btn.addEventListener('click', function(e){
              e.preventDefault();
              cartRemove(btn.getAttribute('data-nk-cart-remove'));
            });
          });
        }
      });
      cartRenderCounts();
    }
    // Add-to-cart buttons (event-delegated so they work inside dynamically
    // rendered product grids): <button data-nk-cart-add data-nk-name="T-shirt"
    // data-nk-price="19.99" data-nk-id="123">Add</button>
    if(!document.__nkCartBound){
      document.__nkCartBound = true;
      document.addEventListener('click', function(e){
        var add = e.target && e.target.closest ? e.target.closest('[data-nk-cart-add]') : null;
        if(add){
          e.preventDefault();
          cartAdd({
            product_id: add.getAttribute('data-nk-id') || '',
            name: add.getAttribute('data-nk-name') || '',
            price: add.getAttribute('data-nk-price') || '0',
            image_url: add.getAttribute('data-nk-image') || '',
            quantity: parseInt(add.getAttribute('data-nk-qty')||'1', 10),
          });
          var original = add.textContent;
          add.textContent = nkT('cartAdded', '✓ Added');
          add.disabled = true;
          setTimeout(function(){ add.textContent = original; add.disabled = false; }, 900);
          return;
        }
        var clear = e.target && e.target.closest ? e.target.closest('[data-nk-cart-clear]') : null;
        if(clear){ e.preventDefault(); cartWrite([]); return; }
      });
    }
    // Checkout: forms that want the cart JSON posted alongside their fields
    // declare data-nk-cart-checkout. We stuff the serialized cart + total into
    // hidden inputs right before the form's normal submit fires.
    document.querySelectorAll('[data-nk-cart-checkout]').forEach(function(form){
      if(form.__nkCartBound) return; form.__nkCartBound = true;
      form.addEventListener('submit', function(){
        var ensure = function(name){
          var input = form.querySelector('input[name="'+name+'"]');
          if(!input){
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            form.appendChild(input);
          }
          return input;
        };
        ensure('items').value = JSON.stringify(cartRead());
        ensure('total').value = cartTotal().toFixed(2);
      }, true);
    });
    window.addEventListener('nk:cart-change', cartRenderList);
    cartRenderList();

    // 9. Inline edit — click a field to edit it in-place, auto-saves on blur.
    // Usage: <span data-nk-inline-edit="field_name" data-nk-update-flow="flow-id" data-nk-row-id="{id}">value</span>
    // The flow receives: { id: rowId, field_name: newValue }
    document.querySelectorAll('[data-nk-inline-edit]').forEach(function(el){
      if(el.__nkBound) return; el.__nkBound = true;
      el.style.cursor = 'pointer';
      el.setAttribute('title', nkT('clickToEdit', 'Click to edit'));
      el.addEventListener('click', function(){
        if(el.querySelector('input,textarea')) return; // already editing
        var field = el.getAttribute('data-nk-inline-edit');
        var flowId = el.getAttribute('data-nk-update-flow') || el.closest('[data-nk-update-flow]')?.getAttribute('data-nk-update-flow');
        var rowId = el.getAttribute('data-nk-row-id') || el.closest('[data-nk-row-id]')?.getAttribute('data-nk-row-id');
        if(!flowId || !rowId) return;
        var current = el.textContent.trim();
        var input = document.createElement('input');
        input.type = 'text';
        input.value = current;
        input.style.cssText = 'width:100%;background:var(--nk-surface);border:1px solid var(--nk-primary);border-radius:var(--nk-radius-sm);padding:2px 6px;color:var(--nk-text);font:inherit;outline:none;';
        el.textContent = '';
        el.appendChild(input);
        input.focus();
        input.select();
        async function save(){
          var newVal = input.value.trim();
          el.textContent = newVal || current;
          if(newVal === current) return;
          try {
            var body = { id: rowId };
            body[field] = newVal;
            await fetch('/api/run/'+flowId, {
              method:'POST',
              headers:{'content-type':'application/json'},
              body: JSON.stringify(body),
              credentials:'same-origin',
            });
            // Refresh any data-bound lists on the page
            document.querySelectorAll('[data-nk-bind-flow]').forEach(function(b){ bindFlow(b); });
          } catch(err){ el.textContent = current; console.error('[nk] inline edit failed', err); }
        }
        input.addEventListener('blur', save);
        input.addEventListener('keydown', function(e){
          if(e.key === 'Enter'){ e.preventDefault(); input.blur(); }
          if(e.key === 'Escape'){ el.textContent = current; }
        });
      });
    });

    // 10. Reactive filters — any input/select can drive any data-bound element.
    // Usage: <select data-nk-filter="department" data-nk-target="#my-list,#my-chart">
    //        <input type="date" data-nk-filter="startDate" data-nk-target="#sales-chart">
    // When the filter changes, every target element re-fetches its flow with
    // the filter values included in the POST body. Works with data-nk-bind-flow
    // lists AND data-nk-chart canvases.
    (function initReactiveFilters(){
      var filters = {};
      var filterEls = document.querySelectorAll('[data-nk-filter]');
      if(!filterEls.length) return;

      function gatherFilters(){
        var out = {};
        document.querySelectorAll('[data-nk-filter]').forEach(function(el){
          var key = el.getAttribute('data-nk-filter');
          var val = el.value || '';
          if(val) out[key] = val;
        });
        return out;
      }

      function refreshTargets(targetSelector){
        var targets = targetSelector
          ? document.querySelectorAll(targetSelector)
          : document.querySelectorAll('[data-nk-bind-flow], canvas[data-nk-chart]');
        var currentFilters = gatherFilters();
        targets.forEach(function(target){
          // Store filters on the element so bindFlow and chart render can use them
          target.__nkFilters = currentFilters;
          // Re-trigger data-bound lists
          if(target.hasAttribute('data-nk-bind-flow')){
            bindFlow(target);
          }
          // Re-trigger charts
          if(target.tagName === 'CANVAS' && target.hasAttribute('data-nk-chart')){
            if(target.__nkChartRender) target.__nkChartRender();
          }
        });
      }

      filterEls.forEach(function(el){
        var events = el.tagName === 'SELECT' ? 'change' : 'change input';
        events.split(' ').forEach(function(evt){
          el.addEventListener(evt, function(){
            var targetSelector = el.getAttribute('data-nk-target');
            refreshTargets(targetSelector);
          });
        });
      });
    })();

    // 11. Chart rendering — lightweight reactive chart from flow data.
    // Supports filter-driven re-fetching via data-nk-filter controls.
    document.querySelectorAll('canvas[data-nk-chart]').forEach(function(canvas){
      if(canvas.__nkBound) return; canvas.__nkBound = true;
      var chartType = canvas.getAttribute('data-nk-chart') || 'bar';
      var flowId = canvas.getAttribute('data-nk-bind-flow');
      var labelField = canvas.getAttribute('data-nk-label-field') || 'name';
      var valueField = canvas.getAttribute('data-nk-value-field') || 'value';
      if(!flowId) return;
      var colors = [
        'var(--nk-primary)','var(--nk-accent)','#f59e0b','#10b981','#ef4444',
        '#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6'
      ];
      function resolveColor(c){
        if(!c.startsWith('var(')) return c;
        var name = c.replace('var(','').replace(')','');
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
      }
      async function render(){
        try {
          // Include reactive filter values in the request
          var body = canvas.__nkFilters || {};
          var res = await fetch('/api/run/'+flowId, {
            method:'POST',
            headers:{'content-type':'application/json'},
            body: JSON.stringify(body),
            credentials:'same-origin',
          });
          var data = await res.json();
          var rows = Array.isArray(data) ? data : (data.rows || data.body || []);
          if(!Array.isArray(rows)){ rows = []; }
          var labels = rows.map(function(r){ return r[labelField] || ''; });
          var values = rows.map(function(r){ return parseFloat(r[valueField]) || 0; });
          var resolved = colors.map(resolveColor);
          var ctx = canvas.getContext('2d');
          if(!ctx) return;
          canvas.width = canvas.offsetWidth * 2;
          canvas.height = canvas.offsetHeight * 2;
          ctx.scale(2,2);
          var w = canvas.offsetWidth;
          var h = canvas.offsetHeight;
          ctx.clearRect(0,0,w,h);

          // Empty state
          if(rows.length === 0){
            ctx.fillStyle = resolveColor('var(--nk-text-muted)');
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(nkT('noData', 'No data'), w/2, h/2);
            return;
          }

          if(chartType === 'bar' || chartType === 'line'){
            var max = Math.max.apply(null, values) || 1;
            var barW = (w - 40) / values.length;
            var chartH = h - 30;
            // Grid lines
            ctx.strokeStyle = resolveColor('var(--nk-border)');
            ctx.lineWidth = 0.5;
            for(var g=0;g<4;g++){
              var gy = chartH - (chartH-10)*(g/3);
              ctx.beginPath(); ctx.moveTo(20,gy); ctx.lineTo(w-10,gy); ctx.stroke();
            }
            for(var i=0;i<values.length;i++){
              var barH = (values[i]/max) * (chartH - 10);
              if(chartType === 'bar'){
                ctx.fillStyle = resolved[i % resolved.length];
                var rx = 20 + i*barW + 4;
                var ry = chartH - barH;
                var rw = barW - 8;
                var rh = barH;
                // Rounded top corners
                var cr = Math.min(4, rw/2);
                ctx.beginPath();
                ctx.moveTo(rx+cr, ry);
                ctx.lineTo(rx+rw-cr, ry);
                ctx.quadraticCurveTo(rx+rw, ry, rx+rw, ry+cr);
                ctx.lineTo(rx+rw, ry+rh);
                ctx.lineTo(rx, ry+rh);
                ctx.lineTo(rx, ry+cr);
                ctx.quadraticCurveTo(rx, ry, rx+cr, ry);
                ctx.fill();
              }
              ctx.fillStyle = resolveColor('var(--nk-text-muted)');
              ctx.font = '10px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(labels[i].slice(0,12), 20 + i*barW + barW/2, h - 5);
              // Value on top of bar
              if(chartType === 'bar'){
                ctx.fillStyle = resolveColor('var(--nk-text)');
                ctx.font = '9px sans-serif';
                ctx.fillText(values[i].toLocaleString(nkIntl()), 20 + i*barW + barW/2, chartH - barH - 4);
              }
            }
            if(chartType === 'line' && values.length > 1){
              // Fill under line
              ctx.beginPath();
              for(var j=0;j<values.length;j++){
                var lx = 20 + j*barW + barW/2;
                var ly = chartH - (values[j]/max)*(chartH-10);
                if(j===0) ctx.moveTo(lx,ly); else ctx.lineTo(lx,ly);
              }
              ctx.lineTo(20 + (values.length-1)*barW + barW/2, chartH);
              ctx.lineTo(20 + barW/2, chartH);
              ctx.closePath();
              ctx.fillStyle = resolveColor('var(--nk-primary)').replace(')', ',0.1)').replace('rgb(', 'rgba(');
              try { ctx.fill(); } catch(_){}
              // Line
              ctx.beginPath();
              ctx.strokeStyle = resolved[0];
              ctx.lineWidth = 2.5;
              ctx.lineJoin = 'round';
              for(var jj=0;jj<values.length;jj++){
                var x2 = 20 + jj*barW + barW/2;
                var y2 = chartH - (values[jj]/max)*(chartH-10);
                if(jj===0) ctx.moveTo(x2,y2); else ctx.lineTo(x2,y2);
              }
              ctx.stroke();
              // Dots
              for(var k=0;k<values.length;k++){
                ctx.beginPath();
                ctx.arc(20+k*barW+barW/2, chartH-(values[k]/max)*(chartH-10), 4, 0, Math.PI*2);
                ctx.fillStyle = resolved[0];
                ctx.fill();
                ctx.strokeStyle = resolveColor('var(--nk-bg)');
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            }
          }
          if(chartType === 'pie' || chartType === 'doughnut'){
            var total = values.reduce(function(a,b){ return a+b; },0) || 1;
            var cx2 = w*0.4, cy2 = h/2, r2 = Math.min(cx2,cy2) - 10;
            var startAngle = -Math.PI/2;
            for(var p=0;p<values.length;p++){
              var slice = (values[p]/total)*Math.PI*2;
              ctx.beginPath();
              ctx.moveTo(cx2,cy2);
              ctx.arc(cx2,cy2,r2,startAngle,startAngle+slice);
              ctx.closePath();
              ctx.fillStyle = resolved[p % resolved.length];
              ctx.fill();
              startAngle += slice;
            }
            if(chartType === 'doughnut'){
              ctx.beginPath();
              ctx.arc(cx2,cy2,r2*0.55,0,Math.PI*2);
              ctx.fillStyle = resolveColor('var(--nk-bg)');
              ctx.fill();
            }
            // Legend on the right
            var lx2 = w*0.72;
            for(var lg=0;lg<Math.min(labels.length,8);lg++){
              ctx.fillStyle = resolved[lg % resolved.length];
              ctx.fillRect(lx2, 16 + lg*22, 10, 10);
              ctx.fillStyle = resolveColor('var(--nk-text)');
              ctx.font = '11px sans-serif';
              ctx.textAlign = 'left';
              ctx.fillText(labels[lg].slice(0,15) + ' (' + values[lg] + ')', lx2+16, 25 + lg*22);
            }
          }
        } catch(err){ console.error('[nk] chart render failed', err); }
      }
      // Expose render function so reactive filters can re-trigger it
      canvas.__nkChartRender = render;
      render();
    });

    // 11. Sortable lists — drag to reorder items.
    // Usage: <div data-nk-sortable data-nk-reorder-flow="flowId">...</div>
    document.querySelectorAll('[data-nk-sortable]').forEach(function(list){
      if(list.__nkBound) return; list.__nkBound = true;
      var items = list.children;
      var dragged = null;
      Array.prototype.forEach.call(items, function(item){
        item.draggable = true;
        item.style.cursor = 'grab';
        item.addEventListener('dragstart', function(e){
          dragged = item;
          item.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', function(){
          item.style.opacity = '1';
          dragged = null;
        });
        item.addEventListener('dragover', function(e){ e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
        item.addEventListener('drop', function(e){
          e.preventDefault();
          if(!dragged || dragged === item) return;
          var rect = item.getBoundingClientRect();
          var mid = rect.top + rect.height/2;
          if(e.clientY < mid) list.insertBefore(dragged, item);
          else list.insertBefore(dragged, item.nextSibling);
          // Fire reorder flow if configured
          var flowId = list.getAttribute('data-nk-reorder-flow');
          if(flowId){
            var order = [];
            Array.prototype.forEach.call(list.children, function(child, idx){
              var id = child.getAttribute('data-nk-row-id');
              if(id) order.push({ id: id, position: idx });
            });
            fetch('/api/run/'+flowId, {
              method:'POST',
              headers:{'content-type':'application/json'},
              body: JSON.stringify({ order: order }),
              credentials:'same-origin',
            }).catch(function(err){ console.error('[nk] reorder failed', err); });
          }
        });
      });
    });

    // 13. Kanban board — drag items between columns, auto-updates status.
    // Usage: <div data-nk-kanban data-nk-update-flow="flowId" data-nk-status-field="status">
    //          <div data-nk-column="todo"><h3>To Do</h3><div data-nk-row-id="1">Task</div></div>
    //          <div data-nk-column="doing"><h3>Doing</h3></div>
    //          <div data-nk-column="done"><h3>Done</h3></div>
    //        </div>
    document.querySelectorAll('[data-nk-kanban]').forEach(function(board){
      if(board.__nkBound) return; board.__nkBound = true;
      var flowId = board.getAttribute('data-nk-update-flow') || board.getAttribute('data-nk-bind-flow');
      var statusField = board.getAttribute('data-nk-status-field') || 'status';
      var columns = board.querySelectorAll('[data-nk-column]');
      var dragged = null;
      columns.forEach(function(col){
        col.addEventListener('dragover', function(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; col.style.background='color-mix(in srgb, var(--nk-primary) 8%, transparent)'; });
        col.addEventListener('dragleave', function(){ col.style.background=''; });
        col.addEventListener('drop', function(e){
          e.preventDefault();
          col.style.background='';
          if(!dragged) return;
          col.appendChild(dragged);
          var rowId = dragged.getAttribute('data-nk-row-id');
          var newStatus = col.getAttribute('data-nk-column');
          if(flowId && rowId && newStatus){
            var body = { id: rowId };
            body[statusField] = newStatus;
            fetch('/api/run/'+flowId, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body), credentials:'same-origin' })
            .catch(function(err){ console.error('[nk] kanban update failed', err); });
          }
        });
      });
      board.querySelectorAll('[data-nk-row-id]').forEach(function(card){
        card.draggable = true;
        card.style.cursor = 'grab';
        card.addEventListener('dragstart', function(e){ dragged=card; card.style.opacity='0.4'; e.dataTransfer.effectAllowed='move'; });
        card.addEventListener('dragend', function(){ card.style.opacity='1'; dragged=null; });
      });
    });

    // 14. Push notifications subscribe
    document.querySelectorAll('[data-nk-push-subscribe]').forEach(function(btn){
      if(btn.__nkBound) return; btn.__nkBound = true;
      btn.addEventListener('click', async function(){
        if(!('serviceWorker' in navigator) || !('PushManager' in window)){
          nkToast(nkT('pushUnavailable', "Notifications aren't available in this browser."), 'error');
          return;
        }
        try {
          // Each app has its own service worker (and so its own subscription).
          var appBase = (window.__nkPublicBase || '').replace(/[/]$/, '');
          var swReg = await navigator.serviceWorker.register(appBase + '/sw.js', { scope: appBase + '/' });
          await navigator.serviceWorker.ready;
          var keyRes = await fetch('/api/push/vapid');
          var keyJson = await keyRes.json();
          if(!keyJson.publicKey){ nkToast(nkT('pushNotSetUp', "Notifications aren't set up for this app yet."), 'error'); return; }
          var sub = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(keyJson.publicKey),
          });
          var flowId = btn.getAttribute('data-nk-push-subscribe');
          await fetch('/api/run/'+flowId, {
            method:'POST',
            headers:{'content-type':'application/json'},
            body: JSON.stringify({ subscription: JSON.stringify(sub), user_agent: navigator.userAgent }),
            credentials:'same-origin',
          });
          btn.textContent = nkT('pushOnButton', 'Notifications on');
          btn.disabled = true;
          nkToast(nkT('pushOn', 'Notifications are on.'), 'success');
        } catch(err){
          console.error('[nk] push subscribe failed', err);
          var blocked = typeof Notification !== 'undefined' && Notification.permission === 'denied';
          nkToast(blocked ? nkT('pushBlocked', "Notifications are blocked for this site. You can allow them in your browser's settings.") : nkT('pushFailed', "We couldn't turn on notifications. Please try again."), 'error');
        }
      });
    });
  }

  function urlB64ToUint8Array(base64){
    var padding = '='.repeat((4 - base64.length % 4) % 4);
    var s = (base64 + padding).replace(/-/g,'+').replace(/_/g,'/');
    var raw = atob(s);
    var out = new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  // ── Auth state propagation ────────────────────────────────
  // Every published page boots with window.__nkProjectId set by the server.
  // We probe /api/nk-session once on load, then:
  //   • toggle elements with data-nk-auth="in"|"out" based on signed-in state
  //   • fill elements with data-nk-user-field="email" (etc.) from the user row
  // This lets scaffolded nav bars show Sign in/Sign up to visitors and
  // My Dashboard/Log out to signed-in users, without any per-page wiring.
  function applyAuthState(state){
    var signedIn = !!(state && state.signedIn);
    var user = (state && state.user) || {};
    var role = (user.role || '').toLowerCase();
    document.querySelectorAll('[data-nk-auth]').forEach(function(el){
      var mode = el.getAttribute('data-nk-auth');
      var show = mode === 'in' ? signedIn : mode === 'out' ? !signedIn : true;
      if(!show){ el.setAttribute('hidden',''); el.style.display = 'none'; }
      else { el.removeAttribute('hidden'); if(el.style.display === 'none') el.style.display = ''; }
    });
    // data-nk-role="admin" — only show when signed-in user matches the role.
    // Multiple roles can be listed comma-separated: data-nk-role="admin,staff".
    document.querySelectorAll('[data-nk-role]').forEach(function(el){
      var want = (el.getAttribute('data-nk-role') || '').toLowerCase().split(',').map(function(s){return s.trim();}).filter(Boolean);
      var show = signedIn && want.indexOf(role) >= 0;
      if(!show){ el.setAttribute('hidden',''); el.style.display = 'none'; }
      else { el.removeAttribute('hidden'); if(el.style.display === 'none') el.style.display = ''; }
    });
    document.querySelectorAll('[data-nk-user-field]').forEach(function(el){
      var key = el.getAttribute('data-nk-user-field');
      var val = key && user ? user[key] : null;
      if(val != null) el.textContent = String(val);
    });
    // Apply the per-user theme preference saved on the user row. This is the
    // ONLY thing that should set data-theme — no localStorage toggle, no OS
    // preference. The user's choice in /settings is authoritative.
    if(signedIn && user.theme_preference === 'dark'){
      document.documentElement.setAttribute('data-theme','dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if(typeof window !== 'undefined'){
      window.__nkSession = { signedIn: signedIn, user: user };
      document.dispatchEvent(new CustomEvent('nk:session', { detail: { signedIn: signedIn, user: user } }));
    }
  }
  async function initAuthState(){
    // Hide both auth-gated groups until we know — prevents flash of wrong UI.
    document.querySelectorAll('[data-nk-auth],[data-nk-role]').forEach(function(el){
      el.style.visibility = 'hidden';
    });
    var projectId = (typeof window !== 'undefined' && window.__nkProjectId) || '';
    try {
      var res = await fetch('/api/nk-session', {
        method: 'GET',
        credentials: 'same-origin',
        headers: projectId ? { 'x-nk-project-id': projectId } : {},
      });
      var data = {};
      try { data = await res.json(); } catch(_){}
      applyAuthState(data);
    } catch(_){
      applyAuthState({ signedIn: false });
    } finally {
      document.querySelectorAll('[data-nk-auth],[data-nk-role]').forEach(function(el){
        el.style.visibility = '';
      });
    }
  }

  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', runtime); }
  else { runtime(); }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', initAuthState); }
  else { initAuthState(); }
  if(typeof window !== 'undefined'){
    window.__nkRuntime = runtime;
    window.__nkBindFlow = bindFlow;
    window.__nkRefreshSession = initAuthState;
  }
})();
`;

export async function loadPublicPage(projectId: string, pageSlug?: string) {
  // Safe publishing: serve the live deployment, not the draft being edited.
  const live = await liveSnapshot(projectId);
  if (live) {
    const page = pageSlug
      ? live.pages.find((p) => p.slug === pageSlug)
      : live.pages.find((p) => p.isHome) ?? live.pages[0];
    return page ? { ...page, projectId } : null;
  }
  if (pageSlug) {
    const page = await db.page.findFirst({
      where: { projectId, slug: pageSlug },
    });
    return page;
  }
  const home = await db.page.findFirst({
    where: { projectId, isHome: true },
  });
  return home ?? (await db.page.findFirst({ where: { projectId } }));
}

/**
 * Tiny boot script each published page renders before RUNTIME_JS. Sets
 * window.__nkProjectId so the runtime can probe /api/nk-session and toggle
 * data-nk-auth elements. Kept separate from RUNTIME_JS so the project id
 * is per-render while RUNTIME_JS can stay a static module constant.
 */
export function publicBootScript(
  projectId: string,
  publicPathBase: string,
  pageSlugs: string[],
): string {
  // Expose the project base + known page slugs so RUNTIME_JS can rewrite
  // any "/slug" path a flow response tells us to navigate to (e.g. logout
  // returning { redirect: "/login" } on a /app/<slug>/… site).
  return (
    `window.__nkProjectId=${JSON.stringify(projectId)};` +
    `window.__nkPublicBase=${JSON.stringify(publicPathBase || "")};` +
    `window.__nkPageSlugs=${JSON.stringify(pageSlugs)};`
  );
}

export function pageRequiresAuth(html: string): boolean {
  return html.includes(AUTH_MARKER);
}

export function pageRequiredRole(html: string): string | null {
  const m = ROLE_MARKER_RE.exec(html);
  return m ? m[1] : null;
}

export async function enforceAuthOrRedirect(
  projectId: string,
  publicPathBase: string,
  loginSlug = "login"
) {
  const jar = await nextCookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifyAppSession(projectId, token);
  if (!session) {
    redirect(`${publicPathBase}/${loginSlug}`);
  }
}

// Enforce a page-level role gate. If the visitor isn't signed in, redirect
// to login. If they are signed in but lack the required role, send them to
// the home page (app root) — pretending the page doesn't exist would be
// worse UX than landing them somewhere they CAN see.
export async function enforceRoleOrRedirect(
  projectId: string,
  publicPathBase: string,
  requiredRole: string,
  loginSlug = "login",
) {
  const jar = await nextCookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifyAppSession(projectId, token);
  if (!session) {
    redirect(`${publicPathBase}/${loginSlug}`);
  }
  // The app's owner (signed in from their dashboard) can open every page.
  if (session!.owner) return;
  // Look up the visitor's role from the auth_users table.
  try {
    const ds = await db.dataSource.findFirst({
      where: { projectId, kind: "POSTGRES_INTERNAL" },
      select: { id: true },
    });
    if (!ds) {
      redirect(publicPathBase || "/");
    }
    const { getAdapter } = await import("@/lib/datasources");
    const { source, adapter } = await getAdapter(ds!.id);
    const rows = (await adapter.list(source, "auth_users", {
      where: { id: session!.userId },
      limit: 1,
    })) as Array<{ role?: string | null }>;
    const role = rows[0]?.role?.toLowerCase().trim() ?? "";
    if (role !== requiredRole.toLowerCase().trim()) {
      redirect(publicPathBase || "/");
    }
  } catch {
    // If the role lookup fails for any reason, default to "not allowed"
    // rather than silently letting them through.
    redirect(publicPathBase || "/");
  }
}

/**
 * Rewrites navigation paths in a published page's HTML so cross-page links
 * resolve correctly. Two jobs:
 *
 *  1. Drop the `.html`/`.htm` extension on href/action targets. The Designer
 *     agent writes `<a href="/inventory.html">`, but pages-mirror.ts stores
 *     each page under an extensionless slug ("inventory"). Without this strip
 *     the link resolves to slug "inventory.html", which never exists, so
 *     every cross-page click 404s. `index.html` collapses to the directory
 *     root (the home page is served at the base, not at slug "index").
 *
 *  2. Namespace root-relative paths under the project's public base
 *     ("/login" -> "/app/<slug>/login") so nav doesn't escape to platform
 *     routes. Skipped when publicPathBase="" (custom-host projects, where
 *     root-level IS the app) — but the `.html` strip in (1) still applies.
 *
 * Platform paths (/api/*, /_next/*, /uploads/*, …) and external URLs are
 * left untouched. `src` attributes only get base-namespacing, never the
 * extension strip (an <iframe src="/x.html"> must keep its extension).
 */
export function rewriteAbsolutePaths(
  html: string,
  publicPathBase: string,
  _pageSlugs: string[],
): string {
  const base = publicPathBase.endsWith("/")
    ? publicPathBase.slice(0, -1)
    : publicPathBase;
  const PLATFORM_RE = /^\/(api|uploads|templates|assets|designer|icons|_next|_host|nk-|favicon|nullkode|manifest\.webmanifest|sw\.js)(\/|$|\b)/;
  // Static files (images, styles, fonts, media) are shared by every app.
  const STATIC_RE = /\.(png|jpe?g|webp|avif|gif|svg|ico|css|js|mjs|woff2?|ttf|otf|mp4|webm|mp3|wav|pdf|json|txt|xml|map)(\?|#|$)/i;

  // Drop a trailing .html/.htm from the path portion only, preserving any
  // ?query or #hash. A path ending in "index" collapses to its parent dir.
  const stripHtml = (p: string): string => {
    const m = /^([^?#]*)([?#].*)?$/.exec(p);
    let pathPart = m ? m[1]! : p;
    const suffix = m && m[2] ? m[2] : "";
    if (/\.html?$/i.test(pathPart)) {
      pathPart = pathPart.replace(/\.html?$/i, "").replace(/(^|\/)index$/i, "$1");
      if (pathPart === "") pathPart = "/";
    }
    return pathPart + suffix;
  };

  return html.replace(
    /\b(href|action|formaction|src)=(["'])(\/[^"'\s>]*)\2/g,
    (match, attr, quote, rawPath) => {
      if (PLATFORM_RE.test(rawPath) || STATIC_RE.test(rawPath)) return match;
      // Navigation attrs lose the .html extension; src keeps it.
      const path = attr === "src" ? rawPath : stripHtml(rawPath);
      // Already prefixed with the app's own base — don't double-prefix.
      if (
        base &&
        (path === base || path.startsWith(base + "/") || path.startsWith("/app/"))
      ) {
        return `${attr}=${quote}${path}${quote}`;
      }
      // "/" or "" → app root.
      if (path === "/" || path === "") {
        return `${attr}=${quote}${base}/${quote}`;
      }
      // Any other root path (/inventory, /login, /contact) → namespace it
      // under the app base (a no-op when base is "" for custom hosts).
      return `${attr}=${quote}${base}${path}${quote}`;
    },
  );
}

const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** What visitors see on a sign-in-only page of an app that has no sign-in page, in the app's language. */
function teamOnlyHtml(locale: Locale = DEFAULT_LOCALE): string {
  const t = (key: string) => escapeText(runtimeText(locale, key));
  return `<section style="padding:clamp(3rem,10vw,7rem) 1.25rem;text-align:center;">
  <div style="max-width:32rem;margin:0 auto;">
    <h1 style="font-size:1.6rem;margin-bottom:.75rem;">${t("teamOnlyTitle")}</h1>
    <p style="color:var(--nk-text-muted);margin-bottom:1.5rem;">${t("teamOnlyBody")}</p>
    <a href="/" class="btn btn-primary">${t("teamOnlyHome")}</a>
  </div>
</section>`;
}

/**
 * The <html> element of a published page: lang and dir from the app's
 * language. Apps without a chosen language keep lang="en" and no dir, as
 * before (an AI Designer page's own lang still applies to those).
 */
export function PublicHtml({ app, lang, children }: { app: AppLocale | null; lang?: Locale | null; children: React.ReactNode }) {
  const explicit = app?.explicit ?? false;
  // A multilingual app's page in one of its other languages (/es/…).
  const shown = explicit && lang && app!.locales.includes(lang) ? lang : explicit ? app!.locale : null;
  return (
    <html lang={shown ?? "en"} dir={shown ? localeDir(shown) : undefined}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Bootstrap + /nk-public.css are added per page by
            <PlatformStylesheets>, which leaves them out for AI Designer
            apps — their own CSS is complete. */}
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * A published page's markup pieces: the AI Designer document split (head
 * elements, body, <html>/<body> attributes), the script that applies those
 * attributes, and the locale script (window.__nkLocale, the runtime's texts).
 * When the app has a chosen language, <html lang dir> come from it (see
 * PublicHtml), not from the page.
 */
export function appDocumentParts(html: string, app: AppLocale, page?: PageLanguage) {
  const split = splitDesignerDocument(html);
  const doc = app.explicit && split.isDocument
    ? { ...split, lang: null, htmlAttrs: Object.fromEntries(Object.entries(split.htmlAttrs).filter(([k]) => k.toLowerCase() !== "dir")) }
    : split;
  return { doc, docAttrs: documentAttributesScript(doc), localeScript: localeBootScript(app, page) };
}

/**
 * The languages the live app offers, its default first. A language added
 * to a multilingual app goes live when the app is published again (its
 * translations are frozen in the snapshot); one removed goes at once.
 */
export async function liveLanguages(projectId: string): Promise<{ app: AppLocale; offered: Locale[] }> {
  const app = await getAppLocale(projectId);
  if (app.locales.length < 2) return { app, offered: [app.locale] };
  const live = await liveSnapshot(projectId);
  const published = live ? (live.locales ?? []) : app.locales;
  return { app, offered: [app.locale, ...app.locales.slice(1).filter((c) => published.includes(c))] };
}

/** A page in one of the app's other languages, as published (or saved, for apps published before snapshots). */
export async function loadTranslation(projectId: string, pageId: string, lang: string): Promise<{ title: string; html: string } | null> {
  const live = await liveSnapshot(projectId);
  if (live) return live.translations?.find((t) => t.pageId === pageId && t.locale === lang) ?? null;
  return db.pageTranslation.findUnique({ where: { pageId_locale: { pageId, locale: lang } }, select: { title: true, html: true } });
}

/**
 * Platform stylesheets for a published page: Bootstrap, /nk-public.css and
 * the app's theme. Apps made in the AI Designer (project kind DESIGNER) ship
 * complete CSS of their own, and these sheets overrode it (e.g. white button
 * text on white buttons) — so Designer apps get none of them. The runtime
 * scripts (auth, forms, data binding, PWA) are unaffected.
 * Bootstrap + nk-public carry a `precedence` so React hoists them into <head>.
 */
export function PlatformStylesheets({ designerApp, themeHref }: { designerApp: boolean; themeHref: string }) {
  if (designerApp) return null;
  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" precedence="nk-platform" />
      <link rel="stylesheet" href="/nk-public.css" precedence="nk-platform" />
      <link rel="stylesheet" href={themeHref} />
    </>
  );
}

export async function renderPublicPage(
  projectId: string,
  publicPathBase: string,
  pageSlug?: string,
  /** Multilingual apps: the language asked for (/es/…); the default otherwise. */
  lang?: Locale | null,
) {
  const source = await loadPublicPage(projectId, pageSlug);
  if (!source) notFound();
  const live = await liveSnapshot(projectId);
  const pageSlugs = live
    ? live.pages.map((p) => p.slug)
    : (await db.page.findMany({ where: { projectId }, select: { slug: true } })).map((p) => p.slug);
  const { app: appLocale, offered } = await liveLanguages(projectId);
  // In another language: its translation (the default language's page until
  // there is one), and links that stay in that language (/es/…).
  const pageLang = lang && lang !== appLocale.locale && offered.includes(lang) ? lang : null;
  const translated = pageLang ? await loadTranslation(projectId, source.id, pageLang) : null;
  const page = translated ? { ...source, title: translated.title, html: translated.html } : source;
  const pageLanguage: PageLanguage | undefined = offered.length > 1 ? { lang: pageLang ?? appLocale.locale, base: publicPathBase } : undefined;
  if (pageLang) publicPathBase = `${publicPathBase}/${pageLang}`;
  const requiredRole = pageRequiredRole(source.html);
  if (pageRequiresAuth(page.html) || requiredRole) {
    const loginSlug = pageSlugs.includes("login") ? "login" : pageSlugs.find((s) => /(^|-)login$/.test(s));
    // Without a sign-in page, only the owner ("Open as owner") gets in;
    // everyone else sees a short note instead of a broken redirect.
    if (!loginSlug) {
      const session = await verifyAppSession(projectId, (await nextCookies()).get(sessionCookieName())?.value);
      if (!session?.owner) return { ...page, html: rewriteAbsolutePaths(teamOnlyHtml(pageLang ?? appLocale.locale), publicPathBase, pageSlugs), css: "", pageSlugs, appLocale, pageLanguage };
    } else {
      if (pageRequiresAuth(source.html)) await enforceAuthOrRedirect(projectId, publicPathBase, loginSlug);
      if (requiredRole) await enforceRoleOrRedirect(projectId, publicPathBase, requiredRole, loginSlug);
    }
  }
  // Always rewrite: strips ".html" so cross-page links match the
  // extensionless page slugs, and (for /app/<slug> hosting) namespaces
  // root-relative paths under the app base. Safe for custom hosts too —
  // with an empty base it only does the ".html" strip.
  const html = rewriteAbsolutePaths(page.html, publicPathBase, pageSlugs);
  return { ...page, html, pageSlugs, appLocale, pageLanguage };
}
