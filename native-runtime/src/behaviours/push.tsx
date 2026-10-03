import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeNode } from "../spec";
import type { Behaviour } from "../render/behaviours";
import type { RenderContext } from "../render/context";
import { themeOf, tr, uiFont, withText } from "./kit";
import { PushError, subscribePush } from "./pushClient";

/**
 * data-nk-push-subscribe="<flow>": the native twin of the web runtime's
 * "Turn on notifications" button (RUNTIME_JS "14. Push notifications
 * subscribe"): asks the phone for notifications, registers the device and
 * gives it to the app's flow, then reads "Notifications on" and stays
 * disabled. The notices the web shows as toasts appear under the button.
 * See pushClient.ts (phones) and pushClient.web.ts (browser preview).
 */

const doneKey = (appId: string) => `nk-native:push-on:${appId}`;

function PushButton({ node, ctx, flow, inner }: { node: NativeNode; ctx: RenderContext; flow: string | null; inner: (n: NativeNode, press?: () => void) => ReactNode }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const th = themeOf(ctx.app);

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(doneKey(ctx.app.id))
      .then((v) => {
        if (live && v === "1") setOn(true);
      })
      .catch(() => {});
    return () => {
      live = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ctx.app.id]);

  const say = (text: string, bad: boolean) => {
    setNote({ text, bad });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(null), Math.min(12000, 4000 + text.length * 60));
  };

  const press = async () => {
    if (on || busy) return;
    setBusy(true);
    try {
      await subscribePush(ctx, flow);
      setOn(true);
      AsyncStorage.setItem(doneKey(ctx.app.id), "1").catch(() => {});
      say(tr(ctx.app, "pushOn", "Notifications are on."), false);
    } catch (err) {
      const kind = err instanceof PushError ? err.kind : "failed";
      say(
        kind === "unavailable"
          ? tr(ctx.app, "pushUnavailable", "Notifications aren't available in this browser.")
          : kind === "notSetUp"
            ? tr(ctx.app, "pushNotSetUp", "Notifications aren't set up for this app yet.")
            : kind === "blocked"
              ? tr(ctx.app, "native.pushBlockedPhone", "Notifications are turned off for this app. You can allow them in your phone's settings.")
              : kind === "expoGo"
                ? tr(ctx.app, "native.pushExpoGo", "Notifications work in the installed app. This preview can't receive them.")
                : tr(ctx.app, "pushFailed", "We couldn't turn on notifications. Please try again."),
        true,
      );
    } finally {
      setBusy(false);
    }
  };

  const shown = on ? ({ ...withText(node, tr(ctx.app, "pushOnButton", "Notifications on")), ...(node.type === "button" ? { disabled: true } : {}) } as NativeNode) : node;
  return (
    <>
      {inner(shown, on ? undefined : () => void press())}
      {note ? (
        <View testID="nk-push-note" accessibilityLiveRegion="polite" style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: th.surface, borderWidth: 1, borderColor: th.border, borderStartWidth: 4, borderStartColor: note.bad ? th.danger : th.success }}>
          <Text style={{ color: th.text, fontSize: 14, ...uiFont(ctx) }}>{note.text}</Text>
        </View>
      ) : null}
    </>
  );
}

export const PUSH_BEHAVIOURS: Behaviour[] = [
  {
    attr: "data-nk-push-subscribe",
    phase: 2,
    render: (value, node, ctx, inner) => <PushButton node={node} ctx={ctx} flow={value && !/\{\w+\}/.test(value) ? value : null} inner={inner} />,
  },
];
