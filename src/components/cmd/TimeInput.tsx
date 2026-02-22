import { useSyncedState } from "@/utils/StateUtil";
import { useCallback } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";

function formatDatetimeLocal(date: Date): string {
    const pad = (num: number) => num.toString().padStart(2, "0");
    return date.getFullYear() + "-" +
        pad(date.getMonth() + 1) + "-" +
        pad(date.getDate()) + "T" +
        pad(date.getHours()) + ":" +
        pad(date.getMinutes());
}

function normalizeTimeValue(value: string, nowMs: number = Date.now()): { displayValue: string; outputValue: string } {
    const raw = (value ?? "").trim();
    if (!raw) {
        return { displayValue: "", outputValue: "" };
    }

    const toResultFromDate = (date: Date) => {
        const timestamp = date.getTime();
        if (!Number.isFinite(timestamp)) {
            return { displayValue: "", outputValue: "" };
        }
        return {
            displayValue: formatDatetimeLocal(date),
            outputValue: `timestamp:${Math.floor(timestamp)}`,
        };
    };

    // Supports timediff values like "30d", "12h", "90m", "2w", "1y".
    const timediffMatch = raw.match(/^(-?\d+)([smhdwy])$/i);
    if (timediffMatch) {
        const amount = Number(timediffMatch[1]);
        const unit = timediffMatch[2].toLowerCase();
        if (Number.isFinite(amount)) {
            const minute = 60 * 1000;
            const hour = 60 * minute;
            const day = 24 * hour;
            const multiplier = unit === "s" ? 1000
                : unit === "m" ? minute
                    : unit === "h" ? hour
                        : unit === "d" ? day
                            : unit === "w" ? 7 * day
                                : 365 * day;
            return toResultFromDate(new Date(nowMs - amount * multiplier));
        }
    }

    if (raw.startsWith("timestamp:")) {
        const timestamp = parseInt(raw.split(":")[1], 10);
        if (!Number.isNaN(timestamp)) {
            return toResultFromDate(new Date(timestamp));
        }
        return { displayValue: "", outputValue: "" };
    }

    if (/^\d+$/.test(raw)) {
        const timestamp = Number(raw);
        if (Number.isFinite(timestamp)) {
            return toResultFromDate(new Date(timestamp));
        }
    }

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) {
        return normalizeTimeValue(raw.replace(" ", "T"), nowMs);
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
        return toResultFromDate(new Date(raw));
    }

    return { displayValue: "", outputValue: "" };
}

export default function TimeInput({
    argName,
    initialValue,
    setOutputValue,
    compact,
}: {
    argName: string,
    initialValue: string,
    compact?: boolean,
    setOutputValue: (name: string, value: string) => void
}) {
    const [value, setValue] = useSyncedState(normalizeTimeValue(initialValue).displayValue);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const localDateTimeString = e.target.value;
        setValue(localDateTimeString);
        setOutputValue(argName, normalizeTimeValue(localDateTimeString).outputValue);
    }, [argName, setOutputValue, setValue]);

    return (
        <Input
            type="datetime-local"
            className={cn("w-full", compact ? "h-8 text-xs" : "")}
            value={value}
            onChange={onChange}
        />
    );
}