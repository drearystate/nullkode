import { useMemo, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import type { NativeWebNode } from "../spec";
import { useRender } from "./context";
import { islandDocument } from "./islandDocument";

let seq = 0;

/** A web island on iOS / Android: an embedded web view sized to its content. */
export function Island({ node, style }: { node: NativeWebNode; style: Record<string, unknown> }) {
  const ctx = useRender();
  const id = useMemo(() => `i${++seq}`, []);
  const [height, setHeight] = useState(node.height);
  const html = useMemo(() => islandDocument(node, ctx.page, ctx.app, id), [node, ctx.page, ctx.app, id]);
  return (
    <View style={[style as never, { height }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: `${ctx.app.base}/` }}
        style={{ flex: 1, backgroundColor: "transparent" }}
        scrollEnabled={false}
        javaScriptEnabled
        sharedCookiesEnabled
        onMessage={(e) => {
          try {
            const m = JSON.parse(e.nativeEvent.data) as { nkIsland?: string; height?: number };
            if (m.nkIsland === id && m.height && Math.abs(m.height - height) > 1) setHeight(m.height);
          } catch {
            /* not ours */
          }
        }}
        onShouldStartLoadWithRequest={(req) => {
          // The island's first load is its own document; any later
          // navigation (a tapped link) leaves the island.
          if (req.url === "about:blank" || req.url.startsWith("data:") || req.url === `${ctx.app.base}/`) return true;
          if (req.navigationType === "click") {
            void WebBrowser.openBrowserAsync(req.url);
            return false;
          }
          return true;
        }}
      />
    </View>
  );
}
