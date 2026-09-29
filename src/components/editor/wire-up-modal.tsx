"use client";
import { useEffect, useState } from "react";
import { installedFlowSlug, type BlockModuleMapping } from "./block-module-map";

/** A flow the block was connected to: its installed slug, id and name. */
export type WiredFlow = { slug: string; id: string; name: string };

type Props = {
  mapping: BlockModuleMapping;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onWired: (flows: WiredFlow[]) => void;
};

type FlowRow = { id: string; slug: string; name: string };

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

async function projectFlows(projectId: string): Promise<FlowRow[]> {
  const res = await fetch(`/api/projects/${projectId}/flows`);
  if (!res.ok) throw new Error("We couldn't load this app's automations. Please try again.");
  return ((await readJson(res)).flows as FlowRow[] | undefined) ?? [];
}

async function hasModule(projectId: string, moduleId: string): Promise<boolean> {
  const res = await fetch(`/api/projects/${projectId}/modules`);
  if (!res.ok) throw new Error("We couldn't check this app's features. Please try again.");
  const installed = ((await readJson(res)).installed as Array<{ moduleId: string }> | undefined) ?? [];
  return installed.some((m) => m.moduleId === moduleId);
}

/**
 * Sets up the block's feature (only if the app doesn't have it yet, so a
 * second copy is never made) and returns the flows the block should use.
 */
async function wire(mapping: BlockModuleMapping, projectId: string, already: boolean): Promise<WiredFlow[]> {
  const wanted = mapping.flowRefs.map((ref) => ({ ref, slug: installedFlowSlug(mapping, ref) }));
  let ids: Record<string, string> = {};
  if (!already) {
    const res = await fetch(`/api/projects/${projectId}/modules`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moduleId: mapping.moduleId, config: {}, skipPages: true, seed: mapping.seed }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Failed (${res.status})`);
    ids = (data.flowIds as Record<string, string> | undefined) ?? {};
  }
  const flows = await projectFlows(projectId);
  return wanted.map(({ ref, slug }) => {
    // A fresh install says which flow is which; an app that already had the
    // feature is looked up by the flow's installed name.
    const flow = ids[ref] ? flows.find((f) => f.id === ids[ref]) : flows.find((f) => f.slug === slug);
    if (!flow) throw new Error("Your app has this feature, but part of it is missing. You can connect this block in Flows instead.");
    return { slug, id: flow.id, name: flow.name };
  });
}

export function WireUpModal({ mapping, projectId, open, onClose, onWired }: Props) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the app already has this feature (null while checking).
  const [already, setAlready] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setAlready(null);
    hasModule(projectId, mapping.moduleId)
      .then((has) => { if (live) setAlready(has); })
      .catch(() => { /* checked again on Connect */ });
    return () => { live = false; };
  }, [open, projectId, mapping.moduleId]);

  if (!open) return null;

  async function handleConnect() {
    setInstalling(true);
    setError(null);
    try {
      const has = already ?? (await hasModule(projectId, mapping.moduleId));
      onWired(await wire(mapping, projectId, has));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setInstalling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[min(440px,calc(100vw-32px))] rounded-xl border border-surface-700 bg-surface-900 shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-0">
          <h3 className="text-base font-bold">Wire this up?</h3>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-surface-300 leading-relaxed">
            {mapping.purpose}
          </p>
          {error && (
            <div className="px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 pb-4 flex gap-3">
          <button
            onClick={handleConnect}
            disabled={installing}
            data-help="Set up what this block needs behind the scenes, like a place to keep what people send. No extra pages are added."
            className="flex-1 btn-primary py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {installing ? "Setting up..." : "Yes, connect it"}
          </button>
          <button
            onClick={onClose}
            disabled={installing}
            data-help="Keep the block on your page as it is, without setting anything up. You can connect it later in Flows or by asking the AI."
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg border border-surface-700 text-surface-300 hover:bg-surface-800 transition disabled:opacity-50"
          >
            No, I&apos;ll handle it
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[11px] text-surface-500 leading-relaxed">
            <strong>Connect it</strong> — {already ? mapping.existing : mapping.description} It doesn&apos;t add extra pages.
            <br />
            <strong>Handle it</strong> — keeps the block as it is, not connected to anything. You can set it up later in Flows or by asking the AI.
          </p>
        </div>
      </div>
    </div>
  );
}
