"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
type Tr = (key: string, values?: Record<string, string | number>) => string;

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

async function projectFlows(projectId: string, t: Tr): Promise<FlowRow[]> {
  const res = await fetch(`/api/projects/${projectId}/flows`);
  if (!res.ok) throw new Error(t("couldNotLoadFlows"));
  return ((await readJson(res)).flows as FlowRow[] | undefined) ?? [];
}

async function hasModule(projectId: string, moduleId: string, t: Tr): Promise<boolean> {
  const res = await fetch(`/api/projects/${projectId}/modules`);
  if (!res.ok) throw new Error(t("couldNotCheckFeatures"));
  const installed = ((await readJson(res)).installed as Array<{ moduleId: string }> | undefined) ?? [];
  return installed.some((m) => m.moduleId === moduleId);
}

/**
 * Sets up the block's feature (only if the app doesn't have it yet, so a
 * second copy is never made) and returns the flows the block should use.
 */
async function wire(mapping: BlockModuleMapping, projectId: string, already: boolean, t: Tr): Promise<WiredFlow[]> {
  const wanted = mapping.flowRefs.map((ref) => ({ ref, slug: installedFlowSlug(mapping, ref) }));
  let ids: Record<string, string> = {};
  if (!already) {
    const res = await fetch(`/api/projects/${projectId}/modules`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moduleId: mapping.moduleId, config: {}, skipPages: true, seed: mapping.seed }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("failedStatus", { status: res.status }));
    ids = (data.flowIds as Record<string, string> | undefined) ?? {};
  }
  const flows = await projectFlows(projectId, t);
  return wanted.map(({ ref, slug }) => {
    // A fresh install says which flow is which; an app that already had the
    // feature is looked up by the flow's installed name.
    const flow = ids[ref] ? flows.find((f) => f.id === ids[ref]) : flows.find((f) => f.slug === slug);
    if (!flow) throw new Error(t("partMissing"));
    return { slug, id: flow.id, name: flow.name };
  });
}

export function WireUpModal({ mapping, projectId, open, onClose, onWired }: Props) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the app already has this feature (null while checking).
  const [already, setAlready] = useState<boolean | null>(null);
  const t = useTranslations("editor.wireUp");

  useEffect(() => {
    if (!open) return;
    let live = true;
    setAlready(null);
    hasModule(projectId, mapping.moduleId, t)
      .then((has) => { if (live) setAlready(has); })
      .catch(() => { /* checked again on Connect */ });
    return () => { live = false; };
  }, [open, projectId, mapping.moduleId, t]);

  if (!open) return null;

  async function handleConnect() {
    setInstalling(true);
    setError(null);
    try {
      const has = already ?? (await hasModule(projectId, mapping.moduleId, t));
      onWired(await wire(mapping, projectId, has, t));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
      setInstalling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[min(440px,calc(100vw-32px))] rounded-xl border border-surface-700 bg-surface-900 shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-0">
          <h3 className="text-base font-bold">{t("title")}</h3>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-surface-300 leading-relaxed">
            {t(`blocks.${mapping.textKey}.purpose`)}
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
            data-help={t("connectHelp")}
            className="flex-1 btn-primary py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {installing ? t("settingUp") : t("connect")}
          </button>
          <button
            onClick={onClose}
            disabled={installing}
            data-help={t("handleHelp")}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg border border-surface-700 text-surface-300 hover:bg-surface-800 transition disabled:opacity-50"
          >
            {t("handle")}
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[11px] text-surface-500 leading-relaxed">
            {t.rich(`blocks.${mapping.textKey}.${already ? "connectExisting" : "connectNew"}`, { b: (c) => <strong>{c}</strong> })}
            <br />
            {t.rich("handleLine", { b: (c) => <strong>{c}</strong> })}
          </p>
        </div>
      </div>
    </div>
  );
}
