# claude-code-mods

Custom [Claude Code](https://claude.com/claude-code) mods: plugins built on
Claude Code's function hooks. One mod per package in [`packages/`](packages).

| Mod | What it does |
|---|---|
| [protect-env-files](packages/protect-env-files) | Sample: denies edits to `.env` files |

## Use a mod

```sh
claude --plugin-dir packages/<mod>
```

## Develop

```sh
bun install
bun run turbo test -- --ui stream
```

See [AGENTS.md](AGENTS.md) for the guidelines and
[WORKSPACE.md](docs/guidelines/WORKSPACE.md) for tooling.

## License

[MIT](LICENSE).
