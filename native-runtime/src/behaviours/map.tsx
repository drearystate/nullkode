import { useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";
import type { NativeNode } from "../spec";
import type { Behaviour } from "../render/behaviours";
import type { RenderContext } from "../render/context";
import { toStyle } from "../render/style";
import { rowsOf, runFlow, tr, uiFont } from "./kit";
import { MapWidget, type Pin } from "./mapView";

/**
 * data-nk-map: the native twin of the web runtime's Leaflet map
 * (RUNTIME_JS "5. Leaflet maps"): data-nk-lat / -lng / -zoom (defaults
 * 47.6062, -122.3321, 13) and data-nk-label (one pin, its label open). Values
 * filled from a row (data-nk-attr-data-nk-lat="{lat}") work as everywhere.
 * Pins from data: data-nk-map-flow (or -ref) names a flow whose rows become
 * pins (data-nk-lat-field / -lng-field / -label-field, defaults lat, lng,
 * name); the web runtime does the same. Android and the preview draw
 * OpenStreetMap tiles; iPhones use Apple Maps (mapView.ios.tsx).
 */

const num = (v: string | undefined, d: number) => {
  const n = parseFloat(v ?? "");
  return isFinite(n) ? n : d;
};

function openInMaps(p: Pin) {
  const q = encodeURIComponent(p.label || `${p.lat},${p.lng}`);
  const url =
    Platform.OS === "ios"
      ? `https://maps.apple.com/?ll=${p.lat},${p.lng}&q=${q}`
      : Platform.OS === "android"
        ? `geo:${p.lat},${p.lng}?q=${p.lat},${p.lng}(${q})`
        : `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`;
  void Linking.openURL(url).catch(() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`).catch(() => {}));
}

function NkMap({ node, ctx }: { node: NativeNode; ctx: RenderContext }) {
  const nk = node.nk ?? {};
  const hasCenter = nk["data-nk-lat"] != null && !/\{/.test(nk["data-nk-lat"]);
  const lat = num(nk["data-nk-lat"], 47.6062);
  const lng = num(nk["data-nk-lng"], -122.3321);
  const zoom = Math.round(num(nk["data-nk-zoom"], 13));
  const label = nk["data-nk-label"] || "";
  const flowRaw = nk["data-nk-map-flow"] || nk["data-nk-map-flow-ref"] || "";
  const flow = flowRaw && !/\{\w+\}/.test(flowRaw) ? flowRaw : null;
  const [pins, setPins] = useState<Pin[] | null>(flow ? null : [{ lat, lng, label }]);

  useEffect(() => {
    if (!flow) return;
    const latF = nk["data-nk-lat-field"] || "lat";
    const lngF = nk["data-nk-lng-field"] || "lng";
    const labelF = nk["data-nk-label-field"] || "name";
    let live = true;
    runFlow(ctx, flow)
      .then((r) => {
        const list = rowsOf(r.body)
          .map((row) => ({ lat: parseFloat(String(row[latF])), lng: parseFloat(String(row[lngF])), label: row[labelF] == null ? "" : String(row[labelF]) }))
          .filter((p) => isFinite(p.lat) && isFinite(p.lng));
        if (live) setPins(hasCenter ? [{ lat, lng, label }, ...list] : list);
      })
      .catch(() => live && setPins([{ lat, lng, label }]));
    return () => {
      live = false;
    };
  }, [flow, ctx, nk, hasCenter, lat, lng, label]);

  const style = toStyle(node.style, node.vh, ctx);
  const height = typeof style.height === "number" ? style.height : typeof style.minHeight === "number" ? style.minHeight : 300;
  const { height: _h, ...outer } = style;
  const center = !hasCenter && pins?.length ? centerOf(pins, height) : { lat, lng, zoom };
  return (
    <View style={[outer as never, { height, overflow: "hidden" }]}>
      {pins ? (
        <MapWidget
          key={`${center.lat},${center.lng},${center.zoom},${pins.length}`}
          lat={center.lat}
          lng={center.lng}
          zoom={center.zoom}
          pins={pins}
          openFirst={!flow && Boolean(label)}
          height={height}
          labels={{
            zoomIn: tr(ctx.app, "native.mapZoomIn", "Zoom in"),
            zoomOut: tr(ctx.app, "native.mapZoomOut", "Zoom out"),
            openInMaps: tr(ctx.app, "native.mapOpen", "Open in Maps"),
            attribution: "© OpenStreetMap contributors",
          }}
          onOpenInMaps={openInMaps}
          font={uiFont(ctx)}
        />
      ) : null}
    </View>
  );
}

/** The middle of the pins and a zoom that shows them all (a phone-wide map, `height` tall, 30 px margins). */
function centerOf(pins: Pin[], height: number): { lat: number; lng: number; zoom: number } {
  const lats = pins.map((p) => p.lat);
  const lngs = pins.map((p) => p.lng);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const lngSpan = Math.max(Math.max(...lngs) - Math.min(...lngs), 0.001);
  // Latitude degrees as longitude degrees at this latitude (near enough for city maps).
  const latSpan = Math.max((Math.max(...lats) - Math.min(...lats)) / Math.cos((lat * Math.PI) / 180), 0.001);
  const fit = (px: number, span: number) => Math.log2((Math.max(60, px - 60) * 360) / 256 / span);
  const zoom = Math.max(2, Math.min(16, Math.floor(Math.min(fit(330, lngSpan), fit(height, latSpan)))));
  return { lat, lng, zoom };
}

export const MAP_BEHAVIOURS: Behaviour[] = [
  {
    attr: "data-nk-map",
    phase: 2,
    priority: 20,
    render: (_v, node, ctx) => <NkMap node={node} ctx={ctx} />,
  },
];
