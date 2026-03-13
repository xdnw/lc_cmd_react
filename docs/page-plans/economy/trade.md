# Trade

- Status: `New`
- Primary route: `/economy/trade`
- Legacy aliases: none; current related work is spread across commands and graph endpoints
- Nav group: Economy
- Primary users: traders, econ staff, members watching the market, alliance finance planners
- Current references: trade graph endpoints in `src/lib/endpoints.ts`, generic graph page in `src/pages/graphs/edit_graph.tsx`

## Why It Exists

- Trade work is partly live market intelligence and partly personal / alliance workflow.
- Existing graph endpoints are already strong, but there is no obvious single place to turn them into an everyday market desk.

## Workflows

- Primary: inspect current prices, margins, volume, and longer-term trends.
- Secondary: review producer and trader rankings, manage alerts, and occasionally create or accept trade actions.
- Why users arrive here: market monitoring, resource planning, flipping, and event-driven econ work.

## Layout and Look

- Top strip with live price cards and change indicators.
- Main tabs: `Market`, `Rankings`, `Profit`, `Alerts`.
- The page should feel like a market board, not a settings page or a generic chart picker.

## Information and Interactions

- Market: current price cards, margin table, price / margin / volume charts by resource and time range.
- Rankings: producers, traders, trade ranking, value comparisons.
- Profit: nation or alliance trade profit and history.
- Alerts: view and manage subscriptions for price, margin, undercut, no-offer, and mistrade alerts.

## Components

- Existing shared: graph components, `ApiFormInputs`, table patterns, chart controls.
- New shared or page-specific: `PriceTickerGrid`, `ResourceFilterStrip`, `TradeRankingTable`, `TradeAlertPanel`, `TradeProfitSummary`.

## Data and Endpoints

- Existing endpoints: `TRADEPRICEBYDAY`, `TRADEPRICEBYDAYJSON`, `TRADEMARGINBYDAY`, `TRADEVOLUMEBYDAY`, `TRADETOTALBYDAY`, `COMPARESTOCKPILEVALUEBYDAY`.
- Existing table / graph / placeholder substrate: graph pages can already render the chart-heavy parts; `DBTrade` may help later if the table workbench is extended into this page.
- New endpoints likely needed: live ranking / profit / subscription list views likely need dedicated read endpoints unless command-backed table responses are added.

## Command Bindings

- Existing commands: `trade price`, `trade margin`, `trade volume`, `trade trending`, `trade average`, `trade profit`, `trade ranking`, `trade findproducer`, `trade findtrader`, `trade create`, `trade accept`, `alerts trade *`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: alert creation and trade-create actions should show the exact trigger or offer before submit.

## Navigation

- Links to: `/reports/graphs`, `/reports/tables`, `/economy/holdings`, relevant alliance profile pages.
- Linked from: home landing cards, economy section nav, command launcher.

## Permissions and Context

- Public market views can be visible without login.
- Personal alerts and trade actions require login and likely a nation context.

## Risks and Open Questions

- Need to decide whether trade belongs under Economy or Reports in the visible nav; Economy is clearer for user intent.
- Ranking and subscription management may stall without better JSON endpoints.
- The live price strip should not require over-fetching every chart endpoint on page load.
