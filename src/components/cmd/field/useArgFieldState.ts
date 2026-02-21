import { useSyncedState } from "@/utils/StateUtil";
import { useCallback, useState } from "react";
import type { ValidationState } from "./argValidation";

const DEFAULT_VALIDATION: ValidationState = {
    isValid: true,
    error: "",
    note: "",
};

export function useArgFieldState(initialValue: string) {
    const [value, setValue] = useSyncedState(initialValue || "");
    const [validation, setValidation] = useState<ValidationState>(DEFAULT_VALIDATION);

    const resetValidation = useCallback(() => {
        setValidation(DEFAULT_VALIDATION);
    }, []);

    return {
        value,
        setValue,
        validation,
        setValidation,
        resetValidation,
    };
}
