import { COMMANDS } from '@/lib/commands';
import { CM } from '@/utils/Command';
import { LayoutRendererId } from '@/lib/layoutRenderers';
import {
    Columns,
    ConfigurableColumnRawSpec,
    ConfigurableColumnSpec,
    LayoutArgValue,
    LayoutConfigSchema,
    LayoutRawSegment,
    LayoutRawTemplate,
    LayoutRawUsage,
    LayoutVarRef,
    LayoutVariableDefinition,
    LayoutVariableInputSchema,
    PlaceholderCommandArgsWithVars,
    PlaceholderCommandArgs,
    PlaceholderCommandName,
    PlaceholderCommandReturnPlaceholder,
    PlaceholderTypeName,
    TabDefault,
    isLayoutVarRef,
} from './types';

export class LayoutColumnTemplateBuilder<T extends PlaceholderTypeName, V extends string> {
    private readonly placeholderType: T;

    private readonly entries: Array<
        { kind: 'command'; cmd: PlaceholderCommandName<T>; args?: Record<string, LayoutArgValue>; alias?: string; renderer?: LayoutRendererId } |
        ConfigurableColumnRawSpec<V>
    > = [];

    constructor(placeholderType: T) {
        this.placeholderType = placeholderType;
    }

    add<C extends PlaceholderCommandName<T>>(
        command: {
            cmd: C;
            args?: PlaceholderCommandArgsWithVars<T, C, V>;
            alias?: string;
            renderer?: LayoutRendererId;
        }
    ): this {
        this.entries.push({
            kind: 'command',
            cmd: command.cmd,
            args: command.args as Record<string, LayoutArgValue> | undefined,
            alias: command.alias,
            renderer: command.renderer,
        });
        return this;
    }

    addRaw(
        placeholder: string | LayoutRawTemplate<V>,
        alias?: string,
        renderer?: LayoutRendererId
    ): this {
        this.entries.push({
            kind: 'raw',
            placeholder,
            alias,
            renderer,
        });
        return this;
    }

    rawVar(name: V): LayoutVarRef<V> {
        return { kind: 'layout-var', name };
    }

    rawConcat(...parts: Array<string | LayoutVarRef<V> | LayoutRawTemplate<V>>): LayoutRawTemplate<V> {
        const segments: LayoutRawSegment<V>[] = [];
        const usages: LayoutRawUsage<V>[] = [];

        for (const part of parts) {
            if (typeof part === 'string' || (typeof part === 'object' && part.kind === 'layout-var')) {
                segments.push(part);
                continue;
            }

            segments.push(...part.segments);
            usages.push(...part.usages);
        }

        return {
            kind: 'raw-template',
            segments,
            usages,
        };
    }

    rawCommand<C extends PlaceholderCommandName<T>>(
        cmd: C,
        args?: PlaceholderCommandArgsWithVars<T, C, V>
    ): LayoutRawTemplate<V> {
        const segments: LayoutRawSegment<V>[] = [`{${cmd}`];
        const usages: LayoutRawUsage<V>[] = [];
        const entries = args ? Object.entries(args).filter(([, value]) => value != null) : [];

        if (entries.length > 0) {
            segments.push('(');
            entries.forEach(([argName, argValue], index) => {
                if (index > 0) segments.push(' ');
                segments.push(`${argName}: `);
                if (isLayoutVarRef(argValue as string | LayoutVarRef<V>)) {
                    const value = argValue as LayoutVarRef<V>;
                    segments.push(value);
                    usages.push({
                        variable: value.name,
                        command: String(cmd),
                        argName,
                    });
                } else {
                    segments.push(argValue as string);
                }
            });
            segments.push(')');
        }

        segments.push('}');

        return {
            kind: 'raw-template',
            segments,
            usages,
        };
    }

    rawSubCommand<
        C extends PlaceholderCommandName<T>,
        R extends PlaceholderCommandReturnPlaceholder<T, C>,
        SC extends PlaceholderCommandName<R>
    >(
        cmd: C,
        args: PlaceholderCommandArgsWithVars<T, C, V> | undefined,
        subCommand: SC,
        subArgs?: PlaceholderCommandArgs<R, SC>
    ): LayoutRawTemplate<V> {
        const commandMap = COMMANDS.placeholders[this.placeholderType].commands as Record<string, { return_type?: string }>;
        const cmdData = commandMap[String(cmd)];
        const returnType = cmdData.return_type;
        if (!returnType || !(returnType in COMMANDS.placeholders)) {
            throw new Error(
                `Layout config error for ${this.placeholderType}:${String(cmd)} - return_type is missing or unknown, cannot chain sub-command.`
            );
        }

        const subCommands = COMMANDS.placeholders[returnType as PlaceholderTypeName]?.commands;
        if (!subCommands || !(String(subCommand) in subCommands)) {
            throw new Error(
                `Layout config error for ${this.placeholderType}:${String(cmd)} - sub-command "${String(subCommand)}" is not valid for return type ${returnType}.`
            );
        }

        const base = this.rawCommand(cmd, args);
        base.segments.pop();
        base.segments.push(`.${String(subCommand)}`);

        const entries = subArgs ? Object.entries(subArgs).filter(([, value]) => value != null) : [];
        if (entries.length > 0) {
            base.segments.push('(');
            entries.forEach(([argName, argValue], index) => {
                if (index > 0) base.segments.push(' ');
                base.segments.push(`${argName}: `);
                base.segments.push(argValue as string);
            });
            base.segments.push(')');
        }

        base.segments.push('}');

        return {
            kind: 'raw-template',
            segments: base.segments,
            usages: base.usages,
        };
    }

    getEntries(): Array<
        { kind: 'command'; cmd: PlaceholderCommandName<T>; args?: Record<string, LayoutArgValue>; alias?: string; renderer?: LayoutRendererId } |
        ConfigurableColumnRawSpec<V>
    > {
        return [...this.entries];
    }
}

export function defineConfigurableColumns<
    T extends PlaceholderTypeName,
    V extends string
>(
    type: T,
    templateName: string,
    spec: {
        variables: Record<V, LayoutVariableDefinition>;
        sort: Columns['sort'];
        shorten?: boolean;
    },
    configure: (builder: LayoutColumnTemplateBuilder<T, V>) => LayoutColumnTemplateBuilder<T, V>
): Columns {
    const builder = new LayoutColumnTemplateBuilder<T, V>(type);
    const finalBuilder = configure(builder);
    return createConfigurableColumns(type, templateName, {
        variables: spec.variables,
        entries: finalBuilder.getEntries(),
        sort: spec.sort,
        shorten: spec.shorten,
    });
}

type VariableUsage = {
    variable: string;
    command: string;
    argName: string;
    argType: string;
    min?: number;
    max?: number;
    desc?: string;
    choices?: string[];
};

const configResolverByTypeAndTemplate = new Map<string, (values?: Record<string, string>) => (string | [string, string])[]>();
let defaultTabsRegistry: Partial<{ [K in PlaceholderTypeName]: TabDefault }> = {};

export function registerLayoutTabs(tabs: Partial<{ [K in PlaceholderTypeName]: TabDefault }>): void {
    defaultTabsRegistry = tabs;
}

function getConfigResolverKey(type: PlaceholderTypeName, templateName: string): string {
    return `${type}::${templateName}`;
}

function normalizeLayoutValues(
    variables: Record<string, LayoutVariableDefinition>,
    values?: Record<string, string>
): Record<string, string> {
    const resolved: Record<string, string> = {};
    for (const [key, def] of Object.entries(variables)) {
        const provided = values?.[key];
        resolved[key] = provided != null && provided !== '' ? provided : def.defaultValue;
    }
    return resolved;
}

function registerVariableUsage(
    usage: VariableUsage,
    variableInputs: Record<string, LayoutVariableInputSchema>,
    seen: Record<string, VariableUsage>
): void {
    const existing = seen[usage.variable];
    if (!existing) {
        seen[usage.variable] = usage;
        variableInputs[usage.variable] = {
            argType: usage.argType,
            min: usage.min,
            max: usage.max,
            desc: usage.desc,
            choices: usage.choices,
        };
        return;
    }

    if (existing.argType !== usage.argType) {
        throw new Error(
            `Layout config variable "${usage.variable}" has conflicting argument types: ` +
            `${existing.command}.${existing.argName} (${existing.argType}) vs ${usage.command}.${usage.argName} (${usage.argType}).`
        );
    }
}

function resolveVariableUsageType<T extends PlaceholderTypeName>(
    type: T,
    usage: LayoutRawUsage<string>
): VariableUsage {
    const commandType = (usage.commandType ?? type) as PlaceholderTypeName;
    const command = CM.placeholders(commandType).get([usage.command as PlaceholderCommandName<typeof commandType>] as never);
    const argument = command.getArguments().find((arg) => arg.name === usage.argName);
    if (!argument) {
        throw new Error(
            `Layout config error for ${commandType}:${usage.command} - argument "${usage.argName}" does not exist.`
        );
    }

    return {
        variable: usage.variable,
        command: usage.command,
        argName: usage.argName,
        argType: argument.arg.type,
        min: argument.arg.min,
        max: argument.arg.max,
        desc: argument.arg.desc,
        choices: argument.arg.choices,
    };
}


function renderRawTemplate<V extends string>(template: LayoutRawTemplate<V>, values: Record<string, string>): string {
    return template.segments
        .map((segment) => {
            if (typeof segment === 'string') return segment;
            const value = values[segment.name];
            if (value == null) {
                throw new Error(`Layout config variable "${segment.name}" is missing while rendering raw template.`);
            }
            return value;
        })
        .join('');
}

function isStaticRawTemplate<V extends string>(template: LayoutRawTemplate<V>): boolean {
    return template.segments.every((segment) => typeof segment === 'string');
}

function buildCommandMention(cmd: string, args?: Record<string, string>): string {
    if (!args || Object.keys(args).length === 0) {
        return `{${cmd}}`;
    }

    const argPairs = Object.entries(args)
        .map(([argName, argValue]) => `${argName}: ${argValue}`)
        .join(' ');
    return `{${cmd}(${argPairs})}`;
}

function collectVariableInputs<T extends PlaceholderTypeName>(
    type: T,
    spec: ConfigurableColumnSpec<T, string>
): LayoutConfigSchema {
    const variableInputs: Record<string, LayoutVariableInputSchema> = {};
    const seen: Record<string, VariableUsage> = {};

    for (const commandSpec of spec.entries) {
        if (commandSpec.kind !== 'command') continue;
        if (!commandSpec.args) continue;
        const command = CM.placeholders(type).get([commandSpec.cmd] as never);
        const argumentsByName = Object.fromEntries(command.getArguments().map((arg) => [arg.name, arg]));

        for (const [argName, argValue] of Object.entries(commandSpec.args)) {
            if (!isLayoutVarRef(argValue)) continue;

            const argument = argumentsByName[argName];
            if (!argument) {
                throw new Error(
                    `Layout config error for ${type}:${commandSpec.cmd} - argument "${argName}" does not exist.`
                );
            }

            registerVariableUsage({
                variable: argValue.name,
                command: String(commandSpec.cmd),
                argName,
                argType: argument.arg.type,
                min: argument.arg.min,
                max: argument.arg.max,
                desc: argument.arg.desc,
                choices: argument.arg.choices,
            }, variableInputs, seen);
        }
    }

    for (const entry of spec.entries) {
        if (entry.kind !== 'raw') continue;
        if (typeof entry.placeholder === 'string') continue;

        for (const usage of entry.placeholder.usages) {
            if (!spec.variables[usage.variable]) {
                throw new Error(
                    `Layout config error for ${type} - raw column references unknown variable "${usage.variable}".`
                );
            }
            registerVariableUsage(resolveVariableUsageType(type, usage), variableInputs, seen);
        }

        for (const segment of entry.placeholder.segments) {
            if (!isLayoutVarRef(segment)) continue;
            if (!spec.variables[segment.name]) {
                throw new Error(
                    `Layout config error for ${type} - raw column references unknown variable "${segment.name}".`
                );
            }
            if (!variableInputs[segment.name]) {
                variableInputs[segment.name] = { argType: 'String' };
            }
        }
    }

    for (const variableName of Object.keys(spec.variables)) {
        if (!variableInputs[variableName]) {
            throw new Error(`Layout config variable "${variableName}" is declared but never used.`);
        }
    }

    return {
        variables: spec.variables,
        variableInputs,
    };
}

function createConfigurableColumns<T extends PlaceholderTypeName>(
    type: T,
    templateName: string,
    spec: ConfigurableColumnSpec<T, string>
): Columns {
    const config = collectVariableInputs(type, spec);
    const resolver = (values?: Record<string, string>) => {
        const resolvedVars = normalizeLayoutValues(spec.variables, values);
        const builder = CM.placeholders(type).array();

        for (const entry of spec.entries) {
            if (entry.kind === 'raw') {
                const resolvedRaw = typeof entry.placeholder === 'string'
                    ? entry.placeholder
                    : renderRawTemplate(entry.placeholder, resolvedVars);
                builder.addRaw(resolvedRaw, entry.alias);
                continue;
            }

            let resolvedArgs: Record<string, string> | undefined;
            if (entry.args) {
                resolvedArgs = Object.fromEntries(
                    Object.entries(entry.args).map(([argName, argValue]) => {
                        if (isLayoutVarRef(argValue)) {
                            const value = resolvedVars[argValue.name];
                            if (value == null) {
                                throw new Error(
                                    `Layout config variable "${argValue.name}" is missing while resolving ${type}:${templateName}.`
                                );
                            }
                            return [argName, value];
                        }
                        return [argName, argValue];
                    })
                );
            }

            builder.addRaw(buildCommandMention(entry.cmd, resolvedArgs), entry.alias);
        }

        if (spec.shorten !== false) {
            builder.shorten();
        }

        return builder.build2d();
    };

    configResolverByTypeAndTemplate.set(getConfigResolverKey(type, templateName), resolver);

    return {
        value: resolver(),
        sort: spec.sort,
        config,
        columnRenderers: collectColumnRenderers(spec.entries, type, templateName),
    };
}

function collectColumnRenderers<T extends PlaceholderTypeName>(
    entries: ConfigurableColumnSpec<T, string>['entries'],
    type: T,
    templateName: string
): Record<string, LayoutRendererId> | undefined {
    const result: Record<string, LayoutRendererId> = {};

    for (const entry of entries) {
        if (!entry.renderer) continue;

        if (entry.alias) {
            result[entry.alias] = entry.renderer;
            continue;
        }

        if (entry.kind === 'command') {
            let resolvedArgs: Record<string, string> | undefined;
            if (entry.args) {
                resolvedArgs = Object.fromEntries(
                    Object.entries(entry.args).map(([argName, argValue]) => {
                        if (isLayoutVarRef(argValue)) {
                            throw new Error(
                                `Layout config error for ${type}:${templateName} - renderer columns for commands with variable arguments require an alias.`
                            );
                        }
                        return [argName, argValue];
                    })
                );
            }
            result[buildCommandMention(entry.cmd, resolvedArgs)] = entry.renderer;
            continue;
        }

        if (typeof entry.placeholder === 'string') {
            result[entry.placeholder] = entry.renderer;
            continue;
        }

        if (isStaticRawTemplate(entry.placeholder)) {
            result[entry.placeholder.segments.join('')] = entry.renderer;
            continue;
        }

        throw new Error(
            `Layout config error for ${type}:${templateName} - renderer columns with dynamic raw placeholders require an alias.`
        );
    }

    return Object.keys(result).length > 0 ? result : undefined;
}

export function getLayoutColumnConfig(type: PlaceholderTypeName, templateName: string): LayoutConfigSchema | undefined {
    return defaultTabsRegistry[type]?.columns[templateName]?.config;
}

export function resolveLayoutColumnTemplate(
    type: PlaceholderTypeName,
    templateName: string,
    values?: Record<string, string>
): Columns | undefined {
    const original = defaultTabsRegistry[type]?.columns[templateName];
    if (!original) return undefined;
    const resolver = configResolverByTypeAndTemplate.get(getConfigResolverKey(type, templateName));
    if (!resolver) return original;
    return {
        ...original,
        value: resolver(values),
    };
}
