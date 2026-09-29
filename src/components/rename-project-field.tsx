"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Inline rename control for the Settings card on the project overview.
 * Sits alongside the read-only Slug/Visibility/Created rows, so it renders
 * as the same label/value row until you click Edit.
 *
 * Only the display name changes — the slug (and therefore the published
 * URL at /app/{slug}) is deliberately left alone so renaming can never
 * break a live app or a link someone already shared.
 */
export function RenameProjectField({
  projectId,
  initialName,
}: {
  projectId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(name);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(name);
    setError(null);
    setEditing(false);
  }

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      cancel();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
      setName(data.project?.name ?? trimmed);
      setEditing(false);
      // The <h1> above us is server-rendered from the same field.
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex justify-between items-center gap-3 py-1 border-b border-surface-800">
        <dt className="text-surface-400">Name</dt>
        <dd className="flex items-center gap-2 min-w-0">
          <span className="text-surface-200 truncate">{name}</span>
          <button
            type="button"
            className="btn btn-ghost text-xs shrink-0"
            onClick={startEdit}
            data-help="Change your app's name. Its web address stays the same, so links you've shared keep working."
          >
            Edit
          </button>
        </dd>
      </div>
    );
  }

  return (
    <div className="py-2 border-b border-surface-800">
      <div className="flex justify-between items-center gap-3">
        <dt className="text-surface-400 shrink-0">Name</dt>
        <dd className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <input
            autoFocus
            className="input text-sm min-w-0 flex-1"
            value={draft}
            maxLength={80}
            disabled={busy}
            aria-label="App name"
            data-help="Your app's new name. Press Enter to save or Esc to cancel."
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
          />
          <button
            type="button"
            className="btn btn-primary text-xs shrink-0"
            disabled={busy || !draft.trim()}
            onClick={save}
            data-help="Save the new name. Its web address doesn't change."
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs shrink-0"
            disabled={busy}
            onClick={cancel}
          >
            Cancel
          </button>
        </dd>
      </div>
      <p className="mt-1 text-xs text-surface-500 text-right">
        Only the name changes. Your app&apos;s web address stays the same, so
        renaming won&apos;t break a published app.
      </p>
      {error && <p className="mt-1 text-xs text-red-400 text-right">{error}</p>}
    </div>
  );
}
