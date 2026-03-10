import { useSyncedState } from "@/utils/StateUtil";
import { useCallback, useMemo, type ChangeEvent, type ClipboardEvent } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { normalizeTimeValue, parseTemporalInput } from "@/lib/temporal";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";

const exampleCodeClass = "rounded bg-muted px-1 py-0.5 font-mono text-foreground";

function parseTimeControlValue(raw: string) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return acceptedParsedInput("");
  }

  const normalized = normalizeTimeValue(trimmed, Date.now());
  if (!normalized.displayValue || parseTemporalInput(trimmed, Date.now()).kind === "invalid") {
    return rejectedParsedInput("", "Could not parse the time. Try a datetime, timestamp:..., or a relative value like 1w10h.");
  }

  return acceptedParsedInput(normalized.displayValue);
}

export default function TimeInput({
  argName,
  initialValue,
  setOutputValue,
  compact,
}: {
  argName: string;
  initialValue: string;
  compact?: boolean;
  setOutputValue: (name: string, value: string) => void;
}) {
  const { initialResult, parseError, clearParseError, applyParsedResult } = useParsedInputFeedback(initialValue, parseTimeControlValue);
  const initialDisplayValue = useMemo(() => initialResult.value, [initialResult.value]);
  const [value, setValue] = useSyncedState(initialDisplayValue);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    clearParseError();
    setValue(nextValue);
    setOutputValue(argName, normalizeTimeValue(nextValue, Date.now()).outputValue);
  }, [argName, clearParseError, setOutputValue, setValue]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    handleParsedInputPaste(e, {
      parse: parseTimeControlValue,
      applyParsedResult,
      onAccept: (displayValue) => {
        setValue(displayValue);
        setOutputValue(argName, normalizeTimeValue(displayValue, Date.now()).outputValue);
      },
    });
  }, [applyParsedResult, argName, setOutputValue, setValue]);

  return (
    <div className="w-full space-y-1">
      <Input
        type="datetime-local"
        step={1}
        className={cn("w-full bg-background", compact ? "h-6.5 px-2 text-xs" : "h-7")}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        title="Pick a local date/time, or paste 1w10h, timestamp:..., or an ISO/local datetime."
      />

      {!compact && (
        <p className="text-[11px] text-muted-foreground">
          Also accepts{" "}
          <code className={exampleCodeClass}>1w10h</code>,{" "}
          <code className={exampleCodeClass}>timestamp:1741271400000</code>, or{" "}
          <code className={exampleCodeClass}>2025-03-06 12:30:00</code>.
        </p>
      )}
      <FieldMessage error={parseError} compact={compact} />
    </div>
  );
}