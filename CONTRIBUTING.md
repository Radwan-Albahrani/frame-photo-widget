# Contributing to Frame

Thanks for stopping by. Bug fixes, new ideas, docs, tests and polish are all welcome.

Frame is pretty much feature complete, so the most useful contributions are usually fixes and
improvements. If you want to build something bigger, go for it. Opening an issue first is a good
idea, so nobody spends a weekend on something that clashes with where the app is going.

## The one promise

Frame is free and private, and it stays that way. That means no ads, analytics, tracking, accounts,
network code, purchases or paywalls. Everything else is open for discussion.

## Getting started

Follow [Building from source](README.md#building-from-source), then run:

```bash
bun run hooks:install
```

The hooks check a few things on every commit, so you will find out right away if something is off.

## What the hooks check

- **No comments.** Write code that explains itself. A single `// what: ...` line is allowed for a
  fact the code cannot express, such as a platform bug. Tool directives like `biome-ignore` are
  fine. Longer explanations go in `docs/`.
- **No silent failures.** Do not use an empty `catch {}` or `.catch(() => {})`. When something
  fails, report what failed and enough detail to act on it.
- **Typed commit subjects**, such as `fix(widget): keep the last photo when an album empties`. The
  valid types are `feat` `fix` `perf` `refactor` `docs` `test` `chore` `build` `ci` `style` `revert`.

## Worth knowing before you dive in

- Read [`docs/widgets.md`](docs/widgets.md) before you change anything related to widgets. iOS
  kills the widget extension above 30 MB of memory, and most of the widget design follows from
  that limit.
- Read [`docs/native-ui.md`](docs/native-ui.md) before you change a screen. Frame uses real native
  components and is dark only.
- If you change the database schema, read the migrations section of [`CLAUDE.md`](CLAUDE.md) and
  add a test case. Migrations that run in the wrong order have crashed a real release before.

## Pull requests

Run `bun run gates` before you push. Include screenshots for anything visual. Smaller PRs get
reviewed faster.

Found a security issue? Report it privately; see [SECURITY.md](SECURITY.md).

By contributing, you agree that your work is licensed under the [MIT License](LICENSE).
