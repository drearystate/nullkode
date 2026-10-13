/**
 * Which flow steps call an AI model, and whether an app, a plan or a
 * feature uses them. Shared by the runtime limits, the scheduler's minimum
 * gap, the "add your own AI key" notices and the partner API. No database
 * or server-only imports: the flow editor uses it too.
 */

/** Flow step types that call an AI model (with the app's own key). */
export const AI_NODE_TYPES = ["ai_prompt", "ai_chat", "ai_agent", "ai_structured", "ai_vision", "ai_embed", "ai_search", "ai_speech"] as const;
export type AiNodeType = (typeof AI_NODE_TYPES)[number];

const AI_SET = new Set<string>(AI_NODE_TYPES);

export function isAiNodeType(type: unknown): type is AiNodeType {
  return typeof type === "string" && AI_SET.has(type);
}

/** Whether a flow graph has a step that calls the AI. */
export function graphUsesAi(graph: unknown): boolean {
  const nodes = (graph as { nodes?: unknown } | null)?.nodes;
  return Array.isArray(nodes) && nodes.some((n) => isAiNodeType((n as { type?: unknown } | null)?.type));
}

/** Whether any of these flows (graphs or { graph } rows, or { nodes } module flows) uses AI. */
export function flowsUseAi(flows: Array<{ graph?: unknown; nodes?: unknown } | null | undefined>): boolean {
  return flows.some((f) => f && (graphUsesAi(f.graph) || graphUsesAi({ nodes: f.nodes })));
}

/** Words in a plan that mean an AI feature (the plan has no step types yet). */
const AI_WORDS = /\b(ai|a\.i\.|llm|gpt|chat ?bot|chatbot|assistant|companion|persona|agent|embedding|semantic search|summari[sz]e|transcri|text[- ]to[- ]speech|generat(e|es|ed|ing) (a |an |the )?(reply|replies|answer|answers|text|caption|description|summary))\b/i;

type PlanLike = {
  aiFeatures?: unknown;
  flows?: Array<{ kind?: string | null; purpose?: string | null; name?: string | null }>;
  pages?: Array<{ summary?: string | null }>;
  project?: { description?: string | null };
};

/** Whether a plan includes AI features: the planner says so ("aiFeatures"), or a flow is of kind "ai". */
export function planUsesAi(plan: PlanLike | null | undefined): boolean {
  if (!plan) return false;
  if (Array.isArray(plan.aiFeatures) && plan.aiFeatures.some((f) => typeof f === "string" && f.trim())) return true;
  if ((plan.flows ?? []).some((f) => (f.kind ?? "").toLowerCase() === "ai")) return true;
  return (plan.flows ?? []).some((f) => AI_WORDS.test(`${f.name ?? ""} ${f.purpose ?? ""}`) && /\b(ai|llm|gpt|model)\b/i.test(`${f.name ?? ""} ${f.purpose ?? ""}`));
}
