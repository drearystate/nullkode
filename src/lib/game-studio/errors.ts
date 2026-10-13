/**
 * A refusal from the Game Studio's shared code, in plain words for the
 * person, with a stable code for other callers (the partner API maps it to
 * its own error codes). The studio's own routes answer it like any other
 * error: 400 with the message (lib/game-studio/http.ts).
 */
export type GameErrorCode =
  | "ai_quota"
  | "already_building"
  | "still_building"
  | "not_installed"
  | "invalid_request"
  | "rate_limited"
  | "nothing_to_publish"
  | "nothing_to_export"
  | "plan_limit"
  | "too_many_notes"
  /** "Keep building" for a game that isn't waiting at a check-in. */
  | "not_waiting"
  /** The feature list: a game not built yet, a feature that isn't on the list, a scan that failed. */
  | "not_built"
  | "not_found"
  | "ai_failed";

export class GameError extends Error {
  constructor(
    readonly code: GameErrorCode,
    message: string,
  ) {
    super(message);
  }
}
