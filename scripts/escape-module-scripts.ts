/**
 * One-time upgrade for apps that installed a module before its page script
 * escaped what visitors type (leaderboard names, analytics paths, reactions,
 * share counts, food logs, …) or owner data (store details, ad links, …).
 * Installed module pages are copies of the module's HTML, and published
 * versions are frozen snapshots, so fixing the module definitions only
 * helps new installs.
 *
 * FROZEN_SCRIPTS below holds the exact scripts that shipped before the fix.
 * Values filled in at install ({{config.*}}) may differ per app. Each one
 * found in a draft page or a published version (its HTML, and the editor's
 * saved copy of the page) is swapped for the fixed script from the current
 * module definition, with the app's own values kept. The Event Tickets and
 * Business Card pages also move to a QR-code library that still exists.
 *
 * Listed for review by hand, never changed:
 *  - pages of these modules whose script doesn't match (the owner edited
 *    it, or it came from an older version) — "owner edited, review by hand";
 *  - AI Assistant installs whose visitors' question history is still on the
 *    public page (new installs keep it on an owner-only page).
 *
 * Reports only, unless run with --apply:
 *   DATABASE_URL=… node_modules/.bin/tsx scripts/escape-module-scripts.ts [--apply]
 * A running server caches published versions in memory: restart it after
 * --apply (or run this before the restart that deploys the fix).
 */
import type { PrismaClient } from "@prisma/client";

export type FrozenScript = {
  module: string;
  /** The page's slug in the module definition. */
  page: string;
  /** Which inline <script> of the page (0 = first). */
  script: number;
  /** Visitor or owner data reached HTML unescaped (false: other fixes). */
  unsafe: boolean;
  why: string;
  old: string;
};

// The scripts as they shipped before the fix (generated from the module
// definitions at that version; do not edit by hand).
export const FROZEN_SCRIPTS: FrozenScript[] = [
  { module: "leaderboard", page: "leaderboard", script: 0, unsafe: true, why: "player names, pictures and categories",
    old: "(function(){\n  var cat = '{{config.defaultCategory}}';\n  function paint(){\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['top']||'top'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({category:cat}) })\n      .then(function(r){return r.json();}).then(function(rows){\n        var medals = ['','',''];\n        document.getElementById('nk-board').innerHTML = (rows||[]).map(function(r, i){\n          var m = medals[i] || (i+1)+'.';\n          return '<div class=\"d-flex align-items-center gap-3 p-3 border rounded mb-2\" style=\"background:var(--nk-surface);\"><div class=\"fs-3\" style=\"width:40px;text-align:center;\">'+m+'</div><img class=\"rounded-circle\" style=\"width:48px;height:48px;object-fit:cover;\" src=\"'+(r.avatar_url||'https://i.pravatar.cc/100')+'\"/><div class=\"flex-grow-1 fw-bold\">'+r.user_label+'</div><div class=\"fs-4 fw-bold\" style=\"color:var(--nk-primary);\">'+r.score+'</div></div>';\n        }).join('') || '<div class=\"alert alert-light\">No scores yet.</div>';\n      });\n  }\n  function paintCats(){\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['categories']||'categories'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n      .then(function(r){return r.json();}).then(function(rows){\n        var set = {}; (rows||[]).forEach(function(r){ if(r.category) set[r.category]=1; });\n        document.getElementById('nk-cats').innerHTML = Object.keys(set).map(function(c){ return '<button class=\"btn btn-sm '+(c===cat?'btn-primary':'btn-outline-primary')+' nk-cat\" data-c=\"'+c+'\">'+c+'</button>'; }).join('');\n        document.querySelectorAll('.nk-cat').forEach(function(b){ b.addEventListener('click', function(){ cat = b.getAttribute('data-c'); paint(); paintCats(); }); });\n      });\n  }\n  paint(); paintCats(); setInterval(paint, 10000);\n})();" },
  { module: "analytics-dashboard", page: "analytics", script: 0, unsafe: true, why: "visited pages and event names",
    old: "(function(){\n  function load(){\n    var slug = (window.__nkFlowSlugMap && window.__nkFlowSlugMap['summary']) || 'summary';\n    fetch('/api/run/' + slug, { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n      .then(function(r){ return r.json(); })\n      .then(function(rows){\n        if(!Array.isArray(rows)) return;\n        document.getElementById('nk-cnt-total').textContent = rows.length;\n        var dayAgo = Date.now() - 86400000;\n        var views = rows.filter(function(r){ return r.name === 'pageview' && new Date(r.created_at).getTime() > dayAgo; }).length;\n        document.getElementById('nk-cnt-views').textContent = views;\n        var sess = {}; rows.forEach(function(r){ if(r.session_id) sess[r.session_id] = 1; });\n        document.getElementById('nk-cnt-sess').textContent = Object.keys(sess).length;\n        var weekAgo = Date.now() - 604800000;\n        var recent = rows.filter(function(r){ return new Date(r.created_at).getTime() > weekAgo; });\n        function topBy(key){\n          var c={}; recent.forEach(function(r){var k=r[key]||'—';c[k]=(c[k]||0)+1;});\n          return Object.entries(c).sort(function(a,b){return b[1]-a[1];}).slice(0,8).map(function(p){\n            return '<div class=\"d-flex justify-content-between border-bottom py-1\"><span>'+p[0]+'</span><span class=\"fw-bold\">'+p[1]+'</span></div>';\n          }).join('') || '<div style=\"color:var(--nk-text-muted);\">No data yet.</div>';\n        }\n        document.getElementById('nk-top-paths').innerHTML = topBy('path');\n        document.getElementById('nk-top-events').innerHTML = topBy('name');\n      }).catch(function(){});\n  }\n  load();\n  setInterval(load, 30000);\n})();" },
  { module: "reactions", page: "reactions", script: 0, unsafe: true, why: "reactions",
    old: "(function(){\n  var EMOJIS = ['','','','','',''];\n  function paint(host){\n    var et = host.getAttribute('data-entity-table'); var eid = host.getAttribute('data-entity-id');\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['for-entity']||'for-entity'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({entity_table:et, entity_id:eid}) })\n      .then(function(r){return r.json();}).then(function(rows){\n        var counts = {}; (rows||[]).forEach(function(r){ counts[r.emoji]=(counts[r.emoji]||0)+1; });\n        host.innerHTML = EMOJIS.map(function(e){\n          var c = counts[e] || 0;\n          return '<button type=\"button\" class=\"btn btn-sm '+(c?'btn-primary':'btn-outline-secondary')+' nk-react\" data-emoji=\"'+e+'\">'+e+' <span class=\"badge bg-light text-dark ms-1\">'+c+'</span></button>';\n        }).join('');\n        host.querySelectorAll('.nk-react').forEach(function(b){\n          b.addEventListener('click', function(){\n            fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['react']||'react'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({entity_table:et, entity_id:eid, emoji:b.getAttribute('data-emoji'), user_id:''}) }).then(function(){ paint(host); });\n          });\n        });\n      });\n  }\n  document.querySelectorAll('[data-nk-reactions]').forEach(paint);\n  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['top']||'top'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n    .then(function(r){return r.json();}).then(function(rows){\n      var c={}; (rows||[]).forEach(function(r){ c[r.emoji]=(c[r.emoji]||0)+1; });\n      document.getElementById('nk-trend').innerHTML = Object.entries(c).sort(function(a,b){return b[1]-a[1];}).slice(0,8).map(function(p){ return '<div class=\"text-center\">'+p[0]+'<div class=\"small\">'+p[1]+'</div></div>'; }).join('') || '<span style=\"color:var(--nk-text-muted);\">No reactions yet.</span>';\n    });\n})();" },
  { module: "share-app", page: "share", script: 0, unsafe: true, why: "share counts",
    old: "(function(){\n  var u = encodeURIComponent('{{config.appUrl}}');\n  var t = encodeURIComponent('{{config.shareText}} {{config.appName}}');\n  var hrefs = {\n    twitter: 'https://twitter.com/intent/tweet?text=' + t + '%20' + u,\n    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + u,\n    whatsapp: 'https://wa.me/?text=' + t + '%20' + u,\n    linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u,\n    email: 'mailto:?subject=' + t + '&body=' + t + '%0A%0A' + u,\n  };\n  document.querySelectorAll('[data-nk-share]').forEach(function(a){\n    var d = a.getAttribute('data-nk-share'); a.href = hrefs[d] || '#';\n    a.addEventListener('click', function(){ fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['log']||'log'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({destination:d}) }); });\n  });\n  document.getElementById('nk-copy').addEventListener('click', function(){ var inp = document.getElementById('nk-share-url'); inp.select(); document.execCommand('copy'); this.textContent='Copied!'; fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['log']||'log'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({destination:'copy'})}); });\n  document.getElementById('nk-native').addEventListener('click', function(){\n    if(navigator.share){ navigator.share({title:'{{config.appName}}', text:'{{config.shareText}}', url:'{{config.appUrl}}'}).then(function(){ fetch('/api/run/log',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({destination:'native'})}); }); }\n    else { alert('Native share not supported on this device.'); }\n  });\n  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['stats']||'stats'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n    .then(function(r){return r.json();}).then(function(rows){\n      var c={}; (rows||[]).forEach(function(r){ c[r.destination]=(c[r.destination]||0)+1; });\n      var html = Object.entries(c).map(function(p){ return '<div class=\"d-flex justify-content-between border-bottom py-1\"><span>'+p[0]+'</span><span class=\"fw-bold\">'+p[1]+'</span></div>'; }).join('');\n      document.getElementById('nk-share-stats').innerHTML = html || 'No shares yet — be the first.';\n    });\n})();" },
  { module: "nutrition-tracker", page: "nutrition", script: 0, unsafe: true, why: "logged food names",
    old: "(function(){\n  var today = new Date().toISOString().slice(0,10);\n  function refresh(){\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['history']||'history'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n      .then(function(r){return r.json();}).then(function(rows){\n        var todayRows = (rows||[]).filter(function(r){ return r.logged_for_day === today; });\n        var k=0,p=0; todayRows.forEach(function(r){ k+=r.kcal||0; p+=r.protein_g||0; });\n        document.getElementById('nk-nu-k').textContent = k;\n        document.getElementById('nk-nu-p').textContent = Math.round(p);\n        document.getElementById('nk-nu-today').innerHTML = todayRows.length ? todayRows.map(function(r){\n          return '<div class=\"d-flex justify-content-between p-2 border rounded mb-1\" style=\"background:var(--nk-surface);\"><span>'+r.food+'</span><span class=\"small\">'+r.kcal+' kcal · '+r.protein_g+'g protein</span></div>';\n        }).join('') : '<div class=\"small\" style=\"color:var(--nk-text-muted);\">Nothing logged today yet.</div>';\n      });\n  }\n  document.addEventListener('click', function(e){\n    var b = e.target.closest('.nk-log-btn'); if(!b) return;\n    var row = b.closest('[data-nk-item]'); if(!row) return;\n    var data = { food: row.querySelector('[data-nk-field=\"name\"]').textContent.trim(), kcal: parseInt(row.querySelector('[data-nk-field=\"kcal\"]').textContent,10)||0, protein_g: parseFloat(row.querySelector('[data-nk-field=\"protein_g\"]').textContent)||0, carbs_g: 0, fat_g: 0, logged_for_day: today };\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['log']||'log'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(data) }).then(refresh);\n  });\n  refresh(); setInterval(refresh, 15000);\n})();" },
  { module: "drip-content", page: "lessons", script: 0, unsafe: true, why: "lesson titles and text",
    old: "(function(){\n  var email = new URLSearchParams(location.search).get('email') || '';\n  if(!email){ document.getElementById('nk-lessons').innerHTML = '<div class=\"alert alert-info\">Pass <code>?email=…</code> in the URL to view available lessons.</div>'; return; }\n  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['available']||'available'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({user_email:email}) })\n    .then(function(r){return r.json();}).then(function(d){\n      document.getElementById('nk-day').textContent = d.days || 0;\n      var html = (d.lessons||[]).map(function(l, i){\n        return '<div class=\"card border-0 shadow-sm mb-3\"><div class=\"card-body\"><div class=\"small text-uppercase fw-bold\" style=\"color:var(--nk-text-muted);\">Day '+l.day_offset+'</div><h4 class=\"fw-bold\">'+l.title+'</h4><p>'+l.body+'</p></div></div>';\n      }).join('') || '<div class=\"alert alert-light\">No lessons unlocked yet — check back tomorrow.</div>';\n      document.getElementById('nk-lessons').innerHTML = html;\n    });\n})();" },
  { module: "geofencer", page: "near-me", script: 0, unsafe: true, why: "offer text and links",
    old: "(function(){\n  function dist(a,b,c,d){ var R=6371000,toR=function(x){return x*Math.PI/180;}; var dLat=toR(c-a),dLng=toR(d-b); var x = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)*Math.sin(dLng/2); return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x)); }\n  document.getElementById('nk-gf-go').addEventListener('click', function(){\n    if(!navigator.geolocation){ alert('Geolocation not supported'); return; }\n    navigator.geolocation.getCurrentPosition(function(p){\n      var lat = p.coords.latitude, lng = p.coords.longitude;\n      fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['fences']||'fences'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n        .then(function(r){return r.json();}).then(function(fences){\n          var hits = (fences||[]).filter(function(f){ return dist(lat,lng,f.lat,f.lng) <= (f.radius_m || 100); });\n          var html = hits.length ? hits.map(function(f){\n            fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['checkin']||'checkin'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({fence_id:f.id, lat:lat, lng:lng}) });\n            return '<div class=\"card border-0 shadow-sm mb-3 p-4\"><h4 class=\"fw-bold\">'+f.label+'</h4><p class=\"lead\">'+f.message+'</p>'+(f.cta_url?'<a class=\"btn btn-primary\" href=\"'+f.cta_url+'\">Open</a>':'')+'</div>';\n          }).join('') : '<div class=\"alert alert-light\">No nearby offers — keep moving around.</div>';\n          document.getElementById('nk-gf-result').innerHTML = html;\n        });\n    }, function(){ alert('Could not get your location.'); });\n  });\n})();" },
  { module: "status-page", page: "status", script: 0, unsafe: true, why: "service and incident text",
    old: "(function(){\n  function dot(s){\n    var c = s === 'operational' ? '#10b981' : s === 'degraded' ? '#f59e0b' : s === 'partial-outage' ? '#f97316' : '#ef4444';\n    return '<span style=\"display:inline-block;width:10px;height:10px;border-radius:50%;background:'+c+';\"></span>';\n  }\n  function poll(){\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['summary']||'summary'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n      .then(function(r){return r.json();}).then(function(d){\n        var anyDown = (d.services||[]).some(function(s){ return s.status !== 'operational'; }) || (d.active||[]).length > 0;\n        var box = document.getElementById('nk-overall');\n        if(anyDown){ box.style.background = '#ef4444'; box.querySelector('.fw-bold').textContent = ' Some services are affected'; }\n        else { box.style.background = '#10b981'; box.querySelector('.fw-bold').textContent = ' All systems operational'; }\n        document.getElementById('nk-svc-host').innerHTML = (d.services||[]).map(function(s){\n          return '<div class=\"d-flex justify-content-between align-items-center p-3 border rounded mb-2\" style=\"background:var(--nk-surface);\"><div><div class=\"fw-bold\">'+s.name+'</div><div class=\"small\" style=\"color:var(--nk-text-muted);\">'+(s.description||'')+'</div></div><div>'+dot(s.status)+' <span class=\"small text-capitalize\">'+(s.status||'').replace('-',' ')+'</span></div></div>';\n        }).join('');\n        document.getElementById('nk-inc-host').innerHTML = (d.recent||[]).map(function(i){\n          return '<div class=\"card border-0 shadow-sm mb-2 p-3\"><div class=\"d-flex justify-content-between\"><div class=\"fw-bold\">'+i.title+'</div><span class=\"badge bg-secondary\">'+i.status+'</span></div><div class=\"small mt-1\" style=\"color:var(--nk-text-muted);\">'+(i.summary||'')+'</div></div>';\n        }).join('') || '<div class=\"small\" style=\"color:var(--nk-text-muted);\">No incidents reported.</div>';\n      });\n  }\n  poll(); setInterval(poll, 20000);\n})();" },
  { module: "store-locator", page: "stores", script: 0, unsafe: true, why: "store details and map pop-ups",
    old: "(function(){\n  var map = L.map('nk-sl-map').setView([47.6,-122.3], 10);\n  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM' }).addTo(map);\n  var layer = L.layerGroup().addTo(map);\n  var userLoc = null;\n  function dist(a,b,c,d){ var R=6371,toR=function(x){return x*Math.PI/180;}; var dLat=toR(c-a),dLng=toR(d-b); var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)*Math.sin(dLng/2); return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }\n  function paint(stores){\n    layer.clearLayers();\n    var sorted = (stores||[]).slice();\n    if(userLoc) sorted.sort(function(a,b){ return dist(userLoc.lat, userLoc.lng, a.lat, a.lng) - dist(userLoc.lat, userLoc.lng, b.lat, b.lng); });\n    document.getElementById('nk-sl-list').innerHTML = sorted.map(function(s){\n      var d = userLoc ? '<div class=\"small fw-bold\" style=\"color:var(--nk-primary);\">'+dist(userLoc.lat,userLoc.lng,s.lat,s.lng).toFixed(1)+' km away</div>' : '';\n      var mapsUrl = 'https://www.google.com/maps/dir/?api=1&destination='+s.lat+','+s.lng;\n      return '<div class=\"card border-0 shadow-sm mb-3\"><div class=\"card-body\"><div class=\"fw-bold fs-5\">'+s.name+'</div>'+d+'<div class=\"small mt-1\"> '+s.address+', '+s.city+'</div><div class=\"small\"> '+s.hours+'</div><div class=\"small\"> '+s.phone+'</div><div class=\"small\"> '+s.services+'</div><div class=\"mt-2\"><a class=\"btn btn-outline-primary btn-sm\" target=\"_blank\" href=\"'+mapsUrl+'\"> Directions</a></div></div></div>';\n    }).join('');\n    sorted.forEach(function(s){ L.marker([s.lat, s.lng]).bindPopup('<b>'+s.name+'</b><br/>'+s.address).addTo(layer); });\n    if(sorted.length){ var b = L.latLngBounds(sorted.map(function(s){return [s.lat, s.lng];})); if(userLoc) b.extend([userLoc.lat, userLoc.lng]); map.fitBounds(b, { padding:[40,40] }); }\n  }\n  function load(){\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['list']||'list'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n      .then(function(r){return r.json();}).then(paint);\n  }\n  document.getElementById('nk-sl-loc').addEventListener('click', function(){\n    if(!navigator.geolocation){ alert('Geolocation not supported'); return; }\n    navigator.geolocation.getCurrentPosition(function(p){ userLoc = { lat:p.coords.latitude, lng:p.coords.longitude }; L.marker([userLoc.lat, userLoc.lng], { title:'You' }).addTo(layer); load(); });\n  });\n  load();\n})();" },
  { module: "routes", page: "route", script: 0, unsafe: true, why: "stop names, addresses and notes",
    old: "(function(){\n  var id = new URLSearchParams(location.search).get('id') || '';\n  document.getElementById('nk-add-trip').value = id;\n  var map = L.map('nk-rmap').setView([37.7749,-122.4194], 13);\n  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);\n  var layer = L.layerGroup().addTo(map);\n  function poll(){\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['stops']||'stops'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({trip_id:id}) })\n      .then(function(r){return r.json();}).then(function(stops){\n        layer.clearLayers();\n        var coords = [];\n        (stops||[]).forEach(function(s, i){\n          if(!s.lat || !s.lng) return;\n          L.marker([s.lat, s.lng]).bindPopup('<b>'+(i+1)+'. '+s.label+'</b><br/>'+(s.address||'')).addTo(layer);\n          coords.push([s.lat, s.lng]);\n        });\n        if(coords.length > 1) L.polyline(coords, { color:'#0ea5e9', weight:4 }).addTo(layer);\n        if(coords.length) map.fitBounds(coords, { padding:[40,40] });\n        document.getElementById('nk-stops').innerHTML = (stops||[]).map(function(s){\n          return '<li class=\"mb-2\"><strong>'+s.label+'</strong>'+(s.address?' — <span style=\"color:var(--nk-text-muted);\">'+s.address+'</span>':'')+(s.notes?'<div class=\"small\">'+s.notes+'</div>':'')+'</li>';\n        }).join('');\n      });\n  }\n  poll(); setInterval(poll, 8000);\n})();" },
  { module: "media-playlist", page: "playlist", script: 0, unsafe: true, why: "titles, artists and pictures",
    old: "(function(){\n  var items = []; var idx = 0;\n  function play(i){\n    if(i < 0 || i >= items.length) return;\n    idx = i;\n    var it = items[i];\n    var a = document.getElementById('nk-pl-audio'); var v = document.getElementById('nk-pl-video');\n    a.style.display='none'; v.style.display='none'; a.pause(); v.pause();\n    if(it.kind === 'video'){ v.src = it.url; v.style.display='block'; v.play(); }\n    else { a.src = it.url; a.style.display='block'; a.play(); }\n    document.getElementById('nk-pl-title').textContent = it.title || '';\n    document.getElementById('nk-pl-artist').textContent = it.artist || '';\n    Array.from(document.querySelectorAll('[data-pl-idx]')).forEach(function(el){ el.classList.toggle('border-primary', parseInt(el.getAttribute('data-pl-idx'),10) === i); });\n  }\n  function next(){ play((idx + 1) % items.length); }\n  function prev(){ play((idx - 1 + items.length) % items.length); }\n  document.getElementById('nk-pl-next').addEventListener('click', next);\n  document.getElementById('nk-pl-prev').addEventListener('click', prev);\n  document.getElementById('nk-pl-audio').addEventListener('ended', next);\n  document.getElementById('nk-pl-video').addEventListener('ended', next);\n  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['items']||'items'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n    .then(function(r){return r.json();}).then(function(rows){\n      items = rows || [];\n      document.getElementById('nk-pl-queue').innerHTML = items.map(function(it, i){\n        var icon = it.kind === 'video' ? '' : '';\n        return '<div data-pl-idx=\"'+i+'\" class=\"d-flex gap-2 align-items-center p-2 border rounded mb-2\" style=\"cursor:pointer;background:var(--nk-surface);\"><img style=\"width:48px;height:48px;object-fit:cover;border-radius:6px;\" src=\"'+(it.thumb_url||'https://picsum.photos/seed/x/100')+'\"/><div class=\"flex-grow-1\"><div class=\"fw-bold small\">'+icon+' '+(it.title||'')+'</div><div class=\"small\" style=\"color:var(--nk-text-muted);\">'+(it.artist||'')+'</div></div></div>';\n      }).join('');\n      document.querySelectorAll('[data-pl-idx]').forEach(function(el){ el.addEventListener('click', function(){ play(parseInt(el.getAttribute('data-pl-idx'),10)); }); });\n      if(items.length) play(0);\n    });\n})();" },
  { module: "delivery-tracking", page: "track", script: 0, unsafe: true, why: "delivery updates",
    old: "(function(){\n  var id = new URLSearchParams(location.search).get('id') || '';\n  var map = L.map('nk-tmap').setView([37.7749,-122.4194], 12);\n  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM' }).addTo(map);\n  var marker = L.marker([37.7749,-122.4194]).addTo(map);\n  function poll(){\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['get']||'get'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id:id}) })\n      .then(function(r){return r.json();}).then(function(d){\n        if(!d.delivery) return;\n        document.getElementById('nk-status').textContent = (d.delivery.status||'').toUpperCase();\n        document.getElementById('nk-driver').textContent = d.delivery.driver_name || '—';\n        if(d.delivery.last_lat && d.delivery.last_lng){ var ll = [d.delivery.last_lat, d.delivery.last_lng]; marker.setLatLng(ll); map.setView(ll, 14); }\n        document.getElementById('nk-events').innerHTML = (d.events||[]).map(function(e){ return '<li>'+e.label+'</li>'; }).join('');\n      });\n  }\n  poll(); setInterval(poll, 6000);\n})();" },
  { module: "calculator-builder", page: "calc", script: 0, unsafe: true, why: "calculator labels and formulas",
    old: "(function(){\n  var slug = new URLSearchParams(location.search).get('slug') || '';\n  var def = null;\n  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['by-slug']||'by-slug'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({slug:slug}) })\n    .then(function(r){return r.json();}).then(function(c){\n      if(!c){ document.getElementById('nk-calc-name').textContent = 'Not found.'; return; }\n      def = c;\n      document.getElementById('nk-calc-name').textContent = c.name;\n      document.getElementById('nk-calc-rlabel').textContent = c.result_label || 'Result';\n      var inputs = []; try { inputs = JSON.parse(c.inputs_json || '[]'); } catch(e){}\n      document.getElementById('nk-calc-inputs').innerHTML = inputs.map(function(f){\n        return '<div class=\"mb-2\"><label class=\"form-label\">'+f.label+'</label><input type=\"number\" step=\"any\" name=\"'+f.key+'\" value=\"'+(f.default!=null?f.default:'')+'\" class=\"form-control\" required/></div>';\n      }).join('');\n      document.getElementById('nk-calc-form').addEventListener('submit', function(e){\n        e.preventDefault();\n        var vals = {}; inputs.forEach(function(f){ var el = e.target.querySelector('[name=\"'+f.key+'\"]'); vals[f.key] = parseFloat(el.value); });\n        try {\n          var keys = Object.keys(vals); var args = keys.map(function(k){return vals[k];});\n          var fn = new Function(keys.join(','), 'return ' + c.formula);\n          var r = fn.apply(null, args);\n          document.getElementById('nk-calc-result').style.display = 'block';\n          document.getElementById('nk-calc-rval').textContent = r;\n        } catch(err){ alert('Formula error: ' + err.message); }\n      });\n    });\n})();" },
  { module: "whatsapp-order", page: "order", script: 0, unsafe: true, why: "item names in the order",
    old: "(function(){\n  var cart = {};\n  function refresh(){\n    var ul = document.getElementById('nk-cart'); var total = 0;\n    var keys = Object.keys(cart);\n    ul.innerHTML = keys.length ? keys.map(function(k){\n      var it = cart[k]; total += it.qty * it.price;\n      return '<li class=\"d-flex justify-content-between py-1\"><span>'+it.qty+'× '+it.name+'</span><span>$'+(it.qty*it.price).toFixed(2)+'</span></li>';\n    }).join('') : '<li style=\"color:var(--nk-text-muted);\">Nothing in your cart yet.</li>';\n    document.getElementById('nk-total').textContent = total.toFixed(2);\n  }\n  document.addEventListener('click', function(e){\n    var b = e.target.closest('.nk-add'); if(!b) return;\n    var card = b.closest('[data-nk-item]'); if(!card) return;\n    var id = card.getAttribute('data-nk-row-id') || ('x' + Math.random());\n    var name = card.querySelector('[data-nk-field=\"name\"]').textContent.trim();\n    var price = parseFloat(card.querySelector('[data-nk-field=\"price\"]').textContent.trim()) || 0;\n    cart[id] = cart[id] || { name:name, price:price, qty:0 };\n    cart[id].qty += 1;\n    refresh();\n  });\n  document.getElementById('nk-send').addEventListener('click', function(){\n    var keys = Object.keys(cart); if(!keys.length){ alert('Add items first'); return; }\n    var total = 0; var lines = keys.map(function(k){ var it = cart[k]; total += it.qty * it.price; return '• '+it.qty+'× '+it.name+' — $'+(it.qty*it.price).toFixed(2); });\n    var name = document.getElementById('nk-name').value || 'Customer';\n    var phone = document.getElementById('nk-phone').value || '';\n    var msg = 'Hi! New order from '+name+'%0A%0A' + encodeURIComponent(lines.join('\\n')) + '%0A%0ATotal: $'+total.toFixed(2)+'%0APhone: '+encodeURIComponent(phone);\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['place-order']||'place-order'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ customer_name:name, phone:phone, items_json: JSON.stringify(cart), total: total }) }).finally(function(){\n      location.href = 'https://wa.me/{{config.whatsappNumber}}?text=' + msg;\n    });\n  });\n})();" },
  { module: "delivery-zones", page: "delivery-quote", script: 0, unsafe: true, why: "zone names and quote messages",
    old: "(function(){\n  document.getElementById('nk-dz-geo').addEventListener('click', function(){\n    if(!navigator.geolocation) return;\n    navigator.geolocation.getCurrentPosition(function(p){ document.getElementById('nk-dz-lat').value = p.coords.latitude.toFixed(6); document.getElementById('nk-dz-lng').value = p.coords.longitude.toFixed(6); });\n  });\n  document.getElementById('nk-dz-go').addEventListener('click', function(){\n    var body = { address: document.getElementById('nk-dz-addr').value, lat: parseFloat(document.getElementById('nk-dz-lat').value), lng: parseFloat(document.getElementById('nk-dz-lng').value), order_total: parseFloat(document.getElementById('nk-dz-total').value) };\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['quote']||'quote'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) })\n      .then(function(r){return r.json().then(function(d){ return {ok:r.ok, d:d}; });})\n      .then(function(r){\n        var el = document.getElementById('nk-dz-result');\n        if(r.ok){ el.innerHTML = '<div class=\"alert alert-success\"><div class=\"fw-bold fs-5\"> We deliver to you!</div><div class=\"small\">'+r.d.zone+' · $'+r.d.fee+' delivery · ETA '+r.d.eta_minutes+' min</div></div>'; }\n        else { el.innerHTML = '<div class=\"alert alert-warning\">'+(r.d.error || 'No quote')+'</div>'; }\n      });\n  });\n})();" },
  { module: "in-app-ads", page: "ads", script: 0, unsafe: true, why: "ad text, pictures and links",
    old: "(function(){\n  function serve(slot){\n    var pl = slot.getAttribute('data-placement') || 'header';\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['serve']||'serve'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({placement:pl}) })\n      .then(function(r){return r.json();}).then(function(ad){\n        if(!ad || !ad.id){ slot.style.display='none'; return; }\n        slot.innerHTML = '<a class=\"d-block position-relative text-decoration-none\" data-ad-id=\"'+ad.id+'\" href=\"'+(ad.click_url||'#')+'\" target=\"_blank\" style=\"border-radius:8px;overflow:hidden;\"><img style=\"width:100%;height:auto;display:block;\" src=\"'+(ad.image_url||'')+'\" alt=\"\"/><div class=\"position-absolute bottom-0 start-0 end-0 p-2 text-white\" style=\"background:linear-gradient(transparent, rgba(0,0,0,.6));\"><strong>'+(ad.headline||'')+'</strong></div></a>';\n        slot.querySelector('a').addEventListener('click', function(){\n          fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['click']||'click'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ad_id:ad.id}) });\n        });\n      });\n  }\n  document.querySelectorAll('[data-nk-ad-slot]').forEach(serve);\n  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['stats']||'stats'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n    .then(function(r){return r.json();}).then(function(d){\n      var imps = {}; (d.impressions||[]).forEach(function(i){ imps[i.ad_id] = (imps[i.ad_id]||0)+1; });\n      var clk = {}; (d.clicks||[]).forEach(function(c){ clk[c.ad_id] = (clk[c.ad_id]||0)+1; });\n      var html = '<table class=\"table align-middle\"><thead><tr><th>Ad</th><th>Imp</th><th>Clk</th><th>CTR</th></tr></thead><tbody>' +\n        (d.ads||[]).map(function(a){\n          var i = imps[a.id] || 0, c = clk[a.id] || 0;\n          var ctr = i ? ((c/i*100).toFixed(1)+'%') : '—';\n          return '<tr><td>'+a.headline+'</td><td>'+i+'</td><td>'+c+'</td><td><strong>'+ctr+'</strong></td></tr>';\n        }).join('') + '</tbody></table>';\n      document.getElementById('nk-ads-stats').innerHTML = html;\n    });\n})();" },
  { module: "dynamic-list", page: "list", script: 0, unsafe: true, why: "list fields and entries",
    old: "(function(){\n  var slug = new URLSearchParams(location.search).get('slug') || '';\n  var listId = null; var schema = [];\n  function field(f){\n    var ctrl = f.type === 'textarea' ? '<textarea name=\"'+f.key+'\" class=\"form-control\" '+(f.required?'required':'')+'></textarea>' :\n      '<input name=\"'+f.key+'\" type=\"'+(f.type||'text')+'\" class=\"form-control\" '+(f.required?'required':'')+'/>';\n    return '<div class=\"mb-2\"><label class=\"form-label small mb-1\">'+f.label+'</label>'+ctrl+'</div>';\n  }\n  function paintRows(rows){\n    document.getElementById('nk-rows').innerHTML = (rows||[]).map(function(r){\n      var d = {}; try { d = JSON.parse(r.data_json || '{}'); } catch(e){}\n      var body = schema.map(function(f){\n        var v = d[f.key]; if(v == null || v === '') return '';\n        if(f.type === 'url' && /^https?:/.test(v)) return '<div class=\"small\"><strong>'+f.label+':</strong> <a href=\"'+v+'\" target=\"_blank\">'+v+'</a></div>';\n        return '<div class=\"small\"><strong>'+f.label+':</strong> '+String(v).replace(/[<>&]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];})+'</div>';\n      }).join('');\n      return '<div class=\"card border-0 shadow-sm mb-2 p-3\">'+body+'</div>';\n    }).join('') || '<div class=\"alert alert-light\">No entries yet.</div>';\n  }\n  function load(){\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['by-slug']||'by-slug'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({slug:slug}) })\n      .then(function(r){return r.json();}).then(function(d){\n        if(!d.list) return;\n        listId = d.list.id;\n        document.getElementById('nk-list-name').textContent = d.list.name;\n        document.getElementById('nk-list-desc').textContent = d.list.description || '';\n        try { schema = JSON.parse(d.list.schema_json || '[]'); } catch(e){ schema = []; }\n        document.getElementById('nk-form-host').innerHTML = schema.map(field).join('');\n        paintRows(d.rows);\n      });\n  }\n  document.getElementById('nk-add-form').addEventListener('submit', function(e){\n    e.preventDefault();\n    var data = {}; schema.forEach(function(f){ var el = e.target.querySelector('[name=\"'+f.key+'\"]'); if(el) data[f.key] = el.value; });\n    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['add-row']||'add-row'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({list_id:listId, data_json: JSON.stringify(data)}) })\n      .then(function(){ e.target.reset(); load(); });\n  });\n  load(); setInterval(load, 10000);\n})();" },
  { module: "channel-feed", page: "watch", script: 0, unsafe: true, why: "the video id in the link",
    old: "(function(){\n  var vid = new URLSearchParams(location.search).get('id') || '';\n  if(!vid) return;\n  var kind = '{{config.channelKind}}';\n  var embed = kind === 'youtube' ? 'https://www.youtube.com/embed/' + vid : 'https://player.vimeo.com/video/' + vid;\n  document.getElementById('nk-cf-player').innerHTML = '<iframe style=\"width:100%;height:100%;border:0;\" src=\"'+embed+'\" allow=\"autoplay; encrypted-media; picture-in-picture\" allowfullscreen></iframe>';\n  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['list']||'list'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })\n    .then(function(r){return r.json();}).then(function(rows){\n      var m = (rows||[]).find(function(r){ return r.video_id === vid; });\n      if(m) document.getElementById('nk-cf-title').textContent = m.title;\n    });\n})();" },
  { module: "event-tickets", page: "ticket", script: 0, unsafe: false, why: "QR code library",
    old: "(function(){\n  var code = new URLSearchParams(location.search).get('code') || '';\n  setTimeout(function(){\n    var el = document.getElementById('nk-qr'); if(!el || !window.QRCode) return;\n    QRCode.toCanvas(code, { width: 220 }, function(err, c){ if(!err && c){ el.innerHTML=''; el.appendChild(c); } });\n  }, 400);\n})();" },
  { module: "business-card-wallet", page: "card", script: 0, unsafe: false, why: "QR code library",
    old: "(function(){\n  var id = new URLSearchParams(location.search).get('id') || '';\n  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['get']||'get'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id:id}) })\n    .then(function(r){return r.json();}).then(function(c){\n      if(!c) return;\n      var vcf = ['BEGIN:VCARD','VERSION:3.0','FN:'+(c.name||''),'TITLE:'+(c.title||''),'ORG:'+(c.company||''),'EMAIL:'+(c.email||''),'TEL:'+(c.phone||''),'URL:'+(c.website||''),'END:VCARD'].join('\\n');\n      var blob = new Blob([vcf], {type:'text/vcard'});\n      document.getElementById('nk-vcard-dl').href = URL.createObjectURL(blob);\n      document.getElementById('nk-vcard-dl').setAttribute('download', (c.name||'card').replace(/\\s+/g,'_') + '.vcf');\n      if(window.QRCode){\n        QRCode.toCanvas(location.origin + '/card?id=' + id, { width: 180 }, function(err, cnv){ if(!err) document.getElementById('nk-vcard-qr').appendChild(cnv); });\n      }\n    });\n})();" },
];

/** Pages whose QR-code library (jsDelivr qrcode@1.5.3) no longer loads. */
const QR_PAGES = new Set(["event-tickets/ticket", "business-card-wallet/card"]);
const OLD_QR_TAG = '<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>';
export const NEW_QR_TAG =
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js" integrity="sha512-ZDSPMa/JM1D+7kdg2x3BsruQ6T/JpJo3jWDWkCZsP+5yVyp1KfESqLI+7RqB5k24F7p2cV7i2YHh/890y6P6Sw==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>';

const INLINE_SCRIPT_RE = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;

/** The bodies of a page's inline <script> blocks, in order. */
export function inlineScripts(html: string): string[] {
  return [...html.matchAll(INLINE_SCRIPT_RE)].map((m) => m[1] ?? "");
}

const PLACEHOLDER_RE = /\{\{\s*([^}]+?)\s*\}\}/g;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A script template (with {{config.x}} holes) as a regex capturing the holes. */
function templateRegex(tpl: string): { re: RegExp; keys: string[] } {
  const keys: string[] = [];
  let src = "";
  let last = 0;
  for (const m of tpl.matchAll(PLACEHOLDER_RE)) {
    src += escapeRe(tpl.slice(last, m.index));
    const at = keys.indexOf(m[1]!);
    if (at >= 0) src += `\\k<p${at}>`;
    else {
      keys.push(m[1]!);
      src += `(?<p${keys.length - 1}>[\\s\\S]*?)`;
    }
    last = m.index! + m[0].length;
  }
  src += escapeRe(tpl.slice(last));
  return { re: new RegExp(src, "g"), keys };
}

export type Fix = {
  id: string;
  module: string;
  page: string;
  why: string;
  unsafe: boolean;
  /** Pattern of the old text in page HTML; replace(match) gives the fixed text. */
  re: RegExp;
  replace: (match: string[], groups: Record<string, string>) => string;
  /**
   * The same change in the editor's saved copy of the page, where a script's
   * text and its <script src> are separate pieces: the old script text, and
   * an old → new string swap (the QR-code library address).
   */
  partRe: RegExp;
  partReplace: (match: string[], groups: Record<string, string>) => string;
  swap?: [string, string];
  /** The fixed text as it appears in a fresh install (placeholders kept). */
  fixedTemplate: string;
};

type ModuleDef = { id: string; pages: Array<{ slug: string; html: string }> };

/** Pairs each frozen script with the fixed one in the current definitions. */
export function buildFixes(registry: ModuleDef[]): Fix[] {
  const fixes: Fix[] = [];
  const problems: string[] = [];
  for (const f of FROZEN_SCRIPTS) {
    const page = registry.find((m) => m.id === f.module)?.pages.find((p) => p.slug === f.page);
    const fixed = page ? inlineScripts(page.html)[f.script] : undefined;
    if (!page || fixed === undefined) {
      problems.push(`${f.module}/${f.page}: script ${f.script} is missing from the module definition`);
      continue;
    }
    if (fixed === f.old) {
      problems.push(`${f.module}/${f.page}: the definition still has the old script`);
      continue;
    }
    const { re, keys } = templateRegex(f.old);
    const newKeys = [...fixed.matchAll(PLACEHOLDER_RE)].map((m) => m[1]!);
    const unknown = newKeys.filter((k) => !keys.includes(k));
    if (unknown.length) problems.push(`${f.module}/${f.page}: the fixed script needs ${unknown.join(", ")}, which the old one didn't have`);
    const qr = QR_PAGES.has(`${f.module}/${f.page}`);
    if (qr && !page.html.includes(NEW_QR_TAG)) problems.push(`${f.module}/${f.page}: the definition doesn't load the new QR-code library`);
    // The QR pages change a library tag and the script that uses it together.
    const body = (groups: Record<string, string>) =>
      fixed.replace(PLACEHOLDER_RE, (_m, key: string) => groups[`p${keys.indexOf(key)}`] ?? "");
    fixes.push({
      id: `${f.module}/${f.page}#${f.script}`,
      module: f.module,
      page: f.page,
      why: f.why,
      unsafe: f.unsafe,
      re: qr ? new RegExp(`${escapeRe(OLD_QR_TAG)}(\\s*<script\\b[^>]*>)${re.source}(</script>)`, "g") : re,
      replace: (m, groups) => (qr ? `${NEW_QR_TAG}${m[1]}${body(groups)}${m[m.length - 1]}` : body(groups)),
      partRe: re,
      partReplace: (_m, groups) => body(groups),
      swap: qr ? [srcOf(OLD_QR_TAG), srcOf(NEW_QR_TAG)] : undefined,
      fixedTemplate: fixed,
    });
  }
  if (problems.length) {
    throw new Error(`The module definitions and this upgrade are out of step:\n  ${problems.join("\n  ")}`);
  }
  return fixes;
}

function srcOf(tag: string): string {
  return /\bsrc="([^"]+)"/.exec(tag)![1]!;
}

/** Replaces every match of `re` in `text`; null when nothing matched. */
function replaceAll(text: string, re: RegExp, fill: (match: string[], groups: Record<string, string>) => string): string | null {
  re.lastIndex = 0;
  if (!re.test(text)) return null;
  re.lastIndex = 0;
  return text.replace(re, (...args: unknown[]) => {
    // (match, …groups, offset, whole text[, named groups])
    const named = typeof args[args.length - 1] === "object" ? (args[args.length - 1] as Record<string, string> | undefined) : undefined;
    const match = args.slice(0, args.length - (typeof args[args.length - 1] === "object" ? 3 : 2)) as string[];
    return fill(match, named ?? {});
  });
}

/** Applies every fix to a page's HTML; returns the new HTML and which fixes hit. */
export function patchText(text: string, fixes: Fix[]): { text: string; hits: string[] } {
  const hits: string[] = [];
  let out = text;
  for (const fix of fixes) {
    const next = replaceAll(out, fix.re, fix.replace);
    if (next === null) continue;
    out = next;
    hits.push(fix.id);
  }
  return { text: out, hits };
}

/** Makes the same changes in the editor's saved copy of the page. */
function patchDeep(value: unknown, fixes: Fix[]): unknown {
  if (typeof value === "string") {
    let out = value;
    for (const fix of fixes) {
      out = replaceAll(out, fix.partRe, fix.partReplace) ?? out;
      if (fix.swap && out === fix.swap[0]) out = fix.swap[1];
    }
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => patchDeep(v, fixes));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, patchDeep(v, fixes)]));
  }
  return value;
}

type PageLike = { slug: string; html: string; components?: unknown };

/** The fixes a page gets, and whether it's a page of one of these modules that doesn't match. */
function examine(page: PageLike, fixes: Fix[]) {
  const html = patchText(page.html ?? "", fixes);
  const hits = new Set(html.hits);
  // The editor's copy changes only along with the HTML, so the two agree.
  const hit = fixes.filter((f) => hits.has(f.id));
  const components = page.components == null || hit.length === 0 ? page.components : patchDeep(page.components, hit);
  // Pages installed from these modules ("<module>-<page>", "-2" for a
  // second install) that have neither the old nor the fixed script.
  const unmatched = fixes.filter((fix) => {
    if (hits.has(fix.id)) return false;
    if (!new RegExp(`^${escapeRe(`${fix.module}-${fix.page}`)}(-\\d+)?$`).test(page.slug)) return false;
    const fixedStart = fix.fixedTemplate.split(PLACEHOLDER_RE)[0]!.slice(0, 200);
    return !(page.html ?? "").includes(fixedStart);
  });
  return { hits: [...hits], html: html.text, components, unmatched };
}

export type UpgradeReport = {
  draft: Array<{ projectId: string; pageId: string; slug: string; fixes: string[] }>;
  published: Array<{ projectId: string; version: number; live: boolean; pages: Array<{ slug: string; fixes: string[] }> }>;
  review: Array<{ projectId: string; slug: string; where: string; module: string }>;
  assistant: Array<{ projectId: string; slug: string }>;
};

export async function runUpgrade(db: PrismaClient, opts: { apply: boolean; registry: ModuleDef[]; log?: (line: string) => void }): Promise<UpgradeReport> {
  const log = opts.log ?? ((line: string) => console.log(line));
  const fixes = buildFixes(opts.registry);
  const report: UpgradeReport = { draft: [], published: [], review: [], assistant: [] };
  const { contentHash } = await import("../src/lib/deployments");

  // Draft pages.
  let cursor: string | undefined;
  for (;;) {
    const pages = await db.page.findMany({
      select: { id: true, projectId: true, slug: true, html: true, components: true },
      orderBy: { id: "asc" },
      take: 200,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (pages.length === 0) break;
    cursor = pages[pages.length - 1]!.id;
    for (const page of pages) {
      const r = examine(page, fixes);
      for (const fix of r.unmatched) report.review.push({ projectId: page.projectId, slug: page.slug, where: "draft", module: fix.module });
      if (r.hits.length === 0) continue;
      report.draft.push({ projectId: page.projectId, pageId: page.id, slug: page.slug, fixes: r.hits });
      if (opts.apply) {
        await db.page.update({
          where: { id: page.id },
          data: { html: r.html, ...(page.components != null ? { components: r.components as object } : {}) },
        });
      }
    }
  }

  // Published versions (all of them, so rolling back can't bring a fixed
  // script back).
  const live = new Set(
    (await db.project.findMany({ where: { liveDeploymentId: { not: null } }, select: { liveDeploymentId: true } })).map((p) => p.liveDeploymentId!),
  );
  let depCursor: string | undefined;
  for (;;) {
    const deps = await db.deployment.findMany({
      select: { id: true, projectId: true, version: true, snapshot: true },
      orderBy: { id: "asc" },
      take: 20,
      ...(depCursor ? { skip: 1, cursor: { id: depCursor } } : {}),
    });
    if (deps.length === 0) break;
    depCursor = deps[deps.length - 1]!.id;
    for (const dep of deps) {
      const snap = dep.snapshot as { pages?: PageLike[]; flows?: unknown[]; theme?: unknown; hash?: string } | null;
      if (!snap || !Array.isArray(snap.pages)) continue;
      const changed: Array<{ slug: string; fixes: string[] }> = [];
      for (const page of snap.pages) {
        const r = examine(page, fixes);
        if (live.has(dep.id)) for (const fix of r.unmatched) report.review.push({ projectId: dep.projectId, slug: page.slug, where: `published v${dep.version}`, module: fix.module });
        if (r.hits.length === 0) continue;
        page.html = r.html;
        if (page.components != null) page.components = r.components;
        changed.push({ slug: page.slug, fixes: r.hits });
      }
      if (changed.length === 0) continue;
      report.published.push({ projectId: dep.projectId, version: dep.version, live: live.has(dep.id), pages: changed });
      if (opts.apply) {
        // Keep "unpublished changes" accurate: the fingerprint covers page HTML.
        if (snap.hash) {
          snap.hash = contentHash({
            pages: snap.pages as Parameters<typeof contentHash>[0]["pages"],
            flows: (snap.flows ?? []) as Parameters<typeof contentHash>[0]["flows"],
            theme: snap.theme,
          });
        }
        await db.deployment.update({ where: { id: dep.id }, data: { snapshot: snap as object } });
      }
    }
  }

  // AI Assistant: visitors' questions shown on the public page.
  const installs = await db.projectModule.findMany({ where: { moduleId: "ai-assistant" }, select: { projectId: true } });
  for (const projectId of [...new Set(installs.map((i) => i.projectId))]) {
    const flows = await db.flow.findMany({ where: { projectId, slug: { startsWith: "ai-assistant-history" } }, select: { id: true } });
    if (flows.length === 0) continue;
    const pages = await db.page.findMany({ where: { projectId, slug: { startsWith: "ai-assistant-" } }, select: { slug: true, html: true } });
    for (const page of pages) {
      const locked = /<!--\s*nk:require-role:/.test(page.html);
      if (!locked && flows.some((f) => page.html.includes(f.id))) report.assistant.push({ projectId, slug: page.slug });
    }
  }

  const apps = (rows: Array<{ projectId: string }>) => new Set(rows.map((r) => r.projectId)).size;
  const mode = opts.apply ? "" : " (report only; add --apply to change them)";
  log(`${report.draft.length} draft page(s) to fix in ${apps(report.draft)} app(s)${mode}`);
  for (const p of report.draft) log(`  ${p.projectId}  /${p.slug}  ${p.fixes.map((f) => labelOf(fixes, f)).join("; ")}`);
  const liveCount = report.published.filter((d) => d.live).length;
  log(`${report.published.length} published version(s) ${opts.apply ? "updated" : "to update"} (${liveCount} live)`);
  for (const d of report.published) log(`  ${d.projectId}  v${d.version}${d.live ? " (live)" : ""}  ${d.pages.map((p) => `/${p.slug}`).join(", ")}`);
  log(`${report.review.length} page(s): owner edited, review by hand`);
  for (const r of report.review) log(`  ${r.projectId}  /${r.slug} (${r.where})  ${r.module}: the script differs from the one this upgrade knows; check it escapes visitor data`);
  log(`${report.assistant.length} AI Assistant page(s) show visitors' questions publicly (page move needs owner review)`);
  for (const a of report.assistant) log(`  ${a.projectId}  /${a.slug}  move "Recent questions" to a page only the owner can open`);
  return report;
}

function labelOf(fixes: Fix[], id: string): string {
  const fix = fixes.find((f) => f.id === id);
  return fix ? `${fix.module}: ${fix.unsafe ? "escape " : "fix "}${fix.why}` : id;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { db } = await import("../src/lib/db");
  const { MODULE_REGISTRY } = await import("../src/lib/modules/registry");
  try {
    await runUpgrade(db, { apply, registry: MODULE_REGISTRY });
    if (apply) console.log("Done. Restart the server so published pages stop using cached copies.");
  } finally {
    await db.$disconnect();
  }
}

if (/escape-module-scripts\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
