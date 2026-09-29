"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewFlowButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/flows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      const { flow } = await res.json();
      router.push(`/projects/${projectId}/flows/${flow.id}`);
    }
  }

  if (!open) return <button className="btn-primary" onClick={() => setOpen(true)} data-help="Start a new, empty automation: something that runs by itself when something happens in your app. You’ll name it, then add its steps.">New flow</button>;
  return (
    <div className="flex gap-2">
      <input
        className="input w-64"
        autoFocus
        placeholder="e.g. Submit contact form"
        data-help="A name that says what this automation does, like Send booking confirmation. Press Enter to create it."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") create();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <button className="btn-primary" disabled={busy} onClick={create} data-help="Creates the automation and opens it so you can add its steps.">Create</button>
      <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
