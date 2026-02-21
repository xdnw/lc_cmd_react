import { useSyncedState } from "@/utils/StateUtil";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { useCallback } from "react";

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
    const [value, setValue] = useSyncedState<string>(initialValue || "");

    const onChange = useCallback((newValue: string) => {
        setValue(newValue.toUpperCase())
        setOutputValue(argName, newValue.length === 4 ? newValue.toUpperCase() : "");
    }, [setValue, argName, setOutputValue]);

    return (
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
      )
}