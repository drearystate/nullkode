import { EventEmitter } from "node:events";

/**
 * Live updates for an open game: the job's steps, new versions (the canvas
 * fetches the changed files and patches the running game), chat. One channel
 * per game, in this process (jobs run here too).
 */
export type GameEvent =
  | { type: "job"; jobId: string; status: "running" | "done" | "error" | "cancelled"; stopAfterStep?: boolean }
  | { type: "steps"; jobId: string; steps: JobStepView[]; phase?: string }
  | { type: "version"; seq: number; label: string }
  | { type: "chat" }
  | { type: "game" };

/** `added`: a step the person's notes added during the build (steer while building). */
export type JobStepView = { id: string; label: string; status: "todo" | "running" | "done" | "error"; seq?: number; note?: string; added?: boolean; kind?: "playtest-fix" | "feature-fix"; features?: string[] };

const store = globalThis as unknown as { __nkGameEvents?: EventEmitter };
const emitter = (store.__nkGameEvents ??= new EventEmitter().setMaxListeners(0));

export function publishGame(gameId: string, event: GameEvent): void {
  emitter.emit(gameId, event);
}

export function subscribeGame(gameId: string, listener: (event: GameEvent) => void): () => void {
  emitter.on(gameId, listener);
  return () => emitter.off(gameId, listener);
}
