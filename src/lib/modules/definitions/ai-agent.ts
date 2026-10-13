import type { ModuleDefinition, ModuleFlow, ModuleFlowEdge, ModuleFlowNode } from "../types";

/**
 * Personal AI agent: the app owner's own helper. The owner gives it goals;
 * it works toward them a few steps at a time (ai_agent, docs/ai-in-apps.md)
 * with this app's flows as tools, plus an optional outside service the owner
 * runs (their self-hosted OpenMuse or any API) over HTTP. Sending an email or
 * calling that service waits for the owner's approval.
 *
 * Every page is ownerOnly, which also locks every flow those pages use
 * (lib/flow/access.ts): visitors can never add tasks, approve actions or
 * call the tool flows. The tool flows are used by the owner's pages too
 * ("Add a note", "Write a draft", "Send now"), so none of them is left
 * unused (and so open). "tick" and "daily-summary" are scheduled, which
 * visitors can't call.
 *
 * Work runs while the agent's page is open (one "work" call at a time,
 * about every 8 s) and every 15 minutes once the app is published ("tick").
 * Each run is at most three AI requests. The agent's saved state, its steps
 * and the action waiting for approval are JSON text on the task row.
 */

/* ── The agent step ──────────────────────────────────────────────── */

const AGENT_SYSTEM =
  "{{config.instructions}}\n\n" +
  "Your name is {{config.agentName}}. You are the personal agent of this app's owner and you work only for them, toward the goal they gave you, a few steps at a time. " +
  "You have no web browser, mailbox or computer of your own: you can act only through the tools listed below, and you never pretend a tool did something it didn't. " +
  "Prefer draft_email over send_email unless the goal clearly asks you to send. When a tool takes a task_id, pass the task number you were given. " +
  "When the goal is reached, or can't be reached with these tools, finish with a short, plain report for the owner: what you did, what is left, and anything they should do themselves. " +
  "Today is {{now.date}}.";

const AGENT_PROMPT = "Task number: {{vars.task.0.id}}\nGoal: {{vars.task.0.goal}}";

/** The agent's tools. Flow tools name this feature's flows by their local slug (rewritten at install). */
const TOOLS = [
  {
    name: "save_note",
    description: "Save a short note for the owner: a plan, a list, findings, or a question for them.",
    kind: "flow",
    flow: "save-note",
    params: "task_id, content",
  },
  {
    name: "draft_email",
    description: "Write an email draft the owner can review and send later from their Drafts page. Nothing is sent.",
    kind: "flow",
    flow: "draft-email",
    params: "task_id, to_address, subject, body",
  },
  {
    name: "send_email",
    description: "Send an email now, from this app's email address. Only when the goal asks to send; the owner approves it first.",
    kind: "flow",
    flow: "send-email",
    params: "task_id, to_address, subject, body",
    needsApproval: true,
  },
  {
    // With no address set at install, the url is empty and the tool answers "This tool has no address."
    name: "call_service",
    description:
      'Ask the owner\'s own outside service ("{{config.serviceName}}") to do one task described in plain words, for example research on the web; you get its answer back. Its address is "{{config.serviceUrl}}". If that address is empty (""), this tool is not set up: never use it.',
    kind: "http",
    method: "POST",
    url: "{{config.serviceUrl}}",
    headers: { authorization: "Bearer {{config.serviceToken}}" },
    body: '{"task":"{{args.task}}"}',
    params: "task",
    needsApproval: true,
  },
];

/** The agent's result as the task's status, progress line and saved state. A pause or cancel made during the run wins. */
const MAP_CODE = `var a = vars.agent || {};
var steps = Array.isArray(a.steps) ? a.steps : [];
var last = steps.length ? steps[steps.length - 1] : null;
var status = a.status === 'done' ? 'done' : a.status === 'needs_approval' ? 'waiting' : 'running';
var progress = 'Working on it';
if (status === 'done') progress = 'Finished';
else if (status === 'waiting') progress = 'Waiting for your approval' + (a.pending && a.pending.note ? ': ' + a.pending.note : '');
else if (last) progress = last.note || ((last.ok ? 'Used ' : 'Tried ') + last.tool);
var now = vars.fresh && vars.fresh[0] ? String(vars.fresh[0].status || '') : '';
if (now === 'cancelled') { status = 'cancelled'; progress = 'Cancelled by you'; }
else if (now === 'paused' && status !== 'done') { status = 'paused'; progress = 'Paused by you'; }
return {
  status: status,
  progress: String(progress).slice(0, 300),
  steps: JSON.stringify(steps),
  pending: a.pending ? JSON.stringify(a.pending) : '',
  state: typeof a.state === 'string' ? a.state : '',
  result: typeof a.answer === 'string' ? a.answer : ''
};`;

/** Rows without the big columns: the saved conversation always, the step log too for lists. */
const stripCode = (keepSteps: boolean) => `var drop = { state: true${keepSteps ? "" : ", steps: true"} };
return (Array.isArray(vars.rows) ? vars.rows : []).map(function (r) {
  var o = {};
  Object.keys(r).forEach(function (k) { if (!drop[k]) o[k] = r[k]; });
  return o;
});`;

/** ai_agent → read the task again → map → save → reply. Starts at "a1"; the caller connects to it. */
function agentRun(decision?: string): { nodes: ModuleFlowNode[]; edges: ModuleFlowEdge[] } {
  return {
    nodes: [
      {
        id: "a1",
        type: "ai_agent",
        data: {
          label: "Work a few steps",
          system: AGENT_SYSTEM,
          prompt: AGENT_PROMPT,
          state: "{{vars.task.0.state}}",
          ...(decision ? { decision } : {}),
          maxSteps: 3,
          tools: TOOLS,
          output: "agent",
        },
      },
      { id: "a2", type: "query", data: { label: "Read the task again", table: "tasks", where: { id: "{{vars.task.0.id}}" }, limit: 1, output: "fresh" } },
      { id: "a3", type: "custom_js", data: { label: "Status and progress", code: MAP_CODE, output: "m" } },
      {
        id: "a4",
        type: "update",
        data: {
          label: "Save progress",
          table: "tasks",
          where: { id: "{{vars.task.0.id}}" },
          values: {
            status: "{{vars.m.status}}",
            progress: "{{vars.m.progress}}",
            steps: "{{vars.m.steps}}",
            pending: "{{vars.m.pending}}",
            state: "{{vars.m.state}}",
            result: "{{vars.m.result}}",
            last_run_at: "{{now}}",
          },
        },
      },
      { id: "a5", type: "response", data: { status: 200, body: '{"task":"{{vars.task.0.id}}","status":"{{vars.m.status}}","progress":"{{vars.m.progress}}"}' } },
    ],
    edges: [
      { id: "ea1", source: "a1", target: "a2" },
      { id: "ea2", source: "a2", target: "a3" },
      { id: "ea3", source: "a3", target: "a4" },
      { id: "ea4", source: "a4", target: "a5" },
    ],
  };
}

const RUN = agentRun();
const DECIDE = agentRun("{{trigger.decision}}");
const IDLE = '{"idle":true}';

/** A list flow: query → (optionally without the big columns) → rows. */
function listFlow(slug: string, name: string, table: string, opts: { where?: Record<string, string>; orderBy: string; limit: number; strip?: "all" | "keep-steps" }): ModuleFlow {
  const nodes: ModuleFlowNode[] = [
    { id: "n1", type: "trigger", data: {} },
    { id: "n2", type: "query", data: { table, ...(opts.where ? { where: opts.where } : {}), orderBy: opts.orderBy, limit: opts.limit, output: "rows" } },
  ];
  const edges: ModuleFlowEdge[] = [{ id: "e1", source: "n1", target: "n2" }];
  if (opts.strip) {
    nodes.push({ id: "n3", type: "custom_js", data: { label: "Leave out the saved conversation", code: stripCode(opts.strip === "keep-steps"), output: "list" } });
    nodes.push({ id: "n4", type: "response", data: { status: 200, body: "{{vars.list}}" } });
    edges.push({ id: "e2", source: "n2", target: "n3" }, { id: "e3", source: "n3", target: "n4" });
  } else {
    nodes.push({ id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } });
    edges.push({ id: "e2", source: "n2", target: "n3" });
  }
  return { slug, name, httpMethod: "POST", nodes, edges };
}

/**
 * pause / resume / cancel, only from the statuses where it makes sense.
 * `from` lists them ("running|waiting") and the branch checks it contains the
 * task's status; a task that doesn't exist matches no row in the update.
 */
function statusFlow(slug: string, name: string, from: string, to: string, progress: string, done: string, refused: string): ModuleFlow {
  return {
    slug,
    name,
    httpMethod: "POST",
    nodes: [
      { id: "n1", type: "trigger", data: {} },
      { id: "n2", type: "query", data: { table: "tasks", where: { id: "{{trigger.id}}" }, limit: 1, output: "task" } },
      { id: "n3", type: "branch", data: { label: "Allowed now?", left: from, op: "contains", right: "{{vars.task.0.status}}" } },
      { id: "n4", type: "update", data: { table: "tasks", where: { id: "{{trigger.id}}" }, values: { status: to, progress } } },
      { id: "n5", type: "response", data: { status: 200, body: JSON.stringify({ ok: true, message: done }) } },
      { id: "n6", type: "response", data: { status: 409, body: JSON.stringify({ error: refused }) } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
      { id: "e4", source: "n4", target: "n5" },
      { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
    ],
  };
}

/* ── Pages ───────────────────────────────────────────────────────── */

const CSS = `.nk-agent{color:var(--nk-text);}
.nk-agent .nk-muted{color:var(--nk-text-muted);}
.nk-agent .card{background:var(--nk-surface);color:var(--nk-text);border-radius:var(--nk-radius,14px);}
.nk-agent .nk-mark{width:52px;height:52px;flex:0 0 52px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,var(--nk-primary),var(--nk-accent,var(--nk-primary)));}
.nk-agent .nk-chip{display:inline-flex;align-items:center;font-size:.78rem;font-weight:600;line-height:1;padding:.4rem .7rem;border-radius:999px;white-space:nowrap;background:color-mix(in srgb,var(--nk-text-muted) 14%,transparent);color:var(--nk-text);}
.nk-agent .nk-chip>span{display:none;align-items:center;gap:.4rem;}
.nk-agent [data-status="running"] .s-running,.nk-agent [data-status="paused"] .s-paused,.nk-agent [data-status="waiting"] .s-waiting,.nk-agent [data-status="done"] .s-done,.nk-agent [data-status="cancelled"] .s-cancelled,.nk-agent [data-status="draft"] .s-draft,.nk-agent [data-status="sent"] .s-sent{display:inline-flex;}
.nk-agent [data-status="running"] .nk-chip{background:color-mix(in srgb,var(--nk-primary) 16%,transparent);}
.nk-agent [data-status="waiting"] .nk-chip{background:color-mix(in srgb,#f59e0b 24%,transparent);}
.nk-agent [data-status="done"] .nk-chip,.nk-agent [data-status="sent"] .nk-chip{background:color-mix(in srgb,var(--nk-success,#16a34a) 18%,transparent);}
.nk-agent .nk-dot{width:.5rem;height:.5rem;border-radius:50%;background:var(--nk-primary);animation:nkAgentPulse 1.6s ease-in-out infinite;}
@keyframes nkAgentPulse{0%,100%{opacity:1;}50%{opacity:.25;}}
@media (prefers-reduced-motion:reduce){.nk-agent .nk-dot{animation:none;}}
.nk-agent .nk-goal{overflow-wrap:anywhere;}
.nk-agent .nk-act{display:none;margin:0;}
.nk-agent [data-status="running"] .nk-act-pause,.nk-agent [data-status="waiting"] .nk-act-pause,.nk-agent [data-status="paused"] .nk-act-resume,.nk-agent [data-status="running"] .nk-act-cancel,.nk-agent [data-status="waiting"] .nk-act-cancel,.nk-agent [data-status="paused"] .nk-act-cancel,.nk-agent [data-status="waiting"] .nk-act-review,.nk-agent [data-status="draft"] .nk-act-send{display:inline-flex;align-items:center;gap:.4rem;flex-wrap:wrap;}
.nk-agent form.nk-inline{display:inline-flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin:0;}
.nk-agent .nk-when:has(span:empty){display:none;}
.nk-agent .nk-result{white-space:pre-wrap;overflow-wrap:anywhere;border-inline-start:3px solid var(--nk-success,#16a34a);padding-inline-start:.65rem;}
.nk-agent .nk-result:empty,.nk-agent .nk-result-wrap:has(.nk-result:empty){display:none;}
.nk-agent .nk-pending-view{background:color-mix(in srgb,#f59e0b 9%,var(--nk-surface));border:1px solid color-mix(in srgb,#f59e0b 35%,transparent);border-radius:var(--nk-radius-sm,10px);padding:.85rem 1rem;}
.nk-agent .nk-args{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:.3rem .9rem;font-size:.92rem;margin:0;}
.nk-agent .nk-args dt{font-weight:600;color:var(--nk-text-muted);}
.nk-agent .nk-args dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;}
@media (max-width:480px){.nk-agent .nk-args{grid-template-columns:1fr;}.nk-agent .nk-args dd{margin-bottom:.4rem;}}
.nk-agent .nk-steps{list-style:none;padding:0;margin:0;}
.nk-agent .nk-steps li{position:relative;border-inline-start:2px solid var(--nk-border);padding-block:0 1rem;padding-inline:1rem 0;}
.nk-agent .nk-steps li::before{content:"";position:absolute;inset-inline-start:-6px;top:.3rem;width:10px;height:10px;border-radius:50%;background:var(--nk-primary);}
.nk-agent .nk-steps li.nk-bad::before{background:var(--nk-danger,#dc2626);}
.nk-agent .nk-step-out{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.85rem;color:var(--nk-text-muted);max-height:12rem;overflow:auto;}
.nk-agent .nk-pre{white-space:pre-wrap;overflow-wrap:anywhere;}
.nk-agent details>summary{cursor:pointer;}`;

const MARK = `<div class="nk-mark" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/></svg></div>`;

const CHIP = `<span class="nk-chip"><span class="s-running"><i class="nk-dot" aria-hidden="true"></i>Running</span><span class="s-paused">Paused</span><span class="s-waiting">Waiting for approval</span><span class="s-done">Done</span><span class="s-cancelled">Cancelled</span></span>`;

/** Review / Pause / Resume / Cancel for one task (CSS shows the ones its status allows). */
const TASK_ACTIONS = `<a class="btn btn-sm btn-warning nk-act nk-act-review" href="/agent-approvals">Review the action</a>
      <form data-nk-form="" data-nk-flow-ref="pause" class="nk-act nk-act-pause"><input type="hidden" name="id" value="{id}"/><button class="btn btn-sm btn-outline-secondary" type="submit">Pause</button><span data-nk-error class="small"></span></form>
      <form data-nk-form="" data-nk-flow-ref="resume" data-nk-agent-kick="" class="nk-act nk-act-resume"><input type="hidden" name="id" value="{id}"/><button class="btn btn-sm btn-outline-primary" type="submit">Resume</button><span data-nk-error class="small"></span></form>
      <form data-nk-form="" data-nk-flow-ref="cancel" data-nk-confirm="Cancel this task? The agent stops working on it." class="nk-act nk-act-cancel"><input type="hidden" name="id" value="{id}"/><button class="btn btn-sm btn-outline-danger" type="submit">Cancel</button><span data-nk-error class="small"></span></form>`;

/**
 * The work loop: while the page is visible and a task is running, one
 * "work" call at a time, about every 8 seconds. Stops when nothing is
 * running and on errors (shown in the role="alert" line).
 */
const LOOP_SCRIPT = `<script>(function(){
  function init(){
    var root = document.querySelector('[data-nk-agent-loop]');
    if(!root || root.__nkLoop) return;
    root.__nkLoop = true;
    var stateEl = root.querySelector('[data-nk-agent-state]');
    var errEl = root.querySelector('[data-nk-agent-error]');
    var nowBtn = root.querySelector('[data-nk-agent-now]');
    var taskId = '';
    if(root.hasAttribute('data-nk-agent-task')){
      try { taskId = new URLSearchParams(location.search).get('id') || ''; } catch(e){ taskId = ''; }
    }
    var busy = false, active = false, again = false, timer = null;
    function text(name, fallback){ return root.getAttribute(name) || fallback; }
    function say(t){ if(stateEl) stateEl.textContent = t || ''; }
    function fail(t){ active = false; say(''); if(errEl){ errEl.textContent = t; errEl.hidden = false; } }
    function clearFail(){ if(errEl){ errEl.textContent = ''; errEl.hidden = true; } }
    function refresh(){
      if(typeof window.__nkBindFlow !== 'function') return;
      document.querySelectorAll('[data-nk-bind-flow]').forEach(function(el){ window.__nkBindFlow(el); });
    }
    function later(ms){ clearTimeout(timer); timer = setTimeout(step, ms); }
    function settle(){ busy = false; if(nowBtn){ nowBtn.disabled = false; nowBtn.removeAttribute('aria-busy'); } }
    function step(){
      if(!active) return;
      if(busy){ again = true; return; }
      if(document.visibilityState === 'hidden') return;
      busy = true; again = false;
      if(nowBtn){ nowBtn.disabled = true; nowBtn.setAttribute('aria-busy', 'true'); }
      say(text('data-working', 'Working on it...'));
      fetch('/api/run/work', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(taskId ? { task_id: taskId } : {}) })
        .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { ok: r.ok, j: j || {} }; }); })
        .then(function(res){
          settle();
          var j = res.j;
          if(!res.ok || j.error){ fail(typeof j.error === 'string' && j.error ? j.error : text('data-failed', 'Something went wrong. Please try again.')); return; }
          clearFail();
          refresh();
          if(j.idle && !again){ active = false; say(text('data-idle', 'Nothing is running right now.')); return; }
          say(text('data-next', 'Next steps in a few seconds.'));
          later(again ? 0 : 8000);
        }, function(){
          settle();
          fail(text('data-offline', 'Could not reach the app. Check your connection, then press Work on it now.'));
        });
    }
    function kick(){ active = true; clearFail(); if(busy){ again = true; return; } later(0); }
    if(nowBtn) nowBtn.addEventListener('click', kick);
    // A new goal or a resumed task starts the loop again (nk:success doesn't bubble, so listen while it's captured).
    document.addEventListener('nk:success', function(e){
      var f = e.target;
      if(f && f.hasAttribute && f.hasAttribute('data-nk-agent-kick')) kick();
    }, true);
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'visible' && active && !busy) later(500);
    });
    // Only in the published or previewed app, never in the editor.
    if(window.__nkProjectId) kick();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();</script>`;

/** Asks before forms marked data-nk-confirm are sent (runs before the runtime's own submit listener). */
const CONFIRM_SCRIPT = `<script>(function(){
  if(window.__nkAgentConfirm) return;
  window.__nkAgentConfirm = true;
  document.addEventListener('submit', function(e){
    var f = e.target;
    var q = f && f.getAttribute ? f.getAttribute('data-nk-confirm') : '';
    if(q && !window.confirm(q)){ e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
})();</script>`;

/** Shows the action waiting for approval and the step log (JSON text) as plain text: never as HTML. */
const DETAIL_SCRIPT = `<script>(function(){
  var TOOLS = { save_note: 'Save a note', draft_email: 'Write an email draft', send_email: 'Send an email', call_service: 'Ask your outside service' };
  var FIELDS = { to_address: 'To', subject: 'Subject', body: 'Message', content: 'Note', task: 'Task' };
  var svc = document.querySelector('[data-nk-agent-svc]');
  var svcName = svc ? String(svc.textContent || '').trim() : '';
  if(svcName) TOOLS.call_service = 'Ask ' + svcName;
  function live(){ return !!window.__nkProjectId; }
  function make(tag, cls, t){ var el = document.createElement(tag); if(cls) el.className = cls; if(t != null) el.textContent = String(t); return el; }
  function parse(el){
    var s = el ? String(el.textContent || '').trim() : '';
    if(!s) return null;
    try { return JSON.parse(s); } catch(e){ return null; }
  }
  function argList(args){
    var dl = make('dl', 'nk-args');
    var keys = args && typeof args === 'object' ? Object.keys(args) : [];
    keys.forEach(function(k){
      if(k === 'task_id') return;
      var v = args[k];
      dl.appendChild(make('dt', '', FIELDS[k] || k));
      dl.appendChild(make('dd', '', typeof v === 'string' ? v : JSON.stringify(v)));
    });
    return dl;
  }
  function pending(item){
    var view = item.querySelector('.nk-pending-view');
    if(!view) return;
    var p = parse(item.querySelector('.nk-raw-pending'));
    if(!p || typeof p !== 'object'){
      // The editor keeps its sample; a real task with nothing waiting shows nothing.
      if(live()){ view.textContent = ''; view.hidden = true; }
      return;
    }
    view.textContent = '';
    view.appendChild(make('div', 'fw-semibold mb-1', TOOLS[p.tool] || p.tool || ''));
    if(p.note) view.appendChild(make('p', 'small nk-muted mb-2', p.note));
    view.appendChild(argList(p.args));
    view.hidden = false;
  }
  function steps(item){
    var list = item.querySelector('.nk-steps');
    if(!list) return;
    var all = parse(item.querySelector('.nk-raw-steps'));
    if(!Array.isArray(all)){ if(!live()) return; all = []; }
    list.textContent = '';
    if(!all.length){ list.appendChild(make('li', 'nk-muted small', list.getAttribute('data-empty') || 'No steps yet.')); return; }
    all.forEach(function(s){
      if(!s || typeof s !== 'object') return;
      var li = make('li', s.ok === false ? 'nk-bad' : '');
      var head = make('div', 'd-flex flex-wrap justify-content-between gap-2');
      head.appendChild(make('span', 'fw-semibold', s.tool === '(answer)' ? 'Answered' : (TOOLS[s.tool] || s.tool || '')));
      var outcome = s.approved === false ? 'Declined by you' : s.ok === false ? 'Failed' : s.approved ? 'Approved and done' : 'Done';
      var when = '';
      if(s.at){ var d = new Date(s.at); if(!isNaN(d.getTime())) when = d.toLocaleString(); }
      head.appendChild(make('span', 'small nk-muted', when ? outcome + ' - ' + when : outcome));
      li.appendChild(head);
      if(s.note) li.appendChild(make('p', 'small mb-1', s.note));
      if(s.args && typeof s.args === 'object' && Object.keys(s.args).length) li.appendChild(argList(s.args));
      if(s.result) li.appendChild(make('div', 'nk-step-out mt-1', s.result));
      list.appendChild(li);
    });
  }
  function renderAll(){
    document.querySelectorAll('.nk-agent [data-nk-item]').forEach(function(item){ pending(item); steps(item); });
  }
  function init(){
    renderAll();
    if(typeof MutationObserver !== 'function') return;
    // Lists are drawn again on every refresh: draw these parts again too.
    var mo = new MutationObserver(renderAll);
    document.querySelectorAll('.nk-observe').forEach(function(el){ mo.observe(el, { childList: true }); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();</script>`;

/** The approvals list refreshes itself, but never while an answer is being sent. */
const APPROVALS_REFRESH_SCRIPT = `<script>(function(){
  setInterval(function(){
    var list = document.querySelector('.nk-approvals');
    if(!list || typeof window.__nkBindFlow !== 'function' || !list.hasAttribute('data-nk-bind-flow') || document.visibilityState === 'hidden') return;
    if(list.querySelector('[aria-busy="true"]')) return;
    window.__nkBindFlow(list);
  }, 20000);
})();</script>`;

const loopBar = (attrs: string) => `<div class="d-flex flex-wrap align-items-center gap-2 mb-3" data-nk-agent-loop=""${attrs} data-working="Working on it..." data-next="Next steps in a few seconds." data-failed="Something went wrong. Please try again." data-offline="Could not reach the app. Check your connection, then press Work on it now.">
  <button type="button" class="btn btn-outline-primary btn-sm" data-nk-agent-now="">Work on it now</button>
  <span class="small nk-muted" data-nk-agent-state="" role="status" aria-live="polite"></span>
  <div class="w-100 small text-danger" data-nk-agent-error="" role="alert" hidden></div>
</div>`;

const AGENT_PAGE = `<section class="nk-agent py-4 py-md-5"><div class="container" style="max-width:880px;">
<header class="d-flex flex-wrap align-items-center gap-3 mb-4">
  ${MARK}
  <div class="flex-grow-1" style="min-width:200px;"><h1 class="h2 fw-bold mb-1">{{config.agentName}}</h1><p class="mb-0 nk-muted">Your personal AI agent. Give it a goal: it works on it a few steps at a time and asks you before anything risky.</p></div>
  <nav class="d-flex flex-wrap gap-2" aria-label="Agent pages"><a class="btn btn-outline-secondary btn-sm" href="/agent-approvals">Approvals</a><a class="btn btn-outline-secondary btn-sm" href="/agent-drafts">Drafts and summaries</a></nav>
</header>

<form data-nk-form="" data-nk-flow-ref="create-task" data-nk-agent-kick="" data-nk-success-text="Added. {{config.agentName}} starts on it in a moment." class="card border-0 shadow-sm p-3 p-md-4 mb-3">
  <label class="form-label fw-semibold" for="nk-agent-goal">What should {{config.agentName}} work on?</label>
  <textarea id="nk-agent-goal" name="goal" class="form-control" rows="3" maxlength="2000" required placeholder="For example: draft a friendly follow-up email to ana@example.com about Friday's meeting, and save a note with three ideas for the agenda."></textarea>
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3"><small class="nk-muted">It uses this app's own AI key. Each step is one AI request.</small><button class="btn btn-primary" type="submit">Give it this goal</button></div>
  <div data-nk-error class="small mt-2" style="white-space:pre-wrap;"></div>
</form>

${loopBar(' data-idle="Nothing is running right now."')}

<h2 class="h5 fw-bold mt-4 mb-3">Tasks</h2>
<div data-nk-bind-flow-ref="list-tasks" data-nk-refresh="4000" data-nk-empty-text="No tasks yet. Give your agent a goal above.">
  <article class="card border-0 shadow-sm mb-3" data-nk-item="" data-status="{status}"><div class="card-body p-3 p-md-4">
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-1">
      <p class="fw-semibold mb-0 nk-goal flex-grow-1" style="min-width:0;" data-nk-field="goal">Draft a follow-up email to Ana about Friday's meeting</p>
      ${CHIP}
    </div>
    <p class="small mb-1 nk-muted" data-nk-field="progress">Saved a note with three agenda ideas</p>
    <p class="small mb-2 nk-muted nk-when">Last worked on <span data-nk-field="last_run_at" data-nk-format="datetime"></span></p>
    <p class="nk-result small mb-2" data-nk-field="result"></p>
    <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
      ${TASK_ACTIONS}
      <a class="btn btn-sm btn-outline-primary" href="/agent-task?id={id}">Details</a>
    </div>
  </div></article>
</div>

<details class="card border-0 shadow-sm p-3 p-md-4 mt-4">
  <summary class="fw-semibold">What {{config.agentName}} can and can't do</summary>
  <div class="mt-3">
    <p class="mb-2">{{config.agentName}} can:</p>
    <ul class="mb-3">
      <li>save notes for you: plans, lists, findings, questions;</li>
      <li>write email drafts you review and send from <a href="/agent-drafts">Drafts</a>;</li>
      <li>send an email, but only after you approve it;</li>
      <li>ask your own outside service (for example a self-hosted OpenMuse or another API) to do one task, after you approve it, once you add the service's address in this feature's settings.</li>
    </ul>
    <p class="mb-2">It can't browse the web, read your mailbox or run programs by itself: anything like that has to go through your own service.</p>
    <p class="mb-2">It works a few steps at a time: while this page is open (about every 8 seconds), and every 15 minutes once the app is published. Each evening (18:00 UTC) it writes a short summary of the day.</p>
    <p class="mb-0 nk-muted small">It uses this app's own AI key (AI keys). Only you can open these pages.</p>
  </div>
</details>
</div></section>
${LOOP_SCRIPT}
${CONFIRM_SCRIPT}`;

const APPROVALS_PAGE = `<section class="nk-agent py-4 py-md-5"><div class="container" style="max-width:880px;">
<a class="small" href="/agent">Back to {{config.agentName}}</a>
<h1 class="h2 fw-bold mt-2 mb-1">Waiting for your approval</h1>
<p class="nk-muted mb-4">{{config.agentName}} stops before it sends an email or calls your outside service. Check what it wants to do, then approve or decline. It carries on either way.</p>
<span hidden data-nk-agent-svc="">{{config.serviceName}}</span>
<div data-nk-bind-flow-ref="list-waiting" data-nk-empty-text="Nothing is waiting for your approval." class="nk-approvals nk-observe">
  <article class="card border-0 shadow-sm mb-3" data-nk-item="" data-status="{status}"><div class="card-body p-3 p-md-4">
    <p class="small nk-muted mb-1">Task <span data-nk-field="id">12</span></p>
    <p class="fw-semibold nk-goal mb-3" data-nk-field="goal">Follow up with Ana about Friday's meeting</p>
    <div hidden class="nk-raw-pending" data-nk-field="pending"></div>
    <div class="nk-pending-view mb-3">
      <div class="fw-semibold mb-1">Send an email</div>
      <dl class="nk-args"><dt>To</dt><dd>ana@example.com</dd><dt>Subject</dt><dd>Friday's meeting</dd><dt>Message</dt><dd>Hi Ana, thanks for Friday...</dd></dl>
    </div>
    <div class="d-flex flex-wrap align-items-center gap-2">
      <form data-nk-form="" data-nk-flow-ref="decide" data-nk-pending-text="Working on it..." class="nk-inline"><input type="hidden" name="task_id" value="{id}"/><input type="hidden" name="decision" value="approve"/><button class="btn btn-success btn-sm" type="submit">Approve</button><span data-nk-error class="small"></span></form>
      <form data-nk-form="" data-nk-flow-ref="decide" data-nk-pending-text="Working on it..." class="nk-inline"><input type="hidden" name="task_id" value="{id}"/><input type="hidden" name="decision" value="reject"/><button class="btn btn-outline-danger btn-sm" type="submit">Decline</button><span data-nk-error class="small"></span></form>
      <a class="btn btn-sm btn-outline-secondary" href="/agent-task?id={id}">Details</a>
    </div>
  </div></article>
</div>
</div></section>
${DETAIL_SCRIPT}
${APPROVALS_REFRESH_SCRIPT}`;

const TASK_PAGE = `<section class="nk-agent py-4 py-md-5"><div class="container" style="max-width:880px;">
<a class="small" href="/agent">Back to {{config.agentName}}</a>
<span hidden data-nk-agent-svc="">{{config.serviceName}}</span>
<div data-nk-bind-flow-ref="get-task" data-nk-refresh="5000" data-nk-empty-text="This task wasn't found." class="nk-observe mt-2">
  <article data-nk-item="" data-status="{status}">
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
      <h1 class="h3 fw-bold mb-0 nk-goal flex-grow-1" style="min-width:0;" data-nk-field="goal">Draft a follow-up email to Ana about Friday's meeting</h1>
      ${CHIP}
    </div>
    <p class="mb-1 nk-muted" data-nk-field="progress">Saved a note with three agenda ideas</p>
    <p class="small mb-3 nk-muted nk-when">Last worked on <span data-nk-field="last_run_at" data-nk-format="datetime"></span></p>
    <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
      ${TASK_ACTIONS}
    </div>
    <div hidden class="nk-raw-pending" data-nk-field="pending"></div>
    <div class="nk-pending-view mb-4" hidden></div>
    <div class="nk-result-wrap card border-0 shadow-sm p-3 mb-4"><h2 class="h6 fw-bold">Report</h2><div class="nk-result" data-nk-field="result"></div></div>
    <h2 class="h6 fw-bold mb-3">Step log</h2>
    <div hidden class="nk-raw-steps" data-nk-field="steps"></div>
    <ol class="nk-steps" data-empty="No steps yet."><li><div class="fw-semibold">Save a note</div><p class="small mb-1">Listing three ideas for the agenda.</p></li></ol>
  </article>
</div>

${loopBar(' data-nk-agent-task="" data-idle="This task isn\'t running right now."')}

<h2 class="h5 fw-bold mt-4 mb-3">Notes</h2>
<form data-nk-form="" data-nk-flow-ref="save-note" data-nk-success-text="Note saved." class="card border-0 shadow-sm p-3 mb-3">
  <input type="hidden" name="task_id" data-nk-qs-field="id"/>
  <label class="form-label small fw-semibold" for="nk-agent-note">Add a note of your own</label>
  <textarea id="nk-agent-note" name="content" class="form-control" rows="2" maxlength="4000" required></textarea>
  <div class="text-end mt-2"><button class="btn btn-sm btn-primary" type="submit">Save note</button></div>
  <div data-nk-error class="small"></div>
</form>
<div data-nk-bind-flow-ref="list-notes" data-nk-empty-text="No notes for this task yet.">
  <div class="card border-0 shadow-sm mb-2" data-nk-item=""><div class="card-body p-3"><div class="nk-pre" data-nk-field="content">Agenda ideas: budget, timeline, next steps.</div><div class="small nk-muted mt-1" data-nk-field="created_at" data-nk-format="datetime"></div></div></div>
</div>
</div></section>
${LOOP_SCRIPT}
${DETAIL_SCRIPT}
${CONFIRM_SCRIPT}`;

const DRAFTS_PAGE = `<section class="nk-agent py-4 py-md-5"><div class="container" style="max-width:880px;">
<a class="small" href="/agent">Back to {{config.agentName}}</a>
<h1 class="h2 fw-bold mt-2 mb-1">Drafts and summaries</h1>
<p class="nk-muted mb-4">Emails {{config.agentName}} drafted for you, its daily summaries and its notes. Emails go out from this app's email address.</p>

<h2 class="h5 fw-bold mb-3">Email drafts</h2>
<div data-nk-bind-flow-ref="list-drafts" data-nk-empty-text="No drafts yet.">
  <article class="card border-0 shadow-sm mb-3" data-nk-item="" data-status="{status}"><div class="card-body p-3 p-md-4">
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
      <div style="min-width:0;"><div class="small nk-muted">To <span data-nk-field="to_address">ana@example.com</span></div><div class="fw-semibold nk-goal" data-nk-field="subject">Friday's meeting</div></div>
      <span class="nk-chip"><span class="s-draft">Draft</span><span class="s-sent">Sent</span></span>
    </div>
    <div class="nk-pre small mb-3" data-nk-field="body">Hi Ana, thanks for Friday. Here are the next steps we agreed on...</div>
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <span class="small nk-muted" data-nk-field="created_at" data-nk-format="datetime"></span>
      <form data-nk-form="" data-nk-flow-ref="send-email" data-nk-confirm="Send this email now?" data-nk-success-text="Sent." class="nk-act nk-act-send">
        <input type="hidden" name="draft_id" value="{id}"/><input type="hidden" name="task_id" value="{task_id}"/><input type="hidden" name="to_address" value="{to_address}"/><input type="hidden" name="subject" value="{subject}"/><input type="hidden" name="body" value="{body}"/>
        <button class="btn btn-sm btn-primary" type="submit">Send now</button><span data-nk-error class="small"></span>
      </form>
    </div>
  </div></article>
</div>

<details class="card border-0 shadow-sm p-3 mb-4">
  <summary class="fw-semibold">Write a draft yourself</summary>
  <form data-nk-form="" data-nk-flow-ref="draft-email" data-nk-success-text="Draft saved." class="mt-3">
    <div class="row g-2">
      <div class="col-12 col-md-6"><label class="form-label small" for="nk-draft-to">To</label><input id="nk-draft-to" name="to_address" type="email" class="form-control" required autocomplete="off"/></div>
      <div class="col-12 col-md-6"><label class="form-label small" for="nk-draft-subject">Subject</label><input id="nk-draft-subject" name="subject" class="form-control" maxlength="200" required/></div>
      <div class="col-12"><label class="form-label small" for="nk-draft-body">Message</label><textarea id="nk-draft-body" name="body" class="form-control" rows="4" maxlength="10000" required></textarea></div>
    </div>
    <div class="text-end mt-2"><button class="btn btn-sm btn-primary" type="submit">Save draft</button></div>
    <div data-nk-error class="small"></div>
  </form>
</details>

<h2 class="h5 fw-bold mb-3">Daily summaries</h2>
<div data-nk-bind-flow-ref="list-summaries" data-nk-empty-text="No summaries yet. The first one is written in the evening (18:00 UTC) once the app is published.">
  <article class="card border-0 shadow-sm mb-3" data-nk-item=""><div class="card-body p-3 p-md-4"><div class="fw-semibold mb-1" data-nk-field="day">2026-10-12</div><div class="nk-pre" data-nk-field="content">Today the agent drafted two emails and saved a note. One email is waiting for your approval.</div></div></article>
</div>

<h2 class="h5 fw-bold mt-4 mb-3">Notes</h2>
<div data-nk-bind-flow-ref="list-notes" data-nk-empty-text="No notes yet.">
  <div class="card border-0 shadow-sm mb-2" data-nk-item=""><div class="card-body p-3"><div class="nk-pre" data-nk-field="content">Agenda ideas: budget, timeline, next steps.</div><div class="small nk-muted mt-1"><a href="/agent-task?id={task_id}">Task <span data-nk-field="task_id">12</span></a> · <span data-nk-field="created_at" data-nk-format="datetime"></span></div></div></div>
</div>
</div></section>
${CONFIRM_SCRIPT}`;

/* ── The feature ─────────────────────────────────────────────────── */

export const aiAgent: ModuleDefinition = {
  id: "ai-agent",
  name: "Personal AI agent",
  tagline: "A helper that works on your goals and asks before acting",
  description:
    "Your own AI agent inside the app. Give it goals: it works on them a few steps at a time (while its page is open, and every 15 minutes once the app is published), saves notes, drafts emails, and asks for your approval before it sends an email or calls an outside service you run, such as a self-hosted OpenMuse. Live progress with pause, resume and cancel, a step log for every task, and a daily summary. It can't browse the web or read a mailbox by itself. Uses the app's own AI key; all its pages are for you only.",
  icon: "",
  color: "from-brand-500 to-cyan-500",
  category: "productivity",
  version: "1.0.0",
  provides: ["ai"],
  config: [
    { key: "agentName", label: "Agent name", type: "text", default: "Dot", required: true },
    {
      key: "instructions",
      label: "How the agent should behave",
      type: "textarea",
      default:
        "Be careful, honest and brief. Work only toward the goal you were given. Draft emails rather than sending them unless the goal clearly asks you to send. If something is unclear, save a note with your question and finish.",
    },
    {
      key: "ownerEmail",
      label: "Your email (optional)",
      type: "text",
      placeholder: "you@example.com",
      help: "Where the daily summary is sent. Leave it empty to see summaries only in the app. Emails the agent sends (after you approve them) go out from this app's email address.",
    },
    { key: "serviceName", label: "Your outside service's name (optional)", type: "text", placeholder: "My OpenMuse" },
    {
      key: "serviceUrl",
      label: "Your outside service's address (optional)",
      type: "url",
      placeholder: "https://muse.example.com/api/run",
      help: 'A public https address. After you approve it, the agent sends it {"task": "..."} as JSON and reads the answer. Leave it empty if you don\'t run one.',
    },
    {
      key: "serviceToken",
      label: "Your outside service's key (optional)",
      type: "text",
      help: 'Sent as "Authorization: Bearer ...". It is kept in the app\'s flows, which only you can see.',
    },
  ],
  tables: [
    {
      name: "tasks",
      fields: [
        { name: "goal", type: "text" },
        { name: "status", type: "text" },
        { name: "progress", type: "text" },
        { name: "steps", type: "text" },
        { name: "pending", type: "text" },
        { name: "state", type: "text" },
        { name: "result", type: "text" },
        { name: "last_run_at", type: "timestamp" },
      ],
    },
    { name: "notes", fields: [{ name: "task_id", type: "text" }, { name: "content", type: "text" }] },
    {
      name: "drafts",
      fields: [
        { name: "task_id", type: "text" },
        { name: "to_address", type: "text" },
        { name: "subject", type: "text" },
        { name: "body", type: "text" },
        { name: "status", type: "text" },
      ],
    },
    { name: "summaries", fields: [{ name: "day", type: "text" }, { name: "content", type: "text" }] },
  ],
  flows: [
    {
      slug: "create-task",
      name: "Agent: add a goal",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "branch", data: { label: "Has a goal?", left: "{{trigger.goal}}", op: "exists" } },
        { id: "n3", type: "insert", data: { table: "tasks", values: { goal: "{{trigger.goal}}", status: "running", progress: "Waiting to start" }, output: "task" } },
        { id: "n4", type: "response", data: { status: 200, body: "{{vars.task}}" } },
        { id: "n5", type: "response", data: { status: 400, body: '{"error":"Write a goal first."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3", sourceHandle: "true" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n2", target: "n5", sourceHandle: "false" },
      ],
    },
    listFlow("list-tasks", "Agent: tasks", "tasks", { orderBy: "created_at desc", limit: 50, strip: "all" }),
    listFlow("get-task", "Agent: one task", "tasks", { where: { id: "{{trigger.id}}" }, orderBy: "created_at desc", limit: 1, strip: "keep-steps" }),
    listFlow("list-waiting", "Agent: waiting for approval", "tasks", { where: { status: "waiting" }, orderBy: "created_at asc", limit: 50, strip: "all" }),
    {
      // Called by the agent's pages about every 8 seconds while a task runs.
      slug: "work",
      name: "Agent: work a few steps",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "branch", data: { label: "A task was named?", left: "{{trigger.task_id}}", op: "exists" } },
        { id: "n3", type: "query", data: { label: "That task", table: "tasks", where: { id: "{{trigger.task_id}}" }, limit: 1, output: "task" } },
        { id: "n4", type: "query", data: { label: "The oldest running task", table: "tasks", where: { status: "running" }, orderBy: "created_at asc", limit: 1, output: "task" } },
        { id: "n5", type: "branch", data: { label: "Running?", left: "{{vars.task.0.status}}", op: "==", right: "running" } },
        { id: "n6", type: "response", data: { status: 200, body: IDLE } },
        ...RUN.nodes,
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3", sourceHandle: "true" },
        { id: "e3", source: "n2", target: "n4", sourceHandle: "false" },
        { id: "e4", source: "n3", target: "n5" },
        { id: "e5", source: "n4", target: "n5" },
        { id: "e6", source: "n5", target: "a1", sourceHandle: "true" },
        { id: "e7", source: "n5", target: "n6", sourceHandle: "false" },
        ...RUN.edges,
      ],
    },
    {
      // The same work while nobody has the page open (published apps; AI flows run at most every 15 minutes).
      slug: "tick",
      name: "Agent: work every 15 minutes",
      httpMethod: "POST",
      schedule: '{"kind":"every","minutes":15}',
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n4", type: "query", data: { label: "The oldest running task", table: "tasks", where: { status: "running" }, orderBy: "created_at asc", limit: 1, output: "task" } },
        { id: "n5", type: "branch", data: { label: "Running?", left: "{{vars.task.0.status}}", op: "==", right: "running" } },
        { id: "n6", type: "response", data: { status: 200, body: IDLE } },
        ...RUN.nodes,
      ],
      edges: [
        { id: "e1", source: "n1", target: "n4" },
        { id: "e2", source: "n4", target: "n5" },
        { id: "e3", source: "n5", target: "a1", sourceHandle: "true" },
        { id: "e4", source: "n5", target: "n6", sourceHandle: "false" },
        ...RUN.edges,
      ],
    },
    {
      slug: "decide",
      name: "Agent: approve or decline an action",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tasks", where: { id: "{{trigger.task_id}}" }, limit: 1, output: "task" } },
        { id: "n3", type: "branch", data: { label: "Waiting for approval?", left: "{{vars.task.0.status}}", op: "==", right: "waiting" } },
        { id: "n4", type: "response", data: { status: 409, body: '{"error":"This task isn\'t waiting for approval any more."}' } },
        ...DECIDE.nodes,
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "a1", sourceHandle: "true" },
        { id: "e4", source: "n3", target: "n4", sourceHandle: "false" },
        ...DECIDE.edges,
      ],
    },
    statusFlow("pause", "Agent: pause a task", "running|waiting", "paused", "Paused by you", "Paused.", "This task can't be paused now."),
    statusFlow("resume", "Agent: resume a task", "paused", "running", "Back on it", "Resumed.", "Only a paused task can be resumed."),
    statusFlow("cancel", "Agent: cancel a task", "running|waiting|paused", "cancelled", "Cancelled by you", "Cancelled.", "This task has already ended."),
    {
      // Tool: a note (the owner can add notes too, on a task's page).
      slug: "save-note",
      name: "Agent tool: save a note",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "branch", data: { label: "Has text?", left: "{{trigger.content}}", op: "exists" } },
        { id: "n3", type: "insert", data: { table: "notes", values: { task_id: "{{trigger.task_id}}", content: "{{trigger.content}}" } } },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true,"message":"Note saved."}' } },
        { id: "n5", type: "response", data: { status: 400, body: '{"error":"The note is empty."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3", sourceHandle: "true" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n2", target: "n5", sourceHandle: "false" },
      ],
    },
    {
      // Tool: an email draft, nothing is sent (the owner can write drafts too).
      slug: "draft-email",
      name: "Agent tool: draft an email",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "drafts",
            values: { task_id: "{{trigger.task_id}}", to_address: "{{trigger.to_address}}", subject: "{{trigger.subject}}", body: "{{trigger.body}}", status: "draft" },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Draft saved. The owner can review and send it from the Drafts page."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      // Tool (after the owner's approval), and the Drafts page's "Send now" (with draft_id).
      slug: "send-email",
      name: "Agent tool: send an email",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "branch", data: { label: "Has an address?", left: "{{trigger.to_address}}", op: "exists" } },
        { id: "n3", type: "response", data: { status: 400, body: '{"error":"Give an address to send the email to."}' } },
        { id: "n4", type: "email", data: { to: "{{trigger.to_address}}", subject: "{{trigger.subject}}", body: "{{trigger.body}}", output: "mail" } },
        { id: "n5", type: "branch", data: { label: "Sent?", left: "{{vars.mail.ok}}", op: "==", right: "true" } },
        { id: "n6", type: "response", data: { status: 422, body: '{"ok":false,"error":"The email couldn\'t be sent. Email may not be set up on this app\'s server."}' } },
        { id: "n7", type: "branch", data: { label: "From a draft?", left: "{{trigger.draft_id}}", op: "exists" } },
        { id: "n8", type: "update", data: { table: "drafts", where: { id: "{{trigger.draft_id}}" }, values: { status: "sent" } } },
        { id: "n9", type: "response", data: { status: 200, body: '{"ok":true,"message":"Email sent."}' } },
        {
          id: "n10",
          type: "insert",
          data: {
            table: "drafts",
            values: { task_id: "{{trigger.task_id}}", to_address: "{{trigger.to_address}}", subject: "{{trigger.subject}}", body: "{{trigger.body}}", status: "sent" },
          },
        },
        { id: "n11", type: "response", data: { status: 200, body: '{"ok":true,"message":"Email sent."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3", sourceHandle: "false" },
        { id: "e3", source: "n2", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6", sourceHandle: "false" },
        { id: "e6", source: "n5", target: "n7", sourceHandle: "true" },
        { id: "e7", source: "n7", target: "n8", sourceHandle: "true" },
        { id: "e8", source: "n8", target: "n9" },
        { id: "e9", source: "n7", target: "n10", sourceHandle: "false" },
        { id: "e10", source: "n10", target: "n11" },
      ],
    },
    {
      slug: "daily-summary",
      name: "Agent: daily summary",
      httpMethod: "POST",
      schedule: '{"kind":"daily","at":"18:00","tz":"UTC"}',
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tasks", orderBy: "created_at desc", limit: 100, output: "tasks" } },
        {
          id: "n3",
          type: "custom_js",
          data: {
            label: "Today's tasks",
            output: "digest",
            code: `var rows = Array.isArray(vars.tasks) ? vars.tasks : [];
var since = Date.now() - 24 * 3600 * 1000;
var lines = [];
var waiting = 0;
rows.forEach(function (t) {
  var when = Date.parse(t.last_run_at || t.created_at || '');
  if (!(when >= since) && t.status !== 'waiting') return;
  if (t.status === 'waiting') waiting++;
  var pending = '';
  try { var p = t.pending ? JSON.parse(t.pending) : null; if (p && p.tool) pending = ' Waiting for approval to use ' + p.tool + '.'; } catch (e) {}
  lines.push('- Task ' + t.id + ' [' + t.status + ']: ' + String(t.goal || '').slice(0, 300) + '. Latest: ' + String(t.progress || '').slice(0, 200) + (t.result ? '. Report: ' + String(t.result).slice(0, 600) : '') + pending);
});
return { count: lines.length, waiting: waiting, text: lines.slice(0, 30).join('\\n') };`,
          },
        },
        { id: "n4", type: "branch", data: { label: "Anything today?", left: "{{vars.digest.count}}", op: ">", right: "0" } },
        {
          id: "n5",
          type: "ai_prompt",
          data: {
            label: "Write the summary",
            system: "You write short daily summaries for the owner of a personal AI agent named {{config.agentName}}. Plain text only: no markdown, no headings, no emoji. Be factual and never invent work that isn't listed.",
            prompt:
              "Write today's summary ({{now.date}}) in at most 150 words: what the agent did, what finished, and what waits for the owner's approval ({{vars.digest.waiting}} task(s)).\n\nToday's tasks:\n{{vars.digest.text}}",
            maxTokens: 600,
            output: "summary",
          },
        },
        { id: "n6", type: "insert", data: { table: "summaries", values: { day: "{{now.date}}", content: "{{vars.summary}}" } } },
        // The owner's address is filled in at install: no address, no email (an email step without "to" would fail).
        { id: "n7", type: "branch", data: { label: "Email the owner?", left: "{{config.ownerEmail}}", op: "exists" } },
        {
          id: "n8",
          type: "email",
          data: {
            to: "{{config.ownerEmail}}",
            subject: "{{config.agentName}}: your daily summary",
            body: "{{vars.summary}}\n\nOpen {{config.agentName}} in your app for the details and anything waiting for your approval.",
            output: "mail",
          },
        },
        { id: "n9", type: "response", data: { status: 200, body: '{"ok":true,"emailed":true}' } },
        { id: "n10", type: "response", data: { status: 200, body: '{"ok":true}' } },
        { id: "n11", type: "response", data: { status: 200, body: '{"ok":true,"quiet":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5", sourceHandle: "true" },
        { id: "e5", source: "n4", target: "n11", sourceHandle: "false" },
        { id: "e6", source: "n5", target: "n6" },
        { id: "e7", source: "n6", target: "n7" },
        { id: "e8", source: "n7", target: "n8", sourceHandle: "true" },
        { id: "e9", source: "n8", target: "n9" },
        { id: "e10", source: "n7", target: "n10", sourceHandle: "false" },
      ],
    },
    listFlow("list-drafts", "Agent: drafts", "drafts", { orderBy: "created_at desc", limit: 100 }),
    listFlow("list-summaries", "Agent: daily summaries", "summaries", { orderBy: "created_at desc", limit: 60 }),
    // On a task's page (?id=…) only that task's notes; elsewhere all of them (a blank filter is dropped).
    listFlow("list-notes", "Agent: notes", "notes", { where: { task_id: "{{trigger.id}}" }, orderBy: "created_at desc", limit: 100 }),
  ],
  pages: [
    // Page titles aren't filled from settings at install, so the agent's name is in each page's heading instead.
    { slug: "agent", title: "AI agent", ownerOnly: true, html: AGENT_PAGE, css: CSS },
    { slug: "agent-approvals", title: "Agent approvals", ownerOnly: true, html: APPROVALS_PAGE, css: CSS },
    { slug: "agent-task", title: "Agent task", ownerOnly: true, html: TASK_PAGE, css: CSS },
    { slug: "agent-drafts", title: "Agent drafts", ownerOnly: true, html: DRAFTS_PAGE, css: CSS },
  ],
};
