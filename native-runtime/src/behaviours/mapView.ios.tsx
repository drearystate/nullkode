import { Component, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { TileMap, type MapProps, type Pin } from "./tileMap";

/**
 * iPhone maps: Apple Maps through react-native-maps (bundled in Expo Go and
 * linked into iOS builds; no key needed). If the native map isn't there, or
 * fails, the OpenStreetMap tile map (tileMap.tsx) takes over.
 */

type MapsModule = typeof import("react-native-maps");
let Maps: MapsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Maps = require("react-native-maps") as MapsModule;
} catch {
  Maps = null;
}

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function regionFor(lat: number, lng: number, zoom: number) {
  // A Leaflet zoom level as the span Apple Maps shows across the screen.
  const lngDelta = (360 / 2 ** zoom) * (390 / 256);
  return { latitude: lat, longitude: lng, latitudeDelta: lngDelta * Math.cos((lat * Math.PI) / 180), longitudeDelta: lngDelta };
}

function AppleMap(props: MapProps) {
  const { lat, lng, zoom, pins, height, labels, onOpenInMaps, font } = props;
  const [open, setOpen] = useState<Pin | null>(props.openFirst && pins.length ? pins[0] : null);
  const M = Maps!;
  const MapView = M.default;
  const Marker = M.Marker;
  return (
    <View testID="nk-map" style={{ height }}>
      <MapView style={{ flex: 1 }} initialRegion={regionFor(lat, lng, zoom)} toolbarEnabled={false}>
        {pins.map((p, i) => (
          <Marker key={i} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.label || undefined} onPress={() => setOpen(p)} />
        ))}
      </MapView>
      {open ? (
        <View style={{ position: "absolute", left: 10, right: 10, bottom: 10, backgroundColor: "#fff", borderRadius: 10, padding: 10, boxShadow: "0 3px 14px rgba(0,0,0,0.3)" } as never}>
          {open.label ? <Text style={{ fontSize: 14, color: "#333", ...font }}>{open.label}</Text> : null}
          <Pressable onPress={() => onOpenInMaps(open)} accessibilityRole="link">
            <Text style={{ color: "#0a84ff", fontSize: 13, marginTop: 4, ...font }}>{labels.openInMaps}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function MapWidget(props: MapProps) {
  if (!Maps) return <TileMap {...props} />;
  return (
    <Fallback fallback={<TileMap {...props} />}>
      <AppleMap {...props} />
    </Fallback>
  );
}

export type { MapProps, Pin };
