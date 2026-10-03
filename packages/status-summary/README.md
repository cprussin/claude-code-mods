# status-summary

The **Status Summary** page: a claude.ai Artifact showing what needs you
across all your Claude Code sessions. It works anywhere claude.ai does (web,
desktop app).

Live: <https://claude.ai/artifact/YJ4Y5uFDQBrLMpKsoE4VzW> (private to its
owner).

## What it shows

- **Needs you**
  - Asks from active sessions: each session's end-of-turn `needs_action`
    (secrets to add, deploys, accounts, plan approvals, ...). "Done" hides
    an ask until that session asks something new.
  - Your own TODOs (add, check off, delete).
- **Sessions**: non-archived sessions grouped as waiting on you, running,
  ready for review, failed, or idle, with links, repo/branch and status.

## How it works

No mod or install: the page reads your sessions itself.

- Sessions: the `mcp` capability calls the built-in `Claude Code Remote`
  connector's `list_sessions` (your 100 most recent), polled every 30s.
- TODOs and dismissed asks: the `db` capability (`todos/*`, `dismissed/*`),
  readable and writable by the owner only.

| File | Role |
|---|---|
| `index.html` | Markup and styles; loads `page.js` |
| `src/page.ts` | DOM glue and the runtime capabilities |
| `src/sessions.ts` | Parses `list_sessions` (Zod) into sessions with a status and ask |
| `src/asks.ts` | Which asks are still open |
| `src/relative-time.ts` | "5m ago" labels |
| `src/artifact-runtime.d.ts` | The slice of `window.claude` the page uses |

Depends on `zod` (bundled into `page.js`).

## Build and publish

```sh
bun run turbo build --filter @claude-code-mods/status-summary
```

Writes `dist/index.html` and `dist/page.js`. Publish with Claude's Artifact
tool to the URL above: `file_path` `dist/index.html`, `files`
`{"page.js": "dist/page.js"}`. Capabilities carry over between publishes;
for a fresh artifact declare:

```json
{
  "db": { "rules": [{ "path": "", "read": "owner", "write": "owner" }] },
  "mcp": { "servers": [{ "server": "Claude Code Remote", "tools": ["list_sessions"] }] }
}
```

## Test

```sh
bun run turbo test --filter @claude-code-mods/status-summary
```

Runs `tsc` and `bun test` (`tests/`).
