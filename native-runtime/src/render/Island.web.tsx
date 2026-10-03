import { createElement, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import type { NativeWebNode } from "../spec";
import { useRender } from "./context";
import { islandDocument } from "./islandDocument";

let seq = 0;

/**
 * A web island in the browser build: a sandboxed frame (scripts run, but in
 * an opaque origin, so an app's own scripts can never reach the page that
 * hosts the preview).
 */
export function Island({ node, style }: { node: NativeWebNode; style: Record<string, unknown> }) {
  const ctx = useRender();
  const id = useMemo(() => `w${++seq}`, []);
  const [height, setHeight] = useState(node.height);
  const html = useMemo(() => islandDocument(node, ctx.page, ctx.app, id), [node, ctx.page, ctx.app, id]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      try {
        const m = JSON.parse(String(e.data)) as { nkIsland?: string; height?: number };
        if (m.nkIsland === id && m.height) setHeight(m.height);
      } catch {
        /* not ours */
      }
    };
    window.addEventListener("message", on);
    return () => {
      window.removeEventListener("message", on);
    };
  }, [id]);
  return (
    <View style={[style as never, { height }]}>
      {createElement("iframe", {
        srcDoc: html,
        sandbox: "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox",
        style: { border: 0, width: "100%", height: "100%", background: "transparent", display: "block" },
        title: node.a11y?.label ?? "",
      })}
    </View>
  );
}
