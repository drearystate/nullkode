import type { NativeNode } from "../spec";
import type { RenderContext } from "../render/context";
import { Channel } from "./kit";

/**
 * Meeting points between behaviours (the web runtime does these through the
 * DOM: a scanner writes into an <input name>, a form submit refreshes every
 * calendar, a filter re-renders its target charts, the cart adds hidden
 * fields to a checkout form).
 *
 * Forms / lists (agent 2A) are expected to call:
 *   - formExtraFields(form, ctx) before sending a form, and add the result
 *     (data-nk-cart-checkout: items + total);
 *   - formSucceeded(form, body, ctx) after a flow answered OK (clearCart,
 *     calendars and charts refresh);
 *   - filtersChanged({ target, values }) when a data-nk-filter control changes;
 *   - listen to fieldValue to fill an <input name> (QR scanner output).
 */

/** Something changed data the page shows (a form was sent): calendars and charts load again. */
export const dataChanged = new Channel<void>();

/** data-nk-filter values changed; `target` is the control's data-nk-target selector (all bound widgets when absent). */
export const filtersChanged = new Channel<{ target?: string; values: Record<string, string> }>();

/** Fill the form field named `name` (data-nk-qr-output). */
export const fieldValue = new Channel<{ name: string; value: string }>();

type Extra = (form: NativeNode, ctx: RenderContext) => Record<string, string> | null;
const extras: Extra[] = [];
type Success = (form: NativeNode | null, body: unknown, ctx: RenderContext) => void;
const successes: Success[] = [];

export function addFormExtra(fn: Extra): void {
  extras.push(fn);
}

export function onFormSuccess(fn: Success): void {
  successes.push(fn);
}

/** Fields behaviours add to a form when it is sent. */
export function formExtraFields(form: NativeNode, ctx: RenderContext): Record<string, string> {
  const out: Record<string, string> = {};
  for (const fn of extras) Object.assign(out, fn(form, ctx) ?? {});
  return out;
}

/** After a form's flow answered OK. */
export function formSucceeded(form: NativeNode | null, body: unknown, ctx: RenderContext): void {
  for (const fn of successes) {
    try {
      fn(form, body, ctx);
    } catch {
      /* one behaviour's error doesn't stop the others */
    }
  }
  dataChanged.emit();
}
