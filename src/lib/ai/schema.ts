/**
 * JSON schema passed to GPT-5 via `response_format: { type: "json_schema" }`.
 * The model is constrained to produce exactly this shape, which we then
 * apply to create a project + datasource + tables + pages + flows.
 *
 * Deliberately keeps names short and flat so the model can fill it reliably.
 */
export const SCAFFOLD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["project", "theme", "datasource", "pages", "flows"],
  properties: {
    project: {
      type: "object",
      additionalProperties: false,
      required: ["name", "description"],
      properties: {
        name: { type: "string", description: "Short product name, 1-5 words" },
        description: { type: "string", description: "One-sentence description" },
      },
    },
    theme: {
      type: "string",
      description:
        "Pick a theme preset name that matches the app's personality. Available: Clean Slate, Corporate Trust, Warm Earth, Cherry Blossom, Ocean Breeze, Forest, Spring Garden, Sunset, Autumn Gold, Rose Gold, Newspaper, Minimal Mono, Brutalist, Pastel Dream, Gradient Dream, Desert, Electric, Midnight, Midnight Blue, Charcoal & Amber, Bold Neon, Terminal Green, Ocean Depths, Forest Dark, Purple Rain, Industrial, Royal, Cyberpunk, Copper, Monochrome",
      enum: [
        "Clean Slate", "Corporate Trust", "Warm Earth", "Cherry Blossom",
        "Ocean Breeze", "Forest", "Spring Garden", "Sunset", "Autumn Gold",
        "Rose Gold", "Newspaper", "Minimal Mono", "Brutalist", "Pastel Dream",
        "Gradient Dream", "Desert", "Electric", "Midnight", "Midnight Blue",
        "Charcoal & Amber", "Bold Neon", "Terminal Green", "Ocean Depths",
        "Forest Dark", "Purple Rain", "Industrial", "Royal", "Cyberpunk",
        "Copper", "Monochrome",
      ],
    },
    datasource: {
      type: "object",
      additionalProperties: false,
      required: ["tables"],
      properties: {
        tables: {
          type: "array",
          description:
            "Database tables required by the app. Each table becomes a real Postgres table inside an isolated project schema.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "fields"],
            properties: {
              name: {
                type: "string",
                description:
                  "snake_case table name, letters/digits/underscores only",
              },
              fields: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "type"],
                  properties: {
                    name: {
                      type: "string",
                      description: "snake_case column name",
                    },
                    type: {
                      type: "string",
                      enum: ["text", "int", "float", "bool", "timestamp", "json"],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    pages: {
      type: "array",
      description:
        "Pages of the app. Use Bootstrap 5 classes for styling. Each page is standalone HTML that will be pasted inside a <body>.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "slug", "isHome", "html", "css"],
        properties: {
          title: { type: "string" },
          slug: {
            type: "string",
            description: "URL slug, kebab-case",
          },
          isHome: { type: "boolean" },
          html: {
            type: "string",
            description:
              "Full Bootstrap-5 HTML body for this page. Use data-nk-form and data-nk-flow-ref to bind forms to flows (by flow slug, not id). Use data-nk-bind-flow-ref to populate lists from a flow. Use <a href='/slug'> for internal page links.",
          },
          css: {
            type: "string",
            description:
              "Optional extra CSS. Use empty string if none needed.",
          },
        },
      },
    },
    flows: {
      type: "array",
      description:
        "Backend logic flows. Each is a directed graph of nodes executed when called via HTTP.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "slug", "purpose", "nodes", "edges"],
        properties: {
          name: { type: "string" },
          slug: {
            type: "string",
            description:
              "kebab-case slug, becomes the HTTP path. This is how pages reference the flow.",
          },
          purpose: {
            type: "string",
            description: "One-sentence description of what this flow does",
          },
          nodes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "type", "data"],
              properties: {
                id: { type: "string", description: "Unique node id within this flow" },
                type: {
                  type: "string",
                  enum: [
                    "trigger",
                    "query",
                    "insert",
                    "update",
                    "delete",
                    "branch",
                    "set",
                    "http_request",
                    "response",
                    "hash_password",
                    "verify_password",
                    "set_session",
                    "get_session",
                    "clear_session",
                    "custom_js",
                    "lookup",
                    "aggregate",
                    "check_role",
                    "bulk_insert",
                    "bulk_update",
                    "bulk_delete",
                  ],
                },
                data: {
                  type: "string",
                  description:
                    "JSON-stringified node config. Must be valid JSON. See the system prompt for the exact shape for each node type.",
                },
              },
            },
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "source", "target", "sourceHandle"],
              properties: {
                id: { type: "string" },
                source: { type: "string", description: "Source node id" },
                target: { type: "string", description: "Target node id" },
                sourceHandle: {
                  type: ["string", "null"],
                  description:
                    "For branch nodes: 'true' or 'false'. Null for all other edges.",
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type ScaffoldResult = {
  project: { name: string; description: string };
  theme: string;
  datasource: {
    tables: Array<{
      name: string;
      fields: Array<{
        name: string;
        type: "text" | "int" | "float" | "bool" | "timestamp" | "json";
      }>;
      /** Example rows to start with (only fields that exist are used). */
      seed?: Array<Record<string, string | number | boolean | null>>;
    }>;
  };
  pages: Array<{
    title: string;
    slug: string;
    isHome: boolean;
    html: string;
    css?: string;
  }>;
  flows: Array<{
    name: string;
    slug: string;
    purpose: string;
    nodes: Array<{
      id: string;
      type:
        | "trigger"
        | "query"
        | "insert"
        | "update"
        | "delete"
        | "branch"
        | "set"
        | "http_request"
        | "response"
        | "hash_password"
        | "verify_password"
        | "set_session"
        | "get_session"
        | "clear_session"
        | "custom_js"
        | "lookup"
        | "aggregate"
        | "check_role"
        | "bulk_insert"
        | "bulk_update"
        | "bulk_delete";
      /** JSON-stringified node config — parse before use */
      data: string;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string | null;
    }>;
    /**
     * Set by the builder when the flow is a standard data operation built in
     * code (see ./standard-flows). Never part of the model's output.
     */
    standard?: { kind: "list" | "load" | "create" | "update" | "delete" | "aggregate"; table: string; auth: boolean };
  }>;
};
