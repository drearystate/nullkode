import spec from "../../../../../../docs/partner-api.openapi.json";

export const dynamic = "force-static";

/** The partner API's OpenAPI 3.1 description (docs/partner-api.openapi.json). Public: it holds no secrets. */
export function GET() {
  return new Response(JSON.stringify(spec), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=300", "access-control-allow-origin": "*" },
  });
}
