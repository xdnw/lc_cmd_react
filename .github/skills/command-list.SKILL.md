Skill: Command and placeholder listing - use the npm scripts `list-commands`, `command-args`, `list-placeholders`, `placeholder-args`, and `list-placeholder-types`

Purpose
- summary of available commands and their arguments for developer use.

What this skill does
- Run the built-in npm scripts defined in `package.json`:
  - `npm run list-commands` - prints a compact table (PATH | DESC | ARGS). Supports `--placeholders`, `--recursive`/`-r`, `--keyword`/`-k`, `keyword=<regex>`, and optional path segments.
  - `npm run command-args` — prints argument details for a specific command. Usage: `npm run command-args -- <path...>`; supports `--placeholders`.
  - `npm run list-placeholders` - prints placeholder commands for one placeholder type. Usage: `npm run list-placeholders -- <type> [--keyword <regex>]` or `npm run list-placeholders -- <type> <regex>`.
  - `npm run placeholder-args` - prints argument details for one placeholder command. Usage: `npm run placeholder-args -- <type> <path...>`.
  - `npm run list-placeholder-types` - lists placeholder types (and simple aliases) that `list-placeholders` / `placeholder-args` accept.

When to use
- Need a short summary of commands/placeholders or the argument list for a specific command/placeholder.

Usage examples
- `npm run list-commands` — show top-level commands
- `npm run list-commands -- conflict edit` — show subcommands under `conflict edit`
- `npm run list-commands -- --placeholders` — include placeholder commands
- `npm run list-commands -- "keyword=conflict|war"` - filter by regex against command path and description
- `npm run list-commands -- -- --keyword "conflict|war"` - alternate form when passing explicit flags through npm
- `npm run command-args -- conflict edit wiki` — show args for `conflict edit wiki`
- `npm run command-args -- --placeholders conflict edit wiki` — include placeholder args
- `npm run list-placeholders -- DBNation "score|alliance"` - filter a placeholder type by regex against path and description
- `npm run placeholder-args -- DBNation getscore` - show args for `DBNation getscore`

Notes / constraints
- Dev convenience only — avoid pasting full `COMMANDS` JSON into chat.
- Use these scripts for quick lookups, tooling, and completion helpers.
- Lookups are case-insensitive for command paths, placeholder paths, placeholder types, and keyword matching.
- In PowerShell, quote regex values containing `|` so they are not treated as pipelines.
