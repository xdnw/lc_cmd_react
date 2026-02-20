Skill: Command listing — use the npm scripts `list-commands` and `command-args`

Purpose
- summary of available commands and their arguments for developer use.

What this skill does
- Run the built-in npm scripts defined in `package.json`:
  - `npm run list-commands` — prints a compact table (PATH | DESC | ARGS). Supports `--placeholders`, `--recursive`/`-r`, and optional path segments.
  - `npm run command-args` — prints argument details for a specific command. Usage: `npm run command-args -- <path...>`; supports `--placeholders`.

When to use
- Need a short summary of commands or the argument list for a specific command.

Usage examples
- `npm run list-commands` — show top-level commands
- `npm run list-commands -- conflict edit` — show subcommands under `conflict edit`
- `npm run list-commands -- --placeholders` — include placeholder commands
- `npm run command-args -- conflict edit wiki` — show args for `conflict edit wiki`
- `npm run command-args -- --placeholders conflict edit wiki` — include placeholder args

Notes / constraints
- Dev convenience only — avoid pasting full `COMMANDS` JSON into chat.
- Use these scripts for quick lookups, tooling, and completion helpers.
