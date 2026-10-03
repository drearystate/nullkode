import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import Svg, { Path, Rect } from "react-native-svg";
import qrcode from "qrcode-generator";
import type { NativeNode } from "../spec";
import type { Behaviour } from "../render/behaviours";
import type { RenderContext } from "../render/context";
import { toStyle } from "../render/style";
import { fieldValue } from "./bus";
import { themeOf, tr, uiFont } from "./kit";

/**
 * QR codes.
 *
 * data-nk-qr-scanner: the native twin of the web runtime's scanner
 * (RUNTIME_JS "6. QR scanner", jsQR on the camera stream): the phone's camera
 * (expo-camera, which reads QR codes natively), "Point your camera at a QR
 * code", then "Scanned: <value>". data-nk-qr-output="<name>" writes the value
 * into the form field with that name; data-nk-qr-once="false" keeps scanning
 * (otherwise the camera stops after the first code, with a "Scan again"
 * button). Before asking for the camera the app says why, in the owner's own
 * wording (NativeApp.permissions.camera, the same text as the store builds'
 * permission prompt) or the runtime's.
 *
 * data-nk-qr="<text>": draws a QR code of the text (a {field} placeholder is
 * filled from the row in bound lists), with react-native-svg and the same
 * encoder the app modules use on the web (qrcode-generator). The web runtime
 * draws the same attribute.
 */

qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];

/** A QR code as one SVG path (dark modules), with a 4-module quiet zone. */
export function QrCode({ value, size, color = "#000", background = "#fff", label }: { value: string; size: number; color?: string; background?: string; label?: string }) {
  const { path, n } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { path: d, n: count + 8 };
  }, [value]);
  return (
    <View testID="nk-qr" accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`}>
        <Rect x={0} y={0} width={n} height={n} fill={background} />
        <Path d={path} fill={color} />
      </Svg>
    </View>
  );
}

function QrOutput({ node, ctx, value }: { node: NativeNode; ctx: RenderContext; value: string }) {
  const style = toStyle(node.style, node.vh, ctx);
  const w = typeof style.width === "number" ? style.width : typeof style.height === "number" ? style.height : 0;
  const size = Math.max(96, Math.min(w || 200, 320));
  if (!value || /\{\w+\}/.test(value)) return null;
  return (
    <View style={[style as never, { alignItems: "center", justifyContent: "center", height: undefined, minHeight: size }]}>
      <QrCode value={value} size={size} label={tr(ctx.app, "qrCodeOf", "QR code: {value}", { value })} />
    </View>
  );
}

function Scanner({ node, ctx }: { node: NativeNode; ctx: RenderContext }) {
  const nk = node.nk ?? {};
  const once = nk["data-nk-qr-once"] !== "false";
  const output = nk["data-nk-qr-output"] || "";
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const last = useRef({ value: "", at: 0 });
  const th = themeOf(ctx.app);
  const font = uiFont(ctx);
  const style = toStyle(node.style, node.vh, ctx);
  delete style.height;
  delete style.minHeight;

  useEffect(() => {
    // The browser preview asks at once, like the web page does.
    if (Platform.OS === "web" && permission && !permission.granted && permission.canAskAgain) void requestPermission().catch((e: Error) => setFailure(e.message));
  }, [permission, requestPermission]);

  const onScanned = (r: BarcodeScanningResult) => {
    const value = r.data;
    const now = Date.now();
    if (!value || (value === last.current.value && now - last.current.at < 2000)) return;
    last.current = { value, at: now };
    setResult(value);
    if (output) fieldValue.emit({ name: output, value });
    if (once) setScanning(false);
  };

  const text = { color: th.muted, fontSize: 14, ...font } as const;
  const button = { alignSelf: "flex-start", backgroundColor: th.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, marginTop: 10 } as const;
  const why = ctx.app.permissions?.camera || tr(ctx.app, "native.qrCameraWhy", "This app uses your camera to scan QR codes.");
  let body;
  if (!permission) body = null;
  else if (!permission.granted) {
    body = (
      <View>
        <Text style={text}>{failure || !permission.canAskAgain ? tr(ctx.app, "qrDenied", "Camera access denied: {reason}", { reason: failure ?? tr(ctx.app, "native.qrBlocked", "turn it on in the phone's settings") }) : why}</Text>
        {permission.canAskAgain ? (
          <Pressable testID="nk-qr-allow" accessibilityRole="button" onPress={() => void requestPermission().catch((e: Error) => setFailure(e.message))} style={button}>
            <Text style={{ color: "#fff", fontSize: 15, ...font }}>{tr(ctx.app, "native.qrAllow", "Allow camera")}</Text>
          </Pressable>
        ) : Platform.OS !== "web" ? (
          <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={button}>
            <Text style={{ color: "#fff", fontSize: 15, ...font }}>{tr(ctx.app, "native.openSettings", "Open settings")}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else {
    body = (
      <View>
        {scanning ? (
          <View style={{ width: "100%", aspectRatio: 1, borderRadius: 8, overflow: "hidden", backgroundColor: "#000" }}>
            <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScanned} onMountError={(e) => setFailure(e.message)} />
          </View>
        ) : null}
        <Text testID="nk-qr-result" style={[text, { marginTop: 12 }]} accessibilityLiveRegion="polite">
          {result ? tr(ctx.app, "qrScanned", "Scanned: {value}", { value: result }) : failure ? tr(ctx.app, "qrDenied", "Camera access denied: {reason}", { reason: failure }) : tr(ctx.app, "qrPoint", "Point your camera at a QR code")}
        </Text>
        {!scanning ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setResult(null);
              last.current = { value: "", at: 0 };
              setScanning(true);
            }}
            style={button}
          >
            <Text style={{ color: "#fff", fontSize: 15, ...font }}>{tr(ctx.app, "native.qrScanAgain", "Scan again")}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  return (
    <View testID="nk-qr-scanner" style={style as never}>
      {body}
    </View>
  );
}

export const QR_BEHAVIOURS: Behaviour[] = [
  {
    attr: "data-nk-qr-scanner",
    phase: 2,
    priority: 20,
    render: (_v, node, ctx) => <Scanner node={node} ctx={ctx} />,
  },
  {
    attr: "data-nk-qr",
    phase: 2,
    priority: 15,
    render: (value, node, ctx) => <QrOutput node={node} ctx={ctx} value={value} />,
  },
  // Read by the scanner (the field it fills; scan once or keep scanning).
  { attr: "data-nk-qr-output", phase: 2 },
  { attr: "data-nk-qr-once", phase: 2 },
];
