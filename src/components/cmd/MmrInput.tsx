import { useSyncedState } from "@/utils/StateUtil";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { useCallback } from "react";
import { getPastedText } from "./pasteUtils";
import { normalizeMmrValue } from "./scalarInputNormalization";

export default function MmrInput(
    {argName, allowWildcard, initialValue, setOutputValue, compact}:
    {
        argName: string,
        allowWildcard: boolean,
        initialValue: string,
        compact?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const [value, setValue] = useSyncedState<string>(normalizeMmrValue(initialValue || "", allowWildcard));

    const onChange = useCallback((newValue: string) => {
      const normalized = normalizeMmrValue(newValue, allowWildcard);
      setValue(normalized)
      setOutputValue(argName, normalized.length === 4 ? normalized : "");
    }, [allowWildcard, setValue, argName, setOutputValue]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
      const pastedText = getPastedText(event);
      if (!pastedText.trim()) return;

      const normalized = normalizeMmrValue(pastedText, allowWildcard);
      if (!normalized) return;

      event.preventDefault();
      event.stopPropagation();
      onChange(normalized);
    }, [allowWildcard, onChange]);

    return (
        <div onPasteCapture={handlePasteCapture}>
          <InputOTP
            pattern={allowWildcard ? "[0-9X]*" : "[0-9]*"}
            maxLength={4}
            value={value}
            onChange={onChange}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className={compact ? "h-7 w-7 text-xs" : ""} />
              <InputOTPSlot index={1} className={compact ? "h-7 w-7 text-xs" : ""} />
              <InputOTPSlot index={2} className={compact ? "h-7 w-7 text-xs" : ""} />
              <InputOTPSlot index={3} className={compact ? "h-7 w-7 text-xs" : ""} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      )
}