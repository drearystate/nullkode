"use client";
import { useState } from "react";
import type { BlockModuleMapping } from "./block-module-map";

type Props = {
  mapping: BlockModuleMapping;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onWired: () => void;
};

export function WireUpModal({ mapping, projectId, open, onClose, onWired }: Props) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleConnect() {
    setInstalling(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/modules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          moduleId: mapping.moduleId,
          config: {},
          skipPages: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data.error?.includes("already")) {
          onWired();
          return;
        }
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      onWired();
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
            {mapping.description}
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
            className="flex-1 btn-primary py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {installing ? "Setting up..." : "Yes, connect it"}
          </button>
          <button
            onClick={onClose}
            disabled={installing}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg border border-surface-700 text-surface-300 hover:bg-surface-800 transition disabled:opacity-50"
          >
            No, I'll handle it
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[11px] text-surface-500 leading-relaxed">
            <strong>Connect it</strong> — creates the database table and backend flow, then wires your form automatically. No duplicate pages.
            <br />
            <strong>Handle it</strong> — drops the block as-is. You can wire it up in the Flow tab or ask the AI later.
          </p>
        </div>
      </div>
    </div>
  );
}
