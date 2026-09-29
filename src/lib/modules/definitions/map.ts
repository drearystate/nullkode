import type { ModuleDefinition } from "../types";

export const map: ModuleDefinition = {
  id: "map",
  name: "Map & Locator",
  tagline: "Real map with pins (OpenStreetMap)",
  description:
    "A real interactive map powered by Leaflet and OpenStreetMap. Shows your business location with a pin and address. Free — no API key required.",
  icon: "",
  color: "from-green-500 to-emerald-600",
  category: "utility",
  version: "1.0.0",
  provides: ["map"],
  config: [
    { key: "title", label: "Page title", type: "text", default: "Find us", required: true },
    { key: "lat", label: "Latitude", type: "text", default: "47.6062" },
    { key: "lng", label: "Longitude", type: "text", default: "-122.3321" },
    { key: "zoom", label: "Zoom (1-19)", type: "number", default: 14 },
    { key: "label", label: "Marker label", type: "text", default: "Our location" },
    { key: "address", label: "Street address", type: "text", default: "123 Main St, Seattle WA" },
  ],
  tables: [],
  flows: [],
  pages: [
    {
      slug: "map",
      title: "Map",
      html: `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<section class="py-5"><div class="container">
<div class="row justify-content-center text-center"><div class="col-lg-8"><h1 class="display-5 fw-bold">{{config.title}}</h1><p class="lead" style="color:var(--nk-text-muted);">{{config.address}}</p></div></div>
<div class="row justify-content-center mt-4"><div class="col-lg-10">
  <div data-nk-map data-nk-lat="{{config.lat}}" data-nk-lng="{{config.lng}}" data-nk-zoom="{{config.zoom}}" data-nk-label="{{config.label}}" style="height:480px;width:100%;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);background:#e5e7eb;"></div>
</div></div>
</div></section>`,
    },
  ],
};
