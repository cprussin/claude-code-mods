# Workspace

Tools, layout, dependencies, and the required-checks workflow for this repo.

## Tools

- `bun` is our package manager & runtime when needed
- `turbo` is our monorepo task orchestrator
- `biome` is our linter / formatter
- `claude` (from the `@anthropic-ai/claude-code` dev dependency) validates and
  tests mods

## Layout

Every bun workspace lives in `/packages`:

- **Mods** — one package per mod, named after what it does
  (`protect-env-files`). See [MODS.md](./MODS.md).
- **`claude-code-types`** — the vendored `claude-code` /
  `claude-code/testing` declarations every mod type-checks against.
- **Artifact pages** — claude.ai Artifact pages built from TypeScript
  (`status-summary`): `index.html` plus a `page.js` bundled by `bun build`,
  logic unit-tested with `bun test`.

## Package READMEs

Every package in `/packages/` should have a `README.md`. It should orient a
new contributor: what the package does, why it exists, its dependencies, how
to use it, and how to test it. Be comprehensive but succinct.

Keep the README current as the package evolves. If a change affects the
public API, dependencies, usage, or what the package delivers, update the
README in the same change.

## Dependencies

### `catalog:` for all non-workspace deps

Every non-workspace dependency in any `package.json` MUST use `"catalog:"` as
its version, and every workspace dependency MUST use `"workspace:*"`. The
concrete version belongs in the root `package.json`'s `catalog` block, which
is the single source of truth for third-party versions across the monorepo.

```jsonc
// in a package
"devDependencies": {
  "typescript": "catalog:",
  "@claude-code-mods/claude-code-types": "workspace:*"
}
```

To add a new third-party dependency:

1. Add the package and version to the root `package.json` `catalog` block,
   alphabetically sorted.
2. Reference it as `"catalog:"` in the consuming package's `package.json`.
3. Run `bun install` to refresh `bun.lock`.

Writing a concrete version (e.g. `"zod": "4.4.3"`) directly in a package is
wrong — any non-`workspace:` value other than `"catalog:"` is a defect. If
you find a direct version spec already in the repo, fix it.

### Minimum release age

`bunfig.toml` sets `minimumReleaseAge` so npm versions published in the last
seven days are refused. This is supply-chain hardening: it gives the community
time to flag a malicious release before it reaches an install. If you need a
version that is newer than that, say so explicitly in the PR rather than
lowering the floor.

### Latest versions

Use the latest stable version of any new dependency unless there is a
specific compatibility reason to pin older.

### Approval

Do not introduce a new third-party runtime dependency without confirming with
the developer that this is the intent.

## Required code checks

All code should pass `bun run turbo test -- --ui stream`. This runs linting,
formatting, typechecking, `claude plugin test` and `claude plugin validate`.
If code is failing, first try `bun run turbo fix -- --ui stream` to apply
auto-fixes.

**Run it from the repo root**, and verify the output shows the root-level
tasks (`//#test:lint` and `//#test:dependencies`) and not only the
per-package ones. The root-level `biome check` (run by `//#test:lint`)
enforces formatting, import ordering, and lint rules across the entire
monorepo.

A package's own tasks are reached the same way:
`bun run turbo test --filter @claude-code-mods/protect-env-files`. Note that
`bun run --filter <pkg> test` is *not* the same thing and does not work — no
package declares a `test` script, only `test:types`, `test:unit` and
`test:validate`.
