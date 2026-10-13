import type { ModuleDefinition, ModuleFlowEdge, ModuleFlowNode } from "../types";

/**
 * AI companion: an animated character visitors chat and talk with. It
 * remembers what people tell it (memories), has a mood and a closeness
 * level, reads replies aloud and listens through the browser's microphone,
 * and lets visitors report a reply. It runs on the app's own AI key
 * (docs/ai-in-apps.md); without one, visitors read "This app's AI isn't set
 * up yet." from the flow's error.
 *
 * Every conversation is one visitor's, keyed by a random id the page keeps
 * in localStorage. The database drops empty filters, so every flow that
 * filters by conversation_id first checks it (guard() below) and answers
 * 400 when it is missing or malformed; the steps then use the checked
 * {{vars.cid}}, never the raw input.
 */

const MOODS = ["happy", "curious", "thinking", "sad", "surprised", "calm"];

/** Returns the checked conversation id, or "" when it is missing or malformed. */
const CID_CODE = String.raw`var c = trigger && typeof trigger.conversation_id === 'string' ? trigger.conversation_id.trim() : '';
return /^[A-Za-z0-9_-]{16,64}$/.test(c) ? c : '';`;

/**
 * The first steps of every per-conversation flow: the id must be there
 * (g2), and well-formed (g3 + g4), or the flow answers 400 (g5). The flow
 * carries on at `next` with the id in {{vars.cid}}.
 */
function guard(next: string): { nodes: ModuleFlowNode[]; edges: ModuleFlowEdge[] } {
  return {
    nodes: [
      { id: "g1", type: "trigger", data: {} },
      { id: "g2", type: "branch", data: { label: "Has a conversation id?", left: "{{trigger.conversation_id}}", op: "exists", right: "" } },
      { id: "g3", type: "custom_js", data: { label: "Check the conversation id", code: CID_CODE, output: "cid" } },
      { id: "g4", type: "branch", data: { label: "Conversation id is valid?", left: "{{vars.cid}}", op: "exists", right: "" } },
      { id: "g5", type: "response", data: { status: 400, body: '{"error":"This conversation could not be found. Please reload the page."}' } },
    ],
    edges: [
      { id: "ge1", source: "g1", target: "g2" },
      { id: "ge2", source: "g2", target: "g3", sourceHandle: "true" },
      { id: "ge3", source: "g2", target: "g5", sourceHandle: "false" },
      { id: "ge4", source: "g3", target: "g4" },
      { id: "ge5", source: "g4", target: next, sourceHandle: "true" },
      { id: "ge6", source: "g4", target: "g5", sourceHandle: "false" },
    ],
  };
}

const START_STATE_CODE = String.raw`var row = Array.isArray(vars.mood) && vars.mood[0] ? vars.mood[0] : null;
var moods = ${JSON.stringify(MOODS)};
var mood = row && moods.indexOf(String(row.mood)) >= 0 ? String(row.mood) : 'happy';
var closeness = row ? Math.max(0, Math.min(100, Math.round(Number(row.closeness) || 0))) : 0;
return { mood: mood, closeness: closeness };`;

/** What the companion knows right now: its mood, how close it is with the person, and their remembered facts. */
const CHAT_CONTEXT_CODE = String.raw`var facts = (Array.isArray(vars.memories) ? vars.memories : [])
  .map(function (m) { return String((m && m.fact) || '').replace(/\s+/g, ' ').trim(); })
  .filter(Boolean)
  .reverse();
var row = Array.isArray(vars.mood) && vars.mood[0] ? vars.mood[0] : null;
var moods = ${JSON.stringify(MOODS)};
var mood = row && moods.indexOf(String(row.mood)) >= 0 ? String(row.mood) : 'happy';
var closeness = row ? Math.max(0, Math.min(100, Math.round(Number(row.closeness) || 0))) : 0;
var level = closeness >= 75 ? 'close friends' : closeness >= 45 ? 'good friends' : closeness >= 20 ? 'getting to know each other' : 'just met';
vars.now_mood = mood;
vars.now_closeness = closeness;
vars.has_mood = !!row;
vars.facts_text = facts.length ? '- ' + facts.join('\n- ') : '(nothing yet)';
return 'Your mood right now: ' + mood + '.\n' +
  'How close you are with this person: ' + closeness + ' out of 100 (' + level + ').\n' +
  (facts.length
    ? 'Things this person told you before (bring them up naturally when it fits; never read them out as a list):\n' + vars.facts_text
    : 'You do not know anything about this person yet.');`;

/** The AI's mood and memory check, cleaned up: a known mood, closeness kept to 0..100, at most 3 new facts. */
const CHAT_STATE_CODE = String.raw`var d = vars.analysis && typeof vars.analysis === 'object' && !Array.isArray(vars.analysis) ? vars.analysis : {};
var moods = ${JSON.stringify(MOODS)};
var mood = String(d.mood || '').toLowerCase().trim();
if (moods.indexOf(mood) < 0) mood = moods.indexOf(vars.now_mood) >= 0 ? vars.now_mood : 'happy';
var change = Math.max(-5, Math.min(5, Math.round(Number(d.closeness_change) || 0)));
var closeness = Math.max(0, Math.min(100, Math.round((Number(vars.now_closeness) || 0) + change)));
var known = {};
(Array.isArray(vars.memories) ? vars.memories : []).forEach(function (m) { known[String((m && m.fact) || '').toLowerCase().trim()] = true; });
var facts = Array.isArray(d.new_facts) ? d.new_facts : [];
var rows = [];
for (var i = 0; i < facts.length && rows.length < 3; i++) {
  var f = typeof facts[i] === 'string' ? facts[i].replace(/\s+/g, ' ').trim().slice(0, 200) : '';
  if (f && !known[f.toLowerCase()]) {
    known[f.toLowerCase()] = true;
    rows.push({ conversation_id: vars.cid, fact: f });
  }
}
vars.new_memories = rows;
return { mood: mood, closeness: closeness, change: change, has_row: !!vars.has_mood };`;

const HISTORY_CODE = String.raw`var rows = Array.isArray(vars.rows) ? vars.rows.slice().reverse() : [];
return rows
  .filter(function (r) { return r && r.content != null && String(r.content) !== ''; })
  .map(function (r) { return { role: r.role === 'assistant' ? 'assistant' : 'user', content: String(r.content) }; });`;

const REPORT_CLEAN_CODE = String.raw`var m = typeof trigger.message === 'string' ? trigger.message.trim().slice(0, 2000) : '';
var r = typeof trigger.reason === 'string' ? trigger.reason.replace(/\s+/g, ' ').trim().slice(0, 500) : '';
return { message: m, reason: r || '(no reason given)' };`;

const PERSONA = `You are {{config.companionName}}, an animated AI companion character inside this app.

Your personality: {{config.personality}}

Boundaries you always keep: {{config.boundaries}}

How you talk: like a friend in a chat. Reply in 1 to 4 short sentences of plain text: no lists, headings, markdown, emoji or stage directions such as *smiles*. Ask a light follow-up question now and then, and keep the conversation about the person. Reply in the language the person writes in. Your mood and how close you are with the person colour your tone, but you always stay kind, honest and supportive. You are an AI character: say so if asked, and never claim to be a real person.`;

const ANALYSIS_SYSTEM = `You read one exchange between a person and their AI companion, {{config.companionName}}. You decide how {{config.companionName}} feels afterwards, how the friendship changed, and which facts about the person are worth remembering. Always include all three keys.`;

const ANALYSIS_PROMPT = `The person wrote: {{trigger.message}}

{{config.companionName}} replied: {{vars.reply}}

{{config.companionName}}'s mood before: {{vars.now_mood}}. Closeness before: {{vars.now_closeness}} out of 100.

Already remembered about the person:
{{vars.facts_text}}

Rules:
- mood: {{config.companionName}}'s mood after this exchange, exactly one of: happy, curious, thinking, sad, surprised, calm.
- closeness_change: a whole number from -5 to 5. Positive when the person was friendly, shared something about themselves or had a nice chat; 0 for neutral small talk; negative when they were rude or hostile.
- new_facts: up to 3 short facts the person shared about THEMSELVES that are worth remembering in later chats (their name, likes, hobbies, plans, pets, people who matter to them), each one short sentence in the third person, such as "Their name is Sam." Leave out anything already remembered, anything about {{config.companionName}}, and private or sensitive details (health, addresses, phone numbers, passwords, money, exact location). Use [] when there is nothing new.`;

const ANALYSIS_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    mood: { type: "string", enum: MOODS },
    closeness_change: { type: "integer", minimum: -5, maximum: 5 },
    new_facts: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  // Kept lenient on purpose: the next step fills in anything left out, so a
  // half answer never fails a chat whose reply is already saved.
  required: [],
});

const startGuard = guard("n6");
const chatGuard = guard("n6");
const historyGuard = guard("n6");
const speakGuard = guard("n6");
const reportGuard = guard("n6");
const forgetGuard = guard("n6");

/* ── The companion page ──────────────────────────────────────────────── */

const HEART = `<svg class="nkc-heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5s-7.4-4.5-9.4-9C1.2 8.2 3.1 4.5 6.7 4.5c2.1 0 3.5 1.1 4.3 2.4h2c.8-1.3 2.2-2.4 4.3-2.4 3.6 0 5.5 3.7 4.1 7-2 4.5-9.4 9-9.4 9z"/></svg>`;

const COMPANION_HTML = String.raw`<section class="nkc py-4 py-lg-5" id="nkc" data-voice-default="{{config.voiceDefault}}">
<div class="container" style="max-width:1100px;">
<div class="row g-3 g-lg-4 align-items-start">
<div class="col-12 col-lg-5">
<div class="nkc-card nkc-side p-3 p-lg-4">
<div class="d-flex flex-row flex-lg-column align-items-center gap-3 text-lg-center">
<div class="nkc-stage is-happy" id="nkc-stage">
<div class="nkc-photo-wrap" id="nkc-photo-wrap" hidden><img id="nkc-photo" class="nkc-photo" alt="" decoding="async"/></div>
<svg class="nkc-svg" id="nkc-svg" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
<defs><radialGradient id="nkc-grad" cx="38%" cy="30%" r="78%"><stop offset="0%" class="nkc-stop1"/><stop offset="100%" class="nkc-stop2"/></radialGradient></defs>
<ellipse class="nkc-shadow" cx="120" cy="226" rx="60" ry="8"/>
<g class="nkc-bob"><g class="nkc-tilt">
<g class="nkc-sprout"><path class="nkc-stem" d="M120 48 C119 36 120 28 122 18" stroke-width="5"/><path class="nkc-leaf" d="M122 19 C108 6 92 12 95 25 C107 29 117 26 122 19Z"/><path class="nkc-leaf" d="M122 19 C135 5 152 10 149 23 C138 28 127 26 122 19Z"/></g>
<circle class="nkc-head" cx="120" cy="134" r="86" fill="url(#nkc-grad)"/>
<ellipse class="nkc-shine" cx="86" cy="88" rx="22" ry="12" transform="rotate(-28 86 88)"/>
<ellipse class="nkc-cheek" cx="70" cy="156" rx="14" ry="8"/><ellipse class="nkc-cheek" cx="170" cy="156" rx="14" ry="8"/>
<path class="nkc-brow nkc-brow-l" d="M68 96 Q83 87 99 93"/><path class="nkc-brow nkc-brow-r" d="M141 93 Q157 87 172 96"/>
<g class="nkc-blink">
<g class="nkc-eye"><ellipse class="nkc-eye-white" cx="85" cy="124" rx="16" ry="19"/><g class="nkc-pupil"><circle cx="85" cy="126" r="9.5"/><circle class="nkc-glint" cx="89" cy="121" r="3.2"/></g></g>
<g class="nkc-eye"><ellipse class="nkc-eye-white" cx="155" cy="124" rx="16" ry="19"/><g class="nkc-pupil"><circle cx="155" cy="126" r="9.5"/><circle class="nkc-glint" cx="159" cy="121" r="3.2"/></g></g>
</g>
<path class="nkc-mouth nkc-m-grin" d="M98 162 Q120 192 142 162 Z"/>
<path class="nkc-mouth nkc-m-smile" d="M103 166 Q120 181 137 166"/>
<path class="nkc-mouth nkc-m-flat" d="M104 171 Q112 166 120 171 T136 170"/>
<path class="nkc-mouth nkc-m-frown" d="M104 178 Q120 164 136 178"/>
<ellipse class="nkc-mouth nkc-m-o" cx="120" cy="172" rx="9" ry="12"/>
<ellipse class="nkc-mouth nkc-m-talk" cx="120" cy="170" rx="14" ry="10"/>
<g class="nkc-dots"><circle cx="190" cy="62" r="5"/><circle cx="204" cy="46" r="7"/><circle cx="222" cy="28" r="9"/></g>
</g></g>
</svg>
</div>
<div class="flex-grow-1 w-100" style="min-width:0;">
<h1 class="h3 fw-bold mb-1">{{config.companionName}}</h1>
<div class="small mb-2" style="color:var(--nk-text-muted);"><span>Mood:</span> <span id="nkc-mood" class="fw-semibold" style="color:var(--nk-text);">Happy</span></div>
<div id="nkc-meter" class="nkc-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Closeness">
<div class="d-flex align-items-center gap-1 justify-content-lg-center" aria-hidden="true">${HEART}${HEART}${HEART}${HEART}${HEART}</div>
<div class="nkc-bar mt-2" aria-hidden="true"><span id="nkc-bar"></span></div>
<div class="small mt-1" style="color:var(--nk-text-muted);"><span>Closeness:</span> <span id="nkc-level">Just met</span></div>
</div>
</div>
</div>
</div>
</div>
<div class="col-12 col-lg-7">
<div class="nkc-card d-flex flex-column overflow-hidden">
<div class="nkc-toolbar d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2">
<div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" id="nkc-voice"/><label class="form-check-label small" for="nkc-voice">Read replies aloud</label></div>
<button type="button" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" id="nkc-reset"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg><span>Start over</span></button>
</div>
<div id="nkc-log" class="nkc-log" role="log" aria-live="polite" aria-label="Conversation"></div>
<div id="nkc-typing" class="nkc-typing px-3 pb-2" hidden><span class="nkc-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span> <span>{{config.companionName}} is thinking…</span></div>
<div id="nkc-error" class="nkc-error text-danger small px-3 pb-2" role="alert"></div>
<form id="nkc-form" class="nkc-composer d-flex align-items-center gap-2 p-2 p-sm-3" autocomplete="off">
<label for="nkc-input" class="visually-hidden">Your message</label>
<input id="nkc-input" class="form-control" type="text" maxlength="1000" placeholder="Type a message…" enterkeyhint="send"/>
<button type="button" id="nkc-mic" class="btn btn-outline-secondary nkc-mic flex-shrink-0" aria-pressed="false" aria-label="Talk instead of typing" title="Talk instead of typing"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg></button>
<button type="submit" id="nkc-send" class="btn btn-primary flex-shrink-0 d-inline-flex align-items-center gap-1" aria-label="Send"><svg class="nkc-send-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12l16-8-6 16-2.5-6.5z"/></svg><span class="d-none d-sm-inline">Send</span></button>
</form>
</div>
<p class="small mt-3 mb-0" style="color:var(--nk-text-muted);">{{config.companionName}} is an AI character. Replies are written by AI and can be wrong. Don't share private information.</p>
</div>
</div>
</div>
<div hidden id="nkc-avatars">{{config.avatarImages}}</div>
<div hidden id="nkc-texts">
<span data-nkc-t="name">{{config.companionName}}</span>
<span data-nkc-t="you">You</span>
<span data-nkc-t="report">Report</span>
<span data-nkc-t="reported">Reported. Thank you.</span>
<span data-nkc-t="report-prompt">What's wrong with this reply? (optional)</span>
<span data-nkc-t="reset-confirm">Start over? {{config.companionName}} will forget this conversation and everything you shared.</span>
<span data-nkc-t="failed">Sorry, something went wrong. Please try again.</span>
<span data-nkc-t="listening">Listening…</span>
<span data-nkc-t="mic-denied">The microphone is blocked. Allow it in your browser to talk out loud.</span>
<span data-nkc-t="remembered">{{config.companionName}} will remember that.</span>
<span data-nkc-t="mood-happy">Happy</span>
<span data-nkc-t="mood-curious">Curious</span>
<span data-nkc-t="mood-thinking">Thinking</span>
<span data-nkc-t="mood-sad">A little sad</span>
<span data-nkc-t="mood-surprised">Surprised</span>
<span data-nkc-t="mood-calm">Calm</span>
<span data-nkc-t="level-1">Just met</span>
<span data-nkc-t="level-2">Getting to know each other</span>
<span data-nkc-t="level-3">Good friends</span>
<span data-nkc-t="level-4">Close friends</span>
</div>
<script>(function(){
  var root = document.getElementById('nkc');
  if (!root || root.getAttribute('data-nkc-ready')) return;
  root.setAttribute('data-nkc-ready', '1');
  function q(sel){ return root.querySelector(sel); }
  function t(key){ var el = root.querySelector('[data-nkc-t="' + key + '"]'); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  var MOODS = ['happy', 'curious', 'thinking', 'sad', 'surprised', 'calm'];
  var stage = q('#nkc-stage'), svg = q('#nkc-svg'), photoWrap = q('#nkc-photo-wrap'), photo = q('#nkc-photo');
  var moodEl = q('#nkc-mood'), meter = q('#nkc-meter'), bar = q('#nkc-bar'), levelEl = q('#nkc-level');
  var log = q('#nkc-log'), typing = q('#nkc-typing'), errorEl = q('#nkc-error');
  var form = q('#nkc-form'), input = q('#nkc-input'), sendBtn = q('#nkc-send'), mic = q('#nkc-mic');
  var voiceEl = q('#nkc-voice'), resetBtn = q('#nkc-reset');
  var name = t('name');
  var placeholder = input.getAttribute('placeholder') || '';

  /* One conversation per visitor and app, kept in this browser. */
  var KEY = 'nk-ai-companion:' + (window.__nkProjectId || location.host);
  function load(k){ try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function store(k, v){ try { if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v); } catch (e) {} }
  function newId(){
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    var a = new Uint8Array(16), s = '';
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else for (var i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
    for (var j = 0; j < 16; j++) s += ('0' + a[j].toString(16)).slice(-2);
    return s;
  }
  var cid = load(KEY);
  if (!cid || !/^[A-Za-z0-9_-]{16,64}$/.test(cid)) { cid = newId(); store(KEY, cid); }

  /* Calls one of the feature's flows; a flow's own error text is shown as it is. */
  function run(url, body){
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body || {}) })
      .then(function(r){
        return r.json().catch(function(){ return null; }).then(function(j){
          if (!r.ok || (j && !Array.isArray(j) && j.error)) throw new Error((j && j.error) || t('failed'));
          return j;
        });
      });
  }
  function showError(msg){ errorEl.textContent = msg || ''; }

  /* Pictures from the settings ("happy=https://…"), or the drawn character. */
  var photos = {}, firstPhoto = '';
  (q('#nkc-avatars').textContent || '').split(/\r?\n/).forEach(function(line){
    var s = line.trim(), key = 'neutral', url = s;
    var m = /^([A-Za-z]+)\s*[=:]\s*(\S+)$/.exec(s);
    if (m && !/^https?$/i.test(m[1])) { key = m[1].toLowerCase(); url = m[2]; }
    if (!/^(https?:\/\/|\/(?!\/))\S+$/i.test(url)) return;
    photos[key] = url;
    if (!firstPhoto) firstPhoto = url;
  });
  var hasPhotos = !!firstPhoto;
  if (hasPhotos) { svg.style.display = 'none'; photoWrap.hidden = false; photo.alt = name; }

  /* Mood and closeness. */
  var state = { mood: 'happy', closeness: 0 };
  function showMood(m){
    MOODS.forEach(function(x){ stage.classList.toggle('is-' + x, x === m); });
    moodEl.textContent = t('mood-' + m) || m;
    if (hasPhotos) {
      var src = photos[m] || photos.neutral || photos.happy || firstPhoto;
      if (photo.getAttribute('src') !== src) photo.setAttribute('src', src);
    }
  }
  function setState(mood, closeness){
    if (MOODS.indexOf(mood) >= 0) state.mood = mood;
    var c = Number(closeness);
    if (closeness !== undefined && closeness !== null && closeness !== '' && isFinite(c)) state.closeness = Math.max(0, Math.min(100, Math.round(c)));
    showMood(state.mood);
    var full = Math.round(state.closeness / 20);
    var hearts = root.querySelectorAll('.nkc-heart');
    for (var i = 0; i < hearts.length; i++) hearts[i].classList.toggle('is-on', i < full);
    bar.style.width = state.closeness + '%';
    var level = t(state.closeness >= 75 ? 'level-4' : state.closeness >= 45 ? 'level-3' : state.closeness >= 20 ? 'level-2' : 'level-1');
    levelEl.textContent = level;
    meter.setAttribute('aria-valuenow', String(state.closeness));
    meter.setAttribute('aria-valuetext', level);
  }

  /* The conversation. */
  function addMessage(role, text, opts){
    opts = opts || {};
    var ai = role === 'assistant';
    var row = document.createElement('div');
    row.className = 'nkc-row ' + (ai ? 'nkc-row-ai' : 'nkc-row-me');
    var who = document.createElement('span');
    who.className = 'visually-hidden';
    who.textContent = (ai ? name : t('you')) + ': ';
    var bubble = document.createElement('div');
    bubble.className = 'nkc-bubble';
    bubble.appendChild(who);
    bubble.appendChild(document.createTextNode(text));
    row.appendChild(bubble);
    if (opts.note) {
      var note = document.createElement('div');
      note.className = 'nkc-note';
      note.textContent = opts.note;
      row.appendChild(note);
    }
    if (ai && !opts.noReport) {
      var rep = document.createElement('button');
      rep.type = 'button';
      rep.className = 'nkc-report btn btn-link p-0';
      rep.textContent = t('report');
      rep.addEventListener('click', function(){ report(text, rep); });
      row.appendChild(rep);
    }
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }
  function clearLog(){ while (log.firstChild) log.removeChild(log.firstChild); }

  var busy = false;
  function setBusy(on, thinking){
    busy = on;
    sendBtn.disabled = on;
    resetBtn.disabled = on;
    typing.hidden = !(on && thinking);
    if (on) log.setAttribute('aria-busy', 'true'); else log.removeAttribute('aria-busy');
    if (on && thinking) log.scrollTop = log.scrollHeight;
  }

  /* Reading replies aloud: the app's AI voice when it has one, else the browser's. */
  var voiceOn = false, audio = null;
  function speaking(on){ stage.classList.toggle('is-speaking', !!on); }
  function stopSpeaking(){
    if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
    if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    speaking(false);
  }
  function sayInBrowser(text, lang){
    if (!text || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') return;
    var u = new window.SpeechSynthesisUtterance(text);
    var l = lang || document.documentElement.lang;
    if (l) u.lang = l;
    u.onstart = function(){ speaking(true); };
    u.onend = function(){ speaking(false); };
    u.onerror = function(){ speaking(false); };
    try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { speaking(false); }
  }
  function speakLatest(fallback){
    if (!voiceOn) return;
    run('/api/run/speak', { conversation_id: cid }).then(function(j){
      j = j || {};
      if (!voiceOn) return;
      var text = typeof j.text === 'string' && j.text ? j.text : fallback;
      if (typeof j.audio === 'string' && /^data:audio\//.test(j.audio)) {
        stopSpeaking();
        var a = new Audio(j.audio);
        audio = a;
        a.onplay = function(){ speaking(true); };
        a.onended = function(){ speaking(false); };
        a.onpause = function(){ speaking(false); };
        a.onerror = function(){ speaking(false); };
        var p = a.play();
        if (p && typeof p.catch === 'function') p.catch(function(){ speaking(false); sayInBrowser(text, j.lang); });
      } else {
        sayInBrowser(text, j.lang);
      }
    }).catch(function(){ sayInBrowser(fallback); });
  }
  var voicePref = load(KEY + ':voice');
  voiceOn = voicePref === null ? root.getAttribute('data-voice-default') === 'on' : voicePref === '1';
  voiceEl.checked = voiceOn;
  voiceEl.addEventListener('change', function(){
    voiceOn = voiceEl.checked;
    store(KEY + ':voice', voiceOn ? '1' : '0');
    if (!voiceOn) stopSpeaking();
  });
  window.addEventListener('pagehide', stopSpeaking);

  /* Sending a message. */
  function send(){
    var text = input.value.replace(/\s+/g, ' ').trim().slice(0, 1000);
    if (!text || busy) return;
    showError('');
    stopSpeaking();
    var mine = addMessage('user', text);
    input.value = '';
    var before = state.mood;
    showMood('thinking');
    setBusy(true, true);
    run('/api/run/chat', { conversation_id: cid, message: text }).then(function(j){
      j = j || {};
      setState(typeof j.mood === 'string' ? j.mood : before, j.closeness);
      var reply = typeof j.reply === 'string' ? j.reply.trim() : '';
      if (reply) {
        addMessage('assistant', reply, { note: Number(j.remembered) > 0 ? t('remembered') : '' });
        speakLatest(reply);
      }
    }).catch(function(e){
      showMood(before);
      if (mine.parentNode) mine.parentNode.removeChild(mine);
      if (!input.value) input.value = text;
      showError(e && e.message ? e.message : t('failed'));
    }).then(function(){
      setBusy(false);
      if (!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) input.focus();
    });
  }
  form.addEventListener('submit', function(e){ e.preventDefault(); send(); });

  /* Reporting a reply to the app's owner. */
  function report(text, btn){
    var reason = window.prompt(t('report-prompt'), '');
    if (reason === null) return;
    btn.disabled = true;
    run('/api/run/report', { conversation_id: cid, message: String(text).slice(0, 2000), reason: String(reason).slice(0, 500) })
      .then(function(){ btn.textContent = t('reported'); })
      .catch(function(e){ btn.disabled = false; showError(e && e.message ? e.message : t('failed')); });
  }

  /* Talking instead of typing. */
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    mic.hidden = true;
    mic.classList.add('d-none');
  } else {
    var rec = null, listening = false;
    mic.addEventListener('click', function(){
      if (listening && rec) { try { rec.stop(); } catch (e) {} return; }
      if (busy) return;
      stopSpeaking();
      showError('');
      var heard = '';
      rec = new Recognition();
      rec.lang = document.documentElement.lang || navigator.language || 'en-US';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onstart = function(){ listening = true; mic.setAttribute('aria-pressed', 'true'); mic.classList.add('is-on'); input.setAttribute('placeholder', t('listening')); };
      rec.onresult = function(e){
        var interim = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) heard += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        input.value = (heard + ' ' + interim).replace(/\s+/g, ' ').trim();
      };
      rec.onerror = function(e){ if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) showError(t('mic-denied')); };
      rec.onend = function(){
        listening = false;
        mic.setAttribute('aria-pressed', 'false');
        mic.classList.remove('is-on');
        input.setAttribute('placeholder', placeholder);
        if (heard.trim() && input.value.trim()) send();
      };
      try { rec.start(); } catch (e) { listening = false; }
    });
  }

  /* Starting over: the server forgets the conversation, the page gets a new id. */
  resetBtn.addEventListener('click', function(){
    if (busy || !window.confirm(t('reset-confirm'))) return;
    stopSpeaking();
    showError('');
    setBusy(true, false);
    run('/api/run/forget', { conversation_id: cid }).then(function(){
      cid = newId();
      store(KEY, cid);
      clearLog();
      state = { mood: 'happy', closeness: 0 };
      setState('happy', 0);
      return start(true);
    }).catch(function(e){ showError(e && e.message ? e.message : t('failed')); })
      .then(function(){ setBusy(false); });
  });

  function start(greet){
    return run('/api/run/start', { conversation_id: cid }).then(function(j){
      j = j || {};
      setState(typeof j.mood === 'string' ? j.mood : 'happy', j.closeness);
      if (greet && typeof j.greeting === 'string' && j.greeting.trim()) addMessage('assistant', j.greeting.trim(), { noReport: true });
    });
  }

  /* Eyes that follow the pointer (drawn character only). */
  if (!hasPhotos && window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.addEventListener('pointermove', function(e){
      var b = svg.getBoundingClientRect();
      if (!b.width) return;
      var dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      var d = Math.max(1, Math.sqrt(dx * dx + dy * dy)), k = Math.min(1, d / 320);
      svg.style.setProperty('--nkc-px', (dx / d * 4 * k).toFixed(2) + 'px');
      svg.style.setProperty('--nkc-py', (dy / d * 4 * k).toFixed(2) + 'px');
    }, { passive: true });
  }

  /* First load: the conversation so far, then the greeting for a new one. */
  setState('happy', 0);
  setBusy(true, false);
  run('/api/run/history', { conversation_id: cid }).then(function(rows){
    rows = Array.isArray(rows) ? rows : [];
    rows.forEach(function(r){ if (r && typeof r.content === 'string' && r.content) addMessage(r.role === 'assistant' ? 'assistant' : 'user', r.content); });
    return rows.length;
  }, function(e){ showError(e && e.message ? e.message : t('failed')); return -1; })
    .then(function(count){ return start(count === 0); })
    .catch(function(e){ showError(e && e.message ? e.message : t('failed')); })
    .then(function(){ setBusy(false); });
})();</script>
</section>`;

const COMPANION_CSS = `.nkc{--nkc-ink:#2d2340;}
.nkc-card{background:var(--nk-surface);color:var(--nk-text);border:1px solid rgba(127,127,127,.2);border-radius:1.25rem;box-shadow:0 10px 30px rgba(0,0,0,.06);}
.nkc-stage{--nkc-c1:#ffe7a3;--nkc-c2:#ffb547;--nkc-cheek:#ff7f98;position:relative;flex:0 0 auto;width:132px;}
@media (min-width:576px){.nkc-stage{width:160px;}}
@media (min-width:992px){.nkc-side{position:sticky;top:1.5rem;}.nkc-stage{width:100%;max-width:290px;margin-inline:auto;}}
.nkc-stage.is-curious{--nkc-c1:#cdf3ff;--nkc-c2:#4dbde6;}
.nkc-stage.is-thinking{--nkc-c1:#e7dcff;--nkc-c2:#a68af0;}
.nkc-stage.is-sad{--nkc-c1:#d9e5ff;--nkc-c2:#8aa7df;--nkc-cheek:#b9a6d9;}
.nkc-stage.is-surprised{--nkc-c1:#ffdcc7;--nkc-c2:#ff9563;}
.nkc-stage.is-calm{--nkc-c1:#d4f7e7;--nkc-c2:#62cc9f;}
.nkc-svg{display:block;width:100%;height:auto;overflow:visible;}
.nkc-stop1{stop-color:var(--nkc-c1);transition:stop-color .6s;}
.nkc-stop2{stop-color:var(--nkc-c2);transition:stop-color .6s;}
.nkc-bob{transform-box:view-box;transform-origin:120px 222px;animation:nkc-bob 4s ease-in-out infinite;}
.nkc-stage.is-happy .nkc-bob{animation-duration:3.2s;}
.nkc-stage.is-sad .nkc-bob{animation-duration:6s;}
@keyframes nkc-bob{0%,100%{transform:translateY(0) scale(1,1);}50%{transform:translateY(-7px) scale(1.015,.985);}}
.nkc-shadow{fill:rgba(0,0,0,.14);transform-box:fill-box;transform-origin:center;animation:nkc-shadow 4s ease-in-out infinite;}
.nkc-stage.is-happy .nkc-shadow{animation-duration:3.2s;}
.nkc-stage.is-sad .nkc-shadow{animation-duration:6s;}
@keyframes nkc-shadow{0%,100%{transform:scaleX(1);opacity:.9;}50%{transform:scaleX(.86);opacity:.55;}}
.nkc-tilt{transform-box:view-box;transform-origin:120px 220px;transition:transform .5s ease;}
.nkc-stage.is-curious .nkc-tilt{transform:rotate(-6deg);}
.nkc-stage.is-sad .nkc-tilt{transform:translateY(5px) rotate(2deg);}
.nkc-stage.is-surprised .nkc-tilt{transform:translateY(-5px);}
.nkc-sprout{transform-box:view-box;transform-origin:120px 50px;animation:nkc-sway 3.4s ease-in-out infinite;}
@keyframes nkc-sway{0%,100%{transform:rotate(-7deg);}50%{transform:rotate(7deg);}}
.nkc-stem{fill:none;stroke:#3f9d58;stroke-linecap:round;}
.nkc-leaf{fill:#5cc274;stroke:#3f9d58;stroke-width:2;stroke-linejoin:round;}
.nkc-head{stroke:rgba(45,35,64,.12);stroke-width:2;}
.nkc-shine{fill:#fff;opacity:.45;}
.nkc-cheek{fill:var(--nkc-cheek);opacity:.38;transition:opacity .4s,fill .6s;}
.nkc-stage.is-happy .nkc-cheek{opacity:.62;}
.nkc-stage.is-sad .nkc-cheek{opacity:.18;}
.nkc-brow{fill:none;stroke:var(--nkc-ink);stroke-width:5;stroke-linecap:round;transform-box:fill-box;transform-origin:center;transition:transform .4s ease;}
.nkc-stage.is-surprised .nkc-brow{transform:translateY(-9px);}
.nkc-stage.is-sad .nkc-brow-l{transform:translateY(-2px) rotate(-15deg);}
.nkc-stage.is-sad .nkc-brow-r{transform:translateY(-2px) rotate(15deg);}
.nkc-stage.is-thinking .nkc-brow-r,.nkc-stage.is-curious .nkc-brow-r{transform:translateY(-8px) rotate(-6deg);}
.nkc-stage.is-calm .nkc-brow{transform:translateY(3px);}
.nkc-blink{transform-box:fill-box;transform-origin:center;animation:nkc-blink 5.5s infinite;}
@keyframes nkc-blink{0%,92%,100%{transform:scaleY(1);}94%{transform:scaleY(.08);}96%{transform:scaleY(1);}}
.nkc-eye{transform-box:fill-box;transform-origin:center;transition:transform .4s ease;}
.nkc-stage.is-surprised .nkc-eye{transform:scale(1.16);}
.nkc-stage.is-calm .nkc-eye{transform:scaleY(.5);}
.nkc-stage.is-sad .nkc-eye{transform:translateY(2px) scaleY(.85);}
.nkc-eye-white{fill:#fff;stroke:var(--nkc-ink);stroke-width:3;}
.nkc-pupil{fill:var(--nkc-ink);transform:translate(var(--nkc-px,0px),var(--nkc-py,0px));transition:transform .2s ease;}
.nkc-stage.is-thinking .nkc-pupil{transform:translate(5px,-6px);}
.nkc-stage.is-curious .nkc-pupil{transform:translate(4px,1px);}
.nkc-stage.is-sad .nkc-pupil{transform:translate(0,4px);}
.nkc-glint{fill:#fff;}
.nkc-mouth{fill:none;stroke:var(--nkc-ink);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;opacity:0;transition:opacity .25s;}
.nkc-m-grin,.nkc-m-o,.nkc-m-talk{fill:#7a2f45;}
.nkc-m-talk{transform-box:fill-box;transform-origin:center;}
.nkc-stage.is-happy .nkc-m-grin,.nkc-stage.is-curious .nkc-m-smile,.nkc-stage.is-calm .nkc-m-smile,.nkc-stage.is-thinking .nkc-m-flat,.nkc-stage.is-sad .nkc-m-frown,.nkc-stage.is-surprised .nkc-m-o{opacity:1;}
.nkc-stage.is-speaking .nkc-mouth.nkc-mouth{opacity:0;}
.nkc-stage.is-speaking .nkc-m-talk.nkc-mouth{opacity:1;animation:nkc-talk .2s ease-in-out infinite alternate;}
@keyframes nkc-talk{from{transform:scaleY(.25);}to{transform:scaleY(1);}}
.nkc-dots circle{fill:var(--nkc-c2);stroke:var(--nkc-ink);stroke-width:2;opacity:0;transition:opacity .3s;}
.nkc-stage.is-thinking .nkc-dots circle{animation:nkc-dot 1.2s ease-in-out infinite;}
.nkc-stage.is-thinking .nkc-dots circle:nth-child(2){animation-delay:.2s;}
.nkc-stage.is-thinking .nkc-dots circle:nth-child(3){animation-delay:.4s;}
@keyframes nkc-dot{0%,100%{opacity:.25;}50%{opacity:1;}}
.nkc-photo-wrap{width:100%;aspect-ratio:1/1;border-radius:50%;overflow:hidden;box-shadow:0 0 0 4px var(--nk-accent);animation:nkc-float 4s ease-in-out infinite;}
.nkc-photo-wrap[hidden]{display:none;}
.nkc-stage.is-speaking .nkc-photo-wrap{animation:nkc-float 4s ease-in-out infinite,nkc-ring .8s ease-in-out infinite;}
@keyframes nkc-float{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
@keyframes nkc-ring{0%,100%{box-shadow:0 0 0 4px var(--nk-accent);}50%{box-shadow:0 0 0 10px var(--nk-accent);}}
.nkc-photo{display:block;width:100%;height:100%;object-fit:cover;}
.nkc-heart{width:22px;height:22px;flex:0 0 auto;}
.nkc-heart path{fill:transparent;stroke:var(--nk-accent);stroke-width:2;transition:fill .4s;}
.nkc-heart.is-on path{fill:var(--nk-accent);}
.nkc-bar{height:6px;border-radius:3px;background:rgba(127,127,127,.2);overflow:hidden;max-width:260px;}
@media (min-width:992px){.nkc-bar{margin-inline:auto;}}
.nkc-bar>span{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--nk-accent),var(--nk-primary));transition:width .6s ease;}
.nkc-toolbar{border-bottom:1px solid rgba(127,127,127,.18);}
.nkc-log{height:52vh;min-height:260px;overflow-y:auto;overscroll-behavior:contain;padding:1rem;display:flex;flex-direction:column;gap:.8rem;}
@media (min-width:992px){.nkc-log{height:min(60vh,560px);}}
.nkc-row{display:flex;flex-direction:column;align-items:flex-start;max-width:86%;}
.nkc-row-me{margin-inline-start:auto;align-items:flex-end;}
.nkc-bubble{padding:.6rem .95rem;border-radius:1.1rem;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45;}
.nkc-row-ai .nkc-bubble{background:rgba(127,127,127,.12);background:color-mix(in srgb,var(--nk-primary) 10%,var(--nk-surface));color:var(--nk-text);border-end-start-radius:.35rem;}
.nkc-row-me .nkc-bubble{background:var(--nk-primary);color:#fff;border-end-end-radius:.35rem;}
.nkc-note{font-size:.78rem;color:var(--nk-text-muted);margin-top:.25rem;}
.nkc-report{font-size:.75rem;color:var(--nk-text-muted);text-decoration:none;margin-top:.15rem;}
.nkc-report:hover,.nkc-report:focus-visible{color:var(--nk-text);text-decoration:underline;}
.nkc-typing{font-size:.85rem;color:var(--nk-text-muted);}
.nkc-typing[hidden]{display:none;}
.nkc-typing-dots{display:inline-flex;gap:3px;vertical-align:middle;margin-inline-end:.25rem;}
.nkc-typing-dots i{width:6px;height:6px;border-radius:50%;background:var(--nk-accent);animation:nkc-dot 1s ease-in-out infinite;}
.nkc-typing-dots i:nth-child(2){animation-delay:.15s;}
.nkc-typing-dots i:nth-child(3){animation-delay:.3s;}
.nkc-error:empty{display:none;}
.nkc-composer{border-top:1px solid rgba(127,127,127,.18);}
.nkc-composer .form-control{min-width:0;}
[dir="rtl"] .nkc-send-icon{transform:scaleX(-1);}
.nkc-mic.is-on{background:var(--nk-accent);border-color:var(--nk-accent);color:#fff;}
@media (prefers-reduced-motion:reduce){.nkc *{animation:none!important;transition:none!important;}}`;

/* ── The owner's page ────────────────────────────────────────────────── */

const ADMIN_HTML = `<section class="py-5"><div class="container" style="max-width:860px;">
<h1 class="fw-bold">{{config.companionName}}: reported replies</h1>
<p style="color:var(--nk-text-muted);">Replies visitors flagged with "Report", newest first. Only you can see this page.</p>
<div data-nk-bind-flow-ref="reports" class="mt-3">
  <div class="card border-0 shadow-sm mb-3" style="background:var(--nk-surface);color:var(--nk-text);" data-nk-item><div class="card-body p-4">
    <div class="d-flex flex-wrap justify-content-between gap-2 small mb-2" style="color:var(--nk-text-muted);"><span>Reported <span data-nk-field="created_at">2026-10-12</span></span><span class="badge rounded-pill" style="background:var(--nk-accent);color:#fff;" data-nk-field="status">new</span></div>
    <p class="mb-2" style="white-space:pre-wrap;overflow-wrap:anywhere;" data-nk-field="message">The reply a visitor reported.</p>
    <div class="small"><span class="fw-semibold">Reason:</span> <span data-nk-field="reason">Why they reported it.</span></div>
    <div class="small mt-1" style="color:var(--nk-text-muted);overflow-wrap:anywhere;">Conversation <span data-nk-field="conversation_id">0b6f…</span></div>
  </div></div>
  <p data-nk-empty hidden style="color:var(--nk-text-muted);">No reports yet.</p>
</div>
<div class="card border-0 shadow-sm mt-5" style="background:var(--nk-surface);color:var(--nk-text);"><div class="card-body p-4">
<h2 class="h5 fw-bold">How {{config.companionName}} works</h2>
<ul class="mb-0" style="line-height:1.6;">
<li><strong>Personality.</strong> The name, personality, greeting and boundaries come from this feature's settings. To change them, install the feature again with new settings, or open the Flows tab in the studio: the "Chat with the companion" flow's AI chat step holds the persona and boundaries, and the "Start a conversation" flow holds the greeting.</li>
<li><strong>Look.</strong> Without pictures, {{config.companionName}} is a drawn, animated character. To use your own, put one picture address per mood in the "Pictures" setting, such as <code>happy=https://…</code> (moods: neutral, happy, curious, thinking, sad, surprised, calm).</li>
<li><strong>AI key.</strong> {{config.companionName}} talks with this app's own AI key, set in the studio under AI keys. Until one is added, visitors see "This app's AI isn't set up yet." Reading replies aloud uses the key's voice when it has one, and the visitor's browser voice otherwise.</li>
<li><strong>Safety and limits.</strong> Replies follow your boundaries plus a built-in safety layer for a general audience. Each message uses two AI requests (the reply, then a short mood and memory check); the hourly limits are under AI keys too. Visitors can start over at any time, which deletes their conversation and what {{config.companionName}} remembered.</li>
</ul>
</div></div>
</div></section>`;

export const aiCompanion: ModuleDefinition = {
  id: "ai-companion",
  name: "AI companion",
  tagline: "An animated AI character visitors can chat and talk with",
  description:
    "A friendly animated character that chats with your visitors, remembers what they share, shows its mood and how close you've become, and can listen and talk out loud in the browser. You choose its name, personality, greeting and boundaries; replies stay general-audience, visitors can report a reply or start over, and you read the reports on a private page. It runs on your app's own AI key.",
  icon: "",
  color: "from-pink-500 to-violet-500",
  category: "communication",
  version: "1.0.0",
  provides: ["ai"],
  config: [
    { key: "companionName", label: "Companion's name", type: "text", default: "Nova", required: true },
    {
      key: "personality",
      label: "Personality",
      type: "textarea",
      default:
        "Warm, curious and playful. Loves hearing about the person's day, asks thoughtful follow-up questions, celebrates small wins and has a gentle sense of humour. Encouraging, but always honest.",
      help: "How the companion talks and what it's like. Written for the AI, in plain words.",
    },
    {
      key: "greeting",
      label: "First message",
      type: "text",
      default: "Hi there! I'm so glad you stopped by. How's your day going?",
      help: "Shown when someone opens a new conversation.",
    },
    {
      key: "boundaries",
      label: "Boundaries",
      type: "textarea",
      default:
        "Keep every conversation friendly and suitable for all ages. No romantic, flirty or sexual role-play: if asked, kindly say that's not something you do and suggest another topic. Don't give medical, legal or financial advice beyond general information, and suggest asking a professional. Don't ask for private details such as addresses, phone numbers or passwords. When something is off-limits, gently refuse and change the subject.",
      help: "Rules the companion always keeps. A built-in safety layer applies on top.",
    },
    {
      key: "avatarImages",
      label: "Pictures (optional)",
      type: "textarea",
      placeholder: "happy=https://example.com/happy.png\nsad=https://example.com/sad.png",
      help: "One line per mood: neutral, happy, curious, thinking, sad, surprised or calm, then = and the picture's address. Leave empty for the drawn, animated character.",
    },
    {
      key: "voiceDefault",
      label: "Read replies aloud by default",
      type: "select",
      default: "off",
      options: [
        { value: "off", label: "Off (visitors can turn it on)" },
        { value: "on", label: "On (visitors can turn it off)" },
      ],
    },
  ],
  tables: [
    {
      name: "messages",
      fields: [
        { name: "conversation_id", type: "text" },
        { name: "role", type: "text" },
        { name: "content", type: "text" },
      ],
    },
    {
      name: "memories",
      fields: [
        { name: "conversation_id", type: "text" },
        { name: "fact", type: "text" },
      ],
    },
    {
      name: "moods",
      fields: [
        { name: "conversation_id", type: "text" },
        { name: "mood", type: "text" },
        { name: "closeness", type: "int" },
      ],
    },
    {
      name: "reports",
      fields: [
        { name: "conversation_id", type: "text" },
        { name: "message", type: "text" },
        { name: "reason", type: "text" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "start",
      name: "Start a conversation",
      httpMethod: "POST",
      purpose: "Opens a visitor's conversation (a mood row on the first visit) and returns the greeting, mood and closeness.",
      nodes: [
        ...startGuard.nodes,
        { id: "n6", type: "query", data: { label: "This conversation's mood", table: "moods", where: { conversation_id: "{{vars.cid}}" }, orderBy: "id asc", limit: 1, output: "mood" } },
        { id: "n7", type: "branch", data: { label: "Seen before?", left: "{{vars.mood.0.id}}", op: "exists", right: "" } },
        { id: "n8", type: "insert", data: { label: "New conversation", table: "moods", values: { conversation_id: "{{vars.cid}}", mood: "happy", closeness: 0 }, output: "created" } },
        { id: "n9", type: "custom_js", data: { label: "Mood and closeness", code: START_STATE_CODE, output: "state" } },
        // The greeting goes through a variable so quotes in it can't break the reply's JSON.
        { id: "n10", type: "set", data: { label: "Greeting", name: "greeting", value: "{{config.greeting}}" } },
        {
          id: "n11",
          type: "response",
          data: { status: 200, body: '{"ok":true,"greeting":"{{vars.greeting}}","mood":"{{vars.state.mood}}","closeness":{{vars.state.closeness}}}' },
        },
      ],
      edges: [
        ...startGuard.edges,
        { id: "e1", source: "n6", target: "n7" },
        { id: "e2", source: "n7", target: "n9", sourceHandle: "true" },
        { id: "e3", source: "n7", target: "n8", sourceHandle: "false" },
        { id: "e4", source: "n8", target: "n9" },
        { id: "e5", source: "n9", target: "n10" },
        { id: "e6", source: "n10", target: "n11" },
      ],
    },
    {
      slug: "chat",
      name: "Chat with the companion",
      httpMethod: "POST",
      purpose: "Answers a visitor's message in character, then updates the companion's mood, closeness and memories.",
      nodes: [
        ...chatGuard.nodes,
        { id: "n6", type: "query", data: { label: "What it remembers", table: "memories", where: { conversation_id: "{{vars.cid}}" }, orderBy: "id desc", limit: 30, output: "memories" } },
        { id: "n7", type: "query", data: { label: "Current mood", table: "moods", where: { conversation_id: "{{vars.cid}}" }, orderBy: "id asc", limit: 1, output: "mood" } },
        { id: "n8", type: "custom_js", data: { label: "What it knows right now", code: CHAT_CONTEXT_CODE, output: "context" } },
        {
          id: "n9",
          type: "ai_chat",
          data: {
            label: "Reply in character",
            system: PERSONA,
            message: "{{trigger.message}}",
            context: "{{vars.context}}",
            table: "messages",
            where: { conversation_id: "{{vars.cid}}" },
            historyLimit: 20,
            safety: "standard",
            output: "reply",
          },
        },
        {
          id: "n10",
          type: "ai_structured",
          data: { label: "Mood and memory check", system: ANALYSIS_SYSTEM, prompt: ANALYSIS_PROMPT, schema: ANALYSIS_SCHEMA, temperature: 0.2, output: "analysis" },
        },
        { id: "n11", type: "custom_js", data: { label: "New mood, closeness and memories", code: CHAT_STATE_CODE, output: "state" } },
        { id: "n12", type: "branch", data: { label: "Has a mood row?", left: "{{vars.state.has_row}}", op: "==", right: "true" } },
        {
          id: "n13",
          type: "update",
          data: { label: "Save the mood", table: "moods", where: { conversation_id: "{{vars.cid}}" }, values: { mood: "{{vars.state.mood}}", closeness: "{{vars.state.closeness}}" }, output: "updated" },
        },
        {
          id: "n14",
          type: "insert",
          data: { label: "First mood", table: "moods", values: { conversation_id: "{{vars.cid}}", mood: "{{vars.state.mood}}", closeness: "{{vars.state.closeness}}" }, output: "created" },
        },
        { id: "n15", type: "bulk_insert", data: { label: "Remember new facts", table: "memories", rowsVar: "new_memories", output: "remembered" } },
        {
          id: "n16",
          type: "response",
          data: { status: 200, body: '{"reply":"{{vars.reply}}","mood":"{{vars.state.mood}}","closeness":{{vars.state.closeness}},"remembered":{{vars.remembered}}}' },
        },
      ],
      edges: [
        ...chatGuard.edges,
        { id: "e1", source: "n6", target: "n7" },
        { id: "e2", source: "n7", target: "n8" },
        { id: "e3", source: "n8", target: "n9" },
        { id: "e4", source: "n9", target: "n10" },
        { id: "e5", source: "n10", target: "n11" },
        { id: "e6", source: "n11", target: "n12" },
        { id: "e7", source: "n12", target: "n13", sourceHandle: "true" },
        { id: "e8", source: "n12", target: "n14", sourceHandle: "false" },
        { id: "e9", source: "n13", target: "n15" },
        { id: "e10", source: "n14", target: "n15" },
        { id: "e11", source: "n15", target: "n16" },
      ],
    },
    {
      slug: "history",
      name: "Conversation so far",
      httpMethod: "POST",
      purpose: "The latest messages of one visitor's conversation, oldest first.",
      nodes: [
        ...historyGuard.nodes,
        { id: "n6", type: "query", data: { label: "Latest messages", table: "messages", where: { conversation_id: "{{vars.cid}}" }, orderBy: "id desc", limit: 80, output: "rows" } },
        { id: "n7", type: "custom_js", data: { label: "Oldest first", code: HISTORY_CODE, output: "messages" } },
        { id: "n8", type: "response", data: { status: 200, body: "{{vars.messages}}" } },
      ],
      edges: [
        ...historyGuard.edges,
        { id: "e1", source: "n6", target: "n7" },
        { id: "e2", source: "n7", target: "n8" },
      ],
    },
    {
      // Reads the conversation's latest reply aloud, never text a caller
      // sends, so the app's AI voice can't be used for anything else.
      slug: "speak",
      name: "Read the reply aloud",
      httpMethod: "POST",
      purpose: "The companion's latest reply as speech (or as text for the browser's own voice).",
      nodes: [
        ...speakGuard.nodes,
        {
          id: "n6",
          type: "query",
          data: { label: "Latest reply", table: "messages", where: { conversation_id: "{{vars.cid}}", role: "assistant" }, orderBy: "id desc", limit: 1, output: "last" },
        },
        { id: "n7", type: "ai_speech", data: { label: "Speak", text: "{{vars.last.0.content}}", output: "speech" } },
        { id: "n8", type: "response", data: { status: 200, body: "{{vars.speech}}" } },
      ],
      edges: [
        ...speakGuard.edges,
        { id: "e1", source: "n6", target: "n7" },
        { id: "e2", source: "n7", target: "n8" },
      ],
    },
    {
      slug: "report",
      name: "Report a reply",
      httpMethod: "POST",
      purpose: "A visitor flags one of the companion's replies for the owner.",
      nodes: [
        ...reportGuard.nodes,
        { id: "n6", type: "custom_js", data: { label: "Clean up the report", code: REPORT_CLEAN_CODE, output: "clean" } },
        { id: "n7", type: "branch", data: { label: "Has the reply?", left: "{{vars.clean.message}}", op: "exists", right: "" } },
        {
          id: "n8",
          type: "insert",
          data: { label: "Save the report", table: "reports", values: { conversation_id: "{{vars.cid}}", message: "{{vars.clean.message}}", reason: "{{vars.clean.reason}}", status: "new" }, output: "saved" },
        },
        { id: "n9", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks for telling us. The owner will take a look."}' } },
        { id: "n10", type: "response", data: { status: 400, body: '{"error":"Pick a reply to report."}' } },
      ],
      edges: [
        ...reportGuard.edges,
        { id: "e1", source: "n6", target: "n7" },
        { id: "e2", source: "n7", target: "n8", sourceHandle: "true" },
        { id: "e3", source: "n7", target: "n10", sourceHandle: "false" },
        { id: "e4", source: "n8", target: "n9" },
      ],
    },
    {
      slug: "forget",
      name: "Start over",
      httpMethod: "POST",
      purpose: "Deletes one visitor's conversation, memories and mood (reports stay for the owner).",
      nodes: [
        ...forgetGuard.nodes,
        { id: "n6", type: "delete", data: { label: "Forget the messages", table: "messages", where: { conversation_id: "{{vars.cid}}" }, output: "deletedMessages" } },
        { id: "n7", type: "delete", data: { label: "Forget the memories", table: "memories", where: { conversation_id: "{{vars.cid}}" }, output: "deletedMemories" } },
        { id: "n8", type: "delete", data: { label: "Forget the mood", table: "moods", where: { conversation_id: "{{vars.cid}}" }, output: "deletedMoods" } },
        { id: "n9", type: "response", data: { status: 200, body: '{"ok":true,"message":"Started over. The old conversation is forgotten."}' } },
      ],
      edges: [
        ...forgetGuard.edges,
        { id: "e1", source: "n6", target: "n7" },
        { id: "e2", source: "n7", target: "n8" },
        { id: "e3", source: "n8", target: "n9" },
      ],
    },
    {
      // Only the owner's page uses this flow, so it's locked to the owner.
      slug: "reports",
      name: "Reported replies",
      httpMethod: "POST",
      purpose: "The owner's list of reported replies, newest first.",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { label: "Reports", table: "reports", orderBy: "id desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    { slug: "companion", title: "AI companion", html: COMPANION_HTML, css: COMPANION_CSS },
    { slug: "companion-admin", title: "Companion reports", ownerOnly: true, html: ADMIN_HTML },
  ],
};
