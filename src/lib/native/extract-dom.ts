/**
 * Scripts the native compiler runs inside the published page (headless
 * Chromium at the design width). They are plain JavaScript strings, not
 * functions, so no bundler or TS transform can add helpers to them before
 * they reach the page. Written with String.raw: no backticks and no "${"
 * inside.
 *
 * Steps (lib/native/compile.ts drives them):
 *   INSTRUMENT_JS  (init script, before any page script) records which
 *                  elements get event listeners, so subtrees with their own
 *                  scripts can become web islands.
 *   PREP_JS        settles the page: animations off, pseudo-elements turned
 *                  into real elements, transforms recorded then switched off
 *                  (boxes are measured untransformed), islands marked.
 *   MEASURE_JS     records every element's box at the current viewport
 *                  (run at 390 and again at 430 px so the builder can tell
 *                  stretchy boxes from fixed ones).
 *   BUILD_JS       walks the DOM and returns the page tree (NativeNode
 *                  shapes, with fonts still as CSS stacks; compile.ts
 *                  resolves them).
 */

export const INSTRUMENT_JS = String.raw`
(function(){
  if (window.__nkListen) return;
  var rec = [];
  window.__nkListen = rec;
  var TYPES = { click:1, submit:1, input:1, change:1, keydown:1, keyup:1, keypress:1, pointerdown:1, pointerup:1, mousedown:1, mouseup:1, touchstart:1, touchend:1, dblclick:1 };
  var orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, fn, opts){
    try {
      if (TYPES[type] && this instanceof Element && fn) {
        var src = typeof fn === 'function' ? Function.prototype.toString.call(fn) : (fn.handleEvent ? Function.prototype.toString.call(fn.handleEvent) : '');
        rec.push({ el: this, type: type, src: src.slice(0, 4000) });
      }
    } catch (e) {}
    return orig.call(this, type, fn, opts);
  };
})();
`;

/**
 * Reads the size and insets of every ::before/::after with content, at the
 * current viewport (run at 390 and 430 px before PREP_JS), so PREP_JS can
 * tell sizes that follow the page (100%, inset: 0) from fixed ones.
 */
export const PSEUDO_READ_JS = String.raw`
(function(pass){
  var doc = document;
  var out = window['__nkPseudo_' + pass] = {};
  var SKIP = { SCRIPT:1, STYLE:1, LINK:1, META:1, TEMPLATE:1, NOSCRIPT:1, INPUT:1, IMG:1, BR:1, HR:1, IFRAME:1, VIDEO:1, CANVAS:1, SELECT:1, TEXTAREA:1, OPTION:1 };
  var all = doc.body.querySelectorAll('*');
  var k = 0;
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (SKIP[el.tagName] || el.closest('svg,[data-nk-nav]')) continue;
    if (el.__nkPH == null) el.__nkPH = ++k + Math.random();
    ['::before', '::after'].forEach(function(w){
      var cs = getComputedStyle(el, w);
      if (!cs.content || cs.content === 'none' || cs.content === 'normal' || cs.display === 'none') return;
      out[el.__nkPH + w] = { width: cs.width, height: cs.height, left: cs.left, right: cs.right, top: cs.top, bottom: cs.bottom, marginLeft: cs.marginLeft, marginRight: cs.marginRight, maxWidth: cs.maxWidth };
    });
  }
  return Object.keys(out).length;
})
`;

export const PREP_JS = String.raw`
(function(){
  var doc = document;
  // 1. Animations and transitions off: everything shows its resting state.
  var st = doc.createElement('style');
  st.setAttribute('data-nk-native', 'prep');
  st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
  doc.head.appendChild(st);
  void doc.body.offsetHeight;

  // Elements the runtime hid until the session was known.
  doc.querySelectorAll('[data-nk-auth],[data-nk-role]').forEach(function(el){ if (el.style.visibility === 'hidden') el.style.visibility = ''; });

  var SKIP = { SCRIPT:1, STYLE:1, LINK:1, META:1, TEMPLATE:1, NOSCRIPT:1, HEAD:1, TITLE:1, BASE:1 };

  // 2. Pseudo-elements with content become real <nk-pseudo> elements that
  //    copy their computed style, so the rest of the compiler treats them
  //    like any element (overlays, frames, decorative bars, icons).
  var PROPS = null;
  function pseudo(el, which){
    var cs = getComputedStyle(el, which);
    var content = cs.content;
    if (!content || content === 'none' || content === 'normal' || cs.display === 'none') return;
    var text = '';
    var m = /^"((?:[^"\\]|\\.)*)"$/.exec(content);
    if (m) text = m[1].replace(/\\(.)/g, '$1');
    else if (/^url\(/.test(content)) text = '';
    else if (content.indexOf('"') === 0) text = content.replace(/^"|"$/g, '');
    else return; // counters / attr(): not supported yet
    // Nothing visible: no text, no box.
    var w = parseFloat(cs.width) || 0, h = parseFloat(cs.height) || 0;
    var hasBox = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) || parseFloat(cs.borderLeftWidth) || parseFloat(cs.borderBottomWidth) || parseFloat(cs.borderRightWidth) || cs.boxShadow !== 'none');
    if (!text && !hasBox) return;
    if (!text && cs.position !== 'absolute' && cs.position !== 'fixed' && !(w && h) && cs.display.indexOf('inline') === 0) return;
    if (!PROPS) { PROPS = []; for (var i = 0; i < cs.length; i++) PROPS.push(cs[i]); }
    var span = doc.createElement('nk-pseudo');
    span.setAttribute('data-nk-pseudo', which === '::before' ? 'before' : 'after');
    var css = '';
    // Sizes that change with the viewport are left to the layout (auto).
    var ra = (window.__nkPseudo_a || {})[el.__nkPH + which], rb = (window.__nkPseudo_b || {})[el.__nkPH + which];
    var fluid = {};
    if (ra && rb) {
      var abs = cs.position === 'absolute' || cs.position === 'fixed';
      if (ra.width !== rb.width) { fluid.width = 1; fluid['inline-size'] = 1; if (abs && ra.left !== rb.left) fluid.left = 1; if (abs && ra.right !== rb.right) fluid.right = 1; }
      if (ra.height !== rb.height) { fluid.height = 1; fluid['block-size'] = 1; }
      if (abs && ra.left === rb.left && ra.right === rb.right) { fluid.width = 1; fluid['inline-size'] = 1; }
      if (ra.marginLeft !== rb.marginLeft) { fluid['margin-left'] = 1; fluid['margin-inline-start'] = 1; }
      if (ra.marginRight !== rb.marginRight) { fluid['margin-right'] = 1; fluid['margin-inline-end'] = 1; }
    }
    for (var j = 0; j < PROPS.length; j++) {
      var p = PROPS[j];
      if (p === 'content' || p.indexOf('--') === 0 || fluid[p]) continue;
      if (fluid.left && (p === 'inset-inline-start' || p === 'inset-inline-end')) continue;
      var v = cs.getPropertyValue(p);
      if (v) css += p + ':' + v + ';';
    }
    if (fluid.width && cs.position !== 'absolute' && cs.position !== 'fixed' && /^(block|flex|grid|list-item)$/.test(cs.display)) css += 'width:auto;';
    span.setAttribute('style', css);
    if (text) span.textContent = text;
    if (which === '::before') el.insertBefore(span, el.firstChild); else el.appendChild(span);
    el.setAttribute('data-nk-pseudo-host-' + (which === '::before' ? 'b' : 'a'), '');
  }
  var all = doc.body.querySelectorAll('*');
  var hosts = [];
  for (var k = 0; k < all.length; k++) {
    var el = all[k];
    if (SKIP[el.tagName] || el.closest('svg,[data-nk-nav],select,textarea')) continue;
    if (el.tagName === 'INPUT' || el.tagName === 'IMG' || el.tagName === 'BR' || el.tagName === 'HR' || el.tagName === 'IFRAME' || el.tagName === 'VIDEO' || el.tagName === 'CANVAS') continue;
    hosts.push(el);
  }
  for (var q = 0; q < hosts.length; q++) { pseudo(hosts[q], '::before'); pseudo(hosts[q], '::after'); }
  var kill = doc.createElement('style');
  kill.setAttribute('data-nk-native', 'pseudo');
  kill.textContent = '[data-nk-pseudo-host-b]::before{content:none!important}[data-nk-pseudo-host-a]::after{content:none!important}';
  doc.head.appendChild(kill);

  // 3. Transforms are recorded, then switched off for measuring.
  var els = doc.body.querySelectorAll('*');
  for (var n = 0; n < els.length; n++) {
    var e = els[n];
    if (SKIP[e.tagName]) continue;
    var c = getComputedStyle(e);
    var t = c.transform;
    var parts = [];
    if (t && t !== 'none') parts.push(t);
    if (c.translate && c.translate !== 'none') parts.push('translate(' + c.translate.split(' ').join(',') + ')');
    if (c.rotate && c.rotate !== 'none') parts.push('rotate(' + c.rotate + ')');
    if (c.scale && c.scale !== 'none') parts.push('scale(' + c.scale.split(' ').join(',') + ')');
    if (parts.length) e.__nkTransform = parts;
  }
  var tf = doc.createElement('style');
  tf.setAttribute('data-nk-native', 'transform');
  tf.textContent = '*{transform:none!important;translate:none!important;rotate:none!important;scale:none!important}';
  doc.head.appendChild(tf);

  // 3b. What the web runtime drew over facts the engine needs (phase 2B):
  //  - a cart list shows "Your cart is empty" in place of its row template:
  //    the template comes back, hidden ([data-nk-item]), next to it;
  //  - a radio's <audio> address is kept as data-nk-audio-src.
  doc.querySelectorAll('[data-nk-cart-list]').forEach(function(el){
    if (!el.__nkTplHtml || el.querySelector('[data-nk-item]')) return;
    var t = doc.createElement('template'); t.innerHTML = el.__nkTplHtml;
    var item = t.content.firstElementChild; if (!item) return;
    if (!item.hasAttribute('data-nk-item')) item.setAttribute('data-nk-item', '');
    item.setAttribute('hidden', '');
    item.style.setProperty('display', 'none', 'important');
    el.insertBefore(item, el.firstChild);
  });
  doc.querySelectorAll('[data-nk-radio-audio], [data-nk-radio] audio').forEach(function(a){
    var src = a.getAttribute('src') || '';
    if (!src) { var so = a.querySelector('source[src]'); if (so) src = so.getAttribute('src') || ''; }
    if (src) a.setAttribute('data-nk-audio-src', src);
  });

  // 4. Web islands: what the engine can't draw natively yet.
  //    Widgets the engine draws itself (native-runtime/src/behaviours) stay
  //    plain boxes of their measured size, whatever the runtime or a library
  //    (Leaflet, a QR script) drew into them; their insides are left out.
  var WIDGETS = '[data-nk-map],[data-nk-qr-scanner],[data-nk-qr],canvas[data-nk-chart],[data-nk-calendar],[data-nk-lang-switcher]';
  doc.body.querySelectorAll(WIDGETS).forEach(function(el){
    if (el.parentElement && el.parentElement.closest(WIDGETS)) return;
    el.__nkWidget = el.hasAttribute('data-nk-calendar') ? 'calendar' : 'widget';
    // A calendar's extra sources (children the runtime replaced with its grid).
    var srcs = (el.__nkSources || []).filter(function(x){ return x.el !== el; }).map(function(x){
      return { flowId: x.flowId, color: x.color, label: x.label, dateField: x.dateField, titleField: x.titleField, hrefTpl: x.hrefTpl };
    });
    if (srcs.length) el.setAttribute('data-nk-cal-sources', JSON.stringify(srcs));
  });
  var runtimeText = '';
  // The runtime's own <script> (not the framework's copy of the page data,
  // which holds it as an escaped string: listeners never match that).
  doc.querySelectorAll('script').forEach(function(s){ var t = s.textContent; if (!s.src && t.indexOf('window.__nkBindFlow') >= 0 && t.indexOf('self.__next_f') < 0) runtimeText += t; });
  var mark = function(el, reason){ if (!el.__nkIsland && !el.closest(WIDGETS)) el.__nkIsland = reason; };
  doc.body.querySelectorAll('canvas').forEach(function(el){ mark(el, 'canvas'); });
  doc.body.querySelectorAll('iframe').forEach(function(el){ mark(el, 'iframe'); });
  doc.body.querySelectorAll('video').forEach(function(el){ mark(el, 'video'); });
  doc.body.querySelectorAll('audio').forEach(function(el){ if (getComputedStyle(el).display !== 'none') mark(el, 'audio'); });
  doc.body.querySelectorAll('embed,object').forEach(function(el){ mark(el, 'embed'); });
  var inlineAttrs = ['onclick','onchange','oninput','onsubmit','onkeydown','onkeyup','onmousedown','onpointerdown','ontouchstart'];
  doc.body.querySelectorAll('*').forEach(function(el){
    if (el.closest('[data-nk-nav]')) return;
    for (var i = 0; i < inlineAttrs.length; i++) if (el.hasAttribute(inlineAttrs[i])) { mark(el, 'script'); return; }
    if (el.tagName === 'A' && /^\s*javascript:/i.test(el.getAttribute('href') || '') && !/^\s*javascript:\s*(void\(0\)|;)?\s*;?\s*$/i.test(el.getAttribute('href') || '')) mark(el, 'script');
  });
  (window.__nkListen || []).forEach(function(r){
    var el = r.el;
    if (!el || !el.isConnected || el === doc.body || el === doc.documentElement) return;
    if (el.closest('[data-nk-nav]')) return;
    if (runtimeText && r.src && runtimeText.indexOf(r.src) >= 0) return;
    // Bootstrap-like form validation hooks on forms the runtime owns.
    if (el.tagName === 'FORM' && el.hasAttribute('data-nk-form')) return;
    mark(el, 'script');
  });
  // Several script islands in one part of the page usually share one script
  // (tabs, a module's own UI): that part becomes one island, so they keep
  // working together.
  var scripted = [];
  doc.body.querySelectorAll('*').forEach(function(el){ if (el.__nkIsland === 'script') scripted.push(el); });
  if (scripted.length > 1) {
    var counts = new Map();
    scripted.forEach(function(el){
      for (var p = el.parentElement; p && p !== doc.body; p = p.parentElement) counts.set(p, (counts.get(p) || 0) + 1);
    });
    var pageH = doc.documentElement.scrollHeight || 1;
    var groups = [];
    counts.forEach(function(n, p){
      if (n < 2) return;
      // A screenful at most: a header, a tab bar, a widget; never most of the page.
      var h = p.getBoundingClientRect().height;
      if (h > innerHeight || h > pageH * 0.6) return;
      if (p.closest('[data-nk-nav]')) return;
      groups.push(p);
    });
    // The outermost qualifying container of each cluster.
    groups.forEach(function(g){
      for (var q = g.parentElement; q && q !== doc.body; q = q.parentElement) if (groups.indexOf(q) >= 0) return;
      g.__nkIsland = 'script';
    });
  }

  // An island inside another island is part of it.
  var n2 = 0;
  doc.body.querySelectorAll('*').forEach(function(el){
    if (!el.__nkIsland) return;
    var p = el.parentElement;
    while (p && p !== doc.body) { if (p.__nkIsland) { el.__nkIsland = null; return; } p = p.parentElement; }
    n2++;
  });

  // 5. Ids for every element (boxes are keyed by them).
  var id = 0;
  doc.body.querySelectorAll('*').forEach(function(el){ el.__nkId = ++id; });
  doc.body.__nkId = 0;
  return { islands: n2, pseudo: doc.querySelectorAll('nk-pseudo').length };
})()
`;

/** Measures every element (and display:none subtrees the runtime may reveal). Arg: pass name ("a" | "b"). */
export const MEASURE_JS = String.raw`
(function(pass){
  var doc = document;
  var boxes = {};
  var sx = window.scrollX, sy = window.scrollY;
  function px(v){ return parseFloat(v) || 0; }
  function measure(el){
    if (el.__nkId == null) return;
    var r = el.getBoundingClientRect();
    var c = getComputedStyle(el);
    boxes[el.__nkId] = [r.left + sx, r.top + sy, r.width, r.height,
      px(c.borderLeftWidth), px(c.borderTopWidth), px(c.borderRightWidth), px(c.borderBottomWidth),
      px(c.paddingLeft), px(c.paddingTop), px(c.paddingRight), px(c.paddingBottom)];
  }
  measure(doc.body);
  var all = doc.body.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) measure(all[i]);
  // Hidden regions the runtime shows later: measured shown, then hidden again.
  var hidden = window.__nkHiddenRoots || [];
  for (var h = 0; h < hidden.length; h++) {
    var el = hidden[h];
    var undo = window.__nkShow(el);
    measure(el);
    el.querySelectorAll('*').forEach(measure);
    undo();
  }
  window['__nkBoxes_' + pass] = boxes;
  return Object.keys(boxes).length;
})
`;

/** Finds display:none subtrees that carry data-nk-* (kept, marked hidden). Run once after PREP. */
export const HIDDEN_JS = String.raw`
(function(){
  var doc = document;
  window.__nkShow = function(el){
    var hadHidden = el.hasAttribute('hidden');
    var prev = el.style.getPropertyValue('display'), prio = el.style.getPropertyPriority('display');
    if (hadHidden) el.removeAttribute('hidden');
    if (prev === 'none') el.style.removeProperty('display');
    var forced = false;
    if (getComputedStyle(el).display === 'none') { el.style.setProperty('display', el.__nkShowAs || (el.tagName === 'LI' ? 'list-item' : 'block'), 'important'); forced = true; }
    return function(){
      if (forced) el.style.removeProperty('display');
      if (prev) el.style.setProperty('display', prev, prio);
      if (hadHidden) el.setAttribute('hidden', '');
    };
  };
  // States the runtime switches with a class (a radio player that plays, the
  // chosen station): BUILD_JS reads each element's look in them too
  // (NativeNode.variants). Toggling twice restores the page.
  window.__nkVariantStates = function(){
    var out = [];
    function cls(el, name){
      var has = el.classList.contains(name);
      var flip = function(){ el.classList.toggle(name); };
      out.push({ root: el, key: (has ? '!.' : '.') + name, on: flip, off: flip });
    }
    doc.querySelectorAll('[data-nk-radio]').forEach(function(el){ if (!el.closest('[data-nk-nav]')) cls(el, 'playing'); });
    doc.querySelectorAll('[data-nk-radio-pick]').forEach(function(el){ if (!el.closest('[data-nk-nav]')) cls(el, 'active'); });
    // A checkbox or radio's labels in the other state (Bootstrap's
    // .btn-check:checked + .btn, a toggle chip): "checked:<fieldId>".
    doc.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(function(input){
      if (!input.labels || !input.labels.length || input.disabled || input.closest('[data-nk-nav]')) return;
      var fid = input.id || ('nk-f' + input.__nkId);
      var was = input.checked;
      var group = input.type === 'radio' && input.form && input.name ? Array.prototype.filter.call(input.form.elements, function(e){ return e.type === 'radio' && e.name === input.name; }) : input.type === 'radio' && input.name ? Array.prototype.slice.call(doc.querySelectorAll('input[type=radio][name="' + input.name.replace(/"/g, '') + '"]')) : [input];
      var saved = null;
      Array.prototype.forEach.call(input.labels, function(label){
        out.push({ root: label, key: (was ? '!checked:' : 'checked:') + fid,
          on: function(){ saved = group.map(function(g){ return g.checked; }); input.checked = !was; },
          off: function(){ group.forEach(function(g, i){ g.checked = saved[i]; }); } });
      });
    });
    return out;
  };
  // Elements hidden now that such a state shows (a pause icon): kept, hidden,
  // measured the way that state shows them.
  var keep = new Set();
  window.__nkVariantStates().forEach(function(v){
    var hiddenNow = [];
    v.root.querySelectorAll('*').forEach(function(d){ if (getComputedStyle(d).display === 'none') hiddenNow.push(d); });
    if (!hiddenNow.length) return;
    v.on();
    hiddenNow.forEach(function(d){ var dd = getComputedStyle(d).display; if (dd !== 'none') { keep.add(d); d.__nkShowAs = dd; } });
    v.off();
  });
  var roots = [];
  var SKIP = { SCRIPT:1, STYLE:1, LINK:1, META:1, TEMPLATE:1, NOSCRIPT:1, OPTION:1, OPTGROUP:1, DATALIST:1 };
  function walk(el){
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
      if (SKIP[c.tagName] || c.hasAttribute('data-nk-nav') || (c.tagName === 'svg' && !keep.has(c))) continue;
      if (getComputedStyle(c).display === 'none') {
        if ((c.outerHTML.indexOf('data-nk-') >= 0 || keep.has(c)) && !c.closest('[data-nk-nav]')) {
          roots.push(c);
          var undo = window.__nkShow(c);
          walk(c);
          undo();
        }
        continue;
      }
      walk(c);
    }
  }
  walk(doc.body);
  window.__nkHiddenRoots = roots;
  return roots.length;
})()
`;

/** Builds the page tree. Arg: { base, pageSlugs, langs, defaultLang, pageSlug, lang, vw: [390, 430], vh: [844, 932] }. */
export const BUILD_JS = String.raw`
(function(opt){
  var doc = document;
  var A = window.__nkBoxes_a || {}, B = window.__nkBoxes_b || {};
  var dir = (getComputedStyle(doc.body).direction === 'rtl') ? 'rtl' : 'ltr';
  var RTL = dir === 'rtl';
  var stats = { nodes: 0, islands: 0, islandReasons: {}, textRuns: 0, images: 0 };
  var fontUse = {};
  var SKIP = { SCRIPT:1, STYLE:1, LINK:1, META:1, TEMPLATE:1, NOSCRIPT:1, HEAD:1, TITLE:1, BASE:1, SOURCE:1, TRACK:1, DATALIST:1, PARAM:1, MAP:1, AREA:1, DIALOG:1 };
  var hiddenRoots = window.__nkHiddenRoots || [];
  var hiddenSet = new Set(hiddenRoots);
  var NODE_EL = new Map();

  function px(v){ var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function r2(n){ return Math.round(n * 100) / 100; }
  function r1(n){ return Math.round(n * 10) / 10; }
  function near(a, b, tol){ return Math.abs(a - b) <= (tol == null ? 1 : tol); }
  function boxOf(map, el){ var b = map[el.__nkId]; return b ? { x: b[0], y: b[1], w: b[2], h: b[3], bl: b[4], bt: b[5], br: b[6], bb: b[7], pl: b[8], pt: b[9], pr: b[10], pb: b[11] } : null; }
  function content(b){ return { x: b.x + b.bl + b.pl, y: b.y + b.bt + b.pt, w: Math.max(0, b.w - b.bl - b.br - b.pl - b.pr), h: Math.max(0, b.h - b.bt - b.bb - b.pt - b.pb) }; }
  function padBox(b){ return { x: b.x + b.bl, y: b.y + b.bt, w: Math.max(0, b.w - b.bl - b.br), h: Math.max(0, b.h - b.bt - b.bb) }; }
  function transparent(c){ return !c || c === 'transparent' || /^rgba\(.*,\s*0\)$/.test(c); }
  // Logical side names: physical left/right become start/end for the page's direction.
  var START = RTL ? 'Right' : 'Left', END = RTL ? 'Left' : 'Right';

  /* ── URLs ─────────────────────────────────────────────── */
  var appBase = opt.base; // "/app/<slug>"
  var slugSet = {}; opt.pageSlugs.forEach(function(s){ slugSet[s] = 1; });
  var langSet = {}; (opt.langs || []).forEach(function(l){ langSet[l] = 1; });
  function ref(raw){
    if (raw == null) return null;
    var s = String(raw).trim();
    if (!s) return null;
    var u;
    try { u = new URL(s, location.href); } catch (e) { return { href: s }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { href: u.href };
    if (u.origin !== location.origin) return { href: u.href };
    var path = u.pathname;
    var tail = u.search + u.hash;
    if (path === appBase || path.indexOf(appBase + '/') === 0) {
      var rel = path.slice(appBase.length).replace(/^\/+/, '');
      var out = { href: rel + tail };
      var segs = rel ? rel.split('/').map(decodeURIComponent) : [];
      var lang;
      if (segs.length && langSet[segs[0]] && opt.langs.length > 1) lang = segs.shift();
      if (segs.length <= 1 && (segs.length === 0 || slugSet[segs[0]])) {
        out.to = { page: segs[0] || '' };
        if (u.search) out.to.query = u.search;
        if (u.hash) out.to.hash = u.hash;
        if (lang) out.to.lang = lang;
        // The page itself, written as the home address.
        if (!segs.length && opt.homeSlug) out.to.page = '';
      }
      return out;
    }
    return { href: path + tail };
  }
  function abs(raw){ var r = ref(raw); return r ? r.href : null; }

  /* ── Attributes ──────────────────────────────────────── */
  function common(el, node){
    node.tag = el.tagName === 'NK-PSEUDO' ? '::' + el.getAttribute('data-nk-pseudo') : el.tagName.toLowerCase();
    if (el.id) node.id = el.id;
    var cls = el.getAttribute('class');
    if (cls && el.tagName !== 'NK-PSEUDO') node.cls = cls;
    var nk = null;
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name.indexOf('data-nk-') === 0 && a.name.indexOf('data-nk-pseudo') !== 0) { nk = nk || {}; nk[a.name] = a.value; }
    }
    if (nk) node.nk = nk;
    // A <label>: tapping it focuses (or ticks) its field, as in the browser.
    if (el.tagName === 'LABEL') { var ctl = el.control; if (ctl && /^(INPUT|SELECT|TEXTAREA)$/.test(ctl.tagName)) node.labelFor = fieldIdOf(ctl); }
    if (el.tagName === 'A' && el.hasAttribute('href')) {
      var h = el.getAttribute('href');
      if (h && h.charAt(0) === '#') { node.href = h; node.to = { page: opt.pageSlug, hash: h }; }
      else { var r = ref(el.href || h); if (r) { node.href = r.href; if (r.to) node.to = r.to; } }
      if ((el.getAttribute('target') || '') === '_blank') node.external = true;
    }
    var a11y = {};
    var tag = el.tagName;
    var role = el.getAttribute('role');
    if (/^H[1-6]$/.test(tag)) { a11y.role = 'header'; a11y.level = +tag.charAt(1); }
    else if (tag === 'A' && el.hasAttribute('href')) a11y.role = 'link';
    else if (tag === 'BUTTON') a11y.role = 'button';
    else if (tag === 'IMG') a11y.role = 'image';
    if (role) a11y.role = ({ heading: 'header', navigation: 'none', presentation: 'none', listitem: 'none', list: 'list', img: 'image' })[role] || role;
    var label = el.getAttribute('aria-label');
    if (label) a11y.label = label;
    if (el.getAttribute('aria-hidden') === 'true') a11y.hidden = true;
    if (el.getAttribute('aria-current') && el.getAttribute('aria-current') !== 'false') a11y.current = true;
    if (el.hasAttribute('aria-expanded')) a11y.expanded = el.getAttribute('aria-expanded') === 'true';
    if (Object.keys(a11y).length) node.a11y = a11y;
    return node;
  }

  /* ── Styles ──────────────────────────────────────────── */
  // Colours as rgb()/rgba(): React Native can't read color(srgb …), oklch(), lab().
  var colorCache = {};
  var cv = doc.createElement('canvas'); cv.width = cv.height = 1;
  var cx = cv.getContext('2d', { willReadFrequently: true });
  function color(c){
    if (!c || /^(rgba?\(|#)/.test(c) || c === 'transparent') return c;
    if (colorCache[c]) return colorCache[c];
    var out = c;
    try {
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
      var d = cx.getImageData(0, 0, 1, 1).data;
      out = d[3] === 255 ? 'rgb(' + d[0] + ', ' + d[1] + ', ' + d[2] + ')' : 'rgba(' + d[0] + ', ' + d[1] + ', ' + d[2] + ', ' + r2(d[3] / 255) + ')';
    } catch (e) {}
    colorCache[c] = out;
    return out;
  }
  // Colours inside gradients and shadows.
  function colorsIn(v){
    if (!v || !/(color|oklch|oklab|lab|lch|hwb)\(/.test(v)) return v;
    return v.replace(/(?:color|oklch|oklab|lab|lch|hwb)\([^()]*\)/g, function(m){ return color(m); });
  }
  function radius(v, b){
    if (!v) return 0;
    var first = v.split(' ')[0];
    if (/%$/.test(first)) return b ? r1(Math.min(b.w, b.h) * px(first) / 100) : 0;
    return px(first);
  }
  function parseShadow(s){ return s && s !== 'none' ? s : null; }
  function matrixToRN(list){
    var out = [];
    list.forEach(function(t){
      var m = /^matrix\(([^)]+)\)$/.exec(t);
      if (m) {
        var v = m[1].split(',').map(parseFloat);
        var a = v[0], b = v[1], c = v[2], d = v[3], e = v[4], f = v[5];
        if (e || f) { if (e) out.push({ translateX: r2(RTL ? e : e) }); if (f) out.push({ translateY: r2(f) }); }
        var sx = Math.sqrt(a * a + b * b);
        var rot = Math.atan2(b, a) * 180 / Math.PI;
        var sy = (a * d - b * c) / (sx || 1);
        if (Math.abs(rot) > 0.01) out.push({ rotate: r2(rot) + 'deg' });
        if (Math.abs(sx - 1) > 0.001) out.push({ scaleX: r2(sx) });
        if (Math.abs(sy - 1) > 0.001) out.push({ scaleY: r2(sy) });
        return;
      }
      var m3 = /^matrix3d\(([^)]+)\)$/.exec(t);
      if (m3) { var w = m3[1].split(',').map(parseFloat); if (w[12]) out.push({ translateX: r2(w[12]) }); if (w[13]) out.push({ translateY: r2(w[13]) }); return; }
      var tr = /^translate\(([^,]+),?([^)]*)\)$/.exec(t);
      if (tr) { if (px(tr[1])) out.push({ translateX: px(tr[1]) }); if (px(tr[2])) out.push({ translateY: px(tr[2]) }); return; }
      var ro = /^rotate\(([^)]+)\)$/.exec(t);
      if (ro) { out.push({ rotate: ro[1] }); return; }
      var sc = /^scale\(([^,]+),?([^)]*)\)$/.exec(t);
      if (sc) { out.push({ scaleX: px(sc[1]) || 1 }); out.push({ scaleY: px(sc[2] || sc[1]) || 1 }); }
    });
    return out;
  }
  function boxStyle(el, cs, b, s){
    if (!transparent(cs.backgroundColor)) s.backgroundColor = color(cs.backgroundColor);
    var sides = [['Top','Top'], ['Right', RTL ? 'Start' : 'End'], ['Bottom','Bottom'], ['Left', RTL ? 'End' : 'Start']];
    var anyBorder = false, bstyle = null;
    sides.forEach(function(pair){
      var w = px(cs['border' + pair[0] + 'Width']);
      var bs = cs['border' + pair[0] + 'Style'];
      if (w > 0 && bs !== 'none' && bs !== 'hidden') {
        anyBorder = true;
        s['border' + pair[1] + 'Width'] = w;
        s['border' + pair[1] + 'Color'] = color(cs['border' + pair[0] + 'Color']);
        if (bs === 'dashed' || bs === 'dotted') bstyle = bs;
      }
    });
    if (anyBorder && bstyle) s.borderStyle = bstyle;
    var rad = [['TopLeft', RTL ? 'TopEnd' : 'TopStart'], ['TopRight', RTL ? 'TopStart' : 'TopEnd'], ['BottomRight', RTL ? 'BottomStart' : 'BottomEnd'], ['BottomLeft', RTL ? 'BottomEnd' : 'BottomStart']];
    var rv = rad.map(function(p){ return radius(cs['border' + p[0] + 'Radius'], b); });
    if (rv[0] || rv[1] || rv[2] || rv[3]) {
      if (rv[0] === rv[1] && rv[1] === rv[2] && rv[2] === rv[3]) s.borderRadius = rv[0];
      else rad.forEach(function(p, i){ if (rv[i]) s['border' + p[1] + 'Radius'] = rv[i]; });
    }
    var pads = [['Top','Top'], ['Bottom','Bottom'], ['Left', RTL ? 'End' : 'Start'], ['Right', RTL ? 'Start' : 'End']];
    pads.forEach(function(p){ var v = px(cs['padding' + p[0]]); if (v) s['padding' + p[1]] = r2(v); });
    if (cs.overflowX === 'hidden' || cs.overflowY === 'hidden' || cs.overflow === 'hidden' || cs.overflowX === 'clip' || cs.overflowY === 'clip') s.overflow = 'hidden';
    var op = parseFloat(cs.opacity); if (op < 1) s.opacity = r2(op);
    if (/px$/.test(cs.minHeight) && px(cs.minHeight) > 0) s.minHeight = r2(px(cs.minHeight));
    var sh = parseShadow(cs.boxShadow); if (sh) s.boxShadow = colorsIn(sh);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      var grads = [], url = null;
      splitLayers(cs.backgroundImage).forEach(function(layer){
        if (/^(repeating-)?(linear|radial|conic)-gradient\(/.test(layer)) grads.push(layer);
        else { var m = /^url\("?(.*?)"?\)$/.exec(layer); if (m && !url) url = m[1]; }
      });
      if (grads.length) s.experimental_backgroundImage = colorsIn(grads.join(', '));
      if (url) {
        var bg = { src: abs(url) };
        if (cs.backgroundSize && cs.backgroundSize !== 'auto') bg.size = cs.backgroundSize.split(',')[0].trim();
        if (cs.backgroundPosition) bg.position = cs.backgroundPosition.split(',')[0].trim();
        if (cs.backgroundRepeat) bg.repeat = cs.backgroundRepeat.split(',')[0].trim();
        s.__bgImage = bg;
      }
    }
    if (el.__nkTransform) { var tr = matrixToRN(el.__nkTransform); if (tr.length) s.transform = tr; }
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') s.mixBlendMode = cs.mixBlendMode;
    if (cs.filter && cs.filter !== 'none') s.filter = cs.filter;
    if (cs.position !== 'static' && cs.zIndex !== 'auto') s.zIndex = parseInt(cs.zIndex, 10) || 0;
    return s;
  }
  function splitLayers(v){
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < v.length; i++) {
      var ch = v.charAt(i);
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function textStyle(cs){
    var s = {};
    s.color = color(cs.color);
    s.fontSize = r2(px(cs.fontSize));
    s.__ff = cs.fontFamily;
    s.fontWeight = String(cs.fontWeight);
    if (cs.fontStyle === 'italic' || cs.fontStyle.indexOf('oblique') === 0) s.fontStyle = 'italic';
    if (cs.lineHeight !== 'normal') s.lineHeight = r2(px(cs.lineHeight));
    if (cs.letterSpacing !== 'normal' && px(cs.letterSpacing)) s.letterSpacing = r2(px(cs.letterSpacing));
    if (cs.textTransform && cs.textTransform !== 'none') s.textTransform = cs.textTransform;
    var ta = cs.textAlign;
    if (ta === 'start') ta = RTL ? 'right' : 'left';
    if (ta === 'end') ta = RTL ? 'left' : 'right';
    if (ta === '-webkit-center') ta = 'center';
    if (ta && ta !== (RTL ? 'right' : 'left')) s.textAlign = ta;
    var deco = cs.textDecorationLine;
    if (deco && deco !== 'none') { s.textDecorationLine = deco.indexOf('underline') >= 0 && deco.indexOf('line-through') >= 0 ? 'underline line-through' : deco.indexOf('underline') >= 0 ? 'underline' : deco.indexOf('line-through') >= 0 ? 'line-through' : undefined; if (!s.textDecorationLine) delete s.textDecorationLine; else if (cs.textDecorationColor && cs.textDecorationColor !== cs.color) s.textDecorationColor = color(cs.textDecorationColor); }
    if (cs.textShadow && cs.textShadow !== 'none') {
      var m = /^(rgba?\([^)]*\)|#\w+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s*(-?[\d.]+)?/.exec(cs.textShadow);
      if (m) { s.textShadowColor = color(m[1]); s.textShadowOffset = { width: px(m[2]), height: px(m[3]) }; s.textShadowRadius = px(m[4]); }
    }
    if (cs.direction === 'rtl') s.writingDirection = 'rtl';
    fontUse[cs.fontFamily + '|' + cs.fontWeight + '|' + (s.fontStyle || 'normal')] = 1;
    return s;
  }
  function diff(child, parent){
    var out = {}, any = false;
    for (var k in child) {
      if (k === 'textAlign' || k === 'writingDirection') continue;
      var a = child[k], b = parent[k];
      if (typeof a === 'object' ? JSON.stringify(a) !== JSON.stringify(b) : a !== b) { out[k] = a; any = true; }
    }
    // Font: the family stack, weight and style travel together (one font file).
    if (out.__ff || out.fontWeight || out.fontStyle !== undefined) { out.__ff = child.__ff; out.fontWeight = child.fontWeight; out.fontStyle = child.fontStyle || 'normal'; }
    return any ? out : null;
  }

  /* ── Classification ──────────────────────────────────── */
  var ATOMIC_TAGS = { IMG:1, SVG:1, INPUT:1, BUTTON:1, SELECT:1, TEXTAREA:1, CANVAS:1, IFRAME:1, VIDEO:1, AUDIO:1, OBJECT:1, EMBED:1, PICTURE:1 };
  function isHiddenEl(el, cs){
    if (hiddenSet.has(el)) return false;
    if (cs.display === 'none') return true;
    if (cs.visibility === 'hidden' || cs.visibility === 'collapse') {
      // A visible child can still show; only skip when nothing inside is visible.
      return !el.querySelector('*') || !Array.prototype.some.call(el.querySelectorAll('*'), function(c){ return getComputedStyle(c).visibility === 'visible'; });
    }
    // Screen-reader-only text (clipped 1px boxes) and skip links.
    if (el.classList.contains('nk-skip-link') || el.classList.contains('visually-hidden') || el.classList.contains('visually-hidden-focusable') || el.classList.contains('sr-only')) return true;
    if ((cs.position === 'absolute' || cs.position === 'fixed') && cs.clip && /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(cs.clip)) return true;
    if (cs.clipPath === 'inset(50%)') return true;
    var b = A[el.__nkId];
    if (b && b[2] <= 1 && b[3] <= 1 && cs.overflow === 'hidden' && el.tagName !== 'INPUT') return true;
    return false;
  }
  function outOfFlow(cs){ return cs.position === 'absolute' || cs.position === 'fixed'; }
  function isInlineLevel(el, cs){
    if (el.nodeType === 3) return true;
    var d = cs.display;
    return d === 'inline' || d === 'inline-block' || d === 'inline-flex' || d === 'inline-grid' || d === 'inline-table' || d === 'contents' && false;
  }
  function isAtomicInline(el, cs){
    var d = cs.display;
    if (ATOMIC_TAGS[el.tagName.toUpperCase()]) return d === 'inline' || d.indexOf('inline') === 0;
    return d === 'inline-block' || d === 'inline-flex' || d === 'inline-grid' || d === 'inline-table';
  }
  function hasVisibleText(el){ return /\S/.test(el.textContent || ''); }
  function textOnlyInside(el){
    // True when the element holds only text and inline (non-atomic) elements.
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) continue;
      if (c.nodeType !== 1) continue;
      if (SKIP[c.tagName]) continue;
      var cs = getComputedStyle(c);
      // Hidden now, inline text in another state (a radio's "On air"): part of the line.
      if (hiddenSet.has(c) && c.__nkShowAs === 'inline' && !ATOMIC_TAGS[c.tagName.toUpperCase()]) { if (!textOnlyInside(c)) return false; continue; }
      if (isHiddenEl(c, cs)) continue;
      if (outOfFlow(cs)) return false;
      if (c.tagName === 'BR') continue;
      if (cs.display === 'contents') { if (!textOnlyInside(c)) return false; continue; }
      if (cs.display !== 'inline' || ATOMIC_TAGS[c.tagName.toUpperCase()]) return false;
      if (!textOnlyInside(c)) return false;
    }
    return true;
  }

  /* ── Text runs ───────────────────────────────────────── */
  function collapseMode(cs){ var w = cs.whiteSpace; return w === 'pre' || w === 'pre-wrap' || w === 'break-spaces' ? 'pre' : w === 'pre-line' ? 'line' : 'normal'; }
  function runsOf(el, parentStyle, mode){
    var runs = [];
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) {
        var t = c.data;
        if (mode === 'normal') t = t.replace(/[ \t\n\r\f]+/g, ' ');
        else if (mode === 'line') t = t.replace(/[ \t\r\f]+/g, ' ');
        if (t) runs.push({ text: t });
        continue;
      }
      if (c.nodeType !== 1 || SKIP[c.tagName]) continue;
      var cs = getComputedStyle(c);
      var hiddenNeeded = hiddenSet.has(c);
      if (!hiddenNeeded && isHiddenEl(c, cs)) { hiddenFields(c).forEach(function(f){ runs.push({ node: f }); }); continue; }
      if (c.tagName === 'BR') { runs.push({ text: '\n' }); continue; }
      var undo = hiddenNeeded ? window.__nkShow(c) : null;
      if (hiddenNeeded) cs = getComputedStyle(c);
      if (isAtomicInline(c, cs) || outOfFlow(cs)) {
        var n = build(c, { kind: 'inline' });
        if (n) { var rn = Array.isArray(n) ? { type: 'view', tag: 'span', children: n } : n; if (hiddenNeeded) rn.hidden = true; runs.push({ node: rn }); }
      } else {
        var ts = textStyle(cs);
        var run = {};
        common(c, run);
        delete run.a11y;
        var d = diff(ts, parentStyle);
        if (d) run.style = d;
        // Inline boxes: a background colour carries over (padding can't).
        if (!transparent(cs.backgroundColor)) { run.style = run.style || {}; run.style.backgroundColor = color(cs.backgroundColor); }
        run.runs = runsOf(c, ts, collapseMode(cs) === 'normal' ? mode : collapseMode(cs));
        if (hiddenNeeded) run.hidden = true;
        if (px(cs.paddingLeft) || px(cs.paddingRight)) RUN_PAD.set(run, { start: px(RTL ? cs.paddingRight : cs.paddingLeft), end: px(RTL ? cs.paddingLeft : cs.paddingRight) });
        attachVariants(c, run, 'run');
        runs.push(run);
      }
      if (undo) undo();
    }
    return runs;
  }
  // White space between runs collapses like the browser's; the block is trimmed.
  function tidyRuns(runs, mode){
    if (mode === 'pre') return runs;
    var state = { space: true };
    function walk(list){
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.node) { if (!r.node.hidden) state.space = false; continue; }
        if (r.text != null) {
          var t = r.text;
          if (t === '\n') { state.space = true; state.lastText = null; continue; }
          if (state.space) t = t.replace(/^ +/, '');
          if (t) { state.space = / $/.test(t); state.lastText = r; }
          r.text = t;
        }
        if (r.runs) walk(r.runs);
      }
    }
    walk(runs);
    // Trailing space of the block, and spaces before a line break.
    function trimEnd(list){
      for (var i = list.length - 1; i >= 0; i--) {
        var r = list[i];
        if (r.node) { if (r.node.hidden) continue; return true; }
        if (r.runs && trimEnd(r.runs)) return true;
        if (r.text) { r.text = r.text.replace(/ +$/, ''); if (r.text) return true; }
      }
      return false;
    }
    trimEnd(runs);
    function prune(list){
      return list.filter(function(r){
        if (r.runs) r.runs = prune(r.runs);
        if (r.node) return true;
        if (r.text) { stats.textRuns++; return true; }
        if (r.runs && r.runs.length) return true;
        if (r.hidden || r.nk) return true;
        return false;
      }).map(function(r){ if (r.text === '' ) delete r.text; return r; });
    }
    return prune(runs);
  }
  // A block whose whole text is one link (a menu item, "See all →"): the
  // block is the link, so all of it is pressable as on the web (where the
  // link's padding is too), not only the letters of the run.
  var RUN_PAD = new WeakMap();
  function hoistLink(t){
    if (t.href || t.to || !t.runs) return;
    var real = t.runs.filter(function(r){ return r.node ? !r.node.hidden : (r.runs && r.runs.length) || (r.text != null && /\S/.test(r.text)); });
    if (real.length !== 1) return;
    var r = real[0];
    if (r.node || r.hidden || (!r.href && !r.to)) return;
    if (r.href != null) t.href = r.href;
    if (r.to) t.to = r.to;
    if (r.external) t.external = true;
    delete r.href; delete r.to; delete r.external;
    t.a11y = Object.assign({}, t.a11y || {}, { role: 'link' });
    // An inline link's side padding takes room on its line: keep it on the block.
    var pad = RUN_PAD.get(r);
    if (pad && t.runs.length === 1) {
      t.style = t.style || {};
      if (pad.start) t.style.paddingStart = r2((t.style.paddingStart || 0) + pad.start);
      if (pad.end) t.style.paddingEnd = r2((t.style.paddingEnd || 0) + pad.end);
    }
  }
  function anyText(runs){ return runs.some(function(r){ return (r.text && /\S/.test(r.text)) || (r.runs && anyText(r.runs)); }); }
  function lineClamp(cs){
    var lc = cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp');
    if (lc && lc !== 'none' && parseInt(lc, 10) > 0) return parseInt(lc, 10);
    if (cs.textOverflow === 'ellipsis' && cs.whiteSpace === 'nowrap') return 1;
    return 0;
  }

  /* ── Placement (how a child sits in its parent) ──────── */
  // Width from two viewports: tracks the parent (stretch), fixed, or a share of it.
  function widthKind(el, parentEl){
    var a = boxOf(A, el), b = boxOf(B, el), pa = boxOf(A, parentEl), pb = boxOf(B, parentEl);
    if (!a || !pa) return { kind: 'content' };
    var ca = content(pa), cb = pb ? content(pb) : ca;
    var startA = RTL ? (ca.x + ca.w) - (a.x + a.w) : a.x - ca.x;
    var endA = RTL ? a.x - ca.x : (ca.x + ca.w) - (a.x + a.w);
    var out = { a: a, ca: ca, start: startA, end: endA };
    if (!b) { out.kind = near(a.w, ca.w, 1) ? 'track' : 'fixed'; return out; }
    var grow = b.w - a.w, pgrow = cb.w - ca.w;
    if (near(a.w, ca.w, 3) && near(b.w, cb.w, 3)) out.kind = 'track';
    else if (Math.abs(pgrow) > 2 && near(grow, pgrow, 1.5)) out.kind = 'track';
    else if (near(grow, 0, 1)) out.kind = 'fixed';
    else if (Math.abs(pgrow) > 2 && ca.w > 0) out.kind = 'share';
    else out.kind = near(a.w, ca.w, 1) ? 'track' : 'fixed';
    var startB = RTL ? (cb.x + cb.w) - (b.x + b.w) : b.x - cb.x;
    out.centered = !near(startA, 0, 1) && near(startA, endA, 1.5);
    out.startMoves = !near(startB, startA, 1);
    return out;
  }
  var natCache = new Map();
  function contentSized(el){
    // Text decides the box's width (a button, a badge, a link), unless the
    // box is clearly wider than its text (a fixed-size badge or tile).
    if (natCache.has(el)) return natCache.get(el);
    var r = hasVisibleText(el) && !el.querySelector('img,svg,video,canvas,iframe');
    if (r) {
      var b = boxOf(A, el);
      if (b) {
        var rg = doc.createRange();
        rg.selectNodeContents(el);
        var rects = rg.getClientRects();
        var minX = Infinity, maxX = -Infinity;
        for (var i = 0; i < rects.length; i++) { if (rects[i].width > 0) { minX = Math.min(minX, rects[i].left); maxX = Math.max(maxX, rects[i].right); } }
        var natural = (maxX > minX ? maxX - minX : 0) + b.pl + b.pr + b.bl + b.br;
        if (natural > 0 && b.w > natural + 6) r = false;
      }
    }
    natCache.set(el, r);
    return r;
  }
  // The element's min-content and max-content widths (border box), measured
  // by sizing it that way for a moment (layout is read again afterwards).
  var iwCache = new Map();
  var IW_PROPS = ['width', 'min-width', 'max-width', 'flex', 'flex-grow', 'flex-shrink', 'flex-basis'];
  function intrinsicWidths(el){
    if (iwCache.has(el)) return iwCache.get(el);
    var st = el.style;
    var saved = IW_PROPS.map(function(p){ return [p, st.getPropertyValue(p), st.getPropertyPriority(p)]; });
    function m(w){
      st.setProperty('width', w, 'important'); st.setProperty('min-width', '0', 'important'); st.setProperty('max-width', 'none', 'important');
      st.setProperty('flex', 'none', 'important');
      return el.getBoundingClientRect().width;
    }
    var out = { min: m('min-content'), max: m('max-content') };
    IW_PROPS.forEach(function(p){ st.removeProperty(p); });
    saved.forEach(function(s){ if (s[1]) st.setProperty(s[0], s[1], s[2]); });
    iwCache.set(el, out);
    return out;
  }
  // A box whose width comes from its content (shrink-to-fit: an inline-block,
  // a button, a badge, a flex item that neither grows nor stretches): its
  // width is the same on both phones and equals its max-content width.
  // Children that "track" such a box are what sizes it: they get no width.
  var swCache = new Map();
  function shrinkWrapped(el){
    if (swCache.has(el)) return swCache.get(el);
    var r = false;
    var a = boxOf(A, el), b = boxOf(B, el);
    var T = el.tagName.toUpperCase();
    if (a && b && a.w > 0 && near(a.w, b.w, 0.5) && el !== doc.body && (!ATOMIC_TAGS[T] || T === 'BUTTON')) {
      var cs = getComputedStyle(el);
      if (cs.display !== 'none' && !/^table/.test(cs.display)) r = near(Math.max(intrinsicWidths(el).max, /px$/.test(cs.minWidth) ? px(cs.minWidth) : 0), a.w, 1);
    }
    swCache.set(el, r);
    return r;
  }
  function heightTracksScreen(el){
    var a = boxOf(A, el), b = boxOf(B, el);
    if (!a || !b) return 0;
    var dvh = opt.vh[1] - opt.vh[0];
    var dh = b.h - a.h;
    if (Math.abs(dh) < 4) return 0;
    var pct = a.h / opt.vh[0] * 100;
    if (near(dh, dvh * pct / 100, 3)) return r1(pct);
    return 0;
  }
  // Child in a vertical flow (block or flex column): width and horizontal position.
  function placeInColumn(el, parentEl, s, opts){
    var wk = widthKind(el, parentEl);
    if (wk.kind === 'content') return;
    var stretchParent = opts.stretch !== false;
    if (wk.kind === 'track') {
      if (Math.abs(wk.start) > 0.5) s.marginStart = r2(wk.start);
      if (Math.abs(wk.end) > 0.5) s.marginEnd = r2(wk.end);
      if (!stretchParent) s.alignSelf = 'stretch';
      return;
    }
    var noText = !contentSized(el) || opts.fixedWidth;
    if (wk.kind === 'share') s.width = r2(wk.a.w / wk.ca.w * 100) + '%';
    else if (noText) s.width = r2(wk.a.w);
    else if (opts.textWidth) s.width = r2(wk.a.w);
    if (wk.centered) s.alignSelf = 'center';
    else if (near(wk.end, 0, 1) && wk.start > 1) s.alignSelf = 'flex-end';
    else { s.alignSelf = 'flex-start'; if (Math.abs(wk.start) > 0.5) s.marginStart = r2(wk.start); }
    if (opts.parentAlign && s.alignSelf === opts.parentAlign) delete s.alignSelf;
  }

  /* ── Containers ──────────────────────────────────────── */
  var JUSTIFY = { 'normal': 'flex-start', 'start': 'flex-start', 'flex-start': 'flex-start', 'left': 'flex-start', 'end': 'flex-end', 'flex-end': 'flex-end', 'right': 'flex-end', 'center': 'center', 'space-between': 'space-between', 'space-around': 'space-around', 'space-evenly': 'space-evenly', 'stretch': 'flex-start' };
  var ALIGN = { 'normal': 'stretch', 'stretch': 'stretch', 'start': 'flex-start', 'flex-start': 'flex-start', 'self-start': 'flex-start', 'end': 'flex-end', 'flex-end': 'flex-end', 'self-end': 'flex-end', 'center': 'center', 'baseline': 'baseline', 'first baseline': 'baseline', 'last baseline': 'baseline', 'anchor-center': 'center' };
  function flowChildren(el){
    // Element children and text, with display:contents unwrapped.
    var out = [];
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { out.push(c); continue; }
      if (c.nodeType !== 1 || SKIP[c.tagName]) continue;
      if (c.hasAttribute('data-nk-nav') && c.tagName === 'NAV') { out.push({ nkNav: c }); continue; }
      var cs = getComputedStyle(c);
      if (cs.display === 'contents' && !hiddenSet.has(c)) { out = out.concat(flowChildren(c)); continue; }
      out.push(c);
    }
    return out;
  }
  function textRect(nodes){
    var r = doc.createRange();
    r.setStartBefore(nodes[0]);
    r.setEndAfter(nodes[nodes.length - 1]);
    var b = r.getBoundingClientRect();
    return { x: b.left + window.scrollX, y: b.top + window.scrollY, w: b.width, h: b.height };
  }
  // Builds the children of a container, grouping loose text and inline
  // elements into anonymous text nodes. Returns [{ node, box, el, cs, abs }].
  function childItems(el, cs){
    var items = [];
    var pending = [];
    var tstyle = null;
    function flush(){
      if (!pending.length) return;
      var nodes = pending; pending = [];
      var visible = nodes.some(function(n){ return n.nodeType === 3 ? /\S/.test(n.data) : true; });
      if (!visible) return;
      var holder = { firstChild: null };
      // Runs from these nodes only.
      tstyle = tstyle || textStyle(cs);
      var runs = [];
      nodes.forEach(function(n){
        var frag = runsOfList([n], tstyle, collapseMode(cs));
        runs = runs.concat(frag);
      });
      runs = tidyRuns(runs, collapseMode(cs));
      if (!runs.length || !anyText(runs)) {
        // Only atomic inline boxes: an inline row.
        var only = runs.filter(function(r){ return r.node; }).map(function(r){ return r.node; });
        if (!only.length) return;
        if (only.every(function(n){ return n.hidden; })) { only.forEach(function(n){ items.push({ node: n, hidden: true }); }); return; }
        var rect0 = textRect(nodes);
        items.push({ node: inlineRow(el, cs, nodes, only), box: rect0, anon: true });
        return;
      }
      var rect = textRect(nodes);
      var tnode = { type: 'text', tag: '#text', runs: runs, style: Object.assign({}, tstyle) };
      attachVariants(el, tnode, 'text');
      if (el.tagName !== 'A') hoistLink(tnode);
      var lc = lineClamp(cs); if (lc) tnode.lines = lc;
      stats.nodes++;
      items.push({ node: tnode, box: rect, anon: true });
    }
    var kids = flowChildren(el);
    var flex = /flex|grid/.test(cs.display);
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      if (c.nkNav) {
        // The shared menu isn't page content; content below it starts where it ended.
        flushIf();
        var np = getComputedStyle(c.nkNav).position;
        items.push({ navEnd: np !== 'absolute' && np !== 'fixed' ? boxOf(A, c.nkNav) : null, nav: true });
        continue;
      }
      if (c.nodeType === 3) { pending.push(c); continue; }
      var ccs = getComputedStyle(c);
      var hiddenNeeded = hiddenSet.has(c);
      if (!hiddenNeeded && isHiddenEl(c, ccs)) { hiddenFields(c).forEach(function(f){ items.push({ node: f, hidden: true }); }); continue; }
      if (outOfFlow(ccs)) { flushIf(); var an = build(c, { kind: 'abs', parent: el }); if (an) items.push({ node: an, abs: true, el: c }); continue; }
      var pendingText = pending.some(function(n){ return n.nodeType === 3 ? /\S/.test(n.data) : true; });
      var picture = c.tagName === 'IMG' || c.tagName === 'PICTURE' || c.tagName.toLowerCase() === 'svg';
      var inlineLevel = (!hiddenNeeded && (c.tagName === 'BR' || (ccs.display === 'inline' && !picture) || (isAtomicInline(c, ccs) && !(picture && !pendingText)))) || (hiddenNeeded && /^inline/.test(c.__nkShowAs || ''));
      if (!flex && inlineLevel) { pending.push(c); continue; }
      flushIf();
      var undo = hiddenNeeded ? window.__nkShow(c) : null;
      var node = build(c, { kind: 'child', parent: el, parentCs: cs });
      var box = boxOf(A, c);
      if (undo) undo();
      if (!node) continue;
      if (hiddenNeeded) { (Array.isArray(node) ? node : [node]).forEach(function(n){ n.hidden = true; }); }
      if (Array.isArray(node)) node.forEach(function(n){ items.push({ node: n, box: box, el: c }); });
      else items.push({ node: node, box: box, el: c, cs: ccs, hidden: hiddenNeeded });
    }
    flushIf();
    function flushIf(){ if (pending.length) flush(); }
    return items;
  }
  function runsOfList(nodes, style, mode){
    var fake = doc.createElement('span');
    // runsOf walks siblings; walk the given nodes directly instead.
    var runs = [];
    nodes.forEach(function(n){
      if (n.nodeType === 3) {
        var t = n.data;
        if (mode === 'normal') t = t.replace(/[ \t\n\r\f]+/g, ' ');
        else if (mode === 'line') t = t.replace(/[ \t\r\f]+/g, ' ');
        if (t) runs.push({ text: t });
        return;
      }
      // Hidden now, shown in another state: read the way that state shows it.
      var hid = hiddenSet.has(n);
      var undo = hid ? window.__nkShow(n) : null;
      var cs = getComputedStyle(n);
      if (n.tagName === 'BR') { runs.push({ text: '\n' }); if (undo) undo(); return; }
      if (isAtomicInline(n, cs)) { var b = build(n, { kind: 'inline' }); if (b) { var bn = Array.isArray(b) ? { type: 'view', tag: 'span', children: b } : b; if (hid) bn.hidden = true; NODE_EL.set(bn, n); runs.push({ node: bn }); } if (undo) undo(); return; }
      var ts = textStyle(cs);
      var run = {};
      common(n, run);
      delete run.a11y;
      var d = diff(ts, style);
      if (d) run.style = d;
      if (!transparent(cs.backgroundColor)) { run.style = run.style || {}; run.style.backgroundColor = color(cs.backgroundColor); }
      run.runs = runsOf(n, ts, collapseMode(cs) === 'normal' ? mode : collapseMode(cs));
      if (px(cs.paddingLeft) || px(cs.paddingRight)) RUN_PAD.set(run, { start: px(RTL ? cs.paddingRight : cs.paddingLeft), end: px(RTL ? cs.paddingLeft : cs.paddingRight) });
      if (hid) run.hidden = true;
      attachVariants(n, run, 'run');
      runs.push(run);
      if (undo) undo();
    });
    return runs;
  }
  // A line of inline boxes (buttons side by side): a wrapping row.
  function inlineRow(el, cs, domNodes, nodes){
    var els = domNodes.filter(function(n){ return n.nodeType === 1 && A[n.__nkId]; });
    var s = { flexDirection: 'row', flexWrap: 'wrap' };
    var ta = cs.textAlign;
    if (ta === 'center' || ta === '-webkit-center') s.justifyContent = 'center';
    else if (ta === (RTL ? 'left' : 'right') || ta === 'end') s.justifyContent = 'flex-end';
    var boxes = els.map(function(e){ return boxOf(A, e); });
    // Boxes as wide as the line (a full-width button) keep that width.
    nodes.forEach(function(n){
      var e = NODE_EL.get(n);
      if (!e || !A[e.__nkId]) return;
      var wk = widthKind(e, el);
      var st = n.style = n.style || {};
      if (wk.kind === 'track') { if (!shrinkWrapped(el)) st.width = '100%'; }
      else if (wk.kind === 'share') st.width = r2(wk.a.w / wk.ca.w * 100) + '%';
      else if (wk.kind === 'fixed' && !contentSized(e) && st.width == null) st.width = r2(wk.a.w);
    });
    var cg = null, rg = null;
    for (var i = 1; i < boxes.length; i++) {
      var p = boxes[i - 1], b = boxes[i];
      if (near(p.y, b.y, 4) || (b.y < p.y + p.h - 2)) { var g = RTL ? p.x - (b.x + b.w) : b.x - (p.x + p.w); if (g >= 0 && (cg == null || g < cg)) cg = g; }
      else { var v = b.y - (p.y + p.h); if (v >= 0 && (rg == null || v < rg)) rg = v; }
    }
    if (cg) s.columnGap = r1(cg);
    if (rg) s.rowGap = r1(rg);
    s.alignItems = boxes.length > 1 && boxes.every(function(b){ return near(b.h, boxes[0].h, 2); }) ? 'stretch' : 'flex-start';
    if (s.alignItems === 'stretch') s.alignItems = 'center';
    stats.nodes++;
    return { type: 'view', tag: '#inline', style: s, children: nodes };
  }

  // Lays out the built children of a block / flex / grid container.
  function layoutChildren(el, cs, s, node){
    var items = childItems(el, cs);
    var navEnd = null, hadNav = false;
    items = items.filter(function(it){ if (it.nav) { hadNav = true; navEnd = it.navEnd; return false; } return true; });
    var inflow = items.filter(function(it){ return !it.abs; });
    var abs = items.filter(function(it){ return it.abs; });
    var b = boxOf(A, el);
    var ca = b ? content(b) : null;
    var d = cs.display;
    var children = [];
    if (/flex/.test(d)) {
      var row = cs.flexDirection.indexOf('row') === 0;
      s.flexDirection = cs.flexDirection === 'row-reverse' ? 'row-reverse' : cs.flexDirection === 'column-reverse' ? 'column-reverse' : row ? 'row' : 'column';
      if (cs.flexWrap !== 'nowrap') s.flexWrap = cs.flexWrap;
      if (JUSTIFY[cs.justifyContent] && JUSTIFY[cs.justifyContent] !== 'flex-start') s.justifyContent = JUSTIFY[cs.justifyContent];
      var ai = ALIGN[cs.alignItems] || 'stretch';
      if (ai !== 'stretch') s.alignItems = ai;
      if (cs.flexWrap !== 'nowrap' && cs.alignContent && cs.alignContent !== 'normal' && ALIGN[cs.alignContent]) s.alignContent = cs.alignContent === 'space-between' || cs.alignContent === 'space-around' ? cs.alignContent : ALIGN[cs.alignContent];
      if (cs.rowGap && cs.rowGap !== 'normal' && px(cs.rowGap)) s.rowGap = r2(px(cs.rowGap));
      if (cs.columnGap && cs.columnGap !== 'normal' && px(cs.columnGap)) s.columnGap = r2(px(cs.columnGap));
      inflow.forEach(function(it){
        var cs2 = it.cs, n = it.node, st = n.style = n.style || {};
        if (cs2 && it.el) {
          var g = parseFloat(cs2.flexGrow), sh = parseFloat(cs2.flexShrink), basis = cs2.flexBasis;
          if (g) st.flexGrow = g;
          st.flexShrink = sh;
          if (basis && basis !== 'auto' && basis !== 'content') st.flexBasis = /%$/.test(basis) ? basis : px(basis);
          var as = cs2.alignSelf;
          if (as && as !== 'auto' && ALIGN[as]) st.alignSelf = ALIGN[as];
          margins(cs2, st, true);
          var wk = widthKind(it.el, el);
          // In a box sized by its content, children don't follow the box: they size it.
          var wrapped = wk.kind === 'track' && shrinkWrapped(el);
          if (row) {
            if (!g && wk.kind !== 'content' && wk.kind !== 'track') {
              if (wk.kind === 'share') st.width = r2(wk.a.w / wk.ca.w * 100) + '%';
              else if (!contentSized(it.el) || n.type === 'image' || n.type === 'svg' || n.type === 'input') st.width = r2(wk.a.w);
            } else if (!g && wk.kind === 'track' && !wrapped) st.width = '100%';
            // CSS flex items don't shrink below their min-content width
            // (min-width: auto); React Native's do. A count, a price or a
            // button squeezed by a long title would wrap a letter per line.
            // A min-width of its own wins over that.
            var ownMin = /px$/.test(cs2.minWidth) ? px(cs2.minWidth) : 0;
            if (sh > 0 && (ownMin > 0 || (cs2.minWidth === 'auto' && cs2.overflowX === 'visible')) && (n.type === 'view' || n.type === 'text' || n.type === 'button') && typeof st.width !== 'string') {
              var ab = boxOf(A, it.el);
              var iw = ab && !ownMin ? intrinsicWidths(it.el) : null;
              var minW = ownMin || (iw ? iw.min : 0);
              if (ab && minW > 0.5) {
                var floor = ownMin ? ownMin : typeof st.width === 'number' ? Math.min(st.width, minW) : minW;
                if (ownMin) st.minWidth = r2(ownMin);
                if (floor >= ab.w - 0.5) st.flexShrink = 0;
                else st.minWidth = r2(floor);
              }
            }
          } else {
            if ((ai !== 'stretch' || (st.alignSelf && st.alignSelf !== 'stretch')) && wk.kind !== 'content') {
              if (wk.kind === 'share') st.width = r2(wk.a.w / wk.ca.w * 100) + '%';
              else if (wrapped) { if (!contentSized(it.el)) st.alignSelf = 'stretch'; }
              else if (wk.kind === 'track' && !near(wk.a.w, wk.ca.w, 1)) { st.width = '100%'; }
              else if (wk.kind === 'track') st.alignSelf = 'stretch';
              else if (!contentSized(it.el) || n.type === 'image' || n.type === 'svg' || n.type === 'input') st.width = r2(wk.a.w);
            } else if (wk.kind === 'fixed' && (!contentSized(it.el) || n.type === 'image' || n.type === 'svg') && !near(wk.a.w, wk.ca.w, 1)) {
              st.width = r2(wk.a.w);
              if (!st.alignSelf) st.alignSelf = wk.centered ? 'center' : 'flex-start';
            }
          }
        }
        children.push(n);
      });
      // A flex box taller than its content (min-height, a full-screen hero) keeps its height.
      if (b && inflow.length && !hadNav) {
        var last = 0;
        inflow.forEach(function(it){ if (it.box) last = Math.max(last, it.box.y + it.box.h); });
        var free = (ca.y + ca.h) - last;
        if (free > 2 || (!row && s.justifyContent && s.justifyContent !== 'flex-start')) {
          var vhp = heightTracksScreen(el);
          if (vhp) { node.vh = { minHeight: vhp }; delete s.minHeight; } else s.minHeight = r2(b.h);
        }
      }
    } else if (/grid/.test(d)) {
      children = gridRows(el, cs, inflow, ca, node, s);
    } else if (/table/.test(d) && d !== 'table-cell' && d !== 'table-caption') {
      if (d === 'table-row') {
        s.flexDirection = 'row';
        inflow.forEach(function(it){ var st = it.node.style = it.node.style || {}; if (it.box && ca && ca.w) { st.flexGrow = r2(it.box.w); st.flexBasis = 0; st.flexShrink = 1; } children.push(it.node); });
      } else {
        inflow.forEach(function(it){ children.push(it.node); });
      }
    } else {
      // Block flow: one column, vertical gaps measured (margins collapse in CSS, not in RN).
      var prevBottom = ca ? ca.y : null;
      if (navEnd && prevBottom != null) prevBottom = Math.max(prevBottom, navEnd.y + navEnd.h);
      inflow.forEach(function(it, i){
        var n = it.node, st = n.style = n.style || {};
        if (it.el && !it.anon) placeInColumn(it.el, el, st, { stretch: true });
        else if (it.anon && it.box && ca) {
          var wkA = it.box;
          if (n.tag === '#inline') { /* rows stretch */ }
        }
        if (it.box && prevBottom != null && !it.hidden) {
          var gap = it.box.y - prevBottom;
          if (Math.abs(gap) > 0.5) st.marginTop = r2(gap);
          prevBottom = it.box.y + it.box.h;
        }
        children.push(n);
      });
      if (ca && inflow.length) {
        var lastVisible = null;
        for (var k = inflow.length - 1; k >= 0; k--) if (!inflow[k].hidden && inflow[k].box) { lastVisible = inflow[k]; break; }
        if (lastVisible) {
          var tail = (ca.y + ca.h) - (lastVisible.box.y + lastVisible.box.h);
          var vh2 = heightTracksScreen(el);
          if (vh2) node.vh = { minHeight: vh2 };
          else if (tail > 0.5 && !(hadNav && navEnd && navEnd.y >= lastVisible.box.y + lastVisible.box.h - 1)) { lastVisible.node.style = lastVisible.node.style || {}; lastVisible.node.style.marginBottom = r2(tail); }
        }
      } else if (b && !inflow.length && !outOfFlow(cs)) {
        // Nothing in the flow (only positioned layers): the box keeps its size.
        var vh3 = heightTracksScreen(el);
        if (vh3) node.vh = { height: vh3 }; else if (b.h > 0) s.height = r2(b.h);
      }
    }
    abs.forEach(function(it){ children.push(it.node); });
    return children;
  }
  function margins(cs, st, vertical){
    var m = [['Top','Top'], ['Bottom','Bottom'], ['Left', RTL ? 'End' : 'Start'], ['Right', RTL ? 'Start' : 'End']];
    m.forEach(function(p){ if (!vertical && (p[0] === 'Top' || p[0] === 'Bottom')) return; var v = px(cs['margin' + p[0]]); if (v) st['margin' + p[1]] = r2(v); });
  }
  function gridRows(el, cs, inflow, ca, node, s){
    var items = inflow.filter(function(it){ return it.box; }).slice();
    var hiddenItems = inflow.filter(function(it){ return !it.box; });
    items.sort(function(a, b){ return a.box.y - b.box.y || (RTL ? b.box.x - a.box.x : a.box.x - b.box.x); });
    var rows = [];
    items.forEach(function(it){
      var row = rows.length ? rows[rows.length - 1] : null;
      if (row && it.box.y < row.top + Math.max(4, row.minH * 0.5)) { row.items.push(it); row.bottom = Math.max(row.bottom, it.box.y + it.box.h); row.minH = Math.min(row.minH, it.box.h); }
      else rows.push({ top: it.box.y, bottom: it.box.y + it.box.h, minH: it.box.h, items: [it] });
    });
    // Items spanning rows (a timeline, a bento layout) don't make clean rows:
    // they keep their measured places, relative to the grid's width.
    var spans = false;
    rows.forEach(function(row, ri){
      var next = rows[ri + 1];
      if (next && row.items.some(function(it){ return it.box.y + it.box.h > next.top + 2; })) spans = true;
    });
    var b0 = boxOf(A, el);
    if (spans && b0) {
      var pbx = padBox(b0);
      s.height = r2(b0.h);
      var outA = [];
      items.forEach(function(it){
        var st = it.node.style = it.node.style || {};
        delete st.marginTop; delete st.marginBottom; delete st.marginStart; delete st.marginEnd; delete st.alignSelf; delete st.width;
        var left = RTL ? (pbx.x + pbx.w) - (it.box.x + it.box.w) : it.box.x - pbx.x;
        st.position = 'absolute';
        st.top = r2(it.box.y - pbx.y);
        st.start = r2(left / (pbx.w || 1) * 100) + '%';
        st.width = r2(it.box.w / (pbx.w || 1) * 100) + '%';
        st.height = r2(it.box.h);
        outA.push(it.node);
      });
      hiddenItems.forEach(function(it){ outA.push(it.node); });
      return outA;
    }
    var out = [];
    var prevBottom = ca ? ca.y : rows.length ? rows[0].top : 0;
    var cg = cs.columnGap && cs.columnGap !== 'normal' ? px(cs.columnGap) : 0;
    // How the grid flows, for lists that fill it with more items later.
    node.grid = { columns: rows.reduce(function(m, r){ return Math.max(m, r.items.length); }, 1), columnGap: r2(cg), rowGap: r2(cs.rowGap && cs.rowGap !== 'normal' ? px(cs.rowGap) : 0) };
    var single = rows.every(function(r){ return r.items.length === 1; });
    rows.forEach(function(row, ri){
      row.items.sort(function(a, b){ return RTL ? b.box.x - a.box.x : a.box.x - b.box.x; });
      var gap = row.top - prevBottom;
      if (single) {
        var it = row.items[0], st = it.node.style = it.node.style || {};
        if (it.el) placeInColumn(it.el, el, st, { stretch: true });
        if (Math.abs(gap) > 0.5) st.marginTop = r2(gap);
        out.push(it.node);
      } else {
        var rs = { flexDirection: 'row' };
        if (cg) rs.columnGap = r2(cg);
        if (Math.abs(gap) > 0.5) rs.marginTop = r2(gap);
        // Items overlapping an earlier one in the same row (stacked grid areas) sit on top of it.
        var kids = [];
        var rowLeft = ca ? ca.x : row.items[0].box.x;
        row.items.forEach(function(it, i){
          var st = it.node.style = it.node.style || {};
          var overl = i > 0 && row.items.slice(0, i).some(function(p){ return Math.min(p.box.x + p.box.w, it.box.x + it.box.w) - Math.max(p.box.x, it.box.x) > it.box.w * 0.5; });
          if (overl) {
            st.position = 'absolute'; st.top = r2(it.box.y - row.top); st.start = r2(RTL ? (ca.x + ca.w) - (it.box.x + it.box.w) : it.box.x - rowLeft); st.width = r2(it.box.w); st.height = r2(it.box.h);
            rs.minHeight = r2(row.bottom - row.top);
            kids.push(it.node);
            return;
          }
          var wk = it.el ? widthKind(it.el, el) : { kind: 'share', a: it.box, ca: ca };
          if (wk.kind === 'fixed' && (!it.el || !contentSized(it.el) || it.node.type === 'image')) { st.width = r2(it.box.w); st.flexShrink = 0; }
          else { st.flexGrow = r2(it.box.w); st.flexBasis = 0; st.flexShrink = 1; }
          var as = it.cs ? it.cs.alignSelf : 'auto';
          if (as !== 'auto' && ALIGN[as]) st.alignSelf = ALIGN[as];
          else if (it.cs && ALIGN[cs.alignItems] && ALIGN[cs.alignItems] !== 'stretch') st.alignSelf = ALIGN[cs.alignItems];
          kids.push(it.node);
        });
        stats.nodes++;
        out.push({ type: 'view', tag: '#row', style: rs, children: kids });
      }
      prevBottom = row.bottom;
    });
    if (ca && rows.length) {
      var tail = (ca.y + ca.h) - prevBottom;
      if (tail > 0.5) { var lastN = out[out.length - 1]; lastN.style = lastN.style || {}; lastN.style.marginBottom = r2(tail); }
    }
    hiddenItems.forEach(function(it){ out.push(it.node); });
    return out;
  }

  /* ── Absolute / fixed placement ──────────────────────── */
  function placeAbsolute(el, cs, s, parentEl, fixed){
    var a = boxOf(A, el), b = boxOf(B, el);
    if (!a) return;
    var pa, pb;
    if (fixed) { pa = { x: 0, y: window.scrollY, w: opt.vw[0], h: opt.vh[0] }; pb = { x: 0, y: window.scrollY, w: opt.vw[1], h: opt.vh[1] }; }
    else {
      var PA = boxOf(A, parentEl), PB = boxOf(B, parentEl);
      if (!PA) return;
      pa = padBox(PA); pb = PB ? padBox(PB) : pa;
    }
    s.position = 'absolute';
    var la = a.x - pa.x, ra = (pa.x + pa.w) - (a.x + a.w);
    var lb = b ? b.x - pb.x : la, rb = b ? (pb.x + pb.w) - (b.x + b.w) : ra;
    var startA = RTL ? ra : la, endA = RTL ? la : ra, startB = RTL ? rb : lb, endB = RTL ? lb : rb;
    var wgrow = b ? b.w - a.w : 0, pgrow = pb.w - pa.w;
    var noText = !contentSized(el);
    if (Math.abs(pgrow) > 2 && near(wgrow, pgrow, 1.5)) { s.start = r2(startA); s.end = r2(endA); }
    // A box anchored on one side keeps its measured width (text inside wraps
    // as it did: an absolute box is otherwise as wide as its text).
    else if (near(startB, startA, 1)) { s.start = r2(startA); s.width = r2(a.w + (noText ? 0 : 0.5)); }
    else if (near(endB, endA, 1)) { s.end = r2(endA); s.width = r2(a.w + (noText ? 0 : 0.5)); }
    else { s.start = r2(startA / (pa.w || 1) * 100) + '%'; s.width = r2(a.w / (pa.w || 1) * 100) + '%'; }
    var ta = a.y - pa.y, ba = (pa.y + pa.h) - (a.y + a.h);
    if (near(ta, 0, 1) && near(ba, 0, 1) && pa.h > 0) { s.top = 0; s.bottom = 0; }
    else if (fixed && ba >= 0 && ba < ta) { s.bottom = r2(ba); if (noText) s.height = r2(a.h); }
    else if (!fixed && b && pb.h !== pa.h && near((pb.y + pb.h) - (b.y + b.h), ba, 1) && !near(b.y - pb.y, ta, 1)) { s.bottom = r2(ba); if (noText) s.height = r2(a.h); }
    else { s.top = r2(ta); if (noText || el.tagName === 'IMG') s.height = r2(a.h); }
    if (s.start != null && s.end != null) delete s.width;
    if (s.top != null && s.bottom != null) { delete s.height; delete s.aspectRatio; }
    if (s.height != null) delete s.aspectRatio;
  }

  /* ── Islands ─────────────────────────────────────────── */
  function islandHtml(el){
    var html = el.outerHTML;
    // Empty copies of the ancestors keep the page's selectors matching.
    var p = el.parentElement;
    while (p && p !== doc.body && p !== doc.documentElement) {
      var tag = p.tagName.toLowerCase();
      var attrs = '';
      if (p.id) attrs += ' id="' + p.id.replace(/"/g, '&quot;') + '"';
      if (p.getAttribute('class')) attrs += ' class="' + p.getAttribute('class').replace(/"/g, '&quot;') + '"';
      for (var i = 0; i < p.attributes.length; i++) { var at = p.attributes[i]; if (at.name.indexOf('data-') === 0 || at.name === 'dir' || at.name === 'lang') attrs += ' ' + at.name + '="' + at.value.replace(/"/g, '&quot;') + '"'; }
      html = '<' + tag + attrs + ' style="margin:0!important;padding:0!important;border:0!important;min-height:0!important;height:auto!important;width:auto!important;max-width:none!important;background:none!important;box-shadow:none!important;position:static!important;display:block!important;transform:none!important;overflow:visible!important;">' + html + '</' + tag + '>';
      p = p.parentElement;
    }
    return html;
  }

  /* ── Node builders ───────────────────────────────────── */
  function build(el, ctx){
    if (el.nodeType !== 1 || SKIP[el.tagName] || el.tagName === 'NEXT-ROUTE-ANNOUNCER') return null;
    var cs = getComputedStyle(el);
    if (isHiddenEl(el, cs) && ctx.kind !== 'forceShow') return null;
    if (cs.display === 'contents') {
      var list = [];
      flowChildren(el).forEach(function(c){ if (c.nodeType === 1) { var n = build(c, ctx); if (n) list = list.concat(n); } });
      return list.length ? list : null;
    }
    var tag = el.tagName.toUpperCase();
    var s = {};
    var node;
    stats.nodes++;
    var b = boxOf(A, el);

    if (el.__nkIsland) {
      stats.islands++;
      stats.islandReasons[el.__nkIsland] = (stats.islandReasons[el.__nkIsland] || 0) + 1;
      // Its height: the box, or what its content covers (positioned layers);
      // a full-screen app (fixed layers) gets the whole screen.
      var ih = b ? b.h : 150, fixedInside = false;
      if (b) el.querySelectorAll('*').forEach(function(d){
        var db = boxOf(A, d);
        if (!db) return;
        if (getComputedStyle(d).position === 'fixed') fixedInside = true;
        else if (db.h > 0) ih = Math.max(ih, db.y + db.h - b.y);
      });
      node = common(el, { type: 'web', html: islandHtml(el), height: r2(fixedInside && ih < opt.vh[0] ? opt.vh[0] : ih), reason: el.__nkIsland });
      margins(cs, s, false);
      if (fixedInside && ih < opt.vh[0]) node.vh = { height: 100 };
      else s.height = r2(ih);
    } else if (el.__nkWidget) {
      // Drawn by the engine (map, chart, calendar, QR scanner, language
      // switcher): a box with the element's own look; a calendar sizes itself.
      node = common(el, { type: 'view', children: [] });
      boxStyle(el, cs, b, s);
      if (b && el.__nkWidget !== 'calendar') s.height = r2(b.h);
    } else if (tag === 'IMG') {
      stats.images++;
      node = common(el, { type: 'image', src: abs(el.currentSrc || el.src) || '' });
      if (el.alt) node.alt = el.alt;
      if (cs.objectFit && cs.objectFit !== 'fill') node.fit = cs.objectFit;
      else node.fit = 'fill';
      if (cs.objectPosition && cs.objectPosition !== '50% 50%') node.position = cs.objectPosition;
      if (el.naturalWidth) node.natural = { width: el.naturalWidth, height: el.naturalHeight };
      boxStyle(el, cs, b, s);
      if (node.alt) { node.a11y = node.a11y || {}; node.a11y.label = node.alt; }
      if (b) {
        var bb = boxOf(B, el);
        if (bb && b.w && bb.w && Math.abs(bb.w - b.w) > 1 && near(b.h / b.w, bb.h / bb.w, 0.01)) s.aspectRatio = r2(b.w / b.h);
        else s.height = r2(b.h);
        if (ctx.kind === 'inline') s.width = r2(b.w);
      }
    } else if (tag === 'SVG') {
      node = common(el, { type: 'svg', xml: svgXml(el, cs, b) });
      if (b) { s.width = r2(b.w); s.height = r2(b.h); }
      margins(cs, s, true);
      if (el.__nkTransform) { var tr = matrixToRN(el.__nkTransform); if (tr.length) s.transform = tr; }
      var op = parseFloat(cs.opacity); if (op < 1) s.opacity = op;
    } else if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      var type = tag === 'INPUT' ? (el.getAttribute('type') || 'text').toLowerCase() : tag.toLowerCase();
      if (tag === 'INPUT' && /^(submit|button|reset|image)$/.test(type)) {
        node = common(el, { type: 'button', buttonType: type === 'image' ? 'submit' : type, children: [] });
        if (el.name) node.name = el.name;
        if (el.value) node.value = el.value;
        if (el.disabled) node.disabled = true;
        var ts0 = textStyle(cs);
        node.children.push({ type: 'text', tag: '#text', runs: [{ text: el.value || (type === 'submit' ? 'Submit' : '') }], style: Object.assign({ textAlign: 'center' }, ts0) });
        attachVariants(el, node.children[0], 'text');
        boxStyle(el, cs, b, s);
        s.justifyContent = 'center';
      } else {
        node = fieldNode(el, type, tag);
        if (type === 'hidden') { node.hidden = true; }
        else {
          Object.assign(s, textStyle(cs));
          delete s.textAlign; if (cs.textAlign === 'center') s.textAlign = 'center';
          boxStyle(el, cs, b, s);
          if (b) { s.height = r2(b.h); if (type === 'checkbox' || type === 'radio' || type === 'color' || type === 'range') s.width = r2(b.w); }
        }
      }
    } else if (tag === 'BUTTON') {
      node = common(el, { type: 'button', buttonType: (el.getAttribute('type') || 'submit').toLowerCase(), children: [] });
      if (el.name) node.name = el.name;
      if (el.value) node.value = el.value;
      if (el.disabled) node.disabled = true;
      boxStyle(el, cs, b, s);
      container(el, cs, s, node);
    } else {
      node = common(el, { type: 'view', children: [] });
      if (tag === 'FORM') { node.form = {}; var act = el.getAttribute('action'); if (act) node.form.action = abs(act); var meth = el.getAttribute('method'); if (meth) node.form.method = meth.toLowerCase(); }
      boxStyle(el, cs, b, s);
      container(el, cs, s, node);
      if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) node.scrollX = true;
    }

    if (s.__bgImage) { node.bgImage = s.__bgImage; delete s.__bgImage; }
    // Where the box sits in its parent.
    if (ctx.kind === 'abs') placeAbsolute(el, cs, s, ctx.parent, cs.position === 'fixed');
    else if (ctx.kind === 'child' && node.type !== 'text') {
      if (/flex|grid/.test((ctx.parentCs && ctx.parentCs.display) || '')) { /* flex item: set by the parent */ }
    }
    if (cs.position === 'sticky') node.sticky = true;
    if (cs.position === 'relative' && (px(cs.top) || px(cs.left))) {
      var tr2 = s.transform || [];
      if (px(cs.left)) tr2.unshift({ translateX: px(cs.left) * (RTL ? -1 : 1) });
      if (px(cs.top)) tr2.unshift({ translateY: px(cs.top) });
      s.transform = tr2;
    }
    if (cs.position === 'fixed') node.__fixed = true;
    if (Object.keys(s).length) node.style = Object.assign(node.style || {}, s);
    attachVariants(el, node, node.type === 'text' || node.type === 'input' ? 'both' : 'box');
    return node;
  }
  // Fills a view/button: a text block, or children laid out.
  // A list item's marker ("•", "3."), drawn before its text.
  function listMarker(el, cs){
    if (cs.display !== 'list-item' || !cs.listStyleType || cs.listStyleType === 'none') return null;
    if (/decimal|roman|alpha|latin|arabic|persian|devanagari|bengali|cjk|hebrew/.test(cs.listStyleType)) {
      var n = 1;
      for (var p = el.previousElementSibling; p; p = p.previousElementSibling) if (getComputedStyle(p).display === 'list-item') n++;
      var start = el.parentElement && el.parentElement.tagName === 'OL' ? parseInt(el.parentElement.getAttribute('start') || '1', 10) : 1;
      return (n + start - 1) + '.';
    }
    return cs.listStyleType === 'circle' ? '◦' : cs.listStyleType === 'square' ? '▪' : '•';
  }
  function container(el, cs, s, node){
    var d = cs.display;
    var isFlexOrGrid = /flex|grid/.test(d);
    var marker = listMarker(el, cs);
    if (!isFlexOrGrid && textOnlyInside(el) && hasVisibleText(el)) {
      var ts = textStyle(cs);
      var runs = tidyRuns(runsOf(el, ts, collapseMode(cs)), collapseMode(cs));
      if (marker && runs.length) runs.unshift({ text: marker + '  ' });
      if (runs.length) {
        var lc = lineClamp(cs);
        var hasBox = Object.keys(s).some(function(k){ return /^(background|border|padding|boxShadow|experimental_backgroundImage|__bgImage|overflow)/.test(k); });
        if (!hasBox && node.type === 'view' && !el.__nkIsland) {
          // The element itself becomes the text node.
          node.type = 'text';
          delete node.children;
          node.runs = runs;
          Object.assign(s, ts);
          if (lc) node.lines = lc;
          node.style = s;
          hoistLink(node);
          return;
        }
        var t = { type: 'text', tag: '#text', runs: runs, style: ts };
        if (lc) t.lines = lc;
        attachVariants(el, t, 'text');
        if (!node.href && !node.to) hoistLink(t);
        stats.nodes++;
        node.children = [t];
        if (node.type === 'button' || /inline/.test(d)) s.justifyContent = 'center';
        return;
      }
    }
    node.children = layoutChildren(el, cs, s, node);
    if (marker && node.children.length) {
      var first = node.children[0];
      if (first && first.type === 'text') first.runs.unshift({ text: marker + '  ' });
    }
  }
  // A form field's facts (what it sends, its checks, its label), without its look.
  function fieldNode(el, type, tag){
    var node = common(el, { type: 'input', inputType: type });
    node.fieldId = fieldIdOf(el);
    if (el.name) node.name = el.name;
    if (type === 'checkbox' || type === 'radio') { node.checked = el.checked; node.value = el.getAttribute('value') || 'on'; }
    else if (type !== 'file' && el.value) node.value = el.value;
    var ph = el.getAttribute('placeholder'); if (ph) { node.placeholder = ph; var pcs = getComputedStyle(el, '::placeholder'); if (pcs && pcs.color) node.placeholderColor = color(pcs.color); }
    ['required','disabled','multiple'].forEach(function(k){ if (el[k]) node[k] = true; });
    if (el.readOnly) node.readOnly = true;
    ['min','max','step','pattern','autocomplete','inputmode','accept'].forEach(function(k){ var v = el.getAttribute(k); if (v != null && v !== '') node[k === 'autocomplete' ? 'autoComplete' : k === 'inputmode' ? 'inputMode' : k] = v; });
    if (el.minLength > 0) node.minLength = el.minLength;
    if (el.maxLength > 0 && el.maxLength < 524288) node.maxLength = el.maxLength;
    if (tag === 'TEXTAREA') node.rows = el.rows;
    if (tag === 'SELECT') {
      node.options = [];
      Array.prototype.forEach.call(el.options, function(o){ var opt2 = { value: o.value, label: o.label || o.text }; if (o.selected) opt2.selected = true; if (o.disabled) opt2.disabled = true; if (o.parentElement && o.parentElement.tagName === 'OPTGROUP') opt2.group = o.parentElement.label; for (var oi = 0; oi < o.attributes.length; oi++) { var oa = o.attributes[oi]; if (oa.name.indexOf('data-nk-') === 0) { opt2.nk = opt2.nk || {}; opt2.nk[oa.name] = oa.value; } } if (o.hasAttribute('value')) opt2.hasValue = true; node.options.push(opt2); });
    }
    var lab = labelFor(el); if (lab) node.label = lab;
    node.a11y = node.a11y || {};
    if (type === 'checkbox') node.a11y.role = 'checkbox';
    else if (type === 'radio') node.a11y.role = 'radio';
    else if (type === 'search') node.a11y.role = 'search';
    if (!node.a11y.label && lab) node.a11y.label = lab;
    return node;
  }
  function fieldIdOf(el){ return el.id || ('nk-f' + (el.__nkId != null ? el.__nkId : (el.__nkFid = el.__nkFid || ++fidSeq))); }
  var fidSeq = 100000;
  // Fields hidden by the page's CSS (display:none, a visually hidden radio
  // behind its label, a type=hidden input) still go with their form, as in
  // the browser's FormData: they become hidden input nodes.
  function hiddenFields(el){
    var out = [];
    var list = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) ? [el] : Array.prototype.slice.call(el.querySelectorAll('input,select,textarea'));
    list.forEach(function(f){
      if (!f.name || f.disabled) return;
      var tag = f.tagName.toUpperCase();
      var type = tag === 'INPUT' ? (f.getAttribute('type') || 'text').toLowerCase() : tag.toLowerCase();
      if (/^(submit|button|reset|image)$/.test(type)) return;
      var n = fieldNode(f, type, tag);
      n.hidden = true;
      delete n.a11y;
      stats.nodes++;
      out.push(n);
    });
    return out;
  }
  function labelFor(el){
    try {
      if (el.labels && el.labels.length) return (el.labels[0].innerText || '').trim().slice(0, 200) || undefined;
    } catch (e) {}
    return el.getAttribute('aria-label') || undefined;
  }
  function svgXml(el, cs, b){
    var clone = el.cloneNode(true);
    var src = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*')));
    var dst = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*')));
    var PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'fill-rule', 'stop-color', 'stop-opacity', 'font-size', 'font-family', 'font-weight'];
    for (var i = 0; i < src.length && i < dst.length; i++) {
      var c = getComputedStyle(src[i]);
      var d = dst[i];
      if (d.removeAttribute) { d.removeAttribute('class'); d.removeAttribute('style'); }
      PROPS.forEach(function(p){
        var v = c.getPropertyValue(p);
        if (!v) return;
        if (p === 'opacity' && v === '1') return;
        if ((p === 'fill-opacity' || p === 'stroke-opacity' || p === 'stop-opacity') && v === '1') return;
        if (p === 'stroke' && v === 'none' && !src[i].hasAttribute('stroke')) return;
        if ((p === 'font-size' || p === 'font-family' || p === 'font-weight') && src[i].tagName.toLowerCase() !== 'text' && src[i].tagName.toLowerCase() !== 'tspan') return;
        if ((p === 'stop-color' || p === 'stop-opacity') && src[i].tagName.toLowerCase() !== 'stop') return;
        d.setAttribute(p, v);
      });
    }
    // Drawing only: no scripts, embedded HTML or handlers travel with it.
    clone.querySelectorAll('script,foreignObject,iframe').forEach(function(n){ n.remove(); });
    [clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*'))).forEach(function(n){
      Array.prototype.slice.call(n.attributes).forEach(function(a){
        if (/^on/i.test(a.name) || (/href$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
      });
    });
    if (b) { clone.setAttribute('width', String(r2(b.w))); clone.setAttribute('height', String(r2(b.h))); }
    if (!clone.getAttribute('viewBox') && b) clone.setAttribute('viewBox', '0 0 ' + r2(b.w) + ' ' + r2(b.h));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return clone.outerHTML.replace(/currentColor/g, color(cs.color)).replace(/(?:color|oklch|oklab|lab|lch|hwb)\([^()]*\)/g, function(m){ return color(m); });
  }

  /* ── Nav (the shared menu) ───────────────────────────── */
  function navSpec(){
    var nav = doc.querySelector('nav[data-nk-nav]');
    if (!nav) return null;
    var undoMenu = null;
    var collapse = nav.querySelector('.navbar-collapse');
    function item(li){
      var a = li.querySelector(':scope > a, :scope > button');
      if (!a) return null;
      var it = { label: (a.innerText || a.textContent || '').replace(/[▾▼]/g, '').replace(/\s+/g, ' ').trim() };
      var nk = {};
      [li, a].forEach(function(e){ for (var i = 0; i < e.attributes.length; i++) { var at = e.attributes[i]; if (at.name.indexOf('data-nk-') === 0) nk[at.name] = at.value; } });
      if (Object.keys(nk).length) it.nk = nk;
      if (nk['data-nk-auth']) it.auth = nk['data-nk-auth'];
      if (nk['data-nk-role']) it.role = nk['data-nk-role'];
      var h = a.getAttribute('href');
      if (h && h !== '#') { var r = ref(a.href); if (r) { it.href = r.href; if (r.to) it.to = r.to; } }
      if (a.getAttribute('aria-current') === 'page' || a.classList.contains('active')) it.active = true;
      var sub = li.querySelector(':scope > ul, :scope > .dropdown-menu');
      if (sub) { it.children = []; sub.querySelectorAll(':scope > li').forEach(function(l2){ var c = item(l2); if (c) it.children.push(c); }); delete it.href; delete it.to; }
      return it;
    }
    var items = [];
    nav.querySelectorAll('.navbar-nav > li, [data-nk-nav-items] > li').forEach(function(li){
      var cs = getComputedStyle(li);
      var gated = li.hasAttribute('data-nk-role') || li.hasAttribute('data-nk-auth') || (li.querySelector(':scope > a') && (li.querySelector(':scope > a').hasAttribute('data-nk-auth') || li.querySelector(':scope > a').hasAttribute('data-nk-role')));
      if (cs.display === 'none' && !gated && !li.hasAttribute('hidden')) return;
      if (cs.display === 'none' && !gated) return;
      var it = item(li);
      if (it && it.label) items.push(it);
    });
    var brandEl = nav.querySelector('.navbar-brand');
    var brand = null;
    if (brandEl) {
      brand = { text: (brandEl.innerText || brandEl.textContent || '').replace(/\s+/g, ' ').trim() };
      var br = ref(brandEl.href); if (br && br.to) brand.to = br.to;
      var bimg = brandEl.querySelector('img'); if (bimg) brand.image = abs(bimg.currentSrc || bimg.src);
    }
    var ncs = getComputedStyle(nav);
    var link = nav.querySelector('.nav-link:not(.active)') || nav.querySelector('.nav-link');
    var style = navColors(nav);
    if (link) { style.fontFamily = getComputedStyle(link).fontFamily; fontUse[style.fontFamily + '|' + getComputedStyle(link).fontWeight + '|normal'] = 1; style.fontWeight = getComputedStyle(link).fontWeight; }
    if (brandEl) { var bcs = getComputedStyle(brandEl); style.brandFontFamily = bcs.fontFamily; style.brandFontWeight = bcs.fontWeight; style.brandFontStyle = bcs.fontStyle; fontUse[bcs.fontFamily + '|' + bcs.fontWeight + '|' + (bcs.fontStyle === 'italic' ? 'italic' : 'normal')] = 1; }
    // The page draws its own header around the menu (an AI Designer page):
    // the app shouldn't add a second one.
    var nb = nav.getBoundingClientRect();
    var pageHeader = Array.prototype.some.call(nav.parentElement ? nav.parentElement.children : [], function(c){
      if (c === nav || SKIP[c.tagName]) return false;
      var r = c.getBoundingClientRect();
      var cs2 = getComputedStyle(c);
      return r.height > 0 && r.width > 0 && cs2.visibility !== 'hidden' && cs2.display !== 'none' && r.top < nb.bottom && r.bottom > nb.top;
    });
    return { items: items, brand: brand, style: style, pageHeader: pageHeader };
  }

  // The menu's colours as the web menu shows them now.
  function navColors(nav){
    var ncs = getComputedStyle(nav);
    var link = nav.querySelector('.nav-link:not(.active)') || nav.querySelector('.nav-link');
    var active = nav.querySelector('.nav-link.active') || link;
    var bg = ncs.backgroundColor;
    if (transparent(bg)) bg = getComputedStyle(doc.body).backgroundColor;
    var style = { background: color(bg), text: color(link ? getComputedStyle(link).color : ncs.color), active: color(active ? getComputedStyle(active).color : ncs.color) };
    if (px(ncs.borderBottomWidth)) style.border = color(ncs.borderBottomColor);
    return style;
  }

  /* ── Theme tokens ────────────────────────────────────── */
  function themeTokens(){
    var out = {};
    var rcs = getComputedStyle(doc.documentElement);
    var probe = doc.createElement('div');
    doc.body.appendChild(probe);
    for (var i = 0; i < rcs.length; i++) {
      var name = rcs[i];
      if (name.indexOf('--nk-') !== 0) continue;
      var raw = rcs.getPropertyValue(name).trim();
      var val = raw;
      if (/^(#|rgb|hsl|color-mix|oklch|oklab|lab\(|lch\(|[a-z]+$)/i.test(raw) && !/^(dark|light|auto|none|normal|inherit)$/i.test(raw)) {
        probe.style.color = '';
        probe.style.color = 'var(' + name + ')';
        var c = getComputedStyle(probe).color;
        if (c) val = color(c);
      }
      out[name.slice(2)] = val;
    }
    probe.remove();
    return out;
  }

  /* ── Page ────────────────────────────────────────────── */
  function pageBackground(){
    var bodyCs = getComputedStyle(doc.body);
    var htmlCs = getComputedStyle(doc.documentElement);
    var bg = { color: color(!transparent(bodyCs.backgroundColor) ? bodyCs.backgroundColor : !transparent(htmlCs.backgroundColor) ? htmlCs.backgroundColor : 'rgb(255, 255, 255)') };
    var bgSrc = bodyCs.backgroundImage !== 'none' ? bodyCs : htmlCs.backgroundImage !== 'none' ? htmlCs : null;
    if (bgSrc) {
      splitLayers(bgSrc.backgroundImage).forEach(function(layer){
        if (/gradient\(/.test(layer) && !bg.gradient) bg.gradient = colorsIn(layer);
        var m = /^url\("?(.*?)"?\)$/.exec(layer);
        if (m && !bg.image) bg.image = { src: abs(m[1]), size: bgSrc.backgroundSize.split(',')[0].trim(), position: bgSrc.backgroundPosition.split(',')[0].trim(), repeat: bgSrc.backgroundRepeat.split(',')[0].trim() };
      });
    }
    return bg;
  }

  /* ── Variants: the page in other states ───────────────── */
  // Each element's look in the visitor's dark theme (html[data-theme=dark],
  // when the app's CSS has one) and in the states the runtime switches with
  // a class (window.__nkVariantStates): read now, before building; build()
  // stores what differs as NativeNode.variants.
  var VAR = new Map();
  var BORDER_SIDES = [['Top','Top'], ['Right', RTL ? 'Start' : 'End'], ['Bottom','Bottom'], ['Left', RTL ? 'End' : 'Start']];
  function visual(el, cs){
    var v = { color: color(cs.color), backgroundColor: transparent(cs.backgroundColor) ? 'transparent' : color(cs.backgroundColor) };
    BORDER_SIDES.forEach(function(p){ if (px(cs['border' + p[0] + 'Width']) > 0 && cs['border' + p[0] + 'Style'] !== 'none') v['border' + p[1] + 'Color'] = color(cs['border' + p[0] + 'Color']); });
    v.boxShadow = cs.boxShadow && cs.boxShadow !== 'none' ? colorsIn(cs.boxShadow) : null;
    var grads = cs.backgroundImage && cs.backgroundImage !== 'none' ? splitLayers(cs.backgroundImage).filter(function(l){ return /gradient\(/.test(l); }) : [];
    v.experimental_backgroundImage = grads.length ? colorsIn(grads.join(', ')) : null;
    v.opacity = r2(parseFloat(cs.opacity));
    v.hidden = cs.display === 'none' || cs.visibility === 'hidden';
    return v;
  }
  function snapAll(els, key, base){
    els.forEach(function(el){
      if (el.nodeType !== 1 || SKIP[el.tagName]) return;
      var rec = VAR.get(el);
      if (!rec) { rec = {}; VAR.set(el, rec); }
      var cs = getComputedStyle(el);
      if (base) { if (!rec.__base) rec.__base = visual(el, cs); return; }
      var v = visual(el, cs);
      if (el.tagName.toLowerCase() === 'svg') v.xml = svgXml(el, cs, boxOf(A, el));
      rec[key] = v;
    });
  }
  function hasDarkCss(){
    for (var i = 0; i < doc.styleSheets.length; i++) {
      try { var rules = doc.styleSheets[i].cssRules; for (var j = 0; j < rules.length; j++) if (rules[j].cssText.indexOf('data-theme') >= 0) return true; } catch (e) {}
    }
    return false;
  }
  var darkFacts = null;
  (function readVariants(){
    var states = (window.__nkVariantStates ? window.__nkVariantStates() : []).map(function(v){ return { els: [v.root].concat(Array.prototype.slice.call(v.root.querySelectorAll('*'))), key: v.key, on: v.on, off: v.off }; });
    var dark = hasDarkCss() && doc.documentElement.getAttribute('data-theme') !== 'dark';
    if (dark) {
      var html = doc.documentElement;
      states.push({ els: Array.prototype.slice.call(doc.body.querySelectorAll('*')).concat([doc.body]), key: 'dark', on: function(){ html.setAttribute('data-theme', 'dark'); }, off: function(){ html.removeAttribute('data-theme'); }, dark: true });
    }
    states.forEach(function(st){ snapAll(st.els, st.key, true); });
    states.forEach(function(st){
      st.on();
      snapAll(st.els, st.key, false);
      if (st.dark) {
        var nv = doc.querySelector('nav[data-nk-nav]');
        darkFacts = { background: pageBackground(), tokens: themeTokens(), nav: nv ? navColors(nv) : null };
      }
      st.off();
    });
    if (darkFacts) {
      var light = pageBackground();
      if (JSON.stringify(light) === JSON.stringify(darkFacts.background) && !Array.prototype.some.call(doc.body.querySelectorAll('*'), function(el){ var r = VAR.get(el); return r && r.dark && r.__base && r.dark.color !== r.__base.color; })) darkFacts = null;
    }
  })();
  var TEXT_KEYS_V = { color: 1 };
  var BOX_KEYS_V = { backgroundColor: 1, boxShadow: 1, experimental_backgroundImage: 1, opacity: 1, borderTopColor: 1, borderBottomColor: 1, borderStartColor: 1, borderEndColor: 1 };
  // mode: 'box' (a view, button, image), 'text' (an anonymous text block), 'both' (text or field built from the element), 'run'
  function attachVariants(el, node, mode){
    var rec = el && el.nodeType === 1 ? VAR.get(el) : null;
    if (!rec || !rec.__base) return;
    var base = rec.__base, out = null;
    for (var key in rec) {
      if (key === '__base') continue;
      var alt = rec[key], st = {}, patch = {}, any = false;
      for (var k in alt) {
        if (k === 'hidden' || k === 'xml') continue;
        var wanted = mode === 'text' ? TEXT_KEYS_V[k] : mode === 'box' ? BOX_KEYS_V[k] : mode === 'run' ? (k === 'color' || k === 'backgroundColor') : (TEXT_KEYS_V[k] || BOX_KEYS_V[k]);
        if (!wanted) continue;
        if (alt[k] !== base[k]) { st[k] = alt[k] == null ? null : alt[k]; any = true; }
      }
      if (st.backgroundColor === 'transparent' && (mode === 'run' || base.backgroundColor === 'transparent')) delete st.backgroundColor;
      if (Object.keys(st).length) patch.style = st;
      if (mode !== 'text' && alt.hidden !== base.hidden) { patch.hidden = alt.hidden; any = true; }
      if (alt.xml && node.type === 'svg' && alt.xml !== node.xml) { patch.xml = alt.xml; any = true; }
      if (any && Object.keys(patch).length) (out = out || {})[key] = patch;
    }
    if (out) node.variants = out;
  }

  var bg = pageBackground();

  var nav = navSpec();
  var bodyCs = getComputedStyle(doc.body);
  var rootStyle = {};
  var root = { type: 'view', tag: 'body', children: [] };
  var bodyBox = boxOf(A, doc.body);
  // Body padding and text colour; the background is the page's.
  boxStyle(doc.body, bodyCs, bodyBox, rootStyle);
  delete rootStyle.backgroundColor; delete rootStyle.experimental_backgroundImage; delete rootStyle.__bgImage;
  // The shared menu is replaced by the app's own navigation: content starts at the top.
  var navEl = doc.querySelector('nav[data-nk-nav]');
  root.children = layoutChildren(doc.body, bodyCs, rootStyle, root);
  root.style = rootStyle;

  // Fixed elements become overlays.
  var overlays = [];
  function pullFixed(n){
    if (!n || !n.children) return;
    n.children = n.children.filter(function(c){
      if (c.__fixed) { delete c.__fixed; overlays.push(c); return false; }
      pullFixed(c);
      return true;
    });
  }
  pullFixed(root);

  // Fonts the browser actually loaded.
  var loaded = [];
  try { doc.fonts.forEach(function(f){ if (f.status === 'loaded') loaded.push({ family: f.family.replace(/^["']|["']$/g, ''), weight: f.weight, style: f.style }); }); } catch (e) {}

  // What islands share: the page's styles and scripts.
  var web = null;
  if (stats.islands) {
    var head = '';
    doc.querySelectorAll('link[rel=stylesheet]').forEach(function(l){ head += '<link rel="stylesheet" href="' + l.href + '">'; });
    doc.querySelectorAll('style').forEach(function(st){ if (st.getAttribute('data-nk-native') === 'transform' || st.getAttribute('data-nk-native') === 'pseudo') return; head += '<style>' + st.textContent + '</style>'; });
    var scripts = '';
    doc.querySelectorAll('script').forEach(function(sc){
      if (sc.src) { if (/\/_next\//.test(sc.src)) return; scripts += '<script src="' + sc.src + '"></' + 'script>'; return; }
      var t = sc.textContent;
      if (!t || /self\.__next_f|serviceWorker|__NEXT_DATA__/.test(t)) return;
      scripts += '<script>' + t.replace(/<\/script/gi, '<\\/script') + '</' + 'script>';
    });
    web = { head: head, scripts: scripts, url: location.href };
  }

  // @font-face rules the page can read (its own and same-origin sheets).
  var fontFaces = [];
  function walkRules(rules, base){
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      try {
        if (r.type === 5) fontFaces.push({ family: r.style.getPropertyValue('font-family').replace(/^["']|["']$/g, ''), weight: r.style.getPropertyValue('font-weight') || '400', style: r.style.getPropertyValue('font-style') || 'normal', src: r.style.getPropertyValue('src'), base: base });
        else if (r.type === 3 && r.styleSheet) walkRules(r.styleSheet.cssRules, r.styleSheet.href || base);
        else if (r.cssRules) walkRules(r.cssRules, base);
      } catch (e) {}
    }
  }
  for (var si = 0; si < doc.styleSheets.length; si++) {
    var sh = doc.styleSheets[si];
    try { walkRules(sh.cssRules, sh.href || location.href); } catch (e) {}
  }

  return {
    fontFaces: fontFaces,
    title: doc.title,
    lang: doc.documentElement.lang || '',
    dir: dir,
    background: bg,
    root: root,
    overlays: overlays,
    nav: nav,
    tokens: themeTokens(),
    fontUse: Object.keys(fontUse),
    fontsLoaded: loaded,
    web: web,
    stats: stats,
    colorScheme: getComputedStyle(doc.documentElement).colorScheme || '',
    dark: darkFacts
  };
})
`;
