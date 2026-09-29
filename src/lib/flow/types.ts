export type NodeId = string;

export type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export type FlowEdge = {
  id: string;
  source: NodeId;
  target: NodeId;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type FlowNode =
  | TriggerNode
  | QueryNode
  | InsertNode
  | UpdateNode
  | DeleteNode
  | SheetsReadNode
  | SheetsAppendNode
  | HttpRequestNode
  | BranchNode
  | SetNode
  | ResponseNode
  | EmailNode
  | SendPushNode
  | AiPromptNode
  | DelayNode
  | ParseJsonNode
  | MathNode
  | HashPasswordNode
  | VerifyPasswordNode
  | SetSessionNode
  | GetSessionNode
  | ClearSessionNode
  | CustomJsNode
  | LookupNode
  | CheckRoleNode
  | BulkInsertNode
  | BulkUpdateNode
  | BulkDeleteNode
  | AggregateNode;

type BaseNode<T extends string, D> = {
  id: NodeId;
  type: T;
  position?: { x: number; y: number };
  data: D;
};

export type TriggerNode = BaseNode<
  "trigger",
  { label?: string }
>;

export type QueryNode = BaseNode<
  "query",
  {
    label?: string;
    datasourceId?: string;
    table?: string;
    where?: Record<string, string>;
    limit?: number;
    orderBy?: string;
    output?: string;
  }
>;

export type InsertNode = BaseNode<
  "insert",
  {
    label?: string;
    datasourceId?: string;
    table?: string;
    values?: Record<string, string>;
    /** Drop values that interpolate to empty (fields the request didn't send). */
    skipEmpty?: boolean;
    output?: string;
  }
>;

export type UpdateNode = BaseNode<
  "update",
  {
    label?: string;
    datasourceId?: string;
    table?: string;
    where?: Record<string, string>;
    values?: Record<string, string>;
    /** Drop values that interpolate to empty (fields the request didn't send). */
    skipEmpty?: boolean;
    output?: string;
  }
>;

export type DeleteNode = BaseNode<
  "delete",
  {
    label?: string;
    datasourceId?: string;
    table?: string;
    where?: Record<string, string>;
    output?: string;
  }
>;

export type SheetsReadNode = BaseNode<
  "sheets_read",
  {
    label?: string;
    datasourceId?: string;
    sheet?: string;
    range?: string;
    output?: string;
  }
>;

export type SheetsAppendNode = BaseNode<
  "sheets_append",
  {
    label?: string;
    datasourceId?: string;
    sheet?: string;
    values?: string;
    output?: string;
  }
>;

export type HttpRequestNode = BaseNode<
  "http_request",
  {
    label?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    url?: string;
    headers?: Record<string, string>;
    body?: string;
    output?: string;
  }
>;

export type BranchNode = BaseNode<
  "branch",
  {
    label?: string;
    left?: string;
    op?: "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "exists";
    right?: string;
  }
>;

export type SetNode = BaseNode<
  "set",
  {
    label?: string;
    name?: string;
    value?: string;
  }
>;

export type ResponseNode = BaseNode<
  "response",
  {
    label?: string;
    status?: number;
    body?: string;
    bodyFields?: Record<string, string>;
  }
>;

export type EmailNode = BaseNode<
  "email",
  {
    label?: string;
    to?: string;
    from?: string;
    subject?: string;
    body?: string;
    output?: string;
  }
>;

/** Push notification to everyone subscribed to this app. */
export type SendPushNode = BaseNode<
  "send_push",
  {
    label?: string;
    title?: string;
    body?: string;
    /** Page to open when tapped ("/offers") or a full URL. */
    url?: string;
    output?: string;
  }
>;

export type AiPromptNode = BaseNode<
  "ai_prompt",
  {
    label?: string;
    prompt?: string;
    system?: string;
    output?: string;
  }
>;

export type DelayNode = BaseNode<
  "delay",
  {
    label?: string;
    seconds?: number;
  }
>;

export type ParseJsonNode = BaseNode<
  "parse_json",
  {
    label?: string;
    input?: string;
    output?: string;
  }
>;

export type MathNode = BaseNode<
  "math",
  {
    label?: string;
    left?: string;
    op?: "+" | "-" | "*" | "/" | "%";
    right?: string;
    output?: string;
  }
>;

export type HashPasswordNode = BaseNode<
  "hash_password",
  {
    label?: string;
    input?: string;
    output?: string;
  }
>;

export type VerifyPasswordNode = BaseNode<
  "verify_password",
  {
    label?: string;
    plain?: string;
    hash?: string;
    output?: string;
  }
>;

export type SetSessionNode = BaseNode<
  "set_session",
  {
    label?: string;
    userId?: string;
  }
>;

export type GetSessionNode = BaseNode<
  "get_session",
  {
    label?: string;
    output?: string;
  }
>;

export type ClearSessionNode = BaseNode<
  "clear_session",
  {
    label?: string;
  }
>;

export type CustomJsNode = BaseNode<
  "custom_js",
  {
    label?: string;
    /**
     * User-editable JavaScript source. Runs inside the flow runtime in a
     * sandboxed VM context. The script has read/write access to a `vars`
     * object (flow variables) and read-only `trigger`. Whatever the script
     * returns (or assigns to `vars[output]`) becomes available to later nodes.
     */
    code?: string;
    /** Name of the var to store the script's return value in. */
    output?: string;
  }
>;

/**
 * Lookup / JOIN — enrich a row array with data from another table.
 * For each row in the source, fetches matching row(s) from the lookup
 * table and attaches them as a nested field.
 */
export type LookupNode = BaseNode<
  "lookup",
  {
    label?: string;
    datasourceId?: string;
    /** The source array variable (e.g. "rows" from a prior query) */
    sourceVar?: string;
    /** Field in the source rows that holds the foreign key */
    sourceField?: string;
    /** The table to look up from */
    lookupTable?: string;
    /** Field in the lookup table to match against (usually "id") */
    lookupField?: string;
    /** Name of the nested field to attach to each source row */
    as?: string;
    output?: string;
  }
>;

/** Check the current user's role against an expected value. */
export type CheckRoleNode = BaseNode<
  "check_role",
  {
    label?: string;
    /** The role to check for (e.g. "admin", "manager") */
    role?: string;
    /** Where to find the user's role — defaults to vars.session.role */
    source?: string;
    output?: string;
  }
>;

/** Insert multiple rows in a single operation. */
export type BulkInsertNode = BaseNode<
  "bulk_insert",
  {
    label?: string;
    datasourceId?: string;
    table?: string;
    /** Variable name holding an array of row objects */
    rowsVar?: string;
    output?: string;
  }
>;

/** Update multiple rows matching a condition. */
export type BulkUpdateNode = BaseNode<
  "bulk_update",
  {
    label?: string;
    datasourceId?: string;
    table?: string;
    where?: Record<string, string>;
    values?: Record<string, string>;
    output?: string;
  }
>;

/** Delete multiple rows matching a condition. */
export type BulkDeleteNode = BaseNode<
  "bulk_delete",
  {
    label?: string;
    datasourceId?: string;
    table?: string;
    where?: Record<string, string>;
    output?: string;
  }
>;

/** Aggregate query — GROUP BY with SUM/COUNT/AVG/MIN/MAX. */
export type AggregateNode = BaseNode<
  "aggregate",
  {
    label?: string;
    datasourceId?: string;
    table?: string;
    groupBy?: string;
    /** e.g. "COUNT(*)" or "SUM(amount)" or "AVG(price)" */
    aggregate?: string;
    where?: Record<string, string>;
    orderBy?: string;
    limit?: number;
    output?: string;
  }
>;

export type RunContext = {
  trigger: unknown;
  vars: Record<string, unknown>;
  projectId: string;
  flowId: string;
  cookies: Record<string, string>;
};

export type RunResult = {
  status: number;
  body: unknown;
  vars: Record<string, unknown>;
  setCookies: Array<{ name: string; value: string; expires?: Date; maxAge?: number }>;
  trace: Array<{ nodeId: string; type: string; durationMs: number; ok: boolean; error?: string }>;
};
