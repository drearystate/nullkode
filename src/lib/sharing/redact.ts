import { db } from "../db";
import { newRedactionReport, redactFlowGraph, redactModuleConfig } from "../export-secrets";
import type { Role } from "./access";

/**
 * Keys stay the owner's (docs/sharing.md): an app's features copy their
 * private settings (a Stripe secret key, an SMS token…) into its flows when
 * they're added, so collaborators see flows with those values blanked, the
 * same way the backup download blanks them (lib/export-secrets.ts). When an
 * editor saves a flow, every blanked value they didn't change is put back,
 * so their save never wipes the owner's keys.
 */

/** The private values of the app's feature settings. */
export async function appSecretValues(projectId: string): Promise<Set<string>> {
  const secrets = new Set<string>();
  const report = newRedactionReport();
  const modules = await db.projectModule.findMany({ where: { projectId }, select: { config: true } });
  for (const m of modules) redactModuleConfig(m.config, secrets, report);
  return secrets;
}

/** A flow graph as a collaborator sees it (unchanged for the owner). */
export function graphFor(role: Role, graph: unknown, secrets: Set<string>): unknown {
  if (role === "owner") return graph;
  return redactFlowGraph(JSON.parse(JSON.stringify(graph ?? {})), secrets, newRedactionReport());
}

/** Flows as a collaborator sees them (unchanged for the owner). */
export async function flowsFor<T extends { graph: unknown; projectId: string }>(role: Role, flows: T[]): Promise<T[]> {
  if (role === "owner" || !flows.length) return flows;
  const secrets = await appSecretValues(flows[0].projectId);
  return flows.map((f) => ({ ...f, graph: graphFor(role, f.graph, secrets) }));
}

type Node = { id?: unknown };

function restore(incoming: unknown, shown: unknown, current: unknown): unknown {
  if (typeof incoming === "string") {
    // Unchanged from what the collaborator was shown, but blanked: the real value.
    return typeof shown === "string" && incoming === shown && typeof current === "string" && current !== shown ? current : incoming;
  }
  if (Array.isArray(incoming)) {
    const byId = (list: unknown) => new Map((Array.isArray(list) ? list : []).filter((n): n is Node => Boolean(n) && typeof n === "object" && typeof (n as Node).id === "string").map((n) => [(n as Node).id as string, n]));
    const keyed = incoming.every((n) => n && typeof n === "object" && typeof (n as Node).id === "string");
    if (keyed) {
      const shownById = byId(shown);
      const currentById = byId(current);
      return incoming.map((n) => restore(n, shownById.get((n as Node).id as string), currentById.get((n as Node).id as string)));
    }
    return incoming.map((v, i) => restore(v, Array.isArray(shown) ? shown[i] : undefined, Array.isArray(current) ? current[i] : undefined));
  }
  if (incoming && typeof incoming === "object") {
    const out: Record<string, unknown> = {};
    const s = shown && typeof shown === "object" ? (shown as Record<string, unknown>) : {};
    const c = current && typeof current === "object" ? (current as Record<string, unknown>) : {};
    for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) out[k] = restore(v, s[k], c[k]);
    return out;
  }
  return incoming;
}

/**
 * A graph a collaborator saved, with the owner's hidden values put back
 * wherever the collaborator left the blank they were shown.
 */
export function keepHiddenValues(role: Role, incoming: unknown, current: unknown, secrets: Set<string>): unknown {
  if (role === "owner" || incoming === undefined) return incoming;
  const shown = graphFor(role, current, secrets);
  return restore(incoming, shown, current);
}

/** Feature settings an editor sends when adding a feature: never private keys (those are the owner's to enter). */
export function withoutPrivateSettings<T extends Record<string, unknown>>(role: Role, config: T | undefined): T | undefined {
  if (role === "owner" || !config) return config;
  const secrets = new Set<string>();
  return redactModuleConfig(config, secrets, newRedactionReport()) as T;
}
