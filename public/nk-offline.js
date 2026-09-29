/* Offline runtime for exported apps.
 *
 * Loaded (inlined) into every page of an exported offline bundle, BEFORE
 * the standard client runtime. The offline download route strips this
 * header when it inlines the file, and nothing in this file may name the
 * platform: the bundle is white-label. Provides:
 *
 *   - a local database seeded from the export (window.__NK_OFFLINE__.seed),
 *     persisted to localStorage so the app keeps its data between opens
 *   - a browser port of the server flow engine (lib/flow/runtime.ts) —
 *     same node types, same interpolation ({{trigger.x}}, {{vars.x}},
 *     {{now}}, {{uuid}}), same where/orderBy/limit semantics
 *   - a fetch() shim that answers /api/run/<flowId> and /api/nk-session
 *     locally, so the unmodified client runtime works with zero internet
 *
 * Nodes that inherently need a server or the internet degrade honestly:
 * http_request tries a real fetch (works if the machine happens to be
 * online), email resolves as skipped, sheets_* and ai_prompt fail with a
 * clear message.
 */
(function () {
  "use strict";
  var CFG = window.__NK_OFFLINE__;
  if (!CFG) return;

  var DB_KEY = "nk-offline-db:" + CFG.slug;
  var SESSION_KEY = "nk-offline-session:" + CFG.slug;

  /* ---------- local database ---------- */

  function loadDb() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    // First run: seed from the export snapshot.
    var seeded = {};
    for (var t in CFG.seed) seeded[t] = (CFG.seed[t] || []).slice();
    return seeded;
  }
  var db = loadDb();
  function saveDb() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (_) {}
  }
  function tableRows(table) {
    if (!db[table]) db[table] = [];
    return db[table];
  }
  function matches(row, where) {
    for (var k in where) {
      var v = where[k];
      if (v === undefined || v === "") continue;
      if (String(row[k] == null ? "" : row[k]) !== String(v)) return false;
    }
    return true;
  }
  function applyOrder(rows, orderBy) {
    if (!orderBy || !/^[a-zA-Z_][a-zA-Z0-9_]*(\s+(asc|desc))?$/i.test(orderBy)) return rows;
    var parts = orderBy.trim().split(/\s+/);
    var col = parts[0];
    var desc = (parts[1] || "asc").toLowerCase() === "desc";
    return rows.slice().sort(function (a, b) {
      var x = a[col], y = b[col];
      var nx = Number(x), ny = Number(y);
      var c;
      if (!isNaN(nx) && !isNaN(ny) && x !== "" && y !== "") c = nx - ny;
      else c = String(x == null ? "" : x).localeCompare(String(y == null ? "" : y));
      return desc ? -c : c;
    });
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var r = function () { return Math.random().toString(16).slice(2, 10); };
    return r() + r().slice(0, 4) + "-4" + r().slice(0, 3) + "-" + r().slice(0, 4) + "-" + r() + r().slice(0, 4);
  }

  var adapter = {
    list: function (table, opts) {
      opts = opts || {};
      var rows = tableRows(table).filter(function (r) { return matches(r, opts.where || {}); });
      rows = applyOrder(rows, opts.orderBy);
      var limit = Math.max(0, Math.min(1000, opts.limit == null ? 100 : opts.limit));
      return rows.slice(0, limit).map(function (r) { return Object.assign({}, r); });
    },
    insert: function (table, values) {
      var now = new Date().toISOString();
      var row = Object.assign({}, values);
      if (row.id == null) row.id = uuid();
      if (row.created_at == null) row.created_at = now;
      row.updated_at = now;
      tableRows(table).push(row);
      saveDb();
      return Object.assign({}, row);
    },
    update: function (table, where, values) {
      var count = 0;
      var now = new Date().toISOString();
      tableRows(table).forEach(function (r) {
        if (matches(r, where || {})) {
          for (var k in values) r[k] = values[k];
          r.updated_at = now;
          count++;
        }
      });
      if (count) saveDb();
      return count;
    },
    remove: function (table, where) {
      var entries = Object.keys(where || {}).filter(function (k) {
        return where[k] !== undefined && where[k] !== "";
      });
      if (entries.length === 0) throw new Error("Refusing to DELETE without a WHERE clause");
      var before = tableRows(table).length;
      db[table] = tableRows(table).filter(function (r) { return !matches(r, where); });
      var removed = before - db[table].length;
      if (removed) saveDb();
      return removed;
    },
    rawQuery: function (table, opts) {
      var m = /^(COUNT|SUM|AVG|MIN|MAX)\(\s*(\*|[a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/i.exec(opts.aggregate || "COUNT(*)");
      if (!m) throw new Error("Invalid aggregate: " + opts.aggregate);
      var fn = m[1].toUpperCase();
      var col = m[2];
      var rows = tableRows(table).filter(function (r) { return matches(r, opts.where || {}); });
      function aggOf(list) {
        if (fn === "COUNT") return col === "*" ? list.length : list.filter(function (r) { return r[col] != null; }).length;
        var nums = list.map(function (r) { return Number(r[col]); }).filter(function (n) { return !isNaN(n); });
        if (nums.length === 0) return fn === "SUM" ? 0 : null;
        if (fn === "SUM") return nums.reduce(function (a, b) { return a + b; }, 0);
        if (fn === "AVG") return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
        if (fn === "MIN") return Math.min.apply(null, nums);
        return Math.max.apply(null, nums);
      }
      var out;
      if (opts.groupBy && /^[a-zA-Z_][a-zA-Z0-9_]*$/i.test(opts.groupBy)) {
        var groups = {};
        rows.forEach(function (r) {
          var key = String(r[opts.groupBy] == null ? "" : r[opts.groupBy]);
          (groups[key] = groups[key] || []).push(r);
        });
        out = Object.keys(groups).map(function (key) {
          var o = {};
          o[opts.groupBy] = key;
          o.value = aggOf(groups[key]);
          return o;
        });
        out.sort(function (a, b) { return Number(b.value) - Number(a.value); });
      } else {
        out = [{ value: aggOf(rows) }];
      }
      if (opts.orderBy && /^[a-zA-Z_][a-zA-Z0-9_]*(\s+(asc|desc))?$/i.test(opts.orderBy)) {
        out = applyOrder(out, opts.orderBy);
      }
      return out.slice(0, Math.max(0, Math.min(1000, opts.limit == null ? 100 : opts.limit)));
    },
  };

  /* ---------- sessions ---------- */

  function getSessionStore() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (s.expiresAt && Date.now() > s.expiresAt) { localStorage.removeItem(SESSION_KEY); return null; }
      return s;
    } catch (_) { return null; }
  }
  function setSessionStore(userId) {
    var s = { userId: userId, expiresAt: Date.now() + 30 * 24 * 3600 * 1000 };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (_) {}
    return s;
  }
  function clearSessionStore() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }
  function findUserRow(userId) {
    var row = adapter.list("auth_users", { where: { id: userId }, limit: 1 })[0];
    if (!row) row = adapter.list("users", { where: { id: userId }, limit: 1 })[0];
    return row || null;
  }

  /* ---------- password hashing (offline registrations) ---------- */

  function sha256Hex(text) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
    }
    // Non-secure-context fallback (djb2) — weak, but offline bundles are
    // single-user local files; honesty over false security.
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    return Promise.resolve("djb2-" + h.toString(16));
  }
  function hashPassword(plain) {
    var salt = uuid().slice(0, 8);
    return sha256Hex(salt + ":" + plain).then(function (hex) {
      return "nk-offline$" + salt + "$" + hex;
    });
  }
  function verifyPassword(plain, hashed) {
    if (typeof hashed !== "string") return Promise.resolve(false);
    if (hashed.indexOf("nk-offline$") === 0) {
      var parts = hashed.split("$");
      return sha256Hex(parts[1] + ":" + plain).then(function (hex) { return hex === parts[2]; });
    }
    // argon2 hashes from the server export can't be verified in-browser.
    // Users must register fresh inside the offline app.
    return Promise.resolve(false);
  }

  /* ---------- expression engine (port of lib/flow/expr.ts) ---------- */

  function builtins() {
    var d = new Date();
    var iso = d.toISOString();
    return {
      now: { iso: iso, unix: Math.floor(d.getTime() / 1000), date: iso.slice(0, 10), toString: function () { return iso; } },
      uuid: uuid(),
      random: { toString: function () { return String(Math.random()); }, int: Math.floor(Math.random() * 1000000) },
    };
  }
  function resolvePath(path, ctx) {
    var parts = path.split(".");
    var root = Object.assign({ trigger: ctx.trigger, vars: ctx.vars }, builtins());
    if (parts.length === 1) {
      if (parts[0] === "now") return root.now.iso;
      if (parts[0] === "random") return Math.random();
    }
    var cur = root[parts[0]];
    for (var i = 1; i < parts.length && cur != null; i++) {
      if (typeof cur !== "object") return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  function interpolate(template, ctx) {
    if (template == null) return "";
    return String(template).replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_m, path) {
      var v = resolvePath(String(path), ctx);
      if (v == null) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    });
  }
  function interpolateObject(obj, ctx) {
    if (!obj) return {};
    var out = {};
    for (var k in obj) out[k] = typeof obj[k] === "string" ? interpolate(obj[k], ctx) : obj[k];
    return out;
  }
  function cmp(left, op, right) {
    switch (op) {
      case "==": return String(left) === String(right);
      case "!=": return String(left) !== String(right);
      case ">": return Number(left) > Number(right);
      case "<": return Number(left) < Number(right);
      case ">=": return Number(left) >= Number(right);
      case "<=": return Number(left) <= Number(right);
      case "contains": return String(left).indexOf(String(right)) !== -1;
      case "exists": return left != null && left !== "";
      default: return false;
    }
  }

  /* ---------- flow engine (port of lib/flow/runtime.ts) ---------- */

  function findFlow(flowId) {
    for (var i = 0; i < CFG.flows.length; i++) {
      if (CFG.flows[i].id === flowId) return CFG.flows[i];
    }
    return null;
  }

  function executeNode(node, ctx, result) {
    var d = node.data || {};
    switch (node.type) {
      case "trigger": return Promise.resolve(undefined);

      case "set": {
        var name = d.name && d.name.trim();
        if (name) ctx.vars[name] = interpolate(d.value, ctx);
        return Promise.resolve();
      }
      case "query": {
        if (!d.table) return Promise.reject(new Error("Query node missing table"));
        var rows = adapter.list(d.table, { where: interpolateObject(d.where, ctx), limit: d.limit, orderBy: d.orderBy });
        ctx.vars[d.output || "rows"] = rows;
        return Promise.resolve();
      }
      case "insert": {
        if (!d.table) return Promise.reject(new Error("Insert node missing table"));
        var values = interpolateObject(d.values, ctx);
        if (values && values.created_by == null && ctx.vars.session && ctx.vars.session.userId) {
          values.created_by = ctx.vars.session.userId;
        }
        ctx.vars[d.output || "inserted"] = adapter.insert(d.table, values);
        return Promise.resolve();
      }
      case "update": {
        if (!d.table) return Promise.reject(new Error("Update node missing table"));
        ctx.vars[d.output || "updated"] = adapter.update(d.table, interpolateObject(d.where, ctx), interpolateObject(d.values, ctx));
        return Promise.resolve();
      }
      case "delete": {
        if (!d.table) return Promise.reject(new Error("Delete node missing table"));
        ctx.vars[d.output || "deleted"] = adapter.remove(d.table, interpolateObject(d.where, ctx));
        return Promise.resolve();
      }
      case "branch": {
        var ok = cmp(interpolate(d.left, ctx), d.op || "==", interpolate(d.right, ctx));
        return Promise.resolve(ok ? "true" : "false");
      }
      case "response": {
        result.status = d.status != null ? d.status : 200;
        try {
          var body = interpolate(d.body, ctx);
          result.body = body ? JSON.parse(body) : ctx.vars;
        } catch (_) {
          result.body = interpolate(d.body, ctx);
        }
        return Promise.resolve();
      }
      case "parse_json": {
        var raw = interpolate(d.input, ctx);
        if (!raw) return Promise.reject(new Error("Parse JSON node missing 'input'"));
        try {
          ctx.vars[d.output || "parsed"] = JSON.parse(raw);
          return Promise.resolve();
        } catch (err) {
          return Promise.reject(new Error("Parse JSON failed: " + err.message));
        }
      }
      case "math": {
        var left = Number(interpolate(d.left, ctx));
        var right = Number(interpolate(d.right, ctx));
        var out = 0;
        switch (d.op) {
          case "+": out = left + right; break;
          case "-": out = left - right; break;
          case "*": out = left * right; break;
          case "/": out = right === 0 ? 0 : left / right; break;
          case "%": out = right === 0 ? 0 : left % right; break;
          default: out = left + right;
        }
        ctx.vars[d.output || "result"] = out;
        return Promise.resolve();
      }
      case "hash_password": {
        var plain = interpolate(d.input, ctx);
        if (!plain) return Promise.reject(new Error("hash_password node missing 'input'"));
        return hashPassword(plain).then(function (h) { ctx.vars[d.output || "hash"] = h; });
      }
      case "verify_password": {
        return verifyPassword(interpolate(d.plain, ctx), interpolate(d.hash, ctx)).then(function (ok) {
          ctx.vars[d.output || "verified"] = ok;
        });
      }
      case "set_session": {
        var userId = interpolate(d.userId, ctx);
        if (!userId) return Promise.reject(new Error("set_session node missing 'userId'"));
        setSessionStore(userId);
        ctx.vars.session = { userId: userId };
        return Promise.resolve();
      }
      case "get_session": {
        var s = getSessionStore();
        var outName = d.output || "session";
        if (!s) {
          ctx.vars[outName] = { userId: null, role: null, email: null, name: null };
          return Promise.resolve();
        }
        var row = findUserRow(s.userId);
        ctx.vars[outName] = {
          userId: s.userId,
          role: row && row.role != null ? row.role : null,
          email: row && row.email != null ? row.email : null,
          name: row && row.name != null ? row.name : null,
        };
        return Promise.resolve();
      }
      case "clear_session": {
        clearSessionStore();
        ctx.vars.session = { userId: null };
        return Promise.resolve();
      }
      case "check_role": {
        var expected = (interpolate(d.role, ctx) || "").trim();
        if (!expected) return Promise.reject(new Error("check_role node missing role"));
        var src = (d.source && d.source.trim()) || "session.role";
        var actual = ctx.vars;
        var parts = src.split(".");
        for (var i = 0; i < parts.length; i++) actual = actual ? actual[parts[i]] : undefined;
        ctx.vars[(d.output && d.output.trim()) || "roleOk"] = String(actual == null ? "" : actual).toLowerCase() === expected.toLowerCase();
        return Promise.resolve();
      }
      case "lookup": {
        var sourceVar = d.sourceVar && d.sourceVar.trim();
        if (!sourceVar) return Promise.reject(new Error("Lookup node missing sourceVar"));
        var sourceRows = ctx.vars[sourceVar];
        if (!Array.isArray(sourceRows)) return Promise.reject(new Error("Lookup: " + sourceVar + " is not an array"));
        if (!d.lookupTable) return Promise.reject(new Error("Lookup node missing lookupTable"));
        var srcField = d.sourceField || "id";
        var lkpField = d.lookupField || "id";
        var asField = d.as || "lookup";
        sourceRows.forEach(function (row) {
          var key = row[srcField];
          if (key) {
            var whereObj = {};
            whereObj[lkpField] = String(key);
            var matched = adapter.list(d.lookupTable, { where: whereObj, limit: 10 });
            row[asField] = matched.length === 1 ? matched[0] : matched;
          }
        });
        ctx.vars[(d.output && d.output.trim()) || sourceVar] = sourceRows;
        return Promise.resolve();
      }
      case "bulk_insert": {
        var rowsVar = d.rowsVar && d.rowsVar.trim();
        if (!rowsVar || !d.table) return Promise.reject(new Error("bulk_insert missing table or rowsVar"));
        var list = ctx.vars[rowsVar];
        if (!Array.isArray(list)) return Promise.reject(new Error("bulk_insert: " + rowsVar + " is not an array"));
        list.forEach(function (row) { adapter.insert(d.table, row); });
        ctx.vars[(d.output && d.output.trim()) || "inserted"] = list.length;
        return Promise.resolve();
      }
      case "bulk_update": {
        if (!d.table) return Promise.reject(new Error("bulk_update missing table"));
        ctx.vars[(d.output && d.output.trim()) || "updated"] = adapter.update(d.table, interpolateObject(d.where, ctx), interpolateObject(d.values, ctx));
        return Promise.resolve();
      }
      case "bulk_delete": {
        if (!d.table) return Promise.reject(new Error("bulk_delete missing table"));
        ctx.vars[(d.output && d.output.trim()) || "deleted"] = adapter.remove(d.table, interpolateObject(d.where, ctx));
        return Promise.resolve();
      }
      case "aggregate": {
        if (!d.table) return Promise.reject(new Error("aggregate node missing table"));
        ctx.vars[(d.output && d.output.trim()) || "aggregated"] = adapter.rawQuery(d.table, {
          groupBy: interpolate(d.groupBy, ctx) || "",
          aggregate: interpolate(d.aggregate, ctx) || "COUNT(*)",
          where: interpolateObject(d.where, ctx),
          orderBy: interpolate(d.orderBy, ctx) || "",
          limit: d.limit != null ? d.limit : 100,
        });
        return Promise.resolve();
      }
      case "custom_js": {
        var code = d.code && d.code.trim();
        if (!code) return Promise.resolve();
        var value;
        try {
          var fn = new Function("vars", "trigger", "console", "return (function(){\n" + code + "\n})()");
          value = fn(ctx.vars, JSON.parse(JSON.stringify(ctx.trigger == null ? null : ctx.trigger)), { log: function () {}, warn: function () {}, error: function () {} });
        } catch (err) {
          return Promise.reject(new Error("Custom JS failed: " + err.message));
        }
        if (value !== undefined) ctx.vars[(d.output && d.output.trim()) || "result"] = value;
        return Promise.resolve();
      }
      case "delay": {
        var s = Math.max(0, Math.min(60, Number(d.seconds || 0)));
        return new Promise(function (r) { setTimeout(r, s * 1000); });
      }
      case "http_request": {
        if (!d.url) return Promise.reject(new Error("HTTP node missing url"));
        var url = interpolate(d.url, ctx);
        var headers = {};
        for (var hk in d.headers || {}) headers[hk] = interpolate(d.headers[hk], ctx);
        var method = d.method || "GET";
        var reqBody = method === "GET" || method === "DELETE" ? undefined : interpolate(d.body, ctx);
        return realFetch(url, { method: method, headers: headers, body: reqBody }).then(function (res) {
          var ct = res.headers.get("content-type") || "";
          return (ct.indexOf("json") !== -1 ? res.json() : res.text()).then(function (parsed) {
            ctx.vars[d.output || "response"] = { status: res.status, body: parsed };
          });
        }).catch(function () {
          return Promise.reject(new Error("HTTP request failed — this app is running offline."));
        });
      }
      case "email": {
        // Mirror the server's no-API-key soft-fail: log-and-skip.
        if (d.output) ctx.vars[d.output] = { ok: false, skipped: true };
        return Promise.resolve();
      }
      case "sheets_read":
      case "sheets_append":
        return Promise.reject(new Error("Google Sheets is not available in the offline app."));
      case "ai_prompt":
        return Promise.reject(new Error("AI is not available in the offline app."));
      default:
        return Promise.reject(new Error("Unknown node type: " + node.type));
    }
  }

  function walk(nodeId, graph, ctx, result, visited) {
    if (visited[nodeId]) return Promise.resolve();
    visited[nodeId] = true;
    var node = null;
    for (var i = 0; i < graph.nodes.length; i++) if (graph.nodes[i].id === nodeId) { node = graph.nodes[i]; break; }
    if (!node) return Promise.resolve();
    return executeNode(node, ctx, result).then(function (handle) {
      var nexts = graph.edges.filter(function (e) {
        return e.source === nodeId && (!handle || e.sourceHandle === handle);
      }).map(function (e) { return e.target; });
      var chain = Promise.resolve();
      nexts.forEach(function (n) {
        chain = chain.then(function () { return walk(n, graph, ctx, result, visited); });
      });
      return chain;
    }).catch(function (err) {
      result.status = 500;
      result.body = { error: err.message, nodeId: node.id };
    });
  }

  function runFlow(flowId, trigger) {
    var flow = findFlow(flowId);
    if (!flow) return Promise.resolve({ status: 404, body: { error: "Flow not found or disabled" } });
    var graph = flow.graph || { nodes: [], edges: [] };
    var ctx = { trigger: trigger, vars: {} };
    var start = null;
    for (var i = 0; i < graph.nodes.length; i++) if (graph.nodes[i].type === "trigger") { start = graph.nodes[i]; break; }
    if (!start) start = graph.nodes[0];
    var result = { status: 200, body: { ok: true } };
    if (!start) return Promise.resolve({ status: 500, body: { error: "Flow has no trigger node" } });
    return walk(start.id, graph, ctx, result, {}).then(function () { return result; });
  }

  /* ---------- fetch shim ---------- */

  var realFetch = window.fetch.bind(window);

  function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
      status: status,
      headers: { "content-type": "application/json" },
    });
  }

  function formDataToObject(fd) {
    var out = {};
    var pending = [];
    fd.forEach(function (v, k) {
      if (v && typeof v === "object" && typeof v.name === "string" && typeof v.arrayBuffer === "function") {
        pending.push(new Promise(function (resolve) {
          var r = new FileReader();
          r.onload = function () { out[k] = String(r.result); resolve(); };
          r.onerror = function () { out[k] = ""; resolve(); };
          r.readAsDataURL(v);
        }));
      } else {
        out[k] = v;
      }
    });
    return Promise.all(pending).then(function () { return out; });
  }

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var runMatch = /\/api\/run\/([A-Za-z0-9_-]+)/.exec(url);
    if (runMatch) {
      var flowId = runMatch[1];
      var body = (init && init.body) || (typeof input === "object" && input.body) || null;
      var triggerPromise;
      if (body && typeof FormData !== "undefined" && body instanceof FormData) {
        triggerPromise = formDataToObject(body);
      } else if (typeof body === "string") {
        try { triggerPromise = Promise.resolve(JSON.parse(body)); }
        catch (_) { triggerPromise = Promise.resolve({}); }
      } else {
        triggerPromise = Promise.resolve({});
      }
      return triggerPromise
        .then(function (trigger) { return runFlow(flowId, trigger); })
        .then(function (result) { return jsonResponse(result.status, result.body); });
    }
    if (url.indexOf("/api/nk-session") !== -1) {
      var s = getSessionStore();
      if (!s) return Promise.resolve(jsonResponse(200, { signedIn: false }));
      var row = findUserRow(s.userId);
      if (!row) return Promise.resolve(jsonResponse(200, { signedIn: true, user: { id: s.userId } }));
      var safe = {};
      for (var k in row) if (!/password|secret|token/i.test(k)) safe[k] = row[k];
      return Promise.resolve(jsonResponse(200, { signedIn: true, user: safe }));
    }
    if (url.indexOf("/api/push/vapid") !== -1) {
      return Promise.resolve(jsonResponse(404, { error: "Push is not available offline" }));
    }
    return realFetch(input, init);
  };

  /* ---------- navigation + auth gate (runs after DOM parses) ---------- */

  function localHref(path) {
    var clean = String(path || "/").split("?")[0].split("#")[0].replace(/^\/+|\/+$/g, "");
    if (!clean) return "./index.html";
    return "./" + clean + ".html";
  }

  document.addEventListener("DOMContentLoaded", function () {
    // The standard runtime installs __nkNavigate at load; override it so
    // flow redirects ({ redirect: "/login" }) resolve to local files.
    window.__nkNavigate = function (p) { window.location.href = localHref(p); };

    // Server-side auth gates don't exist offline — enforce the page marker
    // client-side.
    if (CFG.requiresAuth && !getSessionStore()) {
      window.location.href = localHref(CFG.loginSlug || "login");
    }
  });

  window.NKOffline = { runFlow: runFlow, db: adapter };
})();
