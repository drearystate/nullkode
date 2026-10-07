"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * The live canvas: the game in a sandboxed iframe (?nk-studio), patched in
 * place as build steps land. The game's runtime (nk-games/engine nk-game.js)
 * takes {type:"nk-game:patch", files, remove, step} from this page, applies
 * it without a reload when it can (the player keeps their place), and
 * reports {type:"nk-game:status", fps, state, scene, errors, step} every
 * second.
 *
 * The iframe's origin is opaque (sandboxed), so messages to it go to "*";
 * the game only accepts them from this page's origin (its
 * <meta name="nk-studio-origin">), and messages from it are only taken from
 * its own window.
 */

export type CanvasStatus = {
  ready: boolean;
  fps: number | null;
  state: string | null;
  scene: string | null;
  step: string | null;
  errors: string[];
  shownSeq: number;
};

export type GameCanvasHandle = {
  command: (command: "pause" | "resume" | "start" | "menu" | "reload") => void;
  fullscreen: () => void;
  reload: () => void;
};

type Props = {
  gameId: string;
  pass: string;
  /** The game's newest version: the canvas patches itself up to it. */
  seq: number;
  /** The label of the newest version (shown on the canvas while it patches). */
  label: string;
  /** Show an earlier version instead (no patching). */
  viewSeq: number | null;
  frame: "desktop" | "phone";
  onStatus?: (s: CanvasStatus) => void;
};

export const GameCanvas = forwardRef<GameCanvasHandle, Props>(function GameCanvas({ gameId, pass, seq, label, viewSeq, frame, onStatus }, ref) {
  const t = useTranslations("games");
  const iframe = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [loadKey, setLoadKey] = useState(0);
  // The version the iframe shows now (set when it loads, raised by each patch).
  const shown = useRef(-1);
  const loadedAt = useRef(seq);
  const patching = useRef<{ to: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const status = useRef<CanvasStatus>({ ready: false, fps: null, state: null, scene: null, step: null, errors: [], shownSeq: -1 });
  const [, force] = useState(0);
  // Start playing as soon as the game shows its menu (after a load or a reload).
  const wantStart = useRef(false);
  const seqRef = useRef(seq);
  seqRef.current = seq;
  const labelRef = useRef(label);
  labelRef.current = label;

  const emit = useCallback(() => {
    onStatus?.({ ...status.current, errors: [...status.current.errors] });
    force((n) => n + 1);
  }, [onStatus]);

  const post = useCallback((msg: Record<string, unknown>) => {
    iframe.current?.contentWindow?.postMessage(msg, "*");
  }, []);

  const reload = useCallback(() => {
    loadedAt.current = seqRef.current;
    shown.current = -1;
    status.current = { ...status.current, ready: false, errors: [], shownSeq: -1 };
    if (patching.current) clearTimeout(patching.current.timer);
    patching.current = null;
    setLoadKey((k) => k + 1);
    emit();
  }, [emit]);

  /** Brings the running game up to the newest version with one patch. */
  const catchUp = useCallback(async () => {
    if (viewSeq !== null || !status.current.ready || patching.current) return;
    const from = shown.current;
    const to = seqRef.current;
    if (from < 0 || to <= from) return;
    const res = await fetch(`/api/games/${gameId}/patch?from=${from}&to=${to}`).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    if (!data || !iframe.current?.contentWindow) return reload();
    const timer = setTimeout(() => {
      // No answer: load the game afresh at the newest version.
      patching.current = null;
      reload();
    }, 20_000);
    patching.current = { to, timer };
    post({ type: "nk-game:patch", id: `v${to}`, step: labelRef.current, files: data.files ?? {}, remove: data.remove ?? [] });
  }, [gameId, viewSeq, post, reload]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!iframe.current || e.source !== iframe.current.contentWindow) return;
      const m = e.data as Record<string, unknown> | null;
      if (!m || typeof m !== "object" || typeof m.type !== "string" || !m.type.startsWith("nk-game:")) return;
      if (m.type === "nk-game:ready") {
        const first = !status.current.ready;
        status.current.ready = true;
        if (shown.current < 0) shown.current = viewSeq ?? loadedAt.current;
        status.current.shownSeq = shown.current;
        // Straight into play once the game reaches its menu: the canvas is for seeing the game grow.
        if (first) wantStart.current = true;
        if (wantStart.current && m.state === "menu") {
          wantStart.current = false;
          post({ type: "nk-game:command", command: "start" });
        }
        emit();
        void catchUp();
      } else if (m.type === "nk-game:status") {
        status.current.fps = typeof m.fps === "number" ? m.fps : null;
        status.current.state = typeof m.state === "string" ? m.state : null;
        if (wantStart.current && m.state === "menu") {
          wantStart.current = false;
          post({ type: "nk-game:command", command: "start" });
        } else if (m.state === "play") wantStart.current = false;
        status.current.scene = typeof m.scene === "string" ? m.scene : null;
        if (typeof m.step === "string") status.current.step = m.step;
        const errs = Array.isArray(m.errors) ? (m.errors as Array<{ message?: string; where?: string } | string>).map((x) => (typeof x === "string" ? x : `${x.where ? `${x.where}: ` : ""}${x.message ?? ""}`)) : [];
        if (errs.length) status.current.errors = [...status.current.errors, ...errs].slice(-20);
        emit();
      } else if (m.type === "nk-game:patched") {
        const p = patching.current;
        if (p) {
          clearTimeout(p.timer);
          patching.current = null;
          shown.current = p.to;
          status.current.shownSeq = p.to;
          if (Array.isArray(m.errors) && m.errors.length) status.current.errors = [...status.current.errors, ...(m.errors as Array<{ message?: string }>).map((x) => String(x?.message ?? x))].slice(-20);
          emit();
          // A reload-mode patch reloads the page; its ready message comes next.
          if (m.mode === "reload") {
            status.current.ready = false;
            loadedAt.current = p.to;
          } else void catchUp();
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [catchUp, emit, post, viewSeq]);

  // A new version: patch the running game.
  useEffect(() => {
    void catchUp();
  }, [seq, catchUp]);

  // Showing an earlier version, or back to the current one: load afresh.
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewSeq]);

  useImperativeHandle(ref, () => ({
    command: (command) => (command === "reload" ? reload() : post({ type: "nk-game:command", command })),
    fullscreen: () => {
      void box.current?.requestFullscreen?.().catch(() => {});
    },
    reload,
  }), [post, reload]);

  const src = pass ? `/api/games/${gameId}/play/${pass}/${viewSeq !== null ? `v${viewSeq}/` : ""}index.html?nk-studio&k=${loadKey}` : "about:blank";
  const phone = frame === "phone";
  return (
    <div ref={box} className="relative flex h-full w-full items-center justify-center bg-surface-950 [[data-theme=light]_&]:bg-surface-800/60">
      <div className={phone ? "relative aspect-[844/390] w-full max-w-[844px] rounded-[2rem] border-[10px] border-surface-700 bg-black shadow-2xl" : "relative aspect-video max-h-full w-full max-w-full overflow-hidden rounded-lg border border-white/10 bg-black"} style={phone ? undefined : { maxWidth: "min(100%, calc((100dvh - 190px) * 16 / 9))" }}>
        <iframe
          ref={iframe}
          key={loadKey}
          title={t("canvas.title")}
          src={src}
          sandbox="allow-scripts allow-pointer-lock"
          allow="autoplay; gamepad; fullscreen"
          className={`absolute inset-0 h-full w-full border-0 ${phone ? "rounded-[1.4rem]" : ""}`}
          data-testid="game-canvas"
        />
        {!status.current.ready && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-surface-400" aria-live="polite">{t("canvas.loading")}</div>
        )}
      </div>
    </div>
  );
});
