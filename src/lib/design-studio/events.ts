import { EventEmitter } from "node:events";

/**
 * Live updates for an open design: build progress, files as they're written,
 * new chat messages. One channel per design; the SSE route checks ownership
 * before subscribing. In-process, so one app server (the same as the job
 * locks in engine.ts).
 */
export type DesignEvent =
  | { type: "job"; jobId: string; status: "running" | "done" | "error" | "cancelled"; message?: string }
  | { type: "step"; jobId: string; id: string; label: string; status: "running" | "done" | "error" }
  | { type: "file"; path: string }
  | { type: "chat" }
  | { type: "versions" };

const store = globalThis as unknown as { __nkDesignEvents?: EventEmitter };
const emitter = (store.__nkDesignEvents ??= new EventEmitter().setMaxListeners(0));

export function publish(designId: string, event: DesignEvent): void {
  emitter.emit(designId, event);
}

/** Returns the function that stops listening; call it when the client goes. */
export function subscribe(designId: string, listener: (event: DesignEvent) => void): () => void {
  emitter.on(designId, listener);
  return () => emitter.off(designId, listener);
}
