import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { NativeNode, NativeTextRun } from "../spec";
import type { Behaviour } from "../render/behaviours";
import type { RenderContext } from "../render/context";
import { resolveUrl } from "../api";
import { Store, textOf, tr, walk, withText } from "./kit";
import { VariantScope } from "../render/variants";

/**
 * The radio player, the native twin of the web runtime's (RUNTIME_JS "4.
 * Radio player" and "7. Radio station picker"):
 *   data-nk-radio          the player (its <audio data-nk-radio-audio> gives the first stream;
 *                          the compiler keeps the address as data-nk-audio-src)
 *   data-nk-radio-play     play / pause          data-nk-radio-icon  ▶ or ❚❚
 *   data-nk-radio-name     the station's name    data-nk-radio-pick  switch station
 *                          (data-nk-radio-src, data-nk-radio-label, data-nk-radio-target)
 * One stream plays at a time (expo-audio), and keeps playing when the app is
 * in the background or the screen is locked (the engine's app config turns on
 * background audio; the lock screen shows the station and the app's name).
 * The page's own looks for these states (the web runtime's .playing class on
 * the player, .active on the chosen station) come from the compiler as node
 * variants (render/variants.tsx).
 */

type State = { src: string; label: string; playing: boolean; buffering: boolean; picked?: string };
const radio = new Store<State>({ src: "", label: "", playing: false, buffering: false });
let player: AudioPlayer | null = null;
let modeSet = false;
let appName = "";

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null);
    // The button shows what the listener asked for (like the web's icon);
    // a stream that ends turns it back to play.
    player.addListener("playbackStatusUpdate", (s) => {
      const cur = radio.get();
      const buffering = Boolean(s.isBuffering) && cur.playing;
      if (s.didJustFinish) radio.set({ ...cur, playing: false, buffering: false });
      else if (cur.buffering !== buffering) radio.set({ ...cur, buffering });
    });
  }
  return player;
}

async function ensureMode() {
  if (modeSet || Platform.OS === "web") return;
  modeSet = true;
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => {
    modeSet = false;
  });
}

function lockScreen(p: AudioPlayer, label: string) {
  if (Platform.OS === "web") return;
  try {
    p.setActiveForLockScreen(true, { title: label || appName, artist: appName });
  } catch {
    /* older players: no lock screen controls */
  }
}

async function play() {
  const s = radio.get();
  if (!s.src) return;
  await ensureMode();
  const p = getPlayer();
  if (!p.isLoaded || (p as unknown as { __nkSrc?: string }).__nkSrc !== s.src) {
    p.replace({ uri: s.src });
    (p as unknown as { __nkSrc?: string }).__nkSrc = s.src;
  }
  p.play();
  radio.set({ ...radio.get(), playing: true });
  lockScreen(p, s.label);
}

function pause() {
  player?.pause();
  radio.set({ ...radio.get(), playing: false });
}

export function radioToggle() {
  if (radio.get().playing) pause();
  else void play();
}

/** Switch station (data-nk-radio-pick): keeps playing if it was. */
export function radioPick(src: string, label: string) {
  const was = radio.get().playing;
  player?.pause();
  radio.set({ src, label: label || radio.get().label, playing: false, buffering: false, picked: src });
  if (was) void play();
}

function useRadio(): State {
  return useSyncExternalStore(radio.subscribe, radio.get, radio.get);
}

/** The first stream of a player: its <audio data-nk-radio-audio> (or any <audio>) inside. */
function streamOf(node: NativeNode, ctx: RenderContext): string {
  let src = "";
  walk(node, (n) => {
    if (src) return;
    const s = n.nk?.["data-nk-audio-src"];
    if (s && (n.nk?.["data-nk-radio-audio"] !== undefined || n.tag === "audio")) src = s;
  });
  return src ? resolveUrl(src, ctx.app) : "";
}

function hasClass(node: { cls?: string }, name: string): boolean {
  return (node.cls ?? "").split(/\s+/).includes(name);
}

/** The web's class toggles as variant keys: ".x" when the page didn't have the class, "!.x" when it did. */
function classState(node: { cls?: string }, name: string, on: boolean): Record<string, boolean> {
  return hasClass(node, name) ? { [`!.${name}`]: !on } : { [`.${name}`]: on };
}

function Player({ node, ctx, inner }: { node: NativeNode; ctx: RenderContext; inner: (n: NativeNode) => ReactNode }) {
  const first = streamOf(node, ctx);
  const s = useRadio();
  useEffect(() => {
    appName = ctx.app.name;
    // The player's own stream, until a station is picked.
    if (first && !radio.get().src) radio.set({ ...radio.get(), src: first });
  }, [first, ctx.app.name]);
  // The page's look of a playing player (.playing).
  return <VariantScope set={classState(node, "playing", s.playing)}>{inner(node)}</VariantScope>;
}

/** A station pick (data-nk-radio-pick): switches the stream; the chosen one has the page's .active look. */
function Pick({ node, ctx, inner }: { node: NativeNode; ctx: RenderContext; inner: (n: NativeNode, press?: () => void) => ReactNode }) {
  const s = useRadio();
  const raw = node.nk?.["data-nk-radio-src"];
  if (!raw || /\{\w+\}/.test(raw)) return <>{inner(node)}</>;
  const src = resolveUrl(raw, ctx.app);
  const active = s.picked ? s.picked === src : hasClass(node, "active");
  return <VariantScope set={classState(node, "active", active)}>{inner(node, () => radioPick(src, node.nk?.["data-nk-radio-label"] ?? ""))}</VariantScope>;
}

function PlayButton({ node, inner, label }: { node: NativeNode; inner: (n: NativeNode, press?: () => void) => ReactNode; label: { play: string; pause: string } }) {
  const s = useRadio();
  const shown = { ...node, a11y: { ...(node.a11y ?? {}), role: "button", label: s.playing ? label.pause : label.play } } as NativeNode;
  return <>{inner(shown, radioToggle)}</>;
}

function Icon({ draw }: { draw: (playing: boolean) => ReactNode }) {
  const s = useRadio();
  return <>{draw(s.playing)}</>;
}

function Name({ draw, fallback }: { draw: (label: string) => ReactNode; fallback: string }) {
  const s = useRadio();
  // The page's station name names the stream on the lock screen until another station is picked.
  useEffect(() => {
    if (fallback && !radio.get().label) radio.set({ ...radio.get(), label: fallback });
  }, [fallback]);
  return <>{draw(s.label)}</>;
}

const PLAY = "▶";
const PAUSE = "❚❚";

function iconNode(node: NativeNode, playing: boolean): NativeNode {
  const n = withText(node, playing ? PAUSE : PLAY);
  // The web nudges the play triangle right by 6px and the pause bars not at all.
  if (playing && n.style) return { ...n, style: { ...n.style, marginStart: 0, marginLeft: 0 } } as NativeNode;
  return n;
}

export const RADIO_BEHAVIOURS: Behaviour[] = [
  {
    attr: "data-nk-radio",
    phase: 2,
    render: (_v, node, ctx, inner) => <Player node={node} ctx={ctx} inner={inner} />,
  },
  {
    attr: "data-nk-radio-play",
    phase: 2,
    render: (_v, node, ctx, inner) => (
      <PlayButton
        node={node}
        inner={inner}
        label={{ play: node.a11y?.label || tr(ctx.app, "native.radioPlay", "Play"), pause: tr(ctx.app, "native.radioPause", "Pause") }}
      />
    ),
  },
  {
    attr: "data-nk-radio-icon",
    phase: 2,
    render: (_v, node, _ctx, inner) => <Icon draw={(p) => inner(iconNode(node, p))} />,
    renderRun: (_v, run, _ctx, inner) => <Icon draw={(p) => inner({ ...run, text: p ? PAUSE : PLAY, runs: undefined } as NativeTextRun)} />,
  },
  {
    attr: "data-nk-radio-name",
    phase: 2,
    render: (_v, node, _ctx, inner) => <Name fallback={textOf(node).trim()} draw={(l) => inner(l ? withText(node, l) : node)} />,
    renderRun: (_v, run, _ctx, inner) => <Name fallback={textOf(run).trim()} draw={(l) => inner(l ? ({ ...run, text: l, runs: undefined } as NativeTextRun) : run)} />,
  },
  {
    attr: "data-nk-radio-pick",
    phase: 2,
    render: (_v, node, ctx, inner) => <Pick node={node} ctx={ctx} inner={inner} />,
    apply: (_v, node, ctx) => {
      const src = node.nk?.["data-nk-radio-src"];
      if (!src || /\{\w+\}/.test(src)) return null;
      return { onPress: () => radioPick(resolveUrl(src, ctx.app), node.nk?.["data-nk-radio-label"] ?? "") };
    },
  },
  // Read by the player (its stream) and by station picks.
  { attr: "data-nk-radio-audio", phase: 2, apply: () => ({ hidden: true }) },
];
