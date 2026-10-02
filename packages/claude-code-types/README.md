# claude-code-types

Vendored TypeScript declarations for Claude Code's function-hooks API: the
`'claude-code'` module (`Register`, events, `$`) and `'claude-code/testing'`
(the kit `claude plugin test` runs). The engine writes these; they ship with no
npm package.

## Use

In a mod's `tsconfig.json`:

```json
{ "compilerOptions": { "types": ["@claude-code-mods/claude-code-types"] } }
```

## Refresh

See [MODS.md](../../docs/guidelines/MODS.md#types). The first line of
`index.d.ts` names the Claude Code version that wrote it. Never edit by hand.
