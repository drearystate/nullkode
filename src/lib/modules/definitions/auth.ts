import type { ModuleDefinition } from "../types";

/**
 * Auth — the canonical "users" module.
 *
 * Install this first into any project that wants user accounts. It provides
 * the `auth-users` and `auth-session` capabilities. Other modules that
 * declare `requires: ["auth-session"]` or `requires: ["auth-users"]` will
 * use this module's users table and session flows automatically.
 *
 * The installer resolves `{{@auth-users.table}}` at install time, so
 * dependent modules can do things like:
 *
 *   flows: [{
 *     slug: "my-profile",
 *     nodes: [
 *       { id: "n1", type: "trigger", data: {} },
 *       { id: "n2", type: "get_session", data: { output: "session" } },
 *       { id: "n3", type: "query", data: {
 *           table: "{{@auth-users.table}}",
 *           where: { id: "{{vars.session.userId}}" },
 *           limit: 1,
 *           output: "me",
 *       } },
 *       { id: "n4", type: "response", data: { status: 200, body: "{{vars.me.0}}" } },
 *     ],
 *   }]
 *
 * … and the `{{@auth-users.table}}` placeholder will be rewritten to
 * `auth_users` at install time.
 *
 * 1.1.0: the profile page has "Download my data" and "Delete my account"
 * (app stores require in-app account deletion). They call
 * /api/app-account/export and /api/app-account/delete, which find
 * everything tied to the account (lib/app-account-data.ts). Every app also
 * has a public /delete-account page for people who can't sign in.
 * scripts/upgrade-account-deletion.ts adds the section to existing apps.
 */

/** Marks the account-data section, so upgrades can tell it's there. */
export const ACCOUNT_DATA_MARKER = "<!--nk:account-data:v1-->";

/**
 * "Download my data" and "Delete my account" for the profile page. Plain
 * HTML and one script (no {{config.*}} values), so the upgrade script can add
 * the very same block to apps that are already installed.
 */
export const ACCOUNT_DATA_SECTION = `${ACCOUNT_DATA_MARKER}
<div class="card p-4 shadow-sm mt-4" data-nk-account-data="">
  <h5 class="fw-bold mb-1">Download my data</h5>
  <p class="small mb-3" style="color:var(--nk-text-muted);">Get a copy of your account and everything tied to it, as a .zip file.</p>
  <div><button type="button" class="btn btn-outline-primary" data-nk-account-export="">Download my data</button></div>
  <div class="small mt-2" role="status" aria-live="polite" data-nk-account-export-status=""></div>
</div>
<form class="card p-4 shadow-sm mt-4" style="border-color:#dc3545;" data-nk-account-delete="">
  <h5 class="fw-bold mb-1 text-danger">Delete my account</h5>
  <p class="small mb-2" style="color:var(--nk-text-muted);">This deletes your account and everything you added while signed in, like your profile, saved items and posts. Bookings, orders or messages sent with your email address are kept for the business's records, with your name and contact details removed. This can't be undone.</p>
  <label class="form-label mt-2" for="nk-account-delete-password">Your password</label>
  <input id="nk-account-delete-password" name="password" type="password" class="form-control" autocomplete="current-password" required=""/>
  <label class="form-label mt-3" for="nk-account-delete-confirm">Type DELETE to confirm</label>
  <input id="nk-account-delete-confirm" name="confirm" class="form-control" autocomplete="off" required=""/>
  <div class="mt-3"><button type="submit" class="btn btn-danger">Delete my account</button></div>
  <div class="text-danger small mt-2" role="alert" data-nk-account-delete-error=""></div>
</form>
<script>(function(){
  var pid = window.__nkProjectId || '';
  function base(){ var b = window.__nkPublicBase || ''; return b.charAt(b.length - 1) === '/' ? b.slice(0, -1) : b; }
  function post(path, body){
    return fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-nk-project-id': pid }, body: JSON.stringify(body || {}) });
  }
  function say(el, text){ if (el) el.textContent = text || ''; }
  function problem(res, fallback){
    return res.json().catch(function(){ return {}; }).then(function(d){ return typeof d.error === 'string' && d.error.length < 300 ? d.error : fallback; });
  }
  // This device's push subscription, so deleting the account removes it too.
  // Some browsers never answer when they have no push service: give up after
  // a moment rather than hold up the delete.
  function pushSubscription(){
    var lookup;
    try {
      if (!('serviceWorker' in navigator)) return Promise.resolve(null);
      lookup = navigator.serviceWorker.getRegistration(base() + '/').then(function(reg){
        return reg && reg.pushManager ? reg.pushManager.getSubscription() : null;
      }).catch(function(){ return null; });
    } catch (e) { return Promise.resolve(null); }
    return Promise.race([lookup, new Promise(function(resolve){ setTimeout(function(){ resolve(null); }, 1500); })]);
  }

  var exp = document.querySelector('[data-nk-account-export]');
  if (exp && !exp.__nkBound) {
    exp.__nkBound = true;
    exp.addEventListener('click', function(){
      var status = document.querySelector('[data-nk-account-export-status]');
      exp.disabled = true;
      say(status, 'Preparing your download…');
      post('/api/app-account/export').then(function(res){
        if (!res.ok) return problem(res, "Your data couldn't be downloaded. Please try again.").then(function(m){ say(status, m); });
        return res.blob().then(function(blob){
          var m = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '');
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = m ? m[1] : 'my-data.zip';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function(){ URL.revokeObjectURL(url); }, 10000);
          say(status, 'Your download has started.');
        });
      }).catch(function(){ say(status, 'Network error. Please try again.'); }).then(function(){ exp.disabled = false; });
    });
  }

  var form = document.querySelector('[data-nk-account-delete]');
  if (form && !form.__nkBound) {
    form.__nkBound = true;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var err = form.querySelector('[data-nk-account-delete-error]');
      var password = form.querySelector('[name=password]').value;
      var typed = (form.querySelector('[name=confirm]').value || '').trim().toUpperCase();
      if (typed !== 'DELETE') { say(err, 'Type DELETE to confirm.'); return; }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      say(err, '');
      var sub = null;
      pushSubscription().then(function(s){
        sub = s;
        return post('/api/app-account/delete', { password: password, confirm: typed, pushEndpoint: s ? s.endpoint : null });
      }).then(function(res){
        if (!res.ok) return problem(res, "Your account couldn't be deleted. Please try again.").then(function(m){ say(err, m); btn.disabled = false; });
        try { if (sub) sub.unsubscribe(); } catch (x) {}
        var done = document.createElement('p');
        done.className = 'card p-4 shadow-sm mt-4 fw-bold';
        done.setAttribute('role', 'status');
        done.textContent = 'Your account was deleted. Taking you to the home page…';
        form.parentNode.replaceChild(done, form);
        var data = document.querySelector('[data-nk-account-data]');
        if (data) data.remove();
        setTimeout(function(){ window.location.href = base() + '/'; }, 1500);
      }).catch(function(){ say(err, 'Network error. Nothing was deleted.'); btn.disabled = false; });
    });
  }
})();</script>
<!--/nk:account-data-->`;

export const auth: ModuleDefinition = {
  id: "auth",
  name: "Sign-in and accounts",
  tagline: "Let people create an account and sign in",
  description:
    "Adds sign-up, sign-in and sign-out pages, and keeps a list of the people who have an account. Passwords are stored safely. People can download their data or delete their account from their profile page. Features that need people to be signed in, like favorites or private messages, use these accounts automatically.",
  icon: "",
  color: "from-slate-600 to-zinc-800",
  category: "utility",
  version: "1.1.0",
  provides: ["auth-session", "auth-users"],
  bareSlugs: true,
  capabilityRefs: {
    "auth-users": { table: "users" },
    "auth-session": { flow: "login" },
  },

  config: [
    { key: "appName", label: "App name", type: "text", default: "My App", required: true },
  ],

  tables: [
    {
      name: "users",
      fields: [
        { name: "email", type: "text" },
        { name: "password_hash", type: "text" },
        { name: "name", type: "text" },
        { name: "avatar_url", type: "text" },
        { name: "bio", type: "text" },
        { name: "role", type: "text" },
        // Per-user UI preference. "light" (default) or "dark". The runtime
        // applies data-theme on every page load based on this column, so a
        // visitor's choice in /settings persists across devices and browsers
        // without any localStorage state.
        { name: "theme_preference", type: "text" },
      ],
      // No sample accounts: a shared sample login would let anyone into
      // every app's admin pages. Owners set their own admin login from the
      // app's overview (see lib/app-admin.ts).
    },
  ],

  flows: [
    {
      slug: "register",
      name: "Register",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "hash_password", data: { input: "{{trigger.password}}", output: "hash" } },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "users",
            values: {
              email: "{{trigger.email}}",
              password_hash: "{{vars.hash}}",
              name: "{{trigger.name}}",
              role: "user",
            },
            output: "user",
          },
        },
        { id: "n4", type: "set_session", data: { userId: "{{vars.user.id}}" } },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"redirect":"/"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "login",
      name: "Log in",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: { table: "users", where: { email: "{{trigger.email}}" }, limit: 1, output: "user" },
        },
        {
          id: "n3",
          type: "verify_password",
          data: { plain: "{{trigger.password}}", hash: "{{vars.user.0.password_hash}}", output: "ok" },
        },
        { id: "n4", type: "branch", data: { left: "{{vars.ok}}", op: "==", right: "true" } },
        { id: "n5", type: "set_session", data: { userId: "{{vars.user.0.id}}" } },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true,"redirect":"/"}' } },
        { id: "n7", type: "response", data: { status: 401, body: '{"error":"Invalid email or password"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5", sourceHandle: "true" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n4", target: "n7", sourceHandle: "false" },
      ],
    },
    {
      slug: "logout",
      name: "Log out",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "clear_session", data: {} },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"redirect":"/"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "me",
      name: "Get current user",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "branch", data: { left: "{{vars.session.userId}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "query",
          data: { table: "users", where: { id: "{{vars.session.userId}}" }, limit: 1, output: "me" },
        },
        { id: "n5", type: "response", data: { status: 200, body: "{{vars.me.0}}" } },
        { id: "n6", type: "response", data: { status: 401, body: '{"error":"Not signed in"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },
    {
      slug: "update-profile",
      name: "Update profile",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "update",
          data: {
            table: "users",
            where: { id: "{{vars.session.userId}}" },
            values: {
              name: "{{trigger.name}}",
              bio: "{{trigger.bio}}",
              avatar_url: "{{trigger.avatar_url}}",
            },
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true,"message":"Profile saved"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "list-users",
      name: "List users (admin)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "branch", data: { left: "{{vars.session.role}}", op: "==", right: "admin" } },
        {
          id: "n4",
          type: "query",
          data: { table: "users", orderBy: "id asc", limit: 500, output: "rows" },
        },
        { id: "n5", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
        { id: "n6", type: "response", data: { status: 403, body: '{"error":"Admins only"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },
    {
      slug: "change-role",
      name: "Change a user's role (admin)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "branch", data: { left: "{{vars.session.role}}", op: "==", right: "admin" } },
        {
          id: "n4",
          type: "update",
          data: {
            table: "users",
            where: { id: "{{trigger.user_id}}" },
            values: { role: "{{trigger.role}}" },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true}' } },
        { id: "n6", type: "response", data: { status: 403, body: '{"error":"Admins only"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },
    {
      slug: "set-theme-pref",
      name: "Set theme preference",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "branch", data: { left: "{{vars.session.userId}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "update",
          data: {
            table: "users",
            where: { id: "{{vars.session.userId}}" },
            values: { theme_preference: "{{trigger.theme}}" },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true}' } },
        { id: "n6", type: "response", data: { status: 401, body: '{"error":"Sign in required"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },
  ],

  pages: [
    {
      slug: "login",
      title: "Log in",
      html: `<nav class="py-3" style="border-bottom:1px solid var(--nk-border);"><div class="container d-flex justify-content-between align-items-center"><a href="/" class="fw-bold text-decoration-none" style="color:var(--nk-text);">{{config.appName}}</a><div class="d-flex gap-3 align-items-center"><a href="/" class="small text-decoration-none" style="color:var(--nk-text-muted);">Home</a><a href="/register" class="btn btn-primary btn-sm">Sign up</a></div></div></nav>
<section class="py-5"><div class="container" style="max-width:420px;padding-top:4vh;"><div class="text-center mb-4"><h1 class="display-5 fw-bold">Welcome back</h1><p style="color:var(--nk-text-muted);">Sign in to {{config.appName}}</p></div>
<form data-nk-form="" data-nk-flow-ref="login" class="card p-4 shadow-sm"><div class="mb-3"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="mb-3"><label class="form-label">Password</label><input name="password" type="password" class="form-control" required/></div><button class="btn btn-primary btn-lg w-100" type="submit">Log in</button><div data-nk-error class="text-danger small mt-2"></div></form>
<p class="small text-center mt-3" style="color:var(--nk-text-muted);">No account? <a href="/register">Create one</a></p>
<p class="small text-center mt-2"><a href="/delete-account" style="color:var(--nk-text-muted);">Delete your account</a></p>
</div></section>`,
    },
    {
      slug: "register",
      title: "Sign up",
      html: `<nav class="py-3" style="border-bottom:1px solid var(--nk-border);"><div class="container d-flex justify-content-between align-items-center"><a href="/" class="fw-bold text-decoration-none" style="color:var(--nk-text);">{{config.appName}}</a><div class="d-flex gap-3 align-items-center"><a href="/" class="small text-decoration-none" style="color:var(--nk-text-muted);">Home</a><a href="/login" class="btn btn-outline-primary btn-sm">Log in</a></div></div></nav>
<section class="py-5"><div class="container" style="max-width:420px;padding-top:4vh;"><div class="text-center mb-4"><h1 class="display-5 fw-bold">Create your account</h1><p style="color:var(--nk-text-muted);">Join {{config.appName}}</p></div>
<form data-nk-form="" data-nk-flow-ref="register" class="card p-4 shadow-sm"><div class="mb-3"><label class="form-label">Your name</label><input name="name" class="form-control" required/></div><div class="mb-3"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="mb-3"><label class="form-label">Password</label><input name="password" type="password" class="form-control" minlength="8" required/></div><button class="btn btn-primary btn-lg w-100" type="submit">Create account</button><div data-nk-error class="text-danger small mt-2"></div></form>
<p class="small text-center mt-3" style="color:var(--nk-text-muted);">Already have one? <a href="/login">Log in</a></p>
</div></section>`,
    },
    {
      slug: "profile",
      title: "Profile",
      html: `<!--nk:require-auth-->
<nav class="py-3" style="border-bottom:1px solid var(--nk-border);"><div class="container d-flex justify-content-between align-items-center"><a href="/" class="fw-bold text-decoration-none" style="color:var(--nk-text);">Home</a><div class="d-flex gap-3 align-items-center"><a href="/" class="small text-decoration-none" style="color:var(--nk-text-muted);">Dashboard</a><a href="#" class="btn btn-outline-secondary btn-sm" data-nk-logout-ref="logout" data-nk-redirect="/">Log out</a></div></div></nav>
<section class="py-5"><div class="container" style="max-width:680px;">
<h1 class="fw-bold">Your profile</h1><p style="color:var(--nk-text-muted);">Manage your account.</p>

<div data-nk-bind-flow-ref="me" class="card p-4 shadow-sm mt-4">
  <div data-nk-item class="d-flex align-items-center gap-4">
    <img class="rounded-circle" style="width:88px;height:88px;object-fit:cover;" data-nk-src="avatar_url" src="/media/generated/thumbs/people-priya.webp" alt=""/>
    <div>
      <h3 class="fw-bold mb-0" data-nk-field="name">Your name</h3>
      <div style="color:var(--nk-text-muted);" data-nk-field="email">you@example.com</div>
      <div class="small mt-1" style="color:var(--nk-text-muted);" data-nk-field="bio">Your bio goes here.</div>
    </div>
  </div>
</div>

<form data-nk-form="" data-nk-flow-ref="update-profile" class="card p-4 shadow-sm mt-4"><h5 class="fw-bold">Edit profile</h5><div class="row g-3 mt-2"><div class="col-12"><label class="form-label">Name</label><input name="name" class="form-control"/></div><div class="col-12"><label class="form-label">Avatar URL</label><input name="avatar_url" type="url" class="form-control"/></div><div class="col-12"><label class="form-label">Bio</label><textarea name="bio" class="form-control" rows="3"></textarea></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Save changes</button></div><div data-nk-error class="col-12 text-danger small"></div></div></form>
${ACCOUNT_DATA_SECTION}
</div></section>`,
    },
    {
      slug: "settings",
      title: "Settings",
      html: `<!--nk:require-auth-->
<nav class="py-3" style="border-bottom:1px solid var(--nk-border);"><div class="container d-flex justify-content-between align-items-center"><a href="/" class="fw-bold text-decoration-none" style="color:var(--nk-text);">{{config.appName}}</a><div class="d-flex gap-3 align-items-center"><a href="/profile" class="small text-decoration-none" style="color:var(--nk-text-muted);">Profile</a><a href="#" class="btn btn-outline-secondary btn-sm" data-nk-logout-ref="logout" data-nk-redirect="/login">Log out</a></div></div></nav>
<section class="py-5"><div class="container" style="max-width:760px;">
<h1 class="fw-bold">Settings</h1><p style="color:var(--nk-text-muted);">Manage how the app looks and who can do what.</p>

<div class="card p-4 shadow-sm mt-4">
  <h5 class="fw-bold mb-3">Appearance</h5>
  <p class="small mb-3" style="color:var(--nk-text-muted);">Choose how the app looks for you. Your choice is saved to your account and follows you across devices.</p>
  <div class="d-flex gap-2" id="nk-theme-toggle-group">
    <button type="button" class="btn btn-outline-primary" data-nk-theme-choice="light">Light</button>
    <button type="button" class="btn btn-outline-primary" data-nk-theme-choice="dark">Dark</button>
  </div>
</div>

<div class="card p-4 shadow-sm mt-4" data-nk-role="admin">
  <h5 class="fw-bold mb-1">Users &amp; roles</h5>
  <p class="small mb-3" style="color:var(--nk-text-muted);">Visible to administrators. Change a user's role to control which pages they can see.</p>
  <div class="table-responsive">
    <table class="table align-middle">
      <thead><tr><th>Name</th><th>Email</th><th style="width:200px;">Role</th></tr></thead>
      <tbody data-nk-bind-flow-ref="list-users">
        <tr data-nk-item data-nk-row-id="{id}" data-nk-role-cur="{role}">
          <td data-nk-field="name">—</td>
          <td data-nk-field="email">—</td>
          <td>
            <select class="form-select form-select-sm nk-role-select">
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="staff">staff</option>
              <option value="manager">manager</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="small" style="color:var(--nk-text-muted);">Changes save instantly. Refresh the page to see new users.</div>
</div>

<script>(function(){
  // ── Theme toggle: write to set-theme-pref flow, then mirror to <html>.
  function currentTheme(){ return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function paintToggle(){
    var t = currentTheme();
    document.querySelectorAll('[data-nk-theme-choice]').forEach(function(btn){
      var on = btn.getAttribute('data-nk-theme-choice') === t;
      btn.classList.toggle('btn-primary', on);
      btn.classList.toggle('btn-outline-primary', !on);
    });
  }
  document.querySelectorAll('[data-nk-theme-choice]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var pick = btn.getAttribute('data-nk-theme-choice');
      if(pick === 'dark') document.documentElement.setAttribute('data-theme','dark');
      else document.documentElement.removeAttribute('data-theme');
      paintToggle();
      fetch('/api/run/' + (window.__nkFlowSlugMap && window.__nkFlowSlugMap['set-theme-pref'] || 'set-theme-pref'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ theme: pick }),
      }).catch(function(){});
    });
  });
  paintToggle();
  document.addEventListener('nk:session', paintToggle);

  // ── Role-edit dropdown: wires onto each rendered admin row.
  // The runtime stamps data-nk-row-id="<row.id>" automatically on data-nk-item
  // children, but we also accept a fallback by reading the hidden field below.
  document.addEventListener('change', function(e){
    var sel = e.target.closest('.nk-role-select'); if(!sel) return;
    var row = sel.closest('[data-nk-item]'); if(!row) return;
    var uid = row.getAttribute('data-nk-row-id') || row.dataset.nkRowId || '';
    if(!uid) return;
    sel.disabled = true;
    fetch('/api/run/' + (window.__nkFlowSlugMap && window.__nkFlowSlugMap['change-role'] || 'change-role'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ user_id: uid, role: sel.value }),
    }).finally(function(){ sel.disabled = false; });
  });

  // Initialise each row's <select> to the current role once the list paints.
  // The runtime fires a custom event when data-nk-bind-flow-ref containers
  // re-render; if that isn't available, MutationObserver as a fallback.
  function seedSelects(){
    document.querySelectorAll('[data-nk-bind-flow-ref="list-users"] [data-nk-item]').forEach(function(row){
      var sel = row.querySelector('.nk-role-select');
      if(!sel || sel.dataset.nkSeeded === '1') return;
      var r = (row.getAttribute('data-nk-role-cur') || '').toLowerCase().trim();
      if(r) {
        var opt = sel.querySelector('option[value="' + r + '"]');
        if(!opt){ opt = document.createElement('option'); opt.value = r; opt.textContent = r; sel.appendChild(opt); }
        sel.value = r;
      }
      sel.dataset.nkSeeded = '1';
    });
  }
  var mo = new MutationObserver(seedSelects);
  var container = document.querySelector('[data-nk-bind-flow-ref="list-users"]');
  if(container){ mo.observe(container, { childList: true, subtree: true }); }
  document.addEventListener('nk:bound', seedSelects);
})();</script>
</div></section>`,
    },
  ],
};
