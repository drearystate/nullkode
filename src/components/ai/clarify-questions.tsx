"use client";
import { Check } from "lucide-react";

/**
 * The quick questions asked before a first build (Game Studio, Website
 * Designer). A question is single choice (one chip, or a typed answer
 * instead) or `multi` (any number of chips, plus a typed answer as an extra
 * one). Chips are toggle buttons (aria-pressed); the picked state shows by a
 * check mark and a heavier outline, never by colour alone.
 */

export type ClarifyQuestion = { id: string; label: string; options?: string[]; multi?: boolean; business?: boolean };
export type ClarifyAnswer = { picks: string[]; text: string };
export type ClarifyAnswers = Record<string, ClarifyAnswer>;

/** The answers as lines for the prompt: "<question> <answer, answer, typed>". Unanswered questions are left out. */
export function clarifyAnswerLines(list: ClarifyQuestion[], answers: ClarifyAnswers): string {
  return list
    .map((q) => {
      const a = answers[q.id];
      const all = [...(a?.picks ?? []), ...(a?.text.trim() ? [a.text.trim()] : [])];
      return all.length ? `${q.label} ${all.join(", ")}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

/** Whether the person said yes to the business question (its first option). */
export function saidBusiness(list: ClarifyQuestion[], answers: ClarifyAnswers): boolean {
  return list.some((q) => q.business && q.options?.[0] && answers[q.id]?.picks.includes(q.options[0]));
}

export function ClarifyQuestions({
  list,
  answers,
  onChange,
  words,
}: {
  list: ClarifyQuestion[];
  answers: ClarifyAnswers;
  onChange: (next: ClarifyAnswers) => void;
  /** Translated words: the typed-answer placeholders, the "pick any" hint and the chip help tips. */
  words: { typeAnswer: string; typeMore: string; pickAny: string; pickHelp: string; pickAnyHelp: string };
}) {
  const set = (id: string, a: ClarifyAnswer) => onChange({ ...answers, [id]: a });
  return (
    <>
      {list.map((q) => {
        const a = answers[q.id] ?? { picks: [], text: "" };
        return (
          <div key={q.id} role="group" aria-labelledby={`q-${q.id}`} data-testid="clarify-question" data-multi={q.multi ? "true" : "false"}>
            <p id={`q-${q.id}`} className="text-surface-200" dir="auto">
              {q.label}
              {q.multi && <span className="ms-2 text-xs text-surface-400">{words.pickAny}</span>}
            </p>
            {(q.options?.length ?? 0) > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {q.options!.map((o) => {
                  const on = a.picks.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={on}
                      data-testid="clarify-chip"
                      data-help={q.multi ? words.pickAnyHelp : words.pickHelp}
                      onClick={() =>
                        q.multi
                          ? set(q.id, { ...a, picks: on ? a.picks.filter((x) => x !== o) : [...a.picks, o] })
                          : set(q.id, on ? { picks: [], text: a.text } : { picks: [o], text: "" })
                      }
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${on ? "border-2 border-brand-400 bg-brand-500/20 font-semibold text-surface-50" : "border-white/15 text-surface-300 hover:border-white/30"}`}
                      dir="auto"
                    >
                      {on && <Check size={12} aria-hidden />}
                      {o}
                    </button>
                  );
                })}
              </div>
            )}
            <input
              className="input mt-1.5 py-1.5 text-xs"
              aria-label={q.multi ? words.typeMore : words.typeAnswer}
              placeholder={q.multi ? words.typeMore : words.typeAnswer}
              value={a.text}
              // A typed answer replaces a single choice, and adds to a multi one.
              onChange={(e) => set(q.id, q.multi ? { ...a, text: e.target.value } : { picks: [], text: e.target.value })}
              dir="auto"
            />
          </div>
        );
      })}
    </>
  );
}
