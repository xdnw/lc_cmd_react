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
import ColorInput from "./ColorInput";
import MapInput from "./MapInput";
import SetInput from "./SetInput";
import TriStateInput from "./TriStateInput";
import QueryComponent, { CompositeQueryComponent } from "./QueryComponent";
import CustomConditionMessageInput from "./CustomConditionMessageInput";
import {REGEX_PATTERN} from "../../lib/regex-patterns";
import {useMemo, memo} from "react";
import TypedInput from "./TypedInput";
import {COMMANDS} from "../../lib/commands";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";

interface ArgProps {
  argName: string;
  breakdown: TypeBreakdown;
  min?: number;
  max?: number;
  initialValue: string;
  displayMode?: CommandInputDisplayMode;
  setOutputValue: (key: string, value: string) => void;
}

export type ArgInputSupport = {
  supported: boolean;
  reason?: string;
};

// ─── Registry ────────────────────────────────────────────────────────────────

type OptionData = ReturnType<TypeBreakdown["getOptionData"]>;
type RendererProps = ArgProps & { compact: boolean; options: OptionData };

/**
 * Each entry defines how to render a given (lowercased) element type and
 * optionally a custom support-check (defaults to `supported: true`).
 */
type TypeRegistryEntry = {
  render: (props: RendererProps) => React.ReactElement;
  /** Override only when support depends on runtime state (e.g. missing child). */
  checkSupport?: (breakdown: TypeBreakdown) => ArgInputSupport;
};

const spreadsheetRenderer = ({ argName, initialValue, setOutputValue, compact, breakdown }: RendererProps) => (
  <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
    filter={REGEX_PATTERN.SPREADSHEET} filterHelp="a link to a google sheet"
    compact={compact} placeholder={breakdown.element} />
);

const intRenderer = ({ argName, initialValue, setOutputValue, compact, breakdown }: RendererProps) => (
  <NumberInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
    isFloat={false} className={compact ? "h-8 text-xs" : undefined} placeholder={breakdown.element} />
);

const TYPE_REGISTRY: Record<string, TypeRegistryEntry> = {
  map: {
    render: ({ argName, initialValue, setOutputValue, breakdown, displayMode }) => (
      <MapInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        children={breakdown.child!} displayMode={displayMode} />
    ),
  },

  set: {
    checkSupport: (breakdown) => {
      if (!breakdown.child?.[0]) {
        return { supported: false, reason: "Set type is missing child type metadata" };
      }
      return { supported: true };
    },
    render: ({ argName, initialValue, setOutputValue, breakdown, options, displayMode }) => {
      const setValueType = breakdown.child?.[0];
      if (!setValueType) {
        return <UnknownType breakdown={breakdown} argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />;
      }
      if (options.query) {
        return <QueryComponent element={setValueType.element} multi={true} argName={argName}
          initialValue={initialValue} setOutputValue={setOutputValue} />;
      }
      return <SetInput argName={argName} child={setValueType} initialValue={initialValue}
        setOutputValue={setOutputValue} displayMode={displayMode} />;
    },
  },

  color: {
    render: ({ argName, initialValue, setOutputValue, compact }) => (
      <ColorInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
    ),
  },

  double: {
    render: ({ argName, initialValue, setOutputValue, min, max, compact, breakdown }) => (
      <NumberInput argName={argName} min={min ?? undefined} max={max ?? undefined}
        initialValue={initialValue} setOutputValue={setOutputValue} isFloat={true}
        className={compact ? "h-8 text-xs" : undefined} placeholder={breakdown.element} />
    ),
  },

  long: {
    render: ({ argName, initialValue, setOutputValue, breakdown, compact }) => {
      if (breakdown.annotations?.includes("Timediff") || breakdown.annotations?.includes("Timestamp")) {
        return <TimeInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;
      }
      return <NumberInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        isFloat={false} className={compact ? "h-8 text-xs" : undefined} placeholder={breakdown.element} />;
    },
  },

  integer: { render: intRenderer },
  int:     { render: intRenderer },

  boolean: {
    render: ({ argName, initialValue, setOutputValue, breakdown, compact }) => {
      // "Boolean" (capital B) → tri-state; "boolean" (lowercase) → standard toggle
      if (breakdown.element === "Boolean") {
        return <TriStateInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;
      }
      return <BooleanInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />;
    },
  },

  transfersheet: { render: spreadsheetRenderer },
  spreadsheet:   { render: spreadsheetRenderer },

  googledoc: {
    render: ({ argName, initialValue, setOutputValue, compact, breakdown }) => (
      <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        filter={REGEX_PATTERN.GOOGLE_DOC} filterHelp="a link to a google document"
        compact={compact} placeholder={breakdown.element} />
    ),
  },

  dbwar: {
    render: ({ argName, initialValue, setOutputValue, compact, breakdown }) => (
      <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        filter={REGEX_PATTERN.WAR} filterHelp="a war timeline url"
        compact={compact} placeholder={breakdown.element} />
    ),
  },

  dbcity: {
    render: ({ argName, initialValue, setOutputValue, compact, breakdown }) => (
      <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        filter={REGEX_PATTERN.CITY} filterHelp="a city url"
        compact={compact} placeholder={breakdown.element} />
    ),
  },

  message: {
    render: ({ argName, initialValue, setOutputValue, compact, breakdown }) => (
      <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        filter={REGEX_PATTERN.CHANNEL} filterHelp="a discord message url"
        compact={compact} placeholder={breakdown.element} />
    ),
  },

  cityranges: {
    render: ({ argName, initialValue, setOutputValue, compact }) => (
      <CityRanges argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
    ),
  },

  uuid: {
    render: ({ argName, initialValue, setOutputValue, compact, breakdown }) => (
      <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        filter={REGEX_PATTERN.UUID} filterHelp="a uuid in the form XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
        compact={compact} placeholder={breakdown.element} />
    ),
  },

  mmrint: {
    render: ({ argName, initialValue, setOutputValue, compact }) => (
      <MmrInput allowWildcard={false} argName={argName} initialValue={initialValue}
        setOutputValue={setOutputValue} compact={compact} />
    ),
  },

  mmrmatcher: {
    render: ({ argName, initialValue, setOutputValue, compact }) => (
      <MmrInput allowWildcard={true} argName={argName} initialValue={initialValue}
        setOutputValue={setOutputValue} compact={compact} />
    ),
  },

  mmrdouble: {
    render: ({ argName, initialValue, setOutputValue, compact }) => (
      <MmrDoubleInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
    ),
  },

  string: {
    render: ({ argName, initialValue, setOutputValue, compact, breakdown }) => (
      <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        compact={compact} placeholder={breakdown.element} />
    ),
  },

  taxrate: {
    render: ({ argName, initialValue, setOutputValue, compact }) => (
      <TaxRateInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
    ),
  },

  customconditionmessage: {
    render: ({ argName, initialValue, setOutputValue, compact }) => (
      <CustomConditionMessageInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
    ),
  },
};

// ─── Support check ────────────────────────────────────────────────────────────

// Alias
TYPE_REGISTRY.list = TYPE_REGISTRY.set;

export function getArgInputSupport(breakdown: TypeBreakdown): ArgInputSupport {
  if (hasOptionOrCompositeSupport(breakdown)) return { supported: true };
  if (hasPlaceholderSupport(breakdown)) return { supported: true };
  if (breakdown.annotations?.includes("TextArea")) return { supported: true };
  if (isIntegerListType(breakdown)) return { supported: true };
  if (isPlaceholderClass(breakdown)) return { supported: true };

  const entry = TYPE_REGISTRY[breakdown.element.toLowerCase()];
  if (entry) {
    return entry.checkSupport ? entry.checkSupport(breakdown) : { supported: true };
  }

  if (breakdown.getOptionData().query) return { supported: true };
  return { supported: false, reason: `Unsupported input control for type ${breakdown.element} | ${JSON.stringify(breakdown)}` };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasOptionOrCompositeSupport(breakdown: TypeBreakdown): boolean {
  const options = breakdown.getOptionData();
  return Boolean(options.options) || options.composite.length > 0;
}

function hasPlaceholderSupport(breakdown: TypeBreakdown): boolean {
  const placeholder = breakdown.getPlaceholder();
  if (placeholder == null) return false;
  if (breakdown.element.toLowerCase() !== "typedfunction") return true;
  return Boolean(breakdown.child && breakdown.child.length >= 2);
}

function isIntegerListType(breakdown: TypeBreakdown): boolean {
  return (breakdown.element === "List" || breakdown.element === "Set")
    && breakdown.child?.[0].element === "Integer";
}

function isPlaceholderClass(breakdown: TypeBreakdown): boolean {
  return breakdown.element === "Class" && Boolean(breakdown.annotations?.includes("PlaceholderType"));
}

// ─── Component ───────────────────────────────────────────────────────────────

const ArgInput = memo(function ArgInput({ argName, breakdown, min, max, initialValue, setOutputValue, displayMode }: ArgProps) {
  const compact = isCompactMode(displayMode);
  const options = useMemo(() => breakdown.getOptionData(), [breakdown]);

  // Options / composite shortcuts
  if (options.options) {
    return <ListComponentOptions argName={argName} options={options.options} isMulti={options.multi}
      initialValue={initialValue} setOutputValue={setOutputValue} />;
  }
  if (options.composite.length > 0) {
    return <CompositeQueryComponent composites={options.composite} multi={options.multi}
      argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />;
  }

  // Placeholder / TypedFunction
  const placeholder = breakdown.getPlaceholder();
  if (placeholder != null) {
    if (breakdown.element.toLowerCase() === "typedfunction") {
      return <TypedInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
        placeholder={breakdown.child![0].element as keyof typeof COMMANDS.placeholders}
        type={breakdown.child![1].element} compact={compact} />;
    }
    return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
      compact={compact} placeholder={breakdown.element} />;
  }

  // TextArea annotation
  if (breakdown.annotations?.includes("TextArea")) {
    return <TextComponent argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;
  }

  // Integer list shorthand
  if (isIntegerListType(breakdown)) {
    return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue}
      filter={REGEX_PATTERN.NUMBER_LIST} filterHelp="a comma separated list of numbers"
      compact={compact} placeholder={breakdown.element} />;
  }

  // PlaceholderType class
  if (isPlaceholderClass(breakdown)) {
    return <ListComponentBreakdown breakdown={breakdown} argName={argName} isMulti={false}
      initialValue={initialValue} setOutputValue={setOutputValue} />;
  }

  // Registry lookup
  const entry = TYPE_REGISTRY[breakdown.element.toLowerCase()];
  if (entry) {
    return entry.render({ argName, breakdown, min, max, initialValue, setOutputValue, displayMode, compact, options });
  }

  // Query fallback
  if (options.query) {
    return <QueryComponent element={breakdown.element} multi={options.multi}
      argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />;
  }

  return <UnknownType breakdown={breakdown} argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />;
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