import type { ModuleDefinition } from "../types";

export const weather: ModuleDefinition = {
  id: "weather",
  name: "Weather Widget",
  tagline: "Current weather from OpenWeatherMap",
  description:
    "Fetch live weather for a location using an OpenWeatherMap API key. Shows temperature, conditions and an icon. Bring your own free API key in the module config.",
  icon: "",
  color: "from-sky-400 to-blue-500",
  category: "utility",
  version: "1.0.0",
  config: [
    { key: "city", label: "City", type: "text", default: "Seattle", required: true },
    { key: "apiKey", label: "OpenWeatherMap API key", type: "text", placeholder: "free at openweathermap.org", required: true },
    { key: "units", label: "Units", type: "select", default: "imperial", options: [
      { value: "imperial", label: "Fahrenheit (°F)" },
      { value: "metric", label: "Celsius (°C)" },
    ] },
  ],
  tables: [],
  flows: [
    {
      slug: "current",
      name: "Fetch current weather",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "http_request",
          data: {
            method: "GET",
            url: "https://api.openweathermap.org/data/2.5/weather?q={{config.city}}&units={{config.units}}&appid={{config.apiKey}}",
            output: "weather",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: "{{vars.weather.body}}" },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "weather",
      title: "Weather",
      html: `<section class="py-5" style="background:linear-gradient(180deg,var(--nk-primary) 0%,color-mix(in srgb, var(--nk-primary) 60%, var(--nk-bg)) 100%);min-height:100vh;color:#fff;"><div class="container text-center" style="padding-top:10vh;">
<h1 class="display-5 fw-bold">{{config.city}}</h1>
<div data-nk-bind-flow-ref="current" data-nk-refresh="300000" class="mt-4">
  <div data-nk-item>
    <div class="display-1 fw-bold">72°</div>
    <div class="fs-4" style="color:rgba(255,255,255,0.5);">Partly cloudy</div>
    <div class="mt-4 d-inline-flex gap-4 text-white-75 justify-content-center">
      <div><div class="small" style="color:rgba(255,255,255,0.5);">Feels like</div><div class="fs-5">70°</div></div>
      <div><div class="small" style="color:rgba(255,255,255,0.5);">Humidity</div><div class="fs-5">58%</div></div>
      <div><div class="small" style="color:rgba(255,255,255,0.5);">Wind</div><div class="fs-5">8 mph</div></div>
    </div>
  </div>
</div>
<p class="small mt-5" style="color:rgba(255,255,255,0.5);">Updates every 5 minutes · {{config.units}}</p>
</div></section>`,
    },
  ],
};
