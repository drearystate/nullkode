/**
 * Pre-flight clarification modal. Pops between the user pressing Send and
 * the agent actually starting, IF Claude's clarify pass produced 1–3
 * questions worth asking. User answers (or skips) → answers get merged
 * into the prompt and the original sendPrompt runs with the enriched text.
 *
 * State lives on the Zustand store (clarifyState). This component only
 * renders the UI; the merge + resume is handled by the store action.
 */

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useCodesignStore } from '../store';

export function ClarifyDialog() {
  const state = useCodesignStore((s) => s.clarifyState);
  const resolveClarify = useCodesignStore((s) => s.resolveClarify);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Reset answers each time the dialog opens.
    if (state) setAnswers({});
  }, [state?.id]);

  useEffect(() => {
    if (state && firstInputRef.current) {
      // Slight delay so the dialog mount paints before focus.
      const t = setTimeout(() => firstInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [state?.id]);

  if (!state) return null;

  function pick(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function submit() {
    resolveClarify({ answers, action: 'answer' });
  }
  function skip() {
    resolveClarify({ answers: {}, action: 'skip' });
  }

  const allAnswered =
    state?.questions.every((q) => (answers[q.id] ?? '').trim().length > 0) ?? false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clarify-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) skip();
      }}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      >
        <button
          type="button"
          onClick={skip}
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          aria-label="Skip the questions"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-5 pb-3">
          <h2
            id="clarify-title"
            className="text-xl font-semibold text-[var(--color-text-primary)]"
            style={{ letterSpacing: '-0.01em' }}
          >
            A few quick questions
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Your answers help the AI make it right the first time. You can skip
            them if you just want to see what it makes.
          </p>
        </div>

        <div className="space-y-5 px-6 pb-5">
          {state.questions.map((q, idx) => (
            <div key={q.id}>
              <label className="block text-[13px] font-medium text-[var(--color-text-primary)]">
                {q.label}
              </label>
              {q.options && q.options.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => pick(q.id, opt)}
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium transition ${
                          selected
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text-primary)]'
                            : 'border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  <input
                    type="text"
                    placeholder="Or type something else..."
                    value={
                      q.options.includes(answers[q.id] ?? '')
                        ? ''
                        : (answers[q.id] ?? '')
                    }
                    onChange={(e) => pick(q.id, e.target.value)}
                    ref={idx === 0 ? firstInputRef : null}
                    className="min-w-[160px] flex-1 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1 text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => pick(q.id, e.target.value)}
                  ref={idx === 0 ? firstInputRef : null}
                  className="mt-2 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                  placeholder="Your answer..."
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-background-secondary)] px-6 py-3">
          <button
            type="button"
            onClick={skip}
            className="rounded-md px-3 py-1.5 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered}
            className="rounded-md bg-[var(--color-accent)] px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:hover:bg-[var(--color-accent)]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
