## 1. The Global Context & API Layer

The fundamental layer handles authentication state and batched network requests.

### `SessionContext` (`@/components/api/session.tsx`)
Provides the global user session state. It wraps the application and exposes `useSession()` to query authentication status, user privileges, and the active nation profile without explicitly triggering refetches.

### `EndpointWrapper` (`@/components/api/bulkwrapper.tsx`)
The primary UI boundary for fetching endpoint data. It abstracts `Suspense` and error boundaries natively.
- **Batching**: Network calls are automatically pooled by the underlying `BulkQueryClient` instances to prevent request spam.
- **Deep Memoization**: It internally implements structural equality checks (similar to `useDeepMemo`) on arguments to map to stable TanStack Query keys.

```tsx
<EndpointWrapper endpoint={endpoints.UNREAD_COUNT} args={{}}>
  {({ data, reload }) => <div>Unread messages: {data.value}</div>}
</EndpointWrapper>
```

---

## 2. The Command Framework

The true powerhouse of the application is the `CommandMap` (`@/utils/Command.ts`), exposed globally as `CM`. It parses back-end route maps to produce strictly-typed command objects.

### Translating API Routes to Commands
Instead of handwriting fetch functions, you reference the hierarchical path from `CM` (e.g., `["admin", "user", "promote"]`). The client already knows every argument, its type, its strict validation bounds (min/max/choices), and necessary permissions.

### `CommandActionButton` (`@/components/cmd/CommandActionButton.tsx`)
A declarative button that encapsulates the execution of a Command. 
- It prevents execution if the user lacks permissions natively.
- Handles loading spinners within its UI.
- Displays comprehensive result modal dialogs tracking exact server output.

```tsx
<CommandActionButton 
    command={["conflict", "alliance", "add"]} 
    args={{ conflict: "12" }}
    label="Add Alliance" 
/>
```

### Argument Inputs & Renderers (`@/components/cmd/*`)
The application defines dozens of domain-specific input primitives that automatically resolve based on the back-end argument type. 
- **`ArgInput`**: The wrapper component that dynamically resolves to the correct widget.
- **Primitives**: `TextInput`, `NumberInput`, `BooleanInput`, `StringInput`, `ColorInput`, `TimeInput`
- **Complex Navigators**: `MapInput` (for coordinate picking), `MmrDoubleInput`, `TriStateInput`, `QueryComponent`, `ListComponent`.

### `CmdList` & `CommandComponent`
For meta-interfaces (like searching for admin commands), `CmdList` renders a highly performant `virtuoso` table of commands, employing custom edit distance calculations for fuzzy searching. `CommandComponent` renders a command's interactive description and form natively without mapping inputs by hand.

---

## 3. Form Synthesis

When you need an entire HTML form interface rather than just an action button, leverage the API Form builders.

### `ApiFormInputs` (`@/components/api/apiform.tsx`)
Using `CommonEndpoint` definitions mapped from the backend, this component yields a self-contained form surface. It parses the endpoint parameters, retrieves the equivalent `Command` arguments, and constructs the DOM elements.

```tsx
<ApiFormInputs
    endpoint={endpoints.WITHDRAW}
    label="Withdraw Funds"
    default_values={{ receiver: '7' }}
    showArguments={['amount', 'note']}
    includeDefaultArguments={false}
    handle_response={onSuccess}
/>
```

---

## 4. Placeholders & Abstract Data Tables

For massive paginated data lists, the client utilizes a "Placeholder" concept (`CM.placeholders`) to stream flattened data structs.

### Building Column Defs with `PlaceholderObjectBuilder`
The table needs instructions on what data to pull. You bind frontend aliases to backend command getters.

```tsx
const builder = CM.placeholders("Conflict")
    .aliased()
    .add({ cmd: "getid", alias: "ID" })
    .add({ cmd: "getname", alias: "Name" })
    .add({ cmd: "getactivewars", alias: "Active Wars" });

// Yields format understood by StaticTable
const aliasedColumns = builder.aliasedArray(); 
```

### Table Variations (`@/pages/custom_table/`)
The table system uses a unified composition hierarchy:

- **`DataTable`**: The lowest-level virtualized grid layer.
- **`AbstractTable`**: Intermediary component that marries TanStack Table APIs with backend pagination models.
- **`StaticTable`**: For explicitly defined component trees. Pass it a `type`, static `columns`, and custom UI overrides (`clientColumns`, `indexCellRenderer`).
- **`TablePage`**: For fully generic rendering. It reads `DEFAULT_TABS` configurations, intercepts URL parameters (sort, selection, columns) natively via `table_util.ts`, and swaps table structures.

---

## 5. Table Actions & Data Selections

Complex data grids often require bulk operations spanning multiple paginated rows.

### Tracking State (`useIdSelection.ts`)
Hooks into table rows to manage a `Set` of selected IDs. Supports cross-rendering tracking and shift-click bounding box selection automatically. 

### Defining Actions (`TableCommandAction`)
Actions are distinct domain data models. You define arrays of `TableCommandAction` to dictate the button toolbar behavior. The framework resolves permission gating (`canRunAction`), prompts multi-step dialogs (`CommandActionDialogContent`), and synthesizes the exact API parameters (`buildArgs`).

```tsx
const actions: TableCommandAction<ConflictRow, number>[] = [
    {
        id: "sync-selected",
        label: "Bulk sync",
        command: ["conflict", "sync", "website"],
        scope: "bulk",
        permission: ["conflict", "sync", "website"],
        requiresSelection: true,
        buildArgs: ({ selectedIds }) => ({ conflicts: Array.from(selectedIds).join(",") })
    }
];

// Mounts above your AbstractTable
<BulkActionsToolbar
    actions={actions}
    selectedIds={selected.selectedIds}
    canRunAction={(action) => Boolean(usePermission(action.permission).success)}
/>
```

