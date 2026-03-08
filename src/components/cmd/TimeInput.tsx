import { useSyncedState } from "@/utils/StateUtil";
import { useCallback, useMemo, type ChangeEvent, type ClipboardEvent } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { normalizeTimeValue } from "@/lib/temporal";

const exampleCodeClass = "rounded bg-muted px-1 py-0.5 font-mono text-foreground";

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
  // useMemo here keeps the synced initial value stable even though normalizeTimeValue can depend on Date.now().
  const initialDisplayValue = useMemo(
    () => normalizeTimeValue(initialValue, Date.now()).displayValue,
    [initialValue],
  );

  const [value, setValue] = useSyncedState(initialDisplayValue);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setValue(nextValue);
    setOutputValue(argName, normalizeTimeValue(nextValue, Date.now()).outputValue);
  }, [argName, setOutputValue, setValue]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    const normalized = normalizeTimeValue(pasted, Date.now());

    if (!normalized.displayValue) {
      return;
    }

    e.preventDefault();
    setValue(normalized.displayValue);
    setOutputValue(argName, normalized.outputValue);
  }, [argName, setOutputValue, setValue]);

  return (
    <div className="w-full">
      <Input
        type="datetime-local"
        step={1}
        className={cn("w-full bg-background", compact ? "h-8 text-xs" : "")}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        title="Pick a local date/time, or paste 1w10h, timestamp:..., or an ISO/local datetime."
      />

      {!compact && (
        <p className="mt-1 text-xs text-muted-foreground">
          Native picker for absolute time. You can also paste{" "}
          <code className={exampleCodeClass}>1w10h</code>,{" "}
          <code className={exampleCodeClass}>timestamp:1741271400000</code>, or{" "}
          <code className={exampleCodeClass}>2025-03-06 12:30:00</code>.
        </p>
      )}
    </div>
  );
}