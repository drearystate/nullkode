/**
 * A Module is a recipe for installing a complete, working feature into a
 * project: database tables, backend flows, and pages — all pre-wired.
 *
 * Modules are code-defined (not DB-stored) so they're versioned with the
 * app, type-checked, and easy to grow. Each module describes what it
 * creates; the installer handles the mechanics (ensureInternalTable,
 * flow-ref rewriting, etc).
 *
 * Inside a module definition, cross-references use *scoped local names*:
 *   - Tables are referenced by table.name (e.g. "messages")
 *   - Flows are referenced by flow.slug (e.g. "submit-message")
 *
 * At install time the installer rewrites those local refs to the real
 * database ids the new project gets. User-facing names and slugs are also
 * automatically de-collided if the same module is installed twice.
 */

export type ModuleCategory =
  | "communication"
  | "content"
  | "media"
  | "commerce"
  | "productivity"
  | "community"
  | "utility";

/**
 * Capabilities let modules advertise what they contribute to a project and
 * what they depend on. Declaring them lets the module gallery warn about
 * unmet requirements, and paves the way for automatic wiring between
 * modules that share the same capability (v2 — today it's informational).
 *
 * Phone features ("camera", "location") go in `provides` only: installing
 * the module adds that feature to the app, so its store apps ask for the
 * phone's permission (src/lib/native-permissions.ts). Never put them in
 * `requires`: no module provides them, so the install would be refused.
 */
export type ModuleCapability =
  | "camera" // shows the phone's camera in the page (getUserMedia), e.g. a QR scanner
  | "location" // asks for the visitor's location (navigator.geolocation)
  | "auth-session" // reads or writes the project's user session cookie
  | "auth-users" // owns the users table (register / login flows)
  | "map" // renders a Leaflet map with location data
  | "menu" // contributes menu or product items
  | "coupons" // contributes discount codes
  | "reviews" // contributes reviews or ratings
  | "email" // uses the email flow node (needs RESEND_API_KEY)
  | "ai" // uses the ai_prompt flow node (needs OPENAI_API_KEY)
  | "file-upload" // uses the /api/upload endpoint
  | "push" // uses the /api/push/* endpoints
  | "payments" // integrates with Stripe
  | "realtime"; // uses data-nk-refresh for live updates

export type ModuleFieldType = "text" | "int" | "float" | "bool" | "timestamp" | "json";

export type ModuleConfigField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "url" | "number" | "color" | "select";
  placeholder?: string;
  default?: string | number;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  help?: string;
};

export type ModuleTable = {
  name: string;
  fields: Array<{ name: string; type: ModuleFieldType }>;
  seed?: Array<Record<string, unknown>>;
};

export type ModuleFlowNode = {
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
    | "email"
    | "ai_prompt"
    | "delay"
    | "parse_json"
    | "math"
    | "sheets_read"
    | "sheets_append"
    | "hash_password"
    | "verify_password"
    | "set_session"
    | "get_session"
    | "clear_session";
  data: Record<string, unknown>;
};

export type ModuleFlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

export type ModuleFlow = {
  slug: string;
  name: string;
  httpMethod?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  purpose?: string;
  nodes: ModuleFlowNode[];
  edges: ModuleFlowEdge[];
};

export type ModulePage = {
  slug: string;
  title: string;
  isHome?: boolean;
  /** For the app's owner/staff only: installed behind sign-in as an admin. */
  ownerOnly?: boolean;
  html: string;
  css?: string;
};

export type ModuleDefinition = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string; // emoji or small SVG
  color: string; // tailwind gradient suffix or hex
  category: ModuleCategory;
  version: string;

  /** Capabilities this module contributes to the project. */
  provides?: ModuleCapability[];
  /** Capabilities this module needs to function well. */
  requires?: ModuleCapability[];
  /**
   * Hand-picked module ids that pair especially well with this one.
   * Shown in the gallery as "Pairs with: …".
   */
  worksWith?: string[];
  /**
   * When true, page and flow slugs are NOT prefixed with the module id.
   * Use for foundational modules like auth whose pages must be at well-known
   * paths (/login, /register, /profile) that other code references directly.
   */
  bareSlugs?: boolean;
  /**
   * For each capability this module provides, point at the concrete
   * resources that back it. Other modules can then reference those
   * resources via {{@<capability>.<field>}} in their flow data and
   * page HTML; the installer rewrites those refs at install time.
   *
   * Example: { "auth-users": { table: "users" } } means "my auth-users
   * capability is backed by my local table named 'users'". Dependent
   * modules that write {{@auth-users.table}} get the fully prefixed
   * real name (e.g. "auth_users") substituted in.
   */
  capabilityRefs?: Partial<
    Record<
      ModuleCapability,
      {
        table?: string;
        flow?: string;
      }
    >
  >;

  /** Optional config the user fills in during install */
  config?: ModuleConfigField[];

  tables: ModuleTable[];
  flows: ModuleFlow[];
  pages: ModulePage[];
};
