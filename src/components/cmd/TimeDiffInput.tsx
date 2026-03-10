import { useMemo, useCallback, type ChangeEvent, type ClipboardEvent } from "react";
import { useSyncedState } from "@/utils/StateUtil";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import {
  formatHumanDatetime,
  normalizeTimediffValue,
  parseTemporalInput,
} from "@/lib/temporal";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";

const exampleCodeClass = "rounded bg-muted px-1 py-0.5 font-mono text-foreground";

function parseTimediffControlValue(raw: string) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return acceptedParsedInput("");
  }

  const normalized = normalizeTimediffValue(trimmed, Date.now());
  if (!normalized.displayValue || parseTemporalInput(trimmed, Date.now()).kind === "invalid") {
    return rejectedParsedInput("", "Could not parse the time difference. Try 1w10h3m, 90m, -2h, in 2h, or timestamp:....");
  }

  return acceptedParsedInput(normalized.displayValue);
}

export default function TimeDiffInput({
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
  const { initialResult, parseError, clearParseError, applyParsedResult } = useParsedInputFeedback(initialValue, parseTimediffControlValue);
  const initialDisplayValue = useMemo(() => initialResult.value, [initialResult.value]);

  const [value, setValue] = useSyncedState(initialDisplayValue);

  const nowMs = Date.now();
  const parsed = parseTemporalInput(value, nowMs);
  const normalized = normalizeTimediffValue(value, nowMs);

  const isEmpty = value.trim() === "";
  const hasError = !isEmpty && parsed.kind === "invalid";

  const resolvedAt =
    typeof normalized.resolvedTimestampMs === "number"
      ? formatHumanDatetime(new Date(normalized.resolvedTimestampMs))
      : "";

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    clearParseError();
    setValue(raw);
    setOutputValue(argName, normalizeTimediffValue(raw, Date.now()).outputValue);
  }, [argName, clearParseError, setOutputValue, setValue]);

  const handleBlur = useCallback(() => {
    const next = normalizeTimediffValue(value, Date.now());
    if (!next.displayValue) {
      return;
    }

    setValue(next.displayValue);
    setOutputValue(argName, next.outputValue);
  }, [argName, setOutputValue, value, setValue]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    handleParsedInputPaste(e, {
      parse: parseTimediffControlValue,
      applyParsedResult,
      onAccept: (displayValue) => {
        setValue(displayValue);
        setOutputValue(argName, normalizeTimediffValue(displayValue, Date.now()).outputValue);
      },
    });
  }, [applyParsedResult, argName, setOutputValue, setValue]);

  return (
    <div className="w-full space-y-1">
      <Input
        type="text"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="e.g. 1w10h3m25s"
        className={cn(
          "w-full bg-background font-mono",
          compact ? "h-6.5 px-2 text-xs" : "h-7 text-[13px]",
          hasError && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
        )}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onPaste={handlePaste}
        aria-invalid={hasError}
        title="Accepts 1w10h3m25s, 90m, -2h / in 2h, timestamp:..., or an ISO/local datetime."
      />

      {!compact && (
        <div className="space-y-1">
          <p className={cn("text-[11px]", hasError ? "text-destructive" : "text-muted-foreground")}>
            {hasError ? (
              <>
                Try{" "}
                <code className={exampleCodeClass}>1w10h3m25s</code>,{" "}
                <code className={exampleCodeClass}>90m</code>,{" "}
                <code className={exampleCodeClass}>-2h</code>,{" "}
                <code className={exampleCodeClass}>in 2h</code>,{" "}
                <code className={exampleCodeClass}>timestamp:1741271400000</code>, or{" "}
                <code className={exampleCodeClass}>2025-03-06 12:30:00</code>.
              </>
            ) : (
              <>
                Accepts{" "}
                <code className={exampleCodeClass}>1w10h3m25s</code>. Positive values mean “ago”.
                Use <code className={exampleCodeClass}>-2h</code> or{" "}
                <code className={exampleCodeClass}>in 2h</code> for future.
              </>
            )}
          </p>

          {!hasError && resolvedAt && (
            <div className="rounded-sm border border-border/60 bg-muted/15 px-2 py-1 text-[11px] text-foreground">
              Resolves to <span className="font-mono">{resolvedAt}</span> local time.
            </div>
          )}
        </div>
      )}
      <FieldMessage error={!hasError ? parseError : undefined} compact={compact} />
    </div>
  );
}