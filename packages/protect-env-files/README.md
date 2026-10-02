# protect-env-files

Sample mod. Denies `Edit` tool calls on `.env` files (`.env`, `.env.local`,
...), so secrets are never rewritten by the model.

## Use

```sh
claude --plugin-dir packages/protect-env-files
```

## How it works

`hooks/register.ts` hooks `tool.call` for `Edit`: a protected path answers
`{ deny }`; anything else goes on with `next(e)`.

## Test

```sh
bun run turbo test --filter @claude-code-mods/protect-env-files
```

Runs `tsc`, `claude plugin test` (`tests/`) and `claude plugin validate`.
