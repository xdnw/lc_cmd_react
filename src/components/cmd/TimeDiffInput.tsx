import { useMemo, useCallback, type ChangeEvent, type ClipboardEvent } from "react";
import { useSyncedState } from "@/utils/StateUtil";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import {
  formatHumanDatetime,
  normalizeTimediffValue,
  parseTemporalInput,
} from "@/lib/temporal";

const exampleCodeClass = "rounded bg-muted px-1 py-0.5 font-mono text-foreground";

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
  const initialDisplayValue = useMemo(
    () => normalizeTimediffValue(initialValue, Date.now()).displayValue,
    [initialValue],
  );

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
    setValue(raw);
    setOutputValue(argName, normalizeTimediffValue(raw, Date.now()).outputValue);
  }, [argName, setOutputValue, setValue]);

  const handleBlur = useCallback(() => {
    const next = normalizeTimediffValue(value, Date.now());
    if (!next.displayValue) {
      return;
    }

    setValue(next.displayValue);
    setOutputValue(argName, next.outputValue);
  }, [argName, setOutputValue, value, setValue]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    const next = normalizeTimediffValue(pasted, Date.now());

    if (!next.displayValue) {
      return;
    }

    e.preventDefault();
    setValue(next.displayValue);
    setOutputValue(argName, next.outputValue);
  }, [argName, setOutputValue, setValue]);

  return (
    <div className="w-full">
      <Input
        type="text"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="e.g. 1w10h3m25s"
        className={cn(
          "w-full bg-background font-mono",
          compact ? "h-8 text-xs" : "",
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
        <div className="mt-1 space-y-1">
          <p className={cn("text-xs", hasError ? "text-destructive" : "text-muted-foreground")}>
            {hasError ? (
              <>
                Unrecognized time value. Try{" "}
                <code className={exampleCodeClass}>1w10h3m25s</code>,{" "}
                <code className={exampleCodeClass}>90m</code>,{" "}
                <code className={exampleCodeClass}>-2h</code>,{" "}
                <code className={exampleCodeClass}>in 2h</code>,{" "}
                <code className={exampleCodeClass}>timestamp:1741271400000</code>, or{" "}
                <code className={exampleCodeClass}>2025-03-06 12:30:00</code>.
              </>
            ) : (
              <>
                Canonical format is{" "}
                <code className={exampleCodeClass}>1w10h3m25s</code>. Positive values mean “ago”.
                Use <code className={exampleCodeClass}>-2h</code> or{" "}
                <code className={exampleCodeClass}>in 2h</code> for future.
              </>
            )}
          </p>

          {!hasError && resolvedAt && (
            <div className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground">
              Resolves to <span className="font-mono">{resolvedAt}</span> local time.
            </div>
          )}
        </div>
      )}
    </div>
  );
}