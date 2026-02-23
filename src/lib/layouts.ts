import './layouts/defaultTabs';

export { DEFAULT_TABS } from './layouts/defaultTabs';
export {
    defineConfigurableColumns,
    getLayoutColumnConfig,
    LayoutColumnTemplateBuilder,
    resolveLayoutColumnTemplate,
} from './layouts/configurable';
export {
    layoutVar,
    type Columns,
    type ConfigurableColumnCommandSpec,
    type ConfigurableColumnRawSpec,
    type ConfigurableColumnSpec,
    type LayoutArgValue,
    type LayoutConfigSchema,
    type LayoutRawSegment,
    type LayoutRawTemplate,
    type LayoutRawUsage,
    type LayoutVarRef,
    type LayoutVariableDefinition,
    type LayoutVariableInputSchema,
    type PlaceholderCommandArgs,
    type PlaceholderCommandArgsWithVars,
    type PlaceholderCommandName,
    type PlaceholderTypeName,
    type TabDefault,
} from './layouts/types';
