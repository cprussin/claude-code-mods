# AGENTS

Index of context files for this repo. claude-code-mods is a bun / turbo / biome
TypeScript monorepo of custom Claude Code mods: plugins built on Claude Code's
function hooks. Each mod is one package in `packages/*`. Each entry below is
tagged with an authority level so its weight is unambiguous.

## Authority levels

- **ALWAYS** — load and read in full before any work. No exceptions for size,
  urgency, familiarity, or "trivial" edits. Skipping an ALWAYS doc is a
  protocol violation, not a judgment call.
- **IF TOUCHED** — required when your change touches the topic. The decision
  is "does my change touch the topic," not "do I feel like reading this." If
  touched, load in full.
- **REFERENCE** — look up as needed during the work; not a prerequisite to
  start.

If a doc's own wording disagrees with these labels, the labels here win —
update the doc.

## American English (everywhere)

Every word in this repo is spelled the American way, never the British one —
prose, comments, identifiers, test names, commit messages and filenames alike.
`color`, `center`, `behavior`, `honored`, `labeled`, `initialized`,
`organize`, `analyze`, `gray`. You read this tree before you write in it, so
whichever spelling is in it is the spelling that comes back out, and a tree
holding both teaches both.

`scripts/test-american-english.sh` enforces it, in the `shell` group of
`./scripts/check.sh`. The vendored Claude Code types are exempt: they are
Anthropic's words, not ours.

## Post-edit audit (non-negotiable)

After finishing edits — and before declaring a change done or opening a
PR — re-load the guideline docs that apply to what you just changed and walk
the actual diff against each rule. This is a protocol step, not a judgment
call. "Lint and tests passed" is not a substitute: many style rules are not
lint-enforced.

**This audit runs on EVERY code change, not just the first.** Every later
change — addressing review feedback, fixing CI, a follow-up tweak, a one-line
amendment — requires you to redo the "which docs apply" determination from
scratch for *that* change and re-check it against them.

To decide *which* docs apply, re-read the authority labels below with your
diff in hand:

- Every **ALWAYS** doc is in scope.
- Every **IF TOUCHED** doc whose topic your change actually touches is in
  scope. Be honest about "touched": if you added or modified any `if`/`else`,
  you touched control flow; if you added a parameter for testability, you
  touched testing's dependency-injection rules; etc.
- Any per-package addenda (`{package}/docs/AGENTS.md`) for packages you
  modified are in scope.

Walk each rule in scope against your actual diff. Memory is not a substitute
for re-reading.

## PR description requirement

Every PR description MUST include an explicit "Guidelines audited" line
listing the docs reviewed and confirming the change complies. Example:

> **Guidelines audited:** `docs/guidelines/CONTROL_FLOW.md`,
> `docs/guidelines/ERRORS.md`, `docs/guidelines/TESTING.md`. Change complies
> with all rules.

If a rule deserves a note (intentional deviation, ambiguous case, etc.), call
it out below the line. A PR without this line is incomplete.

## ALWAYS (every change, no exceptions)

| Doc | Covers |
|---|---|
| [/docs/guidelines/TESTING.md](/docs/guidelines/TESTING.md) | **TDD is mandatory.** Failing test first, then the minimum production code to make it pass. Parsimonious coverage, unit over integration, dependency injection over mocking, never widen exports for tests, warnings are failures. |
| [/docs/guidelines/ERRORS.md](/docs/guidelines/ERRORS.md) | **Code offensively** (PR-blocker): no defensive guards, no catch-and-swallow, no silent fallbacks; throw or return a `Result`. Promise error handling (never `void promise()`). |
| [/docs/guidelines/CONTROL_FLOW.md](/docs/guidelines/CONTROL_FLOW.md) | `undefined` over `null`, explicit `undefined` checks, curly braces always, explicit control flow, ternaries, no unnecessary `let`, `switch` over `if`/`else if`. |
| [/docs/guidelines/FUNCTIONS.md](/docs/guidelines/FUNCTIONS.md) | Functional/immutable/declarative defaults, arrow syntax, docstrings, manual loops over generators. |
| [/docs/guidelines/FILES.md](/docs/guidelines/FILES.md) | File/directory organization: top-to-bottom reading order, import from defining modules, no grab-bag names, prefer module-scoped functions. |

## IF TOUCHED (load when your change touches the topic)

| Doc | Load when |
|---|---|
| [/docs/guidelines/MODS.md](/docs/guidelines/MODS.md) | You add or modify a mod package. Package layout, the vendored `claude-code` types, and testing with `claude plugin test`. |
| [/docs/guidelines/DATA.md](/docs/guidelines/DATA.md) | You read external data — `JSON.parse`, files, env vars, API responses. Never `as`-cast; parse with Zod. Versioning rules for contracts that cross deploy units. |
| [/docs/guidelines/DISCRIMINATED_UNIONS.md](/docs/guidelines/DISCRIMINATED_UNIONS.md) | You define or modify a discriminated union. Enum discriminant + PascalCase constructor object + type derived via `ReturnType`; map to wire strings in an explicit serializer/deserializer (Zod codec) at the boundary. |
| [/docs/guidelines/OPTION_RESULT.md](/docs/guidelines/OPTION_RESULT.md) | You design or modify a fallible API or a parser. When to return `Result<T, E>` / `Option<T>` from `@cprussin/option-result` instead of throwing or returning `undefined`, and how to work with them. |
| [/docs/guidelines/DESIGN_DOCS.md](/docs/guidelines/DESIGN_DOCS.md) | You author or modify a design doc in /docs/architecture/. Lead with the answer, show don't describe, decisions not musings, cut filler and RFC ceremony. |

## REFERENCE

| Doc | Covers |
|---|---|
| [/docs/guidelines/WORKSPACE.md](/docs/guidelines/WORKSPACE.md) | Tools (bun, turbo, biome), workspace layout, package READMEs, dependency policy, and the required-checks workflow you run before a PR. |

## Architecture & design docs

Design docs live in [`/docs/architecture/`](/docs/architecture/) and are
**not** guidelines — they carry no authority level and impose no rules. List
each one here as it is added.

## Checking your work

```sh
./scripts/check.sh                 # everything
./scripts/check.sh typescript      # or one group: shell, typescript
```

It installs dependencies, then runs `biome`, `turbo test` (typecheck,
`claude plugin test`, `claude plugin validate`) and every `scripts/test-*.sh`.
CI runs the same script.

**Read a `skipped` line as loudly as a failure.** A script that cannot run
exits **77** and prints `SKIP: <why>`; that is never evidence the thing works.
CI sets `CHECK_STRICT=1`, where a skip is a failure.

## Per-package addenda

When working on any package in `/packages/`, you MUST check for and load
package-specific agent instructions in `{package}/docs/AGENTS.md`, if such a
file exists. These augment — never weaken — the root docs. On conflict,
package rules win. They are addenda-only: they do not relist root rules.

DO NOT proceed with any changes until the relevant files are loaded and
understood.
