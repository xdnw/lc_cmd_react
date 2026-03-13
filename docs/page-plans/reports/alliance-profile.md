# Alliance Profile

- Status: `Evolve`
- Primary route: `/reports/alliances/:alliance`
- Legacy aliases: `/alliance/:alliance`
- Nav group: Reports
- Primary users: analysts, FA, milcom, econ, and members researching alliances
- Current references: `src/pages/a2/alliance/alliance.tsx`

## Why It Exists

- The current alliance page is already a strong bridge between static data, commands, and graphs.
- It should become the canonical place to inspect an alliance and branch into related workflows.

## Workflows

- Primary: inspect alliance identity, growth, revenue, stockpile estimate, gray / raidability, militarization, and treaty context.
- Secondary: jump into member tables, taxability views, conflict context, or related graphs and commands.
- Why users arrive here: target research, public analysis, alliance comparisons, guild setup or offshore context.

## Layout and Look

- Keep an information-rich profile layout rather than turning it into a giant hero page.
- Top: identity, quick links, action pills.
- Main sections: stats, graphs, expandable detail rows, related tables, treaty / conflict context.
- Allow drawers or expandable panels for deeper detail without constant page jumps.

## Information and Interactions

- Show identity, links, creation date, color, rank, score, member counts, stockpile estimate, revenue, cost, gray counts, and raidability context.
- Keep expandable blocks for related commands and graphs.
- Add clearer outbound links into member tables, tax pages, conflicts, and war views.

## Components

- Existing shared: `ViewCommand`, `StaticViewGraph`, `EndpointWrapper`, `ExpandableTableRow`, `LazyExpander`, table and renderer helpers.
- New shared or page-specific: `AllianceActionPills`, `AllianceSectionNav`, `RelatedReportLinks`.

## Data and Endpoints

- Existing endpoints: `TABLE`, `ALLIANCESTATS`, `ALLIANCEMETRICAB`, `METRIC_COMPARE_BY_TURN`, `COMPARETIERSTATS`, `MILITARIZATIONTIME`, `CURRENT_TREATIES`, `TREATY_CHANGES`, `LIST_COALITIONS`.
- Existing table / graph / placeholder substrate: already very strong for MVP.
- New endpoints likely needed: none required immediately; a composite alliance summary endpoint could simplify page load later.

## Command Bindings

- Existing commands: `alliance revenue`, `alliance cost`, `alliance stockpile`, `alliance stats *`, `alliance treaty *`, related trade and war statistic commands already surfaced via `ViewCommand`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: read-only command cards can render inline; mutating alliance actions should stay clearly separated and permission-gated.

## Navigation

- Links to: `/reports/tables`, `/reports/graphs`, `/reports/conflicts`, `/economy/tax`, `/war/targets`.
- Linked from: conflict rows, table workbench, war and analysis flows, command launcher.

## Permissions and Context

- Most views can remain public.
- Guild-scoped action pills should only appear when the current guild and permissions make them relevant.

## Risks and Open Questions

- Do not let the page become only a pile of embedded command output.
- Need to decide how much treaty and coalition context belongs inline versus in expandable sections.
- The bridge into guild-scoped actions must be explicit without making the page feel private-only.
