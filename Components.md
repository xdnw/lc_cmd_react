ApiFormInputs: TODO update to accept an endpoit with types like EndpointWrapper
- Input: Endpoint.displayProps
- Output: Input components, button, and data (children)

useDeepMemo(variable) - memoize const via deep compare

export default function EndpointWrapper(
    readonly endpoint: CommonEndpoint<T, A, B>;
    readonly args: A;
    readonly handle_error?: (error: Error) => void;
    readonly batch_wait_ms?: number;
    readonly isPostOverride?: boolean;
    readonly children: (data: QueryResult<T>) => ReactNode;

How to reference a command name:
CommandPath<typeof COMMANDS.commands>

How to reference a command with arguments:
export function ViewCommand<P extends CommandPath<typeof COMMANDS.commands>>(
    { command, args, className }: {
        command: P,
        args: Partial<CommandArguments<typeof COMMANDS.commands, P>>,

How to use a EndpointWrapper
<EndpointWrapper endpoint={ep} args={args}>
  {({ data, reload, isRefetching }) => (
    <>
      <Button onClick={reload} disabled={isRefetching}>
        Reload
      </Button>
      {/* render with data */}
    </>
  )}
</EndpointWrapper>