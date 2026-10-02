# Mods

How a mod package is laid out, typed and tested. A mod is a Claude Code plugin
whose behavior lives in a function-hooks module.

## Layout

```
packages/<mod-name>/
  .claude-plugin/plugin.json   name, version, description, author
  hooks/hooks.json             { "modules": ["./register.ts"] }
  hooks/register.ts            export const register: Register = (on) => { ... }
  tests/*.test.ts              run by `claude plugin test`
  package.json                 @claude-code-mods/<mod-name>, private
  tsconfig.json
  README.md
```

- The package directory **is** the plugin: `claude --plugin-dir
  packages/<mod-name>` loads it.
- `plugin.json`'s `name` matches the directory name.
- Copy `package.json`'s scripts and `tsconfig.json` from
  `packages/protect-env-files`.

## Runtime

A hooks module runs in an environment of its own: **no DOM, no Node**, no
`require`, no `import()`. Everything outside the module is reached through
`$`. Don't import npm packages that assume Node or a browser.

## Types

`'claude-code'` and `'claude-code/testing'` are declared by
`@claude-code-mods/claude-code-types`, a vendored copy of the declarations the
engine writes. A mod's `tsconfig.json` names it in `types`.

To refresh it after bumping `@anthropic-ai/claude-code`: load any mod in a
session (hot reload or `claude --plugin-dir`), then copy
`<mod>/.claude-plugin/types/claude-code/index.d.ts` over
`packages/claude-code-types/index.d.ts`. Never edit the file by hand.

## Testing

[TESTING.md](./TESTING.md) applies in full; TDD is mandatory.

- Test through the engine with `claude plugin test` and
  `claude-code/testing`: `test(name, async ($, on) => { ... })`.
- Function hooks are early access: `test:unit` sets
  `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`, without which `claude plugin test`
  refuses to run.
- `on(...)` in a test stands in for the engine beneath the mod. Answer every
  event the mod passes on with `next(e)`, or the test fails on "no
  implementation", not on the behavior you meant to test.
- Assert on what the mod returns (`{ deny }`, a rewritten input, a result),
  not on how it got there.
- `claude plugin validate` must pass **without warnings**.
