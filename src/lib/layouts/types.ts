import { COMMANDS } from '@/lib/commands';
import { LayoutRendererId } from '@/lib/layoutRenderers';
import { OrderIdx } from '@/pages/custom_table/DataTable';

export interface LayoutVariableDefinition {
    defaultValue: string;
    label?: string;
    desc?: string;
}

export interface LayoutVariableInputSchema {
    argType: string;
    min?: number;
    max?: number;
    desc?: string;
    choices?: string[];
}

export interface LayoutConfigSchema {
    variables: Record<string, LayoutVariableDefinition>;
    variableInputs: Record<string, LayoutVariableInputSchema>;
}

export interface Columns {
    value: (string | [string, string])[];
    sort: OrderIdx | OrderIdx[];
    config?: LayoutConfigSchema;
    columnRenderers?: Record<string, LayoutRendererId>;
}

export interface TabDefault {
    selections: { [key: string]: string };
    columns: { [key: string]: Columns };
}

export type PlaceholderTypeName = keyof typeof COMMANDS.placeholders;

export type PlaceholderCommandName<T extends PlaceholderTypeName> = Extract<
    keyof typeof COMMANDS.placeholders[T]['commands'],
    string
>;

export type PlaceholderCommandReturnPlaceholder<
    T extends PlaceholderTypeName,
    C extends PlaceholderCommandName<T>
> = Extract<
    (typeof COMMANDS.placeholders[T]['commands'][C] extends { return_type?: infer R } ? R : never),
    PlaceholderTypeName
>;

export type PlaceholderCommandArgs<
    T extends PlaceholderTypeName,
    C extends PlaceholderCommandName<T>
> = typeof COMMANDS.placeholders[T]['commands'][C] extends { arguments: infer A }
    ? { [K in keyof A]?: string }
    : never;

export type LayoutVarRef<V extends string = string> = {
    kind: 'layout-var';
    name: V;
};

export function layoutVar<V extends string>(name: V): LayoutVarRef<V> {
    return { kind: 'layout-var', name };
}

export type LayoutArgValue = string | LayoutVarRef;

export type LayoutRawUsage<V extends string> = {
    variable: V;
    command: string;
    argName: string;
    commandType?: PlaceholderTypeName;
};

export type LayoutRawSegment<V extends string> = string | LayoutVarRef<V>;

export type LayoutRawTemplate<V extends string> = {
    kind: 'raw-template';
    segments: LayoutRawSegment<V>[];
    usages: LayoutRawUsage<V>[];
};

export type PlaceholderCommandArgsWithVars<
    T extends PlaceholderTypeName,
    C extends PlaceholderCommandName<T>,
    V extends string
> = PlaceholderCommandArgs<T, C> extends never
    ? never
    : {
        [K in keyof PlaceholderCommandArgs<T, C>]?: string | LayoutVarRef<V>;
    };

export type ConfigurableColumnCommandSpec<T extends PlaceholderTypeName> = {
    kind: 'command';
    cmd: PlaceholderCommandName<T>;
    args?: Record<string, LayoutArgValue>;
    alias?: string;
    renderer?: LayoutRendererId;
};

export type ConfigurableColumnRawSpec<V extends string> = {
    kind: 'raw';
    placeholder: string | LayoutRawTemplate<V>;
    alias?: string;
    renderer?: LayoutRendererId;
};

export type ConfigurableColumnSpec<T extends PlaceholderTypeName, V extends string> = {
    variables: Record<V, LayoutVariableDefinition>;
    entries: Array<ConfigurableColumnCommandSpec<T> | ConfigurableColumnRawSpec<V>>;
    sort: OrderIdx | OrderIdx[];
    shorten?: boolean;
};

export function isLayoutVarRef(value: string | LayoutVarRef): value is LayoutVarRef {
    return typeof value === 'object' && value != null && value.kind === 'layout-var';
}
