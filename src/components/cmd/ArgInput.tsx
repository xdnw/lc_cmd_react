import { TypeBreakdown } from "../../utils/Command";
import {ListComponentBreakdown, ListComponentOptions} from "./ListComponent";
import NumberInput from "./NumberInput";
import TimeInput from "./TimeInput";
import BooleanInput from "./BooleanInput";
import StringInput from "./StringInput";
import TextComponent from "./TextInput";
import TaxRateInput from "./TaxRateInput";
import MmrInput from "./MmrInput";
import MmrDoubleInput from "./MmrDoubleInput";
import CityRanges from "./CityRanges";
import CityBuildInput from "./CityBuildInput";
import ColorInput from "./ColorInput";
import FontInput from "./FontInput";
import MapInput from "./MapInput";
import SetInput from "./SetInput";
import TriStateInput from "./TriStateInput";
import QueryComponent, { CompositeQueryComponent } from "./QueryComponent";
import CustomConditionMessageInput from "./CustomConditionMessageInput";
import {useMemo, memo} from "react";
import TypedInput from "./TypedInput";
import PlaceholderExpressionInput from "@/components/cmd/PlaceholderExpressionInput";
import {COMMANDS} from "../../lib/commands";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";
import TimeDiffInput from "./TimeDiffInput";
import HtmlEditor from "./HtmlEditor";
import { resolveArgInput, type ArgInputSupport, type ArgInputResolution } from "./argInputMetadata";

export type { ArgInputSupport } from "./argInputMetadata";

interface ArgProps {
  argName: string;
  breakdown: TypeBreakdown;
  min?: number;
  max?: number;
  initialValue: string;
  displayMode?: CommandInputDisplayMode;
  setOutputValue: (key: string, value: string) => void;
}

type ComponentResolution = {
  componentName: string;
  querySource?: string;
};

export function getArgInputSupport(breakdown: TypeBreakdown): ArgInputSupport {
  return resolveArgInput(breakdown).support;
}

export function getArgInputComponentName(breakdown: TypeBreakdown): ComponentResolution {
  const resolution = resolveArgInput(breakdown);
  return {
    componentName: resolution.componentName,
    querySource: resolution.querySource,
  };
}

function renderResolvedArgInput(resolution: ArgInputResolution, props: ArgProps & { compact: boolean }): React.ReactElement {
  const { argName, breakdown, min, max, initialValue, setOutputValue, displayMode, compact } = props;
  const options = resolution.optionData;
  const textInputConfig = resolution.textInputConfig;

  switch (resolution.kind) {
    case "font-options":
      return <FontInput argName={argName} initialValue={initialValue} options={options.options ?? []} setOutputValue={setOutputValue} />;

    case "static-options":
      return <ListComponentOptions argName={argName} options={options.options ?? []} isMulti={options.multi}
        initialValue={initialValue} setOutputValue={setOutputValue} />;

    case "composite-query":
      return <CompositeQueryComponent composites={options.composite} multi={options.multi}
        argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />;

    case "typed-placeholder":
      if (!resolution.typedPlaceholderConfig) {
        return <UnknownType breakdown={breakdown} argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />;
      }
      return <TypedInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        placeholder={resolution.typedPlaceholderConfig.placeholderName as keyof typeof COMMANDS.placeholders}
        type={resolution.typedPlaceholderConfig.valueType} compact={compact} />;

    case "placeholder-expression":
      return <PlaceholderExpressionInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        breakdown={breakdown} compact={compact} />;

    case "placeholder-string":
    case "integer-list":
    case "spreadsheet":
    case "google-doc":
    case "dbwar":
    case "dbcity":
    case "message":
    case "uuid":
    case "string":
      return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        filter={textInputConfig?.filter} filterHelp={textInputConfig?.filterHelp}
        compact={compact} placeholder={textInputConfig?.placeholder} />;

    case "wysiwyg":
      return <HtmlEditor argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;

    case "textarea":
      return <TextComponent argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;

    case "placeholder-class":
      return <ListComponentBreakdown breakdown={breakdown} argName={argName} isMulti={false}
        initialValue={initialValue} setOutputValue={setOutputValue} />;

    case "set":
      return <SetInput argName={argName} child={breakdown.child![0]} initialValue={initialValue}
        setOutputValue={setOutputValue} displayMode={displayMode} />;

    case "query":
      return <QueryComponent element={options.typeKey} multi={options.multi}
        argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />;

    case "boolean":
      if (resolution.booleanMode === "tri-state") {
        return <TriStateInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;
      }
      return <BooleanInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />;

    case "time":
      return <TimeInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;

    case "timediff":
      return <TimeDiffInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;

    case "map":
      return <MapInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        children={breakdown.child!} displayMode={displayMode} preferStaticKeyLayout />;

    case "citybuild":
      return <CityBuildInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        displayMode={displayMode} />;

    case "color":
      return <ColorInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;

    case "number":
      return <NumberInput argName={argName} min={min ?? undefined} max={max ?? undefined}
        initialValue={initialValue} setOutputValue={setOutputValue}
        isFloat={resolution.numberIsFloat ?? false}
        className={compact ? "h-8 text-xs" : undefined} placeholder={breakdown.element} compact={compact} />;

    case "cityranges":
      return <CityRanges argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;

    case "mmr":
      return <MmrInput allowWildcard={resolution.allowWildcard ?? false} argName={argName} initialValue={initialValue}
        setOutputValue={setOutputValue} compact={compact} />;

    case "mmr-double":
      return <MmrDoubleInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;

    case "taxrate":
      return <TaxRateInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;

    case "custom-condition-message":
      return <CustomConditionMessageInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;

    case "unknown":
    default:
      return <UnknownType breakdown={breakdown} argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

const ArgInput = memo(function ArgInput({ argName, breakdown, min, max, initialValue, setOutputValue, displayMode }: ArgProps) {
  const compact = isCompactMode(displayMode);
  const resolution = useMemo(() => resolveArgInput(breakdown), [breakdown]);

  return renderResolvedArgInput(resolution, {
    argName,
    breakdown,
    min,
    max,
    initialValue,
    setOutputValue,
    displayMode,
    compact,
  });
});

export default ArgInput;

export function UnknownType({ breakdown, argName, initialValue, setOutputValue }: {
  breakdown: TypeBreakdown;
  argName: string;
  initialValue: string;
  setOutputValue: (key: string, value: string) => void;
}) {
  return (
    <>
      {breakdown.element} UNKNOWN TYPE {JSON.stringify(breakdown)} `{breakdown.element.toLowerCase()}`
      <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />
    </>
  );
}