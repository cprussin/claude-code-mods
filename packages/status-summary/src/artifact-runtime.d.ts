// The slice of the claude.ai Artifact runtime (`window.claude`) this page
// calls. The platform's own declarations are authoritative; see
// https://claude.ai artifact capability docs, contract 0.2.67.

type McpError = { code: string; message: string };

type CallToolResult = {
  content: ({ type: "text"; text: string } | { type: string })[];
  payload?: unknown;
  cache?: { storedAt: number; revalidating: boolean };
};

type McpWatchEvent =
  | { type: "data"; result: CallToolResult }
  | { type: "error"; error: McpError };

type Mcp = {
  watchTool: (
    server: string,
    tool: string,
    input: unknown,
    handler: (ev: McpWatchEvent) => void,
    options?: { refetchInterval?: number },
  ) => () => void;
  invalidate: (server?: string, tool?: string) => Promise<void>;
};

type DbError = { code: string; message: string };

type DocumentSnapshot = {
  id: string;
  data: () => Record<string, unknown> | undefined;
};

type QuerySnapshot = { docs: DocumentSnapshot[] };

type DocumentReference = {
  set: (data: Record<string, unknown>) => Promise<void>;
  update: (data: Record<string, unknown>) => Promise<void>;
  delete: () => Promise<void>;
};

type Query = {
  orderBy: (field: string, dir?: "asc" | "desc") => Query;
  onSnapshot: (
    next: (snap: QuerySnapshot) => void,
    error?: (e: DbError) => void,
  ) => () => void;
};

type CollectionReference = Query & {
  add: (data: Record<string, unknown>) => Promise<DocumentReference>;
};

type Db = {
  doc: (path: string) => DocumentReference;
  collection: (path: string) => CollectionReference;
};

type PermissionsCapability = { manage: () => Promise<void> };

type ClaudeRuntime = {
  use(name: "mcp"): Promise<Mcp | null>;
  use(name: "db"): Promise<Db | null>;
  use(name: "permissions"): Promise<PermissionsCapability | null>;
};

// biome-ignore lint/style/useConsistentTypeDefinitions: Window augmentation requires an interface
interface Window {
  claude?: ClaudeRuntime;
}
