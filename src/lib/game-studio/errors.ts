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
  | "too_many_notes";

export class GameError extends Error {
  constructor(
    readonly code: GameErrorCode,
    message: string,
  ) {
    super(message);
  }
}
