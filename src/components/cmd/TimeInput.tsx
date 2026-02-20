import { useSyncedState } from "@/utils/StateUtil";
import { useCallback } from "react";

function formatDatetimeLocal(date: Date): string {
    const pad = (num: number) => num.toString().padStart(2, "0");
    return date.getFullYear() + "-" +
        pad(date.getMonth() + 1) + "-" +
        pad(date.getDate()) + "T" +
        pad(date.getHours()) + ":" +
        pad(date.getMinutes());
}

function parseValue(value: string) {
    if (!value) return value;

    if (value.startsWith("timestamp:")) {
        const timestamp = parseInt(value.split(":")[1]);
        if (!Number.isNaN(timestamp)) {
            const date = new Date(timestamp);
            return formatDatetimeLocal(date);
        }
        return "";
    }

    if (/^\d+$/.test(value)) {
        const timestamp = Number(value);
        if (Number.isFinite(timestamp)) {
            return formatDatetimeLocal(new Date(timestamp));
        }
    }

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
        return value.replace(" ", "T");
    }

    return value;
}

export default function TimeInput({
                                      argName,
                                      initialValue,
                                      setOutputValue
                                  }: {
    argName: string,
    initialValue: string,
    setOutputValue: (name: string, value: string) => void
}) {
    const [value, setValue] = useSyncedState(parseValue(initialValue) || '');
    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const localDateTimeString = e.target.value;
                   // The new Date() parses the string as local time.
                   const date = new Date(localDateTimeString);
                   setValue(localDateTimeString);
                   // date.getTime() yields the UTC timestamp as intended.
                   setOutputValue(argName, "timestamp:" + Math.floor(date.getTime()));
    }, [argName, setOutputValue, setValue]);
    return (
        <input type="datetime-local"
               className="dark:bg-slate-700 bg-slate-100"
               value={value}
               onChange={onChange} />
    );
}