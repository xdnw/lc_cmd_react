# Obsolete Frontend Plan

This file is retained only so older links do not break.

The authoritative planning docs now live under `docs/page-plans/`.

Use these files instead:

- `docs/page-plans/README.md`: canonical navigation labels, file index, and delivery order
- `docs/page-plans/core/workflow-map.md`: real user journeys and page hand-offs
- `docs/page-plans/core/context-and-scoping.md`: guild, alliance, and nation scope rules
- `docs/page-plans/server/setup.md`: first-run and recovery setup workflow
- `docs/page-plans/economy/deposits.md`: offshore, escrow, expiry, and deposit investigation workflow

Implementation rules that supersede older revisions of this file:

- Visible navigation uses the user-facing labels `Home`, `Economy`, `War`, `Members`, `Server`, `Reports`, and `Commands`.
- `docs/page-plans/*` is the source of truth whenever it disagrees with historical planning text.
- Legacy routes stay working as aliases, redirects, or advanced-entry routes.
- The command browser and command runner remain first-class fallback surfaces.

Do not implement from earlier route taxonomies or abstract section labels that conflict with the current page-plan set.
