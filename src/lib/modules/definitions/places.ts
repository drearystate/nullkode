import type { ModuleDefinition, ModuleFlow, ModuleFlowNode } from "../types";
import { CATEGORY_SEEDS, PLACE_SEEDS } from "./places-seed";
import { PLACE_I18N } from "./places-i18n";
import { ADMIN_SCRIPT, DETAILS_SCRIPT, GUIDE_SCRIPT, LEAFLET_TAGS, MINE_SCRIPT, PLACES_CSS, PLACE_ICONS as I } from "./places-ui";

/**
 * Places: a phone-first guide to places on a map.
 *
 *  - The guide page has List, Categories and Map views. Visitors can search,
 *    filter by category, share their location to see the nearest places
 *    first, and tap a photo pin on the map to see a place's card.
 *  - A details page shows photos, opening hours, call / website buttons,
 *    a "Get directions" link to the phone's maps app and a small map.
 *  - "My venues": signed-in visitors suggest places and change their own.
 *    Every suggestion and change waits for the app owner's approval.
 *  - The owner's page approves or rejects suggestions and adds, changes,
 *    features and deletes places and categories.
 *  - Labels in English, Spanish, Portuguese, French and German.
 *
 * Upgrades: version 1.0.0 was a plain directory with the table "items"
 * (name, category, address, description, phone, website, lat, lng) and the
 * flows "feed" and "add". Installed features keep their own copies of their
 * tables, flows and pages, so apps that added 1.0.0 are unchanged. 2.0.0
 * keeps that table name and every one of its columns (it only adds columns)
 * and keeps the two flow names, so data and references stay compatible.
 */

const TABLE = "items";

function flow(slug: string, name: string, nodes: ModuleFlowNode[], edges: Array<[string, string, string?]>): ModuleFlow {
  return {
    slug,
    name,
    httpMethod: "POST",
    nodes,
    edges: edges.map(([source, target, sourceHandle], i) => ({ id: `e${i + 1}`, source, target, ...(sourceHandle ? { sourceHandle } : {}) })),
  };
}

const trigger: ModuleFlowNode = { id: "n1", type: "trigger", data: {} };
const session: ModuleFlowNode = { id: "n2", type: "get_session", data: { output: "session" } };
const signedIn: ModuleFlowNode = { id: "n3", type: "branch", data: { left: "{{vars.session.userId}}", op: "exists", right: "" } };
const notSignedIn = (id: string): ModuleFlowNode => ({ id, type: "response", data: { status: 401, body: '{"error":"Please sign in first."}' } });

/** What a visitor may write about their own place (never its status). */
const visitorValues = {
  name: "{{trigger.name}}",
  category: "{{trigger.category}}",
  description: "{{trigger.description}}",
  address: "{{trigger.address}}",
  phone: "{{trigger.phone}}",
  website: "{{trigger.website}}",
  hours: "{{trigger.hours}}",
  lat: "{{trigger.lat}}",
  lng: "{{trigger.lng}}",
  image_url: "{{trigger.image_url}}",
  gallery: "{{trigger.gallery}}",
};

const ownerValues = {
  ...visitorValues,
  featured: "{{trigger.featured}}",
  sort_order: "{{trigger.sort_order}}",
  status: "{{trigger.status}}",
};

const FLOWS: ModuleFlow[] = [
  // ── Public: only approved places ─────────────────────────────────────
  flow("feed", "Places in the guide", [
    trigger,
    { id: "n2", type: "query", data: { table: TABLE, where: { status: "approved" }, orderBy: "name asc", limit: 1000, output: "rows" } },
    { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
  ], [["n1", "n2"], ["n2", "n3"]]),
  flow("categories", "Place categories", [
    trigger,
    { id: "n2", type: "query", data: { table: "categories", orderBy: "sort_order asc", limit: 200, output: "rows" } },
    { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
  ], [["n1", "n2"], ["n2", "n3"]]),
  flow("place", "One place", [
    trigger,
    { id: "n2", type: "query", data: { table: TABLE, where: { id: "{{trigger.id}}", status: "approved" }, limit: 1, output: "rows" } },
    { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
  ], [["n1", "n2"], ["n2", "n3"]]),

  // ── Signed-in visitors: their own places, always by the session's user ──
  flow("my-places", "My places", [
    trigger, session, signedIn,
    { id: "n4", type: "query", data: { table: TABLE, where: { created_by: "{{vars.session.userId}}" }, orderBy: "created_at desc", limit: 200, output: "rows" } },
    { id: "n5", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
    notSignedIn("n6"),
  ], [["n1", "n2"], ["n2", "n3"], ["n3", "n4", "true"], ["n4", "n5"], ["n3", "n6", "false"]]),
  flow("submit", "Suggest a place", [
    trigger, session, signedIn,
    { id: "n4", type: "insert", data: { table: TABLE, skipEmpty: true, values: { ...visitorValues, status: "pending", featured: "false", created_by: "{{vars.session.userId}}", submitted_by: "{{vars.session.name}}" } } },
    { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks! Your place will show in the guide once it\'s approved."}' } },
    notSignedIn("n6"),
  ], [["n1", "n2"], ["n2", "n3"], ["n3", "n4", "true"], ["n4", "n5"], ["n3", "n6", "false"]]),
  flow("update-mine", "Change my place", [
    trigger, session, signedIn,
    { id: "n4", type: "update", data: { table: TABLE, where: { id: "{{trigger.id}}", created_by: "{{vars.session.userId}}" }, values: { ...visitorValues, status: "pending" }, output: "changed" } },
    { id: "n5", type: "branch", data: { left: "{{vars.changed}}", op: ">", right: "0" } },
    { id: "n6", type: "response", data: { status: 200, body: '{"ok":true,"message":"Saved. The changes will show once they\'re approved."}' } },
    { id: "n7", type: "response", data: { status: 404, body: '{"error":"We couldn\'t find that place among yours."}' } },
    notSignedIn("n8"),
  ], [["n1", "n2"], ["n2", "n3"], ["n3", "n4", "true"], ["n4", "n5"], ["n5", "n6", "true"], ["n5", "n7", "false"], ["n3", "n8", "false"]]),
  flow("delete-mine", "Remove my place", [
    trigger, session, signedIn,
    { id: "n4", type: "delete", data: { table: TABLE, where: { id: "{{trigger.id}}", created_by: "{{vars.session.userId}}" }, output: "removed" } },
    { id: "n5", type: "branch", data: { left: "{{vars.removed}}", op: ">", right: "0" } },
    { id: "n6", type: "response", data: { status: 200, body: '{"ok":true,"message":"Removed."}' } },
    { id: "n7", type: "response", data: { status: 404, body: '{"error":"We couldn\'t find that place among yours."}' } },
    notSignedIn("n8"),
  ], [["n1", "n2"], ["n2", "n3"], ["n3", "n4", "true"], ["n4", "n5"], ["n5", "n6", "true"], ["n5", "n7", "false"], ["n3", "n8", "false"]]),

  // ── The owner's page only (locked to admins because only it uses them) ──
  flow("admin-list", "All places (owner)", [
    trigger,
    { id: "n2", type: "query", data: { table: TABLE, orderBy: "created_at desc", limit: 1000, output: "rows" } },
    { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
  ], [["n1", "n2"], ["n2", "n3"]]),
  flow("add", "Add a place (owner)", [
    trigger,
    { id: "n2", type: "insert", data: { table: TABLE, skipEmpty: true, values: ownerValues } },
    { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Place added."}' } },
  ], [["n1", "n2"], ["n2", "n3"]]),
  flow("admin-update", "Change a place (owner)", [
    trigger,
    { id: "n2", type: "update", data: { table: TABLE, where: { id: "{{trigger.id}}" }, values: ownerValues } },
    { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Changes saved."}' } },
  ], [["n1", "n2"], ["n2", "n3"]]),
  flow("admin-set", "Approve, reject or feature a place (owner)", [
    trigger,
    { id: "n2", type: "update", data: { table: TABLE, where: { id: "{{trigger.id}}" }, skipEmpty: true, values: { status: "{{trigger.status}}", featured: "{{trigger.featured}}" } } },
    { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Saved."}' } },
  ], [["n1", "n2"], ["n2", "n3"]]),
  flow("admin-delete", "Delete a place (owner)", [
    trigger,
    { id: "n2", type: "delete", data: { table: TABLE, where: { id: "{{trigger.id}}" } } },
    { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Deleted."}' } },
  ], [["n1", "n2"], ["n2", "n3"]]),
  flow("add-category", "Add a category (owner)", [
    trigger,
    { id: "n2", type: "insert", data: { table: "categories", skipEmpty: true, values: { name: "{{trigger.name}}", image_url: "{{trigger.image_url}}", sort_order: "{{trigger.sort_order}}" } } },
    { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Category added."}' } },
  ], [["n1", "n2"], ["n2", "n3"]]),
  flow("delete-category", "Delete a category (owner)", [
    trigger,
    { id: "n2", type: "delete", data: { table: "categories", where: { id: "{{trigger.id}}" } } },
    { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Category deleted."}' } },
  ], [["n1", "n2"], ["n2", "n3"]]),
];

/* ── Page markup ─────────────────────────────────────────────────────── */

const rootAttrs = (langs = "{{config.languages}}") =>
  `data-preset="{{config.preset}}" data-langs="${langs}" data-units="{{config.units}}" data-sort="{{config.sortBy}}" data-accent="{{config.accent}}"`;
const ROOT_ATTRS = rootAttrs();

/** Hidden pointers to the flows a page calls; the installer turns each into the flow's id. */
const flowRefs = (...slugs: string[]) => slugs.map((s) => `<span hidden data-nk-flow-ref="${s}" data-pl-flow="${s}"></span>`).join("");

const LANG_BUTTON = `<div class="pl-langwrap"><button type="button" class="pl-icbtn" id="pl-lang-btn" aria-haspopup="true" aria-expanded="false" aria-controls="pl-lang-menu" data-pl-label="language" aria-label="Change language" title="Change language"><span class="pl-ic" aria-hidden="true">${I.globe}</span></button><div class="pl-langmenu" id="pl-lang-menu" role="menu" hidden></div></div>`;
const REFRESH_BUTTON = `<button type="button" class="pl-icbtn" id="pl-refresh" data-pl-label="refresh" aria-label="Refresh" title="Refresh"><span class="pl-ic" aria-hidden="true">${I.refresh}</span></button>`;
const SIGN_IN_OUT = `<a class="pl-icbtn" href="/login" data-nk-auth="out" data-pl-label="signIn" aria-label="Sign in" title="Sign in"><span class="pl-ic" aria-hidden="true">${I.login}</span></a><a class="pl-icbtn" href="#" data-nk-auth="in" data-nk-logout-ref="logout" data-nk-redirect="/places" data-pl-label="signOut" aria-label="Sign out" title="Sign out"><span class="pl-ic" aria-hidden="true">${I.logout}</span></a>`;
const BACK_LINK = (label = "back") => `<a class="pl-icbtn" id="pl-back" href="/places" data-pl-label="${label}" aria-label="Back to the guide" title="Back to the guide"><span class="pl-ic" aria-hidden="true">${I.back}</span></a>`;

const GUIDE_HTML = `${LEAFLET_TAGS}
<div class="pl" id="pl-app" ${ROOT_ATTRS}>
${flowRefs("feed", "categories")}<a hidden id="pl-details-link" href="/details" tabindex="-1" aria-hidden="true"></a>
<header class="pl-top">
  <h1 class="pl-title" id="pl-title">{{config.title}}</h1>
  <div class="pl-actions">${LANG_BUTTON}${REFRESH_BUTTON}${SIGN_IN_OUT}</div>
</header>
<div class="pl-sheet">
  <div class="pl-bar">
    <div class="pl-tabs" role="tablist" data-pl-label="views" data-pl-notitle="" aria-label="Views">
      <button type="button" class="pl-tab" role="tab" id="pl-tab-list" data-view="list" aria-controls="pl-view-list" aria-selected="true"><span data-pl-t="list">List</span></button>
      <button type="button" class="pl-tab" role="tab" id="pl-tab-categories" data-view="categories" aria-controls="pl-view-categories" aria-selected="false" tabindex="-1"><span data-pl-t="categories">Categories</span></button>
      <button type="button" class="pl-tab" role="tab" id="pl-tab-map" data-view="map" aria-controls="pl-view-map" aria-selected="false" tabindex="-1"><span data-pl-t="map">Map</span></button>
    </div>
    <a class="pl-mine" href="/my-venues"><span class="pl-ic" aria-hidden="true">${I.edit}</span><span data-pl-t="mine">My venues</span></a>
  </div>
  <div class="pl-chiprow" id="pl-filter" hidden><span class="pl-chip"><span id="pl-filter-name"></span><button type="button" id="pl-filter-clear" data-pl-label="clear" aria-label="Clear filter" title="Clear filter"><span class="pl-ic" aria-hidden="true">${I.x}</span></button></span></div>
  <section id="pl-view-list" role="tabpanel" aria-labelledby="pl-tab-list">
    <div class="pl-tools">
      <label class="pl-search"><span class="pl-ic" aria-hidden="true">${I.search}</span><span class="pl-sr" data-pl-t="search">Search places</span><input type="search" id="pl-q" data-pl-ph="search" placeholder="Search places" autocomplete="off" enterkeyhint="search"/></label>
      <button type="button" class="pl-near" id="pl-near" aria-pressed="false" data-pl-label="nearTitle" data-pl-notitle=""><span class="pl-ic" aria-hidden="true">${I.nav}</span><span data-pl-t="near" aria-hidden="true">Near me</span></button>
    </div>
    <div class="pl-meta"><p id="pl-count"></p><p id="pl-sort-note" role="status" aria-live="polite"></p></div>
    <ul class="pl-list" id="pl-list"><li class="pl-empty" data-pl-t="loading">Loading…</li></ul>
  </section>
  <section id="pl-view-categories" role="tabpanel" aria-labelledby="pl-tab-categories" hidden>
    <ul class="pl-cats" id="pl-cats"><li class="pl-empty" data-pl-t="loading">Loading…</li></ul>
  </section>
  <section id="pl-view-map" role="tabpanel" aria-labelledby="pl-tab-map" hidden>
    <div class="pl-mapwrap" id="pl-mapwrap">
      <div class="pl-map" id="pl-map" role="region" data-pl-label="mapLabel" data-pl-notitle="" aria-label="Map of the places"></div>
      <button type="button" class="pl-mapbtn" id="pl-fit" data-pl-label="fitAll" aria-label="Show all places" title="Show all places"><span class="pl-ic" aria-hidden="true">${I.fit}</span></button>
      <div class="pl-fabs">
        <button type="button" class="pl-fab" id="pl-locate" data-pl-label="locate" aria-label="Show my location" title="Show my location"><span class="pl-ic" aria-hidden="true">${I.locate}</span></button>
      </div>
      <div class="pl-sheetcard" id="pl-card" role="group" aria-labelledby="pl-card-name" hidden>
        <img class="pl-sheetcard-img" id="pl-card-img" alt=""/>
        <div class="pl-sheetcard-body">
          <p class="pl-sheetcard-cat" id="pl-card-cat"></p>
          <h2 class="pl-sheetcard-name" id="pl-card-name" tabindex="-1"></h2>
          <p class="pl-sheetcard-addr" id="pl-card-addr"></p>
          <p class="pl-sheetcard-dist" id="pl-card-dist" hidden></p>
          <a class="pl-btn-outline" id="pl-card-link" href="/details"><span data-pl-t="seeDetails">See details</span></a>
        </div>
        <button type="button" class="pl-x" id="pl-card-close" data-pl-label="close" aria-label="Close" title="Close"><span class="pl-ic" aria-hidden="true">${I.x}</span></button>
      </div>
      <div class="pl-clist" id="pl-clist" role="group" aria-labelledby="pl-clist-title" hidden>
        <div class="pl-clist-head"><h2 id="pl-clist-title"></h2><button type="button" class="pl-x" id="pl-clist-close" data-pl-label="close" aria-label="Close" title="Close"><span class="pl-ic" aria-hidden="true">${I.x}</span></button></div>
        <ul id="pl-clist-items"></ul>
      </div>
    </div>
  </section>
  <p id="pl-live" class="pl-sr" role="status" aria-live="polite"></p>
</div>
</div>
${GUIDE_SCRIPT}`;

const DETAILS_HTML = `${LEAFLET_TAGS}
<div class="pl" id="pl-app" ${ROOT_ATTRS}>
${flowRefs("place")}
<header class="pl-top">
  ${BACK_LINK()}
  <span class="pl-title" id="pl-title">{{config.title}}</span>
  <div class="pl-actions">${LANG_BUTTON}</div>
</header>
<div class="pl-sheet">
  <div id="pl-detail"><p class="pl-empty" data-pl-t="loading">Loading…</p></div>
  <p id="pl-live" class="pl-sr" role="status" aria-live="polite"></p>
</div>
</div>
${DETAILS_SCRIPT}`;

const EN = PLACE_I18N.en;
const field = (id: string, key: string, input: string, hint = "") =>
  `<div class="pl-field"><label for="pl-f-${id}" data-pl-t="${key}">${EN[key]}</label>${input}${hint}</div>`;

const MINE_HTML = `<!--nk:require-auth-->
${LEAFLET_TAGS}
<div class="pl" id="pl-app" ${ROOT_ATTRS}>
${flowRefs("my-places", "submit", "update-mine", "delete-mine", "categories", "feed")}<a hidden id="pl-details-link" href="/details" tabindex="-1" aria-hidden="true"></a>
<header class="pl-top">
  ${BACK_LINK()}
  <h1 class="pl-title" data-pl-t="mine">My venues</h1>
  <div class="pl-actions">${LANG_BUTTON}${REFRESH_BUTTON}<a class="pl-icbtn" href="#" data-nk-logout-ref="logout" data-nk-redirect="/places" data-pl-label="signOut" aria-label="Sign out" title="Sign out"><span class="pl-ic" aria-hidden="true">${I.logout}</span></a></div>
</header>
<div class="pl-sheet">
  <p class="pl-intro" data-pl-t="mineIntro">Add your place to the guide. The team checks every new place and every change before it goes live.</p>
  <a class="pl-admin-link" href="/places-admin" data-nk-role="admin"><span data-pl-t="manage">Manage all places</span><span class="pl-ic" aria-hidden="true">${I.chev}</span></a>
  <section aria-labelledby="pl-subs-h">
    <h2 class="pl-h2" id="pl-subs-h" data-pl-t="yourSubs">Your places</h2>
    <ul class="pl-mylist" id="pl-mylist"><li class="pl-empty pl-empty-sm" data-pl-t="loading">Loading…</li></ul>
  </section>
  <section class="pl-formcard" aria-labelledby="pl-form-h">
    <h2 class="pl-h2" id="pl-form-h">Add a venue</h2>
    <form id="pl-form" autocomplete="on">
      <div class="pl-cols">
        ${field("name", "name", `<input class="pl-input" id="pl-f-name" name="name" required maxlength="120" autocomplete="organization"/>`)}
        ${field("category", "category", `<select class="pl-input" id="pl-f-category" name="category" required><option value="">Choose a category</option></select>`)}
      </div>
      ${field("description", "description", `<textarea class="pl-input" id="pl-f-description" name="description" maxlength="2000" rows="4"></textarea>`)}
      ${field("address", "address", `<input class="pl-input" id="pl-f-address" name="address" required maxlength="200" autocomplete="street-address"/>`)}
      <fieldset>
        <legend class="pl-legend" data-pl-t="locationLegend">Location on the map</legend>
        <div class="pl-locrow"><button type="button" class="pl-small-btn" id="pl-f-locate"><span class="pl-ic" aria-hidden="true">${I.locate}</span><span data-pl-t="useMyLocation">Use my current location</span></button></div>
        <p class="pl-hint" id="pl-pick-hint" data-pl-t="pickHint">Tap the map to place the pin, then drag it to the exact spot.</p>
        <div class="pl-pick" id="pl-pick" role="region" aria-describedby="pl-pick-hint" data-pl-label="locationLegend" data-pl-notitle=""></div>
        <div class="pl-row2">
          ${field("lat", "lat", `<input class="pl-input" id="pl-f-lat" name="lat" type="number" step="any" min="-90" max="90" inputmode="decimal" required/>`)}
          ${field("lng", "lng", `<input class="pl-input" id="pl-f-lng" name="lng" type="number" step="any" min="-180" max="180" inputmode="decimal" required/>`)}
        </div>
      </fieldset>
      <div class="pl-cols">
        ${field("phone", "phone", `<input class="pl-input" id="pl-f-phone" name="phone" type="tel" maxlength="40" autocomplete="tel"/>`)}
        ${field("website", "website", `<input class="pl-input" id="pl-f-website" name="website" inputmode="url" maxlength="300" autocomplete="url" placeholder="https://"/>`)}
      </div>
      ${field("hours", "hours", `<textarea class="pl-input" id="pl-f-hours" name="hours" rows="3" maxlength="400" aria-describedby="pl-hours-hint"></textarea>`, `<p class="pl-hint" id="pl-hours-hint" data-pl-t="hoursHint">${EN.hoursHint}</p>`)}
      <div class="pl-field" id="pl-f-current-wrap" hidden><span class="pl-legend" data-pl-t="currentPhotos">Current photos</span><div class="pl-photos" id="pl-f-current"></div><p class="pl-hint" data-pl-t="photosReplace">${EN.photosReplace}</p></div>
      ${field("photos", "photos", `<input class="pl-input" id="pl-f-photos" type="file" accept="image/*" multiple aria-describedby="pl-photos-hint"/>`, `<p class="pl-hint" id="pl-photos-hint" data-pl-t="photosHint">${EN.photosHint}</p><div class="pl-photos" id="pl-f-preview"></div>`)}
      <div class="pl-formbtns">
        <button type="submit" class="pl-btn" id="pl-f-submit">Send for approval</button>
        <button type="button" class="pl-btn2" id="pl-f-cancel" hidden><span data-pl-t="cancel">Cancel</span></button>
      </div>
      <div class="pl-msg" id="pl-form-msg" role="status" aria-live="polite"></div>
    </form>
  </section>
  <p id="pl-live" class="pl-sr" role="status" aria-live="polite"></p>
</div>
</div>
${MINE_SCRIPT}`;

const afield = (id: string, label: string, input: string, hint = "") =>
  `<div class="pl-field"><label for="pl-a-${id}">${label}</label>${input}${hint}</div>`;

const ADMIN_HTML = `${LEAFLET_TAGS}
<div class="pl" id="pl-app" ${rootAttrs("en")}>
${flowRefs("admin-list", "add", "admin-update", "admin-set", "admin-delete", "categories", "add-category", "delete-category")}<a hidden id="pl-details-link" href="/details" tabindex="-1" aria-hidden="true"></a>
<header class="pl-top">
  ${BACK_LINK()}
  <h1 class="pl-title">Manage places</h1>
  <div class="pl-actions">${REFRESH_BUTTON}</div>
</header>
<div class="pl-sheet">
  <div class="pl-bar">
    <div class="pl-tabs" role="tablist" aria-label="Sections">
      <button type="button" class="pl-tab" role="tab" data-view="review" aria-controls="pl-a-review" aria-selected="true">To review<span class="pl-badge-n" id="pl-a-count" hidden>0</span></button>
      <button type="button" class="pl-tab" role="tab" data-view="all" aria-controls="pl-a-all" aria-selected="false" tabindex="-1">All places</button>
      <button type="button" class="pl-tab" role="tab" data-view="cats" aria-controls="pl-a-cats" aria-selected="false" tabindex="-1">Categories</button>
    </div>
    <button type="button" class="pl-mine" id="pl-a-add"><span class="pl-ic" aria-hidden="true">${I.plus}</span><span>Add a place</span></button>
  </div>
  <div class="pl-msg" id="pl-a-msg" role="status" aria-live="polite"></div>
  <section class="pl-formcard pl-editor" id="pl-a-editor" aria-labelledby="pl-a-editor-h" hidden>
    <h2 class="pl-h2" id="pl-a-editor-h">Add a place</h2>
    <form id="pl-a-form">
      <div class="pl-cols">
        ${afield("name", "Name", `<input class="pl-input" id="pl-a-name" required maxlength="120"/>`)}
        ${afield("category", "Category", `<input class="pl-input" id="pl-a-category" list="pl-a-catnames" maxlength="80"/><datalist id="pl-a-catnames"></datalist>`)}
      </div>
      ${afield("description", "Description", `<textarea class="pl-input" id="pl-a-description" rows="4" maxlength="4000"></textarea>`)}
      ${afield("address", "Address", `<input class="pl-input" id="pl-a-address" maxlength="200"/>`)}
      <fieldset>
        <legend class="pl-legend">Location on the map</legend>
        <div class="pl-locrow"><button type="button" class="pl-small-btn" id="pl-a-locate"><span class="pl-ic" aria-hidden="true">${I.locate}</span><span>Use my current location</span></button></div>
        <p class="pl-hint" id="pl-a-pick-hint">Tap the map to place the pin, then drag it to the exact spot.</p>
        <div class="pl-pick" id="pl-a-pick" role="region" aria-label="Location on the map" aria-describedby="pl-a-pick-hint"></div>
        <div class="pl-row2">
          ${afield("lat", "Latitude", `<input class="pl-input" id="pl-a-lat" type="number" step="any" min="-90" max="90" inputmode="decimal" required/>`)}
          ${afield("lng", "Longitude", `<input class="pl-input" id="pl-a-lng" type="number" step="any" min="-180" max="180" inputmode="decimal" required/>`)}
        </div>
      </fieldset>
      <div class="pl-cols">
        ${afield("phone", "Phone", `<input class="pl-input" id="pl-a-phone" type="tel" maxlength="40"/>`)}
        ${afield("website", "Website", `<input class="pl-input" id="pl-a-website" inputmode="url" maxlength="300" placeholder="https://"/>`)}
      </div>
      ${afield("hours", "Opening hours", `<textarea class="pl-input" id="pl-a-hours" rows="3" maxlength="400" placeholder="Mon–Fri 9:00–18:00"></textarea>`)}
      ${afield("image_url", "Main photo", `<input class="pl-input" id="pl-a-image_url" maxlength="500" placeholder="/uploads/… or https://…" aria-describedby="pl-a-photo-hint"/>`, `<p class="pl-hint" id="pl-a-photo-hint">Upload a picture or paste a link to one.</p><input class="pl-input" id="pl-a-upload" type="file" accept="image/*" aria-label="Upload the main photo"/>`)}
      ${afield("gallery", "More photos", `<textarea class="pl-input" id="pl-a-gallery" rows="3" aria-describedby="pl-a-gallery-hint"></textarea>`, `<p class="pl-hint" id="pl-a-gallery-hint">One link per line. They show as a gallery on the place's page.</p><input class="pl-input" id="pl-a-upload-more" type="file" accept="image/*" multiple aria-label="Upload more photos"/>`)}
      <div class="pl-cols">
        ${afield("status", "Status", `<select class="pl-input" id="pl-a-status"><option value="approved">Live in the guide</option><option value="pending">Waiting for review</option><option value="rejected">Not accepted (hidden)</option></select>`)}
        ${afield("sort_order", "Order", `<input class="pl-input" id="pl-a-sort_order" type="number" step="1" min="0" aria-describedby="pl-a-order-hint"/>`, `<p class="pl-hint" id="pl-a-order-hint">Lower numbers come first, after featured places.</p>`)}
      </div>
      <label class="pl-check"><input type="checkbox" id="pl-a-featured"/> Featured (shown first, with a badge)</label>
      <div class="pl-formbtns">
        <button type="submit" class="pl-btn" id="pl-a-save">Add place</button>
        <button type="button" class="pl-btn2" id="pl-a-cancel">Cancel</button>
      </div>
      <div class="pl-msg" id="pl-a-form-msg" role="status" aria-live="polite"></div>
    </form>
  </section>
  <section id="pl-a-review" role="tabpanel" class="pl-section">
    <p class="pl-intro">Places that signed-in visitors sent, or changed, wait here until you approve them. Approved places show in the guide straight away.</p>
    <ul class="pl-alist" id="pl-a-pending"><li class="pl-empty pl-empty-sm">Loading…</li></ul>
  </section>
  <section id="pl-a-all" role="tabpanel" class="pl-section" hidden>
    <div class="pl-atools"><label class="pl-search"><span class="pl-ic" aria-hidden="true">${I.search}</span><span class="pl-sr">Search places</span><input type="search" id="pl-a-q" placeholder="Search places" autocomplete="off"/></label></div>
    <ul class="pl-alist" id="pl-a-list"></ul>
  </section>
  <section id="pl-a-cats" role="tabpanel" class="pl-section" hidden>
    <form class="pl-formcard" id="pl-a-catform" style="margin-bottom:16px;">
      <h2 class="pl-h2">Add a category</h2>
      <div class="pl-cols">
        ${afield("catname", "Name", `<input class="pl-input" id="pl-a-catname" required maxlength="80"/>`)}
        ${afield("catimg", "Picture link <span class=\"pl-opt\">(optional)</span>", `<input class="pl-input" id="pl-a-catimg" maxlength="500" placeholder="/media/… or https://…"/>`)}
      </div>
      <button type="submit" class="pl-btn">Add category</button>
    </form>
    <p class="pl-hint" style="margin-bottom:10px;">Deleting a category doesn't delete its places. Categories without places are hidden from visitors.</p>
    <ul class="pl-alist" id="pl-a-catlist"></ul>
  </section>
  <p id="pl-live" class="pl-sr" role="status" aria-live="polite"></p>
</div>
</div>
${ADMIN_SCRIPT}`;

export const places: ModuleDefinition = {
  id: "places",
  name: "Places",
  tagline: "A city guide, directory or venue finder on a map, nearest first",
  description:
    "A phone-friendly guide to places: a list, categories and a map with photo pins. Visitors search, share their location to see the nearest places first, and open a place for photos, opening hours, a call button and directions. Signed-in visitors can suggest their own venue, which waits for your approval. Comes in five languages, with ready-made examples for a tourist guide, restaurants, a business directory or wedding and event venues.",
  icon: "",
  color: "from-sky-500 to-blue-700",
  category: "utility",
  version: "2.0.0",
  // "map" only: the phone's location permission comes from the pages that
  // use it (lib/native-permissions.ts scans them), so apps that still have
  // the 1.0.0 pages, which never ask for it, don't start asking.
  provides: ["map"],
  requires: ["auth-session", "auth-users"],
  worksWith: ["auth", "map", "store-locator", "reviews", "bookings", "events", "user-favorites"],
  config: [
    {
      key: "preset",
      label: "Use for",
      type: "select",
      default: "tourist",
      options: [
        { value: "tourist", label: "Tourist or city guide" },
        { value: "restaurants", label: "Restaurants" },
        { value: "directory", label: "Business directory" },
        { value: "venues", label: "Wedding & event venues" },
      ],
      help: "Sets the categories, the wording and the example places it starts with. You can change all of them afterwards.",
    },
    {
      key: "title",
      label: "Guide title",
      type: "text",
      placeholder: "City Guide",
      help: "Shown at the top of the guide. Leave it empty to use a title that fits what it's for, in each visitor's language.",
    },
    {
      key: "languages",
      label: "Languages",
      type: "select",
      default: "en,es,pt,fr,de",
      options: [
        { value: "en,es,pt,fr,de", label: "All five, English first" },
        { value: "es,en,pt,fr,de", label: "All five, Spanish first" },
        { value: "pt,en,es,fr,de", label: "All five, Portuguese first" },
        { value: "fr,en,es,pt,de", label: "All five, French first" },
        { value: "de,en,es,pt,fr", label: "All five, German first" },
        { value: "en", label: "English only" },
        { value: "en,es", label: "English and Spanish" },
        { value: "en,pt", label: "English and Portuguese" },
        { value: "en,fr", label: "English and French" },
        { value: "en,de", label: "English and German" },
      ],
      help: "Visitors switch with the globe button. Their phone's language is used when it's offered, otherwise the first one. Place names and descriptions show as you wrote them.",
    },
    {
      key: "sortBy",
      label: "Order of the list",
      type: "select",
      default: "featured",
      options: [
        { value: "featured", label: "Featured places first, then your order" },
        { value: "name", label: "A to Z" },
      ],
      help: "When a visitor shares their location, the nearest places always come first.",
    },
    {
      key: "units",
      label: "Distances in",
      type: "select",
      default: "km",
      options: [
        { value: "km", label: "Kilometres" },
        { value: "mi", label: "Miles" },
      ],
    },
    {
      key: "accent",
      label: "Colour",
      type: "select",
      default: "blue",
      options: [
        { value: "blue", label: "Blue" },
        { value: "theme", label: "My app's main colour" },
      ],
      help: "The colour of the guide's header, buttons and map pins. Text and backgrounds always follow your app's theme.",
    },
  ],
  tables: [
    {
      name: TABLE,
      fields: [
        // 1.0.0 columns, unchanged.
        { name: "name", type: "text" },
        { name: "category", type: "text" },
        { name: "address", type: "text" },
        { name: "description", type: "text" },
        { name: "phone", type: "text" },
        { name: "website", type: "text" },
        { name: "lat", type: "float" },
        { name: "lng", type: "float" },
        // Added in 2.0.0.
        { name: "image_url", type: "text" },
        { name: "gallery", type: "text" },
        { name: "hours", type: "text" },
        { name: "featured", type: "bool" },
        { name: "sort_order", type: "int" },
        { name: "status", type: "text" },
        { name: "submitted_by", type: "text" },
      ],
      seed: PLACE_SEEDS.tourist,
      seedByConfig: { key: "preset", rows: PLACE_SEEDS },
    },
    {
      name: "categories",
      fields: [
        { name: "name", type: "text" },
        { name: "image_url", type: "text" },
        { name: "sort_order", type: "int" },
      ],
      seed: CATEGORY_SEEDS.tourist,
      seedByConfig: { key: "preset", rows: CATEGORY_SEEDS },
    },
  ],
  flows: FLOWS,
  pages: [
    { slug: "places", title: "Places", isHome: true, html: GUIDE_HTML, css: PLACES_CSS },
    { slug: "details", title: "Place details", html: DETAILS_HTML, css: PLACES_CSS },
    { slug: "my-venues", title: "My places", html: MINE_HTML, css: PLACES_CSS },
    { slug: "places-admin", title: "Manage places", ownerOnly: true, html: ADMIN_HTML, css: PLACES_CSS },
  ],
};
