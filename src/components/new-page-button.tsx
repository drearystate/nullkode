"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewPageButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/pages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setBusy(false);
    if (res.ok) {
      const { page } = await res.json();
      router.push(`/projects/${projectId}/pages/${page.id}/edit`);
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" data-help="Add a new, empty page to your app. You'll type its name, then it opens in the editor." onClick={() => setOpen(true)}>
        New page
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <input
        className="input w-64"
        autoFocus
        placeholder="Page title"
        data-help="The name for your new page, like “About us”. It's shown in your app's menu and on the browser tab."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") create();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <button className="btn-primary" disabled={busy} onClick={create} data-help="Make the page and open it in the editor.">
        Create
      </button>
      <button className="btn-ghost" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}
