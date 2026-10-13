/**
 * The builder's playbook for AI products: AI companions (like Grok's
 * Ani/Rudi), personal agents (like OpenAI's "dots"), OpenMuse-style agent
 * apps with live task progress and approvals, chatbots and knowledge bots.
 * The planner, the flow builder, the page builder and Ask AI read it when an
 * idea or a plan is about AI (docs/ai-in-apps.md).
 *
 * Everything an app does with AI runs with the APP's own AI key (AI keys,
 * lib/app-ai). Keys never go into tables, pages or flow replies.
 */

/** Words that mean the idea is an AI product (any of them is enough to add the guide). */
const AI_IDEA = /\b(ai|a\.i\.|llm|gpt|chat ?gpt|chat ?bot|chatbots?|bot|assistant|companion|virtual (friend|girlfriend|boyfriend|pet|character)|persona|agent|agents|agentic|autonomous|copilot|grok|ani|rudi|openai|dots|openmuse|muse|gemini|claude|ollama|talk (to|with)|chat (to|with)|voice chat|knowledge ?bot|ask (my|our|the) (docs|documents|files|notes)|rag|embeddings?|semantic search|summari[sz]e|transcrib\w*|text[- ]to[- ]speech|tts)\b/i;

export function looksLikeAiApp(text: string): boolean {
  return AI_IDEA.test(text);
}

/** For the planner (phase 1), added when the idea looks like an AI product. */
export const AI_PLAN_GUIDE = `AI PRODUCTS (this idea uses AI). The app's AI runs with the app owner's OWN AI key (set later in "AI keys"); never plan anything that needs the platform's AI.
- List the app's AI features in plain words in "aiFeatures" (e.g. "Chat with Nova, who remembers what you tell her"). Leave it [] for apps without AI.
- Flows that call AI use kind "ai" (table: the main table it reads or writes, or null).
- Patterns:
  * AI COMPANION (an animated character to chat and talk with, like Grok's companions): tables companions(name, personality, greeting, boundaries, avatar_style), messages(conversation_id, role, content), memories(conversation_id, fact), moods(conversation_id, mood, closeness int), reports(conversation_id, message, reason). Flows: "chat" (ai, reads messages + memories + mood, saves both turns), "remember" (ai, pulls facts the person shares into memories), "history" (list messages of one conversation), "report" (create). Pages: the chat screen (animated avatar with expressions and idle animation, chat log, text box, microphone + read-aloud toggles, report button), an admin page to edit the persona and see reports. Safe by default: friendly, no sexual or romantic role-play, crisis help, never claims to be human.
  * PERSONAL AGENT (always-on helper that works toward goals, uses connected services, asks before risky actions and reports back, like OpenAI's dots): tables tasks(goal, status, progress, steps json, pending json, state text, result, approval_note), services(name, base_url, notes), summaries(day, text). Flows: "create task", "list tasks", "work on tasks" (ai: an agent with tools; risky tools need approval), "approve"/"reject", "pause"/"resume"/"cancel", "daily summary". Pages: tasks with live progress (refreshes itself), an approvals inbox, task detail with the step log, connected services, summaries.
  * OPENMUSE-STYLE AGENT APP (chat + live task progress + pause/resume/approve): the personal-agent pattern with a chat screen in front.
  * CHATBOT / HELPER: one "ask" flow (ai) + a conversation table when it should remember.
  * KNOWLEDGE BOT (answers from the owner's documents, with sources): tables documents(title, source, content), chunks(document_id, chunk_index, content, embedding text). Flows: "add document" (ai: cut into pieces + embeddings), "ask" (ai: search by meaning, answer citing sources), "list documents".
- HONEST LIMITS, put the relevant ones in "assumptions": a NullKode app runs pages and server flows; it has no computer, web browser or terminal of its own, so it can't click around websites, read a mailbox by itself or run programs. Those parts must call an outside service the owner runs or subscribes to, over its HTTP API or webhooks (for example their self-hosted OpenMuse, a mail provider's API or an inbound-email webhook), or be left out. Long work happens a few steps at a time on a schedule, not continuously. Keys for connected services stay in the flows (only the owner sees them), never in tables or pages.`;

/** The AI flow steps, for the flow builder (always listed) and Ask AI. Kept short: the full guide is AI_FLOW_GUIDE. */
export const AI_NODE_LINES = `- ai_prompt: {"system":"...","prompt":"{{trigger.text}}","output":"ai"} — one answer as text
- ai_chat: {"system":"<persona and rules>","message":"{{trigger.message}}","context":"<extra facts, e.g. {{vars.memories}}>","table":"messages","where":{"conversation_id":"{{trigger.conversation_id}}"},"historyLimit":20,"output":"reply"} — reads the last messages (columns role, content) of that conversation, answers, and saves both turns; reply in {{vars.reply}}
- ai_structured: {"prompt":"...","schema":"{\\"mood\\":\\"happy\\",\\"facts\\":[]}","output":"data"} — the answer as a JSON object ({{vars.data.mood}})
- ai_agent: {"system":"...","prompt":"{{trigger.goal}}","tools":[{"name":"send_email","description":"...","kind":"flow","flow":"<flow-slug>","params":"to, subject, body","needsApproval":true},{"name":"lookup","kind":"http","method":"POST","url":"https://...","params":"query"}],"maxSteps":6,"state":"{{vars.task.0.state}}","decision":"{{trigger.decision}}","output":"agent"} — prompt starts a task; with a saved state, "message" adds the person's follow-up; {{vars.agent.status}} is done | needs_approval | step_limit; also answer, steps, pending, state (save state to continue later)
- ai_vision: {"image":"{{trigger.image}}","prompt":"What is in this photo?","output":"vision"}
- ai_embed: {"input":"{{trigger.content}}","mode":"chunks","extra":{"document_id":"{{vars.inserted.id}}"},"output":"chunks"} — rows {content, chunk_index, embedding, ...extra} for bulk_insert {"rowsVar":"chunks"}; mode "single" gives one vector
- ai_search: {"query":"{{trigger.question}}","table":"chunks","field":"embedding","topK":5,"output":"matches"} — the closest rows with a score
- ai_speech: {"text":"{{vars.reply}}","output":"speech"} — {audio (data URL) or null, browser:true when the page must use speechSynthesis}`;

/** For the flow builder when a flow is of kind "ai" (or the app uses AI). */
export const AI_FLOW_GUIDE = `AI STEPS (they use the app's own AI key; never put keys in flows' replies or tables):
${AI_NODE_LINES}
Rules: a chat flow replies {"reply":"{{vars.reply}}"} (plus anything the page shows). Use ai_structured when later steps need fields. An agent flow saves {{vars.agent.state}}, status, steps and pending on its task row with an update step, then replies with them. Tools that send, pay, post, delete or contact people are "needsApproval": true. Keys for outside services go in http tool headers. If no AI key is set, the step fails with a clear message to the visitor; don't add fallbacks.`;

/** For the page builder when the app has AI features. */
export const AI_PAGE_GUIDE = `AI SCREENS (the app has AI features):
- Chat screens call the chat flow from a small <script>: fetch('/api/run/<chat-flow-slug>', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({message, conversation_id})}) and show json.reply; on an error show json.error as it is (it says when the app's AI isn't set up yet). Keep conversation_id in localStorage (crypto.randomUUID()). Show a typing indicator while waiting; disable the send button meanwhile.
- Load earlier messages with the history flow on page load.
- Voice: microphone with (window.SpeechRecognition || window.webkitSpeechRecognition) when available (hide the button otherwise); read replies aloud with speechSynthesis, or play json.speech.audio when a read-aloud flow returns audio. A toggle turns reading aloud on and off.
- An animated character: an inline SVG face/body drawn by you (no external images), with CSS keyframes for idle breathing and blinking, and expression classes (happy, thinking, sad, surprised, talking) switched from the reply's mood; mouth moves while speaking.
- Agent screens: a task list that refreshes itself (data-nk-refresh="5000" on the bound list: milliseconds), status chips (running, paused, waiting for approval, done, cancelled), buttons to pause, resume, cancel, approve and decline that call their flows, and the step log of a task.
- Always show a short note that replies are written by AI and can be wrong.`;
