/**
 * One editor per app.
 *
 *  - SwitchToBuilderButton + dialog: the one-way "Switch to the page builder"
 *    step. After it, the app is edited only in the page builder and the AI
 *    Designer never changes it again; the design stays here as a copy.
 *  - MovedToBuilderNotice: shown in place of the chat box for a design whose
 *    app already moved, with a link to the app and a "make a copy" way to
 *    keep designing with AI (a copy builds into a new app).
 */

import { ArrowRightLeft, Copy, ExternalLink } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
import { useCodesignStore } from '../store';

const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties;

type BuilderApi = {
  switch: (
    designId: string,
  ) => Promise<{ projectId: string; alreadyMoved: boolean; appUrl: string; editUrl: string }>;
};

function builderApi(): BuilderApi | null {
  return (window as unknown as { codesign?: { builder?: BuilderApi } }).codesign?.builder ?? null;
}

/** Strip the internal "codesign.method: " prefix the IPC shim adds to errors. */
export function plainError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  return raw.replace(/^codesign\.[\w.]+:\s*/, '') || 'Something went wrong. Please try again.';
}

export function SwitchToBuilderButton() {
  const currentDesignId = useCodesignStore((s) => s.currentDesignId);
  const design = useCodesignStore((s) => s.designs.find((d) => d.id === s.currentDesignId));
  const isGenerating = useCodesignStore(
    (s) => s.isGenerating && s.generatingDesignId === s.currentDesignId,
  );
  const hasPreview = useCodesignStore((s) => Boolean(s.previewSource));
  const [open, setOpen] = useState(false);

  if (!currentDesignId || !design) return null;
  const moved = (design as { movedToBuilder?: boolean }).movedToBuilder === true;

  if (moved) {
    return (
      <a
        href={`/designer/open-in-builder/${currentDesignId}`}
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
        style={noDragStyle}
        aria-label="Open in the page builder"
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden md:inline">Open in the page builder</span>
      </a>
    );
  }

  const disabled = isGenerating || !hasPreview;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={
          isGenerating
            ? 'Wait until the design is done'
            : !hasPreview
              ? 'Make a design first'
              : 'Edit this app in the page builder from now on'
        }
        aria-label="Switch to the page builder"
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        style={noDragStyle}
      >
        <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden md:inline">Switch to the page builder</span>
      </button>
      {open ? (
        <SwitchToBuilderDialog designId={currentDesignId} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function SwitchToBuilderDialog({ designId, onClose }: { designId: string; onClose: () => void }) {
  const loadDesigns = useCodesignStore((s) => s.loadDesigns);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    const api = builderApi();
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      const out = await api.switch(designId);
      await loadDesigns().catch(() => {});
      window.location.href = out.editUrl;
    } catch (err) {
      setError(plainError(err));
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="switch-builder-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !busy) onClose();
      }}
    >
      <div
        role="document"
        className="w-full max-w-md space-y-4 rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-[var(--shadow-elevated)]"
      >
        <h3
          id="switch-builder-title"
          className="text-[var(--text-md)] font-semibold text-[var(--color-text-primary)]"
        >
          Switch to the page builder?
        </h3>
        <p className="text-[var(--text-sm)] leading-[var(--leading-body)] text-[var(--color-text-secondary)]">
          From now on you'll edit this app in the page builder. The AI Designer won't change it any
          more. Your design stays in the Designer as a copy.
        </p>
        <p className="text-[var(--text-sm)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
          You can't switch back. If you want to keep designing with AI later, make a copy of the
          design — it will become a new app.
        </p>
        {error ? (
          <p role="alert" className="text-[var(--text-sm)] text-[var(--color-error)]">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-9 rounded-[var(--radius-md)] px-3 text-[var(--text-sm)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            data-testid="confirm-switch-builder"
            className="h-9 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 text-[var(--text-sm)] font-medium text-[var(--color-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Switching…' : 'Switch to the page builder'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MovedToBuilderNotice({ designId }: { designId: string }) {
  const design = useCodesignStore((s) => s.designs.find((d) => d.id === designId));
  const duplicateDesign = useCodesignStore((s) => s.duplicateDesign);
  const switchDesign = useCodesignStore((s) => s.switchDesign);
  const [busy, setBusy] = useState(false);
  const builderUrl = (design as { builderUrl?: string | null } | undefined)?.builderUrl ?? null;

  async function makeCopy() {
    if (!design) return;
    setBusy(true);
    try {
      const copy = await duplicateDesign(design.id);
      if (copy) await switchDesign(copy.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      data-testid="moved-to-builder"
      className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <div className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
        Moved to the page builder
      </div>
      <p className="text-[13px] leading-[1.5] text-[var(--color-text-secondary)]">
        This app is now edited in the page builder, so the AI Designer won't change it. What you
        see here is a copy of the design.
      </p>
      <div className="flex flex-wrap gap-2">
        {builderUrl ? (
          <a
            href={builderUrl}
            className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 text-[13px] font-medium text-[var(--color-on-accent)] hover:opacity-90"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Open the app
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => void makeCopy()}
          disabled={busy}
          className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-60"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {busy ? 'Making a copy…' : 'Make a copy to keep designing'}
        </button>
      </div>
    </div>
  );
}
