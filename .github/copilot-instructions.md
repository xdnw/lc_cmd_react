Using react 19, ts, tailwind, shadcn/ui
Make sure to write clean, extensible, componentized code, and find opportunities for code reuse with shared utils/components etc. instead of reimplementing things.

EndpointWrapper | @/components/api/bulkwrapper | PUBLIC | Default export: EndpointWrapper<T,A,B> - props: endpoint, args, handle_error?, batch_wait_ms?, isPostOverride?, children({data,reload,isRefetching})
useDeepMemo | @/components/api/bulkwrapper | PUBLIC | useDeepMemo(value) - deep-compare memo for deps
BulkQueryClient / fetchBulk / fetchSingle / QueryResult | @/lib/BulkQuery.ts | PUBLIC | Batched API client + types — `fetchBulk` = deduped/batched requests with optional caching; `fetchSingle` = direct POST; exports `bulkQueryClient` singleton and `QueryResult<T>` (endpoint, query, update_ms, cache, data, error).
ApiEndpoint / CommonEndpoint | @/lib/BulkQuery.ts & @/lib/endpoints.ts | PUBLIC | `ApiEndpoint<T>` describes server endpoint metadata (name, url, args, isPost, cache settings). `src/lib/endpoints.ts` exports `CommonEndpoint` constants (e.g. `QUERY`, `SESSION`) used across the UI.
bulkQueryOptions / suspenseQueryOptions / singleQueryOptions | @/lib/queries.ts | PUBLIC | TanStack Query option factories — prefer `bulkQueryOptions(endpoint, query)` in components; wraps `fetchBulk` and sets refetch/staleTime/retry using `endpoint.isPost`.
endpoints.ts (registry) | @/lib/endpoints.ts | PUBLIC | Central list of server endpoints and metadata; use these `CommonEndpoint` constants with `bulkQueryOptions` or `ApiEndpoint.call`.
ApiFormInputs | @/components/api/apiform | PUBLIC | High-level form for CommonEndpoint; handle_response + children for result UI
ApiForm / ApiFormHandler | @/components/api/apiform | PUBLIC | Low-level handlers; prefer ApiFormInputs unless customizing submit flow
withAsyncData | @/components/api/Wrapped | PUBLIC | HOC: withAsyncData(Component, asyncFn, transform)
SessionProvider / useSession | @/components/api/SessionContext | PUBLIC | App auth/session context
DialogProvider / useDialog | @/components/layout/DialogContext | PUBLIC | Global dialog helper: showDialog(title, message)
CommandComponent | @/components/cmd/CommandComponent | PUBLIC | Renders command UIs; use when showing commands and arg forms
CommandActionButton | @/components/cmd/CommandActionButton | PUBLIC | Small action button for running/previewing commands.
CmdList | @/components/cmd/CmdList | PUBLIC | List commands by metadata
ArgInput, TextInput, NumberInput, TypedInput, ListComponent, QueryComponent, MmrInput, TriStateInput, TimeInput, MapInput, ColorInput | @/components/cmd/* | PUBLIC | Input primitives driven by command metadata; prefer via ArgInput when possible
ArgDescComponent | @/components/cmd/CommandComponent | PUBLIC | Small helper to display arg description and examples
Button, Input, Textarea, Label, Card, Badge, Tabs, Progress, Pagination | @/components/ui/* | PUBLIC | UI primitives for consistent styling across the app
Loading (+ variants) | @/components/ui/loading | PUBLIC | Use in buttons and loading states
MarkupRenderer, renderers.tsx | @/components/ui/MarkupRenderer, @/components/ui/renderers | PUBLIC | Render markdown/HTML/embeds and column renderers (time, money, percent, json)
CopyToClipboard, LazyTooltip, LazyIcon, LazyExpander | @/components/ui/* | PUBLIC | Small UX helpers
Timestamp, Color | @/components/ui/timestamp, @/components/renderer/Color | PUBLIC | Small render helpers
ReactSelect / MenuList / Option wrappers | @/components/select/* | INTERNAL