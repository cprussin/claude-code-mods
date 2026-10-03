import { z } from "zod";
import { openAsks } from "./asks";
import { formatAge } from "./relative-time";
import type { Session } from "./sessions";
import { parseSessions, SessionStatus } from "./sessions";

const SERVER = "Claude Code Remote";
const POLL_MS = 30_000;
const STATUS_LABELS: readonly [SessionStatus, string][] = [
  [SessionStatus.Waiting, "Waiting on you"],
  [SessionStatus.Running, "Running"],
  [SessionStatus.Review, "Ready for review"],
  [SessionStatus.Failed, "Failed"],
  [SessionStatus.Idle, "Idle"],
];
const STATUS_CLASS: Record<SessionStatus, string> = {
  [SessionStatus.Waiting]: "s-waiting",
  [SessionStatus.Running]: "s-running",
  [SessionStatus.Review]: "s-review",
  [SessionStatus.Failed]: "s-failed",
  [SessionStatus.Idle]: "s-done",
};

const todoSchema = z.object({
  createdAt: z.number(),
  done: z.boolean(),
  text: z.string(),
});
const dismissedSchema = z.object({ ask: z.string() });

type Todo = z.infer<typeof todoSchema> & { id: string };

type State = {
  sessions: Session[] | undefined;
  sessionsAt: number | undefined;
  todos: Todo[];
  dismissed: Record<string, string>;
  db: Db | undefined;
};

const state: State = {
  db: undefined,
  dismissed: {},
  sessions: undefined,
  sessionsAt: undefined,
  todos: [],
};

/** Boots the page: renders the empty frame, then lights up db and mcp. */
const main = () => {
  byId("add-form").addEventListener("submit", onAddTodo);
  render();
  setInterval(renderUpdated, 15_000);
  const claude = window.claude;
  if (claude === undefined) {
    notice(
      "session-notice",
      "Open this page on claude.ai to see your sessions.",
    );
  } else {
    claude.use("db").then(startDb, reportError("todo-notice"));
    claude.use("mcp").then(startMcp, reportError("session-notice"));
  }
};

// ---- Rendering ----------------------------------------------------------

const render = () => {
  renderStrip();
  renderTodos();
  renderSessions();
  renderUpdated();
};

const renderUpdated = () => {
  byId("updated").textContent =
    state.sessionsAt === undefined
      ? "Loading sessions…"
      : `Sessions updated ${formatAge(new Date(state.sessionsAt), new Date())}`;
};

const renderStrip = () => {
  const sessions = state.sessions;
  byId("strip").replaceChildren(
    ...(sessions === undefined
      ? []
      : STATUS_LABELS.flatMap(([status, label]) => {
          const n = sessions.filter((s) => s.status === status).length;
          return n > 0 || status === SessionStatus.Waiting
            ? [
                el(
                  "span",
                  { class: `chip ${STATUS_CLASS[status]}` },
                  el("b", {}, String(n)),
                  label,
                ),
              ]
            : [];
        })),
  );
};

const renderTodos = () => {
  const asks = openAsks(state.sessions ?? [], state.dismissed);
  const open = state.todos.filter((t) => !t.done);
  const done = state.todos.filter((t) => t.done);
  byId("todo-count").textContent = `${asks.length + open.length} open`;
  byId("asks").replaceChildren(...asks.map(askItem));
  byId("todos").replaceChildren(
    ...open.map(todoItem),
    ...(asks.length + open.length === 0 ? [emptyTodos()] : []),
  );
  byId("done-wrap").hidden = done.length === 0;
  byId("done-summary").textContent = `${done.length} completed`;
  byId("done-list").replaceChildren(
    ...done.map(todoItem),
    el(
      "li",
      {},
      el(
        "button",
        { class: "ghost", onclick: clearDone, type: "button" },
        "Clear completed",
      ),
    ),
  );
};

const emptyTodos = () =>
  el(
    "li",
    { class: "empty" },
    state.sessions === undefined
      ? "Your TODOs and any asks from your sessions show up here."
      : "Nothing needs you right now.",
  );

const askItem = (s: Session) =>
  el(
    "li",
    { class: "item ask" },
    el("span", { "aria-hidden": "true" }),
    el(
      "div",
      { class: "text" },
      el("div", { class: "from" }, "From a session"),
      el("div", {}, s.ask ?? ""),
      el(
        "div",
        { class: "sub" },
        el("a", { href: s.url, rel: "noopener", target: "_blank" }, s.title),
        el("span", {}, formatAge(new Date(s.updatedAt), new Date())),
      ),
    ),
    el(
      "button",
      {
        class: "ghost",
        onclick: () => dismiss(s),
        title: "Hide until this session asks something new",
        type: "button",
      },
      "Done",
    ),
  );

const todoItem = (t: Todo) =>
  el(
    "li",
    { class: "item" },
    el("input", {
      "aria-label": `Mark "${t.text}" done`,
      checked: t.done,
      id: `todo-${t.id}`,
      onchange: (e: Event) =>
        setDone(t, e.target instanceof HTMLInputElement && e.target.checked),
      type: "checkbox",
    }),
    el(
      "label",
      { class: t.done ? "text done-text" : "text", for: `todo-${t.id}` },
      t.text,
    ),
    el(
      "button",
      {
        "aria-label": `Delete "${t.text}"`,
        class: "ghost",
        onclick: () => removeTodo(t),
        title: "Delete",
        type: "button",
      },
      "✕",
    ),
  );

const renderSessions = () => {
  const sessions = state.sessions;
  if (sessions !== undefined) {
    byId("session-count").textContent = `${sessions.length} active`;
    byId("sessions").replaceChildren(
      ...(sessions.length === 0
        ? [
            el(
              "p",
              { class: "empty" },
              "No active sessions. Archived sessions are hidden.",
            ),
          ]
        : STATUS_LABELS.flatMap(([status, label]) =>
            sessionGroup(sessions, status, label),
          )),
    );
  }
};

const sessionGroup = (
  sessions: readonly Session[],
  status: SessionStatus,
  label: string,
) => {
  const rows = sessions
    .filter((s) => s.status === status)
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return rows.length === 0
    ? []
    : [
        el(
          "div",
          { class: "group" },
          el("div", { class: "group-label" }, `${label} · ${rows.length}`),
          ...rows.map((s) => sessionRow(s, label)),
        ),
      ];
};

const sessionRow = (s: Session, label: string) =>
  el(
    "div",
    { class: "session" },
    el(
      "div",
      {},
      s.unread ? el("span", { class: "unread", title: "Unread" }) : undefined,
      el(
        "a",
        { class: "title", href: s.url, rel: "noopener", target: "_blank" },
        s.title,
      ),
    ),
    el("span", { class: `pill ${STATUS_CLASS[s.status]}` }, label),
    s.detail === undefined
      ? undefined
      : el("div", { class: "detail" }, s.detail),
    el(
      "div",
      { class: "facts" },
      s.repo === undefined ? undefined : el("span", {}, s.repo),
      el("span", {}, formatAge(new Date(s.updatedAt), new Date())),
    ),
  );

const notice = (id: string, message: string | undefined, action?: Node) => {
  const box = byId(id);
  box.hidden = message === undefined;
  box.className = "notice";
  box.replaceChildren(
    ...(message === undefined ? [] : [el("span", {}, message)]),
    ...(action === undefined ? [] : [action]),
  );
};

const reportError = (id: string) => (error: unknown) =>
  notice(id, error instanceof Error ? error.message : String(error));

// ---- Sessions, via the Claude Code Remote connector ------------------------

const startMcp = (mcp: Mcp | null) => {
  if (mcp === null) {
    notice(
      "session-notice",
      "Connectors aren't available in this view, so sessions can't load.",
    );
  } else {
    mcp.watchTool(
      SERVER,
      "list_sessions",
      { limit: 100, mine: true },
      onSessions,
      { refetchInterval: POLL_MS },
    );
    byId("refresh").addEventListener("click", () => {
      mcp
        .invalidate(SERVER, "list_sessions")
        .catch(reportError("session-notice"));
    });
  }
};

const onSessions = (ev: McpWatchEvent) => {
  switch (ev.type) {
    case "data": {
      try {
        state.sessions = parseSessions(ev.result.payload);
        state.sessionsAt = ev.result.cache?.storedAt ?? Date.now();
        notice("session-notice", undefined);
      } catch (error) {
        notice(
          "session-notice",
          `Couldn't read the session list: ${String(error)}`,
        );
      }
      break;
    }
    case "error": {
      const blocked = blockedMessage(ev.error.code);
      if (blocked === undefined) {
        notice("session-notice", `Session list is stale: ${ev.error.message}`);
      } else {
        state.sessions = undefined;
        notice(
          "session-notice",
          blocked,
          el(
            "button",
            { onclick: openPermissions, type: "button" },
            "Permissions",
          ),
        );
      }
      break;
    }
  }
  render();
};

/** Copy for the connector errors that need the person to act; transient ones get none. */
const blockedMessage = (code: string): string | undefined => {
  switch (code) {
    case "server_not_connected": {
      return `Add the ${SERVER} connector in claude.ai Settings → Connectors to see your sessions.`;
    }
    case "needs_reauth": {
      return `Reconnect ${SERVER} in claude.ai Settings → Connectors.`;
    }
    case "selection_required": {
      return `Choose which ${SERVER} connector this page uses when claude.ai asks.`;
    }
    case "not_in_manifest":
    case "not_granted":
    case "consent_required": {
      return `This page isn't allowed to read your sessions. Allow ${SERVER} in the page's Permissions.`;
    }
    case "blocked_by_policy":
    case "approval_required": {
      return "Your organization's policy blocks reading sessions here.";
    }
    default: {
      return undefined;
    }
  }
};

const openPermissions = async () => {
  const permissions = await window.claude?.use("permissions");
  if (permissions !== undefined && permissions !== null) {
    await permissions.manage().catch(() => {
      notice(
        "session-notice",
        "Open the page's Permissions menu to allow the connector.",
      );
    });
  }
};

// ---- TODOs and dismissed asks, via the page's db ---------------------------

const startDb = (db: Db | null) => {
  if (db === null) {
    notice("todo-notice", "Sign in on claude.ai to keep TODOs.");
    byId("add-form").hidden = true;
  } else {
    state.db = db;
    db.collection("todos")
      .orderBy("createdAt")
      .onSnapshot((snap) => {
        state.todos = snap.docs.map((d) => ({
          id: d.id,
          ...todoSchema.parse(d.data()),
        }));
        render();
      }, dbFailed);
    db.collection("dismissed").onSnapshot((snap) => {
      state.dismissed = Object.fromEntries(
        snap.docs.map((d) => [d.id, dismissedSchema.parse(d.data()).ask]),
      );
      render();
    }, dbFailed);
  }
};

const dbFailed = (error: DbError) =>
  notice("todo-notice", `Couldn't sync TODOs: ${error.message}`);

const requireDb = (): Db => {
  if (state.db === undefined) {
    throw new Error("TODO storage isn't ready");
  } else {
    return state.db;
  }
};

const onAddTodo = (e: Event) => {
  e.preventDefault();
  const input = byId("add-input");
  if (input instanceof HTMLInputElement && input.value.trim() !== "") {
    const text = input.value.trim();
    input.value = "";
    requireDb()
      .collection("todos")
      .add({ createdAt: Date.now(), done: false, text })
      .catch(dbFailed);
  }
};

const setDone = (t: Todo, done: boolean) => {
  requireDb().doc(`todos/${t.id}`).update({ done }).catch(dbFailed);
};

const removeTodo = (t: Todo) => {
  requireDb().doc(`todos/${t.id}`).delete().catch(dbFailed);
};

const clearDone = async () => {
  for (const t of state.todos.filter((x) => x.done)) {
    await requireDb().doc(`todos/${t.id}`).delete().catch(dbFailed);
  }
};

const dismiss = (s: Session) => {
  if (s.ask !== undefined) {
    state.dismissed = { ...state.dismissed, [s.id]: s.ask };
    render();
    requireDb()
      .doc(`dismissed/${s.id}`)
      .set({ ask: s.ask, at: Date.now() })
      .catch(dbFailed);
  }
};

// ---- DOM ------------------------------------------------------------------

type Attrs = Record<
  string,
  string | boolean | ((e: Event) => unknown) | undefined
>;

const el = (
  tag: string,
  attrs: Attrs,
  ...children: (Node | string | undefined)[]
): HTMLElement => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === "function") {
      node.addEventListener(key.slice(2), value);
    } else if (value === true) {
      node.setAttribute(key, "");
    } else if (typeof value === "string") {
      node.setAttribute(key, value);
    }
  }
  node.append(...children.filter((c) => c !== undefined));
  return node;
};

const byId = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (node === null) {
    throw new Error(`missing #${id}`);
  } else {
    return node;
  }
};

main();
