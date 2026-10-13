/**
 * Every flow node type the runtime (lib/flow/runtime.ts) knows how to run.
 * The runtime silently skips a node whose type it doesn't know, so a flow
 * the AI wrote with an invented type ("send_email", "sql") looks fine but
 * never does its job. The build checks and the flow builders use this list.
 *
 * Kept here rather than in lib/flow/types.ts so the AI tooling doesn't
 * reach into the runtime's types; keep the two in step when a node type is
 * added.
 */
export const NODE_TYPES = [
  "trigger",
  "set",
  "query",
  "insert",
  "update",
  "delete",
  "sheets_read",
  "sheets_append",
  "http_request",
  "branch",
  "response",
  "email",
  "send_push",
  "ai_prompt",
  "ai_chat",
  "ai_agent",
  "ai_structured",
  "ai_vision",
  "ai_embed",
  "ai_search",
  "ai_speech",
  "delay",
  "parse_json",
  "math",
  "hash_password",
  "verify_password",
  "set_session",
  "get_session",
  "clear_session",
  "lookup",
  "check_role",
  "bulk_insert",
  "bulk_update",
  "bulk_delete",
  "aggregate",
  "custom_js",
] as const;

export type KnownNodeType = (typeof NODE_TYPES)[number];

const KNOWN = new Set<string>(NODE_TYPES);

export function isKnownNodeType(type: string): type is KnownNodeType {
  return KNOWN.has(type);
}

/**
 * Names models commonly use for a real node type. Only unambiguous ones:
 * the node's settings keep the same meaning under the real name.
 */
export const NODE_TYPE_ALIASES: Record<string, KnownNodeType> = {
  send_email: "email",
  email_send: "email",
  mail: "email",
  send_mail: "email",
  http: "http_request",
  fetch: "http_request",
  webhook: "http_request",
  api_request: "http_request",
  api_call: "http_request",
  http_call: "http_request",
  request: "http_request",
  if: "branch",
  condition: "branch",
  conditional: "branch",
  respond: "response",
  reply: "response",
  return: "response",
  select: "query",
  read: "query",
  find: "query",
  db_query: "query",
  create: "insert",
  insert_row: "insert",
  create_row: "insert",
  update_row: "update",
  delete_row: "delete",
  remove: "delete",
  js: "custom_js",
  javascript: "custom_js",
  code: "custom_js",
  script: "custom_js",
  push: "send_push",
  push_notification: "send_push",
  notify: "send_push",
  variable: "set",
  set_var: "set",
  set_variable: "set",
  assign: "set",
  wait: "delay",
  sleep: "delay",
  join: "lookup",
  count: "aggregate",
  group_by: "aggregate",
  hash: "hash_password",
  login: "set_session",
  logout: "clear_session",
  session: "get_session",
  role_check: "check_role",
  ai: "ai_prompt",
  llm: "ai_prompt",
  ask_ai: "ai_prompt",
  chat: "ai_chat",
  ai_reply: "ai_chat",
  chatbot: "ai_chat",
  agent: "ai_agent",
  ai_tool: "ai_agent",
  ai_json: "ai_structured",
  extract: "ai_structured",
  vision: "ai_vision",
  ai_image: "ai_vision",
  embed: "ai_embed",
  embedding: "ai_embed",
  embeddings: "ai_embed",
  semantic_search: "ai_search",
  vector_search: "ai_search",
  tts: "ai_speech",
  text_to_speech: "ai_speech",
  speech: "ai_speech",
};

/** The real type for a (possibly invented) node type, or null. */
export function canonicalNodeType(type: string): KnownNodeType | null {
  const t = type.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (isKnownNodeType(t)) return t;
  return NODE_TYPE_ALIASES[t] ?? null;
}
