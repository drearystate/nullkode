import { useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Pressable, Text, View, type GestureResponderEvent } from "react-native";
import { Image } from "expo-image";

/**
 * A map drawn from OpenStreetMap tiles (the tiles the web runtime's Leaflet
 * map shows), in plain React Native: no Google Maps key, no native module, so
 * it works the same in Android builds, Expo Go and the browser preview. Drag
 * to move, pinch or the +/− buttons (double tap) to zoom; pins with labels.
 * iPhones use Apple Maps (mapView.ios.tsx); everything else uses this (mapView.tsx).
 */

export type Pin = { lat: number; lng: number; label?: string };

export type MapProps = {
  lat: number;
  lng: number;
  zoom: number;
  pins: Pin[];
  /** The single pin's label starts open (Leaflet's openPopup). */
  openFirst?: boolean;
  height: number;
  labels: { zoomIn: string; zoomOut: string; openInMaps: string; attribution: string };
  onOpenInMaps: (pin: Pin) => void;
  font?: { fontFamily?: string };
};

const TILE = 256;
const MIN_Z = 2;
const MAX_Z = 19;
// The tile servers' usage policy asks apps to say who they are.
const TILE_HEADERS = { "User-Agent": "NullKodeNative/1 (+https://nullkode.com)" };

function project(lat: number, lng: number, z: number): { x: number; y: number } {
  const ws = TILE * 2 ** z;
  const s = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return { x: ((lng + 180) / 360) * ws, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * ws };
}

function unproject(x: number, y: number, z: number): { lat: number; lng: number } {
  const ws = TILE * 2 ** z;
  const lng = (x / ws) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / ws;
  return { lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lng };
}

const dist = (e: GestureResponderEvent) => {
  const t = e.nativeEvent.touches;
  if (!t || t.length < 2) return 0;
  return Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
};

export function TileMap({ lat, lng, zoom, pins, openFirst, height, labels, onOpenInMaps, font }: MapProps) {
  const [width, setWidth] = useState(0);
  const [view, setView] = useState(() => ({ z: Math.round(Math.min(MAX_Z, Math.max(MIN_Z, zoom))), lat, lng }));
  const [drag, setDrag] = useState({ dx: 0, dy: 0, scale: 1 });
  const [open, setOpen] = useState<number | null>(openFirst && pins.length ? 0 : null);
  const g = useRef({ startDist: 0, lastTap: 0, scale: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const zoomBy = (d: number) => setView((v) => ({ ...v, z: Math.min(MAX_Z, Math.max(MIN_Z, v.z + d)) }));

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          g.current.startDist = dist(e);
          const now = Date.now();
          if (now - g.current.lastTap < 300) zoomBy(1);
          g.current.lastTap = now;
        },
        onPanResponderMove: (e, s) => {
          const d = dist(e);
          if (d && !g.current.startDist) g.current.startDist = d;
          g.current.scale = d && g.current.startDist ? d / g.current.startDist : g.current.scale;
          setDrag({ dx: s.dx, dy: s.dy, scale: g.current.scale });
        },
        onPanResponderRelease: (_e, s) => {
          const v = viewRef.current;
          const c = project(v.lat, v.lng, v.z);
          const next = unproject(c.x - s.dx, c.y - s.dy, v.z);
          const steps = g.current.scale !== 1 ? Math.round(Math.log2(g.current.scale)) : 0;
          setView({ z: Math.min(MAX_Z, Math.max(MIN_Z, v.z + steps)), lat: Math.max(-85, Math.min(85, next.lat)), lng: next.lng });
          setDrag({ dx: 0, dy: 0, scale: 1 });
          g.current.startDist = 0;
          g.current.scale = 1;
        },
        onPanResponderTerminate: () => {
          setDrag({ dx: 0, dy: 0, scale: 1 });
          g.current.startDist = 0;
          g.current.scale = 1;
        },
      }),
    [],
  );

  const tiles: Array<{ key: string; uri: string; left: number; top: number }> = [];
  const c = project(view.lat, view.lng, view.z);
  const left = c.x - width / 2 - drag.dx;
  const top = c.y - height / 2 - drag.dy;
  if (width > 0) {
    const n = 2 ** view.z;
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
        const wx = ((tx % n) + n) % n;
        tiles.push({ key: `${view.z}/${tx}/${ty}`, uri: `https://tile.openstreetmap.org/${view.z}/${wx}/${ty}.png`, left: tx * TILE - left, top: ty * TILE - top });
      }
    }
  }
  const btn = { width: 34, height: 34, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderColor: "rgba(0,0,0,0.25)", borderWidth: 1 } as const;

  return (
    <View
      testID="nk-map"
      style={{ height, overflow: "hidden", backgroundColor: "#e5e7eb", direction: "ltr" } as never}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
    >
      <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, transform: [{ scale: drag.scale }] }} {...responder.panHandlers}>
        {tiles.map((t) => (
          <Image key={t.key} source={Platform.OS === "web" ? { uri: t.uri } : { uri: t.uri, headers: TILE_HEADERS }} style={{ position: "absolute", left: t.left, top: t.top, width: TILE, height: TILE }} cachePolicy="disk" transition={0} />
        ))}
        {pins.map((p, i) => {
          const pt = project(p.lat, p.lng, view.z);
          const x = pt.x - left;
          const y = pt.y - top;
          if (x < -40 || y < -40 || x > width + 40 || y > height + 40) return null;
          return (
            <Pressable
              key={i}
              testID="nk-map-pin"
              onPress={() => setOpen(open === i ? null : i)}
              accessibilityRole="button"
              accessibilityLabel={p.label || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}
              hitSlop={10}
              style={{ position: "absolute", left: x - 12, top: y - 34, width: 24, height: 34, alignItems: "center" }}
            >
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#2a81cb", borderWidth: 3, borderColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" } as never} />
              <View style={{ width: 3, height: 10, backgroundColor: "#2a81cb" }} />
            </Pressable>
          );
        })}
      </View>
      {open != null && pins[open] ? (
        <Bubble
          pin={pins[open]}
          x={project(pins[open].lat, pins[open].lng, view.z).x - left}
          y={project(pins[open].lat, pins[open].lng, view.z).y - top - 40}
          label={labels.openInMaps}
          onOpen={() => onOpenInMaps(pins[open])}
          font={font}
        />
      ) : null}
      <View style={{ position: "absolute", left: 10, top: 10, borderRadius: 4, overflow: "hidden" }}>
        <Pressable testID="nk-map-zoom-in" accessibilityRole="button" accessibilityLabel={labels.zoomIn} onPress={() => zoomBy(1)} style={btn}>
          <Text style={{ fontSize: 20, color: "#333" }}>+</Text>
        </Pressable>
        <Pressable testID="nk-map-zoom-out" accessibilityRole="button" accessibilityLabel={labels.zoomOut} onPress={() => zoomBy(-1)} style={[btn, { borderTopWidth: 0 }]}>
          <Text style={{ fontSize: 20, color: "#333" }}>−</Text>
        </Pressable>
      </View>
      <View style={{ position: "absolute", right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.8)", paddingHorizontal: 4 }} pointerEvents="none">
        <Text style={{ fontSize: 10, color: "#333" }}>{labels.attribution}</Text>
      </View>
    </View>
  );
}

function Bubble({ pin, x, y, label, onOpen, font }: { pin: Pin; x: number; y: number; label: string; onOpen: () => void; font?: { fontFamily?: string } }) {
  return (
    <View style={{ position: "absolute", left: Math.max(4, x - 110), top: Math.max(4, y - 64), width: 220, alignItems: "center" }} pointerEvents="box-none">
      <View style={{ backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, boxShadow: "0 3px 14px rgba(0,0,0,0.4)", maxWidth: 220 } as never}>
        {pin.label ? <Text style={{ color: "#333", fontSize: 14, ...font }}>{pin.label}</Text> : null}
        <Pressable onPress={onOpen} accessibilityRole="link">
          <Text style={{ color: "#0078a8", fontSize: 13, marginTop: pin.label ? 4 : 0, ...font }}>{label}</Text>
        </Pressable>
      </View>
    </View>
  );
}
