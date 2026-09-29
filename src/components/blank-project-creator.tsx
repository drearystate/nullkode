"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  onBack: () => void;
};

export function BlankProjectCreator({ onBack }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      const project = data.project;
      // Blank projects get one home page created by the API — find it.
      const pagesRes = await fetch(`/api/projects/${project.id}/pages`);
      const pagesData = await pagesRes.json();
      const firstPage = pagesData.pages?.[0];
      if (firstPage) {
        router.push(`/projects/${project.id}/pages/${firstPage.id}/edit?welcome=1`);
      } else {
        router.push(`/projects/${project.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setCreating(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-lg px-6 py-16 md:py-24">
      <div className="pointer-events-none absolute -inset-20 bg-gradient-to-br from-brand-700/20 via-transparent to-cyan-500/10 blur-3xl" />

      <div className="relative">
        <button
          onClick={onBack}
          className="text-sm text-surface-400 hover:text-white transition mb-6 inline-flex items-center gap-1"
        >
          ← Back
        </button>

        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-2">Start blank</h2>
          <p className="text-sm text-surface-400 mb-6">
            Give your app a name. It starts with a simple welcome page (intro, about and contact sections) and sign-in pages, ready for you to change.
          </p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
            placeholder="My awesome project"
            data-help="A name for your new app. You can change it later. Press Enter to create it."
            className="w-full bg-surface-950 border border-surface-700 rounded-lg px-4 py-3 text-base text-surface-50 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 mb-4"
            autoFocus
          />

          <button
            onClick={create}
            data-help="Creates an empty app with one home page and opens the editor so you can start adding blocks."
            disabled={!name.trim() || creating}
            className="btn-primary w-full py-3 disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create app"}
          </button>
        </div>
      </div>
    </div>
  );
}
