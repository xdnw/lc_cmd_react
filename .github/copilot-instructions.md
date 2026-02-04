Using react 19, tailwind, shadcn/ui
EndpointWrapper | @/components/api/bulkwrapper | PUBLIC | Default export: EndpointWrapper<T,A,B> - props: endpoint, args, handle_error?, batch_wait_ms?, isPostOverride?, children({data,reload,isRefetching})
useDeepMemo | @/components/api/bulkwrapper | PUBLIC | useDeepMemo(value) - deep-compare memo for deps
ApiFormInputs | @/components/api/apiform | PUBLIC | High-level form for CommonEndpoint; handle_response + children for result UI
ApiForm / ApiFormHandler | @/components/api/apiform | PUBLIC | Low-level handlers; prefer ApiFormInputs unless customizing submit flow
withAsyncData | @/components/api/Wrapped | PUBLIC | HOC: withAsyncData(Component, asyncFn, transform)
SessionProvider / useSession | @/components/api/SessionContext | PUBLIC | App auth/session context
DialogProvider / useDialog | @/components/layout/DialogContext | PUBLIC | Global dialog helper: showDialog(title, message)
CommandComponent | @/components/cmd/CommandComponent | PUBLIC | Renders command UIs; use when showing commands and arg forms
CmdList | @/components/cmd/CmdList | PUBLIC | List commands by metadata
ArgInput, TextInput, NumberInput, TypedInput, ListComponent, QueryComponent, MmrInput, TriStateInput, TimeInput, MapInput, ColorInput | @/components/cmd/* | PUBLIC | Input primitives driven by command metadata; prefer via ArgInput when possible
ArgDescComponent | @/components/cmd/CommandComponent | PUBLIC | Small helper to display arg description and examples
Button, Input, Textarea, Label, Card, Badge, Tabs, Progress, Pagination | @/components/ui/* | PUBLIC | UI primitives for consistent styling across the app
Loading (+ variants) | @/components/ui/loading | PUBLIC | Use in buttons and loading states
MarkupRenderer, renderers.tsx | @/components/ui/MarkupRenderer, @/components/ui/renderers | PUBLIC | Render markdown/HTML/embeds and column renderers (time, money, percent, json)
CopyToClipboard, LazyTooltip, LazyIcon, LazyExpander | @/components/ui/* | PUBLIC | Small UX helpers
Timestamp, Color | @/components/ui/timestamp, @/components/renderer/Color | PUBLIC | Small render helpers
ReactSelect / MenuList / Option wrappers | @/components/select/* | INTERNAL

