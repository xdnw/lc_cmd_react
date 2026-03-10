import { useSyncedState } from "@/utils/StateUtil";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { useCallback } from "react";
import { normalizeMmrValue } from "./scalarInputNormalization";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";

function parseMmrControlValue(input: string, allowWildcard: boolean) {
  const trimmed = input.trim();
  if (!trimmed) {
    return acceptedParsedInput("");
  }

  const normalized = normalizeMmrValue(trimmed, allowWildcard);
  if (!normalized) {
    return rejectedParsedInput("", `Expected a 4-slot MMR using digits${allowWildcard ? " or X" : ""}.`);
  }

  if (normalized.length < 4) {
    return acceptedParsedInput(normalized, `MMR must have 4 slots; currently ${normalized.length}.`);
  }

  return acceptedParsedInput(normalized);
}

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
    const parseValue = useCallback((input: string) => parseMmrControlValue(input, allowWildcard), [allowWildcard]);
    const { initialResult, parseError, applyParsedResult } = useParsedInputFeedback(initialValue || "", parseValue);
    const [value, setValue] = useSyncedState<string>(initialResult.value);

    const onChange = useCallback((newValue: string) => {
      const parsed = parseMmrControlValue(newValue, allowWildcard);
      applyParsedResult(parsed, (normalized) => {
        setValue(normalized);
        setOutputValue(argName, normalized.length === 4 ? normalized : "");
      });
    }, [allowWildcard, applyParsedResult, setValue, argName, setOutputValue]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
      handleParsedInputPaste(event, {
        parse: parseValue,
        applyParsedResult,
        onAccept: (normalized) => {
          setValue(normalized);
          setOutputValue(argName, normalized.length === 4 ? normalized : "");
        },
      });
    }, [applyParsedResult, argName, parseValue, setOutputValue, setValue]);

    return (
        <div className="space-y-1" onPasteCapture={handlePasteCapture}>
          <InputOTP
            pattern={allowWildcard ? "[0-9X]*" : "[0-9]*"}
            maxLength={4}
            value={value}
            onChange={onChange}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className={compact ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-[13px]"} />
              <InputOTPSlot index={1} className={compact ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-[13px]"} />
              <InputOTPSlot index={2} className={compact ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-[13px]"} />
              <InputOTPSlot index={3} className={compact ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-[13px]"} />
            </InputOTPGroup>
          </InputOTP>
          <FieldMessage error={parseError} compact={compact} />
        </div>
      )
}