import { calculate } from "@/utils/MathUtil";

export type ValidationState = {
    isValid: boolean;
    error: string;
    note: string;
};

export function validateRegexInput(value: string, filter?: string, filterHelp?: string): ValidationState {
    if (!value || !filter) {
        return { isValid: true, error: "", note: "" };
    }

    const isValid = new RegExp(filter).test(value);
    if (isValid) {
        return { isValid: true, error: "", note: "" };
    }

    return {
        isValid: false,
        error: `Invalid input. Must be ${filterHelp ? `${filterHelp} ` : ""}matching pattern: ${filter}`,
        note: "",
    };
}

export function validateNumberInput(
    input: string,
    options: { isFloat: boolean; min?: number; max?: number },
): ValidationState & { normalizedValue: string } {
    if (!input) {
        return { isValid: true, error: "", note: "", normalizedValue: "" };
    }

    // Strip commas that look like thousands separators (e.g., 1,000,000)
    // Only strip if it's not part of a function call like min(1, 2)
    let processedInput = input;
    if (!/[a-zA-Z]/.test(input)) {
        processedInput = input.replace(/,/g, '');
    }

    const containsAnyExpr = /[\\(\\)+\-*/%^]/.test(processedInput);

    try {
        let parsed: number;
        if (options.isFloat) {
            parsed = containsAnyExpr ? calculate(processedInput) : parseFloat(processedInput);
        } else {
            parsed = containsAnyExpr ? Math.floor(calculate(processedInput)) : parseInt(processedInput, 10);
        }

        if (Number.isNaN(parsed)) {
            throw new Error("Invalid number");
        }
        if (!Number.isFinite(parsed)) {
            throw new Error("Number is not finite");
        }
        if (options.min != null && parsed < options.min) {
            throw new Error(`Minimum value is ${options.min} but got ${parsed}`);
        }
        if (options.max != null && parsed > options.max) {
            throw new Error(`Maximum value is ${options.max} but got ${parsed}`);
        }

        return {
            isValid: true,
            error: "",
            note: containsAnyExpr ? `${parsed}` : "",
            normalizedValue: `${parsed}`,
        };
    } catch (err) {
        const message = typeof err === "object" && err !== null && "message" in err
            ? `${err.message}`
            : "Invalid number";

        return {
            isValid: false,
            error: message,
            note: "",
            normalizedValue: "",
        };
    }
}
